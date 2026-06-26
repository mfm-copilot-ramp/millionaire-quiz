import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { CreateSetForm } from "@/components/question-set-forms";

export const metadata = { title: "New question set — Millionaire Quiz" };

export default async function NewSetPage() {
  await requireUser();
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <Link href="/sets" className="text-sm text-white/50 hover:text-gold">
          ← Question sets
        </Link>
        <h1 className="mt-2 text-2xl font-bold">New question set</h1>
      </div>
      <div className="rounded-2xl border border-panel-border bg-panel/60 p-6">
        <CreateSetForm />
      </div>
    </div>
  );
}
