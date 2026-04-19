// ═══════════════════════════════════════════════════════════════════════════
// TPS — /shared/settings.js
// Centralized GlobalState, Settings Modal, and Persistence Engine
// ═══════════════════════════════════════════════════════════════════════════
// This file is loaded AFTER localization.js on every page.
// It defines TPSGlobalState, injects the gear icon + settings modal,
// and handles language / debate speed / difficulty display / wipe data.
// ═══════════════════════════════════════════════════════════════════════════


// ═══════════════════════════════════════════════════════════════════════════
// 1. GLOBAL STATE — Initialized from localStorage
// ═══════════════════════════════════════════════════════════════════════════

const TPSGlobalState = {
  /** @type {'EN'|'TH'} */
  language:     localStorage.getItem('tps_language') || 'EN',

  /** @type {1|2|3} — Multiplier for debate setInterval speed */
  debateSpeed:  parseInt(localStorage.getItem('tps_debate_speed'), 10) || 1,

  /** @type {'easy'|'normal'|'hard'|null} — Set permanently on campaign start */
  difficulty:   localStorage.getItem('tps_difficulty') || null,

  // ── Persistence helpers ──
  save() {
    localStorage.setItem('tps_language', this.language);
    localStorage.setItem('tps_debate_speed', String(this.debateSpeed));
    // difficulty is saved separately on campaign start — never overwritten here
  },

  setLanguage(lang) {
    this.language = lang;
    this.save();
    // Rebuild the settings modal text in the new language
    _updateSettingsModalText();
    // Apply data-i18n translations across the whole page
    if (typeof applyTranslations === 'function') applyTranslations();
    // Dispatch event so modules can react (only if changeLanguage didn't already fire it)
    window.dispatchEvent(new CustomEvent('tps:language-changed', { detail: { language: lang } }));
  },

  setDebateSpeed(speed) {
    this.debateSpeed = speed;
    this.save();
    window.dispatchEvent(new CustomEvent('tps:debate-speed-changed', { detail: { speed } }));
  },

  getDifficultyLabel() {
    const d = this.difficulty;
    if (!d) return t('difficulty_not_set');
    return t('difficulty_' + d);
  },

  /** Numeric multiplier for difficulty scaling (0 = easy, 1 = normal, 2 = hard) */
  getDifficultyMultiplier() {
    const map = { easy: 0, normal: 1, hard: 2 };
    return map[this.difficulty] ?? 1;
  },

  wipeAllData() {
    // ── STEP 1 FIX: Comprehensive wipe with language preservation ──

    // 1. Preserve the current language so the user stays in their preferred language
    const savedLang = localStorage.getItem('tps_language') || 'EN';

    // 2. Nuclear clear — wipe ALL localStorage keys (tps_*, campaign_*, maingame_*, legacy)
    //    This guarantees no stale UI state flags survive the wipe.
    localStorage.clear();

    // 3. Also clear sessionStorage (campaign state snapshots, etc.)
    sessionStorage.clear();

    // 4. Restore ONLY the language preference
    localStorage.setItem('tps_language', savedLang);

    // 5. Reset in-memory state
    this.language = savedLang;
    this.debateSpeed = 1;
    this.difficulty = null;

    console.log(`[settings.js] All save data wiped. Language preserved: ${savedLang}`);
  }
};


// ═══════════════════════════════════════════════════════════════════════════
// 2. SETTINGS MODAL — CSS (Injected into <head>)
// ═══════════════════════════════════════════════════════════════════════════

