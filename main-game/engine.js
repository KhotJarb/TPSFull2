// ============================================================
// THAILAND POLITICAL SIMULATION (TPS) — engine.js
// Game Engine: Turn Logic, Crisis Resolution, Law Voting
// Difficulty-Scaled via shared/settings.js (TPSGlobalState)
// ============================================================

/**
 * getGovDiffScale() — Returns difficulty multipliers for the Governing module.
 *
 *   crisisEffectMult:    Amplifies negative crisis choice effects
 *   monthlyDecayMult:    Amplifies monthly unrest/popularity decay
 *   defectionThreshold:  Relation below which parties may defect (default -30)
 *   militaryDrainMult:   Amplifies military patience loss from unrest
 *   budgetIncomeMult:    Scales monthly budget income
 *   coalitionJoinThreshold: Relation above which parties may join (default 50)
 */
function getGovDiffScale() {
  const d = (typeof TPSGlobalState !== 'undefined') ? TPSGlobalState.difficulty : 'normal';
  const scales = {
    easy:   { crisisEffectMult: 0.7,  monthlyDecayMult: 0.6, defectionThreshold: -45, militaryDrainMult: 0.6, budgetIncomeMult: 1.3, coalitionJoinThreshold: 40 },
    normal: { crisisEffectMult: 1.0,  monthlyDecayMult: 1.0, defectionThreshold: -30, militaryDrainMult: 1.0, budgetIncomeMult: 1.0, coalitionJoinThreshold: 50 },
    hard:   { crisisEffectMult: 1.4,  monthlyDecayMult: 1.5, defectionThreshold: -20, militaryDrainMult: 1.5, budgetIncomeMult: 0.75, coalitionJoinThreshold: 65 }
  };
  return scales[d] || scales.normal;
}

// ─── GAME STATE (mutable, cloned from INITIAL_GAME_STATE) ───
let gameState = null;
let parties = null;
let laws = null;
let usedEventIds = [];

// ─── INITIALIZE / RESET ─────────────────────────────────────

/**
 * Initializes a fresh game state by deep-cloning all data constants.
 * Call this on page load and when restarting the game.
 */
function initializeGameState() {
  gameState = JSON.parse(JSON.stringify(INITIAL_GAME_STATE));
  parties = JSON.parse(JSON.stringify(PARTIES));
  laws = JSON.parse(JSON.stringify(LAWS));
  usedEventIds = [];
  return gameState;
}

// ─── UTILITY FUNCTIONS ──────────────────────────────────────

/**
 * Clamps a value between min and max.
 */
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Returns the current month name and year string.
 * Turn 1 = January Year 1, Turn 13 = January Year 2, etc.
 */
function getTurnLabel(turn) {
  const monthIndex = (turn - 1) % 12;
  const year = Math.floor((turn - 1) / 12) + 1;
  return `${gameState.monthLabels[monthIndex]}, Year ${year}`;
}

/**
 * Returns the total seats currently in the player's coalition.
 */
function getCoalitionSeats() {
  return parties
    .filter(p => p.inCoalition)
    .reduce((sum, p) => sum + p.seats, 0);
}

/**
 * Returns whether the coalition still has a parliamentary majority.
 */
function hasCoalitionMajority() {
  return getCoalitionSeats() >= MAJORITY_THRESHOLD;
}

/**
 * Finds a party object by its id.
 */
function getPartyById(id) {
  return parties.find(p => p.id === id);
}

/**
 * Applies stat changes to gameState with clamping.
 * @param {Object} effects - e.g. { popularity: +5, budget: -20, unrest: +10 }
 */
function applyEffects(effects) {
  if (!effects) return;

  if (effects.popularity !== undefined) {
    gameState.popularity = clamp(
      gameState.popularity + effects.popularity,
      GAME_CONSTANTS.MIN_POPULARITY,
      GAME_CONSTANTS.MAX_POPULARITY
    );
  }
  if (effects.budget !== undefined) {
    gameState.budget += effects.budget;
  }
  if (effects.growth !== undefined) {
    gameState.growth = Math.round((gameState.growth + effects.growth) * 10) / 10;
  }
  if (effects.unrest !== undefined) {
    gameState.unrest = clamp(
      gameState.unrest + effects.unrest,
      GAME_CONSTANTS.MIN_UNREST,
      GAME_CONSTANTS.MAX_UNREST
    );
  }
  if (effects.militaryPatience !== undefined) {
    gameState.militaryPatience = clamp(
      gameState.militaryPatience + effects.militaryPatience, 0, 100
    );
  }
  if (effects.coalitionStability !== undefined) {
    gameState.coalitionStability = clamp(
      gameState.coalitionStability + effects.coalitionStability, 0, 100
    );
  }
}

