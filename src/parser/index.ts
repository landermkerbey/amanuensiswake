import { unified } from "unified";
import uniorgParse from "uniorg-parse";
import uniorgRehype from "uniorg-rehype";
import rehypeStringify from "rehype-stringify";
import { readFile } from "node:fs/promises";
import rehypeVerse from "../rehype-verse.js";

export interface ParsedPage {
  title: string;
  date: string;
  /** Value of #+LAST_MODIFIED, or null if absent or equal to date. */
  revisedDate: string | null;
  tags: string[];
  bodyHtml: string;
  rawContent: string;
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

export async function parse(filePath: string): Promise<ParsedPage> {
  const content = await readFile(filePath, "utf-8");

  const title = extractKeyword(content, "TITLE");
  const date = extractKeyword(content, "DATE");
  const rawTags = extractKeyword(content, "FILETAGS");
  const tags = rawTags ? extractTags(rawTags) : [];

  const lastModified = extractKeyword(content, "LAST_MODIFIED");
  // Suppress revisedDate when absent or identical to date.
  const revisedDate =
    lastModified && lastModified !== date ? lastModified : null;

  const processor = unified()
    .use(uniorgParse)
    .use(uniorgRehype)
    .use(rehypeVerse)
    .use(rehypeStringify);

  const file = await processor.process(content);
  const bodyHtml = String(file);

  return { title, date, revisedDate, tags, bodyHtml, rawContent: content };
}