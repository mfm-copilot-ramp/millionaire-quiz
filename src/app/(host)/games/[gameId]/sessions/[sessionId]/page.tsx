import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CopyButton } from "@/components/copy-button";
import { SessionHostControls } from "@/components/session-host-controls";

export const metadata = { title: "Live session — Millionaire Quiz" };

const STATUS_LABEL: Record<string, string> = {
  LOBBY: "In lobby",
  IN_PROGRESS: "In progress",
  ENDED: "Ended",
};

export default async function HostSessionPage({
  params,
}: {
  params: Promise<{ gameId: string; sessionId: string }>;
}) {
  const { gameId, sessionId } = await params;
  const user = await requireUser();

  const session = await prisma.session.findFirst({
    where: { id: sessionId, gameId, game: { ownerId: user.id } },
    include: {
      game: { select: { id: true, title: true } },
      players: { orderBy: { joinedAt: "asc" }, select: { id: true, nickname: true, connected: true } },
    },
  });
  if (!session) notFound();

  const h = await headers();
  const host = h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = host ? `${proto}://${host}` : "";
  const joinUrl = `${origin}/join/${session.joinCode}`;
  const ended = session.status === "ENDED";

  return (
    <div className="space-y-8">
      <div>
        <Link href={`/games/${session.game.id}`} className="text-sm text-white/50 hover:text-gold">
          ← {session.game.title}
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Live session</h1>
            <p className="text-sm text-white/60">{STATUS_LABEL[session.status] ?? session.status}</p>
          </div>
          <SessionHostControls sessionId={session.id} ended={ended} />
        </div>
      </div>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-panel-border bg-panel/60 p-6 text-center">
          <div className="text-xs uppercase tracking-widest text-white/50">Game code</div>
          <div className="mt-2 text-5xl font-bold tracking-[0.3em] text-gold">{session.joinCode}</div>
          <div className="mt-4 flex items-center justify-center gap-2">
            <CopyButton value={session.joinCode} label="Copy code" />
            {origin ? <CopyButton value={joinUrl} label="Copy join link" /> : null}
          </div>
          {origin ? (
            <p className="mt-3 break-all text-xs text-white/40">{joinUrl}</p>
          ) : null}
        </div>

        <div className="rounded-2xl border border-panel-border bg-panel/60 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-white/50">
              Players
            </h2>
            <span className="rounded-full bg-gold/10 px-2.5 py-0.5 text-sm font-semibold text-gold">
              {session.players.length}
            </span>
          </div>
          {session.players.length === 0 ? (
            <p className="mt-4 text-sm text-white/50">
              Waiting for players to join with the code…
            </p>
          ) : (
            <ul className="mt-4 flex flex-wrap gap-2">
              {session.players.map((p) => (
                <li
                  key={p.id}
                  className="rounded-lg border border-panel-border bg-panel-2/40 px-3 py-1.5 text-sm"
                >
                  {p.nickname}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-panel-border bg-panel/40 p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Presenter controls</h2>
            <p className="mt-1 text-sm text-white/50">
              {ended
                ? "This session has ended."
                : "Start the quiz, advance questions, and reveal answers live."}
            </p>
          </div>
          <button
            type="button"
            disabled
            className="inline-flex w-auto cursor-not-allowed items-center justify-center rounded-lg bg-gold px-5 py-2.5 font-semibold text-[#1a1330] opacity-60"
          >
            Begin quiz
          </button>
        </div>
        <p className="mt-4 rounded-lg border border-panel-border bg-panel-2/30 px-4 py-3 text-xs text-white/50">
          Real-time presenter controls (synced countdown, live answer counts, reveal) come
          online in the next step. The lobby above already accepts players right now.
        </p>
      </section>
    </div>
  );
}
