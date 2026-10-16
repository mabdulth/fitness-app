import { useState, useEffect } from 'react'
import { calculateScientificBiometrics } from '../utils/workoutEngine'
import { calculateDailyMacrosAndHydration } from './LiveGymToolbar'

// ============================================================================
// WIKIPEDIA REAL FOOD PHOTO RESOLVER (ดึงภาพถ่ายเมนูอาหารไทย/สากลจริงจาก Wikipedia)
// ============================================================================
const foodPhotoCache = {}

async function fetchRealFoodPhotoFromWiki(wikiTitles = [], fallbackPhoto = '') {
  const candidates = Array.isArray(wikiTitles) ? wikiTitles : []
  for (const title of candidates) {
    if (!title) continue
    if (foodPhotoCache[title]) return foodPhotoCache[title]

    const isThai = /[\u0E00-\u0E7F]/.test(title)
    const lang = isThai ? 'th' : 'en'

    try {
      const res = await fetch(
        `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`
      )
      if (res.ok) {
        const data = await res.json()
        const img = data?.originalimage?.source || data?.thumbnail?.source
        if (img && !img.toLowerCase().match(/\.(svg)$|logo|icon|symbol|map/)) {
          foodPhotoCache[title] = img
          return img
        }
      }
    } catch {
      // หากเครือข่ายขัดข้องให้ลองคำค้นถัดไป
    }
  }
  return fallbackPhoto
}

