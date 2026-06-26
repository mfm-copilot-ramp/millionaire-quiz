import { describe, it, expect } from "vitest";
import {
  validateQuestion,
  toPersistence,
  defaultOptionsFor,
  blankQuestionInput,
  type QuestionInput,
} from "./question-forms";

function base(overrides: Partial<QuestionInput>): QuestionInput {
  return { ...blankQuestionInput("set1"), ...overrides };
}

describe("defaultOptionsFor", () => {
  it("gives four blanks for option grids and fixed rows for true/false", () => {
    expect(defaultOptionsFor("MULTIPLE_CHOICE")).toHaveLength(4);
    expect(defaultOptionsFor("POLL")).toHaveLength(4);
    expect(defaultOptionsFor("TRUE_FALSE").map((o) => o.text)).toEqual(["True", "False"]);
    expect(defaultOptionsFor("SHORT_TEXT")).toHaveLength(0);
    expect(defaultOptionsFor("NUMERIC")).toHaveLength(0);
  });
});

describe("validateQuestion", () => {
  it("requires a title", () => {
    expect(validateQuestion(base({ title: "  " }))).toMatch(/question text/i);
  });

  it("multiple choice needs exactly one correct option", () => {
    const none = base({
      type: "MULTIPLE_CHOICE",
      title: "Q",
      options: [
        { text: "a", isCorrect: false, points: 0 },
        { text: "b", isCorrect: false, points: 0 },
      ],
    });
    expect(validateQuestion(none)).toMatch(/exactly one/i);

    const ok = base({
      type: "MULTIPLE_CHOICE",
      title: "Q",
      options: [
        { text: "a", isCorrect: true, points: 0 },
        { text: "b", isCorrect: false, points: 0 },
      ],
    });
    expect(validateQuestion(ok)).toBeNull();
  });

  it("multiple select needs at least one correct option", () => {
    const q = base({
      type: "MULTIPLE_SELECT",
      title: "Q",
      options: [
        { text: "a", isCorrect: false, points: 0 },
        { text: "b", isCorrect: false, points: 0 },
      ],
    });
    expect(validateQuestion(q)).toMatch(/at least one correct/i);
  });

  it("poll just needs two options, no correctness", () => {
    const q = base({
      type: "POLL",
      title: "Q",
      options: [
        { text: "a", isCorrect: false, points: 0 },
        { text: "b", isCorrect: false, points: 0 },
      ],
    });
    expect(validateQuestion(q)).toBeNull();
  });

  it("short text needs an accepted answer; numeric needs a number", () => {
    expect(validateQuestion(base({ type: "SHORT_TEXT", title: "Q", acceptedAnswers: [] }))).toMatch(
      /accepted answer/i,
    );
    expect(
      validateQuestion(base({ type: "SHORT_TEXT", title: "Q", acceptedAnswers: ["yes"] })),
    ).toBeNull();
    expect(validateQuestion(base({ type: "NUMERIC", title: "Q", numericAnswer: null }))).toMatch(
      /numeric answer/i,
    );
    expect(
      validateQuestion(base({ type: "NUMERIC", title: "Q", numericAnswer: 42 })),
    ).toBeNull();
  });
});

describe("toPersistence", () => {
  it("trims options, drops blanks, and forces poll options uncorrect", () => {
    const { options } = toPersistence(
      base({
        type: "POLL",
        title: "Q",
        options: [
          { text: " Red ", isCorrect: true, points: 5 },
          { text: "", isCorrect: false, points: 0 },
          { text: "Blue", isCorrect: false, points: 0 },
        ],
      }),
    );
    expect(options).toEqual([
      { order: 0, text: "Red", isCorrect: false, points: 5 },
      { order: 1, text: "Blue", isCorrect: false, points: 0 },
    ]);
  });

  it("encodes accepted answers as JSON for short text only", () => {
    const text = toPersistence(
      base({ type: "SHORT_TEXT", title: "Q", acceptedAnswers: [" ERP ", "", "SAP"] }),
    );
    expect(text.shared.acceptedAnswers).toBe(JSON.stringify(["ERP", "SAP"]));
    expect(text.options).toHaveLength(0);

    const mc = toPersistence(base({ type: "MULTIPLE_CHOICE", title: "Q" }));
    expect(mc.shared.acceptedAnswers).toBeNull();
  });

  it("keeps numeric answer + tolerance only for numeric questions", () => {
    const numeric = toPersistence(
      base({ type: "NUMERIC", title: "Q", numericAnswer: 2016, numericTolerance: null }),
    );
    expect(numeric.shared.numericAnswer).toBe(2016);
    expect(numeric.shared.numericTolerance).toBe(0);

    const mc = toPersistence(base({ type: "MULTIPLE_CHOICE", title: "Q", numericAnswer: 5 }));
    expect(mc.shared.numericAnswer).toBeNull();
    expect(mc.shared.numericTolerance).toBeNull();
  });
});
