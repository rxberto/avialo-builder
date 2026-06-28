// ============================================================================
// STRIPE CONNECT — cobros de la TIENDA del cliente (comprador → pyme).
// ----------------------------------------------------------------------------
// Avialo es la PLATAFORMA. Cada pyme conecta su propia cuenta Stripe (Express) vía
// el onboarding hospedado de Stripe. Los cobros de la storefront se enrutan a esa
// cuenta (destination charges). NO custodiamos claves secretas del cliente: Stripe
// gestiona PCI, KYC y liquidaciones. Solo guardamos el id de la cuenta (acct_...) y
// su estado (charges/payouts/details), que se sincroniza también en la metadata del
// Sales Channel para que el cobro de Medusa sepa a dónde enrutar.
// ============================================================================

import { stripe } from "../config/stripe.js";
import { prisma } from "../database/client.js";
import { syncTenantSalesChannelPayment, syncTenantSalesChannelProvider } from "./medusa.js";
import { encryptSecret, decryptSecret, secretsConfigured } from "./secrets.js";
import {
  buildRedsysRequest,
  verifyRedsysResponse,
  type RedsysRequest,
  type RedsysEnvironment,
} from "./redsys.js";

export type PaymentProvider = "none" | "stripe" | "redsys";

export interface RedsysConfigStatus {
  configured: boolean;
  merchantCode: string;
  terminal: string;
  environment: "test" | "live";
}

export interface PaymentSettings {
  activeProvider: PaymentProvider;
  stripe: ConnectStatus;
  redsys: RedsysConfigStatus;
}

/** Error de dominio para el flujo de Connect (lo traduce la ruta a HTTP). */
export class PaymentsError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "PaymentsError";
    this.status = status;
  }
}

export interface ConnectStatus {
  connected: boolean; // existe una cuenta conectada (acct_...)
  accountId: string | null;
  chargesEnabled: boolean; // la tienda PUEDE cobrar
  payoutsEnabled: boolean; // recibe liquidaciones
  detailsSubmitted: boolean; // completó el formulario de onboarding
  needsOnboarding: boolean; // hay que (re)abrir el onboarding
  dashboardAvailable: boolean; // se puede abrir el dashboard Express
}

function requireStripe(): NonNullable<typeof stripe> {
  if (!stripe) {
    throw new PaymentsError("El sistema de pagos no está disponible.", 503);
  }
  return stripe;
}

function toStatus(user: {
  stripeConnectAccountId: string | null;
  stripeConnectChargesEnabled: boolean;
  stripeConnectPayoutsEnabled: boolean;
  stripeConnectDetailsSubmitted: boolean;
}): ConnectStatus {
  const connected = !!user.stripeConnectAccountId;
  return {
    connected,
    accountId: user.stripeConnectAccountId,
    chargesEnabled: user.stripeConnectChargesEnabled,
    payoutsEnabled: user.stripeConnectPayoutsEnabled,
    detailsSubmitted: user.stripeConnectDetailsSubmitted,
    // Mientras no pueda cobrar, hay que (re)abrir el onboarding (aunque ya exista la cuenta).
    needsOnboarding: !connected || !user.stripeConnectChargesEnabled,
    dashboardAvailable: connected && user.stripeConnectDetailsSubmitted,
  };
}

/**
 * Persiste el estado de la cuenta conectada en la BD y lo refleja en la metadata del
 * Sales Channel (puente con el cobro de Medusa). Idempotente.
 */
async function applyAccountState(
  userId: number,
  salesChannelId: string | null,
  account: { id: string; charges_enabled?: boolean; payouts_enabled?: boolean; details_submitted?: boolean }
): Promise<ConnectStatus> {
  const chargesEnabled = !!account.charges_enabled;
  const payoutsEnabled = !!account.payouts_enabled;
  const detailsSubmitted = !!account.details_submitted;

  await prisma.user.update({
    where: { id: userId },
    data: {
      stripeConnectAccountId: account.id,
      stripeConnectChargesEnabled: chargesEnabled,
      stripeConnectPayoutsEnabled: payoutsEnabled,
      stripeConnectDetailsSubmitted: detailsSubmitted,
    },
  });

  // Reflejar en el Sales Channel (best-effort: no debe tumbar el flujo si Medusa falla).
  if (salesChannelId) {
    await syncTenantSalesChannelPayment(salesChannelId, {
      stripeAccountId: account.id,
      chargesEnabled,
    }).catch((e) => {
      console.warn("⚠️ [CONNECT] No se pudo sincronizar el Sales Channel:", e instanceof Error ? e.message : e);
    });
  }

  return toStatus({
    stripeConnectAccountId: account.id,
    stripeConnectChargesEnabled: chargesEnabled,
    stripeConnectPayoutsEnabled: payoutsEnabled,
    stripeConnectDetailsSubmitted: detailsSubmitted,
  });
}

