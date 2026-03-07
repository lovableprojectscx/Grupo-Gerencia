import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GripVertical, Plus, Trash2, Pencil, X, Save, PlayCircle, FileText } from "lucide-react";

interface CourseSyllabusTabProps {
    course: any;
    isEditing: boolean;
    openCreateModuleDialog: () => void;
    openEditModuleDialog: (module: any) => void;
    openCreateLessonDialog: (moduleId: string) => void;
    openEditLessonDialog: (lesson: any, moduleId: string) => void;
    setModuleToDelete: (id: string | null) => void;
    setLessonToDelete: (id: string | null) => void;
    handleSave: () => void;
}

export function CourseSyllabusTab({
    course,
    isEditing,
    openCreateModuleDialog,
    openEditModuleDialog,
    openCreateLessonDialog,
    openEditLessonDialog,
    setModuleToDelete,
    setLessonToDelete,
    handleSave
}: CourseSyllabusTabProps) {
    if (!isEditing) {
        return (
            <div className="flex flex-col items-center justify-center py-12 space-y-4 border-2 border-dashed rounded-xl bg-card/50">
                <div className="p-4 bg-primary/10 rounded-full">
                    <Save className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-medium">Guarda el curso primero</h3>
                <p className="text-muted-foreground text-center max-w-md">
                    Para agregar módulos y lecciones, primero necesitamos crear el curso en la base de datos.
                </p>
                <Button onClick={handleSave}>
                    <Save className="w-4 h-4 mr-2" />
                    Guardar Borrador y Continuar
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Estructura del Curso</CardTitle>
                        <CardDescription>Organiza el contenido en módulos y lecciones.</CardDescription>
                    </div>
                    <Button onClick={openCreateModuleDialog}>
                        <Plus className="w-4 h-4 mr-2" />
                        Agregar Módulo
                    </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                    {!course.modules?.length && <p className="text-muted-foreground text-center py-4">No hay módulos creados.</p>}

                    {course.modules?.map((module: any) => (
                        <Card key={module.id} className="border bg-card/50">
                            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                                <div className="font-semibold flex items-center gap-2">
                                    <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />
                                    {module.title}
                                    {module.video_url
                                        ? <Badge variant="secondary" className="text-xs font-normal text-green-700 bg-green-100 border-green-200"><PlayCircle className="w-3 h-3 mr-1" />Video asignado</Badge>
                                        : <Badge variant="outline" className="text-xs font-normal text-amber-600 border-amber-300">Sin video</Badge>
                                    }
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button variant="ghost" size="sm" onClick={() => openEditModuleDialog(module)}>Editar</Button>
                                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setModuleToDelete(module.id)}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4 pt-0 pl-10 space-y-2">
                                {module.lessons?.map((lesson: any) => (
                                    <div key={lesson.id} className="flex items-center justify-between p-2 bg-background rounded-md border text-sm">
                                        <div className="flex items-center gap-2">
                                            <FileText className="w-3 h-3 text-muted-foreground" />
                                            {lesson.title}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button variant="ghost" size="sm" onClick={() => openEditLessonDialog(lesson, module.id)}>
                                                <Pencil className="w-3 h-3 mr-1" /> Editar
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => setLessonToDelete(lesson.id)}>
                                                <X className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                                <Button variant="outline" size="sm" className="w-full mt-2 border-dashed" onClick={() => openCreateLessonDialog(module.id)}>
                                    <Plus className="w-3 h-3 mr-1" /> Agregar Lección
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
}
