import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import ExerciseIllustration, { getExerciseYouTubeUrl } from './ExerciseIllustration'

// ============================================================================
// MASTER EXERCISE LIBRARY (ครบ 95 ท่ามาตรฐาน: เพิ่ม 10 ท่าวอร์มร่างกายสำหรับมือใหม่ + เวท + คาลิสเธนิกส์ + เดินป่า)
// ============================================================================
export const MASTER_EXERCISE_LIBRARY = [
  // ================= 0. WARM-UP & DYNAMIC MOBILITY (ท่าวอร์มร่างกายก่อนฝึก: 10 ท่า) =================
  {
    name: 'Arm Circles & Scapular Swings (หมุนหัวไหล่และเหวี่ยงแขนสลับเปิดสะบัก)',
    muscle: 'Warmup',
    sub_muscle: 'Shoulder Rotator Cuff, Scapula & Chest Opener (วอร์มข้อต่อหัวไหล่ สะบัก และหน้าอก)',
    type: 'Bodyweight',
    difficulty: 'Beginner',
    kcal_per_unit: 5,
    is_warmup: true,
    warmup_focus: 'upper',
    warmup_guide_th: '1.ยืนตรงกางแขนระดับไหล่ หมุนแขนเป็นวงกลมเล็กไปใหญ่เดินหน้า 15 รอบ และถอยหลัง 15 รอบ • 2.เหวี่ยงแขนไขว้สลับหน้าอกซ้าย-ขวา 15 ครั้ง เพื่อเพิ่มน้ำหล่อเลี้ยงข้อไหล่ก่อนเล่นอก/ไหล่/หลัง'
  },
  {
    name: 'Scapular Push-Up & Wrist Warm-Up (วอร์มสะบักและหมุนข้อมือ-ข้อศอกเตรียมรับน้ำหนัก)',
    muscle: 'Warmup',
    sub_muscle: 'Serratus Anterior, Scapula & Wrist Joints (ปลุกกล้ามเนื้อสะบักและเซฟข้อมือ-ข้อศอก)',
    type: 'Bodyweight',
    difficulty: 'Beginner',
    kcal_per_unit: 5,
    is_warmup: true,
    warmup_focus: 'upper',
    warmup_guide_th: '1.ประสานมือหมุนข้อมือและพับเหยียดข้อศอก 15 รอบ • 2.ตั้งท่าแพลงก์แขนตึง (หรือคุกเข่า) บีบสะบักลงแล้วดันสะบักขึ้นสุดระยะ 12-15 ครั้ง โดยไม่ندงอศอก ช่วยป้องกันไหล่จมตอนดันอก'
  },
  {
    name: 'Dynamic Chest Opener & Torso Twist (กางแขนเปิดหน้าอกและบิดลำตัวซ้าย-ขวา)',
    muscle: 'Warmup',
    sub_muscle: 'Pectoralis, Thoracic Spine & Core Warm-Up (ยืดเปิดทรวงอกและปลุกแกนกลางลำตัว)',
    type: 'Bodyweight',
    difficulty: 'Beginner',
    kcal_per_unit: 5,
    is_warmup: true,
    warmup_focus: 'upper',
    warmup_guide_th: '1.ตั้งศอกระดับอก ดึงศอกไปด้านหลังเปิดหน้าอก 2 จังหวะ แล้วเหยียดแขนกางออก • 2.บิดลำตัวซ้าย-ขวาอย่างนุ่มนวลพร้อมเปิดส้นเท้าตาม 15 ครั้ง เพื่อให้หลังส่วนบนและหน้าอกพร้อมออกแรง'
  },
  {
    name: 'Band / Towel Shoulder Dislocates & Face Pull Warm-Up (จับผ้าขนหนู/ยางยืดวาดเปิดไหล่)',
    muscle: 'Warmup',
    sub_muscle: 'Rear Delts, External Rotators & Upper Back (วอร์มเอ็นหมุนข้อไหล่ ป้องกันไหล่บาดเจ็บ 100%)',
    type: 'Bodyweight',
    difficulty: 'Beginner',
    kcal_per_unit: 5,
    is_warmup: true,
    warmup_focus: 'upper',
    warmup_guide_th: '1.ใช้มือจับผ้าขนหนูหรือยางยืดกว้างกว่าไหล่ ยกวาดขึ้นเหนือศีรษะไปด้านหลังเท่าที่ไม่ฝืน • 2.ดึงมือบีบสะบักเข้าหาหน้าผากค้างไว้ 1 วินาที ทำซ้ำ 12-15 ครั้ง'
  },
  {
    name: "World's Greatest Stretch & Hip Opener (ก้าวย่อบิดลำตัวเปิดสะโพก หลัง และข้อเท้า)",
    muscle: 'Warmup',
    sub_muscle: 'Hip Flexors, Glutes, Hamstrings & Thoracic Spine (ท่าวอร์มอันดับ 1 เปิดสะโพกและข้อเท้าครบทุกจุด)',
    type: 'Bodyweight',
    difficulty: 'Beginner',
    kcal_per_unit: 6,
    is_warmup: true,
    warmup_focus: 'lower',
    warmup_guide_th: '1.ก้าวเท้าขวาไปด้านหน้ายาวๆ วางมือซ้ายแตะพื้น • 2.กดศอกขวาลงใกล้ตาตุ่มขวา แล้วบิดตัวชูแขนขวาขึ้นฟ้ามองตามมือ • 3.ทำสลับซ้าย-ขวาข้างละ 6-8 ครั้ง ช่วยให้นั่งสควอทได้ลึกไม่ติดสะโพก'
  },
  {
    name: 'Dynamic Leg Swings & Knee Circles (แกว่งขาหน้า-หลังและหมุนข้อเข่าเพิ่มน้ำหล่อเลี้ยง)',
    muscle: 'Warmup',
    sub_muscle: 'Hamstrings, Hip Joint & Knee Capsule (วอร์มข้อสะโพก แฮมสตริง และลูกสะบ้าเข่า)',
    type: 'Bodyweight',
    difficulty: 'Beginner',
    kcal_per_unit: 5,
    is_warmup: true,
    warmup_focus: 'lower',
    warmup_guide_th: '1.มือจับกำแพงพยุงตัว แกว่งขาไปหน้า-หลังและซ้าย-ขวาข้างละ 12 ครั้ง (เริ่มจากวงเล็กไปกว้าง) • 2.ยืนชิดเท้าวางมือบนเข่า หมุนข้อเข่าเบาๆ ซ้าย-ขวา 10 รอบก่อนเล่นขาหรือเดินป่า'
  },
  {
    name: 'Bodyweight Good Morning & Pry Squat Warm-Up (พับสะโพกวอร์มหลังล่างและนั่งยองดันเข่าเปิดสะโพก)',
    muscle: 'Warmup',
    sub_muscle: 'Lower Back, Glutes, Adductors & Ankle Mobility (ปลุกก้น แฮมสตริง และหลังล่างก่อนยกเวท)',
    type: 'Bodyweight',
    difficulty: 'Beginner',
    kcal_per_unit: 6,
    is_warmup: true,
    warmup_focus: 'lower',
    warmup_guide_th: '1.มือแตะท้ายทอย พับสะโพกไปด้านหลังโดยรักษาหลังตรงให้ตึงขาหลังแล้วดันก้นกลับ • 2.ย่อตัวลงนั่งสควอทลึก ใช้ข้อศอกดันเข่าทั้งสองข้างออกเบาๆ โยกซ้าย-ขวา 10 ครั้ง'
  },
  {
    name: 'Ankle Dorsiflexion & Calf Pump Trail Warm-Up (โยกเข่าเปิดข้อเท้าและเขย่งน่องเตรียมเดินชัน/ขึ้นเขา)',
    muscle: 'Warmup',
    sub_muscle: 'Ankle Joint, Achilles Tendon, Calves & Tibialis (ป้องกันข้อเท้าพลิกและตะคริวน่องตอนเดินป่า)',
    type: 'Bodyweight',
    difficulty: 'Beginner',
    kcal_per_unit: 5,
    is_warmup: true,
    warmup_focus: 'trail',
    warmup_guide_th: '1.วางเท้าห่างกำแพง 1 ฝ่ามือ ดันเข่าไปแตะกำแพงโดยส้นเท้าไม่ลอย ข้างละ 12 ครั้ง • 2.ยืนเขย่งปลายเท้าสลับกระดกปลายเท้าขึ้น 15 ครั้ง เพื่ออุ่นเอ็นร้อยหวายและหน้าแข้ง'
  },
  {
    name: 'Cat-Cow & Bird-Dog Spine Activation (โก่ง-แอ่นหลังบริหารกระดูกสันหลังและปลุกแกนกลาง)',
    muscle: 'Warmup',
    sub_muscle: 'Core Stabilizers, Erector Spinae & Pelvis (เซฟหมอนรองกระดูกสันหลังและเปิดระบบประสาทแกนกลาง)',
    type: 'Bodyweight',
    difficulty: 'Beginner',
    kcal_per_unit: 5,
    is_warmup: true,
    warmup_focus: 'full',
    warmup_guide_th: '1.คุกเข่าวางมือสี่ขา หายใจเข้าแอ่นอกเงยหน้า หายใจออกโก่งสะบักเก็บคาง 10 รอบ • 2.เหยียดแขนขวาคู่ขาซ้ายให้ตรงขนานพื้น เกร็งท้องค้าง 2 วินาที สลับข้างรวม 12 ครั้ง'
  },
  {
    name: 'Low-Impact Jumping Jacks & High Knees March (ก้าวตบและยกเข่าสูงกระตุ้นหัวใจให้อุณหภูมิร่างกายพร้อม)',
    muscle: 'Warmup',
    sub_muscle: 'Cardiovascular Warm-Up & Full-Body Blood Flow (เพิ่มอุณหภูมิกล้ามเนื้อและสูบฉีดเลือดทั่วร่าง)',
    type: 'Bodyweight',
    difficulty: 'Beginner',
    kcal_per_unit: 7,
    is_warmup: true,
    warmup_focus: 'full',
    warmup_guide_th: '1.ก้าวเท้าออกด้านข้างพร้อมชูแขนตบเหนือศีรษะ (หรือกระโดดตบเบาๆ) 30 วินาที • 2.เดินยกเข่าสูงสลับซ้าย-ขวาแกว่งแขน 30 วินาที ให้ร่างกายเริ่มอุ่นและมีเหงื่อซึมก่อนเริ่มยกเวท'
  },

  // ================= 1. CHEST (กล้ามเนื้ออก: 16 ท่า) =================
  { name: 'Flat Barbell Bench Press (นอนดันบาร์เบลอกกลาง เตียงราบ)', muscle: 'Chest', sub_muscle: 'Middle Pectoralis (อกกลาง), หลังแขน, ไหล่หน้า', type: 'Barbell', difficulty: 'Intermediate', kcal_per_unit: 10 },
  { name: 'Flat Dumbbell Bench Press (นอนดันดัมเบลอกกลาง เตียงราบ)', muscle: 'Chest', sub_muscle: 'Middle Pectoralis (อกกลางเต็มมัดและกล้ามเนื้อมัดลึก)', type: 'Dumbbell', difficulty: 'Beginner', kcal_per_unit: 9 },
  { name: 'Incline Dumbbell Press (นอนเบาะเอียงดันดัมเบล เน้นอกบน)', muscle: 'Chest', sub_muscle: 'Clavicular Pectoralis (อกส่วนบนให้ดูเต็มเสื้อ)', type: 'Dumbbell', difficulty: 'Beginner', kcal_per_unit: 9 },
  { name: 'Incline Barbell Bench Press (นอนเบาะเอียงดันบาร์เบล อกบน)', muscle: 'Chest', sub_muscle: 'Upper Chest & Anterior Deltoid (อกบนและไหล่หน้า)', type: 'Barbell', difficulty: 'Intermediate', kcal_per_unit: 10 },
  { name: 'Decline Barbell Bench Press (นอนเตียงหัวต่ำดันบาร์เบล อกล่าง)', muscle: 'Chest', sub_muscle: 'Lower Pectoralis (ตัดขอบอกล่างให้คมชัด)', type: 'Barbell', difficulty: 'Intermediate', kcal_per_unit: 9 },
  { name: 'Seated Machine Chest Press (นั่งดันอกด้วยเครื่องแมชชีน)', muscle: 'Chest', sub_muscle: 'Overall Chest (อกกลางปลอดภัย โฟกัสได้เต็มที่)', type: 'Machine', difficulty: 'Beginner', kcal_per_unit: 8 },
  { name: 'Incline Machine Chest Press (นั่งดันอกบนด้วยเครื่องแมชชีน)', muscle: 'Chest', sub_muscle: 'Upper Chest Isolation (อกส่วนบน)', type: 'Machine', difficulty: 'Beginner', kcal_per_unit: 8 },
  { name: 'Pec Deck Machine Fly (นั่งหนีบอกด้วยเครื่องแมชชีน เน้นร่องอก)', muscle: 'Chest', sub_muscle: 'Inner Chest Striation (ร่องอกด้านใน)', type: 'Machine', difficulty: 'Beginner', kcal_per_unit: 7 },
  { name: 'Flat Dumbbell Fly (นอนกางดัมเบลเตียงราบ ขยายฐานอก)', muscle: 'Chest', sub_muscle: 'Outer & Inner Chest (ขยายฐานอกและร่องอก)', type: 'Dumbbell', difficulty: 'Intermediate', kcal_per_unit: 7 },
  { name: 'Incline Dumbbell Fly (นอนเบาะเอียงกางดัมเบล ร่องอกบน)', muscle: 'Chest', sub_muscle: 'Upper Inner Chest (ร่องอกส่วนบน)', type: 'Dumbbell', difficulty: 'Intermediate', kcal_per_unit: 7 },
  { name: 'High-to-Low Cable Crossover (ยืนดึงเคเบิลจากบนลงล่าง เน้นอกล่าง)', muscle: 'Chest', sub_muscle: 'Lower & Inner Pectoralis (ขอบอกล่างและร่องอก)', type: 'Cable', difficulty: 'Intermediate', kcal_per_unit: 8 },
  { name: 'Low-to-High Cable Fly (ยืนช้อนเคเบิลจากล่างขึ้นบน เน้นอกบน)', muscle: 'Chest', sub_muscle: 'Upper Chest Cleavage (ร่องอกส่วนบน)', type: 'Cable', difficulty: 'Intermediate', kcal_per_unit: 8 },
  { name: 'Chest Dips (ดิปส์บาร์คู่โน้มตัวหน้า เน้นอกล่างและหลังแขน)', muscle: 'Chest', sub_muscle: 'Lower Chest & Triceps (อกล่างและหลังแขน)', type: 'Calisthenics', difficulty: 'Intermediate', kcal_per_unit: 10 },
  { name: 'Standard Push-Up (วิดพื้นมาตรฐาน เกร็งลำตัวตรง)', muscle: 'Chest', sub_muscle: 'Chest, Anterior Delts, Triceps & Core (อก ไหล่ หลังแขน)', type: 'Bodyweight', difficulty: 'Beginner', kcal_per_unit: 8 },
  { name: 'Decline Push-Up (วิดพื้นวางเท้าสูงบนม้านั่ง เน้นอกบน)', muscle: 'Chest', sub_muscle: 'Upper Pectoralis & Shoulders (อกบนและไหล่)', type: 'Bodyweight', difficulty: 'Intermediate', kcal_per_unit: 9 },
  { name: 'Dumbbell Pullover (นอนขวางเบาะดึงดัมเบลข้ามศีรษะ ขยายซี่โครงและอก)', muscle: 'Chest', sub_muscle: 'Pectoralis Major, Serratus Anterior & Lats (ขยายทรวงอกและปีก)', type: 'Dumbbell', difficulty: 'Intermediate', kcal_per_unit: 8 },

  // ================= 2. BACK (กล้ามเนื้อหลัง: 15 ท่า) =================
  { name: 'Wide-Grip Lat Pulldown (ดึงเคเบิลลงหน้าอกจับกว้าง เน้นปีกตัว V)', muscle: 'Back', sub_muscle: 'Outer Latissimus Dorsi (กล้ามเนื้อปีกด้านนอกให้หลังกว้าง)', type: 'Cable', difficulty: 'Beginner', kcal_per_unit: 9 },
  { name: 'Close-Grip V-Bar Lat Pulldown (ดึงเคเบิลจับแคบลงหน้าอก เน้นปีกล่าง)', muscle: 'Back', sub_muscle: 'Lower Lats & Middle Back (ปีกส่วนล่างและกลางหลัง)', type: 'Cable', difficulty: 'Beginner', kcal_per_unit: 9 },
  { name: 'Reverse-Grip Underhand Pulldown (ดึงเคเบิลหงายมือจับแคบ)', muscle: 'Back', sub_muscle: 'Lower Lats & Biceps (ปีกล่างและหน้าแขน)', type: 'Cable', difficulty: 'Beginner', kcal_per_unit: 9 },
  { name: 'Pull-Up Wide Grip (โหนบาร์ดึงข้อจับกว้าง คาลิสเธนิกส์)', muscle: 'Back', sub_muscle: 'Upper Lats, Teres Major & Core (ปีกบนและแกนกลาง)', type: 'Calisthenics', difficulty: 'Advanced', kcal_per_unit: 11 },
  { name: 'Chin-Up Underhand Grip (โหนบาร์ดึงข้อหงายมือจับแคบ)', muscle: 'Back', sub_muscle: 'Lats & Biceps Peak (ปีกและยอดหน้าแขน)', type: 'Calisthenics', difficulty: 'Intermediate', kcal_per_unit: 10 },
  { name: 'One-Arm Dumbbell Row (ดึงดัมเบลทีละข้างพยุงม้านั่ง เน้นปีกหนา)', muscle: 'Back', sub_muscle: 'Latissimus Dorsi & Rhomboids (ความหนาของปีกและสะบัก)', type: 'Dumbbell', difficulty: 'Beginner', kcal_per_unit: 9 },
  { name: 'Chest-Supported Incline Dumbbell Row (นอนคว่ำบนเบาะเอียงดึงดัมเบลคู่)', muscle: 'Back', sub_muscle: 'Middle Back & Rhomboids (ร่องสะบักโดยไม่ปวดหลังล่าง)', type: 'Dumbbell', difficulty: 'Beginner', kcal_per_unit: 9 },
  { name: 'Bent-Over Barbell Row (ก้มตัวดึงบาร์เบลเข้าหาหน้าท้อง)', muscle: 'Back', sub_muscle: 'Entire Posterior Chain & Thick Back (แผ่นหลังหนาทั้งมัด)', type: 'Barbell', difficulty: 'Intermediate', kcal_per_unit: 11 },
  { name: 'Seated Cable Row (นั่งดึงเคเบิลเข้าหาหน้าท้อง บีบสะบัก)', muscle: 'Back', sub_muscle: 'Middle Back & Rhomboids (ร่องกลางหลังและสะบัก)', type: 'Cable', difficulty: 'Beginner', kcal_per_unit: 9 },
  { name: 'Seated Machine Row (นั่งดึงหลังด้วยเครื่องแมชชีน)', muscle: 'Back', sub_muscle: 'Lats & Mid-Back Stability (ปีกและร่องสะบัก)', type: 'Machine', difficulty: 'Beginner', kcal_per_unit: 8 },
  { name: 'Straight-Arm Cable Pulldown (ยืนกดเคเบิลแขนตึง เน้นปีกล้วนๆ)', muscle: 'Back', sub_muscle: 'Isolated Latissimus Dorsi (ตัดขอบปีกให้ชัด)', type: 'Cable', difficulty: 'Intermediate', kcal_per_unit: 8 },
  { name: 'Conventional Barbell Deadlift (เดดลิฟต์บาร์เบล สร้างเกราะหลังและขา)', muscle: 'Back', sub_muscle: 'Erector Spinae, Glutes, Hamstrings & Traps (หลังล่าง ก้น ขาหลัง บ่า)', type: 'Barbell', difficulty: 'Advanced', kcal_per_unit: 14 },
  { name: 'Dumbbell Rucksack Back Extension (บริหารหลังล่างรับน้ำหนักเป้เดินป่า)', muscle: 'Back', sub_muscle: 'Lower Back Erector Spinae (เกราะหลังล่างป้องกันปวดเอว)', type: 'Dumbbell', difficulty: 'Beginner', kcal_per_unit: 8 },
  { name: 'Inverted Bodyweight Row (นอนหงายดึงตัวเข้าหาบาร์ต่ำ)', muscle: 'Back', sub_muscle: 'Mid-Back, Rear Delts & Core (กลางหลังและสะบัก)', type: 'Calisthenics', difficulty: 'Beginner', kcal_per_unit: 8 },
  { name: 'T-Bar Landmine Row (ก้มดึงบาร์ทีบาร์เข้าหาอก เน้นกลางหลังหนาแน่น)', muscle: 'Back', sub_muscle: 'Middle Traps, Rhomboids & Thick Lats (ความหนากลางแผ่นหลัง)', type: 'Barbell', difficulty: 'Intermediate', kcal_per_unit: 11 },

  // ================= 3. LEGS (กล้ามเนื้อขา: 17 ท่า) =================
  { name: 'Goblet Dumbbell Squat (สควอทถือดัมเบลแนบอก เน้นหน้าขาและก้น)', muscle: 'Legs', sub_muscle: 'Quadriceps & Glutes (หน้าขาและก้น เซฟหลังล่าง)', type: 'Dumbbell', difficulty: 'Beginner', kcal_per_unit: 11 },
  { name: 'Barbell Back Squat (สควอทบาร์เบลพาดบ่า ท่าหลักสร้างขาแกร่ง)', muscle: 'Legs', sub_muscle: 'Quads, Glutes, Hamstrings & Core (ต้นขาและสะโพกครบทุกมัด)', type: 'Barbell', difficulty: 'Intermediate', kcal_per_unit: 13 },
  { name: '45-Degree Leg Press Machine (ถีบขาด้วยเครื่องแมชชีน)', muscle: 'Legs', sub_muscle: 'Quadriceps & Gluteus Maximus (หน้าขาและสะโพกปลอดภัย)', type: 'Machine', difficulty: 'Beginner', kcal_per_unit: 11 },
  { name: 'Bulgarian Split Squat (สควอทขาเดียวพาดม้านั่ง เสริมความมั่นคงเข่าเดินป่า)', muscle: 'Legs', sub_muscle: 'Quads, Glutes & Knee Stabilizers (หน้าขา ก้น และความมั่นคงข้อเข่า)', type: 'Dumbbell', difficulty: 'Intermediate', kcal_per_unit: 11 },
  { name: 'Dumbbell Walking Lunges (ถือดัมเบลก้าวย่อเดินหน้า จำลองก้าวขึ้นเขา)', muscle: 'Legs', sub_muscle: 'Glutes, Quads & Hamstrings (สะโพกและต้นขาก้าวขึ้นทางชัน)', type: 'Dumbbell', difficulty: 'Intermediate', kcal_per_unit: 11 },
  { name: 'High-Box Dumbbell Step-Up (ถือดัมเบลก้าวขึ้นกล่องสูง จำลองเดินขึ้นบันไดหินภูกระดึง)', muscle: 'Legs', sub_muscle: 'Climbing Quads, Glutes & Calves (กล้ามเนื้อก้าวขึ้นเขาโดยตรง)', type: 'Dumbbell', difficulty: 'Beginner', kcal_per_unit: 11 },
  { name: 'Romanian Dumbbell Deadlift - RDL (พับสะโพกถือดัมเบล เน้นขาหลังและก้นเด้ง)', muscle: 'Legs', sub_muscle: 'Hamstrings & Gluteus Maximus (ขาด้านหลังและปั้นก้นกลมเด้ง)', type: 'Dumbbell', difficulty: 'Beginner', kcal_per_unit: 10 },
  { name: 'Barbell Hip Thrust (ดันสะโพกด้วยบาร์เบล ท่าอันดับ 1 ปั้นก้นกลมผาย)', muscle: 'Legs', sub_muscle: 'Gluteus Maximus & Medius (ปั้นก้นและสะโพกผายโดยตรง)', type: 'Barbell', difficulty: 'Beginner', kcal_per_unit: 10 },
  { name: 'Dumbbell Glute Bridge / Hip Thrust (ดันสะโพกวางดัมเบลบนหน้าตัก)', muscle: 'Legs', sub_muscle: 'Glutes & Posterior Pelvic Stability (ก้นกระชับและสะโพกแข็งแรง)', type: 'Dumbbell', difficulty: 'Beginner', kcal_per_unit: 9 },
  { name: 'Cable Glute Kickback (เตะสายเคเบิลไปด้านหลัง ปั้นก้นกลมเด้ง)', muscle: 'Legs', sub_muscle: 'Upper & Lower Glutes (ยกกระชับก้นงอน)', type: 'Cable', difficulty: 'Beginner', kcal_per_unit: 8 },
  { name: 'Seated Leg Extension Machine (นั่งเตะขาด้วยเครื่อง เน้นหน้าขาและสะบ้าเข่า)', muscle: 'Legs', sub_muscle: 'Vastus Medialis & Quads (กล้ามเนื้อรอบลูกสะบ้าเข่ากันเข่าทรุดตอนลงเขา)', type: 'Machine', difficulty: 'Beginner', kcal_per_unit: 9 },
  { name: 'Lying / Seated Leg Curl Machine (พับขาด้วยเครื่อง เน้นแฮมสตริงขาหลัง)', muscle: 'Legs', sub_muscle: 'Hamstrings Isolation (ขาหลังพยุงเอ็นไขว้หน้าเข่า ACL)', type: 'Machine', difficulty: 'Beginner', kcal_per_unit: 9 },
  { name: 'Sumo Dumbbell Squat (สควอทยืนขากว้างเปิดปลายเท้า เน้นขาหนีบและก้น)', muscle: 'Legs', sub_muscle: 'Inner Thigh Adductors & Glutes (กระชับต้นขาด้านในและก้น)', type: 'Dumbbell', difficulty: 'Beginner', kcal_per_unit: 10 },
  { name: 'Standing Dumbbell Calf Raise (ยืนถือดัมเบลเขย่งน่อง เดินป่าไกลไม่เป็นตะคริว)', muscle: 'Legs', sub_muscle: 'Gastrocnemius & Soleus (น่องและเอ็นร้อยหวายทนทาน)', type: 'Dumbbell', difficulty: 'Beginner', kcal_per_unit: 7 },
  { name: 'Tibialis Anterior Wall Raise (กระดกปลายเท้าพิงกำแพง กันเจ็บหน้าแข้งตอนลงเขาชัน)', muscle: 'Legs', sub_muscle: 'Tibialis Anterior (กล้ามเนื้อหน้าแข้งเบรกตัวเวลาเดินลงเขา)', type: 'Bodyweight', difficulty: 'Beginner', kcal_per_unit: 6 },
  { name: 'Bodyweight Squat (สควอทน้ำหนักตัวพื้นฐาน)', muscle: 'Legs', sub_muscle: 'Quads & Glutes Endurance (ความทนทานต้นขาและก้น)', type: 'Bodyweight', difficulty: 'Beginner', kcal_per_unit: 8 },
  { name: 'Seated Hip Abduction Machine (นั่งกางสะโพกด้วยเครื่อง ปั้นสะโพกผายและกันเข่าบิด)', muscle: 'Legs', sub_muscle: 'Gluteus Medius & Minimus (ก้นด้านข้างและพยุงข้อเข่าเวลาเดินทางขรุขระ)', type: 'Machine', difficulty: 'Beginner', kcal_per_unit: 8 },

  // ================= 4. SHOULDERS (หัวไหล่: 11 ท่า) =================
  { name: 'Seated Dumbbell Overhead Press (นั่งดันดัมเบลเหนือศีรษะ สร้างหัวไหล่กลม)', muscle: 'Shoulders', sub_muscle: 'Anterior & Lateral Deltoid (ไหล่หน้าและไหล่ข้าง)', type: 'Dumbbell', difficulty: 'Beginner', kcal_per_unit: 8 },
  { name: 'Standing Barbell Overhead Military Press (ยืนดันบาร์เบลเหนือศีรษะ)', muscle: 'Shoulders', sub_muscle: 'Full Deltoids, Upper Chest & Core (หัวไหล่ทรงพลังและแกนกลาง)', type: 'Barbell', difficulty: 'Intermediate', kcal_per_unit: 9 },
  { name: 'Seated Machine Shoulder Press (นั่งดันหัวไหล่ด้วยเครื่องแมชชีน)', muscle: 'Shoulders', sub_muscle: 'Deltoid Hypertrophy & Stability (หัวไหล่ปลอดภัย)', type: 'Machine', difficulty: 'Beginner', kcal_per_unit: 8 },
  { name: 'Dumbbell Lateral Raise (ยืนกางดัมเบลออกด้านข้าง สร้างไหล่กว้างผาย 3D)', muscle: 'Shoulders', sub_muscle: 'Lateral / Medial Deltoid (ไหล่ข้างให้ลำตัวดูเป็นทรง V-Shape)', type: 'Dumbbell', difficulty: 'Beginner', kcal_per_unit: 7 },
  { name: 'Cable Single-Arm Lateral Raise (ดึงเคเบิลกางไหล่ข้างทีละแขน ตึงตลอดระยะ)', muscle: 'Shoulders', sub_muscle: 'Lateral Deltoid Constant Tension (ไหล่ข้างคมชัด)', type: 'Cable', difficulty: 'Intermediate', kcal_per_unit: 7 },
  { name: 'Dumbbell Rear Delt Fly (ก้มตัวกางดัมเบลบริหารไหล่หลัง แก้ไหล่ห่อ)', muscle: 'Shoulders', sub_muscle: 'Posterior Deltoid & Upper Back (ไหล่หลังและสะบัก)', type: 'Dumbbell', difficulty: 'Beginner', kcal_per_unit: 7 },
  { name: 'Reverse Pec Deck Machine (นั่งกางแขนไปด้านหลังด้วยเครื่อง เน้นไหล่หลัง)', muscle: 'Shoulders', sub_muscle: 'Posterior Deltoid Isolation (ไหล่หลังตรงจุด)', type: 'Machine', difficulty: 'Beginner', kcal_per_unit: 7 },
  { name: 'Cable Rope Face Pull (ดึงเชือกเคเบิลเข้าหาหน้าผาก เสริมไหล่หลังและข้อต่อไหล่)', muscle: 'Shoulders', sub_muscle: 'Rear Delts, External Rotators & Traps (ไหล่หลังและเอ็นหมุนข้อไหล่)', type: 'Cable', difficulty: 'Beginner', kcal_per_unit: 7 },
  { name: 'Dumbbell Shrugs (ยืนถือดัมเบลยักไหล่ สร้างกล้ามเนื้อบ่ารับสายเป้เดินป่า)', muscle: 'Shoulders', sub_muscle: 'Upper Trapezius (กล้ามเนื้อบ่ารองรับการสะพายเป้หนัก)', type: 'Dumbbell', difficulty: 'Beginner', kcal_per_unit: 7 },
  { name: 'Heavy Farmer Walk (ถือดัมเบลหนักเดินตรง สร้างบ่า แรงบีบมือ และแกนกลาง)', muscle: 'Shoulders', sub_muscle: 'Traps, Forearms & Core Armor (ความอึดในการแบกสัมภาระเดินไกล)', type: 'Dumbbell', difficulty: 'Beginner', kcal_per_unit: 10 },
  { name: 'Arnold Dumbbell Press (นั่งหมุนข้อมือดันดัมเบลเหนือศีรษะ ครบทั้ง 3 มัดไหล่)', muscle: 'Shoulders', sub_muscle: 'Anterior, Lateral & Posterior Deltoids (หัวไหล่ 3 มิติเต็มมัด)', type: 'Dumbbell', difficulty: 'Intermediate', kcal_per_unit: 8 },

  // ================= 5. ARMS (แขน: 13 ท่า) =================
  { name: 'Alternating Dumbbell Bicep Curl (ยกดัมเบลพับแขนสลับซ้าย-ขวา บิดข้อมือ)', muscle: 'Arms', sub_muscle: 'Biceps Peak & Supination (ยอดกล้ามเนื้อหน้าแขน)', type: 'Dumbbell', difficulty: 'Beginner', kcal_per_unit: 6 },
  { name: 'Dumbbell Hammer Curl (ยกดัมเบลพับแขนจับแบบค้อน เน้นแขนหนาและท่อนแขน)', muscle: 'Arms', sub_muscle: 'Brachialis, Biceps & Brachioradialis (หน้าแขนด้านนอกและท่อนแขน)', type: 'Dumbbell', difficulty: 'Beginner', kcal_per_unit: 6 },
  { name: 'Incline Dumbbell Curl (นั่งพิงเบาะเอียงพับดัมเบล ยืดหน้าแขนมัดยาว)', muscle: 'Arms', sub_muscle: 'Biceps Long Head (ยอดหน้าแขนสูงคมชัด)', type: 'Dumbbell', difficulty: 'Intermediate', kcal_per_unit: 6 },
  { name: 'Barbell / EZ-Bar Bicep Curl (ยืนยกบาร์เบลพับหน้าแขน)', muscle: 'Arms', sub_muscle: 'Overall Biceps Mass (มวลหน้าแขนรวม)', type: 'Barbell', difficulty: 'Beginner', kcal_per_unit: 7 },
  { name: 'Concentration Dumbbell Curl (นั่งวางศอกข้างต้นขาพับดัมเบล เน้นลูกหนู)', muscle: 'Arms', sub_muscle: 'Biceps Short Head Peak (ปั้นลูกหนูหน้าแขน)', type: 'Dumbbell', difficulty: 'Beginner', kcal_per_unit: 6 },
  { name: 'Triceps Rope Pushdown (ยืนกดเชือกเคเบิลลงด้านล่าง เน้นหลังแขนเกือกม้า)', muscle: 'Arms', sub_muscle: 'Lateral & Medial Head Triceps (กระชับท้องแขนและหลังแขน)', type: 'Cable', difficulty: 'Beginner', kcal_per_unit: 6 },
  { name: 'Overhead Dumbbell Triceps Extension (ยกดัมเบลข้ามศีรษะเหยียดหลังแขน)', muscle: 'Arms', sub_muscle: 'Triceps Long Head (ลดท้องแขนหย่อนคล้อย เพิ่มความแน่นหลังแขน)', type: 'Dumbbell', difficulty: 'Beginner', kcal_per_unit: 6 },
  { name: 'Dumbbell Triceps Kickback (ก้มตัวเตะดัมเบลไปด้านหลัง เกร็งหลังแขน)', muscle: 'Arms', sub_muscle: 'Triceps Contraction (กระชับหลังแขนให้คมชัด)', type: 'Dumbbell', difficulty: 'Beginner', kcal_per_unit: 6 },
  { name: 'Lying Barbell / DB Skullcrusher (นอนเหยียดหลังแขนลดระดับลงใกล้หน้าผาก)', muscle: 'Arms', sub_muscle: 'All Three Heads of Triceps (หลังแขนครบทั้ง 3 มัด)', type: 'Barbell', difficulty: 'Intermediate', kcal_per_unit: 7 },
  { name: 'Close-Grip Bench Press (นอนดันบาร์เบลจับแคบ เน้นหลังแขนและอกใน)', muscle: 'Arms', sub_muscle: 'Triceps Mass & Inner Chest (ความหนาของหลังแขนและร่องอก)', type: 'Barbell', difficulty: 'Intermediate', kcal_per_unit: 8 },
  { name: 'Diamond Push-Up (วิดพื้นวางมือชิดรูปเพชร เน้นหลังแขน)', muscle: 'Arms', sub_muscle: 'Triceps & Inner Pectoralis (หลังแขนและอกด้านใน)', type: 'Bodyweight', difficulty: 'Intermediate', kcal_per_unit: 8 },
  { name: 'Bench Triceps Dips (ดิปส์หลังแขนกับขอบม้านั่ง)', muscle: 'Arms', sub_muscle: 'Triceps & Anterior Delts (กระชับท้องแขน)', type: 'Bodyweight', difficulty: 'Beginner', kcal_per_unit: 7 },
  { name: 'EZ-Bar Preacher Curl (นั่งวางแขนบนเบาะพรีเชอร์เคิร์ล ล็อกหน้าแขนเต็มร้อย)', muscle: 'Arms', sub_muscle: 'Lower Biceps & Brachialis Isolation (เน้นลูกหนูหน้าแขนส่วนล่าง)', type: 'Barbell', difficulty: 'Beginner', kcal_per_unit: 6 },

  // ================= 6. CORE (หน้าท้อง: 8 ท่า) =================
  { name: 'Hanging Knee / Leg Raise (โหนบาร์ยกเข่า/ยกขาขึ้น ตัดซิกแพคล่าง)', muscle: 'Core', sub_muscle: 'Lower Rectus Abdominis & Hip Flexors (หน้าท้องส่วนล่างและลดพุงหมาน้อย)', type: 'Calisthenics', difficulty: 'Intermediate', kcal_per_unit: 7 },
  { name: 'Forearm Plank Hold (แพลงก์เกร็งแกนกลางลำตัว ปั้นร่อง 11 และเซฟหลัง)', muscle: 'Core', sub_muscle: 'Transverse Abdominis & Deep Core (กล้ามเนื้อรัดเอวคอดและพยุงกระดูกสันหลัง)', type: 'Bodyweight', difficulty: 'Beginner', kcal_per_unit: 6 },
  { name: 'Cable Woodchopper / Pallof Press (ดึงเคเบิลบิดลำตัว ปั้นเอวเอสและร่อง 11)', muscle: 'Core', sub_muscle: 'Internal & External Obliques (กล้ามเนื้อข้างลำตัวและเอวคอด)', type: 'Cable', difficulty: 'Beginner', kcal_per_unit: 7 },
  { name: 'Weighted Russian Twist (นั่งบิดลำตัวซ้าย-ขวาถือดัมเบล กระชับเอว)', muscle: 'Core', sub_muscle: 'Obliques & Rotational Core (ลดไขมันรอบเอว)', type: 'Dumbbell', difficulty: 'Beginner', kcal_per_unit: 7 },
  { name: 'Bicycle Crunch (นอนปั่นจักรยานอากาศบิดศอกแตะเข่า)', muscle: 'Core', sub_muscle: 'Upper Abs, Lower Abs & Obliques (หน้าท้องครบทุกส่วนและร่อง 11)', type: 'Bodyweight', difficulty: 'Beginner', kcal_per_unit: 7 },
  { name: 'Lying Reverse Crunch (นอนยกสะโพกม้วนท้องล่าง)', muscle: 'Core', sub_muscle: 'Lower Abs Isolation (สลายพุงล่างโดยไม่ปวดคอ)', type: 'Bodyweight', difficulty: 'Beginner', kcal_per_unit: 6 },
  { name: 'Mountain Climbers (ท่าปีนเขาความเร็วสูง รีดไขมันหน้าท้อง)', muscle: 'Core', sub_muscle: 'Core Stamina & Fat Burn (หน้าท้องและเบิร์นไขมัน)', type: 'Bodyweight', difficulty: 'Beginner', kcal_per_unit: 9 },
  { name: 'Kneeling Cable Crunch (คุกเข่าดึงเชือกเคเบิลพับหน้าท้อง สร้างร่องซิกแพคลึก)', muscle: 'Core', sub_muscle: 'Rectus Abdominis Hypertrophy (สร้างความหนาและร่องซิกแพคชัดเจน)', type: 'Cable', difficulty: 'Beginner', kcal_per_unit: 7 },

  // ================= 7. CARDIO & TRAIL PREP (คาร์ดิโอเดินชัน/ขึ้นเขา: 5 ท่า) =================
  { name: 'Treadmill Steep Incline Walk (เดินชันลู่วิ่ง Zone 2 สลายไขมันและซ้อมขึ้นเขา)', muscle: 'Cardio', sub_muscle: 'Fat Oxidation Zone 2, Glutes & Calves (เผาผลาญไขมันโดยไม่เสียมวลกล้ามเนื้อ)', type: 'Cardio', difficulty: 'Beginner', kcal_per_unit: 9 },
  { name: 'Rucksack Weighted Incline Walk (สะพายเป้เดินชันบนลู่วิ่ง จำลองเดินป่าจริง)', muscle: 'Cardio', sub_muscle: 'Full Trail Expedition Conditioning (ความอึดปอด ขา และบ่ารับเป้)', type: 'Cardio', difficulty: 'Intermediate', kcal_per_unit: 11 },
  { name: 'Treadmill Tempo / Interval Run (วิ่งลู่วิ่งสลับความเร็ว พัฒนา VO2 Max)', muscle: 'Cardio', sub_muscle: 'Cardiovascular Stamina (ระบบหัวใจและปอดสูงสุด)', type: 'Cardio', difficulty: 'Intermediate', kcal_per_unit: 12 },
  { name: 'StairMaster / StepMill Climb (เครื่องไต่บันไดต่อเนื่อง ซ้อมขึ้นภูกระดึง/เขาหลวง)', muscle: 'Cardio', sub_muscle: 'Glutes, Quads & High Calorie Burn (ปั้นก้นกระชับและซ้อมก้าวขึ้นที่สูง)', type: 'Machine', difficulty: 'Intermediate', kcal_per_unit: 11 },
  { name: 'Stationary Bike Zone 2 (ปั่นจักรยานฟิตเนส เซฟข้อเข่า 100%)', muscle: 'Cardio', sub_muscle: 'Low-Impact Aerobic Endurance (เผาผลาญไขมันแบบไร้แรงกระแทกเข่า)', type: 'Machine', difficulty: 'Beginner', kcal_per_unit: 8 }
]

