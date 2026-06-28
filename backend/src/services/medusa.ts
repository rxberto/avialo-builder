import { config } from "../config/env.js";

/**
 * Cliente del Admin API del backend Medusa COMPARTIDO.
 *
 * Aprovisiona la tienda de cada cliente de forma aislada:
 *  - un Sales Channel propio por tenant,
 *  - una Publishable API Key ligada a ese channel (la usa la storefront),
 *  - enlace del channel al almacén (para que el inventario funcione),
 *  - (best-effort) un pequeño catálogo demo para que la tienda no nazca vacía.
 *
 * El aislamiento real lo da Medusa: con la publishable key, el Store API solo
 * devuelve los productos del Sales Channel asociado.
 */

const BASE = config.medusa.backendUrl.replace(/\/$/, "");

export interface TenantStoreProvision {
  salesChannelId: string;
  publishableKey: string;
}

interface AuthResponse {
  token?: string;
}
interface SalesChannel {
  id: string;
  name: string;
}
interface ApiKey {
  id: string;
  token?: string;
  title?: string;
}
interface StockLocation {
  id: string;
}
interface ShippingProfile {
  id: string;
}
interface AdminVariantPrice {
  amount: number;
  currency_code: string;
}
interface AdminOptionValueRef {
  value: string;
  option_id?: string;
  option?: { id: string; title: string };
}
interface AdminVariant {
  id: string;
  title?: string;
  sku?: string | null;
  barcode?: string | null;
  ean?: string | null;
  manage_inventory?: boolean;
  allow_backorder?: boolean;
  weight?: number | null;
  inventory_quantity?: number | null;
  variant_rank?: number | null;
  options?: AdminOptionValueRef[];
  inventory_items?: {
    inventory_item_id?: string;
    inventory?: { id?: string; location_levels?: { stocked_quantity?: number }[] };
  }[];
  prices?: AdminVariantPrice[];
}
interface AdminOption {
  id: string;
  title: string;
  values?: { value: string }[];
}
interface AdminImage {
  id?: string;
  url: string;
}
interface AdminTag {
  id?: string;
  value: string;
  metadata?: Record<string, unknown> | null;
}
interface AdminProduct {
  id: string;
  title: string;
  subtitle?: string | null;
  status: string;
  handle: string;
  description?: string | null;
  thumbnail?: string | null;
  discountable?: boolean;
  weight?: number | null;
  length?: number | null;
  height?: number | null;
  width?: number | null;
  type_id?: string | null;
  collection_id?: string | null;
  collection?: { id: string; title: string } | null;
  categories?: { id: string; name: string }[];
  metadata?: Record<string, unknown> | null;
  images?: AdminImage[];
  options?: AdminOption[];
  tags?: AdminTag[];
  variants?: AdminVariant[];
  sales_channels?: { id: string }[];
}

/** Error tipado para fallos del Admin API (incluye status y cuerpo). */
export class MedusaApiError extends Error {
  constructor(message: string, readonly status?: number, readonly body?: string) {
    super(message);
    this.name = "MedusaApiError";
  }
}

/** fetch JSON autenticado contra el Admin API. Lanza MedusaApiError en !ok. */
async function adminFetch<T>(
  token: string,
  path: string,
  init: { method?: string; body?: unknown } = {}
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: init.method || "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });

  if (!res.ok) {
    // Si el token admin ya no vale, lo descartamos para que la próxima llamada reautentique.
    if (res.status === 401) invalidateAdminToken();
    const text = await res.text().catch(() => "");
    throw new MedusaApiError(
      `Admin API ${init.method || "GET"} ${path} → ${res.status}`,
      res.status,
      text
    );
  }
  return (await res.json()) as T;
}

// Caché en memoria del token admin. El JWT de Medusa dura ~24h; lo refrescamos mucho antes
// (10 min) y lo reutilizamos entre operaciones para NO hacer login en cada llamada (evita
// latencia y posibles bloqueos por rate-limit de /auth cuando un cliente usa su panel).
let adminTokenCache: { token: string; expiresAt: number } | null = null;
const ADMIN_TOKEN_TTL_MS = 10 * 60 * 1000;

/** Invalida la caché del token admin (la llama adminFetch ante un 401). */
function invalidateAdminToken(): void {
  adminTokenCache = null;
}

/** Autentica como admin y devuelve un token Bearer para el Admin API (cacheado). */
export async function authenticate(): Promise<string> {
  if (adminTokenCache && adminTokenCache.expiresAt > Date.now()) {
    return adminTokenCache.token;
  }
  if (!config.medusa.adminPassword) {
    throw new MedusaApiError("MEDUSA_ADMIN_PASSWORD no configurado");
  }
  const res = await fetch(`${BASE}/auth/user/emailpass`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: config.medusa.adminEmail,
      password: config.medusa.adminPassword,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new MedusaApiError(`Auth admin falló → ${res.status}`, res.status, text);
  }
  const data = (await res.json()) as AuthResponse;
  if (!data.token) {
    throw new MedusaApiError("Auth admin sin token en la respuesta");
  }
  adminTokenCache = { token: data.token, expiresAt: Date.now() + ADMIN_TOKEN_TTL_MS };
  return data.token;
}

/** Nombre determinista del Sales Channel de un tenant (para idempotencia). */
function channelName(clientId: string): string {
  return `tenant:${clientId}`;
}

/** Busca un Sales Channel existente por nombre exacto (idempotencia). */
async function findSalesChannel(token: string, name: string): Promise<SalesChannel | null> {
  const data = await adminFetch<{ sales_channels: SalesChannel[] }>(
    token,
    `/admin/sales-channels?name[]=${encodeURIComponent(name)}`
  );
  return data.sales_channels.find((sc) => sc.name === name) || null;
}

/** Primer almacén disponible (el seed base crea "Almacén España"). */
async function getStockLocationId(token: string): Promise<string | null> {
  const data = await adminFetch<{ stock_locations: StockLocation[] }>(
    token,
    `/admin/stock-locations?limit=1`
  );
  return data.stock_locations[0]?.id || null;
}

/** Primer perfil de envío por defecto (lo crea el seed base). */
async function getDefaultShippingProfileId(token: string): Promise<string | null> {
  const data = await adminFetch<{ shipping_profiles: ShippingProfile[] }>(
    token,
    `/admin/shipping-profiles?limit=1`
  );
  return data.shipping_profiles[0]?.id || null;
}

/** Crea 3 productos demo en el Sales Channel del tenant (best-effort). */
async function seedSampleProducts(
  token: string,
  clientId: string,
  salesChannelId: string,
  shippingProfileId: string | null
): Promise<void> {
  // El handle debe ser ÚNICO en toda la tienda Medusa (compartida entre tenants),
  // así que lo prefijamos con el clientId saneado para evitar colisiones entre tiendas.
  const handleBase = `ejemplo-${clientId.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  const demo = [
    { title: "Producto de ejemplo 1", price: 19.9 },
    { title: "Producto de ejemplo 2", price: 29.9 },
    { title: "Producto de ejemplo 3", price: 39.9 },
  ];

  for (let i = 0; i < demo.length; i++) {
    const p = demo[i];
    await adminFetch(token, "/admin/products", {
      method: "POST",
      body: {
        title: p.title,
        handle: `${handleBase}-${i + 1}`,
        description:
          "Producto de demostración. Edítalo o elimínalo desde el panel de tu tienda.",
        status: "published",
        ...(shippingProfileId ? { shipping_profile_id: shippingProfileId } : {}),
        sales_channels: [{ id: salesChannelId }],
        options: [{ title: "Variante", values: ["Única"] }],
        variants: [
          {
            title: "Única",
            // manage_inventory:false → siempre comprable, sin niveles de stock.
            manage_inventory: false,
            options: { Variante: "Única" },
            prices: [{ amount: p.price, currency_code: "eur" }],
          },
        ],
      },
    });
  }
}

/**
 * Aprovisiona (idempotente) la tienda Medusa de un tenant.
 * Devuelve el Sales Channel id y la publishable key para persistir y para la storefront.
 *
 * @param withSampleProducts si true, siembra un catálogo demo (best-effort).
 */
export async function provisionTenantStore(
  clientId: string,
  opts: { withSampleProducts?: boolean } = {}
): Promise<TenantStoreProvision> {
  const token = await authenticate();
  const name = channelName(clientId);

  // 1) Sales Channel (reutiliza si ya existe → reintentos seguros).
  let channel = await findSalesChannel(token, name);
  if (!channel) {
    const created = await adminFetch<{ sales_channel: SalesChannel }>(
      token,
      "/admin/sales-channels",
      {
        method: "POST",
        body: { name, description: `Tienda del cliente ${clientId}` },
      }
    );
    channel = created.sales_channel;
  }

  // 2) Publishable API Key ligada al channel.
  const keyRes = await adminFetch<{ api_key: ApiKey }>(token, "/admin/api-keys", {
    method: "POST",
    body: { title: `Storefront ${clientId}`, type: "publishable" },
  });
  const publishableKey = keyRes.api_key.token;
  if (!publishableKey) {
    throw new MedusaApiError("La publishable key creada no trae token (pk_...)");
  }

  await adminFetch(token, `/admin/api-keys/${keyRes.api_key.id}/sales-channels`, {
    method: "POST",
    body: { add: [channel.id] },
  });

  // 3) Enlace channel ↔ almacén (necesario para inventario/fulfillment).
  const stockLocationId = await getStockLocationId(token);
  if (stockLocationId) {
    await adminFetch(token, `/admin/stock-locations/${stockLocationId}/sales-channels`, {
      method: "POST",
      body: { add: [channel.id] },
    }).catch(() => {
      /* si ya está enlazado, Medusa puede responder error; no es crítico */
    });
  }

  // 4) Catálogo demo (best-effort: no debe tumbar la provisión).
  if (opts.withSampleProducts) {
    try {
      const shippingProfileId = await getDefaultShippingProfileId(token);
      await seedSampleProducts(token, clientId, channel.id, shippingProfileId);
    } catch (err) {
      console.warn(
        `⚠️  No se pudo sembrar el catálogo demo para ${clientId}:`,
        err instanceof Error ? err.message : err
      );
    }
  }

  return { salesChannelId: channel.id, publishableKey };
}

// ============================================================================
// GESTIÓN DE PRODUCTOS POR TENANT (con SCOPE por Sales Channel)
// ----------------------------------------------------------------------------
// El "portero": el panel de cada cliente NO habla con Medusa directamente. Llama al
// orquestador, que ejecuta estas funciones SIEMPRE acotadas al Sales Channel del tenant.
// Así cada cliente solo ve/edita SUS productos, sin enterarse de los demás.
// ============================================================================

// Campos de producto que devuelve el Admin API para el panel del cliente.
const TENANT_PRODUCT_FIELDS =
  "id,title,status,handle,thumbnail,description,*variants,*variants.prices,sales_channels.id";

export interface TenantProductSummary {
  id: string;
  title: string;
  status: string;
  handle: string;
  thumbnail: string | null;
  description: string | null;
  price: number | null; // primer variant, EUR (unidad principal)
  variantId: string | null;
  currencyCode: string;
}

export interface TenantProductInput {
  title: string;
  description?: string;
  price: number; // EUR
  status?: "published" | "draft";
}

export interface TenantProductPatch {
  title?: string;
  description?: string;
  price?: number;
  status?: "published" | "draft";
}

function slugify(input: string): string {
  return (input || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function toProductSummary(p: AdminProduct): TenantProductSummary {
  const variant = p.variants?.[0];
  const eur = variant?.prices?.find((pr) => pr.currency_code === "eur");
  return {
    id: p.id,
    title: p.title,
    status: p.status,
    handle: p.handle,
    thumbnail: p.thumbnail ?? null,
    description: p.description ?? null,
    price: eur?.amount ?? variant?.prices?.[0]?.amount ?? null,
    variantId: variant?.id ?? null,
    currencyCode: "eur",
  };
}

/**
 * Verifica que un producto pertenece al Sales Channel del tenant. Es la barrera de
 * seguridad: impide que un cliente lea/edite/borre productos de otra tienda.
 * Lanza MedusaApiError 403 si no pertenece.
 */
async function assertProductInChannel(
  token: string,
  productId: string,
  salesChannelId: string
): Promise<AdminProduct> {
  let product: AdminProduct;
  try {
    const data = await adminFetch<{ product: AdminProduct }>(
      token,
      `/admin/products/${productId}?fields=${TENANT_PRODUCT_FIELDS}`
    );
    product = data.product;
  } catch (err) {
    if (err instanceof MedusaApiError && err.status === 404) {
      throw new MedusaApiError("Producto no encontrado", 404);
    }
    throw err;
  }
  const belongs = (product.sales_channels || []).some((sc) => sc.id === salesChannelId);
  if (!belongs) {
    // 403 genérico (no revelamos que existe en otra tienda).
    throw new MedusaApiError("Producto no disponible en esta tienda", 403);
  }
  return product;
}

/** Lista los productos del tenant (solo su Sales Channel). */
export async function listTenantProducts(
  salesChannelId: string
): Promise<TenantProductSummary[]> {
  const token = await authenticate();
  const data = await adminFetch<{ products: AdminProduct[] }>(
    token,
    `/admin/products?sales_channel_id[]=${encodeURIComponent(salesChannelId)}&fields=${TENANT_PRODUCT_FIELDS}&limit=200`
  );
  return (data.products || []).map(toProductSummary);
}

/** Crea un producto y lo asigna AUTOMÁTICAMENTE al Sales Channel del tenant. */
export async function createTenantProduct(
  salesChannelId: string,
  clientId: string,
  input: TenantProductInput
): Promise<TenantProductSummary> {
  if (!input.title?.trim()) {
    throw new MedusaApiError("El título del producto es obligatorio", 400);
  }
  if (!(input.price >= 0)) {
    throw new MedusaApiError("El precio debe ser un número válido", 400);
  }
  const token = await authenticate();
  const shippingProfileId = await getDefaultShippingProfileId(token);
  // handle único en toda la tienda compartida: prefijo del tenant + slug + sufijo aleatorio.
  const handle = `${slugify(clientId)}-${slugify(input.title)}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;

  const data = await adminFetch<{ product: AdminProduct }>(token, "/admin/products", {
    method: "POST",
    body: {
      title: input.title.trim(),
      handle,
      description: input.description?.trim() || "",
      status: input.status || "published",
      ...(shippingProfileId ? { shipping_profile_id: shippingProfileId } : {}),
      sales_channels: [{ id: salesChannelId }],
      options: [{ title: "Variante", values: ["Única"] }],
      variants: [
        {
          title: "Única",
          manage_inventory: false,
          options: { Variante: "Única" },
          prices: [{ amount: input.price, currency_code: "eur" }],
        },
      ],
    },
  });
  return toProductSummary(data.product);
}

