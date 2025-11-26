import React from 'react';
import { useFormContext } from 'react-hook-form';
import FormField from './FormField';

/**
 * FormTextarea component that integrates with React Hook Form
 */
export default function FormTextarea({
    name,
    label,
    placeholder,
    required = false,
    tooltip,
    rows = 4,
    className = '',
    ...props
}) {
    const {
        register,
        formState: { errors },
    } = useFormContext();

    const error = errors[name]?.message;

    return (
        <FormField label={label} name={name} error={error} required={required} hint={tooltip}>
            <textarea
                id={name}
                rows={rows}
                placeholder={placeholder}
                className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent resize-vertical ${className}`}
                {...register(name)}
                {...props}
            />
        </FormField>
    );
}



