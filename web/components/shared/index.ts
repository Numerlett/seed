export { StatusBadge } from './StatusBadge';
export { WarehouseSelector } from './WarehouseSelector';
export { ProductSelector } from './ProductSelector';
export { BatchSelector } from './BatchSelector';
export { PartySelector } from './PartySelector';

/**
 * Format a numeric value as INR currency.
 */
export function formatCurrency(value: unknown): string {
  const numValue =
    typeof value === 'string'
      ? parseFloat(value)
      : typeof value === 'number'
        ? value
        : Number(value);
  if (isNaN(numValue)) return '₹0.00';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(numValue);
}

/**
 * Format a date string to a readable format.
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
