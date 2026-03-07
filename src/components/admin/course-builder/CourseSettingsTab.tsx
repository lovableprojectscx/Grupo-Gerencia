import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { BrowserWindow } from "@/components/ui/BrowserWindow";

interface CourseSettingsTabProps {
    course: any;
    setCourse: (course: any) => void;
}

export function CourseSettingsTab({ course, setCourse }: CourseSettingsTabProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Precio y Publicación</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex flex-col md:flex-row gap-8">
                    <div className="space-y-6 flex-1">
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
