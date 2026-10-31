/**
 * UI store — theme, toast messages, dialog state.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface Toast {
  id: string
  title: string
  description?: string
  variant: 'default' | 'success' | 'warning' | 'destructive'
  duration?: number
}

interface ConfirmDialog {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  destructive: boolean
  onConfirm: () => void
}

interface UIState {
  theme: 'dark' | 'light' | 'system'
  sidebarOpen: boolean
  toasts: Toast[]
  confirmDialog: ConfirmDialog
  activeViewPeriod: 'week' | 'month' | 'quarter' | 'year'

  // Actions
  setTheme: (theme: 'dark' | 'light' | 'system') => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  showConfirm: (options: Omit<ConfirmDialog, 'open'>) => void
  closeConfirm: () => void
  setViewPeriod: (period: 'week' | 'month' | 'quarter' | 'year') => void
}

const defaultConfirmDialog: ConfirmDialog = {
  open: false,
  title: '',
  description: '',
  confirmLabel: 'Confirm',
  destructive: false,
  onConfirm: () => {},
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      sidebarOpen: true,
      toasts: [],
      confirmDialog: defaultConfirmDialog,
      activeViewPeriod: 'month',

      setTheme: (theme) => {
        set({ theme })
        const root = document.documentElement
        if (theme === 'dark') {
          root.classList.add('dark')
        } else if (theme === 'light') {
          root.classList.remove('dark')
        } else {
          // System
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
          root.classList.toggle('dark', prefersDark)
        }
      },

      toggleSidebar: () => set(state => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      addToast: (toast) => {
        const id = crypto.randomUUID()
        const duration = toast.duration ?? 5000
        set(state => ({ toasts: [...state.toasts, { ...toast, id }] }))
        if (duration > 0) {
          setTimeout(() => {
            get().removeToast(id)
          }, duration)
        }
      },

      removeToast: (id) => {
        set(state => ({ toasts: state.toasts.filter(t => t.id !== id) }))
      },

      showConfirm: (options) => {
        set({ confirmDialog: { ...options, open: true } })
      },

      closeConfirm: () => {
        set({ confirmDialog: defaultConfirmDialog })
      },

      setViewPeriod: (period) => set({ activeViewPeriod: period }),
    }),
    {
      name: 'spendwise-ui',
      partialize: (state) => ({
        theme: state.theme,
        activeViewPeriod: state.activeViewPeriod,
      }),
    }
  )
)
