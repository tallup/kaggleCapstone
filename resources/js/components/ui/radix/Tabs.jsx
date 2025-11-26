import React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { fadeIn, shouldAnimate } from '../../../utils/animationPresets';
import { useEffect, useRef } from 'react';

/**
 * Radix UI Tabs wrapper with Tailwind styling and anime.js animations
 */
export default function Tabs({ defaultValue, value, onValueChange, children, className = '', ...props }) {
    const contentRef = useRef(null);

    // Animate tab content changes
    useEffect(() => {
        if (contentRef.current && shouldAnimate() && value) {
            const tabPanels = contentRef.current.querySelectorAll('[role="tabpanel"]');
            tabPanels.forEach((panel) => {
                if (panel.getAttribute('data-state') === 'active') {
                    panel.style.opacity = '0';
                    fadeIn(panel, {
                        duration: 300,
                        easing: 'easeOutQuad',
                    });
                }
            });
        }
    }, [value]);

    return (
        <TabsPrimitive.Root
            defaultValue={defaultValue}
            value={value}
            onValueChange={onValueChange}
            className={className}
            {...props}
        >
            <div ref={contentRef}>
                {children}
            </div>
        </TabsPrimitive.Root>
    );
}

export const TabsList = React.forwardRef(({ className = '', children, ...props }, ref) => (
    <TabsPrimitive.List
        ref={ref}
        className={`inline-flex items-center justify-center bg-gray-100 rounded-lg p-1 ${className}`}
        {...props}
    >
        {children}
    </TabsPrimitive.List>
));

export const TabsTrigger = React.forwardRef(({ className = '', children, ...props }, ref) => (
    <TabsPrimitive.Trigger
        ref={ref}
        className={`px-4 py-2 text-sm font-medium text-gray-700 rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] data-[state=active]:bg-white data-[state=active]:text-[var(--theme-primary)] data-[state=active]:shadow-sm ${className}`}
        {...props}
    >
        {children}
    </TabsPrimitive.Trigger>
));

export const TabsContent = React.forwardRef(({ className = '', children, ...props }, ref) => (
    <TabsPrimitive.Content
        ref={ref}
        className={`mt-4 focus:outline-none ${className}`}
        {...props}
    >
        {children}
    </TabsPrimitive.Content>
));



