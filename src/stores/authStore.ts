/**
 * Auth store — manages Supabase session and user profile.
 * With robust LocalStorage persistence and Taiwan Dollar (TWD) as active default.
 */

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { UserProfile } from '@/types'

const PROFILE_STORAGE_KEY = 'spendwise_user_profile_v2'

function getInitialProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') return parsed
    }
  } catch {}

  const defaultProf: UserProfile = {
    id: 'local-user',
    display_name: 'Master',
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
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(defaultProf))
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
    profile: getInitialProfile(),
    loading: false,
    initialized: true,

    setSession: (session) => {
      set({ session, user: session?.user ?? null })
    },

    setProfile: (profile) => {
      if (profile) {
        try {
          localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile))
        } catch {}
      }
      set({ profile })
    },

    signOut: async () => {
      await supabase.auth.signOut().catch(() => {})
      set({ user: null, session: null })
    },

    fetchProfile: async (userId) => {
      try {
        const { data, error } = await supabase
          .from('users_profile')
          .select('*')
          .eq('id', userId)
          .single()

        if (!error && data) {
          try {
            localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(data))
          } catch {}
          set({ profile: data as UserProfile })
        }
      } catch {
        // Local profile remains active
      }
    },

    updateProfile: async (updates) => {
      const current = get().profile || getInitialProfile()
      const updated: UserProfile = {
        ...current,
        ...updates,
        updated_at: new Date().toISOString(),
      }

      // Always update local state immediately
      set({ profile: updated })
      try {
        localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(updated))
      } catch {}

      const user = get().user
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
