import { useState } from 'react'

// Pure Function สร้างลิงก์ค้นหาวิดีโอสอนท่าออกกำลังกายบน YouTube
export function getExerciseYouTubeUrl(exerciseName = '') {
  const cleanEnglishName = exerciseName.split('(')[0].trim() || exerciseName
  const query = encodeURIComponent(`${cleanEnglishName} exercise form tutorial`)
  return `https://www.youtube.com/results?search_query=${query}`
}

// คลังภาพถ่ายจริงอ้างอิงตามรูปแบบชีวกลศาสตร์ของท่าฝึก (High-Availability Fitness Photography)
const BIOMECHANICAL_REAL_PHOTOS = {
  VERTICAL_PULL_WIDE: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=900&q=80',
  VERTICAL_PULL_CLOSE: 'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?auto=format&fit=crop&w=900&q=80',
  HORIZONTAL_ROW: 'https://images.unsplash.com/photo-1605296867304-46d5465a13f1?auto=format&fit=crop&w=900&q=80',
  INCLINE_PRESS: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=900&q=80',
  FLAT_PRESS_WIDE: 'https://images.unsplash.com/photo-1534368420009-621bfab424a8?auto=format&fit=crop&w=900&q=80',
  CLOSE_GRIP_PRESS: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=900&q=80',
  CHEST_FLY: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?auto=format&fit=crop&w=900&q=80',
  PUSHUP_DIP: 'https://images.unsplash.com/photo-1598971639058-fab3c3109a00?auto=format&fit=crop&w=900&q=80',
  SHOULDER_PRESS: 'https://images.unsplash.com/photo-1532029837206-abbe2b7620e3?auto=format&fit=crop&w=900&q=80',
  LATERAL_RAISE: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=900&q=80',
  SHRUG_FARMER: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=900&q=80',
  BICEP_CURL: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=900&q=80',
  TRICEPS_PUSHDOWN: 'https://images.unsplash.com/photo-1530822847156-5df684ec5ee1?auto=format&fit=crop&w=900&q=80',
  TRICEPS_OVERHEAD: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=900&q=80',
  TRICEPS_KICKBACK: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=900&q=80',
  TRICEPS_SKULLCRUSHER: 'https://images.unsplash.com/photo-1534368420009-621bfab424a8?auto=format&fit=crop&w=900&q=80',
  SQUAT_BILATERAL: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?auto=format&fit=crop&w=900&q=80',
  LUNGE_UNILATERAL: 'https://images.unsplash.com/photo-1434682881908-b43d0467b798?auto=format&fit=crop&w=900&q=80',
  HIP_THRUST_GLUTE: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=900&q=80',
  DEADLIFT_HINGE: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=900&q=80',
  LEG_ISOLATION: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?auto=format&fit=crop&w=900&q=80',
  CORE_CRUNCH: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=900&q=80',
  CARDIO_INCLINE: 'https://images.unsplash.com/photo-1538805060514-97d9cc17730c?auto=format&fit=crop&w=900&q=80'
}

