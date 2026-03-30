import React from 'react';
import Modal from './Modal';

/**
 * Standard confirmation dialog (replaces window.confirm) using shared Modal + consistent actions.
 * variant: danger (delete/destructive), primary (affirmative e.g. resolve), neutral (default theme primary).
 */
export default function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    children,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    variant = 'neutral',
    isPending = false,
    size = 'sm',
    className = '',
    closeOnBackdropClick,
}) {
    const confirmClasses = {
        danger:
            'rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-red-600/20 transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60',
        primary:
            'rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60',
        neutral:
            'rounded-xl bg-[var(--theme-primary)] px-5 py-2.5 text-sm font-semibold text-[var(--theme-text-on-primary)] shadow-md transition hover:bg-[var(--theme-primary-hover)] disabled:cursor-not-allowed disabled:opacity-60',
    };

    const accentBorder = {
        danger: 'border-t-4 border-red-500',
        primary: 'border-t-4 border-emerald-500',
        neutral: 'border-t-4 border-[var(--theme-primary)]',
    };

    const handleClose = () => {
        if (!isPending) onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title={title}
            size={size}
            className={`${accentBorder[variant] || accentBorder.neutral} ${className}`}
            closeOnBackdropClick={closeOnBackdropClick ?? !isPending}
        >
            <div className="space-y-4">
                {description != null && typeof description === 'string' ? (
                    <p className="text-sm leading-relaxed text-slate-600">{description}</p>
                ) : (
                    description
                )}
                {children}
            </div>
            <div className="mt-8 flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-6">
                <button
                    type="button"
                    disabled={isPending}
                    onClick={handleClose}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
                >
                    {cancelLabel}
                </button>
                <button
                    type="button"
                    disabled={isPending}
                    onClick={() => onConfirm?.()}
                    className={`inline-flex items-center justify-center gap-2 min-w-[7rem] ${confirmClasses[variant] || confirmClasses.neutral}`}
                >
                    {isPending ? (
                        <>
                            <span
                                className={`h-4 w-4 animate-spin rounded-full border-2 ${
                                    variant === 'neutral'
                                        ? 'border-[var(--theme-text-on-primary)]/25 border-t-[var(--theme-text-on-primary)]'
                                        : 'border-white/30 border-t-white'
                                }`}
                            />
                            Working…
                        </>
                    ) : (
                        confirmLabel
                    )}
                </button>
            </div>
        </Modal>
    );
}
