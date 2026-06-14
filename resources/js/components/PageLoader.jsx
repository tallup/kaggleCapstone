import React from 'react';

const PageLoader = () => (
    <div className="flex items-center justify-center min-h-screen bg-gray-50/50 backdrop-blur-sm">
        <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-[var(--theme-primary)] border-b-transparent shadow-sm"></div>
            <p className="mt-4 text-sm font-bold text-gray-600 animate-pulse tracking-wide uppercase">
                Loading Evergreen...
            </p>
        </div>
    </div>
);

export default PageLoader;
