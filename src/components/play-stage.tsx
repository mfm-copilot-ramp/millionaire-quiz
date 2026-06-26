"use client";

import { useState } from "react";
import Link from "next/link";
import { useGameSocket } from "@/components/use-game-socket";
import { Countdown, LeaderboardList, formatPoints, answerLetter } from "@/components/game-shared";
import { fieldInput, primaryButton, ghostButton } from "@/components/ui";

export function PlayStage({
  sessionId,
  playerId,
  nickname,
}: {
  sessionId: string;
  playerId: string;
  nickname: string;
}) {
  const game = useGameSocket({ role: "player", sessionId, playerId });
  const { state, remainingMs, error, ack, connected } = game;

  const [selected, setSelected] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [prevQIndex, setPrevQIndex] = useState(-1);

  const qIndex = state?.phase === "question" ? state.question.index : -1;
  if (qIndex !== prevQIndex) {
    setPrevQIndex(qIndex);
    setSelected([]);
    setText("");
  }

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  return (
    <main className="mx-auto flex min-h-[80vh] w-full max-w-lg flex-col px-5 py-8">
      <div className="mb-4 flex items-center justify-between text-sm">
        <span className="font-semibold text-gold">{state?.gameTitle ?? "Millionaire Quiz"}</span>
        <span className="text-white/60">{nickname}</span>
      </div>

      {error ? (
        <p className="mb-4 rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      {!state ? (
        <Centered>{connected ? "Joining…" : "Connecting…"}</Centered>
      ) : state.phase === "lobby" ? (
        <Centered>
          <p className="text-2xl font-bold text-gold">You&apos;re in!</p>
          <p className="mt-2 text-white/70">Waiting for the host to start…</p>
          <p className="mt-6 text-xs uppercase tracking-wide text-white/40">
            {state.players.length} player{state.players.length === 1 ? "" : "s"} ready
          </p>
        </Centered>
      ) : state.phase === "question" ? (
        <section key={state.question.index} className="mq-animate-in flex flex-1 flex-col gap-5">
          <div className="text-sm text-white/50">
            Question {state.question.index + 1} of {state.question.total}
          </div>
          <Countdown remainingMs={remainingMs} totalSeconds={state.question.timeLimitSeconds} />
          <h1 className="text-xl font-bold">{state.question.title}</h1>

          {state.you?.answered ? (
            <div className="mt-2 rounded-xl border border-emerald-400/50 bg-emerald-500/10 px-4 py-6 text-center">
              <p className="text-lg font-semibold text-emerald-200">✓ Answer locked in</p>
              <p className="mt-1 text-sm text-white/60">Waiting for everyone else…</p>
            </div>
          ) : state.question.options.length > 0 ? (
            <>
              <div className="grid grid-cols-1 gap-3">
                {state.question.options.map((o, i) => {
                  const isSel = selected.includes(o.id);
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => {
                        if (state.question.allowMultiple) {
                          toggle(o.id);
                        } else {
                          game.answer({ kind: "options", optionIds: [o.id] });
                        }
                      }}
                      className={
                        "flex items-center gap-3 rounded-xl border px-4 py-4 text-left font-medium transition-colors " +
                        (isSel
                          ? "border-gold bg-gold/15 text-gold"
                          : "border-panel-border bg-panel-2/40 hover:border-gold/50")
                      }
                    >
                      <span
                        className={
                          "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-sm font-bold " +
                          (isSel ? "border-gold text-gold" : "border-gold/50 text-gold")
                        }
                      >
                        {answerLetter(i)}
                      </span>
                      <span>{o.text}</span>
                    </button>
                  );
                })}
              </div>
              {state.question.allowMultiple ? (
                <button
                  type="button"
                  disabled={selected.length === 0}
                  onClick={() => game.answer({ kind: "options", optionIds: selected })}
                  className={primaryButton}
                >
                  Submit {selected.length > 0 ? `(${selected.length})` : ""}
                </button>
              ) : null}
            </>
          ) : state.question.type === "NUMERIC" ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const value = Number(text);
                if (Number.isFinite(value)) game.answer({ kind: "number", value });
              }}
              className="space-y-3"
            >
              <input
                type="number"
                step="any"
                value={text}
                onChange={(e) => setText(e.target.value)}
                className={fieldInput}
                placeholder="Your number"
                autoFocus
              />
              <button type="submit" className={primaryButton}>
                Submit
              </button>
            </form>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (text.trim()) game.answer({ kind: "text", text: text.trim() });
              }}
              className="space-y-3"
            >
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                className={fieldInput}
                placeholder="Type your answer"
                autoFocus
              />
              <button type="submit" className={primaryButton}>
                Submit
              </button>
            </form>
          )}

          {ack && !ack.accepted ? (
            <p className="text-center text-sm text-amber-300">{ack.reason}</p>
          ) : null}
          <p className="mt-auto text-center text-xs text-white/40">
            {state.answeredCount}/{state.playerCount} answered
          </p>
        </section>
      ) : state.phase === "reveal" ? (
        <section className="flex flex-1 flex-col gap-5">
          {state.reveal.isPoll ? (
            <ResultBanner tone="neutral" title="Poll results in" />
          ) : state.you?.isCorrect ? (
            <ResultBanner tone="good" title="Correct!" subtitle={`+${formatPoints(state.you.pointsEarned)} points`} />
          ) : (
            <ResultBanner
              tone="bad"
              title={state.you?.answered ? "Not quite" : "No answer"}
              subtitle={state.you ? `Score: ${formatPoints(state.you.totalScore)}` : undefined}
            />
          )}

          <div>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-white/50">
              {state.reveal.isPoll ? "Distribution" : "Answer"}
            </h2>
            {state.reveal.options.length > 0 ? (
              <div className="space-y-2">
                {state.reveal.options.map((o) => (
                  <div
                    key={o.id}
                    className={
                      "flex items-center justify-between rounded-lg border px-4 py-2 text-sm " +
                      (o.isCorrect && !state.reveal.isPoll
                        ? "border-emerald-400/60 bg-emerald-500/10"
                        : "border-panel-border bg-panel-2/30")
                    }
                  >
                    <span>
                      {o.isCorrect && !state.reveal.isPoll ? "✓ " : ""}
                      {o.text}
                    </span>
                    <span className="text-white/50">{o.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-emerald-400/50 bg-emerald-500/10 px-4 py-3 text-sm">
                {state.reveal.type === "NUMERIC"
                  ? `Answer: ${state.reveal.numericAnswer ?? "—"}`
                  : `Accepted: ${(state.reveal.acceptedAnswers ?? []).join(", ") || "—"}`}
              </div>
            )}
          </div>

          <div>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-white/50">Leaderboard</h2>
            <LeaderboardList entries={state.leaderboard.slice(0, 5)} youId={playerId} />
          </div>
        </section>
      ) : (
        <section className="flex flex-1 flex-col gap-5">
          <div className="rounded-2xl border border-gold/40 bg-gold/5 p-8 text-center">
            <p className="text-sm uppercase tracking-widest text-white/50">Game over</p>
            {state.you ? (
              <>
                <p className="mt-2 text-4xl font-bold text-gold">#{state.you.rank}</p>
                <p className="mt-1 text-white/70">{formatPoints(state.you.score)} points</p>
              </>
            ) : null}
          </div>
          <LeaderboardList entries={state.leaderboard} youId={playerId} showDelta={false} />
          <Link href="/" className={`${ghostButton} w-full`}>
            Leave game
          </Link>
        </section>
      )}
    </main>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">{children}</div>
  );
}

function ResultBanner({
  tone,
  title,
  subtitle,
}: {
  tone: "good" | "bad" | "neutral";
  title: string;
  subtitle?: string;
}) {
  const cls =
    tone === "good"
      ? "border-emerald-400/60 bg-emerald-500/10 text-emerald-200"
      : tone === "bad"
        ? "border-red-400/50 bg-red-500/10 text-red-200"
        : "border-panel-border bg-panel-2/40 text-white/80";
  return (
    <div className={`rounded-2xl border px-4 py-6 text-center ${cls}`}>
      <p className="text-2xl font-bold">{title}</p>
      {subtitle ? <p className="mt-1 text-sm text-white/70">{subtitle}</p> : null}
    </div>
  );
}
