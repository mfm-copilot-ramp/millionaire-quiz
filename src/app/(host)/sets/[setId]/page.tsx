import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { QuestionType } from "@/lib/quiz-types";
import { QUESTION_TYPE_LABELS } from "@/lib/question-forms";
import { primaryButton, ghostButton } from "@/components/ui";
import {
  RenameSetForm,
  DeleteSetButton,
  QuestionRowControls,
} from "@/components/question-set-forms";

export const metadata = { title: "Edit question set — Millionaire Quiz" };

type QuestionWithOptions = {
  id: string;
  type: QuestionType;
  title: string;
  timeLimitSeconds: number;
  acceptedAnswers: string | null;
  numericAnswer: number | null;
  numericTolerance: number | null;
  options: { id: string; text: string; isCorrect: boolean }[];
};

function parseAccepted(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value.map(String) : [];
  } catch {
    return [];
  }
}

function AnswerSummary({ question }: { question: QuestionWithOptions }) {
  if (question.type === "SHORT_TEXT") {
    return <p className="text-sm text-white/60">Accepts: {parseAccepted(question.acceptedAnswers).join(", ") || "—"}</p>;
  }
  if (question.type === "NUMERIC") {
    const tol = question.numericTolerance ?? 0;
    return (
      <p className="text-sm text-white/60">
        Answer: {question.numericAnswer ?? "—"}
        {tol ? ` (±${tol})` : ""}
      </p>
    );
  }
  return (
    <ul className="flex flex-wrap gap-2">
      {question.options.map((o) => (
        <li
          key={o.id}
          className={`rounded-md border px-2 py-1 text-sm ${
            o.isCorrect && question.type !== "POLL"
              ? "border-gold/50 bg-gold/10 text-gold"
              : "border-panel-border bg-panel-2/40 text-white/70"
          }`}
        >
          {o.isCorrect && question.type !== "POLL" ? "✓ " : ""}
          {o.text}
        </li>
      ))}
    </ul>
  );
}

export default async function SetDetailPage({
  params,
}: {
  params: Promise<{ setId: string }>;
}) {
  const { setId } = await params;
  const user = await requireUser();

  const set = await prisma.questionSet.findFirst({
    where: { id: setId, ownerId: user.id },
    include: {
      questions: {
        orderBy: { order: "asc" },
        include: { options: { orderBy: { order: "asc" } } },
      },
    },
  });
  if (!set) notFound();

  const questions = set.questions as unknown as QuestionWithOptions[];

  return (
    <div className="space-y-8">
      <div>
        <Link href="/sets" className="text-sm text-white/50 hover:text-gold">
          ← Question sets
        </Link>
        <div className="mt-2 flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold">{set.title}</h1>
          <div className="flex items-center gap-2">
            {questions.length > 0 ? (
              <Link href={`/games/new?set=${set.id}`} className={`${primaryButton} w-auto px-4`}>
                Create game
              </Link>
            ) : null}
            <DeleteSetButton setId={set.id} />
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-panel-border bg-panel/50 p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-white/50">Set details</h2>
        <RenameSetForm setId={set.id} title={set.title} description={set.description} />
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Questions <span className="text-white/40">({questions.length})</span>
          </h2>
          <Link href={`/sets/${set.id}/questions/new`} className={`${primaryButton} w-auto px-5`}>
            + Add question
          </Link>
        </div>

        {questions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-panel-border bg-panel/30 p-8 text-center text-white/60">
            No questions yet. Add your first one to get started.
          </div>
        ) : (
          <ol className="space-y-3">
            {questions.map((question, index) => (
              <li
                key={question.id}
                className="rounded-xl border border-panel-border bg-panel/50 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gold/20 text-xs font-bold text-gold">
                        {index + 1}
                      </span>
                      <span className="text-xs font-medium uppercase tracking-wide text-white/40">
                        {QUESTION_TYPE_LABELS[question.type]} · {question.timeLimitSeconds}s
                      </span>
                    </div>
                    <p className="mt-2 font-medium text-foreground">{question.title}</p>
                    <div className="mt-3">
                      <AnswerSummary question={question} />
                    </div>
                  </div>
                  <QuestionRowControls
                    setId={set.id}
                    questionId={question.id}
                    isFirst={index === 0}
                    isLast={index === questions.length - 1}
                  />
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <div>
        <Link href="/dashboard" className={ghostButton}>
          ← Back to dashboard
        </Link>
      </div>
    </div>
  );
}
