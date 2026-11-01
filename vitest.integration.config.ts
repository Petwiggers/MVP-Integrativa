import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Testes que usam o Postgres local (docker compose up -d db).
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["tests/integration/**/*.test.ts"],
    environment: "node",
    setupFiles: ["dotenv/config"],
    fileParallelism: false,
  },
});
