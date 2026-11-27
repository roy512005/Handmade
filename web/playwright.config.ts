import { defineConfig, devices } from "@playwright/test";

const PORT = 3217;

/** Runs against a production build with its own throwaway database, so a running dev server is untouched. */
export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  timeout: 60_000,
  use: { ...devices["Desktop Chrome"], baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure" },
  webServer: {
    command: `rm -rf .e2e-data && npx next build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: false,
    timeout: 300_000,
    env: {
      NEXT_DIST_DIR: ".next-e2e",
      DATA_DIR: ".e2e-data/pg",
      UPLOAD_DIR: ".e2e-data",
      DEMO_MODE: "true",
      PAYMENT_WEBHOOK_SECRET: "e2e-only-secret-not-for-real-use-0000",
    },
  },
});
