// ═══════════════════════════════════════════════════════════════════════════
// THAILAND POLITICAL SIMULATION — /parliament-test/data.js
// v.1.0.1 Test: "The Parliament RPG" Module
// ═══════════════════════════════════════════════════════════════════════════
//
// PURPOSE:
//   Defines the core GameState for the Parliament RPG module.
//   Tracks the player's daily schedule inside the Thai Parliament,
//   their Political Capital, Local Popularity, and the strict
//   weekly schedule that governs what events fire on each day.
//
// ARCHITECTURE:
//   This file is ISOLATED from /campaign/ and /main-game/.
//   It shares NO global state with those modules.
//   Future integration (Part 2+) will bridge them via a Unified Time Engine.
//
// THAI PARLIAMENTARY REFERENCE:
//   - สภาผู้แทนราษฎร (House of Representatives): 500 MPs
//   - ประธานสภา (Speaker of the House): Presides over debates
//   - กระทู้ถามสด (Live Interpellation): Opposition questions the government
//   - การอภิปรายไม่ไว้วางใจ (Censure Debate): No-confidence motion
//   - ข้อบังคับการประชุม (Rules of Procedure): Governs debate conduct
// ═══════════════════════════════════════════════════════════════════════════


// ──────────────────────────────────────────────────────────────────────────
// SECTION 1: DAY & TIME ENUMERATIONS
// The Parliament operates on a strict weekly cycle.
// Time-of-day determines what phase the player is in.
// ──────────────────────────────────────────────────────────────────────────

/**
 * DAY_NAMES — The 7 days of the parliamentary week.
 * Thai Parliament typically sits Wed-Thu, with Fri reserved for urgent matters.
 * Mon-Tue are constituency/committee days.
 * Sat-Sun are rest days (with possible crises).
 */
const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/**
 * DAY_NAMES_THAI — Thai translations for the UI.
 */
const DAY_NAMES_THAI = ["วันจันทร์", "วันอังคาร", "วันพุธ", "วันพฤหัสบดี", "วันศุกร์", "วันเสาร์", "วันอาทิตย์"];

/**
 * TIME_PHASES — Each day is divided into 3 phases.
 * Morning:   Committee work, preparation, constituency office hours
 * Afternoon: Parliament sessions, debates, votes
 * Evening:   Backroom deals, media appearances, party meetings
 */
const TIME_PHASES = ["Morning", "Afternoon", "Evening"];

/**
 * TIME_PHASES_THAI — Thai translations for the UI.
 */
const TIME_PHASES_THAI = ["ช่วงเช้า", "ช่วงบ่าย", "ช่วงเย็น"];


// ──────────────────────────────────────────────────────────────────────────
// SECTION 2: WEEKLY SCHEDULE DEFINITION
// Defines what type of events occur on each day of the week.
// This is the backbone of the Parliament RPG's rhythm.
// ──────────────────────────────────────────────────────────────────────────

/**
 * SCHEDULE_TYPES — The categories of parliamentary activities.
 * Each type triggers different gameplay mechanics.
 *
 * constituency:  Player is in their home district doing local work.
 *                - Gains: LocalPopularity, minor Funds
 *                - Risk: Missing committee meetings
 *
 * committee:     Standing/select committee meetings.
 *                - Gains: PoliticalCapital, Influence (future)
 *                - Player reviews bills, questions witnesses
 *
 * parliament:    Full House session (การประชุมสภาผู้แทนราษฎร).
 *                - Triggers the LIVE DEBATE ENGINE
 *                - Bill readings, votes, interpellations
 *                - This is the CORE gameplay phase
 *
 * urgent:        Urgent motions, censure debates (อภิปรายไม่ไว้วางใจ).
 *                - High-stakes, high-risk events
 *                - Massive Political Capital swings
 *
 * rest:          Weekend. No formal duties.
 *                - Optional: media appearances, party meetings
 *                - Chance for random crisis events
 */
