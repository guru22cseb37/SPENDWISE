import { create } from 'zustand'
import { SavingsGoal } from '@/types'
import { supabase } from '@/lib/supabase'

export interface GoalFormData {
  name: string
  icon: string
  color: string
  target_amount: number // in major units (e.g. 50000 for NT$ 50,000)
  current_amount?: number
  target_date?: string
  monthly_contribution?: number
}

interface GoalState {
  goals: SavingsGoal[]
  loading: boolean
  error: string | null
  fetchGoals: (userId?: string) => Promise<void>
  addGoal: (userId: string, data: GoalFormData) => Promise<SavingsGoal>
  addContribution: (id: string, amountMajor: number) => Promise<void>
  updateGoal: (id: string, updates: Partial<SavingsGoal>) => Promise<void>
  deleteGoal: (id: string) => Promise<void>
  clearAllGoals: () => void
  resetDefaults: (userId: string) => void
}

const STORAGE_KEY = 'spendwise_goals_v2'

function getInitialGoals(userId: string): SavingsGoal[] {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved !== null) {
    try {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed)) return parsed
    } catch {
      // Fall through to defaults
    }
  }

  const now = new Date()
  const nextYear = new Date(now.getFullYear(), now.getMonth() + 8, 1)
  const targetDateStr = nextYear.toISOString().split('T')[0]

  const defaults: SavingsGoal[] = [
    {
      id: 'g-trip-india',
      user_id: userId,
      name: 'Trip to India & Family',
      icon: '✈️',
      color: '#3b82f6',
      target_minor: 3500000, // NT$ 35,000 (≈ ₹92,750)
      current_minor: 1500000, // NT$ 15,000
      target_date: targetDateStr,
      monthly_contribution_minor: 400000, // NT$ 4,000 / month
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'g-emergency-fund',
      user_id: userId,
      name: 'Taiwan Emergency Fund',
      icon: '🛡️',
      color: '#10b981',
      target_minor: 6000000, // NT$ 60,000 (≈ ₹159,000)
      current_minor: 3200000, // NT$ 32,000
      target_date: null,
      monthly_contribution_minor: 500000, // NT$ 5,000 / month
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'g-gadgets-laptop',
      user_id: userId,
      name: 'New Laptop / Tech Upgrade',
      icon: '💻',
      color: '#a855f7',
      target_minor: 4200000, // NT$ 42,000
      current_minor: 1800000, // NT$ 18,000
      target_date: null,
      monthly_contribution_minor: 350000, // NT$ 3,500 / month
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]

  localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults))
  return defaults
}

function persistGoals(goals: SavingsGoal[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(goals))
  } catch (err) {
    console.error('Failed to persist goals:', err)
  }
}

export const useGoalStore = create<GoalState>((set, get) => ({
  goals: [],
  loading: false,
  error: null,

  fetchGoals: async (userId?: string) => {
    const uid = userId || 'local-user'
    set({ loading: true, error: null })

    const local = getInitialGoals(uid)
    set({ goals: local, loading: false })

    if (userId && userId !== 'local-user') {
      try {
        const { data, error } = await supabase
          .from('savings_goals')
          .select('*')
          .eq('user_id', userId)

        if (!error && data && data.length > 0) {
          set({ goals: data as SavingsGoal[] })
          persistGoals(data as SavingsGoal[])
        }
      } catch {
        // Fallback already active
      }
    }
  },

  addGoal: async (userId: string, data: GoalFormData) => {
    const now = new Date()

    const newGoal: SavingsGoal = {
      id: crypto.randomUUID(),
      user_id: userId || 'local-user',
      name: data.name.trim(),
      icon: data.icon || '🎯',
      color: data.color || '#3b82f6',
      target_minor: Math.round(data.target_amount * 100),
      current_minor: Math.round((data.current_amount || 0) * 100),
      target_date: data.target_date || null,
      monthly_contribution_minor: data.monthly_contribution ? Math.round(data.monthly_contribution * 100) : null,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    }

    const updated = [newGoal, ...get().goals]
    set({ goals: updated })
    persistGoals(updated)

    if (userId && userId !== 'local-user') {
      try {
        await (supabase.from('savings_goals').insert(newGoal as any) as any)
      } catch {
        // Fallback active
      }
    }

    return newGoal
  },

  addContribution: async (id: string, amountMajor: number) => {
    const addMinor = Math.round(amountMajor * 100)
    const updated = get().goals.map(g => {
      if (g.id !== id) return g
      const newCurrent = Math.min(g.target_minor, g.current_minor + addMinor)
      return {
        ...g,
        current_minor: newCurrent,
        updated_at: new Date().toISOString(),
      }
    })

    set({ goals: updated })
    persistGoals(updated)

    const updatedGoal = updated.find(g => g.id === id)
    if (updatedGoal) {
      try {
        await (supabase
          .from('savings_goals')
          .update({ current_minor: updatedGoal.current_minor, updated_at: updatedGoal.updated_at } as any)
          .eq('id', id) as any)
      } catch {
        // Fallback active
      }
    }
  },

  updateGoal: async (id: string, updates: Partial<SavingsGoal>) => {
    const updated = get().goals.map(g =>
      g.id === id ? { ...g, ...updates, updated_at: new Date().toISOString() } : g
    )
    set({ goals: updated })
    persistGoals(updated)

    try {
      const { id: _id, created_at: _ca, user_id: _uid, ...validUpdates } = updates
      await (supabase.from('savings_goals').update(validUpdates as any).eq('id', id) as any)
    } catch {
      // Fallback active
    }
  },

  deleteGoal: async (id: string) => {
    const updated = get().goals.filter(b => b.id !== id)
    set({ goals: updated })
    persistGoals(updated)

    try {
      await (supabase.from('savings_goals').delete().eq('id', id) as any)
    } catch {
      // Fallback active
    }
  },

  clearAllGoals: () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]))
    set({ goals: [] })
  },

  resetDefaults: (userId: string) => {
    localStorage.removeItem(STORAGE_KEY)
    const defaults = getInitialGoals(userId || 'local-user')
    set({ goals: defaults })
  },
}))
