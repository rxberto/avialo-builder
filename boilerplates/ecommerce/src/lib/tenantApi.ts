import "server-only";

// Cliente SERVER-ONLY hacia el orquestador (el "portero"). Usa el token máquina de la tienda,
// que NUNCA llega al navegador (no es NEXT_PUBLIC). El orquestador acota todo al Sales Channel.
const ORCHESTRATOR_URL = (process.env.ORCHESTRATOR_URL || "http://localhost:3001").replace(
  /\/$/,
  ""
);
const STORE_MGMT_TOKEN = process.env.STORE_MGMT_TOKEN || "";

// ── Resumen (para la lista de productos) ──
export interface AdminProduct {
  id: string;
  title: string;
  status: string;
  handle: string;
  thumbnail: string | null;
  description: string | null;
  price: number | null;
  variantId: string | null;
  currencyCode: string;
}

// ── Detalle completo (para el editor estilo Medusa) ──
export type ProductStatus = "published" | "draft" | "proposed" | "rejected";

export interface ProductOption {
  title: string;
  values: string[];
}

export interface ProductVariant {
  id?: string;
  title: string;
  sku: string | null;
  barcode: string | null;
  ean: string | null;
  manageInventory: boolean;
  allowBackorder: boolean;
  inventoryQuantity: number | null;
  weight: number | null;
  price: number | null;
  options: Record<string, string>;
}

export interface ProductRef {
  id: string;
  label: string;
}

export interface ProductDetail {
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
  collectionId: string | null;
  collectionTitle: string | null;
  categories: ProductRef[];
  tagList: ProductRef[];
  weight: number | null;
  length: number | null;
  height: number | null;
  width: number | null;
  seoTitle: string | null;
  seoDescription: string | null;
  options: ProductOption[];
  variants: ProductVariant[];
}