// ============================================================================
// PURE HELPER 1: สร้างการ์ดท่าวอร์มร่างกายอัตโนมัติตามกลุ่มกล้ามเนื้อของโปรแกรมวันนั้น
// ============================================================================
export function getAutoWarmupExercisesForWorkout(workoutList = [], programTitle = '') {
  const safeList = Array.isArray(workoutList) ? workoutList : []
  const muscles = safeList.map(item => (item?.muscle || '').toLowerCase())
  const names = safeList.map(item => (item?.exercise_name || item?.name || '').toLowerCase()).join(' ')
  const titleLower = (programTitle || '').toLowerCase()

  const hasLower =
    muscles.includes('legs') ||
    names.includes('squat') ||
    names.includes('lunge') ||
    names.includes('step-up') ||
    names.includes('hip thrust') ||
    names.includes('calf')
  const hasUpper =
    muscles.includes('chest') ||
    muscles.includes('back') ||
    muscles.includes('shoulders') ||
    muscles.includes('arms')
  const isTrailOrCardio =
    muscles.includes('cardio') ||
    titleLower.includes('อุทยาน') ||
    titleLower.includes('เดินป่า') ||
    titleLower.includes('ภูกระดึง') ||
    names.includes('incline') ||
    names.includes('rucksack')

  let selectedWarmups = []

  if (isTrailOrCardio && hasLower) {
    // โปรแกรมเดินป่า / ซ้อมขึ้นเขา / ขา + ลู่วิ่งชัน
    selectedWarmups = [
      MASTER_EXERCISE_LIBRARY[4], // World's Greatest Stretch & Hip Opener
      MASTER_EXERCISE_LIBRARY[7]  // Ankle Dorsiflexion & Calf Pump Trail Warm-Up
    ]
  } else if (hasLower && !hasUpper) {
    // วันเล่นขา ก้น สะโพก ล้วน (Leg / Glute Day)
    selectedWarmups = [
      MASTER_EXERCISE_LIBRARY[4], // World's Greatest Stretch & Hip Opener
      MASTER_EXERCISE_LIBRARY[6]  // Bodyweight Good Morning & Pry Squat Warm-Up
    ]
  } else if (hasUpper && !hasLower) {
    // วันเล่นส่วนบน อก หลัง ไหล่ แขน (Push / Pull / Upper Body)
    selectedWarmups = [
      MASTER_EXERCISE_LIBRARY[0], // Arm Circles & Scapular Swings
      MASTER_EXERCISE_LIBRARY[1]  // Scapular Push-Up & Wrist Warm-Up
    ]
  } else {
    // วันเล่นทั่วร่าง (Full Body / Mobility / Quick Mode)
    selectedWarmups = [
      MASTER_EXERCISE_LIBRARY[0], // Arm Circles & Scapular Swings
      MASTER_EXERCISE_LIBRARY[4]  // World's Greatest Stretch & Hip Opener
    ]
  }

  return selectedWarmups.map((w, idx) => ({
    exercise_name: `🔥 [วอร์มร่างกายท่าที่ ${idx + 1}] ${w.name}`,
    name: `🔥 [วอร์มร่างกายท่าที่ ${idx + 1}] ${w.name}`,
    muscle: 'Warmup',
    sub_muscle: w.sub_muscle,
    type: 'Bodyweight',
    sets: 2,
    reps: '12-15 ครั้ง (หรือ 45 วินาที)',
    weight: 0,
    is_warmup: true,
    program_title: programTitle || undefined,
    description_th: `🎓 วิธีวอร์มสำหรับมือใหม่: ${w.warmup_guide_th} (ทำ 2 เซ็ตต่อเนื่อง พัก 30 วินาที เพื่อเพิ่มน้ำหล่อเลี้ยงข้อต่อและป้องกันการบาดเจ็บก่อนเริ่มยกเวทจริง)`
  }))
}

