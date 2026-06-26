import Link from "next/link";
import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { JoinForm } from "@/components/join-form";
import { prisma } from "@/lib/db";
import { getPlayerIdentity } from "@/lib/player-cookie";
import { normalizeJoinCode } from "@/lib/join-code";

export const metadata = { title: "Join a game — Millionaire Quiz" };

export default async function JoinPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const joinCode = normalizeJoinCode(decodeURIComponent(code));

  const session = await prisma.session.findUnique({
    where: { joinCode },
    select: {
      id: true,
      status: true,
      game: { select: { title: true } },
      players: { select: { id: true } },
    },
  });

  // Already joined this session on this device? Jump straight to the game.
  if (session && session.status !== "ENDED") {
    const identity = await getPlayerIdentity();
    if (
      identity &&
      identity.sessionId === session.id &&
      session.players.some((p) => p.id === identity.playerId)
    ) {
      redirect(`/play/${joinCode}`);
    }
  }

  const notJoinable = !session || session.status === "ENDED";

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-md text-center">
        <Brand size="md" className="justify-center" />
        <div className="mt-8 rounded-2xl border border-panel-border bg-panel/70 p-8 shadow-xl backdrop-blur">
          <p className="text-sm uppercase tracking-widest text-white/50">Game code</p>
          <p className="mt-2 text-4xl font-bold tracking-widest text-gold">{joinCode}</p>

          {notJoinable ? (
            <>
              <p className="mt-6 text-white/70">
                {session
                  ? "This game has already ended."
                  : "We couldn't find a game with that code. Double-check it with your host."}
              </p>
              <Link
                href="/"
                className="mt-6 inline-block text-sm font-medium text-gold hover:underline"
              >
                ← Back to home
              </Link>
            </>
          ) : (
            <>
              <p className="mt-2 text-sm text-white/60">{session!.game.title}</p>
              <div className="mt-6">
                <JoinForm code={joinCode} />
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
