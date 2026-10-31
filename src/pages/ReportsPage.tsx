import { useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { Download, FileText } from 'lucide-react'
import { format, subMonths } from 'date-fns'
import { useAuthStore } from '@/stores/authStore'
import { useTransactionStore } from '@/stores/transactionStore'
import {
  buildMonthlyFinancials,
  buildCategoryBreakdown,
  formatCurrency,
  formatCurrencyCompact,
  filterByDateRange,
  getPeriodRange,
} from '@/lib/calculations'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { convertAmount } from '@/lib/currency'
import { exportCSV, exportPrintablePDFReport } from '@/lib/reports'

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4', '#84cc16', '#ec4899']

export default function ReportsPage() {
  const { user, profile } = useAuthStore()
  const { transactions, fetchAllTransactions } = useTransactionStore()
  const [selectedMonth, setSelectedMonth] = useState<string>('all')

  const currency = profile?.currency || 'TWD'
  const locale = profile?.locale || 'zh-TW'

  useEffect(() => {
    if (user) fetchAllTransactions(user.id)
  }, [user, fetchAllTransactions])

  const now = new Date()

  const availableMonths = Array.from(
    new Set(transactions.map(t => t.date.slice(0, 7)))
  ).sort().reverse()

  const filteredTransactions = transactions.filter(tx => {
    if (selectedMonth !== 'all' && !tx.date.startsWith(selectedMonth)) return false
    return true
  })

  const selectedMonthLabel = selectedMonth === 'all'
    ? 'All Time'
    : format(new Date(`${selectedMonth}-01`), 'MMMM yyyy')

  // Last 6 months data
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(now, 5 - i)
    const mf = buildMonthlyFinancials(transactions, date.getFullYear(), date.getMonth())
    return {
      month: format(date, 'MMM'),
      income: mf.total_income_minor / 100,
      expenses: mf.total_expenses_minor / 100,
      net: mf.net_minor / 100,
    }
  })

  // Category breakdown for filtered month
  const categoryData = buildCategoryBreakdown(filteredTransactions)
    .slice(0, 8)
    .map(b => ({
      name: b.category.name,
      value: b.total_minor / 100,
      color: b.category.color,
      percent: b.percent_of_expenses.toFixed(1),
    }))

  const handleExportPDF = () => {
    const income = filteredTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount_minor, 0)
    const expense = filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount_minor, 0)

    exportPrintablePDFReport(
      filteredTransactions,
      currency,
      income,
      expense,
      `${selectedMonthLabel} Financial Health Statement`
    )
  }

  const handleExportCSV = () => {
    exportCSV(filteredTransactions, currency, selectedMonthLabel)
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Financial Reports</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Month-wise breakdowns, comparative trajectory, and printable statements
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={handleExportPDF}
            disabled={filteredTransactions.length === 0}
            className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm text-xs font-semibold"
          >
            <FileText className="h-3.5 w-3.5" />
            Export {selectedMonth === 'all' ? 'All' : format(new Date(`${selectedMonth}-01`), 'MMM')} PDF
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs font-semibold"
            onClick={handleExportCSV}
            disabled={filteredTransactions.length === 0}
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Month Selection Bar */}
      {availableMonths.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto p-3 bg-card/60 backdrop-blur-sm rounded-2xl border border-border/50 scrollbar-none">
          <span className="text-xs text-muted-foreground font-medium shrink-0">Report Period:</span>
          <Button
            variant={selectedMonth === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedMonth('all')}
            className="text-xs h-7 px-3 rounded-full shrink-0"
          >
            All Months ({transactions.length})
          </Button>
          {availableMonths.map(ym => {
            const count = transactions.filter(t => t.date.startsWith(ym)).length
            const d = new Date(`${ym}-01`)
            return (
              <Button
                key={ym}
                variant={selectedMonth === ym ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedMonth(ym)}
                className="text-xs h-7 px-3 rounded-full shrink-0"
              >
                {format(d, 'MMMM yyyy')} ({count})
              </Button>
            )
          })}
        </div>
      )}

      {transactions.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            Add transactions to see your reports
          </CardContent>
        </Card>
      ) : (
        <>
          {/* 6-month income vs expenses */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Income vs Expenses — Last 6 months</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={monthlyData} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
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
                        color: '#ffffff',
                        fontWeight: 700,
                        fontSize: '13px',
                      }}
                      labelStyle={{
                        color: '#cbd5e1',
                        fontWeight: 600,
                        marginBottom: '3px',
                      }}
                      formatter={(value: number) => [formatCurrency(value * 100, currency, locale)]}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" name="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          {/* Category pie chart */}
          <div className="grid gap-6 lg:grid-cols-2">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Category breakdown — This month</CardTitle>
                </CardHeader>
                <CardContent>
                  {categoryData.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie
                            data={categoryData}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={90}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {categoryData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0]
                                return (
                                  <div className="bg-[#0b0f19] border border-slate-700/90 px-3.5 py-2.5 rounded-xl shadow-2xl text-center pointer-events-none min-w-[120px]">
                                    <p className="text-xs font-semibold text-slate-300">
                                      {data.name || 'Expense'}
                                    </p>
                                    <p className="text-base font-black text-sky-400 mt-0.5 tabular-nums">
                                      {formatCurrency(Number(data.value) * 100, currency, locale)}
                                    </p>
                                    {data.payload?.percent && (
                                      <p className="text-[10px] font-bold text-emerald-400 mt-0.5">
                                        {data.payload.percent}% of total
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
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {categoryData.map((item, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: item.color || COLORS[i] }} />
                            <span className="text-muted-foreground truncate">{item.name}</span>
                            <span className="ml-auto font-medium tabular-nums">{item.percent}%</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="py-12 text-center text-sm text-muted-foreground">
                      No expense data for this month
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Net cash flow trend */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Net cash flow trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={monthlyData} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
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
                        formatter={(value: number) => [formatCurrency(value * 100, currency, locale)]}
                      />
                      <Line
                        type="monotone"
                        dataKey="net"
                        name="Net"
                        stroke="#6366f1"
                        strokeWidth={2.5}
                        dot={{ fill: '#6366f1', r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </>
      )}
    </div>
  )
}
