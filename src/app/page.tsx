'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function RootPage() {
  const router = useRouter()
  useEffect(() => {
    createClient().auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace('/dashboard')
      } else {
        window.location.replace(`${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/login`)
      }
    })
  }, [router])
  return null
}
