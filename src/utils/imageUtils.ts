import imageCompression from 'browser-image-compression';
import { toast } from 'sonner';

/**
 * Retorna la URL de la imagen asegurando compatibilidad directa con Supabase y servidores de origen.
 * Se evita el uso de proxys externos (como images.weserv.nl) debido a que varios proveedores de internet
 * en Perú (Movistar, Claro, Entel, Bitel) bloquean dominios de proxy público por DNS/IP.
 *
 * La optimización de peso y ancho de banda está garantizada al subir imágenes mediante
 * `compressAndConvertToWebP` (archivos WebP de ~80KB) y carga diferida `loading="lazy"`.
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
 * Convierte a formato WebP y limita el ancho máximo a 1200px.
 * Si el archivo es un PDF, SVG o documento no-imagen, lo devuelve intacto sin modificar.
 *
 * @param file Archivo File seleccionado por el usuario
 * @returns Promesa con el File comprimido en WebP (o el original si no es imagen ráster)
 */
export async function compressAndConvertToWebP(file: File): Promise<File> {
    // Si el archivo no es de tipo imagen (ej. PDF, ZIP, DOCX, MP4), devolver intacto
    if (!file.type.startsWith('image/')) {
        return file;
    }

    // Si es un SVG, mantener el formato vectorial original sin rasterizar
    if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
        return file;
    }

    const toastId = toast.loading("Optimizando imagen para reducir tamaño...");

    try {
        const options = {
            maxSizeMB: 0.8,
            maxWidthOrHeight: 1200,
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
