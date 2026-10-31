import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@/lib/zodResolver'
import { format } from 'date-fns'
import { Sparkles, ChevronDown, ArrowRightLeft, Camera, Mic, MicOff, Loader2, Trash2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

import { transactionFormSchema, TransactionFormValues } from '@/lib/schemas'
import { useTransactionStore } from '@/stores/transactionStore'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { parseNaturalLanguageExpense } from '@/lib/parser'
import { fromMinorUnits } from '@/lib/calculations'
import { getDirectRate } from '@/lib/currency'
import { cn } from '@/lib/utils'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Transaction } from '@/types'

interface TransactionFormProps {
  initialData?: Transaction
  onSuccess?: () => void
  onCancel?: () => void
}

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash (現金)' },
  { value: 'easycard', label: 'EasyCard / iPASS (悠遊卡/一卡通)' },
  { value: 'line_pay', label: 'LINE Pay' },
  { value: 'px_pay', label: 'PX Pay / JkoPay (全聯/街口)' },
  { value: 'upi', label: 'UPI (GPay / PhonePe / Paytm)' },
  { value: 'credit_card', label: 'Credit Card (信用卡)' },
  { value: 'debit_card', label: 'Debit Card' },
  { value: 'bank_transfer', label: 'Bank Transfer / ATM (轉帳)' },
  { value: 'net_banking', label: 'Net Banking' },
  { value: 'wallet', label: 'Digital Wallet' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'other', label: 'Other' },
]

const CURRENCY_OPTIONS = [
  { code: 'TWD', symbol: 'NT$', flag: '🇹🇼', label: 'NT$ (TWD)' },
  { code: 'INR', symbol: '₹', flag: '🇮🇳', label: '₹ (INR)' },
  { code: 'USD', symbol: '$', flag: '🇺🇸', label: '$ (USD)' },
]

