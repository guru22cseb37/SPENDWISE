/**
 * Financial calculation utilities.
 * All amounts are in integer minor units (paise for INR, cents for USD).
 * This file contains ONLY deterministic math — no API calls.
 */

import { 
  Transaction, 
  MonthlyFinancials, 
  CategoryBreakdown, 
  DailySpending,
  BudgetStatus,
  Budget,
  GoalProgress,
  SavingsGoal,
  CashFlowForecast,
  RecurringTransaction,
  UpcomingBill,
  UserProfile,
} from '@/types'
import { 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
  eachDayOfInterval,
  format,
  parseISO,
  differenceInDays,
  differenceInMonths,
  addMonths,
  addWeeks,
  addDays,
  addYears,
  isBefore,
  isAfter,
  isWithinInterval,
} from 'date-fns'

// ============================================================
// BASIC CONVERSIONS
// ============================================================

/** Convert user-input decimal string to integer minor units */
export function toMinorUnits(amount: string | number, decimals = 2): number {
  const num = typeof amount === 'string' ? parseFloat(amount.replace(/,/g, '')) : amount
  if (isNaN(num)) return 0
  // Use string manipulation to avoid floating-point issues
  const str = num.toFixed(decimals)
  const [integer, fraction = ''] = str.split('.')
  const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals)
  return parseInt(integer + paddedFraction, 10)
}

/** Convert minor units to display decimal (for Intl.NumberFormat) */
export function fromMinorUnits(minor: number, decimals = 2): number {
  // Safe division using string to avoid float issues
  const str = String(Math.abs(minor)).padStart(decimals + 1, '0')
  const intPart = str.slice(0, str.length - decimals) || '0'
  const fracPart = str.slice(str.length - decimals)
  const result = parseFloat(`${intPart}.${fracPart}`)
  return minor < 0 ? -result : result
}

// ============================================================
// FORMATTING
// ============================================================

/** Format minor units as currency string */
export function formatCurrency(
  minor: number,
  currency = 'INR',
  locale = 'en-IN',
  options: Partial<Intl.NumberFormatOptions> = {}
): string {
  const decimal = fromMinorUnits(minor)

  if (currency === 'TWD') {
    const formatted = new Intl.NumberFormat('zh-TW', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
      ...options,
    }).format(Math.round(decimal))
    return `NT$ ${formatted}`
  }

  if (currency === 'INR') {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
      ...options,
    }).format(decimal)
  }

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
      ...options,
    }).format(decimal)
  } catch {
    return `${currency} ${decimal.toFixed(2)}`
  }
}

/** Format a compact currency (e.g. ₹1.2L or NT$ 15K) */
export function formatCurrencyCompact(
  minor: number,
  currency = 'INR',
  locale = 'en-IN'
): string {
  const decimal = fromMinorUnits(minor)

  if (currency === 'TWD') {
    if (Math.abs(decimal) >= 1000000) {
      return `NT$ ${(decimal / 1000000).toFixed(1)}M`
    }
    if (Math.abs(decimal) >= 1000) {
      return `NT$ ${(decimal / 1000).toFixed(1)}K`
    }
    return `NT$ ${Math.round(decimal)}`
  }

  if (currency === 'INR') {
    if (Math.abs(decimal) >= 10000000) {
      return `₹${(decimal / 10000000).toFixed(1)}Cr`
    }
    if (Math.abs(decimal) >= 100000) {
      return `₹${(decimal / 100000).toFixed(1)}L`
    }
    if (Math.abs(decimal) >= 1000) {
      return `₹${(decimal / 1000).toFixed(1)}K`
    }
    return `₹${Math.round(decimal)}`
  }

  if (Math.abs(decimal) >= 1000000) {
    return `${currency} ${(decimal / 1000000).toFixed(1)}M`
  }
  if (Math.abs(decimal) >= 1000) {
    return `${currency} ${(decimal / 1000).toFixed(1)}K`
  }

  return formatCurrency(minor, currency, locale)
}

