import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Ticket,
  Sparkles,
  Search,
  CheckCircle2,
  Trophy,
  AlertCircle,
  Coins,
  History,
  Info,
  Gift,
  ExternalLink,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCurrency } from '@/lib/calculations'
import { convertAmount } from '@/lib/currency'
import { cn } from '@/lib/utils'

interface DrawPeriod {
  periodName: string // e.g. "113年 09-10月 (Sep - Oct)"
  drawDate: string
  specialPrize: string // 10 Million NT$
  grandPrize: string // 2 Million NT$
  firstPrizes: string[] // 200K NT$ (3 numbers)
  additionalSixth?: string[] // optional extra 6th prize
}

const DRAW_PERIODS: DrawPeriod[] = [
  {
    periodName: 'Latest: 09-10月 (Sep - Oct 2026)',
    drawDate: 'Nov 25, 2026',
    specialPrize: '28638235',
    grandPrize: '41483412',
    firstPrizes: ['16620962', '50008017', '95790456'],
  },
  {
    periodName: 'Previous: 07-08月 (Jul - Aug 2026)',
    drawDate: 'Sep 25, 2026',
    specialPrize: '38039158',
    grandPrize: '08276859',
    firstPrizes: ['32110479', '68911910', '77743993'],
  },
  {
    periodName: 'Archived: 05-06月 (May - Jun 2026)',
    drawDate: 'Jul 25, 2026',
    specialPrize: '86396830',
    grandPrize: '53267964',
    firstPrizes: ['39635796', '98978859', '00360475'],
  },
]

interface CheckResult {
  receiptNumber: string
  isWinner: boolean
  prizeName?: string
  amountNTD: number
  amountINR: number
  details: string
}

