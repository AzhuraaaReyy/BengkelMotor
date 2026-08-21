import { ChevronLeftIcon, ChevronRightIcon } from "../shared/icons";

interface PaginationProps {
  currentPage: number;
  lastPage: number;
  total?: number;
  onPageChange: (page: number) => void;
}

export function Pagination({
  currentPage,
  lastPage,
  total,
  onPageChange,
}: PaginationProps) {
  if (lastPage <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-between gap-4">
      <p className="text-sm text-text-secondary">Total: {total ?? ""}</p>
      <div className="flex items-center gap-1">
        <button
          className="btn-ghost disabled:opacity-40"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          aria-label="Halaman sebelumnya"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </button>
        <span className="px-3 text-sm text-text-primary">
          {currentPage} / {lastPage}
        </span>
        <button
          className="btn-ghost disabled:opacity-40"
          disabled={currentPage >= lastPage}
          onClick={() => onPageChange(currentPage + 1)}
          aria-label="Halaman berikutnya"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
