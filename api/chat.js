// api/chat.js — Vercel serverless proxy for csplaybooks.com demo

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  const allowed = [
    'https://csplaybooks.com',
    'https://www.csplaybooks.com',
    'https://smfreeney.github.io',
    'http://localhost',
    'http://127.0.0.1'
  ];

  if (allowed.some(o => origin.startsWith(o)) || !origin) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  } else {
    return res.status(403).json({ error: 'Origin not allowed' });
  }

  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight BEFORE the method check
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    console.error('Proxy error:', err);
    return res.status(500).json({ error: 'Proxy request failed' });
  }
}
