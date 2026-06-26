import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { GameForm, type SetSummary } from "@/components/game-form";
import { parseGameConfig, presetLadder, type GameInput } from "@/lib/game-config";
import type { ScoringMode, ValueSource } from "@/lib/quiz-types";

export const metadata = { title: "Edit game — Millionaire Quiz" };

export default async function EditGamePage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;
  const user = await requireUser();

  const game = await prisma.game.findFirst({ where: { id: gameId, ownerId: user.id } });
  if (!game) notFound();

  const sets = await prisma.questionSet.findMany({
    where: { ownerId: user.id },
    orderBy: { updatedAt: "desc" },
    include: { questions: { orderBy: { order: "asc" }, select: { order: true, title: true } } },
  });
  const playable: SetSummary[] = sets
    .map((s) => ({ id: s.id, title: s.title, questionCount: s.questions.length, questions: s.questions }))
    .filter((s) => s.questionCount > 0 || s.id === game.questionSetId);

  const currentSet = playable.find((s) => s.id === game.questionSetId);
  const custom = parseGameConfig(game.config).customLadder;
  const ladder = custom ?? (currentSet ? presetLadder(currentSet.questionCount) : []);

  const initial: GameInput = {
    gameId: game.id,
    title: game.title,
    questionSetId: game.questionSetId,
    scoringMode: game.scoringMode as ScoringMode,
    valueSource: game.valueSource as ValueSource,
    speedBonus: game.speedBonus,
    customLadder: ladder,
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href={`/games/${game.id}`} className="text-sm text-white/50 hover:text-gold">
          ← {game.title}
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Edit game</h1>
      </div>
      <div className="rounded-2xl border border-panel-border bg-panel/50 p-6">
        <GameForm sets={playable} initial={initial} isEdit />
      </div>
    </div>
  );
}