// ============================================================================
// PURE HELPER 2: แทรกท่าวอร์มเข้าต้นโปรแกรมอัตโนมัติ (โดยไม่สร้างซ้ำถ้ามีอยู่แล้ว)
// ============================================================================
export function injectWarmupIntoProgram(exercises = [], programTitle = '') {
  if (!Array.isArray(exercises) || exercises.length === 0) return []

  // ถ้าเป็นวันพัก (Rest Day) ไม่ต้องแทรกท่าวอร์มซ้ำ
  const isRestDay = exercises.some(
    ex =>
      ex?.muscle === 'Recovery' ||
      (ex?.exercise_name || ex?.name || '').includes('Active Recovery') ||
      (ex?.exercise_name || ex?.name || '').includes('วันพัก')
  )
  if (isRestDay) return exercises

  // ตรวจว่ามีท่าวอร์มอยู่แล้วหรือยัง
  const alreadyHasWarmup = exercises.some(
    ex =>
      ex?.is_warmup === true ||
      ex?.muscle === 'Warmup' ||
      (ex?.exercise_name || ex?.name || '').includes('[วอร์มร่างกาย') ||
      (ex?.exercise_name || ex?.name || '').toLowerCase().includes('warm-up') ||
      (ex?.exercise_name || ex?.name || '').toLowerCase().includes('warmup')
  )
  if (alreadyHasWarmup) return exercises

  const resolvedTitle =
    programTitle ||
    exercises.find(e => e?.program_title)?.program_title ||
    ''

  const warmupCards = getAutoWarmupExercisesForWorkout(exercises, resolvedTitle)
  return [...warmupCards, ...exercises]
}

