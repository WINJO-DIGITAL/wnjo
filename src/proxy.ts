import { NextResponse, type NextRequest } from "next/server";
import { extraMainHosts, hostOf, siteRewritePath } from "@/lib/site-template/hosts";

/**
 * A request to one of our own addresses goes on as normal. A request to any other address is a customer's live
 * website: it is served from /sites/<address>/..., and the visitor still sees their own address. Whether that address
 * has a live site is decided there, not here, so this stays fast and never touches the database.
 */
export function proxy(request: NextRequest) {
  // Only when the browser tests run: their stand-in photos are our own files, which a sample "customer" address may load.
  if (process.env.E2E === "1" && request.nextUrl.pathname.startsWith("/styler/")) return NextResponse.next();
  const host = hostOf(request.headers.get("host"));
  const target = siteRewritePath(host, request.nextUrl.pathname, extraMainHosts(process.env.MAIN_HOSTS));
  if (!target) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = target;
  return NextResponse.rewrite(url);
}

// Our own API (the booking form posts to it) and the app's own files are never rewritten.
export const config = { matcher: ["/((?!api/|_next/).*)"] };
