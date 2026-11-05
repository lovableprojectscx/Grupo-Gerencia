import { supabase } from "@/lib/supabase";

export interface QuizSettings {
    passing_score?: number;     // 0-100
    max_attempts?: number;      // 0 = ilimitado
    shuffle_questions?: boolean;
    show_answers?: boolean;
    description?: string;
}

export const DEFAULT_QUIZ_SETTINGS: Required<QuizSettings> = {
    passing_score: 70,
    max_attempts: 0,
    shuffle_questions: false,
    show_answers: true,
    description: "",
};

/** Pregunta completa (vista de administrador, incluye la respuesta correcta). */
export interface QuizQuestion {
    id?: string;
    question: string;
    options: string[];
    correct_index: number;
    points: number;
    explanation?: string | null;
    order?: number;
}

/** Pregunta tal como la recibe el alumno (sin respuesta correcta). */
export interface StudentQuizQuestion {
    id: string;
    question: string;
    options: string[];
    points: number;
}

export interface QuizAttemptSummary {
    id: string;
    score: number;
    passed: boolean;
    created_at: string;
}

export interface StudentQuiz {
    lesson_id: string;
    title: string;
    settings: QuizSettings;
    questions: StudentQuizQuestion[];
    attempts: QuizAttemptSummary[];
}

export interface QuizAttemptResult {
    score: number;
    earned_points: number;
    total_points: number;
    passed: boolean;
    passed_this_attempt: boolean;
    passing_score: number;
    attempts_used: number;
    max_attempts: number;
    results: {
        question_id: string;
        selected: number | null;
        is_correct: boolean;
        correct_index: number | null;
        explanation: string | null;
    }[];
}

export const quizService = {
    // ─── Administración ──────────────────────────────────────────────────────
    async getQuestions(lessonId: string): Promise<QuizQuestion[]> {
        const { data, error } = await supabase
            .from("quiz_questions")
            .select("*")
            .eq("lesson_id", lessonId)
            .order("order", { ascending: true })
            .order("created_at", { ascending: true });
        if (error) throw error;
        return (data || []).map((q: any) => ({
            id: q.id,
            question: q.question,
            options: Array.isArray(q.options) ? q.options : [],
            correct_index: q.correct_index,
            points: Number(q.points) || 1,
            explanation: q.explanation,
            order: q.order,
        }));
    },

    /** Reemplaza todas las preguntas del examen por las indicadas. */
    async replaceQuestions(lessonId: string, questions: QuizQuestion[]) {
        const { error: delError } = await supabase
            .from("quiz_questions")
            .delete()
            .eq("lesson_id", lessonId);
        if (delError) throw delError;

        if (questions.length === 0) return;

        const rows = questions.map((q, idx) => ({
            lesson_id: lessonId,
            question: q.question.trim(),
            options: q.options.map((o) => o.trim()),
            correct_index: q.correct_index,
            points: q.points > 0 ? q.points : 1,
            explanation: q.explanation?.trim() || null,
            order: idx + 1,
        }));

        const { error } = await supabase.from("quiz_questions").insert(rows);
        if (error) throw error;
    },

    async getAttemptsForLesson(lessonId: string) {
        const { data, error } = await supabase
            .from("quiz_attempts")
            .select("id, user_id, score, passed, created_at")
            .eq("lesson_id", lessonId)
            .order("created_at", { ascending: false });
        if (error) throw error;
        const attempts = data || [];
        const userIds = [...new Set(attempts.map((a: any) => a.user_id))];
        let profiles: Record<string, { full_name?: string; dni?: string }> = {};
        if (userIds.length) {
            const { data: profs } = await supabase
                .from("profiles")
                .select("id, full_name, dni")
                .in("id", userIds);
            profiles = Object.fromEntries((profs || []).map((p: any) => [p.id, p]));
        }
        return attempts.map((a: any) => ({
            ...a,
            score: Number(a.score),
            full_name: profiles[a.user_id]?.full_name || "Alumno",
            dni: profiles[a.user_id]?.dni || "",
        }));
    },

    // ─── Alumno ──────────────────────────────────────────────────────────────
    async getQuizForStudent(lessonId: string): Promise<StudentQuiz> {
        const { data, error } = await supabase.rpc("get_quiz_for_student", { p_lesson_id: lessonId });
        if (error) throw error;
        return data as StudentQuiz;
    },

    async submitAttempt(lessonId: string, answers: Record<string, number>): Promise<QuizAttemptResult> {
        const { data, error } = await supabase.rpc("submit_quiz_attempt", {
            p_lesson_id: lessonId,
            p_answers: answers,
        });
        if (error) throw error;
        return data as QuizAttemptResult;
    },
};

/** Valida una pregunta y devuelve el mensaje de error, o null si es válida. */
export function validateQuestion(q: QuizQuestion): string | null {
    if (!q.question?.trim()) return "La pregunta está vacía";
    const opts = q.options.map((o) => o?.trim()).filter(Boolean);
    if (opts.length < 2) return "Debe tener al menos 2 opciones";
    if (opts.length !== q.options.length) return "Hay opciones vacías";
    if (q.correct_index < 0 || q.correct_index >= q.options.length) return "La respuesta correcta no es válida";
    if (!(q.points > 0)) return "El puntaje debe ser mayor a 0";
    return null;
}
