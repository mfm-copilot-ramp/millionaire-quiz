import { describe, it, expect } from "vitest";
import {
  scoreAnswer,
  isAnswerCorrect,
  presetEscalatingValue,
  applySpeedFactor,
  normalizeText,
  type ScoringQuestion,
  type ScoringConfig,
} from "./scoring";

function mc(): ScoringQuestion {
  return {
    type: "MULTIPLE_CHOICE",
    order: 1,
    basePoints: 1000,
    timeLimitSeconds: 20,
    acceptedAnswers: null,
    numericAnswer: null,
    numericTolerance: null,
    options: [
      { id: "a", isCorrect: true, points: 1000 },
      { id: "b", isCorrect: false, points: 400 },
      { id: "c", isCorrect: false, points: 0 },
      { id: "d", isCorrect: false, points: 0 },
    ],
  };
}

function multiSelect(): ScoringQuestion {
  return {
    type: "MULTIPLE_SELECT",
    order: 1,
    basePoints: 1000,
    timeLimitSeconds: 20,
    acceptedAnswers: null,
    numericAnswer: null,
    numericTolerance: null,
    options: [
      { id: "a", isCorrect: true, points: 300 },
      { id: "b", isCorrect: true, points: 300 },
      { id: "c", isCorrect: false, points: 0 },
      { id: "d", isCorrect: true, points: 400 },
    ],
  };
}

function shortText(): ScoringQuestion {
  return {
    type: "SHORT_TEXT",
    order: 1,
    basePoints: 1000,
    timeLimitSeconds: 20,
    acceptedAnswers: ["ERP", "Enterprise Resource Planning"],
    numericAnswer: null,
    numericTolerance: null,
    options: [],
  };
}

function numeric(): ScoringQuestion {
  return {
    type: "NUMERIC",
    order: 1,
    basePoints: 1000,
    timeLimitSeconds: 20,
    acceptedAnswers: null,
    numericAnswer: 2016,
    numericTolerance: 1,
    options: [],
  };
}

const weightedPreset: ScoringConfig = {
  mode: "WEIGHTED",
  valueSource: "PRESET",
  speedBonus: false,
  totalQuestions: 5,
};
const weightedCustom: ScoringConfig = {
  mode: "WEIGHTED",
  valueSource: "CUSTOM",
  speedBonus: false,
  totalQuestions: 5,
};
const escalatingPreset: ScoringConfig = {
  mode: "ESCALATING",
  valueSource: "PRESET",
  speedBonus: false,
  totalQuestions: 5,
};

describe("normalizeText", () => {
  it("trims, lowercases, and collapses whitespace", () => {
    expect(normalizeText("  Hello   World ")).toBe("hello world");
    expect(normalizeText("ERP")).toBe("erp");
  });
});

describe("correctness", () => {
  it("multiple choice: only the correct single option is correct", () => {
    expect(isAnswerCorrect(mc(), { kind: "options", optionIds: ["a"] })).toBe(true);
    expect(isAnswerCorrect(mc(), { kind: "options", optionIds: ["b"] })).toBe(false);
    expect(isAnswerCorrect(mc(), { kind: "options", optionIds: ["a", "b"] })).toBe(false);
  });

  it("true/false behaves like single-choice", () => {
    const q: ScoringQuestion = {
      ...mc(),
      type: "TRUE_FALSE",
      options: [
        { id: "t", isCorrect: true, points: 1000 },
        { id: "f", isCorrect: false, points: 0 },
      ],
    };
    expect(isAnswerCorrect(q, { kind: "options", optionIds: ["t"] })).toBe(true);
    expect(isAnswerCorrect(q, { kind: "options", optionIds: ["f"] })).toBe(false);
  });

  it("multiple select requires the exact correct set", () => {
    const q = multiSelect();
    expect(isAnswerCorrect(q, { kind: "options", optionIds: ["a", "b", "d"] })).toBe(true);
    expect(isAnswerCorrect(q, { kind: "options", optionIds: ["a", "b"] })).toBe(false);
    expect(isAnswerCorrect(q, { kind: "options", optionIds: ["a", "b", "c", "d"] })).toBe(false);
  });

  it("short text matches accepted answers case/space-insensitively", () => {
    const q = shortText();
    expect(isAnswerCorrect(q, { kind: "text", text: "erp" })).toBe(true);
    expect(isAnswerCorrect(q, { kind: "text", text: "  Enterprise   Resource Planning " })).toBe(true);
    expect(isAnswerCorrect(q, { kind: "text", text: "crm" })).toBe(false);
  });

  it("numeric respects tolerance", () => {
    const q = numeric();
    expect(isAnswerCorrect(q, { kind: "number", value: 2016 })).toBe(true);
    expect(isAnswerCorrect(q, { kind: "number", value: 2017 })).toBe(true);
    expect(isAnswerCorrect(q, { kind: "number", value: 2018 })).toBe(false);
  });

  it("poll is never correct; null answers are never correct", () => {
    const poll: ScoringQuestion = { ...mc(), type: "POLL" };
    expect(isAnswerCorrect(poll, { kind: "options", optionIds: ["a"] })).toBe(false);
    expect(isAnswerCorrect(mc(), null)).toBe(false);
  });
});

