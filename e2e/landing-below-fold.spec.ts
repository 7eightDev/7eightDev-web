import { expect, test, type Page } from "@playwright/test";
import { BREAKPOINTS, DEVICE_PROFILES } from "../presentation/lib/breakpoints";
import { expectNoHorizontalOverflow } from "./helpers/layout";

const mdMinus = BREAKPOINTS.md - 1; // 767
const mdPlus = BREAKPOINTS.md + 1; // 769
const smMinus = BREAKPOINTS.sm - 1; // 639
const smPlus = BREAKPOINTS.sm + 1; // 641
const HEIGHT = 800;

async function gotoLanding(page: Page, width: number, height: number) {
  await page.setViewportSize({ width, height });
  await page.goto("/", { waitUntil: "commit" });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
    timeout: 15_000,
  });
}

const colCount = (page: Page, selector: string) =>
  page
    .locator(selector)
    .first()
    .evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ").length);

test.describe("landing below-the-fold", () => {
  test.describe.configure({ timeout: 90_000 });

  test("nav links hidden md:flex flip 767/769", async ({ page }) => {
    await gotoLanding(page, mdMinus, HEIGHT);
    const nav = page.locator("nav").first();
    await expect(nav).toBeHidden();

    await page.setViewportSize({ width: mdPlus, height: HEIGHT });
    await expect(nav).toBeVisible();
    await expect(nav).toHaveCSS("display", "flex");
  });

  test("hero terminal md:block flip 767/769", async ({ page }) => {
    await gotoLanding(page, mdMinus, HEIGHT);
    const terminal = page
      .locator('[class~="md:block"][class~="hidden"]')
      .first();
    await expect(terminal).toBeHidden();

    await page.setViewportSize({ width: mdPlus, height: HEIGHT });
    await expect(terminal).toBeVisible();
    await expect(terminal).toHaveCSS("display", "block");
  });

  test("dual grid md:grid-cols-2 flip 767/769", async ({ page }) => {
    await gotoLanding(page, mdMinus, HEIGHT);
    await expect
      .poll(() => colCount(page, '[class~="grid-cols-1"][class~="md:grid-cols-2"]'))
      .toBe(1);

    await page.setViewportSize({ width: mdPlus, height: HEIGHT });
    await expect
      .poll(() => colCount(page, '[class~="grid-cols-1"][class~="md:grid-cols-2"]'))
      .toBe(2);
  });

  test("metodo pillars md:grid-cols-3 flip 767/769", async ({ page }) => {
    await gotoLanding(page, mdMinus, HEIGHT);
    await expect
      .poll(() => colCount(page, '[class~="grid-cols-1"][class~="md:grid-cols-3"]'))
      .toBe(1);

    await page.setViewportSize({ width: mdPlus, height: HEIGHT });
    await expect
      .poll(() => colCount(page, '[class~="grid-cols-1"][class~="md:grid-cols-3"]'))
      .toBe(3);
  });

  test("stack/processo/footer sm:grid-cols-2 md:grid-cols-4 dual flip", async ({
    page,
  }) => {
    const gridSelector =
      '[class~="sm:grid-cols-2"][class~="md:grid-cols-4"]';

    await gotoLanding(page, smMinus, HEIGHT);
    await expect.poll(() => colCount(page, gridSelector)).toBe(1);

    await page.setViewportSize({ width: smPlus, height: HEIGHT });
    await expect.poll(() => colCount(page, gridSelector)).toBe(2);

    await page.setViewportSize({ width: mdPlus, height: HEIGHT });
    await expect.poll(() => colCount(page, gridSelector)).toBe(4);
  });

  test("metodo guarantees sm:grid-cols-2 md:grid-cols-3 dual flip", async ({
    page,
  }) => {
    const gridSelector =
      '[class~="sm:grid-cols-2"][class~="md:grid-cols-3"]';

    await gotoLanding(page, smMinus, HEIGHT);
    await expect.poll(() => colCount(page, gridSelector)).toBe(1);

    await page.setViewportSize({ width: smPlus, height: HEIGHT });
    await expect.poll(() => colCount(page, gridSelector)).toBe(2);

    await page.setViewportSize({ width: mdPlus, height: HEIGHT });
    await expect.poll(() => colCount(page, gridSelector)).toBe(3);
  });

  test("quote-modal max-w-[560px] aperto dal CTA hero", async ({ page }) => {
    await gotoLanding(page, DEVICE_PROFILES.desktop, HEIGHT);

    const cta = page
      .locator("[class~='hero-grid']")
      .locator("a", { hasText: /Richiedi un preventivo/ });
    await expect(async () => {
      await cta.click();
      const modal = page
        .locator('[class~="max-w-[560px]"]')
        .first();
      await expect(modal).toBeVisible();
    }).toPass({ timeout: 15_000 });

    const modal = page.locator('[class~="max-w-[560px]"]').first();
    await expect(modal).toHaveCSS("max-width", "560px");

    await page.getByRole("button", { name: "Chiudi" }).click();
    await expect(modal).toBeHidden();
  });

  test("main senza overflow ai 3 viewport canonici", async ({ page }) => {
    for (const width of [
      DEVICE_PROFILES.mobile,
      DEVICE_PROFILES.tablet,
      DEVICE_PROFILES.desktop,
    ]) {
      await gotoLanding(page, width, HEIGHT);
      await expectNoHorizontalOverflow(page, {
        label: `landing (viewport ${width})`,
      });
    }
  });

  // Regression pag. nav pubblica: il cluster destro (ThemeToggle + CTA
  // "Preventivo" + avatar UserMenu) tracimava su ~≤390px e a tablet 768,
  // producendo scrollbar orizzontale a livello documento e avatar tagliato
  // (bug segnalato su Xiaomi 14T). Il check scansiona il <header> (fratello
  // di <main>, quindi fuori dal coverage di expectNoHorizontalOverflow) per
  // OGNI elemento interattivo e verifica che il documento non scrolli.
  // 360 = minima viewport mobile supportata (browser Android ad alto DPR /
  //  Mi Browser); gli altri vengono dai DEVICE_PROFILES canonici.
  test("header senza overflow: scrollbar orizzontale e avatar dentro viewport", async ({
    page,
  }) => {
    for (const width of [360, DEVICE_PROFILES.mobile, DEVICE_PROFILES.tablet, DEVICE_PROFILES.desktop]) {
      await gotoLanding(page, width, HEIGHT);
      const header = page.locator("header").first();
      await expect(header).toBeVisible();

      const EPS = 0.5;
      const report = await header.evaluate((el, eps) => {
        const vw = document.documentElement.clientWidth;
        const offenders: string[] = [];
        const scan = (root: Element, toleranza: number) => {
          const rect = root.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0 && (rect.left < -toleranza || rect.right > vw + toleranza)) {
            offenders.push(`<${root.tagName.toLowerCase()}> left=${rect.left.toFixed(1)} right=${rect.right.toFixed(1)} vw=${vw}`);
          }
          root
            .querySelectorAll(
              "button, a, select, input, [role='button'], [role='checkbox'], [role='radio'], [role='switch'], [role='tab'], img"
            )
            .forEach((child) => {
              const b = child.getBoundingClientRect();
              if (b.width === 0 || b.height === 0) return;
              if (b.left < -toleranza || b.right > vw + toleranza) {
                offenders.push(`<${child.tagName.toLowerCase()}> left=${b.left.toFixed(1)} right=${b.right.toFixed(1)} vw=${vw}`);
              }
            });
        };
        scan(el, eps);
        return {
          docScrollW: document.documentElement.scrollWidth,
          docClientW: document.documentElement.clientWidth,
          offenderCount: offenders.length,
          offenders: offenders.slice(0, 6),
        };
      }, EPS);

      expect(report.docScrollW, `documento senza scrollbar orizzontale a ${width} (scrollW=${report.docScrollW} vs ${report.docClientW})`).toBeLessThanOrEqual(report.docClientW);
      expect(report.offenderCount, `nessun elemento del header tracima a ${width}`).toBe(0);
    }
  });
});
