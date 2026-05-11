import { mkdir, copyFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const PROJECTS_DIR = './projects';

// ── Crea la carpeta base del proyecto
async function createProjectStructure(clienteId, tipo) {
  const base = path.join(PROJECTS_DIR, clienteId);
  const dirs = {
    corporativa: [
      base,
      `${base}/assets`,
      `${base}/assets/css`,
      `${base}/assets/js`,
      `${base}/assets/img`,
    ],
    dinamica: [
      base,
      `${base}/frontend`,
      `${base}/frontend/src`,
      `${base}/frontend/src/components`,
      `${base}/frontend/src/pages`,
      `${base}/backend`,
      `${base}/backend/src`,
      `${base}/backend/src/routes`,
      `${base}/assets`,
    ],
    ecommerce: [
      base,
      `${base}/storefront`,
      `${base}/storefront/src`,
      `${base}/storefront/src/components`,
      `${base}/storefront/src/pages`,
      `${base}/admin`,
      `${base}/assets`,
    ],
  };

  for (const dir of dirs[tipo] || dirs.corporativa) {
    await mkdir(dir, { recursive: true });
  }

  return base;
}

// ── Template SEO base — inyectado siempre, sin IA
function generateSEOTemplate(datos) {
  const { businessName, sector, city, primaryColor = '#1D9E75' } = datos;
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <!-- SEO BÁSICO -->
  <title>${businessName} | ${sector} en ${city}</title>
  <meta name="description" content="${businessName} — ${sector} profesional en ${city}. Contacta con nosotros para más información.">
  <meta name="robots" content="index, follow">
  <meta name="author" content="${businessName}">
  <link rel="canonical" href="https://[DOMINIO_CLIENTE]/">

  <!-- OPEN GRAPH -->
  <meta property="og:title" content="${businessName} | ${sector} en ${city}">
  <meta property="og:description" content="${businessName} — ${sector} profesional en ${city}.">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://[DOMINIO_CLIENTE]/">
  <meta property="og:image" content="https://[DOMINIO_CLIENTE]/assets/img/og-image.jpg">
  <meta property="og:locale" content="es_ES">

  <!-- TWITTER CARD -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${businessName}">
  <meta name="twitter:description" content="${sector} profesional en ${city}.">

  <!-- SCHEMA MARKUP — LocalBusiness -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": "${businessName}",
    "description": "${sector} en ${city}",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "${city}",
      "addressCountry": "ES"
    },
    "url": "https://[DOMINIO_CLIENTE]/",
    "telephone": "[TELEFONO_CLIENTE]",
    "email": "[EMAIL_CLIENTE]"
  }
  </script>

  <!-- ESTILOS -->
  <style>
    :root {
      --color-primary: ${primaryColor};
      --color-primary-dark: color-mix(in srgb, ${primaryColor} 80%, black);
      --color-primary-light: color-mix(in srgb, ${primaryColor} 20%, white);
      --font-heading: 'Inter', sans-serif;
      --font-body: 'Inter', sans-serif;
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: var(--font-body); color: #1a1a1a; line-height: 1.6; }
    img { max-width: 100%; height: auto; loading: lazy; }
  </style>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
</head>
<body>
  <!-- LA IA GENERA EL CONTENIDO AQUÍ -->
  <div id="avialo-content"></div>

  <!-- LEGAL ESPAÑA — OBLIGATORIO -->
  <footer id="legal-footer">
    <p>© ${new Date().getFullYear()} ${businessName} | CIF: [CIF_EMPRESA]</p>
    <nav>
      <a href="/aviso-legal">Aviso Legal</a> |
      <a href="/privacidad">Política de Privacidad</a> |
      <a href="/cookies">Política de Cookies</a>
    </nav>
  </footer>

  <!-- BANNER COOKIES AEPD -->
  <div id="cookie-banner" style="display:none;position:fixed;bottom:0;left:0;right:0;background:#1a1a1a;color:#fff;padding:16px;text-align:center;z-index:9999">
    <p>Usamos cookies para mejorar tu experiencia. <a href="/cookies" style="color:var(--color-primary)">Más info</a></p>
    <button onclick="document.getElementById('cookie-banner').style.display='none';localStorage.setItem('cookies','accepted')" 
      style="margin-left:12px;padding:8px 20px;background:var(--color-primary);color:#fff;border:none;border-radius:6px;cursor:pointer">
      Aceptar
    </button>
  </div>
  <script>if(!localStorage.getItem('cookies'))document.getElementById('cookie-banner').style.display='block'</script>
</body>
</html>`;
}

// ── Sitemap base
function generateSitemap(dominio, pages) {
  const urls = pages.map(p => `
  <url>
    <loc>https://${dominio}/${p === 'Inicio' ? '' : p.toLowerCase().replace(/ /g, '-')}</loc>
    <changefreq>monthly</changefreq>
    <priority>${p === 'Inicio' ? '1.0' : '0.8'}</priority>
  </url>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}

// ── Robots.txt base
function generateRobots(dominio) {
  return `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Sitemap: https://${dominio}/sitemap.xml`;
}

// ── Función principal
export async function scaffoldProject(clienteId, datos) {
  const { webType, businessName, sector, city, pages = ['Inicio', 'Servicios', 'Contacto'], primaryColor } = datos;

  console.log(`\n🏗️  Scaffolding: ${clienteId} (${webType})`);

  if (existsSync(path.join(PROJECTS_DIR, clienteId))) {
    console.log(`   ⚠️  Proyecto ya existe — saltando scaffold`);
    return { success: false, reason: 'already_exists' };
  }
    if (webType === 'ecommerce') {
    console.log(`   ⏳ Ecommerce — pendiente de template Medusa en repositorio`);
    return {
        success: false,
        reason: 'pending-medusa-setup',
        note: 'Crear repositorio avialo/medusa-template en GitHub y configurar git clone aquí',
        clienteId,
        webType,
    };
    }
  const base = await createProjectStructure(clienteId, webType);
  console.log(`   ✅ Carpetas creadas`);

  const seoHTML = generateSEOTemplate({ businessName, sector, city, primaryColor });
  await writeFile(path.join(base, 'index.html'), seoHTML);
  console.log(`   ✅ SEO template inyectado`);

  const dominio = `${businessName.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')}.avialo.app`;
  await writeFile(path.join(base, 'sitemap.xml'), generateSitemap(dominio, pages));
  await writeFile(path.join(base, 'robots.txt'), generateRobots(dominio));
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
    status: 'scaffolded',
  };
  await writeFile(path.join(base, 'avialo-meta.json'), JSON.stringify(meta, null, 2));
  console.log(`   ✅ Meta guardada`);

  console.log(`   🎉 Scaffold completo → ${base}\n`);
  return { success: true, base, dominio, meta };
}