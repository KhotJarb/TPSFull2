// ═══════════════════════════════════════════════════════════════════
// TPS CAMPAIGN MODULE — main.js
// UI Binding: Party select, Dashboard, D3 Map, Roster, Election
// ═══════════════════════════════════════════════════════════════════

// ─── SCREEN MANAGEMENT ──────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function toast(msg, type = 'info') {
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  document.getElementById('toast-container').appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// ─── VARIABLES ──────────────────────────────────────────────────
let selectedPartyId = null;
let selectedDifficulty = 'normal';  // Default difficulty
let currentAction = null;
let editingMpId = null;
let mapProjection = null;
let mapPath = null;
let geoData = null;

// ═══════════════════════════════════════════════════════════════════
// SCREEN 1: PARTY SELECT
// ═══════════════════════════════════════════════════════════════════

function renderPartyCards() {
  const container = document.getElementById('party-cards');
  container.innerHTML = '';
  CAMPAIGN_PARTIES.forEach(p => {
    const card = document.createElement('div');
    card.className = 'party-card';
    card.dataset.partyId = p.id;
    card.style.setProperty('--pc', p.color);
    card.querySelector;
    card.innerHTML = `
      <div style="position:absolute;top:0;left:0;right:0;height:3px;background:${p.color}"></div>
      <div class="pc-top">
        <div class="pc-dot" style="background:${p.color};color:${p.color}"></div>
        <span class="pc-name">${p.name}</span>
        <span class="pc-short">${p.shortName}</span>
      </div>
      <div class="pc-ideology">${p.ideology} · ${p.thaiName}</div>
      <div class="pc-leader">Leader: <strong>${p.leader}</strong></div>
      <div class="pc-desc">${p.description}</div>
      <div class="pc-stats">
        <span class="pc-stat">📊 ${p.basePopularity}% base</span>
        <span class="pc-stat">💰 ฿${p.campaignFunds}M</span>
        <span class="pc-stat">🏘️ Ban Yai: ${p.banYaiNetwork}%</span>
        <span class="pc-stat">📱 IO: ${p.ioStrength}%</span>
      </div>
    `;
    card.addEventListener('click', () => {
      document.querySelectorAll('.party-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedPartyId = p.id;
      document.getElementById('btn-start-campaign').disabled = false;
    });
    container.appendChild(card);
  });
}

document.getElementById('btn-start-campaign').addEventListener('click', () => {
  if (!selectedPartyId) return;

  // ── Save difficulty permanently to localStorage ──
  localStorage.setItem('tps_difficulty', selectedDifficulty);
  TPSGlobalState.difficulty = selectedDifficulty;
  console.log(`[campaign/main.js] Difficulty locked: ${selectedDifficulty}`);

  initCampaignState(selectedPartyId);
  const party = CAMPAIGN_PARTIES.find(p => p.id === selectedPartyId);
  campaignState.playerFunds = party.campaignFunds;
  // Initialize the Unified Time Engine (Part 2)
  initCampaignTimeline();

  // ── STEP 2 FIX: Persist UI state so language reload doesn't reset ──
  localStorage.setItem('campaign_ui_state', 'dashboard');
  localStorage.setItem('campaign_party_id', selectedPartyId);
  _saveCampaignToStorage();
  console.log('[campaign/main.js] UI state saved: dashboard');

  showScreen('screen-campaign');
  renderDashboard();
  initMap();
});

// ═══════════════════════════════════════════════════════════════════
// SCREEN 2: CAMPAIGN DASHBOARD
// ═══════════════════════════════════════════════════════════════════

function renderDashboard() {
  // Header
  document.getElementById('week-number').textContent = CampaignCalendar.getWeek();
  document.getElementById('year-badge').textContent = `${campaignState.electionYear} Election — Day ${CampaignCalendar.currentDay}`;
  document.getElementById('val-funds').textContent = campaignState.playerFunds;
  document.getElementById('val-scrutiny').textContent = campaignState.playerScrutiny;
  document.getElementById('val-ap').textContent = campaignState.actionPointsRemaining;

  // Show election button on final day
  const isCampaignOver = CampaignCalendar.isLastDay();
  document.getElementById('btn-next-day').style.display = isCampaignOver ? 'none' : '';
  document.getElementById('btn-end-week').style.display = isCampaignOver ? 'none' : '';
  document.getElementById('btn-hold-election').style.display = isCampaignOver ? '' : 'none';

  // Disable actions if no AP
  document.querySelectorAll('#action-buttons .action-btn').forEach(btn => {
    btn.disabled = campaignState.actionPointsRemaining <= 0;
  });

  renderPolls();
  renderCampaignLog();
  renderRoster();
  renderCalendarStrip();
  updateMap();

  // STEP 2 FIX: Auto-save state after every dashboard render
  _saveCampaignToStorage();
}

// ─── Polls ──────────────────────────────────────────────────────
function renderPolls() {
  const container = document.getElementById('poll-bars');
  container.innerHTML = '';
  const sorted = CAMPAIGN_PARTIES.map(p => ({
    ...p, share: campaignState.nationalPollShare[p.id] || 0
  })).sort((a, b) => b.share - a.share);

  sorted.forEach(p => {
    const isPlayer = p.id === campaignState.playerPartyId;
    const row = document.createElement('div');
    row.className = 'poll-row';
    row.innerHTML = `
      <span class="poll-name" style="color:${p.color}">${p.shortName}</span>
      <div class="poll-track">
        <div class="poll-fill" style="width:${p.share}%;background:${p.color}${isPlayer ? '' : '99'}">${p.share}%</div>
      </div>
      <span class="poll-pct">${p.share}%</span>
    `;
    container.appendChild(row);
  });
}

// ─── Campaign Log ───────────────────────────────────────────────
function renderCampaignLog() {
  const container = document.getElementById('campaign-log');
  if (campaignState.campaignLog.length === 0) {
    container.innerHTML = '<div class="log-empty">Campaign begins. Choose your actions wisely.</div>';
    return;
  }
  container.innerHTML = '';
  [...campaignState.campaignLog].reverse().slice(0, 20).forEach(entry => {
    const div = document.createElement('div');
    div.className = 'log-entry';
    div.innerHTML = `<span class="log-week">W${entry.week}</span> ${entry.message}`;
    container.appendChild(div);
  });
}

// ─── Roster ─────────────────────────────────────────────────────
function renderRoster(query = '') {
  const list = document.getElementById('roster-list');
  const roster = query ? searchPlayerMPs(query) : getPlayerRoster();
  document.getElementById('roster-count').textContent = `${roster.length} / ${TOTAL_SEATS}`;

  // Virtual scroll: only render first 50 for performance
  const visible = roster.slice(0, 50);
  list.innerHTML = '';
  visible.forEach(mp => {
    const row = document.createElement('div');
    row.className = `mp-row${mp.isEdited ? ' edited' : ''}`;
    row.innerHTML = `
      <img class="mp-avatar" src="${mp.portraitUrl}" alt="${mp.nickname}" loading="lazy" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 40 40%22><rect fill=%22%23141c36%22 width=%2240%22 height=%2240%22/><text x=%2220%22 y=%2225%22 text-anchor=%22middle%22 fill=%22%239ba3b8%22 font-size=%2214%22>👤</text></svg>'">
      <div class="mp-info">
        <div class="mp-name-text">${mp.name}</div>
        <div class="mp-meta">"${mp.nickname}" · ${mp.gender === 'female' ? '♀' : '♂'} · ${mp.age}y</div>
      </div>
      <span class="mp-slot">#${mp.slotIndex + 1}</span>
    `;
    row.addEventListener('click', () => openMPEditor(mp.id));
    list.appendChild(row);
  });
  if (roster.length > 50) {
    const more = document.createElement('div');
    more.className = 'log-empty';
    more.textContent = `+ ${roster.length - 50} more MPs. Use search to find specific candidates.`;
    list.appendChild(more);
  }
}

document.getElementById('roster-search-input').addEventListener('input', e => {
  renderRoster(e.target.value);
});

// ─── MP Editor Modal ────────────────────────────────────────────
function openMPEditor(mpId) {
  const mp = getMPById(mpId);
  if (!mp) return;
  editingMpId = mpId;
  document.getElementById('mp-portrait').src = mp.portraitUrl;
  document.getElementById('mp-name-input').value = mp.name;
  document.getElementById('mp-portrait-input').value = mp._portraitOverridden ? mp.portraitUrl : '';
  document.getElementById('mp-edit-title').textContent = `Edit: ${mp.nickname}`;
  document.getElementById('mp-age').textContent = mp.age;
  document.getElementById('mp-influence').textContent = mp.localInfluence;
  document.getElementById('mp-charisma').textContent = mp.charisma;
  document.getElementById('mp-modal').style.display = 'flex';
}

document.getElementById('mp-modal-close').addEventListener('click', () => {
  document.getElementById('mp-modal').style.display = 'none';
});
document.getElementById('mp-modal').addEventListener('click', e => {
  if (e.target.id === 'mp-modal') document.getElementById('mp-modal').style.display = 'none';
});

document.getElementById('btn-save-mp').addEventListener('click', () => {
  if (!editingMpId) return;
  const name = document.getElementById('mp-name-input').value.trim();
  const portrait = document.getElementById('mp-portrait-input').value.trim();
  if (name) editMPName(editingMpId, name);
  if (portrait) editMPPortrait(editingMpId, portrait);
  toast('MP updated!', 'success');
  document.getElementById('mp-modal').style.display = 'none';
  renderRoster();
});

document.getElementById('btn-reset-mp').addEventListener('click', () => {
  if (!editingMpId) return;
  resetMP(editingMpId);
  toast('MP reset to default', 'warning');
  document.getElementById('mp-modal').style.display = 'none';
  renderRoster();
});

// ─── Campaign Actions ───────────────────────────────────────────
document.querySelectorAll('.action-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const action = btn.dataset.action;
    if (action === 'fundraise') {
      const result = actionFundraise();
      if (result.success) toast(`Raised ฿${result.amount}M!`, 'success');
      else toast(result.message, 'error');
      renderDashboard();
      return;
    }
    // Show target selector
    currentAction = action;
    const sel = document.getElementById('target-selector');
    const drop = document.getElementById('target-dropdown');
    const label = document.getElementById('target-label');
    sel.style.display = 'flex';
    drop.innerHTML = '';

    if (action === 'rally') {
      label.textContent = 'Select Province:';
      THAILAND_PROVINCES.forEach(prov => {
        const opt = document.createElement('option');
        opt.value = prov.id;
        opt.textContent = `${prov.name} (${prov.districts} districts)`;
        drop.appendChild(opt);
      });
    } else if (action === 'io') {
      label.textContent = 'Select Region:';
      Object.entries(REGIONS).forEach(([key, name]) => {
        const count = getDistrictsByRegion(key).length;
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = `${name} (${count} districts)`;
        drop.appendChild(opt);
      });
    } else if (action === 'banyai') {
      label.textContent = 'Select District:';
      DISTRICTS.slice(0, 100).forEach(d => {
        const opt = document.createElement('option');
        opt.value = d.id;
        opt.textContent = d.displayName;
        drop.appendChild(opt);
      });
    }
  });
});

