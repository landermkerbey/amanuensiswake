import chokidar, { type FSWatcher } from "chokidar";
import path from "node:path";
import { rm } from "node:fs/promises";
import { parse } from "../parser/index.js";
import { baseTemplate } from "../../templates/base.js";
import { mkdir, writeFile } from "node:fs/promises";

interface WatchConfig {
  contentDir: string;
  outputDir: string;
}

function orgPathToOutputPath(
  contentDir: string,
  outputDir: string,
  absoluteInput: string
): string {
  const relative = path.relative(contentDir, absoluteInput);
  const stripped = relative.replace(/\.org$/, "");
  return path.join(outputDir, stripped, "index.html");
}

async function buildFile(
  contentDir: string,
  outputDir: string,
  absoluteInput: string
): Promise<void> {
  const parsed = await parse(absoluteInput);
  const html = baseTemplate({ title: parsed.title, body: parsed.bodyHtml });
  const outputPath = orgPathToOutputPath(contentDir, outputDir, absoluteInput);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, html, "utf-8");
  console.log(`built: ${path.relative(outputDir, outputPath)}`);
}

async function removeFile(
  contentDir: string,
  outputDir: string,
  absoluteInput: string
): Promise<void> {
  const outputPath = orgPathToOutputPath(contentDir, outputDir, absoluteInput);
  await rm(path.dirname(outputPath), { recursive: true, force: true });
  console.log(`removed: ${path.relative(outputDir, outputPath)}`);
}

export function startWatcher(config: WatchConfig): FSWatcher {
  const { contentDir, outputDir } = config;

  const watcher = chokidar.watch("**/*.org", {
    cwd: contentDir,
    persistent: true,
    ignoreInitial: false,
  });

  watcher.on("add", (relative) => {
    const absolute = path.join(contentDir, relative);
    buildFile(contentDir, outputDir, absolute).catch(console.error);
  });

  watcher.on("change", (relative) => {
    const absolute = path.join(contentDir, relative);
    buildFile(contentDir, outputDir, absolute).catch(console.error);
  });

  watcher.on("unlink", (relative) => {
    const absolute = path.join(contentDir, relative);
    removeFile(contentDir, outputDir, absolute).catch(console.error);
  });

  return watcher;
}