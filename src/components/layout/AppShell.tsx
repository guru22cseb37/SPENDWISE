import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, Plus, Bell } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { MobileNav } from './MobileNav'
import { Button } from '@/components/ui/button'
import { useUIStore } from '@/stores/uiStore'
import { cn } from '@/lib/utils'
import { QuickAddButton } from '@/components/transactions/QuickAddButton'
import { CurrencyHeaderToggle } from './CurrencyHeaderToggle'

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const { sidebarOpen, setSidebarOpen } = useUIStore()
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const location = useLocation()

  // Track if screen is desktop (>= 1024px)
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  )

  useEffect(() => {
    const handleResize = () => {
      const desktop = window.innerWidth >= 1024
      setIsDesktop(desktop)
      if (desktop) {
        setMobileSidebarOpen(false)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Auto-close mobile sidebar whenever route changes
  useEffect(() => {
    setMobileSidebarOpen(false)
  }, [location.pathname])

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar (visible on md/lg screens) */}
      <div
        className={cn(
          'hidden md:flex flex-col shrink-0 transition-all duration-300 relative z-20',
          sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'
        )}
      >
        <Sidebar />
      </div>

      {/* Mobile Sidebar Overlay — strictly rendered ONLY on mobile (<1024px) when open */}
      {!isDesktop && (
        <AnimatePresence>
          {mobileSidebarOpen && (
            <div className="relative z-50">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm pointer-events-auto cursor-pointer"
                onClick={() => setMobileSidebarOpen(false)}
                onTouchEnd={() => setMobileSidebarOpen(false)}
                aria-hidden="true"
              />
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                className="fixed inset-y-0 left-0 z-50 shadow-2xl pointer-events-auto"
              >
                <Sidebar mobile onClose={() => setMobileSidebarOpen(false)} />
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      )}

      {/* Main content area */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden relative z-10">
        {/* Top header */}
        <header className="flex items-center gap-3 px-4 h-14 border-b border-border bg-card/80 backdrop-blur-sm shrink-0 lg:px-6 relative z-20 pointer-events-auto">
          {/* Mobile menu button (only visible <1024px) */}
          <Button
            variant="ghost"
            size="icon-sm"
            className="md:hidden"
            onClick={() => setMobileSidebarOpen(prev => !prev)}
            aria-label="Open navigation menu"
            aria-expanded={mobileSidebarOpen}
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Desktop sidebar toggle button */}
          <Button
            variant="ghost"
            size="icon-sm"
            className="hidden md:flex"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Currency Toggle & Converter */}
          <CurrencyHeaderToggle />

          {/* Quick Add — desktop shortcut */}
          <div className="hidden sm:block">
            <QuickAddButton />
          </div>

          {/* Notifications placeholder */}
          <Button variant="ghost" size="icon-sm" aria-label="Notifications">
            <Bell className="h-5 w-5" />
          </Button>
        </header>

        {/* Page content */}
        <main
          id="main-content"
          className="relative z-10 flex-1 overflow-y-auto pb-20 md:pb-0 pointer-events-auto"
          tabIndex={-1}
        >
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="h-full pointer-events-auto"
          >
            {children}
          </motion.div>
        </main>
      </div>

      {/* Mobile floating quick-add button */}
      <div className="fixed bottom-20 right-4 z-30 sm:hidden">
        <QuickAddButton fab />
      </div>

      {/* Mobile bottom navigation */}
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
  )
}
