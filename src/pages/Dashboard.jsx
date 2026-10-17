import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import ExerciseModal, { MASTER_EXERCISE_LIBRARY } from '../components/ExerciseModal'
import ProgramGeneratorModal, { getTeamBadgeClasses } from '../components/ProgramGeneratorModal'
import AnalyticsWidgets from '../components/AnalyticsWidgets'
import DailyHeroCards, { extractActiveProgramTitle } from '../components/DailyHeroCards'
import MealPlannerWidget from '../components/MealPlannerWidget'
import TrailReadinessModal from '../components/TrailReadinessModal'
import ForestryAcademicHub from '../components/ForestryAcademicHub'
import LiveGymToolbar, { getSmartSwapCandidate, calculateDailyMacrosAndHydration } from '../components/LiveGymToolbar'
import FloatingRestTimer from '../components/FloatingRestTimer'
import RestFinishedModal from '../components/RestFinishedModal'
import { playLoudRestAlarm, stopRestAlarm } from '../utils/audioAlarm'
import {
  formatLocalISO,
  getEquipmentLoadMeta,
  estimateExerciseDurationMins,
  analyzeCardioKinematics,
  evaluateTrainingContinuityAndEffort,
  calculateScientificBiometrics,
  generateAdaptiveWeeklySchedule,
  generateWorkoutItemsForModule,
  SESSION_MODULES_CATALOG
} from '../utils/workoutEngine'

const MUSCLE_TARGETS = [
  { group: 'Chest', label: 'Chest (กล้ามเนื้ออก)', optimalSets: 12 },
  { group: 'Back', label: 'Back (กล้ามเนื้อหลังและปีก)', optimalSets: 14 },
  { group: 'Legs', label: 'Legs (ต้นขา/สะโพก/น่อง)', optimalSets: 16 },
  { group: 'Shoulders', label: 'Shoulders (หัวไหล่ หน้า-ข้าง-หลัง)', optimalSets: 10 },
  { group: 'Arms', label: 'Arms (หน้าแขน/หลังแขน/ท่อนแขน)', optimalSets: 10 },
  { group: 'Core', label: 'Core (หน้าท้องและแกนกลางลำตัว)', optimalSets: 8 }
]

