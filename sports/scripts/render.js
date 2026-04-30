/**
 * ============================================================
 * RENDER - All HTML Building Functions
 * ============================================================
 */

/**
 * Build a news card
 */
function buildCard(a, e, size) {
  const c = document.createElement('a');
  c.className = 'card ' + (size || '') + (a.isOwn ? ' own-article' : '');
  
  if (a.isOwn) {
    // Own articles - open in professional modal
    c.href = '#';
    (function(article) {
      c.onclick = function(ev) {
        ev.preventDefault();
        openArtModal(article);
      };
    })(a);
  } else if (a.isVideo && a.videoId) {
    // Video card - open YouTube modal
    c.href = '#';
    c.onclick = function(ev) {
      ev.preventDefault();
      openYT(a.videoId);
    };
  } else {
    // RSS article - popup window
    c.href = a.link;
    c.onclick = function(e) {
      e.preventDefault();
      const isDesktop = window.innerWidth > 1024;
      const w = isDesktop ? 900 : Math.round(screen.width * 0.90);
      const h = isDesktop ? 650 : Math.round(screen.height * 0.90);
      const left = Math.round((screen.width - w) / 2);
      const top = Math.round((screen.height - h) / 2);
      window.open(a.link, '_blank',
        `width=${w},height=${h},left=${left},top=${top},toolbar=0,menubar=0,scrollbars=1,resizable=1,status=0`
      );
    };
  }
  
  const img = a.image 
    ? `<img class="card-img" src="${a.image}" loading="lazy" onerror="this.outerHTML='<div class=card-img-placeholder>${e}</div>'">`
    : `<div class="card-img-placeholder">${e}</div>`;
    
  let d = cleanText(a.description || "");
  if (!d || d.trim().length < 5) {
    d = "Experience full depth and insight beyond the preview. Click to reach the complete article and stay ahead of the game.";
  }
  
  const badge = a.isVideo 
    ? '<span class="read-more-badge">▶ WATCH</span>' 
    : '<span class="read-more-badge">READ MORE</span>';
  
  // BRANDING: Use 'Net Sessions' for all professional originals
  const sourceText = a.isOwn ? 'Net Sessions' : (a.source || '');
  const sourceTag = sourceText ? `<span class="card-source">${sourceText}</span>` : '';
  
  const playOverlay = a.isVideo 
    ? '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:56px;height:56px;background:rgba(255,0,0,0.85);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:22px;pointer-events:none;">▶</div>'
    : '';
  const imgWrap = a.isVideo ? `<div style="position:relative;line-height:0;">${img}${playOverlay}</div>` : img;
  
  // Author row for own articles
  let authorRow = '';
  if (a.isOwn) {
    const auName = (a.authorName && a.authorName.trim()) ? a.authorName : 'SPORTSrip Team';
    const auPhoto = a.authorPhoto || '';
    const auInit = auName.split(' ').map(w => w[0] || '').join('').toUpperCase().slice(0, 2) || 'SR';
    const avHtml = auPhoto
      ? `<img class="card-av" src="${auPhoto}">`
      : `<div class="card-av-ph">${auInit}</div>`;
    
    const shareText = encodeURIComponent(a.title + ' - SPORTSrip');
    const shareUrl = encodeURIComponent('https://www.sportsrip.com');
    
    authorRow = `<div class="card-author-row">
      <div class="card-author-left">${avHtml}<span class="card-author-name">${auName}</span></div>
      <div class="card-share-btns">
        <a class="card-share-btn" title="WhatsApp" href="https://wa.me/?text=${shareText}%20${shareUrl}" target="_blank" onclick="event.stopPropagation()">💬</a>
        <a class="card-share-btn" title="Share on X" href="https://x.com/intent/tweet?text=${shareText}&url=${shareUrl}" target="_blank" onclick="event.stopPropagation()">𝕏</a>
        <span class="card-share-btn" title="Copy link" onclick="event.stopPropagation();navigator.clipboard.writeText(window.location.origin);this.textContent=String.fromCharCode(10003);var t=this;setTimeout(function(){t.textContent=String.fromCharCode(128279);},1500);">${String.fromCharCode(128279)}</span>
      </div>
    </div>`;
  }
  
  c.innerHTML = `
    ${imgWrap}
    <div class="card-body">
      <div class="card-meta">${badge}${sourceTag}</div>
      <div class="card-title">${a.title}</div>
      <div class="card-desc">${d}</div>
      ${authorRow}
    </div>`;
  return c;
}

