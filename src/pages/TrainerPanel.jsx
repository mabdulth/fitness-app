import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import ExerciseModal, { MASTER_EXERCISE_LIBRARY } from '../components/ExerciseModal'
import ExerciseIllustration from '../components/ExerciseIllustration'
import ProgramGeneratorModal, { getTeamBadgeClasses } from '../components/ProgramGeneratorModal'
import MealPlannerWidget from '../components/MealPlannerWidget'
import {
  formatLocalISO,
  calcDaysBetweenISO,
  getEquipmentLoadMeta,
  estimateExerciseDurationMins,
  analyzeCardioKinematics,
  evaluateTrainingContinuityAndEffort,
  calculateScientificBiometrics,
  THAI_FOREST_EXPEDITIONS_30,
  evaluateTrailExpeditionReadiness,
  personalizeExercisePrescription
} from '../utils/workoutEngine'
import { calculateDailyMacrosAndHydration } from '../components/LiveGymToolbar'

const MUSCLE_TARGETS = [
  { group: 'Chest', label: 'Chest (อก)', optimalSets: 12 },
  { group: 'Back', label: 'Back (หลังและปีก)', optimalSets: 14 },
  { group: 'Legs', label: 'Legs (ต้นขา/สะโพก/น่อง)', optimalSets: 16 },
  { group: 'Shoulders', label: 'Shoulders (หัวไหล่ 3 มัด)', optimalSets: 10 },
  { group: 'Arms', label: 'Arms (หน้าแขน/หลังแขน)', optimalSets: 10 },
  { group: 'Core', label: 'Core (แกนกลางลำตัว)', optimalSets: 8 }
]

const TEAM_COLOR_OPTIONS = [
  { id: 'emerald', label: 'เขียวมรกต (Emerald)' },
  { id: 'pink', label: 'ชมพูบานเย็น (Hot Pink)' },
  { id: 'amber', label: 'ทองอำพัน (Amber Gold)' },
  { id: 'purple', label: 'ม่วงนีออน (Neon Purple)' },
  { id: 'rose', label: 'แดงเพลิง (Crimson Rose)' },
  { id: 'sky', label: 'ฟ้าสกายบลู (Sky Blue)' },
  { id: 'indigo', label: 'น้ำเงินอินดิโก้ (Royal Indigo)' }
]

const TEAM_ICON_PRESETS = ['🌲⚡', '🦩✨', '🥊🔥', '🧽🫧', '🏔️🧭', '👑💎', '🕷️🕸️', '☕🌞']