// ============================================================================
// PURE HELPER 3: คู่มือการวอร์มรายท่า & เซ็ตวอร์มก่อนเข้าเซ็ตจริง (สำหรับแสดงในทุกๆ ท่าฝึก)
// ============================================================================
export function getSetBySetWarmupGuide(exercise = {}) {
  const name = exercise?.exercise_name || exercise?.name || ''
  const muscle = exercise?.muscle || 'Chest'
  const workingWeight = Number(exercise?.weight) || 0
  const isWarmupEx =
    exercise?.is_warmup === true ||
    muscle === 'Warmup' ||
    name.includes('[วอร์มร่างกาย')

  if (isWarmupEx) {
    // ค้นหาคำแนะนำเฉพาะท่าจากคลัง
    const matched = MASTER_EXERCISE_LIBRARY.find(
      m => m.muscle === 'Warmup' && name.includes(m.name.split('(')[0].trim())
    )
    return {
      isWarmupCard: true,
      badge: '🔥 STEP 0 • DYNAMIC WARM-UP (ท่าวอร์มร่างกายบังคับก่อนฝึก)',
      whyImportant: 'ช่วยให้หัวใจสูบฉีดเลือดไปเลี้ยงกล้ามเนื้อ เพิ่มน้ำไขข้อ (Synovial Fluid) ลดโอกาสเอ็นอักเสบหรือกล้ามเนื้อฉีกขาดได้ถึง 70%',
      steps: [
        {
          id: 'w1',
          label: 'เซ็ตวอร์มที่ 1 (ปลุกข้อต่อและเส้นเอ็น)',
          detail: matched?.warmup_guide_th || 'เคลื่อนไหวช้าๆ เต็มระยะข้อต่อ (Full Range of Motion) 12-15 ครั้ง ห้ามกระชาก หายใจเข้า-ออกลึกๆ'
        },
        {
          id: 'w2',
          label: 'เซ็ตวอร์มที่ 2 (เพิ่มอุณหภูมิกล้ามเนื้อให้พร้อมรับน้ำหนัก)',
          detail: 'ทำซ้ำอีก 12-15 ครั้งด้วยจังหวะที่กระฉับกระเฉงขึ้น จนรู้สึกอุ่นบริเวณข้อต่อและกล้ามเนื้อเป้าหมาย แล้วไปเริ่มท่าหลักได้เลย!'
        }
      ]
    }
  }

  if (muscle === 'Cardio') {
    return {
      isWarmupCard: false,
      badge: '🏃 คู่มือวอร์มก่อนคาร์ดิโอ / เดินชันขึ้นเขา',
      whyImportant: 'การเร่งความเร็วหรือความชันทันทีทำให้หน้ามืดและปวดหน้าแข้ง มือใหม่ต้องไต่ระดับความเร็ว 3 นาทีแรกเสมอ',
      steps: [
        {
          id: 'c1',
          label: 'นาทีที่ 1-2: เดินราบความเร็วต่ำ + หมุนข้อเท้า',
          detail: 'เริ่มเดินที่ความชัน 0-2% ความเร็วสบายๆ (3.0 - 4.0 km/h) เพื่อให้ข้อเท้า น่อง และหัวใจปรับตัว'
        },
        {
          id: 'c2',
          label: 'นาทีที่ 3: ไต่ระดับเข้าสู่ความชันเป้าหมาย',
          detail: 'ค่อยๆ ปรับความชัน (Incline) ขึ้นทีละ 2-3% จนถึงระดับเป้าหมาย ก้าวเต็มฝ่าเท้า ห้ามเกาะราวลู่วิ่งเอนตัวไปข้างหลัง'
        }
      ]
    }
  }

  // ท่าเวทเทรนนิ่ง / บอดี้เวท (Chest, Back, Legs, Shoulders, Arms, Core)
  const w40 = workingWeight > 2 ? Math.max(1, Math.round(workingWeight * 0.45)) : 0
  const w70 = workingWeight > 4 ? Math.max(2, Math.round(workingWeight * 0.7)) : 0

  const jointPrepByMuscle = {
    Chest: 'หมุนหัวไหล่ 10 รอบ + กางแขนดึงสะบักไปด้านหลัง 10 ครั้ง เพื่อเปิดหน้าอกและล็อกสะบัก',
    Back: 'เหวี่ยงแขนเปิดสะบัก + ห้อยตัวหรือดึงสะบักเปล่าๆ (Scapular Pull) 10 ครั้ง เพื่อปลุกกล้ามเนื้อปีก',
    Legs: 'ย่อสควอทตัวเปล่าช้าๆ 10 ครั้ง + โยกเข่าเปิดข้อเท้าซ้าย-ขวา เพื่อให้ข้อเข่าและสะโพกมีน้ำหล่อเลี้ยง',
    Shoulders: 'หมุนหัวไหล่หน้า-หลัง 15 รอบ + ยกแขนเปล่าขึ้น-ลงในองศาที่จะเล่น 12 ครั้ง เพื่อเช็กว่าไหล่ไม่ติดขัด',
    Arms: 'หมุนข้อมือและพับ-เหยียดข้อศอกเปล่าๆ 15 ครั้ง เพื่อให้เอ็นข้อศอกอุ่นก่อนรับแรงดึง',
    Core: 'หายใจเข้าลึกแล้วเป่าลมออกเกร็งหน้าท้อง (Abdominal Bracing) ค้าง 5 วินาที × 5 รอบ เพื่อปลุกแกนกลาง'
  }

  return {
    isWarmupCard: false,
    badge: '🛡️ คู่มือเซ็ตวอร์มสำหรับมือใหม่ (ทำก่อนเริ่มเซ็ตจริง #1)',
    whyImportant: 'ห้ามยกน้ำหนักจริงทันทีเด็ดขาด! การทำเซ็ตวอร์ม (Warm-up Sets) 1-2 เซ็ตด้วยน้ำหนักเบา ช่วยให้สมองจับโฟกัสกล้ามเนื้อถูกมัดและยกได้หนักขึ้นโดยไม่เจ็บข้อต่อ',
    steps: [
      {
        id: 's1',
        label: 'ขั้นที่ 1: ขยับข้อต่อจำลองท่า (Joint & Movement Prep 30 วินาที)',
        detail: jointPrepByMuscle[muscle] || jointPrepByMuscle.Chest
      },
      {
        id: 's2',
        label:
          workingWeight > 0
            ? `ขั้นที่ 2: เซ็ตวอร์มที่ 1 — ใช้น้ำหนักเบา ~${w40} kg (หรือดัมเบลคู่เล็กสุด) × 12-15 ครั้ง`
            : 'ขั้นที่ 2: เซ็ตวอร์มที่ 1 — ทำท่านี้แบบครึ่งระยะช้าๆ 10 ครั้ง เพื่อเช็กองศาและจับโฟกัส',
        detail: 'เน้นเคลื่อนไหวช้าๆ สัมผัสว่ากล้ามเนื้อเป้าหมายหดและยืดตัว ไม่ต้องรีบและยังไม่นับเป็นเซ็ตจริง'
      },
      ...(workingWeight >= 8
        ? [
            {
              id: 's3',
              label: `ขั้นที่ 3: เซ็ตวอร์มที่ 2 (ปรับตัวรับน้ำหนัก) — ใช้น้ำหนัก ~${w70} kg × 6-8 ครั้ง`,
              detail: 'ยกแค่ 6-8 ครั้งเพื่อกระตุ้นระบบประสาทให้คุ้นชินกับความหนัก พัก 60 วินาที แล้วกดเริ่มเซ็ตจริง #1 ได้เลย!'
            }
          ]
        : [])
    ]
  }
}

