// ═══════════════════════════════════════════════════════════════════════════
// THAILAND POLITICAL SIMULATION — /campaign/timeline.js
// v.1.0.1 Test Patch — Unified Time Engine
// ═══════════════════════════════════════════════════════════════════════════
//
// PURPOSE:
//   Replaces the "End Week" button with a daily "Next Turn" system.
//   Each click advances currentDay by 1. When a Parliament Day (Wed/Thu)
//   is reached, the player is FORCED to choose: Enter Parliament or Ignore.
//
// INTEGRATION:
//   - Bridges /campaign/ and /parliament-test/ via a shared Calendar
//   - The "Week X/8" display updates only every 7th day
//   - Parliament redirect sends the player to /parliament-test/index.html
//
// DEPENDENCIES:
//   - campaign/data.js must be loaded first
//   - campaign/engine.js for action logic
//
// ═══════════════════════════════════════════════════════════════════════════


// ──────────────────────────────────────────────────────────────────────────
// SECTION 1: UNIFIED CALENDAR OBJECT
// Tracks day-level time across the entire 56-day (8-week) campaign.
// ──────────────────────────────────────────────────────────────────────────

/**
 * DAY_LABELS — English day names for the weekly cycle.
 */
const CAL_DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const CAL_DAY_NAMES_FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const CAL_DAY_NAMES_THAI = ["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์", "อาทิตย์"];

/**
 * DAY_TYPES — Classification of each day of the week.
 * Determines what actions are available and what events fire.
 *
 * campaign:    Standard campaign action days (Mon/Tue/Sat)
 * parliament:  Parliament session days — triggers notification (Wed/Thu)
 * urgent:      Urgent/crisis day (Fri)
 * rest:        Sunday rest day
 */
const CAL_DAY_TYPES = {
  0: { type: "campaign",   label: "Campaign Day",       color: "#2A9D8F", icon: "📢", isParliament: false },
  1: { type: "campaign",   label: "Campaign Day",       color: "#2A9D8F", icon: "📋", isParliament: false },
  2: { type: "parliament", label: "Parliament Day",     color: "#E63946", icon: "🏛️", isParliament: true  },
  3: { type: "parliament", label: "Parliament Day",     color: "#E63946", icon: "🏛️", isParliament: true  },
  4: { type: "urgent",     label: "Urgent Motion Day",  color: "#FF6B2B", icon: "⚠️", isParliament: true  },
  5: { type: "campaign",   label: "Weekend Campaign",   color: "#457B9D", icon: "🏘️", isParliament: false },
  6: { type: "rest",       label: "Rest Day",           color: "#6C757D", icon: "🌙", isParliament: false }
};

/**
 * CampaignCalendar — The unified Calendar object that tracks
 * day-level progression through the 56-day campaign.
 *
 * Properties:
 *   currentDay:  1-56 (absolute day number)
 *   week:        Math.ceil(day / 7) → 1-8
 *   dayOfWeek:   0-6 → Mon-Sun
 *   dayName:     "Monday", "Tuesday", etc.
 *   dayType:     From CAL_DAY_TYPES
 */
const CampaignCalendar = {
  currentDay: 1,
  totalDays: 56,        // 8 weeks × 7 days

  /**
   * getWeek() — Returns the current week number (1-8).
   * Updates only when currentDay crosses a 7-day boundary.
   */
  getWeek() {
    return Math.ceil(this.currentDay / 7);
  },

  /**
   * getDayOfWeek() — Returns 0-6 (Mon=0, Sun=6).
   */
  getDayOfWeek() {
    return (this.currentDay - 1) % 7;
  },

  /**
   * getDayName() — Returns the full English day name.
   */
  getDayName() {
    return CAL_DAY_NAMES_FULL[this.getDayOfWeek()];
  },

  /**
   * getDayNameShort() — Returns the 3-letter day name.
   */
  getDayNameShort() {
    return CAL_DAY_NAMES[this.getDayOfWeek()];
  },

  /**
   * getDayNameThai() — Returns the Thai day name.
   */
  getDayNameThai() {
    return CAL_DAY_NAMES_THAI[this.getDayOfWeek()];
  },

  /**
   * getDayType() — Returns the day type object from CAL_DAY_TYPES.
   */
  getDayType() {
    return CAL_DAY_TYPES[this.getDayOfWeek()];
  },

  /**
   * isParliamentDay() — Quick check if today requires Parliament.
   */
  isParliamentDay() {
    return this.getDayType().isParliament;
  },

  /**
   * isLastDay() — Check if campaign is over (day 56).
   */
  isLastDay() {
    return this.currentDay >= this.totalDays;
  },

  /**
   * getDisplayString() — Formatted string for UI.
   * e.g., "Day 15 — Week 3 — Wednesday (พุธ)"
   */
  getDisplayString() {
    return `Day ${this.currentDay} — Week ${this.getWeek()} — ${this.getDayName()} (${this.getDayNameThai()})`;
  },

  /**
   * getWeekProgress() — Returns days completed in the current week (0-7).
   */
  getWeekProgress() {
    return ((this.currentDay - 1) % 7) + 1;
  },

  /**
   * reset() — Resets the calendar to Day 1.
   */
  reset() {
    this.currentDay = 1;
  }
};