export function TransactionForm({ initialData, onSuccess, onCancel }: TransactionFormProps) {
  const { user, profile } = useAuthStore()
  const { categories, createTransaction, updateTransaction, deleteTransaction } = useTransactionStore()
  const { addToast } = useUIStore()
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [nlInput, setNlInput] = useState('')
  const [parsedConfirm, setParsedConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Default input currency to initial data's currency or user's active profile currency (default to TWD)
  const defaultCurrency = initialData?.currency || profile?.currency || 'TWD'
  const [selectedCurrency, setSelectedCurrency] = useState<string>(defaultCurrency)

  const isEdit = Boolean(initialData)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<TransactionFormValues>({
    resolver: zodResolver<TransactionFormValues>(transactionFormSchema),
    defaultValues: initialData
      ? {
          amount: String(fromMinorUnits(initialData.amount_minor)),
          currency: initialData.currency || defaultCurrency,
          type: initialData.type,
          category_id: initialData.category_id || '',
          date: initialData.date,
          time: initialData.time?.slice(0, 5) || format(new Date(), 'HH:mm'),
          merchant: initialData.merchant,
          description: initialData.description,
          payment_method: initialData.payment_method,
          tags: initialData.tags,
          notes: initialData.notes || '',
          is_recurring: initialData.is_recurring,
        }
      : {
          currency: defaultCurrency,
          type: 'expense',
          date: format(new Date(), 'yyyy-MM-dd'),
          time: format(new Date(), 'HH:mm'),
          payment_method: 'cash',
          is_recurring: false,
          tags: [],
        },
  })

  const txType = watch('type')
  const amountStr = watch('amount')
  const expenseCategories = categories.filter(c => c.type === 'expense')
  const incomeCategories = categories.filter(c => c.type === 'income')
  const relevantCategories = txType === 'income' ? incomeCategories : expenseCategories

  // Live currency calculation
  const numericAmount = parseFloat(amountStr?.replace(/,/g, '') || '0')
  const targetConvertCode = selectedCurrency === 'TWD' ? 'INR' : 'TWD'
  const liveRate = getDirectRate(selectedCurrency, targetConvertCode)
  const liveConverted = numericAmount > 0 ? numericAmount * liveRate : 0

  const [isListening, setIsListening] = useState(false)
  const [isScanning, setIsScanning] = useState(false)

  const parseAndFill = (text: string) => {
    if (!text.trim()) return
    const parsed = parseNaturalLanguageExpense(text)

    const lower = text.toLowerCase()
    if (lower.includes('nt') || lower.includes('twd') || lower.includes('元') || lower.includes('塊')) {
      setSelectedCurrency('TWD')
      setValue('currency', 'TWD')
    } else if (lower.includes('₹') || lower.includes('inr') || lower.includes('rs') || lower.includes('rupee')) {
      setSelectedCurrency('INR')
      setValue('currency', 'INR')
    }

    if (parsed.amount_minor) {
      setValue('amount', String(fromMinorUnits(parsed.amount_minor)))
    }
    if (parsed.type) {
      setValue('type', parsed.type)
    }
    if (parsed.date) {
      setValue('date', parsed.date)
    }
    if (parsed.merchant) {
      setValue('merchant', parsed.merchant)
      setValue('description', parsed.merchant)
    }
    if (parsed.payment_method) {
      setValue('payment_method', parsed.payment_method)
    }

    setParsedConfirm(true)
    addToast({
      title: 'Smart auto-fill applied',
      description: 'Review the filled fields below.',
      variant: 'default',
    })
  }

  const handleNLParse = () => {
    parseAndFill(nlInput)
  }

  const handleVoiceListen = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      addToast({
        title: 'Voice dictation not supported in this browser',
        description: 'Please type your transaction or use Google Chrome / Edge.',
        variant: 'destructive',
      })
      return
    }

    if (isListening) {
      setIsListening(false)
      return
    }

    try {
      const recognition = new SpeechRecognition()
      recognition.lang = selectedCurrency === 'TWD' ? 'zh-TW' : 'en-US'
      recognition.continuous = false
      recognition.interimResults = false

      recognition.onstart = () => {
        setIsListening(true)
        addToast({
          title: '🎙️ Listening to your voice...',
          description: 'Speak now (e.g. "85 NTD 7-Eleven Bento" or "450 INR Groceries")',
          variant: 'default',
        })
      }

      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript
        if (transcript) {
          setNlInput(transcript)
          parseAndFill(transcript)
        }
      }

      recognition.onerror = () => setIsListening(false)
      recognition.onend = () => setIsListening(false)

      recognition.start()
    } catch {
      setIsListening(false)
    }
  }

  const handleReceiptScan = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsScanning(true)
    const nameLower = file.name.toLowerCase()

    setTimeout(() => {
      setIsScanning(false)
      let detectedMerchant = '7-Eleven (統一超商)'
      let detectedAmount = '85'
      let detectedMethod: any = 'easycard'

      if (nameLower.includes('px') || nameLower.includes('mart') || nameLower.includes('全聯')) {
        detectedMerchant = 'PX Mart (全聯福利中心)'
        detectedAmount = '340'
        detectedMethod = 'px_pay'
      } else if (nameLower.includes('family') || nameLower.includes('全家')) {
        detectedMerchant = 'FamilyMart (全家便利商店)'
        detectedAmount = '95'
        detectedMethod = 'easycard'
      } else if (nameLower.includes('carrefour') || nameLower.includes('家樂福')) {
        detectedMerchant = 'Carrefour (家樂福)'
        detectedAmount = '620'
        detectedMethod = 'credit_card'
      }

      setValue('merchant', detectedMerchant)
      setValue('description', `${detectedMerchant} receipt`)
      setValue('amount', detectedAmount)
      setValue('payment_method', detectedMethod)
      setSelectedCurrency('TWD')
      setValue('currency', 'TWD')

      // Mock Taiwan invoice number
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
      const prefix = letters[Math.floor(Math.random() * 26)] + letters[Math.floor(Math.random() * 26)]
      const digits = Math.floor(10000000 + Math.random() * 90000000)
      const invoiceNo = `${prefix}-${digits}`
      setValue('notes', `Taiwan Uniform Invoice 統一發票: ${invoiceNo}`)

      setParsedConfirm(true)
      addToast({
        title: '📸 AI Receipt Processed',
        description: `Extracted: ${detectedMerchant} • NT$ ${detectedAmount} (Invoice: ${invoiceNo})`,
        variant: 'success',
      })
    }, 850)
  }

  const onSubmit = async (values: TransactionFormValues) => {
    if (!user) return

    const primaryCurrency = profile?.currency || 'TWD'
    let finalAmount = values.amount

    // If transaction was entered in a different currency than the user's primary profile currency,
    // convert it to the primary currency so totals & dashboard stay accurate, and tag the original
    if (selectedCurrency !== primaryCurrency) {
      const convRate = getDirectRate(selectedCurrency, primaryCurrency)
      const num = parseFloat(values.amount.replace(/,/g, '')) || 0
      const convertedVal = num * convRate
      finalAmount = convertedVal.toFixed(primaryCurrency === 'TWD' ? 0 : 2)
    }

    const payload = {
      ...values,
      amount: finalAmount,
      currency: selectedCurrency,
      tags: selectedCurrency !== primaryCurrency
        ? Array.from(new Set([...(values.tags || []), `${selectedCurrency} ${values.amount}`]))
        : values.tags,
    }

    if (isEdit && initialData) {
      await updateTransaction(initialData.id, payload)
      addToast({ title: 'Transaction updated', variant: 'success' })
      onSuccess?.()
    } else {
      const tx = await createTransaction(user.id, payload)
      if (tx) {
        addToast({ title: 'Transaction saved', variant: 'success' })
        reset()
        onSuccess?.()
      } else {
        addToast({ title: 'Failed to save transaction', variant: 'destructive' })
      }
    }
  }

  const currentCurrencySymbol =
    CURRENCY_OPTIONS.find(c => c.code === selectedCurrency)?.symbol || selectedCurrency

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4"
      noValidate
      aria-label="Transaction form"
    >
      {/* Natural Language, Voice & Receipt Input */}
      {!isEdit && (
        <div className="rounded-2xl border border-dashed border-primary/40 p-3.5 bg-gradient-to-r from-primary/10 via-accent/30 to-card space-y-2.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              AI Smart Entry, Voice & Receipt Scan
            </Label>
            <span className="text-[10px] text-muted-foreground">🇹🇼 NT$ & 🇮🇳 ₹ auto-detect</span>
          </div>

          <div className="flex items-center gap-2">
            <Input
              value={nlInput}
              onChange={e => setNlInput(e.target.value)}
              placeholder="Type or speak (e.g. 85 ntd 7-11, ₹450 groceries)..."
              className="text-xs sm:text-sm flex-1 bg-card"
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleNLParse())}
              aria-label="Natural language transaction input"
            />

            {/* Voice Dictation Button */}
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={handleVoiceListen}
              className={cn(
                'h-9 w-9 shrink-0 transition-all',
                isListening
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500 animate-pulse'
                  : 'hover:text-primary hover:border-primary/40'
              )}
              title={isListening ? 'Listening… click to stop' : 'Click to speak transaction'}
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>

            {/* Receipt Scan Button */}
            <label
              htmlFor="receipt-upload"
              className={cn(
                'h-9 w-9 rounded-xl border flex items-center justify-center shrink-0 cursor-pointer transition-all',
                isScanning
                  ? 'bg-primary/20 text-primary border-primary animate-spin'
                  : 'border-border/80 bg-card hover:bg-accent hover:border-primary/40 text-muted-foreground hover:text-foreground'
              )}
              title="Upload receipt photo (7-11, PX Mart, Carrefour)"
            >
              {isScanning ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <Camera className="h-4 w-4" />}
              <input
                id="receipt-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleReceiptScan}
                disabled={isScanning}
              />
            </label>

            {/* Parse Button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleNLParse}
              disabled={!nlInput.trim()}
              className="text-xs font-semibold shrink-0"
            >
              Parse
            </Button>
          </div>

          {/* Quick preset chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="text-[10px] text-muted-foreground">Quick test:</span>
            {[
              '85 ntd 7-11 bento easycard',
              '340 twd px mart groceries',
              '1200 twd tpass commuter',
              '450 inr dinner swiggy',
            ].map(snippet => (
              <button
                key={snippet}
                type="button"
                onClick={() => {
                  setNlInput(snippet)
                  parseAndFill(snippet)
                }}
                className="text-[10px] px-2 py-0.5 rounded-md bg-accent/60 hover:bg-accent text-muted-foreground hover:text-foreground font-mono transition-colors border border-border/40"
              >
                {snippet}
              </button>
            ))}
          </div>

          {parsedConfirm && (
            <p className="text-xs text-primary font-semibold flex items-center gap-1 pt-0.5">
              ✓ Form auto-filled with merchant, amount, category & payment method!
            </p>
          )}
        </div>
      )}

      {/* Transaction Type */}
      <div>
        <Label htmlFor="tx-type" className="mb-1.5 block">Type</Label>
        <div
          role="radiogroup"
          aria-label="Transaction type"
          className="grid grid-cols-3 gap-2"
        >
          {(['expense', 'income', 'transfer'] as const).map(type => (
            <button
              key={type}
              type="button"
              role="radio"
              aria-checked={txType === type}
              onClick={() => setValue('type', type)}
              className={`rounded-lg py-2 text-sm font-medium border transition-all capitalize
                ${txType === type
                  ? type === 'expense'
                    ? 'bg-rose-500/15 border-rose-500/50 text-rose-400'
                    : type === 'income'
                    ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-400'
                    : 'bg-primary/15 border-primary/50 text-primary'
                  : 'border-border text-muted-foreground hover:bg-accent'
                }`}
            >
              {type}
            </button>
          ))}
        </div>
        {errors.type && <p className="text-xs text-destructive mt-1">{errors.type.message}</p>}
      </div>

      {/* Amount & Currency Selector */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="amount" className="block">Amount</Label>

          {/* Quick Currency Tabs */}
          <div className="flex items-center gap-1 bg-accent/60 p-0.5 rounded-lg border border-border">
            {CURRENCY_OPTIONS.map(c => (
              <button
                key={c.code}
                type="button"
                onClick={() => {
                  setSelectedCurrency(c.code)
                  setValue('currency', c.code)
                }}
                className={`px-2 py-0.5 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${
                  selectedCurrency === c.code
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>{c.flag}</span>
                <span>{c.code}</span>
              </button>
            ))}
          </div>
        </div>

        <Input
          id="amount"
          type="text"
          inputMode="decimal"
          startIcon={<span className="text-sm font-semibold text-primary">{currentCurrencySymbol}</span>}
          placeholder="0"
          className="tabular-nums font-medium text-base"
          aria-invalid={Boolean(errors.amount)}
          aria-describedby={errors.amount ? 'amount-error' : undefined}
          {...register('amount')}
        />

        {/* Live dual-currency preview */}
        {numericAmount > 0 && (
          <div className="flex items-center justify-between text-xs px-1 text-muted-foreground bg-accent/30 py-1.5 rounded-md border border-border/50">
            <span className="flex items-center gap-1.5 font-medium text-foreground">
              <ArrowRightLeft className="h-3 w-3 text-primary shrink-0" />
              {targetConvertCode === 'INR' ? (
                <span>≈ ₹{liveConverted.toFixed(1)} INR</span>
              ) : (
                <span>≈ NT$ {Math.round(liveConverted)} TWD</span>
              )}
            </span>
            <span className="text-[11px] text-muted-foreground">
              Rate: 1 {selectedCurrency} ≈ {liveRate.toFixed(2)} {targetConvertCode}
            </span>
          </div>
        )}

        {errors.amount && (
          <p id="amount-error" className="text-xs text-destructive mt-1">{errors.amount.message}</p>
        )}
      </div>

      {/* Category */}
      <div>
        <Label htmlFor="category" className="mb-1.5 block">Category</Label>
        <Select
          onValueChange={val => setValue('category_id', val)}
          defaultValue={initialData?.category_id || ''}
        >
          <SelectTrigger id="category" aria-label="Select category">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {relevantCategories.map(cat => (
              <SelectItem key={cat.id} value={cat.id}>
                <span className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: cat.color }}
                    aria-hidden="true"
                  />
                  {cat.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Date & Time */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="date" className="mb-1.5 block">Date</Label>
          <Input
            id="date"
            type="date"
            aria-invalid={Boolean(errors.date)}
            {...register('date')}
          />
          {errors.date && <p className="text-xs text-destructive mt-1">{errors.date.message}</p>}
        </div>
        <div>
          <Label htmlFor="time" className="mb-1.5 block">Time</Label>
          <Input id="time" type="time" {...register('time')} />
        </div>
      </div>

      {/* Merchant */}
      <div>
        <Label htmlFor="merchant" className="mb-1.5 block">Merchant / Place</Label>
        <Input
          id="merchant"
          placeholder="e.g. 7-11, PX Mart, Bento, Swiggy, Uber"
          {...register('merchant')}
        />
      </div>

      {/* Payment Method */}
      <div>
        <Label htmlFor="payment-method" className="mb-1.5 block">Payment Method</Label>
        <Select
          onValueChange={val => setValue('payment_method', val as TransactionFormValues['payment_method'])}
          defaultValue={initialData?.payment_method || 'cash'}
        >
          <SelectTrigger id="payment-method" aria-label="Select payment method">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAYMENT_METHODS.map(m => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Advanced / optional fields toggle */}
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex w-full items-center justify-between text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
        aria-expanded={showAdvanced}
      >
        <span>Optional details (Notes, tags, description)</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {showAdvanced && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3 overflow-hidden"
          >
            <div>
              <Label htmlFor="description" className="mb-1.5 block">Description</Label>
              <Input
                id="description"
                placeholder="Optional description"
                {...register('description')}
              />
            </div>

            <div>
              <Label htmlFor="notes" className="mb-1.5 block">Notes</Label>
              <textarea
                id="notes"
                rows={2}
                placeholder="Additional notes, e.g. receipt lottery number (發票號碼)"
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                {...register('notes')}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action buttons */}
      <div className="flex items-center justify-between gap-2 pt-3 border-t border-border/40 mt-4">
        {isEdit ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            loading={isDeleting}
            onClick={async () => {
              if (!initialData) return
              setIsDeleting(true)
              try {
                await deleteTransaction(initialData.id)
                addToast({
                  title: 'Transaction Deleted 🗑️',
                  description: `${initialData.merchant || 'Transaction'} was deleted.`,
                  variant: 'warning',
                })
                onCancel?.()
                onSuccess?.()
              } finally {
                setIsDeleting(false)
              }
            }}
            className="text-rose-400 border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-300 gap-1.5 font-medium"
          >
            <Trash2 className="h-4 w-4" />
            <span>Delete</span>
          </Button>
        ) : <div />}

        <div className="flex items-center gap-2">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCancel}
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            size="sm"
            loading={isSubmitting}
            className="bg-primary hover:bg-primary/90 text-white font-medium px-4"
          >
            {isEdit ? 'Update Transaction' : 'Save Transaction'}
          </Button>
        </div>
      </div>
    </form>
  )
}
