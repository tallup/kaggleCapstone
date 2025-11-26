import React from 'react';
import Tooltip from './Tooltip';
import { HelpCircle } from 'lucide-react';

/**
 * TooltipLabel - Form label with optional help tooltip
 */
export default function TooltipLabel({
    htmlFor,
    label,
    required = false,
    tooltip,
    className = '',
    ...props
}) {
    return (
        <label htmlFor={htmlFor} className={`block text-sm font-medium text-gray-700 mb-2 ${className}`} {...props}>
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
            {tooltip && (
                <Tooltip content={tooltip} position="top" delay={300}>
                    <HelpCircle className="w-4 h-4 text-gray-400 inline-block ml-1 cursor-help" />
                </Tooltip>
            )}
        </label>
    );
}