// คอมโพเนนต์แสดงภาพถ่ายอาหารจริงของแต่ละเมนู
function MealPhotoBanner({ item, title, badgeColor, scaledKcal, onCycle }) {
  const [resolvedImg, setResolvedImg] = useState(item.photoUrl)
  const [imgError, setImgError] = useState(false)

  useEffect(() => {
    let active = true
    setImgError(false)
    setResolvedImg(item.photoUrl)

    fetchRealFoodPhotoFromWiki(item.wikiTitles, item.photoUrl).then(url => {
      if (active && url) {
        setResolvedImg(url)
      }
    })

    return () => {
      active = false
    }
  }, [item])

  return (
    <div className="relative h-48 w-full overflow-hidden bg-slate-900">
      {!imgError && resolvedImg ? (
        <img
          src={resolvedImg}
          alt={item.name}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover object-center hover:scale-105 transition duration-500"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 text-white p-4 text-center">
          <span className="text-4xl mb-1">{item.emoji || '🍲'}</span>
          <span className="text-xs font-bold text-emerald-300">{item.name}</span>
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent" />

      <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
        <span className={`px-2.5 py-1 text-[10px] font-black rounded-lg shadow-xs ${badgeColor}`}>
          {title}
        </span>
        <button
          type="button"
          onClick={onCycle}
          className="px-2.5 py-1 text-[11px] font-extrabold text-white bg-slate-950/85 border border-white/20 rounded-lg hover:bg-emerald-600 transition"
        >
          🔄 เปลี่ยนเมนู
        </button>
      </div>

      <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between gap-2">
        <span className="px-2.5 py-0.5 text-[10px] font-bold text-emerald-300 bg-slate-950/90 border border-emerald-500/40 rounded-md truncate">
          {item.emoji || '🍽️'} {item.tag}
        </span>
        <span className="px-2.5 py-0.5 text-xs font-black text-orange-300 bg-orange-950/95 border border-orange-500/50 rounded-md shrink-0">
          🔥 {scaledKcal} kcal
        </span>
      </div>
    </div>
  )
}

// ============================================================================
// ฐานข้อมูลโภชนาการ 5 หมวดหมู่ (เช้า, กลางวัน, เย็น, ของหวานคลีน, เครื่องดื่มฟิตเนส)
// พร้อมคำค้นภาพอาหารจริงจากสารานุกรม Wikipedia (wikiTitles) ตรงตามเมนูทุกจาน
// ============================================================================
export const THAI_FITNESS_MEALS_DB = {
  breakfast: [
    {
      id: 'b1',
      emoji: '🥣',
      name: 'โจ๊กข้าวโอ๊ตอกไก่สับ + ไข่ลวก 2 ฟอง',
      tag: 'ลีนไขมัน / ย่อยง่ายสบายท้อง',
      kcal: 360,
      protein: 35,
      carbs: 38,
      fat: 7,
      wikiTitles: ['โจ๊ก', 'Congee', 'Porridge'],
      photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/39/Congee_with_century_egg_and_pork.jpg/800px-Congee_with_century_egg_and_pork.jpg',
      youtubeQuery: 'วิธีทำ โจ๊กข้าวโอ๊ต อกไก่ คลีน',
      tip: 'ใช้ข้าวโอ๊ตต้มแทนข้าวขาว ช่วยให้อิ่มนาน ดัชนีน้ำตาลต่ำ (Low GI) และได้ไฟเบอร์สูงตั้งแต่เช้า'
    },
    {
      id: 'b2',
      emoji: '🥪',
      name: 'ขนมปังโฮลวีตปิ้ง 2 แผ่น + ไข่คนทูน่าในน้ำแร่',
      tag: 'สร้างกล้ามเนื้อ / ทำง่ายใน 5 นาที',
      kcal: 390,
      protein: 38,
      carbs: 36,
      fat: 9,
      wikiTitles: ['Scrambled eggs', 'Tuna fish sandwich', 'Toast (food)'],
      photoUrl: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=800&q=80',
      youtubeQuery: 'ขนมปังโฮลวีต ทูน่า ไข่คน เมนูลดน้ำหนัก',
      tip: 'โปรตีนสูงมากจากทูน่าและไข่ เหมาะกับเช้าวันที่มีโปรแกรมยกเวทหนักหรือเตรียมเดินป่า'
    },
    {
      id: 'b3',
      emoji: '🍲',
      name: 'เกาเหลาเลือดหมูใบตำลึง (งดกระเทียมเจียว) + ข้าวสวย 1 ทัพพี',
      tag: 'ร้านอาหารริมทาง / สั่งง่าย',
      kcal: 350,
      protein: 31,
      carbs: 38,
      fat: 8,
      wikiTitles: ['ต้มเลือดหมู', 'Pork blood soup', 'ก๋วยเตี๋ยว'],
      photoUrl: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=800&q=80',
      youtubeQuery: 'เกาเหลาเลือดหมู คลีน ลดน้ำหนัก',
      tip: 'สั่งเน้นหมูชิ้นและตับ ไม่เอาหมูกรอบ/เครื่องในติดมัน และแจ้งร้านว่างดกระเทียมเจียว'
    },
    {
      id: 'b4',
      emoji: '🥚',
      name: 'อกไก่ตุ๋นพริกไทยดำ + กล้วยหอม 1 ลูก + ไข่ต้ม 2 ฟอง',
      tag: 'เซ็ตเร่งด่วน / ร้านสะดวกซื้อ',
      kcal: 380,
      protein: 42,
      carbs: 34,
      fat: 7,
      wikiTitles: ['ไข่ต้ม', 'Boiled egg', 'Chicken breast'],
      photoUrl: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=800&q=80',
      youtubeQuery: 'จัดเซ็ตอาหารคลีน เซเว่น โปรตีนสูง',
      tip: 'หาซื้อง่ายที่สุด ได้โปรตีนทะลุ 40 กรัมพร้อมโพแทสเซียมจากกล้วยหอมช่วยป้องกันตะคริว'
    }
  ],
  lunch: [
    {
      id: 'l1',
      emoji: '🍛',
      name: 'ข้าวกะเพราอกไก่สับผัดน้ำ + ไข่ดาวน้ำ (ไร้น้ำมัน)',
      tag: 'อาหารตามสั่งปรับคลีนยอดฮิต',
      kcal: 450,
      protein: 42,
      carbs: 52,
      fat: 7,
      wikiTitles: ['ผัดกะเพรา', 'Phat kaphrao'],
      photoUrl: 'https://images.unsplash.com/photo-1562565652-a0d8f0c59eb4?auto=format&fit=crop&w=800&q=80',
      youtubeQuery: 'วิธีทำ กะเพราอกไก่ผัดน้ำ คลีน',
      tip: 'สั่งร้านตามสั่งว่า "อกไก่สับผัดน้ำไม่ใส่น้ำมัน" ช่วยตัดแคลอรี่จากน้ำมันพืชออกไปได้ถึง 250 kcal!'
    },
    {
      id: 'l2',
      emoji: '🐟',
      name: 'ข้าวไรซ์เบอร์รี่ + ปลากะพงนึ่งมะนาว / ต้มยำน้ำใสปลา',
      tag: 'รีดไขมันคมชัด (Cutting)',
      kcal: 410,
      protein: 38,
      carbs: 48,
      fat: 6,
      wikiTitles: ['ต้มยำ', 'Tom yum', 'Barramundi'],
      photoUrl: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=800&q=80',
      youtubeQuery: 'ปลากะพงนึ่งมะนาว คลีน ลดความอ้วน',
      tip: 'เนื้อปลาขาวไขมันต่ำและย่อยง่ายมาก ทำให้ช่วงบ่ายไม่รู้สึกง่วงซึมและท้องไม่ผูก'
    },
    {
      id: 'l3',
      emoji: '🍗',
      name: 'ข้าวมันไก่ตอน (เปลี่ยนเป็นข้าวสวยขาว + อกไก่ลอกหนัง)',
      tag: 'สตรีทฟู้ดสายลีน',
      kcal: 430,
      protein: 39,
      carbs: 54,
      fat: 6,
      wikiTitles: ['ข้าวมันไก่', 'Hainanese chicken rice'],
      photoUrl: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=800&q=80',
      youtubeQuery: 'กินข้าวมันไก่ยังไงไม่ให้อ้วน ลดน้ำหนัก',
      tip: 'เปลี่ยนจากข้าวมันเป็นข้าวสวยธรรมดาและสั่งเนื้ออกไม่เอาหนัง แคลอรี่หายไปเกือบครึ่งจานทันที'
    },
    {
      id: 'l4',
      emoji: '🥩',
      name: 'สเต็กอกไก่ย่างพริกไทยดำ + มันหวานญี่ปุ่นเผา + สลัดผัก',
      tag: 'เติมไกลโคเจนเตรียมซ้อมเย็น',
      kcal: 490,
      protein: 45,
      carbs: 56,
      fat: 9,
      wikiTitles: ['Chicken breast', 'สเต๊ก', 'Roasted sweet potato'],
      photoUrl: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=800&q=80',
      youtubeQuery: 'สเต็กอกไก่คลีน นุ่มไม่ฝืดคอ วิธีทำ',
      tip: 'คาร์โบไฮเดรตเชิงซ้อนจากมันหวานช่วยให้มีแรงยกเวทและเดินชันในช่วงเย็นได้เต็มประสิทธิภาพ'
    }
  ],
  dinner: [
    {
      id: 'd1',
      emoji: '🥗',
      name: 'ลาบอกไก่สับสมุนไพร (ไม่ใส่หนังหมู) + ผักสด + ข้าวกล้องครึ่งทัพพี',
      tag: 'มื้อเย็นลดพุง (Skinny Fat)',
      kcal: 340,
      protein: 38,
      carbs: 30,
      fat: 6,
      wikiTitles: ['ลาบ', 'Larb'],
      photoUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
      youtubeQuery: 'วิธีทำ ลาบอกไก่คลีน ลดน้ำหนัก',
      tip: 'รสจัดจ้านทานง่าย ลดข้าวในมื้อเย็นลงเหลือครึ่งทัพพีเพื่อกระตุ้นการดึงไขมันสะสมมาใช้ตอนหลับ'
    },
    {
      id: 'd2',
      emoji: '🍲',
      name: 'สุกี้น้ำอกไก่ + เต้าหู้ไข่ + วุ้นเส้นน้อยเน้นผักกาดขาวและเห็ด',
      tag: 'แคลอรี่ต่ำ / อิ่มสบายท้อง',
      kcal: 330,
      protein: 34,
      carbs: 32,
      fat: 7,
      wikiTitles: ['Thai suki', 'สุกียากี้', 'Hot pot'],
      photoUrl: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80',
      youtubeQuery: 'สุกี้น้ำอกไก่ คลีน ลดความอ้วน',
      tip: 'ตักน้ำจิ้มสุกี้ไม่เกิน 1.5 ช้อนโต๊ะ เพื่อควบคุมโซเดียมไม่ให้ตัวบวมน้ำในเช้าวันถัดไป'
    },
    {
      id: 'd3',
      emoji: '🍣',
      name: 'สเต็กปลาแซลมอนย่างเกลือ + บรอกโคลีและหน่อไม้ฝรั่งลวก',
      tag: 'ฟื้นฟูข้อต่อ & ฮอร์โมน',
      kcal: 410,
      protein: 36,
      carbs: 16,
      fat: 22,
      wikiTitles: ['Salmon as food', 'แซลมอน'],
      photoUrl: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=800&q=80',
      youtubeQuery: 'สเต็กปลาแซลมอน คลีน หม้อทอดไร้น้ำมัน',
      tip: 'กรดไขมันโอเมก้า 3 จากแซลมอนช่วยลดการอักเสบของข้อเข่าและกล้ามเนื้อหลังซ้อมเดินป่า/เวทหนัก'
    },
    {
      id: 'd4',
      emoji: '🐟',
      name: 'เมี่ยงปลาเผา / อกไก่ย่างสมุนไพร + ผักสดห่อ',
      tag: 'โปรตีนล้วน / ไฟเบอร์สูง',
      kcal: 360,
      protein: 42,
      carbs: 26,
      fat: 8,
      wikiTitles: ['ไก่ย่าง', 'Kai yang', 'Grilled fish'],
      photoUrl: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=800&q=80',
      youtubeQuery: 'เมี่ยงปลาเผา น้ำจิ้มคลีน ลดน้ำหนัก',
      tip: 'อิ่มแน่นด้วยโปรตีนจากเนื้อปลาเผาเกลือล้วนๆ และวิตามินจากผักสดหลากสี'
    }
  ],
  dessert: [
    {
      id: 's1',
      emoji: '🫐',
      name: 'กรีกโยเกิร์ตธรรมชาติ + บลูเบอร์รี่/สตรอว์เบอร์รี่ + น้ำผึ้ง 1 ช้อนชา',
      tag: 'ของหวานโปรตีนสูง / ร่อง 11 ชัด',
      kcal: 180,
      protein: 16,
      carbs: 20,
      fat: 3,
      wikiTitles: ['Strained yogurt', 'โยเกิร์ต', 'Parfait'],
      photoUrl: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=800&q=80',
      youtubeQuery: 'กรีกโยเกิร์ต ผลไม้รวม เมนูของหวานคลีน',
      tip: 'โพรไบโอติกส์สูงมาก ช่วยปรับสมดุลลำไส้ให้หน้าท้องแบนราบและหายอยากของหวานทันที'
    },
    {
      id: 's2',
      emoji: '🍫',
      name: 'บราวนี่ข้าวโอ๊ตกล้วยหอมดาร์กช็อกโกแลต (ไร้แป้งสาลี-ไร้น้ำตาล)',
      tag: 'เบเกอรี่สายฟิตเนส',
      kcal: 210,
      protein: 12,
      carbs: 28,
      fat: 6,
      wikiTitles: ['บราวนี', 'Chocolate brownie'],
      photoUrl: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=800&q=80',
      youtubeQuery: 'วิธีทำ บราวนี่ข้าวโอ๊ต กล้วยหอม คลีน ไร้แป้ง',
      tip: 'ใช้ความหวานธรรมชาติจากกล้วยหอมสุกและผงโกโก้แท้ 100% ที่มีสารต้านอนุมูลอิสระสูง'
    },
    {
      id: 's3',
      emoji: '🥭',
      name: 'พุดดิ้งเมล็ดเจียนมอัลมอนด์ + มะม่วงสุกหั่นเต๋า',
      tag: 'ซูเปอร์ฟู้ด / อิ่มท้องนาน',
      kcal: 195,
      protein: 8,
      carbs: 24,
      fat: 7,
      wikiTitles: ['พุดดิ้ง', 'Pudding', 'Chia seed'],
      photoUrl: 'https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?auto=format&fit=crop&w=800&q=80',
      youtubeQuery: 'วิธีทำ พุดดิ้งเมล็ดเจีย Chia pudding ลดน้ำหนัก',
      tip: 'เมล็ดเจียพองตัวดูดซับน้ำได้ดีเยี่ยม ให้ทั้งไฟเบอร์และโอเมก้า 3 จากพืช'
    },
    {
      id: 's4',
      emoji: '🍮',
      name: 'เฉาก๊วยเนื้อหนึบในนมสด High-Protein (ไม่ใส่น้ำเชื่อม)',
      tag: 'ของหวานคลายร้อน / โปรตีนแน่น',
      kcal: 220,
      protein: 28,
      carbs: 22,
      fat: 2,
      wikiTitles: ['เฉาก๊วย', 'Grass jelly'],
      photoUrl: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=800&q=80',
      youtubeQuery: 'เฉาก๊วย นมโปรตีนสูง เมนูคลีนเซเว่น',
      tip: 'นำเนื้อเฉาก๊วยล้วนมาเทใส่นมโปรตีนสูงรสจืดหรือรสช็อกโกแลต ได้ทั้งความสดชื่นและโปรตีนเกือบ 30 กรัม!'
    }
  ],
  beverage: [
    {
      id: 'v1',
      emoji: '☕',
      name: 'อเมริกาโน่เย็นไม่ใส่น้ำตาล (Iced Black Americano • Pre-Workout)',
      tag: 'เร่งการเผาผลาญไขมันก่อนซ้อม',
      kcal: 15,
      protein: 1,
      carbs: 2,
      fat: 0,
      wikiTitles: ['อเมริกาโน', 'Caffè Americano', 'Iced coffee'],
      photoUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80',
      youtubeQuery: 'ดื่มกาแฟดำ อเมริกาโน่ ก่อนออกกำลังกาย ลดไขมัน',
      tip: 'ดื่มก่อนเริ่มเล่นเวทหรือเดินชัน 30 นาที คาเฟอีนจะช่วยกระตุ้นระบบประสาทและดึงกรดไขมันอิสระออกมาเผาผลาญเพิ่มขึ้น 15-20%'
    },
    {
      id: 'v2',
      emoji: '🧋',
      name: 'ชาใต้ชักเข้มข้นสูตรลีน (ใบชาใต้แท้ + นมโปรตีนสูง + หญ้าหวาน)',
      tag: 'เข้มข้นหอมชาใต้ / ไร้น้ำตาลและครีมเทียม',
      kcal: 140,
      protein: 24,
      carbs: 8,
      fat: 1,
      wikiTitles: ['ชาไทย', 'Thai tea', 'Teh tarik'],
      photoUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=800&q=80',
      youtubeQuery: 'วิธีชง ชาไทยคลีน ชาใต้ โปรตีนสูง ไม่ใส่น้ำตาลข้นหวาน',
      tip: 'สกัดน้ำชาใต้เข้มข้นแล้วเติมนม High-Protein แทนครีมเทียมและนมข้นหวาน ได้รสชาใต้แท้ๆ แบบไม่พังตารางลีน!'
    },
    {
      id: 'v3',
      emoji: '🍋',
      name: 'ชาดำเย็นมะนาวสด (Iced Fresh Lemon Tea • หญ้าหวาน/อิริทริทอล)',
      tag: 'สดชื่นหลังคาร์ดิโอ / ลดบวมน้ำ',
      kcal: 25,
      protein: 0,
      carbs: 6,
      fat: 0,
      wikiTitles: ['ชามะนาว', 'Iced tea'],
      photoUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=800&q=80',
      youtubeQuery: 'วิธีชง ชามะนาว สูตรคีโต คลีน ไม่มีน้ำตาล',
      tip: 'วิตามินซีจากมะนาวสดช่วยลดฮอร์โมนความเครียด (Cortisol) หลังออกกำลังกายหนัก และช่วยให้สดชื่นทันที'
    },
    {
      id: 'v4',
      emoji: '🥤',
      name: 'เวย์โปรตีนไอโซเลทปั่นกล้วยหอมและเนยถั่วคลีน (Post-Workout Shake)',
      tag: 'ซ่อมแซมกล้ามเนื้อหลังยกเวททันที',
      kcal: 280,
      protein: 34,
      carbs: 26,
      fat: 4,
      wikiTitles: ['Smoothie', 'สมูทตี้', 'Milkshake'],
      photoUrl: 'https://images.unsplash.com/photo-1577805947697-89e18249d767?auto=format&fit=crop&w=800&q=80',
      youtubeQuery: 'วิธีปั่น เวย์โปรตีน กล้วยหอม อร่อยสร้างกล้าม',
      tip: 'ดื่มภายใน 30-45 นาทีหลังจบเซ็ตสุดท้าย เพื่อส่งกรดอะมิโนเข้าซ่อมแซมเส้นใยกล้ามเนื้อได้เร็วที่สุด'
    }
  ]
}

export default function MealPlannerWidget({ profile, activeBurnKcal = 0, workoutMins = 0 }) {
  const [selectedIdx, setSelectedIdx] = useState({
    breakfast: 0,
    lunch: 0,
    dinner: 0,
    dessert: 0,
    beverage: 0
  })

  const bioMetrics = calculateScientificBiometrics(profile)
  const targetMacros = calculateDailyMacrosAndHydration(profile, bioMetrics, activeBurnKcal, workoutMins)

  const currentBreakfast = THAI_FITNESS_MEALS_DB.breakfast[selectedIdx.breakfast]
  const currentLunch = THAI_FITNESS_MEALS_DB.lunch[selectedIdx.lunch]
  const currentDinner = THAI_FITNESS_MEALS_DB.dinner[selectedIdx.dinner]
  const currentDessert = THAI_FITNESS_MEALS_DB.dessert[selectedIdx.dessert]
  const currentBeverage = THAI_FITNESS_MEALS_DB.beverage[selectedIdx.beverage]

  const selectedMealsList = [
    { slot: 'breakfast', title: '🌅 1. มื้อเช้า (Breakfast)', badgeColor: 'bg-amber-500 text-slate-950', item: currentBreakfast },
    { slot: 'lunch', title: '☀️ 2. มื้อกลางวัน (Lunch)', badgeColor: 'bg-emerald-500 text-slate-950', item: currentLunch },
    { slot: 'dinner', title: '🌙 3. มื้อเย็น (Dinner)', badgeColor: 'bg-indigo-500 text-white', item: currentDinner },
    { slot: 'dessert', title: '🍮 4. ของหวานคลีน & ขนมทานเล่น (Healthy Dessert)', badgeColor: 'bg-pink-500 text-white', item: currentDessert },
    { slot: 'beverage', title: '☕ 5. เครื่องดื่มฟิตเนส & คาเฟอีนบูสต์ (Beverages)', badgeColor: 'bg-sky-500 text-slate-950', item: currentBeverage }
  ]

  // คำนวณผลรวมโภชนาการของทั้ง 5 หมวด
  const basePlanTotals = selectedMealsList.reduce(
    (acc, cur) => ({
      kcal: acc.kcal + cur.item.kcal,
      protein: acc.protein + cur.item.protein,
      carbs: acc.carbs + cur.item.carbs,
      fat: acc.fat + cur.item.fat
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  )

  // ปรับตัวคูณขนาดพอร์ชันให้สอดคล้องกับพลังงานเป้าหมายของโปรไฟล์ผู้ใช้
  const portionScale = Number(
    Math.max(0.8, Math.min(1.5, targetMacros.dynamicTargetKcal / (basePlanTotals.kcal || 1650))).toFixed(2)
  )

  const handleCycleMeal = (slotKey) => {
    const listLength = THAI_FITNESS_MEALS_DB[slotKey].length
    setSelectedIdx(prev => ({
      ...prev,
      [slotKey]: (prev[slotKey] + 1) % listLength
    }))
  }

  const handleRandomizeDailySet = () => {
    setSelectedIdx({
      breakfast: Math.floor(Math.random() * THAI_FITNESS_MEALS_DB.breakfast.length),
      lunch: Math.floor(Math.random() * THAI_FITNESS_MEALS_DB.lunch.length),
      dinner: Math.floor(Math.random() * THAI_FITNESS_MEALS_DB.dinner.length),
      dessert: Math.floor(Math.random() * THAI_FITNESS_MEALS_DB.dessert.length),
      beverage: Math.floor(Math.random() * THAI_FITNESS_MEALS_DB.beverage.length)
    })
  }

  return (
    <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 text-[10px] font-black text-white bg-emerald-600 rounded uppercase">
              5-COURSE SMART THAI NUTRITION
            </span>
            <h2 className="text-lg font-extrabold text-slate-900">
              ตารางแนะนำเมนูอาหาร 5 หมวดหมู่พร้อมภาพจริง & คลิปสอนทำบน YouTube
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            ครอบคลุม <strong>มื้อเช้า • มื้อกลางวัน • มื้อเย็น • ของหวานคลีน • เครื่องดื่ม</strong> ปรับสัดส่วนปริมาณ (×{portionScale} เท่า) ตามเป้าหมาย <strong>{profile?.goal || 'Body Recomposition'}</strong> ของคุณอัตโนมัติ
          </p>
        </div>

        <button
          type="button"
          onClick={handleRandomizeDailySet}
          className="px-5 py-2.5 text-xs font-extrabold text-white bg-slate-900 rounded-2xl hover:bg-emerald-700 transition shrink-0 shadow-sm"
        >
          🎲 สุ่มจัดเซ็ตอาหาร + ของหวาน + เครื่องดื่มใหม่ทั้งวัน
        </button>
      </div>

      {/* แถบสรุปสารอาหารรวมทั้ง 5 หมวด เทียบกับเป้าหมายรายวัน */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 p-4 bg-slate-900 text-white rounded-2xl">
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase">พลังงานรวมทั้ง 5 หมวด</span>
          <div className="text-lg font-black text-orange-400">
            {Math.round(basePlanTotals.kcal * portionScale).toLocaleString()} / {targetMacros.dynamicTargetKcal.toLocaleString()} kcal
          </div>
        </div>
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase">โปรตีนรวม (Protein)</span>
          <div className="text-lg font-black text-indigo-300">
            {Math.round(basePlanTotals.protein * portionScale)}g / เป้า {targetMacros.proteinGrams}g
          </div>
        </div>
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase">คาร์บรวม (Carbs)</span>
          <div className="text-lg font-black text-emerald-400">
            {Math.round(basePlanTotals.carbs * portionScale)}g / เป้า {targetMacros.carbGrams}g
          </div>
        </div>
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase">น้ำดื่มที่ต้องดื่มวันนี้</span>
          <div className="text-lg font-black text-sky-400">
            💧 {targetMacros.totalWaterLiters} ลิตร/วัน
          </div>
        </div>
      </div>

      {/* การ์ดแสดงเมนูอาหาร ของหวาน และเครื่องดื่มครบ 5 หมวด พร้อมภาพถ่ายจริงและลิงก์ YouTube */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {selectedMealsList.map(({ slot, title, badgeColor, item }) => {
          const isBeverageOrDessert = slot === 'beverage' || slot === 'dessert'
          const scaleToUse = isBeverageOrDessert ? 1 : portionScale

          const scaledKcal = Math.round(item.kcal * scaleToUse)
          const scaledProt = Math.round(item.protein * scaleToUse)
          const scaledCarb = Math.round(item.carbs * scaleToUse)
          const scaledFat = Math.round(item.fat * scaleToUse)

          const youtubeUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(item.youtubeQuery)}`
          const googleImgUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(item.name)}`

          return (
            <div
              key={slot}
              className="flex flex-col justify-between bg-slate-50/90 border border-slate-200 rounded-3xl overflow-hidden shadow-2xs hover:border-emerald-500 transition"
            >
              <div>
                {/* ภาพถ่ายเมนูอาหาร/เครื่องดื่มจริงจากสารานุกรม Wikipedia */}
                <MealPhotoBanner
                  item={item}
                  title={title}
                  badgeColor={badgeColor}
                  scaledKcal={scaledKcal}
                  onCycle={() => handleCycleMeal(slot)}
                />

                {/* รายละเอียดเมนูและเคล็ดลับ */}
                <div className="p-4 space-y-2.5">
                  <h3 className="text-sm font-black text-slate-900 leading-snug">{item.name}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    💡 <strong>เคล็ดลับสายฟิต:</strong> {item.tip}
                  </p>
                </div>
              </div>

              {/* แถบสารอาหารและปุ่มลิงก์ YouTube / Google Images */}
              <div className="p-4 pt-3 bg-white border-t border-slate-200/80 space-y-3">
                <div className="grid grid-cols-3 gap-1.5 text-center text-[11px] font-bold">
                  <div className="py-1 px-2 bg-indigo-50 text-indigo-800 border border-indigo-200 rounded-lg">
                    โปรตีน {scaledProt}g
                  </div>
                  <div className="py-1 px-2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg">
                    คาร์บ {scaledCarb}g
                  </div>
                  <div className="py-1 px-2 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg">
                    ไขมัน {scaledFat}g
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2 px-3 text-center text-xs font-extrabold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition shadow-2xs"
                  >
                    ▶ ดูวิธีทำบน YouTube
                  </a>
                  <a
                    href={googleImgUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2 px-3 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition"
                    title="ดูรูปภาพเพิ่มเติมจาก Google"
                  >
                    🖼️ รูป
                  </a>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}