// ═══════════════════════════════════════════════════════════════════════════
// THAILAND POLITICAL SIMULATION — /parliament-test/engine.js
// ═══════════════════════════════════════════════════════════════════════════
//
// PURPOSE:
//   Implements the deep legislative workflow mechanics:
//   - Bill Lifecycle (Initiation → Committee → Reading → Vote)
//   - Influence resource for negotiation
//   - Committee Phase with expert selection
//   - Party Whip system for coalition discipline
//
// DEPENDENCIES:
//   - parliament-test/data.js (parliamentState, applyEffects, etc.)
//   - parliament-test/debate.js (for debate integration)
//   - shared/settings.js (TPSGlobalState for difficulty scaling)
//
// ═══════════════════════════════════════════════════════════════════════════

/**
 * getParlDiffScale() — Returns difficulty multipliers for the Parliament module.
 *
 *   influenceCostMult:  Multiplies Influence costs for bill initiation & signatures
 *   sigSuccessMult:     Multiplies signature gathering success chance (inverse: lower = harder)
 *   rebellionMult:      Multiplies whip rebellion rate (higher = more rebels)
 *   scandalRiskMult:    Multiplies committee scandal risk %
 *   protestPenaltyMult: Multiplies protest failure capital cost
 */
function getParlDiffScale() {
  const d = (typeof TPSGlobalState !== 'undefined') ? TPSGlobalState.difficulty : 'normal';
  const scales = {
    easy:   { influenceCostMult: 0.7, sigSuccessMult: 1.25, rebellionMult: 0.6, scandalRiskMult: 0.5, protestPenaltyMult: 0.6 },
    normal: { influenceCostMult: 1.0, sigSuccessMult: 1.0,  rebellionMult: 1.0, scandalRiskMult: 1.0, protestPenaltyMult: 1.0 },
    hard:   { influenceCostMult: 1.4, sigSuccessMult: 0.75, rebellionMult: 1.5, scandalRiskMult: 1.5, protestPenaltyMult: 1.5 }
  };
  return scales[d] || scales.normal;
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 1: EXTENDED RESOURCE — INFLUENCE
// Influence is the currency of backroom politics.
// Used to negotiate, twist arms, and gather bill signatures.
// ──────────────────────────────────────────────────────────────────────────

/**
 * initExtendedResources() — Adds Influence and PoliticalCapital tracking
 * to the existing parliamentState. Called after initParliamentState().
 *
 * Influence:        0-100. Earned through committee work, networking.
 *                   Spent on bill initiation, whip enforcement, negotiations.
 *
 * PoliticalCapital: Already exists in data.js but this provides
 *                   additional earning mechanics from legislative success.
 */
function initExtendedResources() {
  if (!parliamentState) {
    console.warn("[engine.js] parliamentState not initialized.");
    return;
  }

  // Add Influence if not already present
  if (parliamentState.playerInfluence === undefined) {
    parliamentState.playerInfluence = 40; // Start with 40/100
  }

  // Legislative tracking
  if (!parliamentState.legislativeRecord) {
    parliamentState.legislativeRecord = {
      billsInitiated: 0,
      billsInCommittee: 0,
      billsPassed: 0,
      billsDefeated: 0,
      signaturesGathered: 0,
      whipEnforcements: 0,
      rebelsHandled: 0
    };
  }

  // Active bills registry
  if (!parliamentState.activeBills) {
    parliamentState.activeBills = [];
  }

  console.log("[engine.js] Extended resources initialized.");
  console.log(`  → Influence: ${parliamentState.playerInfluence}/100`);
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 2: BILL LIFECYCLE
// Bills move through stages: Draft → Signatures → First Reading →
// Committee → Second Reading (Debate) → Vote → Royal Assent
// ──────────────────────────────────────────────────────────────────────────

/**
 * BILL_STAGES — The stages a bill passes through.
 */
const BILL_STAGES = {
  DRAFT:          "draft",
  SIGNATURES:     "signatures",
  FIRST_READING:  "first_reading",
  COMMITTEE:      "committee",
  SECOND_READING: "second_reading",    // This is the debate phase
  VOTE:           "vote",
  PASSED:         "passed",
  DEFEATED:       "defeated"
};

/**
 * BILL_TEMPLATES — Pre-defined bills the player can initiate.
 * Each requires a certain number of signatures (co-sponsors)
 * and a minimum Influence to begin the process.
 */
const BILL_TEMPLATES = [
  {
    id: "bill_education_reform",
    title: "Education Reform Act",
    titleThai: "ร่าง พ.ร.บ. ปฏิรูปการศึกษา",
    category: "social",
    requiredSignatures: 20,
    influenceCost: 15,
    difficulty: 40,
    publicApproval: 75,
    description: "Overhaul the national curriculum, increase teacher salaries, and mandate digital literacy."
  },
  {
    id: "bill_anti_corruption",
    title: "Enhanced Anti-Corruption Act",
    titleThai: "ร่าง พ.ร.บ. ปราบปรามการทุจริตเข้มข้น",
    category: "reform",
    requiredSignatures: 40,
    influenceCost: 25,
    difficulty: 70,
    publicApproval: 85,
    description: "Strengthen the NACC, mandatory asset declarations, whistleblower protection."
  },
  {
    id: "bill_minimum_wage",
    title: "Progressive Minimum Wage Bill",
    titleThai: "ร่าง พ.ร.บ. ค่าจ้างขั้นต่ำก้าวหน้า",
    category: "economic",
    requiredSignatures: 25,
    influenceCost: 20,
    difficulty: 55,
    publicApproval: 80,
    description: "Index minimum wage to inflation, regional cost-of-living adjustments."
  },
  {
    id: "bill_decentralization",
    title: "Provincial Autonomy Act",
    titleThai: "ร่าง พ.ร.บ. อำนาจจังหวัดอิสระ",
    category: "reform",
    requiredSignatures: 50,
    influenceCost: 35,
    difficulty: 80,
    publicApproval: 55,
    description: "Elect provincial governors, transfer 35% of national budget to provinces."
  },
  {
    id: "bill_digital_privacy",
    title: "Digital Privacy Protection Act",
    titleThai: "ร่าง พ.ร.บ. คุ้มครองความเป็นส่วนตัวดิจิทัล",
    category: "economic",
    requiredSignatures: 15,
    influenceCost: 10,
    difficulty: 35,
    publicApproval: 65,
    description: "GDPR-style data protection, right to be forgotten, Big Tech accountability."
  }
];

/**
 * initiateBill() — Player begins the process of proposing a bill.
 * This costs Influence based on how many AI MPs need to be convinced
 * to co-sign the proposal.
 *
 * @param {string} billTemplateId — ID from BILL_TEMPLATES
 * @returns {Object} Result of the initiation attempt
 */
function initiateBill(billTemplateId) {
  if (!parliamentState) return { error: "State not initialized." };

  const template = BILL_TEMPLATES.find(b => b.id === billTemplateId);
  if (!template) return { error: `Unknown bill: ${billTemplateId}` };

  // Check Influence cost (scaled by difficulty)
  const pds = getParlDiffScale();
  const adjustedCost = Math.round(template.influenceCost * pds.influenceCostMult);
  if (parliamentState.playerInfluence < adjustedCost) {
    return {
      error: `Insufficient Influence. Need ${adjustedCost}, have ${parliamentState.playerInfluence}.`,
      needed: adjustedCost,
      have: parliamentState.playerInfluence
    };
  }

  // Check if already active
  if (parliamentState.activeBills.find(b => b.templateId === billTemplateId)) {
    return { error: "This bill is already in the legislative pipeline." };
  }

  // Deduct Influence
  parliamentState.playerInfluence = Math.max(0,
    parliamentState.playerInfluence - adjustedCost);

  // Create the bill object
  const bill = {
    id: `bill_${Date.now()}`,
    templateId: template.id,
    title: template.title,
    titleThai: template.titleThai,
    category: template.category,
    description: template.description,
    stage: BILL_STAGES.SIGNATURES,
    signatures: 0,
    requiredSignatures: template.requiredSignatures,
    difficulty: template.difficulty,
    publicApproval: template.publicApproval,
    committeeExpert: null,       // Set during committee phase
    committeeBonus: 0,
    passChance: 50,              // Base 50%, modified by stages
    initiatedDay: parliamentState.totalDaysElapsed,
    history: [`Bill drafted and submitted for co-signatures.`]
  };

  parliamentState.activeBills.push(bill);
  parliamentState.legislativeRecord.billsInitiated++;

  console.log(`[engine.js] Bill initiated: "${template.title}" (Influence cost: ${adjustedCost})`);

  return {
    success: true,
    bill: bill,
    influenceSpent: adjustedCost,
    influenceRemaining: parliamentState.playerInfluence,
    message: `Bill "${template.title}" drafted! Gather ${template.requiredSignatures} signatures to proceed.`
  };
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 3: SIGNATURE GATHERING
// The player spends Influence to convince AI MPs to co-sign a bill.
// ──────────────────────────────────────────────────────────────────────────

/**
 * gatherSignatures() — Player spends Influence to gather co-signatures
 * for a pending bill.
 *
 * Each signature-gathering attempt:
 *   - Costs 2-5 Influence (based on difficulty)
 *   - Has a success chance based on PoliticalCapital + Influence
 *   - On success, add 3-8 signatures
 *   - On failure, add 0-2 signatures but still costs Influence
 *
 * @param {string} billId — The active bill's ID
 * @returns {Object} Result
 */
function gatherSignatures(billId) {
  if (!parliamentState) return { error: "State not initialized." };

  const bill = parliamentState.activeBills.find(b => b.id === billId);
  if (!bill) return { error: "Bill not found." };
  if (bill.stage !== BILL_STAGES.SIGNATURES) {
    return { error: "Bill is not in the signatures phase." };
  }

  // Influence cost: 2-5 based on difficulty
  const pds = getParlDiffScale();
  const cost = Math.round(Math.ceil(2 + (bill.difficulty / 100) * 3) * pds.influenceCostMult);
  if (parliamentState.playerInfluence < cost) {
    return { error: `Insufficient Influence. Need ${cost}, have ${parliamentState.playerInfluence}.` };
  }

  // Deduct cost
  parliamentState.playerInfluence = Math.max(0, parliamentState.playerInfluence - cost);

  // Calculate success (scaled by difficulty)
  let successChance = 60;
  successChance += (parliamentState.playerPoliticalCapital || 50) * 0.2;
  successChance -= bill.difficulty * 0.3;
  successChance *= pds.sigSuccessMult;  // Difficulty scaling
  successChance = Math.max(15, Math.min(90, successChance));

  const roll = Math.random() * 100;
  const success = roll < successChance;

  let signaturesGained;
  if (success) {
    signaturesGained = 3 + Math.floor(Math.random() * 6); // 3-8
  } else {
    signaturesGained = Math.floor(Math.random() * 3); // 0-2
  }

  bill.signatures = Math.min(bill.requiredSignatures, bill.signatures + signaturesGained);
  parliamentState.legislativeRecord.signaturesGathered += signaturesGained;

  // Check if signatures complete
  let stageAdvanced = false;
  if (bill.signatures >= bill.requiredSignatures) {
    bill.stage = BILL_STAGES.FIRST_READING;
    stageAdvanced = true;
    bill.history.push(`All ${bill.requiredSignatures} signatures gathered. Bill advances to First Reading.`);
    console.log(`[engine.js] Bill "${bill.title}" advances to First Reading!`);
  }

  bill.history.push(
    success
      ? `Lobbied MPs for signatures: +${signaturesGained} (${bill.signatures}/${bill.requiredSignatures})`
      : `Lobbying attempt had limited success: +${signaturesGained} (${bill.signatures}/${bill.requiredSignatures})`
  );

  return {
    success,
    signaturesGained,
    totalSignatures: bill.signatures,
    required: bill.requiredSignatures,
    stageAdvanced,
    influenceSpent: cost,
    message: success
      ? `Gained ${signaturesGained} signatures! (${bill.signatures}/${bill.requiredSignatures})`
      : `Limited progress: +${signaturesGained} signatures. (${bill.signatures}/${bill.requiredSignatures})`
  };
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 4: COMMITTEE PHASE (แปรญัตติ)
// After first reading, the bill goes to committee.
// The player must choose an expert to defend the bill.
// ──────────────────────────────────────────────────────────────────────────

/**
 * COMMITTEE_EXPERTS — The experts the player can choose during committee.
 * Each has different trade-offs.
 */
const COMMITTEE_EXPERTS = [
  {
    id: "constitutional_expert",
    label: "Constitutional Expert",
    labelThai: "ผู้เชี่ยวชาญกฎหมายรัฐธรรมนูญ",
    icon: "⚖️",
    description: "Increases the bill's legal standing and pass chance. No political side effects.",
    effects: {
      passChanceBonus: 20,
      politicalCapital: +3,
      publicApproval: 0,
      tycoonLoyalty: 0,
      scandalRisk: 0
    }
  },
  {
    id: "ngo_activist",
    label: "NGO Activist",
    labelThai: "นักกิจกรรม NGO",
    icon: "✊",
    description: "Boosts Public Approval but alienates business interests.",
    effects: {
      passChanceBonus: 10,
      politicalCapital: +2,
      publicApproval: +15,
      tycoonLoyalty: -10,
      scandalRisk: 0
    }
  },
  {
    id: "corporate_lobbyist",
    label: "Corporate Lobbyist",
    labelThai: "ล็อบบี้ยิสต์องค์กร",
    icon: "💼",
    description: "Brings corporate funding and support but risks a Public Scandal.",
    effects: {
      passChanceBonus: 15,
      politicalCapital: +1,
      publicApproval: -5,
      tycoonLoyalty: +15,
      scandalRisk: 25,     // 25% chance of scandal
      fundsGain: 100       // ฿100M funding if no scandal
    }
  }
];

/**
 * committeePhase() — Player selects an expert to defend the bill
 * during the committee review phase.
 *
 * @param {string} billId — Active bill ID
 * @param {string} expertId — ID from COMMITTEE_EXPERTS
 * @returns {Object} Committee result
 */
function committeePhase(billId, expertId) {
  if (!parliamentState) return { error: "State not initialized." };

  const bill = parliamentState.activeBills.find(b => b.id === billId);
  if (!bill) return { error: "Bill not found." };
  if (bill.stage !== BILL_STAGES.FIRST_READING && bill.stage !== BILL_STAGES.COMMITTEE) {
    return { error: "Bill is not ready for committee phase." };
  }

  const expert = COMMITTEE_EXPERTS.find(e => e.id === expertId);
  if (!expert) return { error: `Unknown expert: ${expertId}` };

  console.log(`[engine.js] Committee Phase: "${bill.title}" with ${expert.label}`);

  // Apply expert effects
  bill.committeeExpert = expert.id;
  bill.passChance += expert.effects.passChanceBonus;
  bill.committeeBonus = expert.effects.passChanceBonus;

  // Apply stat effects
  if (expert.effects.politicalCapital) {
    applyEffects({ politicalCapital: expert.effects.politicalCapital });
  }

  // Handle scandal risk (scaled by difficulty)
  const pds = getParlDiffScale();
  const adjustedScandalRisk = (expert.effects.scandalRisk || 0) * pds.scandalRiskMult;
  let scandalTriggered = false;
  if (adjustedScandalRisk > 0 && Math.random() * 100 < adjustedScandalRisk) {
    scandalTriggered = true;
    bill.passChance -= 15; // Scandal hurts the bill
    applyEffects({ politicalCapital: -5 });

    if (parliamentState) {
      parliamentState.playerFunds = Math.max(0, parliamentState.playerFunds - 50);
    }

    bill.history.push(`⚠️ SCANDAL: Connection to ${expert.label} exposed by media! Pass chance reduced.`);
  } else if (expert.effects.fundsGain) {
    // If no scandal and there's a funds gain
    if (parliamentState) {
      parliamentState.playerFunds += expert.effects.fundsGain;
    }
    bill.history.push(`${expert.label} secured ฿${expert.effects.fundsGain}M in supporting funds.`);
  }

  // Advance stage
  bill.stage = BILL_STAGES.SECOND_READING;
  bill.history.push(`Committee phase completed with ${expert.label}. Pass chance: ${bill.passChance}%.`);

  parliamentState.legislativeRecord.billsInCommittee++;

  return {
    success: true,
    expert: expert,
    scandalTriggered,
    passChance: bill.passChance,
    stage: bill.stage,
    message: scandalTriggered
      ? `⚠️ Scandal! ${expert.label}'s involvement exposed by media! Bill pass chance reduced.`
      : `${expert.label} successfully defended the bill in committee. Pass chance: ${bill.passChance}%.`
  };
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 5: PARTY WHIP SYSTEM (ระบบแส้พรรค)
// When voting on a bill, the party leadership issues a directive.
// MPs who defy the Whip face consequences.
// ──────────────────────────────────────────────────────────────────────────

/**
 * PartyLine — Defines the party's official position on a bill.
 * Set by the party leader (Player, if they're the leader).
 */
const PARTY_LINE_STANCES = {
  YES: "yes",       // Party orders all MPs to vote AYE
  NO: "no",         // Party orders all MPs to vote NAY
  FREE: "free"      // Free vote — MPs choose individually
};

/**
 * applyWhip() — Enforces the party line on a bill vote.
 *
 * If an MP's personal ideology clashes with the Whip, their loyalty drops.
 * Higher Political Capital means the Whip is more effective.
 *
 * @param {string} partyId — The party imposing the Whip
 * @param {string} stance — "yes" | "no" | "free"
 * @param {Object} bill — The bill being voted on
 * @returns {Object} Whip result with rebel count
 */
function applyWhip(partyId, stance, bill) {
  if (stance === PARTY_LINE_STANCES.FREE) {
    return {
      rebels: 0,
      loyalVoters: 0,
      message: "Free vote issued. MPs vote by conscience."
    };
  }

  // Simulate whip enforcement across Party MPs
  const partyMPCount = 50 + Math.floor(Math.random() * 30); // Simulated MP count
  let rebels = 0;
  let loyal = 0;

  // Rebellion chance is based on:
  // - Bill controversy (high = more rebels)
  // - Player's Political Capital (high = fewer rebels)
  // - Bill's public approval (if whipping against popular bill = more rebels)
  const controversyFactor = (bill.difficulty || 50) / 100;
  const capitalCalm = ((parliamentState?.playerPoliticalCapital || 50) / 100) * 0.3;

  // If whipping AGAINST a popular bill, more rebellion
  const approvalMismatch = (stance === PARTY_LINE_STANCES.NO && (bill.publicApproval || 50) > 60)
    ? 0.15 : 0;

  // Difficulty scaling: harder = more rebellion
  const pds = getParlDiffScale();
  const rebellionRate = Math.max(0.02, ((controversyFactor * 0.3) - capitalCalm + approvalMismatch) * pds.rebellionMult);

  for (let i = 0; i < partyMPCount; i++) {
    if (Math.random() < rebellionRate) {
      rebels++;
    } else {
      loyal++;
    }
  }

  // Track stats
  if (parliamentState) {
    parliamentState.legislativeRecord.whipEnforcements++;
  }

  console.log(`[engine.js] Whip applied: ${stance.toUpperCase()} — ${rebels} rebels out of ${partyMPCount}`);

  return {
    stance,
    totalMPs: partyMPCount,
    rebels,
    loyalVoters: loyal,
    rebellionRate: Math.round(rebellionRate * 100),
    message: rebels === 0
      ? `Party discipline holds! All ${partyMPCount} MPs vote ${stance.toUpperCase()}.`
      : `${rebels} MP(s) defied the party whip! ${loyal} remained loyal.`
  };
}

/**
 * punishMP() — Party Leader punishes a rebel MP.
 *
 * Costs Political Capital but restores party discipline.
 * The rebel gains Local Popularity (seen as independent).
 *
 * @param {string} rebelAction — "warning" | "suspension" | "expulsion"
 * @returns {Object} Punishment result
 */
function punishMP(rebelAction) {
  if (!parliamentState) return { error: "State not initialized." };

  const punishments = {
    warning: {
      label: "Formal Warning",
      labelThai: "ตักเตือนอย่างเป็นทางการ",
      capitalCost: 2,
      disciplineRestored: 5,
      rebelPopGain: 2,
      description: "A public reprimand. Mild effect."
    },
    suspension: {
      label: "Suspend from Committee",
      labelThai: "พักสมาชิกภาพกรรมาธิการ",
      capitalCost: 5,
      disciplineRestored: 15,
      rebelPopGain: 5,
      description: "Remove from committee assignments. Moderate response."
    },
    expulsion: {
      label: "Expel from Party",
      labelThai: "ขับออกจากพรรค",
      capitalCost: 10,
      disciplineRestored: 30,
      rebelPopGain: 15,
      description: "Nuclear option. The expelled MP becomes independent."
    }
  };

  const punishment = punishments[rebelAction];
  if (!punishment) return { error: `Unknown punishment: ${rebelAction}` };

  // Apply costs
  applyEffects({ politicalCapital: -punishment.capitalCost });

  parliamentState.legislativeRecord.rebelsHandled++;

  console.log(`[engine.js] Rebel punished: ${punishment.label} (Capital cost: ${punishment.capitalCost})`);

  return {
    success: true,
    punishment: punishment,
    capitalSpent: punishment.capitalCost,
    disciplineRestored: punishment.disciplineRestored,
    message: `${punishment.label}: -${punishment.capitalCost} Political Capital, +${punishment.disciplineRestored} Party Discipline.`
  };
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 6: INFLUENCE EARNING MECHANICS
// Actions that generate Influence for the player.
// ──────────────────────────────────────────────────────────────────────────

/**
 * earnInfluence() — Adds Influence to the player.
 * Called by various game mechanics.
 *
 * @param {number} amount — Amount of Influence to add
 * @param {string} source — Description of the source
 */
function earnInfluence(amount, source) {
  if (!parliamentState) return;

  parliamentState.playerInfluence = Math.min(100,
    (parliamentState.playerInfluence || 0) + amount);

  console.log(`[engine.js] Influence +${amount} from: ${source} (Total: ${parliamentState.playerInfluence})`);

  logEvent("influence", `Influence +${amount}`, source, { influence: amount });
}

/**
 * spendInfluence() — Deducts Influence from the player.
 *
 * @param {number} amount — Amount to spend
 * @returns {boolean} True if successful, false if insufficient
 */
function spendInfluence(amount) {
  if (!parliamentState) return false;
  if ((parliamentState.playerInfluence || 0) < amount) return false;

  parliamentState.playerInfluence -= amount;
  return true;
}

/**
 * getInfluence() — Returns the current Influence value.
 * @returns {number}
 */
function getInfluence() {
  return parliamentState ? (parliamentState.playerInfluence || 0) : 0;
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 7: BILL STATUS QUERIES
// ──────────────────────────────────────────────────────────────────────────

/**
 * getActiveBills() — Returns all active bills.
 */
function getActiveBills() {
  return parliamentState ? (parliamentState.activeBills || []) : [];
}

/**
 * getBillsByStage() — Returns bills at a given stage.
 */
function getBillsByStage(stage) {
  return getActiveBills().filter(b => b.stage === stage);
}

/**
 * getBillTemplates() — Returns available bill templates.
 */
function getBillTemplates() {
  return [...BILL_TEMPLATES];
}

/**
 * getLegislativeRecord() — Returns the player's legislative stats.
 */
function getLegislativeRecord() {
  return parliamentState ? parliamentState.legislativeRecord : null;
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 8: MODULE LOG
// ──────────────────────────────────────────────────────────────────────────

console.log("═══════════════════════════════════════════════════════════");
console.log("[parliament-test/engine.js] Legislative Workflow Engine loaded.");
console.log(`  → ${BILL_TEMPLATES.length} bill templates available`);
console.log(`  → ${COMMITTEE_EXPERTS.length} committee experts`);
console.log(`  → Bill lifecycle: ${Object.values(BILL_STAGES).join(" → ")}`);
console.log("  → Party Whip system ready");
console.log("  → Influence resource mechanics ready");
console.log("═══════════════════════════════════════════════════════════");
