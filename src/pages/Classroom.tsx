
import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Play,
    CheckCircle,
    ChevronLeft,
    Menu,
    GraduationCap,
    Loader2,
    Award,
    Clock,
    Layout,
    BookOpen,
    ArrowRight,
    ArrowLeft,
    MonitorPlay,
    ListChecks,
    Download
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
    const [activeModule, setActiveModule] = useState<any>(null);
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const userId = user?.id || null;

    const [isCertDialogOpen, setIsCertDialogOpen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    // Fetch real course data
    const { data: course, isLoading } = useQuery({
        queryKey: ["course-classroom", courseId],
        queryFn: () => courseService.getById(courseId!),
        enabled: !!courseId
    });

    // Fetch completed lessons (used for progress tracking)
    const { data: completedLessons = [] } = useQuery({
        queryKey: ["lesson-completions", userId, courseId],
        queryFn: () => courseService.getLessonCompletions(userId!, courseId!),
        enabled: !!userId && !!courseId
    });

    // Fetch Enrollment
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
        queryKey: ["my-certificate", userId, courseId],
        queryFn: async () => {
            if (!enrollment?.id) return null;
            const { data: cert } = await supabase.from('certificates').select('id').eq('enrollment_id', enrollment.id).maybeSingle();
            return cert;
        },
        enabled: !!userId && !!courseId && !!enrollment?.id
    });

    // Mutation for Module Completion (marks all lessons in module)
    const completeModuleMutation = useMutation({
        mutationFn: async (moduleId: string) => {
            if (!userId || !courseId || !course?.modules) return;
            const module = course.modules.find((m: any) => m.id === moduleId);
            if (!module?.lessons?.length) {
                // Si no hay lecciones, marcar progreso al menos en la inscripción de alguna forma 
                // o simplemente retornar éxito si el módulo es solo un video.
                toast.info("Este módulo no tiene lecciones secundarias que marcar.");
                return;
            }

            const lessonIds = module.lessons.map((l: any) => l.id);
            await courseService.markAllLessonsCompleted(userId, courseId, lessonIds);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["lesson-completions"] });
            toast.success("¡Módulo completado!", {
                description: "Tu progreso ha sido actualizado."
            });
        },
        onError: () => toast.error("Error al actualizar progreso")
    });

    // Initial state
    useEffect(() => {
        if (!activeModule && course?.modules?.[0]) {
            setActiveModule(course.modules[0]);
        }
    }, [course, activeModule]);

    // Progress Calculation
    const progressPerc = useMemo(() => {
        if (!course?.modules) return 0;
        const allLessonIds = course.modules.flatMap((m: any) => m.lessons?.map((l: any) => l.id) || []);
        if (allLessonIds.length === 0) return 0;
        const count = completedLessons.filter((id: string) => allLessonIds.includes(id)).length;
        return Math.round((count / allLessonIds.length) * 100);
    }, [course, completedLessons]);

    const isModuleCompleted = useMemo(() => {
        if (!activeModule?.lessons?.length) return false;
        return activeModule.lessons.every((l: any) => completedLessons.includes(l.id));
    }, [activeModule, completedLessons]);

    const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

    const handleNextModule = () => {
        const currentIndex = course.modules.findIndex((m: any) => m.id === activeModule.id);
        if (currentIndex < course.modules.length - 1) {
            setActiveModule(course.modules[currentIndex + 1]);
        }
    };

    const handlePrevModule = () => {
        const currentIndex = course.modules.findIndex((m: any) => m.id === activeModule.id);
        if (currentIndex > 0) {
            setActiveModule(course.modules[currentIndex - 1]);
        }
    };

    if (isLoading) return <ClassroomLoadingState />;
    if (!course) return <div className="h-screen flex items-center justify-center">Curso no encontrado o sin acceso.</div>;

    return (
        <div className="flex h-screen bg-[#0a0a0c] text-slate-200 overflow-hidden font-sans">
            <div className="flex flex-1 flex-col overflow-hidden">
                {/* Innovative Header */}
                <header className="h-16 border-b border-white/5 bg-[#0a0a0c]/80 backdrop-blur-md flex items-center justify-between px-6 shrink-0 z-30">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate("/dashboard")}
                            className="hover:bg-white/5 text-slate-400 hover:text-white transition-all"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </Button>
                        <div className="h-6 w-[1px] bg-white/10 hidden md:block" />
                        <div className="flex flex-col">
                            <h1 className="font-semibold text-sm md:text-base text-slate-100 line-clamp-1">{course.title}</h1>
                            <div className="flex items-center gap-3 mt-0.5">
                                <div className="flex-1 w-32 bg-white/5 h-1 md:h-1.5 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-1000 ease-out"
                                        style={{ width: `${progressPerc}%` }}
                                    />
                                </div>
                                <span className="text-[9px] md:text-[10px] text-slate-500 font-medium tracking-wider whitespace-nowrap">{progressPerc}% COMPLETADO</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="hidden lg:flex items-center gap-2 mr-4">
                            {certificate ? (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20 transition-all"
                                    onClick={() => navigate(`/verify/${certificate.id}`)}
                                >
                                    <Award className="w-4 h-4 mr-2" />
                                    Certificado Disponible
                                </Button>
                            ) : (
                                progressPerc >= 100 && (
                                    <Button
                                        size="sm"
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-900/40"
                                        onClick={() => setIsCertDialogOpen(true)}
                                    >
                                        <GraduationCap className="w-4 h-4 mr-2" />
                                        Obtener Certificado
                                    </Button>
                                )
                            )}
                        </div>

                        <Sheet>
                            <SheetTrigger asChild>
                                <Button variant="ghost" size="icon" className="md:hidden text-slate-400">
                                    <Menu className="w-6 h-6" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="right" className="p-0 w-80 bg-[#0a0a0c] border-l-white/5">
                                <CourseSidebarMobile course={course} activeModule={activeModule} setActiveModule={setActiveModule} completedLessons={completedLessons} />
                            </SheetContent>
                        </Sheet>
                    </div>
                </header>

                {/* Content Body */}
                <div className="flex flex-1 overflow-hidden relative">
                    {/* Main Player Area */}
                    <main className="flex-1 overflow-y-auto bg-[#0a0a0c] custom-scrollbar scroll-smooth">
                        <div className="max-w-6xl mx-auto p-4 lg:p-8 space-y-8 pb-32">

                            {/* Breadcrumb stylized */}
                            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
                                <Layout className="w-3 h-3" />
                                <span>Módulo {course.modules?.findIndex((m: any) => m.id === activeModule?.id) + 1}</span>
                                <ArrowRight className="w-3 h-3 text-slate-700" />
                                <span className="text-indigo-400">{activeModule?.title}</span>
                            </div>

                            {/* Video Theater Container */}
                            <div className="group relative transition-all duration-500 ease-in-out">
                                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/30 to-indigo-600/30 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                                <div className="aspect-video bg-black rounded-2xl shadow-2xl relative overflow-hidden border border-white/5 ring-1 ring-white/10">
                                    {activeModule?.video_url ? (
                                        <iframe
                                            width="100%"
                                            height="100%"
                                            src={`https://www.youtube.com/embed/${getYouTubeId(activeModule.video_url)}?autoplay=0&rel=0&modestbranding=1&color=white`}
                                            title={activeModule.title}
                                            frameBorder="0"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                            className="absolute inset-0 w-full h-full"
                                        ></iframe>
                                    ) : (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#121216] to-[#0a0a0c] text-slate-400 p-6 text-center">
                                            <div className="p-6 bg-white/5 rounded-full mb-4">
                                                <Play className="w-12 h-12 text-slate-700" />
                                            </div>
                                            <h3 className="text-xl font-medium text-slate-200 uppercase tracking-wider">Video no disponible</h3>
                                            <p className="max-w-xs mt-2 text-sm text-slate-500">
                                                Este módulo está siendo procesado o requiere configuración de enlace.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Content Info & Controls */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-2 space-y-8">
                                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                                        <div className="space-y-3">
                                            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-tight">{activeModule?.title}</h2>
                                            <div className="flex flex-wrap items-center gap-4">
                                                {activeModule?.duration && (
                                                    <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
                                                        <Clock className="w-3.5 h-3.5 text-indigo-400" />
                                                        <span>{activeModule.duration}</span>
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
                                                    <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                                                    <span>{activeModule?.lessons?.length || 0} Tópicos</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex shrink-0">
                                            {isModuleCompleted ? (
                                                <div className="flex items-center gap-2 px-8 py-4 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 font-bold animate-in zoom-in duration-500 shadow-[0_0_20px_rgba(34,197,94,0.1)]">
                                                    <CheckCircle className="w-5 h-5" />
                                                    Módulo Completado
                                                </div>
                                            ) : (
                                                <Button
                                                    onClick={() => completeModuleMutation.mutate(activeModule.id)}
                                                    disabled={completeModuleMutation.isPending || !activeModule}
                                                    className="px-10 py-7 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black shadow-2xl shadow-blue-900/30 hover:scale-[1.03] active:scale-95 transition-all text-lg tracking-tight"
                                                >
                                                    {completeModuleMutation.isPending ? <Loader2 className="animate-spin w-5 h-5 mr-3" /> : <ListChecks className="w-5 h-5 mr-3" />}
                                                    Listo, Módulo Visto
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Syllabus Section - INNOVATIVE LIST */}
                                    <div className="bg-white/[0.02] border border-white/10 rounded-3xl overflow-hidden backdrop-blur-xl">
                                        <div className="px-8 py-6 border-b border-white/5 bg-white/[0.03] flex items-center justify-between">
                                            <h3 className="font-bold text-lg text-slate-100 flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                                                    <BookOpen className="w-4 h-4 text-indigo-400" />
                                                </div>
                                                Temario Magistral
                                            </h3>
                                        </div>
                                        <div className="p-4 space-y-2">
                                            {activeModule?.lessons?.map((lesson: any, idx: number) => (
                                                <div
                                                    key={lesson.id}
                                                    className="flex items-center gap-5 p-5 rounded-2xl hover:bg-white/[0.04] transition-all group border border-transparent hover:border-white/5"
                                                >
                                                    <div className="w-10 h-10 rounded-xl bg-slate-800/50 border border-white/5 flex items-center justify-center text-slate-500 font-bold text-sm shrink-0 group-hover:bg-indigo-500/10 group-hover:text-indigo-400 group-hover:border-indigo-500/20 transition-all">
                                                        {idx + 1}
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-base font-semibold text-slate-300 group-hover:text-white transition-colors">{lesson.title}</p>
                                                    </div>
                                                    {completedLessons.includes(lesson.id) && (
                                                        <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                                                            <CheckCircle className="w-4 h-4 text-green-500" />
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                            {(!activeModule?.lessons || activeModule.lessons.length === 0) && (
                                                <div className="flex flex-col items-center py-12 text-slate-600">
                                                    <Layout className="w-10 h-10 mb-4 opacity-10" />
                                                    <p className="text-sm font-medium italic">
                                                        Explora el contenido completo en el video principal.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Sidebar Stats / Info Card */}
                                <div className="space-y-6">
                                    <div className="bg-gradient-to-br from-indigo-600/[0.15] to-blue-600/[0.15] border border-white/10 p-8 rounded-3xl space-y-6 backdrop-blur-md relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[50px] -mr-16 -mt-16 group-hover:bg-indigo-500/20 transition-all duration-1000"></div>

                                        <h4 className="font-bold text-slate-100 flex items-center gap-3 relative z-10 text-lg">
                                            <div className="p-2 bg-indigo-500/20 rounded-lg">
                                                <MonitorPlay className="w-5 h-5 text-indigo-400" />
                                            </div>
                                            Centro de Control
                                        </h4>
                                        <p className="text-sm text-slate-400 leading-relaxed relative z-10">
                                            Navega a través de los módulos maestros del curso para absorber todo el conocimiento.
                                        </p>

                                        <div className="pt-4 flex flex-col gap-3 relative z-10">
                                            <Button
                                                variant="ghost"
                                                onClick={handleNextModule}
                                                disabled={course.modules.findIndex((m: any) => m.id === activeModule?.id) === course.modules.length - 1}
                                                className="w-full bg-white/5 hover:bg-white/10 text-white font-bold h-14 rounded-2xl border border-white/10 transition-all hover:scale-[1.02]"
                                            >
                                                Siguiente Módulo <ArrowRight className="w-4 h-4 ml-2" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                onClick={handlePrevModule}
                                                disabled={course.modules.findIndex((m: any) => m.id === activeModule?.id) === 0}
                                                className="w-full bg-transparent hover:bg-white/5 text-slate-500 hover:text-slate-300 font-medium h-12 rounded-xl transition-all"
                                            >
                                                <ArrowLeft className="w-3.5 h-3.5 mr-2" /> Módulo Anterior
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Instructor teaser simple */}
                                    <div className="bg-white/[0.02] border border-white/5 p-6 rounded-3xl flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-800 shrink-0">
                                            <img src="/logo_gerencia_transparente.png" alt="Gerencia" className="w-full h-full object-contain p-2" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Plataforma</p>
                                            <p className="text-sm font-bold text-slate-200">Gerencia y Desarrollo</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </main>

                    {/* DESKTOP SIDEBAR - INNOVATIVE LIST */}
                    <aside className={cn(
                        "hidden md:flex flex-col border-l border-white/5 bg-[#0a0a0c] w-96 shrink-0 transition-all duration-500 ease-in-out",
                        !sidebarOpen && "w-0 border-l-0 overflow-hidden translate-x-10 opacity-0"
                    )}>
                        <div className="p-8 border-b border-white/5 bg-gradient-to-br from-indigo-500/[0.03] to-transparent">
                            <h3 className="font-black text-2xl text-white tracking-tight mb-2">Contenido</h3>
                            <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 text-[9px] font-black uppercase tracking-widest">Full Access</span>
                                <span className="text-slate-600 text-[10px] font-semibold uppercase tracking-wider">{course.modules?.length} Módulos Disponibles</span>
                            </div>
                        </div>
                        <ScrollArea className="flex-1 px-4">
                            <div className="space-y-3 py-6 pb-32">
                                {course.modules?.map((module: any, i: number) => {
                                    const isActive = activeModule?.id === module.id;
                                    const isDone = module.lessons?.every((l: any) => completedLessons.includes(l.id)) && module.lessons.length > 0;

                                    return (
                                        <button
                                            key={module.id || i}
                                            onClick={() => setActiveModule(module)}
                                            className={cn(
                                                "w-full text-left p-5 rounded-[2rem] transition-all duration-500 group relative overflow-hidden border",
                                                isActive
                                                    ? "bg-gradient-to-br from-indigo-600/[0.12] to-blue-600/[0.08] border-indigo-500/40 shadow-[0_10px_40px_rgba(0,0,0,0.3)]"
                                                    : "bg-transparent border-transparent hover:bg-white/[0.03] hover:border-white/5"
                                            )}
                                        >
                                            {isActive && (
                                                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 blur-[30px] -mr-12 -mt-12 group-hover:opacity-100 transition-opacity"></div>
                                            )}

                                            <div className="flex items-center gap-5 relative z-10">
                                                <div className={cn(
                                                    "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-500",
                                                    isActive
                                                        ? "bg-gradient-to-br from-indigo-500 to-blue-500 text-white shadow-lg shadow-indigo-500/30 scale-110"
                                                        : "bg-slate-800/50 text-slate-500 group-hover:bg-slate-800 group-hover:text-slate-300"
                                                )}>
                                                    {isDone ? <CheckCircle className="w-6 h-6" /> : <Play className={cn("w-5 h-5", isActive && "fill-current ml-0.5")} />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <span className={cn(
                                                        "block text-[10px] font-black uppercase tracking-[0.2em] mb-1.5 transition-all",
                                                        isActive ? "text-indigo-400" : "text-slate-600"
                                                    )}>
                                                        Módulo {i + 1}
                                                    </span>
                                                    <h4 className={cn(
                                                        "font-bold text-sm leading-snug line-clamp-2 transition-all",
                                                        isActive ? "text-white" : "text-slate-400 group-hover:text-slate-200"
                                                    )}>
                                                        {module.title}
                                                    </h4>
                                                </div>
                                            </div>

                                            {isActive && (
                                                <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                                                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                                                        <Clock className="w-3 h-3 text-indigo-500/70" />
                                                        <span>{module.duration || '0 min'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-[10px] text-indigo-400 font-black animate-pulse">
                                                        <div className="w-1 h-1 rounded-full bg-indigo-500" />
                                                        REPRODUCIENDO
                                                    </div>
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </ScrollArea>
                    </aside>

                    {/* Sidebar Toggle BTN Desktop */}
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 hidden md:block z-40">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-32 w-5 bg-white/[0.03] hover:bg-white/[0.08] rounded-l-2xl rounded-r-none border border-r-0 border-white/5 text-slate-700 hover:text-indigo-400 backdrop-blur-md transition-all p-0 group"
                            onClick={toggleSidebar}
                        >
                            {sidebarOpen ? <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> : <Menu className="w-4 h-4 group-hover:scale-110 transition-transform" />}
                        </Button>
                    </div>
                </div>
            </div>

            <Dialog open={isCertDialogOpen} onOpenChange={setIsCertDialogOpen}>
                <DialogContent className="bg-[#0e0e11] border-white/10 text-white rounded-[2rem] max-w-lg shadow-[0_0_100px_rgba(79,70,229,0.15)] overflow-hidden">
                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
                    <DialogHeader className="pt-6">
                        <DialogTitle className="text-3xl font-black text-center tracking-tight">¡Felicitaciones!</DialogTitle>
                        <DialogDescription className="text-slate-400 text-center text-base mt-2">
                            Has demostrado excelencia y compromiso. Tu certificación de experto está lista.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col items-center py-10 relative">
                        <div className="absolute inset-0 bg-indigo-500/5 blur-[80px] rounded-full"></div>
                        <div className="w-28 h-28 bg-gradient-to-br from-yellow-300 via-amber-500 to-orange-600 rounded-3xl flex items-center justify-center shadow-[0_20px_50px_rgba(245,158,11,0.2)] rotate-3 hover:rotate-0 transition-transform duration-500 cursor-pointer group relative z-10">
                            <Award className="w-14 h-14 text-[#0e0e11] group-hover:scale-110 transition-transform" />
                        </div>
                        <div className="mt-8 text-center space-y-1 relative z-10">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Certificación Oficial</p>
                            <p className="text-lg font-bold text-white max-w-[300px] leading-tight">{course.title}</p>
                        </div>
                    </div>

                    <DialogFooter className="px-2 pb-6 flex flex-col sm:flex-row gap-4">
                        <Button variant="ghost" className="hover:bg-white/5 text-slate-500 hover:text-slate-300 rounded-2xl h-14 flex-1 order-2 sm:order-1" onClick={() => setIsCertDialogOpen(false)}>Luego</Button>
                        <Button className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-black h-14 rounded-2xl flex-[2] order-1 sm:order-2 shadow-xl shadow-indigo-900/30 transition-all hover:scale-[1.02] active:scale-95" onClick={async () => {
                            setIsGenerating(true);
                            try {
                                const { data: enrol } = await supabase.from('enrollments').select('id').eq('user_id', userId).eq('course_id', courseId).maybeSingle();
                                if (enrol) {
                                    await supabase.from('enrollments').update({ progress: 100, status: 'completed' }).eq('id', enrol.id);
                                    const cert = await courseService.generateCertificate(enrol.id, {});
                                    toast.success("Certificado gestionado con éxito.");
                                    queryClient.invalidateQueries({ queryKey: ["my-certificate"] });
                                    setIsCertDialogOpen(false);
                                    navigate(`/verify/${cert.id}`);
                                }
                            } catch (error: any) {
                                console.error(error);
                                toast.error("No se pudo generar el certificado");
                            } finally {
                                setIsGenerating(false);
                            }
                        }} disabled={isGenerating}>
                            {isGenerating ? <Loader2 className="w-5 h-5 mr-3 animate-spin" /> : <Download className="w-5 h-5 mr-3" />}
                            Descargar Certificado
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function CourseSidebarMobile({ course, activeModule, setActiveModule, completedLessons }: any) {
    return (
        <div className="flex flex-col h-full bg-[#0a0a0c]">
            <div className="p-8 border-b border-white/5 bg-gradient-to-br from-indigo-900/10 to-transparent">
                <h3 className="font-black text-xl text-white mb-1">Plan de Estudios</h3>
                <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.2em]">Navegación de Módulos</p>
            </div>
            <ScrollArea className="flex-1">
                <div className="p-4 space-y-4 pb-32">
                    {course.modules?.map((module: any, i: number) => {
                        const isActive = activeModule?.id === module.id;
                        const isDone = module.lessons?.every((l: any) => completedLessons.includes(l.id)) && module.lessons.length > 0;
                        return (
                            <button
                                key={module.id || i}
                                onClick={() => setActiveModule(module)}
                                className={cn(
                                    "w-full text-left p-5 rounded-3xl transition-all border",
                                    isActive ? "bg-white/5 border-indigo-500/30 shadow-lg" : "bg-transparent border-transparent"
                                )}
                            >
                                <div className="flex items-center gap-5">
                                    <div className={cn(
                                        "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0",
                                        isActive ? "bg-indigo-500 text-white" : "bg-slate-900 text-slate-600"
                                    )}>
                                        {isDone ? <CheckCircle className="w-5 h-5" /> : <Play className={cn("w-4 h-4", isActive && "fill-current")} />}
                                    </div>
                                    <div className="flex-1">
                                        <p className={cn("text-[9px] font-black uppercase tracking-widest mb-1.5", isActive ? "text-indigo-400" : "text-slate-700")}>
                                            Módulo {i + 1}
                                        </p>
                                        <h4 className={cn("font-bold text-sm leading-tight", isActive ? "text-white" : "text-slate-500")}>
                                            {module.title}
                                        </h4>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </ScrollArea>
        </div>
    );
}

function ClassroomLoadingState() {
    return (
        <div className="flex flex-col h-screen bg-[#0a0a0c] overflow-hidden">
            <header className="h-16 border-b border-white/5 flex items-center justify-between px-6 z-30">
                <div className="flex items-center gap-4">
                    <Skeleton className="w-8 h-8 rounded-lg bg-white/5" />
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-48 bg-white/5" />
                        <Skeleton className="h-2 w-32 bg-white/5" />
                    </div>
                </div>
            </header>
            <div className="flex flex-1 overflow-hidden">
                <main className="flex-1 p-8 space-y-8 overflow-y-auto">
                    <Skeleton className="aspect-video w-full max-w-6xl mx-auto rounded-3xl bg-white/[0.03]" />
                    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-6">
                            <Skeleton className="h-12 w-3/4 bg-white/[0.03]" />
                            <Skeleton className="h-60 w-full bg-white/[0.03] rounded-[2rem]" />
                        </div>
                        <Skeleton className="h-60 w-full bg-white/[0.03] rounded-[2rem]" />
                    </div>
                </main>
                <aside className="hidden md:block w-96 border-l border-white/5 p-6 space-y-4">
                    <Skeleton className="h-20 w-full bg-white/[0.03] rounded-[2rem]" />
                    <Skeleton className="h-20 w-full bg-white/[0.03] rounded-[2rem]" />
                    <Skeleton className="h-20 w-full bg-white/[0.03] rounded-[2rem]" />
                </aside>
            </div>
        </div>
    );
}

function getYouTubeId(url: string) {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}
