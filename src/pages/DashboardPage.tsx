import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Sparkles,
  AlertCircle,
  Plus,
  ChevronLeft,
  ChevronRight,
  Calendar,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { format, subMonths, addMonths, isSameMonth } from 'date-fns'
import { Link } from 'react-router-dom'

import { useAuthStore } from '@/stores/authStore'
import { useTransactionStore } from '@/stores/transactionStore'
import { useUIStore } from '@/stores/uiStore'
import {
  buildMonthlyFinancials,
  computeBalance,
  buildCategoryBreakdown,
  buildDailySpending,
  getPeriodRange,
  getMonthOverMonthChange,
  formatCurrency,
  formatCurrencyCompact,
  formatPercent,
  fromMinorUnits,
} from '@/lib/calculations'
import { getDirectRate } from '@/lib/currency'
import { cn } from '@/lib/utils'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { TransactionItem } from '@/components/transactions/TransactionItem'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { TransactionForm } from '@/components/transactions/TransactionForm'
import taiwanCurrencyImg from '@/assets/taiwan-dollar.jpg'

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.3 },
  }),
}

const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4', '#84cc16', '#ec4899']

export default function DashboardPage() {
  const { user, profile, updateProfile } = useAuthStore()
  const { transactions, fetchAllTransactions, fetchCategories, loadSampleData } = useTransactionStore()
  const { activeViewPeriod, addToast } = useUIStore()
  const [addModalOpen, setAddModalOpen] = useState(false)

  const currency = profile?.currency || 'TWD'
  const locale = profile?.locale || (currency === 'TWD' ? 'zh-TW' : 'en-IN')

  useEffect(() => {
    if (user) {
      fetchAllTransactions(user.id)
      fetchCategories(user.id)
    }
  }, [user, fetchAllTransactions, fetchCategories])

  // Month-wise tracking state
  const [selectedDate, setSelectedDate] = useState(() => new Date())

  const handlePrevMonth = () => setSelectedDate(d => subMonths(d, 1))
  const handleNextMonth = () => setSelectedDate(d => addMonths(d, 1))
  const handleCurrentMonth = () => setSelectedDate(new Date())

  const selectedYear = selectedDate.getFullYear()
  const selectedMonth = selectedDate.getMonth()
  const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1
  const prevYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear

  const currentMF = buildMonthlyFinancials(transactions, selectedYear, selectedMonth)
  const prevMF = buildMonthlyFinancials(transactions, prevYear, prevMonth)

  const balance = computeBalance(profile?.opening_balance_minor || 0, transactions)
  const expenseChange = getMonthOverMonthChange(
    currentMF.total_expenses_minor,
    prevMF.total_expenses_minor
  )

  const { from, to } = getPeriodRange('month', selectedDate)
  const dailyData = buildDailySpending(transactions, from, to)
    .filter(d => d.total_minor !== 0 || d.income_minor !== 0 || d.expense_minor !== 0)

  const categoryData = buildCategoryBreakdown(
    transactions.filter(tx => {
      const date = new Date(tx.date)
      return date >= from && date <= to
    })
  ).slice(0, 8)

  // Last 6 months trajectory data
  const sixMonthsTrend = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(selectedDate, 5 - i)
    const mf = buildMonthlyFinancials(transactions, d.getFullYear(), d.getMonth())
    return {
      month: format(d, 'MMM'),
      income: mf.total_income_minor / 100,
      expenses: mf.total_expenses_minor / 100,
      net: mf.net_minor / 100,
    }
  })

  const recentTransactions = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5)

  const hasData = transactions.length > 0

  const statsCards = [
    {
      title: 'Total Balance',
      value: balance,
      icon: Wallet,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      trend: null,
    },
    {
      title: `Income (${format(selectedDate, 'MMM yyyy')})`,
      value: currentMF.total_income_minor,
      icon: TrendingUp,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      trend: null,
    },
    {
      title: `Expenses (${format(selectedDate, 'MMM yyyy')})`,
      value: currentMF.total_expenses_minor,
      icon: TrendingDown,
      color: 'text-rose-400',
      bgColor: 'bg-rose-500/10',
      trend: expenseChange,
    },
    {
      title: `Net Cash Flow (${format(selectedDate, 'MMM yyyy')})`,
      value: currentMF.net_minor,
      icon: currentMF.net_minor >= 0 ? ArrowUpRight : ArrowDownRight,
      color: currentMF.net_minor >= 0 ? 'text-emerald-400' : 'text-rose-400',
      bgColor: currentMF.net_minor >= 0 ? 'bg-emerald-500/10' : 'bg-rose-500/10',
      trend: null,
    },
  ]

  // Live running Taiwan Clock (Asia/Taipei timezone, UTC+8)
  const [taiwanTime, setTaiwanTime] = useState(() => new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setTaiwanTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const formattedTaiwanTime = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Taipei',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(taiwanTime)

  const formattedTaiwanDate = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Taipei',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(taiwanTime)

  const taiwanHour = parseInt(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Taipei',
      hour: 'numeric',
      hour12: false,
    }).format(taiwanTime),
    10
  )

  const greeting = taiwanHour < 12 ? 'morning' : taiwanHour < 17 ? 'afternoon' : 'evening'

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <span>Good {greeting},</span>{' '}
            <span className="text-primary font-extrabold bg-gradient-to-r from-primary via-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Master
            </span>
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-1.5 text-sm text-muted-foreground">
            {/* Live Taiwan Clock Pill */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/25 text-foreground font-medium shadow-xs">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold">🇹🇼 Taiwan Time:</span>
              <span className="font-mono text-xs font-bold text-primary tracking-wide tabular-nums">
                {formattedTaiwanTime}
              </span>
            </div>
            <span className="text-xs">·</span>
            <span className="text-xs">{formattedTaiwanDate}</span>
            <span className="text-xs">·</span>
            <span className="text-xs font-semibold text-foreground bg-secondary/80 px-2 py-0.5 rounded-md border border-border/40">
              Active: {currency}
            </span>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2">
          <Link to="/budgets">
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1.5 font-semibold text-primary border-primary/30 hover:bg-primary/10 shadow-xs"
            >
              <Plus className="h-3.5 w-3.5 text-primary" />
              <span>Add Budget</span>
            </Button>
          </Link>

          <Button
            size="sm"
            onClick={() => setAddModalOpen(true)}
            className="text-xs gap-1.5 font-semibold bg-primary hover:bg-primary/90 text-white shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Transaction</span>
          </Button>
        </div>
      </motion.div>

      {/* No data state - Taiwan Currency Spotlight Showcase */}
      {!hasData && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-card via-card/90 to-primary/5 p-6 lg:p-8 shadow-2xl"
        >
          {/* Ambient background glows */}
          <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
          <div className="pointer-events-none absolute -left-16 -bottom-16 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />

          <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-5 text-left">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 border border-primary/30 px-3 py-1 text-xs font-semibold text-primary">
                  <span>🇹🇼</span>
                  <span>新臺幣 · New Taiwan Dollar (NT$ / TWD)</span>
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 text-xs font-medium text-purple-300">
                  <span>🇮🇳</span>
                  <span>Dual Track: ₹ INR</span>
                </span>
              </div>

              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                  Track Your Finances in <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-indigo-400 to-purple-400">Taiwan Dollars</span>
                </h2>
                <p className="mt-2 text-sm sm:text-base text-muted-foreground leading-relaxed">
                  Tailored for living and working in Taiwan. Seamlessly log everyday expenses at{' '}
                  <strong className="text-foreground">7-Eleven, FamilyMart, PX Mart, TPASS 1200 transit</strong>,{' '}
                  rent, and remittances to India with live NT$ ⇄ ₹ exchange calculations.
                </p>
              </div>

              {/* Conversion pill bar */}
              <div className="grid grid-cols-3 gap-3 rounded-2xl border border-border/60 bg-background/50 p-3 backdrop-blur-xs">
                <div className="text-center">
                  <p className="text-[11px] text-muted-foreground">Exchange Rate</p>
                  <p className="text-sm font-bold text-foreground mt-0.5">1 NT$ ≈ ₹{getDirectRate('TWD', 'INR').toFixed(2)}</p>
                </div>
                <div className="text-center border-x border-border/50">
                  <p className="text-[11px] text-muted-foreground">TPASS Monthly</p>
                  <p className="text-sm font-bold text-emerald-400 mt-0.5">
                    NT$ 1,200{' '}
                    <span className="text-[10px] text-muted-foreground block font-normal">
                      ≈ ₹{(1200 * getDirectRate('TWD', 'INR')).toFixed(0)}
                    </span>
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[11px] text-muted-foreground">Invoice Lottery</p>
                  <p className="text-sm font-bold text-amber-400 mt-0.5">
                    Up to NT$10M{' '}
                    <span className="text-[10px] text-muted-foreground block font-normal">
                      統一發票
                    </span>
                  </p>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Link to="/budgets">
                  <Button
                    className="gap-2 bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-500 text-white font-semibold px-5 shadow-lg shadow-primary/25 h-11"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add your budget to track expense</span>
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  onClick={() => setAddModalOpen(true)}
                  className="gap-2 border-border/80 hover:bg-secondary/60 font-medium h-11 px-4"
                >
                  <Plus className="h-4 w-4" />
                  Add Custom Expense
                </Button>
              </div>
            </div>

            {/* Right Taiwanese Currency Showcase Artwork */}
            <div className="lg:col-span-5 flex flex-col items-center">
              <div className="relative group w-full max-w-md rounded-2xl overflow-hidden border border-primary/30 shadow-2xl shadow-primary/20 bg-card">
                <img
                  src={taiwanCurrencyImg}
                  alt="Taiwanese Currency - New Taiwan Dollar (NT$ 1,000, 500 Banknotes and Coins)"
                  className="w-full h-auto object-cover transform group-hover:scale-105 transition-transform duration-500"
                />
                {/* Floating pill over image */}
                <div className="absolute bottom-3 left-3 right-3 rounded-xl bg-background/85 backdrop-blur-md border border-white/10 px-3 py-2 flex items-center justify-between shadow-lg">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-semibold text-foreground">新臺幣 (New Taiwan Dollar)</span>
                  </div>
                  <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">
                    NT$ · TWD
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground mt-2 text-center">
                Official Currency of Taiwan · 1,000 NT$ & 500 NT$ Banknotes + Coins
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Month-Wise Tracking Toolbar */}
      <motion.div
        variants={fadeUp}
        custom={1}
        initial="hidden"
        animate="visible"
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card/70 backdrop-blur-md p-3.5 rounded-2xl border border-border/60 shadow-xs"
      >
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
              {format(selectedDate, 'MMMM yyyy')}
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

        {/* Month Summary Quick Badges */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted-foreground text-xs hidden md:inline">Month Totals:</span>
          <div className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
            +{formatCurrency(currentMF.total_income_minor, currency, locale)}
          </div>
          <div className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-400 font-semibold border border-rose-500/20">
            -{formatCurrency(currentMF.total_expenses_minor, currency, locale)}
          </div>
          <div className={cn(
            'px-2.5 py-1 rounded-lg font-semibold border',
            currentMF.net_minor >= 0
              ? 'bg-primary/10 text-primary border-primary/20'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
          )}>
            Net: {currentMF.net_minor >= 0 ? '+' : ''}{formatCurrency(currentMF.net_minor, currency, locale)}
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat, i) => (
          <motion.div
            key={stat.title}
            custom={i}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
          >
            <Card className="relative overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', stat.bgColor)}>
                    <stat.icon className={cn('h-5 w-5', stat.color)} />
                  </div>
                  {stat.trend !== null && (
                    <div className={cn(
                      'flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full',
                      stat.trend > 0 ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'
                    )}>
                      {stat.trend > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      {Math.abs(stat.trend).toFixed(1)}%
                    </div>
                  )}
                </div>
                <div className="mt-3">
                  <p className="text-xs text-muted-foreground font-medium">{stat.title}</p>
                  <p className={cn('text-2xl font-bold tabular-nums mt-1', stat.color)}>
                    {formatCurrencyCompact(stat.value, currency, locale)}
                  </p>
                  <p className="text-[11px] text-muted-foreground tabular-nums mt-0.5">
                    {currency === 'TWD' ? (
                      <span>≈ ₹{(fromMinorUnits(stat.value) * getDirectRate('TWD', 'INR')).toFixed(0)} INR</span>
                    ) : currency === 'INR' ? (
                      <span>≈ NT$ {Math.round(fromMinorUnits(stat.value) * getDirectRate('INR', 'TWD'))} TWD</span>
                    ) : (
                      <span>≈ NT$ {Math.round(fromMinorUnits(stat.value) * getDirectRate(currency, 'TWD'))} TWD</span>
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>



      {hasData && (
        <>
          {/* Charts row */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Daily spending trend */}
            <motion.div
              variants={fadeUp}
              custom={4}
              initial="hidden"
              animate="visible"
              className="lg:col-span-2"
            >
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Daily spending — {format(selectedDate, 'MMMM yyyy')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={dailyData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                      <defs>
                        <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={d => format(new Date(d), 'd')}
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tickFormatter={v => formatCurrencyCompact(v, currency, locale)}
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0b0f19',
                          border: '1px solid #334155',
                          borderRadius: '12px',
                          fontSize: '12px',
                          color: '#ffffff',
                          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.6)',
                        }}
                        itemStyle={{
                          color: '#ffffff',
                          fontWeight: 700,
                          fontSize: '13px',
                        }}
                        labelStyle={{
                          color: '#cbd5e1',
                          fontWeight: 600,
                          marginBottom: '3px',
                        }}
                        formatter={(value: number) => [formatCurrency(value, currency, locale)]}
                        labelFormatter={d => format(new Date(d), 'dd MMM')}
                      />
                      <Area
                        type="monotone"
                        dataKey="expense_minor"
                        name="Expenses"
                        stroke="#f43f5e"
                        fill="url(#expenseGrad)"
                        strokeWidth={2}
                      />
                      <Area
                        type="monotone"
                        dataKey="income_minor"
                        name="Income"
                        stroke="#10b981"
                        fill="url(#incomeGrad)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>

            {/* Category breakdown */}
            <motion.div
              variants={fadeUp}
              custom={5}
              initial="hidden"
              animate="visible"
            >
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Spending by category</CardTitle>
                </CardHeader>
                <CardContent>
                  {categoryData.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={160}>
                        <PieChart>
                          <Pie
                            data={categoryData}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={70}
                            paddingAngle={2}
                            dataKey="total_minor"
                          >
                            {categoryData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={entry.category?.color || CHART_COLORS[index % CHART_COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0]
                                return (
                                  <div className="bg-[#0b0f19] border border-slate-700/90 px-3.5 py-2.5 rounded-xl shadow-2xl text-center pointer-events-none min-w-[120px]">
                                    <p className="text-xs font-semibold text-slate-300">
                                      {data.payload?.category?.name || data.name || 'Expense'}
                                    </p>
                                    <p className="text-base font-black text-sky-400 mt-0.5 tabular-nums">
                                      {formatCurrency(Number(data.value), currency, locale)}
                                    </p>
                                    {data.payload?.percent_of_expenses !== undefined && (
                                      <p className="text-[10px] font-bold text-emerald-400 mt-0.5">
                                        {data.payload.percent_of_expenses.toFixed(1)}% of total
                                      </p>
                                    )}
                                  </div>
                                )
                              }
                              return null
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-2 mt-2">
                        {categoryData.slice(0, 4).map((item, i) => (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span
                                className="h-2 w-2 rounded-full shrink-0"
                                style={{ backgroundColor: item.category?.color || CHART_COLORS[i] }}
                                aria-hidden="true"
                              />
                              <span className="text-muted-foreground truncate max-w-[100px]">
                                {item.category?.name}
                              </span>
                            </div>
                            <span className="tabular-nums font-medium">
                              {formatPercent(item.percent_of_expenses)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
                      No expense data yet
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Savings rate */}
          {currentMF.savings_rate_pct !== null && (
            <motion.div
              variants={fadeUp}
              custom={6}
              initial="hidden"
              animate="visible"
            >
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-medium">Savings rate this month</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatCurrency(currentMF.total_income_minor - currentMF.total_expenses_minor, currency, locale)} saved of {formatCurrency(currentMF.total_income_minor, currency, locale)} earned
                      </p>
                    </div>
                    <p className={cn(
                      'text-2xl font-bold tabular-nums',
                      currentMF.savings_rate_pct >= 20 ? 'text-emerald-400' :
                      currentMF.savings_rate_pct >= 10 ? 'text-amber-400' :
                      'text-rose-400'
                    )}>
                      {formatPercent(currentMF.savings_rate_pct)}
                    </p>
                  </div>
                  <Progress
                    value={Math.min(100, currentMF.savings_rate_pct)}
                    indicatorClassName={
                      currentMF.savings_rate_pct >= 20 ? 'bg-gradient-income' :
                      currentMF.savings_rate_pct >= 10 ? 'bg-amber-500' :
                      'bg-gradient-expense'
                    }
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    {currentMF.savings_rate_pct >= 20
                      ? '🎉 Excellent! You\'re saving more than 20% of your income.'
                      : currentMF.savings_rate_pct >= 10
                      ? '👍 Good progress. Aim to save 20% or more each month.'
                      : '💡 Consider reducing discretionary spending to improve your savings rate.'}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Month-Wise Trajectory Bar Chart */}
          <motion.div
            variants={fadeUp}
            custom={6.5}
            initial="hidden"
            animate="visible"
          >
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span>Month-by-Month Spending & Income Trajectory</span>
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Compare your monthly income, expenses, and savings across the last 6 months
                  </p>
                </div>
                <Link to="/reports">
                  <Button variant="outline" size="sm" className="text-xs font-semibold gap-1">
                    <span>Full Statement</span>
                    <ArrowUpRight className="h-3 w-3" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={sixMonthsTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis
                      tickFormatter={v => formatCurrencyCompact(v * 100, currency, locale)}
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0b0f19',
                        border: '1px solid #334155',
                        borderRadius: '12px',
                        fontSize: '12px',
                        color: '#ffffff',
                        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.6)',
                      }}
                      itemStyle={{
                        color: '#38bdf8',
                        fontWeight: 700,
                        fontSize: '13px',
                      }}
                      labelStyle={{
                        color: '#cbd5e1',
                        fontWeight: 600,
                        marginBottom: '3px',
                      }}
                      formatter={(val: number) => [formatCurrency(val * 100, currency, locale)]}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                    <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" name="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          {/* Recent transactions */}
          <motion.div
            variants={fadeUp}
            custom={7}
            initial="hidden"
            animate="visible"
          >
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Recent transactions</CardTitle>
                  <Button variant="ghost" size="sm" asChild>
                    <a href="/transactions" className="text-xs text-primary">View all</a>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-2">
                {recentTransactions.length > 0 ? (
                  <div className="divide-y divide-border/50">
                    {recentTransactions.map((tx, i) => (
                      <TransactionItem key={tx.id} transaction={tx} index={i} />
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    No transactions yet
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}

      {/* Add Transaction Dialog */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Transaction</DialogTitle>
          </DialogHeader>
          <TransactionForm onSuccess={() => setAddModalOpen(false)} onCancel={() => setAddModalOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
