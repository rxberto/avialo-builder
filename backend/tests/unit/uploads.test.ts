import { describe, it, expect, beforeAll } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync } from "fs";
import { tmpdir } from "os";
import path from "path";

// Configuramos los directorios ANTES de importar los módulos (leen las env al cargarse).
const TMP = mkdtempSync(path.join(tmpdir(), "avialo-upload-"));
process.env.UPLOADS_DIR = path.join(TMP, "uploads");
process.env.SANDBOX_DIR = path.join(TMP, "sandbox");

// PNG 1x1 transparente válido (base64).
const PNG_1x1 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
const PNG_DATA_URL = `data:image/png;base64,${PNG_1x1}`;

let uploads: typeof import("../../src/services/uploads.js");
let cfg: typeof import("../../src/config/uploads.js");
let sectorProfiles: typeof import("../../src/prompts/sectorProfiles.js");

beforeAll(async () => {
  cfg = await import("../../src/config/uploads.js");
  uploads = await import("../../src/services/uploads.js");
  sectorProfiles = await import("../../src/prompts/sectorProfiles.js");
});

describe("decodeDataUrlImage", () => {
  it("decodifica un PNG válido", () => {
    const { ext, mime, buffer } = cfg.decodeDataUrlImage(PNG_DATA_URL);
    expect(ext).toBe("png");
    expect(mime).toBe("image/png");
    expect(buffer.length).toBeGreaterThan(0);
  });

  it("rechaza un string que no es data URL", () => {
    expect(() => cfg.decodeDataUrlImage("hola")).toThrow();
  });

  it("rechaza un tipo MIME no admitido (gif)", () => {
    expect(() => cfg.decodeDataUrlImage("data:image/gif;base64,R0lGOD")).toThrow(/no admitido/i);
  });

  it("rechaza una imagen que supera el tamaño máximo", () => {
    const huge = Buffer.alloc(cfg.MAX_IMAGE_BYTES + 1, 0x41).toString("base64");
    expect(() => cfg.decodeDataUrlImage(`data:image/png;base64,${huge}`)).toThrow(/máximo/i);
  });
});

describe("saveUserUpload", () => {
  it("guarda el fichero y devuelve un id seguro", async () => {
    const { id } = await uploads.saveUserUpload(42, PNG_DATA_URL);
    expect(id).toMatch(/^[a-zA-Z0-9_-]+\.png$/);
    const saved = path.join(process.env.UPLOADS_DIR!, "42", id);
    expect(existsSync(saved)).toBe(true);
  });
});

describe("materializeUserPhotos", () => {
  it("copia las fotos del usuario al public del sandbox y devuelve sus rutas", async () => {
    // Sembrar dos ficheros en la carpeta del usuario 7.
    const userDir = path.join(process.env.UPLOADS_DIR!, "7");
    mkdirSync(userDir, { recursive: true });
    writeFileSync(path.join(userDir, "a.jpg"), "x");
    writeFileSync(path.join(userDir, "b.webp"), "y");

    const urls = await uploads.materializeUserPhotos(7, "cliente-1", ["a.jpg", "b.webp"]);
    expect(urls).toEqual(["/avialo-uploads/a.jpg", "/avialo-uploads/b.webp"]);

    const dest = path.join(process.env.SANDBOX_DIR!, "cliente-1", "public", "avialo-uploads");
    expect(existsSync(path.join(dest, "a.jpg"))).toBe(true);
    expect(existsSync(path.join(dest, "b.webp"))).toBe(true);
  });

  it("ignora ids con path traversal o ficheros ausentes", async () => {
    const urls = await uploads.materializeUserPhotos(7, "cliente-2", [
      "../../../etc/passwd",
      "no-existe.png",
      "a.jpg", // este sí existe (sembrado arriba en user 7)
    ]);
    expect(urls).toEqual(["/avialo-uploads/a.jpg"]);
  });

  it("devuelve [] si no hay fotos", async () => {
    expect(await uploads.materializeUserPhotos(7, "cliente-3", [])).toEqual([]);
  });
});

describe("saveSandboxImage", () => {
  it("escribe la imagen directamente en el public del sandbox", async () => {
    const { url } = await uploads.saveSandboxImage("cliente-ide", PNG_DATA_URL);
    expect(url).toMatch(/^\/avialo-uploads\/[a-zA-Z0-9_-]+\.png$/);
    const file = path.join(process.env.SANDBOX_DIR!, "cliente-ide", "public", "avialo-uploads", path.basename(url));
    expect(existsSync(file)).toBe(true);
  });
});

describe("renderSectorDirectives con fotos del cliente", () => {
  it("prioriza las fotos propias sobre el stock", () => {
    const out = sectorProfiles.renderSectorDirectives("restaurante", "#ff0000", [
      "/avialo-uploads/foto1.jpg",
      "/avialo-uploads/foto2.jpg",
    ]);
    expect(out).toContain("SUS PROPIAS FOTOS");
    expect(out).toContain("/avialo-uploads/foto1.jpg");
    expect(out).toContain("/avialo-uploads/foto2.jpg");
  });

  it("usa stock por sector cuando no hay fotos propias", () => {
    const out = sectorProfiles.renderSectorDirectives("restaurante", "#ff0000", []);
    expect(out).toContain("images.unsplash.com");
    expect(out).not.toContain("SUS PROPIAS FOTOS");
  });
});
