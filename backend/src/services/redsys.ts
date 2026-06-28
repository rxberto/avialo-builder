// ============================================================================
// REDSYS (TPV virtual español) — firma y construcción de la petición de pago.
// ----------------------------------------------------------------------------
// Implementa el algoritmo de firma oficial de Redsys (HMAC_SHA256_V1):
//   1) clave por pedido = 3DES-CBC(IV=0, padding cero) del nº de pedido, con la clave
//      secreta del comercio (base64) como clave 3DES.
//   2) Ds_Signature = base64( HMAC-SHA256( Ds_MerchantParameters ) con esa clave ).
// La clave secreta del comercio se custodia CIFRADA (ver services/secrets.ts) y solo se
// descifra en memoria para firmar. NOTA: implementado según la especificación de Redsys;
// la paridad de firma contra un comercio REAL requiere FUC + clave de un TPV (pendiente).
// ============================================================================

import { createCipheriv, createHmac, timingSafeEqual } from "node:crypto";

export const REDSYS_URLS = {
  test: "https://sis-t.redsys.es:25443/sis/realizarPago",
  live: "https://sis.redsys.es/sis/realizarPago",
} as const;

export type RedsysEnvironment = "test" | "live";

export interface RedsysOrderInput {
  /** Importe en la unidad MÍNIMA (céntimos para EUR). Entero. */
  amount: number;
  /** Nº de pedido Redsys: 4-12 chars, empieza por 4 dígitos. */
  order: string;
  merchantCode: string; // FUC (código de comercio)
  terminal: string; // normalmente "001"
  currency?: string; // ISO 4217 numérico; 978 = EUR (por defecto)
  merchantUrl: string; // notificación servidor-servidor
  urlOk: string; // retorno OK (navegador)
  urlKo: string; // retorno KO (navegador)
  productDescription?: string;
  /** Dato libre que Redsys devuelve intacto en la notificación (lo usamos para enlazar la sesión). */
  merchantData?: string;
}

export interface RedsysRequest {
  url: string; // endpoint del TPV (test/live)
  Ds_SignatureVersion: "HMAC_SHA256_V1";
  Ds_MerchantParameters: string; // base64 del JSON de parámetros
  Ds_Signature: string; // base64
}

/** 3DES-CBC (IV=0, sin auto-padding, relleno con ceros) del pedido → clave por pedido. */
function deriveOrderKey(order: string, merchantKeyBase64: string): Buffer {
  const key = Buffer.from(merchantKeyBase64, "base64"); // 24 bytes (3DES)
  const iv = Buffer.alloc(8, 0);
  const cipher = createCipheriv("des-ede3-cbc", key, iv);
  cipher.setAutoPadding(false);
  // Relleno con ceros a múltiplo de 8 bytes.
  const data = Buffer.from(order, "utf8");
  const padLen = (8 - (data.length % 8)) % 8;
  const padded = Buffer.concat([data, Buffer.alloc(padLen, 0)]);
  return Buffer.concat([cipher.update(padded), cipher.final()]);
}

