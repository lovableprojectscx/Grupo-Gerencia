
import { useState } from "react";
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
import { CheckCircle, XCircle, Search, Eye, Loader2, FileImage, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { courseService } from "@/services/courseService";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminEnrollments() {
    const queryClient = useQueryClient();
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 10;
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedVoucher, setSelectedVoucher] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState<string | null>(null);

    // Fetch Enrollments with Pagination
    const { data, isLoading } = useQuery({
        queryKey: ["admin-enrollments", page, searchTerm],
        queryFn: async () => {
            // Base query building
            let query = supabase
                .from('enrollments')
                .select(`
                    *,
                    profiles:user_id (full_name, dni),
                    courses:course_id (title, price),
                    certificates(id)
                `, { count: 'exact' });

            // Apply search filter on DB side if possible? 
            // Supabase filtering on joined tables is tricky with OR logic across relations.
            // For MVP performance, we'll keep client-side search ONLY for the current page or 
            // simpler: we accept that full-text search across relations is hard without RPC.
            // But strict pagination is the goal.
            // Let's implement strict pagination sort by purchased_at.

            // If search is active, we might need a specific RPC or complex filter. 
            // For now, let's paginate ALL, and filter client side? NO, that defeats the purpose.
            // Let's implement DB filtering for common fields if feasible, or just pagination.
            // Given the complexity of searching "student name" (join) + "course title" (join) via top-level API
            // it's better to rely on Supabase's "!inner" if searching, but that filters the parent.

            // Simple approach: Pagination of RAW result.
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

    const handleGenerateCertificate = async (enrollmentId: string) => {
        setIsGenerating(enrollmentId);
        try {
            await courseService.generateCertificate(enrollmentId, {});
            toast.success("Certificado generado exitosamente");
            queryClient.invalidateQueries({ queryKey: ["admin-enrollments"] });
        } catch (e: any) {
            toast.error("Error: " + e.message);
        } finally {
            setIsGenerating(null);
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

            <Tabs defaultValue="all" className="w-full">
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
                            placeholder="Buscar por estudiante o curso..."
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
                                    {tab === 'all' ? 'Mostrando todas las inscripciones' : `Mostrando inscripciones ${tab === 'active' ? 'activas' : tab === 'pending' ? 'pendientes' : 'rechazadas'}`}
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
                                                {filteredEnrollments?.filter((e: any) => tab === 'all' || e.status === tab).map((enrollment: any) => (
                                                    <TableRow key={enrollment.id}>
                                                        <TableCell className="font-medium whitespace-nowrap">
                                                            {format(new Date(enrollment.purchased_at), "dd MMM yyyy", { locale: es })}
                                                            <div className="text-xs text-muted-foreground">
                                                                {format(new Date(enrollment.purchased_at), "HH:mm", { locale: es })}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="font-medium">{enrollment.profiles?.full_name || "Sin nombre"}</div>
                                                            <div className="text-xs text-muted-foreground">{enrollment.profiles?.dni}</div>
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
                                                                            <Button
                                                                                variant="outline"
                                                                                size="sm"
                                                                                className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                                                                onClick={() => window.open(`/verify/${enrollment.certificatesList[0].id}`, '_blank')}
                                                                            >
                                                                                <Award className="w-4 h-4 mr-2" />
                                                                                Ver Certificado
                                                                            </Button>
                                                                        ) : (
                                                                            <Button
                                                                                variant="outline"
                                                                                size="sm"
                                                                                disabled={isGenerating === enrollment.id}
                                                                                onClick={() => handleGenerateCertificate(enrollment.id)}
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
