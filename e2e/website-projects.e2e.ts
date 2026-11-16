import { expect, test } from "@playwright/test";

/**
 * Own your website: choose a tier, then hosting, then Continue carries both into the proposal form. Choosing a hosting
 * card must select it (as the tier cards do), not leave the page with the tier forgotten.
 */
test("choosing a tier leads to hosting, and Continue carries both choices", async ({ page }) => {
  await page.goto("/website-projects");
  await page.getByRole("button", { name: "Choose Essential" }).click();

  const bar = page.getByRole("region", { name: "Your choice" });
  await expect(bar).toContainText("Essential");
  await expect(bar).toContainText("choose hosting below to continue");
  await expect(bar.getByRole("link", { name: "Choose hosting" })).toBeVisible();
  // The first choice scrolls on to the hosting step.
  await expect(page.locator("#care")).toBeInViewport({ timeout: 5000 });

  const hosting = page.getByRole("button", { name: "Choose Hosting" });
  await hosting.click();
  await expect(page).toHaveURL(/\/website-projects/);
  await expect(page.getByRole("button", { name: "Hosting selected" })).toHaveAttribute("aria-pressed", "true");
  await expect(bar).toContainText("Hosting £49/month");

  const next = bar.getByRole("link", { name: "Continue" });
  await expect(next).toHaveAttribute("href", /\/build\/project\?pages=[^&]+&care=hosting/);
  await next.click();
  await expect(page).toHaveURL(/\/build\/project\?pages=[^&]+&care=hosting/);
});

test("hosting it yourself is a choice too", async ({ page }) => {
  await page.goto("/website-projects");
  await page.getByRole("button", { name: "Choose Professional" }).click();
  await page.getByRole("button", { name: "Host it myself", exact: true }).click();
  await expect(page.getByRole("button", { name: "Hosting it myself", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("region", { name: "Your choice" }).getByRole("link", { name: "Continue" })).toHaveAttribute("href", /care=none/);
});
