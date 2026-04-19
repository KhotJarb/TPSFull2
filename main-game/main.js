// ============================================================
// THAILAND POLITICAL SIMULATION (TPS) — main.js
// UI Binding: DOM manipulation, event listeners, game loop
// ============================================================

// ─── DOM ELEMENT REFERENCES ─────────────────────────────────
const DOM = {
  // Screens
  startScreen: document.getElementById("start-screen"),
  gameScreen: document.getElementById("game-screen"),
  gameoverScreen: document.getElementById("gameover-screen"),

  // Start screen
  btnNewGame: document.getElementById("btn-new-game"),
  btnLoadGame: document.getElementById("btn-load-game"),

  // Header
  turnNumber: document.getElementById("turn-number"),
  turnDate: document.getElementById("turn-date"),
  btnSave: document.getElementById("btn-save"),
  btnMenu: document.getElementById("btn-menu"),

  // Status bar
  valPopularity: document.getElementById("val-popularity"),
  valBudget: document.getElementById("val-budget"),
  valGrowth: document.getElementById("val-growth"),
  valUnrest: document.getElementById("val-unrest"),
  valMilitary: document.getElementById("val-military"),
  valCoalition: document.getElementById("val-coalition"),
  barPopularity: document.getElementById("bar-popularity"),
  barBudget: document.getElementById("bar-budget"),
  barGrowth: document.getElementById("bar-growth"),
  barUnrest: document.getElementById("bar-unrest"),
  barMilitary: document.getElementById("bar-military"),
  barCoalition: document.getElementById("bar-coalition"),
  statPopularity: document.getElementById("stat-popularity"),
  statBudget: document.getElementById("stat-budget"),
  statUnrest: document.getElementById("stat-unrest"),
  statMilitary: document.getElementById("stat-military"),
  coalitionSeatsBadge: document.getElementById("coalition-seats-badge"),

  // Parliament
  parliamentChart: document.getElementById("parliament-chart"),
  partyList: document.getElementById("party-list"),

  // Main content panels
  warningTicker: document.getElementById("warning-ticker"),
  warningText: document.getElementById("warning-text"),
  crisisPanel: document.getElementById("crisis-panel"),
  crisisTurn: document.getElementById("crisis-turn"),
  crisisTitle: document.getElementById("crisis-title"),
  crisisDescription: document.getElementById("crisis-description"),
  crisisChoices: document.getElementById("crisis-choices"),
  outcomePanel: document.getElementById("outcome-panel"),
  outcomeText: document.getElementById("outcome-text"),
  outcomeEffects: document.getElementById("outcome-effects"),
  btnEndTurn: document.getElementById("btn-end-turn"),
  reportPanel: document.getElementById("report-panel"),
  reportTurn: document.getElementById("report-turn"),
  reportStats: document.getElementById("report-stats"),
  reportLaws: document.getElementById("report-laws"),
  reportWarnings: document.getElementById("report-warnings"),
  btnNextMonth: document.getElementById("btn-next-month"),
  idlePanel: document.getElementById("idle-panel"),
  btnStartMonth: document.getElementById("btn-start-month"),
  votePanel: document.getElementById("vote-panel"),
  voteResultBadge: document.getElementById("vote-result-badge"),
  voteLawName: document.getElementById("vote-law-name"),
  tallyYes: document.getElementById("tally-yes"),
  tallyNo: document.getElementById("tally-no"),
  tallyYesLabel: document.getElementById("tally-yes-label"),
  tallyNoLabel: document.getElementById("tally-no-label"),
  votePartyBreakdown: document.getElementById("vote-party-breakdown"),
  voteMessage: document.getElementById("vote-message"),
  btnCloseVote: document.getElementById("btn-close-vote"),

  // Laws
  lawsList: document.getElementById("laws-list"),

  // Event log
  eventLog: document.getElementById("event-log"),

  // Game over
  gameoverIcon: document.getElementById("gameover-icon"),
  gameoverTitle: document.getElementById("gameover-title"),
  gameoverReason: document.getElementById("gameover-reason"),
  victoryScore: document.getElementById("victory-score"),
  victoryGrade: document.getElementById("victory-grade"),
  victoryTitleText: document.getElementById("victory-title-text"),
  scoreBreakdown: document.getElementById("score-breakdown"),
  goMonths: document.getElementById("go-months"),
  goLaws: document.getElementById("go-laws"),
  goApproval: document.getElementById("go-approval"),
  btnRestart: document.getElementById("btn-restart"),

  // Modal
  modalOverlay: document.getElementById("modal-overlay"),
  modalBox: document.getElementById("modal-box"),
  modalContent: document.getElementById("modal-content"),
  modalClose: document.getElementById("modal-close"),

  // Toast
  toastContainer: document.getElementById("toast-container")
};

