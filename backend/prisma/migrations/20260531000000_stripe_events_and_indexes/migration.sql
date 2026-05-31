-- CreateTable
CREATE TABLE "StripeEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StripeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "User_siteJobId_idx" ON "User"("siteJobId");

-- CreateIndex
CREATE INDEX "User_creditsResetDate_idx" ON "User"("creditsResetDate");
