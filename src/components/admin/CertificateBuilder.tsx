
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
    value?: string; // For preview
}

const defaultFields: FieldPosition[] = [
    { id: "studentName", label: "Nombre del Estudiante", x: 50, y: 40, fontSize: 32, color: "#000000", fontFamily: "Helvetica", visible: true, value: "Maria Elena Torres" },
    { id: "studentDni", label: "DNI del Estudiante", x: 50, y: 48, fontSize: 14, color: "#333333", fontFamily: "Helvetica", visible: true, value: "DNI: 12345678" },
    { id: "courseName", label: "Nombre del Curso", x: 50, y: 55, fontSize: 24, color: "#333333", fontFamily: "Helvetica", visible: true, value: "Diplomado en Cuidados Intensivos" },
    { id: "date", label: "Fecha de Emisión", x: 50, y: 70, fontSize: 16, color: "#666666", fontFamily: "Helvetica", visible: true, value: "15 de Enero, 2026" },
    { id: "code", label: "Número de Registro", x: 80, y: 90, fontSize: 12, color: "#999999", fontFamily: "Courier New", visible: true, value: "REG-2026-001" },
];

interface CertificateBuilderProps {
    courseId?: string;
    defaultMetadata?: { key: string, value: string }[];
    template?: any;
    onTemplateChange?: (template: any) => void;
}

