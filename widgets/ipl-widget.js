/**
 * ============================================================
 * CRICKET SCHEDULE + IPL STARS WIDGET (LIGHT THEME)
 * ============================================================
 * Design updated to match "Bumrah card" screenshot aesthetic.
 */

// ── COLUMN 1: CRICKET SCHEDULE ──

(function() {

  window.scrollCarousel = function(direction, id) {
    const c = document.getElementById(id || 'iplLiveContent');
    if (!c) return;
    const scrollAmount = c.clientWidth * 0.8;
    c.scrollBy({ left: direction * scrollAmount, behavior: 'smooth' });
  };

  /**
   * Load Schedule into a specific target ID
   */
  window.loadSchedule = async function(targetId) {
    const container = document.getElementById(targetId || 'iplLiveContent');
    if (!container) return;

    try {
      const res = await fetch(IPL_WORKER_URL);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      let matches = (data && data.data && Array.isArray(data.data)) ? data.data : [];

      if (matches.length === 0) {
        container.innerHTML = '<div class="dark-loading" style="color:#999;font-size:11px;">No matches found</div>';
        return;
      }

      matches = sortMatches(matches);
      container.innerHTML = '';
      const count = Math.min(matches.length, 25);
      
      for (let i = 0; i < count; i++) {
        const card = document.createElement('div');
        const ipl = isIPLMatch(matches[i]);
        card.className = 'light-match-card' + (ipl ? ' ipl-accent-card' : '');
        card.innerHTML = buildMatchCard(matches[i]);
        container.appendChild(card);
      }

    } catch (err) {
      console.error('Schedule error:', err);
      container.innerHTML = '<div class="dark-loading" style="color:#999;font-size:11px;">Failed to load data</div>';
    }
  };

  function sortMatches(matches) {
    return matches.slice().sort((a, b) => {
      const aI = isIPLMatch(a) ? 0 : 1, bI = isIPLMatch(b) ? 0 : 1;
      if (aI !== bI) return aI - bI;
      const aP = statusPri(a), bP = statusPri(b);
      if (aP !== bP) return aP - bP;
      const aD = new Date(a.dateTimeGMT || a.date || 0).getTime();
      const bD = new Date(b.dateTimeGMT || b.date || 0).getTime();
      if (!a.matchStarted && !a.matchEnded) return aD - bD;
      return bD - aD;
    });
  }

  function statusPri(m) {
    if (m.matchStarted && !m.matchEnded) return 0;
    if (!m.matchStarted && !m.matchEnded) return 1;
    return 2;
  }

  function isIPLMatch(m) {
    const n = (m.name || '').toLowerCase();
    return n.includes('indian premier league') || n.includes('ipl');
  }

  /**
   * Build Match Card (Light Theme - Matching Screenshot)
   */
  function buildMatchCard(m) {
    const isLive = m.matchStarted && !m.matchEnded;
    const isDone = m.matchEnded;
    const ipl = isIPLMatch(m);

    // Status Banner Style
    let statusCls = isLive ? 'st-live' : isDone ? 'st-result' : 'st-upcoming';
    let statusIcon = isLive ? '●' : isDone ? '✓' : '⏰';
    let statusText = isLive ? 'LIVE' : isDone ? (m.status || 'Result') : 'Upcoming';

    let html = `<div class="light-status-strip ${statusCls}">
      <span class="st-icon">${statusIcon}</span>
      <span class="st-text">${statusText}</span>
    </div>`;

    html += `<div class="light-card-body">`;
    html += getTeamRows(m);

    // Metadata: Date & Venue
    const dateStr = fmtDate(m.dateTimeGMT || m.date);
    const venue = m.venue ? m.venue.split(',')[0].trim() : '';
    
    html += `<div class="light-meta-row">
      <span>📅 ${dateStr}</span>
      ${venue ? `<span>📍 ${venue}</span>` : ''}
    </div>`;

    // Tournament
    const tourney = ipl ? 'Tata Indian Premier League' : (m.name.split(',')[1] || 'Cricket Series');
    html += `<div class="light-tourney-row">
      <span class="tourney-icon">🏏</span>
      <span class="tourney-name">${tourney}</span>
    </div>`;

    html += `</div>`;
    return html;
  }

  function getTeamRows(m) {
    if (!m.teamInfo || m.teamInfo.length < 2) {
      const teams = m.teams || ['TBD', 'TBD'];
      return `<div class="lt-team-row"><span class="lt-team-name">${teams[0]}</span></div>
              <div class="lt-team-row"><span class="lt-team-name">${teams[1]}</span></div>`;
    }

    const t1 = m.teamInfo[0], t2 = m.teamInfo[1];
    let s1 = '', s2 = '';
    
    if (m.score && m.score.length > 0) {
      m.score.forEach(sc => {
        const inn = sc.inning.toLowerCase();
        if (inn.includes(t1.name.toLowerCase().split(' ')[0])) s1 = `${sc.r}/${sc.w} (${sc.o})`;
        else if (inn.includes(t2.name.toLowerCase().split(' ')[0])) s2 = `${sc.r}/${sc.w} (${sc.o})`;
      });
    }

    const logo1 = `<img class="lt-logo" src="${t1.img}" onerror="this.outerHTML='<div class=lt-logo-ph>${t1.shortname?t1.shortname[0]:'T'}</div>'">`;
    const logo2 = `<img class="lt-logo" src="${t2.img}" onerror="this.outerHTML='<div class=lt-logo-ph>${t2.shortname?t2.shortname[0]:'T'}</div>'">`;

    return `
      <div class="lt-team-row">
        ${logo1} <span class="lt-team-name">${t1.shortname || t1.name}</span>
        <span class="lt-team-score">${s1 || '—'}</span>
      </div>
      <div class="lt-team-row">
        ${logo2} <span class="lt-team-name">${t2.shortname || t2.name}</span>
        <span class="lt-team-score">${s2 || '—'}</span>
      </div>
    `;
  }

  function fmtDate(d) {
    if (!d) return '';
    const dt = new Date(d);
    return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  window.refreshIPLData = function() { loadSchedule('iplLiveContent'); };

  // Init schedule in hero strip
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => window.loadSchedule('iplLiveContent'));
  else window.loadSchedule('iplLiveContent');

})();


