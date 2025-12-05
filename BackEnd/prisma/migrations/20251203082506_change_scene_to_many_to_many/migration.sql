/*
  Warnings:

  - You are about to drop the column `actId` on the `Scene` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "ActScene" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actId" TEXT NOT NULL,
    "sceneId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActScene_actId_fkey" FOREIGN KEY ("actId") REFERENCES "Act" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ActScene_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "Scene" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 迁移现有数据：将 Scene 的 actId 转换为 ActScene 关联
INSERT INTO "ActScene" ("id", "actId", "sceneId", "order", "createdAt")
SELECT
    lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-' || hex(randomblob(2)) || '-' || hex(randomblob(2)) || '-' || hex(randomblob(6))) as id,
    "actId",
    "id" as sceneId,
    "order",
    "createdAt"
FROM "Scene"
WHERE "actId" IS NOT NULL;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Scene" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "novelId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "sceneDescription" TEXT,
    "sceneImage" TEXT,
    "shotIds" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Scene_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Scene_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Scene_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Scene" ("address", "createdAt", "id", "novelId", "order", "projectId", "sceneDescription", "sceneImage", "shotIds", "updatedAt", "userId") SELECT "address", "createdAt", "id", "novelId", "order", "projectId", "sceneDescription", "sceneImage", "shotIds", "updatedAt", "userId" FROM "Scene";
DROP TABLE "Scene";
ALTER TABLE "new_Scene" RENAME TO "Scene";
CREATE INDEX "Scene_novelId_idx" ON "Scene"("novelId");
CREATE INDEX "Scene_projectId_idx" ON "Scene"("projectId");
CREATE INDEX "Scene_userId_idx" ON "Scene"("userId");
CREATE INDEX "Scene_address_idx" ON "Scene"("address");
CREATE INDEX "Scene_novelId_address_idx" ON "Scene"("novelId", "address");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ActScene_actId_idx" ON "ActScene"("actId");

-- CreateIndex
CREATE INDEX "ActScene_sceneId_idx" ON "ActScene"("sceneId");

-- CreateIndex
CREATE INDEX "ActScene_actId_order_idx" ON "ActScene"("actId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "ActScene_actId_sceneId_key" ON "ActScene"("actId", "sceneId");
