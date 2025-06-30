// File: src/pages/LoginPage.tsx
import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async () => {
    setError(null)
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({ email })
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      // Magic link sent; user will arrive back to your app
      alert('Check your email for the magic link!')
    }
  }

  return (
    <div className="max-w-md mx-auto p-8 space-y-4">
      <h1 className="text-2xl font-bold">Sign In</h1>
      {error && <p className="text-red-600">{error}</p>}
      <input
        type="email"
        placeholder="Your email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        className="w-full border rounded p-2"
      />
      <button
        onClick={handleLogin}
        disabled={loading || !email}
        className="w-full bg-blue-600 text-white rounded p-2 disabled:opacity-50"
      >
        {loading ? 'Sending…' : 'Send Magic Link'}
      </button>
      <p className="text-sm text-gray-500">
        Don’t have an account? We’ll create one for you automatically.
      </p>
    </div>
  )
}