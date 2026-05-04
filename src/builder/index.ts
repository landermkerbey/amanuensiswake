import { parse } from "../parser/index.js";
import { baseTemplate } from "../../templates/base.js";
import glob from "fast-glob";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";

export interface BuildConfig {
  contentDir: string;
  outputDir: string;
}

export async function build(config: BuildConfig): Promise<void> {
  const { contentDir, outputDir } = config;

  const orgFiles = await glob("**/*.org", {
    cwd: contentDir,
    absolute: false,
  });

  await Promise.all(
    orgFiles.map(async (relative) => {
      const absoluteInput = path.join(contentDir, relative);
      const parsed = await parse(absoluteInput);

      const html = baseTemplate({ title: parsed.title, body: parsed.bodyHtml });

      const stripped = relative.replace(/\.org$/, "");
      const isIndex = stripped === "index";
      const outputPath = isIndex
	? path.join(outputDir, "index.html")
	: path.join(outputDir, stripped, "index.html");

      await mkdir(path.dirname(outputPath), { recursive: true });
      await writeFile(outputPath, html, "utf-8");
    })
  );
}

const isMain = process.argv[1]?.endsWith("builder/index.ts") ||
               process.argv[1]?.endsWith("builder/index.js");

if (isMain) {
  const contentDir = new URL("../../content", import.meta.url).pathname;
  const outputDir = new URL("../../dist", import.meta.url).pathname;
  console.log("building...");
  await build({ contentDir, outputDir });
  console.log("done");
}