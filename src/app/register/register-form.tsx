"use client";

import Link from "next/link";
import { useActionState } from "react";
import { registerAction, type AuthFormState } from "@/lib/auth-actions";
import { fieldInput, fieldLabel, primaryButton, formError } from "@/components/ui";

const initialState: AuthFormState = {};

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerAction, initialState);

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="name" className={fieldLabel}>
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          required
          className={fieldInput}
          placeholder="Quiz Master"
        />
      </div>

      <div>
        <label htmlFor="email" className={fieldLabel}>
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className={fieldInput}
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label htmlFor="password" className={fieldLabel}>
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className={fieldInput}
          placeholder="At least 8 characters"
        />
      </div>

      {state.error ? <p className={formError}>{state.error}</p> : null}

      <button type="submit" disabled={pending} className={primaryButton}>
        {pending ? "Creating account…" : "Create account"}
      </button>

      <p className="text-center text-sm text-white/60">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-gold hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
