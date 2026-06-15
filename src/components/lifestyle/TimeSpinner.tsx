'use client'

export default function TimeSpinner({
  hours, minutes,
  onHour, onMinute,
  btnCls, textCls,
}: {
  hours: number; minutes: number
  onHour: (v: number) => void; onMinute: (v: number) => void
  btnCls: string; textCls: string
}) {
  return (
    <div className="flex items-center justify-center gap-2">
      <div className="flex flex-col items-center gap-1">
        <button type="button" onClick={() => onHour(Math.min(24, hours + 1))}
          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${btnCls}`}>▲</button>
        <span className={`text-3xl font-bold w-10 text-center leading-tight ${textCls}`}>{hours}</span>
        <button type="button" onClick={() => onHour(Math.max(0, hours - 1))}
          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${btnCls}`}>▼</button>
        <span className="text-xs opacity-50 mt-0.5">시간</span>
      </div>
      <span className={`text-2xl font-bold mb-6 ${textCls} opacity-30`}>:</span>
      <div className="flex flex-col items-center gap-1">
        <button type="button" onClick={() => onMinute((minutes + 15) % 60)}
          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${btnCls}`}>▲</button>
        <span className={`text-3xl font-bold w-10 text-center leading-tight ${textCls}`}>{String(minutes).padStart(2, '00')}</span>
        <button type="button" onClick={() => onMinute((minutes - 15 + 60) % 60)}
          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${btnCls}`}>▼</button>
        <span className="text-xs opacity-50 mt-0.5">분</span>
      </div>
    </div>
  )
}