const _settingsCSS = `
/* ── Settings Gear FAB ── */
#tps-settings-fab {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 9999;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 1px solid rgba(212, 175, 55, 0.25);
  background: linear-gradient(135deg, rgba(15, 21, 40, 0.95) 0%, rgba(20, 28, 54, 0.95) 100%);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  color: #d4af37;
  font-size: 1.35rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow:
    0 4px 24px rgba(0, 0, 0, 0.4),
    0 0 0 1px rgba(212, 175, 55, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
  transition: all 0.35s cubic-bezier(0.22, 1, 0.36, 1);
  animation: tps-fab-entrance 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.5s both;
}

@keyframes tps-fab-entrance {
  from {
    opacity: 0;
    transform: scale(0.3) rotate(-180deg);
  }
  to {
    opacity: 1;
    transform: scale(1) rotate(0deg);
  }
}

#tps-settings-fab:hover {
  transform: rotate(45deg) scale(1.1);
  border-color: rgba(212, 175, 55, 0.5);
  box-shadow:
    0 8px 32px rgba(212, 175, 55, 0.15),
    0 4px 24px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  color: #f5d778;
}

#tps-settings-fab:active {
  transform: rotate(45deg) scale(0.95);
}

/* ── Settings Modal Overlay ── */
#tps-settings-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: rgba(6, 10, 22, 0.8);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  display: none;
  align-items: center;
  justify-content: center;
  animation: tps-overlay-in 0.3s ease;
}

#tps-settings-overlay.open {
  display: flex;
}

@keyframes tps-overlay-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

/* ── Modal Box ── */
#tps-settings-modal {
  background: linear-gradient(180deg, #0f1528 0%, #0a0e1a 100%);
  border: 1px solid rgba(212, 175, 55, 0.18);
  border-radius: 16px;
  width: 420px;
  max-width: 92vw;
  max-height: 85vh;
  overflow-y: auto;
  box-shadow:
    0 24px 80px rgba(0, 0, 0, 0.6),
    0 0 0 1px rgba(212, 175, 55, 0.05),
    inset 0 1px 0 rgba(255, 255, 255, 0.03);
  animation: tps-modal-in 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes tps-modal-in {
  from {
    opacity: 0;
    transform: translateY(24px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* ── Modal Header ── */
.tps-sm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 16px;
  border-bottom: 1px solid rgba(212, 175, 55, 0.1);
}

.tps-sm-header h2 {
  font-family: 'Inter', 'Segoe UI', sans-serif;
  font-size: 1.05rem;
  font-weight: 700;
  color: #e8eaf0;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  letter-spacing: 0.02em;
}

.tps-sm-header h2 .tps-sm-icon {
  font-size: 1.2rem;
  color: #d4af37;
}

.tps-sm-close {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.03);
  color: #9ba3b8;
  font-size: 1.1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  line-height: 1;
}

.tps-sm-close:hover {
  background: rgba(220, 53, 69, 0.12);
  border-color: rgba(220, 53, 69, 0.3);
  color: #ff5a67;
}

/* ── Modal Body ── */
.tps-sm-body {
  padding: 20px 24px 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ── Setting Section ── */
.tps-sm-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tps-sm-label {
  font-size: 0.72rem;
  font-weight: 700;
  color: #6b748a;
  text-transform: uppercase;
  letter-spacing: 1.5px;
}

/* ── Language Toggle ── */
.tps-sm-lang-toggle {
  display: flex;
  gap: 0;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid rgba(212, 175, 55, 0.15);
}

.tps-sm-lang-btn {
  flex: 1;
  padding: 10px 16px;
  border: none;
  background: rgba(15, 21, 40, 0.6);
  color: #9ba3b8;
  font-family: 'Inter', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.tps-sm-lang-btn:not(:last-child) {
  border-right: 1px solid rgba(212, 175, 55, 0.1);
}

.tps-sm-lang-btn:hover {
  background: rgba(212, 175, 55, 0.06);
  color: #e8eaf0;
}

.tps-sm-lang-btn.active {
  background: linear-gradient(135deg, rgba(212, 175, 55, 0.15) 0%, rgba(212, 175, 55, 0.06) 100%);
  color: #f5d778;
  box-shadow: inset 0 1px 0 rgba(212, 175, 55, 0.1);
}

/* ── Debate Speed Slider ── */
.tps-sm-speed-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.tps-sm-speed-slider {
  flex: 1;
  -webkit-appearance: none;
  appearance: none;
  height: 6px;
  border-radius: 3px;
  background: linear-gradient(90deg, #1a2544 0%, #2a3d6b 100%);
  outline: none;
  cursor: pointer;
}

.tps-sm-speed-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: linear-gradient(135deg, #d4af37 0%, #f5d778 100%);
  border: 2px solid rgba(10, 14, 26, 0.8);
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(212, 175, 55, 0.3);
  transition: transform 0.15s ease;
}

.tps-sm-speed-slider::-webkit-slider-thumb:hover {
  transform: scale(1.15);
}

.tps-sm-speed-slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: linear-gradient(135deg, #d4af37 0%, #f5d778 100%);
  border: 2px solid rgba(10, 14, 26, 0.8);
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(212, 175, 55, 0.3);
}

.tps-sm-speed-value {
  font-family: 'JetBrains Mono', 'Consolas', monospace;
  font-size: 0.85rem;
  font-weight: 600;
  color: #d4af37;
  min-width: 80px;
  text-align: right;
  white-space: nowrap;
}

/* ── Difficulty Display (Read-Only) ── */
.tps-sm-difficulty-badge {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: rgba(15, 21, 40, 0.6);
  border: 1px solid rgba(212, 175, 55, 0.1);
  border-radius: 10px;
}

.tps-sm-diff-icon {
  font-size: 1.3rem;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(212, 175, 55, 0.08);
  border-radius: 8px;
  border: 1px solid rgba(212, 175, 55, 0.1);
}

.tps-sm-diff-text {
  flex: 1;
}

.tps-sm-diff-label {
  font-size: 0.88rem;
  font-weight: 700;
  color: #e8eaf0;
}

.tps-sm-diff-sub {
  font-size: 0.7rem;
  color: #6b748a;
  margin-top: 2px;
}

.tps-sm-diff-label.easy   { color: #2A9D8F; }
.tps-sm-diff-label.normal { color: #d4af37; }
.tps-sm-diff-label.hard   { color: #E63946; }

.tps-sm-diff-icon.easy   { border-color: rgba(42, 157, 143, 0.25); background: rgba(42, 157, 143, 0.08); }
.tps-sm-diff-icon.normal { border-color: rgba(212, 175, 55, 0.25); background: rgba(212, 175, 55, 0.08); }
.tps-sm-diff-icon.hard   { border-color: rgba(230, 57, 70, 0.25); background: rgba(230, 57, 70, 0.08); }

/* ── Divider ── */
.tps-sm-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.12), transparent);
  border: none;
  margin: 4px 0;
}

/* ── Wipe Save Button ── */
.tps-sm-wipe-btn {
  width: 100%;
  padding: 12px 16px;
  border-radius: 10px;
  border: 1px solid rgba(220, 53, 69, 0.2);
  background: rgba(220, 53, 69, 0.06);
  color: #ff5a67;
  font-family: 'Inter', sans-serif;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.tps-sm-wipe-btn:hover {
  background: rgba(220, 53, 69, 0.12);
  border-color: rgba(220, 53, 69, 0.4);
  box-shadow: 0 4px 16px rgba(220, 53, 69, 0.1);
}

.tps-sm-wipe-btn:active {
  transform: scale(0.98);
}

/* ── Version Tag ── */
.tps-sm-version {
  text-align: center;
  font-size: 0.62rem;
  color: #3a4259;
  letter-spacing: 0.1em;
  margin-top: -4px;
}
`;


