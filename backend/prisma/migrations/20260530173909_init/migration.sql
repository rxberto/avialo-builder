-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "profession" TEXT,
    "role" TEXT,
    "plan" TEXT NOT NULL DEFAULT 'none',
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "siteName" TEXT,
    "siteType" TEXT,
    "siteDomain" TEXT,
    "siteJobId" TEXT,
    "siteStatus" TEXT NOT NULL DEFAULT 'none',
    "aiCredits" INTEGER NOT NULL DEFAULT 50,
    "creditsResetDate" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
