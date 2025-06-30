import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/Button'

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const prefill = searchParams.get('email') || ''

  useEffect(() => {
    if (prefill) setEmail(prefill)
  }, [prefill])

  const handleSignIn = async () => {
    setLoading(true)
    const { error: supaError } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)

    if (supaError) setError(supaError.message)
    else navigate('/dashboard')
  }

  const handleSignUp = async () => {
    setLoading(true)
    const { error: supaError } = await supabase.auth.signUp({ email, password })
    setLoading(false)

    if (supaError) setError(supaError.message)
    else navigate('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-6 text-center">Sign In / Sign Up</h1>
        {error && <p className="text-red-600 mb-4">{error}</p>}
        <label className="block mb-4">
          <span className="text-sm font-medium text-gray-700">Email</span>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="mt-1 w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>
        <label className="block mb-6">
          <span className="text-sm font-medium text-gray-700">Password</span>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="mt-1 w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>
        <div className="flex justify-between items-center">
          <Button onClick={handleSignIn} disabled={loading}>
            {loading ? 'Working…' : 'Sign In'}
          </Button>
          <Button variant="outline" onClick={handleSignUp} disabled={loading}>
            {loading ? 'Working…' : 'Sign Up'}
          </Button>
        </div>
      </div>
    </div>
  )
}