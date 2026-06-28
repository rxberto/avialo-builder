import Link from "next/link";
import { ArrowRight, Sparkles, Truck, ShieldCheck, RotateCcw } from "lucide-react";
import { businessConfig } from "@/config/business";
import { listProducts } from "@/lib/store";
import { ProductCard } from "@/components/ProductCard";

// Datos en vivo del backend Medusa: no prerenderizar en build.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { products } = await listProducts({ limit: 8 });

  return (
    <div className="flex flex-col w-full">
      {/* Hero */}
      <section className="relative bg-gradient-to-r from-primary/10 via-background to-primary/5 py-16 sm:py-24 border-b border-border overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10 max-w-3xl">
          <span className="inline-flex items-center gap-1 bg-primary/10 px-3 py-1 rounded-full text-xs font-bold text-primary">
            <Sparkles size={12} /> {businessConfig.city || "España"}
          </span>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-foreground mt-6 leading-tight">
            {businessConfig.name}
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground mt-6 leading-relaxed">
            Descubre nuestra selección de productos. Compra online con envío a
            toda España y pago 100% seguro.
          </p>
          <div className="mt-8 flex gap-4">
            <Link
              href="/productos"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-semibold px-6 py-3.5 rounded-xl shadow-lg hover:bg-primary/90 transition-all active:scale-95 text-sm"
            >
              Ver catálogo <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* Productos destacados */}
      <section className="py-16 sm:py-24 bg-muted/10 flex-1">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between pb-6 border-b border-border mb-12">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                Productos destacados
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Lo más nuevo de nuestra tienda.
              </p>
            </div>
            <Link
              href="/productos"
              className="hidden sm:inline-flex items-center gap-1 text-sm font-bold text-primary hover:gap-2 transition-all"
            >
              Ver todo <ArrowRight size={14} />
            </Link>
          </div>

          {products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <p className="text-sm">
                Aún no hay productos publicados. Vuelve pronto.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Ventajas */}
      <section className="bg-background py-10 border-t border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { label: "Envío rápido", desc: "Entrega en toda España.", icon: <Truck size={20} className="text-primary" /> },
            { label: "Devolución fácil", desc: "14 días para devolver.", icon: <RotateCcw size={20} className="text-primary" /> },
            { label: "Pago seguro", desc: "Stripe y 3D Secure.", icon: <ShieldCheck size={20} className="text-primary" /> },
          ].map((item, idx) => (
            <div
              key={idx}
              className="flex items-start gap-4 p-4 border border-border/50 rounded-2xl bg-muted/5"
            >
              <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0 border border-border">
                {item.icon}
              </div>
              <div>
                <h4 className="font-bold text-sm text-foreground">{item.label}</h4>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
