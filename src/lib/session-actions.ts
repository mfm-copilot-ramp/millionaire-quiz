"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "./db";
import { requireUser } from "./auth";
import { generateJoinCode, normalizeJoinCode } from "./join-code";
import { setPlayerCookie } from "./player-cookie";

export interface SessionActionResult {
  ok: boolean;
  error?: string;
}

export interface JoinFormState {
  error?: string;
}

// ---------- Host: create / end / delete sessions ----------

async function ownedGame(gameId: string, userId: string) {
  return prisma.game.findFirst({
    where: { id: gameId, ownerId: userId },
    include: { questionSet: { select: { _count: { select: { questions: true } } } } },
  });
}

async function ownedSession(sessionId: string, userId: string) {
  return prisma.session.findFirst({
    where: { id: sessionId, game: { ownerId: userId } },
    select: { id: true, gameId: true, status: true },
  });
}

export async function createSession(gameId: string): Promise<SessionActionResult> {
  const user = await requireUser();

  const game = await ownedGame(gameId, user.id);
  if (!game) return { ok: false, error: "Game not found." };
  if (game.questionSet._count.questions === 0) {
    return { ok: false, error: "This game's question set has no questions yet." };
  }

  let joinCode = "";
  for (let attempt = 0; attempt < 12; attempt++) {
    const candidate = generateJoinCode(6);
    const clash = await prisma.session.findUnique({
      where: { joinCode: candidate },
      select: { id: true },
    });
    if (!clash) {
      joinCode = candidate;
      break;
    }
  }
  if (!joinCode) return { ok: false, error: "Could not allocate a join code. Try again." };

  const session = await prisma.session.create({ data: { gameId, joinCode } });
  redirect(`/games/${gameId}/sessions/${session.id}`);
}

export async function endSession(sessionId: string): Promise<void> {
  const user = await requireUser();
  const session = await ownedSession(sessionId, user.id);
  if (!session) return;

  await prisma.session.update({
    where: { id: sessionId },
    data: { status: "ENDED", endedAt: new Date() },
  });
  revalidatePath(`/games/${session.gameId}/sessions/${sessionId}`);
  revalidatePath(`/games/${session.gameId}`);
}

export async function deleteSession(sessionId: string): Promise<void> {
  const user = await requireUser();
  const session = await ownedSession(sessionId, user.id);
  if (!session) return;

  await prisma.session.delete({ where: { id: sessionId } });
  redirect(`/games/${session.gameId}`);
}

// ---------- Player: join a session by code + nickname ----------

const joinSchema = z.object({
  code: z.string().trim().min(1, "Enter a game code").max(12),
  nickname: z
    .string()
    .trim()
    .min(1, "Pick a nickname")
    .max(24, "Nickname must be 24 characters or fewer"),
});

export async function joinSession(
  _prev: JoinFormState,
  formData: FormData,
): Promise<JoinFormState> {
  const parsed = joinSchema.safeParse({
    code: formData.get("code"),
    nickname: formData.get("nickname"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const code = normalizeJoinCode(parsed.data.code);
  const nickname = parsed.data.nickname;

  const session = await prisma.session.findUnique({
    where: { joinCode: code },
    select: { id: true, status: true },
  });
  if (!session) return { error: "No game found with that code." };
  if (session.status === "ENDED") return { error: "That game has already ended." };

  // Same nickname in a session is treated as a rejoin so a refresh/reconnect
  // keeps the player's accumulated score rather than creating a duplicate.
  const existing = await prisma.player.findUnique({
    where: { sessionId_nickname: { sessionId: session.id, nickname } },
    select: { id: true },
  });
  const player =
    existing ??
    (await prisma.player.create({
      data: { sessionId: session.id, nickname },
      select: { id: true },
    }));

  await setPlayerCookie({ sessionId: session.id, playerId: player.id, nickname });
  redirect(`/play/${code}`);
}
