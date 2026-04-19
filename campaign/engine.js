// ═══════════════════════════════════════════════════════════════════
// THAILAND POLITICAL SIMULATION — /campaign/engine.js
// Election Engine: Constituency + Party-List Math, Coalition, Win/Loss
// ═══════════════════════════════════════════════════════════════════

// ──────────────────────────────────────────────────────────────────
// UTILITY
// ──────────────────────────────────────────────────────────────────

function clampVal(v, min, max) { return Math.max(min, Math.min(max, v)); }

/**
 * getDiffScale() — Returns difficulty multipliers from TPSGlobalState.
 * All game mechanics reference this to adjust costs, gains, and AI behavior.
 *
 *   costMult:     Multiplies action costs (rally/IO/banYai)
 *   scrutinyMult: Multiplies scrutiny gains on player actions
 *   fundsReturnMult: Multiplies fundraise returns
 *   aiIntensity:  Multiplies AI campaign target count
 *   lobbyChanceMult: Multiplies lobbyist event trigger %
 *   electionScrutinyMult: Scrutiny penalty amplifier in election math
 */
function getDiffScale() {
  const d = (typeof TPSGlobalState !== 'undefined') ? TPSGlobalState.difficulty : 'normal';
  const scales = {
    easy:   { costMult: 0.75, scrutinyMult: 0.6,  fundsReturnMult: 1.4, aiIntensity: 0.7, lobbyChanceMult: 0.7, electionScrutinyMult: 0.5 },
    normal: { costMult: 1.0,  scrutinyMult: 1.0,  fundsReturnMult: 1.0, aiIntensity: 1.0, lobbyChanceMult: 1.0, electionScrutinyMult: 1.0 },
    hard:   { costMult: 1.35, scrutinyMult: 1.6,  fundsReturnMult: 0.7, aiIntensity: 1.5, lobbyChanceMult: 1.5, electionScrutinyMult: 1.8 }
  };
  return scales[d] || scales.normal;
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ──────────────────────────────────────────────────────────────────
// SECTION 1: CAMPAIGN WEEK ACTIONS
// ──────────────────────────────────────────────────────────────────

/**
 * Advances to the next campaign week.
 * Resets action points and triggers AI campaign actions.
 */
function advanceWeek() {
  if (campaignState.currentWeek >= campaignState.maxWeeks) {
    return { done: true, message: "Campaign is over. Time to hold the election." };
  }

  campaignState.currentWeek++;
  campaignState.actionPointsRemaining = campaignState.actionPointsPerWeek;
  campaignState.weeklyActions = [];

  // AI parties campaign automatically
  runAICampaigns();

  // Natural poll drift
  applyPollDrift();

  campaignState.campaignLog.push({
    week: campaignState.currentWeek,
    type: "week_start",
    message: `Week ${campaignState.currentWeek} of the ${campaignState.electionYear} campaign begins.`
  });

  return { done: false, week: campaignState.currentWeek };
}

/**
 * AI parties run their campaign activities each week
 */
function runAICampaigns() {
  const ds = getDiffScale();
  CAMPAIGN_PARTIES.forEach(party => {
    if (party.id === campaignState.playerPartyId) return;

    // AI picks random districts weighted by their regional strength
    // Difficulty scales AI aggressiveness: more targets on hard
    const targetCount = Math.round((3 + Math.floor(Math.random() * 5)) * ds.aiIntensity);
    const shuffled = shuffleArray(DISTRICTS);

    for (let i = 0; i < Math.min(targetCount, shuffled.length); i++) {
      const dist = shuffled[i];
      const regionStr = party.regionalStrength[dist.region] || 15;
      const buffAmount = (regionStr / 100) * (5 + Math.random() * 10);

      // AI applies campaign buffs
      if (party.banYaiNetwork > 30 && Math.random() < 0.3) {
        // Ban Yai operation
        dist.banYaiBonus += buffAmount * 0.5;
        if (!dist.banYaiOwner || Math.random() < 0.4) {
          dist.banYaiOwner = party.id;
        }
      } else {
        // Normal campaigning
        const buffType = ["rally", "canvass", "io", "policy"][Math.floor(Math.random() * 4)];
        dist.campaignBuffs[buffType] += buffAmount;
      }
    }
  });
}

/**
 * Small random drift in national polls each week
 */
function applyPollDrift() {
  let total = 0;
  CAMPAIGN_PARTIES.forEach(party => {
    const drift = (Math.random() - 0.5) * 2;
    campaignState.nationalPollShare[party.id] = Math.max(3,
      campaignState.nationalPollShare[party.id] + drift
    );
    total += campaignState.nationalPollShare[party.id];
  });
  // Normalize to 100
  CAMPAIGN_PARTIES.forEach(party => {
    campaignState.nationalPollShare[party.id] =
      Math.round((campaignState.nationalPollShare[party.id] / total) * 100);
  });
}

// ── Player campaign actions ─────────────────────────────────────

/**
 * Player holds a rally in a province (affects all districts in that province)
 */
function actionRally(provinceId) {
  if (campaignState.actionPointsRemaining <= 0) return { success: false, message: "No action points remaining." };
  const ds = getDiffScale();
  const cost = Math.round(50 * ds.costMult);
  if (campaignState.playerFunds < cost) return { success: false, message: "Insufficient funds." };

  const dists = getDistrictsByProvince(provinceId);
  if (dists.length === 0) return { success: false, message: "Province not found." };

  campaignState.playerFunds -= cost;
  campaignState.actionPointsRemaining--;
  const scrutinyGain = Math.round(1 * ds.scrutinyMult);
  campaignState.playerScrutiny = Math.min(100, campaignState.playerScrutiny + scrutinyGain);

  // DIMINISHING RETURNS: effectiveness drops with repeated visits
  // First visit = full buff, subsequent visits lose 15% each time
  const avgVisits = dists.reduce((sum, d) => sum + d.visitCount, 0) / dists.length;
  const diminishFactor = Math.max(0.25, 1 - (avgVisits * 0.15));
  const baseBuff = 8 + Math.random() * 7;
  const buff = baseBuff * diminishFactor;

  dists.forEach(d => {
    d.campaignBuffs.rally += buff;
    d.visitCount++;
  });

  const prov = getProvinceById(provinceId);
  const diminishNote = diminishFactor < 0.85 ? ` (diminished: ×${diminishFactor.toFixed(2)})` : '';
  campaignState.campaignLog.push({
    week: campaignState.currentWeek, type: "rally",
    message: `Held rally in ${prov.name} (+${buff.toFixed(1)} buff to ${dists.length} districts, cost ฿${cost}M)${diminishNote}`
  });

  return { success: true, buff, districts: dists.length, province: prov.name, diminishFactor };
}

/**
 * Player runs an IO (Information Operation) campaign targeting a region
 */
function actionIO(region) {
  if (campaignState.actionPointsRemaining <= 0) return { success: false, message: "No action points remaining." };
  const ds = getDiffScale();
  const cost = Math.round(80 * ds.costMult);
  if (campaignState.playerFunds < cost) return { success: false, message: "Insufficient funds." };

  const dists = getDistrictsByRegion(region);
  if (dists.length === 0) return { success: false, message: "Region not found." };

  campaignState.playerFunds -= cost;
  campaignState.actionPointsRemaining--;
  const scrutinyGain = Math.round(5 * ds.scrutinyMult);
  campaignState.playerScrutiny = Math.min(100, campaignState.playerScrutiny + scrutinyGain);

  const party = CAMPAIGN_PARTIES.find(p => p.id === campaignState.playerPartyId);
  const ioMult = (party.ioStrength || 20) / 30;

  // DIMINISHING RETURNS: IO is less effective at high scrutiny
  // Above 40% scrutiny, IO effectiveness drops as media catches on
  const scrutinyPenalty = campaignState.playerScrutiny > 40
    ? Math.max(0.3, 1 - ((campaignState.playerScrutiny - 40) / 100))
    : 1;
  const baseBuff = (5 + Math.random() * 5) * ioMult;
  const buff = baseBuff * scrutinyPenalty;

  dists.forEach(d => { d.campaignBuffs.io += buff; });

  const diminishNote = scrutinyPenalty < 0.95 ? ` (scrutiny penalty: ×${scrutinyPenalty.toFixed(2)})` : '';
  campaignState.campaignLog.push({
    week: campaignState.currentWeek, type: "io",
    message: `IO campaign in ${REGIONS[region]} (+${buff.toFixed(1)} IO buff, scrutiny +${scrutinyGain}, cost ฿${cost}M)${diminishNote}`
  });

  return { success: true, buff, districts: dists.length, region: REGIONS[region], scrutinyPenalty };
}

/**
 * Player deploys Ban Yai (local boss network) in a specific district
 * HIGH RISK: adds scrutiny, but guarantees strong constituency performance
 */
function actionBanYai(districtId) {
  if (campaignState.actionPointsRemaining <= 0) return { success: false, message: "No action points remaining." };
  const ds = getDiffScale();
  const cost = Math.round(120 * ds.costMult);
  if (campaignState.playerFunds < cost) return { success: false, message: "Insufficient funds." };

  const dist = getDistrictById(districtId);
  if (!dist) return { success: false, message: "District not found." };

  campaignState.playerFunds -= cost;
  campaignState.actionPointsRemaining--;
  const scrutinyGain = Math.round(10 * ds.scrutinyMult);
  campaignState.playerScrutiny = Math.min(100, campaignState.playerScrutiny + scrutinyGain);

  const bonus = 25 + Math.random() * 15;
  dist.banYaiBonus += bonus;
  dist.banYaiOwner = campaignState.playerPartyId;

  campaignState.campaignLog.push({
    week: campaignState.currentWeek, type: "ban_yai",
    message: `Deployed Ban Yai in ${dist.displayName} (+${bonus.toFixed(0)} bonus, scrutiny +${scrutinyGain}, cost ฿${cost}M)`
  });

  return { success: true, bonus, district: dist.displayName };
}

/**
 * Player fundraises (gain funds, increase scrutiny slightly)
 */
function actionFundraise() {
  if (campaignState.actionPointsRemaining <= 0) return { success: false, message: "No action points remaining." };

  const ds = getDiffScale();
  const amount = Math.round((100 + Math.floor(Math.random() * 150)) * ds.fundsReturnMult);
  campaignState.playerFunds += amount;
  campaignState.actionPointsRemaining--;
  const scrutinyGain = Math.round(2 * ds.scrutinyMult);
  campaignState.playerScrutiny = Math.min(100, campaignState.playerScrutiny + scrutinyGain);

  campaignState.campaignLog.push({
    week: campaignState.currentWeek, type: "fundraise",
    message: `Fundraising event raised ฿${amount}M (scrutiny +${scrutinyGain})`
  });

  return { success: true, amount };
}


// ── Lobbyist Random Events (NEW — Part 2) ────────────────────────

/**
 * LOBBYIST_EVENTS — Random events that can trigger each day.
 * Lobbyists offer deals: funds in exchange for scrutiny, or
 * opportunities that cost money but reduce scrutiny.
 */
const LOBBYIST_EVENTS = [
  {
    id: "tycoon_donation",
    title: "🏗️ Tycoon Donation Offer",
    description: "A real estate mogul offers a generous campaign donation. The media may notice.",
    choices: [
      { label: "Accept the donation", effects: { funds: 200, scrutiny: 8 }, risk: "High scrutiny" },
      { label: "Decline politely", effects: { funds: 0, scrutiny: -2 }, risk: "None" }
    ]
  },
  {
    id: "media_interview",
    title: "📺 Prime-Time Interview Invitation",
    description: "A major TV network offers a live interview slot. Great exposure, but risky.",
    choices: [
      { label: "Accept the interview", effects: { pollBoost: 3, scrutiny: 5 }, risk: "Scrutiny increase" },
      { label: "Send a deputy instead", effects: { pollBoost: 1, scrutiny: 0 }, risk: "Smaller impact" }
    ]
  },
  {
    id: "grassroots_surge",
    title: "✊ Grassroots Volunteer Surge",
    description: "A wave of enthusiastic volunteers offers to help your campaign for free.",
    choices: [
      { label: "Deploy them in key provinces", effects: { rallyBoost: 12, funds: -20 }, risk: "Small cost" },
      { label: "Hold a coordinated rally", effects: { rallyBoost: 8, scrutiny: 2 }, risk: "Media attention" }
    ]
  },
  {
    id: "scandal_rumor",
    title: "⚠️ Opposition Scandal Leak",
    description: "An informant offers evidence of corruption in a rival party. Using it is risky.",
    choices: [
      { label: "Leak it to the press", effects: { rivalPenalty: 5, scrutiny: 10 }, risk: "Extreme scrutiny" },
      { label: "File it for later", effects: { scrutiny: 0 }, risk: "None" }
    ]
  },
  {
    id: "ec_warning",
    title: "🔍 EC Compliance Warning",
    description: "The Election Commission flags irregularities in your finance reports.",
    choices: [
      { label: "Hire forensic accountants", effects: { funds: -80, scrutiny: -10 }, risk: "Costly" },
      { label: "Ignore and hope for the best", effects: { scrutiny: 15 }, risk: "Very high scrutiny" }
    ]
  }
];

/**
 * rollLobbyistEvent() — Called each day. Has a chance to trigger
 * a random lobbyist event.
 *
 * @param {number} triggerChance — % chance per day (default: 20%)
 * @returns {Object|null} Event object if triggered, null otherwise
 */
function rollLobbyistEvent(triggerChance = 20) {
  const ds = getDiffScale();
  const adjustedChance = triggerChance * ds.lobbyChanceMult;
  if (Math.random() * 100 > adjustedChance) return null;

  const event = LOBBYIST_EVENTS[Math.floor(Math.random() * LOBBYIST_EVENTS.length)];
  console.log(`[campaign/engine.js] Lobbyist event triggered: ${event.title} (chance: ${adjustedChance.toFixed(0)}%)`);
  return { ...event };
}

/**
 * applyLobbyistChoice() — Applies the effects of a lobbyist event choice.
 *
 * @param {Object} choice — The choice object from LOBBYIST_EVENTS
 * @returns {Object} Result with applied effects
 */
function applyLobbyistChoice(choice) {
  if (!choice || !choice.effects) return { error: "Invalid choice." };

  const effects = choice.effects;
  const results = {};

  if (effects.funds) {
    campaignState.playerFunds += effects.funds;
    results.funds = effects.funds;
  }
  if (effects.scrutiny) {
    campaignState.playerScrutiny = clampVal(campaignState.playerScrutiny + effects.scrutiny, 0, 100);
    results.scrutiny = effects.scrutiny;
  }
  if (effects.pollBoost) {
    // Boost player's national poll share
    const pid = campaignState.playerPartyId;
    campaignState.nationalPollShare[pid] = Math.min(50,
      (campaignState.nationalPollShare[pid] || 20) + effects.pollBoost);
    results.pollBoost = effects.pollBoost;
  }
  if (effects.rallyBoost) {
    // Apply rally boost to random districts
    const shuffled = shuffleArray(DISTRICTS);
    const count = Math.min(10, shuffled.length);
    for (let i = 0; i < count; i++) {
      shuffled[i].campaignBuffs.rally += effects.rallyBoost;
    }
    results.rallyBoost = effects.rallyBoost;
  }
  if (effects.rivalPenalty) {
    // Reduce a random rival's poll share
    const rivals = CAMPAIGN_PARTIES.filter(p => p.id !== campaignState.playerPartyId);
    const target = rivals[Math.floor(Math.random() * rivals.length)];
    if (target) {
      campaignState.nationalPollShare[target.id] = Math.max(3,
        (campaignState.nationalPollShare[target.id] || 15) - effects.rivalPenalty);
      results.rivalPenalty = { target: target.shortName, amount: effects.rivalPenalty };
    }
  }

  campaignState.campaignLog.push({
    week: campaignState.currentWeek,
    type: "lobbyist",
    message: `Event: ${choice.label} — ${JSON.stringify(results)}`
  });

  return { success: true, applied: results };
}


// ──────────────────────────────────────────────────────────────────
// SECTION 2: runElection()
// Simulates 400 constituency races + 100 party-list seats
// ──────────────────────────────────────────────────────────────────

/**
 * Main election function.
 * 1) Runs 400 constituency seats (FPTP — highest score wins)
 * 2) Runs 100 party-list seats (Largest Remainder Method)
 * 3) Stores results in campaignState
 *
 * BAN YAI MECHANIC:
 *   - Ban Yai bonus ADDS to constituency score (helps win the seat)
 *   - Ban Yai bonus SUBTRACTS from national party-list tally
 *     (corrupt local operations turn off ideological voters nationally)
 *
 * @returns {Object} Full election results
 */
function runElection() {
  const results = {
    constituency: {},    // partyId → { seats, districtWins[] }
    partyList: {},       // partyId → { seats, votes, quota, remainder }
    total: {},           // partyId → total seats
    districtDetails: [], // per-district breakdown
    banYaiPenalties: {}, // partyId → total ban yai penalty
    playerSeats: 0,
    timestamp: Date.now()
  };

  // Initialize result containers
  CAMPAIGN_PARTIES.forEach(p => {
    results.constituency[p.id] = { seats: 0, districtWins: [] };
    results.partyList[p.id] = { seats: 0, votes: 0, quota: 0, remainder: 0 };
    results.total[p.id] = 0;
    results.banYaiPenalties[p.id] = 0;
  });

  // ═══════════════════════════════════════════════════════════
  // PHASE 1: 400 CONSTITUENCY SEATS (First Past the Post)
  // ═══════════════════════════════════════════════════════════

  DISTRICTS.forEach(district => {
    const scores = {};

    CAMPAIGN_PARTIES.forEach(party => {
      // 1. Base lean score (political lean of the district)
      let score = district.politicalLean[party.id] || 15;

      // 2. Campaign buff bonuses (only for the party that campaigned)
      if (party.id === campaignState.playerPartyId) {
        score += (district.campaignBuffs.rally || 0) * 0.8;
        score += (district.campaignBuffs.canvass || 0) * 1.0;
        score += (district.campaignBuffs.io || 0) * 0.6;
        score += (district.campaignBuffs.infrastructure || 0) * 0.5;
        score += (district.campaignBuffs.policy || 0) * 0.7;
      }

      // 3. Ban Yai bonus (ONLY for the party that owns Ban Yai here)
      if (district.banYaiOwner === party.id) {
        score += district.banYaiBonus;
        // Track penalty for party-list deduction
        results.banYaiPenalties[party.id] += district.banYaiBonus * 0.5;
      }

      // 4. Party's regional strength modifier
      const regionStr = party.regionalStrength[district.region] || 15;
      score += regionStr * 0.3;

      // 5. Candidate quality (assign best MP for this party in this district)
      const roster = partyRosters[party.id];
      if (roster && roster.length > 0) {
        const mpIdx = district.globalIndex % roster.length;
        const mp = roster[mpIdx];
        if (mp) {
          score += (mp.localInfluence * 0.15) + (mp.charisma * 0.1);
        }
      }

      // 6. National poll share influence
      const nationShare = campaignState.nationalPollShare[party.id] || 15;
      score += nationShare * 0.2;

      // 7. Random variance (election uncertainty, ±8)
      score += (Math.random() - 0.5) * 16;

      // 8. Scrutiny penalty (only for player) — amplified by difficulty
      if (party.id === campaignState.playerPartyId) {
        const _ds = getDiffScale();
        score -= campaignState.playerScrutiny * 0.1 * _ds.electionScrutinyMult;
      }

      scores[party.id] = Math.max(0, score);
    });

    // Winner = highest score
    let winnerId = null;
    let highScore = -1;
    for (const pid in scores) {
      if (scores[pid] > highScore) {
        highScore = scores[pid];
        winnerId = pid;
      }
    }

    results.constituency[winnerId].seats++;
    results.constituency[winnerId].districtWins.push(district.id);

    results.districtDetails.push({
      districtId: district.id,
      provinceName: district.provinceName,
      displayName: district.displayName,
      winner: winnerId,
      scores: { ...scores },
      margin: highScore - Object.values(scores).sort((a, b) => b - a)[1],
      banYaiUsed: district.banYaiBonus > 0
    });
  });

  // ═══════════════════════════════════════════════════════════
  // PHASE 2: 100 PARTY-LIST SEATS (Largest Remainder Method)
  // ═══════════════════════════════════════════════════════════

  // Calculate national party-list votes for each party
  let totalPartyListVotes = 0;

  CAMPAIGN_PARTIES.forEach(party => {
    // Base votes from national poll share and party-list strength
    const pollShare = campaignState.nationalPollShare[party.id] || 15;
    const plStrength = party.partyListStrength || 15;
    let votes = ((pollShare + plStrength) / 2) * 100000;

    // SUBTRACT Ban Yai penalty from party-list votes
    // (corrupt local politics reduces national ideological vote)
    const penalty = results.banYaiPenalties[party.id] || 0;
    votes -= penalty * 800;
    votes = Math.max(votes * 0.1, votes); // never drops below 10% floor

    results.partyList[party.id].votes = Math.round(votes);
    totalPartyListVotes += Math.round(votes);
  });

  // Largest Remainder Method
  const quota = totalPartyListVotes / PARTY_LIST_SEATS;
  let seatsAllocated = 0;
  const remainders = [];

  CAMPAIGN_PARTIES.forEach(party => {
    const votes = results.partyList[party.id].votes;
    const autoSeats = Math.floor(votes / quota);
    const remainder = votes - (autoSeats * quota);

    results.partyList[party.id].seats = autoSeats;
    results.partyList[party.id].quota = Math.round(quota);
    results.partyList[party.id].remainder = Math.round(remainder);
    seatsAllocated += autoSeats;

    remainders.push({ partyId: party.id, remainder });
  });

  // Distribute remaining seats by largest remainder
  remainders.sort((a, b) => b.remainder - a.remainder);
  let remainingSeats = PARTY_LIST_SEATS - seatsAllocated;

  for (let i = 0; i < remainingSeats && i < remainders.length; i++) {
    results.partyList[remainders[i].partyId].seats++;
  }

  // ═══════════════════════════════════════════════════════════
  // PHASE 3: TOTAL SEATS
  // ═══════════════════════════════════════════════════════════

  CAMPAIGN_PARTIES.forEach(party => {
    const total = results.constituency[party.id].seats + results.partyList[party.id].seats;
    results.total[party.id] = total;
    campaignState.constituencySeats[party.id] = results.constituency[party.id].seats;
    campaignState.partyListSeats[party.id] = results.partyList[party.id].seats;
    campaignState.totalSeats[party.id] = total;
  });

  results.playerSeats = results.total[campaignState.playerPartyId] || 0;
  campaignState.electionHeld = true;
  campaignState.electionResults = results;

  return results;
}


// ──────────────────────────────────────────────────────────────────
// SECTION 3: coalitionPhase()
// AI parties decide whether to join the player's coalition
// ──────────────────────────────────────────────────────────────────

/** Ministry definitions — AI parties demand these based on seat share */
const MINISTRIES = [
  { id: "defense", name: "Ministry of Defence", prestige: 10 },
  { id: "finance", name: "Ministry of Finance", prestige: 9 },
  { id: "interior", name: "Ministry of Interior", prestige: 9 },
  { id: "foreign", name: "Ministry of Foreign Affairs", prestige: 8 },
  { id: "commerce", name: "Ministry of Commerce", prestige: 7 },
  { id: "education", name: "Ministry of Education", prestige: 7 },
  { id: "transport", name: "Ministry of Transport", prestige: 7 },
  { id: "agriculture", name: "Ministry of Agriculture", prestige: 6 },
  { id: "health", name: "Ministry of Public Health", prestige: 6 },
  { id: "energy", name: "Ministry of Energy", prestige: 6 },
  { id: "digital", name: "Ministry of Digital Economy", prestige: 5 },
  { id: "labor", name: "Ministry of Labour", prestige: 5 },
  { id: "tourism", name: "Ministry of Tourism & Sports", prestige: 5 },
  { id: "justice", name: "Ministry of Justice", prestige: 5 },
  { id: "culture", name: "Ministry of Culture", prestige: 4 },
  { id: "social", name: "Ministry of Social Development", prestige: 4 },
  { id: "natural_resources", name: "Ministry of Natural Resources", prestige: 4 },
  { id: "higher_ed", name: "Ministry of Higher Education", prestige: 4 },
];

/**
 * Runs the coalition formation phase.
 * AI parties evaluate whether to join based on:
 *   - Ideology compatibility
 *   - Seats contributed (proportional ministry demands)
 *   - Whether the player is the largest party
 *
 * @returns {Object} Coalition options with demands
 */
function coalitionPhase() {
  const results = campaignState.electionResults;
  if (!results) return { error: "Election not yet held." };

  const playerPartyId = campaignState.playerPartyId;
  const playerSeats = results.total[playerPartyId];

  // Sort parties by seat count (descending)
  const sortedParties = CAMPAIGN_PARTIES
    .map(p => ({ ...p, seats: results.total[p.id] }))
    .sort((a, b) => b.seats - a.seats);

  const isLargestParty = sortedParties[0].id === playerPartyId;

  // If player is NOT the largest party, coalition is harder
  const coalitionOffers = [];

  CAMPAIGN_PARTIES.forEach(party => {
    if (party.id === playerPartyId) return;

    const partySeats = results.total[party.id];
    if (partySeats === 0) return;

    // Ideology compatibility score
    const playerParty = CAMPAIGN_PARTIES.find(p => p.id === playerPartyId);
    const compat = calculateIdeologyCompat(playerParty.ideology, party.ideology);

    // Willingness to join (0-100)
    let willingness = 50;
    willingness += compat * 20;
    willingness += isLargestParty ? 15 : -10;
    willingness += playerSeats > partySeats ? 10 : -5;

    // Parties with many seats are harder to recruit
    if (partySeats > 100) willingness -= 10;

    // Royalist party very unlikely to join progressive
    if (party.ideology === "royalist" && playerParty.ideology === "progressive") {
      willingness -= 30;
    }
    // Centrist party joins anyone
    if (party.ideology === "centrist") willingness += 15;

    willingness = clampVal(willingness, 5, 95);

    // Ministry demands: proportional to seats contributed
    const seatRatio = partySeats / TOTAL_SEATS;
    const ministriesWanted = Math.max(1, Math.ceil(seatRatio * MINISTRIES.length));

    // Pick most prestigious ministries they want
    const demands = MINISTRIES
      .filter(m => {
        // Filter by ideology preference
        if (party.ideology === "royalist") return ["defense", "interior", "justice"].includes(m.id) || m.prestige >= 6;
        if (party.ideology === "populist") return ["commerce", "agriculture", "transport", "health"].includes(m.id) || m.prestige >= 6;
        if (party.ideology === "progressive") return ["education", "digital", "justice", "foreign"].includes(m.id) || m.prestige >= 7;
        if (party.ideology === "regional") return ["interior", "agriculture", "education", "natural_resources"].includes(m.id) || m.prestige >= 5;
        return m.prestige >= 5;
      })
      .slice(0, ministriesWanted)
      .map(m => m.name);

    // Special conditions
    const conditions = [];
    if (party.ideology === "royalist") conditions.push("No constitutional reform agenda");
    if (party.ideology === "populist") conditions.push("Must implement rural subsidy program");
    if (party.ideology === "regional") conditions.push("Provincial autonomy bill within Year 1");
    if (party.ideology === "centrist") conditions.push("Infrastructure mega-project commitment");

    coalitionOffers.push({
      partyId: party.id,
      partyName: party.name,
      shortName: party.shortName,
      color: party.color,
      ideology: party.ideology,
      seats: partySeats,
      willingness: Math.round(willingness),
      ministryDemands: demands,
      conditions: conditions,
      accepted: false,
      rejected: false
    });
  });

  // Sort by willingness descending
  coalitionOffers.sort((a, b) => b.willingness - a.willingness);

  campaignState.coalitionOffers = coalitionOffers;

  return {
    playerSeats,
    isLargestParty,
    targetSeats: MAJORITY_THRESHOLD,
    seatsNeeded: Math.max(0, MAJORITY_THRESHOLD - playerSeats),
    offers: coalitionOffers
  };
}

/**
 * Returns ideology compatibility (-1 to 1)
 */
function calculateIdeologyCompat(ideology1, ideology2) {
  const matrix = {
    progressive:  { progressive: 1, populist: 0.3, centrist: 0.1, regional: 0.2, royalist: -0.8 },
    populist:     { progressive: 0.3, populist: 1, centrist: 0.4, regional: 0.3, royalist: -0.3 },
    royalist:     { progressive: -0.8, populist: -0.3, centrist: 0.3, regional: 0.1, royalist: 1 },
    centrist:     { progressive: 0.1, populist: 0.4, centrist: 1, regional: 0.3, royalist: 0.3 },
    regional:     { progressive: 0.2, populist: 0.3, centrist: 0.3, regional: 1, royalist: 0.1 }
  };
  return (matrix[ideology1] && matrix[ideology1][ideology2]) || 0;
}

/**
 * Player accepts a coalition partner
 */
function acceptCoalitionPartner(partyId) {
  const offer = campaignState.coalitionOffers.find(o => o.partyId === partyId);
  if (!offer) return { success: false, message: "No offer from this party." };

  // Check willingness — roll the dice
  const roll = Math.random() * 100;
  if (roll > offer.willingness) {
    offer.rejected = true;
    return {
      success: false,
      message: `${offer.partyName} refused to join! (Willingness: ${offer.willingness}%, Roll: ${Math.round(roll)}%)`
    };
  }

  offer.accepted = true;
  campaignState.coalitionPartners.push(partyId);

  // Recalculate coalition seats
  recalcCoalitionSeats();

  return {
    success: true,
    message: `${offer.partyName} joins the coalition! (+${offer.seats} seats)`,
    totalCoalitionSeats: campaignState.coalitionSeats
  };
}

/**
 * Player rejects a coalition partner
 */
function rejectCoalitionPartner(partyId) {
  const offer = campaignState.coalitionOffers.find(o => o.partyId === partyId);
  if (!offer) return { success: false };
  offer.rejected = true;
  return { success: true, message: `Declined alliance with ${offer.partyName}.` };
}

/**
 * Recalculates total coalition seats
 */
function recalcCoalitionSeats() {
  let total = campaignState.totalSeats[campaignState.playerPartyId] || 0;
  campaignState.coalitionPartners.forEach(pid => {
    total += campaignState.totalSeats[pid] || 0;
  });
  campaignState.coalitionSeats = total;
  return total;
}


// ──────────────────────────────────────────────────────────────────
// SECTION 4: checkWinLoss()
// Determines if player forms government or becomes opposition
// ──────────────────────────────────────────────────────────────────

/**
 * Checks the coalition outcome.
 *
 * WIN:  Coalition >= 251 seats → winGame() → redirect to governing module
 * LOSS: Coalition <  251 seats → becomeOpposition() → fast-forward 4 years, replay
 *
 * @returns {Object} { result: "victory"|"opposition", seats, needed }
 */
function checkWinLoss() {
  recalcCoalitionSeats();

  const coalitionSeats = campaignState.coalitionSeats;
  const needed = MAJORITY_THRESHOLD;

  if (coalitionSeats >= needed) {
    campaignState.gameResult = "victory";
    return {
      result: "victory",
      seats: coalitionSeats,
      needed: needed,
      surplus: coalitionSeats - needed,
      message: `🏛️ VICTORY! Your coalition has ${coalitionSeats} seats — a clear majority of ${coalitionSeats - needed} above the ${needed}-seat threshold. You will form the next government of Thailand!`
    };
  } else {
    campaignState.gameResult = "opposition";
    return {
      result: "opposition",
      seats: coalitionSeats,
      needed: needed,
      deficit: needed - coalitionSeats,
      message: `📉 DEFEAT. Your coalition has only ${coalitionSeats} seats — ${needed - coalitionSeats} short of the ${needed}-seat majority. You are banished to the opposition benches.`
    };
  }
}

/**
 * WIN: Redirect to the governing module
 * Stores election results in sessionStorage for the main-game to consume
 */
function winGame() {
  // Package election data for the governing module
  const handoff = {
    electionYear: campaignState.electionYear,
    playerPartyId: campaignState.playerPartyId,
    coalitionPartners: campaignState.coalitionPartners,
    totalSeats: { ...campaignState.totalSeats },
    coalitionSeats: campaignState.coalitionSeats,
    constituencySeats: { ...campaignState.constituencySeats },
    partyListSeats: { ...campaignState.partyListSeats },
    playerScrutiny: campaignState.playerScrutiny,
    timestamp: Date.now()
  };

  try {
    sessionStorage.setItem("tps_election_handoff", JSON.stringify(handoff));
  } catch (e) {
    console.warn("Could not save handoff data:", e);
  }

  // Redirect to the governing module
  window.location.href = "../main-game/index.html";
}

/**
 * LOSS: Fast-forward 4 years, reset campaign, loop back to Week 1
 * The player becomes opposition for one term, then tries again
 */
function becomeOpposition() {
  // Fast-forward election year by 4
  const newYear = campaignState.electionYear + 4;

  campaignState.campaignLog.push({
    week: campaignState.currentWeek,
    type: "opposition",
    message: `Entered opposition. Fast-forwarding to ${newYear} election...`
  });

  // Reset campaign state but keep party choice
  const playerPartyId = campaignState.playerPartyId;
  initCampaignState(playerPartyId);

  // Set new election year
  campaignState.electionYear = newYear;

  // Slightly randomize party stats for the new cycle
  CAMPAIGN_PARTIES.forEach(p => {
    const drift = (Math.random() - 0.5) * 8;
    campaignState.nationalPollShare[p.id] = clampVal(
      campaignState.nationalPollShare[p.id] + drift, 5, 45
    );
  });

  // Regenerate all MP rosters for the new election
  generateAllPartyMPs();

  // Reset all district campaign data
  DISTRICTS.forEach(d => {
    d.banYaiBonus = 0;
    d.banYaiOwner = null;
    d.campaignBuffs = { rally: 0, canvass: 0, io: 0, infrastructure: 0, policy: 0 };
    d.isTargeted = false;
    d.visitCount = 0;
  });

  return {
    newYear: newYear,
    message: `It is now ${newYear}. A new election campaign begins. You have 8 weeks to win ${MAJORITY_THRESHOLD} seats.`
  };
}


// ──────────────────────────────────────────────────────────────────
// SECTION 5: ELECTION SUMMARY HELPERS
// ──────────────────────────────────────────────────────────────────

/**
 * Returns a formatted summary of election results
 */
function getElectionSummary() {
  if (!campaignState.electionResults) return null;
  const r = campaignState.electionResults;

  return CAMPAIGN_PARTIES.map(p => ({
    partyId: p.id,
    partyName: p.name,
    shortName: p.shortName,
    color: p.color,
    constituencySeats: r.constituency[p.id].seats,
    partyListSeats: r.partyList[p.id].seats,
    totalSeats: r.total[p.id],
    partyListVotes: r.partyList[p.id].votes,
    banYaiPenalty: Math.round(r.banYaiPenalties[p.id]),
    isPlayer: p.id === campaignState.playerPartyId,
    inCoalition: campaignState.coalitionPartners.includes(p.id) || p.id === campaignState.playerPartyId
  })).sort((a, b) => b.totalSeats - a.totalSeats);
}

/**
 * Gets the top contested districts (closest margins)
 */
function getContestedDistricts(limit = 20) {
  if (!campaignState.electionResults) return [];
  return campaignState.electionResults.districtDetails
    .sort((a, b) => a.margin - b.margin)
    .slice(0, limit);
}

/**
 * Gets districts won by a specific party
 */
function getDistrictsWonByParty(partyId) {
  if (!campaignState.electionResults) return [];
  return campaignState.electionResults.districtDetails
    .filter(d => d.winner === partyId);
}



// ═══════════════════════════════════════════════════════════════════
// STEP 3 FIX: PERSISTENT CAMPAIGN SAVE/LOAD
// Uses localStorage (survives tab closes) instead of sessionStorage alone.
// Ensures campaign timeline + stats survive parliament round-trips.
// ═══════════════════════════════════════════════════════════════════

/**
 * saveCampaignState() — Bundles ALL campaign variables into a single
 * JSON object and saves to localStorage.
 *
 * MUST be called:
 *   - Before navigating to /parliament-test/
 *   - After each state-changing action (rally, next day, etc.)
 *   - On any dashboard render (via _saveCampaignToStorage in main.js)
 */
function saveCampaignState() {
  if (!campaignState) {
    console.warn('[campaign/engine.js] No campaignState to save.');
    return;
  }

  try {
    const saveData = {
      // Full campaign state (deep copy to avoid reference issues)
      state: JSON.parse(JSON.stringify(campaignState)),

      // Calendar position (CampaignCalendar is a separate object)
      calendarDay: (typeof CampaignCalendar !== 'undefined') ? CampaignCalendar.currentDay : 1,

      // Player selections (needed to rebuild UI)
      playerPartyId: campaignState.playerPartyId,
      difficulty: (typeof TPSGlobalState !== 'undefined') ? TPSGlobalState.difficulty : 'normal',

      // Timestamp for debugging
      savedAt: Date.now()
    };

    localStorage.setItem('tps_campaign_save', JSON.stringify(saveData));
    console.log(`[campaign/engine.js] Campaign saved — Day ${saveData.calendarDay}, Week ${campaignState.currentWeek}, Funds ${campaignState.playerFunds}`);
  } catch (e) {
    console.warn('[campaign/engine.js] Could not save campaign state:', e);
  }
}

/**
 * loadCampaignState() — Restores campaign progress from localStorage.
 * Must be called during boot IF the player is returning to the dashboard.
 *
 * FLOW:
 *   1. Reads 'tps_campaign_save' from localStorage
 *   2. If valid, calls initCampaignState() with the saved partyId
 *   3. Overwrites the fresh state with the saved state
 *   4. Restores CampaignCalendar.currentDay
 *   5. Returns true if restore succeeded
 *
 * @returns {boolean} true if state was restored
 */
function loadCampaignState() {
  try {
    const raw = localStorage.getItem('tps_campaign_save');
    if (!raw) {
      console.log('[campaign/engine.js] No saved campaign data in localStorage.');
      return false;
    }

    const saveData = JSON.parse(raw);
    if (!saveData.state || !saveData.playerPartyId) {
      console.warn('[campaign/engine.js] Saved data is incomplete — ignoring.');
      return false;
    }

    // 1. Initialize with the saved party (builds MP roster, sets defaults)
    initCampaignState(saveData.playerPartyId);

    // 2. Overwrite with saved state (funds, scrutiny, poll shares, log, etc.)
    Object.assign(campaignState, saveData.state);

    // 3. Restore calendar day
    if (typeof CampaignCalendar !== 'undefined' && saveData.calendarDay) {
      CampaignCalendar.currentDay = saveData.calendarDay;
    }

    // 4. Restore difficulty
    if (saveData.difficulty && typeof TPSGlobalState !== 'undefined') {
      TPSGlobalState.difficulty = saveData.difficulty;
    }

    console.log(`[campaign/engine.js] Campaign loaded — Day ${saveData.calendarDay}, Week ${campaignState.currentWeek}, Funds ${campaignState.playerFunds}`);
    return true;
  } catch (e) {
    console.warn('[campaign/engine.js] Could not load campaign state:', e);
    return false;
  }
}

/**
 * clearCampaignSave() — Removes the persistent save from localStorage.
 * Call on: game over, election held, or explicit wipe.
 */
function clearCampaignSave() {
  localStorage.removeItem('tps_campaign_save');
  console.log('[campaign/engine.js] Campaign save cleared.');
}


console.log("[campaign/engine.js] Loaded successfully.");
console.log("  → Election engine ready (400 constituency + 100 party-list)");
console.log("  → Coalition phase with 18 ministries");
console.log("  → Win/Loss loop: 251-seat majority threshold");
console.log("  → Save/Load functions ready (localStorage)");
