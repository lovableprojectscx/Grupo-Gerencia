import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
    ClipboardCheck, Plus, Trash2, Download, Upload, Loader2, ChevronUp, ChevronDown,
    CheckCircle2, Circle, AlertTriangle, FileSpreadsheet, X,
} from "lucide-react";
import { toast } from "sonner";
import { courseService } from "@/services/courseService";
import {
    quizService, DEFAULT_QUIZ_SETTINGS, validateQuestion,
    type QuizQuestion, type QuizSettings,
} from "@/services/quizService";
import { downloadQuizTemplate, parseQuizExcel, OPTION_LETTERS } from "@/utils/quizExcel";
import { cn } from "@/lib/utils";

interface QuizEditorDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Módulo donde se crea el examen (modo creación). */
    moduleId: string | null;
    /** Lección existente (modo edición). */
    lesson: any | null;
    /** Orden para un examen nuevo. */
    nextOrder: number;
    onSaved: () => void;
}

const emptyQuestion = (): QuizQuestion => ({
    question: "",
    options: ["", ""],
    correct_index: 0,
    points: 1,
    explanation: "",
});

export function QuizEditorDialog({ open, onOpenChange, moduleId, lesson, nextOrder, onSaved }: QuizEditorDialogProps) {
    const [title, setTitle] = useState("");
    const [duration, setDuration] = useState("");
    const [settings, setSettings] = useState<Required<QuizSettings>>(DEFAULT_QUIZ_SETTINGS);
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [importing, setImporting] = useState(false);
    const [pendingImport, setPendingImport] = useState<{ questions: QuizQuestion[]; errors: string[]; fileName: string } | null>(null);
    const [attempts, setAttempts] = useState<any[] | null>(null);
    const [tab, setTab] = useState("questions");
    const fileRef = useRef<HTMLInputElement>(null);

    const isEdit = !!lesson?.id;

    // Cargar datos al abrir
    useEffect(() => {
        if (!open) return;
        setTab("questions");
        setPendingImport(null);
        setAttempts(null);
        setTitle(lesson?.title || "");
        setDuration(lesson?.duration || "");
        setSettings({ ...DEFAULT_QUIZ_SETTINGS, ...(lesson?.quiz_settings || {}) });
        if (lesson?.id) {
            setLoading(true);
            quizService.getQuestions(lesson.id)
                .then(setQuestions)
                .catch((e) => {
                    console.error(e);
                    toast.error("No se pudieron cargar las preguntas");
                    setQuestions([]);
                })
                .finally(() => setLoading(false));
        } else {
            setQuestions([emptyQuestion()]);
        }
    }, [open, lesson]);

    useEffect(() => {
        if (tab !== "results" || !lesson?.id || attempts !== null) return;
        quizService.getAttemptsForLesson(lesson.id)
            .then(setAttempts)
            .catch(() => setAttempts([]));
    }, [tab, lesson, attempts]);

    // ─── Edición de preguntas ───────────────────────────────────────────────
    const updateQuestion = (idx: number, patch: Partial<QuizQuestion>) =>
        setQuestions((qs) => qs.map((q, i) => (i === idx ? { ...q, ...patch } : q)));

    const updateOption = (qIdx: number, oIdx: number, value: string) =>
        setQuestions((qs) => qs.map((q, i) => i === qIdx
            ? { ...q, options: q.options.map((o, j) => (j === oIdx ? value : o)) }
            : q));

    const addOption = (qIdx: number) =>
        setQuestions((qs) => qs.map((q, i) => i === qIdx && q.options.length < OPTION_LETTERS.length
            ? { ...q, options: [...q.options, ""] }
            : q));

    const removeOption = (qIdx: number, oIdx: number) =>
        setQuestions((qs) => qs.map((q, i) => {
            if (i !== qIdx || q.options.length <= 2) return q;
            const options = q.options.filter((_, j) => j !== oIdx);
            let correct = q.correct_index;
            if (oIdx === correct) correct = 0;
            else if (oIdx < correct) correct -= 1;
            return { ...q, options, correct_index: correct };
        }));

    const moveQuestion = (idx: number, dir: -1 | 1) =>
        setQuestions((qs) => {
            const to = idx + dir;
            if (to < 0 || to >= qs.length) return qs;
            const copy = [...qs];
            [copy[idx], copy[to]] = [copy[to], copy[idx]];
            return copy;
        });

    const removeQuestion = (idx: number) => setQuestions((qs) => qs.filter((_, i) => i !== idx));

    // ─── Excel ──────────────────────────────────────────────────────────────
    const handleDownloadTemplate = async () => {
        try {
            await downloadQuizTemplate();
        } catch (e) {
            console.error(e);
            toast.error("No se pudo generar la plantilla");
        }
    };

    const handleExport = async () => {
        const valid = questions.filter((q) => !validateQuestion(q));
        if (!valid.length) {
            toast.info("No hay preguntas válidas para exportar");
            return;
        }
        const safe = (title || "examen").replace(/[^\w\-áéíóúñÁÉÍÓÚÑ ]+/g, "").trim().replace(/\s+/g, "_");
        try {
            await downloadQuizTemplate(valid, `${safe || "examen"}.xlsx`);
        } catch (e) {
            console.error(e);
            toast.error("No se pudo exportar el examen");
        }
    };

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;
        if (!/\.xlsx$/i.test(file.name)) {
            toast.error("Formato no soportado. Usa un archivo .xlsx (Excel)");
            return;
        }
        setImporting(true);
        try {
            const result = await parseQuizExcel(file);
            if (!result.questions.length) {
                toast.error("No se encontraron preguntas válidas en el archivo", {
                    description: result.errors.slice(0, 3).join(" · ") || "Revisa que uses la plantilla.",
                });
                return;
            }
            const hasContent = questions.some((q) => q.question.trim());
            if (!hasContent) {
                applyImport(result.questions, "replace");
                if (result.errors.length) setPendingImport({ ...result, questions: [], fileName: file.name });
            } else {
                setPendingImport({ ...result, fileName: file.name });
            }
        } catch (err) {
            console.error(err);
            toast.error("No se pudo leer el archivo Excel");
        } finally {
            setImporting(false);
        }
    };

    const applyImport = (imported: QuizQuestion[], mode: "replace" | "append") => {
        setQuestions((qs) => {
            const base = mode === "append" ? qs.filter((q) => q.question.trim()) : [];
            return [...base, ...imported];
        });
        toast.success(`${imported.length} pregunta(s) importada(s)`, {
            description: "Revisa las preguntas y presiona Guardar Examen.",
        });
    };

    // ─── Guardar ────────────────────────────────────────────────────────────
    const totalPoints = questions.reduce((s, q) => s + (Number(q.points) || 0), 0);

    const handleSave = async () => {
        if (!title.trim()) {
            toast.error("El examen necesita un nombre");
            return;
        }
        const cleaned = questions.filter((q) => q.question.trim() || q.options.some((o) => o.trim()));
        if (!cleaned.length) {
            toast.error("Agrega al menos una pregunta");
            return;
        }
        for (let i = 0; i < cleaned.length; i++) {
            const err = validateQuestion(cleaned[i]);
            if (err) {
                toast.error(`Pregunta ${i + 1}: ${err}`);
                return;
            }
        }
        const passing = Math.min(100, Math.max(0, Math.round(Number(settings.passing_score) || 0)));
        const maxAttempts = Math.max(0, Math.round(Number(settings.max_attempts) || 0));
        const quiz_settings = { ...settings, passing_score: passing, max_attempts: maxAttempts };

        setSaving(true);
        try {
            let lessonId = lesson?.id as string | undefined;
            if (lessonId) {
                await courseService.updateLesson(lessonId, {
                    title: title.trim(),
                    type: "quiz",
                    duration: duration || undefined,
                    quiz_settings,
                });
            } else {
                if (!moduleId) throw new Error("Módulo no definido");
                const created = await courseService.createLesson({
                    module_id: moduleId,
                    title: title.trim(),
                    type: "quiz",
                    duration: duration || undefined,
                    order: nextOrder,
                    is_free_preview: false,
                    quiz_settings,
                });
                lessonId = created.id;
            }
            await quizService.replaceQuestions(lessonId!, cleaned);
            toast.success(isEdit ? "Examen actualizado" : "Examen creado", {
                description: `${cleaned.length} pregunta(s) guardada(s)`,
            });
            onSaved();
            onOpenChange(false);
        } catch (e: any) {
            console.error(e);
            toast.error("Error al guardar el examen", { description: e?.message });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
            <DialogContent
                className="sm:max-w-[860px] max-h-[92vh] flex flex-col p-0 gap-0"
                onPointerDownOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
            >
                <DialogHeader className="p-6 pb-4 border-b">
                    <DialogTitle className="flex items-center gap-2">
                        <ClipboardCheck className="w-5 h-5 text-violet-600" />
                        {isEdit ? "Editar Examen" : "Nuevo Examen"}
                    </DialogTitle>
                    <DialogDescription>
                        Crea las preguntas manualmente o impórtalas desde una plantilla de Excel.
                    </DialogDescription>
                </DialogHeader>

                <Tabs value={tab} onValueChange={setTab} className="flex-1 min-h-0 flex flex-col">
                    <TabsList className="mx-6 mt-4 self-start">
                        <TabsTrigger value="questions">Preguntas ({questions.length})</TabsTrigger>
                        <TabsTrigger value="settings">Configuración</TabsTrigger>
                        {isEdit && <TabsTrigger value="results">Resultados</TabsTrigger>}
                    </TabsList>

                    <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
                        {/* ── PREGUNTAS ── */}
                        <TabsContent value="questions" className="mt-0 space-y-4">
                            <div className="grid sm:grid-cols-[1fr_160px] gap-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor="quizTitle">Nombre del examen</Label>
                                    <Input id="quizTitle" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej. Evaluación del Módulo 1" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="quizDuration">Duración estimada</Label>
                                    <Input id="quizDuration" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="Ej. 15 min" />
                                </div>
                            </div>

                            {/* Barra Excel */}
                            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 flex flex-col sm:flex-row sm:items-center gap-3">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <FileSpreadsheet className="w-5 h-5 text-emerald-700 shrink-0" />
                                    <p className="text-xs text-emerald-900">
                                        <span className="font-semibold">Importación masiva:</span> descarga la plantilla, llénala en Excel e impórtala.
                                    </p>
                                </div>
                                <div className="flex gap-2 flex-wrap">
                                    <Button type="button" size="sm" variant="outline" className="bg-white" onClick={handleDownloadTemplate}>
                                        <Download className="w-3.5 h-3.5 mr-1.5" /> Plantilla
                                    </Button>
                                    <Button type="button" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={importing} onClick={() => fileRef.current?.click()}>
                                        {importing ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 mr-1.5" />}
                                        Importar Excel
                                    </Button>
                                    <Button type="button" size="sm" variant="ghost" onClick={handleExport} title="Exportar preguntas actuales a Excel">
                                        Exportar
                                    </Button>
                                    <input ref={fileRef} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" onChange={handleFile} />
                                </div>
                            </div>

                            {/* Resultado de la importación */}
                            {pendingImport && (
                                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2">
                                    <div className="flex items-start justify-between gap-2">
                                        <p className="text-sm font-semibold text-amber-900">
                                            {pendingImport.questions.length > 0
                                                ? `"${pendingImport.fileName}": ${pendingImport.questions.length} pregunta(s) lista(s) para importar`
                                                : `"${pendingImport.fileName}": algunas filas se omitieron`}
                                        </p>
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setPendingImport(null)}>
                                            <X className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                    {pendingImport.errors.length > 0 && (
                                        <ul className="text-xs text-amber-800 space-y-0.5 max-h-28 overflow-y-auto">
                                            {pendingImport.errors.map((err, i) => (
                                                <li key={i} className="flex gap-1.5"><AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />{err}</li>
                                            ))}
                                        </ul>
                                    )}
                                    {pendingImport.questions.length > 0 && (
                                        <div className="flex gap-2">
                                            <Button size="sm" onClick={() => { applyImport(pendingImport.questions, "replace"); setPendingImport(null); }}>
                                                Reemplazar preguntas actuales
                                            </Button>
                                            <Button size="sm" variant="outline" className="bg-white" onClick={() => { applyImport(pendingImport.questions, "append"); setPendingImport(null); }}>
                                                Agregar al final
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {loading ? (
                                <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
                            ) : (
                                <div className="space-y-3">
                                    {questions.map((q, qIdx) => {
                                        const err = (q.question.trim() || q.options.some((o) => o.trim())) ? validateQuestion(q) : null;
                                        return (
                                            <div key={qIdx} className={cn("rounded-xl border bg-card p-4 space-y-3", err && "border-amber-300")}>
                                                <div className="flex items-start gap-2">
                                                    <Badge variant="secondary" className="mt-2 shrink-0">{qIdx + 1}</Badge>
                                                    <Textarea
                                                        value={q.question}
                                                        onChange={(e) => updateQuestion(qIdx, { question: e.target.value })}
                                                        placeholder="Escribe la pregunta..."
                                                        className="min-h-[60px] resize-y"
                                                    />
                                                    <div className="flex flex-col gap-0.5 shrink-0">
                                                        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={qIdx === 0} onClick={() => moveQuestion(qIdx, -1)} title="Subir"><ChevronUp className="w-4 h-4" /></Button>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={qIdx === questions.length - 1} onClick={() => moveQuestion(qIdx, 1)} title="Bajar"><ChevronDown className="w-4 h-4" /></Button>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => removeQuestion(qIdx)} title="Eliminar pregunta"><Trash2 className="w-3.5 h-3.5" /></Button>
                                                    </div>
                                                </div>

                                                <div className="space-y-1.5 pl-9">
                                                    <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Opciones · marca la correcta</p>
                                                    {q.options.map((opt, oIdx) => {
                                                        const isCorrect = q.correct_index === oIdx;
                                                        return (
                                                            <div key={oIdx} className="flex items-center gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => updateQuestion(qIdx, { correct_index: oIdx })}
                                                                    className={cn("shrink-0 rounded-full", isCorrect ? "text-emerald-600" : "text-muted-foreground/50 hover:text-muted-foreground")}
                                                                    title={isCorrect ? "Respuesta correcta" : "Marcar como correcta"}
                                                                >
                                                                    {isCorrect ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                                                                </button>
                                                                <span className="text-xs font-bold w-4 text-muted-foreground">{OPTION_LETTERS[oIdx]}</span>
                                                                <Input
                                                                    value={opt}
                                                                    onChange={(e) => updateOption(qIdx, oIdx, e.target.value)}
                                                                    placeholder={`Opción ${OPTION_LETTERS[oIdx]}`}
                                                                    className={cn("h-9", isCorrect && "border-emerald-300 bg-emerald-50/50")}
                                                                />
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" disabled={q.options.length <= 2} onClick={() => removeOption(qIdx, oIdx)} title="Quitar opción">
                                                                    <X className="w-3.5 h-3.5" />
                                                                </Button>
                                                            </div>
                                                        );
                                                    })}
                                                    <div className="flex flex-wrap items-center gap-3 pt-1">
                                                        {q.options.length < OPTION_LETTERS.length && (
                                                            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => addOption(qIdx)}>
                                                                <Plus className="w-3 h-3 mr-1" /> Opción
                                                            </Button>
                                                        )}
                                                        <div className="flex items-center gap-1.5">
                                                            <Label className="text-xs text-muted-foreground">Puntos</Label>
                                                            <Input
                                                                type="number" min={0.5} step={0.5}
                                                                value={q.points}
                                                                onChange={(e) => updateQuestion(qIdx, { points: Number(e.target.value) })}
                                                                className="h-7 w-16 text-xs"
                                                            />
                                                        </div>
                                                    </div>
                                                    <Input
                                                        value={q.explanation || ""}
                                                        onChange={(e) => updateQuestion(qIdx, { explanation: e.target.value })}
                                                        placeholder="Explicación de la respuesta (opcional)"
                                                        className="h-8 text-xs"
                                                    />
                                                    {err && <p className="text-xs text-amber-700 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{err}</p>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <Button variant="outline" className="w-full border-dashed" onClick={() => setQuestions((qs) => [...qs, emptyQuestion()])}>
                                        <Plus className="w-4 h-4 mr-2" /> Agregar pregunta
                                    </Button>
                                </div>
                            )}
                        </TabsContent>

                        {/* ── CONFIGURACIÓN ── */}
                        <TabsContent value="settings" className="mt-0 space-y-5">
                            <div className="space-y-1.5">
                                <Label htmlFor="quizDesc">Instrucciones para el alumno</Label>
                                <Textarea
                                    id="quizDesc"
                                    value={settings.description}
                                    onChange={(e) => setSettings((s) => ({ ...s, description: e.target.value }))}
                                    placeholder="Ej. Lee cada pregunta con atención. Tienes 3 intentos."
                                />
                            </div>
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="quizPass">Nota mínima para aprobar (%)</Label>
                                    <Input id="quizPass" type="number" min={0} max={100}
                                        value={settings.passing_score}
                                        onChange={(e) => setSettings((s) => ({ ...s, passing_score: Number(e.target.value) }))} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="quizAttempts">Intentos permitidos (0 = ilimitados)</Label>
                                    <Input id="quizAttempts" type="number" min={0}
                                        value={settings.max_attempts}
                                        onChange={(e) => setSettings((s) => ({ ...s, max_attempts: Number(e.target.value) }))} />
                                </div>
                            </div>
                            <div className="flex items-center justify-between rounded-lg border p-3">
                                <div>
                                    <p className="text-sm font-medium">Orden aleatorio de preguntas</p>
                                    <p className="text-xs text-muted-foreground">Cada intento muestra las preguntas en distinto orden.</p>
                                </div>
                                <Switch checked={settings.shuffle_questions} onCheckedChange={(v) => setSettings((s) => ({ ...s, shuffle_questions: v }))} />
                            </div>
                            <div className="flex items-center justify-between rounded-lg border p-3">
                                <div>
                                    <p className="text-sm font-medium">Mostrar respuestas correctas al finalizar</p>
                                    <p className="text-xs text-muted-foreground">Incluye la explicación de cada pregunta, si la hay.</p>
                                </div>
                                <Switch checked={settings.show_answers} onCheckedChange={(v) => setSettings((s) => ({ ...s, show_answers: v }))} />
                            </div>
                            <p className="text-xs text-muted-foreground">
                                El alumno solo completa el módulo (y avanza hacia su certificado) cuando aprueba el examen.
                            </p>
                        </TabsContent>

                        {/* ── RESULTADOS ── */}
                        {isEdit && (
                            <TabsContent value="results" className="mt-0">
                                {attempts === null ? (
                                    <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
                                ) : attempts.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-10">Aún no hay intentos registrados.</p>
                                ) : (
                                    <div className="rounded-lg border divide-y">
                                        {attempts.map((a) => (
                                            <div key={a.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                                                <div className="min-w-0">
                                                    <p className="font-medium truncate">{a.full_name}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {a.dni ? `DNI ${a.dni} · ` : ""}{new Date(a.created_at).toLocaleString()}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <span className="font-semibold tabular-nums">{a.score}%</span>
                                                    <Badge className={a.passed ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" : "bg-red-100 text-red-700 hover:bg-red-100"}>
                                                        {a.passed ? "Aprobado" : "Desaprobado"}
                                                    </Badge>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </TabsContent>
                        )}
                    </div>
                </Tabs>

                <DialogFooter className="p-4 border-t flex-row items-center sm:justify-between gap-2">
                    <p className="text-xs text-muted-foreground hidden sm:block">
                        {questions.length} pregunta(s) · {totalPoints} punto(s) · aprueba con {settings.passing_score}%
                    </p>
                    <div className="flex gap-2 ml-auto">
                        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
                        <Button onClick={handleSave} disabled={saving || loading}>
                            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Guardar Examen
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
