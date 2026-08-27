'use client'

import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import QRCode from 'qrcode'
import { useHospital } from '@/context/HospitalContext'
import * as q from '@/lib/supabase/queries'
import { downscaleImage } from '@/lib/examExtract'
import { contrastText, contrastMuted, DEFAULT_BRAND_COLOR } from '@/lib/utils/color'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faHospital, faImage, faEyeDropper } from '@fortawesome/free-solid-svg-icons'

const LOGO_MAX_BYTES = 5 * 1024 * 1024   // 리사이즈 전 원본 기준 — 너무 큰 파일은 브라우저에서 디코드가 버겁다

const isHex = (v: string) => /^#[0-9a-fA-F]{6}$/.test(v)

// 화면 어디서든 색을 집어오는 브라우저 기본 스포이드(Chrome/Edge). 네이티브 색상 대화상자와 달리
// 집는 즉시 닫혀서 로고를 가리지 않는다. 미지원 브라우저에서는 버튼을 숨긴다.
interface EyeDropperCtor { new (): { open: () => Promise<{ sRGBHex: string }> } }
const getEyeDropper = (): EyeDropperCtor | null =>
  (typeof window !== 'undefined' && (window as unknown as { EyeDropper?: EyeDropperCtor }).EyeDropper) || null

export default function ClinicSettingsPage() {
  const { hospital, isLoading, error, refresh } = useHospital()
  const [token, setToken] = useState<string | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [regenerating, setRegenerating] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [hasEyeDropper, setHasEyeDropper] = useState(false)

  // 브라우저 지원 여부는 서버 렌더 시점에 알 수 없다 → 마운트 후 판정(하이드레이션 불일치 방지)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 브라우저 기능 감지, 마운트 시 1회
    setHasEyeDropper(!!getEyeDropper())
  }, [])
  // 컬러는 만지작거리다 확정하는 값이라 즉시 저장하지 않는다(로고는 파일 선택이 곧 확정이라 즉시 저장).
  // draft가 null이면 "아직 안 건드림" → 저장된 값을 그대로 쓴다. 저장 후 null로 되돌리면
  // 새로고침된 병원 정보를 자동으로 따라가므로 effect로 동기화할 필요가 없다.
  const [colorDraft, setColorDraft] = useState<string | null>(null)
  const [hexDraft, setHexDraft] = useState<string | null>(null)   // HEX 입력 중 타이핑 값(미완성 상태 허용)
  const colorInputRef = useRef<HTMLInputElement>(null)
  const [savingColor, setSavingColor] = useState(false)
  const savedColor = hospital?.brandColor ?? DEFAULT_BRAND_COLOR
  const color = colorDraft ?? savedColor
  const colorDirty = colorDraft !== null && colorDraft !== savedColor

  const handleLogo = async (file: File | undefined) => {
    if (!file || !hospital) return
    if (!file.type.startsWith('image/')) { toast.error('이미지 파일만 올릴 수 있어요'); return }
    if (file.size > LOGO_MAX_BYTES) { toast.error('5MB 이하 이미지만 올릴 수 있어요'); return }
    setUploadingLogo(true)
    try {
      // PNG로 뽑아야 배경이 뚫린 로고가 흰 사각형으로 뭉개지지 않는다
      const dataUrl = await downscaleImage(file, 256, 0.92, 'image/png')
      await q.uploadHospitalLogo(hospital.id, dataUrl)
      await refresh()
      toast.success('로고가 등록되었습니다')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '로고 등록에 실패했습니다')
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleLogoDelete = async () => {
    if (!hospital) return
    setUploadingLogo(true)
    try {
      await q.deleteHospitalLogo(hospital.id)
      await refresh()
      toast.success('로고를 삭제했습니다')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '삭제에 실패했습니다')
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    handleLogo(e.dataTransfer.files?.[0])
  }

  const handleEyeDropper = async () => {
    const Ctor = getEyeDropper()
    if (!Ctor) return
    // 색상 피커 팝업이 열려 있으면 먼저 닫는다 — 열린 채로 두면 로고를 가려서 집을 수가 없다
    colorInputRef.current?.blur()
    try {
      const { sRGBHex } = await new Ctor().open()
      setColorDraft(sRGBHex.toLowerCase())
      setHexDraft(null)
    } catch { /* 사용자가 ESC로 취소 — 조용히 무시 */ }
  }

  const handleColorSave = async () => {
    if (!hospital) return
    setSavingColor(true)
    try {
      await q.updateHospitalBranding(hospital.id, { brandColor: color })
      await refresh()
      setColorDraft(null)   // 저장된 값을 다시 따라가게
      setHexDraft(null)
      toast.success('브랜드 컬러가 저장되었습니다')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '저장에 실패했습니다')
    } finally {
      setSavingColor(false)
    }
  }

  useEffect(() => {
    if (!hospital) return
    q.fetchConnectToken(hospital.id).then(setToken).catch(() => {})
  }, [hospital])

  useEffect(() => {
    if (!token) return
    const url = `${process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin}/connect/${token}`
    QRCode.toDataURL(url, { width: 220, margin: 1 }).then(setQrDataUrl).catch(() => setQrDataUrl(null))
  }, [token])

  const handleRegenerate = async () => {
    if (!hospital) return
    setRegenerating(true)
    try {
      const newToken = await q.regenerateConnectToken(hospital.id)
      setToken(newToken)
      toast.success('QR이 재발급되었습니다. 이전 QR은 더 이상 쓸 수 없어요.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '재발급에 실패했습니다')
    } finally {
      setRegenerating(false)
    }
  }

  if (error) return <p className="text-sm text-rose-500">{error}</p>
  if (isLoading || !hospital) {
    return <div className="animate-pulse text-sm text-gray-400">불러오는 중…</div>
  }

  return (
    <div className="space-y-4">
      <h1 className="font-bold text-gray-800">설정</h1>

      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="text-sm text-gray-500 mb-1">병원명</div>
        <div className="text-base font-semibold text-gray-800">{hospital.name}</div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-col items-center gap-3">
        <div className="text-sm text-gray-500 self-start">환자 연결 QR</div>
        {qrDataUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={qrDataUrl} alt="환자 연결 QR 코드" width={220} height={220} />
        ) : (
          <div className="w-[220px] h-[220px] bg-gray-100 rounded animate-pulse" />
        )}
        <p className="text-xs text-gray-400 text-center">
          환자(보호자)가 이 QR을 스캔하면 자동으로 병원과 연결됩니다.
        </p>
        <button
          onClick={handleRegenerate}
          disabled={regenerating}
          className="text-xs text-gray-400 hover:text-rose-500 underline disabled:opacity-50"
        >
          {regenerating ? '재발급 중…' : 'QR 재발급 (이전 QR 무효화)'}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-4">
        <div className="text-sm text-gray-500">브랜딩</div>

        {/* 부모 홈 미리보기 — 저장하고 부모 폰으로 확인하러 갈 수 없으니 고르는 즉시 보여준다 */}
        <div>
          <div className="text-xs text-gray-400 mb-1.5">보호자 앱 홈에서 이렇게 보입니다</div>
          <div className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ backgroundColor: color }}>
            {hospital.logoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={hospital.logoUrl} alt="" className="w-10 h-10 rounded-full bg-white object-contain flex-shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-white/25 flex items-center justify-center flex-shrink-0">
                <FontAwesomeIcon icon={faHospital} style={{ color: contrastText(color) }} />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs" style={{ color: contrastMuted(color) }}>연결된 병원</p>
              <p className="font-bold truncate" style={{ color: contrastText(color) }}>{hospital.name}</p>
            </div>
          </div>
        </div>

        <div>
          <div className="text-xs font-medium text-gray-500 mb-1.5">로고</div>
          {/* 영역 전체가 드롭 존이자 파일 선택 버튼 — 끌어다 놓아도, 눌러서 골라도 된다 */}
          <label
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`flex items-center gap-3 rounded-xl border-2 border-dashed px-4 py-3 cursor-pointer transition-colors
              ${uploadingLogo ? 'opacity-40 pointer-events-none' : ''}
              ${dragOver ? 'border-teal-400 bg-teal-50' : 'border-gray-200 hover:bg-gray-50'}`}
          >
            {hospital.logoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={hospital.logoUrl} alt="" className="w-12 h-12 rounded-lg object-contain bg-gray-50 flex-shrink-0" />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                <FontAwesomeIcon icon={faImage} className="text-gray-300" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-700">
                {uploadingLogo ? '처리 중…'
                  : dragOver ? '여기에 놓으세요'
                  : hospital.logoUrl ? '로고 바꾸기' : '로고 올리기'}
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                파일을 끌어다 놓거나 눌러서 선택하세요 · 투명 배경 PNG 권장 · 5MB 이하
              </p>
            </div>
            <input type="file" accept="image/*" className="hidden"
              onChange={e => { handleLogo(e.target.files?.[0]); e.currentTarget.value = '' }} />
          </label>
          {hospital.logoUrl && (
            <button onClick={handleLogoDelete} disabled={uploadingLogo}
              className="mt-1.5 text-xs text-gray-400 hover:text-rose-500 underline disabled:opacity-50">
              로고 삭제
            </button>
          )}
        </div>

        <div>
          <div className="text-xs font-medium text-gray-500 mb-1.5">브랜드 컬러</div>
          <div className="flex items-center gap-2 flex-wrap">
            <input type="color" ref={colorInputRef} value={color}
              onChange={e => { setColorDraft(e.target.value); setHexDraft(null) }}
              aria-label="브랜드 컬러 직접 선택"
              className="w-12 h-9 rounded-lg border border-gray-200 bg-white p-1 cursor-pointer" />
            {hasEyeDropper && (
              <button type="button" onClick={handleEyeDropper}
                className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50">
                <FontAwesomeIcon icon={faEyeDropper} className="text-xs text-gray-400" />
                로고에서 색 뽑기
              </button>
            )}
            <input
              value={hexDraft ?? color}
              onChange={e => {
                const v = e.target.value.startsWith('#') ? e.target.value : `#${e.target.value}`
                setHexDraft(v)
                if (isHex(v)) setColorDraft(v.toLowerCase())   // 유효할 때만 실제 색에 반영
              }}
              onBlur={() => setHexDraft(null)}                 // 입력을 떠나면 확정된 색을 다시 보여준다
              aria-label="브랜드 컬러 HEX 코드"
              maxLength={7}
              className="w-24 h-9 border border-gray-200 rounded-lg px-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            {color !== DEFAULT_BRAND_COLOR && (
              <button onClick={() => { setColorDraft(DEFAULT_BRAND_COLOR); setHexDraft(null) }}
                className="text-xs text-gray-400 hover:text-gray-600 underline">기본색으로</button>
            )}
          </div>

          {hasEyeDropper && (
            <p className="text-[11px] text-gray-400 mt-1.5">
              로고에서 색을 딸 때는 왼쪽 색상칸 대신 <strong className="font-medium">로고에서 색 뽑기</strong>를 눌러주세요.
              색상칸의 대화상자는 열린 채로 남아 로고를 가립니다.
            </p>
          )}
          <button onClick={handleColorSave} disabled={!colorDirty || savingColor}
            className="mt-3 w-full bg-teal-500 hover:bg-teal-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold py-2.5 rounded-xl transition-colors">
            {savingColor ? '저장 중…' : colorDirty ? '컬러 저장' : '저장됨'}
          </button>
        </div>
      </div>
    </div>
  )
}
