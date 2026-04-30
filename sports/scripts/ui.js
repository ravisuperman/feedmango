/**
 * ============================================================
 * UI - All User Interface Interactions
 * ============================================================
 */

/**
 * Dark Mode
 */
function applyTheme(dark) {
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  document.getElementById('darkToggle').textContent = dark ? '☀️' : '🌙';
  localStorage.setItem('sportsrip-theme', dark ? 'dark' : 'light');
}

function toggleDark() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  applyTheme(!isDark);
}

// Apply saved theme immediately on load
(function() {
  const saved = localStorage.getItem('sportsrip-theme');
  if (saved === 'dark') applyTheme(true);
})();

/**
 * Mobile Scroll Magic
 */
(function() {
  let lastScroll = 0;
  const header = document.getElementById('main-header');
  const backToTop = document.getElementById('backToTop');
  const floatMenu = document.getElementById('floatMenu');
  const isMobile = () => window.innerWidth <= 600;

  window.addEventListener('scroll', function() {
    const currentScroll = window.pageYOffset || document.documentElement.scrollTop;

    if (isMobile()) {
      if (currentScroll > 80) {
        header.classList.add('hidden');
        floatMenu.classList.add('visible');
        backToTop.classList.add('visible');
      } else {
        header.classList.remove('hidden');
        floatMenu.classList.remove('visible');
        backToTop.classList.remove('visible');
      }
    } else {
      header.classList.remove('hidden');
      floatMenu.classList.remove('visible');
      if (currentScroll > 300) {
        backToTop.classList.add('visible');
      } else {
        backToTop.classList.remove('visible');
      }
    }
    lastScroll = currentScroll;
  }, { passive: true });
})();

/**
 * YouTube Modal
 */
