"use client";

import { useTransition } from "react";
import { deleteGame } from "@/lib/game-actions";

export function DeleteGameButton({ gameId }: { gameId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirm("Delete this game and all its sessions? This cannot be undone.")) {
          startTransition(() => deleteGame(gameId));
        }
      }}
      className="rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-200 transition-colors hover:bg-red-500/20 disabled:opacity-60"
    >
      {pending ? "Deleting…" : "Delete game"}
    </button>
  );
}
