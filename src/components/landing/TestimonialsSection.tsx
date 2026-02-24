import { motion } from "framer-motion";
import { Star, Quote, Building2, Stethoscope, Landmark, Briefcase, Building } from "lucide-react";

const testimonials = [
  {
    id: 1,
    name: "María Elena Torres",
    role: "Enfermera - Hospital Regional",
    content: "El diplomado en cuidados intensivos me permitió ascender en mi trabajo. Los certificados son reconocidos por el Ministerio de Salud.",
    rating: 5,
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face",
  },
  {
    id: 2,
    name: "Carlos Mendoza",
    role: "Ingeniero Civil - Municipalidad",
    content: "Excelente modalidad de estudio. Pude capacitarme en SIGA-MEF mientras trabajaba. Los docentes son muy profesionales.",
    rating: 5,
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
  },
  {
    id: 3,
    name: "Ana Lucía Paredes",
    role: "Contadora - Empresa Privada",
    content: "La especialización en tributación fue clave para mi carrera. El código QR del certificado facilita la verificación ante empleadores.",
    rating: 5,
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face",
  },
];

const institutions = [
  { name: "MINSA", icon: Stethoscope, color: "text-red-500" },
  { name: "Gobierno Regional", icon: Landmark, color: "text-amber-700" },
  { name: "EsSalud", icon: Building2, color: "text-blue-500" },
  { name: "Municipalidades", icon: Building, color: "text-slate-600" },
  { name: "Empresas Privadas", icon: Briefcase, color: "text-emerald-600" },
];

export const TestimonialsSection = () => {
  return (
    <section id="testimonials" className="section-padding bg-secondary/30 overflow-hidden">
      <div className="container-custom">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10 md:mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Historias de <span className="font-display italic text-accent">Éxito</span>
          </h2>
          <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto">
            Profesionales que transformaron su carrera con nuestras certificaciones
          </p>
        </motion.div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 mb-10 md:mb-16">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="bg-card rounded-2xl p-6 md:p-8 shadow-card relative"
            >
              {/* Quote Icon */}
              <div className="absolute top-6 right-6 text-accent/20">
                <Quote className="w-8 h-8 md:w-10 md:h-10" />
              </div>

              {/* Rating */}
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-gold text-gold" />
                ))}
              </div>

              {/* Content */}
              <p className="text-foreground/80 leading-relaxed mb-6 text-sm md:text-base">
                "{testimonial.content}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-4">
                <img
                  src={testimonial.avatar}
                  alt={testimonial.name}
                  className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover ring-2 ring-accent/20"
                />
                <div>
                  <div className="font-semibold text-foreground text-sm md:text-base">{testimonial.name}</div>
                  <div className="text-xs md:text-sm text-muted-foreground">{testimonial.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Institutions */}
        {/* Institutions Marquee */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center pt-8 border-t border-border/50"
        >
          <p className="text-xs md:text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-8 md:mb-10">
            Nuestros egresados destacan en las mejores instituciones
          </p>

          <div className="relative flex overflow-hidden mask-linear-fade">
            {/* Gradient Masks */}
            <div className="absolute left-0 top-0 bottom-0 w-12 md:w-20 bg-gradient-to-r from-secondary/30 to-transparent z-10" />
            <div className="absolute right-0 top-0 bottom-0 w-12 md:w-20 bg-gradient-to-l from-secondary/30 to-transparent z-10" />

            {/* Marquee Container */}
            <div className="flex animate-marquee gap-8 items-center">
              {[...institutions, ...institutions, ...institutions].map((institution, index) => {
                const Icon = institution.icon;
                return (
                  <div
                    key={`${institution.name}-${index}`}
                    className="flex-shrink-0 flex items-center gap-3 px-6 py-3 md:px-8 md:py-4 bg-card/80 backdrop-blur-sm rounded-xl shadow-sm border border-border/50 hover:border-accent/30 hover:shadow-md transition-all duration-300 group min-w-[160px] md:min-w-[200px]"
                  >
                    <div className={`p-2 rounded-lg bg-secondary group-hover:bg-white transition-colors`}>
                      <Icon className={`w-5 h-5 md:w-6 md:h-6 ${institution.color}`} />
                    </div>
                    <span className="font-bold text-foreground text-xs md:text-sm tracking-tight">{institution.name}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
