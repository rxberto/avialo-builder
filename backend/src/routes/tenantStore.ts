import { Router, Request, Response } from "express";
import { prisma } from "../database/client.js";
import {
  listTenantProducts,
  getTenantProduct,
  createTenantProductRich,
  updateTenantProductRich,
  deleteTenantProduct,
  listTenantOrders,
  getTenantOrder,
  captureTenantOrderPayment,
  fulfillTenantOrder,
  shipTenantFulfillment,
  cancelTenantOrder,
  listTenantCustomers,
  getTenantCustomer,
  listTenantCollections,
  getTenantCollection,
  createTenantCollection,
  updateTenantCollection,
  deleteTenantCollection,
  addProductsToTenantCollection,
  removeProductsFromTenantCollection,
  listTenantCategories,
  getTenantCategory,
  createTenantCategory,
  updateTenantCategory,
  deleteTenantCategory,
  addProductsToTenantCategory,
  removeProductsFromTenantCategory,
  listTenantTags,
  getTenantTag,
  createTenantTag,
  updateTenantTag,
  deleteTenantTag,
  addProductsToTenantTag,
  removeProductsFromTenantTag,
  listTenantPromotions,
  getTenantPromotion,
  createTenantPromotion,
  updateTenantPromotion,
  deleteTenantPromotion,
  getTenantStoreSettings,
  updateTenantStoreSettings,
  uploadTenantFiles,
  TenantUploadInput,
  TenantPromotionType,
  TenantPromotionStatus,
  MedusaApiError,
  TenantProductRichInput,
  TenantProductRichPatch,
  TenantProductStatus,
  TenantOption,
  TenantVariantInput,
} from "../services/medusa.js";
import {
  PaymentsError,
  getConnectStatus,
  startConnectOnboarding,
  createConnectDashboardLink,
  getPaymentSettings,
  setActiveProvider,
  setRedsysConfig,
  type PaymentProvider,
} from "../services/payments.js";

/**
 * API de gestión de la tienda POR TENANT (el "portero").
 *
 * El panel de cada cliente (en su propia web, server-side) llama aquí con su token máquina
 * (`storeMgmtToken`). El orquestador valida el token → resuelve el Sales Channel del tenant →
 * ejecuta las operaciones de Medusa SIEMPRE acotadas a ese canal. El cliente nunca toca Medusa
 * ni ve productos de otras tiendas.
 */
export const tenantStoreRouter = Router();

interface TenantRequest extends Request {
  tenant?: { userId: number; clientId: string; salesChannelId: string };
}

// Middleware: valida el Bearer storeMgmtToken y carga el contexto del tenant.
async function authenticateTenant(
  req: TenantRequest,
  res: Response,
  next: () => void
): Promise<Response | void> {
  const header = req.header("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) {
    return res.status(401).json({ error: "Falta el token de la tienda." });
  }
  try {
    const user = await prisma.user.findUnique({ where: { storeMgmtToken: token } });
    if (!user || !user.medusaSalesChannelId) {
      return res.status(401).json({ error: "Token de tienda inválido." });
    }
    req.tenant = {
      userId: user.id,
      // clientId solo para prefijar handles únicos; el id del usuario es estable y único.
      clientId: String(user.id),
      salesChannelId: user.medusaSalesChannelId,
    };
    next();
  } catch {
    // Un fallo de BD no debe dejar la petición colgada (Express 4 no captura async throws).
    return res.status(500).json({ error: "No se pudo validar la tienda." });
  }
}

// Traduce errores del Admin API de Medusa a respuestas HTTP limpias para el panel.
function sendError(res: Response, err: unknown): Response {
  if (err instanceof PaymentsError) {
    return res.status(err.status).json({ error: err.message });
  }
  if (err instanceof MedusaApiError) {
    const status = err.status && err.status >= 400 && err.status < 600 ? err.status : 502;
    return res.status(status).json({ error: err.message });
  }
  const message = err instanceof Error ? err.message : "Error inesperado.";
  return res.status(500).json({ error: message });
}

// ── Parsers seguros del payload rico (TS estricto, sin confiar en el cuerpo) ──

const STATUSES: TenantProductStatus[] = ["published", "draft", "proposed", "rejected"];

