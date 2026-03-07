
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import AuthLayout from "@/components/auth/AuthLayout";
import { Eye, EyeOff } from "lucide-react";
import { handleDbError } from "@/utils/errorHandler";

export default function ResetPassword() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    useEffect(() => {
        // Verificar si tenemos una sesión válida (el usuario viene del link del correo)
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) {
                toast.error("Enlace inválido o expirado");
                navigate("/login");
            }
        });
    }, [navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            return toast.error("Las contraseñas no coinciden");
        }

        if (password.length < 6) {
            return toast.error("La contraseña debe tener al menos 6 caracteres");
        }

        setLoading(true);

        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) throw error;

            toast.success("Contraseña actualizada correctamente");
            setTimeout(() => {
                navigate("/login", { replace: true });
            }, 2000);
        } catch (error: any) {
            toast.error(handleDbError(error, "Error al actualizar la contraseña."));
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout
            title="Nueva Contraseña"
            subtitle="Ingresa tu nueva contraseña para recuperar el acceso"
            backButton={{ href: "/login", label: "Cancelar" }}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="password">Nueva Contraseña</Label>
                    <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                    <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="••••••••"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                </div>

                <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <Button className="w-full h-12 text-base shadow-lg shadow-primary/20" type="submit" disabled={loading}>
                        {loading ? "Actualizando..." : "Actualizar Contraseña"}
                    </Button>
                </motion.div>
            </form>
        </AuthLayout>
    );
}
