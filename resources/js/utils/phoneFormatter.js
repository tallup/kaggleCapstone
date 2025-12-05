/**
 * Formats a phone number to American standard format: (XXX) XXX-XXXX
 * @param {string} value - The phone number string (can contain digits, spaces, dashes, parentheses)
 * @returns {string} - Formatted phone number or empty string
 */
export function formatPhoneNumber(value) {
    if (!value) return '';
    
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '');
    
    // Remove leading 1 if present (country code)
    const cleaned = digits.startsWith('1') && digits.length === 11 ? digits.slice(1) : digits;
    
    // Limit to 10 digits
    const limited = cleaned.slice(0, 10);
    
    // Format based on length
    if (limited.length === 0) return '';
    if (limited.length <= 3) return `(${limited}`;
    if (limited.length <= 6) return `(${limited.slice(0, 3)}) ${limited.slice(3)}`;
    return `(${limited.slice(0, 3)}) ${limited.slice(3, 6)}-${limited.slice(6)}`;
}

/**
 * Handles phone number input change event
 * Automatically formats the value as the user types
 * @param {Event} e - The input change event
 * @param {Function} setValue - Function to update the phone number value
 */
export function handlePhoneNumberChange(e, setValue) {
    const input = e.target.value;
    const formatted = formatPhoneNumber(input);
    setValue(formatted);
}

/**
 * Strips formatting from a phone number, returning only digits
 * @param {string} value - The formatted phone number
 * @returns {string} - Digits only (10 digits max, without leading 1)
 */
export function unformatPhoneNumber(value) {
    if (!value) return '';
    const digits = value.replace(/\D/g, '');
    // Remove leading 1 if present
    return digits.startsWith('1') && digits.length === 11 ? digits.slice(1) : digits.slice(0, 10);
}

