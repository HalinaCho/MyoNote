import type { Child, Treatment } from '@/types'

export const TREATMENTS_ALL: Treatment[] = [
  { key: 'atropine',  name: '아트로핀 점안', time: '취침 전 1회', tag: 'atropine'  },
  { key: 'dreamlens', name: '드림렌즈 착용',  time: '취침 시',     tag: 'dreamlens' },
]

export function getActiveTreatments(child: Child | null): Treatment[] {
  if (!child) return []
  return TREATMENTS_ALL.filter(t =>
    (t.key === 'atropine'  && child.treatAtropine) ||
    (t.key === 'dreamlens' && child.treatDreamlens)
  )
}
