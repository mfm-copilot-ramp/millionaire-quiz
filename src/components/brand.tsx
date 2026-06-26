import Link from "next/link";

export function Brand({
  href = "/",
  className = "",
  size = "md",
}: {
  href?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const text =
    size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-lg";
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 font-bold tracking-tight ${text} ${className}`}
    >
      <span aria-hidden className="text-gold">
        ♛
      </span>
      <span className="text-foreground">
        Millionaire <span className="text-gold">Quiz</span>
      </span>
    </Link>
  );
}
