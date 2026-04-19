// ═══════════════════════════════════════════════════════════════════════════
// THAILAND POLITICAL SIMULATION — /parliament-test/main.js
// v.1.0.1 Test: "The Parliament RPG" — UI Orchestration & DOM Bindings
// ═══════════════════════════════════════════════════════════════════════════
//
// PURPOSE:
//   This is the GLUE between the engines (data.js, timeline.js, debate.js)
//   and the DOM (index.html + style.css). It:
//
//   1. Initializes the game state on page load
//   2. Binds event listeners to all buttons
//   3. Registers timeline & debate callbacks to update the UI
//   4. Manages modal windows (protest rulings, events, interpellations)
//   5. Auto-scrolls the transcript feed as AI MPs speak
//   6. Orchestrates the macro ↔ parliament phase transition
//
// DEPENDENCIES:
//   - data.js     (loaded first — state, constants, helpers)
//   - timeline.js (loaded second — advanceTime, callbacks)
//   - debate.js   (loaded third — runDebate, raiseProtest, playerSpeak)
//
// ═══════════════════════════════════════════════════════════════════════════


// ──────────────────────────────────────────────────────────────────────────
// SECTION 1: DOM ELEMENT REFERENCES
// Cache all DOM elements on load for performance.
// ──────────────────────────────────────────────────────────────────────────

const DOM = {};

/**
 * _cacheDOMElements() — Grabs all interactive elements by ID and
 * caches them in the DOM object for fast access.
 */
