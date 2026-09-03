-- Analyse de séance : mesures brutes et retour rédigé.
-- Aucun audio n'est stocké : le micro sert au calcul, le signal est jeté.
ALTER TABLE "PracticeSession" ADD COLUMN "metrics" TEXT;
ALTER TABLE "PracticeSession" ADD COLUMN "feedback" TEXT;
