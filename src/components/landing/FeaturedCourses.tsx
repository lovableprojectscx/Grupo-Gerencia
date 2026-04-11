import { motion } from "framer-motion";
import { ChevronRight, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CourseCard } from "@/components/courses/CourseCard";
import { useQuery } from "@tanstack/react-query";
import { courseService } from "@/services/courseService";
import { useRef, useEffect, useState } from "react";

export const FeaturedCourses = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const { data: courses, isLoading } = useQuery({
    queryKey: ["courses"],
    queryFn: courseService.getPublished,
  });

  const featuredCourses = courses?.slice(0, 4) || [];

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
        const step = firstCard ? firstCard.offsetWidth + 16 : container.clientWidth * 0.84;
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
  }, [featuredCourses.length]);

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
          className="flex flex-col md:flex-row md:items-end md:justify-between mb-8 md:mb-12"
        >
          <div>
            <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-4">
              Cursos <span className="font-display italic text-accent">Destacados</span>
            </h2>
            <p className="text-muted-foreground text-base md:text-lg max-w-xl">
              Los programas más solicitados por profesionales que buscan
              certificarse y avanzar en su carrera
            </p>
          </div>
          <Link to="/catalogo" className="mt-6 md:mt-0">
            <Button variant="outline" size="lg" className="group w-full md:w-auto">
              Ver todo el catálogo
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </motion.div>

        {/* Courses — horizontal scroll on mobile, grid on desktop */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : featuredCourses.length > 0 ? (
          <>
            <div ref={scrollRef} onScroll={handleScroll} className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 [&::-webkit-scrollbar]:hidden [scrollbar-width:none] sm:grid sm:grid-cols-2 sm:overflow-visible sm:snap-none sm:pb-0 lg:grid-cols-4 sm:gap-6">
              {featuredCourses.map((course) => (
                <div key={course.id} className="snap-start shrink-0 w-[85vw] sm:w-auto">
                  <CourseCard
                    id={course.slug || course.id}
                    image={course.image_url || "/placeholder-course.jpg"}
                    title={course.title}
                    instructor={course.instructors && course.instructors.length > 0 ? course.instructors.map((i: any) => i.name).join(", ") : (course.instructor?.name || "Instructor")}
                    price={course.price}
                    originalPrice={course.original_price}
                    rating={5.0}
                    students={course.students || 0}
                    duration="Flexible"
                    category={course.category}
                    specialty={course.specialty}
                    level={course.level}
                  />
                </div>
              ))}
            </div>
            {/* Dots indicadores — solo mobile */}
            <div className="flex items-center justify-center gap-2 mt-5 sm:hidden">
              {featuredCourses.map((_, i) => (
                <button
                  key={i}
                  onClick={() => scrollToIndex(i)}
                  className={`rounded-full transition-all duration-300 ${
                    i === currentIndex
                      ? "w-5 h-2 bg-primary"
                      : "w-2 h-2 bg-border hover:bg-muted-foreground"
                  }`}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            No hay cursos destacados disponibles en este momento.
          </div>
        )}
      </div>
    </section>
  );
};
