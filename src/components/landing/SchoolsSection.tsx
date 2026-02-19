import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { courseService } from "@/services/courseService";

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
    image: "https://images.unsplash.com/photo-1542601906-93a47f7d22c1?q=80&w=800&auto=format&fit=crop",
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
    href: "/catalogo?area=gestion",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
    },
  },
};

export const SchoolsSection = () => {
  const { data: courses } = useQuery({
    queryKey: ["courses"],
    queryFn: courseService.getPublished,
  });

  const getCourseCount = (categoryKey: string) => {
    if (!courses) return 0;
    return courses.filter((c: any) => c.category === categoryKey).length;
  };

  return (
    <section className="section-padding bg-background">
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

        {/* Schools Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8"
        >
          {schoolsConfig.map((school) => {
            const count = getCourseCount(school.categoryKey);

            return (
              <motion.div key={school.id} variants={itemVariants}>
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
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
};