describe("WEIGHTED + PRESET (flat)", () => {
  it("awards basePoints for correct, 0 for wrong", () => {
    expect(scoreAnswer(mc(), { kind: "options", optionIds: ["a"] }, 0, weightedPreset).pointsEarned).toBe(1000);
    expect(scoreAnswer(mc(), { kind: "options", optionIds: ["b"] }, 0, weightedPreset).pointsEarned).toBe(0);
  });

  it("multi-select is all-or-nothing under preset", () => {
    const q = multiSelect();
    expect(scoreAnswer(q, { kind: "options", optionIds: ["a", "b", "d"] }, 0, weightedPreset).pointsEarned).toBe(1000);
    expect(scoreAnswer(q, { kind: "options", optionIds: ["a", "b"] }, 0, weightedPreset).pointsEarned).toBe(0);
  });
});

describe("WEIGHTED + CUSTOM (partial credit)", () => {
  it("awards the chosen option's authored points even when not the canonical answer", () => {
    const partial = scoreAnswer(mc(), { kind: "options", optionIds: ["b"] }, 0, weightedCustom);
    expect(partial.isCorrect).toBe(false);
    expect(partial.pointsEarned).toBe(400);
  });

  it("sums chosen option points for multi-select", () => {
    const q = multiSelect();
    expect(scoreAnswer(q, { kind: "options", optionIds: ["a", "d"] }, 0, weightedCustom).pointsEarned).toBe(700);
    expect(scoreAnswer(q, { kind: "options", optionIds: ["a", "b", "d"] }, 0, weightedCustom).pointsEarned).toBe(1000);
  });

  it("text/numeric earn basePoints when correct", () => {
    expect(scoreAnswer(shortText(), { kind: "text", text: "ERP" }, 0, weightedCustom).pointsEarned).toBe(1000);
    expect(scoreAnswer(numeric(), { kind: "number", value: 2016 }, 0, weightedCustom).pointsEarned).toBe(1000);
  });
});

describe("ESCALATING", () => {
  it("preset ladder doubles each question by order", () => {
    expect(presetEscalatingValue(1)).toBe(1000);
    expect(presetEscalatingValue(2)).toBe(2000);
    expect(presetEscalatingValue(5)).toBe(16000);
  });

  it("awards the ladder value for the question's order when correct", () => {
    const q3: ScoringQuestion = { ...mc(), order: 3 };
    expect(scoreAnswer(q3, { kind: "options", optionIds: ["a"] }, 0, escalatingPreset).pointsEarned).toBe(4000);
    expect(scoreAnswer(q3, { kind: "options", optionIds: ["b"] }, 0, escalatingPreset).pointsEarned).toBe(0);
  });

  it("custom ladder overrides the value per order", () => {
    const cfg: ScoringConfig = {
      mode: "ESCALATING",
      valueSource: "CUSTOM",
      speedBonus: false,
      totalQuestions: 5,
      customLadder: [500, 750, 1200, 3000, 9000],
    };
    const q4: ScoringQuestion = { ...mc(), order: 4 };
    expect(scoreAnswer(q4, { kind: "options", optionIds: ["a"] }, 0, cfg).pointsEarned).toBe(3000);
  });
});

describe("speed bonus", () => {
  it("scales from full (instant) to half (at the buzzer)", () => {
    expect(applySpeedFactor(1000, 0, 20)).toBe(1000);
    expect(applySpeedFactor(1000, 20000, 20)).toBe(500);
    expect(applySpeedFactor(1000, 10000, 20)).toBe(750);
  });

  it("applies to earned points when enabled", () => {
    const cfg: ScoringConfig = { ...weightedPreset, speedBonus: true };
    const result = scoreAnswer(mc(), { kind: "options", optionIds: ["a"] }, 10000, cfg);
    expect(result.maxPoints).toBe(1000);
    expect(result.pointsEarned).toBe(750);
  });

  it("never applies to a wrong (zero-value) answer", () => {
    const cfg: ScoringConfig = { ...weightedPreset, speedBonus: true };
    expect(scoreAnswer(mc(), { kind: "options", optionIds: ["c"] }, 0, cfg).pointsEarned).toBe(0);
  });
});

describe("no answer / timeout", () => {
  it("earns zero", () => {
    const result = scoreAnswer(mc(), null, 20000, { ...weightedPreset, speedBonus: true });
    expect(result.isCorrect).toBe(false);
    expect(result.pointsEarned).toBe(0);
  });
});