/**
 * Applies party relationship changes.
 * @param {Object} partyEffects - e.g. { progressive_move: +10, national_heritage: -15 }
 */
function applyPartyEffects(partyEffects) {
  if (!partyEffects) return;

  for (const [partyId, change] of Object.entries(partyEffects)) {
    const party = getPartyById(partyId);
    if (party) {
      party.relation = clamp(party.relation + change, -100, 100);
    }
  }
}


// ─── CRISIS EVENT SYSTEM ────────────────────────────────────

/**
 * Selects a random crisis event that hasn't been used yet.
 * If all events have been used, resets the pool (shuffle).
 * @returns {Object} A crisis event object from CRISIS_EVENTS.
 */
function getRandomCrisisEvent() {
  // Get available events (not yet used this cycle)
  let available = CRISIS_EVENTS.filter(e => !usedEventIds.includes(e.id));

  // If we've exhausted all events, reset the pool
  if (available.length === 0) {
    usedEventIds = [];
    available = [...CRISIS_EVENTS];
  }

  // Pick a random event
  const randomIndex = Math.floor(Math.random() * available.length);
  const event = JSON.parse(JSON.stringify(available[randomIndex])); // deep clone

  return event;
}

/**
 * Presents the monthly crisis event by setting it in game state.
 * This is called at the start of each turn.
 * @returns {Object} The selected crisis event.
 */
function triggerCrisisEvent() {
  const event = getRandomCrisisEvent();
  gameState.currentEvent = event;
  return event;
}

/**
 * Resolves the player's choice for the current crisis event.
 * Applies all effects (stats + party relations) and records history.
 * @param {number} choiceIndex - The index of the chosen option (0-based).
 * @returns {Object} Result object with outcome text and applied effects.
 */
function resolveCrisisChoice(choiceIndex) {
  const event = gameState.currentEvent;
  if (!event) {
    console.error("No active crisis event to resolve.");
    return null;
  }

  const choice = event.choices[choiceIndex];
  if (!choice) {
    console.error("Invalid choice index:", choiceIndex);
    return null;
  }

  // Apply stat effects (scaled by difficulty — negative effects are amplified)
  const gds = getGovDiffScale();
  const scaledEffects = { ...choice.effects };
  // Amplify negative effects on harder difficulty
  for (const key of ['popularity', 'unrest', 'budget', 'coalitionStability', 'militaryPatience']) {
    if (scaledEffects[key] !== undefined) {
      // Only amplify HARMFUL direction: -popularity, +unrest, -budget, -stability, -patience
      const isHarmful = (key === 'unrest' && scaledEffects[key] > 0) ||
                        (key !== 'unrest' && scaledEffects[key] < 0);
      if (isHarmful) {
        scaledEffects[key] = Math.round(scaledEffects[key] * gds.crisisEffectMult);
      }
    }
  }
  applyEffects(scaledEffects);

  // Apply party relationship effects
  applyPartyEffects(choice.partyEffects);

  // Record in event history
  gameState.eventHistory.push({
    turn: gameState.turn,
    eventId: event.id,
    eventTitle: event.title,
    choiceLabel: choice.label,
    effects: { ...scaledEffects },
    partyEffects: choice.partyEffects ? { ...choice.partyEffects } : {}
  });

  // Mark event as used
  usedEventIds.push(event.id);

  // Clear current event
  gameState.currentEvent = null;

  // Build result
  const result = {
    outcome: choice.outcome,
    effects: scaledEffects,
    partyEffects: choice.partyEffects || {}
  };

  return result;
}


// ─── LAW / POLICY SYSTEM ────────────────────────────────────

