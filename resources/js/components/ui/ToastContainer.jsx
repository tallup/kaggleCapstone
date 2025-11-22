import React from 'react';
import Toast from './Toast';

export default function ToastContainer({ toasts, onClose }) {
    if (toasts.length === 0) return null;

    return (
        <div
            className="fixed top-4 right-4 z-50 flex flex-col items-end space-y-2 pointer-events-none"
            aria-live="polite"
            aria-label="Notifications"
        >
            {toasts.map((toast) => (
                <div key={toast.id} className="pointer-events-auto">
                    <Toast toast={toast} onClose={onClose} />
                </div>
            ))}
        </div>
    );
}









