export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const BRAVE_KEY = process.env.BRAVE_API_KEY;
  if (!BRAVE_KEY) {
    return res.status(500).json({ error: "Falta BRAVE_API_KEY en variables de entorno" });
  }

  const query = req.method === "POST" ? req.body?.query : req.query?.q;
  const count = req.query?.count || req.body?.count || 6;

  if (!query) {
    return res.status(400).json({ error: "Falta parámetro query" });
  }

  try {
    const r = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${count}&search_lang=en`,
      { headers: { "Accept": "application/json", "X-Subscription-Token": BRAVE_KEY } }
    );
    const d = await r.json();
    const results = (d.web?.results || []).map(x => ({
      title: x.title,
      url: x.url,
      desc: x.description || "",
    }));
    return res.status(200).json({ results });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
