import { supabase } from '@/lib/supabase';

export interface CourseCategory {
    id: string;
    slug: string;
    label: string;
    specialties: CourseSpecialty[];
}

export interface CourseSpecialty {
    id: string;
    category_id: string;
    slug: string;
    label: string;
}

export const categoryService = {
    async getCategories(): Promise<CourseCategory[]> {
        const { data: categories, error: catError } = await supabase
            .from('course_categories')
            .select('*')
            .order('label');

        if (catError) throw catError;

        const { data: specialties, error: specError } = await supabase
            .from('course_specialties')
            .select('*')
            .order('label');

        if (specError) throw specError;

        return categories.map(cat => ({
            ...cat,
            specialties: specialties.filter(spec => spec.category_id === cat.id)
        }));
    },

    async createCategory(category: { slug: string; label: string }) {
        const { data, error } = await supabase
            .from('course_categories')
            .insert([category])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateCategory(id: string, category: { slug: string; label: string }) {
        const { data, error } = await supabase
            .from('course_categories')
            .update(category)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteCategory(id: string) {
        const { error } = await supabase
            .from('course_categories')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    async createSpecialty(specialty: { category_id: string; slug: string; label: string }) {
        const { data, error } = await supabase
            .from('course_specialties')
            .insert([specialty])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateSpecialty(id: string, specialty: { slug: string; label: string }) {
        const { data, error } = await supabase
            .from('course_specialties')
            .update(specialty)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteSpecialty(id: string) {
        const { error } = await supabase
            .from('course_specialties')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};