// ============================================================================
// PURE BIOMECHANICAL CLASSIFIER: จำแนกครบ 23 รูปแบบการเคลื่อนไหวและระยะห่างมือจับ
// ============================================================================
export function classifyExerciseBiomechanics(name = '', muscle = 'Chest') {
  const n = (name || '').toLowerCase()
  const isCloseGrip =
    n.includes('close-grip') ||
    n.includes('close grip') ||
    n.includes('v-bar') ||
    n.includes('underhand') ||
    n.includes('chin-up') ||
    n.includes('diamond') ||
    n.includes('จับแคบ') ||
    n.includes('หงายมือ') ||
    n.includes('ชิด')

  // 1. ตรวจสอบท่าเฉพาะของแขน (Arms: แยกหลังแขน 4 รูปแบบ ออกจากหน้าแขนอย่างเด็ดขาด)
  if (muscle === 'Arms' || n.includes('triceps') || n.includes('หลังแขน') || n.includes('skullcrusher') || n.includes('pushdown')) {
    if (n.includes('overhead') || n.includes('ข้ามศีรษะ') || n.includes('เหนือศีรษะ')) {
      return {
        pattern: 'TRICEPS_OVERHEAD',
        gripMode: 'close',
        postureTh: 'ชูต้นแขนข้างใบหู เหยียดดัมเบลขึ้นเหนือศีรษะ',
        vectorLabel: 'ทิศทางออกแรง: ล็อกศอกชี้ขึ้นฟ้า ออกแรงหลังแขนดันดัมเบลขึ้นตรงๆ ↑ • ผ่อนลงหลังศีรษะ ↓',
        photoUrl: BIOMECHANICAL_REAL_PHOTOS.TRICEPS_OVERHEAD
      }
    }
    if (n.includes('kickback') || n.includes('เตะดัมเบล')) {
      return {
        pattern: 'TRICEPS_KICKBACK',
        gripMode: 'neutral',
        postureTh: 'ก้มตัว 60° ล็อกต้นแขนขนานพื้น เตะปลายแขนไปด้านหลัง',
        vectorLabel: 'ทิศทางออกแรง: ล็อกศอกข้างลำตัว เหยียดปลายแขนไปด้านหลังจนตึง ← • ผ่อนกลับ 90° →',
        photoUrl: BIOMECHANICAL_REAL_PHOTOS.TRICEPS_KICKBACK
      }
    }
    if (n.includes('skullcrusher') || n.includes('lying') || n.includes('close-grip bench') || n.includes('นอนเหยียดหลังแขน') || n.includes('นอนดันบาร์เบลจับแคบ')) {
      return {
        pattern: 'TRICEPS_SKULLCRUSHER',
        gripMode: 'close',
        postureTh: 'นอนหงายจับแคบ หุบศอก ดันเหยียดหลังแขน',
        vectorLabel: 'ทิศทางออกแรง: จับบาร์แคบหุบศอก ดันเหยียดหลังแขนขึ้นแนวดิ่ง ↑ • ผ่อนลงช้าๆ ↓',
        photoUrl: BIOMECHANICAL_REAL_PHOTOS.TRICEPS_SKULLCRUSHER
      }
    }
    if (n.includes('diamond') || n.includes('bench triceps dip') || n.includes('ดิปส์หลังแขน') || n.includes('รูปเพชร')) {
      return {
        pattern: 'PUSHUP_DIP',
        gripMode: 'close',
        postureTh: 'วางมือแคบชิดกัน หุบศอกเน้นหลังแขน',
        vectorLabel: 'ทิศทางออกแรง: หุบศอกแนบลำตัว ออกแรงหลังแขนดันตัวขึ้นสุดระยะ ↑',
        photoUrl: BIOMECHANICAL_REAL_PHOTOS.PUSHUP_DIP
      }
    }
    if (n.includes('triceps') || n.includes('pushdown') || n.includes('หลังแขน') || n.includes('กดเชือก')) {
      return {
        pattern: 'TRICEPS_PUSHDOWN',
        gripMode: 'close',
        postureTh: 'ยืนตรงล็อกศอกข้างเอว กดเคเบิลลงด้านล่าง',
        vectorLabel: 'ทิศทางออกแรง: ล็อกต้นแขนแนบลำตัว กดเหยียดปลายแขนลงด้านล่างจนสุด ↓ • ต้านขึ้นช้าๆ ↑',
        photoUrl: BIOMECHANICAL_REAL_PHOTOS.TRICEPS_PUSHDOWN
      }
    }
    // หน้าแขน (Biceps Curl / Hammer Curl)
    return {
      pattern: 'BICEP_CURL',
      gripMode: 'neutral',
      postureTh: 'ล็อกข้อศอกข้างลำตัว พับหน้าแขนขึ้น (Elbow Flexion)',
      vectorLabel: 'ทิศทางออกแรง: ล็อกศอกติดสีข้าง พับปลายแขนยกดัมเบล/บาร์ขึ้นหาไหล่ ↺ ↑ • ต้านลงช้าๆ ↓',
      photoUrl: BIOMECHANICAL_REAL_PHOTOS.BICEP_CURL
    }
  }

  // 2. หมวดกล้ามเนื้อหลังและปีก (Back: แยกดึงจับกว้าง vs ดึงจับแคบ/หงายมือ vs ดึงแนวราบ)
  if (muscle === 'Back') {
    if (n.includes('deadlift') || n.includes('เดดลิฟต์') || n.includes('back extension') || n.includes('หลังล่าง')) {
      return {
        pattern: 'DEADLIFT_HINGE',
        gripMode: 'neutral',
        postureTh: 'พับสะโพกหลังตรง (Hip Hinge & Lower Back)',
        vectorLabel: 'ทิศทางออกแรง: เกร็งแกนกลางหลังตรง ดันสะโพกยืดลำตัวขึ้น ↑ • พับสะโพกผ่อนลง ↓',
        photoUrl: BIOMECHANICAL_REAL_PHOTOS.DEADLIFT_HINGE
      }
    }
    if (
      n.includes('pulldown') ||
      n.includes('pull-up') ||
      n.includes('chin-up') ||
      n.includes('ดึงข้อ') ||
      n.includes('ดึงเคเบิล') ||
      n.includes('กดเคเบิล')
    ) {
      if (isCloseGrip) {
        return {
          pattern: 'VERTICAL_PULL_CLOSE',
          gripMode: 'close',
          postureTh: 'มือจับแคบชิดกัน (Close/V-Bar/Underhand) หุบศอกด้านหน้า',
          vectorLabel: 'ทิศทางออกแรง: มือจับแคบตรงกลาง หุบศอกดึงลงมาหาอกล่างเพื่อเน้นปีกล่าง ↓ • ผ่อนขึ้นสุด ↑',
          photoUrl: BIOMECHANICAL_REAL_PHOTOS.VERTICAL_PULL_CLOSE
        }
      }
      return {
        pattern: 'VERTICAL_PULL_WIDE',
        gripMode: 'wide',
        postureTh: 'มือจับกว้างกว่าไหล่ (Wide-Grip) กางศอกดึงลงหาอกบน',
        vectorLabel: 'ทิศทางออกแรง: จับบาร์กว้าง แอ่นอกรับ กดศอกดึงลงมาที่อกบนเน้นปีกบนกว้าง ↓ • ผ่อนขึ้น ↑',
        photoUrl: BIOMECHANICAL_REAL_PHOTOS.VERTICAL_PULL_WIDE
      }
    }
    return {
      pattern: 'HORIZONTAL_ROW',
      gripMode: isCloseGrip ? 'close' : 'neutral',
      postureTh: 'ดึงเข้าหาลำตัวแนวราบ บีบร่องสะบัก (Rowing)',
      vectorLabel: 'ทิศทางออกแรง: ดึงศอกผ่านสีข้างไปด้านหลัง บีบสะบักเข้าหากัน ← • ผ่อนแขนยืดปีก →',
      photoUrl: BIOMECHANICAL_REAL_PHOTOS.HORIZONTAL_ROW
    }
  }

  // 3. หมวดกล้ามเนื้ออก (Chest: แยกเตียงเอียง Incline, เตียงราบ Flat, จับแคบ, กางโอบ Fly, วิดพื้น)
  if (muscle === 'Chest') {
    if (n.includes('incline') || n.includes('อกบน') || n.includes('low-to-high') || n.includes('ช้อนเคเบิล')) {
      return {
        pattern: 'INCLINE_PRESS',
        gripMode: 'wide',
        postureTh: 'นั่งพิงเบาะเอียง 35-45° (Incline Bench)',
        vectorLabel: 'ทิศทางออกแรง: เอนหลังพิงเบาะเอียง ดันดัมเบล/บาร์ขึ้นแนวดิ่งเหนืออกบน ↑ • ผ่อนลงคุมศอก ↓',
        photoUrl: BIOMECHANICAL_REAL_PHOTOS.INCLINE_PRESS
      }
    }
    if (n.includes('push-up') || n.includes('วิดพื้น') || n.includes('dip') || n.includes('ดิปส์')) {
      return {
        pattern: 'PUSHUP_DIP',
        gripMode: isCloseGrip ? 'close' : 'wide',
        postureTh: 'คว่ำหน้าเกร็งลำตัวตรง / ค้ำบาร์คู่โน้มตัวหน้า',
        vectorLabel: 'ทิศทางออกแรง: ย่ออกลงช้าๆ ↓ • ออกแรงอกและแขนดันตัวขึ้นสุดระยะ ↑',
        photoUrl: BIOMECHANICAL_REAL_PHOTOS.PUSHUP_DIP
      }
    }
    if (n.includes('fly') || n.includes('pec deck') || n.includes('crossover') || n.includes('ร่องอก') || n.includes('หนีบอก')) {
      return {
        pattern: 'CHEST_FLY',
        gripMode: 'wide',
        postureTh: 'วาดแขนโอบเข้าหากลางร่องอก (Arc Hug)',
        vectorLabel: 'ทิศทางออกแรง: กางแขนยืดอกออก ← → • โอบแขนเข้าบีบร่องอกด้านใน → ←',
        photoUrl: BIOMECHANICAL_REAL_PHOTOS.CHEST_FLY
      }
    }
    if (isCloseGrip) {
      return {
        pattern: 'CLOSE_GRIP_PRESS',
        gripMode: 'close',
        postureTh: 'นอนดันจับแคบ ศอกชิดลำตัว',
        vectorLabel: 'ทิศทางออกแรง: จับบาร์แคบช่วงไหล่ ดันขึ้นตรงๆ เน้นอกในและหลังแขน ↑',
        photoUrl: BIOMECHANICAL_REAL_PHOTOS.CLOSE_GRIP_PRESS
      }
    }
    return {
      pattern: 'FLAT_PRESS_WIDE',
      gripMode: 'wide',
      postureTh: 'นอนราบขนานพื้น 0° (Flat Bench)',
      vectorLabel: 'ทิศทางออกแรง: นอนเตียงราบ ดันขึ้นตั้งฉากจากอกกลาง ↑ • ต้านน้ำหนักลงช้าๆ ↓',
      photoUrl: BIOMECHANICAL_REAL_PHOTOS.FLAT_PRESS_WIDE
    }
  }

  // 4. หมวดกล้ามเนื้อหัวไหล่และบ่า (Shoulders)
  if (muscle === 'Shoulders') {
    if (n.includes('lateral raise') || n.includes('กางดัมเบล') || n.includes('กางไหล่')) {
      return {
        pattern: 'LATERAL_RAISE',
        gripMode: 'wide',
        postureTh: 'ยืน/นั่ง กางแขนออกด้านข้างลำตัวระดับไหล่',
        vectorLabel: 'ทิศทางออกแรง: ยกกางข้อศอกออกด้านข้างขึ้นมาที่ระดับหัวไหล่ ↖ ↗ • ต้านลงช้าๆ',
        photoUrl: BIOMECHANICAL_REAL_PHOTOS.LATERAL_RAISE
      }
    }
    if (n.includes('rear') || n.includes('reverse') || n.includes('face pull') || n.includes('ไหล่หลัง')) {
      return {
        pattern: 'HORIZONTAL_ROW',
        gripMode: 'wide',
        postureTh: 'กางศอกดึงไปด้านหลัง (Rear Delt Pull)',
        vectorLabel: 'ทิศทางออกแรง: ดึงแยกเชือกเคเบิล/กางดัมเบลไปด้านหลังเพื่อบีบไหล่หลัง ←',
        photoUrl: BIOMECHANICAL_REAL_PHOTOS.HORIZONTAL_ROW
      }
    }
    if (n.includes('shrug') || n.includes('ยักไหล่') || n.includes('farmer') || n.includes('เดินตรง')) {
      return {
        pattern: 'SHRUG_FARMER',
        gripMode: 'neutral',
        postureTh: 'ยืนตรงถือดัมเบลข้างลำตัว ยักไหล่สร้างบ่ารับเป้',
        vectorLabel: 'ทิศทางออกแรง: ออกแรงกล้ามเนื้อบ่าดึงหัวไหล่ขึ้นตรงๆ หาใบหู ↑ ค้าง 1 วินาที • ผ่อนลง ↓',
        photoUrl: BIOMECHANICAL_REAL_PHOTOS.SHRUG_FARMER
      }
    }
    return {
      pattern: 'SHOULDER_PRESS',
      gripMode: 'wide',
      postureTh: 'นั่งพิงเบาะตั้งฉาก ดันขึ้นเหนือศีรษะ (Overhead Press)',
      vectorLabel: 'ทิศทางออกแรง: ดันน้ำหนักจากระดับไหล่ขึ้นตรงๆ เหนือศีรษะ ↑ • ผ่อนลงระดับคาง ↓',
      photoUrl: BIOMECHANICAL_REAL_PHOTOS.SHOULDER_PRESS
    }
  }

  // 5. หมวดกล้ามเนื้อขา ก้น สะโพก และน่อง (Legs)
  if (muscle === 'Legs') {
    if (n.includes('hip thrust') || n.includes('glute bridge') || n.includes('kickback') || n.includes('ดันสะโพก') || n.includes('ปั้นก้น')) {
      return {
        pattern: 'HIP_THRUST_GLUTE',
        gripMode: 'neutral',
        postureTh: 'พาดสะบักกับม้านั่ง ดันสะโพกขึ้นบีบก้น (Hip Extension)',
        vectorLabel: 'ทิศทางออกแรง: ใช้ส้นเท้ากดพื้น ดันสะโพกขึ้นจนลำตัวขนานพื้นและบีบก้นค้าง ↑ • ลดสะโพกลง ↓',
        photoUrl: BIOMECHANICAL_REAL_PHOTOS.HIP_THRUST_GLUTE
      }
    }
    if (n.includes('romanian') || n.includes('rdl') || n.includes('พับสะโพก')) {
      return {
        pattern: 'DEADLIFT_HINGE',
        gripMode: 'neutral',
        postureTh: 'ดันสะโพกไปด้านหลัง ยืดแฮมสตริงและก้น (RDL Hinge)',
        vectorLabel: 'ทิศทางออกแรง: ดันก้นไปด้านหลังจนตึงขาหลัง ← ↓ • บีบก้นดันสะโพกกลับขึ้นมา → ↑',
        photoUrl: BIOMECHANICAL_REAL_PHOTOS.DEADLIFT_HINGE
      }
    }
    if (
      n.includes('lunge') ||
      n.includes('split squat') ||
      n.includes('step-up') ||
      n.includes('ขาเดียว') ||
      n.includes('ก้าว')
    ) {
      return {
        pattern: 'LUNGE_UNILATERAL',
        gripMode: 'neutral',
        postureTh: 'ก้าวขาหน้า-หลัง ย่อเข่า 90° (Unilateral Split)',
        vectorLabel: 'ทิศทางออกแรง: ย่อเข่าลงแนวดิ่ง ↓ • ใช้ส้นเท้าและต้นขาหน้าถีบตัวขึ้นตรงๆ ↑',
        photoUrl: BIOMECHANICAL_REAL_PHOTOS.LUNGE_UNILATERAL
      }
    }
    if (n.includes('calf') || n.includes('tibialis') || n.includes('เขย่งน่อง') || n.includes('extension') || n.includes('curl')) {
      return {
        pattern: 'LEG_ISOLATION',
        gripMode: 'neutral',
        postureTh: 'บริหารเฉพาะส่วนข้อเข่า / เขย่งข้อเท้า',
        vectorLabel: 'ทิศทางออกแรง: เตะเหยียด/พับขา หรือเขย่งปลายเท้าขึ้นสุดระยะ ↑ แล้วเกร็งค้าง 1 วินาที',
        photoUrl: BIOMECHANICAL_REAL_PHOTOS.LEG_ISOLATION
      }
    }
    return {
      pattern: 'SQUAT_BILATERAL',
      gripMode: 'neutral',
      postureTh: 'ยืนสองขา พับสะโพกย่อเข่า (Squat Pattern)',
      vectorLabel: 'ทิศทางออกแรง: 1.พับสะโพกย่อเข่าลง ↓ • 2.ถีบพื้นเต็มเท้าดันตัวขึ้นตรงๆ ↑',
      photoUrl: BIOMECHANICAL_REAL_PHOTOS.SQUAT_BILATERAL
    }
  }

  // 6. หมวดหน้าท้องและแกนกลางลำตัว (Core)
  if (muscle === 'Core') {
    return {
      pattern: 'CORE_CRUNCH',
      gripMode: 'neutral',
      postureTh: 'เกร็งพับหน้าท้อง / บิดเอวคอด / แพลงก์',
      vectorLabel: 'ทิศทางออกแรง: ใช้กล้ามเนื้อหน้าท้องดึงยกขา/บิดลำตัว ↑ • ผ่อนลงช้าๆ ห้ามเหวี่ยงหลัง ↓',
      photoUrl: BIOMECHANICAL_REAL_PHOTOS.CORE_CRUNCH
    }
  }

  // 7. หมวดคาร์ดิโอและเดินชันลู่วิ่ง (Cardio)
  return {
    pattern: 'CARDIO_INCLINE',
    gripMode: 'neutral',
    postureTh: 'ก้าวเดินไต่ความชัน โน้มตัวหน้าเล็กน้อย',
    vectorLabel: 'ทิศทางออกแรง: ก้าวเดินขึ้นทางชันสม่ำเสมอ ↗ (ห้ามเกาะราวลู่วิ่งเอนตัวไปข้างหลัง)',
    photoUrl: BIOMECHANICAL_REAL_PHOTOS.CARDIO_INCLINE
  }
}

