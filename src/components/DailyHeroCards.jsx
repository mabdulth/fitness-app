import { useState, useEffect } from 'react'
import ExerciseIllustration, { getExerciseYouTubeUrl } from './ExerciseIllustration'
import {
  MASTER_EXERCISE_LIBRARY,
  injectWarmupIntoProgram
} from './ExerciseModal'
import {
  getEquipmentLoadMeta,
  estimateExerciseDurationMins,
  analyzeCardioKinematics,
  evaluateTrainingContinuityAndEffort
} from '../utils/workoutEngine'

// Helper ดึงชื่อโปรแกรมที่เลือกจริงจากรายการท่าฝึก
export function extractActiveProgramTitle(workoutsList = [], explicitProgramTitle = '') {
  if (explicitProgramTitle) return explicitProgramTitle
  if (!Array.isArray(workoutsList) || workoutsList.length === 0) return ''

  for (const item of workoutsList) {
    if (item?.program_title) return item.program_title
    const noteStr = String(item?.notes || '')
    const bracketMatch = noteStr.match(/\[โปรแกรม:\s*([^\]]+)\]/)
    if (bracketMatch && bracketMatch[1]) return bracketMatch[1].trim()
    if (noteStr.startsWith('จำลองเดินป่า:')) return `🏔️ ${noteStr.split('(')[0].trim()}`
    if (noteStr.startsWith('โปรแกรม:')) return `🔥 ${noteStr.replace('โปรแกรม:', '').split('(')[0].trim()}`
  }
  return ''
}

// เช็กลิสต์วันพักกระชับ อ่านง่าย ตัวใหญ่
const REST_DAY_CHECKLIST_ITEMS = [
  { id: 'water', icon: '💧', title: 'ดื่มน้ำเปล่า 2.5 – 3 ลิตรตลอดวัน' },
  { id: 'protein', icon: '🥩', title: 'ทานโปรตีนให้ถึงเป้าเพื่อซ่อมแซมกล้ามเนื้อ' },
  { id: 'stretch', icon: '🧘‍♂️', title: 'ยืดเหยียดคลายกล้ามเนื้อ 10 นาที' },
  { id: 'sleep', icon: '😴', title: 'นอนหลับพักผ่อนอย่างน้อย 7–8 ชั่วโมง' }
]

// สร้างคำแนะนำวอร์มแบบสั้นกระชับ 1 บรรทัด อ่านเข้าใจทันทีใน 2 วินาที
function getShortWarmupTip(item = {}) {
  const isWarmupEx =
    item?.is_warmup === true ||
    item?.muscle === 'Warmup' ||
    String(item?.name || '').includes('[วอร์ม')

  if (isWarmupEx) {
    const n = String(item?.name || '').toLowerCase()
    if (n.includes('scapular push') || n.includes('wrist')) {
      return '🔥 หมุนข้อมือ 15 รอบ + ตั้งท่าแพลงก์แขนตึงดันสะบักขึ้น-ลง 12 ครั้ง'
    }
    if (n.includes('stretch') || n.includes('hip') || n.includes('สะโพก') || n.includes('ข้อเท้า')) {
      return '🔥 ก้าวย่อขายาวเปิดสะโพก + โยกเข่าเปิดข้อเท้าสลับซ้าย-ขวาข้างละ 10 ครั้ง'
    }
    return '🔥 ยืนตรงหมุนหัวไหล่หน้า-หลัง 15 รอบ + เหวี่ยงแขนเปิดหน้าอก 15 ครั้ง'
  }

  if (item?.muscle === 'Cardio') {
    return '🔥 วอร์ม 2 นาทีแรก: เดินความเร็วต่ำ (3.5 km/h) ก่อนปรับความชันจริง'
  }

  const w = parseFloat(item?.weight) || 0
  if (w >= 4) {
    const lightW = Math.max(1, Math.round(w * 0.45))
    return `🔥 วอร์มก่อนยกจริง: ใช้น้ำหนักเบา ~${lightW} kg ยกช้าๆ 12 ครั้ง 1 เซ็ต`
  }
  return '🔥 วอร์มก่อนเริ่ม: ขยับข้อต่อจำลองท่านี้เบาๆ 10 ครั้งก่อนเริ่มเซ็ตที่ 1'
}

