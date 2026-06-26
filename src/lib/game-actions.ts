"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "./db";
import { requireUser } from "./auth";
import {
  serializeGameConfig,
  type GameInput,
  type SaveGameResult,
} from "./game-config";

const gameSchema = z.object({
  gameId: z.string().optional(),
  title: z.string().trim().min(1, "Give your game a title").max(120, "Title is too long"),
  questionSetId: z.string().min(1, "Choose a question set"),
  scoringMode: z.enum(["WEIGHTED", "ESCALATING"]),
  valueSource: z.enum(["PRESET", "CUSTOM"]),
  speedBonus: z.boolean(),
  customLadder: z.array(z.number().int().min(0).max(100_000_000)),
});

async function ownedSet(setId: string, userId: string) {
  return prisma.questionSet.findFirst({
    where: { id: setId, ownerId: userId },
    include: { _count: { select: { questions: true } } },
  });
}

export async function saveGame(input: GameInput): Promise<SaveGameResult> {
  const user = await requireUser();

  const parsed = gameSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data as GameInput;

  const set = await ownedSet(data.questionSetId, user.id);
  if (!set) return { ok: false, error: "Question set not found." };
  if (set._count.questions === 0) {
    return { ok: false, error: "Add at least one question to the set before creating a game." };
  }

  if (data.scoringMode === "ESCALATING" && data.valueSource === "CUSTOM") {
    if (data.customLadder.length !== set._count.questions) {
      return { ok: false, error: "Enter a custom value for every question." };
    }
  }

  if (data.gameId) {
    const existing = await prisma.game.findFirst({
      where: { id: data.gameId, ownerId: user.id },
      select: { id: true },
    });
    if (!existing) return { ok: false, error: "Game not found." };
  }

  const config = serializeGameConfig({
    scoringMode: data.scoringMode,
    valueSource: data.valueSource,
    customLadder: data.customLadder,
  });

  const fields = {
    title: data.title.trim(),
    questionSetId: set.id,
    scoringMode: data.scoringMode,
    valueSource: data.valueSource,
    speedBonus: data.speedBonus,
    config,
  };

  let gameId: string;
  if (data.gameId) {
    const updated = await prisma.game.update({ where: { id: data.gameId }, data: fields });
    gameId = updated.id;
    revalidatePath(`/games/${gameId}`);
  } else {
    const created = await prisma.game.create({ data: { ownerId: user.id, ...fields } });
    gameId = created.id;
  }

  return { ok: true, id: gameId };
}

export async function deleteGame(gameId: string): Promise<void> {
  const user = await requireUser();
  await prisma.game.deleteMany({ where: { id: gameId, ownerId: user.id } });
  redirect("/games");
}
