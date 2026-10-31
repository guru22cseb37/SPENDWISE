import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@/lib/zodResolver'
import { motion } from 'framer-motion'
import { User, Palette, Shield, Download, Trash2, ChevronRight, Sparkles, Key } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { profileFormSchema, ProfileFormValues } from '@/lib/schemas'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { fromMinorUnits } from '@/lib/calculations'
import { getGroqApiKey, setCustomGroqApiKey } from '@/lib/groq'

const CURRENCIES = [
  { value: 'TWD', label: '🇹🇼 NT$ New Taiwan Dollar (TWD)' },
  { value: 'INR', label: '🇮🇳 ₹ Indian Rupee (INR)' },
  { value: 'USD', label: '🇺🇸 $ US Dollar (USD)' },
  { value: 'EUR', label: '🇪🇺 € Euro (EUR)' },
  { value: 'GBP', label: '🇬🇧 £ British Pound (GBP)' },
  { value: 'JPY', label: '🇯🇵 ¥ Japanese Yen (JPY)' },
]

export default function SettingsPage() {
  const { profile, updateProfile, signOut } = useAuthStore()
  const { theme, setTheme, addToast, showConfirm } = useUIStore()
  const [saveLoading, setSaveLoading] = useState(false)
  const [groqKey, setGroqKey] = useState(getGroqApiKey())

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<ProfileFormValues>({
    resolver: zodResolver<ProfileFormValues>(profileFormSchema),
    defaultValues: {
      display_name: profile?.display_name || '',
      currency: profile?.currency || 'INR',
      locale: profile?.locale || 'en-IN',
      opening_balance: String(fromMinorUnits(profile?.opening_balance_minor || 0)),
      theme: profile?.theme || 'dark',
      ai_consent: profile?.ai_consent || false,
    },
  })

  const onSubmit = async (values: ProfileFormValues) => {
    setSaveLoading(true)
    try {
      if (groqKey) {
        setCustomGroqApiKey(groqKey)
      }

      const openingBalanceParts = values.opening_balance.replace(/,/g, '').split('.')
      const openingBalanceMinor = parseInt(openingBalanceParts[0]) * 100 +
        parseInt((openingBalanceParts[1] || '').padEnd(2, '0').slice(0, 2))

      await updateProfile({
        display_name: values.display_name,
        currency: values.currency,
        locale: values.locale,
        opening_balance_minor: openingBalanceMinor,
        theme: values.theme,
        ai_consent: values.ai_consent,
      })

      setTheme(values.theme)
      addToast({ title: 'Settings saved', variant: 'success' })
    } catch (err) {
      addToast({ title: 'Failed to save settings', variant: 'destructive' })
    } finally {
      setSaveLoading(false)
    }
  }

  const handleDeleteAccount = () => {
    showConfirm({
      title: 'Delete account',
      description:
        'This will permanently delete your account and all your financial data. This action cannot be undone.',
      confirmLabel: 'Delete account',
      destructive: true,
      onConfirm: async () => {
        addToast({
          title: 'Account deletion requested',
          description: 'Please contact support to complete account deletion.',
          variant: 'warning',
        })
      },
    })
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage your account and preferences
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Profile */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                <CardTitle className="text-base">Profile</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="display_name" className="mb-1.5 block">Display Name</Label>
                <Input id="display_name" {...register('display_name')} />
                {errors.display_name && (
                  <p className="text-xs text-destructive mt-1">{errors.display_name.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="opening_balance" className="mb-1.5 block">Opening Balance</Label>
                <Input
                  id="opening_balance"
                  type="text"
                  inputMode="decimal"
                  startIcon={<span className="text-sm">₹</span>}
                  {...register('opening_balance')}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Your balance before any recorded transactions
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Preferences */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-primary" />
                <CardTitle className="text-base">Preferences</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="currency" className="mb-1.5 block">Currency</Label>
                <Select
                  onValueChange={val => setValue('currency', val)}
                  defaultValue={profile?.currency || 'INR'}
                >
                  <SelectTrigger id="currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="theme-select" className="mb-1.5 block">Theme</Label>
                <Select
                  onValueChange={val => setValue('theme', val as 'dark' | 'light' | 'system')}
                  defaultValue={profile?.theme || 'dark'}
                >
                  <SelectTrigger id="theme-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dark">Dark (Midnight Ledger)</SelectItem>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="system">System default</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Privacy */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <CardTitle className="text-base">Privacy & AI</CardTitle>
                <CardDescription className="mt-1 text-xs">
                  Control what data is shared with the AI provider
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
                  {...register('ai_consent')}
                />
                <div>
                  <p className="text-sm font-medium">Enable AI Money Coach & Taiwan Savings Strategist</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Empowers SpendWise AI to analyze your spending and provide personalized tips for saving in Taiwan, TPASS & receipt lottery advice, and TWD-INR currency remittance calculations.
                  </p>
                </div>
              </label>

              <div className="pt-2 border-t border-border space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="groq-key" className="text-xs font-medium flex items-center gap-1.5">
                    <Key className="h-3.5 w-3.5 text-primary" /> Groq API Key
                  </Label>
                  <span className="text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> Connected (Ultra-Fast 120B AI)
                  </span>
                </div>
                <Input
                  id="groq-key"
                  type="password"
                  placeholder="gsk_..."
                  value={groqKey}
                  onChange={e => setGroqKey(e.target.value)}
                  className="font-mono text-xs"
                />
                <p className="text-[11px] text-muted-foreground">
                  Using your high-speed Groq API key for instant financial advice, Taiwan cost-saving insights, and spending summaries.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Save button */}
        <Button type="submit" loading={saveLoading} className="w-full sm:w-auto">
          Save Settings
        </Button>
      </form>

      {/* Danger zone */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-base text-destructive">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Sign out</p>
                <p className="text-xs text-muted-foreground">Sign out of your account on this device</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => signOut()}>
                Sign out
              </Button>
            </div>
            <div className="border-t border-border pt-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-destructive">Delete account</p>
                <p className="text-xs text-muted-foreground">Permanently delete all your data</p>
              </div>
              <Button variant="destructive" size="sm" onClick={handleDeleteAccount} className="gap-1.5">
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
