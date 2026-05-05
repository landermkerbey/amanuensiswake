import { unified } from "unified";
import uniorgParse from "uniorg-parse";
import uniorgRehype from "uniorg-rehype";
import rehypeStringify from "rehype-stringify";
import { readFile } from "node:fs/promises";

export interface ParsedPage {
  title: string;
  date: string;
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

  const processor = unified()
    .use(uniorgParse)
    .use(uniorgRehype)
    .use(rehypeStringify);

  const file = await processor.process(content);
  const bodyHtml = String(file);

  return { title, date, tags, bodyHtml, rawContent: content };
}