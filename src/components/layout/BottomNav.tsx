'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faHouse, faClipboardList, faChartColumn, faGear } from '@fortawesome/free-solid-svg-icons'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'

const TABS: { href: string; label: string; icon: IconDefinition }[] = [
  { href: '/dashboard',           label: '홈',  icon: faHouse },
  { href: '/dashboard/records',   label: '기록', icon: faClipboardList },
  { href: '/dashboard/analytics', label: '분석', icon: faChartColumn },
  { href: '/dashboard/settings',  label: '설정', icon: faGear },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 flex justify-center">
      <div className="w-full max-w-[480px] flex bg-white border-t border-gray-200 safe-pb">
        {TABS.map(({ href, label, icon }) => {
          const active = href === '/dashboard' ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs transition-colors
                ${active ? 'text-blue-600' : 'text-gray-400'}`}
            >
              <FontAwesomeIcon icon={icon} className="text-xl leading-none" />
              <span className={`font-medium ${active ? 'font-semibold' : ''}`}>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
