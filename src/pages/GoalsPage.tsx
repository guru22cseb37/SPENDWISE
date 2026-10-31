import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Target,
  Calendar,
  TrendingUp,
  Trash2,
  RotateCcw,
  Sparkles,
  PiggyBank,
  CheckCircle2,
  Coins,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { useAuthStore } from '@/stores/authStore'
import { useGoalStore, GoalFormData } from '@/stores/goalStore'
import { SavingsGoal, GoalProgress } from '@/types'
import { computeGoalProgress, formatCurrency, formatPercent } from '@/lib/calculations'
import { convertAmount } from '@/lib/currency'
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

const GOAL_ICONS = ['✈️', '🛡️', '💻', '🏠', '🚗', '💰', '🎯', '🎁', '🎓', '🏖️', '📱', '🛵']
const COLOR_PRESETS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#8b5cf6', // purple
  '#f59e0b', // amber
  '#ec4899', // pink
  '#06b6d4', // cyan
]

export default function GoalsPage() {
  const { user, profile } = useAuthStore()
  const { goals, loading, fetchGoals, addGoal, addContribution, deleteGoal, clearAllGoals, resetDefaults } = useGoalStore()

  const [progresses, setProgresses] = useState<GoalProgress[]>([])
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [depositModalOpen, setDepositModalOpen] = useState(false)
  const [activeGoal, setActiveGoal] = useState<SavingsGoal | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  // Create form state
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('🎯')
  const [color, setColor] = useState('#3b82f6')
  const [targetAmountStr, setTargetAmountStr] = useState('')
  const [currentAmountStr, setCurrentAmountStr] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [monthlyContribStr, setMonthlyContribStr] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Deposit modal state
  const [depositAmountStr, setDepositAmountStr] = useState('1000')

  const currency = profile?.currency || 'TWD'
  const locale = profile?.locale || (currency === 'TWD' ? 'zh-TW' : 'en-IN')
  const secondaryCurrency = currency === 'TWD' ? 'INR' : 'TWD'

  useEffect(() => {
    fetchGoals(user?.id)
  }, [user, fetchGoals])

  useEffect(() => {
    setProgresses(goals.map(computeGoalProgress))
  }, [goals])

  const parsedTarget = parseFloat(targetAmountStr) || 0
  const convertedTarget = parsedTarget > 0 ? convertAmount(parsedTarget, currency, secondaryCurrency) : 0

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || parsedTarget <= 0) return

    setSubmitting(true)
    try {
      const data: GoalFormData = {
        name,
        icon,
        color,
        target_amount: parsedTarget,
        current_amount: parseFloat(currentAmountStr) || 0,
        target_date: targetDate || undefined,
        monthly_contribution: parseFloat(monthlyContribStr) || undefined,
      }
      await addGoal(user?.id || 'local-user', data)
      // Reset form
      setName('')
      setTargetAmountStr('')
      setCurrentAmountStr('')
      setTargetDate('')
      setMonthlyContribStr('')
      setCreateModalOpen(false)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeGoal) return
    const amount = parseFloat(depositAmountStr) || 0
    if (amount <= 0) return

    await addContribution(activeGoal.id, amount)
    setDepositModalOpen(false)
    setActiveGoal(null)
  }

  const totalSaved = goals.reduce((sum, g) => sum + g.current_minor, 0)
  const totalTarget = goals.reduce((sum, g) => sum + g.target_minor, 0)
  const overallPct = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Savings Goals</h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              🇹🇼 NT$ & 🇮🇳 ₹ Dual-Tracking
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Turn your dreams into reality — track milestones, log contributions, and see estimated completion dates.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {goals.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearAllGoals}
              className="gap-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border-rose-500/30"
              title="Delete all sample goals and start fresh"
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
            title="Reset to recommended sample goals"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Load Samples
          </Button>

          <Button
            size="sm"
            onClick={() => setCreateModalOpen(true)}
            className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            New Goal
          </Button>
        </div>
      </div>

      {/* Overall Progress Banner */}
      {goals.length > 0 && (
        <Card className="border-border/70 bg-gradient-to-r from-card/80 via-accent/30 to-card/80 backdrop-blur-sm">
          <CardContent className="p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xl">
                  <PiggyBank className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Combined Savings Milestones</p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(Math.max(0, totalTarget - totalSaved), currency, locale)} needed to achieve all targets
                  </p>
                </div>
              </div>

              <div className="text-right">
                <p className="text-2xl font-black text-primary tabular-nums">
                  {formatPercent(overallPct)}
                </p>
                <p className="text-xs text-muted-foreground">Overall Achieved</p>
              </div>
            </div>

            <Progress value={overallPct} indicatorClassName="bg-gradient-primary" />

            <div className="flex justify-between text-xs text-muted-foreground tabular-nums pt-1">
              <span>
                Saved: <strong className="text-foreground">{formatCurrency(totalSaved, currency, locale)}</strong>
                <span className="opacity-70 ml-1">
                  (≈ {formatCurrency(Math.round(convertAmount(totalSaved / 100, currency, secondaryCurrency) * 100), secondaryCurrency)})
                </span>
              </span>
              <span>
                Total Target: <strong className="text-foreground">{formatCurrency(totalTarget, currency, locale)}</strong>
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Goals Grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2].map(i => <div key={i} className="skeleton h-56 rounded-2xl bg-card/50" />)}
        </div>
      ) : progresses.length === 0 ? (
        <Card className="border-dashed border-border/80">
          <CardContent className="py-16 text-center space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Target className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">No Savings Goals Yet</h2>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                Set exciting milestones like an Emergency Fund, a Trip back to India, or a Tech Upgrade to stay focused.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3">
              <Button onClick={() => setCreateModalOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Create First Goal
              </Button>
              <Button
                variant="outline"
                onClick={() => resetDefaults(user?.id || 'local-user')}
                className="gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Load Sample Goals
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {progresses.map((gp, i) => {
              const isCompleted = gp.goal.current_minor >= gp.goal.target_minor

              return (
                <motion.div
                  key={gp.goal.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className="overflow-hidden border border-border/80 hover:shadow-md transition-all flex flex-col justify-between h-full group">
                    <div>
                      <CardHeader className="pb-3 border-b border-border/40 bg-accent/20">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <div
                              className="flex h-11 w-11 items-center justify-center rounded-2xl text-xl shadow-xs"
                              style={{ backgroundColor: `${gp.goal.color}25` }}
                            >
                              {gp.goal.icon || '🎯'}
                            </div>
                            <div>
                              <CardTitle className="text-base font-bold text-foreground">
                                {gp.goal.name}
                              </CardTitle>
                              {gp.goal.target_date && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                  <Calendar className="h-3 w-3" />
                                  Target: {format(parseISO(gp.goal.target_date), 'dd MMM yyyy')}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span
                              className={cn(
                                'text-[11px] px-2 py-0.5 rounded-full font-semibold flex items-center gap-1',
                                isCompleted
                                  ? 'bg-emerald-500/10 text-emerald-400'
                                  : gp.on_track
                                  ? 'bg-sky-500/10 text-sky-400'
                                  : 'bg-amber-500/10 text-amber-400'
                              )}
                            >
                              {isCompleted ? (
                                <>
                                  <CheckCircle2 className="h-3 w-3" /> Reached 🎉
                                </>
                              ) : gp.on_track ? (
                                'On track'
                              ) : (
                                'Keep saving'
                              )}
                            </span>
                            <button
                              type="button"
                              onClick={() => setDeleteId(gp.goal.id)}
                              className="p-1 rounded-md text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                              title="Delete goal"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4 pt-4">
                        {/* Amount values */}
                        <div className="flex items-end justify-between">
                          <div>
                            <p className="text-xs text-muted-foreground font-medium">Accumulated</p>
                            <p className="text-2xl font-black tabular-nums tracking-tight text-foreground">
                              {formatCurrency(gp.goal.current_minor, currency, locale)}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              ≈ {formatCurrency(Math.round(convertAmount(gp.goal.current_minor / 100, currency, secondaryCurrency) * 100), secondaryCurrency)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground font-medium">Target</p>
                            <p className="text-sm font-bold text-muted-foreground tabular-nums">
                              {formatCurrency(gp.goal.target_minor, currency, locale)}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              ≈ {formatCurrency(Math.round(convertAmount(gp.goal.target_minor / 100, currency, secondaryCurrency) * 100), secondaryCurrency)}
                            </p>
                          </div>
                        </div>

                        {/* Progress */}
                        <div className="space-y-1.5">
                          <Progress
                            value={gp.progress_pct}
                            indicatorClassName="bg-gradient-primary transition-all duration-700"
                          />
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span className="font-semibold text-foreground tabular-nums">
                              {formatPercent(gp.progress_pct)} saved
                            </span>
                            {gp.estimated_completion_date && !isCompleted && (
                              <span className="flex items-center gap-1 text-[11px] font-medium text-primary">
                                <TrendingUp className="h-3 w-3" />
                                Est. {format(parseISO(gp.estimated_completion_date), 'MMM yyyy')}
                              </span>
                            )}
                          </div>
                        </div>

                        {gp.goal.monthly_contribution_minor && (
                          <div className="p-2 rounded-xl bg-accent/40 border border-border/40 text-xs text-muted-foreground flex items-center justify-between">
                            <span>Monthly plan:</span>
                            <span className="font-semibold text-foreground">
                              {formatCurrency(gp.goal.monthly_contribution_minor, currency, locale)} / mo
                            </span>
                          </div>
                        )}
                      </CardContent>
                    </div>

                    {/* Quick Deposit Button */}
                    <div className="p-4 pt-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setActiveGoal(gp.goal)
                          setDepositAmountStr('1000')
                          setDepositModalOpen(true)
                        }}
                        className="w-full gap-2 border-primary/30 hover:bg-primary/10 hover:text-primary font-semibold text-xs"
                      >
                        <Coins className="h-3.5 w-3.5" />
                        + Deposit / Add Savings
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Create Goal Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleCreateGoal}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Create Savings Goal
              </DialogTitle>
              <DialogDescription>
                Define your target in {currency} with automatic cross-currency {secondaryCurrency} conversion.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Icon & Name */}
              <div className="space-y-2">
                <Label htmlFor="goal-name">Goal Name</Label>
                <div className="flex gap-2">
                  <div className="relative">
                    <span className="text-xl p-2 rounded-xl bg-accent border border-border flex items-center justify-center w-11 h-11">
                      {icon}
                    </span>
                  </div>
                  <Input
                    id="goal-name"
                    placeholder="e.g. Trip to India, Scooter, Emergency Fund"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="flex-1 text-sm font-medium"
                    required
                  />
                </div>
              </div>

              {/* Icon selector chips */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Choose Icon</Label>
                <div className="flex flex-wrap gap-1.5">
                  {GOAL_ICONS.map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setIcon(emoji)}
                      className={cn(
                        'h-9 w-9 rounded-xl flex items-center justify-center text-lg border transition-all',
                        icon === emoji ? 'border-primary bg-primary/20 scale-105' : 'border-border/60 hover:bg-accent'
                      )}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color selector */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Accent Color</Label>
                <div className="flex gap-2">
                  {COLOR_PRESETS.map(hex => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => setColor(hex)}
                      className={cn(
                        'h-6 w-6 rounded-full transition-transform',
                        color === hex ? 'scale-125 ring-2 ring-primary ring-offset-2 ring-offset-background' : 'opacity-80 hover:opacity-100'
                      )}
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </div>
              </div>

              {/* Target Amount */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="target-amount">Target Amount ({currency})</Label>
                  {parsedTarget > 0 && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary">
                      ≈ {secondaryCurrency === 'INR' ? '₹' : 'NT$'} {convertedTarget.toLocaleString()} {secondaryCurrency}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-muted-foreground">
                    {currency === 'TWD' ? 'NT$' : '₹'}
                  </span>
                  <Input
                    id="target-amount"
                    type="number"
                    min="1"
                    placeholder="50000"
                    value={targetAmountStr}
                    onChange={e => setTargetAmountStr(e.target.value)}
                    className="pl-12 text-base font-bold"
                    required
                  />
                </div>
              </div>

              {/* Initial Saved & Monthly Contribution */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="current-amount" className="text-xs">
                    Already Saved ({currency})
                  </Label>
                  <Input
                    id="current-amount"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={currentAmountStr}
                    onChange={e => setCurrentAmountStr(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="monthly-contrib" className="text-xs">
                    Monthly Plan ({currency}/mo)
                  </Label>
                  <Input
                    id="monthly-contrib"
                    type="number"
                    min="0"
                    placeholder="5000"
                    value={monthlyContribStr}
                    onChange={e => setMonthlyContribStr(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>

              {/* Target Date */}
              <div className="space-y-1.5">
                <Label htmlFor="target-date" className="text-xs">
                  Target Target Date (Optional)
                </Label>
                <Input
                  id="target-date"
                  type="date"
                  value={targetDate}
                  onChange={e => setTargetDate(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateModalOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || !name.trim() || parsedTarget <= 0}>
                {submitting ? 'Saving…' : 'Create Goal'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Deposit / Contribution Modal */}
      <Dialog open={depositModalOpen} onOpenChange={setDepositModalOpen}>
        <DialogContent className="sm:max-w-sm">
          <form onSubmit={handleDeposit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-emerald-400" />
                Deposit to "{activeGoal?.name}"
              </DialogTitle>
              <DialogDescription>
                Add money to this goal and watch your savings progress grow.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="deposit-amount">Deposit Amount ({currency})</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-muted-foreground">
                    {currency === 'TWD' ? 'NT$' : '₹'}
                  </span>
                  <Input
                    id="deposit-amount"
                    type="number"
                    min="1"
                    value={depositAmountStr}
                    onChange={e => setDepositAmountStr(e.target.value)}
                    className="pl-12 text-lg font-bold"
                    required
                    autoFocus
                  />
                </div>
              </div>

              {/* Quick deposit chips */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Quick Add Presets:</Label>
                <div className="grid grid-cols-4 gap-2">
                  {[500, 1000, 2500, 5000].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setDepositAmountStr(amt.toString())}
                      className="py-1.5 rounded-lg border border-border/80 bg-accent/40 hover:bg-primary/10 hover:border-primary/40 text-xs font-semibold text-foreground transition-colors"
                    >
                      +{amt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDepositModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
                <CheckCircle2 className="h-4 w-4" />
                Confirm Deposit
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Savings Goal?</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this goal? Your recorded financial balance will remain untouched.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Keep Goal
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteId) {
                  deleteGoal(deleteId)
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
