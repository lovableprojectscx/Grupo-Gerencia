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
  // og:image apunta aquí en vez de directamente a Supabase Storage para
  // eliminar el header "x-robots-tag: none" que bloquea WhatsApp/Facebook.
  const imgPath = url.searchParams.get("img");
  if (imgPath) {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    try {
      const imageRes = await fetch(
        `${SUPABASE_URL}/storage/v1/render/image/public/${imgPath}?width=1200&height=630&resize=cover&quality=80`
      );
      if (!imageRes.ok) return new Response("Not found", { status: 404 });

      const headers = new Headers();
      headers.set("content-type", imageRes.headers.get("content-type") || "image/jpeg");
      headers.set("cache-control", "public, max-age=86400, s-maxage=86400");
      headers.set("Access-Control-Allow-Origin", "*");
      // ⚠️ No reenviar x-robots-tag: none — ese header viene de Supabase Storage
      //    y haría que WhatsApp ignore la imagen.
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
  <meta property="og:description" content="${description}" />
  <meta property="og:image"       content="${esc(image)}" />
  <meta property="og:image:width"  content="1200" />
  <meta property="og:image:height" content="630" />

  <meta name="twitter:card"        content="summary_large_image" />
  <meta name="twitter:title"       content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image"       content="${esc(image)}" />

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
 * Si la imagen está en Supabase Storage, devuelve la URL del proxy interno
 * (la misma edge function con ?img=<path>) para evitar el header x-robots-tag: none.
 * Si no, devuelve la URL original.
 */
function buildProxiedImageUrl(imageUrl: string, supabaseUrl: string, selfBase: string): string {
  if (!imageUrl) return DEFAULT_IMAGE;
  const storagePublic = `${supabaseUrl}/storage/v1/object/public/`;
  if (imageUrl.startsWith(storagePublic)) {
    const path = imageUrl.slice(storagePublic.length);
    return `${selfBase}?img=${encodeURIComponent(path)}`;
  }
  return imageUrl;
}
