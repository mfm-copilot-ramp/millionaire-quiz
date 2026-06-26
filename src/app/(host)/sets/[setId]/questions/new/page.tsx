import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { blankQuestionInput } from "@/lib/question-forms";
import { QuestionEditor } from "@/components/question-editor";

export const metadata = { title: "New question — Millionaire Quiz" };

export default async function NewQuestionPage({
  params,
}: {
  params: Promise<{ setId: string }>;
}) {
  const { setId } = await params;
  const user = await requireUser();
  const set = await prisma.questionSet.findFirst({
    where: { id: setId, ownerId: user.id },
    select: { id: true, title: true },
  });
  if (!set) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href={`/sets/${set.id}`} className="text-sm text-white/50 hover:text-gold">
          ← {set.title}
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Add a question</h1>
      </div>
      <div className="rounded-2xl border border-panel-border bg-panel/50 p-6">
        <QuestionEditor initial={blankQuestionInput(set.id)} isEdit={false} />
      </div>
    </div>
  );
}
