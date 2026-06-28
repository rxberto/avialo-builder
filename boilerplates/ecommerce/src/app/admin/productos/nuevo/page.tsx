import { ProductEditor } from "@/components/admin/ProductEditor";

export const dynamic = "force-dynamic";

export default function NuevoProductoPage() {
  return <ProductEditor mode="create" />;
}
