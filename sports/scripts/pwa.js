/**
 * ============================================================
 * PWA - Service Worker Registration + Push Notification Setup
 * ============================================================
 * Load order: after config.js (needs WORKER url)
 *
 * What this does:
 *   1. Registers sw.js as the service worker
 *   2. Asks user permission to send push notifications
 *   3. Subscribes to Web Push using the VAPID public key
 *   4. Sends the subscription token to /api/subscribe on the worker
 *   5. Shows a subtle "Enable Notifications" nudge in the UI
 * ============================================================
 */

// ── VAPID Public Key ─────────────────────────────────────────
// This is safe to expose publicly — it's only used for encryption,
// not authentication. The private key stays in the worker secret.
const VAPID_PUBLIC_KEY = 'BJOaptbSZUsRzMezX2wxFmc3CbH2Z7xrWIlE6SWgpugo-I2hZLW0A_2UmwHHwc0jxco1ivTT1kXEk9e7coveL1Q';

// ── Convert VAPID key from Base64Url to Uint8Array ───────────
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw     = window.atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

// ── Register Service Worker ──────────────────────────────────
async function registerSW() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    console.log('[PWA] Service Worker registered:', reg.scope);
    return reg;
  } catch (e) {
    console.warn('[PWA] Service Worker registration failed:', e.message);
    return null;
  }
}

// ── Subscribe to Push Notifications ─────────────────────────
async function subscribeToPush(reg) {
  if (!('PushManager' in window)) {
    console.warn('[PWA] Push not supported in this browser.');
    return false;
  }

  try {
    // Check if already subscribed
    const existing = await reg.pushManager.getSubscription();
    if (existing) {
      await saveSubscriptionToServer(existing);
      return true;
    }

    // Request a new subscription
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });

    await saveSubscriptionToServer(subscription);
    return true;
  } catch (e) {
    console.warn('[PWA] Push subscription failed:', e.message);
    return false;
  }
}

// ── Send Subscription to Worker ──────────────────────────────
async function saveSubscriptionToServer(subscription) {
  try {
    const res = await fetch(WORKER + '/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: subscription.toJSON() })
    });
    if (res.ok) {
      console.log('[PWA] Subscription saved to server ✓');
      localStorage.setItem('sportsrip-push-subscribed', '1');
    }
  } catch (e) {
    console.warn('[PWA] Failed to save subscription:', e.message);
  }
}

// ── Show Notification Permission Nudge ───────────────────────
function showPushNudge() {
  // Don't show if already subscribed or dismissed
  if (localStorage.getItem('sportsrip-push-subscribed')) return;
  if (localStorage.getItem('sportsrip-push-dismissed')) return;
  if (Notification.permission === 'denied') return;

  // Wait 8 seconds after page load (not annoying)
  setTimeout(() => {
    // Build nudge banner
    const nudge = document.createElement('div');
    nudge.id = 'pushNudge';
    nudge.innerHTML = `
      <div style="
        position:fixed; bottom:80px; left:50%; transform:translateX(-50%);
        background:var(--espn-blue); color:#fff;
        padding:14px 20px; border-radius:12px;
        box-shadow:0 8px 28px rgba(3,91,176,0.45);
        display:flex; align-items:center; gap:12px;
        font-family:'Assistant',sans-serif; font-size:14px; font-weight:700;
        z-index:9000; max-width:340px; width:calc(100% - 40px);
        animation:nudgeSlideUp 0.4s ease-out;
      ">
        <span style="font-size:24px; flex-shrink:0;">🔔</span>
        <span style="flex:1; line-height:1.3;">Get live IPL alerts &amp; breaking sports news</span>
        <button id="pushNudgeAllow" style="
          background:#fff; color:var(--espn-blue);
          border:none; border-radius:8px;
          padding:8px 14px; font-weight:800; font-size:13px;
          cursor:pointer; white-space:nowrap; flex-shrink:0;
        ">Allow</button>
        <button id="pushNudgeDismiss" style="
          background:rgba(255,255,255,0.15); color:#fff;
          border:none; border-radius:6px;
          width:28px; height:28px; font-size:16px;
          cursor:pointer; display:flex; align-items:center; justify-content:center;
          flex-shrink:0;
        ">✕</button>
      </div>
    `;

    const style = document.createElement('style');
    style.textContent = `
      @keyframes nudgeSlideUp {
        from { opacity:0; transform:translateX(-50%) translateY(20px); }
        to   { opacity:1; transform:translateX(-50%) translateY(0); }
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(nudge);

    document.getElementById('pushNudgeAllow').onclick = async () => {
      nudge.remove();
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        const reg = await navigator.serviceWorker.ready;
        await subscribeToPush(reg);
        showToast('🔔 Notifications enabled! You\'ll get IPL alerts.');
      }
    };

    document.getElementById('pushNudgeDismiss').onclick = () => {
      nudge.remove();
      localStorage.setItem('sportsrip-push-dismissed', '1');
    };

  }, 8000);
}

// ── Simple Toast Helper ──────────────────────────────────────
function showToast(msg) {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position:fixed; bottom:24px; left:50%; transform:translateX(-50%);
    background:#1a1a22; color:#fff; padding:12px 20px;
    border-radius:10px; font-size:14px; font-weight:700;
    font-family:'Assistant',sans-serif; z-index:9999;
    box-shadow:0 4px 20px rgba(0,0,0,0.4);
    animation:nudgeSlideUp 0.3s ease-out;
  `;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// ── Init ─────────────────────────────────────────────────────
(async function initPWA() {
  const reg = await registerSW();
  if (!reg) return;

  // If already granted, silently resubscribe (handles token refresh)
  if (Notification.permission === 'granted') {
    await reg.pushManager.ready;
    await subscribeToPush(reg);
  } else if (Notification.permission !== 'denied') {
    // Disabled for now as backend infrastructure (PUSH_KV, real-time triggers) is not ready
    // showPushNudge();
  }
})();
