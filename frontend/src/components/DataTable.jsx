import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Rows3 } from 'lucide-react';

const PAGE_SIZE = 25;

/**
 * Premium data table with frosted header, row hover glow, pagination,
 * and zebra striping.
 */
export default function DataTable({ columns, rows }) {
  const [page, setPage] = useState(0);

  if (!columns || !rows || rows.length === 0) {
    return (
      <div className="glass-card rounded-xl p-6 text-center">
        <p className="text-sm text-zinc-500 font-medium">No records returned.</p>
      </div>
    );
  }

  const totalPages = Math.ceil(rows.length / PAGE_SIZE);
  const pagedRows = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="w-full bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden animate-fade-in mb-2">
      {/* Table */}
      <div className="overflow-x-auto max-h-[400px]">
        <table className="min-w-max w-full border-collapse text-left text-xs font-sans table-auto">
          <thead className="sticky top-0 z-10">
            <tr className="bg-white">
              {columns.map((col) => (
                <th
                  key={col}
                  className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider select-none whitespace-nowrap"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="">
            {pagedRows.map((row, idx) => (
              <tr
                key={idx}
                className="hover:bg-gray-50 transition-colors duration-100 bg-white"
              >
                {columns.map((col) => {
                  const val = row[col];
                  return (
                    <td
                      key={col}
                      className="px-4 py-4 font-mono text-gray-800 text-[13px] truncate max-w-[240px]"
                      title={val !== null && val !== undefined ? String(val) : ''}
                    >
                      {val !== null && val !== undefined ? String(val) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer with pagination */}
      <div className="flex items-center justify-between px-4 py-3 bg-white">
        <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
          <Rows3 size={14} className="text-gray-400" />
          <span>{rows.length.toLocaleString()} rows</span>
          {totalPages > 1 && (
            <span className="text-gray-300 px-1">·</span>
          )}
          {totalPages > 1 && (
            <span className="text-gray-400">
              Page {page + 1} of {totalPages}
            </span>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              aria-label="Next page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