document.getElementById('btn-confirm-action').addEventListener('click', () => {
  const target = document.getElementById('target-dropdown').value;
  let result;
  if (currentAction === 'rally') result = actionRally(target);
  else if (currentAction === 'io') result = actionIO(target);
  else if (currentAction === 'banyai') result = actionBanYai(target);
  if (result && result.success) toast('Action completed!', 'success');
  else if (result) toast(result.message, 'error');
  document.getElementById('target-selector').style.display = 'none';
  currentAction = null;
  renderDashboard();
});

document.getElementById('btn-cancel-action').addEventListener('click', () => {
  document.getElementById('target-selector').style.display = 'none';
  currentAction = null;
});

// ─── Daily Advancement (NEW — Part 2) ───────────────────────────

/**
 * renderCalendarStrip() — Renders the unified 7-day calendar strip
 * showing the current week with day type coloring.
 */
function renderCalendarStrip() {
  const container = document.getElementById('cal-strip-days');
  if (!container) return;

  const weekDays = getCurrentWeekCalendarData();
  container.innerHTML = '';

  weekDays.forEach(day => {
    const cell = document.createElement('div');
    cell.className = `cal-day-cell type-${day.type}`;
    if (day.isCurrent) cell.classList.add('is-current');
    if (day.isPast) cell.classList.add('is-past');
    cell.style.position = 'relative';

    cell.innerHTML = `
      <span class="cal-dow">${day.dayName}</span>
      <span class="cal-icon">${day.icon}</span>
      <span class="cal-num">${day.day}</span>
      <span class="cal-type">${day.isParliament ? '🏛️' : day.type === 'rest' ? '🌙' : ''}</span>
    `;
    container.appendChild(cell);
  });
}

