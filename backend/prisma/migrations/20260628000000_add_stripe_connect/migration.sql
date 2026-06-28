-- Stripe Connect por tenant: cobros de la tienda del cliente enrutados a SU cuenta Stripe.
-- Avialo es la plataforma; NO guardamos claves secretas del cliente (Stripe las custodia).
ALTER TABLE "User" ADD COLUMN "stripeConnectAccountId" TEXT;
ALTER TABLE "User" ADD COLUMN "stripeConnectChargesEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "stripeConnectPayoutsEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "stripeConnectDetailsSubmitted" BOOLEAN NOT NULL DEFAULT false;

-- Único: cada cuenta conectada pertenece a un solo tenant.
CREATE UNIQUE INDEX "User_stripeConnectAccountId_key" ON "User"("stripeConnectAccountId");
