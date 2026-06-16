import type { Metadata, Viewport } from 'next'
import { config } from '@fortawesome/fontawesome-svg-core'
import '@fortawesome/fontawesome-svg-core/styles.css'
config.autoAddCss = false
import './globals.css'

export const metadata: Metadata = {
  title: '마이오노트',
  description: '내 아이 근시 관리 — 케어 기록과 안축장 변화를 한 눈에',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="h-full">
      <body className="min-h-full bg-[#edf7f6] text-[#134e4a] antialiased">{children}</body>
    </html>
  )
}