// ─── Next Day Button ─────────────────────────────────────────────
document.getElementById('btn-next-day').addEventListener('click', () => {
  const result = advanceCampaignDay();
  if (!result) return;

  if (result.type === 'campaign_end') {
    toast(result.message, 'warning');
    document.getElementById('btn-next-day').style.display = 'none';
    document.getElementById('btn-end-week').style.display = 'none';
    document.getElementById('btn-hold-election').style.display = '';
    renderDashboard();
    return;
  }

  // Parliament Day? Show modal
  if (result.isParliament) {
    _showParliamentModal(result);
  } else {
    // Check for lobbyist event
    const event = rollLobbyistEvent(25);
    if (event) {
      _showLobbyistModal(event);
    } else {
      toast(`☀️ ${result.dayName} (${result.dayNameThai}) — ${result.dayType.label}`, 'info');
    }
  }

  renderDashboard();
});

// ─── Skip to Week End Button ─────────────────────────────────────
document.getElementById('btn-end-week').addEventListener('click', () => {
  let lastResult = null;
  let hitParliament = false;

  while (true) {
    if (CampaignCalendar.isLastDay()) break;

    const result = advanceCampaignDay();
    lastResult = result;

    if (result.isParliament) {
      hitParliament = true;
      _showParliamentModal(result);
      break;
    }

    if (result.dayOfWeek === 6) break;
  }

  if (!hitParliament && lastResult) {
    toast(`Fast-forwarded to ${lastResult.dayName}. Week ${lastResult.week}.`, 'info');
  }

  renderDashboard();
});

