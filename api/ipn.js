// api/ipn.js — Ava Jewelry · NOWPayments IPN Handler
// Vercel Environment Variables required:
//   NOWPAYMENTS_IPN_SECRET  — nowpayments.io → Settings → IPN Settings
//   NOTIFY_EMAIL            — afolabibolu15@gmail.com
//   RESEND_API_KEY          — from resend.com

import crypto from 'crypto';

export const config = { api: { bodyParser: true } };

// Sort object keys alphabetically — required for NOWPayments signature check
function sortObjectKeys(obj) {
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(sortObjectKeys);
  return Object.keys(obj).sort().reduce((acc, key) => {
    acc[key] = sortObjectKeys(obj[key]);
    return acc;
  }, {});
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret      = process.env.NOWPAYMENTS_IPN_SECRET;
  const notifyEmail = process.env.NOTIFY_EMAIL;
  const resendKey   = process.env.RESEND_API_KEY;

  try {
    const payload = req.body || {};

    // ── 1. Verify signature using sorted keys (NOWPayments requirement) ──
    const sig = req.headers['x-nowpayments-sig'];
    if (secret && sig) {
      const sorted   = JSON.stringify(sortObjectKeys(payload));
      const expected = crypto.createHmac('sha512', secret).update(sorted).digest('hex');
      if (sig !== expected) {
        console.warn('[IPN] Signature mismatch — possible fake notification');
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    // ── 2. Extract all payment fields ────────────────────────────────────
    const {
      payment_id,
      payment_status,
      pay_address,
      price_amount,
      price_currency,
      pay_amount,
      actually_paid,
      pay_currency,
      order_id,
      order_description,
      outcome_amount,
      outcome_currency,
      created_at,
      updated_at,
    } = payload;

    console.log('[IPN]', { payment_id, order_id, payment_status, actually_paid, price_amount });

    // ── 3. Send email notification on every status change ────────────────
    if (notifyEmail && resendKey) {
      const emoji = {
        waiting:       '⏳',
        confirming:    '🔵',
        confirmed:     '✅',
        finished:      '💰',
        partially_paid:'⚠️',
        failed:        '❌',
        expired:       '🕐',
        refunded:      '↩️',
      }[payment_status] || '📦';

      const label = {
        waiting:       'Waiting for Payment',
        confirming:    'Confirming on Blockchain',
        confirmed:     'Payment Confirmed',
        finished:      'COMPLETE — BTC Sent to Your Wallet',
        partially_paid:'Partial Payment Received',
        failed:        'Payment Failed',
        expired:       'Payment Expired',
        refunded:      'Refunded',
      }[payment_status] || payment_status;

      const done    = payment_status === 'finished' || payment_status === 'confirmed';
      const partial = payment_status === 'partially_paid';

      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
body{font-family:Arial,sans-serif;background:#f0f0f0;margin:0;padding:20px}
.wrap{max-width:540px;margin:0 auto;background:#0a0a0a;border:1px solid #D4AF37}
.top{background:#D4AF37;padding:22px 28px;text-align:center}
.top h1{margin:0;color:#000;font-size:20px;font-weight:300;letter-spacing:4px}
.top p{margin:4px 0 0;color:#000;font-size:10px;letter-spacing:2px;opacity:.65}
.bdy{padding:28px;color:#F0EBE0}
.badge{display:inline-block;padding:7px 18px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:22px;background:${done?'#1a3a1a':partial?'#3a1a1a':'#1a1a1a'};color:${done?'#2ecc71':partial?'#e74c3c':'#D4AF37'};border:1px solid ${done?'#2ecc71':partial?'#e74c3c':'#D4AF37'}}
.row{display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid rgba(212,175,55,.1);font-size:13px}
.lbl{color:rgba(240,235,224,.38);font-size:10px;letter-spacing:1px;text-transform:uppercase}
.val{color:#F0EBE0;font-family:monospace;font-size:12px}
.gold{color:#D4AF37;font-weight:700}
.green{color:#2ecc71}
.box{background:rgba(212,175,55,.07);border:1px solid rgba(212,175,55,.22);padding:14px;margin:18px 0}
.foot{padding:14px 28px;border-top:1px solid rgba(212,175,55,.1);font-size:10px;color:rgba(240,235,224,.2);text-align:center;letter-spacing:1px}
</style></head><body>
<div class="wrap">
  <div class="top"><h1>AVA</h1><p>Payment Notification</p></div>
  <div class="bdy">
    <div class="badge">${emoji} ${label}</div>

    ${done ? `
    <div class="box">
      <b style="color:#2ecc71;font-size:14px">💰 BTC forwarded to your wallet</b><br>
      <span style="font-size:12px;color:rgba(240,235,224,.5);line-height:1.8">
        NOWPayments has sent the BTC to your payout wallet.<br>
        Check your wallet: bc1qs587y20sy0qyzdpyxtu5xfjqhj4ypv663c08wh
      </span>
    </div>` : ''}

    ${partial ? `
    <div class="box" style="border-color:rgba(231,76,60,.35);background:rgba(231,76,60,.07)">
      <b style="color:#e74c3c">⚠️ Customer sent less than required</b><br>
      <span style="font-size:12px;color:rgba(240,235,224,.5);line-height:1.8">
        Required: ${pay_amount} ${(pay_currency||'').toUpperCase()}<br>
        Received: ${actually_paid} ${(pay_currency||'').toUpperCase()}<br>
        The customer needs to send the remaining amount to the same address.
      </span>
    </div>` : ''}

    <div class="row"><span class="lbl">Order ID</span><span class="val gold">${order_id||'—'}</span></div>
    <div class="row"><span class="lbl">Payment ID</span><span class="val">${payment_id||'—'}</span></div>
    <div class="row"><span class="lbl">Status</span><span class="val" style="color:${done?'#2ecc71':'#D4AF37'}">${payment_status}</span></div>
    <div class="row"><span class="lbl">Order Value</span><span class="val gold">$${price_amount} ${(price_currency||'USD').toUpperCase()}</span></div>
    <div class="row"><span class="lbl">BTC Required</span><span class="val">${pay_amount} ${(pay_currency||'BTC').toUpperCase()}</span></div>
    <div class="row"><span class="lbl">BTC Received</span><span class="val ${Number(actually_paid)>0?'green':''}">${actually_paid||'0'} ${(pay_currency||'BTC').toUpperCase()}</span></div>
    ${outcome_amount ? `<div class="row"><span class="lbl">Outcome</span><span class="val gold">${outcome_amount} ${(outcome_currency||'').toUpperCase()}</span></div>` : ''}
    <div class="row"><span class="lbl">Pay-in Address</span><span class="val" style="font-size:10px;word-break:break-all">${pay_address||'—'}</span></div>
    <div class="row"><span class="lbl">Description</span><span class="val" style="font-size:11px">${order_description||'—'}</span></div>
    <div class="row"><span class="lbl">Updated</span><span class="val">${updated_at||new Date().toISOString()}</span></div>
  </div>
  <div class="foot">AVA Jewelry · Auto Payment Alert · avajewelry.vercel.app</div>
</div>
</body></html>`;

      try {
        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${resendKey}`,
          },
          body: JSON.stringify({
            from:    'AVA Payments <onboarding@resend.dev>',
            to:      [notifyEmail],
            subject: `${emoji} ${label} — Order ${order_id} · $${price_amount}`,
            html,
          }),
        });
        if (emailRes.ok) {
          console.log('[IPN] Email sent for status:', payment_status);
        } else {
          const e = await emailRes.json().catch(()=>({}));
          console.error('[IPN] Email failed:', e);
        }
      } catch (emailErr) {
        console.error('[IPN] Email error:', emailErr.message);
        // Don't fail — always return 200 to NOWPayments regardless
      }
    }

    // ── 4. Always return 200 so NOWPayments stops retrying ───────────────
    return res.status(200).json({
      received:       true,
      payment_id,
      order_id,
      payment_status,
    });

  } catch (err) {
    console.error('[IPN] Handler error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}