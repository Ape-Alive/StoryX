/*
  Warnings:

  - You are about to drop the column `characterIds` on the `Shot` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Shot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sceneId" TEXT,
    "actId" TEXT NOT NULL,
    "novelId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "shotId" INTEGER NOT NULL,
    "duration" INTEGER,
    "shotType" TEXT,
    "framing" TEXT,
    "cameraAngle" TEXT,
    "cameraMovement" TEXT,
    "characterAction" TEXT,
    "expression" TEXT,
    "dialogue" TEXT,
    "voiceover" TEXT,
    "lighting" TEXT,
    "atmosphere" TEXT,
    "bgm" TEXT,
    "fx" TEXT,
    "isTransition" BOOLEAN NOT NULL DEFAULT false,
    "characterList" TEXT,
    "metadata" TEXT,
    "videoUrl" TEXT,
    "videoPath" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Shot_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "Scene" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Shot_actId_fkey" FOREIGN KEY ("actId") REFERENCES "Act" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Shot_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Shot_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Shot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Shot" ("actId", "atmosphere", "bgm", "cameraAngle", "cameraMovement", "characterAction", "createdAt", "dialogue", "duration", "expression", "framing", "fx", "id", "isTransition", "lighting", "metadata", "novelId", "order", "projectId", "sceneId", "shotId", "shotType", "updatedAt", "userId", "videoPath", "videoUrl", "voiceover") SELECT "actId", "atmosphere", "bgm", "cameraAngle", "cameraMovement", "characterAction", "createdAt", "dialogue", "duration", "expression", "framing", "fx", "id", "isTransition", "lighting", "metadata", "novelId", "order", "projectId", "sceneId", "shotId", "shotType", "updatedAt", "userId", "videoPath", "videoUrl", "voiceover" FROM "Shot";
DROP TABLE "Shot";
ALTER TABLE "new_Shot" RENAME TO "Shot";
CREATE INDEX "Shot_sceneId_idx" ON "Shot"("sceneId");
CREATE INDEX "Shot_actId_idx" ON "Shot"("actId");
CREATE INDEX "Shot_novelId_idx" ON "Shot"("novelId");
CREATE INDEX "Shot_projectId_idx" ON "Shot"("projectId");
CREATE INDEX "Shot_userId_idx" ON "Shot"("userId");
CREATE INDEX "Shot_order_idx" ON "Shot"("order");
CREATE INDEX "Shot_actId_order_idx" ON "Shot"("actId", "order");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