// ─── Parliament Day Modal ────────────────────────────────────────
function _showParliamentModal(dayResult) {
  const modal = document.getElementById('parliament-modal');
  const title = document.getElementById('parl-modal-title');
  const desc = document.getElementById('parl-modal-desc');

  title.textContent = `🏛️ ${dayResult.dayName} — ${dayResult.dayNameThai}`;

  if (dayResult.dayType.type === 'urgent') {
    desc.textContent = 'An urgent censure motion has been called! The House demands your attendance. Ignoring this will be extremely costly.';
  } else {
    desc.textContent = 'Today is a Parliament session day. As an elected MP, you have a duty to attend. The Speaker is calling the House to order.';
  }

  modal.style.display = 'flex';
}

document.getElementById('btn-enter-parliament').addEventListener('click', () => {
  const choice = handleParliamentChoice('enter');
  document.getElementById('parliament-modal').style.display = 'none';

  if (choice.action === 'redirect') {
    // STEP 3 FIX: Save campaign state to localStorage BEFORE leaving
    saveCampaignState();
    toast(choice.message, 'success');
    setTimeout(() => {
      window.location.href = choice.target;
    }, 800);
  }
});

document.getElementById('btn-ignore-parliament').addEventListener('click', () => {
  const choice = handleParliamentChoice('ignore');
  document.getElementById('parliament-modal').style.display = 'none';

  toast(choice.message, 'warning');
  renderDashboard();
});

// ─── Lobbyist Event Modal ────────────────────────────────────────
function _showLobbyistModal(event) {
  const modal = document.getElementById('parliament-modal');
  const box = modal.querySelector('.modal-box');

  // Store original HTML for restoration
  if (!modal._originalHTML) {
    modal._originalHTML = box.innerHTML;
  }

  box.innerHTML = `
    <div class="lobby-modal-content">
      <h2>${event.title}</h2>
      <p>${event.description}</p>
      <div class="lobby-choices" id="lobby-choices"></div>
    </div>
  `;

  const container = box.querySelector('#lobby-choices');
  event.choices.forEach((choice) => {
    const btn = document.createElement('button');
    btn.className = 'lobby-choice-btn';

    let effectsHTML = '';
    for (const [key, val] of Object.entries(choice.effects || {})) {
      const isPos = val > 0;
      effectsHTML += `<span class="${isPos ? 'lobby-effect-pos' : 'lobby-effect-neg'}">${isPos ? '+' : ''}${val} ${key}</span>`;
    }

    btn.innerHTML = `
      <span class="lobby-choice-label">${choice.label}</span>
      <span class="lobby-choice-risk">Risk: ${choice.risk}</span>
      <div class="lobby-choice-effects">${effectsHTML}</div>
    `;

    btn.addEventListener('click', () => {
      applyLobbyistChoice(choice);
      modal.style.display = 'none';
      _restoreParliamentModal();
      toast(`${choice.label} — Applied!`, 'success');
      renderDashboard();
    });

    container.appendChild(btn);
  });

  modal.style.display = 'flex';
}

function _restoreParliamentModal() {
  const modal = document.getElementById('parliament-modal');
  const box = modal.querySelector('.modal-box');
  if (modal._originalHTML) {
    box.innerHTML = modal._originalHTML;
    // Re-bind buttons
    document.getElementById('btn-enter-parliament').addEventListener('click', () => {
      const choice = handleParliamentChoice('enter');
      modal.style.display = 'none';
      if (choice.action === 'redirect') {
        // STEP 3 FIX: Save campaign state to localStorage BEFORE leaving
        saveCampaignState();
        toast(choice.message, 'success');
        setTimeout(() => { window.location.href = choice.target; }, 800);
      }
    });
    document.getElementById('btn-ignore-parliament').addEventListener('click', () => {
      const choice = handleParliamentChoice('ignore');
      modal.style.display = 'none';
      toast(choice.message, 'warning');
      renderDashboard();
    });
  }
}


document.getElementById('btn-hold-election').addEventListener('click', () => {
  const results = runElection();
  showScreen('screen-election');
  renderElectionResults(results);
});

// ═══════════════════════════════════════════════════════════════════
// D3.js MAP
// ═══════════════════════════════════════════════════════════════════

const GEOJSON_URL = 'https://raw.githubusercontent.com/apisit/thailand.json/master/thailand.json';

