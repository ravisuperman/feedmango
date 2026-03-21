export default async function handler(req, res) {
  const { title, description } = req.query;

  if (!title) {
    return res.status(400).json({ error: 'Missing title parameter' });
  }

  const prompt = `Summarize this news article in exactly 2 short sentences. Title: ${title}. Description: ${description || ''}`;
  const apiKey = process.env.GEMINI_API_KEY;

  // Using Gemini 2.5 Flash - the model available to this API key
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const data = await response.json();
    const summary = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (summary) {
      return res.status(200).json({ summary });
    } else {
      return res.status(200).json({ summary: 'Summary unavailable', debug: data });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