function asString(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}
function asNumberOrNull(v: unknown): number | null | undefined {
  if (v === null) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : undefined;
  }
  if (v === "" || v === undefined) return undefined;
  return undefined;
}
function asBool(v: unknown): boolean | undefined {
  return typeof v === "boolean" ? v : undefined;
}
function asStringArray(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  return v.filter((x): x is string => typeof x === "string");
}
function asStatus(v: unknown): TenantProductStatus | undefined {
  return STATUSES.includes(v as TenantProductStatus) ? (v as TenantProductStatus) : undefined;
}

const PROMO_TYPES: TenantPromotionType[] = ["percentage", "fixed"];
const PROMO_STATUSES: TenantPromotionStatus[] = ["active", "draft", "inactive"];
function asPromoType(v: unknown): TenantPromotionType | undefined {
  return PROMO_TYPES.includes(v as TenantPromotionType) ? (v as TenantPromotionType) : undefined;
}
function asPromoStatus(v: unknown): TenantPromotionStatus | undefined {
  return PROMO_STATUSES.includes(v as TenantPromotionStatus)
    ? (v as TenantPromotionStatus)
    : undefined;
}

function parseOptions(v: unknown): TenantOption[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out: TenantOption[] = [];
  for (const o of v) {
    if (!o || typeof o !== "object") continue;
    const rec = o as Record<string, unknown>;
    const title = asString(rec.title);
    const values = asStringArray(rec.values);
    if (title && values) out.push({ title, values });
  }
  return out;
}

function parseVariants(v: unknown): TenantVariantInput[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out: TenantVariantInput[] = [];
  for (const x of v) {
    if (!x || typeof x !== "object") continue;
    const rec = x as Record<string, unknown>;
    const opts: Record<string, string> = {};
    if (rec.options && typeof rec.options === "object" && !Array.isArray(rec.options)) {
      for (const [k, val] of Object.entries(rec.options as Record<string, unknown>)) {
        if (typeof val === "string") opts[k] = val;
      }
    }
    out.push({
      id: asString(rec.id),
      title: asString(rec.title),
      sku: rec.sku === null ? null : asString(rec.sku),
      barcode: rec.barcode === null ? null : asString(rec.barcode),
      ean: rec.ean === null ? null : asString(rec.ean),
      manageInventory: asBool(rec.manageInventory),
      allowBackorder: asBool(rec.allowBackorder),
      inventoryQuantity: asNumberOrNull(rec.inventoryQuantity),
      weight: asNumberOrNull(rec.weight),
      price: asNumberOrNull(rec.price),
      options: opts,
    });
  }
  return out;
}

/** Construye el input rico de creación; lanza si falta el título. */
function parseRichInput(body: Record<string, unknown>): TenantProductRichInput {
  const title = asString(body.title)?.trim();
  if (!title) {
    throw new MedusaApiError("El título es obligatorio.", 400);
  }
  return {
    title,
    subtitle: body.subtitle === null ? null : asString(body.subtitle),
    handle: body.handle === null ? null : asString(body.handle),
    description: body.description === null ? null : asString(body.description),
    status: asStatus(body.status),
    discountable: asBool(body.discountable),
    thumbnail: body.thumbnail === null ? null : asString(body.thumbnail),
    images: asStringArray(body.images),
    weight: asNumberOrNull(body.weight),
    length: asNumberOrNull(body.length),
    height: asNumberOrNull(body.height),
    width: asNumberOrNull(body.width),
    seoTitle: body.seoTitle === null ? null : asString(body.seoTitle),
    seoDescription: body.seoDescription === null ? null : asString(body.seoDescription),
    options: parseOptions(body.options),
    variants: parseVariants(body.variants),
  };
}

/** Construye el patch rico de edición (solo campos presentes). */
function parseRichPatch(body: Record<string, unknown>): TenantProductRichPatch {
  const patch: TenantProductRichPatch = {};
  if ("title" in body) patch.title = asString(body.title);
  if ("subtitle" in body) patch.subtitle = body.subtitle === null ? null : asString(body.subtitle);
  if ("handle" in body) patch.handle = body.handle === null ? null : asString(body.handle);
  if ("description" in body)
    patch.description = body.description === null ? null : asString(body.description);
  if ("status" in body) patch.status = asStatus(body.status);
  if ("discountable" in body) patch.discountable = asBool(body.discountable);
  if ("thumbnail" in body) patch.thumbnail = body.thumbnail === null ? null : asString(body.thumbnail);
  if ("images" in body) patch.images = asStringArray(body.images);
  if ("weight" in body) patch.weight = asNumberOrNull(body.weight);
  if ("length" in body) patch.length = asNumberOrNull(body.length);
  if ("height" in body) patch.height = asNumberOrNull(body.height);
  if ("width" in body) patch.width = asNumberOrNull(body.width);
  if ("seoTitle" in body) patch.seoTitle = body.seoTitle === null ? null : asString(body.seoTitle);
  if ("seoDescription" in body)
    patch.seoDescription = body.seoDescription === null ? null : asString(body.seoDescription);
  if ("options" in body) patch.options = parseOptions(body.options);
  if ("variants" in body) patch.variants = parseVariants(body.variants);
  // Organización: colección (string | null), categorías y etiquetas (arrays de ids).
  if ("collectionId" in body)
    patch.collectionId = body.collectionId === null ? null : asString(body.collectionId);
  if ("categoryIds" in body) patch.categoryIds = asStringArray(body.categoryIds);
  if ("tagIds" in body) patch.tagIds = asStringArray(body.tagIds);
  return patch;
}

