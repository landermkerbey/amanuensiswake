import glob from "fast-glob";
import path from "node:path";
import { readFile } from "node:fs/promises";

export interface EntryMeta {
  title: string;
  date: string;
  revisedDate: string | null;
  tags: string[];
  slug: string;
  isNote: boolean;
  lede: string | null;
}

function extractKeyword(content: string, keyword: string): string {
  const pattern = new RegExp(`^#\\+${keyword}:\\s*(.+)$`, "im");
  const match = pattern.exec(content);
  return match?.[1]?.trim() ?? "";
}

function extractTags(raw: string): string[] {
  return raw
    .split(":")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

export async function collectEntries(contentDir: string): Promise<EntryMeta[]> {
  const orgFiles = await glob("**/*.org", {
    cwd: contentDir,
    absolute: false,
  });

  const entries = await Promise.all(
    orgFiles
      .filter((relative) => relative !== "index.org")
      .map(async (relative) => {
        const content = await readFile(
          path.join(contentDir, relative),
          "utf-8"
        );

        const title = extractKeyword(content, "TITLE");
        const rawDate = extractKeyword(content, "DATE");
        const date = rawDate || extractKeyword(content, "CREATED");
        const rawTags = extractKeyword(content, "FILETAGS");
        const tags = rawTags ? extractTags(rawTags) : [];

        const lastModified = extractKeyword(content, "LAST_MODIFIED");
        const revisedDate =
          lastModified && lastModified !== date ? lastModified : null;

        const slug = relative.replace(/\.org$/, "");
        const isNote = tags.includes("note");
	const rawLede = extractKeyword(content, "LEDE");
	const lede = rawLede || null;

        return { title, date, revisedDate, tags, slug, isNote, lede };
      })
  );

  return entries.sort((a, b) => {
    if (a.date < b.date) return 1;
    if (a.date > b.date) return -1;
    return 0;
  });
}