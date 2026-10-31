import { useState } from 'react'
import { motion } from 'framer-motion'
import { Pencil, Trash2, Copy, ChevronRight } from 'lucide-react'
import { formatCurrency, formatDate, fromMinorUnits } from '@/lib/calculations'
import { getDirectRate } from '@/lib/currency'
import { transactionTypeSign, paymentMethodLabel, cn } from '@/lib/utils'
import { Transaction } from '@/types'
import { useTransactionStore } from '@/stores/transactionStore'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { TransactionForm } from './TransactionForm'

interface TransactionItemProps {
  transaction: Transaction
  index: number
}

export function TransactionItem({ transaction, index }: TransactionItemProps) {
  const { deleteTransaction, duplicateTransaction } = useTransactionStore()
  const { profile } = useAuthStore()
  const { showConfirm, addToast } = useUIStore()
  const [editOpen, setEditOpen] = useState(false)

  const currency = profile?.currency || 'INR'
  const locale = profile?.locale || 'en-IN'

  const sign = transactionTypeSign(transaction.type)
  const isIncome = transaction.type === 'income'
  const isTransfer = transaction.type === 'transfer'

  const handleDelete = () => {
    showConfirm({
      title: 'Delete transaction',
      description: `Are you sure you want to delete this transaction? You can undo this action for 8 seconds.`,
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: async () => {
        await deleteTransaction(transaction.id)
        addToast({
          title: 'Transaction deleted',
          description: 'Tap Undo to restore it.',
          variant: 'warning',
        })
      },
    })
  }

  const handleDuplicate = async () => {
    const tx = await duplicateTransaction(transaction)
    if (tx) {
      addToast({ title: 'Transaction duplicated', variant: 'success' })
    }
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.03, duration: 0.2 }}
        onClick={() => setEditOpen(true)}
        className="group flex items-center gap-3 rounded-xl p-3 hover:bg-accent/50 transition-colors cursor-pointer"
      >
        {/* Category color dot */}
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base"
          style={{
            backgroundColor: (transaction.category?.color || '#6366f1') + '20',
          }}
          aria-hidden="true"
        >
          <span className="text-base">
            {transaction.category?.icon === 'ShoppingBag' ? '🛍️' :
             transaction.category?.icon === 'Utensils' ? '🍽️' :
             transaction.category?.icon === 'Car' ? '🚗' :
             transaction.category?.icon === 'Home' ? '🏠' :
             transaction.category?.icon === 'Zap' ? '⚡' :
             transaction.category?.icon === 'Heart' ? '💊' :
             transaction.category?.icon === 'TrendingUp' ? '💹' :
             transaction.category?.icon === 'RepeatIcon' ? '🔄' :
             isIncome ? '💰' : isTransfer ? '↔️' : '💸'}
          </span>
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {transaction.merchant || transaction.description || 'Unnamed transaction'}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-muted-foreground">
              {transaction.category?.name || 'Uncategorized'}
            </span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground">
              {formatDate(transaction.date, 'dd MMM')}
            </span>
            {transaction.payment_method && transaction.payment_method !== 'cash' && (
              <>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground">
                  {paymentMethodLabel(transaction.payment_method)}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Amount */}
        <div className="text-right shrink-0">
          <p className={cn(
            'text-sm font-semibold tabular-nums',
            isIncome ? 'text-emerald-400' :
            isTransfer ? 'text-blue-400' :
            'text-foreground'
          )}>
            {sign}{formatCurrency(transaction.amount_minor, currency, locale)}
          </p>
          <p className="text-[11px] text-muted-foreground/80 tabular-nums">
            {currency === 'TWD' ? (
              <span>≈ ₹{(fromMinorUnits(transaction.amount_minor) * getDirectRate('TWD', 'INR')).toFixed(0)}</span>
            ) : currency === 'INR' ? (
              <span>≈ NT$ {Math.round(fromMinorUnits(transaction.amount_minor) * getDirectRate('INR', 'TWD'))}</span>
            ) : (
              <span>≈ NT$ {Math.round(fromMinorUnits(transaction.amount_minor) * getDirectRate(currency, 'TWD'))}</span>
            )}
          </p>
        </div>

        {/* Actions — Always clearly visible for easy updating & deletion */}
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              setEditOpen(true)
            }}
            aria-label={`Edit ${transaction.merchant || 'transaction'}`}
            className="h-8 px-2 text-xs font-medium text-muted-foreground hover:text-primary hover:bg-primary/10 gap-1 rounded-lg border border-border/40 hover:border-primary/30"
          >
            <Pencil className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs">Edit</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={async (e) => {
              e.stopPropagation()
              await deleteTransaction(transaction.id)
              addToast({
                title: 'Transaction Deleted 🗑️',
                description: `${transaction.merchant || 'Transaction'} deleted. Tap Undo to restore.`,
                variant: 'warning',
              })
            }}
            aria-label="Delete transaction"
            className="h-8 px-2 text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 gap-1 rounded-lg border border-rose-500/20 hover:border-rose-500/40"
          >
            <Trash2 className="h-3.5 w-3.5 text-rose-400" />
            <span className="text-xs">Delete</span>
          </Button>
        </div>
      </motion.div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
          </DialogHeader>
          <TransactionForm
            initialData={transaction}
            onSuccess={() => setEditOpen(false)}
            onCancel={() => setEditOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
