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
    <section className="relative min-h-[100svh] md:min-h-screen bg-hero-gradient overflow-hidden flex items-center">
      {/* Background glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-accent/8 rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />
      </div>

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}
      />

      <div className="container-custom relative z-10 pt-28 pb-14 md:py-0">
        <div className="max-w-3xl mx-auto text-center">

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white/90 text-xs md:text-sm mb-5 md:mb-10"
          >
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            Certificaciones válidas para el sector público y privado
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

          {/* Subtítulo — corto y discreto */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-sm md:text-base text-white/55 mb-6 md:mb-16 max-w-lg mx-auto tracking-wide px-4 md:px-0"
          >
            Certificados verificables en Salud, Ingeniería y Gestión. A tu ritmo o en vivo.
          </motion.p>

          {/* Buscador — protagonista */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="max-w-2xl mx-auto mb-8 md:mb-20 px-4 md:px-0"
          >
            <div className="relative group">
              <div className="absolute inset-0 bg-accent/25 rounded-2xl blur-xl group-hover:bg-accent/35 transition-all duration-300" />
              <div className="relative flex items-center bg-white rounded-2xl shadow-2xl overflow-hidden p-1.5">
                <Search className="w-5 h-5 text-muted-foreground ml-4 shrink-0" />
                <input
                  type="text"
                  placeholder="¿Qué quieres aprender?"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="flex-1 px-3 py-3 md:py-4 text-foreground placeholder:text-muted-foreground/70 focus:outline-none text-sm md:text-base bg-transparent min-w-0"
                />
                <Button
                  variant="hero"
                  onClick={handleSearch}
                  className="rounded-xl px-5 md:px-8 h-12 shrink-0 text-sm md:text-base font-semibold"
                >
                  <span className="hidden md:inline">Buscar cursos</span>
                  <span className="md:hidden">Buscar</span>
                  <ChevronRight className="w-4 h-4 ml-1.5" />
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Stats en línea con separadores */}
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

          {/* CTAs secundarios */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex flex-col sm:flex-row justify-center gap-3 md:gap-4 px-4 md:px-0"
          >
            <Button variant="hero" size="xl" className="w-full sm:w-auto h-12 md:h-13 text-sm md:text-base" asChild>
              <Link to="/catalogo">
                Explorar catálogo
                <ChevronRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            <Button variant="heroOutline" size="xl" className="w-full sm:w-auto h-12 md:h-13 text-sm md:text-base" asChild>
              <Link to="/nosotros">
                <Play className="w-4 h-4 mr-2" />
                Ver cómo funciona
              </Link>
            </Button>
          </motion.div>

        </div>
      </div>

      {/* Bottom Wave */}
      <div className="absolute -bottom-[1px] left-0 right-0 z-0 leading-none">
        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto block">
          <path
            d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z"
            fill="hsl(var(--background))"
          />
        </svg>
      </div>
    </section>
  );
};
