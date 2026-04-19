# 🏛️ TPS v.1.0.1 Test — The Parliament RPG

> **Thailand Political Simulation: Parliament Module**  
> An RPG-lite legislative simulation layer for TPS.

---

## 📋 Overview

The Parliament RPG module transforms TPS from a macro-strategy campaign game into a day-by-day parliamentary simulation. Players roleplay as an individual MP navigating the Thai House of Representatives — participating in live debates, filing protests, questioning ministers, and pushing their own legislative agenda.

### Key Features

| Feature | Description |
|---------|-------------|
| **Live Debate Engine** | Real-time AI dialogue with unique MP personalities and Thai parliamentary procedure |
| **Protest Mechanic** | Point of Order system (Slander / Off-Topic / Misleading) with RNG success rates |
| **Interpellation System** | Queue กระทู้ถามสด (live questions) for government ministers |
| **Bill Lifecycle** | Draft → Signatures → Committee → Reading → Vote pipeline |
| **Party Whip System** | Enforce party discipline with rebel MP consequences |
| **Unified Calendar** | 56-day campaign integrated with Parliament Days (Wed/Thu/Fri) |
| **Lobbyist Events** | Random political events with risk/reward choices |

---

## 🗂 File Structure

```
TPS_v.1.0.1Test/TPSFull/
│
├── campaign/                    # Election Campaign Module (modified)
│   ├── data.js                  # Party data, districts, provinces
│   ├── engine.js                # Election math + diminishing returns + lobbyist events
│   ├── timeline.js              # ★ NEW — Unified daily calendar engine
│   ├── main.js                  # UI orchestration (daily system)
│   ├── style.css                # Dashboard styles + calendar strip
│   └── index.html               # Campaign dashboard + Parliament modal
│
├── parliament-test/             # ★ The Parliament RPG Module
│   ├── data.js                  # Game state, schedule, AI speakers, events
│   ├── timeline.js              # Phase-based time engine (Morning/Afternoon/Evening)
│   ├── debate.js                # Live debate engine, protests, speeches, votes
│   ├── engine.js                # ★ NEW — Bill lifecycle, Influence, Party Whip
│   ├── main.js                  # UI orchestration, DOM bindings, modals
│   ├── style.css                # 3-pane dark theme dashboard
│   ├── index.html               # Parliament dashboard
│   └── README.md                # This file
│
└── index.html                   # Main menu (entry point)
```

---

## 🚀 Deployment

### Requirements
- **Zero dependencies** — Pure vanilla HTML/CSS/JavaScript
- Any modern browser (Chrome 90+, Firefox 85+, Edge 90+, Safari 14+)
- No build step, no Node.js, no npm

### Local

1. Clone or download the repository
2. Open `index.html` in a browser (or use a local server)
3. Select **Campaign** to start from the election phase
4. On Parliament Days (Wed/Thu/Fri), choose **Enter Parliament** to launch the RPG module

```bash
# Option A: Direct file
open TPS_v.1.0.1Test/TPSFull/index.html

# Option B: Local server (if needed for sessionStorage)
cd TPS_v.1.0.1Test/TPSFull
npx serve .
```

### GitHub Pages

1. Push the entire `TPSFull/` folder to a GitHub repository
2. Go to **Settings → Pages → Source: main branch → /root**
3. The app will be live at `https://<username>.github.io/<repo>/`

---

## 🎮 Gameplay Loop

### Campaign Phase (8 Weeks / 56 Days)

```
📅 Day 1 — Monday (Campaign Day)
   └─ Hold rallies, run IO campaigns, fundraise
📅 Day 2 — Tuesday (Campaign Day)
   └─ Continue campaign actions
📅 Day 3 — Wednesday (Parliament Day) ← CHOICE
   ├─ 🏛️ Enter Parliament → Launch debate engine
   └─ 🚫 Ignore → Penalty: -8 Capital, +3% Scrutiny
📅 Day 4 — Thursday (Parliament Day) ← CHOICE
📅 Day 5 — Friday (Urgent Motion Day) ← CHOICE  
📅 Day 6 — Saturday (Weekend Campaign)
📅 Day 7 — Sunday (Rest Day)
   └─ Auto: AI campaigns, poll drift
```

### Parliament Session Flow

```
1. Enter Parliament → Select debate topic
2. AI MPs speak in rounds (6-10 speakers per debate)
3. Player can:
   ├─ 🗣️ SPEAK (Aggressive / Technical / Diplomatic)
   ├─ ⚠️ PROTEST (Slander / Off-Topic / Misleading)
   └─ ❓ INTERPELLATE (Queue live questions)
4. Final VOTE (Aye / Nay / Abstain)
5. Return to Campaign HQ or stay in Parliament
```

