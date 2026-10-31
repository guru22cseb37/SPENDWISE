/**
 * Zod validation schemas for forms and API responses.
 */

import { z } from 'zod'

// ============================================================
// TRANSACTION SCHEMA
// ============================================================

export const transactionFormSchema = z.object({
  amount: z
    .string()
    .min(1, 'Amount is required')
    .refine(val => {
      const num = parseFloat(val.replace(/,/g, ''))
      return !isNaN(num) && num > 0
    }, 'Please enter a valid positive amount'),

  type: z.enum(['expense', 'income', 'transfer'], {
    required_error: 'Transaction type is required',
  }),

  category_id: z.string().optional(),

  date: z
    .string()
    .min(1, 'Date is required')
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),

  time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Invalid time format')
    .optional()
    .default('00:00'),

  merchant: z
    .string()
    .max(200, 'Merchant name too long')
    .optional()
    .default(''),

  description: z
    .string()
    .max(500, 'Description too long')
    .optional()
    .default(''),

  currency: z.string().optional(),

  payment_method: z
    .enum([
      'cash',
      'easycard',
      'line_pay',
      'px_pay',
      'upi',
      'credit_card',
      'debit_card',
      'net_banking',
      'wallet',
      'bank_transfer',
      'cheque',
      'other',
    ])
    .optional()
    .default('cash'),

  tags: z.array(z.string().max(50)).max(10).optional().default([]),

  notes: z.string().max(1000, 'Notes too long').optional().default(''),

  is_recurring: z.boolean().optional().default(false),

  recurring_frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']).optional(),
})

export type TransactionFormValues = z.infer<typeof transactionFormSchema>

// ============================================================
// CATEGORY SCHEMA
// ============================================================

export const categoryFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Category name is required')
    .max(50, 'Name too long'),
  icon: z.string().min(1, 'Icon is required'),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format'),
  type: z.enum(['expense', 'income']),
  budget_amount: z
    .string()
    .optional()
    .refine(val => {
      if (!val || val === '') return true
      const num = parseFloat(val)
      return !isNaN(num) && num >= 0
    }, 'Invalid budget amount'),
})

export type CategoryFormValues = z.infer<typeof categoryFormSchema>

// ============================================================
// BUDGET SCHEMA
// ============================================================

export const budgetFormSchema = z.object({
  total_amount: z
    .string()
    .min(1, 'Budget amount is required')
    .refine(val => {
      const num = parseFloat(val.replace(/,/g, ''))
      return !isNaN(num) && num > 0
    }, 'Please enter a valid budget amount'),

  period: z.enum(['weekly', 'monthly', 'custom']),

  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),

  warn_threshold_pct: z
    .number()
    .min(1)
    .max(99)
    .default(70),

  alert_threshold_pct: z
    .number()
    .min(1)
    .max(100)
    .default(90),
}).refine(data => {
  if (data.period === 'custom') {
    return data.start_date && data.end_date
  }
  return true
}, {
  message: 'Start and end dates required for custom period',
  path: ['start_date'],
})

export type BudgetFormValues = z.infer<typeof budgetFormSchema>

// ============================================================
// SAVINGS GOAL SCHEMA
// ============================================================

export const savingsGoalFormSchema = z.object({
  name: z.string().min(1, 'Goal name is required').max(100),
  icon: z.string().min(1),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),

  target_amount: z
    .string()
    .min(1, 'Target amount is required')
    .refine(val => {
      const num = parseFloat(val.replace(/,/g, ''))
      return !isNaN(num) && num > 0
    }, 'Please enter a valid target amount'),

  current_amount: z
    .string()
    .optional()
    .refine(val => {
      if (!val || val === '') return true
      const num = parseFloat(val.replace(/,/g, ''))
      return !isNaN(num) && num >= 0
    }, 'Invalid amount'),

  target_date: z
    .string()
    .optional()
    .refine(val => {
      if (!val || val === '') return true
      return /^\d{4}-\d{2}-\d{2}$/.test(val)
    }, 'Invalid date format'),

  monthly_contribution: z
    .string()
    .optional()
    .refine(val => {
      if (!val || val === '') return true
      const num = parseFloat(val.replace(/,/g, ''))
      return !isNaN(num) && num >= 0
    }, 'Invalid amount'),
})

export type SavingsGoalFormValues = z.infer<typeof savingsGoalFormSchema>

// ============================================================
// AUTH SCHEMAS
// ============================================================

export const signUpSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must include an uppercase letter')
    .regex(/[0-9]/, 'Must include a number'),
  display_name: z.string().min(2, 'Name must be at least 2 characters').max(50),
  confirm_password: z.string(),
}).refine(data => data.password === data.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
})

export const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export type SignUpValues = z.infer<typeof signUpSchema>
export type SignInValues = z.infer<typeof signInSchema>

// ============================================================
// USER PROFILE SCHEMA
// ============================================================

export const profileFormSchema = z.object({
  display_name: z.string().min(2).max(50),
  currency: z.string().length(3, 'Must be a 3-letter currency code'),
  locale: z.string().min(2, 'Select a locale'),
  opening_balance: z.string().refine(val => {
    const num = parseFloat(val.replace(/,/g, ''))
    return !isNaN(num)
  }, 'Invalid opening balance'),
  theme: z.enum(['dark', 'light', 'system']),
  ai_consent: z.boolean(),
})

export type ProfileFormValues = z.infer<typeof profileFormSchema>

// ============================================================
// AI RESPONSE SCHEMA (validates Groq output)
// ============================================================

export const aiInsightResponseSchema = z.object({
  insights: z.array(z.object({
    title: z.string().max(100),
    body: z.string().max(1000),
    type: z.enum(['tip', 'warning', 'forecast', 'achievement']),
    category_hint: z.string().optional(),
    potential_saving_minor: z.number().optional(),
    assumptions: z.string().optional(),
  })).max(10),
  summary: z.string().max(500).optional(),
})

export type AIInsightResponse = z.infer<typeof aiInsightResponseSchema>

// ============================================================
// NATURAL LANGUAGE INPUT SCHEMA
// ============================================================

export const naturalLanguageInputSchema = z.object({
  text: z
    .string()
    .min(3, 'Please enter more detail')
    .max(500, 'Input too long'),
})

export type NLInputValues = z.infer<typeof naturalLanguageInputSchema>

// ============================================================
// FILTER SCHEMA
// ============================================================

export const filterFormSchema = z.object({
  search: z.string().optional(),
  type: z.enum(['all', 'expense', 'income', 'transfer']).optional(),
  category_id: z.string().optional(),
  payment_method: z.enum(['all', 'cash', 'upi', 'credit_card', 'debit_card', 'net_banking', 'wallet', 'bank_transfer', 'cheque', 'other']).optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  amount_min: z.string().optional(),
  amount_max: z.string().optional(),
})

export type FilterFormValues = z.infer<typeof filterFormSchema>
