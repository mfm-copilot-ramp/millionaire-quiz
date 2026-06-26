import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { QuestionType } from "@/lib/quiz-types";
import type { QuestionInput } from "@/lib/question-forms";
import { QuestionEditor } from "@/components/question-editor";

export const metadata = { title: "Edit question — Millionaire Quiz" };

function parseAccepted(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value.map(String) : [];
  } catch {
    return [];
  }
}

export default async function EditQuestionPage({
  params,
}: {
  params: Promise<{ setId: string; questionId: string }>;
}) {
  const { setId, questionId } = await params;
  const user = await requireUser();

  const set = await prisma.questionSet.findFirst({
    where: { id: setId, ownerId: user.id },
    select: { id: true, title: true },
  });
  if (!set) notFound();

  const question = await prisma.question.findFirst({
    where: { id: questionId, questionSetId: set.id },
    include: { options: { orderBy: { order: "asc" } } },
  });
  if (!question) notFound();

  const initial: QuestionInput = {
    setId: set.id,
    questionId: question.id,
    type: question.type as QuestionType,
    title: question.title,
    timeLimitSeconds: question.timeLimitSeconds,
    basePoints: question.basePoints,
    options: question.options.map((o) => ({
      text: o.text,
      isCorrect: o.isCorrect,
      points: o.points,
    })),
    acceptedAnswers:
      question.type === "SHORT_TEXT"
        ? parseAccepted(question.acceptedAnswers).length
          ? parseAccepted(question.acceptedAnswers)
          : [""]
        : [],
    numericAnswer: question.numericAnswer,
    numericTolerance: question.numericTolerance,
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href={`/sets/${set.id}`} className="text-sm text-white/50 hover:text-gold">
          ← {set.title}
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Edit question</h1>
      </div>
      <div className="rounded-2xl border border-panel-border bg-panel/50 p-6">
        <QuestionEditor initial={initial} isEdit />
      </div>
    </div>
  );
}