// ─── SCREEN MANAGEMENT ──────────────────────────────────────

function showScreen(screenId) {
  [DOM.startScreen, DOM.gameScreen, DOM.gameoverScreen].forEach(s => {
    s.classList.remove("active");
  });
  document.getElementById(screenId).classList.add("active");
}

// ─── TOAST NOTIFICATIONS ────────────────────────────────────

function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  DOM.toastContainer.appendChild(toast);
  setTimeout(() => {
    if (toast.parentNode) toast.parentNode.removeChild(toast);
  }, 3000);
}

// ─── MODAL ──────────────────────────────────────────────────

function showModal(htmlContent) {
  DOM.modalContent.innerHTML = htmlContent;
  DOM.modalOverlay.style.display = "flex";
}

function hideModal() {
  DOM.modalOverlay.style.display = "none";
  DOM.modalContent.innerHTML = "";
}

// ─── UPDATE STATUS BAR ──────────────────────────────────────

function updateStatusBar() {
  // Popularity
  DOM.valPopularity.textContent = `${Math.round(gameState.popularity)}%`;
  DOM.barPopularity.style.width = `${gameState.popularity}%`;

  // Budget
  const budgetDisplay = gameState.budget >= 0
    ? `฿${gameState.budget.toLocaleString()}B`
    : `-฿${Math.abs(gameState.budget).toLocaleString()}B`;
  DOM.valBudget.textContent = budgetDisplay;
  DOM.barBudget.style.width = `${clamp(gameState.budget / 20, 0, 100)}%`;

  // Growth
  DOM.valGrowth.textContent = `${gameState.growth}%`;
  DOM.barGrowth.style.width = `${clamp(gameState.growth * 10, 0, 100)}%`;

  // Unrest
  DOM.valUnrest.textContent = `${Math.round(gameState.unrest)}%`;
  DOM.barUnrest.style.width = `${gameState.unrest}%`;

  // Military Patience
  DOM.valMilitary.textContent = Math.round(gameState.militaryPatience);
  DOM.barMilitary.style.width = `${gameState.militaryPatience}%`;

  // Coalition Stability
  DOM.valCoalition.textContent = `${Math.round(gameState.coalitionStability)}%`;
  DOM.barCoalition.style.width = `${gameState.coalitionStability}%`;

  // Warning classes for unrest
  DOM.statUnrest.classList.remove("warning", "danger");
  if (gameState.unrest >= 70) {
    DOM.statUnrest.classList.add("danger");
  } else if (gameState.unrest >= 50) {
    DOM.statUnrest.classList.add("warning");
  }

  // Warning for budget
  DOM.statBudget.classList.remove("warning", "danger");
  if (gameState.budget < 100) {
    DOM.statBudget.classList.add("danger");
  } else if (gameState.budget < 300) {
    DOM.statBudget.classList.add("warning");
  }

  // Military patience reveal — becomes visible once it drops below 50
  if (gameState.militaryPatience < 50) {
    DOM.statMilitary.classList.remove("stat-hidden");
  } else {
    DOM.statMilitary.classList.add("stat-hidden");
  }

  // Update coalition seats
  const coalSeats = getCoalitionSeats();
  DOM.coalitionSeatsBadge.textContent = `${coalSeats} / ${PARLIAMENT_TOTAL_SEATS}`;
}

