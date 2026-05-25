export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_KEY) {
    return res.status(500).json({ error: "Falta ANTHROPIC_API_KEY en variables de entorno" });
  }

  const { system, messages, max_tokens = 2000, model = "claude-sonnet-4-20250514" } = req.body || {};

  if (!messages) {
    return res.status(400).json({ error: "Falta campo messages" });
  }

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model, max_tokens, system, messages }),
    });
    const d = await r.json();
    return res.status(r.status).json(d);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