export default function TaiwanLotteryPage() {
  const [activeDrawIndex, setActiveDrawIndex] = useState(0)
  const [singleReceiptInput, setSingleReceiptInput] = useState('')
  const [fastDigitsInput, setFastDigitsInput] = useState('')
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null)
  const [recentChecked, setRecentChecked] = useState<CheckResult[]>([])

  const currentDraw = DRAW_PERIODS[activeDrawIndex]

  // Check 8-digit receipt
  const handleCheckReceipt = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const clean = singleReceiptInput.trim().replace(/[^0-9]/g, '')
    if (clean.length < 3) return

    const result = evaluateReceipt(clean, currentDraw)
    setCheckResult(result)
    setRecentChecked(prev => [result, ...prev.filter(r => r.receiptNumber !== clean).slice(0, 9)])
  }

  // Fast 3-digit check
  const handleFastCheck = (digits: string) => {
    setFastDigitsInput(digits)
    const clean = digits.trim().replace(/[^0-9]/g, '')
    if (clean.length === 3) {
      // Check if matches last 3 digits of first prizes or special
      const matchesFirst = currentDraw.firstPrizes.some(p => p.endsWith(clean))
      const matchesSpecial = currentDraw.specialPrize.endsWith(clean)
      const matchesGrand = currentDraw.grandPrize.endsWith(clean)

      if (matchesFirst || matchesSpecial || matchesGrand) {
        const inr = Math.round(convertAmount(200, 'TWD', 'INR'))
        setCheckResult({
          receiptNumber: `***${clean}`,
          isWinner: true,
          prizeName: matchesFirst ? 'Sixth Prize (六獎) or Higher!' : 'Potential Jackpot Match!',
          amountNTD: 200,
          amountINR: inr,
          details: `🎉 Last 3 digits "${clean}" match a winning set! Check the full 8 digits to see if you won up to NT$ 10,000,000!`,
        })
      } else {
        setCheckResult({
          receiptNumber: `***${clean}`,
          isWinner: false,
          amountNTD: 0,
          amountINR: 0,
          details: `No match for last 3 digits "${clean}" in ${currentDraw.periodName}. Keep scanning your Taiwan receipts!`,
        })
      }
    }
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-primary/10 text-primary border border-primary/20 text-lg">
              🧾
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Taiwan Uniform Invoice Lottery (統一發票對獎機)
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Every Taiwan 7-Eleven, FamilyMart, and PX Mart receipt is an official national lottery ticket with top prizes up to NT$ 10,000,000!
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            Top Prize: NT$ 10,000,000 (≈ ₹2.65 Crore)
          </span>
        </div>
      </div>

      {/* Main Checker and Draw Numbers layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive Checkers (7 Cols) */}
        <div className="lg:col-span-7 space-y-5">
          <Card className="border-border/80 shadow-md">
            <CardHeader className="pb-3 border-b border-border/40 bg-accent/20">
              <CardTitle className="text-base flex items-center gap-2">
                <Search className="h-4 w-4 text-primary" />
                Instant Receipt Lottery Checker
              </CardTitle>
              <CardDescription>
                Check your 8-digit receipt number or fast-check the last 3 digits.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5 pt-4">
              {/* Period Selector Tabs */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Select Draw Period:</Label>
                <div className="flex flex-wrap gap-2">
                  {DRAW_PERIODS.map((draw, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setActiveDrawIndex(idx)
                        setCheckResult(null)
                      }}
                      className={cn(
                        'px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all',
                        activeDrawIndex === idx
                          ? 'border-primary bg-primary/10 text-primary shadow-xs'
                          : 'border-border/70 bg-card hover:bg-accent text-muted-foreground'
                      )}
                    >
                      {draw.periodName}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fast 3-Digit Checker */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                    <Sparkles className="h-4 w-4 text-primary" />
                    ⚡ Fast 3-Digit Quick Scanner (快速對後三碼)
                  </div>
                  <span className="text-[10px] text-muted-foreground">Most common prize: NT$ 200</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Look at the last 3 digits printed on your Taiwan receipt and enter them here for instant evaluation:
                </p>
                <div className="flex gap-2 max-w-sm">
                  <Input
                    maxLength={3}
                    placeholder="e.g. 962, 017, 456"
                    value={fastDigitsInput}
                    onChange={e => handleFastCheck(e.target.value)}
                    className="font-mono text-center tracking-widest text-lg font-bold bg-card"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setFastDigitsInput('')
                      setCheckResult(null)
                    }}
                    className="text-xs"
                  >
                    Clear
                  </Button>
                </div>
              </div>

              {/* Full 8-Digit Input Form */}
              <form onSubmit={handleCheckReceipt} className="space-y-3">
                <Label htmlFor="receipt-input" className="text-xs font-semibold">
                  Or Enter Full 8-Digit Invoice Number (完整發票號碼):
                </Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-muted-foreground">
                      No.
                    </span>
                    <Input
                      id="receipt-input"
                      maxLength={10}
                      placeholder="e.g. 16620962 or AB-16620962"
                      value={singleReceiptInput}
                      onChange={e => setSingleReceiptInput(e.target.value)}
                      className="pl-10 font-mono text-base font-bold"
                    />
                  </div>
                  <Button type="submit" className="gap-1.5 font-bold">
                    <CheckCircle2 className="h-4 w-4" />
                    Verify
                  </Button>
                </div>
              </form>

              {/* Result Animation Callout */}
              <AnimatePresence>
                {checkResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className={cn(
                      'p-4 rounded-2xl border shadow-sm space-y-2',
                      checkResult.isWinner
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                        : 'border-border/80 bg-accent/30 text-foreground'
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {checkResult.isWinner ? (
                          <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 text-lg">
                            🎉
                          </div>
                        ) : (
                          <div className="p-2 rounded-xl bg-muted text-muted-foreground text-lg">
                            🧾
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-sm">
                            {checkResult.isWinner ? checkResult.prizeName : 'Better Luck Next Time!'}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono">
                            Ticket: {checkResult.receiptNumber}
                          </p>
                        </div>
                      </div>

                      {checkResult.isWinner && (
                        <div className="text-right">
                          <p className="text-xl font-black text-emerald-400 tabular-nums">
                            +NT$ {checkResult.amountNTD.toLocaleString()}
                          </p>
                          <p className="text-xs font-semibold text-sky-400">
                            ≈ ₹ {checkResult.amountINR.toLocaleString()} INR
                          </p>
                        </div>
                      )}
                    </div>

                    <p className="text-xs leading-relaxed opacity-90">{checkResult.details}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>

          {/* Winning Odds & Taiwan Rules Card */}
          <Card className="border-border/70">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Info className="h-4 w-4 text-primary" />
                How Taiwan Uniform Invoice Lottery Works (統一發票規則)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-muted-foreground">
              <p>
                • <strong>Draw Schedule</strong>: Drawn every 2 months on the <strong>25th of odd months</strong> (Jan, Mar, May, Jul, Sep, Nov) by the Ministry of Finance.
              </p>
              <p>
                • <strong>Where to Claim</strong>: Winning receipts of NT$ 200 or NT$ 1,000 can be redeemed directly at any 7-Eleven, FamilyMart, or PX Mart in cash or store credit! Higher prizes are collected at First Commercial Bank, Chang Hwa Bank, or Agricultural Bank of Taiwan.
              </p>
              <p>
                • <strong>Mobile Barcode (載具)</strong>: Registering your Taiwan phone barcode automatically deposits all winning receipts into your Taiwan bank account and enters you into the <strong>雲端發票專屬獎</strong> (NT$500M prize pool)!
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Official Winning Numbers Board (5 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          <Card className="border-border/80 shadow-md overflow-hidden">
            <CardHeader className="pb-3 border-b border-border/40 bg-gradient-to-r from-primary/10 via-accent/30 to-card">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-amber-400" />
                    Official Winning Numbers Board
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {currentDraw.periodName} • Drawn on {currentDraw.drawDate}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 pt-4">
              {/* Special Prize (10M NT$) */}
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/25 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                    🏆 特別獎 Special Prize (All 8 Digits)
                  </span>
                  <span className="text-xs font-black text-rose-400">NT$ 10,000,000</span>
                </div>
                <div className="text-center py-1">
                  <span className="font-mono text-2xl sm:text-3xl font-black tracking-widest text-foreground">
                    {currentDraw.specialPrize}
                  </span>
                </div>
                <p className="text-[11px] text-center text-muted-foreground">
                  ≈ ₹ 26,500,000 (2.65 Crore INR)
                </p>
              </div>

              {/* Grand Prize (2M NT$) */}
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    ⭐ 特獎 Grand Prize (All 8 Digits)
                  </span>
                  <span className="text-xs font-black text-amber-400">NT$ 2,000,000</span>
                </div>
                <div className="text-center py-1">
                  <span className="font-mono text-2xl font-black tracking-widest text-foreground">
                    {currentDraw.grandPrize}
                  </span>
                </div>
                <p className="text-[11px] text-center text-muted-foreground">
                  ≈ ₹ 5,300,000 (53 Lakhs INR)
                </p>
              </div>

              {/* First Prizes (200K NT$) & Lower Tiers */}
              <div className="p-3.5 rounded-2xl bg-card border border-border/80 space-y-2.5">
                <div className="flex items-center justify-between border-b border-border/40 pb-2">
                  <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                    🎯 頭獎 First Prize (3 Sets of 8 Digits)
                  </span>
                  <span className="text-xs font-bold text-primary">NT$ 200,000</span>
                </div>

                <div className="space-y-1.5">
                  {currentDraw.firstPrizes.map((num, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2 rounded-xl bg-accent/40 font-mono"
                    >
                      <span className="text-xs text-muted-foreground">Set #{i + 1}</span>
                      <span className="text-lg font-black tracking-widest text-foreground">
                        {num.slice(0, 5)}
                        <strong className="text-primary font-black underline">{num.slice(5)}</strong>
                      </span>
                    </div>
                  ))}
                </div>

                {/* Subordinate prize breakdown */}
                <div className="pt-2 border-t border-border/40 space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Match last 7 digits (二獎):</span>
                    <span className="font-bold text-foreground">NT$ 40,000</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Match last 6 digits (三獎):</span>
                    <span className="font-bold text-foreground">NT$ 10,000</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Match last 5 digits (四獎):</span>
                    <span className="font-bold text-foreground">NT$ 4,000</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Match last 4 digits (五獎):</span>
                    <span className="font-bold text-foreground">NT$ 1,000</span>
                  </div>
                  <div className="flex justify-between font-semibold text-emerald-400">
                    <span>Match last 3 digits (六獎):</span>
                    <span>NT$ 200 (≈ ₹530)</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function evaluateReceipt(receipt: string, draw: DrawPeriod): CheckResult {
  const inrRate = 2.65

  // 1. Check Special Prize (10 Million)
  if (receipt === draw.specialPrize) {
    return {
      receiptNumber: receipt,
      isWinner: true,
      prizeName: '🏆 特別獎 SPECIAL PRIZE WINNER!',
      amountNTD: 10000000,
      amountINR: Math.round(10000000 * inrRate),
      details: 'CONGRATULATIONS! You matched the 10 Million NT$ jackpot! Redeem at designated Taiwan financial institutions with your passport/ARC.',
    }
  }

  // 2. Check Grand Prize (2 Million)
  if (receipt === draw.grandPrize) {
    return {
      receiptNumber: receipt,
      isWinner: true,
      prizeName: '⭐ 特獎 GRAND PRIZE WINNER!',
      amountNTD: 2000000,
      amountINR: Math.round(2000000 * inrRate),
      details: 'INCREDIBLE! You won the 2 Million NT$ Grand Prize! Redeem with your receipt and ID in Taiwan.',
    }
  }

  // 3. Check First Prizes & Subordinate prizes (8 down to 3 digits)
  for (const fp of draw.firstPrizes) {
    if (receipt === fp) {
      return {
        receiptNumber: receipt,
        isWinner: true,
        prizeName: '🎯 頭獎 First Prize Winner!',
        amountNTD: 200000,
        amountINR: Math.round(200000 * inrRate),
        details: 'You matched all 8 digits of the First Prize! You won NT$ 200,000 (≈ ₹530,000 INR).',
      }
    }
    if (receipt.endsWith(fp.slice(1))) {
      return {
        receiptNumber: receipt,
        isWinner: true,
        prizeName: '🥈 二獎 Second Prize Winner (Last 7 Digits)',
        amountNTD: 40000,
        amountINR: Math.round(40000 * inrRate),
        details: 'You matched the last 7 digits! You won NT$ 40,000 (≈ ₹106,000 INR).',
      }
    }
    if (receipt.endsWith(fp.slice(2))) {
      return {
        receiptNumber: receipt,
        isWinner: true,
        prizeName: '🥉 三獎 Third Prize Winner (Last 6 Digits)',
        amountNTD: 10000,
        amountINR: Math.round(10000 * inrRate),
        details: 'You matched the last 6 digits! You won NT$ 10,000 (≈ ₹26,500 INR).',
      }
    }
    if (receipt.endsWith(fp.slice(3))) {
      return {
        receiptNumber: receipt,
        isWinner: true,
        prizeName: '🎖️ 四獎 Fourth Prize Winner (Last 5 Digits)',
        amountNTD: 4000,
        amountINR: Math.round(4000 * inrRate),
        details: 'You matched the last 5 digits! You won NT$ 4,000 (≈ ₹10,600 INR).',
      }
    }
    if (receipt.endsWith(fp.slice(4))) {
      return {
        receiptNumber: receipt,
        isWinner: true,
        prizeName: '💰 五獎 Fifth Prize Winner (Last 4 Digits)',
        amountNTD: 1000,
        amountINR: Math.round(1000 * inrRate),
        details: 'You matched the last 4 digits! You won NT$ 1,000 (≈ ₹2,650 INR). Redeemable at convenience stores.',
      }
    }
    if (receipt.endsWith(fp.slice(5))) {
      return {
        receiptNumber: receipt,
        isWinner: true,
        prizeName: '🎉 六獎 Sixth Prize Winner (Last 3 Digits)',
        amountNTD: 200,
        amountINR: Math.round(200 * inrRate),
        details: 'You matched the last 3 digits! You won NT$ 200 (≈ ₹530 INR). Redeemable at any 7-Eleven, FamilyMart, or PX Mart.',
      }
    }
  }

  return {
    receiptNumber: receipt,
    isWinner: false,
    amountNTD: 0,
    amountINR: 0,
    details: `No match found in ${draw.periodName}. Scan your other receipts!`,
  }
}
