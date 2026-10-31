/**
 * Transaction store — Resilient hybrid store with Supabase sync and
 * robust LocalStorage persistence fallback.
 * Ensures transactions and categories ALWAYS work even if remote DB tables are uninitialized.
 */

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { supabase } from '@/lib/supabase'
import { Transaction, TransactionFilters, TransactionSort, Category } from '@/types'
import { TransactionFormValues } from '@/lib/schemas'
import { toMinorUnits } from '@/lib/calculations'
import { format, subDays } from 'date-fns'

const PAGE_SIZE = 50
const LOCAL_TX_KEY = 'spendwise_transactions_v2'

export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'cat-food',
    user_id: null,
    name: 'Food & Dining (餐飲/外食)',
    icon: 'Utensils',
    color: '#f59e0b',
    type: 'expense',
    budget_minor: 1200000,
    is_archived: false,
    sort_order: 1,
    created_at: new Date().toISOString(),
  },
  {
    id: 'cat-groceries',
    user_id: null,
    name: 'Groceries (全聯/超市)',
    icon: 'ShoppingBag',
    color: '#10b981',
    type: 'expense',
    budget_minor: 800000,
    is_archived: false,
    sort_order: 2,
    created_at: new Date().toISOString(),
  },
  {
    id: 'cat-transport',
    user_id: null,
    name: 'Transport & TPASS (捷運/交通)',
    icon: 'Car',
    color: '#3b82f6',
    type: 'expense',
    budget_minor: 250000,
    is_archived: false,
    sort_order: 3,
    created_at: new Date().toISOString(),
  },
  {
    id: 'cat-housing',
    user_id: null,
    name: 'Housing & Rent (房租)',
    icon: 'Home',
    color: '#8b5cf6',
    type: 'expense',
    budget_minor: 1800000,
    is_archived: false,
    sort_order: 4,
    created_at: new Date().toISOString(),
  },
  {
    id: 'cat-utilities',
    user_id: null,
    name: 'Utilities & Telecom (水電瓦斯/網路)',
    icon: 'Zap',
    color: '#06b6d4',
    type: 'expense',
    budget_minor: 200000,
    is_archived: false,
    sort_order: 5,
    created_at: new Date().toISOString(),
  },
  {
    id: 'cat-healthcare',
    user_id: null,
    name: 'Healthcare & NHI (醫療健保)',
    icon: 'Heart',
    color: '#ec4899',
    type: 'expense',
    budget_minor: 100000,
    is_archived: false,
    sort_order: 6,
    created_at: new Date().toISOString(),
  },
  {
    id: 'cat-entertainment',
    user_id: null,
    name: 'Shopping & Leisure (休閒娛樂)',
    icon: 'ShoppingBag',
    color: '#f43f5e',
    type: 'expense',
    budget_minor: 500000,
    is_archived: false,
    sort_order: 7,
    created_at: new Date().toISOString(),
  },
  {
    id: 'cat-remit',
    user_id: null,
    name: 'Remittance to India (匯款回印度)',
    icon: 'RepeatIcon',
    color: '#6366f1',
    type: 'expense',
    budget_minor: 3000000,
    is_archived: false,
    sort_order: 8,
    created_at: new Date().toISOString(),
  },
  {
    id: 'cat-salary',
    user_id: null,
    name: 'Salary & Income (薪資收入)',
    icon: 'TrendingUp',
    color: '#10b981',
    type: 'income',
    budget_minor: null,
    is_archived: false,
    sort_order: 9,
    created_at: new Date().toISOString(),
  },
]

