import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '마이오노트',
  description: '내 아이 근시 관리 — 케어 기록과 안축장 변화를 한 눈에',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="h-full">
      <body className="min-h-full bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  )
}
