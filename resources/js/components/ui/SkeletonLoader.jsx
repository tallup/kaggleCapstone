import React from 'react';

/**
 * Skeleton loader component with shimmer animation
 */
export function Skeleton({ className = '', width, height, rounded = 'rounded' }) {
    return (
        <div
            className={`bg-gray-200 animate-pulse ${rounded} ${className}`}
            style={{
                width: width || '100%',
                height: height || '1rem',
            }}
        />
    );
}

/**
 * Card skeleton loader
 */
export function CardSkeleton() {
    return (
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
            <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                    <Skeleton height="0.75rem" width="40%" className="mb-2" />
                    <Skeleton height="2rem" width="60%" />
                </div>
                <Skeleton width="3rem" height="3rem" rounded="rounded-xl" />
            </div>
            <Skeleton height="0.875rem" width="80%" />
        </div>
    );
}

/**
 * Table skeleton loader
 */
export function TableSkeleton({ rows = 5, columns = 4 }) {
    return (
        <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200">
                <Skeleton height="1.25rem" width="30%" />
            </div>
            <div className="divide-y divide-gray-200">
                {Array.from({ length: rows }).map((_, rowIndex) => (
                    <div key={rowIndex} className="p-4 flex items-center space-x-4">
                        {Array.from({ length: columns }).map((_, colIndex) => (
                            <Skeleton
                                key={colIndex}
                                height="1rem"
                                width={colIndex === 0 ? '20%' : colIndex === columns - 1 ? '15%' : '25%'}
                            />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}

/**
 * List skeleton loader
 */
export function ListSkeleton({ items = 5 }) {
    return (
        <div className="space-y-3">
            {Array.from({ length: items }).map((_, index) => (
                <div key={index} className="bg-white rounded-xl p-4 border border-gray-100">
                    <div className="flex items-center space-x-3">
                        <Skeleton width="2.5rem" height="2.5rem" rounded="rounded-full" />
                        <div className="flex-1">
                            <Skeleton height="1rem" width="40%" className="mb-2" />
                            <Skeleton height="0.875rem" width="60%" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

/**
 * Stat card skeleton loader
 */
export function StatCardSkeleton() {
    return (
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gray-200"></div>
            <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                        <Skeleton height="0.75rem" width="50%" className="mb-2" />
                        <Skeleton height="2.5rem" width="30%" />
                    </div>
                    <Skeleton width="3rem" height="3rem" rounded="rounded-xl" />
                </div>
            </div>
        </div>
    );
}

/**
 * Form skeleton loader
 */
export function FormSkeleton({ fields = 4 }) {
    return (
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
            {Array.from({ length: fields }).map((_, index) => (
                <div key={index}>
                    <Skeleton height="0.875rem" width="25%" className="mb-2" />
                    <Skeleton height="2.5rem" width="100%" rounded="rounded-lg" />
                </div>
            ))}
            <div className="flex justify-end space-x-3 pt-4">
                <Skeleton height="2.5rem" width="6rem" rounded="rounded-lg" />
                <Skeleton height="2.5rem" width="6rem" rounded="rounded-lg" />
            </div>
        </div>
    );
}

/**
 * Dashboard skeleton loader
 */
export function DashboardSkeleton() {
    return (
        <div className="space-y-6">
            {/* Welcome card skeleton */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                <div className="flex items-center space-x-4">
                    <Skeleton width="4rem" height="4rem" rounded="rounded-xl" />
                    <div className="flex-1">
                        <Skeleton height="1.5rem" width="40%" className="mb-2" />
                        <Skeleton height="1rem" width="60%" />
                    </div>
                </div>
            </div>

            {/* Stat cards skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {Array.from({ length: 4 }).map((_, index) => (
                    <StatCardSkeleton key={index} />
                ))}
            </div>

            {/* Content sections skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                    <Skeleton height="1.25rem" width="40%" className="mb-4" />
                    <ListSkeleton items={3} />
                </div>
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                    <Skeleton height="1.25rem" width="40%" className="mb-4" />
                    <ListSkeleton items={3} />
                </div>
            </div>
        </div>
    );
}

export default Skeleton;









