import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { startWatcher } from "../../src/server/watch.js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdtemp, rm, writeFile, readFile, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import type { FSWatcher } from "chokidar";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let contentDir: string;
let outputDir: string;
let watcher: FSWatcher;

beforeEach(async () => {
  contentDir = await mkdtemp(path.join(tmpdir(), "amanuensiswake-content-"));
  outputDir = await mkdtemp(path.join(tmpdir(), "amanuensiswake-output-"));
});

afterEach(async () => {
  await watcher.close();
  await rm(contentDir, { recursive: true, force: true });
  await rm(outputDir, { recursive: true, force: true });
});

async function waitForFile(
  filePath: string,
  timeoutMs = 3000,
  intervalMs = 100
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await access(filePath);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }
  throw new Error(`Timed out waiting for file: ${filePath}`);
}

async function waitForFileToContain(
  filePath: string,
  substring: string,
  timeoutMs = 3000,
  intervalMs = 100
): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const content = await readFile(filePath, "utf-8");
      if (content.includes(substring)) return content;
    } catch {
      // file not yet written
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(
    `Timed out waiting for "${substring}" in: ${filePath}`
  );
}

async function waitForFileToDisappear(
  filePath: string,
  timeoutMs = 3000,
  intervalMs = 100
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await access(filePath);
    } catch {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`Timed out waiting for file to disappear: ${filePath}`);
}

describe("startWatcher", () => {
  it("builds an org file added after the watcher starts", async () => {
    watcher = startWatcher({ contentDir, outputDir });

    await new Promise((resolve) => watcher.on("ready", resolve));

    await writeFile(
      path.join(contentDir, "new-page.org"),
      "#+TITLE: New Page\n\nSome content.\n",
      "utf-8"
    );

    const outputPath = path.join(outputDir, "new-page", "index.html");
    const html = await waitForFileToContain(outputPath, "<h1>New Page</h1>");

    expect(html).toContain("<h1>New Page</h1>");
  });

  it("rebuilds an org file when it is modified", async () => {
    await writeFile(
      path.join(contentDir, "existing.org"),
      "#+TITLE: Original Title\n\nOriginal content.\n",
      "utf-8"
    );

    watcher = startWatcher({ contentDir, outputDir });

    const outputPath = path.join(outputDir, "existing", "index.html");
    await waitForFileToContain(outputPath, "<h1>Original Title</h1>");

    await writeFile(
      path.join(contentDir, "existing.org"),
      "#+TITLE: Updated Title\n\nUpdated content.\n",
      "utf-8"
    );

    const html = await waitForFileToContain(outputPath, "<h1>Updated Title</h1>");
    expect(html).toContain("<h1>Updated Title</h1>");
  });

  it("removes the output file when a source file is deleted", async () => {
    await writeFile(
      path.join(contentDir, "to-delete.org"),
      "#+TITLE: To Delete\n\nContent.\n",
      "utf-8"
    );

    watcher = startWatcher({ contentDir, outputDir });

    const outputPath = path.join(outputDir, "to-delete", "index.html");
    await waitForFile(outputPath);

    await rm(path.join(contentDir, "to-delete.org"));
    await waitForFileToDisappear(outputPath);

    await expect(readFile(outputPath, "utf-8")).rejects.toThrow();
  });
});




