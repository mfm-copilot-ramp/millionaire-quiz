import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { GameForm, type SetSummary } from "@/components/game-form";
import type { GameInput } from "@/lib/game-config";

export const metadata = { title: "New game — Millionaire Quiz" };

async function loadSets(userId: string): Promise<SetSummary[]> {
  const sets = await prisma.questionSet.findMany({
    where: { ownerId: userId },
    orderBy: { updatedAt: "desc" },
    include: { questions: { orderBy: { order: "asc" }, select: { order: true, title: true } } },
  });
  return sets.map((s) => ({
    id: s.id,
    title: s.title,
    questionCount: s.questions.length,
    questions: s.questions,
  }));
}

export default async function NewGamePage({
  searchParams,
}: {
  searchParams: Promise<{ set?: string }>;
}) {
  const user = await requireUser();
  const { set: preselect } = await searchParams;
  const sets = await loadSets(user.id);
  const playable = sets.filter((s) => s.questionCount > 0);

  const initialSet = playable.find((s) => s.id === preselect) ?? playable[0];

  const initial: GameInput = {
    title: initialSet ? `${initialSet.title} game` : "",
    questionSetId: initialSet?.id ?? "",
    scoringMode: "WEIGHTED",
    valueSource: "PRESET",
    speedBonus: true,
    customLadder: [],
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/games" className="text-sm text-white/50 hover:text-gold">
          ← Games
        </Link>
        <h1 className="mt-2 text-2xl font-bold">New game</h1>
      </div>

      {playable.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-panel-border bg-panel/30 p-8 text-center">
          <p className="text-white/70">You need a question set with at least one question first.</p>
          <Link href="/sets/new" className="mt-4 inline-block font-medium text-gold hover:underline">
            Create a question set →
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl border border-panel-border bg-panel/50 p-6">
          <GameForm sets={playable} initial={initial} isEdit={false} />
        </div>
      )}
    </div>
  );
}
