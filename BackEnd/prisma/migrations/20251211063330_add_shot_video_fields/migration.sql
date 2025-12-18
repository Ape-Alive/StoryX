-- AlterTable
ALTER TABLE "Shot" ADD COLUMN "videoPath" TEXT;
ALTER TABLE "Shot" ADD COLUMN "videoUrl" TEXT;

-- CreateTable
CREATE TABLE "FeaturePrompt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "systemPromptId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "functionType" TEXT NOT NULL,
    "referenceWorks" TEXT,
    "referenceLinks" TEXT,
    "prompt" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FeaturePrompt_systemPromptId_fkey" FOREIGN KEY ("systemPromptId") REFERENCES "SystemPrompt" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "FeaturePrompt_systemPromptId_idx" ON "FeaturePrompt"("systemPromptId");

-- CreateIndex
CREATE INDEX "FeaturePrompt_functionType_idx" ON "FeaturePrompt"("functionType");
