import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import {
  THAI_FOREST_EXPEDITIONS_30,
  generateWorkoutItemsForModule,
  personalizeExercisePrescription,
  filterAndAdaptExercise,
  estimateExerciseDurationMins,
  analyzeCardioKinematics
} from '../utils/workoutEngine'
import { MASTER_EXERCISE_LIBRARY, injectWarmupIntoProgram } from './ExerciseModal'
import ExerciseIllustration from './ExerciseIllustration'

// ============================================================================
// WIKIPEDIA PHOTO FETCHER สำหรับ Banner อุทยาน
// ============================================================================
const wikiPhotoCache = {}
async function fetchWikiPhoto(wikiTitles = []) {
  for (const rawTitle of wikiTitles) {
    if (!rawTitle) continue
    if (wikiPhotoCache[rawTitle]) return wikiPhotoCache[rawTitle]
    const lang = /[\u0E00-\u0E7F]/.test(rawTitle) ? 'th' : 'en'
    try {
      const sumUrl = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(rawTitle)}`
      const res = await fetch(sumUrl)
      if (res.ok) {
        const data = await res.json()
        const imgUrl = data?.originalimage?.source || data?.thumbnail?.source
        if (imgUrl && !imgUrl.toLowerCase().match(/\.(svg)$|logo|map|emblem|seal|locator/)) {
          wikiPhotoCache[rawTitle] = imgUrl
          return imgUrl
        }
      }
    } catch {
      // ignore network error
    }
  }
  return null
}

function ParkImageBanner({ wikiTitles, name }) {
  const [imgUrl, setImgUrl] = useState(null)
  useEffect(() => {
    let mounted = true
    fetchWikiPhoto(wikiTitles).then(url => {
      if (mounted && url) setImgUrl(url)
    })
    return () => {
      mounted = false
    }
  }, [wikiTitles])

  return (
    <div className="w-full h-32 sm:w-56 sm:h-full shrink-0 bg-slate-950 relative overflow-hidden rounded-xl">
      {imgUrl ? (
        <img
          src={imgUrl}
          alt={name}
          className="w-full h-full object-cover opacity-80 hover:scale-105 transition duration-700"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-[10px] text-slate-500">
          กำลังโหลดภาพ...
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/30 to-transparent pointer-events-none" />
    </div>
  )
}

// ============================================================================
// 1. HELPER: สีป้ายสัญลักษณ์ทีม
// ============================================================================
export function getTeamBadgeClasses(colorKey = 'emerald') {
  const palette = {
    emerald: 'bg-emerald-100 text-emerald-900 border-emerald-400',
    pink: 'bg-pink-100 text-pink-900 border-pink-400',
    amber: 'bg-amber-100 text-amber-900 border-amber-400',
    purple: 'bg-purple-100 text-purple-900 border-purple-400',
    rose: 'bg-rose-100 text-rose-900 border-rose-400',
    sky: 'bg-sky-100 text-sky-900 border-sky-400',
    indigo: 'bg-indigo-100 text-indigo-900 border-indigo-400'
  }
  return palette[colorKey] || palette.emerald
}

// ============================================================================
// 2. SPECIAL CREATIVE & VIRAL BLUEPRINTS
// ============================================================================
export const SPECIAL_CREATIVE_BLUEPRINTS = [
  {
    id: 'special-carwash-pretty',
    category: 'Viral Special',
    title: '🧽 1. ปั้นหุ่นพริตตี้ล้างรถ (Car Wash Pretty • S-Line & Peach Glutes)',
    character: 'S-Curve Glutes, 11-Line Abs & Toned Arms',
    physiqueFocus: 'ก้นกลมเด้งงอนรับกางเกงขาสั้น • เอวเอสร่อง 11 ชัด • ท้องแขนเรียวกระชับไม่ย้วย',
    description: 'เน้นปั้นสะโพกและก้นส่วนบนให้ยกกระชับควบคู่กับการบิดเอวสร้าง S-Curve ปิดท้ายด้วยเดินชันรีดน้ำ',
    specialProtocol: '💡 เคล็ดลับหน้างาน: เน้นจังหวะบีบก้นค้างไว้ 2 วินาทีในจุดสูงสุดของท่า Hip Thrust',
    inclineTarget: 8.0,
    durationTarget: 25,
    speedTarget: 3.6,
    recipe: [
      { muscle: 'Legs', keyword: 'ดันสะโพก', sets: 4, reps: 15 },
      { muscle: 'Legs', keyword: 'ขาเดียว', sets: 3, reps: 12 },
      { muscle: 'Arms', keyword: 'หลังแขน', sets: 3, reps: 15 },
      { muscle: 'Core', keyword: 'บิดลำตัว', sets: 4, reps: 16 },
      { muscle: 'Core', keyword: 'แพลงก์', sets: 3, reps: 15 }
    ]
  },
  {
    id: 'special-fighter-diva',
    category: 'Viral Special',
    title: '🥊 2. กะเทยนักสู้ (Warrior Diva • Explosive Power & Stamina)',
    character: 'High-Impact Upper Power & Unstoppable Cardio',
    physiqueFocus: 'หัวไหล่และแขนทรงพลัง • แกนกลางลำตัวแข็งแกร่ง • ความอึดปอดระดับขึ้นสังเวียน',
    description: 'ผสมผสานการสร้างพละกำลังระเบิดของหัวไหล่ อก หลัง และต้นขาที่มั่นคง',
    specialProtocol: '💡 เคล็ดลับหน้างาน: ออกแรงดันหรือดึงด้วยความเร็วดุดัน แล้วต้านน้ำหนักลงช้าๆ',
    inclineTarget: 6.0,
    durationTarget: 30,
    speedTarget: 5.5,
    recipe: [
      { muscle: 'Shoulders', keyword: 'เหนือศีรษะ', sets: 4, reps: 10 },
      { muscle: 'Back', keyword: 'ดึง', sets: 4, reps: 12 },
      { muscle: 'Legs', keyword: 'สควอท', sets: 4, reps: 12 },
      { muscle: 'Chest', keyword: 'ดัน', sets: 4, reps: 10 },
      { muscle: 'Core', keyword: 'ปีนเขา', sets: 4, reps: 20 }
    ]
  },
  {
    id: 'special-natasha',
    category: 'Viral Special',
    title: '🕷️ 3. นาตาชา โรมานอฟ (Black Widow Tactical Agility)',
    character: 'Natasha Romanoff / Marvel Red Room',
    physiqueFocus: 'หุ่นลีนเพรียวกระชับทุกองศา • สะโพกและต้นขาคล่องตัว',
    description: 'ถอดแบบการฝึกสายลับ Red Room เน้นความคล่องตัวของช่วงล่างด้วยท่าก้าวย่อ',
    specialProtocol: '💡 เคล็ดลับหน้างาน: พักระหว่างเซ็ตสั้นลงเหลือ 60 วินาที เพื่อรีดไขมัน',
    inclineTarget: 7.5,
    durationTarget: 25,
    speedTarget: 4.0,
    recipe: [
      { muscle: 'Back', keyword: 'ดึงเคเบิล', sets: 4, reps: 12 },
      { muscle: 'Legs', keyword: 'ก้าวย่อ', sets: 4, reps: 14 },
      { muscle: 'Legs', keyword: 'พับสะโพก', sets: 4, reps: 12 },
      { muscle: 'Shoulders', keyword: 'ไหล่ข้าง', sets: 3, reps: 15 },
      { muscle: 'Core', keyword: 'ยกเข่า', sets: 4, reps: 15 }
    ]
  },
  {
    id: 'special-arabian-charm',
    category: 'Viral Special',
    title: '🕌 4. ปั้นหุ่นพิชิตใจบัง (Hourglass Glutes & Thick Thighs)',
    character: 'Extreme Hourglass Ratio',
    physiqueFocus: 'สะโพกผายใหญ่และก้นอิ่มแน่นเต็มพิกัด • ตัดกับเอวที่คอดกิ่ว',
    description: 'จัดเต็มท่าสร้างมวลกล้ามเนื้อก้นทั้ง 3 มัด โดยไม่ทำให้เอวหนา',
    specialProtocol: '💡 เคล็ดลับหน้างาน: ท่าตระกูลสควอทและดันสะโพกให้เน้นเพิ่มน้ำหนักเหล็กหนักขึ้น',
    inclineTarget: 10.0,
    durationTarget: 25,
    speedTarget: 3.2,
    recipe: [
      { muscle: 'Legs', keyword: 'ดันสะโพก', sets: 4, reps: 12 },
      { muscle: 'Legs', keyword: 'ขากว้าง', sets: 4, reps: 12 },
      { muscle: 'Legs', keyword: 'พับสะโพก', sets: 4, reps: 12 },
      { muscle: 'Legs', keyword: 'เตะสายเคเบิล', sets: 3, reps: 15 },
      { muscle: 'Core', keyword: 'แพลงก์', sets: 4, reps: 15 }
    ]
  },
  {
    id: 'special-americano-tan',
    category: 'Viral Special',
    title: '☕ 5. อเมริกาโน่คั่วกล้าม (พร้อมสูตรทำผิวแทนสีคาราเมลโกลว์)',
    character: 'Caffeine Lipolysis Shred & Golden Tan',
    physiqueFocus: 'รีดไขมันใต้ผิวหนังคมกริบ • ลายกล้ามเนื้อชัดลึก • ผิวแทนโกลว์',
    description: 'ตารางเวทผสมการเดินชันรีดไขมัน ที่ออกแบบมาให้ทำงานร่วมกับคาเฟอีน',
    specialProtocol: '☕ ทา Tanning Oil อาบแดดเช้า 15 นาที และดื่มอเมริกาโน่ดำก่อนซ้อม 30 นาที',
    inclineTarget: 9.0,
    durationTarget: 35,
    speedTarget: 3.6,
    recipe: [
      { muscle: 'Chest', keyword: 'อกบน', sets: 4, reps: 12 },
      { muscle: 'Shoulders', keyword: 'ไหล่ข้าง', sets: 4, reps: 15 },
      { muscle: 'Back', keyword: 'ปีก', sets: 4, reps: 12 },
      { muscle: 'Arms', keyword: 'ค้อน', sets: 3, reps: 12 },
      { muscle: 'Core', keyword: 'จักรยาน', sets: 4, reps: 20 }
    ]
  },
  {
    id: 'special-expat-sweetheart',
    category: 'Viral Special',
    title: '🏖️ 6. ขวัญใจฝรั่งแก่วัยเกษียณ (Resort Goddess Posture)',
    character: 'Elegant Posture & Firm Bikini Glutes',
    physiqueFocus: 'หุ่นเฟิร์มกระชับดูอ่อนเยาว์สุขภาพดี • หลังตรงอกผายไหล่ผึ่ง',
    description: 'เน้นการดึงสะบักและไหล่หลังเพื่อปรับบุคลิกภาพให้ดูสง่า',
    specialProtocol: '💡 เคล็ดลับหน้างาน: โฟกัสการหายใจและจังหวะยกช้าๆ ปลอดภัยต่อข้อต่อ',
    inclineTarget: 6.5,
    durationTarget: 30,
    speedTarget: 3.5,
    recipe: [
      { muscle: 'Legs', keyword: 'ดันสะโพก', sets: 4, reps: 15 },
      { muscle: 'Shoulders', keyword: 'ไหล่หลัง', sets: 4, reps: 15 },
      { muscle: 'Legs', keyword: 'สควอท', sets: 3, reps: 15 },
      { muscle: 'Arms', keyword: 'หลังแขน', sets: 3, reps: 15 },
      { muscle: 'Core', keyword: 'แพลงก์', sets: 3, reps: 15 }
    ]
  },
  {
    id: 'special-pattaya-hunter',
    category: 'Viral Special',
    title: '🔥 7. ออกล่าพัทยา (Pattaya Beach Club Pump)',
    character: 'Maximum Glycogen Muscle Pump',
    physiqueFocus: 'ปั๊มอกบน ไหล่ข้าง แขน และสะโพกให้ตึงแน่นขึ้นกล้องทันที',
    description: 'ตารางปั๊มกล้ามเนื้อเร่งด่วน อัดเลือดเข้ากล้ามเนื้อก่อนใส่ชุดว่ายน้ำ',
    specialProtocol: '💡 ทานคาร์บย่อยง่ายพร้อมเกลือโซเดียมเล็กน้อยก่อนซ้อม 45 นาที กล้ามจะฟูแน่น!',
    inclineTarget: 7.0,
    durationTarget: 20,
    speedTarget: 3.6,
    recipe: [
      { muscle: 'Chest', keyword: 'อกบน', sets: 4, reps: 15 },
      { muscle: 'Shoulders', keyword: 'ไหล่ข้าง', sets: 4, reps: 18 },
      { muscle: 'Arms', keyword: 'พับแขน', sets: 4, reps: 15 },
      { muscle: 'Arms', keyword: 'กดเชือก', sets: 4, reps: 15 },
      { muscle: 'Legs', keyword: 'ดันสะโพก', sets: 3, reps: 15 }
    ]
  },
  {
    id: 'hero-spiderman',
    category: 'Hero Icon',
    title: '🕷️ 8. Spider-Man (Tom Holland) • Calisthenics & Agility',
    character: 'Peter Parker Workout',
    physiqueFocus: 'ลีนคมชัด • แผ่นหลังตัว V • ซิกแพคชัดลึก',
    description: 'ถอดแบบการเทรนจริงของ Tom Holland ที่เน้นบอดี้เวทและความคล่องตัว',
    inclineTarget: 6.0,
    durationTarget: 20,
    speedTarget: 5.5,
    recipe: [
      { muscle: 'Back', keyword: 'ดึงข้อ', sets: 4, reps: 10 },
      { muscle: 'Chest', keyword: 'ดิปส์', sets: 4, reps: 12 },
      { muscle: 'Legs', keyword: 'ขาเดียว', sets: 3, reps: 12 },
      { muscle: 'Shoulders', keyword: 'ไหล่ข้าง', sets: 4, reps: 15 },
      { muscle: 'Core', keyword: 'ยกเข่า', sets: 4, reps: 15 }
    ]
  },
  {
    id: 'hero-saitama',
    category: 'Hero Icon',
    title: '👊 9. Saitama (One Punch Man) • 100-Rep Stamina Protocol',
    character: 'Saitama Daily Conditioning',
    physiqueFocus: 'ความอึดไร้ขีดจำกัด • กล้ามเนื้อกระชับทนทาน',
    description: 'ดัดแปลงตารางวิดพื้น 100 ซิตอัพ 100 สควอท 100 ให้เซฟข้อต่อขึ้น',
    inclineTarget: 2.0,
    durationTarget: 30,
    speedTarget: 6.0,
    recipe: [
      { muscle: 'Chest', keyword: 'วิดพื้น', sets: 4, reps: 25 },
      { muscle: 'Legs', keyword: 'สควอท', sets: 4, reps: 25 },
      { muscle: 'Back', keyword: 'ดึง', sets: 4, reps: 15 },
      { muscle: 'Core', keyword: 'ท้อง', sets: 4, reps: 25 }
    ]
  },
  {
    id: 'hero-captain-america',
    category: 'Hero Icon',
    title: '🛡️ 10. Captain America (Steve Rogers) • 3D Shoulders',
    character: 'Super Soldier Serum Physique',
    physiqueFocus: 'อกบนหนาเต็มเสื้อ • หัวไหล่กลมกว้างผาย',
    description: 'เน้นการสร้างสัดส่วน Golden Ratio ช่วงบนให้ดูภูมิฐาน',
    inclineTarget: 7.5,
    durationTarget: 20,
    speedTarget: 3.5,
    recipe: [
      { muscle: 'Chest', keyword: 'อกบน', sets: 4, reps: 10 },
      { muscle: 'Shoulders', keyword: 'เหนือศีรษะ', sets: 4, reps: 10 },
      { muscle: 'Back', keyword: 'ปีก', sets: 4, reps: 10 },
      { muscle: 'Shoulders', keyword: 'ไหล่ข้าง', sets: 4, reps: 15 },
      { muscle: 'Arms', keyword: 'ค้อน', sets: 3, reps: 12 }
    ]
  },
  {
    id: 'hero-toji-yuji',
    category: 'Hero Icon',
    title: '⚡ 11. Toji & Yuji (Jujutsu Kaisen) • Functional Power',
    character: 'Heavenly Restriction Power',
    physiqueFocus: 'แผ่นหลังกว้างหนา • ไหล่หลังและบ่าคมชัด',
    description: 'ตารางฝึกเน้นพละกำลังใช้งานจริง อัดแผ่นหลัง ปีก และสควอทหนัก',
    inclineTarget: 8.0,
    durationTarget: 20,
    speedTarget: 4.0,
    recipe: [
      { muscle: 'Back', keyword: 'ปีก', sets: 4, reps: 10 },
      { muscle: 'Back', keyword: 'สะบัก', sets: 4, reps: 10 },
      { muscle: 'Legs', keyword: 'สควอท', sets: 4, reps: 10 },
      { muscle: 'Shoulders', keyword: 'ไหล่หลัง', sets: 4, reps: 15 },
      { muscle: 'Arms', keyword: 'ค้อน', sets: 4, reps: 12 }
    ]
  },
  {
    id: 'hero-wolverine',
    category: 'Hero Icon',
    title: '🐺 12. Wolverine (Hugh Jackman) • Heavy Dense Muscle',
    character: 'Berserker Strength',
    physiqueFocus: 'มวลกล้ามเนื้อแน่นหนาทั่วร่าง • รีดไขมันคมชัด',
    description: 'เน้นท่า Compound หลักครบทุกส่วน ตามด้วยเดินชันรีดไขมัน',
    inclineTarget: 8.0,
    durationTarget: 25,
    speedTarget: 3.5,
    recipe: [
      { muscle: 'Chest', keyword: 'อกกลาง', sets: 4, reps: 8 },
      { muscle: 'Back', keyword: 'ดึง', sets: 4, reps: 10 },
      { muscle: 'Shoulders', keyword: 'ยักไหล่', sets: 4, reps: 12 },
      { muscle: 'Arms', keyword: 'หลังแขน', sets: 4, reps: 12 },
      { muscle: 'Legs', keyword: 'พับสะโพก', sets: 3, reps: 10 }
    ]
  },
  {
    id: 'hero-oldmoney-athletic',
    category: 'Hero Icon',
    title: '🎩 13. Old Money Vintage Athletic • หุ่นใส่เสื้อเชิ้ตสวย',
    character: 'Classic Gentleman Posture',
    physiqueFocus: 'บุคลิกภาพหลังตรงสง่างาม • อกและไหล่ผายพอดี',
    description: 'เน้นปรับโครงสร้างบุคลิกภาพ ดึงไหล่หลังให้อกผาย',
    inclineTarget: 7.5,
    durationTarget: 30,
    speedTarget: 3.5,
    recipe: [
      { muscle: 'Chest', keyword: 'อกบน', sets: 4, reps: 12 },
      { muscle: 'Shoulders', keyword: 'ไหล่หลัง', sets: 4, reps: 15 },
      { muscle: 'Shoulders', keyword: 'ไหล่ข้าง', sets: 4, reps: 15 },
      { muscle: 'Back', keyword: 'สะบัก', sets: 3, reps: 12 },
      { muscle: 'Core', keyword: 'ท้อง', sets: 3, reps: 15 }
    ]
  }
]

// ============================================================================
// 3. STANDARD SCIENCE BLUEPRINTS (ตารางมาตรฐานทางวิทยาศาสตร์การกีฬาแบบละเอียด)
// ============================================================================
export const COMPREHENSIVE_BLUEPRINTS = [
  {
    id: 'skinny-fat-recomp',
    title: '🧬 1. Skinny Fat Body Recomposition (ลีนพุงสร้างกล้ามเนื้อคมชัด)',
    badge: 'ยอดนิยมสำหรับคนมีพุงแต่แขนขาเล็ก',
    themeBorder: 'border-emerald-500/50 hover:border-emerald-600',
    themeHeaderBg: 'from-emerald-950 via-slate-900 to-teal-950',
    themeBadge: 'bg-emerald-400 text-slate-950',
    moduleCode: 'UPPER_PUSH_CARDIO',
    suitableFor: 'คนรูปร่าง Skinny Fat (น้ำหนักตัวปกติแต่ลงพุง แขนขาไม่กระชับ), พนักงานออฟฟิศ และผู้เริ่มต้น-ระดับกลาง',
    recommendedLevel: 'Beginner – Intermediate (ซ้อม 3–4 วัน/สัปดาห์)',
    primaryMuscles: 'อกบน (Upper Chest), หัวไหล่ 3 มัด (Deltoids), หลังแขน (Triceps) + ระบบเผาผลาญไขมันช่องท้อง (Zone 2 Cardio)',
    sciencePrinciple: 'กระตุ้นการสังเคราะห์โปรตีนกล้ามเนื้อช่วงบนด้วยท่า Compound ควบคู่กับการเดินชัน Incline Zone 2 เพื่อดึงกรดไขมันอิสระรอบเอวมาเผาผลาญโดยไม่สูญเสียมวลกล้ามเนื้อ',
    coachingTip: 'เริ่มด้วยท่าวอร์มหัวไหล่-สะบัก 2 ท่าแรกเสมอ จากนั้นเน้นคุมจังหวะต้านน้ำหนักลง 2–3 วินาที และเดินชันต่อเนื่องหลังยกเวท',
    inclineTarget: 8.5,
    durationTarget: 25,
    speedTarget: 3.5,
    recipe: [
      { muscle: 'Chest', keyword: 'อกบน', sets: 4, reps: 12 },
      { muscle: 'Chest', keyword: 'อกกลาง', sets: 3, reps: 12 },
      { muscle: 'Shoulders', keyword: 'เหนือศีรษะ', sets: 4, reps: 12 },
      { muscle: 'Shoulders', keyword: 'ไหล่ข้าง', sets: 3, reps: 15 },
      { muscle: 'Arms', keyword: 'หลังแขน', sets: 3, reps: 15 }
    ]
  },
  {
    id: 'endomorph-fatburn',
    title: '🔥 2. Endomorph High-Metabolic Burn (เตาเผาไขมันด้วยกล้ามเนื้อมัดใหญ่)',
    badge: 'รีดไขมันเร่งด่วน & ลดน้ำหนัก',
    themeBorder: 'border-orange-500/50 hover:border-orange-600',
    themeHeaderBg: 'from-orange-950 via-slate-900 to-rose-950',
    themeBadge: 'bg-orange-400 text-slate-950',
    moduleCode: 'LOWER_TRAIL',
    suitableFor: 'คนโครงสร้างใหญ่สะสมไขมันง่าย (Endomorph), คนที่น้ำหนักค้าง (Plateau) และคนที่ต้องการเบิร์นแคลอรี่สูงสุดต่อชั่วโมง',
    recommendedLevel: 'ทุกระดับความฟิต (เน้นพักเซ็ตกระชับ 60–75 วินาที)',
    primaryMuscles: 'ต้นขาด้านหน้า (Quads), ต้นขาหลังและก้น (Glutes & Hamstrings), น่อง (Calves), แกนกลางลำตัว (Core)',
    sciencePrinciple: 'กล้ามเนื้อขาและสะโพกคือมัดกล้ามเนื้อที่ใหญ่ที่สุดกว่า 50% ของร่างกาย การฝึกคู่กับเดินชันจะสร้างภาวะ EPOC (Afterburn Effect) เผาผลาญพลังงานต่อเนื่องหลังซ้อมนาน 24 ชม.',
    coachingTip: 'วอร์มเปิดสะโพกและข้อเท้าตาม 2 ท่าแรกก่อนสควอททุกครั้ง และจิบน้ำเปล่าระหว่างเซ็ตอย่างสม่ำเสมอ',
    inclineTarget: 10.0,
    durationTarget: 30,
    speedTarget: 3.4,
    recipe: [
      { muscle: 'Legs', keyword: 'สควอท', sets: 4, reps: 12 },
      { muscle: 'Legs', keyword: 'ดันสะโพก', sets: 4, reps: 15 },
      { muscle: 'Legs', keyword: 'พับสะโพก', sets: 3, reps: 12 },
      { muscle: 'Legs', keyword: 'น่อง', sets: 4, reps: 20 },
      { muscle: 'Core', keyword: 'แพลงก์', sets: 3, reps: 15 }
    ]
  },
  {
    id: 'ectomorph-mass',
    title: '💪 3. Ectomorph Hardgainer Hypertrophy (เพิ่มมวลกล้ามเนื้อคนผอมบาง)',
    badge: 'สร้างกล้ามเนื้อ & เพิ่มน้ำหนักแบบคลีน',
    themeBorder: 'border-indigo-500/50 hover:border-indigo-600',
    themeHeaderBg: 'from-indigo-950 via-slate-900 to-slate-950',
    themeBadge: 'bg-indigo-400 text-slate-950',
    moduleCode: 'FULL_UPPER_CARDIO',
    suitableFor: 'คนผอมบางกินเท่าไหร่ก็ไม่อ้วน (Ectomorph / Hardgainer), คนที่ต้องการขยายโครงสร้างไหล่ อก และแผ่นหลังให้ดูหนาขึ้น',
    recommendedLevel: 'Beginner – Advanced (เน้น Progressive Overload)',
    primaryMuscles: 'แผ่นหลังและปีก (Lats & Mid-Back), กล้ามเนื้ออก (Pectorals), หัวไหล่ (Deltoids), หน้าแขน (Biceps)',
    sciencePrinciple: 'รวมท่า Compound หลายข้อต่อ (Multi-joint Movements) เพื่อกระตุ้นฮอร์โมนสร้างกล้ามเนื้อสูงสุด และจำกัดคาร์ดิโอให้อยู่ในระดับกระตุ้นหัวใจพอเหมาะเพื่อไม่ให้เสียมวลกล้ามเนื้อ',
    coachingTip: 'ทำท่าวอร์มไหล่และเซ็ตวอร์มน้ำหนักเบาก่อนยกหนักเสมอ แล้วพักระหว่างเซ็ตจริงให้นานขึ้น (90–120 วินาที)',
    inclineTarget: 5.0,
    durationTarget: 15,
    speedTarget: 3.5,
    recipe: [
      { muscle: 'Chest', keyword: 'อกกลาง', sets: 4, reps: 10 },
      { muscle: 'Back', keyword: 'ปีก', sets: 4, reps: 10 },
      { muscle: 'Shoulders', keyword: 'เหนือศีรษะ', sets: 4, reps: 10 },
      { muscle: 'Back', keyword: 'สะบัก', sets: 3, reps: 12 },
      { muscle: 'Arms', keyword: 'พับแขน', sets: 3, reps: 12 }
    ]
  },
  {
    id: 'split-chest-triceps',
    title: '🛡️ 4. Push Day: Chest, Shoulders & Triceps (อกแน่น ไหล่กลม หลังแขนชัด)',
    badge: 'ตารางแยกส่วนมาตรฐาน (Push Split)',
    themeBorder: 'border-sky-500/50 hover:border-sky-600',
    themeHeaderBg: 'from-sky-950 via-slate-900 to-indigo-950',
    themeBadge: 'bg-sky-400 text-slate-950',
    moduleCode: 'CHEST_TRI',
    suitableFor: 'ผู้ที่จัดตารางแบบ Push / Pull / Legs หรือต้องการเน้นปั้นกล้ามเนื้ออกทั้ง 3 ส่วน (อกบน-อกกลาง-ร่องอก) และกระชับท้องแขน',
    recommendedLevel: 'Intermediate – Advanced',
    primaryMuscles: 'อกบน (Clavicular Pec), อกกลาง (Sternal Pec), หัวไหล่หน้า-ข้าง (Anterior/Lateral Delt), หลังแขน 3 หัว (Triceps)',
    sciencePrinciple: 'จัดเรียงลำดับจากท่าวอร์มข้อไหล่-สะบัก ไปสู่ท่าดันมัดใหญ่ (Heavy Press) และท่าแยกมัด (Isolation) เพื่อรีดเส้นใยกล้ามเนื้อกลุ่มผลักครบทุกองศา',
    coachingTip: 'บีบสะบักติดเบาะเสมอเวลาเล่นอก เพื่อล็อกหัวไหล่ให้ปลอดภัยและส่งแรงเข้ากล้ามเนื้ออกเต็ม 100%',
    inclineTarget: 7.0,
    durationTarget: 20,
    speedTarget: 3.5,
    recipe: [
      { muscle: 'Chest', keyword: 'อกบน', sets: 4, reps: 10 },
      { muscle: 'Chest', keyword: 'อกกลาง', sets: 4, reps: 12 },
      { muscle: 'Shoulders', keyword: 'ไหล่ข้าง', sets: 4, reps: 15 },
      { muscle: 'Arms', keyword: 'หลังแขน', sets: 4, reps: 12 },
      { muscle: 'Arms', keyword: 'กดเชือก', sets: 3, reps: 15 }
    ]
  },
  {
    id: 'split-back-biceps',
    title: '🦅 5. Pull Day: V-Taper Back, Rear Delt & Biceps (แผ่นหลังตัว V & หน้าแขน)',
    badge: 'ตารางแยกส่วนมาตรฐาน (Pull Split)',
    themeBorder: 'border-teal-500/50 hover:border-teal-600',
    themeHeaderBg: 'from-teal-950 via-slate-900 to-emerald-950',
    themeBadge: 'bg-teal-400 text-slate-950',
    moduleCode: 'BACK_BI',
    suitableFor: 'ผู้ที่ต้องการสร้างแผ่นหลังรูปตัว V (ทำให้เอวดูเล็กลง), แก้อาการไหล่ห่อคอยื่นจากออฟฟิศซินโดรม และปั้นหน้าแขนให้คมชัด',
    recommendedLevel: 'Beginner – Advanced',
    primaryMuscles: 'ปีกหลัง (Latissimus Dorsi), ร่องหลังและสะบัก (Rhomboids & Traps), ไหล่หลัง (Rear Delts), หน้าแขน (Biceps & Brachialis)',
    sciencePrinciple: 'ผสานแรงดึงแนวดิ่ง (Vertical Pull ขยายความกว้างของปีก) และแรงดึงแนวระนาบ (Horizontal Row เพิ่มความหนาของร่องหลัง) พร้อมเสริมความแข็งแรงในการแบกเป้เดินป่า',
    coachingTip: 'ใช้จิตนาการว่า "ดึงด้วยข้อศอก ไม่ใช่ดึงด้วยข้อมือ" จะช่วยโฟกัสเข้าปีกและแผ่นหลังได้ชัดเจนขึ้นทันที',
    inclineTarget: 7.5,
    durationTarget: 20,
    speedTarget: 3.6,
    recipe: [
      { muscle: 'Back', keyword: 'ปีก', sets: 4, reps: 12 },
      { muscle: 'Back', keyword: 'สะบัก', sets: 4, reps: 12 },
      { muscle: 'Shoulders', keyword: 'ไหล่หลัง', sets: 4, reps: 15 },
      { muscle: 'Arms', keyword: 'พับแขน', sets: 3, reps: 12 },
      { muscle: 'Arms', keyword: 'ค้อน', sets: 3, reps: 12 }
    ]
  },
  {
    id: 'split-legs-core',
    title: '🦵 6. Complete Lower Body, Glutes & Core (ขาแข็งแกร่ง ก้นกระชับ หน้าท้องลีน)',
    badge: 'ตารางแยกส่วนมาตรฐาน (Legs & Core Split)',
    themeBorder: 'border-rose-500/50 hover:border-rose-600',
    themeHeaderBg: 'from-rose-950 via-slate-900 to-stone-950',
    themeBadge: 'bg-rose-400 text-slate-950',
    moduleCode: 'LEGS_CORE',
    suitableFor: 'นักวิ่ง, นักเดินป่าขึ้นเขา, ผู้หญิงที่ต้องการปั้นสะโพกและเรียวขาให้กระชับ และผู้ชายที่ต้องการสร้างฐานช่วงล่างให้สมส่วน',
    recommendedLevel: 'Beginner – Advanced',
    primaryMuscles: 'ต้นขาหน้า (Quads), ต้นขาด้านหลัง (Hamstrings), สะโพกและก้น 3 มัด (Glutes), น่อง (Calves), หน้าท้อง (Abs & Obliques)',
    sciencePrinciple: 'ครอบคลุมทั้งรูปแบบ Knee-Dominant (สควอท/ก้าวย่อ), Hip-Dominant (พับสะโพก/ดันสะโพก) และ Unilateral (ฝึกทีละข้างเพื่อแก้ปัญหาขาและสะโพกแข็งแรงไม่เท่ากัน)',
    coachingTip: 'ดันน้ำหนักผ่านส้นเท้าและกลางฝ่าเท้า ระวังไม่ให้หัวเข่าบิดเข้าด้านในขณะย่อหรือดันตัวขึ้น',
    inclineTarget: 9.0,
    durationTarget: 25,
    speedTarget: 3.3,
    recipe: [
      { muscle: 'Legs', keyword: 'สควอท', sets: 4, reps: 12 },
      { muscle: 'Legs', keyword: 'ขาเดียว', sets: 3, reps: 12 },
      { muscle: 'Legs', keyword: 'พับสะโพก', sets: 4, reps: 12 },
      { muscle: 'Legs', keyword: 'น่อง', sets: 4, reps: 20 },
      { muscle: 'Core', keyword: 'ยกเข่า', sets: 4, reps: 15 }
    ]
  },
  {
    id: 'fullbody-longevity',
    title: '⚡ 7. Full-Body Metabolic & Joint Longevity (ฟิตทั่วร่าง ครบจบในวันเดียว)',
    badge: 'เหมาะกับคนมีเวลาน้อย (ซ้อม 2–3 วัน/สัปดาห์)',
    themeBorder: 'border-purple-500/50 hover:border-purple-600',
    themeHeaderBg: 'from-purple-950 via-slate-900 to-indigo-950',
    themeBadge: 'bg-purple-400 text-slate-950',
    moduleCode: 'FULL_UPPER_CARDIO',
    suitableFor: 'คนทำงานที่มีเวลาเข้ายิมหรือออกกำลังกายเพียงสัปดาห์ละ 2–3 วัน แต่ต้องการกระตุ้นกล้ามเนื้อครบทุกส่วนทั่วร่างกายในครั้งเดียว',
    recommendedLevel: 'Beginner – Intermediate',
    primaryMuscles: 'ครบทั้ง 6 กลุ่มหลัก: ขา (Legs), อก (Chest), หลัง (Back), ไหล่ (Shoulders), แกนกลางลำตัว (Core) + ปอดและหัวใจ (Cardio)',
    sciencePrinciple: 'การฝึกแบบ Full-Body ช่วยให้แต่ละมัดกล้ามเนื้อถูกกระตุ้นบ่อยขึ้นต่อสัปดาห์ (High Frequency) รักษาระดับการเผาผลาญพื้นฐาน (BMR) ให้สูงต่อเนื่องโดยไม่ล้าสะสมเกินไป',
    coachingTip: 'สามารถจับคู่เล่นสลับบน-ล่าง (Upper-Lower Superset) เพื่อประหยัดเวลาซ้อมลงได้อีก 20%',
    inclineTarget: 7.5,
    durationTarget: 20,
    speedTarget: 3.6,
    recipe: [
      { muscle: 'Legs', keyword: 'สควอท', sets: 4, reps: 12 },
      { muscle: 'Chest', keyword: 'อกบน', sets: 4, reps: 12 },
      { muscle: 'Back', keyword: 'ดึง', sets: 4, reps: 12 },
      { muscle: 'Shoulders', keyword: 'เหนือศีรษะ', sets: 3, reps: 12 },
      { muscle: 'Core', keyword: 'แพลงก์', sets: 3, reps: 15 }
    ]
  },
  {
    id: 'alpine-endurance-standard',
    title: '🏔️ 8. Alpine Ridge & Heavy Pack Conditioning (ตารางมาตรฐานเตรียมเดินป่าระยะไกล)',
    badge: 'มาตรฐานนักเดินป่า & นักศึกษาสายลุยภาคสนาม',
    themeBorder: 'border-amber-500/50 hover:border-amber-600',
    themeHeaderBg: 'from-amber-950 via-emerald-950 to-slate-950',
    themeBadge: 'bg-amber-400 text-slate-950',
    moduleCode: 'LOWER_TRAIL',
    suitableFor: 'นักเดินป่า, นักศึกษาวนศาสตร์/ชีววิทยาภาคสนาม และผู้ที่ต้องเตรียมร่างกายแบกเป้ 10–15 กก. เดินขึ้นทางชันต่อเนื่องหลายชั่วโมง',
    recommendedLevel: 'Intermediate – Advanced',
    primaryMuscles: 'ต้นขาและหัวเข่ารับแรงกระแทกขาลง (Eccentric Quads), น่องไต่ความชัน (Gastrocnemius), หลังและบ่ารับน้ำหนักเป้ (Traps & Core)',
    sciencePrinciple: 'จำลองภาระกลศาสตร์ของการเดินไต่สันเขาจริง (Specificity Principle) เสริมความทนทานของเส้นเอ็นรอบข้อเข่า ข้อเท้า และกล้ามเนื้อแกนกลางลำตัวขณะแบกสัมภาระ',
    coachingTip: 'เน้นวอร์มข้อเท้าและสะโพก 2 ท่าแรกอย่างตั้งใจ และในท่าก้าวย่อให้คุมจังหวะย่อลงช้าๆ 3 วินาทีเพื่อเซฟเข่า',
    inclineTarget: 11.0,
    durationTarget: 35,
    speedTarget: 3.2,
    recipe: [
      { muscle: 'Legs', keyword: 'ขาเดียว', sets: 4, reps: 12 },
      { muscle: 'Legs', keyword: 'สควอท', sets: 4, reps: 12 },
      { muscle: 'Back', keyword: 'สะบัก', sets: 4, reps: 12 },
      { muscle: 'Legs', keyword: 'น่อง', sets: 4, reps: 20 },
      { muscle: 'Core', keyword: 'ปีนเขา', sets: 4, reps: 20 }
    ]
  }
]

// Helper คำนวณพลังงานของแต่ละท่าในหน้าพรีวิวตารางมาตรฐาน
function estimatePreviewItemKcal(item, userWeightKg = 70) {
  const weightFactor = (parseFloat(userWeightKg) || 70) / 70
  if (item.muscle === 'Cardio') {
    return analyzeCardioKinematics({
      durationMins: item.duration || 25,
      distanceKm: item.distance_km || 1.5,
      inclinePercent: item.incline || 7.5,
      userWeightKg: parseFloat(userWeightKg) || 70
    }).grossSmartwatchKcal
  }
  if (item.muscle === 'Warmup' || item.is_warmup) {
    return Math.round(14 * weightFactor)
  }
  const sets = parseInt(item.sets) || 3
  const basePerSet =
    item.muscle === 'Legs'
      ? 9.5
      : item.muscle === 'Back' || item.muscle === 'Chest'
        ? 8.0
        : 6.5
  return Math.round(sets * basePerSet * weightFactor * 1.05)
}

export default function ProgramGeneratorModal({ isOpen, onClose, onSelectProgram, profile }) {
  const [activeTab, setActiveTab] = useState('special')
  const [trailDifficultyFilter, setTrailDifficultyFilter] = useState('All')
  const [trailSearchTerm, setTrailSearchTerm] = useState('')
  const [vehicleFilter, setVehicleFilter] = useState('All')
  const [strictEquipmentMatch, setStrictEquipmentMatch] = useState(true)

  const [customPrograms, setCustomPrograms] = useState([])
  const [showBuilderForm, setShowBuilderForm] = useState(false)
  const [newProgTitle, setNewProgTitle] = useState('')
  const [newProgDesc, setNewProgDesc] = useState('')
  const [newProgTag, setNewProgTag] = useState('Trainer Special')
  const [builderExercises, setBuilderExercises] = useState([
    { name: MASTER_EXERCISE_LIBRARY[0].name, sets: 2, reps: 15 },
    { name: MASTER_EXERCISE_LIBRARY[10].name, sets: 4, reps: 12 },
    { name: MASTER_EXERCISE_LIBRARY[26].name, sets: 4, reps: 12 }
  ])
  const [isSavingProgram, setIsSavingProgram] = useState(false)

  const canCreateCustomProgram = profile?.role === 'master' || profile?.role === 'trainer'

  useEffect(() => {
    if (!isOpen) return
    fetchCustomPrograms()
  }, [isOpen])

  const fetchCustomPrograms = async () => {
    try {
      const { data } = await supabase
        .from('custom_programs')
        .select('*')
        .order('created_at', { ascending: false })
      if (Array.isArray(data)) setCustomPrograms(data)
    } catch {
      // ignore error
    }
  }

  if (!isOpen) return null

  const userGoal = profile?.goal || 'Fat Loss'
  const userWeightKg = parseFloat(profile?.weight_kg) || 70
  const userEquip =
    Array.isArray(profile?.available_equipment) && profile.available_equipment.length > 0
      ? profile.available_equipment
      : ['Dumbbell', 'Machine', 'Cardio', 'Bodyweight']

  const effectiveProfile = strictEquipmentMatch
    ? { ...profile, available_equipment: userEquip }
    : {
        ...profile,
        available_equipment: [
          'Dumbbell',
          'Barbell',
          'Machine',
          'Cable',
          'Calisthenics',
          'Cardio',
          'Bodyweight'
        ]
      }

  // ฟังก์ชันแนบชื่อโปรแกรม + บังคับใส่ท่าวอร์มร่างกายอัตโนมัติลงในทุกโปรแกรมก่อนส่งออก
  const handleConfirmSelectProgram = (items, programTitle, programCategory = 'Special Program') => {
    const cleanTitle = String(programTitle || 'โปรแกรมพิเศษ').trim()
    const withWarmup = injectWarmupIntoProgram(items, cleanTitle)
    const taggedItems = withWarmup.map(item => ({
      ...item,
      uuid: item.uuid || crypto.randomUUID(),
      program_title: cleanTitle,
      program_category: programCategory,
      notes: item.notes?.includes('[โปรแกรม:')
        ? item.notes
        : `[โปรแกรม: ${cleanTitle}] ${item.notes || item.description_th || ''}`.trim()
    }))

    onSelectProgram(taggedItems, {
      title: cleanTitle,
      category: programCategory
    })
    onClose()
  }

  const buildCustomRecipeExercises = (spec) => {
    const { items: strengthItems } = (spec.recipe || []).reduce(
      (acc, step) => {
        const candidates = filterAndAdaptExercise(step.muscle, step.keyword, effectiveProfile)
        const picked = candidates.find(c => !acc.seen.has(c.name)) || candidates[0]
        if (picked && !acc.seen.has(picked.name)) {
          const nextSeen = new Set(acc.seen)
          nextSeen.add(picked.name)
          const nextItem = {
            ...picked,
            sets: step.sets || picked.sets,
            reps: step.reps || picked.reps,
            uuid: crypto.randomUUID(),
            program_title: spec.title
          }
          return { seen: nextSeen, items: [...acc.items, nextItem] }
        }
        return acc
      },
      { seen: new Set(), items: [] }
    )

    const cardioBase =
      MASTER_EXERCISE_LIBRARY.find(e => e.name.includes('Incline Walk')) ||
      MASTER_EXERCISE_LIBRARY.find(e => e.muscle === 'Cardio')
    const dur = spec.durationTarget || 25
    const inc = spec.inclineTarget ?? 7.5
    const spd = spec.speedTarget || 3.5
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
      program_title: spec.title,
      notes: `[โปรแกรม: ${spec.title}] เดินชัน ${inc}% • ${dist} กม.`
    }
    return injectWarmupIntoProgram([...strengthItems, cardioItem], spec.title)
  }

  const buildPark30Exercises = (park) => {
    const defaultRecipe = [
      { muscle: 'Legs', keyword: 'สควอท', sets: 4, reps: 12 },
      { muscle: 'Legs', keyword: 'ขาเดียว', sets: 3, reps: 12 },
      { muscle: 'Back', keyword: 'ปีก', sets: 3, reps: 12 },
      { muscle: 'Legs', keyword: 'น่อง', sets: 4, reps: 20 },
      { muscle: 'Core', keyword: 'แพลงก์', sets: 3, reps: 15 }
    ]

    const progTitle = `🏔️ จำลองเดินป่า: ${park.name} (จ.${park.province})`

    const { items: strengthItems } = defaultRecipe.reduce(
      (acc, step) => {
        const candidates = filterAndAdaptExercise(step.muscle, step.keyword, effectiveProfile)
        const picked = candidates.find(c => !acc.seen.has(c.name)) || candidates[0]
        if (picked && !acc.seen.has(picked.name)) {
          const nextSeen = new Set(acc.seen)
          nextSeen.add(picked.name)
          return {
            seen: nextSeen,
            items: [
              ...acc.items,
              {
                ...picked,
                sets: step.sets,
                reps: step.reps,
                uuid: crypto.randomUUID(),
                program_title: progTitle
              }
            ]
          }
        }
        return acc
      },
      { seen: new Set(), items: [] }
    )

    const cardioBase =
      MASTER_EXERCISE_LIBRARY.find(e => e.name.includes('Incline Walk')) ||
      MASTER_EXERCISE_LIBRARY.find(e => e.muscle === 'Cardio')
    const dur = park.difficulty === 'Advanced' ? 40 : park.difficulty === 'Intermediate' ? 30 : 25
    const inc = park.avgInclinePct || 8.0
    const spd = inc >= 10 ? 3.1 : 3.5
    const dist = park.distanceKm || Number(((dur / 60) * spd).toFixed(2))

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
      program_title: progTitle,
      notes: `[โปรแกรม: ${progTitle}] ชัน ${inc}% • ระยะซ้อม ${dist} กม.`
    }
    return injectWarmupIntoProgram([...strengthItems, cardioItem], progTitle)
  }

  const buildTrainerCustomExercises = (prog) => {
    const rawList = Array.isArray(prog.exercises) ? prog.exercises : []
    const progTitle = `👑 ${prog.title} (โดย ${prog.creator_name})`
    const mapped = rawList.map(entry => {
      const matchedLib =
        MASTER_EXERCISE_LIBRARY.find(e => e.name === entry.name) || MASTER_EXERCISE_LIBRARY[0]
      const personalized = personalizeExercisePrescription(
        matchedLib,
        profile?.weight_kg || 70,
        profile?.fitness_level || 'Intermediate',
        profile?.session_mins || 60,
        userGoal,
        [],
        profile
      )
      return {
        ...personalized,
        sets: parseInt(entry.sets) || personalized.sets,
        reps: parseInt(entry.reps) || personalized.reps,
        duration: parseInt(entry.duration) || personalized.duration || 25,
        incline: parseFloat(entry.incline) || personalized.incline || 7.5,
        uuid: crypto.randomUUID(),
        program_title: progTitle,
        notes: `[โปรแกรม: ${progTitle}] ${prog.team_name} ${prog.team_icon || ''}`
      }
    })
    return injectWarmupIntoProgram(mapped, progTitle)
  }

  const buildScienceBlueprintExercises = (blueprint) => {
    if (Array.isArray(blueprint.recipe) && blueprint.recipe.length > 0) {
      return buildCustomRecipeExercises(blueprint)
    }
    const generated = generateWorkoutItemsForModule(blueprint.moduleCode, effectiveProfile)
    if (generated.length > 0) {
      return injectWarmupIntoProgram(
        generated.map(it => ({ ...it, program_title: blueprint.title })),
        blueprint.title
      )
    }
    const fallback = MASTER_EXERCISE_LIBRARY.slice(10, 15).map(ex => ({
      ...personalizeExercisePrescription(
        ex,
        profile?.weight_kg,
        profile?.fitness_level,
        profile?.session_mins,
        userGoal
      ),
      program_title: blueprint.title
    }))
    return injectWarmupIntoProgram(fallback, blueprint.title)
  }

  const handleAddBuilderRow = () =>
    setBuilderExercises(prev => [
      ...prev,
      { name: MASTER_EXERCISE_LIBRARY[10].name, sets: 3, reps: 12 }
    ])
  const handleUpdateBuilderRow = (idx, field, val) =>
    setBuilderExercises(prev =>
      prev.map((row, i) => (i === idx ? { ...row, [field]: val } : row))
    )
  const handleRemoveBuilderRow = (idx) =>
    setBuilderExercises(prev => prev.filter((_, i) => i !== idx))

  const handleSaveCustomProgram = async (e) => {
    e.preventDefault()
    if (!newProgTitle.trim() || builderExercises.length === 0) return
    setIsSavingProgram(true)

    const creatorDisplayName =
      profile?.display_name ||
      (profile?.email ? profile.email.split('@')[0] : 'Master Trainer')
    const teamName = profile?.team_name || 'ทีมอิสระ'
    const teamColor = profile?.team_color || 'emerald'
    const teamIcon = profile?.team_icon || '🌲'

    const payload = {
      creator_id: profile?.id || null,
      creator_name: creatorDisplayName,
      team_name: teamName,
      team_color: teamColor,
      team_icon: teamIcon,
      title: newProgTitle.trim(),
      category_tag: newProgTag,
      target_goal: userGoal,
      description: newProgDesc.trim() || 'ออกแบบพิเศษปรับน้ำหนักอัตโนมัติ (พร้อมท่าวอร์มร่างกาย)',
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
    setShowBuilderForm(false)
    setIsSavingProgram(false)
  }

  const handleDeleteCustomProgram = async (progId) => {
    if (!window.confirm('ยืนยันการลบโปรแกรมนี้?')) return
    await supabase.from('custom_programs').delete().eq('id', progId)
    setCustomPrograms(prev => prev.filter(p => p.id !== progId))
  }

  const filteredParks30 = THAI_FOREST_EXPEDITIONS_30.filter(p => {
    const matchLevel = trailDifficultyFilter === 'All' || p.difficulty === trailDifficultyFilter
    const matchVehicle = vehicleFilter === 'All' || p.vehicleAccess === vehicleFilter
    const kw = trailSearchTerm.trim().toLowerCase()
    const matchSearch =
      !kw || p.name.toLowerCase().includes(kw) || p.province.toLowerCase().includes(kw)
    return matchLevel && matchVehicle && matchSearch
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-xs">
      <div className="flex flex-col w-full max-w-5xl bg-white border border-slate-200 max-h-[92vh] rounded-3xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-4 text-white bg-slate-900">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[10px] font-black text-slate-950 bg-emerald-400 rounded uppercase">
                AUTO WARM-UP INCLUDED • 30 PARKS • 13 VIRAL/HERO • 8 BLUEPRINTS
              </span>
              <h2 className="text-lg font-extrabold">
                คลังโปรแกรมพิเศษสุดครีเอทีฟ • จำลองเดินป่า 30 อุทยาน
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              ทุกโปรแกรมจะจัด **🔥 ท่าวอร์มร่างกายก่อนฝึก 2 ท่าแรก** พร้อมคู่มือเซ็ตวอร์มสำหรับมือใหม่ให้อัตโนมัติ
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white text-lg font-bold"
          >
            ✕
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="p-4 border-b bg-slate-50 border-slate-200 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveTab('special')}
                className={`px-3.5 py-2 text-xs font-extrabold rounded-xl border transition ${
                  activeTab === 'special'
                    ? 'bg-pink-600 text-white border-pink-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-300'
                }`}
              >
                🔥 1. โปรแกรมพิเศษ & ฮีโร่ ({SPECIAL_CREATIVE_BLUEPRINTS.length})
              </button>
              <button
                onClick={() => setActiveTab('trail30')}
                className={`px-3.5 py-2 text-xs font-extrabold rounded-xl border transition ${
                  activeTab === 'trail30'
                    ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-300'
                }`}
              >
                🏔️ 2. ภารกิจเดินป่า 30 อุทยานทั่วไทย
              </button>
              <button
                onClick={() => setActiveTab('custom_trainer')}
                className={`px-3.5 py-2 text-xs font-extrabold rounded-xl border transition ${
                  activeTab === 'custom_trainer'
                    ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-300'
                }`}
              >
                👑 3. โปรแกรมเทรนเนอร์ ({customPrograms.length})
              </button>
              <button
                onClick={() => setActiveTab('science')}
                className={`px-3.5 py-2 text-xs font-extrabold rounded-xl border transition ${
                  activeTab === 'science'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-300'
                }`}
              >
                🧬 4. ตารางมาตรฐาน ({COMPREHENSIVE_BLUEPRINTS.length})
              </button>
            </div>
            <label className="flex items-center gap-2 text-xs font-bold text-emerald-900 bg-emerald-100/80 px-3 py-1.5 rounded-xl border border-emerald-300 cursor-pointer">
              <input
                type="checkbox"
                checked={strictEquipmentMatch}
                onChange={(e) => setStrictEquipmentMatch(e.target.checked)}
                className="w-4 h-4 accent-emerald-700"
              />
              คัดกรองเฉพาะอุปกรณ์ที่มีจริง
            </label>
          </div>

          {/* แถบค้นหา 30 อุทยาน & ฟิลเตอร์รถ */}
          {activeTab === 'trail30' && (
            <div className="space-y-3 pt-2 border-t border-slate-200">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={trailSearchTerm}
                  onChange={(e) => setTrailSearchTerm(e.target.value)}
                  placeholder="ค้นหาชื่ออุทยาน / จังหวัด..."
                  className="flex-1 min-w-[200px] px-3.5 py-1.5 text-xs font-bold bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />

                {/* 🚗 Vehicle Access Filter */}
                <div className="flex items-center bg-white border border-slate-300 rounded-xl p-0.5 shadow-sm">
                  {[
                    { id: 'All', label: 'ทุกพาหนะ' },
                    { id: 'sedan', label: '🚗 รถเก๋งถึง' },
                    { id: '4x4', label: '🛻 ต้อง 4x4' },
                    { id: 'boat_walk', label: '🚤 นั่งเรือ/เดิน' }
                  ].map(v => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setVehicleFilter(v.id)}
                      className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition ${
                        vehicleFilter === v.id
                          ? 'bg-slate-800 text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'All', label: 'ระดับความชันทั้งหมด' },
                  { id: 'Beginner', label: '🟢 เดินง่าย' },
                  { id: 'Intermediate', label: '🟡 ปานกลาง' },
                  { id: 'Advanced', label: '🔴 โหด/ชันสูง' }
                ].map(lv => (
                  <button
                    key={lv.id}
                    type="button"
                    onClick={() => setTrailDifficultyFilter(lv.id)}
                    className={`px-3 py-1 text-[10px] font-bold rounded-lg border transition ${
                      trailDifficultyFilter === lv.id
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-600 border-slate-300'
                    }`}
                  >
                    {lv.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Content List */}
        <div className="flex-1 p-5 space-y-4 overflow-y-auto bg-slate-100/80">
          
          {/* TAB 1: โปรแกรมพิเศษ & ฮีโร่ */}
          {activeTab === 'special' &&
            SPECIAL_CREATIVE_BLUEPRINTS.map((spec) => {
              const previewItems = buildCustomRecipeExercises(spec)
              const isViral = spec.category === 'Viral Special'
              const totalKcal = previewItems.reduce(
                (sum, it) => sum + estimatePreviewItemKcal(it, userWeightKg),
                0
              )
              const totalMins = previewItems.reduce(
                (sum, it) => sum + estimateExerciseDurationMins(it),
                0
              )

              return (
                <div
                  key={spec.id}
                  className={`p-5 bg-white border-2 rounded-2xl shadow-xs transition ${
                    isViral
                      ? 'border-pink-500/40 hover:border-pink-600'
                      : 'border-indigo-500/30 hover:border-indigo-600'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                    <div className="space-y-1.5 max-w-2xl">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-black uppercase rounded-md ${
                            isViral ? 'bg-pink-600 text-white' : 'bg-indigo-600 text-white'
                          }`}
                        >
                          {isViral ? '✨ SPECIAL EDITION' : '🦸‍♂️ HERO EDITION'}
                        </span>
                        <span className="px-2 py-0.5 text-[10px] font-black text-amber-950 bg-amber-300 rounded-md">
                          🔥 รวมท่าวอร์มร่างกาย 2 ท่าแรกแล้ว
                        </span>
                        <h3 className="text-base font-black text-slate-900">{spec.title}</h3>
                      </div>
                      <p
                        className={`text-xs font-extrabold ${
                          isViral ? 'text-pink-700' : 'text-indigo-700'
                        }`}
                      >
                        🎯 โฟกัสสัดส่วน: {spec.physiqueFocus}
                      </p>
                      <p className="text-xs text-slate-600">{spec.description}</p>
                      <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-bold">
                        <span className="px-2.5 py-0.5 bg-orange-50 text-orange-800 border border-orange-200 rounded-md">
                          🔥 เผาผลาญรวม ~{totalKcal} kcal
                        </span>
                        <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-800 border border-indigo-200 rounded-md">
                          ⏱️ เวลาฝึก ~{totalMins} นาที
                        </span>
                        <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md">
                          💪 {previewItems.length} ขั้นตอน (วอร์ม 2 + ท่าหลัก {previewItems.length - 2})
                        </span>
                      </div>
                      {spec.specialProtocol && (
                        <div className="p-3 mt-2 text-xs font-semibold text-amber-950 bg-amber-50 border border-amber-300 rounded-xl">
                          {spec.specialProtocol}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        handleConfirmSelectProgram(previewItems, spec.title, spec.category)
                      }
                      className={`px-5 py-2.5 text-xs font-extrabold text-white rounded-xl shrink-0 shadow-xs transition ${
                        isViral
                          ? 'bg-pink-600 hover:bg-pink-700'
                          : 'bg-indigo-600 hover:bg-indigo-700'
                      }`}
                    >
                      ⚡ โหลดโปรแกรมนี้ลงตาราง
                    </button>
                  </div>

                  {/* แสดงรายการท่าในโปรแกรมพิเศษ (ไฮไลท์ท่าวอร์มสีเหลืองทอง) */}
                  <div className="flex flex-wrap gap-1.5 pt-2.5 border-t border-slate-100">
                    {previewItems.map((ex, i) => {
                      const isWarmup = ex.muscle === 'Warmup' || ex.is_warmup
                      return (
                        <span
                          key={i}
                          className={`px-2.5 py-1 text-[10px] font-bold border rounded-lg ${
                            isWarmup
                              ? 'text-amber-950 bg-amber-100 border-amber-300'
                              : 'text-slate-700 bg-slate-50 border-slate-200'
                          }`}
                        >
                          {i + 1}. {(ex.name || ex.exercise_name || '').split('(')[0].trim()} ({isWarmup ? 'Warm-up' : ex.muscle})
                        </span>
                      )
                    })}
                  </div>
                </div>
              )
            })}

          {/* TAB 2: จำลองการเดินป่า 30 แห่ง */}
          {activeTab === 'trail30' &&
            filteredParks30.map((park) => {
              const previewItems = buildPark30Exercises(park)
              const progTitle = `🏔️ จำลองเดินป่า: ${park.name} (จ.${park.province})`
              const badgeColor =
                park.difficulty === 'Advanced'
                  ? 'bg-rose-100 text-rose-800 border-rose-300'
                  : park.difficulty === 'Intermediate'
                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                    : 'bg-emerald-100 text-emerald-800 border-emerald-300'
              const vehicleLabel =
                park.vehicleAccess === 'sedan'
                  ? '🚗 รถเก๋งเข้าถึง'
                  : park.vehicleAccess === '4x4'
                    ? '🛻 กระบะ 4x4'
                    : '🚤 นั่งเรือ / เดินเท้า'

              return (
                <div
                  key={park.id}
                  className="flex flex-col sm:flex-row bg-white border-2 border-emerald-600/30 rounded-2xl shadow-xs hover:border-emerald-600 transition overflow-hidden p-1.5 gap-4"
                >
                  <ParkImageBanner wikiTitles={park.wikiTitles} name={park.name} />
                  <div className="flex-1 p-3 space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-black text-slate-900">{park.name}</h3>
                          <span
                            className={`px-2 py-0.5 text-[10px] font-extrabold border rounded-md ${badgeColor}`}
                          >
                            {park.difficulty}
                          </span>
                          <span className="px-2 py-0.5 text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-300 rounded-md">
                            {vehicleLabel}
                          </span>
                          <span className="px-2 py-0.5 text-[10px] font-black text-amber-950 bg-amber-300 rounded-md">
                            🔥 รวมวอร์มข้อเท้า/สะโพกแล้ว
                          </span>
                        </div>
                        <p className="text-xs font-bold text-emerald-700">
                          ⛰️ ความสูง {park.elevationM.toLocaleString()} ม. • ระยะเดิน{' '}
                          {park.distanceKm} กม. • ชัน {park.avgInclinePct}%
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <a
                          href={`https://www.youtube.com/results?search_query=${encodeURIComponent('เดินป่า ' + park.name)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 text-[10px] font-extrabold text-white bg-rose-600 hover:bg-rose-500 rounded-lg"
                        >
                          ▶ คลิปแรงบันดาลใจ
                        </a>
                        <button
                          type="button"
                          onClick={() =>
                            handleConfirmSelectProgram(previewItems, progTitle, 'Trail 30 Parks')
                          }
                          className="px-4 py-1.5 text-[11px] font-extrabold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs"
                        >
                          🏔️ โหลดตารางซ้อมที่นี่
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 border-t border-slate-100 pt-3">
                      {previewItems.map((ex, i) => {
                        const isWarmup = ex.muscle === 'Warmup' || ex.is_warmup
                        return (
                          <span
                            key={i}
                            className={`px-2 py-1 text-[10px] font-bold border rounded ${
                              isWarmup
                                ? 'text-amber-950 bg-amber-100 border-amber-300'
                                : 'text-slate-600 bg-emerald-50 border-emerald-100'
                            }`}
                          >
                            {i + 1}. {(ex.name || ex.exercise_name || '').split('(')[0]}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })}

          {/* TAB 3: Trainer Custom */}
          {activeTab === 'custom_trainer' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-900 text-white rounded-2xl">
                <div>
                  <h3 className="text-sm font-black">👑 คลังโปรแกรมจาก Trainer & Master (แนบท่าวอร์มอัตโนมัติ)</h3>
                </div>
                {canCreateCustomProgram && (
                  <button
                    type="button"
                    onClick={() => setShowBuilderForm(prev => !prev)}
                    className="px-4 py-2 text-xs font-extrabold text-slate-900 bg-emerald-400 rounded-xl hover:bg-emerald-300 transition"
                  >
                    {showBuilderForm ? '✕ ปิดแผง' : '+ สร้างโปรแกรม'}
                  </button>
                )}
              </div>

              {showBuilderForm && canCreateCustomProgram && (
                <form
                  onSubmit={handleSaveCustomProgram}
                  className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-4"
                >
                  <div>
                    <label className="block text-xs font-extrabold text-emerald-900 mb-1">
                      1. ชื่อโปรแกรม
                    </label>
                    <input
                      type="text"
                      required
                      value={newProgTitle}
                      onChange={(e) => setNewProgTitle(e.target.value)}
                      className="w-full px-3 py-2 text-sm font-bold bg-white border border-emerald-300 rounded-xl outline-none"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-extrabold text-emerald-900">
                        2. ท่าฝึก (เลือกท่าวอร์มจากคลังได้ หรือระบบจะเติมท่าวอร์มให้อัตโนมัติ)
                      </label>
                      <button
                        type="button"
                        onClick={handleAddBuilderRow}
                        className="px-3 py-1 text-[10px] font-bold text-white bg-slate-800 rounded-lg"
                      >
                        + เพิ่มท่าฝึก
                      </button>
                    </div>
                    <div className="space-y-2">
                      {builderExercises.map((row, idx) => (
                        <div
                          key={idx}
                          className="flex flex-wrap items-center gap-2 p-2 bg-white border border-emerald-200 rounded-xl"
                        >
                          <span className="w-6 text-xs font-black text-center text-emerald-700">
                            {idx + 1}.
                          </span>
                          <select
                            value={row.name}
                            onChange={(e) => handleUpdateBuilderRow(idx, 'name', e.target.value)}
                            className="flex-1 min-w-[200px] px-2 py-1 text-xs font-bold border border-slate-300 rounded-lg outline-none"
                          >
                            {MASTER_EXERCISE_LIBRARY.map(ex => (
                              <option key={ex.name} value={ex.name}>
                                {ex.muscle === 'Warmup' ? `🔥 [Warm-up] ${ex.name}` : ex.name}
                              </option>
                            ))}
                          </select>
                          <input
                            type="number"
                            min="1"
                            value={row.sets}
                            onChange={(e) =>
                              handleUpdateBuilderRow(idx, 'sets', parseInt(e.target.value) || 1)
                            }
                            className="w-12 px-2 py-1 text-xs text-center border border-slate-300 rounded-lg"
                          />
                          <input
                            type="number"
                            min="1"
                            value={row.reps}
                            onChange={(e) =>
                              handleUpdateBuilderRow(idx, 'reps', parseInt(e.target.value) || 1)
                            }
                            className="w-12 px-2 py-1 text-xs text-center border border-slate-300 rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveBuilderRow(idx)}
                            className="p-1.5 text-rose-500 hover:text-rose-700"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={isSavingProgram || builderExercises.length === 0}
                    className="w-full py-3 text-sm font-black text-white bg-emerald-700 rounded-xl hover:bg-emerald-800 shadow-md"
                  >
                    {isSavingProgram ? 'กำลังบันทึก...' : '💾 บันทึกและเผยแพร่'}
                  </button>
                </form>
              )}

              {customPrograms.map(prog => {
                const trainerItems = buildTrainerCustomExercises(prog)
                const progTitle = `👑 ${prog.title} (โดย ${prog.creator_name})`
                return (
                  <div
                    key={prog.id}
                    className="p-5 bg-white border-2 border-slate-200 rounded-2xl hover:border-amber-400 transition"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-black text-slate-900">{prog.title}</h3>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs font-bold text-slate-600">
                            โดย: {prog.creator_name}
                          </span>
                          <span
                            className={`px-2 py-0.5 text-[10px] font-black border rounded-lg ${getTeamBadgeClasses(prog.team_color)}`}
                          >
                            {prog.team_name} {prog.team_icon}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            handleConfirmSelectProgram(trainerItems, progTitle, 'Trainer Program')
                          }
                          className="px-5 py-2.5 text-xs font-extrabold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-xl shadow-xs"
                        >
                          ⚡ เลือกตารางของโค้ช
                        </button>
                        {canCreateCustomProgram && (
                          <button
                            type="button"
                            onClick={() => handleDeleteCustomProgram(prog.id)}
                            className="p-2 text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl hover:bg-rose-100"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* =====================================================================
              TAB 4: ตารางมาตรฐานทางวิทยาศาสตร์การกีฬา (แสดงรายละเอียดครบทุกท่า + ท่าวอร์มร่างกายสำหรับมือใหม่)
             ===================================================================== */}
          {activeTab === 'science' && (
            <div className="space-y-5">
              {/* Banner แนะนำหมวดตารางมาตรฐาน */}
              <div className="p-4 bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white rounded-2xl border border-emerald-800/60 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="px-2.5 py-0.5 text-[10px] font-black bg-emerald-400 text-slate-950 rounded uppercase">
                    EVIDENCE-BASED SPORTS SCIENCE BLUEPRINTS + BEGINNER WARM-UP
                  </span>
                  <h3 className="text-sm sm:text-base font-black mt-1">
                    🧬 ตารางออกกำลังกายมาตรฐาน 8 รูปแบบ (พร้อมท่าวอร์มร่างกาย 2 ท่าแรก • วิเคราะห์มัดกล้ามเนื้อ • พลังงานที่เผาผลาญ • กลุ่มเป้าหมาย)
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    คำนวณแคลอรี่และปริมาณไขมันที่สลายตามน้ำหนักตัวจริงของคุณ ({userWeightKg} kg) พร้อมคู่มือการวอร์มสำหรับมือใหม่ครบทุกตาราง
                  </p>
                </div>
              </div>

              <div className="space-y-5">
                {COMPREHENSIVE_BLUEPRINTS.map((bp) => {
                  const previewItems = buildScienceBlueprintExercises(bp)
                  const totalKcal = previewItems.reduce(
                    (sum, it) => sum + estimatePreviewItemKcal(it, userWeightKg),
                    0
                  )
                  const totalFatGrams = Number((totalKcal / 7.7).toFixed(1))
                  const totalMins = previewItems.reduce(
                    (sum, it) => sum + estimateExerciseDurationMins(it),
                    0
                  )
                  const totalSets = previewItems.reduce(
                    (sum, it) => sum + (it.muscle === 'Cardio' ? 1 : parseInt(it.sets) || 2),
                    0
                  )
                  const uniqueMuscles = Array.from(
                    new Set(previewItems.map(it => it.muscle))
                  )

                  return (
                    <div
                      key={bp.id}
                      className={`bg-white border-2 rounded-3xl shadow-sm overflow-hidden transition ${bp.themeBorder}`}
                    >
                      {/* ส่วนหัวการ์ดตารางมาตรฐาน */}
                      <div
                        className={`p-5 bg-gradient-to-r ${bp.themeHeaderBg} text-white flex flex-wrap items-start justify-between gap-4`}
                      >
                        <div className="space-y-1.5 max-w-2xl">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`px-2.5 py-0.5 text-[10px] font-black rounded-md uppercase ${bp.themeBadge}`}
                            >
                              {bp.badge}
                            </span>
                            <span className="px-2.5 py-0.5 text-[10px] font-bold bg-white/15 text-emerald-200 rounded-md">
                              📊 {bp.recommendedLevel}
                            </span>
                            <span className="px-2.5 py-0.5 text-[10px] font-black bg-amber-400 text-slate-950 rounded-md">
                              🔥 มีท่าวอร์มก่อนฝึก 2 ท่าแรก
                            </span>
                          </div>
                          <h3 className="text-base sm:text-lg font-black text-white">
                            {bp.title}
                          </h3>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            handleConfirmSelectProgram(
                              previewItems,
                              bp.title,
                              'Standard Science Blueprint'
                            )
                          }
                          className="px-5 py-2.5 text-xs font-black text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl shadow-md transition shrink-0"
                        >
                          ⚡ เลือกใช้ตารางมาตรฐานนี้ทันที
                        </button>
                      </div>

                      {/* แถบตัวเลขสรุป KPI ของตารางนี้ */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-4 bg-slate-950 text-white border-b border-slate-800">
                        <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                          <span className="text-[10px] font-bold text-orange-300 uppercase block">
                            🔥 พลังงานที่เผาผลาญรวม
                          </span>
                          <span className="text-lg font-black text-orange-400">
                            ~{totalKcal.toLocaleString()} kcal
                          </span>
                        </div>

                        <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                          <span className="text-[10px] font-bold text-amber-300 uppercase block">
                            💧 ไขมันที่สลายประเมิน
                          </span>
                          <span className="text-lg font-black text-amber-300">
                            ~{totalFatGrams} กรัม
                          </span>
                        </div>

                        <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                          <span className="text-[10px] font-bold text-sky-300 uppercase block">
                            ⏱️ ระยะเวลาฝึกรวม
                          </span>
                          <span className="text-lg font-black text-sky-300">
                            ~{totalMins} นาที
                          </span>
                        </div>

                        <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                          <span className="text-[10px] font-bold text-emerald-300 uppercase block">
                            🏋️‍♂️ ปริมาณท่าฝึกทั้งหมด
                          </span>
                          <span className="text-lg font-black text-emerald-400">
                            {previewItems.length} ท่า ({totalSets} เซ็ต)
                          </span>
                        </div>
                      </div>

                      {/* เนื้อหาเจาะลึก: เหมาะกับกลุ่มไหน + ได้ส่วนไหนบ้าง + หลักการวิทยาศาสตร์ */}
                      <div className="p-5 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                          <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-1">
                            <span className="font-black text-emerald-900 block">
                              👥 เหมาะสมกับกลุ่มไหน (Target Audience):
                            </span>
                            <p className="text-slate-700 leading-relaxed font-medium">
                              {bp.suitableFor}
                            </p>
                          </div>

                          <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-1">
                            <span className="font-black text-indigo-900 block">
                              💪 ได้กล้ามเนื้อส่วนไหนบ้าง (Muscles Worked):
                            </span>
                            <p className="text-slate-700 leading-relaxed font-medium">
                              {bp.primaryMuscles}
                            </p>
                            <div className="flex flex-wrap gap-1 pt-1">
                              {uniqueMuscles.map(m => (
                                <span
                                  key={m}
                                  className={`px-2 py-0.5 text-[10px] font-black rounded-md ${
                                    m === 'Warmup'
                                      ? 'bg-amber-400 text-slate-950'
                                      : 'bg-indigo-600 text-white'
                                  }`}
                                >
                                  {m === 'Warmup' ? '🔥 Warm-up' : m}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-2xl space-y-1">
                            <span className="font-black text-amber-950 block">
                              🧬 กลไกวิทยาศาสตร์ & เทคนิคการฝึก:
                            </span>
                            <p className="text-slate-700 leading-relaxed">
                              {bp.sciencePrinciple}
                            </p>
                            <p className="text-[11px] font-bold text-amber-900 pt-1">
                              💡 {bp.coachingTip}
                            </p>
                          </div>
                        </div>

                        {/* รายการท่าฝึกทุกท่าในตารางมาตรฐาน พร้อมไฮไลท์ท่าวอร์ม 2 ท่าแรก */}
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-slate-900 uppercase">
                              📋 ลำดับการฝึกทั้ง {previewItems.length} ขั้นตอน (เริ่มจากท่าวอร์มร่างกาย 2 ท่าแรก → ท่าเวทหลัก → คาร์ดิโอ):
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {previewItems.map((ex, idx) => {
                              const itemKcal = estimatePreviewItemKcal(ex, userWeightKg)
                              const itemMins = estimateExerciseDurationMins(ex)
                              const isCardio = ex.muscle === 'Cardio'
                              const isWarmup = ex.muscle === 'Warmup' || ex.is_warmup

                              return (
                                <div
                                  key={ex.uuid || idx}
                                  className={`flex flex-col gap-2 p-3 border rounded-2xl transition ${
                                    isWarmup
                                      ? 'bg-amber-50/80 border-amber-300 hover:border-amber-500'
                                      : 'bg-slate-50 border-slate-200 hover:border-emerald-400'
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <ExerciseIllustration
                                      name={ex.name || ex.exercise_name}
                                      muscle={isWarmup ? 'Shoulders' : ex.muscle}
                                      type={ex.type}
                                      size="sm"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <div className="text-xs font-black text-slate-900 truncate">
                                        {idx + 1}. {ex.name || ex.exercise_name}
                                      </div>
                                      <div className="text-[11px] font-bold text-emerald-700 truncate mt-0.5">
                                        🎯 ได้ส่วน: {ex.sub_muscle || ex.muscle}
                                      </div>
                                      <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[10px] font-extrabold">
                                        <span
                                          className={`px-2 py-0.5 rounded ${
                                            isWarmup
                                              ? 'bg-amber-500 text-slate-950'
                                              : 'bg-slate-900 text-white'
                                          }`}
                                        >
                                          {isCardio
                                            ? `เดินชัน ${ex.incline}% • ${ex.duration} นาที (${ex.distance_km} กม.)`
                                            : `${ex.sets} เซ็ต × ${ex.reps}`}
                                        </span>
                                        <span className="px-2 py-0.5 bg-orange-100 text-orange-800 border border-orange-300 rounded">
                                          🔥 {itemKcal} kcal
                                        </span>
                                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-800 border border-indigo-200 rounded">
                                          ⏱️ ~{itemMins} น.
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {isWarmup && ex.description_th && (
                                    <div className="p-2 text-[10px] font-semibold text-amber-950 bg-white/90 border border-amber-200 rounded-xl leading-relaxed">
                                      {ex.description_th}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}