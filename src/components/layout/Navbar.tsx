import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ChevronDown, User, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useAuth } from "@/contexts/AuthContext";
import { LayoutDashboard, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const areas = [
  { id: "health", label: "Salud" },
  { id: "veterinary", label: "Veterinaria" },
  { id: "engineering", label: "Ingeniería Civil" },
  { id: "environmental", label: "Ingeniería Ambiental" },
  { id: "agronomy", label: "Agronomía" },
  { id: "management", label: "Gestión Pública y Empresarial" },
];
// Force sync categories: 2026-02-19 15:40

const navLinks = [
  {
    label: "Escuelas",
    href: "#",
    children: areas.map(area => ({
      label: area.label,
      href: `/catalogo?area=${area.id}`
    })),
    // Force refresh: 2026-02-19 15:40
  },
  { label: "Catálogo", href: "/catalogo" },
  { label: "Nosotros", href: "/nosotros" },
  { label: "Verificar Certificado", href: "/verificar" },
];

export const Navbar = () => {
  const { settings } = useSiteSettings();
  const { user, profile, signOut } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);



  useEffect(() => {
    setIsMobileMenuOpen(false);
    setActiveDropdown(null);
  }, [location]);

  // Check if current page should have transparent header
  const isTransparentPage =
    location.pathname === "/" ||
    location.pathname === "/catalogo" ||
    location.pathname === "/nosotros" ||
    location.pathname === "/verificar" ||
    location.pathname.startsWith("/curso/");

  return (
    <>
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          isScrolled || !isTransparentPage
            ? "bg-white/95 backdrop-blur-md shadow-sm py-3 border-b border-border/50"
            : "bg-transparent py-5"
        )}
      >
        <div className="container-custom">
          <nav className="flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-12 h-12 flex items-center justify-center">
                <img src="/assets/new-logo.png" alt="Logo" className="w-full h-full object-contain scale-125" />
              </div>
              <div className={cn(
                "transition-colors",
                isScrolled || !isTransparentPage ? "text-foreground" : "text-white"
              )}>
                <div className="font-bold text-xs sm:text-sm leading-tight text-left">{settings?.site_name || "Gerencia y Desarrollo Global"}</div>
                <div className={cn(
                  "text-[10px] sm:text-xs text-left",
                  isScrolled || !isTransparentPage ? "text-muted-foreground" : "text-white/70"
                )}>{settings?.site_description?.slice(0, 30) || "Educación de Calidad"}</div>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-8">
              {navLinks.map((link) => (
                <div
                  key={link.label}
                  className="relative"
                  onMouseEnter={() => link.children && setActiveDropdown(link.label)}
                  onMouseLeave={() => setActiveDropdown(null)}
                >
                  {link.children ? (
                    <button
                      className={cn(
                        "flex items-center gap-1 font-medium transition-colors",
                        isScrolled || !isTransparentPage
                          ? "text-foreground hover:text-accent"
                          : "text-white/90 hover:text-white"
                      )}
                    >
                      {link.label}
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  ) : (
                    <Link
                      to={link.href}
                      className={cn(
                        "font-medium transition-colors",
                        isScrolled || !isTransparentPage
                          ? "text-foreground hover:text-accent"
                          : "text-white/90 hover:text-white"
                      )}
                    >
                      {link.label}
                    </Link>
                  )}

                  {/* Dropdown */}
                  <AnimatePresence>
                    {link.children && activeDropdown === link.label && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-full left-0 pt-2"
                      >
                        <div className="bg-white rounded-xl shadow-xl border border-border p-2 min-w-[240px]">
                          {link.children.map((child) => (
                            <Link
                              key={child.label}
                              to={child.href}
                              className="block px-4 py-3 rounded-lg text-foreground hover:bg-secondary transition-colors"
                            >
                              {child.label}
                            </Link>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>

            {/* Desktop CTA */}
            <div className="hidden lg:flex items-center gap-3">
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={profile?.avatar_url || ""} alt={profile?.full_name || "User"} />
                        <AvatarFallback>{profile?.full_name?.charAt(0) || "U"}</AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{profile?.full_name}</p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {profile?.role === 'admin' && (
                      <DropdownMenuItem asChild>
                        <Link to="/admin">
                          <LayoutDashboard className="mr-2 h-4 w-4" />
                          Admin Dashboard
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard">
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        Mi Aprendizaje
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => signOut()}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Cerrar sesión
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button
                  variant={isScrolled || !isTransparentPage ? "default" : "heroOutline"}
                  size="sm"
                  asChild
                >
                  <Link to="/login">
                    <User className="w-4 h-4 mr-2" />
                    Iniciar sesión
                  </Link>
                </Button>
              )}

            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={cn(
                "lg:hidden p-2 rounded-lg transition-colors",
                isScrolled || !isTransparentPage
                  ? "text-foreground hover:bg-secondary"
                  : "text-white hover:bg-white/10"
              )}
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </nav>
        </div >
      </header >

      {/* Mobile Menu */}
      <AnimatePresence>
        {
          isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 lg:hidden"
            >
              <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <div className="absolute top-[72px] left-0 right-0 bg-white shadow-xl max-h-[calc(100vh-72px)] overflow-y-auto">
                <div className="p-6 space-y-4">
                  {navLinks.map((link) => (
                    <div key={link.label}>
                      {link.children ? (
                        <div className="space-y-2">
                          <div className="font-semibold text-foreground">{link.label}</div>
                          <div className="pl-4 space-y-2 border-l-2 border-border">
                            {link.children.map((child) => (
                              <Link
                                key={child.label}
                                to={child.href}
                                className="block py-2 text-muted-foreground hover:text-accent transition-colors"
                              >
                                {child.label}
                              </Link>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <Link
                          to={link.href}
                          className="block py-2 font-semibold text-foreground hover:text-accent transition-colors"
                        >
                          {link.label}
                        </Link>
                      )}
                    </div>
                  ))}

                  <div className="pt-4 border-t border-border space-y-3">
                    {user ? (
                      <>
                        <div className="flex items-center gap-3 px-2 py-2">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={profile?.avatar_url || ""} />
                            <AvatarFallback>{profile?.full_name?.charAt(0) || "U"}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{profile?.full_name}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                        <Button variant="outline" className="w-full justify-start" asChild>
                          <Link to={profile?.role === 'admin' ? "/admin" : "/dashboard"}>
                            <LayoutDashboard className="w-4 h-4 mr-2" />
                            {profile?.role === 'admin' ? "Admin Dashboard" : "Mi Dashboard"}
                          </Link>
                        </Button>
                        <Button variant="ghost" className="w-full justify-start text-destructive hover:text-destructive" onClick={() => signOut()}>
                          <LogOut className="w-4 h-4 mr-2" />
                          Cerrar Sesión
                        </Button>
                      </>
                    ) : (
                      <Button variant="outline" className="w-full" asChild>
                        <Link to="/login">
                          <User className="w-4 h-4 mr-2" />
                          Iniciar sesión
                        </Link>
                      </Button>
                    )}

                  </div>
                </div>
              </div>
            </motion.div>
          )
        }
      </AnimatePresence >
    </>
  );
};
