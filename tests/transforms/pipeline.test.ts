import { describe, it, expect } from "vitest";
import { build } from "../../src/builder/index.js";
import type { Transform } from "../../src/transforms/types.js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let outputDir: string;

async function withTempOutput<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(path.join(tmpdir(), "amanuensiswake-transform-"));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function withTempContent<T>(
  fn: (dir: string) => Promise<T>
): Promise<T> {
  const dir = await mkdtemp(path.join(tmpdir(), "amanuensiswake-content-"));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

describe("transform pipeline", () => {
  it("a no-op transform produces identical output to no transform", async () => {
    await withTempContent(async (contentDir) => {
      await withTempOutput(async (outA) => {
        await withTempOutput(async (outB) => {
          await writeFile(
            path.join(contentDir, "test.org"),
            "#+TITLE: Test\n\nSome content.\n",
            "utf-8"
          );

          const noOp: Transform = (ast, _ctx) => ast;

          await build({ contentDir, outputDir: outA });
          await build({ contentDir, outputDir: outB, transforms: [noOp] });

          const htmlA = await readFile(
            path.join(outA, "test", "index.html"),
            "utf-8"
          );
          const htmlB = await readFile(
            path.join(outB, "test", "index.html"),
            "utf-8"
          );

          expect(htmlA).toBe(htmlB);
        });
      });
    });
  });

  it("a mutating transform's changes appear in the HTML output", async () => {
    await withTempContent(async (contentDir) => {
      await withTempOutput(async (outDir) => {
	await writeFile(
	  path.join(contentDir, "test.org"),
	  // Content must be under a heading to be wrapped in a section node.
	  // Top-level content (before any heading) sits directly on org-data.
	  "#+TITLE: Test\n\n* A Heading\n\nOriginal paragraph.\n",
	  "utf-8"
	);

	const upperCaseParagraphs: Transform = (ast, _ctx) => {
	  for (const node of ast.children) {
	    if (node.type === "section") {
	      const section = node as { children: Array<{ type: string; children: Array<{ type: string; value: string }> }> };
	      for (const child of section.children) {
		if (child.type === "paragraph") {
		  for (const inline of child.children) {
		    if (inline.type === "text") {
		      inline.value = inline.value.toUpperCase();
		    }
		  }
		}
	      }
	    }
	  }
	  return ast;
	};

        await build({
          contentDir,
          outputDir: outDir,
          transforms: [upperCaseParagraphs],
        });

        const html = await readFile(
          path.join(outDir, "test", "index.html"),
          "utf-8"
        );

        expect(html).toContain("ORIGINAL PARAGRAPH.");
      });
    });
  });

  it("transforms receive a BuildContext with the file's metadata", async () => {
    await withTempContent(async (contentDir) => {
      await withTempOutput(async (outDir) => {
        await writeFile(
          path.join(contentDir, "test.org"),
          "#+TITLE: Context Test\n#+DATE: 2026-06-01\n#+FILETAGS: :foo:bar:\n\nContent.\n",
          "utf-8"
        );

        let capturedContext: import("../../src/transforms/types.js").BuildContext | null = null;

        const captureContext: Transform = (ast, ctx) => {
          capturedContext = ctx;
          return ast;
        };

        await build({
          contentDir,
          outputDir: outDir,
          transforms: [captureContext],
        });

        expect(capturedContext).not.toBeNull();
        expect(capturedContext!.title).toBe("Context Test");
        expect(capturedContext!.date).toBe("2026-06-01");
        expect(capturedContext!.tags).toEqual(["foo", "bar"]);
        expect(capturedContext!.filePath).toContain("test.org");
      });
    });
  });

  it("multiple transforms are applied in order", async () => {
    await withTempContent(async (contentDir) => {
      await withTempOutput(async (outDir) => {
        await writeFile(
          path.join(contentDir, "test.org"),
          "#+TITLE: Test\n\nhello world.\n",
          "utf-8"
        );

        const log: string[] = [];

        const first: Transform = (ast, _ctx) => {
          log.push("first");
          return ast;
        };

        const second: Transform = (ast, _ctx) => {
          log.push("second");
          return ast;
        };

        const third: Transform = (ast, _ctx) => {
          log.push("third");
          return ast;
        };

        await build({
          contentDir,
          outputDir: outDir,
          transforms: [first, second, third],
        });

        expect(log).toEqual(["first", "second", "third"]);
      });
    });
  });
});