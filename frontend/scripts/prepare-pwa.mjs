import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const output = fileURLToPath(new URL("../build/client/", import.meta.url));
const template = await readFile(new URL("../public/sw.js", import.meta.url), "utf8");
const resources = [];

const IMAGE = /\.(svg|png|webp|jpe?g)$/i;

async function collect(directory, only) {
  for (const entry of await readdir(path.join(output, directory), { withFileTypes: true })) {
    const relative = path.posix.join(directory, entry.name);
    if (entry.isDirectory()) await collect(relative, only);
    else if (!only || only.test(entry.name)) resources.push(`/${relative}`);
  }
}

// Включая ленивые маршруты: офлайн-оболочке нужны их JS/CSS, а не только index.html.
await collect("assets");
await collect("fonts");
await collect("icons");
// Иллюстрации и иконки интерфейса из public/ (~0,9 МБ): без них офлайн-экраны остаются с битыми картинками.
for (const entry of await readdir(output, { withFileTypes: true })) {
  if (entry.isDirectory() && !["assets", "fonts", "icons"].includes(entry.name)) await collect(entry.name, IMAGE);
  else if (entry.isFile() && IMAGE.test(entry.name)) resources.push(`/${entry.name}`);
}
resources.push("/index.html", "/manifest.webmanifest");
resources.sort();
resources.splice(0, resources.length, ...new Set(resources));
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
