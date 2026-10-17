import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { calculateScientificBiometrics, formatLocalISO } from '../utils/workoutEngine'
import { getTeamBadgeClasses } from '../components/ProgramGeneratorModal'
import BodyMorphologyVisual from '../components/BodyMorphologyVisual'
import { playCountdownBeep, triggerHapticFeedback } from '../utils/audioAlarm'

const EQUIPMENT_OPTIONS = [
  { id: 'Dumbbell', label: 'ดัมเบล (Dumbbell)', desc: 'ดัมเบลปรับน้ำหนักหรือดัมเบลฟิตเนส' },
  { id: 'Barbell', label: 'บาร์เบล (Barbell & Rack)', desc: 'บาร์เบลยาว ม้านอนดันอก แร็คสควอท' },
  { id: 'Machine', label: 'เครื่องแมชชีน (Gym Machines)', desc: 'เครื่องถีบขา เครื่องดันอก/ไหล่/เตะขา' },
  { id: 'Cable', label: 'เคเบิลและรอก (Cable Pulley)', desc: 'ดึงปีก Lat Pulldown, เคเบิลครอสโอเวอร์' },
  { id: 'Calisthenics', label: 'บาร์คาลิสเธนิกส์ (Pull-Up / Dip Bar)', desc: 'บาร์โหนดึงข้อ บาร์คู่ดิปส์ ห่วงยิมนาสติก' },
  { id: 'Cardio', label: 'ลู่วิ่ง / เครื่องคาร์ดิโอ (Treadmill)', desc: 'ลู่วิ่งปรับความชันได้ หรือเครื่องไต่บันได' },
  { id: 'Bodyweight', label: 'บอดี้เวท (Bodyweight พื้นฐาน)', desc: 'วิดพื้น สควอท แพลงก์ ไม่ใช้อุปกรณ์' }
]

const TEAM_COLOR_OPTIONS = [
  { id: 'emerald', label: 'เขียวมรกตพิทักษ์ป่า (Emerald)' },
  { id: 'pink', label: 'ชมพูบานเย็นกองร้อยน้ำหวาน (Hot Pink)' },
  { id: 'amber', label: 'ทองอำพันแชมเปี้ยน (Amber Gold)' },
  { id: 'purple', label: 'ม่วงนีออนไซเบอร์ (Neon Purple)' },
  { id: 'rose', label: 'แดงเพลิงนักสู้ (Crimson Rose)' },
  { id: 'sky', label: 'ฟ้าสกายบลู (Sky Blue)' },
  { id: 'indigo', label: 'น้ำเงินรอยัลอินดิโก้ (Royal Indigo)' }
]

const TEAM_ICON_PRESETS = [
  '🌲⚡', '🦩✨', '🥊🔥', '🧽🫧', '🏔️🧭',
  '👑💎', '🕷️🕸️', '☕🌞', '🐅🌿', '🏖️🥂'
]

const BODY_TYPE_CARDS = [
  {
    id: 'Skinny Fat',
    name: 'Skinny Fat (ผอมแต่มีพุง)',
    category: 'ปรับกระชับสัดส่วน',
    desc: 'แขนขาเล็ก แต่มีไขมันสะสมบริเวณหน้าท้องและเอว ต้องการสร้างมวลกล้ามเนื้อควบคู่ลดไขมัน',
    icon: '⚡',
    badge: 'Recomp Target'
  },
  {
    id: 'Endomorph',
    name: 'Endomorph (โครงสร้างใหญ่)',
    category: 'เผาผลาญไขมัน',
    desc: 'กระดูกใหญ่ สะสมไขมันง่ายทั่วเรือนร่าง เผาผลาญช้า แต่เพิ่มพละกำลังได้ดีเยี่ยม',
    icon: '🔥',
    badge: 'Fat Loss Focus'
  },
  {
    id: 'Ectomorph',
    name: 'Ectomorph (ผอมบางเผาผลาญไว)',
    category: 'สร้างมวลกล้ามเนื้อ',
    desc: 'แขนขายาว ลีนธรรมชาติ ไขมันต่ำมาก แต่เพิ่มน้ำหนักและสร้างกล้ามเนื้อได้ช้า',
    icon: '🌱',
    badge: 'Hard Gainer'
  },
  {
    id: 'Athletic',
    name: 'Athletic (สมส่วนนักกีฬา)',
    category: 'รักษาสมดุล & พัฒนาพละกำลัง',
    desc: 'มีพื้นฐานกล้ามเนื้อและความคล่องตัวสูง สัดส่วนสมดุล พร้อมรับการฝึกความหนักสูง',
    icon: '🏆',
    badge: 'Sports Ready'
  },
  {
    id: 'Muscular / Bulking',
    name: 'Muscular / Bulking (ช่วงเพิ่มขนาด)',
    category: 'Hypertrophy Mass',
    desc: 'มีมวลกล้ามเนื้อหนาแน่น อยู่ในช่วงกินเพิ่มแคลอรี่และยกหนักเพื่อเพิ่มขนาดกล้ามเนื้อสูงสุด',
    icon: '💪',
    badge: 'Mass Gain'
  },
  {
    id: 'Muscular / Cutting',
    name: 'Muscular / Cutting (ช่วงลีนคมชัด)',
    category: 'LBM Definition',
    desc: 'กล้ามเนื้อคมชัด อยู่ในช่วงจำกัดไขมันเพื่อดึงรอยแยกกล้ามเนื้อและร่อง 11 ออกมาเต็มที่',
    icon: '🗡️',
    badge: 'Shredded'
  }
]

