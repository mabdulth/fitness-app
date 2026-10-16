import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [infoMsg, setInfoMsg] = useState('')
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    setInfoMsg('')
    setLoading(true)

    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password
      })

      if (error) {
        setErrorMsg(error.message)
      } else if (data?.user) {
        // สร้างข้อมูลเริ่มต้นในตาราง profiles ทันที
        await supabase.from('profiles').upsert({
          id: data.user.id,
          email: data.user.email,
          weight_kg: 70,
          height_cm: 170,
          age: 29,
          gender: 'male',
          body_type: 'Skinny Fat',
          goal: 'Body Recomposition',
          fitness_level: 'Intermediate',
          training_days: 5,
          session_mins: 60,
          split_preference: 'Auto',
          available_equipment: ['Dumbbell', 'Machine', 'Bodyweight', 'Cardio'],
          role: 'user'
        })

        if (data.session) {
          navigate('/profile')
        } else {
          setInfoMsg('สร้างบัญชีสำเร็จ! กรุณากดเข้าสู่ระบบด้วยอีเมลและรหัสผ่านของคุณ')
          setIsSignUp(false)
        }
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      })

      if (error) {
        setErrorMsg('อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง')
      } else {
        navigate('/dashboard')
      }
    }

    setLoading(false)
  }

  return (
    <div className="flex items-center justify-center min-h-screen px-4 bg-slate-900">
      <div className="w-full max-w-md p-8 bg-white border border-slate-200 rounded-2xl shadow-2xl">
        
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center justify-center w-11 h-11 text-lg font-black text-white bg-emerald-600 rounded-xl">
            KM
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">คนเมืองตามป่า Fitness</h1>
            <p className="text-xs text-slate-500">Adaptive Sports Science & Trail Conditioning</p>
          </div>
        </div>

        {/* ปุ่มสลับโหมด เข้าสู่ระบบ / สมัครสมาชิก */}
        <div className="grid grid-cols-2 p-1 mb-6 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(false)
              setErrorMsg('')
              setInfoMsg('')
            }}
            className={`py-2 text-xs font-bold rounded-lg transition ${
              !isSignUp ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            เข้าสู่ระบบ (Sign In)
          </button>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(true)
              setErrorMsg('')
              setInfoMsg('')
            }}
            className={`py-2 text-xs font-bold rounded-lg transition ${
              isSignUp ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            สมัครสมาชิกใหม่ (Sign Up)
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1 text-xs font-bold text-slate-700">อีเมล (Email)</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full px-4 py-2.5 text-sm font-medium text-slate-800 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 outline-none"
            />
          </div>

          <div>
            <label className="block mb-1 text-xs font-bold text-slate-700">รหัสผ่าน (Password)</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="อย่างน้อย 6 ตัวอักษร"
              className="w-full px-4 py-2.5 text-sm font-medium text-slate-800 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 outline-none"
            />
          </div>

          {errorMsg && (
            <div className="p-3 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
              {errorMsg}
            </div>
          )}

          {infoMsg && (
            <div className="p-3 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl">
              {infoMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 mt-2 text-sm font-bold text-white transition bg-slate-900 rounded-xl hover:bg-emerald-700 disabled:bg-slate-400"
          >
            {loading
              ? 'กำลังประมวลผล...'
              : isSignUp
                ? 'สร้างบัญชีและตั้งค่าสรีระ →'
                : 'เข้าสู่ระบบ Analytics Dashboard'}
          </button>
        </form>

      </div>
    </div>
  )
}