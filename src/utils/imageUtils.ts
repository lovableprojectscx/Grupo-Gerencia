import imageCompression from 'browser-image-compression';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

export type CompressionPreset = 'avatar' | 'instructor' | 'qr' | 'voucher' | 'cover' | 'certificate' | 'logo' | 'default';

interface PresetOptions {
    maxWidthOrHeight: number;
    maxSizeMB: number;
}

const PRESET_CONFIG: Record<CompressionPreset, PresetOptions> = {
    avatar: { maxWidthOrHeight: 300, maxSizeMB: 0.1 },
    instructor: { maxWidthOrHeight: 400, maxSizeMB: 0.15 },
    qr: { maxWidthOrHeight: 500, maxSizeMB: 0.15 },
    logo: { maxWidthOrHeight: 400, maxSizeMB: 0.1 },
    voucher: { maxWidthOrHeight: 1000, maxSizeMB: 0.3 },
    cover: { maxWidthOrHeight: 1200, maxSizeMB: 0.4 },
    certificate: { maxWidthOrHeight: 1200, maxSizeMB: 0.5 },
    default: { maxWidthOrHeight: 1200, maxSizeMB: 0.5 },
};

/**
 * Retorna la URL de la imagen asegurando compatibilidad directa con Supabase y servidores de origen.
 * Se evita el uso de proxys externos (como images.weserv.nl) debido a que varios proveedores de internet
 * en Perú (Movistar, Claro, Entel, Bitel) bloquean dominios de proxy público por DNS/IP.
 */
export function getOptimizedImageUrl(
    url: string | null | undefined,
    _width?: number
): string | null | undefined {
    if (!url) return url;
    return url;
}

/**
 * Comprime y redimensiona una imagen en el lado del cliente antes de subirla a Supabase Storage.
 * Convierte a formato WebP ajustando resolución según el preset (avatar: 300px, cover: 1200px, etc.).
 * Si el archivo es un PDF, SVG o documento no-imagen, lo devuelve intacto sin modificar.
 *
 * @param file Archivo File seleccionado por el usuario
 * @param preset Tipo de imagen ('avatar', 'instructor', 'qr', 'voucher', 'cover', 'certificate', 'logo')
 * @returns Promesa con el File comprimido en WebP (o el original si no es imagen ráster)
 */
export async function compressAndConvertToWebP(
    file: File,
    preset: CompressionPreset = 'default'
): Promise<File> {
    // Si el archivo no es de tipo imagen (ej. PDF, ZIP, DOCX, MP4), devolver intacto
    if (!file.type.startsWith('image/')) {
        return file;
    }

    // Si es un SVG, mantener el formato vectorial original sin rasterizar
    if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
        return file;
    }

    const toastId = toast.loading("Optimizando imagen para reducir tamaño...");
    const { maxWidthOrHeight, maxSizeMB } = PRESET_CONFIG[preset] || PRESET_CONFIG.default;

    try {
        const options = {
            maxSizeMB,
            maxWidthOrHeight,
            useWebWorker: true,
            fileType: 'image/webp'
        };

        const compressedBlob = await imageCompression(file, options);

        // Cambiar la extensión a .webp
        const originalName = file.name;
        const nameWithoutExt = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
        const newName = `${nameWithoutExt}.webp`;

        toast.success("Imagen optimizada a WebP", { id: toastId });

        return new File([compressedBlob], newName, {
            type: 'image/webp',
            lastModified: Date.now()
        });
    } catch (error) {
        console.error("Error al comprimir la imagen:", error);
        toast.dismiss(toastId);
        // En caso de fallo en el trabajador o compresión, devolver el archivo original
        return file;
    }
}

/**
 * Elimina un archivo de Supabase Storage a partir de su URL pública o firmada.
 * Evita la acumulación de archivos huérfanos cuando se reemplazan o eliminan imágenes.
 *
 * @param url URL de Supabase Storage a eliminar
 * @param defaultBucket Nombre del bucket si no se detecta en la URL
 */
export async function deleteStorageFileFromUrl(
    url: string | null | undefined,
    defaultBucket = 'course-content'
): Promise<boolean> {
    if (!url || typeof url !== 'string' || !url.includes('.supabase.co/storage/')) {
        return false;
    }

    try {
        // Formato estándar Supabase: /storage/v1/object/(public|authenticated)/BUCKET_NAME/FILE_PATH
        const match = url.match(/\/storage\/v1\/object\/(?:public|authenticated)\/([^/]+)\/(.+)/);
        let bucket = defaultBucket;
        let filePath: string | null = null;

        if (match && match[1] && match[2]) {
            bucket = match[1];
            filePath = decodeURIComponent(match[2].split('?')[0]);
        } else {
            // Fallback
            const parts = url.split(`/${defaultBucket}/`);
            if (parts.length > 1) {
                filePath = decodeURIComponent(parts[1].split('?')[0]);
            }
        }

        if (!filePath) return false;

        const { error } = await supabase.storage.from(bucket).remove([filePath]);
        if (error) {
            console.warn(`[Storage Cleanup] Error al eliminar archivo ${filePath} del bucket ${bucket}:`, error);
            return false;
        }

        console.log(`[Storage Cleanup] Archivo huérfano eliminado exitosamente: ${filePath} (bucket: ${bucket})`);
        return true;
    } catch (err) {
        console.error("[Storage Cleanup] Excepción al intentar eliminar archivo:", err);
        return false;
    }
}