tenantStoreRouter.use(authenticateTenant as never);

/** GET /api/tenant-store/products → resumen de productos del tenant (para la lista). */
tenantStoreRouter.get("/products", async (req: TenantRequest, res: Response): Promise<Response> => {
  try {
    const products = await listTenantProducts(req.tenant!.salesChannelId);
    return res.json({ products });
  } catch (err) {
    return sendError(res, err);
  }
});

/** GET /api/tenant-store/products/:id → detalle completo (para el editor). */
tenantStoreRouter.get(
  "/products/:id",
  async (req: TenantRequest, res: Response): Promise<Response> => {
    try {
      const product = await getTenantProduct(req.tenant!.salesChannelId, req.params.id);
      return res.json({ product });
    } catch (err) {
      return sendError(res, err);
    }
  }
);

/** POST /api/tenant-store/products → crea un producto completo en la tienda del tenant. */
tenantStoreRouter.post("/products", async (req: TenantRequest, res: Response): Promise<Response> => {
  try {
    const input = parseRichInput((req.body || {}) as Record<string, unknown>);
    const product = await createTenantProductRich(
      req.tenant!.salesChannelId,
      req.tenant!.clientId,
      input
    );
    return res.status(201).json({ product });
  } catch (err) {
    return sendError(res, err);
  }
});

/** PATCH /api/tenant-store/products/:id → edita un producto (verifica propiedad). */
tenantStoreRouter.patch(
  "/products/:id",
  async (req: TenantRequest, res: Response): Promise<Response> => {
    try {
      const patch = parseRichPatch((req.body || {}) as Record<string, unknown>);
      if (Object.keys(patch).length === 0) {
        return res.status(400).json({ error: "Nada que actualizar." });
      }
      const product = await updateTenantProductRich(
        req.tenant!.salesChannelId,
        req.tenant!.clientId,
        req.params.id,
        patch
      );
      return res.json({ product });
    } catch (err) {
      return sendError(res, err);
    }
  }
);

/** DELETE /api/tenant-store/products/:id → borra un producto (verifica propiedad). */
tenantStoreRouter.delete(
  "/products/:id",
  async (req: TenantRequest, res: Response): Promise<Response> => {
    try {
      await deleteTenantProduct(req.tenant!.salesChannelId, req.params.id);
      return res.json({ ok: true });
    } catch (err) {
      return sendError(res, err);
    }
  }
);

/** GET /api/tenant-store/orders → pedidos de la tienda del tenant (paginado). */
tenantStoreRouter.get("/orders", async (req: TenantRequest, res: Response): Promise<Response> => {
  try {
    const limit = parseInt(String(req.query.limit ?? ""), 10);
    const offset = parseInt(String(req.query.offset ?? ""), 10);
    const page = await listTenantOrders(req.tenant!.salesChannelId, {
      limit: Number.isFinite(limit) ? limit : undefined,
      offset: Number.isFinite(offset) ? offset : undefined,
    });
    return res.json(page);
  } catch (err) {
    return sendError(res, err);
  }
});

/** GET /api/tenant-store/orders/:id → detalle de un pedido (verifica propiedad). */
tenantStoreRouter.get(
  "/orders/:id",
  async (req: TenantRequest, res: Response): Promise<Response> => {
    try {
      const order = await getTenantOrder(req.tenant!.salesChannelId, req.params.id);
      return res.json({ order });
    } catch (err) {
      return sendError(res, err);
    }
  }
);

