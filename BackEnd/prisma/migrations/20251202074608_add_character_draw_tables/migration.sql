-- CreateTable
CREATE TABLE "CharacterDrawTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "projectId" TEXT,
    "characterIds" TEXT NOT NULL,
    "drawType" TEXT NOT NULL DEFAULT 'image',
    "modelId" TEXT,
    "config" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "totalCount" INTEGER NOT NULL DEFAULT 0,
    "completedCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CharacterDrawTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CharacterDrawTask_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CharacterDrawResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT,
    "resultType" TEXT NOT NULL,
    "fileUrl" TEXT,
    "filePath" TEXT,
    "thumbnailUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "metadata" TEXT,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CharacterDrawResult_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "CharacterDrawTask" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CharacterDrawResult_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CharacterDrawResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CharacterDrawResult_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "CharacterDrawTask_userId_idx" ON "CharacterDrawTask"("userId");

-- CreateIndex
CREATE INDEX "CharacterDrawTask_projectId_idx" ON "CharacterDrawTask"("projectId");

-- CreateIndex
CREATE INDEX "CharacterDrawTask_status_idx" ON "CharacterDrawTask"("status");

-- CreateIndex
CREATE INDEX "CharacterDrawTask_userId_status_idx" ON "CharacterDrawTask"("userId", "status");

-- CreateIndex
CREATE INDEX "CharacterDrawResult_taskId_idx" ON "CharacterDrawResult"("taskId");

-- CreateIndex
CREATE INDEX "CharacterDrawResult_characterId_idx" ON "CharacterDrawResult"("characterId");

-- CreateIndex
CREATE INDEX "CharacterDrawResult_userId_idx" ON "CharacterDrawResult"("userId");

-- CreateIndex
CREATE INDEX "CharacterDrawResult_status_idx" ON "CharacterDrawResult"("status");

-- CreateIndex
CREATE INDEX "CharacterDrawResult_taskId_status_idx" ON "CharacterDrawResult"("taskId", "status");
