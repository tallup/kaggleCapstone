import React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { fadeIn, fadeOut, shouldAnimate } from '../../../utils/animationPresets';
import { useEffect, useRef } from 'react';

/**
 * Radix UI Tooltip wrapper with Tailwind styling and anime.js animations
 * Maintains backward compatibility with existing Tooltip component API
 */
export default function Tooltip({
    content,
    children,
    position = 'top',
    delay = 200,
    className = '',
    ...props
}) {
    const contentRef = useRef(null);

    // Map position prop to Radix side
    const sideMap = {
        top: 'top',
        bottom: 'bottom',
        left: 'left',
        right: 'right',
    };

    // Animate tooltip content
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

    if (!content) {
        return children;
    }

    return (
        <TooltipPrimitive.Provider delayDuration={delay}>
            <TooltipPrimitive.Root>
                <TooltipPrimitive.Trigger asChild>
                    <span className="inline-block">{children}</span>
                </TooltipPrimitive.Trigger>
                <TooltipPrimitive.Portal>
                    <TooltipPrimitive.Content
                        ref={contentRef}
                        side={sideMap[position] || 'top'}
                        sideOffset={8}
                        className={`z-50 px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg pointer-events-none ${className}`}
                        {...props}
                    >
                        {content}
                        <TooltipPrimitive.Arrow className="fill-gray-900" />
                    </TooltipPrimitive.Content>
                </TooltipPrimitive.Portal>
            </TooltipPrimitive.Root>
        </TooltipPrimitive.Provider>
    );
}



