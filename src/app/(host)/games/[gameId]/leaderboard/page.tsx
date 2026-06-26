import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { aggregateGameLeaderboard } from "@/lib/cumulative";

export const metadata = { title: "Leaderboard — Millionaire Quiz" };

function rankBadge(rank: number): string {
  return rank === 1
    ? "bg-gold text-[#1a1330]"
    : rank === 2
      ? "bg-white/70 text-[#1a1330]"
      : rank === 3
        ? "bg-amber-700/80 text-white"
        : "bg-panel-2/70 text-white/70";
}

export default async function GameLeaderboardPage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;
  const user = await requireUser();

  const game = await prisma.game.findFirst({
    where: { id: gameId, ownerId: user.id },
    include: {
      sessions: {
        orderBy: { createdAt: "desc" },
        include: {
          players: { select: { nickname: true, score: true }, orderBy: { score: "desc" } },
        },
      },
    },
  });
  if (!game) notFound();

  const playedSessions = game.sessions.filter((s) => s.status !== "LOBBY");
  const board = aggregateGameLeaderboard(playedSessions);

  return (
    <div className="space-y-8">
      <div>
        <Link href={`/games/${game.id}`} className="text-sm text-white/50 hover:text-gold">
          ← {game.title}
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Cumulative leaderboard</h1>
        <p className="text-sm text-white/50">
          Scores roll up across every session of this game, by nickname.
        </p>
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-panel-border bg-panel/60 p-4">
          <div className="text-xs uppercase tracking-wide text-white/50">Sessions played</div>
          <div className="mt-1 text-2xl font-bold text-gold">{playedSessions.length}</div>
        </div>
        <div className="rounded-xl border border-panel-border bg-panel/60 p-4">
          <div className="text-xs uppercase tracking-wide text-white/50">Unique players</div>
          <div className="mt-1 text-2xl font-bold text-gold">{board.length}</div>
        </div>
        <div className="rounded-xl border border-panel-border bg-panel/60 p-4">
          <div className="text-xs uppercase tracking-wide text-white/50">Top score</div>
          <div className="mt-1 text-2xl font-bold text-gold">
            {board[0] ? board[0].totalScore.toLocaleString() : "—"}
          </div>
        </div>
      </section>

      {board.length === 0 ? (
        <p className="rounded-xl border border-panel-border bg-panel/40 p-6 text-sm text-white/60">
          No completed sessions yet. Start a session and play through it — results will appear here.
        </p>
      ) : (
        <section className="space-y-2">
          {board.map((e) => (
            <div
              key={e.key}
              className={
                "flex items-center justify-between rounded-lg border px-4 py-3 " +
                (e.rank === 1
                  ? "border-gold/60 bg-gold/10"
                  : "border-panel-border bg-panel-2/30")
              }
            >
              <span className="flex items-center gap-3">
                <span
                  className={
                    "inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold " +
                    rankBadge(e.rank)
                  }
                >
                  {e.rank}
                </span>
                <span>
                  <span className="font-semibold">{e.nickname}</span>
                  <span className="ml-2 text-xs text-white/40">
                    {e.sessionsPlayed} session{e.sessionsPlayed === 1 ? "" : "s"} · best{" "}
                    {e.bestScore.toLocaleString()}
                  </span>
                </span>
              </span>
              <span className="text-lg font-bold text-gold">{e.totalScore.toLocaleString()}</span>
            </div>
          ))}
        </section>
      )}

      {playedSessions.length > 0 ? (
        <section className="rounded-xl border border-panel-border bg-panel/40 p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-white/50">
            By session
          </h2>
          <ul className="space-y-2">
            {playedSessions.map((s) => {
              const top = s.players[0];
              return (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-panel-border bg-panel-2/30 px-4 py-2.5 text-sm"
                >
                  <Link
                    href={`/games/${game.id}/sessions/${s.id}`}
                    className="font-mono font-semibold tracking-widest text-gold hover:underline"
                  >
                    {s.joinCode}
                  </Link>
                  <span className="flex-1 text-right text-white/50">
                    {s.players.length} player{s.players.length === 1 ? "" : "s"}
                    {top ? ` · top: ${top.nickname} (${top.score.toLocaleString()})` : ""}
                  </span>
                  <span className="text-xs uppercase tracking-wide text-white/40">{s.status}</span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