// ─── UPDATE HEADER ──────────────────────────────────────────

function updateHeader() {
  DOM.turnNumber.textContent = gameState.turn;
  DOM.turnDate.textContent = getTurnLabel(gameState.turn);
}

// ─── RENDER PARLIAMENT ──────────────────────────────────────

function renderParliament() {
  // Seat chart (proportional bar)
  DOM.parliamentChart.innerHTML = "";
  parties.forEach(party => {
    const pct = (party.seats / PARLIAMENT_TOTAL_SEATS) * 100;
    const seg = document.createElement("div");
    seg.className = "parliament-segment";
    seg.style.width = `${pct}%`;
    seg.style.backgroundColor = party.color;
    if (!party.inCoalition) {
      seg.style.opacity = "0.5";
      seg.style.backgroundImage = "repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(0,0,0,0.2) 3px, rgba(0,0,0,0.2) 6px)";
    }
    const tooltip = document.createElement("span");
    tooltip.className = "seg-tooltip";
    tooltip.textContent = `${party.shortName}: ${party.seats} seats`;
    seg.appendChild(tooltip);
    DOM.parliamentChart.appendChild(seg);
  });

  // Party cards
  DOM.partyList.innerHTML = "";
  parties.forEach(party => {
    const card = document.createElement("div");
    card.className = "party-card";

    const relationClass = party.relation > 10
      ? "relation-positive"
      : party.relation < -10
        ? "relation-negative"
        : "relation-neutral";

    const relationSign = party.relation > 0 ? "+" : "";

    card.innerHTML = `
      <div class="party-dot" style="background:${party.color}"></div>
      <div class="party-card-info">
        <div class="party-card-name">${party.name}</div>
        <div class="party-card-meta">
          ${party.inCoalition ? '<span class="party-coalition-badge">Coalition</span>' : '<span style="color:var(--text-muted);font-size:0.65rem">Opposition</span>'}
          · ${party.ideology}
        </div>
      </div>
      <div class="party-card-seats">${party.seats}</div>
      <div class="party-card-relation ${relationClass}">${relationSign}${party.relation}</div>
    `;

    DOM.partyList.appendChild(card);
  });
}

// ─── RENDER LAWS LIST ───────────────────────────────────────

function renderLaws() {
  DOM.lawsList.innerHTML = "";
  laws.forEach(law => {
    const card = document.createElement("div");
    card.className = `law-card ${law.passed ? "passed" : ""}`;
    card.id = `law-${law.id}`;

    card.innerHTML = `
      <div class="law-card-header">
        <span class="law-card-icon">${law.icon}</span>
        <span class="law-card-name">${law.name}</span>
        <span class="law-status ${law.passed ? "active" : "available"}">${law.passed ? "Active" : "Propose"}</span>
      </div>
      <div class="law-card-desc">${law.description}</div>
    `;

    card.addEventListener("click", () => handleLawClick(law.id));
    DOM.lawsList.appendChild(card);
  });
}

// ─── HANDLE LAW CLICK ───────────────────────────────────────

