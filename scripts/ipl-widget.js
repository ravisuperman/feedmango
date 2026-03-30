/**
 * ============================================================
 * IPL WIDGET - Live Cricket Scores
 * ============================================================
 * Connects to your existing ipl-live-score worker
 * Auto-refreshes every 5 minutes
 */

(function() {
  const IPL_WORKER_URL = 'https://ipl-live-score.ravi-kompel.workers.dev';

  /**
   * Load IPL Live Data
   */
  async function loadIPLLiveData() {
    try {
      const response = await fetch(IPL_WORKER_URL);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data || !data.data) {
        document.getElementById('iplLiveContent').innerHTML = 
          '<div class="widget-empty">No live matches at the moment</div>';
        return;
      }
      
      // Filter only IPL matches
      const iplMatches = data.data.filter(match => 
        match.name && (
          match.name.toLowerCase().includes('ipl') ||
          match.matchType === 'ipl' ||
          match.seriesName?.toLowerCase().includes('ipl')
        )
      );
      
      if (iplMatches.length === 0) {
        document.getElementById('iplLiveContent').innerHTML = 
          '<div class="widget-empty">No IPL matches today<br><small>Check back during IPL season</small></div>';
        return;
      }
      
      // Build match cards
      let html = '';
      iplMatches.slice(0, 5).forEach(match => {
        html += buildMatchCard(match);
      });
      
      document.getElementById('iplLiveContent').innerHTML = html;
      
      // Show last updated time
      const lastUpdatedEl = document.getElementById('lastUpdated');
      lastUpdatedEl.style.display = 'block';
      lastUpdatedEl.textContent = `Last updated: ${new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}`;
      
    } catch (error) {
      console.error('Failed to load IPL data:', error);
      document.getElementById('iplLiveContent').innerHTML = 
        '<div class="widget-error">⚠️ Failed to load matches<br><small>Click refresh to try again</small></div>';
    }
  }

  /**
   * Build a match card
   */
  function buildMatchCard(match) {
    const status = getMatchStatus(match);
    const teams = getTeamNames(match);
    const score = getScore(match);
    const venue = match.venue || 'Venue TBD';
    const date = match.date ? formatMatchDate(match.date) : '';
    
    return `
      <div class="cricket-match-card">
        <div class="match-title">${match.name || 'IPL Match'}</div>
        ${teams ? `<div class="match-teams">${teams}</div>` : ''}
        ${score ? `<div class="match-score">${score}</div>` : ''}
        <div class="match-info">
          <span class="match-status status-${status.class}">${status.text}</span>
          ${date ? `<span>📅 ${date}</span>` : ''}
          <span>📍 ${venue}</span>
        </div>
        ${match.status ? `<div style="font-size: 11px; color: var(--text3); margin-top: 6px;">${match.status}</div>` : ''}
      </div>
    `;
  }

  /**
   * Get match status
   */
  function getMatchStatus(match) {
    if (match.matchEnded) {
      return { text: 'Completed', class: 'completed' };
    }
    if (match.matchStarted && !match.matchEnded) {
      return { text: '🔴 Live', class: 'live' };
    }
    return { text: 'Upcoming', class: 'upcoming' };
  }

  /**
   * Get team names
   */
  function getTeamNames(match) {
    if (match.teamInfo && match.teamInfo.length >= 2) {
      return `${match.teamInfo[0].shortname || match.teamInfo[0].name} vs ${match.teamInfo[1].shortname || match.teamInfo[1].name}`;
    }
    if (match.teams && match.teams.length >= 2) {
      return `${match.teams[0]} vs ${match.teams[1]}`;
    }
    return null;
  }

  /**
   * Get score
   */
  function getScore(match) {
    if (!match.score || match.score.length === 0) return null;
    
    const scores = match.score.map(s => {
      const inning = s.inning || '';
      const runs = s.r || 0;
      const wickets = s.w || 0;
      const overs = s.o || 0;
      return `${inning}: ${runs}/${wickets} (${overs})`;
    });
    
    return scores.join(' | ');
  }

  /**
   * Format date
   */
  function formatMatchDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }
    if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    }
    
    return date.toLocaleDateString('en-IN', { 
      month: 'short', 
      day: 'numeric' 
    });
  }

  /**
   * Refresh IPL data (exposed globally)
   */
  window.refreshIPLData = async function() {
    document.getElementById('iplLiveContent').innerHTML = 
      '<div class="widget-loading">Refreshing...</div>';
    document.getElementById('lastUpdated').style.display = 'none';
    await loadIPLLiveData();
  };

  /**
   * Initialize IPL widget
   */
  function initIPLWidget() {
    loadIPLLiveData();
    // Auto-refresh every 5 minutes (only updates UI, not API call)
    setInterval(loadIPLLiveData, 5 * 60 * 1000);
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initIPLWidget);
  } else {
    initIPLWidget();
  }
})();