### Legislative Workflow (Bill Lifecycle)

```
📝 DRAFT → Spend Influence to initiate
📋 SIGNATURES → Lobby MPs for co-signers
📖 FIRST READING → Automatic if signatures met
⚖️ COMMITTEE → Choose expert (Legal / NGO / Corporate)
🗣️ SECOND READING → Live debate
🗳️ VOTE → Party Whip enforcement + final tally
✅ PASSED / ❌ DEFEATED
```

---

## 🔗 Module Integration (sessionStorage Bridge)

The campaign and parliament modules communicate via `sessionStorage`:

### Campaign → Parliament
```javascript
// Key: "tps_campaign_to_parliament"
{
  playerPartyId: "khana_pracharat",
  currentWeek: 3,
  currentDay: 17,
  playerFunds: 650,
  playerScrutiny: 12,
  nationalPollShare: { ... },
  electionYear: 2027,
  timestamp: 1680000000000
}
```

### Parliament → Campaign
```javascript
// Key: "tps_parliament_to_campaign"
{
  capitalChange: 14,           // +3/debate, +5/protest, +2/vote, +4/interp
  influenceEarned: 45,
  debatesCompleted: 1,
  protestsWon: 2,
  votesAttended: 1,
  interpellationsFiled: 0,
  currentDay: 17,
  billsInProgress: 1,
  legislativeRecord: { ... },
  timestamp: 1680000000000
}
```

---

## 🏗 Architecture

### Design Principles

1. **Modular Isolation** — `/parliament-test/` is a standalone sandbox. It can run independently without the campaign module.
2. **Callback Architecture** — Engines (`timeline.js`, `debate.js`) fire events through registered callbacks. `main.js` consumes them to update the DOM.
3. **State Immutability** — Deep cloning prevents accidental state mutation during initialization.
4. **Procedural Realism** — Uses real Thai parliamentary terminology (กระทู้ถามสด, ข้อบังคับการประชุม, แปรญัตติ).

### Key State Objects

| Object | Location | Purpose |
|--------|----------|---------|
| `parliamentState` | `data.js` | Core game state (Political Capital, Popularity, Funds, weekly stats) |
| `CampaignCalendar` | `campaign/timeline.js` | Day-level calendar (1-56) with day types |
| `BILL_TEMPLATES` | `engine.js` | Available bills with difficulty and approval ratings |
| `AI_SPEAKERS` | `data.js` | 12 unique MP personalities with rhetorical styles |
| `DEBATE_TOPICS` | `data.js` | 12 debate topics covering Thai political issues |

### Resource System

| Resource | Range | Earned By | Spent On |
|----------|-------|-----------|----------|
| **Political Capital** | 0-100 | Debates, protests, votes | Events, whip enforcement |
| **Local Popularity** | 0-100 | Constituency events | Decays each week |
| **Funds (฿M)** | 0-1000 | Fundraising, lobbyists | Rallies, IO, Ban Yai |
| **Influence** | 0-100 | Committee work, networking | Bill initiation, signatures |

---

## ⚠️ Known Limitations

- **Standalone Mode**: When accessed directly (not from campaign), the parliament module uses hardcoded defaults for party/alignment
- **No Persistence**: Game state is not saved to localStorage — refresh = reset
- **AI Speakers**: Currently 12 speakers; adding more diversity planned for v1.1
- **D3.js Map**: Requires internet for GeoJSON fetch; offline fallback shows text

---

## 📝 Version History

| Version | Date | Changes |
|---------|------|---------|
| v1.0.1-test | 2026-04-18 | Initial Parliament RPG module |
| v1.0.1-p2 | 2026-04-18 | Unified daily calendar, legislative workflow, diminishing returns |
| v1.0.1-p3 | 2026-04-19 | Campaign ↔ Parliament integration, return flow, deployment guide |

---

## 🇹🇭 Thai Political Context

This simulation is inspired by the real procedures of the **Thai National Assembly** (รัฐสภา), including:

- **House of Representatives** (สภาผู้แทนราษฎร) — 500 seats (400 constituency + 100 party-list)
- **Standing Order** (ข้อบังคับการประชุม) — Rules governing debate and protest
- **Interpellation** (กระทู้ถามสด) — Live parliamentary questions
- **Committee Phase** (แปรญัตติ) — Bill scrutiny by specialized committees
- **Censure Debate** (อภิปรายไม่ไว้วางใจ) — No-confidence motions

---

*Built with ❤️ for political simulation enthusiasts.*
