import { notFound } from "next/navigation";
import {
  getProduct,
  listCollections,
  listCategories,
  listTags,
  ProductDetail,
  ProductRef,
} from "@/lib/tenantApi";
import { ProductDetailView } from "@/components/admin/ProductDetailView";

export const dynamic = "force-dynamic";

export default async function ProductoDetallePage({ params }: { params: { id: string } }) {
  let product: ProductDetail;
  try {
    product = await getProduct(params.id);
  } catch {
    notFound();
  }

  // Opciones de organización (best-effort: si fallan, los selectores quedan vacíos).
  let collections: ProductRef[] = [];
  let categories: ProductRef[] = [];
  let tags: ProductRef[] = [];
  try {
    const [cols, cats, tgs] = await Promise.all([
      listCollections({ limit: 100 }),
      listCategories({ limit: 100 }),
      listTags({ limit: 100 }),
    ]);
    collections = cols.collections.map((c) => ({ id: c.id, label: c.title }));
    categories = cats.categories.map((c) => ({ id: c.id, label: c.name }));
    tags = tgs.tags.map((t) => ({ id: t.id, label: t.label }));
  } catch {
    /* sin opciones de organización */
  }

  return (
    <ProductDetailView
      product={product}
      collections={collections}
      categories={categories}
      tags={tags}
    />
  );
}
