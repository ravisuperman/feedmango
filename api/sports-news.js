import { createClient } from '@vercel/kv';

const kv = createClient({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN
});

const SPORTS = ['cricket', 'basketball', 'football', 'tennis', 'athletics', 'baseball'];

export default async function handler(req, res) {
  const { sport } = req.query;

  // If a specific sport is requested, return just that sport
  if (sport && SPORTS.includes(sport)) {
    const data = await kv.get('curated:' + sport);
    const articles = data ? JSON.parse(data) : [];
    return res.status(200).json({ sport, articles });
  }

  // Otherwise return all sports
  const result = {};
  for (const s of SPORTS) {
    const data = await kv.get('curated:' + s);
    result[s] = data ? JSON.parse(data) : [];
  }
  return res.status(200).json(result);
}
