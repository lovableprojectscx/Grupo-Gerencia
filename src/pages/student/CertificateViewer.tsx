
import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Download, ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { Document, Page, pdfjs } from 'react-pdf';

// Setup PDF worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

import fontkit from '@pdf-lib/fontkit';

// ... (imports)

interface CertificateDetails {
    id: string;
    code: string;
    registration_number?: number;
    issued_at: string;
    metadata?: {
        student_name?: string;
        student_dni?: string;
        registration_number?: number;
        generated_at?: string;
        template_snapshot?: any;
        [key: string]: any;
    };
    enrollment?: {
        student?: {
            full_name?: string;
            dni?: string;
        };
        course?: {
            title?: string;
            certificate_template?: any;
            metadata?: { key: string; value: string }[];
        };
    };
}

// Función pura para resolver visibilidad y valor de campos de horas.
// Centraliza la lógica usada tanto en el render JSX como en drawFields.
function resolveHoursField(
    field: any,
    allFields: any[],
    mode: 'academic' | 'lecture',
    certMeta: any,
    courseMeta: { key: string; value: string }[]
): { visible: boolean; value?: string } {
    const isAcademicField = field.label === "Horas Académicas" || field.id.includes("Horas-Académicas") || field.id.includes("Horas-Academicas");
    const isLectureField = field.label === "Horas Lectivas" || field.id.includes("Horas-Lectivas");

    if (!isAcademicField && !isLectureField) return { visible: true };

    if (mode === 'academic' && isLectureField) {
        const templateHasAcademic = allFields.some((f: any) => f.label === "Horas Académicas" || f.id.includes("Horas-Académicas"));
        if (templateHasAcademic) return { visible: false };
        const value = certMeta?.["Horas Académicas"] || courseMeta?.find((m) => m.key === "Horas Académicas")?.value || "";
        return { visible: true, value };
    }

    if (mode === 'lecture' && isAcademicField) {
        const templateHasLecture = allFields.some((f: any) => f.label === "Horas Lectivas" || f.id.includes("Horas-Lectivas"));
        if (templateHasLecture) return { visible: false };
        const value = certMeta?.["Horas Lectivas"] || courseMeta?.find((m) => m.key === "Horas Lectivas")?.value || "";
        return { visible: true, value };
    }

    return { visible: true };
}

// Font URL Mapping (using Google Fonts GitHub Raw -> Static TTF for maximum compatibility)
// pdf-lib/fontkit has trouble with Variable Fonts (Var) and WOFF2 sometimes. Static TTFs are safest.
const FONT_URLS: Record<string, string> = {
    'Great Vibes': 'https://raw.githubusercontent.com/google/fonts/main/ofl/greatvibes/GreatVibes-Regular.ttf',
    'Cinzel': 'https://raw.githubusercontent.com/google/fonts/main/ofl/cinzel/Cinzel%5Bwght%5D.ttf',
    'Playfair Display': 'https://raw.githubusercontent.com/google/fonts/main/ofl/playfairdisplay/PlayfairDisplay%5Bwght%5D.ttf',
    'Montserrat': 'https://raw.githubusercontent.com/google/fonts/main/ofl/montserrat/Montserrat%5Bwght%5D.ttf'
};

// ... inside handleDownloadPDF ...



