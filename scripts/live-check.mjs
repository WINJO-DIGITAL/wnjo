#!/usr/bin/env node
/**
 * Live checks for the deployed site. Run after every production deploy:
 *   node scripts/live-check.mjs https://www.wnjoweb.co.uk
 * It fetches each public page and reports status, the sitemap and robots file, structured data presence, and
 * the canonical and Open Graph tags. It does not submit forms, send email or change anything.
 * Email delivery and the enquiry form itself are checked by hand on the live site (see docs/WEBSITE_AUDIT.md).
 */
const base = (process.argv[2] ?? "").replace(/\/+$/, "");
if (!/^https:\/\//.test(base)) {
  console.error("Give the live address, starting with https://");
  process.exit(2);
}

const pages = ["/", "/websites", "/booking-software", "/app-development", "/pricing", "/work", "/about", "/faq", "/contact", "/build", "/privacy", "/terms", "/cookies", "/resources", "/resources/how-ordering-a-website-works"];
const problems = [];
const note = (ok, label) => console.log(`${ok ? "PASS" : "FAIL"} ${label}`);

for (const path of pages) {
  const res = await fetch(base + path, { redirect: "manual" });
  const html = res.status === 200 ? await res.text() : "";
  const ok = res.status === 200;
  if (!ok) problems.push(`${path} returned ${res.status}`);
  note(ok, `${path} ${res.status}`);
  if (ok) {
    const canonical = /<link rel="canonical" href="([^"]+)"/.exec(html)?.[1];
    const og = /<meta property="og:image" content="([^"]+)"/.exec(html)?.[1];
    if (!canonical) problems.push(`${path} has no canonical link`);
    if (!og) problems.push(`${path} has no Open Graph image`);
    if (path === "/" && !/"@type":"ProfessionalService"/.test(html)) problems.push("homepage has no business structured data");
  }
}

const notFound = await fetch(base + "/no-such-page-check");
note(notFound.status === 404, `unknown page returns 404 (${notFound.status})`);
if (notFound.status !== 404) problems.push("unknown page does not return 404");

const sitemap = await fetch(base + "/sitemap.xml");
const sitemapText = sitemap.status === 200 ? await sitemap.text() : "";
const locs = [...sitemapText.matchAll(/<loc>([^<]+)<\/loc>/g)].length;
note(sitemap.status === 200 && locs >= pages.length - 1, `sitemap lists ${locs} pages`);
if (locs < pages.length - 1) problems.push(`sitemap lists only ${locs} pages`);

const robots = await fetch(base + "/robots.txt");
const robotsText = robots.status === 200 ? await robots.text() : "";
note(robotsText.includes("Sitemap:"), "robots.txt points to the sitemap");
if (!robotsText.includes("Sitemap:")) problems.push("robots.txt does not name the sitemap");

console.log(problems.length ? `\n${problems.length} problem(s):\n- ${problems.join("\n- ")}` : "\nAll automated live checks passed.");
process.exit(problems.length ? 1 : 0);
