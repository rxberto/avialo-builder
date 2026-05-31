import Stripe from "stripe";

// Instancia única de Stripe, compartida por la API y el panel admin.
// Es null si no hay clave configurada (los call sites deben contemplarlo).
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

export const stripe =
  stripeSecretKey && stripeSecretKey !== "sk_test_..."
    ? new Stripe(stripeSecretKey, { apiVersion: "2024-04-10" as any })
    : null;
