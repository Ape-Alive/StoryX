-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "avatar" TEXT,
    "bio" TEXT,
    "language" TEXT NOT NULL DEFAULT 'zh-CN',
    "theme" TEXT NOT NULL DEFAULT 'light',
    "projectsCount" INTEGER NOT NULL DEFAULT 0,
    "totalVideosGenerated" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sourceText" TEXT,
    "configLLM" TEXT NOT NULL DEFAULT 'deepseek',
    "configLLMKey" TEXT,
    "configVideoAI" TEXT NOT NULL DEFAULT 'default',
    "configVideoAIKey" TEXT,
    "configTTS" TEXT NOT NULL DEFAULT 'default',
    "configTTSKey" TEXT,
    "configImageGen" TEXT NOT NULL DEFAULT 'default',
    "configImageGenKey" TEXT,
    "storageLocation" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "processedTextLanguage" TEXT,
    "processedTextScenes" TEXT,
    "processedTextCharacters" TEXT,
    "scriptScenes" TEXT,
    "storyboardShots" TEXT,
    "assetsCharacters" TEXT,
    "assetsBackgrounds" TEXT,
    "assetsAudio" TEXT,
    "outputVideoUrl" TEXT,
    "outputSubtitleUrl" TEXT,
    "outputFormat" TEXT,
    "outputResolution" TEXT,
    "outputDuration" INTEGER,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Character" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "age" INTEGER,
    "gender" TEXT,
    "personality" TEXT,
    "appearance" TEXT,
    "style" TEXT,
    "imageUrl" TEXT,
    "modelUrl" TEXT,
    "cached" BOOLEAN NOT NULL DEFAULT false,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Character_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AIProvider" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "website" TEXT,
    "logoUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AIModel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "providerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "category" TEXT,
    "baseUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "requiresKey" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AIModel_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "AIProvider" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_username_idx" ON "User"("username");

-- CreateIndex
CREATE INDEX "Project_userId_createdAt_idx" ON "Project"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Project_status_idx" ON "Project"("status");

-- CreateIndex
CREATE INDEX "Character_userId_name_idx" ON "Character"("userId", "name");

-- CreateIndex
CREATE INDEX "Character_cached_idx" ON "Character"("cached");

-- CreateIndex
CREATE UNIQUE INDEX "Character_userId_name_key" ON "Character"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "AIProvider_name_key" ON "AIProvider"("name");

-- CreateIndex
CREATE INDEX "AIProvider_isActive_idx" ON "AIProvider"("isActive");

-- CreateIndex
CREATE INDEX "AIModel_providerId_idx" ON "AIModel"("providerId");

-- CreateIndex
CREATE INDEX "AIModel_type_idx" ON "AIModel"("type");

-- CreateIndex
CREATE INDEX "AIModel_isActive_idx" ON "AIModel"("isActive");

-- CreateIndex
CREATE INDEX "AIModel_type_isActive_idx" ON "AIModel"("type", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "AIModel_providerId_name_key" ON "AIModel"("providerId", "name");
