import Link from "next/link";
import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { prisma } from "@/lib/db";
import { getPlayerIdentity } from "@/lib/player-cookie";
import { normalizeJoinCode } from "@/lib/join-code";
import { PlayStage } from "@/components/play-stage";

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
    select: {
      id: true,
      players: { select: { id: true } },
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

  return (
    <PlayStage
      sessionId={session.id}
      playerId={identity!.playerId}
      nickname={identity!.nickname}
    />
  );
}