export default function TrainerPanel() {
  const todayStr = formatLocalISO(new Date())

  const [currentUser, setCurrentUser] = useState(null)
  const [myProfile, setMyProfile] = useState(null)
  const [myRole, setMyRole] = useState('user')
  const [isCheckingAccess, setIsCheckingAccess] = useState(true)

  const [trainees, setTrainees] = useState([])
  const [selectedTrainee, setSelectedTrainee] = useState(null)
  // 4 แท็บย่อย: 'telemetry' | 'assign' | 'meals' | 'studio'
  const [traineeSubTab, setTraineeSubTab] = useState('telemetry')
  const [teamFilter, setTeamFilter] = useState('All')

  // State สำหรับแก้ไขชื่อยูเซอร์และสังกัดทีมของลูกเทรน
  const [editClientName, setEditClientName] = useState('')
  const [editClientTeam, setEditClientTeam] = useState('')
  const [editClientColor, setEditClientColor] = useState('emerald')
  const [editClientIcon, setEditClientIcon] = useState('🌲⚡')
  const [isUpdatingIdentity, setIsUpdatingIdentity] = useState(false)

  // ข้อมูลประวัติและสถิติเชิงลึกของลูกเทรนที่เลือก
  const [traineeAllLogs, setTraineeAllLogs] = useState([])
  const [traineeWeeklyLogs, setTraineeWeeklyLogs] = useState([])

  // ข้อมูลการจัดตารางให้ลูกเทรน
  const [assignDate, setAssignDate] = useState(todayStr)
  const [assignedExercises, setAssignedExercises] = useState([])
  const [activeWorkoutId, setActiveWorkoutId] = useState(null)

  // State สำหรับสตูดิโอสร้างโปรแกรมออกกำลังกายของเทรนเนอร์/มาสเตอร์
  const [customPrograms, setCustomPrograms] = useState([])
  const [newProgTitle, setNewProgTitle] = useState('')
  const [newProgDesc, setNewProgDesc] = useState('')
  const [newProgTag, setNewProgTag] = useState('Trainer Special')
  const [builderExercises, setBuilderExercises] = useState([
    { name: MASTER_EXERCISE_LIBRARY[0].name, sets: 4, reps: 12 },
    { name: MASTER_EXERCISE_LIBRARY[15].name, sets: 4, reps: 12 },
    { name: MASTER_EXERCISE_LIBRARY[29].name, sets: 4, reps: 12 }
  ])
  const [isSavingCustomProg, setIsSavingCustomProg] = useState(false)

  const [isExerciseModalOpen, setIsExerciseModalOpen] = useState(false)
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const navigate = useNavigate()

  useEffect(() => {
    const initTrainerConsole = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        navigate('/')
        return
      }
      setCurrentUser(session.user)
      await Promise.all([
        verifyAccessAndFetchProfiles(session.user.id),
        fetchCustomProgramsList()
      ])
    }
    initTrainerConsole()
  }, [navigate])

  const syncTraineeIdentityInputs = (clientObj) => {
    if (!clientObj) return
    const fallbackName = clientObj.email ? clientObj.email.split('@')[0] : 'สมาชิก'
    setEditClientName(clientObj.display_name || fallbackName)
    setEditClientTeam(clientObj.team_name || 'ทีมขนุน')
    setEditClientColor(clientObj.team_color || 'emerald')
    setEditClientIcon(clientObj.team_icon || '🌲⚡')
  }

  const verifyAccessAndFetchProfiles = async (currentUserId) => {
    setIsCheckingAccess(true)
    const { data } = await supabase.from('profiles').select('*')

    if (data && data.length > 0) {
      const me = data.find(p => p.id === currentUserId)
      const detectedRole = me?.role || 'user'

      if (detectedRole !== 'master' && detectedRole !== 'trainer') {
        alert('ปฏิเสธการเข้าถึง: หน้านี้สงวนสิทธิ์เฉพาะผู้ดูแลระบบ (Master) และเทรนเนอร์ (Trainer) เท่านั้น')
        navigate('/dashboard')
        return
      }

      setMyProfile(me)
      setMyRole(detectedRole)
      setTrainees(data)

      const firstClient = data[0]
      setSelectedTrainee(firstClient)
      syncTraineeIdentityInputs(firstClient)

      await Promise.all([
        fetchTraineeFullTelemetry(firstClient.id),
        loadTraineeWorkoutForDate(firstClient.id, assignDate)
      ])
    }
    setIsCheckingAccess(false)
  }

  const fetchCustomProgramsList = async () => {
    try {
      const { data } = await supabase
        .from('custom_programs')
        .select('*')
        .order('created_at', { ascending: false })
      if (Array.isArray(data)) {
        setCustomPrograms(data)
      }
    } catch {
      // Fallback กรณีตารางยังว่าง
    }
  }

  const fetchTraineeFullTelemetry = async (traineeId) => {
    const { data: wData } = await supabase
      .from('workouts')
      .select('id, date, status')
      .eq('user_id', traineeId)
      .order('date', { ascending: false })

    if (!wData || wData.length === 0) {
      setTraineeAllLogs([])
      setTraineeWeeklyLogs([])
      return
    }

    const wIdToDate = wData.reduce((acc, cur) => ({ ...acc, [cur.id]: cur.date }), {})
    const allIds = wData.map(w => w.id)

    const { data: logsData } = await supabase
      .from('workout_logs')
      .select('*')
      .in('workout_id', allIds)

    if (logsData) {
      const enriched = logsData.map(l => ({
        ...l,
        date: wIdToDate[l.workout_id] || todayStr
      }))
      setTraineeAllLogs(enriched)

      const now = new Date()
      const sevenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 12, 0, 0)
      const sevenIso = formatLocalISO(sevenDaysAgo)
      setTraineeWeeklyLogs(enriched.filter(l => l.date >= sevenIso))
    }
  }

  const loadTraineeWorkoutForDate = async (traineeId, dateStr) => {
    const { data: workouts } = await supabase
      .from('workouts')
      .select('id, date')
      .eq('user_id', traineeId)
      .eq('date', dateStr)
      .limit(1)

    if (workouts && workouts.length > 0) {
      const wId = workouts[0].id
      setActiveWorkoutId(wId)

      const { data: logs } = await supabase
        .from('workout_logs')
        .select('*')
        .eq('workout_id', wId)

      if (logs) {
        setAssignedExercises(
          logs.map(l => {
            const dur = parseFloat(l.duration_mins) || 25
            const dist = parseFloat(l.distance_km) || 0
            const spd = dur > 0 && dist > 0 ? Number((dist / (dur / 60)).toFixed(2)) : 3.5

            return {
              uuid: crypto.randomUUID(),
              name: l.exercise_name,
              muscle: l.muscle_group,
              sub_muscle: l.sub_muscle || l.muscle_group,
              type: l.equipment_type || 'Dumbbell',
              sets: l.sets || 3,
              reps: l.reps || 10,
              weight: l.weight_kg || 0,
              rest_sec: l.rest_sec || 90,
              duration: dur,
              incline: l.incline ?? 0,
              distance_km: dist,
              speed_kmh: spd,
              notes: l.notes || ''
            }
          })
        )
      }
    } else {
      setActiveWorkoutId(null)
      setAssignedExercises([])
    }
  }

  const handleSelectTrainee = async (client) => {
    setSelectedTrainee(client)
    syncTraineeIdentityInputs(client)
    await Promise.all([
      fetchTraineeFullTelemetry(client.id),
      loadTraineeWorkoutForDate(client.id, assignDate)
    ])
  }

  const handleDateChange = async (newDate) => {
    setAssignDate(newDate)
    if (selectedTrainee) {
      await loadTraineeWorkoutForDate(selectedTrainee.id, newDate)
    }
  }

  // อัปเดตชื่อยูเซอร์และสัญลักษณ์ทีมของลูกเทรน
  const handleSaveTraineeIdentity = async (customTeamPayload = null) => {
    if (!selectedTrainee) return
    setIsUpdatingIdentity(true)

    const payload = customTeamPayload || {
      display_name: editClientName.trim() || 'นักสำรวจ',
      team_name: editClientTeam.trim() || 'ทีมขนุน',
      team_color: editClientColor,
      team_icon: editClientIcon
    }

    const { error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', selectedTrainee.id)

    if (!error) {
      const updatedClient = { ...selectedTrainee, ...payload }
      setSelectedTrainee(updatedClient)
      setTrainees(prev => prev.map(t => (t.id === selectedTrainee.id ? updatedClient : t)))
      if (currentUser?.id === selectedTrainee.id) {
        setMyProfile(updatedClient)
      }
      syncTraineeIdentityInputs(updatedClient)
    } else {
      alert('บันทึกข้อมูลทีมไม่สำเร็จ: ' + error.message)
    }
    setIsUpdatingIdentity(false)
  }

  // ปุ่มด่วน: ดึงลูกเทรนเข้าสังกัดทีมของเทรนเนอร์ที่กำลังล็อกอินอยู่ทันที
  const handleRecruitToMyTeam = async () => {
    const trainerName = myProfile?.display_name || 'ขนุน'
    const myTeamName = myProfile?.team_name || `ทีม${trainerName}`
    const myTeamColor = myProfile?.team_color || 'emerald'
    const myTeamIcon = myProfile?.team_icon || '🌲⚡'

    await handleSaveTraineeIdentity({
      display_name: editClientName.trim() || selectedTrainee?.display_name || 'สมาชิก',
      team_name: myTeamName,
      team_color: myTeamColor,
      team_icon: myTeamIcon
    })
  }

  const handleChangeUserRole = async (targetUserId, newRole) => {
    if (myRole !== 'master') {
      alert('เฉพาะแอดมินสูงสุด (Master) เท่านั้นที่สามารถเปลี่ยนระดับสิทธิ์ผู้ใช้งานได้')
      return
    }

    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', targetUserId)

    if (!error) {
      setTrainees(prev => prev.map(t => (t.id === targetUserId ? { ...t, role: newRole } : t)))
      if (selectedTrainee?.id === targetUserId) {
        setSelectedTrainee(prev => ({ ...prev, role: newRole }))
      }
      if (currentUser?.id === targetUserId) {
        setMyRole(newRole)
      }
    } else {
      alert('อัปเดตสิทธิ์ไม่สำเร็จ: ' + error.message)
    }
  }

  // คำนวณพลังงานที่เผาผลาญของแต่ละท่าตามน้ำหนักตัวของลูกเทรน
  const calculateAssignedItemKcal = (item) => {
    const traineeWeight = parseFloat(selectedTrainee?.weight_kg) || 70
    const weightFactor = traineeWeight / 70

    if (item.muscle === 'Cardio') {
      return analyzeCardioKinematics({
        durationMins: item.duration,
        distanceKm: item.distance_km,
        inclinePercent: item.incline,
        userWeightKg: traineeWeight,
        notes: item.notes
      }).grossSmartwatchKcal
    }

    const effortEval = evaluateTrainingContinuityAndEffort({
      item,
      profile: selectedTrainee,
      allHistoricalLogs: traineeAllLogs,
      referenceDate: assignDate
    })
    const baseSetKcal =
      item.muscle === 'Legs'
        ? 9.5
        : item.muscle === 'Back' || item.muscle === 'Chest'
          ? 8.0
          : 6.5
    const setsCount = parseInt(item.sets) || 3
    const intensityMult = 1 + (effortEval.autoRpe - 7.5) * 0.06
    return Math.max(8, Math.round(setsCount * baseSetKcal * weightFactor * intensityMult))
  }

  const handleAddExercise = (ex) => {
    const isBodyweightOrCali = ex.type === 'Bodyweight' || ex.type === 'Calisthenics'
    const isInclineWalk = ex.name.toLowerCase().includes('incline') || ex.name.includes('เดินชัน')
    const defaultDuration = 25
    const defaultIncline = isInclineWalk ? 8 : 0
    const defaultSpeed = isInclineWalk ? 3.4 : 5.0
    const defaultDist = Number(((defaultDuration / 60) * defaultSpeed).toFixed(2))

    const readiness = evaluateTrainingContinuityAndEffort({
      item: { ...ex, sets: 4, reps: 10, weight: 0 },
      profile: selectedTrainee,
      allHistoricalLogs: traineeAllLogs,
      referenceDate: assignDate
    })

    const trainerDisplayName = myProfile?.display_name || 'Trainer'
    const trainerTeam = myProfile?.team_name || 'ทีมขนุน'

    const item = {
      uuid: crypto.randomUUID(),
      name: ex.name,
      muscle: ex.muscle,
      sub_muscle: ex.sub_muscle || ex.muscle,
      type: ex.type || 'Dumbbell',
      sets: 4,
      reps: 10,
      weight: ex.muscle === 'Cardio' || isBodyweightOrCali ? 0 : readiness.expectedWorkingWeight,
      rest_sec: 90,
      duration: defaultDuration,
      incline: defaultIncline,
      distance_km: defaultDist,
      speed_kmh: defaultSpeed,
      notes: `มอบหมายโดย ${trainerDisplayName} (${trainerTeam})`
    }
    setAssignedExercises(prev => [...prev, item])
  }

  const handleLoadProgramTemplate = (templateItems) => {
    const formatted = templateItems.map(item => {
      const dur = parseFloat(item.duration) || 25
      const inc = parseFloat(item.incline) || 0
      const spd = item.speed_kmh || (inc >= 6 ? 3.4 : 5.0)
      const dist = item.distance_km ? Number(item.distance_km) : Number(((dur / 60) * spd).toFixed(2))

      return {
        uuid: crypto.randomUUID(),
        name: item.name,
        muscle: item.muscle,
        sub_muscle: item.sub_muscle || item.muscle,
        type: item.type || 'Dumbbell',
        sets: item.sets || 3,
        reps: item.reps || 10,
        weight: item.weight || 0,
        rest_sec: item.rest_sec || 90,
        duration: dur,
        incline: inc,
        distance_km: dist,
        speed_kmh: Number((dist / (dur / 60)).toFixed(2)),
        notes: item.notes || `มอบหมายโดย ${myProfile?.display_name || 'Trainer'}`
      }
    })
    setAssignedExercises(formatted)
    setTraineeSubTab('assign')
  }

  const handleUpdateField = (uuid, field, val) => {
    setAssignedExercises(prev =>
      prev.map(item => {
        if (item.uuid !== uuid) return item
        const updated = { ...item, [field]: val }

        if (item.muscle === 'Cardio') {
          const dur = parseFloat(field === 'duration' ? val : item.duration) || 0
          const hours = dur / 60
          if (field === 'distance_km' && hours > 0) {
            updated.speed_kmh = Number(((parseFloat(val) || 0) / hours).toFixed(2))
          } else if (field === 'speed_kmh' && hours > 0) {
            updated.distance_km = Number(((parseFloat(val) || 0) * hours).toFixed(2))
          } else if (field === 'duration' && hours > 0) {
            updated.speed_kmh = Number(((parseFloat(item.distance_km) || 0) / hours).toFixed(2))
          }
        }
        return updated
      })
    )
  }

  const handleRemoveItem = (uuid) => {
    setAssignedExercises(prev => prev.filter(item => item.uuid !== uuid))
  }

  const handleSaveTraineeSchedule = async () => {
    if (!selectedTrainee || assignedExercises.length === 0) return
    setIsSaving(true)

    try {
      let wId = activeWorkoutId
      if (!wId) {
        const { data: newW, error: wErr } = await supabase
          .from('workouts')
          .insert([{
            user_id: selectedTrainee.id,
            date: assignDate,
            status: 'assigned_by_trainer'
          }])
          .select()
          .single()

        if (wErr) throw wErr
        wId = newW.id
        setActiveWorkoutId(wId)
      } else {
        await supabase.from('workout_logs').delete().eq('workout_id', wId)
      }

      const payload = assignedExercises.map(item => {
        const effortEval = evaluateTrainingContinuityAndEffort({
          item,
          profile: selectedTrainee,
          allHistoricalLogs: traineeAllLogs,
          referenceDate: assignDate
        })
        const estMins = estimateExerciseDurationMins(item)

        return {
          workout_id: wId,
          exercise_name: item.name,
          muscle_group: item.muscle,
          sub_muscle: item.sub_muscle,
          equipment_type: item.type,
          sets: parseInt(item.sets) || 0,
          reps: parseInt(item.reps) || 0,
          weight_kg: parseFloat(item.weight) || 0,
          rpe: effortEval.autoRpe,
          rest_sec: parseInt(item.rest_sec) || 90,
          duration_mins: estMins,
          incline: parseFloat(item.incline) || 0,
          distance_km: parseFloat(item.distance_km) || 0,
          kcal_burned: calculateAssignedItemKcal(item),
          notes: item.notes || `มอบหมายโดย ${myProfile?.display_name || 'Trainer'}`
        }
      })

      const { error: logErr } = await supabase.from('workout_logs').insert(payload)
      if (logErr) throw logErr

      await fetchTraineeFullTelemetry(selectedTrainee.id)
      alert(`ส่งตารางฝึกประจำวันที่ ${assignDate} ให้ "${selectedTrainee.display_name || selectedTrainee.email}" สำเร็จ!`)
    } catch (err) {
      alert('เกิดข้อผิดพลาด: ' + err.message)
    } finally {
      setIsSaving(false)
    }
  }

  // ฟังก์ชันสตูดิโอสร้างโปรแกรมใหม่ของเทรนเนอร์/มาสเตอร์ (Immutable)
  const handleAddBuilderRow = () => {
    setBuilderExercises(prev => [
      ...prev,
      { name: MASTER_EXERCISE_LIBRARY[0].name, sets: 3, reps: 12 }
    ])
  }

  const handleUpdateBuilderRow = (idx, field, val) => {
    setBuilderExercises(prev =>
      prev.map((row, i) => (i === idx ? { ...row, [field]: val } : row))
    )
  }

  const handleRemoveBuilderRow = (idx) => {
    setBuilderExercises(prev => prev.filter((_, i) => i !== idx))
  }

  const handleCreateTeamProgram = async (e) => {
    e.preventDefault()
    if (!newProgTitle.trim() || builderExercises.length === 0) return
    setIsSavingCustomProg(true)

    const creatorDisplayName =
      myProfile?.display_name ||
      (myProfile?.email ? myProfile.email.split('@')[0] : 'Master Trainer')
    const teamName = myProfile?.team_name || 'ทีมขนุน'
    const teamColor = myProfile?.team_color || 'emerald'
    const teamIcon = myProfile?.team_icon || '🌲⚡'

    const payload = {
      creator_id: currentUser?.id || null,
      creator_name: creatorDisplayName,
      team_name: teamName,
      team_color: teamColor,
      team_icon: teamIcon,
      title: newProgTitle.trim(),
      category_tag: newProgTag,
      target_goal: selectedTrainee?.goal || 'All',
      description: newProgDesc.trim() || `ออกแบบโดย ${creatorDisplayName} (${teamName} ${teamIcon})`,
      exercises: builderExercises
    }

    const { data, error } = await supabase
      .from('custom_programs')
      .insert([payload])
      .select()
      .single()

    if (!error && data) {
      setCustomPrograms(prev => [data, ...prev])
    } else {
      setCustomPrograms(prev => [{ ...payload, id: crypto.randomUUID() }, ...prev])
    }

    setNewProgTitle('')
    setNewProgDesc('')
    setIsSavingCustomProg(false)
    alert(`สร้างโปรแกรม "${payload.title}" โดยผู้สร้าง "${creatorDisplayName}" (${teamName} ${teamIcon}) สำเร็จ!`)
  }

  const handleAssignCustomProgToClient = (prog) => {
    if (!selectedTrainee) return
    const rawList = Array.isArray(prog.exercises) ? prog.exercises : []
    const builtItems = rawList.map(entry => {
      const matchedLib =
        MASTER_EXERCISE_LIBRARY.find(e => e.name === entry.name) ||
        MASTER_EXERCISE_LIBRARY[0]

      const personalized = personalizeExercisePrescription(
        matchedLib,
        selectedTrainee?.weight_kg || 70,
        selectedTrainee?.fitness_level || 'Intermediate',
        selectedTrainee?.session_mins || 60,
        selectedTrainee?.goal || 'Fat Loss',
        traineeAllLogs,
        selectedTrainee,
        assignDate
      )

      return {
        ...personalized,
        sets: parseInt(entry.sets) || personalized.sets,
        reps: parseInt(entry.reps) || personalized.reps,
        uuid: crypto.randomUUID(),
        notes: `โปรแกรม "${prog.title}" โดย ${prog.creator_name} (${prog.team_name} ${prog.team_icon || ''})`
      }
    })

    handleLoadProgramTemplate(builtItems)
  }

  const handleDeleteCustomProg = async (progId) => {
    if (!window.confirm('ยืนยันการลบโปรแกรมนี้?')) return
    await supabase.from('custom_programs').delete().eq('id', progId)
    setCustomPrograms(prev => prev.filter(p => p.id !== progId))
  }

  if (isCheckingAccess) {
    return <div className="flex items-center justify-center h-screen text-slate-500">กำลังตรวจสอบสิทธิ์ความปลอดภัย (RBAC)...</div>
  }

  const uniqueTeams = Array.from(new Set(trainees.map(t => t.team_name || 'ทีมขนุน')))
  const filteredTraineesList = trainees.filter(
    t => teamFilter === 'All' || (t.team_name || 'ทีมขนุน') === teamFilter
  )

  const clientBio = calculateScientificBiometrics(selectedTrainee)
  const clientMacros = calculateDailyMacrosAndHydration(selectedTrainee, clientBio, 300, 60)

  // ประเมินความพร้อมเดินป่า 30 อุทยานของลูกเทรนคนนี้
  const readyParksCountForClient = THAI_FOREST_EXPEDITIONS_30.filter(
    p => evaluateTrailExpeditionReadiness(p, selectedTrainee, traineeAllLogs).overallReadyPct >= 80
  ).length

  const clientMuscleMatrix = MUSCLE_TARGETS.map(target => {
    const scaledOptimal = Math.max(6, Math.round(target.optimalSets * clientBio.volumeScale))
    const setsTrained = traineeWeeklyLogs
      .filter(l => l.muscle_group === target.group)
      .reduce((sum, l) => sum + (parseInt(l.sets) || 0), 0)

    const ratio = Math.min(100, Math.round((setsTrained / scaledOptimal) * 100))

    let statusText = 'พักฟื้นสมบูรณ์ (0%)'
    let badgeColor = 'bg-slate-100 text-slate-600'
    let barColor = 'bg-slate-400'
    let hexColor = '#e2e8f0'

    if (ratio >= 100) {
      statusText = 'ล้าสะสมสูง ควรพัก (Fatigued)'
      badgeColor = 'bg-rose-100 text-rose-800'
      barColor = 'bg-rose-600'
      hexColor = '#e11d48'
    } else if (ratio >= 50) {
      statusText = 'กระตุ้นเหมาะสม (Optimal)'
      badgeColor = 'bg-emerald-100 text-emerald-800'
      barColor = 'bg-emerald-600'
      hexColor = '#10b981'
    } else if (ratio > 0) {
      statusText = 'กระตุ้นเริ่มต้น (Light)'
      badgeColor = 'bg-amber-100 text-amber-800'
      barColor = 'bg-amber-500'
      hexColor = '#f59e0b'
    }

    return {
      ...target,
      setsTrained,
      optimalSets: scaledOptimal,
      ratio,
      statusText,
      badgeColor,
      barColor,
      hexColor
    }
  })

  const getClientMuscleHex = (g) => clientMuscleMatrix.find(m => m.group === g)?.hexColor || '#e2e8f0'

  const clientWeeklySummary = traineeWeeklyLogs.reduce(
    (acc, l) => {
      const s = parseInt(l.sets) || 0
      const r = parseInt(l.reps) || 0
      const w = parseFloat(l.weight_kg) || 0
      const kcal = parseFloat(l.kcal_burned) || 0
      const mins = parseFloat(l.duration_mins) || 0
      const loadMeta = getEquipmentLoadMeta({ name: l.exercise_name, type: l.equipment_type })
      const vol = l.muscle_group === 'Cardio' ? 0 : s * r * (w * loadMeta.bilateralMultiplier)

      return {
        totalVolume: acc.totalVolume + vol,
        totalSets: acc.totalSets + (l.muscle_group === 'Cardio' ? 0 : s),
        totalMins: acc.totalMins + mins,
        totalKcal: acc.totalKcal + kcal,
        cardioKm: acc.cardioKm + (parseFloat(l.distance_km) || 0)
      }
    },
    { totalVolume: 0, totalSets: 0, totalMins: 0, totalKcal: 0, cardioKm: 0 }
  )

  // สรุปผลลัพธ์ของตารางที่กำลังจัดให้ลูกเทรน (เวลาออกกำลังกาย, พลังงานที่เผาผลาญ, ไขมันที่ลดลง, ปริมาณงาน)
  const assignedSessionMetrics = assignedExercises.reduce(
    (acc, item) => {
      const mins = estimateExerciseDurationMins(item)
      const kcal = calculateAssignedItemKcal(item)
      const loadMeta = getEquipmentLoadMeta(item)
      const s = parseInt(item.sets) || 0
      const r = parseInt(item.reps) || 0
      const w = parseFloat(item.weight) || 0
      const vol = item.muscle === 'Cardio' ? 0 : s * r * (w * loadMeta.bilateralMultiplier)

      return {
        totalDurationMins: acc.totalDurationMins + mins,
        totalCalories: acc.totalCalories + kcal,
        totalSets: acc.totalSets + (item.muscle === 'Cardio' ? 1 : s),
        totalVolumeKg: acc.totalVolumeKg + vol
      }
    },
    { totalDurationMins: 0, totalCalories: 0, totalSets: 0, totalVolumeKg: 0 }
  )
  // พลังงาน 7.7 kcal เทียบเท่าการเผาผลาญไขมันบริสุทธิ์ ~1 กรัม (7,700 kcal = 1 kg)
  const assignedEstimatedFatLossGrams = Number((assignedSessionMetrics.totalCalories / 7.7).toFixed(1))

  const sortedTraineeDates = [...new Set(traineeAllLogs.map(l => l.date))].sort((a, b) => b.localeCompare(a))
  const lastWorkoutDate = sortedTraineeDates[0] || null
  const daysSinceLast = lastWorkoutDate ? calcDaysBetweenISO(lastWorkoutDate, todayStr) : null

  return (
    <div className="min-h-screen pb-14 bg-stone-100 text-slate-800">
      {/* Top Bar */}
      <nav className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 text-white bg-gradient-to-r from-slate-950 via-emerald-950 to-slate-950 border-b border-emerald-800/60 shadow-md">
        <div className="flex items-center gap-3">
          <span className="px-2.5 py-1 text-xs font-black tracking-wider text-slate-950 bg-amber-400 rounded-lg">
            MASTER & TRAINER COMMAND CENTER
          </span>
          <div>
            <h1 className="text-base font-black">
              ศูนย์บัญชาการลูกเทรน • จัดการระบบทีม & สตูดิโอสร้างโปรแกรมฝึก
            </h1>
            <p className="text-[11px] text-emerald-300">
              ผู้ควบคุม: <strong>{myProfile?.display_name || currentUser?.email}</strong> • สังกัด:{' '}
              <strong>{myProfile?.team_name || 'ทีมขนุน'} {myProfile?.team_icon || '🌲⚡'}</strong>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <span className="px-3 py-1 text-xs font-bold bg-slate-900 border border-slate-700 rounded-xl">
            สิทธิ์ของคุณ: <strong className="text-amber-400 uppercase">{myRole}</strong>
          </span>
          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="px-3.5 py-1.5 text-xs font-bold text-emerald-200 bg-emerald-900/70 border border-emerald-600/50 rounded-xl hover:bg-emerald-800"
          >
            ⚙️ ตั้งชื่อทีมของฉัน
          </button>
          <button 
            type="button"
            onClick={() => navigate('/dashboard')}
            className="px-4 py-1.5 text-xs font-bold text-white bg-slate-800 border border-slate-700 rounded-xl hover:bg-slate-700"
          >
            ← กลับหน้า Dashboard
          </button>
        </div>
      </nav>

      <div className="grid grid-cols-1 gap-6 px-6 pt-6 mx-auto max-w-7xl lg:grid-cols-12">
        
        {/* LEFT COLUMN (4 Cols): รายชื่อลูกเทรน + ตัวกรองตามทีม */}
        <div className="p-5 bg-white border border-slate-200 rounded-3xl shadow-sm lg:col-span-4 h-fit space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                สมาชิกและลูกเทรน ({filteredTraineesList.length} คน)
              </h2>
              <p className="text-xs text-slate-500">คลิกเลือกเพื่อดูสุขภาพ จัดทีม และมอบหมายตาราง</p>
            </div>
          </div>

          {/* ตัวกรองตามชื่อทีม */}
          <div>
            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-300 rounded-xl outline-none"
            >
              <option value="All">แสดงทุกทีมรวมกัน ({trainees.length} บัญชี)</option>
              {uniqueTeams.map(tName => (
                <option key={tName} value={tName}>เฉพาะสังกัด: {tName}</option>
              ))}
            </select>
          </div>

          <div className="space-y-3 max-h-[72vh] overflow-y-auto pr-1">
            {filteredTraineesList.map((client, idx) => {
              const isSelected = selectedTrainee?.id === client.id
              const cName = client.display_name || (client.email ? client.email.split('@')[0] : `User-${idx + 1}`)
              const cTeam = client.team_name || 'ทีมขนุน'
              const cColor = client.team_color || 'emerald'
              const cIcon = client.team_icon || '🌲⚡'
              const bmi = client.weight_kg && client.height_cm
                ? (client.weight_kg / Math.pow(client.height_cm / 100, 2)).toFixed(1)
                : '--'

              return (
                <div 
                  key={client.id}
                  onClick={() => handleSelectTrainee(client)}
                  className={`p-4 rounded-2xl border cursor-pointer transition ${
                    isSelected 
                      ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-amber-400' 
                      : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="text-sm font-black">
                        {idx + 1}. {cName}
                      </div>
                      <span className={`inline-block mt-1 px-2.5 py-0.5 text-[10px] font-black border rounded-full ${getTeamBadgeClasses(cColor)}`}>
                        {cTeam} {cIcon}
                      </span>
                    </div>

                    {/* เฉพาะ Master เท่านั้นที่กดเปลี่ยน Role ได้ */}
                    {myRole === 'master' ? (
                      <select
                        value={client.role || 'user'}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => handleChangeUserRole(client.id, e.target.value)}
                        className={`px-2 py-0.5 text-[10px] font-black uppercase rounded border ${
                          isSelected ? 'bg-slate-800 text-amber-400 border-slate-700' : 'bg-white text-slate-800 border-slate-300'
                        }`}
                      >
                        <option value="user">USER</option>
                        <option value="trainer">TRAINER</option>
                        <option value="master">MASTER</option>
                      </select>
                    ) : (
                      <span className="px-2 py-0.5 text-[10px] font-black uppercase bg-slate-200 text-slate-700 rounded">
                        {client.role || 'user'}
                      </span>
                    )}
                  </div>

                  <div className={`grid grid-cols-2 gap-1 text-[11px] pt-2 border-t ${
                    isSelected ? 'border-slate-800 text-slate-300' : 'border-slate-200/70 text-slate-600'
                  }`}>
                    <div>นน./สูง: <strong>{client.weight_kg || '--'}kg / {client.height_cm || '--'}cm</strong></div>
                    <div>BMI: <strong>{bmi}</strong> ({client.fitness_level || 'Inter'})</div>
                    <div className="col-span-2">รูปร่าง: <strong>{client.body_type || 'ยังไม่ระบุ'}</strong> • เป้า: <strong className={isSelected ? 'text-emerald-400' : 'text-emerald-700'}>{client.goal || 'ยังไม่ระบุ'}</strong></div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* RIGHT COLUMN (8 Cols): แดชบอร์ดควบคุมลูกเทรน & สตูดิโอสร้างโปรแกรม */}
        <div className="space-y-6 lg:col-span-8">
          {!selectedTrainee ? (
            <div className="p-16 bg-white border border-slate-200 rounded-3xl text-center text-slate-400">
              กรุณาเลือกลูกเทรนจากรายชื่อด้านซ้าย
            </div>
          ) : (
            <>
              {/* กล่องควบคุมโปรไฟล์ ชื่อยูเซอร์ และสังกัดทีมของลูกเทรน */}
              <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 text-[10px] font-black text-white bg-emerald-600 rounded uppercase">
                        CLIENT COMMAND DECK
                      </span>
                      <h2 className="text-xl font-black text-slate-900">
                        {selectedTrainee.display_name || selectedTrainee.email}
                      </h2>
                      <span className={`px-3 py-0.5 text-xs font-black border rounded-full ${getTeamBadgeClasses(selectedTrainee.team_color)}`}>
                        {selectedTrainee.team_name || 'ทีมขนุน'} {selectedTrainee.team_icon || '🌲⚡'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      อีเมล: {selectedTrainee.email} • รูปร่าง: <strong>{selectedTrainee.body_type}</strong> • เป้าหมาย: <strong>{selectedTrainee.goal}</strong> • พร้อมเดินป่าแล้ว: <strong className="text-emerald-700">{readyParksCountForClient}/30 อุทยาน</strong>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleRecruitToMyTeam}
                      disabled={isUpdatingIdentity}
                      className="px-3.5 py-1.5 text-xs font-extrabold text-slate-950 bg-amber-400 rounded-xl hover:bg-amber-300 transition shadow-2xs"
                    >
                      ⚡ ดึงเข้า &quot;{myProfile?.team_name || 'ทีมขนุน'} {myProfile?.team_icon || '🌲⚡'}&quot;
                    </button>

                    <span className={`px-3 py-1.5 text-xs font-extrabold rounded-xl border ${
                      daysSinceLast === null
                        ? 'bg-slate-100 text-slate-600 border-slate-200'
                        : daysSinceLast <= 4
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border-amber-300'
                    }`}>
                      {daysSinceLast === null
                        ? 'ยังไม่เคยบันทึกการฝึก'
                        : daysSinceLast === 0
                          ? '✓ เพิ่งฝึกวันนี้'
                          : `ฝึกครั้งล่าสุดเมื่อ ${daysSinceLast} วันที่แล้ว`}
                    </span>
                  </div>
                </div>

                {/* แถบตั้งชื่อยูเซอร์ ชื่อทีม สีทีม และไอคอนทีมให้ลูกเทรนโดยตรง */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <div className="text-xs font-extrabold text-slate-700">
                    🏷️ ตั้งชื่อสมาชิก และกำหนดสัญลักษณ์ทีม/กิลด์ให้ลูกเทรนคนนี้:
                  </div>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-12 items-center">
                    <div className="sm:col-span-3">
                      <input
                        type="text"
                        value={editClientName}
                        onChange={(e) => setEditClientName(e.target.value)}
                        placeholder="ชื่อยูเซอร์"
                        className="w-full px-3 py-1.5 text-xs font-bold bg-white border border-slate-300 rounded-xl"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <input
                        type="text"
                        value={editClientTeam}
                        onChange={(e) => setEditClientTeam(e.target.value)}
                        placeholder="ชื่อทีม (เช่น ทีมกองร้อยน้ำหวาน)"
                        className="w-full px-3 py-1.5 text-xs font-bold bg-white border border-slate-300 rounded-xl"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <select
                        value={editClientColor}
                        onChange={(e) => setEditClientColor(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-bold bg-white border border-slate-300 rounded-xl"
                      >
                        {TEAM_COLOR_OPTIONS.map(c => (
                          <option key={c.id} value={c.id}>{c.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <select
                        value={editClientIcon}
                        onChange={(e) => setEditClientIcon(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-bold bg-white border border-slate-300 rounded-xl"
                      >
                        {TEAM_ICON_PRESETS.map(ic => (
                          <option key={ic} value={ic}>ไอคอน {ic}</option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <button
                        type="button"
                        onClick={() => handleSaveTraineeIdentity()}
                        disabled={isUpdatingIdentity}
                        className="w-full py-1.5 text-xs font-extrabold text-white bg-slate-900 rounded-xl hover:bg-emerald-700"
                      >
                        บันทึกทีม
                      </button>
                    </div>
                  </div>
                </div>

                {/* ปุ่มสลับ 4 หมวดควบคุม */}
                <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-4">
                  {[
                    { id: 'telemetry', label: '📊 1. สุขภาพ & ความล้ากล้ามเนื้อ' },
                    { id: 'assign', label: '🏋️‍♂️ 2. จัดตารางฝึกให้ลูกเทรน' },
                    { id: 'meals', label: '🍱 3. โภชนาการ 5 หมวดของลูกเทรน' },
                    { id: 'studio', label: '👑 4. สร้างโปรแกรมใหม่ของทีม' }
                  ].map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTraineeSubTab(t.id)}
                      className={`py-2.5 px-3 text-xs font-extrabold rounded-xl border transition ${
                        traineeSubTab === t.id
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ===============================================================
                  SUB-TAB 1: แดชบอร์ดสุขภาพ & ความล้ากล้ามเนื้อของลูกเทรน
                 =============================================================== */}
              {traineeSubTab === 'telemetry' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="p-4 bg-white border border-slate-200 rounded-2xl">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">BMI / BMR / TDEE</span>
                      <div className="text-base font-black text-slate-900 mt-1">
                        BMI {clientBio.bmi} • {clientBio.tdee} kcal
                      </div>
                      <span className="text-[11px] text-emerald-700 font-semibold">
                        เป้ากิน: {clientBio.targetCalories} kcal/วัน
                      </span>
                    </div>

                    <div className="p-4 bg-white border border-slate-200 rounded-2xl">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">สารอาหารที่ลูกเทรนต้องกิน</span>
                      <div className="text-sm font-black text-indigo-700 mt-1">
                        P: {clientMacros.proteinGrams}g • C: {clientMacros.carbGrams}g • F: {clientMacros.fatGrams}g
                      </div>
                      <span className="text-[11px] text-sky-700 font-semibold">
                        💧 น้ำดื่ม {clientMacros.totalWaterLiters} ลิตร/วัน
                      </span>
                    </div>

                    <div className="p-4 bg-white border border-slate-200 rounded-2xl">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">ผลงาน 7 วันล่าสุด</span>
                      <div className="text-base font-black text-slate-900 mt-1">
                        {clientWeeklySummary.totalSets} เซ็ต ({clientWeeklySummary.totalMins} นาที)
                      </div>
                      <span className="text-[11px] text-slate-500">
                        Vol รวม: {clientWeeklySummary.totalVolume.toLocaleString()} kg
                      </span>
                    </div>

                    <div className="p-4 bg-white border border-slate-200 rounded-2xl">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">ความพร้อมเดินป่า 30 แห่ง</span>
                      <div className="text-base font-black text-emerald-700 mt-1">
                        🏔️ พร้อม {readyParksCountForClient} / 30 แห่ง
                      </div>
                      <span className="text-[11px] text-orange-600 font-semibold">
                        เบิร์นสะสม {clientWeeklySummary.totalKcal.toLocaleString()} kcal
                      </span>
                    </div>
                  </div>

                  {/* แผนภาพความล้ากล้ามเนื้อของลูกเทรน */}
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-12 p-6 bg-white border border-slate-200 rounded-3xl shadow-sm">
                    <div className="md:col-span-5 flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                      <span className="text-xs font-extrabold text-slate-700 mb-2">
                        หุ่นจำลองความล้ากล้ามเนื้อลูกเทรน (7 วัน)
                      </span>
                      <div className="flex items-center gap-4">
                        <svg viewBox="0 0 200 360" className="w-28 h-48">
                          <circle cx="100" cy="30" r="18" fill="#cbd5e1" />
                          <rect x="48" y="60" width="22" height="32" rx="10" fill={getClientMuscleHex('Shoulders')} />
                          <rect x="130" y="60" width="22" height="32" rx="10" fill={getClientMuscleHex('Shoulders')} />
                          <rect x="70" y="60" width="29" height="36" rx="6" fill={getClientMuscleHex('Chest')} />
                          <rect x="101" y="60" width="29" height="36" rx="6" fill={getClientMuscleHex('Chest')} />
                          <rect x="75" y="98" width="50" height="68" rx="8" fill={getClientMuscleHex('Core')} />
                          <rect x="44" y="94" width="20" height="65" rx="8" fill={getClientMuscleHex('Arms')} />
                          <rect x="136" y="94" width="20" height="65" rx="8" fill={getClientMuscleHex('Arms')} />
                          <rect x="72" y="170" width="26" height="85" rx="10" fill={getClientMuscleHex('Legs')} />
                          <rect x="102" y="170" width="26" height="85" rx="10" fill={getClientMuscleHex('Legs')} />
                        </svg>
                        <svg viewBox="0 0 200 360" className="w-28 h-48">
                          <circle cx="100" cy="30" r="18" fill="#cbd5e1" />
                          <polygon points="70,60 130,60 122,135 78,135" fill={getClientMuscleHex('Back')} />
                          <rect x="78" y="136" width="44" height="30" rx="6" fill={getClientMuscleHex('Back')} />
                          <rect x="72" y="168" width="27" height="90" rx="10" fill={getClientMuscleHex('Legs')} />
                          <rect x="101" y="168" width="27" height="90" rx="10" fill={getClientMuscleHex('Legs')} />
                        </svg>
                      </div>
                    </div>

                    <div className="md:col-span-7 space-y-3">
                      <h3 className="text-sm font-extrabold text-slate-900">
                        รายละเอียดการใช้กล้ามเนื้อและความล้าของลูกเทรนรายส่วน
                      </h3>
                      {clientMuscleMatrix.map(m => (
                        <div key={m.group} className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-bold text-slate-800">{m.label}</span>
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${m.badgeColor}`}>
                              {m.statusText} ({m.ratio}%)
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                            <span>ฝึกไปแล้ว: <strong>{m.setsTrained}</strong> / {m.optimalSets} เซ็ต</span>
                          </div>
                          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div className={`h-full ${m.barColor}`} style={{ width: `${m.ratio}%` }}></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ===============================================================
                  SUB-TAB 2: จัดตารางฝึก & ส่งโปรแกรมพิเศษ/เดินป่า 30 แห่งให้ลูกเทรน
                  (แสดงภาพท่าฝึก + พลังงานที่เผาผลาญ + ไขมันที่ลด + ระยะเวลาออกกำลังกาย)
                 =============================================================== */}
              {traineeSubTab === 'assign' && (
                <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-extrabold text-slate-700">วันที่มอบหมายตาราง:</label>
                      <input 
                        type="date" 
                        value={assignDate}
                        onChange={(e) => handleDateChange(e.target.value)}
                        className="px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-xl"
                      />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setIsPresetModalOpen(true)}
                        className="px-3.5 py-2 text-xs font-extrabold text-pink-800 bg-pink-50 border border-pink-300 rounded-xl hover:bg-pink-100"
                      >
                        🔥 เลือกโปรแกรมพิเศษ / 30 อุทยาน / ฮีโร่
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsExerciseModalOpen(true)}
                        className="px-3.5 py-2 text-xs font-bold text-white bg-slate-900 rounded-xl hover:bg-slate-800"
                      >
                        + เพิ่มท่าฝึกทีละท่า
                      </button>
                      {assignedExercises.length > 0 && (
                        <button
                          type="button"
                          onClick={handleSaveTraineeSchedule}
                          disabled={isSaving}
                          className="px-5 py-2 text-xs font-extrabold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700"
                        >
                          {isSaving ? 'กำลังส่งข้อมูล...' : '💾 บันทึกตารางส่งให้ลูกเทรน'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* แถบสรุปรวมผลลัพธ์ของตารางฝึกที่จัดให้ลูกเทรน: ระยะเวลา, พลังงานที่เผาผลาญ, ไขมันที่ลด, ปริมาณงาน */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 p-4 bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white rounded-2xl border border-emerald-800/60 shadow-xs">
                    <div>
                      <span className="text-[10px] font-bold text-emerald-300 uppercase">⏱️ ระยะเวลาออกกำลังกาย</span>
                      <div className="text-xl font-black text-white mt-0.5">
                        {assignedSessionMetrics.totalDurationMins} <span className="text-xs font-normal text-slate-300">นาที</span>
                      </div>
                      <p className="text-[10px] text-slate-400">รวมเวลาฝึกและพักเซ็ต</p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-orange-300 uppercase">🔥 พลังงานที่เผาผลาญ</span>
                      <div className="text-xl font-black text-orange-400 mt-0.5">
                        {assignedSessionMetrics.totalCalories.toLocaleString()} <span className="text-xs font-normal text-slate-300">kcal</span>
                      </div>
                      <p className="text-[10px] text-slate-400">คำนวณตาม นน. {selectedTrainee?.weight_kg || 70} kg</p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-amber-300 uppercase">💧 ไขมันที่ลดลงประเมิน</span>
                      <div className="text-xl font-black text-amber-300 mt-0.5">
                        ~{assignedEstimatedFatLossGrams} <span className="text-xs font-normal text-slate-300">กรัม</span>
                      </div>
                      <p className="text-[10px] text-slate-400">สลายไขมัน (7.7 kcal = 1g)</p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-sky-300 uppercase">🏋️‍♂️ ปริมาณงานรวม (Volume)</span>
                      <div className="text-xl font-black text-sky-300 mt-0.5">
                        {assignedSessionMetrics.totalVolumeKg.toLocaleString()} <span className="text-xs font-normal text-slate-300">kg</span>
                      </div>
                      <p className="text-[10px] text-slate-400">รวม {assignedExercises.length} ท่า ({assignedSessionMetrics.totalSets} เซ็ต)</p>
                    </div>
                  </div>

                  {assignedExercises.length === 0 ? (
                    <div className="py-14 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl">
                      <p className="text-sm font-bold text-slate-600">ยังไม่มีตารางฝึกของลูกเทรนในวันที่ {assignDate}</p>
                      <p className="mt-1 text-xs text-slate-400">กดปุ่ม &quot;🔥 เลือกโปรแกรมพิเศษ / 30 อุทยาน / ฮีโร่&quot; เพื่อดึงตารางสำเร็จรูปมาปรับแต่ง</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {assignedExercises.map((item, idx) => {
                        const loadMeta = getEquipmentLoadMeta(item)
                        const estMins = estimateExerciseDurationMins(item)
                        const itemKcal = calculateAssignedItemKcal(item)
                        const itemFatGrams = Number((itemKcal / 7.7).toFixed(1))

                        return (
                          <div key={item.uuid} className="p-4 border border-slate-200 rounded-2xl bg-slate-50/70 hover:border-emerald-400 transition">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                              {/* ซ้าย: ภาพประกอบท่าออกกำลังกาย + ชื่อท่า + ป้ายเวลา/แคลอรี่/ไขมันที่ลด */}
                              <div className="flex items-start sm:items-center gap-3.5">
                                <ExerciseIllustration
                                  name={item.name}
                                  muscle={item.muscle}
                                  type={item.type}
                                  size="md"
                                />
                                <div>
                                  <span className="text-sm font-black text-slate-900">
                                    {idx + 1}. {item.name}
                                  </span>
                                  <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px]">
                                    <span className="px-2 py-0.5 font-extrabold text-emerald-800 bg-emerald-100 border border-emerald-300 rounded-md">
                                      {item.muscle} ({item.type})
                                    </span>
                                    <span className="px-2 py-0.5 font-bold text-indigo-800 bg-indigo-50 border border-indigo-200 rounded-md">
                                      ⏱️ เวลา ~{estMins} นาที
                                    </span>
                                    <span className="px-2 py-0.5 font-extrabold text-orange-800 bg-orange-50 border border-orange-200 rounded-md">
                                      🔥 เผาผลาญ {itemKcal} kcal
                                    </span>
                                    <span className="px-2 py-0.5 font-extrabold text-amber-900 bg-amber-50 border border-amber-300 rounded-md">
                                      💧 ลดไขมัน ~{itemFatGrams} กรัม
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleRemoveItem(item.uuid)}
                                className="self-end sm:self-center px-2.5 py-1 text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 shrink-0"
                              >
                                ลบท่านี้
                              </button>
                            </div>

                            {item.muscle !== 'Cardio' ? (
                              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-500">เซ็ต (Sets)</label>
                                  <input type="number" value={item.sets} onChange={(e) => handleUpdateField(item.uuid, 'sets', e.target.value)} className="w-full px-2.5 py-1 text-xs font-bold bg-white border border-slate-300 rounded" />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-500">{loadMeta.repsLabel}</label>
                                  <input type="number" value={item.reps} onChange={(e) => handleUpdateField(item.uuid, 'reps', e.target.value)} className="w-full px-2.5 py-1 text-xs font-bold bg-white border border-slate-300 rounded" />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-emerald-800">{loadMeta.weightLabel}</label>
                                  <input type="number" step="0.5" value={item.weight} onChange={(e) => handleUpdateField(item.uuid, 'weight', e.target.value)} className="w-full px-2.5 py-1 text-xs font-bold bg-white border border-emerald-400 rounded" />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-500">พักเซ็ต (วินาที)</label>
                                  <input type="number" step="15" value={item.rest_sec} onChange={(e) => handleUpdateField(item.uuid, 'rest_sec', e.target.value)} className="w-full px-2.5 py-1 text-xs font-bold bg-white border border-slate-300 rounded" />
                                </div>
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-500">เวลา (นาที)</label>
                                  <input type="number" value={item.duration} onChange={(e) => handleUpdateField(item.uuid, 'duration', e.target.value)} className="w-full px-2.5 py-1 text-xs font-bold bg-white border border-slate-300 rounded" />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-500">ความชัน (Incline %)</label>
                                  <input type="number" step="0.5" value={item.incline} onChange={(e) => handleUpdateField(item.uuid, 'incline', e.target.value)} className="w-full px-2.5 py-1 text-xs font-bold bg-white border border-slate-300 rounded" />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-500">ระยะทางเป้า (Km)</label>
                                  <input type="number" step="0.05" value={item.distance_km} onChange={(e) => handleUpdateField(item.uuid, 'distance_km', e.target.value)} className="w-full px-2.5 py-1 text-xs font-bold bg-white border border-slate-300 rounded" />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-sky-700">ความเร็วเฉลี่ย (Km/h)</label>
                                  <input type="number" step="0.1" value={item.speed_kmh || 3.5} onChange={(e) => handleUpdateField(item.uuid, 'speed_kmh', e.target.value)} className="w-full px-2.5 py-1 text-xs font-bold bg-sky-50 border border-sky-300 rounded" />
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ===============================================================
                  SUB-TAB 3: แผนโภชนาการ 5 หมวดของลูกเทรน
                 =============================================================== */}
              {traineeSubTab === 'meals' && (
                <MealPlannerWidget
                  profile={selectedTrainee}
                  activeBurnKcal={Math.round(clientWeeklySummary.totalKcal / 7) || 280}
                  workoutMins={selectedTrainee.session_mins || 60}
                />
              )}

              {/* ===============================================================
                  SUB-TAB 4: สตูดิโอสร้างโปรแกรมออกกำลังกายของเทรนเนอร์/มาสเตอร์
                 =============================================================== */}
              {traineeSubTab === 'studio' && (
                <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-6">
                  <form onSubmit={handleCreateTeamProgram} className="p-5 bg-amber-50/80 border-2 border-amber-400 rounded-2xl space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-amber-200">
                      <div>
                        <span className="px-2 py-0.5 text-[10px] font-black text-slate-950 bg-amber-400 rounded uppercase">
                          TRAINER & MASTER PROGRAM BUILDER
                        </span>
                        <h3 className="text-base font-black text-slate-900 mt-1">
                          สร้างโปรแกรมออกกำลังกายใหม่พร้อมติดชื่อผู้สร้าง: {myProfile?.display_name || 'Master'} ({myProfile?.team_name || 'ทีมขนุน'} {myProfile?.team_icon || '🌲⚡'})
                        </h3>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-slate-700 mb-1">ชื่อโปรแกรมฝึก:</label>
                        <input
                          type="text"
                          required
                          value={newProgTitle}
                          onChange={(e) => setNewProgTitle(e.target.value)}
                          placeholder="เช่น ตารางปั้นก้นเด้งฉบับทีมขนุน / โปรแกรมรีดพุงกองร้อยน้ำหวาน"
                          className="w-full px-3.5 py-2 text-xs font-bold bg-white border border-amber-300 rounded-xl outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">หมวดหมู่ (Tag):</label>
                        <input
                          type="text"
                          value={newProgTag}
                          onChange={(e) => setNewProgTag(e.target.value)}
                          className="w-full px-3.5 py-2 text-xs font-bold bg-white border border-amber-300 rounded-xl outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">คำอธิบายโปรแกรมและเคล็ดลับ:</label>
                      <input
                        type="text"
                        value={newProgDesc}
                        onChange={(e) => setNewProgDesc(e.target.value)}
                        placeholder="ระบุเป้าหมายและเทคนิคการเล่น..."
                        className="w-full px-3.5 py-2 text-xs font-medium bg-white border border-amber-300 rounded-xl outline-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-slate-800">รายการท่าฝึก ({builderExercises.length} ท่า):</span>
                        <button
                          type="button"
                          onClick={handleAddBuilderRow}
                          className="px-3 py-1 text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 rounded-lg hover:bg-emerald-200"
                        >
                          + เพิ่มท่าฝึก
                        </button>
                      </div>

                      {builderExercises.map((row, idx) => {
                        const matchedEx = MASTER_EXERCISE_LIBRARY.find(e => e.name === row.name)
                        return (
                          <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-white p-2.5 rounded-xl border border-amber-200">
                            <div className="col-span-7 flex items-center gap-2">
                              <ExerciseIllustration
                                name={row.name}
                                muscle={matchedEx?.muscle}
                                type={matchedEx?.type}
                                size="sm"
                              />
                              <select
                                value={row.name}
                                onChange={(e) => handleUpdateBuilderRow(idx, 'name', e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-300 rounded-lg outline-none"
                              >
                                {MASTER_EXERCISE_LIBRARY.map(ex => (
                                  <option key={ex.name} value={ex.name}>
                                    [{ex.muscle}] {ex.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="col-span-2">
                              <input
                                type="number"
                                min="1"
                                value={row.sets}
                                onChange={(e) => handleUpdateBuilderRow(idx, 'sets', e.target.value)}
                                className="w-full px-2 py-1 text-xs font-bold text-center border border-slate-300 rounded-lg"
                                title="เซ็ต"
                              />
                            </div>
                            <div className="col-span-2">
                              <input
                                type="number"
                                min="1"
                                value={row.reps}
                                onChange={(e) => handleUpdateBuilderRow(idx, 'reps', e.target.value)}
                                className="w-full px-2 py-1 text-xs font-bold text-center border border-slate-300 rounded-lg"
                                title="ครั้ง"
                              />
                            </div>
                            <div className="col-span-1 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemoveBuilderRow(idx)}
                                className="text-xs font-bold text-rose-600 hover:underline"
                              >
                                ลบ
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    <button
                      type="submit"
                      disabled={isSavingCustomProg}
                      className="w-full py-3 text-xs font-black text-white bg-slate-900 rounded-xl hover:bg-emerald-700 transition"
                    >
                      {isSavingCustomProg ? 'กำลังบันทึก...' : '💾 บันทึกและเผยแพร่โปรแกรมเข้าสู่คลังกลางของระบบ'}
                    </button>
                  </form>

                  {/* รายการโปรแกรมทั้งหมดที่เทรนเนอร์สร้างไว้ */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-black text-slate-900">
                      คลังโปรแกรมที่สร้างโดยเทรนเนอร์และมาสเตอร์ ({customPrograms.length} โปรแกรม)
                    </h4>

                    {customPrograms.map(prog => (
                      <div key={prog.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`px-2.5 py-0.5 text-[10px] font-black border rounded-full ${getTeamBadgeClasses(prog.team_color)}`}>
                              {prog.team_name} {prog.team_icon}
                            </span>
                            <span className="text-xs font-bold text-slate-600">
                              ✍️ ผู้สร้าง: <strong>{prog.creator_name}</strong>
                            </span>
                          </div>
                          <div className="text-sm font-black text-slate-900 mt-1">{prog.title}</div>
                          <p className="text-xs text-slate-500">{prog.description}</p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleAssignCustomProgToClient(prog)}
                            className="px-4 py-2 text-xs font-extrabold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700"
                          >
                            ⚡ ส่งโปรแกรมนี้ให้ {selectedTrainee.display_name || 'ลูกเทรน'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCustomProg(prog.id)}
                            className="p-2 text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl hover:bg-rose-100"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

      </div>

      <ExerciseModal 
        isOpen={isExerciseModalOpen}
        onClose={() => setIsExerciseModalOpen(false)}
        onAddExercise={handleAddExercise}
      />

      <ProgramGeneratorModal
        isOpen={isPresetModalOpen}
        onClose={() => setIsPresetModalOpen(false)}
        onSelectProgram={handleLoadProgramTemplate}
        profile={selectedTrainee}
      />
    </div>
  )
}