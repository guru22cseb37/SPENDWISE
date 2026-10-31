/**
 * Auth store — manages Supabase session and user profile.
 * With robust LocalStorage persistence and Taiwan Dollar (TWD) as active default.
 */

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { UserProfile } from '@/types'

const PROFILE_STORAGE_KEY = 'spendwise_user_profile_guest'

function getInitialProfile(userId?: string): UserProfile {
  const key = userId ? `spendwise_user_profile_${userId}` : PROFILE_STORAGE_KEY
  try {
    const raw = localStorage.getItem(key)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') return parsed
    }
  } catch {}

  const defaultProf: UserProfile = {
    id: userId || 'local-user',
    display_name: 'User',
    avatar_url: null,
    currency: 'TWD',
    locale: 'zh-TW',
    opening_balance_minor: 0,
    theme: 'dark',
    onboarding_complete: true,
    ai_consent: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  try {
    localStorage.setItem(key, JSON.stringify(defaultProf))
  } catch {}

  return defaultProf
}

interface AuthState {
  user: User | null
  session: Session | null
  profile: UserProfile | null
  loading: boolean
  initialized: boolean

  // Actions
  setSession: (session: Session | null) => void
  setProfile: (profile: UserProfile | null) => void
  signOut: () => Promise<void>
  fetchProfile: (userId: string) => Promise<void>
  updateProfile: (updates: Partial<Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>>) => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  subscribeWithSelector((set, get) => ({
    user: null,
    session: null,
    profile: null,
    loading: false,
    initialized: true,

    setSession: (session) => {
      const user = session?.user ?? null
      if (user) {
        const userKey = `spendwise_user_profile_${user.id}`
        let prof: UserProfile | null = null
        try {
          const raw = localStorage.getItem(userKey)
          if (raw) prof = JSON.parse(raw)
        } catch {}

        if (!prof) {
          const detectedName =
            user.user_metadata?.display_name ||
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            (user.email ? user.email.split('@')[0] : 'User')

          prof = {
            id: user.id,
            display_name: detectedName,
            avatar_url: user.user_metadata?.avatar_url || null,
            currency: 'TWD',
            locale: 'zh-TW',
            opening_balance_minor: 0,
            theme: 'dark',
            onboarding_complete: true,
            ai_consent: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
          try {
            localStorage.setItem(userKey, JSON.stringify(prof))
          } catch {}
        }
        set({ session, user, profile: prof })
      } else {
        set({ session, user: null, profile: null })
      }
    },

    setProfile: (profile) => {
      if (profile) {
        const user = get().user
        const key = user ? `spendwise_user_profile_${user.id}` : PROFILE_STORAGE_KEY
        try {
          localStorage.setItem(key, JSON.stringify(profile))
        } catch {}
      }
      set({ profile })
    },

    signOut: async () => {
      await supabase.auth.signOut().catch(() => {})
      try {
        const { useTransactionStore } = await import('@/stores/transactionStore')
        useTransactionStore.getState().clearMemory()
      } catch {}
      try {
        const { useBudgetStore } = await import('@/stores/budgetStore')
        useBudgetStore.getState().clearMemory()
      } catch {}
      set({ user: null, session: null, profile: null })
    },

    fetchProfile: async (userId) => {
      try {
        const { data, error } = await supabase
          .from('users_profile')
          .select('*')
          .eq('id', userId)
          .single()

        if (!error && data) {
          const key = `spendwise_user_profile_${userId}`
          try {
            localStorage.setItem(key, JSON.stringify(data))
          } catch {}
          set({ profile: data as UserProfile })
        }
      } catch {
        // Fallback profile if any
      }
    },

    updateProfile: async (updates) => {
      const user = get().user
      const current = get().profile || getInitialProfile(user?.id)
      const updated: UserProfile = {
        ...current,
        ...updates,
        updated_at: new Date().toISOString(),
      }

      set({ profile: updated })
      const key = user ? `spendwise_user_profile_${user.id}` : PROFILE_STORAGE_KEY
      try {
        localStorage.setItem(key, JSON.stringify(updated))
      } catch {}

      if (user) {
        ;(async () => {
          try {
            await (supabase.from('users_profile').update(updates as any).eq('id', user.id) as any)
          } catch {}
        })()
      }
    },
  }))
)
