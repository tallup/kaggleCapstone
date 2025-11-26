import React from 'react';
import { useFormContext } from 'react-hook-form';
import FormField from './FormField';
import Select from '../ui/radix/Select';

/**
 * FormSelect component that integrates with React Hook Form and Radix Select
 */
export default function FormSelect({
    name,
    label,
    options = [],
    placeholder = 'Select an option...',
    required = false,
    tooltip,
    className = '',
    ...props
}) {
    const {
        setValue,
        watch,
        formState: { errors },
    } = useFormContext();

    const value = watch(name);
    const error = errors[name]?.message;

    return (
        <FormField label={label} name={name} error={error} required={required} hint={tooltip}>
            <Select
                value={value?.toString() || ''}
                onValueChange={(val) => setValue(name, val, { shouldValidate: true })}
                placeholder={placeholder}
                options={options.map(opt => ({
                    value: opt.value?.toString() || opt.toString(),
                    label: opt.label || opt,
                }))}
                className={className}
                {...props}
            />
        </FormField>
    );
}



