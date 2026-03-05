import { motion } from "framer-motion";
import { Clock, Users, Star, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getSpecialtyLabel, getCategoryLabel } from "@/constants/categories";

interface CourseCardProps {
  id: string;
  title: string;
  instructor: string;
  image: string;
  price: number;
  originalPrice?: number;
  rating: number;
  students: number;
  duration: string;
  category: string;
  specialty?: string;
  level?: string;
  programType?: string;
}

// Dot de color por categoría (reemplaza los badges de color sólido)
const categoryDot: Record<string, string> = {
  health: "bg-rose-500",
  veterinary: "bg-pink-500",
  engineering: "bg-orange-500",
  environmental: "bg-emerald-500",
  agronomy: "bg-lime-600",
  management: "bg-blue-500",
  law: "bg-purple-500",
  forestry: "bg-green-800",
  default: "bg-slate-400",
};

const levelLabel: Record<string, string> = {
  beginner: "Básico",
  intermediate: "Intermedio",
  advanced: "Avanzado",
};

const programTypeLabel: Record<string, string> = {
  course: "Curso",
  diploma: "Diplomado",
  specialization: "Especialización",
};

export const CourseCard = ({
  id,
  title,
  instructor,
  image,
  price,
  originalPrice,
  rating,
  students,
  duration,
  category,
  specialty,
  level,
  programType,
}: CourseCardProps) => {
  const discount = originalPrice
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0;

  const dotColor = categoryDot[category] ?? categoryDot.default;
  const categoryLabel = specialty
    ? getSpecialtyLabel(category, specialty)
    : getCategoryLabel(category);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="h-full"
    >
      <Link to={`/curso/${id}`} className="group block h-full">
        <div className="h-full flex flex-col rounded-2xl overflow-hidden border border-border/60 bg-card shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">

          {/* ── Imagen ── */}
          <div className="relative aspect-video overflow-hidden bg-muted flex-shrink-0">
            <img
              src={image}
              alt={title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />

            {/* Gradiente sutil siempre visible en la parte inferior */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

            {/* Badges superiores */}
            <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
              {level && level !== "none" && (
                <span className="bg-black/50 backdrop-blur-sm text-white text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-md border border-white/10">
                  {levelLabel[level] ?? level}
                </span>
              )}
              {programType && programType !== "course" && (
                <span className="bg-accent text-accent-foreground text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-md">
                  {programTypeLabel[programType] ?? programType}
                </span>
              )}
            </div>

            {/* Badge de descuento (sin parpadeo, diseño limpio) */}
            {discount > 0 && (
              <div className="absolute top-3 right-3">
                <span className="bg-red-500/90 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1 rounded-lg shadow-md">
                  -{discount}%
                </span>
              </div>
            )}

            {/* CTA flotante que aparece al hover */}
            <div className="absolute bottom-0 inset-x-0 px-4 py-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
              <span className="text-white text-xs font-semibold flex items-center gap-1">
                Ver programa completo
                <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </div>

          {/* ── Contenido ── */}
          <div className="flex flex-col flex-1 p-4 gap-2.5">

            {/* Categoría con punto de color */}
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`} />
              <span className="text-[11px] font-medium text-muted-foreground truncate uppercase tracking-wide">
                {categoryLabel}
              </span>
            </div>

            {/* Título */}
            <h3 className="font-bold text-foreground group-hover:text-accent transition-colors line-clamp-2 text-[15px] leading-snug">
              {title}
            </h3>

            {/* Instructor */}
            <p className="text-xs text-muted-foreground truncate">
              {instructor}
            </p>

            {/* Stats: rating · estudiantes · duración */}
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-auto pt-1">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 flex-shrink-0" />
              <span className="font-semibold text-foreground mr-1">{rating.toFixed(1)}</span>
              <span className="text-border mx-0.5">·</span>
              <Users className="w-3.5 h-3.5 flex-shrink-0 mx-0.5" />
              <span className="mr-1">{students}</span>
              <span className="text-border mx-0.5">·</span>
              <Clock className="w-3.5 h-3.5 flex-shrink-0 mx-0.5" />
              <span>{duration}</span>
            </div>

            {/* Precio + botón */}
            <div className="flex items-center justify-between pt-3 border-t border-border/50">
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-foreground">S/{price}</span>
                {originalPrice && (
                  <span className="text-xs text-muted-foreground line-through">
                    S/{originalPrice}
                  </span>
                )}
              </div>
              <Button variant="accent" size="sm" className="gap-1 text-xs px-3">
                Inscribirse
                <ArrowRight className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};
