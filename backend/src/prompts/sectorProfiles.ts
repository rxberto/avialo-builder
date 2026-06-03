// ============================================
// PERFILES DE DISEÑO POR SECTOR
// ============================================
// La mayoría de pymes no tiene criterio de diseño. Según el sector que marcan en el
// onboarding (restaurante, clínica, etc.) inyectamos parámetros visuales y de estructura
// con buenas prácticas ya decididas: paleta, tipografía, secciones clave, tono y CTA.
//
// Se usa en el prompt de generación (agent/loop.ts) para que el modelo no improvise el
// estilo desde cero, sino que parta de una dirección de arte coherente con el rubro.

export interface SectorProfile {
  /** Etiqueta legible del sector detectado. */
  label: string;
  /** Paleta sugerida (el color de marca del cliente manda; esto complementa/armoniza). */
  palette: string;
  /** Estética tipográfica y de UI. */
  style: string;
  /** Secciones recomendadas en la home, en orden. */
  sections: string[];
  /** Estilo de imágenes/iconografía. */
  imagery: string;
  /** Tono del copy. */
  tone: string;
  /** Llamada a la acción principal (la conversión que importa en ese sector). */
  primaryCta: string;
}

// Perfil por defecto: profesional neutro y de confianza.
const DEFAULT_PROFILE: SectorProfile = {
  label: "Negocio profesional",
  palette: "Tonos sobrios y profesionales sobre fondo claro; usa el color de marca para acentos y botones.",
  style: "Diseño limpio y moderno, mucho espacio en blanco, tipografía sans-serif legible (Inter), tarjetas con bordes suaves.",
  sections: ["Hero con propuesta de valor", "Servicios", "Sobre nosotros", "Testimonios", "Contacto con mapa"],
  imagery: "Fotografía real del negocio o stock profesional; iconos lineales para servicios.",
  tone: "Cercano pero profesional, orientado a generar confianza.",
  primaryCta: "Contactar / Pedir presupuesto",
};

