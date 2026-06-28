import "server-only";
import type { HttpTypes } from "@medusajs/types";
import { sdk } from "./medusa";

// Campos de producto necesarios para mostrar precio con descuentos y galería.
const PRODUCT_FIELDS =
  "*variants.calculated_price,+variants.inventory_quantity,*variants.options,*images,*options,*categories,+metadata";

// Región de la tienda. El modelo de Avialo es de una sola región (España/EUR), así que
// tomamos la primera. Se cachea en memoria del proceso para no repetir la llamada.
let cachedRegion: HttpTypes.StoreRegion | null = null;

export async function getRegion(): Promise<HttpTypes.StoreRegion | null> {
  if (cachedRegion) return cachedRegion;
  try {
    const { regions } = await sdk.client.fetch<{
      regions: HttpTypes.StoreRegion[];
    }>("/store/regions", { method: "GET", cache: "no-store" });
    cachedRegion = regions?.[0] ?? null;
    return cachedRegion;
  } catch {
    return null;
  }
}

export interface ListProductsParams {
  limit?: number;
  offset?: number;
  q?: string;
  categoryId?: string;
}

export async function listProducts(
  params: ListProductsParams = {}
): Promise<{ products: HttpTypes.StoreProduct[]; count: number }> {
  const region = await getRegion();
  if (!region) return { products: [], count: 0 };

  const query: Record<string, unknown> = {
    limit: params.limit ?? 12,
    offset: params.offset ?? 0,
    region_id: region.id,
    fields: PRODUCT_FIELDS,
  };
  if (params.q) query.q = params.q;
  if (params.categoryId) query.category_id = params.categoryId;

  try {
    const { products, count } = await sdk.client.fetch<{
      products: HttpTypes.StoreProduct[];
      count: number;
    }>("/store/products", { method: "GET", query, cache: "no-store" });
    return { products: products ?? [], count: count ?? 0 };
  } catch {
    return { products: [], count: 0 };
  }
}

export async function getProductByHandle(
  handle: string
): Promise<HttpTypes.StoreProduct | null> {
  const region = await getRegion();
  if (!region) return null;

  try {
    const { products } = await sdk.client.fetch<{
      products: HttpTypes.StoreProduct[];
    }>("/store/products", {
      method: "GET",
      query: {
        handle,
        limit: 1,
        region_id: region.id,
        fields: PRODUCT_FIELDS,
      },
      cache: "no-store",
    });
    return products?.[0] ?? null;
  } catch {
    return null;
  }
}

export async function listCategories(): Promise<
  HttpTypes.StoreProductCategory[]
> {
  try {
    const { product_categories } = await sdk.client.fetch<{
      product_categories: HttpTypes.StoreProductCategory[];
    }>("/store/product-categories", {
      method: "GET",
      query: { limit: 20, fields: "id,name,handle" },
      cache: "no-store",
    });
    return product_categories ?? [];
  } catch {
    return [];
  }
}
