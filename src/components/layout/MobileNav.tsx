import { NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, ArrowLeftRight, Wallet, PieChart, Bot } from 'lucide-react'
import { cn } from '@/lib/utils'

const mobileNavItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { path: '/transactions', icon: ArrowLeftRight, label: 'Transactions' },
  { path: '/budgets', icon: Wallet, label: 'Budgets' },
  { path: '/reports', icon: PieChart, label: 'Reports' },
  { path: '/ai', icon: Bot, label: 'AI Coach' },
]

export function MobileNav() {
  const location = useLocation()

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 bg-card/90 backdrop-blur-lg border-t border-border safe-bottom"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around h-16 px-2">
        {mobileNavItems.map(item => {
          const isActive = location.pathname === item.path ||
            (item.path !== '/dashboard' && location.pathname.startsWith(item.path))

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all min-w-[3rem]',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className={cn(
                'flex items-center justify-center w-6 h-6 transition-transform',
                isActive && 'scale-110'
              )}>
                <item.icon className="h-5 w-5" />
              </div>
              <span className={cn(
                'text-[10px] font-medium leading-none',
                isActive ? 'font-semibold' : ''
              )}>
                {item.label}
              </span>
              {isActive && (
                <span className="absolute bottom-1 h-1 w-4 rounded-full bg-primary" aria-hidden="true" />
              )}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
