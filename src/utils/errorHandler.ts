// src/utils/errorHandler.ts

/**
 * Traduce los errores crudos de PostgreSQL/Supabase a mensajes amigables para el usuario final.
 * 
 * @param error Objeto de error capturado en el bloque catch
 * @param defaultMessage Mensaje por defecto si no se reconoce el error
 * @returns Mensaje de error formateado en español
 */
export const handleDbError = (error: any, defaultMessage: string = "Ha ocurrido un error inesperado al procesar la solicitud."): string => {
    if (!error) return defaultMessage;

    const msg = error?.message?.toLowerCase() || '';
    const code = error?.code || '';

    // 1. Errores de Autenticación
    if (msg.includes('invalid login credentials')) return "Correo o contraseña incorrectos.";
    if (msg.includes('user not found')) return "Usuario no encontrado.";
    if (msg.includes('email not confirmed')) return "Verifica tu correo electrónico antes de iniciar sesión.";
    if (msg.includes('user already registered')) return "Este correo ya está registrado en la plataforma.";

    // 2. Errores de Restricción de Base de Datos (PostgreSQL)
    if (code === '23505' || msg.includes('duplicate key value validates unique constraint')) {
        if (msg.includes('enrollments_user_id_course_id_key')) return "Ya te encuentras inscrito o has solicitado este curso.";
        if (msg.includes('profiles_email_key')) return "Ese correo ya está en uso.";
        return "Ya existe un registro con esos datos idénticos en el sistema.";
    }

    // Permisos (RLS)
    if (msg.includes('new row violates row-level security') || code === '42501') {
        return "No tienes permisos suficientes para realizar esta acción.";
    }

    // Llaves foráneas
    if (code === '23503') {
        return "No se puede eliminar este elemento porque está siendo usado en otras partes del sistema.";
    }

    // JWT / Expiración
    if (msg.includes('jwt expired')) {
        return "Tu sesión ha expirado. Por favor, vuelve a iniciar sesión.";
    }

    // Network Error / Timeout
    if (msg.includes('fetch') || msg.includes('network') || msg.includes('timeout')) {
        return "Problemas de conexión. Revisa tu internet e inténtalo de nuevo.";
    }

    // Límite de tamaño en Storage
    if (msg.includes('file size limit')) {
        return "El archivo es demasiado grande. Por favor, sube uno más pequeño.";
    }

    // Si no mapea con nada conocido, podemos retornar el mensage crudo solo en entornos dev, 
    // pero para producción devolvemos el fallback.
    console.error("Unhandeled DB Error:", error);
    return defaultMessage;
};
