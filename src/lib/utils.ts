import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateId(): string {
  return crypto.randomUUID()
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str
  return str.slice(0, maxLen - 3) + '...'
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export function paymentMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    cash: 'Cash (現金)',
    easycard: 'EasyCard / iPASS (悠遊卡)',
    line_pay: 'LINE Pay',
    px_pay: 'PX Pay / Jko (街口/全聯)',
    upi: 'UPI',
    credit_card: 'Credit Card (信用卡)',
    debit_card: 'Debit Card',
    net_banking: 'Net Banking',
    wallet: 'Wallet',
    bank_transfer: 'Bank Transfer / ATM (轉帳)',
    cheque: 'Cheque',
    other: 'Other',
  }
  return labels[method] || method
}

export function transactionTypeColor(type: string): string {
  switch (type) {
    case 'income': return 'text-emerald-400'
    case 'expense': return 'text-rose-400'
    case 'transfer': return 'text-blue-400'
    default: return 'text-muted-foreground'
  }
}

export function transactionTypeSign(type: string): string {
  switch (type) {
    case 'income': return '+'
    case 'expense': return '-'
    default: return ''
  }
}
