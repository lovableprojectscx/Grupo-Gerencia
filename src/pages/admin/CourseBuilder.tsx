
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
    ChevronLeft,
    Save,
    Plus,
    Trash2,
    GripVertical,
    Video,
    FileText,
    Image as ImageIcon,
    X,
    XCircle,
    AlertCircle,
    Pencil
} from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { CertificateBuilder } from "@/components/admin/CertificateBuilder";
import { CourseGeneralTab } from "@/components/admin/course-builder/CourseGeneralTab";
import { CourseSyllabusTab } from "@/components/admin/course-builder/CourseSyllabusTab";
import { CourseSettingsTab } from "@/components/admin/course-builder/CourseSettingsTab";
import { SyllabusDialogs } from "@/components/admin/course-builder/SyllabusDialogs";
import { InstructorManagerDialogs } from "@/components/admin/course-builder/InstructorManagerDialogs";
import { CategoryManagerDialogs } from "@/components/admin/course-builder/CategoryManagerDialogs";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useAdminCourses } from "@/hooks/useAdminCourses";
import { courseService } from "@/services/courseService";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Loader2, Upload } from "lucide-react";
import imageCompression from 'browser-image-compression';

export default function CourseBuilder() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditing = !!id && id !== 'new';

    const [activeTab, setActiveTab] = useState("general");
    const queryClient = useQueryClient();

    // Local state for the course being edited
    const [course, setCourse] = useState<any>({
        title: "",
        subtitle: "",
        description: "",
        price: 0,
        category: "health",
        level: "none",
        published: false,
        specialty: "",
        modality: "async",
        instructor_id: "",
        modules: []
    });

    const [uploading, setUploading] = useState(false);

    // Instructor States
    const [instructors, setInstructors] = useState<any[]>([]);
    const [isInstructorDialogOpen, setIsInstructorDialogOpen] = useState(false);
    const [isInstructorManagerOpen, setIsInstructorManagerOpen] = useState(false);
    const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
    const [instructorToDelete, setInstructorToDelete] = useState<string | null>(null);
    const [newInstructor, setNewInstructor] = useState({ name: "", title: "", photo_url: "" });
    const [instructorUploading, setInstructorUploading] = useState(false);

    useEffect(() => {
        loadInstructors();
    }, []);

    const loadInstructors = async () => {
        try {
            const data = await courseService.getInstructors();
            setInstructors(data || []);
        } catch (error) {
            console.error("Error loading instructors", error);
        }
    };

    // Dialog States
    const [isModuleDialogOpen, setIsModuleDialogOpen] = useState(false);
    const [moduleDialogMode, setModuleDialogMode] = useState<'create' | 'edit' | 'create-lesson' | 'edit-lesson'>('create');
    const [currentModuleId, setCurrentModuleId] = useState<string | null>(null);
    const [currentLessonId, setCurrentLessonId] = useState<string | null>(null);
    const [descriptorInput, setDescriptorInput] = useState(""); // Title
    const [descriptorUrl, setDescriptorUrl] = useState(""); // Content URL
    const [descriptorDuration, setDescriptorDuration] = useState(""); // Duration



    const openCreateModuleDialog = () => {
        setModuleDialogMode('create');
        setDescriptorInput("");
        setDescriptorUrl("");
        setDescriptorDuration("");
        setCurrentModuleId(null);
        setIsModuleDialogOpen(true);
    };

    const openEditModuleDialog = (module: any) => {
        setModuleDialogMode('edit');
        setDescriptorInput(module.title);
        setDescriptorUrl(module.video_url || "");
        setDescriptorDuration(module.duration || "");
        setCurrentModuleId(module.id);
        setIsModuleDialogOpen(true);
    };

    const openCreateLessonDialog = (moduleId: string) => {
        setModuleDialogMode('create-lesson');
        setDescriptorInput("");
        setDescriptorUrl("");
        setDescriptorDuration("");
        setCurrentModuleId(moduleId);
        setIsModuleDialogOpen(true);
    }

    const openEditLessonDialog = (lesson: any, moduleId: string) => { // moduleId kept for reference if needed
        setModuleDialogMode('edit-lesson');
        setDescriptorInput(lesson.title);
        setDescriptorUrl("");
        setDescriptorDuration("");
        setCurrentLessonId(lesson.id);
        setIsModuleDialogOpen(true);
    }

    const handleDialogSubmit = async () => {
        if (!descriptorInput.trim()) return;

        try {
            if (moduleDialogMode === 'create') {
                await courseService.createModule({
                    course_id: id!,
                    title: descriptorInput,
                    video_url: descriptorUrl || undefined,
                    duration: descriptorDuration || undefined,
                    order: (course.modules?.length || 0) + 1
                });
                toast.success("Módulo agregado");
            } else if (moduleDialogMode === 'edit') {
                if (currentModuleId) {
                    await courseService.updateModule(currentModuleId, {
                        title: descriptorInput,
                        video_url: descriptorUrl || undefined,
                        duration: descriptorDuration || undefined,
                    });
                    toast.success("Módulo actualizado");
                }
            } else if (moduleDialogMode === 'create-lesson') {
                if (currentModuleId) {
                    await courseService.createLesson({
                        module_id: currentModuleId,
                        title: descriptorInput,
                        type: 'video',
                        order: (course.modules?.find((m: any) => m.id === currentModuleId)?.lessons?.length || 0) + 1,
                        is_free_preview: false
                    });
                    toast.success("Lección agregada");
                }
            } else if (moduleDialogMode === 'edit-lesson') {
                if (currentLessonId) {
                    await courseService.updateLesson(currentLessonId, {
                        title: descriptorInput,
                    });
                    toast.success("Lección actualizada");
                }
            }

            queryClient.invalidateQueries({ queryKey: ["course", id] });
            setIsModuleDialogOpen(false);
        } catch (error) {
            console.error(error);
            toast.error("Error al guardar");
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            let fileToUpload = file;
            if (file.type.startsWith('image/')) {
                toast.loading("Optimizando imagen de portada...", { id: "compressCoverToast" });
                try {
                    fileToUpload = await imageCompression(file, {
                        maxSizeMB: 0.5, // 500KB para portadas
                        maxWidthOrHeight: 1280,
                        useWebWorker: true,
                    });
                } catch (compError) {
                    console.warn("Fallo al comprimir, usando original", compError);
                } finally {
                    toast.dismiss("compressCoverToast");
                }
            }

            const fileExt = fileToUpload.name.split('.').pop() || 'jpg';
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `covers/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('course-content')
                .upload(filePath, fileToUpload);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage
                .from('course-content')
                .getPublicUrl(filePath);

            setCourse({ ...course, image_url: data.publicUrl });
            toast.success("Imagen subida correctamente");
        } catch (error) {
            console.error(error);
            toast.error("Error al subir la imagen");
        } finally {
            setUploading(false);
        }
    };

    const handleInstructorUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setInstructorUploading(true);
        try {
            let fileToUpload = file;
            if (file.type.startsWith('image/')) {
                toast.loading("Optimizando foto...", { id: "compressAvatarToast" });
                try {
                    fileToUpload = await imageCompression(file, {
                        maxSizeMB: 0.2, // 200KB para avatares
                        maxWidthOrHeight: 500, // Avatares pequeños
                        useWebWorker: true,
                    });
                } catch (compError) {
                    console.warn("Fallo al comprimir, usando original", compError);
                } finally {
                    toast.dismiss("compressAvatarToast");
                }
            }

            const fileExt = fileToUpload.name.split('.').pop() || 'jpg';
            const fileName = `instructor-${Math.random()}.${fileExt}`;
            const filePath = `instructors/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('course-content')
                .upload(filePath, fileToUpload);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage
                .from('course-content')
                .getPublicUrl(filePath);

            setNewInstructor({ ...newInstructor, photo_url: data.publicUrl });
            toast.success("Foto subida");
        } catch (error) {
            console.error(error);
            toast.error("Error al subir foto");
        } finally {
            setInstructorUploading(false);
        }
    };

    const handleCreateInstructor = async () => {
        if (!newInstructor.name || !newInstructor.title) {
            toast.error("Nombre y título son requeridos");
            return;
        }

        try {
            const created = await courseService.createInstructor({
                name: newInstructor.name,
                title: newInstructor.title,
                avatar_url: newInstructor.photo_url
            });
            setInstructors([...instructors, created]);
            setCourse({ ...course, instructor_id: created.id }); // Auto-select
            setIsInstructorDialogOpen(false);
            setNewInstructor({ name: "", title: "", photo_url: "" });
            toast.success("Instructor creado");
        } catch (error) {
            console.error(error);
            toast.error("Error al crear instructor");
        }
    };

    const handleDeleteInstructor = (id: string) => {
        setInstructorToDelete(id);
    };

    const [moduleToDelete, setModuleToDelete] = useState<string | null>(null);
    const [lessonToDelete, setLessonToDelete] = useState<string | null>(null);

    const confirmDeleteInstructor = async () => {
        if (!instructorToDelete) return;
        try {
            await courseService.deleteInstructor(instructorToDelete);
            toast.success("Instructor eliminado");
            loadInstructors();
            setInstructorToDelete(null);
        } catch (error) {
            toast.error("Error al eliminar instructor");
        }
    };

    const handleDeleteModule = async () => {
        if (!moduleToDelete) return;
        try {
            await courseService.deleteModule(moduleToDelete);
            queryClient.invalidateQueries({ queryKey: ["course", id] });
            toast.success("Módulo eliminado");
            setModuleToDelete(null);
        } catch (error) {
            toast.error("Error al eliminar módulo");
        }
    };

    const handleDeleteLesson = async () => {
        if (!lessonToDelete) return;
        try {
            await courseService.deleteLesson(lessonToDelete);
            queryClient.invalidateQueries({ queryKey: ["course", id] });
            toast.success("Lección eliminada");
            setLessonToDelete(null);
        } catch (error) {
            toast.error("Error al eliminar lección");
        }
    };

    // Fetch course data if editing
    const { data: fetchedCourse, isLoading } = useQuery({
        queryKey: ["course", id],
        queryFn: () => courseService.getById(id!),
        enabled: isEditing,
    });

    useEffect(() => {
        if (fetchedCourse) {
            setCourse(fetchedCourse);
        }
    }, [fetchedCourse]);

    const { createCourse, updateCourse } = useAdminCourses();

    const validateCourse = () => {
        if (!course.title?.trim()) {
            toast.error("El curso debe tener un título", { icon: <AlertCircle className="w-4 h-4 text-destructive" /> });
            setActiveTab("general");
            return false;
        }
        if (!course.description?.trim()) {
            toast.error("El curso debe tener una descripción", { icon: <AlertCircle className="w-4 h-4 text-destructive" /> });
            setActiveTab("general");
            return false;
        }
        if (course.price < 0) {
            toast.error("El precio no puede ser negativo", { icon: <AlertCircle className="w-4 h-4 text-destructive" /> });
            setActiveTab("settings");
            return false;
        }
        if (!course.category) {
            toast.error("Selecciona una categoría", { icon: <AlertCircle className="w-4 h-4 text-destructive" /> });
            setActiveTab("general");
            return false;
        }

        // Safeguard: Recorded courses MUST have content
        // Safeguard: Recorded courses MUST have content ONLY IF PUBLISHED
        if (course.published && course.modality === 'async') {
            const hasLessons = course.modules?.some((m: any) => m.lessons?.length > 0);
            if (!hasLessons) {
                toast.error("Para PUBLICAR un curso GRABADO se requieren lecciones. Agrega contenido o déjalo como borrador.", {
                    duration: 5000,
                    icon: <AlertCircle className="w-5 h-5 text-destructive" />
                });
                setActiveTab("syllabus");
                return false;
            }
        }

        return true;
    };

    const handleSave = async () => {
        if (!validateCourse()) return;

        try {
            // Remove 'modules', 'instructor' and any other non-db fields from the payload
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            // Remove 'modules', 'instructor' and any other non-db fields from the payload
            const { modules, instructor, enrollments, students, ...courseData } = course;

            // --- CRITICAL FIX: Clean Metadata based on Modality ---
            // If switching to 'async', remove live-specific metadata.
            // KEEP it for 'live' AND 'hybrid'.
            if (courseData.modality === 'async' && courseData.metadata) {
                courseData.metadata = courseData.metadata.filter((m: any) =>
                    !['live_url', 'live_date', 'certificates_enabled'].includes(m.key)
                );
            }

            if (isEditing) {
                await updateCourse({ id: id!, updates: courseData });
            } else {
                const newCourse = await createCourse(courseData);
                navigate(`/admin/courses/${newCourse.id}`);
                // Ideally replace URL without reload
            }

        } catch (error) {
            console.error(error); // Error toast handled in hook
        }
    };

    // --- Initial simple implementation of module/lesson CRUD logic within this component ---
    // In a full refactor, this should be broken down into sub-components 
    // (CourseModulesList, LessonEditor, etc.) using the service. 
    // For now, let's keep it simple to get the skeleton working.

    // NOTE: For MVP, saving the structure (modules/lessons) might need 
    // separate API calls or a "save all" logic. 
    // The current service `update` only updates the course fields.
    // We will rely on sub-components for adding modules in the next iteration 
    // if this file gets too complex.

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link to="/admin/courses">
                        <Button variant="outline" size="icon">
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            {isEditing ? "Editar Curso" : "Nuevo Curso"}
                        </h1>
                        <p className="text-muted-foreground">
                            {isEditing ? `Editando: ${course.title || '...'}` : "Crea un nuevo curso desde cero"}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => navigate("/admin/courses")}>Cancelar</Button>
                    <Button onClick={handleSave}>
                        <Save className="w-4 h-4 mr-2" />
                        {isEditing ? "Guardar Cambios" : "Crear Curso"}
                    </Button>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="bg-card border border-border p-1">
                    <TabsTrigger value="general" className="px-6">Información General</TabsTrigger>
                    <TabsTrigger value="syllabus" className="px-6">Plan de Estudios</TabsTrigger>
                    <TabsTrigger value="certificate" className="px-6">Diseño Certificado</TabsTrigger>
                    <TabsTrigger value="settings" className="px-6">Configuración</TabsTrigger>
                </TabsList>

                {/* General Tab */}
                <TabsContent value="general">
                    <CourseGeneralTab
                        course={course}
                        setCourse={setCourse}
                        instructors={instructors}
                        setIsInstructorManagerOpen={setIsInstructorManagerOpen}
                        setIsInstructorDialogOpen={setIsInstructorDialogOpen}
                        setIsCategoryManagerOpen={setIsCategoryManagerOpen}
                        handleImageUpload={handleImageUpload}
                        uploading={uploading}
                    />
                </TabsContent>

                {/* Syllabus Tab */}
                <TabsContent value="syllabus" className="space-y-6">
                    <CourseSyllabusTab
                        course={course}
                        isEditing={isEditing}
                        openCreateModuleDialog={openCreateModuleDialog}
                        openEditModuleDialog={openEditModuleDialog}
                        openCreateLessonDialog={openCreateLessonDialog}
                        openEditLessonDialog={openEditLessonDialog}
                        setModuleToDelete={setModuleToDelete}
                        setLessonToDelete={setLessonToDelete}
                        handleSave={handleSave}
                    />
                </TabsContent>

                {/* Certificate Tab */}
                <TabsContent value="certificate">
                    {isEditing ? (
                        <CertificateBuilder
                            courseId={id}
                            defaultMetadata={course.metadata}
                            template={course.certificate_template}
                            onTemplateChange={(template) => setCourse(prev => ({ ...prev, certificate_template: template }))}
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 space-y-4 border-2 border-dashed rounded-xl bg-card/50">
                            <div className="p-4 bg-primary/10 rounded-full">
                                <Save className="w-8 h-8 text-primary" />
                            </div>
                            <h3 className="text-lg font-medium">Configura el certificado luego</h3>
                            <p className="text-muted-foreground text-center max-w-md">
                                Primero guarda los detalles básicos del curso para poder acceder al editor de certificados.
                            </p>
                            <Button onClick={handleSave}>
                                <Save className="w-4 h-4 mr-2" />
                                Guardar Borrador y Continuar
                            </Button>
                        </div>
                    )}
                </TabsContent>

                {/* Settings Tab */}
                <TabsContent value="settings">
                    <CourseSettingsTab
                        course={course}
                        setCourse={setCourse}
                    />
                </TabsContent>
            </Tabs>

            <SyllabusDialogs
                isModuleDialogOpen={isModuleDialogOpen}
                setIsModuleDialogOpen={setIsModuleDialogOpen}
                moduleDialogMode={moduleDialogMode}
                descriptorInput={descriptorInput}
                setDescriptorInput={setDescriptorInput}
                descriptorUrl={descriptorUrl}
                setDescriptorUrl={setDescriptorUrl}
                descriptorDuration={descriptorDuration}
                setDescriptorDuration={setDescriptorDuration}
                handleDialogSubmit={handleDialogSubmit}
                moduleToDelete={moduleToDelete}
                setModuleToDelete={setModuleToDelete}
                handleDeleteModule={handleDeleteModule}
                lessonToDelete={lessonToDelete}
                setLessonToDelete={setLessonToDelete}
                handleDeleteLesson={handleDeleteLesson}
            />

            <InstructorManagerDialogs
                isInstructorDialogOpen={isInstructorDialogOpen}
                setIsInstructorDialogOpen={setIsInstructorDialogOpen}
                newInstructor={newInstructor}
                setNewInstructor={setNewInstructor}
                handleInstructorUpload={handleInstructorUpload}
                instructorUploading={instructorUploading}
                handleCreateInstructor={handleCreateInstructor}
                isInstructorManagerOpen={isInstructorManagerOpen}
                setIsInstructorManagerOpen={setIsInstructorManagerOpen}
                instructors={instructors}
                handleDeleteInstructor={handleDeleteInstructor}
                instructorToDelete={instructorToDelete}
                setInstructorToDelete={setInstructorToDelete}
                confirmDeleteInstructor={confirmDeleteInstructor}
            />

            <CategoryManagerDialogs
                isOpen={isCategoryManagerOpen}
                setIsOpen={setIsCategoryManagerOpen}
            />
        </div>
    );
}
