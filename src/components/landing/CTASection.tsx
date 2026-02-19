import { motion } from "framer-motion";
import { ArrowRight, Sparkles, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useSiteSettings } from "@/hooks/useSiteSettings";

export const CTASection = () => {
  const { settings } = useSiteSettings();
  const rawPhone = settings?.contact_phone || settings?.payment_number || "51972787508";
  const whatsappNumber = rawPhone.replace(/\D/g, '');

  return (
    <section className="section-padding bg-background relative overflow-hidden">
      <div className="container-custom relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative rounded-[2.5rem] overflow-hidden shadow-2xl shadow-primary/20"
        >
          {/* Premium Background */}
          <div className="absolute inset-0 bg-[#0B1120]">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/80 via-transparent to-accent/20 opacity-80" />

            {/* Animated Glow Effects */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent/20 rounded-full blur-[128px] -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-600/20 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/3" />

            {/* Grid Pattern Overlay */}
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
              }}
            />
          </div>

          {/* Content */}
          <div className="relative z-10 px-6 py-12 md:px-20 md:py-24 text-center">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs md:text-sm font-semibold mb-6 md:mb-8 backdrop-blur-md"
            >
              <Sparkles className="w-3 h-3 md:w-4 md:h-4" />
              <span>Impulsa tu carrera hoy</span>
            </motion.div>

            <motion.h2
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-4 md:mb-6 max-w-4xl mx-auto leading-tight md:leading-tight tracking-tight"
            >
              ¿Listo para alcanzar tu <br className="hidden md:block" />
              <span className="font-display italic text-accent">máximo potencial?</span>
            </motion.h2>

            <motion.p
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-base md:text-xl text-slate-300 mb-8 md:mb-12 max-w-2xl mx-auto leading-relaxed"
            >
              Únete a miles de profesionales que ya están liderando el cambio en sus sectores. Certifícate con los mejores expertos.
            </motion.p>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex flex-col sm:flex-row gap-4 md:gap-5 justify-center items-center"
            >
              <Button
                asChild
                size="xl"
                className="bg-accent text-white hover:bg-accent/90 font-bold shadow-xl shadow-accent/20 h-12 md:h-14 px-8 text-base md:text-lg rounded-xl transition-all hover:scale-105 w-full sm:w-auto"
              >
                <Link to="/catalogo">
                  Explorar todos los cursos
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                size="xl"
                className="border-white/10 bg-white/5 text-white hover:bg-white/10 backdrop-blur-sm h-12 md:h-14 px-8 text-base md:text-lg rounded-xl transition-all hover:scale-105 w-full sm:w-auto"
              >

                <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Hablar con un asesor
                </a>
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
