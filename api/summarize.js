// This function calls Google Gemini API to summarize an article
export default async function handler(req, res) {
  const { title, description } = req.query;

  if (!title) {
    return res.status(400).json({ error: 'Missing title parameter' });
  }

  // Build the prompt we send to Gemini
  const prompt = `Summarize this news article in exactly 2 short sentences:\nTitle: ${title}\nDescription: ${description || ''}`;

  try {
    // Call the Gemini API using the secret key stored in Vercel
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    const data = await response.json();

    // Extract the summary text from Gemini's response
    const summary = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Summary unavailable';
    res.status(200).json({ summary });

  } catch (err) {
    res.status(500).json({ error: 'Gemini API failed', details: err.message });
  }
}
