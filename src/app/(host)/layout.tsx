import { requireUser } from "@/lib/auth";
import { logoutAction } from "@/lib/auth-actions";
import { Brand } from "@/components/brand";

export default async function HostLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-panel-border/70 bg-panel/40 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-3">
          <Brand href="/dashboard" />
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-white/70 sm:inline">{user.name}</span>
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-lg border border-panel-border bg-panel-2/40 px-3 py-1.5 text-sm font-medium text-white/80 transition-colors hover:border-gold/50 hover:text-foreground"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">{children}</main>
    </div>
  );
}