/** base64 estándar → base64url (el de las notificaciones de Redsys). */
function toBase64Url(b64: string): string {
  return b64.replace(/\+/g, "-").replace(/\//g, "_");
}

/** Firma unos Ds_MerchantParameters (base64) para un pedido. Devuelve base64 estándar. */
export function signMerchantParameters(
  merchantParametersB64: string,
  order: string,
  merchantKeyBase64: string
): string {
  const orderKey = deriveOrderKey(order, merchantKeyBase64);
  return createHmac("sha256", orderKey).update(merchantParametersB64).digest("base64");
}

/** Construye la petición de pago (parámetros + firma) lista para auto-postear al TPV. */
export function buildRedsysRequest(
  input: RedsysOrderInput,
  merchantKeyBase64: string,
  environment: RedsysEnvironment
): RedsysRequest {
  const params: Record<string, string> = {
    DS_MERCHANT_AMOUNT: String(input.amount),
    DS_MERCHANT_ORDER: input.order,
    DS_MERCHANT_MERCHANTCODE: input.merchantCode,
    DS_MERCHANT_CURRENCY: input.currency || "978",
    DS_MERCHANT_TRANSACTIONTYPE: "0", // autorización
    DS_MERCHANT_TERMINAL: input.terminal,
    DS_MERCHANT_MERCHANTURL: input.merchantUrl,
    DS_MERCHANT_URLOK: input.urlOk,
    DS_MERCHANT_URLKO: input.urlKo,
  };
  if (input.productDescription) {
    params.DS_MERCHANT_PRODUCTDESCRIPTION = input.productDescription.slice(0, 125);
  }
  if (input.merchantData) {
    params.DS_MERCHANT_MERCHANTDATA = input.merchantData.slice(0, 1024);
  }

  const merchantParametersB64 = Buffer.from(JSON.stringify(params), "utf8").toString("base64");
  // La firma de la PETICIÓN va en base64url (igual que la oficial `base64_url_encode`).
  const signature = toBase64Url(
    signMerchantParameters(merchantParametersB64, input.order, merchantKeyBase64)
  );

  return {
    url: REDSYS_URLS[environment],
    Ds_SignatureVersion: "HMAC_SHA256_V1",
    Ds_MerchantParameters: merchantParametersB64,
    Ds_Signature: signature,
  };
}

export interface RedsysNotification {
  order: string;
  responseCode: number; // Ds_Response: 0..99 = OK (autorizada)
  authorized: boolean; // responseCode en [0,99]
  amountCents: number; // Ds_Amount (unidad mínima)
  merchantCode: string; // Ds_MerchantCode (FUC) → resuelve el tenant
  merchantData: string; // Ds_MerchantData (eco de lo que enviamos: enlaza la sesión)
  params: Record<string, string>;
}

/**
 * Verifica la firma de una notificación de Redsys y devuelve sus datos. La firma de respuesta
 * va en base64url y se calcula sobre los Ds_MerchantParameters recibidos. Devuelve null si la
 * firma no casa (comparación en tiempo constante).
 */
export function verifyRedsysResponse(
  merchantParametersB64: string,
  signatureB64Url: string,
  merchantKeyBase64: string
): RedsysNotification | null {
  let decoded: Record<string, string>;
  try {
    decoded = JSON.parse(Buffer.from(merchantParametersB64, "base64").toString("utf8"));
  } catch {
    return null;
  }
  const order = decoded.Ds_Order || decoded.DS_ORDER || "";
  if (!order) return null;

  const expected = toBase64Url(
    signMerchantParameters(merchantParametersB64, order, merchantKeyBase64)
  );
  const got = signatureB64Url.trim();
  const a = Buffer.from(expected);
  const b = Buffer.from(got);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  const responseCode = parseInt(decoded.Ds_Response || decoded.DS_RESPONSE || "9999", 10);
  return {
    order,
    responseCode,
    // Redsys autoriza con códigos 0000-0099 (0..99). Mayores = denegada/error.
    authorized: responseCode >= 0 && responseCode <= 99,
    amountCents: parseInt(decoded.Ds_Amount || decoded.DS_AMOUNT || "0", 10),
    merchantCode: decoded.Ds_MerchantCode || decoded.DS_MERCHANTCODE || "",
    merchantData: decoded.Ds_MerchantData || decoded.DS_MERCHANTDATA || "",
    params: decoded,
  };
}

/**
 * Auto-test de PARIDAD contra el algoritmo OFICIAL de Redsys (no requiere comercio real).
 * Vector: clave de pruebas pública de Redsys + unos Ds_MerchantParameters conocidos → la firma
 * que produce el algoritmo oficial (mcrypt MCRYPT_3DES/CBC == openssl des-ede3-cbc, IV cero,
 * relleno con ceros a múltiplo de 8; HMAC-SHA256 sobre el base64 de los parámetros). Esto
 * BLINDA que nuestra criptografía coincide byte a byte con la de Redsys.
 */
const REDSYS_TEST_VECTOR = {
  key: "sq7HjrUOBfKmC576ILgskD5srU870gJ7", // clave de pruebas pública de Redsys
  order: "1508428360",
  // base64( JSON de DS_MERCHANT_* ) — ejemplo canónico de integración.
  paramsB64:
    "eyJEU19NRVJDSEFOVF9BTU9VTlQiOiIxMDAiLCJEU19NRVJDSEFOVF9PUkRFUiI6IjE1MDg0MjgzNjAiLCJEU19NRVJDSEFOVF9NRVJDSEFOVE5BTUUiOiJUZXN0aW5nIFNob3AiLCJEU19NRVJDSEFOVF9NRVJDSEFOVENPREUiOiIzMjcyMzQ2ODgiLCJEU19NRVJDSEFOVF9DVVJSRU5DWSI6Ijk3OCIsIkRTX01FUkNIQU5UX1RSQU5TQUNUSU9OVFlQRSI6IjAiLCJEU19NRVJDSEFOVF9URVJNSU5BTCI6IjEiLCJEU19NRVJDSEFOVF9NRVJDSEFOVFVSTCI6IiIsIkRTX01FUkNIQU5UX1VSTE9LIjoiaHR0cDovL2xvY2FsaG9zdDo4MDgwL3N1Y2Nlc3MiLCJEU19NRVJDSEFOVF9VUkxLTyI6Imh0dHA6Ly9sb2NhbGhvc3Q6ODA4MC9lcnJvciJ9",
  // Firma esperada del algoritmo oficial des-ede3-cbc (base64 estándar; sin +// no cambia en url).
  expected: "qkMJMWR6Dq32xwbQuguTv39OvXv4KdD1Xg7pZ8phGZI=",
} as const;

export function redsysSelfTest(): boolean {
  const got = signMerchantParameters(
    REDSYS_TEST_VECTOR.paramsB64,
    REDSYS_TEST_VECTOR.order,
    REDSYS_TEST_VECTOR.key
  );
  return got === REDSYS_TEST_VECTOR.expected;
}
