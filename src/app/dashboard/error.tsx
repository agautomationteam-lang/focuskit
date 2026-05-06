'use client'

import { useEffect } from 'react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="max-w-3xl mx-auto px-4 py-16 text-center">
      <p className="text-sm font-medium text-gray-900 mb-1">Something went wrong</p>
      <p className="text-sm text-gray-500 mb-6">The dashboard couldn't load. Your data is safe.</p>
      <button
        onClick={reset}
        className="text-sm bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
      >
        Try again
      </button>
    </div>
  )
}
