
import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import AuthLayout from "@/components/auth/AuthLayout";
import { handleDbError } from "@/utils/errorHandler";
import { ArrowLeft } from "lucide-react";

export default function ForgotPassword() {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState("");
    const [sent, setSent] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });

            if (error) throw error;

            setSent(true);
            toast.success("Correo de recuperación enviado");
        } catch (error: any) {
            toast.error(handleDbError(error, "Error al enviar el correo de recuperación."));
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout
            title="Recuperar Contraseña"
            subtitle="Ingresa tu correo para recibir las instrucciones"
            backButton={{ href: "/login", label: "Volver al inicio de sesión" }}
        >
            {sent ? (
                <div className="text-center space-y-6 animate-in fade-in">
                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl text-green-700 dark:text-green-300">
                        <p className="font-medium">¡Correo enviado!</p>
                        <p className="text-sm mt-1">Revisa tu bandeja de entrada (y spam) para restablecer tu contraseña.</p>
                    </div>
                    <Button variant="outline" className="w-full" onClick={() => setSent(false)}>
                        Intentar con otro correo
                    </Button>
                    <Link to="/login" className="block text-sm text-muted-foreground hover:text-primary transition-colors">
                        <ArrowLeft className="w-4 h-4 inline mr-1" />
                        Volver al Login
                    </Link>
                </div>
            ) : (
                <>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Correo Electrónico</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="tu@email.com"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <motion.div
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <Button className="w-full h-12 text-base shadow-lg shadow-primary/20" type="submit" disabled={loading}>
                                {loading ? "Enviando..." : "Enviar Instrucciones"}
                            </Button>
                        </motion.div>
                    </form>
                    <div className="mt-6 text-center">
                        <Link to="/login" className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-2">
                            <ArrowLeft className="w-4 h-4" />
                            Volver al Login
                        </Link>
                    </div>
                </>
            )}
        </AuthLayout>
    );
}
