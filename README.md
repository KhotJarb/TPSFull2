# 🏛️ Thailand Political Simulation (TPS) — Version 1.0.1 Test

> **An advanced political RPG and simulation focusing on the life of a Thai Member of Parliament, combining campaign strategy with deep parliamentary roleplay.**

[![License: MIT](https://img.shields.io/badge/License-MIT-gold.svg)](#license)
[![Version](https://img.shields.io/badge/Version-1.0.1_Test-blue.svg)](#)
[![Platform](https://img.shields.io/badge/Platform-Browser_(Zero_Install)-green.svg)](#getting-started)
[![Language](https://img.shields.io/badge/Language-🇬🇧_EN_|_🇹🇭_TH-orange.svg)](#localization)

---

## 📖 Overview

**Thailand Political Simulation (TPS)** is a standalone, browser-based political strategy game built entirely in vanilla JavaScript — no frameworks, no build tools, no installation required. Open `index.html` and play.

You begin as a rising political figure navigating the treacherous landscape of Thai politics. Lead your party through an 8-week national campaign, win seats in the House of Representatives, survive live parliamentary debates, and attempt to form a stable governing coalition — all while managing media scrutiny, military patience, and public approval.

### 🎮 The Player Journey

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  📢 CAMPAIGN    │     │  🏛️ PARLIAMENT   │     │  👔 GOVERNING   │
│  MODULE         │────▶│     MODULE      │────▶│     MODULE      │
│                 │     │                  │     │                 │
│ • Choose Party  │     │ • Live Debates   │     │ • Crisis Events │
│ • 8-Week Race   │     │ • Point of Order │     │ • Propose Laws  │
│ • Rallies & IO  │     │ • Vote on Bills  │     │ • Coalition Mgmt│
│ • Election Day  │     │ • Interpellations│     │ • 48-Month Term │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

---

## 🆕 New Features in v1.0.1 Test

### 🌐 Shared Settings & Localization
- **Universal TH/EN Support** — Every UI label, button, modal, and notification is fully bilingual. Switch languages at any time via the ⚙️ Settings gear or the header **EN / TH** toggle (Parliament module).
- **Live Debate Speed Controls** — Adjust AI MP speaking speed (1×, 2×, 3×) in real-time without restarting the debate.
- **Settings Persistence** — Language and speed preferences are saved in `localStorage` and survive page reloads, tab closes, and cross-module navigation.

### 💾 Persistent Game State
- **Seamless Module Transitions** — The game now remembers your campaign progress (Week, Day, Funds, Scrutiny, Poll Shares, Campaign Log) even after entering and returning from the Parliament module.
- **Dual-Layer Persistence** — Campaign state is saved to both `localStorage` (survives browser restarts) and `sessionStorage` (fast same-tab restores) for maximum reliability.
- **Wipe Save Data** — A single button in Settings clears all progress across all modules and routes the player back to the Campaign Party Select screen. Language preference is preserved.

### 🏛️ Parliament RPG Module
- **Immersive Live Debate Feed** — Watch AI MPs deliver speeches in real-time with a scrolling transcript, typing indicators, and party-colored dialogue bubbles.
- **"Point of Order" (Protest) Mechanics** — Raise protests against AI speeches for slander, off-topic remarks, or misleading claims. The Speaker of the House rules on each protest with randomized outcomes that affect your Political Capital.
- **Dynamic AI MP Dialogues** — Restructured dialogue templates with strict language separation. AI MPs speak purely in the player's chosen language — no more mixed Thai/English lines.
- **Player Speech System** — Choose your stance (Aggressive, Technical, Diplomatic) when it's your turn to address the House. Each stance has different risk/reward profiles.

### 📜 Legislative Depth
- **Bill Initiation Process** — Propose bills that require collecting signatures from other MPs. Costs Influence points and consumes a bill slot.
- **Committee Phase** — Each bill goes through a committee review where you choose between NGO experts (ethical, slower) and lobbyists (fast, risky). Your choice permanently affects the bill's outcome and your reputation.
- **Parliamentary Voting** — After debates conclude, cast your vote (Aye, Nay, Abstain) and watch the full party-by-party breakdown of the tally.

### ⚖️ Permanent Difficulty System
- **"Choose Once" Design** — Select Easy, Normal, or Hard at the start of your campaign. The choice is locked permanently and cannot be changed mid-playthrough.
- **Difficulty Scaling** — Affects action costs, scrutiny gains, fundraise returns, AI campaign intensity, lobbyist event frequency, and election math. Hard mode is genuinely punishing.

---

## 🐛 Bug Fixes in v1.0.1

| Bug | Resolution |
|---|---|
| UI resetting to Party Select when changing languages | Implemented `localStorage`-based UI state persistence (`campaign_ui_state`, `maingame_ui_state`) that survives page reloads |
| Campaign Timeline reset (Week/Day/Stats) when returning from Parliament | Added `saveCampaignState()` / `loadCampaignState()` with `localStorage` persistence. State is saved before parliament navigation and restored on return |
| Mixed language (Thai/English) dialogues on "The Floor" | Restructured `DIALOGUE_TEMPLATES`, `SPEAKER_PROCEDURAL_LINES`, and `PLAYER_SPEECH_LINES` into bilingual `{ en: [...], th: [...] }` objects with `_getDebateLang()` as single source of truth |
| Wipe Save Data not routing to initial screen | Changed redirect from `location.reload()` to `window.location.href = '../campaign/index.html'` with full `localStorage.clear()` + `sessionStorage.clear()` |
| Main Game dashboard resetting on language change | Added `maingame_ui_state` flag with clear paths on quit, restart, and game over |
| Settings modal not updating when language changed externally | Added `tpsLangChanged` event listener that rebuilds the entire modal HTML in the new language |

---

## 📁 Project Structure

```
TPSFull/
├── index.html                  # Landing page / module hub
├── README.md                   # This file
│
├── campaign/                   # 📢 Election Campaign Module
│   ├── index.html              #   Party Select → Dashboard → Election
│   ├── style.css               #   Dark theme with gold accents
│   ├── data.js                 #   Parties, constituencies, state schema
│   ├── engine.js               #   Election math, actions, save/load
│   ├── timeline.js             #   Daily calendar, parliament bridging
│   └── main.js                 #   UI bindings, boot sequence
│
├── parliament-test/            # 🏛️ Parliament RPG Module
│   ├── index.html              #   Three-pane dashboard layout
│   ├── style.css               #   Bloomberg Terminal aesthetics
│   ├── data.js                 #   MPs, topics, state management
│   ├── timeline.js             #   Weekly schedule engine
│   ├── debate.js               #   Live debate engine, AI speeches
│   ├── engine.js               #   Extended resources, interpellations
│   ├── legislation.js          #   Bill system, committee phase
│   └── main.js                 #   UI orchestration, callbacks
│
├── main-game/                  # 👔 Governing Simulation Module
│   ├── index.html              #   Start → Dashboard → Game Over
│   ├── style.css               #   Governing dashboard theme
│   ├── data.js                 #   Parties, laws, crisis events
│   └── main.js                 #   Game loop, UI, save/load
│
└── shared/                     # 🔧 Cross-Module Utilities
    ├── localization.js          #   i18n engine, translation dictionary
    └── settings.js              #   Settings modal, global state, wipe
```

---

## 🚀 Getting Started

### Prerequisites
- A modern web browser (Chrome, Firefox, Edge, Safari)
- That's it. No Node.js, no npm, no build tools.

### Running Locally

**Option A — Direct File Open:**
```
Double-click campaign/index.html
```

**Option B — Local HTTP Server (recommended for cross-module navigation):**
```bash
# Using Python
python -m http.server 8080

# Using Node.js
npx http-server . -p 8080

# Then open http://localhost:8080/campaign/index.html
```

**Option C — GitHub Pages:**
Push the entire `TPSFull/` directory to a GitHub repo and enable Pages. Zero configuration needed.

---

## 🎯 How to Play

### Campaign Module (`/campaign/`)
1. **Choose Your Party** — Select from 5 Thai political parties, each with unique strengths, ideologies, and regional bases.
2. **Set Difficulty** — Easy, Normal, or Hard. This choice is permanent.
3. **Campaign for 8 Weeks** — Each day brings new choices:
   - **Rally** — Boost regional support (costs funds, increases scrutiny)
   - **Information Operations** — Social media campaigns (cheaper, riskier)
   - **Ban Yai Network** — Activate local power brokers (high cost, high reward)
   - **Fundraise** — Replenish campaign war chest
4. **Parliament Days** (Wed/Thu/Fri) — Choose to enter the Parliament module for debates or skip (scrutiny penalty).
5. **Election Day** — After 56 days, the constituency + party-list election determines seat allocation.
6. **Form a Coalition** — Negotiate with other parties to reach the 251-seat majority threshold.

### Parliament Module (`/parliament-test/`)
1. **Begin Session** — A random bill is selected for debate.
2. **Watch the Debate** — AI MPs deliver speeches for and against the bill.
3. **Raise Protests** — If an MP says something objectionable, raise a "Point of Order" (slander, off-topic, misleading).
4. **Deliver Your Speech** — Choose your stance when called upon.
5. **Cast Your Vote** — Aye, Nay, or Abstain on the final bill.

### Governing Module (`/main-game/`)
1. **Survive 48 Months** — Each month brings a crisis event requiring a difficult choice.
2. **Manage 6 Stats** — Approval, Budget, Growth, Unrest, Military Patience, Coalition Stability.
3. **Propose Laws** — Navigate parliamentary voting to pass or repeal legislation.
4. **Avoid Game Over** — Unrest at 100%, budget bankruptcy, military coup, or coalition collapse all end your term.

---

## 🌍 Localization

TPS supports full bilingual operation:

| Feature | English (EN) | Thai (TH) |
|---|---|---|
| All UI labels | ✅ | ✅ |
| Settings modal | ✅ | ✅ |
| Debate dialogues | ✅ | ✅ |
| Crisis events | ✅ | ✅ |
| Toast notifications | ✅ | ✅ |
| Confirmation prompts | ✅ | ✅ |

Switch languages via:
- ⚙️ **Settings Gear** (bottom-right, all pages)
- 🔤 **EN / TH Toggle** (Parliament header bar)

---

## 🔧 Technical Notes

- **Zero Dependencies** — Pure vanilla HTML/CSS/JavaScript. No React, no Vue, no Tailwind.
- **No Build Step** — Open and play. No `npm install`, no webpack, no compilation.
- **State Management** — `localStorage` for persistent state, `sessionStorage` for tab-scoped snapshots.
- **D3.js** — Used only in the Campaign module for the interactive electoral map.
- **Modular Architecture** — Each module (`/campaign/`, `/parliament-test/`, `/main-game/`) is self-contained with its own `data.js` → `engine.js` → `main.js` pipeline.
- **Shared Layer** — `/shared/localization.js` and `/shared/settings.js` are loaded by all modules for consistent i18n and user preferences.

---

## 📜 Changelog

### v1.0.1 Test (April 2026)
- Added: Universal TH/EN localization system
- Added: Settings modal with language, debate speed, difficulty display
- Added: Parliament RPG module with live debate, protests, voting
- Added: Legislative depth (bill proposals, committee phase)
- Added: Persistent campaign state across module transitions
- Added: Permanent difficulty system (Easy/Normal/Hard)
- Added: Parliament header EN/TH toggle button
- Fixed: UI state reset on language change (campaign + main game)
- Fixed: Campaign timeline amnesia after parliament return
- Fixed: Mixed-language debate dialogues
- Fixed: Wipe Save Data routing

### v1.0.0 (March 2026)
- Initial release: Campaign module, Main Game module
- Basic party system with 5 Thai political parties
- 400-constituency + 100-party-list election engine
- 48-month governing simulation with crisis events

---

## 📄 License

This project is released under the **MIT License**.

Built with 🇹🇭 by the TPS Development Team.

---

<p align="center">
  <strong>🏛️ Thailand Political Simulation — สถาบันจำลองการเมืองไทย</strong><br>
  <em>"ในการเมือง ไม่มีมิตรแท้ ไม่มีศัตรู์ถาวร มีแต่ผลประโยชน์ร่วม"</em><br>
  <sub>"In politics, there are no permanent friends, no permanent enemies — only permanent interests."</sub>
</p>
