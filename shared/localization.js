// ═══════════════════════════════════════════════════════════════════════════
// TPS — /shared/localization.js
// Centralized Bilingual Dictionary (TH / EN)
// ═══════════════════════════════════════════════════════════════════════════
// All user-facing text in the game should reference tps_dict[lang][key].
// Keys are organized by category: UI chrome, actions, difficulty, modules.
// ═══════════════════════════════════════════════════════════════════════════

const tps_dict = {

  // ═══════════════════════════════════════════════════════════
  //  ENGLISH
  // ═══════════════════════════════════════════════════════════
  EN: {

    // ── Settings Modal ──────────────────────────────────────
    settings_title:           'Settings',
    settings_language:        'Language',
    settings_debate_speed:    'Live Debate Speed',
    settings_difficulty:      'Difficulty',
    settings_wipe:            'Wipe Save Data',
    settings_wipe_confirm:    'Are you sure? All progress will be permanently deleted.',
    settings_wipe_done:       'All save data has been wiped.',
    settings_close:           'Close',

    // ── Difficulty Labels ───────────────────────────────────
    difficulty_easy:          'Easy',
    difficulty_normal:        'Normal',
    difficulty_hard:          'Hard',
    difficulty_not_set:       'Not Set',
    difficulty_desc_easy:     'Relaxed mode. Lower costs, gentler AI.',
    difficulty_desc_normal:   'Balanced experience — the intended way to play.',
    difficulty_desc_hard:     'Punishing. Higher costs, aggressive opponents, zero margin for error.',
    diff_select_title:        'Select Difficulty',
    diff_select_sub:          'This cannot be changed after the campaign begins.',
    diff_btn_easy_desc:       'Lower costs, gentler AI',
    diff_btn_normal_desc:     'Balanced — intended experience',
    diff_btn_hard_desc:       'Punishing, zero margin',

    // ── Debate Speed Labels ─────────────────────────────────
    speed_1x:                 '1× Normal',
    speed_2x:                 '2× Fast',
    speed_3x:                 '3× Rapid',

    // ── Main Menu ───────────────────────────────────────────
    menu_title_thai:          'ราชอาณาจักรไทย',
    menu_title_main:          'Thailand',
    menu_title_sub:           'Political Simulation',
    menu_subtitle:            'Lead your party to victory. Build coalitions. Govern a nation.',
    menu_btn_campaign:        'Start Election Campaign',
    menu_btn_campaign_desc:   'Build your party, rally support across 400 districts, and win 251+ seats',
    menu_btn_quickstart:      'Quick Start: Form Government',
    menu_btn_quickstart_desc: 'Skip elections — jump straight into governing the Kingdom of Thailand',
    menu_info_seats:          '500 Seats',
    menu_info_govern:         '251 to Govern',
    menu_info_campaign:       '8-Week Campaign',
    menu_info_term:           '48-Month Term',
    menu_footer_line1:        'A Browser-Based Political Strategy Experience',
    menu_footer_line2:        'v1.0 — 2027 Election Cycle',

    // ── Campaign Module ─────────────────────────────────────
    campaign_choose_party:    'Choose Your Party',
    campaign_choose_sub:      'Select the political party you will lead to victory in the',
    campaign_election:        'general election.',
    campaign_begin:           'Begin Campaign →',
    campaign_hq:              'Campaign HQ',
    campaign_week:            'WEEK',
    campaign_funds:           'Campaign Funds',
    campaign_scrutiny:        'Media Scrutiny',
    campaign_ap:              'Action Points',
    campaign_map_title:       'Thailand Electoral Map',
    campaign_polls_title:     'National Polls',
    campaign_actions_title:   'Campaign Actions',
    campaign_log_title:       'Campaign Log',
    campaign_log_empty:       'Campaign begins. Choose your actions wisely.',
    campaign_roster_title:    'MP Roster',
    campaign_next_day:        '☀️ Next Day →',
    campaign_skip_week:       '⏩ Skip to Week End',
    campaign_hold_election:   '🗳️ Hold General Election',

    // ── Campaign Actions ────────────────────────────────────
    action_rally:             'Hold Rally',
    action_rally_cost:        '-50M฿ · -1 AP',
    action_io:                'IO Campaign',
    action_io_cost:           '-80M฿ · -1 AP',
    action_banyai:            'Deploy Ban Yai',
    action_banyai_cost:       '-120M฿ · -1 AP',
    action_fundraise:         'Fundraise',
    action_fundraise_cost:    '-1 AP',
    action_confirm:           'Confirm',
    action_cancel:            'Cancel',
    action_select_province:   'Select Province:',
    action_select_region:     'Select Region:',
    action_select_district:   'Select District:',

    // ── Parliament Module ───────────────────────────────────
    parliament_title:         'TPS: Parliament',
    parliament_subtitle:      'สภาผู้แทนราษฎรไทย',
    parliament_floor:         'The Floor — สภาผู้แทนราษฎร',
    parliament_standby:       'STANDBY',
    parliament_mp_status:     'MP Status',
    parliament_actions:       'Actions',
    parliament_begin_session: 'Begin Parliament Session',
    parliament_begin_sub:     'เริ่มการประชุมสภา',
    parliament_no_session:    'The House is not in session',
    parliament_no_session_sub:'Press the button below to convene Parliament and begin a live debate session.',

    // ── Parliament Actions ──────────────────────────────────
    parl_protest_title:       'PROTEST — POINT OF ORDER',
    parl_protest_slander:     'Slander / Personal Attack',
    parl_protest_offtopic:    'Off-Topic / Irrelevant',
    parl_protest_misleading:  'Misleading / False Info',
    parl_your_turn:           'YOUR TURN — CHOOSE YOUR STANCE',
    parl_speech_aggressive:   'Aggressive Debate',
    parl_speech_technical:    'Technical Argument',
    parl_speech_diplomatic:   'Diplomatic Appeal',
    parl_vote_title:          'CAST YOUR VOTE',
    parl_vote_aye:            'AYE — เห็นด้วย',
    parl_vote_nay:            'NAY — ไม่เห็นด้วย',
    parl_vote_abstain:        'ABSTAIN — งดออกเสียง',
    parl_interp_title:        'INTERPELLATION QUEUE',
    parl_queue_interp:        'Queue Interpellation',
    parl_legislation:         'LEGISLATION',
    parl_propose_bill:        'Propose Bill',

    // ── Parliament Stats ────────────────────────────────────
    parl_political_capital:   'Political Capital',
    parl_local_popularity:    'Local Popularity',
    parl_funds:               'Funds (฿M)',
    parl_this_week:           'This Week',
    parl_debates:             'Debates',
    parl_protests_won:        'Protests Won',
    parl_votes:               'Votes',
    parl_interpellations:     'Interpellations',
    parl_event_log:           'Event Log',
    parl_influence:           'Influence',

    // ── Main Game Module ────────────────────────────────────
    game_title:               'Thailand Political Simulation',
    game_subtitle:            'Navigate the most volatile democracy in Southeast Asia',
    game_desc:                'You are the newly elected Prime Minister. Manage a fragile coalition, survive crisis after crisis, and keep the generals in their barracks — for 48 months. Can you complete your term?',
    game_new:                 'New Game',
    game_continue:            'Continue Saved Game',
    game_back:                '← Back to Main Menu',
    game_approval:            'Approval Rating',
    game_budget:              'National Budget',
    game_gdp:                 'GDP Growth',
    game_unrest:              'Social Unrest',
    game_military:            'Military Patience',
    game_parliament:          'Parliament',
    game_coalition_stab:      'Coalition Stability',
    game_legislation:         'Legislation',
    game_event_log:           'Event Log',
    game_begin_month:         'Begin This Month',
    game_gov_house:           'Government House',
    game_gov_desc:            'Your coalition awaits your leadership, Prime Minister.',
    game_end_month:           'End Month & Proceed',
    game_next_month:          'Next Month — Face New Crisis',
    game_crisis:              'BREAKING — CRISIS EVENT',
    game_sitrep:              'SITUATION REPORT',
    game_monthly_report:      'MONTHLY REPORT',
    game_gameover:            'GAME OVER',
    game_restart:             'New Game',

    // ── Election Night ──────────────────────────────────────
    election_live:            '🔴 LIVE — ELECTION NIGHT',
    election_results:         'General Election Results',
    election_proceed:         'Proceed to Coalition Formation →',

    // ── Coalition ───────────────────────────────────────────
    coalition_title:          '🤝 Coalition Formation',
    coalition_seats_needed:   'seats to form a government. You currently have',
    coalition_accept:         'Accept Alliance',
    coalition_decline:        'Decline',
    coalition_finalize:       'Finalize Coalition & Check Result',

    // ── Results ─────────────────────────────────────────────
    result_victory:           'GOVERNMENT FORMED!',
    result_defeat:            'OPPOSITION BENCHES',
    result_enter_gov:         'Enter Government House →',
    result_try_again:         'Try Again — ',

    // ── Toast / Misc ────────────────────────────────────────
    toast_mp_updated:         'MP updated!',
    toast_mp_reset:           'MP reset to default',
    toast_action_complete:    'Action completed!',
    toast_raised:             'Raised',
  },


  // ═══════════════════════════════════════════════════════════
  //  THAI (ภาษาไทย)
  // ═══════════════════════════════════════════════════════════
  TH: {

    // ── Settings Modal ──────────────────────────────────────
    settings_title:           'ตั้งค่า',
    settings_language:        'ภาษา',
    settings_debate_speed:    'ความเร็วการอภิปราย',
    settings_difficulty:      'ระดับความยาก',
    settings_wipe:            'ลบข้อมูลเซฟ',
    settings_wipe_confirm:    'คุณแน่ใจหรือไม่? ข้อมูลทั้งหมดจะถูกลบถาวร',
    settings_wipe_done:       'ข้อมูลเซฟทั้งหมดถูกลบแล้ว',
    settings_close:           'ปิด',

    // ── Difficulty Labels ───────────────────────────────────
    difficulty_easy:          'ง่าย',
    difficulty_normal:        'ปานกลาง',
    difficulty_hard:          'ยาก',
    difficulty_not_set:       'ยังไม่ได้เลือก',
    difficulty_desc_easy:     'โหมดผ่อนคลาย ต้นทุนต่ำ AI อ่อนโยน',
    difficulty_desc_normal:   'ประสบการณ์ที่สมดุล — วิธีเล่นที่ตั้งใจไว้',
    difficulty_desc_hard:     'ท้าทาย ต้นทุนสูง คู่แข่งดุดัน ไม่มีพื้นที่สำหรับข้อผิดพลาด',
    diff_select_title:        'เลือกระดับความยาก',
    diff_select_sub:          'ไม่สามารถเปลี่ยนได้หลังเริ่มหาเสียง',
    diff_btn_easy_desc:       'ต้นทุนต่ำ AI อ่อนโยน',
    diff_btn_normal_desc:     'สมดุล — ประสบการณ์ตามตั้งใจ',
    diff_btn_hard_desc:       'ท้าทาย ไม่มีพื้นที่ผิดพลาด',

    // ── Debate Speed Labels ─────────────────────────────────
    speed_1x:                 '1× ปกติ',
    speed_2x:                 '2× เร็ว',
    speed_3x:                 '3× เร็วมาก',

    // ── Main Menu ───────────────────────────────────────────
    menu_title_thai:          'ราชอาณาจักรไทย',
    menu_title_main:          'Thailand',
    menu_title_sub:           'Political Simulation',
    menu_subtitle:            'นำพรรคของคุณสู่ชัยชนะ สร้างพันธมิตร บริหารประเทศ',
    menu_btn_campaign:        'เริ่มหาเสียงเลือกตั้ง',
    menu_btn_campaign_desc:   'สร้างพรรค รวมพลังทั่ว 400 เขต ชนะ 251+ ที่นั่ง',
    menu_btn_quickstart:      'เริ่มเร็ว: จัดตั้งรัฐบาล',
    menu_btn_quickstart_desc: 'ข้ามเลือกตั้ง — กระโดดเข้าสู่การบริหารราชอาณาจักรไทย',
    menu_info_seats:          '500 ที่นั่ง',
    menu_info_govern:         '251 เพื่อจัดตั้งรัฐบาล',
    menu_info_campaign:       'หาเสียง 8 สัปดาห์',
    menu_info_term:           'วาระ 48 เดือน',
    menu_footer_line1:        'เกมกลยุทธ์การเมืองบนเว็บเบราว์เซอร์',
    menu_footer_line2:        'v1.0 — รอบเลือกตั้ง 2570',

    // ── Campaign Module ─────────────────────────────────────
    campaign_choose_party:    'เลือกพรรคของคุณ',
    campaign_choose_sub:      'เลือกพรรคการเมืองที่คุณจะนำไปสู่ชัยชนะในการ',
    campaign_election:        'เลือกตั้งทั่วไป',
    campaign_begin:           'เริ่มหาเสียง →',
    campaign_hq:              'กองบัญชาการหาเสียง',
    campaign_week:            'สัปดาห์',
    campaign_funds:           'เงินทุนหาเสียง',
    campaign_scrutiny:        'การตรวจสอบสื่อ',
    campaign_ap:              'แต้มปฏิบัติการ',
    campaign_map_title:       'แผนที่เขตเลือกตั้งไทย',
    campaign_polls_title:     'ผลสำรวจระดับชาติ',
    campaign_actions_title:   'ปฏิบัติการหาเสียง',
    campaign_log_title:       'บันทึกการหาเสียง',
    campaign_log_empty:       'เริ่มหาเสียงแล้ว เลือกปฏิบัติการอย่างรอบคอบ',
    campaign_roster_title:    'บัญชีรายชื่อ ส.ส.',
    campaign_next_day:        '☀️ วันถัดไป →',
    campaign_skip_week:       '⏩ ข้ามไปสิ้นสุดสัปดาห์',
    campaign_hold_election:   '🗳️ จัดการเลือกตั้งทั่วไป',

    // ── Campaign Actions ────────────────────────────────────
    action_rally:             'จัดชุมนุมหาเสียง',
    action_rally_cost:        '-50ล้าน฿ · -1 AP',
    action_io:                'ปฏิบัติการ IO',
    action_io_cost:           '-80ล้าน฿ · -1 AP',
    action_banyai:            'ส่งบ้านใหญ่',
    action_banyai_cost:       '-120ล้าน฿ · -1 AP',
    action_fundraise:         'ระดมทุน',
    action_fundraise_cost:    '-1 AP',
    action_confirm:           'ยืนยัน',
    action_cancel:            'ยกเลิก',
    action_select_province:   'เลือกจังหวัด:',
    action_select_region:     'เลือกภูมิภาค:',
    action_select_district:   'เลือกเขต:',

    // ── Parliament Module ───────────────────────────────────
    parliament_title:         'TPS: สภา',
    parliament_subtitle:      'สภาผู้แทนราษฎรไทย',
    parliament_floor:         'ห้องประชุม — สภาผู้แทนราษฎร',
    parliament_standby:       'รอดำเนินการ',
    parliament_mp_status:     'สถานะ ส.ส.',
    parliament_actions:       'ปฏิบัติการ',
    parliament_begin_session: 'เริ่มการประชุมสภา',
    parliament_begin_sub:     'เริ่มการประชุมสภา',
    parliament_no_session:    'สภาไม่ได้อยู่ในการประชุม',
    parliament_no_session_sub:'กดปุ่มด้านล่างเพื่อเปิดสภาและเริ่มการอภิปราย',

    // ── Parliament Actions ──────────────────────────────────
    parl_protest_title:       'ประท้วง — ประเด็นข้อบังคับ',
    parl_protest_slander:     'หมิ่นประมาท / โจมตีส่วนตัว',
    parl_protest_offtopic:    'นอกประเด็น / ไม่เกี่ยวข้อง',
    parl_protest_misleading:  'ชี้นำผิด / ข้อมูลเท็จ',
    parl_your_turn:           'ถึงคิวคุณ — เลือกจุดยืน',
    parl_speech_aggressive:   'อภิปรายดุดัน',
    parl_speech_technical:    'อภิปรายเชิงเทคนิค',
    parl_speech_diplomatic:   'อภิปรายทางการทูต',
    parl_vote_title:          'ลงคะแนนเสียง',
    parl_vote_aye:            'เห็นด้วย',
    parl_vote_nay:            'ไม่เห็นด้วย',
    parl_vote_abstain:        'งดออกเสียง',
    parl_interp_title:        'คิวกระทู้ถามสด',
    parl_queue_interp:        'ตั้งกระทู้ถามสด',
    parl_legislation:         'กระบวนการนิติบัญญัติ',
    parl_propose_bill:        'เสนอร่างกฎหมาย',

    // ── Parliament Stats ────────────────────────────────────
    parl_political_capital:   'ทุนทางการเมือง',
    parl_local_popularity:    'ความนิยมในท้องถิ่น',
    parl_funds:               'เงินทุน (ล้าน฿)',
    parl_this_week:           'สัปดาห์นี้',
    parl_debates:             'การอภิปราย',
    parl_protests_won:        'ประท้วงสำเร็จ',
    parl_votes:               'การลงคะแนน',
    parl_interpellations:     'กระทู้ถาม',
    parl_event_log:           'บันทึกเหตุการณ์',
    parl_influence:           'อิทธิพล',

    // ── Main Game Module ────────────────────────────────────
    game_title:               'จำลองการเมืองไทย',
    game_subtitle:            'นำทางประชาธิปไตยที่ผันผวนที่สุดในเอเชียตะวันออกเฉียงใต้',
    game_desc:                'คุณเป็นนายกรัฐมนตรีที่เพิ่งได้รับเลือกตั้ง จัดการพันธมิตรที่เปราะบาง รอดวิกฤตแล้ววิกฤตเล่า และรักษาทหารให้อยู่ในค่าย — ตลอด 48 เดือน ทำสำเร็จไหม?',
    game_new:                 'เกมใหม่',
    game_continue:            'เล่นต่อจากเซฟ',
    game_back:                '← กลับเมนูหลัก',
    game_approval:            'คะแนนนิยม',
    game_budget:              'งบประมาณแผ่นดิน',
    game_gdp:                 'ผลิตภัณฑ์มวลรวม',
    game_unrest:              'ความไม่สงบ',
    game_military:            'ความอดทนของกองทัพ',
    game_parliament:          'สภา',
    game_coalition_stab:      'เสถียรภาพพันธมิตร',
    game_legislation:         'นิติบัญญัติ',
    game_event_log:           'บันทึกเหตุการณ์',
    game_begin_month:         'เริ่มเดือนนี้',
    game_gov_house:           'ทำเนียบรัฐบาล',
    game_gov_desc:            'พันธมิตรรอผู้นำของท่าน ท่านนายกรัฐมนตรี',
    game_end_month:           'จบเดือน & ดำเนินการต่อ',
    game_next_month:          'เดือนถัดไป — เผชิญวิกฤตใหม่',
    game_crisis:              'ด่วน — เหตุการณ์วิกฤต',
    game_sitrep:              'รายงานสถานการณ์',
    game_monthly_report:      'รายงานประจำเดือน',
    game_gameover:            'จบเกม',
    game_restart:             'เกมใหม่',

    // ── Election Night ──────────────────────────────────────
    election_live:            '🔴 สด — คืนเลือกตั้ง',
    election_results:         'ผลการเลือกตั้งทั่วไป',
    election_proceed:         'ดำเนินการจัดตั้งรัฐบาลพันธมิตร →',

    // ── Coalition ───────────────────────────────────────────
    coalition_title:          '🤝 จัดตั้งรัฐบาลพันธมิตร',
    coalition_seats_needed:   'ที่นั่งเพื่อจัดตั้งรัฐบาล คุณมี',
    coalition_accept:         'ยอมรับพันธมิตร',
    coalition_decline:        'ปฏิเสธ',
    coalition_finalize:       'สรุปพันธมิตร & ตรวจสอบผลลัพธ์',

    // ── Results ─────────────────────────────────────────────
    result_victory:           'จัดตั้งรัฐบาลสำเร็จ!',
    result_defeat:            'ฝ่ายค้าน',
    result_enter_gov:         'เข้าทำเนียบรัฐบาล →',
    result_try_again:         'ลองอีกครั้ง — ',

    // ── Toast / Misc ────────────────────────────────────────
    toast_mp_updated:         'อัปเดต ส.ส. แล้ว!',
    toast_mp_reset:           'รีเซ็ต ส.ส. เป็นค่าเริ่มต้น',
    toast_action_complete:    'ปฏิบัติการสำเร็จ!',
    toast_raised:             'ระดมทุนได้',
  }
};


