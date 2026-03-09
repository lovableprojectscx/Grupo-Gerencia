
import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
    Dialog, DialogContent, DialogDescription,
    DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import {
    Play, CheckCircle, ChevronLeft, Menu, GraduationCap,
    Loader2, Award, Clock, BookOpen, ArrowRight, ArrowLeft,
    ListChecks, Download, PlayCircle, ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { courseService } from "@/services/courseService";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export default function Classroom() {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [activeModule, setActiveModule] = useState<any>(null);
    const [isCertDialogOpen, setIsCertDialogOpen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const userId = user?.id || null;

    // ─── Datos ───────────────────────────────────────────────────────────────
    const { data: course, isLoading } = useQuery({
        queryKey: ["course-classroom", courseId],
        queryFn: () => courseService.getById(courseId!),
        enabled: !!courseId,
    });

    const { data: completedLessons = [] } = useQuery({
        queryKey: ["lesson-completions", userId, courseId],
        queryFn: () => courseService.getLessonCompletions(userId!, courseId!),
        enabled: !!userId && !!courseId,
    });

    const { data: enrollment } = useQuery({
        queryKey: ["enrollment-status", userId, courseId],
        queryFn: async () => {
            if (!userId) return null;
            const { data } = await supabase
                .from("enrollments")
                .select("id, status, progress")
                .eq("user_id", userId)
                .eq("course_id", courseId)
                .maybeSingle();
            return data;
        },
        enabled: !!userId && !!courseId,
    });

    const { data: certificate } = useQuery({
        queryKey: ["my-certificate", userId, courseId],
        queryFn: async () => {
            if (!enrollment?.id) return null;
            const { data: cert } = await supabase
                .from("certificates")
                .select("id")
                .eq("enrollment_id", enrollment.id)
                .maybeSingle();
            return cert;
        },
        enabled: !!userId && !!courseId && !!enrollment?.id,
    });

    // ─── Mutación: completar módulo ──────────────────────────────────────────
    const completeModuleMutation = useMutation({
        mutationFn: async (moduleId: string) => {
            if (!userId || !courseId || !course?.modules) return;
            const mod = course.modules.find((m: any) => m.id === moduleId);
            if (!mod?.lessons?.length) {
                toast.info("Este módulo no tiene tópicos secundarios que marcar.");
                return;
            }
            const lessonIds = mod.lessons.map((l: any) => l.id);
            await courseService.markAllLessonsCompleted(userId, courseId, lessonIds);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["lesson-completions"] });
            toast.success("¡Módulo completado!", { description: "Tu progreso ha sido actualizado." });
        },
        onError: () => toast.error("Error al actualizar el progreso"),
    });

    // ─── Estado inicial ───────────────────────────────────────────────────────
    useEffect(() => {
        if (!activeModule && course?.modules?.[0]) {
            setActiveModule(course.modules[0]);
        }
    }, [course, activeModule]);

    // ─── Progreso ─────────────────────────────────────────────────────────────
    const progress = useMemo(() => {
        if (!course?.modules) return 0;
        const allIds = course.modules.flatMap((m: any) => m.lessons?.map((l: any) => l.id) || []);
        if (!allIds.length) return 0;
        const done = completedLessons.filter((id: string) => allIds.includes(id)).length;
        return Math.round((done / allIds.length) * 100);
    }, [course, completedLessons]);

    const isModuleDone = useMemo(() => {
        if (!activeModule?.lessons?.length) return false;
        return activeModule.lessons.every((l: any) => completedLessons.includes(l.id));
    }, [activeModule, completedLessons]);

    const currentModuleIndex = useMemo(() =>
        course?.modules?.findIndex((m: any) => m.id === activeModule?.id) ?? -1,
        [course, activeModule]
    );

    if (isLoading) return <LoadingState />;
    if (!course) return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <p className="text-muted-foreground">Curso no encontrado o sin acceso.</p>
        </div>
    );

    return (
        <div className="flex flex-col h-screen bg-secondary/30 overflow-hidden">
            {/* ═══════════════════ HEADER ═══════════════════ */}
            <header className="h-16 bg-primary flex items-center justify-between px-4 md:px-6 shrink-0 shadow-md z-30">
                <div className="flex items-center gap-3 min-w-0">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate("/dashboard")}
                        className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-white/10 shrink-0"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <div className="h-6 w-px bg-white/20 hidden md:block shrink-0" />
                    <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-primary-foreground/50 hidden md:block">
                            Aula Virtual
                        </p>
                        <h1 className="font-bold text-sm md:text-base text-primary-foreground leading-tight line-clamp-1">
                            {course.title}
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                    {/* Progress pill */}
                    <div className="hidden md:flex items-center gap-3 bg-white/10 rounded-full px-4 py-1.5">
                        <div className="w-24 bg-white/20 h-1.5 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-accent transition-all duration-700"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <span className="text-[11px] font-bold text-primary-foreground/80 whitespace-nowrap">
                            {progress}% completado
                        </span>
                    </div>

                    {/* Certificate button */}
                    {certificate ? (
                        <Button
                            size="sm"
                            variant="outline"
                            className="hidden md:flex bg-accent/10 border-accent/30 text-accent hover:bg-accent/20 font-semibold"
                            onClick={() => navigate(`/verify/${certificate.id}`)}
                        >
                            <Award className="w-4 h-4 mr-2" />
                            Mi Certificado
                        </Button>
                    ) : (
                        progress >= 100 && (
                            <Button
                                size="sm"
                                className="hidden md:flex bg-accent hover:bg-accent/90 text-accent-foreground font-bold shadow-md"
                                onClick={() => setIsCertDialogOpen(true)}
                            >
                                <GraduationCap className="w-4 h-4 mr-2" />
                                Obtener Certificado
                            </Button>
                        )
                    )}

                    {/* Mobile sidebar trigger */}
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="md:hidden text-primary-foreground/70 hover:text-primary-foreground hover:bg-white/10"
                            >
                                <Menu className="w-5 h-5" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="right" className="p-0 w-80 bg-background border-l border-border">
                            <SidebarContent
                                course={course}
                                activeModule={activeModule}
                                setActiveModule={setActiveModule}
                                completedLessons={completedLessons}
                            />
                        </SheetContent>
                    </Sheet>
                </div>
            </header>

            {/* ═══════════════════ BODY ═══════════════════ */}
            <div className="flex flex-1 overflow-hidden">
                {/* Main Content */}
                <main className="flex-1 overflow-y-auto bg-secondary/20">
                    <div className="max-w-5xl mx-auto p-4 md:p-6 lg:p-8 space-y-6 pb-24">

                        {/* Breadcrumb */}
                        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
                            <BookOpen className="w-4 h-4 shrink-0" />
                            <span className="font-medium text-foreground line-clamp-1">{course.title}</span>
                            <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground/50" />
                            <span className="text-primary font-semibold line-clamp-1">{activeModule?.title}</span>
                        </nav>

                        {/* Video Player */}
                        <Card className="overflow-hidden shadow-lg border-border">
                            <div className="aspect-video bg-primary relative">
                                {activeModule?.video_url ? (
                                    <iframe
                                        src={`https://www.youtube.com/embed/${getYouTubeId(activeModule.video_url)}?rel=0&modestbranding=1`}
                                        title={activeModule.title}
                                        frameBorder="0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                        className="absolute inset-0 w-full h-full"
                                    />
                                ) : (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-primary-foreground/60">
                                        <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
                                            <PlayCircle className="w-9 h-9" />
                                        </div>
                                        <div className="text-center">
                                            <p className="font-semibold text-primary-foreground/80">Video no disponible</p>
                                            <p className="text-sm mt-1">El enlace de video está pendiente de configuración</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card>

                        {/* Module Info + Action */}
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider">
                                        Módulo {currentModuleIndex + 1} de {course.modules?.length}
                                    </Badge>
                                    {activeModule?.duration && (
                                        <Badge variant="secondary" className="text-[10px] gap-1">
                                            <Clock className="w-3 h-3" />
                                            {activeModule.duration}
                                        </Badge>
                                    )}
                                </div>
                                <h2 className="text-2xl md:text-3xl font-bold text-foreground">{activeModule?.title}</h2>
                            </div>
                            <div className="shrink-0">
                                {isModuleDone ? (
                                    <div className="flex items-center gap-2 px-5 py-3 rounded-lg bg-green-50 border border-green-200 text-green-700 font-semibold">
                                        <CheckCircle className="w-5 h-5 text-green-500" />
                                        Módulo Completado
                                    </div>
                                ) : (
                                    <Button
                                        size="lg"
                                        className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold shadow-md px-8"
                                        onClick={() => completeModuleMutation.mutate(activeModule.id)}
                                        disabled={completeModuleMutation.isPending || !activeModule}
                                    >
                                        {completeModuleMutation.isPending
                                            ? <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                            : <ListChecks className="w-5 h-5 mr-2" />
                                        }
                                        Marcar como Visto
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Two column layout: Temario + Navigation */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Temario */}
                            <div className="lg:col-span-2">
                                <Card className="border-border">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <BookOpen className="w-4 h-4 text-accent" />
                                            Temario del Módulo
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-1 pt-0">
                                        {activeModule?.lessons?.map((lesson: any, idx: number) => (
                                            <div
                                                key={lesson.id}
                                                className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors group"
                                            >
                                                <div className={cn(
                                                    "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                                                    completedLessons.includes(lesson.id)
                                                        ? "bg-accent/10 text-accent"
                                                        : "bg-secondary text-muted-foreground"
                                                )}>
                                                    {completedLessons.includes(lesson.id)
                                                        ? <CheckCircle className="w-4 h-4" />
                                                        : idx + 1
                                                    }
                                                </div>
                                                <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                                                    {lesson.title}
                                                </p>
                                            </div>
                                        ))}
                                        {(!activeModule?.lessons || activeModule.lessons.length === 0) && (
                                            <p className="text-sm text-muted-foreground italic py-4 text-center">
                                                El contenido completo se desarrolla en el video del módulo.
                                            </p>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Navigation Card */}
                            <div className="space-y-4">
                                <Card className="border-border">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-sm text-muted-foreground font-semibold uppercase tracking-wider">
                                            Navegación
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3 pt-0">
                                        <Button
                                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                                            onClick={() => {
                                                if (currentModuleIndex < course.modules.length - 1)
                                                    setActiveModule(course.modules[currentModuleIndex + 1]);
                                            }}
                                            disabled={currentModuleIndex >= course.modules.length - 1}
                                        >
                                            Siguiente Módulo
                                            <ArrowRight className="w-4 h-4 ml-2" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="w-full"
                                            onClick={() => {
                                                if (currentModuleIndex > 0)
                                                    setActiveModule(course.modules[currentModuleIndex - 1]);
                                            }}
                                            disabled={currentModuleIndex <= 0}
                                        >
                                            <ArrowLeft className="w-4 h-4 mr-2" />
                                            Módulo Anterior
                                        </Button>
                                    </CardContent>
                                </Card>

                                {/* Progress card */}
                                <Card className="border-border">
                                    <CardContent className="p-4 space-y-3">
                                        <div className="flex justify-between text-sm">
                                            <span className="font-semibold text-foreground">Progreso del Curso</span>
                                            <span className="font-bold text-accent">{progress}%</span>
                                        </div>
                                        <Progress value={progress} className="h-2" />
                                        <p className="text-xs text-muted-foreground">
                                            {progress >= 100
                                                ? "¡Has completado el curso! Puedes obtener tu certificado."
                                                : `Completa los módulos para avanzar en tu aprendizaje.`
                                            }
                                        </p>
                                        {progress >= 100 && !certificate && (
                                            <Button
                                                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-bold mt-1"
                                                onClick={() => setIsCertDialogOpen(true)}
                                            >
                                                <GraduationCap className="w-4 h-4 mr-2" />
                                                Obtener Certificado
                                            </Button>
                                        )}
                                        {certificate && (
                                            <Button
                                                variant="outline"
                                                className="w-full border-accent text-accent hover:bg-accent/10 font-semibold mt-1"
                                                onClick={() => navigate(`/verify/${certificate.id}`)}
                                            >
                                                <Award className="w-4 h-4 mr-2" />
                                                Ver mi Certificado
                                            </Button>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </div>
                </main>

                {/* Desktop Sidebar */}
                <aside className={cn(
                    "hidden md:flex flex-col bg-background border-l border-border shrink-0 transition-all duration-300 overflow-hidden",
                    sidebarOpen ? "w-80" : "w-0"
                )}>
                    <SidebarContent
                        course={course}
                        activeModule={activeModule}
                        setActiveModule={setActiveModule}
                        completedLessons={completedLessons}
                    />
                </aside>

                {/* Sidebar toggle */}
                <button
                    onClick={() => setSidebarOpen(s => !s)}
                    className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-20 items-center justify-center w-5 h-16 bg-background border border-border rounded-l-lg shadow-sm text-muted-foreground hover:text-primary hover:border-primary transition-all"
                >
                    {sidebarOpen
                        ? <ChevronLeft className="w-3.5 h-3.5" />
                        : <ChevronRight className="w-3.5 h-3.5" />
                    }
                </button>
            </div>

            {/* Certificate Dialog */}
            <Dialog open={isCertDialogOpen} onOpenChange={setIsCertDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold">¡Felicitaciones!</DialogTitle>
                        <DialogDescription>
                            Has completado exitosamente el curso. Tu certificado oficial está listo para ser emitido.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col items-center py-6">
                        <div className="w-24 h-24 rounded-full bg-gold/10 flex items-center justify-center ring-4 ring-gold/20 mb-4">
                            <Award className="w-12 h-12 text-gold" />
                        </div>
                        <p className="font-bold text-center text-lg">{course.title}</p>
                    </div>
                    <DialogFooter className="flex flex-col sm:flex-row gap-3">
                        <Button variant="outline" onClick={() => setIsCertDialogOpen(false)} className="flex-1">
                            Luego
                        </Button>
                        <Button
                            className="flex-[2] bg-accent hover:bg-accent/90 text-accent-foreground font-bold"
                            disabled={isGenerating}
                            onClick={async () => {
                                setIsGenerating(true);
                                try {
                                    const { data: enrol } = await supabase
                                        .from("enrollments").select("id")
                                        .eq("user_id", userId).eq("course_id", courseId).maybeSingle();
                                    if (enrol) {
                                        await supabase.from("enrollments")
                                            .update({ progress: 100, status: "completed" }).eq("id", enrol.id);
                                        const cert = await courseService.generateCertificate(enrol.id, {});
                                        toast.success("¡Certificado generado con éxito!");
                                        queryClient.invalidateQueries({ queryKey: ["my-certificate"] });
                                        setIsCertDialogOpen(false);
                                        navigate(`/verify/${cert.id}`);
                                    }
                                } catch (error) {
                                    console.error(error);
                                    toast.error("No se pudo generar el certificado");
                                } finally {
                                    setIsGenerating(false);
                                }
                            }}
                        >
                            {isGenerating
                                ? <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                : <Download className="w-5 h-5 mr-2" />
                            }
                            Descargar Certificado
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// ─── Sidebar Component ────────────────────────────────────────────────────────
function SidebarContent({ course, activeModule, setActiveModule, completedLessons }: any) {
    return (
        <div className="flex flex-col h-full">
            <div className="p-5 border-b border-border bg-primary">
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary-foreground/50 mb-1">
                    Plan de Estudios
                </p>
                <h3 className="font-bold text-base text-primary-foreground leading-tight line-clamp-2">
                    {course.title}
                </h3>
                <p className="text-xs text-primary-foreground/60 mt-1">
                    {course.modules?.length} módulos disponibles
                </p>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-3 space-y-1.5 pb-20">
                    {course.modules?.map((module: any, i: number) => {
                        const isActive = activeModule?.id === module.id;
                        const isDone = module.lessons?.length > 0 &&
                            module.lessons.every((l: any) => completedLessons.includes(l.id));

                        return (
                            <button
                                key={module.id || i}
                                onClick={() => setActiveModule(module)}
                                className={cn(
                                    "w-full text-left p-3.5 rounded-xl transition-all duration-200 border group",
                                    isActive
                                        ? "bg-primary/5 border-primary/20 shadow-sm"
                                        : "bg-transparent border-transparent hover:bg-secondary/70 hover:border-border"
                                )}
                            >
                                <div className="flex items-start gap-3">
                                    <div className={cn(
                                        "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-all",
                                        isActive
                                            ? "bg-primary text-primary-foreground shadow-sm"
                                            : isDone
                                                ? "bg-accent/10 text-accent border border-accent/20"
                                                : "bg-secondary text-muted-foreground group-hover:bg-secondary/80"
                                    )}>
                                        {isDone
                                            ? <CheckCircle className="w-4 h-4" />
                                            : <Play className={cn("w-3.5 h-3.5", isActive && "fill-current ml-0.5")} />
                                        }
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <span className={cn(
                                            "block text-[10px] font-bold uppercase tracking-wider mb-1",
                                            isActive ? "text-primary" : "text-muted-foreground"
                                        )}>
                                            Módulo {i + 1}
                                        </span>
                                        <p className={cn(
                                            "text-sm font-semibold leading-snug line-clamp-2",
                                            isActive ? "text-primary" : "text-foreground/80 group-hover:text-foreground"
                                        )}>
                                            {module.title}
                                        </p>
                                        {module.duration && (
                                            <div className="flex items-center gap-1 mt-1.5">
                                                <Clock className="w-3 h-3 text-muted-foreground" />
                                                <span className="text-[10px] text-muted-foreground">{module.duration}</span>
                                            </div>
                                        )}
                                    </div>

                                    {isDone && !isActive && (
                                        <CheckCircle className="w-4 h-4 text-accent shrink-0 mt-1" />
                                    )}
                                </div>

                                {/* Lesson count indicator */}
                            </button>
                        );
                    })}
                </div>
            </ScrollArea>
        </div>
    );
}

// ─── Loading State ────────────────────────────────────────────────────────────
function LoadingState() {
    return (
        <div className="flex flex-col h-screen bg-secondary/20">
            <div className="h-16 bg-primary flex items-center px-6 gap-4">
                <Skeleton className="w-8 h-8 rounded-lg bg-white/10" />
                <Skeleton className="h-5 w-64 bg-white/10" />
            </div>
            <div className="flex flex-1 overflow-hidden">
                <main className="flex-1 p-8 space-y-6 overflow-y-auto">
                    <Skeleton className="aspect-video w-full rounded-xl" />
                    <Skeleton className="h-10 w-1/2" />
                    <Skeleton className="h-40 w-full rounded-xl" />
                </main>
                <aside className="hidden md:block w-80 border-l border-border p-4 space-y-3 bg-background">
                    <Skeleton className="h-16 w-full rounded-xl" />
                    <Skeleton className="h-16 w-full rounded-xl" />
                    <Skeleton className="h-16 w-full rounded-xl" />
                </aside>
            </div>
        </div>
    );
}

// ─── YouTube Utility ──────────────────────────────────────────────────────────
function getYouTubeId(url: string) {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
}