/**
 * Build a sidebar stacked card
 */
function buildSidebarStackedCard(a, e, isVideo) {
  const el = document.createElement('a');
  el.className = 'sidebar-stacked-card';
  
  if (a.isOwn) {
    el.href = '#';
    el.onclick = (function(art) {
      return function(ev) {
        ev.preventDefault();
        if (window.innerWidth > 768) { openArtModal(art); } 
        else { window.location.href = 'blog.html?data=' + encodeURIComponent(JSON.stringify(art)); }
      };
    })(a);
  } else if (isVideo && a.videoId) {
    el.href = '#';
    el.onclick = function(ev) {
      ev.preventDefault();
      openYT(a.videoId);
    };
  } else {
    el.href = a.link;
    el.onclick = function(ev) {
      ev.preventDefault();
      const w = 900, h = 650;
      const left = Math.round((screen.width - w) / 2);
      const top = Math.round((screen.height - h) / 2);
      window.open(a.link, '_blank', `width=${w},height=${h},left=${left},top=${top},toolbar=0,menubar=0,scrollbars=1,resizable=1,status=0`);
    };
  }
  
  const thumb = a.image
    ? `<img class="stacked-thumb" src="${a.image}" onerror="this.outerHTML='<div class=stacked-thumb-placeholder>${e}</div>'">`
    : `<div class="stacked-thumb-placeholder">${e}</div>`;
    
  const videoBadge = isVideo ? `<div class="video-overlay">▶</div>` : '';
  
  el.innerHTML = `
    <div class="stacked-thumb-wrapper">
      ${thumb}
      ${videoBadge}
    </div>
    <div class="stacked-copy">
      <div class="sidebar-source">${a.isOwn ? 'Net Sessions' : (a.source || 'SPORTSrip')}</div>
      <div class="stacked-headline">${a.title}</div>
    </div>`;
  return el;
}

function buildSkeletonCard(size) {
  var card = document.createElement('div');
  card.className = 'card card-skeleton ' + (size || '');
  card.innerHTML =
    '<div class="card-img-skeleton"></div>' +
    '<div class="card-body">' +
      '<div class="skeleton-pill"></div>' +
      '<div class="skeleton-line long"></div>' +
      '<div class="skeleton-line long"></div>' +
      '<div class="skeleton-line medium"></div>' +
      '<div class="skeleton-line long"></div>' +
      '<div class="skeleton-line medium"></div>' +
    '</div>';
  return card;
}

function renderFeedSkeleton(count) {
  const output = document.getElementById('output');
  output.innerHTML = '';

  const fragment = document.createDocumentFragment();
  const copy = document.createElement('div');
  copy.className = 'loading-copy';
  copy.textContent = 'Loading the latest stories...';
  fragment.appendChild(copy);

  const skelPattern = ['card-hero', '', '', '', '', '', ''];
  for (let i = 0; i < count; i++) {
    const cls = (window.innerWidth > 1000 && i < skelPattern.length) ? skelPattern[i] : '';
    fragment.appendChild(buildSkeletonCard(cls));
  }

  output.appendChild(fragment);
}

