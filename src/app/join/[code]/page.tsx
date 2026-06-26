import Link from "next/link";
import { Brand } from "@/components/brand";

export const metadata = { title: "Join a game — Millionaire Quiz" };

export default async function JoinPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const gameCode = decodeURIComponent(code).toUpperCase();

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-md text-center">
        <Brand size="md" className="justify-center" />
        <div className="mt-8 rounded-2xl border border-panel-border bg-panel/70 p-8 shadow-xl backdrop-blur">
          <p className="text-sm uppercase tracking-widest text-white/50">Game code</p>
          <p className="mt-2 text-4xl font-bold tracking-widest text-gold">{gameCode}</p>
          <p className="mt-6 text-white/70">
            Get ready! The live lobby where you pick a nickname and play along is coming online soon.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block text-sm font-medium text-gold hover:underline"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
