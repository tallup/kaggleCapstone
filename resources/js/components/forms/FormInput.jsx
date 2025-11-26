import React from 'react';
import { useFormContext } from 'react-hook-form';
import FormField from './FormField';

/**
 * FormInput component that integrates with React Hook Form
 */
export default function FormInput({
    name,
    label,
    type = 'text',
    placeholder,
    required = false,
    tooltip,
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
            <input
                type={type}
                id={name}
                placeholder={placeholder}
                className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent ${className}`}
                {...register(name)}
                {...props}
            />
        </FormField>
    );
}



