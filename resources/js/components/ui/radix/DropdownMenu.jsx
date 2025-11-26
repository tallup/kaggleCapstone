import React from 'react';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { fadeIn, shouldAnimate } from '../../../utils/animationPresets';
import { useEffect, useRef } from 'react';

/**
 * Radix UI Dropdown Menu wrapper with Tailwind styling
 * Provides accessible dropdown menus
 */
export default function DropdownMenu({ trigger, children, align = 'end', ...props }) {
    const contentRef = useRef(null);

    // Animate dropdown content
    useEffect(() => {
        if (contentRef.current && shouldAnimate()) {
            const observer = new MutationObserver(() => {
                if (contentRef.current && contentRef.current.style.display !== 'none') {
                    contentRef.current.style.opacity = '0';
                    fadeIn(contentRef.current, {
                        duration: 200,
                        easing: 'easeOutQuad',
                    });
                }
            });

            observer.observe(contentRef.current, {
                attributes: true,
                attributeFilter: ['data-state'],
            });

            return () => observer.disconnect();
        }
    }, []);

    return (
        <DropdownMenuPrimitive.Root {...props}>
            <DropdownMenuPrimitive.Trigger asChild>
                {trigger}
            </DropdownMenuPrimitive.Trigger>

            <DropdownMenuPrimitive.Portal>
                <DropdownMenuPrimitive.Content
                    ref={contentRef}
                    align={align}
                    sideOffset={8}
                    className="z-50 min-w-[12rem] bg-white rounded-lg shadow-lg border border-gray-200 py-1"
                >
                    {children}
                </DropdownMenuPrimitive.Content>
            </DropdownMenuPrimitive.Portal>
        </DropdownMenuPrimitive.Root>
    );
}

// Sub-components for convenience
export const DropdownMenuItem = React.forwardRef(({ className = '', children, ...props }, ref) => (
    <DropdownMenuPrimitive.Item
        ref={ref}
        className={`relative flex items-center px-4 py-2 text-sm text-gray-700 cursor-pointer select-none outline-none hover:bg-gray-100 focus:bg-gray-100 data-[disabled]:opacity-50 data-[disabled]:pointer-events-none ${className}`}
        {...props}
    >
        {children}
    </DropdownMenuPrimitive.Item>
));

export const DropdownMenuSeparator = () => (
    <DropdownMenuPrimitive.Separator className="h-px bg-gray-200 my-1" />
);

export const DropdownMenuLabel = ({ className = '', children, ...props }) => (
    <DropdownMenuPrimitive.Label
        className={`px-4 py-2 text-xs font-semibold text-gray-500 uppercase ${className}`}
        {...props}
    >
        {children}
    </DropdownMenuPrimitive.Label>
);

