import { test, expect } from "@playwright/test";

/**
 * Smoke test: an unauthenticated visitor is routed to the local sign-in screen,
 * and can authenticate with the bootstrap admin account.
 */
test("redirects to login and signs in with admin", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Local sign in")).toBeVisible();

  await page.getByLabel("Username").fill(process.env.ADMIN_USERNAME ?? "admin");
  await page.getByLabel("Password").fill(process.env.ADMIN_PASSWORD ?? "change-me-admin");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByText("Command Center")).toBeVisible({ timeout: 15_000 });
});

test("global search box is present after login", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Username").fill(process.env.ADMIN_USERNAME ?? "admin");
  await page.getByLabel("Password").fill(process.env.ADMIN_PASSWORD ?? "change-me-admin");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByPlaceholder(/Search everything/)).toBeVisible({ timeout: 15_000 });
});
