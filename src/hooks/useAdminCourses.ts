
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { courseService, Course } from "@/services/courseService";
import { toast } from "sonner";

export function useAdminCourses() {
    const queryClient = useQueryClient();

    const coursesQuery = useQuery({
        queryKey: ["admin-courses"],
        queryFn: courseService.getAll,
    });

    const createCourseMutation = useMutation({
        mutationFn: courseService.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
            queryClient.invalidateQueries({ queryKey: ["courses"] });
            toast.success("Curso creado exitosamente");
        },
        onError: (error: any) => {
            toast.error("Error al crear curso: " + error.message);
        }
    });

    const updateCourseMutation = useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: Partial<Course> }) =>
            courseService.update(id, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
            queryClient.invalidateQueries({ queryKey: ["courses"] });
            toast.success("Curso actualizado");
        },
        onError: (error: any) => {
            toast.error("Error al actualizar: " + error.message);
        }
    });

    const deleteCourseMutation = useMutation({
        mutationFn: courseService.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
            queryClient.invalidateQueries({ queryKey: ["courses"] }); // Refresh public catalog
            toast.success("Curso eliminado");
        },
        onError: (error: any) => {
            toast.error("Error al eliminar: " + error.message);
        }
    });

    return {
        courses: coursesQuery.data || [],
        isLoading: coursesQuery.isLoading,
        createCourse: createCourseMutation.mutateAsync,
        updateCourse: updateCourseMutation.mutateAsync,
        deleteCourse: deleteCourseMutation.mutateAsync,
    };
}
