
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
import { BrowserWindow } from "@/components/ui/BrowserWindow"; // Added import
import { Switch } from "@/components/ui/switch";
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
import { COURSE_CATEGORIES } from "@/constants/categories";
import { supabase } from "@/lib/supabase";
import { Loader2, Upload } from "lucide-react";

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

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const openEditLessonDialog = (lesson: any, moduleId: string) => { // moduleId kept for reference if needed
        setModuleDialogMode('edit-lesson');
        setDescriptorInput(lesson.title);
        setDescriptorUrl(lesson.content_url || "");
        setDescriptorDuration(lesson.duration || "");
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
                    order: (course.modules?.length || 0) + 1
                });
                toast.success("Módulo agregado");
            } else if (moduleDialogMode === 'edit') {
                if (currentModuleId) {
                    await courseService.updateModule(currentModuleId, { title: descriptorInput });
                    toast.success("Módulo actualizado");
                }
            } else if (moduleDialogMode === 'create-lesson') {
                if (currentModuleId) {
                    await courseService.createLesson({
                        module_id: currentModuleId,
                        title: descriptorInput,
                        content_url: descriptorUrl,
                        duration: descriptorDuration,
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
                        content_url: descriptorUrl,
                        duration: descriptorDuration
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
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `covers/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('course-content')
                .upload(filePath, file);

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
            const fileExt = file.name.split('.').pop();
            const fileName = `instructor-${Math.random()}.${fileExt}`;
            const filePath = `instructors/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('course-content')
                .upload(filePath, file);

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
                                    <Button variant="outline" size="sm" onClick={() => setIsInstructorManagerOpen(true)} className="mr-2">
                                        <GripVertical className="w-3 h-3 mr-1" /> Gestionar
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => setIsInstructorDialogOpen(true)}>
                                        <Plus className="w-3 h-3 mr-1" /> Nuevo
                                    </Button>
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
                                    <Label className="text-base">Datos del Certificado</Label>
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
                                            // We need the REAL index in the main array to update correctly
                                            const realIndex = course.metadata.findIndex((m: any) => m === item);
                                            // Using a more stable key combining item key and index
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
                                        <Label className="flex gap-1">Categoría <span className="text-destructive">*</span></Label>
                                        <Select value={course.category} onValueChange={(val) => setCourse({ ...course, category: val, specialty: "" })}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Seleccione" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {COURSE_CATEGORIES.map(cat => (
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
                                                {course.category && COURSE_CATEGORIES.find(c => c.id === course.category)?.specialties.map(spec => (
                                                    <SelectItem key={spec.id} value={spec.id}>{spec.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Syllabus Tab */}
                <TabsContent value="syllabus" className="space-y-6">
                    {isEditing ? (
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
                                                            {lesson.type === 'video' ? <Video className="w-3 h-3 text-blue-500" /> : <FileText className="w-3 h-3 text-orange-500" />}
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
                    ) : (
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
                    )}
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
                    <Card>
                        <CardHeader>
                            <CardTitle>Precio y Publicación</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex flex-col md:flex-row gap-8">
                                <div className="space-y-6 flex-1">
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label>Precio de Venta (S/)</Label>
                                            <Input
                                                type="number"
                                                placeholder="0.00"
                                                value={course.price}
                                                onChange={(e) => setCourse({ ...course, price: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Precio Original (Antes del descuento)</Label>
                                            <Input
                                                type="number"
                                                placeholder="0.00"
                                                value={course.original_price || ""}
                                                onChange={(e) => setCourse({ ...course, original_price: e.target.value })}
                                            />
                                            <p className="text-xs text-muted-foreground">Opcional. Si se llena, se mostrará como una oferta.</p>
                                        </div>
                                    </div>

                                    <Separator />

                                    <div className="flex items-center justify-between p-4 border rounded-lg bg-secondary/10">
                                        <div className="space-y-0.5">
                                            <Label className="text-base">Publicar Curso</Label>
                                            <p className="text-sm text-muted-foreground">Hacer visible este curso para todos los estudiantes.</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={course.published ? "text-green-600 font-bold text-sm" : "text-amber-600 font-bold text-sm"}>
                                                {course.published ? "PUBLICADO" : "BORRADOR"}
                                            </span>
                                            <Switch checked={course.published} onCheckedChange={(c) => setCourse({ ...course, published: c })} />
                                        </div>
                                    </div>
                                </div>

                                {/* Live Preview Card */}
                                <div className="w-full md:w-[400px] shrink-0">
                                    <Label className="mb-3 block text-center font-medium">Vista Previa (Web)</Label>
                                    <BrowserWindow url={`https://gerencia.global/cursos/${course.slug || '...'}`}>
                                        <div className="p-4 bg-muted/10 min-h-[300px]">
                                            <div className="border rounded-xl overflow-hidden shadow-lg bg-card max-w-[320px] mx-auto">
                                                <div className="aspect-video bg-muted relative">
                                                    {course.image_url ? (
                                                        <img src={course.image_url} alt="Cover" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="flex items-center justify-center h-full text-muted-foreground">Sin Imagen</div>
                                                    )}
                                                    {course.original_price > Number(course.price) && (
                                                        <span className="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">
                                                            -{Math.round(((course.original_price - course.price) / course.original_price) * 100)}%
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="p-4 space-y-2">
                                                    <div className="text-xs font-bold text-blue-600 uppercase tracking-wider">{course.category || "Categoría"}</div>
                                                    <h3 className="font-bold leading-tight line-clamp-2">{course.title || "Título del Curso"}</h3>
                                                    <p className="text-sm text-muted-foreground line-clamp-2">{course.subtitle || "Subtítulo del curso..."}</p>
                                                    <div className="pt-2 flex items-baseline gap-2">
                                                        <span className="text-lg font-bold">S/ {course.price || "0.00"}</span>
                                                        {Number(course.original_price) > Number(course.price) && (
                                                            <span className="text-sm text-muted-foreground line-through">S/ {course.original_price}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </BrowserWindow>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

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

                        {(moduleDialogMode === 'create-lesson' || moduleDialogMode === 'edit-lesson') && (
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

            {/* Module Delete Dialog */}
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

            {/* Lesson Delete Dialog */}
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
        </div>
    );
}
