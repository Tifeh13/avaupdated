// api/orders.js — AVA Jewelry · Cloud Order Storage
// Uses Vercel KV (free Redis database built into Vercel)
// Setup: Vercel Dashboard → Storage → Create KV Database → connect to project
// Environment variables added automatically: KV_REST_API_URL, KV_REST_API_TOKEN

export const config = { api: { bodyParser: true, maxDuration: 15 } };

const KV_URL   = process.env.KV_REST_API_URL   || 'https://neat-lizard-46999.upstash.io';
const KV_TOKEN = process.env.KV_REST_API_TOKEN || 'AbeXAAIncDI1MDgzZGU1MjRmOWI0YjYzODQyZTBiMjc4ZDI0OGFmMXAyNDY5OTk';

async function kvGet(key) {
  const res = await fetch(`${KV_URL}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` }
  });
  const data = await res.json();
  return data.result ? JSON.parse(data.result) : null;
}

async function kvSet(key, value) {
  await fetch(`${KV_URL}/set/${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(JSON.stringify(value))
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Database is always available

  // GET — admin fetches all orders
  if (req.method === 'GET') {
    try {
      const orders = await kvGet('ava_orders') || [];
      return res.status(200).json({ orders });
    } catch (err) {
      console.error('GET orders error:', err);
      return res.status(500).json({ error: 'Failed to fetch orders' });
    }
  }

  // POST — save new order from customer checkout
  if (req.method === 'POST') {
    try {
      const order = req.body;
      if (!order || !order.id) {
        return res.status(400).json({ error: 'Invalid order data' });
      }
      const existing = await kvGet('ava_orders') || [];
      existing.unshift(order);
      if (existing.length > 500) existing.splice(500);
      await kvSet('ava_orders', existing);
      console.log('ORDER_SAVED:', order.id, order.email, '$' + order.total);
      return res.status(200).json({ ok: true, id: order.id });
    } catch (err) {
      console.error('POST order error:', err);
      return res.status(500).json({ error: 'Failed to save order' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}