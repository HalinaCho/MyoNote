'use client'

import { useEffect } from 'react'

export default function SwRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/MyoNote/sw.js', { scope: '/MyoNote/' }).catch(() => {})
    }
  }, [])

  return null
}
