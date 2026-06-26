"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { fieldInput, primaryButton } from "@/components/ui";

export function JoinBox() {
  const router = useRouter();
  const [code, setCode] = useState("");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const normalized = code.trim().toUpperCase();
    if (normalized) router.push(`/join/${encodeURIComponent(normalized)}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-md flex-col gap-3 rounded-2xl border border-panel-border bg-panel/60 p-5 shadow-xl backdrop-blur sm:flex-row"
    >
      <input
        aria-label="Game code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Enter game code"
        className={`${fieldInput} mt-0 flex-1 text-center text-lg font-semibold tracking-widest uppercase`}
        maxLength={8}
      />
      <button type="submit" className={`${primaryButton} sm:w-auto sm:px-6`}>
        Join game
      </button>
    </form>
  );
}
