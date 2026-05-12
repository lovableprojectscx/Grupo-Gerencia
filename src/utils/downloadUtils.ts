
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

/**
 * Fuerza la descarga de un archivo desde Supabase Storage.
 * Utiliza el SDK de Supabase para manejar automáticamente la autenticación (Bearer Token),
 * lo que permite descargar archivos de buckets privados con políticas RLS.
 * 
 * @param url URL pública del archivo (para extraer el path) o path directo
 * @param fileName Nombre con el que se guardará el archivo
 */
export const forceDownload = async (url: string, fileName: string) => {
    const toastId = toast.loading(`Preparando descarga de ${fileName}...`);
    
    try {
        // 1. Extraer el path relativo del bucket si recibimos una URL completa
        let filePath = url;
        if (url.includes('/storage/v1/object/public/') || url.includes('/storage/v1/object/authenticated/')) {
            // El formato suele ser: .../object/[public|authenticated]/BUCKET_NAME/PATH
            const parts = url.split(/\/storage\/v1\/object\/(?:public|authenticated)\/[^/]+\//);
            if (parts.length > 1) {
                filePath = decodeURIComponent(parts[1]);
            }
        } else if (url.startsWith('http')) {
            // Intento genérico de extraer path después del bucket name (asumiendo course-content)
            const parts = url.split('/course-content/');
            if (parts.length > 1) {
                filePath = decodeURIComponent(parts[1]);
            }
        }

        console.log('Descargando path:', filePath);

        // 2. Descargar el archivo usando el SDK (maneja auth headers automáticamente)
        const { data, error } = await supabase.storage
            .from('course-content')
            .download(filePath);

        if (error) {
            console.error('Error de Supabase Storage:', error);
            throw error;
        }

        // 3. Crear un objeto URL para el Blob
        const blobUrl = URL.createObjectURL(data);
        
        // 4. Crear link temporal y disparar click
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        
        // 5. Limpieza
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
        
        toast.success(`${fileName} descargado correctamente`, { id: toastId });
    } catch (err: any) {
        console.error('Error al descargar recurso:', err);
        toast.error(`Error: ${err.message || 'No se pudo descargar el archivo'}`, { id: toastId });
    }
};
