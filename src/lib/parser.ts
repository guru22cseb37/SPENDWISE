/**
 * Natural language expense parser.
 * Deterministic parsing for common patterns.
 * Does NOT call any external API.
 */

import { ParsedTransaction, TransactionType, PaymentMethod } from '@/types'
import { toMinorUnits } from './calculations'
import { format } from 'date-fns'

// ============================================================
// PATTERNS
// ============================================================

const AMOUNT_PATTERNS = [
  // NT$ 150 or NTD 150 or TWD 150
  /(?:nt\$?|ntd|twd)\s*([\d,]+(?:\.\d{1,2})?)/i,
  // 150 NT or 150元 or 150塊
  /([\d,]+(?:\.\d{1,2})?)\s*(?:ntd?|twd|元|塊)/i,
  // ₹1,200 or Rs. 1200 or INR 1200
  /(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d{1,2})?)/i,
  // 1200 rupees
  /([\d,]+(?:\.\d{1,2})?)\s*(?:rupees?|inr|rs)/i,
  // Plain number that looks like a price
  /\b([\d,]+(?:\.\d{1,2})?)\b/,
]

const INCOME_KEYWORDS = [
  'received', 'got', 'earned', 'salary', 'income', 'credited', 'transferred to',
  'payment received', 'refund', 'cashback', 'dividend', 'freelance', 'bonus',
  'deposited', '薪水', '收入', '匯款', '獎金', '發票中獎',
]

const EXPENSE_KEYWORDS = [
  'spent', 'paid', 'bought', 'purchased', 'ordered', 'expense', 'bill', 'fee',
  'charge', 'cost', 'deducted', 'debited', '花費', '買了', '支出', '付了', '繳費',
]

const PAYMENT_METHOD_MAP: Record<string, PaymentMethod> = {
  'easycard': 'easycard',
  '悠遊卡': 'easycard',
  'ipass': 'easycard',
  '一卡通': 'easycard',
  'line pay': 'line_pay',
  'linepay': 'line_pay',
  'px pay': 'px_pay',
  'pxpay': 'px_pay',
  '全聯': 'px_pay',
  'jko': 'px_pay',
  '街口': 'px_pay',
  'upi': 'upi',
  'gpay': 'upi',
  'phonepe': 'upi',
  'paytm': 'upi',
  'razorpay': 'upi',
  'cash': 'cash',
  '現金': 'cash',
  'card': 'credit_card',
  'credit card': 'credit_card',
  '信用卡': 'credit_card',
  'debit card': 'debit_card',
  'net banking': 'net_banking',
  'netbanking': 'net_banking',
  'neft': 'bank_transfer',
  'rtgs': 'bank_transfer',
  'imps': 'bank_transfer',
  'atm': 'bank_transfer',
  '轉帳': 'bank_transfer',
  'wallet': 'wallet',
  'cheque': 'cheque',
  'check': 'cheque',
}

const DATE_PATTERNS: Array<{ pattern: RegExp; parse: (m: RegExpMatchArray) => Date | null }> = [
  {
    pattern: /\byesterday\b/i,
    parse: () => { const d = new Date(); d.setDate(d.getDate() - 1); return d },
  },
  {
    pattern: /\btoday\b/i,
    parse: () => new Date(),
  },
  {
    pattern: /\bon\s+(\d{1,2})[\/\-\s](\w+)(?:\s+(\d{4}))?\b/i,
    parse: (m) => {
      const day = parseInt(m[1])
      const month = parseMonth(m[2])
      const year = m[3] ? parseInt(m[3]) : new Date().getFullYear()
      if (month === null) return null
      return new Date(year, month, day)
    },
  },
  {
    pattern: /\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{4}))?\b/,
    parse: (m) => {
      const day = parseInt(m[1])
      const month = parseInt(m[2]) - 1
      const year = m[3] ? parseInt(m[3]) : new Date().getFullYear()
      return new Date(year, month, day)
    },
  },
  {
    pattern: /\b(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?\b/i,
    parse: (m) => {
      const month = parseMonth(m[1])
      if (month === null) return null
      const day = parseInt(m[2])
      return new Date(new Date().getFullYear(), month, day)
    },
  },
]

const MONTHS: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
}

function parseMonth(str: string): number | null {
  return MONTHS[str.toLowerCase()] ?? null
}

