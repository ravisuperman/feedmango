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
   * direction: -1 for left, 1 for right
   */
  window.scrollCarousel = function(direction) {
    var carousel = document.getElementById('iplLiveContent');
    var cardWidth = 294; // card width (280) + gap (14)
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
    try {
      var response = await fetch(IPL_WORKER_URL);
      
      if (!response.ok) {
        throw new Error('HTTP ' + response.status);
      }
      
      var data = await response.json();
      
      if (!data || !data.data || data.data.length === 0) {
        document.getElementById('iplLiveContent').innerHTML = 
          '<div class="schedule-loading">No matches found</div>';
        return;
      }
      
      // Sort matches: IPL first, then by status, then by date
      var matches = sortMatches(data.data);
      
      if (matches.length === 0) {
        document.getElementById('iplLiveContent').innerHTML = 
          '<div class="schedule-loading">No cricket matches scheduled</div>';
        return;
      }
      
      // Build match cards as horizontal cards
      var container = document.getElementById('iplLiveContent');
      container.innerHTML = '';
      
      matches.slice(0, 12).forEach(function(match) {
        var card = document.createElement('div');
        card.className = 'cricket-match-card' + (isIPLMatch(match) ? ' ipl-highlight' : '');
        card.innerHTML = buildMatchCardHTML(match);
        container.appendChild(card);
      });
      
      // Show last updated
      var lastUpdatedEl = document.getElementById('lastUpdated');
      lastUpdatedEl.style.display = 'block';
      lastUpdatedEl.textContent = 'Updated ' + new Date().toLocaleTimeString('en-IN', { 
        hour: 'numeric', minute: '2-digit' 
      });
      
      // Set up arrow visibility
      updateArrows();
      container.addEventListener('scroll', updateArrows, { passive: true });
      
    } catch (error) {
      console.error('Failed to load cricket data:', error);
      document.getElementById('iplLiveContent').innerHTML = 
        '<div class="schedule-loading">⚠️ Failed to load — <span onclick="refreshIPLData()" style="color:var(--espn-blue);cursor:pointer;font-weight:700;">try again</span></div>';
    }
  }

  /**
   * Sort matches: IPL first → Live → Upcoming → Completed → by date
   */
  function sortMatches(matches) {
    return matches.slice().sort(function(a, b) {
      var aIPL = isIPLMatch(a) ? 0 : 1;
      var bIPL = isIPLMatch(b) ? 0 : 1;
      if (aIPL !== bIPL) return aIPL - bIPL;
      
      var aStatus = getStatusPriority(a);
      var bStatus = getStatusPriority(b);
      if (aStatus !== bStatus) return aStatus - bStatus;
      
      var aDate = new Date(a.dateTimeGMT || a.date || 0);
      var bDate = new Date(b.dateTimeGMT || b.date || 0);
      return bDate - aDate;
    });
  }

  /**
   * Check if match is IPL
   */
  function isIPLMatch(match) {
    var name = (match.name || '').toLowerCase();
    if (name.includes('indian premier league') || name.includes('ipl')) return true;
    
    var iplTeams = ['chennai super kings', 'mumbai indians', 'royal challengers', 
                    'kolkata knight riders', 'sunrisers hyderabad', 'rajasthan royals',
                    'delhi capitals', 'punjab kings', 'lucknow super giants', 'gujarat titans',
                    'csk', 'mi', 'rcb', 'kkr', 'srh', 'rr', 'dc', 'pbks', 'lsg', 'gt'];
    
    for (var i = 0; i < iplTeams.length; i++) {
      if (name.includes(iplTeams[i])) return true;
    }
    
    if (match.teams) {
      var teamsStr = match.teams.join(' ').toLowerCase();
      for (var j = 0; j < iplTeams.length; j++) {
        if (teamsStr.includes(iplTeams[j])) return true;
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
   * Build match card inner HTML
   */
  function buildMatchCardHTML(match) {
    var status = getMatchStatus(match);
    var teams = getTeamDisplay(match);
    var venue = shortenVenue(match.venue || 'TBD');
    var date = formatMatchDate(match.dateTimeGMT || match.date);
    var seriesBadge = '';
    
    if (isIPLMatch(match)) {
      seriesBadge = '<span class="match-series-badge ipl-badge">IPL 2026</span>';
    } else {
      var series = getSeriesName(match);
      if (series) {
        seriesBadge = '<span class="match-series-badge">' + series + '</span>';
      }
    }
    
    return '<div class="match-header-row">' +
        seriesBadge +
        '<span class="match-status status-' + status.cls + '">' + status.text + '</span>' +
      '</div>' +
      teams +
      '<div class="match-info">' +
        (date ? '<span>📅 ' + date + '</span>' : '') +
        '<span>📍 ' + venue + '</span>' +
      '</div>' +
      (match.status ? '<div class="match-result">' + match.status + '</div>' : '');
  }

  /**
   * Get team display with logos and inline scores
   */
  function getTeamDisplay(match) {
    if (match.teamInfo && match.teamInfo.length >= 2) {
      var t1 = match.teamInfo[0];
      var t2 = match.teamInfo[1];
      var t1Name = t1.shortname || t1.name;
      var t2Name = t2.shortname || t2.name;
      var defaultImg = 'https://h.cricapi.com/img/icon512.png';
      
      var t1Score = '';
      var t2Score = '';
      if (match.score && match.score.length > 0) {
        match.score.forEach(function(s) {
          var inning = (s.inning || '').toLowerCase();
          var t1NameLower = (t1.name || '').toLowerCase();
          var t2NameLower = (t2.name || '').toLowerCase();
          // Match by first word of team name
          var t1First = t1NameLower.split(' ')[0];
          var t2First = t2NameLower.split(' ')[0];
          if (inning.includes(t1First) && !t1Score) {
            t1Score = s.r + '/' + s.w + ' (' + s.o + ')';
          } else if (inning.includes(t2First) && !t2Score) {
            t2Score = s.r + '/' + s.w + ' (' + s.o + ')';
          }
        });
      }
      
      var img1 = (t1.img && t1.img !== defaultImg) 
        ? '<img class="team-logo" src="' + t1.img + '" onerror="this.style.display=\'none\'" alt="">' 
        : '<div class="team-logo" style="background:var(--espn-blue);display:flex;align-items:center;justify-content:center;color:#fff;font-size:9px;font-weight:800;">' + (t1Name || '').slice(0,2) + '</div>';
      var img2 = (t2.img && t2.img !== defaultImg) 
        ? '<img class="team-logo" src="' + t2.img + '" onerror="this.style.display=\'none\'" alt="">' 
        : '<div class="team-logo" style="background:var(--espn-blue);display:flex;align-items:center;justify-content:center;color:#fff;font-size:9px;font-weight:800;">' + (t2Name || '').slice(0,2) + '</div>';
      
      return '<div class="match-teams-row">' +
        '<div class="team-row">' +
          img1 +
          '<span class="team-name">' + t1Name + '</span>' +
          (t1Score ? '<span class="team-score">' + t1Score + '</span>' : '<span class="team-score" style="color:var(--text3);">—</span>') +
        '</div>' +
        '<div class="team-row">' +
          img2 +
          '<span class="team-name">' + t2Name + '</span>' +
          (t2Score ? '<span class="team-score">' + t2Score + '</span>' : '<span class="team-score" style="color:var(--text3);">—</span>') +
        '</div>' +
      '</div>';
    }
    
    if (match.teams && match.teams.length >= 2) {
      return '<div class="match-teams">' + match.teams[0] + ' vs ' + match.teams[1] + '</div>';
    }
    
    return '<div class="match-title">' + (match.name || 'Cricket Match') + '</div>';
  }

  /**
   * Extract series name
   */
  function getSeriesName(match) {
    var name = match.name || '';
    var parts = name.split(',');
    if (parts.length >= 3) {
      return parts[parts.length - 1].trim().replace(/\s*\d{4}(-\d{2,4})?\s*$/,'').trim();
    }
    if (parts.length >= 2) {
      return parts[parts.length - 1].trim().replace(/\s*\d{4}(-\d{2,4})?\s*$/,'').trim();
    }
    return '';
  }

  /**
   * Shorten venue
   */
  function shortenVenue(venue) {
    if (venue.length > 25) {
      var parts = venue.split(',');
      if (parts.length >= 2) return parts[parts.length - 1].trim();
    }
    return venue;
  }

  /**
   * Get match status
   */
  function getMatchStatus(match) {
    if (match.matchStarted && !match.matchEnded) {
      return { text: '● LIVE', cls: 'live' };
    }
    if (match.matchEnded) {
      return { text: 'RESULT', cls: 'completed' };
    }
    return { text: 'UPCOMING', cls: 'upcoming' };
  }

  /**
   * Format date
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
   * Refresh (exposed globally)
   */
  window.refreshIPLData = async function() {
    document.getElementById('iplLiveContent').innerHTML = 
      '<div class="schedule-loading">Refreshing...</div>';
    var el = document.getElementById('lastUpdated');
    if (el) el.style.display = 'none';
    await loadCricketSchedule();
  };

  /**
   * Initialize
   */
  function initCricketWidget() {
    loadCricketSchedule();
    setInterval(loadCricketSchedule, 5 * 60 * 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCricketWidget);
  } else {
    initCricketWidget();
  }
})();
