import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import {
  formatLocalISO,
  parseLocalISO,
  getEquipmentLoadMeta,
  estimateExerciseDurationMins
} from '../utils/workoutEngine'
import BodyMorphologyVisual from './BodyMorphologyVisual'

// ============================================================================
// SUB-COMPONENT 1: 6-AXIS SVG RADAR CHART (กราฟเรดาร์ 6 เหลี่ยมสมดุลกล้ามเนื้อ)
// ============================================================================
function MuscleRadarChart({ muscleActivationMatrix = [] }) {
  const size = 250
  const center = size / 2
  const maxRadius = 85

  // คำนวณพิกัด (x, y) บนวงกลม 6 เหลี่ยมแบบ Pure Trigonometry
  const getCoordinates = (index, total, ratioPercent) => {
    const angle = (Math.PI * 2 * index) / total - Math.PI / 2
    const r = (Math.max(8, Math.min(100, ratioPercent)) / 100) * maxRadius
    return {
      x: Number((center + r * Math.cos(angle)).toFixed(1)),
      y: Number((center + r * Math.sin(angle)).toFixed(1)),
      labelX: Number((center + (maxRadius + 24) * Math.cos(angle)).toFixed(1)),
      labelY: Number((center + (maxRadius + 18) * Math.sin(angle)).toFixed(1))
    }
  }

  const totalAxes = muscleActivationMatrix.length || 6
  const gridLevels = [25, 50, 75, 100]

  const dataPoints = muscleActivationMatrix.map((m, idx) => ({
    ...m,
    shortName: m.group,
    ...getCoordinates(idx, totalAxes, m.ratio)
  }))

  const polygonPointsString = dataPoints.map(p => `${p.x},${p.y}`).join(' ')

  return (
    <div className="flex flex-col items-center justify-center">
      <svg viewBox={`0 0 ${size} ${size}`} className="w-64 h-64 overflow-visible">
        <defs>
          <linearGradient id="radarFillGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.45" />
          </linearGradient>
        </defs>

        {/* เส้นใยแมงมุม 4 ระดับ (25%, 50%, 75%, 100%) */}
        {gridLevels.map(level => {
          const pts = Array.from({ length: totalAxes }, (_, idx) => {
            const c = getCoordinates(idx, totalAxes, level)
            return `${c.x},${c.y}`
          }).join(' ')
          return (
            <polygon
              key={level}
              points={pts}
              fill="none"
              stroke={level === 100 ? '#94a3b8' : '#e2e8f0'}
              strokeWidth={level === 100 ? '1.5' : '1'}
              strokeDasharray={level === 50 ? '3 3' : undefined}
            />
          )
        })}

        {/* เส้นแกนทั้ง 6 มัดกล้ามเนื้อ */}
        {Array.from({ length: totalAxes }, (_, idx) => {
          const outer = getCoordinates(idx, totalAxes, 100)
          return (
            <line
              key={idx}
              x1={center}
              y1={center}
              x2={outer.x}
              y2={outer.y}
              stroke="#e2e8f0"
              strokeWidth="1"
            />
          )
        })}

        {/* พื้นที่ Polygon สมดุลกล้ามเนื้อของผู้ใช้ */}
        <polygon
          points={polygonPointsString}
          fill="url(#radarFillGrad)"
          stroke="#059669"
          strokeWidth="2.5"
        />

        {/* จุดและป้ายชื่อมัดกล้ามเนื้อแต่ละมุม */}
        {dataPoints.map((pt, idx) => (
          <g key={idx}>
            <circle cx={pt.x} cy={pt.y} r="4.5" fill="#059669" stroke="#ffffff" strokeWidth="1.5" />
            <text
              x={pt.labelX}
              y={pt.labelY}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-[10px] font-extrabold fill-slate-700"
            >
              {pt.shortName} ({pt.ratio}%)
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}

// ============================================================================
// SUB-COMPONENT 2: SVG DONUT RING GAUGE (เกจวงกลมโดนัทโมเดิร์น)
// ============================================================================
function DonutGauge({ percent = 50, title, subtitle, primaryColor = '#10b981', centerText }) {
  const radius = 36
  const circumference = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(100, percent))
  const offset = circumference - (clamped / 100) * circumference

  return (
    <div className="flex items-center gap-3.5 p-4 bg-slate-50 border border-slate-200/80 rounded-2xl">
      <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 90 90">
          <circle cx="45" cy="45" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="8" />
          <circle
            cx="45"
            cy="45"
            r={radius}
            fill="none"
            stroke={primaryColor}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute text-xs font-black text-slate-900">
          {centerText || `${clamped}%`}
        </span>
      </div>
      <div>
        <h4 className="text-xs font-extrabold text-slate-900">{title}</h4>
        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{subtitle}</p>
      </div>
    </div>
  )
}

// ============================================================================
// SUB-COMPONENT 3: SVG SMOOTH AREA & LINE CHART (กราฟเส้นโค้งไล่เฉดสี)
// ============================================================================
function SmoothAreaChart({ data = [], valueKey = 'est1RM', unit = 'kg', strokeColor = '#4f46e5', gradId = 'lineGrad1' }) {
  if (!data || data.length === 0) return null

  const width = 520
  const height = 180
  const padX = 36
  const padY = 28

  const values = data.map(d => Number(d[valueKey]) || 0)
  const minVal = Math.min(...values) * 0.92
  const maxVal = Math.max(...values, minVal + 5) * 1.05

  const pts = data.map((d, idx) => {
    const x =
      data.length === 1
        ? width / 2
        : padX + (idx / (data.length - 1)) * (width - padX * 2)
    const val = Number(d[valueKey]) || 0
    const y = height - padY - ((val - minVal) / (maxVal - minVal || 1)) * (height - padY * 2)
    return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)), val, label: d.date }
  })

  const linePoints = pts.map(p => `${p.x},${p.y}`).join(' ')
  const areaPoints = `${pts[0].x},${height - padY} ${linePoints} ${pts[pts.length - 1].x},${height - padY}`

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-48 min-w-[320px]">
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.38" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* เส้นแนวนอน */}
        {[0.2, 0.5, 0.8].map((ratio, i) => (
          <line
            key={i}
            x1={padX}
            y1={height * ratio}
            x2={width - padX}
            y2={height * ratio}
            stroke="#e2e8f0"
            strokeDasharray="4 4"
            strokeWidth="1"
          />
        ))}

        {/* พื้นที่ไล่เฉดสีใต้กราฟ */}
        <polygon points={areaPoints} fill={`url(#${gradId})`} />

        {/* เส้นกราฟหลัก */}
        <polyline
          fill="none"
          stroke={strokeColor}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={linePoints}
        />

        {/* จุดพิกัดและป้ายตัวเลข */}
        {pts.map((p, idx) => (
          <g key={idx}>
            <circle cx={p.x} cy={p.y} r="5" fill="#ffffff" stroke={strokeColor} strokeWidth="3" />
            <text
              x={p.x}
              y={p.y - 10}
              textAnchor="middle"
              className="text-[10px] font-black fill-slate-800"
            >
              {p.val}{unit}
            </text>
            <text
              x={p.x}
              y={height - 8}
              textAnchor="middle"
              className="text-[9px] font-bold fill-slate-400"
            >
              {p.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}

const RECOMMENDED_EXERCISES = {
  Chest: [
    { name: 'ดัมเบล เบนช์เพรส', en: 'Dumbbell Bench Press', tip: 'เน้นขยายความหนาแน่นของอกและสร้างพละกำลัง' },
    { name: 'วิดพื้นมือเปล่า', en: 'Push-Up', tip: 'บอดี้เวทสร้างแกนกลางและอกแน่น มั่นคง' },
    { name: 'ดัมเบล ฟลาย', en: 'Dumbbell Fly', tip: 'ยืดเหยียดเส้นใยกล้ามเนื้ออกเต็มพิกัด' }
  ],
  Back: [
    { name: 'ดัมเบล โรว์', en: 'One-Arm Dumbbell Row', tip: 'เพิ่มความหนาของปีกหลัง (Lats) และสะบัก' },
    { name: 'ดัมเบล โรมาเนียนเดดลิฟท์', en: 'Dumbbell RDL', tip: 'เสริมความแข็งแกร่งแนวสันหลังล่างและสะโพก' },
    { name: 'พูลอัพ / โหนบาร์', en: 'Pull-Up', tip: 'เปิดปีกหลัง V-Taper กว้างสมส่วน' }
  ],
  Shoulders: [
    { name: 'ดัมเบล โชว์เดอร์เพรส', en: 'Overhead Press', tip: 'ดันสร้างหัวไหล่ทรงพลังและฐานบ่าหนา' },
    { name: 'ดัมเบล แลทเทอรัลเรส', en: 'Lateral Raise', tip: 'ปั้นหัวไหล่ด้านข้างเป็นทรงลูกมะพร้าว มิติกว้าง' },
    { name: 'เรียร์เดลต์ ฟลาย / เฟซพูลล์', en: 'Rear Delt Fly', tip: 'ดึงสะบักหลังตรง แก้ปัญหาไหล่ห่อ' }
  ],
  Arms: [
    { name: 'ดัมเบล ไบเซพส์เคิร์ล', en: 'Biceps Curl', tip: 'ปั้นยอดกล้ามแขนหน้า (Bicep Peak)' },
    { name: 'ไตรเซพส์ คิกแบ็ค', en: 'Triceps Kickback', tip: 'กระชับต้นแขนหลัง ปั้นกล้ามเกือกม้า' },
    { name: 'แฮมเมอร์เคิร์ล', en: 'Hammer Curl', tip: 'เพิ่มความหนาท่อนแขนและแรงบีบมือ' }
  ],
  Legs: [
    { name: 'ดัมเบล ก็อบเล็ทสควอท', en: 'Goblet Squat', tip: 'สร้างพละกำลังหน้าขาและก้น แนบอกลำตัวตรง' },
    { name: 'ดัมเบล ลันจ์', en: 'Walking / Reverse Lunge', tip: 'ปรับสมดุลขาทีละข้างและข้อต่อสะโพก' },
    { name: 'คาล์ฟเรส เขย่งน่อง', en: 'Standing Calf Raise', tip: 'สร้างความทนทานของน่อง รองรับการเดินป่า' }
  ],
  Core: [
    { name: 'แพลงก์เกร็งค้าง', en: 'Plank Hold', tip: 'ปั้นร่อง 11 เสริมความนิ่ง เซฟกระดูกสันหลัง' },
    { name: 'เมาน์เทนไคลม์เบอร์', en: 'Mountain Climber', tip: 'กระตุ้นหน้าท้องล่างและคาร์ดิโอเบิร์น' },
    { name: 'รัสเซียนทวิสต์', en: 'Russian Twist', tip: 'บิดเกร็งกล้ามเนื้อเอวข้าง (Obliques)' }
  ]
}

export default function AnalyticsWidgets({
  muscleActivationMatrix,
  allHistoricalLogs,
  profile,
  mode = 'all'
}) {
  const [selectedExercise, setSelectedExercise] = useState('')
  const [weightLogs, setWeightLogs] = useState([])
  const [currentWeightInput, setCurrentWeightInput] = useState('')
  const [userHeightCm, setUserHeightCm] = useState(172)
  const [userGender, setUserGender] = useState('male')
  const [userAge, setUserAge] = useState(29)
  const [userBodyType, setUserBodyType] = useState('Skinny Fat')
  const [userGoal, setUserGoal] = useState('Body Recomposition')
  const [isSavingWeight, setIsSavingWeight] = useState(false)
  const [copySuccessMsg, setCopySuccessMsg] = useState('')

  useEffect(() => {
    fetchWeightHistory()
  }, [])

  const fetchWeightHistory = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const { data } = await supabase
      .from('profiles')
      .select('weight_kg, height_cm, age, gender, body_type, goal, schedule_overrides')
      .eq('id', session.user.id)
      .single()

    if (data) {
      if (data.weight_kg) setCurrentWeightInput(String(data.weight_kg))
      if (data.height_cm) setUserHeightCm(parseFloat(data.height_cm) || 172)
      if (data.gender) setUserGender(data.gender)
      if (data.age) setUserAge(parseInt(data.age) || 29)
      if (data.body_type) setUserBodyType(data.body_type)
      if (data.goal) setUserGoal(data.goal)

      const savedHistory = data.schedule_overrides?._weight_history
      if (Array.isArray(savedHistory) && savedHistory.length > 0) {
        setWeightLogs(savedHistory)
      } else if (data.weight_kg) {
        setWeightLogs([{ date: formatLocalISO(new Date()), weight: parseFloat(data.weight_kg) }])
      }
    }
  }

  const handleRecordWeight = async (e) => {
    e.preventDefault()
    const wVal = parseFloat(currentWeightInput)
    if (!wVal || wVal < 25 || wVal > 250) return

    setIsSavingWeight(true)
    const todayIso = formatLocalISO(new Date())

    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      const { data: prof } = await supabase
        .from('profiles')
        .select('schedule_overrides')
        .eq('id', session.user.id)
        .single()

      const existingOverrides = prof?.schedule_overrides || {}
      const filteredHistory = weightLogs.filter(entry => entry.date !== todayIso)
      const updatedHistory = [...filteredHistory, { date: todayIso, weight: wVal }].slice(-10)

      const newOverrides = {
        ...existingOverrides,
        _weight_history: updatedHistory
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          weight_kg: wVal,
          schedule_overrides: newOverrides
        })
        .eq('id', session.user.id)

      if (!error) {
        setWeightLogs(updatedHistory)
      }
    }
    setIsSavingWeight(false)
  }

  const getMuscleColor = (groupName) => {
    const found = muscleActivationMatrix.find(m => m.group === groupName)
    if (!found || found.ratio === 0) return '#e2e8f0'
    if (found.ratio >= 100) return '#e11d48'
    if (found.ratio >= 50) return '#10b981'
    return '#f59e0b'
  }

  // Canonical Exercise Grouping (Deduplication across logs)
  const canonicalExerciseMap = {}
  allHistoricalLogs
    .filter(l => l.muscle_group !== 'Cardio' && l.exercise_name)
    .forEach(log => {
      // Clean bracket tags, parentheses notes, and emojis
      const cleanName = log.exercise_name
        .replace(/\[.*?\]/g, '')
        .replace(/[\(（].*?[\)）]/g, '')
        .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
        .replace(/\s+/g, ' ')
        .trim()

      const key = cleanName.toLowerCase() || log.exercise_name.trim().toLowerCase()
      if (!canonicalExerciseMap[key]) {
        canonicalExerciseMap[key] = {
          key,
          displayName: cleanName || log.exercise_name.trim(),
          logs: []
        }
      }
      canonicalExerciseMap[key].logs.push(log)
    })

  const canonicalExerciseList = Object.values(canonicalExerciseMap).sort((a, b) => 
    b.logs.length - a.logs.length || a.displayName.localeCompare(b.displayName, 'th')
  )

  const activeExerciseKey = (selectedExercise && canonicalExerciseMap[selectedExercise])
    ? selectedExercise
    : (canonicalExerciseList.length > 0 ? canonicalExerciseList[0].key : '')

  const selectedLogs = activeExerciseKey && canonicalExerciseMap[activeExerciseKey]
    ? canonicalExerciseMap[activeExerciseKey].logs
    : []

  // Aggregate logs by date to avoid duplicate spikes on same day and show peak 1RM
  const dailyLogsMap = {}
  selectedLogs.forEach(log => {
    const dateStr = log.date || 'Unknown'
    const w = parseFloat(log.weight_kg) || 0
    const r = parseInt(log.reps) || 0
    const s = parseInt(log.sets) || 1
    const loadMeta = getEquipmentLoadMeta({
      name: log.exercise_name,
      type: log.equipment_type || 'Dumbbell'
    })
    const est1RM = w > 0 ? Number((w * (1 + r / 30)).toFixed(1)) : 0
    const vol = s * r * (w * loadMeta.bilateralMultiplier)

    if (!dailyLogsMap[dateStr]) {
      dailyLogsMap[dateStr] = {
        date: dateStr.length >= 10 ? dateStr.slice(5) : dateStr,
        fullDate: dateStr,
        weight: w,
        reps: r,
        sets: s,
        est1RM,
        volume: vol,
        unitSuffix: loadMeta.unitSuffix
      }
    } else {
      dailyLogsMap[dateStr].volume += vol
      dailyLogsMap[dateStr].sets += s
      if (est1RM > dailyLogsMap[dateStr].est1RM) {
        dailyLogsMap[dateStr].est1RM = est1RM
        dailyLogsMap[dateStr].weight = w
        dailyLogsMap[dateStr].reps = r
      }
    }
  })

  const exerciseTrendData = Object.values(dailyLogsMap)
    .sort((a, b) => parseLocalISO(a.fullDate) - parseLocalISO(b.fullDate))
    .slice(-12)

  const now = new Date()
  const getPastIso = (daysAgo) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo, 12, 0, 0)
    return formatLocalISO(d)
  }

  const sevenDaysAgoIso = getPastIso(7)
  const fourteenDaysAgoIso = getPastIso(14)
  const twentyOneDaysAgoIso = getPastIso(21)
  const twentyEightDaysAgoIso = getPastIso(28)

  const calcPeriodStats = (logsArray) => {
    return logsArray.reduce(
      (acc, l) => {
        const kcal = parseFloat(l.kcal_burned) || 0
        const mins =
          parseFloat(l.duration_mins) ||
          estimateExerciseDurationMins({
            name: l.exercise_name,
            muscle: l.muscle_group,
            sets: l.sets,
            reps: l.reps,
            rest_sec: l.rest_sec,
            duration: l.duration_mins
          })

        if (l.muscle_group === 'Cardio') {
          return {
            ...acc,
            totalMins: acc.totalMins + mins,
            cardioDist: acc.cardioDist + (parseFloat(l.distance_km) || 0),
            calories: acc.calories + kcal
          }
        }

        const s = parseInt(l.sets) || 0
        const r = parseInt(l.reps) || 0
        const w = parseFloat(l.weight_kg) || 0
        const loadMeta = getEquipmentLoadMeta({
          name: l.exercise_name,
          type: l.equipment_type || 'Dumbbell'
        })
        const effectiveWeight = w * loadMeta.bilateralMultiplier
        const oneRm = w > 0 ? w * (1 + r / 30) : 0

        return {
          ...acc,
          volume: acc.volume + s * r * effectiveWeight,
          sets: acc.sets + s,
          totalMins: acc.totalMins + mins,
          max1RM: Math.max(acc.max1RM, oneRm),
          calories: acc.calories + kcal
        }
      },
      { volume: 0, sets: 0, totalMins: 0, max1RM: 0, cardioDist: 0, calories: 0 }
    )
  }

  const currentWeekStats = calcPeriodStats(allHistoricalLogs.filter(l => l.date >= sevenDaysAgoIso))
  const prevWeekStats = calcPeriodStats(allHistoricalLogs.filter(l => l.date >= fourteenDaysAgoIso && l.date < sevenDaysAgoIso))
  const week3Stats = calcPeriodStats(allHistoricalLogs.filter(l => l.date >= twentyOneDaysAgoIso && l.date < fourteenDaysAgoIso))
  const week4Stats = calcPeriodStats(allHistoricalLogs.filter(l => l.date >= twentyEightDaysAgoIso && l.date < twentyOneDaysAgoIso))

  const calcDeltaPercent = (curr, prev) => {
    if (prev === 0) return curr > 0 ? '+100%' : '0%'
    const diff = ((curr - prev) / prev) * 100
    return `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}%`
  }

  const getSetsByGroup = (g) => muscleActivationMatrix.find(m => m.group === g)?.totalWeeklySets || 0
  const chestSets = getSetsByGroup('Chest')
  const backSets = getSetsByGroup('Back')
  const shoulderSets = getSetsByGroup('Shoulders')
  const armSets = getSetsByGroup('Arms')
  const legSets = getSetsByGroup('Legs')
  const coreSets = getSetsByGroup('Core')

  const pushSetsTotal = Math.round(chestSets + shoulderSets * 0.6 + armSets * 0.5)
  const pullSetsTotal = Math.round(backSets + shoulderSets * 0.4 + armSets * 0.5)
  const pushPullSum = pushSetsTotal + pullSetsTotal
  const pushRatioPct = pushPullSum > 0 ? Math.round((pushSetsTotal / pushPullSum) * 100) : 50
  const pullRatioPct = pushPullSum > 0 ? 100 - pushRatioPct : 50

  const upperSetsTotal = chestSets + backSets + shoulderSets + armSets
  const lowerAndCoreTotal = legSets + coreSets
  const totalBodySets = upperSetsTotal + lowerAndCoreTotal
  const upperRatioPct = totalBodySets > 0 ? Math.round((upperSetsTotal / totalBodySets) * 100) : 60
  const lowerRatioPct = totalBodySets > 0 ? 100 - upperRatioPct : 40

  const baselineWeeklySets = Math.round(
    muscleActivationMatrix.reduce((sum, m) => sum + (m.optimalSets || 10), 0) * 0.65
  )
  const activeAcuteSets = Math.max(currentWeekStats.sets, totalBodySets)
  const chronicAvgSets =
    (activeAcuteSets +
      (prevWeekStats.sets || baselineWeeklySets) +
      (week3Stats.sets || baselineWeeklySets) +
      (week4Stats.sets || baselineWeeklySets)) / 4
  const acwrValue = chronicAvgSets > 0 ? Number((activeAcuteSets / chronicAvgSets).toFixed(2)) : 1.0
  const cnsReadinessPct = Math.max(20, Math.min(100, Math.round((1.5 - Math.abs(1.05 - acwrValue)) * 66)))

  // --------------------------------------------------------------------------
  // CLINICAL & BIOMECHANICAL ANALYSIS CALCULATIONS
  // --------------------------------------------------------------------------
  const sortedByActivation = [...(muscleActivationMatrix || [])].sort((a, b) => (a.ratio || 0) - (b.ratio || 0))
  const laggingMuscle = sortedByActivation.length > 0 ? sortedByActivation[0] : null
  const fatiguedMuscles = (muscleActivationMatrix || []).filter(m => (m.ratio || 0) >= 100)
  const optimalMuscles = (muscleActivationMatrix || []).filter(m => (m.ratio || 0) >= 50 && (m.ratio || 0) < 100)
  const freshMuscles = (muscleActivationMatrix || []).filter(m => (m.ratio || 0) < 50)

  // 1. Push vs. Pull Biomechanics Insight
  let pushPullInsight = {
    badge: 'สมดุลยอดเยี่ยม (Balanced)',
    badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    title: 'อัตราส่วนแรงผลักต่อแรงดึงสมดุลตามหลัก Biomechanics',
    desc: `แรงผลัก ${pushRatioPct}% ต่อ แรงดึง ${pullRatioPct}% อยู่ในเกณฑ์เหมาะสม ช่วยพยุงแนวกระดูกสะบักและลดความเสี่ยงข้อต่อหัวไหล่อักเสบ`,
    action: 'รักษาอัตราส่วนการฝึกท่าผลัก (Press) และท่าดึง (Row/Pull) ในอัตราส่วน 1:1 หรือ 1:1.2 ต่อไป'
  }
  if (pushRatioPct >= 62) {
    pushPullInsight = {
      badge: 'แรงผลักเด่นเกินไป (Push Dominant)',
      badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
      title: 'เสี่ยงต่อภาวะไหล่ห่อ (Rounded Shoulders) และสะบักลอย',
      desc: `คุณฝึกกลุ่มดัน (อก/ไหล่หน้า/หลังแขน) สูงถึง ${pushRatioPct}% ขณะที่กลุ่มดึงมีเพียง ${pullRatioPct}% แรงดึงรั้งด้านหน้าจะดึงกระดูกไหปลาร้าและสะบักมาข้างหน้า`,
      action: '💡 แนะนำ: เติมท่าดึงหลัง เช่น Dumbbell Row, Face Pull หรือ Inverted Row เพิ่ม 3-4 เซ็ตเพื่อดึงไหล่เปิดกลับมา'
    }
  } else if (pullRatioPct >= 62) {
    pushPullInsight = {
      badge: 'แรงดึงเด่นกว่า (Pull Dominant)',
      badgeColor: 'bg-sky-50 text-sky-800 border-sky-200',
      title: 'แนวสันหลังตรงและปีกหลังแข็งแกร่ง แต่อาจขาดแรงผลัก',
      desc: `กลุ่มดึงคิดเป็น ${pullRatioPct}% ช่วยให้แนวกระดูกสันหลังตั้งตรง แต่กล้ามเนื้ออกและบ่าด้านหน้ายังกระตุ้นน้อยกว่า`,
      action: '💡 แนะนำ: เสริมท่าผลัก เช่น Dumbbell Bench Press หรือ Push-Up 2-3 เซ็ตเพื่อรักษาความหนาแน่นของแผงอก'
    }
  }

  // 2. Upper vs. Lower Kinetic Chain Insight
  let upperLowerInsight = {
    badge: 'สัดส่วนสมดุล (Kinetic Harmony)',
    badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    title: 'การส่งถ่ายแรงท่อนบนและล่างทำงานสอดประสานสมบูรณ์',
    desc: `ท่อนบน ${upperRatioPct}% : ท่อนล่าง ${lowerRatioPct}% สอดคล้องกับโครงสร้างกล้ามเนื้อของร่างกายมนุษย์`,
    action: 'โครงสร้าง Kinetic Chain สมบูรณ์พร้อมสำหรับการทำกิจกรรมหนักและการซ้อมเดินป่า'
  }
  if (lowerRatioPct < 30) {
    upperLowerInsight = {
      badge: 'ช่วงล่างต่ำกว่าเกณฑ์ (Skip Leg Day Risk)',
      badgeColor: 'bg-rose-50 text-rose-800 border-rose-200',
      title: 'ฐานความแข็งแรงของสะโพกและขาอาจไม่มั่นคงพอ',
      desc: `วอลลุ่มช่วงล่างมีเพียง ${lowerRatioPct}% ขาเป็นกล้ามเนื้อมัดใหญ่ที่สุด หากไม่กระตุ้นจะเสียโอกาสเร่งการเผาผลาญไขมันและฮอร์โมนเทสโทสเตอโรนตามธรรมชาติ`,
      action: '💡 แนะนำ: เพิ่มท่า Goblet Squat หรือ Walking Lunge สัปดาห์ละ 1-2 ครั้งเพื่อสร้างฐานที่มั่นคง'
    }
  } else if (lowerRatioPct > 65) {
    upperLowerInsight = {
      badge: 'เน้นช่วงล่างสูง (Lower Dominant)',
      badgeColor: 'bg-indigo-50 text-indigo-800 border-indigo-200',
      title: 'ความทนทานของขาสูง เหมาะสำหรับการเดินป่าระยะไกล',
      desc: `ช่วงล่างได้รับการฝึกสูงถึง ${lowerRatioPct}% เหมาะสมยิ่งกับการปีนเขา แต่ท่อนบนอาจยังไม่เต็มศักยภาพ`,
      action: '💡 แนะนำ: เสริมเวทท่อนบน (อก หลัง ไหล่) เพื่อรักษาสัดส่วนและความสมดุลทั่วเรือนร่าง'
    }
  }

  // 3. CNS Readiness / ACWR Insight
  let cnsInsight = {
    badge: 'Optimal Sweet Spot (ปลอดภัยสูงสุด)',
    badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    title: 'ปริมาณงานสะสมอยู่ในช่วงพัฒนาความแข็งแรงสูงสุด',
    desc: `ACWR อยู่ที่ ${acwrValue} (โซนมาตรฐาน 0.8 - 1.3) บ่งชี้ว่าระบบประสาทและกล้ามเนื้อปรับตัวทัน ไม่มีความล้าค้างสะสม`,
    action: 'สามารถฝึกตามตารางต่อได้ตามปกติ หรือค่อยๆ เพิ่มน้ำหนักแบบ Progressive Overload ได้อย่างมั่นใจ'
  }
  if (acwrValue > 1.35) {
    cnsInsight = {
      badge: 'Acute Spike Alert (งานพุ่งกระทันหัน)',
      badgeColor: 'bg-rose-50 text-rose-800 border-rose-200',
      title: 'ความเสี่ยงต่อการเจ็บล้ากล้ามเนื้อสะสมหรือเส้นเอ็นอักเสบ',
      desc: `ACWR พุ่งสูงถึง ${acwrValue} บ่งบอกว่าภาระงาน 7 วันล่าสุดเพิ่มเร็วกว่าค่าเฉลี่ย 4 สัปดาห์มากเกินไป`,
      action: '💡 แนะนำ: ปรับลดน้ำหนักหรือเซ็ตลง 15-20% ใน 2-3 วันข้างหน้า เน้นการยืดเหยียดและนอนหลับให้เพียงพอ'
    }
  } else if (acwrValue < 0.8) {
    cnsInsight = {
      badge: 'Fresh & Recovered (ร่างกายสดชื่น)',
      badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
      title: 'ระบบประสาทฟื้นตัวเต็มร้อย พร้อมรับงานหนัก',
      desc: `ACWR อยู่ที่ ${acwrValue} ร่างกายฟื้นตัวอย่างเต็มที่ ไม่มีภาระความล้าตกค้าง สามารถท้าทายระดับใหม่ได้`,
      action: '💡 แนะนำ: สามารถเพิ่มน้ำหนักดัมเบลหรือเพิ่มจำนวนครั้ง (Reps) เพื่อกระตุ้นมวลกล้ามเนื้อได้อย่างปลอดภัย'
    }
  }

  const muscleThaiNames = {
    Chest: 'กล้ามเนื้อหน้าอก (Chest)',
    Back: 'กล้ามเนื้อแผ่นหลังและปีก (Back)',
    Shoulders: 'กล้ามเนื้อหัวไหล่ (Shoulders)',
    Arms: 'กล้ามเนื้อแขน (Arms)',
    Legs: 'กล้ามเนื้อต้นขาและก้น (Legs & Glutes)',
    Core: 'กล้ามเนื้อแกนกลางลำตัว (Core & Abs)'
  }

  const handleExportCSV = () => {
    if (!allHistoricalLogs || allHistoricalLogs.length === 0) {
      alert('ยังไม่มีประวัติการฝึกในฐานข้อมูลสำหรับส่งออกไฟล์ CSV')
      return
    }

    const headers = [
      'วันที่ (Date)',
      'ชื่อท่าฝึก (Exercise Name)',
      'กล้ามเนื้อหลัก (Muscle Group)',
      'อุปกรณ์ (Equipment)',
      'เซ็ต (Sets)',
      'ครั้ง (Reps)',
      'น้ำหนักบันทึก_Kg (Logged Weight)',
      'ปริมาณงานรวม_Kg (Volume Load)',
      'เวลาฝึก_นาที (Duration Mins)',
      'เผาผลาญ_kcal (Calories Burned)'
    ]

    const sortedLogs = [...allHistoricalLogs].sort(
      (a, b) => parseLocalISO(b.date) - parseLocalISO(a.date)
    )

    const escapeCsvCell = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`

    const rows = sortedLogs.map(l => {
      const s = parseInt(l.sets) || 0
      const r = parseInt(l.reps) || 0
      const w = parseFloat(l.weight_kg) || 0
      const loadMeta = getEquipmentLoadMeta({
        name: l.exercise_name,
        type: l.equipment_type || 'Dumbbell'
      })
      const vol = l.muscle_group === 'Cardio' ? 0 : s * r * (w * loadMeta.bilateralMultiplier)

      return [
        l.date || '',
        l.exercise_name || '',
        l.muscle_group || '',
        l.equipment_type || '',
        s,
        r,
        w,
        vol,
        l.duration_mins || 0,
        l.kcal_burned || 0
      ].map(escapeCsvCell).join(',')
    })

    const csvContent = '\uFEFF' + [headers.map(escapeCsvCell).join(','), ...rows].join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `konmuang_fitness_logs_${formatLocalISO(new Date())}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleCopyExecutiveReport = async () => {
    const reportLines = [
      `📊 รายงานสรุปผลการฝึก (คนเมืองตามป่า Adaptive Science Pro)`,
      `ประจำวันที่: ${formatLocalISO(new Date())}`,
      `• เวลาฝึกซ้อมสะสม (7 วัน): ${currentWeekStats.totalMins} นาที`,
      `• ปริมาณงานเวทเทรนนิ่ง (Volume Load): ${currentWeekStats.volume.toLocaleString()} kg (${currentWeekStats.sets} เซ็ต)`,
      `• พลังงานเผาผลาญสะสม: ${currentWeekStats.calories.toLocaleString()} kcal`,
      `• ระยะทางคาร์ดิโอสะสม: ${currentWeekStats.cardioDist.toFixed(2)} km`,
      `• ดัชนีความพร้อมระบบประสาท (ACWR): ${acwrValue}`
    ].join('\n')

    try {
      await navigator.clipboard.writeText(reportLines)
      setCopySuccessMsg('คัดลอกรายงานสรุปลงคลิปบอร์ดเรียบร้อย!')
      setTimeout(() => setCopySuccessMsg(''), 3000)
    } catch {
      alert('ไม่สามารถคัดลอกอัตโนมัติได้')
    }
  }

  const latestWeight = weightLogs.length > 0 ? weightLogs[weightLogs.length - 1].weight : parseFloat(currentWeightInput) || profile?.weight_kg || 70
  const firstWeight = weightLogs.length > 0 ? weightLogs[0].weight : latestWeight
  const weightDiff = Number((latestWeight - firstWeight).toFixed(1))
  const liveBmi = Number((latestWeight / Math.pow((profile?.height_cm || userHeightCm) / 100, 2)).toFixed(1))

  const activeGender = profile?.gender || userGender
  const activeHeight = profile?.height_cm || userHeightCm
  const activeWeight = latestWeight
  const activeAge = profile?.age || userAge
  const activeBodyType = profile?.body_type || userBodyType
  const activeGoal = profile?.goal || userGoal

  const weightChartData = weightLogs.map(w => ({
    date: w.date ? w.date.slice(5) : '--',
    weight: w.weight
  }))

  // แยกแสดงเฉพาะส่วนโภชนาการและน้ำหนักตัวหาก mode === 'nutrition'
  if (mode === 'nutrition') {
    return (
      <div className="space-y-6">
        {/* ภาพจำลองสรีระและการเปลี่ยนแปลงตามความเป็นจริง (Body Morphology Visual) */}
        <BodyMorphologyVisual
          gender={activeGender}
          height_cm={activeHeight}
          weight_kg={activeWeight}
          age={activeAge}
          body_type={activeBodyType}
          goal={activeGoal}
          historicalLogs={allHistoricalLogs}
          weightLogs={weightLogs}
          mode="compact"
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm lg:col-span-7">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">
                  กราฟติดตามการเปลี่ยนแปลงน้ำหนักตัว & ดัชนีมวลกาย (Weight Trajectory)
                </h2>
                <p className="text-xs text-slate-500">บันทึกน้ำหนักตัวเพื่อดูแนวโน้มการลดไขมันและสร้างมวลกล้ามเนื้อ</p>
              </div>
              <span className="px-3 py-1 text-xs font-black text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl">
                BMI ปัจจุบัน: {liveBmi} ({weightDiff > 0 ? `+${weightDiff}` : weightDiff} kg)
              </span>
            </div>

            <form onSubmit={handleRecordWeight} className="flex gap-3 mb-6">
              <input
                type="number"
                step="0.1"
                value={currentWeightInput}
                onChange={(e) => setCurrentWeightInput(e.target.value)}
                placeholder="กรอกน้ำหนักวันนี้ (kg)"
                className="flex-1 px-4 py-2.5 text-sm font-bold bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
              <button
                type="submit"
                disabled={isSavingWeight}
                className="px-6 py-2.5 text-xs font-extrabold text-white bg-slate-900 rounded-xl hover:bg-emerald-700 disabled:opacity-50"
              >
                {isSavingWeight ? 'กำลังบันทึก...' : '+ บันทึกน้ำหนักวันนี้'}
              </button>
            </form>

            <SmoothAreaChart
              data={weightChartData}
              valueKey="weight"
              unit="kg"
              strokeColor="#10b981"
              gradId="weightAreaGrad"
            />
          </div>

          <div className="p-6 bg-slate-900 text-white rounded-3xl shadow-sm lg:col-span-5 flex flex-col justify-between">
            <div>
              <span className="px-2.5 py-1 text-[10px] font-black text-slate-950 bg-emerald-400 rounded-lg uppercase">
                EXECUTIVE DATA HUB
              </span>
              <h2 className="mt-3 text-lg font-bold text-white">
                ส่งออกฐานข้อมูลการฝึก (Excel CSV & Executive Report)
              </h2>
              <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                ดาวน์โหลดประวัติการฝึกทั้งหมด ({allHistoricalLogs.length} รายการ) เป็นไฟล์ CSV เข้ารหัส UTF-8 BOM เปิดใน Microsoft Excel ภาษาไทยไม่เพี้ยน 100%
              </p>
            </div>

            <div className="space-y-3 mt-6">
              <button
                type="button"
                onClick={handleExportCSV}
                className="w-full py-3 text-xs font-extrabold text-slate-950 bg-emerald-400 rounded-xl hover:bg-emerald-300 transition"
              >
                📥 ดาวน์โหลดไฟล์ CSV สำหรับ Excel ({allHistoricalLogs.length} รายการ)
              </button>
              <button
                type="button"
                onClick={handleCopyExecutiveReport}
                className="w-full py-3 text-xs font-bold text-white bg-slate-800 border border-slate-700 rounded-xl hover:bg-slate-700 transition"
              >
                📋 คัดลอกรายงานสรุปผลการฝึก 7 วันล่าสุด
              </button>
              {copySuccessMsg && (
                <div className="p-2.5 text-center text-xs font-bold text-emerald-300 bg-emerald-950 border border-emerald-700 rounded-xl">
                  ✓ {copySuccessMsg}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ภาพจำลองสรีระและการเปลี่ยนแปลงตามความเป็นจริง (Body Morphology Visual) */}
      <BodyMorphologyVisual
        gender={activeGender}
        height_cm={activeHeight}
        weight_kg={activeWeight}
        age={activeAge}
        body_type={activeBodyType}
        goal={activeGoal}
        historicalLogs={allHistoricalLogs}
        weightLogs={weightLogs}
        mode="full"
      />

      {/* แถวที่ 1: หุ่นสรีระ Heat Map คู่กับ กราฟเรดาร์ 6 เหลี่ยมสมดุลกล้ามเนื้อ */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        
        {/* ซ้าย (6 Cols): ANATOMICAL SVG MUSCLE HEAT MAP & CLINICAL ANALYSIS */}
        <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm lg:col-span-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-extrabold text-slate-900">Anatomical 3D Muscle Heat Map</h2>
                <p className="text-xs text-slate-500">สภาวะการกระตุ้นและความล้าของมัดกล้ามเนื้อ (3D Striated Fibers)</p>
              </div>
              <span className="px-2.5 py-1 text-[10px] font-bold text-slate-600 bg-slate-100 rounded-lg">
                7-Day Rolling
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl">
              {/* ด้านหน้า Anterior */}
              <div className="flex flex-col items-center">
                <span className="mb-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Anterior (ด้านหน้า)</span>
                <svg viewBox="0 0 200 360" className="w-36 h-60 overflow-visible">
                  <defs>
                    <filter id="muscle3d_ant" x="-10%" y="-10%" width="120%" height="120%">
                      <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="#0f172a" floodOpacity="0.25" />
                    </filter>
                  </defs>

                  {/* ศีรษะและลำคอ */}
                  <circle cx="100" cy="24" r="14" fill="#94a3b8" filter="url(#muscle3d_ant)" />
                  <path d="M93 36 L90 52 L110 52 L107 36 Z" fill="#cbd5e1" />

                  {/* หัวไหล่หน้า Deltoids */}
                  <path d="M52 54 C42 58 38 72 42 86 C45 92 55 92 60 86 C64 78 64 66 58 56 Z" fill={getMuscleColor('Shoulders')} filter="url(#muscle3d_ant)" stroke="#ffffff" strokeWidth="1.2" />
                  <path d="M48 68 Q54 76 58 82" stroke="rgba(255,255,255,0.5)" strokeWidth="1.2" strokeDasharray="3 2" fill="none" />
                  <path d="M44 76 Q50 82 54 86" stroke="rgba(255,255,255,0.4)" strokeWidth="1" strokeDasharray="3 2" fill="none" />

                  <path d="M148 54 C158 58 162 72 158 86 C155 92 145 92 140 86 C136 78 136 66 142 56 Z" fill={getMuscleColor('Shoulders')} filter="url(#muscle3d_ant)" stroke="#ffffff" strokeWidth="1.2" />
                  <path d="M152 68 Q146 76 142 82" stroke="rgba(255,255,255,0.5)" strokeWidth="1.2" strokeDasharray="3 2" fill="none" />
                  <path d="M156 76 Q150 82 146 86" stroke="rgba(255,255,255,0.4)" strokeWidth="1" strokeDasharray="3 2" fill="none" />

                  {/* กล้ามเนื้อหน้าอก Pectoralis Major ลายเส้นแผ่ออก */}
                  <path d="M66 54 C78 52 96 54 98 56 L98 90 C86 92 72 88 62 78 C60 70 62 60 66 54 Z" fill={getMuscleColor('Chest')} filter="url(#muscle3d_ant)" stroke="#ffffff" strokeWidth="1.2" />
                  <path d="M96 64 C86 66 76 68 68 70" stroke="rgba(255,255,255,0.5)" strokeWidth="1.2" strokeDasharray="3 2" fill="none" />
                  <path d="M96 74 C86 76 78 78 68 80" stroke="rgba(255,255,255,0.5)" strokeWidth="1.2" strokeDasharray="3 2" fill="none" />
                  <path d="M96 82 C88 84 80 86 72 86" stroke="rgba(255,255,255,0.4)" strokeWidth="1" strokeDasharray="3 2" fill="none" />

                  <path d="M134 54 C122 52 104 54 102 56 L102 90 C114 92 128 88 138 78 C140 70 138 60 134 54 Z" fill={getMuscleColor('Chest')} filter="url(#muscle3d_ant)" stroke="#ffffff" strokeWidth="1.2" />
                  <path d="M104 64 C114 66 124 68 132 70" stroke="rgba(255,255,255,0.5)" strokeWidth="1.2" strokeDasharray="3 2" fill="none" />
                  <path d="M104 74 C114 76 122 78 132 80" stroke="rgba(255,255,255,0.5)" strokeWidth="1.2" strokeDasharray="3 2" fill="none" />
                  <path d="M104 82 C112 84 120 86 128 86" stroke="rgba(255,255,255,0.4)" strokeWidth="1" strokeDasharray="3 2" fill="none" />

                  {/* กล้ามเนื้อหน้าท้อง 6 ก้อน และ เอวข้าง Obliques */}
                  <rect x="80" y="94" width="18" height="18" rx="4" fill={getMuscleColor('Core')} filter="url(#muscle3d_ant)" stroke="#ffffff" strokeWidth="1" />
                  <rect x="102" y="94" width="18" height="18" rx="4" fill={getMuscleColor('Core')} filter="url(#muscle3d_ant)" stroke="#ffffff" strokeWidth="1" />
                  <rect x="81" y="115" width="17" height="18" rx="4" fill={getMuscleColor('Core')} filter="url(#muscle3d_ant)" stroke="#ffffff" strokeWidth="1" />
                  <rect x="102" y="115" width="17" height="18" rx="4" fill={getMuscleColor('Core')} filter="url(#muscle3d_ant)" stroke="#ffffff" strokeWidth="1" />
                  <rect x="82" y="136" width="16" height="20" rx="4" fill={getMuscleColor('Core')} filter="url(#muscle3d_ant)" stroke="#ffffff" strokeWidth="1" />
                  <rect x="102" y="136" width="16" height="20" rx="4" fill={getMuscleColor('Core')} filter="url(#muscle3d_ant)" stroke="#ffffff" strokeWidth="1" />

                  <path d="M66 94 C76 102 78 128 80 156 L70 152 C64 132 62 112 66 94 Z" fill={getMuscleColor('Core')} filter="url(#muscle3d_ant)" stroke="#ffffff" strokeWidth="1" opacity="0.9" />
                  <path d="M134 94 C124 102 122 128 120 156 L130 152 C136 132 138 112 134 94 Z" fill={getMuscleColor('Core')} filter="url(#muscle3d_ant)" stroke="#ffffff" strokeWidth="1" opacity="0.9" />
                  <path d="M68 112 Q74 122 78 132" stroke="rgba(255,255,255,0.4)" strokeWidth="1" strokeDasharray="2 2" fill="none" />
                  <path d="M132 112 Q126 122 122 132" stroke="rgba(255,255,255,0.4)" strokeWidth="1" strokeDasharray="2 2" fill="none" />

                  {/* แขนหน้า Biceps & ท่อนแขน Forearms */}
                  <path d="M40 88 C36 98 36 114 40 124 C44 126 52 126 56 120 C58 110 56 96 50 88 Z" fill={getMuscleColor('Arms')} filter="url(#muscle3d_ant)" stroke="#ffffff" strokeWidth="1.2" />
                  <path d="M44 98 Q46 108 48 116" stroke="rgba(255,255,255,0.4)" strokeWidth="1" strokeDasharray="2 2" fill="none" />
                  <path d="M36 128 C32 140 32 158 36 170 C40 172 46 168 48 162 C50 150 48 138 44 128 Z" fill={getMuscleColor('Arms')} filter="url(#muscle3d_ant)" stroke="#ffffff" strokeWidth="1" />

                  <path d="M160 88 C164 98 164 114 160 124 C156 126 148 126 144 120 C142 110 144 96 150 88 Z" fill={getMuscleColor('Arms')} filter="url(#muscle3d_ant)" stroke="#ffffff" strokeWidth="1.2" />
                  <path d="M156 98 Q154 108 152 116" stroke="rgba(255,255,255,0.4)" strokeWidth="1" strokeDasharray="2 2" fill="none" />
                  <path d="M164 128 C168 140 168 158 164 170 C160 172 154 168 152 162 C150 150 152 138 156 128 Z" fill={getMuscleColor('Arms')} filter="url(#muscle3d_ant)" stroke="#ffffff" strokeWidth="1" />

                  {/* ต้นขาหน้า Quads และ หน้าแข้ง Calves */}
                  <path d="M70 166 C66 185 64 215 70 245 C76 248 94 246 96 238 C98 210 96 185 94 166 Z" fill={getMuscleColor('Legs')} filter="url(#muscle3d_ant)" stroke="#ffffff" strokeWidth="1.2" />
                  <path d="M76 182 Q82 210 84 236" stroke="rgba(255,255,255,0.45)" strokeWidth="1" strokeDasharray="3 2" fill="none" />
                  <path d="M88 182 Q90 205 92 228" stroke="rgba(255,255,255,0.45)" strokeWidth="1" strokeDasharray="3 2" fill="none" />

                  <path d="M130 166 C134 185 136 215 130 245 C124 248 106 246 104 238 C102 210 104 185 106 166 Z" fill={getMuscleColor('Legs')} filter="url(#muscle3d_ant)" stroke="#ffffff" strokeWidth="1.2" />
                  <path d="M124 182 Q118 210 116 236" stroke="rgba(255,255,255,0.45)" strokeWidth="1" strokeDasharray="3 2" fill="none" />
                  <path d="M112 182 Q110 205 108 228" stroke="rgba(255,255,255,0.45)" strokeWidth="1" strokeDasharray="3 2" fill="none" />

                  <path d="M72 254 C68 272 68 295 72 322 C76 325 86 325 88 320 C90 298 90 275 86 254 Z" fill={getMuscleColor('Legs')} filter="url(#muscle3d_ant)" stroke="#ffffff" strokeWidth="1" />
                  <path d="M128 254 C132 272 132 295 128 322 C124 325 114 325 112 320 C110 298 110 275 114 254 Z" fill={getMuscleColor('Legs')} filter="url(#muscle3d_ant)" stroke="#ffffff" strokeWidth="1" />
                </svg>
              </div>

              {/* ด้านหลัง Posterior */}
              <div className="flex flex-col items-center">
                <span className="mb-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Posterior (ด้านหลัง)</span>
                <svg viewBox="0 0 200 360" className="w-36 h-60 overflow-visible">
                  <defs>
                    <filter id="muscle3d_post" x="-10%" y="-10%" width="120%" height="120%">
                      <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="#0f172a" floodOpacity="0.25" />
                    </filter>
                  </defs>

                  {/* ศีรษะและลำคอ */}
                  <circle cx="100" cy="24" r="14" fill="#94a3b8" filter="url(#muscle3d_post)" />

                  {/* กล้ามเนื้อสะบักหลัง Trapezius */}
                  <polygon points="100,38 128,62 100,102 72,62" fill={getMuscleColor('Back')} filter="url(#muscle3d_post)" stroke="#ffffff" strokeWidth="1.2" />
                  <line x1="100" y1="42" x2="100" y2="98" stroke="rgba(255,255,255,0.5)" strokeWidth="1.2" strokeDasharray="3 2" />
                  <line x1="88" y1="56" x2="98" y2="72" stroke="rgba(255,255,255,0.4)" strokeWidth="1" strokeDasharray="3 2" />
                  <line x1="112" y1="56" x2="102" y2="72" stroke="rgba(255,255,255,0.4)" strokeWidth="1" strokeDasharray="3 2" />

                  {/* หัวไหล่หลัง Rear Deltoids */}
                  <path d="M52 54 C42 58 38 72 42 86 C45 92 55 92 60 86 C64 78 64 66 58 56 Z" fill={getMuscleColor('Shoulders')} filter="url(#muscle3d_post)" stroke="#ffffff" strokeWidth="1.2" />
                  <path d="M148 54 C158 58 162 72 158 86 C155 92 145 92 140 86 C136 78 136 66 142 56 Z" fill={getMuscleColor('Shoulders')} filter="url(#muscle3d_post)" stroke="#ffffff" strokeWidth="1.2" />

                  {/* ปีกหลัง Latissimus Dorsi ลายเส้นทแยงออกข้าง */}
                  <path d="M72 68 C62 80 60 108 72 136 C80 136 94 132 98 108 C94 92 84 76 72 68 Z" fill={getMuscleColor('Back')} filter="url(#muscle3d_post)" stroke="#ffffff" strokeWidth="1.2" />
                  <path d="M74 86 Q86 102 96 112" stroke="rgba(255,255,255,0.45)" strokeWidth="1" strokeDasharray="3 2" fill="none" />
                  <path d="M74 102 Q84 116 94 124" stroke="rgba(255,255,255,0.45)" strokeWidth="1" strokeDasharray="3 2" fill="none" />

                  <path d="M128 68 C138 80 140 108 128 136 C120 136 106 132 102 108 C106 92 116 76 128 68 Z" fill={getMuscleColor('Back')} filter="url(#muscle3d_post)" stroke="#ffffff" strokeWidth="1.2" />
                  <path d="M126 86 Q114 102 104 112" stroke="rgba(255,255,255,0.45)" strokeWidth="1" strokeDasharray="3 2" fill="none" />
                  <path d="M126 102 Q116 116 106 124" stroke="rgba(255,255,255,0.45)" strokeWidth="1" strokeDasharray="3 2" fill="none" />

                  {/* หลังล่าง Erector Spinae */}
                  <rect x="85" y="138" width="13" height="24" rx="4" fill={getMuscleColor('Back')} filter="url(#muscle3d_post)" stroke="#ffffff" strokeWidth="1" />
                  <rect x="102" y="138" width="13" height="24" rx="4" fill={getMuscleColor('Back')} filter="url(#muscle3d_post)" stroke="#ffffff" strokeWidth="1" />

                  {/* แขนหลัง Triceps & ท่อนแขน */}
                  <path d="M40 88 C36 98 36 114 40 124 C44 126 52 126 56 120 C58 110 56 96 50 88 Z" fill={getMuscleColor('Arms')} filter="url(#muscle3d_post)" stroke="#ffffff" strokeWidth="1.2" />
                  <path d="M36 128 C32 140 32 158 36 170 C40 172 46 168 48 162 C50 150 48 138 44 128 Z" fill={getMuscleColor('Arms')} filter="url(#muscle3d_post)" stroke="#ffffff" strokeWidth="1" />

                  <path d="M160 88 C164 98 164 114 160 124 C156 126 148 126 144 120 C142 110 144 96 150 88 Z" fill={getMuscleColor('Arms')} filter="url(#muscle3d_post)" stroke="#ffffff" strokeWidth="1.2" />
                  <path d="M164 128 C168 140 168 158 164 170 C160 172 154 168 152 162 C150 150 152 138 156 128 Z" fill={getMuscleColor('Arms')} filter="url(#muscle3d_post)" stroke="#ffffff" strokeWidth="1" />

                  {/* กล้ามเนื้อก้น Gluteus Maximus */}
                  <path d="M72 164 C68 178 70 196 82 202 C92 206 98 198 98 166 Z" fill={getMuscleColor('Legs')} filter="url(#muscle3d_post)" stroke="#ffffff" strokeWidth="1.2" />
                  <path d="M76 174 Q84 186 94 192" stroke="rgba(255,255,255,0.45)" strokeWidth="1" strokeDasharray="3 2" fill="none" />

                  <path d="M128 164 C132 178 130 196 118 202 C108 206 102 198 102 166 Z" fill={getMuscleColor('Legs')} filter="url(#muscle3d_post)" stroke="#ffffff" strokeWidth="1.2" />
                  <path d="M124 174 Q116 186 106 192" stroke="rgba(255,255,255,0.45)" strokeWidth="1" strokeDasharray="3 2" fill="none" />

                  {/* ต้นขาหลัง Hamstrings */}
                  <path d="M72 206 C68 220 68 238 72 248 C78 250 94 248 96 244 C98 234 98 220 96 206 Z" fill={getMuscleColor('Legs')} filter="url(#muscle3d_post)" stroke="#ffffff" strokeWidth="1.2" />
                  <line x1="84" y1="212" x2="84" y2="242" stroke="rgba(255,255,255,0.4)" strokeWidth="1" strokeDasharray="3 2" />

                  <path d="M128 206 C132 220 132 238 128 248 C122 250 106 248 104 244 C102 234 102 220 104 206 Z" fill={getMuscleColor('Legs')} filter="url(#muscle3d_post)" stroke="#ffffff" strokeWidth="1.2" />
                  <line x1="116" y1="212" x2="116" y2="242" stroke="rgba(255,255,255,0.4)" strokeWidth="1" strokeDasharray="3 2" />

                  {/* น่องหลัง Gastrocnemius */}
                  <path d="M70 256 C66 272 68 296 74 322 C78 325 86 325 88 320 C92 296 92 272 88 256 Z" fill={getMuscleColor('Legs')} filter="url(#muscle3d_post)" stroke="#ffffff" strokeWidth="1.2" />
                  <path d="M130 256 C134 272 132 296 126 322 C122 325 114 325 112 320 C108 296 108 272 112 256 Z" fill={getMuscleColor('Legs')} filter="url(#muscle3d_post)" stroke="#ffffff" strokeWidth="1.2" />
                </svg>
              </div>
            </div>

            {/* แถบคำอธิบายสีสถานะ */}
            <div className="grid grid-cols-2 gap-2 mt-4 text-[11px] sm:grid-cols-4">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-slate-200 border border-slate-300"></span>
                <span className="text-slate-600">Recovered (0%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-amber-500"></span>
                <span className="text-slate-600">Light (1-49%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-emerald-500"></span>
                <span className="text-slate-600">Optimal (50-99%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-rose-600"></span>
                <span className="text-slate-600">Fatigued (100%+)</span>
              </div>
            </div>
          </div>

          {/* 📋 ส่วนที่ 5: บทวิเคราะห์สรีระและการฟื้นตัวของมัดกล้ามเนื้อ (Clinical Muscle Recovery Insights) */}
          <div className="mt-5 pt-4 border-t border-slate-100 space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                <span>📋</span> บทวิเคราะห์สรีระและการฟื้นตัวของกล้ามเนื้อ
              </h3>
              <span className="text-[10px] text-slate-400 font-semibold">อิงจากวอลลุ่มสะสมรอบสัปดาห์</span>
            </div>

            {/* สรุปสถานะ 3 กลุ่ม */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              {/* กลุ่มพักฟื้น */}
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-100">
                <div className="font-extrabold text-rose-800 text-[11px] flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-600"></span> ควรพักฟื้น (Fatigued)
                </div>
                <div className="mt-1 text-[11px] text-rose-700 font-medium">
                  {fatiguedMuscles.length > 0 ? (
                    fatiguedMuscles.map(m => m.group).join(', ')
                  ) : (
                    <span className="text-slate-500 italic">ไม่มีมัดที่ล้าเกินเกณฑ์</span>
                  )}
                </div>
              </div>

              {/* กลุ่มเหมาะสม */}
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
                <div className="font-extrabold text-emerald-800 text-[11px] flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-600"></span> กระตุ้นเหมาะสม (Optimal)
                </div>
                <div className="mt-1 text-[11px] text-emerald-700 font-medium">
                  {optimalMuscles.length > 0 ? (
                    optimalMuscles.map(m => `${m.group} (${m.ratio}%)`).join(', ')
                  ) : (
                    <span className="text-slate-500 italic">ยังไม่ถึงระดับ 50%</span>
                  )}
                </div>
              </div>

              {/* กลุ่มพร้อมฝึก / ฝึกน้อย */}
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-100">
                <div className="font-extrabold text-amber-800 text-[11px] flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span> พร้อมฝึก / สดชื่น (Fresh)
                </div>
                <div className="mt-1 text-[11px] text-amber-700 font-medium">
                  {freshMuscles.length > 0 ? (
                    freshMuscles.map(m => m.group).join(', ')
                  ) : (
                    <span className="text-slate-500 italic">ครบทุกมัด</span>
                  )}
                </div>
              </div>
            </div>

            {/* แนะนำท่าเล่นสำหรับกล้ามเนื้อที่ยังฝึกน้อย */}
            {laggingMuscle && (
              <div className="p-3 bg-slate-50 border border-slate-200/90 rounded-2xl">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-800">
                    💡 มัดที่ยังฝึกน้อย: <span className="text-emerald-700 font-black">{muscleThaiNames[laggingMuscle.group] || laggingMuscle.group}</span> ({laggingMuscle.ratio}%)
                  </span>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 bg-amber-100 text-amber-900 rounded-md">
                    ต้องการวอลลุ่มเพิ่ม
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mb-2 leading-relaxed">
                  กล้ามเนื้อมัดนี้ยังได้รับการกระตุ้นน้อยในรอบ 7 วันที่ผ่านมา แนะนำเพิ่มท่าฝึกต่อไปนี้ในตารางฝึกถัดไป:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                  {(RECOMMENDED_EXERCISES[laggingMuscle.group] || []).map((ex, idx) => (
                    <div key={idx} className="p-2 bg-white border border-slate-200 rounded-xl text-left shadow-2xs">
                      <div className="text-[11px] font-extrabold text-slate-900">{ex.name}</div>
                      <div className="text-[10px] text-slate-400 font-medium">{ex.en}</div>
                      <div className="text-[10px] text-emerald-700 mt-0.5 leading-snug">{ex.tip}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ขวา (6 Cols): 6-AXIS MUSCLE RADAR SPIDER CHART, DONUT GAUGES & COACHING ANALYSIS */}
        <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm lg:col-span-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
              <div>
                <h2 className="text-base font-extrabold text-slate-900">6-Axis Muscle Symmetry Radar</h2>
                <p className="text-xs text-slate-500">เรดาร์วิเคราะห์ความสมดุลของกล้ามเนื้อทั้ง 6 แกนหลัก</p>
              </div>
              <span className="px-2.5 py-1 text-[10px] font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg">
                Schoenfeld MAV
              </span>
            </div>

            <MuscleRadarChart muscleActivationMatrix={muscleActivationMatrix} />

            {/* 3 เกจวงกลมโดนัท (Donut Ring Gauges) */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 pt-2">
              <DonutGauge
                percent={pushRatioPct}
                centerText={`${pushRatioPct}:${pullRatioPct}`}
                title="Push : Pull"
                subtitle="สมดุลแรงดันต่อแรงดึง"
                primaryColor="#f43f5e"
              />
              <DonutGauge
                percent={lowerRatioPct}
                centerText={`${upperRatioPct}:${lowerRatioPct}`}
                title="Upper : Lower"
                subtitle="สัดส่วนช่วงบนต่อช่วงล่าง"
                primaryColor="#10b981"
              />
              <DonutGauge
                percent={cnsReadinessPct}
                centerText={`ACWR ${acwrValue}`}
                title="CNS Readiness"
                subtitle="ความสดของระบบประสาท"
                primaryColor="#4f46e5"
              />
            </div>
          </div>

          {/* 🎯 ส่วนที่ 6: บทวิเคราะห์ความสมดุลกล้ามเนื้อ 6 แกน และคำแนะนำของโค้ช */}
          <div className="mt-5 pt-4 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                <span>🎯</span> บทวิเคราะห์ความสมดุล 6 แกน & คำแนะนำโค้ช
              </h3>
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-lg">
                Biomechanical Coaching
              </span>
            </div>

            <div className="space-y-2.5">
              {/* การ์ดวิเคราะห์ Push vs Pull */}
              <div className="p-3 bg-slate-50 border border-slate-200/90 rounded-2xl">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                    <span>⚖️</span> สมดุลแรงผลัก vs แรงดึง ({pushRatioPct}% : {pullRatioPct}%)
                  </span>
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${pushPullInsight.badgeColor}`}>
                    {pushPullInsight.badge}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">{pushPullInsight.desc}</p>
                <div className="text-[11px] font-bold text-slate-800 mt-1 flex items-center gap-1">
                  <span>👉</span> {pushPullInsight.action}
                </div>
              </div>

              {/* การ์ดวิเคราะห์ Upper vs Lower */}
              <div className="p-3 bg-slate-50 border border-slate-200/90 rounded-2xl">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                    <span>🦵</span> สัดส่วนท่อนบน vs ท่อนล่าง ({upperRatioPct}% : {lowerRatioPct}%)
                  </span>
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${upperLowerInsight.badgeColor}`}>
                    {upperLowerInsight.badge}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">{upperLowerInsight.desc}</p>
                <div className="text-[11px] font-bold text-slate-800 mt-1 flex items-center gap-1">
                  <span>👉</span> {upperLowerInsight.action}
                </div>
              </div>

              {/* การ์ดวิเคราะห์ CNS Readiness & ACWR */}
              <div className="p-3 bg-slate-50 border border-slate-200/90 rounded-2xl">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                    <span>🧠</span> ความสดระบบประสาท & ดัชนี ACWR ({acwrValue})
                  </span>
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${cnsInsight.badgeColor}`}>
                    {cnsInsight.badge}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">{cnsInsight.desc}</p>
                <div className="text-[11px] font-bold text-slate-800 mt-1 flex items-center gap-1">
                  <span>👉</span> {cnsInsight.action}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* แถวที่ 2: กราฟเส้นโค้ง Area Gradient (1RM Trajectory) คู่กับ ตารางเปรียบเทียบสัปดาห์ชนสัปดาห์ */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Progressive Overload Curve (Estimated 1RM)</h2>
              <p className="text-xs text-slate-500">กราฟเส้นแนวโน้มการพัฒนาพละกำลังสูงสุดรายท่าฝึก (คำนวณสถิติสูงสุดต่อวัน)</p>
            </div>
            {/* ดรอปดาวน์เลือกท่าฝึกแบบจัดกลุ่ม canonical และตัดแท็กซ้ำซ้อน */}
            <select
              value={activeExerciseKey}
              onChange={(e) => setSelectedExercise(e.target.value)}
              className="max-w-[260px] truncate px-3 py-1.5 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              {canonicalExerciseList.length === 0 ? (
                <option value="">ยังไม่มีประวัติท่าเวทเทรนนิ่ง</option>
              ) : (
                canonicalExerciseList.map(item => (
                  <option key={item.key} value={item.key}>
                    {item.displayName} ({item.logs.length} เซ็ต)
                  </option>
                ))
              )}
            </select>
          </div>

          {exerciseTrendData.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              บันทึกสถิติท่าฝึกเพื่อดูกราฟเส้นโค้งพัฒนาการย้อนหลัง
            </div>
          ) : (
            <SmoothAreaChart
              data={exerciseTrendData}
              valueKey="est1RM"
              unit="kg"
              strokeColor="#4f46e5"
              gradId="overloadAreaGrad"
            />
          )}
        </div>

        {/* ตารางเปรียบเทียบสัปดาห์ชนสัปดาห์ (WoW Matrix) */}
        <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm lg:col-span-5">
          <div className="pb-3 mb-4 border-b border-slate-100">
            <h2 className="text-base font-extrabold text-slate-900">Week-over-Week (WoW) Matrix</h2>
            <p className="text-xs text-slate-500">เปรียบเทียบสถิติ 7 วันล่าสุด เทียบกับสัปดาห์ก่อนหน้า</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase">
                  <th className="py-2">ดัชนีชี้วัด (Metric)</th>
                  <th className="py-2 text-right">Prev 7d</th>
                  <th className="py-2 text-right">Curr 7d</th>
                  <th className="py-2 text-right">WoW Δ%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                <tr>
                  <td className="py-3 font-semibold text-slate-800">เวลาฝึกซ้อมรวม (นาที)</td>
                  <td className="py-3 text-right text-slate-500">{prevWeekStats.totalMins}m</td>
                  <td className="py-3 text-right font-bold text-indigo-700">{currentWeekStats.totalMins}m</td>
                  <td className="py-3 text-right font-bold text-indigo-700">
                    {calcDeltaPercent(currentWeekStats.totalMins, prevWeekStats.totalMins)}
                  </td>
                </tr>
                <tr>
                  <td className="py-3 font-semibold text-slate-800">Volume Load รวม (kg)</td>
                  <td className="py-3 text-right text-slate-500">{prevWeekStats.volume.toLocaleString()}</td>
                  <td className="py-3 text-right font-bold text-slate-900">{currentWeekStats.volume.toLocaleString()}</td>
                  <td className="py-3 text-right font-bold text-emerald-600">
                    {calcDeltaPercent(currentWeekStats.volume, prevWeekStats.volume)}
                  </td>
                </tr>
                <tr>
                  <td className="py-3 font-semibold text-slate-800">จำนวนเซ็ต (Working Sets)</td>
                  <td className="py-3 text-right text-slate-500">{prevWeekStats.sets}</td>
                  <td className="py-3 text-right font-bold text-slate-900">{currentWeekStats.sets}</td>
                  <td className="py-3 text-right font-bold text-emerald-600">
                    {calcDeltaPercent(currentWeekStats.sets, prevWeekStats.sets)}
                  </td>
                </tr>
                <tr>
                  <td className="py-3 font-semibold text-slate-800">เผาผลาญพลังงาน (kcal)</td>
                  <td className="py-3 text-right text-slate-500">{prevWeekStats.calories.toLocaleString()}</td>
                  <td className="py-3 text-right font-bold text-orange-600">{currentWeekStats.calories.toLocaleString()}</td>
                  <td className="py-3 text-right font-bold text-orange-600">
                    {calcDeltaPercent(currentWeekStats.calories, prevWeekStats.calories)}
                  </td>
                </tr>
                <tr>
                  <td className="py-3 font-semibold text-slate-800">ระยะทางคาร์ดิโอ (km)</td>
                  <td className="py-3 text-right text-slate-500">{prevWeekStats.cardioDist.toFixed(2)}</td>
                  <td className="py-3 text-right font-bold text-sky-600">{currentWeekStats.cardioDist.toFixed(2)}</td>
                  <td className="py-3 text-right font-bold text-sky-600">
                    {calcDeltaPercent(currentWeekStats.cardioDist, prevWeekStats.cardioDist)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}