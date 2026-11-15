import { expect, test, type Page } from "@playwright/test";

/**
 * What a visitor would meet on a generated site: every sector, on a phone and a desktop, every page reachable from the
 * menu, every button and link pointing somewhere real, every image loaded, no errors in the console and no sideways
 * scrolling. The sites are made-up samples built by the real writer and renderer (see src/app/e2e-site/page.tsx).
 */
const SECTORS = ["barber", "beauty", "massage", "fitness", "physio", "cafe", "holiday-let", "electrician", "plumbing", "building", "cleaning"];
const LAYOUTS = ["showcase", "split", "essentials"];
const PHONE = { width: 390, height: 844 };
const DESKTOP = { width: 1280, height: 900 };

/** Collects everything that would show a visitor a broken page. */
function watch(page: Page) {
  const problems: string[] = [];
  page.on("console", (m) => m.type() === "error" && problems.push(`console: ${m.text()}`));
  page.on("pageerror", (e) => problems.push(`error: ${e.message}`));
  page.on("response", (r) => r.status() >= 400 && problems.push(`${r.status()} ${r.url()}`));
  page.on("requestfailed", (r) => problems.push(`failed: ${r.url()}`));
  return problems;
}

/** Scrolls the whole page so lazy images load, then checks each one drew. */
async function imagesLoaded(page: Page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 40));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForLoadState("networkidle");
  // Only images a visitor can see: a hidden image (such as our own footer's logo, which a customer's site hides) never loads.
  return page.evaluate(() =>
    [...document.querySelectorAll("img")].filter((i) => i.getClientRects().length > 0 && (!i.complete || i.naturalWidth === 0)).map((i) => i.src),
  );
}

const sideways = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

for (const sector of SECTORS) {
  for (const [name, size] of [["phone", PHONE], ["desktop", DESKTOP]] as const) {
    test(`${sector} on a ${name}: every page opens, nothing is broken`, async ({ browser }) => {
      const context = await browser.newContext({ viewport: size });
      const page = await context.newPage();
      const problems = watch(page);

      await page.goto(`/e2e-site?t=${sector}&n=7`);
      const pages = page.getByRole("navigation", { name: "Pages" }).getByRole("link");
      const hrefs = await pages.evaluateAll((links) => links.map((l) => l.getAttribute("href") ?? ""));
      // The building sample gives no prices, so its Prices page is rightly left out.
      const expected = sector === "building" ? 6 : 7;
      expect(hrefs.length, `a seven-page site shows ${expected} pages in its menu`).toBe(expected);

      for (const href of hrefs) {
        await page.goto(`/e2e-site${href}`);
        await expect(page.locator("h1"), `${href} has one main heading`).toHaveCount(1);
        expect(await sideways(page), `${href} scrolls sideways`).toBeLessThanOrEqual(1);
        expect(await imagesLoaded(page), `${href} has images that didn't load`).toEqual([]);
        // Every link on the page points somewhere real.
        const links = await page.locator("main a, a").evaluateAll((as) => as.map((a) => a.getAttribute("href") ?? ""));
        for (const link of links) {
          expect(link, "an empty link").not.toBe("");
          if (link.startsWith("tel:")) expect(link).toMatch(/^tel:\+?\d{9,15}$/);
          if (link.startsWith("mailto:")) expect(link).toMatch(/^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/);
        }
      }
      expect(problems, "errors seen while browsing").toEqual([]);
      await context.close();
    });
  }
}

for (const sector of SECTORS) {
  for (const layout of LAYOUTS) {
    test(`${sector}, ${layout} layout, on a phone: loads cleanly with its first section in view`, async ({ browser }) => {
      const context = await browser.newContext({ viewport: PHONE });
      const page = await context.newPage();
      const problems = watch(page);
      await page.goto(`/e2e-site?t=${sector}&n=1&l=${layout}`);
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator("h1")).toBeInViewport();
      expect(await sideways(page)).toBeLessThanOrEqual(1);
      expect(await imagesLoaded(page)).toEqual([]);
      expect(problems).toEqual([]);
      await context.close();
    });
  }
}

test("a site with no photos still has a finished top of page", async ({ page }) => {
  const problems = watch(page);
  await page.goto("/e2e-site?t=plumbing&n=1&nophoto=1");
  await expect(page.locator("h1")).toBeVisible();
  expect(problems).toEqual([]);
});

test("the booking buttons lead to the request form, and the form is labelled", async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await page.goto("/e2e-site?t=barber&n=7");
  // From Home on a seven-page site, the main button goes to the Contact page's form.
  await page.getByRole("link", { name: /request a booking/i }).first().click();
  await expect(page).toHaveURL(/page=contact.*#book|#book/);
  const form = page.locator("#book form");
  await expect(form).toBeVisible();
  for (const label of ["Name", "Phone or email"]) await expect(form.getByLabel(label)).toBeVisible();
  // The page the form is on travels with the request, so the visitor comes back to it.
  await expect(form.locator('input[name="page"]')).toHaveValue("contact");
});

test("a phone shows the call and book bar; a desktop does not", async ({ browser }) => {
  const phone = await browser.newContext({ viewport: PHONE });
  const p = await phone.newPage();
  await p.goto("/e2e-site?t=electrician&n=1");
  await expect(p.getByRole("link", { name: "Phone us" })).toBeInViewport();
  await phone.close();
  const desktop = await browser.newContext({ viewport: DESKTOP });
  const d = await desktop.newPage();
  await d.goto("/e2e-site?t=electrician&n=1");
  await expect(d.getByRole("link", { name: "Phone us" })).toBeHidden();
  await desktop.close();
});

test("every image has a description and every control has a name", async ({ page }) => {
  await page.goto("/e2e-site?t=cafe&n=7");
  const bad = await page.evaluate(() => [
    ...[...document.querySelectorAll("img")].filter((i) => !i.hasAttribute("alt")).map((i) => `img ${i.src}`),
    ...[...document.querySelectorAll("a, button")].filter((e) => !(e.textContent ?? "").trim() && !e.getAttribute("aria-label")).map((e) => e.outerHTML.slice(0, 80)),
  ]);
  expect(bad).toEqual([]);
});