const SCHEDULE_TYPES = {
  constituency: {
    id: "constituency",
    label: "Constituency Work",
    labelThai: "งานในพื้นที่",
    description: "Visit your constituents, attend local events, hold office hours.",
    color: "#2A9D8F",          // Teal — calming, local
    icon: "🏘️",
    isParliamentDay: false
  },
  committee: {
    id: "committee",
    label: "Committee Meeting",
    labelThai: "ประชุมคณะกรรมาธิการ",
    description: "Attend standing committee meetings, review legislation, question experts.",
    color: "#457B9D",          // Steel blue — procedural
    icon: "📋",
    isParliamentDay: false
  },
  parliament: {
    id: "parliament",
    label: "Parliament Session",
    labelThai: "ประชุมสภาผู้แทนราษฎร",
    description: "Full House session. Bills are debated, interpellations filed, votes cast.",
    color: "#E63946",          // Red — intense, formal
    icon: "🏛️",
    isParliamentDay: true       // ← This flag triggers the Live Debate Engine
  },
  urgent: {
    id: "urgent",
    label: "Urgent Motion / Censure Debate",
    labelThai: "ญัตติด่วน / อภิปรายไม่ไว้วางใจ",
    description: "Emergency motions, no-confidence debates. The highest stakes in Parliament.",
    color: "#FF6B2B",          // Orange — urgency, danger
    icon: "⚠️",
    isParliamentDay: true       // ← Also triggers Live Debate, but with censure rules
  },
  rest: {
    id: "rest",
    label: "Weekend",
    labelThai: "วันหยุด",
    description: "Rest day. Possibility of crisis events or backroom meetings.",
    color: "#6C757D",          // Grey — downtime
    icon: "🌙",
    isParliamentDay: false
  }
};

/**
 * WEEKLY_SCHEDULE — Maps each day index (0=Mon) to its schedule type.
 *
 * Monday:    Constituency Work + Committee Meetings (AM/PM split)
 * Tuesday:   Committee Meetings (full day)
 * Wednesday: PARLIAMENT SESSION ← Live Debate Engine activates
 * Thursday:  PARLIAMENT SESSION ← Live Debate Engine activates
 * Friday:    Urgent Motions / Censure Debates
 * Saturday:  Rest (crisis chance)
 * Sunday:    Rest (crisis chance)
 */
const WEEKLY_SCHEDULE = [
  // Index 0: Monday
  {
    dayIndex: 0,
    dayName: "Monday",
    dayNameThai: "วันจันทร์",
    phases: {
      Morning:   SCHEDULE_TYPES.constituency,  // Meet constituents in the morning
      Afternoon: SCHEDULE_TYPES.committee,      // Committee work in the afternoon
      Evening:   SCHEDULE_TYPES.rest            // Free evening (optional networking)
    },
    primaryType: SCHEDULE_TYPES.constituency,
    description: "Constituency office hours in the morning, committee prep in the afternoon."
  },
  // Index 1: Tuesday
  {
    dayIndex: 1,
    dayName: "Tuesday",
    dayNameThai: "วันอังคาร",
    phases: {
      Morning:   SCHEDULE_TYPES.committee,      // Committee hearings
      Afternoon: SCHEDULE_TYPES.committee,      // Continue committee work
      Evening:   SCHEDULE_TYPES.rest            // Party meetings
    },
    primaryType: SCHEDULE_TYPES.committee,
    description: "Full day of committee hearings and legislative review."
  },
  // Index 2: Wednesday — PARLIAMENT DAY
  {
    dayIndex: 2,
    dayName: "Wednesday",
    dayNameThai: "วันพุธ",
    phases: {
      Morning:   SCHEDULE_TYPES.parliament,     // Question Time / First readings
      Afternoon: SCHEDULE_TYPES.parliament,     // Debates and votes
      Evening:   SCHEDULE_TYPES.rest            // Debrief
    },
    primaryType: SCHEDULE_TYPES.parliament,
    description: "Full House session. Question Time, bill debates, and voting."
  },
  // Index 3: Thursday — PARLIAMENT DAY
  {
    dayIndex: 3,
    dayName: "Thursday",
    dayNameThai: "วันพฤหัสบดี",
    phases: {
      Morning:   SCHEDULE_TYPES.parliament,     // Interpellations (กระทู้ถามสด)
      Afternoon: SCHEDULE_TYPES.parliament,     // Continued debate
      Evening:   SCHEDULE_TYPES.rest            // Media appearances
    },
    primaryType: SCHEDULE_TYPES.parliament,
    description: "Continued House session. Interpellations and second readings."
  },
  // Index 4: Friday — URGENT/CENSURE
  {
    dayIndex: 4,
    dayName: "Friday",
    dayNameThai: "วันศุกร์",
    phases: {
      Morning:   SCHEDULE_TYPES.urgent,         // Emergency motions
      Afternoon: SCHEDULE_TYPES.urgent,         // Censure debates if triggered
      Evening:   SCHEDULE_TYPES.rest            // Crisis management
    },
    primaryType: SCHEDULE_TYPES.urgent,
    description: "Reserved for urgent motions and no-confidence debates."
  },
  // Index 5: Saturday — REST
  {
    dayIndex: 5,
    dayName: "Saturday",
    dayNameThai: "วันเสาร์",
    phases: {
      Morning:   SCHEDULE_TYPES.rest,
      Afternoon: SCHEDULE_TYPES.rest,
      Evening:   SCHEDULE_TYPES.rest
    },
    primaryType: SCHEDULE_TYPES.rest,
    description: "Weekend. Random events may still fire (media, crises)."
  },
  // Index 6: Sunday — REST
  {
    dayIndex: 6,
    dayName: "Sunday",
    dayNameThai: "วันอาทิตย์",
    phases: {
      Morning:   SCHEDULE_TYPES.rest,
      Afternoon: SCHEDULE_TYPES.rest,
      Evening:   SCHEDULE_TYPES.rest
    },
    primaryType: SCHEDULE_TYPES.rest,
    description: "Weekend. Prepare for the week ahead."
  }
];


