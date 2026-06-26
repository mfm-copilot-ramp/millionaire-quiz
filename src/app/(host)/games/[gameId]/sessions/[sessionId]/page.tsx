import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { signSocketToken } from "@/lib/socket-token";
import { CopyButton } from "@/components/copy-button";
import { SessionHostControls } from "@/components/session-host-controls";
import { HostStage } from "@/components/host-stage";

export const metadata = { title: "Live session — Millionaire Quiz" };

export default async function HostSessionPage({
  params,
}: {
  params: Promise<{ gameId: string; sessionId: string }>;
}) {
  const { gameId, sessionId } = await params;
  const user = await requireUser();

  const session = await prisma.session.findFirst({
    where: { id: sessionId, gameId, game: { ownerId: user.id } },
    include: { game: { select: { id: true, title: true } } },
  });
  if (!session) notFound();

  const h = await headers();
  const host = h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = host ? `${proto}://${host}` : "";
  const joinUrl = `${origin}/join/${session.joinCode}`;

  const token = await signSocketToken({ sub: user.id, sessionId: session.id, role: "host" });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href={`/games/${session.game.id}`} className="text-sm text-white/50 hover:text-gold">
          ← {session.game.title}
        </Link>
        <div className="flex items-center gap-2">
          {origin ? <CopyButton value={joinUrl} label="Copy join link" /> : null}
          <SessionHostControls sessionId={session.id} ended={false} showEnd={false} />
        </div>
      </div>

      <HostStage
        token={token}
        gameId={session.game.id}
        joinCode={session.joinCode}
        gameTitle={session.game.title}
        joinUrl={joinUrl}
      />
    </div>
  );
}
