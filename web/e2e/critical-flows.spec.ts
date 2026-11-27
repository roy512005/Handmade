import { test, expect, type Page } from "@playwright/test";

// demo accounts: they exist only because the test server runs with DEMO_MODE=true
const BUYER = ["buyer@handmade.test", "Buyer@12345"];
const ADMIN = ["admin@handmade.test", "Admin@12345"];

async function signIn(page: Page, [email, password]: string[]) {
  await page.context().clearCookies();
  await page.goto("/login");
  await page.locator('input[name="email"]').first().fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL((u) => u.pathname !== "/login");
}

test("buyer checks out, then an admin cancels and refunds the order", async ({ page }) => {
  await signIn(page, BUYER);
  await page.goto("/search?q=Neem+Wood+Comb");
  await page.getByRole("link", { name: /Neem Wood Comb/ }).first().click();
  await page.getByRole("button", { name: "Add to bag" }).click();
  await page.goto("/checkout");
  await page.getByRole("button", { name: /Place order/ }).click();
  await page.waitForURL(/\/pay\/ORD-\d+/);
  const order = page.url().match(/ORD-\d+/)![0];
  await page.getByRole("button", { name: "Simulate successful payment" }).click();
  await page.waitForURL(new RegExp(`/account/orders/${order}`));
  await expect(page.getByText("Payment successful")).toBeVisible();

  await signIn(page, ADMIN);
  await page.goto(`/admin/orders/${order}`);
  await page.getByRole("button", { name: "Cancel & refund" }).click();
  await expect(page.getByText(/Refund ₹.*\(/)).toBeVisible();
});

test("a new seller applies and an admin approves them", async ({ page }) => {
  await page.goto("/sell");
  const fields: Record<string, string> = {
    name: "Test Artisan", brand: "Playwright Pottery", email: "e2e-seller@example.com", phone: "9876543210", password: "E2e-password-1",
    businessAddress: "12 Workshop Road, Jaipur", pickupLine1: "12 Workshop Road", pickupCity: "Jaipur", pickupState: "Rajasthan",
    pickupPin: "302001", pan: "ABCDE1234F", holder: "Test Artisan", account: "123456789012", ifsc: "HDFC0000123",
  };
  const form = page.locator("form").filter({ has: page.locator('[name="brand"]') });
  for (const [k, v] of Object.entries(fields)) await form.locator(`[name="${k}"]`).fill(v);
  await form.locator('[name="agree"]').check();
  await form.locator("button").last().click();
  await page.waitForURL(/\/seller/);
  // approval is blocked until the seller has uploaded a verification document
  await page.goto("/seller/profile");
  const upload = page.locator("form").filter({ has: page.locator("#file") });
  await upload.locator("#file").setInputFiles({ name: "pan.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 test document") });
  await upload.getByRole("button", { name: "Upload" }).click();
  await expect(page.getByText("Document uploaded securely.")).toBeVisible();

  await signIn(page, ADMIN);
  await page.goto("/admin/sellers?q=Playwright+Pottery");
  await page.getByRole("link", { name: "Review" }).click();
  await page.getByRole("button", { name: "Approve seller" }).click();
  await expect(page.getByRole("button", { name: "Suspend" })).toBeVisible();
});

test("forgot password gives the same reply for any email and rejects a bad link", async ({ page }) => {
  for (const email of [BUYER[0], "nobody@example.com"]) {
    await page.goto("/forgot-password");
    await page.locator('form input[name="email"]').first().fill(email);
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(page.getByText("If an account exists for that email")).toBeVisible();
  }
  await page.goto("/reset-password?token=not-a-real-token");
  await page.locator('input[name="password"]').fill("Another-pass-22");
  await page.getByRole("button", { name: "Save password" }).click();
  await expect(page.getByText("invalid or has expired")).toBeVisible();
});
