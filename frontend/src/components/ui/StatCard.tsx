import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "primary" | "success" | "warning" | "danger" | "neutral";
}

const toneClasses = {
  primary: "text-primary",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
  neutral: "text-text-primary",
};

export function StatCard({
  label,
  value,
  hint,
  tone = "neutral",
}: StatCardProps) {
  return (
    <div className="card p-4">
      <p className="text-sm text-text-secondary">{label}</p>
      <p
        className={`mt-1 text-2xl font-bold tabular-nums ${toneClasses[tone]}`}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-text-secondary">{hint}</p>}
    </div>
  );
}
