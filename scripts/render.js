/**
 * ============================================================
 * RENDER - All HTML Building Functions
 * ============================================================
 * MODIFIED: Own article clicks now navigate to article.html
 *           instead of opening the small modal popup.
 */

/**
 * Build a news card or widget card
 */
function buildCard(a, e, size) {
  // ── HANDLE INTEGRATED WIDGETS ──
  if (a.isWidget) {
    const wc = document.createElement('div');
    wc.className = 'card widget-grid-card ' + (size || '');
    // Using the light grey theme for the grid widget container
    wc.innerHTML = `
      <div class="hero-column-header" style="background:transparent; border:none; padding:12px 14px 4px;">
        <div class="hero-column-title" style="color: #1a2035; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">⭐ IPL Stars</div>
      </div>
      <div class="hero-carousel-wrap grid-carousel-wrap" style="padding: 0 34px 10px;">
        <button class="hero-arrow hero-arrow-left" style="width:24px; height:24px; font-size:14px;" onclick="scrollPlayers(-1, 'playerGridContent')">‹</button>
        <div class="hero-carousel" id="playerGridContent" style="gap:10px;">
          <div class="dark-loading" style="color:#999; min-height:100px; font-size:11px;">Loading stars...</div>
        </div>
        <button class="hero-arrow hero-arrow-right" style="width:24px; height:24px; font-size:14px;" onclick="scrollPlayers(1, 'playerGridContent')">›</button>
      </div>`;
    return wc;
  }

  const c = document.createElement('a');
  c.className = 'card ' + (size || '') + (a.isOwn ? ' own-article' : '');
  
  if (a.isOwn) {
    c.href = 'article.html?data=' + encodeURIComponent(JSON.stringify(a));
  } else if (a.isVideo && a.videoId) {
    c.href = '#';
    c.onclick = function(ev) { ev.preventDefault(); openYT(a.videoId); };
  } else {
    c.href = a.link;
    c.target = '_blank';
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
    : '<span class="read-more-badge">READ MORE &gt;&gt;</span>';
  const sourceText = a.isOwn ? 'Net Sessions' : (a.source || 'SPORTSrip');
  const sourceTag = `<span class="card-source">📰 ${sourceText}</span>`;
  
  c.innerHTML = `${img}<div class="card-body"><div class="card-meta">${badge}${sourceTag}</div><div class="card-title">${a.title}</div><div class="card-desc">${d}</div></div>`;
  return c;
}

/**
 * Build a sidebar item
 */
function buildSidebarItem(a, e) {
  const el = document.createElement('a');
  el.className = 'sidebar-article';
  el.href = a.link;
  el.target = '_blank';
  
  const thumb = a.image
    ? `<img class="sidebar-thumb" src="${a.image}" onerror="this.outerHTML='<div class=sidebar-thumb-placeholder>${e}</div>'">`
    : `<div class=sidebar-thumb-placeholder>${e}</div>`;
  
  el.innerHTML = `${thumb}<div class="sidebar-text"><div class="sidebar-headline">${a.title}</div><div class="sidebar-source">${a.source || 'SPORTSrip'}</div></div>`;
  return el;
}

/**
 * Render news articles
 */
async function renderNews() {
  const o = document.getElementById('output');
  o.innerHTML = '<div class="dark-loading" style="color:#666; grid-column:1/-1;">Connecting to feeds...</div>';
  
  let a = currentSport === 'main' ? allCache : (sportCache[currentSport] || []);
  
  // IPL fallback to cricket with filtering
  if (currentSport === 'ipl' && !a.length && sportCache['cricket']) {
    const re = /\b(ipl|csk|rcb|mi|kkr|srh|pbks|dc|rr|lsg|gt|dhoni|kohli|rohit|chennai|mumbai|tata|league|duckett)\b/i;
    a = sportCache['cricket'].filter(x => re.test((x.title + " " + (x.description || "")).toLowerCase()));
  }
  
  if (!a.length) {
    o.innerHTML = '<div style="grid-column:1/-1; padding:60px; text-align:center;">No stories found.</div>';
    return;
  }
  
  o.innerHTML = '';
  const f = document.createDocumentFragment();
  
  // Limit to 40 items
  let newsList = a.slice(0, 40);

  // ── INJECT IPL STARS WIDGET ──
  // Inject at position 1 (Bumrah card position) if in active widget tabs
  if (WIDGET_TABS.includes(currentSport)) {
    newsList.splice(1, 0, { isWidget: true, type: 'ipl-stars' });
  }
  
  let count = 0;
  newsList.forEach(x => {
    // Only first REAL card becomes hero if it's NOT a widget and wide screen
    const isHeroSlot = (count === 0 && !x.isWidget && x.image && window.innerWidth > 1000);
    const s = isHeroSlot ? 'card-hero' : '';
    f.appendChild(buildCard(x, EMOJI[x.sport] || '✨', s));
    count++;
  });
  
  o.appendChild(f);

  // Trigger widget load if injected into grid
  if (WIDGET_TABS.includes(currentSport)) {
    if (typeof loadPlayers === 'function') {
      // Delay slightly to ensure DOM is ready
      setTimeout(() => loadPlayers('playerGridContent'), 100);
    }
  }
}

/**
 * Generate navigation tabs
 */
function generateTabs(list) {
  const activeTabs = ['main', 'ipl'];
  list.forEach(s => { if (s !== 'ipl') activeTabs.push(s); });
  
  let desktopH = '';
  let mobileH = '';
  
  activeTabs.forEach(s => {
    const activeClass = s === currentSport ? ' active' : '';
    desktopH += `<div class="tab${activeClass}" data-sport="${s}" onclick="setActive('${s}')">${LABEL[s]}</div>`;
    mobileH += `<div class="mobile-tab${activeClass}" data-sport="${s}" onclick="setActive('${s}'); toggleMenu();">${LABEL[s]}</div>`;
  });
  
  document.getElementById('desktopTabs').innerHTML = desktopH;
  document.getElementById('mobileMenu').innerHTML = mobileH;
}

function cleanText(h) {
  if(!h) return "";
  const d = document.createElement('div');
  d.innerHTML = h;
  return d.textContent || d.innerText || "";
}
