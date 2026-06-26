"use client";

import Link from "next/link";
import { useGameSocket } from "@/components/use-game-socket";
import { Countdown, LeaderboardList, formatPoints } from "@/components/game-shared";
import { primaryButton, ghostButton } from "@/components/ui";

const TYPE_HINT: Record<string, string> = {
  MULTIPLE_CHOICE: "Single correct answer",
  TRUE_FALSE: "True or false",
  MULTIPLE_SELECT: "Select all that apply",
  SHORT_TEXT: "Typed answer",
  NUMERIC: "Numeric answer",
  POLL: "Poll — no points",
};

export function HostStage({
  token,
  gameId,
  joinCode,
  gameTitle,
  joinUrl,
}: {
  token: string;
  gameId: string;
  joinCode: string;
  gameTitle: string;
  joinUrl: string;
}) {
  const game = useGameSocket({ role: "host", token });
  const { state, remainingMs, error, connected } = game;

  const code = state && "joinCode" in state ? state.joinCode : joinCode;
  const title = state?.gameTitle ?? gameTitle;

  function primaryLabel(): string | null {
    if (!state) return null;
    switch (state.phase) {
      case "lobby":
        return "Start quiz";
      case "question":
        return "Reveal answer";
      case "reveal":
        return state.reveal.index + 1 >= state.reveal.total ? "Finish & show results" : "Next question";
      case "gameover":
        return null;
    }
  }

  const label = primaryLabel();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-sm text-white/50">
            Code <span className="font-mono font-semibold tracking-widest text-gold">{code}</span>
            {!connected ? <span className="ml-2 text-amber-300">· connecting…</span> : null}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {label ? (
            <button type="button" onClick={game.next} className={`${primaryButton} w-auto px-5`}>
              {label}
            </button>
          ) : null}
          {state && state.phase !== "gameover" ? (
            <button
              type="button"
              onClick={() => {
                if (confirm("End the game now?")) game.end();
              }}
              className={ghostButton}
            >
              End
            </button>
          ) : null}
        </div>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      {!state ? (
        <p className="text-white/50">Loading session…</p>
      ) : state.phase === "lobby" ? (
        <section className="space-y-6">
          <div className="rounded-2xl border border-panel-border bg-panel/60 p-8 text-center">
            <p className="text-sm uppercase tracking-widest text-white/50">Join at</p>
            <p className="mt-1 break-all text-sm text-white/70">{joinUrl}</p>
            <p className="mt-4 text-xs uppercase tracking-widest text-white/50">Game code</p>
            <p className="text-6xl font-bold tracking-[0.3em] text-gold">{code}</p>
          </div>
          <div className="rounded-2xl border border-panel-border bg-panel/60 p-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-white/50">Players</h2>
              <span className="rounded-full bg-gold/10 px-2.5 py-0.5 text-sm font-semibold text-gold">
                {state.players.length}
              </span>
            </div>
            {state.players.length === 0 ? (
              <p className="text-sm text-white/50">Waiting for players…</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {state.players.map((p) => (
                  <li
                    key={p.id}
                    className={
                      "rounded-lg border px-3 py-1.5 text-sm " +
                      (p.connected
                        ? "border-gold/40 bg-gold/10 text-gold"
                        : "border-panel-border bg-panel-2/30 text-white/40")
                    }
                  >
                    {p.nickname}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      ) : state.phase === "question" ? (
        <section className="space-y-5">
          <div className="flex items-center justify-between text-sm text-white/50">
            <span>
              Question {state.question.index + 1} of {state.question.total} ·{" "}
              {TYPE_HINT[state.question.type] ?? state.question.type}
            </span>
            <span>
              <span className="font-semibold text-gold">{state.answeredCount}</span> / {state.playerCount}{" "}
              answered
            </span>
          </div>
          <Countdown remainingMs={remainingMs} totalSeconds={state.question.timeLimitSeconds} />
          <h2 className="text-2xl font-bold">{state.question.title}</h2>
          {state.question.options.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {state.question.options.map((o) => (
                <div
                  key={o.id}
                  className="rounded-xl border border-panel-border bg-panel-2/30 px-4 py-3 font-medium"
                >
                  {o.text}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-white/60">Players are typing their answers…</p>
          )}
        </section>
      ) : state.phase === "reveal" ? (
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            <p className="text-sm text-white/50">
              Question {state.reveal.index + 1} of {state.reveal.total}
              {state.reveal.isPoll ? " · Poll" : ""}
            </p>
            <h2 className="mb-4 text-xl font-bold">{state.reveal.title}</h2>
            {state.reveal.options.length > 0 ? (
              <div className="space-y-2">
                {state.reveal.options.map((o) => {
                  const pct =
                    state.reveal.totalAnswers > 0
                      ? Math.round((o.count / state.reveal.totalAnswers) * 100)
                      : 0;
                  return (
                    <div
                      key={o.id}
                      className={
                        "rounded-lg border px-4 py-2 " +
                        (o.isCorrect && !state.reveal.isPoll
                          ? "border-emerald-400/60 bg-emerald-500/10"
                          : "border-panel-border bg-panel-2/30")
                      }
                    >
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">
                          {o.isCorrect && !state.reveal.isPoll ? "✓ " : ""}
                          {o.text}
                        </span>
                        <span className="text-white/60">
                          {o.count} ({pct}%)
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-panel-2/60">
                        <div
                          className={o.isCorrect && !state.reveal.isPoll ? "h-full bg-emerald-400" : "h-full bg-gold/70"}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-lg border border-emerald-400/50 bg-emerald-500/10 px-4 py-3 text-sm">
                {state.reveal.type === "NUMERIC"
                  ? `Answer: ${state.reveal.numericAnswer ?? "—"}${
                      state.reveal.numericTolerance ? ` (±${state.reveal.numericTolerance})` : ""
                    }`
                  : `Accepted: ${(state.reveal.acceptedAnswers ?? []).join(", ") || "—"}`}
              </div>
            )}
          </div>
          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/50">Leaderboard</h2>
            <LeaderboardList entries={state.leaderboard} />
          </div>
        </section>
      ) : (
        <section className="space-y-6">
          <div className="rounded-2xl border border-gold/40 bg-gold/5 p-8 text-center">
            <p className="text-sm uppercase tracking-widest text-white/50">Final results</p>
            {state.leaderboard[0] ? (
              <p className="mt-2 text-3xl font-bold text-gold">
                🏆 {state.leaderboard[0].nickname} — {formatPoints(state.leaderboard[0].score)}
              </p>
            ) : (
              <p className="mt-2 text-white/60">No players took part.</p>
            )}
          </div>
          <LeaderboardList entries={state.leaderboard} />
          <Link href={`/games/${gameId}`} className={`${ghostButton} w-full`}>
            Back to game
          </Link>
        </section>
      )}
    </div>
  );
}