const PRIMARY_GOAL_CARDS = [
  {
    id: 'Body Recomposition',
    name: 'Body Recomposition (ปั้นหุ่นสลายพุง)',
    desc: 'สร้างมวลกล้ามเนื้อใหม่ควบคู่ไปกับการดึงไขมันหน้าท้องมาใช้เป็นพลังงาน',
    icon: '🔄',
    color: 'emerald'
  },
  {
    id: 'Fat Loss',
    name: 'Fat Loss (ลดไขมัน & คุมน้ำหนัก)',
    desc: 'เน้นลดเปอร์เซ็นต์ไขมันส่วนเกิน รีดไขมันสะสมใต้ผิวหนังอย่างปลอดภัย',
    icon: '🔥',
    color: 'rose'
  },
  {
    id: 'Strength & Endurance',
    name: 'Strength & Endurance (ฟิตซ้อมเดินป่า)',
    desc: 'เสริมความอึดของกล้ามเนื้อขาและหัวใจ รองรับการแบกเป้เดินชันและปีนเขา 30 อุทยาน',
    icon: '⛰️',
    color: 'sky'
  },
  {
    id: 'Hypertrophy',
    name: 'Hypertrophy (สร้างกล้ามเนื้อให้ใหญ่คมชัด)',
    desc: 'เน้นขยายขนาดเส้นใยกล้ามเนื้อ (Sarcoplasmic & Myofibrillar) เพิ่มความหนาแน่นแผงอกและหลัง',
    icon: '💥',
    color: 'indigo'
  },
  {
    id: 'Powerlifting',
    name: 'Powerlifting (เพิ่มพละกำลังสูงสุด 1RM)',
    desc: 'เน้นพัฒนาแรงระเบิดกล้ามเนื้อและการประสานงานของระบบประสาทในท่า Compound',
    icon: '🏋️‍♂️',
    color: 'amber'
  },
  {
    id: 'Maintenance',
    name: 'Maintenance (รักษารูปร่างและสุขภาพ)',
    desc: 'รักษามวลกล้ามเนื้อ ป้องกันการสะสมไขมัน และคงความกระฉับกระเฉงในชีวิตประจำวัน',
    icon: '🛡️',
    color: 'slate'
  }
]