// ═══════════════════════════════════════════════════════════════════════════
// 3. SETTINGS MODAL — HTML Template (Generated dynamically)
// ═══════════════════════════════════════════════════════════════════════════

function _buildSettingsHTML() {
  const diff = TPSGlobalState.difficulty;
  const diffLabel = TPSGlobalState.getDifficultyLabel();
  const diffClass = diff || 'none';
  const diffIcon = diff === 'easy' ? '🟢' : diff === 'hard' ? '🔴' : diff === 'normal' ? '🟡' : '⚪';
  const diffDesc = diff ? t('difficulty_desc_' + diff) : '';
  const speedLabel = t('speed_' + TPSGlobalState.debateSpeed + 'x');

  return `
    <div class="tps-sm-header">
      <h2><span class="tps-sm-icon">⚙️</span> <span id="tps-sm-title-text">${t('settings_title')}</span></h2>
      <button class="tps-sm-close" id="tps-sm-close" title="${t('settings_close')}">✕</button>
    </div>
    <div class="tps-sm-body">

      <!-- Language Toggle -->
      <div class="tps-sm-section">
        <div class="tps-sm-label" id="tps-sm-lang-label">${t('settings_language')}</div>
        <div class="tps-sm-lang-toggle">
          <button class="tps-sm-lang-btn ${TPSGlobalState.language === 'EN' ? 'active' : ''}"
                  data-lang="EN" id="tps-sm-lang-en">
            🇬🇧 English
          </button>
          <button class="tps-sm-lang-btn ${TPSGlobalState.language === 'TH' ? 'active' : ''}"
                  data-lang="TH" id="tps-sm-lang-th">
            🇹🇭 ภาษาไทย
          </button>
        </div>
      </div>

      <!-- Debate Speed -->
      <div class="tps-sm-section">
        <div class="tps-sm-label" id="tps-sm-speed-label">${t('settings_debate_speed')}</div>
        <div class="tps-sm-speed-row">
          <input type="range" class="tps-sm-speed-slider" id="tps-sm-speed"
                 min="1" max="3" step="1" value="${TPSGlobalState.debateSpeed}">
          <span class="tps-sm-speed-value" id="tps-sm-speed-display">${speedLabel}</span>
        </div>
      </div>

      <!-- Difficulty (Read-only) -->
      <div class="tps-sm-section">
        <div class="tps-sm-label" id="tps-sm-diff-label">${t('settings_difficulty')}</div>
        <div class="tps-sm-difficulty-badge">
          <div class="tps-sm-diff-icon ${diffClass}" id="tps-sm-diff-icon">${diffIcon}</div>
          <div class="tps-sm-diff-text">
            <div class="tps-sm-diff-label ${diffClass}" id="tps-sm-diff-value">${diffLabel}</div>
            <div class="tps-sm-diff-sub" id="tps-sm-diff-desc">${diffDesc || t('difficulty_desc_normal')}</div>
          </div>
        </div>
      </div>

      <hr class="tps-sm-divider">

      <!-- Wipe Save Data -->
      <div class="tps-sm-section">
        <button class="tps-sm-wipe-btn" id="tps-sm-wipe">
          🗑️ <span id="tps-sm-wipe-text">${t('settings_wipe')}</span>
        </button>
      </div>

      <div class="tps-sm-version">TPS v1.0.1 — Thailand Political Simulation</div>
    </div>
  `;
}


