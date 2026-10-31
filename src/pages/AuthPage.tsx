import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { ArrowRight, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { signInSchema, signUpSchema } from '@/lib/schemas'
import { useAuthStore } from '@/stores/authStore'

export default function AuthPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const user = useAuthStore(state => state.user)
  const isSignUp = location.pathname.includes('signup') || location.pathname.includes('sign-up')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true })
  }, [user, navigate])

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setMessage('')
    const parsed = isSignUp
      ? signUpSchema.safeParse({ email, password, display_name: displayName, confirm_password: confirmPassword })
      : signInSchema.safeParse({ email, password })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || 'Please check your details.')
      return
    }
    if (!isSupabaseConfigured) {
      setError('Authentication is unavailable until you add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.')
      return
    }

    setBusy(true)
    try {
      if (isSignUp) {
        const result = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName } },
        })
        if (result.error) throw result.error
        setMessage(result.data.session
          ? 'Your account is ready. You can continue to your dashboard.'
          : 'Account created. Check your email to confirm your address, then sign in.')
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
        if (authError) throw authError
        navigate('/dashboard', { replace: true })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not authenticate. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="min-h-screen grid lg:grid-cols-2 bg-background">
      <section className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-indigo-950 via-slate-950 to-background">
        <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary"><TrendingUp className="h-5 w-5 text-white" /></span><span className="text-xl font-bold">SpendWise <span className="text-primary">AI</span></span></div>
        <div className="max-w-lg"><p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Know your money. Own your future.</p><h1 className="mt-5 text-5xl font-bold leading-tight">A clearer picture of every rupee.</h1><p className="mt-5 text-lg text-muted-foreground">Track spending, build healthy habits, and make your next financial decision with confidence.</p></div>
        <p className="text-sm text-muted-foreground">Your finances, organized in one place.</p>
      </section>
      <section className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md border-border/70 shadow-xl">
          <CardHeader className="space-y-2">
            <div className="mb-3 flex items-center gap-2 lg:hidden"><TrendingUp className="h-6 w-6 text-primary" /><span className="font-bold">SpendWise AI</span></div>
            <CardTitle className="text-2xl">{isSignUp ? 'Create your account' : 'Welcome back'}</CardTitle>
            <CardDescription>{isSignUp ? 'Start organizing your finances today.' : 'Sign in to continue to your dashboard.'}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              {isSignUp && <div className="space-y-2"><Label htmlFor="display-name">Your name</Label><Input id="display-name" autoComplete="name" value={displayName} onChange={e => setDisplayName(e.target.value)} required /></div>}
              <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required /></div>
              <div className="space-y-2"><Label htmlFor="password">Password</Label><Input id="password" type="password" autoComplete={isSignUp ? 'new-password' : 'current-password'} value={password} onChange={e => setPassword(e.target.value)} required /></div>
              {isSignUp && <div className="space-y-2"><Label htmlFor="confirm-password">Confirm password</Label><Input id="confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required /></div>}
              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              {message && <p role="status" className="text-sm text-emerald-500">{message}</p>}
              <Button type="submit" className="w-full gap-2" loading={busy}>{isSignUp ? 'Create account' : 'Sign in'}<ArrowRight className="h-4 w-4" /></Button>
            </form>
            <p className="mt-6 text-center text-sm text-muted-foreground">{isSignUp ? 'Already have an account?' : 'New to SpendWise?'}{' '}<Link className="font-medium text-primary hover:underline" to={isSignUp ? '/auth/login' : '/auth/signup'}>{isSignUp ? 'Sign in' : 'Create an account'}</Link></p>
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
