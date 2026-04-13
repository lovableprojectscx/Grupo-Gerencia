import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { courseService, CourseResource } from "@/services/courseService";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, Trash2, FileText, File, Presentation, Loader2, Download, Plus } from "lucide-react";

interface Props {
    courseId: string;
}

const FILE_ICONS: Record<string, React.ReactNode> = {
    pdf: <FileText className="w-5 h-5 text-red-500" />,
    ppt: <Presentation className="w-5 h-5 text-orange-500" />,
    pptx: <Presentation className="w-5 h-5 text-orange-500" />,
    doc: <File className="w-5 h-5 text-blue-500" />,
    docx: <File className="w-5 h-5 text-blue-500" />,
};

const FILE_TYPE_LABELS: Record<string, string> = {
    pdf: "PDF",
    ppt: "PowerPoint",
    pptx: "PowerPoint",
    doc: "Word",
    docx: "Word",
    other: "Archivo",
};

const ACCEPTED_TYPES = ".pdf,.ppt,.pptx,.doc,.docx";
const MAX_SIZE_MB = 20;

function getFileType(filename: string): CourseResource['file_type'] {
    const ext = filename.split('.').pop()?.toLowerCase() ?? '';
    if (['pdf', 'ppt', 'pptx', 'doc', 'docx'].includes(ext)) return ext as CourseResource['file_type'];
    return 'other';
}

function formatBytes(bytes?: number) {
    if (!bytes) return '';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function CourseResourcesTab({ courseId }: Props) {
    const queryClient = useQueryClient();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [uploading, setUploading] = useState(false);
    const [titleInput, setTitleInput] = useState("");
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [resourceToDelete, setResourceToDelete] = useState<CourseResource | null>(null);

    const { data: resources = [], isLoading } = useQuery({
        queryKey: ["course-resources", courseId],
        queryFn: () => courseService.getResources(courseId),
        enabled: !!courseId,
    });

    const deleteMutation = useMutation({
        mutationFn: (resource: CourseResource) => {
            // Extraer el path relativo del bucket desde la URL pública
            const url = new URL(resource.file_url);
            const parts = url.pathname.split('/course-content/');
            const filePath = parts[1] ?? '';
            return courseService.deleteResource(resource.id, filePath);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["course-resources", courseId] });
            toast.success("Recurso eliminado");
            setResourceToDelete(null);
        },
        onError: () => toast.error("Error al eliminar el recurso"),
    });

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > MAX_SIZE_MB * 1024 * 1024) {
            toast.error(`El archivo supera el límite de ${MAX_SIZE_MB} MB`);
            return;
        }
        setPendingFile(file);
        setTitleInput(file.name.replace(/\.[^/.]+$/, "")); // nombre sin extensión
        setIsAddDialogOpen(true);
        // Reset input para permitir seleccionar el mismo archivo
        e.target.value = "";
    };

    const handleUploadConfirm = async () => {
        if (!pendingFile || !titleInput.trim()) return;
        setUploading(true);
        try {
            const ext = pendingFile.name.split('.').pop() ?? 'bin';
            const storagePath = `resources/${courseId}/${Date.now()}.${ext}`;

            const { error: uploadError } = await supabase.storage
                .from('course-content')
                .upload(storagePath, pendingFile, { cacheControl: '3600', upsert: false });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('course-content')
                .getPublicUrl(storagePath);

            await courseService.createResource({
                course_id: courseId,
                title: titleInput.trim(),
                file_url: publicUrl,
                file_name: pendingFile.name,
                file_type: getFileType(pendingFile.name),
                file_size: pendingFile.size,
                order: resources.length,
            });

            queryClient.invalidateQueries({ queryKey: ["course-resources", courseId] });
            toast.success("Recurso subido correctamente");
            setIsAddDialogOpen(false);
            setPendingFile(null);
            setTitleInput("");
        } catch (err) {
            console.error(err);
            toast.error("Error al subir el archivo");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-primary" />
                        Recursos Descargables
                    </CardTitle>
                    <CardDescription>
                        Sube materiales de apoyo (PDF, PowerPoint, Word) que los estudiantes podrán descargar desde el aula virtual y la página del curso.
                        Máximo {MAX_SIZE_MB} MB por archivo.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Upload button */}
                    <div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept={ACCEPTED_TYPES}
                            className="hidden"
                            onChange={handleFileSelect}
                        />
                        <Button
                            variant="outline"
                            className="gap-2"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                        >
                            <Plus className="w-4 h-4" />
                            Agregar Recurso
                        </Button>
                    </div>

                    {/* Resource list */}
                    {isLoading ? (
                        <div className="flex items-center gap-2 text-muted-foreground py-4">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Cargando recursos...
                        </div>
                    ) : resources.length === 0 ? (
                        <div className="border-2 border-dashed rounded-xl p-10 text-center text-muted-foreground">
                            <Upload className="w-8 h-8 mx-auto mb-3 opacity-40" />
                            <p className="font-medium">Sin recursos aún</p>
                            <p className="text-sm mt-1">Sube el primer PDF, PPT o Word para este curso.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {resources.map((resource) => (
                                <div
                                    key={resource.id}
                                    className="flex items-center gap-3 p-3 rounded-lg border border-border bg-secondary/30 hover:bg-secondary/50 transition-colors"
                                >
                                    <div className="shrink-0">
                                        {FILE_ICONS[resource.file_type] ?? <File className="w-5 h-5 text-muted-foreground" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm text-foreground truncate">{resource.title}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <Badge variant="secondary" className="text-[10px] uppercase tracking-wider px-1.5 py-0">
                                                {FILE_TYPE_LABELS[resource.file_type] ?? 'Archivo'}
                                            </Badge>
                                            {resource.file_size && (
                                                <span className="text-xs text-muted-foreground">{formatBytes(resource.file_size)}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                                            asChild
                                        >
                                            <a href={resource.file_url} target="_blank" rel="noopener noreferrer" download={resource.file_name}>
                                                <Download className="w-4 h-4" />
                                            </a>
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                            onClick={() => setResourceToDelete(resource)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Dialog: confirmar título antes de subir */}
            <Dialog open={isAddDialogOpen} onOpenChange={(v) => { if (!uploading) { setIsAddDialogOpen(v); if (!v) setPendingFile(null); } }}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Agregar recurso</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        {pendingFile && (
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border">
                                {FILE_ICONS[getFileType(pendingFile.name)] ?? <File className="w-5 h-5 text-muted-foreground" />}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{pendingFile.name}</p>
                                    <p className="text-xs text-muted-foreground">{formatBytes(pendingFile.size)}</p>
                                </div>
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="resource-title">Nombre visible para los estudiantes</Label>
                            <Input
                                id="resource-title"
                                value={titleInput}
                                onChange={(e) => setTitleInput(e.target.value)}
                                placeholder="Ej: Guía de estudio Módulo 1"
                                disabled={uploading}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setIsAddDialogOpen(false); setPendingFile(null); }} disabled={uploading}>
                            Cancelar
                        </Button>
                        <Button onClick={handleUploadConfirm} disabled={uploading || !titleInput.trim()}>
                            {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                            {uploading ? "Subiendo..." : "Subir recurso"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Alert: confirmar eliminación */}
            <AlertDialog open={!!resourceToDelete} onOpenChange={(v) => { if (!v) setResourceToDelete(null); }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar recurso?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Se eliminará "<strong>{resourceToDelete?.title}</strong>" y el archivo del storage. Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive hover:bg-destructive/90"
                            onClick={() => resourceToDelete && deleteMutation.mutate(resourceToDelete)}
                        >
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
