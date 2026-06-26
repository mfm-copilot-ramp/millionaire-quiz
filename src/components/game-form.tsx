"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { ScoringMode, ValueSource } from "@/lib/quiz-types";
import {
  SCORING_MODE_LABELS,
  SCORING_MODE_HINTS,
  VALUE_SOURCE_LABELS,
  valueSourceHint,
  presetLadder,
  type GameInput,
} from "@/lib/game-config";
import { saveGame } from "@/lib/game-actions";
import { fieldInput, fieldLabel, primaryButton, ghostButton, formError } from "@/components/ui";

export interface SetSummary {
  id: string;
  title: string;
  questionCount: number;
  questions: { order: number; title: string }[];
}

const MODES: ScoringMode[] = ["WEIGHTED", "ESCALATING"];
const SOURCES: ValueSource[] = ["PRESET", "CUSTOM"];

export function GameForm({
  sets,
  initial,
  isEdit,
}: {
  sets: SetSummary[];
  initial: GameInput;
  isEdit: boolean;
}) {
  const router = useRouter();
  const [game, setGame] = useState<GameInput>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const selectedSet = useMemo(
    () => sets.find((s) => s.id === game.questionSetId) ?? null,
    [sets, game.questionSetId],
  );

  function patch(changes: Partial<GameInput>) {
    setGame((prev) => ({ ...prev, ...changes }));
  }

  function changeSet(setId: string) {
    const set = sets.find((s) => s.id === setId);
    patch({
      questionSetId: setId,
      customLadder: set ? presetLadder(set.questionCount) : [],
    });
  }

  function enterCustomEscalating() {
    // Seed the ladder with preset values when first switching to custom escalating.
    if (selectedSet && game.customLadder.length !== selectedSet.questionCount) {
      patch({ customLadder: presetLadder(selectedSet.questionCount) });
    }
  }

  function updateLadder(index: number, value: number) {
    setGame((prev) => {
      const ladder = [...prev.customLadder];
      ladder[index] = value;
      return { ...prev, customLadder: ladder };
    });
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await saveGame(game);
      if (result.ok) {
        router.push(`/games/${result.id}`);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  const showCustomLadder =
    game.scoringMode === "ESCALATING" && game.valueSource === "CUSTOM" && selectedSet;
  const ladder =
    selectedSet && game.customLadder.length === selectedSet.questionCount
      ? game.customLadder
      : selectedSet
        ? presetLadder(selectedSet.questionCount)
        : [];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <label htmlFor="gtitle" className={fieldLabel}>
          Game title
        </label>
        <input
          id="gtitle"
          value={game.title}
          onChange={(e) => patch({ title: e.target.value })}
          className={fieldInput}
          placeholder="Friday Night Trivia"
        />
      </div>

      {/* Question set */}
      <div>
        <label htmlFor="gset" className={fieldLabel}>
          Question set
        </label>
        <select
          id="gset"
          value={game.questionSetId}
          onChange={(e) => changeSet(e.target.value)}
          className={`${fieldInput} appearance-none`}
        >
          <option value="" className="bg-panel">
            Choose a set…
          </option>
          {sets.map((s) => (
            <option key={s.id} value={s.id} className="bg-panel text-foreground">
              {s.title} ({s.questionCount} question{s.questionCount === 1 ? "" : "s"})
            </option>
          ))}
        </select>
      </div>

      {/* Scoring mode */}
      <div>
        <span className={fieldLabel}>Scoring mode</span>
        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {MODES.map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => patch({ scoringMode: mode })}
              className={`rounded-xl border p-4 text-left transition-colors ${
                game.scoringMode === mode
                  ? "border-gold bg-gold/10"
                  : "border-panel-border bg-panel-2/40 hover:border-gold/40"
              }`}
            >
              <div className="font-semibold text-foreground">{SCORING_MODE_LABELS[mode]}</div>
              <div className="mt-1 text-xs text-white/60">{SCORING_MODE_HINTS[mode]}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Value source */}
      <div>
        <span className={fieldLabel}>Values</span>
        <div className="mt-2 flex flex-wrap gap-3">
          {SOURCES.map((source) => (
            <button
              key={source}
              type="button"
              onClick={() => {
                patch({ valueSource: source });
                if (source === "CUSTOM" && game.scoringMode === "ESCALATING") enterCustomEscalating();
              }}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                game.valueSource === source
                  ? "border-gold bg-gold/10 text-gold"
                  : "border-panel-border bg-panel-2/40 text-white/70 hover:border-gold/40"
              }`}
            >
              {VALUE_SOURCE_LABELS[source]}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-white/50">
          {valueSourceHint(game.scoringMode, game.valueSource)}
        </p>
      </div>

      {/* Speed bonus */}
      <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-panel-border bg-panel-2/40 p-3">
        <input
          type="checkbox"
          checked={game.speedBonus}
          onChange={(e) => patch({ speedBonus: e.target.checked })}
          className="h-5 w-5 accent-gold"
        />
        <span>
          <span className="font-medium text-foreground">Speed bonus</span>
          <span className="block text-xs text-white/60">
            Faster correct answers earn more (full value instantly, half at the buzzer).
          </span>
        </span>
      </label>

      {/* Preset escalating preview */}
      {game.scoringMode === "ESCALATING" && game.valueSource === "PRESET" && selectedSet ? (
        <div className="rounded-lg border border-panel-border bg-panel-2/30 p-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-white/50">Value ladder</p>
          <div className="flex flex-wrap gap-2">
            {presetLadder(selectedSet.questionCount).map((value, i) => (
              <span key={i} className="rounded-md bg-gold/10 px-2 py-1 text-sm text-gold">
                Q{i + 1}: {value.toLocaleString()}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {/* Custom escalating ladder */}
      {showCustomLadder ? (
        <div className="rounded-lg border border-panel-border bg-panel-2/30 p-4">
          <p className="mb-3 text-sm font-medium text-foreground">Custom value per question</p>
          <div className="space-y-2">
            {selectedSet!.questions.map((q, index) => (
              <div key={index} className="flex items-center gap-3">
                <span className="w-8 shrink-0 text-xs font-bold text-gold">Q{index + 1}</span>
                <span className="flex-1 truncate text-sm text-white/60">{q.title}</span>
                <input
                  type="number"
                  min={0}
                  value={ladder[index] ?? 0}
                  onChange={(e) => updateLadder(index, Number(e.target.value) || 0)}
                  className={`${fieldInput} mt-0 w-32`}
                />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {error ? <p className={formError}>{error}</p> : null}

      <div className="flex items-center gap-3">
        <button type="button" onClick={submit} disabled={pending} className={`${primaryButton} w-auto px-6`}>
          {pending ? "Saving…" : isEdit ? "Save changes" : "Create game"}
        </button>
        <button type="button" onClick={() => router.back()} className={ghostButton}>
          Cancel
        </button>
      </div>
    </div>
  );
}
