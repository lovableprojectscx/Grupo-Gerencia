import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
} from "@/components/ui/select";
import { 
    GripVertical, 
    Plus, 
    Trash2, 
    Pencil, 
    X, 
    Save, 
    PlayCircle, 
    FileText, 
    FileDown,
    ChevronUp,
    ChevronDown
} from "lucide-react";

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
    onReorderModules?: (newModules: any[]) => Promise<void>;
    onReorderLessons?: (moduleId: string, newLessons: any[]) => Promise<void>;
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
    handleSave,
    onReorderModules,
    onReorderLessons
}: CourseSyllabusTabProps) {
    const [draggedModuleIndex, setDraggedModuleIndex] = useState<number | null>(null);
    const [dragOverModuleIndex, setDragOverModuleIndex] = useState<number | null>(null);

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

    const handleMoveModule = async (fromIndex: number, toIndex: number) => {
        if (!course.modules || toIndex < 0 || toIndex >= course.modules.length || fromIndex === toIndex) return;
        const newModules = [...course.modules];
        const [moved] = newModules.splice(fromIndex, 1);
        newModules.splice(toIndex, 0, moved);
        if (onReorderModules) {
            await onReorderModules(newModules);
        }
    };

    const handleMoveLesson = async (moduleId: string, fromIndex: number, toIndex: number) => {
        const targetModule = course.modules?.find((m: any) => m.id === moduleId);
        if (!targetModule?.lessons || toIndex < 0 || toIndex >= targetModule.lessons.length || fromIndex === toIndex) return;
        const newLessons = [...targetModule.lessons];
        const [moved] = newLessons.splice(fromIndex, 1);
        newLessons.splice(toIndex, 0, moved);
        if (onReorderLessons) {
            await onReorderLessons(moduleId, newLessons);
        }
    };

    const handleDragStart = (e: React.DragEvent, index: number) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(index));
        setDraggedModuleIndex(index);
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (dragOverModuleIndex !== index) {
            setDragOverModuleIndex(index);
        }
    };

    const handleDragLeave = () => {
        setDragOverModuleIndex(null);
    };

    const handleDrop = async (e: React.DragEvent, targetIndex: number) => {
        e.preventDefault();
        setDragOverModuleIndex(null);
        if (draggedModuleIndex === null || draggedModuleIndex === targetIndex) {
            setDraggedModuleIndex(null);
            return;
        }
        await handleMoveModule(draggedModuleIndex, targetIndex);
        setDraggedModuleIndex(null);
    };

    return (
        <div className="space-y-6">
            <Card className="border-none shadow-none bg-transparent">
                <CardHeader className="flex flex-row items-center justify-between px-0 pt-0">
                    <div>
                        <CardTitle className="text-xl">Estructura del Curso</CardTitle>
                        <CardDescription>
                            Organiza el contenido en módulos, lecciones y materiales. Puedes arrastrarlos o usar los controles de posición para reordenar.
                        </CardDescription>
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

                    {course.modules?.map((module: any, index: number) => {
                        const isDragging = draggedModuleIndex === index;
                        const isOver = dragOverModuleIndex === index;

                        return (
                            <Card 
                                key={module.id} 
                                draggable
                                onDragStart={(e) => handleDragStart(e, index)}
                                onDragOver={(e) => handleDragOver(e, index)}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDrop(e, index)}
                                className={`border shadow-sm overflow-hidden bg-card transition-all duration-200 ${
                                    isDragging ? 'opacity-40 border-dashed border-primary scale-[0.99]' : ''
                                } ${
                                    isOver ? 'ring-2 ring-primary ring-offset-2 border-primary' : ''
                                }`}
                            >
                                <CardHeader className="p-4 bg-muted/30 flex flex-row items-center justify-between space-y-0 border-b">
                                    <div className="font-bold flex items-center gap-2.5 flex-wrap">
                                        {/* Drag handle */}
                                        <div 
                                            className="bg-primary/10 p-1.5 rounded text-primary cursor-grab active:cursor-grabbing hover:bg-primary/20 transition-colors"
                                            title="Arrastra para reordenar módulo"
                                        >
                                            <GripVertical className="w-4 h-4" />
                                        </div>

                                        {/* Position Selector */}
                                        <div className="flex items-center gap-1" title="Cambiar posición directa">
                                            <Select
                                                value={String(index + 1)}
                                                onValueChange={(val) => handleMoveModule(index, Number(val) - 1)}
                                            >
                                                <SelectTrigger className="h-7 w-[68px] px-2 text-xs font-semibold bg-background border-muted-foreground/20">
                                                    <span className="font-mono text-[11px]">#{index + 1}</span>
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {course.modules?.map((_: any, i: number) => (
                                                        <SelectItem key={i} value={String(i + 1)} className="text-xs">
                                                            Posición #{i + 1}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Quick Step Buttons */}
                                        <div className="flex items-center bg-background rounded border border-border/60 p-0.5">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 p-0 hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-20"
                                                disabled={index === 0}
                                                onClick={() => handleMoveModule(index, index - 1)}
                                                title="Mover arriba"
                                            >
                                                <ChevronUp className="w-3.5 h-3.5" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 p-0 hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-20"
                                                disabled={index === (course.modules?.length || 0) - 1}
                                                onClick={() => handleMoveModule(index, index + 1)}
                                                title="Mover abajo"
                                            >
                                                <ChevronDown className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>

                                        <span className="text-base font-semibold">{module.title}</span>
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
                                        {module.lessons?.map((lesson: any, lessonIdx: number) => (
                                            <div key={lesson.id} className="group flex items-center justify-between p-3 bg-background hover:bg-accent/20 rounded-lg border transition-colors shadow-sm">
                                                <div className="flex items-center gap-2.5">
                                                    {/* Lesson order controls */}
                                                    <div className="flex items-center bg-muted/40 rounded border border-border/40 p-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-5 w-5 p-0 hover:bg-muted disabled:opacity-20"
                                                            disabled={lessonIdx === 0}
                                                            onClick={() => handleMoveLesson(module.id, lessonIdx, lessonIdx - 1)}
                                                            title="Subir lección"
                                                        >
                                                            <ChevronUp className="w-3 h-3" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-5 w-5 p-0 hover:bg-muted disabled:opacity-20"
                                                            disabled={lessonIdx === (module.lessons?.length || 0) - 1}
                                                            onClick={() => handleMoveLesson(module.id, lessonIdx, lessonIdx + 1)}
                                                            title="Bajar lección"
                                                        >
                                                            <ChevronDown className="w-3 h-3" />
                                                        </Button>
                                                    </div>

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
                        );
                    })}
                </CardContent>
            </Card>
        </div>
    );
}
