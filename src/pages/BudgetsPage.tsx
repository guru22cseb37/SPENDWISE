import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Trash2,
  RotateCcw,
  Sparkles,
  PieChart,
  Calendar,
  ChevronLeft,
  ChevronRight,
  FileText,
  Download,
  ArrowRight,
} from 'lucide-react'
import { format, subMonths, addMonths, isSameMonth } from 'date-fns'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useTransactionStore } from '@/stores/transactionStore'
import { useBudgetStore, BudgetFormData } from '@/stores/budgetStore'
import { useUIStore } from '@/stores/uiStore'
import { Budget, BudgetStatus, BudgetPeriod } from '@/types'
import { computeBudgetStatus, formatCurrency, formatPercent } from '@/lib/calculations'
import { convertAmount, formatDualCurrencyBadge } from '@/lib/currency'
import { exportCSV, exportPrintablePDFReport } from '@/lib/reports'
import { TransactionItem } from '@/components/transactions/TransactionItem'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
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

const statusConfig = {
  safe: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', indicator: 'bg-emerald-500', icon: CheckCircle2, label: 'Safe & On Track' },
  warning: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', indicator: 'bg-amber-500', icon: AlertTriangle, label: 'Approaching Limit' },
  alert: { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', indicator: 'bg-orange-500', icon: AlertTriangle, label: 'High Alert (>90%)' },
  exceeded: { color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', indicator: 'bg-rose-500', icon: AlertTriangle, label: 'Limit Exceeded' },
}

export default function BudgetsPage() {
  const { user, profile } = useAuthStore()
  const { transactions, fetchAllTransactions } = useTransactionStore()
  const { budgets, loading, fetchBudgets, addBudget, deleteBudget, clearAllBudgets, resetDefaults } = useBudgetStore()

  const [budgetStatuses, setBudgetStatuses] = useState<BudgetStatus[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  // Form state
  const [period, setPeriod] = useState<BudgetPeriod>('monthly')
  const [amountStr, setAmountStr] = useState('')
  const [warnThreshold, setWarnThreshold] = useState('75')
  const [alertThreshold, setAlertThreshold] = useState('90')
  const [submitting, setSubmitting] = useState(false)

  const currency = profile?.currency || 'TWD'
  const locale = profile?.locale || (currency === 'TWD' ? 'zh-TW' : 'en-IN')
  const secondaryCurrency = currency === 'TWD' ? 'INR' : 'TWD'

  const { addToast } = useUIStore()

  // Month-wise tracking state
  const [selectedDate, setSelectedDate] = useState(() => new Date())

  const handlePrevMonth = () => setSelectedDate(d => subMonths(d, 1))
  const handleNextMonth = () => setSelectedDate(d => addMonths(d, 1))
  const handleCurrentMonth = () => setSelectedDate(new Date())

  const monthPrefix = format(selectedDate, 'yyyy-MM')
  const monthTransactions = transactions.filter(t => t.date.startsWith(monthPrefix))
  const monthExpenses = monthTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount_minor, 0)
  const monthIncome = monthTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount_minor, 0)
  const selectedMonthName = format(selectedDate, 'MMMM yyyy')

  const handleDownloadMonthPDF = () => {
    exportPrintablePDFReport(
      monthTransactions,
      currency,
      monthIncome,
      monthExpenses,
      `${selectedMonthName} Budget & Expense Statement`,
      totalBudgeted
    )
    addToast({
      title: 'PDF Report Ready 📄',
      description: `Opening printable statement for ${selectedMonthName}.`,
      variant: 'success',
    })
  }

  const handleDownloadMonthCSV = () => {
    exportCSV(monthTransactions, currency, `${selectedMonthName}-budget-expenses`)
    addToast({
      title: 'CSV File Downloaded 📊',
      description: `Exported expenses for ${selectedMonthName}.`,
      variant: 'success',
    })
  }

  useEffect(() => {
    fetchBudgets(user?.id)
    if (user?.id) {
      fetchAllTransactions(user.id)
    }
  }, [user, fetchBudgets, fetchAllTransactions])

  useEffect(() => {
    const statuses = budgets.map(b => computeBudgetStatus(b, transactions, selectedDate))
    setBudgetStatuses(statuses)
  }, [budgets, transactions, selectedDate])

  const parsedAmount = parseFloat(amountStr) || 0
  const convertedAmount = parsedAmount > 0 ? convertAmount(parsedAmount, currency, secondaryCurrency) : 0

  const handleCreateBudget = async (e: React.FormEvent) => {
    e.preventDefault()
    if (parsedAmount <= 0) return

    setSubmitting(true)
    try {
      const data: BudgetFormData = {
        period,
        total_amount: parsedAmount,
        warn_threshold_pct: parseInt(warnThreshold, 10) || 75,
        alert_threshold_pct: parseInt(alertThreshold, 10) || 90,
      }
      await addBudget(user?.id || 'local-user', data)
      setAmountStr('')
      setModalOpen(false)
    } finally {
      setSubmitting(false)
    }
  }

  const totalBudgeted = budgets.reduce((sum, b) => sum + b.total_minor, 0)
  const totalSpent = budgetStatuses.reduce((sum, bs) => sum + bs.spent_minor, 0)
  const overallRemaining = Math.max(0, totalBudgeted - totalSpent)

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Budgets & Limits</h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              🇹🇼 NT$ & 🇮🇳 ₹ Active
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Set smart spending boundaries to stay in control and maximize your monthly savings.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {budgets.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearAllBudgets}
              className="gap-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border-rose-500/30"
              title="Delete all sample budgets and start fresh"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear All
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => resetDefaults(user?.id || 'local-user')}
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            title="Reset to recommended Taiwan & India budgets"
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
            Create Budget
          </Button>
        </div>
      </div>

      {/* Month-Wise Tracking & Export Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card/70 backdrop-blur-md p-3.5 rounded-2xl border border-border/60 shadow-xs">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={handlePrevMonth}
            aria-label="Previous Month"
            className="h-8 w-8 rounded-lg border-border/60 hover:bg-primary/10 hover:text-primary hover:border-primary/40"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-2 px-3 py-1 bg-background/80 rounded-xl border border-border/60 shadow-xs">
            <Calendar className="h-4 w-4 text-primary" />
            <span className="font-bold text-sm text-foreground">
              {format(selectedDate, 'MMMM yyyy')} Budget Period
            </span>
          </div>

          <Button
            variant="outline"
            size="icon-sm"
            onClick={handleNextMonth}
            aria-label="Next Month"
            className="h-8 w-8 rounded-lg border-border/60 hover:bg-primary/10 hover:text-primary hover:border-primary/40"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          {!isSameMonth(selectedDate, new Date()) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCurrentMonth}
              className="text-xs text-primary font-semibold hover:bg-primary/10 ml-1"
            >
              Back to Current Month
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2 sm:ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadMonthPDF}
            className="text-xs gap-1.5 font-semibold border-primary/30 text-primary hover:bg-primary/10 shadow-xs h-8"
            title={`Download ${selectedMonthName} Budget & Expense Statement in PDF`}
          >
            <FileText className="h-3.5 w-3.5 text-primary" />
            <span>Download PDF ({format(selectedDate, 'MMM')})</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadMonthCSV}
            className="text-xs gap-1.5 font-semibold text-muted-foreground hover:text-foreground h-8"
            title={`Download ${selectedMonthName} Expense List in CSV`}
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download CSV</span>
          </Button>
        </div>
      </div>

      {/* Summary Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <Card className="border-border/70 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Budgeted</p>
              <p className="text-xl font-bold text-foreground mt-0.5 tabular-nums">
                {formatCurrency(totalBudgeted, currency, locale)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                ≈ {formatCurrency(Math.round(convertAmount(totalBudgeted / 100, currency, secondaryCurrency) * 100), secondaryCurrency)}
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <PieChart className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Spent</p>
              <p className="text-xl font-bold text-foreground mt-0.5 tabular-nums">
                {formatCurrency(totalSpent, currency, locale)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {totalBudgeted > 0 ? formatPercent((totalSpent / totalBudgeted) * 100) : '0%'} of total allocation
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
              <TrendingUp className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Remaining Safe Buffer</p>
              <p className="text-xl font-bold text-emerald-400 mt-0.5 tabular-nums">
                {formatCurrency(overallRemaining, currency, locale)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                ≈ {formatCurrency(Math.round(convertAmount(overallRemaining / 100, currency, secondaryCurrency) * 100), secondaryCurrency)}
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Budget Grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2].map(i => (
            <div key={i} className="skeleton h-44 rounded-2xl bg-card/50" />
          ))}
        </div>
      ) : budgetStatuses.length === 0 ? (
        <Card className="border-dashed border-border/80">
          <CardContent className="py-16 text-center space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Sparkles className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">No Budgets Set Yet</h2>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                Set a monthly budget (e.g. NT$ 25,000) or weekly limit (e.g. NT$ 6,000) to keep your Taiwan living costs under control.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-sm mx-auto pt-2">
              <Button onClick={() => setModalOpen(true)} className="w-full sm:w-auto gap-2 font-semibold">
                <Plus className="h-4 w-4" />
                Create First Budget
              </Button>
              <Button
                variant="outline"
                onClick={() => resetDefaults(user?.id || 'local-user')}
                className="w-full sm:w-auto gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Load Sample Budgets
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {budgetStatuses.map((bs, i) => {
              const config = statusConfig[bs.status]
              const StatusIcon = config.icon

              return (
                <motion.div
                  key={bs.budget.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className={cn('overflow-hidden border transition-all hover:shadow-md', config.border)}>
                    <CardHeader className="pb-3 border-b border-border/40 bg-accent/20">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="p-1.5 rounded-lg bg-card border border-border/60 text-xs font-semibold capitalize flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-primary" />
                            {bs.budget.period}
                          </span>
                          <CardTitle className="text-sm font-semibold capitalize">
                            {bs.budget.period} Spending Cap
                          </CardTitle>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1', config.bg, config.color)}>
                            <StatusIcon className="h-3 w-3" />
                            {bs.status}
                          </span>
                          <button
                            type="button"
                            onClick={() => setDeleteId(bs.budget.id)}
                            className="p-1 rounded-md text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="Delete budget"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4 pt-4">
                      {/* Spent vs Total Numbers */}
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground font-medium">Spent so far</p>
                          <p className="text-2xl font-black tabular-nums tracking-tight text-foreground">
                            {formatCurrency(bs.spent_minor, currency, locale)}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            ≈ {formatCurrency(Math.round(convertAmount(bs.spent_minor / 100, currency, secondaryCurrency) * 100), secondaryCurrency)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground font-medium">Allocated Limit</p>
                          <p className="text-sm font-bold text-muted-foreground tabular-nums">
                            {formatCurrency(bs.budget.total_minor, currency, locale)}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            ≈ {formatCurrency(Math.round(convertAmount(bs.budget.total_minor / 100, currency, secondaryCurrency) * 100), secondaryCurrency)}
                          </p>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="space-y-1.5">
                        <Progress
                          value={Math.min(100, bs.percent_used)}
                          indicatorClassName={cn(
                            'transition-all duration-700',
                            bs.status === 'safe'
                              ? 'bg-emerald-500'
                              : bs.status === 'warning'
                              ? 'bg-amber-500'
                              : bs.status === 'alert'
                              ? 'bg-orange-500'
                              : 'bg-rose-500'
                          )}
                        />
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold tabular-nums text-foreground">
                            {formatPercent(bs.percent_used)} consumed
                          </span>
                          <span className={cn('font-bold tabular-nums', config.color)}>
                            {bs.remaining_minor > 0
                              ? `${formatCurrency(bs.remaining_minor, currency, locale)} left`
                              : `${formatCurrency(bs.spent_minor - bs.budget.total_minor, currency, locale)} over cap`}
                          </span>
                        </div>
                      </div>

                      {/* Warning Callout */}
                      {bs.status === 'warning' && (
                        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 shrink-0" />
                          <span>Reached {Math.round(bs.percent_used)}% of limit. Slow down non-essentials.</span>
                        </div>
                      )}
                      {bs.status === 'exceeded' && (
                        <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 shrink-0" />
                          <span>Budget exceeded by {formatCurrency(bs.spent_minor - bs.budget.total_minor, currency, locale)}! Check Taiwan grocery/transport hacks.</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Month's Itemized Expense Ledger */}
      <Card className="border-border/70 bg-card/60 backdrop-blur-sm overflow-hidden">
        <CardHeader className="p-4 pb-3 border-b border-border/40 bg-accent/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <CardTitle className="text-base font-bold text-foreground">
                Expenses in {selectedMonthName}
              </CardTitle>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                {monthTransactions.length} Transactions
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Total Spent this month: <strong className="text-foreground">{formatCurrency(monthExpenses, currency, locale)}</strong> (≈ {formatCurrency(Math.round(convertAmount(monthExpenses / 100, currency, secondaryCurrency) * 100), secondaryCurrency)})
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadMonthPDF}
              disabled={monthTransactions.length === 0}
              className="text-xs gap-1.5 font-semibold border-primary/30 text-primary hover:bg-primary/10 h-8"
              title="Download Month Expense Statement in PDF"
            >
              <FileText className="h-3.5 w-3.5 text-primary" />
              <span>Download PDF</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadMonthCSV}
              disabled={monthTransactions.length === 0}
              className="text-xs gap-1.5 font-semibold text-muted-foreground hover:text-foreground h-8"
              title="Download Month Expense List in CSV"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download CSV</span>
            </Button>

            <Link
              to="/transactions"
              className="text-xs text-primary font-medium hover:underline inline-flex items-center gap-1 ml-1"
            >
              <span>Transactions</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </CardHeader>

        <CardContent className="p-2 sm:p-3">
          {monthTransactions.length > 0 ? (
            <div className="divide-y divide-border/30">
              {monthTransactions.map((tx, idx) => (
                <TransactionItem key={tx.id} transaction={tx} index={idx} />
              ))}
            </div>
          ) : (
            <div className="py-12 text-center space-y-3">
              <div className="h-10 w-10 mx-auto rounded-xl bg-accent flex items-center justify-center text-muted-foreground">
                <Calendar className="h-5 w-5" />
              </div>
              <p className="text-sm font-semibold text-foreground">
                No Transactions Found for {selectedMonthName}
              </p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                No expenses were recorded for this month. Switch months using the toolbar above or add a transaction to track spending.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Budget Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleCreateBudget}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" />
                Create Spending Budget
              </DialogTitle>
              <DialogDescription>
                Define an expenditure ceiling in {currency} with automatic cross-currency tracking.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Period Selection */}
              <div className="space-y-2">
                <Label>Budget Period</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPeriod('monthly')}
                    className={cn(
                      'p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all',
                      period === 'monthly'
                        ? 'border-primary bg-primary/10 text-primary shadow-xs'
                        : 'border-border/80 bg-card hover:bg-accent text-muted-foreground'
                    )}
                  >
                    📅 Monthly Cap
                  </button>
                  <button
                    type="button"
                    onClick={() => setPeriod('weekly')}
                    className={cn(
                      'p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all',
                      period === 'weekly'
                        ? 'border-primary bg-primary/10 text-primary shadow-xs'
                        : 'border-border/80 bg-card hover:bg-accent text-muted-foreground'
                    )}
                  >
                    📆 Weekly Cap
                  </button>
                </div>
              </div>

              {/* Amount Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="budget-amount">Budget Amount ({currency})</Label>
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
                    id="budget-amount"
                    type="number"
                    step="any"
                    min="1"
                    placeholder={period === 'monthly' ? '25000' : '6000'}
                    value={amountStr}
                    onChange={e => setAmountStr(e.target.value)}
                    className="pl-12 text-base font-bold"
                    required
                  />
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[11px] text-muted-foreground">Quick Taiwan presets:</span>
                  {(period === 'monthly' ? [15000, 25000, 35000] : [3500, 6000, 8000]).map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setAmountStr(val.toString())}
                      className="text-[11px] px-2 py-0.5 rounded-md bg-accent hover:bg-accent/80 text-foreground font-medium border border-border/60 transition-colors"
                    >
                      {val.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Thresholds */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="warn-threshold" className="text-xs">
                    Warning Alert (%)
                  </Label>
                  <Input
                    id="warn-threshold"
                    type="number"
                    min="50"
                    max="95"
                    value={warnThreshold}
                    onChange={e => setWarnThreshold(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="alert-threshold" className="text-xs">
                    Critical Alert (%)
                  </Label>
                  <Input
                    id="alert-threshold"
                    type="number"
                    min="60"
                    max="100"
                    value={alertThreshold}
                    onChange={e => setAlertThreshold(e.target.value)}
                    className="text-xs"
                  />
                </div>
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
              <Button type="submit" disabled={submitting || parsedAmount <= 0}>
                {submitting ? 'Saving…' : 'Save Budget'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Budget?</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this budget ceiling? Your transaction logs will remain unaffected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Keep Budget
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteId) {
                  deleteBudget(deleteId)
                  setDeleteId(null)
                }
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
