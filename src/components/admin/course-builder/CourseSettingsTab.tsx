import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { BrowserWindow } from "@/components/ui/BrowserWindow";
import { courseService } from "@/services/courseService";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface CourseSettingsTabProps {
    course: any;
    setCourse: (course: any) => void;
}

export function CourseSettingsTab({ course, setCourse }: CourseSettingsTabProps) {
    const [certSequence, setCertSequence] = useState<string>("");
    const [isLoadingSeq, setIsLoadingSeq] = useState(false);
    const [isSavingSeq, setIsSavingSeq] = useState(false);

    useEffect(() => {
        if (course?.id) {
            loadSequence();
        }
    }, [course?.id]);

    const loadSequence = async () => {
        if (!course?.id) return;
        setIsLoadingSeq(true);
        try {
            const result = await courseService.getCertificateSequence(course.id);
            if (result && result.last_number !== undefined) {
                setCertSequence(result.last_number.toString());
            }
        } catch (error) {
            console.error("Error loading sequence", error);
        } finally {
            setIsLoadingSeq(false);
        }
    };

    const handleUpdateSequence = async () => {
        if (!course?.id) return;
        const newSeq = parseInt(certSequence);
        if (isNaN(newSeq) || newSeq < 1) {
            toast.error("Por favor ingresa un número válido mayor a 0.");
            return;
        }

        setIsSavingSeq(true);
        try {
            await courseService.updateCertificateSequence(course.id, newSeq);
            toast.success("Secuencia de certificados actualizada correctamente.");
            loadSequence();
        } catch (error: any) {
            console.error("Error updating sequence", error);
            // Mostrar error amigable si es la excepción lanzada desde Postgres
            if (error.message && error.message.includes('existen certificados emitidos')) {
                toast.error(error.message);
            } else {
                toast.error("Error al actualizar la secuencia. Inténtalo de nuevo.");
            }
        } finally {
            setIsSavingSeq(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Configuración del Curso</CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
                <div className="flex flex-col md:flex-row gap-8">
                    <div className="space-y-8 flex-1">
                        {/* Precios */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">Precio y Ofertas</h3>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>Precio de Venta (S/)</Label>
                                    <Input
                                        type="number"
                                        placeholder="0.00"
                                        value={course.price}
                                        onChange={(e) => setCourse({ ...course, price: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Precio Original (Antes del descuento)</Label>
                                    <Input
                                        type="number"
                                        placeholder="0.00"
                                        value={course.original_price || ""}
                                        onChange={(e) => setCourse({ ...course, original_price: e.target.value })}
                                    />
                                    <p className="text-xs text-muted-foreground">Opcional. Si se llena, se mostrará como una oferta.</p>
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* Numeración de Certificados */}
                        {course?.id && (
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <h3 className="text-lg font-medium">Numeración de Certificados</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Define el número base para los próximos certificados de este curso.
                                        El siguiente certificado emitido tomará este número + 1.
                                    </p>
                                </div>
                                <div className="flex items-end gap-4 max-w-sm">
                                    <div className="space-y-2 flex-1">
                                        <Label>Número Base Actual</Label>
                                        <Input
                                            type="number"
                                            placeholder="Ej. 100, 200..."
                                            value={certSequence}
                                            onChange={(e) => setCertSequence(e.target.value)}
                                            disabled={isLoadingSeq || isSavingSeq}
                                        />
                                    </div>
                                    <Button
                                        variant="secondary"
                                        onClick={handleUpdateSequence}
                                        disabled={isLoadingSeq || isSavingSeq}
                                    >
                                        {isSavingSeq ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                        Actualizar
                                    </Button>
                                </div>
                            </div>
                        )}

                        <Separator />

                        <div className="flex items-center justify-between p-4 border rounded-lg bg-secondary/10">
                            <div className="space-y-0.5">
                                <Label className="text-base">Publicar Curso</Label>
                                <p className="text-sm text-muted-foreground">Hacer visible este curso para todos los estudiantes.</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={course.published ? "text-green-600 font-bold text-sm" : "text-amber-600 font-bold text-sm"}>
                                    {course.published ? "PUBLICADO" : "BORRADOR"}
                                </span>
                                <Switch checked={course.published} onCheckedChange={(c) => setCourse({ ...course, published: c })} />
                            </div>
                        </div>
                    </div>

                    {/* Live Preview Card */}
                    <div className="w-full md:w-[400px] shrink-0">
                        <Label className="mb-3 block text-center font-medium">Vista Previa (Web)</Label>
                        <BrowserWindow url={`https://gerencia.global/cursos/${course.slug || '...'}`}>
                            <div className="p-4 bg-muted/10 min-h-[300px]">
                                <div className="border rounded-xl overflow-hidden shadow-lg bg-card max-w-[320px] mx-auto">
                                    <div className="aspect-video bg-muted relative">
                                        {course.image_url ? (
                                            <img src={course.image_url} alt="Cover" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-muted-foreground">Sin Imagen</div>
                                        )}
                                        {course.original_price > Number(course.price) && (
                                            <span className="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">
                                                -{Math.round(((course.original_price - course.price) / course.original_price) * 100)}%
                                            </span>
                                        )}
                                    </div>
                                    <div className="p-4 space-y-2">
                                        <div className="text-xs font-bold text-blue-600 uppercase tracking-wider">{course.category || "Categoría"}</div>
                                        <h3 className="font-bold leading-tight line-clamp-2">{course.title || "Título del Curso"}</h3>
                                        <p className="text-sm text-muted-foreground line-clamp-2">{course.subtitle || "Subtítulo del curso..."}</p>
                                        <div className="pt-2 flex items-baseline gap-2">
                                            <span className="text-lg font-bold">S/ {course.price || "0.00"}</span>
                                            {Number(course.original_price) > Number(course.price) && (
                                                <span className="text-sm text-muted-foreground line-through">S/ {course.original_price}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </BrowserWindow>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
