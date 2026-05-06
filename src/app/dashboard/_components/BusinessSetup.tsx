'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const TONES = [
  { value: 'professional', label: 'Professional', desc: 'Polished and business-appropriate' },
  { value: 'friendly',     label: 'Friendly',     desc: 'Warm and conversational' },
  { value: 'luxury',       label: 'Luxury',       desc: 'Elegant and refined' },
  { value: 'casual',       label: 'Casual',       desc: 'Relaxed and direct' },
]

export default function BusinessSetup() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [placeId, setPlaceId] = useState('')
  const [tone, setTone] = useState('professional')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Not authenticated'); setLoading(false); return }

    const { error } = await supabase.from('businesses').insert({
      user_id: user.id,
      name: name.trim(),
      google_place_id: placeId.trim() || null,
      tone,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Set up your business</h1>
        <p className="text-gray-500 text-sm mb-8">
          We'll use this to personalize your AI review responses.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Business name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Joe's Pizza"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Google Place ID{' '}
              <span className="text-gray-400 font-normal">(optional — uses sample reviews if blank)</span>
            </label>
            <input
              type="text"
              value={placeId}
              onChange={e => setPlaceId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="ChIJ..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Reply tone</label>
            <div className="grid grid-cols-2 gap-2">
              {TONES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTone(t.value)}
                  className={`text-left border rounded-lg px-3 py-2.5 transition-colors ${
                    tone === t.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="text-sm font-medium">{t.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Saving…' : 'Continue →'}
          </button>
        </form>
      </div>
    </div>
  )
}
