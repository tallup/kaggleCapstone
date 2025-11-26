import React from 'react';
import { useScrollAnimation } from '../../hooks/useScrollAnimation';

/**
 * ScrollReveal component that animates children when they scroll into view
 */
export default function ScrollReveal({
    children,
    animationType = 'fade',
    threshold = 0.1,
    duration = 600,
    delay = 0,
    className = '',
    ...props
}) {
    const ref = useScrollAnimation({
        animationType,
        threshold,
        duration,
        delay,
    });

    return (
        <div ref={ref} className={className} {...props}>
            {children}
        </div>
    );
}



