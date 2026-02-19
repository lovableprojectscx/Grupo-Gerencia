import { motion } from "framer-motion";
import { Clock, Users, Star, Play, Calendar } from "lucide-react";
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

const categoryColors: Record<string, string> = {
  health: "badge-health",
  engineering: "badge-engineering",
  environmental: "badge-environmental",
  agronomy: "badge-agronomy",
  management: "badge-management",
  law: "badge-law",
  // Fallback
  default: "bg-secondary"
};

const categoryNames: Record<string, string> = {
  health: "Salud",
  engineering: "Ingeniería",
  agronomy: "Agronomía",
  management: "Gestión",
  law: "Derecho",
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
}: CourseCardProps) => {
  const discount = originalPrice ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <Link to={`/curso/${id}`} className="group block">
        <div className="card-elevated overflow-hidden">
          {/* Image */}
          <div className="relative aspect-video overflow-hidden">
            <img
              src={image}
              alt={title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />

            {/* Level Badge */}
            {level && level !== "none" && (
              <div className="absolute top-3 left-3">
                <Badge className="bg-primary text-primary-foreground font-semibold uppercase">
                  {level === "beginner" ? "Básico" :
                    level === "intermediate" ? "Intermedio" :
                      level === "advanced" ? "Avanzado" : level}
                </Badge>
              </div>
            )}

            {/* Discount Badge */}
            {discount > 0 && (
              <div className="absolute top-3 right-3">
                <Badge className="bg-red-600 text-white font-bold px-2 py-1 shadow-md animate-pulse">
                  -{discount}% OFF
                </Badge>
              </div>
            )}

            {/* Play overlay on hover */}
            <div className="absolute inset-0 bg-primary/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center">
                <Play className="w-6 h-6 text-accent-foreground ml-1" />
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 md:p-5">
            {/* School Tag */}
            <div className="mb-3">
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${categoryColors[category] || categoryColors.default}`}>
                {specialty ? getSpecialtyLabel(category, specialty) : getCategoryLabel(category)}
              </span>
            </div>

            {/* Title */}
            <h3 className="font-bold text-foreground group-hover:text-accent transition-colors line-clamp-2 mb-2 text-lg leading-snug">
              {title}
            </h3>

            {/* Instructor */}
            <p className="text-sm text-muted-foreground mb-3">
              Por {instructor}
            </p>

            {/* Meta info */}
            <div className="flex items-center gap-4 text-xs md:text-sm text-muted-foreground mb-4">
              <span className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-gold text-gold" />
                {rating.toFixed(1)}
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {students}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {duration}
              </span>
            </div>

            {/* Price */}
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <div className="flex items-baseline gap-2">
                <span className="text-xl md:text-2xl font-bold text-foreground">
                  S/{price}
                </span>
                {originalPrice && (
                  <span className="text-xs md:text-sm text-muted-foreground line-through">
                    S/{originalPrice}
                  </span>
                )}
              </div>
              <Button variant="accent" size="sm">
                Inscribirse
              </Button>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};