// ──────────────────────────────────────────────────────────────────────────
// SECTION 3: PASSIVE EVENT DEFINITIONS
// Events that can fire during Constituency/Committee days.
// These are "mini-events" — quick choices with stat effects.
// ──────────────────────────────────────────────────────────────────────────

/**
 * CONSTITUENCY_EVENTS — Random events during Mon constituency work.
 * Each event offers choices that affect LocalPopularity and other stats.
 */
const CONSTITUENCY_EVENTS = [
  {
    id: "ce_flood_aid",
    title: "Flood Relief Request",
    titleThai: "ชาวบ้านร้องขอช่วยเหลือน้ำท่วม",
    description: "Your constituents are suffering from recent floods. A village elder asks for your help allocating emergency funds.",
    choices: [
      {
        label: "Allocate Emergency Funds",
        labelThai: "จัดสรรงบฉุกเฉิน",
        effects: { localPopularity: +8, politicalCapital: -3, funds: -50 },
        narrative: "You pull strings to divert emergency funds. The village praises your swift action."
      },
      {
        label: "Promise Future Help",
        labelThai: "สัญญาว่าจะช่วยภายหลัง",
        effects: { localPopularity: +2, politicalCapital: +1 },
        narrative: "You make sympathetic promises. Some believe you, others grow cynical."
      }
    ]
  },
  {
    id: "ce_school_visit",
    title: "School Inspection Visit",
    titleThai: "ตรวจเยี่ยมโรงเรียน",
    description: "A local school invites you to their annual ceremony. It's a photo op — but your committee prep awaits.",
    choices: [
      {
        label: "Attend the Ceremony",
        labelThai: "ไปร่วมงาน",
        effects: { localPopularity: +5, politicalCapital: -1 },
        narrative: "You cut the ribbon and give a speech. The local press covers it favorably."
      },
      {
        label: "Send a Representative",
        labelThai: "ส่งตัวแทนไป",
        effects: { localPopularity: -2, politicalCapital: +2 },
        narrative: "Your staff attends on your behalf. You focus on preparing for Parliament."
      }
    ]
  },
  {
    id: "ce_factory_dispute",
    title: "Factory Worker Strike",
    titleThai: "แรงงานประท้วงในโรงงาน",
    description: "A factory in your constituency is laying off workers. Union leaders demand you intervene.",
    choices: [
      {
        label: "Side with Workers",
        labelThai: "เข้าข้างแรงงาน",
        effects: { localPopularity: +6, politicalCapital: -2, funds: -20 },
        narrative: "You publicly support the workers. The factory owner donates to the opposition."
      },
      {
        label: "Mediate Quietly",
        labelThai: "ไกล่เกลี่ยเงียบๆ",
        effects: { localPopularity: +2, politicalCapital: +3 },
        narrative: "You broker a behind-the-scenes deal. Both sides are lukewarm but the crisis fades."
      },
      {
        label: "Ignore the Issue",
        labelThai: "ไม่ยุ่ง",
        effects: { localPopularity: -5, politicalCapital: +1 },
        narrative: "You stay out of it. The media calls you 'disconnected from the people.'"
      }
    ]
  },
  {
    id: "ce_temple_donation",
    title: "Temple Donation Request",
    titleThai: "วัดขอบริจาค",
    description: "The abbot of the main temple in your district asks for a generous donation for renovations.",
    choices: [
      {
        label: "Donate Generously",
        labelThai: "บริจาคอย่างงาม",
        effects: { localPopularity: +7, funds: -80 },
        narrative: "Your generosity is announced during the morning sermon. The whole district knows."
      },
      {
        label: "Donate Modestly",
        labelThai: "บริจาคพอประมาณ",
        effects: { localPopularity: +3, funds: -20 },
        narrative: "A respectful amount. The abbot nods approvingly but doesn't mention it publicly."
      }
    ]
  },
  {
    id: "ce_market_visit",
    title: "Morning Market Walkabout",
    titleThai: "เดินตลาดเช้า",
    description: "Your advisor suggests a morning market walkabout for visibility. Vendors want to complain about rising costs.",
    choices: [
      {
        label: "Walk the Market & Listen",
        labelThai: "เดินตลาดรับฟังปัญหา",
        effects: { localPopularity: +4, politicalCapital: +1 },
        narrative: "You shake hands, take selfies, and listen to grievances. Good press coverage."
      },
      {
        label: "Skip — Prepare for Parliament",
        labelThai: "ข้าม — เตรียมตัวประชุมสภา",
        effects: { localPopularity: -1, politicalCapital: +3 },
        narrative: "You spend the morning studying the upcoming bill. You'll be sharper in debate."
      }
    ]
  }
];

