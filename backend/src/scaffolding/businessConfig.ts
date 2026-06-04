// ============================================
// CONFIGURACIÓN DE NEGOCIO (fuente única) — FASE 7
// ============================================
// `src/config/business.ts` es la fuente de verdad de la web generada: el layout, footer,
// páginas legales, contacto y el SEO leen de aquí. Este módulo centraliza:
//   - el shape de la config,
//   - cómo se construye por defecto al generar (defaultBusinessConfig),
//   - cómo se serializa a TS (renderBusinessTs),
//   - qué campos puede editar el cliente desde el panel ⚙️ del IDE (mergeEditableConfig).
// El panel reescribe esta config de forma DETERMINISTA (sin IA), por eso es 100% fiable.

export interface BusinessService {
  name: string;
  price: number;
  duration: string;
}

export interface SiteConfig {
  name: string;
  cif: string;
  sector: string;
  city: string;
  contact: { phone: string; email: string; address: string };
  social: { instagram: string; facebook: string; linkedin: string };
  theme: { primaryColor: string };
  services: BusinessService[];
  // SEO editable (si vacío, el layout deriva un title/description del negocio).
  seo: { title: string; description: string };
  // Formulario de contacto. provider "formsubmit" envía a formsubmit.co/ajax/<email>.
  forms: { provider: "none" | "formsubmit"; email: string };
}

// Servicios reservables por sector (alimentan /reservar y la home).
const SECTOR_SERVICES: { keywords: string[]; services: BusinessService[] }[] = [
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

export function servicesForSector(sector: string): BusinessService[] {
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

export interface DefaultConfigInput {
  businessName: string;
  sector: string;
  city: string;
  primaryColor?: string;
  dominio: string;
  fullClientData?: Record<string, any>;
}

/** Construye la config inicial del negocio a partir de los datos del onboarding. */
export function defaultBusinessConfig(input: DefaultConfigInput): SiteConfig {
  const { businessName, sector, city, primaryColor, dominio, fullClientData } = input;
  const business = fullClientData?.businessContext || {};
  const billing = fullClientData?.billingData || {};

  const companyName = billing.companyName || business.name || businessName;
  const cif = billing.cif || "Pendiente";
  const phone = business.phone || "+34 900 000 000";
  const email = business.email || `contacto@${dominio}`;
  const fullAddress = billing.address
    ? `${billing.address}, ${billing.postalCode || ""} ${billing.city || city}, ${billing.country || "España"}`
    : `${city}, España`;

  return {
    name: companyName,
    cif,
    sector,
    city,
    contact: { phone, email, address: fullAddress },
    social: {
      instagram: business.instagram || "",
      facebook: business.facebook || "",
      linkedin: business.linkedin || "",
    },
    theme: { primaryColor: primaryColor || "#2563eb" },
    services: servicesForSector(sector),
    seo: { title: "", description: "" },
    forms: { provider: "none", email: "" },
  };
}

/** Serializa la config a `src/config/business.ts`. JSON.stringify garantiza escapado seguro. */
export function renderBusinessTs(config: SiteConfig): string {
  return `// Configuración de negocio inyectada por Avialo Builder (fuente única: layout, footer, legal, SEO, contacto).
// Editable de forma segura desde el panel de Configuración del IDE.
export const businessConfig = ${JSON.stringify(config, null, 2)};
`;
}

// Campos que el cliente puede editar desde el panel ⚙️ (whitelist anti-inyección).
export interface EditableConfigPatch {
  name?: string;
  cif?: string;
  contact?: Partial<SiteConfig["contact"]>;
  social?: Partial<SiteConfig["social"]>;
  seo?: Partial<SiteConfig["seo"]>;
  forms?: Partial<SiteConfig["forms"]>;
}

function str(v: unknown, max = 2000): string {
  return typeof v === "string" ? v.slice(0, max).trim() : "";
}

/**
 * Mezcla un patch del panel sobre la config actual, copiando SOLO campos permitidos y saneando
 * tipos. Nunca permite cambiar theme/services/sector/city ni inyectar claves arbitrarias.
 */
export function mergeEditableConfig(current: SiteConfig, patch: EditableConfigPatch): SiteConfig {
  const next: SiteConfig = {
    ...current,
    contact: { ...current.contact },
    social: { ...current.social },
    theme: { ...current.theme },
    seo: { ...current.seo },
    forms: { ...current.forms },
    services: current.services,
  };

  if (typeof patch.name === "string") next.name = str(patch.name, 120) || current.name;
  if (typeof patch.cif === "string") next.cif = str(patch.cif, 40) || current.cif;

  if (patch.contact) {
    if (patch.contact.phone !== undefined) next.contact.phone = str(patch.contact.phone, 60);
    if (patch.contact.email !== undefined) next.contact.email = str(patch.contact.email, 160);
    if (patch.contact.address !== undefined) next.contact.address = str(patch.contact.address, 300);
  }
  if (patch.social) {
    if (patch.social.instagram !== undefined) next.social.instagram = str(patch.social.instagram, 200);
    if (patch.social.facebook !== undefined) next.social.facebook = str(patch.social.facebook, 200);
    if (patch.social.linkedin !== undefined) next.social.linkedin = str(patch.social.linkedin, 200);
  }
  if (patch.seo) {
    if (patch.seo.title !== undefined) next.seo.title = str(patch.seo.title, 120);
    if (patch.seo.description !== undefined) next.seo.description = str(patch.seo.description, 320);
  }
  if (patch.forms) {
    if (patch.forms.provider !== undefined) {
      next.forms.provider = patch.forms.provider === "formsubmit" ? "formsubmit" : "none";
    }
    if (patch.forms.email !== undefined) next.forms.email = str(patch.forms.email, 160);
  }

  return next;
}

/**
 * Normaliza un objeto arbitrario (p.ej. leído de un sidecar JSON o de un site antiguo) a un
 * SiteConfig completo, rellenando los campos nuevos (seo/forms) si faltan.
 */
export function normalizeConfig(raw: any, fallback: SiteConfig): SiteConfig {
  if (!raw || typeof raw !== "object") return fallback;
  return {
    name: typeof raw.name === "string" ? raw.name : fallback.name,
    cif: typeof raw.cif === "string" ? raw.cif : fallback.cif,
    sector: typeof raw.sector === "string" ? raw.sector : fallback.sector,
    city: typeof raw.city === "string" ? raw.city : fallback.city,
    contact: { ...fallback.contact, ...(raw.contact || {}) },
    social: { ...fallback.social, ...(raw.social || {}) },
    theme: { ...fallback.theme, ...(raw.theme || {}) },
    services: Array.isArray(raw.services) ? raw.services : fallback.services,
    seo: { ...fallback.seo, ...(raw.seo || {}) },
    forms: {
      provider: raw.forms?.provider === "formsubmit" ? "formsubmit" : "none",
      email: typeof raw.forms?.email === "string" ? raw.forms.email : fallback.forms.email,
    },
  };
}
