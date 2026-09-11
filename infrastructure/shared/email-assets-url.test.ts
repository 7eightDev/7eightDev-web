import { DEFAULT_PUBLIC_ORIGIN, emailAssetsBaseUrl } from "./email-assets-url";

const REAL_ORIGIN = process.env.EMAIL_APP_BASE_URL;

afterEach(() => {
  if (REAL_ORIGIN === undefined) delete process.env.EMAIL_APP_BASE_URL;
  else process.env.EMAIL_APP_BASE_URL = REAL_ORIGIN;
});

describe("emailAssetsBaseUrl", () => {
  it("falls back to the public origin for loopback app origins", () => {
    delete process.env.EMAIL_APP_BASE_URL;
    expect(emailAssetsBaseUrl("http://localhost:3000")).toBe(
      DEFAULT_PUBLIC_ORIGIN
    );
    expect(emailAssetsBaseUrl("http://127.0.0.1:3000")).toBe(
      DEFAULT_PUBLIC_ORIGIN
    );
  });

  it("keeps a public origin unchanged", () => {
    delete process.env.EMAIL_APP_BASE_URL;
    expect(emailAssetsBaseUrl("https://7eightdev.com/")).toBe(
      "https://7eightdev.com"
    );
  });

  it("lets EMAIL_APP_BASE_URL override any app origin", () => {
    process.env.EMAIL_APP_BASE_URL = "https://7eightdev-web.vercel.app";
    expect(emailAssetsBaseUrl("http://localhost:3000")).toBe(
      "https://7eightdev-web.vercel.app"
    );
  });
});