import { useState } from 'react'

// Pure Function สร้างลิงก์ค้นหาวิดีโอสอนท่าออกกำลังกายบน YouTube
export function getExerciseYouTubeUrl(exerciseName = '') {
  const cleaned = String(exerciseName || '')
    .replace(/🔥\s*\[[^\]]+\]\s*/g, '')
    .split('(')[0]
    .trim()
  const query = encodeURIComponent(`${cleaned || exerciseName} exercise form tutorial`)
  return `https://www.youtube.com/results?search_query=${query}`
}

// คลังภาพถ่ายจริงอ้างอิงตามรูปแบบชีวกลศาสตร์ของท่าฝึก
const BIOMECHANICAL_REAL_PHOTOS = {
  WARMUP_UPPER: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=900&q=80',
  WARMUP_LOWER: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=900&q=80',
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
  BULGARIAN_SPLIT_SQUAT: 'https://images.unsplash.com/photo-1434682881908-b43d0467b798?auto=format&fit=crop&w=900&q=80',
  LUNGE_UNILATERAL: 'https://images.unsplash.com/photo-1434682881908-b43d0467b798?auto=format&fit=crop&w=900&q=80',
  HIP_THRUST_GLUTE: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=900&q=80',
  DEADLIFT_HINGE: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=900&q=80',
  LEG_ISOLATION: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?auto=format&fit=crop&w=900&q=80',
  CORE_CRUNCH: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=900&q=80',
  CARDIO_INCLINE: 'https://images.unsplash.com/photo-1538805060514-97d9cc17730c?auto=format&fit=crop&w=900&q=80'
}

