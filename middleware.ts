/**
 * Vercel Edge Middleware — OG Bot Detection
 *
 * Cuando un bot de WhatsApp, Facebook, etc. pide /curso/:slug,
 * hacemos proxy de la Edge Function de Supabase que sirve el HTML con
 * los OG tags correctos (título, descripción e imagen del curso).
 * Los usuarios reales pasan normalmente hacia la SPA de React.
 */

import { next } from "@vercel/edge";

const BOT_PATTERN =
  /whatsapp|facebookexternalhit|facebot|twitterbot|linkedinbot|slackbot|telegrambot|discordbot|applebot|googlebot|bingbot/i;

const SUPABASE_OG =
  "https://yfkradjibnipfhyhewxm.supabase.co/functions/v1/og";

export default async function middleware(request: Request) {
  const ua = request.headers.get("user-agent") || "";
  const url = new URL(request.url);

  // Solo interceptar /curso/* para bots conocidos
  if (!BOT_PATTERN.test(ua) || !url.pathname.startsWith("/curso/")) {
    return next();
  }

  const slug = url.pathname.replace(/^\/curso\//, "").replace(/\/$/, "");
  if (!slug) return next();

  const ogUrl = `${SUPABASE_OG}?slug=${encodeURIComponent(slug)}&redirect=${encodeURIComponent(request.url)}`;

  try {
    const ogRes = await fetch(ogUrl);
    const html = await ogRes.text();
    return new Response(html, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=3600",
      },
    });
  } catch {
    return next(); // Si falla, dejar pasar al usuario/bot normalmente
  }
}

export const config = {
  matcher: "/curso/:path*",
};
