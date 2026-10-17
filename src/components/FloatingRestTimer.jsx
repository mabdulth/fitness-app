import React from 'react'

export default function FloatingRestTimer({
  restTimer,
  onAdjustTimer,
  onStopTimer
}) {
  if (!restTimer || (!restTimer.active && !restTimer.justFinished)) {
    return null
  }

  const { remainingSec, totalSec, label, justFinished, active } = restTimer

  const formatMmSs = (sec) => {
    const s = Math.max(0, sec || 0)
    const m = Math.floor(s / 60)
    const rem = s % 60
    return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`
  }

  const progressPercent =
    totalSec > 0 ? Math.max(0, Math.min(100, (remainingSec / totalSec) * 100)) : 0

  return (
    <div className="fixed right-3 sm:right-6 bottom-20 sm:bottom-24 z-50 max-w-[calc(100vw-1.5rem)] animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div
        className={`p-3 sm:p-3.5 rounded-2xl shadow-2xl backdrop-blur-md border-2 transition-all flex flex-col gap-2 ${
          justFinished
            ? 'bg-emerald-950/95 text-white border-emerald-400 shadow-[0_0_25px_rgba(52,211,153,0.6)] animate-pulse'
            : 'bg-slate-950/95 text-emerald-400 border-emerald-500/70 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
        }`}
      >
        {/* หัวข้อและสถานะ */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-base sm:text-lg animate-bounce">⏱️</span>
            <span className="text-[11px] font-black tracking-wider uppercase truncate max-w-[160px] sm:max-w-[220px] text-slate-300">
              {justFinished ? '🔔 ถึงเวลาลุยเซ็ตถัดไป!' : label || 'พักฟื้นระหว่างเซ็ต'}
            </span>
          </div>

          <button
            type="button"
            onClick={onStopTimer}
            title="หยุดจับเวลา"
            className="px-2 py-0.5 text-xs font-black text-rose-400 hover:text-white bg-rose-950/60 hover:bg-rose-600 border border-rose-500/50 rounded-lg transition shrink-0 cursor-pointer"
          >
            ⏹️ หยุด
          </button>
        </div>

        {/* แถบเวลานับถอยหลัง + ปุ่มปรับเวลา */}
        <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-800">
          {/* ตัวเลขเวลา */}
          <div className="flex items-baseline gap-1.5 shrink-0">
            <span className="text-2xl sm:text-3xl font-black font-mono tracking-wider text-emerald-400">
              {formatMmSs(remainingSec)}
            </span>
            <span className="text-[10px] font-bold text-slate-400">นาที</span>
          </div>

          {/* ปุ่มปรับเวลา (+15s, +30s, -15s) */}
          {active && (
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => onAdjustTimer(-15)}
                title="ลดเวลา 15 วินาที"
                className="px-2 py-1 text-xs font-black font-mono text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition cursor-pointer"
              >
                -15s
              </button>
              <button
                type="button"
                onClick={() => onAdjustTimer(15)}
                title="เพิ่มเวลา 15 วินาที"
                className="px-2 py-1 text-xs font-black font-mono text-cyan-300 bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-800 rounded-lg transition cursor-pointer"
              >
                +15s
              </button>
              <button
                type="button"
                onClick={() => onAdjustTimer(30)}
                title="เพิ่มเวลา 30 วินาที"
                className="px-2 py-1 text-xs font-black font-mono text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-800 rounded-lg transition cursor-pointer"
              >
                +30s
              </button>
            </div>
          )}
        </div>

        {/* หลอดความคืบหน้า (Progress Bar) */}
        {active && (
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-0.5">
            <div
              className="bg-gradient-to-r from-teal-400 to-emerald-400 h-full rounded-full transition-all duration-300 ease-linear"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
