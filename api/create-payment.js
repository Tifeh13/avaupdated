// api/create-payment.js — Secure NOWPayments payment creator
// API key stays on server, never exposed to browser
// Customer BTC goes to: bc1qs587y20sy0qyzdpyxtu5xfjqhj4ypv663c08wh
// (Set your payout wallet in NOWPayments → Settings → Payout Wallets)

export const config = { api: { bodyParser: true, maxDuration: 15 } };

export default async function handler(req, res) {
  // CORS headers for same-origin
  res.setHeader('Access-Control-Allow-Origin', 'https://avajewelry.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.NOWPAYMENTS_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Payment service not configured' });

  try {
    const { price_amount, order_id, customer } = req.body;

    if (!price_amount || !order_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create payment via NOWPayments — money goes directly to your BTC wallet
    const npRes = await fetch('https://api.nowpayments.io/v1/payment', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        price_amount:      Number(price_amount),
        price_currency:    'usd',
        pay_currency:      'btc',
        order_id:          order_id,
        order_description: `Ava Jewelry Order ${order_id}`,
        ipn_callback_url:  'https://avajewelry.vercel.app/api/ipn',
        success_url:       'https://avajewelry.vercel.app/ipn.html',
        cancel_url:        'https://avajewelry.vercel.app/payment.html',
        is_fixed_rate:     false,
        is_fee_paid_by_user: false
      })
    });

    const data = await npRes.json();

    if (!npRes.ok) {
      console.error('NOWPayments error:', data);
      return res.status(502).json({ error: data.message || 'Payment gateway error' });
    }

    // Log order for admin visibility
    console.log('PAYMENT_CREATED:', JSON.stringify({
      payment_id:    data.payment_id,
      order_id:      order_id,
      amount_usd:    price_amount,
      btc_amount:    data.pay_amount,
      btc_address:   data.pay_address,
      status:        data.payment_status,
      customer_email: customer?.email || '',
      customer_name:  `${customer?.firstName || ''} ${customer?.lastName || ''}`.trim(),
      created_at:    new Date().toISOString()
    }));

    // Return only what the frontend needs — no secrets
    return res.status(200).json({
      payment_id:     data.payment_id,
      pay_address:    data.pay_address,
      pay_amount:     data.pay_amount,
      pay_currency:   data.pay_currency,
      payment_status: data.payment_status,
      price_amount:   data.price_amount,
      expiration_estimate_date: data.expiration_estimate_date
    });

  } catch (err) {
    console.error('create-payment error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}