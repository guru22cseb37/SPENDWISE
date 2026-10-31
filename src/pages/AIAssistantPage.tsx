import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bot,
  Send,
  Sparkles,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  TrendingDown,
  ArrowRightLeft,
  Receipt,
  Bus,
  ShoppingBag,
  HelpCircle,
  Zap,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useTransactionStore } from '@/stores/transactionStore'
import { buildMonthlyFinancials, buildCategoryBreakdown, formatCurrency } from '@/lib/calculations'
import { getDirectRate } from '@/lib/currency'
import {
  callGroqAPI,
  generateSpendingReport,
  getGroqApiKey,
  FinancialContext,
  TAIWAN_FINANCIAL_SYSTEM_PROMPT,
} from '@/lib/groq'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { MarkdownMessage } from '@/components/ui/MarkdownMessage'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  error?: boolean
  timestamp: string
}

const TAIWAN_PROMPT_CHIPS = [
  {
    icon: '📊',
    label: 'Spending Summary',
    query: 'Summarize my spending this month, analyze top expense categories, and give me a clear financial health grade with top 3 improvements.',
  },
  {
    icon: '🇹🇼',
    label: 'Taiwan Living Hacks',
    query: 'Give me insider practical strategies to save money living in Taiwan on food (PX Mart, bento, convenience store discount hours) and transportation.',
  },
  {
    icon: '🧾',
    label: 'Receipt Lottery (發票)',
    query: 'How does the Taiwan Uniform Invoice Lottery (統一發票) work? How can I register a mobile barcode (載具) to win cash prizes automatically?',
  },
  {
    icon: '🚇',
    label: 'TPASS & Commuting',
    query: 'Explain how TPASS 1200 commuter pass works in Taiwan and when it is cheaper than paying with regular EasyCard.',
  },
  {
    icon: '🇮🇳',
    label: 'Taiwan → India Remittance',
    query: 'How can I save money when remitting TWD (NT$) to INR (₹) in India? What are the best ways to avoid high bank wire fees?',
  },
  {
    icon: '🔮',
    label: 'Overspending Alert',
    query: 'Based on my transactions this month, which categories are at risk of overspending, and what is my projected end-of-month balance?',
  },
]

