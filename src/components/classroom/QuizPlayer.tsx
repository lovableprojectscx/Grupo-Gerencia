import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
    ClipboardCheck, Loader2, CheckCircle2, XCircle, RotateCcw, Trophy, ArrowLeft, ArrowRight, Send,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { quizService, type QuizAttemptResult, type StudentQuiz, type StudentQuizQuestion } from "@/services/quizService";
import { OPTION_LETTERS } from "@/utils/quizExcel";

interface QuizPlayerProps {
    lessonId: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Se llama tras cada intento enviado (para refrescar progreso). */
    onSubmitted: (result: QuizAttemptResult) => void;
}

type Stage = "intro" | "taking" | "result";

function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

export function QuizPlayer({ lessonId, open, onOpenChange, onSubmitted }: QuizPlayerProps) {
    const [quiz, setQuiz] = useState<StudentQuiz | null>(null);
    const [loading, setLoading] = useState(false);
    const [stage, setStage] = useState<Stage>("intro");
    const [order, setOrder] = useState<StudentQuizQuestion[]>([]);
    const [current, setCurrent] = useState(0);
    const [answers, setAnswers] = useState<Record<string, number>>({});
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<QuizAttemptResult | null>(null);

    const load = async () => {
        if (!lessonId) return;
        setLoading(true);
        try {
            setQuiz(await quizService.getQuizForStudent(lessonId));
        } catch (e: any) {
            console.error(e);
            toast.error("No se pudo cargar el examen", { description: e?.message });
            onOpenChange(false);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!open) return;
        setStage("intro");
        setResult(null);
        setAnswers({});
        setCurrent(0);
        setQuiz(null);
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, lessonId]);

    const settings = quiz?.settings || {};
    const passingScore = settings.passing_score ?? 70;
    const maxAttempts = settings.max_attempts ?? 0;
    const attemptsUsed = quiz?.attempts.length ?? 0;
    const bestScore = quiz?.attempts.reduce((m, a) => Math.max(m, Number(a.score)), 0) ?? 0;
    const alreadyPassed = !!quiz?.attempts.some((a) => a.passed);
    const noAttemptsLeft = maxAttempts > 0 && attemptsUsed >= maxAttempts;

    const start = () => {
        if (!quiz?.questions.length) return;
        setOrder(settings.shuffle_questions ? shuffle(quiz.questions) : quiz.questions);
        setAnswers({});
        setCurrent(0);
        setResult(null);
        setStage("taking");
    };

    const answeredCount = useMemo(() => order.filter((q) => answers[q.id] !== undefined).length, [order, answers]);

    const submit = async () => {
        if (!lessonId) return;
        const missing = order.length - answeredCount;
        if (missing > 0 && !window.confirm(`Tienes ${missing} pregunta(s) sin responder. ¿Enviar de todos modos?`)) return;
        setSubmitting(true);
        try {
            const res = await quizService.submitAttempt(lessonId, answers);
            setResult(res);
            setStage("result");
            onSubmitted(res);
            // refrescar historial de intentos
            quizService.getQuizForStudent(lessonId).then(setQuiz).catch(() => {});
        } catch (e: any) {
            console.error(e);
            toast.error("No se pudo enviar el examen", { description: e?.message });
        } finally {
            setSubmitting(false);
        }
    };

    const question = order[current];
    const resultsById = useMemo(
        () => Object.fromEntries((result?.results || []).map((r) => [r.question_id, r])),
        [result]
    );

    const handleOpenChange = (o: boolean) => {
        if (!o && stage === "taking" && answeredCount > 0 && !window.confirm("¿Salir del examen? Perderás las respuestas marcadas.")) return;
        onOpenChange(o);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[720px] max-h-[92vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ClipboardCheck className="w-5 h-5 text-violet-600" />
                        {quiz?.title || "Examen"}
                    </DialogTitle>
                    <DialogDescription>
                        {quiz ? `${quiz.questions.length} preguntas · nota mínima ${passingScore}%` : "Cargando..."}
                    </DialogDescription>
                </DialogHeader>

                {loading || !quiz ? (
                    <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
                ) : stage === "intro" ? (
                    <div className="space-y-5">
                        {settings.description && (
                            <p className="text-sm text-muted-foreground whitespace-pre-line">{settings.description}</p>
                        )}
                        <div className="grid grid-cols-3 gap-3 text-center">
                            <div className="rounded-lg border p-3">
                                <p className="text-2xl font-bold">{quiz.questions.length}</p>
                                <p className="text-[11px] text-muted-foreground uppercase font-semibold">Preguntas</p>
                            </div>
                            <div className="rounded-lg border p-3">
                                <p className="text-2xl font-bold">{passingScore}%</p>
                                <p className="text-[11px] text-muted-foreground uppercase font-semibold">Para aprobar</p>
                            </div>
                            <div className="rounded-lg border p-3">
                                <p className="text-2xl font-bold">{maxAttempts > 0 ? `${attemptsUsed}/${maxAttempts}` : attemptsUsed}</p>
                                <p className="text-[11px] text-muted-foreground uppercase font-semibold">Intentos usados</p>
                            </div>
                        </div>

                        {alreadyPassed && (
                            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800">
                                <CheckCircle2 className="w-4 h-4 shrink-0" />
                                Ya aprobaste este examen. Mejor nota: <strong>{bestScore}%</strong>
                            </div>
                        )}
                        {quiz.questions.length === 0 && (
                            <p className="text-sm text-muted-foreground">Este examen aún no tiene preguntas.</p>
                        )}

                        {quiz.attempts.length > 0 && (
                            <div className="space-y-1.5">
                                <p className="text-xs font-semibold uppercase text-muted-foreground">Historial</p>
                                <div className="rounded-lg border divide-y text-sm">
                                    {quiz.attempts.slice(0, 5).map((a) => (
                                        <div key={a.id} className="flex items-center justify-between px-3 py-2">
                                            <span className="text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
                                            <span className={cn("font-semibold", a.passed ? "text-emerald-600" : "text-red-600")}>
                                                {Number(a.score)}% · {a.passed ? "Aprobado" : "Desaprobado"}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end">
                            {noAttemptsLeft ? (
                                <p className="text-sm text-muted-foreground">Ya utilizaste todos tus intentos.</p>
                            ) : (
                                <Button size="lg" onClick={start} disabled={!quiz.questions.length} className="bg-violet-600 hover:bg-violet-700 text-white">
                                    {attemptsUsed > 0 ? <RotateCcw className="w-4 h-4 mr-2" /> : <ClipboardCheck className="w-4 h-4 mr-2" />}
                                    {attemptsUsed > 0 ? "Volver a rendir" : "Comenzar examen"}
                                </Button>
                            )}
                        </div>
                    </div>
                ) : stage === "taking" && question ? (
                    <div className="space-y-5">
                        <div className="space-y-1.5">
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Pregunta {current + 1} de {order.length}</span>
                                <span>{answeredCount} respondida(s)</span>
                            </div>
                            <Progress value={((current + 1) / order.length) * 100} className="h-1.5" />
                        </div>

                        <div className="space-y-3">
                            <p className="text-base font-semibold leading-snug whitespace-pre-line">{question.question}</p>
                            <div className="space-y-2">
                                {question.options.map((opt, idx) => {
                                    const selected = answers[question.id] === idx;
                                    return (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => setAnswers((a) => ({ ...a, [question.id]: idx }))}
                                            className={cn(
                                                "w-full flex items-start gap-3 rounded-lg border p-3 text-left text-sm transition-colors",
                                                selected ? "border-violet-500 bg-violet-50 ring-1 ring-violet-500" : "hover:bg-secondary/60"
                                            )}
                                        >
                                            <span className={cn(
                                                "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                                                selected ? "bg-violet-600 text-white" : "bg-secondary text-muted-foreground"
                                            )}>
                                                {OPTION_LETTERS[idx]}
                                            </span>
                                            <span className="pt-0.5">{opt}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Navegación rápida */}
                        <div className="flex flex-wrap gap-1.5">
                            {order.map((q, i) => (
                                <button
                                    key={q.id}
                                    type="button"
                                    onClick={() => setCurrent(i)}
                                    className={cn(
                                        "w-8 h-8 rounded-md text-xs font-semibold border",
                                        i === current && "ring-2 ring-violet-500",
                                        answers[q.id] !== undefined ? "bg-violet-100 text-violet-700 border-violet-200" : "bg-background text-muted-foreground"
                                    )}
                                >
                                    {i + 1}
                                </button>
                            ))}
                        </div>

                        <div className="flex justify-between gap-2 pt-2 border-t">
                            <Button variant="outline" onClick={() => setCurrent((c) => c - 1)} disabled={current === 0}>
                                <ArrowLeft className="w-4 h-4 mr-1.5" /> Anterior
                            </Button>
                            {current < order.length - 1 ? (
                                <Button onClick={() => setCurrent((c) => c + 1)}>
                                    Siguiente <ArrowRight className="w-4 h-4 ml-1.5" />
                                </Button>
                            ) : (
                                <Button onClick={submit} disabled={submitting} className="bg-violet-600 hover:bg-violet-700 text-white">
                                    {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                                    Enviar examen
                                </Button>
                            )}
                        </div>
                    </div>
                ) : stage === "result" && result ? (
                    <div className="space-y-5">
                        <div className={cn(
                            "rounded-xl p-6 text-center space-y-2 border",
                            result.passed_this_attempt ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"
                        )}>
                            {result.passed_this_attempt
                                ? <Trophy className="w-10 h-10 mx-auto text-emerald-600" />
                                : <XCircle className="w-10 h-10 mx-auto text-red-500" />}
                            <p className="text-4xl font-bold tabular-nums">{Number(result.score)}%</p>
                            <p className={cn("font-semibold", result.passed_this_attempt ? "text-emerald-700" : "text-red-700")}>
                                {result.passed_this_attempt ? "¡Aprobaste el examen!" : `No alcanzaste la nota mínima (${result.passing_score}%)`}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {result.earned_points} de {result.total_points} puntos
                                {result.max_attempts > 0 && ` · intento ${result.attempts_used} de ${result.max_attempts}`}
                            </p>
                        </div>

                        {result.results.some((r) => r.correct_index !== null) && (
                            <div className="space-y-3">
                                <p className="text-xs font-semibold uppercase text-muted-foreground">Revisión</p>
                                {order.map((q, i) => {
                                    const r = resultsById[q.id];
                                    if (!r) return null;
                                    return (
                                        <div key={q.id} className="rounded-lg border p-3 space-y-2 text-sm">
                                            <div className="flex items-start gap-2">
                                                {r.is_correct
                                                    ? <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                                                    : <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />}
                                                <p className="font-medium">{i + 1}. {q.question}</p>
                                            </div>
                                            <div className="pl-6 space-y-1">
                                                {q.options.map((opt, idx) => (
                                                    <p key={idx} className={cn(
                                                        "text-xs px-2 py-1 rounded",
                                                        idx === r.correct_index && "bg-emerald-50 text-emerald-800 font-semibold",
                                                        idx === r.selected && !r.is_correct && "bg-red-50 text-red-700 line-through"
                                                    )}>
                                                        {OPTION_LETTERS[idx]}. {opt}
                                                    </p>
                                                ))}
                                                {r.explanation && <p className="text-xs text-muted-foreground italic pt-1">{r.explanation}</p>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <div className="flex justify-end gap-2">
                            {!result.passed && !(result.max_attempts > 0 && result.attempts_used >= result.max_attempts) && (
                                <Button variant="outline" onClick={start}>
                                    <RotateCcw className="w-4 h-4 mr-2" /> Intentar de nuevo
                                </Button>
                            )}
                            <Button onClick={() => onOpenChange(false)}>Cerrar</Button>
                        </div>
                    </div>
                ) : null}
            </DialogContent>
        </Dialog>
    );
}
