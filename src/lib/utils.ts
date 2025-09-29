// Utility: join class names conditionally (like clsx / tailwind-merge light replacement)
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}

// Utility: format a number as currency, fallback to "Inquire" if missing
export function formatMoney(n?: number, currency: string = 'USD'): string {
  return typeof n === 'number'
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n)
    : 'Inquire'
}