/** Actualiza un producto del tenant (verifica propiedad antes). */
export async function updateTenantProduct(
  salesChannelId: string,
  productId: string,
  patch: TenantProductPatch
): Promise<TenantProductSummary> {
  const token = await authenticate();
  const existing = await assertProductInChannel(token, productId, salesChannelId);

  // 1) Campos del producto (título/descripcion/estado).
  const body: Record<string, unknown> = {};
  if (patch.title !== undefined) body.title = patch.title.trim();
  if (patch.description !== undefined) body.description = patch.description.trim();
  if (patch.status !== undefined) body.status = patch.status;
  if (Object.keys(body).length > 0) {
    await adminFetch(token, `/admin/products/${productId}`, { method: "POST", body });
  }

  // 2) Precio (en el variant). Medusa v2 actualiza con POST.
  if (patch.price !== undefined) {
    const variantId = existing.variants?.[0]?.id;
    if (!variantId) {
      throw new MedusaApiError("El producto no tiene variante para fijar el precio", 400);
    }
    await adminFetch(token, `/admin/products/${productId}/variants/${variantId}`, {
      method: "POST",
      body: { prices: [{ amount: patch.price, currency_code: "eur" }] },
    });
  }

  // Releer estado final.
  const fresh = await adminFetch<{ product: AdminProduct }>(
    token,
    `/admin/products/${productId}?fields=${TENANT_PRODUCT_FIELDS}`
  );
  return toProductSummary(fresh.product);
}

/** Borra un producto del tenant (verifica propiedad antes). */
export async function deleteTenantProduct(
  salesChannelId: string,
  productId: string
): Promise<void> {
  const token = await authenticate();
  await assertProductInChannel(token, productId, salesChannelId);
  await adminFetch(token, `/admin/products/${productId}`, { method: "DELETE" });
}

// ============================================================================
// GESTIÓN RICA DE PRODUCTOS — clon del editor de Medusa Admin, acotado al tenant.
// Soporta variantes con opciones, precio/SKU/EAN/inventario por variante, galería
// de imágenes, organización (tags, peso, dimensiones) y SEO (en metadata).
// ============================================================================

// Campos del Admin API para el editor completo del panel del cliente.
const TENANT_PRODUCT_DETAIL_FIELDS = [
  "id", "title", "subtitle", "handle", "description", "status", "thumbnail",
  "discountable", "weight", "length", "height", "width", "type_id", "collection_id",
  "collection.id", "collection.title", "categories.id", "categories.name",
  "metadata", "*images", "*options", "*options.values",
  "*variants", "*variants.prices", "*variants.options", "*variants.options.option",
  "*variants.inventory_items", "variants.inventory_items.inventory.location_levels.stocked_quantity",
  "sales_channels.id", "tags.id", "tags.value", "tags.metadata",
].join(",");

export type TenantProductStatus = "published" | "draft" | "proposed" | "rejected";

export interface TenantOption {
  title: string;
  values: string[];
}

export interface TenantVariant {
  id?: string;
  title: string;
  sku: string | null;
  barcode: string | null;
  ean: string | null;
  manageInventory: boolean;
  allowBackorder: boolean;
  inventoryQuantity: number | null;
  weight: number | null;
  price: number | null; // EUR
  options: Record<string, string>; // título de opción -> valor
}

export interface TenantProductRef {
  id: string;
  label: string;
}

export interface TenantProductDetail {
  id: string;
  title: string;
  subtitle: string | null;
  handle: string;
  description: string | null;
  status: string;
  discountable: boolean;
  thumbnail: string | null;
  images: string[];
  tags: string[];
  // Organización (clon de Medusa): colección (1) + categorías y etiquetas (N).
  collectionId: string | null;
  collectionTitle: string | null;
  categories: TenantProductRef[];
  tagList: TenantProductRef[];
  weight: number | null;
  length: number | null;
  height: number | null;
  width: number | null;
  seoTitle: string | null;
  seoDescription: string | null;
  options: TenantOption[];
  variants: TenantVariant[];
}

export interface TenantVariantInput {
  id?: string;
  title?: string;
  sku?: string | null;
  barcode?: string | null;
  ean?: string | null;
  manageInventory?: boolean;
  allowBackorder?: boolean;
  inventoryQuantity?: number | null;
  weight?: number | null;
  price?: number | null;
  options?: Record<string, string>;
}

export interface TenantProductRichInput {
  title: string;
  subtitle?: string | null;
  handle?: string | null;
  description?: string | null;
  status?: TenantProductStatus;
  discountable?: boolean;
  thumbnail?: string | null;
  images?: string[];
  weight?: number | null;
  length?: number | null;
  height?: number | null;
  width?: number | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  options?: TenantOption[];
  variants?: TenantVariantInput[];
  // Organización: id de colección (null para quitarla), ids de categorías/etiquetas (reemplazan).
  collectionId?: string | null;
  categoryIds?: string[];
  tagIds?: string[];
}

export type TenantProductRichPatch = Partial<TenantProductRichInput>;

function nonEmpty(v: unknown): string | null {
  return typeof v === "string" && v.trim().length ? v.trim() : null;
}

/** Construye el bloque metadata.seo_* (Medusa no tiene campos SEO nativos). */
function mergeSeoMetadata(
  base: Record<string, unknown> | null | undefined,
  seoTitle: string | null | undefined,
  seoDescription: string | null | undefined
): Record<string, unknown> | undefined {
  if (seoTitle === undefined && seoDescription === undefined) return undefined;
  const meta: Record<string, unknown> = { ...(base || {}) };
  if (seoTitle !== undefined) meta.seo_title = nonEmpty(seoTitle);
  if (seoDescription !== undefined) meta.seo_description = nonEmpty(seoDescription);
  return meta;
}

/** Trae un producto con los campos de detalle y verifica que pertenece al tenant. */
async function fetchOwnedProduct(
  token: string,
  productId: string,
  salesChannelId: string,
  fields: string
): Promise<AdminProduct> {
  let product: AdminProduct;
  try {
    const data = await adminFetch<{ product: AdminProduct }>(
      token,
      `/admin/products/${productId}?fields=${fields}`
    );
    product = data.product;
  } catch (err) {
    if (err instanceof MedusaApiError && err.status === 404) {
      throw new MedusaApiError("Producto no encontrado", 404);
    }
    throw err;
  }
  const belongs = (product.sales_channels || []).some((sc) => sc.id === salesChannelId);
  if (!belongs) {
    throw new MedusaApiError("Producto no disponible en esta tienda", 403);
  }
  return product;
}

function toProductDetail(p: AdminProduct): TenantProductDetail {
  const meta = (p.metadata || {}) as Record<string, unknown>;
  const options: TenantOption[] = (p.options || []).map((o) => ({
    title: o.title,
    values: (o.values || []).map((v) => v.value),
  }));
  const variants: TenantVariant[] = (p.variants || [])
    .slice()
    .sort((a, b) => (a.variant_rank ?? 0) - (b.variant_rank ?? 0))
    .map((v) => {
      const optMap: Record<string, string> = {};
      for (const ov of v.options || []) {
        const title = ov.option?.title;
        if (title) optMap[title] = ov.value;
      }
      const eur = v.prices?.find((pr) => pr.currency_code === "eur");
      // Stock real = suma de niveles por ubicación (el campo computado inventory_quantity
      // del Admin API no se rellena de forma fiable sin contexto de sales channel).
      let inventoryQuantity: number | null = null;
      if (v.manage_inventory) {
        let sum = 0;
        let found = false;
        for (const it of v.inventory_items || []) {
          for (const lvl of it.inventory?.location_levels || []) {
            if (typeof lvl.stocked_quantity === "number") {
              sum += lvl.stocked_quantity;
              found = true;
            }
          }
        }
        inventoryQuantity = found ? sum : null;
      }
      return {
        id: v.id,
        title: v.title || "",
        sku: v.sku ?? null,
        barcode: v.barcode ?? null,
        ean: v.ean ?? null,
        manageInventory: !!v.manage_inventory,
        allowBackorder: !!v.allow_backorder,
        inventoryQuantity,
        weight: v.weight ?? null,
        price: eur?.amount ?? v.prices?.[0]?.amount ?? null,
        options: optMap,
      };
    });
  return {
    id: p.id,
    title: p.title,
    subtitle: p.subtitle ?? null,
    handle: p.handle,
    description: p.description ?? null,
    status: p.status,
    discountable: p.discountable ?? true,
    thumbnail: p.thumbnail ?? null,
    images: (p.images || []).map((i) => i.url),
    tags: (p.tags || []).map((t) => t.value),
    collectionId: p.collection?.id ?? p.collection_id ?? null,
    collectionTitle: p.collection?.title ?? null,
    categories: (p.categories || []).map((c) => ({ id: c.id, label: c.name })),
    // Etiqueta visible desde metadata.avialo_label, con fallback al value crudo.
    tagList: (p.tags || [])
      .filter((t): t is AdminTag & { id: string } => typeof t.id === "string")
      .map((t) => {
        const lbl = t.metadata?.[AVIALO_LABEL_KEY];
        return { id: t.id, label: typeof lbl === "string" && lbl.trim() ? lbl : t.value };
      }),
    weight: p.weight ?? null,
    length: p.length ?? null,
    height: p.height ?? null,
    width: p.width ?? null,
    seoTitle: nonEmpty(meta.seo_title),
    seoDescription: nonEmpty(meta.seo_description),
    options,
    variants,
  };
}

/** variantId/título -> inventory_item_id (para fijar stock por variante). */
async function fetchVariantInventoryRefs(
  token: string,
  productId: string
): Promise<{ id: string; title: string; inventoryItemId: string | null }[]> {
  const data = await adminFetch<{ product: AdminProduct }>(
    token,
    `/admin/products/${productId}?fields=id,variants.id,variants.title,*variants.inventory_items`
  );
  return (data.product.variants || []).map((v) => ({
    id: v.id,
    title: v.title || "",
    inventoryItemId:
      v.inventory_items?.[0]?.inventory_item_id || v.inventory_items?.[0]?.inventory?.id || null,
  }));
}

/** Fija (crea o actualiza) el nivel de stock de un inventory item en una ubicación. */
async function setInventoryLevel(
  token: string,
  inventoryItemId: string,
  locationId: string,
  quantity: number
): Promise<void> {
  try {
    await adminFetch(token, `/admin/inventory-items/${inventoryItemId}/location-levels`, {
      method: "POST",
      body: { location_id: locationId, stocked_quantity: quantity },
    });
  } catch {
    // Si el nivel ya existe, actualizamos en su lugar.
    await adminFetch(
      token,
      `/admin/inventory-items/${inventoryItemId}/location-levels/${locationId}`,
      { method: "POST", body: { stocked_quantity: quantity } }
    ).catch(() => undefined);
  }
}

/** Obtiene un producto del tenant con todo el detalle para el editor. */
export async function getTenantProduct(
  salesChannelId: string,
  productId: string
): Promise<TenantProductDetail> {
  const token = await authenticate();
  const product = await fetchOwnedProduct(
    token,
    productId,
    salesChannelId,
    TENANT_PRODUCT_DETAIL_FIELDS
  );
  return toProductDetail(product);
}

