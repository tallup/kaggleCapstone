import React from 'react';
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { ChevronDown } from 'lucide-react';
import { fadeIn, shouldAnimate } from '../../../utils/animationPresets';
import { useEffect, useRef } from 'react';

/**
 * Radix UI Accordion wrapper with Tailwind styling and anime.js animations
 */
export default function Accordion({ type = 'single', collapsible = true, children, className = '', ...props }) {
    const contentRef = useRef(null);

    // Animate accordion content
    useEffect(() => {
        if (contentRef.current && shouldAnimate()) {
            const observer = new MutationObserver(() => {
                const openItems = contentRef.current.querySelectorAll('[data-state="open"]');
                openItems.forEach((item) => {
                    const content = item.querySelector('[data-radix-accordion-content]');
                    if (content && !content.dataset.animated) {
                        content.style.opacity = '0';
                        fadeIn(content, {
                            duration: 300,
                            easing: 'easeOutQuad',
                        });
                        content.dataset.animated = 'true';
                    }
                });
            });

            observer.observe(contentRef.current, {
                attributes: true,
                attributeFilter: ['data-state'],
                subtree: true,
            });

            return () => observer.disconnect();
        }
    }, []);

    return (
        <AccordionPrimitive.Root
            type={type}
            collapsible={collapsible}
            className={className}
            {...props}
        >
            <div ref={contentRef}>
                {children}
            </div>
        </AccordionPrimitive.Root>
    );
}

export const AccordionItem = React.forwardRef(({ className = '', children, ...props }, ref) => (
    <AccordionPrimitive.Item
        ref={ref}
        className={`border-b border-gray-200 ${className}`}
        {...props}
    >
        {children}
    </AccordionPrimitive.Item>
));

export const AccordionTrigger = React.forwardRef(({ className = '', children, ...props }, ref) => (
    <AccordionPrimitive.Header className="flex">
        <AccordionPrimitive.Trigger
            ref={ref}
            className={`flex flex-1 items-center justify-between py-4 text-sm font-medium text-gray-900 transition-all hover:text-[var(--theme-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] [&[data-state=open]>svg]:rotate-180 ${className}`}
            {...props}
        >
            {children}
            <ChevronDown className="w-4 h-4 text-gray-500 transition-transform duration-200" />
        </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
));

export const AccordionContent = React.forwardRef(({ className = '', children, ...props }, ref) => (
    <AccordionPrimitive.Content
        ref={ref}
        className="overflow-hidden text-sm text-gray-600 data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
        {...props}
    >
        <div className={`pb-4 pt-0 ${className}`}>
            {children}
        </div>
    </AccordionPrimitive.Content>
));

