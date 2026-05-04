import { describe, it, expect } from "vitest";
import { parse } from "../../src/parser/index.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const fixture = (name: string) =>
  path.resolve(__dirname, "../fixtures", name);

describe("parse", () => {
  it("extracts the title from #+TITLE", async () => {
    const result = await parse(fixture("simple.org"));
    expect(result.title).toBe("The Raven");
  });

  it("extracts the date from #+DATE", async () => {
    const result = await parse(fixture("simple.org"));
    expect(result.date).toBe("2026-01-15");
  });

  it("extracts tags from #+FILETAGS", async () => {
    const result = await parse(fixture("simple.org"));
    expect(result.tags).toEqual(["poetry", "gothic"]);
  });

  it("renders body content as HTML", async () => {
    const result = await parse(fixture("simple.org"));
    expect(result.bodyHtml).toContain("midnight dreary");
  });

  it("throws on a missing file", async () => {
    await expect(parse(fixture("does-not-exist.org"))).rejects.toThrow();
  });
});