// ═══════════════════════════════════════════════════════════════════════════
// 4. DOM INJECTION — Called on DOMContentLoaded
// ═══════════════════════════════════════════════════════════════════════════

function _injectSettingsUI() {
  // ── Inject CSS ──
  const style = document.createElement('style');
  style.id = 'tps-settings-styles';
  style.textContent = _settingsCSS;
  document.head.appendChild(style);

  // ── Inject Gear FAB ──
  const fab = document.createElement('button');
  fab.id = 'tps-settings-fab';
  fab.title = 'Settings';
  fab.setAttribute('aria-label', 'Open Settings');
  fab.innerHTML = '⚙️';
  document.body.appendChild(fab);

  // ── Inject Overlay + Modal ──
  const overlay = document.createElement('div');
  overlay.id = 'tps-settings-overlay';
  const modal = document.createElement('div');
  modal.id = 'tps-settings-modal';
  modal.innerHTML = _buildSettingsHTML();
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // ── Bind Events ──
  _bindSettingsEvents();
}


// ═══════════════════════════════════════════════════════════════════════════
// 5. EVENT BINDING
// ═══════════════════════════════════════════════════════════════════════════

function _bindSettingsEvents() {
  const fab = document.getElementById('tps-settings-fab');
  const overlay = document.getElementById('tps-settings-overlay');
  const closeBtn = document.getElementById('tps-sm-close');

  // Open
  fab.addEventListener('click', () => {
    // Refresh difficulty from localStorage (may have changed since page load)
    TPSGlobalState.difficulty = localStorage.getItem('tps_difficulty') || null;
    document.getElementById('tps-settings-modal').innerHTML = _buildSettingsHTML();
    _bindSettingsInnerEvents();
    overlay.classList.add('open');
  });

  // Close (X button)
  closeBtn.addEventListener('click', () => overlay.classList.remove('open'));

  // Close (click overlay bg)
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.remove('open');
  });

  // Close (Escape key)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('open')) {
      overlay.classList.remove('open');
    }
  });

  // Bind inner events on first load
  _bindSettingsInnerEvents();
}


