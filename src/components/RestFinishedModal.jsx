import React from 'react'

export default function RestFinishedModal({
  isOpen,
  onClose,
  exerciseName,
  restDurationSec = 90,
  onExtendRest
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative max-w-sm sm:max-w-md w-full bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-emerald-400 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(52,211,153,0.35)] text-center text-white space-y-5 animate-in zoom-in-95 duration-200">
        {/* ปุ่มปิด X ที่มุมบนขวา */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center font-black transition cursor-pointer"
        >
          ✕
        </button>

        {/* ไอคอนระฆัง / นาฬิกาดังเด้งสะดุดตา */}
        <div className="relative mx-auto w-20 h-20 sm:w-24 sm:h-24">
          <div className="absolute inset-0 rounded-3xl bg-emerald-400/30 animate-ping" />
          <div className="relative w-full h-full rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-300 text-slate-950 flex items-center justify-center text-4xl sm:text-5xl shadow-[0_0_30px_rgba(52,211,153,0.6)] animate-bounce">
            ⏰
          </div>
        </div>

        {/* หัวข้อแจ้งเตือน */}
        <div className="space-y-1">
          <span className="inline-block px-3 py-1 text-xs font-black uppercase tracking-wider bg-emerald-400 text-slate-950 rounded-full">
            REST TIME COMPLETED • ครบเวลาพัก
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight pt-1">
            หมดเวลาพักเซ็ตแล้ว!
          </h2>
          <p className="text-sm font-bold text-emerald-400">
            กล้ามเนื้อและระบบประสาทฟื้นตัวเต็มที่ พร้อมลุยเซ็ตต่อไป 🔥
          </p>
        </div>

        {/* กล่องรายละเอียดท่าที่เพิ่งจบ */}
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-left space-y-1.5">
          {exerciseName && (
            <div className="text-sm sm:text-base font-black text-white truncate">
              🏋️ ท่า: {exerciseName}
            </div>
          )}
          <div className="text-xs text-slate-400 font-semibold flex items-center justify-between">
            <span>⏱️ เวลาที่พัก:</span>
            <span className="font-mono text-emerald-400 font-bold">{restDurationSec} วินาที</span>
          </div>
        </div>

        {/* ปุ่มกดยืนยันขนาดใหญ่สำหรับมือถือ */}
        <div className="space-y-2.5 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-4 px-6 text-base sm:text-lg font-black text-slate-950 bg-emerald-400 hover:bg-emerald-300 active:scale-98 rounded-2xl shadow-[0_0_25px_rgba(52,211,153,0.5)] transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>💪</span>
            <span>พร้อมลุยเซ็ตต่อไป! (ปิดเตือน)</span>
          </button>

          {/* ปุ่มขอพักต่ออีกนิด */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onExtendRest && onExtendRest(30)}
              className="flex-1 py-3 text-xs sm:text-sm font-black text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 active:scale-98 border border-slate-700 rounded-xl transition cursor-pointer"
            >
              ⏱️ พักต่อ +30 วิ
            </button>
            <button
              type="button"
              onClick={() => onExtendRest && onExtendRest(60)}
              className="flex-1 py-3 text-xs sm:text-sm font-black text-amber-300 hover:text-amber-200 bg-amber-950/40 hover:bg-amber-900/60 active:scale-98 border border-amber-800/60 rounded-xl transition cursor-pointer"
            >
              ⚡ พักต่อ +60 วิ (1 นาที)
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
