import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { primaryButton } from "@/components/ui";

export const metadata = { title: "Question sets — Millionaire Quiz" };

export default async function SetsPage() {
  const user = await requireUser();
  const sets = await prisma.questionSet.findMany({
    where: { ownerId: user.id },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { questions: true, games: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Question sets</h1>
          <p className="mt-1 text-white/60">Reusable lists of questions you can turn into games.</p>
        </div>
        <Link href="/sets/new" className={`${primaryButton} w-auto px-5`}>
          + New set
        </Link>
      </div>

      {sets.length === 0 ? (
        <div className="rounded-xl border border-dashed border-panel-border bg-panel/30 p-10 text-center">
          <p className="text-white/70">You haven&apos;t created any question sets yet.</p>
          <Link href="/sets/new" className="mt-4 inline-block font-medium text-gold hover:underline">
            Create your first set →
          </Link>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {sets.map((set) => (
            <li key={set.id}>
              <Link
                href={`/sets/${set.id}`}
                className="block h-full rounded-xl border border-panel-border bg-panel/60 p-5 transition-colors hover:border-gold/50"
              >
                <h2 className="text-lg font-semibold text-foreground">{set.title}</h2>
                {set.description ? (
                  <p className="mt-1 line-clamp-2 text-sm text-white/60">{set.description}</p>
                ) : null}
                <p className="mt-3 text-xs text-white/50">
                  {set._count.questions} question{set._count.questions === 1 ? "" : "s"} ·{" "}
                  {set._count.games} game{set._count.games === 1 ? "" : "s"}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
