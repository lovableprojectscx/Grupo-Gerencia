
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Play,
    CheckCircle,
    FileText,
    Download,
    ChevronLeft,
    MessageCircle,
    Menu,
    GraduationCap,
    Lock,
    Search,
    Loader2,
    Award,
    Video,
    Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { courseService } from "@/services/courseService";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export default function Classroom() {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [activeLesson, setActiveLesson] = useState<any>(null);
    const [activeModule, setActiveModule] = useState<any>(null);
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const userId = user?.id || null;

    // Certificate Preference State
    const [isCertDialogOpen, setIsCertDialogOpen] = useState(false);
    // const [hoursType, setHoursType] = useState<"lectivas" | "academicas">("lectivas"); // Removed

    const [isGenerating, setIsGenerating] = useState(false);

    // Fetch real course data
    const { data: course, isLoading } = useQuery({
        queryKey: ["course-classroom", courseId],
        queryFn: () => courseService.getById(courseId!),
        enabled: !!courseId
    });

    // Fetch completed lessons
    const { data: completedLessons = [] } = useQuery({
        queryKey: ["lesson-completions", userId, courseId],
        queryFn: () => courseService.getLessonCompletions(userId!, courseId!),
        enabled: !!userId && !!courseId
    });

    // Fetch Enrollment Status (Separate from certificate to catch 'completed' but not generated cases)
    const { data: enrollment } = useQuery({
        queryKey: ["enrollment-status", userId, courseId],
        queryFn: async () => {
            if (!userId) return null;
            const { data } = await supabase
                .from('enrollments')
                .select('id, status, progress')
                .eq('user_id', userId)
                .eq('course_id', courseId)
                .maybeSingle();
            return data;
        },
        enabled: !!userId && !!courseId
    });

    // Fetch Certificate
    const { data: certificate } = useQuery({
        queryKey: ["my-certificate", userId, courseId, enrollment?.id],
        queryFn: async () => {
            if (!enrollment?.id) return null;
            // Get certificate directly using existing enrollment ID
            const { data: cert } = await supabase.from('certificates').select('id').eq('enrollment_id', enrollment.id).maybeSingle();
            return cert;
        },
        enabled: !!userId && !!courseId && !!enrollment?.id
    });

    // Toggle Completion Mutation
    const toggleMutation = useMutation({
        mutationFn: async () => {
            if (!userId || !activeLesson || !courseId) return;
            const isCompleted = completedLessons.includes(activeLesson.id);
            await courseService.toggleLessonCompletion(userId, courseId, activeLesson.id, !isCompleted);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["lesson-completions"] });
            toast.success("Progreso actualizado");
        },
        onError: () => toast.error("Error al actualizar progreso")
    });

    // Set initial active lesson/module once data is loaded
    useEffect(() => {
        if (!activeLesson && course?.modules?.[0]?.lessons?.[0]) {
            setActiveLesson(course.modules[0].lessons[0]);
            setActiveModule(course.modules[0]);
        }
    }, [course, activeLesson]);

    // Toggle Sidebar
    const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

    if (isLoading) {
        return (
            <div className="flex flex-col h-screen bg-background overflow-hidden">
                {/* Header Skeleton */}
                <header className="h-16 border-b border-border bg-card flex items-center justify-between px-4 shrink-0 z-20">
                    <div className="flex items-center gap-4">
                        <Skeleton className="w-8 h-8 rounded" />
                        <div className="flex flex-col gap-1.5 mt-1">
                            <Skeleton className="h-4 w-48" />
                            <div className="flex items-center gap-2">
                                <Skeleton className="h-2 w-24" />
                                <Skeleton className="h-3 w-16" />
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-9 w-32 hidden md:block" />
                        <Skeleton className="h-9 w-9 md:hidden" />
                    </div>
                </header>

                {/* Main Content Skeleton */}
                <div className="flex flex-1 overflow-hidden">
                    <main className="flex-1 flex flex-col min-w-0 bg-secondary/10 p-4 md:p-6 space-y-6">
                        <Skeleton className="aspect-video w-full max-w-5xl mx-auto rounded-xl shadow-xl" />
                        <div className="max-w-4xl w-full mx-auto space-y-4 pt-2">
                            <div className="flex justify-between items-center">
                                <Skeleton className="h-8 w-64" />
                                <Skeleton className="h-10 w-40" />
                            </div>
                            <Skeleton className="h-8 w-40 mt-6" />
                            <Skeleton className="h-20 w-full" />
                        </div>
                    </main>

                    {/* Sidebar Skeleton */}
                    <aside className="hidden md:flex flex-col border-l border-border bg-card w-80 shrink-0 p-4 space-y-4">
                        <Skeleton className="h-6 w-24 mb-4" />
                        <Skeleton className="h-10 w-full rounded-md" />
                        <div className="space-y-4 mt-6 pt-4 border-t border-border/50">
                            <Skeleton className="h-4 w-20" />
                            <div className="space-y-2">
                                <Skeleton className="h-14 w-full rounded-lg" />
                                <Skeleton className="h-14 w-full rounded-lg" />
                                <Skeleton className="h-14 w-full rounded-lg" />
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        );
    }

    if (!course) {
        return <div className="h-screen flex items-center justify-center">Curso no encontrado o no tienes acceso.</div>;
    }

    // Default empty state if no lessons
    const hasContent = course.modules?.some((m: any) => m.lessons?.length > 0);

    // Calculate progress
    const totalLessons = course.modules?.reduce((acc: number, m: any) => acc + (m.lessons?.length || 0), 0) || 0;
    const completedCount = completedLessons.length; // Simplified, ideally filter by lessons in THIS course if completions table has others
    // Since our query fetches all user completions, we should technically invoke a smarter service or filter here if the ID space is global.
    // For now assuming the service call in future handles strict filtering or we do it here. 
    // To be safe, let's filter purely by IDs present in the current course object:
    const allLessonIds = course.modules?.flatMap((m: any) => m.lessons?.map((l: any) => l.id)) || [];
    const confirmedCompletedCount = completedLessons.filter((id: string) => allLessonIds.includes(id)).length;
    const progressPercentage = totalLessons > 0 ? Math.round((confirmedCompletedCount / totalLessons) * 100) : 0;

    const isLessonCompleted = activeLesson ? completedLessons.includes(activeLesson.id) : false;

    return (
        <div className="flex flex-col h-screen bg-background overflow-hidden">
            {/* Top Navigation Bar */}
            <header className="h-16 border-b border-border bg-card flex items-center justify-between px-4 shrink-0 z-20">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} title="Volver al Dashboard">
                        <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <div className="flex flex-col">
                        <h1 className="font-bold text-sm md:text-base line-clamp-1">{course.title}</h1>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Progress value={(certificate || enrollment?.status === 'completed') ? 100 : progressPercentage} className="h-2 w-24" />
                            <span>{(certificate || enrollment?.status === 'completed') ? 100 : progressPercentage}% completado</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {(() => {
                        // Logic to determine if certificate button should be shown
                        // We strictly respect local completion first

                        if (certificate) {
                            return (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="hidden md:flex text-green-600 border-green-200 bg-green-50 hover:bg-green-100"
                                    onClick={() => navigate(`/verify/${certificate.id}`)}
                                >
                                    <Award className="w-4 h-4 mr-2" />
                                    Ver Certificado
                                </Button>
                            );
                        }

                        // For async courses, only show if completed
                        return (
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={async () => {
                                        if (!userId || !courseId || !course?.modules) return;
                                        if (confirm("¿Estás seguro de que quieres marcar todo el curso como completado?")) {
                                            const allLessonIds = course.modules.flatMap((m: any) => m.lessons?.map((l: any) => l.id)) || [];
                                            await courseService.markAllLessonsCompleted(userId, courseId, allLessonIds);
                                            toast.success("Curso completado exitosamente");
                                            queryClient.invalidateQueries({ queryKey: ["lesson-completions"] });
                                            queryClient.invalidateQueries({ queryKey: ["course-classroom"] }); // Refresh progress

                                            // Optional: Open cert dialog immediately
                                            setTimeout(() => setIsCertDialogOpen(true), 500);
                                        }
                                    }}
                                    className="hidden md:flex text-muted-foreground hover:text-primary"
                                    title="Marcar todo como completado"
                                >
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Completar Todo
                                </Button>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="hidden md:flex"
                                    disabled={progressPercentage < 100}
                                    onClick={() => {
                                        if (progressPercentage >= 100) {
                                            setIsCertDialogOpen(true);
                                        }
                                    }}
                                >
                                    <GraduationCap className={cn("w-4 h-4 mr-2", progressPercentage < 100 ? "text-muted-foreground" : "text-primary")} />
                                    {progressPercentage >= 100 ? "Obtener Certificado" : "Certificado"}
                                </Button>
                            </div>
                        );
                    })()}

                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="md:hidden">
                                <Menu className="w-5 h-5" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="right" className="p-0 w-80">
                            <CourseSidebarContent course={course} activeLesson={activeLesson} setActiveLesson={setActiveLesson} setActiveModule={setActiveModule} completedLessons={completedLessons} />
                        </SheetContent>
                    </Sheet>
                </div>
            </header>

            {/* Main Content Area */}
            <div className="flex flex-1 overflow-hidden">

                {/* Course Player Area */}
                <main className="flex-1 flex flex-col min-w-0 bg-secondary/10 overflow-y-auto">
                    {!activeLesson ? (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8 text-center animate-in fade-in zoom-in duration-500">
                            {course.modality === 'live' || course.modality === 'hybrid' ? (
                                <div className="max-w-2xl w-full space-y-8">
                                    <div className="bg-card p-8 rounded-2xl shadow-xl border border-border">
                                        <div className="bg-blue-100 text-blue-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                                            <Video className="w-10 h-10" />
                                        </div>
                                        <h3 className="text-3xl font-bold mb-2 text-foreground">¡Bienvenido a tu Clase en Vivo!</h3>
                                        <p className="text-muted-foreground mb-8 text-lg">
                                            Este curso se dicta de manera sincrónica. Conéctate en el horario programado para participar.
                                        </p>

                                        {course.metadata?.find((m: any) => m.key === 'live_date')?.value && (
                                            <div className="bg-secondary/50 p-4 rounded-lg mb-6 flex items-center justify-center gap-3">
                                                <Clock className="w-5 h-5 text-primary" />
                                                <span className="font-medium text-foreground">
                                                    {course.metadata.find((m: any) => m.key === 'live_date').value}
                                                </span>
                                            </div>
                                        )}

                                        <div className="space-y-4">
                                            {course.metadata?.find((m: any) => m.key === 'live_url')?.value ? (
                                                <Button
                                                    size="lg"
                                                    className="w-full text-lg h-14 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-900/20 transition-all hover:scale-[1.02]"
                                                    onClick={() => window.open(course.metadata.find((m: any) => m.key === 'live_url').value, '_blank')}
                                                >
                                                    <Video className="w-6 h-6 mr-2" />
                                                    Ingresar a la Clase
                                                </Button>
                                            ) : (
                                                <div className="p-4 bg-yellow-50 text-yellow-800 rounded border border-yellow-200">
                                                    El enlace de la clase aún no está disponible.
                                                </div>
                                            )}

                                            {/* Manual Completion for Live Courses */}
                                            {(!course.modules || course.modules.length === 0) && (
                                                <div className="pt-8 border-t border-border mt-8">
                                                    <h4 className="font-semibold mb-2">¿Ya finalizaste el curso?</h4>
                                                    <p className="text-sm text-muted-foreground mb-4">
                                                        Si ya asististe a todas las sesiones, puedes confirmar tu asistencia para liberar tu certificado.
                                                    </p>
                                                    <Button variant="outline" className="w-full" onClick={() => {
                                                        if (confirm("¿Confirmas que has completado el curso en vivo? Esto generará tu certificado.")) {
                                                            setIsCertDialogOpen(true);
                                                        }
                                                    }}>
                                                        <CheckCircle className="w-4 h-4 mr-2" />
                                                        Confirmar Asistencia y Finalizar
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="bg-card p-6 rounded-full mb-4 shadow-sm">
                                        <Play className="w-12 h-12 text-muted-foreground/50" />
                                    </div>
                                    <h3 className="text-xl font-semibold mb-2">¡Bienvenido al curso!</h3>
                                    <p>{hasContent ? "Selecciona una lección para comenzar." : "El contenido estará disponible pronto."}</p>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="w-full max-w-5xl mx-auto p-4 md:p-6 space-y-6">

                            {/* Video Player */}
                            <div className="aspect-video bg-black rounded-xl shadow-xl overflow-hidden relative group">
                                {activeModule?.video_url ? (
                                    <div className="w-full h-full bg-black flex items-center justify-center">
                                        <iframe
                                            width="100%"
                                            height="100%"
                                            src={`https://www.youtube.com/embed/${getYouTubeId(activeModule.video_url)}?autoplay=0&rel=0`}
                                            title={activeModule.title}
                                            frameBorder="0"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                            className="w-full h-full"
                                        ></iframe>
                                    </div>
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-white/50">
                                        <Play className="w-16 h-16 mb-2" />
                                        <span>Video del módulo no disponible</span>
                                        <p className="text-xs mt-1 text-white/30">Edita el módulo para agregar un enlace de YouTube</p>
                                    </div>
                                )}
                            </div>

                            {/* Content Tabs */}
                            <div className="max-w-4xl">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">{activeModule?.title}</p>
                                        <h2 className="text-2xl font-bold">{activeLesson.title}</h2>
                                    </div>
                                    {isLessonCompleted ? (
                                        <Button
                                            variant="secondary"
                                            className="text-green-600 bg-green-100 dark:bg-green-900/30"
                                            onClick={() => toggleMutation.mutate()}
                                            disabled={toggleMutation.isPending}
                                        >
                                            <CheckCircle className="w-4 h-4 mr-2" />
                                            Completado
                                        </Button>
                                    ) : (
                                        <Button
                                            onClick={() => toggleMutation.mutate()}
                                            disabled={toggleMutation.isPending}
                                        >
                                            {toggleMutation.isPending ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                                            Marcar como visto
                                        </Button>
                                    )}
                                </div>

                                <Tabs defaultValue="overview" className="w-full">
                                    <TabsList className="hidden w-full justify-start border-b border-border bg-transparent p-0 h-auto rounded-none">
                                        <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3">
                                            Descripción
                                        </TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="overview" className="py-6 space-y-4">
                                        <h3 className="font-semibold text-lg">Acerca de esta lección</h3>
                                        <p className="text-muted-foreground leading-relaxed">
                                            Contenido de la lección: {activeLesson.title}.
                                        </p>
                                    </TabsContent>


                                </Tabs>
                            </div>
                        </div>
                    )}
                </main>

                {/* Desktop Sidebar */}
                <aside className={cn(
                    "hidden md:flex flex-col border-l border-border bg-card w-80 shrink-0 transition-all duration-300",
                    !sidebarOpen && "w-0 border-l-0 overflow-hidden"
                )}>
                    {course && <CourseSidebarContent course={course} activeLesson={activeLesson} setActiveLesson={setActiveLesson} setActiveModule={setActiveModule} completedLessons={completedLessons} />}
                </aside>

                {/* Sidebar Toggle Button (Desktop floating) */}
                {
                    !sidebarOpen && (
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 hidden md:block z-10">
                            <Button variant="secondary" size="icon" className="rounded-l-lg rounded-r-none shadow-md" onClick={toggleSidebar}>
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                        </div>
                    )
                }
            </div >

            <Dialog open={isCertDialogOpen} onOpenChange={setIsCertDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Generar Certificado</DialogTitle>
                        <DialogDescription>
                            Has completado el curso. Haz clic en generar para obtener tu certificado.
                        </DialogDescription>
                    </DialogHeader>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCertDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={async () => {
                            setIsGenerating(true);
                            try {
                                const { data: enrol } = await supabase.from('enrollments').select('id').eq('user_id', userId).eq('course_id', courseId).maybeSingle();
                                if (enrol) {
                                    // Ensure status is completed before checking logic
                                    const { error: updateError } = await supabase.from('enrollments').update({
                                        progress: 100,
                                        status: 'completed'
                                    }).eq('id', enrol.id);

                                    if (updateError) throw updateError;

                                    const cert = await courseService.generateCertificate(enrol.id, {});

                                    toast.success("¡Felicidades! Certificado generado.");
                                    queryClient.invalidateQueries({ queryKey: ["my-certificate"] });
                                    setIsCertDialogOpen(false);
                                    navigate(`/verify/${cert.id}`);
                                }
                            } catch (error: any) {
                                console.error(error);
                                toast.error("Error al generar certificado: " + (error.message || "Error desconocido"));
                            } finally {
                                setIsGenerating(false);
                            }
                        }} disabled={isGenerating}>
                            {isGenerating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Generar Certificado
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div >
    );
}

function CourseSidebarContent({ course, activeLesson, setActiveLesson, setActiveModule, completedLessons }: { course: any, activeLesson: any, setActiveLesson: any, setActiveModule: any, completedLessons: string[] }) {
    const [searchQuery, setSearchQuery] = useState("");

    return (
        <div className="flex flex-col h-full bg-card">
            <div className="p-4 border-b border-border">
                <h3 className="font-bold text-lg mb-2">Contenido</h3>
                <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        className="w-full bg-secondary/50 rounded-md py-1.5 pl-8 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="Buscar lección..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-4 space-y-6">
                    {course.modules?.map((module: any, i: number) => {
                        const filteredLessons = module.lessons?.filter((lesson: any) =>
                            lesson.title.toLowerCase().includes(searchQuery.toLowerCase())
                        ) || [];

                        // Si hay búsqueda y este módulo no tiene coincidencias, no lo mostramos
                        if (searchQuery && filteredLessons.length === 0) return null;

                        return (
                            <div key={module.id || i}>
                                <div className="flex items-center gap-1.5 mb-3">
                                    {module.video_url && <Play className="w-3 h-3 text-primary fill-primary flex-shrink-0" />}
                                    <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">{module.title}</h4>
                                </div>
                                <div className="space-y-1">
                                    {filteredLessons.map((lesson: any) => {
                                        const isCompleted = completedLessons.includes(lesson.id);
                                        return (
                                            <button
                                                key={lesson.id}
                                                onClick={() => {
                                                    setActiveLesson(lesson);
                                                    setActiveModule(module);
                                                }}
                                                className={cn(
                                                    "w-full flex items-start text-left gap-3 p-3 rounded-lg transition-colors group relative",
                                                    activeLesson?.id === lesson.id ? "bg-primary/10 text-primary" : "hover:bg-secondary/50"
                                                )}
                                            >
                                                <div className={cn(
                                                    "mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                                                    isCompleted ? "bg-green-500 border-green-500 text-white" : (activeLesson?.id === lesson.id ? "border-primary" : "border-muted-foreground")
                                                )}>
                                                    {isCompleted && <CheckCircle className="w-3 h-3" />}
                                                </div>

                                                <div className="flex-1">
                                                    <p className={cn("text-sm font-medium leading-tight", activeLesson?.id === lesson.id && "font-bold")}>
                                                        {lesson.title}
                                                    </p>
                                                </div>
                                            </button>
                                        );
                                    })}
                                    {!filteredLessons.length && !searchQuery && <div className="text-xs text-muted-foreground pl-8 italic">Sin lecciones</div>}
                                </div>
                            </div>
                        );
                    })}
                    {!course.modules?.length && <div className="text-center text-muted-foreground py-4">No hay contenido disponible</div>}
                    {course.modules?.length > 0 && searchQuery && !course.modules.some((m: any) => m.lessons?.some((l: any) => l.title.toLowerCase().includes(searchQuery.toLowerCase()))) && (
                        <div className="text-center text-muted-foreground py-4 text-sm">
                            No se encontraron lecciones con "{searchQuery}"
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}

function getYouTubeId(url: string) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

