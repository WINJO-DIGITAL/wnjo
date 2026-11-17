import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

/**
 * A customer's live website on its own address: served by the proxy and the public page, with none of our own header,
 * footer or styles, real addresses for every page, the tags search engines read, and a sitemap. The made-up sites live
 * at addresses like barber-p7.e2e.test (sector, number of pages, layout); see src/lib/site-template/e2e-sample.ts.
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
  const res = await page.goto(at("barber-p7"));
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
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", at("barber-p7", "/"));
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
  await page.goto(at("barber-p7"));
  const hrefs = await page.getByRole("navigation", { name: "Pages" }).getByRole("link").evaluateAll((links) => links.map((l) => l.getAttribute("href") ?? ""));
  expect(hrefs).toEqual(["/", "/services", "/prices", "/about", "/gallery", "/faq", "/contact"]);
  const titles = new Set<string>();
  for (const href of hrefs) {
    const res = await page.goto(at("barber-p7", href));
    expect(res?.status(), href).toBe(200);
    await expect(page.locator("h1"), href).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", at("barber-p7", href));
    titles.add(await page.title());
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  }
  expect(titles.size, "each page has its own title").toBe(hrefs.length);
  expect(problems).toEqual([]);
});

test("the sitemap and robots file name every page at the site's own address", async ({ request }) => {
  const sitemap = await get(request, "barber-p7", "/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  const xml = await sitemap.text();
  for (const path of ["/", "/services", "/prices", "/about", "/gallery", "/faq", "/contact"]) expect(xml).toContain(`<loc>${at("barber-p7", path)}</loc>`);
  const robots = await get(request, "barber-p7", "/robots.txt");
  expect(robots.status()).toBe(200);
  const text = await robots.text();
  expect(text).toContain(`Sitemap: ${at("barber-p7", "/sitemap.xml")}`);
  expect(text).not.toMatch(/Disallow: \/\s*$/m);
});

test("an address with no live site, a page that doesn't exist, and our own route typed on our address are all 404s", async ({ request, page }) => {
  expect((await get(request, "unknown-site")).status()).toBe(404);
  expect((await get(request, "barber-p7", "/nope")).status()).toBe(404);
  expect((await get(request, "barber-p7", "/services/extra")).status()).toBe(404);
  expect((await get(request, "barber-p7", "/photo?f=drafts%2Fx%2Fa.jpg&w=900")).status(), "a file that isn't this site's own").toBe(404);
  // The internal route is not for visitors: on our own address it is a 404 even for a real customer address.
  const direct = await page.goto("/sites/barber-p7.e2e.test");
  expect(direct?.status()).toBe(404);
  expect((await request.get(`http://localhost:${PORT}/sites/barber-p7.e2e.test/sitemap.xml`)).status()).toBe(404);
});

test("our own site is unaffected by the proxy", async ({ request }) => {
  const res = await request.get(`http://localhost:${PORT}/pricing`);
  expect(res.status()).toBe(200);
  expect(await res.text()).toContain("WINJO");
});

test("the request form posts from the live address and stays there, on the page it was on", async ({ page }) => {
  test.skip(Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY), "needs to run without a database, so the outcome is predictable");
  await page.goto(at("barber-p7", "/contact"));
  const form = page.locator("#book form");
  await expect(form.locator('input[name="token"]')).toHaveCount(0);
  await form.getByLabel("Service").selectOption("Cut & style");
  await form.getByRole("button", { name: "Next" }).click();
  await form.getByLabel("Name").fill("Sam");
  await form.getByLabel("Phone or email").fill("07700 900123");
  await form.getByRole("button", { name: "Send request" }).click();
  // With no database to save to, the request can't be sent: the visitor is told so, on the same address and page.
  await expect(page).toHaveURL(at("barber-p7", "/contact?sent=0#book"));
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

/** The look of a site is its type as much as its colour. Each look uses its own typeface, served from our own address. */
const LOOKS: { look: string; heading: RegExp; body: RegExp; capitals: boolean }[] = [
  { look: "classic", heading: /Playfair/i, body: /Inter/i, capitals: false },
  { look: "warm", heading: /Nunito/i, body: /Nunito/i, capitals: false },
  { look: "bold", heading: /Barlow/i, body: /Inter/i, capitals: true },
  { look: "minimal", heading: /Inter/i, body: /Inter/i, capitals: false },
];

