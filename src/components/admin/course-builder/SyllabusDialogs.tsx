import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Video, FileText, Upload, Loader2, Link as LinkIcon } from "lucide-react";

interface SyllabusDialogsProps {
    isModuleDialogOpen: boolean;
    setIsModuleDialogOpen: (open: boolean) => void;
    moduleDialogMode: 'create' | 'edit' | 'create-lesson' | 'edit-lesson';
    descriptorInput: string;
    setDescriptorInput: (val: string) => void;
    descriptorUrl: string;
    setDescriptorUrl: (val: string) => void;
    descriptorDuration: string;
    setDescriptorDuration: (val: string) => void;
    lessonType: 'video' | 'pdf';
    setLessonType: (type: 'video' | 'pdf') => void;
    isMaterialUploading: boolean;
    handleMaterialUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleDialogSubmit: () => void;

    moduleToDelete: string | null;
    setModuleToDelete: (id: string | null) => void;
    handleDeleteModule: () => void;

    lessonToDelete: string | null;
    setLessonToDelete: (id: string | null) => void;
    handleDeleteLesson: () => void;
}

export function SyllabusDialogs({
    isModuleDialogOpen,
    setIsModuleDialogOpen,
    moduleDialogMode,
    descriptorInput,
    setDescriptorInput,
    descriptorUrl,
    setDescriptorUrl,
    descriptorDuration,
    setDescriptorDuration,
    lessonType,
    setLessonType,
    isMaterialUploading,
    handleMaterialUpload,
    handleDialogSubmit,
    moduleToDelete,
    setModuleToDelete,
    handleDeleteModule,
    lessonToDelete,
    setLessonToDelete,
    handleDeleteLesson
}: SyllabusDialogsProps) {
    const isLessonMode = moduleDialogMode === 'create-lesson' || moduleDialogMode === 'edit-lesson';

    return (
        <>
            <Dialog open={isModuleDialogOpen} onOpenChange={setIsModuleDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {moduleDialogMode === 'create' && "Nuevo Módulo"}
                            {moduleDialogMode === 'edit' && "Editar Módulo"}
                            {moduleDialogMode === 'create-lesson' && (lessonType === 'pdf' ? "Nuevo Material" : "Nueva Lección")}
                            {moduleDialogMode === 'edit-lesson' && (lessonType === 'pdf' ? "Editar Material" : "Editar Lección")}
                        </DialogTitle>
                        <DialogDescription>
                            {!isLessonMode
                                ? "Define el nombre del módulo para estructurar tu curso."
                                : "Ingresa los detalles del contenido para tus alumnos."}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-2 space-y-4">
                        {/* Lesson Type Selector */}
                        {isLessonMode && (
                            <div className="space-y-3">
                                <Label>Tipo de Contenido</Label>
                                <RadioGroup 
                                    value={lessonType} 
                                    onValueChange={(val) => setLessonType(val as 'video' | 'pdf')}
                                    className="grid grid-cols-2 gap-4"
                                >
                                    <div>
                                        <RadioGroupItem value="video" id="video" className="peer sr-only" />
                                        <Label
                                            htmlFor="video"
                                            className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer h-full"
                                        >
                                            <Video className="mb-2 h-6 w-6" />
                                            <span className="text-xs font-medium">Video</span>
                                        </Label>
                                    </div>
                                    <div>
                                        <RadioGroupItem value="pdf" id="pdf" className="peer sr-only" />
                                        <Label
                                            htmlFor="pdf"
                                            className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer h-full"
                                        >
                                            <FileText className="mb-2 h-6 w-6" />
                                            <span className="text-xs font-medium">Material</span>
                                        </Label>
                                    </div>
                                </RadioGroup>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="descriptorName">Nombre</Label>
                            <Input
                                id="descriptorName"
                                value={descriptorInput}
                                onChange={(e) => setDescriptorInput(e.target.value)}
                                placeholder="Ej. Introducción al curso..."
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleDialogSubmit();
                                }}
                            />
                        </div>

                        {/* Module or Video Lesson fields */}
                        {(!isLessonMode || lessonType === 'video') && (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="descriptorUrl">URL del Video (YouTube)</Label>
                                    <div className="relative">
                                        <Video className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="descriptorUrl"
                                            className="pl-10"
                                            value={descriptorUrl}
                                            onChange={(e) => setDescriptorUrl(e.target.value)}
                                            placeholder="https://youtube.com/watch?v=..."
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="descriptorDuration">Duración</Label>
                                    <Input
                                        id="descriptorDuration"
                                        value={descriptorDuration}
                                        onChange={(e) => setDescriptorDuration(e.target.value)}
                                        placeholder="Ej. 10 min o 1:30 hs"
                                    />
                                </div>
                            </>
                        )}

                        {/* Material specific fields */}
                        {isLessonMode && lessonType === 'pdf' && (
                            <div className="space-y-4 pt-2">
                                <div className="space-y-2">
                                    <Label>Archivo del Material</Label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <Input
                                                type="file"
                                                id="materialFile"
                                                className="hidden"
                                                onChange={handleMaterialUpload}
                                                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx"
                                            />
                                            <Button 
                                                type="button"
                                                variant="outline" 
                                                className="w-full justify-start border-dashed h-20"
                                                disabled={isMaterialUploading}
                                                onClick={() => document.getElementById('materialFile')?.click()}
                                            >
                                                {isMaterialUploading ? (
                                                    <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                                                ) : (
                                                    <Upload className="mr-2 h-6 w-6" />
                                                )}
                                                <div className="flex flex-col items-start">
                                                    <span className="font-semibold">{descriptorUrl ? "Cambiar archivo" : "Subir PDF o Documento"}</span>
                                                    <span className="text-[10px] text-muted-foreground">Máx. 50MB</span>
                                                </div>
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="descriptorUrl">O URL del Material</Label>
                                    <div className="relative">
                                        <LinkIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="descriptorUrl"
                                            className="pl-10"
                                            value={descriptorUrl}
                                            onChange={(e) => setDescriptorUrl(e.target.value)}
                                            placeholder="https://instrucciones.com/material.pdf"
                                        />
                                    </div>
                                    {descriptorUrl && (
                                        <p className="text-[10px] text-muted-foreground truncate max-w-full">
                                            Actual: {descriptorUrl}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                    <DialogFooter className="pt-4 border-t">
                        <Button variant="outline" onClick={() => setIsModuleDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleDialogSubmit} disabled={isMaterialUploading}>
                            {isMaterialUploading ? "Subiendo..." : "Guardar"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!moduleToDelete} onOpenChange={(open) => !open && setModuleToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar este módulo?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción eliminará el módulo y todas sus lecciones. No se puede deshacer.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteModule} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Eliminar Módulo
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={!!lessonToDelete} onOpenChange={(open) => !open && setLessonToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar lección?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción eliminará la lección permanentemente.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteLesson} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Eliminar Lección
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