function initMap() {
  const container = document.getElementById('map-container');
  const svg = d3.select('#thailand-map');
  const width = container.clientWidth || 400;
  const height = container.clientHeight || 400;
  svg.attr('viewBox', `0 0 ${width} ${height}`);

  // Render legend
  const legend = document.getElementById('map-legend');
  legend.innerHTML = CAMPAIGN_PARTIES.map(p =>
    `<span class="leg-item"><span class="leg-dot" style="background:${p.color}"></span>${p.shortName}</span>`
  ).join('');

  d3.json(GEOJSON_URL).then(data => {
    geoData = data;
    mapProjection = d3.geoMercator().fitSize([width, height], data);
    mapPath = d3.geoPath().projection(mapProjection);

    svg.selectAll('path')
      .data(data.features)
      .join('path')
      .attr('d', mapPath)
      .attr('fill', '#141c36')
      .attr('stroke', 'rgba(212,175,55,0.15)')
      .attr('stroke-width', 0.5)
      .attr('class', 'map-province')
      .on('mouseenter', function(event, d) {
        d3.select(this).attr('stroke', 'var(--gold)').attr('stroke-width', 1.5);
        showMapTooltip(event, d);
      })
      .on('mouseleave', function() {
        d3.select(this).attr('stroke', 'rgba(212,175,55,0.15)').attr('stroke-width', 0.5);
        hideMapTooltip();
      })
      .on('click', function(event, d) {
        const name = d.properties.name || d.properties.NAME_1 || '';
        const prov = THAILAND_PROVINCES.find(p =>
          p.name.toLowerCase() === name.toLowerCase() ||
          name.toLowerCase().includes(p.name.toLowerCase().split(' ')[0])
        );
        if (prov && currentAction === 'rally') {
          document.getElementById('target-dropdown').value = prov.id;
        }
      });

    updateMap();
  }).catch(err => {
    console.warn('Failed to load GeoJSON:', err);
    svg.append('text').attr('x', width/2).attr('y', height/2)
      .attr('text-anchor', 'middle').attr('fill', '#6b748a').attr('font-size', '12')
      .text('Map data unavailable — using data tables');
  });
}

function updateMap() {
  if (!geoData) return;
  const svg = d3.select('#thailand-map');
  svg.selectAll('.map-province').attr('fill', function(d) {
    const name = d.properties.name || d.properties.NAME_1 || '';
    const prov = THAILAND_PROVINCES.find(p =>
      p.name.toLowerCase() === name.toLowerCase() ||
      name.toLowerCase().includes(p.name.toLowerCase().split(' ')[0])
    );
    if (!prov) return '#141c36';
    // Color by leading party
    let maxLean = 0, leadParty = null;
    for (const pid in prov.politicalLean) {
      const val = (prov.politicalLean[pid] || 0) + (campaignState.nationalPollShare[pid] || 0) * 0.3;
      if (val > maxLean) { maxLean = val; leadParty = pid; }
    }
    const party = CAMPAIGN_PARTIES.find(p => p.id === leadParty);
    return party ? party.color + '88' : '#141c36';
  });
}

function showMapTooltip(event, d) {
  const tip = document.getElementById('map-tooltip');
  const name = d.properties.name || d.properties.NAME_1 || 'Unknown';
  const prov = THAILAND_PROVINCES.find(p =>
    p.name.toLowerCase() === name.toLowerCase() ||
    name.toLowerCase().includes(p.name.toLowerCase().split(' ')[0])
  );
  let html = `<strong style="color:var(--gold)">${name}</strong>`;
  if (prov) {
    html += `<br><span style="color:var(--text3)">${prov.districts} districts · Pop: ${prov.basePop}k</span>`;
    const lean = prov.politicalLean;
    const sorted = Object.entries(lean).sort((a,b) => b[1] - a[1]);
    const top = sorted[0];
    const topParty = CAMPAIGN_PARTIES.find(p => p.id === top[0]);
    if (topParty) html += `<br>Leading: <span style="color:${topParty.color}">${topParty.shortName}</span> (${top[1]}%)`;
  }
  tip.innerHTML = html;
  tip.style.display = 'block';
  tip.style.left = (event.offsetX + 12) + 'px';
  tip.style.top = (event.offsetY - 10) + 'px';
}

function hideMapTooltip() {
  document.getElementById('map-tooltip').style.display = 'none';
}

// ═══════════════════════════════════════════════════════════════════
// SCREEN 3: ELECTION NIGHT
// ═══════════════════════════════════════════════════════════════════

function renderElectionResults(results) {
  document.getElementById('election-title').textContent =
    `${campaignState.electionYear} General Election Results`;

  // Results table
  const summary = getElectionSummary();
  const table = document.getElementById('results-table');
  table.innerHTML = `
    <div class="rt-row" style="background:transparent;border:none;font-size:.7rem;color:var(--text3)">
      <div class="rt-dot" style="visibility:hidden"></div>
      <div class="rt-name">Party</div>
      <div class="rt-const"><span class="rt-label">Constituency</span></div>
      <div class="rt-pl"><span class="rt-label">Party List</span></div>
      <div class="rt-total"><span class="rt-label">Total</span></div>
    </div>
  `;
  summary.forEach(p => {
    const row = document.createElement('div');
    row.className = `rt-row${p.isPlayer ? ' player' : ''}`;
    row.innerHTML = `
      <div class="rt-dot" style="background:${p.color}"></div>
      <div class="rt-name">${p.shortName}</div>
      <div class="rt-const"><span class="rt-val">${p.constituencySeats}</span></div>
      <div class="rt-pl"><span class="rt-val">${p.partyListSeats}</span></div>
      <div class="rt-total"><span class="rt-val">${p.totalSeats}</span></div>
    `;
    table.appendChild(row);
  });

  // Donut chart
  renderDonut(summary);

  // Legend
  const legend = document.getElementById('counter-legend');
  legend.innerHTML = '';
  summary.forEach(p => {
    legend.innerHTML += `<div class="leg-row">
      <div class="leg-color" style="background:${p.color}"></div>
      <span class="leg-name">${p.shortName}</span>
      <span class="leg-seats">${p.totalSeats}</span>
    </div>`;
  });
}

