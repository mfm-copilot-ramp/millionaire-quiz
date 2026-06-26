import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { Brand } from "@/components/brand";
import { JoinBox } from "@/components/join-box";
import { primaryButton, ghostButton } from "@/components/ui";

export default async function Home() {
  const user = await getSessionUser();

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-12 px-6 py-16">
      <header className="absolute top-0 left-0 w-full">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
          <Brand />
          <nav className="flex items-center gap-3 text-sm">
            {user ? (
              <Link href="/dashboard" className={ghostButton}>
                Dashboard
              </Link>
            ) : (
              <Link href="/login" className={ghostButton}>
                Host sign in
              </Link>
            )}
          </nav>
        </div>
      </header>

      <section className="max-w-2xl text-center">
        <span className="inline-block rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs font-medium uppercase tracking-widest text-gold">
          Live multiplayer trivia
        </span>
        <h1 className="mt-5 text-4xl font-bold leading-tight sm:text-5xl">
          Run live trivia your crowd will <span className="text-gold">remember</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-white/70">
          Build reusable question sets, host real-time sessions players join with a code, and
          keep score across every round — multiple choice, true/false, select-all, text, numeric, and polls.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          {user ? (
            <Link href="/dashboard" className={`${primaryButton} sm:w-auto sm:px-8`}>
              Go to dashboard
            </Link>
          ) : (
            <>
              <Link href="/register" className={`${primaryButton} sm:w-auto sm:px-8`}>
                Create a host account
              </Link>
              <Link href="/login" className={`${ghostButton} px-8 py-2.5`}>
                Host sign in
              </Link>
            </>
          )}
        </div>
      </section>

      <section className="flex w-full flex-col items-center gap-3">
        <p className="text-sm font-medium uppercase tracking-widest text-white/50">
          Playing along? Enter your code
        </p>
        <JoinBox />
      </section>
    </main>
  );
}
