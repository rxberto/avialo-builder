// Optimiza los assets pesados de /public a WebP.
// Genera, por cada imagen, una versión WebP a tamaño máximo razonable
// y un placeholder diminuto (LQIP) en base64 para la carga progresiva.
//
// Uso:  node scripts/optimize-images.mjs
// Requiere: sharp (devDependency).
//
// Salidas:
//   public/optimized/<nombre>.webp        -> versión optimizada (la que sirve la web)
//   src/data/lqip.json                    -> { "<nombre>": "data:image/webp;base64,..." }
//
// No toca los originales (quedan como respaldo/fuente).

import sharp from 'sharp';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
// Originales pesados (fuera de /public para que no se desplieguen ni sean accesibles)
const srcDir = path.join(root, 'image-sources');
const outDir = path.join(root, 'public', 'optimized');

// Cada entrada: archivo fuente + ancho máximo + calidad WebP.
// Los fondos decorativos toleran más compresión; las capturas algo menos.
const targets = [
  { src: 'light-galaxy.jpg',        maxWidth: 1920, quality: 70 },
  { src: 'light-motion-trails.jpg', maxWidth: 1920, quality: 72 },
  { src: 'ide-avialo.png',          maxWidth: 1280, quality: 80 },
  { src: 'webArquitectura.png',     maxWidth: 1280, quality: 80 },
  { src: 'web-generada.png',        maxWidth: 1280, quality: 80 },
  { src: 'placeholder-2.png',       maxWidth: 1280, quality: 80 },
  { src: 'placeholder-3.png',       maxWidth: 1280, quality: 80 },
];

async function run() {
  if (!existsSync(outDir)) await mkdir(outDir, { recursive: true });

  const lqip = {};

  for (const { src, maxWidth, quality } of targets) {
    const srcPath = path.join(srcDir, src);
    if (!existsSync(srcPath)) {
      console.warn(`⏭  No existe image-sources/${src}, lo salto.`);
      continue;
    }

    const base = src.replace(/\.(png|jpe?g)$/i, '');
    const buf = await readFile(srcPath);

    // Versión optimizada en WebP
    const outName = `${base}.webp`;
    const outPath = path.join(outDir, outName);
    const optimized = await sharp(buf)
      .resize({ width: maxWidth, withoutEnlargement: true })
      .webp({ quality })
      .toBuffer();
    await writeFile(outPath, optimized);

    // LQIP: miniatura de 24px de ancho, muy comprimida, embebida en base64
    const tiny = await sharp(buf)
      .resize({ width: 24 })
      .webp({ quality: 30 })
      .toBuffer();
    lqip[base] = `data:image/webp;base64,${tiny.toString('base64')}`;

    const before = (buf.length / 1024).toFixed(0);
    const after = (optimized.length / 1024).toFixed(0);
    console.log(`✓ ${src}  ${before}KB → ${after}KB  (/optimized/${outName})`);
  }

  const lqipPath = path.join(root, 'src', 'data', 'lqip.json');
  await writeFile(lqipPath, JSON.stringify(lqip, null, 2) + '\n');
  console.log(`✓ LQIP escrito en src/data/lqip.json (${Object.keys(lqip).length} entradas)`);
}

run().catch((err) => {
  console.error('✗ Error optimizando imágenes:', err);
  process.exit(1);
});