function renderSidebarSkeleton() {
  const videosContainer = document.getElementById('videosList');
  const specialsContainer = document.getElementById('specialsList');

  function stackedSkeletonRow() {
    return (
      '<div class="sidebar-skeleton" style="flex-direction:column; padding:0; border-bottom:1px solid var(--border);">' +
        '<div class="sidebar-skeleton-thumb skeleton-block" style="width:100%; height:200px; border-radius:0;"></div>' +
        '<div class="sidebar-skeleton-copy" style="padding:15px; width:100%;">' +
          '<div class="sidebar-skeleton-line"></div>' +
          '<div class="sidebar-skeleton-line short"></div>' +
        '</div>' +
      '</div>'
    );
  }

  if (videosContainer) videosContainer.innerHTML = stackedSkeletonRow();
  if (specialsContainer) specialsContainer.innerHTML = stackedSkeletonRow() + stackedSkeletonRow() + stackedSkeletonRow();
}

function getTabMeta(tabKey) {
  return CATEGORY_META[tabKey] || {
    label: tabKey,
    emoji: SPECIAL_TAB_EMOJI[tabKey] || DEFAULT_TAB_EMOJI
  };
}

/**
 * Render news articles
 */
async function renderNews() {
  const o = document.getElementById('output');
  
  let a = currentSport === 'main' ? allCache : (sportCache[currentSport] || []);

  // ── IPL TEAM FILTER ─────────────────────────────────────────────────────────
  // If a team chip is active, narrow down to only that team's articles.
  // iplTeamFilter and TEAM_REGEX are defined in ui.js (loaded before render.js).
  if (currentSport === 'ipl' && typeof iplTeamFilter !== 'undefined' && iplTeamFilter !== 'all') {
    const re = typeof TEAM_REGEX !== 'undefined' && TEAM_REGEX[iplTeamFilter];
    if (re) {
      a = a.filter(function(article) {
        return re.test((article.title || '') + ' ' + (article.description || ''));
      });
    }
  }
  // ────────────────────────────────────────────────────────────────────────────

  
  if (!a.length) {
    o.innerHTML = '<div style="grid-column:1/-1; padding:60px; text-align:center;">No stories found.</div>';
    return;
  }
  
  o.innerHTML = '';
  const f = document.createDocumentFragment();
  
  // --- MASTER FEED LOGIC ---
  // Net Sessions: pure chronological originals
  // All other tabs: interleave own + RSS (Hero → RSS, RSS, Own → repeat)
  let interleaved = [];
  
  if (currentSport === 'net-sessions') {
    interleaved = a;
  } else {
    const ownArts = a.filter(x => x.isOwn);
    const rssArts = a.filter(x => !x.isOwn);
    
    let oi = 0, ri = 0;
    while (ri < rssArts.length || oi < ownArts.length) {
        if (interleaved.length === 0 && oi < ownArts.length) { 
            interleaved.push(ownArts[oi++]); 
        } else if (ri < rssArts.length) {
            interleaved.push(rssArts[ri++]);
            if (ri < rssArts.length) interleaved.push(rssArts[ri++]);
            if (oi < ownArts.length) interleaved.push(ownArts[oi++]);
        } else if (oi < ownArts.length) {
            interleaved.push(ownArts[oi++]);
        }
    }
  }
  
  window._mainFeedTitles = new Set(interleaved.map(x => x.title));
  
  /**
   * Bento grid pattern — assigns size classes for visual variety.
   * The pattern repeats every 8 cards and fills a 4-column grid densely:
   *   Row 1-2: [featured 2×2] [tall 1×2] [standard 1×1]
   *   Row 2:                              [standard 1×1]
   *   Row 3:   [standard 1×1] [wide 2×1 ] [standard 1×1]
   *   Row 4:   [standard 1×1] [standard 1×1] [standard 1×1] [standard 1×1]
   * Only the first article gets the big "featured" on first pass.
   */
  const bentoPattern = [
    'bento-featured',  // 0 — 2×2
    'bento-tall',      // 1 — 1×2
    'bento-standard',  // 2 — 1×1
    'bento-standard',  // 3 — 1×1
    'bento-standard',  // 4 — 1×1
    'bento-wide',      // 5 — 2×1
    'bento-standard',  // 6 — 1×1
    'bento-standard',  // 7 — 1×1
    'bento-standard',  // 8 — 1×1
    'bento-standard',  // 9 — 1×1
  ];
  
  // After the first cycle, use a simpler repeating pattern (no second featured)
  const bentoRepeat = [
    'bento-wide',      // 0 — 2×1
    'bento-standard',  // 1 — 1×1
    'bento-standard',  // 2 — 1×1
    'bento-tall',      // 3 — 1×2
    'bento-standard',  // 4 — 1×1
    'bento-standard',  // 5 — 1×1
    'bento-standard',  // 6 — 1×1
    'bento-wide',      // 7 — 2×1
    'bento-standard',  // 8 — 1×1
    'bento-standard',  // 9 — 1×1
  ];
  
  const isDesktop = window.innerWidth > 1000;
  
  interleaved.forEach((x, index) => {
    let bentoClass = '';
    if (isDesktop) {
      if (index < bentoPattern.length) {
        bentoClass = bentoPattern[index];
      } else {
        const ri = (index - bentoPattern.length) % bentoRepeat.length;
        bentoClass = bentoRepeat[ri];
      }
      // Only give featured/tall/wide to articles with images; fallback to standard
      if (bentoClass !== 'bento-standard' && !x.image) {
        bentoClass = 'bento-standard';
      }
    } else {
      bentoClass = '';
    }
    
    f.appendChild(buildCard(x, getTabMeta(x.sport).emoji, bentoClass));
  });
  
  o.appendChild(f);
}

