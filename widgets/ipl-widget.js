/**
 * ============================================================
 * CRICKET SCHEDULE WIDGET - Worldwide Cricket Matches
 * ============================================================
 * Shows all cricket matches from CricAPI (via your worker)
 * IPL matches are sorted to the top
 * Auto-refreshes every 5 minutes
 */

(function() {

  /**
   * Load Cricket Match Data
   */
  async function loadCricketSchedule() {
    try {
      const response = await fetch(IPL_WORKER_URL);
      
      if (!response.ok) {
        throw new Error('HTTP ' + response.status);
      }
      
      const data = await response.json();
      
      if (!data || !data.data || data.data.length === 0) {
        document.getElementById('iplLiveContent').innerHTML = 
          '<div class="widget-empty">No matches found</div>';
        return;
      }
      
      // Sort matches: IPL first, then by date (newest first)
      const matches = sortMatches(data.data);
      
      if (matches.length === 0) {
        document.getElementById('iplLiveContent').innerHTML = 
          '<div class="widget-empty">No cricket matches scheduled</div>';
        return;
      }
      
      // Build match cards
      let html = '';
      matches.slice(0, 8).forEach(function(match) {
        html += buildMatchCard(match);
      });
      
      document.getElementById('iplLiveContent').innerHTML = html;
      
      // Show last updated time
      var lastUpdatedEl = document.getElementById('lastUpdated');
      lastUpdatedEl.style.display = 'block';
      lastUpdatedEl.textContent = 'Updated: ' + new Date().toLocaleTimeString('en-IN', { 
        hour: 'numeric', minute: '2-digit' 
      });
      
    } catch (error) {
      console.error('Failed to load cricket data:', error);
      document.getElementById('iplLiveContent').innerHTML = 
        '<div class="widget-error">⚠️ Failed to load matches<br><small>Click refresh to try again</small></div>';
    }
  }

  /**
   * Sort matches: IPL first, then Live, then Upcoming, then Completed
   * Within each group, sort by date (newest first)
   */
  function sortMatches(matches) {
    return matches.slice().sort(function(a, b) {
      var aIPL = isIPLMatch(a) ? 0 : 1;
      var bIPL = isIPLMatch(b) ? 0 : 1;
      
      // IPL matches always come first
      if (aIPL !== bIPL) return aIPL - bIPL;
      
      // Then sort by status: Live > Upcoming > Completed
      var aStatus = getStatusPriority(a);
      var bStatus = getStatusPriority(b);
      if (aStatus !== bStatus) return aStatus - bStatus;
      
      // Then by date (newest first)
      var aDate = new Date(a.dateTimeGMT || a.date || 0);
      var bDate = new Date(b.dateTimeGMT || b.date || 0);
      return bDate - aDate;
    });
  }

  /**
   * Check if match is an IPL match
   */
  function isIPLMatch(match) {
    var name = (match.name || '').toLowerCase();
    var seriesId = (match.series_id || '').toLowerCase();
    
    // Check name for IPL indicators
    if (name.includes('indian premier league') || name.includes('ipl')) {
      return true;
    }
    
    // Check for IPL team names in the match
    var iplTeams = ['chennai super kings', 'mumbai indians', 'royal challengers', 
                    'kolkata knight riders', 'sunrisers hyderabad', 'rajasthan royals',
                    'delhi capitals', 'punjab kings', 'lucknow super giants', 'gujarat titans',
                    'csk', 'mi', 'rcb', 'kkr', 'srh', 'rr', 'dc', 'pbks', 'lsg', 'gt'];
    
    for (var i = 0; i < iplTeams.length; i++) {
      if (name.includes(iplTeams[i])) return true;
    }
    
    // Check teams array
    if (match.teams) {
      var teamsStr = match.teams.join(' ').toLowerCase();
      for (var j = 0; j < iplTeams.length; j++) {
        if (teamsStr.includes(iplTeams[j])) return true;
      }
    }
    
    return false;
  }

  /**
   * Get status priority for sorting (lower = shown first)
   */
  function getStatusPriority(match) {
    if (match.matchStarted && !match.matchEnded) return 0; // Live
    if (!match.matchStarted && !match.matchEnded) return 1; // Upcoming
    return 2; // Completed
  }

  /**
   * Build a match card
   */
  function buildMatchCard(match) {
    var status = getMatchStatus(match);
    var teams = getTeamDisplay(match);
    var score = getScore(match);
    var venue = shortenVenue(match.venue || 'Venue TBD');
    var date = formatMatchDate(match.dateTimeGMT || match.date);
    var isIPL = isIPLMatch(match);
    var matchName = getCleanMatchName(match);
    
    // Series/tournament badge
    var seriesBadge = '';
    if (isIPL) {
      seriesBadge = '<span class="match-series-badge ipl-badge">IPL</span>';
    } else {
      var series = getSeriesName(match);
      if (series) {
        seriesBadge = '<span class="match-series-badge">' + series + '</span>';
      }
    }
    
    return '<div class="cricket-match-card' + (isIPL ? ' ipl-highlight' : '') + '">' +
      '<div class="match-header-row">' +
        seriesBadge +
        '<span class="match-status status-' + status.cls + '">' + status.text + '</span>' +
      '</div>' +
      teams +
      (score ? '<div class="match-score">' + score + '</div>' : '') +
      '<div class="match-info">' +
        (date ? '<span>📅 ' + date + '</span>' : '') +
        '<span>📍 ' + venue + '</span>' +
      '</div>' +
      (match.status ? '<div class="match-result">' + match.status + '</div>' : '') +
    '</div>';
  }

  /**
   * Get team display with logos
   */
  function getTeamDisplay(match) {
    if (match.teamInfo && match.teamInfo.length >= 2) {
      var t1 = match.teamInfo[0];
      var t2 = match.teamInfo[1];
      var t1Name = t1.shortname || t1.name;
      var t2Name = t2.shortname || t2.name;
      var defaultImg = 'https://h.cricapi.com/img/icon512.png';
      
      // Get scores for each team
      var t1Score = '';
      var t2Score = '';
      if (match.score && match.score.length > 0) {
        match.score.forEach(function(s) {
          var inning = (s.inning || '').toLowerCase();
          var t1NameLower = (t1.name || '').toLowerCase();
          var t2NameLower = (t2.name || '').toLowerCase();
          if (inning.includes(t1NameLower.split(' ')[0])) {
            t1Score = s.r + '/' + s.w + ' (' + s.o + ')';
          } else if (inning.includes(t2NameLower.split(' ')[0])) {
            t2Score = s.r + '/' + s.w + ' (' + s.o + ')';
          }
        });
      }
      
      var img1 = (t1.img && t1.img !== defaultImg) 
        ? '<img class="team-logo" src="' + t1.img + '" onerror="this.style.display=\'none\'" alt="">' 
        : '';
      var img2 = (t2.img && t2.img !== defaultImg) 
        ? '<img class="team-logo" src="' + t2.img + '" onerror="this.style.display=\'none\'" alt="">' 
        : '';
      
      return '<div class="match-teams-row">' +
        '<div class="team-row">' +
          img1 +
          '<span class="team-name">' + t1Name + '</span>' +
          (t1Score ? '<span class="team-score">' + t1Score + '</span>' : '') +
        '</div>' +
        '<div class="team-row">' +
          img2 +
          '<span class="team-name">' + t2Name + '</span>' +
          (t2Score ? '<span class="team-score">' + t2Score + '</span>' : '') +
        '</div>' +
      '</div>';
    }
    
    // Fallback to simple text
    if (match.teams && match.teams.length >= 2) {
      return '<div class="match-teams">' + match.teams[0] + ' vs ' + match.teams[1] + '</div>';
    }
    
    return '<div class="match-title">' + (match.name || 'Cricket Match') + '</div>';
  }

  /**
   * Get clean match name (remove team names, keep series info)
   */
  function getCleanMatchName(match) {
    var name = match.name || '';
    // Extract just the match number/type part
    var parts = name.split(',');
    if (parts.length >= 2) {
      return parts.slice(1).join(',').trim();
    }
    return name;
  }

  /**
   * Extract series name from match name
   */
  function getSeriesName(match) {
    var name = match.name || '';
    var parts = name.split(',');
    if (parts.length >= 3) {
      return parts[parts.length - 1].trim().replace(/\s*\d{4}(-\d{2,4})?\s*$/, '').trim();
    }
    if (parts.length >= 2) {
      return parts[parts.length - 1].trim().replace(/\s*\d{4}(-\d{2,4})?\s*$/, '').trim();
    }
    return '';
  }

  /**
   * Shorten venue name
   */
  function shortenVenue(venue) {
    // Take only the city part if venue is too long
    if (venue.length > 30) {
      var parts = venue.split(',');
      if (parts.length >= 2) {
        return parts[parts.length - 1].trim();
      }
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
   * Get score summary
   */
  function getScore(match) {
    if (!match.score || match.score.length === 0) return null;
    
    var scores = [];
    match.score.forEach(function(s) {
      var inning = s.inning || '';
      // Shorten inning name
      var shortInning = inning.replace(/ Inning \d+/i, '').trim();
      // Get first word as identifier
      var teamId = shortInning.split(' ')[0];
      scores.push(teamId + ': ' + s.r + '/' + s.w + ' (' + s.o + ')');
    });
    
    return null; // We show scores inline with team names now
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
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }
    if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    
    return date.toLocaleDateString('en-IN', { 
      month: 'short', 
      day: 'numeric' 
    });
  }

  /**
   * Refresh (exposed globally)
   */
  window.refreshIPLData = async function() {
    document.getElementById('iplLiveContent').innerHTML = 
      '<div class="widget-loading">Refreshing...</div>';
    document.getElementById('lastUpdated').style.display = 'none';
    await loadCricketSchedule();
  };

  /**
   * Initialize
   */
  function initCricketWidget() {
    loadCricketSchedule();
    // Auto-refresh every 5 minutes
    setInterval(loadCricketSchedule, 5 * 60 * 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCricketWidget);
  } else {
    initCricketWidget();
  }
})();
