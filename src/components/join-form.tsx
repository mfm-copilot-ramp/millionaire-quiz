"use client";

import { useActionState } from "react";
import { joinSession, type JoinFormState } from "@/lib/session-actions";
import { fieldInput, fieldLabel, primaryButton, formError } from "@/components/ui";

const initialState: JoinFormState = {};

export function JoinForm({ code }: { code: string }) {
  const [state, action, pending] = useActionState(joinSession, initialState);

  return (
    <form action={action} className="space-y-4 text-left">
      <input type="hidden" name="code" value={code} />
      <div>
        <label htmlFor="nickname" className={fieldLabel}>
          Your nickname
        </label>
        <input
          id="nickname"
          name="nickname"
          type="text"
          autoComplete="off"
          required
          maxLength={24}
          className={fieldInput}
          placeholder="e.g. QuizWhiz"
        />
      </div>

      {state.error ? <p className={formError}>{state.error}</p> : null}

      <button type="submit" disabled={pending} className={primaryButton}>
        {pending ? "Joining…" : "Join game"}
      </button>
    </form>
  );
}
