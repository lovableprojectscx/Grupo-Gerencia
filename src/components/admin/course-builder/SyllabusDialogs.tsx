import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Video, FileText, Upload, Loader2, Link as LinkIcon, Trash2 } from "lucide-react";

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
                <DialogContent 
                    className="sm:max-w-[500px]"
                    onPointerDownOutside={(e) => e.preventDefault()}
                    onEscapeKeyDown={(e) => e.preventDefault()}
                >
                    <div className="w-full min-w-0 flex flex-col gap-4">
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
                            {isLessonMode && lessonType === 'pdf' && (() => {
                                const isUploadedFile = descriptorUrl && descriptorUrl.includes('.supabase.co/storage/');
                                const isExternalLink = descriptorUrl && !descriptorUrl.includes('.supabase.co/storage/');

                                return (
                                    <div className="space-y-4 pt-2">
                                        {/* 1. ARCHIVO SUBIDO STATE */}
                                        {isUploadedFile && (
                                            <div className="space-y-2">
                                                <Label>Archivo del Material</Label>
                                                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center justify-between gap-3">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="w-10 h-10 rounded-lg bg-background border border-primary/10 flex items-center justify-center shrink-0">
                                                            <FileText className="w-5 h-5 text-primary" />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-sm font-semibold truncate text-foreground">
                                                                {(() => {
                                                                    try {
                                                                        const filename = decodeURIComponent(descriptorUrl.split('/').pop() || '');
                                                                        return filename.replace(/^material-\d+\.?\d*-?/, '') || "Archivo de Material";
                                                                    } catch {
                                                                        return "Archivo de Material";
                                                                    }
                                                                })()}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground">
                                                                Almacenado correctamente
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                                                        onClick={() => setDescriptorUrl('')}
                                                        title="Eliminar archivo"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        )}

                                        {/* 2. SUBIR ARCHIVO INPUT (Shown only if not uploaded file and not external link) */}
                                        {!isUploadedFile && !isExternalLink && (
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
                                                            multiple
                                                        />
                                                        <Button 
                                                            type="button"
                                                            variant="outline" 
                                                            className="w-full justify-start border-dashed h-20 hover:bg-accent/50"
                                                            disabled={isMaterialUploading}
                                                            onClick={() => document.getElementById('materialFile')?.click()}
                                                        >
                                                            {isMaterialUploading ? (
                                                                <Loader2 className="mr-2 h-6 w-6 animate-spin text-primary" />
                                                            ) : (
                                                                <Upload className="mr-2 h-6 w-6 text-muted-foreground" />
                                                            )}
                                                            <div className="flex flex-col items-start">
                                                                <span className="font-semibold">Subir archivo PDF o Documento</span>
                                                                <span className="text-[10px] text-muted-foreground">Máx. 50MB</span>
                                                            </div>
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Separador visual si ambos están disponibles */}
                                        {!isUploadedFile && !isExternalLink && (
                                            <div className="relative flex py-1 items-center">
                                                <div className="flex-grow border-t border-muted"></div>
                                                <span className="flex-shrink mx-4 text-muted-foreground text-[10px] uppercase font-bold tracking-wider">o también</span>
                                                <div className="flex-grow border-t border-muted"></div>
                                            </div>
                                        )}

                                        {/* 3. URL EXTERNA INPUT (Shown if not uploaded file) */}
                                        {!isUploadedFile && (
                                            <div className="space-y-2">
                                                <Label htmlFor="descriptorUrl">Enlace / URL del Material</Label>
                                                <div className="relative">
                                                    <LinkIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                                    <Input
                                                        id="descriptorUrl"
                                                        className="pl-10"
                                                        value={descriptorUrl}
                                                        onChange={(e) => setDescriptorUrl(e.target.value)}
                                                        placeholder="Ej. https://drive.google.com/..."
                                                    />
                                                </div>
                                                {isExternalLink && (
                                                    <div className="flex items-center justify-between gap-2 p-2 bg-secondary/50 rounded-lg border border-border mt-1">
                                                        <p className="text-[10px] text-muted-foreground truncate flex-1">
                                                            Enlace: {descriptorUrl}
                                                        </p>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                                                            onClick={() => setDescriptorUrl('')}
                                                            title="Eliminar enlace"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
                        <DialogFooter className="pt-4 border-t">
                            <Button variant="outline" onClick={() => setIsModuleDialogOpen(false)}>Cancelar</Button>
                            <Button onClick={handleDialogSubmit} disabled={isMaterialUploading}>
                                {isMaterialUploading ? "Subiendo..." : "Guardar"}
                            </Button>
                        </DialogFooter>
                    </div>
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
