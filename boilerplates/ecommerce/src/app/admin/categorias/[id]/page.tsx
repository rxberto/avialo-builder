import { notFound } from "next/navigation";
import {
  getCategory,
  listProducts,
  listCategories,
  CategoryDetail,
  AdminProduct,
} from "@/lib/tenantApi";
import { CategoryDetailView } from "@/components/admin/CategoryDetailView";

export const dynamic = "force-dynamic";

export default async function CategoriaDetallePage({ params }: { params: { id: string } }) {
  let category: CategoryDetail;
  try {
    category = await getCategory(params.id);
  } catch {
    notFound();
  }

  // Productos del tenant (para el selector "Añadir") y categorías (para elegir padre).
  let allProducts: AdminProduct[] = [];
  let allCategories: { id: string; name: string }[] = [];
  try {
    allProducts = await listProducts();
  } catch {
    allProducts = [];
  }
  try {
    const page = await listCategories({ limit: 100 });
    allCategories = page.categories.map((c) => ({ id: c.id, name: c.name }));
  } catch {
    allCategories = [];
  }

  return (
    <CategoryDetailView
      category={category}
      allProducts={allProducts}
      allCategories={allCategories}
    />
  );
}
