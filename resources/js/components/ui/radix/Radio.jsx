import React from 'react';
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';

/**
 * Radix UI Radio Group wrapper with Tailwind styling
 */
export const RadioGroup = React.forwardRef(({ className = '', children, ...props }, ref) => (
    <RadioGroupPrimitive.Root
        ref={ref}
        className={className}
        {...props}
    >
        {children}
    </RadioGroupPrimitive.Root>
));

export const RadioItem = React.forwardRef(({ className = '', children, ...props }, ref) => (
    <RadioGroupPrimitive.Item
        ref={ref}
        className={`w-5 h-5 rounded-full border-2 border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] data-[state=checked]:border-[var(--theme-primary)] ${className}`}
        {...props}
    >
        <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-[var(--theme-primary)]" />
        </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
));