const MUSCLE_FILTER_DEFS = [
  { id: 'All', label: 'ทั้งหมด' },
  { id: 'Warmup', label: '🔥 ท่าวอร์มร่างกาย (Warm-up)' },
  { id: 'Chest', label: 'Chest (อก)' },
  { id: 'Back', label: 'Back (หลัง/ปีก)' },
  { id: 'Legs', label: 'Legs (ขา/ก้น/น่อง)' },
  { id: 'Shoulders', label: 'Shoulders (ไหล่/บ่า)' },
  { id: 'Arms', label: 'Arms (หน้าแขน/หลังแขน)' },
  { id: 'Core', label: 'Core (หน้าท้อง/เอวเอส)' },
  { id: 'Cardio', label: 'Cardio (ลู่วิ่งเดินชัน)' }
]

const EQUIPMENT_FILTERS = [
  { id: 'All', label: 'ทุกอุปกรณ์' },
  { id: 'Dumbbell', label: 'ดัมเบล (Dumbbell)' },
  { id: 'Barbell', label: 'บาร์เบล (Barbell)' },
  { id: 'Machine', label: 'แมชชีน (Machine)' },
  { id: 'Cable', label: 'เคเบิล (Cable)' },
  { id: 'Calisthenics', label: 'คาลิสเธนิกส์ (บาร์โหน)' },
  { id: 'Bodyweight', label: 'บอดี้เวท / วอร์มมือเปล่า (Bodyweight)' },
  { id: 'Cardio', label: 'ลู่วิ่ง (Treadmill)' }
]

