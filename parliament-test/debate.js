// ═══════════════════════════════════════════════════════════════════════════
// THAILAND POLITICAL SIMULATION — /parliament-test/debate.js
// v.1.0.1 Test: "The Parliament RPG" — Live Debate Engine
// ═══════════════════════════════════════════════════════════════════════════
//
// PURPOSE:
//   Simulates a LIVE parliamentary debate inside the Thai House of
//   Representatives. AI MPs speak in a chat-like stream. The player
//   can interrupt with protests (Point of Order / ประท้วงตามข้อบังคับ),
//   file interpellations (กระทู้ถามสด), and choose how aggressively to
//   participate in the debate.
//
// CORE MECHANICS:
//   1. DEBATE STREAM: A setInterval pushes AI dialogue at ~3s intervals
//   2. PROTEST (Point of Order): Player interrupts a speaker, RNG outcome
//   3. INTERPELLATION: Player queues questions for the Government
//   4. PLAYER SPEECH: Player chooses Aggressive / Technical / Diplomatic
//   5. VOTING: After debate, MPs vote. Outcome based on accumulated capital
//
// THAI PARLIAMENTARY PROCEDURE REFERENCE:
//   - ประธานสภา (Speaker): "ท่านสมาชิกที่เคารพ เชิญท่านผู้อภิปรายต่อไปครับ"
//   - ประท้วง (Protest): "ขอประท้วงตามข้อบังคับ ข้อที่..."
//   - คำวินิจฉัย (Ruling): "คำประท้วงฟังขึ้น" / "คำประท้วงฟังไม่ขึ้น"
//   - กระทู้ถามสด (Live Interpellation): Opposition questions the PM/Ministers
//
// DEPENDENCIES:
//   - data.js (parliamentState, applyEffects, logEvent, clampStat)
//   - timeline.js (registerTimelineCallback for session lifecycle)
//
// ═══════════════════════════════════════════════════════════════════════════


// ──────────────────────────────────────────────────────────────────────────
// SECTION 0: LANGUAGE HELPER
// Single source of truth for debate language. Reads from localStorage.
// ──────────────────────────────────────────────────────────────────────────

/**
 * _getDebateLang() — Returns the current language code for debate text.
 * @returns {"en"|"th"}
 * @private
 */