/**
 * Simulates a parliamentary vote on a proposed law.
 * Each coalition party votes based on their ideology alignment (voteModifiers)
 * combined with their current relationship with the PM.
 *
 * Vote calculation per party:
 *   baseSupport = party.voteModifiers[law.id] (ideology alignment, -40 to +40)
 *   relationBonus = party.relation * 0.3 (loyalty factor)
 *   totalScore = baseSupport + relationBonus
 *   If totalScore > 0: party votes YES with all their seats
 *   If totalScore <= 0: party votes NO
 *
 * A law passes if YES seats >= MAJORITY_THRESHOLD (251/500).
 *
 * @param {string} lawId - The id of the law to vote on.
 * @returns {Object} Vote result: { passed, yesVotes, noVotes, partyVotes[], totalSeats }
 */
function proposeLaw(lawId) {
  const law = laws.find(l => l.id === lawId);
  if (!law) {
    console.error("Law not found:", lawId);
    return null;
  }

  // Can't pass the same law twice
  if (law.passed) {
    return {
      passed: false,
      alreadyPassed: true,
      message: `"${law.name}" has already been enacted.`
    };
  }

  let yesVotes = 0;
  let noVotes = 0;
  const partyVotes = [];

  // All parties vote (coalition and opposition)
  parties.forEach(party => {
    const ideologyScore = party.voteModifiers[lawId] || 0;
    const relationBonus = party.relation * 0.3;
    const totalScore = ideologyScore + relationBonus;

    // Small random factor for unpredictability (-5 to +5)
    const randomFactor = (Math.random() - 0.5) * 10;
    const finalScore = totalScore + randomFactor;

    const votedYes = finalScore > 0;
    const seats = party.seats;

    if (votedYes) {
      yesVotes += seats;
    } else {
      noVotes += seats;
    }

    partyVotes.push({
      partyId: party.id,
      partyName: party.name,
      shortName: party.shortName,
      color: party.color,
      seats: seats,
      ideologyScore: Math.round(ideologyScore),
      relationBonus: Math.round(relationBonus),
      totalScore: Math.round(finalScore),
      votedYes: votedYes,
      inCoalition: party.inCoalition
    });
  });

  const passed = yesVotes >= MAJORITY_THRESHOLD;

  // If passed, apply immediate effects and mark as enacted
  if (passed) {
    law.passed = true;
    gameState.passedLaws.push(lawId);
    applyEffects(law.effects);

    // Passing controversial laws affects party relations
    parties.forEach(party => {
      const modifier = party.voteModifiers[lawId] || 0;
      // Parties that strongly opposed a passed law lose relation
      if (modifier < -15) {
        party.relation = clamp(party.relation - 5, -100, 100);
      }
      // Parties that strongly supported it gain relation
      if (modifier > 15) {
        party.relation = clamp(party.relation + 3, -100, 100);
      }
    });
  }

  return {
    passed,
    alreadyPassed: false,
    lawName: law.name,
    lawId: law.id,
    yesVotes,
    noVotes,
    totalSeats: PARLIAMENT_TOTAL_SEATS,
    majorityNeeded: MAJORITY_THRESHOLD,
    partyVotes,
    message: passed
      ? `✅ "${law.name}" has been ENACTED by Parliament! (${yesVotes} Yes — ${noVotes} No)`
      : `❌ "${law.name}" was REJECTED by Parliament. (${yesVotes} Yes — ${noVotes} No)`
  };
}

/**
 * Repeals (removes) a previously passed law.
 * This also triggers a parliamentary vote.
 * @param {string} lawId - The id of the law to repeal.
 * @returns {Object|null} Vote result or null if law wasn't passed.
 */
function repealLaw(lawId) {
  const law = laws.find(l => l.id === lawId);
  if (!law || !law.passed) {
    return { passed: false, message: "This law is not currently active." };
  }

  // Repeal vote — parties that dislike the law will vote YES to repeal
  let yesVotes = 0;
  let noVotes = 0;
  const partyVotes = [];

  parties.forEach(party => {
    // Invert: parties that hated the law want it repealed
    const ideologyScore = -(party.voteModifiers[lawId] || 0);
    const relationBonus = party.relation * 0.2;
    const totalScore = ideologyScore + relationBonus;
    const randomFactor = (Math.random() - 0.5) * 10;
    const finalScore = totalScore + randomFactor;
    const votedYes = finalScore > 0;

    if (votedYes) {
      yesVotes += party.seats;
    } else {
      noVotes += party.seats;
    }

    partyVotes.push({
      partyId: party.id,
      partyName: party.name,
      shortName: party.shortName,
      seats: party.seats,
      votedYes,
      inCoalition: party.inCoalition
    });
  });

  const repealed = yesVotes >= MAJORITY_THRESHOLD;

  if (repealed) {
    law.passed = false;
    gameState.passedLaws = gameState.passedLaws.filter(id => id !== lawId);
  }

  return {
    passed: repealed,
    lawName: law.name,
    yesVotes,
    noVotes,
    partyVotes,
    message: repealed
      ? `🔄 "${law.name}" has been REPEALED. (${yesVotes} Yes — ${noVotes} No)`
      : `"${law.name}" repeal FAILED. It remains in effect. (${yesVotes} Yes — ${noVotes} No)`
  };
}


