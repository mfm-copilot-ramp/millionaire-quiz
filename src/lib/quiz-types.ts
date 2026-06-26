// Shared domain types used by the scoring engine, realtime server, and UI.
// These mirror the Prisma enums (same string values) but are dependency-free so
// the scoring logic stays pure and unit-testable without a database.

export type QuestionType =
  | "MULTIPLE_CHOICE"
  | "TRUE_FALSE"
  | "MULTIPLE_SELECT"
  | "SHORT_TEXT"
  | "NUMERIC"
  | "POLL";

export type ScoringMode = "WEIGHTED" | "ESCALATING";
export type ValueSource = "PRESET" | "CUSTOM";
export type SessionStatus = "LOBBY" | "IN_PROGRESS" | "ENDED";

export const QUESTION_TYPES: QuestionType[] = [
  "MULTIPLE_CHOICE",
  "TRUE_FALSE",
  "MULTIPLE_SELECT",
  "SHORT_TEXT",
  "NUMERIC",
  "POLL",
];

/** Question types whose answers are expressed as selected option ids. */
export const OPTION_BASED_TYPES: QuestionType[] = [
  "MULTIPLE_CHOICE",
  "TRUE_FALSE",
  "MULTIPLE_SELECT",
  "POLL",
];

/** A player's submitted answer, discriminated by `kind`. */
export type SubmittedAnswer =
  | { kind: "options"; optionIds: string[] }
  | { kind: "text"; text: string }
  | { kind: "number"; value: number };

/** Safely parse an unknown payload (e.g. from a socket or the DB) into a SubmittedAnswer. */
export function parseSubmittedAnswer(raw: unknown): SubmittedAnswer | null {
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;

  if (obj.kind === "options" && Array.isArray(obj.optionIds)) {
    const optionIds = obj.optionIds.filter((id): id is string => typeof id === "string");
    return { kind: "options", optionIds };
  }
  if (obj.kind === "text" && typeof obj.text === "string") {
    return { kind: "text", text: obj.text };
  }
  if (obj.kind === "number" && typeof obj.value === "number" && Number.isFinite(obj.value)) {
    return { kind: "number", value: obj.value };
  }
  return null;
}
