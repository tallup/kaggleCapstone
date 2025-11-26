import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

/**
 * Custom hook for forms with validation using React Hook Form and Zod
 * Provides common patterns for form handling
 */
export function useFormWithValidation(schema, defaultValues = {}, options = {}) {
    const form = useForm({
        resolver: zodResolver(schema),
        defaultValues,
        mode: options.mode || 'onChange',
        ...options,
    });

    return form;
}

/**
 * Common Zod schemas for reuse
 */
export const commonSchemas = {
    email: z.string().email('Invalid email address'),
    requiredString: z.string().min(1, 'This field is required'),
    optionalString: z.string().optional(),
    phone: z.string().regex(/^[\d\s\-\(\)]+$/, 'Invalid phone number').optional(),
    date: z.string().min(1, 'Date is required'),
    number: z.coerce.number(),
    positiveNumber: z.coerce.number().positive('Must be a positive number'),
    url: z.string().url('Invalid URL').optional().or(z.literal('')),
    boolean: z.boolean(),
};