// ─── Helper: Get localized text ─────────────────────────────────────────
/**
 * t(key) — Returns localized string for the current language.
 * Falls back to EN if key not found in current language.
 * @param {string} key — Dictionary key
 * @returns {string}
 */
function t(key) {
  const lang = getCurrentLang();
  return (tps_dict[lang] && tps_dict[lang][key]) || tps_dict['EN'][key] || key;
}

/**
 * tLang(key, lang) — Returns localized string for a specific language.
 * @param {string} key
 * @param {string} lang — 'TH' or 'EN'
 * @returns {string}
 */
function tLang(key, lang) {
  return (tps_dict[lang] && tps_dict[lang][key]) || tps_dict['EN'][key] || key;
}


// ═══════════════════════════════════════════════════════════════════════════
// GLOBAL LOCALIZATION ENGINE — data-i18n Attribute System
// ═══════════════════════════════════════════════════════════════════════════
//
// Usage in HTML:
//   <span data-i18n="campaign_funds">Campaign Funds</span>
//   <button data-i18n="campaign_begin">Begin Campaign →</button>
//   <input data-i18n="action_select_province" data-i18n-attr="placeholder">
//   <button data-i18n="settings_close" data-i18n-attr="title">
//
// The original English text in the HTML serves as the fallback.
// applyTranslations() overwrites it with the dictionary value.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * getCurrentLang() — Returns the active language code ('EN' or 'TH').
 * Priority: TPSGlobalState > localStorage > default 'EN'.
 * @returns {'EN'|'TH'}
 */
