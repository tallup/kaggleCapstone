import React from 'react';
import * as SwitchPrimitive from '@radix-ui/react-switch';

/**
 * Radix UI Switch wrapper with Tailwind styling
 */
export default function Switch({ checked, onCheckedChange, disabled = false, className = '', ...props }) {
    return (
        <SwitchPrimitive.Root
            checked={checked}
            onCheckedChange={onCheckedChange}
            disabled={disabled}
            className={`w-11 h-6 rounded-full bg-gray-300 data-[state=checked]:bg-[var(--theme-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] data-[disabled]:opacity-50 transition-colors ${className}`}
            {...props}
        >
            <SwitchPrimitive.Thumb className="block w-5 h-5 bg-white rounded-full shadow-sm transition-transform translate-x-0.5 data-[state=checked]:translate-x-[22px]" />
        </SwitchPrimitive.Root>
    );
}