/**
 * Devuelve el estado de Connect del tenant. Si ya hay cuenta, la REFRESCA desde Stripe
 * (fuente de verdad) y persiste el resultado; si no, devuelve "no conectado".
 */
export async function getConnectStatus(userId: number): Promise<ConnectStatus> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new PaymentsError("Usuario no encontrado.", 404);

  if (!user.stripeConnectAccountId) {
    return toStatus(user);
  }

  // Refrescar desde Stripe (el estado cambia tras completar/actualizar el onboarding).
  try {
    const account = await requireStripe().accounts.retrieve(user.stripeConnectAccountId);
    return await applyAccountState(userId, user.medusaSalesChannelId, account);
  } catch (e) {
    // Cuenta borrada en el Dashboard o clave de modo distinto: se limpia (autocurativo).
    console.warn("⚠️ [CONNECT] No se pudo recuperar la cuenta; se limpia:", e instanceof Error ? e.message : e);
    await prisma.user.update({
      where: { id: userId },
      data: {
        stripeConnectAccountId: null,
        stripeConnectChargesEnabled: false,
        stripeConnectPayoutsEnabled: false,
        stripeConnectDetailsSubmitted: false,
      },
    });
    if (user.medusaSalesChannelId) {
      await syncTenantSalesChannelPayment(user.medusaSalesChannelId, {
        stripeAccountId: null,
        chargesEnabled: false,
      }).catch(() => {});
    }
    return toStatus({
      stripeConnectAccountId: null,
      stripeConnectChargesEnabled: false,
      stripeConnectPayoutsEnabled: false,
      stripeConnectDetailsSubmitted: false,
    });
  }
}

function isHttpsOrLocalhost(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol === "https:") return true;
    return u.protocol === "http:" && (u.hostname === "localhost" || u.hostname === "127.0.0.1");
  } catch {
    return false;
  }
}

/**
 * Inicia (o reanuda) el onboarding de Connect. Crea la cuenta Express si no existe y
 * devuelve la URL del onboarding hospedado de Stripe. `returnUrl`/`refreshUrl` los aporta
 * el panel del tenant (su propio dominio); se validan como https (o localhost en dev).
 */
export async function startConnectOnboarding(
  userId: number,
  returnUrl: string,
  refreshUrl: string
): Promise<{ url: string; accountId: string }> {
  const s = requireStripe();
  if (!isHttpsOrLocalhost(returnUrl) || !isHttpsOrLocalhost(refreshUrl)) {
    throw new PaymentsError("URLs de retorno inválidas.", 400);
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new PaymentsError("Usuario no encontrado.", 404);

  let accountId = user.stripeConnectAccountId;

  // Crear la cuenta Express solo si no existe. País por defecto España (pymes ES).
  if (!accountId) {
    const account = await s.accounts.create({
      type: "express",
      country: "ES",
      email: user.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_profile: {
        name: user.siteName || user.name || undefined,
      },
      metadata: { avialoUserId: String(userId) },
    });
    accountId = account.id;
    await applyAccountState(userId, user.medusaSalesChannelId, account);
  }

  const link = await s.accountLinks.create({
    account: accountId,
    return_url: returnUrl,
    refresh_url: refreshUrl,
    type: "account_onboarding",
  });

  return { url: link.url, accountId };
}

/**
 * Devuelve un enlace de un solo uso al dashboard Express de la cuenta conectada (para que
 * el pyme vea sus cobros/liquidaciones). Solo si ya completó el onboarding.
 */
export async function createConnectDashboardLink(userId: number): Promise<{ url: string }> {
  const s = requireStripe();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.stripeConnectAccountId) {
    throw new PaymentsError("La tienda aún no tiene una cuenta de pagos.", 400);
  }
  if (!user.stripeConnectDetailsSubmitted) {
    throw new PaymentsError("Completa primero la configuración de pagos.", 400);
  }
  const link = await s.accounts.createLoginLink(user.stripeConnectAccountId);
  return { url: link.url };
}

