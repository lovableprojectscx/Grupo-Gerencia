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
    <section className="relative min-h-[90vh] bg-hero-gradient overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-accent rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-accent/50 rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />
      </div>

      {/* Grid Pattern Overlay */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}
      />

      <div className="container-custom relative z-10 pt-24 pb-16 md:pt-32 md:pb-20">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white/90 text-xs md:text-sm mb-6 md:mb-8"
          >
            <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-accent animate-pulse" />
            Certificaciones válidas para el sector público y privado
          </motion.div>

          {/* Main Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6 md:mb-10"
          >
            Potencia tu{" "}
            <span className="font-display italic text-accent">perfil profesional</span>
            <br className="hidden md:block" />
            {" "}con educación de calidad
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-base md:text-lg text-white/75 mb-10 md:mb-14 max-w-xl mx-auto px-4 md:px-0"
          >
            Certificados verificables en Salud, Ingeniería y Gestión. A tu ritmo o en vivo.
          </motion.p>

          {/* Search Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="max-w-xl mx-auto mb-8 px-4 md:px-0"
          >
            <div className="relative group">
              <div className="absolute inset-0 bg-accent/20 rounded-2xl blur-xl group-hover:bg-accent/30 transition-colors" />
              <div className="relative flex items-center bg-white rounded-xl shadow-xl overflow-hidden p-1">
                <Search className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground ml-3 shrink-0" />
                <input
                  type="text"
                  placeholder="¿Qué quieres aprender?"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="flex-1 px-2 md:px-3 py-3 md:py-3 text-foreground placeholder:text-muted-foreground focus:outline-none text-sm md:text-base bg-transparent min-w-0"
                />
                <Button
                  variant="hero"
                  size="lg"
                  className="rounded-lg px-3 md:px-6 py-2 md:py-3 h-auto shrink-0 text-sm md:text-base"
                  onClick={handleSearch}
                >
                  <span className="hidden md:inline">Buscar cursos</span>
                  <span className="md:hidden">Buscar</span>
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Quick Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-wrap justify-center gap-6 md:gap-12 text-white/90"
          >
            <div className="text-center">
              <div className="text-2xl md:text-4xl font-bold text-white">5,000+</div>
              <div className="text-xs md:text-sm text-white/70">Estudiantes certificados</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-4xl font-bold text-white">120+</div>
              <div className="text-xs md:text-sm text-white/70">Cursos disponibles</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-4xl font-bold text-white">98%</div>
              <div className="text-xs md:text-sm text-white/70">Satisfacción</div>
            </div>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex flex-col sm:flex-row flex-wrap justify-center gap-3 md:gap-4 mt-8 md:mt-12 px-4 md:px-0"
          >
            <Button variant="hero" size="xl" className="w-full sm:w-auto text-base md:text-lg h-12 md:h-14" asChild>
              <Link to="/catalogo">
                Explorar catálogo
                <ChevronRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
            <Button variant="heroOutline" size="xl" className="w-full sm:w-auto text-base md:text-lg h-12 md:h-14" asChild>
              <Link to="/nosotros">
                <Play className="w-5 h-5 mr-2" />
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
