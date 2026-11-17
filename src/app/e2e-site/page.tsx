import { notFound } from "next/navigation";
import { SiteRender } from "@/components/site-template/SiteRender";
import { siteFontClasses } from "@/lib/site-template/fonts";
import { buildE2ESample } from "@/lib/site-template/e2e-sample";

export const dynamic = "force-dynamic";

/**
 * A made-up sample site for the browser tests, laid out by the real renderer exactly as a customer's site is.
 * It exists only when the server is started with E2E=1 (the browser tests do that); everywhere else it is a 404, and
 * it reads no database and sends nothing.
 */
export default async function E2ESite({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  if (process.env.E2E !== "1") notFound();
  const q = await searchParams;
  const sample = buildE2ESample({ sector: q.t ?? "barber", pages: Number(q.n ?? 1), layout: q.l, look: q.look, photos: q.nophoto !== "1", video: q.video === "1" });
  if (!sample) notFound();
  // Page links keep the sample's own settings, so following one shows the same sample's other page.
  const keep = new URLSearchParams(Object.entries(q).filter((e): e is [string, string] => typeof e[1] === "string" && e[0] !== "page"));
  const pageHref = (slug: string) => `?${keep.toString()}${slug ? `${keep.size ? "&" : ""}page=${slug}` : ""}`;
  return (
    // "sitepv" is what hides our own footer, the same as on a private preview.
    <div className={`sitepv ${siteFontClasses}`}>
      <SiteRender content={sample.content} heroImage={sample.heroImage} heroVideo={sample.heroVideo} page={q.page ?? ""} pageHref={pageHref} enquiry={{ action: "/api/site-enquiry", token: "e2e-token-e2e-token-e2e" }} />
    </div>
  );
}