/**
 * Aplica un evento `account.updated` de Connect (webhook). Localiza al tenant por el id de
 * la cuenta conectada y refresca su estado. Devuelve true si encontró y actualizó al tenant.
 */
export async function applyConnectAccountUpdate(account: {
  id: string;
  charges_enabled?: boolean;
  payouts_enabled?: boolean;
  details_submitted?: boolean;
}): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { stripeConnectAccountId: account.id } });
  if (!user) return false;
  await applyAccountState(user.id, user.medusaSalesChannelId, account);
  return true;
}

// ── MULTI-PASARELA: proveedor activo + configuración por pasarela (Stripe / Redsys / …) ──

const PROVIDERS: PaymentProvider[] = ["none", "stripe", "redsys"];

function redsysStatus(user: {
  redsysMerchantCode: string | null;
  redsysTerminal: string | null;
  redsysEnvironment: string | null;
  redsysSecretKeyEnc: string | null;
}): RedsysConfigStatus {
  return {
    configured: !!user.redsysSecretKeyEnc && !!user.redsysMerchantCode,
    merchantCode: user.redsysMerchantCode || "",
    terminal: user.redsysTerminal || "001",
    environment: user.redsysEnvironment === "live" ? "live" : "test",
  };
}

/** Vista combinada de pagos para el panel: pasarela activa + estado de cada pasarela. */
export async function getPaymentSettings(userId: number): Promise<PaymentSettings> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new PaymentsError("Usuario no encontrado.", 404);

  // Estado de Stripe (refresca desde Stripe si hay cuenta; seguro si no la hay).
  const stripeStatus = await getConnectStatus(userId);

  return {
    activeProvider: (PROVIDERS.includes(user.paymentProvider as PaymentProvider)
      ? user.paymentProvider
      : "none") as PaymentProvider,
    stripe: stripeStatus,
    redsys: redsysStatus(user),
  };
}

/** Cambia la pasarela activa. Exige que la pasarela elegida esté lista para cobrar. */
export async function setActiveProvider(
  userId: number,
  provider: PaymentProvider
): Promise<PaymentSettings> {
  if (!PROVIDERS.includes(provider)) {
    throw new PaymentsError("Pasarela no válida.", 400);
  }
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new PaymentsError("Usuario no encontrado.", 404);

  if (provider === "stripe" && !user.stripeConnectChargesEnabled) {
    throw new PaymentsError("Conecta y verifica Stripe antes de activarlo.", 400);
  }
  if (provider === "redsys" && !(user.redsysSecretKeyEnc && user.redsysMerchantCode)) {
    throw new PaymentsError("Configura Redsys antes de activarlo.", 400);
  }

  await prisma.user.update({ where: { id: userId }, data: { paymentProvider: provider } });
  if (user.medusaSalesChannelId) {
    await syncTenantSalesChannelProvider(user.medusaSalesChannelId, provider).catch((e) => {
      console.warn("⚠️ [PAGOS] No se pudo sincronizar la pasarela en el Sales Channel:", e instanceof Error ? e.message : e);
    });
  }
  return getPaymentSettings(userId);
}

export interface RedsysConfigInput {
  merchantCode: string;
  terminal: string;
  environment: "test" | "live";
  secretKey: string; // clave SHA-256 (base64). Se cifra antes de guardar.
}