/** POST /api/tenant-store/orders/:id/capture → captura los pagos pendientes. */
tenantStoreRouter.post(
  "/orders/:id/capture",
  async (req: TenantRequest, res: Response): Promise<Response> => {
    try {
      const order = await captureTenantOrderPayment(
        req.tenant!.salesChannelId,
        req.params.id
      );
      return res.json({ order });
    } catch (err) {
      return sendError(res, err);
    }
  }
);

/** POST /api/tenant-store/orders/:id/fulfill → crea la preparación del pedido. */
tenantStoreRouter.post(
  "/orders/:id/fulfill",
  async (req: TenantRequest, res: Response): Promise<Response> => {
    try {
      const order = await fulfillTenantOrder(req.tenant!.salesChannelId, req.params.id);
      return res.json({ order });
    } catch (err) {
      return sendError(res, err);
    }
  }
);

/** POST /api/tenant-store/orders/:id/fulfillments/:fid/ship → marca enviada. */
tenantStoreRouter.post(
  "/orders/:id/fulfillments/:fid/ship",
  async (req: TenantRequest, res: Response): Promise<Response> => {
    try {
      const order = await shipTenantFulfillment(
        req.tenant!.salesChannelId,
        req.params.id,
        req.params.fid
      );
      return res.json({ order });
    } catch (err) {
      return sendError(res, err);
    }
  }
);

/** POST /api/tenant-store/orders/:id/cancel → cancela el pedido. */
tenantStoreRouter.post(
  "/orders/:id/cancel",
  async (req: TenantRequest, res: Response): Promise<Response> => {
    try {
      const order = await cancelTenantOrder(req.tenant!.salesChannelId, req.params.id);
      return res.json({ order });
    } catch (err) {
      return sendError(res, err);
    }
  }
);

/** GET /api/tenant-store/customers → clientes de la tienda (derivados de pedidos). */
tenantStoreRouter.get("/customers", async (req: TenantRequest, res: Response): Promise<Response> => {
  try {
    const limit = parseInt(String(req.query.limit ?? ""), 10);
    const offset = parseInt(String(req.query.offset ?? ""), 10);
    const page = await listTenantCustomers(req.tenant!.salesChannelId, {
      limit: Number.isFinite(limit) ? limit : undefined,
      offset: Number.isFinite(offset) ? offset : undefined,
    });
    return res.json(page);
  } catch (err) {
    return sendError(res, err);
  }
});

/** GET /api/tenant-store/customers/:id → detalle de un cliente + sus pedidos. */
tenantStoreRouter.get(
  "/customers/:id",
  async (req: TenantRequest, res: Response): Promise<Response> => {
    try {
      const customer = await getTenantCustomer(
        req.tenant!.salesChannelId,
        req.params.id
      );
      return res.json({ customer });
    } catch (err) {
      return sendError(res, err);
    }
  }
);

/** GET /api/tenant-store/collections → colecciones de la tienda (paginado). */
tenantStoreRouter.get("/collections", async (req: TenantRequest, res: Response): Promise<Response> => {
  try {
    const limit = parseInt(String(req.query.limit ?? ""), 10);
    const offset = parseInt(String(req.query.offset ?? ""), 10);
    const page = await listTenantCollections(req.tenant!.salesChannelId, {
      limit: Number.isFinite(limit) ? limit : undefined,
      offset: Number.isFinite(offset) ? offset : undefined,
    });
    return res.json(page);
  } catch (err) {
    return sendError(res, err);
  }
});

/** POST /api/tenant-store/collections → crea una colección del tenant. */
tenantStoreRouter.post("/collections", async (req: TenantRequest, res: Response): Promise<Response> => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const title = asString(body.title)?.trim();
    if (!title) {
      return res.status(400).json({ error: "El título es obligatorio." });
    }
    const collection = await createTenantCollection(req.tenant!.salesChannelId, {
      title,
      handle: asString(body.handle),
    });
    return res.status(201).json({ collection });
  } catch (err) {
    return sendError(res, err);
  }
});

/** GET /api/tenant-store/collections/:id → detalle + productos de la colección. */
tenantStoreRouter.get(
  "/collections/:id",
  async (req: TenantRequest, res: Response): Promise<Response> => {
    try {
      const collection = await getTenantCollection(req.tenant!.salesChannelId, req.params.id);
      return res.json({ collection });
    } catch (err) {
      return sendError(res, err);
    }
  }
);