export function CertificateBuilder({ courseId, defaultMetadata = [], template, onTemplateChange }: CertificateBuilderProps) {
    const [bgImageFront, setBgImageFront] = useState<string>(template?.bgImageFront || template?.bgImage || "https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?w=1200&auto=format&fit=crop&q=80");
    const [bgImageBack, setBgImageBack] = useState<string>(template?.bgImageBack || ""); // Default empty/white
    const [activePage, setActivePage] = useState<"front" | "back">("front");

    const [uploading, setUploading] = useState(false);

    // Ensure fields have 'page' property. detailed migration.
    const initialFields = (template?.fields && template.fields.length > 0)
        ? template.fields.map((f: any) => ({ ...f, page: f.page || "front" }))
        : defaultFields.map(f => ({ ...f, page: "front" }));

    // Add default back fields if not present
    if (!initialFields.some((f: any) => f.page === "back")) {
        initialFields.push(
            { id: "code-back", label: "Número de Registro", x: 50, y: 30, fontSize: 32, color: "#000000", fontFamily: "Courier New", visible: true, value: "REG-2026-001", page: "back" },
            { id: "studentName-back", label: "Nombre del Estudiante", x: 50, y: 50, fontSize: 24, color: "#333333", fontFamily: "Helvetica", visible: true, value: "Maria Elena Torres", page: "back" }
        );
    }

    const [fields, setFields] = useState<any[]>(initialFields);
    const [fetchedMetadata, setFetchedMetadata] = useState<{ key: string, value: string }[]>(defaultMetadata);

    useEffect(() => {
        if (defaultMetadata) setFetchedMetadata(defaultMetadata);
    }, [defaultMetadata]);

    useEffect(() => {
        if (template) {
            if (template.bgImageFront && template.bgImageFront !== bgImageFront) setBgImageFront(template.bgImageFront);
            if (template.bgImageBack && template.bgImageBack !== bgImageBack) setBgImageBack(template.bgImageBack);
            // Re-sync fields if needed, simplified for now
        }
    }, [template]);

    const notifyParent = (currentFields: any[], bgF: string, bgB: string) => {
        if (onTemplateChange) {
            onTemplateChange({
                bgImageFront: bgF,
                bgImageBack: bgB,
                bgImage: bgF, // Legacy support
                fields: currentFields
            });
        }
    };

    const fieldsRef = useRef(fields);
    useEffect(() => { fieldsRef.current = fields; }, [fields]);

    // Metadata injection
    // Metadata injection - Only if we don't have a template or explicitly resetting
    // Removed automatic injection on every metadata change to prevent "zombie" fields that user deleted
    // Initialize hoursType from template or default to academic
    const [hoursType, setHoursType] = useState<"academic" | "lecture" | "both">(template?.hoursType || "academic");

    // Initial load of fields logic is already handled by initialFields const
    // We just need to handle dynamic updates from metadata or hoursType

    useEffect(() => {
        // Only run this if we have metadata to process
        if (fetchedMetadata.length === 0) return;

        setFields(prevFields => {
            let newFieldsList = [...prevFields];

            // 1. Strict Removal Logic based on rules
            if (hoursType === "academic") {
                // Remove Lectivas if present
                newFieldsList = newFieldsList.filter(f => f.label !== "Horas Lectivas" && f.id !== "meta-Horas-Lectivas");
            } else if (hoursType === "lecture") {
                // Remove Academicas if present
                newFieldsList = newFieldsList.filter(f => f.label !== "Horas Académicas" && f.id !== "meta-Horas-Académicas");
            }
            // If "both", we keep both (don't filter either out)

            // 2. Add Logic
            // We iterate through relevant metadata and add if missing
            const relevantMetadata = fetchedMetadata.filter(meta => {
                if (hoursType === "academic" && meta.key === "Horas Lectivas") return false;
                if (hoursType === "lecture" && meta.key === "Horas Académicas") return false;
                return true;
            });

            relevantMetadata.forEach((meta, i) => {
                const stableId = `meta-${meta.key.replace(/\s+/g, '-')}`;

                // Check if this field effectively exists (by ID or by Label)
                const alreadyExists = newFieldsList.some(f => f.id === stableId || f.label === meta.key);

                if (!alreadyExists) {
                    // Start position logic: Try to place hours intelligently if possible, otherwise default stack
                    let defaultY = 85 + (i * 5);
                    let defaultX = 20;

                    // Little helper for better default placement of hours if they are new
                    if (meta.key === "Horas Académicas") { defaultX = 30; defaultY = 75; }
                    if (meta.key === "Horas Lectivas") { defaultX = 70; defaultY = 75; }

                    newFieldsList.push({
                        id: stableId,
                        label: meta.key,
                        x: defaultX,
                        y: defaultY,
                        fontSize: 14,
                        color: "#333333",
                        fontFamily: "Helvetica",
                        visible: true,
                        value: meta.value,
                        page: "front"
                    });
                }
            });

            return newFieldsList;
        });
    }, [fetchedMetadata, hoursType]); // Removed template from dep array to prevent loop resets

    const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleSave = async () => {
        if (!courseId) return;
        const templateData = { bgImageFront, bgImageBack, bgImage: bgImageFront, fields, hoursType }; // Save hoursType

        const { error } = await supabase
            .from("courses")
            .update({ certificate_template: templateData })
            .eq("id", courseId);

        if (error) toast.error("Error al guardar: " + error.message);
        else {
            toast.success("Diseño guardado correctamente");
            if (onTemplateChange) onTemplateChange(templateData);
        }
    };

    const [numPages, setNumPages] = useState<number>(0);
    const [aspectRatio, setAspectRatio] = useState(1.414); // Default to A4 Landscape

    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
    };

    const onPageLoadSuccess = (page: any) => {
        const ratio = page.originalWidth / page.originalHeight;
        setAspectRatio(ratio);
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const toastId = toast.loading("Subiendo archivo...");

        try {
            const fileExt = file.name.split('.').pop()?.toLowerCase();
            const fileName = `cert-${activePage}-${Math.random()}.${fileExt}`;
            const filePath = `certificates/${fileName}`;

            const { error: uploadError } = await supabase.storage.from('course-content').upload(filePath, file);
            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from('course-content').getPublicUrl(filePath);
            const publicUrl = data.publicUrl;

            if (activePage === "front") {
                setBgImageFront(publicUrl);
                // Smart Feature: If PDF, assume it might be 2 pages and set back same as front by default
                if (file.type === 'application/pdf') {
                    setBgImageBack(publicUrl);
                    notifyParent(fields, publicUrl, publicUrl);
                } else {
                    notifyParent(fields, publicUrl, bgImageBack);
                }
            } else {
                setBgImageBack(publicUrl);
                notifyParent(fields, bgImageFront, publicUrl);
            }
            toast.success("Fondo actualizado", { id: toastId });
        } catch (error: any) {
            console.error(error);
            toast.error("Error: " + error.message, { id: toastId });
        } finally {
            setUploading(false);
            e.target.value = "";
        }
    };

    const updateField = (id: string, updates: any) => {
        const newFields = fields.map(f => f.id === id ? { ...f, ...updates } : f);
        setFields(newFields);
        notifyParent(newFields, bgImageFront, bgImageBack);
    };

    const addCustomField = (key?: string, val?: string) => {
        const newId = `custom-${Date.now()}`;
        setFields([
            ...fields,
            {
                id: newId,
                label: key || "Nuevo Campo",
                x: 50,
                y: 50,
                fontSize: 18,
                color: "#000000",
                fontFamily: "Helvetica",
                visible: true,
                value: val || "Texto",
                page: activePage
            }
        ]);
        setSelectedFieldId(newId);
    };

    const removeField = (id: string) => {
        setFields(fields.filter(f => f.id !== id));
        if (selectedFieldId === id) setSelectedFieldId(null);
    };

    const selectedField = fields.find(f => f.id === selectedFieldId);

    // Drag Logic
    const [isDragging, setIsDragging] = useState(false);
    const [showVerticalGuide, setShowVerticalGuide] = useState(false);
    const [showHorizontalGuide, setShowHorizontalGuide] = useState(false);

    const dragRef = useRef<{ id: string; startX: number; startY: number; initialLeft: number; initialTop: number } | null>(null);

    const handleMouseDown = (e: React.MouseEvent, id: string) => {
        if (!containerRef.current) return;
        e.preventDefault(); e.stopPropagation();
        const field = fields.find(f => f.id === id);
        if (!field) return;

        setIsDragging(true); setSelectedFieldId(id);
        dragRef.current = { id, startX: e.clientX, startY: e.clientY, initialLeft: field.x, initialTop: field.y };
        window.addEventListener('mousemove', handleGlobalMouseMove);
        window.addEventListener('mouseup', handleGlobalMouseUp);
    };

    const handleGlobalMouseMove = (e: MouseEvent) => {
        if (!dragRef.current || !containerRef.current) return;
        const { startX, startY, initialLeft, initialTop, id } = dragRef.current;
        const rect = containerRef.current.getBoundingClientRect();

        // Calculate raw delta as percentage
        const deltaX = ((e.clientX - startX) / rect.width) * 100;
        const deltaY = ((e.clientY - startY) / rect.height) * 100;

        let newX = Math.max(0, Math.min(100, initialLeft + deltaX));
        let newY = Math.max(0, Math.min(100, initialTop + deltaY));

        // SNAP LOGIC
        const SNAP_THRESHOLD = 1.5; // Snap if within 1.5% of center

        // Center X (50%)
        if (Math.abs(newX - 50) < SNAP_THRESHOLD) {
            newX = 50;
            setShowVerticalGuide(true);
        } else {
            setShowVerticalGuide(false);
        }

        // Center Y (50%)
        if (Math.abs(newY - 50) < SNAP_THRESHOLD) {
            newY = 50;
            setShowHorizontalGuide(true);
        } else {
            setShowHorizontalGuide(false);
        }

        setFields(prev => prev.map(f => f.id === id ? { ...f, x: Number(newX.toFixed(1)), y: Number(newY.toFixed(1)) } : f));
    };

    const handleGlobalMouseUp = () => {
        if (dragRef.current) notifyParent(fieldsRef.current, bgImageFront, bgImageBack);
        setIsDragging(false);
        setShowVerticalGuide(false);
        setShowHorizontalGuide(false);
        dragRef.current = null;
        window.removeEventListener('mousemove', handleGlobalMouseMove);
        window.removeEventListener('mouseup', handleGlobalMouseUp);
    };

    useEffect(() => {
        return () => {
            window.removeEventListener('mousemove', handleGlobalMouseMove);
            window.removeEventListener('mouseup', handleGlobalMouseUp);
        };
    }, []);

    const handlePreviewPDF = async () => {
        // Simple preview alert for now as dual page preview is complex in one canvas without proper render
        toast.info("Para ver el PDF completo, guarda y usa la vista previa del estudiante.");
    };

    const activeFields = fields.filter(f => f.visible && f.page === activePage);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 h-[calc(100vh-100px)]">

            <div className="flex flex-col gap-4">
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
                        style={{ aspectRatio: aspectRatio }}
                    >
                        {/* Background */}
                        {(() => {
                            const currentBg = activePage === "front" ? bgImageFront : bgImageBack;
                            if (!currentBg) {
                                return (
                                    <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-gray-100">
                                        Sube una plantilla para la {activePage === "front" ? "Hoja 1" : "Hoja 2"}
                                    </div>
                                );
                            }

                            const isPdf = currentBg.toLowerCase().endsWith('.pdf');

                            if (isPdf) {
                                return (
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
                                );
                            }

                            return (
                                <img
                                    src={currentBg}
                                    alt="Certificate Template"
                                    className="w-full h-full object-cover pointer-events-none"
                                    onLoad={(e) => {
                                        const img = e.currentTarget;
                                        setAspectRatio(img.naturalWidth / img.naturalHeight);
                                    }}
                                />
                            );
                        })()}

                        {/* Fields */}
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
                                    fontSize: `${field.fontSize}px`,
                                    color: field.color,
                                    fontFamily: field.fontFamily,
                                    cursor: isDragging ? "grabbing" : "grab",
                                    border: selectedFieldId === field.id ? "2px dashed blue" : "1px dashed transparent",
                                    padding: "4px 8px",
                                    zIndex: selectedFieldId === field.id ? 20 : 10,
                                    whiteSpace: "nowrap"
                                }}
                                className="hover:border-primary/50 transition-colors font-bold"
                            >
                                {field.value}
                            </div>
                        ))}

                        {/* Smart Guides (Canva-like) */}
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

                <Card className="flex-1 overflow-y-auto">
                    <CardContent className="p-4 space-y-6">
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
                            <Label className="text-base font-semibold">Campos - {activePage === 'front' ? 'Frontal' : 'Reverso'}</Label>
                            <div className="space-y-2 mb-4">
                                <Label className="text-xs text-muted-foreground">Variables Disponibles</Label>
                                <div className="flex flex-wrap gap-2">
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

                        {selectedField && (
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
                                        <Label className="text-xs">Fuente</Label>
                                        <Select value={selectedField.fontFamily} onValueChange={(val) => updateField(selectedField.id, { fontFamily: val })}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Helvetica">Helvetica</SelectItem>
                                                <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                                                <SelectItem value="Courier New">Courier New</SelectItem>
                                                <SelectItem value="Arial">Arial</SelectItem>
                                                {/* Premium Fonts */}
                                                <SelectItem value="Great Vibes">Great Vibes (Firma)</SelectItem>
                                                <SelectItem value="Cinzel">Cinzel (Clásico)</SelectItem>
                                                <SelectItem value="Playfair Display">Playfair Display (Elegante)</SelectItem>
                                                <SelectItem value="Montserrat">Montserrat (Moderno)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 gap-4">
                    <Button onClick={handleSave} disabled={!courseId}>
                        <Save className="w-4 h-4 mr-2" /> Guardar Todo
                    </Button>
                </div>
            </div>
        </div>
    );
}
