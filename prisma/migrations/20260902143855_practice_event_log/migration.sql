-- CreateTable
CREATE TABLE "PracticeEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "refId" TEXT NOT NULL,
    "correct" BOOLEAN,
    "quality" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "PracticeEvent_type_createdAt_idx" ON "PracticeEvent"("type", "createdAt");

-- CreateIndex
CREATE INDEX "PracticeEvent_createdAt_idx" ON "PracticeEvent"("createdAt");
