import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const output = fileURLToPath(new URL("../build/client/", import.meta.url));
const template = await readFile(new URL("../public/sw.js", import.meta.url), "utf8");
const resources = [];

async function collect(directory) {
  for (const entry of await readdir(path.join(output, directory), { withFileTypes: true })) {
    const relative = path.posix.join(directory, entry.name);
    if (entry.isDirectory()) await collect(relative);
    else resources.push(`/${relative}`);
  }
}

// Включая ленивые маршруты: офлайн-оболочке нужны их JS/CSS, а не только index.html.
await collect("assets");
await collect("fonts");
await collect("icons");
resources.push("/index.html", "/manifest.webmanifest", "/icon.svg");
resources.sort();
const hash = createHash("sha256").update(template);
for (const resource of resources) {
  hash.update(resource).update(await readFile(path.join(output, resource.slice(1))));
}
const versionPattern = /const CACHE_VERSION = ("[^"]+");/;
const baseVersion = JSON.parse(template.match(versionPattern)[1]);
const version = `${baseVersion}-${hash.digest("hex").slice(0, 16)}`;
const worker = template
  .replace(versionPattern, `const CACHE_VERSION = ${JSON.stringify(version)};`)
  .replace("const BUILD_ASSETS = [];", `const BUILD_ASSETS = ${JSON.stringify(resources)};`);
await writeFile(path.join(output, "sw.js"), worker);
console.log(`PWA: ${version}, ресурсов: ${resources.length}`);
