import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { fadeIn, slideInUp, shouldAnimate } from '../utils/animationPresets';

/**
 * PageTransition component that animates route changes
 * Wraps the Outlet content to provide smooth page transitions
 */
export default function PageTransition({ children }) {
    const location = useLocation();
    const contentRef = useRef(null);
    const prevLocationRef = useRef(location.pathname);

    useEffect(() => {
        if (!contentRef.current || !shouldAnimate()) {
            prevLocationRef.current = location.pathname;
            return;
        }

        // Only animate if the pathname actually changed
        if (prevLocationRef.current !== location.pathname) {
            const content = contentRef.current;

            // Set initial state
            content.style.opacity = '0';
            content.style.transform = 'translateY(20px)';

            // Animate in
            const animation = slideInUp(content, {
                duration: 400,
                easing: 'easeOutCubic',
                delay: 0,
            });

            prevLocationRef.current = location.pathname;

            return () => {
                if (animation && animation.pause) {
                    animation.pause();
                }
            };
        }
    }, [location.pathname]);

    return (
        <div ref={contentRef} style={{ minHeight: '100%' }}>
            {children}
        </div>
    );
}

