import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import type { Plugin as PostcssPlugin } from "postcss";

/**
 * На 2K/4K страница увеличивается через `zoom` на <html> (`ViewportScale`, переменная `--vp-zoom`).
 * Под zoom браузер умножает и vh/vw, поэтому высота «на весь экран» стала бы больше экрана.
 * Плагин делит каждую viewport-единицу в CSS на коэффициент: `100dvh` → `calc(100dvh / var(--vp-zoom, 1))`.
 */
const VIEWPORT_UNIT = /(-?\d*\.?\d+)(dvh|svh|lvh|vh|dvw|svw|lvw|vw)\b/g;
const unzoomViewportUnits: PostcssPlugin = {
  postcssPlugin: "unzoom-viewport-units",
  Declaration(decl) {
    if (!/\d(d|s|l)?v(h|w)\b/.test(decl.value) || decl.value.includes("--vp-zoom")) return;
    decl.value = decl.value.replace(VIEWPORT_UNIT, "calc($1$2 / var(--vp-zoom, 1))");
  },
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backendUrl = process.env.VITE_BACKEND_URL ?? env.VITE_BACKEND_URL;
  // VITE_* из корневого .env (общего с docker compose): ключ карты 2ГИС и т.п. хранится в одном месте.
  // frontend/.env и переменные окружения главнее, корневой .env заполняет только то, чего там нет.
  const rootEnv = loadEnv(mode, fileURLToPath(new URL("..", import.meta.url)), "VITE_");
  const fromRoot = Object.entries(rootEnv).filter(([key]) => !(key in env) && process.env[key] === undefined);

  return {
    plugins: [tailwindcss(), reactRouter()],
    define: Object.fromEntries(fromRoot.map(([key, value]) => [`import.meta.env.${key}`, JSON.stringify(value)])),
    css: { postcss: { plugins: [unzoomViewportUnits] } },
    resolve: {
      tsconfigPaths: true,
    },
    server: {
      port: 5173,
      // В деве /api идёт на локальный бэкенд, в проде это делает Caddy
      proxy: { "/api": backendUrl || "http://localhost:8080" },
    },
  };
});
