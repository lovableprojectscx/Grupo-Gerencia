import { motion } from "framer-motion";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { courseService } from "@/services/courseService";
import { useRef, useEffect, useState } from "react";

// Force sync schools: 2026-02-19 15:40

const schoolsConfig = [
  {
    id: "salud",
    categoryKey: "health",
    name: "Escuela de Salud",
    description: "Enfermería, farmacia, nutrición y más especializaciones médicas",
    image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=800",
    color: "school-health",
    borderColor: "border-school-health/20",
    href: "/catalogo?area=health",
  },
  {
    id: "veterinaria",
    categoryKey: "veterinary",
    name: "Veterinaria",
    description: "Medicina veterinaria, salud pública y cuidado de animales menores y mayores",
    image: "https://images.unsplash.com/photo-1599443015574-be5fe8a05783?q=80&w=800&auto=format&fit=crop",
    color: "school-veterinary",
    borderColor: "border-school-veterinary/20",
    href: "/catalogo?area=veterinary",
  },
  {
    id: "ingenieria",
    categoryKey: "engineering",
    name: "Ingeniería Civil",
    description: "Construcción, sistemas y tecnología aplicada",
    image: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&q=80&w=800",
    color: "school-engineering",
    borderColor: "border-school-engineering/20",
    href: "/catalogo?area=engineering",
  },
  {
    id: "ambiental",
    categoryKey: "environmental",
    name: "Ingeniería Ambiental",
    description: "Gestión de residuos, impacto ambiental y tratamiento de aguas",
    image: "https://images.unsplash.com/photo-1532601224476-15c79f2f7a51?q=80&w=800&auto=format&fit=crop",
    color: "school-environmental",
    borderColor: "border-school-environmental/20",
    href: "/catalogo?area=environmental",
  },
  {
    id: "agronomia",
    categoryKey: "agronomy",
    name: "Agronomía",
    description: "Agroindustria, zootecnia y desarrollo rural sostenible",
    image: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?q=80&w=800&auto=format&fit=crop",
    color: "school-agronomy",
    borderColor: "border-school-agronomy/20", // Assuming this color exists or falls back safely
    href: "/catalogo?area=agronomy",
  },
  {
    id: "gestion",
    categoryKey: "management",
    name: "Gestión Pública y Empresarial",
    description: "Administración, contabilidad, derecho laboral y liderazgo",
    image: "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&q=80&w=800",
    color: "school-management",
    borderColor: "border-school-management/20",
    href: "/catalogo?area=management",
  },
  {
    id: "forestal",
    categoryKey: "forestry",
    name: "Gestión y Manejo Forestal",
    description: "Silvicultura, tecnología de la madera y conservación de recursos forestales",
    image: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=800&auto=format&fit=crop",
    color: "school-forestry",
    borderColor: "border-school-forestry/20",
    href: "/catalogo?area=forestry",
  },
];


