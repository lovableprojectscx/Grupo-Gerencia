
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { Loader2, Save, User } from "lucide-react";

export default function EditProfile() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        id: "",
        full_name: "",
        dni: "",
        phone: "",
        email: "",
        avatar_url: ""
    });

    useEffect(() => {
        getProfile();
    }, []);

    const getProfile = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                navigate("/login");
                return;
            }

            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .eq('id', user.id)
                .maybeSingle();

            if (error) throw error;

            if (data) {
                setFormData({
                    id: user.id,
                    full_name: data.full_name || "",
                    dni: data.dni || "",
                    phone: data.phone || "",
                    email: user.email || "",
                    avatar_url: data.avatar_url || ""
                });
            } else {
                // Profile doesn't exist yet, init with defaults
                setFormData({
                    id: user.id,
                    full_name: "",
                    dni: "",
                    phone: "",
                    email: user.email || "",
                    avatar_url: ""
                });
            }
        } catch (error) {
            console.error('Error loading profile:', error);
            toast.error("Error al cargar perfil");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: formData.full_name,
                    dni: formData.dni,
                    phone: formData.phone,
                    // avatar_url would go here
                })
                .eq('id', formData.id);

            if (error) throw error;
            toast.success("Perfil actualizado correctamente");
        } catch (error) {
            toast.error("Error al actualizar perfil");
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <Navbar />
            <main className="flex-1 container mx-auto px-4 py-8 mt-20">
                <div className="max-w-2xl mx-auto space-y-6">
                    <h1 className="text-3xl font-bold">Editar Perfil</h1>

                    <Card>
                        <CardHeader>
                            <CardTitle>Información Personal</CardTitle>
                            <CardDescription>Actualiza tus datos para que tus certificados se emitan correctamente.</CardDescription>
                        </CardHeader>
                        <form onSubmit={handleUpdate}>
                            <CardContent className="space-y-6">
                                <div className="flex flex-col items-center gap-4 mb-6">
                                    <Avatar className="w-24 h-24">
                                        <AvatarImage src={formData.avatar_url} />
                                        <AvatarFallback><User className="w-12 h-12" /></AvatarFallback>
                                    </Avatar>
                                    <Button variant="outline" type="button" size="sm" onClick={() => toast.info("Subida de foto no disponible en demo")}>
                                        Cambiar Foto
                                    </Button>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="email">Correo Electrónico</Label>
                                    <Input id="email" value={formData.email} disabled className="bg-muted" />
                                    <p className="text-xs text-muted-foreground mr-1">El correo no se puede cambiar.</p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="fullname">Nombres Completos</Label>
                                    <Input
                                        id="fullname"
                                        value={formData.full_name}
                                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="dni">DNI / Documento de Identidad</Label>
                                    <Input
                                        id="dni"
                                        value={formData.dni}
                                        onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
                                        required
                                    />
                                    <p className="text-xs text-yellow-600 font-medium">
                                        ⚠️ Importante: Este número aparecerá en tus certificados.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="phone">Número de Celular</Label>
                                    <Input
                                        id="phone"
                                        type="tel"
                                        placeholder="900 000 000"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                    <p className="text-xs text-muted-foreground">Para coordinar entregas o dudas sobre el curso.</p>
                                </div>
                            </CardContent>
                            <CardFooter className="flex justify-between">
                                <Button variant="ghost" type="button" onClick={() => navigate("/dashboard")}>
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={saving}>
                                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                    Guardar Cambios
                                </Button>
                            </CardFooter>
                        </form>
                    </Card>
                </div>
            </main>
            <Footer />
        </div>
    );
}
