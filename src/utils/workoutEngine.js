import { MASTER_EXERCISE_LIBRARY } from '../components/ExerciseModal'

// ============================================================================
// 0. PURE LOCAL DATE UTILITIES (อ้างอิงเวลาท้องถิ่นประเทศไทย 100%)
// ============================================================================
export function formatLocalISO(dateObj = new Date()) {
  const year = dateObj.getFullYear()
  const month = String(dateObj.getMonth() + 1).padStart(2, '0')
  const day = String(dateObj.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseLocalISO(isoStr) {
  if (!isoStr || typeof isoStr !== 'string') return new Date()
  const [year, month, day] = isoStr.split('-').map(Number)
  return new Date(year, month - 1, day, 12, 0, 0)
}

export function calcDaysBetweenISO(earlierIso, laterIso) {
  if (!earlierIso || !laterIso) return null
  const d1 = parseLocalISO(earlierIso)
  const d2 = parseLocalISO(laterIso)
  const diffMs = d2.getTime() - d1.getTime()
  return Math.round(diffMs / (1000 * 60 * 60 * 24))
}

// ============================================================================
// 0.1 BIOMECHANICAL LOAD MODE HELPER (แยกน้ำหนัก "ต่อข้าง" vs "น้ำหนักรวม")
// ============================================================================
export function getEquipmentLoadMeta(item) {
  if (!item) {
    return {
      isPerSide: false,
      bilateralMultiplier: 1,
      weightLabel: 'น้ำหนักที่ใช้ (Kg)',
      repsLabel: 'จำนวนครั้ง (Reps)',
      unitSuffix: 'kg'
    }
  }

  const nameLower = (item.name || '').toLowerCase()
  const type = item.type || 'Dumbbell'
  const isSingleDumbbellTwoHands =
    nameLower.includes('goblet') || nameLower.includes('overhead dumbbell')

  if (type === 'Dumbbell' && !isSingleDumbbellTwoHands) {
    return {
      isPerSide: true,
      bilateralMultiplier: 2,
      weightLabel: 'น้ำหนักต่อข้าง (Kg/ลูก)',
      repsLabel: 'จำนวนครั้ง/ข้าง (Reps)',
      unitSuffix: 'kg/ข้าง'
    }
  }

  if (type === 'Dumbbell' && isSingleDumbbellTwoHands) {
    return {
      isPerSide: false,
      bilateralMultiplier: 1,
      weightLabel: 'น้ำหนักดัมเบล (Kg / 1 ลูก)',
      repsLabel: 'จำนวนครั้ง (Reps)',
      unitSuffix: 'kg'
    }
  }

  if (type === 'Bodyweight' || type === 'Calisthenics') {
    return {
      isPerSide: false,
      bilateralMultiplier: 1,
      weightLabel: 'น้ำหนักถ่วงเสริม (Kg)',
      repsLabel: 'จำนวนครั้ง (Reps)',
      unitSuffix: 'kg'
    }
  }

  return {
    isPerSide: false,
    bilateralMultiplier: 1,
    weightLabel: 'น้ำหนักรวมที่ใช้ (Total Kg)',
    repsLabel: 'จำนวนครั้ง (Reps)',
    unitSuffix: 'kg'
  }
}

// ============================================================================
// 0.2 EXERCISE DURATION ESTIMATOR (คำนวณเวลาฝึกจริงทั้งเวทเทรนนิ่งและคาร์ดิโอ)
// ============================================================================
export function estimateExerciseDurationMins(item) {
  if (!item) return 0
  if (item.muscle === 'Cardio') {
    return Math.max(0, Math.round(parseFloat(item.duration) || 0))
  }

  const sets = Math.max(1, parseInt(item.sets) || 1)
  const reps = Math.max(1, parseInt(item.reps) || 1)
  const restSec = Math.max(15, parseInt(item.rest_sec) || 90)

  const nameLower = (item.name || '').toLowerCase()
  const isAlternatingOrUnilateral =
    nameLower.includes('alternating') ||
    nameLower.includes('one-arm') ||
    nameLower.includes('single-arm') ||
    nameLower.includes('split squat')

  const secPerRep = isAlternatingOrUnilateral ? 5.0 : 3.5
  const tutSeconds = sets * reps * secPerRep
  const totalRestSeconds = sets * restSec
  const transitionSeconds = 45

  const totalMins = (tutSeconds + totalRestSeconds + transitionSeconds) / 60
  return Math.max(2, Math.round(totalMins))
}

// ============================================================================
// 0.5 ACSM METABOLIC & CARDIO KINEMATICS ENGINE
// ============================================================================
export function analyzeCardioKinematics({ durationMins, distanceKm, inclinePercent, userWeightKg = 70, notes = '' }) {
  const mins = Math.max(0, parseFloat(durationMins) || 0)
  const dist = Math.max(0, parseFloat(distanceKm) || 0)
  const incline = Math.max(0, parseFloat(inclinePercent) || 0)
  const weight = Math.max(35, parseFloat(userWeightKg) || 70)

  if (mins <= 0 || dist <= 0) {
    return {
      speedKmh: 0,
      paceText: '--:--',
      netTreadmillKcal: 0,
      grossSmartwatchKcal: 0,
      intensityLabel: 'รอระบุระยะทางและเวลา',
      isTooFastForInclineWalk: false
    }
  }

  const hours = mins / 60
  const speedKmh = Number((dist / hours).toFixed(2))
  const speedMetersPerMin = speedKmh * (1000 / 60)
  const fractionalGrade = incline / 100

  const paceDecimal = mins / dist
  const paceMins = Math.floor(paceDecimal)
  const paceSecs = Math.round((paceDecimal - paceMins) * 60)
  const paceText = `${paceMins}:${String(paceSecs === 60 ? 0 : paceSecs).padStart(2, '0')} /km`

  const isRunningSpeed = speedKmh > 6.0
  const horizontalVo2 = isRunningSpeed ? 0.2 * speedMetersPerMin : 0.1 * speedMetersPerMin
  const verticalVo2 = isRunningSpeed
    ? 0.9 * speedMetersPerMin * fractionalGrade
    : 1.8 * speedMetersPerMin * fractionalGrade

  const netVo2 = horizontalVo2 + verticalVo2
  const grossVo2 = netVo2 + 3.5

  const rawNetKcal = ((netVo2 * weight) / 200) * mins
  const rawGrossKcal = ((grossVo2 * weight) / 200) * mins

  const isIntervalOrHighZone = notes.toLowerCase().includes('zone 3') || notes.toLowerCase().includes('interval')
  const hrMultiplier = isIntervalOrHighZone ? 1.15 : 1.08

  const netTreadmillKcal = Math.round(rawNetKcal * 1.05)
  const grossSmartwatchKcal = Math.round(rawGrossKcal * hrMultiplier)

  let intensityLabel = 'เดินปกติ (Normal Walk)'
  let isTooFastForInclineWalk = false

  if (incline >= 6) {
    if (speedKmh > 4.2) {
      intensityLabel = '⚠️ วิ่งขึ้นทางชัน / เร็วเกินเกณฑ์เดินชัน'
      isTooFastForInclineWalk = true
    } else if (speedKmh >= 3.0) {
      intensityLabel = '✅ เดินชันมาตรฐาน (Optimal Incline Walk Zone 2)'
    } else {
      intensityLabel = 'เดินชันช้าเน้นความทนทาน (Slow Steep Climb)'
    }
  } else {
    if (speedKmh >= 8.0) {
      intensityLabel = 'วิ่งทำความเร็ว (Tempo / Running)'
    } else if (speedKmh >= 6.0) {
      intensityLabel = 'วิ่งเหยาะ / จ็อกกิ้ง (Jogging)'
    } else if (speedKmh >= 4.5) {
      intensityLabel = 'เดินเร็วพื้นราบ (Brisk Walk)'
    } else {
      intensityLabel = 'เดินสลับวิ่ง / เดินคุมโซนหัวใจ (Recovery Pace)'
    }
  }

  return {
    speedKmh,
    paceText,
    netTreadmillKcal,
    grossSmartwatchKcal,
    intensityLabel,
    isTooFastForInclineWalk
  }
}

// ============================================================================
// 0.8 DETRAINING GAP & AUTO-EFFORT EVALUATOR (ประเมินความหนักอัตโนมัติแทนการกรอก RPE)
// ============================================================================
export function evaluateTrainingContinuityAndEffort({
  item,
  profile,
  allHistoricalLogs = [],
  referenceDate = formatLocalISO(new Date())
}) {
  const userWeight = parseFloat(profile?.weight_kg) || 70
  const level = profile?.fitness_level || 'Intermediate'
  const bodyType = profile?.body_type || 'Skinny Fat'

  const levelMultiplier = level === 'Beginner' ? 0.72 : level === 'Advanced' ? 1.25 : 0.98
  const bodyTypeFactor =
    bodyType === 'Muscular / Bulking' || bodyType === 'Muscular / Cutting'
      ? 1.12
      : bodyType === 'Athletic'
        ? 1.05
        : 1.0

  const priorLogs = [...allHistoricalLogs]
    .filter(l => l.date && l.date < referenceDate)
    .sort((a, b) => parseLocalISO(b.date) - parseLocalISO(a.date))

  const priorMuscleLogs = priorLogs.filter(l => (l.muscle_group || l.muscle) === item.muscle)
  const cleanItemName = (str) =>
    String(str || '')
      .replace(/\[[^\]]+\]/g, '')
      .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
      .replace(/\([^)]+\)/g, '')
      .trim()
      .toLowerCase()

  const targetCleanName = cleanItemName(item.name)
  const priorExactExerciseLogs = priorLogs.filter(l => {
    const lClean = cleanItemName(l.exercise_name)
    return lClean === targetCleanName || l.exercise_name === item.name
  })

  const lastAnyWorkoutDate = priorLogs[0]?.date || null
  const lastMuscleWorkoutDate = priorMuscleLogs[0]?.date || lastAnyWorkoutDate

  const daysGap = lastMuscleWorkoutDate ? calcDaysBetweenISO(lastMuscleWorkoutDate, referenceDate) : null

  const cumulativeMuscleSets = priorMuscleLogs.reduce((sum, l) => sum + (parseInt(l.sets) || 0), 0)
  const maturityBonus = Math.min(0.15, Math.floor(cumulativeMuscleSets / 12) * 0.02)

  let detrainingFactor = 1.0
  let continuityText = 'ประเมินตามศักยภาพเริ่มต้นของโปรไฟล์'
  let continuityBadge = 'bg-slate-100 text-slate-700 border-slate-200'

  if (daysGap !== null) {
    if (daysGap <= 4) {
      detrainingFactor = 1.025
      continuityText = `ต่อเนื่องดีเยี่ยม (ห่างรอบก่อน ${daysGap} วัน • ความพร้อม 100%)`
      continuityBadge = 'bg-emerald-50 text-emerald-800 border-emerald-200'
    } else if (daysGap <= 9) {
      detrainingFactor = 1.0
      continuityText = `พักฟื้นเต็มที่ (ห่างรอบก่อน ${daysGap} วัน • คงพละกำลัง 100%)`
      continuityBadge = 'bg-sky-50 text-sky-800 border-sky-200'
    } else if (daysGap <= 16) {
      detrainingFactor = 0.90
      continuityText = `⚠️ ห่างการฝึก ${daysGap} วัน (~2 สัปดาห์) • ปรับลดภาระ 10% ป้องกันบาดเจ็บ`
      continuityBadge = 'bg-amber-50 text-amber-800 border-amber-300'
    } else {
      detrainingFactor = 0.82
      continuityText = `⚠️ ห่างการฝึกนาน ${daysGap} วัน • ปรับลดภาระ 18% เพื่อฟื้นฟูระบบประสาทกล้ามเนื้อ`
      continuityBadge = 'bg-rose-50 text-rose-800 border-rose-300'
    }
  }

  // คำนึงถึงเพศ (Gender Factor) และสัดส่วนแรงจริงของดัมเบล
  const isFemale =
    profile?.gender === 'Female' ||
    profile?.gender === 'F' ||
    profile?.gender === 'female' ||
    profile?.gender === 'หญิง'

  const isUpper = item.muscle === 'Chest' || item.muscle === 'Back' || item.muscle === 'Shoulders' || item.muscle === 'Arms'
  const genderFactor = isFemale ? (isUpper ? 0.52 : 0.72) : 1.0

  const ratioMap = {
    Chest: { Barbell: 0.55, Dumbbell: 0.12, Machine: 0.45, Cable: 0.20 },
    Back: { Barbell: 0.60, Dumbbell: 0.13, Machine: 0.50, Cable: 0.35 },
    Legs: { Barbell: 0.75, Dumbbell: 0.14, Machine: 0.90, Cable: 0.25 },
    Shoulders: { Barbell: 0.30, Dumbbell: 0.05, Machine: 0.25, Cable: 0.08 },
    Arms: { Barbell: 0.25, Dumbbell: 0.07, Machine: 0.22, Cable: 0.18 },
    Core: { Barbell: 0.15, Dumbbell: 0.08, Machine: 0.25, Cable: 0.20 }
  }
  const groupRatios = ratioMap[item.muscle] || ratioMap.Chest
  const baseRatio = groupRatios[item.type] || 0.15

  const profileBaseWeight = userWeight * baseRatio * levelMultiplier * bodyTypeFactor * genderFactor * (1 + maturityBonus)
  const lastLoggedWeight = priorExactExerciseLogs[0]?.weight_kg ? parseFloat(priorExactExerciseLogs[0].weight_kg) : 0

  const referenceBaseWeight = lastLoggedWeight > 0 ? lastLoggedWeight : profileBaseWeight
  // หากผู้ใช้เคยยกน้ำหนักจริง (เช่น 6.8 kg) ให้ใช้น้ำหนักจริงนั้นเป็นหลักทันที
  const expectedWorkingWeight =
    lastLoggedWeight > 0
      ? Number(lastLoggedWeight.toFixed(1))
      : Math.max(2, Math.round((referenceBaseWeight * detrainingFactor) * 2) / 2)

  const currentSets = Math.max(1, parseInt(item.sets) || 3)
  const currentReps = Math.max(1, parseInt(item.reps) || 10)
  const currentWeight = Math.max(0, parseFloat(item.weight) || 0)

  let effortRatio = 0.82
  if (item.type === 'Bodyweight' || item.type === 'Calisthenics' || currentWeight === 0) {
    const baselineReps = level === 'Beginner' ? 10 : level === 'Advanced' ? 18 : 12
    const expectedReps = Math.max(6, Math.round(baselineReps * detrainingFactor))
    effortRatio = (currentReps / expectedReps) * (currentSets / 3.5) * 0.82
  } else {
    const current1RM = currentWeight * (1 + currentReps / 30)
    const expected1RM = expectedWorkingWeight * (1 + 10 / 30)
    effortRatio = expected1RM > 0 ? (current1RM / expected1RM) * 0.82 : 0.82
  }

  const intensityPercent = Math.min(99, Math.max(55, Math.round(effortRatio * 100)))
  const autoRpe = Number(Math.min(9.5, Math.max(6.0, (intensityPercent / 10))).toFixed(1))

  let effortLabel = 'พอดี • โซนสร้างกล้ามเนื้อ'
  let effortColor = 'bg-indigo-50 text-indigo-800 border-indigo-200'

  if (intensityPercent >= 90) {
    effortLabel = 'หนักมาก • ท้าทายขีดจำกัดสูงสุด / Progressive Overload'
    effortColor = 'bg-rose-50 text-rose-800 border-rose-200'
  } else if (intensityPercent >= 78) {
    effortLabel = 'เหมาะสมดีเยี่ยม • Optimal Hypertrophy & Strength'
    effortColor = 'bg-emerald-50 text-emerald-800 border-emerald-200'
  } else {
    effortLabel = 'เบา-ปานกลาง • เน้นจัดฟอร์มและฟื้นฟูกล้ามเนื้อ'
    effortColor = 'bg-amber-50 text-amber-800 border-amber-200'
  }

  return {
    daysGap,
    detrainingFactor,
    continuityText,
    continuityBadge,
    expectedWorkingWeight,
    intensityPercent,
    autoRpe,
    effortLabel,
    effortColor
  }
}

