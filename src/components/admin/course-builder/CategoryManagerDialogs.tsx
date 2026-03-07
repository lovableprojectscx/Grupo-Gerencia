import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Plus, GripVertical, AlertCircle, Loader2, Pencil } from "lucide-react";
import { useCategories } from "@/hooks/useCategories";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";

interface CategoryManagerDialogsProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
}

export function CategoryManagerDialogs({ isOpen, setIsOpen }: CategoryManagerDialogsProps) {
    const { categories, isLoading, createCategory, deleteCategory, createSpecialty, deleteSpecialty, updateCategory, updateSpecialty } = useCategories();

    // States for creating category
    const [newCatLabel, setNewCatLabel] = useState("");

    // States for managing a selected category (to add/edit specialties)
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [newSpecLabel, setNewSpecLabel] = useState("");

    // States for editing
    const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
    const [editCatLabel, setEditCatLabel] = useState("");
    const [editingSpecId, setEditingSpecId] = useState<string | null>(null);
    const [editSpecLabel, setEditSpecLabel] = useState("");

    const generateSlug = (text: string) => {
        return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    };

    const handleCreateCategory = async () => {
        if (!newCatLabel.trim()) return;
        try {
            const slug = generateSlug(newCatLabel);
            await createCategory({ label: newCatLabel, slug });
            setNewCatLabel("");
            toast.success("Categoría creada");
        } catch (error: any) {
            toast.error("Error al crear categoría: " + error.message);
        }
    };

    const handleUpdateCategory = async (id: string) => {
        if (!editCatLabel.trim()) return;
        try {
            const slug = generateSlug(editCatLabel);
            await updateCategory({ id, category: { label: editCatLabel, slug } });
            setEditingCategoryId(null);
            toast.success("Categoría actualizada");
        } catch (error: any) {
            toast.error("Error al actualizar: " + error.message);
        }
    };

    const handleDeleteCategory = async (id: string) => {
        if (!confirm("¿Seguro que deseas eliminar esta categoría? Se eliminarán todas sus especialidades. Asegúrate de que no haya cursos usando esta categoría.")) return;
        try {
            await deleteCategory(id);
            if (selectedCategoryId === id) setSelectedCategoryId(null);
            toast.success("Categoría eliminada");
        } catch (error: any) {
            toast.error("Error al eliminar categoría");
        }
    };

    const handleCreateSpecialty = async (categoryId: string) => {
        if (!newSpecLabel.trim()) return;
        try {
            const slug = generateSlug(newSpecLabel);
            await createSpecialty({ category_id: categoryId, label: newSpecLabel, slug });
            setNewSpecLabel("");
            toast.success("Especialidad creada");
        } catch (error: any) {
            toast.error("Error al crear especialidad: " + error.message);
        }
    };

    const handleUpdateSpecialty = async (id: string, categoryId: string) => {
        if (!editSpecLabel.trim()) return;
        try {
            const slug = generateSlug(editSpecLabel);
            await updateSpecialty({ id, specialty: { label: editSpecLabel, slug } });
            setEditingSpecId(null);
            toast.success("Especialidad actualizada");
        } catch (error: any) {
            toast.error("Error al actualizar: " + error.message);
        }
    };

    const handleDeleteSpecialty = async (id: string) => {
        if (!confirm("¿Seguro que deseas eliminar esta especialidad?")) return;
        try {
            await deleteSpecialty(id);
            toast.success("Especialidad eliminada");
        } catch (error: any) {
            toast.error("Error al eliminar especialidad");
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle>Gestionar Categorías y Especialidades</DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-hidden flex gap-4 mt-4 h-[500px]">
                    {/* Panel Izquierdo: Categorías */}
                    <div className="w-1/2 flex flex-col border rounded-md">
                        <div className="p-4 bg-muted/30 border-b flex flex-col gap-2">
                            <Label className="font-semibold text-base">Categorías</Label>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Nueva categoría..."
                                    value={newCatLabel}
                                    onChange={e => setNewCatLabel(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleCreateCategory()}
                                />
                                <Button size="icon" onClick={handleCreateCategory}>
                                    <Plus className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-2">
                            {isLoading ? (
                                <div className="flex justify-center p-4"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
                            ) : categories.length === 0 ? (
                                <div className="p-4 text-center text-muted-foreground text-sm">No hay categorías</div>
                            ) : categories.map(cat => (
                                <div
                                    key={cat.id}
                                    className={`flex items-center justify-between p-2 rounded-md border transition-colors cursor-pointer ${selectedCategoryId === cat.id ? 'bg-primary/5 border-primary/20' : 'hover:bg-muted/50'}`}
                                    onClick={() => setSelectedCategoryId(cat.id)}
                                >
                                    {editingCategoryId === cat.id ? (
                                        <div className="flex px-2 gap-2 flex-1 items-center" onClick={e => e.stopPropagation()}>
                                            <Input
                                                autoFocus
                                                value={editCatLabel}
                                                onChange={e => setEditCatLabel(e.target.value)}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') handleUpdateCategory(cat.id);
                                                    if (e.key === 'Escape') setEditingCategoryId(null);
                                                }}
                                                className="h-8"
                                            />
                                            <Button size="sm" onClick={() => handleUpdateCategory(cat.id)}>Guardar</Button>
                                            <Button size="sm" variant="ghost" onClick={() => setEditingCategoryId(null)}>Cancelar</Button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-center gap-2 px-2 flex-1">
                                                <GripVertical className="w-4 h-4 text-muted-foreground/50" />
                                                <span className="font-medium">{cat.label}</span>
                                            </div>
                                            <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => {
                                                    setEditCatLabel(cat.label);
                                                    setEditingCategoryId(cat.id);
                                                }}>
                                                    <Pencil className="w-4 h-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteCategory(cat.id)}>
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Panel Derecho: Especialidades */}
                    <div className="w-1/2 flex flex-col border rounded-md">
                        {selectedCategoryId ? (
                            <>
                                <div className="p-4 bg-muted/30 border-b flex flex-col gap-2">
                                    <Label className="font-semibold text-base">
                                        Especialidades de: <span className="text-primary">{categories.find(c => c.id === selectedCategoryId)?.label}</span>
                                    </Label>
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="Nueva especialidad..."
                                            value={newSpecLabel}
                                            onChange={e => setNewSpecLabel(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleCreateSpecialty(selectedCategoryId)}
                                        />
                                        <Button size="icon" onClick={() => handleCreateSpecialty(selectedCategoryId)}>
                                            <Plus className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                                    {categories.find(c => c.id === selectedCategoryId)?.specialties?.map(spec => (
                                        <div key={spec.id} className="flex items-center justify-between p-2 rounded-md border bg-card">
                                            {editingSpecId === spec.id ? (
                                                <div className="flex gap-2 flex-1 items-center px-2">
                                                    <Input
                                                        autoFocus
                                                        value={editSpecLabel}
                                                        onChange={e => setEditSpecLabel(e.target.value)}
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter') handleUpdateSpecialty(spec.id, selectedCategoryId);
                                                            if (e.key === 'Escape') setEditingSpecId(null);
                                                        }}
                                                        className="h-8"
                                                    />
                                                    <Button size="sm" onClick={() => handleUpdateSpecialty(spec.id, selectedCategoryId)}>Guardar</Button>
                                                    <Button size="sm" variant="ghost" onClick={() => setEditingSpecId(null)}>Cancelar</Button>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="flex items-center gap-2 px-2">
                                                        <span className="text-sm">{spec.label}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => {
                                                            setEditSpecLabel(spec.label);
                                                            setEditingSpecId(spec.id);
                                                        }}>
                                                            <Pencil className="w-4 h-4" />
                                                        </Button>
                                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteSpecialty(spec.id)}>
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                    {categories.find(c => c.id === selectedCategoryId)?.specialties?.length === 0 && (
                                        <div className="p-4 text-center text-muted-foreground text-sm flex flex-col items-center gap-2 mt-4">
                                            <AlertCircle className="w-8 h-8 opacity-20" />
                                            <span>No hay especialidades en esta categoría.</span>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                                <AlertCircle className="w-12 h-12 mb-4 opacity-20" />
                                <p>Selecciona una categoría en el panel izquierdo para ver o añadir sus especialidades.</p>
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
