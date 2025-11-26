import React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';

/**
 * Radix UI Checkbox wrapper with Tailwind styling
 */
export default function Checkbox({ checked, onCheckedChange, disabled = false, className = '', ...props }) {
    return (
        <CheckboxPrimitive.Root
            checked={checked}
            onCheckedChange={onCheckedChange}
            disabled={disabled}
            className={`w-5 h-5 rounded border-2 border-gray-300 bg-white flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] data-[state=checked]:bg-[var(--theme-primary)] data-[state=checked]:border-[var(--theme-primary)] data-[disabled]:opacity-50 ${className}`}
            {...props}
        >
            <CheckboxPrimitive.Indicator className="text-white">
                <Check className="w-4 h-4" />
            </CheckboxPrimitive.Indicator>
        </CheckboxPrimitive.Root>
    );
}



