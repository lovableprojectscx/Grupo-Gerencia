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
  Zap
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

  // Helper for syllabus processing (if JSON)
  // Assuming Supabase returns correct structure, but we might need to parse simple JSON

  if (isLoading || !course) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gold animate-spin" />
      </div>
    );
  }

  const duration = course.duration || course.metadata?.find((m: any) => m.key.match(/duraci[oó]n/i))?.value || "A tu ritmo";




  // Transform course data if needed (e.g. if modules are not joined correctly yet, but service handles checks)
  // For now assuming service returns standard structure.

  const totalLessons = course.modules?.reduce((acc: number, module: any) => acc + (module.lessons?.length || 0), 0) || 0;

  const handleEnrollClick = () => {
    if (!user) {
      toast.error("Inicia sesión para inscribirte");
      navigate("/login");
      return;
    }
    navigate(`/checkout/${id}`);
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

      {/* --- Premium Hero Section --- */}
      <section className="relative pt-32 pb-20 overflow-hidden bg-slate-900">
        {/* Dynamic Background (Blurred) */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/90 to-slate-900/60 z-10" />
          <img
            src={course.image_url || "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=1200&h=600&fit=crop"}
            alt="Background"
            className="w-full h-full object-cover blur-2xl opacity-40 scale-110"
          />
        </div>

        <div className="container-custom relative z-20">
          <div className="grid lg:grid-cols-3 gap-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-2 space-y-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 text-slate-300 text-sm mb-6 font-medium">
                  <Link to="/" className="hover:text-white transition-colors">Inicio</Link>
                  <span>/</span>
                  <Link to="/catalogo" className="hover:text-white transition-colors">Catálogo</Link>
                  <span>/</span>
                  <span className="text-accent">{course.category || "General"}</span>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-3 mb-6">
                  {course.modality === 'live' && (
                    <Badge className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 px-3 py-1 text-sm">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse mr-2" />
                      En Vivo
                    </Badge>
                  )}
                  {course.modality !== 'live' && (
                    <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/20 px-3 py-1 text-sm">
                      <MonitorPlay className="w-3 h-3 mr-2" />
                      100% Online
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-white border-white/20 bg-white/5 backdrop-blur-md px-3 py-1 text-sm">
                    <Award className="w-3 h-3 mr-2" />
                    Certificado Incluido
                  </Badge>
                </div>

                {/* Mobile Image - Premium & Glare Effect */}
                <div className="block lg:hidden mb-8 relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-accent via-purple-500 to-blue-500 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000" />
                  <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/10 aspect-video">
                    <img
                      src={course.image_url || "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=1200&h=600&fit=crop"}
                      alt={course.title}
                      className="w-full h-full object-cover transform transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />

                    {/* Floating Mobile Badge */}
                    <div className="absolute bottom-3 right-3 bg-black/40 backdrop-blur-md text-white text-[10px] font-medium px-2 py-1 rounded-lg border border-white/10 flex items-center gap-1">
                      <Award className="w-3 h-3 text-accent" />
                      <span>Certificado</span>
                    </div>
                  </div>
                </div>

                {/* Title */}
                <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                  {course.title}
                </h1>



                {/* Subtitle */}
                <p className="text-lg md:text-xl text-slate-300 mb-8 max-w-2xl leading-relaxed">
                  {course.subtitle || course.description?.substring(0, 150) + "..."}
                </p>

                {/* Meta Info Bar */}
                <div className="flex flex-wrap items-center gap-6 md:gap-10 pb-8 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-white/5 border border-white/10">
                      <Users className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <div className="text-white font-bold">{course.students || 0}</div>
                      <div className="text-xs text-slate-400">Estudiantes</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-white/5 border border-white/10">
                      <Clock className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <div className="text-white font-bold">{duration}</div>
                      <div className="text-xs text-slate-400">Duración</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-white/5 border border-white/10">
                      <Star className="w-5 h-5 text-gold fill-gold" />
                    </div>
                    <div>
                      <div className="text-white font-bold">4.9</div>
                      <div className="text-xs text-slate-400">Valoración</div>
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

            {/* Right Column (Course Image) */}
            <div className="hidden lg:block relative perspective-1000">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, rotateY: -10 }}
                animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                transition={{ duration: 0.8, type: "spring" }}
                className="relative z-10 transform-gpu"
              >
                {/* Glow alignment */}
                <div className="absolute -inset-1 bg-gradient-to-r from-accent to-purple-600 rounded-2xl blur opacity-30 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />

                <img
                  src={course.image_url || "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=1200&h=600&fit=crop"}
                  alt={course.title}
                  className="relative w-full aspect-video object-cover rounded-2xl shadow-2xl border border-white/10"
                />

                {/* Floating Badge on Image */}
                <div className="absolute -bottom-6 -right-6 bg-card/10 backdrop-blur-xl border border-white/20 p-4 rounded-2xl shadow-xl flex items-center gap-3 animate-float delay-700">
                  <div className="bg-accent/20 p-2 rounded-full">
                    <Award className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <div className="text-white font-bold text-sm">Certificado Verificado</div>
                    <div className="text-white/60 text-xs">Incluido con tu matrícula</div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content & Sticky Sidebar */}
      <section className="py-12 lg:py-16 -mt-12 relative z-30">
        <div className="container-custom">
          <div className="grid lg:grid-cols-3 gap-8 lg:gap-12">
            {/* Content Column */}
            <div className="lg:col-span-2 space-y-12">

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
                  <h2 className="text-2xl font-bold text-foreground">Lo que aprenderás</h2>
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

                <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
                  <Accordion type="multiple" className="w-full">
                    {course.modules?.map((module: any, moduleIndex: number) => (
                      <AccordionItem
                        key={module.id}
                        value={`module-${moduleIndex}`}
                        className="px-6 border-b border-border/50 last:border-0 hover:bg-secondary/20 transition-colors"
                      >
                        <AccordionTrigger className="hover:no-underline py-5 group">
                          <div className="flex items-center gap-4 text-left w-full">
                            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-sm font-bold text-muted-foreground group-hover:bg-accent group-hover:text-white transition-colors">
                              {moduleIndex + 1}
                            </span>
                            <div className="flex-1">
                              <div className="font-semibold text-foreground group-hover:text-accent transition-colors">
                                {module.title}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {module.lessons?.length || 0} clases
                              </div>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="pl-12 pb-5 space-y-2">
                            {module.lessons?.map((lesson: any) => (
                              <div
                                key={lesson.id}
                                className="flex items-center justify-between py-2.5 px-4 rounded-xl bg-secondary/30 hover:bg-secondary/60 transition-colors group/lesson cursor-default"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="text-muted-foreground group-hover/lesson:text-accent transition-colors">
                                    {getLessonIcon(lesson.type)}
                                  </div>
                                  <span className="text-foreground/90 text-sm font-medium">{lesson.title}</span>
                                </div>
                                {lesson.type === 'video' && <div className="p-1.5 rounded-full bg-background shadow-sm"><Play className="w-3 h-3 text-accent fill-accent" /></div>}
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                    {!course.modules?.length && <div className="p-8 text-center text-muted-foreground italic">El contenido se está actualizando.</div>}
                  </Accordion>
                </div>
              </motion.div>
            </div>


            {/* Sticky Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 space-y-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="bg-card rounded-3xl p-6 shadow-xl shadow-slate-900/5 border border-border relative overflow-hidden"
                >
                  {/* Top Highlight Strip */}
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-accent via-purple-500 to-accent" />

                  <div className="mb-6">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-600 text-xs font-bold uppercase tracking-wider mb-3">
                      <Zap className="w-3.5 h-3.5 fill-current" />
                      Oferta Limitada
                    </span>
                    <div className="flex items-end gap-3 mb-2">
                      <span className="text-5xl font-bold text-foreground tracking-tight">
                        S/{course.price}
                      </span>
                      {course.original_price && (
                        <span className="text-xl text-muted-foreground line-through mb-1.5">
                          S/{course.original_price}
                        </span>
                      )}
                    </div>
                    {course.original_price && (
                      <p className="text-sm text-green-600 font-medium">
                        ¡Ahorras S/{course.original_price - course.price} hoy!
                      </p>
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
                        variant="hero"
                        size="xl"
                        className="w-full h-14 text-lg font-bold shadow-lg shadow-accent/25 hover:shadow-accent/40 hover:scale-[1.02] transition-all"
                        onClick={handleEnrollClick}
                      >
                        <Sparkles className="w-5 h-5 mr-2 animate-pulse" />
                        Inscribirse Ahora
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      size="lg"
                      className={`w-full h-12 font-medium border-border hover:bg-secondary/50 ${isFavorite ? "text-red-500 hover:text-red-600 border-red-200 bg-red-50" : "text-muted-foreground"}`}
                      onClick={handleToggleFavorite}
                      disabled={isTogglingFavorite}
                    >
                      <Heart className={`w-5 h-5 mr-2 ${isFavorite ? "fill-current" : ""}`} />
                      {isFavorite ? "En tus favoritos" : "Agregar a favoritos"}
                    </Button>
                  </div>

                  {/* Guarantee */}
                  <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Shield className="w-4 h-4 text-emerald-500" />
                    <span>Garantía de satisfacción y soporte</span>
                  </div>
                </motion.div>

                {/* Includes Card */}
                <div className="bg-card/50 backdrop-blur-sm rounded-2xl p-6 border border-border">
                  <h4 className="font-bold text-foreground mb-4 flex items-center gap-2">
                    <Award className="w-5 h-5 text-accent" />
                    Tu inscripción incluye
                  </h4>
                  <ul className="space-y-3 text-sm text-muted-foreground">
                    <li className="flex items-start gap-3">
                      <Check className="w-4 h-4 text-green-500 mt-0.5" />
                      <span>Acceso ilimitado al contenido</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="w-4 h-4 text-green-500 mt-0.5" />
                      <span>Certificado digital verificado</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="w-4 h-4 text-green-500 mt-0.5" />
                      <span>Recursos descargables (PDFs)</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="w-4 h-4 text-green-500 mt-0.5" />
                      <span>Soporte directo del instructor</span>
                    </li>
                  </ul>
                </div>
              </div>
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

      <Footer />
    </div >
  );

};

export default CursoDetalle;
