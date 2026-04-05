# 🏛️ Thailand Political Simulation (TPS)

> **A browser-based political strategy game where you lead a Thai political party from election campaign to governing the Kingdom of Thailand.**

![Version](https://img.shields.io/badge/version-1.0-gold)
![Tech](https://img.shields.io/badge/tech-HTML%2FCSS%2FJS%2FD3.js-blue)
![License](https://img.shields.io/badge/license-MIT-green)

---

## 🎮 Overview

Thailand Political Simulation is a deep, replayable political strategy game built entirely with **vanilla HTML5, CSS3, JavaScript, and D3.js** — zero dependencies, zero build tools, zero installation required. Deploy to GitHub Pages and play instantly.

You will:
1. **Choose a political party** from 5 fictionalized factions spanning Thailand's political spectrum
2. **Campaign for 8 weeks** — hold rallies, run IO campaigns, deploy local boss networks (Ban Yai), and manage your 500-candidate roster
3. **Win 251+ seats** out of 500 in a mixed-member election (400 constituency + 100 party-list)
4. **Form a coalition government** by negotiating with rival parties who demand ministries and policy concessions
5. **Govern Thailand** for a 48-month term — pass laws, handle crises, and maintain your parliamentary majority

---

## 📁 Project Structure

```
TPSREAL/
├── index.html              ← 🏠 Main Menu (entry point)
├── style.css               ← 🎨 Main menu styles
├── README.md               ← 📖 This file
│
├── campaign/               ← 🗳️ Election Campaign Module
│   ├── index.html          ← Campaign UI (5 game screens)
│   ├── style.css           ← Campaign dashboard styles
│   ├── data.js             ← Parties, provinces, MP generation, map data
│   ├── engine.js           ← Election math, coalition logic, win/loss loop
│   └── main.js             ← UI binding, D3.js map, roster editor
│
└── main-game/              ← 🏛️ Governing Module
    ├── index.html          ← Government dashboard UI
    ├── style.css           ← Dashboard styles
    ├── data.js             ← Laws, crises, coalition data
    ├── engine.js           ← Governing game logic
    ├── main.js             ← UI binding & game loop
    └── README.md           ← Module-specific docs
```

---

## 🚀 Quick Start

### Play Locally

No build step required. Just serve the files:

```bash
# Option 1: Node.js (built-in)
npx -y http-server . -p 8080 -c-1

# Option 2: Python
python -m http.server 8080

# Option 3: VS Code
# Install "Live Server" extension → Right-click index.html → "Open with Live Server"
```

Then open **http://localhost:8080** in your browser.

## 🗳️ Game Mechanics

### Election System (Campaign Module)

| Mechanic | Details |
|----------|---------|
| **Constituency Seats** | 400 seats across 77 provinces. First Past the Post — highest score wins. |
| **Party-List Seats** | 100 seats allocated nationally via the Largest Remainder Method. |
| **Majority Threshold** | **251 seats** out of 500 to form a government. |
| **Campaign Duration** | 8 weeks with 3 action points per week. |

### Campaign Actions

| Action | Cost | Effect |
|--------|------|--------|
| 🎤 **Hold Rally** | 50M฿ + 1 AP | Boosts all districts in a province |
| 📱 **IO Campaign** | 80M฿ + 1 AP | Social media blitz across an entire region |
| 🏘️ **Deploy Ban Yai** | 120M฿ + 1 AP | Local boss network secures a district — but costs party-list votes |
| 💰 **Fundraise** | 1 AP | Raises 100-250M฿ at the cost of increased scrutiny |

### The Ban Yai Trade-off

**Ban Yai** (บ้านใหญ่) represents influential local families who can deliver votes through patronage networks. Using Ban Yai:
- ✅ **Adds** a large bonus to constituency seat scores (almost guarantees winning that district)
- ❌ **Subtracts** from your national party-list vote tally (corrupt tactics alienate ideological voters)
- ❌ **Increases** media scrutiny (risk of election commission investigation)

This mechanic forces the player to balance *dirty local politics* against *national ideological appeal* — a core tension in real Thai elections.

### The 5 Political Parties

| Party | Ideology | Strengths | Weaknesses |
|-------|----------|-----------|------------|
| **Khana Pracharat (KPR)** | Progressive | IO + Urban + Youth | Low Ban Yai, Low Funds |
| **Pracha Niyom (PNP)** | Populist | Isan dominance + Rural machine | Low IO strength |
| **Palang Ratthaniyom (PRP)** | Royalist | Unlimited funds + Military backing | Very low popularity |
| **Setthakij Thai (STK)** | Centrist | Ban Yai masters + Kingmaker | Low base popularity |
| **Pak Tai Ruamjai (PTR)** | Regional | Southern stronghold | Only viable in the South |

### Coalition Formation

After the election, you enter the **Coalition Phase**:
- AI parties evaluate your offer based on **ideology compatibility**, **seat ratios**, and whether you're the largest party
- They demand **ministries** proportional to their seat contribution (from 18 available ministries)
- They may impose **policy conditions** (e.g., "No constitutional reform", "Implement rural subsidies")
- There's a **willingness roll** — even a 70% willing party might refuse you

### Win / Loss Loop

| Outcome | Trigger | What Happens |
|---------|---------|--------------|
| 🏛️ **Victory** | Coalition ≥ 251 seats | Election data saved to `sessionStorage` → redirect to `/main-game/` |
| 📉 **Opposition** | Coalition < 251 seats | Fast-forward 4 years → New election cycle → Campaign restarts at Week 1 |

---

## 🏛️ Governing Module

Once you win the election, you enter the **Governing Module** where you must:

- **Pass legislation** through your coalition (vote whipping, compromise)
- **Handle crises** (protests, economic downturns, constitutional court challenges)
- **Maintain coalition stability** (partners may defect if their demands aren't met)
- **Survive 48 months** without dissolution or a no-confidence vote

---

## 🗺️ Map & Data

### Province Coverage
- **77 provinces** with official English names (e.g., "Nakhon Ratchasima", not "Korat")
- **400 electoral districts** generated from province data with randomized political leans
- **7 regions**: Bangkok Metropolitan, Central, North, Northeast (Isan), East, West, South

### D3.js Map
The campaign dashboard features an interactive D3.js map of Thailand:
- Province boundaries rendered from GeoJSON
- Color-coded by leading political party
- Hover tooltips showing district count, population, and leading party
- Click-to-select provinces for rally targeting

---

## 🎨 Design System

| Token | Value | Usage |
|-------|-------|-------|
| `--bg` | `#060a16` | Primary background |
| `--bg2` | `#0a0e1a` | Secondary background |
| `--gold` | `#d4af37` | Accent / Thai Gold |
| `--gold-l` | `#f5d778` | Light gold |
| `--text` | `#e8eaf0` | Primary text |
| `--text2` | `#9ba3b8` | Secondary text |
| Font Display | Cinzel | Titles & headings |
| Font Body | Inter | UI text |
| Font Thai | Noto Sans Thai | Thai language text |

---

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| **HTML5** | Semantic structure |
| **CSS3** | Custom properties, glassmorphism, grid, animations |
| **Vanilla JS** | Game engine, UI binding, state management |
| **D3.js v7** | Thailand electoral map (GeoJSON rendering) |
| **DiceBear API** | Procedural avatar generation for 2,500 MPs |

**Zero build tools. Zero package.json. Zero node_modules.**

---

## 📊 Data Scale

| Entity | Count |
|--------|-------|
| Political Parties | 5 |
| Provinces | 77 |
| Electoral Districts | 400 |
| Total Seats | 500 (400 constituency + 100 party-list) |
| MPs Generated | 2,500 (500 per party) |
| Thai First Names | 136 (72 male + 64 female) |
| Thai Last Names | 80 |
| Ministries | 18 |
| Governing Laws | ~20+ |
| Crisis Events | ~15+ |

---

## 📄 License

MIT License — Free to use, modify, and distribute.

---

## 🙏 Credits

- **Map Data**: [thailand.json](https://github.com/apisit/thailand.json) by apisit
- **Avatars**: [DiceBear](https://www.dicebear.com/) Personas collection
- **Fonts**: [Google Fonts](https://fonts.google.com/) — Inter, Cinzel, Noto Sans Thai
- **D3.js**: [d3js.org](https://d3js.org/)

---

<p align="center">
  <strong>TPS v1.0 — 2027 Election Cycle</strong><br>
  <em>A browser-based political strategy experience</em>
</p>
