import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { uploadImages, UploadInput } from "@/lib/tenantApi";

async function requireAdmin() {
  const session = await auth();
  return session?.user?.role === "admin";
}

const MAX_FILES = 10;
const MAX_BYTES = 5 * 1024 * 1024;
// SVG excluido a propósito (XSS por <script> en SVG almacenado/servido inline).
const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  try {
    const form = await req.formData();
    const entries = form.getAll("files").filter((f): f is File => f instanceof File);
    if (entries.length === 0) {
      return NextResponse.json({ error: "No se ha seleccionado ninguna imagen." }, { status: 400 });
    }
    if (entries.length > MAX_FILES) {
      return NextResponse.json({ error: `Máximo ${MAX_FILES} imágenes.` }, { status: 400 });
    }
    const files: UploadInput[] = [];
    for (const file of entries) {
      if (!ALLOWED.has(file.type)) {
        return NextResponse.json(
          { error: "Formato no permitido (JPG, PNG, WEBP, GIF, AVIF o SVG)." },
          { status: 400 }
        );
      }
      if (file.size > MAX_BYTES) {
        return NextResponse.json(
          { error: "Cada imagen no puede superar los 5 MB." },
          { status: 400 }
        );
      }
      const buf = Buffer.from(await file.arrayBuffer());
      files.push({
        filename: file.name,
        mimeType: file.type,
        dataBase64: buf.toString("base64"),
      });
    }
    const uploaded = await uploadImages(files);
    return NextResponse.json({ files: uploaded }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