function handleLawClick(lawId) {
  const law = laws.find(l => l.id === lawId);
  if (!law) return;

  // Build effect preview
  const effectsHtml = Object.entries(law.effects)
    .map(([key, val]) => {
      const sign = val > 0 ? "+" : "";
      const cls = val > 0 ? "effect-positive" : "effect-negative";
      const label = key.charAt(0).toUpperCase() + key.slice(1);
      return `<span class="effect-chip ${cls}">${label}: ${sign}${val}</span>`;
    })
    .join(" ");

  const monthlyHtml = law.monthlyEffects
    ? Object.entries(law.monthlyEffects)
        .map(([key, val]) => {
          const sign = val > 0 ? "+" : "";
          const cls = val > 0 ? "effect-positive" : "effect-negative";
          const label = key.charAt(0).toUpperCase() + key.slice(1);
          return `<span class="effect-chip ${cls}">${label}: ${sign}${val}/mo</span>`;
        })
        .join(" ")
    : "";

  const action = law.passed ? "Repeal" : "Propose";
  const actionClass = law.passed ? "btn-danger" : "btn-primary";

  const html = `
    <h3 style="margin-bottom:0.5rem; font-size:1.1rem;">${law.icon} ${law.name}</h3>
    <p style="color:var(--text-secondary); font-size:0.9rem; margin-bottom:1rem; line-height:1.6;">${law.description}</p>
    <div style="margin-bottom:0.5rem;">
      <div style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.06em; margin-bottom:0.3rem; font-weight:600;">Immediate Effects</div>
      <div style="display:flex;flex-wrap:wrap;gap:0.3rem;">${effectsHtml}</div>
    </div>
    ${monthlyHtml ? `
    <div style="margin-bottom:1rem;">
      <div style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.06em; margin-bottom:0.3rem; font-weight:600;">Monthly Effects</div>
      <div style="display:flex;flex-wrap:wrap;gap:0.3rem;">${monthlyHtml}</div>
    </div>` : ""}
    <div style="display:flex;gap:0.5rem;margin-top:1rem;">
      <button class="btn ${actionClass} btn-md" id="modal-law-action">${action} in Parliament</button>
      <button class="btn btn-secondary btn-md" id="modal-law-cancel">Cancel</button>
    </div>
  `;

  showModal(html);

  document.getElementById("modal-law-action").addEventListener("click", () => {
    hideModal();
    if (law.passed) {
      executeRepeal(lawId);
    } else {
      executeVote(lawId);
    }
  });
  document.getElementById("modal-law-cancel").addEventListener("click", hideModal);
}

// ─── EXECUTE PARLIAMENTARY VOTE ─────────────────────────────

function executeVote(lawId) {
  const result = proposeLaw(lawId);
  if (!result) return;

  if (result.alreadyPassed) {
    showToast(result.message, "warning");
    return;
  }

  showVoteResult(result);
  updateStatusBar();
  renderParliament();
  renderLaws();
}

function executeRepeal(lawId) {
  const result = repealLaw(lawId);
  if (!result) return;

  showVoteResult(result);
  updateStatusBar();
  renderParliament();
  renderLaws();
}

function showVoteResult(result) {
  // Hide other panels
  hideAllMainPanels();
  DOM.votePanel.style.display = "block";

  // Badge
  DOM.voteResultBadge.className = `vote-badge ${result.passed ? "passed" : "rejected"}`;
  DOM.voteResultBadge.textContent = result.passed ? "✅ PASSED" : "❌ REJECTED";

  // Law name
  DOM.voteLawName.textContent = result.lawName || "";

  // Tally bar
  if (result.yesVotes !== undefined) {
    const total = result.yesVotes + result.noVotes;
    const yesPct = (result.yesVotes / total) * 100;
    const noPct = (result.noVotes / total) * 100;
    DOM.tallyYes.style.width = `${yesPct}%`;
    DOM.tallyYes.textContent = result.yesVotes;
    DOM.tallyNo.style.width = `${noPct}%`;
    DOM.tallyNo.textContent = result.noVotes;
    DOM.tallyYesLabel.textContent = `${result.yesVotes} Yes`;
    DOM.tallyNoLabel.textContent = `${result.noVotes} No`;
  }

  // Party breakdown
  DOM.votePartyBreakdown.innerHTML = "";
  if (result.partyVotes) {
    result.partyVotes.forEach(pv => {
      const party = getPartyById(pv.partyId);
      const row = document.createElement("div");
      row.className = "vote-party-row";
      row.innerHTML = `
        <div class="vote-party-dot" style="background:${party ? party.color : '#666'}"></div>
        <span class="vote-party-name">${pv.shortName || pv.partyName}</span>
        <span class="vote-party-seats">${pv.seats} seats</span>
        <span class="vote-party-verdict ${pv.votedYes ? "verdict-yes" : "verdict-no"}">${pv.votedYes ? "YES" : "NO"}</span>
      `;
      DOM.votePartyBreakdown.appendChild(row);
    });
  }

  // Message
  DOM.voteMessage.textContent = result.message;
  DOM.voteMessage.style.color = result.passed ? "var(--green-400)" : "var(--red-400)";
}

