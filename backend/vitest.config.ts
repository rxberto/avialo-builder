import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Solo tests unitarios deterministas. Los scripts de integración antiguos en
    // tests/*.js requieren servicios (Redis/Postgres/Docker) y NO se ejecutan aquí.
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
  },
});