for (const { look, heading, body, capitals } of LOOKS) {
  test(`the ${look} look sets its headings and text in its own typeface, loaded from our own address`, async ({ page }) => {
    const external: string[] = [];
    const fonts: string[] = [];
    page.on("request", (r) => {
      const url = new URL(r.url());
      // The map embed is the one Google request a customer site makes. Fonts stay on our own address.
      const map = url.hostname === "maps.google.com" || /(^|\.)maps\.(googleapis|gstatic)\.com$/.test(url.hostname);
      if (/(^|\.)(googleapis|gstatic)\.com$/.test(url.hostname) && !map) external.push(r.url());
      if (/\.woff2?$/.test(url.pathname)) fonts.push(`${url.hostname}${url.pathname}`);
    });
    await page.goto(at(`barber-p1-showcase-${look}`));
    await page.evaluate(() => document.fonts.ready);
    const style = await page.locator("h1").evaluate((h) => ({ family: getComputedStyle(h).fontFamily, transform: getComputedStyle(h).textTransform, bodyFamily: getComputedStyle(document.querySelector("p")!).fontFamily }));
    expect(style.family).toMatch(heading);
    expect(style.bodyFamily).toMatch(body);
    expect(style.transform).toBe(capitals ? "uppercase" : "none");
    // The font file was really fetched, from this site, and the face reports loaded.
    const loaded = await page.evaluate(() => [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family));
    expect(loaded.some((f) => heading.test(f)), `loaded faces: ${loaded.join(", ")}`).toBe(true);
    expect(fonts.length).toBeGreaterThan(0);
    expect(fonts.every((f) => f.startsWith("barber-p1-showcase-" + look + ".e2e.test"))).toBe(true);
    expect(external, "nothing is fetched from Google").toEqual([]);
  });
}

/** Words on a colour must be readable. With no photo, the top of the page is the theme colour in every layout. */
const luminance = ([r, g, b]: number[]) => {
  const [lr, lg, lb] = [r, g, b].map((v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
};
const rgbOf = (css: string) => (css.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);

for (const layout of ["showcase", "split", "essentials"]) {
  for (const look of ["classic", "warm", "bold", "minimal"]) {
    test(`with no photo, the ${layout} layout in the ${look} look keeps its top-of-page text readable`, async ({ page }) => {
      await page.goto(at(`plumbing-p1-${layout}-${look}-nophoto`));
      const colours = await page.locator("section[data-variant]").first().evaluate((section) => {
        const bg = getComputedStyle(section).backgroundColor;
        return ["h1", "p"].map((tag) => ({ tag, fg: getComputedStyle(section.querySelector(tag)!).color, bg }));
      });
      for (const { tag, fg, bg } of colours) {
        const [a, b] = [luminance(rgbOf(fg)), luminance(rgbOf(bg))];
        const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
        expect(ratio, `${tag}: ${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
      }
    });
  }
}

test("a live site with photos shows its main photo at the top", async ({ page }) => {
  await page.goto(at("plumbing-p1-showcase"));
  const hero = page.locator("section[data-variant='photo'] img").first();
  await expect(hero).toBeVisible();
  expect(await hero.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
});

/** The inner pages of a live site: each is more than its title. */
test("the About page puts a photo beside the text, and doesn't repeat its title", async ({ page }) => {
  await page.goto(at("massage-p6", "/about"));
  await expect(page.locator("h1")).toHaveCount(1);
  const img = page.locator("section#about img");
  await expect(img).toBeVisible();
  expect(await img.evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(0);
  // Beside, not below, on a wide screen.
  const [text, photo] = await Promise.all([page.locator("section#about > div").boundingBox(), img.boundingBox()]);
  expect(photo!.x).toBeGreaterThan(text!.x + text!.width - 1);
  await expect(page.locator("section#about h2")).toHaveCount(0);
  await expect(page.locator("section#about")).toHaveAttribute("aria-label", /.+/);
});

test("the About page has no photo when the customer gave none to spare", async ({ page }) => {
  await page.goto(at("massage-p6-showcase-nophoto", "/about"));
  await expect(page.locator("section#about")).toBeVisible();
  await expect(page.locator("section#about img")).toHaveCount(0);
});

test("the Gallery page is a wall of photos that keep their own shapes", async ({ page }) => {
  await page.goto(at("massage-p6", "/gallery"));
  const figures = page.locator("figure");
  expect(await figures.count()).toBeGreaterThanOrEqual(2);
  for (const img of await page.locator("figure img").all()) {
    await img.scrollIntoViewIfNeeded();
    await expect.poll(() => img.evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(0);
    // Shown at its own proportions, not cropped to a fixed shape.
    const [natural, shown] = await img.evaluate((i: HTMLImageElement) => [i.naturalWidth / i.naturalHeight, i.getBoundingClientRect().width / i.getBoundingClientRect().height]);
    expect(Math.abs(natural - shown)).toBeLessThan(0.05);
  }
});

test("the FAQs page tells people where to go if their question isn't there", async ({ page }) => {
  await page.goto(at("electrician-p7", "/faq"));
  const more = page.getByText("Can't see your answer?");
  await expect(more).toBeVisible();
  await expect(page.locator('p:has-text("Can\'t see your answer?") a[href^="tel:"]')).toHaveAttribute("href", "tel:01134960789");
  await page.locator('p:has-text("Can\'t see your answer?") a:has-text("send a request")').click();
  await expect(page).toHaveURL(/\/contact#book$/);
  await expect(page.locator("#book form")).toBeVisible();
});

test("every inner page of a live site has one main heading and no repeated title", async ({ page }) => {
  for (const path of ["/services", "/about", "/gallery", "/faq"]) {
    await page.goto(at("plumbing-p6", path));
    await expect(page.locator("h1"), path).toHaveCount(1);
    const sectionHeadings = await page.locator("main h2, section h2:not(section[class*='closing'] h2)").count();
    expect(sectionHeadings, path).toBe(0);
  }
});