/** Format a date string for display */
export function formatDate(dateStr: string, fmt = 'dd MMM yyyy'): string {
  try {
    return format(parseISO(dateStr), fmt)
  } catch {
    return dateStr
  }
}

/** Format a percentage */
export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`
}

// ============================================================
// TRANSACTION AGGREGATIONS
// ============================================================

/** Filter transactions by date range */
export function filterByDateRange(
  transactions: Transaction[],
  from: Date,
  to: Date
): Transaction[] {
  return transactions.filter(tx => {
    const date = parseISO(tx.date)
    return isWithinInterval(date, { start: from, end: to })
  })
}

/** Get transactions for a specific month */
export function getMonthTransactions(
  transactions: Transaction[],
  year: number,
  month: number  // 0-indexed
): Transaction[] {
  const start = startOfMonth(new Date(year, month, 1))
  const end = endOfMonth(start)
  return filterByDateRange(transactions, start, end)
}

/** Calculate total income for a set of transactions */
export function totalIncome(transactions: Transaction[]): number {
  return transactions
    .filter(tx => tx.type === 'income')
    .reduce((sum, tx) => sum + tx.amount_minor, 0)
}

/** Calculate total expenses for a set of transactions */
export function totalExpenses(transactions: Transaction[]): number {
  return transactions
    .filter(tx => tx.type === 'expense')
    .reduce((sum, tx) => sum + tx.amount_minor, 0)
}

/** Calculate net (income - expenses); transfers excluded */
export function netAmount(transactions: Transaction[]): number {
  return totalIncome(transactions) - totalExpenses(transactions)
}

/** Calculate savings rate as percentage */
export function savingsRate(income: number, expenses: number): number | null {
  if (income <= 0) return null
  const savings = income - expenses
  return Math.max(0, (savings / income) * 100)
}

/** Compute current balance = opening_balance + all-time net */
export function computeBalance(
  openingBalanceMinor: number,
  allTransactions: Transaction[]
): number {
  return openingBalanceMinor + netAmount(allTransactions)
}

/** Build monthly financials summary */
export function buildMonthlyFinancials(
  transactions: Transaction[],
  year: number,
  month: number
): MonthlyFinancials {
  const txs = getMonthTransactions(transactions, year, month)
  const income = totalIncome(txs)
  const expenses = totalExpenses(txs)
  return {
    year,
    month,
    total_income_minor: income,
    total_expenses_minor: expenses,
    net_minor: income - expenses,
    savings_rate_pct: savingsRate(income, expenses),
    transaction_count: txs.length,
  }
}

/** Build category breakdown for a given period */
export function buildCategoryBreakdown(
  transactions: Transaction[]
): CategoryBreakdown[] {
  const expenses = transactions.filter(tx => tx.type === 'expense')
  const totalExp = totalExpenses(expenses)

  const map = new Map<string, { category: Transaction['category']; total: number; count: number }>()

  for (const tx of expenses) {
    const catId = tx.category_id || 'uncategorized'
    const existing = map.get(catId)
    if (existing) {
      existing.total += tx.amount_minor
      existing.count += 1
    } else {
      map.set(catId, {
        category: tx.category,
        total: tx.amount_minor,
        count: 1,
      })
    }
  }

  return Array.from(map.entries())
    .map(([, { category, total, count }]) => ({
      category: category || {
        id: 'uncategorized',
        user_id: null,
        name: 'Uncategorized',
        icon: 'HelpCircle',
        color: '#64748b',
        type: 'expense' as const,
        budget_minor: null,
        is_archived: false,
        sort_order: 999,
        created_at: '',
      },
      total_minor: total,
      transaction_count: count,
      percent_of_expenses: totalExp > 0 ? (total / totalExp) * 100 : 0,
    }))
    .sort((a, b) => b.total_minor - a.total_minor)
}

/** Build daily spending for a date interval */
export function buildDailySpending(
  transactions: Transaction[],
  from: Date,
  to: Date
): DailySpending[] {
  const days = eachDayOfInterval({ start: from, end: to })
  return days.map(day => {
    const dateStr = format(day, 'yyyy-MM-dd')
    const dayTxs = transactions.filter(tx => tx.date === dateStr)
    return {
      date: dateStr,
      total_minor: netAmount(dayTxs),
      income_minor: totalIncome(dayTxs),
      expense_minor: totalExpenses(dayTxs),
    }
  })
}

// ============================================================
// BUDGET CALCULATIONS
// ============================================================

/** Compute budget status from transactions */
export function computeBudgetStatus(
  budget: Budget,
  transactions: Transaction[],
  referenceDate: Date = new Date()
): BudgetStatus {
  const ref = referenceDate
  let from: Date
  let to: Date

  if (budget.period === 'monthly') {
    from = startOfMonth(ref)
    to = endOfMonth(ref)
  } else if (budget.period === 'weekly') {
    from = startOfWeek(ref, { weekStartsOn: 1 })
    to = endOfWeek(ref, { weekStartsOn: 1 })
  } else {
    from = parseISO(budget.start_date)
    to = budget.end_date ? parseISO(budget.end_date) : endOfMonth(ref)
  }

  const periodTxs = filterByDateRange(transactions, from, to)
  const spent = totalExpenses(periodTxs)
  const remaining = Math.max(0, budget.total_minor - spent)
  const pct = budget.total_minor > 0 ? (spent / budget.total_minor) * 100 : 0

  let status: BudgetStatus['status'] = 'safe'
  if (spent >= budget.total_minor) {
    status = 'exceeded'
  } else if (pct >= budget.alert_threshold_pct) {
    status = 'alert'
  } else if (pct >= budget.warn_threshold_pct) {
    status = 'warning'
  }

  return {
    budget,
    spent_minor: spent,
    remaining_minor: remaining,
    percent_used: pct,
    status,
  }
}

// ============================================================
// SAVINGS GOALS
// ============================================================

/** Compute goal progress */
export function computeGoalProgress(goal: SavingsGoal): GoalProgress {
  const progress_pct = goal.target_minor > 0
    ? Math.min(100, (goal.current_minor / goal.target_minor) * 100)
    : 0
  const remaining_minor = Math.max(0, goal.target_minor - goal.current_minor)

  let months_to_target: number | null = null
  let estimated_completion_date: string | null = null
  let on_track = false

  if (goal.monthly_contribution_minor && goal.monthly_contribution_minor > 0 && remaining_minor > 0) {
    months_to_target = Math.ceil(remaining_minor / goal.monthly_contribution_minor)
    const completion = addMonths(new Date(), months_to_target)
    estimated_completion_date = format(completion, 'yyyy-MM-dd')

    if (goal.target_date) {
      const targetDate = parseISO(goal.target_date)
      on_track = isBefore(completion, targetDate)
    } else {
      on_track = true
    }
  } else if (goal.target_date) {
    on_track = goal.current_minor >= goal.target_minor
  }

  return {
    goal,
    progress_pct,
    remaining_minor,
    estimated_completion_date,
    months_to_target,
    on_track,
  }
}

// ============================================================
// CASH FLOW FORECAST
// ============================================================

/** Compute next due date for a recurring transaction */
export function computeNextDueDate(
  recurring: RecurringTransaction,
  afterDate: Date = new Date()
): Date {
  let date = parseISO(recurring.next_due_date)
  while (isBefore(date, afterDate)) {
    switch (recurring.frequency) {
      case 'daily': date = addDays(date, 1); break
      case 'weekly': date = addWeeks(date, 1); break
      case 'monthly': date = addMonths(date, 1); break
      case 'yearly': date = addYears(date, 1); break
    }
  }
  return date
}

/** Build upcoming bills within next N days */
export function buildUpcomingBills(
  recurringTransactions: RecurringTransaction[],
  daysAhead = 30
): UpcomingBill[] {
  const now = new Date()
  const endDate = addDays(now, daysAhead)

  return recurringTransactions
    .filter(r => r.is_active && r.type === 'expense')
    .flatMap(r => {
      const due = computeNextDueDate(r)
      if (isAfter(due, endDate)) return []
      return [{
        recurring: r,
        due_date: format(due, 'yyyy-MM-dd'),
        amount_minor: r.amount_minor,
        days_until_due: differenceInDays(due, now),
      }]
    })
    .sort((a, b) => a.days_until_due - b.days_until_due)
}

/** Build a cash flow forecast */
export function buildCashFlowForecast(
  profile: UserProfile,
  allTransactions: Transaction[],
  recurringTransactions: RecurringTransaction[],
  daysAhead = 30
): CashFlowForecast {
  const now = new Date()
  const periodEnd = addDays(now, daysAhead)

  const currentBalance = computeBalance(profile.opening_balance_minor, allTransactions)

  // Recent spending average (last 30 days)
  const recentStart = addDays(now, -30)
  const recentTxs = filterByDateRange(allTransactions, recentStart, now)
  const recentExpenses = totalExpenses(recentTxs)
  const avgDailyExpense = Math.round(recentExpenses / 30)

  // Expected recurring income
  const upcomingIncome = recurringTransactions
    .filter(r => r.is_active && r.type === 'income')
    .reduce((sum, r) => {
      const due = computeNextDueDate(r)
      if (isAfter(due, periodEnd)) return sum
      return sum + r.amount_minor
    }, 0)

  // Expected recurring expenses (bills)
  const bills = buildUpcomingBills(recurringTransactions, daysAhead)
  const upcomingBillsTotal = bills.reduce((sum, b) => sum + b.amount_minor, 0)

  // Discretionary estimate
  const estimatedDiscretionary = avgDailyExpense * daysAhead

  const expectedExpenses = upcomingBillsTotal + estimatedDiscretionary
  const projected = currentBalance + upcomingIncome - expectedExpenses

  // Scenarios: optimistic = 20% less discretionary, conservative = 20% more
  const optimistic = currentBalance + upcomingIncome - (upcomingBillsTotal + estimatedDiscretionary * 0.8)
  const conservative = currentBalance + upcomingIncome - (upcomingBillsTotal + estimatedDiscretionary * 1.2)

  const remainingBudget = currentBalance - upcomingBillsTotal
  const dailyGuideline = daysAhead > 0 ? Math.max(0, Math.round(remainingBudget / daysAhead)) : null

  const assumptions = [
    `Daily discretionary spending estimated at ${formatCurrency(avgDailyExpense)} based on last 30 days.`,
    `${bills.length} recurring bill(s) identified totalling ${formatCurrency(upcomingBillsTotal)}.`,
    `Forecast period: ${daysAhead} days. Actual results will vary.`,
    `Transfers between your own accounts are excluded.`,
  ]

  const confidence: CashFlowForecast['confidence'] = 
    recentTxs.length >= 10 ? 'high' : 
    recentTxs.length >= 5 ? 'medium' : 'low'

  return {
    forecast_date: format(now, 'yyyy-MM-dd'),
    period_end_date: format(periodEnd, 'yyyy-MM-dd'),
    current_balance_minor: currentBalance,
    expected_income_minor: upcomingIncome,
    expected_expenses_minor: expectedExpenses,
    projected_balance_minor: projected,
    optimistic_balance_minor: optimistic,
    conservative_balance_minor: conservative,
    daily_spending_guideline_minor: dailyGuideline,
    upcoming_bills: bills,
    assumptions,
    confidence,
  }
}

// ============================================================
// PERIOD HELPERS
// ============================================================

export function getPeriodRange(period: 'week' | 'month' | 'quarter' | 'year', date = new Date()): { from: Date; to: Date } {
  switch (period) {
    case 'week':
      return { from: startOfWeek(date, { weekStartsOn: 1 }), to: endOfWeek(date, { weekStartsOn: 1 }) }
    case 'month':
      return { from: startOfMonth(date), to: endOfMonth(date) }
    case 'quarter':
      return { from: startOfQuarter(date), to: endOfQuarter(date) }
    case 'year':
      return { from: startOfYear(date), to: endOfYear(date) }
  }
}

export function getMonthOverMonthChange(current: number, previous: number): number | null {
  if (previous === 0) return null
  return ((current - previous) / previous) * 100
}