/**
 * COMMITTEE_EVENTS — Random events during Committee meeting days.
 * More procedural and political-capital-focused.
 */
const COMMITTEE_EVENTS = [
  {
    id: "com_witness",
    title: "Key Witness Testimony",
    titleThai: "พยานสำคัญให้การ",
    description: "A whistleblower is testifying before your committee about government corruption.",
    choices: [
      {
        label: "Grill the Witness (Aggressive)",
        labelThai: "ซักถามอย่างดุดัน",
        effects: { politicalCapital: +5, localPopularity: -1 },
        narrative: "Your sharp questioning goes viral. The opposition loves it. The ruling party takes note."
      },
      {
        label: "Ask Technical Questions",
        labelThai: "ถามคำถามเชิงเทคนิค",
        effects: { politicalCapital: +3, localPopularity: +1 },
        narrative: "Your detailed, methodical approach impresses the legal community."
      },
      {
        label: "Let Others Lead",
        labelThai: "ปล่อยให้คนอื่นนำ",
        effects: { politicalCapital: -2, localPopularity: 0 },
        narrative: "You observe quietly. Some say you're being strategic. Others say you're coasting."
      }
    ]
  },
  {
    id: "com_budget_review",
    title: "Budget Line Scrutiny",
    titleThai: "ตรวจสอบงบประมาณ",
    description: "Your committee is reviewing the Ministry of Transport's budget. A suspicious ฿200M line item stands out.",
    choices: [
      {
        label: "Challenge the Line Item",
        labelThai: "ท้วงรายการงบ",
        effects: { politicalCapital: +4, localPopularity: +2 },
        narrative: "You demand an explanation. The Deputy Minister stumbles. Headlines tomorrow."
      },
      {
        label: "Note It for Later",
        labelThai: "จดไว้ใช้ทีหลัง",
        effects: { politicalCapital: +2, localPopularity: 0 },
        narrative: "You privately document the anomaly. Ammunition for a future interpellation."
      }
    ]
  },
  {
    id: "com_bill_amendment",
    title: "Bill Amendment Proposal",
    titleThai: "เสนอแก้ไขร่าง พ.ร.บ.",
    description: "A fellow MP asks you to co-sponsor an amendment to a pending health care bill.",
    choices: [
      {
        label: "Co-sponsor the Amendment",
        labelThai: "ร่วมเสนอแก้ไข",
        effects: { politicalCapital: +3, localPopularity: +3 },
        narrative: "Your name appears on the amendment. It strengthens your reform credentials."
      },
      {
        label: "Decline Politely",
        labelThai: "ปฏิเสธอย่างสุภาพ",
        effects: { politicalCapital: +1, localPopularity: -1 },
        narrative: "You avoid a potential controversy but lose a potential ally."
      }
    ]
  }
];


