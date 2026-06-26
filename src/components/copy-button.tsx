"use client";

import { useState } from "react";

export function CopyButton({
  value,
  label = "Copy",
  className = "",
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // clipboard may be unavailable (insecure context) — ignore
        }
      }}
      className={
        "rounded-lg border border-panel-border bg-panel-2/40 px-3 py-2 text-sm font-medium " +
        "text-foreground transition-colors hover:border-gold/50 hover:bg-panel-2 " +
        className
      }
    >
      {copied ? "Copied!" : label}
    </button>
  );
}
