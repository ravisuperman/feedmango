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

/**
 * Set Active Sport
 */
function setActive(k) {
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
      renderNews();
    });
  } else {
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
