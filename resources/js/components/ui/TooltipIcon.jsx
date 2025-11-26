import React from 'react';
import Tooltip from './Tooltip';

/**
 * TooltipIcon - Wrapper for icon buttons with tooltips
 */
export default function TooltipIcon({ icon: Icon, tooltip, onClick, className = '', ...props }) {
    if (!tooltip) {
        return (
            <button onClick={onClick} className={className} {...props}>
                <Icon className="w-5 h-5" />
            </button>
        );
    }

    return (
        <Tooltip content={tooltip} position="top">
            <button onClick={onClick} className={className} {...props}>
                <Icon className="w-5 h-5" />
            </button>
        </Tooltip>
    );
}



