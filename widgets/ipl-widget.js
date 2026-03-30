/**
 * ============================================================
 * CRICKET SCHEDULE WIDGET - Horizontal Carousel
 * ============================================================
 * Shows worldwide cricket matches in a scrollable carousel
 * IPL matches sorted to the top
 * Arrow buttons for navigation
 * Auto-refreshes every 5 minutes
 */

(function() {

  /**
   * Scroll carousel left or right
   */
  window.scrollCarousel = function(direction) {
    var carousel = document.getElementById('iplLiveContent');
    if (!carousel) return;
    var cardWidth = 294;
    carousel.scrollBy({ left: direction * cardWidth * 2, behavior: 'smooth' });
  };

  /**
   * Update arrow visibility based on scroll position
   */
  function updateArrows() {
    var carousel = document.getElementById('iplLiveContent');
    var leftBtn = document.getElementById('carouselLeft');
    var rightBtn = document.getElementById('carouselRight');
    if (!carousel || !leftBtn || !rightBtn) return;

    var atStart = carousel.scrollLeft <= 10;
    var atEnd = carousel.scrollLeft >= (carousel.scrollWidth - carousel.clientWidth - 10);

    leftBtn.style.opacity = atStart ? '0.3' : '1';
    leftBtn.style.pointerEvents = atStart ? 'none' : 'auto';
    rightBtn.style.opacity = atEnd ? '0.3' : '1';
    rightBtn.style.pointerEvents = atEnd ? 'none' : 'auto';
  }

  /**
   * Load Cricket Match Data
   */
  async function loadCricketSchedule() {
    var container = document.getElementById('iplLiveContent');
    if (!container) return;

    try {
      var response = await fetch(IPL_WORKER_URL);

      if (!response.ok) {
        throw new Error('HTTP ' + response.status);
      }

      var data = await response.json();

      if (!data || !data.data || data.data.length === 0) {
        container.innerHTML = '<div class="schedule-loading">No matches found</div>';
        return;
      }

      // Sort: IPL first, then Live, then Upcoming, then Completed, then by date
      var matches = sortMatches(data.data);

      if (matches.length === 0) {
        container.innerHTML = '<div class="schedule-loading">No cricket matches scheduled</div>';
        return;
      }

      // Render cards
      container.innerHTML = '';
      var count = Math.min(matches.length, 15);
      for (var i = 0; i < count; i++) {
        var match = matches[i];
        var card = document.createElement('div');
        card.className = 'cricket-match-card' + (isIPLMatch(match) ? ' ipl-highlight' : '');
        card.innerHTML = buildMatchCardHTML(match);
        container.appendChild(card);
      }

      // Show last updated
      var lastUpdatedEl = document.getElementById('lastUpdated');
      if (lastUpdatedEl) {
        lastUpdatedEl.style.display = 'block';
        lastUpdatedEl.textContent = 'Updated ' + new Date().toLocaleTimeString('en-IN', {
          hour: 'numeric', minute: '2-digit'
        });
      }

      // Arrow visibility
      updateArrows();
      container.removeEventListener('scroll', updateArrows);
      container.addEventListener('scroll', updateArrows, { passive: true });

    } catch (error) {
      console.error('Cricket widget error:', error);
      container.innerHTML =
        '<div class="schedule-loading">' +
        '⚠️ Could not load matches — ' +
        '<span onclick="refreshIPLData()" style="color:var(--espn-blue);cursor:pointer;font-weight:700;">try again</span>' +
        '</div>';
    }
  }

  /**
   * Sort: IPL first, then Live > Upcoming > Completed, then newest first
   */
  function sortMatches(matches) {
    return matches.slice().sort(function(a, b) {
      // IPL always first
      var aIPL = isIPLMatch(a) ? 0 : 1;
      var bIPL = isIPLMatch(b) ? 0 : 1;
      if (aIPL !== bIPL) return aIPL - bIPL;

      // Then by status
      var aS = getStatusPriority(a);
      var bS = getStatusPriority(b);
      if (aS !== bS) return aS - bS;

      // Then by date (newest first)
      var aD = new Date(a.dateTimeGMT || a.date || 0).getTime();
      var bD = new Date(b.dateTimeGMT || b.date || 0).getTime();
      return bD - aD;
    });
  }

  /**
   * Check if match is IPL — uses FULL team names only
   * Short codes like 'mi' caused false positives (matched "Zalmi")
   */
  function isIPLMatch(match) {
    var name = (match.name || '').toLowerCase();

    // Direct name checks
    if (name.indexOf('indian premier league') !== -1) return true;
    if (name.indexOf(' ipl ') !== -1 || name.indexOf('ipl ') === 0) return true;

    // Full IPL team names
    var iplTeams = [
      'chennai super kings', 'mumbai indians', 'royal challengers bengaluru',
      'royal challengers bangalore', 'kolkata knight riders', 'sunrisers hyderabad',
      'rajasthan royals', 'delhi capitals', 'punjab kings',
      'lucknow super giants', 'gujarat titans'
    ];

    var i;
    for (i = 0; i < iplTeams.length; i++) {
      if (name.indexOf(iplTeams[i]) !== -1) return true;
    }

    // Check teams array too
    if (match.teams && match.teams.length >= 2) {
      var teamsStr = match.teams.join(' ').toLowerCase();
      for (i = 0; i < iplTeams.length; i++) {
        if (teamsStr.indexOf(iplTeams[i]) !== -1) return true;
      }
    }

    return false;
  }

  /**
   * Status priority: Live=0, Upcoming=1, Completed=2
   */
  function getStatusPriority(match) {
    if (match.matchStarted && !match.matchEnded) return 0;
    if (!match.matchStarted && !match.matchEnded) return 1;
    return 2;
  }

  /**
   * Build match card HTML
   */
  function buildMatchCardHTML(match) {
    var status = getMatchStatus(match);
    var teams = getTeamDisplay(match);
    var venue = shortenVenue(match.venue || 'TBD');
    var date = formatMatchDate(match.dateTimeGMT || match.date);

    // Only IPL matches get a badge
    var badge = '';
    if (isIPLMatch(match)) {
      badge = '<span class="match-series-badge ipl-badge">IPL 2026</span>';
    }

    var html = '<div class="match-header-row">' +
        badge +
        '<span class="match-status status-' + status.cls + '">' + status.text + '</span>' +
      '</div>' +
      teams +
      '<div class="match-info">';

    if (date) html += '<span>\uD83D\uDCC5 ' + date + '</span>';
    html += '<span>\uD83D\uDCCD ' + venue + '</span>';
    html += '</div>';

    if (match.status) {
      html += '<div class="match-result">' + match.status + '</div>';
    }

    return html;
  }

  /**
   * Get team display with logos and inline scores
   */
  function getTeamDisplay(match) {
    if (!match.teamInfo || match.teamInfo.length < 2) {
      // Fallback: simple text
      if (match.teams && match.teams.length >= 2) {
        return '<div class="match-teams">' + match.teams[0] + ' vs ' + match.teams[1] + '</div>';
      }
      return '<div class="match-title">' + (match.name || 'Cricket Match') + '</div>';
    }

    var t1 = match.teamInfo[0];
    var t2 = match.teamInfo[1];
    var t1Name = t1.shortname || t1.name || '??';
    var t2Name = t2.shortname || t2.name || '??';
    var defaultImg = 'https://h.cricapi.com/img/icon512.png';

    // Extract scores
    var t1Score = '';
    var t2Score = '';
    if (match.score && match.score.length > 0) {
      for (var s = 0; s < match.score.length; s++) {
        var sc = match.score[s];
        var inn = (sc.inning || '').toLowerCase();
        var t1Key = (t1.name || '').toLowerCase().split(' ')[0];
        var t2Key = (t2.name || '').toLowerCase().split(' ')[0];
        if (inn.indexOf(t1Key) !== -1 && !t1Score) {
          t1Score = sc.r + '/' + sc.w + ' (' + sc.o + ')';
        } else if (inn.indexOf(t2Key) !== -1 && !t2Score) {
          t2Score = sc.r + '/' + sc.w + ' (' + sc.o + ')';
        }
      }
    }

    // Team logos
    var logo1 = (t1.img && t1.img !== defaultImg)
      ? '<img class="team-logo" src="' + t1.img + '" onerror="this.style.display=\'none\'" alt="">'
      : '<div class="team-logo" style="background:var(--espn-blue);display:flex;align-items:center;justify-content:center;color:#fff;font-size:9px;font-weight:800;">' + t1Name.slice(0,2) + '</div>';
    var logo2 = (t2.img && t2.img !== defaultImg)
      ? '<img class="team-logo" src="' + t2.img + '" onerror="this.style.display=\'none\'" alt="">'
      : '<div class="team-logo" style="background:var(--espn-blue);display:flex;align-items:center;justify-content:center;color:#fff;font-size:9px;font-weight:800;">' + t2Name.slice(0,2) + '</div>';

    var dash = '<span class="team-score" style="color:var(--text3);">\u2014</span>';

    return '<div class="match-teams-row">' +
      '<div class="team-row">' + logo1 + '<span class="team-name">' + t1Name + '</span>' + (t1Score ? '<span class="team-score">' + t1Score + '</span>' : dash) + '</div>' +
      '<div class="team-row">' + logo2 + '<span class="team-name">' + t2Name + '</span>' + (t2Score ? '<span class="team-score">' + t2Score + '</span>' : dash) + '</div>' +
    '</div>';
  }

  /**
   * Shorten venue to city name
   */
  function shortenVenue(venue) {
    if (venue.length > 25) {
      var parts = venue.split(',');
      if (parts.length >= 2) return parts[parts.length - 1].trim();
    }
    return venue;
  }

  /**
   * Get match status object
   */
  function getMatchStatus(match) {
    if (match.matchStarted && !match.matchEnded) {
      return { text: '\u25CF LIVE', cls: 'live' };
    }
    if (match.matchEnded) {
      return { text: 'RESULT', cls: 'completed' };
    }
    return { text: 'UPCOMING', cls: 'upcoming' };
  }

  /**
   * Format date relative to today
   */
  function formatMatchDate(dateStr) {
    if (!dateStr) return '';
    var date = new Date(dateStr);
    var today = new Date();
    var tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    var yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  }

  /**
   * Refresh — exposed globally for the refresh button
   */
  window.refreshIPLData = async function() {
    var c = document.getElementById('iplLiveContent');
    if (c) c.innerHTML = '<div class="schedule-loading">Refreshing...</div>';
    var el = document.getElementById('lastUpdated');
    if (el) el.style.display = 'none';
    await loadCricketSchedule();
  };

  /**
   * Initialize widget
   */
  function initCricketWidget() {
    loadCricketSchedule();
    setInterval(loadCricketSchedule, 5 * 60 * 1000);
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCricketWidget);
  } else {
    initCricketWidget();
  }

})();
