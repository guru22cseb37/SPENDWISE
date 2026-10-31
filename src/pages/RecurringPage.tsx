import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  RepeatIcon,
  Calendar,
  Pause,
  Play,
  Trash2,
  RotateCcw,
  Sparkles,
  CreditCard,
  TrendingDown,
} from 'lucide-react'
import { format, parseISO, addMonths } from 'date-fns'
import { useAuthStore } from '@/stores/authStore'
import { useTransactionStore } from '@/stores/transactionStore'
import { RecurringTransaction, RecurringFrequency, TransactionType, PaymentMethod } from '@/types'
import { formatCurrency } from '@/lib/calculations'
import { convertAmount } from '@/lib/currency'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

const STORAGE_KEY = 'spendwise_recurring_v2'

function getInitialRecurring(userId: string): RecurringTransaction[] {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved !== null) {
    try {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed)) return parsed // Preserve user's deleted/empty state
    } catch {
      // Fall through to defaults
    }
  }

  const now = new Date()
  const nextMonth = addMonths(now, 1)
  const dueDateStr = format(nextMonth, 'yyyy-MM-05')

  const defaults: RecurringTransaction[] = [
    {
      id: 'rec-rent-taipei',
      user_id: userId,
      merchant: 'Taipei Studio Rent (房租)',
      description: 'Monthly apartment rent via Taiwan ATM transfer',
      amount_minor: 1400000, // NT$ 14,000 (≈ ₹37,100)
      type: 'expense',
      category_id: 'c-housing',
      payment_method: 'bank_transfer',
      frequency: 'monthly',
      start_date: format(now, 'yyyy-MM-01'),
      end_date: null,
      next_due_date: dueDateStr,
      is_active: true,
      last_generated_date: null,
      created_at: now.toISOString(),
    },
    {
      id: 'rec-tpass-1200',
      user_id: userId,
      merchant: 'TPASS 1200 Commuter Pass (基北北桃)',
      description: 'Unlimited Taiwan MRT, Bus, Light Rail, TRA',
      amount_minor: 120000, // NT$ 1,200 (≈ ₹3,180)
      type: 'expense',
      category_id: 'c-transport',
      payment_method: 'easycard',
      frequency: 'monthly',
      start_date: format(now, 'yyyy-MM-01'),
      end_date: null,
      next_due_date: dueDateStr,
      is_active: true,
      last_generated_date: null,
      created_at: now.toISOString(),
    },
    {
      id: 'rec-cht-5g',
      user_id: userId,
      merchant: 'Chunghwa Telecom 5G (中華電信)',
      description: 'Unlimited 5G Mobile Plan in Taiwan',
      amount_minor: 59900, // NT$ 599 (≈ ₹1,587)
      type: 'expense',
      category_id: 'c-utilities',
      payment_method: 'credit_card',
      frequency: 'monthly',
      start_date: format(now, 'yyyy-MM-01'),
      end_date: null,
      next_due_date: dueDateStr,
      is_active: true,
      last_generated_date: null,
      created_at: now.toISOString(),
    },
    {
      id: 'rec-salary-stipend',
      user_id: userId,
      merchant: 'Monthly Taiwan Stipend / Salary',
      description: 'Direct deposit into Post Office / Bank',
      amount_minor: 3800000, // NT$ 38,000 (≈ ₹100,700)
      type: 'income',
      category_id: 'c-salary',
      payment_method: 'bank_transfer',
      frequency: 'monthly',
      start_date: format(now, 'yyyy-MM-01'),
      end_date: null,
      next_due_date: dueDateStr,
      is_active: true,
      last_generated_date: null,
      created_at: now.toISOString(),
    },
  ]

  localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults))
  return defaults
}