// ── COLUMN 2: IPL STARS ──

(function() {

  window.scrollPlayers = function(direction, id) {
    const c = document.getElementById(id || 'playerStripContent');
    if (!c) return;
    c.scrollBy({ left: direction * 280, behavior: 'smooth' });
  };

  /**
   * Load Players into a specific target ID (either hero or grid)
   */
  window.loadPlayers = async function(targetId) {
    const container = document.getElementById(targetId || 'playerStripContent');
    if (!container) return;

    try {
      const res = await fetch(IPL_WORKER_URL);
      const data = await res.json();
      const players = data.players || [];

      if (!players.length) {
        container.innerHTML = '<div class="dark-loading" style="color:#999;font-size:11px;">No stats available</div>';
        return;
      }

      container.innerHTML = '';
      players.forEach(p => {
        const card = document.createElement('div');
        card.className = 'light-player-card';
        card.innerHTML = buildPlayerCard(p);
        container.appendChild(card);
      });
    } catch (err) {
      container.innerHTML = '<div class="dark-loading" style="color:#999;font-size:11px;">Error loading stats</div>';
    }
  };

  function buildPlayerCard(p) {
    const img = p.playerImg && !p.playerImg.includes('icon512') ? p.playerImg : '';
    
    let html = img 
      ? `<img class="lp-img" src="${img}" alt="${p.name}">` 
      : `<div class="lp-img-ph">${p.name[0]}</div>`;

    html += `<div class="lp-name">${p.name}</div>`;
    html += `<div class="lp-meta">
      <span class="lp-team">${p.team || 'IPL'}</span>
      <span class="lp-role">${p.role || 'Player'}</span>
    </div>`;

    html += `<div class="lp-stats-grid">
      <div class="lp-stat"><span>${p.iplRuns||0}</span><small>Runs</small></div>
      <div class="lp-stat"><span>${p.iplSR||0}</span><small>S.R.</small></div>
      <div class="lp-stat"><span>${p.iplAvg||0}</span><small>Avg</small></div>
      <div class="lp-stat"><span>${p.iplMatches||0}</span><small>Mat</small></div>
    </div>`;

    return html;
  }

  // Init players in hero strip
  setTimeout(() => window.loadPlayers('playerStripContent'), 1000);

})();
