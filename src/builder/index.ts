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
      const outputPath = path.join(outputDir, stripped, "index.html");

      await mkdir(path.dirname(outputPath), { recursive: true });
      await writeFile(outputPath, html, "utf-8");
    })
  );
}