export const SchoolsSection = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const { data: courses } = useQuery({
    queryKey: ["courses"],
    queryFn: courseService.getPublished,
  });

  const getCourseCount = (categoryKey: string) => {
    if (!courses) return 0;
    return courses.filter((c: any) => c.category === categoryKey).length;
  };

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    let isPaused = false;
    let resumeTimeout: ReturnType<typeof setTimeout>;

    const scrollNext = () => {
      if (isPaused || container.scrollWidth <= container.clientWidth + 10) return;
      const maxScroll = container.scrollWidth - container.clientWidth;
      if (container.scrollLeft >= maxScroll - 5) {
        container.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        const firstCard = container.firstElementChild as HTMLElement;
        const step = firstCard ? firstCard.offsetWidth + 16 : container.clientWidth * 0.82;
        container.scrollTo({ left: container.scrollLeft + step, behavior: "smooth" });
      }
    };

    const pause = () => { isPaused = true; clearTimeout(resumeTimeout); };
    const resume = () => { isPaused = false; };
    const resumeDelayed = () => { resumeTimeout = setTimeout(resume, 2000); };

    container.addEventListener("mouseenter", pause);
    container.addEventListener("mouseleave", resume);
    container.addEventListener("touchstart", pause, { passive: true });
    container.addEventListener("touchend", resumeDelayed, { passive: true });

    const interval = setInterval(scrollNext, 3500);

    return () => {
      clearInterval(interval);
      clearTimeout(resumeTimeout);
      container.removeEventListener("mouseenter", pause);
      container.removeEventListener("mouseleave", resume);
      container.removeEventListener("touchstart", pause);
      container.removeEventListener("touchend", resumeDelayed);
    };
  }, []);

  const scrollToIndex = (index: number) => {
    const container = scrollRef.current;
    if (!container) return;
    const firstCard = container.firstElementChild as HTMLElement;
    if (!firstCard) return;
    container.scrollTo({ left: index * (firstCard.offsetWidth + 16), behavior: "smooth" });
  };

  const handleScroll = () => {
    const container = scrollRef.current;
    if (!container) return;
    const firstCard = container.firstElementChild as HTMLElement;
    if (!firstCard) return;
    setCurrentIndex(Math.round(container.scrollLeft / (firstCard.offsetWidth + 16)));
  };

  return (
    <section className="section-padding bg-background overflow-hidden">
      <div className="container-custom">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10 md:mb-16"
        >
          <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-4">
            Nuestras <span className="font-display italic text-accent">Escuelas</span>
          </h2>
          <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto">
            Programas especializados organizados por área de conocimiento para
            potenciar tu carrera profesional
          </p>
        </motion.div>

        {/* Schools — horizontal scroll on mobile, grid on desktop */}
        <motion.div
          ref={scrollRef}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 [&::-webkit-scrollbar]:hidden [scrollbar-width:none] md:grid md:grid-cols-2 md:overflow-visible md:snap-none md:pb-0 lg:grid-cols-3 md:gap-6 lg:gap-8"
          onScroll={handleScroll}
        >
          {schoolsConfig.map((school) => {
            const count = getCourseCount(school.categoryKey);

            return (
              <div key={school.id} className="snap-start shrink-0 w-[85vw] sm:w-[45vw] md:w-auto md:shrink">
                <Link
                  to={school.href}
                  className="group block h-full"
                >
                  <div className={`card-elevated h-full border ${school.borderColor} hover:border-${school.color} transition-all duration-300 relative overflow-hidden flex flex-col`}>

                    {/* Image Header */}
                    <div className="relative h-40 md:h-48 overflow-hidden">
                      <div className={`absolute inset-0 bg-primary/10 group-hover:bg-transparent transition-colors z-10`} />
                      <img
                        src={school.image}
                        alt={school.name}
                        className="w-full h-full object-cover transform transition-transform duration-700 group-hover:scale-110"
                      />
                    </div>

                    {/* Content */}
                    <div className="p-6 md:p-8 flex-1 flex flex-col">
                      <h3 className="text-lg md:text-xl font-bold text-foreground mb-3 group-hover:text-accent transition-colors">
                        {school.name}
                      </h3>
                      <p className="text-sm md:text-base text-muted-foreground mb-6 leading-relaxed flex-1">
                        {school.description}
                      </p>

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-4 border-t border-border mt-auto">
                        <span className="text-xs md:text-sm text-muted-foreground">
                          <span className="font-semibold text-foreground">{count}</span> cursos disponibles
                        </span>
                        <span className="flex items-center text-sm font-medium text-accent group-hover:translate-x-1 transition-transform">
                          Explorar
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </motion.div>

        {/* Flechas de navegación — solo mobile */}
        <div className="flex items-center justify-center gap-3 mt-5 md:hidden">
          <button
            onClick={() => scrollToIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
            className="w-9 h-9 rounded-full border border-border bg-background flex items-center justify-center disabled:opacity-25 active:scale-95 transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-muted-foreground tabular-nums">
            {currentIndex + 1} / {schoolsConfig.length}
          </span>
          <button
            onClick={() => scrollToIndex(Math.min(schoolsConfig.length - 1, currentIndex + 1))}
            disabled={currentIndex === schoolsConfig.length - 1}
            className="w-9 h-9 rounded-full border border-border bg-background flex items-center justify-center disabled:opacity-25 active:scale-95 transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
};
