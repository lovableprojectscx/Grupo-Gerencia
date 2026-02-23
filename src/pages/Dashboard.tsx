
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, GraduationCap, Clock, Award, PlayCircle, CheckCircle, Download, ExternalLink, LogOut, Loader2, Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/layout/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { Footer } from "@/components/layout/Footer";
import { useState } from "react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { courseService } from "@/services/courseService";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const Dashboard = () => {
  const { user, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("courses");
  const { settings } = useSiteSettings();

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
    toast.success("Sesión cerrada");
  };

  const { data: enrollments, isLoading: bookingsLoading } = useQuery({
    queryKey: ['my-enrollments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('enrollments')
        .select(`
                *,
                course:courses(id, title, image_url),
                certificate:certificates(id)
            `)
        .eq('user_id', user?.id) // Use Auth ID directly for reliability
        .order('purchased_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5 // 5 minutes
  });

  const { data: favorites, isLoading: favoritesLoading } = useQuery({
    queryKey: ['my-favorites'],
    queryFn: async () => {
      if (!profile?.id) return [];
      return await courseService.getStudentFavorites(profile.id);
    },
    enabled: !!profile?.id,
    staleTime: 1000 * 60 * 5 // 5 minutes
  });

  // if (loading || bookingsLoading) { // Removed blocking loader
  //   return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin mr-2" /> Cargando...</div>;
  // }

  // Derived Stats
  const activeCourses = enrollments?.filter(e => e.status === 'active' && e.progress < 100) || [];
  const completedCourses = enrollments?.filter(e => e.progress === 100) || []; // Assuming 100% means completed
  // Certificates logic: In this schema, certificates are in a separate table linked to bookings, 
  // or we can assume completed = certificate available. Let's check if there is a certificate relation or table query needed.
  // For now, let's assume completed courses have certificates.
  // Better: Query certificates separately or assume if progress 100 -> count it.

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8 mt-20">
        <div className="grid gap-8 md:grid-cols-[300px_1fr]">
          {/* Sidebar Profile */}
          <div className="space-y-6">
            <Card className="border-border">
              <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={profile?.avatar_url || "https://github.com/shadcn.png"} />
                  <AvatarFallback>{profile?.full_name?.charAt(0) || "U"}</AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-xl font-bold">{profile?.full_name}</h2>
                  <p className="text-sm text-muted-foreground">{profile?.email}</p>
                  {profile?.dni && <Badge variant="outline" className="mt-2">DNI: {profile.dni}</Badge>}
                </div>
                <div className="w-full pt-4 border-t border-border flex flex-col gap-2">
                  <Button variant="outline" className="w-full justify-start" onClick={handleLogout}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Cerrar Sesión
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <Card className="hover:border-primary/50 transition-colors">
                <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                  <div className="p-2 bg-primary/10 rounded-full mb-2">
                    <BookOpen className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-2xl font-bold">{activeCourses.length}</div>
                  <div className="text-xs text-muted-foreground font-medium">Cursos Activos</div>
                </CardContent>
              </Card>
              <Card className="hover:border-primary/50 transition-colors">
                <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                  <div className="p-2 bg-green-100 rounded-full mb-2">
                    <GraduationCap className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="text-2xl font-bold">{completedCourses.length}</div>
                  <div className="text-xs text-muted-foreground font-medium">Completados</div>
                </CardContent>
              </Card>
              <Card className="hover:border-primary/50 transition-colors">
                <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                  <div className="p-2 bg-amber-100 rounded-full mb-2">
                    <Award className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="text-2xl font-bold">{completedCourses.length}</div>
                  <div className="text-xs text-muted-foreground font-medium">Certificados</div>
                </CardContent>
              </Card>
              <Card className="hover:border-primary/50 transition-colors">
                <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                  <div className="p-2 bg-blue-100 rounded-full mb-2">
                    <Clock className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="text-2xl font-bold">{enrollments?.length || 0}</div>
                  <div className="text-xs text-muted-foreground font-medium">Inscripciones</div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Main Content */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl sm:text-3xl font-bold">Mi Aprendizaje</h1>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="w-full bg-secondary/50 p-1 rounded-xl flex h-auto overflow-x-auto snap-x scrollbar-hide gap-1">
                <TabsTrigger value="courses" className="flex-1 rounded-lg px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm min-w-[100px] snap-center">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Mis Cursos
                </TabsTrigger>
                <TabsTrigger value="certificates" className="flex-1 rounded-lg px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm min-w-[100px] snap-center">
                  <Award className="w-4 h-4 mr-2" />
                  Certificados
                </TabsTrigger>
                <TabsTrigger value="favorites" className="flex-1 rounded-lg px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm min-w-[100px] snap-center">
                  <Heart className="w-4 h-4 mr-2" />
                  Favoritos
                </TabsTrigger>
              </TabsList>

              <TabsContent value="courses" className="space-y-6">
                {/* Active Courses */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <PlayCircle className="w-5 h-5 text-primary" />
                    En Progreso
                  </h3>
                  {bookingsLoading ? (
                    <div className="flex items-center justify-center p-12">
                      <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    </div>
                  ) : (
                    <>
                      {!activeCourses.length && (
                        <div className="text-center py-10 bg-secondary/20 rounded-xl border border-dashed border-border">
                          <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center mx-auto mb-3">
                            <BookOpen className="w-6 h-6 text-muted-foreground" />
                          </div>
                          <p className="font-medium">No tienes cursos en progreso.</p>
                          <Button variant="link" className="text-primary mt-2" onClick={() => navigate('/catalogo')}>
                            Explorar cursos nuevos
                          </Button>
                        </div>
                      )}
                      <div className="grid md:grid-cols-2 gap-6">
                        {activeCourses.map((enrollment: any) => (
                          <Card key={enrollment.id} className="overflow-hidden hover:shadow-lg transition-all duration-300 border-border group">
                            <div className="aspect-video relative overflow-hidden">
                              <img
                                src={enrollment.course?.image_url || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60"}
                                alt={enrollment.course?.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button className="rounded-full" onClick={() => navigate(`/classroom/${enrollment.course_id}`)}>Continuar Aprendiendo</Button>
                              </div>
                            </div>
                            <CardContent className="p-5">
                              <div className="flex justify-between items-start mb-4">
                                <div>
                                  <Badge variant={enrollment.status === 'pending' ? 'secondary' : 'default'} className="mb-2">
                                    {enrollment.status === 'pending' ? 'Pendiente Pago' : 'Activo'}
                                  </Badge>
                                  <h4 className="font-bold line-clamp-2 leading-tight min-h-[2.5rem]">{enrollment.course?.title}</h4>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Progreso</span>
                                  <span className="font-medium text-primary">{enrollment.progress || 0}%</span>
                                </div>
                                <Progress value={enrollment.progress || 0} className="h-2 bg-secondary" />
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Completed Courses */}
                <div className="space-y-4 pt-8 border-t border-border/50">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    Completados
                  </h3>
                  {bookingsLoading ? (
                    <div className="flex items-center justify-center p-8">
                      <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
                    </div>
                  ) : (
                    <>
                      {!completedCourses.length && (
                        <p className="text-muted-foreground text-sm pl-2">No has completado ningún curso aún.</p>
                      )}
                      <div className="grid md:grid-cols-2 gap-6">
                        {completedCourses.map((enrollment: any) => (
                          <Card key={enrollment.id} className="flex flex-col sm:flex-row overflow-hidden border-border transition-shadow hover:shadow-md">
                            <div className="w-full sm:w-32 h-32 sm:h-auto relative shrink-0">
                              <img
                                src={enrollment.course?.image_url || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60"}
                                alt={enrollment.course?.title}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent sm:hidden" />
                              <div className="absolute bottom-2 left-2 sm:hidden text-white font-bold text-xs">
                                {enrollment.course?.title}
                              </div>
                            </div>
                            <div className="p-4 flex-1 flex flex-col justify-center">
                              <h4 className="hidden sm:block font-bold text-sm mb-1 leading-snug">{enrollment.course?.title}</h4>
                              <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {enrollment.purchased_at ? format(new Date(enrollment.purchased_at), "dd MMM yyyy", { locale: es }) : "Completado"}
                              </p>
                              <div className="flex gap-2 flex-wrap">
                                <Button variant="secondary" size="sm" className="h-8 text-xs flex-1 sm:flex-none" onClick={() => navigate(`/classroom/${enrollment.course_id}`)}>
                                  Repasar
                                </Button>
                                {(enrollment.certificate && (Array.isArray(enrollment.certificate) ? enrollment.certificate.length > 0 : true)) && (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 text-xs text-green-600 border-green-200 bg-green-50 hover:bg-green-100 flex-1 sm:flex-none"
                                      onClick={() => {
                                        const certId = Array.isArray(enrollment.certificate) ? enrollment.certificate[0].id : enrollment.certificate.id;
                                        navigate(`/verify/${certId}`);
                                      }}
                                    >
                                      <Award className="w-3 h-3 mr-1" />
                                      Digital
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 text-xs text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100 flex-1 sm:flex-none"
                                      onClick={() => {
                                        const message = `Hola Gerencia y Desarrollo Global, quisiera solicitar el certificado físico del curso: ${enrollment.course?.title}. Mis datos son: ${profile?.full_name} (DNI: ${profile?.dni})`;
                                        const whatsappNumber = settings?.payment_number?.replace(/\D/g, '') || "51953181829";
                                        window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, '_blank');
                                      }}
                                    >
                                      <Award className="w-3 h-3 mr-1" />
                                      Físico
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="certificates">
                {!completedCourses.length ? (
                  <div className="text-center py-12 bg-secondary/10 rounded-2xl border border-dashed border-border">
                    <Award className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-20" />
                    <p className="text-muted-foreground">Aún no tienes certificados disponibles.</p>
                    <p className="text-xs text-muted-foreground mt-1">Completa tus cursos para obtenerlos.</p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {completedCourses.map((enrollment: any) => (
                      <Card key={enrollment.id} className="group hover:shadow-lg transition-all border-border relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gold"></div>
                        <CardContent className="p-6 flex flex-col items-center text-center space-y-4 pt-8">
                          <div className="w-16 h-16 rounded-full bg-gold/10 flex items-center justify-center ring-4 ring-gold/20">
                            <Award className="w-8 h-8 text-gold" />
                          </div>
                          <div>
                            <h3 className="font-bold leading-tight">{enrollment.course?.title}</h3>
                            <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">
                              {enrollment.purchased_at ? format(new Date(enrollment.purchased_at), "dd MMM yyyy", { locale: es }) : "Certificado"}
                            </p>
                          </div>
                          <div className="pt-4 flex flex-col gap-2 w-full">
                            {(enrollment.certificate && (Array.isArray(enrollment.certificate) ? enrollment.certificate.length > 0 : true)) ? (
                              <>
                                <Button
                                  className="w-full bg-green-600 hover:bg-green-700 shadow-sm"
                                  onClick={() => {
                                    const certId = Array.isArray(enrollment.certificate) ? enrollment.certificate[0].id : enrollment.certificate.id;
                                    navigate(`/verify/${certId}`);
                                  }}
                                >
                                  <Award className="w-4 h-4 mr-2" />
                                  Ver Digital
                                </Button>
                                <Button
                                  variant="outline"
                                  className="w-full border-blue-200 text-blue-700 hover:bg-blue-50"
                                  onClick={() => {
                                    const message = `Hola Gerencia y Desarrollo Global, quisiera solicitar el certificado físico del curso: ${enrollment.course?.title}. Mis datos son: ${profile?.full_name} (DNI: ${profile?.dni})`;
                                    const whatsappNumber = settings?.payment_number?.replace(/\D/g, '') || "51953181829";
                                    window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, '_blank');
                                  }}
                                >
                                  <Award className="w-4 h-4 mr-2" />
                                  Solicitar Físico
                                </Button>
                              </>
                            ) : (
                              <span className="text-sm text-muted-foreground py-2 italic">Certificado en proceso</span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="favorites">
                {!favorites?.length ? (
                  <div className="text-center py-12 bg-card rounded-2xl border border-border">
                    <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                    <h3 className="text-lg font-semibold mb-2">Aún no tienes favoritos</h3>
                    <p className="text-muted-foreground mb-6">Guarda los cursos que te interesen para verlos más tarde.</p>
                    <Button onClick={() => navigate('/catalogo')}>Explorar Catálogo</Button>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {favorites.map((course: any) => (
                      <Card key={course.id} className="group hover:shadow-lg transition-all border-border overflow-hidden">
                        <div className="aspect-video relative overflow-hidden">
                          <img
                            src={course.image_url || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60"}
                            alt={course.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute top-2 right-2">
                            <Badge className="bg-white/90 text-foreground hover:bg-white text-xs">
                              {course.category}
                            </Badge>
                          </div>
                        </div>
                        <CardContent className="p-5">
                          <h4 className="font-bold text-base mb-2 line-clamp-1">{course.title}</h4>
                          <p className="text-muted-foreground text-sm mb-4 line-clamp-2">{course.description}</p>
                          <div className="flex items-center justify-between mt-auto">
                            <span className="font-bold text-lg text-primary">S/{course.price}</span>
                            <Button size="sm" onClick={() => navigate(`/curso/${course.slug || course.id}`)}>
                              Ver Detalles
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Dashboard;
