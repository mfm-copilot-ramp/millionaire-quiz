import { describe, it, expect } from "vitest";
import {
  presetLadder,
  parseGameConfig,
  serializeGameConfig,
  toScoringConfig,
} from "./game-config";

describe("presetLadder", () => {
  it("doubles each question starting at 1000", () => {
    expect(presetLadder(5)).toEqual([1000, 2000, 4000, 8000, 16000]);
    expect(presetLadder(0)).toEqual([]);
  });
});

describe("parseGameConfig", () => {
  it("returns null ladder for empty or malformed config", () => {
    expect(parseGameConfig(null).customLadder).toBeNull();
    expect(parseGameConfig("not json").customLadder).toBeNull();
    expect(parseGameConfig("{}").customLadder).toBeNull();
  });

  it("parses a numeric ladder, dropping non-finite entries", () => {
    expect(parseGameConfig(JSON.stringify({ customLadder: [100, 200] })).customLadder).toEqual([
      100, 200,
    ]);
  });
});

describe("serializeGameConfig", () => {
  it("only persists a ladder for escalating + custom", () => {
    expect(
      serializeGameConfig({ scoringMode: "WEIGHTED", valueSource: "CUSTOM", customLadder: [1, 2] }),
    ).toBeNull();
    expect(
      serializeGameConfig({ scoringMode: "ESCALATING", valueSource: "PRESET", customLadder: [1, 2] }),
    ).toBeNull();
    expect(
      serializeGameConfig({ scoringMode: "ESCALATING", valueSource: "CUSTOM", customLadder: [5, 9] }),
    ).toBe(JSON.stringify({ customLadder: [5, 9] }));
  });
});

describe("toScoringConfig", () => {
  it("maps a game row into the scoring engine's config", () => {
    const config = toScoringConfig(
      {
        scoringMode: "ESCALATING",
        valueSource: "CUSTOM",
        speedBonus: false,
        config: JSON.stringify({ customLadder: [500, 1500] }),
      },
      2,
    );
    expect(config).toEqual({
      mode: "ESCALATING",
      valueSource: "CUSTOM",
      speedBonus: false,
      totalQuestions: 2,
      customLadder: [500, 1500],
    });
  });
});
