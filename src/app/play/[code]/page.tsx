import Link from "next/link";
import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { prisma } from "@/lib/db";
import { getPlayerIdentity } from "@/lib/player-cookie";
import { normalizeJoinCode } from "@/lib/join-code";

export const metadata = { title: "Playing — Millionaire Quiz" };

export default async function PlayPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const joinCode = normalizeJoinCode(decodeURIComponent(code));

  const session = await prisma.session.findUnique({
    where: { joinCode },
    include: {
      game: { select: { title: true } },
      players: { orderBy: { joinedAt: "asc" }, select: { id: true, nickname: true } },
    },
  });

  if (!session) {
    return (
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-md text-center">
          <Brand size="md" className="justify-center" />
          <div className="mt-8 rounded-2xl border border-panel-border bg-panel/70 p-8">
            <p className="text-white/70">We couldn&apos;t find a game with that code.</p>
            <Link href="/" className="mt-6 inline-block text-sm font-medium text-gold hover:underline">
              ← Back to home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const identity = await getPlayerIdentity();
  const inThisSession =
    identity &&
    identity.sessionId === session.id &&
    session.players.some((p) => p.id === identity.playerId);

  if (!inThisSession) {
    redirect(`/join/${joinCode}`);
  }

  const ended = session.status === "ENDED";

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-md text-center">
        <Brand size="md" className="justify-center" />
        <div className="mt-8 rounded-2xl border border-panel-border bg-panel/70 p-8 shadow-xl backdrop-blur">
          <p className="text-sm uppercase tracking-widest text-white/50">{session.game.title}</p>
          {ended ? (
            <>
              <p className="mt-4 text-xl font-semibold text-gold">This game has ended</p>
              <p className="mt-2 text-white/70">Thanks for playing, {identity!.nickname}!</p>
            </>
          ) : (
            <>
              <p className="mt-4 text-2xl font-bold text-gold">You&apos;re in!</p>
              <p className="mt-2 text-white/70">
                Playing as <span className="font-semibold text-foreground">{identity!.nickname}</span>
              </p>
              <p className="mt-6 text-sm text-white/60">
                Hang tight — the host will start the quiz soon. Keep this screen open.
              </p>
            </>
          )}

          <div className="mt-6 border-t border-panel-border pt-4">
            <p className="text-xs uppercase tracking-wide text-white/40">
              {session.players.length} player{session.players.length === 1 ? "" : "s"} in the lobby
            </p>
            <ul className="mt-3 flex flex-wrap justify-center gap-2">
              {session.players.map((p) => (
                <li
                  key={p.id}
                  className={
                    "rounded-lg border px-3 py-1 text-sm " +
                    (p.id === identity!.playerId
                      ? "border-gold/50 bg-gold/10 text-gold"
                      : "border-panel-border bg-panel-2/40 text-white/70")
                  }
                >
                  {p.nickname}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <Link href="/" className="mt-6 inline-block text-sm text-white/50 hover:text-gold">
          ← Leave game
        </Link>
      </div>
    </main>
  );
}
