import React from 'react';
import { useFormContext } from 'react-hook-form';
import FormField from './FormField';
import Checkbox from '../ui/radix/Checkbox';

/**
 * FormCheckbox component that integrates with React Hook Form and Radix Checkbox
 */
export default function FormCheckbox({
    name,
    label,
    required = false,
    tooltip,
    className = '',
    ...props
}) {
    const {
        watch,
        setValue,
        formState: { errors },
    } = useFormContext();

    const checked = watch(name) || false;
    const error = errors[name]?.message;

    return (
        <FormField label={label} name={name} error={error} required={required} hint={tooltip}>
            <div className="flex items-center space-x-2">
                <Checkbox
                    checked={checked}
                    onCheckedChange={(checked) => setValue(name, checked, { shouldValidate: true })}
                    className={className}
                    {...props}
                />
                {label && (
                    <label htmlFor={name} className="text-sm font-medium text-gray-700 cursor-pointer">
                        {label}
                    </label>
                )}
            </div>
        </FormField>
    );
}



