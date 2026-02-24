import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import AuthLayout from "@/components/auth/AuthLayout";

export default function Register() {
    const navigate = useNavigate();
    const location = useLocation();
    const from = (location.state as any)?.from || "/dashboard";
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        fullName: "",
        dni: "",
        phone: "",
        email: "",
        password: "",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // 1. Sign up with Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        full_name: formData.fullName,
                        dni: formData.dni,
                        phone: formData.phone,
                        role: "student",
                    }
                }
            });

            if (authError) throw authError;

            if (authData.user) {
                // Profile is now created automatically by DB Trigger
                toast.success("Cuenta creada exitosamente");
                navigate(from, { replace: true });
            }
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Error al registrarse");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout
            title="Crear cuenta"
            subtitle="Únete a Gerencia y comienza a aprender hoy"
            backButton={{ href: "/login", label: "Volver al inicio de sesión" }}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="fullName">Nombres Completos</Label>
                    <Input
                        id="fullName"
                        placeholder="Juan Pérez"
                        required
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    />
                    <p className="text-xs text-amber-600 dark:text-amber-500 font-medium">
                        ⚠️ Importante: Escribe tu nombre correctamente. Este será el nombre que aparecerá en tus certificados y no se podrá cambiar automáticamente.
                    </p>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="dni">DNI</Label>
                    <Input
                        id="dni"
                        placeholder="12345678"
                        required
                        value={formData.dni}
                        onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="phone">Número de Celular</Label>
                    <Input
                        id="phone"
                        type="tel"
                        placeholder="900 000 000"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="email">Correo Electrónico</Label>
                    <Input
                        id="email"
                        type="email"
                        placeholder="tu@email.com"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="password">Contraseña</Label>
                    <div className="relative">
                        <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            required
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="pr-10"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 z-10 text-muted-foreground hover:text-foreground"
                            tabIndex={-1}
                        >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                </div>
                <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <Button className="w-full h-12 text-base shadow-lg shadow-primary/20" type="submit" disabled={loading}>
                        {loading ? "Registrando..." : "Registrarse"}
                    </Button>
                </motion.div>
            </form>
            <div className="mt-4 text-center text-sm">
                <span className="text-muted-foreground">¿Ya tienes cuenta? </span>
                <Link to="/login" state={{ from }} className="text-primary hover:underline font-medium">
                    Iniciar sesión
                </Link>
            </div>
        </AuthLayout>
    );
}
