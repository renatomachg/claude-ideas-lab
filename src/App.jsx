import { useState, useEffect, useCallback } from "react";

// ─── Supabase config ──────────────────────────────────────────────────
const SB_URL  = "https://qeelvcpfayknmfuspltt.supabase.co";
const SB_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlZWx2Y3BmYXlrbm1mdXNwbHR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0OTY2NzYsImV4cCI6MjA5NTA3MjY3Nn0.BW-hAQLrTv5vhNQHCnDNqIW0kUHhIQgHtOeMoOBl-vg";
const USER_KEY = "renato"; // identificador fijo

const sb = async (method, path, body) => {
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "apikey": SB_KEY,
      "Authorization": `Bearer ${SB_KEY}`,
      "Prefer": method === "POST" ? "return=representation" : "return=representation",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
};

const dbLoad  = ()        => sb("GET",    `ideas?user_key=eq.${USER_KEY}&order=created_at.desc`);
const dbInsert = (row)    => sb("POST",   `ideas`, row);
const dbUpdate = (id, patch) => sb("PATCH", `ideas?id=eq.${id}`, patch);
const dbDelete = (id)     => sb("DELETE", `ideas?id=eq.${id}`);

// ─── Design tokens ────────────────────────────────────────────────────
const C = {
  bg: "#EDEAE4", surface: "#FFFFFF",
  navy: "#2A3875", orange: "#F47648", yellow: "#F5C757",
  green: "#4CAF82", rose: "#F4787A", salmon: "#F4A07A",
  text: "#1A1A2E", muted: "#9B9B9B", pill: "#E8E4DE",
};

const VENTURES = ["Mercasync","Maker Home","Holadiseño","Kyoszen","Personal","Inversión"];
const TYPES    = ["Artifact","API","Agente","MCP","Claude Code","Workflow","Automatización","Otro"];
const STATUSES = ["Idea","En desarrollo","Pausado","Listo"];

const VENTURE_META = {
  "Mercasync":  { cat: C.navy,     catBg: "#E8ECF8", avatar: C.navy,    emoji: "M" },
  "Maker Home": { cat: C.orange,   catBg: "#FEF0EA", avatar: C.orange,  emoji: "H" },
  "Holadiseño": { cat: "#7B5EA7",  catBg: "#F2EDF9", avatar: "#B39DDB", emoji: "D" },
  "Kyoszen":    { cat: C.green,    catBg: "#E8F5EE", avatar: C.green,   emoji: "K" },
  "Personal":   { cat: C.rose,     catBg: "#FEF0F0", avatar: C.salmon,  emoji: "P" },
  "Inversión":  { cat: "#B8860B",  catBg: "#FBF7E8", avatar: C.yellow,  emoji: "I" },
};

const STATUS_META = {
  "Idea":          { color: "#B8860B", bg: "#FBF7E8" },
  "En desarrollo": { color: C.navy,    bg: "#E8ECF8" },
  "Pausado":       { color: C.muted,   bg: "#F0F0F0" },
  "Listo":         { color: C.green,   bg: "#E8F5EE" },
};