function renderDonut(summary) {
  const svg = d3.select('#seat-donut');
  svg.selectAll('*').remove();
  const w = 200, h = 200, r = 80, inner = 55;
  const g = svg.append('g').attr('transform', `translate(${w/2},${h/2})`);
  const pie = d3.pie().value(d => d.totalSeats).sort(null);
  const arc = d3.arc().innerRadius(inner).outerRadius(r);
  g.selectAll('path')
    .data(pie(summary))
    .join('path')
    .attr('d', arc)
    .attr('fill', d => d.data.color)
    .attr('stroke', 'var(--bg)')
    .attr('stroke-width', 2);
  // Center text
  g.append('text').attr('text-anchor', 'middle').attr('dy', '-0.1em')
    .attr('fill', 'var(--gold)').attr('font-size', '24').attr('font-weight', '800')
    .text('500');
  g.append('text').attr('text-anchor', 'middle').attr('dy', '1.2em')
    .attr('fill', 'var(--text3)').attr('font-size', '10').text('TOTAL SEATS');
}

document.getElementById('btn-to-coalition').addEventListener('click', () => {
  showScreen('screen-coalition');
  renderCoalition();
});

// ═══════════════════════════════════════════════════════════════════
// SCREEN 4: COALITION
// ═══════════════════════════════════════════════════════════════════

function renderCoalition() {
  const coal = coalitionPhase();
  recalcCoalitionSeats();

  document.getElementById('player-seats-display').textContent = coal.playerSeats;
  document.getElementById('seats-needed').textContent = coal.targetSeats;
  updateCoalitionMeter();

  const container = document.getElementById('coalition-offers');
  container.innerHTML = '';
  coal.offers.forEach(offer => {
    const willClass = offer.willingness > 60 ? 'high' : offer.willingness > 35 ? 'mid' : 'low';
    const card = document.createElement('div');
    card.className = 'offer-card';
    card.id = `offer-${offer.partyId}`;
    card.innerHTML = `
      <div class="oc-top">
        <div class="oc-dot" style="background:${offer.color}"></div>
        <span class="oc-name">${offer.partyName}</span>
        <span class="oc-will ${willClass}">${offer.willingness}% willing</span>
        <span class="oc-seats">${offer.seats} <span class="oc-seats-label">seats</span></span>
      </div>
      <div class="oc-demands"><strong>Demands:</strong> ${offer.ministryDemands.join(', ') || 'None'}</div>
      ${offer.conditions.length ? `<div class="oc-conditions">⚠️ ${offer.conditions.join(' · ')}</div>` : ''}
      <div class="oc-btns">
        <button class="btn btn-gold btn-md" onclick="handleAccept('${offer.partyId}')">Accept Alliance</button>
        <button class="btn btn-ghost btn-md" onclick="handleReject('${offer.partyId}')">Decline</button>
      </div>
      <span class="oc-status"></span>
    `;
    container.appendChild(card);
  });
}

function handleAccept(partyId) {
  const result = acceptCoalitionPartner(partyId);
  const card = document.getElementById(`offer-${partyId}`);
  if (result.success) {
    card.classList.add('accepted');
    card.querySelector('.oc-status').textContent = '✅ JOINED';
    toast(result.message, 'success');
  } else {
    card.classList.add('rejected');
    card.querySelector('.oc-status').textContent = '❌ REFUSED';
    toast(result.message, 'error');
  }
  updateCoalitionMeter();
}

function handleReject(partyId) {
  rejectCoalitionPartner(partyId);
  const card = document.getElementById(`offer-${partyId}`);
  card.classList.add('rejected');
  card.querySelector('.oc-status').textContent = '— DECLINED';
}

function updateCoalitionMeter() {
  recalcCoalitionSeats();
  const total = campaignState.coalitionSeats;
  const pct = (total / 500) * 100;
  document.getElementById('coalition-fill').style.width = `${pct}%`;
  document.getElementById('coalition-fill').style.background =
    total >= MAJORITY_THRESHOLD ? 'linear-gradient(90deg,var(--green),#16a34a)' : '';
  document.getElementById('coalition-total').textContent = total;
}

document.getElementById('btn-finalize-coalition').addEventListener('click', () => {
  const result = checkWinLoss();
  showScreen('screen-result');
  renderResult(result);
});

// ═══════════════════════════════════════════════════════════════════
// SCREEN 5: RESULT
// ═══════════════════════════════════════════════════════════════════

