"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "./db";
import { requireUser } from "./auth";
import { QUESTION_TYPES } from "./quiz-types";
import {
  validateQuestion,
  toPersistence,
  type QuestionInput,
  type SaveQuestionResult,
} from "./question-forms";

export interface FormState {
  error?: string;
}

// ---------- Question sets ----------

async function ownedSet(setId: string, userId: string) {
  return prisma.questionSet.findFirst({ where: { id: setId, ownerId: userId } });
}

const setSchema = z.object({
  title: z.string().trim().min(1, "Give your set a title").max(120, "Title is too long"),
  description: z.string().trim().max(500, "Description is too long").optional(),
});

export async function createQuestionSet(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = setSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const set = await prisma.questionSet.create({
    data: {
      ownerId: user.id,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
    },
  });
  redirect(`/sets/${set.id}`);
}

export async function renameQuestionSet(
  setId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const set = await ownedSet(setId, user.id);
  if (!set) return { error: "Question set not found" };

  const parsed = setSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  await prisma.questionSet.update({
    where: { id: set.id },
    data: { title: parsed.data.title, description: parsed.data.description ?? null },
  });
  revalidatePath(`/sets/${set.id}`);
  return {};
}

export async function deleteQuestionSet(setId: string): Promise<void> {
  const user = await requireUser();
  const set = await ownedSet(setId, user.id);
  if (set) {
    await prisma.questionSet.delete({ where: { id: set.id } });
  }
  redirect("/sets");
}

// ---------- Questions ----------

const optionSchema = z.object({
  text: z.string().max(300),
  isCorrect: z.boolean(),
  points: z.number().int().min(0).max(1_000_000),
});

const questionSchema = z.object({
  setId: z.string().min(1),
  questionId: z.string().optional(),
  type: z.enum(QUESTION_TYPES as [string, ...string[]]),
  title: z.string().trim().min(1, "Enter the question text").max(500, "Question is too long"),
  timeLimitSeconds: z.number().int().min(5, "Minimum 5 seconds").max(300, "Maximum 5 minutes"),
  basePoints: z.number().int().min(0).max(1_000_000),
  options: z.array(optionSchema),
  acceptedAnswers: z.array(z.string()),
  numericAnswer: z.number().nullable(),
  numericTolerance: z.number().min(0).nullable(),
});

export async function saveQuestion(input: QuestionInput): Promise<SaveQuestionResult> {
  const user = await requireUser();

  const parsed = questionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data as QuestionInput;

  const set = await ownedSet(data.setId, user.id);
  if (!set) return { ok: false, error: "Question set not found." };

  if (data.questionId) {
    const existing = await prisma.question.findFirst({
      where: { id: data.questionId, questionSetId: set.id },
      select: { id: true },
    });
    if (!existing) return { ok: false, error: "Question not found." };
  }

  const semanticError = validateQuestion(data);
  if (semanticError) return { ok: false, error: semanticError };

  const { shared, options: cleanOptions } = toPersistence(data);

  let questionId: string;
  if (data.questionId) {
    const id = data.questionId;
    await prisma.$transaction(async (tx) => {
      await tx.option.deleteMany({ where: { questionId: id } });
      await tx.question.update({
        where: { id },
        data: { ...shared, options: { create: cleanOptions } },
      });
    });
    questionId = id;
  } else {
    const order = await prisma.question.count({ where: { questionSetId: set.id } });
    const created = await prisma.question.create({
      data: {
        questionSetId: set.id,
        order,
        ...shared,
        options: { create: cleanOptions },
      },
    });
    questionId = created.id;
  }

  revalidatePath(`/sets/${set.id}`);
  return { ok: true, id: questionId };
}

export async function deleteQuestion(setId: string, questionId: string): Promise<void> {
  const user = await requireUser();
  const set = await ownedSet(setId, user.id);
  if (!set) return;

  await prisma.question.deleteMany({ where: { id: questionId, questionSetId: set.id } });

  // Re-pack order so the list stays contiguous.
  const remaining = await prisma.question.findMany({
    where: { questionSetId: set.id },
    orderBy: { order: "asc" },
    select: { id: true },
  });
  await prisma.$transaction(
    remaining.map((q, index) =>
      prisma.question.update({ where: { id: q.id }, data: { order: index } }),
    ),
  );
  revalidatePath(`/sets/${set.id}`);
}

export async function moveQuestion(
  setId: string,
  questionId: string,
  direction: "up" | "down",
): Promise<void> {
  const user = await requireUser();
  const set = await ownedSet(setId, user.id);
  if (!set) return;

  const questions = await prisma.question.findMany({
    where: { questionSetId: set.id },
    orderBy: { order: "asc" },
    select: { id: true, order: true },
  });
  const index = questions.findIndex((q) => q.id === questionId);
  if (index === -1) return;
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= questions.length) return;

  const a = questions[index];
  const b = questions[swapWith];
  await prisma.$transaction([
    prisma.question.update({ where: { id: a.id }, data: { order: b.order } }),
    prisma.question.update({ where: { id: b.id }, data: { order: a.order } }),
  ]);
  revalidatePath(`/sets/${set.id}`);
}