// ──────────────────────────────────────────────────────────────────────────
// SECTION 2: NEXT TURN LOGIC
// The core daily advancement function.
// ──────────────────────────────────────────────────────────────────────────

/**
 * _campaignTimeCallbacks — Callback registry for campaign time events.
 */
const _campaignTimeCallbacks = {
  onDayAdvance: [],           // Fires every day advance
  onWeekChange: [],           // Fires when week number changes
  onParliamentDay: [],        // Fires when a parliament day is reached
  onCampaignEnd: [],          // Fires when day 56 is reached
  onStateUpdate: []           // Fires after any state change
};

/**
 * registerCampaignTimeCallback() — Register a handler for campaign time events.
 */
function registerCampaignTimeCallback(eventName, handler) {
  if (_campaignTimeCallbacks[eventName]) {
    _campaignTimeCallbacks[eventName].push(handler);
  }
}

/**
 * _fireCampaignTimeCallback() — Fire all handlers for an event.
 */
function _fireCampaignTimeCallback(eventName, ...args) {
  if (!_campaignTimeCallbacks[eventName]) return;
  _campaignTimeCallbacks[eventName].forEach(handler => {
    try { handler(...args); } catch (e) { console.error(`[campaign/timeline.js] Error in ${eventName}:`, e); }
  });
}

/**
 * advanceCampaignDay() — THE CORE FUNCTION.
 * Replaces advanceWeek(). Each click = +1 day.
 *
 * LOGIC:
 *   1. Increment currentDay by 1
 *   2. Sync campaignState.currentWeek if week boundary crossed
 *   3. If Parliament Day (Wed/Thu/Fri) → fire onParliamentDay callback
 *      which shows the "Enter Parliament / Ignore" choice
 *   4. If campaign day → player can use action points
 *   5. If rest day → AI campaigns run, poll drift applies
 *   6. If day 56 → campaign ends, trigger election
 *
 * @returns {Object} Result descriptor
 */
