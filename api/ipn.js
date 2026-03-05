// api/ipn.js — NOWPayments IPN handler for Ava Jewelry
// Deploy this to Vercel. NOWPayments will POST to:
// https://avajewelry.vercel.app/api/ipn
//
// In NOWPayments dashboard → IPN Settings → set URL to:
// https://avajewelry.vercel.app/api/ipn

import crypto from 'crypto';

export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
  // Only accept POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const payload = req.body;

    // ── 1. Verify NOWPayments signature ──────────────────────────────
    // NOWPayments sends x-nowpayments-sig header
    const sig       = req.headers['x-nowpayments-sig'];
    const ipnSecret = process.env.NOWPAYMENTS_IPN_SECRET; // set in Vercel env vars

    if (ipnSecret && sig) {
      const sorted   = JSON.stringify(sortObjectKeys(payload));
      const expected = crypto.createHmac('sha512', ipnSecret)
                             .update(sorted)
                             .digest('hex');
      if (sig !== expected) {
        console.warn('IPN signature mismatch');
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    // ── 2. Extract payment info ───────────────────────────────────────
    const {
      payment_id,
      payment_status,   // 'waiting' | 'confirming' | 'confirmed' | 'sending' | 'partially_paid' | 'finished' | 'failed' | 'refunded' | 'expired'
      pay_address,
      price_amount,     // USD amount
      price_currency,
      pay_amount,       // crypto amount expected
      actually_paid,    // crypto amount actually received
      pay_currency,     // 'btc', 'eth', etc.
      order_id,         // the order ID we sent when creating payment
      order_description,
      outcome_amount,
      outcome_currency,
      created_at,
      updated_at,
    } = payload;

    console.log(`IPN received: payment_id=${payment_id} status=${payment_status} order=${order_id}`);

    // ── 3. Only process confirmed / finished payments ─────────────────
    // You can also process 'confirming' to show pending in admin
    const isSuccess = payment_status === 'finished' || payment_status === 'confirmed';
    const isPending = payment_status === 'confirming' || payment_status === 'partially_paid';

    // ── 4. Build order object in Ava admin format ─────────────────────
    const order = {
      id:              order_id || `AVA-NP-${payment_id}`,
      date:            new Date(created_at || Date.now()).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
      payMethod:       pay_currency?.toLowerCase() === 'btc' ? 'btc' : pay_currency?.toLowerCase() === 'eth' ? 'eth' : 'crypto',
      paymentId:       String(payment_id),
      payinAddress:    pay_address,
      cryptoAmount:    pay_amount,
      cryptoCurrency:  pay_currency?.toUpperCase(),
      cryptoPaid:      actually_paid,
      cryptoStatus:    payment_status,
      total:           Number(price_amount) || 0,
      subtotal:        Number(price_amount) || 0,
      tax:             0,
      shipping:        0,
      // Customer info will be empty from IPN — gets filled in from checkout form
      firstName:       '',
      lastName:        '',
      email:           '',
      phone:           '',
      addr1:           '',
      city:            '',
      state:           '',
      zip:             '',
      country:         '',
      items:           [],
      description:     order_description || '',
      nowpaymentsRaw:  payload, // keep full payload for reference
    };

    // ── 5. Store in Vercel KV (if available) or log for manual import ─
    // Since this is a static site with no DB, we log the order details
    // The admin will pick these up via the ₿ Check NP button
    // OR integrate Vercel KV storage below:

    // Option A: Log to console (visible in Vercel function logs)
    console.log('NEW_ORDER_IPN:', JSON.stringify(order));

    // Option B: If you add VERCEL_KV, uncomment:
    // const { kv } = await import('@vercel/kv');
    // const existing = await kv.get('ava_orders') || [];
    // const updated = [order, ...existing.filter(o => o.id !== order.id)];
    // await kv.set('ava_orders', updated);

    // ── 6. Respond 200 to acknowledge IPN ────────────────────────────
    return res.status(200).json({
      status:     'received',
      payment_id,
      order_id,
      payment_status,
      isSuccess,
      isPending,
    });

  } catch (err) {
    console.error('IPN handler error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}

// Sort object keys alphabetically (required for NOWPayments signature)
function sortObjectKeys(obj) {
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(sortObjectKeys);
  return Object.keys(obj).sort().reduce((acc, key) => {
    acc[key] = sortObjectKeys(obj[key]);
    return acc;
  }, {});
}
