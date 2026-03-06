// ═══════════════════════════════════════════════════════════
// REPLACE the entire LOGIN section in your admin.html
// Find: const PASS = 'ava2026';
// And:  function doLogin() { ... }
// Replace with this:
// ═══════════════════════════════════════════════════════════

// Password is now stored securely in Vercel environment variables
// It is NOT in this file — no one can find it by viewing source

let adminToken = sessionStorage.getItem('ava_admin_token') || null;

async function doLogin() {
  const password = document.getElementById('pwInput').value;
  if (!password) return;

  const btn = document.querySelector('.login-btn');
  btn.textContent = 'Verifying...';
  btn.disabled = true;

  try {
    const res = await fetch('/api/admin-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    const data = await res.json();

    if (data.ok) {
      adminToken = data.token;
      sessionStorage.setItem('ava_admin_token', adminToken);
      document.getElementById('loginScreen').style.display = 'none';
      document.getElementById('app').classList.add('visible');
      initApp();
    } else {
      document.getElementById('loginErr').classList.add('show');
      document.getElementById('pwInput').value = '';
      document.getElementById('pwInput').focus();
    }
  } catch (err) {
    // Fallback if API is unreachable (e.g. local dev)
    console.warn('Login API unreachable:', err.message);
    document.getElementById('loginErr').classList.add('show');
  }

  btn.textContent = 'Access Admin Panel →';
  btn.disabled = false;
}

function doLogout() {
  adminToken = null;
  sessionStorage.removeItem('ava_admin_token');
  document.getElementById('app').classList.remove('visible');
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('pwInput').value = '';
  document.getElementById('loginErr').classList.remove('show');
}

// Auto-login if valid session exists
window.addEventListener('DOMContentLoaded', () => {
  if (adminToken) {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('app').classList.add('visible');
    initApp();
  }
});