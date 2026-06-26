import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { Brand } from "@/components/brand";
import { RegisterForm } from "./register-form";

export const metadata = { title: "Create a host account — Millionaire Quiz" };

export default async function RegisterPage() {
  if (await getSessionUser()) redirect("/dashboard");

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Brand size="lg" />
          <p className="text-sm text-white/60">Create a free host account to build and run quizzes.</p>
        </div>
        <div className="rounded-2xl border border-panel-border bg-panel/70 p-6 shadow-xl backdrop-blur">
          <RegisterForm />
        </div>
      </div>
    </main>
  );
}