/** PATCH /api/tenant-store/collections/:id → renombra/actualiza la colección. */
tenantStoreRouter.patch(
  "/collections/:id",
  async (req: TenantRequest, res: Response): Promise<Response> => {
    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const collection = await updateTenantCollection(
        req.tenant!.salesChannelId,
        req.params.id,
        {
          title: "title" in body ? asString(body.title) : undefined,
          handle: "handle" in body ? asString(body.handle) : undefined,
        }
      );
      return res.json({ collection });
    } catch (err) {
      return sendError(res, err);
    }
  }
);

/** DELETE /api/tenant-store/collections/:id → elimina la colección del tenant. */
tenantStoreRouter.delete(
  "/collections/:id",
  async (req: TenantRequest, res: Response): Promise<Response> => {
    try {
      await deleteTenantCollection(req.tenant!.salesChannelId, req.params.id);
      return res.json({ ok: true });
    } catch (err) {
      return sendError(res, err);
    }
  }
);

/** POST /api/tenant-store/collections/:id/products → añade/quita productos. */
tenantStoreRouter.post(
  "/collections/:id/products",
  async (req: TenantRequest, res: Response): Promise<Response> => {
    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const add = asStringArray(body.add) ?? [];
      const remove = asStringArray(body.remove) ?? [];
      if (add.length === 0 && remove.length === 0) {
        return res.status(400).json({ error: "Indica productos a añadir o quitar." });
      }
      const scId = req.tenant!.salesChannelId;
      if (add.length > 0) await addProductsToTenantCollection(scId, req.params.id, add);
      if (remove.length > 0) await removeProductsFromTenantCollection(scId, req.params.id, remove);
      const collection = await getTenantCollection(scId, req.params.id);
      return res.json({ collection });
    } catch (err) {
      return sendError(res, err);
    }
  }
);

/** GET /api/tenant-store/categories → categorías de la tienda (paginado). */
tenantStoreRouter.get("/categories", async (req: TenantRequest, res: Response): Promise<Response> => {
  try {
    const limit = parseInt(String(req.query.limit ?? ""), 10);
    const offset = parseInt(String(req.query.offset ?? ""), 10);
    const page = await listTenantCategories(req.tenant!.salesChannelId, {
      limit: Number.isFinite(limit) ? limit : undefined,
      offset: Number.isFinite(offset) ? offset : undefined,
    });
    return res.json(page);
  } catch (err) {
    return sendError(res, err);
  }
});

/** POST /api/tenant-store/categories → crea una categoría del tenant. */
tenantStoreRouter.post("/categories", async (req: TenantRequest, res: Response): Promise<Response> => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const name = asString(body.name)?.trim();
    if (!name) {
      return res.status(400).json({ error: "El nombre es obligatorio." });
    }
    const category = await createTenantCategory(req.tenant!.salesChannelId, {
      name,
      handle: asString(body.handle),
      description: asString(body.description),
      parentId: body.parentId === null ? null : asString(body.parentId),
    });
    return res.status(201).json({ category });
  } catch (err) {
    return sendError(res, err);
  }
});

/** GET /api/tenant-store/categories/:id → detalle + productos + subcategorías. */
tenantStoreRouter.get(
  "/categories/:id",
  async (req: TenantRequest, res: Response): Promise<Response> => {
    try {
      const category = await getTenantCategory(req.tenant!.salesChannelId, req.params.id);
      return res.json({ category });
    } catch (err) {
      return sendError(res, err);
    }
  }
);

/** PATCH /api/tenant-store/categories/:id → actualiza la categoría. */
tenantStoreRouter.patch(
  "/categories/:id",
  async (req: TenantRequest, res: Response): Promise<Response> => {
    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const patch: Parameters<typeof updateTenantCategory>[2] = {};
      if ("name" in body) patch.name = asString(body.name);
      if ("handle" in body) patch.handle = asString(body.handle);
      if ("description" in body)
        patch.description = body.description === null ? null : asString(body.description);
      if ("isActive" in body) patch.isActive = asBool(body.isActive);
      if ("parentId" in body) patch.parentId = body.parentId === null ? null : asString(body.parentId);
      const category = await updateTenantCategory(
        req.tenant!.salesChannelId,
        req.params.id,
        patch
      );
      return res.json({ category });
    } catch (err) {
      return sendError(res, err);
    }
  }
);

/** DELETE /api/tenant-store/categories/:id → elimina la categoría del tenant. */
tenantStoreRouter.delete(
  "/categories/:id",
  async (req: TenantRequest, res: Response): Promise<Response> => {
    try {
      await deleteTenantCategory(req.tenant!.salesChannelId, req.params.id);
      return res.json({ ok: true });
    } catch (err) {
      return sendError(res, err);
    }
  }
);

