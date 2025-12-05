-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Character" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "projectId" TEXT,
    "novelId" TEXT,
    "taskId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "age" TEXT,
    "gender" TEXT,
    "personality" TEXT,
    "appearance" TEXT,
    "background" TEXT,
    "style" TEXT,
    "imageUrl" TEXT,
    "modelUrl" TEXT,
    "shotIds" TEXT,
    "cached" BOOLEAN NOT NULL DEFAULT false,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Character_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Character_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Character_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Character" ("age", "appearance", "cached", "createdAt", "description", "gender", "id", "imageUrl", "modelUrl", "name", "personality", "projectId", "style", "updatedAt", "usageCount", "userId") SELECT "age", "appearance", "cached", "createdAt", "description", "gender", "id", "imageUrl", "modelUrl", "name", "personality", "projectId", "style", "updatedAt", "usageCount", "userId" FROM "Character";
DROP TABLE "Character";
ALTER TABLE "new_Character" RENAME TO "Character";
CREATE INDEX "Character_userId_name_idx" ON "Character"("userId", "name");
CREATE INDEX "Character_projectId_idx" ON "Character"("projectId");
CREATE INDEX "Character_novelId_idx" ON "Character"("novelId");
CREATE INDEX "Character_taskId_idx" ON "Character"("taskId");
CREATE INDEX "Character_cached_idx" ON "Character"("cached");
CREATE UNIQUE INDEX "Character_userId_name_projectId_key" ON "Character"("userId", "name", "projectId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
