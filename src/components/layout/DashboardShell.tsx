'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Toaster } from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { ChildProvider } from '@/context/ChildContext'
import Header from './Header'
import BottomNav from './BottomNav'

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    createClient().auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        window.location.replace(`${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/login`)
      }
      else setAuthed(true)
    })
  }, [router])

  if (!authed) return null

  return (
    <ChildProvider>
      <div className="flex justify-center min-h-screen bg-[#d9efed]">
        <div className="relative w-full max-w-[480px] min-h-screen flex flex-col bg-[#edf7f6]">
          <Header />
          <main className="flex-1 overflow-y-auto pb-20 px-4 py-3">
            {children}
          </main>
          <BottomNav />
        </div>
      </div>
      <Toaster
        position="bottom-center"
        toastOptions={{
          style: { maxWidth: 360, fontSize: 14 },
          duration: 2200,
          success: {
            iconTheme: { primary: '#14b8a6', secondary: '#fff' },
          },
        }}
      />
    </ChildProvider>
  )
}