function openYT(videoId) {
  const modal = document.getElementById('ytModal');
  const frame = document.getElementById('ytFrame');
  frame.src = 'https://www.youtube.com/embed/' + videoId + '?autoplay=1&rel=0';
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeYTBtn() {
  document.getElementById('ytModal').style.display = 'none';
  document.getElementById('ytFrame').src = '';
  document.body.style.overflow = '';
}

function closeYT(e) {
  if (e.target === document.getElementById('ytModal')) closeYTBtn();
}

/**
 * Article Modal
 */
function openArtModal(a) {
  const author = (a.authorName && a.authorName.trim()) ? a.authorName : 'SPORTSrip Team';
  const photo = a.authorPhoto || '';
  const init = author.split(' ').map(w => w[0] || '').join('').toUpperCase().slice(0, 2) || 'SR';
  const desc = (a.description || '').replace(/\n/g, '<br>');
  const shareUrl = encodeURIComponent('https://www.sportsrip.com');
  const shareText = encodeURIComponent(a.title.slice(0, 80));
  const box = document.getElementById('artModalContent');
  box.innerHTML = '';
  box.style.cssText = 'overflow-y:auto;flex:1;font-family:Georgia,serif;color:#2c2418;display:flex;flex-direction:column;';

  // Image
  if (a.image) {
    const img = document.createElement('img');
    img.src = a.image;
    img.style.cssText = 'width:100%;height:160px;object-fit:cover;flex-shrink:0;display:block;';
    box.appendChild(img);
  }

  // Scrollable body
  const inner = document.createElement('div');
  inner.style.cssText = 'padding:3px 16px 16px;flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:0;';
  box.appendChild(inner);

  // Spacer
  const sp1 = document.createElement('div');
  sp1.style.height = '6px';
  inner.appendChild(sp1);

  // Badge + Source
  const mtRow = document.createElement('div');
  mtRow.style.cssText = 'display:flex;align-items:center;gap:6px;line-height:1;';
  const mt = document.createElement('span');
  mt.style.cssText = 'color:#fff;background:var(--espn-blue,#035bb0);padding:3px 10px;font-family:Inter,sans-serif;font-size:11px;font-weight:800;text-transform:uppercase;border-radius:4px;';
  mt.textContent = 'My Take';
  const mtSrc = document.createElement('span');
  mtSrc.style.cssText = 'font-family:Inter,sans-serif;font-size:13px;color:#1a1a1a;font-weight:700;vertical-align:middle;margin-top:2px;';
  mtSrc.textContent = 'Net Sessions';
  mtRow.appendChild(mt);
  mtRow.appendChild(mtSrc);
  inner.appendChild(mtRow);

  // Spacer
  const sp2 = document.createElement('div');
  sp2.style.height = '31px';
  inner.appendChild(sp2);

  // Title
  const h1 = document.createElement('div');
  h1.style.cssText = 'font-family:Georgia,serif;font-size:16px;font-weight:700;line-height:1.3;color:#2c2418;margin-bottom:10px;margin-top:16px;';
  h1.textContent = a.title;
  inner.appendChild(h1);

  // Body
  const body = document.createElement('div');
  body.style.cssText = 'font-size:14px;line-height:1.8;color:#1a1a1a;font-family:Georgia,serif;flex:1;margin-bottom:12px;';
  body.innerHTML = desc;
  inner.appendChild(body);

  // Footer
  const footer = document.createElement('div');
  footer.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding-top:10px;border-top:1px solid #d4c9a8;flex-shrink:0;';

  // Author
  const auLeft = document.createElement('div');
  auLeft.style.cssText = 'display:flex;align-items:center;gap:7px;';
  let av;
  if (photo) {
    av = document.createElement('img');
    av.src = photo;
    av.style.cssText = 'width:40px;height:40px;border-radius:50%;object-fit:cover;border:2px solid #d4c9a8;flex-shrink:0;';
  } else {
    av = document.createElement('div');
    av.textContent = init;
    av.style.cssText = 'width:40px;height:40px;border-radius:50%;background:#f0a500;color:#000;font-size:14px;font-weight:900;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-family:Inter,sans-serif;';
  }
  const auName = document.createElement('span');
  auName.style.cssText = 'font-family:Inter,sans-serif;font-size:14px;font-weight:700;color:#2c2418;';
  auName.textContent = author;
  auLeft.appendChild(av);
  auLeft.appendChild(auName);

  // Share
  const shareRight = document.createElement('div');
  shareRight.style.cssText = 'display:flex;gap:6px;';
  const btnStyle = 'width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:15px;text-decoration:none;border:1.5px solid #d4c9a8;background:#faf8f3;color:#2c2418;cursor:pointer;transition:0.2s;';
  
  const wa = document.createElement('a');
  wa.href = 'https://wa.me/?text=' + shareText + '%20' + shareUrl;
  wa.target = '_blank';
  wa.style.cssText = btnStyle;
  wa.textContent = '💬';
  
  const tw = document.createElement('a');
  tw.href = 'https://x.com/intent/tweet?text=' + shareText + '&url=' + shareUrl;
  tw.target = '_blank';
  tw.style.cssText = btnStyle;
  tw.textContent = '𝕏';
  
  const cp = document.createElement('button');
  cp.style.cssText = btnStyle;
  cp.textContent = '🔗';
  cp.onclick = function() {
    navigator.clipboard.writeText('https://www.sportsrip.com');
    cp.textContent = '✓';
    setTimeout(() => cp.textContent = '🔗', 1500);
  };
  
  shareRight.appendChild(wa);
  shareRight.appendChild(tw);
  shareRight.appendChild(cp);

  footer.appendChild(auLeft);
  footer.appendChild(shareRight);
  inner.appendChild(footer);

  // Disclaimer
  const disc = document.createElement('div');
  disc.style.cssText = 'font-family:Inter,sans-serif;font-size:10px;color:#7a7060;font-style:italic;margin-top:8px;padding-top:8px;border-top:1px solid #e8e0d0;line-height:1.5;';
  disc.textContent = 'Disclaimer: This article reflects my personal opinions and perspectives as a passionate sports fan.';
  inner.appendChild(disc);

  // Show modal
  document.getElementById('artModal').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeArtModalBtn() {
  document.getElementById('artModal').style.display = 'none';
  document.getElementById('artModalContent').innerHTML = '';
  document.body.style.overflow = '';
}

function closeArtModal(e) {
  if (e.target === document.getElementById('artModal')) closeArtModalBtn();
}

/**
 * Clock Update
 */
function updateClock() {
  const n = new Date();
  if (document.getElementById('clockDisplay')) {
    document.getElementById('clockDisplay').innerHTML = 
      n.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' · ' + 
      n.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }
}
updateClock();
setInterval(updateClock, 60000);

/**
 * Toggle Mobile Menu
 */
function toggleMenu() {
  const ham = document.getElementById('hamburger');
  const menu = document.getElementById('mobileMenu');
  ham.classList.toggle('active');
  menu.classList.toggle('active');
}

// ── IPL TEAM FILTER STATE ────────────────────────────────────────────────────
// Tracks which team chip is active ('all' = no filter). Reset when leaving IPL.
let iplTeamFilter = 'all';

const IPL_TEAMS = [
  { key: 'csk',  label: 'CSK',  name: 'Chennai Super Kings' },
  { key: 'mi',   label: 'MI',   name: 'Mumbai Indians' },
  { key: 'rcb',  label: 'RCB',  name: 'Royal Challengers' },
  { key: 'kkr',  label: 'KKR',  name: 'Kolkata Knight Riders' },
  { key: 'srh',  label: 'SRH',  name: 'Sunrisers Hyderabad' },
  { key: 'pbks', label: 'PBKS', name: 'Punjab Kings' },
  { key: 'dc',   label: 'DC',   name: 'Delhi Capitals' },
  { key: 'rr',   label: 'RR',   name: 'Rajasthan Royals' },
  { key: 'gt',   label: 'GT',   name: 'Gujarat Titans' },
  { key: 'lsg',  label: 'LSG',  name: 'Lucknow Super Giants' }
];

// Team → keyword regex map for client-side filtering
const TEAM_REGEX = {
  csk:  /\b(csk|chennai|dhoni|super kings)\b/i,
  mi:   /\b(mi\b|mumbai indians|rohit|hardik|bumrah|hitman)\b/i,
  rcb:  /\b(rcb|royal challengers|kohli|virat|bangalore)\b/i,
  kkr:  /\b(kkr|kolkata|knight riders|russell|narine)\b/i,
  srh:  /\b(srh|sunrisers|hyderabad|warner|head)\b/i,
  pbks: /\b(pbks|punjab kings|shikhar|dhawan)\b/i,
  dc:   /\b(dc\b|delhi capitals|pant|axar)\b/i,
  rr:   /\b(rr\b|rajasthan royals|sanju|samson|buttler)\b/i,
  gt:   /\b(gt\b|gujarat titans|hardik|shubman|gill)\b/i,
  lsg:  /\b(lsg|lucknow super giants|stoinis|pooran)\b/i,
};

function renderTeamFilterBar() {
  // Remove any existing wrap/bar first
  const existingWrap = document.getElementById('iplTeamFilterWrap');
  if (existingWrap) existingWrap.remove();
  const existingBar = document.getElementById('iplTeamFilterBar');
  if (existingBar) existingBar.remove();

  if (currentSport !== 'ipl') return;

  const label = document.getElementById('sectionLabel');
  if (!label) return;

  const bar = document.createElement('div');
  bar.className = 'team-filter-bar';
  bar.id = 'iplTeamFilterBar';

  // "All" chip
  const allChip = document.createElement('div');
  allChip.className = 'team-chip' + (iplTeamFilter === 'all' ? ' active' : '');
  allChip.textContent = '🏏 All';
  allChip.dataset.team = 'all';
  allChip.onclick = () => setTeamFilter('all');
  bar.appendChild(allChip);

  IPL_TEAMS.forEach(team => {
    const chip = document.createElement('div');
    chip.className = 'team-chip' + (iplTeamFilter === team.key ? ' active' : '');
    chip.textContent = team.label;
    chip.dataset.team = team.key;
    chip.title = team.name;
    chip.onclick = () => setTeamFilter(team.key);
    bar.appendChild(chip);
  });

  // Wrap with scroll arrows
  const wrap = document.createElement('div');
  wrap.className = 'team-filter-wrap';
  wrap.id = 'iplTeamFilterWrap';

  const leftArrow = document.createElement('div');
  leftArrow.className = 'team-filter-arrow left';
  leftArrow.innerHTML = '‹';
  leftArrow.onclick = () => { bar.scrollBy({ left: -150, behavior: 'smooth' }); };

  const rightArrow = document.createElement('div');
  rightArrow.className = 'team-filter-arrow right';
  rightArrow.innerHTML = '›';
  rightArrow.onclick = () => { bar.scrollBy({ left: 150, behavior: 'smooth' }); };

  wrap.appendChild(leftArrow);
  wrap.appendChild(bar);
  wrap.appendChild(rightArrow);

  // Update arrow visibility based on scroll position
  function updateArrows() {
    const canScrollLeft = bar.scrollLeft > 2;
    const canScrollRight = bar.scrollLeft + bar.clientWidth < bar.scrollWidth - 2;
    leftArrow.classList.toggle('visible', canScrollLeft);
    rightArrow.classList.toggle('visible', canScrollRight);
    wrap.classList.toggle('has-left', canScrollLeft);
    wrap.classList.toggle('has-right', canScrollRight);
  }

  bar.addEventListener('scroll', updateArrows, { passive: true });
  // Initial check after DOM renders
  requestAnimationFrame(() => { requestAnimationFrame(updateArrows); });

  // Insert wrap between sectionLabel and #output
  const output = document.getElementById('output');
  output.parentNode.insertBefore(wrap, output);
}

function setTeamFilter(teamKey) {
  iplTeamFilter = teamKey;
  renderTeamFilterBar();
  renderNews();
}

/**
 * Set Active Sport
 */
function setActive(k) {
  // Reset team filter when changing tabs
  if (k !== 'ipl') {
    iplTeamFilter = 'all';
    const existingWrap = document.getElementById('iplTeamFilterWrap');
    if (existingWrap) existingWrap.remove();
    const existing = document.getElementById('iplTeamFilterBar');
    if (existing) existing.remove();
  }

  currentSport = k;
  if (typeof generateTabs === 'function' && typeof CATEGORY_ORDER !== 'undefined') {
    generateTabs(CATEGORY_ORDER);
  }
  const meta = CATEGORY_META[k] || STATIC_TAB_META.main || { label: k, emoji: DEFAULT_TAB_EMOJI };
  document.querySelectorAll('.tab, .mobile-tab').forEach(t =>
    t.classList.toggle('active', t.dataset.sport === k)
  );
  document.getElementById('sectionLabel').innerHTML =
    (meta.emoji || DEFAULT_TAB_EMOJI) + ' ' + (meta.label || k || 'News');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (k !== 'main' && !sportCache[k]) {
    document.getElementById('output').innerHTML =
      '<div style="grid-column:1/-1;padding:60px;text-align:center;color:var(--text2);font-size:16px;">Loading ' + (meta.label || k) + '...</div>';
    fetchSport(k).then(articles => {
      if (articles.length) {
        sportCache[k] = pinnedSort(articles);
      }
      if (k === 'ipl') renderTeamFilterBar();
      renderNews();
    });
  } else {
    if (k === 'ipl') renderTeamFilterBar();
    renderNews();
  }
}


/**
 * Robust Sticky Sidebar Logic
 * Dynamically computes 'top' instead of relying on 'bottom' which breaks tightly inside body{overflow-x:hidden}
 */
function attachStickySidebarLogic() {
  const sidebar = document.querySelector('.sidebar');
  if (!sidebar) return;

  const updateStickyTop = () => {
    const sbHeight = sidebar.offsetHeight;
    const vh = window.innerHeight;
    
    // Offset standard 58px for top spacing. If it is short enough to fit easily:
    if (sbHeight < vh - 58) {
      sidebar.style.top = '58px';
    } else {
      // It's taller than viewport. We want the mathematical bottom to align exactly flush.
      // E.g. If sbHeight = 1600, vh = 800. We want top to be -800 to perfectly anchor the bottom at 0 offset.
      sidebar.style.top = (vh - sbHeight) + 'px';
    }
  };

  const ro = new ResizeObserver(() => {
    updateStickyTop();
  });
  
  ro.observe(document.body);
  ro.observe(sidebar);
  
  // Quick initial execution
  setTimeout(updateStickyTop, 500);
}

document.addEventListener('DOMContentLoaded', attachStickySidebarLogic);


/**
 * ═══════════════════════════════════════════════════════════
 * IPL POINTS TABLE
 * ═══════════════════════════════════════════════════════════
 */

// Whether the points data has been fetched already (avoid redundant calls)
let _ptsDataCache = null;

async function openPointsTable() {
  const modal    = document.getElementById('ptsModal');
  const body     = document.getElementById('ptsModalBody');
  const updated  = document.getElementById('ptsLastUpdated');
  if (!modal || !body) return;

  // Show the modal immediately in loading state
  body.innerHTML = '<div class="pts-loading"><div class="pts-spinner"></div><div>Loading standings…</div></div>';
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';

  try {
    // Use cached data for this session to avoid extra API hits
    let json = _ptsDataCache;
    if (!json) {
      const res = await fetch('https://ipl-live-score.ravi-kompel.workers.dev/points');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      json = await res.json();
      if (json.status === 'success') _ptsDataCache = json;
    }

    if (json.status !== 'success' || !Array.isArray(json.standings) || !json.standings.length) {
      throw new Error('No standings data available');
    }

    renderPointsTable(json.standings, body);

    if (updated && json.last_updated) {
      const d = new Date(json.last_updated);
      updated.textContent = 'Updated ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    }

  } catch (e) {
    body.innerHTML = `
      <div class="pts-error">
        <div style="font-size:40px;margin-bottom:12px;">⚠️</div>
        <div style="font-weight:700;margin-bottom:6px;">Couldn't load standings</div>
        <div style="font-size:13px;opacity:0.7;">${e.message}</div>
        <button onclick="_ptsDataCache=null;closePtsModalBtn();openPointsTable();" class="pts-retry-btn">Try again</button>
      </div>`;
  }
}

function renderPointsTable(standings, container) {
  let rows = '';
  standings.forEach((t, i) => {
    const isQ = i < 4;   // top 4 qualify for playoffs
    const nrr = t.nrr;   // already formatted as "+1.043" or "-0.751" by worker
    const nrrIsNeg = nrr.startsWith('-');

    const logo = t.logo
      ? `<img src="${t.logo}" class="pts-logo" alt="${t.teamShort}" onerror="this.outerHTML='<span class=pts-logo-ph>${t.teamShort.charAt(0)}</span>'">`
      : `<span class="pts-logo-ph">${t.teamShort.charAt(0)}</span>`;

    rows += `
      <tr class="pts-row${isQ ? ' pts-qualified' : ''}" data-rank="${i + 1}">
        <td class="pts-rank">${i + 1}</td>
        <td class="pts-team-cell">
          <div class="pts-team">
            ${logo}
            <div class="pts-team-names">
              <span class="pts-team-full">${t.teamName}</span>
              <span class="pts-team-short">${t.teamShort}</span>
            </div>
          </div>
        </td>
        <td class="pts-num">${t.played}</td>
        <td class="pts-num pts-w">${t.won}</td>
        <td class="pts-num pts-l">${t.lost}</td>
        <td class="pts-num">${t.tied > 0 ? t.tied : t.noResult > 0 ? t.noResult : '-'}</td>
        <td class="pts-num pts-pts">${t.points}</td>
        <td class="pts-num pts-nrr ${nrrIsNeg ? 'nrr-neg' : 'nrr-pos'}">${nrr}</td>
      </tr>`;
  });

  container.innerHTML = `
    <div class="pts-table-wrap">
      <table class="pts-table">
        <thead>
          <tr>
            <th class="pts-th-rank">#</th>
            <th class="pts-th-team">Team</th>
            <th class="pts-th">M</th>
            <th class="pts-th">W</th>
            <th class="pts-th">L</th>
            <th class="pts-th">N/R</th>
            <th class="pts-th pts-pts">Pts</th>
            <th class="pts-th">NRR</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="pts-qual-note">
        <span class="pts-qual-dot"></span> Top 4 qualify for playoffs
      </div>
    </div>`;
}

function closePtsModalBtn() {
  const modal = document.getElementById('ptsModal');
  if (modal) modal.style.display = 'none';
  document.body.style.overflow = '';
}

function closePtsModal(e) {
  if (e.target === document.getElementById('ptsModal')) closePtsModalBtn();
}
