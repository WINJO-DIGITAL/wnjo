import { expect, test, type Page } from "@playwright/test";

/**
 * The details form (after a customer pays) saves their answers as they go. These tests open it with a stand-in server
 * (/e2e-wizard, only there when the server starts with E2E=1) and check the ways answers used to be lost: typing and
 * then leaving or backgrounding the page, switching tab, slow or failed saves, and a failed load that opened the form
 * blank and then saved over what was stored. The stand-in runs the same cleaner as the real route.
 */
const KEY = "e2e-wizard-progress";
const stored = (page: Page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? "null"), KEY);
const services = (page: Page) => page.locator('textarea[id$="-services"]');

async function toOfferStep(page: Page, query = "") {
  await page.goto(`/e2e-wizard${query}`);
  await page.fill("#wiz-biz", "Autism Initiatives");
  await page.locator('label:has-text("Grooming")').first().click();
  await page.click('button:has-text("Next")');
  await expect(page.locator(".wiz__step")).toContainText("What you offer");
  await expect(page.locator(".wiz__saved")).toHaveText("Saved");
}

test("backgrounding the page saves what was just typed", async ({ page }) => {
  await toOfferStep(page);
  await services(page).fill("Typed, then the app goes to the background");
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  // At once: the old timer waited 800ms, which a hidden phone page never gets to run.
  await expect.poll(async () => (await stored(page))?.brief?.site?.answers?.servicesText, { timeout: 250 }).toBe("Typed, then the app goes to the background");
});

test("typing and then reloading straight away keeps the answer", async ({ page }) => {
  await toOfferStep(page);
  await services(page).fill("Typed, then the page is reloaded at once");
  await page.reload();
  await expect(services(page)).toHaveValue("Typed, then the page is reloaded at once");
});

test("a step change is saved at once", async ({ page }) => {
  await page.goto("/e2e-wizard");
  await page.fill("#wiz-biz", "Autism Initiatives");
  await page.locator('label:has-text("Grooming")').first().click();
  await page.click('button:has-text("Next")');
  await expect.poll(async () => (await stored(page))?.step, { timeout: 400 }).toBe("offer");
});

test("switching to another tab of the account page saves, and shows the answers again", async ({ page }) => {
  await toOfferStep(page);
  await services(page).fill("Typed, then the tab is switched");
  await page.click("#harness-toggle");
  await expect.poll(async () => (await stored(page))?.brief?.site?.answers?.servicesText).toBe("Typed, then the tab is switched");
  await page.click("#harness-toggle");
  await expect(services(page)).toHaveValue("Typed, then the tab is switched");
});

test("slow saves never overlap, and the newest answer is the one kept", async ({ page }) => {
  // Each pause is long enough to start a save, and each save takes longer than the pause.
  await toOfferStep(page, "?latency=1800");
  for (const text of ["one", "one two", "one two three", "one two three four"]) {
    await services(page).fill(text);
    await page.waitForTimeout(1000);
  }
  await expect.poll(async () => (await stored(page))?.brief?.site?.answers?.servicesText, { timeout: 15_000 }).toBe("one two three four");
  await expect(page.locator(".wiz__saved")).toHaveText("Saved", { timeout: 15_000 });
  expect(await page.evaluate(() => (window as unknown as { __maxActive?: number }).__maxActive)).toBe(1);
});

test("a refused save is tried again by itself", async ({ page }) => {
  await page.goto("/e2e-wizard?failsaves=1");
  await page.fill("#wiz-biz", "Autism Initiatives");
  await expect(page.locator(".wiz__saved")).toContainText("Couldn't save just now");
  await expect(page.locator(".wiz__saved")).toHaveText("Saved", { timeout: 8000 });
  expect((await stored(page))?.businessName).toBe("Autism Initiatives");
});

test("a failed load keeps the form closed and never saves over the stored answers", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "e2e-wizard-progress",
      JSON.stringify({ name: "Kept Name", businessName: "Kept Business", step: "offer", draftId: null, brief: { goals: [], goalNote: "KEEP ME", pages: ["Home"], style: null, references: [], colours: "", avoid: "", functionality: "", files: [], site: { sector: "barber", answers: { servicesText: "Seeded services", about: "Seeded about" } }, otherBusinessType: "", profile: {}, extras: {} } }),
    );
  });
  await page.goto("/e2e-wizard?failload=3");
  await expect(page.locator("p.field-error").first()).toContainText("couldn't open your saved answers");
  await expect(page.locator(".wiz")).toHaveCount(0);
  const kept = await stored(page);
  expect(kept?.brief?.goalNote).toBe("KEEP ME");
  expect(kept?.name).toBe("Kept Name");
  await page.click('button:has-text("Try again")');
  await expect(services(page)).toHaveValue("Seeded services");
});
