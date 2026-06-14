import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { fadeIn, fadeOut, scaleFadeIn, scaleFadeOut, shouldAnimate } from '../../utils/animationPresets';

/**
 * Hub create/edit pattern (keep list/filters mounted; never `if (showForm) return <Form />`):
 * - Parent: <Modal isOpen={showForm} onClose={...} title={addOrEditTitle} size="xl">…</Modal> alongside main UI.
 * - Child form: pass `inModal` and skip duplicate page title + close button; use `className={inModal ? '' : 'bg-white …'}` on the form shell.
 * - Reset local state when switching add vs edit: `key={editing?.id ?? 'new'}` on the form inside Modal.
 */

export default function Modal({
    isOpen,
    onClose,
    title,
    children,
    size = 'md',
    showCloseButton = true,
    closeOnBackdropClick = true,
    className = '',
}) {
    const modalRef = useRef(null);
    const backdropRef = useRef(null);
    const modalContentRef = useRef(null);
    const animationRef = useRef(null);

    // Radix Dialog handles focus trap, body overflow, and focus management automatically
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = '';
            };
        }
    }, [isOpen]);

    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    // Animate modal entrance and exit
    useEffect(() => {
        if (!shouldAnimate()) return;

        if (isOpen && backdropRef.current && modalContentRef.current) {
            // Clean up any existing animations
            if (animationRef.current) {
                if (Array.isArray(animationRef.current)) {
                    animationRef.current.forEach(anim => anim.pause());
                } else {
                    animationRef.current.pause();
                }
            }

            // Set initial states
            backdropRef.current.style.opacity = '0';
            modalContentRef.current.style.opacity = '0';
            modalContentRef.current.style.transform = 'scale(0.9)';

            // Animate backdrop
            const backdropAnim = fadeIn(backdropRef.current, { duration: 300 });

            // Animate modal content
            const modalAnim = scaleFadeIn(modalContentRef.current, { duration: 300, delay: 50 });

            animationRef.current = [backdropAnim, modalAnim];
        } else if (!isOpen && backdropRef.current && modalContentRef.current) {
            // Animate exit
            const backdropAnim = fadeOut(backdropRef.current, { duration: 200 });
            const modalAnim = scaleFadeOut(modalContentRef.current, { duration: 200 });

            animationRef.current = [backdropAnim, modalAnim];

            // Clean up after animation
            const timeout = setTimeout(() => {
                if (backdropRef.current) {
                    backdropRef.current.style.opacity = '';
                }
                if (modalContentRef.current) {
                    modalContentRef.current.style.opacity = '';
                    modalContentRef.current.style.transform = '';
                }
            }, 250);

            return () => clearTimeout(timeout);
        }

        return () => {
            if (animationRef.current) {
                if (Array.isArray(animationRef.current)) {
                    animationRef.current.forEach(anim => {
                        if (anim && anim.pause) anim.pause();
                    });
                } else if (animationRef.current.pause) {
                    animationRef.current.pause();
                }
            }
        };
    }, [isOpen]);

    const sizeClasses = {
        sm: 'max-w-md',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
        full: 'max-w-full mx-4',
    };

    return (
        <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogPrimitive.Portal>
                {/* Backdrop */}
                <DialogPrimitive.Overlay
                    ref={backdropRef}
                    className="fixed inset-0 z-[200] bg-slate-900/20 backdrop-blur-lg"
                    onClick={closeOnBackdropClick ? onClose : undefined}
                />

                {/* Modal — above app chrome (sidebar/header often use z-50) */}
                <DialogPrimitive.Content
                    ref={modalContentRef}
                    className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-xl w-full max-h-[90vh] z-[210] overflow-hidden flex flex-col ${sizeClasses[size]} ${className}`}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div ref={modalRef} className="flex flex-col h-full max-h-[90vh]">
                        {/* Header */}
                        {(title || showCloseButton) && (
                            <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
                                {title && (
                                    <DialogPrimitive.Title
                                        className="text-xl font-semibold text-gray-900"
                                    >
                                        {title}
                                    </DialogPrimitive.Title>
                                )}
                                {showCloseButton && (
                                    <DialogPrimitive.Close
                                        className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
                                        aria-label="Close modal"
                                    >
                                        <X className="w-5 h-5" />
                                    </DialogPrimitive.Close>
                                )}
                            </div>
                        )}

                        {/* Content - scrollable */}
                        <div className="p-6 overflow-y-auto flex-1">
                            {children}
                        </div>
                    </div>
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
}