function _getDebateLang() {
  const lang = (localStorage.getItem('tps_language') || 'EN').toUpperCase();
  return lang === 'TH' ? 'th' : 'en';
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 1: DEBATE TOPICS
// Bills and motions that can be debated on the Parliament floor.
// Each topic has metadata affecting how AI MPs respond and what
// protest opportunities arise.
// ──────────────────────────────────────────────────────────────────────────

/**
 * DEBATE_TOPICS — The legislative agenda.
 *
 * Each topic defines:
 *   id:            Unique identifier
 *   title:         English title
 *   titleThai:     Thai title (for immersive UI)
 *   category:      "budget" | "reform" | "social" | "security" | "economic"
 *   description:   What this bill/motion is about
 *   controversy:   0-100. Higher = more heated debate, more protest opportunities
 *   governmentPosition: "for" | "against" | "neutral"
 *   oppositionPosition: "for" | "against" | "neutral"
 *   publicInterest: 0-100. How much the media/public cares
 *   estimatedDuration: Number of dialogue rounds before vote
 *   relatedMinistry: Which ministry is involved (for interpellation)
 */
const DEBATE_TOPICS = [
  {
    id: "agri_subsidy_bill",
    title: "Agriculture Subsidy Reform Bill",
    titleThai: "ร่าง พ.ร.บ. ปฏิรูปเงินอุดหนุนภาคเกษตร",
    category: "economic",
    description: "Overhauls the rice pledging scheme. Government wants market-based pricing. Opposition demands guaranteed minimum prices for farmers.",
    controversy: 72,
    governmentPosition: "for",
    oppositionPosition: "against",
    publicInterest: 85,
    estimatedDuration: 12,
    relatedMinistry: "Ministry of Agriculture and Cooperatives"
  },
  {
    id: "police_budget_cut",
    title: "Royal Thai Police Budget Reduction",
    titleThai: "ร่าง พ.ร.บ. งบประมาณ — ตัดงบสำนักงานตำรวจแห่งชาติ",
    category: "budget",
    description: "A proposal to cut the police budget by 15% and redirect funds to education. Deeply controversial — the police lobby is powerful.",
    controversy: 88,
    governmentPosition: "against",
    oppositionPosition: "for",
    publicInterest: 78,
    estimatedDuration: 15,
    relatedMinistry: "Royal Thai Police"
  },
  {
    id: "digital_economy_act",
    title: "Digital Economy & AI Governance Act",
    titleThai: "ร่าง พ.ร.บ. เศรษฐกิจดิจิทัลและการกำกับดูแล AI",
    category: "economic",
    description: "Regulates AI, data privacy, and digital platforms. Tech companies lobby hard. Civil society demands stronger protections.",
    controversy: 55,
    governmentPosition: "for",
    oppositionPosition: "neutral",
    publicInterest: 60,
    estimatedDuration: 10,
    relatedMinistry: "Ministry of Digital Economy and Society"
  },
  {
    id: "constitutional_amendment",
    title: "Constitutional Amendment (Section 256)",
    titleThai: "ร่างแก้ไขรัฐธรรมนูญ มาตรา 256",
    category: "reform",
    description: "Attempts to lower the threshold for future constitutional amendments. The establishment sees this as an existential threat. The opposition sees it as democratic necessity.",
    controversy: 95,
    governmentPosition: "against",
    oppositionPosition: "for",
    publicInterest: 92,
    estimatedDuration: 18,
    relatedMinistry: "Office of the Prime Minister"
  },
  {
    id: "eec_expansion",
    title: "Eastern Economic Corridor (EEC) Phase 2",
    titleThai: "ร่าง พ.ร.บ. เขตพัฒนาพิเศษภาคตะวันออก ระยะที่ 2",
    category: "economic",
    description: "Massive infrastructure investment in Chon Buri, Rayong, and Chachoengsao. Big business loves it. Environmentalists and locals resist land grabs.",
    controversy: 65,
    governmentPosition: "for",
    oppositionPosition: "neutral",
    publicInterest: 55,
    estimatedDuration: 11,
    relatedMinistry: "Ministry of Industry"
  },
  {
    id: "military_conscription_reform",
    title: "Military Conscription Abolition Bill",
    titleThai: "ร่าง พ.ร.บ. ยกเลิกการเกณฑ์ทหาร",
    category: "security",
    description: "A progressive bill to end mandatory conscription. The military opposes it fiercely. Young voters overwhelmingly support it.",
    controversy: 90,
    governmentPosition: "against",
    oppositionPosition: "for",
    publicInterest: 88,
    estimatedDuration: 16,
    relatedMinistry: "Ministry of Defence"
  },
  {
    id: "universal_healthcare_upgrade",
    title: "Universal Healthcare Enhancement Act",
    titleThai: "ร่าง พ.ร.บ. ยกระดับหลักประกันสุขภาพถ้วนหน้า",
    category: "social",
    description: "Expands the 30-baht healthcare scheme to cover more treatments. Popular with the public but expensive for the treasury.",
    controversy: 45,
    governmentPosition: "neutral",
    oppositionPosition: "for",
    publicInterest: 75,
    estimatedDuration: 9,
    relatedMinistry: "Ministry of Public Health"
  },
  {
    id: "decentralization_bill",
    title: "Provincial Decentralization Bill",
    titleThai: "ร่าง พ.ร.บ. กระจายอำนาจสู่ท้องถิ่น",
    category: "reform",
    description: "Transfers more budget and authority to provincial governments. Bangkok bureaucrats resist. Provincial politicians celebrate.",
    controversy: 70,
    governmentPosition: "neutral",
    oppositionPosition: "for",
    publicInterest: 50,
    estimatedDuration: 10,
    relatedMinistry: "Ministry of Interior"
  },
  {
    id: "cannabis_regulation",
    title: "Cannabis Regulation & Control Act",
    titleThai: "ร่าง พ.ร.บ. ควบคุมกัญชา",
    category: "social",
    description: "After the controversial legalization, this bill adds stricter controls on recreational use while protecting medical access.",
    controversy: 78,
    governmentPosition: "for",
    oppositionPosition: "against",
    publicInterest: 82,
    estimatedDuration: 13,
    relatedMinistry: "Ministry of Public Health"
  },
  {
    id: "wealth_tax_bill",
    title: "Progressive Wealth Tax Bill",
    titleThai: "ร่าง พ.ร.บ. ภาษีทรัพย์สินอัตราก้าวหน้า",
    category: "economic",
    description: "A 1-3% annual tax on net wealth above ฿100M. Tycoons threaten capital flight. Progressives call it long overdue.",
    controversy: 92,
    governmentPosition: "against",
    oppositionPosition: "for",
    publicInterest: 70,
    estimatedDuration: 14,
    relatedMinistry: "Ministry of Finance"
  }
];


// ──────────────────────────────────────────────────────────────────────────
// SECTION 2: AI MP SPEAKER POOL
// The MPs who "speak" during debates. Each has personality traits
// that affect their rhetorical style, alignment, and protest vulnerability.
// ──────────────────────────────────────────────────────────────────────────

/**
 * AI_SPEAKERS — Pool of AI MPs who participate in debates.
 *
 * alignment:      "government" | "opposition"
 * party:          Fictionalized Thai party name
 * style:          "aggressive" | "technical" | "populist" | "legalistic" | "emotional"
 * speakingSkill:  0-100. Higher = harder to sustain protests against them
 * protestVulnerability: 0-100. Higher = more likely to say something protestable
 * thaiTitle:      Thai honorific used in the transcript
 */
const AI_SPEAKERS = [
  // ── Government Side ──
  {
    id: "gov_somchai",
    name: "Somchai Rattanaporn",
    thaiTitle: "ท่านสมชาย รัตนพร",
    party: "Palang Ratthaniyom",
    partyShort: "PRP",
    alignment: "government",
    role: "Deputy Prime Minister",
    style: "technical",
    speakingSkill: 75,
    protestVulnerability: 25,
    color: "#1D3557",
    avatar: "🧑‍💼"
  },
  {
    id: "gov_kritsada",
    name: "General Kritsada Buranasiri",
    thaiTitle: "พลเอก กฤษดา บูรณศิริ",
    party: "Palang Ratthaniyom",
    partyShort: "PRP",
    alignment: "government",
    role: "Prime Minister",
    style: "aggressive",
    speakingSkill: 60,
    protestVulnerability: 45,
    color: "#1D3557",
    avatar: "🎖️"
  },
  {
    id: "gov_anutin",
    name: "Anutin Charoensri",
    thaiTitle: "ท่านอนุทิน เจริญศรี",
    party: "Setthakij Thai",
    partyShort: "STK",
    alignment: "government",
    role: "Deputy PM / Health Minister",
    style: "populist",
    speakingSkill: 55,
    protestVulnerability: 50,
    color: "#2A9D8F",
    avatar: "💊"
  },
  {
    id: "gov_wiroj",
    name: "Wiroj Phanphruk",
    thaiTitle: "ท่านวิโรจน์ พันธ์ผรุก",
    party: "Pak Tai Ruamjai",
    partyShort: "PTR",
    alignment: "government",
    role: "Minister of Interior",
    style: "legalistic",
    speakingSkill: 70,
    protestVulnerability: 20,
    color: "#457B9D",
    avatar: "📜"
  },
  {
    id: "gov_nattapong",
    name: "Nattapong Siriwattana",
    thaiTitle: "ท่านณัฐพงศ์ ศิริวัฒนา",
    party: "Palang Ratthaniyom",
    partyShort: "PRP",
    alignment: "government",
    role: "Government Whip",
    style: "aggressive",
    speakingSkill: 65,
    protestVulnerability: 55,
    color: "#1D3557",
    avatar: "🔱"
  },

  // ── Opposition Side ──
  {
    id: "opp_thanawat",
    name: "Thanawat Siripong",
    thaiTitle: "ท่านธนวัฒน์ ศิริพงษ์",
    party: "Khana Pracharat",
    partyShort: "KPR",
    alignment: "opposition",
    role: "Opposition Leader",
    style: "aggressive",
    speakingSkill: 82,
    protestVulnerability: 30,
    color: "#FF6B2B",
    avatar: "🔥"
  },
  {
    id: "opp_siriporn",
    name: "Siriporn Wongsuwan",
    thaiTitle: "ท่านศิริพร วงศ์สุวรรณ",
    party: "Pracha Niyom",
    partyShort: "PNP",
    alignment: "opposition",
    role: "Shadow Finance Minister",
    style: "populist",
    speakingSkill: 78,
    protestVulnerability: 35,
    color: "#E63946",
    avatar: "💰"
  },
  {
    id: "opp_preecha",
    name: "Preecha Thammasat",
    thaiTitle: "ท่านปรีชา ธรรมศาสตร์",
    party: "Khana Pracharat",
    partyShort: "KPR",
    alignment: "opposition",
    role: "Constitutional Law Expert",
    style: "technical",
    speakingSkill: 90,
    protestVulnerability: 15,
    color: "#FF6B2B",
    avatar: "⚖️"
  },
  {
    id: "opp_kannika",
    name: "Kannika Maneekhao",
    thaiTitle: "ท่านกรรณิกา มณีขาว",
    party: "Pracha Niyom",
    partyShort: "PNP",
    alignment: "opposition",
    role: "Social Issues Spokesperson",
    style: "emotional",
    speakingSkill: 72,
    protestVulnerability: 40,
    color: "#E63946",
    avatar: "✊"
  },
  {
    id: "opp_rangsan",
    name: "Rangsan Intaraprasit",
    thaiTitle: "ท่านรังสรรค์ อินทรประสิทธิ์",
    party: "Khana Pracharat",
    partyShort: "KPR",
    alignment: "opposition",
    role: "Opposition Whip",
    style: "legalistic",
    speakingSkill: 68,
    protestVulnerability: 30,
    color: "#FF6B2B",
    avatar: "📋"
  }
];


// ──────────────────────────────────────────────────────────────────────────
// SECTION 3: DIALOGUE TEMPLATES
// Pre-written argumentative dialogue lines organized by style and stance.
// These are combined dynamically to create realistic debate streams.
// ──────────────────────────────────────────────────────────────────────────

/**
 * DIALOGUE_TEMPLATES — Lines spoken by AI MPs during debates.
 *
 * Organized by: alignment → style → stance (for/against/neutral)
 * Each entry is a template string with {topic} and {ministry} placeholders.
 *
 * Some lines are PROTESTABLE — they contain insults, lies, or off-topic content.
 * These are flagged with _protestable: true for the protest detection system.
 */
const DIALOGUE_TEMPLATES = {
  government: {
    technical: {
      for: {
        en: [
          { text: "If we examine the fiscal year projections, this bill will save the government ฿45 billion over five years. The opposition offers no alternative.", protestable: false },
          { text: "International best practices from Singapore and South Korea confirm our approach to {topic} is sound and evidence-based.", protestable: false },
          { text: "The committee spent 47 sessions reviewing this bill. Every clause has been vetted by legal experts. I urge the House to pass it.", protestable: false },
          { text: "The data clearly supports this {topic}. Our ministry's analysis shows a 23% improvement in efficiency.", protestable: false }
        ],
        th: [
          { text: "ท่านประธานที่เคารพ, หากพิจารณาประมาณการรายจ่ายประจำปี ร่างกฎหมายนี้จะช่วยรัฐบาลประหยัดได้ ฿45,000 ล้าน ใน 5 ปี ฝ่ายค้านไม่มีทางเลือกอื่น", protestable: false },
          { text: "แนวปฏิบัติสากลจากสิงคโปร์และเกาหลีใต้ยืนยันว่าแนวทางของเราในเรื่อง {topic} มีหลักฐานรองรับ", protestable: false },
          { text: "คณะกรรมาธิการใช้เวลา 47 ครั้งในการพิจารณาร่างกฎหมายนี้ ทุกมาตราผ่านการตรวจสอบจากผู้เชี่ยวชาญกฎหมาย ขอให้สภาผ่านร่างนี้", protestable: false },
          { text: "ข้อมูลสนับสนุน {topic} อย่างชัดเจน จากการวิเคราะห์ของกระทรวงเราพบว่าประสิทธิภาพดีขึ้น 23%", protestable: false }
        ]
      },
      against: {
        en: [
          { text: "While I respect the intent behind this {topic}, the implementation timeline is unrealistic. We need at least 18 more months of study.", protestable: false },
          { text: "The treasury cannot absorb this cost. Our debt-to-GDP ratio is already at 62%. This bill would push us to 68%.", protestable: false }
        ],
        th: [
          { text: "แม้จะเคารพเจตนาของ {topic} แต่กรอบเวลาไม่สมจริง เราต้องการเวลาศึกษาอีกอย่างน้อย 18 เดือน", protestable: false },
          { text: "กระทรวงการคลังไม่สามารถรับภาระนี้ได้ อัตราหนี้ต่อ GDP อยู่ที่ 62% แล้ว ร่างนี้จะดันขึ้นไป 68%", protestable: false }
        ]
      }
    },
    aggressive: {
      for: {
        en: [
          { text: "The opposition has NOTHING to offer! They criticize our {topic} but where is THEIR plan? Where were THEY for 8 years?!", protestable: true, protestReason: "off_topic" },
          { text: "Anyone who votes against this bill is voting against the Thai people. It's that simple.", protestable: true, protestReason: "misleading" },
          { text: "We have a mandate from 14 million voters. This {topic} IS the will of the people!", protestable: false },
          { text: "The opposition member who just spoke clearly doesn't understand basic economics. Perhaps they should go back to school.", protestable: true, protestReason: "slander" }
        ],
        th: [
          { text: "ฝ่ายค้านไม่มีข้อเสนออะไรเลย! วิจารณ์ {topic} ของเรา แต่แผนของพวกท่านอยู่ไหน? 8 ปีที่ผ่านมาพวกท่านไปอยู่ที่ไหน?!", protestable: true, protestReason: "off_topic" },
          { text: "ใครที่โหวตคัดค้านร่างนี้ ก็คือโหวตคัดค้านประชาชน เรียบง่ายแค่นั้น", protestable: true, protestReason: "misleading" },
          { text: "เรามีฉันทามติจากประชาชน 14 ล้านคน {topic} นี้คือเจตจำนงของประชาชน!", protestable: false },
          { text: "สมาชิกฝ่ายค้านที่เพิ่งอภิปรายไป เห็นชัดว่าไม่เข้าใจเศรษฐศาสตร์พื้นฐาน บางทีควรกลับไปเรียนใหม่", protestable: true, protestReason: "slander" }
        ]
      },
      against: {
        en: [
          { text: "This so-called reform is nothing but a Trojan horse to destabilize the institutions that protect our nation!", protestable: true, protestReason: "misleading" },
          { text: "The honorable member is living in a fantasy world if they think this {topic} will work.", protestable: true, protestReason: "slander" }
        ],
        th: [
          { text: "การปฏิรูปที่เรียกกันนี้ ไม่ใช่อะไรเลยนอกจากม้าโทรจันที่จะทำลายสถาบันที่ปกป้องประเทศ!", protestable: true, protestReason: "misleading" },
          { text: "ท่านสมาชิกผู้ทรงเกียรติอยู่ในโลกแฟนตาซี ถ้าคิดว่า {topic} นี้จะประสบความสำเร็จ", protestable: true, protestReason: "slander" }
        ]
      }
    },
    populist: {
      for: {
        en: [
          { text: "I've walked through the rice fields of Isan. The farmers are BEGGING us to pass this {topic}.", protestable: false },
          { text: "Every baht we invest in this program returns ฿3 to the rural economy. This isn't spending — it's investing in our people.", protestable: false },
          { text: "My phone has 500 LINE messages from constituents who support this bill. The people have spoken!", protestable: false }
        ],
        th: [
          { text: "ท่านประธาน, ผมเดินผ่านท้องนาอีสาน ชาวนาร้องขอให้เราผ่าน {topic} นี้", protestable: false },
          { text: "ทุกบาทที่ลงทุนในโครงการนี้ จะคืนกลับมา ฿3 สู่เศรษฐกิจชนบท นี่ไม่ใช่ค่าใช้จ่าย — นี่คือการลงทุนในประชาชน", protestable: false },
          { text: "มือถือผมมีข้อความ LINE 500 ข้อความจากประชาชนในเขตที่สนับสนุนร่างนี้ ประชาชนได้พูดแล้ว!", protestable: false }
        ]
      },
      against: {
        en: [
          { text: "The people in my constituency told me: 'Don't let Bangkok elites destroy our way of life.' I will honor their voices.", protestable: false }
        ],
        th: [
          { text: "ประชาชนในเขตของผมบอกว่า 'อย่าปล่อยให้คนกรุงเทพฯ ทำลายวิถีชีวิตของเรา' ผมจะเคารพเสียงของพวกเขา", protestable: false }
        ]
      }
    },
    legalistic: {
      for: {
        en: [
          { text: "Section 77 of the Constitution mandates that the State shall... and I quote... 'organize an efficient system of public administration.' This {topic} fulfills that mandate.", protestable: false },
          { text: "The Bill is consistent with Articles 152 through 157 of the Constitution. I have submitted a 40-page legal opinion to the Chair.", protestable: false }
        ],
        th: [
          { text: "มาตรา 77 ของรัฐธรรมนูญบัญญัติว่ารัฐต้อง... และผมขออ้าง... 'จัดระบบบริหารราชการอย่างมีประสิทธิภาพ' {topic} นี้เป็นไปตามบทบัญญัตินั้น", protestable: false },
          { text: "ร่างกฎหมายนี้สอดคล้องกับมาตรา 152 ถึง 157 ของรัฐธรรมนูญ ผมได้ส่งความเห็นทางกฎหมาย 40 หน้าถึงท่านประธานแล้ว", protestable: false }
        ]
      },
      against: {
        en: [
          { text: "This bill may violate Section 256 of the Constitution. I request the Constitutional Court's advisory opinion before proceeding.", protestable: false }
        ],
        th: [
          { text: "ท่านประธาน, ร่างกฎหมายนี้อาจขัดมาตรา 256 ของรัฐธรรมนูญ ขอให้ส่งศาลรัฐธรรมนูญวินิจฉัยก่อนดำเนินการต่อ", protestable: false }
        ]
      }
    }
  },

  opposition: {
    technical: {
      for: {
        en: [
          { text: "Our research team has independently verified: this {topic} will benefit 12 million households. We support the principle but demand amendments.", protestable: false },
          { text: "The opposition caucus proposes 3 critical amendments to strengthen accountability mechanisms in this bill.", protestable: false }
        ],
        th: [
          { text: "ทีมวิจัยของเราตรวจสอบอิสระแล้ว: {topic} นี้จะเป็นประโยชน์ต่อ 12 ล้านครัวเรือน เราสนับสนุนหลักการแต่ต้องมีการแก้ไข", protestable: false },
          { text: "มติพรรคฝ่ายค้านเสนอ 3 ข้อแก้ไขที่สำคัญ เพื่อเสริมกลไกการตรวจสอบในร่างกฎหมายนี้", protestable: false }
        ]
      },
      against: {
        en: [
          { text: "The government's own impact assessment contains 14 methodological errors. I have documented each one.", protestable: false },
          { text: "If we adjust for inflation and population growth, this {topic} actually REDUCES per-capita spending on public services by 8%.", protestable: false },
          { text: "The ministry's cost-benefit analysis conveniently omits environmental externalities worth ฿120 billion. This is intellectual dishonesty.", protestable: true, protestReason: "misleading" }
        ],
        th: [
          { text: "ท่านประธาน, รายงานผลกระทบของรัฐบาลเองมีข้อผิดพลาดเชิงระเบียบวิธี 14 จุด ผมได้บันทึกไว้ทุกจุด", protestable: false },
          { text: "หากปรับตามเงินเฟ้อและการเติบโตของประชากร {topic} นี้จะลดรายจ่ายต่อหัวด้านบริการสาธารณะลง 8%", protestable: false },
          { text: "การวิเคราะห์ต้นทุน-ผลตอบแทนของกระทรวงละเว้นปัจจัยภายนอกด้านสิ่งแวดล้อมมูลค่า ฿120,000 ล้าน นี่คือความไม่ซื่อสัตย์ทางปัญญา", protestable: true, protestReason: "misleading" }
        ]
      }
    },
    aggressive: {
      for: {
        en: [
          { text: "Even a broken clock is right twice a day. This government finally has ONE decent idea with this {topic}.", protestable: true, protestReason: "slander" }
        ],
        th: [
          { text: "นาฬิกาเสียก็ยังตรงวันละสองครั้ง ในที่สุดรัฐบาลก็มีไอเดียดีสักหนึ่งเรื่องกับ {topic}", protestable: true, protestReason: "slander" }
        ]
      },
      against: {
        en: [
          { text: "This government is ROBBING the people! This {topic} is nothing but a scheme to enrich their cronies!", protestable: true, protestReason: "slander" },
          { text: "The honorable Prime Minister should RESIGN if this is the best legislation they can produce!", protestable: true, protestReason: "off_topic" },
          { text: "Where did the ฿700 billion go?! Before we discuss any new bill, answer for the MISSING MONEY!", protestable: true, protestReason: "off_topic" },
          { text: "This government has NO moral authority to govern. Every policy they touch turns to ash!", protestable: true, protestReason: "misleading" },
          { text: "The Minister is LYING to this House! The real figures are hidden in a classified report!", protestable: true, protestReason: "slander" }
        ],
        th: [
          { text: "รัฐบาลนี้กำลังปล้นประชาชน! {topic} ไม่ใช่อะไรเลยนอกจากแผนเอื้อพวกพ้อง!", protestable: true, protestReason: "slander" },
          { text: "ท่านนายกรัฐมนตรีควรลาออก ถ้ากฎหมายแบบนี้คือสิ่งที่ดีที่สุดที่ผลิตได้!", protestable: true, protestReason: "off_topic" },
          { text: "เงิน ฿700,000 ล้านหายไปไหน?! ก่อนจะอภิปรายร่างใหม่ ตอบเรื่องเงินที่หายไปก่อน!", protestable: true, protestReason: "off_topic" },
          { text: "รัฐบาลนี้ไม่มีความชอบธรรมทางศีลธรรมในการปกครอง ทุกนโยบายที่แตะ กลายเป็นเถ้าถ่าน!", protestable: true, protestReason: "misleading" },
          { text: "ท่านรัฐมนตรีกำลังโกหกสภาแห่งนี้! ตัวเลขจริงซ่อนอยู่ในรายงานลับ!", protestable: true, protestReason: "slander" }
        ]
      }
    },
    populist: {
      for: {
        en: [
          { text: "The people deserve this. After years of suffering, this is the LEAST this House can do.", protestable: false }
        ],
        th: [
          { text: "ประชาชนสมควรได้รับสิ่งนี้ หลังจากทุกข์ทรมานมาหลายปี นี่คือสิ่งน้อยที่สุดที่สภาแห่งนี้ทำได้", protestable: false }
        ]
      },
      against: {
        en: [
          { text: "Go ask any grandmother in Udon Thani what she thinks of this bill. She'll tell you it's a SCAM.", protestable: false },
          { text: "15 million farmers will suffer if this passes. But what does this government care? They've never set foot in a rice field.", protestable: true, protestReason: "misleading" },
          { text: "The people didn't vote for THIS. They voted for change, and all they got was more of the same corruption.", protestable: false }
        ],
        th: [
          { text: "ไปถามยายคนไหนก็ได้ที่อุดรธานีว่าคิดยังไงกับร่างนี้ เขาจะบอกว่ามันเป็นแค่เรื่องหลอกลวง", protestable: false },
          { text: "เกษตรกร 15 ล้านคนจะเดือดร้อนถ้าร่างนี้ผ่าน แต่รัฐบาลสนใจหรือ? ไม่เคยแม้แต่จะย่ำเท้าเข้าท้องนา", protestable: true, protestReason: "misleading" },
          { text: "ประชาชนไม่ได้เลือกให้มาทำแบบนี้ พวกเขาเลือกการเปลี่ยนแปลง แต่ที่ได้คือคอร์รัปชันแบบเดิมๆ", protestable: false }
        ]
      }
    },
    emotional: {
      for: {
        en: [
          { text: "I have seen the faces of the children who will benefit from this. I cannot in good conscience vote against it.", protestable: false }
        ],
        th: [
          { text: "ผมได้เห็นใบหน้าของเด็กๆ ที่จะได้ประโยชน์จากสิ่งนี้ ด้วยจิตสำนึก ผมไม่สามารถโหวตคัดค้านได้", protestable: false }
        ]
      },
      against: {
        en: [
          { text: "*voice breaking* ...I have met the families destroyed by this government's policies. They deserve better!", protestable: false },
          { text: "How can we sit here in air-conditioned comfort debating numbers while PEOPLE ARE DYING outside this building?!", protestable: true, protestReason: "off_topic" },
          { text: "I REFUSE to be silent. History will judge each of us by our vote today. Choose wisely.", protestable: false }
        ],
        th: [
          { text: "ท่านประธาน... *เสียงสั่น* ...ผมได้พบครอบครัวที่ถูกทำลายจากนโยบายของรัฐบาล พวกเขาสมควรได้รับสิ่งที่ดีกว่า!", protestable: false },
          { text: "เรานั่งอยู่ในห้องแอร์เย็นสบาย อภิปรายตัวเลข ในขณะที่คนกำลังล้มตายข้างนอกตึกนี้ได้อย่างไร?!", protestable: true, protestReason: "off_topic" },
          { text: "ผมปฏิเสธที่จะเงียบ! ประวัติศาสตร์จะตัดสินเราทุกคนจากการลงมติในวันนี้ เลือกให้ดี", protestable: false }
        ]
      }
    },
    legalistic: {
      for: {
        en: [
          { text: "The constitutional basis for this legislation is solid. We support it with reservations on Section 12, clause (b).", protestable: false }
        ],
        th: [
          { text: "พื้นฐานทางรัฐธรรมนูญของกฎหมายนี้มั่นคง เราสนับสนุนโดยมีข้อสงวนในมาตรา 12 ข้อ (ข)", protestable: false }
        ]
      },
      against: {
        en: [
          { text: "This bill is UNCONSTITUTIONAL. Period. Section 77 requires a public hearing process that was NEVER conducted.", protestable: false },
          { text: "I formally request that this bill be referred to the Council of State for a legality review before second reading.", protestable: false },
          { text: "The government's legal team clearly didn't read their own Constitution. This violates at least 3 fundamental rights.", protestable: true, protestReason: "slander" }
        ],
        th: [
          { text: "ร่างกฎหมายนี้ขัดรัฐธรรมนูญ มาตรา 77 กำหนดให้ต้องมีกระบวนการรับฟังความคิดเห็นสาธารณะ ซึ่งไม่เคยจัด", protestable: false },
          { text: "ผมขอเสนออย่างเป็นทางการให้ส่งร่างนี้ไปยังคณะกรรมการกฤษฎีกาเพื่อตรวจสอบความชอบด้วยกฎหมายก่อนวาระที่สอง", protestable: false },
          { text: "ทีมกฎหมายของรัฐบาลไม่ได้อ่านรัฐธรรมนูญของตัวเอง ร่างนี้ละเมิดสิทธิขั้นพื้นฐานอย่างน้อย 3 ข้อ", protestable: true, protestReason: "slander" }
        ]
      }
    }
  }
};

/**
 * SPEAKER_PROCEDURAL_LINES — Lines spoken by the Speaker of the House
 * (ประธานสภา) during debate proceedings.
 * Used for transitions, rulings, and maintaining order.
 */
const SPEAKER_PROCEDURAL_LINES = {
  openSession: {
    en: [
      "The House is now in session. Today we shall consider the matter of {topic}.",
      "Order. The House shall convene. On the agenda: {topic}."
    ],
    th: [
      "ท่านสมาชิกที่เคารพ, ขอเปิดการประชุมสภาผู้แทนราษฎร ครั้งที่ {sessionNum}",
      "เปิดประชุม วาระวันนี้: {topic}"
    ]
  },
  callSpeaker: {
    en: [
      "The Chair recognizes {speakerName}.",
      "The floor is yielded to {speakerName}."
    ],
    th: [
      "ขอเชิญท่าน {speakerName} อภิปราย",
      "เชิญท่านสมาชิกอภิปรายต่อไปครับ"
    ]
  },
  orderInHouse: {
    en: [
      "Order! Order in the House!",
      "Members shall maintain order!"
    ],
    th: [
      "ขอให้สมาชิกรักษาความสงบเรียบร้อย!",
      "ท่านสมาชิก กรุณารักษาความสงบ!"
    ]
  },
  closeDebate: {
    en: [
      "Debate is now closed. Members shall prepare to vote.",
      "The debate has concluded. We shall now proceed to the division."
    ],
    th: [
      "สิ้นสุดการอภิปราย ขอให้สมาชิกเตรียมลงมติ",
      "ปิดอภิปราย — เชิญสมาชิกกดปุ่มลงคะแนน"
    ]
  },
  protestSustained: {
    en: [
      "The protest is SUSTAINED. The honorable member shall withdraw their remarks.",
      "Sustained. The speaker is directed to confine remarks to the matter at hand."
    ],
    th: [
      "คำประท้วงฟังขึ้น! ขอให้ท่านผู้อภิปรายระมัดระวังถ้อยคำ",
      "คำประท้วงฟังขึ้น — เชิญผู้อภิปรายกลับเข้าสู่ประเด็น"
    ]
  },
  protestOverruled: {
    en: [
      "The protest is OVERRULED. The speaker may continue.",
      "Overruled. The remarks are within parliamentary bounds."
    ],
    th: [
      "คำประท้วงฟังไม่ขึ้น เชิญผู้อภิปรายต่อครับ!",
      "คำประท้วงฟังไม่ขึ้น — ผู้อภิปรายอยู่ในประเด็น"
    ]
  },
  callVote: {
    en: [
      "The question is put. Members shall now vote: AYE or NAY.",
      "Division! Members shall cast their vote."
    ],
    th: [
      "ขอให้สมาชิกลงมติ: เห็นด้วย กดปุ่มเขียว ไม่เห็นด้วย กดปุ่มแดง",
      "ลงมติ! เห็นด้วย — ไม่เห็นด้วย — งดออกเสียง"
    ]
  }
};


// ──────────────────────────────────────────────────────────────────────────
// SECTION 4: PROTEST (POINT OF ORDER) SYSTEM
// The core "interrupt" mechanic. The player spots a rule violation
// and raises a formal protest with the Speaker of the House.
// ──────────────────────────────────────────────────────────────────────────

/**
 * PROTEST_REASONS — The grounds on which a player can raise a protest.
 *
 * Each reason has:
 *   id:              Machine identifier
 *   label:           English display name
 *   labelThai:       Thai display name (for UI buttons)
 *   description:     Explanation shown to player
 *   baseSuccessRate: Base % chance the Speaker sustains the protest (0-100)
 *   capitalCostOnFail: Political Capital lost if overruled
 *   capitalGainOnSuccess: Political Capital gained if sustained
 *   speakerPenalty:   Penalty to the speaking MP's momentum if sustained
 *   correctMatch:     Which protestable reason this should match against
 */
const PROTEST_REASONS = [
  {
    id: "slander",
    label: "Slander / Personal Attack",
    labelThai: "หมิ่นประมาท / โจมตีส่วนตัว",
    description: "The speaker used language that personally attacks or defames another member.",
    ruleReference: "ข้อบังคับการประชุม ข้อ 69",
    baseSuccessRate: 55,
    capitalCostOnFail: 5,
    capitalGainOnSuccess: 8,
    speakerPenalty: 15,
    correctMatch: "slander"
  },
  {
    id: "off_topic",
    label: "Off-Topic / Irrelevant",
    labelThai: "นอกประเด็น / ไม่เกี่ยวข้อง",
    description: "The speaker has strayed from the topic being debated.",
    ruleReference: "ข้อบังคับการประชุม ข้อ 67",
    baseSuccessRate: 50,
    capitalCostOnFail: 4,
    capitalGainOnSuccess: 6,
    speakerPenalty: 10,
    correctMatch: "off_topic"
  },
  {
    id: "misleading",
    label: "Misleading / False Information",
    labelThai: "ให้ข้อมูลเท็จ / ชี้นำผิด",
    description: "The speaker is presenting false or deliberately misleading information to the House.",
    ruleReference: "ข้อบังคับการประชุม ข้อ 70",
    baseSuccessRate: 40,
    capitalCostOnFail: 6,
    capitalGainOnSuccess: 10,
    speakerPenalty: 20,
    correctMatch: "misleading"
  }
];


// ──────────────────────────────────────────────────────────────────────────
// SECTION 5: DEBATE ENGINE STATE
// Internal state tracking for an active debate session.
// ──────────────────────────────────────────────────────────────────────────

/**
 * _debateState — Internal engine state for the currently running debate.
 * Reset at the start of each debate via runDebate().
 * @private
 */
let _debateState = {
  isRunning: false,               // Is a debate currently active?
  intervalId: null,               // setInterval handle for the dialogue stream
  currentTopic: null,             // The DEBATE_TOPICS entry being debated
  currentSpeaker: null,           // The AI_SPEAKERS entry currently speaking
  currentDialogue: null,          // The current dialogue line object
  dialogueQueue: [],              // Pre-generated sequence of speakers + lines
  dialogueIndex: 0,               // Current position in the queue
  transcript: [],                 // Full debate transcript (array of dialogue objects)
  speakerMomentum: {},            // speakerId → momentum (affected by protests)
  protestCooldown: false,         // Prevents spam-protesting
  protestCooldownTimer: null,     // Timer for cooldown reset
  playerHasSpoken: false,         // Has the player spoken this round?
  playerTurnPending: false,       // Is it the player's turn to speak?
  roundsCompleted: 0,             // How many dialogue rounds have completed
  totalRounds: 0,                 // Total rounds for this debate
  dialogueIntervalMs: 3000,       // Milliseconds between AI speakers (default 3s)
  isPaused: false,                // Is the debate paused (e.g., during protest modal)?
  voteResult: null                // { ayes, nays, abstain, passed } after vote
};

/**
 * _debateCallbacks — UI callback registry for the debate engine.
 * main.js registers handlers to update the DOM when debate events occur.
 */
const _debateCallbacks = {
  onDialogueAdded: [],            // New dialogue line pushed to transcript
  onSpeakerChange: [],            // Speaker changed
  onProtestResult: [],            // Protest outcome resolved
  onPlayerTurn: [],               // It's the player's turn to speak
  onDebateStart: [],              // Debate begins
  onDebateEnd: [],                // Debate concludes
  onVoteStart: [],                // Voting phase begins
  onVoteResult: [],               // Vote tallied
  onInterpellationStart: [],      // Interpellation session begins
  onInterpellationResult: []      // Interpellation outcome
};

/**
 * registerDebateCallback() — Register a handler for debate events.
 * @param {string} eventName - Key from _debateCallbacks
 * @param {Function} handler - Callback function
 */
function registerDebateCallback(eventName, handler) {
  if (!_debateCallbacks[eventName]) {
    console.warn(`[debate.js] Unknown debate callback: "${eventName}"`);
    return;
  }
  _debateCallbacks[eventName].push(handler);
}

/**
 * _fireDebateCallback() — Internal: fires all handlers for a debate event.
 * @param {string} eventName
 * @param {...any} args
 * @private
 */
function _fireDebateCallback(eventName, ...args) {
  if (!_debateCallbacks[eventName]) return;
  _debateCallbacks[eventName].forEach(handler => {
    try {
      handler(...args);
    } catch (err) {
      console.error(`[debate.js] Error in "${eventName}" callback:`, err);
    }
  });
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 6: CORE DEBATE ENGINE — runDebate()
// Starts a live debate on a given topic. AI MPs speak on a timer.
// ──────────────────────────────────────────────────────────────────────────

/**
 * runDebate() — Starts a live parliamentary debate.
 *
 * This function:
 *   1. Selects the topic and builds a speaker queue
 *   2. Starts a setInterval that pushes dialogue every ~3 seconds
 *   3. Periodically inserts the player's turn to speak
 *   4. Ends the debate after all rounds, then triggers a vote
 *
 * @param {string|Object} topicOrId - A DEBATE_TOPICS id string, or topic object
 * @param {Object} options - Optional configuration
 * @param {number} options.intervalMs - Milliseconds between speakers (default 3000)
 * @param {boolean} options.autoStart - Start immediately? (default true)
 * @returns {Object} The debate state snapshot
 */
function runDebate(topicOrId, options = {}) {
  // ── Resolve the topic ──
  let topic;
  if (typeof topicOrId === "string") {
    topic = DEBATE_TOPICS.find(t => t.id === topicOrId);
    if (!topic) {
      console.error(`[debate.js] Unknown topic: "${topicOrId}"`);
      return null;
    }
  } else {
    topic = topicOrId;
  }

  // ── Guard: don't start if one is already running ──
  if (_debateState.isRunning) {
    console.warn("[debate.js] A debate is already in progress. End it first.");
    return null;
  }

  console.log(`[debate.js] ═══ STARTING DEBATE ═══`);
  console.log(`  → Topic: ${topic.title}`);
  console.log(`  → Thai: ${topic.titleThai}`);
  console.log(`  → Controversy: ${topic.controversy}/100`);

  // ── Reset debate state ──
  // Link debate speed to TPSGlobalState if available
  let intervalMs = options.intervalMs || 3000;
  if (typeof TPSGlobalState !== 'undefined' && TPSGlobalState.debateSpeed) {
    // debateSpeed: 1 = 3000ms, 2 = 1500ms, 3 = 1000ms
    intervalMs = Math.round(3000 / TPSGlobalState.debateSpeed);
  }

  _debateState = {
    isRunning: true,
    intervalId: null,
    currentTopic: topic,
    currentSpeaker: null,
    currentDialogue: null,
    dialogueQueue: [],
    dialogueIndex: 0,
    transcript: [],
    speakerMomentum: {},
    protestCooldown: false,
    protestCooldownTimer: null,
    playerHasSpoken: false,
    playerTurnPending: false,
    roundsCompleted: 0,
    totalRounds: topic.estimatedDuration,
    dialogueIntervalMs: intervalMs,
    isPaused: false,
    voteResult: null
  };

  // Initialize speaker momentum
  AI_SPEAKERS.forEach(sp => {
    _debateState.speakerMomentum[sp.id] = 50; // Start at 50/100
  });

  // ── Build the dialogue queue ──
  _buildDialogueQueue(topic);

  // ── Mark state ──
  if (parliamentState) {
    parliamentState.isDebateInProgress = true;
  }

  // ── Fire start callback ──
  _fireDebateCallback("onDebateStart", topic, _debateState);

  // ── Push opening statement from the Speaker of the House ──
  _pushSpeakerProceduralLine("openSession", topic);

  // ── Start the dialogue interval ──
  if (options.autoStart !== false) {
    _startDialogueStream();
  }

  return getDebateSnapshot();
}

/**
 * _buildDialogueQueue() — Pre-generates the full sequence of speakers
 * and their dialogue lines for the debate.
 *
 * Algorithm:
 *   1. Alternate between government and opposition speakers
 *   2. Select speakers based on topic category and their style
 *   3. Pick dialogue lines matching their stance on the topic
 *   4. Insert player turn slots at regular intervals
 *   5. Randomize within constraints for variety
 *
 * @param {Object} topic - The DEBATE_TOPICS entry
 * @private
 */
function _buildDialogueQueue(topic) {
  const queue = [];
  const govSpeakers = AI_SPEAKERS.filter(s => s.alignment === "government");
  const oppSpeakers = AI_SPEAKERS.filter(s => s.alignment === "opposition");
  const totalRounds = topic.estimatedDuration;

  // Determine player turn insertion points (every 3-4 rounds)
  const playerTurnInterval = Math.floor(totalRounds / 3);

  for (let i = 0; i < totalRounds; i++) {
    // ── Check if this is a player turn slot ──
    if (playerTurnInterval > 0 && i > 0 && i % playerTurnInterval === 0) {
      queue.push({
        type: "player_turn",
        roundIndex: i,
        speakerId: null,
        speaker: null,
        dialogue: null
      });
    }

    // ── Alternate sides: even = government, odd = opposition ──
    const isGovTurn = (i % 2 === 0);
    const pool = isGovTurn ? govSpeakers : oppSpeakers;
    const speaker = pool[Math.floor(Math.random() * pool.length)];

    // ── Determine stance based on topic positions ──
    const sidePosition = isGovTurn ? topic.governmentPosition : topic.oppositionPosition;
    const stance = sidePosition || (isGovTurn ? "for" : "against");

    // ── Pick a dialogue line ──
    const line = _pickDialogueLine(speaker, stance);

    queue.push({
      type: "ai_speech",
      roundIndex: i,
      speakerId: speaker.id,
      speaker: speaker,
      dialogue: line,
      stance: stance,
      timestamp: null  // Set when actually delivered
    });
  }

  _debateState.dialogueQueue = queue;
  _debateState.totalRounds = queue.length;

  console.log(`[debate.js] Built dialogue queue: ${queue.length} entries (${totalRounds} AI + player turns)`);
}

/**
 * _pickDialogueLine() — Selects an appropriate dialogue line for a speaker.
 *
 * @param {Object} speaker - AI_SPEAKERS entry
 * @param {string} stance - "for" | "against" | "neutral"
 * @returns {Object} A dialogue template object { text, protestable, protestReason? }
 * @private
 */
function _pickDialogueLine(speaker, stance) {
  const alignment = speaker.alignment; // "government" | "opposition"
  const style = speaker.style;
  const lang = _getDebateLang(); // "en" | "th"

  // Try to get lines for exact alignment → style → stance → lang
  let lines = DIALOGUE_TEMPLATES[alignment]?.[style]?.[stance]?.[lang];

  // Fallback: try the other stance
  if (!lines || lines.length === 0) {
    const fallbackStance = stance === "for" ? "against" : "for";
    lines = DIALOGUE_TEMPLATES[alignment]?.[style]?.[fallbackStance]?.[lang];
  }

  // Fallback: try a different style in the same alignment
  if (!lines || lines.length === 0) {
    const styles = Object.keys(DIALOGUE_TEMPLATES[alignment] || {});
    for (const s of styles) {
      lines = DIALOGUE_TEMPLATES[alignment][s][stance]?.[lang] || DIALOGUE_TEMPLATES[alignment][s]["against"]?.[lang];
      if (lines && lines.length > 0) break;
    }
  }

  // Ultimate fallback — language-specific
  if (!lines || lines.length === 0) {
    return {
      text: lang === 'th'
        ? 'ท่านประธาน, ผมขอแสดงจุดยืนในเรื่องนี้ต่อสภา'
        : 'I wish to express my position on this matter before the House.',
      protestable: false
    };
  }

  // Pick a random line
  const line = lines[Math.floor(Math.random() * lines.length)];

  // Apply speaker's protestVulnerability — maybe add extra protestable flavor
  if (!line.protestable && Math.random() * 100 < speaker.protestVulnerability) {
    const vulnText = lang === 'th'
      ? ' และพูดตรงๆ คนที่ไม่เห็นด้วยก็โง่หรือไม่ก็ฉ้อฉล!'
      : ' And frankly, those who disagree are either ignorant or corrupt!';
    return {
      ...line,
      text: line.text + vulnText,
      protestable: true,
      protestReason: "slander"
    };
  }

  return { ...line };
}



// ──────────────────────────────────────────────────────────────────────────
// SECTION 7: DIALOGUE STREAM (setInterval)
// The heartbeat that pushes new dialogue to the UI.
// ──────────────────────────────────────────────────────────────────────────

/**
 * _startDialogueStream() — Starts the setInterval that feeds dialogue
 * to the UI at regular intervals.
 * @private
 */
function _startDialogueStream() {
  if (_debateState.intervalId) {
    clearInterval(_debateState.intervalId);
  }

  _debateState.intervalId = setInterval(() => {
    // If paused (e.g., protest modal open), skip this tick
    if (_debateState.isPaused) return;

    // Advance to next dialogue
    _advanceDialogue();
  }, _debateState.dialogueIntervalMs);

  console.log(`[debate.js] Dialogue stream started (every ${_debateState.dialogueIntervalMs}ms)`);
}

/**
 * _advanceDialogue() — Processes the next item in the dialogue queue.
 * @private
 */
function _advanceDialogue() {
  if (!_debateState.isRunning) return;

  const queue = _debateState.dialogueQueue;
  const idx = _debateState.dialogueIndex;

  // ── Check if debate is over ──
  if (idx >= queue.length) {
    _endDebate();
    return;
  }

  const entry = queue[idx];
  _debateState.dialogueIndex++;

  // ── Handle different entry types ──
  switch (entry.type) {
    case "ai_speech":
      _deliverAISpeech(entry);
      break;

    case "player_turn":
      _triggerPlayerTurn();
      break;

    default:
      console.warn(`[debate.js] Unknown queue entry type: "${entry.type}"`);
      break;
  }
}

/**
 * _deliverAISpeech() — Pushes an AI MP's speech to the transcript.
 *
 * @param {Object} entry - Dialogue queue entry
 * @private
 */
function _deliverAISpeech(entry) {
  const speaker = entry.speaker;
  const topic = _debateState.currentTopic;
  const lang = _getDebateLang();

  // ── Substitute placeholders in dialogue text (language-aware) ──
  const topicTitle = (lang === 'th' && topic?.titleThai) ? topic.titleThai : topic.title;
  let text = entry.dialogue.text
    .replace(/\{topic\}/g, topicTitle)
    .replace(/\{ministry\}/g, topic.relatedMinistry || (lang === 'th' ? 'กระทรวงที่เกี่ยวข้อง' : 'the relevant ministry'))
    .replace(/\{speakerName\}/g, (lang === 'th' && speaker.thaiTitle) ? speaker.thaiTitle : speaker.name);

  // ── Build the transcript entry ──
  const transcriptEntry = {
    id: `dlg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    type: "ai_speech",
    speakerId: speaker.id,
    speakerName: speaker.name,
    speakerThaiTitle: speaker.thaiTitle,
    speakerParty: speaker.party,
    speakerPartyShort: speaker.partyShort,
    speakerRole: speaker.role,
    speakerAlignment: speaker.alignment,
    speakerStyle: speaker.style,
    speakerColor: speaker.color,
    speakerAvatar: speaker.avatar,
    text: text,
    protestable: entry.dialogue.protestable || false,
    protestReason: entry.dialogue.protestReason || null,
    stance: entry.stance,
    timestamp: Date.now(),
    roundIndex: entry.roundIndex
  };

  // ── Update debate state ──
  _debateState.currentSpeaker = speaker;
  _debateState.currentDialogue = transcriptEntry;
  _debateState.transcript.push(transcriptEntry);
  _debateState.roundsCompleted++;

  console.log(`[debate.js] ${speaker.avatar} ${speaker.partyShort} | ${speaker.name}: "${text.substring(0, 60)}..."`);

  // ── Fire callbacks ──
  _fireDebateCallback("onDialogueAdded", transcriptEntry);
  _fireDebateCallback("onSpeakerChange", speaker, transcriptEntry);
}

/**
 * _triggerPlayerTurn() — Pauses the debate and signals the UI
 * that it's the player's turn to speak.
 * @private
 */
function _triggerPlayerTurn() {
  _debateState.isPaused = true;
  _debateState.playerTurnPending = true;
  _debateState.playerHasSpoken = false;

  console.log("[debate.js] ═══ PLAYER TURN ═══");

  // Push a procedural line from the Speaker
  _pushSpeakerProceduralLine("callSpeaker", _debateState.currentTopic, {
    speakerName: parliamentState ? parliamentState.playerName : "the honorable member"
  });

  _fireDebateCallback("onPlayerTurn", _debateState.currentTopic, getDebateSnapshot());
}

/**
 * _pushSpeakerProceduralLine() — Adds a procedural line from the Speaker
 * of the House to the transcript.
 *
 * @param {string} lineType - Key from SPEAKER_PROCEDURAL_LINES
 * @param {Object} topic - Current topic for placeholder substitution
 * @param {Object} vars - Additional variables for substitution
 * @private
 */
function _pushSpeakerProceduralLine(lineType, topic, vars = {}) {
  const lang = _getDebateLang();
  const langLines = SPEAKER_PROCEDURAL_LINES[lineType]?.[lang];
  if (!langLines || langLines.length === 0) return;

  let text = langLines[Math.floor(Math.random() * langLines.length)];

  // Use localized topic title
  const topicTitle = (lang === 'th' && topic?.titleThai) ? topic.titleThai : (topic?.title || (lang === 'th' ? 'เรื่องที่พิจารณา' : 'the matter at hand'));

  // Substitute placeholders
  text = text
    .replace(/\{topic\}/g, topicTitle)
    .replace(/\{sessionNum\}/g, parliamentState ? parliamentState.currentWeek : "1")
    .replace(/\{speakerName\}/g, vars.speakerName || (lang === 'th' ? 'ท่านสมาชิก' : 'the honorable member'));

  const entry = {
    id: `proc_${Date.now()}`,
    type: "procedural",
    speakerId: "speaker_of_house",
    speakerName: lang === 'th' ? "ประธานสภา" : "Speaker of the House",
    speakerThaiTitle: "ท่านประธานสภา",
    speakerParty: null,
    speakerPartyShort: null,
    speakerRole: "ประธานสภาผู้แทนราษฎร",
    speakerAlignment: "neutral",
    speakerStyle: "procedural",
    speakerColor: "#DAA520",
    speakerAvatar: "🏛️",
    text: text,
    protestable: false,
    timestamp: Date.now()
  };

  _debateState.transcript.push(entry);
  _fireDebateCallback("onDialogueAdded", entry);
}



// ──────────────────────────────────────────────────────────────────────────
// SECTION 8: PROTEST (POINT OF ORDER) MECHANIC
// The player interrupts a speaker by raising a formal protest.
// ──────────────────────────────────────────────────────────────────────────

/**
 * raiseProtest() — The player raises a Point of Order (ประท้วงตามข้อบังคับ).
 *
 * MECHANIC:
 *   1. Check if an AI is currently speaking (protestable window)
 *   2. Check if the selected reason MATCHES the speaker's violation
 *   3. Calculate success chance: baseRate + PoliticalCapital bonus + match bonus
 *   4. RNG roll → Sustained or Overruled
 *   5. Apply stat effects
 *
 * SUCCESS FACTORS:
 *   - Correct protest reason match: +20% bonus
 *   - Player's PoliticalCapital: +0.2% per point (max +20% at 100 cap)
 *   - Speaker's speakingSkill: -0.15% per point (max -15%)
 *   - Random variance: ±10%
 *
 * @param {string} reasonId - One of: "slander", "off_topic", "misleading"
 * @returns {Object} Result: { sustained, reason, speakerName, capitalChange, ruling }
 */
function raiseProtest(reasonId) {
  // ── Guards ──
  if (!_debateState.isRunning) {
    return { error: "No debate in progress." };
  }
  if (_debateState.protestCooldown) {
    return { error: "Protest cooldown active. Wait before protesting again." };
  }
  if (!_debateState.currentSpeaker) {
    return { error: "No one is currently speaking." };
  }
  if (_debateState.playerTurnPending) {
    return { error: "It's your turn to speak, not protest." };
  }

  // ── Find the protest reason ──
  const reason = PROTEST_REASONS.find(r => r.id === reasonId);
  if (!reason) {
    return { error: `Unknown protest reason: "${reasonId}"` };
  }

  // ── Pause the debate stream during protest resolution ──
  _debateState.isPaused = true;

  // ── Get current speaker and their dialogue ──
  const speaker = _debateState.currentSpeaker;
  const dialogue = _debateState.currentDialogue;

  console.log(`[debate.js] ═══ PROTEST RAISED ═══`);
  console.log(`  → Reason: ${reason.label} (${reason.labelThai})`);
  console.log(`  → Against: ${speaker.name}`);
  console.log(`  → Dialogue protestable: ${dialogue?.protestable}`);
  console.log(`  → Dialogue protest reason: ${dialogue?.protestReason}`);

  // ── Calculate success probability ──
  let successChance = reason.baseSuccessRate;

  // Bonus: Correct reason match (+20%)
  const reasonMatches = dialogue?.protestable && dialogue?.protestReason === reason.correctMatch;
  if (reasonMatches) {
    successChance += 20;
    console.log(`  → Correct match bonus: +20%`);
  } else if (dialogue?.protestable) {
    // Wrong reason but dialogue IS protestable — small bonus
    successChance += 5;
    console.log(`  → Partial match bonus: +5%`);
  } else {
    // Dialogue is NOT protestable — heavy penalty
    successChance -= 25;
    console.log(`  → No violation penalty: -25%`);
  }

  // Bonus: Player's Political Capital (+0.2 per point, max +20)
  const capBonus = (parliamentState?.playerPoliticalCapital || 50) * 0.2;
  successChance += capBonus;
  console.log(`  → Political Capital bonus: +${capBonus.toFixed(1)}%`);

  // Penalty: Speaker's skill (-0.15 per point, max -15)
  const skillPenalty = speaker.speakingSkill * 0.15;
  successChance -= skillPenalty;
  console.log(`  → Speaker skill penalty: -${skillPenalty.toFixed(1)}%`);

  // Random variance (±10%)
  const variance = (Math.random() * 20) - 10;
  successChance += variance;

  // Difficulty scaling: Easy = +12% bonus, Hard = -15% penalty
  if (typeof getParlDiffScale === 'function') {
    const pds = getParlDiffScale();
    // Easy: protestPenaltyMult=0.6 → bonus +12, Normal: 0, Hard: protestPenaltyMult=1.5 → penalty -15
    const diffAdjust = (1 - pds.protestPenaltyMult) * 30;
    successChance += diffAdjust;
  }

  // Clamp to 5-95% (nothing is ever 100% certain in politics)
  successChance = Math.max(5, Math.min(95, successChance));
  console.log(`  → Final success chance: ${successChance.toFixed(1)}%`);

  // ── ROLL THE DICE ──
  const roll = Math.random() * 100;
  const sustained = roll < successChance;

  console.log(`  → Roll: ${roll.toFixed(1)} vs ${successChance.toFixed(1)} → ${sustained ? "SUSTAINED ✅" : "OVERRULED ❌"}`);

  // ── Build the result ──
  const result = {
    sustained: sustained,
    reasonId: reason.id,
    reasonLabel: reason.label,
    reasonLabelThai: reason.labelThai,
    ruleReference: reason.ruleReference,
    speakerId: speaker.id,
    speakerName: speaker.name,
    speakerThaiTitle: speaker.thaiTitle,
    speakerParty: speaker.party,
    dialogueWasProtestable: dialogue?.protestable || false,
    reasonMatched: reasonMatches,
    successChance: Math.round(successChance),
    capitalChange: 0,
    ruling: "",
    rulingThai: ""
  };

  // ── Apply consequences ──
  if (sustained) {
    // PROTEST SUSTAINED — Player wins!
    result.capitalChange = reason.capitalGainOnSuccess;
    result.ruling = "Protest SUSTAINED";
    result.rulingThai = "คำประท้วงฟังขึ้น!";

    // Damage speaker's momentum
    _debateState.speakerMomentum[speaker.id] = Math.max(0,
      (_debateState.speakerMomentum[speaker.id] || 50) - reason.speakerPenalty
    );

    // Boost player stats
    applyEffects({ politicalCapital: reason.capitalGainOnSuccess });

    // Update weekly stats
    if (parliamentState) {
      parliamentState.weeklyStats.protestsRaised++;
      parliamentState.weeklyStats.protestsSucceeded++;
      parliamentState.totalStats.protestsRaised++;
      parliamentState.totalStats.protestsSucceeded++;
    }

    // Push Speaker's ruling to transcript
    _pushProtestRulingToTranscript(true, speaker, reason);

    logEvent("protest_sustained", `Protest Sustained: ${reason.label}`,
      `Your protest against ${speaker.name} was sustained by the Speaker. ${reason.ruleReference}.`,
      { politicalCapital: reason.capitalGainOnSuccess });

  } else {
    // Player loses capital (scaled by difficulty)
    let failCost = reason.capitalCostOnFail;
    if (typeof getParlDiffScale === 'function') {
      failCost = Math.round(failCost * getParlDiffScale().protestPenaltyMult);
    }
    result.capitalChange = -failCost;
    result.ruling = "Protest OVERRULED";
    result.rulingThai = "คำประท้วงฟังไม่ขึ้น!";

    // Player loses capital
    applyEffects({ politicalCapital: -failCost });

    // Update stats
    if (parliamentState) {
      parliamentState.weeklyStats.protestsRaised++;
      parliamentState.totalStats.protestsRaised++;
    }

    // Push Speaker's ruling
    _pushProtestRulingToTranscript(false, speaker, reason);

    logEvent("protest_overruled", `Protest Overruled: ${reason.label}`,
      `Your protest against ${speaker.name} was overruled. The Speaker found no violation.`,
      { politicalCapital: -reason.capitalCostOnFail });
  }

  // ── Record in protest history ──
  if (parliamentState) {
    parliamentState.protestHistory.push({
      day: parliamentState.totalDaysElapsed,
      week: parliamentState.currentWeek,
      topic: _debateState.currentTopic?.title,
      speakerName: speaker.name,
      reason: reason.id,
      reasonLabel: reason.label,
      sustained: sustained,
      capitalChange: result.capitalChange,
      timestamp: Date.now()
    });
  }

  // ── Start cooldown ──
  _debateState.protestCooldown = true;
  _debateState.protestCooldownTimer = setTimeout(() => {
    _debateState.protestCooldown = false;
    console.log("[debate.js] Protest cooldown expired.");
  }, 5000); // 5-second cooldown between protests

  // ── Resume debate after a dramatic pause ──
  setTimeout(() => {
    _debateState.isPaused = false;
  }, 2000); // 2-second pause for the ruling to sink in

  // ── Fire callbacks ──
  _fireDebateCallback("onProtestResult", result);

  return result;
}

/**
 * _pushProtestRulingToTranscript() — Adds the Speaker's ruling
 * to the debate transcript after a protest.
 *
 * @param {boolean} sustained - Was the protest sustained?
 * @param {Object} speaker - The AI speaker who was protested
 * @param {Object} reason - The PROTEST_REASONS entry
 * @private
 */
function _pushProtestRulingToTranscript(sustained, speaker, reason) {
  const lang = _getDebateLang();
  const lineType = sustained ? "protestSustained" : "protestOverruled";
  const langLines = SPEAKER_PROCEDURAL_LINES[lineType]?.[lang] || SPEAKER_PROCEDURAL_LINES[lineType]?.en;
  const text = langLines[Math.floor(Math.random() * langLines.length)];

  // Push the player's protest action first — language-aware
  const protestText = lang === 'th'
    ? `ขอประท้วงตามข้อบังคับ! ${reason.labelThai} — ${reason.ruleReference}`
    : `Point of Order! ${reason.label} — ${reason.ruleReference}`;

  const protestEntry = {
    id: `protest_${Date.now()}`,
    type: "player_protest",
    speakerId: "player",
    speakerName: parliamentState ? parliamentState.playerName : "Player",
    speakerThaiTitle: "ท่านสมาชิก",
    speakerParty: null,
    speakerRole: parliamentState ? parliamentState.playerRole : "MP",
    speakerAlignment: parliamentState ? parliamentState.playerAlignment : "opposition",
    speakerColor: "#FFD700",
    speakerAvatar: "⚡",
    text: protestText,
    protestable: false,
    timestamp: Date.now()
  };

  // Then the Speaker's ruling
  const rulingEntry = {
    id: `ruling_${Date.now()}`,
    type: "ruling",
    speakerId: "speaker_of_house",
    speakerName: lang === 'th' ? "ประธานสภา" : "Speaker of the House",
    speakerThaiTitle: "ท่านประธานสภา",
    speakerParty: null,
    speakerRole: "ประธานสภาผู้แทนราษฎร",
    speakerAlignment: "neutral",
    speakerColor: sustained ? "#28A745" : "#DC3545",
    speakerAvatar: "⚖️",
    text: text,
    protestable: false,
    sustained: sustained,
    timestamp: Date.now()
  };

  _debateState.transcript.push(protestEntry);
  _debateState.transcript.push(rulingEntry);

  _fireDebateCallback("onDialogueAdded", protestEntry);
  _fireDebateCallback("onDialogueAdded", rulingEntry);
}



// ──────────────────────────────────────────────────────────────────────────
// SECTION 9: PLAYER SPEECH MECHANIC
// When it's the player's turn, they choose a rhetorical style.
// ──────────────────────────────────────────────────────────────────────────

/**
 * PLAYER_SPEECH_STANCES — The rhetorical stances the player can choose.
 * Each has different stat effects and narrative consequences.
 */
const PLAYER_SPEECH_STANCES = {
  aggressive: {
    id: "aggressive",
    label: "Aggressive Debate",
    labelThai: "อภิปรายแบบดุดัน",
    description: "Attack the opponent's position and credibility. High risk, high reward.",
    icon: "🔥",
    effects: {
      success: { politicalCapital: +6, localPopularity: +2 },
      failure: { politicalCapital: -4, localPopularity: -1 }
    },
    baseSuccessRate: 45,
    capitalMultiplier: 0.3  // PoliticalCapital influence on success
  },
  technical: {
    id: "technical",
    label: "Technical Argument",
    labelThai: "อภิปรายเชิงเทคนิค",
    description: "Present data, legal arguments, and detailed analysis. Moderate and steady.",
    icon: "📊",
    effects: {
      success: { politicalCapital: +4, localPopularity: +1 },
      failure: { politicalCapital: -1, localPopularity: 0 }
    },
    baseSuccessRate: 60,
    capitalMultiplier: 0.15
  },
  diplomatic: {
    id: "diplomatic",
    label: "Diplomatic Appeal",
    labelThai: "อภิปรายแบบทูต",
    description: "Seek common ground, propose amendments, build bridges. Safe but less impactful.",
    icon: "🤝",
    effects: {
      success: { politicalCapital: +3, localPopularity: +3 },
      failure: { politicalCapital: 0, localPopularity: +1 }
    },
    baseSuccessRate: 70,
    capitalMultiplier: 0.1
  }
};

/**
 * PLAYER_SPEECH_LINES — Pre-written lines for the player's speech,
 * organized by stance. Displayed in the transcript.
 */
const PLAYER_SPEECH_LINES = {
  aggressive: {
    en: [
      "This government's {topic} is a DISGRACE to the Thai people! The numbers don't lie — they've been cooking the books!",
      "I challenge the Minister to tell this House — WHERE IS THE MONEY? The budget figures are FICTION!",
      "The honorable member's argument collapses under the slightest scrutiny. Allow me to demonstrate.",
      "The people sent us here to FIGHT, not to rubber-stamp corrupt legislation. I say NO to this bill!"
    ],
    th: [
      "ท่านประธาน! {topic} ของรัฐบาลนี้เป็นความอัปยศของประชาชนไทย! ตัวเลขไม่โกหก — พวกเขาปลอมบัญชี!",
      "ผมท้าให้ท่านรัฐมนตรีบอกสภาแห่งนี้ — เงินอยู่ไหน? ตัวเลขงบประมาณเป็นเรื่องแต่ง!",
      "ท่านประธาน, ข้อโต้แย้งของท่านสมาชิกผู้ทรงเกียรติพังทลายเมื่อถูกตรวจสอบเพียงเล็กน้อย ให้ผมสาธิต",
      "ประชาชนส่งเรามาที่นี่เพื่อสู้ ไม่ใช่มาประทับตรากฎหมายฉ้อฉล ผมขอคัดค้านร่างนี้!"
    ]
  },
  technical: {
    en: [
      "If we examine Table 3 of the fiscal impact report, the projected revenue shortfall is ฿47.3 billion. This is unsustainable.",
      "I have prepared a 12-page analysis comparing this bill with similar legislation in 8 ASEAN nations. The data is clear.",
      "Section 14, subsection (b) of this bill conflicts with the Administrative Procedures Act of 2539. I propose an amendment.",
      "The ministry's own audit report — which I obtained through an information request — contradicts the figures presented today."
    ],
    th: [
      "ท่านประธาน, หากพิจารณาตาราง 3 ของรายงานผลกระทบทางการเงิน ประมาณการขาดรายได้อยู่ที่ ฿47,300 ล้าน ไม่ยั่งยืน",
      "ผมได้เตรียมรายงานวิเคราะห์ 12 หน้า เปรียบเทียบกฎหมายนี้กับกฎหมายที่คล้ายกันใน 8 ประเทศอาเซียน ข้อมูลชัดเจน",
      "มาตรา 14 วรรค (ข) ของร่างนี้ขัดกับ พ.ร.บ. วิธีปฏิบัติราชการทางปกครอง พ.ศ. 2539 ผมขอเสนอแก้ไข",
      "รายงานตรวจสอบของกระทรวงเอง — ที่ผมได้มาจากการร้องขอข้อมูล — ขัดแย้งกับตัวเลขที่นำเสนอวันนี้"
    ]
  },
  diplomatic: {
    en: [
      "I believe both sides want what's best for Thailand. Perhaps we can find compromise on Sections 7 through 12.",
      "While I respect the government's intent, I propose we establish a joint committee to address the concerns raised by both sides.",
      "The people watching at home want to see us work together. I extend my hand to the other side for constructive dialogue.",
      "I propose a 90-day pilot program in 5 provinces before rolling out nationwide. This serves both caution and progress."
    ],
    th: [
      "ท่านประธาน, ผมเชื่อว่าทั้งสองฝ่ายต้องการสิ่งที่ดีที่สุดสำหรับประเทศไทย บางทีเราอาจหาทางประนีประนอมในมาตรา 7 ถึง 12",
      "แม้จะเคารพเจตนาของรัฐบาล ผมเสนอให้ตั้งคณะกรรมาธิการร่วมเพื่อพิจารณาข้อกังวลของทั้งสองฝ่าย",
      "ประชาชนที่ดูอยู่ที่บ้านต้องการเห็นเราทำงานร่วมกัน ผมยื่นมือให้ฝ่ายตรงข้ามเพื่อเจรจาอย่างสร้างสรรค์",
      "ผมเสนอโครงการนำร่อง 90 วัน ใน 5 จังหวัด ก่อนขยายทั่วประเทศ เป็นทั้งการระมัดระวังและก้าวหน้า"
    ]
  }
};

/**
 * playerSpeak() — The player delivers their speech during their turn.
 *
 * @param {string} stanceId - "aggressive" | "technical" | "diplomatic"
 * @returns {Object} Speech result: { success, stance, capitalChange, narrative }
 */
function playerSpeak(stanceId) {
  // ── Guards ──
  if (!_debateState.isRunning) {
    return { error: "No debate in progress." };
  }
  if (!_debateState.playerTurnPending) {
    return { error: "It's not your turn to speak." };
  }
  if (_debateState.playerHasSpoken) {
    return { error: "You've already spoken this turn." };
  }

  const stance = PLAYER_SPEECH_STANCES[stanceId];
  if (!stance) {
    return { error: `Unknown stance: "${stanceId}"` };
  }

  console.log(`[debate.js] ═══ PLAYER SPEAKS: ${stance.label} ═══`);

  // ── Calculate success ──
  let successChance = stance.baseSuccessRate;

  // Political Capital bonus
  const capBonus = (parliamentState?.playerPoliticalCapital || 50) * stance.capitalMultiplier;
  successChance += capBonus;

  // Topic controversy modifier
  const contrMod = (_debateState.currentTopic?.controversy || 50) * 0.05;
  if (stanceId === "aggressive") successChance -= contrMod; // Harder to be aggressive on hot topics
  if (stanceId === "diplomatic") successChance += contrMod; // Easier to be diplomatic

  // Clamp
  successChance = Math.max(10, Math.min(95, successChance));

  // ── Roll ──
  const roll = Math.random() * 100;
  const success = roll < successChance;

  console.log(`  → Success chance: ${successChance.toFixed(1)}%, Roll: ${roll.toFixed(1)} → ${success ? "SUCCESS ✅" : "WEAK ❌"}`);

  // ── Build result ──
  const effects = success ? stance.effects.success : stance.effects.failure;
  applyEffects(effects);

  // ── Push to transcript ──
  const lang = _getDebateLang();
  const lines = PLAYER_SPEECH_LINES[stanceId]?.[lang] || PLAYER_SPEECH_LINES[stanceId]?.en;
  let speechText = lines[Math.floor(Math.random() * lines.length)];
  const topicTitle = (lang === 'th' && _debateState.currentTopic?.titleThai) ? _debateState.currentTopic.titleThai : (_debateState.currentTopic?.title || (lang === 'th' ? 'เรื่องนี้' : 'this matter'));
  speechText = speechText.replace(/\{topic\}/g, topicTitle);

  const speechEntry = {
    id: `player_speech_${Date.now()}`,
    type: "player_speech",
    speakerId: "player",
    speakerName: parliamentState ? parliamentState.playerName : "Player",
    speakerThaiTitle: "ท่านสมาชิก",
    speakerParty: parliamentState ? parliamentState.playerPartyId : null,
    speakerRole: parliamentState ? parliamentState.playerRole : "MP",
    speakerAlignment: parliamentState ? parliamentState.playerAlignment : "opposition",
    speakerColor: "#FFD700",
    speakerAvatar: stance.icon,
    text: speechText,
    stance: stanceId,
    success: success,
    protestable: false,
    timestamp: Date.now()
  };

  _debateState.transcript.push(speechEntry);
  _debateState.playerHasSpoken = true;
  _debateState.playerTurnPending = false;

  _fireDebateCallback("onDialogueAdded", speechEntry);

  // ── Log event ──
  logEvent("player_speech", `Speech: ${stance.label}`,
    success
      ? `Your ${stance.label.toLowerCase()} speech was well-received. The House listens.`
      : `Your ${stance.label.toLowerCase()} speech fell flat. Weak applause.`,
    effects);

  // ── Resume the debate stream after player speaks ──
  setTimeout(() => {
    _debateState.isPaused = false;
  }, 1500);

  return {
    success,
    stanceId,
    stanceLabel: stance.label,
    stanceLabelThai: stance.labelThai,
    capitalChange: effects.politicalCapital || 0,
    popularityChange: effects.localPopularity || 0,
    narrative: success
      ? "Your speech resonated. Members nod approvingly."
      : "The House is unimpressed. A few jeers from the backbench.",
    speechText
  };
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 10: INTERPELLATION MECHANIC (กระทู้ถามสด)
// The player queues a question for the Government.
// ──────────────────────────────────────────────────────────────────────────

/**
 * INTERPELLATION_TOPICS — Questions the player can ask the Government.
 * These are typically opposition-style "gotcha" questions.
 */
const INTERPELLATION_TOPICS = [
  {
    id: "interp_budget",
    question: "Can the Prime Minister explain the ฿700 billion discrepancy in the infrastructure budget?",
    questionThai: "ท่านนายกรัฐมนตรีชี้แจงได้หรือไม่ว่างบ 7 แสนล้านบาทในงบโครงสร้างพื้นฐานหายไปไหน?",
    target: "Prime Minister",
    difficulty: 70,
    category: "budget"
  },
  {
    id: "interp_corruption",
    question: "Why has the Anti-Corruption Commission been silent on the land deals in the EEC?",
    questionThai: "ทำไม ป.ป.ช. ถึงนิ่งเฉยต่อเรื่องการซื้อขายที่ดินในเขต EEC?",
    target: "Deputy Prime Minister",
    difficulty: 80,
    category: "corruption"
  },
  {
    id: "interp_military",
    question: "What is the breakdown of the classified military procurement budget for FY2027?",
    questionThai: "ขอให้ท่านรัฐมนตรีกลาโหมชี้แจงรายละเอียดงบจัดซื้ออาวุธลับปีงบ 2570",
    target: "Minister of Defence",
    difficulty: 90,
    category: "security"
  },
  {
    id: "interp_education",
    question: "Why have teacher salaries not been adjusted despite the 2025 reform promise?",
    questionThai: "ทำไมเงินเดือนครูยังไม่ปรับตามที่สัญญาไว้ในการปฏิรูป ปี 2568?",
    target: "Minister of Education",
    difficulty: 50,
    category: "social"
  },
  {
    id: "interp_flooding",
    question: "What measures has the Ministry taken to prevent annual flooding in 23 provinces?",
    questionThai: "กระทรวงมีมาตรการอะไรป้องกันน้ำท่วมซ้ำซากใน 23 จังหวัด?",
    target: "Minister of Interior",
    difficulty: 55,
    category: "infrastructure"
  }
];

/**
 * INTERPELLATION_RESPONSE_STANCES — How the player presents their
 * follow-up after the Government responds.
 */
const INTERPELLATION_RESPONSE_STANCES = {
  aggressive: {
    label: "Press Hard",
    labelThai: "กดดัน",
    description: "Aggressively demand specifics. Risk angering the coalition.",
    effects: {
      success: { politicalCapital: +8, localPopularity: +3 },
      failure: { politicalCapital: -5, localPopularity: -2 }
    },
    baseSuccessRate: 40
  },
  diplomatic: {
    label: "Seek Clarification",
    labelThai: "ขอความกระจ่าง",
    description: "Politely but firmly request additional details.",
    effects: {
      success: { politicalCapital: +4, localPopularity: +2 },
      failure: { politicalCapital: -1, localPopularity: 0 }
    },
    baseSuccessRate: 65
  },
  evade: {
    label: "Accept & Move On",
    labelThai: "ยอมรับคำตอบ",
    description: "Accept the Government's response. Safe but gains nothing.",
    effects: {
      success: { politicalCapital: +1 },
      failure: { politicalCapital: 0 }
    },
    baseSuccessRate: 95
  }
};

/**
 * queueInterpellation() — Player queues a question for the Government.
 * The question will be addressed during the next interpellation slot
 * (typically Thursday morning).
 *
 * @param {string} interpellationId - ID from INTERPELLATION_TOPICS
 * @returns {Object} Queue confirmation
 */
function queueInterpellation(interpellationId) {
  if (!parliamentState) return { error: "State not initialized." };

  const interp = INTERPELLATION_TOPICS.find(i => i.id === interpellationId);
  if (!interp) return { error: `Unknown interpellation: "${interpellationId}"` };

  // Check if already queued
  if (parliamentState.interpellationQueue.find(q => q.id === interpellationId)) {
    return { error: "This question is already queued." };
  }

  // Add to queue
  parliamentState.interpellationQueue.push({
    ...interp,
    queuedAt: Date.now(),
    status: "pending" // "pending" | "asked" | "answered"
  });

  parliamentState.weeklyStats.interpellationsFiled++;
  parliamentState.totalStats.interpellationsFiled++;

  console.log(`[debate.js] Interpellation queued: "${interp.question.substring(0, 50)}..."`);

  return {
    success: true,
    interpellation: interp,
    queuePosition: parliamentState.interpellationQueue.length
  };
}

/**
 * resolveInterpellation() — Resolves a queued interpellation.
 * Called during the interpellation phase of a parliament session.
 *
 * @param {string} interpellationId - The queued question ID
 * @param {string} responseStance - "aggressive" | "diplomatic" | "evade"
 * @returns {Object} Interpellation result
 */
function resolveInterpellation(interpellationId, responseStance) {
  if (!parliamentState) return { error: "State not initialized." };

  const queueItem = parliamentState.interpellationQueue.find(q => q.id === interpellationId);
  if (!queueItem) return { error: "This question is not in the queue." };

  const stance = INTERPELLATION_RESPONSE_STANCES[responseStance];
  if (!stance) return { error: `Unknown response stance: "${responseStance}"` };

  console.log(`[debate.js] ═══ INTERPELLATION RESOLUTION ═══`);
  console.log(`  → Question: ${queueItem.question.substring(0, 50)}...`);
  console.log(`  → Target: ${queueItem.target}`);
  console.log(`  → Player stance: ${stance.label}`);

  // ── Calculate success ──
  let successChance = stance.baseSuccessRate;

  // Difficulty modifier (harder questions are harder to press)
  const difficultyPenalty = (queueItem.difficulty - 50) * 0.3;
  successChance -= difficultyPenalty;

  // Political Capital bonus
  const capBonus = (parliamentState.playerPoliticalCapital || 50) * 0.15;
  successChance += capBonus;

  // Clamp
  successChance = Math.max(10, Math.min(95, successChance));

  // ── Roll ──
  const roll = Math.random() * 100;
  const success = roll < successChance;

  console.log(`  → Success chance: ${successChance.toFixed(1)}%, Roll: ${roll.toFixed(1)} → ${success ? "SUCCESS" : "FAIL"}`);

  // ── Apply effects ──
  const effects = success ? stance.effects.success : stance.effects.failure;
  applyEffects(effects);

  // Mark as answered
  queueItem.status = "answered";
  queueItem.answeredAt = Date.now();
  queueItem.result = success ? "pressed" : "deflected";

  // ── Push to transcript ──
  const questionEntry = {
    id: `interp_q_${Date.now()}`,
    type: "interpellation_question",
    speakerId: "player",
    speakerName: parliamentState.playerName || "Player",
    speakerThaiTitle: "ท่านสมาชิก",
    speakerAlignment: parliamentState.playerAlignment || "opposition",
    speakerColor: "#FFD700",
    speakerAvatar: "❓",
    text: queueItem.questionThai || queueItem.question,
    protestable: false,
    timestamp: Date.now()
  };

  const governmentResponse = {
    id: `interp_a_${Date.now()}`,
    type: "interpellation_answer",
    speakerId: "government_respondent",
    speakerName: queueItem.target,
    speakerThaiTitle: "ท่านรัฐมนตรี",
    speakerAlignment: "government",
    speakerColor: "#1D3557",
    speakerAvatar: "🎙️",
    text: success
      ? `The ${queueItem.target} stumbles over the answer. The opposition benches erupt in applause.`
      : `The ${queueItem.target} delivers a smooth, well-rehearsed response. The government benches bang their desks in approval.`,
    protestable: false,
    timestamp: Date.now()
  };

  if (_debateState.isRunning) {
    _debateState.transcript.push(questionEntry);
    _debateState.transcript.push(governmentResponse);
    _fireDebateCallback("onDialogueAdded", questionEntry);
    _fireDebateCallback("onDialogueAdded", governmentResponse);
  }

  // ── Log ──
  logEvent("interpellation", `Interpellation: ${queueItem.target}`,
    success
      ? `Your pressing question embarrassed the ${queueItem.target}. Political capital gained.`
      : `The ${queueItem.target} deflected your question skillfully. The moment is lost.`,
    effects);

  _fireDebateCallback("onInterpellationResult", {
    success, stance: responseStance, question: queueItem, effects
  });

  return {
    success,
    stanceLabel: stance.label,
    target: queueItem.target,
    capitalChange: effects.politicalCapital || 0,
    popularityChange: effects.localPopularity || 0,
    narrative: success
      ? `The ${queueItem.target} is visibly shaken. Reporters scribble furiously.`
      : `The Government survives another question session. Business as usual.`
  };
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 11: DEBATE CONCLUSION & VOTING
// Ends the debate and triggers a vote on the bill.
// ──────────────────────────────────────────────────────────────────────────

/**
 * _endDebate() — Called when all dialogue rounds are complete.
 * Stops the interval and triggers the voting phase.
 * @private
 */
function _endDebate() {
  // Stop the dialogue stream
  if (_debateState.intervalId) {
    clearInterval(_debateState.intervalId);
    _debateState.intervalId = null;
  }

  console.log("[debate.js] ═══ DEBATE CONCLUDED — VOTING PHASE ═══");

  // Push closing statement from the Speaker
  _pushSpeakerProceduralLine("closeDebate", _debateState.currentTopic);

  _fireDebateCallback("onDebateEnd", _debateState.currentTopic, getDebateSnapshot());

  // Brief pause before vote
  setTimeout(() => {
    _pushSpeakerProceduralLine("callVote", _debateState.currentTopic);
    _fireDebateCallback("onVoteStart", _debateState.currentTopic);
  }, 2000);
}

/**
 * castVote() — The player casts their vote on the bill.
 * AI MPs vote based on party alignment, whip, and debate momentum.
 *
 * @param {string} playerVote - "aye" | "nay" | "abstain"
 * @returns {Object} Vote result: { ayes, nays, abstain, passed, playerVote }
 */
function castVote(playerVote) {
  if (!_debateState.currentTopic) {
    return { error: "No active bill to vote on." };
  }

  const topic = _debateState.currentTopic;
  console.log(`[debate.js] ═══ VOTE CAST: Player votes ${playerVote.toUpperCase()} ═══`);

  // ── Simulate AI voting ──
  // Base: Government has ~260 seats, Opposition has ~240 (realistic Thai parliament)
  let govBaseAyes = 258;
  let oppBaseAyes = 0;

  // Adjust based on topic positions
  if (topic.governmentPosition === "for") {
    govBaseAyes = 255 + Math.floor(Math.random() * 10);
  } else if (topic.governmentPosition === "against") {
    govBaseAyes = 240 - Math.floor(Math.random() * 20);
    oppBaseAyes = 220 + Math.floor(Math.random() * 15);
  } else {
    govBaseAyes = 230 + Math.floor(Math.random() * 30);
  }

  if (topic.oppositionPosition === "for") {
    oppBaseAyes = 230 + Math.floor(Math.random() * 10);
  } else {
    oppBaseAyes = 10 + Math.floor(Math.random() * 20);
  }

  // Controversy affects rebellion (higher controversy = more rebels)
  const rebellionFactor = topic.controversy * 0.1;
  govBaseAyes -= Math.floor(Math.random() * rebellionFactor);
  oppBaseAyes += Math.floor(Math.random() * rebellionFactor * 0.5);

  const totalAyes = Math.max(0, Math.min(500, govBaseAyes + oppBaseAyes));
  const totalNays = 500 - totalAyes - Math.floor(Math.random() * 15); // Some abstain
  const totalAbstain = 500 - totalAyes - Math.max(0, totalNays);

  const passed = totalAyes > 250; // Simple majority of 500

  // ── Player's vote effect ──
  let playerEffect = {};
  if (playerVote === "aye" && passed) {
    playerEffect = { politicalCapital: +2 };
  } else if (playerVote === "nay" && !passed) {
    playerEffect = { politicalCapital: +3 };
  } else if (playerVote === "abstain") {
    playerEffect = { politicalCapital: -1 };
  }
  applyEffects(playerEffect);

  // ── Build result ──
  const result = {
    topicId: topic.id,
    topicTitle: topic.title,
    topicTitleThai: topic.titleThai,
    ayes: totalAyes,
    nays: Math.max(0, totalNays),
    abstain: Math.max(0, totalAbstain),
    passed: passed,
    playerVote: playerVote,
    playerEffect: playerEffect,
    narrative: passed
      ? `The bill passes ${totalAyes}-${Math.max(0, totalNays)}. ${topic.governmentPosition === "for" ? "The government benches erupt in applause." : "A surprise victory for the opposition!"}`
      : `The bill is DEFEATED ${totalAyes}-${Math.max(0, totalNays)}. ${topic.oppositionPosition === "against" ? "The opposition celebrates." : "A rare government defeat."}`
  };

  _debateState.voteResult = result;

  // ── Update stats ──
  if (parliamentState) {
    parliamentState.weeklyStats.votesAttended++;
    parliamentState.totalStats.votesAttended++;
    if (passed) {
      parliamentState.totalStats.billsPassed++;
    } else {
      parliamentState.totalStats.billsDefeated++;
    }
  }

  // ── Push vote result to transcript ──
  const voteEntry = {
    id: `vote_${Date.now()}`,
    type: "vote_result",
    speakerId: "speaker_of_house",
    speakerName: "Speaker of the House",
    speakerThaiTitle: "ท่านประธานสภา",
    speakerAlignment: "neutral",
    speakerColor: passed ? "#28A745" : "#DC3545",
    speakerAvatar: "🗳️",
    text: `ผลการลงมติ: เห็นด้วย ${totalAyes} เสียง / ไม่เห็นด้วย ${Math.max(0, totalNays)} เสียง / งดออกเสียง ${Math.max(0, totalAbstain)} เสียง — ${passed ? "ที่ประชุมมีมติเห็นชอบ" : "ที่ประชุมมีมติไม่เห็นชอบ"}`,
    protestable: false,
    timestamp: Date.now()
  };

  _debateState.transcript.push(voteEntry);
  _fireDebateCallback("onDialogueAdded", voteEntry);
  _fireDebateCallback("onVoteResult", result);

  // ── Log ──
  logEvent("vote", `Vote: ${topic.title}`,
    `${passed ? "PASSED" : "DEFEATED"} ${totalAyes}-${Math.max(0, totalNays)}. You voted ${playerVote.toUpperCase()}.`,
    playerEffect);

  // ── Mark debate as complete ──
  _debateState.isRunning = false;
  if (parliamentState) {
    parliamentState.isDebateInProgress = false;
  }

  console.log(`[debate.js] Vote result: ${passed ? "PASSED" : "DEFEATED"} ${totalAyes}-${Math.max(0, totalNays)}`);

  return result;
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 12: DEBATE CONTROL FUNCTIONS
// Pause, resume, stop, and query the debate state.
// ──────────────────────────────────────────────────────────────────────────

/**
 * pauseDebate() — Temporarily pauses the dialogue stream.
 */
function pauseDebate() {
  _debateState.isPaused = true;
  console.log("[debate.js] Debate paused.");
}

/**
 * resumeDebate() — Resumes a paused dialogue stream.
 */
function resumeDebate() {
  _debateState.isPaused = false;
  _debateState.playerTurnPending = false;
  console.log("[debate.js] Debate resumed.");
}

/**
 * stopDebate() — Force-stops the current debate.
 * Used for emergencies (dissolution, walkout, etc.)
 */
function stopDebate() {
  if (_debateState.intervalId) {
    clearInterval(_debateState.intervalId);
    _debateState.intervalId = null;
  }
  if (_debateState.protestCooldownTimer) {
    clearTimeout(_debateState.protestCooldownTimer);
  }

  _debateState.isRunning = false;
  _debateState.isPaused = false;

  if (parliamentState) {
    parliamentState.isDebateInProgress = false;
  }

  console.log("[debate.js] Debate force-stopped.");
  _fireDebateCallback("onDebateEnd", _debateState.currentTopic, getDebateSnapshot());
}

/**
 * getDebateSnapshot() — Returns a read-only snapshot of the current
 * debate state for the UI.
 *
 * @returns {Object} Current debate state snapshot
 */
function getDebateSnapshot() {
  return {
    isRunning: _debateState.isRunning,
    isPaused: _debateState.isPaused,
    topic: _debateState.currentTopic,
    currentSpeaker: _debateState.currentSpeaker,
    currentDialogue: _debateState.currentDialogue,
    transcript: [..._debateState.transcript],
    roundsCompleted: _debateState.roundsCompleted,
    totalRounds: _debateState.totalRounds,
    progress: _debateState.totalRounds > 0
      ? Math.round((_debateState.roundsCompleted / _debateState.totalRounds) * 100)
      : 0,
    playerTurnPending: _debateState.playerTurnPending,
    playerHasSpoken: _debateState.playerHasSpoken,
    protestCooldown: _debateState.protestCooldown,
    speakerMomentum: { ..._debateState.speakerMomentum },
    voteResult: _debateState.voteResult,
    canProtest: _debateState.isRunning
      && !_debateState.isPaused
      && !_debateState.protestCooldown
      && !_debateState.playerTurnPending
      && _debateState.currentSpeaker !== null,
    canSpeak: _debateState.playerTurnPending && !_debateState.playerHasSpoken
  };
}

/**
 * getRandomDebateTopic() — Returns a random topic for quick start.
 * @returns {Object} A DEBATE_TOPICS entry
 */
function getRandomDebateTopic() {
  return DEBATE_TOPICS[Math.floor(Math.random() * DEBATE_TOPICS.length)];
}

/**
 * getDebateTopics() — Returns all available debate topics.
 * @returns {Object[]} Array of DEBATE_TOPICS entries
 */
function getDebateTopics() {
  return [...DEBATE_TOPICS];
}

/**
 * getInterpellationTopics() — Returns all available interpellation questions.
 * @returns {Object[]} Array of INTERPELLATION_TOPICS entries
 */
function getInterpellationTopics() {
  return [...INTERPELLATION_TOPICS];
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 13: LIVE DEBATE SPEED BINDING (STEP 4)
// Listen for the settings modal's debate speed slider changes and
// dynamically restart the debate interval at the new speed.
// ──────────────────────────────────────────────────────────────────────────

window.addEventListener('tps:debate-speed-changed', (e) => {
  const speed = e.detail?.speed || 1;
  const newInterval = Math.round(3000 / speed);
  console.log(`[debate.js] ⚡ Debate speed changed to ${speed}× (interval: ${newInterval}ms)`);

  // Update the internal state
  _debateState.dialogueIntervalMs = newInterval;

  // If a debate is running, restart the interval at the new speed
  if (_debateState.isRunning && _debateState.intervalId) {
    clearInterval(_debateState.intervalId);
    _debateState.intervalId = setInterval(() => {
      if (_debateState.isPaused) return;
      _advanceDialogue();
    }, newInterval);
    console.log(`[debate.js] ⚡ Dialogue stream restarted at ${newInterval}ms`);
  }
});


// ──────────────────────────────────────────────────────────────────────────
// SECTION 14: MODULE INITIALIZATION LOG
// ──────────────────────────────────────────────────────────────────────────

console.log("═══════════════════════════════════════════════════════════");
console.log("[parliament-test/debate.js] Live Debate Engine loaded.");
console.log(`  → ${DEBATE_TOPICS.length} debate topics defined`);
console.log(`  → ${AI_SPEAKERS.length} AI speakers (${AI_SPEAKERS.filter(s=>s.alignment==="government").length} Gov / ${AI_SPEAKERS.filter(s=>s.alignment==="opposition").length} Opp)`);
console.log(`  → ${PROTEST_REASONS.length} protest reasons`);
console.log(`  → ${INTERPELLATION_TOPICS.length} interpellation topics`);
console.log(`  → ${Object.keys(PLAYER_SPEECH_STANCES).length} player speech stances`);
console.log("  → runDebate(), raiseProtest(), playerSpeak() ready");
console.log("  → queueInterpellation(), resolveInterpellation() ready");
console.log("  → Live debate speed binding active (tps:debate-speed-changed)");
console.log("═══════════════════════════════════════════════════════════");