// ============================================================================
// PURE BIOMECHANICAL CLASSIFIER: แยกแต่ละท่าอย่างละเอียด ไม่ปนกัน
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

  // 0. ตรวจสอบท่าวอร์มร่างกายก่อนเป็นอันดับแรก (แยกท่าหมุนไหล่ vs วอร์มสะบักแพลงก์ vs ยืดสะโพก/ข้อเท้า)
  if (
    muscle === 'Warmup' ||
    n.includes('วอร์ม') ||
    n.includes('warm-up') ||
    n.includes('warmup') ||
    n.includes('arm circle') ||
    n.includes('scapular push') ||
    n.includes('greatest stretch') ||
    n.includes('leg swing') ||
    n.includes('dorsiflexion') ||
    n.includes('cat-cow') ||
    n.includes('jumping jack')
  ) {
    if (n.includes('scapular push') || n.includes('wrist') || n.includes('วอร์มสะบัก') || n.includes('cat-cow')) {
      return {
        pattern: 'WARMUP_SCAPULAR_PUSHUP',
        gripMode: 'neutral',
        postureTh: 'หมุนข้อมือ + ท่าแพลงก์แขนตึงดันสะบักขึ้น-ลง',
        vectorLabel: 'วิธีทำ: แขนตึงตลอด บีบสะบักลงแล้วดันสะบักขึ้นสุดระยะ ↑↓ 12-15 ครั้ง',
        photoUrl: BIOMECHANICAL_REAL_PHOTOS.WARMUP_UPPER
      }
    }
    if (
      n.includes('stretch') ||
      n.includes('hip') ||
      n.includes('leg swing') ||
      n.includes('ankle') ||
      n.includes('dorsiflexion') ||
      n.includes('good morning') ||
      n.includes('สะโพก') ||
      n.includes('ข้อเท้า') ||
      n.includes('แกว่งขา')
    ) {
      return {
        pattern: 'WARMUP_HIP_STRETCH',
        gripMode: 'neutral',
        postureTh: 'ก้าวย่อเปิดสะโพก + โยกข้อเท้าและหมุนลำตัว',
        vectorLabel: 'วิธีทำ: ก้าวขายาว ย่อสะโพกลง โยกเข่าเปิดข้อเท้าแล้วบิดตัวชูแขนขึ้น ↗',
        photoUrl: BIOMECHANICAL_REAL_PHOTOS.WARMUP_LOWER
      }
    }
    // ท่าหมุนไหล่ เหวี่ยงแขน บิดลำตัว กระโดดตบ (Arm Circles & Scapular Swings)
    return {
      pattern: 'WARMUP_ARM_CIRCLES',
      gripMode: 'wide',
      postureTh: 'ยืนตรง 2 ขา หมุนหัวไหล่เป็นวงกลม & เหวี่ยงแขนเปิดอก',
      vectorLabel: 'วิธีทำ: ยืนตรงกางแขน หมุนไหล่เป็นวงกลม ↺ 15 รอบ + เหวี่ยงแขนสลับหน้าอก ↔',
      photoUrl: BIOMECHANICAL_REAL_PHOTOS.WARMUP_UPPER
    }
  }

  // 1. หมวดแขน (Arms: แยกหลังแขน 4 ท่า vs หน้าแขน)
  if (muscle === 'Arms' || n.includes('triceps') || n.includes('หลังแขน') || n.includes('skullcrusher') || n.includes('pushdown')) {
    if (n.includes('overhead') || n.includes('ข้ามศีรษะ') || n.includes('เหนือศีรษะ')) {
      return {
        pattern: 'TRICEPS_OVERHEAD',
        gripMode: 'close',
        postureTh: 'ชูต้นแขนข้างใบหู เหยียดดัมเบลขึ้นเหนือศีรษะ',
        vectorLabel: 'ล็อกศอกชี้ขึ้นฟ้า ออกแรงหลังแขนดันดัมเบลขึ้นตรงๆ ↑',
        photoUrl: BIOMECHANICAL_REAL_PHOTOS.TRICEPS_OVERHEAD
      }
    }
    if (n.includes('kickback') || n.includes('เตะดัมเบล')) {
      return {
        pattern: 'TRICEPS_KICKBACK',
        gripMode: 'neutral',
        postureTh: 'ก้มตัว 60° ล็อกต้นแขนขนานพื้น เตะปลายแขนไปด้านหลัง',
        vectorLabel: 'ล็อกศอกข้างลำตัว เหยียดปลายแขนไปด้านหลังจนตึง ←',
        photoUrl: BIOMECHANICAL_REAL_PHOTOS.TRICEPS_KICKBACK
      }
    }
    if (n.includes('skullcrusher') || n.includes('lying') || n.includes('close-grip bench') || n.includes('นอนเหยียดหลังแขน') || n.includes('นอนดันบาร์เบลจับแคบ')) {
      return {
        pattern: 'TRICEPS_SKULLCRUSHER',
        gripMode: 'close',
        postureTh: 'นอนหงายจับแคบ หุบศอก ดันเหยียดหลังแขน',
        vectorLabel: 'จับบาร์แคบหุบศอก ดันเหยียดหลังแขนขึ้นแนวดิ่ง ↑',
        photoUrl: BIOMECHANICAL_REAL_PHOTOS.TRICEPS_SKULLCRUSHER
      }
    }
    if (n.includes('diamond') || n.includes('bench triceps dip') || n.includes('ดิปส์หลังแขน') || n.includes('รูปเพชร')) {
      return {
        pattern: 'PUSHUP_DIP',
        gripMode: 'close',
        postureTh: 'วางมือแคบชิดกัน หุบศอกดันตัวเน้นหลังแขน',
        vectorLabel: 'หุบศอกแนบลำตัว ออกแรงหลังแขนดันตัวขึ้นสุดระยะ ↑',
        photoUrl: BIOMECHANICAL_REAL_PHOTOS.PUSHUP_DIP
      }
    }
    if (n.includes('triceps') || n.includes('pushdown') || n.includes('หลังแขน') || n.includes('กดเชือก')) {
      return {
        pattern: 'TRICEPS_PUSHDOWN',
        gripMode: 'close',
        postureTh: 'ยืนตรงล็อกศอกข้างเอว กดเคเบิลลงด้านล่าง',
        vectorLabel: 'ล็อกต้นแขนแนบลำตัว กดเหยียดปลายแขนลงด้านล่างจนสุด ↓',
        photoUrl: BIOMECHANICAL_REAL_PHOTOS.TRICEPS_PUSHDOWN
      }
    }
    return {
      pattern: 'BICEP_CURL',
      gripMode: 'neutral',
      postureTh: 'ล็อกข้อศอกข้างลำตัว พับหน้าแขนขึ้น',
      vectorLabel: 'ล็อกศอกติดสีข้าง พับปลายแขนยกดัมเบล/บาร์ขึ้นหาไหล่ ↺ ↑',
      photoUrl: BIOMECHANICAL_REAL_PHOTOS.BICEP_CURL
    }
  }

  // 2. หมวดหลังและปีก (Back)
  if (muscle === 'Back') {
    if (n.includes('deadlift') || n.includes('เดดลิฟต์') || n.includes('back extension') || n.includes('หลังล่าง')) {
      return {
        pattern: 'DEADLIFT_HINGE',
        gripMode: 'neutral',
        postureTh: 'พับสะโพกหลังตรง (Hip Hinge & Lower Back)',
        vectorLabel: 'เกร็งแกนกลางหลังตรง ดันสะโพกยืดลำตัวขึ้น ↑ • พับสะโพกลง ↓',
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
          postureTh: 'มือจับแคบชิดกัน หุบศอกดึงลงหน้าอก',
          vectorLabel: 'มือจับแคบตรงกลาง หุบศอกดึงลงมาหาอกล่างเน้นปีกล่าง ↓',
          photoUrl: BIOMECHANICAL_REAL_PHOTOS.VERTICAL_PULL_CLOSE
        }
      }
      return {
        pattern: 'VERTICAL_PULL_WIDE',
        gripMode: 'wide',
        postureTh: 'มือจับกว้างกว่าไหล่ กางศอกดึงลงหาอกบน',
        vectorLabel: 'จับบาร์กว้าง แอ่นอกรับ กดศอกดึงลงมาที่อกบนเน้นปีกบนกว้าง ↓',
        photoUrl: BIOMECHANICAL_REAL_PHOTOS.VERTICAL_PULL_WIDE
      }
    }
    return {
      pattern: 'HORIZONTAL_ROW',
      gripMode: isCloseGrip ? 'close' : 'neutral',
      postureTh: 'ดึงเข้าหาลำตัวแนวราบ บีบร่องสะบัก',
      vectorLabel: 'ดึงศอกผ่านสีข้างไปด้านหลัง บีบสะบักเข้าหากัน ←',
      photoUrl: BIOMECHANICAL_REAL_PHOTOS.HORIZONTAL_ROW
    }
  }

  // 3. หมวดอก (Chest)
  if (muscle === 'Chest') {
    if (n.includes('incline') || n.includes('อกบน') || n.includes('low-to-high') || n.includes('ช้อนเคเบิล')) {
      return {
        pattern: 'INCLINE_PRESS',
        gripMode: 'wide',
        postureTh: 'นั่งพิงเบาะเอียง 35-45° ดันเน้นอกบน',
        vectorLabel: 'เอนหลังพิงเบาะเอียง ดันดัมเบล/บาร์ขึ้นแนวดิ่งเหนืออกบน ↑',
        photoUrl: BIOMECHANICAL_REAL_PHOTOS.INCLINE_PRESS
      }
    }
    if (n.includes('push-up') || n.includes('วิดพื้น') || n.includes('dip') || n.includes('ดิปส์')) {
      return {
        pattern: 'PUSHUP_DIP',
        gripMode: isCloseGrip ? 'close' : 'wide',
        postureTh: 'คว่ำหน้าเกร็งลำตัวตรง ดันตัวขึ้นจากพื้น',
        vectorLabel: 'ย่ออกลงใกล้พื้น ↓ • ออกแรงอกและแขนดันลำตัวขึ้นสุด ↑',
        photoUrl: BIOMECHANICAL_REAL_PHOTOS.PUSHUP_DIP
      }
    }
    if (n.includes('fly') || n.includes('pec deck') || n.includes('crossover') || n.includes('ร่องอก') || n.includes('หนีบอก')) {
      return {
        pattern: 'CHEST_FLY',
        gripMode: 'wide',
        postureTh: 'วาดแขนโอบเข้าหากลางร่องอก',
        vectorLabel: 'กางแขนยืดอกออก ← → • โอบแขนเข้าบีบร่องอกด้านใน → ←',
        photoUrl: BIOMECHANICAL_REAL_PHOTOS.CHEST_FLY
      }
    }
    if (isCloseGrip) {
      return {
        pattern: 'CLOSE_GRIP_PRESS',
        gripMode: 'close',
        postureTh: 'นอนดันจับแคบ ศอกชิดลำตัว',
        vectorLabel: 'จับบาร์แคบช่วงไหล่ ดันขึ้นตรงๆ เน้นอกในและหลังแขน ↑',
        photoUrl: BIOMECHANICAL_REAL_PHOTOS.CLOSE_GRIP_PRESS
      }
    }
    return {
      pattern: 'FLAT_PRESS_WIDE',
      gripMode: 'wide',
      postureTh: 'นอนเตียงราบ ดันขึ้นตั้งฉากจากอกกลาง',
      vectorLabel: 'นอนเตียงราบ ดันขึ้นตั้งฉากจากอกกลาง ↑ • ต้านลงช้าๆ ↓',
      photoUrl: BIOMECHANICAL_REAL_PHOTOS.FLAT_PRESS_WIDE
    }
  }

  // 4. หมวดหัวไหล่และบ่า (Shoulders)
  if (muscle === 'Shoulders') {
    if (n.includes('lateral raise') || n.includes('กางดัมเบล') || n.includes('กางไหล่')) {
      return {
        pattern: 'LATERAL_RAISE',
        gripMode: 'wide',
        postureTh: 'ยืนตรง 2 ขา กางแขนยกดัมเบลออกด้านข้างระดับไหล่',
        vectorLabel: 'ยืนตรงนิ่งๆ ยกกางข้อศอกออกด้านข้างขึ้นมาที่ระดับหัวไหล่ ↖ ↗',
        photoUrl: BIOMECHANICAL_REAL_PHOTOS.LATERAL_RAISE
      }
    }
    if (n.includes('rear') || n.includes('reverse') || n.includes('face pull') || n.includes('ไหล่หลัง')) {
      return {
        pattern: 'HORIZONTAL_ROW',
        gripMode: 'wide',
        postureTh: 'กางศอกดึงไปด้านหลัง เน้นไหล่หลังและสะบัก',
        vectorLabel: 'ดึงแยกเชือกเคเบิล/กางดัมเบลไปด้านหลังเพื่อบีบไหล่หลัง ←',
        photoUrl: BIOMECHANICAL_REAL_PHOTOS.HORIZONTAL_ROW
      }
    }
    if (n.includes('shrug') || n.includes('ยักไหล่') || n.includes('farmer') || n.includes('เดินตรง')) {
      return {
        pattern: 'SHRUG_FARMER',
        gripMode: 'neutral',
        postureTh: 'ยืนตรงถือดัมเบลข้างลำตัว ยักไหล่สร้างบ่ารับเป้',
        vectorLabel: 'ออกแรงกล้ามเนื้อบ่าดึงหัวไหล่ขึ้นตรงๆ หาใบหู ↑ ค้าง 1 วินาที',
        photoUrl: BIOMECHANICAL_REAL_PHOTOS.SHRUG_FARMER
      }
    }
    return {
      pattern: 'SHOULDER_PRESS',
      gripMode: 'wide',
      postureTh: 'ยืน/นั่งหลังตรง ดันดัมเบลหรือบาร์เบลขึ้นเหนือศีรษะ',
      vectorLabel: 'ดันน้ำหนักจากระดับไหล่ชูขึ้นตรงๆ เหนือศีรษะ ↑ • ผ่อนลงระดับคาง ↓',
      photoUrl: BIOMECHANICAL_REAL_PHOTOS.SHOULDER_PRESS
    }
  }

  // 5. หมวดขา ก้น สะโพก และน่อง (Legs: แยก Bulgarian Split Squat, Lunges, Squat, RDL, Hip Thrust)
  if (muscle === 'Legs') {
    if (n.includes('hip thrust') || n.includes('glute bridge') || n.includes('kickback') || n.includes('ดันสะโพก') || n.includes('ปั้นก้น')) {
      return {
        pattern: 'HIP_THRUST_GLUTE',
        gripMode: 'neutral',
        postureTh: 'พาดสะบักกับม้านั่ง ดันสะโพกขึ้นบีบก้น',
        vectorLabel: 'ใช้ส้นเท้ากดพื้น ดันสะโพกขึ้นจนลำตัวขนานพื้นและบีบก้นค้าง ↑',
        photoUrl: BIOMECHANICAL_REAL_PHOTOS.HIP_THRUST_GLUTE
      }
    }
    if (n.includes('romanian') || n.includes('rdl') || n.includes('พับสะโพก')) {
      return {
        pattern: 'DEADLIFT_HINGE',
        gripMode: 'neutral',
        postureTh: 'ดันสะโพกไปด้านหลัง ยืดแฮมสตริงและก้น (RDL)',
        vectorLabel: 'ดันก้นไปด้านหลังจนตึงขาหลัง ← ↓ • บีบก้นดันสะโพกกลับขึ้นมา → ↑',
        photoUrl: BIOMECHANICAL_REAL_PHOTOS.DEADLIFT_HINGE
      }
    }
    if (n.includes('bulgarian') || n.includes('split squat') || n.includes('พาดม้านั่ง') || n.includes('ขาเดียว')) {
      return {
        pattern: 'BULGARIAN_SPLIT_SQUAT',
        gripMode: 'neutral',
        postureTh: 'วางหลังเท้าข้างหนึ่งพาดม้านั่งด้านหลัง ย่อเข่าขาหน้า 90°',
        vectorLabel: 'วางเท้าหลังบนม้านั่ง ย่อเข่าหน้าลงแนวดิ่ง ↓ • ถีบส้นเท้าหน้าดันตัวขึ้น ↑',
        photoUrl: BIOMECHANICAL_REAL_PHOTOS.BULGARIAN_SPLIT_SQUAT
      }
    }
    if (n.includes('lunge') || n.includes('step-up') || n.includes('ก้าวย่อ') || n.includes('ก้าวขึ้น')) {
      return {
        pattern: 'LUNGE_UNILATERAL',
        gripMode: 'neutral',
        postureTh: 'ก้าวขาหน้า-ขาหลังแยกกัน ย่อเข่าทั้ง 2 ข้างลง 90°',
        vectorLabel: 'ก้าวขาหน้าออกไป ย่อเข่าลงแนวดิ่ง ↓ • ใช้ขาหน้าถีบตัวขึ้น ↑',
        photoUrl: BIOMECHANICAL_REAL_PHOTOS.LUNGE_UNILATERAL
      }
    }
    if (n.includes('calf') || n.includes('tibialis') || n.includes('เขย่งน่อง') || n.includes('extension') || n.includes('curl')) {
      return {
        pattern: 'LEG_ISOLATION',
        gripMode: 'neutral',
        postureTh: 'บริหารเฉพาะส่วนข้อเข่า / ยืนเขย่งน่อง 2 ขา',
        vectorLabel: 'เตะเหยียดขา หรือเขย่งปลายเท้าขึ้นสุดระยะ ↑ แล้วเกร็งค้าง 1 วินาที',
        photoUrl: BIOMECHANICAL_REAL_PHOTOS.LEG_ISOLATION
      }
    }
    if (n.includes('goblet') || n.includes('สควอทถือดัมเบล') || n.includes('ถือดัมเบลแนบอก') || n.includes('ดัมเบลแนบอก')) {
      return {
        pattern: 'GOBLET_SQUAT',
        gripMode: 'neutral',
        postureTh: 'ถือดัมเบลแนบอกชิดกระดูกสันอก ลำตัวนิ่ง ย่อเข่าพับสะโพกส่งก้นลงขนานพื้น',
        vectorLabel: 'กอดดัมเบลแนบอก ย่อเข่าส่งสะโพกลงขนานพื้น ↓ • ลำตัวนิ่งคงที่ ถีบส้นเท้าขึ้นตรงๆ ↑',
        photoUrl: BIOMECHANICAL_REAL_PHOTOS.SQUAT_BILATERAL
      }
    }
    return {
      pattern: 'SQUAT_BILATERAL',
      gripMode: 'neutral',
      postureTh: 'ยืนสองขากว้างเท่าไหล่ พับสะโพกย่อเข่าลง',
      vectorLabel: 'พับสะโพกย่อเข่าลง ↓ • ถีบพื้นเต็มเท้าดันตัวขึ้นตรงๆ ↑',
      photoUrl: BIOMECHANICAL_REAL_PHOTOS.SQUAT_BILATERAL
    }
  }

  // 6. หมวดหน้าท้อง (Core: แยกแพลงก์, โหนบาร์ยกขา, นอนซิทอัพ/ครันช์, ปีนเขา, รัสเชียนทวิสต์)
  if (muscle === 'Core') {
    if (n.includes('plank') || n.includes('แพลงก์')) {
      return {
        pattern: 'CORE_PLANK',
        gripMode: 'neutral',
        postureTh: 'นอนคว่ำยันศอก ลำตัวขนานพื้นเกร็งแกนกลางตรงดั่งท่อนไม้',
        vectorLabel: 'วางศอก 90° กดปลายเท้า เกร็งหน้าท้อง-สะโพก-ก้นเป็นเส้นตรงระนาบเดียวกัน ↔',
        photoUrl: BIOMECHANICAL_REAL_PHOTOS.CORE_CRUNCH
      }
    }
    if (n.includes('hanging') || n.includes('โหนบาร์') || n.includes('leg raise') || n.includes('knee raise')) {
      return {
        pattern: 'CORE_HANGING_RAISE',
        gripMode: 'wide',
        postureTh: 'โหนบาร์แขนตึง ใช้หน้าท้องล่างม้วนดึงเข่า/ขาขึ้น 90°',
        vectorLabel: 'ล็อกตัวไม่ให้แกว่ง ม้วนสะโพกดึงเข่าขึ้นมาที่ระดับหน้าอก ↑ ค้าง 1 วินาที',
        photoUrl: BIOMECHANICAL_REAL_PHOTOS.CORE_CRUNCH
      }
    }
    if (n.includes('mountain') || n.includes('climber') || n.includes('ปีนเขา')) {
      return {
        pattern: 'CORE_MOUNTAIN_CLIMBER',
        gripMode: 'neutral',
        postureTh: 'ตั้งท่าดันพื้น แทงเข่าสลับซ้าย-ขวาเข้าหาหน้าอกอย่างรวดเร็ว',
        vectorLabel: 'หลังตรง แทงเข่าสลับซ้าย-ขวาต่อเนื่อง ↔ รีดไขมันหน้าท้องลึก',
        photoUrl: BIOMECHANICAL_REAL_PHOTOS.CORE_CRUNCH
      }
    }
    if (n.includes('twist') || n.includes('woodchopper') || n.includes('บิดลำตัว') || n.includes('pallof')) {
      return {
        pattern: 'CORE_RUSSIAN_TWIST',
        gripMode: 'neutral',
        postureTh: 'นั่งตัววี (V-Sit) ยกขาลอยเล็กน้อย บิดเอวซ้าย-ขวา',
        vectorLabel: 'เกร็งหน้าท้อง เอนตัว 45° บิดช่วงเอวซ้าย-ขวา ↺ ↻ สร้างร่อง 11 และเอวคอด',
        photoUrl: BIOMECHANICAL_REAL_PHOTOS.CORE_CRUNCH
      }
    }
    if (n.includes('cable crunch') || n.includes('kneeling') || n.includes('คุกเข่า')) {
      return {
        pattern: 'CORE_KNEELING_CRUNCH',
        gripMode: 'close',
        postureTh: 'คุกเข่าจับเชือกเคเบิลข้างใบหู พับม้วนซี่โครงเข้าหาเชิงกราน',
        vectorLabel: 'สะโพกนิ่ง ม้วนกระดูกสันหลังพับหน้าท้องลงหาพื้น ↓ บีบซิกแพคลึก',
        photoUrl: BIOMECHANICAL_REAL_PHOTOS.CORE_CRUNCH
      }
    }
    // Bicycle Crunch, Reverse Crunch, Standard Crunch
    return {
      pattern: 'CORE_CRUNCH_LYING',
      gripMode: 'neutral',
      postureTh: 'นอนหงายชันเข่า ม้วนหน้าท้องยกสะบักลอยจากพื้น',
      vectorLabel: 'ม้วนหน้าท้องดึงกระดูกอกเข้าหากระดูกเชิงกราน ↑ ไม่ใช้มือกระชากคอ',
      photoUrl: BIOMECHANICAL_REAL_PHOTOS.CORE_CRUNCH
    }
  }

  // 7. หมวดคาร์ดิโอและเดินชันลู่วิ่ง (Cardio: มี 2 ขาก้าวเดินสลับกัน)
  return {
    pattern: 'CARDIO_INCLINE',
    gripMode: 'neutral',
    postureTh: 'ก้าวเดินไต่ความชันสลับซ้าย-ขวา โน้มตัวหน้าเล็กน้อย',
    vectorLabel: 'ก้าวเดิน 2 ขาสลับกันขึ้นทางชันสม่ำเสมอ ↗ (ห้ามเกาะราวลู่วิ่งเอนหลัง)',
    photoUrl: BIOMECHANICAL_REAL_PHOTOS.CARDIO_INCLINE
  }
}