/** Guarda (cifrada) la configuración de Redsys del tenant. No activa la pasarela por sí solo. */
export async function setRedsysConfig(
  userId: number,
  input: RedsysConfigInput
): Promise<PaymentSettings> {
  if (!secretsConfigured()) {
    throw new PaymentsError("El sistema no puede custodiar credenciales ahora mismo.", 503);
  }
  const merchantCode = input.merchantCode.trim();
  const terminal = (input.terminal || "001").trim();
  const environment = input.environment === "live" ? "live" : "test";
  const secret = input.secretKey.trim();

  if (!/^\d{1,9}$/.test(merchantCode)) {
    throw new PaymentsError("El código de comercio (FUC) debe ser numérico.", 400);
  }
  if (!/^\d{1,3}$/.test(terminal)) {
    throw new PaymentsError("El terminal debe ser numérico (p.ej. 001).", 400);
  }
  if (secret.length < 16) {
    throw new PaymentsError("La clave secreta de Redsys no es válida.", 400);
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      redsysMerchantCode: merchantCode,
      redsysTerminal: terminal,
      redsysEnvironment: environment,
      redsysSecretKeyEnc: encryptSecret(secret),
    },
  });
  return getPaymentSettings(userId);
}

// ── FLUJO DE COBRO REDSYS (lo invoca el provider de Medusa vía endpoints internos) ──
// El provider de Medusa NO tiene el secreto del tenant (corre en contenedor aislado y el
// `data` de la sesión es público). Por eso firma/verifica AQUÍ, donde el secreto vive cifrado.

export interface PrepareRedsysInput {
  amountCents: number; // unidad mínima (céntimos)
  order: string; // nº de pedido Redsys (4-12, empieza por 4 dígitos)
  sessionId: string; // id de la sesión de pago de Medusa (eco para enlazarla)
  merchantUrl: string; // notificación servidor-servidor (hook de Medusa)
  urlOk: string;
  urlKo: string;
  description?: string;
}

/** Construye la petición Redsys FIRMADA para el tenant de un Sales Channel. */
export async function prepareRedsysPayment(
  salesChannelId: string,
  input: PrepareRedsysInput
): Promise<RedsysRequest> {
  if (!secretsConfigured()) {
    throw new PaymentsError("El sistema no puede firmar pagos ahora mismo.", 503);
  }
  const user = await prisma.user.findFirst({ where: { medusaSalesChannelId: salesChannelId } });
  if (!user) throw new PaymentsError("Tienda no encontrada.", 404);
  if (!user.redsysSecretKeyEnc || !user.redsysMerchantCode) {
    throw new PaymentsError("Redsys no está configurado para esta tienda.", 400);
  }
  const secret = decryptSecret(user.redsysSecretKeyEnc);
  const environment: RedsysEnvironment = user.redsysEnvironment === "live" ? "live" : "test";

  return buildRedsysRequest(
    {
      amount: Math.round(input.amountCents),
      order: input.order,
      merchantCode: user.redsysMerchantCode,
      terminal: user.redsysTerminal || "001",
      merchantUrl: input.merchantUrl,
      urlOk: input.urlOk,
      urlKo: input.urlKo,
      productDescription: input.description,
      merchantData: input.sessionId,
    },
    secret,
    environment
  );
}

export interface RedsysVerifyResult {
  authorized: boolean;
  order: string;
  amountCents: number;
  sessionId: string; // = merchantData (eco)
}

/**
 * Verifica una notificación de Redsys: resuelve el tenant por el código de comercio (FUC) de
 * los parámetros, descifra SU secreto y comprueba la firma. Devuelve null si no casa.
 */
export async function verifyRedsysNotification(
  merchantParametersB64: string,
  signatureB64Url: string
): Promise<RedsysVerifyResult | null> {
  // Decodificar SIN verificar solo para leer el FUC y localizar al tenant + su secreto.
  let merchantCode = "";
  try {
    const decoded = JSON.parse(Buffer.from(merchantParametersB64, "base64").toString("utf8"));
    merchantCode = decoded.Ds_MerchantCode || decoded.DS_MERCHANTCODE || "";
  } catch {
    return null;
  }
  if (!merchantCode) return null;

  const user = await prisma.user.findFirst({ where: { redsysMerchantCode: merchantCode } });
  if (!user?.redsysSecretKeyEnc) return null;

  const secret = decryptSecret(user.redsysSecretKeyEnc);
  const notif = verifyRedsysResponse(merchantParametersB64, signatureB64Url, secret);
  if (!notif) return null;

  return {
    authorized: notif.authorized,
    order: notif.order,
    amountCents: notif.amountCents,
    sessionId: notif.merchantData,
  };
}
