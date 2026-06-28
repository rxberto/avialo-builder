import { notFound } from "next/navigation";
import { getCollection, listProducts, CollectionDetail, AdminProduct } from "@/lib/tenantApi";
import { CollectionDetailView } from "@/components/admin/CollectionDetailView";

export const dynamic = "force-dynamic";

export default async function ColeccionDetallePage({ params }: { params: { id: string } }) {
  let collection: CollectionDetail;
  try {
    collection = await getCollection(params.id);
  } catch {
    notFound();
  }

  // Productos del tenant para el selector "Añadir productos" (best-effort).
  let allProducts: AdminProduct[] = [];
  try {
    allProducts = await listProducts();
  } catch {
    allProducts = [];
  }

  return <CollectionDetailView collection={collection} allProducts={allProducts} />;
}
