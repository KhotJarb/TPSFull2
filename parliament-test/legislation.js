// ═══════════════════════════════════════════════════════════════════════════
// THAILAND POLITICAL SIMULATION — /parliament-test/legislation.js
// v.1.0.1 Test — Step 3: Deep Legislative Process Orchestrator
// ═══════════════════════════════════════════════════════════════════════════
//
// PURPOSE:
//   High-level API for the legislative workflow. Wraps engine.js functions
//   with UI-facing orchestration, modal callbacks, and narrative generation.
//
//   Exports:
//     proposeBill(billTemplateId)    → Full initiation + UI feedback
//     runSignaturePhase(billId)      → Lobby MPs for co-signatures
//     runCommitteePhase(billId)      → Expert selection modal trigger
//     getLegislativeSummary()        → Full status for UI rendering
//
// DEPENDENCIES:
//   - parliament-test/data.js   (parliamentState, applyEffects, logEvent)
//   - parliament-test/engine.js (initiateBill, gatherSignatures, committeePhase,
//                                 BILL_TEMPLATES, BILL_STAGES, COMMITTEE_EXPERTS)
//
// ═══════════════════════════════════════════════════════════════════════════


// ──────────────────────────────────────────────────────────────────────────
// SECTION 1: LEGISLATION CONSTANTS
// ──────────────────────────────────────────────────────────────────────────

/**
 * LEGISLATION_CONFIG — Tuning knobs for the legislative process.
 */
const LEGISLATION_CONFIG = {
  maxActiveBills: 3,           // Player can juggle up to 3 bills simultaneously
  signatureBatchCost: 3,       // Base Influence cost per lobbying attempt
  committeeCapitalCost: 5,     // Political Capital to enter committee phase
  firstReadingDelay: 0,        // Turns before first reading (0 = immediate)

  // Narrative flavor
  narratives: {
    signatureSuccess: [
      "Several MPs nod in agreement as you explain your bill's merits.",
      "Your impassioned argument sways a group of backbenchers to co-sign.",
      "After a private meeting, a faction leader pledges their bloc's signatures.",
      "Your coalition allies agree to add their names to the bill.",
      "A well-timed media appearance builds momentum — MPs rush to co-sign."
    ],
    signatureFailure: [
      "The government benches reject your approach outright.",
      "MPs are sympathetic but fear retribution from the Whip.",
      "Your pitch falls flat — the committee room empties.",
      "Coalition partners demand concessions you can't afford.",
      "Media scrutiny makes cautious MPs shy away from your bill."
    ],
    billDrafted: [
      "Your legislative team burns the midnight oil drafting the bill's provisions.",
      "Legal advisors from the Law Council review and approve the bill's language.",
      "The bill is formally registered with the Secretariat of the House."
    ],
    committeeNGO: [
      "The NGO activist passionately presents grassroots impact data to the committee.",
      "Civil society organizations rally behind the bill, flooding social media with support.",
      "Independent researchers validate the bill's social benefits in committee testimony."
    ],
    committeeLobbyist: [
      "The corporate lobbyist presents favorable economic impact projections.",
      "Industry associations quietly channel support through back-channels.",
      "Luxury dinners and private meetings smooth the committee's approval process."
    ],
    scandalTriggered: [
      "📰 BREAKING: Media exposes secret corporate funding behind the bill committee review!",
      "📰 SCANDAL: Documents leaked showing lobbyist payments to committee members!",
      "📰 สำนักข่าวเปิดโปง: พบเงินทุนลับจากภาคเอกชนหนุนร่างกฎหมาย!"
    ]
  }
};


// ──────────────────────────────────────────────────────────────────────────
// SECTION 2: BILL PROPOSAL — Full Workflow Entry Point
// ──────────────────────────────────────────────────────────────────────────

/**
 * proposeBill() — High-level function for proposing a new bill.
 * Validates constraints, calls engine.js initiateBill(), and
 * returns a UI-ready result with narrative text.
 *
 * @param {string} billTemplateId — ID from BILL_TEMPLATES
 * @returns {Object} Result with narrative, status, and bill data
 */
