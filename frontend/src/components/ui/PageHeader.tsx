import type { ReactNode } from "react";

// Page actions toolbar. The page title + description (H1 + P) live in the
// sticky topbar (see PAGE_META in AppShell) — this only renders the
// right-aligned action buttons the page needs. Renders nothing when empty.
export function PageHeader({ actions }: { actions?: ReactNode }) {
  if (!actions) return null;
  return (
    <div className="mb-6 flex flex-wrap items-center justify-end gap-2">
      {actions}
    </div>
  );
}
