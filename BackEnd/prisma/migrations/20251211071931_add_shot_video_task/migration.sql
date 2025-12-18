-- CreateTable
CREATE TABLE "ShotVideoTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shotId" TEXT NOT NULL,
    "actId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "novelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "modelId" TEXT,
    "apiConfig" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "videoUrl" TEXT,
    "videoPath" TEXT,
    "errorMessage" TEXT,
    "metadata" TEXT,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ShotVideoTask_shotId_fkey" FOREIGN KEY ("shotId") REFERENCES "Shot" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ShotVideoTask_actId_fkey" FOREIGN KEY ("actId") REFERENCES "Act" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ShotVideoTask_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ShotVideoTask_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ShotVideoTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ShotVideoTask_shotId_idx" ON "ShotVideoTask"("shotId");

-- CreateIndex
CREATE INDEX "ShotVideoTask_actId_idx" ON "ShotVideoTask"("actId");

-- CreateIndex
CREATE INDEX "ShotVideoTask_projectId_idx" ON "ShotVideoTask"("projectId");

-- CreateIndex
CREATE INDEX "ShotVideoTask_novelId_idx" ON "ShotVideoTask"("novelId");

-- CreateIndex
CREATE INDEX "ShotVideoTask_userId_idx" ON "ShotVideoTask"("userId");

-- CreateIndex
CREATE INDEX "ShotVideoTask_status_idx" ON "ShotVideoTask"("status");

-- CreateIndex
CREATE INDEX "ShotVideoTask_actId_status_idx" ON "ShotVideoTask"("actId", "status");

-- CreateIndex
CREATE INDEX "ShotVideoTask_shotId_status_idx" ON "ShotVideoTask"("shotId", "status");
