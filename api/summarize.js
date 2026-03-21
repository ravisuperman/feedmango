export default async function handler(req, res) {
  const { title, description } = req.query;
  if (!title) return res.status(400).json({ error: 'Missing title' });

  const prompt = 'Respond in JSON only: {"summary":"2 sentence summary","category":"Tech or Sports or Finance or Politics or Health or Entertainment or Science or World or Business or Other","sentiment":"Positive or Neutral or Negative"} Article: ' + title + ' ' + (description || '');

  const apiKey = process.env.GEMINI_API_KEY;
  const apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + apiKey;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      return res.status(200).json({ summary: 'unavailable', category: 'Other', sentiment: 'Neutral', gemini_error: data });
    }

    const cleaned = rawText.replace(/```json|```/g, '').trim();
    const result = JSON.parse(cleaned);

    return res.status(200).json({
      summary: result.summary || 'unavailable',
      category: result.category || 'Other',
      sentiment: result.sentiment || 'Neutral'
    });

  } catch (err) {
    return res.status(200).json({ summary: 'unavailable', category: 'Other', sentiment: 'Neutral', js_error: err.message });
  }
}