// Catálogo de perfiles. La clave es una lista de palabras que deben aparecer en el sector.
const PROFILES: { keywords: string[]; profile: SectorProfile }[] = [
  {
    keywords: ["restaurante", "bar", "cafeteria", "hosteler", "comida", "gastro", "pizzeria"],
    profile: {
      label: "Restaurante / Hostelería",
      palette: "Cálida y apetitosa: tonos tierra, ámbar, vino o verde oliva sobre fondo crema/oscuro elegante.",
      style: "Estética acogedora y sensorial, tipografía con un display serif para títulos, imágenes grandes a sangre.",
      sections: ["Hero con foto del plato estrella", "Carta/Menú destacado", "Reserva de mesa", "Galería de ambiente", "Ubicación y horarios"],
      imagery: "Fotografía de platos y ambiente del local, primeros planos apetitosos.",
      tone: "Evocador y cercano, que dé hambre y ganas de visitar.",
      primaryCta: "Reservar mesa",
    },
  },
  {
    keywords: ["clinica", "salud", "dental", "dentista", "medic", "fisio", "psicolog", "veterinari"],
    profile: {
      label: "Clínica / Salud",
      palette: "Limpia y confiable: blancos, azules y verdes suaves; mucho aire, sensación de higiene.",
      style: "Minimalista y tranquilo, tipografía sans-serif clara, bordes redondeados, nada estridente.",
      sections: ["Hero con mensaje de confianza", "Tratamientos/Servicios", "Equipo médico", "Pedir cita online", "Testimonios de pacientes", "Ubicación"],
      imagery: "Fotografía de instalaciones limpias y equipo humano sonriente; iconos médicos sobrios.",
      tone: "Profesional, empático y tranquilizador.",
      primaryCta: "Pedir cita",
    },
  },
  {
    keywords: ["fontaner", "electric", "taller", "mecanic", "reform", "construc", "obra", "climatiz", "cerrajer"],
    profile: {
      label: "Oficios / Servicios técnicos",
      palette: "Robusta y directa: azul trabajo, naranja/amarillo seguridad, gris industrial sobre fondo claro.",
      style: "Sólido y funcional, tipografía sans-serif fuerte, badges de confianza (24h, urgencias, presupuesto gratis).",
      sections: ["Hero con servicio + teléfono visible", "Servicios", "Zona de cobertura", "Por qué elegirnos", "Presupuesto sin compromiso", "Contacto urgente"],
      imagery: "Fotografía de trabajos reales y profesionales en acción; iconos de herramientas.",
      tone: "Directo, resolutivo y de confianza; enfatiza rapidez y garantía.",
      primaryCta: "Llamar / Pedir presupuesto",
    },
  },
  {
    keywords: ["peluquer", "estetic", "belleza", "spa", "barber", "uñas", "manicura"],
    profile: {
      label: "Peluquería / Estética",
      palette: "Elegante y femenina por defecto: nude, rosa empolvado, dorado o negro chic; muy cuidada.",
      style: "Estética premium y aspiracional, tipografía con serif fino, mucho detalle visual.",
      sections: ["Hero aspiracional", "Servicios y precios", "Reserva de cita", "Galería de trabajos", "Equipo", "Ubicación"],
      imagery: "Fotografía de resultados, before/after, ambiente cuidado.",
      tone: "Cuidado, cercano y aspiracional.",
      primaryCta: "Reservar cita",
    },
  },
  {
    keywords: ["academia", "formacion", "escuela", "educa", "clases", "autoescuela", "coaching"],
    profile: {
      label: "Academia / Formación",
      palette: "Confiable y dinámica: azul conocimiento + un acento vivo; fondo claro ordenado.",
      style: "Estructura clara orientada a información, tipografía legible, tarjetas de cursos.",
      sections: ["Hero con propuesta formativa", "Cursos/Programas", "Metodología", "Profesorado", "Resultados/Testimonios", "Solicitar información"],
      imagery: "Fotografía de aulas/alumnos; iconos de materias.",
      tone: "Motivador y riguroso a la vez.",
      primaryCta: "Solicitar información / Matricularse",
    },
  },
  {
    keywords: ["tienda", "comercio", "boutique", "ecommerce", "shop", "moda", "ferreteria"],
    profile: {
      label: "Tienda / Comercio",
      palette: "Vibrante y comercial: color de marca protagonista, fondos claros que resaltan producto.",
      style: "Orientado a producto, retícula de tarjetas, llamadas a la acción claras de compra.",
      sections: ["Hero con promoción/destacado", "Categorías", "Productos destacados", "Ventajas (envío, devoluciones)", "Reseñas", "Contacto"],
      imagery: "Fotografía de producto sobre fondo neutro, lifestyle.",
      tone: "Comercial y persuasivo, sin perder cercanía.",
      primaryCta: "Comprar / Ver catálogo",
    },
  },
  {
    keywords: ["asesor", "gestor", "abogad", "legal", "consultor", "fiscal", "contab"],
    profile: {
      label: "Asesoría / Servicios profesionales",
      palette: "Seria y corporativa: azul marino o gris pizarra + acento sobrio sobre blanco.",
      style: "Corporativo y formal, tipografía sans-serif clásica, mucha estructura y claridad.",
      sections: ["Hero con propuesta de valor", "Áreas/Servicios", "Equipo", "Casos/Confianza", "Solicitar consulta", "Contacto"],
      imagery: "Fotografía corporativa sobria del equipo y oficina; iconografía minimalista.",
      tone: "Riguroso, profesional y de máxima confianza.",
      primaryCta: "Solicitar consulta",
    },
  },
  {
    keywords: ["inmobiliar", "inmuebl", "piso", "vivienda", "real estate"],
    profile: {
      label: "Inmobiliaria",
      palette: "Premium y aspiracional: tonos neutros, negro/dorado o azul profundo; sensación de calidad.",
      style: "Visual y elegante, fotos grandes de inmuebles, fichas con datos claros.",
      sections: ["Hero con buscador/destacados", "Propiedades destacadas", "Servicios (compra/venta/alquiler)", "Por qué nosotros", "Valoración gratuita", "Contacto"],
      imagery: "Fotografía profesional de inmuebles, interiores luminosos.",
      tone: "Profesional y aspiracional, transmite exclusividad y confianza.",
      primaryCta: "Ver propiedades / Solicitar valoración",
    },
  },
  {
    keywords: ["gimnasio", "fitness", "deport", "crossfit", "yoga", "pilates"],
    profile: {
      label: "Gimnasio / Fitness",
      palette: "Enérgica y potente: negro + acento neón (lima, naranja, eléctrico); alto contraste.",
      style: "Dinámico y motivador, tipografía sans-serif bold, imágenes a sangre con movimiento.",
      sections: ["Hero motivador", "Clases/Servicios", "Tarifas", "Instalaciones", "Entrenadores", "Apúntate/Prueba gratis"],
      imagery: "Fotografía de entrenamiento con energía y movimiento.",
      tone: "Motivador, retador y enérgico.",
      primaryCta: "Apúntate / Prueba gratis",
    },
  },
];

/**
 * Devuelve el perfil de diseño para un sector dado (matching flexible por palabras clave).
 * Si no reconoce el sector, devuelve un perfil profesional por defecto.
 */