export default function AIAssistantPage() {
  const { profile, updateProfile } = useAuthStore()
  const { transactions } = useTransactionStore()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const currency = profile?.currency || 'TWD'
  const locale = profile?.locale || (currency === 'TWD' ? 'zh-TW' : 'en-IN')
  const secondaryCurrency = currency === 'TWD' ? 'INR' : 'TWD'
  const rate = getDirectRate(currency, secondaryCurrency)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, loading])

  // Ensure AI consent is enabled for frictionless experience
  useEffect(() => {
    if (profile && !profile.ai_consent) {
      updateProfile({ ai_consent: true }).catch(() => {})
    }
  }, [profile, updateProfile])

  const buildFinancialContext = (): FinancialContext => {
    const now = new Date()
    const currentMF = buildMonthlyFinancials(transactions, now.getFullYear(), now.getMonth())
    const prevMF = buildMonthlyFinancials(transactions, now.getFullYear(), now.getMonth() - 1)
    const breakdown = buildCategoryBreakdown(
      transactions.filter(tx => {
        const d = new Date(tx.date)
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
      })
    )

    const recentTx = transactions.slice(0, 10).map(t => ({
      date: t.date,
      merchant: t.merchant || t.description || 'Transaction',
      category: t.category?.name || 'Uncategorized',
      amount: formatCurrency(t.amount_minor, currency, locale),
    }))

    return {
      period: `${now.toLocaleString('en-US', { month: 'long', year: 'numeric' })}`,
      currency,
      secondaryCurrency,
      exchangeRateText: `1 ${currency} ≈ ${rate.toFixed(2)} ${secondaryCurrency}`,
      current_month_income: formatCurrency(currentMF.total_income_minor, currency, locale),
      current_month_expenses: formatCurrency(currentMF.total_expenses_minor, currency, locale),
      current_month_net: formatCurrency(currentMF.net_minor, currency, locale),
      savings_rate: currentMF.savings_rate_pct ? `${currentMF.savings_rate_pct.toFixed(1)}%` : 'N/A',
      previous_month_expenses: formatCurrency(prevMF.total_expenses_minor, currency, locale),
      transaction_count: transactions.length,
      top_categories: breakdown.slice(0, 6).map(b => ({
        name: b.category.name,
        amount: formatCurrency(b.total_minor, currency, locale),
        percent: `${b.percent_of_expenses.toFixed(1)}%`,
      })),
      recent_transactions: recentTx,
    }
  }

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const financialContext = buildFinancialContext()

      // Build conversation payload
      const conversationHistory = messages.slice(-4).map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }))

      const systemMessage = `${TAIWAN_FINANCIAL_SYSTEM_PROMPT}

CURRENT FINANCIAL CONTEXT FOR USER (${financialContext.period}):
- Primary Currency: ${financialContext.currency} (Dual: ${financialContext.exchangeRateText})
- Total Monthly Income: ${financialContext.current_month_income}
- Total Monthly Expenses: ${financialContext.current_month_expenses}
- Net Balance/Savings: ${financialContext.current_month_net} (Savings Rate: ${financialContext.savings_rate})
- Previous Month Expenses: ${financialContext.previous_month_expenses}
- Recorded Transactions Count: ${financialContext.transaction_count}
- Top Categories: ${financialContext.top_categories.map(c => `${c.name}: ${c.amount} (${c.percent})`).join(', ')}
${financialContext.recent_transactions?.length ? `- Recent Spends: ${financialContext.recent_transactions.map(t => `${t.merchant} [${t.category}] ${t.amount}`).join('; ')}` : ''}

Always incorporate dual currency references (TWD NT$ and INR ₹) when discussing amounts, and highlight Taiwan-specific savings tips where relevant.`

      const responseText = await callGroqAPI([
        { role: 'system', content: systemMessage },
        ...conversationHistory,
        { role: 'user', content: text },
      ])

      setMessages(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: responseText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ])
    } catch (err: unknown) {
      console.error('Groq AI error:', err)
      const errorMsg = err instanceof Error ? err.message : 'Unknown AI connection issue'
      setMessages(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `⚠️ Could not reach Groq AI: ${errorMsg}. Please check that your Groq API key is valid in Settings or .env file.`,
          error: true,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleInstantReport = async () => {
    if (loading) return
    const context = buildFinancialContext()
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: '⚡ Generate comprehensive spending summary and Taiwan savings analysis',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
      const report = await generateSpendingReport(context)
      setMessages(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: report,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ])
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Connection failed'
      setMessages(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `⚠️ Error generating spending report: ${errorMsg}`,
          error: true,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const clearChat = () => {
    setMessages([])
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] p-3 lg:p-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/80 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 shadow-md shadow-primary/20 text-white shrink-0">
            <Bot className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">SpendWise AI Strategist</h1>
              <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Groq 120B Connected
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Specialized in Taiwan Living, TWD (NT$) & INR (₹) Dual-Currency, and Smart Savings
            </p>
          </div>
        </div>

        {/* Quick Tools Header Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleInstantReport}
            disabled={loading}
            className="text-xs font-semibold gap-1.5 bg-card hover:bg-accent border-primary/30 text-primary"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Generate Spending Summary
          </Button>
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearChat}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
        {messages.length === 0 ? (
          <div className="space-y-5 my-auto py-4">
            {/* Welcome banner */}
            <div className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5 space-y-3">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">🇹🇼 🇮🇳</span>
                <div>
                  <h3 className="font-bold text-base text-foreground">
                    Your Taiwan & Cross-Border Money Coach is Ready
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Powered by high-speed Groq AI (Llama 3 / 120B). Ask anything about your expenses, living affordably in Taiwan, or converting between NT$ and ₹.
                  </p>
                </div>
              </div>

              {/* Financial snapshot pill */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-primary/15 text-xs">
                <div className="p-2 rounded-xl bg-card/60 border border-border/50">
                  <span className="text-muted-foreground text-[11px] block">This Month Spend</span>
                  <span className="font-bold text-foreground mt-0.5 block">
                    {formatCurrency(
                      buildMonthlyFinancials(transactions, new Date().getFullYear(), new Date().getMonth()).total_expenses_minor,
                      currency,
                      locale
                    )}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-card/60 border border-border/50">
                  <span className="text-muted-foreground text-[11px] block">Exchange Rate</span>
                  <span className="font-bold text-foreground mt-0.5 block">
                    1 {currency} ≈ {rate.toFixed(2)} {secondaryCurrency}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-card/60 border border-border/50">
                  <span className="text-muted-foreground text-[11px] block">Transactions</span>
                  <span className="font-bold text-foreground mt-0.5 block">
                    {transactions.length} recorded
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-card/60 border border-border/50">
                  <span className="text-muted-foreground text-[11px] block">Taiwan Receipts</span>
                  <span className="font-bold text-emerald-400 mt-0.5 block">
                    統一發票 Active 🧾
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Prompts Grid */}
            <div className="space-y-2.5">
              <p className="text-xs font-semibold text-muted-foreground tracking-wide uppercase px-1">
                Instant Taiwan & Savings Prompts
              </p>
              <div className="grid sm:grid-cols-2 gap-2.5">
                {TAIWAN_PROMPT_CHIPS.map((chip, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(chip.query)}
                    className="flex items-start gap-3 p-3 text-left rounded-xl border border-border/80 bg-card hover:bg-accent/60 hover:border-primary/40 transition-all text-xs group"
                  >
                    <span className="text-lg shrink-0 mt-0.5 group-hover:scale-110 transition-transform">
                      {chip.icon}
                    </span>
                    <div>
                      <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {chip.label}
                      </p>
                      <p className="text-muted-foreground line-clamp-2 mt-0.5 text-[11px]">
                        {chip.query}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map(message => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                'group relative rounded-2xl p-4 text-sm leading-relaxed transition-all',
                message.role === 'user'
                  ? 'ml-auto max-w-[85%] sm:max-w-[75%] bg-primary text-primary-foreground font-medium shadow-md'
                  : message.error
                  ? 'border border-destructive/40 bg-destructive/10 text-destructive max-w-full'
                  : 'border border-border/80 bg-card text-card-foreground shadow-xs max-w-full'
              )}
            >
              {message.role === 'assistant' && !message.error ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-border/40 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5 font-semibold text-primary">
                      <Sparkles className="h-3.5 w-3.5" /> SpendWise AI Advisor
                    </span>
                    <div className="flex items-center gap-2 opacity-70 group-hover:opacity-100 transition-opacity">
                      <span>{message.timestamp}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(message.id, message.content)}
                        className="p-1 rounded hover:bg-accent hover:text-foreground text-muted-foreground"
                        title="Copy message"
                      >
                        {copiedId === message.id ? (
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                  <MarkdownMessage content={message.content} />
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{message.content}</p>
              )}
            </motion.div>
          ))
        )}

        {loading && (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border/60 text-xs text-muted-foreground">
            <div className="flex gap-1.5">
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  className="h-2 w-2 rounded-full bg-primary"
                  animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.1, 0.8] }}
                  transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.18 }}
                />
              ))}
            </div>
            <span>Analyzing your expenses and generating tailored Taiwan financial advice…</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="pt-3 border-t border-border shrink-0 space-y-2">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask about spending, saving money in Taiwan, receipts, remittance to India…"
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
            disabled={loading}
            aria-label="Message input"
            className="flex-1 text-sm bg-card"
          />
          <Button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            size="default"
            className="gap-1.5 px-4 bg-primary hover:bg-primary/90 text-white font-semibold"
            aria-label="Send message"
          >
            <span>Send</span>
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
          <span>💡 Press Enter to send · Powered by Groq Ultra-Fast Llama/GPT</span>
          <span>Dual rates: 1 {currency} ≈ {rate.toFixed(2)} {secondaryCurrency}</span>
        </div>
      </div>
    </div>
  )
}
