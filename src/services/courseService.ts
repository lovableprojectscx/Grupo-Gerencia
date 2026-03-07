
import { supabase } from "@/lib/supabase";
import { getStudentCount } from "@/utils/courseUtils";


export interface Course {
    id: string;
    title: string;
    subtitle?: string;
    description?: string;
    price: number;
    original_price?: number;
    image_url?: string;
    level?: string;
    category: string;
    specialty?: string;
    published: boolean;
    is_archived?: boolean; // Added for clarity
    slug: string;
    instructor_id?: string;
    modality?: 'live' | 'async' | 'hybrid';
    duration?: string;
    metadata?: any; // JSONB
    students?: number;
    modules?: Module[];
    instructor?: Instructor;
}

export interface Module {
    id: string;
    course_id: string;
    title: string;
    order: number;
    lessons?: Lesson[];
}

export interface Lesson {
    id: string;
    module_id: string;
    title: string;
    type: 'video' | 'pdf' | 'quiz';
    content_url?: string;
    duration?: string;
    order: number;
    is_free_preview: boolean;
}

export interface Instructor {
    id: string;
    name: string;
    title: string;
    bio?: string;
    avatar_url?: string;
    linkedin_url?: string;
}

export const courseService = {
    // --- Courses ---
    async getAll() {
        const { data, error } = await supabase
            .from('courses')
            .select('*, instructor:instructors(name)')
            .order('created_at', { ascending: false });

        if (error) throw error;
        // Cast data to Course[] usually requires assertion with Supabase unless generics are perfect
        return (data as unknown as Course[]).map(mapCourseWithStudentCount);
    },

    async getPublished() {
        const { data, error } = await supabase
            .from('courses')
            .select('*, instructor:instructors(name)')
            .eq('published', true)
            .eq('is_archived', false) // Explicitly exclude archived
            .order('created_at', { ascending: false });

        if (error) throw error;
        return (data as unknown as Course[]).map(mapCourseWithStudentCount);
    },

    async getRelatedCourses(currentCourseId: string, category: string, limit = 3) {
        let query = supabase
            .from('courses')
            .select('*, instructor:instructors(name), enrollments(user_id)')
            .eq('category', category)
            .eq('published', true)
            .eq('is_archived', false) // Exclude archived
            .neq('id', currentCourseId)
            .limit(limit);

        const { data, error } = await query;

        if (error) throw error;
        return (data as unknown as Course[]).map(mapCourseWithStudentCount);
    },

    async getById(idOrSlug: string) {
        // Acepta tanto UUID como slug — los links viejos siguen funcionando
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
        const { data, error } = await supabase
            .from('courses')
            .select(`
            *,
            instructor:instructors!instructor_id (*),
            modules (
                *,
                lessons (*)
            ),
            enrollments(user_id)
        `)
            .eq(isUUID ? 'id' : 'slug', idOrSlug)
            .maybeSingle();

        if (error) throw error;
        if (!data) throw new Error("Course not found");

        // Sort modules and lessons by order
        const courseData = data as unknown as Course & { modules: Module[] };
        if (courseData.modules) {
            courseData.modules.sort((a, b) => a.order - b.order);
            courseData.modules.forEach((mod) => {
                if (mod.lessons) {
                    mod.lessons.sort((a, b) => a.order - b.order);
                }
            });
        }

        return mapCourseWithStudentCount(courseData);
    },

    async create(course: Partial<Course>) {
        // Generate slug from title if not provided (con manejo correcto de tildes y ñ)
        const generateSlug = (title: string) =>
            title
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')   // eliminar tildes
                .toLowerCase()
                .trim()
                .replace(/[^a-z0-9 -]/g, '')        // solo letras, números, espacios y guiones
                .replace(/ +/g, '-')                 // espacios → guiones
                .replace(/-+/g, '-')                 // múltiples guiones → uno
                .replace(/^-+|-+$/g, '');            // limpiar extremos

        const slug = course.slug || (course.title ? generateSlug(course.title) : undefined);

        // Sanitize payload: remove derived/joined fields that don't exist in 'courses' table
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { students, instructor_id, ...courseData } = course;
        // Note: we can't destructure strict types easily if they aren't there, but 'modules' etc aren't in Partial<Course> usually
        // if we stick to the interface. However, if 'course' comes from a form with extra props, we need to be careful.
        // We will assume input is Partial<Course> which shouldn't have 'modules' or 'enrollments' if strict.
        // But to be safe against UI objects:
        const payload = {
            ...courseData,
            slug
        } as any; // Temporary cast for dynamic delete if needed, or better:
        delete payload.modules;
        delete payload.enrollments;
        delete payload.instructor; // if explicitly populated

        const { data, error } = await supabase
            .from('courses')
            .insert([payload])
            .select()
            .single();

        if (error) throw error;
        return data as Course;
    },

    async update(id: string, updates: Partial<Course>) {
        // Sanitize payload
        const payload = { ...updates } as any;
        delete payload.modules;
        delete payload.enrollments;
        delete payload.instructor;
        delete payload.students;

        const { data, error } = await supabase
            .from('courses')
            .update(payload)
            .eq('id', id)
            .select()
            .single();


        if (error) throw error;
        return data as Course;
    },

    async delete(id: string) {
        // Soft delete: Archive the course instead of deleting it
        const { error } = await supabase
            .from('courses')
            .update({ is_archived: true })
            .eq('id', id);
        if (error) throw error;
    },

    // --- Instructors ---
    async getInstructors() {
        const { data, error } = await supabase
            .from('instructors')
            .select('*')
            .order('name');
        if (error) throw error;

        return data;
    },



    async createInstructor(instructor: Partial<Instructor>) {
        const { data, error } = await supabase
            .from('instructors')
            .insert([instructor])
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async deleteInstructor(id: string) {
        const { error } = await supabase.from('instructors').delete().eq('id', id);
        if (error) throw error;
    },

    // --- Modules ---
    async createModule(moduleId: Partial<Module>) {
        const { data, error } = await supabase
            .from('modules')
            .insert([moduleId])
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async updateModule(id: string, updates: Partial<Module>) {
        const { data, error } = await supabase
            .from('modules')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async deleteModule(id: string) {
        const { error } = await supabase.from('modules').delete().eq('id', id);
        if (error) throw error;
    },

    // --- Lessons ---
    async createLesson(lesson: Partial<Lesson>) {
        const { data, error } = await supabase
            .from('lessons')
            .insert([lesson])
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async updateLesson(id: string, updates: Partial<Lesson>) {
        const { data, error } = await supabase
            .from('lessons')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async deleteLesson(id: string) {
        const { error } = await supabase.from('lessons').delete().eq('id', id);
        if (error) throw error;
    },

    // --- Progress & Completions ---
    async toggleLessonCompletion(userId: string, courseId: string, lessonId: string, completed: boolean) {
        if (completed) {
            const { error } = await supabase
                .from('lesson_completions')
                .insert([{ user_id: userId, lesson_id: lessonId }]);
            if (error && error.code !== '23505') throw error; // Ignore duplicate key errors
        } else {
            const { error } = await supabase
                .from('lesson_completions')
                .delete()
                .match({ user_id: userId, lesson_id: lessonId });
            if (error) throw error;
        }

        // --- Recalculate Progress ---

        // 1. Get all lesson IDs for this course
        const { data: course, error: courseError } = await supabase
            .from('courses')
            .select(`
                modules (
                    lessons (id)
                )
            `)
            .eq('id', courseId)
            .maybeSingle();

        if (courseError || !course) {
            console.error("Error recalculating progress: course not found", courseError);
            return;
        }

        const courseData = course as unknown as Course & { modules: Module[] };
        const allLessonIds = courseData.modules?.flatMap((m) => m.lessons?.map((l) => l.id)) || [];
        const totalLessons = allLessonIds.length;

        if (totalLessons === 0) return;

        // 2. Count completed lessons for this user within this course
        const { count, error: countError } = await supabase
            .from('lesson_completions')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .in('lesson_id', allLessonIds);

        if (countError) {
            console.error("Error recalculating progress: count failed", countError);
            return;
        }

        const progress = Math.round(((count || 0) / totalLessons) * 100);

        // 3. Update Enrollment
        // Note: We use course_id and user_id to find the enrollment
        await supabase
            .from('enrollments')
            .update({ progress: progress })
            .eq('user_id', userId)
            .eq('course_id', courseId);
    },

    async markAllLessonsCompleted(userId: string, courseId: string, lessonIds: string[]) {
        if (lessonIds.length === 0) return;

        // 1. Prepare bulk insert data
        const completions = lessonIds.map(lessonId => ({
            user_id: userId,
            lesson_id: lessonId
        }));

        // 2. Upsert completions (ignore duplicates)
        const { error } = await supabase
            .from('lesson_completions')
            .upsert(completions, { onConflict: 'user_id,lesson_id', ignoreDuplicates: true });

        if (error) throw error;

        // 3. Force update enrollment to 100%
        await supabase
            .from('enrollments')
            .update({ progress: 100, status: 'completed' }) // Ensure status is completed
            .eq('user_id', userId)
            .eq('course_id', courseId);
    },

    async getLessonCompletions(userId: string, courseId: string) {
        // 1. Get all lesson IDs for this course first to ensure we don't fetch failures or other courses
        const { data: course, error: courseError } = await supabase
            .from('courses')
            .select(`
                modules (
                    lessons (id)
                )
            `)
            .eq('id', courseId)
            .maybeSingle();

        if (courseError || !course) {
            // If course not found or error, return empty valid list
            return [];
        }

        const courseData = course as unknown as Course & { modules: Module[] };
        const allLessonIds = courseData.modules?.flatMap((m) => m.lessons?.map((l) => l.id)) || [];

        if (allLessonIds.length === 0) return [];

        const { data, error } = await supabase
            .from('lesson_completions')
            .select('lesson_id')
            .eq('user_id', userId)
            .in('lesson_id', allLessonIds);

        if (error) throw error;
        return data.map(r => r.lesson_id);
    },

    // --- Enrollments & Certificates ---
    async approveEnrollment(id: string) {
        // 1. Get enrollment details to know user and course
        const { data: enrollment, error: fetchError } = await supabase.from('enrollments').select('*').eq('id', id).maybeSingle();
        if (fetchError || !enrollment) throw fetchError || new Error("Enrollment not found");

        // 2. Update status
        const { error: updateError } = await supabase.from('enrollments').update({ status: 'active' }).eq('id', id);
        if (updateError) throw updateError;

        // 3. Create Certificate if not exists - REMOVED LEGACY LOGIC
        // Certificates should be generated via generateCertificate() RPC to ensure correct metadata and logic.
        // This function just activates the enrollment access.
    },

    async rejectEnrollment(id: string) {
        const { error } = await supabase
            .from('enrollments')
            .update({ status: 'rejected' })
            .eq('id', id);
        if (error) throw error;
    },

    async generateCertificate(enrollmentId: string, additionalMetadata: any = {}, year?: number) {
        const { data, error } = await supabase.rpc('generate_certificate_v2', {
            p_enrollment_id: enrollmentId,
            p_preferences: additionalMetadata,
            ...(year ? { p_year: year } : {}),
        });

        if (error) throw error;
        return data;
    },

    async deleteCertificate(certificateId: string) {
        const { error } = await supabase
            .from('certificates')
            .delete()
            .eq('id', certificateId);

        if (error) throw error;
    },

    // --- Favorites ---
    async toggleFavorite(userId: string, courseId: string, isFavorite: boolean) {
        if (isFavorite) {
            // Remove
            const { error } = await supabase
                .from('favorites')
                .delete()
                .match({ user_id: userId, course_id: courseId });
            if (error) throw error;
        } else {
            // Add
            const { error } = await supabase
                .from('favorites')
                .insert({ user_id: userId, course_id: courseId });
            if (error) throw error;
        }
    },

    async getFavoriteStatus(userId: string, courseId: string) {
        const { data, error } = await supabase
            .from('favorites')
            .select('*')
            .eq('user_id', userId)
            .eq('course_id', courseId)
            .maybeSingle();

        if (error) throw error;
        return !!data;
    },

    async getStudentFavorites(userId: string) {
        const { data, error } = await supabase
            .from('favorites')
            .select(`
                course_id,
                course:courses (*, enrollments(user_id))
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        // Transform to return just courses with student count
        return data.map((f: any) => mapCourseWithStudentCount(f.course));
    }
};

const mapCourseWithStudentCount = (course: any): Course & { students: number } => {
    if (!course) return course;
    // Count unique user_ids in enrollments to avoid duplicates if any (though PK/UK usually prevents it)
    const enrollments = course.enrollments as { user_id: string }[] | undefined;
    const uniqueStudents = new Set(enrollments?.map((e) => e.user_id)).size;

    // Remove enrollments from the object to clean it up, and add students count
    const { enrollments: _, ...rest } = course;

    // Apply deterministic realistic student count
    const displayStudents = getStudentCount(course.id, uniqueStudents);

    return {
        ...rest,
        students: displayStudents
    } as Course & { students: number };
};
