'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function MobileRedirect() {
  const router = useRouter()
  useEffect(() => {
    if (window.matchMedia('(max-width: 639px)').matches) {
      router.replace('/dashboard')
    }
  }, [router])
  return null
}
