import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

export default function OnboardingPage() {
  const navigate = useNavigate()
  const [familyName, setFamilyName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleCreateFamily = async () => {
    setError(null)
    const user = supabase.auth.getUser().data.user
    if (!user) {
      setError('You must be logged in')
      return
    }

    const { data, error: dbError } = await supabase
      .from('families')
      .insert({ family_name: familyName, admin_user_id: user.id })
      .select()
      .single()

    if (dbError) setError(dbError.message)
    else navigate('/dashboard')
  }

  return (
    <div className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Welcome! Set up your family</h1>
      {error && <p className="text-red-600 mb-2">{error}</p>}
      <label className="block mb-2">
        Family Name
        <input
          type="text"
          value={familyName}
          onChange={e => setFamilyName(e.target.value)}
          className="mt-1 w-full border rounded px-3 py-2"
        />
      </label>
      <button
        onClick={handleCreateFamily}
        className="mt-4 bg-blue-600 text-white px-4 py-2 rounded"
      >
        Create Family
      </button>
    </div>
  )
}