import React from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';

export default function FormField({
    label,
    name,
    error,
    success,
    required = false,
    hint,
    children,
    className = '',
}) {
    const hasError = !!error;
    const hasSuccess = !!success && !hasError;

    return (
        <div className={`mb-4 ${className}`}>
            {label && (
                <label
                    htmlFor={name}
                    className="block text-sm font-medium text-gray-700 mb-2"
                >
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}
            <div className="relative">
                {children}
                {hasError && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <AlertCircle className="w-5 h-5 text-red-500" />
                    </div>
                )}
                {hasSuccess && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                    </div>
                )}
            </div>
            {hint && !hasError && (
                <p className="mt-1 text-xs text-gray-500">{hint}</p>
            )}
            {hasError && (
                <p className="mt-1 text-sm text-red-600 flex items-center space-x-1">
                    <AlertCircle className="w-4 h-4" />
                    <span>{error}</span>
                </p>
            )}
            {hasSuccess && (
                <p className="mt-1 text-sm text-green-600 flex items-center space-x-1">
                    <CheckCircle className="w-4 h-4" />
                    <span>{success}</span>
                </p>
            )}
        </div>
    );
}






