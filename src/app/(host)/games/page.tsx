import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SCORING_MODE_LABELS, VALUE_SOURCE_LABELS } from "@/lib/game-config";
import type { ScoringMode, ValueSource } from "@/lib/quiz-types";
import { primaryButton } from "@/components/ui";

export const metadata = { title: "Games — Millionaire Quiz" };

export default async function GamesPage() {
  const user = await requireUser();
  const games = await prisma.game.findMany({
    where: { ownerId: user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      questionSet: { select: { title: true } },
      _count: { select: { sessions: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Games</h1>
          <p className="mt-1 text-white/60">A game pairs a question set with scoring rules, and groups your live sessions.</p>
        </div>
        <Link href="/games/new" className={`${primaryButton} w-auto px-5`}>
          + New game
        </Link>
      </div>

      {games.length === 0 ? (
        <div className="rounded-xl border border-dashed border-panel-border bg-panel/30 p-10 text-center">
          <p className="text-white/70">No games yet.</p>
          <Link href="/games/new" className="mt-4 inline-block font-medium text-gold hover:underline">
            Create your first game →
          </Link>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {games.map((game) => (
            <li key={game.id}>
              <Link
                href={`/games/${game.id}`}
                className="block h-full rounded-xl border border-panel-border bg-panel/60 p-5 transition-colors hover:border-gold/50"
              >
                <h2 className="text-lg font-semibold text-foreground">{game.title}</h2>
                <p className="mt-1 text-sm text-white/60">{game.questionSet.title}</p>
                <p className="mt-3 text-xs text-white/50">
                  {SCORING_MODE_LABELS[game.scoringMode as ScoringMode]} ·{" "}
                  {VALUE_SOURCE_LABELS[game.valueSource as ValueSource]} ·{" "}
                  {game._count.sessions} session{game._count.sessions === 1 ? "" : "s"}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