// ──────────────────────────────────────────────────────────────────────────
// SECTION 4: PLAYER & GAME STATE
// The central state object for the Parliament RPG module.
// ──────────────────────────────────────────────────────────────────────────

/**
 * PARLIAMENT_GAME_STATE — The master state for the Parliament RPG.
 *
 * currentDayIndex:     0-6 (Mon-Sun), maps into WEEKLY_SCHEDULE
 * currentTimeIndex:    0-2 (Morning/Afternoon/Evening), maps into TIME_PHASES
 * currentWeek:         Tracks which week of the session we're in (1-based)
 * totalDaysElapsed:    Running counter of all days passed
 *
 * playerPoliticalCapital: 0-100. Earned through parliamentary performance.
 *   - Used to fuel protests, interpellations, and party maneuvers.
 *   - Depleted by failed protests, ignoring duties, scandals.
 *
 * playerLocalPopularity:  0-100. Earned through constituency work.
 *   - Decays if the player neglects their district.
 *   - Critical for re-election and party standing.
 *
 * playerFunds:         Campaign/personal funds (in millions ฿).
 *                      Used for polling, events, and bribes.
 *
 * currentPhase:        "macro" | "parliament"
 *   - "macro":       Player is in the timeline view (constituency/committee/rest)
 *   - "parliament":  Player is in the Live Debate Engine (debate.js takes over)
 *
 * activeBill:          Currently debated bill object, or null
 * debateLog:           Array of debate dialogue objects
 * interpellationQueue: Player's queued questions for the government
 * protestHistory:      Log of all protests raised (for scoring)
 *
 * playerRole:          "mp" | "party_leader" | "minister"
 *   - Determines available actions and UI panels
 *
 * playerPartyId:       Links to CAMPAIGN_PARTIES (from campaign/data.js)
 * playerAlignment:     "government" | "opposition"
 */
const INITIAL_PARLIAMENT_STATE = {
  // ── Time Tracking ──
  currentDayIndex: 0,              // 0 = Monday
  currentTimeIndex: 0,             // 0 = Morning
  currentWeek: 1,                  // Week 1 of the session
  totalDaysElapsed: 0,             // Running total

  // ── Player Core Stats ──
  playerPoliticalCapital: 50,      // Start at 50/100 — middle ground
  playerLocalPopularity: 50,       // Start at 50/100 — middle ground
  playerFunds: 500,                // Starting funds (millions ฿)

  // ── Phase Control ──
  currentPhase: "macro",           // "macro" or "parliament"

  // ── Parliamentary Records ──
  activeBill: null,                // Active bill being debated
  debateLog: [],                   // Scrolling transcript of dialogue
  interpellationQueue: [],         // Player's queued questions

  // ── Protest/Point of Order History ──
  protestHistory: [],              // { day, topic, reason, outcome, capitalChange }

  // ── Player Identity ──
  playerRole: "mp",                // "mp", "party_leader", "minister"
  playerPartyId: null,             // Set during initialization
  playerAlignment: "opposition",   // "government" or "opposition"
  playerName: "Player",            // Player's in-game name
  playerConstituency: "Bangkok District 1",  // Default

  // ── Session Stats (reset weekly) ──
  weeklyStats: {
    debatesParticipated: 0,
    protestsRaised: 0,
    protestsSucceeded: 0,
    votesAttended: 0,
    interpellationsFiled: 0,
    constituencyVisits: 0,
    committeesAttended: 0
  },

  // ── Cumulative Stats ──
  totalStats: {
    debatesParticipated: 0,
    protestsRaised: 0,
    protestsSucceeded: 0,
    votesAttended: 0,
    interpellationsFiled: 0,
    constituencyVisits: 0,
    committeesAttended: 0,
    billsProposed: 0,
    billsPassed: 0,
    billsDefeated: 0,
    censureDebatesSurvived: 0
  },

  // ── Event Log ──
  eventLog: [],                    // { day, week, type, title, description, effects }

  // ── Game Flags ──
  isParliamentDissolved: false,
  isCensureActive: false,
  isDebateInProgress: false,
  gameOver: false,
  gameOverReason: null
};

