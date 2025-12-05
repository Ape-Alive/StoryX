/*
  Warnings:

  - You are about to drop the `CharacterDrawResult` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `characterIds` on the `CharacterDrawTask` table. All the data in the column will be lost.
  - You are about to drop the column `completedCount` on the `CharacterDrawTask` table. All the data in the column will be lost.
  - You are about to drop the column `config` on the `CharacterDrawTask` table. All the data in the column will be lost.
  - You are about to drop the column `failedCount` on the `CharacterDrawTask` table. All the data in the column will be lost.
  - You are about to drop the column `totalCount` on the `CharacterDrawTask` table. All the data in the column will be lost.
  - Added the required column `characterId` to the `CharacterDrawTask` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "CharacterDrawResult_taskId_status_idx";

-- DropIndex
DROP INDEX "CharacterDrawResult_status_idx";

-- DropIndex
DROP INDEX "CharacterDrawResult_userId_idx";

-- DropIndex
DROP INDEX "CharacterDrawResult_characterId_idx";

-- DropIndex
DROP INDEX "CharacterDrawResult_taskId_idx";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "CharacterDrawResult";
PRAGMA foreign_keys=on;

-- 由于表结构变化较大（从多个角色到一个角色），先删除旧数据
-- 如果需要保留数据，需要手动处理 characterIds 数组到单个 characterId 的映射
DELETE FROM "CharacterDrawTask";

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CharacterDrawTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "projectId" TEXT,
    "characterId" TEXT NOT NULL,
    "drawType" TEXT NOT NULL DEFAULT 'image',
    "modelId" TEXT,
    "apiConfig" TEXT,
    "storageMode" TEXT NOT NULL DEFAULT 'download_upload',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "result" TEXT,
    "errorMessage" TEXT,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CharacterDrawTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CharacterDrawTask_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CharacterDrawTask_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
DROP TABLE "CharacterDrawTask";
ALTER TABLE "new_CharacterDrawTask" RENAME TO "CharacterDrawTask";
CREATE INDEX "CharacterDrawTask_userId_idx" ON "CharacterDrawTask"("userId");
CREATE INDEX "CharacterDrawTask_projectId_idx" ON "CharacterDrawTask"("projectId");
CREATE INDEX "CharacterDrawTask_characterId_idx" ON "CharacterDrawTask"("characterId");
CREATE INDEX "CharacterDrawTask_status_idx" ON "CharacterDrawTask"("status");
CREATE INDEX "CharacterDrawTask_userId_status_idx" ON "CharacterDrawTask"("userId", "status");
CREATE INDEX "CharacterDrawTask_characterId_status_idx" ON "CharacterDrawTask"("characterId", "status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
