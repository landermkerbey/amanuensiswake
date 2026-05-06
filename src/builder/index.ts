import { parse } from "../parser/index.js";
import { baseTemplate } from "../../templates/base.js";
import { unified } from "unified";
import uniorgParse from "uniorg-parse";
import uniorgRehype from "uniorg-rehype";
import rehypeStringify from "rehype-stringify";
import rehypeVerse from "../rehype-verse.js";
import glob from "fast-glob";
import path from "node:path";
import { mkdir, writeFile, copyFile, readdir } from "node:fs/promises";
import type { Transform, OrgData, BuildContext } from "../transforms/types.js";

export interface BuildConfig {
  contentDir: string;
  outputDir: string;
  transforms?: Transform[];
  /**
   * Directory of static assets to copy verbatim into outputDir.
   * Defaults to <repo-root>/public when the builder is run as main;
   * callers (including tests) may override or omit it.
   */
  publicDir?: string;
}

async function processFile(
  absoluteInput: string,
  outputPath: string,
  transforms: Transform[]
): Promise<void> {
  const parsed = await parse(absoluteInput);

  const context: BuildContext = {
    filePath: absoluteInput,
    title: parsed.title,
    date: parsed.date,
    tags: parsed.tags,
  };

  const processor = unified()
    .use(uniorgParse)
    .use(uniorgRehype)
    .use(rehypeVerse)
    .use(rehypeStringify);

  let ast = processor.parse(parsed.rawContent) as OrgData;

  for (const transform of transforms) {
    ast = transform(ast, context);
  }

  const hast = await processor.run(ast);
  const bodyHtml = processor.stringify(hast);

  const html = baseTemplate({
    title: parsed.title,
    body: bodyHtml,
    date: parsed.date || undefined,
    revisedDate: parsed.revisedDate,
    tags: parsed.tags.length ? parsed.tags : undefined,
  });

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, html, "utf-8");
}

/**
 * Recursively copies every file under srcDir into destDir,
 * preserving the relative directory structure.
 * Silently does nothing if srcDir does not exist.
 */
async function copyStatic(srcDir: string, destDir: string): Promise<void> {
  let entries;
  try {
    entries = await readdir(srcDir, { withFileTypes: true });
  } catch {
    // publicDir doesn't exist — nothing to copy.
    return;
  }

  await Promise.all(
    entries.map(async (entry) => {
      const srcPath = path.join(srcDir, entry.name);
      const destPath = path.join(destDir, entry.name);
      if (entry.isDirectory()) {
        await mkdir(destPath, { recursive: true });
        await copyStatic(srcPath, destPath);
      } else {
        await mkdir(path.dirname(destPath), { recursive: true });
        await copyFile(srcPath, destPath);
      }
    })
  );
}

export async function build(config: BuildConfig): Promise<void> {
  const { contentDir, outputDir, transforms = [], publicDir } = config;

  const orgFiles = await glob("**/*.org", {
    cwd: contentDir,
    absolute: false,
  });

  await Promise.all([
    // Process all org files.
    ...orgFiles.map(async (relative) => {
      const absoluteInput = path.join(contentDir, relative);
      const stripped = relative.replace(/\.org$/, "");
      const isIndex = stripped === "index";
      const outputPath = isIndex
        ? path.join(outputDir, "index.html")
        : path.join(outputDir, stripped, "index.html");

      await processFile(absoluteInput, outputPath, transforms);
    }),
    // Copy static assets (no-op when publicDir is absent).
    ...(publicDir ? [copyStatic(publicDir, outputDir)] : []),
  ]);
}

const isMain =
  process.argv[1]?.endsWith("builder/index.ts") ||
  process.argv[1]?.endsWith("builder/index.js");

if (isMain) {
  const contentDir = new URL("../../content", import.meta.url).pathname;
  const outputDir = new URL("../../dist", import.meta.url).pathname;
  const publicDir = new URL("../../public", import.meta.url).pathname;
  console.log("building...");
  await build({ contentDir, outputDir, publicDir });
  console.log("done");
}