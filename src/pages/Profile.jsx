import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { calculateScientificBiometrics } from '../utils/workoutEngine'
import { getTeamBadgeClasses } from '../components/ProgramGeneratorModal'

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
  '🌲⚡',
  '🦩✨',
  '🥊🔥',
  '🧽🫧',
  '🏔️🧭',
  '👑💎',
  '🕷️🕸️',
  '☕🌞',
  '🐅🌿',
  '🏖️🥂'
]

export default function Profile() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)

  // ข้อมูลชื่อผู้ใช้และระบบทีม/สัญลักษณ์กิลด์
  const [displayName, setDisplayName] = useState('ขนุน')
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

  const navigate = useNavigate()

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        navigate('/')
        return
      }

      setUser(session.user)

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (data) {
        if (data.display_name) setDisplayName(data.display_name)
        else if (session.user.email) setDisplayName(session.user.email.split('@')[0])

        if (data.team_name) setTeamName(data.team_name)
        if (data.team_color) setTeamColor(data.team_color)
        if (data.team_icon) setTeamIcon(data.team_icon)

        if (data.weight_kg) setWeight(data.weight_kg)
        if (data.height_cm) setHeight(data.height_cm)
        if (data.age) setAge(data.age)
        if (data.gender) setGender(data.gender)
        if (data.body_type) setBodyType(data.body_type)
        if (data.goal) setGoal(data.goal)
        if (data.fitness_level) setFitnessLevel(data.fitness_level)
        if (data.training_days) setTrainingDays(data.training_days)
        if (data.session_mins) setSessionMins(data.session_mins)
        if (data.split_preference) setSplitPreference(data.split_preference)
        if (Array.isArray(data.available_equipment) && data.available_equipment.length > 0) {
          setAvailableEquipment(data.available_equipment)
        }
        if (data.role) setRole(data.role)
      }
      setLoading(false)
    }

    fetchProfile()
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

  const handleSave = async (e) => {
    e.preventDefault()
    if (availableEquipment.length === 0) {
      alert('กรุณาเลือกอุปกรณ์ที่มีอย่างน้อย 1 รายการ (หากไม่มีอุปกรณ์เลยให้เลือก บอดี้เวท)')
      return
    }

    setLoading(true)

    const cleanDisplayName = displayName.trim() || 'นักสำรวจ'
    const cleanTeamName = teamName.trim() || `ทีม${cleanDisplayName}`

    const payload = {
      id: user.id,
      email: user.email,
      display_name: cleanDisplayName,
      team_name: cleanTeamName,
      team_color: teamColor,
      team_icon: teamIcon,
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
      role
    }

    const { error } = await supabase.from('profiles').upsert(payload)

    if (!error) {
      alert(`บันทึกโปรไฟล์ของ "${cleanDisplayName}" (${cleanTeamName} ${teamIcon}) สำเร็จ!`)
      navigate('/dashboard')
    } else {
      alert('เกิดข้อผิดพลาด: ' + error.message)
    }
    setLoading(false)
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

  if (loading) return <div className="flex items-center justify-center h-screen text-slate-500">กำลังประมวลผลข้อมูลสรีระและสัญลักษณ์ทีม...</div>

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 bg-stone-100 text-slate-800">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-6 bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 text-white rounded-3xl shadow-lg">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 text-[10px] font-black text-slate-950 bg-emerald-400 rounded uppercase">
                IDENTITY • TEAM GUILD • BIOMETRICS
              </span>
              <span className={`px-3 py-0.5 text-xs font-black border rounded-full ${getTeamBadgeClasses(teamColor)}`}>
                {teamName || `ทีม${displayName}`} {teamIcon}
              </span>
            </div>
            <h1 className="text-xl font-black mt-1.5">
              ตั้งค่าชื่อผู้ใช้งาน • สัญลักษณ์ทีมประจำตัว & ข้อมูลสรีระ
            </h1>
            <p className="text-xs text-slate-300 mt-0.5">
              ปรับแต่งชื่อและตราประจำทีมของคุณ พร้อมคำนวณตารางฝึกรายสัปดาห์ตามอุปกรณ์ที่มีจริง
            </p>
          </div>
          <button 
            type="button"
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 text-xs font-extrabold text-slate-200 bg-slate-800 border border-slate-700 rounded-xl hover:bg-slate-700 shrink-0"
          >
            ← กลับหน้า Dashboard
          </button>
        </div>

        {/* Live Scientific Calculation Preview Strip */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase">ดัชนีมวลกาย (BMI)</span>
            <div className="mt-1 text-xl font-black text-slate-900">{liveBio.bmi}</div>
            <span className="text-[11px] text-emerald-700 font-semibold">ประเมินตามส่วนสูง/น้ำหนัก</span>
          </div>
          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase">BMR / TDEE</span>
            <div className="mt-1 text-lg font-black text-slate-900">{liveBio.bmr} / {liveBio.tdee}</div>
            <span className="text-[11px] text-slate-500">พลังงานที่ใช้ต่อวัน (kcal)</span>
          </div>
          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase">แคลอรี่เป้าหมาย</span>
            <div className="mt-1 text-xl font-black text-orange-600">{liveBio.targetCalories} <span className="text-xs font-normal">kcal</span></div>
            <span className="text-[11px] text-slate-500">ตามเป้าหมาย {goal}</span>
          </div>
          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase">โปรตีนที่ควรได้รับ</span>
            <div className="mt-1 text-xl font-black text-indigo-600">{liveBio.targetProteinGrams} <span className="text-xs font-normal">กรัม/วัน</span></div>
            <span className="text-[11px] text-slate-500">เพื่อสร้าง/รักษากล้ามเนื้อ</span>
          </div>
          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs col-span-2 sm:col-span-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Zone 2 Heart Rate</span>
            <div className="mt-1 text-lg font-black text-sky-600">{liveBio.zone2Range}</div>
            <span className="text-[11px] text-slate-500">โซนหัวใจเดินชันลดไขมัน</span>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          
          {/* SECTION 0: ระบบตั้งชื่อยูเซอร์ และสัญลักษณ์ทีม (Team Identity & Guild Badge) */}
          <div className="p-6 bg-white border-2 border-emerald-500/40 rounded-3xl shadow-sm space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <span className="px-2 py-0.5 text-[10px] font-black text-white bg-emerald-600 rounded uppercase">
                  USER & TEAM IDENTITY
                </span>
                <h2 className="text-base font-extrabold text-slate-900 mt-1">
                  0. ตั้งชื่อผู้ใช้งาน & ปรับแต่งสัญลักษณ์ทีมประจำตัว (Team Badge & Icon)
                </h2>
              </div>

              {/* ตัวอย่างป้ายชื่อและทีมแบบ Real-time */}
              <div className="flex items-center gap-2 px-3.5 py-1.5 bg-slate-900 text-white rounded-2xl">
                <span className="text-xs font-bold text-slate-300">ตัวอย่างป้ายของคุณ:</span>
                <span className="text-xs font-black text-white">{displayName || 'นักสำรวจ'}</span>
                <span className={`px-2.5 py-0.5 text-xs font-black border rounded-full ${getTeamBadgeClasses(teamColor)}`}>
                  {teamName || `ทีม${displayName}`} {teamIcon}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block mb-1 text-xs font-bold text-slate-700">
                  ชื่อผู้ใช้งาน / ชื่อเทรนเนอร์ (Display Name)
                </label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="เช่น ขนุน / โค้ชขนุน / นาตาชา"
                  className="w-full px-3.5 py-2 text-sm font-bold text-slate-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">ชื่อทีม / กิลด์ (Team Name)</label>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setTeamName(`ทีม${displayName || 'ขนุน'}`)}
                      className="text-[10px] font-extrabold text-emerald-700 hover:underline"
                    >
                      ⚡ ตั้งเป็น &quot;ทีม{displayName || 'ขนุน'}&quot;
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => {
                        setTeamName('ทีมกองร้อยน้ำหวาน')
                        setTeamColor('pink')
                        setTeamIcon('🦩✨')
                      }}
                      className="text-[10px] font-extrabold text-pink-600 hover:underline"
                    >
                      🦩 ตั้งเป็น &quot;ทีมกองร้อยน้ำหวาน&quot;
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  required
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="เช่น ทีมขนุน, ทีมกองร้อยน้ำหวาน, ทีมคนเมืองตามป่า"
                  className="w-full px-3.5 py-2 text-sm font-bold text-slate-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block mb-1 text-xs font-bold text-slate-700">เลือกสีประจำทีม (Team Badge Color)</label>
                <select
                  value={teamColor}
                  onChange={(e) => setTeamColor(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs font-bold text-slate-800 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 outline-none"
                >
                  {TEAM_COLOR_OPTIONS.map(c => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block mb-1 text-xs font-bold text-slate-700">
                  ไอคอนสัญลักษณ์ท้ายชื่อทีม (เลือกจากรายการ หรือพิมพ์อีโมจิเองได้)
                </label>
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
                        className={`px-2 py-1 text-xs rounded-lg border transition ${
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
          </div>

          {/* SECTION 1: ข้อมูลสรีระและเป้าหมาย */}
          <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-5">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">
              1. ข้อมูลสรีระพื้นฐานและเป้าหมาย (Biometrics & Primary Goal)
            </h2>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <label className="block mb-1 text-xs font-bold text-slate-700">น้ำหนัก (Kg.)</label>
                <input 
                  type="number" step="0.1" required value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm font-bold text-slate-800 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 outline-none"
                />
              </div>
              <div>
                <label className="block mb-1 text-xs font-bold text-slate-700">ส่วนสูง (Cm.)</label>
                <input 
                  type="number" step="0.1" required value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm font-bold text-slate-800 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 outline-none"
                />
              </div>
              <div>
                <label className="block mb-1 text-xs font-bold text-slate-700">อายุ (ปี)</label>
                <input 
                  type="number" required value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm font-bold text-slate-800 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 outline-none"
                />
              </div>
              <div>
                <label className="block mb-1 text-xs font-bold text-slate-700">เพศสรีระ</label>
                <select 
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm font-bold text-slate-800 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 outline-none"
                >
                  <option value="male">ชาย (Male)</option>
                  <option value="female">หญิง (Female)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block mb-1 text-xs font-bold text-slate-700">โครงสร้างร่างกายปัจจุบัน (Body Type)</label>
                <select 
                  value={bodyType} 
                  onChange={(e) => setBodyType(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm font-semibold text-slate-800 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 outline-none"
                >
                  <optgroup label="ระดับทั่วไป / ต้องการปรับสัดส่วน">
                    <option value="Skinny Fat">Skinny Fat (แขนขาเล็ก แต่มีพุง/ไขมันสะสมหน้าท้อง)</option>
                    <option value="Endomorph">Endomorph (โครงสร้างใหญ่ สะสมไขมันง่ายทั่วตัว)</option>
                    <option value="Ectomorph">Ectomorph (ผอมบาง เผาผลาญไว สร้างกล้ามเนื้อยาก)</option>
                  </optgroup>
                  <optgroup label="ระดับมีกล้ามเนื้อแล้ว (Intermediate / Advanced)">
                    <option value="Athletic">Athletic (สมส่วน มีพื้นฐานกล้ามเนื้อและความคล่องตัว)</option>
                    <option value="Muscular / Bulking">Muscular / Bulking (มีกล้ามเนื้อแน่น อยู่ในช่วงเพิ่มขนาด)</option>
                    <option value="Muscular / Cutting">Muscular / Cutting (มีกล้ามเนื้อแน่น อยู่ในช่วงลีนไขมัน)</option>
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="block mb-1 text-xs font-bold text-slate-700">เป้าหมายหลัก (Primary Goal)</label>
                <select 
                  value={goal} 
                  onChange={(e) => setGoal(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm font-semibold text-slate-800 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 outline-none"
                >
                  <option value="Body Recomposition">Body Recomposition (สร้างกล้ามเนื้อควบคู่สลายไขมันหน้าท้อง)</option>
                  <option value="Fat Loss">Fat Loss (เน้นลดเปอร์เซ็นต์ไขมันและลดน้ำหนัก)</option>
                  <option value="Strength & Endurance">Strength & Endurance (ฟิตร่างกายและขาเพื่อเดินป่า/ขึ้นเขา)</option>
                  <option value="Hypertrophy">Hypertrophy (เน้นสร้างมวลกล้ามเนื้อให้ใหญ่และคมชัด)</option>
                  <option value="Powerlifting">Powerlifting (เน้นเพิ่มพละกำลังสูงสุด 1RM)</option>
                  <option value="Maintenance">Maintenance (รักษามวลกล้ามเนื้อและความฟิตระยะยาว)</option>
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 2: ความไหวของร่างกาย และรูปแบบการจัดตารางรายสัปดาห์ */}
          <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-5">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">
              2. ความไหวของร่างกายและรูปแบบตารางฝึกรายสัปดาห์ (Stamina & Weekly Split)
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="block mb-1 text-xs font-bold text-slate-700">ความไหว / ประสบการณ์ฝึก (Stamina Level)</label>
                <select 
                  value={fitnessLevel}
                  onChange={(e) => setFitnessLevel(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm font-semibold text-slate-800 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 outline-none"
                >
                  <option value="Beginner">Beginner (มือใหม่ / เพิ่งกลับมาออกกำลังกาย เน้นเซฟร่างกาย)</option>
                  <option value="Intermediate">Intermediate (ออกกำลังกายสม่ำเสมอ ร่างกายแข็งแรงปานกลาง-ดี)</option>
                  <option value="Advanced">Advanced (ฝึกหนักได้เต็มที่ มีกล้ามเนื้อและความอึดสูง)</option>
                </select>
              </div>

              <div>
                <label className="block mb-1 text-xs font-bold text-slate-700">จำนวนวันที่สะดวกฝึกต่อสัปดาห์</label>
                <select 
                  value={trainingDays}
                  onChange={(e) => setTrainingDays(Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-sm font-semibold text-slate-800 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 outline-none"
                >
                  <option value={3}>3 วัน / สัปดาห์ (พัก 4 วัน)</option>
                  <option value={4}>4 วัน / สัปดาห์ (พัก 3 วัน)</option>
                  <option value={5}>5 วัน / สัปดาห์ (มาตรฐาน แนะนำ)</option>
                  <option value={6}>6 วัน / สัปดาห์ (พัก 1 วัน)</option>
                </select>
              </div>

              <div>
                <label className="block mb-1 text-xs font-bold text-slate-700">เวลาที่มีในการฝึกต่อวัน</label>
                <select 
                  value={sessionMins}
                  onChange={(e) => setSessionMins(Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-sm font-semibold text-slate-800 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 outline-none"
                >
                  <option value={40}>30 - 45 นาที (กระชับ เน้นท่าหลัก)</option>
                  <option value={60}>45 - 60 นาที (มาตรฐาน กำลังดี)</option>
                  <option value={90}>60 - 90 นาที (จัดเต็ม เวท + คาร์ดิโอ)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block mb-1 text-xs font-bold text-slate-700">รูปแบบการจัดตารางภาพรวมรายสัปดาห์ (Master Weekly Split)</label>
              <select 
                value={splitPreference}
                onChange={(e) => setSplitPreference(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm font-bold text-emerald-900 bg-emerald-50/70 border border-emerald-300 rounded-xl focus:ring-2 focus:ring-emerald-600 outline-none"
              >
                <option value="Auto">✨ ให้ระบบวิเคราะห์และเลือกตารางที่เหมาะสมที่สุดอัตโนมัติ (Auto-Recommended)</option>
                <option value="Hybrid-Daily">🔥 Daily Weight + Cardio Hybrid (เล่นเวทเฉพาะส่วน + เดินชันลู่วิ่งควบคู่กันทุกวัน)</option>
                <option value="Bro-Split">💪 Classic Bodypart Split (จันทร์-อก / อังคาร-ขา / พุธ-คาร์ดิโอ / พฤหัส-หลัง / ศุกร์-ไหล่แขน)</option>
                <option value="PPL">🏋️‍♂️ Push / Pull / Legs (ตารางมาตรฐานวิทยาศาสตร์การกีฬา ดัน / ดึง / ขา)</option>
                <option value="Trail-Mountaineer">⛰️ Trail & Mountain Expedition (เน้นขา/เข่า/น่อง + หลังรับน้ำหนักเป้ + เดินชันขึ้นเขา)</option>
              </select>
            </div>
          </div>

          {/* SECTION 3: เลือกเครื่องมือและอุปกรณ์ที่มีให้เล่นจริง */}
          <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  3. เลือกเครื่องมือและอุปกรณ์ที่คุณมีให้เล่นจริง (Available Equipment)
                </h2>
                <p className="text-xs text-slate-500">
                  ระบบจะคัดกรองเฉพาะท่าที่ตรงกับอุปกรณ์ที่คุณติ๊กไว้ และแปลงท่าทดแทนให้อัตโนมัติเมื่อจัดตาราง
                </p>
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
                  สายคาลิสเธนิกส์/สวนสาธารณะ
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
                    className={`p-3.5 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                      isChecked
                        ? 'bg-emerald-50/70 border-emerald-500 ring-1 ring-emerald-500'
                        : 'bg-slate-50 border-slate-200 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      className="mt-1 w-4 h-4 accent-emerald-600 rounded"
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

          {/* SECTION 4: แสดงสิทธิ์เฉพาะแอดมินสูงสุด (Master) เท่านั้น */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-6 bg-white border border-slate-200 rounded-3xl shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-500">
                ระดับสิทธิ์บัญชีของคุณ: <strong className="uppercase text-emerald-700">{role}</strong>
              </span>
              {role === 'master' && (
                <select 
                  value={role} 
                  onChange={(e) => setRole(e.target.value)}
                  className="px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 rounded-lg"
                >
                  <option value="master">Master (แอดมินสูงสุด)</option>
                  <option value="trainer">Trainer (เทรนเนอร์)</option>
                  <option value="user">General User (ผู้ใช้ทั่วไป)</option>
                </select>
              )}
            </div>

            <button 
              type="submit" disabled={loading}
              className="px-8 py-3.5 text-sm font-black text-white transition-all bg-slate-900 rounded-2xl shadow-md hover:bg-emerald-700 disabled:bg-slate-400"
            >
              {loading ? 'กำลังบันทึกข้อมูล...' : '💾 บันทึกชื่อยูเซอร์ สัญลักษณ์ทีม และข้อมูลสรีระ'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}