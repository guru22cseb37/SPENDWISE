import { NavLink, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  ArrowLeftRight,
  Target,
  PieChart,
  Wallet,
  Bot,
  RepeatIcon,
  Settings,
  TrendingUp,
  X,
  Sun,
  Moon,
  Ticket,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useUIStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/transactions', icon: ArrowLeftRight, label: 'Transactions' },
  { path: '/budgets', icon: Wallet, label: 'Budgets' },
  { path: '/goals', icon: Target, label: 'Goals' },
  { path: '/lottery', icon: Ticket, label: 'Taiwan Lottery 🧾' },
  { path: '/recurring', icon: RepeatIcon, label: 'Recurring' },
  { path: '/reports', icon: PieChart, label: 'Reports' },
  { path: '/ai', icon: Bot, label: 'AI Coach' },
]

interface SidebarProps {
  onClose?: () => void
  mobile?: boolean
}

export function Sidebar({ onClose, mobile }: SidebarProps) {
  const { theme, setTheme } = useUIStore()
  const { profile, signOut } = useAuthStore()
  const location = useLocation()

  return (
    <aside
      className={cn(
        'flex flex-col h-full bg-card border-r border-border',
        mobile ? 'w-72' : 'w-64'
      )}
      aria-label="Main navigation"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary shadow-glow-primary">
            <TrendingUp className="h-4 w-4 text-white" />
          </div>
          <div>
            <span className="text-sm font-bold">SpendWise</span>
            <span className="ml-0.5 text-xs font-medium text-primary"> AI</span>
          </div>
        </div>
        {mobile && onClose && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onClose()
            }}
            onTouchEnd={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onClose()
            }}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/80 hover:bg-secondary active:scale-90 text-foreground transition-all cursor-pointer border border-border/60 shadow-xs touch-manipulation"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {navItems.map(item => {
          const isActive = location.pathname === item.path ||
            (item.path !== '/dashboard' && location.pathname.startsWith(item.path))

          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={cn(
                'nav-item relative',
                isActive && 'nav-item-active'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="pointer-events-none absolute inset-0 rounded-lg bg-primary/10"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
              <item.icon className={cn('h-4.5 w-4.5 shrink-0', isActive ? 'text-primary' : '')} />
              <span>{item.label}</span>
              {item.path === '/ai' && (
                <span className="ml-auto text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-primary/15 text-primary">
                  NEW
                </span>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-border p-3 space-y-1">
        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="nav-item w-full"
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
        >
          {theme === 'dark' ? (
            <Sun className="h-4.5 w-4.5" />
          ) : (
            <Moon className="h-4.5 w-4.5" />
          )}
          <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
        </button>

        {/* Settings */}
        <NavLink to="/settings" onClick={onClose} className="nav-item">
          <Settings className="h-4.5 w-4.5" />
          <span>Settings</span>
        </NavLink>

        {/* User info */}
        <div className="flex items-center gap-2.5 rounded-lg p-2.5 mt-2 border border-border">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary shrink-0">
            {profile?.display_name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{profile?.display_name || 'User'}</p>
            <p className="text-xs text-muted-foreground truncate">{profile?.currency || 'INR'}</p>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => signOut()}
            aria-label="Sign out"
            className="shrink-0"
          >
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </aside>
  )
}
