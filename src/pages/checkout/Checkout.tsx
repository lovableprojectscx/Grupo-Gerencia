import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
    CheckCircle2,
    ArrowRight,
    ShieldCheck,
    Smartphone,
    Copy,
    ScanLine,
    Loader2,
    UploadCloud,
    CreditCard,
    Lock,
    FileText,
    AlertCircle,
    University
} from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { courseService } from "@/services/courseService";
import { motion } from "framer-motion";
import { PaymentMethod } from "@/types";

export default function Checkout() {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const { settings } = useSiteSettings();
    const [user, setUser] = useState<any>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
    const MAX_FILE_SIZE_MB = 5;
    const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024; // 5MB en bytes

    // Fetch active payment methods
    useEffect(() => {
        const fetchMethods = async () => {
            const { data } = await supabase
                .from('payment_methods')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: true });

            if (data && data.length > 0) {
                setPaymentMethods(data);
                setSelectedMethodId(data[0].id);
            }
        };
        fetchMethods();
    }, []);

    const selectedMethod = paymentMethods.find(m => m.id === selectedMethodId);

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            if (!data.user) {
                toast.error("Debes iniciar sesión para comprar");
                navigate("/login");
            } else {
                setUser(data.user);
            }
        });
    }, [navigate]);

    // Fetch real course
    const { data: course, isLoading: loadingCourse } = useQuery({
        queryKey: ["course", courseId],
        queryFn: () => courseService.getById(courseId!),
        enabled: !!courseId
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            if (selectedFile.size > MAX_FILE_SIZE) {
                toast.error(`El archivo es demasiado grande. Máximo permitido: ${MAX_FILE_SIZE_MB}MB`);
                e.target.value = ''; // Limpiar el input
                return;
            }
            setFile(selectedFile);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const droppedFile = e.dataTransfer.files[0];
            if (droppedFile.size > MAX_FILE_SIZE) {
                toast.error(`El archivo es demasiado grande. Máximo permitido: ${MAX_FILE_SIZE_MB}MB`);
                return;
            }
            setFile(droppedFile);
        }
    };

    const handleSubmit = async () => {
        if (!user) return;
        // Validación de tamaño defensiva antes de subir
        if (file && file.size > MAX_FILE_SIZE) {
            toast.error(`El comprobante supera el tamaño máximo de ${MAX_FILE_SIZE_MB}MB. Por favor, sube una imagen más pequeña.`);
            return;
        }
        setLoading(true);
        try {
            // Resolver el UUID real del curso.
            // courseId del URL puede ser un slug (ej. "nombre-del-curso") o un UUID.
            // Hacemos una consulta directa para garantizar que siempre usamos el UUID correcto.
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            const isUUID = uuidRegex.test(courseId || '');
            const { data: courseRow, error: courseIdErr } = await supabase
                .from('courses')
                .select('id')
                .eq(isUUID ? 'id' : 'slug', courseId!)
                .maybeSingle();
            if (courseIdErr) throw courseIdErr;
            const realCourseId = courseRow?.id;
            if (!realCourseId) throw new Error("Curso no encontrado");

            // 1. Check if already enrolled
            const { data: existing } = await supabase
                .from('enrollments')
                .select('id')
                .eq('user_id', user.id)
                .eq('course_id', realCourseId)
                .maybeSingle();

            if (existing) {
                toast.info("Ya tienes una solicitud para este curso");
                navigate("/dashboard");
                return;
            }

            // 1.5 Upload Voucher if exists
            let voucherUrl = null;
            if (file) {
                const fileExt = file.name.split('.').pop();
                const fileName = `${user.id}-${Date.now()}.${fileExt}`;
                const filePath = `receipts/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('course-content')
                    .upload(filePath, file);

                if (uploadError) throw uploadError;

                // Get Public URL
                const { data: { publicUrl } } = supabase.storage
                    .from('course-content')
                    .getPublicUrl(filePath);

                voucherUrl = publicUrl;
            }

            // 2. Create Enrollment (Pending)
            const { data: newEnrollment, error } = await supabase
                .from('enrollments')
                .insert([{
                    user_id: user.id,
                    course_id: realCourseId,
                    status: 'pending',
                    progress: 0,
                    voucher_url: voucherUrl
                }])
                .select('id')
                .single();

            if (error) throw error;

            toast.success("Inscripción solicitada. Verificaremos tu pago pronto.");
            navigate(`/checkout/success?enrollmentId=${newEnrollment.id}`);
        } catch (error: any) {
            toast.error("Error al procesar: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    if (loadingCourse) {
        return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>;
    }

    if (!course) return <div className="min-h-screen flex items-center justify-center">Curso no encontrado</div>;

    return (
        <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans">
            <Navbar />

            <main className="flex-1 container-custom pt-24 md:pt-32 pb-12 md:pb-20">
                {/* Steps Indicator - Fully Responsive */}
                <div className="flex items-center justify-center mb-8 md:mb-12">
                    <div className="flex items-center gap-2 md:gap-4">
                        {/* Step 1 */}
                        <div className="flex items-center gap-2 text-muted-foreground opacity-60">
                            <span className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-sm font-medium">1</span>
                            <span className="hidden md:block">Resumen</span>
                        </div>

                        <div className="w-8 md:w-12 h-[1px] bg-border" />

                        {/* Step 2 (Active) */}
                        <div className="flex items-center gap-2 text-primary font-medium scale-105 transform">
                            <span className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm shadow-lg shadow-primary/25 ring-2 ring-primary/20 ring-offset-2">2</span>
                            <span>Pago</span>
                        </div>

                        <div className="w-8 md:w-12 h-[1px] bg-border" />

                        {/* Step 3 */}
                        <div className="flex items-center gap-2 text-muted-foreground opacity-60">
                            <span className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-sm font-medium">3</span>
                            <span className="hidden md:block">Confirmación</span>
                        </div>
                    </div>
                </div>


                <div className="grid lg:grid-cols-3 gap-6 lg:gap-12 max-w-6xl mx-auto">

                    {/* Left Column: Payment Methods */}
                    <div className="lg:col-span-2 space-y-6 md:space-y-8">
                        <div className="space-y-1 md:space-y-2 text-center md:text-left">
                            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">Finalizar Compra</h1>
                            <p className="text-sm md:text-base text-muted-foreground">Selecciona tu método de pago y completa tu inscripción.</p>
                        </div>

                        <motion.div layout className="space-y-5 md:space-y-6">
                            {/* Payment Method Selection - Horizontal scroll on mobile */}
                            <div className="flex gap-2.5 md:gap-4 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory md:grid md:grid-cols-3 md:overflow-visible md:pb-0">
                                {paymentMethods.map((method) => (
                                    <div
                                        key={method.id}
                                        onClick={() => setSelectedMethodId(method.id)}
                                        className={`
                                            cursor-pointer rounded-xl border p-3 md:p-4 flex flex-col items-center justify-center gap-1.5 md:gap-2 text-center transition-all bg-card hover:bg-accent/5 snap-start shrink-0 w-[calc(50%-0.5rem)] min-w-[120px] md:w-auto md:min-w-0
                                            ${selectedMethodId === method.id ? "border-primary ring-1 ring-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/50"}
                                        `}
                                    >
                                        {method.type === 'qr' ? (
                                            <div className="p-1.5 md:p-2 bg-purple-100 text-purple-600 rounded-full">
                                                <ScanLine className="w-4 h-4 md:w-5 md:h-5" />
                                            </div>
                                        ) : (
                                            <div className="p-1.5 md:p-2 bg-blue-100 text-blue-600 rounded-full">
                                                <CreditCard className="w-4 h-4 md:w-5 md:h-5" />
                                            </div>
                                        )}
                                        <span className="font-semibold text-[11px] md:text-sm line-clamp-1">{method.name}</span>
                                    </div>
                                ))}
                            </div>

                            {selectedMethod && (
                                <Card className="border-border shadow-sm overflow-hidden animate-in fade-in zoom-in duration-300">
                                    <CardHeader className="bg-secondary/20 border-b border-border/50 pb-4 p-4 md:p-6 text-center md:text-left">
                                        <CardTitle className="flex flex-col md:flex-row items-center gap-2 text-base md:text-lg">
                                            {selectedMethod.type === 'qr' ? <Smartphone className="w-5 h-5 text-primary" /> : <University className="w-5 h-5 text-blue-600" />}
                                            <span>Datos para {selectedMethod.name}</span>
                                        </CardTitle>
                                        <CardDescription className="text-xs md:text-sm">
                                            {selectedMethod.type === 'qr' ? "Escanea el código o usa el número." : "Realiza la transferencia a la siguiente cuenta."}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-4 md:p-8 space-y-6 md:space-y-8">
                                        <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-start justify-center">
                                            {/* QR / Icon */}
                                            <div className="bg-white p-3 md:p-4 rounded-xl shadow-sm border border-border w-48 md:w-56 shrink-0 relative group transition-all hover:scale-105">
                                                {selectedMethod.type === 'qr' && selectedMethod.qr_url ? (
                                                    <div className="aspect-square relative overflow-hidden rounded-lg">
                                                        <img
                                                            src={selectedMethod.qr_url}
                                                            alt={`QR ${selectedMethod.name}`}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="aspect-square flex flex-col items-center justify-center bg-gray-50 rounded-lg text-muted-foreground">
                                                        {selectedMethod.type === 'qr' ? (
                                                            <ScanLine className="w-8 h-8 md:w-12 md:h-12 opacity-20" />
                                                        ) : (
                                                            <University className="w-8 h-8 md:w-12 md:h-12 opacity-20" />
                                                        )}
                                                        <span className="text-[10px] md:text-sm mt-2 block opacity-50">{selectedMethod.name}</span>
                                                    </div>
                                                )}
                                                {selectedMethod.type === 'qr' && <p className="text-center text-[10px] md:text-xs font-medium text-muted-foreground mt-2 md:mt-3">Escanea el QR</p>}
                                            </div>

                                            {/* Details */}
                                            <div className="flex-1 space-y-3 md:space-y-6 w-full text-center md:text-left">
                                                <div className="space-y-3 md:space-y-4">
                                                    <div>
                                                        <Label className="text-muted-foreground text-[10px] md:text-xs uppercase tracking-wider font-semibold">Titular</Label>
                                                        <div className="flex flex-col md:flex-row items-center gap-1 md:gap-2 mt-0.5 md:mt-1 text-foreground font-medium text-sm md:text-base justify-center md:justify-start">
                                                            <ShieldCheck className="w-3 h-3 md:w-4 md:h-4 text-emerald-500 hidden md:block" />
                                                            <span>{selectedMethod.account_name}</span>
                                                            <ShieldCheck className="w-3 h-3 md:w-4 md:h-4 text-emerald-500 md:hidden inline" />
                                                        </div>
                                                    </div>

                                                    <div className="relative group">
                                                        <Label className="text-muted-foreground text-[10px] md:text-xs uppercase tracking-wider font-semibold">
                                                            {selectedMethod.type === 'qr' ? "Número de Celular" : "Número de Cuenta"}
                                                        </Label>
                                                        <div className="flex items-center gap-2 mt-1 container-input bg-secondary/30 p-2 pl-3 md:pl-4 rounded-lg border border-border">
                                                            <span className="font-mono text-base md:text-xl font-bold tracking-wide text-foreground flex-1 text-center md:text-left break-all select-all">
                                                                {selectedMethod.account_number}
                                                            </span>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-8 w-8 p-0"
                                                                onClick={() => {
                                                                    navigator.clipboard.writeText(selectedMethod.account_number);
                                                                    toast.success("Copiado al portapapeles");
                                                                }}
                                                            >
                                                                <Copy className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </div>

                                                    {selectedMethod.cci && (
                                                        <div>
                                                            <Label className="text-muted-foreground text-[10px] md:text-xs uppercase tracking-wider font-semibold">CCI</Label>
                                                            <div className="flex items-center gap-2 mt-1.5 bg-secondary/10 p-2 pl-3 md:pl-4 rounded-lg border border-border/50">
                                                                <span className="font-mono text-xs md:text-sm tracking-wide text-foreground flex-1 text-center md:text-left break-all select-all">
                                                                    {selectedMethod.cci}
                                                                </span>
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="h-7 w-7 p-0"
                                                                    onClick={() => {
                                                                        navigator.clipboard.writeText(selectedMethod.cci!);
                                                                        toast.success("CCI copiado");
                                                                    }}
                                                                >
                                                                    <Copy className="w-3 h-3" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {selectedMethod.instructions && (
                                                        <div className="bg-amber-50 border border-amber-100 text-amber-700 p-3 rounded-lg text-xs md:text-sm flex gap-3 text-left">
                                                            <AlertCircle className="w-4 h-4 md:w-5 md:h-5 shrink-0 mt-0.5" />
                                                            <p>{selectedMethod.instructions}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </motion.div>

                        <Separator />

                        {/* Upload Section - Improved */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="voucher" className="text-sm md:text-base font-semibold">Adjuntar Comprobante</Label>
                                <span className="text-[10px] md:text-xs text-muted-foreground bg-secondary px-2 py-1 rounded">Requerido</span>
                            </div>

                            <div
                                className={`
                                    border-2 border-dashed rounded-xl p-6 md:p-8 text-center transition-all cursor-pointer relative
                                    ${isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-secondary/30"}
                                    ${file ? "bg-green-50 border-green-200" : ""}
                                `}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                            >
                                <Input
                                    id="voucher"
                                    type="file"
                                    accept="image/*,application/pdf"
                                    onChange={handleFileChange}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                />

                                {file ? (
                                    <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
                                        <div className="w-10 h-10 md:w-12 md:h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
                                            <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6 text-green-600" />
                                        </div>
                                        <p className="font-semibold text-green-700 text-base md:text-lg max-w-[200px] truncate">{file.name}</p>
                                        <p className="text-green-600/80 text-xs md:text-sm mt-1">Archivo listo para subir</p>
                                        <Button size="sm" variant="outline" className="mt-4 border-green-200 text-green-700 hover:bg-green-100 z-20 relative">
                                            Cambiar archivo
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center text-muted-foreground pointer-events-none">
                                        <div className="w-10 h-10 md:w-12 md:h-12 bg-secondary rounded-full flex items-center justify-center mb-3 group-hover:bg-primary/10 transition-colors">
                                            <UploadCloud className="w-5 h-5 md:w-6 md:h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                                        </div>
                                        <p className="font-medium text-foreground text-sm md:text-base">Toca para subir comprobante</p>
                                        <p className="hidden md:block text-sm mt-1">o arrastra el archivo aquí</p>
                                        <p className="text-xs mt-4 text-muted-foreground/70">JPG, PNG o PDF (Max 5MB)</p>
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>

                    {/* Right Column: Sticky Summary */}
                    <div className="lg:col-span-1">
                        <div className="lg:sticky lg:top-24 space-y-6">
                            <Card className="border-border shadow-lg overflow-hidden">
                                <CardHeader className="bg-slate-900 text-white p-4 md:p-6">
                                    <CardTitle className="text-base md:text-lg flex items-center gap-2">
                                        <FileText className="w-5 h-5 text-accent" />
                                        Resumen de Orden
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-4 md:p-6 space-y-6">
                                    {/* Course Item */}
                                    <div className="flex gap-4">
                                        <img
                                            src={course.image_url || "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=100&h=100&fit=crop"}
                                            alt={course.title}
                                            className="w-16 h-16 md:w-20 md:h-20 object-cover rounded-md border border-border shadow-sm shrink-0"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-semibold text-xs md:text-sm line-clamp-2 leading-tight mb-1">{course.title}</h4>
                                            <span className="text-[10px] md:text-xs text-muted-foreground block mb-2">{course.instructor?.name || "Gerencia Global"}</span>
                                            {course.original_price && course.original_price > course.price && (
                                                <Badge variant="outline" className="text-[10px] text-green-600 border-green-200 bg-green-50 px-1.5 py-0 h-5">
                                                    Ahorras S/{course.original_price - course.price}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>

                                    <Separator />

                                    {/* Totals */}
                                    <div className="space-y-3">
                                        <div className="flex justify-between text-xs md:text-sm text-muted-foreground">
                                            <span>Precio Regular</span>
                                            <span className="line-through">S/ {course.original_price || course.price}</span>
                                        </div>
                                        <div className="flex justify-between text-xs md:text-sm text-green-600 font-medium">
                                            <span>Descuento</span>
                                            <span>- S/ {course.original_price ? (course.original_price - course.price) : 0}</span>
                                        </div>
                                        <Separator className="my-2" />
                                        <div className="flex justify-between items-end">
                                            <span className="font-semibold text-sm md:text-base">Total a pagar</span>
                                            <div className="text-right">
                                                <div className="text-2xl md:text-3xl font-bold text-primary leading-none">S/ {course.price}</div>
                                                <div className="text-[10px] md:text-xs text-muted-foreground mt-1">Incluido IGV</div>
                                            </div>
                                        </div>
                                    </div>

                                    <Button
                                        className="w-full h-12 md:h-14 text-base md:text-lg font-bold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]"
                                        onClick={handleSubmit}
                                        disabled={loading || !file}
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Procesando...
                                            </>
                                        ) : (
                                            <>
                                                Completar Inscripción <ArrowRight className="w-5 h-5 ml-2" />
                                            </>
                                        )}
                                    </Button>

                                    {!file && (
                                        <p className="text-xs text-center text-red-500 font-medium animate-pulse">
                                            * Debes adjuntar el comprobante para continuar
                                        </p>
                                    )}

                                </CardContent>
                                <CardFooter className="bg-secondary/30 p-4 border-t border-border">
                                    <div className="flex items-center justify-center w-full gap-2 text-xs text-muted-foreground">
                                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                        <span>Garantía de devolución de dinero si no estás satisfecho</span>
                                    </div>
                                </CardFooter>
                            </Card>
                        </div>
                    </div>

                </div>
            </main>
            <Footer />
        </div>
    );
}
