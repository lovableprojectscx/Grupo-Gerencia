
import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { CheckCircle, XCircle, Search, Eye, Loader2, FileImage, Award, CalendarDays, QrCode, Trash2, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { courseService } from "@/services/courseService";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import QRCode from "qrcode";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Mirror cliente de la función SQL `_certificate_template_is_usable`.
 * Una plantilla es utilizable si tiene `fields` no vacíos, o `bgImageFront`/`bgImage`.
 */
const isTemplateUsable = (tpl: any): boolean => {
    if (!tpl) return false;
    if (Array.isArray(tpl)) return tpl.length > 0;
    if (typeof tpl !== "object") return false;
    if (Array.isArray(tpl.fields) && tpl.fields.length > 0) return true;
    if ((tpl.bgImageFront && tpl.bgImageFront.length > 0) ||
        (tpl.bgImage && tpl.bgImage.length > 0)) return true;
    return false;
};

export default function AdminEnrollments() {
    const queryClient = useQueryClient();
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 10;
    const [activeTab, setActiveTab] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [selectedVoucher, setSelectedVoucher] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState<string | null>(null);
    const [certDialogEnrollmentId, setCertDialogEnrollmentId] = useState<string | null>(null);
    const [certDialogCourse, setCertDialogCourse] = useState<any | null>(null);
    const [certYear, setCertYear] = useState<number>(new Date().getFullYear());

    // Debounce search term — evita queries en cada tecla
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 400);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Resetear página cuando cambia el tab o la búsqueda
    useEffect(() => { setPage(1); }, [activeTab, debouncedSearch]);

    // Fetch Enrollments con paginación + filtro de tab + búsqueda en DB
    const { data, isLoading } = useQuery({
        queryKey: ["admin-enrollments", page, activeTab, debouncedSearch],
        queryFn: async () => {
            // Si hay búsqueda, primero obtenemos los user_ids que coinciden en profiles
            let userIdFilter: string[] | null = null;
            if (debouncedSearch) {
                const { data: profileMatches } = await supabase
                    .from('profiles')
                    .select('id')
                    .ilike('full_name', `%${debouncedSearch}%`);
                userIdFilter = (profileMatches || []).map((p: any) => p.id);
                // Si no hay coincidencias, devolvemos vacío sin hacer la query principal
                if (userIdFilter.length === 0) {
                    return { enrollments: [], count: 0 };
                }
            }

            let query = supabase
                .from('enrollments')
                .select(`
                    *,
                    profiles:user_id (full_name, dni, phone),
                    courses:course_id (id, title, price, certificate_template),
                    certificates(id, registration_number, metadata)
                `, { count: 'exact' });

            // Filtrar por tab en DB (no en cliente)
            if (activeTab !== 'all') {
                query = query.eq('status', activeTab);
            }

            // Filtrar por user_ids encontrados en la búsqueda
            if (userIdFilter !== null) {
                query = query.in('user_id', userIdFilter);
            }

            const from = (page - 1) * PAGE_SIZE;
            const to = from + PAGE_SIZE - 1;

            const { data, error, count } = await query
                .order('purchased_at', { ascending: false })
                .range(from, to);

            if (error) throw error;

            return { enrollments: data as any[], count: count || 0 };
        }
    });

    // Query: plantilla por defecto del sitio (fallback global)
    // Se cachea ampliamente; raramente cambia.
    const { data: siteDefaultTemplate } = useQuery({
        queryKey: ["site-default-certificate-template"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('site_settings')
                .select('default_certificate_template')
                .maybeSingle();
            if (error) {
                // No bloqueamos la UI si falla; simplemente se comporta como "sin default"
                console.warn("No se pudo cargar site_settings.default_certificate_template:", error);
                return null;
            }
            return data?.default_certificate_template ?? null;
        },
        staleTime: 5 * 60 * 1000, // 5 min
    });

    const siteDefaultUsable = isTemplateUsable(siteDefaultTemplate);


    // Mutations
    const approveMutation = useMutation({
        mutationFn: courseService.approveEnrollment,
        onSuccess: () => {
            toast.success("Inscripción aprobada");
            queryClient.invalidateQueries({ queryKey: ["admin-enrollments"] });
            queryClient.invalidateQueries({ queryKey: ["admin-pending-count"] });
        },
        onError: (error) => toast.error("Error al aprobar: " + error.message)
    });

    const rejectMutation = useMutation({
        mutationFn: courseService.rejectEnrollment,
        onSuccess: () => {
            toast.success("Inscripción rechazada");
            queryClient.invalidateQueries({ queryKey: ["admin-enrollments"] });
            queryClient.invalidateQueries({ queryKey: ["admin-pending-count"] });
        },
        onError: (error) => toast.error("Error al rechazar: " + error.message)
    });

    const deleteCertMutation = useMutation({
        mutationFn: courseService.deleteCertificate,
        onSuccess: () => {
            toast.success("Certificado eliminado correctamente. Puede volver a generarlo.");
            queryClient.invalidateQueries({ queryKey: ["admin-enrollments"] });
        },
        onError: (error) => toast.error("Error al eliminar el certificado: " + error.message)
    });

    const handleGenerateCertificate = async () => {
        if (!certDialogEnrollmentId) return;

        // Guardia doble en cliente antes de llamar al RPC — evita crear un
        // certificado con snapshot vacío si algún estado local estaba desincronizado.
        const courseTplUsable = isTemplateUsable(certDialogCourse?.certificate_template);
        if (!courseTplUsable && !siteDefaultUsable) {
            toast.error(
                "Este curso no tiene plantilla de certificado y tampoco existe una plantilla por defecto. " +
                "Configura una antes de generar."
            );
            return;
        }

        setIsGenerating(certDialogEnrollmentId);
        try {
            await courseService.generateCertificate(certDialogEnrollmentId, {}, certYear);
            toast.success(`Certificado generado — N° de registro con año ${certYear}`);
            queryClient.invalidateQueries({ queryKey: ["admin-enrollments"] });
            setCertDialogEnrollmentId(null);
            setCertDialogCourse(null);
        } catch (e: any) {
            toast.error("Error: " + e.message);
        } finally {
            setIsGenerating(null);
        }
    };

    const handleDownloadQR = async (certificateId: string, enrollmentName: string) => {
        try {
            const verificationUrl = `${window.location.origin}/verify/${certificateId}`;
            const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
                width: 400,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#ffffff'
                }
            });

            // Create a temporary link element to trigger the download
            const link = document.createElement('a');
            link.href = qrDataUrl;
            link.download = `QR_Certificado_${enrollmentName?.replace(/\s+/g, '_') || 'Alumno'}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success("Código QR descargado exitosamente");
        } catch (error) {
            console.error("Error generating QR for download:", error);
            toast.error("Hubo un error al generar el código QR");
        }
    };

    const enrollments = data?.enrollments || [];
    const totalCount = data?.count || 0;
    const totalPages = Math.ceil(totalCount / PAGE_SIZE);

    // Prepare data (normalize certificates)
    const filteredEnrollments = enrollments.map((enrollment: any) => {
        const certs = Array.isArray(enrollment.certificates)
            ? enrollment.certificates
            : (enrollment.certificates ? [enrollment.certificates] : []);
        enrollment.certificatesList = certs;
        return enrollment;
    });

    /* 
       Previous client-side filtering logic removed/commented because it conflicts with server-side pagination 
       (you can't filter what you haven't fetched).
       To re-enable search + pagination, we need a dedicated search RPC or advanced query builder.
       For "Optimization", raw speed is gained by pagination.
    */

    const getStatusVariant = (status: string) => {
        switch (status) {
            case 'active': return 'success'; // or default/secondary depending on theme
            case 'pending': return 'warning';
            case 'rejected': return 'destructive';
            default: return 'secondary';
        }
    };

    const StatusBadge = ({ status }: { status: string }) => {
        const variants: any = {
            active: "bg-green-100 text-green-800 hover:bg-green-100",
            completed: "bg-blue-100 text-blue-800 hover:bg-blue-100",
            pending: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
            rejected: "bg-red-100 text-red-800 hover:bg-red-100",
        };
        const labels: any = {
            active: "Aprobado",
            completed: "Completado",
            pending: "Pendiente",
            rejected: "Rechazado"
        };
        return <Badge className={variants[status] || ""}>{labels[status] || status}</Badge>;
    };


    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Inscripciones</h2>
                    <p className="text-muted-foreground">Gestiona los accesos y pagos de los estudiantes.</p>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
                    <TabsList>
                        <TabsTrigger value="all">Todas</TabsTrigger>
                        <TabsTrigger value="pending">Pendientes</TabsTrigger>
                        <TabsTrigger value="active">Activas</TabsTrigger>
                        <TabsTrigger value="completed">Completadas</TabsTrigger>
                        <TabsTrigger value="rejected">Rechazadas</TabsTrigger>
                    </TabsList>
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por nombre de estudiante..."
                            className="pl-8"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {['all', 'pending', 'active', 'completed', 'rejected'].map(tab => (
                    <TabsContent key={tab} value={tab}>
                        <Card>
                            <CardHeader>
                                <CardTitle>Listado de Inscripciones</CardTitle>
                                <CardDescription>
                                    {tab === 'all' ? `${totalCount} inscripciones en total` :
                                     tab === 'active' ? `${totalCount} inscripciones activas` :
                                     tab === 'completed' ? `${totalCount} inscripciones completadas (curso terminado)` :
                                     tab === 'pending' ? `${totalCount} inscripciones pendientes de revisión` :
                                     `${totalCount} inscripciones rechazadas`}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {isLoading ? (
                                    <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Fecha</TableHead>
                                                    <TableHead>Estudiante</TableHead>
                                                    <TableHead>Curso</TableHead>
                                                    <TableHead>Comprobante</TableHead>
                                                    <TableHead>Estado</TableHead>
                                                    <TableHead className="text-right">Acciones</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {filteredEnrollments?.map((enrollment: any) => {
                                                    // Estado de plantilla del curso (por fila)
                                                    const courseTplUsable = isTemplateUsable(enrollment.courses?.certificate_template);
                                                    const canEmitCert = courseTplUsable || siteDefaultUsable;
                                                    const tplFallbackNotice = !courseTplUsable && siteDefaultUsable
                                                        ? "Este curso no tiene plantilla propia. Se usará la plantilla por defecto del sitio."
                                                        : null;
                                                    const tplBlockedNotice = !canEmitCert
                                                        ? "Este curso no tiene plantilla de certificado configurada y no existe plantilla por defecto. Configura una antes de generar certificados."
                                                        : null;

                                                    return (
                                                    <TableRow key={enrollment.id}>
                                                        <TableCell className="font-medium whitespace-nowrap">
                                                            {format(new Date(enrollment.purchased_at), "dd MMM yyyy", { locale: es })}
                                                            <div className="text-xs text-muted-foreground">
                                                                {format(new Date(enrollment.purchased_at), "HH:mm", { locale: es })}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="font-medium">{enrollment.profiles?.full_name || "Sin nombre"}</div>
                                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                                <span>DNI: {enrollment.profiles?.dni || "-"}</span>
                                                                {enrollment.profiles?.phone && (
                                                                    <>
                                                                        <span className="border-l border-border pl-2">Tel: {enrollment.profiles.phone}</span>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-6 w-6 text-green-600 hover:text-green-700 hover:bg-green-50"
                                                                            onClick={() => {
                                                                                const phone = enrollment.profiles.phone.replace(/\D/g, "");
                                                                                const formattedPhone = phone.startsWith("51") ? phone : `51${phone}`;
                                                                                window.open(`https://wa.me/${formattedPhone}`, '_blank');
                                                                            }}
                                                                            title="Contactar por WhatsApp"
                                                                        >
                                                                            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                                                                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                                                            </svg>
                                                                        </Button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-2 max-w-[260px]">
                                                                <span className="font-medium truncate" title={enrollment.courses?.title}>
                                                                    {enrollment.courses?.title}
                                                                </span>
                                                                {tplBlockedNotice && (
                                                                    <TooltipProvider>
                                                                        <Tooltip>
                                                                            <TooltipTrigger asChild>
                                                                                <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-red-100 text-red-700 cursor-help flex-shrink-0">
                                                                                    <AlertTriangle className="w-3 h-3" />
                                                                                </span>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent className="max-w-xs">
                                                                                <p className="text-xs">{tplBlockedNotice}</p>
                                                                            </TooltipContent>
                                                                        </Tooltip>
                                                                    </TooltipProvider>
                                                                )}
                                                                {tplFallbackNotice && (
                                                                    <TooltipProvider>
                                                                        <Tooltip>
                                                                            <TooltipTrigger asChild>
                                                                                <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-amber-100 text-amber-700 cursor-help flex-shrink-0">
                                                                                    <AlertTriangle className="w-3 h-3" />
                                                                                </span>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent className="max-w-xs">
                                                                                <p className="text-xs">{tplFallbackNotice}</p>
                                                                            </TooltipContent>
                                                                        </Tooltip>
                                                                    </TooltipProvider>
                                                                )}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {enrollment.courses?.price ? `S/ ${enrollment.courses.price}` : "Gratis"}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            {enrollment.voucher_url ? (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-8 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                                                                    onClick={() => setSelectedVoucher(enrollment.voucher_url)}
                                                                >
                                                                    <FileImage className="w-4 h-4 mr-2" />
                                                                    Ver Voucher
                                                                </Button>
                                                            ) : (
                                                                <span className="text-xs text-muted-foreground italic">No adjunto</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            <StatusBadge status={enrollment.status} />
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex justify-end gap-2">
                                                                {enrollment.status === 'pending' && (
                                                                    <>
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            className="text-green-600 border-green-200 hover:bg-green-50"
                                                                            onClick={() => approveMutation.mutate(enrollment.id)}
                                                                            disabled={approveMutation.isPending}
                                                                            title="Aprobar Inscripción"
                                                                        >
                                                                            {approveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                                                        </Button>
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            className="text-red-600 border-red-200 hover:bg-red-50"
                                                                            onClick={() => rejectMutation.mutate(enrollment.id)}
                                                                            disabled={rejectMutation.isPending}
                                                                            title="Rechazar Inscripción"
                                                                        >
                                                                            {rejectMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                                                                        </Button>
                                                                    </>
                                                                )}
                                                                {(enrollment.status === 'active' || enrollment.status === 'completed') && (
                                                                    <>
                                                                        {enrollment.certificatesList && enrollment.certificatesList.length > 0 ? (
                                                                            <div className="flex flex-col items-end gap-1">
                                                                                <div className="flex gap-2">
                                                                                    <Button
                                                                                        variant="outline"
                                                                                        size="sm"
                                                                                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                                                                        onClick={() => window.open(`/certificate/${enrollment.certificatesList[0].id}`, '_blank')}
                                                                                    >
                                                                                        <Award className="w-4 h-4 mr-2" />
                                                                                        Ver Certificado
                                                                                    </Button>
                                                                                    <Button
                                                                                        variant="outline"
                                                                                        size="icon"
                                                                                        className="h-9 w-9 text-indigo-600 border-indigo-100 hover:bg-indigo-50 hover:text-indigo-700 shadow-sm"
                                                                                        title="Descargar código QR de validación"
                                                                                        onClick={() => handleDownloadQR(enrollment.certificatesList[0].id, enrollment.profiles?.full_name)}
                                                                                    >
                                                                                        <QrCode className="w-5 h-5" />
                                                                                    </Button>
                                                                                    <Button
                                                                                        variant="outline"
                                                                                        size="icon"
                                                                                        className="h-9 w-9 text-red-600 border-red-100 hover:bg-red-50 hover:text-red-700 shadow-sm"
                                                                                        title="Eliminar certificado"
                                                                                        onClick={() => {
                                                                                            if (confirm("¿Estás seguro de que deseas eliminar este certificado? Podrás volver a generarlo luego.")) {
                                                                                                deleteCertMutation.mutate(enrollment.certificatesList[0].id);
                                                                                            }
                                                                                        }}
                                                                                        disabled={deleteCertMutation.isPending}
                                                                                    >
                                                                                        {deleteCertMutation.isPending && deleteCertMutation.variables === enrollment.certificatesList[0].id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                                                                                    </Button>
                                                                                </div>
                                                                                {(() => {
                                                                                    const cert = enrollment.certificatesList[0];
                                                                                    const num = cert.registration_number || cert.metadata?.registration_number;
                                                                                    const year = cert.metadata?.registration_year;
                                                                                    if (!num) return null;
                                                                                    return (
                                                                                        <span className="text-xs text-muted-foreground font-mono">
                                                                                            {num}{year ? ` - ${year}` : ""}
                                                                                        </span>
                                                                                    );
                                                                                })()}
                                                                            </div>
                                                                        ) : (
                                                                            <TooltipProvider>
                                                                                <Tooltip>
                                                                                    <TooltipTrigger asChild>
                                                                                        {/* span wrapper para que el tooltip siga apareciendo cuando el botón está disabled */}
                                                                                        <span className="inline-flex">
                                                                                            <Button
                                                                                                variant="outline"
                                                                                                size="sm"
                                                                                                disabled={isGenerating === enrollment.id || !canEmitCert}
                                                                                                onClick={() => {
                                                                                                    if (!canEmitCert) return;
                                                                                                    setCertYear(new Date().getFullYear());
                                                                                                    setCertDialogEnrollmentId(enrollment.id);
                                                                                                    setCertDialogCourse(enrollment.courses);
                                                                                                }}
                                                                                                className={
                                                                                                    (isGenerating === enrollment.id ? "opacity-50 " : "") +
                                                                                                    (!canEmitCert ? "opacity-60 cursor-not-allowed" : "")
                                                                                                }
                                                                                                title={canEmitCert ? "Generar Certificado Manualmente" : undefined}
                                                                                            >
                                                                                                {isGenerating === enrollment.id
                                                                                                    ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                                                                    : !canEmitCert
                                                                                                        ? <AlertTriangle className="w-4 h-4 mr-2 text-red-500" />
                                                                                                        : <Award className="w-4 h-4 mr-2" />
                                                                                                }
                                                                                                Generar
                                                                                            </Button>
                                                                                        </span>
                                                                                    </TooltipTrigger>
                                                                                    {!canEmitCert && (
                                                                                        <TooltipContent className="max-w-xs">
                                                                                            <p className="text-xs">{tplBlockedNotice}</p>
                                                                                        </TooltipContent>
                                                                                    )}
                                                                                </Tooltip>
                                                                            </TooltipProvider>
                                                                        )}
                                                                    </>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                    );
                                                })}
                                                {!isLoading && (!filteredEnrollments || filteredEnrollments.length === 0) && (
                                                    <TableRow>
                                                        <TableCell colSpan={6} className="h-24 text-center">
                                                            No se encontraron inscripciones.
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                ))}
            </Tabs>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between border-t pt-4">
                <div className="text-sm text-muted-foreground">
                    Página {page} de {totalPages || 1} ({totalCount} registros)
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1 || isLoading}
                    >
                        Anterior
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages || isLoading}
                    >
                        Siguiente
                    </Button>
                </div>
            </div>

            {/* Dialog: Seleccionar año para el certificado */}
            <Dialog open={!!certDialogEnrollmentId} onOpenChange={(open) => {
                if (!open) {
                    setCertDialogEnrollmentId(null);
                    setCertDialogCourse(null);
                }
            }}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CalendarDays className="w-5 h-5 text-accent" />
                            Generar Certificado
                        </DialogTitle>
                        <DialogDescription>
                            El año se mostrará en el número de registro del certificado.<br />
                            Ejemplo: <span className="font-semibold text-foreground">101 - {certYear}</span>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-3">
                        <div>
                            <Label htmlFor="cert-year" className="mb-2 block">Año del certificado</Label>
                            <Input
                                id="cert-year"
                                type="number"
                                min={2020}
                                max={2099}
                                value={certYear}
                                onChange={(e) => setCertYear(Number(e.target.value))}
                                className="text-lg font-semibold"
                            />
                        </div>
                        {certDialogCourse && !isTemplateUsable(certDialogCourse.certificate_template) && siteDefaultUsable && (
                            <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="font-medium">Este curso no tiene plantilla propia.</p>
                                    <p>El certificado se emitirá con la <strong>plantilla por defecto del sitio</strong>. Podrás refrescarlo después si subes una plantilla específica al curso.</p>
                                </div>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setCertDialogEnrollmentId(null);
                                setCertDialogCourse(null);
                            }}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleGenerateCertificate}
                            disabled={!!isGenerating}
                            className="gap-2"
                        >
                            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4" />}
                            Generar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Voucher Dialog */}
            <Dialog open={!!selectedVoucher} onOpenChange={(open) => !open && setSelectedVoucher(null)}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Comprobante de Pago</DialogTitle>
                    </DialogHeader>
                    {selectedVoucher && (
                        <div className="mt-4 flex justify-center bg-black/5 rounded-lg p-4">
                            <img
                                src={selectedVoucher}
                                alt="Comprobante"
                                className="max-w-full h-auto rounded shadow-sm object-contain"
                            />
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