// ─── COALITION MANAGEMENT ───────────────────────────────────

/**
 * Checks if any coalition party should defect based on low relation scores.
 * A party defects if relation drops below -30.
 * @returns {Array} Array of parties that defected (empty if none).
 */
function checkCoalitionDefections() {
  const defectors = [];

  // ── Defection threshold varies by difficulty ──
  const gds = getGovDiffScale();

  parties.forEach(party => {
    if (party.inCoalition && party.relation < gds.defectionThreshold) {
      // Probability of defection increases as relation drops
      const defectChance = Math.abs(party.relation + gds.defectionThreshold) / 70;
      if (Math.random() < defectChance) {
        party.inCoalition = false;
        defectors.push({
          partyId: party.id,
          partyName: party.name,
          seats: party.seats,
          relation: party.relation
        });
      }
    }
  });

  return defectors;
}

/**
 * Checks if any opposition party wants to join based on high relation scores.
 * A party may join if relation is above +50.
 * @returns {Array} Array of parties that joined (empty if none).
 */
function checkCoalitionJoiners() {
  const joiners = [];

  // ── Join threshold varies by difficulty ──
  const gds = getGovDiffScale();

  parties.forEach(party => {
    if (!party.inCoalition && party.relation > gds.coalitionJoinThreshold) {
      const joinChance = (party.relation - gds.coalitionJoinThreshold) / 100;
      if (Math.random() < joinChance) {
        party.inCoalition = true;
        joiners.push({
          partyId: party.id,
          partyName: party.name,
          seats: party.seats,
          relation: party.relation
        });
      }
    }
  });

  return joiners;
}


// ─── END TURN LOGIC ─────────────────────────────────────────

/**
 * Processes the end of a turn (1 month).
 * This is the core game loop tick that:
 *   1. Applies monthly effects from all active/passed laws
 *   2. Applies base monthly income and natural stat decay
 *   3. Calculates economic effects on budget
 *   4. Checks for coalition defections/joiners
 *   5. Adjusts military patience based on unrest
 *   6. Checks all Game Over conditions
 *   7. Advances the turn counter
 *
 * @returns {Object} Turn report with all changes and events.
 */
