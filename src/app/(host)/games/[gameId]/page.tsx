import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { ScoringMode, ValueSource } from "@/lib/quiz-types";
import {
  SCORING_MODE_LABELS,
  VALUE_SOURCE_LABELS,
  parseGameConfig,
  presetLadder,
} from "@/lib/game-config";
import { primaryButton, ghostButton } from "@/components/ui";
import { DeleteGameButton } from "@/components/delete-game-button";

export const metadata = { title: "Game — Millionaire Quiz" };

export default async function GameDetailPage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;
  const user = await requireUser();

  const game = await prisma.game.findFirst({
    where: { id: gameId, ownerId: user.id },
    include: {
      questionSet: { select: { id: true, title: true, _count: { select: { questions: true } } } },
      sessions: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!game) notFound();

  const mode = game.scoringMode as ScoringMode;
  const source = game.valueSource as ValueSource;
  const questionCount = game.questionSet._count.questions;
  const custom = parseGameConfig(game.config).customLadder;
  const ladder =
    mode === "ESCALATING"
      ? source === "CUSTOM" && custom
        ? custom
        : presetLadder(questionCount)
      : null;

  return (
    <div className="space-y-8">
      <div>
        <Link href="/games" className="text-sm text-white/50 hover:text-gold">
          ← Games
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{game.title}</h1>
            <Link href={`/sets/${game.questionSet.id}`} className="text-sm text-white/60 hover:text-gold">
              {game.questionSet.title} · {questionCount} question{questionCount === 1 ? "" : "s"}
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/games/${game.id}/edit`} className={ghostButton}>
              Edit
            </Link>
            <DeleteGameButton gameId={game.id} />
          </div>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-panel-border bg-panel/60 p-4">
          <div className="text-xs uppercase tracking-wide text-white/50">Scoring mode</div>
          <div className="mt-1 font-semibold text-gold">{SCORING_MODE_LABELS[mode]}</div>
        </div>
        <div className="rounded-xl border border-panel-border bg-panel/60 p-4">
          <div className="text-xs uppercase tracking-wide text-white/50">Values</div>
          <div className="mt-1 font-semibold text-gold">{VALUE_SOURCE_LABELS[source]}</div>
        </div>
        <div className="rounded-xl border border-panel-border bg-panel/60 p-4">
          <div className="text-xs uppercase tracking-wide text-white/50">Speed bonus</div>
          <div className="mt-1 font-semibold text-gold">{game.speedBonus ? "On" : "Off"}</div>
        </div>
      </section>

      {ladder ? (
        <section className="rounded-xl border border-panel-border bg-panel/40 p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/50">Value ladder</h2>
          <div className="flex flex-wrap gap-2">
            {ladder.map((value, i) => (
              <span key={i} className="rounded-md bg-gold/10 px-2 py-1 text-sm text-gold">
                Q{i + 1}: {value.toLocaleString()}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-xl border border-panel-border bg-panel/40 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Live sessions</h2>
          <button type="button" disabled className={`${primaryButton} w-auto cursor-not-allowed px-5 opacity-60`}>
            Start a session
          </button>
        </div>
        {game.sessions.length === 0 ? (
          <p className="mt-4 text-sm text-white/50">
            No sessions yet. Hosting live sessions (with join codes players can use) is wired up in the next step.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {game.sessions.map((s) => (
              <li key={s.id} className="rounded-lg border border-panel-border bg-panel-2/30 px-4 py-2 text-sm">
                <span className="font-mono font-semibold text-gold">{s.joinCode}</span>
                <span className="ml-3 text-white/60">{s.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
