/**
 * ============================================================
 * CRICKET SCHEDULE WIDGET - Horizontal Carousel
 * ============================================================
 * Row 1: Full cricket schedule (IPL first with all 70 matches)
 * Merges currentMatches + series_info from worker
 * Auto-refreshes every 30 minutes (to stay within 100 hits/day)
 */

(function() {

  // ─── Carousel Scroll ───
  window.scrollCarousel = function(direction) {
    var carousel = document.getElementById('iplLiveContent');
    if (!carousel) return;
    carousel.scrollBy({ left: direction * 600, behavior: 'smooth' });
  };

  // ─── Arrow Visibility ───
  function updateArrows() {
    var carousel = document.getElementById('iplLiveContent');
    var leftBtn = document.getElementById('carouselLeft');
    var rightBtn = document.getElementById('carouselRight');
    if (!carousel || !leftBtn || !rightBtn) return;

    leftBtn.style.opacity = carousel.scrollLeft <= 10 ? '0.3' : '1';
    leftBtn.style.pointerEvents = carousel.scrollLeft <= 10 ? 'none' : 'auto';

    var atEnd = carousel.scrollLeft >= (carousel.scrollWidth - carousel.clientWidth - 10);
    rightBtn.style.opacity = atEnd ? '0.3' : '1';
    rightBtn.style.pointerEvents = atEnd ? 'none' : 'auto';
  }

  // ─── Load Cricket Data ───
  async function loadCricketSchedule() {
    var container = document.getElementById('iplLiveContent');
    if (!container) return;

    try {
      var response = await fetch(IPL_WORKER_URL);
      if (!response.ok) throw new Error('HTTP ' + response.status);

      var data = await response.json();
      var matches = [];

      // Support both old format (data.data = array) and new format (data.data = array from merged worker)
      if (data && data.data && Array.isArray(data.data)) {
        matches = data.data;
      }

      if (matches.length === 0) {
        container.innerHTML = '<div class="schedule-loading">No matches found</div>';
        return;
      }

      // Sort: IPL upcoming nearest first, then IPL live, then IPL results, then others
      matches = sortMatches(matches);

      // Render cards
      container.innerHTML = '';
      var count = Math.min(matches.length, 30);
      for (var i = 0; i < count; i++) {
        var card = document.createElement('div');
        var ipl = isIPLMatch(matches[i]);
        card.className = 'cricket-match-card' + (ipl ? ' ipl-highlight' : '');
        card.innerHTML = buildCard(matches[i]);
        container.appendChild(card);
      }

      // Last updated
      var upd = document.getElementById('lastUpdated');
      if (upd) {
        upd.style.display = 'block';
        upd.textContent = 'Updated ' + new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
      }

      // Arrows
      updateArrows();
      container.removeEventListener('scroll', updateArrows);
      container.addEventListener('scroll', updateArrows, { passive: true });

    } catch (err) {
      console.error('Cricket widget error:', err);
      container.innerHTML =
        '<div class="schedule-loading">Could not load matches - ' +
        '<span onclick="refreshIPLData()" style="color:var(--espn-blue);cursor:pointer;font-weight:700;">try again</span></div>';
    }
  }

  // ─── Sort Logic ───
  // IPL upcoming (nearest date first) → IPL live → IPL results (newest) → Other live → Other upcoming → Other results
  function sortMatches(matches) {
    var now = Date.now();
    return matches.slice().sort(function(a, b) {
      var aIPL = isIPLMatch(a) ? 0 : 1;
      var bIPL = isIPLMatch(b) ? 0 : 1;
      if (aIPL !== bIPL) return aIPL - bIPL;

      // Within same group, sort by status
      var aP = getStatusSort(a, now);
      var bP = getStatusSort(b, now);
      if (aP !== bP) return aP - bP;

      // Within same status, upcoming = nearest first, completed = newest first
      var aD = new Date(a.dateTimeGMT || a.date || 0).getTime();
      var bD = new Date(b.dateTimeGMT || b.date || 0).getTime();

      // Upcoming matches: nearest date first (ascending)
      if (!a.matchStarted && !a.matchEnded) return aD - bD;
      // Live & completed: newest first (descending)
      return bD - aD;
    });
  }

  function getStatusSort(m, now) {
    if (m.matchStarted && !m.matchEnded) return 0; // Live
    if (!m.matchStarted && !m.matchEnded) return 1; // Upcoming
    return 2; // Completed
  }

  // ─── IPL Detection (full names only) ───
  function isIPLMatch(match) {
    var name = (match.name || '').toLowerCase();
    if (name.indexOf('indian premier league') !== -1) return true;
    if (name.indexOf(' ipl ') !== -1 || name.indexOf('ipl ') === 0 || name.indexOf(', ipl') !== -1) return true;

    var teams = [
      'chennai super kings', 'mumbai indians', 'royal challengers bengaluru',
      'royal challengers bangalore', 'kolkata knight riders', 'sunrisers hyderabad',
      'rajasthan royals', 'delhi capitals', 'punjab kings',
      'lucknow super giants', 'gujarat titans'
    ];
    for (var i = 0; i < teams.length; i++) {
      if (name.indexOf(teams[i]) !== -1) return true;
    }
    if (match.teams) {
      var ts = match.teams.join(' ').toLowerCase();
      for (var j = 0; j < teams.length; j++) {
        if (ts.indexOf(teams[j]) !== -1) return true;
      }
    }
    return false;
  }

  // ─── Badge Text ───
  function getBadge(match) {
    if (isIPLMatch(match)) return { text: 'IPL 2026', cls: 'ipl-badge' };

    var name = match.name || '';
    var parts = name.split(',');
    var series = '';
    if (parts.length >= 3) {
      series = parts[parts.length - 1].trim().replace(/\s*\d{4}(-\d{2,4})?\s*$/, '').trim();
    } else if (parts.length >= 2) {
      series = parts[parts.length - 1].trim().replace(/\s*\d{4}(-\d{2,4})?\s*$/, '').trim();
    }
    if (!series) return null;

    // Common abbreviations
    var lc = series.toLowerCase();
    if (lc.indexOf('pakistan super league') !== -1) return { text: 'PSL', cls: '' };
    if (lc.indexOf('big bash') !== -1) return { text: 'BBL', cls: '' };
    if (lc.indexOf('caribbean premier') !== -1) return { text: 'CPL', cls: '' };
    if (lc.indexOf('legends league') !== -1) return { text: 'Legends', cls: '' };
    if (lc.indexOf('sheffield shield') !== -1) return { text: 'Sheffield', cls: '' };
    if (lc.indexOf('plunket shield') !== -1) return { text: 'Plunket', cls: '' };
    if (lc.indexOf('world cup') !== -1) return { text: 'World Cup', cls: '' };
    if (lc.indexOf('asia cup') !== -1) return { text: 'Asia Cup', cls: '' };

    if (series.length > 18) series = series.substring(0, 18) + '..';
    return { text: series, cls: '' };
  }

  // ─── Match Status ───
  function getStatus(match) {
    if (match.matchStarted && !match.matchEnded) return { text: '\u25CF LIVE', cls: 'live' };
    if (match.matchEnded) return { text: 'RESULT', cls: 'completed' };
    return { text: 'UPCOMING', cls: 'upcoming' };
  }

  // ─── Today check ───
  function isToday(dateStr) {
    if (!dateStr) return false;
    return new Date(dateStr).toDateString() === new Date().toDateString();
  }

  // ─── Build Card HTML ───
  function buildCard(m) {
    var status = getStatus(m);
    var badge = getBadge(m);
    var venue = shortenVenue(m.venue || 'TBD');
    var date = formatDate(m.dateTimeGMT || m.date);
    var today = isToday(m.dateTimeGMT || m.date);

    // Match number from name (e.g. "2nd Match" or "1st Match")
    var matchNum = '';
    var parts = (m.name || '').split(',');
    if (parts.length >= 2) {
      var mp = parts[1].trim();
      if (mp.toLowerCase().indexOf('match') !== -1 || mp.toLowerCase().indexOf('final') !== -1 || mp.toLowerCase().indexOf('semi') !== -1) {
        matchNum = mp;
      }
    }

    var html = '<div class="match-header-row">';
    if (badge) {
      html += '<span class="match-series-badge ' + badge.cls + '">' + badge.text + '</span>';
    }
    if (today && !m.matchEnded) {
      html += '<span class="match-today-badge">TODAY</span>';
    }
    html += '<span class="match-status status-' + status.cls + '">' + status.text + '</span>';
    html += '</div>';

    // Match number label
    if (matchNum) {
      html += '<div class="match-number">' + matchNum + '</div>';
    }

    // Teams
    html += getTeams(m);

    // Info row
    html += '<div class="match-info">';
    if (date) html += '<span>\uD83D\uDCC5 ' + date + '</span>';
    html += '<span>\uD83D\uDCCD ' + venue + '</span>';
    html += '</div>';

    // Result text
    if (m.status && m.matchEnded) {
      html += '<div class="match-result">' + m.status + '</div>';
    } else if (m.status && !m.matchStarted && !m.matchEnded && m.status.indexOf('Match starts') !== -1) {
      // Show time for upcoming
      var time = m.status.replace('Match starts at ', '');
      html += '<div class="match-result" style="color:var(--espn-blue);">Starts: ' + time + '</div>';
    }

    return html;
  }

  // ─── Team Display ───
  function getTeams(m) {
    if (!m.teamInfo || m.teamInfo.length < 2) {
      if (m.teams && m.teams.length >= 2) {
        return '<div class="match-teams">' + m.teams[0] + ' vs ' + m.teams[1] + '</div>';
      }
      return '<div class="match-title">' + (m.name || 'Cricket Match') + '</div>';
    }

    var t1 = m.teamInfo[0], t2 = m.teamInfo[1];
    var n1 = t1.shortname || t1.name || '??';
    var n2 = t2.shortname || t2.name || '??';
    var defImg = 'https://h.cricapi.com/img/icon512.png';

    // Scores
    var s1 = '', s2 = '';
    if (m.score && m.score.length > 0) {
      for (var i = 0; i < m.score.length; i++) {
        var sc = m.score[i];
        var inn = (sc.inning || '').toLowerCase();
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

    // Logos
    var l1 = (t1.img && t1.img !== defImg)
      ? '<img class="team-logo" src="' + t1.img + '" onerror="this.style.display=\'none\'" alt="">'
      : '<div class="team-logo team-logo-text">' + n1.slice(0, 2) + '</div>';
    var l2 = (t2.img && t2.img !== defImg)
      ? '<img class="team-logo" src="' + t2.img + '" onerror="this.style.display=\'none\'" alt="">'
      : '<div class="team-logo team-logo-text">' + n2.slice(0, 2) + '</div>';

    var dash = m.matchStarted ? '' : '<span class="team-score" style="color:var(--text3);">&mdash;</span>';

    return '<div class="match-teams-row">' +
      '<div class="team-row">' + l1 + '<span class="team-name">' + n1 + '</span>' + (s1 ? '<span class="team-score">' + s1 + '</span>' : dash) + '</div>' +
      '<div class="team-row">' + l2 + '<span class="team-name">' + n2 + '</span>' + (s2 ? '<span class="team-score">' + s2 + '</span>' : dash) + '</div>' +
    '</div>';
  }

  // ─── Helpers ───
  function shortenVenue(v) {
    if (v.length > 25) {
      var p = v.split(',');
      if (p.length >= 2) return p[p.length - 1].trim();
    }
    return v;
  }

  function formatDate(d) {
    if (!d) return '';
    var date = new Date(d);
    var today = new Date();
    var tmr = new Date(today); tmr.setDate(tmr.getDate() + 1);
    var yest = new Date(today); yest.setDate(yest.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tmr.toDateString()) return 'Tomorrow';
    if (date.toDateString() === yest.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  }

  // ─── Refresh ───
  window.refreshIPLData = async function() {
    var c = document.getElementById('iplLiveContent');
    if (c) c.innerHTML = '<div class="schedule-loading">Refreshing...</div>';
    var u = document.getElementById('lastUpdated');
    if (u) u.style.display = 'none';
    await loadCricketSchedule();
  };

  // ─── Init ───
  function init() {
    loadCricketSchedule();
    // Refresh every 30 minutes to stay within free API limits
    setInterval(loadCricketSchedule, 30 * 60 * 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();


/**
 * ============================================================
 * IPL STARS WIDGET - Player Profile Carousel (Row 2)
 * ============================================================
 * Fetches 10 IPL star player profiles from the worker
 * Shows 3 cards at once with scroll arrows
 * Does NOT touch the sidebar
 */

(function() {

  // ─── Scroll ───
  window.scrollPlayers = function(direction) {
    var carousel = document.getElementById('playerStripContent');
    if (!carousel) return;
    // Scroll by exactly 3 cards (each ~320px + gap)
    carousel.scrollBy({ left: direction * 990, behavior: 'smooth' });
  };

  function updatePlayerArrows() {
    var c = document.getElementById('playerStripContent');
    var l = document.getElementById('playerLeft');
    var r = document.getElementById('playerRight');
    if (!c || !l || !r) return;

    l.style.opacity = c.scrollLeft <= 10 ? '0.3' : '1';
    l.style.pointerEvents = c.scrollLeft <= 10 ? 'none' : 'auto';

    var atEnd = c.scrollLeft >= (c.scrollWidth - c.clientWidth - 10);
    r.style.opacity = atEnd ? '0.3' : '1';
    r.style.pointerEvents = atEnd ? 'none' : 'auto';
  }

  // ─── Load Players from Worker ───
  async function loadPlayers() {
    var container = document.getElementById('playerStripContent');
    if (!container) return;

    try {
      var response = await fetch(IPL_WORKER_URL);
      if (!response.ok) throw new Error('HTTP ' + response.status);
      var data = await response.json();

      var players = data.players || [];
      if (players.length === 0) {
        container.innerHTML = '<div class="schedule-loading">No player data</div>';
        return;
      }

      container.innerHTML = '';
      players.forEach(function(p) {
        var card = document.createElement('div');
        card.className = 'player-card';
        card.innerHTML = buildPlayerCard(p);
        container.appendChild(card);
      });

      updatePlayerArrows();
      container.removeEventListener('scroll', updatePlayerArrows);
      container.addEventListener('scroll', updatePlayerArrows, { passive: true });

    } catch (err) {
      console.error('Player widget error:', err);
      container.innerHTML = '<div class="schedule-loading">Could not load players</div>';
    }
  }

  // ─── Build Player Card ───
  function buildPlayerCard(p) {
    var defaultImg = 'https://h.cricapi.com/img/icon512.png';
    var imgSrc = (p.playerImg && p.playerImg !== defaultImg) ? p.playerImg : '';

    var roleBadge = '';
    if (p.role) {
      var roleClass = 'role-bat';
      var r = p.role.toLowerCase();
      if (r.indexOf('bowl') !== -1) roleClass = 'role-bowl';
      else if (r.indexOf('all') !== -1) roleClass = 'role-all';
      else if (r.indexOf('keeper') !== -1 || r.indexOf('wk') !== -1) roleClass = 'role-wk';
      roleBadge = '<span class="player-role ' + roleClass + '">' + p.role + '</span>';
    }

    var teamBadge = p.team ? '<span class="player-team-badge">' + p.team + '</span>' : '';

    var html =
      '<div class="player-card-header">' +
        (imgSrc ? '<img class="player-img" src="' + imgSrc + '" alt="' + p.name + '" onerror="this.src=\'https://h.cricapi.com/img/icon512.png\'">' :
                  '<div class="player-img player-img-fallback">' + p.name.charAt(0) + '</div>') +
        '<div class="player-info">' +
          '<div class="player-name">' + p.name + '</div>' +
          '<div class="player-country">' + (p.country || '') + '</div>' +
          '<div class="player-badges">' + teamBadge + roleBadge + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="player-stats">' +
        '<div class="stat-item"><span class="stat-value">' + (p.iplRuns || '0') + '</span><span class="stat-label">Runs</span></div>' +
        '<div class="stat-item"><span class="stat-value">' + (p.iplAvg || '0') + '</span><span class="stat-label">Avg</span></div>' +
        '<div class="stat-item"><span class="stat-value">' + (p.iplSR || '0') + '</span><span class="stat-label">SR</span></div>' +
        '<div class="stat-item"><span class="stat-value">' + (p.iplMatches || '0') + '</span><span class="stat-label">Mat</span></div>' +
      '</div>' +
      '<div class="player-bottom">' +
        '<span class="stat-mini">' + (p.ipl100s || '0') + ' 100s</span>' +
        '<span class="stat-mini">' + (p.ipl50s || '0') + ' 50s</span>' +
        '<span class="stat-mini">HS ' + (p.iplHS || '-') + '</span>' +
      '</div>';

    return html;
  }

  // ─── Init ───
  function initPlayers() {
    // Delay slightly to not compete with match data fetch
    setTimeout(loadPlayers, 2000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPlayers);
  } else {
    initPlayers();
  }

})();


