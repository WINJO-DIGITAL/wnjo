import type { NextConfig } from "next";

/**
 * Content Security Policy. The browser may only load code, styles, fonts, images and media from this site, and
 * only talk to this site and the Supabase project (sign-in and file uploads). Inline scripts and styles stay
 * allowed because Next.js writes inline bootstrap scripts and the pages use inline styles; everything else that
 * makes cross-site scripting useful (other origins, plugins, framing, base-tag tricks) is shut off.
 * Preview deployments also allow Vercel's comment toolbar; development allows eval for hot reload.
 */
function contentSecurityPolicy(): string {
  const supabase = (() => {
    try {
      return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").origin;
    } catch {
      return "";
    }
  })();
  const supabaseWs = supabase.replace(/^https:/, "wss:");
  const preview = process.env.VERCEL_ENV === "preview";
  const dev = process.env.NODE_ENV === "development";
  const vercel = preview ? ["https://vercel.live", "https://*.vercel.live"] : [];

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": ["'self'", "'unsafe-inline'", ...(dev ? ["'unsafe-eval'"] : []), ...vercel],
    "style-src": ["'self'", "'unsafe-inline'", ...vercel],
    "img-src": ["'self'", "data:", "blob:", ...(supabase ? [supabase] : []), ...vercel],
    "font-src": ["'self'", "data:", ...vercel],
    "media-src": ["'self'", "blob:", ...(supabase ? [supabase] : [])],
    "connect-src": ["'self'", ...(supabase ? [supabase, supabaseWs] : []), ...vercel, ...(preview ? ["wss://ws-us3.pusher.com"] : [])],
    "frame-src": preview ? vercel : ["'none'"],
    "worker-src": ["'self'", "blob:"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };
  const policy = Object.entries(directives).map(([name, values]) => `${name} ${values.join(" ")}`);
  // Only on Vercel: a local production build is served over plain http.
  if (process.env.VERCEL === "1") policy.push("upgrade-insecure-requests");
  return policy.join("; ");
}

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy() },
  // Browsers remember to use HTTPS only, for two years, on this domain and its subdomains.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Hides the "N" development badge that Next.js shows bottom-left while running locally.
  devIndicators: false,
  // The app development page used to live at /bespoke-systems; the websites page became the managed service.
  async redirects() {
    return [
      { source: "/bespoke-systems", destination: "/app-development", permanent: true },
      { source: "/websites", destination: "/managed-websites", permanent: true },
    ];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
