'use client'

import { useState } from 'react'
import { useChild } from '@/context/ChildContext'
import { calcAgeLabel } from '@/lib/utils/date'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronUp, faChevronDown, faCheck, faPlus } from '@fortawesome/free-solid-svg-icons'
import Link from 'next/link'

export default function Header() {
  const { children, activeChild, activeChildId, switchChild } = useChild()
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-100">
      <div className="flex items-center justify-between px-4 h-14">
        <Link href="/dashboard" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/icon.png`}
            alt=""
            className="h-9 w-auto"
          />
          <span className="font-bold text-[#10bcad] text-lg">마이오노트</span>
        </Link>

        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-1.5 bg-gray-100 rounded-full px-3 py-1.5 text-sm font-semibold text-gray-700"
        >
          {activeChild ? (
            <>
              <span>{activeChild.gender === 'F' ? '👧' : '👦'}</span>
              <span>{activeChild.name}</span>
            </>
          ) : (
            <span className="text-gray-400">자녀 선택</span>
          )}
          <FontAwesomeIcon icon={open ? faChevronUp : faChevronDown} className="text-gray-400 text-xs" />
        </button>
      </div>

      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute right-4 top-14 z-30 w-52 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            {children.map(c => (
              <button
                key={c.id}
                onClick={() => { switchChild(c.id); setOpen(false) }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-left hover:bg-gray-50 transition-colors
                  ${c.id === activeChildId ? 'bg-teal-50 text-teal-700' : 'text-gray-700'}`}
              >
                <span className="text-base">{c.gender === 'F' ? '👧' : '👦'}</span>
                <div>
                  <div className="font-semibold">{c.name}</div>
                  <div className="text-xs text-gray-400">{calcAgeLabel(c.birth)}</div>
                </div>
                {c.id === activeChildId && <FontAwesomeIcon icon={faCheck} className="ml-auto text-teal-600 text-xs" />}
              </button>
            ))}
            <div className="border-t border-gray-100" />
            <button
              onClick={() => { setOpen(false); document.dispatchEvent(new CustomEvent('open-add-child')) }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-teal-600 hover:bg-teal-50 transition-colors"
            >
              <FontAwesomeIcon icon={faPlus} /> 자녀 추가
            </button>
          </div>
        </>
      )}
    </header>
  )
}
