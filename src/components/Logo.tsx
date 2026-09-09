import { Link } from "@tanstack/react-router";

import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-card",
        className,
      )}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="size-5" fill="none">
        <path d="M4 20 L12 4 L20 20" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M8.5 15 h7" stroke="var(--accent)" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export function Logo({
  className,
  withTagline = false,
}: {
  className?: string;
  withTagline?: boolean;
}) {
  return (
    <Link to="/" className={cn("flex items-center gap-2", className)}>
      <LogoMark />
      <span className="flex min-w-0 flex-col leading-none">
        <span className="text-lg font-extrabold tracking-tight">
          <span className="text-primary">Achte</span> <span className="text-accent">La</span>
        </span>
        {withTagline ? (
          <span className="mt-0.5 text-[10px] font-medium text-muted-foreground">
            Achte. Peye. Resevwa.
          </span>
        ) : null}
      </span>
    </Link>
  );
}
