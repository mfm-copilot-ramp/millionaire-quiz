import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { primaryButton } from "@/components/ui";

export const metadata = { title: "Dashboard — Millionaire Quiz" };

function StatCard({ label, value, href }: { label: string; value: number; href?: string }) {
  const inner = (
    <>
      <div className="text-3xl font-bold text-gold">{value}</div>
      <div className="mt-1 text-sm text-white/60">{label}</div>
    </>
  );
  const className =
    "block rounded-xl border border-panel-border bg-panel/60 p-5 transition-colors";
  return href ? (
    <Link href={href} className={`${className} hover:border-gold/50`}>
      {inner}
    </Link>
  ) : (
    <div className={className}>{inner}</div>
  );
}

export default async function DashboardPage() {
  const user = await requireUser();

  const [questionSetCount, gameCount, sessionCount] = await Promise.all([
    prisma.questionSet.count({ where: { ownerId: user.id } }),
    prisma.game.count({ where: { ownerId: user.id } }),
    prisma.session.count({ where: { game: { ownerId: user.id } } }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Welcome back, {user.name.split(" ")[0]} 👋</h1>
        <p className="mt-1 text-white/60">
          Build question sets, configure scoring, and host live sessions your players can join with a code.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Question sets" value={questionSetCount} href="/sets" />
        <StatCard label="Games" value={gameCount} href="/games" />
        <StatCard label="Sessions hosted" value={sessionCount} />
      </div>

      <div>
        <Link href="/sets/new" className={`${primaryButton} w-auto px-6`}>
          + Create a question set
        </Link>
      </div>

      <section className="rounded-xl border border-panel-border bg-panel/40 p-6">
        <h2 className="text-lg font-semibold text-gold">Getting started</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-white/70">
          <li>Create a question set and add questions (multiple choice, true/false, select-all, text, numeric, or poll).</li>
          <li>Spin up a game from that set and pick how scoring works.</li>
          <li>Open a live session and share the join code so players can play along.</li>
        </ol>
        <p className="mt-4 text-sm text-white/50">
          Authoring and live hosting tools are being wired up next.
        </p>
      </section>
    </div>
  );
}
