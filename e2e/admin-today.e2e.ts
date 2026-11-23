import { expect, test } from "@playwright/test";

/**
 * The staff home and customer list, opened with made-up records at /e2e-admin (only there when the server starts with
 * E2E=1). They check what the owner asked for: websites to make and messages first, the renewal date on every customer
 * that has one, and a short menu.
 */
test("Today leads with the websites to make and the messages to answer", async ({ page }) => {
  await page.goto("/e2e-admin");
  const sites = page.locator("section", { has: page.getByRole("heading", { name: "Websites to make" }) });
  const messages = page.locator("section", { has: page.getByRole("heading", { name: "Messages to answer" }) });
  await expect(sites).toBeVisible();
  await expect(messages).toBeVisible();

  // Changes first, then ready to build, each tagged monthly or bespoke, linking straight to the website.
  const rows = sites.locator("li a");
  await expect(rows.first()).toContainText("Hill Joinery");
  await expect(rows.first()).toContainText("Monthly · Changes to make");
  // Four websites are shown, the rest sit behind "All 6 websites".
  await expect(rows).toHaveCount(4);
  await expect(sites.getByRole("link", { name: "All 6 websites" })).toBeVisible();
  await expect(rows.first()).toHaveAttribute("href", /^#builds\/[0-9a-f-]{36}$/);
  await expect(sites.getByText(/Due \d{1,2} \w{3}/).first()).toBeVisible();

  // Messages: newest first, a customer's message told apart from a new enquiry, answered ones left out.
  await expect(messages.locator("li a").first()).toContainText("Mia Chen");
  await expect(messages.getByText("Website enquiry")).toBeVisible();
  await expect(messages.getByText("Tom Hill")).toHaveCount(0);

  // The business figures are one quiet line, not four big tiles.
  await expect(page.locator(".today__summary")).toContainText("a month");
  await expect(page.locator(".figures")).toHaveCount(0);
});

test("the customer list shows when each plan renews, and what is wrong with one that isn't fine", async ({ page }) => {
  await page.goto("/e2e-admin?view=customers");
  await expect(page.getByRole("columnheader", { name: "Renews" })).toBeVisible();
  const row = (name: string) => page.locator("tr", { has: page.getByRole("link", { name }) });
  await expect(row("Patel Plumbing")).toContainText("Overdue, due");
  await expect(row("Hill Joinery").first()).toContainText("Ends");
  await expect(row("Chen Dental")).toContainText(/\d{1,2} \w{3} \d{4}/);

  await page.selectOption("#cust-sort", "renewal");
  const first = page.locator("tbody tr").first();
  await expect(first).toContainText("Patel Plumbing");
});

test("the staff menu is four places and a More menu", async ({ page }) => {
  await page.goto("/e2e-admin");
  const items = page.locator(".dash-nav > *");
  await expect(items).toHaveText(["Today", "Websites", "Inbox", "Customers", "More"]);
  await page.locator(".dash-nav button", { hasText: "More" }).click();
  await expect(page.locator(".dash-menu__label")).toHaveText(["Subscriptions", "Quotes", "Orders", "Projects", "Approvals"]);
});

test("nothing scrolls sideways on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const view of ["today", "customers"]) {
    await page.goto(`/e2e-admin?view=${view}`);
    await expect(page.locator(".admin")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
  }
});