/**
 * Generate navigation tabs
 */
function generateTabs(list) {
  const activeTabs = ['main'].concat((list || []).filter(function (tabKey) {
    return tabKey && tabKey !== 'main';
  }));
  
  let desktopH = '';
  let mobileH = '';
  
  const MAX_VISIBLE = 5;
  let visibleTabs = [];
  let dropdownTabs = [];

  for (let i = 0; i < activeTabs.length; i++) {
     let tab = activeTabs[i];
     if (i < MAX_VISIBLE || tab === currentSport) {
         visibleTabs.push(tab);
     } else {
         dropdownTabs.push(tab);
     }
  }

  visibleTabs.forEach(s => {
    const activeClass = s === currentSport ? ' active' : '';
    const label = getTabMeta(s).label || s.toUpperCase();
    desktopH += `<div class="tab${activeClass}" data-sport="${s}" onclick="setActive('${s}')">${label}</div>`;
  });

  if (dropdownTabs.length > 0) {
    let dropdownList = dropdownTabs.map(s => {
       const meta = getTabMeta(s);
       const label = meta.label || s.toUpperCase();
       const emoji = meta.emoji || DEFAULT_TAB_EMOJI;
       return `<div class="dropdown-item" onclick="setActive('${s}')"><span style="margin-right:8px;">${emoji}</span>${label}</div>`;
    }).join('');
    
    desktopH += `
      <div class="tab-dropdown" onclick="this.classList.toggle('open')">
        <div class="tab dropdown-toggle">More ▾</div>
        <div class="dropdown-menu">
           ${dropdownList}
        </div>
      </div>
    `;
  }
  
  activeTabs.forEach(s => {
    const activeClass = s === currentSport ? ' active' : '';
    const label = getTabMeta(s).label || s.toUpperCase();
    mobileH += `<div class="mobile-tab${activeClass}" data-sport="${s}" onclick="setActive('${s}'); toggleMenu();">${label}</div>`;
  });
  
  document.getElementById('desktopTabs').innerHTML = desktopH;
  document.getElementById('mobileMenu').innerHTML = mobileH;
}

/**
 * ═══════════════════════════════════════════════════════════
 * SCOREBOARD RENDERER & LOGIC
 * ═══════════════════════════════════════════════════════════
 */