// ─── HIDE ALL MAIN PANELS ───────────────────────────────────

function hideAllMainPanels() {
  DOM.crisisPanel.style.display = "none";
  DOM.outcomePanel.style.display = "none";
  DOM.reportPanel.style.display = "none";
  DOM.idlePanel.style.display = "none";
  DOM.votePanel.style.display = "none";
  DOM.warningTicker.style.display = "none";
}

// ─── SHOW CRISIS EVENT ──────────────────────────────────────

function showCrisisEvent() {
  const event = triggerCrisisEvent();
  if (!event) return;

  hideAllMainPanels();
  DOM.crisisPanel.style.display = "block";

  DOM.crisisTurn.textContent = getTurnLabel(gameState.turn);
  DOM.crisisTitle.textContent = event.title;
  DOM.crisisDescription.textContent = event.description;

  // Render choice buttons
  DOM.crisisChoices.innerHTML = "";
  event.choices.forEach((choice, index) => {
    const btn = document.createElement("button");
    btn.className = "btn btn-choice";
    btn.textContent = choice.label;
    btn.addEventListener("click", () => handleCrisisChoice(index));
    DOM.crisisChoices.appendChild(btn);
  });
}

// ─── HANDLE CRISIS CHOICE ───────────────────────────────────

function handleCrisisChoice(choiceIndex) {
  const result = resolveCrisisChoice(choiceIndex);
  if (!result) return;

  hideAllMainPanels();
  DOM.outcomePanel.style.display = "block";

  // Outcome text
  DOM.outcomeText.textContent = result.outcome;

  // Effect chips
  DOM.outcomeEffects.innerHTML = "";

  if (result.effects) {
    const labelMap = {
      popularity: "Approval",
      budget: "Budget",
      unrest: "Unrest",
      growth: "Growth",
      militaryPatience: "Military",
      coalitionStability: "Coalition"
    };

    Object.entries(result.effects).forEach(([key, val]) => {
      const sign = val > 0 ? "+" : "";
      // For unrest, positive is bad; for others positive is good
      const isGood = key === "unrest" || key === "militaryPatience" 
        ? val < 0 
        : (key === "budget" ? val > 0 : val > 0);
      // Special: militaryPatience going up is good
      const goodCheck = key === "militaryPatience" ? val > 0 : isGood;
      const cls = goodCheck ? "effect-positive" : "effect-negative";
      const label = labelMap[key] || key;
      const chip = document.createElement("span");
      chip.className = `effect-chip ${cls}`;
      chip.textContent = `${label}: ${sign}${val}`;
      DOM.outcomeEffects.appendChild(chip);
    });
  }

  if (result.partyEffects) {
    Object.entries(result.partyEffects).forEach(([partyId, val]) => {
      const party = getPartyById(partyId);
      if (!party) return;
      const sign = val > 0 ? "+" : "";
      const cls = val > 0 ? "effect-positive" : "effect-negative";
      const chip = document.createElement("span");
      chip.className = `effect-chip ${cls}`;
      chip.textContent = `${party.shortName}: ${sign}${val}`;
      DOM.outcomeEffects.appendChild(chip);
    });
  }

  // Update all UI
  updateStatusBar();
  updateHeader();
  renderParliament();
  updateEventLog();
}

// ─── HANDLE END TURN ────────────────────────────────────────

