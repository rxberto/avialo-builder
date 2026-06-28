import { notFound } from "next/navigation";
import { getPromotion, PromotionDetail } from "@/lib/tenantApi";
import { PromotionDetailView } from "@/components/admin/PromotionDetailView";

export const dynamic = "force-dynamic";

export default async function DescuentoDetallePage({ params }: { params: { id: string } }) {
  let promotion: PromotionDetail;
  try {
    promotion = await getPromotion(params.id);
  } catch {
    notFound();
  }

  return <PromotionDetailView promotion={promotion} />;
}
