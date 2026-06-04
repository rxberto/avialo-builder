import { mkdir, writeFile, cp } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { sandboxPath } from "../config/sandbox.js";
import { defaultBusinessConfig, renderBusinessTs } from "./businessConfig.js";

export interface ScaffoldData {
  webType: "corporativa" | "dinamica" | "ecommerce" | string;
  businessName: string;
  sector: string;
  city: string;
  primaryColor?: string;
  pages?: string[];
  fullClientData?: Record<string, any>;
}

// ── Crea la carpeta base del proyecto (Fallback)
async function createProjectStructure(clienteId: string, tipo: string) {
  const base = sandboxPath(clienteId);
  const dirs = [
    base,
    `${base}/assets`,
    `${base}/assets/css`,
    `${base}/assets/js`,
    `${base}/assets/img`,
  ];

  for (const dir of dirs) {
    await mkdir(dir, { recursive: true });
  }

  return base;
}

// ── Template SEO base (Para fallbacks estáticos)
function generateSEOTemplate(datos: { businessName: string; sector: string; city: string; primaryColor?: string }) {
  const { businessName, sector, city, primaryColor = "#1D9E75" } = datos;
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${businessName} | ${sector} en ${city}</title>
  <meta name="description" content="${businessName} — ${sector} profesional en ${city}.">
</head>
<body>
  <h1>${businessName}</h1>
</body>
</html>`;
}

// ── Sitemap base
function generateSitemap(dominio: string, pages: string[]) {
  const urls = pages.map(p => `
  <url>
    <loc>https://${dominio}/${p === "Inicio" ? "" : p.toLowerCase().replace(/ /g, "-")}</loc>
    <changefreq>monthly</changefreq>
    <priority>${p === "Inicio" ? "1.0" : "0.8"}</priority>
  </url>`).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}

// ── Robots.txt base
function generateRobots(dominio: string) {
  return `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Sitemap: https://${dominio}/sitemap.xml`;
}

// ── Función principal de Scaffolding
export async function scaffoldProject(clienteId: string, datos: ScaffoldData): Promise<{ success: boolean; base?: string; dominio?: string; reason?: string; error?: string }> {
  const { webType, businessName, sector, city, pages = ["Inicio", "Servicios", "Contacto"], primaryColor, fullClientData } = datos;

  console.log(`\n🏗️  Scaffolding: ${clienteId} (${webType})`);

  const base = sandboxPath(clienteId);

  if (existsSync(base)) {
    console.log(`   ⚠️  Proyecto ya existe — saltando scaffold`);
    return { success: false, reason: "already_exists" };
  }

  // Definir origen de boilerplate basado en el tipo de web con resolución inteligente de rutas
  let sourceBoilerplate = webType === "ecommerce"
    ? "boilerplates/ecommerce"
    : "boilerplates/corporate";

  if (!existsSync(sourceBoilerplate) && existsSync(path.join("..", sourceBoilerplate))) {
    sourceBoilerplate = path.join("..", sourceBoilerplate);
  }

  try {
    // Si el boilerplate existe localmente, lo clonamos/copiamos directamente de forma ultra rápida
    if (existsSync(sourceBoilerplate)) {
      console.log(`   ⏳ Copiando boilerplate desde ${sourceBoilerplate}...`);
      await cp(sourceBoilerplate, base, { recursive: true });
      console.log(`   ✅ Boilerplate copiado con éxito`);
    } else {
      // Fallback a estructura de carpetas básica si no existen los boilerplates localmente
      console.log(`   ⚠️  Boilerplate no encontrado en ${sourceBoilerplate}. Generando estructura básica...`);
      await createProjectStructure(clienteId, webType);
      const seoHTML = generateSEOTemplate({ businessName, sector, city, primaryColor });
      await writeFile(path.join(base, "index.html"), seoHTML);
    }

    const dominio = `${businessName.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "")}.avialo.app`;

    // Inyectar archivos SEO y configuración dinámica sobre el boilerplate clonado
    await writeFile(path.join(base, "sitemap.xml"), generateSitemap(dominio, pages));
    await writeFile(path.join(base, "robots.txt"), generateRobots(dominio));
    console.log(`   ✅ sitemap.xml y robots.txt generados`);

    const meta = {
      clienteId,
      webType,
      businessName,
      sector,
      city,
      primaryColor,
      pages,
      dominio,
      createdAt: new Date().toISOString(),
      status: "scaffolded",
    };
    await writeFile(path.join(base, "avialo-meta.json"), JSON.stringify(meta, null, 2));
    console.log(`   ✅ Meta guardada`);

    // Inyectar config/business.ts SIEMPRE (el layout/páginas dependen de businessConfig).
    {
      const srcDir = path.join(base, "src");
      const configDir = path.join(srcDir, "config");

      if (!existsSync(srcDir)) await mkdir(srcDir, { recursive: true });
      if (!existsSync(configDir)) await mkdir(configDir, { recursive: true });

      // Config inicial del negocio (fuente única para layout/footer/legal/SEO/contacto).
      const siteConfig = defaultBusinessConfig({ businessName, sector, city, primaryColor, dominio, fullClientData });
      await writeFile(path.join(configDir, "business.ts"), renderBusinessTs(siteConfig));
      // Sidecar JSON: fuente de verdad estructurada para el panel ⚙️ del IDE (Fase 7).
      await writeFile(path.join(base, "avialo.config.json"), JSON.stringify(siteConfig, null, 2));
      console.log(`   ✅ src/config/business.ts + avialo.config.json inyectados con los datos del cliente`);

      const companyName = siteConfig.name;

      // Favicon dinámico: cuadro redondeado con el color de marca y la inicial del negocio.
      // SVG estático (cero riesgo de build); Next usa src/app/icon.svg como favicon.
      const safeLetter = (companyName.trim()[0] || "A").toUpperCase().replace(/[<>&"']/g, "");
      const brand = /^#[0-9a-fA-F]{3,8}$/.test(primaryColor || "") ? primaryColor : "#2563eb";
      const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${brand}"/><text x="32" y="45" font-family="Segoe UI, Arial, sans-serif" font-size="38" font-weight="700" fill="#ffffff" text-anchor="middle">${safeLetter}</text></svg>`;
      const appDir = path.join(srcDir, "app");
      if (existsSync(appDir)) {
        await writeFile(path.join(appDir, "icon.svg"), iconSvg);
        console.log(`   ✅ Favicon src/app/icon.svg generado con la marca`);
      }
    }

    console.log(`   🎉 Scaffold completo → ${base}\n`);
    return { success: true, base, dominio };

  } catch (error: any) {
    console.error(`❌ Error durante el scaffolding del proyecto:`, error);
    return { success: false, reason: "scaffold_failed", error: error.message };
  }
}