function handleEndTurn() {
  const report = endTurn();

  // Check game over
  if (report.gameOver) {
    showGameOver(report.gameOverReason);
    return;
  }

  // Show monthly report
  hideAllMainPanels();
  DOM.reportPanel.style.display = "block";

  DOM.reportTurn.textContent = getTurnLabel(gameState.turn - 1);

  // Stat changes
  DOM.reportStats.innerHTML = "";
  const statLabels = {
    popularity: { label: "Approval Change", icon: "📊" },
    budget: { label: "Budget Change", icon: "💰" },
    unrest: { label: "Unrest Change", icon: "⚠️" },
    growth: { label: "Growth Impact", icon: "📈" }
  };

  Object.entries(report.statChanges).forEach(([key, val]) => {
    if (val === 0 || !statLabels[key]) return;
    const sign = val > 0 ? "+" : "";
    const isGood = key === "unrest" ? val < 0 : val > 0;
    const line = document.createElement("div");
    line.className = "report-stat-line";
    line.innerHTML = `
      <span class="report-stat-label">${statLabels[key].icon} ${statLabels[key].label}</span>
      <span class="report-stat-value ${isGood ? "positive" : "negative"}">${sign}${val}</span>
    `;
    DOM.reportStats.appendChild(line);
  });

  // Law effects
  DOM.reportLaws.innerHTML = "";
  if (report.lawEffects.length > 0) {
    const header = document.createElement("div");
    header.style.cssText = "font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.06em; font-weight:600; margin-bottom:0.3rem;";
    header.textContent = "Active Law Effects";
    DOM.reportLaws.appendChild(header);
    report.lawEffects.forEach(le => {
      const line = document.createElement("div");
      line.className = "report-law-line";
      line.textContent = `${le.icon} ${le.lawName}`;
      DOM.reportLaws.appendChild(line);
    });
  }

  // Warnings
  DOM.reportWarnings.innerHTML = "";
  report.warnings.forEach(w => {
    const line = document.createElement("div");
    line.className = "report-warning-line";
    line.textContent = w;
    DOM.reportWarnings.appendChild(line);
  });

  // Update all UI
  updateStatusBar();
  updateHeader();
  renderParliament();
  renderLaws();
}

// ─── HANDLE NEXT MONTH ─────────────────────────────────────

function handleNextMonth() {
  showCrisisEvent();
}

// ─── HANDLE START MONTH ─────────────────────────────────────

function handleStartMonth() {
  showCrisisEvent();
}

// ─── UPDATE EVENT LOG ───────────────────────────────────────

function updateEventLog() {
  if (gameState.eventHistory.length === 0) {
    DOM.eventLog.innerHTML = '<div class="log-empty">No events yet.</div>';
    return;
  }

  DOM.eventLog.innerHTML = "";
  // Show most recent events first, limit to 15
  const recent = [...gameState.eventHistory].reverse().slice(0, 15);
  recent.forEach(entry => {
    const div = document.createElement("div");
    div.className = "log-entry";
    div.innerHTML = `
      <div class="log-entry-turn">Month ${entry.turn}</div>
      <div class="log-entry-title">${entry.eventTitle}</div>
    `;
    DOM.eventLog.appendChild(div);
  });
}

// ─── SHOW WARNING TICKER ────────────────────────────────────

function showWarnings(warnings) {
  if (!warnings || warnings.length === 0) {
    DOM.warningTicker.style.display = "none";
    return;
  }
  DOM.warningTicker.style.display = "flex";
  DOM.warningText.innerHTML = warnings.join("<br>");
}

// ─── GAME OVER ──────────────────────────────────────────────