function _bindSettingsInnerEvents() {
  // ── Language Buttons ──
  document.querySelectorAll('.tps-sm-lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const lang = btn.dataset.lang;
      // Use the global changeLanguage() from localization.js if available
      if (typeof changeLanguage === 'function') {
        changeLanguage(lang);
      } else {
        TPSGlobalState.setLanguage(lang);
      }
      // Update button active state
      document.querySelectorAll('.tps-sm-lang-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      // Refresh the settings modal text
      _updateSettingsModalText();
      // Reload page after short delay to catch dynamically-generated JS strings
      // (debate feed, campaign log, MP rosters, etc.)
      setTimeout(() => window.location.reload(), 300);
    });
  });

  // ── Debate Speed Slider ──
  const slider = document.getElementById('tps-sm-speed');
  const display = document.getElementById('tps-sm-speed-display');
  if (slider) {
    slider.addEventListener('input', () => {
      const val = parseInt(slider.value, 10);
      TPSGlobalState.setDebateSpeed(val);
      display.textContent = t('speed_' + val + 'x');
    });
  }

  // ── Wipe Save Data ──
  const wipeBtn = document.getElementById('tps-sm-wipe');
  if (wipeBtn) {
    wipeBtn.addEventListener('click', () => {
      // 1. Confirm with bilingual prompt
      if (!confirm(t('settings_wipe_confirm'))) return;

      // 2. Wipe all data (preserves language)
      TPSGlobalState.wipeAllData();

      // 3. Show success notification — bilingual alert
      alert(t('settings_wipe_done') + '\n\n' +
        'Save data wiped successfully. / ลบข้อมูลการเล่นเรียบร้อยแล้ว');

      // 4. Hard redirect to Campaign Party Select screen.
      //    This is the canonical "start of the game" entry point.
      //    Using '../campaign/index.html' works from any module:
      //      /campaign/       → ../campaign/index.html ✓
      //      /parliament-test/ → ../campaign/index.html ✓
      //      /main-game/      → ../campaign/index.html ✓
      window.location.href = '../campaign/index.html';
    });
  }

  // ── Close button (re-bind after innerHTML rebuild) ──
  const closeBtn = document.getElementById('tps-sm-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      document.getElementById('tps-settings-overlay').classList.remove('open');
    });
  }
}


// ═══════════════════════════════════════════════════════════════════════════
// 6. LIVE TEXT UPDATE — Called when language changes
// ═══════════════════════════════════════════════════════════════════════════

function _updateSettingsModalText() {
  const titleEl = document.getElementById('tps-sm-title-text');
  if (titleEl) titleEl.textContent = t('settings_title');

  const langLabel = document.getElementById('tps-sm-lang-label');
  if (langLabel) langLabel.textContent = t('settings_language');

  const speedLabel = document.getElementById('tps-sm-speed-label');
  if (speedLabel) speedLabel.textContent = t('settings_debate_speed');

  const speedDisplay = document.getElementById('tps-sm-speed-display');
  if (speedDisplay) speedDisplay.textContent = t('speed_' + TPSGlobalState.debateSpeed + 'x');

  const diffLabel = document.getElementById('tps-sm-diff-label');
  if (diffLabel) diffLabel.textContent = t('settings_difficulty');

  const diffValue = document.getElementById('tps-sm-diff-value');
  if (diffValue) diffValue.textContent = TPSGlobalState.getDifficultyLabel();

  const diffDesc = document.getElementById('tps-sm-diff-desc');
  if (diffDesc) {
    const d = TPSGlobalState.difficulty;
    diffDesc.textContent = d ? t('difficulty_desc_' + d) : t('difficulty_desc_normal');
  }

  const wipeText = document.getElementById('tps-sm-wipe-text');
  if (wipeText) wipeText.textContent = t('settings_wipe');
}


// ═══════════════════════════════════════════════════════════════════════════
// 7. tpsLangChanged LISTENER — Auto-rebuild modal on language change
// ═══════════════════════════════════════════════════════════════════════════
// If changeLanguage() is called externally (e.g. from localization.js),
// this listener ensures the settings modal's HTML & difficulty badge update.

window.addEventListener('tpsLangChanged', (e) => {
  const modal = document.getElementById('tps-settings-modal');
  if (modal) {
    // Refresh difficulty from localStorage in case it changed
    TPSGlobalState.difficulty = localStorage.getItem('tps_difficulty') || null;
    // Rebuild the entire modal HTML in the new language
    modal.innerHTML = _buildSettingsHTML();
    _bindSettingsInnerEvents();
    console.log(`[settings.js] Modal rebuilt for language: ${e.detail?.language}`);
  }
});


// ═══════════════════════════════════════════════════════════════════════════
// 8. AUTO-INITIALIZE — Inject on DOMContentLoaded
// ═══════════════════════════════════════════════════════════════════════════

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _injectSettingsUI);
} else {
  // DOM already loaded (script loaded defer/async or at bottom)
  _injectSettingsUI();
}

console.log(`[settings.js] Loaded — Lang: ${TPSGlobalState.language}, Speed: ${TPSGlobalState.debateSpeed}×, Diff: ${TPSGlobalState.difficulty || 'not set'}`);
