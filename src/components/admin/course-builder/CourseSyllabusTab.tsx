import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GripVertical, Plus, Trash2, Pencil, X, Save, PlayCircle, FileText, FileDown } from "lucide-react";

interface CourseSyllabusTabProps {
    course: any;
    isEditing: boolean;
    openCreateModuleDialog: () => void;
    openEditModuleDialog: (module: any) => void;
    openCreateLessonDialog: (moduleId: string) => void;
    openCreateMaterialDialog: (moduleId: string) => void;
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
    openCreateMaterialDialog,
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
            <Card className="border-none shadow-none bg-transparent">
                <CardHeader className="flex flex-row items-center justify-between px-0 pt-0">
                    <div>
                        <CardTitle className="text-xl">Estructura del Curso</CardTitle>
                        <CardDescription>Organiza el contenido en módulos, lecciones y materiales.</CardDescription>
                    </div>
                    <Button onClick={openCreateModuleDialog} className="shadow-sm">
                        <Plus className="w-4 h-4 mr-2" />
                        Agregar Módulo
                    </Button>
                </CardHeader>
                <CardContent className="space-y-6 px-0">
                    {!course.modules?.length && (
                        <div className="flex flex-col items-center justify-center py-12 border rounded-xl bg-card/30 border-dashed">
                            <p className="text-muted-foreground italic">No hay módulos creados aún.</p>
                        </div>
                    )}

                    {course.modules?.map((module: any) => (
                        <Card key={module.id} className="border shadow-sm overflow-hidden bg-card">
                            <CardHeader className="p-4 bg-muted/30 flex flex-row items-center justify-between space-y-0 border-b">
                                <div className="font-bold flex items-center gap-3">
                                    <div className="bg-primary/10 p-1.5 rounded text-primary">
                                        <GripVertical className="w-4 h-4 cursor-move" />
                                    </div>
                                    <span className="text-lg">{module.title}</span>
                                    {module.video_url
                                        ? <Badge variant="secondary" className="text-[10px] font-medium text-emerald-700 bg-emerald-50 border-emerald-100 uppercase tracking-wider"><PlayCircle className="w-3 h-3 mr-1" />Video Introductorio</Badge>
                                        : <Badge variant="outline" className="text-[10px] font-medium text-slate-400 border-slate-200 uppercase tracking-wider">Sin video principal</Badge>
                                    }
                                </div>
                                <div className="flex items-center gap-1">
                                    <Button variant="ghost" size="sm" onClick={() => openEditModuleDialog(module)} className="h-8">
                                        <Pencil className="w-3.5 h-3.5 mr-1.5" />
                                        Editar
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setModuleToDelete(module.id)}>
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4 space-y-3">
                                <div className="space-y-2">
                                    {module.lessons?.map((lesson: any) => (
                                        <div key={lesson.id} className="group flex items-center justify-between p-3 bg-background hover:bg-accent/20 rounded-lg border transition-colors shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-md ${lesson.type === 'pdf' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'}`}>
                                                    {lesson.type === 'pdf' ? <FileText className="w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-sm">{lesson.title}</span>
                                                    <span className="text-[10px] text-muted-foreground uppercase font-bold">
                                                        {lesson.type === 'pdf' ? 'Material Descargable' : 'Lección de Video'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="sm" onClick={() => openEditLessonDialog(lesson, module.id)} className="h-8">
                                                    <Pencil className="w-3 h-3 mr-1.5" /> Editar
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setLessonToDelete(lesson.id)}>
                                                    <X className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="grid grid-cols-2 gap-3 pt-2 mt-2 border-t border-dashed">
                                    <Button variant="outline" size="sm" className="w-full border-dashed h-9 bg-primary/5 hover:bg-primary/10 hover:border-primary text-primary border-primary/20" onClick={() => openCreateLessonDialog(module.id)}>
                                        <PlayCircle className="w-3.5 h-3.5 mr-2" /> Agregar Lección
                                    </Button>
                                    <Button variant="outline" size="sm" className="w-full border-dashed h-9 bg-orange-50/50 hover:bg-orange-50 hover:border-orange-300 text-orange-700 border-orange-100" onClick={() => openCreateMaterialDialog(module.id)}>
                                        <FileDown className="w-3.5 h-3.5 mr-2" /> Agregar Material
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
}
