"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, type AuthFormState } from "@/lib/auth-actions";
import { fieldInput, fieldLabel, primaryButton, formError } from "@/components/ui";

const initialState: AuthFormState = {};

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initialState);

  return (
    <form action={action} className="space-y-4">
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
          autoComplete="current-password"
          required
          className={fieldInput}
          placeholder="••••••••"
        />
      </div>

      {state.error ? <p className={formError}>{state.error}</p> : null}

      <button type="submit" disabled={pending} className={primaryButton}>
        {pending ? "Signing in…" : "Sign in"}
      </button>

      <p className="text-center text-sm text-white/60">
        New here?{" "}
        <Link href="/register" className="font-medium text-gold hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}
