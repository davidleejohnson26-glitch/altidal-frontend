
export const cn = (...classes: any[]) => classes.filter(Boolean).join(' ')
export const formatMoney = (n?: number, currency: string = 'USD') => typeof n === 'number'
  ? new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n)
  : 'Inquire'
