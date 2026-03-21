export default async function handler(req, res) {
  const { title, description } = req.query;
  if (!title) return res.status(400).json({ error: 'Missing title parameter' });

  // Ask Gemini for summary, category AND sentiment in one single call
  const prompt = `Analyze this news article and respond in valid JSON only, no extra text:
{
  "summary": "2 sentence summary of the article",
  "category": "one of: Tech, Sports, Finance, Politics, Health, Entertainment, Science, Other",
  "sentiment": "one of: Positive, Neutral, Negative"
}

Article Title: ${title}
Article Description: ${description || ''}`;

  const apiKey = process.env.GEMINI_API_KEY;
  const apiUrl = \`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=\${apiKey}\`;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

    // Clean the response (Gemini sometimes wraps in markdown code blocks)
    const cleaned = rawText.replace(/```json|```/g, '').trim();
    const result = JSON.parse(cleaned);

    return res.status(200).json({
      summary: result.summary || 'Summary unavailable',
      category: result.category || 'Other',
      sentiment: result.sentiment || 'Neutral'
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
