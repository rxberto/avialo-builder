-- AlterTable: campos de la tienda Medusa por usuario (ecommerce)
ALTER TABLE "User" ADD COLUMN "medusaSalesChannelId" TEXT;
ALTER TABLE "User" ADD COLUMN "medusaPublishableKey" TEXT;
