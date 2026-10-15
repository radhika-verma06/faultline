import type { ReactNode } from "react";

import { Chip } from "./ui";

/**
 * A hairline with a crack in it. Drawn rather than imported: it is five lines, it
 * cannot go missing from a sprite, and it recolours with the theme.
 */
export function FaultMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" aria-hidden="true" className="text-ink">
      <line x1="0.5" y1="11" x2="7" y2="11" stroke="currentColor" strokeWidth="1.5" />
      <line x1="7" y1="11" x2="10.5" y2="5" stroke="var(--color-signal)" strokeWidth="2" />
      <line x1="10.5" y1="5" x2="12.5" y2="17" stroke="var(--color-signal)" strokeWidth="2" />
      <line x1="12.5" y1="17" x2="14.5" y2="11" stroke="var(--color-signal)" strokeWidth="2" />
      <line x1="14.5" y1="11" x2="21.5" y2="11" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function Masthead({
  layerName,
  live,
  children,
}: {
  layerName: string;
  live: boolean;
  children?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-20 border-b-2 border-rule bg-paper/90 backdrop-blur">
      {/* The one place colour is purely structural: it gives the page a header to
          sit under, and it is the first thing that says this is not a form. */}
      <div
        aria-hidden="true"
        className="h-1 w-full bg-[linear-gradient(90deg,var(--color-belief),var(--color-suspect),var(--color-signal),var(--color-resolved))]"
      />
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-6 py-4">
        <div className="flex items-center gap-3">
          <FaultMark size={24} />
          <div className="flex items-baseline gap-3">
            <span className="label text-[0.8125rem] tracking-[0.24em] text-ink">Faultline</span>
            <span className="hidden text-[0.8125rem] text-ink-faint sm:inline">
              Every wrong answer has a reason.
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Chip tone={live ? "belief" : "idle"}>{live ? layerName : "no account needed"}</Chip>
          {children}
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="mt-20 border-t-2 border-rule pt-6">
      <p className="max-w-3xl text-[0.75rem] leading-relaxed text-ink-faint">
        The twenty faults are authored in the tradition of the force-concept research that began with
        the Force Concept Inventory (Hestenes, Wells &amp; Swackhamer, 1992). No item or distractor
        from that instrument is reproduced here — it is copyrighted, and a diagnostic stops working
        the moment students can look up what each wrong answer means.
      </p>
      <p className="label mt-4">
        Built by Radhika Verma · local-only by default; Neural Pulse is optional
      </p>
    </footer>
  );
}
