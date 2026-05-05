import { parse } from "../parser/index.js";
import { baseTemplate } from "../../templates/base.js";
import { unified } from "unified";
import uniorgParse from "uniorg-parse";
import uniorgRehype from "uniorg-rehype";
import rehypeStringify from "rehype-stringify";
import glob from "fast-glob";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import type { Transform, OrgData, BuildContext } from "../transforms/types.js";

export interface BuildConfig {
  contentDir: string;
  outputDir: string;
  transforms?: Transform[];
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
    .use(rehypeStringify);

  let ast = processor.parse(parsed.rawContent) as OrgData;

  for (const transform of transforms) {
    ast = transform(ast, context);
  }

  const hast = await processor.run(ast);
  const bodyHtml = processor.stringify(hast);

  const html = baseTemplate({ title: parsed.title, body: bodyHtml });
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, html, "utf-8");
}

export async function build(config: BuildConfig): Promise<void> {
  const { contentDir, outputDir, transforms = [] } = config;

  const orgFiles = await glob("**/*.org", {
    cwd: contentDir,
    absolute: false,
  });

  await Promise.all(
    orgFiles.map(async (relative) => {
      const absoluteInput = path.join(contentDir, relative);
      const stripped = relative.replace(/\.org$/, "");
      const isIndex = stripped === "index";
      const outputPath = isIndex
        ? path.join(outputDir, "index.html")
        : path.join(outputDir, stripped, "index.html");

      await processFile(absoluteInput, outputPath, transforms);
    })
  );
}

const isMain =
  process.argv[1]?.endsWith("builder/index.ts") ||
  process.argv[1]?.endsWith("builder/index.js");

if (isMain) {
  const contentDir = new URL("../../content", import.meta.url).pathname;
  const outputDir = new URL("../../dist", import.meta.url).pathname;
  console.log("building...");
  await build({ contentDir, outputDir });
  console.log("done");
}