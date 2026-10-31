import { useUIStore } from '@/stores/uiStore'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

const iconMap = {
  default: <Info className="h-4 w-4" />,
  success: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
  warning: <AlertTriangle className="h-4 w-4 text-amber-400" />,
  destructive: <AlertCircle className="h-4 w-4 text-rose-400" />,
}

const variantStyles = {
  default: 'border-border bg-card',
  success: 'border-emerald-500/30 bg-emerald-950/60',
  warning: 'border-amber-500/30 bg-amber-950/60',
  destructive: 'border-rose-500/30 bg-rose-950/60',
}

export function Toaster() {
  const { toasts, removeToast } = useUIStore()

  return (
    <div
      className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full"
      aria-live="polite"
      aria-atomic="true"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={cn(
              'flex items-start gap-3 rounded-xl border p-4 shadow-card-dark backdrop-blur-sm',
              variantStyles[toast.variant]
            )}
            role="alert"
          >
            <div className="mt-0.5 shrink-0">
              {iconMap[toast.variant]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium leading-tight">{toast.title}</p>
              {toast.description && (
                <p className="text-xs text-muted-foreground mt-1">{toast.description}</p>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 rounded-md p-1 hover:bg-white/10 transition-colors"
              aria-label="Dismiss notification"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
