// ============================================================
// CORE FINANCIAL TYPES
// All monetary amounts are stored as integer minor units (paise for INR, cents for USD)
// This avoids floating-point precision issues
// ============================================================

export type TransactionType = 'expense' | 'income' | 'transfer';

export type PaymentMethod =
  | 'cash'
  | 'upi'
  | 'easycard'
  | 'line_pay'
  | 'px_pay'
  | 'credit_card'
  | 'debit_card'
  | 'net_banking'
  | 'wallet'
  | 'bank_transfer'
  | 'cheque'
  | 'other';

export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export type BudgetPeriod = 'weekly' | 'monthly' | 'custom';

export type InsightType = 'tip' | 'warning' | 'forecast' | 'achievement';

export type CategoryType = 'expense' | 'income';

// ============================================================
// USER & AUTH
// ============================================================

export interface UserProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  currency: string;           // ISO 4217, e.g. "INR"
  locale: string;             // BCP 47, e.g. "en-IN"
  opening_balance_minor: number; // integer minor units
  theme: 'dark' | 'light' | 'system';
  onboarding_complete: boolean;
  ai_consent: boolean;        // whether user consented to sending data to Groq
  created_at: string;
  updated_at: string;
}

// ============================================================
// CATEGORIES
// ============================================================

export interface Category {
  id: string;
  user_id: string | null;     // null = system default, visible to all
  name: string;
  icon: string;               // lucide icon name
  color: string;              // hex color
  type: CategoryType;
  budget_minor: number | null;  // optional category-level budget
  is_archived: boolean;
  sort_order: number;
  created_at: string;
}

// ============================================================
// TRANSACTIONS
// ============================================================

export interface Transaction {
  id: string;
  user_id: string;
  amount_minor: number;        // always positive; type determines direction
  currency?: string;           // ISO 4217, e.g. "TWD", "INR"
  original_amount_minor?: number;
  original_currency?: string;
  type: TransactionType;
  category_id: string | null;
  category?: Category;
  date: string;                // ISO date string YYYY-MM-DD
  time: string;                // HH:MM:SS
  merchant: string;
  description: string;
  payment_method: PaymentMethod;
  tags: string[];
  notes: string | null;
  receipt_url: string | null;
  is_recurring: boolean;
  recurring_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TransactionFormData {
  amount: string;              // user input string, validated and converted to minor units
  currency?: string;
  type: TransactionType;
  category_id: string;
  date: string;
  time: string;
  merchant: string;
  description: string;
  payment_method: PaymentMethod;
  tags: string[];
  notes: string;
  is_recurring: boolean;
  recurring_frequency?: RecurringFrequency;
}

export interface TransactionFilters {
  search?: string;
  type?: TransactionType | 'all';
  category_id?: string;
  payment_method?: PaymentMethod | 'all';
  date_from?: string;
  date_to?: string;
  amount_min?: number;
  amount_max?: number;
  tags?: string[];
}

export type SortField = 'date' | 'amount' | 'merchant';
export type SortDirection = 'asc' | 'desc';

export interface TransactionSort {
  field: SortField;
  direction: SortDirection;
}

// ============================================================
// BUDGETS
// ============================================================

export interface Budget {
  id: string;
  user_id: string;
  period: BudgetPeriod;
  total_minor: number;
  start_date: string;
  end_date: string | null;    // null for monthly/weekly (computed)
  warn_threshold_pct: number;   // e.g. 70
  alert_threshold_pct: number;  // e.g. 90
  created_at: string;
  updated_at: string;
}

export interface BudgetStatus {
  budget: Budget;
  spent_minor: number;
  remaining_minor: number;
  percent_used: number;
  status: 'safe' | 'warning' | 'alert' | 'exceeded';
}

// ============================================================
// SAVINGS GOALS
// ============================================================

export interface SavingsGoal {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: string;
  target_minor: number;
  current_minor: number;
  target_date: string | null;
  monthly_contribution_minor: number | null;
  created_at: string;
  updated_at: string;
}

export interface GoalProgress {
  goal: SavingsGoal;
  progress_pct: number;
  remaining_minor: number;
  estimated_completion_date: string | null;
  months_to_target: number | null;
  on_track: boolean;
}

// ============================================================
// RECURRING TRANSACTIONS
// ============================================================

export interface RecurringTransaction {
  id: string;
  user_id: string;
  amount_minor: number;
  type: TransactionType;
  category_id: string | null;
  category?: Category;
  merchant: string;
  description: string;
  payment_method: PaymentMethod;
  frequency: RecurringFrequency;
  start_date: string;
  end_date: string | null;
  next_due_date: string;
  is_active: boolean;
  last_generated_date: string | null;
  created_at: string;
}

// ============================================================
// AI INSIGHTS
// ============================================================

export interface AIInsight {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: InsightType;
  category_id?: string;
  supporting_data?: Record<string, unknown>;
  dismissed: boolean;
  helpful: boolean | null;
  generated_at: string;
}

// ============================================================
// FINANCIAL SUMMARIES (computed, not stored)
// ============================================================

export interface MonthlyFinancials {
  year: number;
  month: number;
  total_income_minor: number;
  total_expenses_minor: number;
  net_minor: number;
  savings_rate_pct: number | null;  // null if no income
  transaction_count: number;
}

export interface DashboardSummary {
  balance_minor: number;
  current_month: MonthlyFinancials;
  previous_month: MonthlyFinancials;
  month_over_month_expense_change_pct: number | null;
  recent_transactions: Transaction[];
  upcoming_recurring: RecurringTransaction[];
  budget_status: BudgetStatus[];
  goal_progress: GoalProgress[];
  category_breakdown: CategoryBreakdown[];
  daily_spending: DailySpending[];
}

export interface CategoryBreakdown {
  category: Category;
  total_minor: number;
  transaction_count: number;
  percent_of_expenses: number;
}

export interface DailySpending {
  date: string;       // YYYY-MM-DD
  total_minor: number;
  income_minor: number;
  expense_minor: number;
}

// ============================================================
// CASH FLOW FORECAST
// ============================================================

export interface CashFlowForecast {
  forecast_date: string;          // when generated
  period_end_date: string;        // end of forecast window
  current_balance_minor: number;
  expected_income_minor: number;
  expected_expenses_minor: number;
  projected_balance_minor: number;
  optimistic_balance_minor: number;
  conservative_balance_minor: number;
  daily_spending_guideline_minor: number | null;
  upcoming_bills: UpcomingBill[];
  assumptions: string[];
  confidence: 'low' | 'medium' | 'high';
}

export interface UpcomingBill {
  recurring: RecurringTransaction;
  due_date: string;
  amount_minor: number;
  days_until_due: number;
}

// ============================================================
// NATURAL LANGUAGE PARSING
// ============================================================

export interface ParsedTransaction {
  amount_minor: number | null;
  type: TransactionType | null;
  date: string | null;          // YYYY-MM-DD
  merchant: string | null;
  description: string | null;
  category_id: string | null;
  payment_method: PaymentMethod | null;
  confidence: 'high' | 'medium' | 'low';
  ambiguous_fields: string[];   // field names that need user confirmation
}

// ============================================================
// API RESPONSE TYPES
// ============================================================

export interface APIResponse<T> {
  data: T | null;
  error: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// ============================================================
// UI STATE TYPES
// ============================================================

export type ViewPeriod = 'week' | 'month' | 'quarter' | 'year';

export interface DateRange {
  from: Date;
  to: Date;
}

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant: 'default' | 'success' | 'warning' | 'destructive';
  duration?: number;
}

export interface ConfirmDialogState {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  destructive: boolean;
  onConfirm: () => void;
}
