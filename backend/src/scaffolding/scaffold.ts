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

// Servicios reservables por sector (alimentan el formulario de reservas del cliente).
const SECTOR_SERVICES: { keywords: string[]; services: { name: string; price: number; duration: string }[] }[] = [
  { keywords: ["restaurante", "bar", "cafeteria", "hosteler", "comida", "gastro", "pizzeria"], services: [
    { name: "Reserva de mesa", price: 0, duration: "Indica comensales" }, { name: "Mesa terraza", price: 0, duration: "Sujeto a clima" }, { name: "Evento privado", price: 0, duration: "Te llamamos" } ] },
  { keywords: ["clinica", "salud", "dental", "dentista", "medic", "fisio", "psicolog", "veterinari"], services: [
    { name: "Primera consulta", price: 40, duration: "45 min" }, { name: "Revisión", price: 30, duration: "30 min" }, { name: "Tratamiento", price: 60, duration: "60 min" } ] },
  { keywords: ["fontaner", "electric", "taller", "mecanic", "reform", "construc", "obra", "climatiz", "cerrajer"], services: [
    { name: "Presupuesto sin compromiso", price: 0, duration: "30 min" }, { name: "Diagnóstico técnico", price: 30, duration: "45 min" }, { name: "Reparación", price: 60, duration: "A valorar" } ] },
  { keywords: ["peluquer", "estetic", "belleza", "spa", "barber", "uñas", "manicura"], services: [
    { name: "Corte", price: 15, duration: "30 min" }, { name: "Corte + peinado", price: 25, duration: "45 min" }, { name: "Color", price: 45, duration: "90 min" } ] },
  { keywords: ["academia", "formacion", "escuela", "educa", "clases", "autoescuela", "coaching"], services: [
    { name: "Clase de prueba", price: 0, duration: "60 min" }, { name: "Sesión individual", price: 25, duration: "60 min" }, { name: "Asesoramiento", price: 0, duration: "30 min" } ] },
  { keywords: ["gimnasio", "fitness", "deport", "crossfit", "yoga", "pilates"], services: [
    { name: "Clase de prueba gratis", price: 0, duration: "60 min" }, { name: "Sesión con entrenador", price: 35, duration: "60 min" }, { name: "Valoración física", price: 0, duration: "30 min" } ] },
  { keywords: ["asesor", "gestor", "abogad", "legal", "consultor", "fiscal", "contab"], services: [
    { name: "Primera consulta", price: 0, duration: "30 min" }, { name: "Asesoría", price: 50, duration: "60 min" }, { name: "Gestión completa", price: 90, duration: "A valorar" } ] },
  { keywords: ["inmobiliar", "inmuebl", "piso", "vivienda", "real estate"], services: [
    { name: "Valoración gratuita", price: 0, duration: "45 min" }, { name: "Visita de inmueble", price: 0, duration: "30 min" }, { name: "Asesoría de compra/venta", price: 0, duration: "Te llamamos" } ] },
];

function servicesForSector(sector: string): { name: string; price: number; duration: string }[] {
  const n = (sector || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  for (const { keywords, services } of SECTOR_SERVICES) {
    if (keywords.some((k) => n.includes(k))) return services;
  }
  return [
    { name: "Consulta inicial", price: 0, duration: "30 min" },
    { name: "Servicio estándar", price: 40, duration: "60 min" },
    { name: "Servicio premium", price: 80, duration: "90 min" },
  ];
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

      const business = fullClientData?.businessContext || {};
      const billing = fullClientData?.billingData || {};

      // Datos combinados: usamos facturación si están, o el contexto, o los parámetros base.
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
  city: ${JSON.stringify(city)},
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
  },
  services: ${JSON.stringify(servicesForSector(sector))}
};
`;
      await writeFile(path.join(configDir, "business.ts"), businessTS);
      console.log(`   ✅ src/config/business.ts inyectado con los datos del cliente`);

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
