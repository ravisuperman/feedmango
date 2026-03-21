// Import getCache and setCache helpers from our dedicated cache module
import { getCache, setCache } from './_cache.js';

export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  // Check if we already have a fresh copy of this feed in cache
  // If yes, return it immediately without calling the source website
  const cached = getCache(url);
  if (cached) {
    res.setHeader('X-Cache', 'HIT'); // tells you the response came from cache
    res.setHeader('Content-Type', 'application/xml');
    return res.status(200).send(cached);
  }

  try {
    const response = await fetch(url);
    const text = await response.text();

    // Save the freshly fetched feed into cache for next 10 minutes
    setCache(url, text);

    res.setHeader('X-Cache', 'MISS'); // tells you a fresh fetch was made
    res.setHeader('Content-Type', 'application/xml');
    res.status(200).send(text);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch feed', details: err.message });
  }
}
