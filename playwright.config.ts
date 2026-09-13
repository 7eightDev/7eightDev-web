import { defineConfig, devices } from "@playwright/test";
import { DEVICE_PROFILES } from "./presentation/lib/breakpoints";

const BASE_URL = "http://localhost:3000";

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
      name: `Desktop ${DEVICE_PROFILES.desktop}x${DESKTOP_HEIGHT}`,
      use: {
        ...devices["Desktop Chrome"],
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
      use: {
        ...devices["Desktop Chrome"],
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
      use: {
        ...devices["iPhone 8"],
        viewport: {
          width: DEVICE_PROFILES.mobile,
          height: MOBILE_SAFARI_HEIGHT,
        },
      },
    },
    {
      name: `Mobile Chrome ${DEVICE_PROFILES.mobile}x${MOBILE_CHROME_HEIGHT}`,
      use: {
        ...devices["Pixel 5"],
        viewport: {
          width: DEVICE_PROFILES.mobile,
          height: MOBILE_CHROME_HEIGHT,
        },
      },
    },
  ],
});