export default function Dashboard() {
  const todayStr = formatLocalISO(new Date())

  // 6 หน้าหลักของแอป
  const [activeTab, setActiveTab] = useState('cards')
  const [isCommandMenuOpen, setIsCommandMenuOpen] = useState(false)

  // ย่อแถบด้านบนอัตโนมัติเมื่อเลื่อนจอลง (ใช้ 2 ระดับกันแถบกระพริบไปมา)
  const [isHeaderCompact, setIsHeaderCompact] = useState(false)
  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY
      setIsHeaderCompact(prev => (prev ? y > 20 : y > 80))
    }
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [scheduleOverrides, setScheduleOverrides] = useState({})
  const [selectedProgramsByDate, setSelectedProgramsByDate] = useState({})
  const [restDaysByDate, setRestDaysByDate] = useState({})

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false)
  const [isTrailModalOpen, setIsTrailModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingDate, setIsLoadingDate] = useState(false)

  const [selectedDate, setSelectedDate] = useState(todayStr)
  const [currentWorkoutId, setCurrentWorkoutId] = useState(null)
  const [todayWorkouts, setTodayWorkouts] = useState([])
  const [restTimerRequest, setRestTimerRequest] = useState(null)

  // ระบบนาฬิกาจับเวลาพักเซ็ต (Rest Timer) ทำงานระดับ Global รองรับทุกหน้าจอ
  const [restTimer, setRestTimer] = useState({
    active: false,
    remainingSec: 0,
    totalSec: 90,
    label: '',
    justFinished: false
  })
  const [restAlertModal, setRestAlertModal] = useState({
    isOpen: false,
    exerciseName: '',
    totalSec: 90
  })
  const restEndTimeRef = useRef(null)

  const handleStartRestTimer = (seconds, label = 'พักฟื้นระหว่างเซ็ต') => {
    stopRestAlarm()
    const duration = Math.max(5, parseInt(seconds) || 90)
    restEndTimeRef.current = Date.now() + duration * 1000
    setRestTimer({
      active: true,
      remainingSec: duration,
      totalSec: duration,
      label,
      justFinished: false
    })
    setRestAlertModal(prev => ({ ...prev, isOpen: false }))
  }

  const handleAdjustRestTimer = (deltaSec) => {
    if (!restTimer.active || !restEndTimeRef.current) {
      handleStartRestTimer(Math.max(15, deltaSec), 'พักฟื้นระหว่างเซ็ต')
      return
    }
    restEndTimeRef.current += deltaSec * 1000
    const updatedRemaining = Math.max(0, Math.ceil((restEndTimeRef.current - Date.now()) / 1000))
    setRestTimer(prev => ({
      ...prev,
      remainingSec: updatedRemaining,
      totalSec: Math.max(updatedRemaining, prev.totalSec + deltaSec)
    }))
  }

  const handleStopRestTimer = () => {
    stopRestAlarm()
    restEndTimeRef.current = null
    setRestTimer({
      active: false,
      remainingSec: 0,
      totalSec: 90,
      label: '',
      justFinished: false
    })
    setRestAlertModal(prev => ({ ...prev, isOpen: false }))
    setRestTimerRequest(null)
  }

  const handleCloseRestModal = () => {
    stopRestAlarm()
    setRestAlertModal(prev => ({ ...prev, isOpen: false }))
    setRestTimer(prev => ({ ...prev, justFinished: false }))
  }

  useEffect(() => {
    if (!restTimer.active) return
    const interval = setInterval(() => {
      if (!restEndTimeRef.current) return
      const diffSec = Math.ceil((restEndTimeRef.current - Date.now()) / 1000)
      if (diffSec <= 0) {
        restEndTimeRef.current = null
        const finishedLabel = restTimer.label || 'พักฟื้นระหว่างเซ็ต'
        const finishedTotal = restTimer.totalSec || 90
        setRestTimer(prev => ({
          ...prev,
          active: false,
          remainingSec: 0,
          justFinished: true
        }))
        playLoudRestAlarm()
        setRestAlertModal({
          isOpen: true,
          exerciseName: finishedLabel,
          totalSec: finishedTotal
        })
      } else {
        setRestTimer(prev => ({
          ...prev,
          remainingSec: diffSec
        }))
      }
    }, 250)
    return () => clearInterval(interval)
  }, [restTimer.active, restTimer.label, restTimer.totalSec])

  useEffect(() => {
    if (restTimer.justFinished && !restAlertModal.isOpen) {
      const t = setTimeout(() => {
        setRestTimer(prev => ({ ...prev, justFinished: false }))
      }, 5000)
      return () => clearTimeout(t)
    }
  }, [restTimer.justFinished, restAlertModal.isOpen])

  const [allWorkoutsMap, setAllWorkoutsMap] = useState({})
  const [weeklyLogs, setWeeklyLogs] = useState([])
  const [allHistoricalLogs, setAllHistoricalLogs] = useState([])
  const [calendarDays, setCalendarDays] = useState([])

  const navigate = useNavigate()

  useEffect(() => {
    const generate14Days = () => {
      const now = new Date()
      return Array.from({ length: 14 }, (_, idx) => {
        const d = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - (13 - idx),
          12, 0, 0
        )
        const iso = formatLocalISO(d)
        return {
          date: iso,
          dayName: d.toLocaleDateString('th-TH', { weekday: 'short' }),
          dayNum: d.getDate(),
          monthShort: d.toLocaleDateString('th-TH', { month: 'short' })
        }
      })
    }
    setCalendarDays(generate14Days())
  }, [])

  useEffect(() => {
    const initDashboard = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        navigate('/')
        return
      }
      setUser(session.user)
      await Promise.all([
        fetchUserProfile(session.user.id),
        fetchAllHistoryAndWeeklyStats(session.user.id),
        loadWorkoutForDate(session.user.id, selectedDate)
      ])
    }
    initDashboard()
  }, [navigate])

  const fetchUserProfile = async (userId) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (data) {
      setProfile(data)
      if (data.schedule_overrides && typeof data.schedule_overrides === 'object') {
        setScheduleOverrides(data.schedule_overrides)
      }
    }
  }

  const fetchAllHistoryAndWeeklyStats = async (userId) => {
    const { data: workoutsData } = await supabase
      .from('workouts')
      .select('id, date, status')
      .eq('user_id', userId)
      .order('date', { ascending: false })

    if (!workoutsData || workoutsData.length === 0) {
      setAllWorkoutsMap({})
      setWeeklyLogs([])
      setAllHistoricalLogs([])
      return
    }

    const dateMap = workoutsData.reduce((acc, cur) => ({ ...acc, [cur.date]: cur.id }), {})
    setAllWorkoutsMap(dateMap)

    const workoutIdToDateMap = workoutsData.reduce((acc, cur) => ({ ...acc, [cur.id]: cur.date }), {})
    const allWorkoutIds = workoutsData.map(w => w.id)

    const { data: logsData } = await supabase
      .from('workout_logs')
      .select('*')
      .in('workout_id', allWorkoutIds)

    if (logsData) {
      const enrichedLogs = logsData.map(l => ({
        ...l,
        date: workoutIdToDateMap[l.workout_id] || todayStr
      }))
      setAllHistoricalLogs(enrichedLogs)

      const now = new Date()
      const sevenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 12, 0, 0)
      const sevenDaysIso = formatLocalISO(sevenDaysAgo)

      setWeeklyLogs(enrichedLogs.filter(l => l.date >= sevenDaysIso))
    }
  }

  const findDefaultKcalUnit = (exName, muscleGroup) => {
    const matched = MASTER_EXERCISE_LIBRARY.find(e => e.name === exName)
    if (matched) return matched.kcal_per_unit
    return muscleGroup === 'Cardio' ? 8 : muscleGroup === 'Legs' ? 10 : 8
  }

  const loadWorkoutForDate = async (userId, targetDate) => {
    setIsLoadingDate(true)
    const { data: workouts } = await supabase
      .from('workouts')
      .select('id, date')
      .eq('user_id', userId)
      .eq('date', targetDate)
      .limit(1)

    if (workouts && workouts.length > 0) {
      const wId = workouts[0].id
      setCurrentWorkoutId(wId)

      const { data: logs } = await supabase
        .from('workout_logs')
        .select('*')
        .eq('workout_id', wId)

      if (logs && logs.length > 0) {
        // ตรวจสอบว่าบันทึกของวันนั้นเป็นวันพักฟื้น (Rest Day) หรือไม่
        const isSavedRest =
          logs.length === 1 &&
          (logs[0].muscle_group === 'Rest' ||
            String(logs[0].exercise_name || '').includes('วันพักฟื้น') ||
            String(logs[0].notes || '').includes('วันพักฟื้นร่างกาย'))

        if (isSavedRest) {
          setRestDaysByDate(prev => ({ ...prev, [targetDate]: true }))
          setSelectedProgramsByDate(prev => ({
            ...prev,
            [targetDate]: '🛌 วันพักฟื้นร่างกาย (Rest Day)'
          }))
          setTodayWorkouts([])
        } else {
          setRestDaysByDate(prev => ({ ...prev, [targetDate]: false }))
          const formattedLogs = logs.map(l => {
            const dur = parseFloat(l.duration_mins) || 25
            const dist = parseFloat(l.distance_km) || 0
            const calcSpeed = dur > 0 && dist > 0 ? Number((dist / (dur / 60)).toFixed(2)) : 3.5
            const setsCount = parseInt(l.sets) || 3

            // ดึงค่าแคลจริง (custom_kcal) จากแท็ก [แคลจริง: ...] หรือ [custom_kcal: ...] หรือ localStorage หรือ l.kcal_burned
            const customKcalMatch =
              String(l.notes || '').match(/\[แคลจริง:\s*([0-9.]+)\]/) ||
              String(l.notes || '').match(/\[custom_kcal:\s*([0-9.]+)\]/)
            let loadedCustomKcal = ''
            if (customKcalMatch) {
              loadedCustomKcal = customKcalMatch[1]
            } else {
              try {
                const localKcal = localStorage.getItem(`custom_kcal_${targetDate}_${l.exercise_name}`)
                if (localKcal) {
                  loadedCustomKcal = localKcal
                } else if (l.kcal_burned && Number(l.kcal_burned) > 0) {
                  loadedCustomKcal = String(l.kcal_burned)
                }
              } catch {}
            }

            return {
              uuid: crypto.randomUUID(),
              name: l.exercise_name,
              muscle: l.muscle_group,
              sub_muscle: l.sub_muscle || l.muscle_group,
              type: l.equipment_type || 'Dumbbell',
              sets: setsCount,
              reps: l.reps || 10,
              weight: l.weight_kg || 0,
              rest_sec: l.rest_sec || 90,
              duration: dur,
              incline: l.incline ?? 0,
              distance_km: dist,
              speed_kmh: calcSpeed,
              kcal_per_unit: findDefaultKcalUnit(l.exercise_name, l.muscle_group),
              custom_kcal: loadedCustomKcal,
              notes: l.notes || '',
              completed_sets: Array.from({ length: setsCount }, (_, idx) => idx + 1)
            }
          })
          setTodayWorkouts(formattedLogs)

          const detectedProg = extractActiveProgramTitle(formattedLogs)
          if (detectedProg) {
            setSelectedProgramsByDate(prev => ({
              ...prev,
              [targetDate]: detectedProg
            }))
          }
        }
      } else {
        setTodayWorkouts([])
      }
    } else {
      setCurrentWorkoutId(null)
      setTodayWorkouts([])
    }
    setIsLoadingDate(false)
  }

  const handleDateChange = async (newDate) => {
    setSelectedDate(newDate)
    if (user) {
      await loadWorkoutForDate(user.id, newDate)
    }
  }

  // สลับแผนในตาราง 7 วัน (ไม่เด้งสร้างการ์ดเองอัตโนมัติ ยกเว้นเลือกเป็นวันพัก)
  const handleSwapDayModule = async (dateIso, newModuleCode) => {
    const updatedOverrides = {
      ...scheduleOverrides,
      [dateIso]: newModuleCode
    }
    setScheduleOverrides(updatedOverrides)

    if (newModuleCode === 'REST') {
      setRestDaysByDate(prev => ({ ...prev, [dateIso]: true }))
      setSelectedProgramsByDate(prev => ({
        ...prev,
        [dateIso]: '🛌 วันพักฟื้นร่างกาย (Rest Day)'
      }))
      if (dateIso === selectedDate) {
        setTodayWorkouts([])
      }
    } else {
      setRestDaysByDate(prev => ({ ...prev, [dateIso]: false }))
    }

    if (user) {
      await supabase
        .from('profiles')
        .update({ schedule_overrides: updatedOverrides })
        .eq('id', user.id)
    }
  }

  const handleResetWeekOverrides = async () => {
    setScheduleOverrides({})
    setSelectedProgramsByDate({})
    setRestDaysByDate({})
    if (user) {
      await supabase
        .from('profiles')
        .update({ schedule_overrides: {} })
        .eq('id', user.id)
    }
  }

  // เปิด/ปิดโหมดวันพักฟื้นร่างกายสำหรับวันที่เลือก
  const handleSetRestDayMode = (enableRest) => {
    setRestDaysByDate(prev => ({ ...prev, [selectedDate]: enableRest }))
    if (enableRest) {
      setSelectedProgramsByDate(prev => ({
        ...prev,
        [selectedDate]: '🛌 วันพักฟื้นร่างกาย (Rest Day)'
      }))
      setTodayWorkouts([])
    } else {
      setSelectedProgramsByDate(prev => {
        const next = { ...prev }
        if (next[selectedDate]?.includes('วันพักฟื้น')) {
          delete next[selectedDate]
        }
        return next
      })
    }
  }

  // บันทึกวันพักฟื้นร่างกายลงปฏิทินและฐานข้อมูล Supabase
  const handleSaveRestDayRecord = async (restNoteText = '') => {
    if (!user) return
    setIsSaving(true)
    try {
      let activeWorkoutId = currentWorkoutId
      if (!activeWorkoutId) {
        const { data: newWorkout, error: workoutError } = await supabase
          .from('workouts')
          .insert([{
            user_id: user.id,
            date: selectedDate,
            status: 'rest_day'
          }])
          .select()
          .single()
        if (workoutError) throw workoutError
        activeWorkoutId = newWorkout.id
        setCurrentWorkoutId(activeWorkoutId)
      } else {
        await supabase
          .from('workout_logs')
          .delete()
          .eq('workout_id', activeWorkoutId)
      }

      const restLogPayload = [
        {
          workout_id: activeWorkoutId,
          exercise_name: '🛌 วันพักฟื้นและซ่อมแซมกล้ามเนื้อ (Active Recovery & Rest Day)',
          muscle_group: 'Rest',
          sub_muscle: 'Full Body Recovery & Sleep',
          equipment_type: 'Bodyweight',
          sets: 1,
          reps: 1,
          weight_kg: 0,
          rpe: 5.0,
          rest_sec: 0,
          duration_mins: 15,
          incline: 0,
          distance_km: 0,
          kcal_burned: 50,
          notes:
            restNoteText ||
            '[โปรแกรม: 🛌 วันพักฟื้นร่างกาย (Rest Day)] พักฟื้นกล้ามเนื้อและระบบประสาท'
        }
      ]

      const { error: logsError } = await supabase
        .from('workout_logs')
        .insert(restLogPayload)
      if (logsError) throw logsError

      setRestDaysByDate(prev => ({ ...prev, [selectedDate]: true }))
      setSelectedProgramsByDate(prev => ({
        ...prev,
        [selectedDate]: '🛌 วันพักฟื้นร่างกาย (Rest Day)'
      }))
      await fetchAllHistoryAndWeeklyStats(user.id)
      alert(`บันทึกวันที่ ${selectedDate} เป็น "🛌 วันพักฟื้นร่างกาย" ลงปฏิทินสำเร็จ!`)
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการบันทึกวันพัก: ' + err.message)
    } finally {
      setIsSaving(false)
    }
  }

  // ล้างการ์ดของวันนี้เพื่อกลับไปหน้าเลือกโหมด
  const handleClearTodayWorkouts = () => {
    setTodayWorkouts([])
    setRestDaysByDate(prev => ({ ...prev, [selectedDate]: false }))
    setSelectedProgramsByDate(prev => {
      const next = { ...prev }
      delete next[selectedDate]
      return next
    })
  }

  // โหมดด่วนพิเศษ: 1) ยืดเหยียด 15 นาที 2) ซ้อมด่วนที่บ้าน 15 นาที 3) คาร์ดิโอเดินชันล้วน
  const handleQuickModeSelect = (modeKey) => {
    setRestDaysByDate(prev => ({ ...prev, [selectedDate]: false }))

    const findEx = (keyword, fallbackMuscle = 'Core') =>
      MASTER_EXERCISE_LIBRARY.find(e => e.name.toLowerCase().includes(keyword.toLowerCase())) ||
      MASTER_EXERCISE_LIBRARY.find(e => e.muscle === fallbackMuscle) ||
      MASTER_EXERCISE_LIBRARY[0]

    if (modeKey === 'mobility') {
      const progTitle = '🧘‍♂️ โหมดยืดเหยียดคลายกล้ามเนื้อ & แก้ออฟฟิศซินโดรม (15 นาที)'
      const mobilityList = [
        { base: findEx('Face Pull', 'Shoulders'), sets: 3, reps: 15, weight: 5 },
        { base: findEx('Hyperextension', 'Back'), sets: 3, reps: 12, weight: 0 },
        { base: findEx('Glute Bridge', 'Legs'), sets: 3, reps: 15, weight: 0 },
        { base: findEx('Plank', 'Core'), sets: 3, reps: 15, weight: 0 }
      ].map(({ base, sets, reps, weight }) => ({
        uuid: crypto.randomUUID(),
        name: base.name,
        muscle: base.muscle,
        sub_muscle: base.sub_muscle || base.muscle,
        type: base.type || 'Bodyweight',
        sets,
        reps,
        weight,
        rest_sec: 45,
        duration: 15,
        incline: 0,
        distance_km: 0,
        speed_kmh: 0,
        kcal_per_unit: 5,
        program_title: progTitle,
        notes: `[โปรแกรม: ${progTitle}] เน้นยืดเหยียดและคลายความตึงตัว`,
        completed_sets: []
      }))

      setSelectedProgramsByDate(prev => ({ ...prev, [selectedDate]: progTitle }))
      setTodayWorkouts(mobilityList)
      return
    }

    if (modeKey === 'express_home') {
      const progTitle = '🏠 โหมดซ้อมด่วนที่บ้าน 15 นาที (บอดี้เวท ไม่ใช้อุปกรณ์)'
      const homeList = [
        { base: findEx('Push-up', 'Chest'), sets: 3, reps: 15 },
        { base: findEx('Bodyweight Squat', 'Legs'), sets: 3, reps: 20 },
        { base: findEx('Walking Lunges', 'Legs'), sets: 3, reps: 14 },
        { base: findEx('Mountain Climber', 'Core'), sets: 3, reps: 20 }
      ].map(({ base, sets, reps }) => ({
        uuid: crypto.randomUUID(),
        name: base.name,
        muscle: base.muscle,
        sub_muscle: base.sub_muscle || base.muscle,
        type: 'Bodyweight',
        sets,
        reps,
        weight: 0,
        rest_sec: 45,
        duration: 15,
        incline: 0,
        distance_km: 0,
        speed_kmh: 0,
        kcal_per_unit: 7,
        program_title: progTitle,
        notes: `[โปรแกรม: ${progTitle}] พักเซ็ตสั้น 45 วินาที`,
        completed_sets: []
      }))

      setSelectedProgramsByDate(prev => ({ ...prev, [selectedDate]: progTitle }))
      setTodayWorkouts(homeList)
      return
    }

    if (modeKey === 'cardio_only') {
      const progTitle = '🏃‍♂️ โหมดคาร์ดิโอเดินชันโซน 2 รีดไขมันล้วน (Pure Cardio)'
      const inclineEx = findEx('Incline Walk', 'Cardio')
      const cardioItem = {
        uuid: crypto.randomUUID(),
        name: inclineEx.name,
        muscle: 'Cardio',
        sub_muscle: inclineEx.sub_muscle || 'Fat Burn Zone 2 & Heart',
        type: 'Cardio',
        sets: 1,
        reps: 1,
        weight: 0,
        rest_sec: 60,
        duration: 35,
        incline: 8.5,
        distance_km: 2.1,
        speed_kmh: 3.6,
        kcal_per_unit: 10,
        program_title: progTitle,
        notes: `[โปรแกรม: ${progTitle}] เดินชันต่อเนื่องโซน 2 รีดไขมัน`,
        completed_sets: []
      }

      setSelectedProgramsByDate(prev => ({ ...prev, [selectedDate]: progTitle }))
      setTodayWorkouts([cardioItem])
      return
    }

    if (modeKey === 'cardio_express') {
      const progTitle = '⏱️ โหมดคาร์ดิโอด่วน 15 นาที (Express Cardio)'
      const inclineEx = findEx('Incline Walk', 'Cardio')
      const cardioItem = {
        uuid: crypto.randomUUID(),
        name: 'Treadmill Incline Walk (เดินชันเร่งด่วน 15 นาที)',
        muscle: 'Cardio',
        sub_muscle: 'Fat Burn Express',
        type: 'Cardio',
        sets: 1,
        reps: 1,
        weight: 0,
        rest_sec: 60,
        duration: 15,
        incline: 8.0,
        distance_km: 0.9,
        speed_kmh: 3.6,
        kcal_per_unit: 8,
        program_title: progTitle,
        notes: `[โปรแกรม: ${progTitle}] เดินชันสั้น 15 นาที เบิร์นไขมันเร่งด่วนในเวลาจำกัด`,
        completed_sets: []
      }

      setSelectedProgramsByDate(prev => ({ ...prev, [selectedDate]: progTitle }))
      setTodayWorkouts([cardioItem])
      return
    }

    if (modeKey === 'light_walk') {
      const progTitle = '🚶‍♂️ โหมดเดินเบาๆ ฟื้นฟูร่างกาย (Active Recovery Walk)'
      const cardioItem = {
        uuid: crypto.randomUUID(),
        name: 'Treadmill Easy Walk (เดินลู่วิ่งฟื้นฟู)',
        muscle: 'Cardio',
        sub_muscle: 'Zero Fatigue & Blood Flow',
        type: 'Cardio',
        sets: 1,
        reps: 1,
        weight: 0,
        rest_sec: 60,
        duration: 20,
        incline: 1.0,
        distance_km: 1.2,
        speed_kmh: 3.6,
        kcal_per_unit: 5,
        program_title: progTitle,
        notes: `[โปรแกรม: ${progTitle}] เดินสบายๆ กระตุ้นการไหลเวียนโลหิต ไม่สะสมความล้า`,
        completed_sets: []
      }

      setSelectedProgramsByDate(prev => ({ ...prev, [selectedDate]: progTitle }))
      setTodayWorkouts([cardioItem])
      return
    }
  }

  const handleAddExercise = (exercise) => {
    setRestDaysByDate(prev => ({ ...prev, [selectedDate]: false }))
    const isBodyweightOrCali = exercise.type === 'Bodyweight' || exercise.type === 'Calisthenics'
    const isInclineWalk = exercise.name.toLowerCase().includes('incline') || exercise.name.includes('เดินชัน')
    const defaultDuration = 25
    const defaultIncline = isInclineWalk ? 8 : 0
    const defaultSpeed = isInclineWalk ? 3.4 : 5.0
    const defaultDist = Number(((defaultDuration / 60) * defaultSpeed).toFixed(2))

    const readiness = evaluateTrainingContinuityAndEffort({
      item: { ...exercise, sets: 4, reps: 10, weight: 0 },
      profile,
      allHistoricalLogs,
      referenceDate: selectedDate
    })

    const activeProg = selectedProgramsByDate[selectedDate] || 'ตารางฝึกเลือกท่าเอง (Custom Session)'
    setSelectedProgramsByDate(prev => ({ ...prev, [selectedDate]: activeProg }))

    const newWorkoutItem = {
      uuid: crypto.randomUUID(),
      name: exercise.name,
      muscle: exercise.muscle,
      sub_muscle: exercise.sub_muscle || exercise.muscle,
      type: exercise.type || 'Dumbbell',
      sets: 4,
      reps: 10,
      weight: exercise.muscle === 'Cardio' || isBodyweightOrCali ? 0 : readiness.expectedWorkingWeight,
      rest_sec: 90,
      duration: defaultDuration,
      incline: defaultIncline,
      distance_km: defaultDist,
      speed_kmh: defaultSpeed,
      kcal_per_unit: exercise.kcal_per_unit || 8,
      video_url: exercise.video_url || '',
      description_th: exercise.description_th || '',
      program_title: activeProg,
      notes: `[โปรแกรม: ${activeProg}]`,
      completed_sets: []
    }
    setTodayWorkouts(prev => [...prev, newWorkoutItem])
  }

  const handleQuickSwapExercise = (uuid) => {
    setTodayWorkouts(prev =>
      prev.map(item => {
        if (item.uuid !== uuid) return item
        return getSmartSwapCandidate({
          currentItem: item,
          currentWorkoutList: prev,
          profile,
          allHistoricalLogs,
          referenceDate: selectedDate
        })
      })
    )
  }

  const handleToggleSetComplete = (uuid, setNumber) => {
    setTodayWorkouts(prev =>
      prev.map(item => {
        if (item.uuid !== uuid) return item
        const currentCompleted = Array.isArray(item.completed_sets) ? item.completed_sets : []
        const isAlreadyDone = currentCompleted.includes(setNumber)

        const nextCompleted = isAlreadyDone
          ? currentCompleted.filter(n => n !== setNumber)
          : [...currentCompleted, setNumber]

        if (!isAlreadyDone) {
          const restSec = parseInt(item.rest_sec) || 90
          const shortName = (item.name || '').split('(')[0].trim()
          handleStartRestTimer(restSec, `${shortName} (จบเซ็ตที่ ${setNumber})`)
          setRestTimerRequest({
            seconds: restSec,
            exerciseName: item.name,
            setNumber,
            timestamp: Date.now()
          })
        }

        return {
          ...item,
          completed_sets: nextCompleted
        }
      })
    )
  }

  // โหลดโปรแกรมจากคลังโปรแกรมพิเศษ / 30 อุทยาน / ตารางมาตรฐาน พร้อมบันทึกชื่อโปรแกรมที่เลือก
  const handleLoadProgramTemplate = (templateItems, programMeta = null) => {
    setRestDaysByDate(prev => ({ ...prev, [selectedDate]: false }))
    const detectedTitle =
      programMeta?.title ||
      extractActiveProgramTitle(templateItems) ||
      'โปรแกรมพิเศษที่เลือก'

    setSelectedProgramsByDate(prev => ({
      ...prev,
      [selectedDate]: detectedTitle
    }))

    const formatted = templateItems.map(item => {
      const dur = parseFloat(item.duration) || 25
      const inc = parseFloat(item.incline) || 0
      const spd = item.speed_kmh || (inc >= 6 ? 3.4 : 5.0)
      const dist = item.distance_km ? Number(item.distance_km) : Number(((dur / 60) * spd).toFixed(2))
      const rawNote = item.notes || ''
      const taggedNote = rawNote.includes('[โปรแกรม:')
        ? rawNote
        : `[โปรแกรม: ${detectedTitle}] ${rawNote}`.trim()

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
        kcal_per_unit: findDefaultKcalUnit(item.name, item.muscle),
        video_url: item.video_url || '',
        program_title: detectedTitle,
        notes: taggedNote,
        completed_sets: []
      }
    })
    setTodayWorkouts(formatted)
    setActiveTab('cards')
  }

  const handleRemoveExercise = (uuid) => {
    setTodayWorkouts(prev => prev.filter(item => item.uuid !== uuid))
  }

  const handleUpdateStats = (uuid, field, value) => {
    setTodayWorkouts(prev =>
      prev.map(item => {
        if (item.uuid !== uuid) return item

        if (field === 'custom_kcal') {
          try {
            localStorage.setItem(`custom_kcal_${selectedDate}_${item.name}`, String(value || ''))
          } catch {}
        }

        const updated = { ...item, [field]: value }

        if (item.muscle === 'Cardio') {
          const dur = parseFloat(field === 'duration' ? value : item.duration) || 0
          const hours = dur / 60

          if (field === 'distance_km' && hours > 0) {
            const dist = parseFloat(value) || 0
            updated.speed_kmh = Number((dist / hours).toFixed(2))
          } else if (field === 'speed_kmh' && hours > 0) {
            const spd = parseFloat(value) || 0
            updated.distance_km = Number((spd * hours).toFixed(2))
          } else if (field === 'duration' && hours > 0) {
            const dist = parseFloat(item.distance_km) || 0
            updated.speed_kmh = Number((dist / hours).toFixed(2))
          }
        }

        return updated
      })
    )
  }

  const calculateItemCalories = (item, autoRpeValue = 8.0) => {
    if (item.custom_kcal !== undefined && item.custom_kcal !== '' && item.custom_kcal !== null) {
      return Math.max(0, Math.round(parseFloat(item.custom_kcal) || 0))
    }

    const userWeight = parseFloat(profile?.weight_kg) || 70
    const userWeightFactor = userWeight / 70

    if (item.muscle === 'Cardio') {
      const cardioResult = analyzeCardioKinematics({
        durationMins: item.duration,
        distanceKm: item.distance_km,
        inclinePercent: item.incline,
        userWeightKg: userWeight,
        notes: item.notes
      })
      return cardioResult.grossSmartwatchKcal
    } else {
      const baseSetKcal = item.muscle === 'Legs' ? 9.5 : item.muscle === 'Back' || item.muscle === 'Chest' ? 8.0 : 6.0
      const sets = parseInt(item.sets) || 0
      const intensityMultiplier = 1 + ((autoRpeValue - 7.5) * 0.06)
      return Math.round(sets * baseSetKcal * userWeightFactor * intensityMultiplier)
    }
  }

  const handleSaveWorkout = async () => {
    if (todayWorkouts.length === 0) return
    setIsSaving(true)

    try {
      let activeWorkoutId = currentWorkoutId

      if (!activeWorkoutId) {
        const { data: newWorkout, error: workoutError } = await supabase
          .from('workouts')
          .insert([{
            user_id: user.id,
            date: selectedDate,
            status: 'completed'
          }])
          .select()
          .single()

        if (workoutError) throw workoutError
        activeWorkoutId = newWorkout.id
        setCurrentWorkoutId(activeWorkoutId)
      } else {
        await supabase
          .from('workout_logs')
          .delete()
          .eq('workout_id', activeWorkoutId)
      }

      const activeProgTitle =
        selectedProgramsByDate[selectedDate] ||
        extractActiveProgramTitle(todayWorkouts)

      const logsToInsert = todayWorkouts.map(item => {
        const effortEval = evaluateTrainingContinuityAndEffort({
          item,
          profile,
          allHistoricalLogs,
          referenceDate: selectedDate
        })
        const estimatedMins = estimateExerciseDurationMins(item)
        const defaultNote =
          item.muscle === 'Cardio'
            ? `Speed ${item.speed_kmh || 0} km/h | Incline ${item.incline}%`
            : `ความหนักประเมิน ${effortEval.intensityPercent}%`
        const rawNote = item.notes || defaultNote

        const hasCustom =
          item.custom_kcal !== undefined &&
          item.custom_kcal !== '' &&
          item.custom_kcal !== null
        const customKcalVal = hasCustom ? String(item.custom_kcal).trim() : ''

        let cleanRawNote = String(rawNote).replace(/\[แคลจริง:[^\]]+\]/g, '').replace(/\[custom_kcal:[^\]]+\]/g, '').trim()
        let finalNote =
          activeProgTitle && !cleanRawNote.includes('[โปรแกรม:')
            ? `[โปรแกรม: ${activeProgTitle}] ${cleanRawNote}`
            : cleanRawNote

        if (customKcalVal) {
          finalNote = `${finalNote} [แคลจริง:${customKcalVal}]`.trim()
          try {
            localStorage.setItem(`custom_kcal_${selectedDate}_${item.name}`, customKcalVal)
          } catch {}
        }

        return {
          workout_id: activeWorkoutId,
          exercise_name: item.name,
          muscle_group: item.muscle,
          sub_muscle: item.sub_muscle,
          equipment_type: item.type,
          sets: parseInt(item.sets) || 0,
          reps: parseInt(item.reps) || 0,
          weight_kg: parseFloat(item.weight) || 0,
          rpe: effortEval.autoRpe,
          rest_sec: parseInt(item.rest_sec) || 90,
          duration_mins: estimatedMins,
          incline: parseFloat(item.incline) || 0,
          distance_km: parseFloat(item.distance_km) || 0,
          kcal_burned: calculateItemCalories(item, effortEval.autoRpe),
          notes: finalNote
        }
      })

      const { error: logsError } = await supabase
        .from('workout_logs')
        .insert(logsToInsert)

      if (logsError) throw logsError

      await fetchAllHistoryAndWeeklyStats(user.id)
      alert(`บันทึกสถิติการฝึกของวันที่ ${selectedDate} สำเร็จ!`)
    } catch (error) {
      alert('เกิดข้อผิดพลาดในการบันทึก: ' + error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteDayRecord = async () => {
    if (!currentWorkoutId) return
    if (!window.confirm(`ยืนยันการลบข้อมูลการฝึกทั้งหมดของวันที่ ${selectedDate} ?`)) return

    setIsSaving(true)
    const { error } = await supabase
      .from('workouts')
      .delete()
      .eq('id', currentWorkoutId)

    if (!error) {
      setCurrentWorkoutId(null)
      setTodayWorkouts([])
      setRestDaysByDate(prev => ({ ...prev, [selectedDate]: false }))
      setSelectedProgramsByDate(prev => {
        const next = { ...prev }
        delete next[selectedDate]
        return next
      })
      await fetchAllHistoryAndWeeklyStats(user.id)
    }
    setIsSaving(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  const bioMetrics = calculateScientificBiometrics(profile)

  const adaptiveWeeklyPlan = generateAdaptiveWeeklySchedule({
    profile,
    selectedDate,
    todayWorkouts,
    allHistoricalLogs,
    scheduleOverrides
  })

  const activeDayPlanObj = adaptiveWeeklyPlan.days.find(d => d.iso === selectedDate) || adaptiveWeeklyPlan.days[0]
  const yesterdayReport = adaptiveWeeklyPlan.yesterdayReport

  // Helper ดึงชื่อโปรแกรมที่เลือกจริงของแต่ละวัน (ถ้ายังไม่ได้เลือก จะคืนค่าว่าง ไม่ยัดเยียดชื่อโปรแกรมเอง)
  const getProgramTitleForDate = (dateIso) => {
    if (restDaysByDate[dateIso]) return '🛌 วันพักฟื้นร่างกาย (Rest Day)'
    if (selectedProgramsByDate[dateIso]) return selectedProgramsByDate[dateIso]
    if (dateIso === selectedDate && todayWorkouts.length > 0) {
      const fromToday = extractActiveProgramTitle(todayWorkouts)
      if (fromToday) return fromToday
    }
    const logsForDate = allHistoricalLogs.filter(l => l.date === dateIso)
    if (logsForDate.length > 0) {
      if (logsForDate.some(l => l.muscle_group === 'Rest')) {
        return '🛌 วันพักฟื้นร่างกาย (Rest Day)'
      }
      const fromHistory = extractActiveProgramTitle(logsForDate)
      if (fromHistory) return fromHistory
    }
    return ''
  }

  const currentSelectedProgramTitle = getProgramTitleForDate(selectedDate)
  const isCurrentDateRestMode =
    Boolean(restDaysByDate[selectedDate]) ||
    currentSelectedProgramTitle.includes('วันพักฟื้นร่างกาย')

  const dailyMetrics = todayWorkouts.reduce(
    (acc, item) => {
      const effortEval = evaluateTrainingContinuityAndEffort({
        item,
        profile,
        allHistoricalLogs,
        referenceDate: selectedDate
      })
      const loadMeta = getEquipmentLoadMeta(item)
      const itemKcal = calculateItemCalories(item, effortEval.autoRpe)
      const itemMins = estimateExerciseDurationMins(item)

      if (item.muscle === 'Cardio') {
        const dist = parseFloat(item.distance_km) || 0
        return {
          ...acc,
          cardioMins: acc.cardioMins + itemMins,
          totalWorkoutMins: acc.totalWorkoutMins + itemMins,
          cardioDist: acc.cardioDist + dist,
          totalCalories: acc.totalCalories + itemKcal
        }
      }

      const s = parseInt(item.sets) || 0
      const r = parseInt(item.reps) || 0
      const w = parseFloat(item.weight) || 0
      const effectiveTotalWeight = w * loadMeta.bilateralMultiplier
      const vol = s * r * effectiveTotalWeight
      const doneCount = Array.isArray(item.completed_sets) ? item.completed_sets.length : 0

      return {
        ...acc,
        totalVolume: acc.totalVolume + vol,
        totalSets: acc.totalSets + s,
        completedSetsCount: acc.completedSetsCount + doneCount,
        totalReps: acc.totalReps + (s * r),
        strengthMins: acc.strengthMins + itemMins,
        totalWorkoutMins: acc.totalWorkoutMins + itemMins,
        intensitySum: acc.intensitySum + effortEval.intensityPercent,
        strengthCount: acc.strengthCount + 1,
        totalCalories: acc.totalCalories + itemKcal
      }
    },
    {
      totalVolume: 0,
      totalSets: 0,
      completedSetsCount: 0,
      totalReps: 0,
      strengthMins: 0,
      cardioMins: 0,
      totalWorkoutMins: 0,
      cardioDist: 0,
      intensitySum: 0,
      strengthCount: 0,
      totalCalories: 0
    }
  )

  const avgCardioSpeed = dailyMetrics.cardioMins > 0
    ? (dailyMetrics.cardioDist / (dailyMetrics.cardioMins / 60)).toFixed(2)
    : '0.00'

  const avgIntensityPercent = dailyMetrics.strengthCount > 0
    ? Math.round(dailyMetrics.intensitySum / dailyMetrics.strengthCount)
    : 0

  const muscleActivationMatrix = MUSCLE_TARGETS.map(target => {
    const scaledOptimal = Math.max(6, Math.round(target.optimalSets * bioMetrics.volumeScale))

    const setsFromDB = weeklyLogs
      .filter(l => l.muscle_group === target.group && l.workout_id !== currentWorkoutId)
      .reduce((sum, l) => sum + (parseInt(l.sets) || 0), 0)

    const setsFromCurrentScreen = todayWorkouts
      .filter(w => w.muscle === target.group)
      .reduce((sum, w) => sum + (parseInt(w.sets) || 0), 0)

    const totalWeeklySets = setsFromDB + setsFromCurrentScreen
    const ratio = Math.min(100, Math.round((totalWeeklySets / scaledOptimal) * 100))

    let statusText = 'Recovery / Untrained'
    let badgeColor = 'bg-slate-100 text-slate-600 border-slate-200'
    let barColor = 'bg-slate-400'

    if (ratio >= 100) {
      statusText = 'High Fatigue (ควรพัก 48 ชม.)'
      badgeColor = 'bg-rose-50 text-rose-700 border-rose-200'
      barColor = 'bg-rose-600'
    } else if (ratio >= 50) {
      statusText = 'Optimal Hypertrophy Zone'
      badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200'
      barColor = 'bg-emerald-600'
    } else if (ratio > 0) {
      statusText = 'Light Stimulus (กระตุ้นเริ่มต้น)'
      badgeColor = 'bg-amber-50 text-amber-700 border-amber-200'
      barColor = 'bg-amber-500'
    }

    return {
      ...target,
      optimalSets: scaledOptimal,
      totalWeeklySets,
      ratio,
      statusText,
      badgeColor,
      barColor
    }
  })

  // =====================================================================
  // คำนวณระดับความแข็งแรงของร่างกาย (Body Strength & Conditioning Rank)
  // =====================================================================
  const bodyStrengthStatus = (() => {
    const baseLevelScore =
      profile?.fitness_level === 'Advanced'
        ? 30
        : profile?.fitness_level === 'Intermediate'
          ? 20
          : 12

    // นับจำนวนวันที่เคยบันทึกการออกกำลังกายจริงทั้งหมด (Unique Training Days)
    const distinctDates = new Set(
      allHistoricalLogs.map(l => l.date).filter(Boolean)
    )
    if (dailyMetrics.totalSets > 0 || dailyMetrics.cardioMins > 0) {
      distinctDates.add(selectedDate)
    }

    // โบนัสความสม่ำเสมอ: วันละ 1.5 คะแนน (สะสม 20 วันได้เต็ม 30 คะแนน)
    const consistencyBonus = Math.min(30, Math.round(distinctDates.size * 1.5))

    // โบนัสปริมาณงานสะสมตลอดชีพ: ทุก 30 เซ็ตได้ 1 คะแนน (สะสม 600 เซ็ตได้เต็ม 20 คะแนน)
    const lifetimeSetsCount =
      allHistoricalLogs.reduce((sum, l) => sum + (parseInt(l.sets) || 0), 0) +
      dailyMetrics.totalSets
    const experienceBonus = Math.min(20, Math.round(lifetimeSetsCount / 30))

    // โบนัสความสมดุลกล้ามเนื้อในสัปดาห์นี้ สูงสุด 20 คะแนน
    const weeklyMuscleAvgRatio =
      muscleActivationMatrix.reduce((sum, m) => sum + m.ratio, 0) /
      Math.max(1, muscleActivationMatrix.length)
    const weeklyConditioningBonus = Math.min(20, Math.round((weeklyMuscleAvgRatio / 100) * 20))

    const score = Math.min(
      100,
      Math.max(10, baseLevelScore + consistencyBonus + experienceBonus + weeklyConditioningBonus)
    )

    if (score >= 90) {
      return {
        level: 5,
        title: 'Lv.5 ตำนานคนเมืองตามป่า',
        subLabel: 'Apex Ranger',
        score,
        icon: '👑',
        badgeClass: 'bg-amber-400/20 text-amber-200 border-amber-400/60',
        barClass: 'from-amber-400 to-emerald-400'
      }
    }
    if (score >= 75) {
      return {
        level: 4,
        title: 'Lv.4 จอมพลังพิชิตยอดดอย',
        subLabel: 'Summit Athlete',
        score,
        icon: '🦁',
        badgeClass: 'bg-emerald-400/20 text-emerald-200 border-emerald-400/60',
        barClass: 'from-emerald-400 to-teal-300'
      }
    }
    if (score >= 55) {
      return {
        level: 3,
        title: 'Lv.3 นักไต่สันเขาแข็งแกร่ง',
        subLabel: 'Ridge Climber',
        score,
        icon: '⛰️',
        badgeClass: 'bg-teal-400/20 text-teal-200 border-teal-400/60',
        barClass: 'from-teal-400 to-emerald-400'
      }
    }
    if (score >= 35) {
      return {
        level: 2,
        title: 'Lv.2 นักเดินป่าร่างแกร่ง',
        subLabel: 'Trail Fit',
        score,
        icon: '🦌',
        badgeClass: 'bg-sky-400/20 text-sky-200 border-sky-400/60',
        barClass: 'from-sky-400 to-teal-400'
      }
    }
    return {
      level: 1,
      title: 'Lv.1 นักสำรวจฝึกหัด',
      subLabel: 'Novice Explorer',
      score,
      icon: '🌱',
      badgeClass: 'bg-stone-500/30 text-stone-200 border-stone-400/50',
      barClass: 'from-amber-400 to-lime-400'
    }
  })()

  const canAccessTrainerConsole =
    profile?.role === 'master' || profile?.role === 'trainer'

  const userDisplayName = profile?.display_name || (user?.email ? user.email.split('@')[0] : 'นักสำรวจ')
  const userTeamName = profile?.team_name || 'ทีมขนุน'
  const userTeamColor = profile?.team_color || 'emerald'
  const userTeamIcon = profile?.team_icon || '🌲⚡'

  // ย่อชื่อเมนูให้กระชับสำหรับ Mobile & Top Bar (ไม่โดนตัดเป็น ...)
  const navigationTabsList = [
    {
      id: 'cards',
      icon: '✨',
      shortTitle: 'การ์ดฝึก',
      title: 'การ์ดฝึกประจำวัน (Daily Hero Cards)'
    },
    {
      id: 'expedition',
      icon: '🏔️',
      shortTitle: 'เดินป่า',
      title: 'ประเมินความพร้อมเดินป่า 30 อุทยาน'
    },
    {
      id: 'academic',
      icon: '🌿',
      shortTitle: 'ตำราป่า',
      title: 'ตำราวนศาสตร์ รุกขวิทยา & เกมภาคสนาม'
    },
    {
      id: 'schedule',
      icon: '🗓️',
      shortTitle: 'จัดตาราง',
      title: 'จัดตาราง 7 วัน & บันทึกย้อนหลัง'
    },
    {
      id: 'analytics',
      icon: '📊',
      shortTitle: 'กราฟ',
      title: 'กราฟเรดาร์ & วิเคราะห์สรีระ 3D'
    },
    {
      id: 'nutrition',
      icon: '🥗',
      shortTitle: 'โภชนา',
      title: 'โภชนาการ เมนูอาหาร & ส่งออก Excel'
    }
  ]

  const activeTabObj = navigationTabsList.find(t => t.id === activeTab) || navigationTabsList[0]

  if (!user) return <div className="flex items-center justify-center h-screen text-slate-500">กำลังโหลดระบบวิเคราะห์ข้อมูล...</div>

  return (
        <div className="min-h-screen pb-28 bg-stone-100 text-slate-800">

      {/* แถบด้านบนแบบกะทัดรัด: เลื่อนลงบนมือถือจะเหลือแค่ชื่อ ทีม และความแข็งแรง */}
      <nav className="sticky top-0 z-40 bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 text-white shadow-md">
        <div
          className={`max-w-7xl mx-auto px-3 sm:px-6 transition-all duration-200 ${
            isHeaderCompact ? 'py-1.5 sm:py-2' : 'py-2 sm:py-2.5'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            {/* ซ้าย: ชื่อ + ทีม + ความแข็งแรง (แสดงตลอด) */}
            <div className="flex items-center gap-2 min-w-0">
              <div
                className={`flex items-center justify-center font-black text-emerald-950 bg-emerald-400 rounded-lg shrink-0 transition-all ${
                  isHeaderCompact ? 'w-7 h-7 text-sm' : 'w-8 h-8 text-base'
                }`}
              >
                🌲
              </div>

              <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                <h1 className="text-sm sm:text-base font-extrabold text-white truncate max-w-[9rem] sm:max-w-none">
                  {userDisplayName}
                </h1>
                <span
                  className={`px-2 py-0.5 text-xs font-black border rounded-full whitespace-nowrap ${getTeamBadgeClasses(userTeamColor)}`}
                >
                  {userTeamName} {userTeamIcon}
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-black whitespace-nowrap ${bodyStrengthStatus.badgeClass}`}
                  title={bodyStrengthStatus.title}
                >
                  <span>{bodyStrengthStatus.icon}</span>
                  {/* มือถือแสดงแค่ Lv. / คอมแสดงชื่อระดับเต็ม */}
                  <span className="sm:hidden">Lv.{bodyStrengthStatus.level}</span>
                  <span className="hidden sm:inline">{bodyStrengthStatus.title}</span>
                  <span className="px-1.5 bg-black/30 rounded-full text-white">
                    {bodyStrengthStatus.score}%
                  </span>
                </span>
              </div>
            </div>

            {/* ขวา: ปุ่มต่างๆ (บนมือถือจะซ่อนเมื่อเลื่อนลง) */}
            <div
              className={`items-center gap-1.5 shrink-0 ${
                isHeaderCompact ? 'hidden sm:flex' : 'flex'
              }`}
            >
              {canAccessTrainerConsole && (
                <button
                  type="button"
                  onClick={() => navigate('/trainer')}
                  className="px-2.5 py-1.5 text-xs font-extrabold text-slate-950 bg-amber-400 rounded-lg hover:bg-amber-300"
                >
                  👑 <span className="hidden sm:inline">Trainer</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => navigate('/profile')}
                className="px-2.5 py-1.5 text-xs font-bold text-slate-100 bg-slate-800 border border-slate-600 rounded-lg hover:bg-slate-700"
                title="ตั้งค่าสรีระ"
              >
                ⚙️ <span className="hidden sm:inline">ตั้งค่า</span>
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="px-2.5 py-1.5 text-xs font-bold text-white bg-rose-600 rounded-lg hover:bg-rose-700"
              >
                ออก
              </button>
            </div>
          </div>

          {/* บรรทัดที่ 2: วันที่ + โหมดวันนี้ (บนมือถือจะซ่อนเมื่อเลื่อนลง) */}
          <div
            className={`text-xs text-emerald-200/90 mt-1 truncate ${
              isHeaderCompact ? 'hidden sm:block' : 'block'
            }`}
          >
            {activeDayPlanObj?.dayNameFull} {selectedDate} •{' '}
            {currentSelectedProgramTitle ? (
              <strong className="text-amber-300">🎯 {currentSelectedProgramTitle}</strong>
            ) : (
              <span className="text-emerald-300">แนะนำวันนี้: {activeDayPlanObj?.module?.title}</span>
            )}
          </div>
        </div>
      </nav>
      
      <div className="px-4 sm:px-6 pt-6 mx-auto max-w-7xl space-y-6">
        {/* แถบแจ้งเตือนสำหรับผู้ใช้ใหม่ที่ยังไม่ได้บันทึกชื่อโปรไฟล์เริ่มต้น */}
        {profile && (!profile.schedule_overrides?._onboarded || !profile.display_name || profile.display_name === 'นักสำรวจ' || profile.display_name.trim() === '') && (
          <div className="p-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-2xl shadow-md flex flex-wrap items-center justify-between gap-3 animate-pulse">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <h4 className="text-sm font-black">ยังไม่ได้ตั้งค่าโปรไฟล์เริ่มต้น</h4>
                <p className="text-xs text-amber-100">
                  กรุณาระบุชื่อของคุณและบันทึกข้อมูลสรีระ เพื่อให้ระบบคำนวณน้ำหนักและจัดตารางฝึกให้ถูกต้อง
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/profile?onboarding=true')}
              className="px-4 py-2 text-xs font-black bg-white text-slate-900 rounded-xl hover:bg-amber-100 transition shadow-sm"
            >
              ⚙️ ตั้งค่าโปรไฟล์ตอนนี้ →
            </button>
          </div>
        )}

        {/* แถบแจ้งเตือนสถานะคำขอเข้าร่วมทีม */}
        {profile?.schedule_overrides?._team_request?.status === 'pending' && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs flex flex-wrap items-center justify-between gap-2">
            <span className="font-extrabold text-amber-900 flex items-center gap-1.5">
              <span>⏳</span> กำลังรอเทรนเนอร์อนุมัติคำขอเข้าร่วมทีม: &quot;{profile.schedule_overrides._team_request.team_name}&quot;
            </span>
            <button
              type="button"
              onClick={() => navigate('/profile')}
              className="text-[11px] font-extrabold text-amber-800 underline"
            >
              ดูรายละเอียดในตั้งค่า
            </button>
          </div>
        )}

        {/* แถบสรุป KPI ประจำวัน (แสดงเฉพาะหน้า 'การ์ดฝึก' และ 'กราฟ') */}
        {(activeTab === 'cards' || activeTab === 'analytics') && (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            <div className="p-4 bg-white border border-stone-200 rounded-2xl shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase">เวลาฝึกรวมวันนี้</span>
              <div className="mt-1 text-2xl font-black text-indigo-700">
                ⏱️ {dailyMetrics.totalWorkoutMins} <span className="text-xs font-normal text-slate-500">นาที</span>
              </div>
              <p className="mt-0.5 text-[11px] text-slate-500">
                เวท {dailyMetrics.strengthMins} น. + คาร์ดิโอ {dailyMetrics.cardioMins} น.
              </p>
            </div>

            <div className="p-4 bg-white border border-stone-200 rounded-2xl shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase">ปริมาณงาน (Volume)</span>
              <div className="mt-1 text-2xl font-black text-slate-900">
                {dailyMetrics.totalVolume.toLocaleString()} <span className="text-xs font-normal text-slate-500">kg</span>
              </div>
              <p className="mt-0.5 text-[11px] text-emerald-700 font-semibold">
                เช็กแล้ว {dailyMetrics.completedSetsCount}/{dailyMetrics.totalSets} เซ็ต
              </p>
            </div>

            <div className="p-4 bg-white border border-stone-200 rounded-2xl shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase">พลังงานที่เผาผลาญ</span>
              <div className="mt-1 text-2xl font-black text-orange-600">
                🔥 {dailyMetrics.totalCalories.toLocaleString()} <span className="text-xs font-normal text-slate-500">kcal</span>
              </div>
              <p className="mt-0.5 text-[11px] text-slate-500">ปรับตามสมาร์ทวอทช์ได้</p>
            </div>

            <div className="p-4 bg-white border border-stone-200 rounded-2xl shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase">ระยะทาง & ความเร็ว</span>
              <div className="mt-1 text-2xl font-black text-sky-700">
                {dailyMetrics.cardioDist.toFixed(2)} <span className="text-xs font-normal text-slate-500">km</span>
              </div>
              <p className="mt-0.5 text-[11px] text-slate-500">
                เฉลี่ย <strong className="text-sky-800">{avgCardioSpeed} km/h</strong>
              </p>
            </div>

            <div className="p-4 bg-white border border-stone-200 rounded-2xl shadow-xs col-span-2 md:col-span-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase">โหมด / ความหนักวันนี้</span>
              <div className="mt-1 text-xl font-black text-emerald-700">
                {isCurrentDateRestMode
                  ? '🛌 วันพักฟื้น'
                  : avgIntensityPercent > 0
                    ? `⚡ ${avgIntensityPercent}%`
                    : todayWorkouts.length > 0
                      ? '🏃‍♂️ Cardio Mode'
                      : '⏳ รอเลือกโหมด'}
              </div>
              <p
                className="mt-0.5 text-[11px] text-slate-500 truncate"
                title={currentSelectedProgramTitle || 'ยังไม่ได้เลือกโปรแกรมสำหรับวันนี้'}
              >
                {currentSelectedProgramTitle ? (
                  <span>🎯 <strong>{currentSelectedProgramTitle}</strong></span>
                ) : (
                  <span>คลิกเลือกโหมดด้านล่างได้เลย</span>
                )}
              </p>
            </div>
          </div>
        )}

        {/* แถบสรุปสำหรับหน้าโภชนาการ: แสดง พลังงานที่ต้องเผาผลาญ (Energy Target & Calorie Deficit/Surplus) */}
        {activeTab === 'nutrition' && (() => {
          const nutritionCalc = calculateDailyMacrosAndHydration(
            profile,
            bioMetrics,
            dailyMetrics.totalCalories,
            dailyMetrics.totalWorkoutMins
          )
          return (
            <div className="p-4 sm:p-5 bg-gradient-to-r from-orange-950/90 via-slate-900 to-amber-950/90 border-2 border-orange-500/50 rounded-2xl shadow-md text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 text-[10px] font-black text-slate-950 bg-amber-400 rounded-md">
                    NUTRITION ENERGY TARGET
                  </span>
                  <span className="text-xs text-orange-200 font-bold">
                    เป้าหมายการเผาผลาญ & รับประทานวันนี้
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-white">
                  🔥 พลังงานที่ต้องเผาผลาญ: <span className="text-amber-300">{nutritionCalc.dynamicTargetKcal.toLocaleString()} kcal</span>
                </h3>
                <p className="text-xs text-slate-300">
                  คำนวณจาก BMR ({bioMetrics.bmr} kcal) + เผาผลาญจากการออกกำลังกายวันนี้ ({dailyMetrics.totalCalories.toLocaleString()} kcal)
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 bg-slate-950/80 px-4 py-3 rounded-xl border border-orange-500/30 shrink-0">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">เผาผลาญจริงวันนี้</span>
                  <div className="text-xl font-black text-orange-400">
                    🔥 {dailyMetrics.totalCalories.toLocaleString()} <span className="text-xs font-normal text-slate-400">kcal</span>
                  </div>
                </div>
                <div className="border-l border-slate-700 pl-3 space-y-0.5 text-xs font-bold text-slate-300">
                  <div>🥩 โปรตีนเป้าหมาย: <strong className="text-emerald-400">{nutritionCalc.proteinGrams}g</strong></div>
                  <div>🍚 คาร์โบไฮเดรต: <strong className="text-amber-300">{nutritionCalc.carbGrams}g</strong></div>
                  <div>🥑 ไขมันดี: <strong className="text-rose-300">{nutritionCalc.fatGrams}g</strong></div>
                </div>
              </div>
            </div>
          )
        })()}

        {/* =====================================================================
            TAB 1: การ์ดแนะนำท่าเล่นประจำวัน (DAILY HERO FLASHCARDS & REST HUB)
           ===================================================================== */}
        {activeTab === 'cards' && (
          <div className="space-y-6">
            <LiveGymToolbar
              restTimerRequest={restTimerRequest}
              onClearRestRequest={() => setRestTimerRequest(null)}
              profile={profile}
              bioMetrics={bioMetrics}
              dailyMetrics={dailyMetrics}
              restTimer={restTimer}
              onStartManualTimer={handleStartRestTimer}
              onAdjustTimer={handleAdjustRestTimer}
              onStopTimer={handleStopRestTimer}
            />

            {isLoadingDate ? (
              <div className="py-20 text-center bg-white rounded-3xl border border-slate-200 text-slate-400">
                กำลังโหลดข้อมูลประจำวันที่ {selectedDate}...
              </div>
            ) : (
              <DailyHeroCards
                todayWorkouts={todayWorkouts}
                profile={profile}
                allHistoricalLogs={allHistoricalLogs}
                selectedDate={selectedDate}
                calendarDays={calendarDays}
                onSelectDate={handleDateChange}
                activeDayPlanObj={activeDayPlanObj}
                selectedProgramTitle={currentSelectedProgramTitle}
                isRestDayMode={isCurrentDateRestMode}
                onSetRestDayMode={handleSetRestDayMode}
                onSaveRestDayRecord={handleSaveRestDayRecord}
                onQuickModeSelect={handleQuickModeSelect}
                onClearTodayWorkouts={handleClearTodayWorkouts}
                onGenerateRecommended={() => {
                  setRestDaysByDate(prev => ({ ...prev, [selectedDate]: false }))
                  const defaultTitle = activeDayPlanObj?.module?.title || 'แผนแนะนำประจำวัน'
                  const generated = generateWorkoutItemsForModule(
                    activeDayPlanObj.module.code,
                    profile,
                    allHistoricalLogs,
                    selectedDate
                  )
                  setSelectedProgramsByDate(prev => ({
                    ...prev,
                    [selectedDate]: defaultTitle
                  }))
                  setTodayWorkouts(
                    generated.map(item => ({
                      ...item,
                      program_title: defaultTitle,
                      completed_sets: []
                    }))
                  )
                }}
                onOpenExerciseModal={() => setIsModalOpen(true)}
                onOpenPresetModal={() => setIsPresetModalOpen(true)}
                onUpdateStats={handleUpdateStats}
                onQuickSwap={handleQuickSwapExercise}
                onToggleSetComplete={handleToggleSetComplete}
                onRemoveExercise={handleRemoveExercise}
                onSaveWorkout={handleSaveWorkout}
                isSaving={isSaving}
                currentWorkoutId={currentWorkoutId}
                calculateItemCalories={calculateItemCalories}
              />
            )}
          </div>
        )}

        {/* =====================================================================
            TAB 2: ประเมินความพร้อมเดินป่า 30 อุทยาน & คู่มือการเดินทางจากกรุงเทพฯ
           ===================================================================== */}
        {activeTab === 'expedition' && (
          <TrailReadinessModal
            isOpen={true}
            isEmbedded={true}
            profile={profile}
            allHistoricalLogs={allHistoricalLogs}
            onSelectTrailProgram={handleLoadProgramTemplate}
          />
        )}

        {/* =====================================================================
            TAB 3: ตำราวนศาสตร์ รุกขวิทยา (Dendrology) สัตว์ป่า & เกมสำรวจภาคสนาม
           ===================================================================== */}
        {activeTab === 'academic' && (
          <ForestryAcademicHub />
        )}

        {/* =====================================================================
            TAB 4: จัดตารางภาพรวม 7 วัน & บันทึกย้อนหลัง 14 วัน
           ===================================================================== */}
        {activeTab === 'schedule' && (
          <div className="space-y-6">
            <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4 pb-4 mb-4 border-b border-slate-100">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 text-[11px] font-extrabold text-white bg-emerald-700 rounded">
                      MASTER WEEKLY SPLIT
                    </span>
                    <h2 className="text-base font-bold text-slate-900">{adaptiveWeeklyPlan.splitName}</h2>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {adaptiveWeeklyPlan.splitDescription} • แสดงชื่อโปรแกรมพิเศษ/อุทยาน/ตารางมาตรฐาน หรือวันพักที่คุณเลือกไว้ในแต่ละวัน
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPresetModalOpen(true)}
                    className="px-3.5 py-1.5 text-xs font-extrabold text-emerald-900 bg-emerald-100 border border-emerald-300 rounded-xl hover:bg-emerald-200"
                  >
                    🏔️ เลือกโปรแกรมพิเศษลงวันที่ {selectedDate}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleSetRestDayMode(true)
                      setActiveTab('cards')
                    }}
                    className="px-3.5 py-1.5 text-xs font-extrabold text-amber-950 bg-amber-100 border border-amber-300 rounded-xl hover:bg-amber-200"
                  >
                    🛌 ตั้งวันที่ {selectedDate} เป็นวันพัก
                  </button>
                  {(Object.keys(scheduleOverrides).length > 0 || Object.keys(selectedProgramsByDate).length > 0) && (
                    <button
                      type="button"
                      onClick={handleResetWeekOverrides}
                      className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 border border-slate-300 rounded-xl hover:bg-slate-200"
                    >
                      รีเซ็ตการสลับวันกลับค่าเริ่มต้น
                    </button>
                  )}
                  {currentWorkoutId && (
                    <button
                      type="button"
                      onClick={handleDeleteDayRecord}
                      disabled={isSaving}
                      className="px-3.5 py-1.5 text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl hover:bg-rose-100"
                    >
                      ลบประวัติของวันที่ {selectedDate}
                    </button>
                  )}
                </div>
              </div>

              {/* แบนเนอร์แสดงโปรแกรมที่เลือกไว้สำหรับวันที่กำลังโฟกัสอยู่ในหน้าตาราง */}
              {currentSelectedProgramTitle && (
                <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 mb-4 bg-amber-50 border border-amber-300 rounded-2xl">
                  <div className="text-xs text-slate-900">
                    <span className="px-2 py-0.5 mr-2 text-[10px] font-black text-slate-950 bg-amber-400 rounded">
                      SELECTED MODE
                    </span>
                    <strong>โหมด/โปรแกรมที่เลือกในวันที่ {selectedDate}:</strong>{' '}
                    <span className="font-black text-emerald-900">{currentSelectedProgramTitle}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('cards')}
                    className="px-3 py-1 text-xs font-black text-white bg-slate-900 rounded-lg hover:bg-emerald-700"
                  >
                    เปิดดูหน้าการ์ดของวันนี้ →
                  </button>
                </div>
              )}

              {yesterdayReport?.hasLogs && (
                <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 mb-4 bg-emerald-50/90 border border-emerald-300 rounded-2xl">
                  <div className="text-xs text-slate-800">
                    <span className="px-2 py-0.5 mr-2 text-[10px] font-extrabold text-white bg-emerald-700 rounded">
                      ADAPTIVE AI SYNC
                    </span>
                    <strong>บันทึกเมื่อวาน ({yesterdayReport.yesterdayIso}):</strong> ฝึกกล้ามเนื้อ{' '}
                    <strong className="text-emerald-800">{yesterdayReport.trainedMuscles.join(', ')}</strong>{' '}
                    → แผนแนะนำวันนี้ถูกปรับเป็น{' '}
                    <strong className="underline text-slate-900">{yesterdayReport.todayRecommendedTitle}</strong>{' '}
                    <span className="text-slate-600">({yesterdayReport.adaptationReason})</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
                {adaptiveWeeklyPlan.days.map((d) => {
                  const isSelected = d.iso === selectedDate
                  const isToday = d.iso === todayStr
                  const dayCustomProgram = getProgramTitleForDate(d.iso)

                  return (
                    <div
                      key={d.iso}
                      onClick={() => {
                        handleDateChange(d.iso)
                        setActiveTab('cards')
                      }}
                      className={`flex flex-col justify-between p-3.5 rounded-2xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-slate-900 text-white border-slate-900 ring-2 ring-emerald-500'
                          : d.hasSavedLogs
                            ? 'bg-emerald-50/50 border-emerald-300 text-slate-800 hover:bg-emerald-50'
                            : 'bg-slate-50/80 border-slate-200 text-slate-800 hover:bg-white hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`text-xs font-extrabold ${isSelected ? 'text-emerald-400' : 'text-slate-700'}`}>
                            {d.dayNameFull} ({d.dayNum})
                          </span>
                          {isToday ? (
                            <span className="px-1.5 py-0.5 text-[9px] font-black uppercase bg-sky-500 text-white rounded">
                              วันนี้
                            </span>
                          ) : d.hasSavedLogs ? (
                            <span className="px-1.5 py-0.5 text-[9px] font-black uppercase bg-emerald-600 text-white rounded">
                              บันทึกแล้ว
                            </span>
                          ) : null}
                        </div>

                        <div className={`px-2 py-1 text-[11px] font-bold border rounded-lg mb-2 ${d.module?.badge || 'bg-slate-100 text-slate-700'}`}>
                          แนะนำ: {d.module?.title}
                        </div>

                        {/* แสดงป้ายชื่อโปรแกรมหรือโหมดวันพักที่เลือกจริงในวันนั้นๆ */}
                        {dayCustomProgram && (
                          <div
                            className={`p-2 mb-2 rounded-lg border text-[10px] font-black leading-snug ${
                              isSelected
                                ? 'bg-amber-400/20 text-amber-300 border-amber-400/50'
                                : 'bg-amber-50 text-amber-950 border-amber-300'
                            }`}
                          >
                            🎯 เลือกแล้ว: {dayCustomProgram}
                          </div>
                        )}

                        {(d.isShifted || d.hasSavedLogs || d.isUnloggedPast) && (
                          <div className={`text-[10px] font-semibold mb-2 ${
                            isSelected ? 'text-amber-300' : d.isShifted ? 'text-amber-700' : 'text-slate-500'
                          }`}>
                            {d.isShifted ? '🔄 ' : '• '}{d.statusReason}
                          </div>
                        )}
                      </div>

                      <div className="pt-2 mt-2 border-t border-slate-200/40" onClick={(e) => e.stopPropagation()}>
                        <label className={`block text-[9px] font-bold mb-1 ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                          สลับแผนแนะนำวันนี้:
                        </label>
                        <select
                          value={d.module?.code || 'CHEST_TRI'}
                          onChange={(e) => handleSwapDayModule(d.iso, e.target.value)}
                          className={`w-full px-1.5 py-1 text-[10px] font-bold rounded border outline-none ${
                            isSelected
                              ? 'bg-slate-800 text-white border-slate-700'
                              : 'bg-white text-slate-700 border-slate-300'
                          }`}
                        >
                          {SESSION_MODULES_CATALOG.map(opt => (
                            <option key={opt.code} value={opt.code}>{opt.title}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 14-DAY BACKFILL CALENDAR */}
            <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">ปฏิทินบันทึกย้อนหลัง 14 วัน (Historical Backfill)</h2>
                  <p className="text-xs text-slate-500">คลิกเลือกวันที่ต้องการคีย์ข้อมูลย้อนหลัง ระบบจะพาไปยังหน้าการ์ดฝึกของวันนั้นทันที</p>
                </div>

                <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                  <label className="text-xs font-bold text-slate-700">เลือกวันที่:</label>
                  <input 
                    type="date" 
                    value={selectedDate}
                    max={todayStr}
                    onChange={(e) => {
                      handleDateChange(e.target.value)
                      setActiveTab('cards')
                    }}
                    className="px-2 py-1 text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-7 gap-2 sm:grid-cols-14">
                {calendarDays.map((day) => {
                  const isSaved = Boolean(allWorkoutsMap[day.date])
                  const isSelected = day.date === selectedDate
                  const isToday = day.date === todayStr

                  return (
                    <button
                      key={day.date}
                      type="button"
                      onClick={() => {
                        handleDateChange(day.date)
                        setActiveTab('cards')
                      }}
                      className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-xl border text-center transition-all ${
                        isSelected
                          ? 'bg-slate-900 text-white border-slate-900 ring-2 ring-emerald-500'
                          : isSaved
                            ? 'bg-emerald-50/80 border-emerald-300 text-emerald-900 hover:bg-emerald-100'
                            : isToday
                              ? 'bg-sky-50 border-sky-300 text-sky-900'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <span className={`text-[10px] font-semibold ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                        {day.dayName}
                      </span>
                      <span className="text-sm font-extrabold leading-tight my-0.5">{day.dayNum}</span>
                      <div className="mt-0.5 h-2 flex items-center justify-center">
                        {isSaved && (
                          <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-emerald-400' : 'bg-emerald-600'}`}></span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            TAB 5: กราฟเรดาร์ 6 เหลี่ยม & วิเคราะห์สรีระ 3D (EXECUTIVE ANALYTICS)
           ===================================================================== */}
        {activeTab === 'analytics' && (
          <AnalyticsWidgets
            muscleActivationMatrix={muscleActivationMatrix}
            allHistoricalLogs={allHistoricalLogs}
            profile={profile}
            mode="analytics"
          />
        )}

        {/* =====================================================================
            TAB 6: โภชนาการ เมนูอาหาร น้ำหนักตัว & ส่งออกไฟล์ EXCEL CSV
           ===================================================================== */}
        {activeTab === 'nutrition' && (
          <div className="space-y-6">
            <MealPlannerWidget
              profile={profile}
              activeBurnKcal={dailyMetrics.totalCalories}
              workoutMins={dailyMetrics.totalWorkoutMins}
            />
            <AnalyticsWidgets
              muscleActivationMatrix={muscleActivationMatrix}
              allHistoricalLogs={allHistoricalLogs}
              profile={profile}
              mode="nutrition"
            />
          </div>
        )}

      </div>

      {/* แถบเมนูด้านล่าง ใช้แบบเดียวกันทั้งมือถือและคอม */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 border-t border-emerald-900/60 backdrop-blur-md pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-1.5">
        <div className="grid grid-cols-6 gap-1 max-w-3xl mx-auto px-1.5 sm:px-4">
          {navigationTabsList.map(tab => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id)
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
                className={`flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 py-1.5 sm:py-2.5 px-0.5 rounded-xl transition ${
                  isActive
                    ? 'text-emerald-300 bg-emerald-900/50 font-black'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60 font-bold'
                }`}
              >
                <span className="text-xl sm:text-lg leading-none">{tab.icon}</span>
                <span className="text-xs sm:text-sm leading-none whitespace-nowrap">
                  {tab.shortTitle}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Floating Rest Timer Icon & Pill: แสดงเวลานับถอยหลัง ปรับเวลา และหยุด แสดงได้ทุกหน้าเมื่อมีการจับเวลา */}
      <FloatingRestTimer
        restTimer={restTimer}
        onAdjustTimer={handleAdjustRestTimer}
        onStopTimer={handleStopRestTimer}
      />

      {/* Popup กลางจอแจ้งเตือนหมดเวลาพักเซ็ต พร้อมเสียงเตือนและสั่นมือถือ */}
      <RestFinishedModal
        isOpen={restAlertModal.isOpen}
        onClose={handleCloseRestModal}
        exerciseName={restAlertModal.exerciseName}
        restDurationSec={restAlertModal.totalSec}
        onExtendRest={(addSec) => {
          handleCloseRestModal()
          handleStartRestTimer(addSec, `${restAlertModal.exerciseName} (พักต่อ ${addSec} วิ)`)
        }}
      />

      <ExerciseModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onAddExercise={handleAddExercise}
      />

      <ProgramGeneratorModal
        isOpen={isPresetModalOpen}
        onClose={() => setIsPresetModalOpen(false)}
        onSelectProgram={handleLoadProgramTemplate}
        profile={profile}
      />

      <TrailReadinessModal
        isOpen={isTrailModalOpen}
        isEmbedded={false}
        onClose={() => setIsTrailModalOpen(false)}
        profile={profile}
        allHistoricalLogs={allHistoricalLogs}
        onSelectTrailProgram={handleLoadProgramTemplate}
      />
    </div>
  )
}