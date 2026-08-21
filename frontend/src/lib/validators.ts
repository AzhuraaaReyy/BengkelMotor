// Client-side validation helpers (fast feedback). Backend remains source of truth.

export function isPositiveNumber(value: unknown): boolean {
  const n = Number(value);
  return Number.isFinite(n) && n > 0;
}

export function isNonNegativeNumber(value: unknown): boolean {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0;
}

export function isRequiredText(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export function normalizePlateNumber(input: string): string {
  return input.replace(/\s+/g, " ").trim().toUpperCase();
}
