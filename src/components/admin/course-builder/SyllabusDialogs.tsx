import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
    handleDialogSubmit,
    moduleToDelete,
    setModuleToDelete,
    handleDeleteModule,
    lessonToDelete,
    setLessonToDelete,
    handleDeleteLesson
}: SyllabusDialogsProps) {
    return (
        <>
            <Dialog open={isModuleDialogOpen} onOpenChange={setIsModuleDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {moduleDialogMode === 'create' && "Nuevo Módulo"}
                            {moduleDialogMode === 'edit' && "Editar Módulo"}
                            {moduleDialogMode === 'create-lesson' && "Nueva Lección"}
                            {moduleDialogMode === 'edit-lesson' && "Editar Lección"}
                        </DialogTitle>
                        <DialogDescription>
                            {(moduleDialogMode === 'create' || moduleDialogMode === 'edit')
                                ? "Define el nombre del módulo para estructurar tu curso."
                                : "Ingresa el título de la lección."}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <div className="space-y-2">
                            <Label htmlFor="descriptorName">Nombre</Label>
                            <Input
                                id="descriptorName"
                                value={descriptorInput}
                                onChange={(e) => setDescriptorInput(e.target.value)}
                                placeholder="Ej. Título..."
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleDialogSubmit();
                                }}
                            />
                        </div>

                        {(moduleDialogMode === 'create' || moduleDialogMode === 'edit') && (
                            <>
                                <div className="space-y-2 mt-4">
                                    <Label htmlFor="descriptorUrl">URL del Video (YouTube)</Label>
                                    <Input
                                        id="descriptorUrl"
                                        value={descriptorUrl}
                                        onChange={(e) => setDescriptorUrl(e.target.value)}
                                        placeholder="https://youtube.com/..."
                                    />
                                </div>
                                <div className="space-y-2 mt-4">
                                    <Label htmlFor="descriptorDuration">Duración</Label>
                                    <Input
                                        id="descriptorDuration"
                                        value={descriptorDuration}
                                        onChange={(e) => setDescriptorDuration(e.target.value)}
                                        placeholder="Ej. 10 min"
                                    />
                                </div>
                            </>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsModuleDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleDialogSubmit}>Guardar</Button>
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
