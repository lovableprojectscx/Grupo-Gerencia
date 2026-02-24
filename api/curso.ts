/**
 * Vercel Edge Function: intercepta /curso/:slug
 *
 * - Bots (WhatsApp, Facebook, Google...): devuelve HTML con OG tags correctos
 *   og:image apunta a /api/og-image (mismo dominio, sin x-robots-tag: none)
 * - Usuarios reales: sirve index.html → la SPA se monta normalmente
 */

export const config = { runtime: "edge" };

const BOT_PATTERN =
  /whatsapp|facebookexternalhit|facebot|twitterbot|linkedinbot|slackbot|telegrambot|discordbot|applebot|googlebot|bingbot/i;

const SUPABASE_URL = "https://yfkradjibnipfhyhewxm.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlma3JhZGppYm5pcGZoeWhld3htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNTYyNDcsImV4cCI6MjA4MzczMjI0N30.ftBmnPG_0s8h0a7bAwTB4fK4fgtnffnstCmekAgIyY8";
const SITE_URL     = "https://www.grupogerenciaglobal.com";
const SITE_NAME    = "Gerencia y Desarrollo Global";
const STORAGE_BASE = `${SUPABASE_URL}/storage/v1/object/public/`;
const IMAGE_PROXY  = `${SITE_URL}/api/og-image`;

export default async function handler(request: Request) {
  const url  = new URL(request.url);
  const ua   = request.headers.get("user-agent") || "";
  const slug = url.searchParams.get("slug") || "";

  // ── Usuarios normales: servir la SPA ─────────────────────────────────────
  if (!BOT_PATTERN.test(ua) || !slug) {
    const spaRes = await fetch(`${SITE_URL}/index.html`);
    return new Response(spaRes.body, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  }

  // ── Bots: construir y devolver HTML con OG tags ───────────────────────────
  const courseUrl = `${SITE_URL}/curso/${slug}`;

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

    if (!course) {
      return Response.redirect(courseUrl, 302);
    }

    const title = esc(`${course.title} | ${SITE_NAME}`);
    const description = esc(
      course.subtitle ||
        (course.description || "").slice(0, 200) ||
        "Potencia tu perfil profesional con educación de calidad."
    );

    let ogImageTags = `\n  <meta name="twitter:card" content="summary" />`;

    if (course.image_url?.startsWith(STORAGE_BASE)) {
      // Imagen de Supabase Storage → proxy en mismo dominio para eliminar x-robots-tag: none
      const imgPath = course.image_url.slice(STORAGE_BASE.length);
      const imgUrl  = esc(`${IMAGE_PROXY}?path=${encodeURIComponent(imgPath)}`);
      ogImageTags = buildImageTags(imgUrl);
    } else if (course.image_url) {
      // Imagen externa (WordPress, CDN): usar directamente
      ogImageTags = buildImageTags(esc(course.image_url));
    }

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <meta name="description" content="${description}" />

  <meta property="og:type"        content="website" />
  <meta property="og:url"         content="${esc(courseUrl)}" />
  <meta property="og:site_name"   content="${SITE_NAME}" />
  <meta property="og:title"       content="${title}" />
  <meta property="og:description" content="${description}" />${ogImageTags}

  <meta name="twitter:title"       content="${title}" />
  <meta name="twitter:description" content="${description}" />
</head>
<body><p>Cargando curso...</p></body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
        "x-og-version": "v3-api-route",
      },
    });
  } catch {
    return Response.redirect(courseUrl, 302);
  }
}

function buildImageTags(imgUrl: string): string {
  return `
  <meta property="og:image"        content="${imgUrl}" />
  <meta property="og:image:width"  content="600" />
  <meta property="og:image:height" content="315" />
  <meta name="twitter:card"        content="summary_large_image" />
  <meta name="twitter:image"       content="${imgUrl}" />`;
}

function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
