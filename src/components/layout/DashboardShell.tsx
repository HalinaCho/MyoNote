'use client'

import { Toaster } from 'react-hot-toast'
import { ChildProvider } from '@/context/ChildContext'
import Header from './Header'
import BottomNav from './BottomNav'

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <ChildProvider>
      <div className="flex justify-center min-h-screen bg-gray-100">
        <div className="relative w-full max-w-[480px] min-h-screen flex flex-col bg-gray-50">
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
        }}
      />
    </ChildProvider>
  )
}