function getCurrentLang() {
  if (typeof TPSGlobalState !== 'undefined' && TPSGlobalState.language) {
    return TPSGlobalState.language;
  }
  return localStorage.getItem('tps_language') || 'EN';
}

/**
 * applyTranslations() — Scans the entire DOM for [data-i18n] elements
 * and updates their content with the correct localized string.
 *
 * Supports:
 *   - innerText (default): <span data-i18n="key">fallback</span>
 *   - placeholder:         <input data-i18n="key" data-i18n-attr="placeholder">
 *   - title:               <div data-i18n="key" data-i18n-attr="title">
 *   - aria-label:          <button data-i18n="key" data-i18n-attr="aria-label">
 *   - innerHTML:           <span data-i18n="key" data-i18n-html="true">fallback</span>
 *
 * Call this:
 *   - On DOMContentLoaded (initial page load)
 *   - After changeLanguage() (live language switch)
 *   - After dynamically adding new i18n-tagged elements
 */
function applyTranslations() {
  const lang = getCurrentLang();
  const dict = tps_dict[lang] || tps_dict['EN'];
  const fallback = tps_dict['EN'];

  const elements = document.querySelectorAll('[data-i18n]');
  elements.forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (!key) return;

    const value = dict[key] || fallback[key];
    if (!value) return; // Key not found in any dictionary — leave element as-is

    // Check if a specific attribute should be set instead of text content
    const attr = el.getAttribute('data-i18n-attr');
    if (attr) {
      el.setAttribute(attr, value);
      return;
    }

    // Check if innerHTML mode is requested (for strings containing HTML entities/formatting)
    const useHTML = el.getAttribute('data-i18n-html') === 'true';
    if (useHTML) {
      el.innerHTML = value;
    } else {
      el.textContent = value;
    }
  });

  // Update <html lang> attribute for accessibility
  document.documentElement.lang = (lang === 'TH') ? 'th' : 'en';

  console.log(`[localization.js] Applied translations: ${elements.length} elements → ${lang}`);
}

