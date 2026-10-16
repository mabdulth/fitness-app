import { useState, useEffect } from 'react'

// ============================================================================
// WIKIPEDIA & WIKIMEDIA COMMONS REAL PHOTO RESOLVER
// ============================================================================
const wikiPhotoCache = {}

async function fetchRealWikiPhoto(wikiTitles = []) {
  for (const rawTitle of wikiTitles) {
    if (!rawTitle) continue
    if (wikiPhotoCache[rawTitle]) return wikiPhotoCache[rawTitle]

    const isThai = /[\u0E00-\u0E7F]/.test(rawTitle)
    const lang = isThai ? 'th' : 'en'

    try {
      const summaryUrl = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(rawTitle)}`
      const res = await fetch(summaryUrl)
      if (res.ok) {
        const data = await res.json()
        const imgUrl = data?.originalimage?.source || data?.thumbnail?.source
        
        if (imgUrl) {
          const lowerUrl = imgUrl.toLowerCase()
          if (!lowerUrl.endsWith('.svg') && 
              !lowerUrl.includes('logo') && 
              !lowerUrl.includes('seal') && 
              !lowerUrl.includes('emblem') && 
              !lowerUrl.includes('map') &&
              !lowerUrl.includes('locator')) {
            wikiPhotoCache[rawTitle] = imgUrl
            return imgUrl
          }
        }
      }

      const searchUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(rawTitle)}&gsrlimit=1&prop=pageimages&piprop=thumbnail&pithumbsize=900&format=json&origin=*`
      const sRes = await fetch(searchUrl)
      if (sRes.ok) {
        const sData = await sRes.json()
        const pages = sData?.query?.pages
        if (pages) {
          const firstPage = Object.values(pages)[0]
          const thumbUrl = firstPage?.thumbnail?.source
          if (thumbUrl) {
            const lowerThumb = thumbUrl.toLowerCase()
            if (!lowerThumb.endsWith('.svg') && 
                !lowerThumb.includes('logo') && 
                !lowerThumb.includes('seal') && 
                !lowerThumb.includes('map')) {
              wikiPhotoCache[rawTitle] = thumbUrl
              return thumbUrl
            }
          }
        }
      }
    } catch {
      //
    }
  }
  return null
}

// ============================================================================
// 1. FOREST ECOSYSTEM CLASSIFICATION MATRIX
// ============================================================================
export const THAI_FOREST_ECOSYSTEMS = [
  {
    id: 'eco-def',
    type: 'ป่าไม่ผลัดใบ (Evergreen Forest)',
    nameTh: 'ป่าดิบแล้ง (Dry Evergreen Forest - DEF)',
    wikiTitles: ['Khao Yai National Park', 'อุทยานแห่งชาติเขาใหญ่', 'Hopea ferrea'],
    elevationRange: '100 - 800 เมตร จากระดับน้ำทะเลปานกลาง',
    rainfallMm: '1,000 - 1,500 มม./ปี (มีช่วงแล้งชัดเจน 3-5 เดือน)',
    canopyStructure: 'เรือนยอดแบ่งเป็น 3 ชั้นชัดเจน (ชั้นไม้เด่น 30-45 ม., ชั้นไม้รอง 15-25 ม., ชั้นไม้พุ่มและไม้พื้นล่าง)',
    indicatorSpecies: 'ตะเคียนหิน (Hopea ferrea), ตะเคียนทอง (Hopea odorata), ยางนา (Dipterocarpus alatus), กระบก, มะค่าโมง',
    representativeSites: 'สถานีวิจัยสิ่งแวดล้อมสะแกราช (วังน้ำเขียว), ห้วยขาแข้ง, ปางสีดา, ทองผาภูมิ',
    youtubeQuery: 'นิเวศวิทยา ป่าดิบแล้ง สะแกราช วนศาสตร์'
  },
  {
    id: 'eco-trf',
    type: 'ป่าไม่ผลัดใบ (Evergreen Forest)',
    nameTh: 'ป่าดิบชื้น (Tropical Rain Forest - TRF)',
    wikiTitles: ['Khao Sok National Park', 'อุทยานแห่งชาติเขาสก', 'เขตรักษาพันธุ์สัตว์ป่าฮาลา-บาลา'],
    elevationRange: '0 - 1,000 เมตร (เน้นภาคใต้และภาคตะวันออก)',
    rainfallMm: 'มากกว่า 2,000 มม./ปี (ฝนตกชุกเกือบตลอดปี ความชื้นสัมพัทธ์สูง)',
    canopyStructure: 'เรือนยอดสูงต่อเนื่อง 4 ชั้น (ไม้ชั้นบนสูงถึง 50-60 ม. มีพูพอน Buttress root ขนาดใหญ่ และเถาวัลย์-กล้วยไม้อิงอาศัยหนาแน่น)',
    indicatorSpecies: 'ยวนผึ้ง (Koompassia excelsa), สยาขาว (Shorea leprosula), ยางยูง, ไข่เขียว (Parashorea stellata)',
    representativeSites: 'เขตรักษาพันธุ์สัตว์ป่าฮาลา-บาลา, อุทยานแห่งชาติเขาหลวงนครศรีฯ, เขาสก, แก่งกระจานตอนล่าง',
    youtubeQuery: 'ป่าดิบชื้น ฮาลา บาลา เขาสก นิเวศวิทยาป่าไม้'
  },
  {
    id: 'eco-hef',
    type: 'ป่าไม่ผลัดใบ (Evergreen Forest)',
    nameTh: 'ป่าดิบเขา (Hill / Montane Evergreen Forest - HEF)',
    wikiTitles: ['Doi Inthanon National Park', 'อุทยานแห่งชาติดอยอินทนนท์', 'Cloud forest'],
    elevationRange: 'ตั้งแต่ 1,000 เมตรขึ้นไป (Lower & Upper Montane)',
    rainfallMm: '1,500 - 2,500 มม./ปี (อุณหภูมิเฉลี่ยต่ำ มีเมฆหมอกปกคลุมตลอดปี)',
    canopyStructure: 'เรือนยอดเตี้ยลง (15-25 ม.) ลำต้นคดงอปกคลุมด้วยมอสส์ เฟิร์นอิงอาศัย ข้าวตอกฤาษี (Sphagnum moss) และฝอยลม',
    indicatorSpecies: 'ก่อเดือย (Castanopsis acuminatissima), ก่อแป้น, ทะโล้ (Schima wallichii), กุหลาบพันปี (Rhododendron arboreum)',
    representativeSites: 'ดอยอินทนนท์ (อ่างกา-กิ่วแม่ปาน), ยอดเขาโมโกจู, ดอยผ้าห่มปก, ภูหลวง',
    youtubeQuery: 'ป่าดิบเขา ป่าเมฆ ดอยอินทนนท์ พรรณไม้'
  },
  {
    id: 'eco-pine',
    type: 'ป่าไม่ผลัดใบ (Evergreen Forest)',
    nameTh: 'ป่าสนเขา (Coniferous / Pine Forest - PF)',
    wikiTitles: ['Phu Kradueng National Park', 'อุทยานแห่งชาติภูกระดึง', 'Pinus kesiya'],
    elevationRange: '700 - 1,800 เมตร (พบบนสันเขาหรือที่ราบดินทรายจัด)',
    rainfallMm: '1,000 - 1,500 มม./ปี (ดินมีความเป็นกรดและธาตุอาหารต่ำ)',
    canopyStructure: 'เรือนยอดโปร่ง มีชั้นเรือนยอดไม้สนเป็นหลัก ผสมกับไม้ตระกูลก่อและทุ่งหญ้าพื้นล่าง',
    indicatorSpecies: 'สนสองใบ (Pinus merkusii), สนสามใบ (Pinus kesiya), ก่วมแดง/เมเปิล (Acer calcaratum)',
    representativeSites: 'ภูกระดึง, ภูสอยดาว, ดอยขุนตาล (ย.2-ย.4), น้ำหนาว',
    youtubeQuery: 'ป่าสนเขา สนสองใบ สนสามใบ ภูกระดึง ภูสอยดาว'
  },
  {
    id: 'eco-mdf',
    type: 'ป่าผลัดใบ (Deciduous Forest)',
    nameTh: 'ป่าเบญจพรรณ (Mixed Deciduous Forest - MDF)',
    wikiTitles: ['Huai Kha Khaeng Wildlife Sanctuary', 'เขตรักษาพันธุ์สัตว์ป่าห้วยขาแข้ง', 'Tectona grandis'],
    elevationRange: '50 - 800 เมตร (กระจายกว้างขวางในภาคเหนือ ตะวันตก และกลาง)',
    rainfallMm: '1,000 - 1,400 มม./ปี (ผลัดใบพร้อมกันในฤดูแล้ง ก.พ. - เม.ย. ก่อนผลิใบใหม่)',
    canopyStructure: 'เรือนยอดโปร่งปานกลาง มีไม้ไผ่ชนิดต่างๆ (ไผ่ป่า, ไผ่ซางนวล, ไผ่รวก) ขึ้นปะปนเป็นลักษณะเด่นสำคัญ',
    indicatorSpecies: 'สัก (Tectona grandis), แดง (Xylia xylocarpa), ประดู่ป่า (Pterocarpus macrocarpus), ชิงชัน (Dalbergia oliveri)',
    representativeSites: 'ห้วยขาแข้ง, แม่วงก์, เอราวัณ-ห้วยแม่ขมิ้น, อุทยานแห่งชาติแม่ยม',
    youtubeQuery: 'ป่าเบญจพรรณ ไม้สัก ไผ่ป่า นิเวศวิทยา'
  },
  {
    id: 'eco-ddf',
    type: 'ป่าผลัดใบ (Deciduous Forest)',
    nameTh: 'ป่าเต็งรัง / ป่าแดง (Dry Dipterocarp Forest - DDF)',
    wikiTitles: ['Dipterocarpus tuberculatus', 'ป่าเต็งรัง', 'Shorea siamensis'],
    elevationRange: '50 - 900 เมตร (บนพื้นที่ดอน ดินตื้น ดินปนกรวดทรายหรือศิลาแลง)',
    rainfallMm: '800 - 1,200 มม./ปี (ทนแล้งจัดและปรับตัวต่อไฟป่าประจำปีได้ดีเยี่ยม)',
    canopyStructure: 'ป่าโปร่ง เรือนยอดชั้นเดียวไม่ต่อเนื่อง ลำต้นมักคดงอ เปลือกหนามาก พื้นล่างมีหญ้าเพ็กและปรงป่า',
    indicatorSpecies: 'เต็ง (Shorea obtusa), รัง (Shorea siamensis), เหียง (Dipterocarpus obtusifolius), พลวง (Dipterocarpus tuberculatus)',
    representativeSites: 'ห้วยขาแข้ง, ซับลังกา, ภูผาเทิบ, ดอยขุนตาลช่วงล่าง (ย.1)',
    youtubeQuery: 'ป่าเต็งรัง เต็ง รัง เหียง พลวง ไฟป่า'
  }
]