function renderResult(result) {
  const isVictory = result.result === 'victory';
  document.getElementById('result-icon').textContent = isVictory ? '🏛️' : '📉';
  const title = document.getElementById('result-title');
  title.textContent = isVictory ? 'GOVERNMENT FORMED!' : 'OPPOSITION BENCHES';
  title.className = `result-title ${isVictory ? 'victory' : 'defeat'}`;
  document.getElementById('result-message').textContent = result.message;

  // Stats
  document.getElementById('result-stats').innerHTML = `
    <div class="rs-item"><div class="rs-label">Coalition Seats</div><div class="rs-val">${result.seats}</div></div>
    <div class="rs-item"><div class="rs-label">Needed</div><div class="rs-val">${result.needed}</div></div>
    <div class="rs-item"><div class="rs-label">${isVictory ? 'Surplus' : 'Deficit'}</div>
      <div class="rs-val" style="color:${isVictory ? 'var(--green)' : 'var(--red)'}">
        ${isVictory ? '+' + result.surplus : '-' + result.deficit}
      </div>
    </div>
  `;

  const btn = document.getElementById('btn-result-action');
  if (isVictory) {
    btn.textContent = 'Enter Government House →';
    btn.className = 'btn btn-gold btn-lg';
    btn.onclick = () => winGame();
  } else {
    btn.textContent = `Try Again — ${campaignState.electionYear + 4} Election →`;
    btn.className = 'btn btn-danger btn-lg';
    btn.onclick = () => {
      const opp = becomeOpposition();
      toast(opp.message, 'warning');
      document.getElementById('election-year-display').textContent = campaignState.electionYear;
      showScreen('screen-campaign');
      renderDashboard();
      updateMap();
    };
  }
}

// ═══════════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════════

/**
 * _checkReturnFromParliament() — Step 2 fix.
 * If the player is returning from Parliament, skip Party Select
 * and jump straight to the active Campaign Dashboard.
 * Consumes parliament return data (bonus capital, etc.) from sessionStorage.
 */
function _checkReturnFromParliament() {
  if (localStorage.getItem('returnFromParliament') !== 'true') return false;

  console.log('[campaign/main.js] Return from Parliament detected — bypassing Party Select.');
  localStorage.removeItem('returnFromParliament');

  // STEP 3 FIX: Try loadCampaignState() from localStorage FIRST (most reliable)
  let restored = false;
  if (typeof loadCampaignState === 'function') {
    restored = loadCampaignState();
    if (restored) {
      console.log('[campaign/main.js] Campaign state restored from localStorage (engine.js).');
    }
  }

  // Fallback: try sessionStorage
  if (!restored) {
    try {
      const savedState = sessionStorage.getItem('tps_campaign_state');
      if (savedState) {
        const parsed = JSON.parse(savedState);
        Object.assign(campaignState, parsed);
        restored = true;
        console.log('[campaign/main.js] Campaign state restored from sessionStorage (fallback).');
      }
    } catch (e) {
      console.warn('[campaign/main.js] Could not restore campaign state:', e);
    }
  }

  // Last resort: init with default party
  if (!restored) {
    const defaultParty = CAMPAIGN_PARTIES[0];
    initCampaignState(defaultParty.id);
    campaignState.playerFunds = defaultParty.campaignFunds;
    initCampaignTimeline();
    console.log('[campaign/main.js] No saved state found — initialized with default party.');
  } else if (!restored || typeof CampaignCalendar === 'undefined') {
    // Only re-init timeline if loadCampaignState didn't set the calendar
    initCampaignTimeline();
    if (campaignState._calendarDay) {
      CampaignCalendar.currentDay = campaignState._calendarDay;
    }
  }

  // Consume parliament return data (bonus effects)
  try {
    const parlReturn = sessionStorage.getItem('tps_parliament_to_campaign');
    if (parlReturn) {
      const data = JSON.parse(parlReturn);
      sessionStorage.removeItem('tps_parliament_to_campaign');

      // Apply capital bonus (earned from debates/protests/votes)
      if (data.capitalChange) {
        // Convert parliament capital to campaign scrutiny reduction
        const scrutinyReduction = Math.floor(data.capitalChange / 3);
        campaignState.playerScrutiny = Math.max(0, campaignState.playerScrutiny - scrutinyReduction);
        console.log(`[campaign/main.js] Parliament capital → Scrutiny reduced by ${scrutinyReduction}`);
      }

      // Log the return
      campaignState.campaignLog.push({
        week: CampaignCalendar.getWeek(),
        type: 'parliament',
        message: `🏛️ Returned from Parliament — ${data.debatesCompleted || 0} debates, ${data.protestsWon || 0} protests won, ${data.votesAttended || 0} votes`
      });

      toast(`🏛️ Welcome back! Parliament results applied.`, 'success');
    }
  } catch (e) {
    console.warn('[campaign/main.js] Could not consume parliament return data:', e);
  }

  // Skip to dashboard
  showScreen('screen-campaign');
  renderDashboard();
  initMap();

  return true;
}

// ═══════════════════════════════════════════════════════════════════
// STEP 2 FIX: Save/Restore helpers for campaign state persistence
// ═══════════════════════════════════════════════════════════════════

/**
 * _saveCampaignToStorage() — Serializes campaignState to sessionStorage.
 * Called after each state-changing action and on "Begin Campaign".
 */