const genId   = () => `i_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
const fmtDate = (iso) => new Date(iso).toLocaleDateString("es-MX", { day:"2-digit", month:"short" });

// ─── Components ───────────────────────────────────────────────────────
const Blob = () => (
  <div style={{ position:"relative", width:"100%", height:"160px", borderRadius:"20px", overflow:"hidden", background:"#f5f3ee", marginBottom:"20px" }}>
    <svg viewBox="0 0 400 160" style={{ position:"absolute", inset:0, width:"100%", height:"100%" }} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="g1" cx="60%" cy="70%" r="60%"><stop offset="0%" stopColor="#F47648" stopOpacity="0.9"/><stop offset="40%" stopColor="#F5C757" stopOpacity="0.7"/><stop offset="100%" stopColor="#F5C757" stopOpacity="0"/></radialGradient>
        <radialGradient id="g2" cx="30%" cy="60%" r="50%"><stop offset="0%" stopColor="#2A3875" stopOpacity="0.85"/><stop offset="60%" stopColor="#5B6FBB" stopOpacity="0.4"/><stop offset="100%" stopColor="#5B6FBB" stopOpacity="0"/></radialGradient>
        <radialGradient id="g3" cx="75%" cy="30%" r="40%"><stop offset="0%" stopColor="#F47090" stopOpacity="0.6"/><stop offset="100%" stopColor="#F47090" stopOpacity="0"/></radialGradient>
      </defs>
      <ellipse cx="240" cy="110" rx="220" ry="120" fill="url(#g1)"/>
      <ellipse cx="120" cy="90"  rx="180" ry="100" fill="url(#g2)"/>
      <ellipse cx="300" cy="50"  rx="140" ry="80"  fill="url(#g3)"/>
    </svg>
    <div style={{ position:"absolute", top:"28px", left:"24px" }}>
      <div style={{ fontSize:"11px", letterSpacing:"1.5px", color:"rgba(26,26,46,0.55)", fontWeight:"600", marginBottom:"4px" }}>HOLA RENATO!</div>
      <div style={{ fontSize:"20px", fontWeight:"700", color:C.text, lineHeight:1.25 }}>¿En qué idea<br/>trabajamos hoy?</div>
    </div>
    <div style={{ position:"absolute", top:"12px", right:"16px", background:"rgba(255,255,255,0.6)", backdropFilter:"blur(8px)", borderRadius:"100px", padding:"5px 12px", fontSize:"10px", fontWeight:"700", color:C.navy, letterSpacing:"0.5px" }}>
      ☁ SINCRONIZADO
    </div>
  </div>
);

const CatTag = ({ label, color, bg }) => (
  <span style={{ display:"inline-block", padding:"3px 10px", borderRadius:"100px", background:bg, color:color, fontSize:"10px", fontWeight:"700", letterSpacing:"0.8px", textTransform:"uppercase" }}>{label}</span>
);

const Avatar = ({ letter, color }) => (
  <div style={{ width:"44px", height:"44px", borderRadius:"14px", background:color+"30", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"16px", fontWeight:"700", color, flexShrink:0 }}>{letter}</div>
);

const FilterPill = ({ label, active, color, bg, onClick }) => (
  <button onClick={onClick} style={{ padding:"7px 16px", borderRadius:"100px", background:active ? (bg || C.navy) : C.pill, color:active ? (color || "#fff") : C.muted, border:"none", cursor:"pointer", fontSize:"12px", fontWeight:"600", transition:"all 0.18s", whiteSpace:"nowrap" }}>{label}</button>
);

const Spinner = ({ size = 14, color = "#fff" }) => (
  <div style={{ width:size, height:size, border:`2px solid ${color}30`, borderTopColor:color, borderRadius:"50%", animation:"spin 1s linear infinite", flexShrink:0 }} />
);

// ─── Analysis Panel ───────────────────────────────────────────────────
const VERDICT_STYLE = {
  "🔥 Alta prioridad": { bg: "#FEF0EA", color: C.orange,  border: "#F4764840" },
  "⚡ Vale la pena":   { bg: "#E8ECF8", color: C.navy,    border: "#2A387540" },
  "🤔 Hay que pensarlo":{ bg: "#FBF7E8", color: "#B8860B", border: "#B8860B40" },
  "⚠️ Cuidado":        { bg: "#FEF0F0", color: C.rose,    border: "#F4787A40" },
};

const Section = ({ title, children, accent }) => (
  <div style={{ marginBottom:"16px" }}>
    <div style={{ display:"flex", alignItems:"center", gap:"7px", marginBottom:"8px" }}>
      <div style={{ width:"3px", height:"14px", borderRadius:"2px", background: accent || C.navy }} />
      <span style={{ fontSize:"10px", fontWeight:"700", letterSpacing:"1px", color: accent || C.navy, textTransform:"uppercase" }}>{title}</span>
    </div>
    {children}
  </div>
);

const AnalysisPanel = ({ raw }) => {
  let data = {};
  try { data = JSON.parse(raw); } catch { data = { error: raw }; }

  if (data.error) return (
    <div style={{ marginTop:"14px", background:C.bg, borderRadius:"16px", padding:"16px" }}>
      <p style={{ fontSize:"13px", color:C.muted }}>{data.error}</p>
    </div>
  );

  const verdictKey = Object.keys(VERDICT_STYLE).find(k => data.verdict?.includes(k.split(" ").slice(1).join(" "))) || Object.keys(VERDICT_STYLE)[1];
  const vs = VERDICT_STYLE[verdictKey] || VERDICT_STYLE["⚡ Vale la pena"];

  return (
    <div className="fade" style={{ marginTop:"14px", background:C.bg, borderRadius:"20px", padding:"20px", border:`1px solid ${C.pill}` }}>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"16px" }}>
        <div style={{ width:"28px", height:"28px", borderRadius:"9px", background:C.navy, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"13px", color:"#fff", fontWeight:"700" }}>✦</div>
        <span style={{ fontSize:"13px", fontWeight:"700", color:C.text }}>Análisis de Claude</span>
      </div>

      {/* Verdict badge */}
      {data.verdict && (
        <div style={{ display:"inline-flex", alignItems:"center", padding:"7px 14px", borderRadius:"100px", background:vs.bg, border:`1.5px solid ${vs.border}`, marginBottom:"14px" }}>
          <span style={{ fontSize:"13px", fontWeight:"700", color:vs.color }}>{data.verdict}</span>
        </div>
      )}

      {/* Resumen */}
      {data.resumen && (
        <Section title="Lectura honesta" accent={vs.color}>
          <p style={{ fontSize:"13px", color:"#4A3F36", lineHeight:"1.75", fontWeight:"500" }}>{data.resumen}</p>
        </Section>
      )}

      {/* Oportunidad */}
      {data.oportunidad && (
        <Section title="Oportunidad real" accent={C.green}>
          <p style={{ fontSize:"13px", color:"#4A3F36", lineHeight:"1.75" }}>{data.oportunidad}</p>
        </Section>
      )}

      {/* Riesgos */}
      {data.riesgos?.length > 0 && (
        <Section title="Riesgos a considerar" accent={C.rose}>
          <div style={{ display:"flex", flexDirection:"column", gap:"6px" }}>
            {data.riesgos.map((r, i) => (
              <div key={i} style={{ display:"flex", gap:"8px", alignItems:"flex-start" }}>
                <span style={{ fontSize:"12px", color:C.rose, marginTop:"1px", flexShrink:0 }}>⚠</span>
                <span style={{ fontSize:"13px", color:"#4A3F36", lineHeight:"1.6" }}>{r}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Stack */}
      {data.stack && (
        <Section title="Stack sugerido" accent={C.navy}>
          <div style={{ display:"flex", gap:"6px", flexWrap:"wrap", marginBottom:"8px" }}>
            {data.stack.herramientas?.map((h, i) => (
              <span key={i} style={{ padding:"5px 12px", borderRadius:"100px", background:"#fff", border:`1px solid ${C.pill}`, fontSize:"11px", fontWeight:"600", color:C.navy }}>{h}</span>
            ))}
          </div>
          {data.stack.por_que && <p style={{ fontSize:"12px", color:C.muted, lineHeight:"1.6", marginTop:"6px" }}>{data.stack.por_que}</p>}
        </Section>
      )}

      {/* Roadmap */}
      {data.roadmap?.length > 0 && (
        <Section title="Roadmap de ejecución" accent="#7B5EA7">
          <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
            {data.roadmap.map((fase, fi) => (
              <div key={fi} style={{ background:"#fff", borderRadius:"14px", padding:"14px 16px", border:`1px solid ${C.pill}` }}>
                <div style={{ fontSize:"11px", fontWeight:"700", color:"#7B5EA7", letterSpacing:"0.3px", marginBottom:"8px" }}>{fase.fase}</div>
                <div style={{ display:"flex", flexDirection:"column", gap:"5px" }}>
                  {fase.acciones?.map((a, ai) => (
                    <div key={ai} style={{ display:"flex", gap:"8px", alignItems:"flex-start" }}>
                      <span style={{ fontSize:"11px", color:"#7B5EA7", marginTop:"2px", flexShrink:0 }}>→</span>
                      <span style={{ fontSize:"12px", color:"#4A3F36", lineHeight:"1.6" }}>{a}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Primera acción */}
      {data.primera_accion && (
        <div style={{ background: C.navy, borderRadius:"16px", padding:"16px", marginBottom:"14px" }}>
          <div style={{ fontSize:"10px", fontWeight:"700", letterSpacing:"1px", color:"rgba(255,255,255,0.6)", marginBottom:"6px" }}>PRIMER PASO HOY</div>
          <p style={{ fontSize:"13px", color:"#fff", lineHeight:"1.7", fontWeight:"500" }}>{data.primera_accion}</p>
        </div>
      )}

      {/* Pregunta estratégica */}
      {data.pregunta && (
        <div style={{ background:"#fff", borderRadius:"16px", padding:"16px", border:`1.5px solid ${C.yellow}60` }}>
          <div style={{ fontSize:"10px", fontWeight:"700", letterSpacing:"1px", color:C.yellow, marginBottom:"6px" }}>PREGUNTA ESTRATÉGICA</div>
          <p style={{ fontSize:"13px", color:"#4A3F36", lineHeight:"1.7", fontStyle:"italic" }}>"{data.pregunta}"</p>
        </div>
      )}
    </div>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────
export default function App() {
  const [ideas, setIdeas]           = useState([]);
  const [venture, setVenture]       = useState("Todos");
  const [statusF, setStatusF]       = useState("Todos");
  const [search, setSearch]         = useState("");
  const [tab, setTab]               = useState("home");
  const [expandedId, setExpandedId] = useState(null);
  const [loadingAI, setLoadingAI]   = useState(null);
  const [syncing, setSyncing]       = useState(false);
  const [syncErr, setSyncErr]       = useState(null);
  const [form, setForm]             = useState({ title:"", description:"", venture:"Mercasync", type:"Artifact", status:"Idea" });

  // ── Load from Supabase ────────────────────────────────────────────
  const load = useCallback(async () => {
    setSyncing(true); setSyncErr(null);
    try {
      const rows = await dbLoad();
      setIdeas(rows.map(r => ({
        id: r.id, title: r.title, description: r.description,
        venture: r.venture, type: r.type, status: r.status,
        createdAt: r.created_at, expansion: r.expansion || "",
      })));
    } catch (e) { setSyncErr("No se pudo conectar con Supabase"); }
    setSyncing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Save new idea ─────────────────────────────────────────────────
  const save = async () => {
    if (!form.title.trim()) return;
    const row = { id: genId(), title: form.title, description: form.description, venture: form.venture, type: form.type, status: form.status, expansion: "", user_key: USER_KEY };
    // Optimistic
    setIdeas(p => [{ ...row, createdAt: new Date().toISOString() }, ...p]);
    setForm({ title:"", description:"", venture:"Mercasync", type:"Artifact", status:"Idea" });
    setTab("home");
    try { await dbInsert(row); } catch { setSyncErr("Error guardando en Supabase"); }
  };

  // ── Delete ────────────────────────────────────────────────────────
  const del = async (id) => {
    setIdeas(p => p.filter(i => i.id !== id));
    if (expandedId === id) setExpandedId(null);
    try { await dbDelete(id); } catch { setSyncErr("Error eliminando"); }
  };

  // ── Cycle status ──────────────────────────────────────────────────
  const cycleStatus = async (idea) => {
    const idx = STATUSES.indexOf(idea.status);
    const next = STATUSES[(idx + 1) % STATUSES.length];
    setIdeas(p => p.map(i => i.id === idea.id ? { ...i, status: next } : i));
    try { await dbUpdate(idea.id, { status: next }); } catch { setSyncErr("Error actualizando estado"); }
  };

  // ── Expand with AI ────────────────────────────────────────────────
  const expand = async (idea) => {
    if (expandedId === idea.id) { setExpandedId(null); return; }
    setExpandedId(idea.id);
    if (idea.expansion) return;
    setLoadingAI(idea.id);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({
          model:"claude-sonnet-4-20250514", max_tokens:2000,
          system:`Eres el co-fundador estratégico y técnico de Renato. Renato es Director de Operaciones de Mercasync (ERP/distribución en México), fundador de Maker Home (smart home, trabaja con Maya su asistente IA de WhatsApp), Holadiseño (agencia de diseño), Kyoszen (reclutamiento), y tiene intereses en inversiones. Tiene experiencia técnica real: usa Claude, Supabase, automatizaciones, n8n, y construye productos digitales.

