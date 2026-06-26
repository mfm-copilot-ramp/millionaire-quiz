// Shared Tailwind class strings for form controls, so the auth screens and
// later authoring forms stay visually consistent.

export const fieldLabel = "block text-sm font-medium text-white/80";

export const fieldInput =
  "mt-1 w-full rounded-lg border border-panel-border bg-panel-2/60 px-3 py-2 text-foreground " +
  "placeholder:text-white/30 outline-none focus:border-gold/70 focus:ring-2 focus:ring-gold/30";

export const primaryButton =
  "inline-flex w-full items-center justify-center rounded-lg bg-gold px-4 py-2.5 font-semibold " +
  "text-[#1a1330] transition-colors hover:bg-gold-deep disabled:cursor-not-allowed disabled:opacity-60";

export const ghostButton =
  "inline-flex items-center justify-center rounded-lg border border-panel-border bg-panel-2/40 " +
  "px-4 py-2 font-medium text-foreground transition-colors hover:border-gold/50 hover:bg-panel-2";

export const formError =
  "rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-200";
