'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Toaster } from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { HospitalProvider, useHospital } from '@/context/HospitalContext'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faHouse, faUsers, faBullhorn, faGear, faRightFromBracket } from '@fortawesome/free-solid-svg-icons'

const NAV = [
  { href: '/clinic', label: '홈', icon: faHouse },
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
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <ClinicHeader />
        <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-6">{children}</main>
      </div>
      <Toaster position="bottom-center" toastOptions={{ style: { maxWidth: 360, fontSize: 14 } }} />
    </HospitalProvider>
  )
}

function ClinicHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const { hospital } = useHospital()

  const handleLogout = async () => {
    await createClient().auth.signOut()
    router.replace('/clinic/login')
  }

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="font-bold text-gray-800">{hospital?.name ?? '병원 포털'}</div>
        <nav className="flex items-center gap-1">
          {NAV.map(({ href, label, icon }) => {
            const active = href === '/clinic' ? pathname === href : pathname.startsWith(href)
            return (
              <Link key={href} href={href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                  ${active ? 'bg-teal-50 text-teal-600' : 'text-gray-500 hover:bg-gray-50'}`}>
                <FontAwesomeIcon icon={icon} className="text-xs" />
                {label}
              </Link>
            )
          })}
          <button onClick={handleLogout}
            className="ml-1 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:bg-gray-50">
            <FontAwesomeIcon icon={faRightFromBracket} className="text-xs" />
          </button>
        </nav>
      </div>
    </header>
  )
}