export default function Profile() {
  const [searchParams] = useSearchParams()
  const isOnboardingParam = searchParams.get('onboarding') === 'true'

  const [activeTab, setActiveTab] = useState('biometrics') // 'biometrics' | 'goals' | 'guild' | 'workout' | 'system'
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)

  // ข้อมูลชื่อผู้ใช้และระบบทีม/สัญลักษณ์กิลด์
  const [displayName, setDisplayName] = useState('')
  const [teamName, setTeamName] = useState('ทีมขนุน')
  const [teamColor, setTeamColor] = useState('emerald')
  const [teamIcon, setTeamIcon] = useState('🌲⚡')

  // ข้อมูลสรีระและเป้าหมาย
  const [weight, setWeight] = useState('70')
  const [height, setHeight] = useState('172')
  const [age, setAge] = useState('29')
  const [gender, setGender] = useState('male')
  const [bodyType, setBodyType] = useState('Skinny Fat')
  const [goal, setGoal] = useState('Body Recomposition')

  // ความไหวของร่างกาย การจัดตาราง และอุปกรณ์ที่มี
  const [fitnessLevel, setFitnessLevel] = useState('Intermediate')
  const [trainingDays, setTrainingDays] = useState(5)
  const [sessionMins, setSessionMins] = useState(60)
  const [splitPreference, setSplitPreference] = useState('Auto')
  const [availableEquipment, setAvailableEquipment] = useState(['Dumbbell', 'Machine', 'Cardio', 'Bodyweight'])
  const [role, setRole] = useState('user')

  // ประวัติการเปลี่ยนแปลงสรีระและเป้าหมาย
  const [bodyHistory, setBodyHistory] = useState([])
  const [teamRequest, setTeamRequest] = useState(null)
  const [allAvailableTeams, setAllAvailableTeams] = useState([])
  const [historicalLogs, setHistoricalLogs] = useState([])
  const [weightHistoryLogs, setWeightHistoryLogs] = useState([])
  const [hasSavedProfile, setHasSavedProfile] = useState(false)
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('')

  const navigate = useNavigate()

  useEffect(() => {
    const fetchProfileAndGuilds = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        navigate('/')
        return
      }

      setUser(session.user)

      // ดึงโปรไฟล์ของผู้ใช้ปัจจุบัน
      const { data: myProf } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (myProf) {
        if (myProf.display_name && myProf.display_name !== 'นักสำรวจ') {
          setDisplayName(myProf.display_name)
          setHasSavedProfile(true)
        } else if (session.user.email) {
          setDisplayName(session.user.email.split('@')[0])
        }

        if (myProf.team_name) setTeamName(myProf.team_name)
        if (myProf.team_color) setTeamColor(myProf.team_color)
        if (myProf.team_icon) setTeamIcon(myProf.team_icon)

        if (myProf.weight_kg) setWeight(String(myProf.weight_kg))
        if (myProf.height_cm) setHeight(String(myProf.height_cm))
        if (myProf.age) setAge(String(myProf.age))
        if (myProf.gender) setGender(myProf.gender)
        if (myProf.body_type) setBodyType(myProf.body_type)
        if (myProf.goal) setGoal(myProf.goal)
        if (myProf.fitness_level) setFitnessLevel(myProf.fitness_level)
        if (myProf.training_days) setTrainingDays(myProf.training_days)
        if (myProf.session_mins) setSessionMins(myProf.session_mins)
        if (myProf.split_preference) setSplitPreference(myProf.split_preference)
        if (Array.isArray(myProf.available_equipment) && myProf.available_equipment.length > 0) {
          setAvailableEquipment(myProf.available_equipment)
        }
        if (myProf.role) setRole(myProf.role)

        // โหลดประวัติ Body History และ Team Request
        const overrides = myProf.schedule_overrides || {}
        if (Array.isArray(overrides._body_history)) {
          setBodyHistory(overrides._body_history)
        }
        if (Array.isArray(overrides._weight_history)) {
          setWeightHistoryLogs(overrides._weight_history)
        }
        if (overrides._team_request) {
          setTeamRequest(overrides._team_request)
        }
        if (overrides._onboarded) {
          setHasSavedProfile(true)
        }
      }

      // ดึงรายชื่อทีมที่มีอยู่ทั้งหมดในระบบเพื่อแสดงให้ผู้ใช้เลือกขอเข้าร่วม
      const { data: allProfs } = await supabase
        .from('profiles')
        .select('id, display_name, role, team_name, team_color, team_icon')

      if (allProfs && allProfs.length > 0) {
        const teamMap = {}
        allProfs.forEach(p => {
          const tName = p.team_name ? p.team_name.trim() : ''
          if (!tName || tName === 'ทีมอิสระ') return

          if (!teamMap[tName]) {
            teamMap[tName] = {
              team_name: tName,
              team_color: p.team_color || 'emerald',
              team_icon: p.team_icon || '🌲⚡',
              trainer_name: p.role === 'trainer' || p.role === 'master' ? p.display_name : '',
              trainer_id: p.role === 'trainer' || p.role === 'master' ? p.id : null,
              membersCount: 0
            }
          }
          teamMap[tName].membersCount += 1
          if ((p.role === 'trainer' || p.role === 'master') && !teamMap[tName].trainer_name) {
            teamMap[tName].trainer_name = p.display_name
            teamMap[tName].trainer_id = p.id
          }
        })
        setAllAvailableTeams(Object.values(teamMap))
      }

      // ดึงประวัติการฝึกซ้อมทั้งหมดของยูเซอร์เพื่อคำนวณความสม่ำเสมอ
      const { data: workoutsData } = await supabase
        .from('workouts')
        .select('id, date')
        .eq('user_id', session.user.id)

      if (workoutsData && workoutsData.length > 0) {
        const wIds = workoutsData.map(w => w.id)
        const { data: logsData } = await supabase
          .from('workout_logs')
          .select('workout_id, weight_kg, reps, sets')
          .in('workout_id', wIds)

        if (logsData) {
          const idDateMap = workoutsData.reduce((acc, cur) => ({ ...acc, [cur.id]: cur.date }), {})
          const mappedLogs = logsData.map(l => ({
            ...l,
            date: idDateMap[l.workout_id] || ''
          }))
          setHistoricalLogs(mappedLogs)
        }
      }

      setLoading(false)
    }

    fetchProfileAndGuilds()
  }, [navigate])

  const handleToggleEquipment = (eqId) => {
    setAvailableEquipment(prev =>
      prev.includes(eqId)
        ? prev.filter(item => item !== eqId)
        : [...prev, eqId]
    )
  }

  const handleSelectEquipmentPreset = (presetList) => {
    setAvailableEquipment([...presetList])
  }

  // ส่งคำขอเข้าร่วมทีม
  const handleRequestJoinTeam = async (targetTeam) => {
    if (!user) return
    const confirmJoin = window.confirm(`คุณต้องการส่งคำขอเข้าร่วม "${targetTeam.team_name} ${targetTeam.team_icon}" ใช่หรือไม่? เมื่อส่งแล้ว เทรนเนอร์ประจำทีมจะได้รับการแจ้งเตือนเพื่อกดยอมรับ`)
    if (!confirmJoin) return

    setLoading(true)
    const newRequest = {
      team_name: targetTeam.team_name,
      team_color: targetTeam.team_color,
      team_icon: targetTeam.team_icon,
      trainer_id: targetTeam.trainer_id,
      requested_at: formatLocalISO(new Date()),
      status: 'pending'
    }

    const { data: currentProf } = await supabase
      .from('profiles')
      .select('schedule_overrides')
      .eq('id', user.id)
      .single()

    const currentOverrides = currentProf?.schedule_overrides || {}
    const updatedOverrides = {
      ...currentOverrides,
      _team_request: newRequest
    }

    const { error } = await supabase
      .from('profiles')
      .update({ schedule_overrides: updatedOverrides })
      .eq('id', user.id)

    if (!error) {
      setTeamRequest(newRequest)
      alert(`ส่งคำขอเข้าร่วมทีม "${targetTeam.team_name}" เรียบร้อยแล้ว! เทรนเนอร์จะได้รับการแจ้งเตือนเพื่ออนุมัติ`)
    } else {
      alert('เกิดข้อผิดพลาดในการส่งคำขอ: ' + error.message)
    }
    setLoading(false)
  }

  // ยกเลิกคำขอเข้าร่วมทีม
  const handleCancelTeamRequest = async () => {
    if (!user) return
    if (!window.confirm('คุณต้องการยกเลิกคำขอเข้าร่วมทีมใช่หรือไม่?')) return

    setLoading(true)
    const { data: currentProf } = await supabase
      .from('profiles')
      .select('schedule_overrides')
      .eq('id', user.id)
      .single()

    const currentOverrides = currentProf?.schedule_overrides || {}
    const updatedOverrides = {
      ...currentOverrides,
      _team_request: null
    }

    const { error } = await supabase
      .from('profiles')
      .update({ schedule_overrides: updatedOverrides })
      .eq('id', user.id)

    if (!error) {
      setTeamRequest(null)
      alert('ยกเลิกคำขอเข้าร่วมทีมเรียบร้อยแล้ว')
    }
    setLoading(false)
  }

  // ออกจากทีมปัจจุบัน
  const handleLeaveTeam = async () => {
    if (!user) return
    const confirmLeave = window.confirm(`คุณต้องการออกจาก "${teamName}" ใช่หรือไม่? เมื่อออกแล้ว คุณจะกลับสู่สถานะทีมอิสระ`)
    if (!confirmLeave) return

    setLoading(true)
    const { data: currentProf } = await supabase
      .from('profiles')
      .select('schedule_overrides')
      .eq('id', user.id)
      .single()

    const currentOverrides = currentProf?.schedule_overrides || {}
    const updatedOverrides = {
      ...currentOverrides,
      _team_request: null
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        team_name: 'ทีมอิสระ',
        team_color: 'slate',
        team_icon: '🌲',
        schedule_overrides: updatedOverrides
      })
      .eq('id', user.id)

    if (!error) {
      setTeamName('ทีมอิสระ')
      setTeamColor('slate')
      setTeamIcon('🌲')
      setTeamRequest(null)
      alert('ออกจากทีมเรียบร้อยแล้ว คุณสามารถเลือกขอเข้าร่วมทีมใหม่ได้ตลอดเวลา')
    }
    setLoading(false)
  }

  // บันทึกการเปลี่ยนแปลงโปรไฟล์ทั้งหมด
  const handleSave = async (e) => {
    if (e) e.preventDefault()

    const cleanDisplayName = displayName.trim()
    if (!cleanDisplayName || cleanDisplayName === 'นักสำรวจ') {
      alert('กรุณาระบุชื่อผู้ใช้งานของคุณ เพื่อให้ระบบสามารถระบุตัวตนและจัดตารางฝึกเฉพาะบุคคลได้')
      setActiveTab('biometrics')
      return
    }

    if (availableEquipment.length === 0) {
      alert('กรุณาเลือกอุปกรณ์ที่มีอย่างน้อย 1 รายการ (หากไม่มีอุปกรณ์เลยให้เลือก บอดี้เวท)')
      setActiveTab('workout')
      return
    }

    setLoading(true)
    triggerHapticFeedback(50)

    // บันทึกประวัติ Body Type / Goal History หากมีการเปลี่ยนแปลง
    const todayIso = formatLocalISO(new Date())
    const existingHistory = [...bodyHistory]
    const latestHistory = existingHistory[existingHistory.length - 1]

    let updatedHistory = existingHistory
    if (!latestHistory || latestHistory.body_type !== bodyType || latestHistory.goal !== goal) {
      const historyEntry = {
        date: todayIso,
        body_type: bodyType,
        goal: goal,
        weight_kg: parseFloat(weight),
        height_cm: parseFloat(height),
        note: `ตั้งค่าเป้าหมายเป็น ${goal} (${bodyType})`
      }
      updatedHistory = [...existingHistory, historyEntry]
      setBodyHistory(updatedHistory)
    }

    // อัปเดตประวัติน้ำหนักด้วย
    const filteredWeightHistory = weightHistoryLogs.filter(item => item.date !== todayIso)
    const updatedWeightHistory = [...filteredWeightHistory, { date: todayIso, weight: parseFloat(weight) }].slice(-12)
    setWeightHistoryLogs(updatedWeightHistory)

    const { data: currentProf } = await supabase
      .from('profiles')
      .select('schedule_overrides')
      .eq('id', user.id)
      .single()

    const existingOverrides = currentProf?.schedule_overrides || {}
    const updatedOverrides = {
      ...existingOverrides,
      _body_history: updatedHistory,
      _weight_history: updatedWeightHistory,
      _onboarded: true
    }

    // สำหรับ User ทั่วไป จะไม่สามารถแก้ team_name ได้โดยตรง (ต้องรอเทรนเนอร์อนุมัติ)
    // สำหรับ Master / Trainer สามารถกำหนดชื่อทีมตนเองได้
    const payload = {
      id: user.id,
      email: user.email,
      display_name: cleanDisplayName,
      weight_kg: parseFloat(weight),
      height_cm: parseFloat(height),
      age: parseInt(age) || 29,
      gender,
      body_type: bodyType,
      goal,
      fitness_level: fitnessLevel,
      training_days: parseInt(trainingDays) || 5,
      session_mins: parseInt(sessionMins) || 60,
      split_preference: splitPreference,
      available_equipment: availableEquipment,
      role,
      schedule_overrides: updatedOverrides
    }

    if (role === 'master' || role === 'trainer') {
      payload.team_name = teamName.trim() || `ทีม${cleanDisplayName}`
      payload.team_color = teamColor
      payload.team_icon = teamIcon
    }

    const { error } = await supabase.from('profiles').upsert(payload)

    if (!error) {
      setHasSavedProfile(true)
      playCountdownBeep(true)
      setSaveSuccessMsg(`✓ บันทึกโปรไฟล์ของ "${cleanDisplayName}" สำเร็จเรียบร้อย!`)
      setTimeout(() => setSaveSuccessMsg(''), 4000)

      if (isOnboardingParam) {
        alert(`ยินดีต้อนรับคุณ "${cleanDisplayName}"! บันทึกข้อมูลเริ่มต้นเรียบร้อยแล้ว กำลังนำคุณเข้าสู่ Dashboard`)
        navigate('/dashboard')
      }
    } else {
      alert('เกิดข้อผิดพลาดในการบันทึก: ' + error.message)
    }
    setLoading(false)
  }

  // ฟังก์ชันป้องกันการออกจากหน้าตั้งค่าหากยังไม่เคยบันทึกชื่อ
  const handleBackToDashboard = () => {
    if (!hasSavedProfile && (!displayName || displayName.trim() === '' || displayName === 'นักสำรวจ')) {
      alert('⚠️ กรุณาระบุชื่อของคุณและกด "บันทึกข้อมูล" ก่อนเข้าสู่ระบบ Dashboard')
      return
    }
    navigate('/dashboard')
  }

  const liveBio = calculateScientificBiometrics({
    weight_kg: weight,
    height_cm: height,
    age,
    gender,
    training_days: trainingDays,
    fitness_level: fitnessLevel,
    goal,
    body_type: bodyType
  })

  const isTrainerOrMaster = role === 'trainer' || role === 'master'

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-stone-100 text-slate-500 space-y-3">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-bold">กำลังโหลดข้อมูลสรีระและระบบกิลด์...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-28 pt-4 px-4 sm:px-6 bg-stone-100 text-slate-800">
      <div className="max-w-5xl mx-auto space-y-5">
        
        {/* แถบแจ้งเตือน Onboarding สำหรับผู้ใช้ใหม่ */}
        {(!hasSavedProfile || isOnboardingParam) && (
          <div className="p-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-2xl shadow-md flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">👋</span>
              <div>
                <h4 className="text-sm font-black">ยินดีต้อนรับสู่ คนเมืองตามป่า Fitness!</h4>
                <p className="text-xs text-emerald-100 mt-0.5">
                  กรุณากรอกชื่อของคุณ และตรวจสอบข้อมูลสรีระเริ่มต้น จากนั้นกด <strong>&quot;บันทึกโปรไฟล์&quot;</strong> เพื่อเริ่มจัดตารางฝึก
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 text-[11px] font-black bg-white text-emerald-900 rounded-lg shrink-0">
              ขั้นตอนที่ 1/1
            </span>
          </div>
        )}

        {/* HEADER SECTION */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 text-white rounded-3xl shadow-lg border border-slate-800">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 text-[10px] font-black text-slate-950 bg-emerald-400 rounded uppercase">
                SETTINGS & BIOMETRICS HUB
              </span>
              <span className={`px-3 py-0.5 text-xs font-black border rounded-full ${getTeamBadgeClasses(teamColor)}`}>
                {teamName || 'ทีมอิสระ'} {teamIcon}
              </span>
              <span className="px-2 py-0.5 text-[10px] font-bold text-slate-300 bg-slate-800 rounded uppercase">
                {role}
              </span>
            </div>
            <h1 className="text-xl font-black mt-1.5 flex items-center gap-2">
              <span>⚙️ ศูนย์ตั้งค่าโปรไฟล์ & ปรับแต่งสรีระ</span>
            </h1>
            <p className="text-xs text-slate-300 mt-0.5">
              จัดการข้อมูลสรีระ โครงสร้างร่างกาย เป้าหมายหลัก และสังกัดทีมเพื่อปรับแต่งตารางฝึกเฉพาะคุณ
            </p>
          </div>

          <button 
            type="button"
            onClick={handleBackToDashboard}
            className="px-4 py-2.5 text-xs font-extrabold text-slate-200 bg-slate-800/90 border border-slate-700 rounded-xl hover:bg-slate-700 transition flex items-center gap-1.5"
          >
            <span>← กลับสู่ Dashboard</span>
          </button>
        </div>

        {/* 5-TAB SEGMENTED NAVIGATION (จัดหมวดหมู่ชัดเจน มองแล้วเข้าใจทันที) */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-1.5 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <button
            type="button"
            onClick={() => setActiveTab('biometrics')}
            className={`py-2.5 px-3 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'biometrics'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <span>👤</span>
            <span>สรีระ & หุ่นจำลอง</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('goals')}
            className={`py-2.5 px-3 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'goals'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <span>🧬</span>
            <span>โครงสร้าง & เป้าหมาย</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('guild')}
            className={`py-2.5 px-3 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'guild'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <span>🛡️</span>
            <span>กิลด์ & สังกัดทีม</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('workout')}
            className={`py-2.5 px-3 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'workout'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <span>🏋️‍♂️</span>
            <span>ตารางฝึก & อุปกรณ์</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('system')}
            className={`py-2.5 px-3 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-1.5 col-span-2 sm:col-span-1 ${
              activeTab === 'system'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <span>⚙️</span>
            <span>ระบบ & สิทธิ์</span>
          </button>
        </div>

        {/* แจ้งเตือนบันทึกสำเร็จ */}
        {saveSuccessMsg && (
          <div className="p-3 text-xs font-extrabold text-emerald-900 bg-emerald-50 border border-emerald-300 rounded-2xl text-center shadow-xs">
            {saveSuccessMsg}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">

          {/* ===================================================================
              TAB 1: ข้อมูลสรีระ & หุ่นจำลองชีววิทยา (Biometrics & Body Visual)
             =================================================================== */}
          {activeTab === 'biometrics' && (
            <div className="space-y-5">
              
              {/* ภาพจำลองสรีระ 3D Silhouette Dynamic ตามชีววิทยาจริง */}
              <BodyMorphologyVisual
                gender={gender}
                height_cm={height}
                weight_kg={weight}
                age={age}
                body_type={bodyType}
                goal={goal}
                historicalLogs={historicalLogs}
                weightLogs={weightHistoryLogs}
                mode="full"
              />

              {/* ฟอร์มกรอกข้อมูลส่วนบุคคลและสรีระ */}
              <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">
                      ข้อมูลสรีระส่วนบุคคล (Personal Biometrics)
                    </h3>
                    <p className="text-xs text-slate-500">กรอกข้อมูลร่างกายเพื่อคำนวณอัตราการเผาผลาญและแนะนำน้ำหนักยก</p>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                    BMI {liveBio.bmi}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                  <div className="lg:col-span-2">
                    <label className="block mb-1 text-xs font-extrabold text-slate-700">
                      ชื่อผู้ใช้งาน / ชื่อเล่น (Display Name) <span className="text-rose-500">*จำเป็น</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="เช่น ขนุน / อเล็กซ์ / เมย์"
                      className="w-full px-3.5 py-2.5 text-sm font-bold text-slate-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block mb-1 text-xs font-extrabold text-slate-700">เพศสรีระ</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm font-bold text-slate-800 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 outline-none"
                    >
                      <option value="male">👨 ชาย (Male)</option>
                      <option value="female">👩 หญิง (Female)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block mb-1 text-xs font-extrabold text-slate-700">ส่วนสูง (Cm.)</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm font-bold text-slate-800 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block mb-1 text-xs font-extrabold text-slate-700">น้ำหนัก (Kg.)</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm font-bold text-slate-800 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">อัตราเผาผลาญพื้นฐาน</span>
                    <div className="text-base font-black text-slate-900 mt-0.5">{liveBio.bmr} <span className="text-xs font-normal">kcal</span></div>
                    <span className="text-[10px] text-slate-500">BMR ตอนนอนนิ่ง</span>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">พลังงานใช้รวมต่อวัน</span>
                    <div className="text-base font-black text-slate-900 mt-0.5">{liveBio.tdee} <span className="text-xs font-normal">kcal</span></div>
                    <span className="text-[10px] text-slate-500">TDEE รวมกิจกรรม</span>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">แคลอรี่เป้าหมาย</span>
                    <div className="text-base font-black text-orange-600 mt-0.5">{liveBio.targetCalories} <span className="text-xs font-normal">kcal</span></div>
                    <span className="text-[10px] text-orange-700">คำนวณตาม {goal}</span>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">โปรตีนแนะนำ</span>
                    <div className="text-base font-black text-indigo-700 mt-0.5">{liveBio.targetProteinGrams} <span className="text-xs font-normal">กรัม</span></div>
                    <span className="text-[10px] text-indigo-600">รักษามวลกล้ามเนื้อ</span>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ===================================================================
              TAB 2: โครงสร้างร่างกาย & เป้าหมาย (Body Type & Goal Evolution)
             =================================================================== */}
          {activeTab === 'goals' && (
            <div className="space-y-5">
              
              {/* เลือกโครงสร้างร่างกายปัจจุบัน (Body Type) */}
              <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <span className="px-2.5 py-0.5 text-[10px] font-black text-white bg-indigo-600 rounded-md uppercase tracking-wider">
                    SOMATOTYPE SELECTION
                  </span>
                  <h3 className="text-base font-extrabold text-slate-900 mt-1">
                    เลือกโครงสร้างร่างกายปัจจุบันของคุณ (Current Body Type)
                  </h3>
                  <p className="text-xs text-slate-500">
                    โครงสร้างร่างกายจะส่งผลต่อการประเมินสรีระ การกระจายวอลลุ่ม และภาพจำลองหุ่น AI
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {BODY_TYPE_CARDS.map((item) => {
                    const isSelected = bodyType === item.id
                    return (
                      <div
                        key={item.id}
                        onClick={() => setBodyType(item.id)}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-indigo-50/70 border-indigo-600 shadow-xs'
                            : 'bg-slate-50 border-slate-200/80 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-2xl">{item.icon}</span>
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                            isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'
                          }`}>
                            {item.badge}
                          </span>
                        </div>
                        <h4 className="text-xs font-black text-slate-900">{item.name}</h4>
                        <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">{item.desc}</p>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* เลือกเป้าหมายหลัก (Primary Goal) */}
              <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <span className="px-2.5 py-0.5 text-[10px] font-black text-white bg-emerald-600 rounded-md uppercase tracking-wider">
                    PRIMARY OBJECTIVE
                  </span>
                  <h3 className="text-base font-extrabold text-slate-900 mt-1">
                    เลือกเป้าหมายหลักในการฝึก (Primary Fitness Goal)
                  </h3>
                  <p className="text-xs text-slate-500">
                    เป้าหมายนี้จะใช้ปรับระดับแคลอรี่ จำนวนเซ็ต และสัดส่วนเวทเทรนนิ่งต่อคาร์ดิโอ
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {PRIMARY_GOAL_CARDS.map((item) => {
                    const isSelected = goal === item.id
                    return (
                      <div
                        key={item.id}
                        onClick={() => setGoal(item.id)}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-emerald-50/70 border-emerald-600 shadow-xs'
                            : 'bg-slate-50 border-slate-200/80 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-2xl">{item.icon}</span>
                          {isSelected && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-600 text-white">
                              ✓ เป้าหมายปัจจุบัน
                            </span>
                          )}
                        </div>
                        <h4 className="text-xs font-black text-slate-900">{item.name}</h4>
                        <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">{item.desc}</p>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* ไทม์ไลน์ประวัติการเปลี่ยนแปลงสรีระ (Body Evolution History) */}
              <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-1.5">
                      <span>📜</span> ไทม์ไลน์ประวัติการเปลี่ยนแปลงสรีระ (Body Evolution Timeline)
                    </h3>
                    <p className="text-xs text-slate-500">เก็บบันทึกประวัติโครงสร้างและเป้าหมายย้อนหลังทุกครั้งที่คุณตั้งค่าใหม่</p>
                  </div>
                  <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                    {bodyHistory.length} บันทึก
                  </span>
                </div>

                {bodyHistory.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    ยังไม่มีประวัติการเปลี่ยนโครงสร้าง เมื่อคุณกดบันทึก ระบบจะเริ่มจดจำประวัติของวันนี้เป็นจุดเริ่มต้น
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {[...bodyHistory].reverse().map((entry, idx) => (
                      <div key={idx} className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
                            #{bodyHistory.length - idx}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-extrabold text-slate-900">{entry.body_type}</span>
                              <span className="text-[11px] text-slate-400">•</span>
                              <span className="text-xs font-extrabold text-emerald-700">{entry.goal}</span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              น้ำหนัก: {entry.weight_kg} kg | ส่วนสูง: {entry.height_cm} cm
                              {entry.note ? ` • ${entry.note}` : ''}
                            </p>
                          </div>
                        </div>
                        <span className="text-[11px] font-bold text-slate-400">
                          {entry.date}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ===================================================================
              TAB 3: กิลด์ & สังกัดทีม (Guild & Teams - การเข้าร่วมและจัดการทีม)
             =================================================================== */}
          {activeTab === 'guild' && (
            <div className="space-y-5">
              
              {/* การ์ดสถานะทีมปัจจุบันของผู้ใช้ */}
              <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <span className="px-2.5 py-0.5 text-[10px] font-black text-white bg-slate-900 rounded-md uppercase tracking-wider">
                      TEAM MEMBERSHIP STATUS
                    </span>
                    <h3 className="text-base font-extrabold text-slate-900 mt-1">
                      สถานะสังกัดทีมและกิลด์ของคุณ
                    </h3>
                  </div>

                  <span className={`px-3 py-1 text-xs font-black border rounded-full ${getTeamBadgeClasses(teamColor)}`}>
                    {teamName || 'ทีมอิสระ'} {teamIcon}
                  </span>
                </div>

                {/* กล่องแสดงสถานะ */}
                {teamRequest?.status === 'pending' ? (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-black text-amber-900">
                        <span>⏳</span> รอการอนุมัติคำขอเข้าร่วมทีม: &quot;{teamRequest.team_name} {teamRequest.team_icon}&quot;
                      </div>
                      <p className="text-[11px] text-amber-700 mt-0.5">
                        ส่งคำขอเมื่อ {teamRequest.requested_at} รอเทรนเนอร์หรือมาสเตอร์กดอนุมัติ
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleCancelTeamRequest}
                      className="px-3.5 py-1.5 text-xs font-bold text-amber-900 bg-white border border-amber-300 rounded-xl hover:bg-amber-100"
                    >
                      ✕ ยกเลิกคำขอ
                    </button>
                  </div>
                ) : teamName && teamName !== 'ทีมอิสระ' ? (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-black text-emerald-900">
                        <span>✅</span> คุณสังกัดอยู่ในทีม: &quot;{teamName} {teamIcon}&quot;
                      </div>
                      <p className="text-[11px] text-emerald-700 mt-0.5">
                        คุณจะได้รับโปรแกรมการฝึก การดูแล และสถิติร่วมกับเพื่อนร่วมทีมนี้
                      </p>
                    </div>

                    {!isTrainerOrMaster && (
                      <button
                        type="button"
                        onClick={handleLeaveTeam}
                        className="px-3.5 py-1.5 text-xs font-bold text-rose-700 bg-white border border-rose-300 rounded-xl hover:bg-rose-50"
                      >
                        🚪 ออกจากทีม
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                    <div className="text-xs font-bold text-slate-700">
                      🛡️ ปัจจุบันคุณเป็น <strong>นักกีฬาอิสระ</strong> ยังไม่ได้สังกัดทีมใด
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      เลือกทีมที่มีอยู่ด้านล่างและกด &quot;ขอเข้าร่วมทีม&quot; เพื่อรับการเทรนจากโค้ชประจำทีม
                    </p>
                  </div>
                )}
              </div>

              {/* สำหรับ Master / Trainer: สามารถกำหนดชื่อและตราทีมของตนเองได้ */}
              {isTrainerOrMaster ? (
                <div className="p-6 bg-white border-2 border-amber-400 rounded-3xl shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <span className="px-2.5 py-0.5 text-[10px] font-black text-slate-950 bg-amber-400 rounded-md uppercase tracking-wider">
                        👑 TRAINER & MASTER PRIVILEGE
                      </span>
                      <h3 className="text-base font-extrabold text-slate-900 mt-1">
                        สร้างและปรับแต่งชื่อทีมประจำตัวของคุณ (Team Creation)
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate('/trainer')}
                      className="px-3.5 py-1.5 text-xs font-extrabold text-slate-950 bg-amber-400 rounded-xl hover:bg-amber-300"
                    >
                      👑 เปิด Trainer Console
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-1 text-xs font-bold text-slate-700">ชื่อทีม / กิลด์ (Team Name)</label>
                      <input
                        type="text"
                        value={teamName}
                        onChange={(e) => setTeamName(e.target.value)}
                        placeholder="เช่น ทีมขนุน, ทีมกองร้อยน้ำหวาน"
                        className="w-full px-3.5 py-2.5 text-sm font-bold text-slate-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block mb-1 text-xs font-bold text-slate-700">เลือกสีประจำทีม</label>
                      <select
                        value={teamColor}
                        onChange={(e) => setTeamColor(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs font-bold text-slate-800 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 outline-none"
                      >
                        {TEAM_COLOR_OPTIONS.map(c => (
                          <option key={c.id} value={c.id}>{c.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block mb-1 text-xs font-bold text-slate-700">ไอคอนสัญลักษณ์ท้ายชื่อทีม</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={teamIcon}
                        onChange={(e) => setTeamIcon(e.target.value)}
                        className="w-24 px-3 py-2 text-sm font-bold text-center border border-slate-300 rounded-xl"
                      />
                      <div className="flex flex-wrap gap-1 flex-1">
                        {TEAM_ICON_PRESETS.map(ic => (
                          <button
                            key={ic}
                            type="button"
                            onClick={() => setTeamIcon(ic)}
                            className={`px-2.5 py-1 text-xs rounded-lg border transition ${
                              teamIcon === ic
                                ? 'bg-slate-900 text-white border-slate-900'
                                : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {ic}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* รายชื่อทีมที่มีอยู่ทั้งหมดในระบบ และปุ่มขอเข้าร่วมทีม */}
              <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                    <span>👥</span> ทีม / กิลด์ที่มีอยู่ทั้งหมดในระบบ (Available Teams)
                  </h3>
                  <p className="text-xs text-slate-500">
                    ผู้ใช้ทั่วไปไม่สามารถตั้งชื่อทีมเองได้ แต่สามารถกด &quot;ขอเข้าร่วมทีม&quot; เพื่อให้เทรนเนอร์ประจำทีมกดยอมรับได้ที่นี่
                  </p>
                </div>

                {allAvailableTeams.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    กำลังรวบรวมรายชื่อทีมจากระบบ...
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {allAvailableTeams.map((team) => {
                      const isCurrentTeam = teamName === team.team_name
                      const isRequested = teamRequest?.status === 'pending' && teamRequest.team_name === team.team_name

                      return (
                        <div
                          key={team.team_name}
                          className="p-4 bg-slate-50 border border-slate-200/90 rounded-2xl flex flex-col justify-between hover:border-slate-300 transition"
                        >
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className={`px-2.5 py-0.5 text-xs font-black border rounded-full ${getTeamBadgeClasses(team.team_color)}`}>
                                {team.team_name} {team.team_icon}
                              </span>
                              <span className="text-[11px] font-bold text-slate-400">
                                {team.membersCount} สมาชิก
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 font-semibold mt-1">
                              เทรนเนอร์ประจำทีม: <strong className="text-slate-900">{team.trainer_name || 'โค้ชหลัก'}</strong>
                            </p>
                          </div>

                          <div className="mt-4 pt-3 border-t border-slate-200/70">
                            {isCurrentTeam ? (
                              <button
                                type="button"
                                disabled
                                className="w-full py-2 text-xs font-black text-emerald-800 bg-emerald-100/70 rounded-xl cursor-default"
                              >
                                ✓ สังกัดทีมนี้อยู่
                              </button>
                            ) : isRequested ? (
                              <button
                                type="button"
                                disabled
                                className="w-full py-2 text-xs font-black text-amber-800 bg-amber-100 rounded-xl cursor-default"
                              >
                                ⏳ รอเทรนเนอร์อนุมัติ
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleRequestJoinTeam(team)}
                                className="w-full py-2 text-xs font-extrabold text-white bg-slate-900 rounded-xl hover:bg-emerald-700 transition"
                              >
                                🤝 ขอเข้าร่วมทีม
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ===================================================================
              TAB 4: ตารางฝึก & อุปกรณ์ที่มีให้เล่น (Workout & Equipment)
             =================================================================== */}
          {activeTab === 'workout' && (
            <div className="space-y-5">
              
              {/* ความไหวของร่างกายและรูปแบบการจัดตารางรายสัปดาห์ */}
              <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-base font-extrabold text-slate-900">
                    ความไหวของร่างกายและรูปแบบตารางฝึกรายสัปดาห์ (Stamina & Split)
                  </h3>
                  <p className="text-xs text-slate-500">ระบบจะนำไปจัดสัดส่วนวันซ้อมและวันพักฟื้นกล้ามเนื้อ</p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block mb-1 text-xs font-extrabold text-slate-700">ประสบการณ์ฝึก (Stamina Level)</label>
                    <select
                      value={fitnessLevel}
                      onChange={(e) => setFitnessLevel(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm font-semibold text-slate-800 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 outline-none"
                    >
                      <option value="Beginner">Beginner (มือใหม่ เน้นเซฟร่างกาย)</option>
                      <option value="Intermediate">Intermediate (ปานกลาง สม่ำเสมอ)</option>
                      <option value="Advanced">Advanced (ฝึกหนักได้เต็มที่)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block mb-1 text-xs font-extrabold text-slate-700">จำนวนวันที่สะดวกฝึกต่อสัปดาห์</label>
                    <select
                      value={trainingDays}
                      onChange={(e) => setTrainingDays(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 text-sm font-semibold text-slate-800 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 outline-none"
                    >
                      <option value={3}>3 วัน / สัปดาห์ (พัก 4 วัน)</option>
                      <option value={4}>4 วัน / สัปดาห์ (พัก 3 วัน)</option>
                      <option value={5}>5 วัน / สัปดาห์ (มาตรฐาน แนะนำ)</option>
                      <option value={6}>6 วัน / สัปดาห์ (พัก 1 วัน)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block mb-1 text-xs font-extrabold text-slate-700">เวลาที่มีในการฝึกต่อวัน</label>
                    <select
                      value={sessionMins}
                      onChange={(e) => setSessionMins(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 text-sm font-semibold text-slate-800 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 outline-none"
                    >
                      <option value={40}>30 - 45 นาที (กระชับ เน้นท่าหลัก)</option>
                      <option value={60}>45 - 60 นาที (มาตรฐาน กำลังดี)</option>
                      <option value={90}>60 - 90 นาที (จัดเต็ม เวท + คาร์ดิโอ)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block mb-1 text-xs font-extrabold text-slate-700">รูปแบบการจัดตารางภาพรวมรายสัปดาห์</label>
                  <select
                    value={splitPreference}
                    onChange={(e) => setSplitPreference(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm font-bold text-emerald-900 bg-emerald-50/70 border border-emerald-300 rounded-xl focus:ring-2 focus:ring-emerald-600 outline-none"
                  >
                    <option value="Auto">✨ ระบบวิเคราะห์และเลือกตารางที่เหมาะสมที่สุดอัตโนมัติ (Auto-Recommended)</option>
                    <option value="Hybrid-Daily">🔥 Daily Weight + Cardio Hybrid (เวทเฉพาะส่วน + เดินชันลู่วิ่งทุกวัน)</option>
                    <option value="Bro-Split">💪 Classic Bodypart Split (จันทร์-อก / อังคาร-ขา / พุธ-คาร์ดิโอ / พฤหัส-หลัง / ศุกร์-ไหล่แขน)</option>
                    <option value="PPL">🏋️‍♂️ Push / Pull / Legs (มาตรฐานวิทยาศาสตร์การกีฬา ดัน / ดึง / ขา)</option>
                    <option value="Trail-Mountaineer">⛰️ Trail & Mountain Expedition (เน้นขา/เข่า/น่อง + แบกเป้ + เดินชันขึ้นเขา)</option>
                  </select>
                </div>
              </div>

              {/* เลือกเครื่องมือและอุปกรณ์ที่มีให้เล่นจริง */}
              <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">
                      อุปกรณ์ที่คุณมีให้เล่นจริง (Available Equipment)
                    </h3>
                    <p className="text-xs text-slate-500">ระบบจะกรองเฉพาะท่าที่มีอุปกรณ์ตรงกัน และสลับท่าบอดี้เวทให้อัตโนมัติ</p>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleSelectEquipmentPreset(['Dumbbell', 'Cardio', 'Bodyweight'])}
                      className="px-2.5 py-1 text-[11px] font-bold bg-sky-50 text-sky-800 border border-sky-200 rounded-lg hover:bg-sky-100"
                    >
                      ชุดโฮมยิม/คอนโด (ดัมเบล + ลู่วิ่ง)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectEquipmentPreset(['Dumbbell', 'Barbell', 'Machine', 'Cable', 'Calisthenics', 'Cardio', 'Bodyweight'])}
                      className="px-2.5 py-1 text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg hover:bg-emerald-100"
                    >
                      ฟิตเนสครบวงจร (Full Gym)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectEquipmentPreset(['Calisthenics', 'Bodyweight'])}
                      className="px-2.5 py-1 text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 rounded-lg hover:bg-amber-100"
                    >
                      สายบอดี้เวท/สวนสาธารณะ
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                  {EQUIPMENT_OPTIONS.map((eq) => {
                    const isChecked = availableEquipment.includes(eq.id)
                    return (
                      <div
                        key={eq.id}
                        onClick={() => handleToggleEquipment(eq.id)}
                        className={`p-3.5 rounded-xl border-2 cursor-pointer transition flex items-start gap-3 ${
                          isChecked
                            ? 'bg-emerald-50/70 border-emerald-500 shadow-2xs'
                            : 'bg-slate-50 border-slate-200 opacity-70 hover:opacity-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="mt-0.5 w-4 h-4 accent-emerald-600 rounded"
                        />
                        <div>
                          <div className="text-xs font-extrabold text-slate-900">{eq.label}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">{eq.desc}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

            </div>
          )}

          {/* ===================================================================
              TAB 5: ระบบ & สิทธิ์บัญชี (System & Account Preferences)
             =================================================================== */}
          {activeTab === 'system' && (
            <div className="space-y-5">
              
              <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-base font-extrabold text-slate-900">
                    ข้อมูลบัญชีและระดับสิทธิ์การใช้งาน (Account Role)
                  </h3>
                  <p className="text-xs text-slate-500">ตรวจสอบและจัดการสิทธิ์การเข้าถึงเมนู Trainer Console</p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                  <div>
                    <span className="text-xs font-bold text-slate-500">ระดับสิทธิ์ปัจจุบัน:</span>
                    <div className="text-lg font-black text-slate-900 uppercase mt-0.5">
                      {role === 'master' ? '👑 Master (แอดมินสูงสุด)' : role === 'trainer' ? '🏋️‍♂️ Trainer (เทรนเนอร์ประจำทีม)' : '👤 General User (สมาชิกทั่วไป)'}
                    </div>
                  </div>

                  {role === 'master' && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-600">ทดสอบสลับสิทธิ์:</span>
                      <select
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 rounded-lg"
                      >
                        <option value="master">Master</option>
                        <option value="trainer">Trainer</option>
                        <option value="user">General User</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* ทดสอบเสียงเตือนและระบบสั่น */}
                <div className="pt-2">
                  <span className="text-xs font-extrabold text-slate-700 block mb-2">ทดสอบระบบแจ้งเตือนพักเซ็ต (Sound & Haptics):</span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        playCountdownBeep(true)
                        triggerHapticFeedback(100)
                      }}
                      className="px-4 py-2 text-xs font-extrabold text-slate-900 bg-slate-100 border border-slate-300 rounded-xl hover:bg-slate-200"
                    >
                      🔔 ทดสอบเสียงเตือนพักเซ็ต (Beep Alarm)
                    </button>
                    <button
                      type="button"
                      onClick={() => triggerHapticFeedback([100, 50, 100, 50, 200])}
                      className="px-4 py-2 text-xs font-extrabold text-slate-900 bg-slate-100 border border-slate-300 rounded-xl hover:bg-slate-200"
                    >
                      📳 ทดสอบระบบสั่น (Vibration)
                    </button>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* STICKY BOTTOM SAVE ACTION BAR */}
          <div className="fixed bottom-0 left-0 right-0 z-30 p-3 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-xl">
            <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 hidden sm:inline">
                  สถานะโปรไฟล์:
                </span>
                <span className="text-xs font-black text-slate-900">
                  {displayName || 'ยังไม่ได้ระบุชื่อ'} • {teamName || 'ทีมอิสระ'} {teamIcon}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleBackToDashboard}
                  className="px-4 py-2.5 text-xs font-extrabold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 text-xs font-black text-white bg-slate-900 rounded-xl hover:bg-emerald-700 shadow-md transition disabled:bg-slate-400 flex items-center gap-1.5"
                >
                  {loading ? 'กำลังบันทึก...' : '💾 บันทึกการตั้งค่าทั้งหมด'}
                </button>
              </div>
            </div>
          </div>

        </form>
      </div>
    </div>
  )
}