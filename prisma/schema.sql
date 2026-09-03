-- Schéma complet de guitareapprentissage (toutes les migrations concaténées).
-- À coller tel quel dans la console SQL Turso, ou :
--   turso db shell <base> < prisma/schema.sql
-- Généré depuis prisma/migrations/ — ne pas éditer à la main.

-- ─────────────────────────────────────────────────────────
-- 20260902141330_init
-- ─────────────────────────────────────────────────────────
-- CreateTable
CREATE TABLE "LessonProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lessonId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "completedAt" DATETIME,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ReviewItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conceptId" TEXT NOT NULL,
    "easeFactor" REAL NOT NULL DEFAULT 2.5,
    "intervalDays" INTEGER NOT NULL DEFAULT 0,
    "repetitions" INTEGER NOT NULL DEFAULT 0,
    "dueDate" DATETIME NOT NULL,
    "lastReviewed" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "EarStat" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "exercise" TEXT NOT NULL,
    "subtype" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "correct" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ExerciseSetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "exerciseId" TEXT NOT NULL,
    "targetBpm" INTEGER NOT NULL,
    "currentBpm" INTEGER NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TempoRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "exerciseId" TEXT NOT NULL,
    "bpm" INTEGER NOT NULL,
    "achievedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "PracticeSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" DATETIME,
    "durationSec" INTEGER NOT NULL DEFAULT 0,
    "kind" TEXT,
    -- Mesures brutes et retour rédigé. Aucun audio n'est stocké.
    "metrics" TEXT,
    "feedback" TEXT
);

-- CreateTable
CREATE TABLE "DailyStat" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" TEXT NOT NULL,
    "practiceSec" INTEGER NOT NULL DEFAULT 0,
    "lessonsDone" INTEGER NOT NULL DEFAULT 0,
    "earAttempts" INTEGER NOT NULL DEFAULT 0,
    "earCorrect" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "RepertoireSong" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "artist" TEXT,
    "songKey" TEXT,
    "status" TEXT NOT NULL DEFAULT 'learning',
    "targetBpm" INTEGER,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "LessonProgress_lessonId_key" ON "LessonProgress"("lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewItem_conceptId_key" ON "ReviewItem"("conceptId");

-- CreateIndex
CREATE INDEX "ReviewItem_dueDate_idx" ON "ReviewItem"("dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "EarStat_exercise_subtype_key" ON "EarStat"("exercise", "subtype");

-- CreateIndex
CREATE UNIQUE INDEX "ExerciseSetting_exerciseId_key" ON "ExerciseSetting"("exerciseId");

-- CreateIndex
CREATE INDEX "TempoRecord_exerciseId_idx" ON "TempoRecord"("exerciseId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyStat_date_key" ON "DailyStat"("date");

-- ─────────────────────────────────────────────────────────
-- 20260902143855_practice_event_log
-- ─────────────────────────────────────────────────────────
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

