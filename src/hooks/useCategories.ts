import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoryService, CourseCategory, CourseSpecialty } from '@/services/categoryService';

export function useCategories() {
    const queryClient = useQueryClient();

    const { data: categories = [], isLoading, error } = useQuery<CourseCategory[]>({
        queryKey: ['categories'],
        queryFn: categoryService.getCategories
    });

    const createCategoryMutation = useMutation({
        mutationFn: categoryService.createCategory,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
        }
    });

    const updateCategoryMutation = useMutation({
        mutationFn: ({ id, category }: { id: string; category: { slug: string; label: string } }) =>
            categoryService.updateCategory(id, category),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
        }
    });

    const deleteCategoryMutation = useMutation({
        mutationFn: categoryService.deleteCategory,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
        }
    });

    const createSpecialtyMutation = useMutation({
        mutationFn: categoryService.createSpecialty,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
        }
    });

    const updateSpecialtyMutation = useMutation({
        mutationFn: ({ id, specialty }: { id: string; specialty: { slug: string; label: string } }) =>
            categoryService.updateSpecialty(id, specialty),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
        }
    });

    const deleteSpecialtyMutation = useMutation({
        mutationFn: categoryService.deleteSpecialty,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
        }
    });

    return {
        categories,
        isLoading,
        error,
        createCategory: createCategoryMutation.mutateAsync,
        updateCategory: updateCategoryMutation.mutateAsync,
        deleteCategory: deleteCategoryMutation.mutateAsync,
        createSpecialty: createSpecialtyMutation.mutateAsync,
        updateSpecialty: updateSpecialtyMutation.mutateAsync,
        deleteSpecialty: deleteSpecialtyMutation.mutateAsync,
        isPending: createCategoryMutation.isPending ||
            updateCategoryMutation.isPending ||
            deleteCategoryMutation.isPending ||
            createSpecialtyMutation.isPending ||
            updateSpecialtyMutation.isPending ||
            deleteSpecialtyMutation.isPending
    };
}
