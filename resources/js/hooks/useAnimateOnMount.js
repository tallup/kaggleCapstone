import { useEffect, useRef } from 'react';
import { fadeIn, slideInUp, shouldAnimate } from '../utils/animationPresets';

/**
 * Hook to animate element on mount
 * @param {string} animationType - 'fade', 'slideUp', or custom animation function
 * @param {object} options - Animation options (delay, duration, etc.)
 * @returns {object} ref to attach to element
 */
export function useAnimateOnMount(animationType = 'fade', options = {}) {
    const elementRef = useRef(null);

    useEffect(() => {
        if (!elementRef.current || !shouldAnimate()) return;

        let animation;
        const element = elementRef.current;

        switch (animationType) {
            case 'fade':
                animation = fadeIn(element, options);
                break;
            case 'slideUp':
                animation = slideInUp(element, options);
                break;
            default:
                if (typeof animationType === 'function') {
                    animation = animationType(element, options);
                } else {
                    animation = fadeIn(element, options);
                }
        }

        return () => {
            if (animation && animation.pause) {
                animation.pause();
            }
        };
    }, [animationType, options.delay, options.duration]);

    return elementRef;
}

