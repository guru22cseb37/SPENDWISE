import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Search, Filter, SlidersHorizontal, ArrowUpDown, Undo2, Trash2, Sparkles, Calendar, FileText, Download } from 'lucide-react'
import { format } from 'date-fns'
import { useAuthStore } from '@/stores/authStore'
import { useTransactionStore } from '@/stores/transactionStore'
import { useUIStore } from '@/stores/uiStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TransactionItem } from '@/components/transactions/TransactionItem'
import { QuickAddButton } from '@/components/transactions/QuickAddButton'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/calculations'
import { exportCSV, exportPrintablePDFReport } from '@/lib/reports'

export default function TransactionsPage() {
  const { user, profile } = useAuthStore()
  const {
    transactions,
    fetchTransactions,
    fetchCategories,
    totalCount,
    currentPage,
    loading,
    error,
    lastDeleted,
    undoDelete,
    setFilters,
    setSort,
    sort,
    clearAllData,
    loadSampleData,
  } = useTransactionStore()
  const { addToast } = useUIStore()

  const [searchValue, setSearchValue] = useState('')
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>('all')

  const availableMonths = Array.from(
    new Set(transactions.map(t => t.date.slice(0, 7)))
  ).sort().reverse()

  const displayedTransactions = transactions.filter(tx => {
    if (selectedMonthFilter !== 'all' && !tx.date.startsWith(selectedMonthFilter)) return false
    return true
  })

  const currency = profile?.currency || 'TWD'
  const locale = profile?.locale || 'zh-TW'

  const selectedMonthLabel = selectedMonthFilter === 'all'
    ? 'All Records'
    : format(new Date(`${selectedMonthFilter}-01`), 'MMMM yyyy')

  const totalExpensesMinor = displayedTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount_minor, 0)
  const totalIncomeMinor = displayedTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount_minor, 0)

  const handleExportPDF = () => {
    exportPrintablePDFReport(
      displayedTransactions,
      currency,
      totalIncomeMinor,
      totalExpensesMinor,
      `${selectedMonthLabel} Financial Statement`
    )
    addToast({
      title: 'PDF Report Ready 📄',
      description: `Opening printable statement for ${selectedMonthLabel}.`,
      variant: 'success',
    })
  }

  const handleExportCSV = () => {
    exportCSV(displayedTransactions, currency, selectedMonthLabel)
    addToast({
      title: 'CSV File Downloaded 📊',
      description: `Exported expenses for ${selectedMonthLabel}.`,
      variant: 'success',
    })
  }

  useEffect(() => {
    if (user) {
      fetchTransactions(user.id, 1)
      fetchCategories(user.id)
    }
  }, [user, fetchTransactions, fetchCategories])

  const handleSearch = (value: string) => {
    setSearchValue(value)
    setFilters({ search: value || undefined })
    if (user) fetchTransactions(user.id, 1)
  }

  const handleUndoDelete = async () => {
    await undoDelete()
    addToast({ title: 'Transaction restored', variant: 'success' })
  }

  const toggleSort = (field: 'date' | 'amount' | 'merchant') => {
    if (sort.field === field) {
      setSort({ field, direction: sort.direction === 'desc' ? 'asc' : 'desc' })
    } else {
      setSort({ field, direction: 'desc' })
    }
    if (user) fetchTransactions(user.id, currentPage)
  }

  return (
    <div className="p-4 lg:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {totalCount} total records
          </p>
        </div>
        <div className="sm:ml-auto flex flex-wrap items-center gap-2">
          {displayedTransactions.length > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPDF}
                className="text-xs gap-1.5 font-semibold border-primary/30 text-primary hover:bg-primary/10 shadow-xs"
                title={`Export ${selectedMonthLabel} as printable PDF`}
              >
                <FileText className="h-3.5 w-3.5 text-primary" />
                <span>PDF ({selectedMonthFilter === 'all' ? 'All' : format(new Date(`${selectedMonthFilter}-01`), 'MMM')})</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                className="text-xs gap-1.5 font-semibold text-muted-foreground hover:text-foreground"
                title={`Export ${selectedMonthLabel} as CSV`}
              >
                <Download className="h-3.5 w-3.5" />
                <span>CSV</span>
              </Button>
            </>
          )}

          {transactions.length > 0 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (window.confirm('Are you sure you want to delete all transactions? You can reload sample data anytime.')) {
                  clearAllData()
                  addToast({
                    title: 'All Transactions Cleared',
                    description: 'Removed all existing transactions.',
                    variant: 'warning',
                  })
                }
              }}
              className="text-xs text-rose-400 border-rose-500/25 hover:bg-rose-500/10 gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear All</span>
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                loadSampleData(user?.id)
                addToast({
                  title: 'Taiwan Sample Expenses Loaded 🇹🇼',
                  description: 'Loaded realistic New Taiwan Dollar expenses.',
                  variant: 'success',
                })
              }}
              className="text-xs text-primary border-primary/30 hover:bg-primary/10 gap-1.5"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Load Taiwan Samples</span>
            </Button>
          )}
          <QuickAddButton />
        </div>
      </div>

      {/* Undo bar */}
      {lastDeleted && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-950/40 px-4 py-3"
        >
          <p className="text-sm">
            <span className="font-medium">{lastDeleted.merchant || 'Transaction'}</span> deleted.
          </p>
          <Button variant="ghost" size="sm" onClick={handleUndoDelete} className="gap-1.5 text-amber-400 hover:text-amber-300">
            <Undo2 className="h-3.5 w-3.5" />
            Undo
          </Button>
        </motion.div>
      )}

      {/* Search and filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                value={searchValue}
                onChange={e => handleSearch(e.target.value)}
                placeholder="Search transactions…"
                startIcon={<Search className="h-4 w-4" />}
                aria-label="Search transactions"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-1.5">
                <Filter className="h-3.5 w-3.5" />
                Filter
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => toggleSort('date')}
                aria-label="Sort by date"
              >
                <ArrowUpDown className="h-3.5 w-3.5" />
                {sort.field === 'date' ? (sort.direction === 'desc' ? 'Newest' : 'Oldest') : 'Sort'}
              </Button>
            </div>
          </div>

          {/* Month-Wise Filter Pills */}
          {availableMonths.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pt-3 border-t border-border/40 mt-3 scrollbar-none">
              <span className="text-[11px] text-muted-foreground shrink-0 font-medium mr-1">Filter by Month:</span>
              <Button
                variant={selectedMonthFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedMonthFilter('all')}
                className="text-xs h-7 px-3 rounded-full shrink-0"
              >
                All Months ({transactions.length})
              </Button>
              {availableMonths.map(ym => {
                const count = transactions.filter(t => t.date.startsWith(ym)).length
                const d = new Date(`${ym}-01`)
                const label = format(d, 'MMM yyyy')
                return (
                  <Button
                    key={ym}
                    variant={selectedMonthFilter === ym ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedMonthFilter(ym)}
                    className="text-xs h-7 px-3 rounded-full gap-1.5 shrink-0"
                  >
                    <Calendar className="h-3 w-3" />
                    <span>{label}</span>
                    <span className="text-[10px] opacity-75 font-semibold">({count})</span>
                  </Button>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error state */}
      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Month Filter Active Status Banner */}
      {selectedMonthFilter !== 'all' && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-primary/10 border border-primary/25 rounded-2xl p-3.5 text-xs text-foreground">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary shrink-0">
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <p className="font-bold text-sm text-foreground">
                Filtered: {selectedMonthLabel}
              </p>
              <p className="text-muted-foreground mt-0.5">
                {displayedTransactions.length} records · Expenses: <strong className="text-rose-400">{formatCurrency(totalExpensesMinor, currency, locale)}</strong>
                {totalIncomeMinor > 0 && (
                  <> · Income: <strong className="text-emerald-400">{formatCurrency(totalIncomeMinor, currency, locale)}</strong></>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPDF}
              className="text-xs gap-1.5 font-semibold bg-background/80 border-primary/30 text-primary hover:bg-primary/20 h-7"
            >
              <FileText className="h-3 w-3" />
              <span>Download PDF</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="text-xs gap-1.5 font-semibold bg-background/80 text-foreground hover:bg-accent h-7"
            >
              <Download className="h-3 w-3" />
              <span>Download CSV</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedMonthFilter('all')}
              className="text-xs text-muted-foreground hover:text-foreground h-7"
            >
              Clear Filter
            </Button>
          </div>
        </div>
      )}

      {/* Transactions list */}
      <Card>
        <CardContent className="p-2">
          {loading ? (
            <div className="space-y-2 p-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex gap-3 p-2">
                  <div className="skeleton h-10 w-10 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-4 w-1/2 rounded" />
                    <div className="skeleton h-3 w-1/3 rounded" />
                  </div>
                  <div className="skeleton h-4 w-20 rounded" />
                </div>
              ))}
            </div>
          ) : displayedTransactions.length > 0 ? (
            <div>
              {displayedTransactions.map((tx, i) => (
                <TransactionItem key={tx.id} transaction={tx} index={i} />
              ))}
              {totalCount > transactions.length && (
                <div className="flex justify-center py-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => user && fetchTransactions(user.id, currentPage + 1)}
                  >
                    Load more
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="py-16 text-center space-y-4">
              <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                {searchValue ? 'No transactions match your search.' : 'No transactions recorded yet. Add your first expense or load realistic Taiwan sample records!'}
              </p>
              {!searchValue && (
                <div className="flex items-center justify-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      loadSampleData(user?.id)
                      addToast({
                        title: 'Taiwan Sample Expenses Loaded 🇹🇼',
                        description: 'Loaded realistic NT$ transactions.',
                        variant: 'success',
                      })
                    }}
                    className="gap-2 border-primary/30 text-primary hover:bg-primary/10 text-xs font-semibold"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Load Taiwan Sample Data
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
