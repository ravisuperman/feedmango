/**
 * ============================================================
 * UI - Interactions & Visibility
 * ============================================================
 */

function updateClock() {
  const n = new Date();
  const clock = document.getElementById('clockDisplay');
  if (clock) {
    clock.innerHTML = n.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + 
                     ' · ' + 
                     n.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }
}

function toggleMenu() {
  const ham = document.getElementById('hamburger');
  const menu = document.getElementById('mobileMenu');
  if (ham && menu) {
    ham.classList.toggle('active');
    menu.classList.toggle('active');
  }
}

function toggleDark() {
  document.body.classList.toggle('dark-theme');
  const btn = document.getElementById('darkToggle');
  if (btn) btn.textContent = document.body.classList.contains('dark-theme') ? '☀️' : '🌙';
}

function setActive(k) {
  currentSport = k;
  
  // Update Tab Styling
  document.querySelectorAll('.tab, .mobile-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.sport === k);
  });
  
  // Update Section Label
  const label = document.getElementById('sectionLabel');
  if (label) {
    label.innerHTML = (EMOJI[k] || '🏆') + ' ' + (LABEL[k] || 'News');
  }
  
  // ── TOGGLE WIDGET VISIBILITY ──
  toggleWidgets(k);
  
  window.scrollTo({ top: 0, behavior: 'smooth' });
  renderNews();
}

/**
 * Shows or hides the top Cricket Schedule strip based on the active tab.
 * Also informs the renderer if the IPL Stars widget should be injected.
 */
function toggleWidgets(tabName) {
  const heroStrip = document.querySelector('.hero-strip');
  if (!heroStrip) return;
  
  if (WIDGET_TABS.includes(tabName)) {
    heroStrip.style.display = 'block';
    // Re-trigger carousel logic if needed
    if (typeof updateArrows === 'function') updateArrows();
  } else {
    heroStrip.style.display = 'none';
  }
}

// Initialize clock
updateClock();
setInterval(updateClock, 60000);
