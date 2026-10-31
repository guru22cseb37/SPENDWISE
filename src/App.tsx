import { useEffect, lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { supabase } from '@/lib/supabase'
import { AppShell } from '@/components/layout/AppShell'
import { LoadingScreen } from '@/components/layout/LoadingScreen'
import { Toaster } from '@/components/ui/Toaster'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

// Lazy-loaded pages for performance
const AuthPage = lazy(() => import('@/pages/AuthPage'))
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const TransactionsPage = lazy(() => import('@/pages/TransactionsPage'))
const BudgetsPage = lazy(() => import('@/pages/BudgetsPage'))
const GoalsPage = lazy(() => import('@/pages/GoalsPage'))
const ReportsPage = lazy(() => import('@/pages/ReportsPage'))
const AIAssistantPage = lazy(() => import('@/pages/AIAssistantPage'))
const RecurringPage = lazy(() => import('@/pages/RecurringPage'))
const TaiwanLotteryPage = lazy(() => import('@/pages/TaiwanLotteryPage'))
const SettingsPage = lazy(() => import('@/pages/SettingsPage'))

function App() {
  const { setSession, fetchProfile, loading, initialized } = useAuthStore()
  const { theme, setTheme } = useUIStore()

  // Initialize theme
  useEffect(() => {
    setTheme(theme)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Initialize Supabase auth listener
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        fetchProfile(session.user.id)
      }
      useAuthStore.setState({ loading: false, initialized: true })
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        if (session?.user) {
          await fetchProfile(session.user.id)
        } else {
          useAuthStore.setState({ profile: null })
        }
        useAuthStore.setState({ loading: false, initialized: true })
      }
    )

    return () => subscription.unsubscribe()
  }, [setSession, fetchProfile])

  if (loading || !initialized) {
    return <LoadingScreen />
  }

  return (
    <>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/auth/*" element={<AuthPage />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <AppShell>
                  <Routes>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/transactions" element={<TransactionsPage />} />
                    <Route path="/budgets" element={<BudgetsPage />} />
                    <Route path="/goals" element={<GoalsPage />} />
                    <Route path="/lottery" element={<TaiwanLotteryPage />} />
                    <Route path="/reports" element={<ReportsPage />} />
                    <Route path="/ai" element={<AIAssistantPage />} />
                    <Route path="/recurring" element={<RecurringPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                </AppShell>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Suspense>
      <Toaster />
      <ConfirmDialog />
    </>
  )
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()
  if (!user) {
    return <Navigate to="/auth/login" replace />
  }
  return <>{children}</>
}

export default App