export default function DailyHeroCards({
  todayWorkouts = [],
  profile,
  allHistoricalLogs = [],
  selectedDate,
  calendarDays = [],
  onSelectDate,
  activeDayPlanObj,
  selectedProgramTitle = '',
  isRestDayMode = false,
  onSetRestDayMode,
  onSaveRestDayRecord,
  onQuickModeSelect,
  onClearTodayWorkouts,
  onGenerateRecommended,
  onOpenExerciseModal,
  onOpenPresetModal,
  onUpdateStats,
  onQuickSwap,
  onToggleSetComplete,
  onRemoveExercise,
  onSaveWorkout,
  isSaving,
  currentWorkoutId,
  calculateItemCalories
}) {
  const [viewMode, setViewMode] = useState('grid')
  const [focusIndex, setFocusIndex] = useState(0)
  const [energyCheckIn, setEnergyCheckIn] = useState('high')
  const [restCheckedMap, setRestCheckedMap] = useState({
    water: true,
    protein: true,
    stretch: false,
    sleep: false
  })
  const [restDayNote, setRestDayNote] = useState('พักฟื้นกล้ามเนื้อตามรอบสัปดาห์')
  const [localWarmupSetsDoneMap, setLocalWarmupSetsDoneMap] = useState({})
  const [dismissedWarmups, setDismissedWarmups] = useState({})
  const [activePlankTimer, setActivePlankTimer] = useState(null)

  useEffect(() => {
    return () => {
      if (activePlankTimer?.intervalId) {
        clearInterval(activePlankTimer.intervalId)
      }
    }
  }, [activePlankTimer])

  const handleStartPlankTimer = (item, targetSec = 60) => {
    if (activePlankTimer?.intervalId) {
      clearInterval(activePlankTimer.intervalId)
    }
    const tSec = Math.max(10, parseInt(targetSec) || 60)
    const currentCompleted = Array.isArray(item.completed_sets) ? item.completed_sets : []
    const setsNum = parseInt(item.sets) || 3
    let nextSetNum = 1
    for (let s = 1; s <= setsNum; s++) {
      if (!currentCompleted.includes(s)) {
        nextSetNum = s
        break
      }
    }

    const startTime = Date.now()
    const intervalId = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000)
      if (elapsed >= tSec) {
        clearInterval(intervalId)
        setActivePlankTimer(null)
        onUpdateStats(item.uuid, 'reps', tSec)
        handleToggleCardSet(item, nextSetNum)
      } else {
        setActivePlankTimer(prev => (prev ? { ...prev, elapsedSec: elapsed } : null))
      }
    }, 250)

    setActivePlankTimer({
      uuid: item.uuid,
      setNumber: nextSetNum,
      targetSec: tSec,
      elapsedSec: 0,
      intervalId
    })
  }

  const handleStopPlankTimer = (item, shouldSave = true) => {
    if (activePlankTimer?.intervalId) {
      clearInterval(activePlankTimer.intervalId)
    }
    if (shouldSave && activePlankTimer) {
      const actualElapsed = Math.max(5, activePlankTimer.elapsedSec)
      onUpdateStats(item.uuid, 'reps', actualElapsed)
      handleToggleCardSet(item, activePlankTimer.setNumber)
    }
    setActivePlankTimer(null)
  }

  const totalCatalogCount = MASTER_EXERCISE_LIBRARY.length
  const detectedProgramTitle = extractActiveProgramTitle(todayWorkouts, selectedProgramTitle)

  const isSavedRestDay =
    isRestDayMode ||
    detectedProgramTitle.includes('วันพักฟื้นร่างกาย') ||
    (todayWorkouts.length === 1 && todayWorkouts[0]?.muscle === 'Rest')

  const isWarmupDismissedToday = Boolean(dismissedWarmups[selectedDate])

  // แทรกท่าวอร์มร่างกายอัตโนมัติ (สามารถกดลบออกได้ตลอดเวลา)
  const effectiveWorkouts =
    !isSavedRestDay && todayWorkouts.length > 0
      ? (isWarmupDismissedToday
          ? todayWorkouts.filter(it => !it.is_warmup && it.muscle !== 'Warmup' && !String(it.name || '').includes('[วอร์ม'))
          : injectWarmupIntoProgram(todayWorkouts, detectedProgramTitle).map((it, idx) => ({
              ...it,
              name: it.name || it.exercise_name || 'ท่าออกกำลังกาย',
              uuid: it.uuid || `auto-warmup-${selectedDate}-${idx}`
            }))
        )
      : todayWorkouts

  const safeFocusIndex = Math.min(focusIndex, Math.max(0, effectiveWorkouts.length - 1))

  const handleToggleRestCheck = (id) => {
    setRestCheckedMap(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const handleToggleCardSet = (item, setNumber) => {
    const existsInParent = todayWorkouts.some(w => w.uuid === item.uuid)
    if (existsInParent && typeof onToggleSetComplete === 'function') {
      onToggleSetComplete(item.uuid, setNumber)
      return
    }
    setLocalWarmupSetsDoneMap(prev => {
      const currentArr = Array.isArray(prev[item.uuid]) ? prev[item.uuid] : []
      const nextArr = currentArr.includes(setNumber)
        ? currentArr.filter(s => s !== setNumber)
        : [...currentArr, setNumber]
      return { ...prev, [item.uuid]: nextArr }
    })
  }

  const completedRestChecks = Object.values(restCheckedMap).filter(Boolean).length

  // ฟังก์ชันแสดงแถบเลือกวันที่และดูย้อนหลัง 14 วันโดยตรงจากการ์ด
  const renderDateNavigator = () => {
    const todayIso = new Date().toISOString().split('T')[0]
    const isToday = selectedDate === todayIso

    const handleOffsetDate = (offsetDays) => {
      if (typeof onSelectDate !== 'function') return
      const [y, m, d] = selectedDate.split('-').map(Number)
      const current = new Date(y, m - 1, d, 12, 0, 0)
      current.setDate(current.getDate() + offsetDays)
      const newIso = current.toISOString().split('T')[0]
      onSelectDate(newIso)
    }

    return (
      <div className="p-3 sm:p-4 bg-white border border-slate-200 rounded-3xl shadow-xs space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* ซ้าย: วันที่ปัจจุบัน + ปุ่มเลื่อนวันก่อนหน้า/ถัดไป */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => handleOffsetDate(-1)}
              className="px-2.5 py-1.5 text-xs font-black text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              title="ดูวันก่อนหน้า"
            >
              ← วันก่อนหน้า
            </button>

            <div className="flex items-center gap-1.5 bg-slate-900 text-white px-3 py-1 rounded-xl">
              <span className="text-sm">📅</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => typeof onSelectDate === 'function' && onSelectDate(e.target.value)}
                className="bg-transparent text-xs sm:text-sm font-black text-white focus:outline-none cursor-pointer"
              />
            </div>

            <button
              type="button"
              onClick={() => handleOffsetDate(1)}
              className="px-2.5 py-1.5 text-xs font-black text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              title="ดูวันถัดไป"
            >
              วันถัดไป →
            </button>
          </div>

          {/* ขวา: ป้ายวันนี้ + ปุ่มกระโดดกลับมาวันนี้ */}
          <div className="flex items-center gap-2">
            {!isToday && (
              <button
                type="button"
                onClick={() => typeof onSelectDate === 'function' && onSelectDate(todayIso)}
                className="px-3 py-1.5 text-xs font-black text-emerald-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition shadow-2xs cursor-pointer"
              >
                ⚡ กลับมาดูวันนี้
              </button>
            )}
            <span className="text-xs font-bold text-slate-500">
              {activeDayPlanObj?.dayNameFull}
            </span>
          </div>
        </div>

        {/* แถบปฏิทินเลื่อน 14 วันย้อนหลัง กดเลือกวันได้ทันที */}
        {Array.isArray(calendarDays) && calendarDays.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar">
            {calendarDays.map(day => {
              const isSelected = day.date === selectedDate
              const isTodayDay = day.date === todayIso
              const hasRecord = allHistoricalLogs.some(l => l.date === day.date)

              return (
                <button
                  key={day.date}
                  type="button"
                  onClick={() => typeof onSelectDate === 'function' && onSelectDate(day.date)}
                  className={`flex flex-col items-center justify-center min-w-[3.25rem] py-1.5 px-1 rounded-xl border text-center transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-900 ring-2 ring-emerald-500 font-black'
                      : hasRecord
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900 hover:bg-emerald-100'
                        : isTodayDay
                          ? 'bg-sky-50 border-sky-300 text-sky-900'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-[10px] text-slate-400">{day.dayName}</span>
                  <span className="text-xs font-black leading-tight my-0.5">{day.dayNum}</span>
                  <div className="h-1.5 flex items-center justify-center">
                    {hasRecord && (
                      <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-emerald-400' : 'bg-emerald-600'}`}></span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // =========================================================================
  // โหมดที่ 1: วันพักฟื้นร่างกาย (REST DAY) — ตัวใหญ่ กระชับ สบายตา
  // =========================================================================
  if (isSavedRestDay) {
    return (
      <div className="space-y-4">
        {renderDateNavigator()}
        <div className="p-6 sm:p-8 bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 text-white border-2 border-emerald-500/60 rounded-3xl shadow-xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-emerald-800/60">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-400 text-slate-950 flex items-center justify-center text-3xl font-black shrink-0">
              🛌
            </div>
            <div>
              <span className="px-3 py-1 text-xs font-black uppercase bg-emerald-400 text-slate-950 rounded-full">
                REST DAY • {selectedDate}
              </span>
              <h2 className="mt-2 text-xl sm:text-2xl font-black text-white">
                วันนี้คือวันพักฟื้นร่างกายของคุณ
              </h2>
            </div>
          </div>

          {typeof onSetRestDayMode === 'function' && (
            <button
              type="button"
              onClick={() => onSetRestDayMode(false)}
              className="px-4 py-2.5 text-sm font-extrabold text-slate-100 bg-slate-800 border border-slate-600 rounded-xl hover:bg-slate-700"
            >
              ↩ กลับไปเลือกตารางฝึก
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {REST_DAY_CHECKLIST_ITEMS.map(item => {
            const checked = Boolean(restCheckedMap[item.id])
            return (
              <div
                key={item.id}
                onClick={() => handleToggleRestCheck(item.id)}
                className={`p-4 rounded-2xl border cursor-pointer transition flex items-center gap-3.5 ${
                  checked
                    ? 'bg-emerald-900/60 border-emerald-400 text-white'
                    : 'bg-slate-900/80 border-slate-800 text-slate-300'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center text-sm font-black shrink-0 ${
                    checked ? 'bg-emerald-400 text-slate-950' : 'bg-slate-800 border border-slate-700'
                  }`}
                >
                  {checked ? '✓' : ''}
                </div>
                <span className="text-sm sm:text-base font-extrabold">
                  {item.icon} {item.title}
                </span>
              </div>
            )
          })}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
          <input
            type="text"
            value={restDayNote}
            onChange={(e) => setRestDayNote(e.target.value)}
            placeholder="บันทึกเพิ่มเติม..."
            className="flex-1 px-4 py-3 text-sm font-bold text-white bg-slate-950 border border-slate-700 rounded-xl outline-none"
          />
          {typeof onSaveRestDayRecord === 'function' && (
            <button
              type="button"
              disabled={isSaving}
              onClick={() =>
                onSaveRestDayRecord(
                  `[โปรแกรม: 🛌 วันพักฟื้นร่างกาย (Rest Day)] เช็กลิสต์ ${completedRestChecks}/4 • ${restDayNote}`
                )
              }
              className="px-6 py-3 text-sm sm:text-base font-black text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl shadow-md"
            >
              {isSaving ? 'กำลังบันทึก...' : '💾 บันทึกวันพักลงปฏิทิน'}
            </button>
          )}
        </div>
      </div>
      </div>
    )
  }

  // =========================================================================
  // โหมดที่ 2: หน้าเลือกโหมดประจำวัน (เมื่อยังไม่ได้เลือกโปรแกรม) — ตัวใหญ่ อ่านง่าย
  // =========================================================================
  if (todayWorkouts.length === 0) {
    return (
      <div className="space-y-4">
        {renderDateNavigator()}
        <div className="p-5 sm:p-8 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-6">
        <div className="text-center max-w-xl mx-auto space-y-1.5">
          <span className="inline-block px-3.5 py-1 text-xs font-extrabold text-emerald-800 bg-emerald-100 rounded-full">
            โหมดการฝึกประจำวัน ({selectedDate})
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">
            วันนี้คุณอยากฝึกโหมดไหน?
          </h2>
        </div>

        {/* ปุ่มเช็กสภาพร่างกาย 3 ปุ่มใหญ่ๆ */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { id: 'high', icon: '🔥', title: 'ฟิตเต็มร้อย พร้อมลุย!' },
            { id: 'busy', icon: '⏱️', title: 'เวลาน้อย / ซ้อมที่ห้อง 15 นาที' },
            { id: 'sore', icon: '😴', title: 'เมื่อยล้า / อยากพักฟื้น' }
          ].map(st => {
            const active = energyCheckIn === st.id
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => setEnergyCheckIn(st.id)}
                className={`p-4 rounded-2xl border-2 text-left text-sm sm:text-base font-black transition ${
                  active
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : 'bg-slate-50 text-slate-800 border-slate-200 hover:border-slate-400'
                }`}
              >
                {st.icon} {st.title}
              </button>
            )
          })}
        </div>

        {/* แถบสรุปข้อแนะนำตามสภาพร่างกายที่เลือก */}
        <div className={`p-4 rounded-2xl border text-xs sm:text-sm font-bold flex items-center gap-3 transition ${
          energyCheckIn === 'high'
            ? 'bg-emerald-50 text-emerald-950 border-emerald-300'
            : energyCheckIn === 'busy'
              ? 'bg-indigo-50 text-indigo-950 border-indigo-300'
              : 'bg-amber-50 text-amber-950 border-amber-300'
        }`}>
          <span className="text-2xl shrink-0">
            {energyCheckIn === 'high' ? '🔥' : energyCheckIn === 'busy' ? '⏱️' : '😴'}
          </span>
          <div>
            <div className="font-black text-sm">
              {energyCheckIn === 'high'
                ? 'โหมดพลังงานเต็มร้อย (High Energy):'
                : energyCheckIn === 'busy'
                  ? 'โหมดเวลาน้อย / ซ้อมด่วน (Short on Time):'
                  : 'โหมดเมื่อยล้า / ฟื้นฟูร่างกาย (Active Recovery):'}
            </div>
            <div className="font-semibold text-xs opacity-90 mt-0.5">
              {energyCheckIn === 'high'
                ? 'จัดเต็มตารางฝึกประจำวัน หรือพิชิตโปรแกรม 30 อุทยาน / หุ่นฮีโร่'
                : energyCheckIn === 'busy'
                  ? 'แนะนำซ้อมด่วนที่ห้อง 15 นาที หรือยืดเหยียดคลายเมื่อย ไม่ต้องเดินทางไปยิมและได้ผลลัพธ์จริง'
                  : 'แนะนำให้พักผ่อนซ่อมแซมกล้ามเนื้อ ดื่มน้ำให้พอ หรือยืดเหยียดเบาๆ ไม่สะสมความล้า'}
            </div>
          </div>
        </div>

        {/* การ์ดตัวเลือกโหมด 6 รูปแบบ ปรับเปลี่ยนตามสภาพร่างกายแบบ Real-time */}
        {(() => {
          const modeCardsByEnergy = {
            high: [
              {
                id: 'daily',
                title: `1. ${activeDayPlanObj?.module?.title || 'ตารางฝึกประจำวัน'}`,
                badge: '🔥 แนะนำสูงสุดวันนี้ (พลังงานเต็ม 100%)',
                badgeClass: 'bg-emerald-600 text-white',
                desc: 'จัดเต็มทั้งท่าวอร์ม + เวทตามอุปกรณ์ของคุณ + คาร์ดิโอเบิร์นไขมัน',
                borderClass: 'border-2 border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20',
                actionBtn: (
                  <button
                    type="button"
                    onClick={onGenerateRecommended}
                    className="w-full py-3 px-4 mt-4 text-sm font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs cursor-pointer"
                  >
                    ⚡ โหลดตารางฝึกวันนี้
                  </button>
                )
              },
              {
                id: 'preset',
                title: '2. เลือกโปรแกรมพิเศษ / เดินป่า 30 อุทยาน',
                badge: '30 อุทยาน • พลังงานสูง',
                badgeClass: 'bg-pink-600 text-white',
                desc: 'ซ้อมเดินป่า 30 อุทยาน, หุ่นไวรัล/ฮีโร่ หรือตารางมาตรฐาน',
                borderClass: 'border-2 border-pink-400 bg-pink-50/40',
                actionBtn: (
                  <button
                    type="button"
                    onClick={onOpenPresetModal}
                    className="w-full py-3 px-4 mt-4 text-sm font-black text-white bg-pink-600 hover:bg-pink-700 rounded-xl shadow-xs cursor-pointer"
                  >
                    🔥 เปิดคลังโปรแกรมทั้งหมด
                  </button>
                )
              },
              {
                id: 'cardio',
                title: '3. 🏃‍♂️ คาร์ดิโอเดินชันลู่วิ่ง โซน 2 (35 นาที)',
                badge: '🫁 ปอด & หัวใจแข็งแกร่ง',
                badgeClass: 'bg-sky-600 text-white',
                desc: 'เดินชัน Incline 8.5% โซน 2 ดึงไขมันสะสมออกมาเผาผลาญเต็มที่',
                borderClass: 'border-2 border-sky-400 bg-sky-50/40',
                actionBtn: (
                  <button
                    type="button"
                    onClick={() => typeof onQuickModeSelect === 'function' && onQuickModeSelect('cardio_only')}
                    className="w-full py-3 px-4 mt-4 text-sm font-black text-white bg-sky-600 hover:bg-sky-700 rounded-xl cursor-pointer"
                  >
                    🏃‍♂️ เริ่มคาร์ดิโอเดินชัน
                  </button>
                )
              },
              {
                id: 'custom',
                title: '4. ➕ ออกแบบตารางฝึกเอง',
                badge: 'อิสระ 100%',
                badgeClass: 'bg-slate-800 text-white',
                desc: `เลือกท่าฝึกที่ต้องการจากคลังท่าทั้งหมด ${totalCatalogCount} ท่า`,
                borderClass: 'border-2 border-slate-300 bg-white',
                actionBtn: (
                  <button
                    type="button"
                    onClick={onOpenExerciseModal}
                    className="w-full py-3 px-4 mt-4 text-sm font-black text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl cursor-pointer"
                  >
                    + เลือกท่าเองจาก 95 ท่า
                  </button>
                )
              },
              {
                id: 'home',
                title: '5. 🏠 ซ้อมด่วนที่บ้าน 15 นาที',
                badge: 'บอดี้เวทเข้มข้น',
                badgeClass: 'bg-indigo-600 text-white',
                desc: 'บอดี้เวทครบทั้งอก ขา หน้าท้อง ไม่ใช้อุปกรณ์',
                borderClass: 'border border-slate-200 bg-white',
                actionBtn: (
                  <button
                    type="button"
                    onClick={() => typeof onQuickModeSelect === 'function' && onQuickModeSelect('express_home')}
                    className="w-full py-3 px-4 mt-4 text-sm font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl cursor-pointer"
                  >
                    🏠 เริ่มซ้อมที่บ้าน 15 นาที
                  </button>
                )
              },
              {
                id: 'rest',
                title: '6. 🛌 ตั้งวันนี้เป็น "วันพักฟื้นร่างกาย"',
                badge: 'REST DAY',
                badgeClass: 'bg-amber-400 text-slate-950',
                desc: 'บันทึกวันพักลงปฏิทินหากต้องการฟื้นฟูกล้ามเนื้อ',
                borderClass: 'border border-slate-200 bg-white',
                actionBtn: (
                  <button
                    type="button"
                    onClick={() => typeof onSetRestDayMode === 'function' && onSetRestDayMode(true)}
                    className="w-full py-3 px-4 mt-4 text-sm font-black text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl shadow-xs cursor-pointer"
                  >
                    🛌 ตั้งเป็นวันพักฟื้น
                  </button>
                )
              }
            ],
            busy: [
              {
                id: 'home',
                title: '1. 🏠 ซ้อมด่วนที่ห้อง 15 นาที (มือเปล่า)',
                badge: '⚡ แนะนำสูงสุด • จบไว 15 นาที ไม่ง้ออุปกรณ์',
                badgeClass: 'bg-indigo-600 text-white',
                desc: 'บอดี้เวทเข้มข้น อก ขา หน้าท้อง พักสั้น 45 วิ เบิร์นไขมันเหงื่อท่วมใน 15 นาที ไม่ต้องเดินทางไปยิม',
                borderClass: 'border-2 border-indigo-500 bg-indigo-50/70 shadow-sm ring-2 ring-indigo-400/30',
                actionBtn: (
                  <button
                    type="button"
                    onClick={() => typeof onQuickModeSelect === 'function' && onQuickModeSelect('express_home')}
                    className="w-full py-3 px-4 mt-4 text-sm font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs cursor-pointer"
                  >
                    🏠 เริ่มซ้อมที่ห้อง 15 นาที
                  </button>
                )
              },
              {
                id: 'mobility',
                title: '2. 🧘‍♂️ ยืดเหยียดคลายเมื่อย 15 นาที',
                badge: '🧘‍♂️ 15 นาที • แก้ออฟฟิศซินโดรม',
                badgeClass: 'bg-teal-600 text-white',
                desc: 'เปิดสะบัก คลายหลังล่างและสะโพก เหมาะมากสำหรับวันงานยุ่ง ปวดเมื่อยจากการนั่งทำงานนาน',
                borderClass: 'border-2 border-teal-500 bg-teal-50/70 shadow-sm ring-2 ring-teal-400/30',
                actionBtn: (
                  <button
                    type="button"
                    onClick={() => typeof onQuickModeSelect === 'function' && onQuickModeSelect('mobility')}
                    className="w-full py-3 px-4 mt-4 text-sm font-black text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs cursor-pointer"
                  >
                    🧘‍♂️ เริ่มยืดเหยียด 15 นาที
                  </button>
                )
              },
              {
                id: 'cardio_express',
                title: '3. ⏱️ คาร์ดิโอด่วน 15 นาที',
                badge: '⏱️ 15 นาที • เผาผลาญเร่งด่วน',
                badgeClass: 'bg-sky-600 text-white',
                desc: 'เดินชันลู่วิ่ง Incline 8% เวลา 15 นาที กระตุ้นการเผาผลาญไขมันในเวลาที่จำกัด',
                borderClass: 'border-2 border-sky-400 bg-sky-50/40',
                actionBtn: (
                  <button
                    type="button"
                    onClick={() => typeof onQuickModeSelect === 'function' && onQuickModeSelect('cardio_express')}
                    className="w-full py-3 px-4 mt-4 text-sm font-black text-white bg-sky-600 hover:bg-sky-700 rounded-xl cursor-pointer"
                  >
                    ⏱️ เริ่มคาร์ดิโอด่วน 15 นาที
                  </button>
                )
              },
              {
                id: 'daily',
                title: `4. ⚡ ${activeDayPlanObj?.module?.title || 'ตารางประจำวัน'} (ฉบับย่อ)`,
                badge: 'ตารางประจำวันฉบับเร่งรัด',
                badgeClass: 'bg-emerald-600 text-white',
                desc: 'โหลดตารางประจำวันแล้วเลือกเล่นเฉพาะ 2-3 ท่าหลักเพื่อประหยัดเวลา',
                borderClass: 'border-2 border-emerald-400 bg-white',
                actionBtn: (
                  <button
                    type="button"
                    onClick={onGenerateRecommended}
                    className="w-full py-3 px-4 mt-4 text-sm font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl cursor-pointer"
                  >
                    ⚡ โหลดตารางประจำวัน
                  </button>
                )
              },
              {
                id: 'rest',
                title: '5. 🛌 ตั้งวันนี้เป็น "วันพักฟื้นร่างกาย"',
                badge: 'REST DAY',
                badgeClass: 'bg-amber-400 text-slate-950',
                desc: 'หากติดธุระด่วนจนไม่มีเวลาเล่น บันทึกเป็นวันพักเพื่อรักษาวินัยความสม่ำเสมอบนปฏิทิน',
                borderClass: 'border border-amber-300 bg-amber-50/40',
                actionBtn: (
                  <button
                    type="button"
                    onClick={() => typeof onSetRestDayMode === 'function' && onSetRestDayMode(true)}
                    className="w-full py-3 px-4 mt-4 text-sm font-black text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl shadow-xs cursor-pointer"
                  >
                    🛌 ตั้งเป็นวันพักฟื้น
                  </button>
                )
              },
              {
                id: 'custom',
                title: '6. ➕ เลือกท่าเอง 1-2 ท่าด่วน',
                badge: 'เลือกเองสั้นๆ',
                badgeClass: 'bg-slate-800 text-white',
                desc: `เลือกเฉพาะท่าที่อยากเล่นในห้องจาก ${totalCatalogCount} ท่า`,
                borderClass: 'border border-slate-200 bg-white',
                actionBtn: (
                  <button
                    type="button"
                    onClick={onOpenExerciseModal}
                    className="w-full py-3 px-4 mt-4 text-sm font-black text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl cursor-pointer"
                  >
                    + เลือกท่าเอง
                  </button>
                )
              }
            ],
            sore: [
              {
                id: 'rest',
                title: '1. 🛌 ตั้งวันนี้เป็น "วันพักฟื้นร่างกาย" (Active Recovery)',
                badge: '🛌 แนะนำสูงสุด • ซ่อมแซมกล้ามเนื้อและระบบประสาท',
                badgeClass: 'bg-amber-400 text-slate-950 font-black',
                desc: 'กล้ามเนื้อเติบโตขณะที่คุณพักผ่อน หลับลึก ดื่มน้ำให้พอ บันทึกวันพักเพื่อรักษาสถิติความสม่ำเสมอ',
                borderClass: 'border-2 border-amber-500 bg-amber-50/80 shadow-md ring-2 ring-amber-400/50',
                actionBtn: (
                  <button
                    type="button"
                    onClick={() => typeof onSetRestDayMode === 'function' && onSetRestDayMode(true)}
                    className="w-full py-3 px-4 mt-4 text-sm font-black text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl shadow-md cursor-pointer"
                  >
                    🛌 ตั้งเป็นวันพักฟื้นร่างกาย (แนะนำ)
                  </button>
                )
              },
              {
                id: 'mobility',
                title: '2. 🧘‍♂️ ยืดเหยียดคลายเมื่อย 15 นาที',
                badge: '🌿 ฟื้นฟูการไหลเวียนเลือด ไม่สะสมความล้า',
                badgeClass: 'bg-teal-600 text-white',
                desc: 'ท่ายืดเหยียดเปิดข้อต่อ ช่วยขับกรดแลกติก ลำเลียงสารอาหารไปซ่อมแซมเส้นใยกล้ามเนื้อ และช่วยให้นอนหลับสบาย',
                borderClass: 'border-2 border-teal-500 bg-teal-50/70 shadow-sm ring-2 ring-teal-400/30',
                actionBtn: (
                  <button
                    type="button"
                    onClick={() => typeof onQuickModeSelect === 'function' && onQuickModeSelect('mobility')}
                    className="w-full py-3 px-4 mt-4 text-sm font-black text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs cursor-pointer"
                  >
                    🧘‍♂️ เริ่มยืดเหยียดคลายเมื่อย 15 นาที
                  </button>
                )
              },
              {
                id: 'light_walk',
                title: '3. 🚶‍♂️ เดินเบาๆ ฟื้นฟูร่างกาย (Active Recovery Walk 20 นาที)',
                badge: '🚶‍♂️ เดินสบายๆ ไม่เหนื่อย',
                badgeClass: 'bg-sky-600 text-white',
                desc: 'เดินลู่วิ่งความชันต่ำ (1%) เดินเล่นชิลล์ๆ กระตุ้นการไหลเวียนของน้ำเหลืองและลดอาการตึงตัว',
                borderClass: 'border-2 border-sky-400 bg-sky-50/40',
                actionBtn: (
                  <button
                    type="button"
                    onClick={() => typeof onQuickModeSelect === 'function' && onQuickModeSelect('light_walk')}
                    className="w-full py-3 px-4 mt-4 text-sm font-black text-white bg-sky-600 hover:bg-sky-700 rounded-xl cursor-pointer"
                  >
                    🚶‍♂️ เริ่มเดินเบาๆ ฟื้นฟู
                  </button>
                )
              },
              {
                id: 'home',
                title: '4. 🏠 ซ้อมเบาๆ ที่บ้าน 15 นาที',
                badge: 'ขยับร่างกายเบาๆ',
                badgeClass: 'bg-indigo-600 text-white',
                desc: 'บอดี้เวทระดับเบา ขยับข้อต่อให้กระปรี้กระเปร่า ไม่ฝืนร่างกาย',
                borderClass: 'border border-indigo-200 bg-white',
                actionBtn: (
                  <button
                    type="button"
                    onClick={() => typeof onQuickModeSelect === 'function' && onQuickModeSelect('express_home')}
                    className="w-full py-3 px-4 mt-4 text-sm font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl cursor-pointer"
                  >
                    🏠 เริ่มซ้อมเบาๆ
                  </button>
                )
              },
              {
                id: 'daily',
                title: `5. ⚡ ${activeDayPlanObj?.module?.title || 'ตารางประจำวัน'}`,
                badge: 'ตารางประจำวัน (หากรู้สึกพร้อม)',
                badgeClass: 'bg-slate-700 text-white',
                desc: 'หากรู้สึกหายเมื่อยล้าและอยากลุยเวท โหลดตารางประจำวันได้เลย',
                borderClass: 'border border-slate-200 bg-white',
                actionBtn: (
                  <button
                    type="button"
                    onClick={onGenerateRecommended}
                    className="w-full py-3 px-4 mt-4 text-sm font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl cursor-pointer"
                  >
                    ⚡ โหลดตารางฝึกวันนี้
                  </button>
                )
              },
              {
                id: 'preset',
                title: '6. 🏔️ เปิดดูคลัง 30 อุทยาน & โปรแกรมพิเศษ',
                badge: 'วางแผนทริปต่อไป',
                badgeClass: 'bg-pink-600 text-white',
                desc: 'เปิดดูข้อมูลอุทยานหรือวางแผนตารางฝึกสำหรับสัปดาห์หน้า',
                borderClass: 'border border-slate-200 bg-white',
                actionBtn: (
                  <button
                    type="button"
                    onClick={onOpenPresetModal}
                    className="w-full py-3 px-4 mt-4 text-sm font-black text-white bg-pink-600 hover:bg-pink-700 rounded-xl cursor-pointer"
                  >
                    🔥 เปิดดูคลังโปรแกรม
                  </button>
                )
              }
            ]
          }

          const currentCards = modeCardsByEnergy[energyCheckIn] || modeCardsByEnergy.high

          return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentCards.map(card => (
                <div
                  key={card.id}
                  className={`p-5 rounded-2xl flex flex-col justify-between transition-all duration-300 ${card.borderClass}`}
                >
                  <div>
                    <span className={`inline-block px-2.5 py-1 text-xs font-black rounded-lg ${card.badgeClass}`}>
                      {card.badge}
                    </span>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 mt-2">
                      {card.title}
                    </h3>
                    <p className="text-sm text-slate-600 mt-1">
                      {card.desc}
                    </p>
                  </div>
                  {card.actionBtn}
                </div>
              ))}
            </div>
          )
        })()}
      </div>
      </div>
    )
  }

  // =========================================================================
  // โหมดที่ 3: การ์ดท่าฝึกประจำวัน (ตัวหนังสือใหญ่ ไม่รก กดง่ายบนมือถือ)
  // =========================================================================
  const cardsToRender =
    viewMode === 'focus'
      ? [effectiveWorkouts[safeFocusIndex]].filter(Boolean)
      : effectiveWorkouts

  return (
    <div className="space-y-4">
      {renderDateNavigator()}
      {/* แถบบนสุด: ชื่อโปรแกรมวันนี้ + ปุ่มควบคุมหลัก (ตัวใหญ่ กระชับในกล่องเดียว) */}
      <div className="p-4 sm:p-5 bg-slate-900 text-white rounded-3xl border border-slate-800 shadow-md space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 text-xs font-black bg-emerald-400 text-slate-950 rounded-md">
                {selectedDate}
              </span>
              <span className="text-xs sm:text-sm font-bold text-emerald-300">
                {activeDayPlanObj?.dayNameFull} • ทั้งหมด {effectiveWorkouts.length} ท่า
              </span>
            </div>
            <h2 className="text-base sm:text-xl font-black text-amber-300 mt-1">
              🎯 {detectedProgramTitle || 'ตารางฝึกประจำวัน'}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onSaveWorkout}
              disabled={isSaving}
              className="px-5 py-2.5 text-sm font-black text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl shadow-sm disabled:bg-slate-600"
            >
              {isSaving ? 'กำลังบันทึก...' : currentWorkoutId ? '✓ อัปเดตสถิติวันนี้' : '💾 บันทึกสถิติวันนี้'}
            </button>
            <button
              type="button"
              onClick={onOpenExerciseModal}
              className="px-3.5 py-2.5 text-xs sm:text-sm font-bold text-white bg-slate-800 border border-slate-700 hover:bg-slate-700 rounded-xl"
            >
              + เพิ่มท่าเอง
            </button>
            <button
              type="button"
              onClick={onOpenPresetModal}
              className="px-3.5 py-2.5 text-xs sm:text-sm font-bold text-amber-300 bg-slate-800 border border-amber-500/40 hover:bg-slate-700 rounded-xl"
            >
              🔄 เปลี่ยนโปรแกรม
            </button>
            {typeof onSetRestDayMode === 'function' && (
              <button
                type="button"
                onClick={() => onSetRestDayMode(true)}
                className="px-3 py-2.5 text-xs sm:text-sm font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl"
              >
                🛌 วันพัก
              </button>
            )}
            {typeof onClearTodayWorkouts === 'function' && (
              <button
                type="button"
                onClick={onClearTodayWorkouts}
                className="px-3 py-2.5 text-xs sm:text-sm font-bold text-rose-300 bg-rose-950/60 border border-rose-500/30 hover:bg-rose-900 rounded-xl"
              >
                🗑️ ล้าง
              </button>
            )}
          </div>
        </div>

        {/* สลับโหมดดูทั้งหมด vs ดูทีละท่าบนมือถือ */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
          <div className="inline-flex p-1 bg-slate-950 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`px-3.5 py-1.5 text-xs sm:text-sm font-extrabold rounded-lg transition ${
                viewMode === 'grid' ? 'bg-emerald-500 text-slate-950' : 'text-slate-300'
              }`}
            >
              🗂️ ดูทั้งหมด ({effectiveWorkouts.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode('focus')
                setFocusIndex(0)
              }}
              className={`px-3.5 py-1.5 text-xs sm:text-sm font-extrabold rounded-lg transition ${
                viewMode === 'focus' ? 'bg-emerald-500 text-slate-950' : 'text-slate-300'
              }`}
            >
              🎯 ดูทีละท่า (เต็มจอ)
            </button>
          </div>

          {viewMode === 'focus' && effectiveWorkouts.length > 1 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={safeFocusIndex === 0}
                onClick={() => setFocusIndex(prev => Math.max(0, prev - 1))}
                className="px-3.5 py-1.5 text-xs sm:text-sm font-black bg-slate-800 rounded-xl disabled:opacity-40"
              >
                ← ก่อนหน้า
              </button>
              <span className="text-xs sm:text-sm font-black text-emerald-400">
                {safeFocusIndex + 1} / {effectiveWorkouts.length}
              </span>
              <button
                type="button"
                disabled={safeFocusIndex === effectiveWorkouts.length - 1}
                onClick={() =>
                  setFocusIndex(prev => Math.min(effectiveWorkouts.length - 1, prev + 1))
                }
                className="px-3.5 py-1.5 text-xs sm:text-sm font-black bg-emerald-600 rounded-xl disabled:opacity-40"
              >
                ถัดไป →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Grid การ์ดท่าออกกำลังกาย (ตัวหนังสือใหญ่พิเศษ อ่านง่าย ไม่รก) */}
      <div className={viewMode === 'focus' ? 'max-w-2xl mx-auto' : 'grid grid-cols-1 gap-5 md:grid-cols-2'}>
        {cardsToRender.map((item, idx) => {
          const actualNumber = viewMode === 'focus' ? safeFocusIndex + 1 : idx + 1
          const isWarmupEx =
            item.is_warmup === true ||
            item.muscle === 'Warmup' ||
            String(item.name || '').includes('[วอร์ม')
          const existsInParent = todayWorkouts.some(w => w.uuid === item.uuid)

          const setsNum = Math.max(1, parseInt(item.sets) || (isWarmupEx ? 2 : 3))
          const repsNum = Math.max(1, parseInt(item.reps) || (isWarmupEx ? 15 : 12))
          const weightNum = parseFloat(item.weight) || 0
          const loadMeta = getEquipmentLoadMeta(item)

          const effortEval = evaluateTrainingContinuityAndEffort({
            item,
            profile,
            allHistoricalLogs,
            referenceDate: selectedDate
          })

          const itemKcal =
            typeof calculateItemCalories === 'function'
              ? calculateItemCalories(item, effortEval.autoRpe)
              : 15
          const hasCustomKcal =
            item.custom_kcal !== undefined && item.custom_kcal !== '' && item.custom_kcal !== null
          const itemMins = estimateExerciseDurationMins(item)
          const shortWarmupTip = getShortWarmupTip(item)
          const videoLink = getExerciseYouTubeUrl(item.name)

          const completedSetsArr = existsInParent
            ? Array.isArray(item.completed_sets)
              ? item.completed_sets
              : []
            : Array.isArray(localWarmupSetsDoneMap[item.uuid])
              ? localWarmupSetsDoneMap[item.uuid]
              : []
          const isAllSetsDone = item.muscle !== 'Cardio' && completedSetsArr.length >= setsNum

          const cardioKinematics =
            item.muscle === 'Cardio'
              ? analyzeCardioKinematics({
                  durationMins: item.duration,
                  distanceKm: item.distance_km,
                  inclinePercent: item.incline,
                  userWeightKg: profile?.weight_kg || 70,
                  notes: item.notes
                })
              : null

          const cleanRawName = String(item.name || '').replace(/🔥\s*\[[^\]]+\]\s*/g, '')
          const titleParts = cleanRawName.split('(')
          const englishTitle = titleParts[0].trim()
          const thaiSubtitle = titleParts[1]
            ? titleParts[1].replace(')', '').trim()
            : item.sub_muscle

          const isPlankHold =
            item?.is_timed === true ||
            String(item?.name || '').toLowerCase().includes('plank') ||
            String(item?.name || '').includes('แพลงก์')

          return (
            <div
              key={item.uuid}
              className={`flex flex-col justify-between bg-white border-2 rounded-3xl overflow-hidden shadow-sm transition-all ${
                isAllSetsDone
                  ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                  : isWarmupEx
                    ? 'border-amber-400'
                    : 'border-slate-200'
              }`}
            >
              <div>
                {/* ภาพจำลองท่าออกกำลังกาย 2 มุมมอง */}
                <div className="p-3 pb-0">
                  <ExerciseIllustration
                    name={item.name}
                    muscle={isWarmupEx ? 'Warmup' : item.muscle}
                    type={item.type}
                    size="xl"
                  />
                </div>

                {/* หัวข้อท่าฝึก (ตัวหนังสือใหญ่ อ่านง่าย) */}
                <div className="p-5 space-y-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`px-3 py-1 text-xs sm:text-sm font-black rounded-lg ${
                            isWarmupEx
                              ? 'bg-amber-400 text-slate-950'
                              : 'bg-slate-900 text-white'
                          }`}
                        >
                          {isWarmupEx ? `🔥 ท่าวอร์มร่างกาย` : `ท่าที่ #${actualNumber}`}
                        </span>
                        <span className="px-2.5 py-1 text-xs sm:text-sm font-bold text-slate-700 bg-slate-100 rounded-lg">
                          ⏱️ ~{isWarmupEx ? 3 : itemMins} นาที
                        </span>
                      </div>

                      {/* ชื่อภาษาไทยตัวใหญ่ชัดเจน */}
                      <h3 className="text-lg sm:text-xl font-black text-slate-900 leading-snug mt-2">
                        {thaiSubtitle || englishTitle}
                      </h3>
                      <p className="text-sm sm:text-base font-bold text-emerald-700 mt-0.5">
                        {englishTitle}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {existsInParent && (
                        <button
                          type="button"
                          onClick={() => onQuickSwap(item.uuid)}
                          className="px-3 py-2 text-xs sm:text-sm font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-xl hover:bg-indigo-100"
                        >
                          🔄 สลับ
                        </button>
                      )}
                      <a
                        href={videoLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 text-xs sm:text-sm font-extrabold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl hover:bg-rose-100"
                      >
                        ▶ คลิป
                      </a>
                      {(existsInParent || isWarmupEx) && (
                        <button
                          type="button"
                          onClick={() => {
                            if (isWarmupEx) {
                              setDismissedWarmups(prev => ({ ...prev, [selectedDate]: true }))
                            }
                            if (existsInParent && typeof onRemoveExercise === 'function') {
                              onRemoveExercise(item.uuid)
                            }
                          }}
                          className="p-2 text-base font-bold text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                          title={isWarmupEx ? 'ลบท่าวอร์มนี้ออกจากการ์ด' : 'ลบท่านี้'}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {/* แถบแนะนำการวอร์มสั้นๆ 1 บรรทัด ตัวใหญ่ ไม่รก */}
                  <div className="px-3.5 py-2.5 text-xs sm:text-sm font-extrabold text-amber-950 bg-amber-50 border border-amber-300 rounded-2xl">
                    {shortWarmupTip}
                  </div>

                  {/* ตัวเลข BIG NUMBERS: เซ็ต / ครั้ง หรือ วินาที / น้ำหนัก (ตัวใหญ่ กดง่ายบนมือถือ) */}
                  {item.muscle !== 'Cardio' ? (
                    <div className="grid grid-cols-3 gap-2.5">
                      {/* 1. เซ็ต */}
                      <div className="p-3 text-center bg-slate-900 text-white rounded-2xl">
                        <span className="text-xs font-extrabold text-slate-300 block">
                          จำนวนเซ็ต
                        </span>
                        <div className="flex items-center justify-center gap-2 mt-1.5">
                          {existsInParent && (
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateStats(item.uuid, 'sets', Math.max(1, setsNum - 1))
                              }
                              className="w-8 h-8 sm:w-9 sm:h-9 text-base font-black bg-slate-800 rounded-xl hover:bg-slate-700"
                            >
                              -
                            </button>
                          )}
                          <span className="text-2xl sm:text-3xl font-black text-emerald-400">
                            {setsNum}
                          </span>
                          {existsInParent && (
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateStats(item.uuid, 'sets', Math.min(10, setsNum + 1))
                              }
                              className="w-8 h-8 sm:w-9 sm:h-9 text-base font-black bg-slate-800 rounded-xl hover:bg-slate-700"
                            >
                              +
                            </button>
                          )}
                        </div>
                        <span className="text-xs text-slate-400 block mt-0.5">เซ็ต</span>
                      </div>

                      {/* 2. ครั้ง หรือ วินาที */}
                      <div className="p-3 text-center bg-slate-900 text-white rounded-2xl">
                        <span className="text-xs font-extrabold text-slate-300 block">
                          {isPlankHold ? '⏱️ เวลาค้าง' : 'จำนวนครั้ง'}
                        </span>
                        <div className="flex items-center justify-center gap-2 mt-1.5">
                          {existsInParent && (
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateStats(
                                  item.uuid,
                                  'reps',
                                  isPlankHold ? Math.max(10, repsNum - 5) : Math.max(1, repsNum - 1)
                                )
                              }
                              className="w-8 h-8 sm:w-9 sm:h-9 text-base font-black bg-slate-800 rounded-xl hover:bg-slate-700 cursor-pointer"
                            >
                              -
                            </button>
                          )}
                          <span className="text-2xl sm:text-3xl font-black text-sky-400">
                            {repsNum}
                          </span>
                          {existsInParent && (
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateStats(
                                  item.uuid,
                                  'reps',
                                  isPlankHold ? repsNum + 5 : repsNum + 1
                                )
                              }
                              className="w-8 h-8 sm:w-9 sm:h-9 text-base font-black bg-slate-800 rounded-xl hover:bg-slate-700 cursor-pointer"
                            >
                              +
                            </button>
                          )}
                        </div>
                        <span className="text-xs text-slate-400 block mt-0.5">
                          {isPlankHold ? 'วินาที (Seconds)' : loadMeta.isPerSide ? 'ครั้ง/ข้าง' : 'ครั้ง'}
                        </span>
                      </div>

                      {/* 3. น้ำหนัก */}
                      <div className="p-3 text-center bg-emerald-950 text-white border border-emerald-700 rounded-2xl">
                        <span className="text-xs font-extrabold text-emerald-300 block">
                          {isPlankHold
                            ? 'แรงต้าน'
                            : isWarmupEx
                              ? 'น้ำหนัก'
                              : loadMeta.isPerSide
                                ? 'กก./ข้าง'
                                : 'น้ำหนัก (kg)'}
                        </span>
                        <div className="flex items-center justify-center gap-1.5 mt-1.5">
                          {existsInParent && !isWarmupEx && !isPlankHold && (
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateStats(item.uuid, 'weight', Math.max(0, weightNum - 2.5))
                              }
                              className="w-8 h-8 sm:w-9 sm:h-9 text-base font-black bg-emerald-900 rounded-xl hover:bg-emerald-800"
                            >
                              -
                            </button>
                          )}
                          {existsInParent && !isWarmupEx && !isPlankHold ? (
                            <input
                              type="number"
                              step="0.5"
                              value={item.weight}
                              onChange={(e) => onUpdateStats(item.uuid, 'weight', e.target.value)}
                              className="w-16 text-center text-2xl sm:text-3xl font-black text-white bg-transparent border-b border-emerald-500 focus:outline-none"
                            />
                          ) : (
                            <span className="text-xl sm:text-2xl font-black text-emerald-300 py-1">
                              {isPlankHold ? 'ตัวเปล่า' : 'ตัวเปล่า'}
                            </span>
                          )}
                          {existsInParent && !isWarmupEx && !isPlankHold && (
                            <button
                              type="button"
                              onClick={() => onUpdateStats(item.uuid, 'weight', weightNum + 2.5)}
                              className="w-8 h-8 sm:w-9 sm:h-9 text-base font-black bg-emerald-900 rounded-xl hover:bg-emerald-800"
                            >
                              +
                            </button>
                          )}
                        </div>
                        <span className="text-xs text-emerald-300 block mt-0.5">
                          {isPlankHold
                            ? 'เกร็งค้างต้านแรงโน้มถ่วง'
                            : isWarmupEx
                              ? 'มือเปล่า'
                              : `แนะนำ ~${effortEval.expectedWorkingWeight} kg`}
                        </span>
                      </div>
                    </div>
                  ) : (
                    /* กรณีเป็นการ์ด Cardio / ลู่วิ่ง */
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div className="p-3 text-center bg-slate-900 text-white rounded-2xl">
                        <span className="text-xs font-extrabold text-slate-300 block">เวลา</span>
                        <input
                          type="number"
                          step="1"
                          value={item.duration}
                          onChange={(e) => onUpdateStats(item.uuid, 'duration', e.target.value)}
                          className="w-16 mt-1 text-center text-2xl sm:text-3xl font-black text-sky-400 bg-transparent border-b border-slate-600 focus:outline-none"
                        />
                        <span className="text-xs text-slate-400 block mt-0.5">นาที</span>
                      </div>

                      <div className="p-3 text-center bg-emerald-950 text-white border-2 border-emerald-500 rounded-2xl">
                        <span className="text-xs font-extrabold text-emerald-300 block">
                          ระยะทาง
                        </span>
                        <input
                          type="number"
                          step="0.05"
                          value={item.distance_km}
                          onChange={(e) => onUpdateStats(item.uuid, 'distance_km', e.target.value)}
                          className="w-20 mt-1 text-center text-2xl sm:text-3xl font-black text-white bg-transparent border-b border-emerald-400 focus:outline-none"
                        />
                        <span className="text-xs text-emerald-300 block mt-0.5">กม. (Km)</span>
                      </div>

                      <div className="p-3 text-center bg-slate-900 text-white rounded-2xl">
                        <span className="text-xs font-extrabold text-slate-300 block">ความชัน</span>
                        <input
                          type="number"
                          step="0.5"
                          value={item.incline}
                          onChange={(e) => onUpdateStats(item.uuid, 'incline', e.target.value)}
                          className="w-16 mt-1 text-center text-2xl sm:text-3xl font-black text-amber-400 bg-transparent border-b border-slate-600 focus:outline-none"
                        />
                        <span className="text-xs text-slate-400 block mt-0.5">Incline %</span>
                      </div>

                      <div className="p-3 text-center bg-sky-950 text-white border border-sky-700 rounded-2xl">
                        <span className="text-xs font-extrabold text-sky-300 block">ความเร็ว</span>
                        <input
                          type="number"
                          step="0.1"
                          value={cardioKinematics?.speedKmh ?? item.speed_kmh ?? 3.5}
                          onChange={(e) => onUpdateStats(item.uuid, 'speed_kmh', e.target.value)}
                          className="w-16 mt-1 text-center text-2xl sm:text-3xl font-black text-white bg-transparent border-b border-sky-500 focus:outline-none"
                        />
                        <span className="text-xs text-sky-300 block mt-0.5">km/h</span>
                      </div>
                    </div>
                  )}

                  {/* แถบแคลอรี่กระชับ 1 บรรทัด ตัวใหญ่ชัดเจน */}
                  <div className="p-3 bg-orange-50 border border-orange-200 rounded-2xl flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm sm:text-base font-black text-orange-900">
                      🔥 เผาผลาญ: {isWarmupEx ? 14 : itemKcal} kcal
                    </span>

                    {existsInParent && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-orange-800">แคลจริง:</span>
                        <input
                          type="number"
                          placeholder={String(itemKcal)}
                          value={item.custom_kcal ?? ''}
                          onChange={(e) => onUpdateStats(item.uuid, 'custom_kcal', e.target.value)}
                          className="w-20 px-2.5 py-1.5 text-sm font-black text-center text-orange-950 bg-white border border-orange-300 rounded-xl focus:outline-none"
                        />
                        {hasCustomKcal && (
                          <button
                            type="button"
                            onClick={() => onUpdateStats(item.uuid, 'custom_kcal', null)}
                            className="px-2.5 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-300 rounded-xl"
                          >
                            รีเซ็ต
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ส่วนท้ายการ์ด: ปุ่มกดเช็กเซ็ตขนาดใหญ่ กดง่ายบนมือถือ */}
              {item.muscle !== 'Cardio' && (
                <div className="px-5 py-4 bg-slate-50 border-t border-slate-200">
                  {/* Plank Hold Live Timer Control: มีปุ่มให้กดเริ่มนับถอยหลัง หรือบันทึกเวลาที่ทำได้จริง */}
                  {isPlankHold && existsInParent && (
                    <div className="mb-3.5 p-3.5 bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-950 text-white rounded-2xl border-2 border-indigo-500/60 shadow-md">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <span className="text-2xl animate-pulse">⏱️</span>
                          <div>
                            <div className="text-xs sm:text-sm font-black text-indigo-300">
                              {activePlankTimer?.uuid === item.uuid
                                ? `🔥 กำลังแพลงก์เซ็ตที่ ${activePlankTimer.setNumber}...`
                                : `จับเวลาแพลงก์ (เป้าหมาย ${repsNum} วินาที)`}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {activePlankTimer?.uuid === item.uuid
                                ? 'เกร็งหน้าท้อง หายใจสม่ำเสมอ ก้นไม่โด่ง หลังไม่แอ่น'
                                : 'กดเริ่มจับเวลา หรือเลือกระยะเวลาเป้าหมายด้านล่าง'}
                            </div>
                          </div>
                        </div>

                        {activePlankTimer?.uuid === item.uuid ? (
                          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                            <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-emerald-400/80 text-emerald-400 font-mono text-xl sm:text-2xl font-black">
                              {Math.max(0, activePlankTimer.targetSec - activePlankTimer.elapsedSec)}s
                            </div>
                            <button
                              type="button"
                              onClick={() => handleStopPlankTimer(item, true)}
                              className="px-4 py-2 text-xs sm:text-sm font-black text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl shadow-xs transition cursor-pointer"
                              title="หยุดและบันทึกเวลาจริงที่ทำได้"
                            >
                              ✓ บันทึกจริง ({activePlankTimer.elapsedSec} วิ)
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStopPlankTimer(item, false)}
                              className="px-2.5 py-2 text-xs font-bold text-rose-400 hover:text-white bg-slate-800 rounded-xl transition cursor-pointer"
                              title="ยกเลิกการจับเวลา"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto justify-end">
                            <span className="text-[11px] font-bold text-slate-400 mr-1 hidden sm:inline">ตั้งเวลา:</span>
                            {[30, 45, 60, 90].map(sec => (
                              <button
                                key={sec}
                                type="button"
                                onClick={() => onUpdateStats(item.uuid, 'reps', sec)}
                                className={`px-2.5 py-1 text-xs font-black rounded-lg transition cursor-pointer ${
                                  repsNum === sec
                                    ? 'bg-amber-400 text-slate-950 shadow-xs'
                                    : 'bg-slate-800 text-slate-300 hover:text-white'
                                }`}
                              >
                                {sec}วิ
                              </button>
                            ))}
                            <button
                              type="button"
                              onClick={() => handleStartPlankTimer(item, repsNum)}
                              className="px-4 py-2 text-xs sm:text-sm font-black text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5"
                            >
                              <span>▶</span>
                              <span>เริ่มจับเวลาแพลงก์</span>
                            </button>
                          </div>
                        )}
                      </div>
                      
                      {/* แถบหลอดความคืบหน้าขณะกำลังแพลงก์ */}
                      {activePlankTimer?.uuid === item.uuid && (
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-3">
                          <div
                            className="bg-gradient-to-r from-indigo-400 via-teal-400 to-emerald-400 h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${Math.min(100, (activePlankTimer.elapsedSec / activePlankTimer.targetSec) * 100)}%`
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-extrabold text-slate-700">
                        {isWarmupEx
                          ? 'กดเมื่อวอร์มครบแต่ละรอบ:'
                          : 'กดเมื่อยกจบเซ็ต:'}
                      </span>
                      {!isWarmupEx && existsInParent && (
                        <div className="inline-flex items-center bg-slate-200/90 p-0.5 rounded-xl text-xs font-black">
                          <button
                            type="button"
                            onClick={() => onUpdateStats(item.uuid, 'rest_sec', 60)}
                            className={`px-2 py-0.5 rounded-lg transition cursor-pointer ${
                              (parseInt(item.rest_sec) || 90) === 60
                                ? 'bg-amber-400 text-slate-950 shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                            title="พัก 1 นาที (เหมาะกับมัดเล็ก/บอดี้เวท)"
                          >
                            ⚡ พัก 60 วิ
                          </button>
                          <button
                            type="button"
                            onClick={() => onUpdateStats(item.uuid, 'rest_sec', 90)}
                            className={`px-2 py-0.5 rounded-lg transition cursor-pointer ${
                              (parseInt(item.rest_sec) || 90) === 90
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                            title="พัก 1.5 นาที (ฟื้นพลัง ATP เต็มที่สำหรับท่าหนัก)"
                          >
                            🔥 พัก 90 วิ
                          </button>
                        </div>
                      )}
                    </div>
                    <span className="text-xs sm:text-sm font-black text-emerald-700">
                      สำเร็จ {completedSetsArr.length}/{setsNum} เซ็ต
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {Array.from({ length: Math.min(8, setsNum) }, (_, sIdx) => {
                      const setNumber = sIdx + 1
                      const isDone = completedSetsArr.includes(setNumber)
                      return (
                        <button
                          key={setNumber}
                          type="button"
                          onClick={() => handleToggleCardSet(item, setNumber)}
                          className={`py-3 text-sm sm:text-base font-black rounded-2xl border-2 transition-all ${
                            isDone
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                              : isWarmupEx
                                ? 'bg-amber-50 text-amber-950 border-amber-300 hover:border-amber-500'
                                : 'bg-white text-slate-800 border-slate-300 hover:border-emerald-500'
                          }`}
                        >
                          {isDone
                            ? `✓ ${isWarmupEx ? 'วอร์ม' : 'เซ็ต'} ${setNumber}`
                            : `${isWarmupEx ? 'วอร์ม' : 'เซ็ต'} ${setNumber}`}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}