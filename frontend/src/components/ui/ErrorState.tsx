interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = "Terjadi kesalahan",
  message = "Data gagal dimuat. Silakan coba lagi.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-danger-subtle text-danger">
        <svg
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.09 18.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
      </div>
      <p className="font-medium text-text-primary">{title}</p>
      <p className="max-w-sm text-sm text-text-secondary">{message}</p>
      {onRetry && (
        <button className="btn-secondary mt-2" onClick={onRetry}>
          Coba lagi
        </button>
      )}
    </div>
  );
}
