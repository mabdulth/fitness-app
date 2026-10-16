import { useEffect, useState, useRef } from 'react'
import { MASTER_EXERCISE_LIBRARY } from './ExerciseModal'
import { personalizeExercisePrescription } from '../utils/workoutEngine'

export function getSmartSwapCandidate({
  currentItem,
  currentWorkoutList = [],
  profile,
  allHistoricalLogs = [],
  referenceDate
}) {
  const ownedEquipment =
    Array.isArray(profile?.available_equipment) && profile.available_equipment.length > 0
      ? profile.available_equipment
      : ['Dumbbell', 'Machine', 'Cable', 'Barbell', 'Calisthenics', 'Bodyweight', 'Cardio']

  const sameMusclePool = MASTER_EXERCISE_LIBRARY.filter(ex => {
    const matchMuscle = ex.muscle === currentItem.muscle
    const hasEquip =
      ex.muscle === 'Cardio'
        ? ownedEquipment.includes('Cardio') || ownedEquipment.includes('Machine') || ex.type === 'Bodyweight'
        : ownedEquipment.includes(ex.type)
    return matchMuscle && hasEquip
  })

  const candidatePool = sameMusclePool.length > 1 ? sameMusclePool : MASTER_EXERCISE_LIBRARY.filter(ex => ex.muscle === currentItem.muscle)
  if (candidatePool.length === 0) return currentItem

  const currentIdx = candidatePool.findIndex(ex => ex.name === currentItem.name)
  const existingNamesInToday = new Set(currentWorkoutList.filter(w => w.uuid !== currentItem.uuid).map(w => w.name))

  let chosenExercise = null
  for (let offset = 1; offset <= candidatePool.length; offset++) {
    const idx = (currentIdx + offset) % candidatePool.length
    const candidate = candidatePool[idx]
    if (!existingNamesInToday.has(candidate.name)) {
      chosenExercise = candidate
      break
    }
  }

  if (!chosenExercise) {
    chosenExercise = candidatePool[(currentIdx + 1) % candidatePool.length]
  }

  const personalized = personalizeExercisePrescription(
    chosenExercise,
    parseFloat(profile?.weight_kg) || 70,
    profile?.fitness_level || 'Intermediate',
    parseInt(profile?.session_mins) || 60,
    profile?.goal || 'Fat Loss',
    allHistoricalLogs,
    profile,
    referenceDate
  )

  return { ...personalized, uuid: currentItem.uuid, completed_sets: [] }
}

export function calculateWarmupProtocol(item, loadMeta) {
  if (!item || item.muscle === 'Cardio') return null
  const workWeight = parseFloat(item.weight) || 0
  if (workWeight < 5) return null

  const roundStep = (val) => Math.max(2, Math.round(val / 2.5) * 2.5)
  return {
    set1: `${roundStep(workWeight * 0.5)} ${loadMeta.unitSuffix} × 10 ครั้ง (วอร์มข้อต่อ 50%)`,
    set2: `${roundStep(workWeight * 0.75)} ${loadMeta.unitSuffix} × 5 ครั้ง (ปรับระบบประสาท 75%)`
  }
}

export function calculateDailyMacrosAndHydration(profile, bioMetrics, activeBurnKcal = 0, workoutMins = 0) {
  const weight = parseFloat(profile?.weight_kg) || 70
  const baseTargetKcal = bioMetrics?.targetCalories || 2000
  const dynamicTargetKcal = baseTargetKcal + Math.round(activeBurnKcal * 0.5)

  const proteinGrams = bioMetrics?.targetProteinGrams || Math.round(weight * 2.0)
  const fatGrams = Math.round(weight * 0.85)
  const remainingKcalForCarbs = Math.max(200, dynamicTargetKcal - (proteinGrams * 4) - (fatGrams * 9))
  const carbGrams = Math.round(remainingKcalForCarbs / 4)

  const sweatLossLiters = (workoutMins / 60) * 0.7
  const totalWaterLiters = Number(((weight * 0.033) + sweatLossLiters).toFixed(2))

  return { dynamicTargetKcal, proteinGrams, carbGrams, fatGrams, totalWaterLiters, sweatLossMl: Math.round(sweatLossLiters * 1000) }
}

function playCompletionBeep() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const playTone = (freq, startTime, duration) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, startTime)
      gain.gain.setValueAtTime(0.25, startTime)
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(startTime)
      osc.stop(startTime + duration)
    }
    const now = ctx.currentTime
    playTone(880, now, 0.18)
    playTone(1174.66, now + 0.22, 0.35)
  } catch {}
}

