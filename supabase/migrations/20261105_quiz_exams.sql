-- ==============================================================================
-- EXÁMENES (lecciones de tipo 'quiz')
-- ------------------------------------------------------------------------------
-- * Un examen es una lección con type = 'quiz' dentro de un módulo.
-- * Su configuración (nota mínima, intentos, etc.) vive en lessons.quiz_settings.
-- * Las preguntas viven en quiz_questions. Solo los admins pueden leerlas
--   directamente (incluyen la respuesta correcta). Los alumnos las obtienen
--   mediante get_quiz_for_student(), que NO devuelve la respuesta correcta.
-- * La calificación se hace en el servidor con submit_quiz_attempt(); si el
--   alumno aprueba, se registra la lección como completada.
-- ==============================================================================

-- 1. Configuración del examen en la lección ------------------------------------
ALTER TABLE public.lessons
    ADD COLUMN IF NOT EXISTS quiz_settings JSONB DEFAULT '{}'::jsonb;
-- Claves usadas en quiz_settings:
--   passing_score      INTEGER  (0-100, por defecto 70)
--   max_attempts       INTEGER  (0 = ilimitado)
--   shuffle_questions  BOOLEAN
--   show_answers       BOOLEAN  (mostrar respuestas correctas al terminar)
--   description        TEXT     (instrucciones para el alumno)

-- 2. Preguntas -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.quiz_questions (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id     UUID        NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    question      TEXT        NOT NULL,
    options       JSONB       NOT NULL DEFAULT '[]'::jsonb,  -- ["Opción A", "Opción B", ...]
    correct_index INTEGER     NOT NULL,                     -- índice (0-based) de la opción correcta
    points        NUMERIC     NOT NULL DEFAULT 1,
    explanation   TEXT,
    "order"       INTEGER     NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT quiz_questions_options_array CHECK (jsonb_typeof(options) = 'array'),
    CONSTRAINT quiz_questions_correct_in_range CHECK (correct_index >= 0 AND correct_index < jsonb_array_length(options)),
    CONSTRAINT quiz_questions_points_positive CHECK (points > 0)
);

CREATE INDEX IF NOT EXISTS quiz_questions_lesson_order_idx
    ON public.quiz_questions(lesson_id, "order");

ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quiz_questions_admin_all" ON public.quiz_questions;
CREATE POLICY "quiz_questions_admin_all" ON public.quiz_questions
    FOR ALL TO authenticated
    USING ((select public.is_admin()))
    WITH CHECK ((select public.is_admin()));

-- 3. Intentos ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lesson_id     UUID        NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    answers       JSONB       NOT NULL DEFAULT '{}'::jsonb,  -- { "<question_id>": <option_index> }
    score         NUMERIC     NOT NULL DEFAULT 0,            -- puntaje 0-100
    earned_points NUMERIC     NOT NULL DEFAULT 0,
    total_points  NUMERIC     NOT NULL DEFAULT 0,
    passed        BOOLEAN     NOT NULL DEFAULT false,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS quiz_attempts_user_lesson_idx
    ON public.quiz_attempts(user_id, lesson_id, created_at DESC);

CREATE INDEX IF NOT EXISTS quiz_attempts_lesson_idx
    ON public.quiz_attempts(lesson_id);

ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

-- Los alumnos solo ven sus intentos; los admins ven todos.
-- No hay políticas de INSERT/UPDATE: los intentos solo se crean vía RPC.
DROP POLICY IF EXISTS "quiz_attempts_select" ON public.quiz_attempts;
CREATE POLICY "quiz_attempts_select" ON public.quiz_attempts
    FOR SELECT TO authenticated
    USING (user_id = (select auth.uid()) OR (select public.is_admin()));

DROP POLICY IF EXISTS "quiz_attempts_admin_delete" ON public.quiz_attempts;
CREATE POLICY "quiz_attempts_admin_delete" ON public.quiz_attempts
    FOR DELETE TO authenticated
    USING ((select public.is_admin()));

-- 4. Helper: ¿el usuario actual tiene acceso a la lección? ----------------------
CREATE OR REPLACE FUNCTION public.can_access_lesson(p_lesson_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
    SELECT public.is_admin() OR EXISTS (
        SELECT 1
        FROM lessons l
        JOIN modules m ON m.id = l.module_id
        JOIN enrollments e ON e.course_id = m.course_id
        WHERE l.id = p_lesson_id
          AND e.user_id = auth.uid()
          AND e.status IN ('active', 'completed')
    );
$$;

-- 5. RPC: examen para el alumno (sin respuestas correctas) ---------------------
CREATE OR REPLACE FUNCTION public.get_quiz_for_student(p_lesson_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_lesson    lessons%ROWTYPE;
    v_questions JSONB;
    v_attempts  JSONB;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'No autenticado';
    END IF;

    SELECT * INTO v_lesson FROM lessons WHERE id = p_lesson_id AND type = 'quiz';
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Examen no encontrado';
    END IF;

    IF NOT public.can_access_lesson(p_lesson_id) THEN
        RAISE EXCEPTION 'No tienes acceso a este examen';
    END IF;

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
               'id', q.id,
               'question', q.question,
               'options', q.options,
               'points', q.points
           ) ORDER BY q."order", q.created_at), '[]'::jsonb)
      INTO v_questions
      FROM quiz_questions q
     WHERE q.lesson_id = p_lesson_id;

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
               'id', a.id,
               'score', a.score,
               'passed', a.passed,
               'created_at', a.created_at
           ) ORDER BY a.created_at DESC), '[]'::jsonb)
      INTO v_attempts
      FROM quiz_attempts a
     WHERE a.lesson_id = p_lesson_id
       AND a.user_id = auth.uid();

    RETURN jsonb_build_object(
        'lesson_id', v_lesson.id,
        'title', v_lesson.title,
        'settings', COALESCE(v_lesson.quiz_settings, '{}'::jsonb),
        'questions', v_questions,
        'attempts', v_attempts
    );
