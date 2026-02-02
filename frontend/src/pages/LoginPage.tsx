import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'

import { useAuth } from '../auth/AuthContext'
import { Button } from '../components/button'
import { Input } from '../components/input'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

type FormValues = z.infer<typeof schema>

export function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  })

  async function onSubmit(values: FormValues) {
    setError(null)
    try {
      await signIn(values)
      navigate('/app', { replace: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed')
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900">
      <div className="mx-auto w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Login</h1>
        <p className="mt-1 text-sm text-slate-600">Use your email and password.</p>

        <form className="mt-6 space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <Input type="email" autoComplete="email" {...form.register('email')} />
            {form.formState.errors.email?.message ? (
              <p className="text-sm text-red-600">{form.formState.errors.email.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Password</label>
            <Input type="password" autoComplete="current-password" {...form.register('password')} />
            {form.formState.errors.password?.message ? (
              <p className="text-sm text-red-600">{form.formState.errors.password.message}</p>
            ) : null}
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Logging in…' : 'Login'}
          </Button>
        </form>

        <p className="mt-4 text-sm text-slate-600">
          Don&apos;t have an account?{' '}
          <Link className="font-medium text-slate-900 underline" to="/signup">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