// ============================================================================
// 2. ACADEMIC DENDROLOGY HERBARIUM
// ============================================================================
export const ACADEMIC_DENDROLOGY_DB = [
  {
    id: 'sp-01-dipterocarpus-alatus',
    thaiName: 'ยางนา',
    scientificName: 'Dipterocarpus alatus Roxb. ex G.Don',
    family: 'Dipterocarpaceae (วงศ์ยาง)',
    svgType: 'two_wing_samara',
    wikiTitles: ['Dipterocarpus alatus', 'ยางนา'],
    forestType: 'ป่าดิบแล้ง (โดยเฉพาะริมลำห้วยและที่ราบลุ่มแม่น้ำ)',
    barkAndSlash: 'ไม้ต้นขนาดใหญ่สูง 35-50 ม. ลำต้นเปลาตรง เปลือกนอกสีเทาอมขาวเรียบหรือแตกเป็นสะเก็ดตื้นๆ รอยถากเปลือกในสีน้ำตาลปนเหลือง มีท่อน้ำยางซึม',
    leafMorphology: 'ใบเดี่ยว เรียงสลับ รูปไข่แกมรูปใบหอก กว้าง 6-15 ซม. ยาว 10-25 ซม. เส้นแขนงใบ 12-18 คู่ ขนานกันชัดเจน',
    fruitAndSeed: 'ผลแห้งไม่แตก ตัวผลกลมมีครีบตามยาว 5 ครีบ ประดับด้วยปีกยาว 2 ปีกสีแดงอมชมพู และปีกสั้นคล้ายหูหนู 3 ปีก',
    silviculture: 'ต้องการแสงปานกลางในระยะกล้า มีความสัมพันธ์แบบพึ่งพากับราเอคโตไมคอร์ไรซา (เช่น เห็ดเผาะ/เห็ดระโงก)',
    conservationAndUse: 'ไม้หวงห้ามประเภท ก. เนื้อไม้ใช้ในงานโครงสร้างร่มและน้ำมันยางใช้ยาแนวเรือ',
    youtubeQuery: 'ยางนา Dipterocarpus alatus รุกขวิทยา'
  },
  {
    id: 'sp-02-hopea-ferrea',
    thaiName: 'ตะเคียนหิน',
    scientificName: 'Hopea ferrea Laness.',
    family: 'Dipterocarpaceae (วงศ์ยาง)',
    svgType: 'two_wing_samara',
    wikiTitles: ['Hopea ferrea', 'ตะเคียนหิน'],
    forestType: 'ป่าดิบแล้งบนไหล่เขาและพื้นที่หินทราย',
    barkAndSlash: 'ไม้ต้นสูง 25-35 ม. โคนต้นมักมีพูพอน เปลือกนอกสีน้ำตาลเข้มถึงดำ แตกเป็นร่องลึกตามยาว รอยถากสีเหลืองอ่อน มีชันสีขาวใสซึมออกมา',
    leafMorphology: 'ใบเดี่ยว เรียงสลับ รูปไข่ถึงรูปใบหอก ปลายใบเรียวแหลมเป็นหาง เนื้อใบค่อนข้างหนาเกลี้ยง',
    fruitAndSeed: 'ผลมีปีกยาว 2 ปีก รูปใบพาย ยาว 3-5 ซม. และปีกสั้น 3 ปีกหุ้มตัวผลไว้',
    silviculture: 'ทนร่มในระยะกล้าได้ดีมาก รอจังหวะช่องว่างเรือนยอด (Canopy gap) เพื่อพุ่งขึ้นสู่ชั้นบน',
    conservationAndUse: 'IUCN: Endangered (EN) • ไม้ดัชนีสำคัญที่สุดในการศึกษาโครงสร้างป่าดิบแล้งที่สะแกราช',
    youtubeQuery: 'ตะเคียนหิน Hopea ferrea ป่าสะแกราช'
  },
  {
    id: 'sp-03-hopea-odorata',
    thaiName: 'ตะเคียนทอง',
    scientificName: 'Hopea odorata Roxb.',
    family: 'Dipterocarpaceae (วงศ์ยาง)',
    svgType: 'two_wing_samara',
    wikiTitles: ['Hopea odorata', 'ตะเคียน'],
    forestType: 'ป่าดิบแล้งและป่าดิบชื้นใกล้แหล่งน้ำหรือลำธาร',
    barkAndSlash: 'ไม้ต้นขนาดใหญ่สูง 30-45 ม. เปลือกสีน้ำตาลดำ แตกเป็นร่องและสะเก็ดรูปสี่เหลี่ยมผืนผ้า รอยถากสีเหลืองนวล',
    leafMorphology: 'ใบเดี่ยว เรียงสลับ รูปไข่แกมรูปขอบขนาน จุดสังเกตสำคัญคือมี "ตุ่มหูด (Pore-like domatia)" ชัดเจนตามง่ามเส้นแขนงใบ',
    fruitAndSeed: 'ผลกลมขนาดเล็ก มีปีกยาว 2 ปีก (ยาว 4-6 ซม.) และปีกสั้น 3 ปีก',
    silviculture: 'เจริญเติบโตดีในดินร่วนลึกชุ่มชื้นริมห้วย กล้าไม้ต้องการร่มเงาในช่วง 1-2 ปีแรก',
    conservationAndUse: 'IUCN: Vulnerable (VU) • เนื้อไม้แข็งแรงทนทานน้ำเค็มนิยมใช้ต่อเรือ',
    youtubeQuery: 'ตะเคียนทอง Hopea odorata'
  },
  {
    id: 'sp-04-shorea-obtusa',
    thaiName: 'เต็ง',
    scientificName: 'Shorea obtusa Wall. ex G.Don',
    family: 'Dipterocarpaceae (วงศ์ยาง)',
    svgType: 'three_wing_samara',
    wikiTitles: ['Shorea obtusa', 'เต็ง'],
    forestType: 'ป่าเต็งรัง (Dry Dipterocarp Forest - ไม้ดัชนีหลัก)',
    barkAndSlash: 'เปลือกนอกสีเทาอมดำหนามาก แตกเป็นร่องลึกตามยาวเพื่อเป็นฉนวนกันความร้อนจากไฟป่า รอยถากสีน้ำตาลปนเหลือง',
    leafMorphology: 'ใบรูปขอบขนานปลายมน โคนมน ท้องใบมีขนสั้นนุ่ม',
    fruitAndSeed: 'ผลมีปีกยาว 3 ปีก และปีกสั้น 2 ปีก',
    silviculture: 'ไม้เบิกนำทนแล้งและทนไฟป่า ระบบรากแก้วพุ่งลงลึก แตกหน่อจากตอได้ดี',
    conservationAndUse: 'เนื้อไม้แข็งและหนักมาก ใช้ทำหมอนรางรถไฟและเสาเรือน',
    youtubeQuery: 'ความแตกต่าง เต็ง รัง เหียง พลวง'
  },
  {
    id: 'sp-05-shorea-siamensis',
    thaiName: 'รัง',
    scientificName: 'Shorea siamensis Miq.',
    family: 'Dipterocarpaceae (วงศ์ยาง)',
    svgType: 'three_wing_samara',
    wikiTitles: ['Shorea siamensis', 'รัง (พืช)'],
    forestType: 'ป่าเต็งรัง (ขึ้นปะปนกับไม้เต็ง)',
    barkAndSlash: 'เปลือกหนาแตกร่องลึกคล้ายเต็ง แต่รอยถากมีชั้นเปลือกในสลับสีชมพูเรื่อๆ',
    leafMorphology: 'ใบรูปไข่หรือรูปหัวใจ โคนใบเว้าเป็นรูปหัวใจชัดเจน ก้านใบยาว ผิวใบเกลี้ยง',
    fruitAndSeed: 'ผลมีปีกยาว 3 ปีก และปีกสั้น 2 ปีก',
    silviculture: 'ทนแล้งและไฟป่า ผลัดใบก่อนออกดอกสีเหลืองหอมในช่วงฤดูแล้ง',
    conservationAndUse: 'ไม้โครงสร้างสำคัญของป่าเต็งรัง',
    youtubeQuery: 'ต้นรัง Shorea siamensis'
  },
  {
    id: 'sp-06-dipterocarpus-tuberculatus',
    thaiName: 'พลวง',
    scientificName: 'Dipterocarpus tuberculatus Roxb.',
    family: 'Dipterocarpaceae (วงศ์ยาง)',
    svgType: 'two_wing_samara',
    wikiTitles: ['Dipterocarpus tuberculatus', 'พลวง'],
    forestType: 'ป่าเต็งรัง (มักขึ้นเป็นกลุ่มก้อนในพื้นที่ดินลูกรัง)',
    barkAndSlash: 'เปลือกสีเทาอมน้ำตาล แตกเป็นร่องลึกตามยาวและล่อนเป็นแผ่นหนา ใบมีขนาดใหญ่มาก',
    leafMorphology: 'ใบเดี่ยวขนาดใหญ่มาก กว้าง 15-30 ซม. ยาว 20-40 ซม. โคนใบเว้าหรือตัดตรง ใบอ่อนมีขนสีน้ำตาลแดง',
    fruitAndSeed: 'ผลกลมมีสันหรือตุ่มนูนรอบผลชัดเจน มีปีกยาว 2 ปีก ปีกสั้น 3 ปีก',
    silviculture: 'ไม้ทนไฟ ใบที่ร่วงหล่นเป็นเชื้อเพลิงหลักที่ทำให้เกิดไฟป่าผิวดินในป่าเต็งรัง',
    conservationAndUse: 'ใบใช้ห่อของหรือมุงหลังคา (ใบตองตึง) น้ำมันยางใช้ทำไต้จุดไฟ',
    youtubeQuery: 'ต้นพลวง ใบตองตึง ป่าเต็งรัง'
  },
  {
    id: 'sp-07-tectona-grandis',
    thaiName: 'สัก (Teak)',
    scientificName: 'Tectona grandis L.f.',
    family: 'Lamiaceae (วงศ์กะเพรา)',
    svgType: 'opposite_large_leaf',
    wikiTitles: ['Tectona grandis', 'สัก (พืช)'],
    forestType: 'ป่าเบญจพรรณ (ภาคเหนือและตะวันตก)',
    barkAndSlash: 'เปลือกสีเทาอ่อน ค่อนข้างเรียบและลอกเป็นแถบยาวบางๆ ตามลำต้น กิ่งอ่อนเป็นสี่เหลี่ยม',
    leafMorphology: 'ใบเดี่ยว เรียงตรงข้ามสลับตั้งฉาก แผ่นใบใหญ่ ด้านบนสากมือ ด้านล่างมีต่อมสีแดง ขยี้ใบอ่อนจะได้น้ำสีแดง',
    fruitAndSeed: 'ผลแบบผลผนังชั้นในแข็ง มีกลีบเลี้ยงพองโตหุ้มเป็นถุงกลมคล้ายโคมไฟ',
    silviculture: 'ต้องการแสงจัดตลอดช่วงชีวิต เมล็ดต้องผ่านการอบหรือเผาไฟเบาๆ เพื่อกระตุ้นการงอก',
    conservationAndUse: 'ราชาแห่งไม้มีค่าทางเศรษฐกิจ มีสาร Tectol ป้องกันปลวกและมอดโดยธรรมชาติ',
    youtubeQuery: 'ไม้สัก Tectona grandis วนวัฒนวิทยา'
  },
  {
    id: 'sp-08-afzelia-xylocarpa',
    thaiName: 'มะค่าโมง',
    scientificName: 'Afzelia xylocarpa (Kurz) Craib',
    family: 'Fabaceae (วงศ์ถั่ว)',
    svgType: 'pod_orange_aril',
    wikiTitles: ['Afzelia xylocarpa', 'มะค่าโมง'],
    forestType: 'ป่าเบญจพรรณ และรอยต่อป่าดิบแล้ง',
    barkAndSlash: 'เปลือกสีน้ำตาลอ่อนอมชมพูหรือเทา ล่อนหลุดเป็นแผ่นกลมๆ ทำให้เห็นรอยบุ๋มตื้นๆ คล้ายรอยค้อนทุบ',
    leafMorphology: 'ใบประกอบแบบขนนกชั้นเดียวปลายคู่ มีใบย่อย 3-5 คู่ เรียงตรงข้าม',
    fruitAndSeed: 'ฝักแบนขนาดใหญ่และแข็งเหมือนเนื้อไม้ เมื่อแก่แตกอ้าออก เมล็ดมี "เยื่อหุ้มเมล็ด (Aril) สีส้มสด" หุ้มโคน',
    silviculture: 'ตรึงไนโตรเจน เปลือกเมล็ดแข็งมากต้องแช่น้ำร้อนหรือขลิบเปลือกก่อนเพาะชำ',
    conservationAndUse: 'IUCN: Endangered (EN) • เนื้อไม้มีลวดลายสวยงามมาก เยื่อหุ้มเมล็ดเป็นอาหารของนกเงือก',
    youtubeQuery: 'มะค่าโมง Afzelia xylocarpa'
  },
  {
    id: 'sp-09-pterocarpus-macrocarpus',
    thaiName: 'ประดู่ป่า',
    scientificName: 'Pterocarpus macrocarpus Kurz',
    family: 'Fabaceae (วงศ์ถั่ว)',
    svgType: 'pod_orange_aril',
    wikiTitles: ['Pterocarpus macrocarpus', 'ประดู่ป่า'],
    forestType: 'ป่าเบญจพรรณ และป่าเต็งรัง',
    barkAndSlash: 'เปลือกสีน้ำตาลดำ แตกเป็นร่องลึกและเป็นสะเก็ด รอยถากมีน้ำเลี้ยงสีแดงคล้ายเลือดซึมออกมา (Kino)',
    leafMorphology: 'ใบประกอบแบบขนนกปลายคี่ ใบย่อยเรียงสลับกัน 5-11 ใบ แผ่นใบรูปไข่ปลายแหลม',
    fruitAndSeed: 'ผลเป็นฝักแบนกลมคล้ายจานบิน ตรงกลางนูน มีปีกบางล้อมรอบ ไม่แตกเมื่อแก่',
    silviculture: 'โตเร็ว ทนแล้ง ดอกสีเหลืองทองออกรวมเป็นช่อบานสะพรั่งพร้อมกันและร่วงโรยเร็ว',
    conservationAndUse: 'เนื้อไม้สีแดงอมเหลืองแข็งแรงทนทาน ใช้ทำเฟอร์นิเจอร์และเครื่องดนตรีไทย',
    youtubeQuery: 'ต้นประดู่ป่า Pterocarpus macrocarpus'
  },
  {
    id: 'sp-10-dalbergia-cochinchinensis',
    thaiName: 'พะยูง',
    scientificName: 'Dalbergia cochinchinensis Pierre',
    family: 'Fabaceae (วงศ์ถั่ว)',
    svgType: 'pod_orange_aril',
    wikiTitles: ['Dalbergia cochinchinensis', 'พะยูง'],
    forestType: 'ป่าดิบแล้ง และป่าเบญจพรรณชื้น (เน้นภาคอีสานและตะวันออก)',
    barkAndSlash: 'เปลือกสีเทาเรียบหรือล่อนเป็นแผ่นบางๆ รอยถากเปลือกในสีเหลืองอมน้ำตาล แก่นไม้มีสีแดงอมม่วงถึงดำ มีเส้นลายไม้ชัดเจน',
    leafMorphology: 'ใบประกอบแบบขนนกชั้นเดียวปลายคี่ ใบย่อยเรียงสลับกัน 7-9 ใบ แผ่นใบเหนียวคล้ายแผ่นหนัง',
    fruitAndSeed: 'ฝักแบนบางคล้ายปีกและไม่แตก กว้าง 1 ซม. ยาว 4-7 ซม. ตรงกลางฝักนูนเห็นรอยเมล็ด 1-3 เมล็ด',
    silviculture: 'ระบบรากมีปมไรโซเบียมตรึงไนโตรเจน ทนแล้งได้ดีเมื่อพ้นระยะกล้า',
    conservationAndUse: 'IUCN: Critically Endangered (CR) • ไม้มีค่าสูงสุดที่ต้องเฝ้าระวังการลักลอบตัด',
    youtubeQuery: 'ไม้พะยูง Dalbergia cochinchinensis'
  },
  {
    id: 'sp-11-dalbergia-oliveri',
    thaiName: 'ชิงชัน',
    scientificName: 'Dalbergia oliveri Gamble ex Prain',
    family: 'Fabaceae (วงศ์ถั่ว)',
    svgType: 'pod_orange_aril',
    wikiTitles: ['Dalbergia oliveri', 'ชิงชัน'],
    forestType: 'ป่าเบญจพรรณ และป่าดิบแล้ง',
    barkAndSlash: 'เปลือกสีเทาหรือน้ำตาล แตกเป็นร่องตามยาว ล่อนเป็นแผ่นหนา แก่นไม้สีแดงเข้มถึงม่วงดำ',
    leafMorphology: 'ใบประกอบแบบขนนกปลายคี่ ใบย่อยเรียงสลับ 9-17 ใบ มีขนาดเล็กกว่าพะยูง ปลายใบมนหรือหยักเว้าเล็กน้อย',
    fruitAndSeed: 'ฝักแบนยาวคล้ายมีด กว้าง 1.5-2 ซม. ยาว 8-14 ซม. แหลมทั้งหัวและท้าย ภายในมี 1-3 เมล็ด',
    silviculture: 'เจริญเติบโตช้า ต้องการดินร่วนซุยที่ระบายน้ำได้ดี',
    conservationAndUse: 'IUCN: Endangered (EN) • เนื้อไม้เหนียวและแข็งมาก นิยมทำเครื่องดนตรีและเฟอร์นิเจอร์',
    youtubeQuery: 'ชิงชัน Dalbergia oliveri'
  },
  {
    id: 'sp-12-pinus-kesiya',
    thaiName: 'สนสามใบ',
    scientificName: 'Pinus kesiya Royle ex Gordon',
    family: 'Pinaceae (วงศ์สนเขา)',
    svgType: 'pine_needle_cone',
    wikiTitles: ['Pinus kesiya', 'สนสามใบ'],
    forestType: 'ป่าสนเขา และป่าดิบเขา (ความสูง 700 - 1,800 ม.)',
    barkAndSlash: 'เปลือกสีน้ำตาลอมชมพู แตกเป็นสะเก็ดแผ่นบางหลุดร่วงง่าย',
    leafMorphology: 'ใบเปลี่ยนรูปเป็นใบเข็ม อยู่รวมกันเป็นกระจุก (Fascicle) 3 ใบ/กระจุก ยาว 12-20 ซม.',
    fruitAndSeed: 'ไม่มีดอกและผลแท้จริง สร้างโคน (Cone) แยกเพศบนต้นเดียวกัน เมล็ดมีปีกบาง 1 ปีก',
    silviculture: 'ไม่มีระยะพักตัวในขั้นกล้าไม้ (Grass stage) พุ่งยอดโตเร็ว ไม้เบิกนำพื้นที่สูง',
    conservationAndUse: 'ปลูกฟื้นฟูต้นน้ำภูเขาสูง ให้น้ำมันสนธรรมชาติ',
    youtubeQuery: 'สนสามใบ Pinus kesiya'
  },
  {
    id: 'sp-13-pinus-merkusii',
    thaiName: 'สนสองใบ',
    scientificName: 'Pinus merkusii Jungh. & de Vriese',
    family: 'Pinaceae (วงศ์สนเขา)',
    svgType: 'pine_needle_cone',
    wikiTitles: ['Pinus merkusii', 'สนสองใบ'],
    forestType: 'ป่าสนเขา และที่ราบดินทราย (พบได้ตั้งแต่ระดับต่ำถึง 1,000 ม.)',
    barkAndSlash: 'เปลือกสีน้ำตาลดำหนามาก แตกเป็นร่องลึกคล้ายหนังจระเข้ มีท่อชันสน (Resin canal) กลิ่นหอมแรง',
    leafMorphology: 'ใบเข็ม 2 ใบ/กระจุก ยาวและแข็งกว่าสนสามใบ (ยาว 15-25 ซม.)',
    fruitAndSeed: 'สร้างโคน (Cone) เมล็ดมีปีก โคนมักมีขนาดใหญ่กว่าสนสามใบเล็กน้อย',
    silviculture: 'กล้าไม้มีระยะพักตัวที่เรียกว่า "ระยะหญ้า (Grass stage)" นาน 2-4 ปีเพื่อสะสมอาหารและทนไฟป่า',
    conservationAndUse: 'เจาะเอาน้ำมันสนและยางสนทนไฟ',
    youtubeQuery: 'สนสองใบ Pinus merkusii ระยะหญ้า'
  },
  {
    id: 'sp-14-acer-calcaratum',
    thaiName: 'ก่วมแดง (เมเปิลไทย)',
    scientificName: 'Acer calcaratum Gagnep.',
    family: 'Sapindaceae (วงศ์เงาะ/เมเปิล)',
    svgType: 'maple_samara',
    wikiTitles: ['Acer calcaratum', 'ก่วมแดง'],
    forestType: 'ป่าดิบเขาและป่าสนเขาใกล้ลำธาร',
    barkAndSlash: 'ไม้ต้นขนาดกลาง เปลือกสีเทาเรียบหรือแตกร่องตื้นๆ',
    leafMorphology: 'ใบเดี่ยว เรียงตรงข้าม แผ่นใบหยักเว้าลึกเป็น 3 แฉกชัดเจน เส้นใบออกจากจุดเดียวกันที่โคนใบ 3 เส้น ฤดูหนาวคลอโรฟิลล์จะสลายตัวเผยสาร Anthocyanin สีแดงสด',
    fruitAndSeed: 'ผลแฝดมีปีก (Double samara) ปีกโค้งกางออกทำมุมป้าน ช่วยหมุนควงสว่านเมื่อร่วง',
    silviculture: 'ชอบขึ้นในหุบเขาชุ่มชื้นริมลำห้วยบนที่สูง',
    conservationAndUse: 'ดัชนีชี้วัดการเปลี่ยนแปลงฤดูกาลของระบบนิเวศป่าดิบเขา',
    youtubeQuery: 'ก่วมแดง เมเปิ้ล ภูกระดึง'
  },
  {
    id: 'sp-15-trachycarpus-oreophilus',
    thaiName: 'ค้อเชียงดาว',
    scientificName: 'Trachycarpus oreophilus Gibbons & Spanner',
    family: 'Arecaceae (วงศ์ปาล์ม)',
    svgType: 'palm_fan',
    wikiTitles: ['Trachycarpus oreophilus', 'ดอยเชียงดาว'],
    forestType: 'สังคมพืชกึ่งอัลไพน์บนเขาหินปูน (ดอยหลวงเชียงดาว)',
    barkAndSlash: 'ปาล์มต้นเดี่ยวสูง 10-12 ม. ลำต้นเปลือยมีรอยแผลใบเรียงถี่',
    leafMorphology: 'ใบรูปพัด แผ่นใบจักลึกออกเป็นแฉกเรียวแข็ง ทนต่อลมแรงและน้ำค้างแข็ง',
    fruitAndSeed: 'ช่อดอกแยกเพศต่างต้น ผลสุกสีเหลืองคล้ำถึงดำ รูปไต',
    silviculture: 'เติบโตช้ามากบนรอยแตกของหน้าผาหินปูน อาศัยความชื้นจากเมฆหมอก',
    conservationAndUse: 'พืชถิ่นเดียวหายากยิ่งของไทย (Strict Endemic)',
    youtubeQuery: 'ค้อเชียงดาว ดอยหลวงเชียงดาว'
  },
  {
    id: 'sp-16-aquilaria-crassna',
    thaiName: 'กฤษณา (ไม้หอม)',
    scientificName: 'Aquilaria crassna Pierre ex Lecomte',
    family: 'Thymelaeaceae (วงศ์กฤษณา)',
    svgType: 'opposite_large_leaf',
    wikiTitles: ['Aquilaria crassna', 'กฤษณา'],
    forestType: 'ป่าดิบแล้งและป่าดิบชื้น',
    barkAndSlash: 'เปลือกสีเทาอมขาว ค่อนข้างเรียบและลอกเป็นเส้นเหนียวคล้ายเชือก',
    leafMorphology: 'ใบเดี่ยว เรียงสลับ รูปรีแกมขอบขนาน ปลายใบแหลมเป็นหาง เส้นแขนงใบถี่และขนานกันชัดเจน',
    fruitAndSeed: 'ผลรูปไข่กลับ ผิวมีขนสั้นนุ่ม แตกออกเป็น 2 ซีกเมื่อแก่ เมล็ดมีรยางค์สีเหลืองห้อยต่องแต่ง',
    silviculture: 'แก่นไม้หอมเกิดจากกระบวนการป้องกันตัวเมื่อต้นไม้เกิดบาดแผลหรือถูกเชื้อราเข้าทำลาย',
    conservationAndUse: 'IUCN: Critically Endangered (CR) • สกัดน้ำมันหอมระเหยและทำเครื่องหอมราคาสูง',
    youtubeQuery: 'ไม้กฤษณา Aquilaria crassna'
  },
  {
    id: 'sp-17-bambusa-bambos',
    thaiName: 'ไผ่ป่า',
    scientificName: 'Bambusa bambos (L.) Voss',
    family: 'Poaceae (วงศ์หญ้า)',
    svgType: 'palm_fan',
    wikiTitles: ['Bambusa bambos', 'ไผ่ป่า'],
    forestType: 'ป่าเบญจพรรณ และริมลำห้วย',
    barkAndSlash: 'ลำต้นใต้ดินเป็นเหง้า แตกกอแน่น ลำต้นเหนือดินสีเขียวสด มีหนามแหลมคมโค้งงอตามข้อกิ่งหนาแน่น',
    leafMorphology: 'ใบเดี่ยว รูปใบหอกแคบ ปลายใบแหลม ขอบใบสากคาย กาบหุ้มลำมีขนสีน้ำตาลดำปกคลุม',
    fruitAndSeed: 'ออกดอกพร้อมกันทั้งกอ (หรือทั้งป่า) แล้วต้นแม่จะตาย (Gregarious flowering) เมล็ดคล้ายเมล็ดข้าว',
    silviculture: 'เจริญเติบโตเร็วมาก เป็นไม้เบิกนำที่ยึดหน้าดินริมน้ำได้ดี หน่อมีรสขมต้องต้มล้างน้ำก่อนทาน',
    conservationAndUse: 'ดัชนีชี้วัดป่าเบญจพรรณ ลำต้นใช้ทำโครงสร้างชั่วคราวและนั่งร้าน',
    youtubeQuery: 'ไผ่ป่า Bambusa bambos'
  },
  {
    id: 'sp-18-cassia-fistula',
    thaiName: 'ราชพฤกษ์ (คูน)',
    scientificName: 'Cassia fistula L.',
    family: 'Fabaceae (วงศ์ถั่ว)',
    svgType: 'pod_orange_aril',
    wikiTitles: ['Cassia fistula', 'ราชพฤกษ์'],
    forestType: 'ป่าเบญจพรรณ และป่าเต็งรัง',
    barkAndSlash: 'เปลือกต้นสีเทาเรียบ เมื่อแก่จะแตกเป็นเกล็ดตื้นๆ',
    leafMorphology: 'ใบประกอบแบบขนนกปลายคู่ ใบย่อย 3-8 คู่ แผ่นใบรูปไข่หรือรูปรี',
    fruitAndSeed: 'ฝักรูปทรงกระบอกยาว 20-60 ซม. สีดำแข็ง ภายในมีผนังตั้นเป็นห้องๆ และมีเนื้อเหนียวสีดำหุ้มเมล็ด',
    silviculture: 'ทนแล้งจัด ทิ้งใบหมดต้นก่อนออกดอกสีเหลืองทองเต็มต้นในช่วงฤดูร้อน (มี.ค. - พ.ค.)',
    conservationAndUse: 'ดอกไม้ประจำชาติไทย เนื้อในฝักเป็นยาระบายอ่อนๆ',
    youtubeQuery: 'ราชพฤกษ์ ต้นคูน Cassia fistula'
  },
  {
    id: 'sp-19-lagerstroemia-speciosa',
    thaiName: 'อินทนิลน้ำ',
    scientificName: 'Lagerstroemia speciosa (L.) Pers.',
    family: 'Lythraceae (วงศ์ตะแบก)',
    svgType: 'opposite_large_leaf',
    wikiTitles: ['Lagerstroemia speciosa', 'อินทนิลน้ำ'],
    forestType: 'ป่าเบญจพรรณชื้น และริมลำห้วยในป่าดิบแล้ง',
    barkAndSlash: 'เปลือกสีเทาหรือน้ำตาลอ่อน ค่อนข้างเรียบ มักลอกเป็นแผ่นบางๆ เล็กน้อย',
    leafMorphology: 'ใบเดี่ยว เรียงตรงข้ามหรือเยื้องกันเล็กน้อย ใบรูปขอบขนานขนาดใหญ่ หนา ก่อนร่วงมีสีแดงเข้ม',
    fruitAndSeed: 'ดอกช่อขนาดใหญ่สีม่วงหรือชมพูอมม่วง ผลแห้งแตก รูปไข่กว้างหรือกลม เปลือกผลหนาแข็งและมีรอยจีบคล้ายดาว',
    silviculture: 'ชอบพื้นที่ราบลุ่มริมน้ำ แสงแดดจัด',
    conservationAndUse: 'ใบใช้ต้มเป็นยาสมุนไพรช่วยลดน้ำตาลในเลือด ปลูกเป็นไม้ประดับให้ร่มเงา',
    youtubeQuery: 'อินทนิลน้ำ Lagerstroemia speciosa'
  },
  {
    id: 'sp-20-sindora-siamensis',
    thaiName: 'มะค่าแต้',
    scientificName: 'Sindora siamensis Teijsm. ex Miq.',
    family: 'Fabaceae (วงศ์ถั่ว)',
    svgType: 'pod_orange_aril',
    wikiTitles: ['Sindora siamensis', 'มะค่าแต้'],
    forestType: 'ป่าเต็งรัง และป่าเบญจพรรณแล้ง',
    barkAndSlash: 'เปลือกสีเทาดำ แตกเป็นร่องและสะเก็ด ลำต้นมักปุ่มป่ำและคดงอ',
    leafMorphology: 'ใบประกอบแบบขนนกปลายคู่ ใบย่อย 3-4 คู่ รูปรีแกมขอบขนาน ปลายใบเว้าตื้นๆ',
    fruitAndSeed: 'ฝักแบนรูปไข่ค่อนข้างกลม มีหนามแข็งแหลมสั้นๆ ปกคลุมหนาแน่นทั่วทั้งฝัก แตกออกเป็น 2 ซีกเมื่อแห้ง',
    silviculture: 'ทนแล้งและทนไฟป่าได้ดี โตช้าบนพื้นที่ดินร่วนปนทรายหรือลูกรัง',
    conservationAndUse: 'เนื้อไม้สีน้ำตาลแดง แข็งและเหนียว ใช้ทำเครื่องมือเกษตรและฟืน/ถ่านคุณภาพสูง',
    youtubeQuery: 'มะค่าแต้ Sindora siamensis'
  }
]

