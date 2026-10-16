import { useState } from 'react'
import ExerciseIllustration, { getExerciseYouTubeUrl } from './ExerciseIllustration'
import {
  MASTER_EXERCISE_LIBRARY,
  injectWarmupIntoProgram,
  getSetBySetWarmupGuide
} from './ExerciseModal'
import {
  getEquipmentLoadMeta,
  estimateExerciseDurationMins,
  analyzeCardioKinematics,
  evaluateTrainingContinuityAndEffort
} from '../utils/workoutEngine'
import { calculateWarmupProtocol } from './LiveGymToolbar'

// Helper ดึงชื่อโปรแกรมที่เลือกจริงจากรายการท่าฝึก (ไม่เด้งชื่อโปรแกรมเองถ้ายังไม่ได้เลือก)
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

// เช็กลิสต์การฟื้นฟูร่างกายในวันพัก (Rest Day Recovery Checklist)
const REST_DAY_CHECKLIST_ITEMS = [
  {
    id: 'water',
    icon: '💧',
    title: 'ดื่มน้ำเปล่าให้ถึงเป้า 2.5 – 3.0 ลิตรตลอดวัน',
    detail: 'ช่วยขับกรดแลคติกและส่งสารอาหารเข้าซ่อมแซมเส้นใยกล้ามเนื้อที่ฉีกขาดจากการฝึก'
  },
  {
    id: 'protein',
    icon: '🥩',
    title: 'ทานโปรตีนให้ถึงเกณฑ์แม้ไม่ได้ยกเวท',
    detail: 'กล้ามเนื้อเติบโตและซ่อมแซมตัวเองสูงสุดในช่วง 24–48 ชั่วโมงของวันพักฟื้น'
  },
  {
    id: 'stretch',
    icon: '🧘‍♂️',
    title: 'ยืดเหยียดกล้ามเนื้อหรือนวดคลายพังผืด (Foam Roll) 10–15 นาที',
    detail: 'เน้นคลายสะโพก ต้นขาด้านหลัง น่อง และสะบักหลัง เพื่อเพิ่มองศาการเคลื่อนไหว'
  },
  {
    id: 'walk',
    icon: '🚶‍♂️',
    title: 'เดินเล่นเบาๆ (Active Recovery) สะสม 5,000 – 7,000 ก้าว',
    detail: 'กระตุ้นการไหลเวียนเลือดให้ลดอาการปวดตึงกล้ามเนื้อ (DOMS) เร็วขึ้นโดยไม่สร้างความล้าเพิ่ม'
  },
  {
    id: 'sleep',
    icon: '😴',
    title: 'นอนหลับลึกอย่างน้อย 7.5 – 8 ชั่วโมงในคืนนี้',
    detail: 'ช่วงหลับลึก (Deep Sleep) ร่างกายจะหลั่ง Growth Hormone สูงสุดเพื่อฟื้นฟูระบบประสาทและข้อต่อ'
  }
]

