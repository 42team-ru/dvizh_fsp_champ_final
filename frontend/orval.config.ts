import { defineConfig } from "orval";

// Спека лежит в git (обновляется через `yarn api:pull`), бэкенд для генерации не нужен.
export default defineConfig({
  core: {
    input: "./src/shared/api/schemas/openapi.json",
    output: {
      mode: "tags-split",
      target: "./src/shared/api/generated/core",
      client: "react-query",
      baseUrl: "", // относительные пути: /api/* в деве проксирует Vite, в проде Caddy
      clean: true,
      override: {
        mutator: {
          path: "./src/shared/api/mutators/authMutator.ts",
          name: "authMutator",
        },
      },
    },
  },
});