// ============================================================================
// 3. WILDLIFE BIOLOGY & CONSERVATION ATLAS
// ============================================================================
export const WILDLIFE_CONSERVATION_DB = [
  {
    id: 'wl-01-tapir',
    thaiName: 'สมเสร็จ',
    scientificName: 'Tapirus indicus',
    orderFamily: 'Order Perissodactyla (สัตว์กีบคี่) • Tapiridae',
    legalStatus: 'สัตว์ป่าสงวน • IUCN: Endangered (EN)',
    spoorType: 'tapir_track',
    wikiTitles: ['Malayan tapir', 'สมเสร็จ'],
    trackMorphology: 'ตีนหน้า 4 นิ้ว ตีนหลัง 3 นิ้ว มักพบรอยชัดเจนตามดินโคลนริมลำห้วย',
    ecologicalRole: 'ผู้กระจายเมล็ดพันธุ์ไม้ขนาดใหญ่ของป่า กินผลไม้ป่ากว่า 100 ชนิด แล้วถ่ายมูลในแหล่งน้ำ',
    habitatParks: 'ห้วยขาแข้ง, แก่งกระจาน, ฮาลา-บาลา',
    youtubeQuery: 'สมเสร็จ Tapirus indicus'
  },
  {
    id: 'wl-02-tiger',
    thaiName: 'เสือโคร่ง',
    scientificName: 'Panthera tigris',
    orderFamily: 'Order Carnivora (สัตว์กินเนื้อ) • Felidae',
    legalStatus: 'สัตว์ป่าคุ้มครอง • IUCN: Endangered (EN)',
    spoorType: 'tiger_pugmark',
    wikiTitles: ['Indochinese tiger', 'เสือโคร่ง'],
    trackMorphology: 'รอยอุ้งตีน (Pugmark) รูปสี่เหลี่ยมคางหมูด้านหน้าเว้า มีนิ้ว 4 นิ้ว ไม่ปรากฏรอยเล็บ (หดเล็บได้)',
    ecologicalRole: 'ผู้ล่าสูงสุด ควบคุมประชากรสัตว์กีบ',
    habitatParks: 'ทุ่งใหญ่นเรศวร-ห้วยขาแข้ง, ทับลาน',
    youtubeQuery: 'เสือโคร่ง ห้วยขาแข้ง'
  },
  {
    id: 'wl-03-asian-elephant',
    thaiName: 'ช้างป่า',
    scientificName: 'Elephas maximus',
    orderFamily: 'Order Proboscidea (สัตว์งวง) • Elephantidae',
    legalStatus: 'สัตว์ป่าคุ้มครอง • IUCN: Endangered (EN)',
    spoorType: 'cloven_hoof',
    wikiTitles: ['Asian elephant', 'ช้างป่า'],
    trackMorphology: 'รอยตีนรูปกลมขนาดใหญ่ (เส้นผ่านศูนย์กลาง 30-40 ซม.) ตีนหน้ากลมกว่าตีนหลังซึ่งมีลักษณะค่อนข้างรี',
    ecologicalRole: 'วิศวกรระบบนิเวศ (Ecosystem Engineer) เบิกเส้นทางด่านสัตว์ในป่าทึบ ทำลายเถาวัลย์ และกระจายเมล็ดไม้ยืนต้น',
    habitatParks: 'เขาใหญ่, แก่งกระจาน, สลักพระ, กุยบุรี',
    youtubeQuery: 'ช้างป่า เอเชีย Elephas maximus'
  },
  {
    id: 'wl-04-gaur',
    thaiName: 'กระทิง',
    scientificName: 'Bos gaurus',
    orderFamily: 'Order Artiodactyla (สัตว์กีบคู่) • Bovidae',
    legalStatus: 'สัตว์ป่าคุ้มครอง • IUCN: Vulnerable (VU)',
    spoorType: 'cloven_hoof',
    wikiTitles: ['Gaur', 'กระทิง'],
    trackMorphology: 'รอยกีบคู่ขนาดใหญ่และลึก กีบหน้าป้านและกว้างกว่าวัวแดง ขอบกีบค่อนข้างโค้งมน',
    ecologicalRole: 'สัตว์กินพืชขนาดใหญ่ ควบคุมปริมาณหญ้าและไผ่ เป็นเหยื่อหลักของเสือโคร่งวัยโตเต็มวัย',
    habitatParks: 'เขาใหญ่, เขาแผงม้า, ห้วยขาแข้ง, กุยบุรี',
    youtubeQuery: 'กระทิง Bos gaurus เขาแผงม้า'
  },
  {
    id: 'wl-05-banteng',
    thaiName: 'วัวแดง',
    scientificName: 'Bos javanicus',
    orderFamily: 'Order Artiodactyla (สัตว์กีบคู่) • Bovidae',
    legalStatus: 'สัตว์ป่าคุ้มครอง • IUCN: Endangered (EN)',
    spoorType: 'cloven_hoof',
    wikiTitles: ['Banteng', 'วัวแดง'],
    trackMorphology: 'รอยกีบคู่เรียวและแหลมกว่ากระทิง มีขนาดเล็กกว่าเล็กน้อย',
    ecologicalRole: 'รักษาสมดุลทุ่งหญ้าในป่าเต็งรังและป่าเบญจพรรณ ตัวผู้โตเต็มวัยมีสีน้ำตาลแดงหรือดำ มีวงก้นขาวชัดเจน',
    habitatParks: 'ห้วยขาแข้ง, สลักพระ, แม่วงก์',
    youtubeQuery: 'วัวแดง Bos javanicus ห้วยขาแข้ง'
  },
  {
    id: 'wl-06-goral',
    thaiName: 'กวางผา',
    scientificName: 'Naemorhedus griseus',
    orderFamily: 'Order Artiodactyla (สัตว์กีบคู่) • Bovidae',
    legalStatus: 'สัตว์ป่าสงวน • IUCN: Vulnerable (VU)',
    spoorType: 'cloven_hoof',
    wikiTitles: ['Chinese goral', 'กวางผา'],
    trackMorphology: 'ปลายกีบเรียวแหลม แผ่นรองกีบยืดหยุ่นคล้ายยางดูด ยึดเกาะหน้าผาหินปูน มักพบกองมูลเม็ดกลมรีทับถมกัน (Latrine site)',
    ecologicalRole: 'ดัชนีชี้วัดความสมบูรณ์ของระบบนิเวศภูเขาสูง ตัวเล็กสีน้ำตาลเทา กระจายเฉพาะภาคเหนือตอนบน',
    habitatParks: 'ดอยหลวงเชียงดาว, ดอยม่อนจอง, ดอยอินทนนท์',
    youtubeQuery: 'กวางผา ดอยม่อนจอง'
  },
  {
    id: 'wl-07-serow',
    thaiName: 'เลียงผา',
    scientificName: 'Capricornis sumatraensis',
    orderFamily: 'Order Artiodactyla (สัตว์กีบคู่) • Bovidae',
    legalStatus: 'สัตว์ป่าสงวน • IUCN: Vulnerable (VU)',
    spoorType: 'cloven_hoof',
    wikiTitles: ['Mainland serow', 'เลียงผา'],
    trackMorphology: 'รอยกีบคู่แหลมคล้ายกวางผาแต่ขนาดใหญ่กว่า ยึดเกาะหินปูนได้ดีเยี่ยม',
    ecologicalRole: 'สัตว์กินพืชหน้าผาหินปูน ลำตัวสีดำ มีแผงคอยาว ต่อมใต้ตาขนาดใหญ่ชัดเจน พบกระจายได้ทั่วประเทศ',
    habitatParks: 'เขาสามร้อยยอด, เขาหลวงสุโขทัย, แก่งกระจาน',
    youtubeQuery: 'เลียงผา สัตว์ป่าสงวน'
  },
  {
    id: 'wl-08-dhole',
    thaiName: 'หมาใน',
    scientificName: 'Cuon alpinus',
    orderFamily: 'Order Carnivora (สัตว์กินเนื้อ) • Canidae',
    legalStatus: 'สัตว์ป่าคุ้มครอง • IUCN: Endangered (EN)',
    spoorType: 'tiger_pugmark',
    wikiTitles: ['Dhole', 'หมาใน'],
    trackMorphology: 'รอยอุ้งตีนคล้ายสุนัข แต่มีนิ้ว 4 นิ้ว และ **ปรากฏรอยเล็บชัดเจน** (ต่างจากเสือ)',
    ecologicalRole: 'นักล่าแบบฝูงที่มีประสิทธิภาพสูง ควบคุมประชากรกวางป่าและเก้ง สื่อสารด้วยเสียงผิวปากคล้ายนก',
    habitatParks: 'เขาใหญ่, ห้วยขาแข้ง, แก่งกระจาน',
    youtubeQuery: 'หมาใน Cuon alpinus ฝูงนักล่า'
  },
  {
    id: 'wl-09-asiatic-black-bear',
    thaiName: 'หมีควาย',
    scientificName: 'Ursus thibetanus',
    orderFamily: 'Order Carnivora (สัตว์กินเนื้อ) • Ursidae',
    legalStatus: 'สัตว์ป่าคุ้มครอง • IUCN: Vulnerable (VU)',
    spoorType: 'tiger_pugmark',
    wikiTitles: ['Asiatic black bear', 'หมีควาย'],
    trackMorphology: 'รอยตีนกว้าง ฝ่าตีนเต็มคล้ายรอยตีนมนุษย์ มี 5 นิ้ว และรอยเล็บลึกโค้งยาว',
    ecologicalRole: 'สัตว์กินเนื้อที่กินพืชเป็นหลัก (Omnivore) เคลื่อนย้ายเมล็ดผลไม้ ทิ้งรอยตะกุยเปลือกไม้ขนาดใหญ่ มีแถบขาวรูปตัว V',
    habitatParks: 'เขาใหญ่, ทับลาน, ภูเขียว',
    youtubeQuery: 'หมีควาย อุทยานแห่งชาติเขาใหญ่'
  },
  {
    id: 'wl-10-lar-gibbon',
    thaiName: 'ชะนีมือขาว',
    scientificName: 'Hylobates lar',
    orderFamily: 'Order Primates (ไพรเมต) • Hylobatidae',
    legalStatus: 'สัตว์ป่าคุ้มครอง • IUCN: Endangered (EN)',
    spoorType: 'tapir_track',
    wikiTitles: ['Lar gibbon', 'ชะนีมือขาว'],
    trackMorphology: 'แทบไม่พบรอยตีนบนดินเพราะใช้ชีวิตบนเรือนยอดไม้ (Arboreal) ร่องรอยหลักคือเสียงร้องกู่ประสานเสียงในตอนเช้า',
    ecologicalRole: 'กระจายเมล็ดพันธุ์ไม้ในชั้นเรือนยอด ห้อยโหนแบบ Brachiation อาศัยในป่าดิบชื้นและป่าดิบแล้งที่สมบูรณ์',
    habitatParks: 'เขาใหญ่, แก่งกระจาน, ฮาลา-บาลา',
    youtubeQuery: 'ชะนีมือขาว เสียงร้อง เขาใหญ่'
  },
  {
    id: 'wl-11-great-hornbill',
    thaiName: 'นกกก',
    scientificName: 'Buceros bicornis',
    orderFamily: 'Order Bucerotiformes • Bucerotidae',
    legalStatus: 'สัตว์ป่าคุ้มครอง • IUCN: Vulnerable (VU)',
    spoorType: 'hornbill_casque',
    wikiTitles: ['Great hornbill', 'นกกก'],
    trackMorphology: 'พบเมล็ดผลไม้ป่าถูกสำรอกทิ้งใต้ต้นไม้ใหญ่ เสียงกระพือปีกดังคล้ายจักรไอน้ำ',
    ecologicalRole: 'เกษตรกรนักปลูกป่า (Keystone Species) กระจายเมล็ดไม้ยืนต้นขนาดใหญ่ บินข้ามหุบเขาไกล ตัวใหญ่สุดในไทย',
    habitatParks: 'เขาใหญ่, ห้วยขาแข้ง, ฮาลา-บาลา',
    youtubeQuery: 'นกกก Great Hornbill เขาใหญ่'
  },
  {
    id: 'wl-12-green-peafowl',
    thaiName: 'นกยูงไทย',
    scientificName: 'Pavo muticus',
    orderFamily: 'Order Galliformes • Phasianidae',
    legalStatus: 'สัตว์ป่าคุ้มครอง • IUCN: Endangered (EN)',
    spoorType: 'cloven_hoof',
    wikiTitles: ['Green peafowl', 'นกยูงไทย'],
    trackMorphology: 'รอยตีนนกขนาดใหญ่ 3 นิ้วชี้ไปข้างหน้า 1 นิ้วชี้ไปข้างหลัง มักพบตามหาดทรายริมลำห้วย',
    ecologicalRole: 'หากินตามป่าเต็งรังและหาดทรายริมน้ำ ชี้วัดป่าเบญจพรรณแล้งที่ปลอดสารเคมี มีหงอนเป็นพู่ชี้ตรง',
    habitatParks: 'ห้วยขาแข้ง, แม่วงก์, ภูเขียว',
    youtubeQuery: 'นกยูงไทย Pavo muticus ห้วยขาแข้ง'
  },
  {
    id: 'wl-13-wild-water-buffalo',
    thaiName: 'ควายป่า',
    scientificName: 'Bubalus arnee',
    orderFamily: 'Order Artiodactyla (สัตว์กีบคู่) • Bovidae',
    legalStatus: 'สัตว์ป่าสงวน • IUCN: Endangered (EN)',
    spoorType: 'cloven_hoof',
    wikiTitles: ['Wild water buffalo', 'ควายป่า'],
    trackMorphology: 'รอยกีบคู่ขนาดใหญ่มากและป้านออกเป็นวงกว้าง (15-18 ซม.) กระจายน้ำหนักในดินเลน',
    ecologicalRole: 'สร้างแอ่งปลักโคลนและรักษาสภาพทุ่งหญ้าริมน้ำ ปัจจุบันเหลือฝูงสุดท้ายของไทยที่ห้วยขาแข้ง',
    habitatParks: 'ห้วยขาแข้ง (ตอนใต้)',
    youtubeQuery: 'ควายป่า ห้วยขาแข้ง ฝูงสุดท้าย'
  },
  {
    id: 'wl-14-barking-deer',
    thaiName: 'เก้ง',
    scientificName: 'Muntiacus muntjak',
    orderFamily: 'Order Artiodactyla (สัตว์กีบคู่) • Cervidae',
    legalStatus: 'สัตว์ป่าคุ้มครอง • IUCN: Least Concern (LC)',
    spoorType: 'cloven_hoof',
    wikiTitles: ['Indian muntjac', 'เก้ง'],
    trackMorphology: 'รอยกีบคู่ขนาดเล็กเรียวแหลม รูปทรงคล้ายหยดน้ำ',
    ecologicalRole: 'เหยื่อหลักของสัตว์กินเนื้อขนาดกลาง-ใหญ่ ส่งเสียงร้องคล้ายสุนัขเห่าเมื่อตกใจ ตัวผู้มีเขาสั้นและเขี้ยวบน',
    habitatParks: 'พบได้แทบทุกอุทยานแห่งชาติในประเทศไทย',
    youtubeQuery: 'เก้ง เสียงร้อง Muntiacus muntjak'
  },
  {
    id: 'wl-15-sambar-deer',
    thaiName: 'กวางป่า',
    scientificName: 'Rusa unicolor',
    orderFamily: 'Order Artiodactyla (สัตว์กีบคู่) • Cervidae',
    legalStatus: 'สัตว์ป่าคุ้มครอง • IUCN: Vulnerable (VU)',
    spoorType: 'cloven_hoof',
    wikiTitles: ['Sambar deer', 'กวางป่า'],
    trackMorphology: 'รอยกีบคู่ขนาดกลาง-ใหญ่ รูปทรงยาวและโค้งมนกว่ารอยเก้ง มักพบรอยถูเขา (Rubbing marks) ตามต้นไม้',
    ecologicalRole: 'สัตว์กีบที่มีปริมาณมาก เป็นแหล่งอาหารสำคัญของเสือโคร่งและหมาใน ชอบกินดินโป่งและแช่น้ำ',
    habitatParks: 'เขาใหญ่, ภูเขียว, แก่งกระจาน',
    youtubeQuery: 'กวางป่า Sambar deer เขาใหญ่'
  }
]

