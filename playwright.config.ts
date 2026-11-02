import { defineConfig, devices } from "@playwright/test";

// End-to-end tests run against a production build on :3100 that talks to a local Paystack stand-in (:4010).
// Needs local Supabase running (pnpm db:start). Run: pnpm test:e2e
const APP = "http://localhost:3100";

export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1, // tests share one local database and auth service; run them one at a time
  retries: 1, // local Docker auth can stall under load (code requests time out); one retry keeps the suite reliable
  reporter: [["list"]],
  use: { baseURL: APP, trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "phone", use: { ...devices["Pixel 7"] } },
  ],
  webServer: [
    { command: "node e2e/mock-paystack.mjs", port: 4010, reuseExistingServer: true },
    {
      command: "pnpm build && pnpm exec next start -p 3100",
      url: APP,
      timeout: 600_000,
      reuseExistingServer: true,
      env: {
        NEXT_PUBLIC_SITE_URL: APP,
        PAYSTACK_SECRET_KEY: "sk_test_e2e_mock",
        PAYSTACK_API_BASE: "http://localhost:4010",
      },
    },
  ],
});
