"use client";

import { useState, useTransition } from "react";
import { createSession } from "@/lib/session-actions";
import { primaryButton } from "@/components/ui";

export function StartSessionButton({ gameId }: { gameId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await createSession(gameId);
            if (result && !result.ok) setError(result.error ?? "Could not start a session.");
          })
        }
        className={`${primaryButton} w-auto px-5`}
      >
        {pending ? "Starting…" : "Start a session"}
      </button>
      {error ? <span className="text-xs text-red-300">{error}</span> : null}
    </div>
  );
}