function persistRecurring(items: RecurringTransaction[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch (err) {
    console.error('Failed to persist recurring items:', err)
  }
}

export default function RecurringPage() {
  const { user, profile } = useAuthStore()
  const { categories } = useTransactionStore()

  const [recurring, setRecurring] = useState<RecurringTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  // Form state
  const [merchant, setMerchant] = useState('')
  const [description, setDescription] = useState('')
  const [amountStr, setAmountStr] = useState('')
  const [type, setType] = useState<TransactionType>('expense')
  const [frequency, setFrequency] = useState<RecurringFrequency>('monthly')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('easycard')
  const [nextDueDate, setNextDueDate] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const currency = profile?.currency || 'TWD'
  const locale = profile?.locale || (currency === 'TWD' ? 'zh-TW' : 'en-IN')
  const secondaryCurrency = currency === 'TWD' ? 'INR' : 'TWD'

  useEffect(() => {
    const uid = user?.id || 'local-user'
    const items = getInitialRecurring(uid)
    setRecurring(items)
    setLoading(false)
  }, [user])

  const parsedAmount = parseFloat(amountStr) || 0
  const convertedAmount = parsedAmount > 0 ? convertAmount(parsedAmount, currency, secondaryCurrency) : 0

  const active = recurring.filter(r => r.is_active)
  const paused = recurring.filter(r => !r.is_active)

  const totalMonthlyCommitment = active
    .filter(r => r.type === 'expense')
    .reduce((sum, r) => {
      if (r.frequency === 'monthly') return sum + r.amount_minor
      if (r.frequency === 'weekly') return sum + (r.amount_minor * 52) / 12
      if (r.frequency === 'yearly') return sum + Math.round(r.amount_minor / 12)
      if (r.frequency === 'daily') return sum + r.amount_minor * 30
      return sum
    }, 0)

  const toggleActive = (id: string, currentActive: boolean) => {
    const updated = recurring.map(r => (r.id === id ? { ...r, is_active: !currentActive } : r))
    setRecurring(updated)
    persistRecurring(updated)
  }

  const handleDelete = (id: string) => {
    const updated = recurring.filter(r => r.id !== id)
    setRecurring(updated)
    persistRecurring(updated)
    setDeleteId(null)
  }

  const handleClearAll = () => {
    setRecurring([])
    persistRecurring([])
  }

  const handleResetDefaults = () => {
    const now = new Date()
    const nextMonth = addMonths(now, 1)
    const dueDateStr = format(nextMonth, 'yyyy-MM-05')
    const defaults: RecurringTransaction[] = [
      {
        id: 'rec-rent-taipei',
        user_id: user?.id || 'local-user',
        merchant: 'Taipei Studio Rent (房租)',
        description: 'Monthly apartment rent via Taiwan ATM transfer',
        amount_minor: 1400000,
        type: 'expense',
        category_id: 'c-housing',
        payment_method: 'bank_transfer',
        frequency: 'monthly',
        start_date: format(now, 'yyyy-MM-01'),
        end_date: null,
        next_due_date: dueDateStr,
        is_active: true,
        last_generated_date: null,
        created_at: now.toISOString(),
      },
      {
        id: 'rec-tpass-1200',
        user_id: user?.id || 'local-user',
        merchant: 'TPASS 1200 Commuter Pass (基北北桃)',
        description: 'Unlimited Taiwan MRT, Bus, Light Rail, TRA',
        amount_minor: 120000,
        type: 'expense',
        category_id: 'c-transport',
        payment_method: 'easycard',
        frequency: 'monthly',
        start_date: format(now, 'yyyy-MM-01'),
        end_date: null,
        next_due_date: dueDateStr,
        is_active: true,
        last_generated_date: null,
        created_at: now.toISOString(),
      },
      {
        id: 'rec-cht-5g',
        user_id: user?.id || 'local-user',
        merchant: 'Chunghwa Telecom 5G (中華電信)',
        description: 'Unlimited 5G Mobile Plan in Taiwan',
        amount_minor: 59900,
        type: 'expense',
        category_id: 'c-utilities',
        payment_method: 'credit_card',
        frequency: 'monthly',
        start_date: format(now, 'yyyy-MM-01'),
        end_date: null,
        next_due_date: dueDateStr,
        is_active: true,
        last_generated_date: null,
        created_at: now.toISOString(),
      },
      {
        id: 'rec-salary-stipend',
        user_id: user?.id || 'local-user',
        merchant: 'Monthly Taiwan Stipend / Salary',
        description: 'Direct deposit into Post Office / Bank',
        amount_minor: 3800000,
        type: 'income',
        category_id: 'c-salary',
        payment_method: 'bank_transfer',
        frequency: 'monthly',
        start_date: format(now, 'yyyy-MM-01'),
        end_date: null,
        next_due_date: dueDateStr,
        is_active: true,
        last_generated_date: null,
        created_at: now.toISOString(),
      },
    ]
    setRecurring(defaults)
    persistRecurring(defaults)
  }

  const handleCreateRecurring = (e: React.FormEvent) => {
    e.preventDefault()
    if (!merchant.trim() || parsedAmount <= 0) return

    setSubmitting(true)
    try {
      const now = new Date()
      const newItem: RecurringTransaction = {
        id: crypto.randomUUID(),
        user_id: user?.id || 'local-user',
        merchant: merchant.trim(),
        description: description.trim() || `${frequency} ${type}`,
        amount_minor: Math.round(parsedAmount * 100),
        type,
        category_id: null,
        payment_method: paymentMethod,
        frequency,
        start_date: format(now, 'yyyy-MM-dd'),
        end_date: null,
        next_due_date: nextDueDate || format(addMonths(now, 1), 'yyyy-MM-dd'),
        is_active: true,
        last_generated_date: null,
        created_at: now.toISOString(),
      }

      const updated = [newItem, ...recurring]
      setRecurring(updated)
      persistRecurring(updated)

      // Reset form
      setMerchant('')
      setDescription('')
      setAmountStr('')
      setNextDueDate('')
      setModalOpen(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Recurring Bills & Subscriptions</h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              🇹🇼 Taiwan & 🇮🇳 Rupee Dual
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Keep track of monthly rent, TPASS transit, telecom, utilities, and recurring income.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {recurring.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAll}
              className="gap-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border-rose-500/30"
              title="Delete all dummy items and start fresh"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear All
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleResetDefaults}
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            title="Reset to recommended Taiwan subscriptions"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Load Samples
          </Button>

          <Button
            size="sm"
            onClick={() => setModalOpen(true)}
            className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Add Recurring
          </Button>
        </div>
      </div>

      {/* Monthly commitment summary */}
      {active.length > 0 && (
        <Card className="border-border/70 bg-gradient-to-r from-card/80 via-accent/30 to-card/80 backdrop-blur-sm">
          <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <TrendingDown className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Total Monthly Fixed Commitment</p>
                <p className="text-xs text-muted-foreground">
                  From {active.filter(r => r.type === 'expense').length} active recurring expenses
                </p>
              </div>
            </div>

            <div className="text-right">
              <p className="text-2xl font-black text-rose-400 tabular-nums">
                {formatCurrency(totalMonthlyCommitment, currency, locale)}
              </p>
              <p className="text-xs text-muted-foreground">
                ≈ {formatCurrency(Math.round(convertAmount(totalMonthlyCommitment / 100, currency, secondaryCurrency) * 100), secondaryCurrency)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-20 rounded-2xl bg-card/50" />)}
        </div>
      ) : recurring.length === 0 ? (
        <Card className="border-dashed border-border/80">
          <CardContent className="py-16 text-center space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <RepeatIcon className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">No Recurring Items Logged</h2>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                Track your Taiwan apartment rent, TPASS 1200 transit, phone bills, or monthly income.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3">
              <Button onClick={() => setModalOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Add First Recurring Item
              </Button>
              <Button variant="outline" onClick={handleResetDefaults} className="gap-2">
                <RotateCcw className="h-4 w-4" />
                Load Sample Subscriptions
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {[...active, ...paused].map((r, i) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.04 }}
              >
                <Card className={cn('border-border/80 transition-all hover:shadow-xs', !r.is_active && 'opacity-60 bg-muted/20')}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-lg font-bold',
                          r.type === 'income' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-primary/15 text-primary'
                        )}
                      >
                        {r.type === 'income' ? '💰' : '🔁'}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-foreground truncate">{r.merchant || r.description}</p>
                          {!r.is_active && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                              Paused
                            </span>
                          )}
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-accent text-accent-foreground border border-border/50 capitalize">
                            {r.frequency}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                          {r.description && r.merchant && (
                            <span className="truncate max-w-[200px]">{r.description}</span>
                          )}
                          <span className="flex items-center gap-1 font-mono text-[11px]">
                            <Calendar className="h-3 w-3 text-primary" />
                            Next: {r.next_due_date ? format(parseISO(r.next_due_date), 'dd MMM yyyy') : 'Monthly'}
                          </span>
                        </div>
                      </div>

                      {/* Amount and Actions */}
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <p className={cn(
                            'text-base font-black tabular-nums tracking-tight',
                            r.type === 'income' ? 'text-emerald-400' : 'text-foreground'
                          )}>
                            {r.type === 'income' ? '+' : '-'}{formatCurrency(r.amount_minor, currency, locale)}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            ≈ {formatCurrency(Math.round(convertAmount(r.amount_minor / 100, currency, secondaryCurrency) * 100), secondaryCurrency)}
                          </p>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => toggleActive(r.id, r.is_active)}
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            title={r.is_active ? 'Pause subscription' : 'Resume subscription'}
                          >
                            {r.is_active ? (
                              <Pause className="h-4 w-4" />
                            ) : (
                              <Play className="h-4 w-4 text-emerald-400" />
                            )}
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setDeleteId(r.id)}
                            className="h-8 w-8 text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10"
                            title="Delete recurring item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Add Recurring Item Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleCreateRecurring}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" />
                Add Recurring Item / Subscription
              </DialogTitle>
              <DialogDescription>
                Schedule recurring bills or income in {currency} with dual-currency tracking.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setType('expense')}
                  className={cn(
                    'p-2.5 rounded-xl border text-xs font-bold transition-all',
                    type === 'expense'
                      ? 'border-rose-500/50 bg-rose-500/10 text-rose-400 shadow-xs'
                      : 'border-border/80 bg-card text-muted-foreground hover:bg-accent'
                  )}
                >
                  📉 Recurring Expense
                </button>
                <button
                  type="button"
                  onClick={() => setType('income')}
                  className={cn(
                    'p-2.5 rounded-xl border text-xs font-bold transition-all',
                    type === 'income'
                      ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400 shadow-xs'
                      : 'border-border/80 bg-card text-muted-foreground hover:bg-accent'
                  )}
                >
                  📈 Recurring Income
                </button>
              </div>

              {/* Title / Merchant */}
              <div className="space-y-1.5">
                <Label htmlFor="rec-merchant">Merchant / Name</Label>
                <Input
                  id="rec-merchant"
                  placeholder="e.g. Taipei Rent, TPASS 1200, Chunghwa Telecom, Gym"
                  value={merchant}
                  onChange={e => setMerchant(e.target.value)}
                  className="text-sm font-medium"
                  required
                />
              </div>

              {/* Amount */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="rec-amount">Amount ({currency})</Label>
                  {parsedAmount > 0 && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary">
                      ≈ {secondaryCurrency === 'INR' ? '₹' : 'NT$'} {convertedAmount.toLocaleString()} {secondaryCurrency}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-muted-foreground">
                    {currency === 'TWD' ? 'NT$' : '₹'}
                  </span>
                  <Input
                    id="rec-amount"
                    type="number"
                    step="any"
                    min="1"
                    placeholder="1200"
                    value={amountStr}
                    onChange={e => setAmountStr(e.target.value)}
                    className="pl-12 text-base font-bold"
                    required
                  />
                </div>
              </div>

              {/* Frequency & Payment Method */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Frequency</Label>
                  <select
                    value={frequency}
                    onChange={e => setFrequency(e.target.value as RecurringFrequency)}
                    className="w-full rounded-xl border border-border bg-card p-2 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="weekly">Weekly</option>
                    <option value="yearly">Yearly</option>
                    <option value="daily">Daily</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Payment Method</Label>
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full rounded-xl border border-border bg-card p-2 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="easycard">悠遊卡 EasyCard</option>
                    <option value="line_pay">LINE Pay</option>
                    <option value="bank_transfer">ATM 轉帳 / Transfer</option>
                    <option value="credit_card">Credit Card</option>
                    <option value="cash">Cash 現金</option>
                  </select>
                </div>
              </div>

              {/* Next Due Date */}
              <div className="space-y-1.5">
                <Label htmlFor="rec-date" className="text-xs">
                  Next Due Date
                </Label>
                <Input
                  id="rec-date"
                  type="date"
                  value={nextDueDate}
                  onChange={e => setNextDueDate(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || !merchant.trim() || parsedAmount <= 0}>
                {submitting ? 'Saving…' : 'Save Recurring Item'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Recurring Item?</DialogTitle>
            <DialogDescription>
              Are you sure you want to stop tracking this subscription? Past logged transactions will remain untouched.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Keep Item
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteId) handleDelete(deleteId)
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