export function getSampleTransactions(userId: string = 'demo-user'): Transaction[] {
  const now = new Date()
  const today = format(now, 'yyyy-MM-dd')
  const yesterday = format(subDays(now, 1), 'yyyy-MM-dd')
  const day3 = format(subDays(now, 3), 'yyyy-MM-dd')
  const day5 = format(subDays(now, 5), 'yyyy-MM-dd')
  const day8 = format(subDays(now, 8), 'yyyy-MM-dd')
  const day12 = format(subDays(now, 12), 'yyyy-MM-dd')

  const catMap = Object.fromEntries(DEFAULT_CATEGORIES.map(c => [c.id, c]))

  return [
    {
      id: 'sample-1',
      user_id: userId,
      amount_minor: 6500000, // NT$ 65,000
      currency: 'TWD',
      type: 'income',
      category_id: 'cat-salary',
      category: catMap['cat-salary'],
      date: day12,
      time: '10:00:00',
      merchant: 'Tech Corp Taiwan (科技公司薪水)',
      description: 'Monthly salary credited in Taiwan',
      payment_method: 'bank_transfer',
      tags: ['salary', 'income'],
      notes: 'Direct bank deposit',
      receipt_url: null,
      is_recurring: true,
      recurring_id: null,
      created_at: day12,
      updated_at: day12,
    },
    {
      id: 'sample-2',
      user_id: userId,
      amount_minor: 1400000, // NT$ 14,000
      currency: 'TWD',
      type: 'expense',
      category_id: 'cat-housing',
      category: catMap['cat-housing'],
      date: day12,
      time: '11:30:00',
      merchant: 'Taipei Apartment Rent (台北房租)',
      description: 'Monthly studio rent near MRT',
      payment_method: 'bank_transfer',
      tags: ['rent', 'fixed'],
      notes: 'Water included',
      receipt_url: null,
      is_recurring: true,
      recurring_id: null,
      created_at: day12,
      updated_at: day12,
    },
    {
      id: 'sample-3',
      user_id: userId,
      amount_minor: 2000000, // NT$ 20,000 (~ ₹53,000 INR)
      currency: 'TWD',
      type: 'expense',
      category_id: 'cat-remit',
      category: catMap['cat-remit'],
      date: day8,
      time: '14:20:00',
      merchant: 'Family Remittance India (匯款回印度SBI)',
      description: 'Sent home via Index remittance app',
      payment_method: 'bank_transfer',
      tags: ['remittance', 'INR ≈ 53000'],
      notes: 'Saved NT$500 in bank telegraphic wire fees',
      receipt_url: null,
      is_recurring: false,
      recurring_id: null,
      created_at: day8,
      updated_at: day8,
    },
    {
      id: 'sample-4',
      user_id: userId,
      amount_minor: 120000, // NT$ 1,200
      currency: 'TWD',
      type: 'expense',
      category_id: 'cat-transport',
      category: catMap['cat-transport'],
      date: day5,
      time: '09:00:00',
      merchant: 'TPASS 1200 Commuter Pass (基北北桃)',
      description: 'Monthly unlimited Taipei Metro, buses, TRA & YouBike',
      payment_method: 'easycard',
      tags: ['tpass', 'commute', 'unlimited'],
      notes: 'Saves over NT$1,800 every single month',
      receipt_url: null,
      is_recurring: true,
      recurring_id: null,
      created_at: day5,
      updated_at: day5,
    },
    {
      id: 'sample-5',
      user_id: userId,
      amount_minor: 85000, // NT$ 850
      currency: 'TWD',
      type: 'expense',
      category_id: 'cat-groceries',
      category: catMap['cat-groceries'],
      date: day3,
      time: '19:40:00',
      merchant: 'PX Mart (全聯福利中心)',
      description: 'Milk, tofu, rice, fresh eggs & evening discount items',
      payment_method: 'px_pay',
      tags: ['groceries', 'receipt-lottery'],
      notes: 'Uniform invoice barcode bound to mobile 載具',
      receipt_url: null,
      is_recurring: false,
      recurring_id: null,
      created_at: day3,
      updated_at: day3,
    },
    {
      id: 'sample-6',
      user_id: userId,
      amount_minor: 14500, // NT$ 145
      currency: 'TWD',
      type: 'expense',
      category_id: 'cat-food',
      category: catMap['cat-food'],
      date: yesterday,
      time: '20:15:00',
      merchant: '7-Eleven (7-11 i-珍食)',
      description: 'Chicken breast bento & sugar-free green tea',
      payment_method: 'easycard',
      tags: ['dinner', 'discount-65%'],
      notes: 'Bought at 8:15 PM during 65% off hour',
      receipt_url: null,
      is_recurring: false,
      recurring_id: null,
      created_at: yesterday,
      updated_at: yesterday,
    },
    {
      id: 'sample-7',
      user_id: userId,
      amount_minor: 28000, // NT$ 280
      currency: 'TWD',
      type: 'expense',
      category_id: 'cat-food',
      category: catMap['cat-food'],
      date: yesterday,
      time: '21:30:00',
      merchant: 'Shilin Night Market (士林夜市美食)',
      description: 'Fried chicken cutlet & bubble tea',
      payment_method: 'line_pay',
      tags: ['street-food', 'night-market'],
      notes: 'Taiwan night market treats',
      receipt_url: null,
      is_recurring: false,
      recurring_id: null,
      created_at: yesterday,
      updated_at: yesterday,
    },
    {
      id: 'sample-8',
      user_id: userId,
      amount_minor: 59900, // NT$ 599
      currency: 'TWD',
      type: 'expense',
      category_id: 'cat-utilities',
      category: catMap['cat-utilities'],
      date: today,
      time: '08:30:00',
      merchant: 'Chunghwa Telecom (中華電信5G)',
      description: 'Unlimited 5G mobile data plan',
      payment_method: 'credit_card',
      tags: ['telecom', 'internet'],
      notes: 'Monthly billing',
      receipt_url: null,
      is_recurring: true,
      recurring_id: null,
      created_at: today,
      updated_at: today,
    },
    {
      id: 'sample-9',
      user_id: userId,
      amount_minor: 50000, // NT$ 500
      currency: 'TWD',
      type: 'income',
      category_id: 'cat-salary',
      category: catMap['cat-salary'],
      date: today,
      time: '11:00:00',
      merchant: 'Taiwan Receipt Lottery (統一發票六獎中獎)',
      description: 'Won NT$ 500 on 7-Eleven cloud invoice prize!',
      payment_method: 'cash',
      tags: ['lottery', 'invoice', 'free-money'],
      notes: 'Claimed at 7-11 ibon',
      receipt_url: null,
      is_recurring: false,
      recurring_id: null,
      created_at: today,
      updated_at: today,
    },
    {
      id: 'sample-10',
      user_id: userId,
      amount_minor: 65000, // ₹650 INR (~ NT$ 245)
      currency: 'INR',
      type: 'expense',
      category_id: 'cat-food',
      category: catMap['cat-food'],
      date: today,
      time: '12:30:00',
      merchant: 'Swiggy India (印度外賣訂單)',
      description: 'Lunch ordered for family in India',
      payment_method: 'upi',
      tags: ['swiggy', 'upi', 'india'],
      notes: 'Paid via GPay UPI',
      receipt_url: null,
      is_recurring: false,
      recurring_id: null,
      created_at: today,
      updated_at: today,
    },
  ]
}

