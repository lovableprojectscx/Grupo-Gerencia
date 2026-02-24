
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

export default function Login() {
    const navigate = useNavigate();
    const location = useLocation();
    const from = (location.state as any)?.from || "/dashboard";
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        email: "",
        password: "",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: formData.email,
                password: formData.password,
            });

            if (error) throw error;

            toast.success("Bienvenido de nuevo");
            navigate(from, { replace: true });
        } catch (error: any) {
            toast.error(error.message || "Error al iniciar sesión");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout
            title="Bienvenido de nuevo"
            subtitle="Ingresa tus credenciales para continuar"
            backButton={{ href: "/", label: "Volver al inicio" }}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
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
                    <div className="flex justify-end">
                        <Link to="/forgot-password" className="text-xs text-muted-foreground hover:text-primary">
                            ¿Olvidaste tu contraseña?
                        </Link>
                    </div>
                </div>
                <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <Button className="w-full h-12 text-base shadow-lg shadow-primary/20" type="submit" disabled={loading}>
                        {loading ? "Ingresando..." : "Ingresar"}
                    </Button>
                </motion.div>
            </form>
            <div className="mt-4 text-center text-sm">
                <span className="text-muted-foreground">¿No tienes cuenta? </span>
                <Link to="/register" state={{ from }} className="text-primary hover:underline font-medium">
                    Regístrate aquí
                </Link>
            </div>
        </AuthLayout>
    );
}
