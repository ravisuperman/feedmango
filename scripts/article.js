/**
 * ============================================================
 * ARTICLE PAGE - Dedicated Article View Logic
 * ============================================================
 * Reads article data from URL params, renders full article,
 * fetches sidebar content (own articles + related IPL)
 */

// ── Read article data from URL ──
function getArticleFromURL() {
  const params = new URLSearchParams(window.location.search);
  const data = params.get('data');
  if (!data) return null;
  try {
    return JSON.parse(decodeURIComponent(data));
  } catch (e) {
    console.error('Failed to parse article data:', e);
    return null;
  }
}

// ── Render the full article ──
function renderArticle(article) {
  const container = document.getElementById('articleContent');
  if (!article) {
    container.innerHTML = `
      <div class="article-body" style="text-align:center;padding:80px 40px;">
        <div style="font-size:48px;margin-bottom:16px;">📄</div>
        <div style="font-size:20px;font-weight:700;margin-bottom:8px;">Article not found</div>
        <div style="color:var(--text3);margin-bottom:24px;">The article you're looking for doesn't exist or the link is broken.</div>
        <a href="/" style="color:var(--espn-blue);font-weight:700;text-decoration:none;">← Back to Home</a>
      </div>`;
    return;
  }

  // Update page title
  document.title = article.title + ' — SPORTSrip';

  // Format description - convert newlines to paragraphs
  let bodyHTML = '';
  const desc = article.description || '';
  if (desc.includes('<')) {
    // Already has HTML
    bodyHTML = desc;
  } else {
    // Plain text — convert to paragraphs
    bodyHTML = desc.split(/\n\n+/).map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
  }

  // If body is too short, add a placeholder
  if (!bodyHTML || bodyHTML.trim().length < 20) {
    bodyHTML = '<p>Experience full depth and insight beyond the preview. This is a SPORTSrip original column — our take on the game.</p>';
  }

  // Author info
  const authorName = (article.authorName && article.authorName.trim()) ? article.authorName : 'SPORTSrip Team';
  const authorPhoto = article.authorPhoto || '';
  const authorInit = authorName.split(' ').map(w => w[0] || '').join('').toUpperCase().slice(0, 2) || 'SR';

  // Date formatting
  let dateStr = '';
  if (article.pubDate) {
    const d = new Date(article.pubDate);
    dateStr = d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) +
              ' · ' + d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  }

  // Share URLs
  const shareUrl = encodeURIComponent(window.location.href);
  const shareText = encodeURIComponent(article.title.slice(0, 100) + ' — SPORTSrip');

  // Avatar HTML
  const avatarHTML = authorPhoto
    ? `<img class="article-author-avatar" src="${authorPhoto}" alt="${authorName}">`
    : `<div class="article-author-avatar-placeholder">${authorInit}</div>`;

  // Build article HTML
  container.innerHTML = `
    ${article.image ? `<img class="article-hero-img" src="${article.image}" alt="${article.title}" onerror="this.style.height='200px'">` : ''}
    <div class="article-body">
      <div class="article-meta-row">
        <span class="article-badge own-badge">MY TAKE</span>
        <span class="article-source-label">Net Sessions</span>
      </div>
      ${dateStr ? `<div class="article-date">📅 ${dateStr}</div>` : ''}
      <h1 class="article-title">${article.title}</h1>
      <hr class="article-divider">
      <div class="article-text">${bodyHTML}</div>
      
      <div class="article-author-footer">
        <div class="article-author-left">
          ${avatarHTML}
          <div class="article-author-info">
            <div class="article-author-name">${authorName}</div>
            <div class="article-author-role">Columnist · SPORTSrip</div>
          </div>
        </div>
        <div class="article-share-btns">
          <a class="article-share-btn" title="Share on WhatsApp" href="https://wa.me/?text=${shareText}%20${shareUrl}" target="_blank">💬</a>
          <a class="article-share-btn" title="Share on X" href="https://x.com/intent/tweet?text=${shareText}&url=${shareUrl}" target="_blank">𝕏</a>
          <button class="article-share-btn" title="Copy link" onclick="copyArticleLink(this)">🔗</button>
        </div>
      </div>
      
      <div class="article-disclaimer">
        Disclaimer: This article reflects personal opinions and perspectives as a passionate sports fan. 
        All views expressed are the author's own and do not represent any official organization.
      </div>
    </div>
  `;

  // Update breadcrumb with sport
  const breadcrumbCurrent = document.querySelector('.breadcrumb-current');
  if (breadcrumbCurrent) {
    breadcrumbCurrent.textContent = article.title.length > 40 
      ? article.title.slice(0, 40) + '...' 
      : article.title;
  }
}

// ── Copy link to clipboard ──
function copyArticleLink(btn) {
  navigator.clipboard.writeText(window.location.href);
  btn.textContent = '✓';
  setTimeout(() => btn.textContent = '🔗', 1500);
}

