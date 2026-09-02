'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Toaster } from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { HospitalProvider, useHospital } from '@/context/HospitalContext'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChartPie, faUsers, faBullhorn, faGear, faRightFromBracket } from '@fortawesome/free-solid-svg-icons'

const NAV = [
  { href: '/clinic', label: '대시보드', icon: faChartPie },
  { href: '/clinic/patients', label: '환자', icon: faUsers },
  { href: '/clinic/posts', label: '소식', icon: faBullhorn },
  { href: '/clinic/settings', label: '설정', icon: faGear },
]

export default function ClinicShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const isLoginPage = pathname === '/clinic/login'
  const [status, setStatus] = useState<'checking' | 'ok'>('checking')

  useEffect(() => {
    if (isLoginPage) return
    let cancelled = false
    const check = async () => {
      const sb = createClient()
      const { data: { session } } = await sb.auth.getSession()
      if (!session) { router.replace('/clinic/login'); return }
      const { data: hospitalId } = await sb.rpc('my_hospital_id')
      if (cancelled) return
      if (!hospitalId) { router.replace('/clinic/login'); return }
      setStatus('ok')
    }
    check()
    return () => { cancelled = true }
  }, [router, isLoginPage])

  if (isLoginPage) return <>{children}</>
  if (status !== 'ok') return null

  return (
    <HospitalProvider>
      {/* 진료실 PC에서 쓰는 웹 대시보드 — 데스크톱은 좌측 사이드바, 좁은 화면은 상단 바로 접힌다 */}
      <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
        <ClinicNav />
        <main className="flex-1 min-w-0 px-4 md:px-6 py-5 md:py-6">{children}</main>
      </div>
      <Toaster position="bottom-center" toastOptions={{ style: { maxWidth: 360, fontSize: 14 } }} />
    </HospitalProvider>
  )
}

function ClinicNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { hospital } = useHospital()

  const handleLogout = async () => {
    await createClient().auth.signOut()
    router.replace('/clinic/login')
  }

  return (
    <nav className="bg-white border-b md:border-b-0 md:border-r border-gray-200
                    md:w-56 md:shrink-0 md:min-h-screen md:sticky md:top-0
                    flex md:flex-col items-center md:items-stretch gap-1 md:gap-0
                    px-3 md:px-3 py-2 md:py-4">
      <div className="flex items-center gap-2 min-w-0 md:px-2 md:pb-4 md:mb-2 md:border-b md:border-gray-100">
        {hospital?.logoUrl ? (
          <Image src={hospital.logoUrl} alt="" width={28} height={28}
            className="w-7 h-7 rounded-lg object-cover border border-gray-100 shrink-0" unoptimized />
        ) : (
          <span className="w-7 h-7 rounded-lg shrink-0"
            style={{ backgroundColor: hospital?.brandColor ?? '#14b8a6' }} />
        )}
        <span className="font-bold text-gray-800 text-sm truncate">{hospital?.name ?? '병원 포털'}</span>
      </div>

      <div className="flex-1 flex md:flex-col items-center md:items-stretch gap-1 md:gap-0.5 min-w-0 justify-end md:justify-start">
        {NAV.map(({ href, label, icon }) => {
          const active = href === '/clinic' ? pathname === href : pathname.startsWith(href)
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${active ? 'bg-teal-50 text-teal-600' : 'text-gray-500 hover:bg-gray-50'}`}>
              <FontAwesomeIcon icon={icon} className="text-xs w-4" />
              {label}
            </Link>
          )
        })}
      </div>

      <button onClick={handleLogout}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-50 md:mt-2">
        <FontAwesomeIcon icon={faRightFromBracket} className="text-xs w-4" />
        <span className="hidden md:inline">로그아웃</span>
      </button>
    </nav>
  )
}