// ============================================================================
// 4. FIELD IDENTIFICATION & DICHOTOMOUS KEY SCENARIOS (อัปเดตแบบเต็มรูปแบบ)
// ============================================================================
const FIELD_EXPEDITION_CASES = [
  {
    id: 'case-01',
    location: 'แปลงตัวอย่างถาวร สถานีวิจัยสะแกราช (วังน้ำเขียว) • ความสูง 550 ม.',
    scenario: 'คุณกำลังวางแปลงสำรวจขนาด 20×20 เมตรในป่าดิบแล้ง พบไม้ยืนต้นเรือนยอดชั้นบน โคนมีพูพอน เปลือกสีน้ำตาลดำแตกร่องลึก',
    clueLeafFruit: '🔍 ส่องด้วยแว่นขยาย 10x: ใบเดี่ยวขนาดเล็กปลายเรียวแหลมเป็นหาง ผลที่ร่วงบนพื้นมีปีกยาว 2 ปีก และปีกสั้น 3 ปีก',
    clueBarkSlash: '🪓 ตรวจเปลือก: รอยถากสีเหลืองอ่อน มีก้อนชันสีขาวใสซึมออกมา ขึ้นหนาแน่นบนดินตื้นหินทราย',
    habitatHint: '🏞️ ถิ่นที่อยู่: ป่าดิบแล้งภาคอีสาน ลำต้นเปลาตรง',
    wikiTitles: ['Hopea ferrea'],
    youtubeQuery: 'ตะเคียนหิน วังน้ำเขียว',
    question: 'จากรูปวิธานภาคสนาม (Dichotomous Key) ไม้ต้นนี้คือชนิดใด?',
    correctAnswer: 'ตะเคียนหิน (Hopea ferrea) • วงศ์ Dipterocarpaceae',
    options: ['ตะเคียนหิน (Hopea ferrea) • วงศ์ Dipterocarpaceae', 'เต็ง (Shorea obtusa) • วงศ์ Dipterocarpaceae', 'สัก (Tectona grandis) • วงศ์ Lamiaceae', 'มะค่าโมง (Afzelia xylocarpa) • วงศ์ Fabaceae'],
    academicExplanation: 'ผลที่มีปีกยาว 2 ปีก ปีกสั้น 3 ปีก ร่วมกับเปลือกสีดำแตกร่องมีชันใสและการขึ้นเป็นไม้เด่นในป่าดิบแล้งบนหินทราย คือลักษณะวินิจฉัยเฉพาะของตะเคียนหิน'
  },
  {
    id: 'case-02',
    location: 'เส้นทางเดินป่า ย.2 - ย.4 อุทยานแห่งชาติดอยขุนตาล • ความสูง 1,250 ม.',
    scenario: 'คุณเดินไต่สันเขาขึ้นมาจนพ้นเขตป่าเต็งรัง เข้าสู่สังคมพืชที่มีต้นไม้ใบรูปเข็มขึ้นปกคลุมและมีโคน (Cone) ร่วงอยู่ตามพื้นดิน',
    clueLeafFruit: '🔍 ตรวจกระจุกใบ (Fascicle): เมื่อดึงกระจุกใบเข็มที่ร่วงมาดูใต้กาบหุ้มโคนใบ พบว่ามีใบเข็มอยู่รวมกันกระจุกละ 3 ใบเสมอ (ยาวประมาณ 15 ซม.)',
    clueBarkSlash: '🪓 ตรวจเปลือกและกล้าไม้: เปลือกสีน้ำตาลอมชมพูแตกเป็นสะเก็ดแผ่นบางหลุดร่วงง่าย และกล้าไม้รอบๆ พุ่งยอดขึ้นทันทีโดยไม่มีระยะหญ้า (Grass stage)',
    habitatHint: '🏞️ ถิ่นที่อยู่: ป่าสนเขาระดับสูง มักมีร่องรอยไฟป่าแผ้วถางหน้าดิน',
    wikiTitles: ['Pinus kesiya'],
    youtubeQuery: 'สนสามใบ ภูกระดึง',
    question: 'พรรณไม้เมล็ดเปลือย (Gymnosperm) ชนิดนี้คือข้อใด?',
    correctAnswer: 'สนสามใบ (Pinus kesiya) • วงศ์ Pinaceae',
    options: ['สนสามใบ (Pinus kesiya) • วงศ์ Pinaceae', 'สนสองใบ (Pinus merkusii) • วงศ์ Pinaceae', 'พญาไม้ (Podocarpus neriifolius) • วงศ์ Podocarpaceae', 'สนแผง (Dacrydium elatum) • วงศ์ Podocarpaceae'],
    academicExplanation: 'การมีใบเข็ม 3 ใบต่อกระจุก เปลือกสีน้ำตาลอมชมพูเป็นสะเก็ดบาง และการไม่มีระยะหญ้าในขั้นกล้าไม้ คือลักษณะจำแนกที่ชัดเจนที่สุดของ สนสามใบ'
  },
  {
    id: 'case-03',
    location: 'หาดทรายริมลำห้วยขาแข้ง เขตรักษาพันธุ์สัตว์ป่าห้วยขาแข้ง • ความสูง 320 ม.',
    scenario: 'ขณะเดินสำรวจเส้นทางริมลำห้วยในตอนเช้าตรู่ คุณพบรอยตีนสัตว์ป่าขนาดใหญ่เดินลงไปกินน้ำและผ่านโป่งดิน',
    clueLeafFruit: '🔍 วัดขนาดและนับนิ้วรอยตีน: รอยตีนมีความชัดเจนมาก พบว่า "ตีนคู่หน้ามี 4 นิ้ว แต่ตีนคู่หลังมีเพียง 3 นิ้ว"',
    clueBarkSlash: '🧭 บริบทนิเวศวิทยา: พบกิ่งไม้พุ่มถูกโน้มลงมากัดกินยอดอ่อน และกองมูลในน้ำตื้นที่มีเมล็ดผลไม้ป่าปะปนอยู่จำนวนมาก',
    habitatHint: '🏞️ ถิ่นที่อยู่: สัตว์กีบคี่ที่ชอบหากินในน้ำและเป็นผู้กระจายเมล็ดพันธุ์ชั้นยอด',
    wikiTitles: ['Malayan tapir'],
    youtubeQuery: 'สมเสร็จ ห้วยขาแข้ง',
    question: 'รอยตีนสัตว์กีบคี่ (Perissodactyla) ที่มีตีนหน้า 4 นิ้ว ตีนหลัง 3 นิ้ว คือสัตว์ป่าชนิดใด?',
    correctAnswer: 'สมเสร็จ (Tapirus indicus)',
    options: ['สมเสร็จ (Tapirus indicus)', 'ควายป่า (Bubalus arnee)', 'เสือโคร่ง (Panthera tigris)', 'เลียงผา (Capricornis sumatraensis)'],
    academicExplanation: 'สมเสร็จเป็นสัตว์กีบคี่เพียงชนิดเดียวในป่าไทยที่มีนิ้วตีนหน้า 4 นิ้ว และตีนหลัง 3 นิ้ว คงลักษณะดึกดำบรรพ์'
  },
  {
    id: 'case-04',
    location: 'ป่าเบญจพรรณ อุทยานแห่งชาติเอราวัณ จ.กาญจนบุรี',
    scenario: 'คุณพบไม้ยืนต้นขนาดใหญ่ในป่าเบญจพรรณที่มีกอไผ่ขึ้นปะปน ลำต้นสีเทาอ่อน กิ่งอ่อนเป็นสี่เหลี่ยม',
    clueLeafFruit: '🔍 ตรวจใบและผล: ใบเดี่ยวขนาดใหญ่มาก เรียงตรงข้ามสลับตั้งฉาก ผิวใบด้านบนสากเหมือนกระดาษทราย เมื่อขยี้ใบอ่อนกับมือได้น้ำสีแดงคล้ายเลือด',
    clueBarkSlash: '🪓 ตรวจผลบนพื้น: พบผลกลมที่มีกลีบเลี้ยงพองโตหุ้มเป็นถุงบางๆ คล้ายโคมไฟ',
    habitatHint: '🏞️ ถิ่นที่อยู่: ป่าผลัดใบที่มีไผ่ขึ้นปะปน โดดเด่นเรื่องลวดลายเนื้อไม้ราคาแพง',
    wikiTitles: ['Tectona grandis'],
    youtubeQuery: 'ไม้สัก ป่าเบญจพรรณ',
    question: 'ลักษณะใบเดี่ยวเรียงตรงข้ามขนาดใหญ่ ขยี้ใบอ่อนได้สีแดง และผลมีถุงกลีบเลี้ยงหุ้ม คือไม้ชนิดใด?',
    correctAnswer: 'สัก (Tectona grandis) • วงศ์ Lamiaceae',
    options: ['สัก (Tectona grandis) • วงศ์ Lamiaceae', 'ยางนา (Dipterocarpus alatus) • วงศ์ Dipterocarpaceae', 'แดง (Xylia xylocarpa) • วงศ์ Fabaceae', 'ก่วมแดง (Acer calcaratum) • วงศ์ Sapindaceae'],
    academicExplanation: 'ต่อมสีแดงใต้ใบอ่อนที่ขยี้แล้วให้สีแดงเลือดนก ร่วมกับการเรียงใบแบบตรงข้ามสลับตั้งฉากและกลีบเลี้ยงพองหุ้มผล คือลักษณะประจำพันธุ์ของ ไม้สัก'
  },
  {
    id: 'case-05',
    location: 'ด่านสัตว์ป่าบนสันเขา อุทยานแห่งชาติแม่วงก์ • ความสูง 900 ม.',
    scenario: 'ทีมลาดตระเวนเชิงคุณภาพ (SMART Patrol) พบรอยอุ้งตีนสัตว์ผู้ล่าขนาดใหญ่ทับอยู่บนรอยตีนกวางป่า',
    clueLeafFruit: '🔍 วิเคราะห์สัณฐานรอยตีน (Pugmark): อุ้งตีนหลักรูปสี่เหลี่ยมคางหมู กว้าง 10.2 ซม. ด้านหน้าเว้า ด้านหลังมี 3 หยัก มีนิ้วตีน 4 นิ้วด้านหน้าโดย "ไม่มีรอยปลายเล็บปรากฏบนดิน"',
    clueBarkSlash: '🧭 บริบทนิเวศวิทยา: พบรอยตะกุยดินทำเครื่องหมายอาณาเขต (Scrape mark) และรอยพ่นปัสสาวะตามโคนต้นไม้ใหญ่ริมด่าน',
    habitatHint: '🏞️ ถิ่นที่อยู่: ผู้ล่าสูงสุดที่รักษาสมดุลประชากรสัตว์กีบในป่าใหญ่ฝั่งตะวันตก',
    wikiTitles: ['Indochinese tiger'],
    youtubeQuery: 'เสือโคร่งอินโดจีน ห้วยขาแข้ง',
    question: 'รอยตีนสัตว์ผู้ล่าขนาดใหญ่ที่หดเล็บเก็บได้ (ไม่เห็นรอยเล็บในรอยตีน) คือสัตว์ชนิดใด?',
    correctAnswer: 'เสือโคร่งอินโดจีน (Panthera tigris corbetti)',
    options: ['เสือโคร่งอินโดจีน (Panthera tigris corbetti)', 'หมีควาย (Ursus thibetanus)', 'หมาใน (Cuon alpinus)', 'ชะมดแผงหางปล้อง (Viverra zibetha)'],
    academicExplanation: 'สัตว์ในวงศ์เสือและแมว (Felidae) มีกลไกหดเก็บเล็บ (Retractile claws) เวลาเดินปกติจึงไม่ปรากฏรอยเล็บใน Pugmark ต่างจากหมาในและหมีที่จะเห็นรอยเล็บชัดเจน'
  },
  {
    id: 'case-06',
    location: 'ป่าเต็งรังลานหิน อุทยานแห่งชาติภูผาเทิบ',
    scenario: 'คุณสำรวจพื้นที่ดอนดินตื้นปนกรวดหิน พบไม้ยืนต้นเปลือกหนาแตกเป็นร่องลึก ทนไฟป่าได้ดีเยี่ยม',
    clueLeafFruit: '🔍 ตรวจผลมีปีกบนพื้นป่า: ผลแห้งมีปีกที่เกิดจากกลีบเลี้ยง แต่เมื่อนับจำนวนปีกพบว่ามี "ปีกยาว 3 ปีก และปีกสั้น 2 ปีก"',
    clueBarkSlash: '🪓 ตรวจใบ: ใบรูปไข่ โคนใบเว้าเป็นรูปหัวใจชัดเจน ก้านใบยาว ผิวใบเกลี้ยง',
    habitatHint: '🏞️ ถิ่นที่อยู่: ป่าเต็งรังดินลูกรัง ทนไฟป่าและทนแล้งจัด',
    wikiTitles: ['Shorea siamensis'],
    youtubeQuery: 'ต้นรัง ป่าเต็งรัง',
    question: 'ไม้ในวงศ์ยางที่มีผล 3 ปีกยาว 2 ปีกสั้น และโคนใบเว้ารูปหัวใจในป่าเต็งรังคือชนิดใด?',
    correctAnswer: 'รัง (Shorea siamensis) • วงศ์ Dipterocarpaceae',
    options: ['รัง (Shorea siamensis) • วงศ์ Dipterocarpaceae', 'ยางนา (Dipterocarpus alatus) • วงศ์ Dipterocarpaceae', 'พะยูง (Dalbergia cochinchinensis) • วงศ์ Fabaceae', 'ค้อเชียงดาว (Trachycarpus oreophilus) • วงศ์ Arecaceae'],
    academicExplanation: 'สกุล Shorea (เต็งและรัง) มีผลที่มีปีกยาว 3 ปีก ปีกสั้น 2 ปีกเสมอ โดยสามารถแยกรังออกจากเต็งได้ทันทีจากโคนใบที่เว้าเป็นรูปหัวใจ'
  }
]

