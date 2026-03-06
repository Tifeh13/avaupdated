// api/orders.js — AVA Jewelry · Cloud Order Storage
export const config = { api: { bodyParser: true, maxDuration: 15 } };

const KV_URL   = process.env.KV_REST_API_URL   || 'https://neat-lizard-46999.upstash.io';
const KV_TOKEN = process.env.KV_REST_API_TOKEN || 'AbeXAAIncDI1MDgzZGU1MjRmOWI0YjYzODQyZTBiMjc4ZDI0OGFmMXAyNDY5OTk';

async function kvGet(key) {
  const res = await fetch(`${KV_URL}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` }
  });
  const data = await res.json();
  if (!data.result) return [];
  // result can be a string (needs parsing) or already an object
  const parsed = typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
  return Array.isArray(parsed) ? parsed : [];
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

  // GET — fetch all orders for admin
  if (req.method === 'GET') {
    try {
      const orders = await kvGet('ava_orders');
      return res.status(200).json({ orders });
    } catch (err) {
      console.error('GET orders error:', err);
      return res.status(500).json({ error: 'Failed to fetch orders', orders: [] });
    }
  }

  // POST — save new order from customer checkout
  if (req.method === 'POST') {
    try {
      const order = req.body;
      if (!order || !order.id) return res.status(400).json({ error: 'Invalid order' });

      const existing = await kvGet('ava_orders'); // always returns array now
      existing.unshift(order);
      if (existing.length > 500) existing.splice(500);
      await kvSet('ava_orders', existing);

      console.log('ORDER_SAVED:', order.id, '$' + order.total);
      return res.status(200).json({ ok: true, id: order.id });
    } catch (err) {
      console.error('POST order error:', err);
      return res.status(500).json({ error: 'Failed to save order' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}