function showGameOver(reason) {
  showScreen("gameover-screen");

  // STEP 3 FIX: Clear UI state — game is over
  localStorage.removeItem('maingame_ui_state');

  const isVictory = reason === "VICTORY";

  DOM.gameoverIcon.textContent = isVictory ? "🏆" : "💥";
  DOM.gameoverTitle.textContent = isVictory ? "TERM COMPLETED!" : "GAME OVER";
  DOM.gameoverTitle.className = `gameover-title ${isVictory ? "victory" : "coup"}`;

  if (isVictory) {
    DOM.gameoverReason.textContent = "Congratulations! You have survived a full 4-year term as Prime Minister of Thailand — a feat few achieve. The people may not all love you, but you endured.";

    // Show victory score
    DOM.victoryScore.style.display = "block";
    const scores = calculateVictoryScore();
    DOM.victoryGrade.textContent = scores.grade;
    DOM.victoryTitleText.textContent = scores.title;

    DOM.scoreBreakdown.innerHTML = "";
    const scoreLabels = {
      popularity: "Approval Rating",
      stability: "National Stability",
      economy: "Budget Health",
      growth: "Economic Growth",
      legislation: "Laws Passed",
      coalitionBonus: "Coalition Intact",
      militaryBonus: "Military Stable"
    };
    Object.entries(scoreLabels).forEach(([key, label]) => {
      const row = document.createElement("div");
      row.className = "score-row";
      row.innerHTML = `
        <span class="score-row-label">${label}</span>
        <span class="score-row-value">${Math.round(scores[key])}</span>
      `;
      DOM.scoreBreakdown.appendChild(row);
    });
    const totalRow = document.createElement("div");
    totalRow.className = "score-row";
    totalRow.style.cssText = "border-top:1px solid var(--border-normal); margin-top:0.3rem; padding-top:0.4rem; grid-column:span 2;";
    totalRow.innerHTML = `
      <span class="score-row-label" style="font-weight:700; color:var(--text-primary);">TOTAL SCORE</span>
      <span class="score-row-value" style="font-size:1.1rem;">${Math.round(scores.total)}</span>
    `;
    DOM.scoreBreakdown.appendChild(totalRow);
  } else {
    DOM.gameoverReason.textContent = reason;
    DOM.victoryScore.style.display = "none";
  }

  // Stats
  DOM.goMonths.textContent = gameState.turn - 1;
  DOM.goLaws.textContent = gameState.passedLaws.length;
  DOM.goApproval.textContent = `${Math.round(gameState.popularity)}%`;

  // Delete save on game over
  deleteSave();
}

// ─── INIT GAME ──────────────────────────────────────────────

function initGame(loadSave = false) {
  if (loadSave && hasSavedGame()) {
    loadGame();
    showToast("Game loaded successfully!", "success");
  } else {
    initializeGameState();
  }

  showScreen("game-screen");

  // STEP 3 FIX: Persist UI state so language reload doesn't reset to start screen
  localStorage.setItem('maingame_ui_state', 'dashboard');
  console.log('[main-game/main.js] UI state saved: dashboard');

  // Update all UI elements
  updateStatusBar();
  updateHeader();
  renderParliament();
  renderLaws();
  updateEventLog();

  // Show idle panel to start
  hideAllMainPanels();
  DOM.idlePanel.style.display = "flex";
}

// ─── EVENT LISTENERS ────────────────────────────────────────

// Start screen
DOM.btnNewGame.addEventListener("click", () => initGame(false));
DOM.btnLoadGame.addEventListener("click", () => initGame(true));

// Game buttons
DOM.btnStartMonth.addEventListener("click", handleStartMonth);
DOM.btnEndTurn.addEventListener("click", handleEndTurn);
DOM.btnNextMonth.addEventListener("click", handleNextMonth);
DOM.btnCloseVote.addEventListener("click", () => {
  hideAllMainPanels();
  DOM.idlePanel.style.display = "flex";
});

// Save
DOM.btnSave.addEventListener("click", () => {
  saveGame();
  showToast("Game saved!", "success");
});

// Menu button
DOM.btnMenu.addEventListener("click", () => {
  showModal(`
    <h3 style="margin-bottom:1rem; font-size:1.1rem;">☰ Menu</h3>
    <div style="display:flex; flex-direction:column; gap:0.5rem;">
      <button class="btn btn-secondary btn-md" id="menu-save">💾 Save Game</button>
      <button class="btn btn-secondary btn-md" id="menu-howto">📖 How to Play</button>
      <button class="btn btn-danger btn-md" id="menu-quit">🚪 Quit to Title</button>
    </div>
  `);
  document.getElementById("menu-save").addEventListener("click", () => {
    saveGame();
    showToast("Game saved!", "success");
    hideModal();
  });
  document.getElementById("menu-howto").addEventListener("click", () => {
    showHowToPlay();
  });
  document.getElementById("menu-quit").addEventListener("click", () => {
    hideModal();
    // STEP 3 FIX: Clear UI state on quit
    localStorage.removeItem('maingame_ui_state');
    showScreen("start-screen");
  });
});

