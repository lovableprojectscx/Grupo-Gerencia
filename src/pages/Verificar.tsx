import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, CheckCircle, XCircle, Award, Calendar, Clock, User, QrCode, Shield, BadgeCheck, IdCard, Download } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
// Mock certificate data (REMOVED)
// Mock data removed in favor of real database queries

const Verificar = () => {
  const navigate = useNavigate();
  const [searchCode, setSearchCode] = useState("");
  const [searchResult, setSearchResult] = useState<{
    searched: boolean;
    certificates: any[];
    error: boolean;
  }>({ searched: false, certificates: [], error: false });
  const [isSearching, setIsSearching] = useState(false);

  // Auto-search if code is in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
      setSearchCode(code);
      performSearch(code);
    }
  }, []);

  const performSearch = async (codeToSearch: string) => {
    if (!codeToSearch.trim()) return;

    setIsSearching(true);
    setSearchResult({ searched: false, certificates: [], error: false });

    try {
      const code = codeToSearch.trim();
      const { data, error } = await supabase.rpc('verify_certificate_search', {
        search_code: code
      });

      if (error || !data || data.length === 0) {
        setSearchResult({ searched: true, certificates: [], error: true });
      } else {
        // Transform data
        const certificates = data.map((d: any) => ({
          valid: true,
          studentName: d.student_name,
          courseTitle: d.course_title,
          issueDate: new Date(d.issued_at).toLocaleDateString("es-ES", { day: 'numeric', month: 'long', year: 'numeric' }),
          hours: d.hours,
          credentialId: d.credential_id,
          grade: d.grade
        }));
        setSearchResult({ searched: true, certificates, error: false });
      }
    } catch (error) {
      console.error("Verification error:", error);
      setSearchResult({ searched: true, certificates: [], error: true });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(searchCode);
  };

  const resetSearch = () => {
    setSearchCode("");
    setSearchResult({ searched: false, certificates: [], error: false });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="relative bg-hero-gradient pt-24 pb-16 md:pt-32 md:pb-20 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-72 h-72 md:w-96 md:h-96 bg-accent rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] md:w-[500px] md:h-[500px] bg-accent/50 rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />
        </div>

        {/* Grid Pattern Overlay */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}
        />

        <div className="container-custom relative z-10 px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            {/* Glassmorphic Badge Icon */}
            <div className="relative w-20 h-20 md:w-24 md:h-24 mx-auto mb-6 md:mb-8">
              <div className="absolute inset-0 bg-accent/20 rounded-full blur-xl animate-pulse" />
              <div className="relative w-full h-full bg-white/10 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center shadow-2xl">
                <BadgeCheck className="w-10 h-10 md:w-12 md:h-12 text-accent drop-shadow-[0_0_15px_rgba(var(--accent),0.5)]" />
              </div>
              {/* Decorative particles */}
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-accent rounded-full blur-[2px] animate-pulse" />
              <div className="absolute bottom-1 -left-1 w-3 h-3 bg-white rounded-full blur-[1px]" />
            </div>

            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-4 md:mb-6">
              Verificar <span className="font-display italic text-accent">Certificado</span>
            </h1>
            <p className="text-base md:text-xl text-white/80 mb-8 md:mb-12 max-w-2xl mx-auto leading-relaxed">
              Ingresa el código único del certificado (ID) para verificar su autenticidad.
            </p>

            {/* Search Form */}
            <form onSubmit={handleSearch} className="max-w-xl mx-auto">
              <div className="relative group">
                {/* Glow Effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-accent/50 to-white/30 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" />

                <div className="relative flex flex-col sm:flex-row gap-2 bg-white/5 backdrop-blur-sm p-2 rounded-2xl border border-white/10">
                  <div className="relative flex-1">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 md:gap-3 text-muted-foreground border-r border-border/50 pr-2 md:pr-3">
                      <IdCard className="w-4 h-4 md:w-5 md:h-5 text-accent" />
                      <span className="text-sm font-medium">ID</span>
                    </div>
                    <Input
                      type="text"
                      placeholder="Ej. 123e4567..."
                      value={searchCode}
                      onChange={(e) => setSearchCode(e.target.value)}
                      className="pl-20 md:pl-24 h-12 md:h-14 text-base md:text-lg bg-white/90 border-0 shadow-inner focus-visible:ring-0 focus-visible:bg-white transition-all placeholder:text-muted-foreground/50"
                    />
                  </div>
                  <Button
                    type="submit"
                    variant="hero"
                    size="lg"
                    disabled={isSearching || searchCode.length < 5}
                    className="w-full sm:w-auto sm:min-w-[160px] shadow-lg shadow-accent/20 h-12 md:h-14"
                  >
                    {isSearching ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Buscando
                      </span>
                    ) : (
                      <>
                        <Search className="w-5 h-5 mr-2" />
                        Consultar
                      </>
                    )}
                  </Button>
                </div>
              </div>
              <p className="mt-4 text-xs md:text-sm text-white/40">
                Ingresa el ID completo que aparece en el certificado.
              </p>
            </form>
          </motion.div>
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

      {/* Results Section */}
      <section className="section-padding pt-8 md:pt-16">
        <div className="container-custom">
          {searchResult.searched && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="max-w-3xl mx-auto"
            >
              {searchResult.certificates.length > 0 ? (
                /* Valid Certificates List */
                <div className="space-y-6 md:space-y-8">
                  {searchResult.certificates.map((cert) => (
                    <div key={cert.credentialId} className="bg-card rounded-2xl md:rounded-3xl overflow-hidden shadow-xl border border-border">
                      {/* Success Header */}
                      <div className="bg-accent/10 p-6 md:p-8 text-center border-b border-border">
                        <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-4">
                          <CheckCircle className="w-10 h-10 md:w-12 md:h-12 text-accent" />
                        </div>
                        <h2 className="text-xl md:text-2xl font-bold text-accent mb-2">
                          ¡Certificado Válido!
                        </h2>
                        <p className="text-sm md:text-base text-muted-foreground">
                          Este certificado ha sido verificado exitosamente
                        </p>
                      </div>

                      {/* Certificate Preview */}
                      <div className="p-4 md:p-8">
                        <div className="bg-gradient-to-br from-primary via-primary to-primary/80 rounded-xl md:rounded-2xl p-6 md:p-8 text-white relative overflow-hidden mb-6 md:mb-8">
                          {/* Decorative border */}
                          <div className="absolute inset-2 md:inset-4 border-2 border-gold/30 rounded-lg" />

                          <div className="relative text-center">
                            <div className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-4 rounded-full bg-gold/20 flex items-center justify-center">
                              <Award className="w-6 h-6 md:w-8 md:h-8 text-gold" />
                            </div>
                            <div className="text-[10px] md:text-xs uppercase tracking-wider text-white/70 mb-2">
                              Certificado de Aprobación
                            </div>
                            <h3 className="font-bold text-lg md:text-xl mb-4 leading-tight">
                              {cert.courseTitle}
                            </h3>
                            <div className="text-base md:text-lg mb-2">Otorgado a</div>
                            <div className="text-xl md:text-2xl font-bold font-display mb-4">
                              {cert.studentName}
                            </div>
                            <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-6 text-sm text-white/80">
                              <span>{cert.hours !== "N/A" ? `${cert.hours} Horas` : ""}</span>
                              <span className="hidden md:inline">•</span>
                              <span>{cert.grade}</span>
                            </div>
                          </div>
                        </div>

                        {/* Certificate Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                          <div className="flex items-center gap-4 p-4 bg-secondary/50 rounded-xl">
                            <User className="w-5 h-5 md:w-6 md:h-6 text-accent shrink-0" />
                            <div className="overflow-hidden">
                              <div className="text-xs md:text-sm text-muted-foreground">Nombre del participante</div>
                              <div className="font-semibold text-foreground truncate">{cert.studentName}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 p-4 bg-secondary/50 rounded-xl">
                            <Calendar className="w-5 h-5 md:w-6 md:h-6 text-accent shrink-0" />
                            <div>
                              <div className="text-xs md:text-sm text-muted-foreground">Fecha de emisión</div>
                              <div className="font-semibold text-foreground">{cert.issueDate}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 p-4 bg-secondary/50 rounded-xl">
                            <Clock className="w-5 h-5 md:w-6 md:h-6 text-accent shrink-0" />
                            <div>
                              <div className="text-xs md:text-sm text-muted-foreground">Duración del programa</div>
                              <div className="font-semibold text-foreground">{cert.hours}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 p-4 bg-secondary/50 rounded-xl">
                            <QrCode className="w-5 h-5 md:w-6 md:h-6 text-accent shrink-0" />
                            <div className="overflow-hidden">
                              <div className="text-xs md:text-sm text-muted-foreground">ID de Credencial</div>
                              <code className="font-mono text-xs md:text-sm font-semibold text-foreground break-all">
                                {cert.credentialId}
                              </code>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="px-4 md:px-8 pb-6 md:pb-8">
                        <Button
                          className="w-full mb-3 shadow-md h-12 md:h-14 text-base md:text-lg"
                          size="lg"
                          onClick={() => navigate(`/verify/${cert.credentialId}`)}
                        >
                          <Download className="w-5 h-5 mr-2" />
                          Ver y Descargar PDF
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" onClick={resetSearch} className="w-full max-w-sm mx-auto block mt-8">
                    Verificar otro certificado
                  </Button>
                </div>
              ) : (
                /* Invalid Certificate */
                <div className="bg-card rounded-2xl md:rounded-3xl overflow-hidden shadow-xl border border-destructive/30">
                  <div className="bg-destructive/10 p-8 md:p-12 text-center">
                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-6">
                      <XCircle className="w-10 h-10 md:w-12 md:h-12 text-destructive" />
                    </div>
                    <h2 className="text-xl md:text-2xl font-bold text-destructive mb-3">
                      Certificado No Encontrado
                    </h2>
                    <p className="text-muted-foreground mb-2 max-w-md mx-auto text-sm md:text-base">
                      No se encontró ningún certificado con el ID proporcionado.
                    </p>
                    <p className="text-xs md:text-sm text-muted-foreground mb-8">
                      Verifica que el código sea correcto.
                    </p>
                    <Button variant="outline" onClick={resetSearch}>
                      Intentar nuevamente
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Info Section */}
          {!searchResult.searched && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="max-w-4xl mx-auto"
            >
              <div className="grid md:grid-cols-3 gap-6">
                {[
                  {
                    icon: QrCode,
                    title: "Código único",
                    description: "Cada certificado tiene un identificador único que garantiza su autenticidad",
                  },
                  {
                    icon: Shield,
                    title: "Verificación instantánea",
                    description: "Comprueba en segundos si un certificado es válido",
                  },
                  {
                    icon: Award,
                    title: "Respaldo institucional",
                    description: "Todos nuestros certificados cuentan con validez oficial",
                  },
                ].map((item, index) => {
                  const IconComponent = item.icon;
                  return (
                    <div
                      key={index}
                      className="text-center p-6 bg-card rounded-2xl border border-border"
                    >
                      <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
                        <IconComponent className="w-7 h-7 text-accent" />
                      </div>
                      <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Verificar;
