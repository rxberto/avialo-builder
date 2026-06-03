import { mkdir, writeFile, cp } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { sandboxPath } from "../config/sandbox.js";

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

    // Inyectar config/business.ts para que la web tenga los datos reales desde el principio
    if (fullClientData) {
      const srcDir = path.join(base, "src");
      const configDir = path.join(srcDir, "config");
      
      if (!existsSync(srcDir)) await mkdir(srcDir, { recursive: true });
      if (!existsSync(configDir)) await mkdir(configDir, { recursive: true });

      const business = fullClientData.businessContext || {};
      const billing = fullClientData.billingData || {};
      
      // Datos combinados: usamos facturación si están, o el contexto
      const companyName = billing.companyName || business.name || businessName;
      const cif = billing.cif || "Pendiente";
      const phone = business.phone || "+34 900 000 000";
      const email = business.email || `contacto@${dominio}`;
      const fullAddress = billing.address 
        ? `${billing.address}, ${billing.postalCode || ''} ${billing.city || city}, ${billing.country || 'España'}`
        : `${city}, España`;

      const businessTS = `// Configuración de negocio inyectada automáticamente por Avialo Builder
export const businessConfig = {
  name: ${JSON.stringify(companyName)},
  cif: ${JSON.stringify(cif)},
  sector: ${JSON.stringify(sector)},
  contact: {
    phone: ${JSON.stringify(phone)},
    email: ${JSON.stringify(email)},
    address: ${JSON.stringify(fullAddress)}
  },
  social: {
    instagram: ${JSON.stringify(business.instagram || "")},
    facebook: ${JSON.stringify(business.facebook || "")},
    linkedin: ${JSON.stringify(business.linkedin || "")}
  },
  theme: {
    primaryColor: ${JSON.stringify(primaryColor)}
  }
};
`;
      await writeFile(path.join(configDir, "business.ts"), businessTS);
      console.log(`   ✅ src/config/business.ts inyectado con los datos de facturación y onboarding`);
    }

    console.log(`   🎉 Scaffold completo → ${base}\n`);
    return { success: true, base, dominio };

  } catch (error: any) {
    console.error(`❌ Error durante el scaffolding del proyecto:`, error);
    return { success: false, reason: "scaffold_failed", error: error.message };
  }
}
