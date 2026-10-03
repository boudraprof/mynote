import { describe, expect, it, vi } from "vitest";

import type { DestinationStream } from "pino";
import { createLogger } from "../utils/logger";

function createCaptureStream() {
  const lines: Array<string> = [];
  const destination: DestinationStream = {
    write(message) {
      lines.push(message);
    },
  };

  return { destination, lines };
}

describe("logger", () => {
  it("writes structured entries with message and context", () => {
    const { destination, lines } = createCaptureStream();
    const logger = createLogger({ level: "debug", destination });

    logger.debug("details");
    logger.info("ready", "App");

    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0])).toMatchObject({
      level: 20,
      msg: "details",
    });
    expect(JSON.parse(lines[1])).toMatchObject({
      level: 30,
      context: "App",
      msg: "ready",
    });
  });

  it("respects the configured minimum level", () => {
    const { destination, lines } = createCaptureStream();
    const logger = createLogger({ level: "warn", destination });

    logger.info("hidden");
    logger.warn("visible");

    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0])).toMatchObject({
      level: 40,
      msg: "visible",
    });
  });

  it("falls back for invalid levels and safely serializes arbitrary errors", () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { destination, lines } = createCaptureStream();
    const logger = createLogger({ level: "verbose", destination });
    const circular: { self?: unknown } = {};
    circular.self = circular;

    logger.error("Request failed", circular, "API");

    expect(warning).toHaveBeenCalledWith(
      expect.stringContaining('Invalid LOG_LEVEL "verbose"'),
    );
    expect(JSON.parse(lines[0])).toMatchObject({
      level: 50,
      context: "API",
      msg: "Request failed",
    });
  });
});
