export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  let titles = [];
  try {
    const body = await new Promise((resolve) => {
      let data = '';
      req.on('data', chunk => { data += chunk; });
      req.on('end', () => resolve(JSON.parse(data)));
    });
    titles = body.titles || [];
  } catch (e) {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  if (titles.length === 0) {
    return res.status(400).json({ error: 'No titles provided' });
  }

  // Send all titles to Gemini and ask it to group related ones
  const prompt = 'You are a news analyst. Group these article titles by topic similarity. Return ONLY valid JSON as an array of groups. Each group is an array of article indices (0-based). Only group articles that are clearly related. Articles that stand alone should not be grouped.\n\nArticles:\n' + titles.map((t, i) => i + '. ' + t).join('\n') + '\n\nRespond with JSON only, example format: [[0,2,5],[1,3],[4,6]]';

  const apiKey = process.env.GEMINI_API_KEY;
  const apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + apiKey;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    const cleaned = rawText.replace(/```json|```/g, '').trim();
    const groups = JSON.parse(cleaned);

    return res.status(200).json({ groups });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
