import type { Metadata, Viewport } from 'next'
import { config } from '@fortawesome/fontawesome-svg-core'
import '@fortawesome/fontawesome-svg-core/styles.css'
config.autoAddCss = false
import './globals.css'

const siteUrl = 'https://HalinaCho.github.io/MyoNote'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: '마이오노트',
  description: '내 아이 근시 관리 — 케어 기록과 안축장 변화를 한 눈에',
  icons: {
    icon: `${siteUrl}/favicon.png`,
    shortcut: `${siteUrl}/favicon.png`,
    apple: `${siteUrl}/icon.svg`,
  },
  openGraph: {
    url: siteUrl,
    siteName: '마이오노트',
    title: '마이오노트 | 내 아이 근시 관리',
    description: '아이의 근시를 기록하고 안축장 변화를 한눈에 확인하세요. 케어 달성률, 병원 예약 알림, 보호자 공유 기능 제공.',
    type: 'website',
    images: [
      {
        url: `${siteUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: '마이오노트 — 내 아이 근시 관리',
      },
    ],
  },
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
