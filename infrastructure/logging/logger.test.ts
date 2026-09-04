import { createLogger } from "@/infrastructure/logging/logger";

describe("createLogger", () => {
  let logSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("logs info messages to console.log", () => {
    const logger = createLogger("test");
    logger.info("hello");
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy.mock.calls[0][0]).toContain("[test] hello");
  });

  it("logs warn messages to console.warn", () => {
    const logger = createLogger("test");
    logger.warn("warning");
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toContain("[test] warning");
  });

  it("logs error messages to console.error", () => {
    const logger = createLogger("test");
    logger.error("failure");
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy.mock.calls[0][0]).toContain("[test] failure");
  });

  it("includes structured data as JSON", () => {
    const logger = createLogger("test");
    logger.info("action", { userId: "123", count: 5 });
    expect(logSpy).toHaveBeenCalledTimes(1);
    const msg = logSpy.mock.calls[0][0];
    expect(msg).toContain('"userId":"123"');
    expect(msg).toContain('"count":5');
  });

  it("includes ISO timestamp", () => {
    const logger = createLogger("test");
    logger.info("event");
    const msg = logSpy.mock.calls[0][0];
    expect(msg).toMatch(/^\[\d{4}-\d{2}-\d{2}T/);
  });
});
