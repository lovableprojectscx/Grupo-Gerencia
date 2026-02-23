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
    const image = course.image_url || DEFAULT_IMAGE;

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

    return new Response(html, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=3600, s-maxage=3600",
        "Access-Control-Allow-Origin": "*",
      },
    });
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