/** POST /api/tenant-store/categories/:id/products → añade/quita productos. */
tenantStoreRouter.post(
  "/categories/:id/products",
  async (req: TenantRequest, res: Response): Promise<Response> => {
    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const add = asStringArray(body.add) ?? [];
      const remove = asStringArray(body.remove) ?? [];
      if (add.length === 0 && remove.length === 0) {
        return res.status(400).json({ error: "Indica productos a añadir o quitar." });
      }
      const scId = req.tenant!.salesChannelId;
      if (add.length > 0) await addProductsToTenantCategory(scId, req.params.id, add);
      if (remove.length > 0) await removeProductsFromTenantCategory(scId, req.params.id, remove);
      const category = await getTenantCategory(scId, req.params.id);
      return res.json({ category });
    } catch (err) {
      return sendError(res, err);
    }
  }
);

/** GET /api/tenant-store/tags → etiquetas de la tienda (paginado). */
tenantStoreRouter.get("/tags", async (req: TenantRequest, res: Response): Promise<Response> => {
  try {
    const limit = parseInt(String(req.query.limit ?? ""), 10);
    const offset = parseInt(String(req.query.offset ?? ""), 10);
    const page = await listTenantTags(req.tenant!.salesChannelId, {
      limit: Number.isFinite(limit) ? limit : undefined,
      offset: Number.isFinite(offset) ? offset : undefined,
    });
    return res.json(page);
  } catch (err) {
    return sendError(res, err);
  }
});

/** POST /api/tenant-store/tags → crea una etiqueta del tenant. */
tenantStoreRouter.post("/tags", async (req: TenantRequest, res: Response): Promise<Response> => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const label = asString(body.label)?.trim();
    if (!label) {
      return res.status(400).json({ error: "La etiqueta no puede estar vacía." });
    }
    const tag = await createTenantTag(req.tenant!.salesChannelId, { label });
    return res.status(201).json({ tag });
  } catch (err) {
    return sendError(res, err);
  }
});

/** GET /api/tenant-store/tags/:id → detalle + productos de la etiqueta. */
tenantStoreRouter.get(
  "/tags/:id",
  async (req: TenantRequest, res: Response): Promise<Response> => {
    try {
      const tag = await getTenantTag(req.tenant!.salesChannelId, req.params.id);
      return res.json({ tag });
    } catch (err) {
      return sendError(res, err);
    }
  }
);

/** PATCH /api/tenant-store/tags/:id → renombra la etiqueta. */
tenantStoreRouter.patch(
  "/tags/:id",
  async (req: TenantRequest, res: Response): Promise<Response> => {
    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const tag = await updateTenantTag(req.tenant!.salesChannelId, req.params.id, {
        label: asString(body.label),
      });
      return res.json({ tag });
    } catch (err) {
      return sendError(res, err);
    }
  }
);

/** DELETE /api/tenant-store/tags/:id → elimina la etiqueta del tenant. */
tenantStoreRouter.delete(
  "/tags/:id",
  async (req: TenantRequest, res: Response): Promise<Response> => {
    try {
      await deleteTenantTag(req.tenant!.salesChannelId, req.params.id);
      return res.json({ ok: true });
    } catch (err) {
      return sendError(res, err);
    }
  }
);

/** POST /api/tenant-store/tags/:id/products → añade/quita productos de la etiqueta. */
tenantStoreRouter.post(
  "/tags/:id/products",
  async (req: TenantRequest, res: Response): Promise<Response> => {
    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const add = asStringArray(body.add) ?? [];
      const remove = asStringArray(body.remove) ?? [];
      if (add.length === 0 && remove.length === 0) {
        return res.status(400).json({ error: "Indica productos a añadir o quitar." });
      }
      const scId = req.tenant!.salesChannelId;
      if (add.length > 0) await addProductsToTenantTag(scId, req.params.id, add);
      if (remove.length > 0) await removeProductsFromTenantTag(scId, req.params.id, remove);
      const tag = await getTenantTag(scId, req.params.id);
      return res.json({ tag });
    } catch (err) {
      return sendError(res, err);
    }
  }
);

// ── Descuentos / Promociones ────────────────────────────────────────────────

