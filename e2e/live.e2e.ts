import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

/**
 * A customer's live website on its own address: served by the proxy and the public page, with none of our own header,
 * footer or styles, real addresses for every page, the tags search engines read, and a sitemap. The made-up sites live
 * at addresses like barber-p6.e2e.test (sector, number of pages, layout); see src/lib/site-template/e2e-sample.ts.
 */
const PORT = 3100;
const at = (host: string, path = "/") => `http://${host}.e2e.test:${PORT}${path}`;
/** A request as if made to the customer's own address. (The browser maps those addresses itself; this one is sent to localhost with their address as the Host.) */
const get = (request: APIRequestContext, host: string, path = "/") => request.get(`http://localhost:${PORT}${path}`, { headers: { host: `${host}.e2e.test:${PORT}` } });

function watch(page: Page) {
  const problems: string[] = [];
  page.on("console", (m) => m.type() === "error" && problems.push(`console: ${m.text()}`));
  page.on("pageerror", (e) => problems.push(`error: ${e.message}`));
  return problems;
}

test("the live site has none of our own header, footer or styles, and is set up for search", async ({ page }) => {
  const problems = watch(page);
  const res = await page.goto(at("barber-p6"));
  expect(res?.status()).toBe(200);
  await expect(page.locator("html")).toHaveAttribute("lang", "en-GB");
  // Nothing of ours: no WINJO header, footer, skip link, or sticky button.
  await expect(page.getByText("Managed websites")).toHaveCount(0);
  await expect(page.locator(".site-footer, .skip-link, header.site-header")).toHaveCount(0);
  await expect(page.locator("h1")).toHaveCount(1);

  const title = await page.title();
  expect(title).toContain("Hartley & Sons");
  expect(title).not.toContain("WINJO");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /.{20,}/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", at("barber-p6", "/"));
  await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(0);
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", title);

  const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? "{}");
  expect(ld["@type"]).toBe("LocalBusiness");
  expect(ld.name).toBe("Hartley & Sons");
  expect(ld.telephone).toBe("01632 960123");
  expect(problems).toEqual([]);
});

test("every page has its own real address, title and canonical, and none is broken", async ({ page }) => {
  const problems = watch(page);
  await page.goto(at("barber-p6"));
  const hrefs = await page.getByRole("navigation", { name: "Pages" }).getByRole("link").evaluateAll((links) => links.map((l) => l.getAttribute("href") ?? ""));
  expect(hrefs).toEqual(["/", "/services", "/about", "/gallery", "/faq", "/contact"]);
  const titles = new Set<string>();
  for (const href of hrefs) {
    const res = await page.goto(at("barber-p6", href));
    expect(res?.status(), href).toBe(200);
    await expect(page.locator("h1"), href).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", at("barber-p6", href));
    titles.add(await page.title());
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  }
  expect(titles.size, "each page has its own title").toBe(hrefs.length);
  expect(problems).toEqual([]);
});

test("the sitemap and robots file name every page at the site's own address", async ({ request }) => {
  const sitemap = await get(request, "barber-p6", "/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  const xml = await sitemap.text();
  for (const path of ["/", "/services", "/about", "/gallery", "/faq", "/contact"]) expect(xml).toContain(`<loc>${at("barber-p6", path)}</loc>`);
  const robots = await get(request, "barber-p6", "/robots.txt");
  expect(robots.status()).toBe(200);
  const text = await robots.text();
  expect(text).toContain(`Sitemap: ${at("barber-p6", "/sitemap.xml")}`);
  expect(text).not.toMatch(/Disallow: \/\s*$/m);
});

test("an address with no live site, a page that doesn't exist, and our own route typed on our address are all 404s", async ({ request, page }) => {
  expect((await get(request, "unknown-site")).status()).toBe(404);
  expect((await get(request, "barber-p6", "/nope")).status()).toBe(404);
  expect((await get(request, "barber-p6", "/services/extra")).status()).toBe(404);
  expect((await get(request, "barber-p6", "/photo?f=drafts%2Fx%2Fa.jpg&w=900")).status(), "a file that isn't this site's own").toBe(404);
  // The internal route is not for visitors: on our own address it is a 404 even for a real customer address.
  const direct = await page.goto("/sites/barber-p6.e2e.test");
  expect(direct?.status()).toBe(404);
  expect((await request.get(`http://localhost:${PORT}/sites/barber-p6.e2e.test/sitemap.xml`)).status()).toBe(404);
});

test("our own site is unaffected by the proxy", async ({ request }) => {
  const res = await request.get(`http://localhost:${PORT}/pricing`);
  expect(res.status()).toBe(200);
  expect(await res.text()).toContain("WINJO");
});

test("the request form posts from the live address and stays there, on the page it was on", async ({ page }) => {
  test.skip(Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY), "needs to run without a database, so the outcome is predictable");
  await page.goto(at("barber-p6", "/contact"));
  const form = page.locator("#book form");
  await expect(form.locator('input[name="token"]')).toHaveCount(0);
  await form.getByLabel("Name").fill("Sam");
  await form.getByLabel("Phone or email").fill("07700 900123");
  await form.getByRole("button").click();
  // With no database to save to, the request can't be sent: the visitor is told so, on the same address and page.
  await expect(page).toHaveURL(at("barber-p6", "/contact?sent=0#book"));
  await expect(page.locator("#book").getByRole("alert")).toContainText("didn't send");
});

test("a single-page live site works too, and a phone gets the same site", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const problems = watch(page);
  const res = await page.goto(at("plumbing-p1-essentials"));
  expect(res?.status()).toBe(200);
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.getByRole("navigation", { name: "Pages" })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  expect(problems).toEqual([]);
  await context.close();
});
