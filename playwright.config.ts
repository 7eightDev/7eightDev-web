import { defineConfig, devices } from "@playwright/test";
import { DEVICE_PROFILES } from "./presentation/lib/breakpoints";

const BASE_URL = "http://localhost:3000";

/**
 * Auth bridge (MS-3.2): the `auth-setup` project captures the live Clerk admin
 * session (from the `.e2e/ghost-scroll-profile` persistent profile) into this
 * storageState file, then every responsive project replays it via `use`.
 * Local-only artifact (`.e2e/` is gitignored) with live session cookies.
 */
const AUTH_STORAGE_STATE = ".e2e/storage-state/fullAdmin.json";

const DESKTOP_HEIGHT = 800;
const TABLET_HEIGHT = 1024;
const MOBILE_SAFARI_HEIGHT = 667;
const MOBILE_CHROME_HEIGHT = 812;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [["html", { open: "never" }], ["list"]]
    : "list",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      // One-time per run: lifts the Clerk session present in the persistent
      // profile (created via `scripts/ghost-scroll-audit.mjs --login`) into
      // `AUTH_STORAGE_STATE`. Every project below depends on it, so it runs
      // first and its failure (no session) skips the protected tests.
      name: "auth-setup",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: `Desktop ${DEVICE_PROFILES.desktop}x${DESKTOP_HEIGHT}`,
      dependencies: ["auth-setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: AUTH_STORAGE_STATE,
        viewport: {
          width: DEVICE_PROFILES.desktop,
          height: DESKTOP_HEIGHT,
        },
        deviceScaleFactor: 1,
        isMobile: false,
        hasTouch: false,
      },
    },
    {
      // Tablet < lg (1024) → hamburger nav; < cardStack (820) → card grid.
      name: `Tablet ${DEVICE_PROFILES.tablet}x${TABLET_HEIGHT}`,
      dependencies: ["auth-setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: AUTH_STORAGE_STATE,
        viewport: {
          width: DEVICE_PROFILES.tablet,
          height: TABLET_HEIGHT,
        },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: `Mobile Safari ${DEVICE_PROFILES.mobile}x${MOBILE_SAFARI_HEIGHT}`,
      dependencies: ["auth-setup"],
      use: {
        ...devices["iPhone 8"],
        storageState: AUTH_STORAGE_STATE,
        viewport: {
          width: DEVICE_PROFILES.mobile,
          height: MOBILE_SAFARI_HEIGHT,
        },
      },
    },
    {
      name: `Mobile Chrome ${DEVICE_PROFILES.mobile}x${MOBILE_CHROME_HEIGHT}`,
      dependencies: ["auth-setup"],
      use: {
        ...devices["Pixel 5"],
        storageState: AUTH_STORAGE_STATE,
        viewport: {
          width: DEVICE_PROFILES.mobile,
          height: MOBILE_CHROME_HEIGHT,
        },
      },
    },
  ],
});