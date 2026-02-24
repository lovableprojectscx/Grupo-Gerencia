/**
 * Vercel Edge Function: proxy de imagen para OG tags
 * URL: /api/og-image?path=course-content/covers/xxx.png
 *
 * Sirve la imagen desde el mismo dominio (www.grupogerenciaglobal.com)
 * eliminando el header "x-robots-tag: none" que bloquea WhatsApp.
 */

export const config = { runtime: "edge" };

const SUPABASE_URL = "https://yfkradjibnipfhyhewxm.supabase.co";

export default async function handler(request: Request) {
  const url = new URL(request.url);
  const path = url.searchParams.get("path");

  if (!path) {
    return new Response("Missing path", { status: 400 });
  }

  try {
    const imageUrl = `${SUPABASE_URL}/storage/v1/render/image/public/${path}?width=600&height=315&resize=cover&quality=80`;
    const imageRes = await fetch(imageUrl);

    if (!imageRes.ok) {
      return new Response("Not found", { status: 404 });
    }

    const headers = new Headers();
    headers.set("content-type", imageRes.headers.get("content-type") || "image/jpeg");
    headers.set("cache-control", "public, max-age=86400");
    headers.set("Access-Control-Allow-Origin", "*");
    // No reenviamos x-robots-tag: none que viene de Supabase Storage

    return new Response(imageRes.body, { headers });
  } catch {
    return new Response("Error", { status: 500 });
  }
}
