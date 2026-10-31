import { create } from 'zustand'
import { Budget, BudgetPeriod } from '@/types'
import { supabase } from '@/lib/supabase'

export interface BudgetFormData {
  period: BudgetPeriod
  total_amount: number // in major units (e.g. 15000 for NT$ 15,000)
  warn_threshold_pct?: number
  alert_threshold_pct?: number
  start_date?: string
}

interface BudgetState {
  budgets: Budget[]
  loading: boolean
  error: string | null
  activeUserId: string | null
  fetchBudgets: (userId?: string) => Promise<void>
  addBudget: (userId: string, data: BudgetFormData) => Promise<Budget>
  updateBudget: (id: string, updates: Partial<Budget>) => Promise<void>
  deleteBudget: (id: string) => Promise<void>
  clearAllBudgets: () => void
  resetDefaults: (userId: string) => void
  clearMemory: () => void
}

// Clean up legacy global dummy budgets if present
try {
  localStorage.removeItem('spendwise_budgets_v2')
} catch {}

function getBudgetStorageKey(userId?: string | null): string {
  if (!userId || userId === 'guest' || userId === 'local-user') {
    return 'spendwise_guest_budgets'
  }
  return `spendwise_budgets_${userId}`
}

function getInitialBudgets(userId?: string | null): Budget[] {
  if (!userId) return []
  const key = getBudgetStorageKey(userId)
  const saved = localStorage.getItem(key)
  if (saved !== null) {
    try {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed)) return parsed
    } catch {
      // Fall through
    }
  }
  // DO NOT auto-create default fake budgets! New accounts start completely clean.
  return []
}

function persistBudgets(budgets: Budget[], userId?: string | null) {
  try {
    const key = getBudgetStorageKey(userId)
    localStorage.setItem(key, JSON.stringify(budgets))
  } catch (err) {
    console.error('Failed to persist budgets:', err)
  }
}

export const useBudgetStore = create<BudgetState>((set, get) => ({
  budgets: [],
  loading: false,
  error: null,
  activeUserId: null,

  fetchBudgets: async (userId?: string) => {
    const uid = userId || 'guest'
    set({ loading: true, error: null, activeUserId: uid })

    // Load from local storage for this specific user
    const local = getInitialBudgets(uid)
    set({ budgets: local, loading: false })

    // Attempt remote sync if authenticated
    if (userId && userId !== 'guest' && userId !== 'local-user') {
      try {
        const { data, error } = await supabase
          .from('budgets')
          .select('*')
          .eq('user_id', userId)

        if (!error && data) {
          const list = data as Budget[]
          set({ budgets: list })
          persistBudgets(list, userId)
        }
      } catch {
        // Local data remains active
      }
    }
  },

  addBudget: async (userId: string, data: BudgetFormData) => {
    const now = new Date()
    const yyyy = now.getFullYear()
    const mm = String(now.getMonth() + 1).padStart(2, '0')

    const newBudget: Budget = {
      id: crypto.randomUUID(),
      user_id: userId || 'guest',
      period: data.period,
      total_minor: Math.round(data.total_amount * 100),
      start_date: data.start_date || `${yyyy}-${mm}-01`,
      end_date: null,
      warn_threshold_pct: data.warn_threshold_pct || 75,
      alert_threshold_pct: data.alert_threshold_pct || 90,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    }

    const updated = [newBudget, ...get().budgets]
    set({ budgets: updated })
    persistBudgets(updated, userId)

    if (userId && userId !== 'guest' && userId !== 'local-user') {
      try {
        await (supabase.from('budgets').insert(newBudget as any) as any)
      } catch {
        // Local persistence already guaranteed
      }
    }

    return newBudget
  },

  updateBudget: async (id: string, updates: Partial<Budget>) => {
    const activeUid = get().activeUserId || 'guest'
    const updated = get().budgets.map(b =>
      b.id === id ? { ...b, ...updates, updated_at: new Date().toISOString() } : b
    )
    set({ budgets: updated })
    persistBudgets(updated, activeUid)

    try {
      const { id: _id, created_at: _ca, user_id: _uid, ...validUpdates } = updates
      await (supabase.from('budgets').update(validUpdates as any).eq('id', id) as any)
    } catch {
      // Local persistence already active
    }
  },

  deleteBudget: async (id: string) => {
    const activeUid = get().activeUserId || 'guest'
    const updated = get().budgets.filter(b => b.id !== id)
    set({ budgets: updated })
    persistBudgets(updated, activeUid)

    try {
      await (supabase.from('budgets').delete().eq('id', id) as any)
    } catch {
      // Local persistence already active
    }
  },

  clearAllBudgets: () => {
    const activeUid = get().activeUserId || 'guest'
    persistBudgets([], activeUid)
    set({ budgets: [] })
  },

  resetDefaults: (userId: string) => {
    const now = new Date()
    const yyyy = now.getFullYear()
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const startDate = `${yyyy}-${mm}-01`

    const defaults: Budget[] = [
      {
        id: 'b-default-monthly',
        user_id: userId,
        period: 'monthly',
        total_minor: 2500000,
        start_date: startDate,
        end_date: null,
        warn_threshold_pct: 75,
        alert_threshold_pct: 90,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'b-default-weekly',
        user_id: userId,
        period: 'weekly',
        total_minor: 600000,
        start_date: startDate,
        end_date: null,
        warn_threshold_pct: 70,
        alert_threshold_pct: 85,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]

    persistBudgets(defaults, userId)
    set({ budgets: defaults })
  },

  clearMemory: () => {
    set({ budgets: [], activeUserId: null, loading: false, error: null })
  },
}))
