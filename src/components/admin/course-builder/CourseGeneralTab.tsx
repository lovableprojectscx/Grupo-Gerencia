import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { GripVertical, Plus, Image as ImageIcon, Loader2, Upload, XCircle } from "lucide-react";
import { useCategories } from "@/hooks/useCategories";

interface CourseGeneralTabProps {
    course: any;
    setCourse: (course: any) => void;
    instructors: any[];
    setIsInstructorManagerOpen: (open: boolean) => void;
    setIsInstructorDialogOpen: (open: boolean) => void;
    setIsCategoryManagerOpen: (open: boolean) => void;
    handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    uploading: boolean;
}

export function CourseGeneralTab({
    course,
    setCourse,
    instructors,
    setIsInstructorManagerOpen,
    setIsInstructorDialogOpen,
    setIsCategoryManagerOpen,
    handleImageUpload,
    uploading
}: CourseGeneralTabProps) {
    const { categories } = useCategories();

    return (
        <div className="grid gap-6 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle>Detalles Básicos</CardTitle>
                    <CardDescription>Información principal que verán los estudiantes.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="title" className="flex gap-1">Título del Curso <span className="text-destructive">*</span></Label>
                        <Input
                            id="title"
                            placeholder="Ej. Diplomado en Gestión Pública"
                            value={course.title}
                            onChange={(e) => setCourse({ ...course, title: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="subtitle">Subtítulo Corto</Label>
                        <Input
                            id="subtitle"
                            placeholder="Breve descripción atractiva"
                            value={course.subtitle || ""}
                            onChange={(e) => setCourse({ ...course, subtitle: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <Label htmlFor="desc" className="flex gap-1">Descripción Completa <span className="text-destructive">*</span></Label>
                        </div>
                        <Textarea
                            id="desc"
                            className="min-h-[150px]"
                            placeholder="Detalla qué aprenderán los estudiantes..."
                            value={course.description || ""}
                            onChange={(e) => setCourse({ ...course, description: e.target.value })}
                        />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                        <span>Instructor</span>
                        <div>
                            <Button variant="outline" size="sm" onClick={() => setIsInstructorManagerOpen(true)} className="mr-2">
                                <GripVertical className="w-3 h-3 mr-1" /> Gestionar
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setIsInstructorDialogOpen(true)}>
                                <Plus className="w-3 h-3 mr-1" /> Nuevo
                            </Button>
                        </div>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Seleccionar Instructor</Label>
                        <Select
                            value={course.instructor_id || ""}
                            onValueChange={(val) => setCourse({ ...course, instructor_id: val })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccione un instructor" />
                            </SelectTrigger>
                            <SelectContent>
                                {instructors.map((inst) => (
                                    <SelectItem key={inst.id} value={inst.id}>
                                        {inst.name} ({inst.title})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Configuración del Curso</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Modalidad</Label>
                        <Select value={course.modality || "async"} onValueChange={(val) => setCourse({ ...course, modality: val })}>
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccione modalidad" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="async">Grabado (Asincrónico)</SelectItem>
                                <SelectItem value="live">En Vivo (Sincrónico)</SelectItem>
                                <SelectItem value="hybrid">Híbrido</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">Define si las clases son en vivo o grabadas.</p>
                    </div>

                    <div className="space-y-2">
                        <Label>Duración del Curso</Label>
                        <Input
                            placeholder="Ej. 10 Semanas (120 Horas)"
                            value={course.duration || ""}
                            onChange={(e) => setCourse({ ...course, duration: e.target.value })}
                        />
                        <p className="text-xs text-muted-foreground">Se mostrará en la ficha del curso en lugar de "A tu ritmo".</p>
                    </div>
                    <div className="space-y-2">
                        <Label>Nivel</Label>
                        <Select value={course.level || "none"} onValueChange={(val) => setCourse({ ...course, level: val })}>
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccione" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Ninguno (No mostrar)</SelectItem>
                                <SelectItem value="beginner">Básico</SelectItem>
                                <SelectItem value="intermediate">Intermedio</SelectItem>
                                <SelectItem value="advanced">Avanzado</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Tipo de Programa</Label>
                        <Select
                            value={course.metadata?.find((m: any) => m.key === "program_type")?.value || "course"}
                            onValueChange={(val) => {
                                const current = [...(course.metadata || [])];
                                const index = current.findIndex((m: any) => m.key === "program_type");
                                if (index >= 0) {
                                    current[index].value = val;
                                } else {
                                    current.push({ key: "program_type", value: val });
                                }
                                setCourse({ ...course, metadata: current });
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccione tipo" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="course">Curso Especializado</SelectItem>
                                <SelectItem value="diploma">Diplomado</SelectItem>
                                <SelectItem value="specialization">Especialización</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">Define si es un Curso, Diplomado o Especialización.</p>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-border">
                        <Label className="text-base text-primary font-bold">Datos del Certificado</Label>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground">Horas Lectivas</Label>
                                    <Input
                                        placeholder="Ej. 120 Horas Lectivas"
                                        value={course.metadata?.find((m: any) => m.key === "Horas Lectivas")?.value || ""}
                                        onChange={(e) => {
                                            const current = [...(course.metadata || [])];
                                            const index = current.findIndex((m: any) => m.key === "Horas Lectivas");
                                            if (index >= 0) {
                                                current[index].value = e.target.value;
                                            } else {
                                                current.push({ key: "Horas Lectivas", value: e.target.value });
                                            }
                                            setCourse({ ...course, metadata: current });
                                        }}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground">Horas Académicas</Label>
                                    <Input
                                        placeholder="Ej. 160 Horas Académicas"
                                        value={course.metadata?.find((m: any) => m.key === "Horas Académicas")?.value || ""}
                                        onChange={(e) => {
                                            const current = [...(course.metadata || [])];
                                            const index = current.findIndex((m: any) => m.key === "Horas Académicas");
                                            if (index >= 0) {
                                                current[index].value = e.target.value;
                                            } else {
                                                current.push({ key: "Horas Académicas", value: e.target.value });
                                            }
                                            setCourse({ ...course, metadata: current });
                                        }}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground">Créditos</Label>
                                    <Input
                                        placeholder="Ej. 5 Créditos"
                                        value={course.metadata?.find((m: any) => m.key === "Créditos")?.value || ""}
                                        onChange={(e) => {
                                            const current = [...(course.metadata || [])];
                                            const index = current.findIndex((m: any) => m.key === "Créditos");
                                            if (index >= 0) {
                                                current[index].value = e.target.value;
                                            } else {
                                                current.push({ key: "Créditos", value: e.target.value });
                                            }
                                            setCourse({ ...course, metadata: current });
                                        }}
                                    />
                                </div>
                            </div>

                            <Separator className="my-2" />
                            <Label className="text-sm">Otros Datos Personalizados</Label>

                            {course.metadata?.filter((m: any) => !["Horas Lectivas", "Horas Académicas", "Créditos", "program_type", "live_url", "live_date", "certificates_enabled"].includes(m.key)).map((item: any, index: number) => {
                                const realIndex = course.metadata.findIndex((m: any) => m === item);
                                const itemKey = `meta-${item.key || 'empty'}-${index}`;
                                return (
                                    <div key={itemKey} className="flex gap-2 items-center">
                                        <Input
                                            placeholder="Nombre del dato"
                                            value={item.key}
                                            onChange={(e) => {
                                                const newMeta = [...(course.metadata || [])];
                                                newMeta[realIndex].key = e.target.value;
                                                setCourse({ ...course, metadata: newMeta });
                                            }}
                                            className="flex-1"
                                        />
                                        <Input
                                            placeholder="Valor"
                                            value={item.value}
                                            onChange={(e) => {
                                                const newMeta = [...(course.metadata || [])];
                                                newMeta[realIndex].value = e.target.value;
                                                setCourse({ ...course, metadata: newMeta });
                                            }}
                                            className="flex-1"
                                        />
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-red-500"
                                            onClick={() => {
                                                const newMeta = course.metadata.filter((_: any, i: number) => i !== realIndex);
                                                setCourse({ ...course, metadata: newMeta });
                                            }}
                                        >
                                            <XCircle className="w-4 h-4" />
                                        </Button>
                                    </div>
                                )
                            })}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCourse({ ...course, metadata: [...(course.metadata || []), { key: "", value: "" }] })}
                                className="w-full border-dashed"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Agregar Otro Dato
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Ingresa los valores específicos para este curso. El alumno elegirá entre Horas Lectivas y Académicas.
                        </p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Multimedia y Categorización</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label>Imagen de Portada</Label>
                        <div className="flex gap-2">
                            <Input
                                placeholder="https://..."
                                value={course.image_url || ""}
                                onChange={(e) => setCourse({ ...course, image_url: e.target.value })}
                                className="flex-1"
                            />
                            <div className="relative">
                                <Input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    className="hidden"
                                    id="image-upload"
                                    disabled={uploading}
                                />
                                <Button variant="outline" size="icon" asChild>
                                    <Label htmlFor="image-upload" className="cursor-pointer">
                                        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                    </Label>
                                </Button>
                            </div>
                        </div>
                        <div className="aspect-video bg-secondary/50 rounded-lg border-2 border-dashed border-muted-foreground/25 flex flex-col items-center justify-center cursor-pointer overflow-hidden">
                            {course.image_url ? (
                                <img src={course.image_url} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                                <>
                                    <ImageIcon className="w-10 h-10 text-muted-foreground mb-2" />
                                    <span className="text-sm text-muted-foreground">Vista previa</span>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <Label className="flex gap-1">Categoría <span className="text-destructive">*</span></Label>
                                <Button variant="ghost" size="sm" onClick={() => setIsCategoryManagerOpen(true)} className="h-6 px-2 text-xs">
                                    <GripVertical className="w-3 h-3 mr-1" /> Gestionar
                                </Button>
                            </div>
                            <Select value={course.category} onValueChange={(val) => setCourse({ ...course, category: val, specialty: "" })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccione" />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map(cat => (
                                        <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Especialidad</Label>
                            <Select
                                value={course.specialty || ""}
                                onValueChange={(val) => setCourse({ ...course, specialty: val })}
                                disabled={!course.category}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccione" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Ninguna</SelectItem>
                                    {course.category && categories.find(c => c.id === course.category)?.specialties.map(spec => (
                                        <SelectItem key={spec.id} value={spec.id}>{spec.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
