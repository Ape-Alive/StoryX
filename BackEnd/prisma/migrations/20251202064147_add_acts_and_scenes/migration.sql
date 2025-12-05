-- CreateTable
CREATE TABLE "Act" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scriptTaskId" TEXT NOT NULL,
    "novelId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "actName" TEXT NOT NULL,
    "content" TEXT,
    "highlight" TEXT,
    "emotionalCurve" TEXT,
    "rhythm" TEXT,
    "chapterIds" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Act_scriptTaskId_fkey" FOREIGN KEY ("scriptTaskId") REFERENCES "ScriptTask" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Act_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Act_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Act_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Scene" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actId" TEXT NOT NULL,
    "novelId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "sceneDescription" TEXT,
    "sceneImage" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Scene_actId_fkey" FOREIGN KEY ("actId") REFERENCES "Act" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Scene_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Scene_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Scene_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Act_scriptTaskId_idx" ON "Act"("scriptTaskId");

-- CreateIndex
CREATE INDEX "Act_novelId_idx" ON "Act"("novelId");

-- CreateIndex
CREATE INDEX "Act_projectId_idx" ON "Act"("projectId");

-- CreateIndex
CREATE INDEX "Act_userId_idx" ON "Act"("userId");

-- CreateIndex
CREATE INDEX "Act_order_idx" ON "Act"("order");

-- CreateIndex
CREATE INDEX "Scene_actId_idx" ON "Scene"("actId");

-- CreateIndex
CREATE INDEX "Scene_novelId_idx" ON "Scene"("novelId");

-- CreateIndex
CREATE INDEX "Scene_projectId_idx" ON "Scene"("projectId");

-- CreateIndex
CREATE INDEX "Scene_userId_idx" ON "Scene"("userId");

-- CreateIndex
CREATE INDEX "Scene_order_idx" ON "Scene"("order");
