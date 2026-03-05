
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
import { Search, MoreHorizontal, UserCheck, Shield, Loader2, Trash2, Key, Divide } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useState } from "react";
import { toast } from "sonner";

export default function AdminUsers() {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<string | null>(null);
    const [editData, setEditData] = useState({
        full_name: "",
        dni: "",
        phone: "",
        email: ""
    });

    const { data: users, isLoading } = useQuery({
        queryKey: ["admin-users"],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_users_for_admin');
            if (error) throw error;
            return data;
        },
    });

    // Mutations
    const toggleRoleMutation = useMutation({
        mutationFn: async ({ id, currentRole }: { id: string, currentRole: string }) => {
            const newRole = currentRole === 'admin' ? 'student' : 'admin';
            const { error } = await supabase
                .from('profiles')
                .update({ role: newRole })
                .eq('id', id);
            if (error) throw error;
            return newRole;
        },
        onSuccess: (newRole) => {
            queryClient.invalidateQueries({ queryKey: ["admin-users"] });
            toast.success(`Rol actualizado a ${newRole === 'admin' ? 'Administrador' : 'Estudiante'}`);
        },
        onError: (e: any) => toast.error("Error al actualizar rol: " + e.message),
    });

    const updateProfileMutation = useMutation({
        mutationFn: async ({ id, full_name, dni, phone, email, originalEmail }: { id: string, full_name: string, dni: string, phone: string, email: string, originalEmail: string }) => {
            // Actualizar perfil
            const { error: profileError } = await supabase
                .from('profiles')
                .update({ full_name, dni, phone })
                .eq('id', id);
            if (profileError) throw profileError;

            // Actualizar email solo si cambió
            if (email.trim().toLowerCase() !== originalEmail.trim().toLowerCase()) {
                const { error: emailError } = await supabase.rpc('update_user_email_by_admin', {
                    target_user_id: id,
                    new_email: email.trim()
                });
                if (emailError) throw emailError;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-users"] });
            toast.success("Perfil actualizado correctamente");
            setIsDialogOpen(false);
        },
        onError: (e: any) => toast.error("Error al actualizar: " + e.message),
    });

    const deleteUserMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.rpc('delete_user_by_admin', { target_user_id: id });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-users"] });
            toast.success("Usuario eliminado correctamente");
            setIsDeleteDialogOpen(false);
            setUserToDelete(null);
        },
        onError: (e: any) => toast.error("Error al eliminar usuario: " + e.message),
    });

    const filteredUsers = users?.filter((user: any) =>
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.dni?.includes(searchTerm)
    );

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">Usuarios</h2>

            <div className="flex items-center gap-4 bg-card p-4 rounded-xl border border-border">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por nombre o DNI..."
                        className="pl-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="rounded-xl border border-border bg-card overflow-hidden">
                {isLoading ? (
                    <div className="p-12 flex justify-center"><Loader2 className="animate-spin" /></div>
                ) : !filteredUsers?.length ? (
                    <div className="p-12 text-center text-muted-foreground">No hay usuarios encontrados.</div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Usuario</TableHead>
                                <TableHead>Rol</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead>Fecha Registro</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredUsers.map((user: any) => (
                                <TableRow key={user.id}>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium">{user.full_name || "Sin Nombre"}</span>
                                            <div className="flex gap-2 text-xs text-muted-foreground mt-0.5">
                                                <span>DNI: {user.dni || "-"}</span>
                                                {user.phone && (
                                                    <span className="border-l border-border pl-2 flex items-center gap-1">
                                                        Tel: {user.phone}
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-5 w-5 text-green-600 hover:text-green-700 hover:bg-green-50"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const phone = user.phone!.replace(/\D/g, "");
                                                                const formattedPhone = phone.startsWith("51") ? phone : `51${phone}`;
                                                                window.open(`https://wa.me/${formattedPhone}`, '_blank');
                                                            }}
                                                        >
                                                            <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                                                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                                            </svg>
                                                        </Button>
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {user.role === "admin" ? (
                                            <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">
                                                <Shield className="w-3 h-3 mr-1" />
                                                Admin
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline">Estudiante</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {(() => {
                                            const lastSeen = user.last_sign_in_at ? new Date(user.last_sign_in_at) : null;
                                            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                                            const isActive = lastSeen && lastSeen > thirtyDaysAgo;
                                            return isActive ? (
                                                <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-200">
                                                    Activo
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-muted-foreground">
                                                    Inactivo
                                                </Badge>
                                            );
                                        })()}
                                    </TableCell>
                                    <TableCell>
                                        {user.created_at ? format(new Date(user.created_at), "dd MMM yyyy", { locale: es }) : "-"}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => {
                                                    setSelectedUser(user);
                                                    setEditData({
                                                        full_name: user.full_name || "",
                                                        dni: user.dni || "",
                                                        phone: user.phone || "",
                                                        email: user.email || ""
                                                    });
                                                    setIsDialogOpen(true);
                                                }}>
                                                    <UserCheck className="mr-2 h-4 w-4" />
                                                    Ver / Editar Perfil
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={() => toggleRoleMutation.mutate({ id: user.id, currentRole: user.role })}>
                                                    <Key className="mr-2 h-4 w-4" />
                                                    {user.role === 'admin' ? 'Hacer Estudiante' : 'Hacer Admin'}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => {
                                                    setUserToDelete(user.id);
                                                    setIsDeleteDialogOpen(true);
                                                }}>
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Eliminar Usuario
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Perfil de Usuario</DialogTitle>
                        <DialogDescription>
                            Detalles registrados del usuario en el sistema.
                        </DialogDescription>
                    </DialogHeader>
                    {selectedUser && (
                        <div className="grid gap-4 py-4">
                            <div className="flex justify-center mb-4">
                                <Avatar className="h-24 w-24">
                                    <AvatarImage src={selectedUser.avatar_url} />
                                    <AvatarFallback className="text-2xl">{selectedUser.full_name?.charAt(0) || "U"}</AvatarFallback>
                                </Avatar>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Nombre</Label>
                                <Input
                                    className="col-span-3"
                                    value={editData.full_name}
                                    onChange={(e) => setEditData({ ...editData, full_name: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Correo</Label>
                                <Input
                                    className="col-span-3"
                                    type="email"
                                    value={editData.email}
                                    onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">DNI</Label>
                                <Input
                                    className="col-span-3"
                                    value={editData.dni}
                                    onChange={(e) => setEditData({ ...editData, dni: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Celular</Label>
                                <Input
                                    className="col-span-3"
                                    value={editData.phone}
                                    onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Rol</Label>
                                <div className="col-span-3 capitalize">{selectedUser.role || "Estudiante"}</div>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">ID</Label>
                                <div className="col-span-3 text-xs text-muted-foreground truncate" title={selectedUser.id}>{selectedUser.id}</div>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Registro</Label>
                                <div className="col-span-3 text-sm text-muted-foreground">
                                    {selectedUser.created_at ? format(new Date(selectedUser.created_at), "PPP p", { locale: es }) : "-"}
                                </div>
                            </div>
                            <div className="flex justify-end pt-4">
                                <Button
                                    onClick={() => updateProfileMutation.mutate({
                                        id: selectedUser.id,
                                        originalEmail: selectedUser.email || "",
                                        ...editData
                                    })}
                                    disabled={updateProfileMutation.isPending}
                                >
                                    {updateProfileMutation.isPending ? "Guardando..." : "Guardar Cambios"}
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción no se puede deshacer. Esto eliminará permanentemente al usuario y todos sus datos asociados (inscripciones, progreso, certificados).
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => userToDelete && deleteUserMutation.mutate(userToDelete)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {deleteUserMutation.isPending ? "Eliminando..." : "Eliminar Usuario"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div >
    );
}