export default function LiveGymToolbar({ restTimerRequest, onClearRestRequest, profile, bioMetrics, dailyMetrics }) {
  const [timerActive, setTimerActive] = useState(false)
  const [remainingSec, setRemainingSec] = useState(0)
  const [totalSec, setTotalSec] = useState(90)
  const [activeLabel, setActiveLabel] = useState('')
  const [justFinished, setJustFinished] = useState(false)

  const endTimeRef = useRef(null)

  useEffect(() => {
    if (restTimerRequest && restTimerRequest.timestamp) {
      const duration = Math.max(15, parseInt(restTimerRequest.seconds) || 90)
      endTimeRef.current = Date.now() + duration * 1000
      setTotalSec(duration)
      setRemainingSec(duration)
      setActiveLabel(`${restTimerRequest.exerciseName.split('(')[0]} (จบเซ็ตที่ ${restTimerRequest.setNumber})`)
      setTimerActive(true)
      setJustFinished(false)
    }
  }, [restTimerRequest])

  useEffect(() => {
    if (!timerActive) return
    const interval = setInterval(() => {
      if (!endTimeRef.current) return
      const diffSec = Math.ceil((endTimeRef.current - Date.now()) / 1000)
      if (diffSec <= 0) {
        setRemainingSec(0)
        setTimerActive(false)
        setJustFinished(true)
        endTimeRef.current = null
        playCompletionBeep()
      } else {
        setRemainingSec(diffSec)
      }
    }, 250)
    return () => clearInterval(interval)
  }, [timerActive])

  const handleStartManualTimer = (sec, label = 'MANUAL OVERRIDE') => {
    endTimeRef.current = Date.now() + sec * 1000
    setTotalSec(sec)
    setRemainingSec(sec)
    setActiveLabel(label)
    setTimerActive(true)
    setJustFinished(false)
  }

  const handleAdjustTimer = (deltaSec) => {
    if (!timerActive || !endTimeRef.current) {
      handleStartManualTimer(Math.max(15, deltaSec), 'QUICK TIMER')
      return
    }
    endTimeRef.current += deltaSec * 1000
    const updatedRemaining = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000))
    setRemainingSec(updatedRemaining)
    setTotalSec(prev => Math.max(updatedRemaining, prev + deltaSec))
  }

  const handleStopTimer = () => {
    setTimerActive(false)
    setRemainingSec(0)
    setJustFinished(false)
    endTimeRef.current = null
    if (onClearRestRequest) onClearRestRequest()
  }

  const formatMmSs = (sec) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`

  const macros = calculateDailyMacrosAndHydration(profile, bioMetrics, dailyMetrics?.totalCalories || 0, dailyMetrics?.totalWorkoutMins || 0)
  const progressPercent = totalSec > 0 ? Math.max(0, Math.min(100, (remainingSec / totalSec) * 100)) : 0
  const radius = 38
  const circumference = 2 * Math.PI * radius
  const dashoffset = circumference - (progressPercent / 100) * circumference

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      
      {/* 🚀 SCI-FI REST TIMER DASHBOARD */}
      <div className={`relative p-5 rounded-3xl overflow-hidden transition-all duration-500 lg:col-span-5 ${
        timerActive
          ? 'bg-slate-950 text-emerald-400 border border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.2)] ring-1 ring-emerald-500/30'
          : justFinished
            ? 'bg-emerald-900 text-white border border-emerald-400 shadow-[0_0_25px_rgba(52,211,153,0.6)] animate-pulse'
            : 'bg-slate-900 text-slate-400 border border-slate-700'
      }`}>
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)', backgroundSize: '15px 15px' }}></div>

        <div className="relative z-10 flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-0.5 text-[9px] font-black tracking-widest uppercase rounded border ${
              timerActive ? 'bg-emerald-950/50 text-emerald-400 border-emerald-500/50' : justFinished ? 'bg-white text-emerald-900 border-white' : 'bg-slate-800 text-slate-500 border-slate-700'
            }`}>
              {timerActive ? '⚡ ACTIVE RECOVERY' : justFinished ? '🔔 SYSTEM READY' : 'IDLE MODE'}
            </span>
          </div>
          {(timerActive || justFinished) && (
            <button onClick={handleStopTimer} className="px-3 py-1 text-[10px] font-black tracking-wider text-rose-400 border border-rose-500/50 rounded-lg hover:bg-rose-950/50 transition z-20 relative cursor-pointer">
              ABORT
            </button>
          )}
        </div>

        <div className="relative z-10 flex items-center justify-between gap-4">
          {/* Circular HUD Timer with Spinning Rings */}
          <div className="relative flex items-center justify-center w-24 h-24 shrink-0">
            <svg className="w-full h-full -rotate-90 transform drop-shadow-[0_0_10px_rgba(16,185,129,0.6)]" viewBox="0 0 100 100">
              {/* Outer Dashed Rotating Ring */}
              <circle cx="50" cy="50" r="46" fill="none" stroke={timerActive ? "#10b981" : "#334155"} strokeWidth="1.5" strokeDasharray="4 8" className={timerActive ? "animate-[spin_4s_linear_infinite]" : ""} style={{ transformOrigin: 'center' }} />
              {/* Inner Background Ring */}
              <circle cx="50" cy="50" r={radius} fill="none" stroke="#0f172a" strokeWidth="6" />
              {/* Progress Ring */}
              <circle
                cx="50" cy="50" r={radius} fill="none" stroke={timerActive ? '#10b981' : justFinished ? '#fff' : '#475569'}
                strokeWidth="6" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashoffset}
                className="transition-all duration-1000 ease-linear"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center pointer-events-none">
              <span className={`text-2xl font-black font-mono tracking-tighter ${timerActive ? 'text-emerald-400' : justFinished ? 'text-white' : 'text-slate-500'}`}>
                {formatMmSs(remainingSec)}
              </span>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 truncate">
              {activeLabel || 'AWAITING INPUT...'}
            </p>
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              {[60, 90, 120].map(sec => (
                <button
                  key={sec}
                  onClick={() => handleStartManualTimer(sec, `OVERRIDE: ${sec}S`)}
                  className={`px-2.5 py-1.5 text-[10px] font-bold font-mono rounded border transition z-20 relative cursor-pointer ${
                    timerActive || justFinished ? 'bg-slate-900/50 text-emerald-500 border-emerald-800 hover:bg-emerald-950' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                  }`}
                >
                  {sec}s
                </button>
              ))}
              {timerActive && (
                <button onClick={() => handleAdjustTimer(15)} className="px-2 py-1.5 text-[10px] font-bold font-mono text-cyan-400 bg-cyan-950/30 border border-cyan-800 rounded hover:bg-cyan-900/50 z-20 relative cursor-pointer">
                  +15s
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* กล่องขวา (7 Cols): DYNAMIC DAILY MACROS & HYDRATION PROTOCOL */}
      <div className="p-5 bg-white border border-slate-200 rounded-3xl shadow-sm lg:col-span-7 flex flex-col justify-between">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              โภชนาการและน้ำดื่มที่ร่างกายต้องการวันนี้ (Dynamic Nutrition)
            </h3>
            <p className="text-[11px] text-slate-500">
              คำนวณจากเป้าหมาย <strong>{profile?.goal || 'Body Recomposition'}</strong> และชดเชยพลังงานจากตารางฝึกวันนี้ (+{Math.round((dailyMetrics?.totalCalories || 0) * 0.5)} kcal)
            </p>
          </div>
          <span className="px-2.5 py-1 text-xs font-extrabold text-orange-800 bg-orange-50 border border-orange-200 rounded-lg">
            เป้าพลังงานสุทธิ: {macros.dynamicTargetKcal.toLocaleString()} kcal
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="p-2.5 bg-indigo-50/60 border border-indigo-100 rounded-xl">
            <span className="text-[10px] font-bold text-indigo-600 uppercase">โปรตีน (Protein)</span>
            <div className="text-lg font-black text-indigo-950 mt-0.5">{macros.proteinGrams} <span className="text-xs font-normal">กรัม</span></div>
            <span className="text-[10px] text-slate-500">ซ่อมแซมมัดกล้ามเนื้อ</span>
          </div>
          <div className="p-2.5 bg-emerald-50/60 border border-emerald-100 rounded-xl">
            <span className="text-[10px] font-bold text-emerald-700 uppercase">คาร์บ (Carbs)</span>
            <div className="text-lg font-black text-emerald-950 mt-0.5">{macros.carbGrams} <span className="text-xs font-normal">กรัม</span></div>
            <span className="text-[10px] text-slate-500">เติมพลังงานไกลโคเจน</span>
          </div>
          <div className="p-2.5 bg-amber-50/60 border border-amber-100 rounded-xl">
            <span className="text-[10px] font-bold text-amber-700 uppercase">ไขมันดี (Fats)</span>
            <div className="text-lg font-black text-amber-950 mt-0.5">{macros.fatGrams} <span className="text-xs font-normal">กรัม</span></div>
            <span className="text-[10px] text-slate-500">รักษาสมดุลฮอร์โมน</span>
          </div>
          <div className="p-2.5 bg-sky-50/70 border border-sky-200 rounded-xl">
            <span className="text-[10px] font-bold text-sky-700 uppercase">น้ำดื่มรวมวันนี้</span>
            <div className="text-lg font-black text-sky-950 mt-0.5">💧 {macros.totalWaterLiters} <span className="text-xs font-normal">ลิตร</span></div>
            <span className="text-[10px] text-sky-800 font-medium">ชดเชยเหงื่อ +{macros.sweatLossMl} มล.</span>
          </div>
        </div>
      </div>
    </div>
  )
}