export default function DailyHeroCards({
  todayWorkouts = [],
  profile,
  allHistoricalLogs = [],
  selectedDate,
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
  // สถานะความพร้อมร่างกายประจำวัน: 'high' | 'busy' | 'sore'
  const [energyCheckIn, setEnergyCheckIn] = useState('high')
  const [restCheckedMap, setRestCheckedMap] = useState({
    water: true,
    protein: true,
    stretch: false,
    walk: false,
    sleep: false
  })
  const [restDayNote, setRestDayNote] = useState('พักฟื้นกล้ามเนื้อและระบบประสาทตามรอบสัปดาห์')

  // เก็บสถานะการติ๊กเช็กขั้นตอนวอร์มร่างกายรายท่า และเซ็ตของการ์ดวอร์มอัตโนมัติ
  const [warmupStepDoneMap, setWarmupStepDoneMap] = useState({})
  const [localWarmupSetsDoneMap, setLocalWarmupSetsDoneMap] = useState({})

  const totalCatalogCount = MASTER_EXERCISE_LIBRARY.length
  const detectedProgramTitle = extractActiveProgramTitle(todayWorkouts, selectedProgramTitle)

  // ตรวจสอบว่าวันนี้ถูกบันทึกเป็นวันพักไว้หรือไม่
  const isSavedRestDay =
    isRestDayMode ||
    detectedProgramTitle.includes('วันพักฟื้นร่างกาย') ||
    (todayWorkouts.length === 1 && todayWorkouts[0]?.muscle === 'Rest')

  // บังคับแทรกการ์ดท่าวอร์มร่างกาย 2 ท่าแรกอัตโนมัติสำหรับทุกโปรแกรมที่มีท่าฝึก
  const effectiveWorkouts =
    !isSavedRestDay && todayWorkouts.length > 0
      ? injectWarmupIntoProgram(todayWorkouts, detectedProgramTitle).map((it, idx) => ({
          ...it,
          name: it.name || it.exercise_name || 'ท่าออกกำลังกาย',
          uuid: it.uuid || `auto-warmup-${selectedDate}-${idx}`
        }))
      : todayWorkouts

  const safeFocusIndex = Math.min(focusIndex, Math.max(0, effectiveWorkouts.length - 1))

  const handleToggleRestCheck = (id) => {
    setRestCheckedMap(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const handleToggleWarmupStep = (cardUuid, stepId) => {
    const key = `${cardUuid}::${stepId}`
    setWarmupStepDoneMap(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleToggleCardSet = (item, setNumber) => {
    const existsInParent = todayWorkouts.some(w => w.uuid === item.uuid)
    if (existsInParent && typeof onToggleSetComplete === 'function') {
      onToggleSetComplete(item.uuid, setNumber)
      return
    }
    // กรณีเป็นการ์ดท่าวอร์มที่ระบบแทรกให้อัตโนมัติหน้างาน
    setLocalWarmupSetsDoneMap(prev => {
      const currentArr = Array.isArray(prev[item.uuid]) ? prev[item.uuid] : []
      const nextArr = currentArr.includes(setNumber)
        ? currentArr.filter(s => s !== setNumber)
        : [...currentArr, setNumber]
      return { ...prev, [item.uuid]: nextArr }
    })
  }

  const completedRestChecks = Object.values(restCheckedMap).filter(Boolean).length

  // =========================================================================
  // โหมดที่ 1: หน้าจอวันพักฟื้นร่างกาย (REST & ACTIVE RECOVERY DAYHUB)
  // =========================================================================
  if (isSavedRestDay) {
    return (
      <div className="p-6 sm:p-8 bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 text-white border-2 border-emerald-500/60 rounded-3xl shadow-xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-emerald-800/60">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-400 text-slate-950 flex items-center justify-center text-3xl font-black shrink-0 shadow-md">
              🛌
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-0.5 text-[10px] font-black uppercase bg-emerald-400 text-slate-950 rounded-full">
                  REST & MUSCLE RECOVERY DAY
                </span>
                <span className="px-2.5 py-0.5 text-[11px] font-bold bg-slate-800 text-emerald-300 border border-emerald-700 rounded-full">
                  ประจำวันที่ {selectedDate}
                </span>
              </div>
              <h2 className="mt-2 text-xl sm:text-2xl font-black text-white">
                วันนี้คือ &ldquo;วันพักฟื้นและซ่อมแซมกล้ามเนื้อ&rdquo; ของคุณ
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-emerald-200/90 max-w-2xl">
                การพักที่ถูกวิธีไม่ใช่การหยุดพัฒนา แต่คือช่วงเวลาที่เส้นใยกล้ามเนื้อ ข้อต่อ และระบบประสาทส่วนกลาง (CNS) ฟื้นตัวให้แข็งแกร่งกว่าเดิมเพื่อพร้อมลุยในวันถัดไป
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {typeof onSetRestDayMode === 'function' && (
              <button
                type="button"
                onClick={() => onSetRestDayMode(false)}
                className="px-4 py-2 text-xs font-extrabold text-slate-200 bg-slate-800 border border-slate-600 rounded-xl hover:bg-slate-700 transition"
              >
                ↩ เปลี่ยนใจกลับไปเลือกตารางฝึก
              </button>
            )}
          </div>
        </div>

        {/* เช็กลิสต์ภารกิจฟื้นฟูร่างกาย 5 ข้อสำหรับวันพัก */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-emerald-300 uppercase">
              ✅ เช็กลิสต์ภารกิจฟื้นฟูร่างกายในวันพัก ({completedRestChecks}/{REST_DAY_CHECKLIST_ITEMS.length} ข้อ)
            </h3>
            <span className="text-xs font-bold text-amber-300">
              ความสมบูรณ์ของการพักฟื้น: {Math.round((completedRestChecks / REST_DAY_CHECKLIST_ITEMS.length) * 100)}%
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {REST_DAY_CHECKLIST_ITEMS.map(item => {
              const checked = Boolean(restCheckedMap[item.id])
              return (
                <div
                  key={item.id}
                  onClick={() => handleToggleRestCheck(item.id)}
                  className={`p-4 rounded-2xl border cursor-pointer transition flex items-start gap-3 ${
                    checked
                      ? 'bg-emerald-900/50 border-emerald-400 text-white shadow-sm'
                      : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-emerald-700'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black shrink-0 mt-0.5 ${
                      checked ? 'bg-emerald-400 text-slate-950' : 'bg-slate-800 text-slate-500 border border-slate-700'
                    }`}
                  >
                    {checked ? '✓' : ''}
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-black">
                      {item.icon} {item.title}
                    </div>
                    <p className="text-[11px] text-slate-300/80 mt-0.5 leading-relaxed">
                      {item.detail}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* บันทึกเพิ่มเติมของวันพัก + ปุ่มบันทึกวันพักลงปฏิทิน */}
        <div className="p-4 bg-slate-900/90 border border-emerald-800/60 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex-1 space-y-1">
            <label className="text-[11px] font-extrabold text-emerald-300 block">
              📝 บันทึกอาการตึงกล้ามเนื้อ / เหตุผลของการพักวันนี้:
            </label>
            <input
              type="text"
              value={restDayNote}
              onChange={(e) => setRestDayNote(e.target.value)}
              placeholder="เช่น พักขาหลังซ้อมเดินชันหนักเมื่อวาน / นอนพักผ่อนเต็มที่..."
              className="w-full px-3.5 py-2 text-xs font-bold text-white bg-slate-950 border border-slate-700 rounded-xl outline-none focus:border-emerald-400"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {typeof onQuickModeSelect === 'function' && (
              <button
                type="button"
                onClick={() => onQuickModeSelect('mobility')}
                className="px-4 py-2.5 text-xs font-extrabold text-amber-300 bg-amber-950/80 border border-amber-500/50 rounded-xl hover:bg-amber-900/80 transition"
              >
                🧘‍♂️ เปลี่ยนเป็นยืดเหยียดเบาๆ 15 นาทีแทน
              </button>
            )}
            {typeof onSaveRestDayRecord === 'function' && (
              <button
                type="button"
                disabled={isSaving}
                onClick={() =>
                  onSaveRestDayRecord(
                    `[โปรแกรม: 🛌 วันพักฟื้นร่างกาย (Rest Day)] เช็กลิสต์ฟื้นฟู ${completedRestChecks}/5 ข้อ • ${restDayNote}`
                  )
                }
                className="px-5 py-2.5 text-xs font-black text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl shadow-md transition"
              >
                {isSaving ? 'กำลังบันทึก...' : '💾 บันทึกวันนี้เป็น "วันพักฟื้น" ลงปฏิทิน'}
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // =========================================================================
  // โหมดที่ 2: เมื่อยังไม่ได้เลือกโปรแกรมในวันนี้ (แสดงแผงเลือกโหมดอัจฉริยะ)
  // =========================================================================
  if (todayWorkouts.length === 0) {
    return (
      <div className="p-6 sm:p-8 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="inline-block px-3 py-1 text-xs font-extrabold text-emerald-800 bg-emerald-100 rounded-full">
            DAILY WORKOUT & RECOVERY COMMAND HUB
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">
            วันนี้ ({selectedDate}) คุณอยากให้ร่างกายอยู่ในโหมดไหน?
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            ทุกโปรแกรมที่คุณเลือก ระบบจะจัด **🔥 ท่าวอร์มร่างกายก่อนฝึก** และ **คู่มือเซ็ตวอร์มสำหรับมือใหม่** ให้อัตโนมัติครบทุกท่า
          </p>
        </div>

        {/* ขั้นตอนที่ 1: เช็กพลังงานและความพร้อมของร่างกายวันนี้ */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-black text-slate-800">
              🔋 1. เช็กสภาพร่างกายและเวลาของคุณในวันนี้:
            </span>
            <span className="text-[11px] font-semibold text-slate-500">
              คลิกเลือกเพื่อให้ระบบไฮไลต์โหมดที่เหมาะที่สุด
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {[
              {
                id: 'high',
                icon: '🔥',
                title: 'ฟิตเต็มร้อย พร้อมลุย!',
                desc: 'มีเวลา 45–60 นาที พร้อมวอร์ม + ยกเวท + เดินชันเต็มรูปแบบ'
              },
              {
                id: 'busy',
                icon: '⏱️',
                title: 'เวลาน้อย / ซ้อมที่ห้อง',
                desc: 'มีเวลาแค่ 15–25 นาที หรือไม่ได้เดินทางไปยิม'
              },
              {
                id: 'sore',
                icon: '😴',
                title: 'เพลีย / ปวดตึงกล้ามเนื้อ',
                desc: 'เมื่อยล้าจากเมื่อวาน นอนน้อย หรืออยากพักฟื้นร่างกาย'
              }
            ].map(st => {
              const active = energyCheckIn === st.id
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setEnergyCheckIn(st.id)}
                  className={`p-3.5 rounded-2xl border text-left transition ${
                    active
                      ? 'bg-slate-900 text-white border-slate-900 ring-2 ring-emerald-500 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
                  }`}
                >
                  <div className="text-xs sm:text-sm font-black">
                    {st.icon} {st.title}
                  </div>
                  <div className={`text-[11px] mt-0.5 ${active ? 'text-slate-300' : 'text-slate-500'}`}>
                    {st.desc}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* ขั้นตอนที่ 2: การ์ดตัวเลือกโหมดประจำวันครบทุกสถานการณ์ */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* ตัวเลือกที่ 1: แผนเวทประจำวันตามรอบกล้ามเนื้อ */}
          <div
            className={`p-5 rounded-2xl border-2 flex flex-col justify-between transition ${
              energyCheckIn === 'high'
                ? 'bg-emerald-50/70 border-emerald-500 shadow-sm'
                : 'bg-white border-slate-200 hover:border-emerald-400'
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="px-2.5 py-0.5 text-[10px] font-black text-white bg-emerald-600 rounded-md uppercase">
                  AI RECOMMENDED + WARM-UP
                </span>
                <span className="text-xl">⚡</span>
              </div>
              <h3 className="text-sm sm:text-base font-black text-slate-900">
                1. ฝึกตามรอบตาราง: {activeDayPlanObj?.module?.title}
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                {activeDayPlanObj?.statusReason} • จัดท่าวอร์มร่างกาย + ท่าเวท + คาร์ดิโอที่เหมาะกับอุปกรณ์ของคุณให้อัตโนมัติ
              </p>
            </div>
            <button
              type="button"
              onClick={onGenerateRecommended}
              className="w-full py-2.5 px-4 mt-4 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition"
            >
              ⚡ โหลดการ์ดแผนประจำวันนี้ (พร้อมท่าวอร์ม)
            </button>
          </div>

          {/* ตัวเลือกที่ 2: คลังโปรแกรมพิเศษ / 30 อุทยาน / ตารางมาตรฐาน */}
          <div
            className={`p-5 rounded-2xl border-2 flex flex-col justify-between transition ${
              energyCheckIn === 'high'
                ? 'bg-pink-50/50 border-pink-400 shadow-sm'
                : 'bg-white border-slate-200 hover:border-pink-400'
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="px-2.5 py-0.5 text-[10px] font-black text-white bg-pink-600 rounded-md uppercase">
                  30 PARKS • HERO • SCIENCE
                </span>
                <span className="text-xl">🏔️</span>
              </div>
              <h3 className="text-sm sm:text-base font-black text-slate-900">
                2. เลือกโปรแกรมพิเศษ / ซ้อมเดินป่า 30 อุทยาน / ตารางมาตรฐาน
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                เลือกตารางซ้อมจำลองความชัน 30 อุทยานไทย, โปรแกรมปั้นหุ่นไวรัล/ฮีโร่ หรือตารางมาตรฐาน 8 รูปแบบ (รวมท่าวอร์มทุกตาราง)
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenPresetModal}
              className="w-full py-2.5 px-4 mt-4 text-xs font-black text-white bg-pink-600 hover:bg-pink-700 rounded-xl shadow-xs transition"
            >
              🔥 เปิดคลังโปรแกรมพิเศษทั้งหมด
            </button>
          </div>

          {/* ตัวเลือกที่ 3: ตั้งวันนี้เป็นวันพักฟื้นร่างกาย (Rest Day) */}
          <div
            className={`p-5 rounded-2xl border-2 flex flex-col justify-between transition ${
              energyCheckIn === 'sore'
                ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-400/40 shadow-sm'
                : 'bg-white border-slate-200 hover:border-amber-400'
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="px-2.5 py-0.5 text-[10px] font-black text-slate-950 bg-amber-400 rounded-md uppercase">
                  REST & RECOVERY DAY
                </span>
                <span className="text-xl">🛌</span>
              </div>
              <h3 className="text-sm sm:text-base font-black text-slate-900">
                3. ตั้งวันนี้เป็น &ldquo;วันพักฟื้นร่างกาย (Rest Day)&rdquo;
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                เมื่อยล้า นอนน้อย หรือติดภารกิจ กดตั้งเป็นวันพักพร้อมเช็กลิสต์ฟื้นฟูกล้ามเนื้อและบันทึกลงปฏิทินได้ทันที
              </p>
            </div>
            <button
              type="button"
              onClick={() => typeof onSetRestDayMode === 'function' && onSetRestDayMode(true)}
              className="w-full py-2.5 px-4 mt-4 text-xs font-black text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl shadow-xs transition"
            >
              🛌 ตั้งวันนี้เป็นวันพักฟื้นร่างกาย
            </button>
          </div>

          {/* ตัวเลือกที่ 4: โหมดยืดเหยียด & คลายปวดเมื่อย 15 นาที */}
          <div
            className={`p-5 rounded-2xl border-2 flex flex-col justify-between transition ${
              energyCheckIn === 'sore'
                ? 'bg-teal-50/70 border-teal-500 shadow-sm'
                : 'bg-white border-slate-200 hover:border-teal-400'
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="px-2.5 py-0.5 text-[10px] font-black text-white bg-teal-600 rounded-md uppercase">
                  ACTIVE MOBILITY 15 MINS
                </span>
                <span className="text-xl">🧘‍♂️</span>
              </div>
              <h3 className="text-sm sm:text-base font-black text-slate-900">
                4. โหมดยืดเหยียดคลายกล้ามเนื้อ & แก้ออฟฟิศซินโดรม
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                เน้นท่าวอร์มและยืดเหยียดเปิดสะบัก คลายหลังส่วนล่าง สะโพก และแกนกลางลำตัว ไม่สร้างความล้าสะสม
              </p>
            </div>
            <button
              type="button"
              onClick={() => typeof onQuickModeSelect === 'function' && onQuickModeSelect('mobility')}
              className="w-full py-2.5 px-4 mt-4 text-xs font-black text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs transition"
            >
              🧘‍♂️ โหลดชุดท่าฟื้นฟู & ยืดเหยียด 15 นาที
            </button>
          </div>

          {/* ตัวเลือกที่ 5: ซ้อมด่วนที่ห้อง 15 นาที ไม่ใช้อุปกรณ์ */}
          <div
            className={`p-5 rounded-2xl border-2 flex flex-col justify-between transition ${
              energyCheckIn === 'busy'
                ? 'bg-indigo-50/70 border-indigo-500 ring-2 ring-indigo-400/30 shadow-sm'
                : 'bg-white border-slate-200 hover:border-indigo-400'
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="px-2.5 py-0.5 text-[10px] font-black text-white bg-indigo-600 rounded-md uppercase">
                  EXPRESS HOME 15 MINS
                </span>
                <span className="text-xl">🏠</span>
              </div>
              <h3 className="text-sm sm:text-base font-black text-slate-900">
                5. ซ้อมด่วนที่บ้าน 15 นาที (บอดี้เวทล้วน ไม่ใช้อุปกรณ์)
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                วันฝนตกหรือไม่ได้เข้ายิม วอร์มร่างกายและกระตุ้นกล้ามเนื้อครบทั้งอก ขา และหน้าท้องในห้องนอนภายใน 15 นาที
              </p>
            </div>
            <button
              type="button"
              onClick={() => typeof onQuickModeSelect === 'function' && onQuickModeSelect('express_home')}
              className="w-full py-2.5 px-4 mt-4 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition"
            >
              🏠 โหลดตารางซ้อมด่วนที่บ้าน 15 นาที
            </button>
          </div>

          {/* ตัวเลือกที่ 6: คาร์ดิโอเดินชันล้วน หรือเลือกท่าเองจากคลัง 95 ท่า */}
          <div
            className={`p-5 rounded-2xl border-2 flex flex-col justify-between transition ${
              energyCheckIn === 'busy'
                ? 'bg-sky-50/70 border-sky-500 shadow-sm'
                : 'bg-white border-slate-200 hover:border-sky-400'
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="px-2.5 py-0.5 text-[10px] font-black text-white bg-sky-600 rounded-md uppercase">
                  CARDIO ONLY / CUSTOM + WARM-UP
                </span>
                <span className="text-xl">🏃‍♂️</span>
              </div>
              <h3 className="text-sm sm:text-base font-black text-slate-900">
                6. คาร์ดิโอเดินชันล้วน หรือเลือกท่าฝึก/ท่าวอร์มเอง ({totalCatalogCount} ท่า)
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                สำหรับวันอยากเดินลู่วิ่งโซน 2 รีดไขมันอย่างเดียว หรือเลือกหยิบท่าวอร์มและท่าที่อยากเล่นเองทีละท่า
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <button
                type="button"
                onClick={() => typeof onQuickModeSelect === 'function' && onQuickModeSelect('cardio_only')}
                className="py-2.5 px-2 text-[11px] font-black text-white bg-sky-600 hover:bg-sky-700 rounded-xl transition"
              >
                🏃‍♂️ คาร์ดิโอล้วน
              </button>
              <button
                type="button"
                onClick={onOpenExerciseModal}
                className="py-2.5 px-2 text-[11px] font-black text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition"
              >
                + เลือกท่าเอง ({totalCatalogCount})
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // =========================================================================
  // โหมดที่ 3: เมื่อมีการ์ดท่าฝึกในวันนี้แล้ว (รวมการ์ดท่าวอร์มร่างกายอัตโนมัติ + คู่มือเซ็ตวอร์มรายท่า)
  // =========================================================================
  const cardsToRender =
    viewMode === 'focus'
      ? [effectiveWorkouts[safeFocusIndex]].filter(Boolean)
      : effectiveWorkouts

  return (
    <div className="space-y-5">
      {/* แบนเนอร์แสดงชื่อโปรแกรมที่เลือกฝึกในวันนี้ พร้อมปุ่มสลับเป็นวันพักหรือล้างตาราง */}
      <div className="p-4 bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 text-white rounded-2xl border border-emerald-700/60 shadow-md flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center text-xl font-black shrink-0">
            🎯
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2 py-0.5 text-[10px] font-black uppercase bg-emerald-400 text-slate-950 rounded">
                ACTIVE PROGRAM TODAY ({selectedDate})
              </span>
              <span className="px-2 py-0.5 text-[10px] font-black uppercase bg-amber-400 text-slate-950 rounded">
                🔥 รวมท่าวอร์มร่างกาย + เซ็ตวอร์มครบทุกท่า
              </span>
              <span className="text-xs font-bold text-emerald-300">
                ประจำ{activeDayPlanObj?.dayNameFull}ที่ {activeDayPlanObj?.dayNum}
              </span>
            </div>
            <div className="text-sm sm:text-base font-black text-amber-300 mt-0.5">
              โปรแกรมที่เลือกวันนี้: {detectedProgramTitle || 'ตารางฝึกกำหนดเอง (Custom Session)'}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onOpenPresetModal}
            className="px-3.5 py-2 text-xs font-black text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition shadow-xs"
          >
            🔄 เปลี่ยนโปรแกรมพิเศษ / 30 อุทยาน
          </button>
          {typeof onSetRestDayMode === 'function' && (
            <button
              type="button"
              onClick={() => onSetRestDayMode(true)}
              className="px-3 py-2 text-xs font-extrabold text-amber-200 bg-slate-800 border border-amber-400/50 hover:bg-slate-700 rounded-xl transition"
            >
              🛌 เปลี่ยนวันนี้เป็นวันพัก
            </button>
          )}
          {typeof onClearTodayWorkouts === 'function' && (
            <button
              type="button"
              onClick={onClearTodayWorkouts}
              className="px-3 py-2 text-xs font-bold text-rose-200 bg-rose-950/70 border border-rose-500/40 hover:bg-rose-900 rounded-xl transition"
              title="ล้างการ์ดวันนี้เพื่อกลับไปหน้าเลือกโหมด"
            >
              🗑️ ล้างตารางวันนี้
            </button>
          )}
        </div>
      </div>

      {/* แถบความรู้สำหรับมือใหม่: กฎเหล็ก 3 ขั้นตอนการวอร์มร่างกายก่อนยกเวท */}
      <div className="p-4 bg-gradient-to-r from-amber-50 via-orange-50 to-emerald-50 border-2 border-amber-300 rounded-2xl flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 text-[10px] font-black text-amber-950 bg-amber-400 rounded-md uppercase">
              BEGINNER WARM-UP MASTER GUIDE
            </span>
            <h3 className="text-xs sm:text-sm font-black text-slate-900">
              🔥 มือใหม่ต้องรู้: วอร์มร่างกายอย่างไรไม่ให้บาดเจ็บและโฟกัสกล้ามเนื้อโดนเต็ม 100%?
            </h3>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed">
            <strong>สเต็ปที่ 1:</strong> ทำการ์ดท่าวอร์มข้อต่อแบบเคลื่อนไหว (Dynamic Warm-up) 2 ท่าแรกของตาราง •{' '}
            <strong>สเต็ปที่ 2:</strong> ในทุกท่าเวท ให้กดติ๊กทำ <em>&ldquo;เซ็ตวอร์มน้ำหนักเบา (45%–70%)&rdquo;</em> ตามกล่องสีเหลืองในการ์ดก่อนเสมอ •{' '}
            <strong>สเต็ปที่ 3:</strong> จึงค่อยเริ่มยกเซ็ตจริง!
          </p>
        </div>
      </div>

      {/* แถบควบคุมหัวข้อการ์ดแนะนำประจำวัน */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 text-[10px] font-black text-white bg-emerald-600 rounded-md uppercase">
              DUAL-ANGLE ANIMATED CARDS + WARM-UP PROTOCOL
            </span>
            <h2 className="text-lg font-extrabold text-slate-900">
              การ์ดแนะนำท่าเล่นประจำวัน ({effectiveWorkouts.length} ขั้นตอน • รวมท่าวอร์ม)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            แสดงภาพเคลื่อนไหว <strong>มุมหน้า + มุมข้าง + ลูกศรทิศทางการออกแรง</strong> พร้อมคู่มือเซ็ตวอร์มสำหรับมือใหม่ในทุกการ์ด
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex p-1 bg-slate-100 border border-slate-200 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                viewMode === 'grid' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🗂️ ดูการ์ดทั้งหมด ({effectiveWorkouts.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode('focus')
                setFocusIndex(0)
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                viewMode === 'focus' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🎯 โหมดพาเล่นทีละท่า (เริ่มจากวอร์ม)
            </button>
          </div>

          <button
            type="button"
            onClick={onOpenExerciseModal}
            className="px-3.5 py-2 text-xs font-bold text-slate-800 bg-slate-100 border border-slate-300 rounded-xl hover:bg-slate-200"
          >
            + เพิ่มท่า/ท่าวอร์ม ({totalCatalogCount} ท่า)
          </button>

          <button
            type="button"
            onClick={onSaveWorkout}
            disabled={isSaving}
            className="px-5 py-2 text-xs font-extrabold text-white bg-emerald-600 rounded-xl shadow-sm hover:bg-emerald-700 disabled:bg-slate-400"
          >
            {isSaving ? 'กำลังบันทึก...' : currentWorkoutId ? '✓ อัปเดตการฝึกวันนี้' : '💾 บันทึกสถิติวันนี้'}
          </button>
        </div>
      </div>

      {/* ปุ่มเลื่อนซ้าย-ขวา สำหรับโหมดพาเล่นทีละท่า */}
      {viewMode === 'focus' && effectiveWorkouts.length > 1 && (
        <div className="flex items-center justify-between px-5 py-3 bg-slate-900 text-white rounded-2xl">
          <button
            type="button"
            disabled={safeFocusIndex === 0}
            onClick={() => setFocusIndex(prev => Math.max(0, prev - 1))}
            className="px-4 py-1.5 text-xs font-bold bg-slate-800 rounded-xl hover:bg-slate-700 disabled:opacity-40"
          >
            ← ท่าก่อนหน้า
          </button>
          <span className="text-xs font-extrabold text-emerald-400">
            กำลังโฟกัสขั้นตอนที่ {safeFocusIndex + 1} จาก {effectiveWorkouts.length}
          </span>
          <button
            type="button"
            disabled={safeFocusIndex === effectiveWorkouts.length - 1}
            onClick={() => setFocusIndex(prev => Math.min(effectiveWorkouts.length - 1, prev + 1))}
            className="px-4 py-1.5 text-xs font-bold bg-emerald-600 rounded-xl hover:bg-emerald-500 disabled:opacity-40"
          >
            ท่าถัดไป →
          </button>
        </div>
      )}

      {/* Grid แสดงการ์ดท่าออกกำลังกายขนาดใหญ่ */}
      <div className={viewMode === 'focus' ? 'max-w-2xl mx-auto' : 'grid grid-cols-1 gap-6 md:grid-cols-2'}>
        {cardsToRender.map((item, idx) => {
          const actualNumber = viewMode === 'focus' ? safeFocusIndex + 1 : idx + 1
          const isWarmupEx =
            item.is_warmup === true ||
            item.muscle === 'Warmup' ||
            String(item.name || '').includes('[วอร์มร่างกาย')
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
          const warmupGuide = calculateWarmupProtocol(item, loadMeta)
          const beginnerWarmupProtocol = getSetBySetWarmupGuide(item)
          const videoLink = getExerciseYouTubeUrl(
            String(item.name || '').replace(/🔥\s*\[วอร์มร่างกายท่าที่\s*\d+\]\s*/g, '')
          )

          const completedSetsArr = existsInParent
            ? Array.isArray(item.completed_sets)
              ? item.completed_sets
              : []
            : Array.isArray(localWarmupSetsDoneMap[item.uuid])
              ? localWarmupSetsDoneMap[item.uuid]
              : []
          const isAllSetsDone = item.muscle !== 'Cardio' && completedSetsArr.length >= setsNum

          const completedWarmupStepsCount = (beginnerWarmupProtocol?.steps || []).filter(
            st => warmupStepDoneMap[`${item.uuid}::${st.id}`]
          ).length
          const totalWarmupStepsCount = (beginnerWarmupProtocol?.steps || []).length
          const isAllWarmupStepsDone =
            totalWarmupStepsCount > 0 && completedWarmupStepsCount >= totalWarmupStepsCount

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

          const titleParts = (item.name || '').split('(')
          const englishTitle = titleParts[0].trim()
          const thaiSubtitle = titleParts[1]
            ? titleParts[1].replace(')', '').trim()
            : item.sub_muscle

          return (
            <div
              key={item.uuid}
              className={`flex flex-col justify-between bg-white border-2 rounded-3xl overflow-hidden shadow-sm transition-all ${
                isAllSetsDone
                  ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                  : isWarmupEx
                    ? 'border-amber-400 bg-gradient-to-b from-amber-50/40 to-white'
                    : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div>
                {/* ส่วนหัวการ์ด: ภาพเคลื่อนไหว 2 มุมมอง */}
                <div className="relative p-3 pb-0">
                  <ExerciseIllustration
                    name={item.name}
                    muscle={isWarmupEx ? 'Shoulders' : item.muscle}
                    type={item.type}
                    size="xl"
                  />
                </div>

                {/* ส่วนเนื้อหา: ชื่อท่าภาษาไทย/อังกฤษ และมัดกล้ามเนื้อที่ได้ */}
                <div className="p-5 pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-black rounded-md ${
                            isWarmupEx
                              ? 'bg-amber-400 text-slate-950'
                              : 'bg-slate-900 text-white'
                          }`}
                        >
                          {isWarmupEx ? `🔥 ท่าวอร์มเปิดโปรแกรม #${actualNumber}` : `ท่าที่ #${actualNumber}`}
                        </span>
                        <span className="px-2 py-0.5 text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-md">
                          ⏱️ ~{isWarmupEx ? 3 : itemMins} นาที
                        </span>
                      </div>
                      <h3 className="text-base font-black text-slate-900 leading-snug mt-1.5">
                        {englishTitle}
                      </h3>
                      <p className="text-sm font-bold text-emerald-700 mt-0.5">{thaiSubtitle}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {existsInParent && (
                        <button
                          type="button"
                          onClick={() => onQuickSwap(item.uuid)}
                          className="px-2.5 py-1.5 text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-xl hover:bg-indigo-100"
                          title="สลับท่าอื่นในมัดกล้ามเนื้อเดียวกัน"
                        >
                          🔄 สลับท่า
                        </button>
                      )}
                      <a
                        href={videoLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1.5 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl hover:bg-rose-100"
                      >
                        ▶ คลิปเต็ม
                      </a>
                      {existsInParent && (
                        <button
                          type="button"
                          onClick={() => onRemoveExercise(item.uuid)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                          title="ลบท่านี้"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {/* กล่องระบุมัดกล้ามเนื้อที่ได้ */}
                  <div className="mt-3 p-3 bg-slate-50 border border-slate-200/80 rounded-2xl">
                    <div className="text-[11px] font-bold text-slate-400 uppercase">
                      {isWarmupEx
                        ? 'ข้อต่อและกล้ามเนื้อที่ถูกปลุกให้พร้อม (Warm-up Target)'
                        : 'กล้ามเนื้อเป้าหมาย (Target Muscles)'}
                    </div>
                    <div className="text-xs font-bold text-slate-800 mt-0.5">{item.sub_muscle}</div>
                  </div>

                  {/* ===============================================================
                      🎓 กล่องคู่มือการวอร์มร่างกาย & เซ็ตวอร์มทีละขั้นสำหรับมือใหม่ (แสดงในทุกการ์ด!)
                     =============================================================== */}
                  {beginnerWarmupProtocol && (
                    <div
                      className={`mt-3 p-3.5 rounded-2xl border-2 transition ${
                        isAllWarmupStepsDone
                          ? 'bg-emerald-50/90 border-emerald-400'
                          : 'bg-amber-50/90 border-amber-300'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-black rounded-md uppercase ${
                            isAllWarmupStepsDone
                              ? 'bg-emerald-600 text-white'
                              : 'bg-amber-400 text-slate-950'
                          }`}
                        >
                          {isAllWarmupStepsDone
                            ? '✅ วอร์มข้อต่อและเซ็ตวอร์มครบแล้ว! พร้อมลุยเซ็ตจริง'
                            : beginnerWarmupProtocol.badge}
                        </span>
                        <span className="text-[10px] font-extrabold text-amber-900">
                          ติ๊กเช็กวอร์ม ({completedWarmupStepsCount}/{totalWarmupStepsCount})
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-700 leading-relaxed mb-2">
                        💡 <strong>ทำไมต้องทำ:</strong> {beginnerWarmupProtocol.whyImportant}
                      </p>

                      <div className="space-y-1.5">
                        {beginnerWarmupProtocol.steps.map(st => {
                          const stepDone = Boolean(warmupStepDoneMap[`${item.uuid}::${st.id}`])
                          return (
                            <div
                              key={st.id}
                              onClick={() => handleToggleWarmupStep(item.uuid, st.id)}
                              className={`p-2.5 rounded-xl border cursor-pointer transition flex items-start gap-2.5 ${
                                stepDone
                                  ? 'bg-emerald-100/80 border-emerald-400 text-emerald-950'
                                  : 'bg-white border-amber-200 hover:border-amber-400 text-slate-800'
                              }`}
                            >
                              <div
                                className={`w-5 h-5 rounded-md flex items-center justify-center text-[11px] font-black shrink-0 mt-0.5 ${
                                  stepDone
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-amber-100 text-amber-900 border border-amber-300'
                                }`}
                              >
                                {stepDone ? '✓' : ''}
                              </div>
                              <div className="text-[11px] leading-snug">
                                <div className="font-black">{st.label}</div>
                                <div className="text-slate-600 mt-0.5">{st.detail}</div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* ตัวเลข BIG NUMBERS: แยกตามประเภท เวทเทรนนิ่ง/วอร์ม vs คาร์ดิโอลู่วิ่ง */}
                  {item.muscle !== 'Cardio' ? (
                    <div className="grid grid-cols-3 gap-2.5 mt-4">
                      {/* กล่องเซ็ต */}
                      <div className="p-3 text-center bg-slate-900 text-white rounded-2xl">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">
                          {isWarmupEx ? 'เซ็ตวอร์ม' : 'จำนวนเซ็ตจริง'}
                        </span>
                        <div className="flex items-center justify-center gap-2 mt-1">
                          {existsInParent && (
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateStats(item.uuid, 'sets', Math.max(1, setsNum - 1))
                              }
                              className="w-6 h-6 text-xs font-black bg-slate-800 rounded-lg hover:bg-slate-700"
                            >
                              -
                            </button>
                          )}
                          <span className="text-2xl font-black text-emerald-400">{setsNum}</span>
                          {existsInParent && (
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateStats(item.uuid, 'sets', Math.min(10, setsNum + 1))
                              }
                              className="w-6 h-6 text-xs font-black bg-slate-800 rounded-lg hover:bg-slate-700"
                            >
                              +
                            </button>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400">เซ็ต (Sets)</span>
                      </div>

                      {/* กล่องจำนวนครั้ง */}
                      <div className="p-3 text-center bg-slate-900 text-white rounded-2xl">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">
                          จำนวนครั้ง
                        </span>
                        <div className="flex items-center justify-center gap-2 mt-1">
                          {existsInParent && (
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateStats(item.uuid, 'reps', Math.max(1, repsNum - 1))
                              }
                              className="w-6 h-6 text-xs font-black bg-slate-800 rounded-lg hover:bg-slate-700"
                            >
                              -
                            </button>
                          )}
                          <span className="text-2xl font-black text-sky-400">{repsNum}</span>
                          {existsInParent && (
                            <button
                              type="button"
                              onClick={() => onUpdateStats(item.uuid, 'reps', repsNum + 1)}
                              className="w-6 h-6 text-xs font-black bg-slate-800 rounded-lg hover:bg-slate-700"
                            >
                              +
                            </button>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {loadMeta.isPerSide ? 'ครั้ง/ข้าง' : 'ครั้ง (Reps)'}
                        </span>
                      </div>

                      {/* กล่องน้ำหนัก */}
                      <div className="p-3 text-center bg-emerald-950 text-white border border-emerald-700 rounded-2xl">
                        <span className="text-[10px] font-bold text-emerald-300 uppercase block">
                          {isWarmupEx
                            ? 'น้ำหนักตัวเปล่า'
                            : loadMeta.isPerSide
                              ? 'น้ำหนัก/ข้าง'
                              : 'น้ำหนักเซ็ตจริง'}
                        </span>
                        <div className="flex items-center justify-center gap-1.5 mt-1">
                          {existsInParent && !isWarmupEx && (
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateStats(item.uuid, 'weight', Math.max(0, weightNum - 2.5))
                              }
                              className="w-6 h-6 text-xs font-black bg-emerald-900 rounded-lg hover:bg-emerald-800"
                            >
                              -
                            </button>
                          )}
                          {existsInParent && !isWarmupEx ? (
                            <input
                              type="number"
                              step="0.5"
                              value={item.weight}
                              onChange={(e) => onUpdateStats(item.uuid, 'weight', e.target.value)}
                              className="w-14 text-center text-xl font-black text-white bg-transparent border-b border-emerald-500 focus:outline-none"
                            />
                          ) : (
                            <span className="text-xl font-black text-emerald-300">มือเปล่า</span>
                          )}
                          {existsInParent && !isWarmupEx && (
                            <button
                              type="button"
                              onClick={() => onUpdateStats(item.uuid, 'weight', weightNum + 2.5)}
                              className="w-6 h-6 text-xs font-black bg-emerald-900 rounded-lg hover:bg-emerald-800"
                            >
                              +
                            </button>
                          )}
                        </div>
                        <span className="text-[10px] text-emerald-300">
                          {isWarmupEx
                            ? 'เน้นขยับข้อต่อเต็มระยะ'
                            : `${loadMeta.unitSuffix} (แนะนำ ~${effortEval.expectedWorkingWeight})`}
                        </span>
                      </div>
                    </div>
                  ) : (
                    /* กรณีเป็นการ์ด Cardio / ลู่วิ่ง */
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4">
                      <div className="p-3 text-center bg-slate-900 text-white rounded-2xl">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">
                          1. เวลาที่เล่น
                        </span>
                        <input
                          type="number"
                          step="1"
                          value={item.duration}
                          onChange={(e) => onUpdateStats(item.uuid, 'duration', e.target.value)}
                          className="w-16 mt-1 text-center text-2xl font-black text-sky-400 bg-transparent border-b border-slate-600 focus:outline-none"
                        />
                        <span className="text-[10px] text-slate-400 block mt-0.5">นาที (Mins)</span>
                      </div>

                      <div className="p-3 text-center bg-emerald-950 text-white border-2 border-emerald-500 rounded-2xl">
                        <span className="text-[10px] font-extrabold text-emerald-300 uppercase block">
                          2. ระยะทางลู่วิ่ง
                        </span>
                        <input
                          type="number"
                          step="0.05"
                          value={item.distance_km}
                          onChange={(e) => onUpdateStats(item.uuid, 'distance_km', e.target.value)}
                          className="w-20 mt-1 text-center text-2xl font-black text-white bg-transparent border-b border-emerald-400 focus:outline-none"
                        />
                        <span className="text-[10px] text-emerald-300 block mt-0.5">
                          กิโลเมตร (Km)
                        </span>
                      </div>

                      <div className="p-3 text-center bg-slate-900 text-white rounded-2xl">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">
                          3. ความชัน
                        </span>
                        <input
                          type="number"
                          step="0.5"
                          value={item.incline}
                          onChange={(e) => onUpdateStats(item.uuid, 'incline', e.target.value)}
                          className="w-16 mt-1 text-center text-2xl font-black text-amber-400 bg-transparent border-b border-slate-600 focus:outline-none"
                        />
                        <span className="text-[10px] text-slate-400 block mt-0.5">Incline %</span>
                      </div>

                      <div className="p-3 text-center bg-sky-950 text-white border border-sky-700 rounded-2xl">
                        <span className="text-[10px] font-bold text-sky-300 uppercase block">
                          ความเร็วเฉลี่ย
                        </span>
                        <input
                          type="number"
                          step="0.1"
                          value={cardioKinematics?.speedKmh ?? item.speed_kmh ?? 3.5}
                          onChange={(e) => onUpdateStats(item.uuid, 'speed_kmh', e.target.value)}
                          className="w-16 mt-1 text-center text-xl font-black text-white bg-transparent border-b border-sky-500 focus:outline-none"
                        />
                        <span className="text-[10px] text-sky-300 block mt-0.5">
                          km/h (คำนวณอัตโนมัติ)
                        </span>
                      </div>
                    </div>
                  )}

                  {/* กล่องปรับแคลอรี่ให้ตรงกับอุปกรณ์ส่วนตัว */}
                  <div className="mt-3 p-3 bg-orange-50/80 border border-orange-200 rounded-2xl flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-extrabold text-orange-900">
                        🔥 พลังงานที่เผาผลาญ: {isWarmupEx ? 14 : itemKcal} kcal
                      </span>
                      <p className="text-[10px] text-orange-700">
                        {item.muscle === 'Cardio' && cardioKinematics
                          ? `ประเมินอัตโนมัติ: สมาร์ทวอทช์ ~${cardioKinematics.grossSmartwatchKcal} kcal | ลู่วิ่ง ~${cardioKinematics.netTreadmillKcal} kcal`
                          : 'สามารถคีย์ตัวเลขแคลอรี่จริงจากนาฬิกา/เครื่องเล่นของคุณทับได้เลย'}
                      </p>
                    </div>

                    {existsInParent && (
                      <div className="flex items-center gap-1.5">
                        <label className="text-[10px] font-bold text-orange-800">คีย์แคลจริง:</label>
                        <input
                          type="number"
                          placeholder={String(itemKcal)}
                          value={item.custom_kcal ?? ''}
                          onChange={(e) => onUpdateStats(item.uuid, 'custom_kcal', e.target.value)}
                          className="w-20 px-2 py-1 text-xs font-black text-center text-orange-950 bg-white border border-orange-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                        {hasCustomKcal && (
                          <button
                            type="button"
                            onClick={() => onUpdateStats(item.uuid, 'custom_kcal', null)}
                            className="px-2 py-1 text-[10px] font-bold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-100"
                            title="กลับไปใช้ค่าคำนวณอัตโนมัติ"
                          >
                            รีเซ็ต
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* แถบข้อมูลเสริม: ความหนักประเมิน */}
                  <div className="mt-2.5 space-y-1.5">
                    {item.muscle !== 'Cardio' && !isWarmupEx ? (
                      <div
                        className={`px-3 py-1.5 text-[11px] font-bold border rounded-xl ${effortEval.effortColor}`}
                      >
                        ⚡ ความหนักประเมิน: {effortEval.intensityPercent}% ({effortEval.effortLabel})
                      </div>
                    ) : (
                      cardioKinematics && (
                        <div
                          className={`px-3 py-1.5 text-[11px] font-bold border rounded-xl ${
                            cardioKinematics.isTooFastForInclineWalk
                              ? 'bg-rose-50 text-rose-800 border-rose-300'
                              : 'bg-sky-50 text-sky-900 border-sky-200'
                          }`}
                        >
                          🏃 ความเร็วเฉลี่ย {cardioKinematics.speedKmh} km/h (Pace{' '}
                          {cardioKinematics.paceText}) • {cardioKinematics.intensityLabel}
                        </div>
                      )
                    )}

                    {warmupGuide && !isWarmupEx && (
                      <div className="px-3 py-1.5 text-[11px] font-medium text-amber-900 bg-amber-50 border border-amber-200 rounded-xl">
                        🛡️ <strong>สูตรเซ็ตวอร์มไล่น้ำหนักเหล็ก:</strong> {warmupGuide.set1}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ส่วนท้ายการ์ด: ปุ่มกดเช็กเซ็ตเพื่อเริ่มจับเวลาพัก */}
              {item.muscle !== 'Cardio' && (
                <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200/80">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-extrabold text-slate-600">
                      {isWarmupEx
                        ? 'กดติ๊กเมื่อทำท่าวอร์มจบแต่ละเซ็ต (พัก 30 วินาที):'
                        : `กดติ๊กเมื่อยกจบเซ็ตจริง (พัก ${item.rest_sec || 90} วินาที):`}
                    </span>
                    <span className="text-[11px] font-bold text-emerald-700">
                      สำเร็จ {completedSetsArr.length}/{setsNum} เซ็ต
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {Array.from({ length: Math.min(8, setsNum) }, (_, sIdx) => {
                      const setNumber = sIdx + 1
                      const isDone = completedSetsArr.includes(setNumber)
                      return (
                        <button
                          key={setNumber}
                          type="button"
                          onClick={() => handleToggleCardSet(item, setNumber)}
                          className={`py-2 text-xs font-black rounded-xl border transition-all ${
                            isDone
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                              : isWarmupEx
                                ? 'bg-amber-50 text-amber-950 border-amber-300 hover:border-amber-500'
                                : 'bg-white text-slate-700 border-slate-300 hover:border-emerald-500'
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