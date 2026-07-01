'use client'

// 거리 자가 측정 화면 (전면 카메라, 온디바이스 · 프레임 서버 전송 없음)
// 엔진/원리는 lib/distance.ts 참고. v1 = 실시간 점검만(기록 없음).

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft, faRulerHorizontal, faCircleInfo, faCameraRetro } from '@fortawesome/free-solid-svg-icons'
import {
  measureIris, distanceCm, resolveFocalPx, median,
  saveCalibration, clearCalibration, focalFromCalibration,
  NEAR_CM, type Pt,
} from '@/lib/distance'

const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm'
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'
const ASYMM_MAX = 0.18   // 좌우 홍채 지름 차 이보다 크면 고개 돌아간 것으로 보고 게이트

type Phase = 'loading' | 'running' | 'denied' | 'error'

export default function DistancePage() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const landmarkerRef = useRef<{ detectForVideo: (v: HTMLVideoElement, ts: number) => { faceLandmarks: Pt[][] }; close: () => void } | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const irisBufRef = useRef<number[]>([])   // 최근 홍채 지름(px) — 표시 평활 + 보정 샘플 공유
  const lastTsRef = useRef(0)
  const frameWRef = useRef(0)

  const [phase, setPhase] = useState<Phase>('loading')
  const [errMsg, setErrMsg] = useState('')
  const [dist, setDist] = useState<number | null>(null)
  const [hint, setHint] = useState('얼굴을 화면 안에 맞춰 주세요')
  const [calibrated, setCalibrated] = useState(false)
  const [showCalib, setShowCalib] = useState(false)
  const [calibCm, setCalibCm] = useState('40')

  // ── 시작(카메라 + 모델 + 프레임 루프) ─────────────────────────
  useEffect(() => {
    let cancelled = false
    // calibrated 상태는 루프의 resolveFocalPx 결과로 매 프레임 갱신됨(초기 setState 불필요)

    const loop = () => {
      const video = videoRef.current
      const lm = landmarkerRef.current
      if (!video || !lm) return
      if (video.readyState >= 2 && video.videoWidth > 0) {
        const w = video.videoWidth, h = video.videoHeight
        frameWRef.current = w
        let ts = performance.now()
        if (ts <= lastTsRef.current) ts = lastTsRef.current + 1
        lastTsRef.current = ts
        try {
          const res = lm.detectForVideo(video, ts)
          const pts = res.faceLandmarks?.[0]
          const m = pts ? measureIris(pts as Pt[], w, h) : null
          if (!m) {
            setHint('얼굴을 화면 안에 맞춰 주세요')
            setDist(null)
            irisBufRef.current = []
          } else if (m.asymmetry > ASYMM_MAX) {
            setHint('화면을 정면으로 바라봐 주세요')
          } else {
            const buf = irisBufRef.current
            buf.push(m.avgPx)
            if (buf.length > 15) buf.shift()
            const medIris = median(buf)
            const { focalPx, calibrated: cal } = resolveFocalPx(w)
            setCalibrated(cal)
            setDist(distanceCm(medIris, focalPx))
            setHint('')
          }
        } catch { /* 프레임 스킵 */ }
      }
      rafRef.current = requestAnimationFrame(loop)
    }

    ;(async () => {
      // 1) 카메라
      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        })
      } catch (e) {
        if (cancelled) return
        if (e instanceof DOMException && (e.name === 'NotAllowedError' || e.name === 'SecurityError')) {
          setPhase('denied')
        } else {
          setErrMsg(e instanceof Error ? e.message : '카메라를 열 수 없습니다.')
          setPhase('error')
        }
        return
      }
      if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
      streamRef.current = stream
      const video = videoRef.current
      if (video) {
        video.srcObject = stream
        try { await video.play() } catch { /* autoplay 정책 — 무시 */ }
      }

      // 2) 모델 (브라우저 전용 → 동적 import로 SSR 회피)
      try {
        const { FilesetResolver, FaceLandmarker } = await import('@mediapipe/tasks-vision')
        const fileset = await FilesetResolver.forVisionTasks(WASM_URL)
        const make = (delegate: 'GPU' | 'CPU') => FaceLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate },
          runningMode: 'VIDEO',
          numFaces: 1,
        })
        let landmarker
        try { landmarker = await make('GPU') } catch { landmarker = await make('CPU') }
        if (cancelled) { landmarker.close(); return }
        landmarkerRef.current = landmarker as unknown as typeof landmarkerRef.current
        setPhase('running')
        rafRef.current = requestAnimationFrame(loop)
      } catch (e) {
        if (cancelled) return
        setErrMsg(e instanceof Error ? e.message : '인식 모델을 불러오지 못했습니다.')
        setPhase('error')
      }
    })()

    return () => {
      cancelled = true
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
      landmarkerRef.current?.close()
      landmarkerRef.current = null
      streamRef.current?.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }, [])

  // ── 정밀 보정 ────────────────────────────────────────────────
  const applyCalibration = () => {
    const knownCm = parseFloat(calibCm)
    const buf = irisBufRef.current
    if (!knownCm || knownCm < 10 || knownCm > 120) { toast.error('10~120cm 사이로 입력해 주세요.'); return }
    if (buf.length < 5) { toast.error('얼굴이 안정적으로 인식된 상태에서 눌러 주세요.'); return }
    const medIris = median(buf)
    const focalPx = focalFromCalibration(medIris, knownCm)
    saveCalibration({ focalPx, frameW: frameWRef.current, distanceCm: knownCm, ts: Date.now() })
    setCalibrated(true)
    setShowCalib(false)
    toast.success('정밀 보정이 저장됐어요.')
  }

  const resetCalibration = () => {
    clearCalibration()
    setCalibrated(false)
    toast.success('기본 추정으로 되돌렸어요.')
  }

  const near = dist != null && dist < NEAR_CM
  const statusColor = dist == null ? 'text-gray-400' : near ? 'text-rose-500' : 'text-teal-600'

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center gap-2">
        <button onClick={() => router.push('/dashboard')} className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-gray-600">
          <FontAwesomeIcon icon={faArrowLeft} />
        </button>
        <h1 className="font-bold text-gray-800">거리 자가 점검</h1>
      </div>

      {/* 카메라 프리뷰 */}
      <div className="relative rounded-2xl overflow-hidden bg-gray-900 aspect-[3/4]">
        <video
          ref={videoRef}
          playsInline muted autoPlay
          className="absolute inset-0 w-full h-full object-cover -scale-x-100"
        />
        {/* 얼굴 가이드 타원 */}
        {phase === 'running' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-1/2 h-2/3 rounded-[50%] border-2 border-white/40" />
          </div>
        )}

        {/* 로딩/거부/오류 오버레이 */}
        {phase !== 'running' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 text-white/90 gap-2">
            <FontAwesomeIcon icon={faCameraRetro} className="text-2xl opacity-70" />
            {phase === 'loading' && <p className="text-sm">카메라와 인식 모델을 준비하고 있어요…</p>}
            {phase === 'denied' && <p className="text-sm">카메라 권한이 필요해요. 브라우저 설정에서 허용해 주세요.</p>}
            {phase === 'error' && <p className="text-sm">{errMsg || '문제가 생겼어요.'}</p>}
          </div>
        )}

        {/* 거리 표시 */}
        {phase === 'running' && (
          <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
            {hint ? (
              <p className="text-center text-white/90 text-sm">{hint}</p>
            ) : (
              <div className="text-center">
                {!calibrated && dist != null && (
                  <span className={`text-2xl font-bold align-middle mr-1 ${statusColor}`}>약</span>
                )}
                <span className={`text-5xl font-extrabold ${statusColor} drop-shadow`}>
                  {dist != null ? Math.round(dist) : '—'}
                </span>
                <span className="text-white/80 text-lg font-semibold ml-1">cm</span>
                <p className={`mt-1 text-sm font-semibold ${near ? 'text-rose-300' : 'text-teal-200'}`}>
                  {near ? '가까워요 · 30cm 이상 권장' : '적정 거리예요'}
                </p>
                {!calibrated && (
                  <p className="mt-0.5 text-[11px] text-white/60">정밀 보정 전 · 기기별 편차 있어 참고용</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 보정 상태 + 버튼 */}
      <div className="flex items-center justify-between text-sm">
        <span className={`inline-flex items-center gap-1.5 ${calibrated ? 'text-teal-600' : 'text-amber-600'}`}>
          <FontAwesomeIcon icon={faRulerHorizontal} />
          {calibrated ? '정밀 보정됨' : '기본 추정 · 기기별 편차 큼'}
        </span>
        <div className="flex items-center gap-2">
          {calibrated && (
            <button onClick={resetCalibration} className="text-gray-400 hover:text-gray-600">기본으로</button>
          )}
          <button
            onClick={() => setShowCalib(true)} disabled={phase !== 'running'}
            className={`px-3 py-1.5 rounded-lg font-medium disabled:opacity-40 ${calibrated ? 'border border-teal-300 text-teal-600' : 'bg-teal-500 text-white'}`}
          >
            {calibrated ? '다시 보정' : '정밀 보정하기'}
          </button>
        </div>
      </div>

      {/* 안내 */}
      <div className="flex items-start gap-1.5 text-[11px] text-gray-400">
        <FontAwesomeIcon icon={faCircleInfo} className="mt-0.5 shrink-0" />
        <p>
          홍채 크기로 거리를 추정하는 <b>자가 점검</b>이에요(의료 측정 아님). 영상은 기기에서만 처리되고 저장·전송되지 않아요.
          더 정확히 보려면 줄자로 실제 거리를 한 번 맞춰 <b>정밀 보정</b>하세요.
        </p>
      </div>

      {/* 정밀 보정 모달 */}
      {showCalib && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCalib(false)} />
          <div className="relative z-10 w-full max-w-[480px] bg-white rounded-t-2xl sm:rounded-2xl p-5 pb-8">
            <h2 className="font-bold text-gray-800 mb-1">정밀 보정</h2>
            <p className="text-sm text-gray-500 mb-4 leading-relaxed">
              줄자로 <b>눈과 화면 사이 거리</b>를 아래 값에 정확히 맞춘 뒤, 얼굴을 정면으로 인식시킨 상태에서 <b>이 거리로 보정</b>을 누르세요. 기기당 한 번만 하면 돼요.
            </p>
            <div className="flex items-center gap-2 mb-5">
              <input
                type="number" inputMode="decimal" value={calibCm}
                onChange={e => setCalibCm(e.target.value)}
                className="w-24 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <span className="text-sm text-gray-600">cm 에 맞췄어요</span>
            </div>
            <button onClick={applyCalibration} className="w-full bg-teal-500 hover:bg-teal-600 text-white font-semibold py-3 rounded-xl">
              이 거리로 보정
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
