import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, writeFile, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { collectEntries } from "../../src/builder/collect-entries.js";

const WRITING_ORG = `#+TITLE: On Clarity
#+DATE: 2026-03-15
#+FILETAGS: :essay:

Some body text.
`;

const NOTE_ORG = `#+TITLE: An open question
#+DATE: 2026-04-01
#+FILETAGS: :note:

Some note text.
`;

const OLDER_WRITING_ORG = `#+TITLE: Three Studies
#+DATE: 2025-11-20
#+FILETAGS: :fiction:

Some body text.
`;

const INDEX_ORG = `#+TITLE: Amanuensis Wake
#+DATE: 2026-05-04

* Welcome

This site is under construction.
`;

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(path.join(tmpdir(), "aw-collect-"));
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

describe("collectEntries", () => {
  it("returns one entry for a single non-index org file", async () => {
    await writeFile(path.join(tmpDir, "2026-03-15.org"), WRITING_ORG);
    await writeFile(path.join(tmpDir, "index.org"), INDEX_ORG);

    const entries = await collectEntries(tmpDir);

    expect(entries).toHaveLength(1);
    expect(entries[0].title).toBe("On Clarity");
    expect(entries[0].date).toBe("2026-03-15");
    expect(entries[0].tags).toContain("essay");
    expect(entries[0].slug).toBe("2026-03-15");
    expect(entries[0].isNote).toBe(false);
  });

  it("marks an entry as isNote when tagged :note:", async () => {
    await writeFile(path.join(tmpDir, "2026-04-01.org"), NOTE_ORG);

    const entries = await collectEntries(tmpDir);

    expect(entries).toHaveLength(1);
    expect(entries[0].isNote).toBe(true);
  });

  it("excludes index.org from entries", async () => {
    await writeFile(path.join(tmpDir, "index.org"), INDEX_ORG);
    await writeFile(path.join(tmpDir, "2026-03-15.org"), WRITING_ORG);

    const entries = await collectEntries(tmpDir);

    expect(entries.every((e) => e.slug !== "index")).toBe(true);
  });

  it("sorts entries reverse-chronologically", async () => {
    await writeFile(path.join(tmpDir, "2026-03-15.org"), WRITING_ORG);
    await writeFile(path.join(tmpDir, "2025-11-20.org"), OLDER_WRITING_ORG);

    const entries = await collectEntries(tmpDir);

    expect(entries[0].date).toBe("2026-03-15");
    expect(entries[1].date).toBe("2025-11-20");
  });

  it("derives the slug from the filename without extension", async () => {
    await writeFile(path.join(tmpDir, "2026-03-15.org"), WRITING_ORG);

    const entries = await collectEntries(tmpDir);

    expect(entries[0].slug).toBe("2026-03-15");
  });

  it("returns revisedDate when #+LAST_MODIFIED differs from #+DATE", async () => {
    const revised = `#+TITLE: Revised piece
#+DATE: 2026-01-01
#+LAST_MODIFIED: 2026-03-10
#+FILETAGS: :essay:

Body.
`;
    await writeFile(path.join(tmpDir, "2026-01-01.org"), revised);

    const entries = await collectEntries(tmpDir);

    expect(entries[0].revisedDate).toBe("2026-03-10");
  });

  it("returns null revisedDate when #+LAST_MODIFIED equals #+DATE", async () => {
    const sameDate = `#+TITLE: Same date piece
#+DATE: 2026-01-01
#+LAST_MODIFIED: 2026-01-01
#+FILETAGS: :essay:

Body.
`;
    await writeFile(path.join(tmpDir, "2026-01-01.org"), sameDate);

    const entries = await collectEntries(tmpDir);

    expect(entries[0].revisedDate).toBeNull();
  });
});