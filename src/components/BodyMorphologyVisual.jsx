import { useState, useMemo } from 'react'

/**
 * ============================================================================
 * COMPONENT: BodyMorphologyVisual (ภาพจำลองสรีระและการเปลี่ยนแปลงตามความเป็นจริง)
 * ============================================================================
 * แสดงภาพสรีระ 3D Silhouette จำลองรูปร่างของผู้ใช้ตามชีวกลศาสตร์จริง:
 * - คำนวณจากเพศ, ส่วนสูง, น้ำหนัก, อายุ, โครงสร้าง (Body Type)
 * - คำนวณเปอร์เซ็นต์ไขมัน (Body Fat %), มวลกล้ามเนื้อไร้ไขมัน (Lean Mass)
 * - อิงอัตราการออกกำลังกายจริงและความสม่ำเสมอสะสม (Adherence / Volume Load)
 * - มีโหมดเปรียบเทียบสรีระปัจจุบัน vs คาดการณ์ผลลัพธ์ใน 12 สัปดาห์ตามหลักชีววิทยา
 */
export default function BodyMorphologyVisual({
  gender = 'male',
  height_cm = 172,
  weight_kg = 70,
  age = 29,
  body_type = 'Skinny Fat',
  goal = 'Body Recomposition',
  historicalLogs = [],
  weightLogs = [],
  mode = 'full' // 'full' | 'compact'
}) {
  const [viewMode, setViewMode] = useState('current') // 'current' | 'projected'

  const h = parseFloat(height_cm) || 172
  const w = parseFloat(weight_kg) || 70
  const a = parseInt(age) || 29
  const isFemale = gender === 'female'

  // คำนวณความสม่ำเสมอและปริมาณงานจากการฝึกซ้อมจริง (Biological Adaptation)
  const trainingAdherence = useMemo(() => {
    if (!historicalLogs || historicalLogs.length === 0) {
      return { totalDays: 0, weeksActive: 0, totalVolume: 0, adherenceScore: 0 }
    }
    const uniqueDates = new Set(historicalLogs.map(l => l.date)).size
    const weeks = Math.max(1, Math.round(uniqueDates / 3.5))
    const volume = historicalLogs.reduce((sum, l) => {
      const wt = parseFloat(l.weight_kg) || 0
      const r = parseInt(l.reps) || 0
      const s = parseInt(l.sets) || 1
      return sum + wt * r * s
    }, 0)
    // คะแนนความสม่ำเสมอ 0-100%
    const score = Math.min(100, Math.round((uniqueDates / 24) * 50 + (volume / 50000) * 50))
    return {
      totalDays: uniqueDates,
      weeksActive: weeks,
      totalVolume: volume,
      adherenceScore: score
    }
  }, [historicalLogs])

  // คำนวณดัชนีทางชีววิทยา (Biometric Calculations)
  const biometrics = useMemo(() => {
    const bmi = Number((w / Math.pow(h / 100, 2)).toFixed(1))
    
    // โบนัสลดไขมันและเสริมกล้ามเนื้อจากความสม่ำเสมอในการซ้อมจริง (1-4%)
    const volumeFatBonus = Math.min(4.5, (trainingAdherence.adherenceScore / 100) * 4)

    // สูตร Deurenberg ปรับด้วย Body Type
    let baseBF = isFemale
      ? 1.20 * bmi + 0.23 * a - 5.4
      : 1.20 * bmi + 0.23 * a - 16.2

    if (body_type === 'Skinny Fat') baseBF += 2.8
    else if (body_type === 'Endomorph') baseBF += 4.2
    else if (body_type === 'Ectomorph') baseBF -= 3.0
    else if (body_type === 'Athletic') baseBF -= 3.8
    else if (body_type === 'Muscular / Bulking') baseBF += 1.0
    else if (body_type === 'Muscular / Cutting') baseBF -= 5.5

    baseBF = Math.max(0, baseBF - volumeFatBonus)

    const clampedBF = isFemale
      ? Math.max(14.0, Math.min(40.0, Number(baseBF.toFixed(1))))
      : Math.max(8.5, Math.min(36.0, Number(baseBF.toFixed(1))))

    const fatMassKg = Number(((w * clampedBF) / 100).toFixed(1))
    const leanMassKg = Number((w - fatMassKg).toFixed(1))

    // คาดการณ์การเปลี่ยนแปลงใน 12 สัปดาห์ (3 เดือน) ตามหลักชีววิทยาที่เป็นจริงได้
    // (Natural Fat loss: 0.3-0.5kg/week, Muscle gain: 0.25-0.5kg/month)
    let projectedWeight = w
    let projectedBF = clampedBF

    if (goal === 'Fat Loss') {
      projectedWeight = Number((w - 4.8).toFixed(1))
      projectedBF = Math.max(isFemale ? 15 : 9, Number((clampedBF - 4.5).toFixed(1)))
    } else if (goal === 'Body Recomposition') {
      projectedWeight = Number((w - 1.8).toFixed(1))
      projectedBF = Math.max(isFemale ? 16 : 10, Number((clampedBF - 3.5).toFixed(1)))
    } else if (goal === 'Hypertrophy') {
      projectedWeight = Number((w + 2.2).toFixed(1))
      projectedBF = Math.max(isFemale ? 15 : 10, Number((clampedBF - 1.2).toFixed(1)))
    } else if (goal === 'Strength & Endurance') {
      projectedWeight = Number((w - 2.5).toFixed(1))
      projectedBF = Math.max(isFemale ? 16 : 11, Number((clampedBF - 3.0).toFixed(1)))
    } else if (goal === 'Powerlifting') {
      projectedWeight = Number((w + 1.5).toFixed(1))
      projectedBF = Number((clampedBF - 0.5).toFixed(1))
    }

    return {
      bmi,
      bodyFatPct: clampedBF,
      leanMassKg,
      fatMassKg,
      projectedWeight,
      projectedBF,
      projectedLeanMass: Number((projectedWeight * (1 - projectedBF / 100)).toFixed(1))
    }
  }, [w, h, a, isFemale, body_type, goal, trainingAdherence])

  // คำนวณพิกัดสรีระ SVG ตามโหมดปัจจุบันหรือโหมดคาดการณ์
  const activeBF = viewMode === 'current' ? biometrics.bodyFatPct : biometrics.projectedBF
  const activeWeight = viewMode === 'current' ? w : biometrics.projectedWeight

  // พารามิเตอร์รูปทรง SVG (ความกว้างไหล่, รอบเอว, สะโพก, ขา)
  const shapeGeometry = useMemo(() => {
    // ระดับความกว้างเอว (ยิ่งไขมันเยอะ เอวยิ่งหนา)
    const bfRatio = (activeBF - (isFemale ? 18 : 12)) / 20 // -0.5 ถึง 1.5
    const clampedRatio = Math.max(-0.4, Math.min(1.4, bfRatio))

    // ไหล่: ผู้ชายกว้างกว่า, มีกล้ามเนื้อยิ่งกว้าง
    const shoulderWidth = isFemale ? 90 : (108 + (viewMode === 'projected' ? 8 : 4))
    
    // เอว: หดเล็กลงเมื่อลีน / คาดการณ์ผล 12 สัปดาห์
    const baseWaistWidth = isFemale ? 64 : 76
    const waistWidth = baseWaistWidth + clampedRatio * 20

    // สะโพก: ผู้หญิงผายกว้างกว่าตามธรรมชาติ
    const hipWidth = isFemale ? 104 + clampedRatio * 14 : (88 + clampedRatio * 12)

    // ต้นขา: กล้ามเนื้อขา + ชั้นไขมัน
    const thighWidth = isFemale ? 34 + clampedRatio * 6 : 38 + (viewMode === 'projected' ? 3 : 0)

    // ความชัดของกล้ามเนื้อท้อง (Ab definition opacity)
    const abOpacity = isFemale
      ? Math.max(0, Math.min(1, (24 - activeBF) / 8))
      : Math.max(0, Math.min(1, (17 - activeBF) / 7))

    // คำจำกัดความรูปทรง (Archetype Title)
    let archetype = 'สมส่วนสุขภาพดี (Balanced Frame)'
    if (isFemale) {
      if (activeBF <= 20) archetype = 'หุ่นนาฬิกาทรายลีนกระชับ (Athletic Hourglass)'
      else if (activeBF <= 26) archetype = 'หุ่นทรงสปอร์ตสุขภาพดี (Fit & Toned)'
      else archetype = 'หุ่นโค้งเว้าทรงพลัง (Curvy Power)'
    } else {
      if (activeBF <= 12) archetype = 'วี-เทเปอร์กล้ามชัด (Sculpted V-Taper)'
      else if (activeBF <= 18) archetype = 'แอธเลติกนักกีฬา (Athletic Build)'
      else if (body_type === 'Skinny Fat') archetype = 'ปรับกระชับแกนกลาง (Recomp Focus)'
      else archetype = 'โครงสร้างใหญ่ทรงพลัง (Solid Muscular)'
    }

    return {
      shoulderWidth,
      waistWidth,
      hipWidth,
      thighWidth,
      abOpacity,
      archetype
    }
  }, [activeBF, isFemale, viewMode, body_type])

  return (
    <div className="p-5 bg-white border border-slate-200 rounded-3xl shadow-sm">
      {/* ส่วนหัววิดเจ็ต */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-[10px] font-black text-white bg-slate-900 rounded-md uppercase tracking-wider">
              AI SOMATOTYPE AVATAR
            </span>
            <span className="text-xs font-bold text-slate-500">
              {isFemale ? '👩 สรีระสุภาพสตรี' : '👨 สรีระสุภาพบุรุษ'} • {body_type}
            </span>
          </div>
          <h3 className="text-base font-extrabold text-slate-900 mt-1">
            ภาพจำลองรูปร่าง & การเปลี่ยนแปลงตามชีววิทยาจริง
          </h3>
        </div>

        {/* ปุ่มสลับโหมด: หุ่นปัจจุบัน vs คาดการณ์ 12 สัปดาห์ */}
        <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setViewMode('current')}
            className={`px-3 py-1.5 text-xs font-extrabold rounded-lg transition ${
              viewMode === 'current'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            สรีระปัจจุบัน ({w} kg)
          </button>
          <button
            type="button"
            onClick={() => setViewMode('projected')}
            className={`px-3 py-1.5 text-xs font-extrabold rounded-lg transition flex items-center gap-1 ${
              viewMode === 'projected'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-emerald-700 hover:text-emerald-900'
            }`}
          >
            <span>✨ คาดการณ์ 12 สัปดาห์ ({biometrics.projectedWeight} kg)</span>
          </button>
        </div>
      </div>

      {/* เนื้อหาหลัก: หุ่นจำลอง Silhouette SVG คู่กับ สถิติองค์ประกอบร่างกาย */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        
        {/* ซ้าย (5 Cols): SVG 3D-STYLED ANATOMICAL SILHOUETTE */}
        <div className="md:col-span-5 flex flex-col items-center justify-center p-4 bg-gradient-to-b from-slate-900 to-slate-950 rounded-2xl relative overflow-hidden border border-slate-800">
          
          {/* ป้ายกำกับโหมดที่แสดง */}
          <div className="absolute top-3 left-3 z-10">
            <span className={`px-2 py-0.5 text-[10px] font-black rounded-md uppercase tracking-wider ${
              viewMode === 'current'
                ? 'bg-slate-800 text-slate-300 border border-slate-700'
                : 'bg-emerald-500 text-slate-950 font-black'
            }`}>
              {viewMode === 'current' ? 'CURRENT PROFILE' : '12-WEEK PROJECTION'}
            </span>
          </div>

          <div className="absolute top-3 right-3 z-10 text-[10px] font-bold text-slate-400">
            {shapeGeometry.archetype}
          </div>

          {/* SVG Canvas หุ่นจำลองสรีระ */}
          <svg viewBox="0 0 240 330" className="w-48 h-64 overflow-visible drop-shadow-2xl">
            <defs>
              <linearGradient id="bodyGradMale" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="40%" stopColor="#0284c7" />
                <stop offset="100%" stopColor="#0f172a" />
              </linearGradient>

              <linearGradient id="bodyGradFemale" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f472b6" />
                <stop offset="40%" stopColor="#db2777" />
                <stop offset="100%" stopColor="#0f172a" />
              </linearGradient>

              <linearGradient id="projectedGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#34d399" />
                <stop offset="40%" stopColor="#059669" />
                <stop offset="100%" stopColor="#064e3b" />
              </linearGradient>

              <filter id="bodyGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#38bdf8" floodOpacity="0.3" />
              </filter>
            </defs>

            {/* ไกด์ไลน์ระนาบสรีระ (Shoulder, Waist, Hip Measurement Calipers) */}
            <g stroke="rgba(255,255,255,0.15)" strokeDasharray="2 3">
              <line x1="20" y1="56" x2="220" y2="56" />
              <line x1="20" y1="125" x2="220" y2="125" />
              <line x1="20" y1="160" x2="220" y2="160" />
            </g>

            {/* ข้อความกำกับระนาบสรีระ */}
            <text x="25" y="53" className="text-[8px] font-bold fill-slate-400">SHOULDERS</text>
            <text x="25" y="122" className="text-[8px] font-bold fill-slate-400">WAISTLINE</text>
            <text x="25" y="157" className="text-[8px] font-bold fill-slate-400">PELVIC / HIPS</text>

            {/* ศีรษะและลำคอ */}
            <circle cx="120" cy="24" r="14" fill={viewMode === 'projected' ? 'url(#projectedGrad)' : (isFemale ? 'url(#bodyGradFemale)' : 'url(#bodyGradMale)')} />
            <path d="M114 36 L112 50 L128 50 L126 36 Z" fill="rgba(255,255,255,0.3)" />

            {/* ร่างกายท่อนบน (ลำตัว อก ไหล่ เอว) */}
            {isFemale ? (
              // โครงร่างผู้หญิง (Hourglass & Toned Waist)
              <path
                d={`M${120 - shapeGeometry.shoulderWidth / 2} 54 
                   C${120 - shapeGeometry.shoulderWidth / 2 - 6} 64, ${120 - 44} 80, ${120 - 36} 96 
                   C${120 - 32} 110, ${120 - shapeGeometry.waistWidth / 2} 122, ${120 - shapeGeometry.waistWidth / 2} 128 
                   C${120 - shapeGeometry.waistWidth / 2} 136, ${120 - shapeGeometry.hipWidth / 2} 150, ${120 - shapeGeometry.hipWidth / 2} 162
                   L${120 + shapeGeometry.hipWidth / 2} 162
                   C${120 + shapeGeometry.hipWidth / 2} 150, ${120 + shapeGeometry.waistWidth / 2} 136, ${120 + shapeGeometry.waistWidth / 2} 128
                   C${120 + shapeGeometry.waistWidth / 2} 122, ${120 + 32} 110, ${120 + 36} 96
                   C${120 + 44} 80, ${120 + shapeGeometry.shoulderWidth / 2 + 6} 64, ${120 + shapeGeometry.shoulderWidth / 2} 54
                   Z`}
                fill={viewMode === 'projected' ? 'url(#projectedGrad)' : 'url(#bodyGradFemale)'}
                stroke="rgba(255,255,255,0.35)"
                strokeWidth="1.5"
              />
            ) : (
              // โครงร่างผู้ชาย (V-Taper & Broad Chest)
              <path
                d={`M${120 - shapeGeometry.shoulderWidth / 2} 54 
                   C${120 - shapeGeometry.shoulderWidth / 2 - 8} 64, ${120 - 52} 80, ${120 - 48} 96 
                   C${120 - 42} 110, ${120 - shapeGeometry.waistWidth / 2} 122, ${120 - shapeGeometry.waistWidth / 2} 128 
                   C${120 - shapeGeometry.waistWidth / 2} 138, ${120 - shapeGeometry.hipWidth / 2} 148, ${120 - shapeGeometry.hipWidth / 2} 160
                   L${120 + shapeGeometry.hipWidth / 2} 160
                   C${120 + shapeGeometry.hipWidth / 2} 148, ${120 + shapeGeometry.waistWidth / 2} 138, ${120 + shapeGeometry.waistWidth / 2} 128
                   C${120 + shapeGeometry.waistWidth / 2} 122, ${120 + 42} 110, ${120 + 48} 96
                   C${120 + 52} 80, ${120 + shapeGeometry.shoulderWidth / 2 + 8} 64, ${120 + shapeGeometry.shoulderWidth / 2} 54
                   Z`}
                fill={viewMode === 'projected' ? 'url(#projectedGrad)' : 'url(#bodyGradMale)'}
                stroke="rgba(255,255,255,0.35)"
                strokeWidth="1.5"
              />
            )}

            {/* กล้ามเนื้อหน้าอก Pectorals / Bust Lines */}
            <path
              d={isFemale 
                ? "M96 82 C104 94 116 94 120 86 C124 94 136 94 144 82" 
                : "M84 76 C98 84 116 84 120 74 C124 84 142 84 156 76"}
              stroke="rgba(255,255,255,0.4)"
              strokeWidth="1.5"
              fill="none"
            />

            {/* ลายเส้นกล้ามท้อง 6-Pack (ปรากฏชัดเมื่อเปอร์เซ็นต์ไขมันต่ำ) */}
            <g opacity={shapeGeometry.abOpacity} stroke="rgba(255,255,255,0.5)" strokeWidth="1.2" fill="none">
              <line x1="120" y1="88" x2="120" y2="135" />
              <path d="M106 100 Q120 102 134 100" />
              <path d="M108 114 Q120 116 132 114" />
              <path d="M110 128 Q120 130 130 128" />
            </g>

            {/* แขนซ้าย-ขวา */}
            <path
              d={`M${120 - shapeGeometry.shoulderWidth / 2 - 2} 56
                 C${120 - shapeGeometry.shoulderWidth / 2 - 14} 80, ${120 - shapeGeometry.shoulderWidth / 2 - 18} 115, ${120 - shapeGeometry.shoulderWidth / 2 - 12} 150
                 L${120 - shapeGeometry.shoulderWidth / 2 - 2} 148
                 C${120 - shapeGeometry.shoulderWidth / 2 - 6} 115, ${120 - shapeGeometry.shoulderWidth / 2 - 4} 80, ${120 - shapeGeometry.shoulderWidth / 2 + 6} 58
                 Z`}
              fill={viewMode === 'projected' ? 'url(#projectedGrad)' : (isFemale ? 'url(#bodyGradFemale)' : 'url(#bodyGradMale)')}
              stroke="rgba(255,255,255,0.3)"
              strokeWidth="1"
            />
            <path
              d={`M${120 + shapeGeometry.shoulderWidth / 2 + 2} 56
                 C${120 + shapeGeometry.shoulderWidth / 2 + 14} 80, ${120 + shapeGeometry.shoulderWidth / 2 + 18} 115, ${120 + shapeGeometry.shoulderWidth / 2 + 12} 150
                 L${120 + shapeGeometry.shoulderWidth / 2 + 2} 148
                 C${120 + shapeGeometry.shoulderWidth / 2 + 6} 115, ${120 + shapeGeometry.shoulderWidth / 2 + 4} 80, ${120 + shapeGeometry.shoulderWidth / 2 - 6} 58
                 Z`}
              fill={viewMode === 'projected' ? 'url(#projectedGrad)' : (isFemale ? 'url(#bodyGradFemale)' : 'url(#bodyGradMale)')}
              stroke="rgba(255,255,255,0.3)"
              strokeWidth="1"
            />

            {/* ขาซ้าย-ขวา & น่อง */}
            {/* ขาซ้าย */}
            <path
              d={`M${120 - shapeGeometry.hipWidth / 2 + 2} 162
                 C${120 - shapeGeometry.hipWidth / 2 - 4} 190, ${120 - shapeGeometry.hipWidth / 2 - 2} 225, ${120 - shapeGeometry.thighWidth} 250
                 L${120 - shapeGeometry.thighWidth + 12} 250
                 L${120 - shapeGeometry.thighWidth + 8} 310
                 L${120 - 6} 310
                 L${120 - 8} 250
                 C${120 - 4} 210, ${120 - 4} 185, ${120 - 2} 162
                 Z`}
              fill={viewMode === 'projected' ? 'url(#projectedGrad)' : (isFemale ? 'url(#bodyGradFemale)' : 'url(#bodyGradMale)')}
              stroke="rgba(255,255,255,0.3)"
              strokeWidth="1"
            />

            {/* ขวา */}
            <path
              d={`M${120 + shapeGeometry.hipWidth / 2 - 2} 162
                 C${120 + shapeGeometry.hipWidth / 2 + 4} 190, ${120 + shapeGeometry.hipWidth / 2 + 2} 225, ${120 + shapeGeometry.thighWidth} 250
                 L${120 + shapeGeometry.thighWidth - 12} 250
                 L${120 + shapeGeometry.thighWidth - 8} 310
                 L${120 + 6} 310
                 L${120 + 8} 250
                 C${120 + 4} 210, ${120 + 4} 185, ${120 + 2} 162
                 Z`}
              fill={viewMode === 'projected' ? 'url(#projectedGrad)' : (isFemale ? 'url(#bodyGradFemale)' : 'url(#bodyGradMale)')}
              stroke="rgba(255,255,255,0.3)"
              strokeWidth="1"
            />
          </svg>

          {/* ป้ายแสดงน้ำหนักและเปอร์เซ็นต์ไขมันใต้หุ่น */}
          <div className="mt-2 text-center text-white">
            <span className="text-sm font-black text-emerald-400">{activeWeight} kg</span>
            <span className="text-xs text-slate-400 ml-2">(ไขมัน ~{activeBF}%)</span>
          </div>
        </div>

        {/* ขวา (7 Cols): STATS & BIOLOGICAL ADAPTATION ANALYSIS */}
        <div className="md:col-span-7 space-y-4">
          
          {/* การ์ดสถิติองค์ประกอบร่างกาย 4 ช่อง */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 bg-slate-50 border border-slate-200/90 rounded-2xl">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                เปอร์เซ็นต์ไขมันโดยประมาณ
              </span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-xl font-black text-rose-600">~{activeBF}%</span>
                <span className="text-[11px] text-slate-500">
                  ({viewMode === 'projected' ? `${biometrics.projectedBF}%` : `~${biometrics.fatMassKg} kg`})
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {activeBF <= (isFemale ? 20 : 13) ? 'อยู่ในเกณฑ์ลีนนักกีฬา' : activeBF <= (isFemale ? 26 : 18) ? 'อยู่ในเกณฑ์ฟิตสุขภาพดี' : 'มีพื้นที่ให้ลีนไขมันเพิ่ม'}
              </p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200/90 rounded-2xl">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                มวลกล้ามเนื้อไร้ไขมัน (LBM)
              </span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-xl font-black text-indigo-700">
                  {viewMode === 'projected' ? `~${biometrics.projectedLeanMass}` : `~${biometrics.leanMassKg}`}
                </span>
                <span className="text-[11px] text-slate-500">kg</span>
              </div>
              <p className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                {viewMode === 'projected' ? '✨ กล้ามเนื้อเพิ่มขึ้นตามวินัย' : 'โครงสร้างกล้ามเนื้อพื้นฐาน'}
              </p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200/90 rounded-2xl">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                ดัชนีสัดส่วนสรีระ (Archetype)
              </span>
              <div className="mt-1 text-xs font-black text-slate-900 leading-snug">
                {shapeGeometry.archetype}
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">
                วิเคราะห์จากอัตราส่วน ไหล่ต่อเอว
              </p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200/90 rounded-2xl">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                ประวัติการซ้อมจริงสะสม
              </span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-xl font-black text-emerald-700">{trainingAdherence.totalDays}</span>
                <span className="text-xs text-slate-600 font-bold">วัน ({trainingAdherence.weeksActive} สัปดาห์)</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">
                วอลลุ่มรวม {(trainingAdherence.totalVolume / 1000).toFixed(1)}k kg
              </p>
            </div>
          </div>

          {/* กล่องให้ความรู้และข้อเท็จจริงทางสรีรวิทยา (Biological Realism Notice) */}
          <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl text-xs space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-900 font-extrabold text-xs">
              <span>🧬</span>
              <span>กลไกการเปลี่ยนแปลงสรีระตามความเป็นจริง (Physiological Timeline)</span>
            </div>
            <p className="text-[11px] text-emerald-800 leading-relaxed">
              การสร้างมวลกล้ามเนื้อ (Myofibrillar Hypertrophy) และการดึงไขมันใต้ชั้นผิวหนังมาเผาผลาญ <strong>ต้องใช้เวลาอย่างน้อย 4–12 สัปดาห์</strong> ขึ้นอยู่กับความสม่ำเสมอของตารางฝึกและสารอาหาร ระบบจึงไม่เปลี่ยนรูปทรงทันทีในวันเดียว แต่จะค่อยๆ ปรับตามประวัติการซ้อมจริงและน้ำหนักที่อัปเดตสม่ำเสมอ
            </p>
            <div className="flex items-center justify-between pt-1 border-t border-emerald-200/70 text-[10px] text-emerald-900 font-bold">
              <span>เป้าหมายหลัก: <strong>{goal}</strong></span>
              <span className="text-emerald-700">วินัยการฝึกสะสม: <strong>{trainingAdherence.adherenceScore}%</strong></span>
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
