import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

export default function Breadcrumbs({ items = [] }) {
    if (items.length === 0) return null;

    return (
        <nav className="flex items-center space-x-2 text-sm mb-4" aria-label="Breadcrumb">
            <Link
                to="/dashboard"
                className="text-gray-500 hover:text-[var(--theme-primary)] transition-colors"
                aria-label="Home"
            >
                <Home className="w-4 h-4" />
            </Link>
            {items.map((item, index) => {
                const isLast = index === items.length - 1;
                
                return (
                    <React.Fragment key={index}>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                        {isLast ? (
                            <span className="text-gray-900 font-medium" aria-current="page">
                                {item.label}
                            </span>
                        ) : (
                            <Link
                                to={item.path}
                                className="text-gray-500 hover:text-[var(--theme-primary)] transition-colors"
                            >
                                {item.label}
                            </Link>
                        )}
                    </React.Fragment>
                );
            })}
        </nav>
    );
}
































