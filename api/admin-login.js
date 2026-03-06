// api/admin-login.js
// Secure admin password check — password never exposed in browser source code
// Set ADMIN_PASSWORD in Vercel environment variables

export default function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', 'https://avajewelry.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { password } = req.body || {};

  if (!password) {
    return res.status(400).json({ ok: false, error: 'No password provided' });
  }

  const correctPassword = process.env.ADMIN_PASSWORD;

  if (!correctPassword) {
    console.error('ADMIN_PASSWORD environment variable not set');
    return res.status(500).json({ ok: false, error: 'Server misconfigured' });
  }

  if (password === correctPassword) {
    // Generate a simple session token
    const token = Buffer.from(`ava-admin:${Date.now()}:${Math.random()}`).toString('base64');
    return res.status(200).json({ ok: true, token });
  }

  return res.status(401).json({ ok: false, error: 'Incorrect password' });
}