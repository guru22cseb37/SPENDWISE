import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRightLeft, RefreshCw, Check, Sparkles } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { getDirectRate, getExchangeRates, saveExchangeRates } from '@/lib/currency'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function CurrencyHeaderToggle() {
  const { profile, updateProfile } = useAuthStore()
  const { addToast } = useUIStore()
  const [openModal, setOpenModal] = useState(false)

  // Current primary currency
  const currentCurrency = profile?.currency || 'TWD'
  const isTWD = currentCurrency === 'TWD'

  // Calculator states
  const [calcTwd, setCalcTwd] = useState('1000')
  const [calcInr, setCalcInr] = useState('2650')
  const [customRate, setCustomRate] = useState(getDirectRate('TWD', 'INR').toFixed(2))

  const twdToInrRate = getDirectRate('TWD', 'INR')

  const toggleCurrency = async () => {
    const nextCurrency = isTWD ? 'INR' : 'TWD'
    const nextLocale = nextCurrency === 'TWD' ? 'zh-TW' : 'en-IN'

    await updateProfile({
      currency: nextCurrency,
      locale: nextLocale,
    })

    addToast({
      title: `Switched currency to ${nextCurrency === 'TWD' ? '🇹🇼 New Taiwan Dollar (NT$)' : '🇮🇳 Indian Rupee (₹)'}`,
      description: 'All dashboards, budgets, and transactions are now presented in this currency.',
      variant: 'success',
      duration: 3000,
    })
  }

  const handleTwdChange = (val: string) => {
    setCalcTwd(val)
    const num = parseFloat(val) || 0
    const rate = parseFloat(customRate) || twdToInrRate
    setCalcInr((num * rate).toFixed(0))
  }

  const handleInrChange = (val: string) => {
    setCalcInr(val)
    const num = parseFloat(val) || 0
    const rate = parseFloat(customRate) || twdToInrRate
    if (rate > 0) {
      setCalcTwd((num / rate).toFixed(0))
    }
  }

  const handleRateUpdate = (newRateStr: string) => {
    setCustomRate(newRateStr)
    const newRate = parseFloat(newRateStr)
    if (newRate > 0) {
      // 1 TWD = newRate INR
      // In base rates (USD), let's keep USD=32.5 TWD => INR = 32.5 * newRate
      const currentRates = getExchangeRates()
      const twdRate = currentRates['TWD'] || 32.5
      const newInrRate = twdRate * newRate
      saveExchangeRates({
        ...currentRates,
        INR: newInrRate,
      })
      const numTwd = parseFloat(calcTwd) || 0
      setCalcInr((numTwd * newRate).toFixed(0))
    }
  }

  return (
    <>
      <div className="flex items-center gap-1.5">
        {/* Quick Toggle Button */}
        <button
          type="button"
          onClick={toggleCurrency}
          title={`Click to switch primary currency to ${isTWD ? 'INR (₹)' : 'TWD (NT$)'}`}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-card hover:bg-accent border border-border/80 shadow-xs transition-all active:scale-95 text-foreground"
        >
          {isTWD ? (
            <>
              <span className="text-sm">🇹🇼</span>
              <span className="text-primary font-bold">NT$ TWD</span>
            </>
          ) : (
            <>
              <span className="text-sm">🇮🇳</span>
              <span className="text-emerald-400 font-bold">₹ INR</span>
            </>
          )}
          <ArrowRightLeft className="h-3 w-3 text-muted-foreground ml-0.5" />
        </button>

        {/* Live rate ticker & Quick Calculator trigger */}
        <button
          type="button"
          onClick={() => setOpenModal(true)}
          className="hidden md:flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground bg-accent/40 hover:bg-accent/70 rounded-md border border-border/40 transition-colors"
          title="Open Taiwan ↔ India live currency calculator"
        >
          <span>1 NT$ ≈ ₹{twdToInrRate.toFixed(2)}</span>
          <span className="text-primary text-[10px]">🔄 Calc</span>
        </button>
      </div>

      {/* Currency Converter Modal */}
      <AnimatePresence>
        {openModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-card border border-border w-full max-w-md rounded-2xl p-5 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary text-base">
                    💱
                  </span>
                  <div>
                    <h3 className="font-semibold text-sm">Taiwan ↔ India Converter</h3>
                    <p className="text-xs text-muted-foreground">Live TWD (NT$) & INR (₹) exchange rate</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpenModal(false)}
                  className="text-muted-foreground hover:text-foreground text-sm p-1 rounded-md"
                >
                  ✕
                </button>
              </div>

              {/* Converter inputs */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                    <span>🇹🇼 New Taiwan Dollar (NTD / TWD)</span>
                    <span className="text-[11px] text-primary">Taiwan Amount</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-semibold text-muted-foreground">NT$</span>
                    <Input
                      type="number"
                      value={calcTwd}
                      onChange={e => handleTwdChange(e.target.value)}
                      className="pl-11 text-base font-semibold tabular-nums"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="flex justify-center -my-1">
                  <div className="bg-accent p-1.5 rounded-full border border-border text-muted-foreground">
                    <ArrowRightLeft className="h-4 w-4" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                    <span>🇮🇳 Indian Rupee (INR / ₹)</span>
                    <span className="text-[11px] text-emerald-400">India Amount</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-semibold text-muted-foreground">₹</span>
                    <Input
                      type="number"
                      value={calcInr}
                      onChange={e => handleInrChange(e.target.value)}
                      className="pl-8 text-base font-semibold tabular-nums"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              {/* Exchange rate controls */}
              <div className="p-3 rounded-xl bg-accent/40 border border-border/60 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Exchange Rate:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-foreground">1 NT$ =</span>
                    <input
                      type="number"
                      step="0.01"
                      value={customRate}
                      onChange={e => handleRateUpdate(e.target.value)}
                      className="w-16 px-1.5 py-0.5 text-xs font-bold bg-background border border-border rounded text-center"
                    />
                    <span className="font-semibold text-foreground">INR</span>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
                  💡 <strong>Taiwan Expat Tip:</strong> When sending money from Taiwan to India, consider non-bank remittance services (e.g. Index or Western Union) to save on telegraphic fees.
                </p>
              </div>

              <div className="flex items-center justify-between pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleCurrency}
                  className="text-xs gap-1.5"
                >
                  Set {isTWD ? '₹ INR' : 'NT$ TWD'} as App Default
                </Button>
                <Button
                  size="sm"
                  onClick={() => setOpenModal(false)}
                  className="text-xs"
                >
                  Done
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