// ── Load sidebar: Our Columns (own articles) ──
async function loadOurColumns(currentArticleTitle) {
  const container = document.getElementById('ourColumnsList');
  try {
    // Fetch from multiple sports to find all own articles
    const sportsToCheck = ['ipl', 'cricket', 'football', 'f1', 'basketball'];
    const results = await Promise.allSettled(sportsToCheck.map(s => fetchSport(s)));
    
    const ownArticles = [];
    const seen = new Set();
    
    results.forEach(r => {
      if (r.status === 'fulfilled' && r.value.length) {
        r.value.forEach(a => {
          if (a.isOwn && !seen.has(a.title)) {
            seen.add(a.title);
            ownArticles.push(a);
          }
        });
      }
    });

    // Sort by date
    ownArticles.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

    if (ownArticles.length === 0) {
      container.innerHTML = '<div class="widget-empty">No columns yet</div>';
      return;
    }

    container.innerHTML = '';
    ownArticles.slice(0, 10).forEach(a => {
      const isActive = a.title === currentArticleTitle;
      const el = document.createElement('a');
      el.className = 'column-item' + (isActive ? ' active-article' : '');
      el.href = 'article.html?data=' + encodeURIComponent(JSON.stringify(a));
      
      const thumb = a.image 
        ? `<img class="column-item-thumb" src="${a.image}" onerror="this.style.background='linear-gradient(135deg, #f0a500, #ff8c00)'">`
        : `<div class="column-item-thumb"></div>`;

      const dateLabel = a.pubDate 
        ? new Date(a.pubDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
        : '';

      el.innerHTML = `
        ${thumb}
        <div class="column-item-text">
          <div class="column-item-title">${a.title}</div>
          <div class="column-item-meta">Net Sessions ${dateLabel ? '· ' + dateLabel : ''}</div>
        </div>
      `;
      container.appendChild(el);
    });

  } catch (e) {
    console.error('Failed to load columns:', e);
    container.innerHTML = '<div class="widget-error">Failed to load columns</div>';
  }
}

// ── Load sidebar: Related Articles (IPL/Cricket RSS) ──
async function loadRelatedArticles() {
  const container = document.getElementById('relatedList');
  try {
    // Fetch IPL and cricket for related content
    const [iplResult, cricketResult] = await Promise.allSettled([
      fetchSport('ipl'),
      fetchSport('cricket')
    ]);

    const related = [];
    const seen = new Set();

    [iplResult, cricketResult].forEach(r => {
      if (r.status === 'fulfilled' && r.value.length) {
        r.value.forEach(a => {
          if (!a.isOwn && a.image && !seen.has(a.title)) {
            seen.add(a.title);
            related.push(a);
          }
        });
      }
    });

    // Sort by date
    related.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

    if (related.length === 0) {
      container.innerHTML = '<div class="widget-empty">No related articles</div>';
      return;
    }

    container.innerHTML = '';
    related.slice(0, 10).forEach(a => {
      const el = document.createElement('a');
      el.className = 'related-card';
      el.href = a.link;
      el.onclick = function(ev) {
        ev.preventDefault();
        const w = 900, h = 650;
        const left = Math.round((screen.width - w) / 2);
        const top = Math.round((screen.height - h) / 2);
        window.open(a.link, '_blank',
          `width=${w},height=${h},left=${left},top=${top},toolbar=0,menubar=0,scrollbars=1,resizable=1,status=0`
        );
      };

      el.innerHTML = `
        <img class="related-card-thumb" src="${a.image}" onerror="this.style.background='linear-gradient(135deg, #667eea, #764ba2)'" loading="lazy">
        <div class="related-card-text">
          <div class="related-card-title">${a.title}</div>
          <div class="related-card-source">${a.source || 'Sports'}</div>
        </div>
      `;
      container.appendChild(el);
    });

  } catch (e) {
    console.error('Failed to load related articles:', e);
    container.innerHTML = '<div class="widget-error">Failed to load articles</div>';
  }
}

// ── Navigation: Go back to home with sport ──
function goHome(sport) {
  window.location.href = '/?sport=' + sport;
}

// ── Dark Mode ──
function applyTheme(dark) {
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  const toggle = document.getElementById('darkToggle');
  if (toggle) toggle.textContent = dark ? '☀️' : '🌙';
  localStorage.setItem('sportsrip-theme', dark ? 'dark' : 'light');
}

function toggleDark() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  applyTheme(!isDark);
}

// Apply saved theme on load
(function() {
  const saved = localStorage.getItem('sportsrip-theme');
  if (saved === 'dark') applyTheme(true);
})();

// ── Clock ──
function updateClock() {
  const el = document.getElementById('clockDisplay');
  if (el) {
    const n = new Date();
    el.innerHTML = n.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' · ' +
                   n.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }
}
updateClock();
setInterval(updateClock, 60000);

// ── Mobile Menu ──
function toggleMobileMenu() {
  const ham = document.getElementById('hamburger');
  const menu = document.getElementById('mobileMenu');
  ham.classList.toggle('active');
  menu.classList.toggle('active');
}

// ── Back to Top ──
(function() {
  const backToTop = document.getElementById('backToTop');
  window.addEventListener('scroll', function() {
    if (window.pageYOffset > 300) {
      backToTop.classList.add('visible');
    } else {
      backToTop.classList.remove('visible');
    }
  }, { passive: true });
})();

// ── Initialize ──
async function initArticlePage() {
  const article = getArticleFromURL();
  
  // Render article content
  renderArticle(article);
  
  // Load sidebar content in parallel
  const articleTitle = article ? article.title : '';
  await Promise.all([
    loadOurColumns(articleTitle),
    loadRelatedArticles()
  ]);
}

// Start
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initArticlePage);
} else {
  initArticlePage();
}
