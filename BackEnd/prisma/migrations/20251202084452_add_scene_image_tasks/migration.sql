-- AlterTable
ALTER TABLE "Scene" ADD COLUMN "shotIds" TEXT;

-- CreateTable
CREATE TABLE "SceneImageTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sceneId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "novelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "modelId" TEXT,
    "prompt" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "imageUrl" TEXT,
    "filePath" TEXT,
    "errorMessage" TEXT,
    "metadata" TEXT,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SceneImageTask_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "Scene" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SceneImageTask_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SceneImageTask_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SceneImageTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "SceneImageTask_sceneId_idx" ON "SceneImageTask"("sceneId");

-- CreateIndex
CREATE INDEX "SceneImageTask_projectId_idx" ON "SceneImageTask"("projectId");

-- CreateIndex
CREATE INDEX "SceneImageTask_novelId_idx" ON "SceneImageTask"("novelId");

-- CreateIndex
CREATE INDEX "SceneImageTask_userId_idx" ON "SceneImageTask"("userId");

-- CreateIndex
CREATE INDEX "SceneImageTask_status_idx" ON "SceneImageTask"("status");

-- CreateIndex
CREATE INDEX "SceneImageTask_sceneId_status_idx" ON "SceneImageTask"("sceneId", "status");