export default function ExerciseIllustration({ name = '', muscle, type, size = 'md', compactAnimated = false }) {
  const [isAnimating, setIsAnimating] = useState(true)
  const [displayMode, setDisplayMode] = useState('vector')

  const isHeroBanner = size === 'xl'
  const shouldAnimate = isHeroBanner || size === 'lg' || compactAnimated

  const sizeClasses =
    size === 'xl'
      ? 'w-full h-64 sm:h-72 rounded-2xl'
      : size === 'lg'
        ? 'w-24 sm:w-28 h-18 sm:h-20 rounded-xl'
        : 'w-14 h-14 rounded-xl'

  const colorMap = {
    Warmup: { bg: 'from-amber-950 via-slate-900 to-slate-950', lightBg: 'bg-amber-50 border-amber-300', primary: '#f59e0b', glow: '#fde68a', labelTh: 'WARM-UP • วอร์มร่างกาย' },
    Chest: { bg: 'from-rose-950 via-slate-900 to-slate-950', lightBg: 'bg-rose-50 border-rose-200', primary: '#f43f5e', glow: '#fda4af', labelTh: 'CHEST • กล้ามเนื้ออก' },
    Back: { bg: 'from-indigo-950 via-slate-900 to-slate-950', lightBg: 'bg-indigo-50 border-indigo-200', primary: '#6366f1', glow: '#a5b4fc', labelTh: 'BACK • แผ่นหลังและปีก' },
    Legs: { bg: 'from-emerald-950 via-slate-900 to-slate-950', lightBg: 'bg-emerald-50 border-emerald-200', primary: '#10b981', glow: '#6ee7b7', labelTh: 'LEGS • ขา ก้น สะโพก น่อง' },
    Shoulders: { bg: 'from-amber-950 via-slate-900 to-slate-950', lightBg: 'bg-amber-50 border-amber-200', primary: '#f59e0b', glow: '#fcd34d', labelTh: 'SHOULDERS • หัวไหล่และบ่า' },
    Arms: { bg: 'from-purple-950 via-slate-900 to-slate-950', lightBg: 'bg-purple-50 border-purple-200', primary: '#a855f7', glow: '#d8b4fe', labelTh: 'ARMS • หน้าแขนและหลังแขน' },
    Core: { bg: 'from-teal-950 via-slate-900 to-slate-950', lightBg: 'bg-teal-50 border-teal-200', primary: '#14b8a6', glow: '#5eead4', labelTh: 'CORE • หน้าท้องและเอว' },
    Cardio: { bg: 'from-sky-950 via-slate-900 to-slate-950', lightBg: 'bg-sky-50 border-sky-200', primary: '#0ea5e9', glow: '#7dd3fc', labelTh: 'CARDIO • ลู่วิ่งเดินชัน' }
  }

  const bio = classifyExerciseBiomechanics(name, muscle, type)
  const isWarmupPattern = bio.pattern.startsWith('WARMUP_')
  const theme = isWarmupPattern ? colorMap.Warmup : colorMap[muscle] || colorMap.Chest

  return (
    <div
      className={`${sizeClasses} ${
        shouldAnimate
          ? `bg-gradient-to-br ${theme.bg} text-white border border-slate-800 shadow-inner`
          : `${theme.lightBg} border`
      } flex flex-col items-center justify-center p-1.5 shrink-0 relative overflow-hidden select-none`}
    >
      {/* แถบหัวการ์ดสำหรับโหมด Hero Card (ตัวหนังสือใหญ่ขึ้น ไม่เบียดกัน) */}
      {isHeroBanner ? (
        <div className="absolute top-2.5 left-3 right-3 flex flex-wrap items-center justify-between gap-1.5 z-20">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className="px-2.5 py-1 text-xs font-black tracking-wide uppercase rounded-lg border"
              style={{
                backgroundColor: `${theme.primary}30`,
                borderColor: `${theme.primary}70`,
                color: theme.glow
              }}
            >
              {theme.labelTh}
            </span>
            <span className="hidden sm:inline-block px-2.5 py-1 text-xs font-bold bg-slate-950/85 text-slate-100 rounded-lg border border-white/15">
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
              className="px-3 py-1 text-xs font-extrabold text-amber-300 bg-slate-950/90 border border-amber-500/50 rounded-lg hover:bg-slate-800 transition"
            >
              {displayMode === 'vector' ? '📸 ภาพจริง' : '📐 ท่าจำลอง'}
            </button>

            {displayMode === 'vector' && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setIsAnimating(prev => !prev)
                }}
                className={`px-2.5 py-1 text-xs font-extrabold rounded-lg border transition ${
                  isAnimating
                    ? 'bg-emerald-500/25 text-emerald-300 border-emerald-500/50'
                    : 'bg-slate-800 text-slate-300 border-slate-600'
                }`}
              >
                {isAnimating ? '⏸' : '▶'}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="absolute top-1 left-1 opacity-85">
          <span className="text-[9px] font-black px-1 bg-white/90 text-slate-800 rounded">
            {(type || 'GYM').slice(0, 4).toUpperCase()}
          </span>
        </div>
      )}

      {/* ป้ายบอกทิศทางการออกแรงด้านล่างสุดของการ์ด (ตัวหนังสืออ่านง่าย) */}
      {isHeroBanner && (
        <div className="absolute bottom-2 left-3 right-3 flex items-center justify-center z-20 pointer-events-none">
          <span className="px-3 py-1 text-xs font-extrabold text-emerald-300 bg-slate-950/95 border border-emerald-500/40 rounded-lg truncate max-w-full">
            🎯 {bio.vectorLabel}
          </span>
        </div>
      )}

      {/* โหมดแสดงภาพถ่ายจริง */}
      {isHeroBanner && displayMode === 'photo' ? (
        <div className="relative w-full h-full rounded-xl overflow-hidden">
          <img
            src={bio.photoUrl}
            alt={name}
            className="w-full h-full object-cover object-center opacity-85"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />
          <div className="absolute bottom-10 left-4 right-4 flex items-center justify-between gap-2">
            <span className="px-3 py-1.5 text-xs font-black text-white bg-slate-950/90 border border-white/20 rounded-xl truncate">
              {name.split('(')[0]}
            </span>
            <a
              href={getExerciseYouTubeUrl(name)}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-1.5 text-xs font-extrabold text-white bg-rose-600 rounded-xl shadow-md hover:bg-rose-500 shrink-0"
            >
              ▶ ดูคลิปสอนบน YouTube
            </a>
          </div>
        </div>
      ) : (
        /* โหมดแผนภาพชีวกลศาสตร์ 2 มุมมอง (Front View & Side View) */
        <svg
          viewBox={shouldAnimate ? '0 0 320 165' : '0 0 100 100'}
          className={isHeroBanner ? 'w-full h-full mt-4 mb-3' : 'w-full h-full'}
        >
          <defs>
            <marker id="arrowConcentric" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="#34d399" />
            </marker>
          </defs>

          {shouldAnimate ? (
            <>
              {isHeroBanner && (
                <>
                  <line x1="160" y1="26" x2="160" y2="136" stroke="#334155" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="14" y1="134" x2="306" y2="134" stroke="#475569" strokeWidth="1.5" />

                  <text x="80" y="34" textAnchor="middle" className="text-[9px] font-extrabold fill-slate-300 uppercase">
                    1. มุมด้านหน้า (FRONT)
                  </text>
                  <text x="240" y="34" textAnchor="middle" className="text-[9px] font-extrabold fill-sky-300 uppercase">
                    2. มุมด้านข้าง (SIDE)
                  </text>
                </>
              )}

              {/* ===============================================================
                  0A. WARMUP_ARM_CIRCLES (ยืนตรงหมุนไหล่เป็นวงกลม & เหวี่ยงแขนสลับหน้าอก)
                 =============================================================== */}
              {bio.pattern === 'WARMUP_ARM_CIRCLES' && (
                <>
                  {/* มุมด้านหน้า: ยืนตรง 2 ขา กางแขนหมุนหัวไหล่ */}
                  <g transform="translate(80, 44)">
                    <circle cx="0" cy="12" r="7" fill="#cbd5e1" />
                    <rect x="-12" y="21" width="24" height="32" rx="5" fill="#475569" />
                    {/* หัวไหล่ทั้ง 2 ข้างไฮไลท์สีส้มทอง */}
                    <circle cx="-14" cy="25" r="5" fill={theme.primary} />
                    <circle cx="14" cy="25" r="5" fill={theme.primary} />
                    {/* ขา 2 ข้างยืนตรงมั่นคง ไม่ย่อเข่า */}
                    <line x1="-8" y1="53" x2="-10" y2="88" stroke="#94a3b8" strokeWidth="5.5" strokeLinecap="round" />
                    <line x1="8" y1="53" x2="10" y2="88" stroke="#94a3b8" strokeWidth="5.5" strokeLinecap="round" />
                    {/* แขนซ้าย-ขวาหมุนขึ้นลงเปิดสะบัก */}
                    <g>
                      {isAnimating && (
                        <animateTransform
                          attributeName="transform"
                          type="rotate"
                          values="-28 -14 25; 28 -14 25; -28 -14 25"
                          dur="1.6s"
                          repeatCount="indefinite"
                        />
                      )}
                      <line x1="-14" y1="25" x2="-40" y2="25" stroke="#e2e8f0" strokeWidth="4.5" strokeLinecap="round" />
                      <circle cx="-40" cy="25" r="3.5" fill={theme.glow} />
                    </g>
                    <g>
                      {isAnimating && (
                        <animateTransform
                          attributeName="transform"
                          type="rotate"
                          values="28 14 25; -28 14 25; 28 14 25"
                          dur="1.6s"
                          repeatCount="indefinite"
                        />
                      )}
                      <line x1="14" y1="25" x2="40" y2="25" stroke="#e2e8f0" strokeWidth="4.5" strokeLinecap="round" />
                      <circle cx="40" cy="25" r="3.5" fill={theme.glow} />
                    </g>
                  </g>

                  {/* มุมด้านข้าง: เห็นแขนหมุนเป็นวงกลม 360 องศาชัดเจน */}
                  <g transform="translate(235, 44)">
                    <circle cx="0" cy="12" r="7" fill="#cbd5e1" />
                    <rect x="-7" y="21" width="14" height="32" rx="4" fill="#475569" />
                    <line x1="-3" y1="53" x2="-5" y2="88" stroke="#94a3b8" strokeWidth="5.5" strokeLinecap="round" />
                    <line x1="4" y1="53" x2="6" y2="88" stroke="#64748b" strokeWidth="5.5" strokeLinecap="round" />
                    {/* วงกลมเส้นประแสดงวิถีหมุนหัวไหล่ */}
                    <circle cx="0" cy="26" r="24" fill="none" stroke="#34d399" strokeWidth="1.8" strokeDasharray="4 3" />
                    <circle cx="0" cy="26" r="5" fill={theme.primary} />
                    <g>
                      {isAnimating && (
                        <animateTransform
                          attributeName="transform"
                          type="rotate"
                          from="0 0 26"
                          to="360 0 26"
                          dur="2.0s"
                          repeatCount="indefinite"
                        />
                      )}
                      <line x1="0" y1="26" x2="0" y2="2" stroke="#e2e8f0" strokeWidth="4.5" strokeLinecap="round" />
                      <circle cx="0" cy="2" r="4" fill={theme.glow} />
                    </g>
                    <text x="30" y="28" className="text-[8.5px] font-bold fill-emerald-300">หมุนไหล่ ↺</text>
                  </g>
                </>
              )}

              {/* ===============================================================
                  0B. WARMUP_SCAPULAR_PUSHUP (หมุนข้อมือ + ท่าแพลงก์แขนตึงดันสะบักขึ้น-ลง)
                 =============================================================== */}
              {bio.pattern === 'WARMUP_SCAPULAR_PUSHUP' && (
                <>
                  {/* มุมด้านหน้า: ประสานมือหมุนข้อมือและบีบ-กางสะบัก */}
                  <g transform="translate(80, 44)">
                    <circle cx="0" cy="14" r="7" fill="#cbd5e1" />
                    <rect x="-13" y="23" width="26" height="32" rx="5" fill="#475569" />
                    <line x1="-8" y1="55" x2="-9" y2="88" stroke="#94a3b8" strokeWidth="5" strokeLinecap="round" />
                    <line x1="8" y1="55" x2="9" y2="88" stroke="#94a3b8" strokeWidth="5" strokeLinecap="round" />
                    <circle cx="0" cy="36" r="11" fill="none" stroke={theme.glow} strokeWidth="2" strokeDasharray="3 2" />
                    <g>
                      {isAnimating && (
                        <animateTransform
                          attributeName="transform"
                          type="rotate"
                          from="0 0 36"
                          to="360 0 36"
                          dur="1.8s"
                          repeatCount="indefinite"
                        />
                      )}
                      <circle cx="0" cy="26" r="4.5" fill={theme.primary} />
                    </g>
                    <text x="0" y="78" textAnchor="middle" className="text-[8px] font-bold fill-amber-300">1.หมุนข้อมือ-ข้อศอก</text>
                  </g>

                  {/* มุมด้านข้าง: ท่า Plank แขนตึง ดันสะบักขึ้น-ลง */}
                  <g transform="translate(235, 44)">
                    <g>
                      {isAnimating && (
                        <animateTransform
                          attributeName="transform"
                          type="translate"
                          values="0,0; 0,-7; 0,0"
                          dur="1.8s"
                          repeatCount="indefinite"
                        />
                      )}
                      <circle cx="24" cy="42" r="6" fill="#cbd5e1" />
                      {/* ลำตัวและสะบักในท่าแพลงก์ */}
                      <line x1="18" y1="46" x2="-12" y2="62" stroke={theme.primary} strokeWidth="9" strokeLinecap="round" />
                      {/* ขาเหยียดตรงยันปลายเท้า */}
                      <line x1="-12" y1="62" x2="-34" y2="84" stroke="#94a3b8" strokeWidth="6" strokeLinecap="round" />
                    </g>
                    {/* แขนตึงค้ำพื้น */}
                    <line x1="16" y1="46" x2="18" y2="86" stroke="#e2e8f0" strokeWidth="4.5" strokeLinecap="round" />
                    <line x1="28" y1="58" x2="28" y2="26" stroke="#34d399" strokeWidth="2.5" markerEnd="url(#arrowConcentric)" />
                    <text x="0" y="20" textAnchor="middle" className="text-[8.5px] font-bold fill-emerald-300">2.แขนตึง ดันสะบักขึ้น ↑</text>
                  </g>
                </>
              )}

              {/* ===============================================================
                  0C. WARMUP_HIP_STRETCH (ก้าวย่อเปิดสะโพก บิดลำตัวชูแขน & โยกข้อเท้า)
                 =============================================================== */}
              {bio.pattern === 'WARMUP_HIP_STRETCH' && (
                <>
                  {/* มุมด้านหน้า: ก้าวย่อเปิดสะโพก ชูแขนบิดลำตัว */}
                  <g transform="translate(80, 44)">
                    <circle cx="0" cy="18" r="6.5" fill="#cbd5e1" />
                    <rect x="-11" y="27" width="22" height="26" rx="4" fill={theme.primary} />
                    <line x1="-10" y1="53" x2="-18" y2="88" stroke="#e2e8f0" strokeWidth="5.5" strokeLinecap="round" />
                    <line x1="10" y1="53" x2="18" y2="88" stroke="#94a3b8" strokeWidth="5.5" strokeLinecap="round" />
                    <g>
                      {isAnimating && (
                        <animateTransform
                          attributeName="transform"
                          type="rotate"
                          values="40 10 30; -25 10 30; 40 10 30"
                          dur="2.0s"
                          repeatCount="indefinite"
                        />
                      )}
                      <line x1="10" y1="30" x2="28" y2="4" stroke={theme.glow} strokeWidth="4.5" strokeLinecap="round" />
                    </g>
                  </g>

                  {/* มุมด้านข้าง: ก้าวย่อยาว ขาหลังเหยียดตึง ขาหน้าย่อเปิดสะโพกและข้อเท้า */}
                  <g transform="translate(235, 44)">
                    <g>
                      {isAnimating && (
                        <animateTransform
                          attributeName="transform"
                          type="translate"
                          values="0,0; 6,5; 0,0"
                          dur="2.0s"
                          repeatCount="indefinite"
                        />
                      )}
                      <circle cx="8" cy="24" r="6.5" fill="#cbd5e1" />
                      <line x1="6" y1="32" x2="-6" y2="56" stroke={theme.primary} strokeWidth="8.5" strokeLinecap="round" />
                      {/* ขาหลังเหยียดยาวเปิดหน้าขา/สะโพก */}
                      <line x1="-6" y1="56" x2="-34" y2="86" stroke="#94a3b8" strokeWidth="5.5" strokeLinecap="round" />
                      {/* ขาหน้าก้าวย่อ 90 องศา */}
                      <polyline points="-6,56 18,56 22,86" fill="none" stroke="#e2e8f0" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                      {/* แขนบิดชูขึ้นฟ้า */}
                      <line x1="6" y1="34" x2="18" y2="6" stroke={theme.glow} strokeWidth="4.5" strokeLinecap="round" />
                    </g>
                    <text x="-6" y="14" textAnchor="middle" className="text-[8.5px] font-bold fill-emerald-300">ก้าวย่อเปิดสะโพก & ข้อเท้า ↗</text>
                  </g>
                </>
              )}

              {/* ===============================================================
                  1A. VERTICAL_PULL_WIDE (ดึงบาร์จับกว้าง Wide-Grip Lat Pulldown / Pull-Up)
                 =============================================================== */}
              {bio.pattern === 'VERTICAL_PULL_WIDE' && (
                <>
                  <g transform="translate(80, 42)">
                    <line x1="0" y1="-4" x2="0" y2="28" stroke="#64748b" strokeWidth="1.5" strokeDasharray="2 2" />
                    <circle cx="0" cy="24" r="6.5" fill="#cbd5e1" />
                    <polygon points="-17,32 17,32 11,64 -11,64" fill={theme.primary} />
                    <line x1="-8" y1="64" x2="-10" y2="90" stroke="#94a3b8" strokeWidth="5" strokeLinecap="round" />
                    <line x1="8" y1="64" x2="10" y2="90" stroke="#94a3b8" strokeWidth="5" strokeLinecap="round" />
                    <g>
                      {isAnimating && (
                        <animateTransform attributeName="transform" type="translate" values="0,0; 0,20; 0,0" dur="2.2s" repeatCount="indefinite" />
                      )}
                      <line x1="-32" y1="8" x2="32" y2="8" stroke={theme.glow} strokeWidth="3.5" strokeLinecap="round" />
                      <line x1="-26" y1="8" x2="-15" y2="32" stroke="#e2e8f0" strokeWidth="4" strokeLinecap="round" />
                      <line x1="26" y1="8" x2="15" y2="32" stroke="#e2e8f0" strokeWidth="4" strokeLinecap="round" />
                    </g>
                  </g>

                  <g transform="translate(235, 42)">
                    <line x1="6" y1="-4" x2="6" y2="38" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="2 2" />
                    <rect x="-16" y="64" width="24" height="5" rx="2" fill="#475569" />
                    <circle cx="-6" cy="24" r="6.5" fill="#cbd5e1" />
                    <line x1="-5" y1="32" x2="-2" y2="62" stroke={theme.primary} strokeWidth="10" strokeLinecap="round" />
                    <polyline points="-2,62 12,64 12,88" fill="none" stroke="#94a3b8" strokeWidth="5" strokeLinecap="round" />
                    <g>
                      {isAnimating && (
                        <animateTransform attributeName="transform" type="translate" values="0,0; -3,22; 0,0" dur="2.2s" repeatCount="indefinite" />
                      )}
                      <circle cx="6" cy="10" r="4" fill={theme.glow} />
                      <line x1="-3" y1="34" x2="6" y2="10" stroke="#e2e8f0" strokeWidth="4.5" strokeLinecap="round" />
                    </g>
                    <line x1="22" y1="6" x2="18" y2="38" stroke="#34d399" strokeWidth="2.5" markerEnd="url(#arrowConcentric)" />
                    <text x="26" y="22" className="text-[8.5px] font-bold fill-emerald-300">ดึงลงอกบน ↓</text>
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
                    <line x1="-8" y1="64" x2="-10" y2="90" stroke="#94a3b8" strokeWidth="5" strokeLinecap="round" />
                    <line x1="8" y1="64" x2="10" y2="90" stroke="#94a3b8" strokeWidth="5" strokeLinecap="round" />
                    <g>
                      {isAnimating && (
                        <animateTransform attributeName="transform" type="translate" values="0,0; 0,22; 0,0" dur="2.2s" repeatCount="indefinite" />
                      )}
                      <polygon points="0,2 -9,12 9,12" fill="none" stroke={theme.glow} strokeWidth="3" />
                      <line x1="-6" y1="12" x2="-9" y2="34" stroke="#e2e8f0" strokeWidth="4.5" strokeLinecap="round" />
                      <line x1="6" y1="12" x2="9" y2="34" stroke="#e2e8f0" strokeWidth="4.5" strokeLinecap="round" />
                    </g>
                  </g>

                  <g transform="translate(235, 42)">
                    <line x1="10" y1="-4" x2="10" y2="42" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="2 2" />
                    <rect x="-16" y="64" width="24" height="5" rx="2" fill="#475569" />
                    <circle cx="-6" cy="24" r="6.5" fill="#cbd5e1" />
                    <line x1="-5" y1="32" x2="-2" y2="62" stroke={theme.primary} strokeWidth="10" strokeLinecap="round" />
                    <polyline points="-2,62 12,64 12,88" fill="none" stroke="#94a3b8" strokeWidth="5" strokeLinecap="round" />
                    <g>
                      {isAnimating && (
                        <animateTransform attributeName="transform" type="translate" values="0,0; -4,24; 0,0" dur="2.2s" repeatCount="indefinite" />
                      )}
                      <circle cx="10" cy="10" r="4" fill={theme.glow} />
                      <polyline points="-3,34 12,26 10,10" fill="none" stroke="#e2e8f0" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
                    </g>
                    <line x1="24" y1="8" x2="20" y2="42" stroke="#34d399" strokeWidth="2.5" markerEnd="url(#arrowConcentric)" />
                    <text x="28" y="26" className="text-[8.5px] font-bold fill-emerald-300">หุบศอกดึงลง ↓</text>
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
                    <rect x="-12" y="21" width="24" height="34" rx="4" fill="#475569" />
                    <line x1="-8" y1="55" x2="-9" y2="88" stroke="#94a3b8" strokeWidth="5" strokeLinecap="round" />
                    <line x1="8" y1="55" x2="9" y2="88" stroke="#94a3b8" strokeWidth="5" strokeLinecap="round" />
                    <rect x="-18" y="23" width="6" height="20" rx="3" fill={theme.primary} />
                    <rect x="12" y="23" width="6" height="20" rx="3" fill={theme.primary} />
                    <g>
                      {isAnimating && (
                        <animateTransform attributeName="transform" type="translate" values="0,-8; 0,16; 0,-8" dur="1.9s" repeatCount="indefinite" />
                      )}
                      <line x1="-5" y1="36" x2="-14" y2="48" stroke={theme.glow} strokeWidth="3.5" strokeLinecap="round" />
                      <line x1="5" y1="36" x2="14" y2="48" stroke={theme.glow} strokeWidth="3.5" strokeLinecap="round" />
                    </g>
                  </g>

                  <g transform="translate(235, 42)">
                    <line x1="14" y1="-4" x2="14" y2="44" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="2 2" />
                    <circle cx="-4" cy="12" r="6.5" fill="#cbd5e1" />
                    <rect x="-10" y="21" width="12" height="34" rx="4" fill="#475569" />
                    <line x1="-6" y1="55" x2="-8" y2="88" stroke="#94a3b8" strokeWidth="5" strokeLinecap="round" />
                    <line x1="0" y1="55" x2="2" y2="88" stroke="#64748b" strokeWidth="5" strokeLinecap="round" />
                    <rect x="-8" y="23" width="7" height="22" rx="3" fill={theme.primary} />
                    <circle cx="-4" cy="44" r="3.5" fill="#ffffff" />
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
                    <text x="31" y="44" className="text-[8.5px] font-bold fill-emerald-300">กดเหยียดลง ↓</text>
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
                    <rect x="-12" y="33" width="24" height="30" rx="4" fill="#475569" />
                    <line x1="-8" y1="63" x2="-9" y2="88" stroke="#94a3b8" strokeWidth="5" strokeLinecap="round" />
                    <line x1="8" y1="63" x2="9" y2="88" stroke="#94a3b8" strokeWidth="5" strokeLinecap="round" />
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
                    <rect x="-6" y="35" width="12" height="30" rx="4" fill="#475569" />
                    <line x1="-3" y1="65" x2="-5" y2="88" stroke="#94a3b8" strokeWidth="5" strokeLinecap="round" />
                    <line x1="3" y1="65" x2="5" y2="88" stroke="#64748b" strokeWidth="5" strokeLinecap="round" />
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
                    <line x1="-8" y1="55" x2="-9" y2="86" stroke="#94a3b8" strokeWidth="5" strokeLinecap="round" />
                    <line x1="8" y1="55" x2="9" y2="86" stroke="#94a3b8" strokeWidth="5" strokeLinecap="round" />
                    <rect x="-18" y="28" width="6" height="20" rx="2.5" fill={theme.primary} />
                    <rect x="12" y="28" width="6" height="20" rx="2.5" fill={theme.primary} />
                  </g>

                  <g transform="translate(235, 44)">
                    <circle cx="16" cy="22" r="6.5" fill="#cbd5e1" />
                    <line x1="12" y1="28" x2="-12" y2="48" stroke="#64748b" strokeWidth="9" strokeLinecap="round" />
                    <line x1="-12" y1="48" x2="-16" y2="86" stroke="#94a3b8" strokeWidth="5.5" strokeLinecap="round" />
                    <line x1="-8" y1="48" x2="4" y2="86" stroke="#475569" strokeWidth="5.5" strokeLinecap="round" />
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
                    <rect x="-12" y="22" width="24" height="34" rx="4" fill="#475569" />
                    <line x1="-8" y1="56" x2="-9" y2="88" stroke="#94a3b8" strokeWidth="5" strokeLinecap="round" />
                    <line x1="8" y1="56" x2="9" y2="88" stroke="#94a3b8" strokeWidth="5" strokeLinecap="round" />
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
                    <rect x="-12" y="21" width="12" height="34" rx="4" fill="#475569" />
                    <line x1="-8" y1="55" x2="-10" y2="88" stroke="#94a3b8" strokeWidth="5" strokeLinecap="round" />
                    <line x1="-3" y1="55" x2="-1" y2="88" stroke="#64748b" strokeWidth="5" strokeLinecap="round" />
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
                  </g>

                  <g transform="translate(235, 42)">
                    {bio.pattern === 'INCLINE_PRESS' ? (
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
                      </>
                    ) : (
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
                    <line x1="-10" y1="52" x2="-12" y2="86" stroke="#cbd5e1" strokeWidth="5.5" strokeLinecap="round" />
                    <line x1="10" y1="52" x2="12" y2="86" stroke="#cbd5e1" strokeWidth="5.5" strokeLinecap="round" />
                  </g>

                  <g transform="translate(235, 44)">
                    <rect x="-32" y="46" width="16" height="40" rx="3" fill="#475569" />
                    <circle cx="-22" cy="36" r="6" fill="#cbd5e1" />
                    <g>
                      {isAnimating && (
                        <animateTransform attributeName="transform" type="translate" values="0,16; 0,-4; 0,16" dur="2.2s" repeatCount="indefinite" />
                      )}
                      <line x1="-18" y1="44" x2="8" y2="44" stroke={theme.primary} strokeWidth="9" strokeLinecap="round" />
                      <circle cx="2" cy="38" r="5.5" fill={theme.glow} />
                      <line x1="8" y1="44" x2="22" y2="54" stroke={theme.primary} strokeWidth="6" strokeLinecap="round" />
                    </g>
                    <line x1="22" y1="52" x2="22" y2="86" stroke="#cbd5e1" strokeWidth="5.5" strokeLinecap="round" />
                    <line x1="2" y1="68" x2="2" y2="18" stroke="#34d399" strokeWidth="2.5" markerEnd="url(#arrowConcentric)" />
                  </g>
                </>
              )}

              {/* ===============================================================
                  8A. SHOULDER_PRESS & LATERAL_RAISE & SHRUG (ยืน/นั่งตัวตรง ขา 2 ข้างนิ่ง ดัน/กางเฉพาะหัวไหล่!)
                 =============================================================== */}
              {(bio.pattern === 'SHOULDER_PRESS' || bio.pattern === 'LATERAL_RAISE' || bio.pattern === 'SHRUG_FARMER') && (
                <>
                  <g transform="translate(80, 44)">
                    <circle cx="0" cy="14" r="7" fill="#cbd5e1" />
                    <rect x="-12" y="23" width="24" height="32" rx="4" fill="#475569" />
                    <circle cx="-14" cy="26" r="5" fill={theme.primary} />
                    <circle cx="14" cy="26" r="5" fill={theme.primary} />
                    {/* ขา 2 ข้างยืนนิ่งมั่นคง ไม่ย่อเข่า */}
                    <line x1="-8" y1="55" x2="-9" y2="88" stroke="#94a3b8" strokeWidth="5.5" strokeLinecap="round" />
                    <line x1="8" y1="55" x2="9" y2="88" stroke="#94a3b8" strokeWidth="5.5" strokeLinecap="round" />

                    {bio.pattern === 'LATERAL_RAISE' ? (
                      <>
                        <g>
                          {isAnimating && (
                            <animateTransform attributeName="transform" type="rotate" values="65 -14 26; 0 -14 26; 65 -14 26" dur="2.0s" repeatCount="indefinite" />
                          )}
                          <line x1="-14" y1="26" x2="-38" y2="26" stroke="#e2e8f0" strokeWidth="4.5" strokeLinecap="round" />
                          <rect x="-42" y="22" width="6" height="8" rx="1.5" fill={theme.glow} />
                        </g>
                        <g>
                          {isAnimating && (
                            <animateTransform attributeName="transform" type="rotate" values="-65 14 26; 0 14 26; -65 14 26" dur="2.0s" repeatCount="indefinite" />
                          )}
                          <line x1="14" y1="26" x2="38" y2="26" stroke="#e2e8f0" strokeWidth="4.5" strokeLinecap="round" />
                          <rect x="36" y="22" width="6" height="8" rx="1.5" fill={theme.glow} />
                        </g>
                      </>
                    ) : (
                      <g>
                        {isAnimating && (
                          <animateTransform attributeName="transform" type="translate" values="0,12; 0,-12; 0,12" dur="2.0s" repeatCount="indefinite" />
                        )}
                        <line x1="-16" y1="26" x2="-20" y2="4" stroke="#e2e8f0" strokeWidth="4.5" strokeLinecap="round" />
                        <line x1="16" y1="26" x2="20" y2="4" stroke="#e2e8f0" strokeWidth="4.5" strokeLinecap="round" />
                        <rect x="-26" y="0" width="12" height="5" rx="1.5" fill={theme.glow} />
                        <rect x="14" y="0" width="12" height="5" rx="1.5" fill={theme.glow} />
                      </g>
                    )}
                  </g>

                  <g transform="translate(235, 44)">
                    <circle cx="0" cy="14" r="6.5" fill="#cbd5e1" />
                    <rect x="-7" y="23" width="14" height="32" rx="4" fill="#475569" />
                    <circle cx="0" cy="26" r="5.5" fill={theme.primary} />
                    <line x1="-4" y1="55" x2="-6" y2="88" stroke="#94a3b8" strokeWidth="5.5" strokeLinecap="round" />
                    <line x1="4" y1="55" x2="6" y2="88" stroke="#64748b" strokeWidth="5.5" strokeLinecap="round" />
                    <g>
                      {isAnimating && (
                        <animateTransform attributeName="transform" type="translate" values="0,12; 0,-14; 0,12" dur="2.0s" repeatCount="indefinite" />
                      )}
                      <line x1="0" y1="26" x2="0" y2="2" stroke="#e2e8f0" strokeWidth="5" strokeLinecap="round" />
                      <rect x="-7" y="-2" width="14" height="6" rx="2" fill={theme.glow} />
                    </g>
                    <line x1="22" y1="36" x2="22" y2="-4" stroke="#34d399" strokeWidth="2.5" markerEnd="url(#arrowConcentric)" />
                  </g>
                </>
              )}

              {/* ===============================================================
                  8B. BULGARIAN_SPLIT_SQUAT (สควอทขาเดียว วางหลังเท้าพาดม้านั่งด้านหลัง เห็นครบ 2 ขา!)
                 =============================================================== */}
              {bio.pattern === 'BULGARIAN_SPLIT_SQUAT' && (
                <>
                  {/* มุมด้านหน้า: ยืนขาหน้าเป็นหลัก ขาหลังพาดม้านั่ง */}
                  <g transform="translate(80, 42)">
                    <rect x="-20" y="64" width="40" height="6" rx="2" fill="#475569" />
                    <g>
                      {isAnimating && (
                        <animateTransform attributeName="transform" type="translate" values="0,0; 0,14; 0,0" dur="2.1s" repeatCount="indefinite" />
                      )}
                      <circle cx="0" cy="10" r="6.5" fill="#cbd5e1" />
                      <rect x="-11" y="19" width="22" height="28" rx="4" fill={theme.primary} />
                      {/* ดัมเบลถือข้างลำตัว */}
                      <rect x="-19" y="38" width="6" height="12" rx="2" fill={theme.glow} />
                      <rect x="13" y="38" width="6" height="12" rx="2" fill={theme.glow} />
                    </g>
                    <line x1="-5" y1="48" x2="-5" y2="88" stroke="#e2e8f0" strokeWidth="6" strokeLinecap="round" />
                    <line x1="6" y1="48" x2="10" y2="66" stroke="#64748b" strokeWidth="4.5" strokeLinecap="round" />
                  </g>

                  {/* มุมด้านข้าง: เห็นม้านั่งด้านหลัง + ขาหลังพาดม้านั่ง + ขาหน้าย่อ 90° ชัดเจน! */}
                  <g transform="translate(235, 42)">
                    {/* ม้านั่งรองหลังเท้าด้านหลัง */}
                    <rect x="-38" y="62" width="18" height="6" rx="2" fill="#64748b" />
                    <line x1="-34" y1="68" x2="-34" y2="88" stroke="#475569" strokeWidth="4" />
                    <line x1="-24" y1="68" x2="-24" y2="88" stroke="#475569" strokeWidth="4" />

                    <g>
                      {isAnimating && (
                        <animateTransform attributeName="transform" type="translate" values="0,0; 0,14; 0,0" dur="2.1s" repeatCount="indefinite" />
                      )}
                      <circle cx="2" cy="10" r="6.5" fill="#cbd5e1" />
                      <line x1="2" y1="18" x2="-2" y2="48" stroke={theme.primary} strokeWidth="9" strokeLinecap="round" />
                      {/* ขาหลัง (Rear Leg) ยื่นไปพาดบนม้านั่งด้านหลัง */}
                      <polyline points="-2,48 -14,68 -28,62" fill="none" stroke="#94a3b8" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
                      {/* ต้นขาหน้า (Front Thigh) ย่อรับน้ำหนัก */}
                      <line x1="-2" y1="48" x2="18" y2="62" stroke={theme.glow} strokeWidth="6.5" strokeLinecap="round" />
                    </g>
                    {/* หน้าแข้งขาหน้าตั้งฉากกับพื้น */}
                    <line x1="18" y1="60" x2="18" y2="88" stroke="#e2e8f0" strokeWidth="6" strokeLinecap="round" />
                    <line x1="30" y1="72" x2="30" y2="24" stroke="#34d399" strokeWidth="2.5" markerEnd="url(#arrowConcentric)" />
                  </g>
                </>
              )}

              {/* ===============================================================
                  8B_2. GOBLET_SQUAT (สควอทถือดัมเบลแนบอก: มุมด้านข้างเห็นดัมเบลแนบอก ลำตัวนิ่ง ย่อสะโพก หน้าขาและต้นขาต่อเนื่องกัน)
                 =============================================================== */}
              {bio.pattern === 'GOBLET_SQUAT' && (
                <>
                  {/* มุมด้านหน้า: ยืนสองขาถือดัมเบลแนบอก ย่อสะโพกลงเข่าผายออกอย่างสมดุล */}
                  <g transform="translate(80, 42)">
                    <g>
                      {isAnimating && (
                        <animateTransform
                          attributeName="transform"
                          type="translate"
                          values="0,0; 0,16; 0,0"
                          dur="2.2s"
                          repeatCount="indefinite"
                        />
                      )}
                      <circle cx="0" cy="10" r="6.5" fill="#cbd5e1" />
                      <rect x="-12" y="19" width="24" height="30" rx="5" fill={theme.primary} />
                      
                      {/* ดัมเบลแนบอกชิดกระดูกสันอก */}
                      <rect x="-7" y="22" width="14" height="4.5" rx="1.5" fill="#f59e0b" />
                      <rect x="-3" y="26.5" width="6" height="7" fill="#94a3b8" />
                      <rect x="-7" y="33.5" width="14" height="4.5" rx="1.5" fill="#f59e0b" />
                      
                      {/* สองแขนกอดประคองดัมเบลใต้ลูกตุ้ม */}
                      <path d="M -13 26 L -7 29" stroke="#e2e8f0" strokeWidth="4" strokeLinecap="round" />
                      <path d="M 13 26 L 7 29" stroke="#e2e8f0" strokeWidth="4" strokeLinecap="round" />
                    </g>
                    {/* สองขายืนกว้างเท่าไหล่ ย่อเข่าผายออกอย่างสมดุล */}
                    <line x1="-9" y1="50" x2="-14" y2="88" stroke="#e2e8f0" strokeWidth="6" strokeLinecap="round" />
                    <line x1="9" y1="50" x2="14" y2="88" stroke="#e2e8f0" strokeWidth="6" strokeLinecap="round" />
                  </g>

                  {/* มุมด้านข้าง: เห็นถือดัมเบลแนบอก ลำตัวคงที่/เอียงเล็กน้อยตามธรรมชาติ ต้นขาและหน้าขาต่อเนื่องกัน */}
                  <g transform="translate(235, 42)">
                    {/* เส้นระดับพื้น */}
                    <line x1="-35" y1="88" x2="35" y2="88" stroke="#334155" strokeWidth="2" strokeDasharray="3 3" />
                    <line x1="4" y1="88" x2="20" y2="88" stroke="#64748b" strokeWidth="4.5" strokeLinecap="round" />

                    <g>
                      {isAnimating && (
                        <animateTransform
                          attributeName="transform"
                          type="translate"
                          values="0,0; -7,16; 0,0"
                          dur="2.2s"
                          repeatCount="indefinite"
                        />
                      )}
                      <circle cx="2" cy="10" r="6.5" fill="#cbd5e1" />
                      
                      {/* ลำตัว (Torso): แนวกระดูกสันหลังคงที่ เอียงไปข้างหน้าเล็กน้อย 15° เพื่อความสมดุล ไม่โก่งงอ */}
                      <line x1="1" y1="18" x2="-5" y2="48" stroke={theme.primary} strokeWidth="9.5" strokeLinecap="round" />
                      
                      {/* ดัมเบลถือแนบอกด้านหน้าลำตัว (Goblet Position) */}
                      <g transform="translate(6, 21)">
                        <rect x="0" y="0" width="8" height="4.5" rx="1.5" fill="#f59e0b" />
                        <rect x="2.5" y="4.5" width="3" height="7" fill="#cbd5e1" />
                        <rect x="0" y="11.5" width="8" height="4.5" rx="1.5" fill="#f59e0b" />
                      </g>
                      {/* แขนสองข้างกอดประคองดัมเบลชิดอก */}
                      <polyline points="0,22 9,28 7,24" fill="none" stroke="#e2e8f0" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                      
                      {/* ก้นและสะโพก (Glutes): ไฮไลต์สีกล้ามเนื้อทำงาน */}
                      <circle cx="-5" cy="48" r="4.5" fill={theme.glow} />
                      
                      {/* ต้นขา (Thigh / Quads): เชื่อมต่อจากสะโพกไปหัวเข่าต่อเนื่องกัน */}
                      <line x1="-5" y1="48" x2="14" y2="64" stroke={theme.glow} strokeWidth="7" strokeLinecap="round" />
                    </g>

                    {/* หน้าขา/หน้าแข้ง (Shin): เชื่อมจากเข่าลงสู่ข้อเท้าเต็มเท้า ไม่ขาดตอน */}
                    <line x1="7" y1="64" x2="12" y2="88" stroke="#e2e8f0" strokeWidth="6.5" strokeLinecap="round" />
                    
                    {/* ลูกศรชี้นำแรงถีบส้นเท้า */}
                    <line x1="30" y1="72" x2="30" y2="24" stroke="#34d399" strokeWidth="2.5" markerEnd="url(#arrowConcentric)" />
                  </g>
                </>
              )}

              {/* ===============================================================
                  8C. LUNGE_UNILATERAL (Walking Lunges / Step-Up เห็นขาหน้า + ขาหลังครบ 2 ข้าง!)
                 =============================================================== */}
              {bio.pattern === 'LUNGE_UNILATERAL' && (
                <>
                  <g transform="translate(80, 42)">
                    <g>
                      {isAnimating && (
                        <animateTransform attributeName="transform" type="translate" values="0,0; 0,14; 0,0" dur="2.1s" repeatCount="indefinite" />
                      )}
                      <circle cx="0" cy="10" r="6.5" fill="#cbd5e1" />
                      <rect x="-11" y="19" width="22" height="28" rx="4" fill={theme.primary} />
                    </g>
                    <line x1="-7" y1="48" x2="-7" y2="88" stroke="#e2e8f0" strokeWidth="6" strokeLinecap="round" />
                    <line x1="7" y1="48" x2="7" y2="84" stroke="#64748b" strokeWidth="5" strokeLinecap="round" />
                  </g>

                  <g transform="translate(235, 42)">
                    <g>
                      {isAnimating && (
                        <animateTransform attributeName="transform" type="translate" values="0,0; 0,14; 0,0" dur="2.1s" repeatCount="indefinite" />
                      )}
                      <circle cx="0" cy="10" r="6.5" fill="#cbd5e1" />
                      <line x1="0" y1="18" x2="-2" y2="48" stroke={theme.primary} strokeWidth="9" strokeLinecap="round" />
                      {/* ขาหลังย่อเข่าลงใกล้พื้น */}
                      <polyline points="-2,48 -14,72 -28,74" fill="none" stroke="#94a3b8" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
                      {/* ต้นขาหน้าก้าวออกไปด้านหน้า */}
                      <line x1="-2" y1="48" x2="18" y2="60" stroke={theme.glow} strokeWidth="6.5" strokeLinecap="round" />
                    </g>
                    <line x1="18" y1="58" x2="18" y2="88" stroke="#e2e8f0" strokeWidth="6" strokeLinecap="round" />
                    <line x1="30" y1="72" x2="30" y2="24" stroke="#34d399" strokeWidth="2.5" markerEnd="url(#arrowConcentric)" />
                  </g>
                </>
              )}

              {/* ===============================================================
                  8D. CARDIO_INCLINE (เดินชันลู่วิ่ง: มุมข้างมีขาครบ 2 ข้าง ก้าวเดินสลับซ้าย-ขวา!)
                 =============================================================== */}
              {bio.pattern === 'CARDIO_INCLINE' && (
                <>
                  {/* มุมด้านหน้า: ก้าวเดิน 2 ขาสลับซ้าย-ขวา */}
                  <g transform="translate(80, 42)">
                    <circle cx="0" cy="12" r="6.5" fill="#cbd5e1" />
                    <rect x="-11" y="21" width="22" height="28" rx="4" fill={theme.primary} />
                    {/* ขาซ้าย */}
                    <g>
                      {isAnimating && (
                        <animateTransform attributeName="transform" type="translate" values="0,-5; 0,5; 0,-5" dur="1.1s" repeatCount="indefinite" />
                      )}
                      <line x1="-6" y1="49" x2="-7" y2="84" stroke="#e2e8f0" strokeWidth="5.5" strokeLinecap="round" />
                    </g>
                    {/* ขาขวา */}
                    <g>
                      {isAnimating && (
                        <animateTransform attributeName="transform" type="translate" values="0,5; 0,-5; 0,5" dur="1.1s" repeatCount="indefinite" />
                      )}
                      <line x1="6" y1="49" x2="7" y2="84" stroke="#94a3b8" strokeWidth="5.5" strokeLinecap="round" />
                    </g>
                  </g>

                  {/* มุมด้านข้าง: สายพานลู่วิ่งชัน + ขา 2 ข้างก้าวสลับกัน + แขนแกว่ง 2 ข้าง */}
                  <g transform="translate(235, 42)">
                    {/* สายพานลู่วิ่งปรับความชัน (Incline Deck) และเสาหน้าลู่วิ่ง */}
                    <line x1="-36" y1="88" x2="34" y2="64" stroke={theme.glow} strokeWidth="5.5" strokeLinecap="round" />
                    <line x1="28" y1="64" x2="22" y2="18" stroke="#64748b" strokeWidth="3.5" strokeLinecap="round" />
                    <line x1="22" y1="18" x2="10" y2="24" stroke="#94a3b8" strokeWidth="3.5" strokeLinecap="round" />

                    {/* ศีรษะและลำตัวโน้มหน้าเล็กน้อยสู้ความชัน */}
                    <circle cx="2" cy="10" r="6.5" fill="#cbd5e1" />
                    <line x1="0" y1="18" x2="-4" y2="48" stroke={theme.primary} strokeWidth="8.5" strokeLinecap="round" />

                    {/* ขาข้างที่ 1 (ด้านใน - สีเทาฟ้า) ก้าวสลับตรงข้ามกับขาข้างที่ 2 */}
                    <g>
                      {isAnimating && (
                        <animateTransform
                          attributeName="transform"
                          type="rotate"
                          values="24 -4 48; -24 -4 48; 24 -4 48"
                          dur="1.1s"
                          repeatCount="indefinite"
                        />
                      )}
                      <polyline points="-4,48 -8,64 -14,80" fill="none" stroke="#64748b" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
                    </g>

                    {/* ขาข้างที่ 2 (ด้านหน้า - สีขาวสว่าง) ก้าวสลับซ้าย-ขวา */}
                    <g>
                      {isAnimating && (
                        <animateTransform
                          attributeName="transform"
                          type="rotate"
                          values="-24 -4 48; 24 -4 48; -24 -4 48"
                          dur="1.1s"
                          repeatCount="indefinite"
                        />
                      )}
                      <polyline points="-4,48 4,62 8,76" fill="none" stroke="#e2e8f0" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
                    </g>

                    {/* แขนแกว่งขณะเดินชัน */}
                    <g>
                      {isAnimating && (
                        <animateTransform
                          attributeName="transform"
                          type="rotate"
                          values="20 -1 24; -20 -1 24; 20 -1 24"
                          dur="1.1s"
                          repeatCount="indefinite"
                        />
                      )}
                      <polyline points="-1,24 2,38 10,34" fill="none" stroke="#cbd5e1" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                    </g>

                    <line x1="-28" y1="74" x2="18" y2="58" stroke="#34d399" strokeWidth="2.5" markerEnd="url(#arrowConcentric)" />
                  </g>
                </>
              )}

              {/* ===============================================================
                  8E-1. CORE_PLANK (แพลงก์: ลำตัวขนานพื้น ยันศอก 90° แกนกลางสว่างกระพริบ)
                 =============================================================== */}
              {bio.pattern === 'CORE_PLANK' && (
                <>
                  <g transform="translate(80, 52)">
                    <circle cx="0" cy="18" r="6.5" fill="#cbd5e1" />
                    <rect x="-16" y="27" width="32" height="22" rx="4" fill="#475569" />
                    <line x1="-14" y1="36" x2="-14" y2="68" stroke="#e2e8f0" strokeWidth="5.5" strokeLinecap="round" />
                    <line x1="14" y1="36" x2="14" y2="68" stroke="#e2e8f0" strokeWidth="5.5" strokeLinecap="round" />
                    <line x1="-14" y1="68" x2="-6" y2="68" stroke="#cbd5e1" strokeWidth="4.5" strokeLinecap="round" />
                    <line x1="14" y1="68" x2="6" y2="68" stroke="#cbd5e1" strokeWidth="4.5" strokeLinecap="round" />
                    <rect x="-8" y="32" width="16" height="12" rx="3" fill={theme.glow}>
                      {isAnimating && (
                        <animate attributeName="opacity" values="0.4;1;0.4" dur="1.4s" repeatCount="indefinite" />
                      )}
                    </rect>
                  </g>

                  <g transform="translate(235, 52)">
                    <line x1="20" y1="42" x2="20" y2="68" stroke="#e2e8f0" strokeWidth="5.5" strokeLinecap="round" />
                    <line x1="20" y1="68" x2="32" y2="68" stroke="#cbd5e1" strokeWidth="5" strokeLinecap="round" />
                    <circle cx="28" cy="36" r="6.5" fill="#cbd5e1" />
                    <line x1="22" y1="42" x2="-8" y2="46" stroke={theme.primary} strokeWidth="8.5" strokeLinecap="round" />
                    <line x1="-8" y1="46" x2="-36" y2="68" stroke="#94a3b8" strokeWidth="6" strokeLinecap="round" />
                    <circle cx="6" cy="44" r="5" fill={theme.glow}>
                      {isAnimating && (
                        <animate attributeName="r" values="3;6;3" dur="1.4s" repeatCount="indefinite" />
                      )}
                    </circle>
                    <line x1="-34" y1="32" x2="28" y2="32" stroke="#34d399" strokeWidth="2" strokeDasharray="3 3" />
                  </g>
                </>
              )}

              {/* ===============================================================
                  8E-2. CORE_HANGING_RAISE (โหนบาร์ยกเข่า/ยกขา: แขนจับบาร์ด้านบน ม้วนเข่าขึ้น 90°)
                 =============================================================== */}
              {bio.pattern === 'CORE_HANGING_RAISE' && (
                <>
                  <g transform="translate(80, 36)">
                    <line x1="-36" y1="8" x2="36" y2="8" stroke="#64748b" strokeWidth="4.5" strokeLinecap="round" />
                    <line x1="-16" y1="8" x2="-14" y2="28" stroke="#e2e8f0" strokeWidth="4.5" strokeLinecap="round" />
                    <line x1="16" y1="8" x2="14" y2="28" stroke="#e2e8f0" strokeWidth="4.5" strokeLinecap="round" />
                    <circle cx="0" cy="22" r="6.5" fill="#cbd5e1" />
                    <rect x="-11" y="30" width="22" height="26" rx="4" fill={theme.primary} />
                    <g>
                      {isAnimating && (
                        <animateTransform
                          attributeName="transform"
                          type="translate"
                          values="0,20; 0,0; 0,20"
                          dur="2.0s"
                          repeatCount="indefinite"
                        />
                      )}
                      <line x1="-6" y1="56" x2="-6" y2="76" stroke={theme.glow} strokeWidth="5.5" strokeLinecap="round" />
                      <line x1="6" y1="56" x2="6" y2="76" stroke={theme.glow} strokeWidth="5.5" strokeLinecap="round" />
                    </g>
                  </g>

                  <g transform="translate(235, 36)">
                    <line x1="-15" y1="8" x2="15" y2="8" stroke="#64748b" strokeWidth="5" strokeLinecap="round" />
                    <line x1="0" y1="8" x2="0" y2="28" stroke="#e2e8f0" strokeWidth="5" strokeLinecap="round" />
                    <circle cx="0" cy="22" r="6.5" fill="#cbd5e1" />
                    <line x1="0" y1="30" x2="-2" y2="58" stroke={theme.primary} strokeWidth="8.5" strokeLinecap="round" />
                    <g>
                      {isAnimating && (
                        <animateTransform
                          attributeName="transform"
                          type="rotate"
                          values="0 -2 58; -85 -2 58; 0 -2 58"
                          dur="2.0s"
                          repeatCount="indefinite"
                        />
                      )}
                      <polyline points="-2,58 14,72 14,92" fill="none" stroke="#e2e8f0" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
                    </g>
                    <path d="M 16,84 A 20,20 0 0,0 24,56" fill="none" stroke="#34d399" strokeWidth="2.5" markerEnd="url(#arrowConcentric)" />
                  </g>
                </>
              )}

              {/* ===============================================================
                  8E-3. CORE_CRUNCH_LYING (นอนหงายชันเข่า ม้วนตัวทำครันช์ / ซิทอัพ / ไบซิเคิล)
                 =============================================================== */}
              {bio.pattern === 'CORE_CRUNCH_LYING' && (
                <>
                  <g transform="translate(80, 50)">
                    <rect x="-34" y="66" width="68" height="6" rx="2" fill="#334155" />
                    <g>
                      {isAnimating && (
                        <animateTransform attributeName="transform" type="translate" values="0,10; 0,0; 0,10" dur="1.8s" repeatCount="indefinite" />
                      )}
                      <circle cx="0" cy="30" r="6.5" fill="#cbd5e1" />
                      <rect x="-12" y="38" width="24" height="24" rx="4" fill={theme.primary} />
                      <polyline points="-18,36 -12,42 -6,38" fill="none" stroke="#e2e8f0" strokeWidth="3" strokeLinecap="round" />
                      <polyline points="18,36 12,42 6,38" fill="none" stroke="#e2e8f0" strokeWidth="3" strokeLinecap="round" />
                    </g>
                    <line x1="-10" y1="64" x2="-14" y2="48" stroke="#94a3b8" strokeWidth="5.5" strokeLinecap="round" />
                    <line x1="10" y1="64" x2="14" y2="48" stroke="#94a3b8" strokeWidth="5.5" strokeLinecap="round" />
                  </g>

                  <g transform="translate(235, 50)">
                    <rect x="-38" y="68" width="76" height="5" rx="2" fill="#334155" />
                    <polyline points="-12,68 -24,46 -34,68" fill="none" stroke="#94a3b8" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
                    <g>
                      {isAnimating && (
                        <animateTransform
                          attributeName="transform"
                          type="rotate"
                          values="0 -10 68; -32 -10 68; 0 -10 68"
                          dur="1.8s"
                          repeatCount="indefinite"
                        />
                      )}
                      <line x1="-10" y1="68" x2="18" y2="68" stroke={theme.primary} strokeWidth="8.5" strokeLinecap="round" />
                      <circle cx="24" cy="62" r="6" fill="#cbd5e1" />
                      <polyline points="14,66 22,54 26,60" fill="none" stroke="#e2e8f0" strokeWidth="3.5" strokeLinecap="round" />
                    </g>
                    <path d="M 26,64 A 18,18 0 0,1 16,42" fill="none" stroke="#34d399" strokeWidth="2.5" markerEnd="url(#arrowConcentric)" />
                  </g>
                </>
              )}

              {/* ===============================================================
                  8E-4. CORE_MOUNTAIN_CLIMBER (ท่าปีนเขา: ดันพื้น แทงเข่าสลับไปข้างหน้า)
                 =============================================================== */}
              {bio.pattern === 'CORE_MOUNTAIN_CLIMBER' && (
                <>
                  <g transform="translate(80, 50)">
                    <circle cx="0" cy="20" r="6.5" fill="#cbd5e1" />
                    <rect x="-14" y="29" width="28" height="24" rx="4" fill={theme.primary} />
                    <line x1="-14" y1="36" x2="-14" y2="70" stroke="#e2e8f0" strokeWidth="5" strokeLinecap="round" />
                    <line x1="14" y1="36" x2="14" y2="70" stroke="#e2e8f0" strokeWidth="5" strokeLinecap="round" />
                    <line x1="-6" y1="53" x2="-6" y2="40" stroke={theme.glow} strokeWidth="5.5" strokeLinecap="round" />
                    <line x1="6" y1="53" x2="6" y2="70" stroke="#94a3b8" strokeWidth="5" strokeLinecap="round" />
                  </g>

                  <g transform="translate(235, 50)">
                    <line x1="18" y1="42" x2="18" y2="70" stroke="#e2e8f0" strokeWidth="5.5" strokeLinecap="round" />
                    <circle cx="26" cy="36" r="6" fill="#cbd5e1" />
                    <line x1="18" y1="42" x2="-12" y2="52" stroke={theme.primary} strokeWidth="8" strokeLinecap="round" />
                    <line x1="-12" y1="52" x2="-36" y2="70" stroke="#64748b" strokeWidth="5" strokeLinecap="round" />
                    <g>
                      {isAnimating && (
                        <animateTransform
                          attributeName="transform"
                          type="translate"
                          values="0,0; 18,-6; 0,0"
                          dur="0.8s"
                          repeatCount="indefinite"
                        />
                      )}
                      <polyline points="-12,52 4,50 -2,70" fill="none" stroke={theme.glow} strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
                    </g>
                    <line x1="-8" y1="62" x2="12" y2="54" stroke="#34d399" strokeWidth="2.5" markerEnd="url(#arrowConcentric)" />
                  </g>
                </>
              )}

              {/* ===============================================================
                  8E-5. CORE_RUSSIAN_TWIST & KNEELING CRUNCH (นั่งตัว V บิดเอวซ้าย-ขวา / คุกเข่า)
                 =============================================================== */}
              {(bio.pattern === 'CORE_RUSSIAN_TWIST' || bio.pattern === 'CORE_KNEELING_CRUNCH') && (
                <>
                  <g transform="translate(80, 48)">
                    <circle cx="0" cy="22" r="6.5" fill="#cbd5e1" />
                    <rect x="-12" y="31" width="24" height="26" rx="4" fill={theme.primary} />
                    <g>
                      {isAnimating && (
                        <animateTransform
                          attributeName="transform"
                          type="translate"
                          values="-14,0; 14,0; -14,0"
                          dur="1.5s"
                          repeatCount="indefinite"
                        />
                      )}
                      <rect x="-8" y="44" width="16" height="8" rx="2" fill={theme.glow} />
                      <line x1="-16" y1="48" x2="16" y2="48" stroke="#e2e8f0" strokeWidth="3" strokeLinecap="round" />
                    </g>
                    <polyline points="-8,57 -14,70 -8,78" fill="none" stroke="#94a3b8" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
                    <polyline points="8,57 14,70 8,78" fill="none" stroke="#94a3b8" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
                  </g>

                  <g transform="translate(235, 48)">
                    <circle cx="-16" cy="28" r="6.5" fill="#cbd5e1" />
                    <line x1="-12" y1="36" x2="0" y2="68" stroke={theme.primary} strokeWidth="8.5" strokeLinecap="round" />
                    <polyline points="0,68 18,50 30,62" fill="none" stroke="#e2e8f0" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="2" cy="48" r="6" fill={theme.glow}>
                      {isAnimating && (
                        <animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" repeatCount="indefinite" />
                      )}
                    </circle>
                    <path d="M -8,46 A 14,14 0 0,1 12,46" fill="none" stroke="#34d399" strokeWidth="2.5" markerEnd="url(#arrowConcentric)" />
                  </g>
                </>
              )}

              {/* ===============================================================
                  8F. ท่าอื่นๆ (SQUAT_BILATERAL, DEADLIFT_HINGE, HORIZONTAL_ROW, PUSHUP_DIP, CHEST_FLY, LEG_ISOLATION)
                 =============================================================== */}
              {(bio.pattern === 'SQUAT_BILATERAL' ||
                bio.pattern === 'DEADLIFT_HINGE' ||
                bio.pattern === 'HORIZONTAL_ROW' ||
                bio.pattern === 'PUSHUP_DIP' ||
                bio.pattern === 'CHEST_FLY' ||
                bio.pattern === 'LEG_ISOLATION') && (
                <>
                  {/* มุมด้านหน้า */}
                  <g transform="translate(80, 42)">
                    <g>
                      {isAnimating && (
                        <animateTransform
                          attributeName="transform"
                          type="translate"
                          values={
                            bio.pattern === 'SQUAT_BILATERAL' || bio.pattern === 'PUSHUP_DIP' || bio.pattern === 'DEADLIFT_HINGE'
                              ? '0,0; 0,14; 0,0'
                              : '0,4; 0,-6; 0,4'
                          }
                          dur="2.1s"
                          repeatCount="indefinite"
                        />
                      )}
                      <circle cx="0" cy="10" r="7" fill="#cbd5e1" />
                      <rect x="-12" y="19" width="24" height="30" rx="4" fill={theme.primary} />
                      <line x1="-24" y1="24" x2="24" y2="24" stroke={theme.glow} strokeWidth="3.5" strokeLinecap="round" />
                    </g>
                    <line x1="-10" y1="52" x2="-10" y2="86" stroke="#94a3b8" strokeWidth="5" strokeLinecap="round" />
                    <line x1="10" y1="52" x2="10" y2="86" stroke="#94a3b8" strokeWidth="5" strokeLinecap="round" />
                  </g>

                  {/* มุมด้านข้าง */}
                  <g transform="translate(235, 42)">
                    {bio.pattern === 'HORIZONTAL_ROW' ? (
                      <>
                        <circle cx="-8" cy="14" r="6.5" fill="#cbd5e1" />
                        <rect x="-14" y="23" width="13" height="34" rx="4" fill={theme.primary} />
                        <line x1="-10" y1="57" x2="-12" y2="86" stroke="#94a3b8" strokeWidth="5" strokeLinecap="round" />
                        <line x1="-4" y1="57" x2="-2" y2="86" stroke="#64748b" strokeWidth="5" strokeLinecap="round" />
                        <g>
                          {isAnimating && (
                            <animateTransform attributeName="transform" type="translate" values="16,0; -4,0; 16,0" dur="2.1s" repeatCount="indefinite" />
                          )}
                          <line x1="-6" y1="38" x2="18" y2="38" stroke="#e2e8f0" strokeWidth="5" strokeLinecap="round" />
                          <rect x="16" y="30" width="6" height="16" rx="2" fill={theme.glow} />
                        </g>
                        <line x1="30" y1="22" x2="2" y2="22" stroke="#34d399" strokeWidth="2.5" markerEnd="url(#arrowConcentric)" />
                      </>
                    ) : bio.pattern === 'PUSHUP_DIP' ? (
                      <>
                        <g>
                          {isAnimating && (
                            <animateTransform attributeName="transform" type="translate" values="0,0; 0,14; 0,0" dur="2.0s" repeatCount="indefinite" />
                          )}
                          <circle cx="22" cy="40" r="6" fill="#cbd5e1" />
                          <line x1="16" y1="44" x2="-14" y2="58" stroke={theme.primary} strokeWidth="9" strokeLinecap="round" />
                          <line x1="-14" y1="58" x2="-34" y2="84" stroke="#94a3b8" strokeWidth="6" strokeLinecap="round" />
                        </g>
                        <line x1="14" y1="46" x2="16" y2="86" stroke="#e2e8f0" strokeWidth="4.5" strokeLinecap="round" />
                        <line x1="28" y1="68" x2="28" y2="24" stroke="#34d399" strokeWidth="2.5" markerEnd="url(#arrowConcentric)" />
                      </>
                    ) : (
                      /* Squat 2 ขา / Deadlift RDL */
                      <>
                        <g>
                          {isAnimating && (
                            <animateTransform attributeName="transform" type="translate" values="0,0; -6,15; 0,0" dur="2.1s" repeatCount="indefinite" />
                          )}
                          <circle cx="0" cy="10" r="6.5" fill="#cbd5e1" />
                          <line x1="0" y1="18" x2="-8" y2="46" stroke={theme.primary} strokeWidth="8.5" strokeLinecap="round" />
                          <line x1="-8" y1="46" x2="10" y2="64" stroke={theme.primary} strokeWidth="6.5" strokeLinecap="round" />
                        </g>
                        <line x1="6" y1="64" x2="0" y2="86" stroke="#64748b" strokeWidth="5" strokeLinecap="round" />
                        <line x1="10" y1="64" x2="4" y2="86" stroke="#cbd5e1" strokeWidth="5.5" strokeLinecap="round" />
                        <line x1="26" y1="68" x2="26" y2="22" stroke="#34d399" strokeWidth="2.5" markerEnd="url(#arrowConcentric)" />
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