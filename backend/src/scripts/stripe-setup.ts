// ============================================
// Script idempotente: crea/recupera los productos y precios de Avialo en Stripe.
// Uso:  npm run stripe:setup
// Requiere STRIPE_SECRET_KEY en el .env (usa una clave de TEST mientras desarrollas).
// Imprime las líneas STRIPE_PRICE_* para pegar en el .env.
// ============================================
import "../config/env.js"; // carga el .env del root como efecto colateral
import Stripe from "stripe";
import {
  PLAN_LOOKUP_KEYS,
  PLAN_MONTHLY_AMOUNT,
  PLAN_PRODUCT_NAME,
} from "../config/stripe.js";

const PLAN_ENV_NAME: Record<string, string> = {
  corporativa: "STRIPE_PRICE_CORPORATIVA",
  dinamica: "STRIPE_PRICE_DINAMICA",
  ecommerce: "STRIPE_PRICE_ECOMMERCE",
};

async function main(): Promise<void> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key === "sk_test_...") {
    console.error("❌ STRIPE_SECRET_KEY no configurada. Añádela al .env (usa una clave de TEST).");
    process.exit(1);
  }
  const stripe = new Stripe(key);
  const mode = key.startsWith("sk_live_") || key.startsWith("rk_live_") ? "LIVE" : "TEST";
  console.log(`\n🔧 Configurando productos/precios de Avialo en Stripe (modo ${mode})...\n`);

  const out: string[] = [];

  for (const plan of Object.keys(PLAN_LOOKUP_KEYS)) {
    const lookupKey = PLAN_LOOKUP_KEYS[plan];
    const amount = PLAN_MONTHLY_AMOUNT[plan];
    const productName = PLAN_PRODUCT_NAME[plan];

    // 1) ¿Existe ya un precio con este lookup_key? (idempotencia)
    const existing = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
    let price = existing.data[0];

    if (price && price.unit_amount === amount && price.recurring?.interval === "month") {
      console.log(`✓ ${plan}: precio ya existe (${price.id}) — reutilizado.`);
    } else {
      // 2) Reutilizar producto del precio previo o crear uno nuevo.
      let productId =
        price && typeof price.product === "string" ? price.product : undefined;
      if (!productId) {
        const product = await stripe.products.create({
          name: productName,
          metadata: { avialo_plan: plan },
        });
        productId = product.id;
        console.log(`＋ ${plan}: producto creado (${productId}).`);
      }

      // 3) Crear el precio recurrente mensual en EUR y moverle el lookup_key.
      price = await stripe.prices.create({
        product: productId,
        currency: "eur",
        unit_amount: amount,
        recurring: { interval: "month" },
        lookup_key: lookupKey,
        transfer_lookup_key: true,
        metadata: { avialo_plan: plan },
      });
      console.log(`＋ ${plan}: precio creado (${price.id}, ${(amount / 100).toFixed(2)}€/mes).`);
    }

    out.push(`${PLAN_ENV_NAME[plan]}=${price.id}`);
  }

  console.log(`\n✅ Listo. Pega estas líneas en tu .env (${mode}):\n`);
  console.log(out.join("\n"));
  console.log("");
}

main().catch((err) => {
  console.error("❌ Error en stripe:setup:", err?.message || err);
  process.exit(1);
});
