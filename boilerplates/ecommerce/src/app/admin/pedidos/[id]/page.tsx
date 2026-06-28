import { notFound } from "next/navigation";
import { getOrder, OrderDetail } from "@/lib/tenantApi";
import { OrderDetailView } from "@/components/admin/OrderDetailView";

export const dynamic = "force-dynamic";

export default async function PedidoDetallePage({ params }: { params: { id: string } }) {
  let order: OrderDetail;
  try {
    order = await getOrder(params.id);
  } catch {
    notFound();
  }

  return <OrderDetailView order={order} />;
}