/** GET /api/tenant-store/promotions → descuentos de la tienda (paginado). */
tenantStoreRouter.get(
  "/promotions",
  async (req: TenantRequest, res: Response): Promise<Response> => {
    try {
      const limit = parseInt(String(req.query.limit ?? ""), 10);
      const offset = parseInt(String(req.query.offset ?? ""), 10);
      const page = await listTenantPromotions(req.tenant!.salesChannelId, {
        limit: Number.isFinite(limit) ? limit : undefined,
        offset: Number.isFinite(offset) ? offset : undefined,
      });
      return res.json(page);
    } catch (err) {
      return sendError(res, err);
    }
  }
);

/** POST /api/tenant-store/promotions → crea un descuento. */
tenantStoreRouter.post(
  "/promotions",
  async (req: TenantRequest, res: Response): Promise<Response> => {
    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const code = asString(body.code)?.trim();
      const valueType = asPromoType(body.valueType);
      const value = asNumberOrNull(body.value);
      if (!code) {
        return res.status(400).json({ error: "El código del descuento es obligatorio." });
      }
      if (!valueType) {
        return res.status(400).json({ error: "Indica el tipo de descuento (porcentaje o importe)." });
      }
      if (typeof value !== "number") {
        return res.status(400).json({ error: "Indica el valor del descuento." });
      }
      const promotion = await createTenantPromotion(req.tenant!.salesChannelId, {
        code,
        valueType,
        value,
        status: asPromoStatus(body.status),
      });
      return res.status(201).json({ promotion });
    } catch (err) {
      return sendError(res, err);
    }
  }
);

/** GET /api/tenant-store/promotions/:id → detalle de un descuento. */
tenantStoreRouter.get(
  "/promotions/:id",
  async (req: TenantRequest, res: Response): Promise<Response> => {
    try {
      const promotion = await getTenantPromotion(req.tenant!.salesChannelId, req.params.id);
      return res.json({ promotion });
    } catch (err) {
      return sendError(res, err);
    }
  }
);

/** PATCH /api/tenant-store/promotions/:id → actualiza código/valor/estado. */
tenantStoreRouter.patch(
  "/promotions/:id",
  async (req: TenantRequest, res: Response): Promise<Response> => {
    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const patch: {
        code?: string;
        value?: number;
        status?: TenantPromotionStatus;
      } = {};
      if ("code" in body) {
        const code = asString(body.code);
        if (code !== undefined) patch.code = code;
      }
      if ("value" in body) {
        const value = asNumberOrNull(body.value);
        if (typeof value === "number") patch.value = value;
      }
      if ("status" in body) {
        const status = asPromoStatus(body.status);
        if (status) patch.status = status;
      }
      const promotion = await updateTenantPromotion(
        req.tenant!.salesChannelId,
        req.params.id,
        patch
      );
      return res.json({ promotion });
    } catch (err) {
      return sendError(res, err);
    }
  }
);

/** DELETE /api/tenant-store/promotions/:id → elimina el descuento. */
tenantStoreRouter.delete(
  "/promotions/:id",
  async (req: TenantRequest, res: Response): Promise<Response> => {
    try {
      await deleteTenantPromotion(req.tenant!.salesChannelId, req.params.id);
      return res.json({ ok: true });
    } catch (err) {
      return sendError(res, err);
    }
  }
);

// ── Ajustes de la tienda ─────────────────────────────────────────────────────

/** GET /api/tenant-store/settings → ajustes de la tienda del tenant. */
tenantStoreRouter.get(
  "/settings",
  async (req: TenantRequest, res: Response): Promise<Response> => {
    try {
      const settings = await getTenantStoreSettings(req.tenant!.salesChannelId);
      return res.json({ settings });
    } catch (err) {
      return sendError(res, err);
    }
  }
);

/** POST /api/tenant-store/uploads → sube imágenes (base64) y devuelve URLs. */
tenantStoreRouter.post(
  "/uploads",
  async (req: TenantRequest, res: Response): Promise<Response> => {
    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const raw = Array.isArray(body.files) ? body.files : [];
      const files: TenantUploadInput[] = [];
      for (const item of raw) {
        if (!item || typeof item !== "object") continue;
        const rec = item as Record<string, unknown>;
        const filename = asString(rec.filename);
        const mimeType = asString(rec.mimeType);
        const dataBase64 = asString(rec.dataBase64);
        if (filename && mimeType && dataBase64) {
          files.push({ filename, mimeType, dataBase64 });
        }
      }
      if (files.length === 0) {
        return res.status(400).json({ error: "No se ha recibido ningún archivo válido." });
      }
      if (files.length > 10) {
        return res.status(400).json({ error: "Máximo 10 imágenes por subida." });
      }
      const uploaded = await uploadTenantFiles(files);
      return res.status(201).json({ files: uploaded });
    } catch (err) {
      return sendError(res, err);
    }
  }
);

