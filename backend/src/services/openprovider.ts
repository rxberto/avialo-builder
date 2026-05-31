import { openproviderConfig, isOpenproviderConfigured } from "../config/openprovider.js";

// ============================================
// CLIENTE DE OPENPROVIDER (REST v1beta)
// ============================================
// Implementa: login (token cacheado), comprobación de disponibilidad, registro de
// dominio y creación de zona DNS con un registro A apuntando al droplet.

interface SplitDomain {
  name: string;       // parte sin extensión, p.ej. "miempresa"
  extension: string;  // p.ej. "es" o "com"
}

export interface AvailabilityResult {
  domain: string;
  available: boolean;
  premium?: boolean;
  price?: number;
}

let cachedToken: string | null = null;
let tokenObtainedAt = 0;
const TOKEN_TTL_MS = 10 * 60 * 60 * 1000; // ~10h

function ensureConfigured(): void {
  if (!isOpenproviderConfigured()) {
    throw new Error("Openprovider no está configurado (faltan OPENPROVIDER_USERNAME/PASSWORD/OWNER_HANDLE).");
  }
}

/**
 * Divide "miempresa.es" en { name: "miempresa", extension: "es" }.
 */
export function splitDomain(fqdn: string): SplitDomain {
  const clean = fqdn.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  const idx = clean.indexOf(".");
  if (idx === -1) throw new Error(`Dominio inválido: ${fqdn}`);
  return { name: clean.slice(0, idx), extension: clean.slice(idx + 1) };
}

async function opFetch(path: string, options: { method?: string; body?: unknown; auth?: boolean } = {}): Promise<any> {
  const { method = "GET", body, auth = true } = options;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) {
    const token = await login();
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${openproviderConfig.baseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const json: any = await res.json().catch(() => ({}));
  if (!res.ok || (json && json.code && json.code !== 0)) {
    const msg = json?.desc || json?.message || `HTTP ${res.status}`;
    throw new Error(`Openprovider API error: ${msg}`);
  }
  return json;
}

/**
 * Autentica contra Openprovider y devuelve un token (cacheado ~10h).
 */
export async function login(): Promise<string> {
  ensureConfigured();
  if (cachedToken && Date.now() - tokenObtainedAt < TOKEN_TTL_MS) {
    return cachedToken;
  }

  const res = await fetch(`${openproviderConfig.baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: openproviderConfig.username,
      password: openproviderConfig.password,
    }),
  });

  const json: any = await res.json().catch(() => ({}));
  const token = json?.data?.token;
  if (!res.ok || !token) {
    throw new Error(`Fallo de autenticación con Openprovider: ${json?.desc || res.status}`);
  }

  cachedToken = token;
  tokenObtainedAt = Date.now();
  return token;
}

/**
 * Comprueba la disponibilidad de uno o varios dominios.
 */
export async function checkAvailability(domains: string[]): Promise<AvailabilityResult[]> {
  ensureConfigured();
  const split = domains.map(splitDomain);

  const json = await opFetch("/domains/check", {
    method: "POST",
    body: {
      domains: split.map((d) => ({ name: d.name, extension: d.extension })),
      with_price: true,
    },
  });

  const results: any[] = json?.data?.results || [];
  return results.map((r) => ({
    domain: r.domain,
    available: r.status === "free",
    premium: r.is_premium ?? false,
    price: r.price?.product?.price ?? undefined,
  }));
}

/**
 * Registra un dominio bajo el owner handle de Avialo, con DNS gestionado por Openprovider.
 */
export async function registerDomain(fqdn: string): Promise<{ id: number; domain: string }> {
  ensureConfigured();
  const { name, extension } = splitDomain(fqdn);
  const handle = openproviderConfig.ownerHandle!;

  const json = await opFetch("/domains", {
    method: "POST",
    body: {
      domain: { name, extension },
      period: 1,
      owner_handle: handle,
      admin_handle: handle,
      tech_handle: handle,
      billing_handle: handle,
      name_servers: openproviderConfig.nameServers.map((n) => ({ name: n })),
      autorenew: "default",
    },
  });

  return { id: json?.data?.id, domain: fqdn };
}

/**
 * Crea (o sobrescribe) la zona DNS del dominio con un registro A raíz y www
 * apuntando a la IP del droplet de Avialo.
 */
export async function createDnsZoneWithARecord(fqdn: string): Promise<void> {
  ensureConfigured();
  const { name, extension } = splitDomain(fqdn);
  const ip = openproviderConfig.dnsTargetIp;

  await opFetch("/dns/zones", {
    method: "POST",
    body: {
      domain: { name, extension },
      type: "master",
      records: [
        { type: "A", name: "", value: ip, ttl: 3600 },      // raíz @
        { type: "A", name: "www", value: ip, ttl: 3600 },   // www
      ],
    },
  });
}

/**
 * Flujo completo: registra el dominio y crea su zona DNS apuntando al droplet.
 */
export async function provisionDomain(fqdn: string): Promise<{ domain: string; id: number }> {
  const result = await registerDomain(fqdn);
  await createDnsZoneWithARecord(fqdn);
  return result;
}
