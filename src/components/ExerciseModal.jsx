import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import ExerciseIllustration, { getExerciseYouTubeUrl } from './ExerciseIllustration'

// ============================================================================
// MASTER EXERCISE LIBRARY (ครบ 95 ท่ามาตรฐาน: 10 ท่าวอร์มร่างกาย + 85 ท่าเวท/คาลิสเธนิกส์/เดินป่า)
// ============================================================================
export const MASTER_EXERCISE_LIBRARY = [
  // ================= 0. WARM-UP & DYNAMIC MOBILITY (ท่าวอร์มร่างกายก่อนฝึก: 10 ท่า) =================
  {
    name: 'Arm Circles & Scapular Swings (หมุนหัวไหล่และเหวี่ยงแขนเปิดหน้าอก)',
    muscle: 'Warmup',
    sub_muscle: 'วอร์มข้อต่อหัวไหล่ สะบัก และหน้าอก ก่อนเล่นอก/ไหล่/หลัง',
    type: 'Bodyweight',
    difficulty: 'Beginner',
    kcal_per_unit: 5,
    is_warmup: true,
    warmup_focus: 'upper',
    warmup_guide_th: 'ยืนตรงหมุนไหล่หน้า-หลัง 15 รอบ + เหวี่ยงแขนสลับหน้าอก 15 ครั้ง'
  },
  {
    name: 'Scapular Push-Up & Wrist Warm-Up (หมุนข้อมือและดันสะบักท่าแพลงก์)',
    muscle: 'Warmup',
    sub_muscle: 'ปลุกกล้ามเนื้อสะบักและเซฟข้อมือ-ข้อศอกก่อนดันเวท',
    type: 'Bodyweight',
    difficulty: 'Beginner',
    kcal_per_unit: 5,
    is_warmup: true,
    warmup_focus: 'upper',
    warmup_guide_th: 'หมุนข้อมือ 15 รอบ + ตั้งท่าแพลงก์แขนตึงดันสะบักขึ้น-ลง 12 ครั้ง'
  },
  {
    name: 'Dynamic Chest Opener & Torso Twist (กางแขนเปิดหน้าอกและบิดลำตัวซ้าย-ขวา)',
    muscle: 'Warmup',
    sub_muscle: 'ยืดเปิดทรวงอกและปลุกแกนกลางลำตัว',
    type: 'Bodyweight',
    difficulty: 'Beginner',
    kcal_per_unit: 5,
    is_warmup: true,
    warmup_focus: 'upper',
    warmup_guide_th: 'กางแขนดึงศอกเปิดอก + บิดลำตัวซ้าย-ขวา 15 ครั้ง'
  },
  {
    name: 'Towel / Band Shoulder Dislocates (จับผ้าขนหนูวาดแขนเปิดหัวไหล่)',
    muscle: 'Warmup',
    sub_muscle: 'วอร์มเอ็นหมุนข้อไหล่ ป้องกันไหล่บาดเจ็บ',
    type: 'Bodyweight',
    difficulty: 'Beginner',
    kcal_per_unit: 5,
    is_warmup: true,
    warmup_focus: 'upper',
    warmup_guide_th: 'จับผ้ากว้างกว่าไหล่ ยกวาดขึ้นเหนือศีรษะไปด้านหลังช้าๆ 12 ครั้ง'
  },
  {
    name: "World's Greatest Stretch & Hip Opener (ก้าวย่อบิดลำตัวเปิดสะโพกและข้อเท้า)",
    muscle: 'Warmup',
    sub_muscle: 'เปิดสะโพก แฮมสตริง และข้อเท้า ก่อนเล่นขา/สควอท',
    type: 'Bodyweight',
    difficulty: 'Beginner',
    kcal_per_unit: 6,
    is_warmup: true,
    warmup_focus: 'lower',
    warmup_guide_th: 'ก้าวขายาวไปด้านหน้า ย่อสะโพกลงแล้วบิดตัวชูแขนขึ้นฟ้า ข้างละ 8 ครั้ง'
  },
  {
    name: 'Dynamic Leg Swings & Knee Circles (แกว่งขาหน้า-หลังและหมุนข้อเข่า)',
    muscle: 'Warmup',
    sub_muscle: 'วอร์มข้อสะโพก แฮมสตริง และลูกสะบ้าเข่า',
    type: 'Bodyweight',
    difficulty: 'Beginner',
    kcal_per_unit: 5,
    is_warmup: true,
    warmup_focus: 'lower',
    warmup_guide_th: 'จับกำแพงแกว่งขาหน้า-หลังข้างละ 12 ครั้ง + หมุนข้อเข่าเบาๆ 10 รอบ'
  },
  {
    name: 'Bodyweight Good Morning & Deep Squat Pry (พับสะโพกและนั่งยองเปิดสะโพก)',
    muscle: 'Warmup',
    sub_muscle: 'ปลุกก้น แฮมสตริง และหลังล่างก่อนสควอทหนัก',
    type: 'Bodyweight',
    difficulty: 'Beginner',
    kcal_per_unit: 6,
    is_warmup: true,
    warmup_focus: 'lower',
    warmup_guide_th: 'พับสะโพกหลังตรง 10 ครั้ง + นั่งยองใช้ศอกดันเข่าเปิดสะโพก 10 ครั้ง'
  },
  {
    name: 'Ankle Dorsiflexion & Calf Pump (โยกเข่าเปิดข้อเท้าและเขย่งน่องเตรียมเดินชัน)',
    muscle: 'Warmup',
    sub_muscle: 'ป้องกันข้อเท้าพลิกและตะคริวน่องก่อนเดินป่า/ลู่วิ่งชัน',
    type: 'Bodyweight',
    difficulty: 'Beginner',
    kcal_per_unit: 5,
    is_warmup: true,
    warmup_focus: 'trail',
    warmup_guide_th: 'โยกเข่าไปด้านหน้าโดยส้นเท้าติดพื้น 12 ครั้ง + เขย่งน่องสลับกระดกเท้า 15 ครั้ง'
  },
  {
    name: 'Cat-Cow & Bird-Dog Spine Warm-Up (โก่ง-แอ่นหลังบริหารแนวกระดูกสันหลัง)',
    muscle: 'Warmup',
    sub_muscle: 'เซฟหมอนรองกระดูกสันหลังและปลุกแกนกลางลำตัว',
    type: 'Bodyweight',
    difficulty: 'Beginner',
    kcal_per_unit: 5,
    is_warmup: true,
    warmup_focus: 'full',
    warmup_guide_th: 'คุกเข่าวางมือ แอ่นอกสลับโก่งสะบัก 10 รอบ + เหยียดแขนขาตรงข้าม 10 ครั้ง'
  },
  {
    name: 'Low-Impact Jumping Jacks & High Knees (ก้าวตบและยกเข่าสูงกระตุ้นหัวใจ)',
    muscle: 'Warmup',
    sub_muscle: 'เพิ่มอุณหภูมิกล้ามเนื้อและสูบฉีดเลือดทั่วร่าง',
    type: 'Bodyweight',
    difficulty: 'Beginner',
    kcal_per_unit: 7,
    is_warmup: true,
    warmup_focus: 'full',
    warmup_guide_th: 'ก้าวตบเหนือหัว 30 วินาที + เดินยกเข่าสูงแกว่งแขน 30 วินาที'
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
// PURE HELPER 1: จัดการ์ดท่าวอร์ม 1 ท่าหลักที่ตรงกับโปรแกรมวันนั้น (กระชับ ไม่รก)
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
    names.includes('hip thrust')
  const isTrail =
    titleLower.includes('อุทยาน') ||
    titleLower.includes('เดินป่า') ||
    names.includes('incline') ||
    names.includes('rucksack')

  let pickedWarmup = MASTER_EXERCISE_LIBRARY[0] // Arm Circles & Scapular Swings (Upper/Full)
  if (isTrail) {
    pickedWarmup = MASTER_EXERCISE_LIBRARY[7] // Ankle Dorsiflexion & Calf Pump
  } else if (hasLower) {
    pickedWarmup = MASTER_EXERCISE_LIBRARY[4] // World's Greatest Stretch & Hip Opener
  }

  return [
    {
      exercise_name: `🔥 [วอร์มร่างกาย] ${pickedWarmup.name}`,
      name: `🔥 [วอร์มร่างกาย] ${pickedWarmup.name}`,
      muscle: 'Warmup',
      sub_muscle: pickedWarmup.sub_muscle,
      type: 'Bodyweight',
      sets: 2,
      reps: 15,
      weight: 0,
      is_warmup: true,
      program_title: programTitle || undefined,
      description_th: pickedWarmup.warmup_guide_th
    }
  ]
}

// ============================================================================
// PURE HELPER 2: แทรกท่าวอร์ม 1 ท่าเข้าต้นโปรแกรมอัตโนมัติ
// ============================================================================
export function injectWarmupIntoProgram(exercises = [], programTitle = '') {
  if (!Array.isArray(exercises) || exercises.length === 0) return []

  const isRestDay = exercises.some(
    ex =>
      ex?.muscle === 'Recovery' ||
      ex?.muscle === 'Rest' ||
      (ex?.exercise_name || ex?.name || '').includes('วันพัก')
  )
  if (isRestDay) return exercises

  const alreadyHasWarmup = exercises.some(
    ex =>
      ex?.is_warmup === true ||
      ex?.muscle === 'Warmup' ||
      (ex?.exercise_name || ex?.name || '').includes('[วอร์ม') ||
      (ex?.exercise_name || ex?.name || '').toLowerCase().includes('warm-up')
  )
  if (alreadyHasWarmup) return exercises

  const resolvedTitle =
    programTitle ||
    exercises.find(e => e?.program_title)?.program_title ||
    ''

  const warmupCards = getAutoWarmupExercisesForWorkout(exercises, resolvedTitle)
  return [...warmupCards, ...exercises]
}

// เผื่อไฟล์อื่นเรียกใช้งาน
export function getSetBySetWarmupGuide(exercise = {}) {
  const w = Number(exercise?.weight) || 0
  const lightW = w >= 4 ? Math.max(1, Math.round(w * 0.45)) : 0
  return {
    isWarmupCard: Boolean(exercise?.is_warmup || exercise?.muscle === 'Warmup'),
    badge: '🔥 วอร์มก่อนยก',
    whyImportant: 'ป้องกันข้อต่อบาดเจ็บและโฟกัสกล้ามเนื้อได้ตรงจุด',
    steps: [
      {
        id: 's1',
        label: lightW > 0 ? `ยกเบา ~${lightW} kg × 12 ครั้ง 1 เซ็ต` : 'ขยับข้อต่อเบาๆ 12 ครั้ง 1 เซ็ต',
        detail: ''
      }
    ]
  }
}

const MUSCLE_FILTER_DEFS = [
  { id: 'All', label: 'ทั้งหมด' },
  { id: 'Warmup', label: '🔥 ท่าวอร์ม (Warm-up)' },
  { id: 'Chest', label: 'อก (Chest)' },
  { id: 'Back', label: 'หลัง (Back)' },
  { id: 'Legs', label: 'ขา/ก้น (Legs)' },
  { id: 'Shoulders', label: 'ไหล่ (Shoulders)' },
  { id: 'Arms', label: 'แขน (Arms)' },
  { id: 'Core', label: 'หน้าท้อง (Core)' },
  { id: 'Cardio', label: 'ลู่วิ่ง (Cardio)' }
]

const EQUIPMENT_FILTERS = [
  { id: 'All', label: 'ทุกอุปกรณ์' },
  { id: 'Dumbbell', label: 'ดัมเบล (Dumbbell)' },
  { id: 'Barbell', label: 'บาร์เบล (Barbell)' },
  { id: 'Machine', label: 'แมชชีน (Machine)' },
  { id: 'Cable', label: 'เคเบิล (Cable)' },
  { id: 'Calisthenics', label: 'บาร์โหน (Calisthenics)' },
  { id: 'Bodyweight', label: 'มือเปล่า / วอร์ม (Bodyweight)' },
  { id: 'Cardio', label: 'ลู่วิ่ง (Treadmill)' }
]

export default function ExerciseModal({ isOpen, onClose, onAddExercise }) {
  const [exercises, setExercises] = useState(MASTER_EXERCISE_LIBRARY)
  const [selectedMuscle, setSelectedMuscle] = useState('All')
  const [selectedEquip, setSelectedEquip] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')

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
    const matchSearch = !kw || nameStr.includes(kw) || subStr.includes(kw)
    return matchMuscle && matchEquip && matchSearch
  })

  const handleCreateCustomExercise = async (e) => {
    e.preventDefault()
    if (!customName.trim()) return
    setIsSavingCustom(true)

    const newExObj = {
      name: customName.trim(),
      muscle: customMuscle,
      sub_muscle: customSubMuscle.trim() || `${customMuscle} Focus`,
      type: customType,
      difficulty: 'Beginner',
      kcal_per_unit: customMuscle === 'Warmup' ? 5 : 9,
      is_warmup: customMuscle === 'Warmup'
    }

    try {
      await supabase.from('exercises').upsert([newExObj], { onConflict: 'name' })
    } catch {
      // ignore offline
    }

    setExercises(prev => [newExObj, ...prev])
    setCustomName('')
    setCustomSubMuscle('')
    setShowCustomForm(false)
    setIsSavingCustom(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs">
      <div className="flex flex-col w-full max-w-5xl bg-white border border-slate-200 max-h-[92vh] rounded-3xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-white bg-slate-900">
          <h2 className="text-base sm:text-xl font-black">
            คลังท่าออกกำลังกาย & ท่าวอร์ม ({exercises.length} ท่า)
          </h2>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowCustomForm(prev => !prev)}
              className="px-3.5 py-2 text-xs sm:text-sm font-extrabold text-slate-950 bg-emerald-400 rounded-xl hover:bg-emerald-300"
            >
              {showCustomForm ? '✕ ปิด' : '+ สร้างท่าใหม่'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-300 hover:text-white text-xl font-bold"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ฟอร์มสร้างท่าออกกำลังกายใหม่ */}
        {showCustomForm && (
          <form onSubmit={handleCreateCustomExercise} className="p-4 bg-emerald-50 border-b border-emerald-200 grid grid-cols-1 gap-2.5 sm:grid-cols-4">
            <input
              type="text"
              required
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="ชื่อท่าฝึกใหม่..."
              className="px-3.5 py-2.5 text-sm font-bold bg-white border border-emerald-300 rounded-xl outline-none"
            />
            <select
              value={customMuscle}
              onChange={(e) => setCustomMuscle(e.target.value)}
              className="px-3.5 py-2.5 text-sm font-bold bg-white border border-emerald-300 rounded-xl outline-none"
            >
              {MUSCLE_FILTER_DEFS.filter(m => m.id !== 'All').map(m => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
            <select
              value={customType}
              onChange={(e) => setCustomType(e.target.value)}
              className="px-3.5 py-2.5 text-sm font-bold bg-white border border-emerald-300 rounded-xl outline-none"
            >
              {EQUIPMENT_FILTERS.filter(eq => eq.id !== 'All').map(eq => (
                <option key={eq.id} value={eq.id}>{eq.label}</option>
              ))}
            </select>
            <button
              type="submit"
              disabled={isSavingCustom}
              className="px-4 py-2.5 text-sm font-extrabold text-white bg-emerald-700 rounded-xl hover:bg-emerald-800"
            >
              บันทึกท่าใหม่
            </button>
          </form>
        )}

        {/* แถบค้นหาและปุ่มกรองกล้ามเนื้อ (ตัวหนังสือใหญ่ กดง่าย) */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3">
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อท่า เช่น วอร์มไหล่, เปิดสะโพก, อกบน, ปีก, ก้น, Squat..."
              className="flex-1 min-w-[220px] px-4 py-2.5 text-sm font-bold text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
            <select
              value={selectedEquip}
              onChange={(e) => setSelectedEquip(e.target.value)}
              className="px-3.5 py-2.5 text-sm font-bold text-slate-900 bg-white border border-slate-300 rounded-xl outline-none"
            >
              {EQUIPMENT_FILTERS.map(eq => (
                <option key={eq.id} value={eq.id}>{eq.label}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-2">
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
                  className={`px-3.5 py-2 text-xs sm:text-sm font-extrabold rounded-xl border transition ${
                    selectedMuscle === m.id
                      ? isWarmupTab
                        ? 'bg-amber-500 text-slate-950 border-amber-600'
                        : 'bg-slate-900 text-white border-slate-900'
                      : isWarmupTab
                        ? 'bg-amber-50 text-amber-950 border-amber-300'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {m.label} ({count})
                </button>
              )
            })}
          </div>
        </div>

        {/* รายการท่าออกกำลังกาย (ตัวหนังสือใหญ่ ไม่รก) */}
        <div className="flex-1 p-4 sm:p-5 overflow-y-auto bg-slate-100/70">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {filteredExercises.map((ex, idx) => {
              const ytUrl = getExerciseYouTubeUrl(ex.name)
              const isWarmup = ex.muscle === 'Warmup' || ex.is_warmup
              const parts = ex.name.split('(')
              const engName = parts[0].trim()
              const thName = parts[1] ? parts[1].replace(')', '').trim() : ex.name

              return (
                <div
                  key={`${ex.name}-${idx}`}
                  className={`flex items-center justify-between gap-3 p-4 bg-white border-2 rounded-2xl transition ${
                    isWarmup
                      ? 'border-amber-300 hover:border-amber-500'
                      : 'border-slate-200 hover:border-emerald-500'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <ExerciseIllustration
                      name={ex.name}
                      muscle={isWarmup ? 'Warmup' : ex.muscle}
                      type={ex.type}
                      size="lg"
                    />
                    <div className="min-w-0">
                      <h3 className="text-sm sm:text-base font-black text-slate-900 leading-snug">
                        {thName}
                      </h3>
                      <p className="text-xs sm:text-sm font-bold text-emerald-700 truncate mt-0.5">
                        {engName}
                      </p>
                      <p className="text-xs text-slate-600 mt-1 line-clamp-1">
                        {isWarmup ? ex.warmup_guide_th : ex.sub_muscle}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className="px-2.5 py-0.5 text-xs font-bold bg-slate-100 text-slate-800 rounded-lg">
                          {ex.type}
                        </span>
                        <a
                          href={ytUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-0.5 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100"
                        >
                          ▶ คลิปสอน
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
                              reps: 15,
                              weight: 0,
                              is_warmup: true
                            }
                          : ex
                      )
                      onClose()
                    }}
                    className={`px-4 py-2.5 text-xs sm:text-sm font-black text-white rounded-xl shrink-0 shadow-xs ${
                      isWarmup
                        ? 'bg-amber-600 hover:bg-amber-700'
                        : 'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                  >
                    + เลือก
                  </button>
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}