END;
$$;

-- 6. RPC: enviar y calificar intento ------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_quiz_attempt(p_lesson_id UUID, p_answers JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_lesson        lessons%ROWTYPE;
    v_settings      JSONB;
    v_passing       NUMERIC;
    v_max_attempts  INTEGER;
    v_show_answers  BOOLEAN;
    v_attempt_count INTEGER;
    v_already_passed BOOLEAN;
    v_total         NUMERIC := 0;
    v_earned        NUMERIC := 0;
    v_score         NUMERIC := 0;
    v_passed        BOOLEAN := false;
    v_results       JSONB := '[]'::jsonb;
    v_answer        INTEGER;
    v_correct       BOOLEAN;
    q               RECORD;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'No autenticado';
    END IF;

    IF p_answers IS NULL OR jsonb_typeof(p_answers) <> 'object' THEN
        RAISE EXCEPTION 'Formato de respuestas inválido';
    END IF;

    SELECT * INTO v_lesson FROM lessons WHERE id = p_lesson_id AND type = 'quiz';
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Examen no encontrado';
    END IF;

    IF NOT public.can_access_lesson(p_lesson_id) THEN
        RAISE EXCEPTION 'No tienes acceso a este examen';
    END IF;

    v_settings     := COALESCE(v_lesson.quiz_settings, '{}'::jsonb);
    v_passing      := COALESCE(NULLIF(v_settings->>'passing_score', '')::NUMERIC, 70);
    v_max_attempts := COALESCE(NULLIF(v_settings->>'max_attempts', '')::INTEGER, 0);
    v_show_answers := COALESCE((v_settings->>'show_answers')::BOOLEAN, true);

    -- Evitar envíos concurrentes del mismo alumno para el mismo examen
    PERFORM pg_advisory_xact_lock(hashtext(auth.uid()::text || p_lesson_id::text));

    SELECT COUNT(*), COALESCE(bool_or(passed), false)
      INTO v_attempt_count, v_already_passed
      FROM quiz_attempts
     WHERE user_id = auth.uid() AND lesson_id = p_lesson_id;

    IF v_max_attempts > 0 AND v_attempt_count >= v_max_attempts AND NOT public.is_admin() THEN
        RAISE EXCEPTION 'Has alcanzado el número máximo de intentos (%)', v_max_attempts;
    END IF;

    FOR q IN
        SELECT * FROM quiz_questions WHERE lesson_id = p_lesson_id ORDER BY "order", created_at
    LOOP
        v_total := v_total + q.points;
        v_answer := NULL;
        IF p_answers ? q.id::text AND jsonb_typeof(p_answers->(q.id::text)) = 'number' THEN
            v_answer := (p_answers->>(q.id::text))::INTEGER;
        END IF;
        v_correct := v_answer IS NOT NULL AND v_answer = q.correct_index;
        IF v_correct THEN
            v_earned := v_earned + q.points;
        END IF;

        v_results := v_results || jsonb_build_array(jsonb_build_object(
            'question_id', q.id,
            'selected', v_answer,
            'is_correct', v_correct,
            'correct_index', CASE WHEN v_show_answers THEN q.correct_index ELSE NULL END,
            'explanation', CASE WHEN v_show_answers THEN q.explanation ELSE NULL END
        ));
    END LOOP;

    IF v_total = 0 THEN
        RAISE EXCEPTION 'El examen no tiene preguntas';
    END IF;

    v_score  := ROUND((v_earned / v_total) * 100, 2);
    v_passed := v_score >= v_passing;

    INSERT INTO quiz_attempts (user_id, lesson_id, answers, score, earned_points, total_points, passed)
    VALUES (auth.uid(), p_lesson_id, p_answers, v_score, v_earned, v_total, v_passed);

    IF v_passed THEN
        INSERT INTO lesson_completions (user_id, lesson_id)
        VALUES (auth.uid(), p_lesson_id)
        ON CONFLICT (user_id, lesson_id) DO NOTHING;
    END IF;

    RETURN jsonb_build_object(
        'score', v_score,
        'earned_points', v_earned,
        'total_points', v_total,
        'passed', v_passed OR v_already_passed,
        'passed_this_attempt', v_passed,
        'passing_score', v_passing,
        'attempts_used', v_attempt_count + 1,
        'max_attempts', v_max_attempts,
        'results', v_results
    );
END;
$$;

-- 7. Bloquear que un alumno marque un examen como completado sin aprobarlo ------
CREATE OR REPLACE FUNCTION public.guard_quiz_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM lessons WHERE id = NEW.lesson_id AND type = 'quiz')
       AND NOT public.is_admin()
       AND NOT EXISTS (
           SELECT 1 FROM quiz_attempts
            WHERE user_id = NEW.user_id AND lesson_id = NEW.lesson_id AND passed
       ) THEN
        RETURN NULL; -- se ignora silenciosamente la fila (no rompe inserciones masivas)
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_quiz_completion ON public.lesson_completions;
CREATE TRIGGER trg_guard_quiz_completion
    BEFORE INSERT ON public.lesson_completions
    FOR EACH ROW EXECUTE FUNCTION public.guard_quiz_completion();

-- 8. Permisos de ejecución -----------------------------------------------------
REVOKE ALL ON FUNCTION public.get_quiz_for_student(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.submit_quiz_attempt(UUID, JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_access_lesson(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.guard_quiz_completion() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_quiz_for_student(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_quiz_attempt(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_lesson(UUID) TO authenticated;
