import React from 'react';
import StatCard from './StatCard';
import ActionableItemsSection from './ActionableItemsSection';

/**
 * MobileDashboard - Mobile-optimized dashboard layout
 */
export default function MobileDashboard({
    greeting,
    userName,
    statCards = [],
    actionableItems = [],
    isCaregiver = false,
    onStatClick,
    onItemClick
}) {
    // Key stats (first 4) for mobile
    const keyStats = statCards.slice(0, 4);
    const otherStats = statCards.slice(4);

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Welcome Header - Mobile */}
            <div className="bg-gradient-to-br from-[var(--theme-primary)] to-[var(--theme-primary-dark)] text-white px-4 py-6 mb-4">
                <h1 className="text-2xl font-bold mb-1">
                    {greeting}, {userName} 👋
                </h1>
                <p className="text-white/90 text-sm">
                    {isCaregiver ? 'Your Care Dashboard' : 'Managing care with compassion'}
                </p>
            </div>

            {/* Key Stats - 2 columns */}
            {keyStats.length > 0 && (
                <div className="px-4 mb-4">
                    <div className="grid grid-cols-2 gap-3">
                        {keyStats.map((card, index) => (
                            <StatCard
                                key={index}
                                {...card}
                                onClick={onStatClick ? () => onStatClick(card) : undefined}
                                className="text-base"
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Actionable Items */}
            {actionableItems && actionableItems.length > 0 && (
                <div className="px-4 mb-4">
                    <ActionableItemsSection 
                        items={actionableItems.slice(0, 5)} 
                        onItemClick={onItemClick}
                    />
                </div>
            )}

            {/* Other Stats - Collapsible */}
            {otherStats.length > 0 && (
                <div className="px-4">
                    <details className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <summary className="px-4 py-3 font-semibold text-gray-900 cursor-pointer list-none">
                            <div className="flex items-center justify-between">
                                <span>All Statistics</span>
                                <span className="text-sm text-gray-500">{otherStats.length} more</span>
                            </div>
                        </summary>
                        <div className="px-4 pb-4 pt-2 grid grid-cols-2 gap-3 border-t border-gray-200">
                            {otherStats.map((card, index) => (
                                <StatCard
                                    key={index}
                                    {...card}
                                    onClick={onStatClick ? () => onStatClick(card) : undefined}
                                    className="text-base"
                                />
                            ))}
                        </div>
                    </details>
                </div>
            )}
        </div>
    );
}

