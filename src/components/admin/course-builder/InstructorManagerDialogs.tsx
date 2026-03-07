import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, Trash2 } from "lucide-react";

interface InstructorManagerDialogsProps {
    isInstructorDialogOpen: boolean;
    setIsInstructorDialogOpen: (open: boolean) => void;
    newInstructor: any;
    setNewInstructor: (instructor: any) => void;
    handleInstructorUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    instructorUploading: boolean;
    handleCreateInstructor: () => void;

    isInstructorManagerOpen: boolean;
    setIsInstructorManagerOpen: (open: boolean) => void;
    instructors: any[];
    handleDeleteInstructor: (id: string) => void;

    instructorToDelete: string | null;
    setInstructorToDelete: (id: string | null) => void;
    confirmDeleteInstructor: () => void;
}

export function InstructorManagerDialogs({
    isInstructorDialogOpen,
    setIsInstructorDialogOpen,
    newInstructor,
    setNewInstructor,
    handleInstructorUpload,
    instructorUploading,
    handleCreateInstructor,
    isInstructorManagerOpen,
    setIsInstructorManagerOpen,
    instructors,
    handleDeleteInstructor,
    instructorToDelete,
    setInstructorToDelete,
    confirmDeleteInstructor
}: InstructorManagerDialogsProps) {
    return (
        <>
            {/* Create Instructor Dialog */}
            <Dialog open={isInstructorDialogOpen} onOpenChange={setIsInstructorDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Nuevo Instructor</DialogTitle>
                        <DialogDescription>
                            Registra un nuevo instructor para asignar a tus cursos.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="flex justify-center">
                            <div className="relative w-24 h-24 rounded-full overflow-hidden bg-secondary border-2 border-dashed border-muted-foreground/30 flex items-center justify-center group cursor-pointer">
                                {newInstructor.photo_url ? (
                                    <img src={newInstructor.photo_url} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <Upload className="w-8 h-8 text-muted-foreground" />
                                )}
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    onChange={handleInstructorUpload}
                                    disabled={instructorUploading}
                                />
                                {instructorUploading && (
                                    <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
                                        <Loader2 className="w-6 h-6 animate-spin" />
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Nombre Completo</Label>
                            <Input
                                placeholder="Ej. Dr. Juan Pérez"
                                value={newInstructor.name}
                                onChange={(e) => setNewInstructor({ ...newInstructor, name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Título / Cargo</Label>
                            <Input
                                placeholder="Ej. Especialista en Gestión Pública"
                                value={newInstructor.title}
                                onChange={(e) => setNewInstructor({ ...newInstructor, title: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                        <Button variant="outline" onClick={() => setIsInstructorDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleCreateInstructor} disabled={instructorUploading}>
                            {instructorUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Crear Instructor"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Manage Instructors Dialog */}
            <Dialog open={isInstructorManagerOpen} onOpenChange={setIsInstructorManagerOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Gestionar Instructores</DialogTitle>
                        <DialogDescription>
                            Elimina instructores que no necesitas. Esta acción no se puede deshacer.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[300px] overflow-y-auto space-y-2 py-2">
                        {instructors.length === 0 ? (
                            <p className="text-center text-muted-foreground py-4">No hay instructores registrados.</p>
                        ) : (
                            instructors.map((instructor) => (
                                <div key={instructor.id} className="flex items-center justify-between p-2 border rounded-md">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-secondary overflow-hidden">
                                            {instructor.avatar_url ? (
                                                <img src={instructor.avatar_url} alt={instructor.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-xs font-bold">
                                                    {instructor.name.charAt(0)}
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">{instructor.name}</p>
                                            <p className="text-xs text-muted-foreground">{instructor.title}</p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                                        onClick={() => handleDeleteInstructor(instructor.id)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsInstructorManagerOpen(false)}>Cerrar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!instructorToDelete} onOpenChange={(open) => !open && setInstructorToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás completamente seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción no se puede deshacer. Se eliminará permanentemente al instructor.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeleteInstructor} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
