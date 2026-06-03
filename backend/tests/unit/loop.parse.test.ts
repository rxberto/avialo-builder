import { describe, it, expect } from "vitest";
import { parseFileChanges } from "../../src/agent/parseFiles.js";

describe("parseFileChanges", () => {
  it("extrae múltiples bloques [ARCHIVO: ...]", () => {
    const out = `
[ARCHIVO: src/app/page.tsx]
export default function Page() { return null; }
[ARCHIVO: src/app/globals.css]
body { margin: 0; }
`;
    const changes = parseFileChanges(out);
    expect(changes).toHaveLength(2);
    expect(changes[0].relativePath).toBe("src/app/page.tsx");
    expect(changes[1].relativePath).toBe("src/app/globals.css");
    expect(changes[1].content).toContain("margin: 0");
  });

  it("limpia las vallas de markdown ```", () => {
    const out = "[ARCHIVO: a.ts]\n```ts\nconst a = 1;\n```";
    const changes = parseFileChanges(out);
    expect(changes[0].content).toBe("const a = 1;");
  });

  it("devuelve vacío cuando no hay cabeceras", () => {
    expect(parseFileChanges("texto sin formato")).toHaveLength(0);
  });

  it("limpia ruido markdown (** + valla) que añade DeepSeek en package.json", () => {
    const out = '[ARCHIVO: package.json]\n**\n```json\n{\n  "name": "gastrorro"\n}\n```\n**';
    const changes = parseFileChanges(out);
    expect(changes[0].content).toBe('{\n  "name": "gastrorro"\n}');
    expect(() => JSON.parse(changes[0].content)).not.toThrow();
  });
});