export default function ExerciseModal({ isOpen, onClose, onAddExercise }) {
  const [exercises, setExercises] = useState(MASTER_EXERCISE_LIBRARY)
  const [selectedMuscle, setSelectedMuscle] = useState('All')
  const [selectedEquip, setSelectedEquip] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')

  // ฟอร์มสำหรับเพิ่มท่าใหม่เข้าฐานข้อมูลด้วยตัวเอง
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customMuscle, setCustomMuscle] = useState('Warmup')
  const [customSubMuscle, setCustomSubMuscle] = useState('')
  const [customType, setCustomType] = useState('Bodyweight')
  const [isSavingCustom, setIsSavingCustom] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    const loadDBExercises = async () => {
      try {
        const { data } = await supabase.from('exercises').select('*').order('id', { ascending: true })
        if (Array.isArray(data) && data.length > 0) {
          const existingNames = new Set(MASTER_EXERCISE_LIBRARY.map(e => e.name))
          const extraFromDB = data
            .filter(d => d && d.name && !existingNames.has(d.name))
            .map(d => ({
              name: d.name,
              muscle: d.muscle || 'Chest',
              sub_muscle: d.sub_muscle || d.muscle || 'General Muscle',
              type: d.type || 'Dumbbell',
              difficulty: d.difficulty || 'Intermediate',
              kcal_per_unit: Number(d.kcal_per_unit) || 8
            }))
          setExercises([...MASTER_EXERCISE_LIBRARY, ...extraFromDB])
        } else {
          setExercises(MASTER_EXERCISE_LIBRARY)
        }
      } catch {
        setExercises(MASTER_EXERCISE_LIBRARY)
      }
    }
    loadDBExercises()
  }, [isOpen])

  if (!isOpen) return null

  const filteredExercises = exercises.filter(ex => {
    if (!ex || !ex.name) return false
    const matchMuscle = selectedMuscle === 'All' || ex.muscle === selectedMuscle
    const matchEquip = selectedEquip === 'All' || ex.type === selectedEquip
    const kw = (searchQuery || '').trim().toLowerCase()
    const nameStr = (ex.name || '').toLowerCase()
    const subStr = (ex.sub_muscle || '').toLowerCase()
    const guideStr = (ex.warmup_guide_th || '').toLowerCase()
    const matchSearch = !kw || nameStr.includes(kw) || subStr.includes(kw) || guideStr.includes(kw)
    return matchMuscle && matchEquip && matchSearch
  })

  const handleCreateCustomExercise = async (e) => {
    e.preventDefault()
    if (!customName.trim()) return
    setIsSavingCustom(true)

    const newExObj = {
      name: customName.trim(),
      muscle: customMuscle,
      sub_muscle: customSubMuscle.trim() || `${customMuscle} Custom Focus`,
      type: customType,
      difficulty: 'Beginner',
      kcal_per_unit: customMuscle === 'Warmup' ? 5 : 9,
      is_warmup: customMuscle === 'Warmup'
    }

    try {
      await supabase.from('exercises').upsert([newExObj], { onConflict: 'name' })
    } catch {
      // กรณีออฟไลน์ยังสามารถเพิ่มลง State หน้าจอได้ทันที
    }

    setExercises(prev => [newExObj, ...prev])
    setCustomName('')
    setCustomSubMuscle('')
    setShowCustomForm(false)
    setIsSavingCustom(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs">
      <div className="flex flex-col w-full max-w-5xl bg-white border border-slate-200 max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 text-white bg-slate-900">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 text-[10px] font-black text-slate-950 bg-emerald-400 rounded uppercase">
                MASTER EXERCISE & WARM-UP ATLAS
              </span>
              <h2 className="text-lg font-extrabold">คลังท่าออกกำลังกาย & ท่าวอร์มร่างกาย ({exercises.length} ท่า)</h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              มีหมวด 🔥 ท่าวอร์มร่างกายสำหรับมือใหม่ พร้อมคำอธิบายวิธีวอร์มทีละสเต็ป และคลิปสาธิตทุกท่า
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowCustomForm(prev => !prev)}
              className="px-3.5 py-1.5 text-xs font-extrabold text-emerald-950 bg-emerald-400 rounded-xl hover:bg-emerald-300 transition"
            >
              {showCustomForm ? '✕ ปิดฟอร์มเพิ่มท่า' : '+ สร้างท่าฝึก/ท่าวอร์มใหม่'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white text-lg font-bold"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ฟอร์มสร้างท่าออกกำลังกายใหม่เข้าคลัง */}
        {showCustomForm && (
          <form onSubmit={handleCreateCustomExercise} className="p-4 bg-emerald-50 border-b border-emerald-200 space-y-3">
            <div className="text-xs font-extrabold text-emerald-900">
              ✨ เพิ่มท่าออกกำลังกายหรือท่าวอร์มร่างกายใหม่เข้าสู่คลังส่วนตัวของคุณ
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <input
                type="text"
                required
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="ชื่อท่า (เช่น หมุนสะโพกวอร์มก่อนสควอท)"
                className="px-3 py-2 text-xs font-bold bg-white border border-emerald-300 rounded-xl outline-none"
              />
              <select
                value={customMuscle}
                onChange={(e) => setCustomMuscle(e.target.value)}
                className="px-3 py-2 text-xs font-bold bg-white border border-emerald-300 rounded-xl outline-none"
              >
                {MUSCLE_FILTER_DEFS.filter(m => m.id !== 'All').map(m => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
              <select
                value={customType}
                onChange={(e) => setCustomType(e.target.value)}
                className="px-3 py-2 text-xs font-bold bg-white border border-emerald-300 rounded-xl outline-none"
              >
                {EQUIPMENT_FILTERS.filter(eq => eq.id !== 'All').map(eq => (
                  <option key={eq.id} value={eq.id}>{eq.label}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customSubMuscle}
                  onChange={(e) => setCustomSubMuscle(e.target.value)}
                  placeholder="จุดโฟกัส / วิธีวอร์ม..."
                  className="flex-1 px-3 py-2 text-xs font-medium bg-white border border-emerald-300 rounded-xl outline-none"
                />
                <button
                  type="submit"
                  disabled={isSavingCustom}
                  className="px-4 py-2 text-xs font-extrabold text-white bg-emerald-700 rounded-xl hover:bg-emerald-800 shrink-0"
                >
                  บันทึก
                </button>
              </div>
            </div>
          </form>
        )}

        {/* แถบค้นหาและตัวกรองกล้ามเนื้อ/อุปกรณ์ */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3">
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อท่า เช่น วอร์มไหล่, เปิดสะโพก, ข้อเท้า, อกบน, ปีก, ก้น, Squat..."
              className="flex-1 min-w-[240px] px-4 py-2 text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
            <select
              value={selectedEquip}
              onChange={(e) => setSelectedEquip(e.target.value)}
              className="px-3.5 py-2 text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-xl outline-none"
            >
              {EQUIPMENT_FILTERS.map(eq => (
                <option key={eq.id} value={eq.id}>{eq.label}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {MUSCLE_FILTER_DEFS.map(m => {
              const count =
                m.id === 'All'
                  ? exercises.length
                  : exercises.filter(ex => ex.muscle === m.id).length
              const isWarmupTab = m.id === 'Warmup'

              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedMuscle(m.id)}
                  className={`px-3 py-1.5 text-xs font-extrabold rounded-xl border transition ${
                    selectedMuscle === m.id
                      ? isWarmupTab
                        ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-xs'
                        : 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : isWarmupTab
                        ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                        : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {m.label} ({count} ท่า)
                </button>
              )
            })}
          </div>
        </div>

        {/* แบนเนอร์แนะนำมือใหม่เมื่อดูหมวดท่าวอร์ม */}
        {selectedMuscle === 'Warmup' && (
          <div className="px-5 py-3 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-emerald-500/10 border-b border-amber-200 flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs font-bold text-amber-950">
              💡 <span className="font-black">ทำไมมือใหม่ต้องวอร์มแบบเคลื่อนไหว (Dynamic Warm-up)?</span> — ห้ามยืดค้างนิ่งๆ นานเกินไปก่อนยกเวท! ให้ขยับข้อต่อตามท่าด้านล่าง 1-2 ท่า (ท่าละ 12-15 ครั้ง) เพื่อเพิ่มน้ำหล่อเลี้ยงข้อต่อและเปิดระบบประสาทก่อนยกจริง
            </div>
          </div>
        )}

        {/* รายการท่าออกกำลังกาย */}
        <div className="flex-1 p-5 overflow-y-auto bg-slate-100/70">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {filteredExercises.map((ex, idx) => {
              const ytUrl = getExerciseYouTubeUrl(ex.name)
              const isWarmup = ex.muscle === 'Warmup' || ex.is_warmup
              return (
                <div
                  key={`${ex.name}-${idx}`}
                  className={`flex flex-col justify-between gap-3 p-3.5 bg-white border rounded-2xl shadow-2xs transition ${
                    isWarmup
                      ? 'border-amber-300 bg-gradient-to-br from-amber-50/60 to-white hover:border-amber-500'
                      : 'border-slate-200 hover:border-emerald-500'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <ExerciseIllustration
                        name={ex.name}
                        muscle={isWarmup ? (ex.warmup_focus === 'lower' || ex.warmup_focus === 'trail' ? 'Legs' : 'Shoulders') : ex.muscle}
                        type={ex.type}
                        size="md"
                      />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                          {isWarmup && (
                            <span className="px-2 py-0.5 text-[10px] font-black text-amber-950 bg-amber-300 rounded-md">
                              🔥 ท่าวอร์มก่อนฝึก
                            </span>
                          )}
                          <h3 className="text-xs font-black text-slate-900 leading-snug">
                            {ex.name}
                          </h3>
                        </div>
                        <p className="text-[11px] font-semibold text-emerald-700 mt-0.5">
                          {ex.sub_muscle}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-700 rounded-md">
                            {ex.type}
                          </span>
                          <a
                            href={ytUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2 py-0.5 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-md hover:bg-rose-100"
                          >
                            ▶ ดูคลิปสอนท่านี้
                          </a>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onAddExercise(
                          isWarmup
                            ? {
                                ...ex,
                                sets: 2,
                                reps: '12-15 ครั้ง',
                                weight: 0,
                                is_warmup: true,
                                description_th: `🎓 วิธีวอร์มสำหรับมือใหม่: ${ex.warmup_guide_th || ex.sub_muscle}`
                              }
                            : ex
                        )
                        onClose()
                      }}
                      className={`px-3.5 py-2 text-xs font-extrabold text-white rounded-xl shrink-0 shadow-2xs ${
                        isWarmup
                          ? 'bg-amber-600 hover:bg-amber-700'
                          : 'bg-emerald-600 hover:bg-emerald-700'
                      }`}
                    >
                      {isWarmup ? '+ เพิ่มท่าวอร์มนี้' : '+ เลือกท่านี้'}
                    </button>
                  </div>

                  {/* แสดงคำอธิบายวิธีวอร์มทีละขั้นสำหรับมือใหม่ทันทีในหน้าเลือกท่า */}
                  {isWarmup && ex.warmup_guide_th && (
                    <div className="p-2.5 text-[11px] font-medium text-amber-950 bg-amber-100/70 border border-amber-200 rounded-xl leading-relaxed">
                      <span className="font-extrabold text-amber-900">🎓 วิธีทำทีละขั้น (มือใหม่): </span>
                      {ex.warmup_guide_th}
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
}