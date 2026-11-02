import { expect, test } from "@playwright/test";

// Guest books a 14-seater to Cape Coast, verifies their phone by SMS code, pays the deposit with
// (stand-in) Paystack MoMo, lands on the confirmation page, and gets a receipt + calendar file.
// Uses local test numbers 020 000 0009 / 0008 (code 123456, see supabase/config.toml) — one per device project,
// because Supabase rightly rate-limits repeated codes to the same number.

// A random date 2–14 months ahead so repeated runs never compete for the same vans.
const tripDate = () => {
  const d = new Date(Date.now() + (60 + Math.floor(Math.random() * 360)) * 86_400_000);
  return d.toISOString().slice(0, 10);
};

test("book a van and pay the deposit", async ({ page, browser }, testInfo) => {
  const testPhone = testInfo.project.name === "phone" ? "020 000 0008" : "020 000 0009";
  await page.goto(`/book?trip=outstation&to=cape-coast&pax=12&date=${tripDate()}&time=06:00&from=East%20Legon`);

  // Live quote from the pricing engine
  await expect(page.getByText("Accra ⇄ Cape Coast (return)")).toBeVisible();
  await expect(page.locator("aside").getByText("Available", { exact: true })).toBeVisible();

  await page.fill("#bf-name", "Esi Owusu");
  await page.fill("#bf-phone", testPhone);
  const pay = page.locator("aside").getByRole("button", { name: /^Pay GH₵/ });
  await expect(pay).toBeEnabled();
  await pay.click();

  // Phone check by SMS code (a fresh test browser is never signed in)
  const code = page.getByRole("dialog").getByLabel("6-digit code");
  await expect(code).toBeVisible();
  await code.pressSequentially("123456", { delay: 40 });

  // Stand-in Paystack approves, sends the webhook and returns us here
  await page.waitForURL(/\/book\/confirmation/);
  await expect(page.getByRole("heading", { name: "You're booked!" })).toBeVisible();
  const ref = (await page.locator("p.font-mono").first().innerText()).trim();
  expect(ref).toMatch(/^ELS-[2-9A-HJ-NP-Z]{5}$/);
  await expect(page.locator("dl")).toContainText("Balance");

  const receipt = await page.request.get(`/api/bookings/${ref}/receipt`);
  expect(receipt.status()).toBe(200);
  expect(receipt.headers()["content-type"]).toBe("application/pdf");
  const calendar = await page.request.get(`/api/bookings/${ref}/calendar`);
  expect(await calendar.text()).toContain(`UID:${ref}@elsasu`);

  await page.goto("/account");
  await expect(page.getByText(ref).first()).toBeVisible();

  // Cancel (trip is months away → full refund under the policy)
  await page.goto(`/book/confirmation?ref=${ref}`);
  await page.getByRole("button", { name: "Cancel this booking" }).click();
  await expect(page.getByText(/Cancel now and get GH₵[\d,]+ back \(100%\)/)).toBeVisible();
  await page.getByRole("button", { name: "Yes, cancel" }).click();
  await expect(page.getByRole("heading", { name: "This booking was cancelled" })).toBeVisible();
  await expect(page.getByText(/refund of GH₵[\d,]+ is on its way|Refunded GH₵[\d,]+/i)).toBeVisible();

  // Nobody else can open it
  const stranger = await browser.newContext();
  const res = await stranger.request.get(`/api/bookings/${ref}/receipt`);
  expect(res.status()).toBe(404);
  await stranger.close();
});

test("a forged Paystack webhook is rejected", async ({ request }) => {
  const res = await request.post("/api/webhooks/paystack", {
    headers: { "x-paystack-signature": "forged" },
    data: { event: "charge.success", data: { reference: "ELS-FAKE1-0000", amount: 100 } },
  });
  expect(res.status()).toBe(401);
});
