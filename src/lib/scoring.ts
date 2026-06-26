// Pure scoring engine for the Millionaire Quiz.
//
// Four host-selectable behaviours come from the (mode x valueSource) matrix:
//   WEIGHTED   + PRESET  -> flat: correct answer earns `basePoints`, wrong earns 0.
//   WEIGHTED   + CUSTOM  -> weighted: earn the chosen option(s)' authored `points`
//                           (partial credit possible); text/numeric earn basePoints.
//   ESCALATING + PRESET  -> millionaire ladder: value doubles each question (by order).
//   ESCALATING + CUSTOM  -> host-supplied per-question value (customLadder), else basePoints.
//
// An optional speed bonus (Kahoot-style) scales the awarded value from full (instant)
// down to half (at the buzzer) for any answer that earns points.

import type { QuestionType, ScoringMode, ValueSource, SubmittedAnswer } from "./quiz-types";

export interface ScoringOption {
  id: string;
  isCorrect: boolean;
  points: number;
}

export interface ScoringQuestion {
  type: QuestionType;
  order: number; // 1-based position within the set
  basePoints: number;
  timeLimitSeconds: number;
  options: ScoringOption[];
  acceptedAnswers: string[] | null;
  numericAnswer: number | null;
  numericTolerance: number | null;
}

export interface ScoringConfig {
  mode: ScoringMode;
  valueSource: ValueSource;
  speedBonus: boolean;
  totalQuestions: number;
  /** ESCALATING + CUSTOM: value per 1-based question order. */
  customLadder?: number[] | null;
}

export interface ScoreResult {
  isCorrect: boolean;
  /** Value before speed scaling (what an instant answer would earn). */
  maxPoints: number;
  /** Final awarded points. */
  pointsEarned: number;
}

const PRESET_LADDER_BASE = 1000;

/** Normalize free text for tolerant comparison (unicode, case, surrounding/inner whitespace). */
export function normalizeText(value: string): string {
  return value.normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " ");
}

/** Preset escalating value for a 1-based question order (doubles each question). */
export function presetEscalatingValue(order: number): number {
  return PRESET_LADDER_BASE * 2 ** Math.max(0, order - 1);
}

function sameStringSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const setB = new Set(b);
  if (setB.size !== new Set(a).size) return false;
  for (const value of a) {
    if (!setB.has(value)) return false;
  }
  return true;
}

function chosenOptionIds(answer: SubmittedAnswer | null): string[] {
  return answer && answer.kind === "options" ? answer.optionIds : [];
}

function correctOptionIds(question: ScoringQuestion): string[] {
  return question.options.filter((o) => o.isCorrect).map((o) => o.id);
}

/** Whether a submitted answer is correct for the question (ignores points/scoring mode). */
export function isAnswerCorrect(
  question: ScoringQuestion,
  answer: SubmittedAnswer | null,
): boolean {
  if (!answer) return false;

  switch (question.type) {
    case "POLL":
      return false; // polls have no correct answer
    case "MULTIPLE_CHOICE":
    case "TRUE_FALSE": {
      const chosen = chosenOptionIds(answer);
      return chosen.length === 1 && sameStringSet(chosen, correctOptionIds(question));
    }
    case "MULTIPLE_SELECT": {
      const chosen = chosenOptionIds(answer);
      return chosen.length > 0 && sameStringSet(chosen, correctOptionIds(question));
    }
    case "SHORT_TEXT": {
      if (answer.kind !== "text") return false;
      const accepted = (question.acceptedAnswers ?? []).map(normalizeText);
      return accepted.includes(normalizeText(answer.text));
    }
    case "NUMERIC": {
      if (answer.kind !== "number" || question.numericAnswer === null) return false;
      const tolerance = question.numericTolerance ?? 0;
      return Math.abs(answer.value - question.numericAnswer) <= tolerance + 1e-9;
    }
    default:
      return false;
  }
}

/** The value of a correct answer for ESCALATING mode. */
export function escalatingValue(question: ScoringQuestion, config: ScoringConfig): number {
  if (config.valueSource === "CUSTOM") {
    const custom = config.customLadder?.[question.order - 1];
    return typeof custom === "number" ? custom : question.basePoints;
  }
  return presetEscalatingValue(question.order);
}

/** Scale a value by how quickly the answer arrived (full -> half across the time limit). */
export function applySpeedFactor(
  base: number,
  msToAnswer: number,
  timeLimitSeconds: number,
): number {
  if (base <= 0) return 0;
  const limitMs = Math.max(1, timeLimitSeconds * 1000);
  const fraction = Math.min(1, Math.max(0, msToAnswer / limitMs));
  return base * (1 - 0.5 * fraction);
}

/** Base (pre-speed) points an answer earns under the configured scoring mode. */
function basePointsFor(
  question: ScoringQuestion,
  answer: SubmittedAnswer | null,
  correct: boolean,
  config: ScoringConfig,
): number {
  if (question.type === "POLL") return 0;

  if (config.mode === "ESCALATING") {
    return correct ? escalatingValue(question, config) : 0;
  }

  // WEIGHTED
  if (config.valueSource === "PRESET") {
    return correct ? question.basePoints : 0; // flat correct/incorrect
  }

  // WEIGHTED + CUSTOM -> use authored per-option points (partial credit) where applicable.
  switch (question.type) {
    case "MULTIPLE_CHOICE":
    case "TRUE_FALSE":
    case "MULTIPLE_SELECT": {
      const chosen = new Set(chosenOptionIds(answer));
      return question.options
        .filter((o) => chosen.has(o.id))
        .reduce((sum, o) => sum + o.points, 0);
    }
    case "SHORT_TEXT":
    case "NUMERIC":
      return correct ? question.basePoints : 0;
    default:
      return 0;
  }
}

/** Score a single submitted answer. Pass `answer = null` for a timeout / no submission. */
export function scoreAnswer(
  question: ScoringQuestion,
  answer: SubmittedAnswer | null,
  msToAnswer: number,
  config: ScoringConfig,
): ScoreResult {
  const correct = isAnswerCorrect(question, answer);
  const base = basePointsFor(question, answer, correct, config);

  let pointsEarned = base;
  if (config.speedBonus && base > 0) {
    pointsEarned = applySpeedFactor(base, msToAnswer, question.timeLimitSeconds);
  }

  return {
    isCorrect: correct,
    maxPoints: Math.max(0, Math.round(base)),
    pointsEarned: Math.max(0, Math.round(pointsEarned)),
  };
}
