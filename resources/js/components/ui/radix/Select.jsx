import React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { ChevronDown, ChevronUp, Check } from 'lucide-react';
import { fadeIn, shouldAnimate } from '../../../utils/animationPresets';
import { useEffect, useRef } from 'react';

/**
 * Radix UI Select wrapper with Tailwind styling
 * Provides accessible, searchable select dropdown
 */
export default function Select({
    value,
    onValueChange,
    placeholder = 'Select an option...',
    options = [],
    disabled = false,
    className = '',
    /** Prepended to dropdown content. Default z-index is above app Modal (z-210). */
    contentClassName = '',
    ...props
}) {
    const contentRef = useRef(null);

    // Normalize value: convert empty strings to undefined
    // Radix UI Select doesn't allow empty string values
    const normalizedValue = value === '' || value === null ? undefined : value;

    // Filter out and sanitize invalid options (empty strings, null, undefined, or whitespace-only)
    const validOptions = options
        .filter((option) => {
            if (!option || typeof option !== 'object') return false;
            const val = option.value;
            // Reject empty strings, null, undefined, or whitespace-only strings
            if (val === '' || val == null || val === undefined) return false;
            const strVal = String(val);
            return strVal.trim() !== '';
        })
        .map((option) => {
            // Ensure value is a non-empty string
            const val = String(option.value).trim();
            return {
                ...option,
                value: val,
            };
        });

    // Animate select content
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
        <SelectPrimitive.Root value={normalizedValue} onValueChange={onValueChange} disabled={disabled}>
            <SelectPrimitive.Trigger
                className={`inline-flex items-center justify-between w-full px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
                {...props}
            >
                <SelectPrimitive.Value placeholder={placeholder} />
                <SelectPrimitive.Icon className="ml-2">
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                </SelectPrimitive.Icon>
            </SelectPrimitive.Trigger>

            <SelectPrimitive.Portal>
                <SelectPrimitive.Content
                    ref={contentRef}
                    position="popper"
                    sideOffset={4}
                    className={`${contentClassName || 'z-[300]'} min-w-[var(--radix-select-trigger-width)] bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden`}
                >
                    <SelectPrimitive.ScrollUpButton className="flex items-center justify-center h-6 bg-white text-gray-700 cursor-default">
                        <ChevronUp className="w-4 h-4" />
                    </SelectPrimitive.ScrollUpButton>
                    <SelectPrimitive.Viewport className="p-1">
                        {validOptions
                            .filter((option) => {
                                // Double-check: ensure value is never empty string, null, or undefined
                                const val = option?.value;
                                return val !== '' && val != null && val !== undefined && String(val).trim() !== '';
                            })
                            .map((option) => {
                                // Ensure value is a valid string
                                const optionValue = String(option.value);
                                return (
                                    <SelectPrimitive.Item
                                        key={optionValue}
                                        value={optionValue}
                                        className="relative flex items-center px-8 py-2 text-sm text-gray-900 rounded cursor-pointer select-none focus:outline-none focus:bg-[var(--theme-primary-bg-light)] focus:text-[var(--theme-primary)] data-[disabled]:opacity-50 data-[disabled]:pointer-events-none"
                                    >
                                        <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                                        <SelectPrimitive.ItemIndicator className="absolute left-2 flex items-center justify-center">
                                            <Check className="w-4 h-4 text-[var(--theme-primary)]" />
                                        </SelectPrimitive.ItemIndicator>
                                    </SelectPrimitive.Item>
                                );
                            })}
                    </SelectPrimitive.Viewport>
                    <SelectPrimitive.ScrollDownButton className="flex items-center justify-center h-6 bg-white text-gray-700 cursor-default">
                        <ChevronDown className="w-4 h-4" />
                    </SelectPrimitive.ScrollDownButton>
                </SelectPrimitive.Content>
            </SelectPrimitive.Portal>
        </SelectPrimitive.Root>
    );
}