// Modal close
DOM.modalClose.addEventListener("click", hideModal);
DOM.modalOverlay.addEventListener("click", (e) => {
  if (e.target === DOM.modalOverlay) hideModal();
});

// Restart
DOM.btnRestart.addEventListener("click", () => {
  // STEP 3 FIX: Clear UI state on restart
  localStorage.removeItem('maingame_ui_state');
  showScreen("start-screen");
});

// ─── HOW TO PLAY ────────────────────────────────────────────

function showHowToPlay() {
  showModal(`
    <h3 style="margin-bottom:0.75rem; font-size:1.1rem;">📖 How to Play</h3>
    <div style="font-size:0.85rem; color:var(--text-secondary); line-height:1.7;">
      <p style="margin-bottom:0.75rem;">You are the <strong style="color:var(--gold-400);">Prime Minister of Thailand</strong>. Each turn represents one month of your 4-year term (48 months).</p>
      
      <p style="margin-bottom:0.5rem; font-weight:600; color:var(--text-primary);">Each Month:</p>
      <ol style="margin-left:1.2rem; margin-bottom:0.75rem;">
        <li>A <strong>Crisis Event</strong> occurs — you must choose how to respond</li>
        <li>Your choice affects Approval, Budget, Unrest, and Party Relations</li>
        <li>Monthly effects from active laws are applied</li>
        <li>Coalition stability is evaluated</li>
      </ol>
      
      <p style="margin-bottom:0.5rem; font-weight:600; color:var(--text-primary);">You Can Also:</p>
      <ul style="margin-left:1.2rem; margin-bottom:0.75rem;">
        <li>Propose or repeal <strong>Laws</strong> — Parliament votes based on ideology & loyalty</li>
        <li>Monitor your <strong>Coalition</strong> — parties may join or defect</li>
      </ul>
      
      <p style="margin-bottom:0.5rem; font-weight:600; color:var(--red-400);">Game Over If:</p>
      <ul style="margin-left:1.2rem; margin-bottom:0.75rem;">
        <li>🔴 Social Unrest reaches 100% → Military Coup</li>
        <li>🎖️ Military Patience hits 0 → Coup</li>
        <li>💰 Budget runs out → National Bankruptcy</li>
        <li>🏛️ Coalition loses majority → Vote of No Confidence</li>
        <li>📉 Approval hits 0% → Forced Resignation</li>
      </ul>
      
      <p style="color:var(--gold-400); font-weight:600;">Survive all 48 months to win! 🏆</p>
    </div>
  `);
}

// ═══════════════════════════════════════════════════════════════════
// BOOT SEQUENCE — Determines which screen to show on page load.
// Priority: 1) Saved UI state = 'dashboard' → restore game
//           2) STRICT FALLBACK → Start Screen (default/wipe)
// ═══════════════════════════════════════════════════════════════════
(function onPageLoad() {
  // Check if we were on the dashboard (language-change reload)
  if (localStorage.getItem('maingame_ui_state') === 'dashboard') {
    try {
      console.log('[main-game/main.js] Restoring dashboard after reload...');
      initGame(hasSavedGame());
      return;
    } catch (e) {
      // If restore fails (e.g. corrupt data after partial wipe), fall through to start screen
      console.warn('[main-game/main.js] Dashboard restore failed, falling back to start screen:', e);
      localStorage.removeItem('maingame_ui_state');
    }
  }

  // ── STRICT FALLBACK: Force Start Screen ──
  // This runs when:
  //   - Fresh first visit (no saved state)
  //   - After Wipe Save Data (all state keys cleared)
  //   - After game over / manual quit
  //   - After failed dashboard restore
  console.log('[main-game/main.js] No saved state — showing Start Screen.');

  // Show/hide Load Game button based on whether a save exists
  if (hasSavedGame()) {
    DOM.btnLoadGame.style.display = "inline-flex";
  } else {
    DOM.btnLoadGame.style.display = "none";
  }

  // Explicitly force start screen
  showScreen("start-screen");
})();