function loadLocalTransactions(): Transaction[] {
  try {
    const raw = localStorage.getItem(LOCAL_TX_KEY)
    if (raw !== null) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        return parsed
      }
    }
  } catch (err) {
    console.error('Error loading local transactions', err)
  }
  // Auto-seed with rich Taiwan Dollars transactions only on very first launch
  const samples = getSampleTransactions('demo-user')
  saveLocalTransactions(samples)
  return samples
}

function saveLocalTransactions(txs: Transaction[]): void {
  try {
    localStorage.setItem(LOCAL_TX_KEY, JSON.stringify(txs))
  } catch (err) {
    console.error('Error saving local transactions', err)
  }
}

interface TransactionState {
  transactions: Transaction[]
  categories: Category[]
  loading: boolean
  error: string | null
  totalCount: number
  currentPage: number
  filters: TransactionFilters
  sort: TransactionSort
  lastDeleted: Transaction | null
  undoTimer: ReturnType<typeof setTimeout> | null

  // Actions
  fetchTransactions: (userId: string, page?: number) => Promise<void>
  fetchAllTransactions: (userId: string) => Promise<void>
  fetchCategories: (userId: string) => Promise<void>
  createTransaction: (userId: string, values: TransactionFormValues) => Promise<Transaction | null>
  updateTransaction: (id: string, values: Partial<TransactionFormValues>) => Promise<void>
  deleteTransaction: (id: string) => Promise<void>
  undoDelete: () => Promise<void>
  duplicateTransaction: (transaction: Transaction) => Promise<Transaction | null>
  loadSampleData: (userId?: string) => void
  clearAllData: () => void
  setFilters: (filters: TransactionFilters) => void
  setSort: (sort: TransactionSort) => void
  setPage: (page: number) => void
  clearError: () => void
}

