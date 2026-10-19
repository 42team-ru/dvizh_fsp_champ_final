import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";

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