// ============================================================================
// 1. SCIENTIFIC BIOMETRICS & NUTRITION ENGINE (Mifflin-St Jeor + ACSM + RP)
// ============================================================================
export function calculateScientificBiometrics(profile) {
  const weight = parseFloat(profile?.weight_kg) || 70
  const height = parseFloat(profile?.height_cm) || 170
  const age = parseInt(profile?.age) || 29
  const gender = profile?.gender || 'male'
  const days = parseInt(profile?.training_days) || 5
  const level = profile?.fitness_level || 'Intermediate'
  const goal = profile?.goal || 'Fat Loss'
  const bodyType = profile?.body_type || 'Skinny Fat'

  const bmi = Number((weight / Math.pow(height / 100, 2)).toFixed(1))

  const baseBmr = (10 * weight) + (6.25 * height) - (5 * age)
  const bmr = Math.round(gender === 'male' ? baseBmr + 5 : baseBmr - 161)

  const activityMultipliers = {
    2: 1.35,
    3: 1.425,
    4: 1.5,
    5: 1.58,
    6: 1.68,
    7: 1.75
  }
  const tdee = Math.round(bmr * (activityMultipliers[days] || 1.55))

  let targetCalories = tdee
  let proteinPerKg = 1.8

  if (goal === 'Fat Loss') {
    targetCalories = Math.round(tdee * 0.80)
    proteinPerKg = 2.0
  } else if (goal === 'Body Recomposition' || bodyType === 'Skinny Fat') {
    targetCalories = Math.round(tdee * 0.90)
    proteinPerKg = 2.2
  } else if (goal === 'Hypertrophy') {
    targetCalories = Math.round(tdee * 1.12)
    proteinPerKg = 2.0
  } else if (goal === 'Powerlifting') {
    targetCalories = Math.round(tdee * 1.15)
    proteinPerKg = 2.0
  } else if (goal === 'Strength & Endurance') {
    targetCalories = Math.round(tdee * 1.05)
    proteinPerKg = 1.8
  }

  const targetProteinGrams = Math.round(weight * proteinPerKg)

  const maxHr = 220 - age
  const zone2Min = Math.round(maxHr * 0.65)
  const zone2Max = Math.round(maxHr * 0.75)

  const volumeScale = level === 'Beginner' ? 0.75 : level === 'Advanced' ? 1.25 : 1.0
  const rpeRecommendation = level === 'Beginner' ? 7.0 : level === 'Advanced' ? 8.5 : 8.0

  return {
    bmi,
    bmr,
    tdee,
    targetCalories,
    targetProteinGrams,
    zone2Range: `${zone2Min}-${zone2Max} bpm`,
    volumeScale,
    rpeRecommendation
  }
}

// ============================================================================
// 2. EQUIPMENT FILTER & PROGRESSIVE OVERLOAD ESTIMATOR
// ============================================================================
export function filterAndAdaptExercise(
  targetMuscle,
  subFocusKeyword,
  profile,
  allHistoricalLogs = [],
  referenceDate = formatLocalISO(new Date())
) {
  const ownedEquipment = Array.isArray(profile?.available_equipment) && profile.available_equipment.length > 0
    ? profile.available_equipment
    : ['Dumbbell', 'Machine', 'Cable', 'Barbell', 'Calisthenics', 'Bodyweight', 'Cardio']

  const weight = parseFloat(profile?.weight_kg) || 70
  const level = profile?.fitness_level || 'Intermediate'
  const sessionMins = parseInt(profile?.session_mins) || 60

  const musclePool = MASTER_EXERCISE_LIBRARY.filter(ex => {
    const matchMuscle = ex.muscle === targetMuscle
    const hasEquip = ex.muscle === 'Cardio'
      ? ownedEquipment.includes('Cardio') || ownedEquipment.includes('Machine') || ex.type === 'Bodyweight'
      : ownedEquipment.includes(ex.type)
    return matchMuscle && hasEquip
  })

  const safePool = musclePool.length > 0
    ? musclePool
    : MASTER_EXERCISE_LIBRARY.filter(ex => ex.muscle === targetMuscle && (ex.type === 'Bodyweight' || ex.type === 'Calisthenics'))

  const matchedKeywordPool = subFocusKeyword
    ? safePool.filter(ex =>
        ex.name.toLowerCase().includes(subFocusKeyword.toLowerCase()) ||
        ex.sub_muscle.toLowerCase().includes(subFocusKeyword.toLowerCase())
      )
    : safePool

  const finalPool = matchedKeywordPool.length > 0 ? matchedKeywordPool : safePool
  return finalPool.map(ex =>
    personalizeExercisePrescription(ex, weight, level, sessionMins, profile?.goal, allHistoricalLogs, profile, referenceDate)
  )
}

export function personalizeExercisePrescription(
  exercise,
  userWeight = 70,
  level = 'Intermediate',
  sessionMins = 60,
  goal = 'Fat Loss',
  allHistoricalLogs = [],
  fullProfile = null,
  referenceDate = formatLocalISO(new Date())
) {
  const baseSets = sessionMins <= 40 ? 3 : sessionMins >= 75 && level === 'Advanced' ? 4 : 3

  const pastLogsForExercise = [...allHistoricalLogs]
    .filter(l => l.exercise_name === exercise.name && (!l.date || l.date < referenceDate))
    .sort((a, b) => parseLocalISO(b.date) - parseLocalISO(a.date))

  const lastLog = pastLogsForExercise[0] || null

  if (exercise.muscle === 'Cardio') {
    const isInclineWalk = exercise.name.toLowerCase().includes('incline') || exercise.name.includes('เดินชัน')
    const baseDuration = goal === 'Fat Loss' || goal === 'Strength & Endurance' ? 25 : 20
    const duration = lastLog?.duration_mins
      ? Number(lastLog.duration_mins)
      : level === 'Beginner' ? 20 : level === 'Advanced' ? 30 : baseDuration

    let incline = 0
    let realisticSpeedKmh = 5.0

    if (isInclineWalk) {
      incline = goal === 'Strength & Endurance'
        ? (level === 'Beginner' ? 6 : level === 'Advanced' ? 10 : 8)
        : (level === 'Beginner' ? 5 : 7.5)
      realisticSpeedKmh = incline >= 8 ? 3.2 : 3.5
    } else {
      incline = 1.0
      realisticSpeedKmh = level === 'Beginner' ? 5.0 : 6.0
    }

    const distance = Number(((duration / 60) * realisticSpeedKmh).toFixed(2))

    return {
      ...exercise,
      sets: 1,
      reps: 1,
      weight: 0,
      rpe: level === 'Beginner' ? 7 : 8,
      rest_sec: 0,
      duration,
      incline,
      distance_km: distance,
      speed_kmh: realisticSpeedKmh,
      notes: `ความเร็วแนะนำ ${realisticSpeedKmh} km/h • ชัน ${incline}% (Zone 2)`
    }
  }

  const isPlankEx =
    String(exercise.name || '').toLowerCase().includes('plank') ||
    String(exercise.name || '').includes('แพลงก์')

  let targetReps = 10
  let targetRest = 90
  if (isPlankEx) {
    targetReps = level === 'Beginner' ? 30 : level === 'Intermediate' ? 45 : 60
    targetRest = 60
  } else if (goal === 'Powerlifting') {
    targetReps = 5
    targetRest = 150
  } else if (goal === 'Hypertrophy') {
    targetReps = 10
    targetRest = 90
  } else if (goal === 'Fat Loss' || goal === 'Body Recomposition') {
    targetReps = 12
    targetRest = 60
  } else if (goal === 'Strength & Endurance') {
    targetReps = 15
    targetRest = 60
  }

  const readiness = evaluateTrainingContinuityAndEffort({
    item: { ...exercise, sets: baseSets, reps: targetReps, weight: 0 },
    profile: fullProfile || { weight_kg: userWeight, fitness_level: level, goal },
    allHistoricalLogs,
    referenceDate
  })

  const suggestedWeight =
    isPlankEx || exercise.type === 'Bodyweight' || exercise.type === 'Calisthenics'
      ? 0
      : readiness.expectedWorkingWeight

  return {
    ...exercise,
    sets: lastLog?.sets ? parseInt(lastLog.sets) : baseSets,
    reps: lastLog?.reps ? parseInt(lastLog.reps) : targetReps,
    weight: suggestedWeight,
    rpe: readiness.autoRpe,
    rest_sec: targetRest,
    duration: 0,
    incline: 0,
    distance_km: 0,
    is_timed: isPlankEx,
    notes: isPlankEx ? 'เกร็งกล้ามเนื้อแกนกลางลำตัว (ร่อง 11) หายใจเข้า-ออกสม่ำเสมอ' : readiness.continuityText
  }
}

