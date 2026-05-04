import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { build } from "../../src/builder/index.js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const fixtureContent = path.resolve(__dirname, "../fixtures/content");

let outputDir: string;

beforeEach(async () => {
  outputDir = await mkdtemp(path.join(tmpdir(), "amanuensiswake-test-"));
});

afterEach(async () => {
  await rm(outputDir, { recursive: true, force: true });
});

describe("build", () => {
  it("produces one HTML file per org source", async () => {
    await build({ contentDir: fixtureContent, outputDir });

    const index = await readFile(
      path.join(outputDir, "ravens-desk", "index.html"),
      "utf-8"
    );
    const essay = await readFile(
      path.join(outputDir, "essays", "on-silence", "index.html"),
      "utf-8"
    );

    expect(index).toBeTruthy();
    expect(essay).toBeTruthy();
  });

  it("includes the page title in an <h1>", async () => {
    await build({ contentDir: fixtureContent, outputDir });

    const html = await readFile(
      path.join(outputDir, "ravens-desk", "index.html"),
      "utf-8"
    );

    expect(html).toContain("<h1>Ravens at My Desk</h1>");
  });

  it("preserves subdirectory structure", async () => {
    await build({ contentDir: fixtureContent, outputDir });

    const html = await readFile(
      path.join(outputDir, "essays", "on-silence", "index.html"),
      "utf-8"
    );

    expect(html).toContain("<h1>On Silence</h1>");
  });

  it("ignores non-org files", async () => {
    await writeFile(path.join(fixtureContent, "ignore-me.txt"), "not org");

    await build({ contentDir: fixtureContent, outputDir });

    await expect(
      readFile(path.join(outputDir, "ignore-me", "index.html"), "utf-8")
    ).rejects.toThrow();
  });

  it("is idempotent when run twice", async () => {
    await build({ contentDir: fixtureContent, outputDir });
    await build({ contentDir: fixtureContent, outputDir });

    const html = await readFile(
      path.join(outputDir, "ravens-desk", "index.html"),
      "utf-8"
    );

    expect(html).toContain("<h1>Ravens at My Desk</h1>");
  });
});