import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { build } from "../../src/builder/index.js";
import { parse } from "../../src/parser/index.js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const fixtureContent = path.resolve(__dirname, "../fixtures/content");
const fixturesDir = path.resolve(__dirname, "../fixtures");

let outputDir: string;

beforeEach(async () => {
  outputDir = await mkdtemp(path.join(tmpdir(), "amanuensiswake-test-"));
});

afterEach(async () => {
  await rm(outputDir, { recursive: true, force: true });
});

/* ─── existing build tests ────────────────────────────────────────────── */

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

  it("outputs index.org directly as index.html at the root", async () => {
    const indexOrg = path.join(fixtureContent, "index.org");
    await writeFile(indexOrg, "#+TITLE: Home\n\nWelcome.\n", "utf-8");

    await build({ contentDir: fixtureContent, outputDir });

    const html = await readFile(
      path.join(outputDir, "index.html"),
      "utf-8"
    );

    // Home page uses the isHome layout — no article <h1>, but the title
    // appears in <title> and the index structure is present.
    expect(html).toContain("Home — amanuensiswake");
    expect(html).toContain("aw-site-header--home");
    expect(html).toContain("aw-section-label");

    await rm(indexOrg);
  });

  // ── Index generation ───────────────────────────────────────────────────

  describe("build — index generation", () => {
    let contentDir: string;

    beforeEach(async () => {
      contentDir = await mkdtemp(path.join(tmpdir(), "aw-index-content-"));
      // Every index test needs an index.org to exist
      await writeFile(
	path.join(contentDir, "index.org"),
	"#+TITLE: Amanuensis Wake\n#+DATE: 2026-05-04\n\n* Welcome\n\nA site for writing.\n"
      );
    });

    afterEach(async () => {
      await rm(contentDir, { recursive: true, force: true });
    });

    it("renders a writing entry as a link in the index", async () => {
      await writeFile(
	path.join(contentDir, "2026-03-15.org"),
	`#+TITLE: On Clarity\n#+DATE: 2026-03-15\n#+FILETAGS: :essay:\n\nBody.\n`
      );

      await build({ contentDir, outputDir });

      const html = await readFile(path.join(outputDir, "index.html"), "utf-8");
      expect(html).toContain('href="/2026-03-15/"');
      expect(html).toContain("On Clarity");
    });

    it("renders notes in a separate section from writings", async () => {
      await writeFile(
	path.join(contentDir, "2026-03-15.org"),
	`#+TITLE: On Clarity\n#+DATE: 2026-03-15\n#+FILETAGS: :essay:\n\nBody.\n`
      );
      await writeFile(
	path.join(contentDir, "2026-04-01.org"),
	`#+TITLE: An open question\n#+DATE: 2026-04-01\n#+FILETAGS: :note:\n\nBody.\n`
      );

      await build({ contentDir, outputDir });

      const html = await readFile(path.join(outputDir, "index.html"), "utf-8");
      const writingsPos = html.indexOf("On Clarity");
      const notesPos = html.indexOf("An open question");
      const notesSectionPos = html.indexOf("aw-notes-block");

      // Notes section exists and appears after the writings
      expect(notesSectionPos).toBeGreaterThan(-1);
      expect(writingsPos).toBeLessThan(notesSectionPos);
      expect(notesPos).toBeGreaterThan(notesSectionPos);
    });

    it("omits the notes section when there are no notes", async () => {
      await writeFile(
	path.join(contentDir, "2026-03-15.org"),
	`#+TITLE: On Clarity\n#+DATE: 2026-03-15\n#+FILETAGS: :essay:\n\nBody.\n`
      );

      await build({ contentDir, outputDir });

      const html = await readFile(path.join(outputDir, "index.html"), "utf-8");
      expect(html).not.toContain("aw-notes-block");
    });

    it("renders entries in reverse-chronological order", async () => {
      await writeFile(
	path.join(contentDir, "2025-11-20.org"),
	`#+TITLE: Three Studies\n#+DATE: 2025-11-20\n#+FILETAGS: :fiction:\n\nBody.\n`
      );
      await writeFile(
	path.join(contentDir, "2026-03-15.org"),
	`#+TITLE: On Clarity\n#+DATE: 2026-03-15\n#+FILETAGS: :essay:\n\nBody.\n`
      );

      await build({ contentDir, outputDir });

      const html = await readFile(path.join(outputDir, "index.html"), "utf-8");
      expect(html.indexOf("On Clarity")).toBeLessThan(
	html.indexOf("Three Studies")
      );
    });
  });
});

/* ─── Step 3: verse block ─────────────────────────────────────────────── */

describe("verse block", () => {
  it("wraps verse content in div.aw-verse", async () => {
    const verseFixture = path.join(fixturesDir, "verse.org");

    // Build a single-file content dir pointing at the fixture
    const singleFileDir = path.join(outputDir, "verse-content");
    await mkdir(singleFileDir, { recursive: true });
    await writeFile(
      path.join(singleFileDir, "verse.org"),
      await readFile(verseFixture, "utf-8")
    );

    await build({ contentDir: singleFileDir, outputDir });

    const html = await readFile(
      path.join(outputDir, "verse", "index.html"),
      "utf-8"
    );

    expect(html).toContain('class="aw-verse"');
    expect(html).toContain("<div");
    // The aw-verse wrapper must not be a <p>
    expect(html).not.toMatch(/<p[^>]*class="verse"/);
  });

  it("preserves leading whitespace of indented verse lines verbatim", async () => {
    const verseFixture = path.join(fixturesDir, "verse.org");

    const singleFileDir = path.join(outputDir, "verse-ws-content");
    await mkdir(singleFileDir, { recursive: true });
    await writeFile(
      path.join(singleFileDir, "verse.org"),
      await readFile(verseFixture, "utf-8")
    );

    await build({ contentDir: singleFileDir, outputDir });

    const html = await readFile(
      path.join(outputDir, "verse", "index.html"),
      "utf-8"
    );

    // The fixture has a line indented with two spaces and one with four.
    // With white-space: pre in CSS the spaces must survive into the HTML.
    expect(html).toContain("  and the word was with the page,");
    expect(html).toContain("    and the page was blank.");
  });
});

/* ─── Step 4: revisedDate parsing ────────────────────────────────────── */

describe("parser: revisedDate", () => {
  it("extracts #+LAST_MODIFIED as revisedDate when present and different from date", async () => {
    const tmp = path.join(outputDir, "modified.org");
    await writeFile(
      tmp,
      "#+TITLE: Test\n#+DATE: 2026-01-23\n#+LAST_MODIFIED: 2026-03-14\n\nBody.\n",
      "utf-8"
    );

    const parsed = await parse(tmp);

    expect(parsed.revisedDate).toBe("2026-03-14");
  });

  it("returns null for revisedDate when #+LAST_MODIFIED is absent", async () => {
    const tmp = path.join(outputDir, "no-modified.org");
    await writeFile(
      tmp,
      "#+TITLE: Test\n#+DATE: 2026-01-23\n\nBody.\n",
      "utf-8"
    );

    const parsed = await parse(tmp);

    expect(parsed.revisedDate).toBeNull();
  });

  it("returns null for revisedDate when #+LAST_MODIFIED equals #+DATE", async () => {
    const tmp = path.join(outputDir, "same-date.org");
    await writeFile(
      tmp,
      "#+TITLE: Test\n#+DATE: 2026-01-23\n#+LAST_MODIFIED: 2026-01-23\n\nBody.\n",
      "utf-8"
    );

    const parsed = await parse(tmp);

    expect(parsed.revisedDate).toBeNull();
  });
});