// ============================================================================
// 5. SUB-COMPONENT: ภาพถ่ายสารานุกรมจริง (Wikipedia Taxonomic Photo) + สลับดู SVG Key
// ============================================================================
function BotanicalAndSpoorMedia({ svgType, wikiTitles = [], title }) {
  const [realPhotoUrl, setRealPhotoUrl] = useState(null)
  const [loadingPhoto, setLoadingPhoto] = useState(true)
  const [showVector, setShowVector] = useState(false)
  const [imgFailed, setImgFailed] = useState(false)

  useEffect(() => {
    let isMounted = true
    setLoadingPhoto(true)
    setImgFailed(false)

    fetchRealWikiPhoto(wikiTitles).then(url => {
      if (isMounted) {
        setRealPhotoUrl(url)
        setLoadingPhoto(false)
      }
    })

    return () => {
      isMounted = false
    }
  }, [wikiTitles])

  const useRealPhoto = realPhotoUrl && !imgFailed && !showVector

  return (
    <div className="w-40 h-40 sm:w-44 sm:h-44 rounded-2xl bg-slate-950 border border-emerald-700/60 flex flex-col items-center justify-center shrink-0 relative overflow-hidden group shadow-md">
      {loadingPhoto ? (
        <div className="flex flex-col items-center justify-center p-3 text-center">
          <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mb-2" />
          <span className="text-[10px] font-bold text-emerald-300">กำลังค้นหารูปถ่ายจริง...</span>
        </div>
      ) : useRealPhoto ? (
        <>
          <img
            src={realPhotoUrl}
            alt={title}
            onError={() => setImgFailed(true)}
            className="w-full h-full object-cover object-center group-hover:scale-105 transition duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent" />
          <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 text-[9px] font-black bg-emerald-950/90 text-emerald-300 border border-emerald-500/40 rounded">
            ✓ ภาพจริง Wikipedia
          </span>
          <button
            type="button"
            onClick={() => setShowVector(true)}
            className="absolute bottom-2 left-2 right-2 py-1 px-2 text-[10px] font-extrabold text-emerald-300 bg-slate-950/90 border border-emerald-500/50 rounded-lg hover:bg-emerald-900/80 transition text-center"
          >
            📐 ดูคีย์สัณฐาน SVG
          </button>
        </>
      ) : (
        <div className="w-full h-full p-2 flex flex-col items-center justify-center relative">
          {realPhotoUrl && !imgFailed && (
            <button
              type="button"
              onClick={() => setShowVector(false)}
              className="absolute top-1.5 right-1.5 px-2 py-0.5 text-[9px] font-black text-amber-300 bg-slate-900 border border-amber-500/40 rounded-md hover:bg-slate-800 z-10"
            >
              📸 ภาพจริง
            </button>
          )}
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {svgType === 'two_wing_samara' && (
              <g>
                <path d="M50,68 C32,42 18,18 26,10 C34,6 46,35 50,65" fill="#f43f5e" fillOpacity="0.75" stroke="#fda4af" strokeWidth="1.5" />
                <path d="M50,68 C68,42 82,18 74,10 C66,6 54,35 50,65" fill="#e11d48" fillOpacity="0.75" stroke="#fda4af" strokeWidth="1.5" />
                <circle cx="50" cy="74" r="10" fill="#78350f" stroke="#fcd34d" strokeWidth="1.5" />
                <text x="50" y="95" textAnchor="middle" className="text-[8px] font-bold fill-emerald-300">ผล 2 ปีกยาว (Samara)</text>
              </g>
            )}
            {svgType === 'three_wing_samara' && (
              <g>
                <path d="M50,68 C26,45 14,22 22,14 C30,10 42,38 48,65" fill="#f59e0b" fillOpacity="0.7" stroke="#fcd34d" strokeWidth="1.2" />
                <path d="M50,68 C50,38 46,12 50,8 C54,12 50,38 50,68" fill="#d97706" fillOpacity="0.8" stroke="#fde68a" strokeWidth="1.2" />
                <path d="M50,68 C74,45 86,22 78,14 C70,10 58,38 52,65" fill="#f59e0b" fillOpacity="0.7" stroke="#fcd34d" strokeWidth="1.2" />
                <circle cx="50" cy="74" r="9" fill="#78350f" stroke="#fde68a" strokeWidth="1.5" />
                <text x="50" y="95" textAnchor="middle" className="text-[8px] font-bold fill-amber-300">ผล 3 ปีกยาว (Shorea)</text>
              </g>
            )}
            {svgType === 'opposite_large_leaf' && (
              <g>
                <line x1="50" y1="12" x2="50" y2="82" stroke="#a3e635" strokeWidth="2.5" />
                <ellipse cx="28" cy="46" rx="18" ry="12" fill="#10b981" fillOpacity="0.75" stroke="#6ee7b7" strokeWidth="1.5" />
                <ellipse cx="72" cy="46" rx="18" ry="12" fill="#10b981" fillOpacity="0.75" stroke="#6ee7b7" strokeWidth="1.5" />
                <circle cx="28" cy="46" r="3" fill="#f43f5e" />
                <circle cx="72" cy="46" r="3" fill="#f43f5e" />
                <text x="50" y="95" textAnchor="middle" className="text-[8px] font-bold fill-emerald-300">ใบตรงข้าม + ต่อมสีแดง</text>
              </g>
            )}
            {svgType === 'pod_orange_aril' && (
              <g>
                <rect x="20" y="20" width="60" height="32" rx="12" fill="#78350f" stroke="#d97706" strokeWidth="2" />
                <ellipse cx="42" cy="66" rx="9" ry="7" fill="#0f172a" stroke="#cbd5e1" strokeWidth="1" />
                <path d="M33,66 Q42,78 51,66" fill="none" stroke="#f97316" strokeWidth="5" strokeLinecap="round" />
                <text x="50" y="95" textAnchor="middle" className="text-[8px] font-bold fill-amber-300">ฝักถั่ว & เยื่อ Aril สีส้ม</text>
              </g>
            )}
            {svgType === 'pine_needle_cone' && (
              <g>
                <rect x="28" y="68" width="8" height="10" rx="2" fill="#78350f" />
                <line x1="32" y1="68" x2="14" y2="16" stroke="#34d399" strokeWidth="2" strokeLinecap="round" />
                <line x1="32" y1="68" x2="32" y2="12" stroke="#6ee7b7" strokeWidth="2" strokeLinecap="round" />
                <line x1="32" y1="68" x2="48" y2="18" stroke="#34d399" strokeWidth="2" strokeLinecap="round" />
                <polygon points="72,24 58,66 86,66" fill="#92400e" stroke="#fbbf24" strokeWidth="1.5" />
                <text x="50" y="95" textAnchor="middle" className="text-[8px] font-bold fill-emerald-300">กระจุกใบเข็ม & โคนสน</text>
              </g>
            )}
            {svgType === 'maple_samara' && (
              <g>
                <polygon points="50,12 38,34 18,28 30,52 50,58 70,52 82,28 62,34" fill="#f43f5e" stroke="#fda4af" strokeWidth="1.5" />
                <line x1="50" y1="58" x2="50" y2="78" stroke="#fda4af" strokeWidth="2" />
                <text x="50" y="95" textAnchor="middle" className="text-[8px] font-bold fill-rose-300">ใบ 3 แฉก (Palmate)</text>
              </g>
            )}
            {svgType === 'palm_fan' && (
              <g>
                {[20, 35, 50, 65, 80].map((xPos, i) => (
                  <line key={i} x1="50" y1="72" x2={xPos} y2="18" stroke="#34d399" strokeWidth="3" strokeLinecap="round" />
                ))}
                <circle cx="50" cy="72" r="5" fill="#10b981" />
                <text x="50" y="95" textAnchor="middle" className="text-[8px] font-bold fill-emerald-300">ใบรูปพัด (Fan Palm)</text>
              </g>
            )}
            {svgType === 'tapir_track' && (
              <g>
                <ellipse cx="32" cy="54" rx="12" ry="10" fill="#38bdf8" fillOpacity="0.7" />
                <circle cx="20" cy="34" r="4" fill="#7dd3fc" />
                <circle cx="29" cy="30" r="4.5" fill="#7dd3fc" />
                <circle cx="38" cy="32" r="4" fill="#7dd3fc" />
                <circle cx="45" cy="40" r="3.5" fill="#fbbf24" />
                <text x="50" y="95" textAnchor="middle" className="text-[8px] font-bold fill-sky-300">รอยตีนหน้า 4 / หลัง 3</text>
              </g>
            )}
            {svgType === 'tiger_pugmark' && (
              <g>
                <polygon points="34,48 66,48 72,68 28,68" fill="#fbbf24" fillOpacity="0.8" />
                <ellipse cx="26" cy="34" rx="5" ry="7" fill="#fde68a" />
                <ellipse cx="42" cy="26" rx="5.5" ry="7.5" fill="#fde68a" />
                <ellipse cx="58" cy="26" rx="5.5" ry="7.5" fill="#fde68a" />
                <ellipse cx="74" cy="34" rx="5" ry="7" fill="#fde68a" />
                <text x="50" y="95" textAnchor="middle" className="text-[8px] font-bold fill-amber-300">Pugmark (ไร้รอยเล็บ)</text>
              </g>
            )}
            {(svgType === 'cloven_hoof' || svgType === 'hornbill_casque') && (
              <g>
                <path d="M44,18 C26,32 24,62 44,72 Z" fill="#34d399" />
                <path d="M56,18 C74,32 76,62 56,72 Z" fill="#34d399" />
                <text x="50" y="95" textAnchor="middle" className="text-[8px] font-bold fill-emerald-300">รอยกีบคู่ / ดัชนีสัตว์ป่า</text>
              </g>
            )}
          </svg>
        </div>
      )}
    </div>
  )
}