export function getSectorProfile(sector: string | undefined | null): SectorProfile {
  const normalized = (sector || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, ""); // quitar tildes para un match robusto

  if (!normalized) return DEFAULT_PROFILE;

  for (const { keywords, profile } of PROFILES) {
    if (keywords.some((k) => normalized.includes(k))) return profile;
  }
  return DEFAULT_PROFILE;
}

// Banco de imágenes (Unsplash CDN, URLs estables) por palabra clave de sector. Se inyectan en
// el prompt para que la home SIEMPRE tenga fotos reales y acordes, sin pedirlas al usuario.
const U = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1600&q=80`;
const SECTOR_IMAGES: { keywords: string[]; images: string[] }[] = [
  { keywords: ["restaurante", "bar", "cafeteria", "hosteler", "comida", "gastro", "pizzeria"], images: [U("1517248135467-4c7edcad34c4"), U("1414235077428-338989a2e8c0"), U("1555396273-367ea4eb4db5")] },
  { keywords: ["clinica", "salud", "dental", "dentista", "medic", "fisio", "psicolog", "veterinari"], images: [U("1576091160550-2173dba999ef"), U("1631217868264-e5b90bb7e133"), U("1612349317150-e413f6a5b16d")] },
  { keywords: ["fontaner", "electric", "taller", "mecanic", "reform", "construc", "obra", "climatiz", "cerrajer"], images: [U("1581578731548-c64695cc6952"), U("1504148455328-c376907d081c"), U("1521791136064-7986c2920216")] },
  { keywords: ["peluquer", "estetic", "belleza", "spa", "barber", "uñas", "manicura"], images: [U("1560066984-138dadb4c035"), U("1521590832167-7bcbfaa6381f"), U("1487412947147-5cebf100ffc2")] },
  { keywords: ["academia", "formacion", "escuela", "educa", "clases", "autoescuela", "coaching"], images: [U("1509062522246-3755977927d7"), U("1503676260728-1c00da094a0b"), U("1513258496099-48168024aec0")] },
  { keywords: ["tienda", "comercio", "boutique", "ecommerce", "shop", "moda", "ferreteria"], images: [U("1441986300917-64674bd600d8"), U("1472851294608-062f824d29cc"), U("1483985988355-763728e1935b")] },
  { keywords: ["asesor", "gestor", "abogad", "legal", "consultor", "fiscal", "contab"], images: [U("1521791136064-7986c2920216"), U("1454165804606-c3d57bc86b40"), U("1556761175-5973dc0f32e7")] },
  { keywords: ["inmobiliar", "inmuebl", "piso", "vivienda", "real estate"], images: [U("1560518883-ce09059eeffa"), U("1568605114967-8130f3a36994"), U("1570129477492-45c003edd2be")] },
  { keywords: ["gimnasio", "fitness", "deport", "crossfit", "yoga", "pilates"], images: [U("1534438327276-14e5300c3a48"), U("1571019613454-1cb2f99b2d8b"), U("1517836357463-d25dfeac3438")] },
];
const DEFAULT_IMAGES = [U("1497366216548-37526070297c"), U("1486406146926-c627a92ad1ab"), U("1600880292203-757bb62b4baf")];

export function getSectorImages(sector: string | undefined | null): string[] {
  const n = (sector || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  for (const { keywords, images } of SECTOR_IMAGES) {
    if (keywords.some((k) => n.includes(k))) return images;
  }
  return DEFAULT_IMAGES;
}

/**
 * Renderiza el perfil como bloque de directrices para inyectar en el prompt de la IA.
 */
export function renderSectorDirectives(sector: string | undefined | null, brandColor?: string): string {
  const p = getSectorProfile(sector);
  const imgs = getSectorImages(sector);
  return `
DIRECTRICES DE DISEÑO PARA EL SECTOR "${p.label}" (el cliente no es diseñador: aplica estas buenas prácticas):
- Paleta: usa el color de marca con las clases Tailwind del tema (bg-primary, text-primary, border-primary, ring-primary): YA está configurado con el color del cliente${brandColor ? ` (${brandColor})` : ""}. Complementa con ${p.palette}
- Estilo visual: ${p.style}
- Secciones recomendadas en la home (en este orden): ${p.sections.join(" → ")}.
- IMÁGENES REALES (úsalas con <img>, NO next/image): hero -> ${imgs[0]} ; secciones -> ${imgs[1]}${imgs[2] ? `, ${imgs[2]}` : ""}. Pon object-cover y alt descriptivo. ${p.imagery}
- Tono del texto: ${p.tone}
- Llamada a la acción principal (debe ser muy visible y repetirse): "${p.primaryCta}".
Prioriza una primera impresión profesional y orientada a la conversión propia de este sector.`.trim();
}
