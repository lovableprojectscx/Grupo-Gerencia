import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Play,
  Clock,
  Users,
  Star,
  Award,
  Calendar,
  CheckCircle,
  Video,
  Download,
  Share2,
  Heart,
  Shield,
  Linkedin,
  Mail,
  Loader2,
  FileText,
  Sparkles,
  Check,
  Globe,
  MonitorPlay,
  ArrowRight,
  Zap,
  BookOpen,
  MessageCircle,
  MessageSquare,
  Link as LinkIcon,
  Facebook,
  Twitter,
} from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { courseService } from "@/services/courseService";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { CourseCard } from "@/components/courses/CourseCard";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const CursoDetalle = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  // Fetch course details
  const { data: course, isLoading } = useQuery({
    queryKey: ["course", id],
    queryFn: () => courseService.getById(id!),
    enabled: !!id
  });

  // Actualizar título y meta tags de Open Graph dinámicamente
  useEffect(() => {
    if (!course) return;

    const siteName = "Gerencia y Desarrollo Global";
    const pageTitle = `${course.title} | ${siteName}`;
    const description = course.subtitle || course.description?.slice(0, 160) || "Curso especializado con certificado verificable.";
    const image = course.image_url || "https://grupogerenciaglobal.com/og-default.jpg";
    const url = window.location.href;

    document.title = pageTitle;

    const setMeta = (selector: string, attr: string, content: string) => {
      let el = document.querySelector<HTMLMetaElement>(selector);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr === "content" ? "property" : "name", selector.match(/\[(?:property|name)="([^"]+)"\]/)?.[1] ?? "");
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    setMeta('meta[property="og:title"]',       "content", pageTitle);
    setMeta('meta[property="og:description"]', "content", description);
    setMeta('meta[property="og:image"]',        "content", image);
    setMeta('meta[property="og:url"]',          "content", url);
    setMeta('meta[property="og:type"]',         "content", "product");
    setMeta('meta[name="description"]',         "content", description);
    setMeta('meta[name="twitter:title"]',       "content", pageTitle);
    setMeta('meta[name="twitter:description"]', "content", description);
    setMeta('meta[name="twitter:image"]',       "content", image);

    return () => {
      document.title = `${siteName} - Cursos Especializados y Certificaciones`;
    };
  }, [course]);

  // Check enrollment status
  const { data: enrollment, isLoading: loadingEnrollment } = useQuery({
    queryKey: ["enrollment", id, user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('enrollments')
        .select('*')
        .eq('user_id', user.id)
        .eq('course_id', id)
        .maybeSingle();

      if (error) {
        // Log real errors but don't crash
        console.error("Error fetching enrollment:", error);
        return null; // Equivalent to not finding one
      }
      return data; // returns data or null
    },
    enabled: !!id && !!user
  });

  const queryClient = useQueryClient();

  // Favorite status
  const { data: isFavorite, isLoading: isLoadingFavorite } = useQuery({
    queryKey: ["favorite", id, user?.id],
    queryFn: () => courseService.getFavoriteStatus(user!.id, id!),
    enabled: !!user && !!id
  });

  const { data: relatedCourses } = useQuery({
    queryKey: ["related-courses", id, course?.category],
    queryFn: () => courseService.getRelatedCourses(id!, course!.category),
    enabled: !!id && !!course?.category
  });

  const { mutate: toggleFavorite, isPending: isTogglingFavorite } = useMutation({
    mutationFn: () => courseService.toggleFavorite(user!.id, id!, !!isFavorite),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorite", id, user?.id] });
      toast.success(isFavorite ? "Eliminado de favoritos" : "Agregado a favoritos");
    },
    onError: (err: any) => toast.error("Error: " + err.message)
  });

  const handleToggleFavorite = () => {
    if (!user) {
      toast.error("Inicia sesión para guardar favoritos");
      navigate("/login");
      return;
    }
    toggleFavorite();
  };

  if (isLoading || !course) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gold animate-spin" />
      </div>
    );
  }

  const duration = course.duration || course.metadata?.find((m: any) => m.key.match(/duraci[oó]n/i))?.value || "A tu ritmo";

  const totalLessons = course.modules?.reduce((acc: number, module: any) => acc + (module.lessons?.length || 0), 0) || 0;

  // Display count is now provided by the service
  const displayStudents = course.students || 0;

  const handleEnrollClick = () => {
    if (!user) {
      toast.error("Inicia sesión para inscribirte");
      navigate("/login");
      return;
    }
    navigate(`/checkout/${id}`);
  };

  const handleShare = async () => {
    const url = window.location.href;
    const shareData = {
      title: course?.title || 'Curso en Gerencia y Desarrollo Global',
      text: `Echa un vistazo a este increíble curso: ${course?.title}`,
      url: url,
    };

    try {
      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("¡Enlace copiado al portapapeles!");
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        toast.error("Error al compartir el enlace");
        console.error("Error sharing:", err);
      }
    }
  };

  const getShareUrl = () => window.location.href;
  const getShareText = () => `¡Descubre este increíble curso en Gerencia y Desarrollo Global!\n\n${course?.title}\n\n`;

  const shareViaWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(getShareText() + getShareUrl())}`, '_blank');
  };

  const shareViaFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(getShareUrl())}`, '_blank');
  };

  const shareViaTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(getShareText())}&url=${encodeURIComponent(getShareUrl())}`, '_blank');
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(getShareUrl());
      toast.success("¡Enlace copiado al portapapeles!");
    } catch (err) {
      toast.error("Error al copiar el enlace");
    }
  };

  const getLessonIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Video className="w-4 h-4" />;
      case "practice":
        return <FileText className="w-4 h-4" />;
      case "quiz":
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-background font-sans selection:bg-accent/20">
      <Navbar />

      {/* --- Ultra-Premium Hero Section --- */}
      <section className="relative pt-24 pb-20 lg:pt-36 lg:pb-32 overflow-hidden bg-[#0A0F1C]">
        {/* Modern Mesh Gradient Background */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <div className="absolute inset-0 bg-[#0A0F1C] z-0" />
          {/* Animated Glow Orbs */}
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse-slow" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse-slow" style={{ animationDelay: '2s' }} />
          <div className="absolute top-[20%] right-[20%] w-[30%] h-[30%] bg-accent/20 rounded-full blur-[100px] mix-blend-screen" />

          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0A0F1C]/80 to-[#0A0F1C] z-10" />
          <img
            src={course.image_url || "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=1200&h=600&fit=crop"}
            alt="Background"
            className="w-full h-full object-cover blur-3xl opacity-20 scale-125 saturate-150"
          />
          {/* Overlay grid pattern for texture */}
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay z-10" />
        </div>

        <div className="container-custom relative z-20">
          <div className="grid lg:grid-cols-3 gap-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-2 space-y-6 lg:space-y-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                {/* Breadcrumb - Hidden on mobile */}
                <div className="hidden sm:flex items-center gap-2 text-slate-300 text-sm mb-6 font-medium">
                  <Link to="/" className="hover:text-white transition-colors">Inicio</Link>
                  <span>/</span>
                  <Link to="/catalogo" className="hover:text-white transition-colors">Catálogo</Link>
                  <span>/</span>
                  <span className="text-accent">{course.category || "General"}</span>
                </div>

                {/* Badges - Glassmorphism */}
                <div className="flex flex-wrap gap-3 mb-4 lg:mb-8">
                  {course.modality === 'live' && (
                    <Badge className="bg-white/5 hover:bg-white/10 text-white border border-white/10 backdrop-blur-xl px-3 py-1 text-xs lg:text-sm shadow-xl font-medium">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse mr-2 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                      En Vivo
                    </Badge>
                  )}
                  {course.modality !== 'live' && (
                    <Badge className="bg-white/5 hover:bg-white/10 text-white border border-white/10 backdrop-blur-xl px-3 py-1 text-xs lg:text-sm shadow-xl font-medium">
                      <MonitorPlay className="w-3.5 h-3.5 mr-2 text-emerald-400" />
                      100% Online
                    </Badge>
                  )}
                  <Badge className="bg-white/5 hover:bg-white/10 text-white border border-white/10 backdrop-blur-xl px-3 py-1 text-xs lg:text-sm shadow-xl font-medium">
                    <Award className="w-3.5 h-3.5 mr-2 text-gold" />
                    Certificado Incluido
                  </Badge>
                </div>

                {/* Mobile Image - Premium & Glare Effect */}
                <div className="block lg:hidden mb-6 relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-accent via-purple-500 to-blue-500 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000" />
                  <div className="relative rounded-xl lg:rounded-2xl overflow-hidden shadow-2xl border border-white/10 aspect-video">
                    <img
                      src={course.image_url || "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=1200&h=600&fit=crop"}
                      alt={course.title}
                      className="w-full h-full object-cover transform transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
                  </div>
                </div>

                {/* Title - Premium Layout */}
                <h1 className="text-3xl md:text-5xl lg:text-[4rem] font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/70 tracking-tight leading-[1.1] mb-8 lg:mb-10">
                  {course.title}
                </h1>

                {/* Modern Glassy Stats */}
                <div className="flex flex-wrap items-center gap-3 lg:gap-5 pb-6 lg:pb-8 border-b border-white/10">
                  <div className="flex items-center gap-3 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-2.5 lg:p-3 shadow-xl hover:bg-white/10 transition-colors cursor-default">
                    <div className="p-2 rounded-xl bg-accent/20 border border-accent/20 shadow-[0_0_15px_rgba(var(--accent),0.3)]">
                      <Users className="w-4 h-4 text-accent" />
                    </div>
                    <div className="pr-2">
                      <div className="text-white font-bold text-sm leading-tight">{displayStudents}</div>
                      <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Alumnos</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-2.5 lg:p-3 shadow-xl hover:bg-white/10 transition-colors cursor-default">
                    <div className="p-2 rounded-xl bg-purple-500/20 border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                      <Clock className="w-4 h-4 text-purple-400" />
                    </div>
                    <div className="pr-2">
                      <div className="text-white font-bold text-sm leading-tight">{duration}</div>
                      <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Duración</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-2.5 lg:p-3 shadow-xl hover:bg-white/10 transition-colors cursor-default">
                    <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                      <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    </div>
                    <div className="pr-2">
                      <div className="text-white font-bold text-sm leading-tight">4.9 / 5.0</div>
                      <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Valoración</div>
                    </div>
                  </div>
                </div>

                {/* Instructor (In Hero for Desktop) */}
                <div className="pt-8 flex items-center gap-4">
                  <img
                    src={course.instructor?.avatar_url || "https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=100&h=100&fit=crop"}
                    alt={course.instructor?.name || "Instructor"}
                    className="w-14 h-14 rounded-full object-cover ring-2 ring-accent/50 bg-slate-800"
                  />
                  <div>
                    <div className="text-slate-400 text-sm mb-1">Impartido por</div>
                    <div className="text-white font-bold text-lg">{course.instructor?.name || "Docente Especialista"}</div>
                    <div className="text-accent text-sm">{course.instructor?.title || "Experto en la materia"}</div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Right Column (Course Image) - 3D Tilt Effect */}
            <div className="hidden lg:block relative perspective-1000 group/image">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.8, type: "spring" }}
                className="relative z-10 transform-gpu transition-all duration-500 group-hover/image:rotate-y-[2deg] group-hover/image:rotate-x-[-2deg] group-hover/image:scale-[1.02]"
                style={{ transformStyle: 'preserve-3d' }}
              >
                {/* Glow alignment */}
                <div className="absolute -inset-4 bg-gradient-to-tr from-accent via-purple-600 to-blue-500 rounded-[2rem] blur-2xl opacity-40 group-hover/image:opacity-70 transition duration-700 animate-pulse-slow" />

                {/* Glass Border Container */}
                <div className="relative rounded-2xl p-2.5 bg-white/5 backdrop-blur-sm border border-white/10 shadow-2xl">
                  <div className="relative rounded-xl overflow-hidden border border-white/10 ring-1 ring-black/20 shadow-inner">
                    <img
                      src={course.image_url || "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=1200&h=600&fit=crop"}
                      alt={course.title}
                      className="relative w-full aspect-video object-cover transform transition-transform duration-1000 group-hover/image:scale-105"
                    />
                    {/* Inner shadow overlay for depth */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />
                  </div>
                </div>

                {/* Floating Badge on Image - Enhanced */}
                <div
                  className="absolute -bottom-8 -right-8 bg-[#0A0F1C]/80 backdrop-blur-2xl border border-white/10 p-4.5 rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.5)] flex items-center gap-4 animate-float transform-gpu transition-transform group-hover/image:translate-x-2 group-hover/image:-translate-y-2"
                >
                  <div className="bg-gradient-to-br from-emerald-400 to-emerald-600 p-3 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.4)]">
                    <Award className="w-6 h-6 text-white" />
                  </div>
                  <div className="pr-4">
                    <div className="text-white font-extrabold text-sm tracking-wide">Certificación<br />Verificada</div>
                    <div className="text-emerald-400 text-xs font-medium uppercase tracking-wider mt-0.5">Incluida</div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content & Sticky Sidebar - Overlapping Layout */}
      <section className="relative z-30 pb-20">
        {/* Decorative Transition Background */}
        <div className="absolute top-0 left-0 w-full h-40 bg-gradient-to-b from-[#0A0F1C] to-transparent pointer-events-none" />

        <div className="container-custom">
          <div className="grid lg:grid-cols-3 gap-8 lg:gap-12 -mt-10 lg:-mt-24 relative z-40">

            {/* Sticky Sidebar (First in JSX for Mobile) */}
            <div className="lg:col-span-1 lg:order-2">
              <div className="sticky top-28 space-y-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="hidden lg:block bg-card rounded-3xl p-6 shadow-xl shadow-slate-900/5 border border-border relative overflow-hidden"
                >
                  {/* Top Highlight Strip */}
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-accent via-purple-500 to-accent" />

                  <div className="mb-8">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 text-[10px] font-black uppercase tracking-widest mb-4 ring-1 ring-red-500/20">
                      <Zap className="w-3.5 h-3.5 fill-current animate-pulse" />
                      Oferta Limitada
                    </div>
                    <div className="flex items-baseline gap-3 mb-1">
                      <span className="text-5xl md:text-6xl font-extrabold text-foreground tracking-tighter">
                        S/{course.price}
                      </span>
                      {course.original_price && (
                        <span className="text-2xl text-muted-foreground/60 line-through decoration-2 decoration-red-500/30">
                          S/{course.original_price}
                        </span>
                      )}
                    </div>
                    {course.original_price && (
                      <div className="inline-flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2 py-1 rounded-md mt-2">
                        <Check className="w-4 h-4" />
                        Ahorras S/{course.original_price - course.price} hoy
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    {enrollment ? (
                      enrollment.status === 'active' ? (
                        <Button variant="default" size="xl" className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg shadow-lg shadow-emerald-600/20" onClick={() => navigate(`/classroom/${id}`)}>
                          <Play className="w-5 h-5 mr-2" /> Ir al Aula Virtual
                        </Button>
                      ) : enrollment.status === 'rejected' ? (
                        <div className="bg-destructive/10 text-destructive p-4 rounded-xl text-center font-medium">
                          Inscripción rechazada. Contacta soporte.
                        </div>
                      ) : (
                        <Button variant="outline" size="xl" className="w-full h-14 cursor-default border-yellow-500 text-yellow-600 bg-yellow-50 hover:bg-yellow-50 text-lg font-bold">
                          <Clock className="w-5 h-5 mr-2" /> Pendiente
                        </Button>
                      )
                    ) : (
                      <Button
                        size="xl"
                        className="w-full h-14 text-lg font-extrabold shadow-[0_0_40px_rgba(220,38,38,0.4)] hover:shadow-[0_0_60px_rgba(220,38,38,0.6)] bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 hover:scale-[1.02] transition-all text-white border-0"
                        onClick={handleEnrollClick}
                      >
                        <Sparkles className="w-5 h-5 mr-2 animate-pulse" />
                        Inscribirse Ahora
                      </Button>
                    )}

                    <div className="flex gap-2 relative z-50">
                      <Button
                        variant="ghost"
                        size="lg"
                        className={`flex-1 h-12 font-medium border border-border hover:bg-secondary hover:text-foreground transition-colors ${isFavorite ? "text-red-500 hover:text-red-600 border-red-200 bg-red-50" : "text-muted-foreground"}`}
                        onClick={handleToggleFavorite}
                        disabled={isTogglingFavorite}
                      >
                        <Heart className={`w-5 h-5 mr-2 ${isFavorite ? "fill-current" : ""}`} />
                        {isFavorite ? "En favoritos" : "Guardar"}
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-12 h-12 flex-shrink-0 border border-border hover:bg-secondary hover:text-foreground text-muted-foreground transition-colors"
                            title="Compartir curso"
                          >
                            <Share2 className="w-5 h-5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 p-2 rounded-2xl shadow-xl data-[side=bottom]:animate-slide-up-fade">
                          <DropdownMenuLabel className="font-bold text-foreground opacity-70">Compartir por...</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={shareViaWhatsApp} className="gap-3 cursor-pointer py-3 rounded-xl focus:bg-emerald-50 focus:text-emerald-700 dark:focus:bg-emerald-950/50">
                            <MessageCircle className="w-5 h-5 text-emerald-500" />
                            <span className="font-medium">WhatsApp</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={shareViaFacebook} className="gap-3 cursor-pointer py-3 rounded-xl focus:bg-blue-50 focus:text-blue-700 dark:focus:bg-blue-950/50">
                            <Facebook className="w-5 h-5 text-blue-600" />
                            <span className="font-medium">Messenger</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={shareViaTwitter} className="gap-3 cursor-pointer py-3 rounded-xl focus:bg-black/5 dark:focus:bg-white/10">
                            <Twitter className="w-5 h-5 text-sky-500" />
                            <span className="font-medium">Twitter / X</span>
                          </DropdownMenuItem>
                          {navigator.share && (
                            <DropdownMenuItem onClick={handleShare} className="gap-3 cursor-pointer py-3 rounded-xl focus:bg-accent/10">
                              <Share2 className="w-5 h-5 text-accent" />
                              <span className="font-medium">Más opciones...</span>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={copyLink} className="gap-3 cursor-pointer py-3 rounded-xl focus:bg-muted">
                            <LinkIcon className="w-5 h-5 text-muted-foreground" />
                            <span className="font-medium">Copiar enlace</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Guarantee */}
                  <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Shield className="w-4 h-4 text-emerald-500" />
                    <span>Garantía de satisfacción y soporte</span>
                  </div>
                </motion.div>

                {/* Includes Card */}
                <div className="bg-card/40 backdrop-blur-md rounded-2xl p-6 border border-border mt-6">
                  <h4 className="font-bold text-foreground mb-5 flex items-center gap-2 text-lg">
                    <Sparkles className="w-5 h-5 text-accent" />
                    Tu inversión incluye:
                  </h4>
                  <ul className="space-y-4 text-sm text-muted-foreground">
                    <li className="flex items-start gap-3 group">
                      <div className="p-1.5 rounded-full bg-emerald-500/10 text-emerald-500 group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                      <span className="leading-tight pt-1">Acceso <strong className="text-foreground font-semibold">ilimitado e inmediato</strong> al contenido</span>
                    </li>
                    <li className="flex items-start gap-3 group">
                      <div className="p-1.5 rounded-full bg-emerald-500/10 text-emerald-500 group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                      <span className="leading-tight pt-1"><strong className="text-foreground font-semibold">Certificado verificado</strong> con código QR único</span>
                    </li>
                    <li className="flex items-start gap-3 group">
                      <div className="p-1.5 rounded-full bg-emerald-500/10 text-emerald-500 group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                      <span className="leading-tight pt-1">Recursos, plantillas y <strong className="text-foreground font-semibold">material descargable</strong></span>
                    </li>
                    <li className="flex items-start gap-3 group">
                      <div className="p-1.5 rounded-full bg-emerald-500/10 text-emerald-500 group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                      <span className="leading-tight pt-1">Soporte y <strong className="text-foreground font-semibold">resolución de dudas</strong> continuo</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Content Column (Second in JSX for Mobile) */}
            <div className="lg:col-span-2 lg:order-1 space-y-12">

              {/* Description */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-card rounded-2xl p-8 border border-border shadow-sm"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-lg bg-accent/10">
                    <FileText className="w-6 h-6 text-accent" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">Descripción</h2>
                </div>
                <div className="prose prose-lg text-muted-foreground max-w-none whitespace-pre-line leading-relaxed">
                  {course.description}
                </div>
              </motion.div>

              {/* Syllabus */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-accent/10">
                      <CheckCircle className="w-6 h-6 text-accent" />
                    </div>
                    <h2 className="text-2xl font-bold text-foreground">Contenido del Curso</h2>
                  </div>
                  <span className="text-sm px-3 py-1 rounded-full bg-secondary text-muted-foreground font-medium">
                    {course.modules?.length || 0} módulos
                  </span>
                </div>

                <div className="w-full space-y-4">
                  <Accordion type="multiple" className="w-full space-y-4">
                    {course.modules?.map((module: any, moduleIndex: number) => (
                      <AccordionItem
                        key={module.id}
                        value={`module-${moduleIndex}`}
                        className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-accent/30 transition-all px-2 md:px-4"
                      >
                        <AccordionTrigger className="hover:no-underline py-5 group px-4">
                          <div className="flex items-center gap-4 text-left w-full">
                            <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-sm font-black text-muted-foreground group-hover:bg-accent group-hover:text-white group-hover:scale-110 transition-all shadow-inner">
                              {moduleIndex + 1}
                            </span>
                            <div className="flex-1">
                              <div className="font-bold text-lg text-foreground group-hover:text-accent transition-colors leading-tight">
                                {module.title}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1.5 font-medium flex items-center gap-1.5">
                                <BookOpen className="w-3.5 h-3.5" /> {module.lessons?.length || 0} clases incluidas
                              </div>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="pl-[4.5rem] pr-4 pb-6 space-y-2.5">
                            {module.lessons?.map((lesson: any) => (
                              <div
                                key={lesson.id}
                                className="flex items-center justify-between py-3 px-4 rounded-xl bg-secondary/20 hover:bg-secondary/60 border border-transparent hover:border-border/50 transition-all group/lesson cursor-default"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="text-muted-foreground/60 group-hover/lesson:text-accent group-hover/lesson:scale-110 transition-all">
                                    {getLessonIcon(lesson.type)}
                                  </div>
                                  <span className="text-foreground/90 text-sm font-medium">{lesson.title}</span>
                                </div>
                                {lesson.type === 'video' && <div className="p-1.5 rounded-full bg-background shadow-sm border border-border/50"><Play className="w-3 h-3 text-accent fill-accent" /></div>}
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                    {!course.modules?.length && <div className="p-10 text-center text-muted-foreground italic bg-card rounded-2xl border border-dashed">El contenido metodológico se está actualizando para brindarte la mejor experiencia.</div>}
                  </Accordion>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Recommended Courses */}
      {
        relatedCourses && relatedCourses.length > 0 && (
          <section className="py-20 bg-secondary/20 border-t border-border">
            <div className="container-custom">
              <div className="flex items-center justify-between mb-10">
                <h2 className="text-3xl font-bold text-foreground">
                  Sigue aprendiendo
                </h2>
                <Link to="/catalogo" className="text-primary font-semibold hover:text-primary/80 transition-colors flex items-center gap-2">
                  Ver todo <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {relatedCourses.map((relatedCourse: any) => (
                  <CourseCard
                    key={relatedCourse.id}
                    id={relatedCourse.id}
                    title={relatedCourse.title}
                    image={relatedCourse.image_url}
                    price={relatedCourse.price}
                    originalPrice={relatedCourse.original_price}
                    rating={5.0}
                    students={relatedCourse.students}
                    duration={relatedCourse.duration || "Flexible"}
                    category={relatedCourse.category}
                    level={relatedCourse.level}
                    instructor={relatedCourse.instructor?.name || "Instructor"}
                  />
                ))}
              </div>
            </div>
          </section>
        )
      }

      {/* Mobile Sticky CTA */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 p-4 bg-[#0A0F1C]/95 backdrop-blur-2xl border-t border-white/10 shadow-[0_-20px_40px_rgba(0,0,0,0.5)] pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col flex-shrink-0">
            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider mb-0.5 flex items-center gap-1">
              <Zap className="w-3 h-3 fill-current" /> Oferta
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white">S/{course.price}</span>
              {course.original_price && (
                <span className="text-xs text-white/40 line-through">S/{course.original_price}</span>
              )}
            </div>
          </div>

          <div className="flex-1 flex gap-2 items-center justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 flex-shrink-0 rounded-xl border-white/10 text-white/70 bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <Share2 className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="top" sideOffset={12} className="w-56 p-2 rounded-2xl shadow-2xl relative z-[100] border-white/10 bg-[#0A0F1C]/95 backdrop-blur-2xl text-white data-[side=top]:animate-slide-down-fade">
                <DropdownMenuLabel className="font-bold text-white/70">Compartir por...</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem onClick={shareViaWhatsApp} className="gap-3 cursor-pointer py-3 rounded-xl focus:bg-emerald-500/20 focus:text-white">
                  <MessageCircle className="w-5 h-5 text-emerald-400" />
                  <span className="font-medium">WhatsApp</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={shareViaFacebook} className="gap-3 cursor-pointer py-3 rounded-xl focus:bg-blue-500/20 focus:text-white">
                  <Facebook className="w-5 h-5 text-blue-400" />
                  <span className="font-medium">Messenger</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={shareViaTwitter} className="gap-3 cursor-pointer py-3 rounded-xl focus:bg-white/10 focus:text-white">
                  <Twitter className="w-5 h-5 text-sky-400" />
                  <span className="font-medium">Twitter / X</span>
                </DropdownMenuItem>
                {navigator.share && (
                  <DropdownMenuItem onClick={handleShare} className="gap-3 cursor-pointer py-3 rounded-xl focus:bg-accent/20 focus:text-white">
                    <Share2 className="w-5 h-5 text-accent" />
                    <span className="font-medium">Menú nativo</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem onClick={copyLink} className="gap-3 cursor-pointer py-3 rounded-xl focus:bg-white/10 focus:text-white">
                  <LinkIcon className="w-5 h-5 text-white/60" />
                  <span className="font-medium">Copiar enlace</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="outline"
              size="icon"
              className={`h-11 w-11 flex-shrink-0 rounded-xl border-white/10 ${isFavorite ? "text-red-400 border-red-500/30 bg-red-500/10" : "text-white/70 bg-white/5"} hover:bg-white/10 transition-colors`}
              onClick={handleToggleFavorite}
              disabled={isTogglingFavorite}
            >
              <Heart className={`w-5 h-5 ${isFavorite ? "fill-current" : ""}`} />
            </Button>

            <div className="w-full max-w-[160px]">
              {enrollment ? (
                enrollment.status === 'active' ? (
                  <Button variant="default" className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-600/20 rounded-xl" onClick={() => navigate(`/classroom/${id}`)}>
                    <Play className="w-4 h-4 mr-2 text-white" /> Aula
                  </Button>
                ) : enrollment.status === 'rejected' ? (
                  <div className="bg-destructive/10 text-destructive h-11 flex items-center justify-center rounded-xl text-sm font-bold">
                    Rechazada
                  </div>
                ) : (
                  <Button variant="outline" className="w-full h-11 cursor-default border-yellow-500 text-yellow-600 bg-yellow-50 rounded-xl font-bold">
                    <Clock className="w-4 h-4 mr-2" /> Pendiente
                  </Button>
                )
              ) : (
                <Button
                  className="w-full h-11 text-[15px] font-extrabold shadow-[0_0_20px_rgba(220,38,38,0.4)] bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white border-0 hover:scale-[1.02] transition-all rounded-xl"
                  onClick={handleEnrollClick}
                >
                  <Sparkles className="w-4 h-4 mr-1.5 animate-pulse" />
                  Inscribirse
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="pb-24 lg:pb-0">
        <Footer />
      </div>
    </div>
  );
};

export default CursoDetalle;
