
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
import { CheckCircle, XCircle, Search, Eye, Loader2, FileImage, Award, CalendarDays, QrCode } from "lucide-react";
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
                    courses:course_id (title, price),
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

    const handleGenerateCertificate = async () => {
        if (!certDialogEnrollmentId) return;
        setIsGenerating(certDialogEnrollmentId);
        try {
            await courseService.generateCertificate(certDialogEnrollmentId, {}, certYear);
            toast.success(`Certificado generado — N° de registro con año ${certYear}`);
            queryClient.invalidateQueries({ queryKey: ["admin-enrollments"] });
            setCertDialogEnrollmentId(null);
        } catch (e: any) {
            toast.error("Error: " + e.message);
        } finally {
            setIsGenerating(null);
        }
    };

    const handleDownloadQR = async (certificateId: string, enrollmentName: string) => {
        try {
            const verificationUrl = `${window.location.origin}/verificar?code=${certificateId}`;
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
            pending: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
            rejected: "bg-red-100 text-red-800 hover:bg-red-100",
        };
        const labels: any = {
            active: "Aprobado",
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

                {['all', 'pending', 'active', 'rejected'].map(tab => (
                    <TabsContent key={tab} value={tab}>
                        <Card>
                            <CardHeader>
                                <CardTitle>Listado de Inscripciones</CardTitle>
                                <CardDescription>
                                    {tab === 'all' ? `${totalCount} inscripciones en total` : `${totalCount} inscripciones ${tab === 'active' ? 'aprobadas' : tab === 'pending' ? 'pendientes de revisión' : 'rechazadas'}`}
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
                                                {filteredEnrollments?.map((enrollment: any) => (
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
                                                            <div className="font-medium max-w-[200px] truncate" title={enrollment.courses?.title}>
                                                                {enrollment.courses?.title}
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
                                                                {enrollment.status === 'active' && (
                                                                    <>
                                                                        {enrollment.certificatesList && enrollment.certificatesList.length > 0 ? (
                                                                            <div className="flex flex-col items-end gap-1">
                                                                                <div className="flex gap-2">
                                                                                    <Button
                                                                                        variant="outline"
                                                                                        size="sm"
                                                                                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                                                                        onClick={() => window.open(`/verify/${enrollment.certificatesList[0].id}`, '_blank')}
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
                                                                                </div>
                                                                                {(() => {
                                                                                    const cert = enrollment.certificatesList[0];
                                                                                    const num = cert.registration_number || cert.metadata?.registration_number;
                                                                                    const year = cert.metadata?.registration_year;
                                                                                    if (!num) return null;
                                                                                    return (
                                                                                        <span className="text-xs text-muted-foreground font-mono">
                                                                                            N° {num}{year ? ` - ${year}` : ""}
                                                                                        </span>
                                                                                    );
                                                                                })()}
                                                                            </div>
                                                                        ) : (
                                                                            <Button
                                                                                variant="outline"
                                                                                size="sm"
                                                                                disabled={isGenerating === enrollment.id}
                                                                                onClick={() => {
                                                                                    setCertYear(new Date().getFullYear());
                                                                                    setCertDialogEnrollmentId(enrollment.id);
                                                                                }}
                                                                                className={isGenerating === enrollment.id ? "opacity-50" : ""}
                                                                                title="Generar Certificado Manualmente"
                                                                            >
                                                                                {isGenerating === enrollment.id ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Award className="w-4 h-4 mr-2" />}
                                                                                Generar
                                                                            </Button>
                                                                        )}
                                                                    </>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
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
            <Dialog open={!!certDialogEnrollmentId} onOpenChange={(open) => !open && setCertDialogEnrollmentId(null)}>
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
                    <div className="py-4">
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
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCertDialogEnrollmentId(null)}>
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