function proposeBill(billTemplateId) {
  if (!parliamentState) {
    return { success: false, error: "Parliament state not initialized." };
  }

  // Check bill limit
  const activeBills = getActiveBills();
  if (activeBills.length >= LEGISLATION_CONFIG.maxActiveBills) {
    return {
      success: false,
      error: `Maximum ${LEGISLATION_CONFIG.maxActiveBills} active bills allowed. Complete or withdraw an existing bill first.`,
      activeBillCount: activeBills.length
    };
  }

  // Delegate to engine.js
  const result = initiateBill(billTemplateId);
  if (result.error) {
    return { success: false, error: result.error };
  }

  // Generate narrative
  const narrative = _randomPick(LEGISLATION_CONFIG.narratives.billDrafted);

  // Log the event
  logEvent("legislation", `Bill Proposed: ${result.bill.title}`,
    narrative, { influence: -result.influenceSpent });

  console.log(`[legislation.js] Bill proposed: "${result.bill.title}"`);

  return {
    success: true,
    bill: result.bill,
    influenceSpent: result.influenceSpent,
    influenceRemaining: result.influenceRemaining,
    narrative: narrative,
    nextAction: "gatherSignatures",
    message: result.message,
    toastMessage: `📜 Bill Proposed: "${result.bill.title}" — Now gather ${result.bill.requiredSignatures} signatures!`,
    toastType: "success"
  };
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 3: SIGNATURE GATHERING — Interactive Lobbying
// ──────────────────────────────────────────────────────────────────────────

/**
 * runSignaturePhase() — Player attempts to gather co-signatures
 * for a bill. Each call is one lobbying round.
 *
 * Wraps engine.js gatherSignatures() with narrative generation
 * and stage-transition detection.
 *
 * @param {string} billId — Active bill's runtime ID
 * @returns {Object} UI-ready result
 */
function runSignaturePhase(billId) {
  if (!parliamentState) {
    return { success: false, error: "Parliament state not initialized." };
  }

  const bill = (parliamentState.activeBills || []).find(b => b.id === billId);
  if (!bill) {
    return { success: false, error: "Bill not found in active bills." };
  }

  if (bill.stage !== BILL_STAGES.SIGNATURES) {
    return { success: false, error: `Bill is not in signatures phase (current: ${bill.stage}).` };
  }

  // Check minimum Influence
  const currentInfluence = getInfluence();
  const minCost = Math.ceil(2 + (bill.difficulty / 100) * 3);
  if (currentInfluence < minCost) {
    return {
      success: false,
      error: `Insufficient Influence. Need at least ${minCost}, have ${currentInfluence}. Earn more through debates and committee work.`,
      influenceNeeded: minCost,
      influenceHave: currentInfluence
    };
  }

  // Delegate to engine.js
  const result = gatherSignatures(billId);
  if (result.error) {
    return { success: false, error: result.error };
  }

  // Generate narrative
  const narratives = result.success
    ? LEGISLATION_CONFIG.narratives.signatureSuccess
    : LEGISLATION_CONFIG.narratives.signatureFailure;
  const narrative = _randomPick(narratives);

  // Calculate progress percentage
  const progress = Math.round((result.totalSignatures / result.required) * 100);

  // Log the event
  logEvent("legislation",
    `Signature Lobbying: ${bill.title}`,
    `${narrative} (+${result.signaturesGained} signatures)`,
    { influence: -result.influenceSpent });

  // Build result
  const output = {
    success: result.success,
    signaturesGained: result.signaturesGained,
    totalSignatures: result.totalSignatures,
    requiredSignatures: result.required,
    progress: progress,
    influenceSpent: result.influenceSpent,
    stageAdvanced: result.stageAdvanced,
    narrative: narrative,
    billTitle: bill.title,
    billTitleThai: bill.titleThai,
    message: result.message
  };

  // If signatures complete → bill advances to first reading
  if (result.stageAdvanced) {
    output.toastMessage = `✅ "${bill.title}" — All ${result.required} signatures gathered! Advancing to First Reading.`;
    output.toastType = "success";
    output.nextAction = "committeePhase";

    // Auto-advance through First Reading (it's procedural in Thai parliament)
    bill.stage = BILL_STAGES.COMMITTEE;
    bill.history.push("First Reading completed. Bill referred to standing committee (กรรมาธิการ).");

    logEvent("legislation", `First Reading: ${bill.title}`,
      "Bill accepted by the House and referred to committee.",
      { politicalCapital: 2 });
    applyEffects({ politicalCapital: 2 });
  } else {
    output.toastMessage = result.success
      ? `📝 +${result.signaturesGained} signatures for "${bill.title}" (${progress}%)`
      : `❌ Lobbying had limited results for "${bill.title}" (${progress}%)`;
    output.toastType = result.success ? "info" : "warning";
    output.nextAction = "gatherSignatures";
  }

  return output;
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 4: COMMITTEE PHASE — Expert Selection with Trade-offs
// ──────────────────────────────────────────────────────────────────────────

/**
 * getCommitteeChoices() — Returns the list of expert options
 * for the committee phase, formatted for UI display.
 *
 * @param {string} billId — Active bill ID
 * @returns {Object[]} Array of expert choice objects for modal rendering
 */
function getCommitteeChoices(billId) {
  const bill = (parliamentState?.activeBills || []).find(b => b.id === billId);
  if (!bill) return [];

  return COMMITTEE_EXPERTS.map(expert => ({
    id: expert.id,
    label: expert.label,
    labelThai: expert.labelThai,
    icon: expert.icon,
    description: expert.description,
    effects: { ...expert.effects },
    // UI display strings
    effectsSummary: _formatExpertEffects(expert.effects),
    riskLevel: expert.effects.scandalRisk > 0
      ? `⚠️ ${expert.effects.scandalRisk}% scandal risk`
      : "✅ No risk"
  }));
}

/**
 * runCommitteePhase() — Player selects an expert and executes
 * the committee phase for a bill.
 *
 * This is the core Step 3 function that implements the NGO vs Lobbyist
 * trade-off with full narrative feedback.
 *
 * @param {string} billId — Active bill ID
 * @param {string} expertId — "constitutional_expert" | "ngo_activist" | "corporate_lobbyist"
 * @returns {Object} UI-ready result with narrative, effects, scandal status
 */
function runCommitteePhase(billId, expertId) {
  if (!parliamentState) {
    return { success: false, error: "Parliament state not initialized." };
  }

  const bill = (parliamentState.activeBills || []).find(b => b.id === billId);
  if (!bill) {
    return { success: false, error: "Bill not found." };
  }

  if (bill.stage !== BILL_STAGES.COMMITTEE && bill.stage !== BILL_STAGES.FIRST_READING) {
    return {
      success: false,
      error: `Bill is not ready for committee (current stage: ${bill.stage}).`
    };
  }

  // Check Political Capital cost
  const capCost = LEGISLATION_CONFIG.committeeCapitalCost;
  const currentCap = parliamentState.playerPoliticalCapital || 50;
  if (currentCap < capCost) {
    return {
      success: false,
      error: `Insufficient Political Capital. Need ${capCost}, have ${currentCap}.`
    };
  }

  // Deduct Political Capital for entering committee
  applyEffects({ politicalCapital: -capCost });

  // Delegate to engine.js committeePhase
  const result = committeePhase(billId, expertId);
  if (result.error) {
    // Refund capital if engine rejects
    applyEffects({ politicalCapital: capCost });
    return { success: false, error: result.error };
  }

  // Generate narrative based on expert type
  let narrative;
  if (result.scandalTriggered) {
    narrative = _randomPick(LEGISLATION_CONFIG.narratives.scandalTriggered);
  } else if (expertId === "ngo_activist") {
    narrative = _randomPick(LEGISLATION_CONFIG.narratives.committeeNGO);
  } else if (expertId === "corporate_lobbyist") {
    narrative = _randomPick(LEGISLATION_CONFIG.narratives.committeeLobbyist);
  } else {
    narrative = `${result.expert.label} provided expert testimony. The committee is satisfied.`;
  }

  // Build detailed effects report
  const effectsReport = {
    passChance: result.passChance,
    passChanceBonus: result.expert.effects.passChanceBonus,
    publicApprovalChange: result.expert.effects.publicApproval || 0,
    tycoonLoyaltyChange: result.expert.effects.tycoonLoyalty || 0,
    fundsChange: result.scandalTriggered ? -50 : (result.expert.effects.fundsGain || 0),
    scandalTriggered: result.scandalTriggered,
    capitalSpent: capCost
  };

  // Apply publicApproval and tycoonLoyalty to state
  if (result.expert.effects.publicApproval) {
    _applyPublicApproval(result.expert.effects.publicApproval);
  }
  if (result.expert.effects.tycoonLoyalty) {
    _applyTycoonLoyalty(result.expert.effects.tycoonLoyalty);
  }

  // Log the event
  logEvent("legislation", `Committee Phase: ${bill.title}`,
    `Expert: ${result.expert.label} — ${narrative}`,
    {
      politicalCapital: -capCost + (result.expert.effects.politicalCapital || 0),
      funds: effectsReport.fundsChange
    });

  console.log(`[legislation.js] Committee phase completed for "${bill.title}" with ${result.expert.label}`);

  return {
    success: true,
    billId: billId,
    billTitle: bill.title,
    billTitleThai: bill.titleThai,
    expert: result.expert,
    scandalTriggered: result.scandalTriggered,
    passChance: result.passChance,
    effectsReport: effectsReport,
    narrative: narrative,
    stage: bill.stage,
    nextAction: "secondReading",
    toastMessage: result.scandalTriggered
      ? `⚠️ SCANDAL during "${bill.title}" committee review! Pass chance reduced.`
      : `⚖️ "${bill.title}" cleared committee! Pass chance: ${result.passChance}%. Ready for Second Reading.`,
    toastType: result.scandalTriggered ? "error" : "success"
  };
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 5: BILL STATUS & SUMMARY
// ──────────────────────────────────────────────────────────────────────────

/**
 * getLegislativeSummary() — Returns a comprehensive summary of all
 * legislative activity for UI rendering.
 *
 * @returns {Object} Full legislative status
 */
function getLegislativeSummary() {
  const bills = getActiveBills();
  const record = getLegislativeRecord();
  const templates = getBillTemplates();

  // Which templates are already active?
  const activeTemplateIds = bills.map(b => b.templateId);
  const availableTemplates = templates.filter(t => !activeTemplateIds.includes(t.id));

  return {
    activeBills: bills.map(b => ({
      id: b.id,
      templateId: b.templateId,
      title: b.title,
      titleThai: b.titleThai,
      category: b.category,
      stage: b.stage,
      stageLabel: _getStageLabelThai(b.stage),
      signatures: b.signatures,
      requiredSignatures: b.requiredSignatures,
      signatureProgress: b.requiredSignatures > 0
        ? Math.round((b.signatures / b.requiredSignatures) * 100) : 100,
      passChance: b.passChance,
      committeeExpert: b.committeeExpert,
      history: b.history,
      canGatherSignatures: b.stage === BILL_STAGES.SIGNATURES,
      canEnterCommittee: b.stage === BILL_STAGES.COMMITTEE || b.stage === BILL_STAGES.FIRST_READING,
      isReadyForVote: b.stage === BILL_STAGES.SECOND_READING
    })),
    availableTemplates: availableTemplates.map(t => ({
      id: t.id,
      title: t.title,
      titleThai: t.titleThai,
      category: t.category,
      requiredSignatures: t.requiredSignatures,
      influenceCost: t.influenceCost,
      difficulty: t.difficulty,
      publicApproval: t.publicApproval,
      description: t.description,
      canAfford: getInfluence() >= t.influenceCost
    })),
    stats: record || {},
    currentInfluence: getInfluence(),
    maxActiveBills: LEGISLATION_CONFIG.maxActiveBills,
    slotsRemaining: LEGISLATION_CONFIG.maxActiveBills - bills.length
  };
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 6: BILL WITHDRAWAL
// ──────────────────────────────────────────────────────────────────────────

/**
 * withdrawBill() — Player withdraws an active bill from the pipeline.
 * This frees up a bill slot but costs Political Capital.
 *
 * @param {string} billId — Active bill ID
 * @returns {Object} Result
 */
function withdrawBill(billId) {
  if (!parliamentState) {
    return { success: false, error: "State not initialized." };
  }

  const idx = (parliamentState.activeBills || []).findIndex(b => b.id === billId);
  if (idx === -1) {
    return { success: false, error: "Bill not found." };
  }

  const bill = parliamentState.activeBills[idx];

  // Withdrawal penalty: -3 Capital
  applyEffects({ politicalCapital: -3 });

  // Remove from active bills
  parliamentState.activeBills.splice(idx, 1);

  logEvent("legislation", `Bill Withdrawn: ${bill.title}`,
    "The bill was withdrawn from the legislative pipeline.",
    { politicalCapital: -3 });

  console.log(`[legislation.js] Bill withdrawn: "${bill.title}"`);

  return {
    success: true,
    billTitle: bill.title,
    capitalPenalty: 3,
    message: `"${bill.title}" withdrawn from the House. (-3 Political Capital)`,
    toastMessage: `🗑️ "${bill.title}" withdrawn. Slot freed.`,
    toastType: "warning"
  };
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 7: INTERNAL HELPERS
// ──────────────────────────────────────────────────────────────────────────

/**
 * _randomPick() — Returns a random element from an array.
 */
function _randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * _formatExpertEffects() — Formats expert effects for UI display.
 */
function _formatExpertEffects(effects) {
  const parts = [];

  if (effects.passChanceBonus) parts.push(`Pass Chance: +${effects.passChanceBonus}%`);
  if (effects.politicalCapital > 0) parts.push(`Capital: +${effects.politicalCapital}`);
  if (effects.politicalCapital < 0) parts.push(`Capital: ${effects.politicalCapital}`);
  if (effects.publicApproval > 0) parts.push(`Public Approval: +${effects.publicApproval}`);
  if (effects.publicApproval < 0) parts.push(`Public Approval: ${effects.publicApproval}`);
  if (effects.tycoonLoyalty > 0) parts.push(`Tycoon Loyalty: +${effects.tycoonLoyalty}`);
  if (effects.tycoonLoyalty < 0) parts.push(`Tycoon Loyalty: ${effects.tycoonLoyalty}`);
  if (effects.fundsGain) parts.push(`Funds: +฿${effects.fundsGain}M`);
  if (effects.scandalRisk) parts.push(`Scandal Risk: ${effects.scandalRisk}%`);

  return parts;
}

/**
 * _getStageLabelThai() — Returns Thai label for a bill stage.
 */
function _getStageLabelThai(stage) {
  const labels = {
    [BILL_STAGES.DRAFT]: "ร่าง (Draft)",
    [BILL_STAGES.SIGNATURES]: "รวบรวมลายเซ็น (Signatures)",
    [BILL_STAGES.FIRST_READING]: "วาระที่ 1 — รับหลักการ (First Reading)",
    [BILL_STAGES.COMMITTEE]: "ขั้นกรรมาธิการ (Committee)",
    [BILL_STAGES.SECOND_READING]: "วาระที่ 2 — แปรญัตติ (Second Reading)",
    [BILL_STAGES.VOTE]: "วาระที่ 3 — ลงมติ (Vote)",
    [BILL_STAGES.PASSED]: "ผ่านแล้ว ✅ (Passed)",
    [BILL_STAGES.DEFEATED]: "ตกไป ❌ (Defeated)"
  };
  return labels[stage] || stage;
}

/**
 * _applyPublicApproval() — Adjusts public approval in Parliament state.
 * Maps to localPopularity for compatibility.
 */
function _applyPublicApproval(amount) {
  if (!parliamentState) return;
  applyEffects({ localPopularity: amount });
  console.log(`[legislation.js] Public Approval ${amount > 0 ? '+' : ''}${amount}`);
}

/**
 * _applyTycoonLoyalty() — Adjusts tycoon loyalty.
 * Stored as an extended parliament state property.
 */
function _applyTycoonLoyalty(amount) {
  if (!parliamentState) return;

  if (parliamentState.tycoonLoyalty === undefined) {
    parliamentState.tycoonLoyalty = 50; // Default neutral
  }

  parliamentState.tycoonLoyalty = Math.max(0, Math.min(100,
    parliamentState.tycoonLoyalty + amount));

  console.log(`[legislation.js] Tycoon Loyalty ${amount > 0 ? '+' : ''}${amount} (Total: ${parliamentState.tycoonLoyalty})`);
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 8: MODULE LOG
// ──────────────────────────────────────────────────────────────────────────

console.log("═══════════════════════════════════════════════════════════");
console.log("[parliament-test/legislation.js] Deep Legislative Orchestrator loaded.");
console.log(`  → Max active bills: ${LEGISLATION_CONFIG.maxActiveBills}`);
console.log("  → Functions: proposeBill, runSignaturePhase, runCommitteePhase");
console.log("  → Functions: getLegislativeSummary, withdrawBill, getCommitteeChoices");
console.log("═══════════════════════════════════════════════════════════");
