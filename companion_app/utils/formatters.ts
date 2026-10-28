/**
 * Safe currency, numerical, and date formatting utilities.
 * Completely eliminates Hermes JavaScript engine runtime crashes
 * caused by calling .toLocaleString() on undefined/null values.
 */

export const formatInr = (val?: number | null): string => {
  if (val === undefined || val === null || isNaN(val)) return '0';
  return val.toLocaleString('en-IN');
};

export const formatLakhs = (val?: number | null): string => {
  if (val === undefined || val === null || isNaN(val) || val === 0) return '₹0';
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(2)} Lakhs`;
  return `₹${formatInr(val)}`;
};

export const formatDateSafe = (
  dateVal?: string | number | Date | null,
  options?: Intl.DateTimeFormatOptions
): string => {
  if (!dateVal) return 'N/A';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleString('en-IN', options);
  } catch {
    return 'N/A';
  }
};