export default function ExerciseIllustration({ name = '', muscle, type, size = 'md' }) {
  const [isAnimating, setIsAnimating] = useState(true)
  // สลับดูระหว่าง 'vector' (แผนภาพชีวกลศาสตร์ 2 มุม + ลูกศร) และ 'photo' (ภาพถ่ายจริง)
  const [displayMode, setDisplayMode] = useState('vector')

  const sizeClasses =
    size === 'xl'
      ? 'w-full h-60 rounded-2xl'
      : size === 'lg'
        ? 'w-20 h-20 rounded-xl'
        : 'w-14 h-14 rounded-xl'

  const colorMap = {
    Chest: { bg: 'from-rose-950 via-slate-900 to-slate-950', lightBg: 'bg-rose-50 border-rose-200', primary: '#f43f5e', glow: '#fda4af', labelTh: 'CHEST • กล้ามเนื้ออก' },
    Back: { bg: 'from-indigo-950 via-slate-900 to-slate-950', lightBg: 'bg-indigo-50 border-indigo-200', primary: '#6366f1', glow: '#a5b4fc', labelTh: 'BACK • แผ่นหลังและปีก' },
    Legs: { bg: 'from-emerald-950 via-slate-900 to-slate-950', lightBg: 'bg-emerald-50 border-emerald-200', primary: '#10b981', glow: '#6ee7b7', labelTh: 'LEGS • ขา ก้น สะโพก น่อง' },
    Shoulders: { bg: 'from-amber-950 via-slate-900 to-slate-950', lightBg: 'bg-amber-50 border-amber-200', primary: '#f59e0b', glow: '#fcd34d', labelTh: 'SHOULDERS • หัวไหล่และบ่า' },
    Arms: { bg: 'from-purple-950 via-slate-900 to-slate-950', lightBg: 'bg-purple-50 border-purple-200', primary: '#a855f7', glow: '#d8b4fe', labelTh: 'ARMS • หน้าแขนและหลังแขน' },
    Core: { bg: 'from-teal-950 via-slate-900 to-slate-950', lightBg: 'bg-teal-50 border-teal-200', primary: '#14b8a6', glow: '#5eead4', labelTh: 'CORE • หน้าท้องและเอวคอด' },
    Cardio: { bg: 'from-sky-950 via-slate-900 to-slate-950', lightBg: 'bg-sky-50 border-sky-200', primary: '#0ea5e9', glow: '#7dd3fc', labelTh: 'CARDIO • ลู่วิ่งและเดินชัน' }
  }

  const theme = colorMap[muscle] || colorMap.Chest
  const bio = classifyExerciseBiomechanics(name, muscle, type)
  const isHeroBanner = size === 'xl'

  return (
    <div
      className={`${sizeClasses} ${
        isHeroBanner
          ? `bg-gradient-to-br ${theme.bg} text-white border border-slate-800 shadow-inner`
          : `${theme.lightBg} border`
      } flex flex-col items-center justify-center p-2 shrink-0 relative overflow-hidden select-none`}
    >
      {/* แถบหัวการ์ดสำหรับโหมด Hero Card */}
      {isHeroBanner ? (
        <div className="absolute top-2.5 left-3 right-3 flex flex-wrap items-center justify-between gap-1 z-20">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className="px-2 py-0.5 text-[10px] font-black tracking-wider uppercase rounded-md border"
              style={{
                backgroundColor: `${theme.primary}25`,
                borderColor: `${theme.primary}60`,
                color: theme.glow
              }}
            >
              {theme.labelTh}
            </span>
            <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-950/80 text-slate-200 rounded-md border border-white/15">
              {bio.postureTh}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setDisplayMode(prev => (prev === 'vector' ? 'photo' : 'vector'))
              }}
              className="px-2.5 py-0.5 text-[10px] font-extrabold text-amber-300 bg-slate-950/90 border border-amber-500/50 rounded-md hover:bg-slate-800 transition"
            >
              {displayMode === 'vector' ? '📸 ดูภาพจริง' : '📐 ดูเวกเตอร์ 2 มุม'}
            </button>

            {displayMode === 'vector' && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setIsAnimating(prev => !prev)
                }}
                className={`px-2 py-0.5 text-[10px] font-extrabold rounded-md border transition ${
                  isAnimating
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 hover:bg-emerald-500/30'
                    : 'bg-slate-800 text-slate-300 border-slate-600 hover:bg-slate-700'
                }`}
              >
                {isAnimating ? '⏸ หยุด' : '▶ เล่น'}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="absolute top-1 left-1 opacity-80">
          <span className="text-[8px] font-black px-1 bg-white/80 text-slate-700 rounded">
            {(type || 'GYM').slice(0, 4).toUpperCase()}
          </span>
        </div>
      )}

      {/* ป้ายบอกทิศทางการออกแรงด้านล่างสุดของการ์ด */}
      {isHeroBanner && (
        <div className="absolute bottom-2 left-3 right-3 flex items-center justify-center z-20 pointer-events-none">
          <span className="px-2.5 py-0.5 text-[10px] font-bold text-emerald-300 bg-slate-950/90 border border-emerald-500/40 rounded-md truncate">
            🎯 {bio.vectorLabel}
          </span>
        </div>
      )}

      {/* โหมดแสดงภาพถ่ายจริง (Real Photo Reference Mode) */}
      {isHeroBanner && displayMode === 'photo' ? (
        <div className="relative w-full h-full rounded-xl overflow-hidden">
          <img
            src={bio.photoUrl}
            alt={name}
            className="w-full h-full object-cover object-center opacity-85"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />
          <div className="absolute bottom-9 left-4 right-4 flex items-center justify-between">
            <span className="px-3 py-1 text-xs font-black text-white bg-slate-950/85 border border-white/20 rounded-xl">
              {name.split('(')[0]}
            </span>
            <a
              href={getExerciseYouTubeUrl(name)}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1 text-xs font-extrabold text-white bg-rose-600 rounded-xl shadow-md hover:bg-rose-500"
            >
              ▶ ดูวิดีโอท่านี้บน YouTube
            </a>
          </div>
        </div>
      ) : (
        /* โหมดแผนภาพชีวกลศาสตร์ 2 มุมมอง (Front View & Side View) */
        <svg
          viewBox={isHeroBanner ? '0 0 320 160' : '0 0 100 100'}
          className={isHeroBanner ? 'w-full h-full mt-3 mb-2' : 'w-full h-full'}
        >
          <defs>
            <marker id="arrowConcentric" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="#34d399" />
            </marker>
            <marker id="arrowEccentric" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="#fbbf24" />
            </marker>
          </defs>

          {isHeroBanner ? (
            <>
              <line x1="160" y1="24" x2="160" y2="134" stroke="#334155" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="14" y1="132" x2="306" y2="132" stroke="#475569" strokeWidth="1.5" />

              <text x="80" y="33" textAnchor="middle" className="text-[8px] font-extrabold fill-slate-400 uppercase">
                1. FRONT VIEW (มุมด้านหน้า)
              </text>
              <text x="240" y="33" textAnchor="middle" className="text-[8px] font-extrabold fill-sky-300 uppercase">
                2. SIDE VIEW (มุมด้านข้าง + ทิศทางแรง)
              </text>

              {/* ===============================================================
                  1A. VERTICAL_PULL_WIDE (ดึงบาร์จับกว้าง Wide-Grip Lat Pulldown / Pull-Up)
                 =============================================================== */}
              {bio.pattern === 'VERTICAL_PULL_WIDE' && (
                <>
                  <g transform="translate(80, 42)">
                    <line x1="0" y1="-4" x2="0" y2="28" stroke="#64748b" strokeWidth="1.5" strokeDasharray="2 2" />
                    <circle cx="0" cy="24" r="6.5" fill="#cbd5e1" />
                    <polygon points="-17,32 17,32 11,64 -11,64" fill={theme.primary} />
                    <g>
                      {isAnimating && (
                        <animateTransform attributeName="transform" type="translate" values="0,0; 0,20; 0,0" dur="2.2s" repeatCount="indefinite" />
                      )}
                      {/* บาร์ยาวจับกว้าง (x = -26 ถึง +26) */}
                      <line x1="-32" y1="8" x2="32" y2="8" stroke={theme.glow} strokeWidth="3.5" strokeLinecap="round" />
                      <line x1="-26" y1="8" x2="-15" y2="32" stroke="#e2e8f0" strokeWidth="4" strokeLinecap="round" />
                      <line x1="26" y1="8" x2="15" y2="32" stroke="#e2e8f0" strokeWidth="4" strokeLinecap="round" />
                    </g>
                    <text x="0" y="78" textAnchor="middle" className="text-[7.5px] font-bold fill-indigo-300">มือจับกว้างกว่าไหล่</text>
                  </g>

                  <g transform="translate(235, 42)">
                    <line x1="6" y1="-4" x2="6" y2="38" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="2 2" />
                    <rect x="-16" y="64" width="24" height="5" rx="2" fill="#475569" />
                    <circle cx="-6" cy="24" r="6.5" fill="#cbd5e1" />
                    <line x1="-5" y1="32" x2="-2" y2="62" stroke={theme.primary} strokeWidth="10" strokeLinecap="round" />
                    <g>
                      {isAnimating && (
                        <animateTransform attributeName="transform" type="translate" values="0,0; -3,22; 0,0" dur="2.2s" repeatCount="indefinite" />
                      )}
                      <circle cx="6" cy="10" r="4" fill={theme.glow} />
                      <line x1="-3" y1="34" x2="6" y2="10" stroke="#e2e8f0" strokeWidth="4.5" strokeLinecap="round" />
                    </g>
                    <line x1="22" y1="6" x2="18" y2="38" stroke="#34d399" strokeWidth="2.5" markerEnd="url(#arrowConcentric)" />
                    <text x="26" y="22" className="text-[7.5px] font-bold fill-emerald-300">ดึงลงอกบน ↓</text>
                  </g>
                </>
              )}

              {/* ===============================================================
                  1B. VERTICAL_PULL_CLOSE (ดึงจับแคบ V-Bar / หงายมือ Underhand / Chin-Up)
                 =============================================================== */}
              {bio.pattern === 'VERTICAL_PULL_CLOSE' && (
                <>
                  <g transform="translate(80, 42)">
                    <line x1="0" y1="-4" x2="0" y2="28" stroke="#64748b" strokeWidth="1.5" strokeDasharray="2 2" />
                    <circle cx="0" cy="24" r="6.5" fill="#cbd5e1" />
                    <polygon points="-15,32 15,32 12,64 -12,64" fill={theme.primary} />
                    <g>
                      {isAnimating && (
                        <animateTransform attributeName="transform" type="translate" values="0,0; 0,22; 0,0" dur="2.2s" repeatCount="indefinite" />
                      )}
                      {/* มือจับแคบชิดกันตรงกลาง (V-Bar / Close Grip x = -6 ถึง +6) */}
                      <polygon points="0,2 -9,12 9,12" fill="none" stroke={theme.glow} strokeWidth="3" />
                      <line x1="-6" y1="12" x2="-9" y2="34" stroke="#e2e8f0" strokeWidth="4.5" strokeLinecap="round" />
                      <line x1="6" y1="12" x2="9" y2="34" stroke="#e2e8f0" strokeWidth="4.5" strokeLinecap="round" />
                    </g>
                    <text x="0" y="78" textAnchor="middle" className="text-[7.5px] font-bold fill-amber-300">มือจับแคบชิดกัน (Close Grip)</text>
                  </g>

                  <g transform="translate(235, 42)">
                    <line x1="10" y1="-4" x2="10" y2="42" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="2 2" />
                    <rect x="-16" y="64" width="24" height="5" rx="2" fill="#475569" />
                    <circle cx="-6" cy="24" r="6.5" fill="#cbd5e1" />
                    <line x1="-5" y1="32" x2="-2" y2="62" stroke={theme.primary} strokeWidth="10" strokeLinecap="round" />
                    {/* มุมข้างของท่าจับแคบ: ศอกพุ่งมาด้านหน้าและกดลงแนบลำตัว */}
                    <g>
                      {isAnimating && (
                        <animateTransform attributeName="transform" type="translate" values="0,0; -4,24; 0,0" dur="2.2s" repeatCount="indefinite" />
                      )}
                      <circle cx="10" cy="10" r="4" fill={theme.glow} />
                      <polyline points="-3,34 12,26 10,10" fill="none" stroke="#e2e8f0" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
                    </g>
                    <line x1="24" y1="8" x2="20" y2="42" stroke="#34d399" strokeWidth="2.5" markerEnd="url(#arrowConcentric)" />
                    <text x="28" y="26" className="text-[7.5px] font-bold fill-emerald-300">หุบศอกดึงลง ↓</text>
                  </g>
                </>
              )}

              {/* ===============================================================
                  2. TRICEPS_PUSHDOWN (ยืนกดเชือกเคเบิลหลังแขนลงด้านล่าง)
                 =============================================================== */}
              {bio.pattern === 'TRICEPS_PUSHDOWN' && (
                <>
                  <g transform="translate(80, 42)">
                    <line x1="0" y1="-4" x2="0" y2="36" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="2 2" />
                    <circle cx="0" cy="12" r="6.5" fill="#cbd5e1" />
                    <rect x="-12" y="21" width="24" height="36" rx="4" fill="#475569" />
                    {/* ต้นแขนล็อกแนบลำตัว ไฮไลท์หลังแขนสีม่วง */}
                    <rect x="-18" y="23" width="6" height="20" rx="3" fill={theme.primary} />
                    <rect x="12" y="23" width="6" height="20" rx="3" fill={theme.primary} />
                    <g>
                      {isAnimating && (
                        <animateTransform attributeName="transform" type="translate" values="0,-8; 0,16; 0,-8" dur="1.9s" repeatCount="indefinite" />
                      )}
                      <line x1="-5" y1="36" x2="-14" y2="48" stroke={theme.glow} strokeWidth="3.5" strokeLinecap="round" />
                      <line x1="5" y1="36" x2="14" y2="48" stroke={theme.glow} strokeWidth="3.5" strokeLinecap="round" />
                    </g>
                    <text x="0" y="78" textAnchor="middle" className="text-[7.5px] font-bold fill-purple-300">กดเชือกฉีกออกด้านล่าง</text>
                  </g>

                  <g transform="translate(235, 42)">
                    <line x1="14" y1="-4" x2="14" y2="44" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="2 2" />
                    <circle cx="-4" cy="12" r="6.5" fill="#cbd5e1" />
                    <rect x="-10" y="21" width="12" height="38" rx="4" fill="#475569" />
                    {/* ไฮไลท์กล้ามเนื้อหลังแขน (Triceps) ด้านหลังต้นแขน */}
                    <rect x="-8" y="23" width="7" height="22" rx="3" fill={theme.primary} />
                    <circle cx="-4" cy="44" r="3.5" fill="#ffffff" />
                    {/* ปลายแขนหมุนกดลงด้านล่าง (ตรงข้ามกับ Bicep Curl!) */}
                    <g>
                      {isAnimating && (
                        <animateTransform
                          attributeName="transform"
                          type="rotate"
                          values="-35 -4 44; 55 -4 44; -35 -4 44"
                          dur="1.9s"
                          repeatCount="indefinite"
                        />
                      )}
                      <line x1="-4" y1="44" x2="16" y2="38" stroke="#e2e8f0" strokeWidth="5" strokeLinecap="round" />
                      <circle cx="16" cy="38" r="4" fill={theme.glow} />
                    </g>
                    <line x1="26" y1="22" x2="26" y2="62" stroke="#34d399" strokeWidth="2.5" markerEnd="url(#arrowConcentric)" />
                    <text x="31" y="44" className="text-[7.5px] font-bold fill-emerald-300">กดเหยียดลง ↓</text>
                  </g>
                </>
              )}

              {/* ===============================================================
                  3. TRICEPS_OVERHEAD (ยกดัมเบลข้ามศีรษะเหยียดหลังแขนขึ้นฟ้า)
                 =============================================================== */}
              {bio.pattern === 'TRICEPS_OVERHEAD' && (
                <>
                  <g transform="translate(80, 44)">
                    <circle cx="0" cy="24" r="6.5" fill="#cbd5e1" />
                    <rect x="-12" y="33" width="24" height="34" rx="4" fill="#475569" />
                    {/* ต้นแขนชูขึ้นแนบใบหู */}
                    <line x1="-11" y1="36" x2="-9" y2="10" stroke={theme.primary} strokeWidth="6" strokeLinecap="round" />
                    <line x1="11" y1="36" x2="9" y2="10" stroke={theme.primary} strokeWidth="6" strokeLinecap="round" />
                    <g>
                      {isAnimating && (
                        <animateTransform attributeName="transform" type="translate" values="0,12; 0,-10; 0,12" dur="2.1s" repeatCount="indefinite" />
                      )}
                      <rect x="-5" y="-2" width="10" height="14" rx="2" fill={theme.glow} />
                    </g>
                  </g>

                  <g transform="translate(235, 44)">
                    <circle cx="0" cy="26" r="6.5" fill="#cbd5e1" />
                    <rect x="-6" y="35" width="12" height="34" rx="4" fill="#475569" />
                    {/* ต้นแขนชี้ขึ้นฟ้า ข้อศอกอยู่ระดับเหนือหัว */}
                    <line x1="0" y1="38" x2="2" y2="10" stroke={theme.primary} strokeWidth="6.5" strokeLinecap="round" />
                    <circle cx="2" cy="10" r="3.5" fill="#ffffff" />
                    <g>
                      {isAnimating && (
                        <animateTransform
                          attributeName="transform"
                          type="rotate"
                          values="85 2 10; 0 2 10; 85 2 10"
                          dur="2.1s"
                          repeatCount="indefinite"
                        />
                      )}
                      <line x1="2" y1="10" x2="2" y2="-10" stroke="#e2e8f0" strokeWidth="4.5" strokeLinecap="round" />
                      <rect x="-4" y="-14" width="12" height="6" rx="1.5" fill={theme.glow} />
                    </g>
                    <line x1="22" y1="26" x2="22" y2="-8" stroke="#34d399" strokeWidth="2.5" markerEnd="url(#arrowConcentric)" />
                    <text x="27" y="12" className="text-[7.5px] font-bold fill-emerald-300">เหยียดขึ้นเหนือหัว ↑</text>
                  </g>
                </>
              )}

              {/* ===============================================================
                  4. TRICEPS_KICKBACK (ก้มตัวเตะดัมเบลไปด้านหลัง)
                 =============================================================== */}
              {bio.pattern === 'TRICEPS_KICKBACK' && (
                <>
                  <g transform="translate(80, 46)">
                    <circle cx="0" cy="18" r="7" fill="#cbd5e1" />
                    <rect x="-12" y="27" width="24" height="28" rx="4" fill="#475569" />
                    <rect x="-18" y="28" width="6" height="20" rx="2.5" fill={theme.primary} />
                    <rect x="12" y="28" width="6" height="20" rx="2.5" fill={theme.primary} />
                  </g>

                  <g transform="translate(235, 44)">
                    {/* ลำตัวพับก้มไปด้านหน้า 60 องศา */}
                    <circle cx="16" cy="22" r="6.5" fill="#cbd5e1" />
                    <line x1="12" y1="28" x2="-12" y2="48" stroke="#64748b" strokeWidth="9" strokeLinecap="round" />
                    <line x1="-12" y1="48" x2="-10" y2="82" stroke="#475569" strokeWidth="6" strokeLinecap="round" />
                    {/* ต้นแขนล็อกขนานพื้น */}
                    <line x1="6" y1="32" x2="-12" y2="32" stroke={theme.primary} strokeWidth="6" strokeLinecap="round" />
                    <circle cx="-12" cy="32" r="3.5" fill="#ffffff" />
                    <g>
                      {isAnimating && (
                        <animateTransform
                          attributeName="transform"
                          type="rotate"
                          values="-75 -12 32; 0 -12 32; -75 -12 32"
                          dur="2.0s"
                          repeatCount="indefinite"
                        />
                      )}
                      <line x1="-12" y1="32" x2="-32" y2="32" stroke="#e2e8f0" strokeWidth="4.5" strokeLinecap="round" />
                      <rect x="-36" y="27" width="6" height="10" rx="1.5" fill={theme.glow} />
                    </g>
                    <line x1="-6" y1="16" x2="-36" y2="16" stroke="#34d399" strokeWidth="2.5" markerEnd="url(#arrowConcentric)" />
                    <text x="-20" y="10" textAnchor="middle" className="text-[7.5px] font-bold fill-emerald-300">← เตะเหยียดหลังแขน</text>
                  </g>
                </>
              )}

              {/* ===============================================================
                  5. BICEP_CURL (พับหน้าแขนขึ้นหาหัวไหล่)
                 =============================================================== */}
              {bio.pattern === 'BICEP_CURL' && (
                <>
                  <g transform="translate(80, 42)">
                    <circle cx="0" cy="12" r="7" fill="#cbd5e1" />
                    <rect x="-12" y="22" width="24" height="36" rx="4" fill="#475569" />
                    <rect x="-20" y="24" width="7" height="20" rx="3" fill={theme.primary} />
                    <rect x="13" y="24" width="7" height="20" rx="3" fill={theme.primary} />
                    <g>
                      {isAnimating && (
                        <animateTransform attributeName="transform" type="translate" values="0,14; 0,-8; 0,14" dur="2.0s" repeatCount="indefinite" />
                      )}
                      <rect x="-24" y="34" width="12" height="5" rx="1.5" fill={theme.glow} />
                      <rect x="12" y="34" width="12" height="5" rx="1.5" fill={theme.glow} />
                    </g>
                  </g>

                  <g transform="translate(235, 42)">
                    <circle cx="-6" cy="12" r="6.5" fill="#cbd5e1" />
                    <rect x="-12" y="21" width="12" height="38" rx="4" fill="#475569" />
                    <rect x="-8" y="24" width="7" height="22" rx="3" fill={theme.primary} />
                    <circle cx="-5" cy="45" r="3.5" fill="#ffffff" />
                    <g>
                      {isAnimating && (
                        <animateTransform
                          attributeName="transform"
                          type="rotate"
                          values="35 -5 45; -55 -5 45; 35 -5 45"
                          dur="2.0s"
                          repeatCount="indefinite"
                        />
                      )}
                      <line x1="-5" y1="45" x2="16" y2="45" stroke="#e2e8f0" strokeWidth="5" strokeLinecap="round" />
                      <rect x="14" y="38" width="6" height="14" rx="2" fill={theme.glow} />
                    </g>
                    <line x1="26" y1="58" x2="26" y2="20" stroke="#34d399" strokeWidth="2.5" markerEnd="url(#arrowConcentric)" />
                    <text x="31" y="40" className="text-[7.5px] font-bold fill-emerald-300">พับหน้าแขนขึ้น ↑</text>
                  </g>
                </>
              )}

              {/* ===============================================================
                  6. INCLINE_PRESS, FLAT_PRESS_WIDE, CLOSE_GRIP_PRESS & SKULLCRUSHER
                 =============================================================== */}
              {(bio.pattern === 'INCLINE_PRESS' ||
                bio.pattern === 'FLAT_PRESS_WIDE' ||
                bio.pattern === 'CLOSE_GRIP_PRESS' ||
                bio.pattern === 'TRICEPS_SKULLCRUSHER') && (
                <>
                  <g transform="translate(80, 44)">
                    <circle cx="0" cy="14" r="7" fill="#cbd5e1" />
                    <rect x="-14" y="23" width="28" height="32" rx="5" fill="#475569" />
                    <rect x="-12" y="25" width="11" height="12" rx="3" fill={theme.primary} />
                    <rect x="1" y="25" width="11" height="12" rx="3" fill={theme.primary} />
                    <g>
                      {isAnimating && (
                        <animateTransform attributeName="transform" type="translate" values="0,10; 0,-14; 0,10" dur="2.2s" repeatCount="indefinite" />
                      )}
                      <line x1="-28" y1="20" x2="28" y2="20" stroke={theme.glow} strokeWidth="3.5" strokeLinecap="round" />
                      {/* แสดงความห่างของมือตามจริง (จับแคบ vs จับกว้าง) */}
                      {bio.gripMode === 'close' ? (
                        <>
                          <line x1="-7" y1="20" x2="-9" y2="34" stroke="#e2e8f0" strokeWidth="4.5" strokeLinecap="round" />
                          <line x1="7" y1="20" x2="9" y2="34" stroke="#e2e8f0" strokeWidth="4.5" strokeLinecap="round" />
                        </>
                      ) : (
                        <>
                          <line x1="-22" y1="20" x2="-14" y2="34" stroke="#e2e8f0" strokeWidth="4.5" strokeLinecap="round" />
                          <line x1="22" y1="20" x2="14" y2="34" stroke="#e2e8f0" strokeWidth="4.5" strokeLinecap="round" />
                        </>
                      )}
                    </g>
                    <text x="0" y="76" textAnchor="middle" className="text-[7.5px] font-bold fill-rose-300">
                      {bio.gripMode === 'close' ? 'มือจับแคบ หุบศอก' : 'มือจับกว้างมาตรฐาน'}
                    </text>
                  </g>

                  <g transform="translate(235, 42)">
                    {bio.pattern === 'INCLINE_PRESS' ? (
                      /* เตียงเอียง 40 องศา */
                      <>
                        <line x1="-24" y1="22" x2="4" y2="62" stroke="#475569" strokeWidth="6" strokeLinecap="round" />
                        <line x1="4" y1="62" x2="18" y2="58" stroke="#475569" strokeWidth="6" strokeLinecap="round" />
                        <circle cx="-16" cy="20" r="6.5" fill="#cbd5e1" />
                        <line x1="-11" y1="28" x2="4" y2="54" stroke={theme.primary} strokeWidth="10" strokeLinecap="round" />
                        <g>
                          {isAnimating && (
                            <animateTransform attributeName="transform" type="translate" values="0,8; 0,-18; 0,8" dur="2.2s" repeatCount="indefinite" />
                          )}
                          <line x1="-6" y1="34" x2="-6" y2="14" stroke="#e2e8f0" strokeWidth="4.5" strokeLinecap="round" />
                          <rect x="-13" y="10" width="14" height="6" rx="2" fill={theme.glow} />
                        </g>
                        <text x="-26" y="54" textAnchor="end" className="text-[7px] font-bold fill-sky-300">เบาะเอียง 40°</text>
                      </>
                    ) : (
                      /* เตียงราบ 0 องศา */
                      <>
                        <rect x="-28" y="52" width="52" height="5" rx="2" fill="#475569" />
                        <circle cx="-20" cy="43" r="6" fill="#cbd5e1" />
                        <rect x="-12" y="38" width="28" height="13" rx="4" fill={theme.primary} />
                        <g>
                          {isAnimating && (
                            <animateTransform attributeName="transform" type="translate" values="0,8; 0,-18; 0,8" dur="2.2s" repeatCount="indefinite" />
                          )}
                          <line x1="0" y1="38" x2="0" y2="14" stroke="#e2e8f0" strokeWidth="5" strokeLinecap="round" />
                          <circle cx="0" cy="12" r="6.5" fill={theme.glow} />
                        </g>
                      </>
                    )}
                    <line x1="20" y1="38" x2="20" y2="6" stroke="#34d399" strokeWidth="2.5" markerEnd="url(#arrowConcentric)" />
                    <text x="25" y="22" className="text-[7.5px] font-bold fill-emerald-300">ดันขึ้น ↑</text>
                  </g>
                </>
              )}

              {/* ===============================================================
                  7. HIP_THRUST_GLUTE (ดันสะโพกปั้นก้นกลมเด้ง)
                 =============================================================== */}
              {bio.pattern === 'HIP_THRUST_GLUTE' && (
                <>
                  <g transform="translate(80, 44)">
                    <circle cx="0" cy="18" r="7" fill="#cbd5e1" />
                    <rect x="-14" y="28" width="28" height="24" rx="6" fill={theme.primary} />
                    <line x1="-10" y1="52" x2="-12" y2="82" stroke="#cbd5e1" strokeWidth="5" strokeLinecap="round" />
                    <line x1="10" y1="52" x2="12" y2="82" stroke="#cbd5e1" strokeWidth="5" strokeLinecap="round" />
                    <text x="0" y="76" textAnchor="middle" className="text-[7.5px] font-bold fill-emerald-300">บีบเกร็งก้นและสะโพก</text>
                  </g>

                  <g transform="translate(235, 44)">
                    {/* ม้านั่งรองสะบักด้านหลัง */}
                    <rect x="-32" y="46" width="16" height="38" rx="3" fill="#475569" />
                    <circle cx="-22" cy="36" r="6" fill="#cbd5e1" />
                    <g>
                      {isAnimating && (
                        <animateTransform attributeName="transform" type="translate" values="0,16; 0,-4; 0,16" dur="2.2s" repeatCount="indefinite" />
                      )}
                      {/* ลำตัวและสะโพกที่ดันขึ้นขนานพื้น */}
                      <line x1="-18" y1="44" x2="8" y2="44" stroke={theme.primary} strokeWidth="9" strokeLinecap="round" />
                      <circle cx="2" cy="38" r="5.5" fill={theme.glow} />
                      <line x1="8" y1="44" x2="22" y2="54" stroke={theme.primary} strokeWidth="6" strokeLinecap="round" />
                    </g>
                    <line x1="22" y1="52" x2="22" y2="84" stroke="#cbd5e1" strokeWidth="5" strokeLinecap="round" />
                    <line x1="2" y1="68" x2="2" y2="18" stroke="#34d399" strokeWidth="2.5" markerEnd="url(#arrowConcentric)" />
                    <text x="8" y="24" className="text-[7.5px] font-bold fill-emerald-300">ดันสะโพกบีบก้น ↑</text>
                  </g>
                </>
              )}

              {/* ===============================================================
                  8. รูปแบบอื่นๆ ทั้งหมด (CHEST_FLY, PUSHUP_DIP, HORIZONTAL_ROW, SHOULDER, SQUAT, LUNGE, DEADLIFT, CARDIO)
                 =============================================================== */}
              {(bio.pattern === 'CHEST_FLY' ||
                bio.pattern === 'PUSHUP_DIP' ||
                bio.pattern === 'HORIZONTAL_ROW' ||
                bio.pattern === 'SHOULDER_PRESS' ||
                bio.pattern === 'LATERAL_RAISE' ||
                bio.pattern === 'SHRUG_FARMER' ||
                bio.pattern === 'SQUAT_BILATERAL' ||
                bio.pattern === 'LUNGE_UNILATERAL' ||
                bio.pattern === 'DEADLIFT_HINGE' ||
                bio.pattern === 'LEG_ISOLATION' ||
                bio.pattern === 'CORE_CRUNCH' ||
                bio.pattern === 'CARDIO_INCLINE') && (
                <>
                  {/* มุมด้านหน้า */}
                  <g transform="translate(80, 42)">
                    <g>
                      {isAnimating && (
                        <animateTransform
                          attributeName="transform"
                          type="translate"
                          values={
                            bio.pattern === 'SQUAT_BILATERAL' || bio.pattern === 'LUNGE_UNILATERAL' || bio.pattern === 'PUSHUP_DIP'
                              ? '0,0; 0,16; 0,0'
                              : '0,6; 0,-8; 0,6'
                          }
                          dur="2.2s"
                          repeatCount="indefinite"
                        />
                      )}
                      <circle cx="0" cy="10" r="7" fill="#cbd5e1" />
                      <rect x="-12" y="19" width="24" height="30" rx="4" fill={theme.primary} />
                      <line x1="-24" y1="24" x2="24" y2="24" stroke={theme.glow} strokeWidth="3.5" strokeLinecap="round" />
                    </g>
                    <line x1="-10" y1="52" x2="-10" y2="84" stroke="#94a3b8" strokeWidth="4.5" strokeLinecap="round" />
                    <line x1="10" y1="52" x2="10" y2="84" stroke="#94a3b8" strokeWidth="4.5" strokeLinecap="round" />
                  </g>

                  {/* มุมด้านข้าง */}
                  <g transform="translate(235, 42)">
                    {bio.pattern === 'CARDIO_INCLINE' ? (
                      <>
                        <line x1="-34" y1="86" x2="34" y2="62" stroke={theme.glow} strokeWidth="5" strokeLinecap="round" />
                        <circle cx="2" cy="10" r="6.5" fill="#cbd5e1" />
                        <line x1="0" y1="18" x2="-4" y2="48" stroke={theme.primary} strokeWidth="8" strokeLinecap="round" />
                        <g>
                          {isAnimating && (
                            <animateTransform attributeName="transform" type="rotate" values="-18 -4 48; 18 -4 48; -18 -4 48" dur="1.4s" repeatCount="indefinite" />
                          )}
                          <line x1="-4" y1="48" x2="-12" y2="78" stroke="#e2e8f0" strokeWidth="5" strokeLinecap="round" />
                        </g>
                        <line x1="-24" y1="68" x2="24" y2="52" stroke="#34d399" strokeWidth="2.5" markerEnd="url(#arrowConcentric)" />
                      </>
                    ) : bio.pattern === 'HORIZONTAL_ROW' ? (
                      <>
                        <circle cx="-8" cy="14" r="6.5" fill="#cbd5e1" />
                        <rect x="-14" y="23" width="13" height="36" rx="4" fill={theme.primary} />
                        <g>
                          {isAnimating && (
                            <animateTransform attributeName="transform" type="translate" values="16,0; -4,0; 16,0" dur="2.1s" repeatCount="indefinite" />
                          )}
                          <line x1="-6" y1="38" x2="18" y2="38" stroke="#e2e8f0" strokeWidth="5" strokeLinecap="round" />
                          <rect x="16" y="30" width="6" height="16" rx="2" fill={theme.glow} />
                        </g>
                        <line x1="30" y1="22" x2="2" y2="22" stroke="#34d399" strokeWidth="2.5" markerEnd="url(#arrowConcentric)" />
                        <text x="16" y="15" textAnchor="middle" className="text-[7.5px] font-bold fill-emerald-300">← ดึงบีบสะบัก</text>
                      </>
                    ) : (
                      <>
                        <g>
                          {isAnimating && (
                            <animateTransform attributeName="transform" type="translate" values="0,0; -6,16; 0,0" dur="2.2s" repeatCount="indefinite" />
                          )}
                          <circle cx="0" cy="10" r="6.5" fill="#cbd5e1" />
                          <line x1="0" y1="18" x2="-8" y2="46" stroke={theme.primary} strokeWidth="8" strokeLinecap="round" />
                          <line x1="-8" y1="46" x2="10" y2="64" stroke={theme.primary} strokeWidth="6.5" strokeLinecap="round" />
                        </g>
                        <line x1="10" y1="64" x2="4" y2="86" stroke="#cbd5e1" strokeWidth="5" strokeLinecap="round" />
                        <line x1="26" y1="68" x2="26" y2="22" stroke="#34d399" strokeWidth="2.5" markerEnd="url(#arrowConcentric)" />
                        <text x="31" y="44" className="text-[7.5px] font-bold fill-emerald-300">ออกแรง ↑</text>
                      </>
                    )}
                  </g>
                </>
              )}
            </>
          ) : (
            /* โหมดไอคอนขนาดเล็กสำหรับรายการย่อย */
            <>
              <circle cx="50" cy="16" r="8" fill="#94a3b8" />
              <rect x="38" y="26" width="24" height="34" rx="5" fill="#cbd5e1" />
              <rect x="26" y="28" width="10" height="28" rx="4" fill="#cbd5e1" />
              <rect x="64" y="28" width="10" height="28" rx="4" fill="#cbd5e1" />
              <rect x="39" y="62" width="10" height="30" rx="4" fill="#cbd5e1" />
              <rect x="51" y="62" width="10" height="30" rx="4" fill="#cbd5e1" />
              <circle cx="50" cy="42" r="10" fill={theme.primary} />
            </>
          )}
        </svg>
      )}
    </div>
  )
}