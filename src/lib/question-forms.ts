// Shared (dependency-light) types and helpers for the question authoring UI.
// No "use server" here so both client editor and server actions can import it.

import type { QuestionType } from "./quiz-types";
import { OPTION_BASED_TYPES } from "./quiz-types";

export interface OptionInput {
  text: string;
  isCorrect: boolean;
  points: number;
}

export interface QuestionInput {
  setId: string;
  questionId?: string;
  type: QuestionType;
  title: string;
  timeLimitSeconds: number;
  basePoints: number;
  options: OptionInput[];
  acceptedAnswers: string[];
  numericAnswer: number | null;
  numericTolerance: number | null;
}

export type SaveQuestionResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  MULTIPLE_CHOICE: "Multiple choice",
  TRUE_FALSE: "True / False",
  MULTIPLE_SELECT: "Select all that apply",
  SHORT_TEXT: "Short text answer",
  NUMERIC: "Numeric answer",
  POLL: "Poll (no right answer)",
};

export const QUESTION_TYPE_HINTS: Record<QuestionType, string> = {
  MULTIPLE_CHOICE: "One correct option out of several (default four).",
  TRUE_FALSE: "A single statement players mark true or false.",
  MULTIPLE_SELECT: "Several options; players must pick every correct one.",
  SHORT_TEXT: "Players type an answer matched against your accepted list.",
  NUMERIC: "Players enter a number; correct within your tolerance.",
  POLL: "Gather opinions — every answer is accepted, no points.",
};

export function isOptionBased(type: QuestionType): boolean {
  return OPTION_BASED_TYPES.includes(type);
}

/** Whether this type supports more than one correct option. */
export function allowsMultipleCorrect(type: QuestionType): boolean {
  return type === "MULTIPLE_SELECT";
}

function blankOption(): OptionInput {
  return { text: "", isCorrect: false, points: 0 };
}

/** Default option rows when switching to / creating a given question type. */
export function defaultOptionsFor(type: QuestionType): OptionInput[] {
  switch (type) {
    case "MULTIPLE_CHOICE":
    case "MULTIPLE_SELECT":
    case "POLL":
      return [blankOption(), blankOption(), blankOption(), blankOption()];
    case "TRUE_FALSE":
      return [
        { text: "True", isCorrect: true, points: 0 },
        { text: "False", isCorrect: false, points: 0 },
      ];
    default:
      return [];
  }
}

export function blankQuestionInput(setId: string): QuestionInput {
  return {
    setId,
    type: "MULTIPLE_CHOICE",
    title: "",
    timeLimitSeconds: 20,
    basePoints: 1000,
    options: defaultOptionsFor("MULTIPLE_CHOICE"),
    acceptedAnswers: [],
    numericAnswer: null,
    numericTolerance: null,
  };
}

export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 6;

/** Semantic validation shared by the editor and the server action. Returns an error string or null. */
export function validateQuestion(q: QuestionInput): string | null {
  if (!q.title.trim()) return "Enter the question text.";

  if (isOptionBased(q.type)) {
    const opts = q.options.filter((o) => o.text.trim().length > 0);
    if (q.type === "TRUE_FALSE") {
      if (opts.length !== 2) return "True/False needs exactly two options.";
    } else if (opts.length < MIN_OPTIONS) {
      return "Add at least two options.";
    }
    if (opts.length > MAX_OPTIONS) return `Use at most ${MAX_OPTIONS} options.`;

    const correct = opts.filter((o) => o.isCorrect).length;
    if (q.type === "MULTIPLE_SELECT") {
      if (correct < 1) return "Mark at least one correct option.";
    } else if (q.type !== "POLL") {
      if (correct !== 1) return "Mark exactly one correct option.";
    }
  } else if (q.type === "SHORT_TEXT") {
    if (q.acceptedAnswers.filter((a) => a.trim().length > 0).length < 1) {
      return "Add at least one accepted answer.";
    }
  } else if (q.type === "NUMERIC") {
    if (q.numericAnswer === null || Number.isNaN(q.numericAnswer)) {
      return "Enter the correct numeric answer.";
    }
  }
  return null;
}

export interface QuestionPersistence {
  shared: {
    type: QuestionType;
    title: string;
    timeLimitSeconds: number;
    basePoints: number;
    acceptedAnswers: string | null;
    numericAnswer: number | null;
    numericTolerance: number | null;
  };
  options: { order: number; text: string; isCorrect: boolean; points: number }[];
}

/** Map an editor input to the normalized shape persisted in the database. */
export function toPersistence(q: QuestionInput): QuestionPersistence {
  const options = isOptionBased(q.type)
    ? q.options
        .filter((o) => o.text.trim().length > 0)
        .map((o, index) => ({
          order: index,
          text: o.text.trim(),
          isCorrect: q.type === "POLL" ? false : o.isCorrect,
          points: o.points,
        }))
    : [];

  const acceptedAnswers =
    q.type === "SHORT_TEXT"
      ? JSON.stringify(q.acceptedAnswers.map((a) => a.trim()).filter(Boolean))
      : null;

  return {
    shared: {
      type: q.type,
      title: q.title.trim(),
      timeLimitSeconds: q.timeLimitSeconds,
      basePoints: q.basePoints,
      acceptedAnswers,
      numericAnswer: q.type === "NUMERIC" ? q.numericAnswer : null,
      numericTolerance: q.type === "NUMERIC" ? q.numericTolerance ?? 0 : null,
    },
    options,
  };
}
