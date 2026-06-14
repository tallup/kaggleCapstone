import anime from 'animejs';

/**
 * Reusable animation presets for common UI patterns
 * All animations respect prefers-reduced-motion
 */

/**
 * Check if user prefers reduced motion
 * Uses lazy evaluation to avoid issues during build/SSR
 */
export function shouldAnimate() {
    if (typeof window === 'undefined') return true;
    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Fade in animation
 */
export function fadeIn(targets, options = {}) {
    if (!shouldAnimate()) return;
    
    return anime({
        targets,
        opacity: [0, 1],
        duration: options.duration || 400,
        easing: options.easing || 'easeOutQuad',
        delay: options.delay || 0,
        ...options,
    });
}

/**
 * Fade out animation
 */
export function fadeOut(targets, options = {}) {
    if (!shouldAnimate()) return;
    
    return anime({
        targets,
        opacity: [1, 0],
        duration: options.duration || 300,
        easing: options.easing || 'easeInQuad',
        delay: options.delay || 0,
        ...options,
    });
}

/**
 * Slide in from right
 */
export function slideInRight(targets, options = {}) {
    if (!shouldAnimate()) return;
    
    return anime({
        targets,
        translateX: [100, 0],
        opacity: [0, 1],
        duration: options.duration || 400,
        easing: options.easing || 'easeOutExpo',
        delay: options.delay || 0,
        ...options,
    });
}

/**
 * Slide in from left
 */
export function slideInLeft(targets, options = {}) {
    if (!shouldAnimate()) return;
    
    return anime({
        targets,
        translateX: [-100, 0],
        opacity: [0, 1],
        duration: options.duration || 400,
        easing: options.easing || 'easeOutExpo',
        delay: options.delay || 0,
        ...options,
    });
}

/**
 * Slide in from bottom
 */
export function slideInUp(targets, options = {}) {
    if (!shouldAnimate()) return;
    
    return anime({
        targets,
        translateY: [50, 0],
        opacity: [0, 1],
        duration: options.duration || 500,
        easing: options.easing || 'easeOutExpo',
        delay: options.delay || 0,
        ...options,
    });
}

/**
 * Vertical entrance without opacity change — avoids stuck near-invisible UI if opacity animation fails.
 */
export function slideInUpNoFade(targets, options = {}) {
    if (!shouldAnimate()) return;

    return anime({
        targets,
        translateY: [50, 0],
        duration: options.duration || 500,
        easing: options.easing || 'easeOutExpo',
        delay: options.delay || 0,
        ...options,
    });
}

/**
 * Scale and fade in (for modals)
 */
export function scaleFadeIn(targets, options = {}) {
    if (!shouldAnimate()) return;
    
    return anime({
        targets,
        scale: [0.9, 1],
        opacity: [0, 1],
        duration: options.duration || 300,
        easing: options.easing || 'easeOutCubic',
        delay: options.delay || 0,
        ...options,
    });
}

/**
 * Scale and fade out (for modals)
 */
export function scaleFadeOut(targets, options = {}) {
    if (!shouldAnimate()) return;
    
    return anime({
        targets,
        scale: [1, 0.9],
        opacity: [1, 0],
        duration: options.duration || 250,
        easing: options.easing || 'easeInCubic',
        delay: options.delay || 0,
        ...options,
    });
}

/**
 * Stagger animation for multiple elements
 */
export function staggerAnimation(targets, animationFn, options = {}) {
    if (!shouldAnimate()) return;
    
    const staggerDelay = options.staggerDelay || 100;
    const baseDelay = options.delay || 0;
    
    // Get animation properties from the animation function
    // For slideInUp: translateY and opacity
    // For fadeIn: opacity
    let props = {};
    if (animationFn === slideInUp) {
        props = {
            translateY: [50, 0],
            opacity: [0, 1],
        };
    } else if (animationFn === fadeIn) {
        props = {
            opacity: [0, 1],
        };
    } else {
        // Default to fade in
        props = {
            opacity: [0, 1],
        };
    }
    
    return anime({
        targets,
        ...props,
        delay: anime.stagger(staggerDelay, { start: baseDelay }),
        duration: options.duration || 400,
        easing: options.easing || 'easeOutExpo',
        ...options,
    });
}

/**
 * Number counting animation
 */
export function countUp(targets, endValue, options = {}) {
    if (!shouldAnimate()) return;
    
    return anime({
        targets,
        innerHTML: [0, endValue],
        duration: options.duration || 1500,
        easing: options.easing || 'easeOutExpo',
        round: 1,
        delay: options.delay || 0,
        ...options,
    });
}

/**
 * Rotation animation (for spinners)
 */
export function rotate(targets, options = {}) {
    if (!shouldAnimate()) return;
    
    return anime({
        targets,
        rotate: 360,
        duration: options.duration || 1000,
        easing: options.easing || 'linear',
        loop: options.loop !== false,
        ...options,
    });
}

/**
 * Pulse animation
 */
export function pulse(targets, options = {}) {
    if (!shouldAnimate()) return;
    
    return anime({
        targets,
        scale: [1, 1.05, 1],
        duration: options.duration || 1000,
        easing: options.easing || 'easeInOutQuad',
        loop: options.loop !== false,
        ...options,
    });
}

/**
 * Bounce animation
 */
export function bounce(targets, options = {}) {
    if (!shouldAnimate()) return;
    
    return anime({
        targets,
        translateY: [0, -20, 0],
        duration: options.duration || 600,
        easing: options.easing || 'easeOutQuad',
        ...options,
    });
}

/**
 * Shake animation (for errors)
 */
export function shake(targets, options = {}) {
    if (!shouldAnimate()) return;
    
    return anime({
        targets,
        translateX: [0, -10, 10, -10, 10, 0],
        duration: options.duration || 500,
        easing: options.easing || 'easeInOutQuad',
        ...options,
    });
}

