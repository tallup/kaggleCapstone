import React from 'react';
import ActionableItemsSection from './ActionableItemsSection';
import { SidebarWidget } from './DashboardSidebar';
import { AlertCircle } from 'lucide-react';

/**
 * ActionableItemsWidget - Sidebar version of actionable items
 */
export default function ActionableItemsWidget({ items = [], onItemClick }) {
    // Limit to top 5 items for sidebar
    const limitedItems = items.slice(0, 5);

    return (
        <SidebarWidget
            title="Action Required"
            icon={AlertCircle}
            defaultOpen={true}
        >
            <ActionableItemsSection 
                items={limitedItems} 
                onItemClick={onItemClick}
            />
        </SidebarWidget>
    );
}

