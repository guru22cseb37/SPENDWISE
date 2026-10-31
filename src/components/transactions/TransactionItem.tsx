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
        transition={{ delay: index * 0.02, duration: 0.2 }}
        onClick={() => setEditOpen(true)}
        className="group rounded-2xl p-3 sm:p-3.5 hover:bg-accent/40 border border-transparent hover:border-border/60 transition-all cursor-pointer space-y-2 sm:space-y-0 sm:flex sm:items-center sm:gap-4"
      >
        {/* Top/Main row on mobile, Left segment on desktop */}
        <div className="flex items-center justify-between sm:justify-start gap-3 flex-1 min-w-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Category Icon */}
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base shadow-xs"
              style={{
                backgroundColor: (transaction.category?.color || '#6366f1') + '20',
                border: `1px solid ${(transaction.category?.color || '#6366f1')}30`,
              }}
              aria-hidden="true"
            >
              <span>
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

            {/* Merchant title & category info */}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground truncate leading-snug">
                {transaction.merchant || transaction.description || 'Unnamed transaction'}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground flex-wrap">
                <span className="font-medium text-slate-300 truncate max-w-[150px] sm:max-w-none">
                  {transaction.category?.name || 'Uncategorized'}
                </span>
                <span className="text-muted-foreground/40 hidden sm:inline">·</span>
                <span className="hidden sm:inline shrink-0">{formatDate(transaction.date, 'dd MMM')}</span>
                {transaction.payment_method && transaction.payment_method !== 'cash' && (
                  <>
                    <span className="text-muted-foreground/40 hidden sm:inline">·</span>
                    <span className="hidden sm:inline font-mono text-[11px] bg-secondary/80 px-1.5 py-0.5 rounded text-muted-foreground">
                      {paymentMethodLabel(transaction.payment_method)}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Amount on Mobile (placed on top right of card) */}
          <div className="text-right shrink-0 sm:hidden">
            <p className={cn(
              'text-base font-bold tabular-nums tracking-tight',
              isIncome ? 'text-emerald-400' : isTransfer ? 'text-blue-400' : 'text-foreground'
            )}>
              {sign}{formatCurrency(transaction.amount_minor, currency, locale)}
            </p>
            <p className="text-[11px] font-medium text-muted-foreground/80 tabular-nums">
              {currency === 'TWD' ? (
                <span>≈ ₹{(fromMinorUnits(transaction.amount_minor) * getDirectRate('TWD', 'INR')).toFixed(0)}</span>
              ) : currency === 'INR' ? (
                <span>≈ NT$ {Math.round(fromMinorUnits(transaction.amount_minor) * getDirectRate('INR', 'TWD'))}</span>
              ) : (
                <span>≈ NT$ {Math.round(fromMinorUnits(transaction.amount_minor) * getDirectRate(currency, 'TWD'))}</span>
              )}
            </p>
          </div>
        </div>

        {/* Bottom row on mobile (Meta + Actions) / Right group on desktop */}
        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t border-border/20 sm:border-0">
          {/* Mobile-only date & payment tags */}
          <div className="sm:hidden flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium text-slate-400">{formatDate(transaction.date, 'dd MMM')}</span>
            {transaction.payment_method && transaction.payment_method !== 'cash' && (
              <>
                <span className="text-muted-foreground/40">·</span>
                <span className="font-mono text-[10px] bg-secondary/70 border border-border/40 px-1.5 py-0.5 rounded text-muted-foreground">
                  {paymentMethodLabel(transaction.payment_method)}
                </span>
              </>
            )}
          </div>

          {/* Amount on Desktop */}
          <div className="hidden sm:block text-right shrink-0 mr-1">
            <p className={cn(
              'text-sm font-bold tabular-nums',
              isIncome ? 'text-emerald-400' : isTransfer ? 'text-blue-400' : 'text-foreground'
            )}>
              {sign}{formatCurrency(transaction.amount_minor, currency, locale)}
            </p>
            <p className="text-[11px] font-medium text-muted-foreground/80 tabular-nums">
              {currency === 'TWD' ? (
                <span>≈ ₹{(fromMinorUnits(transaction.amount_minor) * getDirectRate('TWD', 'INR')).toFixed(0)}</span>
              ) : currency === 'INR' ? (
                <span>≈ NT$ {Math.round(fromMinorUnits(transaction.amount_minor) * getDirectRate('INR', 'TWD'))}</span>
              ) : (
                <span>≈ NT$ {Math.round(fromMinorUnits(transaction.amount_minor) * getDirectRate(currency, 'TWD'))}</span>
              )}
            </p>
          </div>

          {/* Quick Actions: Edit & Delete */}
          <div className="flex items-center gap-1.5 shrink-0 ml-auto sm:ml-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                setEditOpen(true)
              }}
              aria-label={`Edit ${transaction.merchant || 'transaction'}`}
              className="h-7 sm:h-8 px-2.5 text-xs font-semibold text-muted-foreground hover:text-primary hover:bg-primary/10 gap-1 rounded-lg border border-border/40 hover:border-primary/30"
            >
              <Pencil className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary" />
              <span>Edit</span>
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
              className="h-7 sm:h-8 px-2.5 text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 gap-1 rounded-lg border border-rose-500/20 hover:border-rose-500/40"
            >
              <Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-rose-400" />
              <span>Delete</span>
            </Button>
          </div>
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
