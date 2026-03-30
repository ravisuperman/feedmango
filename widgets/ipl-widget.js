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
 * TRENDING STORIES WIDGET - Horizontal Carousel (Row 2)
 * ============================================================
 * Shows trending articles from RSS feeds
 * First card is always SPORTSrip's latest article
 */

(function() {

  // ─── Scroll ───
  window.scrollTrending = function(direction) {
    var carousel = document.getElementById('trendingStripContent');
    if (!carousel) return;
    carousel.scrollBy({ left: direction * 600, behavior: 'smooth' });
  };

  function updateTrendingArrows() {
    var c = document.getElementById('trendingStripContent');
    var l = document.getElementById('trendingLeft');
    var r = document.getElementById('trendingRight');
    if (!c || !l || !r) return;

    l.style.opacity = c.scrollLeft <= 10 ? '0.3' : '1';
    l.style.pointerEvents = c.scrollLeft <= 10 ? 'none' : 'auto';

    var end = c.scrollLeft >= (c.scrollWidth - c.clientWidth - 10);
    r.style.opacity = end ? '0.3' : '1';
    r.style.pointerEvents = end ? 'none' : 'auto';
  }

  // ─── Load Trending ───
  async function loadTrendingStories() {
    var container = document.getElementById('trendingStripContent');
    if (!container) return;

    // Wait for main feed data to load (allCache from api.js)
    var attempts = 0;
    while ((!window.allCache || window.allCache.length === 0) && attempts < 20) {
      await new Promise(function(r) { setTimeout(r, 500); });
      attempts++;
    }

    var articles = window.allCache || [];
    if (articles.length === 0) {
      container.innerHTML = '<div class="schedule-loading">No stories yet</div>';
      return;
    }

    // Separate own articles and RSS articles
    var ownArticles = articles.filter(function(a) { return a.isOwn; });
    var rssArticles = articles.filter(function(a) { return !a.isOwn; });

    // Sort RSS by date (newest first)
    rssArticles.sort(function(a, b) {
      return new Date(b.pubDate || 0) - new Date(a.pubDate || 0);
    });

    // Build trending list: SPORTSrip article first, then RSS
    var trending = [];
    if (ownArticles.length > 0) trending.push(ownArticles[0]);
    trending = trending.concat(rssArticles.slice(0, 15));

    // Render
    container.innerHTML = '';
    trending.forEach(function(article) {
      var card = document.createElement('a');
      card.className = 'trending-card' + (article.isOwn ? ' own-trending' : '');
      card.href = article.link || '#';
      card.target = '_blank';
      card.rel = 'noopener';

      if (article.isOwn) {
        card.href = '#';
        card.onclick = function(e) {
          e.preventDefault();
          if (typeof openArtModal === 'function') openArtModal(article);
        };
      }

      var img = article.image || article.thumbnail || '';
      var source = article.source || (article.isOwn ? 'SPORTSrip' : '');
      var timeAgo = getTimeAgo(article.pubDate);

      card.innerHTML =
        (img ? '<div class="trending-card-img"><img src="' + img + '" alt="" onerror="this.parentElement.style.display=\'none\'"></div>' : '') +
        '<div class="trending-card-body">' +
          (article.isOwn ? '<span class="trending-own-badge">OUR COLUMN</span>' : '') +
          '<div class="trending-card-title">' + (article.title || 'Untitled') + '</div>' +
          '<div class="trending-card-meta">' +
            (source ? '<span class="trending-source">' + source + '</span>' : '') +
            (timeAgo ? '<span>' + timeAgo + '</span>' : '') +
          '</div>' +
        '</div>';

      container.appendChild(card);
    });

    // Also populate sidebar trending with same data
    populateSidebarTrending(trending);

    // Arrows
    updateTrendingArrows();
    container.removeEventListener('scroll', updateTrendingArrows);
    container.addEventListener('scroll', updateTrendingArrows, { passive: true });
  }

  // ─── Populate Sidebar Trending ───
  function populateSidebarTrending(trending) {
    var sidebar = document.getElementById('trendingList');
    if (!sidebar) return;

    sidebar.innerHTML = '';
    var count = Math.min(trending.length, 8);
    for (var i = 0; i < count; i++) {
      var a = trending[i];
      var item = document.createElement('a');
      item.className = 'sidebar-trending-item' + (a.isOwn ? ' own-article' : '');
      item.href = a.link || '#';
      item.target = '_blank';

      if (a.isOwn) {
        item.href = '#';
        item.onclick = (function(article) {
          return function(e) {
            e.preventDefault();
            if (typeof openArtModal === 'function') openArtModal(article);
          };
        })(a);
      }

      var num = i + 1;
      item.innerHTML =
        '<span class="trending-num">' + (num < 10 ? '0' + num : num) + '</span>' +
        '<div class="trending-item-text">' +
          (a.isOwn ? '<span class="trending-own-tag">SPORTSrip</span>' : '') +
          '<span class="trending-item-title">' + (a.title || 'Untitled') + '</span>' +
        '</div>';

      sidebar.appendChild(item);
    }
  }

  // ─── Time Ago ───
  function getTimeAgo(dateStr) {
    if (!dateStr) return '';
    var diff = Date.now() - new Date(dateStr).getTime();
    var mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return mins + 'm ago';
    var hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + 'h ago';
    var days = Math.floor(hrs / 24);
    if (days < 7) return days + 'd ago';
    return new Date(dateStr).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  }

  // ─── Init ───
  function initTrending() {
    // Delay to allow main feed to load first
    setTimeout(loadTrendingStories, 3000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTrending);
  } else {
    initTrending();
  }

})();
