// Shared helpers for configuring a Game's scoring. Relative imports only so the
// realtime server (run via tsx) can reuse these alongside the Next.js UI.

import type { ScoringMode, ValueSource } from "./quiz-types";
import { presetEscalatingValue, type ScoringConfig } from "./scoring";

export interface GameInput {
  gameId?: string;
  title: string;
  questionSetId: string;
  scoringMode: ScoringMode;
  valueSource: ValueSource;
  speedBonus: boolean;
  /** Per-question values for ESCALATING + CUSTOM (ignored otherwise). */
  customLadder: number[];
}

export type SaveGameResult = { ok: true; id: string } | { ok: false; error: string };

export const SCORING_MODE_LABELS: Record<ScoringMode, string> = {
  WEIGHTED: "Weighted per answer",
  ESCALATING: "Escalating ladder",
};

export const SCORING_MODE_HINTS: Record<ScoringMode, string> = {
  WEIGHTED: "Each answer is worth points; a correct pick scores, with an optional speed bonus.",
  ESCALATING: "Millionaire-style — every question is worth more than the last.",
};

export const VALUE_SOURCE_LABELS: Record<ValueSource, string> = {
  PRESET: "Preset",
  CUSTOM: "Custom",
};

export function valueSourceHint(mode: ScoringMode, source: ValueSource): string {
  if (source === "PRESET") {
    return mode === "ESCALATING"
      ? "Values double each question (1,000 → 2,000 → 4,000 …)."
      : "A correct answer earns the question's base points.";
  }
  return mode === "ESCALATING"
    ? "Set the exact value of each question below."
    : "Per-option points you entered while authoring each question are used.";
}

/** Default escalating values for a set with `count` questions. */
export function presetLadder(count: number): number[] {
  return Array.from({ length: count }, (_, i) => presetEscalatingValue(i + 1));
}

export interface ParsedGameConfig {
  customLadder: number[] | null;
}

export function parseGameConfig(raw: string | null | undefined): ParsedGameConfig {
  if (!raw) return { customLadder: null };
  try {
    const value = JSON.parse(raw) as { customLadder?: unknown };
    if (Array.isArray(value.customLadder)) {
      const ladder = value.customLadder
        .map((n) => Number(n))
        .filter((n) => Number.isFinite(n));
      return { customLadder: ladder.length ? ladder : null };
    }
  } catch {
    // fall through
  }
  return { customLadder: null };
}

export function serializeGameConfig(input: {
  scoringMode: ScoringMode;
  valueSource: ValueSource;
  customLadder: number[];
}): string | null {
  if (input.scoringMode === "ESCALATING" && input.valueSource === "CUSTOM" && input.customLadder.length) {
    return JSON.stringify({ customLadder: input.customLadder });
  }
  return null;
}

/** Build the ScoringConfig the scoring engine expects from a stored Game row. */
export function toScoringConfig(game: {
  scoringMode: ScoringMode;
  valueSource: ValueSource;
  speedBonus: boolean;
  config: string | null;
}, totalQuestions: number): ScoringConfig {
  return {
    mode: game.scoringMode,
    valueSource: game.valueSource,
    speedBonus: game.speedBonus,
    totalQuestions,
    customLadder: parseGameConfig(game.config).customLadder,
  };
}
