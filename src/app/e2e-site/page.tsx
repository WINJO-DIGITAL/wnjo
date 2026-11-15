import { notFound } from "next/navigation";
import { SiteRender } from "@/components/site-template/SiteRender";
import { parseAnswers } from "@/lib/site-template/answers";
import { firstPages } from "@/lib/site-template/pages";
import { SECTOR_PRESETS } from "@/lib/site-template/presets";
import { SAMPLE_ANSWERS } from "@/lib/site-template/sample";
import { LAYOUTS, LOOKS, type Layout, type Look } from "@/lib/site-template/schema";
import { STANDIN_PHOTOS } from "@/lib/site-template/template-test";
import { assembleSite, defaultCopy } from "@/lib/site-template/write";

export const dynamic = "force-dynamic";

/**
 * A made-up sample site for the browser tests, laid out by the real renderer exactly as a customer's site is.
 * It exists only when the server is started with E2E=1 (the browser tests do that); everywhere else it is a 404, and
 * it reads no database and sends nothing.
 */
export default async function E2ESite({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  if (process.env.E2E !== "1") notFound();
  const q = await searchParams;
  const preset = SECTOR_PRESETS[q.t ?? "barber"];
  if (!preset) notFound();
  const parsed = parseAnswers({ ...SAMPLE_ANSWERS[preset.id], layout: q.l }, preset, { colour: "#1f3a34" });
  if (!parsed.ok) notFound();
  const photos = STANDIN_PHOTOS[preset.id];
  const withPhotos = q.nophoto !== "1" && photos;
  const input = {
    preset,
    facts: parsed.facts,
    look: (LOOKS as readonly string[]).includes(q.look ?? "") ? (q.look as Look) : parsed.look,
    layout: (LAYOUTS as readonly string[]).includes(q.l ?? "") ? (q.l as Layout) : parsed.layout,
    colour: parsed.colour,
    heroPhoto: withPhotos ? photos.hero : undefined,
    images: withPhotos ? photos.gallery.map((src, n) => ({ src, alt: `${parsed.facts.businessName} photo ${n + 1}` })) : [],
    pages: firstPages(Number(q.n ?? 1)),
    pageLimit: 6,
  };
  const copy = {
    ...defaultCopy(input),
    faq: [
      { question: "Do you take walk-ins?", answer: "Yes, walk-ins are welcome whenever we are open." },
      { question: "Where are you?", answer: "Our address is on the Contact page." },
    ],
  };
  const content = assembleSite(input, copy);
  // Page links keep the sample's own settings, so following one shows the same sample's other page.
  const keep = new URLSearchParams(Object.entries(q).filter((e): e is [string, string] => typeof e[1] === "string" && e[0] !== "page"));
  const pageHref = (slug: string) => `?${keep.toString()}${slug ? `${keep.size ? "&" : ""}page=${slug}` : ""}`;
  return (
    // "sitepv" is what hides our own footer, the same as on a private preview.
    <div className="sitepv">
      <SiteRender content={content} heroImage={input.heroPhoto} page={q.page ?? ""} pageHref={pageHref} enquiry={{ action: "/api/site-enquiry", token: "e2e-token-e2e-token-e2e" }} />
    </div>
  );
}
