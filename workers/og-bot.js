/**
 * Cloudflare Worker: OG Preview para bots sociales
 * Ruta: grupogerenciaglobal.com/curso/*
 *
 * Si la petición viene de un bot (WhatsApp, Facebook, etc.),
 * devuelve HTML con los OG tags del curso.
 * Si es un usuario normal, pasa la petición a Lovable/origen normalmente.
 */

const SUPABASE_URL = "https://yfkradjibnipfhyhewxm.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlma3JhZGppYm5pcGZoeWhld3htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNTYyNDcsImV4cCI6MjA4MzczMjI0N30.ftBmnPG_0s8h0a7bAwTB4fK4fgtnffnstCmekAgIyY8";
const SITE_NAME = "Gerencia y Desarrollo Global";
const SITE_URL = "https://grupogerenciaglobal.com";
const DEFAULT_IMAGE = `${SITE_URL}/og-default.jpg`;

const BOT_PATTERN = /whatsapp|facebookexternalhit|facebot|twitterbot|linkedinbot|slackbot|telegrambot|discordbot|applebot|googlebot|bingbot|ia_archiver/i;

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const ua = request.headers.get("user-agent") || "";

    // Solo interceptar /curso/* para bots conocidos
    const isCursoRoute = url.pathname.startsWith("/curso/");
    const isBot = BOT_PATTERN.test(ua);

    if (!isCursoRoute || !isBot) {
      return fetch(request); // pasa al origen normalmente
    }

    // Extraer el slug del curso: /curso/mi-curso-slug → mi-curso-slug
    const slug = url.pathname.replace(/^\/curso\//, "").replace(/\/$/, "");
    if (!slug) return fetch(request);

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
      const course = courses?.[0];

      if (!course) return fetch(request);

      const title   = esc(`${course.title} | ${SITE_NAME}`);
      const desc    = esc(course.subtitle || (course.description || "").slice(0, 200) || "Potencia tu perfil profesional con educación de calidad.");
      const image   = course.image_url || DEFAULT_IMAGE;
      const pageUrl = esc(url.toString());

      const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <meta name="description" content="${desc}" />

  <meta property="og:type"         content="website" />
  <meta property="og:url"          content="${pageUrl}" />
  <meta property="og:site_name"    content="${SITE_NAME}" />
  <meta property="og:title"        content="${title}" />
  <meta property="og:description"  content="${desc}" />
  <meta property="og:image"        content="${esc(image)}" />
  <meta property="og:image:width"  content="1200" />
  <meta property="og:image:height" content="630" />

  <meta name="twitter:card"        content="summary_large_image" />
  <meta name="twitter:title"       content="${title}" />
  <meta name="twitter:description" content="${desc}" />
  <meta name="twitter:image"       content="${esc(image)}" />
</head>
<body>
  <p>Cargando curso...</p>
</body>
</html>`;

      return new Response(html, {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "public, max-age=3600",
        },
      });
    } catch (_) {
      return fetch(request);
    }
  },
};

function esc(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
