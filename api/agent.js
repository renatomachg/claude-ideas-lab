const SB_URL  = "https://qeelvcpfayknmfuspltt.supabase.co";
const SB_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlZWx2Y3BmYXlrbm1mdXNwbHR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0OTY2NzYsImV4cCI6MjA5NTA3MjY3Nn0.BW-hAQLrTv5vhNQHCnDNqIW0kUHhIQgHtOeMoOBl-vg";

function getMonday(d = new Date()) {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(new Date(d).setDate(diff)).toISOString().slice(0, 10);
}

async function braveSearch(query, key) {
  try {
    const r = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=3&search_lang=es`,
      { headers: { "Accept": "application/json", "X-Subscription-Token": key } }
    );
    const d = await r.json();
    return (d.web?.results || []).slice(0, 3).map(x => `${x.title}: ${x.description || ""}`).join("\n");
  } catch {
    return "";
  }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
  const BRAVE_KEY     = process.env.BRAVE_API_KEY;

  if (!ANTHROPIC_KEY) {
    return res.status(500).json({ error: "Falta ANTHROPIC_API_KEY en variables de entorno de Vercel" });
  }

  // ── Dedup: ya corrió esta semana? ─────────────────────────────────
  const weekStart = getMonday();
  const existing = await fetch(
    `${SB_URL}/rest/v1/agent_insights?week_start=eq.${weekStart}&select=id,ideas,sinergia,alerta,prioridad,created_at`,
    { headers: { apikey: SB_ANON, Authorization: `Bearer ${SB_ANON}` } }
  ).then(r => r.json()).catch(() => []);

  if (existing.length > 0) {
    return res.status(200).json({ cached: true, weekStart, data: existing[0] });
  }

  // ── Ideas: vienen del frontend (POST) o usamos contexto general ───
  let ideas = [];
  if (req.method === "POST" && req.body?.ideas) {
    ideas = req.body.ideas;
  } else if (process.env.SUPABASE_SERVICE_KEY) {
    const r = await fetch(`${SB_URL}/rest/v1/ideas?select=title,description,venture,status&order=created_at.desc&limit=30`, {
      headers: { apikey: process.env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}` }
    });
    ideas = await r.json().catch(() => []);
  }

  const ideasSummary = ideas.length > 0
    ? ideas.slice(0, 25).map(i => `[${i.venture}] ${i.title} (${i.status}) — ${i.description || ""}`).join("\n")
    : "Sin ideas registradas aún.";

  // ── Brave Search (paralelo, 2 queries) ───────────────────────────
  let searchCtx = "";
  if (BRAVE_KEY) {
    const [t1, t2] = await Promise.all([
      braveSearch("tendencias SaaS herramientas IA pequeñas empresas México 2025", BRAVE_KEY),
      braveSearch("oportunidades startup automatización Claude AI Supabase 2025", BRAVE_KEY),
    ]);
    searchCtx = [t1, t2].filter(Boolean).join("\n");
  }

  // ── Claude ───────────────────────────────────────────────────────
  const prompt = `Eres el co-fundador estratégico de Renato (México). Stack: Claude, Supabase, n8n. Ventures activos: Mercasync (ERP), Maker Home (smart home), Holadiseño (diseño), Kyoszen (reclutamiento).

IDEAS ACTUALES EN EL LAB:
${ideasSummary}

TENDENCIAS ESTA SEMANA:
${searchCtx || "No disponible"}

Analiza todo. Responde ÚNICAMENTE JSON válido sin markdown:
{
  "ideas": [
    {"titulo":"...","venture":"...","descripcion":"...","por_que_ahora":"..."},
    {"titulo":"...","venture":"...","descripcion":"...","por_que_ahora":"..."},
    {"titulo":"...","venture":"...","descripcion":"...","por_que_ahora":"..."}
  ],
  "sinergia": {"descripcion":"...","ventures":["...","..."],"accion":"..."},
  "alerta": {"titulo":"...","descripcion":"..."},
  "prioridad": {"titulo":"...","venture":"...","razon":"...","primer_paso":"..."}
}`;

  const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1200,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const claudeData = await claudeRes.json();
  const raw = claudeData.content?.[0]?.text || "";

  let parsed;
  try {
    parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
  } catch {
    return res.status(500).json({ error: "Parse error", raw });
  }

  // ── Guardar en Supabase ──────────────────────────────────────────
  await fetch(`${SB_URL}/rest/v1/agent_insights`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SB_ANON,
      "Authorization": `Bearer ${SB_ANON}`,
      "Prefer": "return=minimal",
    },
    body: JSON.stringify({
      week_start: weekStart,
      ideas:     parsed.ideas    || [],
      sinergia:  parsed.sinergia || null,
      alerta:    parsed.alerta   || null,
      prioridad: parsed.prioridad || null,
    }),
  });

  return res.status(200).json({ ok: true, weekStart, data: parsed });
}
