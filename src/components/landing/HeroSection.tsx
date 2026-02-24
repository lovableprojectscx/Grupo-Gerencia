import { motion } from "framer-motion";
import { Search, ChevronRight, Play } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export const HeroSection = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigate(`/catalogo?q=${encodeURIComponent(searchQuery)}`);
    } else {
      navigate("/catalogo");
    }
  };

  return (
    <section
      className="relative bg-hero-gradient flex items-center min-h-screen"
      style={{ isolation: "isolate" }}
    >
      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/G%3E%3C/svg%3E")`
        }}
      />

      {/* Subtle color accent — CSS gradient, no filter:blur */}
      <div className="absolute top-0 right-0 w-1/2 h-1/2 opacity-10 pointer-events-none"
        style={{ background: "radial-gradient(circle at top right, hsl(160 84% 39%), transparent 70%)" }}
      />
      <div className="absolute bottom-0 left-0 w-1/2 h-1/2 opacity-10 pointer-events-none"
        style={{ background: "radial-gradient(circle at bottom left, hsl(160 84% 39%), transparent 70%)" }}
      />

      <div className="w-full px-4 sm:px-6 lg:px-8 relative z-10 pt-24 pb-16 md:pt-32 md:pb-20">
        <div className="max-w-3xl mx-auto text-center">

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-white/90 text-xs md:text-sm mb-5 md:mb-10"
            style={{ maxWidth: "100%" }}
          >
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse shrink-0" />
            <span className="leading-snug">Certificaciones válidas para el sector público y privado</span>
          </motion.div>

          {/* Título */}
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-3 md:mb-7"
          >
            Potencia tu{" "}
            <span className="font-display italic text-accent">perfil profesional</span>
            <br className="hidden md:block" />
            {" "}con educación de calidad
          </motion.h1>

          {/* Subtítulo */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-sm md:text-base text-white/55 mb-6 md:mb-16 max-w-lg mx-auto tracking-wide"
          >
            Certificados verificables en Salud, Ingeniería y Gestión. A tu ritmo o en vivo.
          </motion.p>

          {/* Buscador */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="max-w-2xl mx-auto mb-8 md:mb-20"
          >
            <div className="flex items-center bg-white rounded-2xl shadow-2xl overflow-hidden p-1.5">
              <Search className="w-5 h-5 text-muted-foreground ml-3 shrink-0" />
              <input
                type="text"
                placeholder="¿Qué quieres aprender?"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="flex-1 min-w-0 px-3 py-3 md:py-4 text-foreground placeholder:text-muted-foreground/70 focus:outline-none text-sm md:text-base bg-transparent"
              />
              <Button
                variant="hero"
                onClick={handleSearch}
                className="rounded-xl px-4 md:px-8 h-11 shrink-0 text-sm md:text-base font-semibold"
              >
                <span className="hidden sm:inline">Buscar cursos</span>
                <span className="sm:hidden">Buscar</span>
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex items-center justify-center gap-5 md:gap-10 mb-7 md:mb-12"
          >
            <div className="text-center">
              <div className="text-xl md:text-3xl font-bold text-white">5,000+</div>
              <div className="text-[10px] md:text-xs text-white/50 mt-0.5 uppercase tracking-wider">Estudiantes</div>
            </div>
            <div className="w-px h-8 bg-white/15" />
            <div className="text-center">
              <div className="text-xl md:text-3xl font-bold text-white">120+</div>
              <div className="text-[10px] md:text-xs text-white/50 mt-0.5 uppercase tracking-wider">Cursos</div>
            </div>
            <div className="w-px h-8 bg-white/15" />
            <div className="text-center">
              <div className="text-xl md:text-3xl font-bold text-white">98%</div>
              <div className="text-[10px] md:text-xs text-white/50 mt-0.5 uppercase tracking-wider">Satisfacción</div>
            </div>
          </motion.div>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex flex-col sm:flex-row justify-center gap-3 md:gap-4"
          >
            <Button variant="hero" size="xl" className="w-full sm:w-auto h-12 text-sm md:text-base" asChild>
              <Link to="/catalogo">
                Explorar catálogo
                <ChevronRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            <Button variant="heroOutline" size="xl" className="w-full sm:w-auto h-12 text-sm md:text-base" asChild>
              <Link to="/nosotros">
                <Play className="w-4 h-4 mr-2" />
                Ver cómo funciona
              </Link>
            </Button>
          </motion.div>

        </div>
      </div>

      {/* Bottom Wave */}
      <div className="absolute bottom-0 left-0 right-0 z-0">
        <svg viewBox="0 0 1440 80" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"
          style={{ display: "block", width: "100%", height: "60px" }}>
          <path
            d="M0 80L60 73C120 67 240 53 360 47C480 40 600 40 720 43C840 47 960 53 1080 57C1200 60 1320 60 1380 60L1440 60V80H0Z"
            fill="hsl(var(--background))"
          />
        </svg>
      </div>
    </section>
  );
};