function scrollScoreboard(dir) {
  const scroll = document.getElementById('scoreboardScroll');
  if (scroll) {
    // Scroll by roughly one and a half cards (350px)
    scroll.scrollBy({ left: dir * 350, behavior: 'smooth' });
  }
}

function renderScoreboardTicker(allMatches) {
  const wrapper = document.getElementById('scoreboardWrapper');
  const scroll = document.getElementById('scoreboardScroll');
  
  if (!allMatches || allMatches.length === 0) {
    wrapper.style.display = 'none';
    return;
  }

  // ── FILTER: IPL only, and strip out any match that is concluded ────────────
  // isMatchOver() catches ALL result status strings from cricAPI including
  // "No result (due to rain)", "Match Abandoned", "X won by Y", etc.
  // ALSO applies a hard date cutoff: any match whose start time was more than
  // 8 hours ago is treated as over (T20 matches last ~3.5 hrs max).
  const isMatchOver = (m) => {
    const s = (m.status || '').toUpperCase();
    // Explicit result keywords
    if (s.includes('WON') || s.includes('DRAW') || s.includes('ABANDONED') ||
        s.includes('TIED') || s.includes('NO RESULT') || s.includes('CANCELLED') ||
        s.includes('MATCH CALLED OFF')) {
      return true;
    }
    // Date-based safety net: if match start was >8h ago and not explicitly LIVE
    const isExplicitlyLive = s.includes('INNINGS BREAK') || s.includes('STUMPS') ||
                             (s.includes('LIVE') && !s.includes('NO RESULT'));
    if (!isExplicitlyLive && m.dateTimeGMT) {
      const normalised = m.dateTimeGMT.includes('T')
        ? (m.dateTimeGMT.endsWith('Z') || m.dateTimeGMT.includes('+') ? m.dateTimeGMT : m.dateTimeGMT + 'Z')
        : m.dateTimeGMT.replace(' ', 'T') + 'Z';
      const matchStart = new Date(normalised).getTime();
      const eightHoursMs = 8 * 60 * 60 * 1000;
      if (!isNaN(matchStart) && (Date.now() - matchStart) > eightHoursMs) {
        return true; // Match started 8+ hours ago — must be over
      }
    }
    return false;
  };

  const matches = allMatches.filter(m => {
    const title = (m.name || '').toLowerCase();
    const isIPL = title.includes('ipl') || title.includes('indian premier league');
    return isIPL && !isMatchOver(m);
  });

  if (matches.length === 0) {
    wrapper.style.display = 'none';
    return;
  }

  // ── CHRONOLOGICAL SORT: earliest first ─────────────────────────────────────
  const sortedMatches = matches.slice().sort((a, b) => {
    const timeA = new Date(a.dateTimeGMT).getTime() || 0;
    const timeB = new Date(b.dateTimeGMT).getTime() || 0;
    return timeA - timeB;
  });

  // ── IST TIME HELPER ─────────────────────────────────────────────────────────
  // Adds +330min manually — never depends on browser timezone setting.
  const toIST = (gmtStr) => {
    if (!gmtStr) return null;
    const normalised = gmtStr.includes('T')
      ? (gmtStr.endsWith('Z') || gmtStr.includes('+') ? gmtStr : gmtStr + 'Z')
      : gmtStr.replace(' ', 'T') + 'Z';
    const utc = new Date(normalised);
    if (isNaN(utc)) return null;
    const ist = new Date(utc.getTime() + 330 * 60000);
    const hh = ist.getUTCHours();
    const mm = ist.getUTCMinutes().toString().padStart(2, '0');
    const ampm = hh >= 12 ? 'PM' : 'AM';
    const h12 = (hh % 12) || 12;
    return { date: ist, timeStr: `${h12}:${mm} ${ampm} IST` };
  };

  // ── STATUS BADGE CLASSIFICATION ─────────────────────────────────────────────
  const getStatus = (m) => {
    const raw = (m.status || '').toUpperCase();
    // Only label LIVE if cricAPI explicitly confirms in-play state
    const liveKeywords = ['INNINGS BREAK', 'STUMPS', 'DRINKS'];
    const isInPlay = raw === 'LIVE' || liveKeywords.some(k => raw.includes(k)) ||
                     (raw.includes('LIVE') && !raw.includes('NO RESULT'));
    if (isInPlay) return { sClass: 'live', sText: 'LIVE' };

    // Upcoming — build IST label
    const ist = toIST(m.dateTimeGMT);
    if (ist) {
      const nowIST = new Date(Date.now() + 330 * 60000);
      // Compare calendar date in IST by checking UTC date of IST-shifted time
      const istDay  = ist.date.getUTCFullYear() * 10000 + ist.date.getUTCMonth() * 100 + ist.date.getUTCDate();
      const todayD  = new Date(nowIST);
      const todayDay= todayD.getUTCFullYear() * 10000 + todayD.getUTCMonth() * 100 + todayD.getUTCDate();
      const tomorrowIST = new Date(nowIST.getTime() + 86400000);
      const tomDay  = tomorrowIST.getUTCFullYear() * 10000 + tomorrowIST.getUTCMonth() * 100 + tomorrowIST.getUTCDate();
      if (istDay === todayDay)  return { sClass: 'upcoming', sText: `TODAY ${ist.timeStr}` };
      if (istDay === tomDay)    return { sClass: 'upcoming', sText: `TOMORROW ${ist.timeStr}` };
      const day   = ist.date.getUTCDate().toString().padStart(2, '0');
      const month = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][ist.date.getUTCMonth()];
      return { sClass: 'upcoming', sText: `${day} ${month} ${ist.timeStr}` };
    }
    return { sClass: 'upcoming', sText: 'UPCOMING' };
  };

  // ── RENDER CARDS ────────────────────────────────────────────────────────────
  let html = '';
  sortedMatches.forEach(m => {
    const { sClass, sText } = getStatus(m);

    let t1 = 'TBA', t2 = 'TBA', img1 = '', img2 = '';
    if (m.teamInfo && m.teamInfo.length >= 2) {
      t1 = m.teamInfo[0].shortname || m.teamInfo[0].name.substring(0,3).toUpperCase();
      t2 = m.teamInfo[1].shortname || m.teamInfo[1].name.substring(0,3).toUpperCase();
      if (t1 === 'RCBW') t1 = 'RCB';
      if (t2 === 'RCBW') t2 = 'RCB';
      img1 = m.teamInfo[0].img || '';
      img2 = m.teamInfo[1].img || '';
    }

    let s1 = '', s2 = '';
    if (m.score && m.score.length > 0) {
      const i1 = m.score[0];
      s1 = i1 ? `${i1.r}/${i1.w} (${i1.o})` : '';
      if (m.score.length > 1) {
        const i2 = m.score[1];
        s2 = i2 ? `${i2.r}/${i2.w} (${i2.o})` : '';
      }
    }

    const fl1 = img1 ? `<img src="${img1}" class="score-team-flag" alt="${t1}">` : `<div class="score-team-flag"></div>`;
    const fl2 = img2 ? `<img src="${img2}" class="score-team-flag" alt="${t2}">` : `<div class="score-team-flag"></div>`;
    const matchName = m.name ? m.name.split(',')[0] : 'IPL Match';
    // Venue: trim to first meaningful part (before any city suffix after comma)
    const venue = m.venue ? m.venue.split(',')[0].trim() : '';

    // Status or score footer
    const footerText = (sClass === 'completed' || sClass === 'live') 
      ? (m.status || '') 
      : venue;

    html += `
      <div class="score-card" data-timeline="${sClass}">
        <div class="score-card-header">
          <span>IPL • ${matchName}</span>
          <span class="score-status-indicator ${sClass}">${sText}</span>
        </div>
        <div class="score-row">
          <div class="score-team-info">${fl1} <span>${t1}</span></div>
          <div class="score-runs">${s1}</div>
        </div>
        <div class="score-row" style="margin-top:2px;">
          <div class="score-team-info">${fl2} <span>${t2}</span></div>
          <div class="score-runs">${s2}</div>
        </div>
        <div class="score-footer">${footerText}</div>
        ${venue && sClass !== 'upcoming' ? `<div class="score-footer" style="opacity:0.6;">📍 ${venue}</div>` : ''}
      </div>
    `;
  });

  scroll.innerHTML = html;
  wrapper.style.display = 'flex';
  // Show the Points Table trigger bar
  const ptsBar = document.getElementById('ptsLinkBar');
  if (ptsBar) ptsBar.style.display = 'flex';
  // No scroll snap needed — completed matches are excluded, so
  scroll.scrollLeft = 0;

  // ── THE BIG MATCH COUNTDOWN ──────────────────────────────────────────────────
  const bmcContainer = document.getElementById('bigMatchCountdown');
  if (bmcContainer && sortedMatches.length > 0) {
    const nextMatch = sortedMatches[0];
    const { sClass } = getStatus(nextMatch);
    
    // Only show if it's upcoming or live
    if (sClass === 'upcoming' || sClass === 'live') {
      let t1 = 'TBA', t2 = 'TBA';
      if (nextMatch.teamInfo && nextMatch.teamInfo.length >= 2) {
        t1 = nextMatch.teamInfo[0].shortname || nextMatch.teamInfo[0].name.substring(0,3).toUpperCase();
        t2 = nextMatch.teamInfo[1].shortname || nextMatch.teamInfo[1].name.substring(0,3).toUpperCase();
        if (t1 === 'RCBW') t1 = 'RCB';
        if (t2 === 'RCBW') t2 = 'RCB';
      }
      
      const gmtStr = nextMatch.dateTimeGMT;
      const normalised = gmtStr ? (gmtStr.includes('T') ? (gmtStr.endsWith('Z') || gmtStr.includes('+') ? gmtStr : gmtStr + 'Z') : gmtStr.replace(' ', 'T') + 'Z') : null;
      const matchTimeMs = normalised ? new Date(normalised).getTime() : 0;
      
      if (matchTimeMs > 0 || sClass === 'live') {
        bmcContainer.style.display = 'flex';
        
        // Clear any existing interval
        if (window._bmcInterval) clearInterval(window._bmcInterval);
        
        const renderBmc = () => {
          if (sClass === 'live' || Date.now() >= matchTimeMs) {
            bmcContainer.className = 'big-match-countdown live';
            bmcContainer.innerHTML = `<span>Next Up: </span><span class="bmc-teams">${t1} vs ${t2}</span><span class="bmc-timer live">MATCH LIVE</span>`;
            if (window._bmcInterval) clearInterval(window._bmcInterval);
          } else {
            const diff = matchTimeMs - Date.now();
            const h = Math.floor(diff / (1000 * 60 * 60)).toString().padStart(2, '0');
            const m = Math.floor((diff / (1000 * 60)) % 60).toString().padStart(2, '0');
            const s = Math.floor((diff / 1000) % 60).toString().padStart(2, '0');
            
            bmcContainer.className = 'big-match-countdown';
            bmcContainer.innerHTML = `<span>Next Up: </span><span class="bmc-teams">${t1} vs ${t2}</span><span class="bmc-timer">${h}:${m}:${s}</span>`;
          }
        };
        
        renderBmc();
        if (sClass === 'upcoming') {
          window._bmcInterval = setInterval(renderBmc, 1000);
        }
      } else {
        bmcContainer.style.display = 'none';
      }
    } else {
      bmcContainer.style.display = 'none';
    }
  } else if (bmcContainer) {
    bmcContainer.style.display = 'none';
  }
}
