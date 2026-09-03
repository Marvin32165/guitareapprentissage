import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db/prisma";

// Retour rédigé sur une séance de travail.
//
// TROIS RÈGLES, POSÉES PAR L'UTILISATEUR ET APPLIQUÉES ICI :
//
//  1. AUCUN AUDIO. Ce point de terminaison ne reçoit que des NOMBRES, déjà
//     calculés côté navigateur. Le signal du micro n'a jamais quitté
//     l'appareil, et il est jeté dès les mesures extraites.
//  2. PAS DE SCORE GLOBAL. Ni note, ni pourcentage de progression, ni
//     « niveau ». Ces chiffres-là ont l'air de dire quelque chose et n'en
//     disent rien.
//  3. HONNÊTE SUR LES LIMITES. Ce qui n'a pas été mesuré doit être annoncé
//     comme non mesuré, pas passé sous silence.
//
// Le modèle : le cahier des charges indiquait claude-sonnet-4-6. On utilise
// claude-sonnet-5, de la même famille — plus récent, plus capable, et moins
// cher (2 $/10 $ par million de jetons contre 3 $/15 $).
const MODEL = "claude-sonnet-5";

const SYSTEM = `Tu écris un court retour à un guitariste autodidacte de niveau intermédiaire, qui joue depuis des années mais n'a aucun vocabulaire théorique formel.

Ton : direct, concret, en français. Tutoiement. Pas de flatterie, pas d'encouragement creux.

RÈGLES ABSOLUES :
- Aucune note, aucun score, aucun pourcentage de progression, aucun « niveau ». Ces chiffres-là mélangent des choses incomparables.
- Commente UNIQUEMENT ce qui figure dans les mesures fournies. Si une chose n'a pas été mesurée, tu peux dire qu'elle ne l'a pas été, mais tu n'inventes rien à son sujet.
- Ne commente jamais le son, le toucher ou la musicalité : rien de tout cela n'est mesurable par un micro de téléphone, et le prétendre serait mentir.
- Une mesure assortie d'une incertitude plus grande qu'elle-même ne veut rien dire : dis-le plutôt que de l'interpréter.
- Trois à cinq phrases. Une seule suggestion concrète pour la prochaine séance, tirée des mesures.

N'utilise pas de listes à puces ni de titres : du texte suivi.`;

interface Corps {
  durationSec?: number;
  kind?: string;
  metrics?: Record<string, unknown>;
}

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      {
        ok: false,
        reason: "no-api-key",
        error:
          "Aucune clé ANTHROPIC_API_KEY configurée : le retour rédigé est indisponible. Les mesures restent affichées telles quelles.",
      },
      { status: 503 },
    );
  }

  let corps: Corps = {};
  try {
    corps = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Requête illisible." }, { status: 400 });
  }

  const metrics = corps.metrics;
  if (!metrics || typeof metrics !== "object" || Object.keys(metrics).length === 0) {
    return NextResponse.json(
      { ok: false, error: "Aucune mesure à commenter." },
      { status: 400 },
    );
  }

  // Ceinture et bretelles : rien qui ressemble à de l'audio ne doit passer.
  // Le contrat est « des nombres, rien d'autre » ; on le fait respecter ici
  // plutôt que de compter sur l'appelant.
  const suspect = JSON.stringify(metrics).length > 4000;
  if (suspect) {
    return NextResponse.json(
      { ok: false, error: "Charge inattendue : seules des mesures sont acceptées." },
      { status: 400 },
    );
  }

  const client = new Anthropic();
  let feedback: string;
  try {
    const reponse = await client.messages.create({
      model: MODEL,
      max_tokens: 1000,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `Voici les mesures d'une séance de travail, en JSON. Écris le retour.\n\n${JSON.stringify(metrics, null, 2)}`,
        },
      ],
    });
    feedback = reponse.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    if (!feedback) throw new Error("réponse vide");
  } catch (error) {
    const raison =
      error instanceof Anthropic.RateLimitError
        ? "Trop de demandes : réessaie dans un moment."
        : error instanceof Anthropic.AuthenticationError
          ? "Clé API refusée."
          : "Le retour rédigé n'a pas pu être produit.";
    return NextResponse.json({ ok: false, error: raison }, { status: 502 });
  }

  // Persistance : les mesures et le texte, rien d'autre.
  let persisted = false;
  try {
    await prisma.practiceSession.create({
      data: {
        kind: typeof corps.kind === "string" ? corps.kind.slice(0, 40) : "technique",
        durationSec:
          typeof corps.durationSec === "number" && Number.isFinite(corps.durationSec)
            ? Math.max(0, Math.round(corps.durationSec))
            : 0,
        endedAt: new Date(),
        metrics: JSON.stringify(metrics),
        feedback,
      },
    });
    persisted = true;
  } catch {
    /* sans base, le retour reste affiché mais n'est pas conservé */
  }

  return NextResponse.json({ ok: true, persisted, feedback });
}
