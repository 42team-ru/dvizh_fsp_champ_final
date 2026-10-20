#!/usr/bin/env node
/**
 * Пребилд раскладок спортивного фона (MemphisBackground).
 *
 * Открывает страницы на запущенном dev-фронте с демо-данными (make dev + make back + make front, DEMO_MODE=true),
 * на каждой ширине 320–1920 с шагом 40 px просит фон разложиться по готовой странице и сохраняет результат
 * в src/shared/components/ui/memphis-layouts.json. В рабочем режиме фон берёт раскладку оттуда с первого кадра
 * и не перекладывается, пока подгружаются данные.
 *
 *   node scripts/prebuild-memphis.mjs [--base http://localhost:5173] [--chrome /path/to/chrome]
 *
 * Перезапускать после заметных изменений вёрстки страниц с фоном.
 */
import { chromium } from "playwright-core";
import { existsSync, readdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};
const BASE = arg("--base", "http://localhost:5173");
const OUT = join(dirname(fileURLToPath(import.meta.url)), "../src/shared/components/ui/memphis-layouts.json");
const VERSION = 1;
const WIDTHS = Array.from({ length: (1920 - 320) / 40 + 1 }, (_, i) => 320 + i * 40);
/** Высота окна: типичная видимая область браузера на fullHD и на телефоне. */
const height = (width) => (width >= 1024 ? 960 : 820);
const PASSWORD = "demo-password-1";
const CONCURRENCY = 4;

function findChrome() {
  const given = arg("--chrome");
  if (given) return given;
  const root = join(homedir(), ".cache/ms-playwright");
  if (!existsSync(root)) return undefined;
  const dir = readdirSync(root).filter((d) => /^chromium-\d+$/.test(d)).sort().pop();
  if (!dir) return undefined;
  for (const sub of ["chrome-linux64/chrome", "chrome-linux/chrome", "chrome-mac/Chromium.app/Contents/MacOS/Chromium"]) {
    const path = join(root, dir, sub);
    if (existsSync(path)) return path;
  }
  return undefined;
}

async function login(context, username) {
  const res = await context.request.post(`${BASE}/api/auth/login`, { data: { username, password: PASSWORD } });
  if (!res.ok()) throw new Error(`Вход ${username}: ${res.status()}`);
}

async function getJson(context, path) {
  const res = await context.request.get(`${BASE}${path}`);
  if (!res.ok()) throw new Error(`${path}: ${res.status()}`);
  return res.json();
}

const browser = await chromium.launch({ executablePath: findChrome() });
const newContext = () => browser.newContext({ reducedMotion: "reduce", viewport: { width: 1920, height: 960 } });

// ссылки на конкретные страницы берём из демо-данных
const probe = await newContext();
await login(probe, "anna");
const football = (await getJson(probe, `/api/events?searchText=${encodeURIComponent("Футбол")}&size=1`)).items[0];
const other = (await getJson(probe, `/api/events?searchText=${encodeURIComponent("Баскетбол")}&size=1`)).items[0];
const post = (await getJson(probe, "/api/blog/posts?size=1")).items[0];
const chess = (await getJson(probe, `/api/events?searchText=${encodeURIComponent("Ладья")}&size=1`)).items[0];
await probe.close();

/** Страницы с фоном: кто смотрит и где. */
const PAGES = [
  { user: "anna", path: "/" },
  { user: "anna", path: "/feed" },
  { user: "anna", path: `/events/${football.id}` },
  { user: "anna", path: `/users/${other.authorId}` },
  { user: "anna", path: "/profile" },
  { user: "anna", path: "/activity" },
  { user: "anna", path: "/events/new" },
  { user: "anna", path: "/onboarding" },
  { user: "enisey", path: "/onboarding/org" },
  { user: "anna", path: "/blog" },
  { user: "anna", path: `/blog/${post.id}` },
  { user: "anna", path: "/blog/new" },
  { user: "anna", path: "/orgs" },
  { user: "anna", path: `/orgs/${chess.organizationId}` },
  { user: "ladya", path: "/" },
  { user: "ladya", path: "/my/events" },
  { user: "ladya", path: `/my/events/${chess.id}/manage` },
  { user: "ladya", path: "/my/org" },
  { user: "admin", path: "/" },
  { user: "admin", path: "/admin" },
  { user: "admin", path: "/admin/organizations" },
  { user: "admin", path: `/admin/organizations/${chess.organizationId}` },
  { user: "admin", path: "/admin/moderation" },
  { user: "admin", path: "/admin/events" },
  { user: "admin", path: `/admin/events/${football.id}/comments` },
  { user: "admin", path: "/admin/sports" },
  { user: "admin", path: "/admin/users" },
  { user: "admin", path: "/admin/awards" },
  { user: "admin", path: "/admin/pets" },
  { user: null, path: "/auth/login" },
  { user: null, path: "/auth/register" },
];

const layouts = {};
let done = 0;

async function run(target) {
  const context = await newContext();
  if (target.user) await login(context, target.user);
  const page = await context.newPage();
  await page.goto(`${BASE}${target.path}`);
  await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1200);
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: height(width) });
    // ждём перерисовку под новую ширину и догрузку данных (мобильная и десктопная вёрстки грузят своё)
    await page.waitForLoadState("networkidle", { timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(500);
    let found = null;
    for (let attempt = 0; ; attempt++) {
      try {
        found = await page.evaluate(() => window.__memphisPrebuild?.() ?? null);
        break;
      } catch (error) {
        // страница сама перешла по ссылке (редирект) — дождёмся новой и спросим ещё раз
        if (attempt >= 3) throw error;
        await page.waitForLoadState("networkidle", { timeout: 4000 }).catch(() => {});
        await page.waitForTimeout(800);
      }
    }
    if (!found) throw new Error(`${target.path}: нет __memphisPrebuild — фронт запущен в dev-режиме?`);
    for (const { id, width: bucket, data } of found) {
      (layouts[id] ??= {})[bucket] = data;
    }
  }
  console.log(`[${++done}/${PAGES.length}] ${target.path}${page.url().endsWith(target.path) ? "" : ` → ${page.url()}`}`);
  await context.close();
}

const queue = [...PAGES];
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) await run(queue.shift());
  }),
);
await browser.close();

// стабильный порядок ключей — чтобы диф был читаемым
const sorted = Object.fromEntries(
  Object.keys(layouts)
    .sort()
    .map((id) => [id, Object.fromEntries(Object.keys(layouts[id]).sort((a, b) => a - b).map((w) => [w, layouts[id][w]]))]),
);
const body = Object.entries(sorted)
  .map(([id, byWidth]) => {
    const rows = Object.entries(byWidth).map(([w, data]) => `      "${w}": ${JSON.stringify(data)}`);
    return `    "${id}": {\n${rows.join(",\n")}\n    }`;
  })
  .join(",\n");
writeFileSync(OUT, `{\n  "version": ${VERSION},\n  "layouts": {\n${body}\n  }\n}\n`);
console.log(`Готово: ${Object.keys(sorted).length} фонов → ${OUT}`);
