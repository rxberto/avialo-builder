"use client";

import { useState } from "react";
import { ShoppingCart, Star, Heart, ArrowRight, Sparkles, ShieldCheck } from "lucide-react";

const PRODUCTOS = [
  {
    id: "prod_1",
    title: "Camiseta Básica Premium",
    price: 24.99,
    category: "Ropa",
    rating: 4.8,
    reviews: 32,
    discount: 10,
    image: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=500&auto=format&fit=crop",
  },
  {
    id: "prod_2",
    title: "Zapatillas Deportivas Runner",
    price: 89.99,
    category: "Calzado",
    rating: 4.9,
    reviews: 54,
    discount: 0,
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=500&auto=format&fit=crop",
  },
  {
    id: "prod_3",
    title: "Gafas de Sol Urbanas",
    price: 34.99,
    category: "Accesorios",
    rating: 4.5,
    reviews: 18,
    discount: 15,
    image: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?q=80&w=500&auto=format&fit=crop",
  },
  {
    id: "prod_4",
    title: "Sudadera Minimalista Oversize",
    price: 49.99,
    category: "Ropa",
    rating: 4.7,
    reviews: 28,
    discount: 0,
    image: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?q=80&w=500&auto=format&fit=crop",
  },
];

const CATEGORIAS = ["Todos", "Ropa", "Calzado", "Accesorios"];

export default function CatalogPage() {
  const [activeCategory, setActiveCategory] = useState("Todos");

  const filteredProducts = activeCategory === "Todos" 
    ? PRODUCTOS 
    : PRODUCTOS.filter(p => p.category === activeCategory);

  return (
    <div className="flex flex-col w-full">
      {/* 1. COMERCIAL HERO BANNER */}
      <section className="relative bg-gradient-to-r from-primary/10 via-background to-primary/5 py-16 sm:py-24 border-b border-border overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10 grid grid-cols-1 lg:grid-cols-2 items-center gap-12">
          <div>
            <span className="inline-flex items-center gap-1 bg-primary/10 px-3 py-1 rounded-full text-xs font-bold text-primary">
              <Sparkles size={12} /> Exclusividad de Temporada
            </span>
            <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-foreground mt-6 leading-tight">
              Nueva Colección Estilo Urbano
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground mt-6 leading-relaxed max-w-xl">
              Descubre productos premium seleccionados a mano para complementar tu estilo diario. Materiales 100% orgánicos, comercio ético y envíos gratis en compras superiores a 40€.
            </p>
            <div className="mt-8 flex gap-4">
              <a
                href="#catalogo"
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-semibold px-6 py-3.5 rounded-xl shadow-lg hover:bg-primary/90 transition-all active:scale-95 text-sm"
              >
                Comprar Catálogo <ArrowRight size={16} />
              </a>
            </div>
          </div>
          <div className="hidden lg:block relative h-96 w-full rounded-3xl overflow-hidden border border-border bg-muted">
            <img
              src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=800&auto=format&fit=crop"
              alt="Modelo Colección Urbano"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 hover:scale-105"
              loading="lazy"
            />
          </div>
        </div>
      </section>

      {/* 2. CATALOG & FILTERS */}
      <section id="catalogo" className="py-16 sm:py-24 bg-muted/10 flex-1">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 pb-6 border-b border-border mb-12">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">Explora Nuestra Tienda</h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">Filtrado rápido de productos premium.</p>
            </div>
            
            {/* Filtros de Categoría */}
            <div className="flex flex-wrap gap-2">
              {CATEGORIAS.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all ${
                    activeCategory === cat
                      ? "bg-primary border-primary text-primary-foreground shadow-sm"
                      : "border-border hover:border-primary/20 bg-background text-muted-foreground hover:text-primary"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Grid de Productos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {filteredProducts.map(prod => (
              <div
                key={prod.id}
                className="group relative flex flex-col bg-card border border-border rounded-3xl overflow-hidden shadow-sm hover:shadow-md hover:border-primary/20 transition-all"
              >
                {/* Descuento Badge */}
                {prod.discount > 0 && (
                  <span className="absolute top-3 left-3 z-10 bg-rose-500 text-white font-extrabold text-[10px] uppercase px-2.5 py-1 rounded-full">
                    -{prod.discount}% DTO
                  </span>
                )}
                
                {/* Imagen del Producto */}
                <div className="relative h-64 w-full bg-muted overflow-hidden">
                  <img
                    src={prod.image}
                    alt={prod.title}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <button className="absolute top-3 right-3 p-2 bg-background/80 hover:bg-background rounded-full border border-border text-muted-foreground hover:text-rose-500 hover:scale-105 active:scale-95 transition-all shadow-sm">
                    <Heart size={14} />
                  </button>
                </div>

                {/* Detalles */}
                <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-bold text-primary uppercase tracking-wider">{prod.category}</span>
                    <h3 className="font-bold text-foreground text-sm mt-1 group-hover:text-primary transition-colors">
                      {prod.title}
                    </h3>
                    
                    {/* Estrellas / Opiniones */}
                    <div className="flex items-center gap-1.5 mt-2">
                      <div className="flex items-center gap-0.5 text-amber-500">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={12} fill={i < Math.floor(prod.rating) ? "currentColor" : "none"} className="stroke-current" />
                        ))}
                      </div>
                      <span className="text-[10px] text-muted-foreground font-medium">({prod.reviews} valoraciones)</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <div className="flex flex-col">
                      {prod.discount > 0 ? (
                        <>
                          <span className="text-xs text-muted-foreground line-through">
                            {prod.price.toFixed(2)}€
                          </span>
                          <span className="text-base font-black text-foreground">
                            {(prod.price * (1 - prod.discount / 100)).toFixed(2)}€
                          </span>
                        </>
                      ) : (
                        <span className="text-base font-black text-foreground">
                          {prod.price.toFixed(2)}€
                        </span>
                      )}
                    </div>

                    <button className="p-3 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl transition-all active:scale-95 shadow-md flex items-center justify-center">
                      <ShoppingCart size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. TRUST FACTOR BAR */}
      <section className="bg-background py-10 border-t border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center sm:text-left">
          {[
            { label: "Envíos en 24h", desc: "Entrega express gratis desde 40€.", icon: <Sparkles size={20} className="text-primary" /> },
            { label: "Devolución Fácil", desc: "Dispones de 14 días sin preguntas.", icon: <ShieldCheck size={20} className="text-primary" /> },
            { label: "Pago Seguro", desc: "Integración Stripe y encriptación 3D Secure.", icon: <ShieldCheck size={20} className="text-primary" /> }
          ].map((item, idx) => (
            <div key={idx} className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-4 border border-border/50 rounded-2xl bg-muted/5">
              <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0 border border-border">
                {item.icon}
              </div>
              <div>
                <h4 className="font-bold text-sm text-foreground">{item.label}</h4>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
