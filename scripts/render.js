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

  for (let i = 0; i < count; i++) {
    fragment.appendChild(buildSkeletonCard(i === 0 && window.innerWidth > 1000 ? 'card-hero' : ''));
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
  
  interleaved.forEach((x, index) => {
    // Hero card for first article with image on desktop
    const s = (index === 0 && x.image && window.innerWidth > 1000) ? 'card-hero' : '';
    f.appendChild(buildCard(x, getTabMeta(x.sport).emoji, s));
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

  // ── CLIENT-SIDE IPL SAFETY FILTER ──────────────────────────────────────────
  // This is a second line of defence even if the Worker sends non-IPL matches
  // (e.g. while KV cache is still serving the old payload).
  const matches = allMatches.filter(m => {
    const title = (m.name || '').toLowerCase();
    return title.includes('ipl') || title.includes('indian premier league');
  });

  if (matches.length === 0) {
    wrapper.style.display = 'none';
    return;
  }

  // ── CHRONOLOGICAL SORT: Past → Live → Upcoming ──────────────────────────────
  const sortedMatches = matches.slice().sort((a, b) => {
    const timeA = new Date(a.dateTimeGMT).getTime() || 0;
    const timeB = new Date(b.dateTimeGMT).getTime() || 0;
    return timeA - timeB;
  });

  // ── BUILD STATUS CLASSIFICATION ─────────────────────────────────────────────
  const getStatus = (m) => {
    const raw = (m.status || '').toUpperCase();
    if (raw.includes('WON') || raw.includes('DRAW') || raw.includes('ABANDONED') || raw.includes('TIED')) {
      return { sClass: 'completed', sText: 'FT' };
    }
    if (raw.includes('LIVE') || raw.includes('INNINGS BREAK') || raw.includes('STUMPS') || raw.includes('RAIN')) {
      return { sClass: 'live', sText: 'LIVE' };
    }
    // Upcoming — try to build a readable time string from the datetime
    try {
      const d = new Date(m.dateTimeGMT);
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      const isTomorrow = d.toDateString() === new Date(now.getTime() + 86400000).toDateString();
      const hh = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
      if (isToday)    return { sClass: 'upcoming', sText: `TODAY ${hh}` };
      if (isTomorrow) return { sClass: 'upcoming', sText: `TOMORROW ${hh}` };
      const dd = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      return { sClass: 'upcoming', sText: `${dd} ${hh}` };
    } catch(e) {}
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
        <div class="score-footer">${m.status || ''}</div>
      </div>
    `;
  });

  scroll.innerHTML = html;
  wrapper.style.display = 'flex';

  // ── FOCUS: Snap to first LIVE or UPCOMING card ──────────────────────────────
  // Use a double-rAF (requestAnimationFrame) to ensure DOM is fully painted first.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const firstFocus =
        scroll.querySelector('.score-card[data-timeline="live"]') ||
        scroll.querySelector('.score-card[data-timeline="upcoming"]');

      if (firstFocus) {
        // Temporarily bypass smooth-scroll for the initial snap, then re-enable
        scroll.style.scrollBehavior = 'auto';
        scroll.scrollLeft = Math.max(0, firstFocus.offsetLeft - 52);
        // Re-enable smooth scroll for user-driven arrow navigation
        setTimeout(() => { scroll.style.scrollBehavior = 'smooth'; }, 80);
      }
    });
  });
}
