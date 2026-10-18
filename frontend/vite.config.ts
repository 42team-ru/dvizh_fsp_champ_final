import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backendUrl = process.env.VITE_BACKEND_URL ?? env.VITE_BACKEND_URL;

  return {
    plugins: [tailwindcss(), reactRouter()],
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
