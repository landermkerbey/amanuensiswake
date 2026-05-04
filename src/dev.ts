import { startWatcher } from "./server/watch.js";
import { createServer } from "./server/serve.js";
import { build } from "./builder/index.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const contentDir = path.resolve(__dirname, "../content");
const outputDir = path.resolve(__dirname, "../dist");

console.log("building...");
await build({ contentDir, outputDir });

console.log("watching for changes...");
startWatcher({ contentDir, outputDir });

createServer(outputDir, 3000);