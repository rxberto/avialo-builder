-- CreateTable
CREATE TABLE "JobUsage" (
    "id" SERIAL NOT NULL,
    "jobId" TEXT NOT NULL,
    "userId" INTEGER,
    "kind" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL,
    "outputTokens" INTEGER NOT NULL,
    "costUsd" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JobUsage_jobId_idx" ON "JobUsage"("jobId");

-- CreateIndex
CREATE INDEX "JobUsage_userId_idx" ON "JobUsage"("userId");
