
import { useParams } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getOptimizedImageUrl } from "@/utils/imageUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Linkedin, Mail, Star, Users, BookOpen, ExternalLink, PlayCircle } from "lucide-react";

// Mock Instructor
const instructorMock = {
    id: "1",
    name: "Dr. Roberto Sánchez Medina",
    title: "Médico Intensivista & Docente Universitario",
    bio: `Especialista en Medicina Intensiva con más de 15 años de experiencia clínica en hospitales de alta complejidad. Magíster en Docencia Universitaria y Doctorando en Ciencias de la Salud.

Ha liderado equipos de respuesta rápida y UCI durante emergencias sanitarias. Actualmente se desempeña como Jefe de UCI en el Hospital Metropolitano y docente principal en la Facultad de Medicina.

Autor de múltiples artículos científicos indexados y ponente internacional en congresos de terapia intensiva.`,
    avatar: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop",
    stats: {
        students: 3500,
        courses: 12,
        rating: 4.9,
        reviews: 1250
    },
    courses: [
        {
            id: "diplomado-uci",
            title: "Diplomado en Cuidados Intensivos",
            image: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800",
            category: "Salud",
            students: 1240,
            rating: 4.9
        },
        {
            id: "curso-rcp",
            title: "Actualización en RCP Avanzado",
            image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800",
            category: "Salud",
            students: 850,
            rating: 4.8
        }
    ]
};

export default function InstructorProfile() {
    const { id } = useParams();
    // In real app, fetch instructor by ID
    const instructor = instructorMock;

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <Navbar />

            {/* Hero Section */}
            <section className="bg-primary/5 pt-32 pb-16">
                <div className="container mx-auto px-4">
                    <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
                        <Avatar className="w-40 h-40 border-4 border-background shadow-xl">
                            <AvatarImage src={getOptimizedImageUrl(instructor.avatar, 200) || ""} />
                            <AvatarFallback>{instructor.name.charAt(0)}</AvatarFallback>
                        </Avatar>

                        <div className="flex-1 text-center md:text-left space-y-4">
                            <div>
                                <Badge variant="secondary" className="mb-2">Instructor Verificado</Badge>
                                <h1 className="text-3xl md:text-4xl font-bold">{instructor.name}</h1>
                                <p className="text-xl text-muted-foreground mt-1">{instructor.title}</p>
                            </div>

                            <div className="flex flex-wrap justify-center md:justify-start gap-6 text-sm">
                                <div className="flex items-center gap-2">
                                    <Users className="w-5 h-5 text-primary" />
                                    <strong>{instructor.stats.students}</strong> estudiantes
                                </div>
                                <div className="flex items-center gap-2">
                                    <BookOpen className="w-5 h-5 text-primary" />
                                    <strong>{instructor.stats.courses}</strong> cursos
                                </div>
                                <div className="flex items-center gap-2">
                                    <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                                    <strong>{instructor.stats.rating}</strong> ({instructor.stats.reviews} reseñas)
                                </div>
                            </div>

                            <div className="flex justify-center md:justify-start gap-3 pt-2">
                                <Button variant="outline" size="sm">
                                    <Linkedin className="w-4 h-4 mr-2" />
                                    LinkedIn
                                </Button>
                                <Button variant="outline" size="sm">
                                    <Mail className="w-4 h-4 mr-2" />
                                    Contactar
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <main className="flex-1 container mx-auto px-4 py-12">
                <div className="grid lg:grid-cols-[2fr_1fr] gap-12">

                    {/* Left Col: Bio & Courses */}
                    <div className="space-y-12">
                        <section>
                            <h2 className="text-2xl font-bold mb-4">Sobre el Instructor</h2>
                            <p className="text-muted-foreground whitespace-pre-line leading-relaxed text-lg">
                                {instructor.bio}
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold mb-6">Cursos Impartidos ({instructor.courses.length})</h2>
                            <div className="grid sm:grid-cols-2 gap-6">
                                {instructor.courses.map((course) => (
                                    <Card key={course.id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group">
                                        <div className="aspect-video relative overflow-hidden">
                                            <img src={getOptimizedImageUrl(course.image, 500) || ""} alt={course.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <PlayCircle className="w-12 h-12 text-white" />
                                            </div>
                                        </div>
                                        <CardContent className="p-4">
                                            <Badge variant="secondary" className="mb-2 text-xs">{course.category}</Badge>
                                            <h3 className="font-bold leading-tight mb-2 line-clamp-2">{course.title}</h3>
                                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {course.students}</span>
                                                <span className="flex items-center gap-1"><Star className="w-3 h-3 text-yellow-500" /> {course.rating}</span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </section>
                    </div>

                    {/* Right Col: Sidebar info? */}
                    <div className="space-y-6">
                        <Card className="bg-primary text-primary-foreground border-none">
                            <CardContent className="p-6 text-center space-y-4">
                                <h3 className="font-bold text-xl">¿Eres estudiante?</h3>
                                <p className="opacity-90">
                                    Obtén acceso ilimitado a los cursos de {instructor.name} y mejora tus habilidades profesionales.
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
