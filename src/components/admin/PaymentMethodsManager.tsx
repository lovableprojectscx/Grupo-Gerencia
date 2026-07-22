import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash, Edit, Save, X, QrCode, University, Upload, Image as ImageIcon, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { PaymentMethod } from "@/types";
import { compressAndConvertToWebP, getOptimizedImageUrl } from "@/utils/imageUtils";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export function PaymentMethodsManager() {
    const [methods, setMethods] = useState<PaymentMethod[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<PaymentMethod>>({
        name: "",
        type: "qr",
        account_name: "",
        account_number: "",
        cci: "",
        qr_url: "",
        instructions: "",
        is_active: true
    });
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        fetchMethods();
    }, []);

    const fetchMethods = async () => {
        try {
            const { data, error } = await supabase
                .from('payment_methods')
                .select('*')
                .order('created_at', { ascending: true });

            if (error) throw error;
            setMethods(data || []);
        } catch (error: any) {
            toast.error("Error al cargar métodos de pago");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            if (!formData.name || !formData.account_name) {
                toast.error("Por favor completa los campos requeridos");
                return;
            }

            const dataToSave = {
                ...formData,
                is_active: formData.is_active ?? true
            };

            if (editingId) {
                const { error } = await supabase
                    .from('payment_methods')
                    .update(dataToSave)
                    .eq('id', editingId);
                if (error) throw error;
                toast.success("Método actualizado correctamente");
            } else {
                const { error } = await supabase
                    .from('payment_methods')
                    .insert([dataToSave]);
                if (error) throw error;
                toast.success("Método creado correctamente");
            }

            setIsDialogOpen(false);
            resetForm();
            fetchMethods();
        } catch (error: any) {
            toast.error("Error al guardar: " + error.message);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Estás seguro de eliminar este método de pago?")) return;

        try {
            const { error } = await supabase
                .from('payment_methods')
                .delete()
                .eq('id', id);

            if (error) throw error;
            toast.success("Método eliminado");
            fetchMethods();
        } catch (error: any) {
            toast.error("Error: " + error.message);
        }
    };

    const handleToggleActive = async (id: string, currentState: boolean) => {
        try {
            const { error } = await supabase
                .from('payment_methods')
                .update({ is_active: !currentState })
                .eq('id', id);

            if (error) throw error;
            toast.success(`Método ${!currentState ? 'activado' : 'desactivado'}`);
            fetchMethods();
        } catch (error: any) {
            toast.error("Error: " + error.message);
        }
    };

    const startEdit = (method: PaymentMethod) => {
        setEditingId(method.id);
        setFormData(method);
        setIsDialogOpen(true);
    };

    const resetForm = () => {
        setEditingId(null);
        setFormData({
            name: "",
            type: "qr",
            account_name: "",
            account_number: "",
            cci: "",
            qr_url: "",
            instructions: "",
            is_active: true
        });
    };

    const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const compressedFile = await compressAndConvertToWebP(file);
            const fileExt = compressedFile.name.split('.').pop() || 'webp';
            const fileName = `qr-${Math.random()}.${fileExt}`;
            const filePath = `payment-methods/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('course-content')
                .upload(filePath, compressedFile);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage
                .from('course-content')
                .getPublicUrl(filePath);

            setFormData({ ...formData, qr_url: data.publicUrl });
            toast.success("Código QR subido correctamente");
        } catch (error: any) {
            console.error(error);
            toast.error("Error al subir imagen");
        } finally {
            setUploading(false);
        }
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Métodos de Pago</CardTitle>
                    <CardDescription>Gestiona las cuentas bancarias y billeteras digitales disponibles.</CardDescription>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={(open) => {
                    setIsDialogOpen(open);
                    if (!open) resetForm();
                }}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            Nuevo Método
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>{editingId ? "Editar Método" : "Nuevo Método de Pago"}</DialogTitle>
                            <DialogDescription>
                                Configura los detalles que verán los estudiantes al pagar.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label>Tipo de Pago</Label>
                                <Select
                                    value={formData.type}
                                    onValueChange={(val: any) => setFormData({ ...formData, type: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona el tipo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="qr">Billetera Digital (QR)</SelectItem>
                                        <SelectItem value="bank_transfer">Transferencia Bancaria</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2">
                                <Label>Nombre del Método</Label>
                                <Input
                                    placeholder="Ej: Yape, BCP, Interbank"
                                    value={formData.name || ""}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label>Titular de la Cuenta</Label>
                                <Input
                                    placeholder="Nombre del titular"
                                    value={formData.account_name || ""}
                                    onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label>{formData.type === 'qr' ? 'Número de Celular' : 'Número de Cuenta'}</Label>
                                <Input
                                    placeholder={formData.type === 'qr' ? "999 999 999" : "Número de cuenta"}
                                    value={formData.account_number || ""}
                                    onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                                />
                            </div>

                            {formData.type === 'bank_transfer' && (
                                <div className="grid gap-2">
                                    <Label>CCI (Opcional)</Label>
                                    <Input
                                        placeholder="Código de Cuenta Interbancario"
                                        value={formData.cci || ""}
                                        onChange={(e) => setFormData({ ...formData, cci: e.target.value })}
                                    />
                                </div>
                            )}

                            {formData.type === 'qr' && (
                                <div className="grid gap-2">
                                    <Label>Imagen del Código QR</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="https://..."
                                            value={formData.qr_url || ""}
                                            onChange={(e) => setFormData({ ...formData, qr_url: e.target.value })}
                                            className="flex-1"
                                        />
                                        <div className="relative">
                                            <Input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleQrUpload}
                                                className="hidden"
                                                id="qr-upload"
                                                disabled={uploading}
                                            />
                                            <Button variant="outline" size="icon" asChild>
                                                <Label htmlFor="qr-upload" className="cursor-pointer">
                                                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                                </Label>
                                            </Button>
                                        </div>
                                    </div>
                                    {formData.qr_url && (
                                        <div className="mt-2 relative w-full h-40 bg-secondary/20 rounded-lg border overflow-hidden flex items-center justify-center">
                                            <img src={getOptimizedImageUrl(formData.qr_url, 400) || ""} alt="QR Preview" className="h-full object-contain" />
                                        </div>
                                    )}
                                    <p className="text-xs text-muted-foreground">Sube una imagen o pega la URL.</p>
                                </div>
                            )}

                            <div className="grid gap-2">
                                <Label>Instrucciones Adicionales (Opcional)</Label>
                                <Textarea
                                    placeholder="Ej: Enviar constancia al WhatsApp..."
                                    value={formData.instructions || ""}
                                    onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                                />
                            </div>

                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="active-mode"
                                    checked={formData.is_active}
                                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                                />
                                <Label htmlFor="active-mode">Método Activo</Label>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                            <Button onClick={handleSave}>Guardar</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="text-center py-8">Cargando...</div>
                ) : methods.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed rounded-lg">
                        <p className="text-muted-foreground mb-4">No hay métodos de pago configurados</p>
                        <Button variant="secondary" onClick={() => setIsDialogOpen(true)}>Agregar el primero</Button>
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {methods.map((method) => (
                            <Card key={method.id} className="relative overflow-hidden group">
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-2">
                                            {method.type === 'qr' ? (
                                                <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                                                    <QrCode className="w-5 h-5" />
                                                </div>
                                            ) : (
                                                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                                    <University className="w-5 h-5" />
                                                </div>
                                            )}
                                            <div>
                                                <CardTitle className="text-base">{method.name}</CardTitle>
                                                <CardDescription className="text-xs">
                                                    {method.type === 'qr' ? 'Billetera Digital' : 'Transferencia'}
                                                </CardDescription>
                                            </div>
                                        </div>
                                        <Switch
                                            checked={method.is_active}
                                            onCheckedChange={() => handleToggleActive(method.id, method.is_active)}
                                        />
                                    </div>
                                </CardHeader>
                                <CardContent className="text-sm space-y-2 pb-16">
                                    <div>
                                        <span className="text-muted-foreground block text-xs">Titular:</span>
                                        <span className="font-medium">{method.account_name}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground block text-xs">
                                            {method.type === 'qr' ? 'Número:' : 'Cuenta:'}
                                        </span>
                                        <span className="font-mono bg-secondary/50 px-1 rounded">{method.account_number}</span>
                                    </div>
                                    {method.cci && (
                                        <div>
                                            <span className="text-muted-foreground block text-xs">CCI:</span>
                                            <span className="font-mono bg-secondary/50 px-1 rounded">{method.cci}</span>
                                        </div>
                                    )}
                                </CardContent>
                                <CardFooter className="absolute bottom-0 w-full bg-secondary/10 border-t p-2 flex justify-end gap-2 translate-y-full group-hover:translate-y-0 transition-transform">
                                    <Button variant="ghost" size="sm" onClick={() => startEdit(method)}>
                                        <Edit className="w-4 h-4 mr-1" /> Editar
                                    </Button>
                                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(method.id)}>
                                        <Trash className="w-4 h-4 mr-1" /> Eliminar
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
