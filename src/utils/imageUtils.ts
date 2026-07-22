import imageCompression from 'browser-image-compression';
import { toast } from 'sonner';

/**
 * Normaliza y optimiza una URL de imagen usando el CDN global images.weserv.nl.
 * Convierte a WebP, redimensiona al ancho especificado y aplica calidad 80.
 *
 * @param url URL original de la imagen (Supabase storage, externa, o relativa)
 * @param width Ancho deseado en píxeles (ej. 200 para logos, 500 para grid, 800 para detalle, 1200 para banners/certificados)
 */
export function getOptimizedImageUrl(
    url: string | null | undefined,
    width: number
): string | null | undefined {
    if (!url) return url;

    // Si no es una URL http/https (ej. assets locales /assets/..., data URIs, blobs), devolver tal cual
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return url;
    }

    // Extraer la ruta limpia antes de parámetros de consulta para verificar la extensión
    const cleanUrl = url.split('?')[0].toLowerCase();

    // No procesar por CDN de imágenes archivos PDF, SVG o documentos
    if (
        cleanUrl.endsWith('.pdf') ||
        cleanUrl.endsWith('.svg') ||
        cleanUrl.endsWith('.doc') ||
        cleanUrl.endsWith('.docx') ||
        cleanUrl.endsWith('.zip')
    ) {
        return url;
    }

    // Eliminar protocolo http:// o https:// para enviar a weserv.nl
    const sinProtocolo = url.replace(/^https?:\/\//, '');
    return `https://images.weserv.nl/?url=${encodeURIComponent(sinProtocolo)}&w=${width}&output=webp&q=80`;
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
