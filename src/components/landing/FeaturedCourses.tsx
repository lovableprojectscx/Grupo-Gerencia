import { motion } from "framer-motion";
import { ChevronRight, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CourseCard } from "@/components/courses/CourseCard";
import { useQuery } from "@tanstack/react-query";
import { courseService } from "@/services/courseService";

export const FeaturedCourses = () => {
  const { data: courses, isLoading } = useQuery({
    queryKey: ["courses"],
    queryFn: courseService.getPublished,
  });

  const featuredCourses = courses?.slice(0, 4) || [];

  return (
    <section className="section-padding bg-background">
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

        {/* Courses Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {isLoading ? (
            <div className="col-span-full flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : featuredCourses.length > 0 ? (
            featuredCourses.map((course) => (
              <CourseCard
                key={course.id}
                id={course.slug || course.id}
                image={course.image_url || "/placeholder-course.jpg"}
                title={course.title}
                instructor={course.instructor?.name || "Instructor"}
                price={course.price}
                originalPrice={course.original_price}
                rating={5.0}
                students={course.students || 0}
                duration="Flexible"
                category={course.category}
                specialty={course.specialty}
                level={course.level}
              />
            ))
          ) : (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              No hay cursos destacados disponibles en este momento.
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