function endTurn() {
  const report = {
    turn: gameState.turn,
    turnLabel: getTurnLabel(gameState.turn),
    statChanges: { popularity: 0, budget: 0, unrest: 0, growth: 0 },
    lawEffects: [],
    defections: [],
    joiners: [],
    warnings: [],
    gameOver: false,
    gameOverReason: ""
  };

  // ── 1. Monthly base income & decay (scaled by difficulty) ──
  const gds = getGovDiffScale();
  const baseChanges = {
    budget: Math.round(GAME_CONSTANTS.MONTHLY_BUDGET_INCOME * gds.budgetIncomeMult),
    unrest: Math.round(GAME_CONSTANTS.MONTHLY_UNREST_DECAY * gds.monthlyDecayMult),
    popularity: Math.round(GAME_CONSTANTS.MONTHLY_POPULARITY_DECAY * gds.monthlyDecayMult)
  };

  // Economic growth affects budget income
  const growthBonus = Math.round(gameState.growth * 8);
  baseChanges.budget += growthBonus;

  report.statChanges.budget += baseChanges.budget;
  report.statChanges.unrest += baseChanges.unrest;
  report.statChanges.popularity += baseChanges.popularity;

  applyEffects(baseChanges);

  // ── 2. Monthly effects from passed laws ──
  laws.forEach(law => {
    if (law.passed && law.monthlyEffects) {
      const fx = law.monthlyEffects;
      report.lawEffects.push({
        lawName: law.name,
        icon: law.icon,
        effects: { ...fx }
      });

      // Accumulate into statChanges for display
      for (const [key, val] of Object.entries(fx)) {
        if (report.statChanges[key] !== undefined) {
          report.statChanges[key] += val;
        }
      }

      applyEffects(fx);
    }
  });

  // ── 3. Coalition stability decay ──
  // Low popularity erodes coalition stability
  if (gameState.popularity < 30) {
    const stabilityLoss = Math.round((30 - gameState.popularity) * 0.3);
    gameState.coalitionStability = clamp(
      gameState.coalitionStability - stabilityLoss, 0, 100
    );
  }
  // High popularity strengthens coalition
  if (gameState.popularity > 60) {
    gameState.coalitionStability = clamp(
      gameState.coalitionStability + 1, 0, 100
    );
  }

  // ── 4. Check coalition defections & joiners ──
  report.defections = checkCoalitionDefections();
  report.joiners = checkCoalitionJoiners();

  if (report.defections.length > 0) {
    report.defections.forEach(d => {
      report.warnings.push(
        `⚠️ ${d.partyName} has LEFT the coalition! (${d.seats} seats lost)`
      );
    });
  }
  if (report.joiners.length > 0) {
    report.joiners.forEach(j => {
      report.warnings.push(
        `🤝 ${j.partyName} has JOINED the coalition! (+${j.seats} seats)`
      );
    });
  }

  // ── 5. Military patience (scaled by difficulty) ──
  // High unrest erodes military patience
  if (gameState.unrest > 60) {
    const patienceLoss = Math.round((gameState.unrest - 60) * 0.25 * gds.militaryDrainMult);
    gameState.militaryPatience = clamp(
      gameState.militaryPatience - patienceLoss, 0, 100
    );
  }
  // Low unrest slowly restores patience
  if (gameState.unrest < 30) {
    gameState.militaryPatience = clamp(
      gameState.militaryPatience + 1, 0, 100
    );
  }

  // ── 6. Game Over checks ──

  // COUP: Unrest hits 100
  if (gameState.unrest >= GAME_CONSTANTS.COUP_THRESHOLD) {
    report.gameOver = true;
    report.gameOverReason = "MILITARY COUP — Social unrest reached critical levels. Tanks roll into Bangkok. The Army Commander appears on all TV channels announcing the formation of the 'National Peace and Order Council.' Your government is dissolved.";
    gameState.isGameOver = true;
    gameState.gameOverReason = report.gameOverReason;
  }

  // COUP: Military patience exhausted
  if (gameState.militaryPatience <= GAME_CONSTANTS.MILITARY_COUP_PATIENCE) {
    report.gameOver = true;
    report.gameOverReason = "MILITARY COUP — The generals have lost patience. In a swift overnight operation, key government buildings are seized. You are escorted from Government House. The cycle repeats.";
    gameState.isGameOver = true;
    gameState.gameOverReason = report.gameOverReason;
  }

  // BANKRUPTCY: Budget depleted
  if (gameState.budget <= GAME_CONSTANTS.BUDGET_BANKRUPTCY) {
    report.gameOver = true;
    report.gameOverReason = "NATIONAL BANKRUPTCY — The treasury is empty. Civil servants go unpaid, hospitals close, and the IMF knocks on the door. Your government collapses under the weight of fiscal ruin.";
    gameState.isGameOver = true;
    gameState.gameOverReason = report.gameOverReason;
  }

  // VOTE OF NO CONFIDENCE: Lost coalition majority
  if (!hasCoalitionMajority()) {
    report.gameOver = true;
    report.gameOverReason = "VOTE OF NO CONFIDENCE — Your coalition has fractured below the 251-seat majority. Opposition parties file a no-confidence motion. It passes overwhelmingly. The Speaker dissolves Parliament.";
    gameState.isGameOver = true;
    gameState.gameOverReason = report.gameOverReason;
  }

  // POPULARITY COLLAPSE
  if (gameState.popularity <= 0) {
    report.gameOver = true;
    report.gameOverReason = "POLITICAL IRRELEVANCE — Your approval rating has hit rock bottom. Mass protests demanding your resignation erupt nationwide. Even your own party calls for you to step down. You resign in disgrace.";
    gameState.isGameOver = true;
    gameState.gameOverReason = report.gameOverReason;
  }

  // VICTORY: Survived full term
  if (gameState.turn >= gameState.maxTurns && !report.gameOver) {
    report.gameOver = true;
    report.gameOverReason = "VICTORY";
    gameState.isGameOver = true;
    gameState.gameOverReason = "VICTORY";
  }

  // ── 7. Generate warnings ──
  if (gameState.unrest > 70 && !report.gameOver) {
    report.warnings.push("🔴 CRITICAL: Social unrest is dangerously high! A coup may be imminent.");
  } else if (gameState.unrest > 50) {
    report.warnings.push("🟡 WARNING: Social unrest is rising. Tread carefully.");
  }

  if (gameState.militaryPatience < 30 && !report.gameOver) {
    report.warnings.push("🎖️ DANGER: Military patience is running thin. The generals are watching.");
  }

  if (gameState.budget < 200) {
    report.warnings.push("💰 WARNING: Budget is critically low. Bankruptcy looms.");
  }

  if (gameState.popularity < 20) {
    report.warnings.push("📉 WARNING: Your approval is collapsing. The people have lost faith.");
  }

  if (!hasCoalitionMajority() && !report.gameOver) {
    report.warnings.push("🏛️ CRITICAL: Coalition has lost its majority! Seek new partners immediately.");
  }

  // ── 8. Advance turn ──
  if (!report.gameOver || report.gameOverReason === "VICTORY") {
    gameState.turn++;
  }

  return report;
}


