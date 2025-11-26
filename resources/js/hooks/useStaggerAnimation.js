import { useEffect, useRef } from 'react';
import { staggerAnimation, fadeIn, slideInUp, shouldAnimate } from '../utils/animationPresets';

/**
 * Hook to animate multiple elements with stagger effect
 * @param {string} selector - CSS selector for child elements to animate
 * @param {string} animationType - 'fade', 'slideUp', or custom animation function
 * @param {object} options - Animation options (staggerDelay, delay, duration, etc.)
 * @returns {object} ref to attach to parent element
 */
export function useStaggerAnimation(selector, animationType = 'fade', options = {}) {
    const containerRef = useRef(null);

    useEffect(() => {
        if (!containerRef.current || !shouldAnimate()) return;

        const container = containerRef.current;
        const targets = container.querySelectorAll(selector);

        if (targets.length === 0) return;

        let animationFn;
        switch (animationType) {
            case 'fade':
                animationFn = fadeIn;
                break;
            case 'slideUp':
                animationFn = slideInUp;
                break;
            default:
                if (typeof animationType === 'function') {
                    animationFn = animationType;
                } else {
                    animationFn = fadeIn;
                }
        }

        const animation = staggerAnimation(targets, animationFn, options);

        return () => {
            if (animation && animation.pause) {
                animation.pause();
            }
        };
    }, [selector, animationType, options.staggerDelay, options.delay, options.duration]);

    return containerRef;
}

