-- CreateTable
CREATE TABLE "SystemPrompt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "functionKey" TEXT NOT NULL,
    "description" TEXT,
    "prompt" TEXT NOT NULL,
    "category" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "SystemPrompt_functionKey_key" ON "SystemPrompt"("functionKey");

-- CreateIndex
CREATE INDEX "SystemPrompt_functionKey_idx" ON "SystemPrompt"("functionKey");

-- CreateIndex
CREATE INDEX "SystemPrompt_category_idx" ON "SystemPrompt"("category");

-- CreateIndex
CREATE INDEX "SystemPrompt_isActive_idx" ON "SystemPrompt"("isActive");

-- CreateIndex
CREATE INDEX "SystemPrompt_category_isActive_idx" ON "SystemPrompt"("category", "isActive");
