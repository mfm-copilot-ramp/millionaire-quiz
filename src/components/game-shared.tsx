import type { LeaderboardEntry } from "@/server/events";

export function formatPoints(n: number): string {
  return Math.round(n).toLocaleString();
}

/** A, B, C, D … for option tiles (classic millionaire styling). */
export function answerLetter(index: number): string {
  return String.fromCharCode(65 + index);
}

export function Countdown({
  remainingMs,
  totalSeconds,
}: {
  remainingMs: number | null;
  totalSeconds: number;
}) {
  const totalMs = Math.max(1, totalSeconds * 1000);
  const remaining = remainingMs ?? totalMs;
  const pct = Math.max(0, Math.min(100, (remaining / totalMs) * 100));
  const seconds = Math.ceil(Math.max(0, remaining) / 1000);
  const urgent = seconds <= 5;

  return (
    <div className="w-full">
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-white/50">Time left</span>
        <span className={urgent ? "mq-pulse font-bold text-red-300" : "font-semibold text-gold"}>{seconds}s</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-panel-2/60">
        <div
          className={`h-full rounded-full transition-[width] duration-500 ease-linear ${
            urgent ? "bg-red-400" : "bg-gold"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function LeaderboardList({
  entries,
  youId,
  showDelta = true,
}: {
  entries: LeaderboardEntry[];
  youId?: string | null;
  showDelta?: boolean;
}) {
  if (entries.length === 0) {
    return <p className="text-sm text-white/50">No players yet.</p>;
  }
  return (
    <ol className="space-y-2">
      {entries.map((e) => {
        const isYou = youId && e.playerId === youId;
        return (
          <li
            key={e.playerId}
            className={
              "flex items-center justify-between rounded-lg border px-4 py-2.5 " +
              (isYou
                ? "border-gold/60 bg-gold/10"
                : "border-panel-border bg-panel-2/30")
            }
          >
            <span className="flex items-center gap-3">
              <span
                className={
                  "inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold " +
                  (e.rank === 1
                    ? "bg-gold text-[#1a1330]"
                    : e.rank === 2
                      ? "bg-white/70 text-[#1a1330]"
                      : e.rank === 3
                        ? "bg-amber-700/80 text-white"
                        : "bg-panel-2/70 text-white/70")
                }
              >
                {e.rank}
              </span>
              <span className="font-medium">
                {e.nickname}
                {isYou ? <span className="ml-1 text-xs text-gold">(you)</span> : null}
              </span>
            </span>
            <span className="flex items-baseline gap-2">
              {showDelta && e.lastPoints > 0 ? (
                <span className="text-xs font-medium text-emerald-300">+{formatPoints(e.lastPoints)}</span>
              ) : null}
              <span className="font-bold text-gold">{formatPoints(e.score)}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
