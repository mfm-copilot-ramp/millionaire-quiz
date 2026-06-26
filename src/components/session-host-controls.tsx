"use client";

import { useTransition } from "react";
import { endSession, deleteSession } from "@/lib/session-actions";
import { ghostButton } from "@/components/ui";

export function SessionHostControls({
  sessionId,
  ended,
  showEnd = true,
}: {
  sessionId: string;
  ended: boolean;
  showEnd?: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2">
      {showEnd && !ended ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (confirm("End this session for everyone?")) {
              startTransition(() => endSession(sessionId));
            }
          }}
          className={`${ghostButton} text-sm`}
        >
          {pending ? "Working…" : "End session"}
        </button>
      ) : null}
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (confirm("Delete this session and its results? This cannot be undone.")) {
            startTransition(() => deleteSession(sessionId));
          }
        }}
        className="rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-200 transition-colors hover:bg-red-500/20 disabled:opacity-60"
      >
        Delete
      </button>
    </div>
  );
}
