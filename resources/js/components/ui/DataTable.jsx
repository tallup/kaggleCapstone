import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, MoreVertical, CheckSquare, Square } from 'lucide-react';

export default function DataTable({
    data = [],
    columns = [],
    onRowClick,
    onBulkAction,
    bulkActions = [],
    pagination = true,
    pageSize = 10,
    sortable = true,
    className = '',
}) {
    const [currentPage, setCurrentPage] = useState(1);
    const [sortColumn, setSortColumn] = useState(null);
    const [sortDirection, setSortDirection] = useState('asc');
    const [selectedRows, setSelectedRows] = useState(new Set());
    const [columnVisibility, setColumnVisibility] = useState(
        columns.reduce((acc, col) => ({ ...acc, [col.key]: col.visible !== false }), {})
    );

    const visibleColumns = useMemo(() => {
        return columns.filter(col => columnVisibility[col.key] !== false);
    }, [columns, columnVisibility]);

    const sortedData = useMemo(() => {
        if (!sortColumn || !sortable) return data;

        return [...data].sort((a, b) => {
            const aValue = a[sortColumn];
            const bValue = b[sortColumn];

            if (aValue === null || aValue === undefined) return 1;
            if (bValue === null || bValue === undefined) return -1;

            if (typeof aValue === 'string') {
                return sortDirection === 'asc'
                    ? aValue.localeCompare(bValue)
                    : bValue.localeCompare(aValue);
            }

            return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
        });
    }, [data, sortColumn, sortDirection, sortable]);

    const paginatedData = useMemo(() => {
        if (!pagination) return sortedData;
        const start = (currentPage - 1) * pageSize;
        return sortedData.slice(start, start + pageSize);
    }, [sortedData, currentPage, pageSize, pagination]);

    const totalPages = Math.ceil(sortedData.length / pageSize);

    const handleSort = (columnKey) => {
        if (!sortable) return;
        
        if (sortColumn === columnKey) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(columnKey);
            setSortDirection('asc');
        }
    };

    const toggleRowSelection = (rowId) => {
        const newSelected = new Set(selectedRows);
        if (newSelected.has(rowId)) {
            newSelected.delete(rowId);
        } else {
            newSelected.add(rowId);
        }
        setSelectedRows(newSelected);
    };

    const toggleAllSelection = () => {
        if (selectedRows.size === paginatedData.length) {
            setSelectedRows(new Set());
        } else {
            setSelectedRows(new Set(paginatedData.map((row, idx) => row.id || idx)));
        }
    };

    const handleBulkAction = (action) => {
        if (onBulkAction && selectedRows.size > 0) {
            onBulkAction(action, Array.from(selectedRows));
            setSelectedRows(new Set());
        }
    };

    return (
        <div className={`bg-white rounded-lg shadow border border-gray-200 overflow-hidden ${className}`}>
            {/* Bulk Actions */}
            {bulkActions.length > 0 && selectedRows.size > 0 && (
                <div className="px-4 py-3 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] flex items-center justify-between">
                    <span className="text-sm font-medium">
                        {selectedRows.size} item{selectedRows.size !== 1 ? 's' : ''} selected
                    </span>
                    <div className="flex items-center space-x-2">
                        {bulkActions.map((action, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleBulkAction(action)}
                                className="px-3 py-1.5 bg-white text-[var(--theme-primary)] rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium"
                            >
                                {action.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            {bulkActions.length > 0 && (
                                <th className="px-4 py-3 text-left">
                                    <button
                                        onClick={toggleAllSelection}
                                        className="text-gray-600 hover:text-gray-900"
                                        aria-label="Select all"
                                    >
                                        {selectedRows.size === paginatedData.length ? (
                                            <CheckSquare className="w-5 h-5" />
                                        ) : (
                                            <Square className="w-5 h-5" />
                                        )}
                                    </button>
                                </th>
                            )}
                            {visibleColumns.map((column) => (
                                <th
                                    key={column.key}
                                    className={`px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider ${
                                        sortable && column.sortable !== false ? 'cursor-pointer hover:bg-gray-100' : ''
                                    }`}
                                    onClick={() => column.sortable !== false && handleSort(column.key)}
                                >
                                    <div className="flex items-center space-x-2">
                                        <span>{column.label}</span>
                                        {sortable && column.sortable !== false && sortColumn === column.key && (
                                            sortDirection === 'asc' ? (
                                                <ChevronUp className="w-4 h-4" />
                                            ) : (
                                                <ChevronDown className="w-4 h-4" />
                                            )
                                        )}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {paginatedData.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={visibleColumns.length + (bulkActions.length > 0 ? 1 : 0)}
                                    className="px-4 py-12 text-center text-gray-500"
                                >
                                    No data available
                                </td>
                            </tr>
                        ) : (
                            paginatedData.map((row, rowIndex) => {
                                const rowId = row.id || rowIndex;
                                const isSelected = selectedRows.has(rowId);

                                return (
                                    <tr
                                        key={rowId}
                                        className={`hover:bg-gray-50 transition-colors ${
                                            isSelected ? 'bg-green-50' : ''
                                        } ${onRowClick ? 'cursor-pointer' : ''}`}
                                        onClick={() => onRowClick && onRowClick(row)}
                                    >
                                        {bulkActions.length > 0 && (
                                            <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    onClick={() => toggleRowSelection(rowId)}
                                                    className="text-gray-600 hover:text-gray-900"
                                                    aria-label="Select row"
                                                >
                                                    {isSelected ? (
                                                        <CheckSquare className="w-5 h-5 text-[var(--theme-primary)]" />
                                                    ) : (
                                                        <Square className="w-5 h-5" />
                                                    )}
                                                </button>
                                            </td>
                                        )}
                                        {visibleColumns.map((column) => (
                                            <td key={column.key} className="px-4 py-3 text-sm text-gray-900">
                                                {column.render
                                                    ? column.render(row[column.key], row)
                                                    : row[column.key]}
                                            </td>
                                        ))}
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {pagination && totalPages > 1 && (
                <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                        Showing {(currentPage - 1) * pageSize + 1} to{' '}
                        {Math.min(currentPage * pageSize, sortedData.length)} of {sortedData.length} results
                    </div>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label="Previous page"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-sm text-gray-700">
                            Page {currentPage} of {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label="Next page"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}