export interface VariantInput {
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

export interface ProductRichInput {
  title: string;
  subtitle?: string | null;
  handle?: string | null;
  description?: string | null;
  status?: ProductStatus;
  discountable?: boolean;
  thumbnail?: string | null;
  images?: string[];
  weight?: number | null;
  length?: number | null;
  height?: number | null;
  width?: number | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  options?: ProductOption[];
  variants?: VariantInput[];
  collectionId?: string | null;
  categoryIds?: string[];
  tagIds?: string[];
}

export type ProductRichPatch = Partial<ProductRichInput>;

export function storeConfigured(): boolean {
  return !!STORE_MGMT_TOKEN;
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!STORE_MGMT_TOKEN) {
    throw new Error("La gestión de la tienda no está configurada (falta el token).");
  }
  const res = await fetch(`${ORCHESTRATOR_URL}/api/tenant-store${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${STORE_MGMT_TOKEN}`,
      ...(init.headers || {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    let message = `Error ${res.status}`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) message = body.error;
    } catch {
      /* respuesta sin JSON */
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}

export async function listProducts(): Promise<AdminProduct[]> {
  const data = await call<{ products: AdminProduct[] }>("/products", { method: "GET" });
  return data.products;
}

export async function getProduct(id: string): Promise<ProductDetail> {
  const data = await call<{ product: ProductDetail }>(`/products/${id}`, { method: "GET" });
  return data.product;
}

export async function createProduct(input: ProductRichInput): Promise<ProductDetail> {
  const data = await call<{ product: ProductDetail }>("/products", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data.product;
}

export async function updateProduct(id: string, patch: ProductRichPatch): Promise<ProductDetail> {
  const data = await call<{ product: ProductDetail }>(`/products/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  return data.product;
}

export async function deleteProduct(id: string): Promise<void> {
  await call<{ ok: boolean }>(`/products/${id}`, { method: "DELETE" });
}

// ── Pedidos ──
export interface OrderSummary {
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

export interface OrderItem {
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

export interface OrderAddress {
  name: string | null;
  line1: string | null;
  line2: string | null;
  city: string | null;
  postalCode: string | null;
  province: string | null;
  countryCode: string | null;
  phone: string | null;
}

export interface OrderPayment {
  id: string;
  amount: number;
  capturedAt: string | null;
  canceledAt: string | null;
}

export interface OrderFulfillment {
  id: string;
  packedAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  canceledAt: string | null;
  itemCount: number;
}

export interface OrderDetail extends OrderSummary {
  subtotal: number;
  shippingTotal: number;
  taxTotal: number;
  discountTotal: number;
  canceledAt: string | null;
  items: OrderItem[];
  shippingAddress: OrderAddress | null;
  payments: OrderPayment[];
  fulfillments: OrderFulfillment[];
  capturable: boolean;
  fulfillable: boolean;
}

export interface OrdersPage {
  orders: OrderSummary[];
  count: number;
  offset: number;
  limit: number;
}

export async function listOrders(opts: { limit?: number; offset?: number } = {}): Promise<OrdersPage> {
  const params = new URLSearchParams();
  if (opts.limit != null) params.set("limit", String(opts.limit));
  if (opts.offset != null) params.set("offset", String(opts.offset));
  const qs = params.toString();
  return call<OrdersPage>(`/orders${qs ? `?${qs}` : ""}`, { method: "GET" });
}

export async function getOrder(id: string): Promise<OrderDetail> {
  const data = await call<{ order: OrderDetail }>(`/orders/${id}`, { method: "GET" });
  return data.order;
}

// Acciones del pedido (flujo Medusa). Todas devuelven el detalle actualizado.
export async function captureOrderPayment(id: string): Promise<OrderDetail> {
  const data = await call<{ order: OrderDetail }>(`/orders/${id}/capture`, { method: "POST" });
  return data.order;
}

export async function fulfillOrder(id: string): Promise<OrderDetail> {
  const data = await call<{ order: OrderDetail }>(`/orders/${id}/fulfill`, { method: "POST" });
  return data.order;
}

export async function shipFulfillment(id: string, fulfillmentId: string): Promise<OrderDetail> {
  const data = await call<{ order: OrderDetail }>(
    `/orders/${id}/fulfillments/${fulfillmentId}/ship`,
    { method: "POST" }
  );
  return data.order;
}

export async function cancelOrder(id: string): Promise<OrderDetail> {
  const data = await call<{ order: OrderDetail }>(`/orders/${id}/cancel`, { method: "POST" });
  return data.order;
}

// ── Clientes (derivados de los pedidos del canal) ──
export interface CustomerSummary {
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

export interface CustomerDetail extends CustomerSummary {
  phone: string | null;
  defaultAddress: OrderAddress | null;
  orders: OrderSummary[];
}

export interface CustomersPage {
  customers: CustomerSummary[];
  count: number;
  offset: number;
  limit: number;
}

export async function listCustomers(opts: { limit?: number; offset?: number } = {}): Promise<CustomersPage> {
  const params = new URLSearchParams();
  if (opts.limit != null) params.set("limit", String(opts.limit));
  if (opts.offset != null) params.set("offset", String(opts.offset));
  const qs = params.toString();
  return call<CustomersPage>(`/customers${qs ? `?${qs}` : ""}`, { method: "GET" });
}

export async function getCustomer(id: string): Promise<CustomerDetail> {
  const data = await call<{ customer: CustomerDetail }>(
    `/customers/${encodeURIComponent(id)}`,
    { method: "GET" }
  );
  return data.customer;
}

// ── Colecciones (aisladas por tenant vía metadata.avialo_owner) ──
export interface CollectionSummary {
  id: string;
  title: string;
  handle: string | null;
  productCount: number;
  createdAt: string | null;
}

export interface CollectionProduct {
  id: string;
  title: string;
  status: string;
  thumbnail: string | null;
  handle: string | null;
}

export interface CollectionDetail extends CollectionSummary {
  products: CollectionProduct[];
}

export interface CollectionsPage {
  collections: CollectionSummary[];
  count: number;
  offset: number;
  limit: number;
}

export async function listCollections(opts: { limit?: number; offset?: number } = {}): Promise<CollectionsPage> {
  const params = new URLSearchParams();
  if (opts.limit != null) params.set("limit", String(opts.limit));
  if (opts.offset != null) params.set("offset", String(opts.offset));
  const qs = params.toString();
  return call<CollectionsPage>(`/collections${qs ? `?${qs}` : ""}`, { method: "GET" });
}

export async function getCollection(id: string): Promise<CollectionDetail> {
  const data = await call<{ collection: CollectionDetail }>(
    `/collections/${encodeURIComponent(id)}`,
    { method: "GET" }
  );
  return data.collection;
}

export async function createCollection(input: { title: string; handle?: string }): Promise<CollectionSummary> {
  const data = await call<{ collection: CollectionSummary }>(`/collections`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data.collection;
}

export async function updateCollection(
  id: string,
  patch: { title?: string; handle?: string }
): Promise<CollectionSummary> {
  const data = await call<{ collection: CollectionSummary }>(
    `/collections/${encodeURIComponent(id)}`,
    { method: "PATCH", body: JSON.stringify(patch) }
  );
  return data.collection;
}

export async function deleteCollection(id: string): Promise<void> {
  await call<{ ok: boolean }>(`/collections/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function updateCollectionProducts(
  id: string,
  changes: { add?: string[]; remove?: string[] }
): Promise<CollectionDetail> {
  const data = await call<{ collection: CollectionDetail }>(
    `/collections/${encodeURIComponent(id)}/products`,
    { method: "POST", body: JSON.stringify(changes) }
  );
  return data.collection;
}

// ── Categorías (jerárquicas, aisladas por tenant vía metadata.avialo_owner) ──
export interface CategorySummary {
  id: string;
  name: string;
  handle: string | null;
  isActive: boolean;
  parentId: string | null;
  productCount: number;
  createdAt: string | null;
}

export interface CategoryChild {
  id: string;
  name: string;
}

export interface CategoryDetail extends CategorySummary {
  description: string | null;
  parentName: string | null;
  children: CategoryChild[];
  products: CollectionProduct[];
}

export interface CategoriesPage {
  categories: CategorySummary[];
  count: number;
  offset: number;
  limit: number;
}

export async function listCategories(opts: { limit?: number; offset?: number } = {}): Promise<CategoriesPage> {
  const params = new URLSearchParams();
  if (opts.limit != null) params.set("limit", String(opts.limit));
  if (opts.offset != null) params.set("offset", String(opts.offset));
  const qs = params.toString();
  return call<CategoriesPage>(`/categories${qs ? `?${qs}` : ""}`, { method: "GET" });
}

export async function getCategory(id: string): Promise<CategoryDetail> {
  const data = await call<{ category: CategoryDetail }>(
    `/categories/${encodeURIComponent(id)}`,
    { method: "GET" }
  );
  return data.category;
}

export async function createCategory(input: {
  name: string;
  handle?: string;
  description?: string;
  parentId?: string | null;
}): Promise<CategorySummary> {
  const data = await call<{ category: CategorySummary }>(`/categories`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data.category;
}

export async function updateCategory(
  id: string,
  patch: {
    name?: string;
    handle?: string;
    description?: string | null;
    isActive?: boolean;
    parentId?: string | null;
  }
): Promise<CategorySummary> {
  const data = await call<{ category: CategorySummary }>(
    `/categories/${encodeURIComponent(id)}`,
    { method: "PATCH", body: JSON.stringify(patch) }
  );
  return data.category;
}

export async function deleteCategory(id: string): Promise<void> {
  await call<{ ok: boolean }>(`/categories/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function updateCategoryProducts(
  id: string,
  changes: { add?: string[]; remove?: string[] }
): Promise<CategoryDetail> {
  const data = await call<{ category: CategoryDetail }>(
    `/categories/${encodeURIComponent(id)}/products`,
    { method: "POST", body: JSON.stringify(changes) }
  );
  return data.category;
}

// ── Etiquetas (globales, aisladas por metadata.avialo_owner; label visible en metadata) ──
export interface TagSummary {
  id: string;
  label: string;
  value: string;
  productCount: number;
  createdAt: string | null;
}

export interface TagDetail extends TagSummary {
  products: CollectionProduct[];
}

export interface TagsPage {
  tags: TagSummary[];
  count: number;
  offset: number;
  limit: number;
}

export async function listTags(opts: { limit?: number; offset?: number } = {}): Promise<TagsPage> {
  const params = new URLSearchParams();
  if (opts.limit != null) params.set("limit", String(opts.limit));
  if (opts.offset != null) params.set("offset", String(opts.offset));
  const qs = params.toString();
  return call<TagsPage>(`/tags${qs ? `?${qs}` : ""}`, { method: "GET" });
}

export async function getTag(id: string): Promise<TagDetail> {
  const data = await call<{ tag: TagDetail }>(`/tags/${encodeURIComponent(id)}`, { method: "GET" });
  return data.tag;
}

export async function createTag(input: { label: string }): Promise<TagSummary> {
  const data = await call<{ tag: TagSummary }>(`/tags`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data.tag;
}

export async function updateTag(id: string, patch: { label: string }): Promise<TagSummary> {
  const data = await call<{ tag: TagSummary }>(`/tags/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  return data.tag;
}

export async function deleteTag(id: string): Promise<void> {
  await call<{ ok: boolean }>(`/tags/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function updateTagProducts(
  id: string,
  changes: { add?: string[]; remove?: string[] }
): Promise<TagDetail> {
  const data = await call<{ tag: TagDetail }>(
    `/tags/${encodeURIComponent(id)}/products`,
    { method: "POST", body: JSON.stringify(changes) }
  );
  return data.tag;
}

// ── Descuentos / Promociones ────────────────────────────────────────────────

export type PromotionType = "percentage" | "fixed";
export type PromotionStatus = "active" | "draft" | "inactive";

export interface PromotionSummary {
  id: string;
  code: string;
  status: string;
  valueType: PromotionType;
  value: number;
  currencyCode: string | null;
  isAutomatic: boolean;
  createdAt: string | null;
}

export interface PromotionDetail extends PromotionSummary {
  targetType: string | null;
}

export interface PromotionsPage {
  promotions: PromotionSummary[];
  count: number;
  offset: number;
  limit: number;
}

export async function listPromotions(
  opts: { limit?: number; offset?: number } = {}
): Promise<PromotionsPage> {
  const params = new URLSearchParams();
  if (opts.limit != null) params.set("limit", String(opts.limit));
  if (opts.offset != null) params.set("offset", String(opts.offset));
  const qs = params.toString();
  return call<PromotionsPage>(`/promotions${qs ? `?${qs}` : ""}`, { method: "GET" });
}

export async function getPromotion(id: string): Promise<PromotionDetail> {
  const data = await call<{ promotion: PromotionDetail }>(
    `/promotions/${encodeURIComponent(id)}`,
    { method: "GET" }
  );
  return data.promotion;
}

export async function createPromotion(input: {
  code: string;
  valueType: PromotionType;
  value: number;
  status?: PromotionStatus;
}): Promise<PromotionSummary> {
  const data = await call<{ promotion: PromotionSummary }>(`/promotions`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data.promotion;
}

export async function updatePromotion(
  id: string,
  patch: { code?: string; value?: number; status?: PromotionStatus }
): Promise<PromotionSummary> {
  const data = await call<{ promotion: PromotionSummary }>(
    `/promotions/${encodeURIComponent(id)}`,
    { method: "PATCH", body: JSON.stringify(patch) }
  );
  return data.promotion;
}

export async function deletePromotion(id: string): Promise<void> {
  await call<{ ok: boolean }>(`/promotions/${encodeURIComponent(id)}`, { method: "DELETE" });
}

// ── Ajustes de la tienda ─────────────────────────────────────────────────────

export interface StoreSettings {
  storeName: string;
  storeDescription: string;
  contactEmail: string;
  contactPhone: string;
  currencyCode: string;
  channelId: string;
  channelEnabled: boolean;
  paymentsEnabled: boolean;
  stripeAccountId: string;
  paymentProvider: string;
}

export interface StoreSettingsInput {
  storeName?: string;
  storeDescription?: string;
  contactEmail?: string;
  contactPhone?: string;
}

export async function getStoreSettings(): Promise<StoreSettings> {
  const data = await call<{ settings: StoreSettings }>(`/settings`, { method: "GET" });
  return data.settings;
}

export async function updateStoreSettings(input: StoreSettingsInput): Promise<StoreSettings> {
  const data = await call<{ settings: StoreSettings }>(`/settings`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return data.settings;
}

// ── Pagos (Stripe Connect): la tienda cobra a SU propia cuenta Stripe ──

export interface PaymentStatus {
  connected: boolean;
  accountId: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  needsOnboarding: boolean;
  dashboardAvailable: boolean;
}

export async function getPaymentStatus(): Promise<PaymentStatus> {
  const data = await call<{ status: PaymentStatus }>(`/payments/status`, { method: "GET" });
  return data.status;
}

/** Inicia/reanuda el onboarding de Stripe Connect. Devuelve la URL del onboarding hospedado. */
export async function startPaymentOnboarding(
  returnUrl: string,
  refreshUrl: string
): Promise<{ url: string; accountId: string }> {
  return call<{ url: string; accountId: string }>(`/payments/connect`, {
    method: "POST",
    body: JSON.stringify({ returnUrl, refreshUrl }),
  });
}

/** Enlace de un solo uso al dashboard Express del tenant (sus cobros/liquidaciones). */
export async function getPaymentDashboardLink(): Promise<{ url: string }> {
  return call<{ url: string }>(`/payments/dashboard`, { method: "POST" });
}

// ── Multi-pasarela: proveedor activo + Stripe Connect + Redsys (+ extensible) ──

export type PaymentProvider = "none" | "stripe" | "redsys";

export interface RedsysConfigStatus {
  configured: boolean;
  merchantCode: string;
  terminal: string;
  environment: "test" | "live";
}

export interface PaymentSettings {
  activeProvider: PaymentProvider;
  stripe: PaymentStatus;
  redsys: RedsysConfigStatus;
}

export interface RedsysConfigInput {
  merchantCode: string;
  terminal: string;
  environment: "test" | "live";
  secretKey: string;
}

export async function getPaymentSettings(): Promise<PaymentSettings> {
  const data = await call<{ settings: PaymentSettings }>(`/payments/settings`, { method: "GET" });
  return data.settings;
}

export async function setActiveProvider(provider: PaymentProvider): Promise<PaymentSettings> {
  const data = await call<{ settings: PaymentSettings }>(`/payments/provider`, {
    method: "POST",
    body: JSON.stringify({ provider }),
  });
  return data.settings;
}

export async function saveRedsysConfig(input: RedsysConfigInput): Promise<PaymentSettings> {
  const data = await call<{ settings: PaymentSettings }>(`/payments/redsys`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data.settings;
}

// ── Subida de imágenes ───────────────────────────────────────────────────────

export interface UploadInput {
  filename: string;
  mimeType: string;
  dataBase64: string;
}

export interface UploadedFile {
  id: string;
  url: string;
}

export async function uploadImages(files: UploadInput[]): Promise<UploadedFile[]> {
  const data = await call<{ files: UploadedFile[] }>(`/uploads`, {
    method: "POST",
    body: JSON.stringify({ files }),
  });
  return data.files;
}
