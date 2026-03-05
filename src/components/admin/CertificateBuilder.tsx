
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Move, Type, Calendar, Image as ImageIcon, Save, Plus, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Document, Page } from "react-pdf";

interface FieldPosition {
    id: string;
    label: string;
    x: number;
    y: number;
    fontSize: number;
    color: string;
    fontFamily: string;
    visible: boolean;
    isMultiLine?: boolean;
    value?: string;
    page?: "front" | "back";
    maxWidth?: number; // Legacy: kept for migration only, UI uses boxWidth
    boxWidth?: number; // Percentage of container width
    boxHeight?: number; // Percentage of container height
}

const defaultFields: FieldPosition[] = [
    { id: "studentName", label: "Nombre del Estudiante", x: 50, y: 40, fontSize: 32, color: "#000000", fontFamily: "Helvetica", visible: true, value: "Maria Elena Torres", boxWidth: 60, boxHeight: 15 },
    { id: "studentDni", label: "DNI del Estudiante", x: 50, y: 48, fontSize: 14, color: "#333333", fontFamily: "Helvetica", visible: true, value: "DNI: 12345678", boxWidth: 40, boxHeight: 10 },
    { id: "date", label: "Fecha de Emisión", x: 50, y: 62, fontSize: 16, color: "#666666", fontFamily: "Helvetica", visible: true, value: "15 de Enero, 2026", boxWidth: 40, boxHeight: 10 },
    { id: "code", label: "Número de Registro", x: 80, y: 90, fontSize: 12, color: "#999999", fontFamily: "Courier New", visible: true, value: "101 - 2025", boxWidth: 30, boxHeight: 10 },
];

const CORE_VARIABLES = [
    { id: "studentName", label: "Nombre del Estudiante", value: "Maria Elena Torres" },
    { id: "studentDni", label: "DNI del Estudiante", value: "DNI: 12345678" },
    { id: "courseName", label: "Nombre del Curso", value: "Diplomado en Cuidados Intensivos" },
    { id: "date", label: "Fecha de Emisión", value: "15 de Enero, 2026" },
    { id: "code", label: "Número de Registro", value: "101 - 2025" },
];

interface CertificateBuilderProps {
    courseId?: string;
    defaultMetadata?: { key: string, value: string }[];
    template?: any;
    onTemplateChange?: (template: any) => void;
    onSaveSettings?: (template: any) => Promise<void>;
}

const SmartText = ({ text, fontSize, color, fontFamily, maxWidthPercent = 85, boxWidth, boxHeight, fieldId, isMultiLine: isMultiLineProp }: any) => {
    const textRef = useRef<HTMLDivElement>(null);
    const [currentFontSize, setCurrentFontSize] = useState(fontSize);

    // Prop explícita tiene prioridad; fallback a detección por ID solo si no está definida
    const isMultiLine = isMultiLineProp !== undefined
        ? isMultiLineProp
        : (fieldId?.includes("courseName") || fieldId?.includes("curso"));

    // Reset to MAX ("Slider Size") whenever content or BOX Constraints change.
    // This allows the text to "grow back" if the user enlarges the box.
    useEffect(() => {
        setCurrentFontSize(fontSize);
    }, [text, fontSize, fontFamily, boxWidth, boxHeight]);

    useEffect(() => {
        const el = textRef.current;
        if (!el || !el.parentElement) return;

        const parent = el.parentElement;

        const checkFit = () => {
            if (isMultiLine) {
                if ((el.scrollWidth > parent.clientWidth || el.scrollHeight > parent.clientHeight) && currentFontSize > 20) {
                    setCurrentFontSize(prev => prev * 0.95);
                }
            } else {
                if ((el.scrollWidth > parent.clientWidth || el.scrollHeight > parent.clientHeight) && currentFontSize > 8) {
                    setCurrentFontSize(prev => prev * 0.95);
                }
            }
        };

        // Run check immediately
        checkFit();

        // Observe parent size changes (Dragging the box)
        const resizeObserver = new ResizeObserver(() => {
            checkFit();
        });

        resizeObserver.observe(parent);

        return () => resizeObserver.disconnect();

    }, [text, currentFontSize, maxWidthPercent, fontSize, boxWidth, boxHeight, isMultiLine]);

    return (
        <div
            ref={textRef}
            style={{
                fontSize: `${currentFontSize}px`,
                color: color,
                fontFamily: fontFamily,
                whiteSpace: isMultiLine ? "pre-wrap" : "nowrap",
                lineHeight: 1.15,
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                wordBreak: isMultiLine ? "break-word" : "normal"
            }}
        >
            {text}
        </div>
    );
};