function advanceCampaignDay() {
  // ── Guard: campaign over? ──
  if (CampaignCalendar.isLastDay()) {
    _fireCampaignTimeCallback('onCampaignEnd');
    return { type: "campaign_end", message: "The 8-week campaign is over. Time for the election!" };
  }

  // ── Store previous week for boundary detection ──
  const prevWeek = CampaignCalendar.getWeek();

  // ── Advance the day ──
  CampaignCalendar.currentDay++;

  const newWeek = CampaignCalendar.getWeek();
  const dayType = CampaignCalendar.getDayType();
  const dayOfWeek = CampaignCalendar.getDayOfWeek();

  console.log(`[campaign/timeline.js] Day ${CampaignCalendar.currentDay}: ${CampaignCalendar.getDayName()} (${CampaignCalendar.getDayNameThai()}) — ${dayType.label}`);

  // ── Build result ──
  const result = {
    type: "day_advance",
    day: CampaignCalendar.currentDay,
    week: newWeek,
    dayOfWeek: dayOfWeek,
    dayName: CampaignCalendar.getDayName(),
    dayNameThai: CampaignCalendar.getDayNameThai(),
    dayType: dayType,
    isParliament: dayType.isParliament,
    isWeekChange: newWeek !== prevWeek,
    displayString: CampaignCalendar.getDisplayString()
  };

  // ── Week boundary crossed → sync campaignState + trigger AI/drift ──
  if (newWeek !== prevWeek) {
    // Sync the campaignState.currentWeek
    if (campaignState) {
      campaignState.currentWeek = newWeek;
      // Reset action points for the new week
      campaignState.actionPointsRemaining = campaignState.actionPointsPerWeek;
      campaignState.weeklyActions = [];
    }

    // Run AI campaigns and poll drift on week change
    runAICampaigns();
    applyPollDrift();

    if (campaignState) {
      campaignState.campaignLog.push({
        week: newWeek,
        type: "week_start",
        message: `Week ${newWeek} of the ${campaignState.electionYear} campaign begins.`
      });
    }

    _fireCampaignTimeCallback('onWeekChange', newWeek);
    console.log(`[campaign/timeline.js] ═══ WEEK ${newWeek} BEGINS ═══`);
  }

  // ── Parliament Day detection ──
  if (dayType.isParliament) {
    result.parliamentType = dayType.type; // "parliament" or "urgent"
    _fireCampaignTimeCallback('onParliamentDay', result);
    console.log(`[campaign/timeline.js] ⚠ PARLIAMENT DAY DETECTED — Player must choose.`);
  }

  // ── Rest day: minor auto-events ──
  if (dayType.type === "rest") {
    // Small random events on rest days
    if (campaignState && Math.random() < 0.3) {
      const driftAmount = Math.floor(Math.random() * 3) - 1;
      if (driftAmount !== 0) {
        campaignState.playerScrutiny = Math.max(0, Math.min(100,
          campaignState.playerScrutiny + driftAmount));
      }
    }
  }

  // ── Campaign end check ──
  if (CampaignCalendar.isLastDay()) {
    result.type = "campaign_end";
    result.message = "The 8-week campaign concludes! Time to hold the election.";
    _fireCampaignTimeCallback('onCampaignEnd');
  }

  // ── Fire general callbacks ──
  _fireCampaignTimeCallback('onDayAdvance', result);
  _fireCampaignTimeCallback('onStateUpdate', result);

  return result;
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 3: PARLIAMENT CHOICE HANDLING
// When a Parliament Day is reached, the player must decide.
// ──────────────────────────────────────────────────────────────────────────

/**
 * PARLIAMENT_IGNORE_PENALTY — Political Capital lost for ignoring Parliament.
 * In Thai politics, absence from Parliament sessions is heavily criticized.
 */
const PARLIAMENT_IGNORE_PENALTY = 8;

/**
 * handleParliamentChoice() — Called when the player responds to
 * the Parliament Day notification.
 *
 * @param {string} choice - "enter" or "ignore"
 * @returns {Object} Result of the choice
 */
function handleParliamentChoice(choice) {
  if (choice === "enter") {
    // Save campaign state to sessionStorage for the parliament module
    _saveCampaignStateForParliament();

    console.log("[campaign/timeline.js] Player enters Parliament. Redirecting...");

    return {
      action: "redirect",
      target: "../parliament-test/index.html",
      message: "Entering the House of Representatives..."
    };

  } else if (choice === "ignore") {
    // Apply penalty
    const penalty = PARLIAMENT_IGNORE_PENALTY;

    if (campaignState) {
      // Deduct from scrutiny and log it
      campaignState.playerScrutiny = Math.min(100, campaignState.playerScrutiny + 3);

      campaignState.campaignLog.push({
        week: CampaignCalendar.getWeek(),
        type: "parliament_skip",
        message: `Skipped Parliament session on ${CampaignCalendar.getDayName()}. Media scrutiny +3. Political capital penalty applied.`
      });
    }

    console.log(`[campaign/timeline.js] Player ignores Parliament. Penalty: -${penalty} Political Capital, +3 Scrutiny`);

    return {
      action: "penalty",
      capitalPenalty: penalty,
      scrutinyPenalty: 3,
      message: `You skipped the Parliament session. The media criticizes your absence. (-${penalty} Political Capital, +3 Scrutiny)`
    };
  }

  return { action: "unknown" };
}

/**
 * _saveCampaignStateForParliament() — Packages essential campaign data
 * into sessionStorage so the parliament module can read it.
 */
function _saveCampaignStateForParliament() {
  if (!campaignState) return;

  const handoff = {
    playerPartyId: campaignState.playerPartyId,
    currentWeek: CampaignCalendar.getWeek(),
    currentDay: CampaignCalendar.currentDay,
    playerFunds: campaignState.playerFunds,
    playerScrutiny: campaignState.playerScrutiny,
    nationalPollShare: { ...campaignState.nationalPollShare },
    electionYear: campaignState.electionYear,
    timestamp: Date.now()
  };

  try {
    sessionStorage.setItem("tps_campaign_to_parliament", JSON.stringify(handoff));
    console.log("[campaign/timeline.js] Campaign state saved for Parliament handoff.");

    // Step 2: Also save the FULL campaign state so it can be restored on return
    const fullState = JSON.parse(JSON.stringify(campaignState));
    fullState._calendarDay = CampaignCalendar.currentDay;
    sessionStorage.setItem("tps_campaign_state", JSON.stringify(fullState));
    console.log("[campaign/timeline.js] Full campaign state persisted for return.");
  } catch (e) {
    console.warn("[campaign/timeline.js] Could not save handoff:", e);
  }
}

/**
 * loadParliamentReturnData() — Called when returning FROM parliament
 * back to campaign. Reads any changes made during the parliament session.
 *
 * @returns {Object|null} Parliament session results, or null
 */
function loadParliamentReturnData() {
  try {
    const data = sessionStorage.getItem("tps_parliament_to_campaign");
    if (data) {
      const parsed = JSON.parse(data);
      sessionStorage.removeItem("tps_parliament_to_campaign");
      console.log("[campaign/timeline.js] Parliament return data loaded:", parsed);
      return parsed;
    }
  } catch (e) {
    console.warn("[campaign/timeline.js] Could not load return data:", e);
  }
  return null;
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 4: CALENDAR UI DATA GENERATION
// Generates data structures for rendering the unified calendar widget.
// ──────────────────────────────────────────────────────────────────────────

/**
 * getCalendarBarData() — Returns an array of 56 day objects for
 * rendering the full campaign calendar bar in the UI.
 *
 * @returns {Object[]} Array of 56 day descriptors
 */
function getCalendarBarData() {
  const days = [];

  for (let d = 1; d <= CampaignCalendar.totalDays; d++) {
    const dow = (d - 1) % 7;
    const week = Math.ceil(d / 7);
    const dayType = CAL_DAY_TYPES[dow];

    days.push({
      day: d,
      week: week,
      dayOfWeek: dow,
      dayName: CAL_DAY_NAMES[dow],
      dayNameFull: CAL_DAY_NAMES_FULL[dow],
      dayNameThai: CAL_DAY_NAMES_THAI[dow],
      type: dayType.type,
      label: dayType.label,
      color: dayType.color,
      icon: dayType.icon,
      isParliament: dayType.isParliament,
      isCurrent: d === CampaignCalendar.currentDay,
      isPast: d < CampaignCalendar.currentDay,
      isFuture: d > CampaignCalendar.currentDay
    });
  }

  return days;
}

/**
 * getCurrentWeekCalendarData() — Returns just the current week's
 * 7-day data for a compact calendar widget.
 *
 * @returns {Object[]} Array of 7 day descriptors for the current week
 */
function getCurrentWeekCalendarData() {
  const week = CampaignCalendar.getWeek();
  const startDay = (week - 1) * 7 + 1;
  const allDays = getCalendarBarData();
  return allDays.slice(startDay - 1, startDay + 6);
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 5: INITIALIZATION & SYNC
// ──────────────────────────────────────────────────────────────────────────

/**
 * initCampaignTimeline() — Initialize the timeline system.
 * Syncs the calendar with the current campaignState.
 */
function initCampaignTimeline() {
  CampaignCalendar.reset();

  // Check for parliament return data
  const returnData = loadParliamentReturnData();
  if (returnData) {
    console.log("[campaign/timeline.js] Returned from Parliament session.");
    // Apply any changes from parliament
    if (returnData.capitalChange && campaignState) {
      // Store parliament capital for later use
      campaignState._parliamentCapitalEarned = (campaignState._parliamentCapitalEarned || 0) + returnData.capitalChange;
    }
    if (returnData.currentDay) {
      CampaignCalendar.currentDay = returnData.currentDay;
    }
  }

  console.log("[campaign/timeline.js] Campaign Timeline initialized.");
  console.log(`  → Day ${CampaignCalendar.currentDay} / ${CampaignCalendar.totalDays}`);
  console.log(`  → Week ${CampaignCalendar.getWeek()} / 8`);
  console.log(`  → ${CampaignCalendar.getDayName()} (${CampaignCalendar.getDayNameThai()})`);
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 6: MODULE LOG
// ──────────────────────────────────────────────────────────────────────────

console.log("═══════════════════════════════════════════════════════════");
console.log("[campaign/timeline.js] Unified Time Engine loaded.");
console.log("  → Daily advancement replaces weekly system");
console.log("  → Parliament Day detection on Wed/Thu/Fri");
console.log("  → Calendar data generation ready");
console.log("═══════════════════════════════════════════════════════════");
