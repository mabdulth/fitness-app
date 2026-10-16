import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import {
  formatLocalISO,
  parseLocalISO,
  getEquipmentLoadMeta,
  estimateExerciseDurationMins
} from '../utils/workoutEngine'

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

export default function AnalyticsWidgets({
  muscleActivationMatrix,
  allHistoricalLogs,
  mode = 'all'
}) {
  const [selectedExercise, setSelectedExercise] = useState('All')
  const [weightLogs, setWeightLogs] = useState([])
  const [currentWeightInput, setCurrentWeightInput] = useState('')
  const [userHeightCm, setUserHeightCm] = useState(172)
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
      .select('weight_kg, height_cm, schedule_overrides')
      .eq('id', session.user.id)
      .single()

    if (data) {
      if (data.weight_kg) setCurrentWeightInput(String(data.weight_kg))
      if (data.height_cm) setUserHeightCm(parseFloat(data.height_cm) || 172)

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

  const uniqueExercises = Array.from(
    new Set(
      allHistoricalLogs
        .filter(l => l.muscle_group !== 'Cardio')
        .map(l => l.exercise_name)
    )
  )

  const activeExerciseFilter =
    selectedExercise === 'All' && uniqueExercises.length > 0
      ? uniqueExercises[0]
      : selectedExercise

  const exerciseTrendData = [...allHistoricalLogs]
    .filter(l => l.exercise_name === activeExerciseFilter && l.muscle_group !== 'Cardio')
    .sort((a, b) => parseLocalISO(a.date) - parseLocalISO(b.date))
    .slice(-10)
    .map(log => {
      const w = parseFloat(log.weight_kg) || 0
      const r = parseInt(log.reps) || 0
      const s = parseInt(log.sets) || 0
      const loadMeta = getEquipmentLoadMeta({
        name: log.exercise_name,
        type: log.equipment_type || 'Dumbbell'
      })
      const est1RM = w > 0 ? Number((w * (1 + r / 30)).toFixed(1)) : 0
      const vol = s * r * (w * loadMeta.bilateralMultiplier)
      return {
        date: log.date ? log.date.slice(5) : '--',
        weight: w,
        reps: r,
        sets: s,
        est1RM,
        volume: vol,
        unitSuffix: loadMeta.unitSuffix
      }
    })

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

  const latestWeight = weightLogs.length > 0 ? weightLogs[weightLogs.length - 1].weight : parseFloat(currentWeightInput) || 70
  const firstWeight = weightLogs.length > 0 ? weightLogs[0].weight : latestWeight
  const weightDiff = Number((latestWeight - firstWeight).toFixed(1))
  const liveBmi = Number((latestWeight / Math.pow(userHeightCm / 100, 2)).toFixed(1))

  const weightChartData = weightLogs.map(w => ({
    date: w.date ? w.date.slice(5) : '--',
    weight: w.weight
  }))

  // แยกแสดงเฉพาะส่วนโภชนาการและน้ำหนักตัวหาก mode === 'nutrition'
  if (mode === 'nutrition') {
    return (
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
    )
  }

  return (
    <div className="space-y-6">
      {/* แถวที่ 1: หุ่นสรีระ Heat Map คู่กับ กราฟเรดาร์ 6 เหลี่ยมสมดุลกล้ามเนื้อ */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        
        {/* ซ้าย (6 Cols): ANATOMICAL SVG MUSCLE HEAT MAP */}
        <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm lg:col-span-6">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Anatomical 3D Muscle Heat Map</h2>
              <p className="text-xs text-slate-500">สภาวะการกระตุ้นและความล้าของมัดกล้ามเนื้อด้านหน้า-ด้านหลัง</p>
            </div>
            <span className="px-2.5 py-1 text-[10px] font-bold text-slate-600 bg-slate-100 rounded-lg">
              7-Day Rolling
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl">
            <div className="flex flex-col items-center">
              <span className="mb-2 text-[11px] font-bold text-slate-500 uppercase">Anterior (ด้านหน้า)</span>
              <svg viewBox="0 0 200 360" className="w-36 h-60">
                <circle cx="100" cy="30" r="18" fill="#cbd5e1" />
                <rect x="92" y="48" width="16" height="12" rx="4" fill="#cbd5e1" />
                <rect x="48" y="60" width="22" height="32" rx="10" fill={getMuscleColor('Shoulders')} stroke="#ffffff" strokeWidth="2" />
                <rect x="130" y="60" width="22" height="32" rx="10" fill={getMuscleColor('Shoulders')} stroke="#ffffff" strokeWidth="2" />
                <rect x="70" y="60" width="29" height="36" rx="6" fill={getMuscleColor('Chest')} stroke="#ffffff" strokeWidth="2" />
                <rect x="101" y="60" width="29" height="36" rx="6" fill={getMuscleColor('Chest')} stroke="#ffffff" strokeWidth="2" />
                <rect x="75" y="98" width="50" height="68" rx="8" fill={getMuscleColor('Core')} stroke="#ffffff" strokeWidth="2" />
                <line x1="100" y1="98" x2="100" y2="166" stroke="#ffffff" strokeWidth="2" />
                <line x1="75" y1="120" x2="125" y2="120" stroke="#ffffff" strokeWidth="1.5" />
                <line x1="75" y1="142" x2="125" y2="142" stroke="#ffffff" strokeWidth="1.5" />
                <rect x="44" y="94" width="20" height="65" rx="8" fill={getMuscleColor('Arms')} stroke="#ffffff" strokeWidth="2" />
                <rect x="136" y="94" width="20" height="65" rx="8" fill={getMuscleColor('Arms')} stroke="#ffffff" strokeWidth="2" />
                <rect x="72" y="170" width="26" height="85" rx="10" fill={getMuscleColor('Legs')} stroke="#ffffff" strokeWidth="2" />
                <rect x="102" y="170" width="26" height="85" rx="10" fill={getMuscleColor('Legs')} stroke="#ffffff" strokeWidth="2" />
                <rect x="75" y="258" width="20" height="75" rx="8" fill={getMuscleColor('Legs')} stroke="#ffffff" strokeWidth="2" />
                <rect x="105" y="258" width="20" height="75" rx="8" fill={getMuscleColor('Legs')} stroke="#ffffff" strokeWidth="2" />
              </svg>
            </div>

            <div className="flex flex-col items-center">
              <span className="mb-2 text-[11px] font-bold text-slate-500 uppercase">Posterior (ด้านหลัง)</span>
              <svg viewBox="0 0 200 360" className="w-36 h-60">
                <circle cx="100" cy="30" r="18" fill="#cbd5e1" />
                <rect x="92" y="48" width="16" height="12" rx="4" fill="#cbd5e1" />
                <rect x="48" y="60" width="22" height="30" rx="10" fill={getMuscleColor('Shoulders')} stroke="#ffffff" strokeWidth="2" />
                <rect x="130" y="60" width="22" height="30" rx="10" fill={getMuscleColor('Shoulders')} stroke="#ffffff" strokeWidth="2" />
                <polygon points="70,60 130,60 122,135 78,135" fill={getMuscleColor('Back')} stroke="#ffffff" strokeWidth="2" />
                <rect x="78" y="136" width="44" height="30" rx="6" fill={getMuscleColor('Back')} stroke="#ffffff" strokeWidth="2" />
                <rect x="44" y="92" width="20" height="65" rx="8" fill={getMuscleColor('Arms')} stroke="#ffffff" strokeWidth="2" />
                <rect x="136" y="92" width="20" height="65" rx="8" fill={getMuscleColor('Arms')} stroke="#ffffff" strokeWidth="2" />
                <rect x="72" y="168" width="27" height="34" rx="10" fill={getMuscleColor('Legs')} stroke="#ffffff" strokeWidth="2" />
                <rect x="101" y="168" width="27" height="34" rx="10" fill={getMuscleColor('Legs')} stroke="#ffffff" strokeWidth="2" />
                <rect x="74" y="204" width="24" height="55" rx="8" fill={getMuscleColor('Legs')} stroke="#ffffff" strokeWidth="2" />
                <rect x="102" y="204" width="24" height="55" rx="8" fill={getMuscleColor('Legs')} stroke="#ffffff" strokeWidth="2" />
                <rect x="76" y="262" width="20" height="70" rx="9" fill={getMuscleColor('Legs')} stroke="#ffffff" strokeWidth="2" />
                <rect x="104" y="262" width="20" height="70" rx="9" fill={getMuscleColor('Legs')} stroke="#ffffff" strokeWidth="2" />
              </svg>
            </div>
          </div>

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

        {/* ขวา (6 Cols): 6-AXIS MUSCLE RADAR SPIDER CHART & DONUT GAUGES */}
        <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm lg:col-span-6 flex flex-col justify-between">
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

          {/* 3 เกจวงกลมโดนัท (Donut Ring Gauges) แทนหลอดยาวแบบเดิม */}
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
      </div>

      {/* แถวที่ 2: กราฟเส้นโค้ง Area Gradient (1RM Trajectory) คู่กับ ตารางเปรียบเทียบสัปดาห์ชนสัปดาห์ */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Progressive Overload Curve (Estimated 1RM)</h2>
              <p className="text-xs text-slate-500">กราฟเส้นแนวโน้มการพัฒนาพละกำลังสูงสุดรายท่าฝึก</p>
            </div>
            <select
              value={activeExerciseFilter}
              onChange={(e) => setSelectedExercise(e.target.value)}
              className="max-w-[240px] truncate px-3 py-1.5 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              {uniqueExercises.length === 0 ? (
                <option value="All">ยังไม่มีประวัติท่าเวทเทรนนิ่ง</option>
              ) : (
                uniqueExercises.map(exName => (
                  <option key={exName} value={exName}>{exName}</option>
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