function _cacheDOMElements() {
  // Top Bar
  DOM.topWeekBadge        = document.getElementById('top-week-badge');
  DOM.topPhaseIndicator   = document.getElementById('top-phase-indicator');
  DOM.topPhaseText        = document.getElementById('top-phase-text');
  DOM.topPlayerName       = document.getElementById('top-player-name');

  // Left Panel — Calendar (REMOVED in Step 1 — UI Cleanup)
  // Calendar grid and time indicator elements no longer exist in the HTML.
  DOM.leftDayBadge        = document.getElementById('left-day-badge');

  // Left Panel — Stats
  DOM.statCapValue        = document.getElementById('stat-cap-value');
  DOM.statCapBar          = document.getElementById('stat-cap-bar');
  DOM.statPopValue        = document.getElementById('stat-pop-value');
  DOM.statPopBar          = document.getElementById('stat-pop-bar');
  DOM.statFundsValue      = document.getElementById('stat-funds-value');
  DOM.statFundsBar        = document.getElementById('stat-funds-bar');

  // Left Panel — Weekly Stats
  DOM.statDebatesVal      = document.getElementById('stat-debates-val');
  DOM.statProtestsVal     = document.getElementById('stat-protests-val');
  DOM.statVotesVal        = document.getElementById('stat-votes-val');
  DOM.statInterpVal       = document.getElementById('stat-interp-val');

  // Left Panel — Event Log
  DOM.eventLogList        = document.getElementById('event-log-list');

  // Center Panel — Floor
  DOM.centerStatusBadge   = document.getElementById('center-status-badge');
  DOM.topicBanner         = document.getElementById('topic-banner');
  DOM.topicCategory       = document.getElementById('topic-category');
  DOM.topicTitle          = document.getElementById('topic-title');
  DOM.topicTitleThai      = document.getElementById('topic-title-thai');
  DOM.currentSpeakerBar   = document.getElementById('current-speaker-bar');
  DOM.speakerName         = document.getElementById('speaker-name');
  DOM.speakerParty        = document.getElementById('speaker-party');
  DOM.debateProgress      = document.getElementById('debate-progress');
  DOM.progressLabel       = document.getElementById('progress-label');
  DOM.progressFill        = document.getElementById('progress-fill');
  DOM.progressRounds      = document.getElementById('progress-rounds');
  DOM.transcriptFeed      = document.getElementById('transcript-feed');
  DOM.noDebatePlaceholder = document.getElementById('no-debate-placeholder');
  DOM.typingIndicator     = document.getElementById('typing-indicator');
  DOM.typingLabel         = document.getElementById('typing-label');

  // Right Panel — Actions
  DOM.rightContextBadge   = document.getElementById('right-context-badge');
  DOM.macroActions        = document.getElementById('macro-actions');
  DOM.parliamentActions   = document.getElementById('parliament-actions');

  // Macro Buttons (Time Control REMOVED — Step 1)
  DOM.btnBeginSession     = document.getElementById('btn-begin-session');
  DOM.btnQueueInterp      = document.getElementById('btn-queue-interp');
  DOM.interpQueueCount    = document.getElementById('interp-queue-count');

  // Legislation UI (Step 4)
  DOM.btnProposeBill      = document.getElementById('btn-propose-bill');
  DOM.billSlotsBadge      = document.getElementById('bill-slots-badge');
  DOM.activeBillsList     = document.getElementById('active-bills-list');
  DOM.influenceDisplay    = document.getElementById('influence-display');
  DOM.billProposalOverlay = document.getElementById('bill-proposal-overlay');
  DOM.billTemplatesContainer = document.getElementById('bill-templates-container');
  DOM.billProposalClose   = document.getElementById('bill-proposal-close');
  DOM.modalInfluenceDisplay = document.getElementById('modal-influence-display');
  DOM.modalSlotsDisplay   = document.getElementById('modal-slots-display');
  DOM.committeeOverlay    = document.getElementById('committee-expert-overlay');
  DOM.committeeBillTitle  = document.getElementById('committee-bill-title');
  DOM.committeeExpertsContainer = document.getElementById('committee-experts-container');
  DOM.committeeExpertClose = document.getElementById('committee-expert-close');

  // Parliament — Protest Buttons
  DOM.protestSection      = document.getElementById('protest-section');
  DOM.btnProtestSlander   = document.getElementById('btn-protest-slander');
  DOM.btnProtestOfftopic  = document.getElementById('btn-protest-offtopic');
  DOM.btnProtestMisleading= document.getElementById('btn-protest-misleading');
  DOM.protestCooldownBar  = document.getElementById('protest-cooldown-bar');

  // Parliament — Speech Buttons
  DOM.speechSection       = document.getElementById('speech-section');
  DOM.btnSpeechAggressive = document.getElementById('btn-speech-aggressive');
  DOM.btnSpeechTechnical  = document.getElementById('btn-speech-technical');
  DOM.btnSpeechDiplomatic = document.getElementById('btn-speech-diplomatic');

  // Parliament — Vote Buttons
  DOM.voteSection         = document.getElementById('vote-section');
  DOM.btnVoteAye          = document.getElementById('btn-vote-aye');
  DOM.btnVoteNay          = document.getElementById('btn-vote-nay');
  DOM.btnVoteAbstain      = document.getElementById('btn-vote-abstain');

  // Parliament — Interpellation
  DOM.interpParliamentButtons = document.getElementById('interp-parliament-buttons');

  // Modals
  DOM.rulingOverlay       = document.getElementById('ruling-modal-overlay');
  DOM.rulingIcon          = document.getElementById('ruling-icon');
  DOM.rulingVerdict       = document.getElementById('ruling-verdict');
  DOM.rulingThai          = document.getElementById('ruling-thai');
  DOM.rulingDetails       = document.getElementById('ruling-details');
  DOM.rulingCapital       = document.getElementById('ruling-capital');
  DOM.rulingModalClose    = document.getElementById('ruling-modal-close');
  DOM.rulingModalOk       = document.getElementById('ruling-modal-ok');

  DOM.eventOverlay        = document.getElementById('event-modal-overlay');
  DOM.eventModalTitle     = document.getElementById('event-modal-title');
  DOM.eventDescription    = document.getElementById('event-description');
  DOM.eventChoicesContainer = document.getElementById('event-choices-container');
  DOM.eventModalClose     = document.getElementById('event-modal-close');

  DOM.interpOverlay       = document.getElementById('interp-modal-overlay');
  DOM.interpTopicsContainer = document.getElementById('interp-topics-container');
  DOM.interpModalClose    = document.getElementById('interp-modal-close');

  DOM.parliamentNotifyOverlay = document.getElementById('parliament-notify-overlay');
  DOM.parliamentNotifyDay     = document.getElementById('parliament-notify-day');
  DOM.parliamentNotifyTopic   = document.getElementById('parliament-notify-topic');
  DOM.btnEnterParliament      = document.getElementById('btn-enter-parliament');

  // Toast Container
  DOM.toastContainer      = document.getElementById('toast-container');

  console.log("[main.js] DOM elements cached.");
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 2: GAME INITIALIZATION
// Sets up the game state and renders the initial UI.
// ──────────────────────────────────────────────────────────────────────────

/**
 * initGame() — Master initialization function.
 * Called once on page load.
 */
function initGame() {
  console.log("[main.js] ═══ INITIALIZING PARLIAMENT RPG ═══");

  // 1. Cache DOM
  _cacheDOMElements();

  // 2. Check for campaign handoff data (Part 3 — Integration)
  let initConfig = {
    playerPartyId: "khana_pracharat",
    playerRole: "mp",
    playerAlignment: "opposition",
    playerName: "ท่านผู้เล่น",
    playerConstituency: "Bangkok District 7"
  };

  const campaignHandoff = _loadCampaignHandoff();
  if (campaignHandoff) {
    console.log("[main.js] Campaign handoff detected!", campaignHandoff);
    initConfig.playerPartyId = campaignHandoff.playerPartyId || initConfig.playerPartyId;
    initConfig._campaignDay = campaignHandoff.currentDay;
    initConfig._campaignWeek = campaignHandoff.currentWeek;
    initConfig._campaignFunds = campaignHandoff.playerFunds;
    initConfig._campaignScrutiny = campaignHandoff.playerScrutiny;
    initConfig._fromCampaign = true;
  }

  // 3. Initialize game state
  initParliamentState(initConfig);

  // Sync campaign data into parliament state if available
  if (campaignHandoff && parliamentState) {
    parliamentState._fromCampaign = true;
    parliamentState._campaignDay = campaignHandoff.currentDay;
    if (campaignHandoff.playerFunds) {
      parliamentState.playerFunds = Math.min(1000, campaignHandoff.playerFunds);
    }
  }

  // 4. Initialize extended resources (Part 2 — engine.js)
  if (typeof initExtendedResources === 'function') {
    initExtendedResources();
  }

  // 5. Register timeline callbacks
  _registerTimelineCallbacks();

  // 6. Register debate callbacks
  _registerDebateCallbacks();

  // 7. Bind button events
  _bindButtonEvents();

  // 8. Bind modal events
  _bindModalEvents();

  // 9. Render initial UI
  _renderFullUI();

  // 10. Debug: print schedule
  debugPrintSchedule();

  console.log("[main.js] ═══ PARLIAMENT RPG READY ═══");

  if (campaignHandoff) {
    showToast("success", `🏛️ Entering Parliament from Campaign (Week ${campaignHandoff.currentWeek}, Day ${campaignHandoff.currentDay})`);
  } else {
    showToast("info", "🏛️ Welcome to the Thai Parliament, ท่านสมาชิก!");
  }
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 3: TIMELINE CALLBACK REGISTRATION
// Connects the timeline engine's events to UI updates.
// ──────────────────────────────────────────────────────────────────────────

function _registerTimelineCallbacks() {

  // ── On every phase change → refresh UI ──
  registerTimelineCallback('onPhaseChange', (dayIndex, timeIndex, phaseType) => {
    _renderFullUI();
  });

  // ── On day change → update calendar ──
  registerTimelineCallback('onDayChange', (dayIndex, daySchedule) => {
    _renderCalendar();
    _renderTimeIndicator();
  });

  // ── On week change → show toast ──
  registerTimelineCallback('onWeekChange', (weekNum) => {
    showToast("info", `📅 Week ${weekNum} begins. New opportunities await.`);
    _renderWeeklyStats();
  });

  // ── On Parliament Entry → show notification modal ──
  registerTimelineCallback('onParliamentEntry', (schedule, isUrgent) => {
    _showParliamentNotification(schedule, isUrgent);
  });

  // ── On Parliament Exit → return to macro UI ──
  registerTimelineCallback('onParliamentExit', (schedule) => {
    _switchToMacroUI();
    showToast("info", "🏛️ Parliament session concluded. Returning to macro view.");
  });

  // ── On Constituency Event → show event modal ──
  registerTimelineCallback('onConstituencyEvent', (event) => {
    _showEventModal(event, "constituency");
  });

  // ── On Committee Event → show event modal ──
  registerTimelineCallback('onCommitteeEvent', (event) => {
    _showEventModal(event, "committee");
  });

  // ── On Rest Day → brief notification ──
  registerTimelineCallback('onRestDay', (schedule) => {
    showToast("info", `🌙 ${schedule.dayName} — Rest day. ${schedule.description}`);
  });

  // ── On Local Pop Decay → warning toast ──
  registerTimelineCallback('onLocalPopDecay', (decay, newPop) => {
    showToast("warning", `⚠️ Local Popularity -${decay}! Your constituents miss you. (Now: ${newPop})`);
    _animateStatChange('stat-local-popularity', 'negative');
  });

  // ── On any state update → refresh stats ──
  registerTimelineCallback('onGameStateUpdate', (state) => {
    _renderPlayerStats();
    _renderWeeklyStats();
  });

  console.log("[main.js] Timeline callbacks registered.");
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 4: DEBATE CALLBACK REGISTRATION
// Connects the debate engine's events to the live transcript UI.
// ──────────────────────────────────────────────────────────────────────────

function _registerDebateCallbacks() {

  // ── New dialogue → append bubble + auto-scroll ──
  registerDebateCallback('onDialogueAdded', (entry) => {
    _appendDialogueBubble(entry);
    _autoScrollTranscript();
    _updateDebateProgress();
    _updateCurrentSpeakerBar(entry);

    // Show or hide typing indicator
    if (entry.type === 'ai_speech') {
      _showTypingIndicator(false);
    }
  });

  // ── Speaker change → show typing indicator briefly ──
  registerDebateCallback('onSpeakerChange', (speaker, entry) => {
    // Brief typing indicator before next speech
    setTimeout(() => {
      if (parliamentState && parliamentState.isDebateInProgress) {
        _showTypingIndicator(true, `${speaker.avatar} ${speaker.name} is preparing to speak...`);
      }
    }, 100);

    // Update protest button states
    _updateProtestButtons(entry);
  });

  // ── Protest result → show ruling modal ──
  registerDebateCallback('onProtestResult', (result) => {
    _showRulingModal(result);
    _showProtestCooldown();
    _renderPlayerStats();
  });

  // ── Player turn → switch action deck to speech mode ──
  registerDebateCallback('onPlayerTurn', (topic, snapshot) => {
    _showSpeechSection();
    _showTypingIndicator(false);
    showToast("warning", "🎤 It's YOUR turn to speak! Choose your stance.");
  });

  // ── Debate start → switch to parliament UI ──
  registerDebateCallback('onDebateStart', (topic, snapshot) => {
    // UI already switched by parliament entry
  });

  // ── Debate end → show vote section ──
  registerDebateCallback('onDebateEnd', (topic, snapshot) => {
    _showVoteSection();
    _showTypingIndicator(false);
    showToast("info", "🗳️ Debate concluded. Cast your vote!");
  });

  // ── Vote result → show result and return to macro ──
  registerDebateCallback('onVoteResult', (result) => {
    _renderPlayerStats();
    const emoji = result.passed ? "✅" : "❌";
    const msg = result.passed
      ? `${emoji} PASSED ${result.ayes}-${result.nays}! ${result.topicTitle}`
      : `${emoji} DEFEATED ${result.ayes}-${result.nays}. ${result.topicTitle}`;
    showToast(result.passed ? "success" : "error", msg);

    // After a brief delay, offer to exit parliament
    setTimeout(() => {
      _showReturnToMacroButton();
    }, 3000);
  });

  // ── Interpellation result ──
  registerDebateCallback('onInterpellationResult', (result) => {
    _renderPlayerStats();
    const emoji = result.success ? "✅" : "❌";
    showToast(result.success ? "success" : "warning",
      `${emoji} Interpellation: ${result.narrative}`);
  });

  console.log("[main.js] Debate callbacks registered.");
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 5: BUTTON EVENT BINDINGS
// Wires up every interactive button to its respective engine function.
// ──────────────────────────────────────────────────────────────────────────

function _bindButtonEvents() {

  // ── Begin Parliament Session (Step 1 — replaces old Time Control) ──
  if (DOM.btnBeginSession) {
    DOM.btnBeginSession.addEventListener('click', () => {
      console.log('[main.js] Begin Session clicked — starting parliament session.');

      // Pick a random debate topic
      const topic = getRandomDebateTopic();

      // Switch to parliament UI
      _switchToParliamentUI();

      // Enter parliament formally
      const sessionInfo = enterParliamentSession();

      // Update topic banner
      DOM.topicCategory.textContent = topic.category.toUpperCase() + ' BILL';
      DOM.topicTitle.textContent = topic.title;
      DOM.topicTitleThai.textContent = topic.titleThai;

      // Render any queued interpellations
      _renderParliamentInterpellations();

      // Start the debate!
      runDebate(topic);

      showToast('success', `🏛️ Parliament convened! Debating: ${topic.title}`);
    });
  }

  // ── Queue Interpellation ──
  if (DOM.btnQueueInterp) {
    DOM.btnQueueInterp.addEventListener('click', () => {
      _showInterpellationPicker();
    });
  }

  // ── Propose Bill (Step 4) ──
  if (DOM.btnProposeBill) {
    DOM.btnProposeBill.addEventListener('click', () => {
      _showBillProposalModal();
    });
  }

  // ── Protest Buttons ──
  DOM.btnProtestSlander.addEventListener('click', () => _handleProtest('slander'));
  DOM.btnProtestOfftopic.addEventListener('click', () => _handleProtest('off_topic'));
  DOM.btnProtestMisleading.addEventListener('click', () => _handleProtest('misleading'));

  // ── Speech Buttons ──
  DOM.btnSpeechAggressive.addEventListener('click', () => _handlePlayerSpeech('aggressive'));
  DOM.btnSpeechTechnical.addEventListener('click', () => _handlePlayerSpeech('technical'));
  DOM.btnSpeechDiplomatic.addEventListener('click', () => _handlePlayerSpeech('diplomatic'));

  // ── Vote Buttons ──
  DOM.btnVoteAye.addEventListener('click', () => _handleVote('aye'));
  DOM.btnVoteNay.addEventListener('click', () => _handleVote('nay'));
  DOM.btnVoteAbstain.addEventListener('click', () => _handleVote('abstain'));

  // ── Enter Parliament ──
  DOM.btnEnterParliament.addEventListener('click', () => {
    _closeModal(DOM.parliamentNotifyOverlay);
    _startParliamentSession();
  });
  // ── STEP 4: Language Toggle in Header ──
  const langToggleBtn = document.getElementById('btn-lang-toggle');
  if (langToggleBtn) {
    // Set initial active state from localStorage
    const currentLang = (localStorage.getItem('tps_language') || 'EN').toUpperCase();
    langToggleBtn.querySelectorAll('.lang-toggle__opt').forEach(opt => {
      opt.classList.toggle('active', opt.dataset.lang === currentLang);
    });

    langToggleBtn.addEventListener('click', () => {
      const current = (localStorage.getItem('tps_language') || 'EN').toUpperCase();
      const next = current === 'EN' ? 'TH' : 'EN';

      console.log(`[main.js] Language toggle: ${current} → ${next}`);

      // Update visual state immediately
      langToggleBtn.querySelectorAll('.lang-toggle__opt').forEach(opt => {
        opt.classList.toggle('active', opt.dataset.lang === next);
      });

      // Use the global changeLanguage if available (applies data-i18n + localStorage)
      if (typeof changeLanguage === 'function') {
        changeLanguage(next);
      } else {
        localStorage.setItem('tps_language', next);
      }

      // Reload page to refresh all runtime-generated content (debate transcript, etc.)
      // The debate engine's _getDebateLang() will pick up the new language on reload.
      setTimeout(() => {
        window.location.reload();
      }, 300);
    });
  }

  console.log("[main.js] Button events bound.");
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 6: MODAL EVENT BINDINGS
// Close buttons and backdrop clicks for all modals.
// ──────────────────────────────────────────────────────────────────────────

function _bindModalEvents() {
  // Ruling Modal
  DOM.rulingModalClose.addEventListener('click', () => _closeModal(DOM.rulingOverlay));
  DOM.rulingModalOk.addEventListener('click', () => _closeModal(DOM.rulingOverlay));

  // Event Modal
  DOM.eventModalClose.addEventListener('click', () => _closeModal(DOM.eventOverlay));

  // Interpellation Modal
  DOM.interpModalClose.addEventListener('click', () => _closeModal(DOM.interpOverlay));

  // Bill Proposal Modal (Step 4)
  if (DOM.billProposalClose) {
    DOM.billProposalClose.addEventListener('click', () => _closeModal(DOM.billProposalOverlay));
  }

  // Committee Expert Modal (Step 4)
  if (DOM.committeeExpertClose) {
    DOM.committeeExpertClose.addEventListener('click', () => _closeModal(DOM.committeeOverlay));
  }

  // Click outside modal to close
  [DOM.rulingOverlay, DOM.eventOverlay, DOM.interpOverlay,
   DOM.billProposalOverlay, DOM.committeeOverlay].forEach(overlay => {
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          _closeModal(overlay);
        }
      });
    }
  });

  console.log("[main.js] Modal events bound.");
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 7: UI RENDERING FUNCTIONS
// Functions that update the DOM to reflect the current game state.
// ──────────────────────────────────────────────────────────────────────────

/**
 * _renderFullUI() — Complete UI refresh. Called on init and major state changes.
 */
function _renderFullUI() {
  _renderTopBar();
  _renderPlayerStats();
  _renderWeeklyStats();
  _renderActionDeck();
  _renderLegislationUI();   // Step 4
}

/**
 * _renderTopBar() — Updates the top navigation bar.
 */
function _renderTopBar() {
  if (!parliamentState) return;
  const s = parliamentState;

  // Week badge
  DOM.topWeekBadge.textContent = `Week ${s.currentWeek} / 8`;

  // Phase indicator
  if (s.currentPhase === 'parliament') {
    DOM.topPhaseIndicator.className = 'top-bar__phase-indicator parliament';
    DOM.topPhaseText.textContent = 'PARLIAMENT SESSION';
  } else {
    DOM.topPhaseIndicator.className = 'top-bar__phase-indicator macro';
    DOM.topPhaseText.textContent = 'MACRO PHASE';
  }

  // Player name
  DOM.topPlayerName.textContent = `${s.playerName} • ${s.playerRole === 'mp' ? 'MP' : s.playerRole} • ${s.playerAlignment === 'government' ? 'Government' : 'Opposition'}`;
}

/**
 * _renderCalendar() — DISABLED (Step 1 UI Cleanup).
 * Calendar grid removed from HTML — this is now a no-op.
 */
function _renderCalendar() {
  // Calendar removed — no-op
}

/**
 * _renderTimeIndicator() — DISABLED (Step 1 UI Cleanup).
 * Time indicator removed from HTML — this is now a no-op.
 */
function _renderTimeIndicator() {
  // Time indicator removed — no-op
}

/**
 * _renderPlayerStats() — Updates the stat cards with current values.
 */
function _renderPlayerStats() {
  if (!parliamentState) return;
  const s = parliamentState;

  // Political Capital
  DOM.statCapValue.textContent = s.playerPoliticalCapital;
  DOM.statCapBar.style.width = `${s.playerPoliticalCapital}%`;

  // Local Popularity
  DOM.statPopValue.textContent = s.playerLocalPopularity;
  DOM.statPopBar.style.width = `${s.playerLocalPopularity}%`;

  // Funds
  DOM.statFundsValue.textContent = s.playerFunds;
  const fundsPercent = Math.min(100, (s.playerFunds / 1000) * 100);
  DOM.statFundsBar.style.width = `${fundsPercent}%`;
}

/**
 * _renderWeeklyStats() — Updates the weekly stats grid.
 */
function _renderWeeklyStats() {
  if (!parliamentState) return;
  const ws = parliamentState.weeklyStats;

  DOM.statDebatesVal.textContent = ws.debatesParticipated;
  DOM.statProtestsVal.textContent = `${ws.protestsSucceeded}/${ws.protestsRaised}`;
  DOM.statVotesVal.textContent = ws.votesAttended;
  DOM.statInterpVal.textContent = ws.interpellationsFiled;
}

/**
 * _renderActionDeck() — Shows the correct action panel based on game phase.
 */
function _renderActionDeck() {
  if (!parliamentState) return;

  if (parliamentState.currentPhase === 'parliament') {
    DOM.macroActions.classList.add('hidden');
    DOM.parliamentActions.classList.remove('hidden');
    DOM.rightContextBadge.textContent = 'PARLIAMENT';
    DOM.rightContextBadge.style.background = 'var(--danger-bg)';
    DOM.rightContextBadge.style.color = 'var(--danger)';
  } else {
    DOM.macroActions.classList.remove('hidden');
    DOM.parliamentActions.classList.add('hidden');
    DOM.rightContextBadge.textContent = 'MACRO';
    DOM.rightContextBadge.style.background = 'var(--info-bg)';
    DOM.rightContextBadge.style.color = 'var(--info)';
  }

  // Update interpellation queue count
  const queueLen = parliamentState.interpellationQueue.filter(q => q.status === 'pending').length;
  DOM.interpQueueCount.textContent = queueLen;
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 8: TRANSCRIPT / DIALOGUE BUBBLE RENDERING
// Builds and appends dialogue bubbles to the live feed.
// ──────────────────────────────────────────────────────────────────────────

/**
 * _appendDialogueBubble() — Creates a DOM element for a dialogue entry
 * and appends it to the transcript feed.
 *
 * @param {Object} entry - A transcript entry from debate.js
 */
function _appendDialogueBubble(entry) {
  // Hide the "no debate" placeholder
  DOM.noDebatePlaceholder.classList.add('hidden');

  // Create the bubble container
  const bubble = document.createElement('div');
  bubble.className = 'dialogue-bubble';
  bubble.id = entry.id;

  // Determine alignment class
  if (entry.type === 'player_speech' || entry.type === 'player_protest') {
    bubble.classList.add('player');
  } else if (entry.type === 'procedural') {
    bubble.classList.add('procedural');
  } else if (entry.type === 'ruling') {
    bubble.classList.add('ruling');
    bubble.classList.add(entry.sustained ? 'sustained' : 'overruled');
  } else if (entry.type === 'vote_result') {
    bubble.classList.add('vote-result');
  } else if (entry.type === 'interpellation_question') {
    bubble.classList.add('player');
  } else if (entry.type === 'interpellation_answer') {
    bubble.classList.add('government');
  } else if (entry.speakerAlignment === 'government') {
    bubble.classList.add('government');
  } else if (entry.speakerAlignment === 'opposition') {
    bubble.classList.add('opposition');
  } else {
    bubble.classList.add('neutral');
  }

  // Add protestable flag
  if (entry.protestable) {
    bubble.classList.add('protestable');
  }

  // Avatar
  const avatar = document.createElement('div');
  avatar.className = 'dialogue-bubble__avatar';
  avatar.textContent = entry.speakerAvatar || '🏛️';
  if (entry.speakerColor) {
    avatar.style.borderColor = entry.speakerColor;
  }

  // Content wrapper
  const content = document.createElement('div');
  content.className = 'dialogue-bubble__content';

  // Header (name + party + role)
  const header = document.createElement('div');
  header.className = 'dialogue-bubble__header';

  const nameSpan = document.createElement('span');
  nameSpan.className = 'dialogue-bubble__name';
  nameSpan.textContent = entry.speakerName || 'Unknown';
  header.appendChild(nameSpan);

  if (entry.speakerPartyShort) {
    const partySpan = document.createElement('span');
    partySpan.className = 'dialogue-bubble__party';
    partySpan.textContent = entry.speakerPartyShort;
    header.appendChild(partySpan);
  }

  if (entry.speakerRole) {
    const roleSpan = document.createElement('span');
    roleSpan.className = 'dialogue-bubble__role';
    roleSpan.textContent = entry.speakerRole;
    header.appendChild(roleSpan);
  }

  content.appendChild(header);

  // Speech text
  const textDiv = document.createElement('div');
  textDiv.className = 'dialogue-bubble__text';
  textDiv.textContent = entry.text;
  content.appendChild(textDiv);

  // Timestamp
  const timeSpan = document.createElement('span');
  timeSpan.className = 'dialogue-bubble__timestamp';
  const now = new Date(entry.timestamp || Date.now());
  timeSpan.textContent = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  content.appendChild(timeSpan);

  // Assemble
  bubble.appendChild(avatar);
  bubble.appendChild(content);

  // Append to feed
  DOM.transcriptFeed.appendChild(bubble);
}

/**
 * _autoScrollTranscript() — Scrolls the transcript feed to the bottom
 * with a smooth animation, keeping the latest dialogue visible.
 */
function _autoScrollTranscript() {
  requestAnimationFrame(() => {
    DOM.transcriptFeed.scrollTop = DOM.transcriptFeed.scrollHeight;
  });
}

/**
 * _clearTranscript() — Removes all dialogue bubbles from the feed.
 */
function _clearTranscript() {
  // Remove all dialogue bubbles but keep the placeholder
  const bubbles = DOM.transcriptFeed.querySelectorAll('.dialogue-bubble');
  bubbles.forEach(b => b.remove());
  DOM.noDebatePlaceholder.classList.remove('hidden');
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 9: DEBATE UI STATE MANAGEMENT
// Functions that show/hide context-sensitive UI sections.
// ──────────────────────────────────────────────────────────────────────────

/**
 * _updateCurrentSpeakerBar() — Updates the speaker highlight bar.
 */
function _updateCurrentSpeakerBar(entry) {
  if (entry.type === 'procedural' || entry.type === 'ruling' || entry.type === 'vote_result') {
    DOM.currentSpeakerBar.className = 'current-speaker-bar neutral';
    DOM.currentSpeakerBar.classList.remove('hidden');
    DOM.speakerName.textContent = entry.speakerName;
    DOM.speakerParty.textContent = '';
    return;
  }

  if (entry.speakerAlignment === 'government') {
    DOM.currentSpeakerBar.className = 'current-speaker-bar government';
  } else if (entry.speakerAlignment === 'opposition') {
    DOM.currentSpeakerBar.className = 'current-speaker-bar opposition';
  } else {
    DOM.currentSpeakerBar.className = 'current-speaker-bar neutral';
  }
  DOM.currentSpeakerBar.classList.remove('hidden');

  DOM.speakerName.textContent = entry.speakerThaiTitle || entry.speakerName || '—';
  DOM.speakerParty.textContent = entry.speakerPartyShort || '';
}

/**
 * _updateDebateProgress() — Updates the progress bar during debate.
 */
function _updateDebateProgress() {
  const snap = getDebateSnapshot();
  if (!snap || !snap.isRunning) return;

  DOM.progressLabel.textContent = `${snap.progress}%`;
  DOM.progressFill.style.width = `${snap.progress}%`;
  DOM.progressRounds.textContent = `${snap.roundsCompleted}/${snap.totalRounds}`;
}

/**
 * _updateProtestButtons() — Enables/disables protest buttons based on
 * whether the current dialogue is protestable and cooldown status.
 */
function _updateProtestButtons(entry) {
  const snap = getDebateSnapshot();
  const canProtest = snap && snap.canProtest;

  DOM.btnProtestSlander.disabled = !canProtest;
  DOM.btnProtestOfftopic.disabled = !canProtest;
  DOM.btnProtestMisleading.disabled = !canProtest;
}

/**
 * _showSpeechSection() — Shows the player speech buttons and hides protest.
 */
function _showSpeechSection() {
  DOM.speechSection.classList.remove('hidden');
  DOM.protestSection.classList.add('hidden');

  DOM.btnSpeechAggressive.disabled = false;
  DOM.btnSpeechTechnical.disabled = false;
  DOM.btnSpeechDiplomatic.disabled = false;
}

/**
 * _hideSpeechSection() — Hides speech buttons and shows protest buttons.
 */
function _hideSpeechSection() {
  DOM.speechSection.classList.add('hidden');
  DOM.protestSection.classList.remove('hidden');
}

/**
 * _showVoteSection() — Shows the voting buttons.
 */
function _showVoteSection() {
  DOM.voteSection.classList.remove('hidden');
  DOM.protestSection.classList.add('hidden');
  DOM.speechSection.classList.add('hidden');

  DOM.btnVoteAye.disabled = false;
  DOM.btnVoteNay.disabled = false;
  DOM.btnVoteAbstain.disabled = false;
}

/**
 * _showTypingIndicator() — Shows/hides the "MP is typing..." indicator.
 */
function _showTypingIndicator(show, label) {
  if (show) {
    DOM.typingIndicator.classList.remove('hidden');
    if (label) DOM.typingLabel.textContent = label;
  } else {
    DOM.typingIndicator.classList.add('hidden');
  }
}

/**
 * _showProtestCooldown() — Shows the cooldown bar after a protest.
 */
function _showProtestCooldown() {
  const bar = DOM.protestCooldownBar;
  bar.classList.remove('hidden');

  // Reset animation
  const fill = bar.querySelector('.cooldown-bar__fill');
  fill.style.animation = 'none';
  // Force reflow
  void fill.offsetWidth;
  fill.style.animation = 'cooldown-drain 5s linear forwards';

  // Hide after cooldown
  setTimeout(() => {
    bar.classList.add('hidden');
  }, 5200);
}

/**
 * _showReturnToMacroButton() — After a vote, shows the "Return to Campaign HQ" button.
 * Step 2 Cleanup: "Stay in Parliament (Macro View)" button removed.
 * The only option is to return to Campaign HQ.
 */
function _showReturnToMacroButton() {
  // Replace vote section with the single return option
  DOM.voteSection.innerHTML = `
    <div class="action-section__title">
      <span class="action-section__title-dot" style="background: var(--player-primary);"></span>
      SESSION COMPLETE
    </div>
    <div class="action-buttons-group">
      <button class="action-btn advance" id="btn-return-campaign">
        <span class="action-btn__icon">🗳️</span>
        <div class="action-btn__content">
          <div class="action-btn__label">Return to Campaign HQ</div>
          <div class="action-btn__sub">กลับไปยังกองบัญชาการ — Continue the campaign</div>
        </div>
      </button>
    </div>
  `;

  // Return to Campaign button
  const btnCampaign = document.getElementById('btn-return-campaign');
  if (btnCampaign) {
    btnCampaign.addEventListener('click', () => {
      _saveParliamentReturnData();
      exitParliamentSession({
        capitalChange: _calculateSessionCapitalGain(),
        popularityChange: 0,
        debatesCompleted: 1
      });
      // Step 2: Flag for campaign to bypass Party Select screen
      localStorage.setItem('returnFromParliament', 'true');
      showToast("success", "📋 Returning to Campaign HQ with session results...");
      setTimeout(() => {
        window.location.href = '../campaign/index.html';
      }, 800);
    });
  }
}

/**
 * _saveParliamentReturnData() — Saves parliament session results
 * to sessionStorage for the campaign module to consume.
 * Part 3: Campaign ← Parliament data bridge.
 */
function _saveParliamentReturnData() {
  if (!parliamentState) return;

  const returnData = {
    capitalChange: _calculateSessionCapitalGain(),
    influenceEarned: parliamentState.playerInfluence || 0,
    debatesCompleted: parliamentState.weeklyStats.debatesParticipated,
    protestsWon: parliamentState.weeklyStats.protestsSucceeded,
    votesAttended: parliamentState.weeklyStats.votesAttended,
    interpellationsFiled: parliamentState.weeklyStats.interpellationsFiled,
    currentDay: parliamentState._campaignDay || null,
    billsInProgress: (parliamentState.activeBills || []).length,
    legislativeRecord: parliamentState.legislativeRecord || null,
    timestamp: Date.now()
  };

  try {
    sessionStorage.setItem('tps_parliament_to_campaign', JSON.stringify(returnData));
    console.log('[main.js] Parliament return data saved:', returnData);
  } catch (e) {
    console.warn('[main.js] Could not save return data:', e);
  }
}

/**
 * _calculateSessionCapitalGain() — Calculates the net political capital
 * gained during this parliament session.
 */
function _calculateSessionCapitalGain() {
  if (!parliamentState) return 0;

  const ws = parliamentState.weeklyStats;
  let gain = 0;

  // +3 per debate participated
  gain += ws.debatesParticipated * 3;
  // +5 per successful protest
  gain += ws.protestsSucceeded * 5;
  // +2 per vote attended
  gain += ws.votesAttended * 2;
  // +4 per interpellation filed
  gain += ws.interpellationsFiled * 4;

  return gain;
}

/**
 * _loadCampaignHandoff() — Reads campaign state from sessionStorage
 * (saved by campaign/timeline.js when entering parliament).
 */
function _loadCampaignHandoff() {
  try {
    const data = sessionStorage.getItem('tps_campaign_to_parliament');
    if (data) {
      const parsed = JSON.parse(data);
      sessionStorage.removeItem('tps_campaign_to_parliament');
      return parsed;
    }
  } catch (e) {
    console.warn('[main.js] Could not load campaign handoff:', e);
  }
  return null;
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 10: PHASE TRANSITION HANDLERS
// Manage the macro ↔ parliament UI swap.
// ──────────────────────────────────────────────────────────────────────────

/**
 * _switchToParliamentUI() — Swaps the UI into live debate mode.
 */
function _switchToParliamentUI() {
  // Action deck
  DOM.macroActions.classList.add('hidden');
  DOM.parliamentActions.classList.remove('hidden');

  // Center panel status
  DOM.centerStatusBadge.textContent = 'LIVE SESSION';
  DOM.centerStatusBadge.style.background = 'var(--danger-bg)';
  DOM.centerStatusBadge.style.color = 'var(--danger)';

  // Show debate UI elements
  DOM.topicBanner.classList.remove('hidden');
  DOM.currentSpeakerBar.classList.remove('hidden');
  DOM.debateProgress.classList.remove('hidden');

  // Reset sections
  DOM.protestSection.classList.remove('hidden');
  DOM.speechSection.classList.add('hidden');
  DOM.voteSection.classList.add('hidden');

  // Right panel badge
  DOM.rightContextBadge.textContent = 'PARLIAMENT';
  DOM.rightContextBadge.style.background = 'var(--danger-bg)';
  DOM.rightContextBadge.style.color = 'var(--danger)';

  // Top bar
  _renderTopBar();

  // Clear old transcript
  _clearTranscript();

  console.log("[main.js] UI switched to Parliament mode.");
}

/**
 * _switchToMacroUI() — Returns the UI to macro/timeline mode.
 */
function _switchToMacroUI() {
  // Action deck
  DOM.macroActions.classList.remove('hidden');
  DOM.parliamentActions.classList.add('hidden');

  // Center panel status
  DOM.centerStatusBadge.textContent = 'STANDBY';
  DOM.centerStatusBadge.style.background = 'var(--bg-hover)';
  DOM.centerStatusBadge.style.color = 'var(--text-muted)';

  // Hide debate UI elements
  DOM.topicBanner.classList.add('hidden');
  DOM.currentSpeakerBar.classList.add('hidden');
  DOM.debateProgress.classList.add('hidden');
  _showTypingIndicator(false);

  // Right panel badge
  DOM.rightContextBadge.textContent = 'MACRO';
  DOM.rightContextBadge.style.background = 'var(--info-bg)';
  DOM.rightContextBadge.style.color = 'var(--info)';

  // Restore vote section HTML (might have been modified by _showReturnToMacroButton)
  _restoreVoteSection();

  // Top bar
  _renderTopBar();

  // Render full UI
  _renderFullUI();

  console.log("[main.js] UI switched to Macro mode.");
}

/**
 * _restoreVoteSection() — Restores the vote section to its default state.
 */
function _restoreVoteSection() {
  DOM.voteSection.innerHTML = `
    <div class="action-section__title">
      <span class="action-section__title-dot" style="background: var(--speaker-primary);"></span>
      🗳️ CAST YOUR VOTE
    </div>
    <div class="action-buttons-group" id="vote-buttons">
      <button class="action-btn vote-aye" id="btn-vote-aye" data-vote="aye">
        <span class="action-btn__icon">✅</span>
        <div class="action-btn__content">
          <div class="action-btn__label">AYE — เห็นด้วย</div>
          <div class="action-btn__sub">Vote in favor of the bill</div>
        </div>
      </button>
      <button class="action-btn vote-nay" id="btn-vote-nay" data-vote="nay">
        <span class="action-btn__icon">❌</span>
        <div class="action-btn__content">
          <div class="action-btn__label">NAY — ไม่เห็นด้วย</div>
          <div class="action-btn__sub">Vote against the bill</div>
        </div>
      </button>
      <button class="action-btn vote-abstain" id="btn-vote-abstain" data-vote="abstain">
        <span class="action-btn__icon">⬜</span>
        <div class="action-btn__content">
          <div class="action-btn__label">ABSTAIN — งดออกเสียง</div>
          <div class="action-btn__sub">Decline to vote (-1 Capital)</div>
        </div>
      </button>
    </div>
  `;

  // Re-cache and rebind
  DOM.btnVoteAye = document.getElementById('btn-vote-aye');
  DOM.btnVoteNay = document.getElementById('btn-vote-nay');
  DOM.btnVoteAbstain = document.getElementById('btn-vote-abstain');

  if (DOM.btnVoteAye) DOM.btnVoteAye.addEventListener('click', () => _handleVote('aye'));
  if (DOM.btnVoteNay) DOM.btnVoteNay.addEventListener('click', () => _handleVote('nay'));
  if (DOM.btnVoteAbstain) DOM.btnVoteAbstain.addEventListener('click', () => _handleVote('abstain'));
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 11: ACTION HANDLERS
// Process player actions and connect them to engine functions.
// ──────────────────────────────────────────────────────────────────────────

/**
 * _handleAdvanceResult() — Processes the result of an advanceTime() call.
 * May trigger events or parliament transitions.
 */
function _handleAdvanceResult(result) {
  if (!result) return;

  // Parliament transition is handled by callbacks (onParliamentEntry)
  // Events are handled by callbacks (onConstituencyEvent, onCommitteeEvent)

  // Update the event log
  _addEventLogEntry(result);
}

/**
 * _handleProtest() — Handles a protest button click.
 * @param {string} reasonId - "slander" | "off_topic" | "misleading"
 */
function _handleProtest(reasonId) {
  const result = raiseProtest(reasonId);

  if (result.error) {
    showToast("warning", `⚠️ ${result.error}`);
    return;
  }

  // Result is handled by the onProtestResult callback
}

/**
 * _handlePlayerSpeech() — Handles a speech button click.
 * @param {string} stanceId - "aggressive" | "technical" | "diplomatic"
 */
function _handlePlayerSpeech(stanceId) {
  const result = playerSpeak(stanceId);

  if (result.error) {
    showToast("warning", `⚠️ ${result.error}`);
    return;
  }

  // Hide speech buttons
  _hideSpeechSection();

  // Show result toast
  if (result.success) {
    showToast("success", `🎤 ${result.narrative} (Capital: ${result.capitalChange > 0 ? '+' : ''}${result.capitalChange})`);
  } else {
    showToast("error", `🎤 ${result.narrative} (Capital: ${result.capitalChange > 0 ? '+' : ''}${result.capitalChange})`);
  }
}

/**
 * _handleVote() — Handles a vote button click.
 * @param {string} vote - "aye" | "nay" | "abstain"
 */
function _handleVote(vote) {
  // Disable all vote buttons
  DOM.btnVoteAye.disabled = true;
  DOM.btnVoteNay.disabled = true;
  DOM.btnVoteAbstain.disabled = true;

  const result = castVote(vote);

  if (result.error) {
    showToast("warning", `⚠️ ${result.error}`);
    return;
  }

  // Result is handled by the onVoteResult callback
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 12: MODAL MANAGEMENT
// Show/hide modals and populate their content.
// ──────────────────────────────────────────────────────────────────────────

/**
 * _openModal() — Shows a modal overlay.
 */
function _openModal(overlay) {
  overlay.classList.add('active');
}

/**
 * _closeModal() — Hides a modal overlay.
 */
function _closeModal(overlay) {
  overlay.classList.remove('active');
}

/**
 * _showRulingModal() — Displays the protest ruling modal.
 * @param {Object} result - From raiseProtest()
 */
function _showRulingModal(result) {
  DOM.rulingIcon.textContent = result.sustained ? '✅' : '❌';

  DOM.rulingVerdict.textContent = result.ruling;
  DOM.rulingVerdict.className = `ruling-modal__verdict ${result.sustained ? 'sustained' : 'overruled'}`;

  DOM.rulingThai.textContent = result.rulingThai;

  DOM.rulingDetails.innerHTML = result.sustained
    ? `Your protest against <strong>${result.speakerName}</strong> (${result.reasonLabel}) was <strong>sustained</strong> by the Speaker of the House.<br>The honorable member has been asked to withdraw their remarks.<br><span style="color:var(--text-muted); font-size:0.78rem;">${result.ruleReference}</span>`
    : `Your protest against <strong>${result.speakerName}</strong> (${result.reasonLabel}) was <strong>overruled</strong>.<br>The Speaker found no violation. The debate continues.<br><span style="color:var(--text-muted); font-size:0.78rem;">Success chance was ${result.successChance}%</span>`;

  DOM.rulingCapital.textContent = result.capitalChange > 0
    ? `+${result.capitalChange} Political Capital`
    : `${result.capitalChange} Political Capital`;
  DOM.rulingCapital.className = `ruling-modal__capital ${result.capitalChange >= 0 ? 'positive' : 'negative'}`;

  _openModal(DOM.rulingOverlay);
}

/**
 * _showEventModal() — Displays a constituency/committee event modal.
 * @param {Object} event - Event object from data.js
 * @param {string} type - "constituency" | "committee"
 */
function _showEventModal(event, type) {
  const icon = type === 'constituency' ? '🏘️' : '📋';
  DOM.eventModalTitle.textContent = `${icon} ${event.title}`;
  DOM.eventDescription.textContent = event.description;

  // Build choice buttons
  DOM.eventChoicesContainer.innerHTML = '';
  event.choices.forEach((choice, idx) => {
    const btn = document.createElement('button');
    btn.className = 'event-choice-btn';
    btn.id = `event-choice-${idx}`;

    let effectsHTML = '';
    for (const [key, val] of Object.entries(choice.effects)) {
      const label = key === 'politicalCapital' ? 'Cap'
        : key === 'localPopularity' ? 'Pop'
        : key === 'funds' ? 'Funds'
        : key;
      const isPos = val > 0;
      effectsHTML += `<span class="event-choice-btn__effect ${isPos ? 'positive' : 'negative'}">${isPos ? '+' : ''}${val} ${label}</span>`;
    }

    btn.innerHTML = `
      <div class="event-choice-btn__label">${choice.label}</div>
      <div class="event-choice-btn__label-thai">${choice.labelThai}</div>
      <div class="event-choice-btn__effects">${effectsHTML}</div>
    `;

    btn.addEventListener('click', () => {
      // Apply effects
      applyEffects(choice.effects);

      // Log the event
      logEvent(type, event.title, choice.narrative || choice.label, choice.effects);

      // Show narrative toast
      showToast("info", `📝 ${choice.narrative || choice.label}`);

      // Close modal
      _closeModal(DOM.eventOverlay);

      // Refresh stats
      _renderPlayerStats();

      // Add to event log in left panel
      _pushEventLogItem(event.title, choice.effects);
    });

    DOM.eventChoicesContainer.appendChild(btn);
  });

  _openModal(DOM.eventOverlay);
}

/**
 * _showParliamentNotification() — Shows the "Parliament is in session" modal.
 */
function _showParliamentNotification(schedule, isUrgent) {
  const s = parliamentState;
  const dayName = DAY_NAMES[s.currentDayIndex];
  const dayThai = DAY_NAMES_THAI[s.currentDayIndex];

  DOM.parliamentNotifyDay.textContent = `${dayName} — ${dayThai}`;

  const topic = getRandomDebateTopic();
  DOM.parliamentNotifyTopic.textContent = isUrgent
    ? `⚠️ URGENT: Censure debate or emergency motion expected today.`
    : `Today's agenda: ${topic.title}`;

  // Store the selected topic for session start
  DOM.parliamentNotifyOverlay._pendingTopic = topic;

  _openModal(DOM.parliamentNotifyOverlay);
}

/**
 * _startParliamentSession() — Begins the live debate.
 */
function _startParliamentSession() {
  // Switch UI
  _switchToParliamentUI();

  // Enter parliament formally
  const sessionInfo = enterParliamentSession();

  // Get the pending topic
  const topic = DOM.parliamentNotifyOverlay._pendingTopic || getRandomDebateTopic();

  // Update topic banner
  DOM.topicCategory.textContent = topic.category.toUpperCase() + ' BILL';
  DOM.topicTitle.textContent = topic.title;
  DOM.topicTitleThai.textContent = topic.titleThai;

  // Render any queued interpellations in the parliament panel
  _renderParliamentInterpellations();

  // Start the debate!
  runDebate(topic);
}

/**
 * _showInterpellationPicker() — Shows the interpellation topic selection modal.
 */
function _showInterpellationPicker() {
  const topics = getInterpellationTopics();
  const queued = parliamentState ? parliamentState.interpellationQueue.map(q => q.id) : [];

  DOM.interpTopicsContainer.innerHTML = '';

  topics.forEach(interp => {
    const isQueued = queued.includes(interp.id);

    const btn = document.createElement('button');
    btn.className = 'event-choice-btn';
    btn.disabled = isQueued;
    if (isQueued) btn.style.opacity = '0.4';

    btn.innerHTML = `
      <div class="event-choice-btn__label">${interp.question}</div>
      <div class="event-choice-btn__label-thai">${interp.questionThai}</div>
      <div class="event-choice-btn__effects">
        <span class="event-choice-btn__effect neutral" style="background: var(--info-bg); color: var(--info);">Target: ${interp.target}</span>
        <span class="event-choice-btn__effect ${interp.difficulty > 70 ? 'negative' : 'positive'}">Difficulty: ${interp.difficulty}%</span>
        ${isQueued ? '<span class="event-choice-btn__effect" style="background: var(--warning-bg); color: var(--warning);">QUEUED</span>' : ''}
      </div>
    `;

    if (!isQueued) {
      btn.addEventListener('click', () => {
        const result = queueInterpellation(interp.id);
        if (result.success) {
          showToast("success", `❓ Interpellation queued: "${interp.question.substring(0, 50)}..."`);
          _closeModal(DOM.interpOverlay);
          _renderActionDeck();
        } else {
          showToast("error", result.error);
        }
      });
    }

    DOM.interpTopicsContainer.appendChild(btn);
  });

  _openModal(DOM.interpOverlay);
}

/**
 * _renderParliamentInterpellations() — Populates the interpellation
 * buttons in the parliament action panel.
 */
function _renderParliamentInterpellations() {
  if (!parliamentState) return;

  const pending = parliamentState.interpellationQueue.filter(q => q.status === 'pending');

  if (pending.length === 0) {
    DOM.interpParliamentButtons.innerHTML = `
      <div style="font-size: 0.72rem; color: var(--text-muted); padding: 8px; text-align: center;">
        No interpellations queued for this session.
      </div>
    `;
    return;
  }

  DOM.interpParliamentButtons.innerHTML = '';
  pending.forEach(interp => {
    const btn = document.createElement('button');
    btn.className = 'action-btn interpellation';
    btn.innerHTML = `
      <span class="action-btn__icon">❓</span>
      <div class="action-btn__content">
        <div class="action-btn__label">${interp.question.substring(0, 40)}...</div>
        <div class="action-btn__sub">Target: ${interp.target}</div>
      </div>
    `;

    btn.addEventListener('click', () => {
      _showInterpellationResolutionModal(interp);
    });

    DOM.interpParliamentButtons.appendChild(btn);
  });
}

/**
 * _showInterpellationResolutionModal() — Mini-modal for resolving
 * an interpellation during a live session.
 */
function _showInterpellationResolutionModal(interp) {
  DOM.eventModalTitle.textContent = `❓ กระทู้ถามสด — Live Interpellation`;
  DOM.eventDescription.innerHTML = `
    <strong>Your question:</strong><br>
    ${interp.question}<br><br>
    <span class="font-thai">${interp.questionThai}</span><br><br>
    <span class="text-muted">Target: ${interp.target} | Difficulty: ${interp.difficulty}%</span>
  `;

  DOM.eventChoicesContainer.innerHTML = '';

  const stances = [
    { id: 'aggressive', label: '🔥 Press Hard (กดดัน)', desc: 'Aggressively demand specifics' },
    { id: 'diplomatic', label: '🤝 Seek Clarification (ขอความกระจ่าง)', desc: 'Politely but firmly' },
    { id: 'evade', label: '⬜ Accept Answer (ยอมรับคำตอบ)', desc: 'Accept and move on' }
  ];

  stances.forEach(stance => {
    const btn = document.createElement('button');
    btn.className = 'event-choice-btn';
    btn.innerHTML = `
      <div class="event-choice-btn__label">${stance.label}</div>
      <div class="event-choice-btn__label-thai">${stance.desc}</div>
    `;

    btn.addEventListener('click', () => {
      const result = resolveInterpellation(interp.id, stance.id);
      _closeModal(DOM.eventOverlay);

      if (result.error) {
        showToast("error", result.error);
      } else {
        _renderPlayerStats();
        _renderParliamentInterpellations();
      }
    });

    DOM.eventChoicesContainer.appendChild(btn);
  });

  _openModal(DOM.eventOverlay);
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 13: EVENT LOG (LEFT PANEL)
// Small scrolling log of recent events.
// ──────────────────────────────────────────────────────────────────────────

/**
 * _addEventLogEntry() — Adds a timeline advance entry to the event log.
 */
function _addEventLogEntry(result) {
  if (!result) return;

  const schedType = result.scheduleType;
  const text = schedType
    ? `${schedType.icon || '•'} ${result.dayName} ${result.timeName}: ${schedType.label}`
    : `${result.dayName} — ${result.timeName}`;

  _pushEventLogItem(text, null, 'neutral');
}

/**
 * _pushEventLogItem() — Pushes a formatted entry to the event log panel.
 */
function _pushEventLogItem(text, effects, type) {
  const item = document.createElement('div');
  item.className = 'event-log__item';

  if (effects) {
    const netEffect = (effects.politicalCapital || 0) + (effects.localPopularity || 0);
    if (netEffect > 0) item.classList.add('positive');
    else if (netEffect < 0) item.classList.add('negative');
    else item.classList.add('neutral');
  } else {
    item.classList.add(type || 'neutral');
  }

  item.textContent = text;

  DOM.eventLogList.insertBefore(item, DOM.eventLogList.firstChild);

  // Keep max 30 entries
  while (DOM.eventLogList.children.length > 30) {
    DOM.eventLogList.removeChild(DOM.eventLogList.lastChild);
  }
}

/**
 * _animateStatChange() — Adds a brief visual animation to a stat card.
 */
function _animateStatChange(statCardId, type) {
  const card = document.getElementById(statCardId);
  if (!card) return;

  card.classList.add('anim-shake');
  setTimeout(() => card.classList.remove('anim-shake'), 600);
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 14: TOAST NOTIFICATION SYSTEM
// Shows temporary notification banners in the top-right corner.
// ──────────────────────────────────────────────────────────────────────────

/**
 * showToast() — Displays a toast notification.
 *
 * @param {string} type - "success" | "error" | "warning" | "info"
 * @param {string} message - The message to display
 * @param {number} duration - How long to show (ms, default 4000)
 */
function showToast(type, message, duration = 4000) {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };

  toast.innerHTML = `
    <span class="toast__icon">${icons[type] || 'ℹ️'}</span>
    <span class="toast__text">${message}</span>
  `;

  DOM.toastContainer.appendChild(toast);

  // Auto-remove after duration
  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }, duration);
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 15: LEGISLATION UI (Step 4)
// Handles bill proposal modal, committee modal, active bills rendering.
// ──────────────────────────────────────────────────────────────────────────

/**
 * _showBillProposalModal() — Opens the bill proposal picker modal.
 * Renders available bill templates from legislation.js.
 */
function _showBillProposalModal() {
  if (typeof getLegislativeSummary !== 'function') {
    showToast('error', 'Legislation module not loaded.');
    return;
  }

  const summary = getLegislativeSummary();

  // Update modal header stats
  if (DOM.modalInfluenceDisplay) DOM.modalInfluenceDisplay.textContent = summary.currentInfluence;
  if (DOM.modalSlotsDisplay) DOM.modalSlotsDisplay.textContent = summary.slotsRemaining;

  // Build template cards
  DOM.billTemplatesContainer.innerHTML = '';

  if (summary.availableTemplates.length === 0) {
    DOM.billTemplatesContainer.innerHTML = `
      <div style="font-size: 0.82rem; color: var(--text-muted); padding: 16px; text-align: center;">
        ${summary.slotsRemaining === 0 ? 'All bill slots are full. Complete or withdraw an existing bill.' : 'All available bills have been proposed.'}
      </div>
    `;
  } else {
    summary.availableTemplates.forEach(template => {
      const card = document.createElement('button');
      card.className = 'event-choice-btn';
      card.disabled = !template.canAfford;
      if (!template.canAfford) card.style.opacity = '0.5';

      const diffColor = template.difficulty > 60 ? 'negative' : template.difficulty > 40 ? '' : 'positive';

      card.innerHTML = `
        <div class="event-choice-btn__label">📜 ${template.title}</div>
        <div class="event-choice-btn__label-thai">${template.titleThai}</div>
        <div style="font-size: 0.72rem; color: var(--text-secondary); margin: 4px 0;">${template.description}</div>
        <div class="event-choice-btn__effects">
          <span class="event-choice-btn__effect ${template.canAfford ? '' : 'negative'}">🔮 ${template.influenceCost} Influence</span>
          <span class="event-choice-btn__effect">✍️ ${template.requiredSignatures} sigs needed</span>
          <span class="event-choice-btn__effect ${diffColor}">⚡ ${template.difficulty}% difficulty</span>
          <span class="event-choice-btn__effect positive">👥 ${template.publicApproval}% approval</span>
        </div>
      `;

      card.addEventListener('click', () => {
        const result = proposeBill(template.id);
        _closeModal(DOM.billProposalOverlay);

        if (result.success) {
          showToast(result.toastType, result.toastMessage);
          _renderLegislationUI();
          _renderPlayerStats();
        } else {
          showToast('error', `❌ ${result.error}`);
        }
      });

      DOM.billTemplatesContainer.appendChild(card);
    });
  }

  _openModal(DOM.billProposalOverlay);
}

/**
 * _showCommitteeExpertModal() — Opens the committee expert selection modal.
 * @param {string} billId — The bill entering committee
 */
function _showCommitteeExpertModal(billId) {
  if (typeof getCommitteeChoices !== 'function') {
    showToast('error', 'Legislation module not loaded.');
    return;
  }

  const bill = (parliamentState?.activeBills || []).find(b => b.id === billId);
  if (!bill) {
    showToast('error', 'Bill not found.');
    return;
  }

  // Set modal title
  if (DOM.committeeBillTitle) {
    DOM.committeeBillTitle.textContent = `${bill.title} — ${bill.titleThai}`;
  }

  // Build expert choice cards
  const choices = getCommitteeChoices(billId);
  DOM.committeeExpertsContainer.innerHTML = '';

  choices.forEach(expert => {
    const card = document.createElement('button');
    card.className = 'event-choice-btn';

    let effectsHTML = '';
    expert.effectsSummary.forEach(effect => {
      const isPos = effect.includes('+');
      const isNeg = effect.includes('-') || effect.includes('Risk');
      effectsHTML += `<span class="event-choice-btn__effect ${isPos ? 'positive' : isNeg ? 'negative' : ''}">${effect}</span>`;
    });

    card.innerHTML = `
      <div class="event-choice-btn__label">${expert.icon} ${expert.label}</div>
      <div class="event-choice-btn__label-thai">${expert.labelThai}</div>
      <div style="font-size: 0.72rem; color: var(--text-secondary); margin: 4px 0;">${expert.description}</div>
      <div class="event-choice-btn__effects">
        ${effectsHTML}
        <span class="event-choice-btn__effect ${expert.riskLevel.includes('No risk') ? 'positive' : 'negative'}">${expert.riskLevel}</span>
      </div>
    `;

    card.addEventListener('click', () => {
      const result = runCommitteePhase(billId, expert.id);
      _closeModal(DOM.committeeOverlay);

      if (result.success) {
        showToast(result.toastType, result.toastMessage, 6000);
        if (result.scandalTriggered) {
          showToast('warning', `📰 ${result.narrative}`, 8000);
        }
        _renderLegislationUI();
        _renderPlayerStats();
      } else {
        showToast('error', `❌ ${result.error}`);
      }
    });

    DOM.committeeExpertsContainer.appendChild(card);
  });

  _openModal(DOM.committeeOverlay);
}

/**
 * _renderLegislationUI() — Updates all legislation-related UI elements.
 * Called after any legislative action.
 */
function _renderLegislationUI() {
  if (typeof getLegislativeSummary !== 'function') return;

  const summary = getLegislativeSummary();

  // Update influence display
  if (DOM.influenceDisplay) {
    DOM.influenceDisplay.textContent = `${summary.currentInfluence}/100`;
  }

  // Update bill slots badge
  if (DOM.billSlotsBadge) {
    DOM.billSlotsBadge.textContent = summary.slotsRemaining;
    DOM.billSlotsBadge.style.background = summary.slotsRemaining === 0 ? 'var(--danger)' : 'var(--warning)';
  }

  // Render active bills pipeline
  if (DOM.activeBillsList) {
    if (summary.activeBills.length === 0) {
      DOM.activeBillsList.innerHTML = `
        <div style="font-size: 0.72rem; color: var(--text-muted); padding: 8px; text-align: center;">
          No bills in the pipeline.
        </div>
      `;
    } else {
      DOM.activeBillsList.innerHTML = '';
      summary.activeBills.forEach(bill => {
        const card = document.createElement('div');
        card.className = 'stat-mini';
        card.style.cssText = 'padding: 6px 8px; margin-bottom: 4px; background: var(--bg-hover); border-radius: 6px; cursor: pointer;';

        // Stage color
        const stageColors = {
          signatures: 'var(--warning)',
          first_reading: 'var(--info)',
          committee: 'var(--speaker-primary)',
          second_reading: 'var(--success)',
          vote: 'var(--danger)',
          passed: 'var(--success)',
          defeated: 'var(--danger)'
        };
        const stageColor = stageColors[bill.stage] || 'var(--text-muted)';

        let actionHTML = '';
        if (bill.canGatherSignatures) {
          actionHTML = `<div style="font-size: 0.6rem; color: var(--warning); margin-top: 2px;">📝 ${bill.signatures}/${bill.requiredSignatures} signatures (${bill.signatureProgress}%) — Click to lobby</div>`;
        } else if (bill.canEnterCommittee) {
          actionHTML = `<div style="font-size: 0.6rem; color: var(--speaker-primary); margin-top: 2px;">⚖️ Ready for Committee — Click to choose expert</div>`;
        } else if (bill.isReadyForVote) {
          actionHTML = `<div style="font-size: 0.6rem; color: var(--success); margin-top: 2px;">🗳️ Pass chance: ${bill.passChance}% — Awaiting Second Reading debate</div>`;
        }

        card.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 0.7rem; font-weight: 600; color: var(--text-bright);">${bill.title}</span>
            <span style="font-size: 0.55rem; padding: 1px 6px; border-radius: 3px; background: ${stageColor}20; color: ${stageColor}; font-weight: 700; text-transform: uppercase;">${bill.stage}</span>
          </div>
          ${actionHTML}
        `;

        // Click handler for bill actions
        card.addEventListener('click', () => {
          if (bill.canGatherSignatures) {
            _handleSignatureLobby(bill.id);
          } else if (bill.canEnterCommittee) {
            _showCommitteeExpertModal(bill.id);
          }
        });

        DOM.activeBillsList.appendChild(card);
      });
    }
  }
}

/**
 * _handleSignatureLobby() — Handles a signature gathering attempt.
 * @param {string} billId — Active bill ID
 */
function _handleSignatureLobby(billId) {
  if (typeof runSignaturePhase !== 'function') {
    showToast('error', 'Legislation module not loaded.');
    return;
  }

  const result = runSignaturePhase(billId);

  if (result.success !== undefined) {
    showToast(result.toastType || 'info', result.toastMessage || result.message);

    if (result.stageAdvanced) {
      // Bill moved to committee — prompt for expert selection
      setTimeout(() => {
        _showCommitteeExpertModal(billId);
      }, 1500);
    }

    _renderLegislationUI();
    _renderPlayerStats();
  } else {
    showToast('error', `❌ ${result.error}`);
  }
}


// ──────────────────────────────────────────────────────────────────────────
// SECTION 16: BOOT
// Start the game when the page loads.
// ──────────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initGame();
});


// ──────────────────────────────────────────────────────────────────────────
// SECTION 16: MODULE INITIALIZATION LOG
// ──────────────────────────────────────────────────────────────────────────

console.log("═══════════════════════════════════════════════════════════");
console.log("[parliament-test/main.js] UI Orchestrator loaded.");
console.log("  → Awaiting DOMContentLoaded to initialize game.");
console.log("═══════════════════════════════════════════════════════════");
