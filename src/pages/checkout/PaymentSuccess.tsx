import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, ShieldCheck, Loader2, MessageCircle } from "lucide-react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useSiteSettings } from "@/hooks/useSiteSettings";

export default function PaymentSuccess() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const enrollmentId = searchParams.get("enrollmentId");
    const { settings } = useSiteSettings();

    // Status state
    const [status, setStatus] = useState<"pending" | "active" | "rejected" | "loading">("loading");
    const [courseId, setCourseId] = useState<string | null>(null);
    const [courseTitle, setCourseTitle] = useState<string | null>(null);
    const [userName, setUserName] = useState<string | null>(null);
    const [timeLeft, setTimeLeft] = useState(600); // 10 minutes visual countdown

    // Get user name
    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            setUserName(data.user?.user_metadata?.full_name || null);
        });
    }, []);

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    // 1. Initial Fetch
    useEffect(() => {
        const fetchEnrollment = async () => {
            if (!enrollmentId) {
                setStatus("pending"); // Fallback for old links or direct access
                return;
            }

            const { data, error } = await supabase
                .from("enrollments")
                .select("status, course_id, courses(title)")
                .eq("id", enrollmentId)
                .maybeSingle();

            if (error) {
                console.error("Error fetching enrollment:", error);
                setStatus("pending");
            } else if (data) {
                setStatus(data.status as any);
                setCourseId(data.course_id);
                setCourseTitle((data.courses as any)?.title || null);
            }
        };

        fetchEnrollment();

        // 2. Realtime Subscription
        if (!enrollmentId) return;

        const channel = supabase
            .channel(`enrollment-${enrollmentId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'enrollments',
                    filter: `id=eq.${enrollmentId}`,
                },
                (payload) => {

                    const newStatus = payload.new.status;
                    setStatus(newStatus);
                    if (newStatus === 'active') {
                        toast.success("¡Tu pago ha sido validado!");
                    } else if (newStatus === 'rejected') {
                        toast.error("Tu inscripción ha sido rechazada.");
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };

    }, [enrollmentId]);

    // 3. Polling Fallback (Every 3 seconds)
    useEffect(() => {
        if (!enrollmentId || status === 'active' || status === 'rejected') return;

        const pollTimer = setInterval(async () => {
            const { data } = await supabase
                .from("enrollments")
                .select("status, course_id")
                .eq("id", enrollmentId)
                .eq("id", enrollmentId)
                .maybeSingle();

            if (data && data.status !== status) {
                setStatus(data.status as any);
                if (data.status === 'active') {
                    setCourseId(data.course_id);
                    toast.success("¡Tu pago ha sido validado!");
                } else if (data.status === 'rejected') {
                    toast.error("Tu inscripción ha sido rechazada.");
                }
            }
        }, 3000);

        return () => clearInterval(pollTimer);
    }, [enrollmentId, status]);

    // Derived UI state
    const isApproved = status === 'active';
    const isRejected = status === 'rejected';

    // WhatsApp link con mensaje pre-armado
    const buildWhatsAppUrl = () => {
        const rawPhone = settings?.payment_number || settings?.contact_phone || "";
        const phone = rawPhone.replace(/\D/g, "").startsWith("51")
            ? rawPhone.replace(/\D/g, "")
            : `51${rawPhone.replace(/\D/g, "")}`;

        const message = [
            `Hola! 👋 Acabo de enviar mi comprobante de pago y quisiera activar mi curso lo antes posible.`,
            ``,
            `📚 *Curso:* ${courseTitle || "Pendiente"}`,
            userName ? `👤 *Nombre:* ${userName}` : "",
            `🔖 *N° de solicitud:* ${enrollmentId || "—"}`,
            ``,
            `¿Podrían verificar mi pago? ¡Gracias!`,
        ].filter(Boolean).join("\n");

        return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    };

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <Navbar />
            <main className="flex-1 flex flex-col items-center justify-center p-4 pt-32 animate-in fade-in duration-500">
                <div className="max-w-2xl w-full text-center space-y-8">

                    {/* Stepper / Mapita */}
                    <div className="w-full bg-card border border-border rounded-xl p-6 shadow-sm">
                        <div className="relative flex items-center justify-between">
                            {/* Connecting Line */}
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-secondary -z-0"></div>

                            {/* Steps */}
                            <div className="relative z-10 flex flex-col items-center gap-2">
                                <div className="w-10 h-10 rounded-full bg-green-600 text-white flex items-center justify-center shadow-lg ring-4 ring-background">
                                    <ShieldCheck className="w-5 h-5" />
                                </div>
                                <span className="text-sm font-medium text-foreground">Solicitud Enviada</span>
                            </div>

                            <div className="relative z-10 flex flex-col items-center gap-2">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg ring-4 ring-background transition-colors duration-500 ${isApproved ? "bg-green-600 text-white" : "bg-primary text-white"
                                    }`}>
                                    {isApproved ? <CheckCircle className="w-5 h-5" /> : <Clock className="w-5 h-5 animate-pulse" />}
                                </div>
                                <span className="text-sm font-medium text-foreground">
                                    {isApproved ? "Verificado" : "Verificando..."}
                                </span>
                            </div>

                            <div className="relative z-10 flex flex-col items-center gap-2">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg ring-4 ring-background transition-colors duration-500 ${isApproved ? "bg-green-600 text-white" : "bg-secondary text-muted-foreground"
                                    }`}>
                                    <CheckCircle className="w-5 h-5" />
                                </div>
                                <span className="text-sm font-medium text-muted-foreground">Acceso Habilitado</span>
                            </div>
                        </div>
                    </div>

                    {isApproved ? (
                        // SUCCESS VIEW
                        <div className="space-y-6 animate-in zoom-in duration-300">
                            <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle className="w-12 h-12" />
                            </div>
                            <h1 className="text-4xl font-bold text-green-600">¡Todo Listo!</h1>
                            <p className="text-xl text-muted-foreground">
                                Tu pago ha sido confirmado y ya tienes acceso al curso.
                            </p>
                            <Button size="xl" className="w-full md:w-auto px-12 bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/20" onClick={() => navigate(courseId ? `/classroom/${courseId}` : '/dashboard')}>
                                Ir a mi Aula Virtual
                            </Button>
                        </div>
                    ) : (
                        // PENDING VIEW
                        <div className="space-y-6 animate-in fade-in">
                            <h1 className="text-3xl font-bold">Pago Enviado</h1>
                            <div className="bg-primary/5 p-6 rounded-xl border border-primary/20 max-w-md mx-auto">
                                <p className="text-muted-foreground text-lg mb-2">
                                    Tiempo estimado de validación:
                                </p>
                                <div className="text-4xl font-mono font-bold text-primary tabular-nums">
                                    {formatTime(timeLeft)}
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">
                                    No cierres esta pestaña si deseas ver la confirmación inmediatamente.
                                    <br />Te enviaremos un correo también.
                                </p>
                            </div>
                            <div className="flex flex-col gap-3 max-w-sm mx-auto">
                                {/* WhatsApp para activación rápida */}
                                <a
                                    href={buildWhatsAppUrl()}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-3 w-full h-12 rounded-xl bg-[#25D366] hover:bg-[#20b558] text-white font-semibold text-sm transition-all hover:scale-[1.02] shadow-lg shadow-green-500/25"
                                >
                                    <MessageCircle className="w-5 h-5 fill-white" />
                                    ¿Quieres activación rápida? Escríbenos por WhatsApp
                                </a>

                                <Button asChild variant="outline" className="w-full">
                                    <Link to="/dashboard">
                                        Verificar luego desde mi Dashboard
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </main>
            <Footer />
        </div>
    );
}
