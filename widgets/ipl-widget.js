/**
 * ============================================================
 * CRICKET SCHEDULE + IPL STARS WIDGET
 * ============================================================
 * Two-column dark layout:
 *   Column 1: Cricket match schedule carousel (3 visible)
 *   Column 2: IPL star player profiles carousel (3 visible)
 * Auto-refreshes every 30 minutes
 */

// ═══════════════════════════════════════════
// COLUMN 1: CRICKET SCHEDULE CAROUSEL
// ═══════════════════════════════════════════

(function() {

  // ─── Scroll (3 cards at ~284px each + gaps) ───
  window.scrollCarousel = function(direction) {
    var c = document.getElementById('iplLiveContent');
    if (!c) return;
    c.scrollBy({ left: direction * 852, behavior: 'smooth' });
  };

  function updateArrows() {
    var c = document.getElementById('iplLiveContent');
    var l = document.getElementById('carouselLeft');
    var r = document.getElementById('carouselRight');
    if (!c || !l || !r) return;
    l.style.opacity = c.scrollLeft <= 10 ? '0.3' : '1';
    l.style.pointerEvents = c.scrollLeft <= 10 ? 'none' : 'auto';
    var end = c.scrollLeft >= (c.scrollWidth - c.clientWidth - 10);
    r.style.opacity = end ? '0.3' : '1';
    r.style.pointerEvents = end ? 'none' : 'auto';
  }

  // ─── Load ───
  async function loadSchedule() {
    var container = document.getElementById('iplLiveContent');
    if (!container) return;

    try {
      var res = await fetch(IPL_WORKER_URL);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      var data = await res.json();
      var matches = (data && data.data && Array.isArray(data.data)) ? data.data : [];

      if (matches.length === 0) {
        container.innerHTML = '<div class="dark-loading">No matches found</div>';
        return;
      }

      matches = sortMatches(matches);
      container.innerHTML = '';
      var count = Math.min(matches.length, 30);
      for (var i = 0; i < count; i++) {
        var card = document.createElement('div');
        var ipl = isIPLMatch(matches[i]);
        card.className = 'dark-match-card' + (ipl ? ' ipl-accent' : '');
        card.innerHTML = buildMatchCard(matches[i]);
        container.appendChild(card);
      }

      var upd = document.getElementById('lastUpdated');
      if (upd) {
        upd.style.display = 'inline';
        upd.textContent = '• Updated ' + new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
      }

      updateArrows();
      container.removeEventListener('scroll', updateArrows);
      container.addEventListener('scroll', updateArrows, { passive: true });

    } catch (err) {
      console.error('Schedule error:', err);
      container.innerHTML = '<div class="dark-loading">Failed to load — <span onclick="refreshIPLData()" style="color:#60a5fa;cursor:pointer;">retry</span></div>';
    }
  }

  // ─── Sort ───
  function sortMatches(matches) {
    return matches.slice().sort(function(a, b) {
      var aI = isIPLMatch(a) ? 0 : 1, bI = isIPLMatch(b) ? 0 : 1;
      if (aI !== bI) return aI - bI;
      var aP = statusPri(a), bP = statusPri(b);
      if (aP !== bP) return aP - bP;
      var aD = new Date(a.dateTimeGMT || a.date || 0).getTime();
      var bD = new Date(b.dateTimeGMT || b.date || 0).getTime();
      if (!a.matchStarted && !a.matchEnded) return aD - bD;
      return bD - aD;
    });
  }

  function statusPri(m) {
    if (m.matchStarted && !m.matchEnded) return 0;
    if (!m.matchStarted && !m.matchEnded) return 1;
    return 2;
  }

  // ─── IPL Detection ───
  function isIPLMatch(m) {
    var n = (m.name || '').toLowerCase();
    if (n.indexOf('indian premier league') !== -1 || n.indexOf(' ipl ') !== -1 || n.indexOf('ipl ') === 0 || n.indexOf(', ipl') !== -1) return true;
    var teams = ['chennai super kings','mumbai indians','royal challengers bengaluru','royal challengers bangalore','kolkata knight riders','sunrisers hyderabad','rajasthan royals','delhi capitals','punjab kings','lucknow super giants','gujarat titans'];
    for (var i = 0; i < teams.length; i++) if (n.indexOf(teams[i]) !== -1) return true;
    if (m.teams) { var ts = m.teams.join(' ').toLowerCase(); for (var j = 0; j < teams.length; j++) if (ts.indexOf(teams[j]) !== -1) return true; }
    return false;
  }

  // ─── Build Match Card (Dark Theme) ───
  function buildMatchCard(m) {
    var isLive = m.matchStarted && !m.matchEnded;
    var isDone = m.matchEnded;
    var isUp = !m.matchStarted && !m.matchEnded;
    var ipl = isIPLMatch(m);

    // Status bar
    var statusCls = isLive ? 'status-live' : isDone ? 'status-result' : 'status-upcoming';
    var statusText = isLive ? '● LIVE' : isDone ? (m.status || 'Result') : 'Forthcoming';
    var badgeText = ipl ? 'IPL 2026' : getBadgeShort(m);

    var html = '<div class="dark-status-bar ' + statusCls + '">';
    html += '<span class="dark-status-text">' + statusText + '</span>';
    if (badgeText) html += '<span class="dark-status-badge">' + badgeText + '</span>';
    html += '</div>';

    html += '<div class="dark-card-body">';
    html += getTeamRows(m);

    // Info row
    var date = fmtDate(m.dateTimeGMT || m.date);
    var venue = shortVenue(m.venue || '');
    html += '<div class="dark-info-row">';
    if (date) html += '<span>📅 ' + date + '</span>';
    if (venue) html += '<span>📍 ' + venue + '</span>';
    html += '</div>';

    // Tournament badge
    var tourney = getBadgeFull(m);
    if (tourney) {
      html += '<div class="dark-tournament"><span class="dark-tournament-badge' + (ipl ? ' ipl-badge' : '') + '">' + tourney + '</span></div>';
    }

    // Result text (only for completed, not already in status bar)
    if (isDone && m.status && m.status.length > 20) {
      html += '<div class="dark-result">' + m.status + '</div>';
    }

    html += '</div>';
    return html;
  }

  // ─── Team Rows ───
  function getTeamRows(m) {
    if (!m.teamInfo || m.teamInfo.length < 2) {
      if (m.teams && m.teams.length >= 2) {
        return '<div class="dark-team-row"><span class="dark-team-name">' + m.teams[0] + '</span></div>' +
               '<div class="dark-team-row"><span class="dark-team-name">' + m.teams[1] + '</span></div>';
      }
      return '<div class="dark-team-row"><span class="dark-team-name">' + (m.name || 'TBD').split(',')[0] + '</span></div>';
    }

    var t1 = m.teamInfo[0], t2 = m.teamInfo[1];
    var n1 = t1.shortname || t1.name || '??', n2 = t2.shortname || t2.name || '??';
    var def = 'https://h.cricapi.com/img/icon512.png';

    var s1 = '', s2 = '';
    if (m.score && m.score.length > 0) {
      for (var i = 0; i < m.score.length; i++) {
        var sc = m.score[i], inn = (sc.inning || '').toLowerCase();
        var k1 = (t1.name || '').toLowerCase().split(' ')[0];
        var k2 = (t2.name || '').toLowerCase().split(' ')[0];
        var str = sc.r + '/' + sc.w + ' (' + sc.o + ')';
        if (inn.indexOf(k1) !== -1 && !s1) s1 = str;
        else if (inn.indexOf(k2) !== -1 && !s2) s2 = str;
      }
      if (!s1 && !s2 && m.score.length >= 2) {
        s1 = m.score[0].r + '/' + m.score[0].w + ' (' + m.score[0].o + ')';
        s2 = m.score[1].r + '/' + m.score[1].w + ' (' + m.score[1].o + ')';
      }
    }

    var l1 = (t1.img && t1.img !== def) ? '<img class="dark-team-logo" src="' + t1.img + '" onerror="this.style.display=\'none\'" alt="">' : '<div class="dark-team-logo-text">' + n1.slice(0,2) + '</div>';
    var l2 = (t2.img && t2.img !== def) ? '<img class="dark-team-logo" src="' + t2.img + '" onerror="this.style.display=\'none\'" alt="">' : '<div class="dark-team-logo-text">' + n2.slice(0,2) + '</div>';

    var dash = '<span class="dark-team-score no-score">—</span>';

    return '<div class="dark-team-row">' + l1 + '<span class="dark-team-name">' + n1 + '</span>' + (s1 ? '<span class="dark-team-score">' + s1 + '</span>' : dash) + '</div>' +
           '<div class="dark-team-row">' + l2 + '<span class="dark-team-name">' + n2 + '</span>' + (s2 ? '<span class="dark-team-score">' + s2 + '</span>' : dash) + '</div>';
  }

  // ─── Badge Helpers ───
  function getBadgeShort(m) {
    var n = m.name || '', parts = n.split(',');
    if (parts.length >= 2) { var s = parts[parts.length - 1].trim().replace(/\s*\d{4}.*$/, '').trim(); if (s.length > 12) s = s.substring(0,12) + '..'; return s || ''; }
    return '';
  }

  function getBadgeFull(m) {
    if (isIPLMatch(m)) return 'Indian Premier League';
    var n = m.name || '', parts = n.split(',');
    if (parts.length >= 2) { var s = parts[parts.length - 1].trim().replace(/\s*\d{4}(-\d{2,4})?\s*$/, '').trim(); return s || ''; }
    return '';
  }

  function shortVenue(v) { if (v.length > 22) { var p = v.split(','); if (p.length >= 2) return p[p.length-1].trim(); } return v; }

  function fmtDate(d) {
    if (!d) return '';
    var dt = new Date(d), now = new Date();
    var tmr = new Date(now); tmr.setDate(tmr.getDate() + 1);
    if (dt.toDateString() === now.toDateString()) return 'Today';
    if (dt.toDateString() === tmr.toDateString()) return 'Tomorrow';
    return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  // ─── Refresh ───
  window.refreshIPLData = async function() {
    var c = document.getElementById('iplLiveContent');
    if (c) c.innerHTML = '<div class="dark-loading">Refreshing...</div>';
    await loadSchedule();
  };

  function init() {
    loadSchedule();
    setInterval(loadSchedule, 30 * 60 * 1000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

})();


// ═══════════════════════════════════════════
// COLUMN 2: IPL STARS PLAYER CAROUSEL
// ═══════════════════════════════════════════

(function() {

  window.scrollPlayers = function(direction) {
    var c = document.getElementById('playerStripContent');
    if (!c) return;
    c.scrollBy({ left: direction * 696, behavior: 'smooth' });
  };

  function updatePlayerArrows() {
    var c = document.getElementById('playerStripContent');
    var l = document.getElementById('playerLeft');
    var r = document.getElementById('playerRight');
    if (!c || !l || !r) return;
    l.style.opacity = c.scrollLeft <= 10 ? '0.3' : '1';
    l.style.pointerEvents = c.scrollLeft <= 10 ? 'none' : 'auto';
    var end = c.scrollLeft >= (c.scrollWidth - c.clientWidth - 10);
    r.style.opacity = end ? '0.3' : '1';
    r.style.pointerEvents = end ? 'none' : 'auto';
  }

  // ─── Load Players ───
  async function loadPlayers() {
    var container = document.getElementById('playerStripContent');
    if (!container) return;

    try {
      var res = await fetch(IPL_WORKER_URL);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      var data = await res.json();
      var players = data.players || [];

      if (players.length === 0) {
        container.innerHTML = '<div class="dark-loading">No player data</div>';
        return;
      }

      container.innerHTML = '';
      players.forEach(function(p) {
        var card = document.createElement('div');
        card.className = 'dark-player-card';
        card.innerHTML = buildPlayerCard(p);
        container.appendChild(card);
      });

      updatePlayerArrows();
      container.removeEventListener('scroll', updatePlayerArrows);
      container.addEventListener('scroll', updatePlayerArrows, { passive: true });

    } catch (err) {
      console.error('Player error:', err);
      container.innerHTML = '<div class="dark-loading">Could not load</div>';
    }
  }

  // ─── Build Player Card (Dark Theme) ───
  function buildPlayerCard(p) {
    var def = 'https://h.cricapi.com/img/icon512.png';
    var img = (p.playerImg && p.playerImg !== def) ? p.playerImg : '';

    var roleCls = 'dark-role-bat';
    if (p.role) {
      var r = p.role.toLowerCase();
      if (r.indexOf('bowl') !== -1) roleCls = 'dark-role-bowl';
      else if (r.indexOf('all') !== -1) roleCls = 'dark-role-all';
      else if (r.indexOf('keeper') !== -1 || r.indexOf('wk') !== -1) roleCls = 'dark-role-wk';
    }

    var html = '';
    if (img) {
      html += '<img class="dark-player-img" src="' + img + '" alt="' + p.name + '" onerror="this.src=\'' + def + '\'">';
    } else {
      html += '<div class="dark-player-fallback">' + p.name.charAt(0) + '</div>';
    }

    html += '<div class="dark-player-name">' + p.name + '</div>';
    html += '<div class="dark-player-meta">';
    if (p.team) html += '<span class="dark-player-team">' + p.team + '</span>';
    if (p.role) html += '<span class="dark-player-role ' + roleCls + '">' + p.role + '</span>';
    html += '</div>';

    html += '<div class="dark-player-stats">';
    html += '<div class="dark-stat"><span class="dark-stat-value">' + (p.iplRuns || '0') + '</span><span class="dark-stat-label">Runs</span></div>';
    html += '<div class="dark-stat"><span class="dark-stat-value">' + (p.iplAvg || '0') + '</span><span class="dark-stat-label">Avg</span></div>';
    html += '<div class="dark-stat"><span class="dark-stat-value">' + (p.iplSR || '0') + '</span><span class="dark-stat-label">SR</span></div>';
    html += '<div class="dark-stat"><span class="dark-stat-value">' + (p.iplMatches || '0') + '</span><span class="dark-stat-label">Mat</span></div>';
    html += '</div>';

    html += '<div class="dark-player-foot">';
    html += '<span class="dark-foot-tag">' + (p.ipl100s || '0') + ' 100s</span>';
    html += '<span class="dark-foot-tag">' + (p.ipl50s || '0') + ' 50s</span>';
    html += '<span class="dark-foot-tag">HS ' + (p.iplHS || '-') + '</span>';
    html += '</div>';

    return html;
  }

  function initPlayers() {
    setTimeout(loadPlayers, 2000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initPlayers);
  else initPlayers();

})();
