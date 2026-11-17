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
  // The request opens in two steps: what they need first, then who they are.
  await expect(form.getByLabel("Service")).toBeVisible();
  await form.getByLabel("Service").selectOption({ index: 1 });
  await form.getByRole("button", { name: "Next" }).click();
  for (const label of ["Name", "Phone or email"]) await expect(form.getByLabel(label)).toBeVisible();
  // The page the form is on travels with the request, so the visitor comes back to it.
  await expect(form.locator('input[name="page"]')).toHaveValue("contact");
});

test("a phone shows the call and book bar; a desktop does not", async ({ browser }) => {
  const phone = await browser.newContext({ viewport: PHONE });
  const p = await phone.newPage();
  await p.goto("/e2e-site?t=electrician&n=1");
  await expect(p.locator("#main").getByRole("link", { name: "Call us" })).toBeInViewport();
  await phone.close();
  const desktop = await browser.newContext({ viewport: DESKTOP });
  const d = await desktop.newPage();
  await d.goto("/e2e-site?t=electrician&n=1");
  await expect(d.locator("#main").getByRole("link", { name: "Call us" })).toBeHidden();
  await expect(d.locator("#main").getByRole("link", { name: "Call", exact: true })).toBeVisible();
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

test("the request form checks each step, keeps what was typed, and shows every field without JavaScript", async ({ browser }) => {
  const live = await browser.newContext({ viewport: DESKTOP });
  const page = await live.newPage();
  await page.goto("/e2e-site?t=barber");
  const form = page.locator("#book form");
  await expect(form.getByText("Step 1 of 2")).toBeVisible();
  await expect(form.getByLabel("Name")).toBeHidden();
  // Next does nothing until the service is chosen.
  await form.getByRole("button", { name: "Next" }).click();
  await expect(form.getByLabel("Service")).toBeVisible();
  await form.getByLabel("Service").selectOption({ index: 1 });
  const chosen = await form.getByLabel("Service").inputValue();
  await form.getByRole("button", { name: "Next" }).click();
  await expect(form.getByText("Step 2 of 2")).toBeVisible();
  await expect(form.getByLabel("Name")).toBeFocused();
  await form.getByRole("button", { name: "Back" }).click();
  await expect(form.getByLabel("Service")).toHaveValue(chosen);
  await live.close();

  const plain = await browser.newContext({ viewport: DESKTOP, javaScriptEnabled: false });
  const bare = await plain.newPage();
  await bare.goto("/e2e-site?t=barber");
  for (const label of ["Service", "Name", "Phone or email"]) await expect(bare.locator("#book form").getByLabel(label)).toBeVisible();
  await expect(bare.locator("#book form").getByRole("button", { name: /send request/i })).toBeVisible();
  await plain.close();
});

test("a customer's site eases its sections in on scroll, and shows everything under reduced motion or without JavaScript", async ({ browser }) => {
  const count = async (opts: Parameters<typeof browser.newContext>[0]) => {
    const ctx = await browser.newContext({ viewport: DESKTOP, ...opts });
    const page = await ctx.newPage();
    await page.goto("/e2e-site?t=barber");
    const marked = await page.locator("[data-reveal]").count();
    await ctx.close();
    return marked;
  };
  expect(await count({})).toBeGreaterThan(0);
  expect(await count({ reducedMotion: "reduce" })).toBe(0);
  expect(await count({ javaScriptEnabled: false })).toBe(0);
});

test("hero footage plays with a pause button, and stays a still under reduced motion", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: DESKTOP });
  const page = await ctx.newPage();
  await page.goto("/e2e-site?t=fitness&video=1");
  const video = page.locator("video");
  await expect(video).toHaveCount(1);
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => !v.paused)).toBe(true);
  await page.getByRole("button", { name: /pause background video/i }).click();
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
  await expect(page.getByRole("button", { name: /play background video/i })).toBeVisible();
  await ctx.close();

  const still = await browser.newContext({ viewport: DESKTOP, reducedMotion: "reduce" });
  const calm = await still.newPage();
  await calm.goto("/e2e-site?t=fitness&video=1");
  await expect(calm.locator("video")).toBeHidden();
  await expect(calm.getByRole("button", { name: /background video/i })).toBeHidden();
  await still.close();
});
