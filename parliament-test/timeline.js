// ═══════════════════════════════════════════════════════════════════════════
// THAILAND POLITICAL SIMULATION — /parliament-test/timeline.js
// v.1.0.1 Test: "The Parliament RPG" — Timeline & Time Advancement Engine
// ═══════════════════════════════════════════════════════════════════════════
//
// PURPOSE:
//   Controls the flow of time in the Parliament RPG module.
//   The advanceTime() function is the HEARTBEAT of the game loop.
//   Every click of the "Next Turn" button ticks time forward by one phase.
//
// TIME STRUCTURE:
//   Each DAY has 3 phases: Morning → Afternoon → Evening
//   After Evening, the day advances to the next day's Morning.
//   After Sunday Evening, the week increments and we loop to Monday Morning.
//
// CRITICAL MECHANIC:
//   When time advances INTO a Parliament Day (Wed/Thu) or Urgent Day (Fri),
//   the engine HALTS macro-gameplay and transitions the UI into the
//   "Live Parliament Dashboard" — the core debate experience.
//   This transition is signaled via a callback system so that main.js
//   can orchestrate the UI swap.
//
// DEPENDENCIES:
//   - data.js must be loaded first (provides parliamentState, WEEKLY_SCHEDULE, etc.)
//
// ═══════════════════════════════════════════════════════════════════════════


// ──────────────────────────────────────────────────────────────────────────
// SECTION 1: CALLBACK REGISTRY
// The timeline engine fires callbacks when significant transitions occur.
// main.js registers handlers here to respond to phase changes.
// ──────────────────────────────────────────────────────────────────────────

/**
 * _timelineCallbacks — Registry of event handlers.
 *
 * onPhaseChange:           Fires every time we move to a new phase.
 *                          Args: (newDayIndex, newTimeIndex, scheduleType)
 *
 * onDayChange:             Fires when we cross into a new day.
 *                          Args: (newDayIndex, daySchedule)
 *
 * onWeekChange:            Fires when we loop from Sunday → Monday.
 *                          Args: (newWeekNumber)
 *
 * onParliamentEntry:       Fires when we enter a Parliament/Urgent day.
 *                          This is the TRIGGER for the Live Debate Engine.
 *                          Args: (daySchedule, isUrgent)
 *
 * onParliamentExit:        Fires when a Parliament day ends (Evening phase ends).
 *                          Args: (daySchedule)
 *
 * onConstituencyEvent:     Fires when a passive constituency event triggers.
 *                          Args: (eventObject)
 *
 * onCommitteeEvent:        Fires when a passive committee event triggers.
 *                          Args: (eventObject)
 *
 * onRestDay:               Fires on Saturday/Sunday transitions.
 *                          Args: (daySchedule)
 *
 * onLocalPopDecay:         Fires when local popularity decays from neglect.
 *                          Args: (decayAmount, newPopularity)
 *
 * onGameStateUpdate:       Fires after ANY state change for UI refresh.
 *                          Args: (parliamentState)
 */
const _timelineCallbacks = {
  onPhaseChange: [],
  onDayChange: [],
  onWeekChange: [],
  onParliamentEntry: [],
  onParliamentExit: [],
  onConstituencyEvent: [],
  onCommitteeEvent: [],
  onRestDay: [],
  onLocalPopDecay: [],
  onGameStateUpdate: []
};

/**
 * registerTimelineCallback() — Register a handler for a timeline event.
 *
 * @param {string} eventName - One of the keys in _timelineCallbacks
 * @param {Function} handler - The callback function
 *
 * @example
 *   registerTimelineCallback('onParliamentEntry', (schedule, isUrgent) => {
 *     showLiveDebateDashboard(schedule, isUrgent);
 *   });
 */
function registerTimelineCallback(eventName, handler) {
  if (!_timelineCallbacks[eventName]) {
    console.warn(`[timeline.js] Unknown callback event: "${eventName}"`);
    return;
  }
  _timelineCallbacks[eventName].push(handler);
  console.log(`[timeline.js] Registered callback for "${eventName}"`);
}

/**
 * _fireCallback() — Internal: fires all registered handlers for an event.
 * @param {string} eventName - The event key
 * @param  {...any} args - Arguments to pass to each handler
 */
