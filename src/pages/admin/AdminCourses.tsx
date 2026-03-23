import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Plus, Search, Pencil, Loader2, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAdminCourses } from "@/hooks/useAdminCourses";
import { Link, useNavigate } from "react-router-dom";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export default function AdminCourses() {
    const { courses, isLoading } = useAdminCourses();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all"); // all, published, draft
    const [availabilityFilter, setAvailabilityFilter] = useState("active"); // all, active, archived

    const handleToggleArchive = async (id: string, currentStatus: boolean) => {
        // Toggle is_archived status
        // If currentStatus (is_archived) is true, we want to set it to false (Restore)
        // If currentStatus is false, we want to set it to true (Archive)
        const newStatus = !currentStatus;

        try {
            const { error } = await supabase
                .from('courses')
                .update({ is_archived: newStatus })
                .eq('id', id);

            if (error) throw error;

            // Invalidate query to refresh list
            queryClient.invalidateQueries({ queryKey: ["admin-courses"] });

            if (newStatus) {
                toast.success("Curso archivado (oculto en catálogo)");
            } else {
                toast.success("Curso restaurado");
            }

        } catch (error: any) {
            toast.error("Error al actualizar estado: " + error.message);
        }
    };

    const filteredCourses = courses.filter((course: any) => {
        const normalize = (val: string | undefined | null) => 
            (val || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

        // Search Filter
        const matchesSearch = normalize(course.title).includes(normalize(searchTerm));

        // Status Filter (Published/Draft)
        let matchesStatus = true;
        if (statusFilter === "published") matchesStatus = course.published === true;
        if (statusFilter === "draft") matchesStatus = course.published === false;

        // Availability Filter (Active/Archived)
        let matchesAvailability = true;
        if (availabilityFilter === "active") matchesAvailability = course.is_archived === false;
        if (availabilityFilter === "archived") matchesAvailability = course.is_archived === true;

        return matchesSearch && matchesStatus && matchesAvailability;
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Cursos</h2>
                <Link to="/admin/courses/new">
                    <Button className="bg-primary text-white hover:bg-primary/90">
                        <Plus className="w-4 h-4 mr-2" />
                        Nuevo Curso
                    </Button>
                </Link>
            </div>

            <div className="flex flex-col md:flex-row gap-4 bg-card p-4 rounded-xl border border-border">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar cursos..."
                        className="pl-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[180px]">
                            <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                            <SelectValue placeholder="Estado" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos los estados</SelectItem>
                            <SelectItem value="published">Publicados</SelectItem>
                            <SelectItem value="draft">Borradores</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
                        <SelectTrigger className="w-[180px]">
                            <div className="flex items-center">
                                <span className={`w-2 h-2 rounded-full mr-2 ${availabilityFilter === 'active' ? 'bg-green-500' : availabilityFilter === 'archived' ? 'bg-gray-400' : 'bg-blue-500'}`} />
                                <SelectValue placeholder="Disponibilidad" />
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todo (Activo + Archivo)</SelectItem>
                            <SelectItem value="active">Solo Activos</SelectItem>
                            <SelectItem value="archived">Solo Archivados</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="rounded-xl border border-border bg-card overflow-hidden">
                {isLoading ? (
                    <div className="p-12 flex justify-center text-muted-foreground">
                        <Loader2 className="w-8 h-8 animate-spin" />
                    </div>
                ) : filteredCourses.length === 0 ? (
                    <div className="p-12 text-center text-muted-foreground">
                        No se encontraron cursos con los filtros actuales.
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Curso</TableHead>
                                <TableHead>Instructor</TableHead>
                                <TableHead>Precio</TableHead>
                                <TableHead>Estado Publicación</TableHead>
                                <TableHead className="text-right">Disponibilidad</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredCourses.map((course: any) => (
                                <TableRow key={course.id} className={course.is_archived ? "bg-muted/30" : ""}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            {course.image_url && (
                                                <img
                                                    src={course.image_url}
                                                    alt={course.title}
                                                    className={`w-12 h-12 rounded-md object-cover ${course.is_archived ? "grayscale" : ""}`}
                                                />
                                            )}
                                            <div className="flex flex-col">
                                                <span className="font-medium max-w-[200px] truncate">
                                                    {course.title}
                                                </span>
                                                {course.is_archived && <span className="text-xs text-muted-foreground">(Archivado)</span>}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>{course.instructor?.name || "Sin asignar"}</TableCell>
                                    <TableCell>S/ {course.price}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Switch
                                                checked={course.published}
                                                onCheckedChange={async () => {
                                                    try {
                                                        const { error } = await supabase
                                                            .from('courses')
                                                            .update({ published: !course.published })
                                                            .eq('id', course.id);
                                                        if (error) throw error;
                                                        queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
                                                        toast.success(course.published ? "Curso despublicado (Borrador)" : "Curso publicado en el catálogo");
                                                    } catch (err: any) {
                                                        toast.error("Error: " + err.message);
                                                    }
                                                }}
                                            />
                                            <Badge variant={course.published ? "default" : "outline"}>
                                                {course.published ? "Publicado" : "Borrador"}
                                            </Badge>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <span className="text-xs text-muted-foreground mr-2">
                                                {course.is_archived ? "Archivado" : "Activo"}
                                            </span>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Switch
                                                        checked={!course.is_archived}
                                                        onCheckedChange={() => handleToggleArchive(course.id, course.is_archived)}
                                                        className="data-[state=checked]:bg-green-600"
                                                    />
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>{course.is_archived ? "Restaurar curso" : "Archivar curso (Soft Delete)"}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/courses/${course.id}`)}>
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>
        </div >
    );
}
