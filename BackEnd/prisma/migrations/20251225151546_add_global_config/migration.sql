-- CreateTable
CREATE TABLE IF NOT EXISTS "global_config" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "configLLM" TEXT,
    "configLLMKey" TEXT,
    "configVideoAI" TEXT,
    "configVideoAIKey" TEXT,
    "configTTS" TEXT,
    "configTTSKey" TEXT,
    "configImageGen" TEXT,
    "configImageGenKey" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

