"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useTransition } from "react";
import {
  createQuestionSet,
  renameQuestionSet,
  deleteQuestionSet,
  deleteQuestion,
  moveQuestion,
  type FormState,
} from "@/lib/question-set-actions";
import {
  fieldInput,
  fieldLabel,
  primaryButton,
  ghostButton,
  formError,
} from "@/components/ui";

const initialState: FormState = {};

export function CreateSetForm() {
  const [state, action, pending] = useActionState(createQuestionSet, initialState);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="title" className={fieldLabel}>
          Title
        </label>
        <input id="title" name="title" required className={fieldInput} placeholder="e.g. ERP Fundamentals" />
      </div>
      <div>
        <label htmlFor="description" className={fieldLabel}>
          Description <span className="text-white/40">(optional)</span>
        </label>
        <textarea id="description" name="description" rows={2} className={fieldInput} placeholder="What's this set about?" />
      </div>
      {state.error ? <p className={formError}>{state.error}</p> : null}
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className={`${primaryButton} w-auto px-6`}>
          {pending ? "Creating…" : "Create set"}
        </button>
        <Link href="/sets" className={ghostButton}>
          Cancel
        </Link>
      </div>
    </form>
  );
}

export function RenameSetForm({
  setId,
  title,
  description,
}: {
  setId: string;
  title: string;
  description: string | null;
}) {
  const boundAction = renameQuestionSet.bind(null, setId);
  const [state, action, pending] = useActionState(boundAction, initialState);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="title" className={fieldLabel}>
          Title
        </label>
        <input id="title" name="title" required defaultValue={title} className={fieldInput} />
      </div>
      <div>
        <label htmlFor="description" className={fieldLabel}>
          Description <span className="text-white/40">(optional)</span>
        </label>
        <textarea
          id="description"
          name="description"
          rows={2}
          defaultValue={description ?? ""}
          className={fieldInput}
        />
      </div>
      {state.error ? <p className={formError}>{state.error}</p> : null}
      <button type="submit" disabled={pending} className={`${primaryButton} w-auto px-6`}>
        {pending ? "Saving…" : "Save details"}
      </button>
    </form>
  );
}

export function DeleteSetButton({ setId }: { setId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirm("Delete this question set and all its questions? This cannot be undone.")) {
          startTransition(() => deleteQuestionSet(setId));
        }
      }}
      className="rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-200 transition-colors hover:bg-red-500/20 disabled:opacity-60"
    >
      {pending ? "Deleting…" : "Delete set"}
    </button>
  );
}

export function QuestionRowControls({
  setId,
  questionId,
  isFirst,
  isLast,
}: {
  setId: string;
  questionId: string;
  isFirst: boolean;
  isLast: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<void>) {
    startTransition(async () => {
      await fn();
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        disabled={pending || isFirst}
        onClick={() => run(() => moveQuestion(setId, questionId, "up"))}
        className="rounded p-1 text-white/50 hover:text-foreground disabled:opacity-30"
        aria-label="Move up"
      >
        ▲
      </button>
      <button
        type="button"
        disabled={pending || isLast}
        onClick={() => run(() => moveQuestion(setId, questionId, "down"))}
        className="rounded p-1 text-white/50 hover:text-foreground disabled:opacity-30"
        aria-label="Move down"
      >
        ▼
      </button>
      <Link
        href={`/sets/${setId}/questions/${questionId}/edit`}
        className="rounded px-2 py-1 text-sm text-white/70 hover:text-gold"
      >
        Edit
      </Link>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (confirm("Delete this question?")) {
            run(() => deleteQuestion(setId, questionId));
          }
        }}
        className="rounded px-2 py-1 text-sm text-white/50 hover:text-red-300 disabled:opacity-40"
      >
        Delete
      </button>
    </div>
  );
}
