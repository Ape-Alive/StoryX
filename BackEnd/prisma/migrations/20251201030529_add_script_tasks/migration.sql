-- CreateTable
CREATE TABLE "ScriptTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "novelId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "taskType" TEXT NOT NULL DEFAULT 'by_chapters',
    "chapterIds" TEXT NOT NULL,
    "chapterRange" TEXT,
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "result" TEXT,
    "errorMessage" TEXT,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ScriptTask_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ScriptTask_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ScriptTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ScriptTask_novelId_idx" ON "ScriptTask"("novelId");

-- CreateIndex
CREATE INDEX "ScriptTask_projectId_idx" ON "ScriptTask"("projectId");

-- CreateIndex
CREATE INDEX "ScriptTask_userId_idx" ON "ScriptTask"("userId");

-- CreateIndex
CREATE INDEX "ScriptTask_status_idx" ON "ScriptTask"("status");

-- CreateIndex
CREATE INDEX "ScriptTask_novelId_status_idx" ON "ScriptTask"("novelId", "status");