/** PATCH /api/tenant-store/settings → actualiza nombre/descripción/contacto. */
tenantStoreRouter.patch(
  "/settings",
  async (req: TenantRequest, res: Response): Promise<Response> => {
    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const input: {
        storeName?: string;
        storeDescription?: string;
        contactEmail?: string;
        contactPhone?: string;
      } = {};
      if ("storeName" in body) input.storeName = asString(body.storeName) ?? "";
      if ("storeDescription" in body)
        input.storeDescription = asString(body.storeDescription) ?? "";
      if ("contactEmail" in body) input.contactEmail = asString(body.contactEmail) ?? "";
      if ("contactPhone" in body) input.contactPhone = asString(body.contactPhone) ?? "";
      const settings = await updateTenantStoreSettings(req.tenant!.salesChannelId, input);
      return res.json({ settings });
    } catch (err) {
      return sendError(res, err);
    }
  }
);

// ── PAGOS (Stripe Connect) — la tienda del tenant cobra a SU propia cuenta ──

/** GET /api/tenant-store/payments/status → estado de Stripe Connect del tenant. */
tenantStoreRouter.get(
  "/payments/status",
  async (req: TenantRequest, res: Response): Promise<Response> => {
    try {
      const status = await getConnectStatus(req.tenant!.userId);
      return res.json({ status });
    } catch (err) {
      return sendError(res, err);
    }
  }
);

/**
 * POST /api/tenant-store/payments/connect → inicia/reanuda el onboarding de Connect.
 * El panel manda `returnUrl`/`refreshUrl` absolutas de SU dominio (validadas https/localhost).
 */
tenantStoreRouter.post(
  "/payments/connect",
  async (req: TenantRequest, res: Response): Promise<Response> => {
    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const returnUrl = asString(body.returnUrl);
      const refreshUrl = asString(body.refreshUrl);
      if (!returnUrl || !refreshUrl) {
        return res.status(400).json({ error: "Faltan las URLs de retorno." });
      }
      const result = await startConnectOnboarding(req.tenant!.userId, returnUrl, refreshUrl);
      return res.json(result);
    } catch (err) {
      return sendError(res, err);
    }
  }
);

/** POST /api/tenant-store/payments/dashboard → enlace al dashboard Express del tenant. */
tenantStoreRouter.post(
  "/payments/dashboard",
  async (req: TenantRequest, res: Response): Promise<Response> => {
    try {
      const result = await createConnectDashboardLink(req.tenant!.userId);
      return res.json(result);
    } catch (err) {
      return sendError(res, err);
    }
  }
);

/** GET /api/tenant-store/payments/settings → vista multi-pasarela (activa + estado de cada una). */
tenantStoreRouter.get(
  "/payments/settings",
  async (req: TenantRequest, res: Response): Promise<Response> => {
    try {
      const settings = await getPaymentSettings(req.tenant!.userId);
      return res.json({ settings });
    } catch (err) {
      return sendError(res, err);
    }
  }
);

/** POST /api/tenant-store/payments/provider → fija la pasarela activa. */
tenantStoreRouter.post(
  "/payments/provider",
  async (req: TenantRequest, res: Response): Promise<Response> => {
    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const provider = asString(body.provider) as PaymentProvider | undefined;
      if (!provider) {
        return res.status(400).json({ error: "Falta la pasarela." });
      }
      const settings = await setActiveProvider(req.tenant!.userId, provider);
      return res.json({ settings });
    } catch (err) {
      return sendError(res, err);
    }
  }
);

/** POST /api/tenant-store/payments/redsys → guarda (cifrada) la config de Redsys del tenant. */
tenantStoreRouter.post(
  "/payments/redsys",
  async (req: TenantRequest, res: Response): Promise<Response> => {
    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const merchantCode = asString(body.merchantCode);
      const terminal = asString(body.terminal) || "001";
      const environment = asString(body.environment) === "live" ? "live" : "test";
      const secretKey = asString(body.secretKey);
      if (!merchantCode || !secretKey) {
        return res.status(400).json({ error: "Faltan datos de Redsys." });
      }
      const settings = await setRedsysConfig(req.tenant!.userId, {
        merchantCode,
        terminal,
        environment,
        secretKey,
      });
      return res.json({ settings });
    } catch (err) {
      return sendError(res, err);
    }
  }
);