function _fireCallback(eventName, ...args) {
  if (!_timelineCallbacks[eventName]) return;
  _timelineCallbacks[eventName].forEach(handler => {
    try {
      handler(...args);
    } catch (err) {
      console.error(`[timeline.js] Error in "${eventName}" callback:`, err);
    }
  });
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 2: TIME ADVANCEMENT CORE
// The main advanceTime() function and its supporting logic.
// ──────────────────────────────────────────────────────────────────────────

/**
 * _wasParliamentDay — Tracks whether the PREVIOUS phase was on a parliament day.
 * Used to detect transitions OUT of parliament sessions.
 * @private
 */
let _wasParliamentDay = false;

/**
 * _parliamentEnteredToday — Prevents firing onParliamentEntry multiple times
 * within the same day (e.g., Morning→Afternoon on Wednesday).
 * Resets when the day changes.
 * @private
 */
let _parliamentEnteredToday = false;

/**
 * _consecutiveParliamentDaysWithoutConstituency — Tracks how many parliament
 * days have passed without the player doing constituency work.
 * Used for LocalPopularity decay mechanic.
 * @private
 */
let _daysWithoutConstituencyWork = 0;

/**
 * advanceTime() — THE CORE FUNCTION. Advances the game by one time phase.
 *
 * TIME FLOW:
 *   Morning → Afternoon → Evening → (next day) Morning → ...
 *
 * TRANSITIONS:
 *   1. If moving into a Parliament Day → HALT macro-gameplay, fire onParliamentEntry
 *   2. If moving out of a Parliament Day → fire onParliamentExit
 *   3. If it's a Constituency/Committee phase → maybe trigger a passive event
 *   4. If it's a Rest Day → check for random crises
 *   5. Every phase → fire onPhaseChange and onGameStateUpdate
 *
 * RETURNS:
 *   An object describing what happened during this advancement:
 *   {
 *     type: "phase_change" | "day_change" | "week_change" | "parliament_entry",
 *     dayIndex, timeIndex, dayName, timeName,
 *     scheduleType,
 *     event: <passive event object or null>,
 *     isParliamentTransition: boolean,
 *     isUrgent: boolean
 *   }
 *
 * @returns {Object} Advancement result descriptor
 */
function advanceTime() {
  // ── Guard: ensure state is initialized ──
  if (!parliamentState) {
    console.error("[timeline.js] Cannot advance time: parliamentState not initialized!");
    return null;
  }

  // ── Guard: game over check ──
  if (parliamentState.gameOver) {
    console.warn("[timeline.js] Game is over. No further advancement.");
    return { type: "game_over", reason: parliamentState.gameOverReason };
  }

  // ── Guard: if a debate is actively in progress, block advancement ──
  // The debate engine must resolve before time can move forward.
  if (parliamentState.isDebateInProgress) {
    console.warn("[timeline.js] Debate is in progress. Resolve the debate before advancing.");
    return { type: "blocked", reason: "debate_in_progress" };
  }

  // ── Snapshot the previous state for transition detection ──
  const prevDayIndex = parliamentState.currentDayIndex;
  const prevTimeIndex = parliamentState.currentTimeIndex;
  const prevSchedule = WEEKLY_SCHEDULE[prevDayIndex];
  _wasParliamentDay = prevSchedule.primaryType.isParliamentDay;

  // ── Advance the time phase ──
  const result = _tickTime();

  // ── Get the NEW schedule info ──
  const newDayIndex = parliamentState.currentDayIndex;
  const newTimeIndex = parliamentState.currentTimeIndex;
  const newSchedule = WEEKLY_SCHEDULE[newDayIndex];
  const newPhaseType = getCurrentPhaseType();

  // ── Build the result descriptor ──
  result.dayIndex = newDayIndex;
  result.timeIndex = newTimeIndex;
  result.dayName = DAY_NAMES[newDayIndex];
  result.dayNameThai = DAY_NAMES_THAI[newDayIndex];
  result.timeName = TIME_PHASES[newTimeIndex];
  result.timeNameThai = TIME_PHASES_THAI[newTimeIndex];
  result.scheduleType = newPhaseType;
  result.displayString = getDayDisplayString();
  result.isParliamentTransition = false;
  result.isUrgent = false;
  result.event = null;

  // ── TRANSITION DETECTION ──

  // 1. Detect Parliament Entry
  //    When the day changes TO a parliament day, or when we first enter
  //    a parliament phase on the current day.
  if (newSchedule.primaryType.isParliamentDay && !_parliamentEnteredToday) {
    _parliamentEnteredToday = true;
    result.isParliamentTransition = true;
    result.isUrgent = (newSchedule.primaryType.id === "urgent");

    // Switch game phase to parliament mode
    parliamentState.currentPhase = "parliament";

    console.log(`[timeline.js] ═══ PARLIAMENT DAY DETECTED ═══`);
    console.log(`  → ${result.dayName} (${result.dayNameThai})`);
    console.log(`  → Type: ${newSchedule.primaryType.label}`);
    console.log(`  → Urgent: ${result.isUrgent}`);
    console.log(`  → Halting macro-gameplay. Transitioning to Live Debate Engine.`);

    // Fire the Parliament Entry callback
    _fireCallback("onParliamentEntry", newSchedule, result.isUrgent);
  }

  // 2. Detect Parliament Exit
  //    When we leave a parliament day (transition to a non-parliament day)
  if (_wasParliamentDay && !newSchedule.primaryType.isParliamentDay) {
    parliamentState.currentPhase = "macro";

    console.log(`[timeline.js] ═══ PARLIAMENT SESSION ENDED ═══`);
    console.log(`  → Returning to macro-gameplay.`);

    _fireCallback("onParliamentExit", prevSchedule);
  }

  // 3. Trigger Passive Events (Constituency / Committee days)
  if (!newSchedule.primaryType.isParliamentDay && newTimeIndex === 0) {
    // Only trigger at the START of the day (Morning phase)
    result.event = _triggerPassiveEvent(newPhaseType);
  }

  // 4. Rest Day handling
  if (newSchedule.primaryType.id === "rest" && newTimeIndex === 0) {
    _fireCallback("onRestDay", newSchedule);
  }

  // 5. Local Popularity Decay Check
  _checkLocalPopularityDecay(newSchedule);

  // ── Always fire phase change and state update ──
  _fireCallback("onPhaseChange", newDayIndex, newTimeIndex, newPhaseType);
  _fireCallback("onGameStateUpdate", parliamentState);

  return result;
}


/**
 * _tickTime() — Internal: Increments the raw time counters.
 * Handles phase → day → week rollovers.
 *
 * @returns {Object} Partial result with type info
 * @private
 */
function _tickTime() {
  const s = parliamentState;
  let result = { type: "phase_change" };

  // Advance to next time phase
  s.currentTimeIndex++;

  // ── Phase overflow → new Day ──
  if (s.currentTimeIndex >= TIME_PHASES.length) {
    s.currentTimeIndex = 0;       // Reset to Morning
    s.currentDayIndex++;           // Advance to next day
    s.totalDaysElapsed++;
    _parliamentEnteredToday = false;  // Reset parliament flag for new day
    result.type = "day_change";

    // Fire day change callback
    _fireCallback("onDayChange", s.currentDayIndex, WEEKLY_SCHEDULE[s.currentDayIndex >= 7 ? 0 : s.currentDayIndex]);

    // ── Day overflow → new Week ──
    if (s.currentDayIndex >= 7) {
      s.currentDayIndex = 0;      // Reset to Monday
      s.currentWeek++;
      result.type = "week_change";

      // Reset weekly stats
      _resetWeeklyStats();

      // Fire week change callback
      _fireCallback("onWeekChange", s.currentWeek);

      console.log(`[timeline.js] ═══ NEW WEEK: Week ${s.currentWeek} ═══`);
    }
  }

  return result;
}


/**
 * _resetWeeklyStats() — Resets the per-week tracking counters.
 * Called automatically on week rollover.
 * @private
 */
function _resetWeeklyStats() {
  if (!parliamentState) return;
  parliamentState.weeklyStats = {
    debatesParticipated: 0,
    protestsRaised: 0,
    protestsSucceeded: 0,
    votesAttended: 0,
    interpellationsFiled: 0,
    constituencyVisits: 0,
    committeesAttended: 0
  };
  console.log("[timeline.js] Weekly stats reset.");
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 3: PASSIVE EVENT TRIGGER SYSTEM
// Fires random mini-events on Constituency and Committee days.
// ──────────────────────────────────────────────────────────────────────────

/**
 * _triggerPassiveEvent() — Maybe generates a passive event based on the
 * current schedule type.
 *
 * Event probability:
 *   - Constituency: 70% chance of an event
 *   - Committee: 60% chance of an event
 *   - Other: no passive events
 *
 * @param {Object} phaseType - The SCHEDULE_TYPES entry for the current phase
 * @returns {Object|null} The triggered event, or null
 * @private
 */
function _triggerPassiveEvent(phaseType) {
  if (!phaseType) return null;

  let event = null;

  switch (phaseType.id) {
    case "constituency": {
      // 70% chance of a constituency event
      if (Math.random() < 0.70) {
        event = getRandomConstituencyEvent();
        parliamentState.weeklyStats.constituencyVisits++;
        parliamentState.totalStats.constituencyVisits++;
        _daysWithoutConstituencyWork = 0;  // Reset decay counter

        console.log(`[timeline.js] Constituency event triggered: "${event.title}"`);
        _fireCallback("onConstituencyEvent", event);
      }
      break;
    }

    case "committee": {
      // 60% chance of a committee event
      if (Math.random() < 0.60) {
        event = getRandomCommitteeEvent();
        parliamentState.weeklyStats.committeesAttended++;
        parliamentState.totalStats.committeesAttended++;

        console.log(`[timeline.js] Committee event triggered: "${event.title}"`);
        _fireCallback("onCommitteeEvent", event);
      }
      break;
    }

    default:
      // No passive events for other schedule types
      break;
  }

  return event;
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 4: LOCAL POPULARITY DECAY
// If the player spends too many consecutive days without constituency work,
// their LocalPopularity decays. "The people forget quickly."
// ──────────────────────────────────────────────────────────────────────────

/**
 * LOCAL_POP_DECAY_THRESHOLD — Number of days without constituency work
 * before decay kicks in. (Player gets a grace period of 3 days.)
 */
const LOCAL_POP_DECAY_THRESHOLD = 3;

/**
 * LOCAL_POP_DECAY_RATE — Points of LocalPopularity lost per day of neglect
 * once the threshold is exceeded.
 */
const LOCAL_POP_DECAY_RATE = 2;

/**
 * _checkLocalPopularityDecay() — Called every phase advancement.
 * Tracks consecutive non-constituency days and applies decay.
 *
 * @param {Object} daySchedule - WEEKLY_SCHEDULE entry for current day
 * @private
 */
function _checkLocalPopularityDecay(daySchedule) {
  if (!parliamentState) return;

  // Only check once per day (on Morning phase)
  if (parliamentState.currentTimeIndex !== 0) return;

  // If today is NOT a constituency day, increment the counter
  if (daySchedule.primaryType.id !== "constituency") {
    _daysWithoutConstituencyWork++;
  }
  // Note: counter is reset to 0 in _triggerPassiveEvent when constituency event fires

  // Apply decay if threshold exceeded
  if (_daysWithoutConstituencyWork > LOCAL_POP_DECAY_THRESHOLD) {
    const overshoot = _daysWithoutConstituencyWork - LOCAL_POP_DECAY_THRESHOLD;
    const decay = LOCAL_POP_DECAY_RATE * overshoot;

    const before = parliamentState.playerLocalPopularity;
    parliamentState.playerLocalPopularity = clampStat(
      parliamentState.playerLocalPopularity - decay
    );

    if (decay > 0 && before !== parliamentState.playerLocalPopularity) {
      console.log(`[timeline.js] ⚠ Local Popularity decay: -${decay} (${before} → ${parliamentState.playerLocalPopularity})`);
      console.log(`  → ${_daysWithoutConstituencyWork} days without constituency work.`);

      logEvent(
        "decay",
        "Constituency Neglect",
        `Your constituents haven't seen you in ${_daysWithoutConstituencyWork} days. Local popularity drops.`,
        { localPopularity: -decay }
      );

      _fireCallback("onLocalPopDecay", decay, parliamentState.playerLocalPopularity);
    }
  }
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 5: BATCH TIME ADVANCEMENT
// Convenience functions for skipping multiple phases at once.
// ──────────────────────────────────────────────────────────────────────────

/**
 * advanceToNextDay() — Advances time until the next day's Morning phase.
 * Stops IMMEDIATELY if it hits a Parliament Day (player must deal with it).
 *
 * @returns {Object[]} Array of all advancement results
 */
function advanceToNextDay() {
  const results = [];
  let safety = 0;
  const maxIterations = 4; // Max 3 phases in a day + 1

  while (safety < maxIterations) {
    safety++;
    const result = advanceTime();
    if (!result) break;

    results.push(result);

    // Stop if we hit a parliament transition
    if (result.isParliamentTransition) {
      console.log("[timeline.js] Halted: Parliament Day detected during fast-forward.");
      break;
    }

    // Stop if we've reached the next day's morning
    if (result.type === "day_change" || result.type === "week_change") {
      break;
    }

    // Stop if game is over or blocked
    if (result.type === "game_over" || result.type === "blocked") {
      break;
    }
  }

  return results;
}

/**
 * advanceToEndOfDay() — Advances time through all remaining phases of today.
 * Useful after resolving a parliament session or event.
 *
 * @returns {Object[]} Array of all advancement results
 */
function advanceToEndOfDay() {
  const results = [];
  let safety = 0;
  const maxIterations = 3;
  const startDay = parliamentState.currentDayIndex;

  while (safety < maxIterations && parliamentState.currentDayIndex === startDay) {
    safety++;
    const result = advanceTime();
    if (!result) break;
    results.push(result);

    if (result.type === "day_change" || result.type === "week_change") break;
    if (result.type === "game_over" || result.type === "blocked") break;
  }

  return results;
}

/**
 * skipToParliamentDay() — Fast-forwards time until the next Parliament Day.
 * Skips all constituency/committee events (they auto-resolve with small bonuses).
 * Used when the player wants to jump straight to the action.
 *
 * @returns {Object} The parliament entry result, or null if week ended
 */
function skipToParliamentDay() {
  console.log("[timeline.js] Fast-forwarding to next Parliament Day...");
  let safety = 0;
  const maxIterations = 25; // max ~3 days × 3 phases + buffer

  while (safety < maxIterations) {
    safety++;
    const result = advanceTime();
    if (!result) return null;

    // Auto-resolve passive events with small bonuses during skip
    if (result.event) {
      // Give a small default bonus for "attending" without choosing
      applyEffects({ localPopularity: +1, politicalCapital: +1 });
      logEvent("auto", "Auto-attended: " + result.event.title,
        "You briefly attended but didn't engage deeply.", { localPopularity: +1, politicalCapital: +1 });
    }

    // Stop when we hit parliament
    if (result.isParliamentTransition) {
      return result;
    }

    // Stop if game ended
    if (result.type === "game_over") return result;
  }

  console.warn("[timeline.js] Fast-forward safety limit reached.");
  return null;
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 6: STATE QUERY FUNCTIONS
// Read-only functions for the UI to query the current state.
// ──────────────────────────────────────────────────────────────────────────

/**
 * getTimelineStatus() — Returns a comprehensive status snapshot
 * for the UI to render.
 *
 * @returns {Object} Full timeline status
 */
function getTimelineStatus() {
  if (!parliamentState) return null;

  const s = parliamentState;
  const schedule = WEEKLY_SCHEDULE[s.currentDayIndex];
  const phaseType = getCurrentPhaseType();

  return {
    // Time
    week: s.currentWeek,
    dayIndex: s.currentDayIndex,
    dayName: DAY_NAMES[s.currentDayIndex],
    dayNameThai: DAY_NAMES_THAI[s.currentDayIndex],
    timeIndex: s.currentTimeIndex,
    timeName: TIME_PHASES[s.currentTimeIndex],
    timeNameThai: TIME_PHASES_THAI[s.currentTimeIndex],
    totalDaysElapsed: s.totalDaysElapsed,
    displayString: getDayDisplayString(),

    // Schedule
    scheduleType: phaseType,
    primaryDayType: schedule.primaryType,
    isParliamentDay: schedule.primaryType.isParliamentDay,
    isUrgentDay: schedule.primaryType.id === "urgent",

    // Player Stats
    politicalCapital: s.playerPoliticalCapital,
    localPopularity: s.playerLocalPopularity,
    funds: s.playerFunds,

    // Phase
    currentPhase: s.currentPhase,
    isDebateInProgress: s.isDebateInProgress,

    // Weekly preview (upcoming days this week)
    weekPreview: _buildWeekPreview()
  };
}

/**
 * _buildWeekPreview() — Generates a 7-day week preview with
 * indicators for the current day.
 *
 * @returns {Object[]} Array of 7 day preview objects
 * @private
 */
function _buildWeekPreview() {
  if (!parliamentState) return [];

  return WEEKLY_SCHEDULE.map((daySchedule, index) => ({
    dayIndex: index,
    dayName: DAY_NAMES[index],
    dayNameThai: DAY_NAMES_THAI[index],
    type: daySchedule.primaryType,
    isCurrent: index === parliamentState.currentDayIndex,
    isPast: index < parliamentState.currentDayIndex,
    isFuture: index > parliamentState.currentDayIndex,
    icon: daySchedule.primaryType.icon,
    color: daySchedule.primaryType.color
  }));
}

/**
 * getCalendarWeekData() — Returns structured data for rendering
 * a visual calendar widget in the UI.
 *
 * @returns {Object} Calendar data with current position highlighted
 */
function getCalendarWeekData() {
  if (!parliamentState) return null;

  const s = parliamentState;
  return {
    weekNumber: s.currentWeek,
    currentDayIndex: s.currentDayIndex,
    currentTimeIndex: s.currentTimeIndex,
    days: WEEKLY_SCHEDULE.map((daySchedule, idx) => ({
      index: idx,
      name: DAY_NAMES[idx],
      nameThai: DAY_NAMES_THAI[idx],
      shortName: DAY_NAMES[idx].substring(0, 3),
      type: daySchedule.primaryType.id,
      typeLabel: daySchedule.primaryType.label,
      typeLabelThai: daySchedule.primaryType.labelThai,
      color: daySchedule.primaryType.color,
      icon: daySchedule.primaryType.icon,
      isCurrent: idx === s.currentDayIndex,
      isParliament: daySchedule.primaryType.isParliamentDay,
      description: daySchedule.description
    }))
  };
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 7: PARLIAMENT SESSION LIFECYCLE
// Functions to formally enter/exit the parliament session phase.
// Called by main.js when the UI transition is ready.
// ──────────────────────────────────────────────────────────────────────────

/**
 * enterParliamentSession() — Called by main.js when the UI has transitioned
 * to the Live Debate Dashboard. Formally marks the session as active.
 *
 * @returns {Object} Session info for the debate engine
 */
function enterParliamentSession() {
  if (!parliamentState) return null;

  parliamentState.currentPhase = "parliament";
  const schedule = getCurrentDaySchedule();

  console.log("[timeline.js] ═══ PARLIAMENT SESSION FORMALLY OPENED ═══");
  console.log(`  → ${getDayDisplayString()}`);
  console.log(`  → Type: ${schedule.primaryType.label} (${schedule.primaryType.labelThai})`);

  return {
    dayName: DAY_NAMES[parliamentState.currentDayIndex],
    dayNameThai: DAY_NAMES_THAI[parliamentState.currentDayIndex],
    sessionType: schedule.primaryType.id,
    sessionLabel: schedule.primaryType.label,
    sessionLabelThai: schedule.primaryType.labelThai,
    isUrgent: schedule.primaryType.id === "urgent",
    playerCapital: parliamentState.playerPoliticalCapital,
    playerAlignment: parliamentState.playerAlignment,
    week: parliamentState.currentWeek
  };
}

/**
 * exitParliamentSession() — Called when the debate engine completes
 * all scheduled debates/votes for the day. Transitions back to macro.
 *
 * @param {Object} sessionResults - Summary from the debate engine
 *   { capitalChange, popularityChange, debatesCompleted, protestsWon, protestsLost }
 */
function exitParliamentSession(sessionResults = {}) {
  if (!parliamentState) return;

  parliamentState.currentPhase = "macro";
  parliamentState.isDebateInProgress = false;

  // Apply cumulative session results
  if (sessionResults.capitalChange) {
    parliamentState.playerPoliticalCapital = clampStat(
      parliamentState.playerPoliticalCapital + sessionResults.capitalChange
    );
  }
  if (sessionResults.popularityChange) {
    parliamentState.playerLocalPopularity = clampStat(
      parliamentState.playerLocalPopularity + sessionResults.popularityChange
    );
  }

  // Update stats
  if (sessionResults.debatesCompleted) {
    parliamentState.weeklyStats.debatesParticipated += sessionResults.debatesCompleted;
    parliamentState.totalStats.debatesParticipated += sessionResults.debatesCompleted;
  }

  logEvent("parliament_exit", "Parliament Session Ended",
    `Today's session concluded. Capital change: ${sessionResults.capitalChange || 0}.`,
    sessionResults);

  console.log("[timeline.js] ═══ PARLIAMENT SESSION CLOSED ═══");
  console.log(`  → Capital change: ${sessionResults.capitalChange || 0}`);
  console.log(`  → Returning to macro-gameplay.`);

  // Fire exit callback
  _fireCallback("onParliamentExit", getCurrentDaySchedule());
  _fireCallback("onGameStateUpdate", parliamentState);

  // Advance time to end of this parliament day
  advanceToEndOfDay();
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 8: DEBUG & DEVELOPMENT UTILITIES
// Helpers for testing and development. Remove or disable in production.
// ──────────────────────────────────────────────────────────────────────────

/**
 * debugPrintSchedule() — Pretty-prints the entire weekly schedule
 * to the console. Useful for verifying the schedule is correct.
 */
function debugPrintSchedule() {
  console.log("\n[timeline.js] ═══ WEEKLY SCHEDULE ═══");
  WEEKLY_SCHEDULE.forEach((day, i) => {
    const marker = (parliamentState && i === parliamentState.currentDayIndex) ? " ◄── YOU ARE HERE" : "";
    console.log(`  ${DAY_NAMES[i]} (${DAY_NAMES_THAI[i]}):${marker}`);
    console.log(`    Primary: ${day.primaryType.icon} ${day.primaryType.label} (${day.primaryType.labelThai})`);
    console.log(`    Morning:   ${day.phases.Morning.label}`);
    console.log(`    Afternoon: ${day.phases.Afternoon.label}`);
    console.log(`    Evening:   ${day.phases.Evening.label}`);
    console.log(`    Parliament Day: ${day.primaryType.isParliamentDay ? "YES 🏛️" : "no"}`);
  });
  console.log("═══════════════════════════════════════\n");
}

/**
 * debugSetDay() — Teleport to a specific day/time. DEV ONLY.
 * @param {number} dayIndex - 0-6 (Mon-Sun)
 * @param {number} timeIndex - 0-2 (Morning/Afternoon/Evening)
 */
function debugSetDay(dayIndex, timeIndex = 0) {
  if (!parliamentState) {
    console.error("[timeline.js] State not initialized.");
    return;
  }
  parliamentState.currentDayIndex = Math.max(0, Math.min(6, dayIndex));
  parliamentState.currentTimeIndex = Math.max(0, Math.min(2, timeIndex));
  _parliamentEnteredToday = false;

  console.log(`[timeline.js] DEBUG: Teleported to ${getDayDisplayString()}`);
  _fireCallback("onGameStateUpdate", parliamentState);
}

/**
 * debugGetState() — Returns the raw parliamentState for inspection.
 * @returns {Object} The current parliament state
 */
function debugGetState() {
  return parliamentState;
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 9: MODULE INITIALIZATION LOG
// ──────────────────────────────────────────────────────────────────────────

console.log("═══════════════════════════════════════════════════════════");
console.log("[parliament-test/timeline.js] Module loaded successfully.");
console.log("  → advanceTime() ready");
console.log("  → Callback registry initialized");
console.log("  → Parliament Day detection active");
console.log("  → Local Popularity decay system active");
console.log("  → Awaiting initParliamentState() from data.js");
console.log("═══════════════════════════════════════════════════════════");
