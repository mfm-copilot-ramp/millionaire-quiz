"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { QuestionType } from "@/lib/quiz-types";
import { QUESTION_TYPES } from "@/lib/quiz-types";
import {
  QUESTION_TYPE_LABELS,
  QUESTION_TYPE_HINTS,
  allowsMultipleCorrect,
  defaultOptionsFor,
  isOptionBased,
  validateQuestion,
  MAX_OPTIONS,
  MIN_OPTIONS,
  type OptionInput,
  type QuestionInput,
} from "@/lib/question-forms";
import { saveQuestion } from "@/lib/question-set-actions";
import {
  fieldInput,
  fieldLabel,
  primaryButton,
  ghostButton,
  formError,
} from "@/components/ui";

export function QuestionEditor({
  initial,
  isEdit,
}: {
  initial: QuestionInput;
  isEdit: boolean;
}) {
  const router = useRouter();
  const [q, setQ] = useState<QuestionInput>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function patch(changes: Partial<QuestionInput>) {
    setError(null);
    setQ((prev) => ({ ...prev, ...changes }));
  }

  function changeType(type: QuestionType) {
    patch({
      type,
      options: defaultOptionsFor(type),
      acceptedAnswers: type === "SHORT_TEXT" ? q.acceptedAnswers.length ? q.acceptedAnswers : [""] : [],
      numericAnswer: type === "NUMERIC" ? q.numericAnswer : null,
      numericTolerance: type === "NUMERIC" ? q.numericTolerance ?? 0 : null,
    });
  }

  // --- option helpers ---
  function updateOption(index: number, changes: Partial<OptionInput>) {
    setError(null);
    setQ((prev) => {
      const options = prev.options.map((o, i) => (i === index ? { ...o, ...changes } : o));
      return { ...prev, options };
    });
  }
  function setSingleCorrect(index: number) {
    setError(null);
    setQ((prev) => ({
      ...prev,
      options: prev.options.map((o, i) => ({ ...o, isCorrect: i === index })),
    }));
  }
  function addOption() {
    if (q.options.length >= MAX_OPTIONS) return;
    patch({ options: [...q.options, { text: "", isCorrect: false, points: 0 }] });
  }
  function removeOption(index: number) {
    if (q.options.length <= MIN_OPTIONS) return;
    patch({ options: q.options.filter((_, i) => i !== index) });
  }

  // --- accepted answers helpers ---
  function updateAccepted(index: number, value: string) {
    setError(null);
    setQ((prev) => ({
      ...prev,
      acceptedAnswers: prev.acceptedAnswers.map((a, i) => (i === index ? value : a)),
    }));
  }
  function addAccepted() {
    patch({ acceptedAnswers: [...q.acceptedAnswers, ""] });
  }
  function removeAccepted(index: number) {
    patch({ acceptedAnswers: q.acceptedAnswers.filter((_, i) => i !== index) });
  }

  function submit() {
    setError(null);
    const localError = validateQuestion(q);
    if (localError) {
      setError(localError);
      return;
    }
    startTransition(async () => {
      const result = await saveQuestion(q);
      if (result.ok) {
        router.push(`/sets/${q.setId}`);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  const showPoints = q.type === "MULTIPLE_CHOICE" || q.type === "TRUE_FALSE" || q.type === "MULTIPLE_SELECT";
  const multiCorrect = allowsMultipleCorrect(q.type);
  const lockedText = q.type === "TRUE_FALSE";

  return (
    <div className="space-y-6">
      {/* Type */}
      <div>
        <label htmlFor="qtype" className={fieldLabel}>
          Question type
        </label>
        <select
          id="qtype"
          value={q.type}
          onChange={(e) => changeType(e.target.value as QuestionType)}
          className={`${fieldInput} appearance-none`}
        >
          {QUESTION_TYPES.map((t) => (
            <option key={t} value={t} className="bg-panel text-foreground">
              {QUESTION_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-white/50">{QUESTION_TYPE_HINTS[q.type]}</p>
      </div>

      {/* Title */}
      <div>
        <label htmlFor="qtitle" className={fieldLabel}>
          Question
        </label>
        <textarea
          id="qtitle"
          value={q.title}
          onChange={(e) => patch({ title: e.target.value })}
          rows={2}
          className={fieldInput}
          placeholder="What do you want to ask?"
        />
      </div>

      {/* Timing + base points */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="qtime" className={fieldLabel}>
            Time limit (seconds)
          </label>
          <input
            id="qtime"
            type="number"
            min={5}
            max={300}
            value={q.timeLimitSeconds}
            onChange={(e) => patch({ timeLimitSeconds: Number(e.target.value) || 0 })}
            className={fieldInput}
          />
        </div>
        <div>
          <label htmlFor="qbase" className={fieldLabel}>
            Base points
          </label>
          <input
            id="qbase"
            type="number"
            min={0}
            value={q.basePoints}
            onChange={(e) => patch({ basePoints: Number(e.target.value) || 0 })}
            className={fieldInput}
          />
          <p className="mt-1 text-xs text-white/50">Used for escalating scoring and text/numeric answers.</p>
        </div>
      </div>

      {/* Type-specific */}
      {isOptionBased(q.type) ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className={fieldLabel}>Options</span>
            {q.type !== "TRUE_FALSE" ? (
              <span className="text-xs text-white/50">
                {multiCorrect
                  ? "Tick every correct option"
                  : q.type === "POLL"
                    ? "No correct answer"
                    : "Pick the one correct option"}
              </span>
            ) : null}
          </div>

          {q.options.map((opt, index) => (
            <div
              key={index}
              className="flex items-center gap-3 rounded-lg border border-panel-border bg-panel-2/40 p-3"
            >
              {q.type !== "POLL" ? (
                <input
                  type={multiCorrect ? "checkbox" : "radio"}
                  name="correct"
                  checked={opt.isCorrect}
                  onChange={() =>
                    multiCorrect
                      ? updateOption(index, { isCorrect: !opt.isCorrect })
                      : setSingleCorrect(index)
                  }
                  className="h-5 w-5 accent-gold"
                  aria-label={`Mark option ${index + 1} correct`}
                />
              ) : (
                <span className="w-5 text-center text-white/40">{index + 1}</span>
              )}

              <input
                type="text"
                value={opt.text}
                readOnly={lockedText}
                onChange={(e) => updateOption(index, { text: e.target.value })}
                className={`${fieldInput} mt-0 min-w-0 flex-1 ${lockedText ? "opacity-70" : ""}`}
                placeholder={`Option ${index + 1}`}
              />

              {showPoints ? (
                <label
                  className="flex shrink-0 items-center gap-1 text-xs text-white/40"
                  title="Per-option points (used only with Weighted + Custom game scoring)"
                >
                  <input
                    type="number"
                    min={0}
                    value={opt.points}
                    onChange={(e) => updateOption(index, { points: Number(e.target.value) || 0 })}
                    className="w-16 rounded-lg border border-panel-border bg-panel-2/60 px-2 py-2 text-right text-foreground outline-none focus:border-gold/70 focus:ring-2 focus:ring-gold/30"
                    aria-label={`Points for option ${index + 1}`}
                  />
                  pts
                </label>
              ) : null}

              {q.type !== "TRUE_FALSE" && q.options.length > MIN_OPTIONS ? (
                <button
                  type="button"
                  onClick={() => removeOption(index)}
                  className="text-white/40 hover:text-red-300"
                  aria-label={`Remove option ${index + 1}`}
                >
                  ✕
                </button>
              ) : null}
            </div>
          ))}

          {q.type !== "TRUE_FALSE" && q.options.length < MAX_OPTIONS ? (
            <button type="button" onClick={addOption} className={ghostButton}>
              + Add option
            </button>
          ) : null}

          {showPoints ? (
            <p className="text-xs text-white/40">
              Per-option points apply only when a game uses Weighted + Custom scoring.
            </p>
          ) : null}
        </div>
      ) : null}

      {q.type === "SHORT_TEXT" ? (
        <div className="space-y-3">
          <span className={fieldLabel}>Accepted answers</span>
          {q.acceptedAnswers.map((answer, index) => (
            <div key={index} className="flex items-center gap-3">
              <input
                type="text"
                value={answer}
                onChange={(e) => updateAccepted(index, e.target.value)}
                className={`${fieldInput} mt-0 flex-1`}
                placeholder="An accepted answer"
              />
              {q.acceptedAnswers.length > 1 ? (
                <button
                  type="button"
                  onClick={() => removeAccepted(index)}
                  className="text-white/40 hover:text-red-300"
                  aria-label={`Remove accepted answer ${index + 1}`}
                >
                  ✕
                </button>
              ) : null}
            </div>
          ))}
          <button type="button" onClick={addAccepted} className={ghostButton}>
            + Add accepted answer
          </button>
          <p className="text-xs text-white/40">
            Matching ignores case and extra spaces.
          </p>
        </div>
      ) : null}

      {q.type === "NUMERIC" ? (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="qnum" className={fieldLabel}>
              Correct number
            </label>
            <input
              id="qnum"
              type="number"
              value={q.numericAnswer ?? ""}
              onChange={(e) =>
                patch({ numericAnswer: e.target.value === "" ? null : Number(e.target.value) })
              }
              className={fieldInput}
              placeholder="e.g. 2016"
            />
          </div>
          <div>
            <label htmlFor="qtol" className={fieldLabel}>
              Tolerance (±)
            </label>
            <input
              id="qtol"
              type="number"
              min={0}
              value={q.numericTolerance ?? 0}
              onChange={(e) => patch({ numericTolerance: Number(e.target.value) || 0 })}
              className={fieldInput}
              placeholder="0"
            />
          </div>
        </div>
      ) : null}

      {error ? <p className={formError}>{error}</p> : null}

      <div className="flex items-center gap-3">
        <button type="button" onClick={submit} disabled={pending} className={`${primaryButton} w-auto px-6`}>
          {pending ? "Saving…" : isEdit ? "Save changes" : "Add question"}
        </button>
        <button
          type="button"
          onClick={() => router.push(`/sets/${q.setId}`)}
          className={ghostButton}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
