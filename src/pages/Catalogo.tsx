
import { useState, useMemo, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, SlidersHorizontal, X, Loader2, MessageSquare, SearchX } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { CourseCard } from "@/components/courses/CourseCard";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Sparkles, BadgeDollarSign, Layers, Settings2, Globe } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { courseService } from "@/services/courseService";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const areas = [
  { id: "health", label: "Salud" },
  { id: "veterinary", label: "Veterinaria" },
  { id: "engineering", label: "Ingeniería Civil" },
  { id: "environmental", label: "Ingeniería Ambiental" },
  { id: "agronomy", label: "Agronomía" },
  { id: "management", label: "Gestión Pública y Empresarial" },
  { id: "forestry", label: "Gestión y Manejo Forestal" },
];
// Force sync categories: 2026-02-19 15:40

const modalities = [
  { id: "live", label: "En Vivo" },
  { id: "async", label: "Autoestudio" },
];

const programTypes = [
  { id: "course", label: "Curso Especializado" },
  { id: "diploma", label: "Diplomado" },
  { id: "specialization", label: "Especialización" },
];

const Catalogo = () => {
  const { settings } = useSiteSettings();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Auto-scroll al cambiar de página
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentPage]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get("q");
    const area = params.get("area");

    if (q) {
      setSearchQuery(q);
    }

    if (area && areas.some(a => a.id === area)) {
      setSelectedAreas([area]);
    }
  }, [location.search]);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [selectedProgramTypes, setSelectedProgramTypes] = useState<string[]>([]);
  const [selectedModalities, setSelectedModalities] = useState<string[]>([]);
  const [maxPrice, setMaxPrice] = useState(10000);
  const [sortBy, setSortBy] = useState("newest");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const coursesPerPage = 6;

  const { data: courses, isLoading } = useQuery({
    queryKey: ["courses"],
    queryFn: courseService.getPublished,
  });

  // Filter and sort courses
  const filteredCourses = useMemo(() => {
    if (!courses) return [];

    let result = courses.filter((course: any) => {
      // Basic validation - is_archived is already filtered by service, but double check doesn't hurt
      if (!course.published) return false;

      // Search filter
      // Search filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = course.title.toLowerCase().includes(q);
        const matchesSubtitle = course.subtitle?.toLowerCase().includes(q);
        const matchesDescription = course.description?.toLowerCase().includes(q);

        if (!matchesTitle && !matchesSubtitle && !matchesDescription) {
          return false;
        }
      }
      // Area filter
      if (selectedAreas.length > 0 && !selectedAreas.includes(course.category)) {
        return false;
      }

      // Program Type filter
      if (selectedProgramTypes.length > 0) {
        const type = course.metadata?.find((m: any) => m.key === 'program_type')?.value || 'course';
        if (selectedProgramTypes.length > 0 && !selectedProgramTypes.includes(type)) {
          return false;
        }
      }

      // Modality filter
      if (selectedModalities.length > 0) {
        // Map 'recorded' UI filter to 'async' DB value if needed, or just use 'async' in the filter definition
        // We will update the filter definition constant to match DB ('async' instead of 'recorded')
        if (!selectedModalities.includes(course.modality || 'async')) {
          return false;
        }
      }

      // Price filter
      const coursePrice = typeof course.price === 'number' ? course.price : parseFloat(course.price || '0');
      if (coursePrice > maxPrice) {
        return false;
      }
      return true;
    });

    // Sort
    switch (sortBy) {
      case "price-low":
        result.sort((a: any, b: any) => (a.price || 0) - (b.price || 0));
        break;
      case "price-high":
        result.sort((a: any, b: any) => (b.price || 0) - (a.price || 0));
        break;
      case "newest":
      default:
        result.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return result;
  }, [courses, searchQuery, selectedAreas, selectedModalities, selectedProgramTypes, maxPrice, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredCourses.length / coursesPerPage);
  const paginatedCourses = filteredCourses.slice(
    (currentPage - 1) * coursesPerPage,
    currentPage * coursesPerPage
  );

  const toggleArea = (areaId: string) => {
    setSelectedAreas((prev) =>
      prev.includes(areaId) ? prev.filter((a) => a !== areaId) : [...prev, areaId]
    );
    setCurrentPage(1);
  };

  const toggleProgramType = (typeId: string) => {
    setSelectedProgramTypes((prev) =>
      prev.includes(typeId) ? prev.filter((a) => a !== typeId) : [...prev, typeId]
    );
    setCurrentPage(1);
  };

  const toggleModality = (modalityId: string) => {
    setSelectedModalities((prev) =>
      prev.includes(modalityId) ? prev.filter((m) => m !== modalityId) : [...prev, modalityId]
    );
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSelectedAreas([]);
    setSelectedProgramTypes([]);
    setSelectedModalities([]);
    setMaxPrice(10000);
    setSearchQuery("");
    setCurrentPage(1);
  };

  const activeFiltersCount = selectedAreas.length + selectedModalities.length + selectedProgramTypes.length +
    (maxPrice < 10000 ? 1 : 0);

  const FilterContent = () => (
    <div className="space-y-2">
      <Accordion type="multiple" defaultValue={["area"]} className="w-full">
        {/* Areas */}
        <AccordionItem value="area" className="border-none">
          <AccordionTrigger className="hover:no-underline py-3 px-1">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-accent" />
              <span className="font-semibold text-foreground">Área de Estudio</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-2 pb-4 px-1">
            <div className="space-y-3">
              {areas.map((area) => (
                <label
                  key={area.id}
                  className="flex items-center gap-3 cursor-pointer group"
                >
                  <Checkbox
                    checked={selectedAreas.includes(area.id)}
                    onCheckedChange={() => toggleArea(area.id)}
                  />
                  <span className="text-sm text-foreground group-hover:text-accent transition-colors flex-1">
                    {area.label}
                  </span>
                </label>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Grouped Secondary Filters */}
        <AccordionItem value="advanced" className="border-none">
          <AccordionTrigger className="hover:no-underline py-3 px-1">
            <div className="flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-muted-foreground" />
              <span className="font-semibold text-foreground">Refinar Búsqueda</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-2 pb-4 px-1 space-y-6">
            {/* Program Type */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Layers className="w-3.5 h-3.5 text-muted-foreground" />
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Tipo</h4>
              </div>
              <div className="space-y-3">
                {programTypes.map((type) => (
                  <label
                    key={type.id}
                    className="flex items-center gap-3 cursor-pointer group"
                  >
                    <Checkbox
                      checked={selectedProgramTypes.includes(type.id)}
                      onCheckedChange={() => toggleProgramType(type.id)}
                    />
                    <span className="text-sm text-foreground group-hover:text-accent transition-colors flex-1">
                      {type.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Modality */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Modalidad</h4>
              </div>
              <div className="space-y-3">
                {modalities.map((modality) => (
                  <label
                    key={modality.id}
                    className="flex items-center gap-2 cursor-pointer group"
                  >
                    <Checkbox
                      checked={selectedModalities.includes(modality.id)}
                      onCheckedChange={() => toggleModality(modality.id)}
                    />
                    <span className="text-sm text-foreground group-hover:text-accent transition-colors flex-1">
                      {modality.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Price Range */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <BadgeDollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Inversión</h4>
              </div>
              <RadioGroup
                value={maxPrice.toString()}
                onValueChange={(val) => {
                  setMaxPrice(Number(val));
                  setCurrentPage(1);
                }}
                className="space-y-2.5"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="10000" id="price-all" />
                  <label htmlFor="price-all" className="text-sm text-foreground cursor-pointer hover:text-accent transition-colors">
                    Todos
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="100" id="price-100" />
                  <label htmlFor="price-100" className="text-sm text-foreground cursor-pointer hover:text-accent transition-colors">
                    Menos de S/100
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="300" id="price-300" />
                  <label htmlFor="price-300" className="text-sm text-foreground cursor-pointer hover:text-accent transition-colors">
                    Menos de S/300
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="500" id="price-500" />
                  <label htmlFor="price-500" className="text-sm text-foreground cursor-pointer hover:text-accent transition-colors">
                    Menos de S/500
                  </label>
                </div>
              </RadioGroup>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Clear Filters */}
      {activeFiltersCount > 0 && (
        <div className="pt-4 border-t border-border mt-4">
          <Button variant="ghost" onClick={clearFilters} className="w-full text-xs text-muted-foreground hover:text-destructive h-8">
            Limpiar todos los filtros ({activeFiltersCount})
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="relative bg-hero-gradient pt-24 pb-10 md:pt-32 md:pb-24 overflow-hidden">
        {/* Background Pattern - Glowing Orbs */}
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
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-4 md:mb-6">
              Explora Nuestro <br />
              <span className="font-display italic text-accent">Catálogo Académico</span>
            </h1>
            <p className="hidden sm:block text-base md:text-xl text-white/80 mb-8 md:mb-10 max-w-2xl mx-auto leading-relaxed">
              Encuentra el programa perfecto para potenciar tus habilidades y alcanzar nuevas metas profesionales.
            </p>
            <p className="sm:hidden text-sm text-white/70 mb-6 mx-auto leading-relaxed">
              Cursos especializados con certificado verificable.
            </p>

            {/* Premium Search Bar */}
            <div className="relative w-full max-w-2xl mx-auto group px-4 md:px-0">
              <div className="absolute inset-0 bg-accent/20 rounded-2xl blur-xl group-hover:bg-accent/30 transition-colors opacity-0 group-hover:opacity-100 duration-500" />
              <div className="relative flex items-center bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl overflow-hidden focus-within:bg-white/20 transition-colors">
                <Search className="absolute left-4 md:left-5 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-white/70" />
                <input
                  type="text"
                  placeholder="¿Qué quieres aprender hoy?"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-10 md:pl-14 pr-4 md:pr-6 py-4 md:py-5 bg-transparent text-white placeholder:text-white/50 focus:outline-none text-base md:text-lg font-medium"
                />
              </div>
            </div>
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

      {/* Main Content */}
      <section className="section-padding pt-8 md:pt-16">
        <div className="container-custom">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Desktop Sidebar */}
            <aside className="hidden lg:block w-72 shrink-0">
              <div className="sticky top-24 bg-card rounded-2xl p-5 shadow-sm border border-border/50">
                <div className="flex items-center gap-2 mb-6 border-b border-border/50 pb-4">
                  <div className="p-1.5 bg-accent/10 rounded-lg">
                    <SlidersHorizontal className="w-4 h-4 text-accent" />
                  </div>
                  <h2 className="text-base font-bold text-foreground">
                    Filtros de búsqueda
                  </h2>
                </div>
                <FilterContent />
              </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1">
              {/* Toolbar — fila única compacta en mobile */}
              <div className="flex items-center gap-2 mb-6">
                {/* Botón filtros mobile */}
                <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm" className="lg:hidden relative shrink-0 px-3">
                      <SlidersHorizontal className="w-4 h-4" />
                      <span className="ml-1.5 hidden xs:inline">Filtros</span>
                      {activeFiltersCount > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-accent text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                          {activeFiltersCount}
                        </span>
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[min(320px,90vw)] overflow-y-auto">
                    <SheetHeader>
                      <SheetTitle>Filtros</SheetTitle>
                    </SheetHeader>
                    <div className="mt-6">
                      <FilterContent />
                    </div>
                  </SheetContent>
                </Sheet>

                {/* Sort — flex-1 en mobile, fijo en desktop */}
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="flex-1 sm:flex-none sm:w-[180px] text-sm">
                    <SelectValue placeholder="Ordenar por" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-accent" />
                        <span>Novedades</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="price-low">Precio: menor a mayor</SelectItem>
                    <SelectItem value="price-high">Precio: mayor a menor</SelectItem>
                  </SelectContent>
                </Select>

                {/* Contador */}
                <p className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                  <span className="font-semibold text-foreground">{filteredCourses.length}</span> cursos
                </p>
              </div>

              {/* Active Filters Tags — scroll horizontal en mobile */}
              {activeFiltersCount > 0 && (
                <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
                  {selectedAreas.map((areaId) => {
                    const area = areas.find((a) => a.id === areaId);
                    return (
                      <Badge
                        key={areaId}
                        variant="secondary"
                        className="pl-3 pr-2 py-1.5 gap-1 cursor-pointer hover:bg-destructive/10"
                        onClick={() => toggleArea(areaId)}
                      >
                        {area?.label}
                        <X className="w-3 h-3" />
                      </Badge>
                    );
                  })}
                  {/* Program Type Tags */}
                  {selectedProgramTypes.map((typeId) => {
                    const type = programTypes.find((t) => t.id === typeId);
                    return (
                      <Badge
                        key={typeId}
                        variant="secondary"
                        className="pl-3 pr-2 py-1.5 gap-1 cursor-pointer hover:bg-destructive/10"
                        onClick={() => toggleProgramType(typeId)}
                      >
                        {type?.label}
                        <X className="w-3 h-3" />
                      </Badge>
                    );
                  })}
                  {/* Modality Tags */}
                  {selectedModalities.map((modalityId) => {
                    const modality = modalities.find((m) => m.id === modalityId);
                    return (
                      <Badge
                        key={modalityId}
                        variant="secondary"
                        className="pl-3 pr-2 py-1.5 gap-1 cursor-pointer hover:bg-destructive/10"
                        onClick={() => toggleModality(modalityId)}
                      >
                        {modality?.label}
                        <X className="w-3 h-3" />
                      </Badge>
                    );
                  })}
                </div>
              )}

              {/* Courses Grid */}
              {isLoading ? (
                <div className="flex justify-center py-20"><Loader2 className="animate-spin w-10 h-10 text-primary" /></div>
              ) : paginatedCourses.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                  {paginatedCourses.map((course: any) => (
                    <CourseCard
                      key={course.id}
                      id={course.slug || course.id}
                      title={course.title}
                      instructor={course.instructor?.name || "Gerencia Educativa"}
                      image={course.image_url}
                      price={course.price}
                      originalPrice={course.original_price}
                      rating={course.rating ?? 0}
                      students={course.students}
                      duration={course.duration || "Flexible"}
                      category={course.category}
                      specialty={course.specialty}
                      level={course.level}
                      programType={course.metadata?.find((m: any) => m.key === 'program_type')?.value || 'course'}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 bg-card rounded-2xl border border-border">
                  <SearchX className="w-16 h-16 text-muted-foreground mb-4 mx-auto" strokeWidth={1.5} />
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    No se encontraron cursos
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    Intenta ajustar los filtros o buscar con otros términos
                  </p>
                  <Button variant="outline" onClick={clearFilters}>
                    Limpiar filtros
                  </Button>

                </div>
              )}

              {/* Always visible CTA for requesting courses */}
              <div className="mt-12 pt-8 border-t border-border flex flex-col items-center text-center">
                <p className="text-muted-foreground mb-4 font-medium">¿No encuentras lo que buscas?</p>
                <div className="max-w-xl mx-auto">
                  <Button variant="ghost" className="text-accent gap-2 h-auto py-2 px-4 hover:bg-accent/10" onClick={() => {
                    const phoneNumber = settings?.payment_number?.replace(/\D/g, "") || "51972787508";
                    window.open(`https://wa.me/${phoneNumber}?text=Hola, me gustaría solicitar información sobre un curso específico.`, '_blank');
                  }}>
                    <MessageSquare className="w-5 h-5 flex-shrink-0" />
                    <span className="text-base">Solicitar un curso o capacitación específica</span>
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    Si no ves el curso que necesitas, escríbenos. Desarrollamos capacitaciones a medida para grupos y empresas.
                  </p>
                </div>
              </div>



              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-1.5 mt-10">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3"
                  >
                    ←
                  </Button>

                  {/* Números de página: máx 5 visibles con ellipsis */}
                  {(() => {
                    const pages: (number | "...")[] = [];
                    if (totalPages <= 5) {
                      for (let i = 1; i <= totalPages; i++) pages.push(i);
                    } else {
                      pages.push(1);
                      if (currentPage > 3) pages.push("...");
                      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
                        pages.push(i);
                      }
                      if (currentPage < totalPages - 2) pages.push("...");
                      pages.push(totalPages);
                    }
                    return pages.map((page, idx) =>
                      page === "..." ? (
                        <span key={`ellipsis-${idx}`} className="px-1 text-muted-foreground text-sm">…</span>
                      ) : (
                        <Button
                          key={page}
                          variant={currentPage === page ? "accent" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className="w-9 h-9 p-0"
                        >
                          {page}
                        </Button>
                      )
                    );
                  })()}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3"
                  >
                    →
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section >

      <Footer />
    </div >
  );
};

export default Catalogo;
