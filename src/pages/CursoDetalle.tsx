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
import { useCategories } from "@/hooks/useCategories";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { CourseCard } from "@/components/courses/CourseCard";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

const CursoDetalle = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { categories } = useCategories();

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

    setMeta('meta[property="og:title"]', "content", pageTitle);
    setMeta('meta[property="og:description"]', "content", description);
    setMeta('meta[property="og:image"]', "content", image);
    setMeta('meta[property="og:url"]', "content", url);
    setMeta('meta[property="og:type"]', "content", "product");
    setMeta('meta[name="description"]', "content", description);
    setMeta('meta[name="twitter:title"]', "content", pageTitle);
    setMeta('meta[name="twitter:description"]', "content", description);
    setMeta('meta[name="twitter:image"]', "content", image);

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
      <div className="min-h-screen bg-background font-sans selection:bg-accent/20 overflow-x-hidden w-full">
        <Navbar />
        {/* Skeleton Hero */}
        <section className="bg-hero-gradient pt-20 pb-16 lg:pt-28 lg:pb-20">
          <div className="container-custom">
            <div className="grid lg:grid-cols-5 gap-8 lg:gap-14 items-center">
              <div className="lg:col-span-3 space-y-5">
                <Skeleton className="h-6 w-1/3 bg-white/10 rounded" />
                <Skeleton className="h-10 sm:h-12 w-full max-w-xl bg-white/10 rounded-lg" />
                <Skeleton className="h-10 sm:h-12 w-2/3 max-w-lg bg-white/10 rounded-lg" />
                <Skeleton className="h-16 w-full max-w-xl bg-white/10 rounded-lg mt-4" />
                <div className="flex gap-4 pt-4 border-t border-white/10 mt-6">
                  <Skeleton className="w-12 h-12 rounded-full bg-white/10" />
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-20 bg-white/10 rounded" />
                    <Skeleton className="h-4 w-32 bg-white/10 rounded" />
                    <Skeleton className="h-3 w-24 bg-white/10 rounded" />
                  </div>
                </div>
              </div>
              <div className="hidden lg:block lg:col-span-2">
                <Skeleton className="aspect-video w-full rounded-2xl bg-white/10 shadow-2xl" />
              </div>
            </div>
          </div>
        </section>

        {/* Skeleton Content */}
        <section className="relative z-30 pb-20 bg-background">
          <div className="container-custom">
            <div className="grid lg:grid-cols-3 gap-8 lg:gap-12 pt-10">
              <div className="lg:col-span-1 lg:order-2 space-y-6">
                <Skeleton className="h-96 w-full rounded-3xl" />
                <Skeleton className="h-64 w-full rounded-2xl" />
              </div>
              <div className="lg:col-span-2 lg:order-1 space-y-8">
                <Skeleton className="h-64 w-full rounded-2xl" />
                <Skeleton className="h-96 w-full rounded-2xl" />
              </div>
            </div>
          </div>
        </section>
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
      navigate("/login", { state: { from: `/checkout/${id}` } });
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
    <div className="min-h-screen bg-background font-sans selection:bg-accent/20 overflow-x-hidden w-full">
      <Navbar />

      {/* ── Hero ── navy del brand, imagen en columna derecha */}
      <section className="bg-hero-gradient relative overflow-hidden pt-20 pb-16 lg:pt-28 lg:pb-20">

        {/* Brillo sutil de acento en esquina superior derecha */}
        <div className="pointer-events-none absolute -top-32 -right-32 w-[480px] h-[480px] rounded-full"
          style={{ background: 'radial-gradient(circle, hsl(160 84% 39% / 0.12) 0%, transparent 70%)' }} />
        {/* Toque dorado en esquina inferior izquierda */}
        <div className="pointer-events-none absolute -bottom-20 -left-20 w-[320px] h-[320px] rounded-full"
          style={{ background: 'radial-gradient(circle, hsl(43 74% 49% / 0.08) 0%, transparent 70%)' }} />

        {/* Línea de acento superior */}
        <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-transparent via-accent to-transparent opacity-70" />

        <div className="container-custom relative z-10">
          <div className="grid lg:grid-cols-5 gap-8 lg:gap-14 items-center">

            {/* ── Columna izquierda: contenido textual ── */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.55 }}
              className="lg:col-span-3 space-y-5"
            >
              {/* Breadcrumb */}
              <nav className="flex items-center gap-1.5 text-sm flex-wrap" aria-label="Breadcrumb">
                <Link to="/" className="text-white/50 hover:text-white/80 transition-colors">Inicio</Link>
                <span className="text-white/25">/</span>
                <Link to="/catalogo" className="text-white/50 hover:text-white/80 transition-colors">Catálogo</Link>
                <span className="text-white/25">/</span>
                <span className="text-accent font-medium">{categories.find(c => c.id === course.category)?.label || "General"}</span>
              </nav>

              {/* Badges de modalidad y certificado */}
              <div className="flex flex-wrap gap-2">
                {course.modality === 'live' ? (
                  <span className="inline-flex items-center gap-1.5 bg-red-500/15 text-red-300 border border-red-500/20 rounded-full px-3 py-1 text-xs font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                    En Vivo
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 bg-accent/15 text-accent border border-accent/20 rounded-full px-3 py-1 text-xs font-semibold">
                    <MonitorPlay className="w-3 h-3" />
                    100% Online
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 bg-gold/15 text-yellow-300 border border-yellow-400/20 rounded-full px-3 py-1 text-xs font-semibold">
                  <Award className="w-3 h-3" />
                  Certificado Incluido
                </span>
              </div>

              {/* Imagen solo en mobile */}
              <div className="block lg:hidden rounded-xl overflow-hidden aspect-video shadow-2xl border border-white/10">
                <img
                  src={course.image_url || "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800&h=450&fit=crop"}
                  alt={course.title}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Título */}
              <h1 className="text-[1.65rem] sm:text-3xl lg:text-[2.2rem] font-bold text-white leading-snug tracking-tight">
                {course.title}
              </h1>

              {/* Subtítulo si existe */}
              {course.subtitle && (
                <p className="text-white/65 text-base leading-relaxed max-w-xl">
                  {course.subtitle}
                </p>
              )}

              {/* Stats — tres fichas en fila */}
              <div className="flex flex-wrap gap-3 pt-1">
                <div className="flex items-center gap-2 bg-white/8 border border-white/10 rounded-lg px-3.5 py-2.5">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400 flex-shrink-0" />
                  <span className="text-white font-bold text-sm">4.9</span>
                  <span className="text-white/40 text-xs">valoración</span>
                </div>
                <div className="flex items-center gap-2 bg-white/8 border border-white/10 rounded-lg px-3.5 py-2.5">
                  <Users className="w-4 h-4 text-accent flex-shrink-0" />
                  <span className="text-white font-bold text-sm">{displayStudents}</span>
                  <span className="text-white/40 text-xs">alumnos</span>
                </div>
                <div className="flex items-center gap-2 bg-white/8 border border-white/10 rounded-lg px-3.5 py-2.5">
                  <Clock className="w-4 h-4 text-white/50 flex-shrink-0" />
                  <span className="text-white font-bold text-sm">{duration}</span>
                </div>
              </div>

              {/* Instructor */}
              <div className="flex items-center gap-3 pt-3 border-t border-white/10">
                <img
                  src={course.instructor?.avatar_url || "https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=80&h=80&fit=crop"}
                  alt={course.instructor?.name || "Instructor"}
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-accent/50 flex-shrink-0"
                />
                <div>
                  <p className="text-white/40 text-xs mb-0.5">Impartido por</p>
                  <p className="text-white font-semibold text-sm">{course.instructor?.name || "Docente Especialista"}</p>
                  <p className="text-accent text-xs">{course.instructor?.title || "Experto en la materia"}</p>
                </div>
              </div>
            </motion.div>

            {/* ── Columna derecha: imagen del curso ── */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="hidden lg:block lg:col-span-2"
            >
              <div className="relative rounded-2xl overflow-hidden shadow-[0_30px_70px_rgba(0,0,0,0.5)] border border-white/10 aspect-video">
                <img
                  src={course.image_url || "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800&h=450&fit=crop"}
                  alt={course.title}
                  className="w-full h-full object-cover"
                />
                {/* Sombra interna inferior para darle profundidad */}
                <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-black/30 to-transparent" />
              </div>
            </motion.div>

          </div>
        </div>

        {/* Separador inferior: línea sutil que marca el fin del hero */}
        <div className="absolute bottom-0 inset-x-0 h-px bg-white/8" />
      </section>

      {/* Main Content & Sticky Sidebar */}
      <section className="relative z-30 pb-20 bg-background">
        <div className="container-custom">
          <div className="grid lg:grid-cols-3 gap-8 lg:gap-12 pt-10 relative z-40">

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
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent via-amber-400 to-accent" />

                  {/* Precio */}
                  <div className="mb-6 pt-2">
                    {course.original_price && (
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-sm text-muted-foreground line-through">S/{course.original_price}</span>
                        <span className="text-xs font-black text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full ring-1 ring-emerald-500/20">
                          -{Math.round(((course.original_price - course.price) / course.original_price) * 100)}% OFF
                        </span>
                      </div>
                    )}
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-bold text-muted-foreground">S/</span>
                      <span className="text-4xl font-black text-foreground tracking-tight">{course.price}</span>
                    </div>
                    {course.original_price && (
                      <p className="text-sm text-emerald-600 dark:text-emerald-400 font-semibold mt-2 flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5" />
                        Ahorras S/{course.original_price - course.price} en tu inversión
                      </p>
                    )}
                  </div>

                  <div className="space-y-3">
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
                          <Clock className="w-5 h-5 mr-2" /> Pendiente de aprobación
                        </Button>
                      )
                    ) : (
                      <Button
                        size="xl"
                        className="w-full h-14 text-base font-bold relative overflow-hidden group bg-accent hover:bg-accent/90 text-accent-foreground border-0 shadow-lg shadow-accent/30 hover:shadow-accent/50 hover:scale-[1.015] transition-all duration-300"
                        onClick={handleEnrollClick}
                      >
                        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out pointer-events-none" />
                        <ArrowRight className="w-5 h-5 mr-2 group-hover:translate-x-0.5 transition-transform" />
                        Inscribirme en este curso
                      </Button>
                    )}

                    <div className="flex gap-2 relative z-50">
                      <Button
                        variant="ghost"
                        size="lg"
                        className={`flex-1 h-11 font-medium border transition-colors ${isFavorite ? "border-rose-200 bg-rose-50 text-rose-500 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-400" : "border-border text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
                        onClick={handleToggleFavorite}
                        disabled={isTogglingFavorite}
                      >
                        <Heart className={`w-4 h-4 mr-2 ${isFavorite ? "fill-current" : ""}`} />
                        {isFavorite ? "Guardado" : "Guardar"}
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-11 h-11 flex-shrink-0 border border-border hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                            title="Compartir curso"
                          >
                            <Share2 className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 p-2 rounded-2xl shadow-xl">
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

                  {/* Trust badges */}
                  <div className="mt-6 pt-5 border-t border-border grid grid-cols-3 gap-2 text-center">
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                        <Shield className="w-4 h-4 text-emerald-500" />
                      </div>
                      <span className="text-[10px] font-medium text-muted-foreground leading-tight">Pago<br />seguro</span>
                    </div>
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                        <Award className="w-4 h-4 text-accent" />
                      </div>
                      <span className="text-[10px] font-medium text-muted-foreground leading-tight">Certificado<br />incluido</span>
                    </div>
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                        <Globe className="w-4 h-4 text-blue-500" />
                      </div>
                      <span className="text-[10px] font-medium text-muted-foreground leading-tight">Acceso<br />ilimitado</span>
                    </div>
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
                    id={relatedCourse.slug || relatedCourse.id}
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
                  className="w-full h-11 text-[14px] font-bold relative overflow-hidden group bg-accent hover:bg-accent/90 text-accent-foreground border-0 shadow-lg shadow-accent/30 hover:scale-[1.02] transition-all duration-300 rounded-xl"
                  onClick={handleEnrollClick}
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out pointer-events-none" />
                  <ArrowRight className="w-4 h-4 mr-1.5 group-hover:translate-x-0.5 transition-transform" />
                  Inscribirme
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
