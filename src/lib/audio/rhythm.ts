// Analyse de placement rythmique.
//
// N'a de sens QUE si la latence aller-retour est connue : entre le clic émis et
// l'attaque captée, il s'écoule 20 à 300 ms selon l'appareil. Sans cette
// mesure, un écart affiché ne dit rien du jeu.
//
// Ce module rend des mesures BRUTES, avec leur incertitude. Pas de note, pas de
// pourcentage de régularité, pas de score : ces chiffres-là ont l'air de dire
// quelque chose et n'en disent rien.

export interface RhythmSample {
  /** Instant de l'attaque, corrigé de la latence, en secondes. */
  at: number;
  /** Temps attendu le plus proche. */
  expected: number;
  /** Écart en millisecondes : négatif = en avance, positif = en retard. */
  offsetMs: number;
}

export interface RhythmAnalysis {
  samples: RhythmSample[];
  /** Écart médian : le biais systématique, devant ou derrière le temps. */
  medianOffsetMs: number;
  /** Dispersion (écart médian absolu × 2) : la régularité, pas la justesse. */
  spreadMs: number;
  /** Attaques retenues, et temps proposés. */
  detected: number;
  expected: number;
  /**
   * Incertitude héritée de la calibration. Un écart plus petit qu'elle n'est
   * pas interprétable, et doit être présenté comme tel.
   */
  uncertaintyMs: number;
}

/**
 * Au-delà de cette fraction d'un temps, l'attaque n'est pas rattachée.
 *
 * Un quart de temps, et non la moitié : à la moitié, TOUTE attaque tombe dans
 * la fenêtre d'un temps ou d'un autre, et une note jouée sur le contretemps
 * serait comptée comme un temps très en retard — ce qui fausserait à la fois le
 * biais et la dispersion. Un quart de temps correspond à une double croche :
 * au-delà, ce n'est plus une tentative de jouer sur le temps.
 */
const MAX_FRACTION = 0.25;

/**
 * Rattache chaque attaque au temps le plus proche et mesure l'écart.
 *
 * `latencyMs` est retranché des instants captés : c'est le trajet
 * haut-parleur → air → micro → tampon, qui n'a rien à voir avec le jeu.
 */
export function analyseRhythm(
  onsetsSec: number[],
  beatsSec: number[],
  { latencyMs, uncertaintyMs = 0 }: { latencyMs: number; uncertaintyMs?: number },
): RhythmAnalysis {
  const beatPeriod =
    beatsSec.length > 1 ? beatsSec[1] - beatsSec[0] : Number.POSITIVE_INFINITY;
  const tolerance = beatPeriod * MAX_FRACTION;

  const samples: RhythmSample[] = [];
  const utilises = new Set<number>();

  for (const brut of onsetsSec) {
    const at = brut - latencyMs / 1000;
    let meilleur = -1;
    let ecart = Infinity;
    beatsSec.forEach((b, i) => {
      const d = Math.abs(at - b);
      // Un temps ne reçoit qu'une attaque : deux notes sur le même temps
      // seraient comptées comme deux placements, ce qu'elles ne sont pas.
      if (d < ecart && !utilises.has(i)) {
        ecart = d;
        meilleur = i;
      }
    });
    if (meilleur < 0 || ecart > tolerance) continue;
    utilises.add(meilleur);
    samples.push({ at, expected: beatsSec[meilleur], offsetMs: (at - beatsSec[meilleur]) * 1000 });
  }

  samples.sort((a, b) => a.at - b.at);
  const ecarts = samples.map((s) => s.offsetMs).sort((a, b) => a - b);
  const median = ecarts.length ? ecarts[Math.floor(ecarts.length / 2)] : 0;
  const absolus = ecarts.map((e) => Math.abs(e - median)).sort((a, b) => a - b);
  const spread = absolus.length ? absolus[Math.floor(absolus.length / 2)] * 2 : 0;

  return {
    samples,
    medianOffsetMs: median,
    spreadMs: spread,
    detected: samples.length,
    expected: beatsSec.length,
    uncertaintyMs,
  };
}

/**
 * Un résultat est-il interprétable ? Trop peu d'attaques, ou un écart plus
 * petit que l'incertitude de mesure, et il ne faut rien conclure.
 */
export const MIN_SAMPLES = 8;

export function isInterpretable(a: RhythmAnalysis): boolean {
  return a.detected >= MIN_SAMPLES;
}

/** Le biais mesuré dépasse-t-il l'incertitude ? Sinon, il n'est pas lisible. */
export function biasIsMeaningful(a: RhythmAnalysis): boolean {
  return Math.abs(a.medianOffsetMs) > a.uncertaintyMs;
}
