/**
 * Vercel Edge Middleware
 *
 * 1. /og-img/* → proxy de imágenes desde Supabase Storage (mismo dominio)
 * 2. /curso/*  → si es bot (WhatsApp/Facebook), sirve HTML con OG tags
 *                con og:image apuntando al proxy en el mismo dominio
 */

import { next } from "@vercel/edge";

const BOT_PATTERN =
  /whatsapp|facebookexternalhit|facebot|twitterbot|linkedinbot|slackbot|telegrambot|discordbot|applebot|googlebot|bingbot/i;

const SUPABASE_URL  = "https://yfkradjibnipfhyhewxm.supabase.co";
const SUPABASE_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlma3JhZGppYm5pcGZoeWhld3htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNTYyNDcsImV4cCI6MjA4MzczMjI0N30.ftBmnPG_0s8h0a7bAwTB4fK4fgtnffnstCmekAgIyY8";
const SITE_NAME     = "Gerencia y Desarrollo Global";
const SITE_URL      = "https://www.grupogerenciaglobal.com";
const STORAGE_BASE  = `${SUPABASE_URL}/storage/v1/object/public/`;

export default async function middleware(request: Request) {
  const url = new URL(request.url);
  const ua  = request.headers.get("user-agent") || "";

  // ── 1. Proxy de imagen: /og-img/<bucket>/<path> ───────────────────────────
  // La imagen se sirve desde el mismo dominio → WhatsApp la acepta sin problemas
  if (url.pathname.startsWith("/og-img/")) {
    const imagePath = url.pathname.slice("/og-img/".length); // ej. course-content/covers/xxx.png
    try {
      const imageRes = await fetch(
        `${SUPABASE_URL}/storage/v1/render/image/public/${imagePath}?width=600&height=315&resize=cover&quality=80`
      );
      if (!imageRes.ok) return next();

      const headers = new Headers();
      headers.set("content-type", imageRes.headers.get("content-type") || "image/jpeg");
      headers.set("cache-control", "public, max-age=86400");
      headers.set("Access-Control-Allow-Origin", "*");
      // No reenviamos x-robots-tag: none que viene de Supabase Storage
      return new Response(imageRes.body, { headers });
    } catch {
      return next();
    }
  }

  // ── 2. OG HTML para bots en /curso/* ─────────────────────────────────────
  if (!BOT_PATTERN.test(ua) || !url.pathname.startsWith("/curso/")) {
    return next();
  }

  const slug = url.pathname.replace(/^\/curso\//, "").replace(/\/$/, "");
  if (!slug) return next();

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/courses?slug=eq.${encodeURIComponent(slug)}&select=title,subtitle,description,image_url&limit=1`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );

    const courses = await res.json();
    const course  = courses?.[0];
    if (!course) return next();

    const title       = esc(`${course.title} | ${SITE_NAME}`);
    const description = esc(
      course.subtitle ||
        (course.description || "").slice(0, 200) ||
        "Potencia tu perfil profesional con educación de calidad."
    );
    const courseUrl = esc(request.url);

    // og:image apunta a /og-img/ en el MISMO dominio (www.grupogerenciaglobal.com)
    let ogImageTags = `\n  <meta name="twitter:card" content="summary" />`;
    if (course.image_url?.startsWith(STORAGE_BASE)) {
      const imgPath = course.image_url.slice(STORAGE_BASE.length);
      const imgUrl  = esc(`${SITE_URL}/og-img/${imgPath}`);
      ogImageTags   = `
  <meta property="og:image"        content="${imgUrl}" />
  <meta property="og:image:width"   content="600" />
  <meta property="og:image:height"  content="315" />
  <meta name="twitter:card"         content="summary_large_image" />
  <meta name="twitter:image"        content="${imgUrl}" />`;
    } else if (course.image_url) {
      // Imagen externa (WordPress, CDN): usar directamente
      const imgUrl = esc(course.image_url);
      ogImageTags  = `
  <meta property="og:image"        content="${imgUrl}" />
  <meta property="og:image:width"   content="600" />
  <meta property="og:image:height"  content="315" />
  <meta name="twitter:card"         content="summary_large_image" />
  <meta name="twitter:image"        content="${imgUrl}" />`;
    }

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <meta name="description" content="${description}" />
  <meta property="og:type"         content="website" />
  <meta property="og:url"          content="${courseUrl}" />
  <meta property="og:site_name"    content="${SITE_NAME}" />
  <meta property="og:title"        content="${title}" />
  <meta property="og:description"  content="${description}" />${ogImageTags}
  <meta name="twitter:title"       content="${title}" />
  <meta name="twitter:description" content="${description}" />
</head>
<body><p>Cargando curso...</p></body>
</html>`;

    const headers = new Headers();
    headers.set("content-type", "text/html; charset=utf-8");
    headers.set("cache-control", "public, max-age=3600");
    return new Response(html, { status: 200, headers });
  } catch {
    return next();
  }
}

function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export const config = {
  matcher: ["/curso/:path*", "/og-img/:path*"],
};