/**
 * Live mutable state — deep-cloned from INITIAL_PARLIAMENT_STATE
 * at game start, so the template is never mutated.
 */
var parliamentState = null;

/**
 * initParliamentState() — Initializes a fresh Parliament RPG game.
 *
 * @param {Object} config - Optional configuration overrides
 * @param {string} config.playerPartyId - Which party the player belongs to
 * @param {string} config.playerRole - "mp", "party_leader", "minister"
 * @param {string} config.playerAlignment - "government" or "opposition"
 * @param {string} config.playerName - The player's in-game name
 * @param {string} config.playerConstituency - The player's constituency
 * @returns {Object} The initialized parliamentState
 */
function initParliamentState(config = {}) {
  // Deep clone the template to avoid mutation
  parliamentState = JSON.parse(JSON.stringify(INITIAL_PARLIAMENT_STATE));

  // Apply configuration overrides
  if (config.playerPartyId)      parliamentState.playerPartyId = config.playerPartyId;
  if (config.playerRole)         parliamentState.playerRole = config.playerRole;
  if (config.playerAlignment)    parliamentState.playerAlignment = config.playerAlignment;
  if (config.playerName)         parliamentState.playerName = config.playerName;
  if (config.playerConstituency) parliamentState.playerConstituency = config.playerConstituency;

  // Log initialization
  console.log(`[parliament/data.js] Parliament RPG initialized.`);
  console.log(`  → Player: ${parliamentState.playerName}`);
  console.log(`  → Role: ${parliamentState.playerRole}`);
  console.log(`  → Alignment: ${parliamentState.playerAlignment}`);
  console.log(`  → Political Capital: ${parliamentState.playerPoliticalCapital}`);
  console.log(`  → Local Popularity: ${parliamentState.playerLocalPopularity}`);

  return parliamentState;
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 5: HELPER / ACCESSOR FUNCTIONS
// Convenient getters for the current state.
// ──────────────────────────────────────────────────────────────────────────

/**
 * getCurrentDaySchedule() — Returns the full schedule object for today.
 * @returns {Object} WEEKLY_SCHEDULE entry for the current day
 */
function getCurrentDaySchedule() {
  if (!parliamentState) return null;
  return WEEKLY_SCHEDULE[parliamentState.currentDayIndex];
}

/**
 * getCurrentPhaseType() — Returns the SCHEDULE_TYPES entry for the
 * current day + current time-of-day combination.
 * @returns {Object} SCHEDULE_TYPES entry
 */
function getCurrentPhaseType() {
  if (!parliamentState) return null;
  const schedule = WEEKLY_SCHEDULE[parliamentState.currentDayIndex];
  const timeName = TIME_PHASES[parliamentState.currentTimeIndex];
  return schedule.phases[timeName];
}

/**
 * isParliamentDay() — Quick check: is today a Parliament/Urgent day?
 * Used by timeline.js to decide whether to transition to Live Debate.
 * @returns {boolean}
 */
function isParliamentDay() {
  if (!parliamentState) return false;
  const schedule = WEEKLY_SCHEDULE[parliamentState.currentDayIndex];
  return schedule.primaryType.isParliamentDay;
}

/**
 * isUrgentDay() — Check if today is specifically a censure/urgent day.
 * @returns {boolean}
 */
function isUrgentDay() {
  if (!parliamentState) return false;
  const schedule = WEEKLY_SCHEDULE[parliamentState.currentDayIndex];
  return schedule.primaryType.id === "urgent";
}

/**
 * getDayDisplayString() — Formatted string for UI display.
 * e.g., "Week 3 — Wednesday (วันพุธ) — Afternoon (ช่วงบ่าย)"
 * @returns {string}
 */
function getDayDisplayString() {
  if (!parliamentState) return "";
  const s = parliamentState;
  const dayEn = DAY_NAMES[s.currentDayIndex];
  const dayTh = DAY_NAMES_THAI[s.currentDayIndex];
  const timeEn = TIME_PHASES[s.currentTimeIndex];
  const timeTh = TIME_PHASES_THAI[s.currentTimeIndex];
  return `Week ${s.currentWeek} — ${dayEn} (${dayTh}) — ${timeEn} (${timeTh})`;
}

/**
 * getRandomConstituencyEvent() — Returns a random event from the pool.
 * @returns {Object} A constituency event object
 */
function getRandomConstituencyEvent() {
  return CONSTITUENCY_EVENTS[Math.floor(Math.random() * CONSTITUENCY_EVENTS.length)];
}

/**
 * getRandomCommitteeEvent() — Returns a random committee event.
 * @returns {Object} A committee event object
 */
function getRandomCommitteeEvent() {
  return COMMITTEE_EVENTS[Math.floor(Math.random() * COMMITTEE_EVENTS.length)];
}

/**
 * clampStat() — Utility to keep a stat within [0, max] bounds.
 * @param {number} value - The current value
 * @param {number} max - The maximum allowed (default 100)
 * @returns {number} Clamped value
 */
function clampStat(value, max = 100) {
  return Math.max(0, Math.min(max, value));
}

/**
 * applyEffects() — Applies a set of stat effects to the player.
 * Used by event choices to modify player stats.
 * @param {Object} effects - { politicalCapital, localPopularity, funds }
 */
function applyEffects(effects) {
  if (!parliamentState || !effects) return;

  if (effects.politicalCapital !== undefined) {
    parliamentState.playerPoliticalCapital = clampStat(
      parliamentState.playerPoliticalCapital + effects.politicalCapital
    );
  }
  if (effects.localPopularity !== undefined) {
    parliamentState.playerLocalPopularity = clampStat(
      parliamentState.playerLocalPopularity + effects.localPopularity
    );
  }
  if (effects.funds !== undefined) {
    parliamentState.playerFunds = Math.max(0, parliamentState.playerFunds + effects.funds);
  }

  console.log(`[data.js] Effects applied:`, effects);
  console.log(`  → PoliticalCapital: ${parliamentState.playerPoliticalCapital}`);
  console.log(`  → LocalPopularity: ${parliamentState.playerLocalPopularity}`);
  console.log(`  → Funds: ${parliamentState.playerFunds}M ฿`);
}

/**
 * logEvent() — Pushes an event to the event log.
 * @param {string} type - Event type (constituency, committee, debate, protest, etc.)
 * @param {string} title - Short title
 * @param {string} description - Full description
 * @param {Object} effects - Stat effects applied
 */
function logEvent(type, title, description, effects = {}) {
  if (!parliamentState) return;
  parliamentState.eventLog.push({
    day: parliamentState.totalDaysElapsed,
    week: parliamentState.currentWeek,
    dayName: DAY_NAMES[parliamentState.currentDayIndex],
    timeName: TIME_PHASES[parliamentState.currentTimeIndex],
    type,
    title,
    description,
    effects,
    timestamp: Date.now()
  });
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 6: MODULE INITIALIZATION LOG
// ──────────────────────────────────────────────────────────────────────────

console.log("═══════════════════════════════════════════════════════════");
console.log("[parliament-test/data.js] Module loaded successfully.");
console.log(`  → ${DAY_NAMES.length} days defined in weekly cycle`);
console.log(`  → ${TIME_PHASES.length} time phases per day`);
console.log(`  → ${Object.keys(SCHEDULE_TYPES).length} schedule types`);
console.log(`  → ${CONSTITUENCY_EVENTS.length} constituency events`);
console.log(`  → ${COMMITTEE_EVENTS.length} committee events`);
console.log("  → Ready for initParliamentState() call");
console.log("═══════════════════════════════════════════════════════════");
