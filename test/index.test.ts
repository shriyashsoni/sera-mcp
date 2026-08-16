import { afterEach, describe, expect, it } from "vitest";
import { parseArgs } from "../src/index.js";

const OLD_ENV = process.env;

afterEach(() => {
  process.env = OLD_ENV;
});

function withEnv(env: Record<string, string | undefined>) {
  process.env = { ...OLD_ENV };
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

describe("parseArgs", () => {
  it("uses the default HTTP port when no env or CLI port is set", () => {
    withEnv({ SERA_HTTP_PORT: undefined });
    expect(parseArgs([]).port).toBe(3848);
  });

  it("treats an empty SERA_HTTP_PORT as unset", () => {
    withEnv({ SERA_HTTP_PORT: "" });
    expect(parseArgs([]).port).toBe(3848);
  });

  it("parses a valid SERA_HTTP_PORT", () => {
    withEnv({ SERA_HTTP_PORT: "8080" });
    expect(parseArgs([]).port).toBe(8080);
  });

  it("rejects invalid SERA_HTTP_PORT values", () => {
    withEnv({ SERA_HTTP_PORT: "abc" });
    expect(() => parseArgs([])).toThrow(/SERA_HTTP_PORT must be a finite number/);
  });

  it("rejects out-of-range SERA_HTTP_PORT values", () => {
    withEnv({ SERA_HTTP_PORT: "70000" });
    expect(() => parseArgs([])).toThrow(/SERA_HTTP_PORT must be <= 65535/);
  });

  it("lets --port override the env port", () => {
    withEnv({ SERA_HTTP_PORT: "8080" });
    expect(parseArgs(["--port", "9090"]).port).toBe(9090);
  });

  it("rejects missing or invalid --port values", () => {
    withEnv({ SERA_HTTP_PORT: undefined });
    expect(() => parseArgs(["--port"])).toThrow(/--port requires a port value/);
    expect(() => parseArgs(["--port", "nope"])).toThrow(/--port must be a finite number/);
    expect(() => parseArgs(["--port", "1.5"])).toThrow(/--port must be an integer/);
    expect(() => parseArgs(["--port", "0"])).toThrow(/--port must be between 1 and 65535/);
  });
});
