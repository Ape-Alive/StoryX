-- CreateTable
CREATE TABLE "Shot" (
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
    "characterIds" TEXT,
    "metadata" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Shot_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "Scene" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Shot_actId_fkey" FOREIGN KEY ("actId") REFERENCES "Act" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Shot_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Shot_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Shot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Shot_sceneId_idx" ON "Shot"("sceneId");

-- CreateIndex
CREATE INDEX "Shot_actId_idx" ON "Shot"("actId");

-- CreateIndex
CREATE INDEX "Shot_novelId_idx" ON "Shot"("novelId");

-- CreateIndex
CREATE INDEX "Shot_projectId_idx" ON "Shot"("projectId");

-- CreateIndex
CREATE INDEX "Shot_userId_idx" ON "Shot"("userId");

-- CreateIndex
CREATE INDEX "Shot_order_idx" ON "Shot"("order");

-- CreateIndex
CREATE INDEX "Shot_actId_order_idx" ON "Shot"("actId", "order");