/** Crea un producto completo (variantes/opciones/precios/inventario/imágenes) en el tenant. */
export async function createTenantProductRich(
  salesChannelId: string,
  clientId: string,
  input: TenantProductRichInput
): Promise<TenantProductDetail> {
  if (!input.title?.trim()) {
    throw new MedusaApiError("El título del producto es obligatorio", 400);
  }
  const token = await authenticate();
  const shippingProfileId = await getDefaultShippingProfileId(token);
  const locationId = await getStockLocationId(token);

  // Opciones: si no se definen, una opción por defecto (producto simple).
  const cleanOptions =
    input.options && input.options.length
      ? input.options
          .filter((o) => o.title.trim() && o.values.filter((v) => v.trim()).length)
          .map((o) => ({
            title: o.title.trim(),
            values: o.values.map((v) => v.trim()).filter(Boolean),
          }))
      : [];
  const options = cleanOptions.length ? cleanOptions : [{ title: "Variante", values: ["Única"] }];

  // Variantes: si no se definen, una por defecto que case con la opción por defecto.
  const rawVariants: TenantVariantInput[] =
    input.variants && input.variants.length
      ? input.variants
      : [{ title: "Única", price: 0, options: { Variante: "Única" }, manageInventory: false }];

  const variants = rawVariants.map((v) => ({
    title: v.title?.trim() || Object.values(v.options || {}).join(" / ") || "Única",
    ...(nonEmpty(v.sku) ? { sku: nonEmpty(v.sku) } : {}),
    ...(nonEmpty(v.barcode) ? { barcode: nonEmpty(v.barcode) } : {}),
    ...(nonEmpty(v.ean) ? { ean: nonEmpty(v.ean) } : {}),
    manage_inventory: !!v.manageInventory,
    allow_backorder: !!v.allowBackorder,
    ...(v.weight != null ? { weight: v.weight } : {}),
    options: v.options || {},
    prices: [{ amount: v.price ?? 0, currency_code: "eur" }],
  }));

  const desiredHandle = nonEmpty(input.handle) || input.title;
  const handle = `${slugify(clientId)}-${slugify(desiredHandle)}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;
  const metadata = mergeSeoMetadata(null, input.seoTitle, input.seoDescription);

  const body: Record<string, unknown> = {
    title: input.title.trim(),
    handle,
    description: nonEmpty(input.description) || "",
    status: input.status || "published",
    discountable: input.discountable ?? true,
    sales_channels: [{ id: salesChannelId }],
    options,
    variants,
    ...(nonEmpty(input.subtitle) ? { subtitle: nonEmpty(input.subtitle) } : {}),
    ...(nonEmpty(input.thumbnail) ? { thumbnail: nonEmpty(input.thumbnail) } : {}),
    ...(input.images?.length ? { images: input.images.filter(Boolean).map((url) => ({ url })) } : {}),
    ...(input.weight != null ? { weight: input.weight } : {}),
    ...(input.length != null ? { length: input.length } : {}),
    ...(input.height != null ? { height: input.height } : {}),
    ...(input.width != null ? { width: input.width } : {}),
    ...(metadata ? { metadata } : {}),
    ...(shippingProfileId ? { shipping_profile_id: shippingProfileId } : {}),
  };

  const data = await adminFetch<{ product: AdminProduct }>(token, "/admin/products", {
    method: "POST",
    body,
  });
  const created = data.product;

  // Inventario inicial (best-effort: no bloquea el alta si falla).
  const wantsInventory = rawVariants.some(
    (v) => v.manageInventory && v.inventoryQuantity != null
  );
  if (locationId && wantsInventory) {
    try {
      const refs = await fetchVariantInventoryRefs(token, created.id);
      for (const v of rawVariants) {
        if (!v.manageInventory || v.inventoryQuantity == null) continue;
        const wantedTitle =
          v.title?.trim() || Object.values(v.options || {}).join(" / ") || "Única";
        const ref = refs.find((r) => r.title === wantedTitle);
        if (ref?.inventoryItemId) {
          await setInventoryLevel(token, ref.inventoryItemId, locationId, v.inventoryQuantity);
        }
      }
    } catch {
      /* el inventario es best-effort */
    }
  }

  return getTenantProduct(salesChannelId, created.id);
}

/** Actualiza un producto completo del tenant (campos generales + variantes existentes). */
export async function updateTenantProductRich(
  salesChannelId: string,
  clientId: string,
  productId: string,
  patch: TenantProductRichPatch
): Promise<TenantProductDetail> {
  const token = await authenticate();
  const existing = await fetchOwnedProduct(
    token,
    productId,
    salesChannelId,
    TENANT_PRODUCT_DETAIL_FIELDS
  );
  const locationId = await getStockLocationId(token);

  // 1) Campos generales del producto.
  const body: Record<string, unknown> = {};
  if (patch.title !== undefined && patch.title.trim()) body.title = patch.title.trim();
  if (patch.subtitle !== undefined) body.subtitle = nonEmpty(patch.subtitle);
  if (patch.description !== undefined) body.description = nonEmpty(patch.description) || "";
  if (patch.status !== undefined) body.status = patch.status;
  if (patch.discountable !== undefined) body.discountable = patch.discountable;
  if (patch.thumbnail !== undefined) body.thumbnail = nonEmpty(patch.thumbnail);
  if (patch.images !== undefined) body.images = patch.images.filter(Boolean).map((url) => ({ url }));
  if (patch.weight !== undefined) body.weight = patch.weight;
  if (patch.length !== undefined) body.length = patch.length;
  if (patch.height !== undefined) body.height = patch.height;
  if (patch.width !== undefined) body.width = patch.width;
  if (patch.handle !== undefined && nonEmpty(patch.handle)) {
    body.handle = `${slugify(clientId)}-${slugify(nonEmpty(patch.handle)!)}`;
  }
  const metadata = mergeSeoMetadata(existing.metadata, patch.seoTitle, patch.seoDescription);
  if (metadata) body.metadata = metadata;

  // 1b) Organización (colección/categorías/etiquetas): verificamos que CADA entidad
  // pertenece al tenant antes de asignarla (barrera anti cross-tenant).
  if (patch.collectionId !== undefined) {
    if (patch.collectionId === null) {
      body.collection_id = null;
    } else {
      await assertCollectionOwned(token, patch.collectionId, salesChannelId);
      body.collection_id = patch.collectionId;
    }
  }
  if (patch.categoryIds !== undefined) {
    for (const id of patch.categoryIds) {
      await assertCategoryOwned(token, id, salesChannelId);
    }
    body.categories = patch.categoryIds.map((id) => ({ id }));
  }
  if (patch.tagIds !== undefined) {
    for (const id of patch.tagIds) {
      await assertTagOwned(token, id, salesChannelId);
    }
    body.tags = patch.tagIds.map((id) => ({ id }));
  }

  if (Object.keys(body).length > 0) {
    await adminFetch(token, `/admin/products/${productId}`, { method: "POST", body });
  }

  // 2) Variantes existentes (precio/SKU/inventario/etc.). v1: no añade/borra variantes.
  if (patch.variants && patch.variants.length) {
    for (const v of patch.variants) {
      if (!v.id) continue;
      const vbody: Record<string, unknown> = {};
      if (v.title !== undefined && v.title.trim()) vbody.title = v.title.trim();
      if (v.sku !== undefined) vbody.sku = nonEmpty(v.sku);
      if (v.barcode !== undefined) vbody.barcode = nonEmpty(v.barcode);
      if (v.ean !== undefined) vbody.ean = nonEmpty(v.ean);
      if (v.manageInventory !== undefined) vbody.manage_inventory = v.manageInventory;
      if (v.allowBackorder !== undefined) vbody.allow_backorder = v.allowBackorder;
      if (v.weight !== undefined) vbody.weight = v.weight;
      if (v.price !== undefined && v.price != null) {
        vbody.prices = [{ amount: v.price, currency_code: "eur" }];
      }
      if (Object.keys(vbody).length > 0) {
        await adminFetch(token, `/admin/products/${productId}/variants/${v.id}`, {
          method: "POST",
          body: vbody,
        });
      }
    }
    // Inventario por variante (best-effort).
    const needsInventory = patch.variants.some(
      (v) => v.id && v.manageInventory && v.inventoryQuantity != null
    );
    if (locationId && needsInventory) {
      try {
        const refs = await fetchVariantInventoryRefs(token, productId);
        for (const v of patch.variants) {
          if (!v.id || !v.manageInventory || v.inventoryQuantity == null) continue;
          const ref = refs.find((r) => r.id === v.id);
          if (ref?.inventoryItemId) {
            await setInventoryLevel(token, ref.inventoryItemId, locationId, v.inventoryQuantity);
          }
        }
      } catch {
        /* best-effort */
      }
    }
  }

  return getTenantProduct(salesChannelId, productId);
}

// ============================================================================
// PEDIDOS DEL TENANT — lectura acotada al Sales Channel (clon de Medusa Admin).
// El aislamiento es por `sales_channel_id`: un cliente solo ve los pedidos hechos
// en SU tienda. La barrera de seguridad la da `assertOrderInChannel`.
// ============================================================================

interface AdminOrderAddress {
  first_name?: string | null;
  last_name?: string | null;
  address_1?: string | null;
  address_2?: string | null;
  city?: string | null;
  postal_code?: string | null;
  province?: string | null;
  country_code?: string | null;
  phone?: string | null;
}
interface AdminOrderItem {
  id: string;
  title: string;
  subtitle?: string | null;
  thumbnail?: string | null;
  variant_title?: string | null;
  variant_sku?: string | null;
  product_handle?: string | null;
  unit_price: number;
  quantity: number;
  total?: number;
}
interface AdminCustomer {
  id?: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
}
interface AdminPayment {
  id: string;
  amount?: number;
  currency_code?: string | null;
  captured_at?: string | null;
  canceled_at?: string | null;
}
interface AdminPaymentCollection {
  id: string;
  status?: string | null;
  amount?: number;
  payments?: AdminPayment[];
}
interface AdminFulfillmentItem {
  id?: string;
  line_item_id?: string | null;
  quantity?: number;
  title?: string | null;
}
interface AdminFulfillment {
  id: string;
  packed_at?: string | null;
  shipped_at?: string | null;
  delivered_at?: string | null;
  canceled_at?: string | null;
  items?: AdminFulfillmentItem[];
}
interface AdminOrder {
  id: string;
  display_id?: number;
  status?: string;
  payment_status?: string | null;
  fulfillment_status?: string | null;
  total?: number;
  subtotal?: number;
  shipping_total?: number;
  tax_total?: number;
  discount_total?: number;
  currency_code?: string;
  email?: string | null;
  created_at?: string;
  canceled_at?: string | null;
  sales_channel_id?: string;
  customer?: AdminCustomer | null;
  items?: AdminOrderItem[];
  shipping_address?: AdminOrderAddress | null;
  payment_collections?: AdminPaymentCollection[];
  fulfillments?: AdminFulfillment[];
}

export interface TenantOrderSummary {
  id: string;
  displayId: number | null;
  status: string;
  paymentStatus: string | null;
  fulfillmentStatus: string | null;
  total: number;
  currencyCode: string;
  email: string | null;
  customerName: string | null;
  itemCount: number;
  createdAt: string | null;
}

export interface TenantOrderItem {
  id: string;
  title: string;
  subtitle: string | null;
  thumbnail: string | null;
  variantTitle: string | null;
  sku: string | null;
  unitPrice: number;
  quantity: number;
  total: number;
}

export interface TenantOrderAddress {
  name: string | null;
  line1: string | null;
  line2: string | null;
  city: string | null;
  postalCode: string | null;
  province: string | null;
  countryCode: string | null;
  phone: string | null;
}

export interface TenantOrderPayment {
  id: string;
  amount: number;
  capturedAt: string | null;
  canceledAt: string | null;
}

export interface TenantOrderFulfillment {
  id: string;
  packedAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  canceledAt: string | null;
  itemCount: number;
}

export interface TenantOrderDetail extends TenantOrderSummary {
  subtotal: number;
  shippingTotal: number;
  taxTotal: number;
  discountTotal: number;
  canceledAt: string | null;
  items: TenantOrderItem[];
  shippingAddress: TenantOrderAddress | null;
  payments: TenantOrderPayment[];
  fulfillments: TenantOrderFulfillment[];
  // Flags derivados para que el panel sepa qué acciones ofrecer (la verdad la
  // tiene Medusa; esto solo guía la UI, el backend revalida en cada acción).
  capturable: boolean;
  fulfillable: boolean;
}

const TENANT_ORDER_LIST_FIELDS = [
  "id", "display_id", "status", "payment_status", "fulfillment_status",
  "total", "currency_code", "email", "created_at", "sales_channel_id",
  "*customer", "items.quantity",
].join(",");

const TENANT_ORDER_DETAIL_FIELDS = [
  "id", "display_id", "status", "payment_status", "fulfillment_status",
  "total", "subtotal", "shipping_total", "tax_total", "discount_total",
  "currency_code", "email", "created_at", "canceled_at", "sales_channel_id",
  "*customer", "*items", "*shipping_address",
  "*payment_collections", "*payment_collections.payments",
  "*fulfillments", "*fulfillments.items",
].join(",");

function customerName(o: AdminOrder): string | null {
  const c = o.customer;
  const sa = o.shipping_address;
  const fromCustomer = [c?.first_name, c?.last_name].filter(Boolean).join(" ").trim();
  if (fromCustomer) return fromCustomer;
  const fromAddress = [sa?.first_name, sa?.last_name].filter(Boolean).join(" ").trim();
  return fromAddress || null;
}

function toOrderSummary(o: AdminOrder): TenantOrderSummary {
  return {
    id: o.id,
    displayId: o.display_id ?? null,
    status: o.status || "pending",
    paymentStatus: o.payment_status ?? null,
    fulfillmentStatus: o.fulfillment_status ?? null,
    total: o.total ?? 0,
    currencyCode: o.currency_code || "eur",
    email: o.email ?? null,
    customerName: customerName(o),
    itemCount: (o.items || []).reduce((n, it) => n + (it.quantity || 0), 0),
    createdAt: o.created_at ?? null,
  };
}

function toOrderDetail(o: AdminOrder): TenantOrderDetail {
  const sa = o.shipping_address;
  const address: TenantOrderAddress | null = sa
    ? {
        name: [sa.first_name, sa.last_name].filter(Boolean).join(" ").trim() || null,
        line1: sa.address_1 ?? null,
        line2: sa.address_2 ?? null,
        city: sa.city ?? null,
        postalCode: sa.postal_code ?? null,
        province: sa.province ?? null,
        countryCode: sa.country_code ?? null,
        phone: sa.phone ?? null,
      }
    : null;
  // Aplana los pagos de todas las payment collections del pedido.
  const payments: TenantOrderPayment[] = (o.payment_collections || []).flatMap((pc) =>
    (pc.payments || []).map((p) => ({
      id: p.id,
      amount: p.amount ?? 0,
      capturedAt: p.captured_at ?? null,
      canceledAt: p.canceled_at ?? null,
    }))
  );
  const fulfillments: TenantOrderFulfillment[] = (o.fulfillments || []).map((f) => ({
    id: f.id,
    packedAt: f.packed_at ?? null,
    shippedAt: f.shipped_at ?? null,
    deliveredAt: f.delivered_at ?? null,
    canceledAt: f.canceled_at ?? null,
    itemCount: (f.items || []).reduce((n, it) => n + (it.quantity || 0), 0),
  }));
  const canceled = !!o.canceled_at;
  // Capturable: hay algún pago ni capturado ni cancelado y el pedido no está cancelado.
  const capturable =
    !canceled && payments.some((p) => !p.capturedAt && !p.canceledAt);
  // Preparable: el pedido tiene artículos, no está cancelado y aún no se ha preparado.
  const fulfillable =
    !canceled &&
    (o.items || []).length > 0 &&
    (o.fulfillment_status ?? "not_fulfilled") === "not_fulfilled";
  return {
    ...toOrderSummary(o),
    subtotal: o.subtotal ?? 0,
    shippingTotal: o.shipping_total ?? 0,
    taxTotal: o.tax_total ?? 0,
    discountTotal: o.discount_total ?? 0,
    canceledAt: o.canceled_at ?? null,
    items: (o.items || []).map((it) => ({
      id: it.id,
      title: it.title,
      subtitle: it.subtitle ?? null,
      thumbnail: it.thumbnail ?? null,
      variantTitle: it.variant_title ?? null,
      sku: it.variant_sku ?? null,
      unitPrice: it.unit_price ?? 0,
      quantity: it.quantity ?? 0,
      total: it.total ?? (it.unit_price ?? 0) * (it.quantity ?? 0),
    })),
    shippingAddress: address,
    payments,
    fulfillments,
    capturable,
    fulfillable,
  };
}

/** Verifica que un pedido pertenece al Sales Channel del tenant (barrera de seguridad). */
async function assertOrderInChannel(
  token: string,
  orderId: string,
  salesChannelId: string,
  fields: string
): Promise<AdminOrder> {
  let order: AdminOrder;
  try {
    const data = await adminFetch<{ order: AdminOrder }>(
      token,
      `/admin/orders/${orderId}?fields=${fields}`
    );
    order = data.order;
  } catch (err) {
    if (err instanceof MedusaApiError && err.status === 404) {
      throw new MedusaApiError("Pedido no encontrado", 404);
    }
    throw err;
  }
  if (order.sales_channel_id !== salesChannelId) {
    throw new MedusaApiError("Pedido no disponible en esta tienda", 403);
  }
  return order;
}

export interface TenantOrdersPage {
  orders: TenantOrderSummary[];
  count: number;
  offset: number;
  limit: number;
}

/** Lista paginada de pedidos del tenant (solo su Sales Channel). */
export async function listTenantOrders(
  salesChannelId: string,
  opts: { limit?: number; offset?: number } = {}
): Promise<TenantOrdersPage> {
  const token = await authenticate();
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 100);
  const offset = Math.max(opts.offset ?? 0, 0);
  const data = await adminFetch<{ orders: AdminOrder[]; count: number }>(
    token,
    `/admin/orders?sales_channel_id[]=${encodeURIComponent(salesChannelId)}` +
      `&fields=${TENANT_ORDER_LIST_FIELDS}&order=-created_at&limit=${limit}&offset=${offset}`
  );
  return {
    orders: (data.orders || []).map(toOrderSummary),
    count: data.count ?? 0,
    offset,
    limit,
  };
}

/** Detalle de un pedido del tenant (verifica propiedad antes). */
export async function getTenantOrder(
  salesChannelId: string,
  orderId: string
): Promise<TenantOrderDetail> {
  const token = await authenticate();
  const order = await assertOrderInChannel(
    token,
    orderId,
    salesChannelId,
    TENANT_ORDER_DETAIL_FIELDS
  );
  return toOrderDetail(order);
}

// ----------------------------------------------------------------------------
// ACCIONES DEL PEDIDO (flujo Medusa). Cada una revalida la propiedad del pedido
// vía assertOrderInChannel ANTES de actuar (barrera de seguridad: un tenant solo
// puede operar pedidos de su propio Sales Channel). Devuelven el detalle fresco.
// ----------------------------------------------------------------------------

/** Captura todos los pagos pendientes (autorizados, ni capturados ni cancelados). */
export async function captureTenantOrderPayment(
  salesChannelId: string,
  orderId: string
): Promise<TenantOrderDetail> {
  const token = await authenticate();
  const order = await assertOrderInChannel(
    token,
    orderId,
    salesChannelId,
    TENANT_ORDER_DETAIL_FIELDS
  );
  if (order.canceled_at) {
    throw new MedusaApiError("El pedido está cancelado", 400);
  }
  const pending: AdminPayment[] = (order.payment_collections || []).flatMap((pc) =>
    (pc.payments || []).filter((p) => !p.captured_at && !p.canceled_at)
  );
  if (pending.length === 0) {
    throw new MedusaApiError("No hay pagos pendientes de capturar", 400);
  }
  for (const p of pending) {
    await adminFetch(token, `/admin/payments/${p.id}/capture`, {
      method: "POST",
      body: { amount: p.amount },
    });
  }
  return getTenantOrder(salesChannelId, orderId);
}

/** Crea la preparación (fulfillment) del pedido completo con todos sus artículos. */
export async function fulfillTenantOrder(
  salesChannelId: string,
  orderId: string
): Promise<TenantOrderDetail> {
  const token = await authenticate();
  const order = await assertOrderInChannel(
    token,
    orderId,
    salesChannelId,
    TENANT_ORDER_DETAIL_FIELDS
  );
  if (order.canceled_at) {
    throw new MedusaApiError("El pedido está cancelado", 400);
  }
  if ((order.fulfillment_status ?? "not_fulfilled") !== "not_fulfilled") {
    throw new MedusaApiError("El pedido ya está preparado", 400);
  }
  const items = (order.items || [])
    .filter((it) => (it.quantity ?? 0) > 0)
    .map((it) => ({ id: it.id, quantity: it.quantity }));
  if (items.length === 0) {
    throw new MedusaApiError("El pedido no tiene artículos que preparar", 400);
  }
  await adminFetch(token, `/admin/orders/${orderId}/fulfillments`, {
    method: "POST",
    body: { items },
  });
  return getTenantOrder(salesChannelId, orderId);
}

/** Marca una preparación como enviada (genera el envío/shipment). */
export async function shipTenantFulfillment(
  salesChannelId: string,
  orderId: string,
  fulfillmentId: string
): Promise<TenantOrderDetail> {
  const token = await authenticate();
  const order = await assertOrderInChannel(
    token,
    orderId,
    salesChannelId,
    TENANT_ORDER_DETAIL_FIELDS
  );
  const ful = (order.fulfillments || []).find((f) => f.id === fulfillmentId);
  if (!ful) {
    throw new MedusaApiError("Preparación no encontrada", 404);
  }
  if (ful.canceled_at) {
    throw new MedusaApiError("La preparación está cancelada", 400);
  }
  if (ful.shipped_at) {
    throw new MedusaApiError("La preparación ya está enviada", 400);
  }
  const items = (ful.items || [])
    .map((i) => ({ id: i.line_item_id || i.id, quantity: i.quantity }))
    .filter((i): i is { id: string; quantity: number | undefined } => !!i.id);
  await adminFetch(
    token,
    `/admin/orders/${orderId}/fulfillments/${fulfillmentId}/shipments`,
    { method: "POST", body: { items, labels: [] } }
  );
  return getTenantOrder(salesChannelId, orderId);
}

/** Cancela el pedido completo. */
export async function cancelTenantOrder(
  salesChannelId: string,
  orderId: string
): Promise<TenantOrderDetail> {
  const token = await authenticate();
  const order = await assertOrderInChannel(
    token,
    orderId,
    salesChannelId,
    "id,sales_channel_id,status,canceled_at"
  );
  if (order.canceled_at) {
    throw new MedusaApiError("El pedido ya está cancelado", 400);
  }
  await adminFetch(token, `/admin/orders/${orderId}/cancel`, {
    method: "POST",
    body: {},
  });
  return getTenantOrder(salesChannelId, orderId);
}

// ============================================================================
// CLIENTES DEL TENANT — derivados de los pedidos del Sales Channel (clon de
// Medusa Admin). Los clientes son entidades GLOBALES en Medusa, así que el
// aislamiento por tienda lo conseguimos agregando ÚNICAMENTE los pedidos hechos
// en el Sales Channel del tenant. Un cliente "existe" para esta tienda si tiene
// al menos un pedido en ella. La clave estable es el customer_id de Medusa si
// está presente; si no, el email en minúsculas.
// ============================================================================

export interface TenantCustomerSummary {
  id: string;
  customerId: string | null;
  name: string | null;
  email: string | null;
  orderCount: number;
  totalSpent: number;
  currencyCode: string;
  firstOrderAt: string | null;
  lastOrderAt: string | null;
}

export interface TenantCustomerDetail extends TenantCustomerSummary {
  phone: string | null;
  defaultAddress: TenantOrderAddress | null;
  orders: TenantOrderSummary[];
}

const TENANT_CUSTOMER_ORDER_FIELDS = [
  "id", "display_id", "status", "payment_status", "fulfillment_status",
  "total", "currency_code", "email", "created_at", "sales_channel_id",
  "*customer", "*shipping_address", "items.quantity",
].join(",");

/** Página interna: trae TODOS los pedidos del canal (paginando) para agregar clientes. */
async function fetchAllChannelOrders(
  token: string,
  salesChannelId: string,
  cap = 1000
): Promise<AdminOrder[]> {
  const pageSize = 100;
  const all: AdminOrder[] = [];
  let offset = 0;
  // Paginamos hasta agotar resultados o alcanzar el tope de seguridad.
  for (;;) {
    const data = await adminFetch<{ orders: AdminOrder[]; count: number }>(
      token,
      `/admin/orders?sales_channel_id[]=${encodeURIComponent(salesChannelId)}` +
        `&fields=${TENANT_CUSTOMER_ORDER_FIELDS}&order=-created_at&limit=${pageSize}&offset=${offset}`
    );
    const batch = data.orders || [];
    all.push(...batch);
    offset += pageSize;
    if (batch.length < pageSize || all.length >= cap || offset >= (data.count ?? 0)) break;
  }
  return all;
}

/** Clave de agrupación estable de un pedido en un cliente. */
function customerKey(o: AdminOrder): string | null {
  if (o.customer?.id) return o.customer.id;
  const email = (o.email || o.customer?.email || "").trim().toLowerCase();
  return email ? `email:${email}` : null;
}

/** Agrega una lista de pedidos en clientes únicos, ordenados por gasto total. */
function aggregateCustomers(orders: AdminOrder[]): Map<string, AdminOrder[]> {
  const byCustomer = new Map<string, AdminOrder[]>();
  for (const o of orders) {
    const key = customerKey(o);
    if (!key) continue;
    const list = byCustomer.get(key);
    if (list) list.push(o);
    else byCustomer.set(key, [o]);
  }
  return byCustomer;
}

/** Construye el resumen de un cliente a partir de sus pedidos (más recientes primero). */
function toCustomerSummary(key: string, orders: AdminOrder[]): TenantCustomerSummary {
  // Los pedidos vienen ordenados -created_at; el primero es el más reciente.
  const sorted = [...orders].sort((a, b) =>
    (b.created_at || "").localeCompare(a.created_at || "")
  );
  const latest = sorted[0];
  const oldest = sorted[sorted.length - 1];
  const totalSpent = sorted.reduce((sum, o) => sum + (o.total ?? 0), 0);
  return {
    id: key,
    customerId: latest.customer?.id ?? null,
    name: customerName(latest),
    email: latest.email || latest.customer?.email || null,
    orderCount: sorted.length,
    totalSpent,
    currencyCode: latest.currency_code || "eur",
    firstOrderAt: oldest.created_at ?? null,
    lastOrderAt: latest.created_at ?? null,
  };
}

export interface TenantCustomersPage {
  customers: TenantCustomerSummary[];
  count: number;
  offset: number;
  limit: number;
}

/** Lista de clientes del tenant, derivada de los pedidos de su Sales Channel. */
export async function listTenantCustomers(
  salesChannelId: string,
  opts: { limit?: number; offset?: number } = {}
): Promise<TenantCustomersPage> {
  const token = await authenticate();
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 100);
  const offset = Math.max(opts.offset ?? 0, 0);
  const orders = await fetchAllChannelOrders(token, salesChannelId);
  const grouped = aggregateCustomers(orders);
  const summaries = Array.from(grouped.entries())
    .map(([key, list]) => toCustomerSummary(key, list))
    .sort((a, b) => {
      // Orden por última compra (desc); desempate por gasto total.
      const byDate = (b.lastOrderAt || "").localeCompare(a.lastOrderAt || "");
      return byDate !== 0 ? byDate : b.totalSpent - a.totalSpent;
    });
  return {
    customers: summaries.slice(offset, offset + limit),
    count: summaries.length,
    offset,
    limit,
  };
}

/** Detalle de un cliente del tenant: sus pedidos + dirección más reciente. */
export async function getTenantCustomer(
  salesChannelId: string,
  customerKeyId: string
): Promise<TenantCustomerDetail> {
  const token = await authenticate();
  const orders = await fetchAllChannelOrders(token, salesChannelId);
  const grouped = aggregateCustomers(orders);
  const list = grouped.get(customerKeyId);
  if (!list || list.length === 0) {
    throw new MedusaApiError("Cliente no encontrado en esta tienda", 404);
  }
  const sorted = [...list].sort((a, b) =>
    (b.created_at || "").localeCompare(a.created_at || "")
  );
  const latest = sorted[0];
  const sa = latest.shipping_address;
  const defaultAddress: TenantOrderAddress | null = sa
    ? {
        name: [sa.first_name, sa.last_name].filter(Boolean).join(" ").trim() || null,
        line1: sa.address_1 ?? null,
        line2: sa.address_2 ?? null,
        city: sa.city ?? null,
        postalCode: sa.postal_code ?? null,
        province: sa.province ?? null,
        countryCode: sa.country_code ?? null,
        phone: sa.phone ?? null,
      }
    : null;
  return {
    ...toCustomerSummary(customerKeyId, sorted),
    phone: sa?.phone ?? null,
    defaultAddress,
    orders: sorted.map(toOrderSummary),
  };
}

// ============================================================================
// COLECCIONES DEL TENANT — clon de Medusa Admin. Las colecciones son entidades
// GLOBALES en Medusa (no se cuelgan de un Sales Channel), así que el aislamiento
// por tienda lo conseguimos MARCANDO la propiedad en `metadata.avialo_owner =
// salesChannelId` al crearlas, y filtrando/verificando por ese marcador en toda
// lectura/escritura. La barrera de seguridad es `assertCollectionOwned`.
// El `handle` debe ser único en TODA la tienda compartida → lo prefijamos con un
// slug del tenant + sufijo aleatorio para evitar colisiones entre tiendas.
// ============================================================================

const AVIALO_OWNER_KEY = "avialo_owner";

interface AdminCollection {
  id: string;
  title: string;
  handle?: string | null;
  created_at?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface TenantCollectionSummary {
  id: string;
  title: string;
  handle: string | null;
  productCount: number;
  createdAt: string | null;
}

export interface TenantCollectionProduct {
  id: string;
  title: string;
  status: string;
  thumbnail: string | null;
  handle: string | null;
}

export interface TenantCollectionDetail extends TenantCollectionSummary {
  products: TenantCollectionProduct[];
}

export interface TenantCollectionInput {
  title: string;
  handle?: string;
}

export interface TenantCollectionPatch {
  title?: string;
  handle?: string;
}

export interface TenantCollectionsPage {
  collections: TenantCollectionSummary[];
  count: number;
  offset: number;
  limit: number;
}

/** Slug corto y estable del tenant a partir del Sales Channel (para prefijar handles). */
function tenantSlug(salesChannelId: string): string {
  return salesChannelId.replace(/^sc_/, "").slice(0, 12).toLowerCase();
}

/** Devuelve el Sales Channel propietario de una colección (marcador de aislamiento). */
function collectionOwner(c: AdminCollection): string | null {
  const owner = c.metadata?.[AVIALO_OWNER_KEY];
  return typeof owner === "string" ? owner : null;
}

/** Construye un handle único en la tienda compartida (prefijo de tenant + slug + sufijo). */
function buildCollectionHandle(salesChannelId: string, base: string): string {
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${tenantSlug(salesChannelId)}-${slugify(base) || "coleccion"}-${suffix}`;
}

/**
 * Verifica que una colección pertenece al tenant (barrera de seguridad).
 * Lanza 404 si no existe y 403/404 si es de otra tienda (no revelamos su existencia).
 */
async function assertCollectionOwned(
  token: string,
  collectionId: string,
  salesChannelId: string
): Promise<AdminCollection> {
  let collection: AdminCollection;
  try {
    const data = await adminFetch<{ collection: AdminCollection }>(
      token,
      `/admin/collections/${collectionId}?fields=id,title,handle,created_at,metadata`
    );
    collection = data.collection;
  } catch (err) {
    if (err instanceof MedusaApiError && err.status === 404) {
      throw new MedusaApiError("Colección no encontrada", 404);
    }
    throw err;
  }
  // Un id inexistente/malformado puede devolver 200 sin entidad → tratar como 404.
  if (!collection || collectionOwner(collection) !== salesChannelId) {
    throw new MedusaApiError("Colección no disponible en esta tienda", 404);
  }
  return collection;
}

/** Trae TODAS las colecciones del tenant (paginando el catálogo global y filtrando por propiedad). */
async function fetchAllOwnedCollections(
  token: string,
  salesChannelId: string,
  cap = 500
): Promise<AdminCollection[]> {
  const pageSize = 100;
  const owned: AdminCollection[] = [];
  let offset = 0;
  for (;;) {
    const data = await adminFetch<{ collections: AdminCollection[]; count: number }>(
      token,
      `/admin/collections?fields=id,title,handle,created_at,metadata&limit=${pageSize}&offset=${offset}`
    );
    const batch = data.collections || [];
    for (const c of batch) {
      if (collectionOwner(c) === salesChannelId) owned.push(c);
    }
    offset += pageSize;
    if (batch.length < pageSize || offset >= (data.count ?? 0) || offset >= cap) break;
  }
  return owned;
}

/** Cuenta productos del tenant por colección (1 sola query, acotada al canal). */
async function tenantCollectionCounts(
  token: string,
  salesChannelId: string
): Promise<Map<string, number>> {
  const data = await adminFetch<{ products: { collection_id?: string | null }[] }>(
    token,
    `/admin/products?sales_channel_id[]=${encodeURIComponent(salesChannelId)}` +
      `&fields=id,collection_id&limit=200`
  );
  const counts = new Map<string, number>();
  for (const p of data.products || []) {
    if (p.collection_id) counts.set(p.collection_id, (counts.get(p.collection_id) || 0) + 1);
  }
  return counts;
}

function toCollectionSummary(c: AdminCollection, productCount: number): TenantCollectionSummary {
  return {
    id: c.id,
    title: c.title,
    handle: c.handle ?? null,
    productCount,
    createdAt: c.created_at ?? null,
  };
}

/** Lista las colecciones del tenant con su nº de productos. */
export async function listTenantCollections(
  salesChannelId: string,
  opts: { limit?: number; offset?: number } = {}
): Promise<TenantCollectionsPage> {
  const token = await authenticate();
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 100);
  const offset = Math.max(opts.offset ?? 0, 0);
  const [owned, counts] = await Promise.all([
    fetchAllOwnedCollections(token, salesChannelId),
    tenantCollectionCounts(token, salesChannelId),
  ]);
  const summaries = owned
    .map((c) => toCollectionSummary(c, counts.get(c.id) || 0))
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  return {
    collections: summaries.slice(offset, offset + limit),
    count: summaries.length,
    offset,
    limit,
  };
}

/** Detalle de una colección del tenant: sus productos (acotados al canal). */
export async function getTenantCollection(
  salesChannelId: string,
  collectionId: string
): Promise<TenantCollectionDetail> {
  const token = await authenticate();
  const collection = await assertCollectionOwned(token, collectionId, salesChannelId);
  const data = await adminFetch<{ products: AdminProduct[] }>(
    token,
    `/admin/products?collection_id[]=${encodeURIComponent(collectionId)}` +
      `&sales_channel_id[]=${encodeURIComponent(salesChannelId)}` +
      `&fields=id,title,status,thumbnail,handle&limit=200`
  );
  const products: TenantCollectionProduct[] = (data.products || []).map((p) => ({
    id: p.id,
    title: p.title,
    status: p.status,
    thumbnail: p.thumbnail ?? null,
    handle: p.handle ?? null,
  }));
  return { ...toCollectionSummary(collection, products.length), products };
}

/** Crea una colección marcada como propiedad del tenant. */
export async function createTenantCollection(
  salesChannelId: string,
  input: TenantCollectionInput
): Promise<TenantCollectionSummary> {
  if (!input.title?.trim()) {
    throw new MedusaApiError("El título de la colección es obligatorio", 400);
  }
  const token = await authenticate();
  const handle = buildCollectionHandle(salesChannelId, input.handle || input.title);
  const data = await adminFetch<{ collection: AdminCollection }>(token, "/admin/collections", {
    method: "POST",
    body: {
      title: input.title.trim(),
      handle,
      metadata: { [AVIALO_OWNER_KEY]: salesChannelId },
    },
  });
  return toCollectionSummary(data.collection, 0);
}

/** Actualiza una colección del tenant (verifica propiedad antes). */
export async function updateTenantCollection(
  salesChannelId: string,
  collectionId: string,
  patch: TenantCollectionPatch
): Promise<TenantCollectionSummary> {
  const token = await authenticate();
  await assertCollectionOwned(token, collectionId, salesChannelId);
  const body: Record<string, unknown> = {};
  if (patch.title != null) {
    if (!patch.title.trim()) {
      throw new MedusaApiError("El título de la colección no puede estar vacío", 400);
    }
    body.title = patch.title.trim();
  }
  // Si cambian el handle, lo re-prefijamos para conservar la unicidad global.
  if (patch.handle != null) {
    body.handle = buildCollectionHandle(salesChannelId, patch.handle);
  }
  // NO enviamos metadata para no pisar el marcador de propiedad (Medusa lo reemplaza).
  const data = await adminFetch<{ collection: AdminCollection }>(
    token,
    `/admin/collections/${collectionId}`,
    { method: "POST", body }
  );
  const counts = await tenantCollectionCounts(token, salesChannelId);
  return toCollectionSummary(data.collection, counts.get(collectionId) || 0);
}

/** Elimina una colección del tenant (verifica propiedad antes). */
export async function deleteTenantCollection(
  salesChannelId: string,
  collectionId: string
): Promise<void> {
  const token = await authenticate();
  await assertCollectionOwned(token, collectionId, salesChannelId);
  await adminFetch(token, `/admin/collections/${collectionId}`, { method: "DELETE" });
}

/** Añade productos del tenant a una colección suya (verifica propiedad de ambos). */
export async function addProductsToTenantCollection(
  salesChannelId: string,
  collectionId: string,
  productIds: string[]
): Promise<void> {
  const token = await authenticate();
  await assertCollectionOwned(token, collectionId, salesChannelId);
  // Cada producto debe pertenecer al canal del tenant (barrera anti cross-tenant).
  for (const id of productIds) {
    await assertProductInChannel(token, id, salesChannelId);
  }
  await adminFetch(token, `/admin/collections/${collectionId}/products`, {
    method: "POST",
    body: { add: productIds },
  });
}

/** Quita productos de una colección del tenant (verifica propiedad). */
export async function removeProductsFromTenantCollection(
  salesChannelId: string,
  collectionId: string,
  productIds: string[]
): Promise<void> {
  const token = await authenticate();
  await assertCollectionOwned(token, collectionId, salesChannelId);
  await adminFetch(token, `/admin/collections/${collectionId}/products`, {
    method: "POST",
    body: { remove: productIds },
  });
}

// ============================================================================
// CATEGORÍAS DEL TENANT — mismo aislamiento que colecciones (`metadata.avialo_owner`),
// pero las categorías son JERÁRQUICAS (parent/children) y MANY-TO-MANY con productos.
// Un padre debe pertenecer al MISMO tenant (verificado al crear/editar). Barrera de
// seguridad: `assertCategoryOwned`. Endpoint Medusa: /admin/product-categories.
// ============================================================================

interface AdminCategory {
  id: string;
  name: string;
  handle?: string | null;
  description?: string | null;
  is_active?: boolean;
  is_internal?: boolean;
  parent_category_id?: string | null;
  created_at?: string | null;
  metadata?: Record<string, unknown> | null;
  category_children?: { id: string; name: string; metadata?: Record<string, unknown> | null }[];
}

export interface TenantCategorySummary {
  id: string;
  name: string;
  handle: string | null;
  isActive: boolean;
  parentId: string | null;
  productCount: number;
  createdAt: string | null;
}

export interface TenantCategoryChild {
  id: string;
  name: string;
}

export interface TenantCategoryDetail extends TenantCategorySummary {
  description: string | null;
  parentName: string | null;
  children: TenantCategoryChild[];
  products: TenantCollectionProduct[];
}

export interface TenantCategoryInput {
  name: string;
  handle?: string;
  description?: string;
  parentId?: string | null;
}

export interface TenantCategoryPatch {
  name?: string;
  handle?: string;
  description?: string | null;
  isActive?: boolean;
  parentId?: string | null;
}

export interface TenantCategoriesPage {
  categories: TenantCategorySummary[];
  count: number;
  offset: number;
  limit: number;
}

const CATEGORY_FIELDS =
  "id,name,handle,description,is_active,parent_category_id,created_at,metadata";

/** Propietario (Sales Channel) marcado en la metadata de una categoría. */
function categoryOwner(c: { metadata?: Record<string, unknown> | null }): string | null {
  const owner = c.metadata?.[AVIALO_OWNER_KEY];
  return typeof owner === "string" ? owner : null;
}

/** Verifica que una categoría pertenece al tenant (barrera de seguridad). 404 si ajena. */
async function assertCategoryOwned(
  token: string,
  categoryId: string,
  salesChannelId: string,
  fields = CATEGORY_FIELDS
): Promise<AdminCategory> {
  let category: AdminCategory;
  try {
    const data = await adminFetch<{ product_category: AdminCategory }>(
      token,
      `/admin/product-categories/${categoryId}?fields=${fields}`
    );
    category = data.product_category;
  } catch (err) {
    if (err instanceof MedusaApiError && err.status === 404) {
      throw new MedusaApiError("Categoría no encontrada", 404);
    }
    throw err;
  }
  if (!category || categoryOwner(category) !== salesChannelId) {
    throw new MedusaApiError("Categoría no disponible en esta tienda", 404);
  }
  return category;
}

/** Trae TODAS las categorías del tenant (paginando el catálogo global y filtrando por propiedad). */
async function fetchAllOwnedCategories(
  token: string,
  salesChannelId: string,
  cap = 500
): Promise<AdminCategory[]> {
  const pageSize = 100;
  const owned: AdminCategory[] = [];
  let offset = 0;
  for (;;) {
    const data = await adminFetch<{ product_categories: AdminCategory[]; count: number }>(
      token,
      `/admin/product-categories?fields=${CATEGORY_FIELDS}&limit=${pageSize}&offset=${offset}`
    );
    const batch = data.product_categories || [];
    for (const c of batch) {
      if (categoryOwner(c) === salesChannelId) owned.push(c);
    }
    offset += pageSize;
    if (batch.length < pageSize || offset >= (data.count ?? 0) || offset >= cap) break;
  }
  return owned;
}

/** Cuenta productos del tenant por categoría (1 sola query, acotada al canal). */
async function tenantCategoryCounts(
  token: string,
  salesChannelId: string
): Promise<Map<string, number>> {
  const data = await adminFetch<{ products: { categories?: { id: string }[] }[] }>(
    token,
    `/admin/products?sales_channel_id[]=${encodeURIComponent(salesChannelId)}` +
      `&fields=id,categories.id&limit=200`
  );
  const counts = new Map<string, number>();
  for (const p of data.products || []) {
    for (const cat of p.categories || []) {
      counts.set(cat.id, (counts.get(cat.id) || 0) + 1);
    }
  }
  return counts;
}

function toCategorySummary(c: AdminCategory, productCount: number): TenantCategorySummary {
  return {
    id: c.id,
    name: c.name,
    handle: c.handle ?? null,
    isActive: c.is_active ?? false,
    parentId: c.parent_category_id ?? null,
    productCount,
    createdAt: c.created_at ?? null,
  };
}

/** Lista las categorías del tenant con su nº de productos. */
export async function listTenantCategories(
  salesChannelId: string,
  opts: { limit?: number; offset?: number } = {}
): Promise<TenantCategoriesPage> {
  const token = await authenticate();
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 100);
  const offset = Math.max(opts.offset ?? 0, 0);
  const [owned, counts] = await Promise.all([
    fetchAllOwnedCategories(token, salesChannelId),
    tenantCategoryCounts(token, salesChannelId),
  ]);
  const summaries = owned
    .map((c) => toCategorySummary(c, counts.get(c.id) || 0))
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  return {
    categories: summaries.slice(offset, offset + limit),
    count: summaries.length,
    offset,
    limit,
  };
}

/** Detalle de una categoría del tenant: productos (acotados al canal) + subcategorías propias. */
export async function getTenantCategory(
  salesChannelId: string,
  categoryId: string
): Promise<TenantCategoryDetail> {
  const token = await authenticate();
  const category = await assertCategoryOwned(
    token,
    categoryId,
    salesChannelId,
    `${CATEGORY_FIELDS},category_children.id,category_children.name,category_children.metadata`
  );

  // Productos de la categoría, acotados al canal del tenant.
  const prodData = await adminFetch<{ products: AdminProduct[] }>(
    token,
    `/admin/products?category_id[]=${encodeURIComponent(categoryId)}` +
      `&sales_channel_id[]=${encodeURIComponent(salesChannelId)}` +
      `&fields=id,title,status,thumbnail,handle&limit=200`
  );
  const products: TenantCollectionProduct[] = (prodData.products || []).map((p) => ({
    id: p.id,
    title: p.title,
    status: p.status,
    thumbnail: p.thumbnail ?? null,
    handle: p.handle ?? null,
  }));

  // Solo subcategorías propias del tenant.
  const children: TenantCategoryChild[] = (category.category_children || [])
    .filter((ch) => categoryOwner(ch) === salesChannelId)
    .map((ch) => ({ id: ch.id, name: ch.name }));

  // Nombre del padre (si lo tiene y es propio).
  let parentName: string | null = null;
  if (category.parent_category_id) {
    try {
      const parent = await assertCategoryOwned(token, category.parent_category_id, salesChannelId);
      parentName = parent.name;
    } catch {
      parentName = null;
    }
  }

  return {
    ...toCategorySummary(category, products.length),
    description: category.description ?? null,
    parentName,
    children,
    products,
  };
}

/** Crea una categoría marcada como propiedad del tenant (padre opcional, también propio). */
export async function createTenantCategory(
  salesChannelId: string,
  input: TenantCategoryInput
): Promise<TenantCategorySummary> {
  if (!input.name?.trim()) {
    throw new MedusaApiError("El nombre de la categoría es obligatorio", 400);
  }
  const token = await authenticate();
  // El padre debe pertenecer al mismo tenant (anti cross-tenant en la jerarquía).
  if (input.parentId) {
    await assertCategoryOwned(token, input.parentId, salesChannelId);
  }
  const handle = buildCollectionHandle(salesChannelId, input.handle || input.name);
  const data = await adminFetch<{ product_category: AdminCategory }>(
    token,
    "/admin/product-categories",
    {
      method: "POST",
      body: {
        name: input.name.trim(),
        handle,
        description: input.description?.trim() || "",
        is_active: true,
        ...(input.parentId ? { parent_category_id: input.parentId } : {}),
        metadata: { [AVIALO_OWNER_KEY]: salesChannelId },
      },
    }
  );
  return toCategorySummary(data.product_category, 0);
}

/** Actualiza una categoría del tenant (verifica propiedad; padre propio y sin ciclos). */
export async function updateTenantCategory(
  salesChannelId: string,
  categoryId: string,
  patch: TenantCategoryPatch
): Promise<TenantCategorySummary> {
  const token = await authenticate();
  await assertCategoryOwned(token, categoryId, salesChannelId);
  const body: Record<string, unknown> = {};
  if (patch.name != null) {
    if (!patch.name.trim()) {
      throw new MedusaApiError("El nombre no puede estar vacío", 400);
    }
    body.name = patch.name.trim();
  }
  if (patch.handle != null) body.handle = buildCollectionHandle(salesChannelId, patch.handle);
  if (patch.description !== undefined) body.description = patch.description?.trim() || "";
  if (patch.isActive !== undefined) body.is_active = patch.isActive;
  if (patch.parentId !== undefined) {
    if (patch.parentId === categoryId) {
      throw new MedusaApiError("Una categoría no puede ser su propio padre", 400);
    }
    if (patch.parentId) {
      await assertCategoryOwned(token, patch.parentId, salesChannelId);
    }
    body.parent_category_id = patch.parentId;
  }
  // NO enviamos metadata para no pisar el marcador de propiedad.
  const data = await adminFetch<{ product_category: AdminCategory }>(
    token,
    `/admin/product-categories/${categoryId}`,
    { method: "POST", body }
  );
  const counts = await tenantCategoryCounts(token, salesChannelId);
  return toCategorySummary(data.product_category, counts.get(categoryId) || 0);
}

/** Elimina una categoría del tenant (verifica propiedad antes). */
export async function deleteTenantCategory(
  salesChannelId: string,
  categoryId: string
): Promise<void> {
  const token = await authenticate();
  await assertCategoryOwned(token, categoryId, salesChannelId);
  await adminFetch(token, `/admin/product-categories/${categoryId}`, { method: "DELETE" });
}

/** Añade productos del tenant a una categoría suya (verifica propiedad de ambos). */
export async function addProductsToTenantCategory(
  salesChannelId: string,
  categoryId: string,
  productIds: string[]
): Promise<void> {
  const token = await authenticate();
  await assertCategoryOwned(token, categoryId, salesChannelId);
  for (const id of productIds) {
    await assertProductInChannel(token, id, salesChannelId);
  }
  await adminFetch(token, `/admin/product-categories/${categoryId}/products`, {
    method: "POST",
    body: { add: productIds },
  });
}

/** Quita productos de una categoría del tenant (verifica propiedad). */
export async function removeProductsFromTenantCategory(
  salesChannelId: string,
  categoryId: string,
  productIds: string[]
): Promise<void> {
  const token = await authenticate();
  await assertCategoryOwned(token, categoryId, salesChannelId);
  await adminFetch(token, `/admin/product-categories/${categoryId}/products`, {
    method: "POST",
    body: { remove: productIds },
  });
}

// ============================================================================
// ETIQUETAS DEL TENANT — entidad global con 2 particularidades vs colecciones:
// (1) el `value` es ÚNICO en TODA la tienda compartida (Medusa lo fuerza), así que
//     lo prefijamos con el slug del tenant + sufijo y guardamos la etiqueta VISIBLE
//     en `metadata.avialo_label`; el panel muestra el label, no el value crudo.
// (2) NO hay endpoint batch tag↔productos: los productos se asocian vía
//     `POST /admin/products/:id { tags:[{id}] }` (reemplaza el array completo), por
//     lo que añadir/quitar = leer las tags actuales del producto y reescribirlas.
// Aislamiento: `metadata.avialo_owner`. Barrera: `assertTagOwned`.
// ============================================================================

const AVIALO_LABEL_KEY = "avialo_label";

interface AdminTagEntity {
  id: string;
  value: string;
  created_at?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface TenantTagSummary {
  id: string;
  label: string;
  value: string;
  productCount: number;
  createdAt: string | null;
}

export interface TenantTagDetail extends TenantTagSummary {
  products: TenantCollectionProduct[];
}

export interface TenantTagInput {
  label: string;
}

export interface TenantTagPatch {
  label?: string;
}

export interface TenantTagsPage {
  tags: TenantTagSummary[];
  count: number;
  offset: number;
  limit: number;
}

const TAG_FIELDS = "id,value,created_at,metadata";

/** Propietario (Sales Channel) marcado en la metadata de una etiqueta. */
function tagOwner(t: { metadata?: Record<string, unknown> | null }): string | null {
  const owner = t.metadata?.[AVIALO_OWNER_KEY];
  return typeof owner === "string" ? owner : null;
}

/** Etiqueta visible (metadata.avialo_label) con fallback al value crudo. */
function tagLabel(t: AdminTagEntity): string {
  const label = t.metadata?.[AVIALO_LABEL_KEY];
  return typeof label === "string" && label.trim() ? label : t.value;
}

/** Verifica que una etiqueta pertenece al tenant (barrera de seguridad). 404 si ajena. */
async function assertTagOwned(
  token: string,
  tagId: string,
  salesChannelId: string
): Promise<AdminTagEntity> {
  let tag: AdminTagEntity;
  try {
    const data = await adminFetch<{ product_tag: AdminTagEntity }>(
      token,
      `/admin/product-tags/${tagId}?fields=${TAG_FIELDS}`
    );
    tag = data.product_tag;
  } catch (err) {
    if (err instanceof MedusaApiError && err.status === 404) {
      throw new MedusaApiError("Etiqueta no encontrada", 404);
    }
    throw err;
  }
  if (!tag || tagOwner(tag) !== salesChannelId) {
    throw new MedusaApiError("Etiqueta no disponible en esta tienda", 404);
  }
  return tag;
}

/** Trae TODAS las etiquetas del tenant (paginando el catálogo global y filtrando por propiedad). */
async function fetchAllOwnedTags(
  token: string,
  salesChannelId: string,
  cap = 1000
): Promise<AdminTagEntity[]> {
  const pageSize = 100;
  const owned: AdminTagEntity[] = [];
  let offset = 0;
  for (;;) {
    const data = await adminFetch<{ product_tags: AdminTagEntity[]; count: number }>(
      token,
      `/admin/product-tags?fields=${TAG_FIELDS}&limit=${pageSize}&offset=${offset}`
    );
    const batch = data.product_tags || [];
    for (const t of batch) {
      if (tagOwner(t) === salesChannelId) owned.push(t);
    }
    offset += pageSize;
    if (batch.length < pageSize || offset >= (data.count ?? 0) || offset >= cap) break;
  }
  return owned;
}

/** Cuenta productos del tenant por etiqueta (1 sola query, acotada al canal). */
async function tenantTagCounts(
  token: string,
  salesChannelId: string
): Promise<Map<string, number>> {
  const data = await adminFetch<{ products: { tags?: { id: string }[] }[] }>(
    token,
    `/admin/products?sales_channel_id[]=${encodeURIComponent(salesChannelId)}` +
      `&fields=id,tags.id&limit=200`
  );
  const counts = new Map<string, number>();
  for (const p of data.products || []) {
    for (const tag of p.tags || []) {
      counts.set(tag.id, (counts.get(tag.id) || 0) + 1);
    }
  }
  return counts;
}

/** Tags actuales (ids) de un producto, para reescribir el array al añadir/quitar. */
async function fetchProductTagIds(token: string, productId: string): Promise<string[]> {
  const data = await adminFetch<{ product: { tags?: { id: string }[] } }>(
    token,
    `/admin/products/${productId}?fields=id,tags.id`
  );
  return (data.product.tags || []).map((t) => t.id);
}

function toTagSummary(t: AdminTagEntity, productCount: number): TenantTagSummary {
  return {
    id: t.id,
    label: tagLabel(t),
    value: t.value,
    productCount,
    createdAt: t.created_at ?? null,
  };
}

/** Lista las etiquetas del tenant con su nº de productos. */
export async function listTenantTags(
  salesChannelId: string,
  opts: { limit?: number; offset?: number } = {}
): Promise<TenantTagsPage> {
  const token = await authenticate();
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 100);
  const offset = Math.max(opts.offset ?? 0, 0);
  const [owned, counts] = await Promise.all([
    fetchAllOwnedTags(token, salesChannelId),
    tenantTagCounts(token, salesChannelId),
  ]);
  const summaries = owned
    .map((t) => toTagSummary(t, counts.get(t.id) || 0))
    .sort((a, b) => a.label.localeCompare(b.label, "es"));
  return {
    tags: summaries.slice(offset, offset + limit),
    count: summaries.length,
    offset,
    limit,
  };
}

/** Detalle de una etiqueta del tenant: sus productos (acotados al canal). */
export async function getTenantTag(
  salesChannelId: string,
  tagId: string
): Promise<TenantTagDetail> {
  const token = await authenticate();
  const tag = await assertTagOwned(token, tagId, salesChannelId);
  const data = await adminFetch<{ products: AdminProduct[] }>(
    token,
    `/admin/products?tag_id[]=${encodeURIComponent(tagId)}` +
      `&sales_channel_id[]=${encodeURIComponent(salesChannelId)}` +
      `&fields=id,title,status,thumbnail,handle&limit=200`
  );
  const products: TenantCollectionProduct[] = (data.products || []).map((p) => ({
    id: p.id,
    title: p.title,
    status: p.status,
    thumbnail: p.thumbnail ?? null,
    handle: p.handle ?? null,
  }));
  return { ...toTagSummary(tag, products.length), products };
}

/** Crea una etiqueta marcada como propiedad del tenant (value prefijado + label visible). */
export async function createTenantTag(
  salesChannelId: string,
  input: TenantTagInput
): Promise<TenantTagSummary> {
  if (!input.label?.trim()) {
    throw new MedusaApiError("La etiqueta no puede estar vacía", 400);
  }
  const token = await authenticate();
  const label = input.label.trim();
  // value único global = slug del tenant + slug del label + sufijo.
  const value = buildCollectionHandle(salesChannelId, label);
  const data = await adminFetch<{ product_tag: AdminTagEntity }>(token, "/admin/product-tags", {
    method: "POST",
    body: {
      value,
      metadata: { [AVIALO_OWNER_KEY]: salesChannelId, [AVIALO_LABEL_KEY]: label },
    },
  });
  return toTagSummary(data.product_tag, 0);
}

/** Renombra una etiqueta del tenant (solo cambia el label visible en metadata). */
export async function updateTenantTag(
  salesChannelId: string,
  tagId: string,
  patch: TenantTagPatch
): Promise<TenantTagSummary> {
  const token = await authenticate();
  await assertTagOwned(token, tagId, salesChannelId);
  if (patch.label == null || !patch.label.trim()) {
    throw new MedusaApiError("La etiqueta no puede estar vacía", 400);
  }
  // Reescribimos la metadata COMPLETA (incluye el owner para no perderlo).
  const data = await adminFetch<{ product_tag: AdminTagEntity }>(
    token,
    `/admin/product-tags/${tagId}`,
    {
      method: "POST",
      body: {
        metadata: { [AVIALO_OWNER_KEY]: salesChannelId, [AVIALO_LABEL_KEY]: patch.label.trim() },
      },
    }
  );
  const counts = await tenantTagCounts(token, salesChannelId);
  return toTagSummary(data.product_tag, counts.get(tagId) || 0);
}

/** Elimina una etiqueta del tenant (verifica propiedad antes). */
export async function deleteTenantTag(
  salesChannelId: string,
  tagId: string
): Promise<void> {
  const token = await authenticate();
  await assertTagOwned(token, tagId, salesChannelId);
  await adminFetch(token, `/admin/product-tags/${tagId}`, { method: "DELETE" });
}

/** Añade una etiqueta del tenant a varios productos suyos (reescribe sus tags). */
export async function addProductsToTenantTag(
  salesChannelId: string,
  tagId: string,
  productIds: string[]
): Promise<void> {
  const token = await authenticate();
  await assertTagOwned(token, tagId, salesChannelId);
  for (const id of productIds) {
    await assertProductInChannel(token, id, salesChannelId);
    const current = await fetchProductTagIds(token, id);
    if (current.includes(tagId)) continue; // ya la tiene
    const next = [...current, tagId].map((t) => ({ id: t }));
    await adminFetch(token, `/admin/products/${id}`, { method: "POST", body: { tags: next } });
  }
}

/** Quita una etiqueta del tenant de varios productos (reescribe sus tags sin ella). */
export async function removeProductsFromTenantTag(
  salesChannelId: string,
  tagId: string,
  productIds: string[]
): Promise<void> {
  const token = await authenticate();
  await assertTagOwned(token, tagId, salesChannelId);
  for (const id of productIds) {
    await assertProductInChannel(token, id, salesChannelId);
    const current = await fetchProductTagIds(token, id);
    if (!current.includes(tagId)) continue;
    const next = current.filter((t) => t !== tagId).map((t) => ({ id: t }));
    await adminFetch(token, `/admin/products/${id}`, { method: "POST", body: { tags: next } });
  }
}

// ============================================================================
// DESCUENTOS / PROMOCIONES DEL TENANT — clon de Medusa Admin (Promociones).
// Las promociones son entidades GLOBALES en Medusa y NO admiten `metadata`, así
// que el aislamiento por tienda NO puede usar el patrón avialo_owner. En su lugar
// usamos una CAMPAÑA por tenant: cada tienda tiene una campaña con un
// `campaign_identifier` único derivado de su Sales Channel (`avtenant_<scId>`,
// con el id COMPLETO para evitar colisiones). Toda promoción del tenant se asigna
// a esa campaña; la lista se filtra server-side por `campaign_id` y la barrera de
// seguridad (`assertPromotionOwned`) comprueba que la campaña de la promoción es
// la del tenant → 404 si es ajena. El `code` es ÚNICO en toda la tienda compartida,
// así que lo prefijamos con el slug del tenant y mostramos el código SIN prefijo.
// ============================================================================

const PROMO_CAMPAIGN_PREFIX = "avtenant_";

interface AdminCampaign {
  id: string;
  name?: string | null;
  campaign_identifier?: string | null;
}
interface AdminApplicationMethod {
  id?: string;
  type?: string | null; // "percentage" | "fixed"
  target_type?: string | null; // "order" | "items" | "shipping_methods"
  value?: number | null;
  currency_code?: string | null;
  allocation?: string | null;
}
interface AdminPromotion {
  id: string;
  code: string;
  status?: string | null; // "active" | "draft" | "inactive"
  type?: string | null; // "standard" | "buyget"
  is_automatic?: boolean;
  campaign_id?: string | null;
  campaign?: AdminCampaign | null;
  application_method?: AdminApplicationMethod | null;
  created_at?: string | null;
}

export type TenantPromotionType = "percentage" | "fixed";
export type TenantPromotionStatus = "active" | "draft" | "inactive";

export interface TenantPromotionSummary {
  id: string;
  code: string; // código visible (sin el prefijo interno del tenant)
  status: string;
  valueType: TenantPromotionType;
  value: number;
  currencyCode: string | null;
  isAutomatic: boolean;
  createdAt: string | null;
}

export interface TenantPromotionDetail extends TenantPromotionSummary {
  targetType: string | null;
}

export interface TenantPromotionInput {
  code: string;
  valueType: TenantPromotionType;
  value: number;
  status?: TenantPromotionStatus;
}

export interface TenantPromotionPatch {
  code?: string;
  value?: number;
  status?: TenantPromotionStatus;
}

const PROMOTION_FIELDS = [
  "id", "code", "status", "type", "is_automatic", "created_at",
  "campaign_id", "*campaign", "*application_method",
].join(",");

/** Identificador único de la campaña del tenant (id COMPLETO del canal). */
function tenantCampaignIdentifier(salesChannelId: string): string {
  return PROMO_CAMPAIGN_PREFIX + salesChannelId;
}

/** Prefijo interno del código de promoción para garantizar unicidad global. */
function promoCodePrefix(salesChannelId: string): string {
  return tenantSlug(salesChannelId) + "-";
}

/**
 * Prefijo público de los códigos de promoción del tenant. La storefront lo usa
 * para reconstruir el código REAL en Medusa (`<prefijo><CÓDIGO_VISIBLE>`) al
 * aplicar un cupón en el carrito. No es secreto (se deriva del Sales Channel).
 */
export function tenantPromoCodePrefix(salesChannelId: string): string {
  return promoCodePrefix(salesChannelId);
}

/** Normaliza el código que escribe el cliente (mayúsculas, alfanumérico y guiones). */
function sanitizePromoCode(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Quita el prefijo interno para mostrar el código tal y como lo escribió el cliente. */
function displayPromoCode(salesChannelId: string, code: string): string {
  const prefix = promoCodePrefix(salesChannelId);
  return code.toLowerCase().startsWith(prefix.toLowerCase())
    ? code.slice(prefix.length)
    : code;
}

function normalizeValueType(t: string | null | undefined): TenantPromotionType {
  return t === "fixed" ? "fixed" : "percentage";
}

function toPromotionSummary(
  salesChannelId: string,
  p: AdminPromotion
): TenantPromotionSummary {
  const am = p.application_method;
  return {
    id: p.id,
    code: displayPromoCode(salesChannelId, p.code),
    status: p.status || "draft",
    valueType: normalizeValueType(am?.type),
    value: am?.value ?? 0,
    currencyCode: am?.currency_code ?? null,
    isAutomatic: !!p.is_automatic,
    createdAt: p.created_at ?? null,
  };
}

function toPromotionDetail(
  salesChannelId: string,
  p: AdminPromotion
): TenantPromotionDetail {
  return {
    ...toPromotionSummary(salesChannelId, p),
    targetType: p.application_method?.target_type ?? null,
  };
}

/** Busca (o crea) la campaña del tenant y devuelve su id. */
async function ensureTenantPromoCampaign(
  token: string,
  salesChannelId: string
): Promise<string> {
  const identifier = tenantCampaignIdentifier(salesChannelId);
  const found = await adminFetch<{ campaigns: AdminCampaign[] }>(
    token,
    `/admin/campaigns?campaign_identifier=${encodeURIComponent(identifier)}&limit=1`
  );
  const existing = (found.campaigns || []).find(
    (c) => c.campaign_identifier === identifier
  );
  if (existing) return existing.id;
  const created = await adminFetch<{ campaign: AdminCampaign }>(
    token,
    "/admin/campaigns",
    {
      method: "POST",
      body: {
        name: `Promociones · ${tenantSlug(salesChannelId)}`,
        campaign_identifier: identifier,
      },
    }
  );
  return created.campaign.id;
}

/** Verifica que una promoción pertenece a la campaña del tenant (barrera). */
async function assertPromotionOwned(
  token: string,
  promotionId: string,
  salesChannelId: string
): Promise<AdminPromotion> {
  let promo: AdminPromotion;
  try {
    const data = await adminFetch<{ promotion: AdminPromotion }>(
      token,
      `/admin/promotions/${promotionId}?fields=${PROMOTION_FIELDS}`
    );
    promo = data.promotion;
  } catch (err) {
    if (err instanceof MedusaApiError && err.status === 404) {
      throw new MedusaApiError("Descuento no encontrado", 404);
    }
    throw err;
  }
  const identifier = tenantCampaignIdentifier(salesChannelId);
  // Un id inexistente/malformado puede devolver 200 sin promoción → tratar como 404.
  if (!promo || promo.campaign?.campaign_identifier !== identifier) {
    throw new MedusaApiError("Descuento no encontrado", 404);
  }
  return promo;
}

export interface TenantPromotionsPage {
  promotions: TenantPromotionSummary[];
  count: number;
  offset: number;
  limit: number;
}

/** Lista paginada de descuentos del tenant (solo su campaña). */
export async function listTenantPromotions(
  salesChannelId: string,
  opts: { limit?: number; offset?: number } = {}
): Promise<TenantPromotionsPage> {
  const token = await authenticate();
  const campaignId = await ensureTenantPromoCampaign(token, salesChannelId);
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 100);
  const offset = Math.max(opts.offset ?? 0, 0);
  const data = await adminFetch<{ promotions: AdminPromotion[]; count: number }>(
    token,
    `/admin/promotions?campaign_id[]=${encodeURIComponent(campaignId)}` +
      `&fields=${PROMOTION_FIELDS}&order=-created_at&limit=${limit}&offset=${offset}`
  );
  return {
    promotions: (data.promotions || []).map((p) => toPromotionSummary(salesChannelId, p)),
    count: data.count ?? 0,
    offset,
    limit,
  };
}

/** Detalle de un descuento (verifica propiedad antes). */
export async function getTenantPromotion(
  salesChannelId: string,
  promotionId: string
): Promise<TenantPromotionDetail> {
  const token = await authenticate();
  const promo = await assertPromotionOwned(token, promotionId, salesChannelId);
  return toPromotionDetail(salesChannelId, promo);
}

/** Valida el valor según el tipo (porcentaje 0-100, fijo > 0). */
function validatePromoValue(valueType: TenantPromotionType, value: number): void {
  if (!Number.isFinite(value)) {
    throw new MedusaApiError("El valor del descuento no es válido", 400);
  }
  if (valueType === "percentage" && (value <= 0 || value > 100)) {
    throw new MedusaApiError("El porcentaje debe estar entre 1 y 100", 400);
  }
  if (valueType === "fixed" && value <= 0) {
    throw new MedusaApiError("El importe debe ser mayor que 0", 400);
  }
}

/** Crea un descuento de la tienda (asignado a la campaña del tenant). */
export async function createTenantPromotion(
  salesChannelId: string,
  input: TenantPromotionInput
): Promise<TenantPromotionDetail> {
  const token = await authenticate();
  const display = sanitizePromoCode(input.code);
  if (!display) {
    throw new MedusaApiError("El código del descuento es obligatorio", 400);
  }
  const valueType = normalizeValueType(input.valueType);
  validatePromoValue(valueType, input.value);
  const campaignId = await ensureTenantPromoCampaign(token, salesChannelId);
  const code = promoCodePrefix(salesChannelId) + display;
  let created: AdminPromotion;
  try {
    const data = await adminFetch<{ promotion: AdminPromotion }>(
      token,
      "/admin/promotions",
      {
        method: "POST",
        body: {
          code,
          type: "standard",
          status: input.status ?? "active",
          is_automatic: false,
          campaign_id: campaignId,
          application_method: {
            type: valueType,
            target_type: "order",
            value: input.value,
            currency_code: "eur",
          },
          // Defensa en profundidad: la promo SOLO aplica a carritos del Sales Channel
          // del tenant. Aunque el código (prefijado) se filtrara, no podría usarse en
          // la tienda de otro tenant.
          rules: [
            {
              attribute: "sales_channel_id",
              operator: "in",
              values: [salesChannelId],
            },
          ],
        },
      }
    );
    created = data.promotion;
  } catch (err) {
    // Código duplicado en la tienda compartida → mensaje claro al cliente.
    if (err instanceof MedusaApiError && (err.status === 400 || err.status === 422)) {
      throw new MedusaApiError("Ya existe un descuento con ese código", 400);
    }
    throw err;
  }
  return toPromotionDetail(salesChannelId, created);
}

/** Actualiza un descuento (código, valor y/o estado). */
export async function updateTenantPromotion(
  salesChannelId: string,
  promotionId: string,
  patch: TenantPromotionPatch
): Promise<TenantPromotionDetail> {
  const token = await authenticate();
  const current = await assertPromotionOwned(token, promotionId, salesChannelId);
  const body: Record<string, unknown> = {};
  if (patch.code !== undefined) {
    const display = sanitizePromoCode(patch.code);
    if (!display) {
      throw new MedusaApiError("El código del descuento es obligatorio", 400);
    }
    body.code = promoCodePrefix(salesChannelId) + display;
  }
  if (patch.status !== undefined) {
    body.status = patch.status;
  }
  if (patch.value !== undefined) {
    const valueType = normalizeValueType(current.application_method?.type);
    validatePromoValue(valueType, patch.value);
    body.application_method = { value: patch.value };
  }
  if (Object.keys(body).length === 0) {
    return toPromotionDetail(salesChannelId, current);
  }
  let updated: AdminPromotion;
  try {
    const data = await adminFetch<{ promotion: AdminPromotion }>(
      token,
      `/admin/promotions/${promotionId}`,
      { method: "POST", body }
    );
    updated = data.promotion;
  } catch (err) {
    if (err instanceof MedusaApiError && (err.status === 400 || err.status === 422)) {
      throw new MedusaApiError("Ya existe un descuento con ese código", 400);
    }
    throw err;
  }
  // El update parcial puede no devolver application_method completo; recargamos.
  return getTenantPromotion(salesChannelId, updated.id);
}

/** Elimina un descuento del tenant (verifica propiedad antes). */
export async function deleteTenantPromotion(
  salesChannelId: string,
  promotionId: string
): Promise<void> {
  const token = await authenticate();
  await assertPromotionOwned(token, promotionId, salesChannelId);
  await adminFetch(token, `/admin/promotions/${promotionId}`, { method: "DELETE" });
}

// ============================================================================
// AJUSTES DE LA TIENDA — clon de Settings de Medusa Admin, acotado a lo que un
// tenant puede cambiar de forma SEGURA en el Medusa COMPARTIDO. El `name` del
// Sales Channel es un identificador interno de aprovisionamiento (lo usa
// `findSalesChannel`) → NO se expone. Los datos de cara al cliente (nombre
// visible de la tienda, descripción, contacto) se guardan en la `metadata` del
// Sales Channel (que SÍ admite metadata, a diferencia de las promociones). La
// moneda es global de la tienda Medusa → solo lectura. El aislamiento lo da el
// token del tenant: estas funciones SOLO tocan su propio Sales Channel.
// ============================================================================

interface AdminSalesChannelFull {
  id: string;
  name?: string | null;
  description?: string | null;
  is_disabled?: boolean;
  metadata?: Record<string, unknown> | null;
}
interface AdminStoreCurrency {
  currency_code?: string | null;
  is_default?: boolean;
}
interface AdminStore {
  id: string;
  supported_currencies?: AdminStoreCurrency[];
}

export interface TenantStoreSettings {
  storeName: string;
  storeDescription: string;
  contactEmail: string;
  contactPhone: string;
  currencyCode: string; // solo lectura (global de la tienda Medusa)
  channelId: string;
  channelEnabled: boolean;
  // Pagos: true cuando la tienda tiene una cuenta Stripe Connect activa (puede cobrar).
  // Se deriva de la metadata del Sales Channel (la sincroniza el flujo de Connect).
  paymentsEnabled: boolean;
  // Cuenta conectada del tenant (acct_...) a la que enrutar los cobros. No es secreta.
  stripeAccountId: string;
  // Pasarela activa: "none" | "stripe" | "redsys". La storefront ramifica el checkout por esto.
  paymentProvider: string;
}

export interface TenantStoreSettingsInput {
  storeName?: string;
  storeDescription?: string;
  contactEmail?: string;
  contactPhone?: string;
}

// Claves de metadata propias de Avialo en el Sales Channel.
const SC_META = {
  storeName: "avialo_store_name",
  storeDescription: "avialo_store_description",
  contactEmail: "avialo_contact_email",
  contactPhone: "avialo_contact_phone",
  // Stripe Connect: cuenta conectada del tenant + si puede cobrar (charges_enabled).
  // Aquí (en Medusa) es donde el provider de cobros lo lee para enrutar los pagos.
  stripeAccount: "avialo_stripe_account",
  paymentsEnabled: "avialo_payments_enabled",
  // Pasarela activa de la tienda: "none" | "stripe" | "redsys" (la storefront ramifica por esto).
  paymentProvider: "avialo_payment_provider",
} as const;

function metaString(meta: Record<string, unknown> | null | undefined, key: string): string {
  const v = meta?.[key];
  return typeof v === "string" ? v : "";
}

function metaBool(meta: Record<string, unknown> | null | undefined, key: string): boolean {
  const v = meta?.[key];
  return v === true || v === "true";
}

/** Moneda por defecto de la tienda Medusa (global; solo lectura para el tenant). */
async function fetchDefaultCurrency(token: string): Promise<string> {
  try {
    const data = await adminFetch<{ stores: AdminStore[] }>(
      token,
      "/admin/stores?fields=id,*supported_currencies"
    );
    const store = (data.stores || [])[0];
    const currencies = store?.supported_currencies || [];
    const def = currencies.find((c) => c.is_default) || currencies[0];
    return (def?.currency_code || "eur").toLowerCase();
  } catch {
    return "eur";
  }
}

function toStoreSettings(sc: AdminSalesChannelFull, currencyCode: string): TenantStoreSettings {
  const meta = sc.metadata || null;
  return {
    // Si aún no se ha personalizado, caemos a la descripción del canal como pista.
    storeName: metaString(meta, SC_META.storeName),
    storeDescription:
      metaString(meta, SC_META.storeDescription) || (sc.description ?? ""),
    contactEmail: metaString(meta, SC_META.contactEmail),
    contactPhone: metaString(meta, SC_META.contactPhone),
    currencyCode,
    channelId: sc.id,
    channelEnabled: !sc.is_disabled,
    paymentsEnabled: metaBool(meta, SC_META.paymentsEnabled),
    stripeAccountId: metaString(meta, SC_META.stripeAccount),
    paymentProvider: metaString(meta, SC_META.paymentProvider) || "none",
  };
}

/** Fija la pasarela activa de la tienda en la metadata del Sales Channel (la lee la storefront). */
export async function syncTenantSalesChannelProvider(
  salesChannelId: string,
  provider: string
): Promise<void> {
  const token = await authenticate();
  const current = await adminFetch<{ sales_channel: AdminSalesChannelFull }>(
    token,
    `/admin/sales-channels/${salesChannelId}`
  );
  const meta: Record<string, unknown> = { ...(current.sales_channel.metadata || {}) };
  meta[SC_META.paymentProvider] = provider;
  await adminFetch(token, `/admin/sales-channels/${salesChannelId}`, {
    method: "POST",
    body: { metadata: meta },
  });
}

/**
 * Sincroniza el estado de Stripe Connect del tenant en la metadata de su Sales Channel.
 * Es el PUENTE con el cobro: aquí (en Medusa) el provider de pagos lee la cuenta conectada
 * a la que enrutar los cobros (destination charges) y si la tienda puede cobrar.
 */
export async function syncTenantSalesChannelPayment(
  salesChannelId: string,
  input: { stripeAccountId: string | null; chargesEnabled: boolean }
): Promise<void> {
  const token = await authenticate();
  const current = await adminFetch<{ sales_channel: AdminSalesChannelFull }>(
    token,
    `/admin/sales-channels/${salesChannelId}`
  );
  const meta: Record<string, unknown> = { ...(current.sales_channel.metadata || {}) };
  meta[SC_META.stripeAccount] = input.stripeAccountId ?? "";
  meta[SC_META.paymentsEnabled] = input.chargesEnabled;
  await adminFetch(token, `/admin/sales-channels/${salesChannelId}`, {
    method: "POST",
    body: { metadata: meta },
  });
}

/** Lee los ajustes de la tienda del tenant (de la metadata de su Sales Channel). */
export async function getTenantStoreSettings(
  salesChannelId: string
): Promise<TenantStoreSettings> {
  const token = await authenticate();
  const data = await adminFetch<{ sales_channel: AdminSalesChannelFull }>(
    token,
    `/admin/sales-channels/${salesChannelId}`
  );
  const currencyCode = await fetchDefaultCurrency(token);
  return toStoreSettings(data.sales_channel, currencyCode);
}

/** Actualiza los ajustes de la tienda (fusiona en la metadata del Sales Channel). */
export async function updateTenantStoreSettings(
  salesChannelId: string,
  input: TenantStoreSettingsInput
): Promise<TenantStoreSettings> {
  const token = await authenticate();
  const current = await adminFetch<{ sales_channel: AdminSalesChannelFull }>(
    token,
    `/admin/sales-channels/${salesChannelId}`
  );
  const meta: Record<string, unknown> = { ...(current.sales_channel.metadata || {}) };
  if (input.storeName !== undefined) meta[SC_META.storeName] = input.storeName.trim();
  if (input.storeDescription !== undefined)
    meta[SC_META.storeDescription] = input.storeDescription.trim();
  if (input.contactEmail !== undefined) meta[SC_META.contactEmail] = input.contactEmail.trim();
  if (input.contactPhone !== undefined) meta[SC_META.contactPhone] = input.contactPhone.trim();
  const data = await adminFetch<{ sales_channel: AdminSalesChannelFull }>(
    token,
    `/admin/sales-channels/${salesChannelId}`,
    { method: "POST", body: { metadata: meta } }
  );
  const currencyCode = await fetchDefaultCurrency(token);
  return toStoreSettings(data.sales_channel, currencyCode);
}

// ============================================================================
// SUBIDA DE ARCHIVOS — sube imágenes al almacenamiento de Medusa (`/admin/uploads`)
// y devuelve sus URLs públicas. Los archivos son globales (no van ligados a un
// Sales Channel); el aislamiento real está en que solo el producto del tenant
// (entidad aislada) referencia la URL. El cliente del panel manda los bytes en
// base64 (JSON) y aquí reconstruimos el multipart hacia Medusa con FormData/Blob
// nativos de Node (sin dependencias extra). La URL devuelta por Medusa apunta a
// su host interno; la normalizamos al `backendUrl` configurado (accesible).
// ============================================================================

interface AdminUploadFile {
  id: string;
  url: string;
}

export interface TenantUploadInput {
  filename: string;
  mimeType: string;
  dataBase64: string;
}

export interface TenantUploadedFile {
  id: string;
  url: string;
}

// Tipos de imagen permitidos y tamaño máximo por archivo (5 MB ya decodificado).
// NO se admite SVG: puede contener <script> y, servido inline desde el host de
// Medusa, sería un vector de XSS almacenado. Solo formatos ráster seguros.
const ALLOWED_IMAGE_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/**
 * Normaliza la URL devuelta por Medusa. El file provider LOCAL devuelve una URL
 * a su host interno (p. ej. `http://localhost:9000/static/...`) que el navegador
 * no alcanza → la reescribimos al `backendUrl` configurado conservando la ruta.
 * Un provider EXTERNO (S3/MinIO/CDN) devuelve una URL absoluta ya pública: en ese
 * caso la dejamos intacta (solo reescribimos cuando la ruta es `/static/...`).
 */
function normalizeStaticUrl(raw: string): string {
  if (raw.startsWith("/")) {
    // URL relativa → la prefijamos con el backendUrl.
    return `${BASE}${raw}`;
  }
  try {
    const u = new URL(raw);
    if (u.pathname.startsWith("/static/")) {
      return `${BASE}${u.pathname}${u.search}`;
    }
    // URL pública de un provider externo → no tocar.
    return raw;
  } catch {
    return raw;
  }
}

/** Sube una o varias imágenes a Medusa y devuelve sus URLs públicas. */
export async function uploadTenantFiles(
  files: TenantUploadInput[]
): Promise<TenantUploadedFile[]> {
  if (!files.length) {
    throw new MedusaApiError("No se ha recibido ningún archivo", 400);
  }
  const token = await authenticate();
  const fd = new FormData();
  for (const f of files) {
    const mime = (f.mimeType || "").toLowerCase();
    if (!ALLOWED_IMAGE_MIME.has(mime)) {
      throw new MedusaApiError("Formato no permitido (usa JPG, PNG, WEBP, GIF o AVIF)", 400);
    }
    const buf = Buffer.from(f.dataBase64, "base64");
    if (buf.length === 0) {
      throw new MedusaApiError("El archivo está vacío o corrupto", 400);
    }
    if (buf.length > MAX_UPLOAD_BYTES) {
      throw new MedusaApiError("Cada imagen no puede superar los 5 MB", 400);
    }
    const safeName = (f.filename || "imagen").replace(/[^\w.\-]+/g, "_").slice(0, 120);
    fd.append("files", new Blob([buf], { type: mime }), safeName);
  }
  const res = await fetch(`${BASE}/admin/uploads`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  if (!res.ok) {
    if (res.status === 401) invalidateAdminToken();
    const text = await res.text().catch(() => "");
    throw new MedusaApiError(`Admin API POST /admin/uploads → ${res.status}`, res.status, text);
  }
  const data = (await res.json()) as { files?: AdminUploadFile[] };
  return (data.files || []).map((f) => ({ id: f.id, url: normalizeStaticUrl(f.url) }));
}