const isUnwantedField = (field: any) => {
    const unwanted = ['certificates_enabled', 'live_date', 'live_url', 'created_at', 'updated_at', 'id', 'user_id', 'program_type'];
    const value = field.value?.toString().trim() || "";
    const id = field.id?.toString().trim() || "";
    const label = field.label?.toString().trim() || "";

    return unwanted.includes(value) || unwanted.includes(id) || unwanted.includes(label);
};

export function CertificateBuilder({ courseId, defaultMetadata = [], template, onTemplateChange, onSaveSettings }: CertificateBuilderProps) {
    const [activePage, setActivePage] = useState<"front" | "back">("front");
    const [bgImageFront, setBgImageFront] = useState<string | null>(null);
    const [bgImageBack, setBgImageBack] = useState<string | null>(null);
    const [aspectRatio, setAspectRatio] = useState(1.414); // A4 Landscape default
    const [fields, setFields] = useState<FieldPosition[]>(defaultFields);
    const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const resizeRef = useRef<{ id: string; direction: string; startX: number; startY: number; startW: number; startH: number } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [uploading, setUploading] = useState(false);
    const [numPages, setNumPages] = useState<number>(0);
    const [hoursType, setHoursType] = useState<string>("academic"); // 'academic', 'lecture', 'both'
    const [registrationYear, setRegistrationYear] = useState<number>(new Date().getFullYear());
    const [previewYear, setPreviewYear] = useState<number>(new Date().getFullYear());

    // Smart Guides State
    const [showVerticalGuide, setShowVerticalGuide] = useState(false);
    const [showHorizontalGuide, setShowHorizontalGuide] = useState(false);

    // Initialize from template
    useEffect(() => {
        if (template) {
            if (template.bgImageFront) setBgImageFront(template.bgImageFront);
            if (template.bgImageBack) setBgImageBack(template.bgImageBack);
            // Legacy support
            if (template.bgImage && !template.bgImageFront) setBgImageFront(template.bgImage);

            if (template.fields) {
                // Ensure new fields have box props if missing, AND filter out unwanted technical fields that might have been saved
                const migratedFields = template.fields
                    .filter((f: any) => !isUnwantedField(f)) // Aggressive filter
                    .map((f: any) => ({
                        ...f,
                        boxWidth: f.boxWidth || f.maxWidth || 30,
                        boxHeight: f.boxHeight || 10
                    }));
                setFields(migratedFields);
            }
            if (template.hoursType) setHoursType(template.hoursType);
            if (template.registrationYear) setRegistrationYear(template.registrationYear);
        }
    }, [template]);

    // Filter fields for active page AND sanitize
    const activeFields = fields.filter(f => {
        if (isUnwantedField(f)) return false; // Extra safety check during render
        if (activePage === 'front') return !f.page || f.page === 'front';
        return f.page === 'back';
    });

    const selectedField = fields.find(f => f.id === selectedFieldId);

    // Helper: valor de vista previa para cada campo en el editor
    const getPreviewValue = (field: FieldPosition): string => {
        const baseId = field.id.replace(/-back$/, '');
        if (baseId === 'code') return `N° - ${registrationYear}`;
        const coreVar = CORE_VARIABLES.find(v => v.id === baseId);
        if (coreVar) return coreVar.value;
        return field.value || "";
    };

    // Default metadata extraction & FILTERING
    const fetchedMetadata = (defaultMetadata || []).filter(m => !isUnwantedField({ value: m.key, id: m.key, label: m.key }));


    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `certificates/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('course-content')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('course-content')
                .getPublicUrl(filePath);

            if (activePage === 'front') setBgImageFront(publicUrl);
            else setBgImageBack(publicUrl);

            toast.success("Fondo actualizado correctamente");
        } catch (error: any) {
            toast.error("Error al subir imagen: " + error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleResizeStart = (e: React.MouseEvent, id: string, direction: string) => {
        e.stopPropagation();
        const field = fields.find(f => f.id === id);
        if (!field) return;

        setIsResizing(true);
        resizeRef.current = {
            id,
            direction,
            startX: e.clientX,
            startY: e.clientY,
            startW: field.boxWidth || 30, // Default to 30 if null
            startH: field.boxHeight || 10  // Default to 10 if null
        };

        const handleGlobalMouseMove = (moveEvent: MouseEvent) => {
            const current = resizeRef.current;
            if (!current) return;

            const container = containerRef.current;
            if (!container) return;

            const rect = container.getBoundingClientRect();
            const deltaX = moveEvent.clientX - current.startX;
            const deltaY = moveEvent.clientY - current.startY;

            // Convert delta pixels to percentage of container
            const deltaWPercent = (deltaX / rect.width) * 100;
            const deltaHPercent = (deltaY / rect.height) * 100;

            let newW = current.startW;
            let newH = current.startH;

            // Simple scaling (right/bottom handles for now, or unified logic)
            // If direction has 'e' (east), add deltaW
            // If direction has 'w' (west), subtract deltaW (and move X? too complex for now, let's stick to SE/SW/NE/NW handling resizing from center? 
            // The box is centered at X/Y. 
            // If we resize, do we keep center or top-left?
            // The drawing logic: translate(-50%, -50%). So X/Y is the CENTER.
            // If I increase Width, it grows extending BOTH sides from center.
            // So if I drag RIGHT edge, I want width to increase.
            // 1% Growth in Width = 0.5% extension to Right.
            // So DeltaX results in DeltaW * ?
            // If I drag Right Handle:
            // Mouse moves 10px right. Width should increase by 20px (10px left, 10px right) to keep center?
            // Yes, if X/Y is center, resizing width symmetrically is easiest.
            // Let's implement symmetric resizing for simplicity first, or standard resizing?
            // Standard resizing usually moves anchors. 
            // Given the CSS transform translate(-50%, -50%), the X/Y is the geometric center.
            // If I standard resize (edge), I must ALSO update X/Y to shift the center.
            // Let's try SYMMETRIC resizing first (holding Alt style behavior by default) because coordinates are center-based.
            // It feels intuitive for "centering" designs.

            // Actually, user wants to drag corner.
            // If I drag SE corner, I expect it to grow Down and Right.
            // Since it is centered, if it grows Down/Right, the specific implementation depends on if we update X/Y.

            // OPTION A: Symmetric Resizing (easiest for code).
            // Width += deltaX * 2 (because 1 unit mouse move = 1 unit from center = 2 units total width increase).
            // Height += deltaY * 2.

            if (current.direction.includes('e')) newW += (deltaWPercent * 2);
            if (current.direction.includes('w')) newW -= (deltaWPercent * 2);
            if (current.direction.includes('s')) newH += (deltaHPercent * 2);
            if (current.direction.includes('n')) newH -= (deltaHPercent * 2);

            // Constraints
            if (newW < 5) newW = 5;
            if (newH < 2) newH = 2;
            if (newW > 100) newW = 100;
            if (newH > 100) newH = 100;

            updateField(current.id, { boxWidth: newW, boxHeight: newH });
        };

        const handleGlobalMouseUp = () => {
            setIsResizing(false);
            resizeRef.current = null;
            document.removeEventListener("mousemove", handleGlobalMouseMove);
            document.removeEventListener("mouseup", handleGlobalMouseUp);
        };

        document.addEventListener("mousemove", handleGlobalMouseMove);
        document.addEventListener("mouseup", handleGlobalMouseUp);
    };

    const handleMouseDown = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (isResizing) return; // Don't drag if stuck in resize mode (safety)
        setSelectedFieldId(id);
        setIsDragging(true);

        const container = containerRef.current;
        if (!container) return;

        const containerRect = container.getBoundingClientRect();
        const startX = e.clientX;
        const startY = e.clientY;

        const field = fields.find(f => f.id === id);
        if (!field) return;

        const startFieldX = field.x;
        const startFieldY = field.y;

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const deltaX = moveEvent.clientX - startX;
            const deltaY = moveEvent.clientY - startY;

            // Convert pixels to percentage
            const deltaXPercent = (deltaX / containerRect.width) * 100;
            const deltaYPercent = (deltaY / containerRect.height) * 100;

            let newX = startFieldX + deltaXPercent;
            let newY = startFieldY + deltaYPercent;

            // Snap to Center (50%)
            const snapThreshold = 2; // 2% tolerance
            if (Math.abs(newX - 50) < snapThreshold) {
                newX = 50;
                setShowVerticalGuide(true);
            } else {
                setShowVerticalGuide(false);
            }

            if (Math.abs(newY - 50) < snapThreshold) {
                newY = 50;
                setShowHorizontalGuide(true);
            } else {
                setShowHorizontalGuide(false);
            }

            updateField(id, { x: newX, y: newY });
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            setShowVerticalGuide(false);
            setShowHorizontalGuide(false);
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        };

        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
    };

    const updateField = (id: string, updates: Partial<FieldPosition>) => {
        setFields(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
    };

    const addCustomField = (keyOrId?: string, value?: string, isCore = false) => {
        let fieldId = "";
        let fieldLabel = "";

        if (isCore && keyOrId) {
            fieldId = activePage === 'back' ? `${keyOrId}-back` : keyOrId;
            fieldLabel = CORE_VARIABLES.find(v => v.id === keyOrId)?.label || keyOrId;
        } else {
            fieldId = keyOrId ? `meta-${keyOrId}-${Math.random().toString(36).substr(2, 5)}` : `custom-${Math.random().toString(36).substr(2, 5)}`;
            fieldLabel = keyOrId || "Nuevo Campo";
        }

        const newField: FieldPosition = {
            id: fieldId,
            label: fieldLabel,
            x: 50,
            y: 50,
            fontSize: 16,
            color: "#000000",
            fontFamily: "Helvetica",
            visible: true,
            value: value || "Texto de Ejemplo",
            page: activePage,
            boxWidth: 30,
            boxHeight: 10
        };
        setFields(prev => [...prev, newField]);
        setSelectedFieldId(newField.id);
    };

    const removeField = (id: string) => {
        setFields(prev => prev.filter(f => f.id !== id));
        if (selectedFieldId === id) setSelectedFieldId(null);
    };

    const handleSave = async () => {
        if (!courseId && !onSaveSettings) return;

        const templateData = {
            bgImageFront,
            bgImageBack,
            fields,
            hoursType,
            registrationYear
        };

        // If provided an external handler, use it (for local state updaters)
        if (onTemplateChange) {
            onTemplateChange(templateData);
        }

        // Standalone mode: save via external handler (e.g. to site_settings)
        if (!courseId && onSaveSettings) {
            const toastId = toast.loading("Guardando plantilla global...");
            try {
                await onSaveSettings(templateData);
                toast.success("Plantilla guardada correctamente", { id: toastId });
            } catch (e: any) {
                toast.error("Error al guardar: " + e.message, { id: toastId });
            }
            return;
        }

        const toastId = toast.loading("Guardando plantilla...");

        const { error } = await supabase
            .from('courses')
            .update({ certificate_template: templateData })
            .eq('id', courseId);

        if (error) {
            toast.error("Error al guardar: " + error.message, { id: toastId });
        } else {
            toast.success("Plantilla guardada correctamente", { id: toastId });
        }
    };

    function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
        setNumPages(numPages);
    }

    function onPageLoadSuccess(page: any) {
        // PDF.js page object
        if (page.originalWidth && page.originalHeight) {
            setAspectRatio(page.originalWidth / page.originalHeight);
        }
    }

    const currentBg = activePage === "front" ? bgImageFront : bgImageBack;
    const isPdf = currentBg?.toLowerCase().endsWith('.pdf');
    // We only force aspect ratio if it's a PDF (canvas needs it? no pdf renders its own size, but we need container size)
    // OR if there is no background (placeholder)
    // If it's an IMAGE, we let the image define the height via h-auto to avoid whitespace gaps.
    const useAspectRatioStyle = !currentBg || isPdf;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 h-[calc(100vh-100px)]">

            <div className="flex flex-col gap-4">
                {/* ... (Tabs and header remain) */}
                <Tabs value={activePage} onValueChange={(v: any) => setActivePage(v)} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="front">Hoja 1 (Frontal)</TabsTrigger>
                        <TabsTrigger value="back">Hoja 2 (Reverso)</TabsTrigger>
                    </TabsList>
                </Tabs>

                <div className="bg-muted/30 rounded-xl border border-border p-4 flex items-center justify-center overflow-hidden relative shadow-sm flex-1">
                    <div
                        ref={containerRef}
                        className="relative w-full max-w-[800px] bg-white shadow-2xl rounded-sm overflow-hidden select-none"
                        style={useAspectRatioStyle ? { aspectRatio: aspectRatio } : {}}
                    >
                        {/* Background Rendering */}
                        {!currentBg && (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-gray-100" style={{ aspectRatio: 1.414 }}>
                                Sube una plantilla para la {activePage === "front" ? "Hoja 1" : "Hoja 2"}
                            </div>
                        )}

                        {currentBg && isPdf && (
                            <div className="w-full h-full absolute inset-0 pdf-container bg-white">
                                <Document
                                    file={currentBg}
                                    onLoadSuccess={onDocumentLoadSuccess}
                                    onLoadError={(error) => {
                                        console.error("Error loading PDF:", error);
                                        toast.error("Error al cargar PDF: " + error.message);
                                    }}
                                    loading={<div className="flex items-center justify-center h-full w-full"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>}
                                    error={<div className="flex items-center justify-center h-full text-red-500 font-bold p-4 text-center">Error al cargar PDF. Verifique la consola.</div>}
                                >
                                    <Page
                                        pageNumber={activePage === 'back' && bgImageBack === bgImageFront ? (numPages > 1 ? 2 : 1) : 1}
                                        width={containerRef.current?.clientWidth || 800}
                                        renderTextLayer={false}
                                        renderAnnotationLayer={false}
                                        onLoadSuccess={onPageLoadSuccess}
                                    />
                                </Document>
                            </div>
                        )}

                        {currentBg && !isPdf && (
                            <img
                                src={currentBg}
                                alt="Certificate Template"
                                className="w-full h-auto object-cover pointer-events-none block"
                                onLoad={(e) => {
                                    // We still update aspect ratio state just in case we switch modes or export
                                    const img = e.currentTarget;
                                    setAspectRatio(img.naturalWidth / img.naturalHeight);
                                }}
                            />
                        )}



                        {/* Fields Layer */}
                        {activeFields.map((field) => (
                            <div
                                key={field.id}
                                onMouseDown={(e) => handleMouseDown(e, field.id)}
                                onClick={(e) => { e.stopPropagation(); setSelectedFieldId(field.id); }}
                                style={{
                                    position: "absolute",
                                    left: `${field.x}%`,
                                    top: `${field.y}%`,
                                    transform: "translate(-50%, -50%)",
                                    // fontSize is handled by SmartText
                                    cursor: isDragging ? "grabbing" : "grab",
                                    border: selectedFieldId === field.id ? "2px dashed blue" : "1px dashed transparent",
                                    padding: "4px 8px", // Padding might affect width calculation, keep minimal
                                    zIndex: selectedFieldId === field.id ? 20 : 10,

                                    // Constraint Logic
                                    // Constraint Logic
                                    // boxWidth/Height uses percentages of the container
                                    width: field.boxWidth ? `${field.boxWidth}%` : '30%',
                                    height: field.boxHeight ? `${field.boxHeight}%` : '10%',

                                    display: "flex",
                                    justifyContent: "center",
                                    alignItems: "center",
                                    overflow: "hidden" // Clip content that doesn't fit
                                }}
                                className="hover:border-primary/50 transition-colors font-bold group"
                            >
                                {/* Visual Box Border (Dashed) - Always visible when selected or hovering, else hidden */}
                                <div className={`absolute inset-0 border border-dashed pointer-events-none ${selectedFieldId === field.id ? 'border-blue-500 opacity-100' : 'border-gray-400 opacity-0 group-hover:opacity-50'}`} />

                                {/* Resize Handles (Only when selected) */}
                                {selectedFieldId === field.id && (
                                    <>
                                        {/* Corners */}
                                        {['nw', 'ne', 'sw', 'se'].map((dir) => (
                                            <div
                                                key={dir}
                                                onMouseDown={(e) => handleResizeStart(e, field.id, dir)}
                                                className={`absolute w-3 h-3 bg-white border border-blue-600 rounded-full z-30 cursor-${dir}-resize hover:scale-125 transition-transform`}
                                                style={{
                                                    top: dir.includes('n') ? '-6px' : 'auto',
                                                    bottom: dir.includes('s') ? '-6px' : 'auto',
                                                    left: dir.includes('w') ? '-6px' : 'auto',
                                                    right: dir.includes('e') ? '-6px' : 'auto',
                                                }}
                                            />
                                        ))}
                                        {/* Sides (Optional, lets stick to corners for now to keep it clean, or add E/W/N/S) */}
                                        {['n', 's', 'e', 'w'].map((dir) => (
                                            <div
                                                key={dir}
                                                onMouseDown={(e) => handleResizeStart(e, field.id, dir)}
                                                className={`absolute bg-transparent z-25 cursor-${dir === 'n' || dir === 's' ? 'ns' : 'ew'}-resize`}
                                                style={{
                                                    top: dir === 'n' ? '-5px' : dir === 's' ? 'auto' : '10%',
                                                    bottom: dir === 's' ? '-5px' : dir === 'n' ? 'auto' : '10%',
                                                    left: dir === 'w' ? '-5px' : dir === 'e' ? 'auto' : '10%',
                                                    right: dir === 'e' ? '-5px' : dir === 'w' ? 'auto' : '10%',
                                                    width: dir === 'n' || dir === 's' ? '100%' : '10px',
                                                    height: dir === 'e' || dir === 'w' ? '100%' : '10px',
                                                }}
                                            />
                                        ))}
                                    </>
                                )}

                                <SmartText
                                    text={getPreviewValue(field)}
                                    fontSize={field.fontSize}
                                    color={field.color}
                                    fontFamily={field.fontFamily}
                                    maxWidthPercent={100}
                                    boxWidth={field.boxWidth}
                                    boxHeight={field.boxHeight}
                                    fieldId={field.id}
                                    isMultiLine={field.isMultiLine}
                                />
                            </div>
                        ))}

                        {/* ... (Smart Guides remain) */}
                        {showVerticalGuide && (
                            <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-red-500 z-50 pointer-events-none transform -translate-x-1/2 opacity-70 border-r border-dashed border-red-500" />
                        )}
                        {showHorizontalGuide && (
                            <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-red-500 z-50 pointer-events-none transform -translate-y-1/2 opacity-70 border-b border-dashed border-red-500" />
                        )}
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-6 overflow-y-auto pr-2">
                {/* ... (Image Upload Card) */}
                <Card>
                    <CardContent className="p-4 space-y-4">
                        <Label className="text-base font-semibold">Fondo del Certificado ({activePage === "front" ? "Frontal" : "Reverso"})</Label>
                        <div className="flex items-center gap-4">
                            <div className="w-full">
                                <Input
                                    type="file"
                                    id="cert-bg-upload"
                                    className="hidden"
                                    accept="image/*,.pdf"
                                    onChange={handleImageUpload}
                                    disabled={uploading}
                                />
                                <Button variant="outline" className="w-full" asChild disabled={uploading}>
                                    <Label htmlFor="cert-bg-upload" className="cursor-pointer flex items-center justify-center">
                                        {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ImageIcon className="w-4 h-4 mr-2" />}
                                        {uploading ? "Subiendo..." : "Subir Plantilla (PDF/Img)"}
                                    </Label>
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="flex-1 overflow-y-auto pb-10">
                    <CardContent className="p-4 space-y-6">
                        {/* El Selector de Año fue movido a la pestaña principal de Configuración del Curso */}
                        <div className="space-y-2 pb-4 border-b">
                            <Label className="text-base font-semibold">Configuración de Horas</Label>
                            <Select value={hoursType} onValueChange={(v: any) => setHoursType(v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccione tipo de horas" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="academic">Solo Horas Académicas</SelectItem>
                                    <SelectItem value="lecture">Solo Horas Lectivas</SelectItem>
                                    <SelectItem value="both">Ambas (Si existen)</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">Define qué tipo de carga horaria mostrar en el certificado.</p>
                        </div>

                        <div className="space-y-2">
                            {/* ... (Fields List) */}
                            <Label className="text-base font-semibold">Campos - {activePage === 'front' ? 'Frontal' : 'Reverso'}</Label>
                            <div className="space-y-2 mb-4">
                                <Label className="text-xs text-muted-foreground">Variables Disponibles</Label>
                                <div className="flex flex-wrap gap-2">
                                    {/* Core Variables */}
                                    {CORE_VARIABLES.map((v) => (
                                        <Button
                                            key={v.id}
                                            variant="secondary"
                                            size="sm"
                                            className="text-xs h-7 bg-primary/10 hover:bg-primary/20 text-primary border-primary/20"
                                            onClick={() => addCustomField(v.id, v.value, true)}
                                        >
                                            <Plus className="w-3 h-3 mr-1" />
                                            {v.label}
                                        </Button>
                                    ))}

                                    {/* Course Metadata Variables */}
                                    {fetchedMetadata.map((meta) => (
                                        <Button
                                            key={meta.key}
                                            variant="secondary"
                                            size="sm"
                                            className="text-xs h-7"
                                            onClick={() => addCustomField(meta.key, meta.value)}
                                            title={`Valor actual: ${meta.value}`}
                                        >
                                            <Plus className="w-3 h-3 mr-1" />
                                            {meta.key}
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            <Button variant="outline" className="w-full border-dashed" onClick={() => addCustomField()}>
                                <Plus className="w-4 h-4 mr-2" /> Agregar Campo Vacío
                            </Button>

                            <div className="grid gap-2 mt-2">
                                {activeFields.map(field => (
                                    <div key={field.id} className="flex gap-2">
                                        <Button
                                            variant={selectedFieldId === field.id ? "default" : "outline"}
                                            className="justify-start text-xs flex-1 truncate"
                                            onClick={() => setSelectedFieldId(field.id)}
                                        >
                                            {field.label}
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-destructive" onClick={() => removeField(field.id)}>
                                            <XCircle className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {selectedField ? (
                            <div className="space-y-4 pt-4 border-t border-border animate-in fade-in slide-in-from-right-4">
                                <h4 className="font-medium text-sm text-primary">Editando: {selectedField.label}</h4>
                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <Label className="text-xs">Texto / Etiqueta</Label>
                                        <Input value={selectedField.label} onChange={(e) => updateField(selectedField.id, { label: e.target.value })} />
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <Label className="text-xs">Tamaño</Label>
                                            <Input type="number" value={selectedField.fontSize} onChange={(e) => updateField(selectedField.id, { fontSize: Number(e.target.value) })} />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">Color</Label>
                                            <Input type="color" value={selectedField.color} className="h-9" onChange={(e) => updateField(selectedField.id, { color: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Dimensiones de Caja (Ancho x Alto %)</Label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] w-4">W:</span>
                                                <Slider
                                                    value={[selectedField.boxWidth || 30]}
                                                    min={5} max={100} step={1}
                                                    onValueChange={(val) => updateField(selectedField.id, { boxWidth: val[0] })}
                                                    className="flex-1"
                                                />
                                                <span className="text-[10px] w-6">{selectedField.boxWidth || 30}%</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] w-4">H:</span>
                                                <Slider
                                                    value={[selectedField.boxHeight || 10]}
                                                    min={2} max={100} step={1}
                                                    onValueChange={(val) => updateField(selectedField.id, { boxHeight: val[0] })}
                                                    className="flex-1"
                                                />
                                                <span className="text-[10px] w-6">{selectedField.boxHeight || 10}%</span>
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground">Define el área reservada. El texto se reducirá para caber.</p>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Fuente</Label>
                                        <Select value={selectedField.fontFamily} onValueChange={(val) => updateField(selectedField.id, { fontFamily: val })}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Helvetica">Helvetica</SelectItem>
                                                <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                                                <SelectItem value="Courier New">Courier New</SelectItem>
                                                <SelectItem value="Arial">Arial</SelectItem>
                                                <SelectItem value="Great Vibes">Great Vibes (Firma)</SelectItem>
                                                <SelectItem value="Cinzel">Cinzel (Clásico)</SelectItem>
                                                <SelectItem value="Playfair Display">Playfair Display (Elegante)</SelectItem>
                                                <SelectItem value="Montserrat">Montserrat (Moderno)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="flex items-center gap-2 pt-1">
                                        <Input
                                            type="checkbox"
                                            id="field-multiline"
                                            checked={!!selectedField.isMultiLine}
                                            onChange={(e) => updateField(selectedField.id, { isMultiLine: e.target.checked })}
                                            className="h-4 w-4 cursor-pointer"
                                        />
                                        <Label htmlFor="field-multiline" className="text-xs cursor-pointer">Texto multilínea</Label>
                                    </div>

                                    {/* Configuración especial solo para el Número de Registro */}
                                    {(
                                        selectedField.id.replace(/-back$/, '') === 'code' ||
                                        selectedField.label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes('registro') ||
                                        selectedField.label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes('numero') ||
                                        selectedField.label.toLowerCase().includes('code')
                                    ) && (
                                            <div className="space-y-2 pt-4 border-t border-border mt-4">
                                                <Label className="text-sm font-bold text-primary">Año para Número de Registro</Label>
                                                <Input
                                                    type="number"
                                                    min={2020}
                                                    max={2099}
                                                    value={registrationYear}
                                                    onChange={(e) => setRegistrationYear(Number(e.target.value))}
                                                    className="w-full font-semibold text-lg"
                                                />
                                                <p className="text-[10px] text-muted-foreground leading-tight">
                                                    Este año se usará de forma estática en todos los certificados para este curso y se verá en el número, ej: N° 001 - {registrationYear}.
                                                </p>
                                            </div>
                                        )}
                                </div>
                            </div>
                        ) : (
                            <div className="p-4 border border-dashed rounded-lg bg-muted/20 text-center space-y-2">
                                <Move className="w-8 h-8 text-muted-foreground mx-auto opacity-50" />
                                <p className="text-sm font-medium text-muted-foreground">Selecciona un campo en la lista o en el certificado para editar sus dimensiones y propiedades.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 gap-4">
                    <Button onClick={handleSave} disabled={!courseId && !onSaveSettings}>
                        <Save className="w-4 h-4 mr-2" /> Guardar Todo
                    </Button>
                </div>
            </div>
        </div>
    );
}
