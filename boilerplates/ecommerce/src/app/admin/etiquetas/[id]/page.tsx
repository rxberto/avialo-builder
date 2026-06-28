import { notFound } from "next/navigation";
import { getTag, listProducts, TagDetail, AdminProduct } from "@/lib/tenantApi";
import { TagDetailView } from "@/components/admin/TagDetailView";

export const dynamic = "force-dynamic";

export default async function EtiquetaDetallePage({ params }: { params: { id: string } }) {
  let tag: TagDetail;
  try {
    tag = await getTag(params.id);
  } catch {
    notFound();
  }

  let allProducts: AdminProduct[] = [];
  try {
    allProducts = await listProducts();
  } catch {
    allProducts = [];
  }

  return <TagDetailView tag={tag} allProducts={allProducts} />;
}