const SmartText = ({
    text,
    x,
    y,
    fontSize,
    color,
    fontFamily,
    boxWidthPercent,
    boxHeightPercent,
    fieldId,
    isMultiLine: isMultiLineProp
}: any) => {
    const textRef = useRef<HTMLDivElement>(null);
    const [currentFontSize, setCurrentFontSize] = useState(fontSize);

    // Prop explícita tiene prioridad; fallback a detección por ID solo si no está definida
    const isMultiLine = isMultiLineProp !== undefined
        ? isMultiLineProp
        : (fieldId && (fieldId.includes("courseName") || fieldId.includes("curso")));

    // Reset when text or base fontSize changes
    useEffect(() => {
        setCurrentFontSize(fontSize);
    }, [text, fontSize]);

    useEffect(() => {
        const el = textRef.current;
        if (!el || !el.parentElement) return;

        const container = el.parentElement;
        if (!container) return;

        const boxW_px = (boxWidthPercent / 100) * container.clientWidth;
        const boxH_px = (boxHeightPercent / 100) * container.clientHeight;

        const checkFit = () => {
            if (isMultiLine) {
                if ((el.scrollWidth > boxW_px || el.scrollHeight > boxH_px) && currentFontSize > 20) {
                    setCurrentFontSize(prev => Math.max(20, prev * 0.90));
                }
            } else {
                if ((el.scrollWidth > boxW_px || el.scrollHeight > boxH_px) && currentFontSize > 8) {
                    setCurrentFontSize(prev => Math.max(8, prev * 0.95));
                }
            }
        };

        checkFit();

        const timer = setTimeout(checkFit, 50);
        return () => clearTimeout(timer);

    }, [text, currentFontSize, boxWidthPercent, boxHeightPercent, fontSize, isMultiLine]);

    return (
        <div
            ref={textRef}
            style={{
                position: "absolute",
                left: `${x}%`,
                top: `${y}%`,
                transform: "translate(-50%, -50%)",

                width: `${boxWidthPercent}%`,
                height: `${boxHeightPercent}%`,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                overflow: 'hidden',

                fontSize: `${currentFontSize}px`,
                color: color,
                fontFamily: fontFamily,
                textAlign: "center",
                fontWeight: "bold",
                lineHeight: 1.15,

                whiteSpace: isMultiLine ? "pre-wrap" : "nowrap",
                wordBreak: isMultiLine ? "break-word" : "normal",

                transition: "font-size 0.1s ease-out"
            }}
            className="print:leading-none"
        >
            {text}
        </div>
    );
};