// ============================================================================
// 3. MASTER WEEKLY SPLIT ARCHETYPES (ครบทั้ง 4 รูปแบบตารางหลัก)
// ============================================================================
export const SPLIT_ARCHETYPES = {
  'Bro-Split': {
    id: 'Bro-Split',
    name: 'Classic Bodypart Split + Cardio (จันทร์อก / อังคารขา / พุธคาร์ดิโอ / พฤหัสหลัง / ศุกร์ไหล่-แขน)',
    description: 'แยกฝึกกล้ามเนื้อวันละส่วนชัดเจน โฟกัสได้เต็มที่และมีวันคาร์ดิโอคั่นกลางเพื่อฟื้นฟูระบบประสาท',
    cycleQueue: [
      { code: 'CHEST_TRI', title: 'Chest & Triceps (อก + หลังแขน)', mainMovers: ['Chest'], primaryMuscles: ['Chest', 'Arms'], includeCardio: false, badge: 'bg-rose-100 text-rose-800 border-rose-300' },
      { code: 'LEGS_CORE', title: 'Legs & Core (ต้นขา + สะโพก + น่อง + หน้าท้อง)', mainMovers: ['Legs'], primaryMuscles: ['Legs', 'Core'], includeCardio: false, badge: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
      { code: 'CARDIO_ABS', title: 'Cardio & Core Burn (ลู่วิ่งเดินชัน/วิ่ง + หน้าท้อง)', mainMovers: ['Cardio'], primaryMuscles: ['Cardio', 'Core'], includeCardio: true, badge: 'bg-sky-100 text-sky-800 border-sky-300' },
      { code: 'BACK_BI', title: 'Back & Biceps (แผ่นหลัง + ปีก + หน้าแขน)', mainMovers: ['Back'], primaryMuscles: ['Back', 'Arms'], includeCardio: false, badge: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
      { code: 'SHOULDERS_ARMS', title: 'Shoulders 3D & Arms (หัวไหล่ 3 มัด + แขน + เดินชัน)', mainMovers: ['Shoulders', 'Arms'], primaryMuscles: ['Shoulders', 'Arms'], includeCardio: true, badge: 'bg-amber-100 text-amber-800 border-amber-300' },
      { code: 'LOWER_TRAIL', title: 'Lower Body Endurance & Incline (ขา + เดินชันเตรียมเดินป่า)', mainMovers: ['Legs'], primaryMuscles: ['Legs', 'Cardio'], includeCardio: true, badge: 'bg-teal-100 text-teal-800 border-teal-300' },
      { code: 'REST', title: 'Active Recovery / Rest Day (วันพักฟื้นฟูกล้ามเนื้อ)', mainMovers: [], primaryMuscles: [], includeCardio: false, badge: 'bg-slate-100 text-slate-600 border-slate-300' }
    ]
  },
  'Hybrid-Daily': {
    id: 'Hybrid-Daily',
    name: 'Daily Weight + Cardio Hybrid (เวทเทรนนิ่ง 40 นาที + คาร์ดิโอลู่วิ่ง 20-30 นาที ทุกวันฝึก)',
    description: 'เหมาะอย่างยิ่งสำหรับโครงสร้าง Skinny Fat และผู้ที่ต้องการลดไขมันสะสมไปพร้อมกับกระชับกล้ามเนื้อทุกวัน',
    cycleQueue: [
      { code: 'UPPER_PUSH_CARDIO', title: 'Push Weight + Incline Walk (อก/ไหล่/หลังแขน + ลู่วิ่งชัน)', mainMovers: ['Chest', 'Shoulders'], primaryMuscles: ['Chest', 'Shoulders', 'Cardio'], includeCardio: true, badge: 'bg-rose-100 text-rose-800 border-rose-300' },
      { code: 'LOWER_CARDIO', title: 'Legs Weight + Incline Walk (ต้นขา/สะโพก/น่อง + ลู่วิ่งชัน)', mainMovers: ['Legs'], primaryMuscles: ['Legs', 'Cardio'], includeCardio: true, badge: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
      { code: 'UPPER_PULL_CARDIO', title: 'Pull Weight + Incline Walk (หลัง/ปีก/หน้าแขน + ลู่วิ่งชัน)', mainMovers: ['Back'], primaryMuscles: ['Back', 'Arms', 'Cardio'], includeCardio: true, badge: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
      { code: 'SHOULDERS_ARMS', title: 'Shoulders 3D & Arms + Incline (หัวไหล่ 3 มัด + แขน + ลู่วิ่ง)', mainMovers: ['Shoulders', 'Arms'], primaryMuscles: ['Shoulders', 'Arms', 'Cardio'], includeCardio: true, badge: 'bg-amber-100 text-amber-800 border-amber-300' },
      { code: 'FULL_UPPER_CARDIO', title: 'Upper Hypertrophy + Cardio (อก/หลัง/ไหล่ + ลู่วิ่ง)', mainMovers: ['Chest', 'Back'], primaryMuscles: ['Chest', 'Back', 'Shoulders', 'Cardio'], includeCardio: true, badge: 'bg-purple-100 text-purple-800 border-purple-300' },
      { code: 'LOWER_TRAIL', title: 'Trail Legs & Stamina (สควอท/ลันจ์/น่อง + เดินชัน)', mainMovers: ['Legs'], primaryMuscles: ['Legs', 'Core', 'Cardio'], includeCardio: true, badge: 'bg-teal-100 text-teal-800 border-teal-300' },
      { code: 'CARDIO_ABS', title: 'Zone 2 Cardio & Core (คาร์ดิโอล้วน 45 นาที + หน้าท้อง)', mainMovers: ['Cardio'], primaryMuscles: ['Cardio', 'Core'], includeCardio: true, badge: 'bg-sky-100 text-sky-800 border-sky-300' }
    ]
  },
  'PPL': {
    id: 'PPL',
    name: 'Push / Pull / Legs (ตารางมาตรฐานวิทยาศาสตร์การกีฬา ฝึกกล้ามเนื้อครบ 2 รอบ/สัปดาห์)',
    description: 'แบ่งตามกลไกการเคลื่อนไหว (ดัน / ดึง / ขา) ช่วยให้กระตุ้นการสังเคราะห์โปรตีนกล้ามเนื้อ (MPS) ได้สูงสุด',
    cycleQueue: [
      { code: 'PUSH', title: 'Push Day (อก + หัวไหล่หน้า/ข้าง + หลังแขน)', mainMovers: ['Chest', 'Shoulders'], primaryMuscles: ['Chest', 'Shoulders', 'Arms'], includeCardio: false, badge: 'bg-rose-100 text-rose-800 border-rose-300' },
      { code: 'PULL', title: 'Pull Day (แผ่นหลัง + ปีก + ไหล่หลัง + หน้าแขน)', mainMovers: ['Back'], primaryMuscles: ['Back', 'Shoulders', 'Arms'], includeCardio: false, badge: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
      { code: 'LEGS_CORE', title: 'Legs & Core Day (หน้าขา + แฮมสตริง + น่อง + หน้าท้อง)', mainMovers: ['Legs'], primaryMuscles: ['Legs', 'Core'], includeCardio: false, badge: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
      { code: 'CARDIO_ABS', title: 'Active Conditioning (เดินชันลู่วิ่ง Zone 2 + แกนกลางลำตัว)', mainMovers: ['Cardio'], primaryMuscles: ['Cardio', 'Core'], includeCardio: true, badge: 'bg-sky-100 text-sky-800 border-sky-300' },
      { code: 'UPPER_HYPERTROPHY', title: 'Upper Body Power (เน้นท่าหลัก อก + หลัง + ไหล่)', mainMovers: ['Chest', 'Back'], primaryMuscles: ['Chest', 'Back', 'Shoulders'], includeCardio: false, badge: 'bg-amber-100 text-amber-800 border-amber-300' },
      { code: 'LOWER_TRAIL', title: 'Lower Body & Trail Incline (ขา + ความทนทานลู่วิ่งชัน)', mainMovers: ['Legs'], primaryMuscles: ['Legs', 'Cardio'], includeCardio: true, badge: 'bg-teal-100 text-teal-800 border-teal-300' },
      { code: 'REST', title: 'Complete Rest Day (พักฟื้นระบบประสาทส่วนกลาง CNS)', mainMovers: [], primaryMuscles: [], includeCardio: false, badge: 'bg-slate-100 text-slate-600 border-slate-300' }
    ]
  },
  'Trail-Mountaineer': {
    id: 'Trail-Mountaineer',
    name: 'Trail & Mountain Expedition Split (ตารางเฉพาะทางเตรียมเดินป่า ขึ้นเขา แบกเป้หนัก)',
    description: 'เน้นความแข็งแรงของต้นขา ข้อเข่า น่อง แกนกลางลำตัวหลังสำหรับแบกเป้ และการเดินชันต่อเนื่องบนลู่วิ่ง',
    cycleQueue: [
      { code: 'LOWER_TRAIL', title: 'Mountain Legs & Knee Stability (ต้นขา + สควอทขาเดียว + น่อง)', mainMovers: ['Legs'], primaryMuscles: ['Legs', 'Core'], includeCardio: true, badge: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
      { code: 'BACK_POSTURE', title: 'Rucksack Back & Shoulders (แผ่นหลัง + บ่า + ไหล่รับน้ำหนักเป้)', mainMovers: ['Back', 'Shoulders'], primaryMuscles: ['Back', 'Shoulders', 'Core'], includeCardio: false, badge: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
      { code: 'CARDIO_ABS', title: 'Steep Incline Endurance (เดินชันลู่วิ่ง 8-12% ต่อเนื่อง 30-40 นาที)', mainMovers: ['Cardio'], primaryMuscles: ['Cardio', 'Core'], includeCardio: true, badge: 'bg-sky-100 text-sky-800 border-sky-300' },
      { code: 'UPPER_PUSH_CARDIO', title: 'Upper Push & Core Armor (อก + หลังแขน + หน้าท้อง + ลู่วิ่ง)', mainMovers: ['Chest'], primaryMuscles: ['Chest', 'Arms', 'Core'], includeCardio: true, badge: 'bg-amber-100 text-amber-800 border-amber-300' },
      { code: 'LEGS_CORE', title: 'Posterior Chain & Calves (แฮมสตริง + สะโพก + น่องเดินไกล)', mainMovers: ['Legs'], primaryMuscles: ['Legs', 'Back', 'Cardio'], includeCardio: true, badge: 'bg-teal-100 text-teal-800 border-teal-300' },
      { code: 'SHOULDERS_ARMS', title: 'Upper Stamina & Incline (ไหล่ + แขน + เดินชัน)', mainMovers: ['Shoulders', 'Arms'], primaryMuscles: ['Shoulders', 'Arms', 'Cardio'], includeCardio: true, badge: 'bg-purple-100 text-purple-800 border-purple-300' },
      { code: 'REST', title: 'Joint & Muscle Recovery (วันพักข้อต่อและกล้ามเนื้อ)', mainMovers: [], primaryMuscles: [], includeCardio: false, badge: 'bg-slate-100 text-slate-600 border-slate-300' }
    ]
  }
}

export const SESSION_MODULES_CATALOG = [
  { code: 'CHEST_TRI', title: 'Chest & Triceps (อก + หลังแขน)', mainMovers: ['Chest'], primaryMuscles: ['Chest', 'Arms'], includeCardio: false, badge: 'bg-rose-100 text-rose-800 border-rose-300' },
  { code: 'BACK_BI', title: 'Back & Biceps (แผ่นหลัง + ปีก + หน้าแขน)', mainMovers: ['Back'], primaryMuscles: ['Back', 'Arms'], includeCardio: false, badge: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
  { code: 'LEGS_CORE', title: 'Legs & Core (ต้นขา + สะโพก + น่อง + หน้าท้อง)', mainMovers: ['Legs'], primaryMuscles: ['Legs', 'Core'], includeCardio: false, badge: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  { code: 'LOWER_CARDIO', title: 'Legs Weight + Incline Walk (ต้นขา/สะโพก/น่อง + ลู่วิ่งชัน)', mainMovers: ['Legs'], primaryMuscles: ['Legs', 'Cardio'], includeCardio: true, badge: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  { code: 'SHOULDERS_ARMS', title: 'Shoulders 3D & Arms (หัวไหล่ 3 มัด + แขน)', mainMovers: ['Shoulders', 'Arms'], primaryMuscles: ['Shoulders', 'Arms'], includeCardio: true, badge: 'bg-amber-100 text-amber-800 border-amber-300' },
  { code: 'UPPER_PUSH_CARDIO', title: 'Push Weight + Incline Walk (อก/ไหล่/หลังแขน + ลู่วิ่งชัน)', mainMovers: ['Chest', 'Shoulders'], primaryMuscles: ['Chest', 'Shoulders', 'Cardio'], includeCardio: true, badge: 'bg-rose-100 text-rose-800 border-rose-300' },
  { code: 'UPPER_PULL_CARDIO', title: 'Pull Weight + Incline Walk (หลัง/ปีก/หน้าแขน + ลู่วิ่งชัน)', mainMovers: ['Back'], primaryMuscles: ['Back', 'Arms', 'Cardio'], includeCardio: true, badge: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
  { code: 'LOWER_TRAIL', title: 'Trail Legs & Incline Walk (ขาเดินป่า + ลู่วิ่งความชันสูง)', mainMovers: ['Legs'], primaryMuscles: ['Legs', 'Cardio'], includeCardio: true, badge: 'bg-teal-100 text-teal-800 border-teal-300' },
  { code: 'FULL_UPPER_CARDIO', title: 'Full Upper Body + Cardio (รวมร่างกายส่วนบน + ลู่วิ่ง)', mainMovers: ['Chest', 'Back'], primaryMuscles: ['Chest', 'Back', 'Shoulders', 'Cardio'], includeCardio: true, badge: 'bg-purple-100 text-purple-800 border-purple-300' },
  { code: 'CARDIO_ABS', title: 'Zone 2 Cardio & Core (คาร์ดิโอล้วน 45 นาที + หน้าท้อง)', mainMovers: ['Cardio'], primaryMuscles: ['Cardio', 'Core'], includeCardio: true, badge: 'bg-sky-100 text-sky-800 border-sky-300' },
  { code: 'REST', title: 'Rest / Active Recovery (วันพักฟื้นฟูร่างกาย)', mainMovers: [], primaryMuscles: [], includeCardio: false, badge: 'bg-slate-100 text-slate-600 border-slate-300' }
]

export function resolveOptimalSplitKey(profile) {
  const pref = profile?.split_preference
  if (pref && pref !== 'Auto' && SPLIT_ARCHETYPES[pref]) return pref

  const goal = profile?.goal || 'Fat Loss'
  const bodyType = profile?.body_type || 'Skinny Fat'

  if (goal === 'Strength & Endurance') return 'Trail-Mountaineer'
  if (bodyType === 'Skinny Fat' || bodyType === 'Endomorph' || goal === 'Fat Loss' || goal === 'Body Recomposition') {
    return 'Hybrid-Daily'
  }
  if (goal === 'Hypertrophy' || goal === 'Powerlifting') return 'PPL'
  return 'Bro-Split'
}

export function analyzeDayLoggedMuscles(logsForDay = []) {
  if (!logsForDay || logsForDay.length === 0) {
    return { mainMovers: [], allMuscles: [], cardioMins: 0, totalSets: 0 }
  }

  const stats = logsForDay.reduce(
    (acc, item) => {
      const m = item.muscle_group || item.muscle
      const sets = parseInt(item.sets) || 0
      const mins = parseFloat(item.duration_mins ?? item.duration) || 0

      if (m === 'Cardio') {
        return {
          ...acc,
          cardioMins: acc.cardioMins + mins,
          muscleCounts: { ...acc.muscleCounts, Cardio: (acc.muscleCounts.Cardio || 0) + 1 }
        }
      }
      return {
        ...acc,
        totalSets: acc.totalSets + sets,
        muscleCounts: { ...acc.muscleCounts, [m]: (acc.muscleCounts[m] || 0) + sets }
      }
    },
    { totalSets: 0, cardioMins: 0, muscleCounts: {} }
  )

  const allMuscles = Object.keys(stats.muscleCounts)
  const mainMovcles = allMuscles.filter(m => m !== 'Cardio' && m !== 'Core')

  return {
    mainMovers: mainMovcles.length > 0 ? mainMovcles : allMuscles,
    allMuscles,
    cardioMins: stats.cardioMins,
    totalSets: stats.totalSets,
    muscleCounts: stats.muscleCounts
  }
}

function mapActualLogsToModule(logsForDay, archetypeQueue) {
  if (!logsForDay || logsForDay.length === 0) return null
  const analysis = analyzeDayLoggedMuscles(logsForDay)
  const { allMuscles, mainMovers } = analysis

  const hasChest = allMuscles.includes('Chest')
  const hasBack = allMuscles.includes('Back')
  const hasLegs = allMuscles.includes('Legs')
  const hasShoulders = allMuscles.includes('Shoulders')
  const hasArms = allMuscles.includes('Arms')
  const hasCardio = allMuscles.includes('Cardio')

  if (hasLegs) {
    const inArch = archetypeQueue.find(q => q.mainMovers?.includes('Legs'))
    if (inArch) return { ...inArch, actualMovers: mainMovers, actualCardioMins: analysis.cardioMins }
    return {
      ...SESSION_MODULES_CATALOG.find(m => m.code === (hasCardio ? 'LOWER_CARDIO' : 'LEGS_CORE')),
      actualMovers: mainMovers,
      actualCardioMins: analysis.cardioMins
    }
  }
  if (hasChest && hasBack) {
    return {
      ...SESSION_MODULES_CATALOG.find(m => m.code === 'FULL_UPPER_CARDIO'),
      actualMovers: mainMovers,
      actualCardioMins: analysis.cardioMins
    }
  }
  if (hasChest) {
    const inArch = archetypeQueue.find(q => q.mainMovers?.includes('Chest') && !q.mainMovers?.includes('Back'))
    if (inArch) return { ...inArch, actualMovers: mainMovers, actualCardioMins: analysis.cardioMins }
    return {
      ...SESSION_MODULES_CATALOG.find(m => m.code === (hasCardio ? 'UPPER_PUSH_CARDIO' : 'CHEST_TRI')),
      actualMovers: mainMovers,
      actualCardioMins: analysis.cardioMins
    }
  }
  if (hasBack) {
    const inArch = archetypeQueue.find(q => q.mainMovers?.includes('Back') && !q.mainMovers?.includes('Chest'))
    if (inArch) return { ...inArch, actualMovers: mainMovers, actualCardioMins: analysis.cardioMins }
    return {
      ...SESSION_MODULES_CATALOG.find(m => m.code === (hasCardio ? 'UPPER_PULL_CARDIO' : 'BACK_BI')),
      actualMovers: mainMovers,
      actualCardioMins: analysis.cardioMins
    }
  }
  if (hasShoulders || hasArms) {
    return {
      ...SESSION_MODULES_CATALOG.find(m => m.code === 'SHOULDERS_ARMS'),
      actualMovers: mainMovers,
      actualCardioMins: analysis.cardioMins
    }
  }
  if (hasCardio) {
    return {
      ...SESSION_MODULES_CATALOG.find(m => m.code === 'CARDIO_ABS'),
      actualMovers: ['Cardio'],
      actualCardioMins: analysis.cardioMins
    }
  }
  return {
    ...SESSION_MODULES_CATALOG.find(m => m.code === 'CARDIO_ABS'),
    actualMovers: allMuscles,
    actualCardioMins: analysis.cardioMins
  }
}

// ============================================================================
// 4. DYNAMIC AUTO-SHIFTING WEEKLY SCHEDULER (4-Factor Sports Science Scoring)
// ============================================================================
export function generateAdaptiveWeeklySchedule({
  profile,
  selectedDate,
  todayWorkouts,
  allHistoricalLogs,
  scheduleOverrides = {}
}) {
  const todayIso = formatLocalISO(new Date())
  const splitKey = resolveOptimalSplitKey(profile)
  const archetype = SPLIT_ARCHETYPES[splitKey] || SPLIT_ARCHETYPES['Hybrid-Daily']
  const targetTrainingDays = parseInt(profile?.training_days) || 5

  const refDate = parseLocalISO(selectedDate)
  const dayOfWeek = refDate.getDay()
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const mondayDate = new Date(
    refDate.getFullYear(),
    refDate.getMonth(),
    refDate.getDate() + diffToMonday,
    12, 0, 0
  )

  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(
      mondayDate.getFullYear(),
      mondayDate.getMonth(),
      mondayDate.getDate() + i,
      12, 0, 0
    )
    const iso = formatLocalISO(d)
    return {
      iso,
      dayNameShort: d.toLocaleDateString('th-TH', { weekday: 'short' }),
      dayNameFull: d.toLocaleDateString('th-TH', { weekday: 'long' }),
      dayNum: d.getDate()
    }
  })

  const baseQueue = archetype.cycleQueue.map((mod, idx) => {
    if (targetTrainingDays <= 4 && (idx === 2 || idx === 5)) {
      return SESSION_MODULES_CATALOG.find(m => m.code === 'REST')
    }
    return mod
  })

  const weekIsoSet = new Set(weekDates.map(w => w.iso))
  const weeklyTrainedSets = allHistoricalLogs
    .filter(l => weekIsoSet.has(l.date))
    .reduce((acc, l) => {
      const m = l.muscle_group || l.muscle
      const s = parseInt(l.sets) || 0
      return { ...acc, [m]: (acc[m] || 0) + s }
    }, {})

  let remainingQueue = [...baseQueue.filter(m => m.code !== 'REST')]
  let prevDayFatiguedMovers = []
  let prevDayDidCardio = false

  const consumeFromQueue = (chosenModule) => {
    if (!chosenModule || chosenModule.code === 'REST') return
    let matchIdx = remainingQueue.findIndex(q => q.code === chosenModule.code)
    if (matchIdx === -1 && chosenModule.mainMovers?.length > 0) {
      matchIdx = remainingQueue.findIndex(q =>
        q.mainMovers?.some(m => chosenModule.mainMovers.includes(m))
      )
    }
    if (matchIdx !== -1) {
      remainingQueue = [
        ...remainingQueue.slice(0, matchIdx),
        ...remainingQueue.slice(matchIdx + 1)
      ]
    }
  }

  const resolvedWeekPlan = weekDates.map((dayObj, index) => {
    const originalPlannedMod = baseQueue[index] || baseQueue[0]
    const logsInDB = allHistoricalLogs.filter(l => l.date === dayObj.iso)
    const activeScreenLogs = dayObj.iso === selectedDate && todayWorkouts.length > 0 ? todayWorkouts : null
    const effectiveLogs = activeScreenLogs || logsInDB
    const detectedFromLogs = mapActualLogsToModule(effectiveLogs, archetype.cycleQueue)

    const manualOverrideCode = scheduleOverrides[dayObj.iso]
    const manualMod = manualOverrideCode
      ? SESSION_MODULES_CATALOG.find(m => m.code === manualOverrideCode) ||
        archetype.cycleQueue.find(m => m.code === manualOverrideCode)
      : null

    const isPastDay = dayObj.iso < todayIso
    const hasActualRecord = effectiveLogs.length > 0 || Boolean(manualMod)

    let chosenMod = null
    let statusReason = 'ตามแผนมาตรฐาน'
    let isShifted = false
    let isUnloggedPast = false

    if (manualMod) {
      chosenMod = manualMod
      statusReason = 'ปรับเปลี่ยนแผนด้วยตัวเอง (Manual Override)'
      isShifted = chosenMod.code !== originalPlannedMod.code
      consumeFromQueue(chosenMod)
      prevDayFatiguedMovers = chosenMod.mainMovers || []
      prevDayDidCardio = chosenMod.includeCardio || chosenMod.code === 'CARDIO_ABS'
    } else if (detectedFromLogs) {
      chosenMod = detectedFromLogs
      statusReason = `บันทึกข้อมูลจริงแล้ว (${(detectedFromLogs.actualMovers || []).join(', ')})`
      isShifted = chosenMod.code !== originalPlannedMod.code
      consumeFromQueue(chosenMod)
      prevDayFatiguedMovers = detectedFromLogs.actualMovers || chosenMod.mainMovers || []
      prevDayDidCardio = (detectedFromLogs.actualCardioMins || 0) >= 15 || chosenMod.code === 'CARDIO_ABS'
    } else if (isPastDay && !hasActualRecord) {
      chosenMod = originalPlannedMod
      isUnloggedPast = true
      statusReason = 'ยังไม่ได้บันทึกข้อมูล (คิวถูกเลื่อนมาวันถัดไป)'
      prevDayFatiguedMovers = []
      prevDayDidCardio = false
    } else {
      if (remainingQueue.length === 0 || (index === 6 && originalPlannedMod.code === 'REST')) {
        chosenMod = SESSION_MODULES_CATALOG.find(m => m.code === 'REST')
        prevDayFatiguedMovers = []
        prevDayDidCardio = false
      } else {
        const scoredCandidates = remainingQueue.map((candidate, qIdx) => {
          let score = 50 - (qIdx * 5)
          const movers = candidate.mainMovers || []

          const hasMuscleConflict = movers.some(m => m !== 'Cardio' && prevDayFatiguedMovers.includes(m))
          if (hasMuscleConflict) {
            score -= 120
          }

          if (candidate.code === 'CARDIO_ABS') {
            if (prevDayDidCardio || prevDayFatiguedMovers.includes('Cardio')) {
              score -= 80
            }
            const untrainedMajorExists = remainingQueue.some(
              r => r.code !== 'CARDIO_ABS' && (r.mainMovers || []).some(m => (weeklyTrainedSets[m] || 0) === 0)
            )
            if (untrainedMajorExists) {
              score -= 45
            }
          }

          movers.forEach(m => {
            if (m !== 'Cardio' && (weeklyTrainedSets[m] || 0) === 0) {
              score += 35
            }
          })

          return { candidate, qIdx, score, hasMuscleConflict }
        })

        const bestMatch = [...scoredCandidates].sort((a, b) => b.score - a.score)[0]
        chosenMod = bestMatch.candidate

        consumeFromQueue(chosenMod)

        if (chosenMod.code !== originalPlannedMod.code) {
          isShifted = true
          if (prevDayFatiguedMovers.length > 0 || prevDayDidCardio) {
            statusReason = `ปรับตามข้อมูลเมื่อวาน (พัก ${prevDayFatiguedMovers.join('/') || 'Cardio'} 48 ชม.)`
          } else {
            statusReason = 'เลื่อนคิวมัดกล้ามเนื้อที่ยังไม่ได้ฝึกขึ้นมาแทน'
          }
        } else if (prevDayFatiguedMovers.length > 0) {
          statusReason = `เหมาะสมที่สุด (ไม่ซ้ำกับ ${prevDayFatiguedMovers.join('/')} เมื่อวาน)`
        }

        prevDayFatiguedMovers = chosenMod.mainMovers || []
        prevDayDidCardio = chosenMod.includeCardio || chosenMod.code === 'CARDIO_ABS'
      }
    }

    return {
      ...dayObj,
      module: chosenMod,
      originalModule: originalPlannedMod,
      isShifted,
      isUnloggedPast,
      statusReason,
      hasSavedLogs: logsInDB.length > 0
    }
  })

  const todayObj = parseLocalISO(todayIso)
  const yesterdayDate = new Date(todayObj.getFullYear(), todayObj.getMonth(), todayObj.getDate() - 1, 12, 0, 0)
  const yesterdayIso = formatLocalISO(yesterdayDate)
  const yesterdayLogs = allHistoricalLogs.filter(l => l.date === yesterdayIso)
  const yesterdayAnalysis = analyzeDayLoggedMuscles(yesterdayLogs)
  const todayResolvedPlan = resolvedWeekPlan.find(d => d.iso === todayIso)

  return {
    splitName: archetype.name,
    splitDescription: archetype.description,
    days: resolvedWeekPlan,
    yesterdayReport: {
      yesterdayIso,
      hasLogs: yesterdayLogs.length > 0,
      trainedMuscles: yesterdayAnalysis.allMuscles,
      totalSets: yesterdayAnalysis.totalSets,
      cardioMins: yesterdayAnalysis.cardioMins,
      todayRecommendedTitle: todayResolvedPlan?.module?.title || '',
      todayOriginalTitle: todayResolvedPlan?.originalModule?.title || '',
      isTodayAdapted: Boolean(todayResolvedPlan?.isShifted),
      adaptationReason: todayResolvedPlan?.statusReason || ''
    }
  }
}

// ============================================================================
// 5. GENERATE EXERCISES FOR ANY DAY MODULE
// ============================================================================
export function generateWorkoutItemsForModule(
  moduleCode,
  profile,
  allHistoricalLogs = [],
  referenceDate = formatLocalISO(new Date())
) {
  if (!moduleCode || moduleCode === 'REST') return []

  const pick = (muscle, keyword, count = 1) => {
    const matches = filterAndAdaptExercise(muscle, keyword, profile, allHistoricalLogs, referenceDate)
    return matches.slice(0, count)
  }

  let rawList = []

  switch (moduleCode) {
    case 'CHEST_TRI':
    case 'PUSH':
      rawList = [
        ...pick('Chest', 'อกกลาง', 1),
        ...pick('Chest', 'อกบน', 1),
        ...pick('Chest', 'ร่องอก', 1),
        ...pick('Shoulders', 'ไหล่ข้าง', 1),
        ...pick('Arms', 'หลังแขน', 2)
      ]
      break

    case 'BACK_BI':
    case 'PULL':
    case 'BACK_POSTURE':
      rawList = [
        ...pick('Back', 'ปีก', 2),
        ...pick('Back', 'สะบัก', 1),
        ...pick('Shoulders', 'ไหล่หลัง', 1),
        ...pick('Arms', 'หน้าแขน', 2)
      ]
      break

    case 'LEGS_CORE':
      rawList = [
        ...pick('Legs', 'หน้าขา', 2),
        ...pick('Legs', 'ขาหลัง', 1),
        ...pick('Legs', 'น่อง', 1),
        ...pick('Core', 'ท้อง', 1)
      ]
      break

    case 'LOWER_CARDIO':
    case 'LOWER_TRAIL':
      rawList = [
        ...pick('Legs', 'สควอท', 1),
        ...pick('Legs', 'เดิน', 1),
        ...pick('Legs', 'ขาหลัง', 1),
        ...pick('Legs', 'น่อง', 1),
        ...pick('Core', 'ท้อง', 1),
        ...pick('Cardio', 'เดินชัน', 1)
      ]
      break

    case 'SHOULDERS_ARMS':
      rawList = [
        ...pick('Shoulders', 'ดัน', 1),
        ...pick('Shoulders', 'ไหล่ข้าง', 1),
        ...pick('Shoulders', 'ไหล่หลัง', 1),
        ...pick('Arms', 'หน้าแขน', 1),
        ...pick('Arms', 'หลังแขน', 1),
        ...pick('Cardio', 'เดินชัน', 1)
      ]
      break

    case 'UPPER_PUSH_CARDIO':
      rawList = [
        ...pick('Chest', 'อกกลาง', 1),
        ...pick('Chest', 'อกบน', 1),
        ...pick('Shoulders', 'ไหล่ข้าง', 1),
        ...pick('Arms', 'หลังแขน', 1),
        ...pick('Cardio', 'เดินชัน', 1)
      ]
      break

    case 'UPPER_PULL_CARDIO':
      rawList = [
        ...pick('Back', 'ปีก', 1),
        ...pick('Back', 'สะบัก', 1),
        ...pick('Shoulders', 'ไหล่หลัง', 1),
        ...pick('Arms', 'หน้าแขน', 1),
        ...pick('Cardio', 'เดินชัน', 1)
      ]
      break

    case 'FULL_UPPER_CARDIO':
    case 'UPPER_HYPERTROPHY':
      rawList = [
        ...pick('Chest', 'อก', 2),
        ...pick('Back', 'ปีก', 2),
        ...pick('Shoulders', 'ไหล่ข้าง', 1),
        ...pick('Cardio', 'เดินชัน', 1)
      ]
      break

    case 'CARDIO_ABS':
    default:
      rawList = [
        ...pick('Cardio', 'เดินชัน', 1),
        ...pick('Core', 'ท้องล่าง', 1),
        ...pick('Core', 'แพลงก์', 1)
      ]
      break
  }

  const seen = new Set()
  return rawList
    .filter(item => {
      if (!item || seen.has(item.name)) return false
      seen.add(item.name)
      return true
    })
    .map(item => ({
      ...item,
      uuid: crypto.randomUUID(),
      completed_sets: []
    }))
}

// ============================================================================
// 6. DATABASE: 30 THAI FOREST EXPEDITIONS (พร้อมข้อมูลการเดินทางและประเภทรถครบถ้วน)
// ============================================================================
const RAW_THAI_FOREST_EXPEDITIONS_30 = [
  { id: 'park-01', name: 'อุทยานแห่งชาติดอยอินทนนท์ (กิ่วแม่ปาน)', province: 'เชียงใหม่', region: 'ภาคเหนือ', difficulty: 'Intermediate', elevationM: 2565, distanceKm: 3.2, distance: 3.2, avgInclinePct: 8.5, incline: 8.5, forestType: 'ป่าดิบเขา (Lower Montane Forest) และทุ่งหญ้ากึ่งอัลไพน์', dendrology: 'กุหลาบพันปี (Rhododendron arboreum), ทะโล้, กำลังเสือโคร่ง', wikiTitles: ['Doi Inthanon National Park', 'ดอยอินทนนท์'], vehicleAccess: 'sedan', tempRange: '4°C - 18°C • อากาศหนาวเย็นตลอดปี ลมแรงบริเวณสันเขา', trailDetail: 'เดินขึ้นบันไดไม้และทางดินผ่านป่าดิบเขาชื้นเมฆปกคลุม ออกสู่ทุ่งหญ้าสันเขาเปิดโล่งริมหน้าผากิ่วแม่ปาน' },
  { id: 'park-02', name: 'อุทยานแห่งชาติภูกระดึง', province: 'เลย', region: 'ภาคอีสาน', difficulty: 'Advanced', elevationM: 1316, distanceKm: 9.0, distance: 9.0, avgInclinePct: 12.0, incline: 12.0, forestType: 'ป่าเต็งรัง ป่าเบญจพรรณ สลับป่าสนเขาและทุ่งหญ้าบนที่ราบยอดเขา', dendrology: 'สนสองใบ (Pinus merkusii), สนสามใบ, ก่วมแดง (เมเปิล)', wikiTitles: ['Phu Kradueng National Park', 'อุทยานแห่งชาติภูกระดึง'], vehicleAccess: 'boat_walk', tempRange: '10°C - 24°C • หนาวเย็นบนหลังแปและยอดภู', trailDetail: 'ไต่ระดับความชันต่อเนื่องจากปางกกค่า ผ่านซำแฮก-ซำก้อซาง-บันไดหินซำแคร่ 5.5 กม. และเดินราบบนหลังแปอีก 3.5 กม.' },
  { id: 'park-03', name: 'อุทยานแห่งชาติเขาใหญ่', province: 'นครราชสีมา', region: 'ภาคอีสาน', difficulty: 'Beginner', elevationM: 1351, distanceKm: 4.5, distance: 4.5, avgInclinePct: 5.0, incline: 5.0, forestType: 'ป่าดิบแล้งและป่าดิบชื้นระดับต่ำ', dendrology: 'ยางนา, ตะเคียนทอง, สมพง, ไทรกร่าง', wikiTitles: ['Khao Yai National Park', 'อุทยานแห่งชาติเขาใหญ่'], vehicleAccess: 'sedan', tempRange: '16°C - 27°C • เย็นสบาย มีความชื้นในป่าดิบ', trailDetail: 'เส้นทางเดินศึกษาธรรมชาติ กม.33 - หนองผักชี หรือผากล้วยไม้-เหวสุวัต ทางเดินชัดเจน ร่มรื่น เดินง่าย' },
  { id: 'park-04', name: 'เขตรักษาพันธุ์สัตว์ป่าห้วยขาแข้ง', province: 'อุทัยธานี', region: 'ภาคตะวันตก', difficulty: 'Intermediate', elevationM: 1554, distanceKm: 6.0, distance: 6.0, avgInclinePct: 6.5, incline: 6.5, forestType: 'ป่าเบญจพรรณ ป่าเต็งรัง และป่าดิบแล้งริมลำห้วย', dendrology: 'สัก, ประดู่ป่า, มะค่าโมง, ยางนา', wikiTitles: ['Huai Kha Khaeng Wildlife Sanctuary', 'เขตรักษาพันธุ์สัตว์ป่าห้วยขาแข้ง'], vehicleAccess: 'sedan', tempRange: '18°C - 31°C • อากาศโปร่งริมลำห้วยขาแข้ง', trailDetail: 'เส้นทางศึกษาธรรมชาติไซเบอร์-เขาหินแดง และลำห้วยขาแข้ง พบร่องรอยสัตว์กีบและนกยูงไทยหนาแน่น' },
  { id: 'park-05', name: 'อุทยานแห่งชาติเขาสก', province: 'สุราษฎร์ธานี', region: 'ภาคใต้', difficulty: 'Intermediate', elevationM: 950, distanceKm: 5.0, distance: 5.0, avgInclinePct: 7.0, incline: 7.0, forestType: 'ป่าดิบชื้นเขตร้อน (Tropical Rain Forest) และเขาหินปูน', dendrology: 'ยวนผึ้ง, ปาล์มบังสูรย์, บัวผุด (Rafflesia kerrii)', wikiTitles: ['Khao Sok National Park', 'อุทยานแห่งชาติเขาสก'], vehicleAccess: 'boat_walk', tempRange: '22°C - 30°C • ชื้นสูง มีฝนตกชุก', trailDetail: 'นั่งเรือหางยาวในอ่างเก็บน้ำเชี่ยวหลาน ต่อด้วยเดินเท้าขึ้นจุดชมวิวไกรสร หรือเดินป่าระยะไกลสำรวจบัวผุด' },
  { id: 'park-06', name: 'เขตรักษาพันธุ์สัตว์ป่าเชียงดาว (ดอยหลวง)', province: 'เชียงใหม่', region: 'ภาคเหนือ', difficulty: 'Advanced', elevationM: 2225, distanceKm: 8.5, distance: 8.5, avgInclinePct: 15.0, incline: 15.0, forestType: 'สังคมพืชกึ่งอัลไพน์บนเขาหินปูน (Sub-alpine Limestone Flora)', dendrology: 'ค้อเชียงดาว (Trachycarpus oreophilus), เทียนนกแก้ว, ชมพูพิมพ์พยอม', wikiTitles: ['Doi Chiang Dao', 'ดอยหลวงเชียงดาว'], vehicleAccess: '4x4', tempRange: '5°C - 19°C • หนาวจัดและลมแรงบนยอดหินปูน (ไม่มีแหล่งน้ำบนยอด)', trailDetail: 'นั่งรถ 4WD เข้าเด่นหญ้าขัด แล้วเดินเท้าไต่สันเขาหินปูนชันสูงสู่อ่างสลุงและยอดดอยหลวงเชียงดาว' },
  { id: 'park-07', name: 'อุทยานแห่งชาติภูสอยดาว', province: 'อุตรดิตถ์', region: 'ภาคเหนือ', difficulty: 'Advanced', elevationM: 2102, distanceKm: 6.5, distance: 6.5, avgInclinePct: 14.5, incline: 14.5, forestType: 'ป่าสนเขาสามใบและทุ่งดอกหงอนนาค', dendrology: 'สนสามใบ (Pinus kesiya), ดอกหงอนนาค (Murdannia gigantea)', wikiTitles: ['Phu Soi Dao National Park', 'อุทยานแห่งชาติภูสอยดาว'], vehicleAccess: 'boat_walk', tempRange: '11°C - 23°C • เย็นชื้น มีหมอกและฝนบนลานสน', trailDetail: 'เดินเท้าไต่เนินส่งญาติ-เนินปราบเซียน-เนินป่าก่อ-เนินเสือโคร่ง-เนินมรณะ ที่มีความชันสูงต่อเนื่องสู่ลานสน' },
  { id: 'park-08', name: 'อุทยานแห่งชาติเขาหลวง', province: 'นครศรีธรรมราช', region: 'ภาคใต้', difficulty: 'Advanced', elevationM: 1835, distanceKm: 12.0, distance: 12.0, avgInclinePct: 16.0, incline: 16.0, forestType: 'ป่าดิบชื้นและป่าดิบเขาภาคใต้ (Cloud Forest)', dendrology: 'มหาสดำ (เฟิร์นต้น), กุหลาบพันปีภาคใต้, มอสและกล้วยไม้อิงอาศัย', wikiTitles: ['Khao Luang National Park', 'เขาหลวง'], vehicleAccess: 'boat_walk', tempRange: '12°C - 22°C • ชื้นจัด มีเมฆหมอกและทากชุกชุม', trailDetail: 'เส้นทางเดินป่าระยะไกลไต่ระดับชันผ่านป่าเมฆชื้นตลอดสาย ต้องใช้ความอึดของขาและหลังแบกเป้ขั้นสูงสุด' },
  { id: 'park-09', name: 'อุทยานแห่งชาติแก่งกระจาน (พะเนินทุ่ง)', province: 'เพชรบุรี', region: 'ภาคตะวันตก', difficulty: 'Intermediate', elevationM: 1207, distanceKm: 5.5, distance: 5.5, avgInclinePct: 6.5, incline: 6.5, forestType: 'ป่าดิบชื้นและป่าเบญจพรรณผืนป่าตะวันตก', dendrology: 'มะค่าโมง, ยางกล่อง, ไทรป่า', wikiTitles: ['Kaeng Krachan National Park', 'อุทยานแห่งชาติแก่งกระจาน'], vehicleAccess: '4x4', tempRange: '16°C - 27°C • ทะเลหมอกหนาแน่นตลอดปี', trailDetail: 'ขึ้นเขาพะเนินทุ่งด้วยรถกระบะขับเคลื่อน 4 ล้อผ่านลำห้วย 3 ลำห้วย และเดินศึกษาธรรมชาติบ้านกร่าง-น้ำตกทอทิพย์' },
  { id: 'park-10', name: 'เขตรักษาพันธุ์สัตว์ป่าทุ่งใหญ่นเรศวร', province: 'กาญจนบุรี', region: 'ภาคตะวันตก', difficulty: 'Advanced', elevationM: 1811, distanceKm: 15.0, distance: 15.0, avgInclinePct: 10.0, incline: 10.0, forestType: 'ทุ่งหญ้าสะวันนาสลับป่าเบญจพรรณและป่าดิบแล้ง', dendrology: 'ปรงป่า, สัก, ไผ่ซางหม่น, เต็งรัง', wikiTitles: ['Thung Yai Naresuan Wildlife Sanctuary', 'ทุ่งใหญ่นเรศวร'], vehicleAccess: '4x4', tempRange: '14°C - 30°C • กลางวันแดดจัดในทุ่งหญ้า กลางคืนหนาวเย็น', trailDetail: 'เส้นทางออฟโรดระดับตำนานเข้าสู่ทุ่งเซซาโว่-มหาราช และเดินป่าระยะไกลสำรวจระบบนิเวศมรดกโลก' },
  { id: 'park-11', name: 'อุทยานแห่งชาติปางสีดา', province: 'สระแก้ว', region: 'ภาคตะวันออก', difficulty: 'Beginner', elevationM: 850, distanceKm: 3.5, distance: 3.5, avgInclinePct: 4.5, incline: 4.5, forestType: 'ป่าดิบแล้งและทุ่งหญ้าแหล่งกระทิง', dendrology: 'พะยูง (Dalbergia cochinchinensis), ชิงชัน, ยางนา', wikiTitles: ['Pang Sida National Park', 'อุทยานแห่งชาติปางสีดา'], vehicleAccess: '4x4', tempRange: '20°C - 31°C • ชุ่มชื้น มีผีเสื้อนับแสนตัวช่วงต้นฤดูฝน', trailDetail: 'ขึ้นจุดชมวิว กม.25 และเดินสำรวจโป่งผีเสื้อ-ทุ่งหญ้าบุตาปอด เส้นทางเดินไม่ชันมาก เหมาะกับมือใหม่-ปานกลาง' },
  { id: 'park-12', name: 'อุทยานแห่งชาติทองผาภูมิ (เขาช้างเผือก)', province: 'กาญจนบุรี', region: 'ภาคตะวันตก', difficulty: 'Advanced', elevationM: 1249, distanceKm: 8.0, distance: 8.0, avgInclinePct: 18.0, incline: 18.0, forestType: 'ทุ่งหญ้าสันเขาสูงและป่าดิบเขา', dendrology: 'ก่อเดือย, แขม, หญ้าคาบนสันคมมีด', wikiTitles: ['Thong Pha Phum National Park', 'เขาช้างเผือก'], vehicleAccess: '4x4', tempRange: '12°C - 26°C • ลมแรงจัดบนสันคมมีด แดดเปิดโล่ง', trailDetail: 'เริ่มเดินจากบ้านอีต่อง ไต่สันเขาชันต่อเนื่องผ่าน "สันคมมีด" ที่แคบและชันมาก ต้องใช้กำลังขาและสมาธิสูง' },
  { id: 'park-13', name: 'เขตรักษาพันธุ์สัตว์ป่าฮาลา-บาลา', province: 'นราธิวาส', region: 'ภาคใต้', difficulty: 'Intermediate', elevationM: 1464, distanceKm: 4.0, distance: 4.0, avgInclinePct: 6.0, incline: 6.0, forestType: 'ป่าดิบชื้นมาลายู (Sundaland Tropical Rain Forest)', dendrology: 'สยาเหลือง, หลุมพอ, ตะเคียนชันตาแมว, ใบไม้สีทอง', wikiTitles: ['Hala Bala Wildlife Sanctuary', 'ป่าฮาลา-บาลา'], vehicleAccess: 'sedan', tempRange: '21°C - 29°C • ชื้นสูง อุดมด้วยนกเงือก 10 ชนิด', trailDetail: 'ถนนลาดยางเลียบป่าบาลาถึงจุดชมวิว และเดินเส้นทางศึกษาธรรมชาติสำรวจเรือนยอดไม้สูงแหล่งอาศัยของนกเงือกและชะนีดำใหญ่' },
  { id: 'park-14', name: 'เขตรักษาพันธุ์สัตว์ป่าภูหลวง', province: 'เลย', region: 'ภาคอีสาน', difficulty: 'Intermediate', elevationM: 1571, distanceKm: 7.0, distance: 7.0, avgInclinePct: 7.5, incline: 7.5, forestType: 'ป่าดิบเขา ป่าสนเขา และลานหินกล้วยไม้ป่า', dendrology: 'กุหลาบขาว, กุหลาบแดง, สนสามใบ, กล้วยไม้รองเท้านารี', wikiTitles: ['Phu Luang Wildlife Sanctuary', 'เขตรักษาพันธุ์สัตว์ป่าภูหลวง'], vehicleAccess: '4x4', tempRange: '8°C - 22°C • หนาวเย็นตลอดปี ช้างป่าชุกชุม', trailDetail: 'ขึ้นสู่โคกนกกระบาด้วยรถ 4x4 แล้วเดินเท้าตามเส้นทางลานสุริยัน-ผาสมเด็จ-รอยตีนไดโนเสาร์' },
  { id: 'park-15', name: 'อุทยานแห่งชาติดอยผ้าห่มปก', province: 'เชียงใหม่', region: 'ภาคเหนือ', difficulty: 'Advanced', elevationM: 2285, distanceKm: 9.5, distance: 9.5, avgInclinePct: 11.5, incline: 11.5, forestType: 'ป่าดิบเขาสูงอันดับ 2 ของประเทศไทย', dendrology: 'นางพญาเสือโคร่ง, ทะโล้, มอสและเฟิร์นอิงอาศัย', wikiTitles: ['Doi Pha Hom Pok National Park', 'ดอยผ้าห่มปก'], vehicleAccess: '4x4', tempRange: '4°C - 18°C • หนาวจัดและลมแรงที่กิ่วลม', trailDetail: 'ต้องใช้รถ 4WD ขึ้นลานกางเต็นท์กิ่วลม แล้วเดินเท้าไต่ความชันขึ้นสู่ยอดดอยผ้าห่มปก (2,285 ม.)' },
  { id: 'park-16', name: 'อุทยานแห่งชาติน้ำหนาว', province: 'เพชรบูรณ์', region: 'ภาคเหนือ', difficulty: 'Beginner', elevationM: 1271, distanceKm: 4.0, distance: 4.0, avgInclinePct: 5.5, incline: 5.5, forestType: 'ป่าสนเขาสลับป่าดิบแล้งและป่าเต็งรัง', dendrology: 'สนสองใบ, สนสามใบ, เต็ง, รัง', wikiTitles: ['Nam Nao National Park', 'อุทยานแห่งชาติน้ำหนาว'], vehicleAccess: 'sedan', tempRange: '12°C - 26°C • อากาศเย็นสบาย ป่าโปร่งเดินง่าย', trailDetail: 'ติดทางหลวงแผ่นดินหมายเลข 12 รถเก๋งเข้าถึงที่ทำการได้สบาย มีเส้นทางเดินป่าดงสนและภูค้อที่เดินง่ายปลอดภัย' },
  { id: 'park-17', name: 'อุทยานแห่งชาติแม่วงก์ (ยอดเขาโมโกจู)', province: 'กำแพงเพชร', region: 'ภาคตะวันตก', difficulty: 'Advanced', elevationM: 1964, distanceKm: 27.0, distance: 27.0, avgInclinePct: 14.0, incline: 14.0, forestType: 'ป่าดิบเขาสลับป่าเบญจพรรณลึก', dendrology: 'มหาสดำ, ก่อ, ตะเคียนทอง', wikiTitles: ['Mae Wong National Park', 'อุทยานแห่งชาติแม่วงก์'], vehicleAccess: 'boat_walk', tempRange: '10°C - 24°C • ชื้นและหนาวจัดบนหินเรือใบ', trailDetail: 'ทริปเดินป่าระยะไกล 5 วัน 4 คืน ไป-กลับกว่า 54 กม. ข้ามลำห้วยและไต่สันเขาสูงชันสู่หินเรือใบยอดโมโกจู' },
  { id: 'park-18', name: 'อุทยานแห่งชาติเอราวัณ', province: 'กาญจนบุรี', region: 'ภาคตะวันตก', difficulty: 'Beginner', elevationM: 996, distanceKm: 2.5, distance: 2.5, avgInclinePct: 4.0, incline: 4.0, forestType: 'ป่าเบญจพรรณและป่าริมลำห้วยหินปูน', dendrology: 'ไผ่ป่า, มะค่าโมง, ตะเคียนหิน', wikiTitles: ['Erawan National Park', 'อุทยานแห่งชาติเอราวัณ'], vehicleAccess: 'sedan', tempRange: '22°C - 32°C • ร่มรื่นตลอดเส้นทางน้ำตก 7 ชั้น', trailDetail: 'ทางเดินศึกษาธรรมชาติและบันไดไม้ขึ้นน้ำตกเอราวัณ ชั้นที่ 1 ถึงชั้นที่ 7 (ภูผาเอราวัณ) เหมาะมากสำหรับเริ่มต้นซ้อมเดินชัน' },
  { id: 'park-19', name: 'อุทยานแห่งชาติภูผาเทิบ', province: 'มุกดาหาร', region: 'ภาคอีสาน', difficulty: 'Beginner', elevationM: 420, distanceKm: 3.0, distance: 3.0, avgInclinePct: 3.5, incline: 3.5, forestType: 'ป่าเต็งรังแคระบนลานหินทราย', dendrology: 'ช้างน้าว, รัง, ดุสิตา, สร้อยสุวรรณา', wikiTitles: ['Phu Pha Thoep National Park', 'อุทยานแห่งชาติภูผาเทิบ'], vehicleAccess: 'sedan', tempRange: '18°C - 32°C • ลานหินเปิดโล่ง ลมโกรก', trailDetail: 'เดินชมกลุ่มหินเทิบและทุ่งดอกไม้ป่าบนลานหินทราย ความชันต่ำ เดินง่าย เหมาะสำหรับผู้เริ่มต้นทุกวัย' },
  { id: 'park-20', name: 'อุทยานแห่งชาติดอยขุนตาล', province: 'ลำพูน', region: 'ภาคเหนือ', difficulty: 'Intermediate', elevationM: 1373, distanceKm: 5.5, distance: 5.5, avgInclinePct: 8.0, incline: 8.0, forestType: 'ป่าเต็งรัง ป่าเบญจพรรณ ไล่ระดับสู่ป่าสนเขา', dendrology: 'สนสองใบ, สนสามใบ, เต็ง, สัก', wikiTitles: ['Doi Khun Tan National Park', 'อุทยานแห่งชาติดอยขุนตาล'], vehicleAccess: 'boat_walk', tempRange: '12°C - 25°C • อากาศเย็นสบายตั้งแต่ ย.2 ถึง ย.4', trailDetail: 'ไฮไลท์คือการนั่งรถไฟไปลงสถานีขุนตาน แล้วเดินเท้าไต่ระดับจาก ย.1 ถึงยอด ย.4 ผ่านสังคมพืชที่เปลี่ยนไปตามความสูงอย่างชัดเจน' },
  { id: 'park-21', name: 'อุทยานแห่งชาติเขาสามร้อยยอด', province: 'ประจวบคีรีขันธ์', region: 'ภาคใต้', difficulty: 'Intermediate', elevationM: 605, distanceKm: 2.0, distance: 2.0, avgInclinePct: 15.0, incline: 15.0, forestType: 'ป่าเขาหินปูนชายฝั่งทะเลและพื้นที่ชุ่มน้ำ', dendrology: 'จันทน์ผา, สลัดไดป่า, โกงกาง', wikiTitles: ['Khao Sam Roi Yot National Park', 'อุทยานแห่งชาติเขาสามร้อยยอด'], vehicleAccess: 'sedan', tempRange: '24°C - 33°C • ลมทะเลพัดผ่านแต่ทางหินปูนชัน', trailDetail: 'ขับรถเก๋งถึงจุดเริ่มเดินได้ (หาดแหลมศาลา/ถ้ำพระยานคร หรือจุดชมวิวเขาแดง) ระยะทางสั้นแต่เป็นบันไดหินปูนชันมาก' },
  { id: 'park-22', name: 'เขตรักษาพันธุ์สัตว์ป่าสลักพระ', province: 'กาญจนบุรี', region: 'ภาคตะวันตก', difficulty: 'Intermediate', elevationM: 1100, distanceKm: 6.0, distance: 6.0, avgInclinePct: 7.0, incline: 7.0, forestType: 'ป่าเบญจพรรณและป่าเต็งรังเขตรักษาพันธุ์แห่งแรกของไทย', dendrology: 'ไผ่รวก, ประดู่, แดง, มะค่าโมง', wikiTitles: ['Salakpra Wildlife Sanctuary', 'สลักพระ'], vehicleAccess: '4x4', tempRange: '19°C - 32°C • ป่าโปร่ง สัตว์ป่าชุกชุม', trailDetail: 'เส้นทางศึกษาธรรมชาติและส่องสัตว์ป่าทุ่งสลักพระ ต้องใช้รถกระบะยกสูงและเดินเท้าสำรวจด่านช้างป่าและวัวแดง' },
  { id: 'park-23', name: 'อุทยานแห่งชาติกุยบุรี', province: 'ประจวบคีรีขันธ์', region: 'ภาคใต้', difficulty: 'Beginner', elevationM: 800, distanceKm: 3.0, distance: 3.0, avgInclinePct: 4.5, incline: 4.5, forestType: 'ป่าดิบแล้งและทุ่งหญ้าฟื้นฟู (Safari of Thailand)', dendrology: 'ยางนา, จันทน์หอม, ไผ่ป่า', wikiTitles: ['Kui Buri National Park', 'อุทยานแห่งชาติกุยบุรี'], vehicleAccess: '4x4', tempRange: '22°C - 31°C • ทุ่งหญ้าโปร่งสลับหุบเขา', trailDetail: 'นั่งรถกระบะ 4WD ของชมรมนำเที่ยวเข้าจุดชมช้างป่าและกระทิงที่โป่งสลัดได พร้อมเส้นทางเดินศึกษาธรรมชาติระยะสั้น' },
  { id: 'park-24', name: 'เขาแผงม้า (เขตห้ามล่าสัตว์ป่า)', province: 'นครราชสีมา', region: 'ภาคอีสาน', difficulty: 'Beginner', elevationM: 850, distanceKm: 2.5, distance: 2.5, avgInclinePct: 5.0, incline: 5.0, forestType: 'ป่าปลูกฟื้นฟูและทุ่งหญ้าแหล่งดูกระทิงฝูงใหญ่', dendrology: 'กระถินณรงค์, พะยูง, หญ้าเนเปียร์', wikiTitles: ['Khao Phaeng Ma', 'เขาแผงม้า'], vehicleAccess: 'sedan', tempRange: '16°C - 28°C • อากาศเย็นสบายตลอดปีที่วังน้ำเขียว', trailDetail: 'ถนนลาดยางขับรถเก๋งขึ้นถึงลานจอดสกัดเขาแผงม้าได้ มีเส้นทางเดินเท้าชมฝูงกระทิงระยะ 2-3 กม. ที่เดินง่ายและวิวสวยมาก' },
  { id: 'park-25', name: 'ดอยม่อนจอง (อมก๋อย)', province: 'เชียงใหม่', region: 'ภาคเหนือ', difficulty: 'Intermediate', elevationM: 1929, distanceKm: 4.5, distance: 4.5, avgInclinePct: 9.0, incline: 9.0, forestType: 'ทุ่งหญ้าภูเขาสูงและป่าดิบเขา', dendrology: 'กุหลาบพันปี (ต้นใหญ่ที่สุดในไทย), สนสามใบ', wikiTitles: ['Omkoi Wildlife Sanctuary', 'ดอยม่อนจอง'], vehicleAccess: '4x4', tempRange: '6°C - 20°C • ลมแรงบนสันเขาทุ่งหญ้าสีทอง', trailDetail: 'ต้องต่อรถโฟร์วีลท้องถิ่นจากบ้านมูเซอไปจุดเริ่มเดิน แล้วเดินเท้าผ่านเนินหมาหอบขึ้นสู่ลานกางเต็นท์และผาหัวสิงห์' },
  { id: 'park-26', name: 'อุทยานแห่งชาติรามคำแหง (เขาหลวงสุโขทัย)', province: 'สุโขทัย', region: 'ภาคเหนือ', difficulty: 'Advanced', elevationM: 1200, distanceKm: 3.7, distance: 3.7, avgInclinePct: 20.0, incline: 20.0, forestType: 'ป่าดิบแล้ง ป่าดิบเขา และทุ่งหญ้าบนยอดเขา', dendrology: 'สมพง (พูพอนยักษ์), ตะเคียนทอง, ปรงป่า', wikiTitles: ['Ramkhamhaeng National Park', 'เขาหลวงสุโขทัย'], vehicleAccess: 'boat_walk', tempRange: '12°C - 25°C • ยอดเขาลมแรงและหนาวเย็น', trailDetail: 'ระยะทางเพียง 3.7 กม. แต่ชันดิ่งถึง 20% แทบไม่มีทางราบเลย (ด่านปลดทุกข์-มออีหืด) ทดสอบกำลังหน้าขาและน่องขั้นสุด!' },
  { id: 'park-27', name: 'อุทยานแห่งชาติภูเรือ', province: 'เลย', region: 'ภาคอีสาน', difficulty: 'Beginner', elevationM: 1365, distanceKm: 2.0, distance: 2.0, avgInclinePct: 6.0, incline: 6.0, forestType: 'ป่าสนเขาและสวนหินธรรมชาติบนชะง่อนผา', dendrology: 'สนสองใบ, สนสามใบ, กุหลาบป่า', wikiTitles: ['Phu Ruea National Park', 'อุทยานแห่งชาติภูเรือ'], vehicleAccess: 'sedan', tempRange: '8°C - 22°C • หนาวเย็นจัดในฤดูหนาว', trailDetail: 'ถนนลาดยางอย่างดี รถเก๋งขับถึงลานจอดที่ทำการและจุดชมวิวได้ มีเส้นทางเดินศึกษาธรรมชาติผาโหล่นน้อย-ยอดภูเรือระยะสั้น' },
  { id: 'park-28', name: 'อุทยานแห่งชาติทับลาน', province: 'ปราจีนบุรี', region: 'ภาคตะวันออก', difficulty: 'Beginner', elevationM: 800, distanceKm: 4.0, distance: 4.0, avgInclinePct: 5.5, incline: 5.5, forestType: 'ป่าลานผืนสุดท้ายของไทยและป่าดิบแล้ง', dendrology: 'ต้นลาน (Corypha lecomtei), ยางนา, กระบาก', wikiTitles: ['Thap Lan National Park', 'อุทยานแห่งชาติทับลาน'], vehicleAccess: 'sedan', tempRange: '19°C - 30°C • ร่มรื่นด้วยดงปาล์มลานโบราณ', trailDetail: 'รถเก๋งขับเข้าถึงที่ทำการทับลานและผาเก็บตะวันได้สบาย มีเส้นทางเดินป่าศึกษาดงลานและน้ำตกทับลานที่เดินง่าย' },
  { id: 'park-29', name: 'อุทยานแห่งชาติภูหินร่องกล้า', province: 'พิษณุโลก', region: 'ภาคเหนือ', difficulty: 'Intermediate', elevationM: 1614, distanceKm: 5.0, distance: 5.0, avgInclinePct: 7.0, incline: 7.0, forestType: 'ป่าดิบเขา ป่าสน และลานหินแตกทางธรณีวิทยา', dendrology: 'ก่วมแดง (เมเปิล), สนสามใบ, กุหลาบขาว', wikiTitles: ['Phu Hin Rong Kla National Park', 'อุทยานแห่งชาติภูหินร่องกล้า'], vehicleAccess: 'sedan', tempRange: '10°C - 22°C • เย็นสบายตลอดปี มีหมอกปกคลุม', trailDetail: 'ถนนลาดยางตลอดสาย รถเก๋งขับถึงได้ เส้นทางเดินลานหินปุ่ม-ผาชูธง และโรงเรียนการเมืองการทหารมีโขดหินสลับทางเดินป่า' },
  { id: 'park-30', name: 'อุทยานแห่งชาติภูลังกา', province: 'นครพนม/บึงกาฬ', region: 'ภาคอีสาน', difficulty: 'Intermediate', elevationM: 563, distanceKm: 4.5, distance: 4.5, avgInclinePct: 12.0, incline: 12.0, forestType: 'ป่าดิบแล้งและลานหินทรายหมวดหินภูพาน', dendrology: 'ตะเคียนทอง, ปรงหิน, กล้วยไม้ดิน', wikiTitles: ['Phu Langka National Park', 'ภูลังกา'], vehicleAccess: 'boat_walk', tempRange: '16°C - 29°C • ชื้นตามซอกผาหินทราย', trailDetail: 'ต้องเดินเท้าไต่บันไดเหล็กและทางหินทรายชันขึ้นสู่เจดีย์กองข้าวศรีบุญเนาว์และถ้ำนาคา ต้องใช้กำลังขาและเข่าสูง' }
]

export const THAI_FOREST_EXPEDITIONS_30 = RAW_THAI_FOREST_EXPEDITIONS_30.map((p) => {
  const isSedan = p.vehicleAccess === 'sedan'
  const is4x4 = p.vehicleAccess === '4x4'

  // คำนวณเกณฑ์เป้าหมายการฝึกเฉพาะตัวของแต่ละอุทยานจากความยาก ระยะทาง และความชันจริง
  const diffMult = p.difficulty === 'Advanced' ? 1.45 : p.difficulty === 'Intermediate' ? 1.05 : 0.65
  const reqLegs = Math.max(4, Math.round((p.distanceKm * 0.85 + p.avgInclinePct * 0.75) * diffMult))
  const reqCardioMins = Math.max(20, Math.round((p.distanceKm * 5.5 + p.avgInclinePct * 3.8 + (p.elevationM / 250)) * diffMult))
  const reqBack = Math.max(3, Math.round((p.distanceKm * 0.65 + (p.elevationM / 350)) * diffMult))
  const reqCore = Math.max(3, Math.round((p.avgInclinePct * 0.55 + p.distanceKm * 0.35) * diffMult))

  const vehicleNote = isSedan
    ? 'ขับรถยนต์ทั่วไป / รถเก๋ง / Eco Car เข้าถึงลานจอดจุดเริ่มเดินได้สะดวก (ถนนลาดยางมาตรฐาน)'
    : is4x4
      ? 'ต้องใช้รถกระบะยกสูง / รถขับเคลื่อน 4 ล้อ (4WD) หรือจอดรถไว้ด้านล่างแล้วเหมารถ 4WD ท้องถิ่นขึ้นไป'
      : 'จอดรถที่จุดบริการนักท่องเที่ยว แล้วต้องต่อเรือ / นั่งรถไฟ / หรือเดินเท้าไต่ระดับขึ้นจุดกางเต็นท์โดยตรง'

  return {
    ...p,
    ecoCarFriendly: isSedan,
    ecoCarNote: vehicleNote,
    vehicleNote,
    reqSets: {
      Legs: reqLegs,
      CardioMins: reqCardioMins,
      Back: reqBack,
      Core: reqCore
    }
  }
})

// ============================================================================
// 7. TRAIL EXPEDITION READINESS & MUSCLE GAP EVALUATOR (ประเมินความพร้อมเดินป่า)
// รองรับทั้ง:
//   (A) evaluateTrailExpeditionReadiness({ profile, allHistoricalLogs }) -> คืนค่าทั้ง 30 อุทยาน + userMetrics
//   (B) evaluateTrailExpeditionReadiness(park, profile, allHistoricalLogs) -> คืนค่าเฉพาะอุทยานนั้น
// ============================================================================
function computeUser14DayMetrics(profile, allHistoricalLogs = []) {
  const now = new Date()
  const fourteenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 14, 12, 0, 0)
  const cutoffIso = formatLocalISO(fourteenDaysAgo)

  const recentLogs = (Array.isArray(allHistoricalLogs) ? allHistoricalLogs : []).filter(
    l => l && (!l.date || l.date >= cutoffIso)
  )

  const distinctDays14d = new Set(
    recentLogs.map(l => l.date).filter(Boolean)
  ).size

  const rawStats = recentLogs.reduce(
    (acc, l) => {
      const m = l.muscle_group || l.muscle
      const s = parseInt(l.sets) || 0
      const r = parseInt(l.reps) || 0
      const w = parseFloat(l.weight_kg ?? l.weight) || 0
      const mins = parseFloat(l.duration_mins ?? l.duration) || 0
      const dist = parseFloat(l.distance_km) || 0
      const inc = parseFloat(l.incline) || 0

      if (m === 'Cardio') {
        return {
          ...acc,
          cardioMins14d: acc.cardioMins14d + mins,
          cardioDistance14d: Number((acc.cardioDistance14d + dist).toFixed(2)),
          maxIncline14d: Math.max(acc.maxIncline14d, inc)
        }
      }

      const loadMeta = getEquipmentLoadMeta({ name: l.exercise_name || l.name, type: l.equipment_type || l.type })
      const vol = s * r * (w * loadMeta.bilateralMultiplier)

      return {
        ...acc,
        setsByMuscle: { ...acc.setsByMuscle, [m]: (acc.setsByMuscle[m] || 0) + s },
        legSets14d: m === 'Legs' ? acc.legSets14d + s : acc.legSets14d,
        legVolume14d: m === 'Legs' ? acc.legVolume14d + vol : acc.legVolume14d,
        coreBackSets14d:
          m === 'Back' || m === 'Core' || m === 'Shoulders'
            ? acc.coreBackSets14d + s
            : acc.coreBackSets14d
      }
    },
    {
      cardioMins14d: 0,
      cardioDistance14d: 0,
      maxIncline14d: 0,
      legSets14d: 0,
      legVolume14d: 0,
      coreBackSets14d: 0,
      setsByMuscle: {}
    }
  )

  // ฐานความฟิตตามระดับ (ปรับให้สมจริง ไม่เกิน 1-3 เซ็ต ไม่ทำให้คะแนนพุ่งก่อนฝึกจริง)
  const level = profile?.fitness_level || 'Intermediate'

  const baseLegSets = level === 'Advanced' ? 3 : level === 'Intermediate' ? 2 : 1
  const baseBackSets = level === 'Advanced' ? 2 : level === 'Intermediate' ? 1.5 : 1
  const baseCoreSets = level === 'Advanced' ? 2 : level === 'Intermediate' ? 1 : 0.5
  const baseCardioMins = level === 'Advanced' ? 20 : level === 'Intermediate' ? 12 : 5
  const baseIncline = level === 'Advanced' ? 4.5 : level === 'Intermediate' ? 2.5 : 1.0

  // ข้อมูลที่ทำได้จริงเฉลี่ยต่อสัปดาห์ (14 วัน หาร 2) + ฐานความฟิตเล็กน้อย
  const weeklyEffectiveLegSets = Math.round((rawStats.legSets14d / 2) + baseLegSets)
  const weeklyEffectiveBackSets = Math.round(
    (((rawStats.setsByMuscle.Back || 0) + (rawStats.setsByMuscle.Shoulders || 0) * 0.5) / 2) + baseBackSets
  )
  const weeklyEffectiveCoreSets = Math.round(((rawStats.setsByMuscle.Core || 0) / 2) + baseCoreSets)
  const weeklyEffectiveCardioMins = Math.round((rawStats.cardioMins14d / 2) + baseCardioMins)
  const effectiveMaxIncline = Math.max(rawStats.maxIncline14d, baseIncline)

  return {
    ...rawStats,
    distinctDays14d,
    weeklyEffectiveLegSets,
    weeklyEffectiveBackSets,
    weeklyEffectiveCoreSets,
    weeklyEffectiveCardioMins,
    effectiveMaxIncline
  }
}

function evaluateSingleParkWithMetrics(park, userMetrics) {
  const req = park.reqSets || {
    Legs: Math.max(6, Math.round(park.distanceKm * 1.1 + park.avgInclinePct * 0.9)),
    CardioMins: Math.max(30, Math.round(park.distanceKm * 7 + park.avgInclinePct * 5)),
    Back: Math.max(4, Math.round(park.distanceKm * 0.8)),
    Core: Math.max(3, Math.round(park.avgInclinePct * 0.7))
  }

  const legPct = Math.min(100, Math.round((userMetrics.weeklyEffectiveLegSets / req.Legs) * 100))

  // คะแนนความอึดปอด คิดจากเวลาคาร์ดิโอและความชันที่เคยซ้อมเทียบกับความชันจริงของภูเขา
  const durationRatio = userMetrics.weeklyEffectiveCardioMins / req.CardioMins
  const inclineRatio = Math.min(1.15, userMetrics.effectiveMaxIncline / Math.max(3, park.avgInclinePct))
  const cardioPct = Math.min(100, Math.round((durationRatio * 0.7 + inclineRatio * 0.3) * 100))

  const backPct = Math.min(100, Math.round((userMetrics.weeklyEffectiveBackSets / req.Back) * 100))
  const corePct = Math.min(100, Math.round((userMetrics.weeklyEffectiveCoreSets / req.Core) * 100))

  const packCoreScore = Math.min(100, Math.round(backPct * 0.55 + corePct * 0.45))

  // คะแนนพื้นฐานตามปริมาณงานที่ทำจริง
  const rawVolumeScore = legPct * 0.40 + cardioPct * 0.35 + packCoreScore * 0.25

  // ตัวคูณความสม่ำเสมอตามจำนวนวันที่ฝึกจริงใน 14 วันล่าสุด (Distinct Days)
  // 0 วัน = 0.35, 1-2 วัน = 0.52, 3-4 วัน = 0.72, 5-6 วัน = 0.88, 7+ วัน = 1.0
  const days = userMetrics.distinctDays14d || 0
  const consistencyFactor =
    days >= 7 ? 1.0 :
    days >= 5 ? 0.88 :
    days >= 3 ? 0.72 :
    days >= 1 ? 0.52 : 0.35

  // ตัวคูณความยากของเส้นทาง (Advanced เส้นทางชันยาว ต้องมีวันที่ฝึกสม่ำเสมอเพื่อความปลอดภัย)
  const difficultyRequirement =
    park.difficulty === 'Advanced' ? 0.80 :
    park.difficulty === 'Intermediate' ? 0.90 : 1.0

  const effectiveConsistency = Math.min(1.0, consistencyFactor / difficultyRequirement)

  // ความพร้อมรวม (%)
  const overallReadyPct = Math.min(
    100,
    Math.max(8, Math.round(rawVolumeScore * effectiveConsistency))
  )
  const remainingGapPct = Math.max(0, 100 - overallReadyPct)

  const breakdownBars = [
    {
      key: 'Legs',
      label: '🦵 กำลังต้นขา เข่า และน่องไต่ทางชัน (Leg & Knee Climb)',
      current: userMetrics.weeklyEffectiveLegSets,
      target: req.Legs,
      unit: 'เซ็ต/สัปดาห์',
      pct: legPct,
      missing: Math.max(0, req.Legs - userMetrics.weeklyEffectiveLegSets),
      advice: 'เพิ่มท่า Squat, Bulgarian Split Squat และเขย่งน่องเพื่อกันเข่าทรุดตอนลงเขา'
    },
    {
      key: 'Cardio',
      label: '🫁 ความอึดปอดและหัวใจบนความชัน (Incline Stamina)',
      current: userMetrics.weeklyEffectiveCardioMins,
      target: req.CardioMins,
      unit: 'นาที/สัปดาห์',
      pct: cardioPct,
      missing: Math.max(0, req.CardioMins - userMetrics.weeklyEffectiveCardioMins),
      advice: `ซ้อมเดินชันลู่วิ่งที่ Incline ~${park.avgInclinePct}% คุมหัวใจ Zone 2 ต่อเนื่อง`
    },
    {
      key: 'Back',
      label: '🎒 แผ่นหลังและบ่ารับน้ำหนักเป้ (Rucksack Back Armor)',
      current: userMetrics.weeklyEffectiveBackSets,
      target: req.Back,
      unit: 'เซ็ต/สัปดาห์',
      pct: backPct,
      missing: Math.max(0, req.Back - userMetrics.weeklyEffectiveBackSets),
      advice: 'เสริมท่าดึงหลัง (Row / Pulldown) และยักไหล่ (Shrugs) รับสายสะพายเป้'
    },
    {
      key: 'Core',
      label: '⚖️ แกนกลางลำตัวทรงตัวบนหิน/รากไม้ (Core Stability)',
      current: userMetrics.weeklyEffectiveCoreSets,
      target: req.Core,
      unit: 'เซ็ต/สัปดาห์',
      pct: corePct,
      missing: Math.max(0, req.Core - userMetrics.weeklyEffectiveCoreSets),
      advice: 'ฝึก Plank และ Hanging Knee Raise เพื่อพยุงกระดูกสันหลังเวลาเดินไกล'
    }
  ]

  const weakMuscles = breakdownBars.filter(b => b.pct < 80)

  const lowestBar = [...breakdownBars].sort((a, b) => a.pct - b.pct)[0]
  const prescriptionTip =
    overallReadyPct >= 80
      ? `ร่างกายคุณพร้อมพิชิต ${park.name} แล้ว! รักษาความสม่ำเสมอและยืดเหยียดกล้ามเนื้อน่องก่อนเดินทาง`
      : `ขาดอีก ${remainingGapPct}% จะพร้อมเต็มร้อย • จุดที่ต้องเร่งเสริมคือ "${lowestBar.label.split('(')[0].trim()}" (${lowestBar.advice})`

  return {
    ...park,
    overallReadyPct,
    overallScore: overallReadyPct,
    staminaScore: cardioPct,
    legClimbScore: legPct,
    packCoreScore,
    remainingGapPct,
    isReady: overallReadyPct >= 80,
    breakdownBars,
    weakMuscles,
    prescriptionTip
  }
}

export function evaluateTrailExpeditionReadiness(arg1, arg2, arg3 = []) {
  // กรณีที่ 1: เรียกแบบส่ง Object ก้อนเดียว { profile, allHistoricalLogs } (จาก TrailReadinessModal)
  if (arg1 && typeof arg1 === 'object' && !arg1.id && !arg1.elevationM && ('profile' in arg1 || 'allHistoricalLogs' in arg1)) {
    const profile = arg1.profile || {}
    const logs = Array.isArray(arg1.allHistoricalLogs) ? arg1.allHistoricalLogs : []
    const userMetrics = computeUser14DayMetrics(profile, logs)
    const parkEvaluations = THAI_FOREST_EXPEDITIONS_30.map(park =>
      evaluateSingleParkWithMetrics(park, userMetrics)
    )
    return {
      parkEvaluations,
      userMetrics
    }
  }

  // กรณีที่ 2: เรียกแบบส่ง (park, profile, allHistoricalLogs) (จาก TrainerPanel)
  if (!arg1) return null
  const userMetrics = computeUser14DayMetrics(arg2 || {}, Array.isArray(arg3) ? arg3 : [])
  return evaluateSingleParkWithMetrics(arg1, userMetrics)
}

// ฟังก์ชันสร้างตารางฝึกจำลองความชันและมัดกล้ามเนื้อสำหรับอุทยานที่เลือกโดยตรง
export function buildTrailWorkoutForPark(park, profile, allHistoricalLogs = [], referenceDate = formatLocalISO(new Date())) {
  if (!park) return []
  const recipe = [
    { muscle: 'Legs', keyword: 'สควอท', sets: park.difficulty === 'Advanced' ? 4 : 3, reps: 12 },
    { muscle: 'Legs', keyword: 'ขาเดียว', sets: 3, reps: 12 },
    { muscle: 'Back', keyword: 'ปีก', sets: 3, reps: 12 },
    { muscle: 'Legs', keyword: 'น่อง', sets: 4, reps: 20 },
    { muscle: 'Core', keyword: 'แพลงก์', sets: 3, reps: 15 }
  ]

  const seen = new Set()
  const strengthItems = []

  for (const step of recipe) {
    const candidates = filterAndAdaptExercise(step.muscle, step.keyword, profile, allHistoricalLogs, referenceDate)
    const picked = candidates.find(c => !seen.has(c.name)) || candidates[0]
    if (picked && !seen.has(picked.name)) {
      seen.add(picked.name)
      strengthItems.push({
        ...picked,
        sets: step.sets,
        reps: step.reps,
        uuid: crypto.randomUUID(),
        completed_sets: []
      })
    }
  }

  const cardioBase =
    MASTER_EXERCISE_LIBRARY.find(e => e.name.includes('Incline Walk')) ||
    MASTER_EXERCISE_LIBRARY.find(e => e.muscle === 'Cardio')

  const dur = park.difficulty === 'Advanced' ? 40 : park.difficulty === 'Intermediate' ? 30 : 25
  const inc = park.avgInclinePct || 8.0
  const spd = inc >= 10 ? 3.1 : 3.5
  const dist = Number(((dur / 60) * spd).toFixed(2))

  const cardioItem = {
    ...cardioBase,
    uuid: crypto.randomUUID(),
    sets: 1,
    reps: 1,
    weight: 0,
    duration: dur,
    incline: inc,
    speed_kmh: spd,
    distance_km: dist,
    completed_sets: [],
    notes: `จำลองเดินป่า: ${park.name} (ความชัน ${inc}% • ระยะซ้อม ${dist} กม.)`
  }

  return [...strengthItems, cardioItem]
}