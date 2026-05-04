import http from "node:http";
import path from "node:path";
import { readFile, stat } from "node:fs/promises";

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
};

export function createServer(distDir: string, port = 3000): http.Server {
  const server = http.createServer(async (req, res) => {
    const rawUrl = req.url ?? "/";
    const urlPath = rawUrl.split("?")[0] ?? "/";

    const candidates = [
      path.join(distDir, urlPath),
      path.join(distDir, urlPath, "index.html"),
      path.join(distDir, urlPath + ".html"),
    ];

    for (const candidate of candidates) {
      try {
        const stats = await stat(candidate);
        if (stats.isFile()) {
          const ext = path.extname(candidate);
          const contentType = MIME_TYPES[ext] ?? "application/octet-stream";
          const body = await readFile(candidate);
          res.writeHead(200, { "Content-Type": contentType });
          res.end(body);
          return;
        }
      } catch {
        continue;
      }
    }

    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
  });

  server.listen(port, () => {
    console.log(`serving ${distDir} at http://localhost:${port}`);
  });

  return server;
}