Cuando Renato te comparte una idea, tu trabajo es analizarla en profundidad como si fueras su socio más inteligente. Sé honesto, directo, y opinionado. No des respuestas genéricas.

Responde SIEMPRE en este formato JSON exacto, sin texto adicional antes ni después:

{
  "verdict": "🔥 Alta prioridad | ⚡ Vale la pena | 🤔 Hay que pensarlo | ⚠️ Cuidado",
  "resumen": "Tu lectura honesta de la idea en 2-3 oraciones. Sé directo. Di si te parece buena o no y por qué.",
  "oportunidad": "Qué problema real resuelve o qué valor crea. Sé específico para el contexto de Renato.",
  "riesgos": ["riesgo 1 concreto", "riesgo 2 concreto", "riesgo 3 concreto"],
  "stack": {
    "herramientas": ["herramienta 1", "herramienta 2", "herramienta 3"],
    "por_que": "Justificación técnica de por qué ese stack para esta idea específica."
  },
  "roadmap": [
    { "fase": "Fase 1 — Validar (1-2 días)", "acciones": ["acción concreta 1", "acción concreta 2"] },
    { "fase": "Fase 2 — Construir (1-2 semanas)", "acciones": ["acción concreta 1", "acción concreta 2", "acción concreta 3"] },
    { "fase": "Fase 3 — Lanzar y medir (semana 3+)", "acciones": ["acción concreta 1", "acción concreta 2"] }
  ],
  "primera_accion": "La UNA cosa más concreta que Renato puede hacer HOY para avanzar esta idea. Sin excusas.",
  "pregunta": "Una pregunta estratégica que Renato debería responder antes de invertir más tiempo en esto."
}`,
          messages:[{ role:"user", content:`Idea: ${idea.title}\nDescripción: ${idea.description}\nVenture: ${idea.venture}\nTipo: ${idea.type}` }]
        })
      });
      const d = await res.json();
      const raw = d.content?.find(b => b.type==="text")?.text || "{}";
      // Store raw JSON string
      const cleaned = raw.replace(/```json|```/g, "").trim();
      setIdeas(p => p.map(i => i.id===idea.id ? { ...i, expansion: cleaned } : i));
      await dbUpdate(idea.id, { expansion: cleaned });
    } catch {
      setIdeas(p => p.map(i => i.id===idea.id ? { ...i, expansion: '{"error": "Error al conectar con Claude."}' } : i));
    }
    setLoadingAI(null);
  };

  const filtered = ideas.filter(i =>
    (venture==="Todos" || i.venture===venture) &&
    (statusF==="Todos" || i.status===statusF) &&
    (!search || i.title.toLowerCase().includes(search.toLowerCase()) || i.description.toLowerCase().includes(search.toLowerCase()))
  );

  const counts = STATUSES.reduce((a,s) => { a[s]=ideas.filter(i=>i.status===s).length; return a; }, {});

  return (
    <div style={{ minHeight:"100vh", background:C.bg, fontFamily:"'DM Sans', system-ui, sans-serif", paddingBottom:"90px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        ::-webkit-scrollbar { display:none; }
        input,textarea,select { outline:none; font-family:inherit; }
        input::placeholder,textarea::placeholder { color:#C0B8B0; }
        .card { transition:transform 0.2s, box-shadow 0.2s; }
        .card:hover { transform:translateY(-3px); box-shadow:0 16px 48px rgba(0,0,0,0.10) !important; }
        .tap { transition:transform 0.12s, opacity 0.12s; }
        .tap:active { transform:scale(0.96); opacity:0.8; }
        .fade { animation:fadeIn 0.3s ease; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>

      <div style={{ maxWidth:"480px", margin:"0 auto", padding:"0 18px" }}>

        {/* Header */}
        <div style={{ padding:"52px 0 20px", display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontSize:"26px", fontWeight:"700", color:C.text, letterSpacing:"-0.5px", lineHeight:1.2 }}>Ideas Lab</div>
            <div style={{ display:"flex", alignItems:"center", gap:"8px", marginTop:"4px" }}>
              <div style={{ fontSize:"13px", color:C.muted }}>{ideas.length} ideas · {filtered.length} visibles</div>
              {syncing && (
                <div style={{ display:"flex", alignItems:"center", gap:"4px" }}>
                  <Spinner size={10} color={C.navy} />
                  <span style={{ fontSize:"11px", color:C.navy, fontWeight:"600" }}>Sincronizando...</span>
                </div>
              )}
              {!syncing && !syncErr && ideas.length > 0 && (
                <span style={{ fontSize:"11px", color:C.green, fontWeight:"600" }}>✓ Sincronizado</span>
              )}
            </div>
            {syncErr && <div style={{ fontSize:"11px", color:C.rose, marginTop:"3px" }}>⚠ {syncErr}</div>}
          </div>
          <button className="tap" onClick={() => setTab(tab==="new" ? "home" : "new")} style={{
            background: tab==="new" ? C.pill : C.text, color: tab==="new" ? C.muted : "#fff",
            border:"none", borderRadius:"100px", padding:"11px 22px", fontSize:"13px", fontWeight:"600", cursor:"pointer",
          }}>{tab==="new" ? "Cancelar" : "+ Nueva"}</button>
        </div>

        {/* Blob */}
        {tab==="home" && <Blob />}

        {/* Status summary */}
        {tab==="home" && (
          <div style={{ display:"flex", gap:"8px", marginBottom:"20px", flexWrap:"wrap" }}>
            {STATUSES.map(s => {
              const m = STATUS_META[s];
              return (
                <button key={s} className="tap" onClick={() => setStatusF(statusF===s ? "Todos" : s)} style={{
                  display:"flex", alignItems:"center", gap:"6px",
                  padding:"7px 14px", borderRadius:"100px",
                  background: statusF===s ? m.bg : C.surface,
                  border: `1.5px solid ${statusF===s ? m.color+"40" : "transparent"}`,
                  cursor:"pointer", boxShadow:"0 1px 4px rgba(0,0,0,0.06)",
                }}>
                  <div style={{ width:"7px", height:"7px", borderRadius:"50%", background:m.color }} />
                  <span style={{ fontSize:"12px", fontWeight:"600", color:statusF===s ? m.color : C.muted }}>{s}</span>
                  <span style={{ fontSize:"12px", fontWeight:"700", color:statusF===s ? m.color : C.text }}>{counts[s]}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* New idea form */}
        {tab==="new" && (
          <div className="fade" style={{ background:C.surface, borderRadius:"24px", padding:"24px", marginBottom:"20px", boxShadow:"0 4px 20px rgba(0,0,0,0.07)" }}>
            <div style={{ fontSize:"18px", fontWeight:"700", color:C.text, marginBottom:"18px" }}>Nueva idea</div>
            <input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="Título de la idea..."
              style={{ width:"100%", background:C.bg, border:"none", borderRadius:"14px", padding:"13px 16px", color:C.text, fontSize:"15px", fontWeight:"600", marginBottom:"10px" }}
            />
            <textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Descripción breve..." rows={3}
              style={{ width:"100%", background:C.bg, border:"none", borderRadius:"14px", padding:"13px 16px", color:"#5A4E45", fontSize:"13px", marginBottom:"16px", resize:"vertical", lineHeight:"1.6" }}
            />
            {[
              { label:"Venture", key:"venture", opts:VENTURES },
              { label:"Tipo",    key:"type",    opts:TYPES    },
              { label:"Estado",  key:"status",  opts:STATUSES },
            ].map(({ label, key, opts }) => (
              <div key={key} style={{ marginBottom:"12px" }}>
                <div style={{ fontSize:"11px", fontWeight:"600", color:C.muted, letterSpacing:"0.5px", marginBottom:"5px" }}>{label.toUpperCase()}</div>
                <div style={{ display:"flex", gap:"7px", flexWrap:"wrap" }}>
                  {opts.map(o => (
                    <button key={o} className="tap" onClick={() => setForm(f=>({...f,[key]:o}))} style={{
                      padding:"7px 15px", borderRadius:"100px",
                      background: form[key]===o ? C.text : C.bg,
                      color: form[key]===o ? "#fff" : C.muted,
                      border:"none", cursor:"pointer", fontSize:"12px", fontWeight:"600",
                    }}>{o}</button>
                  ))}
                </div>
              </div>
            ))}
            <button className="tap" onClick={save} style={{
              marginTop:"8px", width:"100%", background:C.navy, color:"#fff",
              border:"none", borderRadius:"100px", padding:"14px", fontSize:"14px", fontWeight:"700", cursor:"pointer",
            }}>Guardar en la nube ☁</button>
          </div>
        )}

        {/* Search */}
        {tab==="home" && (
          <div style={{ position:"relative", marginBottom:"16px" }}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar ideas..."
              style={{ width:"100%", background:C.surface, border:"none", borderRadius:"100px", padding:"13px 20px 13px 46px", color:C.text, fontSize:"13px", boxShadow:"0 2px 12px rgba(0,0,0,0.07)" }}
            />
            <span style={{ position:"absolute", left:"17px", top:"50%", transform:"translateY(-50%)", fontSize:"17px", color:"#C0B8B0" }}>⌕</span>
            <button className="tap" onClick={load} style={{ position:"absolute", right:"8px", top:"50%", transform:"translateY(-50%)", width:"34px", height:"34px", borderRadius:"50%", background:C.navy, border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"13px" }}>
              {syncing ? <Spinner size={12} color="#fff" /> : "↻"}
            </button>
          </div>
        )}

        {/* Venture filters */}
        {tab==="home" && (
          <div style={{ display:"flex", gap:"8px", overflowX:"auto", paddingBottom:"4px", marginBottom:"20px", scrollbarWidth:"none" }}>
            {["Todos",...VENTURES].map(v => {
              const m = VENTURE_META[v];
              return <FilterPill key={v} label={v} active={venture===v} color={m ? "#fff" : C.text} bg={m ? m.cat : C.text} onClick={() => setVenture(v)} />;
            })}
          </div>
        )}

        {/* Cards */}
        {tab==="home" && (
          filtered.length===0 ? (
            <div style={{ textAlign:"center", padding:"60px 0", color:C.muted }}>
              <div style={{ fontSize:"40px", marginBottom:"10px" }}>💡</div>
              <div style={{ fontWeight:"700", fontSize:"16px", color:C.text }}>{syncing ? "Cargando ideas..." : "Sin ideas aquí"}</div>
              <div style={{ fontSize:"13px", marginTop:"5px" }}>{syncing ? "" : "Cambia el filtro o crea una nueva"}</div>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
              {filtered.map(idea => {
                const vm  = VENTURE_META[idea.venture] || VENTURE_META["Personal"];
                const sm  = STATUS_META[idea.status];
                const isExp  = expandedId===idea.id;
                const isLoad = loadingAI===idea.id;

                return (
                  <div key={idea.id} className="card fade" style={{ background:C.surface, borderRadius:"22px", overflow:"hidden", boxShadow:"0 2px 14px rgba(0,0,0,0.06)" }}>
                    <div style={{ padding:"20px 20px 18px" }}>

                      {/* Top row */}
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"12px" }}>
                        <CatTag label={idea.venture} color={vm.cat} bg={vm.catBg} />
                        <button onClick={() => del(idea.id)} style={{ background:"none", border:"none", color:"#D4CEC8", fontSize:"20px", cursor:"pointer", lineHeight:1, padding:"0 2px", transition:"color 0.15s" }}
                          onMouseEnter={e=>e.target.style.color=C.orange}
                          onMouseLeave={e=>e.target.style.color="#D4CEC8"}
                        >×</button>
                      </div>

                      {/* Title + avatar */}
                      <div style={{ display:"flex", gap:"12px", alignItems:"flex-start" }}>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:"17px", fontWeight:"700", color:C.text, lineHeight:1.35, marginBottom:"6px" }}>{idea.title}</div>
                          {idea.description && <div style={{ fontSize:"12px", color:C.muted, lineHeight:1.6 }}>{idea.description}</div>}
                        </div>
                        <Avatar letter={vm.emoji} color={vm.cat} />
                      </div>

                      {/* Bottom chips */}
                      <div style={{ display:"flex", alignItems:"center", gap:"8px", marginTop:"16px", flexWrap:"wrap" }}>
                        <span style={{ padding:"4px 10px", borderRadius:"100px", background:C.bg, color:C.muted, fontSize:"11px", fontWeight:"600" }}>{idea.type}</span>
                        <button className="tap" onClick={() => cycleStatus(idea)} style={{ padding:"4px 12px", borderRadius:"100px", background:sm.bg, color:sm.color, border:"none", cursor:"pointer", fontSize:"11px", fontWeight:"700" }}>{idea.status}</button>
                        <span style={{ fontSize:"11px", color:"#C0B8B0", marginLeft:"auto" }}>{fmtDate(idea.createdAt)}</span>
                      </div>

                      {/* Expand btn */}
                      <button className="tap" onClick={() => expand(idea)} style={{
                        marginTop:"14px", width:"100%",
                        background: isExp ? C.bg : C.navy,
                        color: isExp ? C.muted : "#fff",
                        border:"none", borderRadius:"100px", padding:"11px",
                        fontSize:"13px", fontWeight:"700", cursor:"pointer",
                        display:"flex", alignItems:"center", justifyContent:"center", gap:"8px",
                      }}>
                        {isLoad ? <><Spinner /> Pensando...</> : isExp ? "Cerrar análisis" : "✦ Expandir con Claude"}
                      </button>

                      {/* AI expansion */}
                      {isExp && !isLoad && idea.expansion && (
                        <AnalysisPanel raw={idea.expansion} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

      {/* Bottom nav */}
      <div style={{ position:"fixed", bottom:0, left:0, right:0, background:C.surface, borderTop:`1px solid ${C.bg}`, boxShadow:"0 -4px 24px rgba(0,0,0,0.06)" }}>
        <div style={{ maxWidth:"480px", margin:"0 auto", display:"flex", justifyContent:"space-around", padding:"10px 20px 16px" }}>
          {[
            { id:"home", icon:"⊙", label:"Home"  },
            { id:"inbox", icon:"◻", label:"Inbox" },
            { id:"new",   icon:"＋", label:"Nueva" },
            { id:"data",  icon:"⌗", label:"Data"  },
          ].map(n => {
            const active = tab===n.id;
            return (
              <button key={n.id} className="tap" onClick={() => setTab(n.id)} style={{
                background: active ? C.navy : "transparent", color: active ? "#fff" : C.muted,
                border:"none", borderRadius:"100px", padding:"8px 20px", cursor:"pointer",
                display:"flex", flexDirection:"column", alignItems:"center", gap:"2px", transition:"all 0.18s",
              }}>
                <span style={{ fontSize:"16px" }}>{n.icon}</span>
                <span style={{ fontSize:"10px", fontWeight:"600", letterSpacing:"0.3px" }}>{n.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