function _saveCampaignToStorage() {
  try {
    if (campaignState) {
      // Save to sessionStorage (for same-tab restores)
      sessionStorage.setItem('tps_campaign_state', JSON.stringify(campaignState));
      // STEP 3 FIX: Also save to localStorage (survives tab close + parliament trips)
      saveCampaignState();
    }
  } catch (e) {
    console.warn('[campaign/main.js] Could not save campaign state:', e);
  }
}

/**
 * _restoreDashboardFromStorage() — Restores the campaign dashboard
 * after a language-change page reload. Reads from localStorage
 * (UI state flag + party ID) and sessionStorage (full campaign state).
 * @returns {boolean} true if dashboard was restored
 */
function _restoreDashboardFromStorage() {
  if (localStorage.getItem('campaign_ui_state') !== 'dashboard') return false;

  const savedPartyId = localStorage.getItem('campaign_party_id');
  if (!savedPartyId) return false;

  console.log('[campaign/main.js] Restoring dashboard after reload...');

  // STEP 3 FIX: Try loadCampaignState() from localStorage FIRST
  // This is the most reliable source — survives tab closes and parliament trips.
  let restored = false;
  if (typeof loadCampaignState === 'function') {
    restored = loadCampaignState();
    if (restored) {
      console.log('[campaign/main.js] Full campaign state restored from localStorage (engine.js).');
    }
  }

  // Fallback: try sessionStorage (for backward compat)
  if (!restored) {
    try {
      const savedState = sessionStorage.getItem('tps_campaign_state');
      if (savedState) {
        initCampaignState(savedPartyId);
        Object.assign(campaignState, JSON.parse(savedState));
        restored = true;
        console.log('[campaign/main.js] Campaign state restored from sessionStorage (fallback).');
      }
    } catch (e) {
      console.warn('[campaign/main.js] Could not restore session data:', e);
    }
  }

  // Last resort: re-initialize with saved party
  if (!restored) {
    initCampaignState(savedPartyId);
    const party = CAMPAIGN_PARTIES.find(p => p.id === savedPartyId);
    if (party) campaignState.playerFunds = party.campaignFunds;
    console.log('[campaign/main.js] No saved data — re-initialized with saved party.');
  }

  // Set globals
  selectedPartyId = savedPartyId;
  selectedDifficulty = localStorage.getItem('tps_difficulty') || 'normal';
  TPSGlobalState.difficulty = selectedDifficulty;

  // Initialize timeline (won't reset calendar if loadCampaignState already set it)
  if (!restored || typeof CampaignCalendar === 'undefined') {
    initCampaignTimeline();
  }

  // Show dashboard
  showScreen('screen-campaign');
  renderDashboard();
  initMap();

  console.log('[campaign/main.js] Dashboard restored successfully.');
  return true;
}

/**
 * clearCampaignUIState() — Clears all campaign persistence.
 * Call this when the player resets progress or returns to main menu.
 */
function clearCampaignUIState() {
  localStorage.removeItem('campaign_ui_state');
  localStorage.removeItem('campaign_party_id');
  sessionStorage.removeItem('tps_campaign_state');
  console.log('[campaign/main.js] Campaign UI state cleared.');
}

// ═══════════════════════════════════════════════════════════════════
// BOOT SEQUENCE — Determines which screen to show on page load.
// Priority: 1) Return from Parliament → Dashboard
//           2) Saved UI state → Dashboard (language reload)
//           3) STRICT FALLBACK → Party Select (default/wipe)
// ═══════════════════════════════════════════════════════════════════
if (!_checkReturnFromParliament()) {
  if (!_restoreDashboardFromStorage()) {
    // ── STRICT FALLBACK: Force Party Select screen ──
    // This runs when:
    //   - Fresh first visit (no saved state)
    //   - After Wipe Save Data (all state keys cleared)
    //   - After game completion / manual reset
    console.log('[campaign/main.js] No saved state found — showing Party Select.');
    showScreen('screen-party-select');
    renderPartyCards();
    _initDifficultySelector();
  }
}

console.log('[campaign/main.js] UI initialized.');

// ═══════════════════════════════════════════════════════════════════
// DIFFICULTY SELECTOR — Binds the 3-button group on Party Select
// ═══════════════════════════════════════════════════════════════════

/**
 * _initDifficultySelector() — Binds click handlers to Easy/Normal/Hard
 * buttons. Defaults to 'normal'. Selection is final once "Begin Campaign"
 * is clicked (saved to localStorage, never changeable again).
 */
function _initDifficultySelector() {
  const group = document.getElementById('diff-btn-group');
  if (!group) return;

  const buttons = group.querySelectorAll('.diff-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      // Remove active from all
      buttons.forEach(b => b.classList.remove('active'));
      // Set this one active
      btn.classList.add('active');
      selectedDifficulty = btn.dataset.difficulty;
      console.log(`[campaign/main.js] Difficulty selected: ${selectedDifficulty}`);
    });
  });
}
