import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Client-side pagination for portal lists.
 */
export default function PortalPagination({
  page,
  pageSize,
  total,
  onPageChange,
  className = '',
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 mt-4 border-t border-gray-100 ${className}`}
    >
      <p className="text-xs text-gray-500">
        Showing <span className="font-medium text-gray-700">{start}</span>–
        <span className="font-medium text-gray-700">{end}</span> of{' '}
        <span className="font-medium text-gray-700">{total}</span>
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </button>
        <span className="px-2 text-xs text-gray-500 tabular-nums">
          Page {page} / {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export function usePaginationState(totalItems, pageSize) {
  const [page, setPage] = React.useState(1);
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  React.useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  React.useEffect(() => {
    setPage(1);
  }, [totalItems]);

  const slice = React.useCallback(
    (list) => {
      if (!Array.isArray(list)) return [];
      const start = (page - 1) * pageSize;
      return list.slice(start, start + pageSize);
    },
    [page, pageSize]
  );

  return { page, setPage, totalPages, slice };
}
