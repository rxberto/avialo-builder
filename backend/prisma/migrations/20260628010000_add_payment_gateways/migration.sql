-- Pasarela de pago activa por tenant + configuración de Redsys (TPV español).
-- El secreto de Redsys (clave SHA-256) se guarda CIFRADO (AES-256-GCM), nunca en claro.
ALTER TABLE "User" ADD COLUMN "paymentProvider" TEXT NOT NULL DEFAULT 'none';
ALTER TABLE "User" ADD COLUMN "redsysMerchantCode" TEXT;
ALTER TABLE "User" ADD COLUMN "redsysTerminal" TEXT;
ALTER TABLE "User" ADD COLUMN "redsysEnvironment" TEXT;
ALTER TABLE "User" ADD COLUMN "redsysSecretKeyEnc" TEXT;
