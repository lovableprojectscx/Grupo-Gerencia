const SITE_NAME = "Gerencia y Desarrollo Global";
const SITE_URL = "https://grupogerenciaglobal.com";
const DEFAULT_IMAGE = `${SITE_URL}/og-default.jpg`;

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  }

  const url = new URL(req.url);

  // ── Image proxy mode ──────────────────────────────────────────────────────
  // og:image apunta aquí para eliminar "x-robots-tag: none" de Supabase Storage
  // y cualquier header bloqueante de URLs externas (WordPress, CDNs, etc.).
  const imgParam = url.searchParams.get("img");
  if (imgParam) {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    try {
      // Si el parámetro es una URL completa externa, usarla directamente.
      // Si es un path relativo, construir la URL de Supabase Storage con transformación.
      const isFullUrl = imgParam.startsWith("http://") || imgParam.startsWith("https://");
      // 600×315 es suficiente para preview de WhatsApp/Facebook y pesa ~4× menos que 1200×630
      const fetchUrl = isFullUrl
        ? imgParam
        : `${SUPABASE_URL}/storage/v1/render/image/public/${imgParam}?width=600&height=315&resize=cover&quality=80`;

      const imageRes = await fetch(fetchUrl);
      if (!imageRes.ok) return new Response("Not found", { status: 404 });

      const headers = new Headers();
      headers.set("content-type", imageRes.headers.get("content-type") || "image/jpeg");
      headers.set("cache-control", "public, max-age=86400, s-maxage=86400");
      headers.set("Access-Control-Allow-Origin", "*");
      // ⚠️ No reenviar x-robots-tag: none ni otros headers bloqueantes
      return new Response(imageRes.body, { headers });
    } catch (_) {
      return new Response("Error", { status: 500 });
    }
  }

  // ── OG HTML mode ──────────────────────────────────────────────────────────
  const slug = url.searchParams.get("slug") || "";
  const redirect = url.searchParams.get("redirect") || `${SITE_URL}/curso/${slug}`;

  if (!slug) {
    return Response.redirect(SITE_URL);
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

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

    if (!course) {
      return Response.redirect(redirect);
    }

    const title = esc(`${course.title} | ${SITE_NAME}`);
    const description = esc(
      course.subtitle ||
        (course.description || "").slice(0, 200) ||
        "Potencia tu perfil profesional con educación de calidad."
    );

    // Construir la URL de la imagen proxeada (sin x-robots-tag: none).
    // Usamos SUPABASE_URL para garantizar https y la ruta pública correcta.
    const selfBase = `${SUPABASE_URL}/functions/v1/og`;
    const image = buildProxiedImageUrl(course.image_url, SUPABASE_URL, selfBase);

    // Bloque og:image solo si tenemos imagen válida
    const ogImageTags = image ? `
  <meta property="og:image"       content="${esc(image)}" />
  <meta property="og:image:width"  content="600" />
  <meta property="og:image:height" content="315" />
  <meta name="twitter:card"        content="summary_large_image" />
  <meta name="twitter:image"       content="${esc(image)}" />` : `
  <meta name="twitter:card"        content="summary" />`;

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <meta name="description" content="${description}" />

  <meta property="og:type"        content="website" />
  <meta property="og:url"         content="${esc(redirect)}" />
  <meta property="og:site_name"   content="${SITE_NAME}" />
  <meta property="og:title"       content="${title}" />
  <meta property="og:description" content="${description}" />${ogImageTags}

  <meta name="twitter:title"       content="${title}" />
  <meta name="twitter:description" content="${description}" />

  <meta http-equiv="refresh" content="0;url=${esc(redirect)}" />
</head>
<body>
  <p>Redirigiendo al curso...</p>
  <script>window.location.replace("${esc(redirect)}");</script>
</body>
</html>`;

    const headers = new Headers();
    headers.set("content-type", "text/html; charset=utf-8");
    headers.set("x-content-type-options", "nosniff");
    headers.set("cache-control", "public, max-age=3600, s-maxage=3600");
    headers.set("Access-Control-Allow-Origin", "*");

    return new Response(html, { status: 200, headers });
  } catch (_e) {
    return Response.redirect(redirect);
  }
});

function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Devuelve la URL de imagen para og:image:
 * - Sin imagen → null (no se emite el tag)
 * - Supabase Storage → proxy interno (?img=<path>) para eliminar x-robots-tag: none
 * - URL externa → proxy interno (?img=<url-completa>) para eliminar posibles headers bloqueantes
 */
function buildProxiedImageUrl(imageUrl: string | null, supabaseUrl: string, selfBase: string): string | null {
  if (!imageUrl) return null;
  const storagePublic = `${supabaseUrl}/storage/v1/object/public/`;
  if (imageUrl.startsWith(storagePublic)) {
    // Imagen de Supabase Storage: pasar solo el path relativo
    const path = imageUrl.slice(storagePublic.length);
    return `${selfBase}?img=${encodeURIComponent(path)}`;
  }
  // URL externa (WordPress, CDN externo, etc.): proxear la URL completa
  return `${selfBase}?img=${encodeURIComponent(imageUrl)}`;
}
