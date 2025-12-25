-- CreateTable
CREATE TABLE "ScriptTaskBatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "taskName" TEXT NOT NULL,
    "novelId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "totalTasks" INTEGER NOT NULL DEFAULT 0,
    "completedTasks" INTEGER NOT NULL DEFAULT 0,
    "failedTasks" INTEGER NOT NULL DEFAULT 0,
    "config" TEXT,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ScriptTaskBatch_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ScriptTaskBatch_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ScriptTaskBatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ScriptTaskBatch_jobId_key" ON "ScriptTaskBatch"("jobId");

-- CreateIndex
CREATE INDEX "ScriptTaskBatch_novelId_idx" ON "ScriptTaskBatch"("novelId");

-- CreateIndex
CREATE INDEX "ScriptTaskBatch_projectId_idx" ON "ScriptTaskBatch"("projectId");

-- CreateIndex
CREATE INDEX "ScriptTaskBatch_userId_idx" ON "ScriptTaskBatch"("userId");

-- CreateIndex
CREATE INDEX "ScriptTaskBatch_status_idx" ON "ScriptTaskBatch"("status");

-- CreateIndex
CREATE INDEX "ScriptTaskBatch_novelId_status_idx" ON "ScriptTaskBatch"("novelId", "status");

-- CreateIndex
CREATE INDEX "ScriptTaskBatch_createdAt_idx" ON "ScriptTaskBatch"("createdAt" DESC);

-- AlterTable
-- SQLite doesn't support adding foreign keys with ALTER TABLE, so we need to recreate the table
PRAGMA foreign_keys=OFF;
PRAGMA defer_foreign_keys=ON;

-- Add column first (without foreign key)
ALTER TABLE "ScriptTask" ADD COLUMN "batchId" TEXT;

-- CreateIndex
CREATE INDEX "ScriptTask_batchId_idx" ON "ScriptTask"("batchId");

-- Note: Foreign key constraint will be enforced by Prisma at the application level
-- SQLite foreign keys are optional and need to be enabled with PRAGMA foreign_keys=ON
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