// ============================================================
// CATEGORY HINTS
// ============================================================

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'food_dining': ['restaurant', 'café', 'cafe', 'pizza', 'burger', 'lunch', 'dinner', 'breakfast', 'biryani', 'swiggy', 'zomato', 'dining', 'food delivery', 'bento', '便當', '自助餐', '珍珠奶茶', 'bubble tea', 'hotpot', '火鍋', 'night market', '夜市', 'din tai fung', '鼎泰豐', '牛肉麵', 'beef noodles', 'breakfast shop', '早餐店'],
  'groceries': ['grocery', 'groceries', 'vegetables', 'fruits', 'supermarket', 'kirana', 'big bazaar', 'reliance fresh', 'dmart', 'milk', 'px mart', '全聯', 'carrefour', '家樂福', '7-11', '7-eleven', 'familymart', '全家', 'hi-life', '萊爾富', 'ok mart', '傳統市場'],
  'transportation': ['uber', 'ola', 'auto', 'bus', 'metro', 'fuel', 'petrol', 'diesel', 'cab', 'taxi', 'train', 'flight', 'parking', 'toll', 'mrt', '捷運', 'youbike', 'tpass', 'easycard', '悠遊卡', 'high speed rail', 'thsr', '高鐵', 'tra', '台鐵', '悠遊'],
  'entertainment': ['movie', 'cinema', 'netflix', 'spotify', 'amazon prime', 'hotstar', 'concert', 'gaming', 'game', 'ktv', '錢櫃', 'holiday ktv'],
  'shopping': ['amazon', 'flipkart', 'myntra', 'shopping', 'cloth', 'clothes', 'shoes', 'purchase', 'shopee', '蝦皮', 'momo', 'pchome', 'uniqlo', 'gu', 'muji'],
  'health': ['hospital', 'clinic', 'doctor', 'medicine', 'pharmacy', 'medical', 'diagnostic', 'apollo', 'health', '健保', '診所', '屈臣氏', 'watsons', 'cosmed', '康是美', '藥局'],
  'utilities': ['electricity', 'water', 'gas', 'internet', 'wifi', 'broadband', 'bill', 'mobile recharge', 'recharge', 'chunghwa', '中華電信', 'taiwan mobile', '台灣大哥大', 'fareastone', '遠傳', '台電', '水費', '電費', '房租', 'rent'],
  'education': ['book', 'course', 'tuition', 'school', 'college', 'udemy', 'coursera', 'eslite', '誠品', 'ntu', 'nccu', 'nycu', 'nthu'],
}

function inferCategoryHint(text: string): string | null {
  const lower = text.toLowerCase()
  for (const [categoryKey, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(k => lower.includes(k))) {
      return categoryKey
    }
  }
  return null
}

// ============================================================
// MAIN PARSER
// ============================================================

export function parseNaturalLanguageExpense(input: string): ParsedTransaction {
  const text = input.trim()
  const result: ParsedTransaction = {
    amount_minor: null,
    type: null,
    date: null,
    merchant: null,
    description: null,
    category_id: null,
    payment_method: null,
    confidence: 'low',
    ambiguous_fields: [],
  }

  // 1. Detect transaction type
  const lowerText = text.toLowerCase()
  const hasIncomeKw = INCOME_KEYWORDS.some(k => lowerText.includes(k))
  const hasExpenseKw = EXPENSE_KEYWORDS.some(k => lowerText.includes(k))

  if (hasIncomeKw && !hasExpenseKw) {
    result.type = 'income'
  } else if (hasExpenseKw && !hasIncomeKw) {
    result.type = 'expense'
  } else if (!hasIncomeKw && !hasExpenseKw) {
    result.type = 'expense' // default assumption
    result.ambiguous_fields.push('type')
  } else {
    result.ambiguous_fields.push('type')
  }

  // 2. Extract amount
  for (const pattern of AMOUNT_PATTERNS) {
    const match = text.match(pattern)
    if (match) {
      const amountStr = match[1].replace(/,/g, '')
      result.amount_minor = toMinorUnits(amountStr)
      break
    }
  }
  if (!result.amount_minor) {
    result.ambiguous_fields.push('amount')
  }

  // 3. Extract date
  for (const { pattern, parse } of DATE_PATTERNS) {
    const match = text.match(pattern)
    if (match) {
      const date = parse(match)
      if (date && !isNaN(date.getTime())) {
        result.date = format(date, 'yyyy-MM-dd')
        break
      }
    }
  }
  if (!result.date) {
    result.date = format(new Date(), 'yyyy-MM-dd') // default to today
    result.ambiguous_fields.push('date')
  }

  // 4. Extract payment method
  for (const [keyword, method] of Object.entries(PAYMENT_METHOD_MAP)) {
    if (lowerText.includes(keyword)) {
      result.payment_method = method
      break
    }
  }

  // 5. Extract merchant/description from common patterns
  // "spent ₹X on <merchant>" or "paid ₹X to <merchant>"
  const merchantPatterns = [
    /(?:on|at|for|to)\s+([A-Za-z][A-Za-z0-9\s\-']+?)(?:\s+(?:using|via|with|yesterday|today|on\b)|$)/i,
    /(?:bought|ordered|purchased)\s+([A-Za-z][A-Za-z0-9\s\-']+?)(?:\s+(?:from|using|via|yesterday|today)|$)/i,
  ]
  for (const p of merchantPatterns) {
    const m = text.match(p)
    if (m && m[1].length > 1) {
      result.merchant = m[1].trim()
      result.description = m[1].trim()
      break
    }
  }
  if (!result.merchant) {
    result.ambiguous_fields.push('merchant')
  }

  // 6. Infer category
  const searchText = [result.merchant, text].filter(Boolean).join(' ')
  const catHint = inferCategoryHint(searchText)
  if (catHint) {
    result.category_id = catHint // will be resolved to actual ID by caller
  }

  // 7. Set confidence
  const defined = ['amount_minor', 'type', 'date', 'merchant'] as const
  const ambiguousCount = result.ambiguous_fields.length
  if (ambiguousCount === 0) {
    result.confidence = 'high'
  } else if (ambiguousCount <= 2) {
    result.confidence = 'medium'
  } else {
    result.confidence = 'low'
  }

  return result
}

/** Validate parsed result — returns true if it's safe to save without confirmation */
export function isHighConfidenceParse(parsed: ParsedTransaction): boolean {
  return (
    parsed.confidence === 'high' &&
    parsed.amount_minor !== null &&
    parsed.amount_minor > 0 &&
    parsed.type !== null &&
    parsed.date !== null
  )
}