function EcosystemPhotoBanner({ eco }) {
  const [photoUrl, setPhotoUrl] = useState(null)

  useEffect(() => {
    let mounted = true
    fetchRealWikiPhoto(eco.wikiTitles).then(url => {
      if (mounted && url) setPhotoUrl(url)
    })
    return () => {
      mounted = false
    }
  }, [eco.wikiTitles])

  return (
    <div className="relative h-48 w-full overflow-hidden bg-slate-950">
      {photoUrl && (
        <img
          src={photoUrl}
          alt={eco.nameTh}
          className="w-full h-full object-cover object-center opacity-85 hover:scale-105 transition duration-500"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/30 to-transparent" />
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
        <span className="px-2.5 py-1 text-[10px] font-black uppercase bg-slate-950/85 text-emerald-300 border border-emerald-500/40 rounded-lg">
          {eco.type}
        </span>
        <a
          href={`https://www.youtube.com/results?search_query=${encodeURIComponent(eco.youtubeQuery)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1 text-[11px] font-extrabold text-white bg-rose-600/95 rounded-lg hover:bg-rose-500 shadow-xs"
        >
          ▶ ดูสารคดีป่านี้
        </a>
      </div>
      <div className="absolute bottom-3 left-4 right-4">
        <h3 className="text-base font-black text-white drop-shadow-xs">{eco.nameTh}</h3>
      </div>
    </div>
  )
}

export default function ForestryAcademicHub() {
  const [activeSection, setActiveSection] = useState('dendrology')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [familyFilter, setFamilyFilter] = useState('All')

  const [caseIdx, setCaseIdx] = useState(0)
  const [xpPoints, setXpPoints] = useState(0)
  const [streakCount, setStreakCount] = useState(0)
  const [inspectedClues, setInspectedClues] = useState({ lens: false, slash: false })
  const [selectedChoice, setSelectedChoice] = useState(null)

  const filteredSpecies = ACADEMIC_DENDROLOGY_DB.filter(sp => {
    const matchFam = familyFilter === 'All' || sp.family.includes(familyFilter)
    const kw = searchKeyword.trim().toLowerCase()
    const matchKw =
      !kw ||
      sp.thaiName.toLowerCase().includes(kw) ||
      sp.scientificName.toLowerCase().includes(kw) ||
      sp.forestType.toLowerCase().includes(kw) ||
      sp.leafMorphology.toLowerCase().includes(kw)
    return matchFam && matchKw
  })

  const academicRank =
    xpPoints >= 50
      ? '🏅 นักวิจัยรุกขวิทยาและนิเวศวิทยาอาวุโส (Senior Forest Scientist)'
      : xpPoints >= 30
        ? '🌲 นักวิชาการป่าไม้ปฏิบัติการ (Forestry Officer)'
        : xpPoints >= 10
          ? '🧭 หัวหน้าชุดสำรวจแปลงตัวอย่าง (Field Plot Leader)'
          : '🌱 นิสิตวนศาสตร์ฝึกงานภาคสนาม (Forestry Cadet)'

  const currentCase = FIELD_EXPEDITION_CASES[caseIdx % FIELD_EXPEDITION_CASES.length]
  const sortedCaseOptions = [...currentCase.options].sort((a, b) => a.localeCompare(b, 'th'))

  const handleSelectCaseOption = (opt) => {
    if (selectedChoice !== null) return
    const isCorrect = opt === currentCase.correctAnswer
    setSelectedChoice({ opt, isCorrect })
    if (isCorrect) {
      setXpPoints(prev => prev + 10)
      setStreakCount(prev => prev + 1)
    } else {
      setStreakCount(0)
    }
  }

  const handleNextFieldCase = () => {
    setSelectedChoice(null)
    setInspectedClues({ lens: false, slash: false })
    setCaseIdx(prev => prev + 1)
  }

  return (
    <div className="bg-gradient-to-br from-stone-950 via-emerald-950 to-slate-950 text-white rounded-3xl border border-emerald-700/50 shadow-2xl overflow-hidden">
      
      {/* Academic Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5 bg-emerald-950/90 border-b border-emerald-800/60">
        <div className="flex items-center gap-3.5">
          <div className="flex items-center justify-center w-12 h-12 text-2xl bg-emerald-500/20 border border-emerald-400/40 rounded-2xl">
            🌿
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 text-[10px] font-black tracking-wider text-emerald-950 bg-emerald-400 rounded-md uppercase">
                WIKIMEDIA TAXONOMIC ARCHIVE
              </span>
              <span className="px-2.5 py-0.5 text-[10px] font-bold text-amber-300 bg-amber-950/80 border border-amber-500/40 rounded-md">
                ดึงภาพถ่ายจริงตรงสายพันธุ์จากสารานุกรม Wikipedia 100%
              </span>
            </div>
            <h2 className="text-lg font-black text-white mt-1">
              คลังความรู้รุกขวิทยา (Dendrology) • สังคมพืชป่าไม้ไทย • ชีววิทยาสัตว์ป่า & เกมจำลองภาคสนาม
            </h2>
          </div>
        </div>

        <div className="px-3.5 py-2 bg-slate-950/90 border border-emerald-700/60 rounded-2xl text-right">
          <span className="text-[10px] font-bold text-slate-400 block">ระดับความเชี่ยวชาญภาคสนามของคุณ</span>
          <strong className="text-xs font-extrabold text-emerald-300">{academicRank} ({xpPoints} XP)</strong>
        </div>
      </div>

      {/* Navigation Bar */}
      <div className="flex flex-wrap gap-2 px-6 py-3.5 bg-slate-950/80 border-b border-emerald-900/60">
        {[
          { id: 'dendrology', label: '🌳 1. รุกขวิทยา & สัณฐานวิทยาไม้ป่าไทย (Dendrology Herbarium)' },
          { id: 'ecosystems', label: '🏞️ 2. นิเวศวิทยาและสังคมพืชป่าไม้ 6 ชนิด (Forest Ecology)' },
          { id: 'wildlife', label: '🦌 3. ชีววิทยาสัตว์ป่า & รอยตีนสัตว์ป่า (Wildlife & Spoor Atlas)' },
          { id: 'simulator', label: '🔬 4. เกมจำลองสำรวจแปลงตัวอย่าง & รูปวิธานภาคสนาม (Field Simulator)' }
        ].map(sec => (
          <button
            key={sec.id}
            type="button"
            onClick={() => setActiveSection(sec.id)}
            className={`px-4 py-2 text-xs font-extrabold rounded-xl border transition ${
              activeSection === sec.id
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm'
                : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-emerald-950/60'
            }`}
          >
            {sec.label}
          </button>
        ))}
      </div>

      <div className="p-6 space-y-6">
        
        {/* SECTION 1: รุกขวิทยา */}
        {activeSection === 'dendrology' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-12 p-4 bg-slate-900/90 border border-emerald-800/50 rounded-2xl">
              <div className="md:col-span-7">
                <label className="block text-[11px] font-bold text-emerald-400 mb-1">
                  ค้นหาชื่อพรรณไม้ / ชื่อวิทยาศาสตร์ / ลักษณะใบและผล:
                </label>
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  placeholder="เช่น Hopea, Dipterocarpus, ตะเคียนหิน, ยางนา, สนสามใบ, ผลมีปีก..."
                  className="w-full px-3.5 py-2 text-xs font-medium text-white bg-slate-950 border border-emerald-700/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              <div className="md:col-span-5">
                <label className="block text-[11px] font-bold text-emerald-400 mb-1">
                  กรองตามวงศ์พฤกษศาสตร์ (Botanical Family):
                </label>
                <select
                  value={familyFilter}
                  onChange={(e) => setFamilyFilter(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold text-white bg-slate-950 border border-emerald-700/60 rounded-xl outline-none"
                >
                  <option value="All">ทุกวงศ์พรรณไม้หลัก ({ACADEMIC_DENDROLOGY_DB.length} ชนิดเด่น)</option>
                  <option value="Dipterocarpaceae">Dipterocarpaceae (วงศ์ยาง - ยางนา/ตะเคียน/เต็ง/รัง)</option>
                  <option value="Fabaceae">Fabaceae / Leguminosae (วงศ์ถั่ว - มะค่าโมง/พะยูง)</option>
                  <option value="Pinaceae">Pinaceae (วงศ์สนเขา - สนสองใบ/สนสามใบ)</option>
                  <option value="Lamiaceae">Lamiaceae (วงศ์กะเพรา - สัก)</option>
                  <option value="Sapindaceae">Sapindaceae (ก่วมแดง/เมเปิลไทย)</option>
                  <option value="Arecaceae">Arecaceae (วงศ์ปาล์ม - ค้อเชียงดาว)</option>
                  <option value="Poaceae">Poaceae (วงศ์หญ้า - ไผ่ป่า)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5">
              {filteredSpecies.map(sp => (
                <div
                  key={sp.id}
                  className="p-5 bg-slate-900/95 border border-emerald-800/60 rounded-3xl space-y-4 hover:border-emerald-500 transition"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4 pb-3 border-b border-slate-800">
                    <div className="flex flex-col sm:flex-row items-start gap-4">
                      <BotanicalAndSpoorMedia
                        svgType={sp.svgType}
                        wikiTitles={sp.wikiTitles}
                        title={sp.thaiName}
                      />
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-black text-white">{sp.thaiName}</h3>
                          <span className="px-2.5 py-0.5 text-xs font-bold italic text-emerald-300 bg-emerald-950 border border-emerald-700 rounded-lg">
                            {sp.scientificName}
                          </span>
                          <span className="px-2.5 py-0.5 text-[11px] font-extrabold text-amber-300 bg-amber-950/70 border border-amber-600/40 rounded-lg">
                            {sp.family}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-sky-300 mt-1.5">
                          🏞️ ถิ่นอาศัยและสังคมพืช: {sp.forestType}
                        </p>
                        <p className="text-xs text-slate-300 mt-1">{sp.conservationAndUse}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <a
                        href={`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(sp.thaiName + ' ' + sp.scientificName)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-2 text-xs font-extrabold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl shadow-xs transition shrink-0"
                      >
                        🖼️ ดูคลังภาพ Google
                      </a>
                      <a
                        href={`https://www.youtube.com/results?search_query=${encodeURIComponent(sp.youtubeQuery)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 text-xs font-extrabold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-xs transition shrink-0"
                      >
                        ▶ คลิป YouTube
                      </a>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 text-xs">
                    <div className="p-3.5 bg-slate-950/90 border border-slate-800 rounded-2xl">
                      <span className="text-[11px] font-black text-amber-400 uppercase block mb-1">
                        1. ลักษณะวิสัย เปลือกไม้ และรอยถาก (Habit, Bark & Slash)
                      </span>
                      <p className="text-slate-200 leading-relaxed">{sp.barkAndSlash}</p>
                    </div>

                    <div className="p-3.5 bg-slate-950/90 border border-slate-800 rounded-2xl">
                      <span className="text-[11px] font-black text-emerald-400 uppercase block mb-1">
                        2. สัณฐานวิทยาใบและเรือนยอด (Leaf & Vegetative Morphology)
                      </span>
                      <p className="text-slate-200 leading-relaxed">{sp.leafMorphology}</p>
                    </div>

                    <div className="p-3.5 bg-slate-950/90 border border-slate-800 rounded-2xl">
                      <span className="text-[11px] font-black text-rose-400 uppercase block mb-1">
                        3. สัณฐานวิทยาดอก ผล และเมล็ด (Reproductive & Fruit Key)
                      </span>
                      <p className="text-slate-200 leading-relaxed">{sp.fruitAndSeed}</p>
                    </div>

                    <div className="p-3.5 bg-slate-950/90 border border-slate-800 rounded-2xl">
                      <span className="text-[11px] font-black text-sky-400 uppercase block mb-1">
                        4. ลักษณะทางวนวัฒนวิทยาและการสืบพันธุ์ (Silviculture & Regeneration)
                      </span>
                      <p className="text-slate-200 leading-relaxed">{sp.silviculture}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECTION 2: สังคมพืชป่าไม้ */}
        {activeSection === 'ecosystems' && (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {THAI_FOREST_ECOSYSTEMS.map(eco => (
              <div
                key={eco.id}
                className="bg-slate-900/95 border border-emerald-800/60 rounded-3xl flex flex-col justify-between overflow-hidden shadow-md"
              >
                <div>
                  <EcosystemPhotoBanner eco={eco} />

                  <div className="p-5 space-y-3">
                    <div className="grid grid-cols-2 gap-2 p-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs">
                      <div>
                        <span className="text-slate-400 block text-[11px]">การกระจายตามความสูง:</span>
                        <strong className="text-emerald-300">{eco.elevationRange}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">ปริมาณน้ำฝนเฉลี่ย:</span>
                        <strong className="text-sky-300">{eco.rainfallMm}</strong>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs">
                      <p className="text-slate-200 leading-relaxed">
                        <strong className="text-amber-300">โครงสร้างชั้นเรือนยอด (Canopy Strata):</strong> {eco.canopyStructure}
                      </p>
                      <p className="text-slate-200 leading-relaxed">
                        <strong className="text-emerald-300">พรรณไม้ดัชนีชี้วัด (Indicator Species):</strong> {eco.indicatorSpecies}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mx-5 mb-5 p-3 bg-emerald-950/60 border border-emerald-800/60 rounded-2xl text-xs text-emerald-200">
                  📍 <strong>พื้นที่ตัวแทนศึกษาในไทย:</strong> {eco.representativeSites}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* SECTION 3: สัตว์ป่าสงวนและสัตว์ป่าคุ้มครอง */}
        {activeSection === 'wildlife' && (
          <div className="space-y-4">
            {WILDLIFE_CONSERVATION_DB.map(wl => (
              <div
                key={wl.id}
                className="p-5 bg-slate-900/95 border border-emerald-800/60 rounded-3xl space-y-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-4 pb-3 border-b border-slate-800">
                  <div className="flex flex-col sm:flex-row items-start gap-4">
                    <BotanicalAndSpoorMedia
                      svgType={wl.spoorType}
                      wikiTitles={wl.wikiTitles}
                      title={wl.thaiName}
                    />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-black text-white">{wl.thaiName}</h3>
                        <span className="px-2.5 py-0.5 text-xs font-bold italic text-amber-300 bg-amber-950/80 border border-amber-600/40 rounded-lg">
                          {wl.scientificName}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-emerald-300 mt-1">{wl.orderFamily}</p>
                      <p className="text-xs font-semibold text-rose-300 mt-1">
                        🛡️ สถานะกฎหมายและอนุรักษ์: {wl.legalStatus}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <a
                      href={`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(wl.thaiName + ' ' + wl.scientificName)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 text-xs font-extrabold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition shrink-0"
                    >
                      🖼️ ดูภาพจริง Google
                    </a>
                    <a
                      href={`https://www.youtube.com/results?search_query=${encodeURIComponent(wl.youtubeQuery)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 text-xs font-extrabold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition shrink-0"
                    >
                      ▶ คลิปสารคดีสัตว์ป่านี้
                    </a>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3 text-xs">
                  <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl">
                    <span className="text-[11px] font-black text-sky-400 uppercase block mb-1">
                      🐾 สัณฐานวิทยารอยตีนและร่องรอย (Track & Spoor ID)
                    </span>
                    <p className="text-slate-200 leading-relaxed">{wl.trackMorphology}</p>
                  </div>

                  <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl">
                    <span className="text-[11px] font-black text-emerald-400 uppercase block mb-1">
                      🌱 บทบาททางนิเวศวิทยา (Ecological Niche)
                    </span>
                    <p className="text-slate-200 leading-relaxed">{wl.ecologicalRole}</p>
                  </div>

                  <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl">
                    <span className="text-[11px] font-black text-amber-400 uppercase block mb-1">
                      🗺️ เขตการกระจายพันธุ์สำคัญในไทย
                    </span>
                    <p className="text-slate-200 leading-relaxed">{wl.habitatParks}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* SECTION 4: เกมจำลองภาคสนาม */}
        {activeSection === 'simulator' && (
          <div className="max-w-3xl mx-auto p-6 bg-slate-900/95 border-2 border-emerald-500/50 rounded-3xl space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
              <div>
                <span className="px-2.5 py-0.5 text-[10px] font-black text-slate-950 bg-emerald-400 rounded uppercase">
                  FORESTRY FIELD PLOT & DICHOTOMOUS KEY SIMULATOR
                </span>
                <h3 className="text-lg font-black text-white mt-1">
                  ภารกิจจำแนกพรรณไม้และร่องรอยสัตว์ป่าภาคสนาม (โจทย์ที่ {caseIdx + 1} / {FIELD_EXPEDITION_CASES.length})
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 text-xs font-extrabold text-amber-300 bg-slate-950 border border-amber-500/40 rounded-xl">
                  🔥 ตอบถูกต่อเนื่อง: {streakCount}
                </span>
                <span className="px-3 py-1.5 text-xs font-black text-emerald-300 bg-emerald-950 border border-emerald-500/40 rounded-xl">
                  ⭐ {xpPoints} XP
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start gap-4 p-4 bg-slate-950 border border-emerald-800/60 rounded-2xl">
              {/* โชว์ภาพจริงแบบเนียนๆ เมื่อตอบถูกแล้ว */}
              {selectedChoice?.isCorrect && (
                 <BotanicalAndSpoorMedia svgType="tapir_track" wikiTitles={currentCase.wikiTitles} title={currentCase.correctAnswer} />
              )}
              <div className="space-y-2 flex-1">
                <div className="text-xs font-extrabold text-emerald-400">📍 พิกัดแปลงสำรวจ: {currentCase.location}</div>
                <p className="text-sm font-bold text-white leading-relaxed">{currentCase.scenario}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(currentCase.youtubeQuery)}`} target="_blank" rel="noopener noreferrer" className="px-3 py-1 text-[10px] font-bold text-white bg-rose-600 rounded-lg hover:bg-rose-500 transition">
                    ▶ ดูคลิปสารคดีประกอบการตัดสินใจ
                  </a>
                  <span className="px-3 py-1 text-[10px] font-bold text-sky-200 bg-sky-900/50 rounded-lg border border-sky-800">
                    {currentCase.habitatHint}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="text-xs font-bold text-slate-300">
                🛠️ กดใช้อุปกรณ์สำรวจภาคสนามเพื่อตรวจสอบลักษณะทางสัณฐานวิทยา (ไม่หักคะแนน):
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setInspectedClues(prev => ({ ...prev, lens: true }))}
                  className="p-3.5 text-left bg-emerald-950/70 border border-emerald-600/50 rounded-2xl hover:bg-emerald-900/70 transition"
                >
                  <div className="text-xs font-extrabold text-emerald-300">
                    🔍 1. ใช้แว่นขยาย 10x ส่องดูใบ ผล หรือวัดขนาดรอยตีน
                  </div>
                  <p className="text-xs text-white mt-1 leading-relaxed">
                    {inspectedClues.lens ? currentCase.clueLeafFruit : 'คลิกเพื่อเปิดผลตรวจสัณฐานวิทยาใบ/ผล/รอยตีน...'}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setInspectedClues(prev => ({ ...prev, slash: true }))}
                  className="p-3.5 text-left bg-amber-950/50 border border-amber-600/50 rounded-2xl hover:bg-amber-900/50 transition"
                >
                  <div className="text-xs font-extrabold text-amber-300">
                    🪓 2. ตรวจลักษณะเปลือกไม้ รอยถาก และบริบทนิเวศวิทยา
                  </div>
                  <p className="text-xs text-white mt-1 leading-relaxed">
                    {inspectedClues.slash ? currentCase.clueBarkSlash : 'คลิกเพื่อเปิดผลตรวจเปลือกไม้/น้ำยาง/ร่องรอยข้างเคียง...'}
                  </p>
                </button>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="text-sm font-black text-emerald-300">{currentCase.question}</div>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {sortedCaseOptions.map((opt, idx) => {
                  const isPicked = selectedChoice?.opt === opt
                  const isRightOpt = opt === currentCase.correctAnswer

                  let btnStyle = 'bg-slate-950 border-slate-700 text-slate-200 hover:border-emerald-400'
                  if (selectedChoice) {
                    if (isRightOpt) {
                      btnStyle = 'bg-emerald-600 text-white border-emerald-300 ring-2 ring-emerald-400/50'
                    } else if (isPicked && !selectedChoice.isCorrect) {
                      btnStyle = 'bg-rose-700 text-white border-rose-400'
                    }
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectCaseOption(opt)}
                      className={`p-3.5 text-xs font-extrabold border rounded-2xl text-left transition ${btnStyle}`}
                    >
                      {idx + 1}. {opt}
                    </button>
                  )
                })}
              </div>
            </div>

            {selectedChoice && (
              <div className="p-4 bg-slate-950 border border-emerald-600 rounded-2xl space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className={`text-xs font-black ${selectedChoice.isCorrect ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {selectedChoice.isCorrect
                      ? '🎉 วินิจฉัยถูกต้อง! (+10 XP)'
                      : `❌ ยังไม่ตรงตามรูปวิธาน (คำตอบที่ถูกคือ: ${currentCase.correctAnswer})`}
                  </span>
                  <button
                    type="button"
                    onClick={handleNextFieldCase}
                    className="px-4 py-1.5 text-xs font-black text-slate-950 bg-emerald-400 rounded-xl hover:bg-emerald-300"
                  >
                    สำรวจแปลงตัวอย่างถัดไป →
                  </button>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed border-t border-slate-800 pt-2">
                  📖 <strong className="text-emerald-300">คำอธิบายทางรุกขวิทยาและนิเวศวิทยา:</strong> {currentCase.academicExplanation}
                </p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}