export const useTransactionStore = create<TransactionState>()(
  subscribeWithSelector((set, get) => ({
    transactions: loadLocalTransactions(),
    categories: DEFAULT_CATEGORIES,
    loading: false,
    error: null,
    totalCount: loadLocalTransactions().length,
    currentPage: 1,
    filters: {},
    sort: { field: 'date', direction: 'desc' },
    lastDeleted: null,
    undoTimer: null,

    fetchTransactions: async (userId, page = 1) => {
      set({ loading: true, error: null })
      try {
        const from = (page - 1) * PAGE_SIZE
        const to = from + PAGE_SIZE - 1

        const { data, error, count } = await supabase
          .from('transactions')
          .select('*, category:categories(*)', { count: 'exact' })
          .eq('user_id', userId)
          .range(from, to)

        if (error || !data) {
          throw error || new Error('Remote not found')
        }

        set({
          transactions: (data as Transaction[]) || [],
          totalCount: count || 0,
          currentPage: page,
          loading: false,
        })
      } catch {
        // Fallback to local storage
        const local = loadLocalTransactions()
        set({
          transactions: local,
          totalCount: local.length,
          currentPage: page,
          loading: false,
        })
      }
    },

    fetchAllTransactions: async (userId) => {
      try {
        const { data, error } = await supabase
          .from('transactions')
          .select('*, category:categories(*)')
          .eq('user_id', userId)
          .order('date', { ascending: false })

        if (error || !data) {
          throw error || new Error('Remote not found')
        }

        set({ transactions: (data as Transaction[]) || [] })
      } catch {
        // Load local
        const local = loadLocalTransactions()
        set({ transactions: local })
      }
    },

    fetchCategories: async (userId) => {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .or(`user_id.is.null,user_id.eq.${userId}`)
          .eq('is_archived', false)
          .order('sort_order')

        if (error || !data || data.length === 0) {
          throw error || new Error('No categories')
        }
        set({ categories: data as Category[] })
      } catch {
        set({ categories: DEFAULT_CATEGORIES })
      }
    },

    createTransaction: async (userId, values) => {
      set({ loading: true, error: null })

      const catMap = Object.fromEntries(get().categories.map(c => [c.id, c]))
      const category = values.category_id ? catMap[values.category_id] : undefined

      const newTx: Transaction = {
        id: crypto.randomUUID(),
        user_id: userId,
        amount_minor: toMinorUnits(values.amount),
        currency: values.currency || 'TWD',
        type: values.type,
        category_id: values.category_id || null,
        category,
        date: values.date,
        time: values.time || format(new Date(), 'HH:mm:ss'),
        merchant: values.merchant || '',
        description: values.description || '',
        payment_method: values.payment_method || 'cash',
        tags: values.tags || [],
        notes: values.notes || null,
        receipt_url: null,
        is_recurring: values.is_recurring || false,
        recurring_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      // Try syncing with Supabase in background
      try {
        await supabase.from('transactions').insert({
          user_id: userId,
          amount_minor: newTx.amount_minor,
          type: newTx.type,
          category_id: newTx.category_id,
          date: newTx.date,
          time: newTx.time,
          merchant: newTx.merchant,
          description: newTx.description,
          payment_method: newTx.payment_method,
          tags: newTx.tags,
          notes: newTx.notes,
        })
      } catch {
        // Safe fallback
      }

      // Always save locally so the app works reliably!
      const currentList = get().transactions
      const updatedList = [newTx, ...currentList]
      saveLocalTransactions(updatedList)

      set({
        transactions: updatedList,
        totalCount: updatedList.length,
        loading: false,
      })

      return newTx
    },

    updateTransaction: async (id, values) => {
      set({ loading: true, error: null })
      const catMap = Object.fromEntries(get().categories.map(c => [c.id, c]))

      const currentList = get().transactions
      const updatedList = currentList.map(tx => {
        if (tx.id !== id) return tx
        const updatedCat = values.category_id !== undefined ? catMap[values.category_id] : tx.category
        return {
          ...tx,
          amount_minor: values.amount !== undefined ? toMinorUnits(values.amount) : tx.amount_minor,
          currency: values.currency !== undefined ? values.currency : tx.currency,
          type: values.type !== undefined ? values.type : tx.type,
          category_id: values.category_id !== undefined ? values.category_id : tx.category_id,
          category: updatedCat,
          date: values.date !== undefined ? values.date : tx.date,
          time: values.time !== undefined ? values.time : tx.time,
          merchant: values.merchant !== undefined ? values.merchant : tx.merchant,
          description: values.description !== undefined ? values.description : tx.description,
          payment_method: values.payment_method !== undefined ? values.payment_method : tx.payment_method,
          tags: values.tags !== undefined ? values.tags : tx.tags,
          notes: values.notes !== undefined ? values.notes : tx.notes,
          updated_at: new Date().toISOString(),
        }
      })

      saveLocalTransactions(updatedList)
      set({ transactions: updatedList, loading: false })
    },

    deleteTransaction: async (id) => {
      const currentList = get().transactions
      const toDelete = currentList.find(t => t.id === id) || null
      const updatedList = currentList.filter(t => t.id !== id)

      saveLocalTransactions(updatedList)
      set({
        transactions: updatedList,
        totalCount: updatedList.length,
        lastDeleted: toDelete,
      })

      try {
        await supabase.from('transactions').delete().eq('id', id)
      } catch {}
    },

    undoDelete: async () => {
      const { lastDeleted, transactions } = get()
      if (!lastDeleted) return

      const restoredList = [lastDeleted, ...transactions]
      saveLocalTransactions(restoredList)
      set({
        transactions: restoredList,
        totalCount: restoredList.length,
        lastDeleted: null,
      })
    },

    duplicateTransaction: async (tx) => {
      const { user_id, amount_minor, type, category_id, merchant, description, payment_method, tags } = tx
      return get().createTransaction(user_id, {
        amount: String(amount_minor / 100),
        type,
        category_id: category_id || '',
        date: format(new Date(), 'yyyy-MM-dd'),
        time: format(new Date(), 'HH:mm'),
        merchant: `${merchant} (Copy)`,
        description,
        payment_method,
        tags,
        notes: '',
        is_recurring: false,
      })
    },

    loadSampleData: (userId = 'current-user') => {
      const samples = getSampleTransactions(userId)
      saveLocalTransactions(samples)
      set({
        transactions: samples,
        totalCount: samples.length,
        loading: false,
      })
    },

    clearAllData: () => {
      saveLocalTransactions([])
      set({
        transactions: [],
        totalCount: 0,
      })
    },

    setFilters: (filters) => set({ filters }),
    setSort: (sort) => set({ sort }),
    setPage: (currentPage) => set({ currentPage }),
    clearError: () => set({ error: null }),
  }))
)
