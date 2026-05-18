
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

/**
 * Fuerza la descarga de un archivo desde Supabase Storage.
 *
 * El bucket 'course-content' es PÚBLICO, por lo que los archivos en
 * /resources/, /materials/ y /certificates/ tienen URL pública directa.
 *
 * Estrategia:
 *  1. Si la URL es de Supabase Storage → extraer el path y crear Signed URL
 *     (funciona tanto para buckets públicos como privados, y fuerza descarga).
 *  2. Si es una URL externa (Google Drive, etc.) → abrir en nueva pestaña.
 *  3. Si falla el signed URL → intentar descarga directa via fetch + Blob.
 */
export const forceDownload = async (url: string, fileName: string) => {
    if (!url) {
        toast.error("Este material no tiene un archivo asignado todavía.");
        return;
    }

    const toastId = toast.loading(`Preparando descarga de ${fileName}...`);

    try {
        // ── Caso: URL externa (Google Drive, etc.) ────────────────────────
        const isSupabaseStorage = url.includes('.supabase.co/storage/');
        if (!isSupabaseStorage) {
            toast.info(`Abriendo material externo...`, { id: toastId });
            window.open(url, '_blank', 'noopener,noreferrer');
            return;
        }

        // ── Extraer el path relativo dentro del bucket ────────────────────
        const filePath = extractStoragePath(url);
        if (!filePath) {
            throw new Error(`No se pudo extraer el path del archivo desde la URL: ${url}`);
        }

        console.log('[Download] Path extraído:', filePath);

        // ── Crear Signed URL (60 segundos) — fuerza descarga sin importar
        //    si el bucket es público o privado ─────────────────────────────
        const { data: signedData, error: signedError } = await supabase.storage
            .from('course-content')
            .createSignedUrl(filePath, 60, {
                download: fileName, // fuerza el header Content-Disposition: attachment
            });

        if (signedError || !signedData?.signedUrl) {
            console.warn('[Download] Signed URL falló, intentando descarga directa:', signedError);
            // Fallback: descarga via fetch + blob (requiere que el bucket sea público)
            await downloadViaFetch(url, fileName, toastId);
            return;
        }

        // ── Disparar descarga con el link firmado ────────────────────────
        const a = document.createElement('a');
        a.href = signedData.signedUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        toast.success(`${fileName} descargado correctamente`, { id: toastId });

    } catch (err: any) {
        console.error('[Download] Error al descargar recurso:', err);
        toast.error(
            `No se pudo descargar: ${err.message || 'Error desconocido'}`,
            { id: toastId }
        );
    }
};

/**
 * Extrae el path relativo dentro del bucket 'course-content' desde una URL completa.
 * Maneja los formatos:
 *   - .../storage/v1/object/public/course-content/PATH
 *   - .../storage/v1/object/authenticated/course-content/PATH
 *   - .../course-content/PATH  (fallback genérico)
 */
function extractStoragePath(url: string): string | null {
    try {
        // Formato estándar Supabase: /object/[public|authenticated]/BUCKET/PATH
        const match = url.match(
            /\/storage\/v1\/object\/(?:public|authenticated)\/[^/]+\/(.+)/
        );
        if (match && match[1]) return decodeURIComponent(match[1]);

        // Fallback: todo lo que venga después de '/course-content/'
        const parts = url.split('/course-content/');
        if (parts.length > 1) return decodeURIComponent(parts[1]);

        return null;
    } catch {
        return null;
    }
}

/**
 * Descarga un archivo como Blob a través de fetch (funciona para buckets públicos).
 * Se usa como fallback cuando createSignedUrl falla.
 */
async function downloadViaFetch(url: string, fileName: string, toastId: string | number) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP ${response.status} al intentar descargar el archivo`);
    }
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10_000);

    toast.success(`${fileName} descargado correctamente`, { id: toastId });
}