export default function CertificateViewer() {
    const { id } = useParams();
    const certificateRef = useRef<HTMLDivElement>(null);
    const backPageRef = useRef<HTMLDivElement>(null);
    // Caché de ArrayBuffers de fuentes para pre-carga antes de descargar PDF
    const fontCacheRef = useRef<Record<string, ArrayBuffer>>({});

    const [aspectRatio, setAspectRatio] = useState(1.414);
    const [containerWidth, setContainerWidth] = useState<number>(800);

    const onPageLoadSuccess = (page: any) => {
        const ratio = page.originalWidth / page.originalHeight;
        setAspectRatio(ratio);
    };

    const { data: certificate, isLoading, error } = useQuery<CertificateDetails>({
        queryKey: ["certificate", id],
        queryFn: async () => {
            const { data, error } = await supabase
                .rpc('get_certificate_details', { cert_id: id });

            if (error) throw error;
            if (!data) throw new Error("Certificate not found");

            // Migrar campos legacy (maxWidth → boxWidth) en template_snapshot
            if (data.metadata?.template_snapshot?.fields) {
                data.metadata.template_snapshot.fields = data.metadata.template_snapshot.fields.map((f: any) => ({
                    ...f,
                    boxWidth: f.boxWidth || f.maxWidth || 30,
                    boxHeight: f.boxHeight || 10
                }));
            }
            // Migrar campos legacy en la plantilla actual del curso
            if (data.enrollment?.course?.certificate_template?.fields) {
                data.enrollment.course.certificate_template.fields = data.enrollment.course.certificate_template.fields.map((f: any) => ({
                    ...f,
                    boxWidth: f.boxWidth || f.maxWidth || 30,
                    boxHeight: f.boxHeight || 10
                }));
            }
            return data;
        },
        enabled: !!id
    });

    // Derived values for Hooks
    // template_snapshot preserva el diseño en el momento de emisión; fallback al template actual del curso
    const template = certificate?.metadata?.template_snapshot
        || certificate?.enrollment?.course?.certificate_template
        || {};
    const adminHoursType = template?.hoursType || 'academic';

    // State for hours mode
    const [hoursMode, setHoursMode] = useState<'academic' | 'lecture'>(() => {
        if (adminHoursType === 'lecture') return 'lecture';
        return 'academic';
    });

    // State for "Has Chosen" (Blocking UI)
    const [hasChosen, setHasChosen] = useState<boolean>(() => {
        return adminHoursType !== 'both';
    });

    // Sync state with template if it loads late
    useEffect(() => {
        if (template?.hoursType === 'lecture') setHoursMode('lecture');
        else if (template?.hoursType === 'academic') setHoursMode('academic');

        // Also update hasChosen if needed (e.g. initial load was undefined, then became 'both')
        if (template?.hoursType === 'both') {
            // If it was already true (default), we might need to reset? 
            // Actually, better to trust the derived initial state or user interaction.
            // But if it switches from undefined -> 'both', we might want to force choice?
            // For now, let's keep it simple. The initial state function handles the 'undefined' case (!='both' => true).
            // If it later becomes 'both', we might arguably show choice screen.
            // But usually template data comes in one go.
            if (hasChosen && adminHoursType === 'both') {
                // edge case: if we assumed chosen because data was missing, but now we see it's 'both'
                // setHasChosen(false); // Dangerous loop if not careful.
            }
        }
    }, [template?.hoursType, adminHoursType]);

    // Check if we need to show choice screen
    const showChoiceScreen = !hasChosen && adminHoursType === 'both';

    // Responsive Logic
    useEffect(() => {
        if (!certificateRef.current) return;
        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                if (entry.contentRect.width > 0) {
                    setContainerWidth(entry.contentRect.width);
                }
            }
        });
        resizeObserver.observe(certificateRef.current);
        return () => resizeObserver.disconnect();
    }, [showChoiceScreen, isLoading]); // Re-run when view appears

    // Pre-carga de fuentes personalizadas en background para evitar demora al descargar PDF
    useEffect(() => {
        if (!template?.fields) return;
        const fontsToLoad: string[] = [...new Set<string>(
            template.fields
                .map((f: any) => f.fontFamily)
                .filter((ff: string) => FONT_URLS[ff])
        )];
        for (const fontFamily of fontsToLoad) {
            if (fontCacheRef.current[fontFamily]) continue;
            fetch(FONT_URLS[fontFamily], { mode: 'cors' })
                .then(res => res.ok ? res.arrayBuffer() : Promise.reject(new Error(`HTTP ${res.status}`)))
                .then(buf => { fontCacheRef.current[fontFamily] = buf; })
                .catch(() => {}); // Silencioso; getFont reintentará al descargar
        }
    }, [template?.fields]);

    const handleChoice = (mode: 'academic' | 'lecture') => {
        setHoursMode(mode);
        setHasChosen(true);
    };

    // --- HELPER FUNCTIONS (Moved up for scope safety) ---
    const enrollment = certificate?.enrollment;
    const issued_at = certificate?.issued_at;
    const student = enrollment?.student;
    const course = enrollment?.course;

    // Default values if no template - Use the already defined 'template'
    const bgImageFront = template.bgImageFront || template.bgImage || "https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?w=1200&auto=format&fit=crop&q=80";
    const bgImageBack = template.bgImageBack || null;

    const getFieldValue = (field: any) => {
        if (!certificate) return "";

        switch (field.id) {
            case "studentName":
            case "studentName-back":
                return certificate.metadata?.student_name || student?.full_name || "Estudiante";
            case "studentDni":
            case "studentDni-back":
                const dni = certificate.metadata?.student_dni || student?.dni;
                return dni ? `DNI: ${dni}` : "DNI: --------";
            case "courseName":
            case "courseName-back":
                return course?.title || "Curso";
            case "date":
            case "date-back":
                return issued_at ? format(new Date(issued_at), "d 'de' MMMM, yyyy", { locale: es }) : "Fecha desconocida";
            case "code":
            case "code-back": {
                const regNum = certificate.registration_number ?? certificate.metadata?.registration_number;
                const regYear = certificate.metadata?.registration_year;
                if (regNum) return regYear ? `${regNum} - ${regYear}` : `${regNum}`;
                return certificate.code || certificate.id;
            }
            default:
                if (field.id.startsWith('meta-')) {
                    const metaKey = field.label;
                    return certificate.metadata?.[metaKey] || course?.metadata?.find((m: any) => m.key === metaKey)?.value || "";
                }
                if (field.id.startsWith('custom-')) {
                    return field.value;
                }
                return "";
        }
    };


    const handleDownloadPDF = async () => {
        if (!certificate) return;
        const toastId = toast.loading("Generando PDF Vectorial de alta calidad...");

        try {
            const bgFront = template.bgImageFront || template.bgImage;
            const bgBack = template.bgImageBack;

            // Initialize PDF
            let pdfDoc: PDFDocument;

            // Load base PDF or create new
            if (bgFront && bgFront.toLowerCase().endsWith('.pdf')) {
                const existingPdfBytes = await fetch(bgFront).then(res => res.arrayBuffer());
                pdfDoc = await PDFDocument.load(existingPdfBytes, { ignoreEncryption: true });
            } else {
                pdfDoc = await PDFDocument.create();
            }

            // REGISTER FONTKIT (Critical for custom fonts)
            pdfDoc.registerFontkit(fontkit);

            // Embed Standard Fonts (Bold variants for visual match with HTML)
            const helveticaFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
            const timesFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
            const courierFont = await pdfDoc.embedFont(StandardFonts.CourierBold);

            // Cache for custom fonts to avoid re-fetching
            const customFonts: Record<string, any> = {};

            const getFont = async (fontFamily: string) => {
                // Return standard if matched
                switch (fontFamily) {
                    case 'Times New Roman': return timesFont;
                    case 'Courier New': return courierFont;
                    case 'Arial':
                    case 'Helvetica': return helveticaFont;
                }

                // Handle Custom Fonts
                if (FONT_URLS[fontFamily]) {
                    if (customFonts[fontFamily]) return customFonts[fontFamily];

                    try {
                        // Usar caché de pre-carga si está disponible; si no, fetch normal
                        let fontBytes: ArrayBuffer;
                        if (fontCacheRef.current[fontFamily]) {
                            fontBytes = fontCacheRef.current[fontFamily];
                        } else {
                            console.log(`Fetching font: ${fontFamily} from ${FONT_URLS[fontFamily]}`);
                            const response = await fetch(FONT_URLS[fontFamily], { mode: 'cors' });
                            if (!response.ok) throw new Error(`HTTP ${response.status} - ${response.statusText}`);
                            fontBytes = await response.arrayBuffer();
                            fontCacheRef.current[fontFamily] = fontBytes;
                        }

                        if (fontBytes.byteLength < 1000) throw new Error("Archivo de fuente corrupto o vacío");

                        const embeddedFont = await pdfDoc.embedFont(fontBytes);
                        customFonts[fontFamily] = embeddedFont;
                        return embeddedFont;
                    } catch (e: any) {
                        console.error(`FAILED to load font ${fontFamily}:`, e);
                        toast.error(`Error fuente ${fontFamily}: ${e.message}`, { duration: 4000 });
                        return helveticaFont;
                    }
                }

                return helveticaFont;
            };

            // Process Pages
            const pages = pdfDoc.getPages();
            let frontPage = pages[0];

            // If starting from scratch (image background), add page
            if (!frontPage) {
                if (bgFront) {
                    try {
                        const imgBytes = await fetch(bgFront).then(res => res.arrayBuffer());
                        const imgExt = bgFront.split('.').pop()?.toLowerCase();
                        let embeddedImage;

                        // Support mainly PNG and JPG
                        if (imgExt === 'png') embeddedImage = await pdfDoc.embedPng(imgBytes);
                        else embeddedImage = await pdfDoc.embedJpg(imgBytes);

                        // CREATE PAGE WITH EXACT IMAGE DIMENSIONS (No stretching)
                        // This matches the "object-cover" behavior on a responsive container if container matches aspect ratio
                        // But for PDF, we want WYSIWYG relative to the design canvas (800px width reference)
                        const { width, height } = embeddedImage;
                        frontPage = pdfDoc.addPage([width, height]);

                        frontPage.drawImage(embeddedImage, {
                            x: 0,
                            y: 0,
                            width: width,
                            height: height,
                        });
                    } catch (err) {
                        console.error("Error embedding background image:", err);
                        // Fallback to A4 Landscape
                        frontPage = pdfDoc.addPage([842, 595]);
                    }
                } else {
                    frontPage = pdfDoc.addPage([842, 595]); // Empty canvas
                }
            }

            // Draw Fields on Front
            const drawFields = async (page: any, fields: any[], pageName: string) => {
                // containerWidth es el ancho real del canvas HTML del viewer.
                // Los fontSize del template fueron calibrados en ese mismo ancho,
                // así que usarlo como referencia garantiza fidelidad HTML → PDF.
                const refWidth = containerWidth > 0 ? containerWidth : 800;
                const pdfScale = page.getWidth() / refWidth;

                for (const field of fields) {
                    if (!field.visible || (field.page && field.page !== pageName)) continue;

                    // Resolver visibilidad y valor del campo de horas via helper centralizado
                    const hoursResult = resolveHoursField(
                        field,
                        fields,
                        hoursMode,
                        certificate?.metadata,
                        course?.metadata || []
                    );
                    if (!hoursResult.visible) continue;

                    let text = hoursResult.value !== undefined ? hoursResult.value : getFieldValue(field);

                    if (!text) continue;

                    // Dynamic Font Sizing
                    const fontSize = field.fontSize * pdfScale;
                    const font = await getFont(field.fontFamily);

                    // --- PROFESSIONAL TEXT FITTING ---
                    const boxW_percent = field.boxWidth || field.maxWidth || 30;
                    const boxH_percent = field.boxHeight || 10;
                    const maxBoxWidth = page.getWidth() * (boxW_percent / 100);
                    const maxBoxHeight = page.getHeight() * (boxH_percent / 100);

                    const isMultiLine = field.id.includes("courseName") || field.id.includes("curso");
                    const minFontSize = isMultiLine ? 20 : 6;
                    let currentFontSize = fontSize;
                    let lines: string[] = [];
                    let iterations = 0;
                    const lineHeightMultiplier = 1.15; // Match CSS

                    // Fit Loop: Try to wrap text. If it overflows height, shrink font.
                    const minimumLegibleSize = isMultiLine ? 20 : 6;

                    while (iterations < 50) {
                        lines = [];

                        if (!isMultiLine) {
                            // Strict Single Line
                            lines.push(text);
                            const textWidth = font.widthOfTextAtSize(text, currentFontSize);
                            if (textWidth <= maxBoxWidth) {
                                break;
                            }
                        } else {
                            // Respect manual newlines first
                            const paragraphs = text.split('\n');

                            for (const paragraph of paragraphs) {
                                const words = paragraph.split(' ');
                                let currentLine = words[0];

                                for (let i = 1; i < words.length; i++) {
                                    const word = words[i];
                                    const width = font.widthOfTextAtSize(currentLine + " " + word, currentFontSize);
                                    if (width < maxBoxWidth) {
                                        currentLine += " " + word;
                                    } else {
                                        lines.push(currentLine);
                                        currentLine = word;
                                    }
                                }
                                lines.push(currentLine);
                            }

                            // Check Dimensions
                            const totalHeight = lines.length * (font.heightAtSize(currentFontSize) * lineHeightMultiplier);
                            const maxWordWidth = Math.max(...lines.map((l: string) => font.widthOfTextAtSize(l, currentFontSize)));

                            const fitsWidth = maxWordWidth <= maxBoxWidth;
                            const fitsHeight = totalHeight <= maxBoxHeight;
                            const isLegible = currentFontSize >= minimumLegibleSize;

                            if (fitsWidth && (fitsHeight || !isLegible)) {
                                break;
                            }
                        }

                        currentFontSize *= 0.95;
                        if (currentFontSize < minFontSize) {
                            currentFontSize = minFontSize;
                            break;
                        }
                        iterations++;
                    }

                    // --- DRAWING ---
                    const fontHeight = font.heightAtSize(currentFontSize);
                    const singleLineHeight = fontHeight * lineHeightMultiplier;
                    const totalBlockHeight = lines.length * singleLineHeight;

                    // Recalculate center coordinates
                    const x = (field.x / 100) * page.getWidth();
                    const y = page.getHeight() - ((field.y / 100) * page.getHeight());

                    let lineY = y + (totalBlockHeight / 2) - singleLineHeight + (singleLineHeight * 0.25);

                    const colorHex = field.color || "#000000";
                    const rgbColor = rgb(
                        parseInt(colorHex.slice(1, 3), 16) / 255,
                        parseInt(colorHex.slice(3, 5), 16) / 255,
                        parseInt(colorHex.slice(5, 7), 16) / 255
                    );

                    // Draw each line
                    for (const line of lines) {
                        const lineWidth = font.widthOfTextAtSize(line, currentFontSize);
                        const lineX = x - (lineWidth / 2);

                        // Main Text
                        page.drawText(line, { x: lineX, y: lineY, size: currentFontSize, font: font, color: rgbColor });

                        // Simulated Bold
                        const isCustomFont = FONT_URLS[field.fontFamily];
                        if (isCustomFont) {
                            const offset = currentFontSize / 80;
                            page.drawText(line, { x: lineX + offset, y: lineY, size: currentFontSize, font: font, color: rgbColor });
                            page.drawText(line, { x: lineX, y: lineY + offset, size: currentFontSize, font: font, color: rgbColor });
                        }

                        lineY -= singleLineHeight;
                    }
                }
            };

            if (template.fields) await drawFields(frontPage, template.fields, 'front');

            // Handle Back Page Logic ...
            const hasBackFields = template.fields?.some((f: any) => f.page === 'back');

            if (bgBack || hasBackFields) {
                // ... Page creation logic same as before ...
                let backPage;
                if (pages.length > 1) {
                    backPage = pages[1];
                } else {
                    if (bgBack && bgBack.toLowerCase().endsWith('.pdf')) {
                        const backPdfBytes = await fetch(bgBack).then(res => res.arrayBuffer());
                        const backPdf = await PDFDocument.load(backPdfBytes, { ignoreEncryption: true });
                        const [copiedPage] = await pdfDoc.copyPages(backPdf, [0]);
                        backPage = pdfDoc.addPage(copiedPage);
                    } else {
                        // Image or blank
                        if (bgBack) {
                            try {
                                const imgBytes = await fetch(bgBack).then(res => res.arrayBuffer());
                                const imgExt = bgBack.split('.').pop()?.toLowerCase();
                                let embeddedImage;
                                if (imgExt === 'png') embeddedImage = await pdfDoc.embedPng(imgBytes);
                                else embeddedImage = await pdfDoc.embedJpg(imgBytes);

                                // Use exact image dimensions for the page
                                const { width, height } = embeddedImage;
                                backPage = pdfDoc.addPage([width, height]);

                                backPage.drawImage(embeddedImage, {
                                    x: 0,
                                    y: 0,
                                    width: width,
                                    height: height,
                                });
                            } catch (e) {
                                console.error("Error back page image:", e);
                                backPage = pdfDoc.addPage([842, 595]); // Fallback
                            }
                        } else {
                            backPage = pdfDoc.addPage([842, 595]);
                        }
                    }
                }

                if (template.fields) await drawFields(backPage, template.fields, 'back');
            }

            const pdfBytes = await pdfDoc.save();
            // Trigger download
            const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = `certificado-${id}.pdf`;
            link.click();

            toast.success("PDF descargado correctamente", { id: toastId });
        } catch (error: any) {
            console.error("Error generating PDF:", error);
            toast.error("Error al generar PDF: " + error.message, { id: toastId });
        }
    };

    if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin w-8 h-8" /></div>;

    if (error || !certificate) return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4">
            <AlertCircle className="w-12 h-12 text-destructive" />
            <h1 className="text-xl font-bold">Certificado no encontrado</h1>
            <p className="text-muted-foreground">El código de verificación no es válido o el certificado no existe.</p>
            <Link to="/"><Button variant="outline">Volver al inicio</Button></Link>
        </div>
    );



    // calculate font scale factor based on original reference width (e.g. 800px)
    // If user designed on 800px wide canvas, and now it's 400px, font should be 0.5x
    const scaleFactor = containerWidth / 800;

    return (
        <div className="min-h-screen bg-background">
            <Navbar />

            <div className="container mx-auto px-4 py-8 mt-20">
                <div className="max-w-4xl mx-auto space-y-8">

                    {/* Header Actions */}
                    <div className="flex items-center justify-between">
                        <Button variant="ghost" asChild>
                            <Link to="/dashboard">
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Volver al Panel
                            </Link>
                        </Button>
                        {/* Only show download if chosen */}
                        {!showChoiceScreen && (
                            <div className="flex gap-2">
                                <Button onClick={handleDownloadPDF} className="shadow-lg hover:shadow-xl transition-all">
                                    <Download className="w-4 h-4 mr-2" />
                                    Descargar PDF
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* CHOICE SCREEN (Blocking) */}
                    {showChoiceScreen ? (
                        <div className="flex flex-col items-center justify-center py-20 animate-in fade-in zoom-in duration-500">
                            <div className="bg-card border shadow-2xl rounded-2xl p-10 max-w-lg w-full text-center space-y-8">
                                <div className="space-y-2">
                                    <h2 className="text-3xl font-bold tracking-tight">Personaliza tu Certificado</h2>
                                    <p className="text-muted-foreground">Este curso incluye horas académicas y lectivas. ¿Cuál deseas mostrar?</p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                                    <Button
                                        size="lg"
                                        className="h-24 text-lg border-2 border-transparent hover:border-primary/20 flex flex-col gap-2"
                                        variant="outline"
                                        onClick={() => handleChoice('academic')}
                                    >
                                        <span className="font-bold">Académicas</span>
                                        <span className="text-xs font-normal text-muted-foreground">Mostrar horas teóricas</span>
                                    </Button>
                                    <Button
                                        size="lg"
                                        className="h-24 text-lg border-2 border-transparent hover:border-primary/20 flex flex-col gap-2"
                                        variant="outline"
                                        onClick={() => handleChoice('lecture')}
                                    >
                                        <span className="font-bold">Lectivas</span>
                                        <span className="text-xs font-normal text-muted-foreground">Mostrar horas prácticas</span>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* CERTIFICATE PREVIEW */
                        <>
                            {/* Toggle (allows changing mind) */}
                            {adminHoursType === 'both' && (
                                <div className="flex justify-center -mb-4 z-10 relative">
                                    <div className="bg-background/80 backdrop-blur-sm border rounded-full p-1 shadow-sm flex gap-1">
                                        <Button
                                            variant={hoursMode === 'academic' ? "secondary" : "ghost"}
                                            size="sm"
                                            className="rounded-full px-4"
                                            onClick={() => setHoursMode('academic')}
                                        >
                                            Académicas
                                        </Button>
                                        <Button
                                            variant={hoursMode === 'lecture' ? "secondary" : "ghost"}
                                            size="sm"
                                            className="rounded-full px-4"
                                            onClick={() => setHoursMode('lecture')}
                                        >
                                            Lectivas
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Front Page */}
                            <div className="bg-card rounded-xl border shadow-sm overflow-hidden p-4 md:p-8 flex flex-col items-center gap-8">
                                <div className="w-full max-w-[800px] mx-auto">
                                    <h2 className="text-center text-lg font-semibold text-muted-foreground mb-4">Vista Frontal</h2>

                                    {/* CONTAINER REF for ResizeObserver */}
                                    <div ref={certificateRef} className="w-full relative shadow-2xl">

                                        <div
                                            // Updated Layout Engine (Matches Builder)
                                            id="certificate-front-container"
                                            className="relative bg-white overflow-hidden select-none"
                                            style={(!bgImageFront || bgImageFront.toLowerCase().endsWith('.pdf')) ? {
                                                width: '100%',
                                                aspectRatio: aspectRatio,
                                            } : { width: '100%' }} // If image, let image define height via h-auto
                                        >
                                            {/* Background */}
                                            {bgImageFront?.toLowerCase().endsWith('.pdf') ? (
                                                <div className="absolute inset-0 w-full h-full">
                                                    <Document file={bgImageFront} loading={<div className="flex items-center justify-center h-full"><Loader2 className="animate-spin" /></div>}>
                                                        {/* Responsive Page Width */}
                                                        <Page
                                                            pageNumber={1}
                                                            width={containerWidth}
                                                            renderTextLayer={false}
                                                            renderAnnotationLayer={false}
                                                            onLoadSuccess={onPageLoadSuccess}
                                                        />
                                                    </Document>
                                                </div>
                                            ) : (
                                                <img
                                                    src={bgImageFront}
                                                    alt="Certificate Background Front"
                                                    className="w-full h-auto object-cover pointer-events-none block"
                                                    onLoad={(e) => setAspectRatio(e.currentTarget.naturalWidth / e.currentTarget.naturalHeight)}
                                                />
                                            )}

                                            {/* Fields */}
                                            {template.fields?.map((field: any) => {
                                                if (!field.visible || (field.page && field.page !== 'front')) return null;

                                                const hoursResult = resolveHoursField(
                                                    field,
                                                    template.fields,
                                                    hoursMode,
                                                    certificate?.metadata,
                                                    course?.metadata || []
                                                );
                                                if (!hoursResult.visible) return null;

                                                const displayValue = hoursResult.value !== undefined
                                                    ? hoursResult.value
                                                    : getFieldValue(field);

                                                const finalFontSize = field.fontSize * scaleFactor;

                                                return (
                                                    <SmartText
                                                        key={field.id}
                                                        text={displayValue}
                                                        x={field.x}
                                                        y={field.y}
                                                        fontSize={finalFontSize}
                                                        color={field.color}
                                                        fontFamily={field.fontFamily}
                                                        boxWidthPercent={field.boxWidth || field.maxWidth || 30}
                                                        boxHeightPercent={field.boxHeight || 10}
                                                        fieldId={field.id}
                                                        isMultiLine={field.isMultiLine}
                                                    />
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>

                                {/* Back Page (Hidden if not needed, similar logic) */}
                                {(bgImageBack || template.fields?.some((f: any) => f.page === 'back')) && (
                                    <div className="w-full max-w-[800px] mx-auto opacity-75 hover:opacity-100 transition-opacity">
                                        <h2 className="text-center text-lg font-semibold text-muted-foreground mb-4">Vista Posterior</h2>
                                        <div className="relative bg-white shadow-xl mx-auto overflow-hidden select-none border" style={{ width: '100%', aspectRatio: aspectRatio }}>
                                            {/* Background Back */}
                                            {bgImageBack && (
                                                bgImageBack.toLowerCase().endsWith('.pdf') ? (
                                                    <div className="absolute inset-0 w-full h-full">
                                                        <Document file={bgImageBack} loading={<Loader2 className="animate-spin" />}>
                                                            <Page pageNumber={bgImageBack === bgImageFront ? 2 : 1} width={containerWidth} renderTextLayer={false} renderAnnotationLayer={false} />
                                                        </Document>
                                                    </div>
                                                ) : <img src={bgImageBack} className="absolute inset-0 w-full h-full object-cover" />
                                            )}

                                            {/* Fields Back */}
                                            {template.fields?.map((field: any) => {
                                                if (!field.visible || field.page !== 'back') return null;
                                                const finalFontSize = field.fontSize * scaleFactor;
                                                return (
                                                    <SmartText
                                                        key={field.id}
                                                        text={getFieldValue(field)}
                                                        x={field.x}
                                                        y={field.y}
                                                        fontSize={finalFontSize}
                                                        color={field.color}
                                                        fontFamily={field.fontFamily}
                                                        boxWidthPercent={field.boxWidth || field.maxWidth || 30}
                                                        boxHeightPercent={field.boxHeight || 10}
                                                        fieldId={field.id}
                                                        isMultiLine={field.isMultiLine}
                                                    />
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                </div>
            </div>
            <div className="print:hidden"><Footer /></div>
        </div>
    );
}
