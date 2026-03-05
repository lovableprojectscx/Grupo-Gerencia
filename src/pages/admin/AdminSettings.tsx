
import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Upload, Building, Smartphone, QrCode, FileImage, LayoutTemplate } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { PaymentMethodsManager } from "@/components/admin/PaymentMethodsManager";
import { CertificateBuilder } from "@/components/admin/CertificateBuilder";
import { Loader2 } from "lucide-react";
import { useRef } from "react";

export default function AdminSettings() {
    const { settings, loading: settingsLoading, refetch } = useSiteSettings();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        site_name: "",
        site_description: "",
        contact_email: "",
        contact_phone: "",
        payment_number: "",
        payment_qr_url: "",
        logo_url: ""
    });
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const logoInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (settings) {
            setFormData({
                site_name: settings.site_name || "",
                site_description: settings.site_description || "",
                contact_email: settings.contact_email || "",
                contact_phone: settings.contact_phone || "",
                payment_number: settings.payment_number || "",
                payment_qr_url: settings.payment_qr_url || "",
                logo_url: settings.logo_url || ""
            });
        }
    }, [settings]);

    const handleSave = async () => {
        setLoading(true);
        try {
            const { error } = await supabase
                .from('site_settings')
                .update({
                    site_name: formData.site_name,
                    site_description: formData.site_description,
                    contact_email: formData.contact_email,
                    contact_phone: formData.contact_phone,
                    payment_number: formData.payment_number,
                    payment_qr_url: formData.payment_qr_url,
                    logo_url: formData.logo_url
                })
                .eq('id', settings?.id); // Assumes single row logic usually, but ID makes it safe

            if (error) throw error;

            toast.success("Configuración actualizada correctamente");
            refetch();
        } catch (error: any) {
            toast.error("Error al guardar: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toast.error("El archivo no puede exceder los 5MB");
            if (logoInputRef.current) logoInputRef.current.value = "";
            return;
        }

        try {
            setUploadingLogo(true);
            const fileExt = file.name.split('.').pop();
            const fileName = `logo-${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('site-content')
                .upload(filePath, file, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('site-content')
                .getPublicUrl(filePath);

            setFormData({ ...formData, logo_url: publicUrl });
            toast.success("Logo subido correctamente. Haz clic en Guardar Cambios para aplicar.");
        } catch (error: any) {
            toast.error("Error al subir logo: " + error.message);
        } finally {
            setUploadingLogo(false);
            if (logoInputRef.current) logoInputRef.current.value = "";
        }
    };

    if (settingsLoading) return <div>Cargando configuración...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Configuración del SaaS</h1>
                    <p className="text-muted-foreground">Personaliza la identidad y métodos de pago de tu plataforma.</p>
                </div>
                <Button onClick={handleSave} disabled={loading}>
                    <Save className="w-4 h-4 mr-2" />
                    {loading ? "Guardando..." : "Guardar Cambios"}
                </Button>
            </div>

            <Tabs defaultValue="general" className="space-y-6">
                <TabsList className="bg-card border border-border p-1">
                    <TabsTrigger value="general" className="px-6">Identidad y Marca</TabsTrigger>
                    <TabsTrigger value="payment" className="px-6">Pagos (Yape/Plin)</TabsTrigger>
                    <TabsTrigger value="certificate-template" className="px-6">
                        <LayoutTemplate className="w-4 h-4 mr-2" />
                        Plantilla de Certificado
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="general">
                    <Card>
                        <CardHeader>
                            <CardTitle>Información del Negocio</CardTitle>
                            <CardDescription>Estos datos aparecerán en el título, footer y correos.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>Nombre del Sitio (Título)</Label>
                                    <div className="relative">
                                        <Building className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            className="pl-9"
                                            placeholder="Mi Academia Online"
                                            value={formData.site_name}
                                            onChange={(e) => setFormData({ ...formData, site_name: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Teléfono de Contacto</Label>
                                    <div className="relative">
                                        <Smartphone className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            className="pl-9"
                                            placeholder="+51 900 000 000"
                                            value={formData.contact_phone}
                                            onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Descripción Corta (SEO)</Label>
                                <Input
                                    placeholder="Plataforma líder en educación..."
                                    value={formData.site_description}
                                    onChange={(e) => setFormData({ ...formData, site_description: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>URL del Logo</Label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <FileImage className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            className="pl-9"
                                            placeholder="https://..."
                                            value={formData.logo_url}
                                            onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                                        />
                                    </div>
                                    <input
                                        type="file"
                                        accept="image/png, image/jpeg, image/svg+xml"
                                        className="hidden"
                                        ref={logoInputRef}
                                        onChange={handleFileUpload}
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => logoInputRef.current?.click()}
                                        disabled={uploadingLogo}
                                    >
                                        {uploadingLogo ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                                        Subir
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="payment">
                    <PaymentMethodsManager />
                </TabsContent>

                <TabsContent value="certificate-template">
                    <Card className="mb-4">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <LayoutTemplate className="w-5 h-5" />
                                Plantilla Global de Certificado
                            </CardTitle>
                            <CardDescription>
                                Diseña un modelo base de certificado. Puedes aplicarlo como punto de partida en cualquier curso.
                            </CardDescription>
                        </CardHeader>
                    </Card>
                    <CertificateBuilder
                        template={settings?.default_certificate_template}
                        onSaveSettings={async (template) => {
                            const { error } = await supabase
                                .from('site_settings')
                                .update({ default_certificate_template: template })
                                .eq('id', settings?.id);
                            if (error) throw error;
                            refetch();
                        }}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}
