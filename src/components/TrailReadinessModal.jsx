import { useState, useEffect } from 'react'
import {
  evaluateTrailExpeditionReadiness,
  buildTrailWorkoutForPark,
  THAI_FOREST_EXPEDITIONS_30
} from '../utils/workoutEngine'
import ForestryAcademicHub from './ForestryAcademicHub'

// ============================================================================
// WIKIPEDIA REAL PARK PHOTO RESOLVER (ดึงภาพสถานที่จริงจากสารานุกรม Wikipedia)
// ============================================================================
const parkPhotoCache = {}

async function fetchRealParkPhotoFromWiki(parkName = '', province = '', wikiTitles = []) {
  if (!parkName && (!wikiTitles || wikiTitles.length === 0)) return null
  const cleanTitle = String(parkName)
    .replace(/^\d+\.\s*/, '')
    .split('(')[0]
    .trim()

  const searchCandidates = [
    ...(Array.isArray(wikiTitles) ? wikiTitles : []),
    cleanTitle,
    cleanTitle.replace('ยอดเขา', '').replace('ดอย', 'อุทยานแห่งชาติดอย').trim(),
    `อุทยานแห่งชาติ${cleanTitle.replace('อุทยานแห่งชาติ', '').trim()}`,
    `${cleanTitle} ${String(province || '').split('-')[0].trim()}`
  ]

  for (const query of searchCandidates) {
    if (!query) continue
    if (parkPhotoCache[query]) return parkPhotoCache[query]

    const isThai = /[\u0E00-\u0E7F]/.test(query)
    const lang = isThai ? 'th' : 'en'

    try {
      const directRes = await fetch(
        `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`
      )
      if (directRes.ok) {
        const dData = await directRes.json()
        const img = dData?.originalimage?.source || dData?.thumbnail?.source
        if (img && !img.toLowerCase().match(/\.(svg)$|logo|map|emblem|seal|locator/)) {
          parkPhotoCache[query] = img
          return img
        }
      }

      const searchUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=2&prop=pageimages&piprop=thumbnail&pithumbsize=1000&format=json&origin=*`
      const sRes = await fetch(searchUrl)
      if (sRes.ok) {
        const sData = await sRes.json()
        const pages = sData?.query?.pages
        if (pages) {
          for (const p of Object.values(pages)) {
            const thumb = p?.thumbnail?.source
            if (thumb && !thumb.toLowerCase().match(/\.(svg)$|logo|map|emblem|seal|locator/)) {
              parkPhotoCache[query] = thumb
              return thumb
            }
          }
        }
      }
    } catch {
      // ข้ามไปคำค้นถัดไปหากติดปัญหาเครือข่าย
    }
  }
  return null
}

// Helper แสดงป้ายประเภทรถและการเข้าถึง (ไม่มีคำว่า Celerio และแยกครบ 3 โหมดพาหนะ)
function getVehicleBadgeMeta(vehicleAccess = 'sedan') {
  if (vehicleAccess === 'sedan') {
    return {
      icon: '🚗',
      shortLabel: 'รถเก๋ง / Eco Car ขับถึง',
      badgeClass: 'text-emerald-300 bg-emerald-950/80 border-emerald-500/50',
      bannerClass: 'bg-emerald-950/70 border-emerald-600/60 text-emerald-200',
      titlePrefix: '✅ รถเก๋ง / Eco Car ขับถึงจุดเริ่มเดิน:'
    }
  }
  if (vehicleAccess === '4x4') {
    return {
      icon: '🛻',
      shortLabel: 'รถกระบะ / 4WD ขับเคลื่อน 4 ล้อ',
      badgeClass: 'text-amber-300 bg-amber-950/80 border-amber-500/50',
      bannerClass: 'bg-amber-950/70 border-amber-600/60 text-amber-200',
      titlePrefix: '🛻 ต้องใช้รถกระบะยกสูง / 4WD:'
    }
  }
  return {
    icon: '🚤',
    shortLabel: 'ต่อเรือ / รถไฟ / เดินเท้าขึ้นภู',
    badgeClass: 'text-sky-300 bg-sky-950/80 border-sky-500/50',
    bannerClass: 'bg-sky-950/70 border-sky-600/60 text-sky-200',
    titlePrefix: '🚤 จอดรถจุดบริการ แล้วต่อเรือ/รถไฟ/เดินเท้า:'
  }
}

// ============================================================================
// SUB-COMPONENT: กราฟภูเขาพร้อมภาพสถานที่จริงจาก Wikipedia + ป้ายจัดเรียงไม่ซ้อนทับกัน
// ============================================================================
function ParkElevationVisual({ park, isSelected = false }) {
  const [realParkImg, setRealParkImg] = useState(null)
  const [hideGraphOverlay, setHideGraphOverlay] = useState(false)

  const safeName = park?.name || 'อุทยานแห่งชาติไทย'
  const safeProvince = park?.province || ''
  const elevationM = Number(park?.elevationM) || 1000
  const distanceKm = Number(park?.distanceKm) || 5
  const avgInclinePct = Number(park?.avgInclinePct) || 8.0
  const overallScore = Number(park?.overallScore ?? park?.overallReadyPct) || 50

  useEffect(() => {
    let active = true
    fetchRealParkPhotoFromWiki(safeName, safeProvince, park?.wikiTitles).then(url => {
      if (active) setRealParkImg(url)
    })
    return () => {
      active = false
    }
  }, [safeName, safeProvince, park?.wikiTitles])

  const elevRatio = Math.min(1, Math.max(0.22, elevationM / 2600))
  // ยกฐานกราฟขึ้นเมื่ออยู่ในโหมดรายละเอียด (isSelected) เพื่อไม่ให้ป้าย 2 แถวด้านล่างบังเส้นภูเขา
  const baseY = isSelected ? 74 : 90
  const maxClimbHeight = isSelected ? 46 : 62
  const peakY = Math.round(baseY - elevRatio * maxClimbHeight)

  const readinessPct = Math.min(100, Math.max(5, overallScore))
  const hikerX = Math.round(16 + (readinessPct / 100) * 168)
  const hikerY = Math.round(baseY - (readinessPct / 100) * (baseY - peakY))
  const achievedDistanceKm = Number(((distanceKm * readinessPct) / 100).toFixed(1))
  const achievedElevationM = Math.round((elevationM * readinessPct) / 100)

  const strokeColor =
    park?.difficulty === 'Advanced'
      ? '#f43f5e'
      : park?.difficulty === 'Intermediate'
        ? '#f59e0b'
        : '#10b981'

  const googleImgSearchUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(safeName + ' ' + safeProvince + ' เดินป่า')}`
  const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent('เดินป่า ' + safeName)}`

  return (
    <div
      className={`relative w-full ${
        isSelected ? 'h-72 sm:h-80' : 'h-36'
      } bg-slate-950 rounded-2xl overflow-hidden border border-emerald-800/60 shadow-inner select-none`}
    >
      {realParkImg && (
        <img
          src={realParkImg}
          alt={safeName}
          className={`absolute inset-0 w-full h-full object-cover object-center transition duration-500 ${
            hideGraphOverlay ? 'opacity-100 scale-105' : isSelected ? 'opacity-65' : 'opacity-50'
          }`}
        />
      )}
      {!hideGraphOverlay && (
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/35 to-slate-950/65" />
      )}

      {/* แถบปุ่มด้านบนของกราฟ */}
      <div className="absolute top-2.5 left-3 right-3 flex flex-wrap items-center justify-between gap-1.5 z-20">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="px-2.5 py-1 text-[11px] sm:text-xs font-black bg-slate-950/90 text-emerald-300 rounded-lg border border-emerald-500/50 shadow-sm">
            ⛰️ ความสูง {elevationM.toLocaleString()} ม. • ชันเฉลี่ย {avgInclinePct}%
          </span>
          {realParkImg && isSelected && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setHideGraphOverlay(prev => !prev)
              }}
              className="px-2.5 py-1 text-[11px] sm:text-xs font-extrabold text-white bg-emerald-700/95 hover:bg-emerald-600 rounded-lg border border-emerald-400 shadow-sm transition"
            >
              {hideGraphOverlay ? '📈 แสดงกราฟความชัน' : '📸 ดูภาพจริงเต็มจอ'}
            </button>
          )}
        </div>

        {isSelected && (
          <div className="flex items-center gap-1.5">
            <a
              href={googleImgSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="px-2.5 py-1 text-[11px] font-extrabold bg-amber-400 text-slate-950 rounded-lg hover:bg-amber-300 transition shadow-sm"
            >
              🖼️ ภาพจริง Google
            </a>
            <a
              href={youtubeSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="px-2.5 py-1 text-[11px] font-extrabold bg-rose-600 text-white rounded-lg hover:bg-rose-500 transition shadow-sm"
            >
              ▶ คลิป YouTube
            </a>
          </div>
        )}
      </div>

      {!hideGraphOverlay && (
        <>
          <svg viewBox="0 0 220 115" preserveAspectRatio="none" className="relative z-10 w-full h-full">
            <defs>
              <linearGradient id={`grad-${park?.id || 'default'}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={strokeColor} stopOpacity="0.45" />
                <stop offset="100%" stopColor="#022c22" stopOpacity="0.08" />
              </linearGradient>
            </defs>

            <polygon
              points={`16,${baseY} 75,${peakY + 18} 128,${peakY + 7} 184,${peakY} 206,${baseY}`}
              fill={`url(#grad-${park?.id || 'default'})`}
              stroke={strokeColor}
              strokeWidth="2"
              strokeLinejoin="round"
            />

            <line
              x1="16"
              y1={baseY}
              x2="184"
              y2={peakY}
              stroke="#e2e8f0"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />

            <line
              x1="16"
              y1={baseY}
              x2={hikerX}
              y2={hikerY}
              stroke="#fbbf24"
              strokeWidth="3.5"
              strokeLinecap="round"
            />

            <circle cx="16" cy={baseY} r="3.5" fill="#10b981" stroke="#0f172a" strokeWidth="1.5" />
            <circle cx="184" cy={peakY} r="4.5" fill={strokeColor} stroke="#ffffff" strokeWidth="1.5" />
            <circle cx={hikerX} cy={hikerY} r="5.5" fill="#fbbf24" stroke="#0f172a" strokeWidth="2" />
          </svg>

          {isSelected ? (
            /* จัดเรียงป้ายด้านล่างเป็น 2 แถวแยกกันชัดเจน ไม่ซ้อนทับกันในทุกขนาดหน้าจอ */
            <div className="absolute bottom-2.5 left-3 right-3 z-20 flex flex-col gap-1.5 pointer-events-none">
              <div className="flex items-center justify-between gap-2">
                <span className="px-2.5 py-1 text-[11px] font-extrabold text-emerald-200 bg-slate-950/90 border border-emerald-700/70 rounded-lg shadow-sm">
                  🚩 เริ่มเดิน: 0 กม.
                </span>
                <span className="px-2.5 py-1 text-[11px] font-extrabold text-rose-200 bg-rose-950/90 border border-rose-500/60 rounded-lg shadow-sm">
                  ⛰️ ยอดเขา: {distanceKm} กม. ({elevationM.toLocaleString()} ม.)
                </span>
              </div>

              <div className="w-full px-3 py-1.5 text-center text-xs sm:text-sm font-black text-amber-300 bg-slate-950/95 border-2 border-amber-400 rounded-xl shadow-lg">
                ⚡ คุณพร้อมปีนถึงจุดนี้: {overallScore}% (~{achievedDistanceKm} กม. • ระดับ {achievedElevationM.toLocaleString()} ม.)
              </div>
            </div>
          ) : (
            <div className="absolute bottom-2 left-2.5 right-2.5 z-20 flex items-center justify-between pointer-events-none">
              <span className="px-2 py-0.5 text-[11px] font-bold text-slate-200 bg-slate-950/85 rounded-md">
                ระยะ {distanceKm} กม.
              </span>
              <span className="px-2 py-0.5 text-[11px] font-black text-amber-300 bg-slate-950/90 border border-amber-400/50 rounded-md">
                พร้อม {overallScore}%
              </span>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function TrailReadinessModal({
  isOpen = true,
  onClose,
  profile,
  allHistoricalLogs = [],
  onSelectTrailWorkout,
  onSelectTrailProgram,
  inlineMode = false,
  isEmbedded = false
}) {
  const [mainTab, setMainTab] = useState('readiness')
  const [regionFilter, setRegionFilter] = useState('All')
  const [difficultyFilter, setDifficultyFilter] = useState('All')
  // ตัวกรองโหมดพาหนะ: 'All' | 'sedan' | '4x4' | 'boat_walk'
  const [vehicleFilter, setVehicleFilter] = useState('All')
  const [selectedParkId, setSelectedParkId] = useState(null)

  if (isOpen === false) return null

  let trailReport = null
  try {
    trailReport = evaluateTrailExpeditionReadiness({
      profile: profile || {},
      allHistoricalLogs: Array.isArray(allHistoricalLogs) ? allHistoricalLogs : []
    })
  } catch (err) {
    console.error('Trail readiness evaluation error:', err)
  }

  const safeParkList =
    Array.isArray(trailReport?.parkEvaluations) && trailReport.parkEvaluations.length > 0
      ? trailReport.parkEvaluations
      : Array.isArray(THAI_FOREST_EXPEDITIONS_30)
        ? THAI_FOREST_EXPEDITIONS_30.map(p => evaluateTrailExpeditionReadiness(p, profile, allHistoricalLogs))
        : []

  const safeUserMetrics = {
    cardioDistance14d: Number(trailReport?.userMetrics?.cardioDistance14d) || 0,
    cardioMins14d: Number(trailReport?.userMetrics?.cardioMins14d) || 0,
    maxIncline14d: Number(trailReport?.userMetrics?.maxIncline14d) || 0,
    legSets14d: Number(trailReport?.userMetrics?.legSets14d) || 0,
    legVolume14d: Number(trailReport?.userMetrics?.legVolume14d) || 0,
    coreBackSets14d: Number(trailReport?.userMetrics?.coreBackSets14d) || 0
  }

  // นับจำนวนอุทยานในแต่ละโหมดพาหนะเพื่อแสดงบนปุ่มกรอง
  const vehicleCounts = {
    All: safeParkList.length,
    sedan: safeParkList.filter(p => p?.vehicleAccess === 'sedan').length,
    '4x4': safeParkList.filter(p => p?.vehicleAccess === '4x4').length,
    boat_walk: safeParkList.filter(p => p?.vehicleAccess === 'boat_walk').length
  }

  const filteredParks = safeParkList.filter(p => {
    if (!p) return false
    const regStr = String(p.region || '')
    const matchRegion =
      regionFilter === 'All' ||
      (regionFilter === 'ภาคใต้'
        ? regStr.includes('ภาคใต้') || regStr.includes('ภาคตะวันออก')
        : regionFilter === 'ภาคตะวันตก'
          ? regStr.includes('ภาคตะวันตก') || regStr.includes('ภาคกลาง')
          : regStr.includes(regionFilter))
    const matchDiff = difficultyFilter === 'All' || p.difficulty === difficultyFilter
    const matchVehicle = vehicleFilter === 'All' || p.vehicleAccess === vehicleFilter
    return matchRegion && matchDiff && matchVehicle
  })

  const activePark =
    filteredParks.find(p => p.id === selectedParkId) ||
    filteredParks[0] ||
    safeParkList.find(p => p.id === selectedParkId) ||
    safeParkList[0] ||
    null

  const getBadgeStyle = (score) => {
    const s = Number(score) || 0
    if (s >= 80) return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
    if (s >= 55) return 'bg-amber-500/20 text-amber-300 border-amber-500/40'
    return 'bg-rose-500/20 text-rose-300 border-rose-500/40'
  }

  const handleLoadParkWorkout = (park) => {
    if (!park) return
    const generatedItems = buildTrailWorkoutForPark(park, profile, allHistoricalLogs)
    if (typeof onSelectTrailProgram === 'function') {
      onSelectTrailProgram(generatedItems)
    } else if (typeof onSelectTrailWorkout === 'function') {
      onSelectTrailWorkout(generatedItems)
    }
    if (typeof onClose === 'function') onClose()
  }

  const isEmbeddedView = inlineMode || isEmbedded || typeof onClose !== 'function'
  const activeVehicleMeta = getVehicleBadgeMeta(activePark?.vehicleAccess)

  const contentBox = (
    <div
      className={`flex flex-col w-full ${
        isEmbeddedView ? '' : 'max-w-6xl max-h-[92vh]'
      } bg-gradient-to-br from-stone-950 via-emerald-950 to-slate-950 text-white border border-emerald-800/60 rounded-3xl shadow-2xl overflow-hidden`}
    >
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 bg-slate-950/90 border-b border-emerald-800/50">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-11 h-11 text-2xl rounded-2xl bg-emerald-500/20 border border-emerald-400/40">
            🏔️
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 text-[10px] font-black tracking-wider text-emerald-950 bg-emerald-400 rounded-md uppercase">
                THAI NATIONAL PARK EXPEDITION & FORESTRY CENTER
              </span>
              <span className="px-2.5 py-0.5 text-[10px] font-bold text-amber-300 bg-amber-950/80 border border-amber-500/40 rounded-md">
                30 เส้นทางเดินป่าไทย (ดึงภาพสถานที่จริงจาก Wikipedia)
              </span>
            </div>
            <h2 className="text-lg font-black text-white mt-0.5">
              ศูนย์ประเมินความพร้อมเดินป่า 30 อุทยาน & ฐานข้อมูลการเดินทางจากกรุงเทพฯ
            </h2>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex p-1 bg-slate-900 border border-emerald-800/60 rounded-2xl">
            <button
              type="button"
              onClick={() => setMainTab('readiness')}
              className={`px-3.5 py-1.5 text-xs font-extrabold rounded-xl transition ${
                mainTab === 'readiness'
                  ? 'bg-emerald-500 text-slate-950 shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              🥾 1. ประเมินความพร้อม & วิธีเดินทาง (30 แห่ง)
            </button>
            <button
              type="button"
              onClick={() => setMainTab('academic')}
              className={`px-3.5 py-1.5 text-xs font-extrabold rounded-xl transition ${
                mainTab === 'academic'
                  ? 'bg-amber-400 text-slate-950 shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              🌿 2. คลังรุกขวิทยา & สัตว์ป่า (ภาพจริง Wikipedia)
            </button>
          </div>

          {typeof onClose === 'function' && (
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-sm font-bold text-slate-300 bg-slate-900 border border-slate-700 rounded-xl hover:bg-rose-600 hover:text-white transition"
            >
              ✕ ปิด
            </button>
          )}
        </div>
      </div>

      {/* Body Content */}
      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        {mainTab === 'academic' ? (
          <ForestryAcademicHub />
        ) : (
          <>
            {/* แถบสรุปสถิติการซ้อม 14 วันล่าสุด */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="p-4 bg-slate-900/90 border border-emerald-800/50 rounded-2xl">
                <span className="text-[11px] font-bold text-emerald-400 uppercase">1. ระยะเดินชันสะสม (14 วัน)</span>
                <div className="mt-1 text-2xl font-black text-white">
                  {safeUserMetrics.cardioDistance14d} <span className="text-xs font-normal text-slate-400">กม.</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">เวลาคาร์ดิโอรวม {safeUserMetrics.cardioMins14d} นาที</p>
              </div>

              <div className="p-4 bg-slate-900/90 border border-emerald-800/50 rounded-2xl">
                <span className="text-[11px] font-bold text-amber-400 uppercase">2. ความชันลู่วิ่งสูงสุดที่ซ้อม</span>
                <div className="mt-1 text-2xl font-black text-amber-300">
                  Incline {safeUserMetrics.maxIncline14d}%
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">เทียบเท่าการเดินไต่สันเขาจริง</p>
              </div>

              <div className="p-4 bg-slate-900/90 border border-emerald-800/50 rounded-2xl">
                <span className="text-[11px] font-bold text-sky-400 uppercase">3. ความแข็งแรงขาและเข่า</span>
                <div className="mt-1 text-2xl font-black text-sky-300">
                  {safeUserMetrics.legSets14d} <span className="text-xs font-normal text-slate-400">เซ็ต</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">Volume ขา {safeUserMetrics.legVolume14d.toLocaleString()} kg</p>
              </div>

              <div className="p-4 bg-slate-900/90 border border-emerald-800/50 rounded-2xl">
                <span className="text-[11px] font-bold text-purple-400 uppercase">4. เกราะหลังและแกนกลางแบกเป้</span>
                <div className="mt-1 text-2xl font-black text-purple-300">
                  {safeUserMetrics.coreBackSets14d} <span className="text-xs font-normal text-slate-400">เซ็ต</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">รองรับการแบกเป้ 10-15 kg เดินไกล</p>
              </div>
            </div>

            {/* การ์ดเจาะลึกรายละเอียดของอุทยานที่กำลังเลือก */}
            {activePark && (
              <div className="p-6 bg-slate-900/95 border-2 border-emerald-500/60 rounded-3xl shadow-xl space-y-5">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
                  
                  {/* ซ้าย: ภาพสถานที่จริง + กราฟความชัน */}
                  <div className="lg:col-span-5 space-y-3">
                    <ParkElevationVisual park={activePark} isSelected={true} />

                    <div className="grid grid-cols-3 gap-2 text-center p-3 bg-slate-950 rounded-2xl border border-slate-800">
                      <div>
                        <span className="text-[11px] text-slate-400 block">ความสูงยอดดอย</span>
                        <strong className="text-sm font-black text-emerald-400">
                          {Number(activePark.elevationM || 0).toLocaleString()} เมตร
                        </strong>
                      </div>
                      <div className="border-x border-slate-800">
                        <span className="text-[11px] text-slate-400 block">ระยะทางเดินเท้า</span>
                        <strong className="text-sm font-black text-sky-400">
                          {activePark.distanceKm || 0} กิโลเมตร
                        </strong>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 block">ความชันเฉลี่ย</span>
                        <strong className="text-sm font-black text-amber-400">
                          Incline {activePark.avgInclinePct || 8}%
                        </strong>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                      <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl">
                        <span className="text-[11px] font-bold text-sky-400 block">🌡️ สภาพภูมิอากาศและอุณหภูมิ</span>
                        <p className="text-slate-200 mt-0.5 font-medium">
                          {activePark.tempRange || '15°C - 26°C • อากาศเย็นสบาย'}
                        </p>
                      </div>
                      <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl">
                        <span className="text-[11px] font-bold text-emerald-400 block">🌿 สังคมพืชและพรรณไม้เด่น</span>
                        <p className="text-slate-200 mt-0.5 font-medium">
                          {activePark.dendrology || activePark.forestType}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* ขวา: ข้อมูลภูมิประเทศ การเดินทางจาก กทม. และคะแนนความพร้อมรายมัดกล้ามเนื้อ */}
                  <div className="lg:col-span-7 space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">
                          TRAIL TOPOGRAPHY & BANGKOK TRAVEL GUIDE
                        </span>
                        <h3 className="text-xl font-black text-white mt-0.5">
                          {activePark.name} ({activePark.province})
                        </h3>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-3 py-1 text-xs font-extrabold border rounded-full ${getBadgeStyle(activePark.overallScore)}`}>
                          {activePark.region} • พร้อมแล้ว {activePark.overallScore}%
                        </span>
                        {activePark.remainingGapPct > 0 && (
                          <span className="px-3 py-1 text-xs font-black text-amber-300 bg-amber-950/90 border border-amber-500/50 rounded-full">
                            เหลืออีก {activePark.remainingGapPct}% จะครบ 100%
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-3.5 bg-slate-950/90 border border-slate-800 rounded-2xl space-y-1.5 text-xs">
                      <div className="font-bold text-emerald-300">
                        🥾 รายละเอียดเส้นทางเดินป่าและภูมิประเทศจริง:
                      </div>
                      <p className="text-slate-200 leading-relaxed">
                        {activePark.trailDetail || `${activePark.forestType || ''} • พรรณไม้เด่น: ${activePark.dendrology || '-'}`}
                      </p>
                    </div>

                    {/* ข้อมูลการเดินทางจากกรุงเทพฯ */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
                      <div className="p-3.5 bg-sky-950/40 border border-sky-700/50 rounded-2xl space-y-1">
                        <span className="font-extrabold text-sky-300 block">
                          🚆 รถไฟ / รถทัวร์ประจำทาง (จาก กทม.):
                        </span>
                        <p className="text-slate-200 leading-relaxed">
                          {activePark.publicTransitFromBkk || `นั่งรถทัวร์จากสถานีขนส่งหมอชิต 2/สายใต้ใหม่ ลงจุดจอด จ.${activePark.province} แล้วต่อรถสองแถวท้องถิ่นเข้าจุดเริ่มเดิน`}
                        </p>
                      </div>

                      <div className="p-3.5 bg-amber-950/30 border border-amber-700/50 rounded-2xl space-y-1">
                        <span className="font-extrabold text-amber-300 block">
                          🚗 ขับรถยนต์ส่วนตัวไปเอง (จาก กทม.):
                        </span>
                        <p className="text-slate-200 leading-relaxed">
                          {activePark.drivingFromBkk || `ขับรถจาก กทม. มุ่งหน้าสู่ จ.${activePark.province} ตามทางหลวงแผ่นดินสายหลัก เข้าสู่ที่ทำการอุทยานฯ`}
                        </p>
                      </div>
                    </div>

                    {/* สถานะพาหนะและการเข้าถึงจุดเริ่มเดิน (ไม่ระบุยี่ห้อรถ) */}
                    <div className={`px-4 py-2.5 rounded-2xl border text-xs font-bold flex items-center justify-between ${activeVehicleMeta.bannerClass}`}>
                      <span>
                        {activeVehicleMeta.titlePrefix} {activePark.vehicleNote}
                      </span>
                    </div>

                    {/* บาร์ชาร์จวิเคราะห์ความพร้อมแยกตามมัดกล้ามเนื้อและปอด */}
                    <div className="p-4 bg-slate-950/90 border border-emerald-800/50 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-black text-emerald-300 uppercase">
                          📊 บาร์ชาร์จประเมินศักยภาพรายส่วนเทียบเกณฑ์ของ {activePark.name}
                        </span>
                        <span className="text-[11px] font-bold text-slate-400">
                          {activePark.isReady ? '✅ ผ่านเกณฑ์พร้อมลุย' : `⚠️ ต้องฝึกเพิ่มอีก ${activePark.remainingGapPct}%`}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {(activePark.breakdownBars || []).map(bar => (
                          <div key={bar.key} className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
                            <div className="flex items-center justify-between text-[11px] font-bold">
                              <span className="text-white truncate">{bar.label.split('(')[0]}</span>
                              <span className={bar.pct >= 80 ? 'text-emerald-400 font-black' : 'text-amber-300 font-black'}>
                                {bar.pct}% ({bar.current}/{bar.target} {bar.unit})
                              </span>
                            </div>
                            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all duration-500 ${
                                  bar.pct >= 80 ? 'bg-emerald-500' : bar.pct >= 55 ? 'bg-amber-400' : 'bg-rose-500'
                                }`}
                                style={{ width: `${bar.pct}%` }}
                              />
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {bar.missing > 0
                                ? `ขาดอีก ${bar.missing} ${bar.unit} • ${bar.advice}`
                                : '✓ กล้ามเนื้อส่วนนี้ถึงเกณฑ์มาตรฐานของอุทยานแล้ว'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      <p className="text-xs font-semibold text-amber-300 flex-1">
                        💡 <strong>คำแนะนำโค้ช:</strong> {activePark.prescriptionTip}
                      </p>
                      {(typeof onSelectTrailProgram === 'function' || typeof onSelectTrailWorkout === 'function') && (
                        <button
                          type="button"
                          onClick={() => handleLoadParkWorkout(activePark)}
                          className="px-4 py-2.5 text-xs font-black text-slate-950 bg-emerald-400 rounded-xl hover:bg-emerald-300 transition shrink-0 shadow-md"
                        >
                          ⚡ โหลดตารางซ้อมจำลองความชันอุทยานนี้
                        </button>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* ตัวกรองภูมิภาค โหมดพาหนะ 3 รูปแบบ และระดับความยากของทั้ง 30 อุทยาน */}
            <div className="p-4 bg-slate-900/85 border border-emerald-800/50 rounded-2xl space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* กรองภูมิภาค */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { id: 'All', label: `ทุกภูมิภาค (${safeParkList.length} แห่ง)` },
                    { id: 'ภาคเหนือ', label: 'ภาคเหนือ' },
                    { id: 'ภาคอีสาน', label: 'ภาคอีสาน' },
                    { id: 'ภาคตะวันตก', label: 'ภาคตะวันตก/กลาง' },
                    { id: 'ภาคใต้', label: 'ภาคใต้/ตะวันออก' }
                  ].map(reg => (
                    <button
                      key={reg.id}
                      type="button"
                      onClick={() => setRegionFilter(reg.id)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition ${
                        regionFilter === reg.id
                          ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black'
                          : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-emerald-600'
                      }`}
                    >
                      {reg.label}
                    </button>
                  ))}
                </div>

                {/* กรองความยาก */}
                <select
                  value={difficultyFilter}
                  onChange={(e) => setDifficultyFilter(e.target.value)}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-slate-950 border border-slate-700 rounded-xl outline-none"
                >
                  <option value="All">ทุกระดับความยาก</option>
                  <option value="Beginner">🟢 เดินง่าย / มือใหม่</option>
                  <option value="Intermediate">🟡 ปานกลาง</option>
                  <option value="Advanced">🔴 โหด / ไต่ระดับชันสูง</option>
                </select>
              </div>

              {/* แถบปุ่มกรองโหมดพาหนะ (กรองได้จริงครบทุกประเภทรถ) */}
              <div className="pt-2.5 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-extrabold text-emerald-300 mr-1">
                    🚘 เลือกโหมดการเดินทางเข้าจุดเริ่มเดิน:
                  </span>
                  {[
                    { id: 'All', label: `ทุกพาหนะ (${vehicleCounts.All})` },
                    { id: 'sedan', label: `🚗 รถเก๋ง / Eco Car ขับถึง (${vehicleCounts.sedan})` },
                    { id: '4x4', label: `🛻 รถกระบะ / 4WD ขับเคลื่อน 4 ล้อ (${vehicleCounts['4x4']})` },
                    { id: 'boat_walk', label: `🚤 ต่อเรือ / รถไฟ / เดินเท้า (${vehicleCounts.boat_walk})` }
                  ].map(vMode => (
                    <button
                      key={vMode.id}
                      type="button"
                      onClick={() => setVehicleFilter(vMode.id)}
                      className={`px-3 py-1.5 text-xs font-extrabold rounded-xl border transition ${
                        vehicleFilter === vMode.id
                          ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-sm'
                          : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-amber-500/60'
                      }`}
                    >
                      {vMode.label}
                    </button>
                  ))}
                </div>

                <span className="text-xs font-bold text-slate-400">
                  แสดงผลลัพธ์: <strong className="text-emerald-400">{filteredParks.length}</strong> อุทยาน
                </span>
              </div>
            </div>

            {/* Grid รายชื่อ 30 อุทยาน */}
            {filteredParks.length === 0 ? (
              <div className="p-10 text-center bg-slate-900/80 border border-slate-800 rounded-3xl space-y-3">
                <p className="text-sm font-bold text-slate-300">
                  ไม่พบอุทยานที่ตรงกับตัวกรองที่เลือกพร้อมกัน
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setRegionFilter('All')
                    setDifficultyFilter('All')
                    setVehicleFilter('All')
                  }}
                  className="px-4 py-2 text-xs font-black text-slate-950 bg-emerald-400 rounded-xl hover:bg-emerald-300"
                >
                  รีเซ็ตตัวกรองทั้งหมด (แสดง 30 อุทยาน)
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredParks.map(park => {
                  const isCurrent = activePark?.id === park.id
                  const vMeta = getVehicleBadgeMeta(park.vehicleAccess)

                  return (
                    <div
                      key={park.id || park.name}
                      onClick={() => setSelectedParkId(park.id)}
                      className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                        isCurrent
                          ? 'bg-emerald-950/80 border-2 border-emerald-400 shadow-lg'
                          : 'bg-slate-900/90 border-slate-800 hover:border-emerald-600/60'
                      }`}
                    >
                      <div>
                        <ParkElevationVisual park={park} isSelected={false} />
                        <div className="mt-3 flex items-start justify-between gap-2">
                          <h4 className="text-sm font-black text-white leading-snug">{park.name}</h4>
                          <span className={`px-2 py-0.5 text-[10px] font-extrabold border rounded-md shrink-0 ${getBadgeStyle(park.overallScore)}`}>
                            พร้อม {park.overallScore}%
                          </span>
                        </div>
                        <p className="text-[11px] text-emerald-300 font-semibold mt-0.5">
                          จ.{park.province} • ชันเฉลี่ย {park.avgInclinePct}% • ระยะ {park.distanceKm} กม.
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                          🌿 {park.forestType}
                        </p>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                        <span className={`px-2 py-0.5 rounded border font-bold ${vMeta.badgeClass}`}>
                          {vMeta.icon} {vMeta.shortLabel}
                        </span>
                        <span className="font-extrabold text-white underline">ดูรายละเอียด →</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )

  if (isEmbeddedView) {
    return contentBox
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-sm">
      {contentBox}
    </div>
  )
}