// ─── VICTORY SCORE CALCULATION ──────────────────────────────

/**
 * Calculates a final score when the player completes their term.
 * Score is based on ending stats, laws passed, and overall performance.
 * @returns {Object} Score breakdown.
 */
function calculateVictoryScore() {
  const scores = {
    popularity: gameState.popularity * 3,                    // max 300
    stability: (100 - gameState.unrest) * 2,                 // max 200
    economy: Math.max(0, gameState.budget) * 0.1,            // variable
    growth: Math.max(0, gameState.growth * 30),              // variable
    legislation: gameState.passedLaws.length * 25,           // 25 per law
    coalitionBonus: hasCoalitionMajority() ? 100 : 0,        // 100 if intact
    militaryBonus: gameState.militaryPatience > 50 ? 50 : 0  // 50 if stable
  };

  scores.total = Object.values(scores).reduce((a, b) => a + b, 0);

  // Letter grade
  if (scores.total >= 800) scores.grade = "S";
  else if (scores.total >= 650) scores.grade = "A";
  else if (scores.total >= 500) scores.grade = "B";
  else if (scores.total >= 350) scores.grade = "C";
  else if (scores.total >= 200) scores.grade = "D";
  else scores.grade = "F";

  // Title
  const titles = {
    "S": "สุดยอดนายกฯ — The People's Champion",
    "A": "นักการเมืองผู้ยิ่งใหญ่ — Master Politician",
    "B": "ผู้นำที่ดี — Competent Leader",
    "C": "นักการเมืองธรรมดา — Average Politician",
    "D": "ผู้นำที่อ่อนแอ — Struggling Leader",
    "F": "หายนะทางการเมือง — Political Disaster"
  };
  scores.title = titles[scores.grade];

  return scores;
}


// ─── SAVE / LOAD ────────────────────────────────────────────

/**
 * Serializes the current game state to localStorage.
 */
function saveGame() {
  const saveData = {
    gameState: gameState,
    parties: parties,
    laws: laws,
    usedEventIds: usedEventIds,
    savedAt: new Date().toISOString()
  };
  localStorage.setItem("tps_save", JSON.stringify(saveData));
  return true;
}

/**
 * Loads game state from localStorage.
 * @returns {boolean} True if load succeeded, false if no save found.
 */
function loadGame() {
  const raw = localStorage.getItem("tps_save");
  if (!raw) return false;

  try {
    const saveData = JSON.parse(raw);
    gameState = saveData.gameState;
    parties = saveData.parties;
    laws = saveData.laws;
    usedEventIds = saveData.usedEventIds || [];
    return true;
  } catch (e) {
    console.error("Failed to load save:", e);
    return false;
  }
}

/**
 * Deletes the saved game from localStorage.
 */
function deleteSave() {
  localStorage.removeItem("tps_save");
}

/**
 * Checks if a saved game exists.
 */
function hasSavedGame() {
  return localStorage.getItem("tps_save") !== null;
}