/**
 * changeLanguage(lang) — Changes the active language globally.
 *
 * This function:
 *   1. Validates the language code ('EN' or 'TH')
 *   2. Persists to localStorage as 'tps_language'
 *   3. Updates TPSGlobalState (if available)
 *   4. Calls applyTranslations() to update all [data-i18n] elements
 *   5. Dispatches 'tpsLangChanged' CustomEvent (new system)
 *   6. Dispatches 'tps:language-changed' CustomEvent (backward compat)
 *
 * @param {'EN'|'TH'} lang — The language to switch to
 */
function changeLanguage(lang) {
  // Validate
  if (lang !== 'EN' && lang !== 'TH') {
    console.warn(`[localization.js] Invalid language: "${lang}". Use 'EN' or 'TH'.`);
    return;
  }

  // Persist
  localStorage.setItem('tps_language', lang);

  // Update global state (if settings.js is loaded)
  if (typeof TPSGlobalState !== 'undefined') {
    TPSGlobalState.language = lang;
    TPSGlobalState.save();
  }

  // Apply to all tagged elements
  applyTranslations();

  // Dispatch events for other scripts to react
  window.dispatchEvent(new CustomEvent('tpsLangChanged', { detail: { language: lang } }));
  window.dispatchEvent(new CustomEvent('tps:language-changed', { detail: { language: lang } }));

  console.log(`[localization.js] Language changed to: ${lang}`);
}


// ═══════════════════════════════════════════════════════════════════════════
// AUTO-APPLY ON LOAD — Ensure correct language is displayed on page open
// ═══════════════════════════════════════════════════════════════════════════

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    applyTranslations();
  });
} else {
  // DOM already ready
  applyTranslations();
}

console.log('[localization.js] Loaded — ' + Object.keys(tps_dict.EN).length + ' EN keys, ' + Object.keys(tps_dict.TH).length + ' TH keys');
