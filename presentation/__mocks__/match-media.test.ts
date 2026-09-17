/**
 * Self-verification of the `matchMedia` mock (presentation/__mocks__).
 *
 * These tests lock the behaviour every MS-2.x responsive test will rely on:
 * default width = desktop (1280), `setViewport` flips `matches` *and* dispatches
 * `change` events only when the value actually flips, and `cleanupMatchMediaMock`
 * leaves no residue between tests.
 */
import { mqMax, mqMin } from "@/presentation/lib/breakpoints";
import {
  cleanupMatchMediaMock,
  getCurrentWidth,
  installMatchMediaMock,
  setViewport,
} from "./match-media";

describe("matchMedia mock", () => {
  beforeEach(() => {
    installMatchMediaMock();
  });

  afterEach(() => {
    cleanupMatchMediaMock();
  });

  it("is installed on window by the setup file", () => {
    expect(typeof window.matchMedia).toBe("function");
    expect(getCurrentWidth()).toBe(1280);
  });

  it("default (1280) matches desktop queries and excludes mobile-only ones", () => {
    expect(window.matchMedia(mqMin(1280)).matches).toBe(true);
    expect(window.matchMedia(mqMin(768)).matches).toBe(true);
    expect(window.matchMedia(mqMin(375)).matches).toBe(true);
    expect(window.matchMedia(mqMax(820)).matches).toBe(false);
  });

  it("setViewport(768) flips matches to tablet and dispatches one change event", () => {
    const desktop = window.matchMedia(mqMin(1280));
    const tablet = window.matchMedia(mqMin(768));
    const changeEvents: MediaQueryListEvent[] = [];
    const listener = (event: MediaQueryListEvent) => {
      changeEvents.push(event);
    };
    desktop.addEventListener("change", listener);
    tablet.addEventListener("change", listener);

    expect(desktop.matches).toBe(true);
    expect(tablet.matches).toBe(true);

    setViewport(768);

    // Tablet (768): min-width:1280 no longer matches, min-width:768 still does.
    expect(desktop.matches).toBe(false);
    expect(tablet.matches).toBe(true);
    // Only the desktop query actually flipped → exactly one change event.
    expect(changeEvents).toHaveLength(1);
    expect(changeEvents[0]).toMatchObject({
      type: "change",
      media: mqMin(1280),
      matches: false,
      oldMatches: true,
    });
    expect(getCurrentWidth()).toBe(768);
    expect(window.innerWidth).toBe(768);
  });

  it("setViewport(375) matches only mobile queries", () => {
    const min1280 = window.matchMedia(mqMin(1280));
    const min768 = window.matchMedia(mqMin(768));
    const max820 = window.matchMedia(mqMax(820));
    const max640 = window.matchMedia(mqMax(640));

    setViewport(375);

    expect(min1280.matches).toBe(false);
    expect(min768.matches).toBe(false);
    expect(max820.matches).toBe(true);
    expect(max640.matches).toBe(true);
  });

  it("does not dispatch change when matches does not flip", () => {
    const mql = window.matchMedia(mqMin(768));
    const listener = jest.fn();
    mql.addEventListener("change", listener);

    setViewport(768); // 1280 → 768, min-width:768 stays true → no event
    expect(listener).not.toHaveBeenCalled();

    setViewport(375); // 768 → 375, min-width:768 flips → exactly one event
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("supports addListener/removeListener and the onchange property", () => {
    const mql = window.matchMedia(mqMin(768));
    const legacy = jest.fn();
    const onchange = jest.fn();
    mql.addListener(legacy);
    mql.onchange = onchange;

    setViewport(375);
    expect(legacy).toHaveBeenCalledTimes(1);
    expect(onchange).toHaveBeenCalledTimes(1);

    mql.removeListener(legacy);
    mql.onchange = null;
    setViewport(1280); // flips back to matching
    expect(legacy).toHaveBeenCalledTimes(1);
    expect(onchange).toHaveBeenCalledTimes(1);
  });

  it("cleanupMatchMediaMock resets to the default without residues", () => {
    setViewport(375);
    expect(getCurrentWidth()).toBe(375);

    cleanupMatchMediaMock();

    expect(getCurrentWidth()).toBe(1280);
    expect(window.matchMedia(mqMin(1280)).matches).toBe(true);
    expect(window.matchMedia(mqMin(768)).matches).toBe(true);
    expect(window.innerWidth).toBe(1280);
  });
});