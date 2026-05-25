import { useState, useEffect, useCallback, useRef } from "react";

// ─── Supabase Auth ────────────────────────────────────────────────────
const SB_URL = "https://qeelvcpfayknmfuspltt.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlZWx2Y3BmYXlrbm1mdXNwbHR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0OTY2NzYsImV4cCI6MjA5NTA3MjY3Nn0.BW-hAQLrTv5vhNQHCnDNqIW0kUHhIQgHtOeMoOBl-vg";

// ─── Auth helpers ────────────────────────────────────────────────────
const TOKEN_KEY = "sb-qeelvcpfayknmfuspltt-auth-token";

const getToken = () => {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    if (!raw) return SB_KEY;
    return JSON.parse(raw)?.access_token || SB_KEY;
  } catch { return SB_KEY; }
};

const saveToken = (data) => {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(data));
};

const clearToken = () => localStorage.removeItem(TOKEN_KEY);

const getSession = async () => {
  try {
    const token = getToken();
    if (token === SB_KEY) return null;
    const res = await fetch(`${SB_URL}/auth/v1/user`, {
      headers: { "apikey": SB_KEY, "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
};

const signInWithGoogle = () => {
  const redirectTo = encodeURIComponent(window.location.origin + window.location.pathname);
  window.location.href = `${SB_URL}/auth/v1/authorize?provider=google&redirect_to=${redirectTo}`;
};

const signInWithEmail = async (email, password) => {
  const res = await fetch(`${SB_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "apikey": SB_KEY },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.msg || "Error al iniciar sesión");
  saveToken(data);
  return data.user;
};

const signUpWithEmail = async (email, password) => {
  const res = await fetch(`${SB_URL}/auth/v1/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "apikey": SB_KEY },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.msg || "Error al registrarse");
  if (data.access_token) saveToken(data);
  return data.user;
};

const signOut = async () => {
  try {
    await fetch(`${SB_URL}/auth/v1/logout`, {
      method: "POST",
      headers: { "apikey": SB_KEY, "Authorization": `Bearer ${getToken()}` }
    });
  } catch {}
  clearToken();
  window.location.reload();
};

const handleAuthCallback = async () => {
  const hash = window.location.hash;
  if (!hash.includes("access_token")) return false;
  const params = new URLSearchParams(hash.replace("#", ""));
  const token = params.get("access_token");
  if (token) {
    saveToken({
      access_token: token,
      refresh_token: params.get("refresh_token"),
      expires_in: parseInt(params.get("expires_in") || "3600"),
      token_type: "bearer",
    });
    window.history.replaceState({}, "", window.location.pathname);
    return true;
  }
  return false;
};

// DB helpers — now auth-aware
const sb = async (method, path, body) => {
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
    method,
    headers: { "Content-Type": "application/json", "apikey": SB_KEY, "Authorization": `Bearer ${getToken()}`, "Prefer": "return=representation" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const t = await res.text();
  return t ? JSON.parse(t) : null;
};

const dbLoad   = ()          => sb("GET",    `ideas?order=created_at.desc`);
const dbInsert = (r)         => sb("POST",   `ideas`, r);
const dbUpdate = (id, patch) => sb("PATCH",  `ideas?id=eq.${id}`, patch);
const dbDelete = (id)        => sb("DELETE", `ideas?id=eq.${id}`);

// ─── Design System — Niva faithful ───────────────────────────────────
const C = {
  bg:      "#F2EFE9",   // Niva warm beige
  card:    "#FFFFFF",
  navy:    "#2A3875",
  orange:  "#F47648",
  yellow:  "#F5C757",
  green:   "#4CAF82",
  rose:    "#F4787A",
  purple:  "#7B5EA7",
  brown:   "#B8860B",
  text:    "#1C1C1E",
  sub:     "#6B6B6B",
  muted:   "#ADADAD",
  line:    "#E8E4DD",
};

const DEFAULT_VENTURES = ["Mercasync", "Maker Home", "Holadiseño", "Kyoszen", "Personal", "Inversión"];
const CUSTOM_PALETTE   = ["#6366F1","#EC4899","#14B8A6","#F59E0B","#EF4444","#8B5CF6","#06B6D4","#84CC16"];
const getVM = (v) => VM[v] || { color: CUSTOM_PALETTE[Math.abs(v?.split("").reduce((a,c)=>a+c.charCodeAt(0),0)||0) % CUSTOM_PALETTE.length], light: "#F3F4F6", dot: "#6B7280", letter: v?.[0]?.toUpperCase() || "?" };
// keep VENTURES alias for legacy references
const VENTURES = DEFAULT_VENTURES;
const TYPES    = ["Artifact", "API", "Agente", "MCP", "Claude Code", "Workflow", "Automatización", "Otro"];
const STATUSES = ["Idea", "En desarrollo", "Pausado", "Listo"];
const DURATIONS= [1, 2, 3, 4, 6, 8, 12];
const DAYS     = ["L", "M", "X", "J", "V", "S", "D"];
const MONTHS   = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

const VM = {
  "Mercasync":  { color: C.navy,   light: "#E8ECF8", dot: C.navy,   letter: "M" },
  "Maker Home": { color: C.orange, light: "#FEF0EA", dot: C.orange, letter: "H" },
  "Holadiseño": { color: C.purple, light: "#F2EDF9", dot: C.purple, letter: "D" },
  "Kyoszen":    { color: C.green,  light: "#E8F5EE", dot: C.green,  letter: "K" },
  "Personal":   { color: C.rose,   light: "#FEF0F0", dot: C.rose,   letter: "P" },
  "Inversión":  { color: C.brown,  light: "#FBF7E8", dot: C.brown,  letter: "I" },
};

const SM = {
  "Idea":          { color: C.brown,  bg: "#FBF7E8" },
  "En desarrollo": { color: C.navy,   bg: "#E8ECF8" },
  "Pausado":       { color: C.muted,  bg: "#F0F0F0" },
  "Listo":         { color: C.green,  bg: "#E8F5EE" },
};

const PRIORITY_META = {
  "alta":  { label: "Alta",  icon: "🔴", color: C.rose,  bg: "#FEF0F0" },
  "media": { label: "Media", icon: "🟡", color: C.brown, bg: "#FBF7E8" },
  "baja":  { label: "Baja",  icon: "🟢", color: C.green, bg: "#E8F5EE" },
};
const PRIORITIES = ["alta", "media", "baja"];

const EFFORT_C = { "< 1 día": C.green, "1-3 días": C.yellow, "1 semana": C.orange, "2 semanas": C.purple, "1 mes+": C.rose };

const genId   = () => `i_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
const toYMD   = (d) => d.toISOString().slice(0, 10);
const today   = () => new Date();
const fmtDate = (iso) => {
  if (!iso || iso === "Invalid Date") return "";
  const d = new Date(iso + "T12:00:00");
  return isNaN(d) ? "" : d.toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
};

const callClaude = async (system, user) => {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 2000, system, messages: [{ role: "user", content: user }] }),
  });
  const d = await res.json();
  return d.content?.find(b => b.type === "text")?.text || "";
};

const SYSTEM = `Eres el co-fundador estratégico y técnico de Renato. Director de Ops de Mercasync (ERP México), fundador de Maker Home (smart home, Maya bot WhatsApp), Holadiseño (diseño), Kyoszen (reclutamiento). Stack: Claude, Supabase, n8n. Directo, honesto, opinionado.`;

const CHAT_MODES = [
  { id: "libre",        label: "Libre",        sys: "" },
  { id: "lanzamiento",  label: "Lanzamiento",  sys: "\n\nMODO LANZAMIENTO: Enfócate en go-to-market, primeros 100 clientes, canales de adquisición, pricing, timeline de lanzamiento." },
  { id: "competencia",  label: "Competencia",  sys: "\n\nMODO COMPETENCIA: Identifica competidores directos e indirectos, diferenciadores clave y cómo posicionarse." },
  { id: "monetizacion", label: "Monetización", sys: "\n\nMODO MONETIZACIÓN: Analiza modelos de negocio, pricing, revenue streams, LTV/CAC, y cómo escalar ingresos." },
  { id: "riesgos",      label: "Riesgos",      sys: "\n\nMODO RIESGOS: Identifica riesgos técnicos, de mercado, regulatorios y de ejecución con mitigaciones concretas." },
];

// ─── Atoms ────────────────────────────────────────────────────────────
const Spin = ({ size = 16, color = C.navy }) => (
  <div style={{ width: size, height: size, borderRadius: "50%", border: `2px solid ${color}20`, borderTopColor: color, animation: "spin 0.8s linear infinite", flexShrink: 0 }} />
);

const Tag = ({ label, color, bg }) => (
  <span style={{ display: "inline-block", padding: "4px 12px", borderRadius: "100px", background: bg, color, fontSize: "11px", fontWeight: "700", letterSpacing: "0.6px", textTransform: "uppercase" }}>
    {label}
  </span>
);

const AvatarBox = ({ letter, color }) => (
  <div style={{ width: "48px", height: "48px", borderRadius: "16px", background: color + "25", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", fontWeight: "700", color, flexShrink: 0 }}>
    {letter}
  </div>
);

// ─── Blob (Niva signature) ────────────────────────────────────────────
const Blob = ({ syncing, total }) => (
  <div style={{ position: "relative", width: "100%", height: "160px", borderRadius: "28px", overflow: "hidden", marginBottom: "24px" }}>
    <svg viewBox="0 0 400 160" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="160" fill="#F0ECE5" />
      <defs>
        <radialGradient id="b1" cx="65%" cy="75%" r="55%">
          <stop offset="0%" stopColor="#F47648" stopOpacity="0.95" />
          <stop offset="45%" stopColor="#F5C757" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#F5C757" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="b2" cx="25%" cy="65%" r="55%">
          <stop offset="0%" stopColor="#2A3875" stopOpacity="0.9" />
          <stop offset="55%" stopColor="#4A5FBB" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#4A5FBB" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="b3" cx="80%" cy="25%" r="40%">
          <stop offset="0%" stopColor="#F47090" stopOpacity="0.65" />
          <stop offset="100%" stopColor="#F47090" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="260" cy="120" rx="230" ry="130" fill="url(#b1)" />
      <ellipse cx="100" cy="90"  rx="200" ry="110" fill="url(#b2)" />
      <ellipse cx="320" cy="45"  rx="150" ry="85"  fill="url(#b3)" />
    </svg>
    <div style={{ position: "absolute", inset: 0, padding: "24px 24px 20px" }}>
      <div style={{ fontSize: "11px", letterSpacing: "2px", color: "rgba(28,28,30,0.5)", fontWeight: "700", marginBottom: "6px" }}>HOLA RENATO</div>
      <div style={{ fontSize: "22px", fontWeight: "700", color: C.text, lineHeight: 1.25, letterSpacing: "-0.3px" }}>
        ¿En qué idea<br />trabajamos hoy?
      </div>
      <div style={{ position: "absolute", bottom: "20px", right: "20px", background: "rgba(255,255,255,0.75)", backdropFilter: "blur(12px)", borderRadius: "100px", padding: "6px 14px", display: "flex", alignItems: "center", gap: "6px" }}>
        {syncing ? <Spin size={10} color={C.navy} /> : <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.green }} />}
        <span style={{ fontSize: "11px", fontWeight: "700", color: C.text }}>{syncing ? "Sincronizando" : `${total} ideas`}</span>
      </div>
    </div>
  </div>
);

// ─── Analysis Panel ───────────────────────────────────────────────────
const VERDICT_META = {
  "Alta prioridad":   { emoji: "🔥", color: C.orange, bg: "#FEF0EA" },
  "Vale la pena":     { emoji: "⚡", color: C.navy,   bg: "#E8ECF8" },
  "Hay que pensarlo": { emoji: "🤔", color: C.brown,  bg: "#FBF7E8" },
  "Cuidado":          { emoji: "⚠️", color: C.rose,   bg: "#FEF0F0" },
};

const Block = ({ label, color, children }) => (
  <div style={{ marginBottom: "16px" }}>
    <div style={{ fontSize: "10px", fontWeight: "800", letterSpacing: "1.2px", color, textTransform: "uppercase", marginBottom: "8px" }}>{label}</div>
    {children}
  </div>
);

const AnalysisPanel = ({ raw }) => {
  let d = {};
  try { d = JSON.parse(raw); } catch { d = { error: raw }; }
  if (d.error) return (
    <div style={{ marginTop: "16px", background: C.bg, borderRadius: "20px", padding: "18px" }}>
      <p style={{ fontSize: "13px", color: C.muted }}>{d.error}</p>
    </div>
  );
  const vk  = Object.keys(VERDICT_META).find(k => d.verdict?.includes(k)) || "Vale la pena";
  const vm  = VERDICT_META[vk];
  return (
    <div style={{ marginTop: "16px", background: C.bg, borderRadius: "24px", padding: "22px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px" }}>
        <div style={{ width: "32px", height: "32px", borderRadius: "12px", background: C.navy, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", color: "#fff", fontWeight: "800" }}>✦</div>
        <span style={{ fontSize: "14px", fontWeight: "700", color: C.text }}>Análisis de Claude</span>
        {d.esfuerzo && (
          <span style={{ marginLeft: "auto", padding: "5px 12px", borderRadius: "100px", background: EFFORT_C[d.esfuerzo] + "20", color: EFFORT_C[d.esfuerzo], fontSize: "11px", fontWeight: "700" }}>⏱ {d.esfuerzo}</span>
        )}
      </div>

      {d.verdict && (
        <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "8px 16px", borderRadius: "100px", background: vm.bg, marginBottom: "18px" }}>
          <span style={{ fontSize: "14px" }}>{vm.emoji}</span>
          <span style={{ fontSize: "13px", fontWeight: "700", color: vm.color }}>{d.verdict}</span>
        </div>
      )}

      {d.resumen && (
        <Block label="Lectura honesta" color={vm.color}>
          <p style={{ fontSize: "14px", color: C.text, lineHeight: "1.75", fontWeight: "500" }}>{d.resumen}</p>
        </Block>
      )}
      {d.oportunidad && (
        <Block label="Oportunidad real" color={C.green}>
          <p style={{ fontSize: "13px", color: C.sub, lineHeight: "1.7" }}>{d.oportunidad}</p>
        </Block>
      )}
      {d.esfuerzo_detalle && (
        <Block label="Esfuerzo estimado" color={C.purple}>
          <p style={{ fontSize: "13px", color: C.sub, lineHeight: "1.7" }}>{d.esfuerzo_detalle}</p>
        </Block>
      )}
      {d.riesgos?.length > 0 && (
        <Block label="Riesgos" color={C.rose}>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {d.riesgos.map((r, i) => (
              <div key={i} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                <div style={{ width: "20px", height: "20px", borderRadius: "6px", background: C.rose + "20", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", flexShrink: 0, marginTop: "1px" }}>⚠</div>
                <span style={{ fontSize: "13px", color: C.sub, lineHeight: "1.6" }}>{r}</span>
              </div>
            ))}
          </div>
        </Block>
      )}
      {d.stack?.herramientas?.length > 0 && (
        <Block label="Stack sugerido" color={C.navy}>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "8px" }}>
            {d.stack.herramientas.map((h, i) => (
              <span key={i} style={{ padding: "6px 14px", borderRadius: "100px", background: C.card, border: `1px solid ${C.line}`, fontSize: "12px", fontWeight: "600", color: C.navy }}>{h}</span>
            ))}
          </div>
          {d.stack.por_que && <p style={{ fontSize: "12px", color: C.muted, lineHeight: "1.6", marginTop: "8px" }}>{d.stack.por_que}</p>}
        </Block>
      )}
      {d.roadmap?.length > 0 && (
        <Block label="Roadmap" color={C.purple}>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {d.roadmap.map((f, fi) => (
              <div key={fi} style={{ background: C.card, borderRadius: "16px", padding: "14px 16px", border: `1px solid ${C.line}` }}>
                <div style={{ fontSize: "12px", fontWeight: "700", color: C.purple, marginBottom: "8px" }}>{f.fase}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                  {f.acciones?.map((a, ai) => (
                    <div key={ai} style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                      <span style={{ color: C.purple, flexShrink: 0, marginTop: "1px" }}>→</span>
                      <span style={{ fontSize: "13px", color: C.sub, lineHeight: "1.6" }}>{a}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Block>
      )}
      {d.primera_accion && (
        <div style={{ background: C.navy, borderRadius: "18px", padding: "16px 18px", marginBottom: "12px" }}>
          <div style={{ fontSize: "10px", fontWeight: "800", letterSpacing: "1.2px", color: "rgba(255,255,255,0.5)", marginBottom: "6px" }}>PRIMER PASO HOY</div>
          <p style={{ fontSize: "14px", color: "#fff", lineHeight: "1.7", fontWeight: "500" }}>{d.primera_accion}</p>
        </div>
      )}
      {d.pregunta && (
        <div style={{ background: C.card, borderRadius: "18px", padding: "16px 18px", border: `1.5px solid ${C.yellow}80` }}>
          <div style={{ fontSize: "10px", fontWeight: "800", letterSpacing: "1.2px", color: C.brown, marginBottom: "6px" }}>PREGUNTA ESTRATÉGICA</div>
          <p style={{ fontSize: "13px", color: C.sub, lineHeight: "1.7", fontStyle: "italic" }}>"{d.pregunta}"</p>
        </div>
      )}
    </div>
  );
};

// ─── Debate Panel ─────────────────────────────────────────────────────
const DebatePanel = ({ raw }) => {
  let d = {};
  try { d = JSON.parse(raw); } catch { d = { error: raw }; }
  if (d.error) return <div style={{ marginTop: "16px", background: "#FEF0F0", borderRadius: "20px", padding: "18px" }}><p style={{ fontSize: "13px", color: C.muted }}>{d.error}</p></div>;
  return (
    <div style={{ marginTop: "16px", background: "#FFF8F8", borderRadius: "24px", padding: "22px", border: `1px solid ${C.rose}30` }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
        <div style={{ width: "32px", height: "32px", borderRadius: "12px", background: C.rose, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", color: "#fff", fontWeight: "800" }}>⚔</div>
        <span style={{ fontSize: "14px", fontWeight: "700", color: C.text }}>Abogado del diablo</span>
      </div>
      {d.veredicto && (
        <div style={{ background: C.rose, borderRadius: "16px", padding: "14px 16px", marginBottom: "16px" }}>
          <p style={{ fontSize: "14px", color: "#fff", fontWeight: "600", lineHeight: "1.6" }}>{d.veredicto}</p>
        </div>
      )}
      {d.argumentos?.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
          {d.argumentos.map((a, i) => (
            <div key={i} style={{ background: C.card, borderRadius: "16px", padding: "14px 16px", border: `1px solid ${C.rose}30` }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                <div style={{ width: "22px", height: "22px", borderRadius: "7px", background: C.rose + "20", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "800", color: C.rose, flexShrink: 0 }}>{i + 1}</div>
                <span style={{ fontSize: "13px", fontWeight: "700", color: C.text }}>{a.titulo}</span>
              </div>
              <p style={{ fontSize: "13px", color: C.sub, lineHeight: "1.6", paddingLeft: "30px" }}>{a.detalle}</p>
            </div>
          ))}
        </div>
      )}
      {d.como_rebatirlos?.length > 0 && (
        <Block label="Cómo fortalecer la idea" color={C.green}>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {d.como_rebatirlos.map((r, i) => (
              <div key={i} style={{ display: "flex", gap: "10px" }}>
                <span style={{ color: C.green, flexShrink: 0 }}>✓</span>
                <span style={{ fontSize: "13px", color: C.sub, lineHeight: "1.6" }}>{r}</span>
              </div>
            ))}
          </div>
        </Block>
      )}
      {d.conclusion && (
        <div style={{ background: C.bg, borderRadius: "14px", padding: "14px" }}>
          <p style={{ fontSize: "13px", color: C.sub, lineHeight: "1.7", fontStyle: "italic" }}>{d.conclusion}</p>
        </div>
      )}
    </div>
  );
};

// ─── Checklist ────────────────────────────────────────────────────────
const Checklist = ({ idea, onUpdate }) => {
  let analysis = {};
  try { analysis = JSON.parse(idea.expansion || "{}"); } catch {}
  const steps = idea.checklist || [];
  const done  = steps.filter(s => s.done).length;
  const pct   = steps.length ? Math.round((done / steps.length) * 100) : 0;

  const init = () => {
    if (!analysis.roadmap) return;
    const items = analysis.roadmap.flatMap(f =>
      f.acciones.map(a => ({ id: genId(), text: a, done: false, fase: f.fase.split("—")[0].trim() }))
    );
    onUpdate(items);
  };

  return (
    <div style={{ marginTop: "16px", background: C.bg, borderRadius: "24px", padding: "22px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
        <div style={{ width: "32px", height: "32px", borderRadius: "12px", background: C.purple, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", color: "#fff", fontWeight: "800" }}>✓</div>
        <span style={{ fontSize: "14px", fontWeight: "700", color: C.text }}>Checklist</span>
        {steps.length > 0 && <span style={{ marginLeft: "auto", fontSize: "13px", fontWeight: "700", color: C.purple }}>{pct}%</span>}
      </div>
      {steps.length > 0 && (
        <div style={{ height: "6px", background: C.line, borderRadius: "3px", marginBottom: "18px" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: C.purple, borderRadius: "3px", transition: "width 0.4s" }} />
        </div>
      )}
      {steps.length === 0 ? (
        <div style={{ textAlign: "center", padding: "16px 0" }}>
          <p style={{ fontSize: "13px", color: C.muted, marginBottom: "16px" }}>Importa los pasos del roadmap de Claude</p>
          {analysis.roadmap
            ? <button onClick={init} style={{ background: C.purple, color: "#fff", border: "none", borderRadius: "100px", padding: "12px 24px", fontSize: "13px", fontWeight: "700", cursor: "pointer" }}>Importar pasos</button>
            : <p style={{ fontSize: "12px", color: C.muted }}>Primero expande la idea con Claude ✦</p>}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {steps.map(s => (
            <div key={s.id} onClick={() => onUpdate(steps.map(x => x.id === s.id ? { ...x, done: !x.done } : x))}
              style={{ display: "flex", gap: "12px", alignItems: "flex-start", cursor: "pointer", padding: "4px 0" }}>
              <div style={{ width: "22px", height: "22px", borderRadius: "7px", border: `2px solid ${s.done ? C.purple : C.line}`, background: s.done ? C.purple : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "1px", transition: "all 0.15s" }}>
                {s.done && <span style={{ color: "#fff", fontSize: "12px", fontWeight: "800" }}>✓</span>}
              </div>
              <div>
                {s.fase && <div style={{ fontSize: "10px", fontWeight: "700", color: C.purple, letterSpacing: "0.5px", marginBottom: "2px" }}>{s.fase.toUpperCase()}</div>}
                <span style={{ fontSize: "13px", color: s.done ? C.muted : C.text, textDecoration: s.done ? "line-through" : "none", lineHeight: "1.5" }}>{s.text}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Time Tracker ─────────────────────────────────────────────────────
const TimeTracker = ({ idea, onLog }) => {
  const [hours, setHours] = useState("");
  const [note,  setNote]  = useState("");
  const logs  = idea.timeLogs || [];
  const total = logs.reduce((s, l) => s + (l.hours || 0), 0);

  const add = () => {
    if (!hours) return;
    onLog([...logs, { id: genId(), hours: parseFloat(hours), note, date: toYMD(today()) }]);
    setHours(""); setNote("");
  };

  return (
    <div style={{ marginTop: "16px", background: C.bg, borderRadius: "24px", padding: "22px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
        <div style={{ width: "32px", height: "32px", borderRadius: "12px", background: C.orange, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", color: "#fff", fontWeight: "800" }}>⏱</div>
        <span style={{ fontSize: "14px", fontWeight: "700", color: C.text }}>Tiempo registrado</span>
        <span style={{ marginLeft: "auto", fontSize: "16px", fontWeight: "800", color: C.orange }}>{total.toFixed(1)}h</span>
      </div>
      <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
        <input value={hours} onChange={e => setHours(e.target.value)} type="number" placeholder="Hrs" min="0.5" step="0.5"
          style={{ width: "72px", background: C.card, border: "none", borderRadius: "12px", padding: "12px", fontSize: "14px", color: C.text, fontFamily: "inherit", textAlign: "center" }} />
        <input value={note} onChange={e => setNote(e.target.value)} placeholder="¿Qué hiciste?"
          style={{ flex: 1, background: C.card, border: "none", borderRadius: "12px", padding: "12px 14px", fontSize: "13px", color: C.text, fontFamily: "inherit" }} />
        <button onClick={add} style={{ background: C.orange, color: "#fff", border: "none", borderRadius: "12px", padding: "12px 18px", fontSize: "14px", fontWeight: "800", cursor: "pointer" }}>+</button>
      </div>
      {logs.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {[...logs].reverse().map(l => (
            <div key={l.id} style={{ display: "flex", gap: "10px", alignItems: "center", background: C.card, borderRadius: "12px", padding: "10px 14px" }}>
              <span style={{ fontSize: "14px", fontWeight: "800", color: C.orange, flexShrink: 0 }}>{l.hours}h</span>
              <span style={{ fontSize: "11px", color: C.muted, flexShrink: 0 }}>{l.date}</span>
              <span style={{ fontSize: "13px", color: C.sub, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.note || "—"}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Presentation Mode ────────────────────────────────────────────────
const PresentationMode = ({ idea, onClose }) => {
  const vm = VM[idea.venture] || VM["Personal"];
  const sm = SM[idea.status];
  let a = {};
  try { a = JSON.parse(idea.expansion || "{}"); } catch {}
  return (
    <div style={{ position: "fixed", inset: 0, background: "#fff", zIndex: 3000, overflow: "auto" }}>
      <div style={{ maxWidth: "620px", margin: "0 auto", padding: "40px 28px 80px" }}>
        <button onClick={onClose} style={{ background: C.bg, border: "none", borderRadius: "100px", padding: "10px 20px", fontSize: "13px", fontWeight: "600", color: C.sub, cursor: "pointer", marginBottom: "36px" }}>← Cerrar</button>
        <Tag label={idea.venture} color={vm.color} bg={vm.light} />
        <div style={{ fontSize: "34px", fontWeight: "800", color: C.text, lineHeight: 1.2, margin: "14px 0 10px", letterSpacing: "-0.5px" }}>{idea.title}</div>
        {idea.description && <p style={{ fontSize: "16px", color: C.sub, lineHeight: "1.7", marginBottom: "20px" }}>{idea.description}</p>}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "32px" }}>
          <span style={{ padding: "7px 16px", borderRadius: "100px", background: sm.bg, color: sm.color, fontSize: "13px", fontWeight: "700" }}>{idea.status}</span>
          <span style={{ padding: "7px 16px", borderRadius: "100px", background: C.bg, color: C.sub, fontSize: "13px" }}>{idea.type}</span>
          {a.esfuerzo && <span style={{ padding: "7px 16px", borderRadius: "100px", background: EFFORT_C[a.esfuerzo] + "20", color: EFFORT_C[a.esfuerzo], fontSize: "13px", fontWeight: "700" }}>⏱ {a.esfuerzo}</span>}
          {idea.startDate && <span style={{ padding: "7px 16px", borderRadius: "100px", background: "#E8ECF8", color: C.navy, fontSize: "13px", fontWeight: "600" }}>📅 {fmtDate(idea.startDate)}</span>}
        </div>
        <div style={{ height: "4px", background: `linear-gradient(90deg, ${vm.color}, ${vm.color}20)`, borderRadius: "2px", marginBottom: "36px" }} />
        {a.verdict && <div style={{ display: "inline-flex", padding: "10px 20px", borderRadius: "100px", background: vm.light, marginBottom: "28px" }}><span style={{ fontSize: "15px", fontWeight: "700", color: vm.color }}>{a.verdict}</span></div>}
        {a.resumen && <div style={{ marginBottom: "28px" }}><div style={{ fontSize: "11px", fontWeight: "800", letterSpacing: "1.2px", color: C.muted, marginBottom: "10px" }}>RESUMEN</div><p style={{ fontSize: "17px", color: C.text, lineHeight: "1.8" }}>{a.resumen}</p></div>}
        {a.oportunidad && <div style={{ marginBottom: "28px", background: C.bg, borderRadius: "20px", padding: "22px" }}><div style={{ fontSize: "11px", fontWeight: "800", letterSpacing: "1.2px", color: C.green, marginBottom: "10px" }}>OPORTUNIDAD</div><p style={{ fontSize: "15px", color: C.sub, lineHeight: "1.8" }}>{a.oportunidad}</p></div>}
        {a.roadmap?.length > 0 && (
          <div style={{ marginBottom: "28px" }}>
            <div style={{ fontSize: "11px", fontWeight: "800", letterSpacing: "1.2px", color: C.muted, marginBottom: "16px" }}>ROADMAP</div>
            {a.roadmap.map((f, i) => (
              <div key={i} style={{ display: "flex", gap: "18px", marginBottom: "20px" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: vm.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "13px", fontWeight: "800", flexShrink: 0 }}>{i + 1}</div>
                  {i < a.roadmap.length - 1 && <div style={{ width: "2px", flex: 1, background: C.line, marginTop: "8px" }} />}
                </div>
                <div style={{ paddingBottom: "20px" }}>
                  <div style={{ fontSize: "14px", fontWeight: "700", color: C.text, marginBottom: "8px" }}>{f.fase}</div>
                  {f.acciones?.map((ac, ai) => <div key={ai} style={{ fontSize: "13px", color: C.sub, lineHeight: "1.7" }}>· {ac}</div>)}
                </div>
              </div>
            ))}
          </div>
        )}
        {a.primera_accion && <div style={{ background: C.navy, borderRadius: "20px", padding: "22px", marginBottom: "20px" }}><div style={{ fontSize: "11px", fontWeight: "800", letterSpacing: "1.2px", color: "rgba(255,255,255,0.5)", marginBottom: "8px" }}>PRÓXIMO PASO</div><p style={{ fontSize: "16px", color: "#fff", lineHeight: "1.7", fontWeight: "500" }}>{a.primera_accion}</p></div>}
        <div style={{ textAlign: "center", color: C.muted, fontSize: "12px", marginTop: "48px" }}>Claude Ideas Lab · {fmtDate(idea.createdAt)}</div>
      </div>
    </div>
  );
};

// ─── Calendar View — Niva style ───────────────────────────────────────
const CalView = ({ ideas, onSelectIdea }) => {
  const now = today();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [view,  setView]  = useState("month");
  const [selDay, setSelDay] = useState(null);

  const getDays = (y, m) => {
    const first = new Date(y, m, 1);
    const last  = new Date(y, m + 1, 0);
    const dow   = (first.getDay() + 6) % 7;
    const days  = [];
    for (let i = 0; i < dow; i++) days.push(null);
    for (let d = 1; d <= last.getDate(); d++) days.push(new Date(y, m, d));
    while (days.length % 7 !== 0) days.push(null);
    return days;
  };

  const days = getDays(year, month);
  const withDate = ideas.filter(i => i.startDate).sort((a, b) => a.startDate > b.startDate ? 1 : -1);

  const onDay = (date) => {
    if (!date) return [];
    const ymd = toYMD(date);
    return withDate.filter(i => i.startDate === ymd);
  };

  const ganttStart  = withDate.length ? new Date(withDate[0].startDate + "T12:00:00") : null;
  const ganttEndD   = withDate.length ? new Date(withDate[withDate.length - 1].startDate + "T12:00:00") : null;
  if (ganttEndD) ganttEndD.setDate(ganttEndD.getDate() + (withDate[withDate.length - 1].durationWeeks || 1) * 7);
  const ganttTotal  = ganttStart && ganttEndD ? Math.max(Math.round((ganttEndD - ganttStart) / 86400000), 1) : 1;

  const todayYMD = toYMD(today());
  const upcoming = withDate.filter(i => i.startDate >= todayYMD).slice(0, 5);

  return (
    <div>
      {/* View toggle — Niva Day/Week/Month style */}
      <div style={{ display: "flex", background: C.card, borderRadius: "16px", padding: "4px", marginBottom: "24px", gap: "2px" }}>
        {[["month", "Mes"], ["gantt", "Roadmap"]].map(([v, l]) => (
          <button key={v} onClick={() => setView(v)} style={{ flex: 1, padding: "10px", borderRadius: "12px", border: "none", background: view === v ? C.navy : "transparent", color: view === v ? "#fff" : C.muted, fontSize: "13px", fontWeight: "700", cursor: "pointer", transition: "all 0.2s" }}>{l}</button>
        ))}
      </div>

      {view === "month" && (
        <>
          {/* Month nav */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
            <button onClick={() => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); setSelDay(null); }}
              style={{ width: "36px", height: "36px", borderRadius: "12px", border: "none", background: C.card, color: C.sub, fontSize: "18px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
            <span style={{ fontSize: "18px", fontWeight: "700", color: C.text }}>{MONTHS[month]} {year}</span>
            <button onClick={() => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); setSelDay(null); }}
              style={{ width: "36px", height: "36px", borderRadius: "12px", border: "none", background: C.card, color: C.sub, fontSize: "18px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>›</button>
          </div>

          {/* Day headers */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: "8px" }}>
            {DAYS.map(d => (
              <div key={d} style={{ textAlign: "center", fontSize: "11px", fontWeight: "700", color: C.muted, letterSpacing: "0.5px" }}>{d}</div>
            ))}
          </div>

          {/* Calendar grid — Niva style */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px", marginBottom: "28px" }}>
            {days.map((date, idx) => {
              const hits    = onDay(date);
              const isToday = date && toYMD(date) === todayYMD;
              const isSel   = date && selDay && toYMD(date) === toYMD(selDay);
              return (
                <div key={idx} onClick={() => date && setSelDay(isSel ? null : date)}
                  style={{ minHeight: "56px", borderRadius: "14px", padding: "8px 4px 6px", background: isSel ? C.navy : isToday ? "#E8ECF8" : date ? C.card : "transparent", cursor: date ? "pointer" : "default", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", transition: "all 0.15s", boxShadow: date ? "0 1px 4px rgba(0,0,0,0.04)" : "none" }}>
                  {date && (
                    <>
                      <span style={{ fontSize: "13px", fontWeight: isToday || isSel ? "800" : "500", color: isSel ? "#fff" : isToday ? C.navy : C.text }}>{date.getDate()}</span>
                      {/* Niva-style colored bars under dates */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px", width: "80%" }}>
                        {hits.slice(0, 3).map((idea, i) => {
                          const v = VM[idea.venture] || VM["Personal"];
                          return (
                            <div key={i} style={{ height: "3px", borderRadius: "2px", background: isSel ? "rgba(255,255,255,0.6)" : v.color, width: "100%" }} />
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Selected day */}
          {selDay && (
            <div>
              <div style={{ fontSize: "15px", fontWeight: "700", color: C.text, marginBottom: "14px" }}>
                {selDay.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}
              </div>
              {onDay(selDay).length === 0 ? (
                <div style={{ background: C.card, borderRadius: "20px", padding: "28px", textAlign: "center", color: C.muted, fontSize: "13px" }}>Sin ideas este día</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {onDay(selDay).map(idea => {
                    const v = VM[idea.venture] || VM["Personal"];
                    return (
                      <div key={idea.id} onClick={() => onSelectIdea(idea)}
                        style={{ background: C.card, borderRadius: "20px", padding: "16px 18px", display: "flex", gap: "14px", alignItems: "center", cursor: "pointer", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
                        <div style={{ width: "4px", alignSelf: "stretch", borderRadius: "2px", background: v.color, flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: "15px", fontWeight: "700", color: C.text, marginBottom: "3px" }}>{idea.title}</div>
                          <div style={{ fontSize: "12px", color: C.muted }}>{idea.venture} · {idea.type}</div>
                        </div>
                        <AvatarBox letter={v.letter} color={v.color} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Upcoming — Niva "Your upcoming activities" */}
          {!selDay && (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                <span style={{ fontSize: "15px", fontWeight: "700", color: C.text }}>Próximas ideas</span>
                <span style={{ fontSize: "12px", color: C.muted }}>{upcoming.length} ideas</span>
              </div>
              {upcoming.length === 0 ? (
                <div style={{ background: C.card, borderRadius: "20px", padding: "28px", textAlign: "center" }}>
                  <div style={{ fontSize: "28px", marginBottom: "8px" }}>📅</div>
                  <div style={{ fontSize: "14px", fontWeight: "700", color: C.text, marginBottom: "4px" }}>Sin fechas asignadas</div>
                  <div style={{ fontSize: "13px", color: C.muted }}>Asigna fechas a tus ideas desde las cards</div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {upcoming.map(idea => {
                    const v = VM[idea.venture] || VM["Personal"];
                    const s = SM[idea.status];
                    return (
                      <div key={idea.id} onClick={() => onSelectIdea(idea)}
                        style={{ background: C.card, borderRadius: "20px", padding: "16px 18px", display: "flex", gap: "14px", alignItems: "center", cursor: "pointer", boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}>
                        <div style={{ width: "42px", height: "42px", borderRadius: "14px", background: v.light, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontWeight: "800", color: v.color, flexShrink: 0 }}>{v.letter}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: "14px", fontWeight: "700", color: C.text, marginBottom: "3px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{idea.title}</div>
                          <div style={{ fontSize: "12px", color: C.muted }}>{fmtDate(idea.startDate)} · {idea.durationWeeks || 1} semanas</div>
                        </div>
                        <span style={{ padding: "5px 12px", borderRadius: "100px", background: s.bg, color: s.color, fontSize: "11px", fontWeight: "700", flexShrink: 0 }}>{idea.status}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Gantt — Niva Scope of Work style */}
      {view === "gantt" && (
        <div>
          <div style={{ fontSize: "15px", fontWeight: "700", color: C.text, marginBottom: "20px" }}>Roadmap de ideas</div>
          {withDate.length === 0 ? (
            <div style={{ background: C.card, borderRadius: "20px", padding: "48px", textAlign: "center" }}>
              <div style={{ fontSize: "36px", marginBottom: "12px" }}>📊</div>
              <div style={{ fontSize: "15px", fontWeight: "700", color: C.text, marginBottom: "6px" }}>Sin fechas asignadas</div>
              <div style={{ fontSize: "13px", color: C.muted }}>Agrega fechas de inicio a tus ideas</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {withDate.map(idea => {
                const v = VM[idea.venture] || VM["Personal"];
                const startD   = new Date(idea.startDate + "T12:00:00");
                const durDays  = (idea.durationWeeks || 1) * 7;
                const offset   = ganttStart ? Math.round((startD - ganttStart) / 86400000) : 0;
                const offPct   = (offset / ganttTotal) * 100;
                const widPct   = Math.max((durDays / ganttTotal) * 100, 4);
                return (
                  <div key={idea.id} style={{ background: C.card, borderRadius: "16px", padding: "14px 16px", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                      <Tag label={idea.venture} color={v.color} bg={v.light} />
                      <span style={{ fontSize: "13px", fontWeight: "700", color: C.text, flex: 1 }}>{idea.title}</span>
                      <span style={{ fontSize: "12px", color: C.muted }}>{idea.durationWeeks || 1} sem</span>
                    </div>
                    <div style={{ position: "relative", height: "28px", background: C.bg, borderRadius: "10px" }}>
                      <div onClick={() => onSelectIdea(idea)}
                        style={{ position: "absolute", left: `${Math.min(offPct, 90)}%`, width: `${Math.min(widPct, 100 - Math.min(offPct, 90))}%`, height: "100%", borderRadius: "10px", background: `linear-gradient(90deg, ${v.color}, ${v.color}CC)`, cursor: "pointer", minWidth: "40px", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 3px 10px ${v.color}40` }}>
                        <span style={{ fontSize: "11px", fontWeight: "700", color: "#fff" }}>{fmtDate(idea.startDate)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Connections View ─────────────────────────────────────────────────
const ConnectionsView = ({ ideas, loading, connections, onGenerate }) => (
  <div>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
      <div>
        <div style={{ fontSize: "20px", fontWeight: "800", color: C.text, letterSpacing: "-0.3px" }}>Conexiones</div>
        <div style={{ fontSize: "13px", color: C.muted, marginTop: "2px" }}>Sinergias entre tus ideas</div>
      </div>
      <button onClick={onGenerate} disabled={loading}
        style={{ background: C.navy, color: "#fff", border: "none", borderRadius: "100px", padding: "12px 22px", fontSize: "13px", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", opacity: loading ? 0.7 : 1 }}>
        {loading ? <><Spin size={14} color="#fff" /> Analizando...</> : "✦ Analizar"}
      </button>
    </div>
    {!connections && !loading && (
      <div style={{ background: C.card, borderRadius: "24px", padding: "48px 32px", textAlign: "center" }}>
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔗</div>
        <div style={{ fontSize: "16px", fontWeight: "700", color: C.text, marginBottom: "8px" }}>Detecta sinergias</div>
        <div style={{ fontSize: "14px", color: C.muted, lineHeight: "1.6" }}>Claude analiza todas tus ideas y encuentra conexiones entre ventures y proyectos</div>
      </div>
    )}
    {loading && (
      <div style={{ background: C.card, borderRadius: "24px", padding: "48px", textAlign: "center" }}>
        <Spin size={32} color={C.navy} />
        <div style={{ fontSize: "14px", color: C.muted, marginTop: "16px" }}>Analizando {ideas.length} ideas...</div>
      </div>
    )}
    {connections && !loading && (
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        {connections.length === 0 ? (
          <div style={{ background: C.card, borderRadius: "24px", padding: "32px", textAlign: "center", color: C.muted }}>No se encontraron conexiones significativas aún.</div>
        ) : connections.map((c, i) => {
          const v1 = VM[c.idea1_venture] || VM["Personal"];
          const v2 = VM[c.idea2_venture] || VM["Personal"];
          return (
            <div key={i} style={{ background: C.card, borderRadius: "24px", padding: "20px 22px", boxShadow: "0 2px 14px rgba(0,0,0,0.06)" }}>
              <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "12px", flexWrap: "wrap" }}>
                <Tag label={c.idea1_venture} color={v1.color} bg={v1.light} />
                <span style={{ color: C.muted, fontSize: "16px" }}>↔</span>
                <Tag label={c.idea2_venture} color={v2.color} bg={v2.light} />
                <span style={{ marginLeft: "auto", padding: "4px 12px", borderRadius: "100px", background: C.bg, color: C.sub, fontSize: "11px", fontWeight: "600" }}>{c.tipo}</span>
              </div>
              <div style={{ fontSize: "13px", fontWeight: "700", color: C.text, marginBottom: "8px" }}>"{c.idea1}" ↔ "{c.idea2}"</div>
              <p style={{ fontSize: "14px", color: C.sub, lineHeight: "1.7", marginBottom: "10px" }}>{c.sinergia}</p>
              {c.accion && (
                <div style={{ background: C.bg, borderRadius: "12px", padding: "12px 14px", display: "flex", gap: "8px" }}>
                  <span style={{ fontSize: "13px", fontWeight: "700", color: C.navy }}>→</span>
                  <span style={{ fontSize: "13px", color: C.sub }}>{c.accion}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    )}
  </div>
);

// ─── Data Tab ─────────────────────────────────────────────────────────
const DataTab = ({ ideas }) => {
  const total      = ideas.length;
  const totalHours = ideas.reduce((s, i) => s + (i.timeLogs || []).reduce((ss, l) => ss + (l.hours || 0), 0), 0);
  const listo      = ideas.filter(i => i.status === "Listo").length;
  const convRate   = total ? Math.round((listo / total) * 100) : 0;
  const withDate   = ideas.filter(i => i.startDate).length;
  const maxV       = Math.max(...VENTURES.map(v => ideas.filter(i => i.venture === v).length), 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ fontSize: "20px", fontWeight: "800", color: C.text, letterSpacing: "-0.3px", marginBottom: "4px" }}>Dashboard</div>

      {/* KPI grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        {[
          { label: "Total ideas", value: total,               icon: "💡", color: C.navy   },
          { label: "Horas logged", value: `${totalHours.toFixed(1)}h`, icon: "⏱", color: C.orange },
          { label: "Con fecha",    value: withDate,            icon: "📅", color: C.purple },
          { label: "Completadas",  value: `${convRate}%`,      icon: "✓",  color: C.green  },
        ].map((k, i) => (
          <div key={i} style={{ background: C.card, borderRadius: "22px", padding: "20px", boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}>
            <div style={{ fontSize: "24px", marginBottom: "10px" }}>{k.icon}</div>
            <div style={{ fontSize: "28px", fontWeight: "800", color: k.color, marginBottom: "4px", letterSpacing: "-0.5px" }}>{k.value}</div>
            <div style={{ fontSize: "12px", fontWeight: "600", color: C.muted }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* By status */}
      <div style={{ background: C.card, borderRadius: "22px", padding: "22px", boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}>
        <div style={{ fontSize: "13px", fontWeight: "800", color: C.muted, letterSpacing: "0.8px", marginBottom: "18px" }}>POR ESTADO</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {STATUSES.map(s => {
            const count = ideas.filter(i => i.status === s).length;
            const m     = SM[s];
            return (
              <div key={s}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span style={{ fontSize: "13px", fontWeight: "600", color: m.color }}>{s}</span>
                  <span style={{ fontSize: "13px", fontWeight: "800", color: C.text }}>{count}</span>
                </div>
                <div style={{ height: "8px", background: C.bg, borderRadius: "4px" }}>
                  <div style={{ height: "100%", width: `${total ? (count / total) * 100 : 0}%`, background: m.color, borderRadius: "4px", transition: "width 0.6s" }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* By venture */}
      <div style={{ background: C.card, borderRadius: "22px", padding: "22px", boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}>
        <div style={{ fontSize: "13px", fontWeight: "800", color: C.muted, letterSpacing: "0.8px", marginBottom: "18px" }}>POR VENTURE</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {VENTURES.map(v => {
            const count = ideas.filter(i => i.venture === v).length;
            if (!count) return null;
            const vm = VM[v];
            return (
              <div key={v} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "10px", background: vm.light, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: "800", color: vm.color, flexShrink: 0 }}>{vm.letter}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                    <span style={{ fontSize: "13px", fontWeight: "600", color: vm.color }}>{v}</span>
                    <span style={{ fontSize: "13px", fontWeight: "800", color: C.text }}>{count}</span>
                  </div>
                  <div style={{ height: "6px", background: C.bg, borderRadius: "3px" }}>
                    <div style={{ height: "100%", width: `${(count / maxV) * 100}%`, background: vm.color, borderRadius: "3px" }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Hours by venture */}
      {totalHours > 0 && (
        <div style={{ background: C.card, borderRadius: "22px", padding: "22px", boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize: "13px", fontWeight: "800", color: C.muted, letterSpacing: "0.8px", marginBottom: "18px" }}>HORAS POR VENTURE</div>
          {VENTURES.map(v => {
            const hrs = ideas.filter(i => i.venture === v).reduce((s, i) => s + (i.timeLogs || []).reduce((ss, l) => ss + (l.hours || 0), 0), 0);
            if (!hrs) return null;
            const vm = VM[v];
            return (
              <div key={v} style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                <span style={{ fontSize: "12px", fontWeight: "600", color: vm.color, width: "80px", flexShrink: 0 }}>{v}</span>
                <div style={{ flex: 1, height: "8px", background: C.bg, borderRadius: "4px" }}>
                  <div style={{ height: "100%", width: `${(hrs / totalHours) * 100}%`, background: vm.color, borderRadius: "4px" }} />
                </div>
                <span style={{ fontSize: "13px", fontWeight: "800", color: C.text, width: "36px", textAlign: "right", flexShrink: 0 }}>{hrs.toFixed(1)}h</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Date Modal ───────────────────────────────────────────────────────
const DateModal = ({ idea, onSave, onClose }) => {
  const [date,  setDate]  = useState(idea.startDate || "");
  const [weeks, setWeeks] = useState(idea.durationWeeks || 2);
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 1000, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.card, borderRadius: "28px 28px 0 0", padding: "28px 24px 48px", width: "100%", maxWidth: "480px" }}>
        <div style={{ fontSize: "20px", fontWeight: "800", color: C.text, marginBottom: "4px" }}>Fecha de inicio</div>
        <div style={{ fontSize: "14px", color: C.muted, marginBottom: "24px" }}>{idea.title}</div>
        <div style={{ marginBottom: "20px" }}>
          <div style={{ fontSize: "11px", fontWeight: "700", color: C.muted, letterSpacing: "0.8px", marginBottom: "8px" }}>FECHA</div>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            style={{ width: "100%", background: C.bg, border: "none", borderRadius: "16px", padding: "14px 18px", color: C.text, fontSize: "15px", fontFamily: "inherit" }} />
        </div>
        <div style={{ marginBottom: "28px" }}>
          <div style={{ fontSize: "11px", fontWeight: "700", color: C.muted, letterSpacing: "0.8px", marginBottom: "12px" }}>DURACIÓN ESTIMADA</div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {DURATIONS.map(w => (
              <button key={w} onClick={() => setWeeks(w)} style={{ padding: "10px 18px", borderRadius: "100px", background: weeks === w ? C.navy : C.bg, color: weeks === w ? "#fff" : C.muted, border: "none", cursor: "pointer", fontSize: "13px", fontWeight: "700" }}>
                {w} {w === 1 ? "sem" : "sems"}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <button onClick={onClose} style={{ flex: 1, background: C.bg, color: C.muted, border: "none", borderRadius: "100px", padding: "14px", fontSize: "14px", fontWeight: "600", cursor: "pointer" }}>Cancelar</button>
          <button onClick={() => onSave(date, weeks)} style={{ flex: 2, background: C.navy, color: "#fff", border: "none", borderRadius: "100px", padding: "14px", fontSize: "14px", fontWeight: "800", cursor: "pointer" }}>Guardar</button>
        </div>
      </div>
    </div>
  );
};

// ─── Onboarding Guide ─────────────────────────────────────────────────
const ONBOARDING_FEATURES = [
  { icon: "✦", title: "Desarrolla con Claude", desc: "Abre cualquier idea y chatea directo con Claude para profundizar, diseñar arquitectura, buscar nombres o planear el lanzamiento." },
  { icon: "⚡", title: "Análisis rápido", desc: "Claude analiza tu idea al instante: oportunidad real, riesgos, stack sugerido, roadmap y primer paso de hoy." },
  { icon: "⚔", title: "Abogado del diablo", desc: "Claude ataca tu idea con los peores argumentos para que la fortalezcas antes de lanzarla." },
  { icon: "◈", title: "Proyectos", desc: "Agrupa tus ideas por venture y revisa todo su historial: chats, análisis, timeline y exporta todo a markdown." },
  { icon: "🔗", title: "Conexiones", desc: "Claude detecta sinergias entre ideas de diferentes proyectos que no habías visto." },
  { icon: "🎙", title: "Captura por voz", desc: "Di el nombre y de qué trata tu idea. Claude separa el título y la descripción automáticamente." },
];

const OnboardingGuide = ({ onNewIdea, onVoice }) => (
  <div style={{ padding: "8px 0 32px" }}>
    <div style={{ background: `linear-gradient(135deg, ${C.navy}, #4A5FBB)`, borderRadius: "28px", padding: "32px 28px", marginBottom: "24px" }}>
      <div style={{ fontSize: "32px", marginBottom: "14px" }}>✦</div>
      <div style={{ fontSize: "22px", fontWeight: "800", color: "#fff", letterSpacing: "-0.3px", marginBottom: "8px" }}>Bienvenido a Claude Ideas Lab</div>
      <div style={{ fontSize: "14px", color: "rgba(255,255,255,0.75)", lineHeight: "1.65", marginBottom: "24px" }}>
        Tu laboratorio personal para capturar, desarrollar y ejecutar ideas con inteligencia artificial. Empieza capturando tu primera idea.
      </div>
      <div style={{ display: "flex", gap: "10px" }}>
        <button onClick={onNewIdea} style={{ flex: 1, background: "#fff", color: C.navy, border: "none", borderRadius: "14px", padding: "14px", fontSize: "14px", fontWeight: "800", cursor: "pointer" }}>
          + Primera idea
        </button>
        <button onClick={onVoice} style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "14px", padding: "14px 18px", fontSize: "20px", cursor: "pointer" }}>
          🎙
        </button>
      </div>
    </div>
    <div style={{ fontSize: "11px", fontWeight: "800", color: C.muted, letterSpacing: "1px", marginBottom: "14px" }}>QUÉ PUEDES HACER</div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
      {ONBOARDING_FEATURES.map((f, i) => (
        <div key={i} style={{ background: C.card, borderRadius: "20px", padding: "18px", boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize: "22px", marginBottom: "10px" }}>{f.icon}</div>
          <div style={{ fontSize: "13px", fontWeight: "800", color: C.text, marginBottom: "5px" }}>{f.title}</div>
          <div style={{ fontSize: "12px", color: C.muted, lineHeight: "1.55" }}>{f.desc}</div>
        </div>
      ))}
    </div>
  </div>
);

// ─── Tags Panel ───────────────────────────────────────────────────────
const TAG_COLORS = ["#6366F1","#EC4899","#14B8A6","#F59E0B","#EF4444","#8B5CF6","#06B6D4","#84CC16"];
const tagColor = (t) => TAG_COLORS[Math.abs(t.split("").reduce((a,c)=>a+c.charCodeAt(0),0)) % TAG_COLORS.length];

const TagsPanel = ({ idea, onSave }) => {
  const [newTag, setNewTag] = useState("");
  const tags = idea.tags || [];
  const add = () => {
    const t = newTag.trim().toLowerCase().replace(/\s+/g, "-");
    if (!t || tags.includes(t)) { setNewTag(""); return; }
    onSave([...tags, t]);
    setNewTag("");
  };
  return (
    <div style={{ marginTop: "16px", background: C.bg, borderRadius: "24px", padding: "22px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
        <div style={{ width: "32px", height: "32px", borderRadius: "12px", background: C.yellow, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", color: "#fff" }}>🏷</div>
        <span style={{ fontSize: "14px", fontWeight: "700", color: C.text }}>Tags</span>
      </div>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "14px", minHeight: "28px" }}>
        {tags.length === 0 && <span style={{ fontSize: "13px", color: C.muted }}>Sin tags aún</span>}
        {tags.map(t => (
          <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "5px 12px", borderRadius: "100px", background: tagColor(t) + "18", border: `1px solid ${tagColor(t)}40`, fontSize: "12px", fontWeight: "600", color: tagColor(t) }}>
            #{t}
            <button onClick={() => onSave(tags.filter(x => x !== t))} style={{ background: "none", border: "none", cursor: "pointer", color: tagColor(t), fontSize: "14px", lineHeight: 1, padding: 0, opacity: 0.7 }}>×</button>
          </span>
        ))}
      </div>
      <div style={{ display: "flex", gap: "8px" }}>
        <input value={newTag} onChange={e => setNewTag(e.target.value)} onKeyDown={e => e.key === "Enter" && add()} placeholder="nuevo-tag..."
          style={{ flex: 1, background: C.card, border: "none", borderRadius: "12px", padding: "10px 14px", fontSize: "13px", color: C.text, fontFamily: "inherit" }} />
        <button onClick={add} style={{ background: C.yellow, color: "#fff", border: "none", borderRadius: "12px", padding: "10px 18px", fontSize: "14px", fontWeight: "800", cursor: "pointer" }}>+</button>
      </div>
    </div>
  );
};

// ─── Attachments Panel ────────────────────────────────────────────────
const AttachmentsPanel = ({ idea, onSave }) => {
  const attachments = idea.attachments || [];
  const dropRef = useRef(null);
  const fileRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const processFiles = (files) => {
    Array.from(files).forEach(file => {
      if (file.size > 2 * 1024 * 1024) { alert(`"${file.name}" supera 2MB. Solo archivos menores a 2MB.`); return; }
      const reader = new FileReader();
      reader.onload = (e) => {
        const att = { id: genId(), name: file.name, type: file.type, size: file.size, date: toYMD(today()), data: file.type.startsWith("image/") ? e.target.result : null };
        onSave([...attachments, att]);
      };
      if (file.type.startsWith("image/")) reader.readAsDataURL(file);
      else { const att = { id: genId(), name: file.name, type: file.type, size: file.size, date: toYMD(today()), data: null }; onSave([...attachments, att]); }
    });
  };

  const fmt = (bytes) => bytes < 1024 ? `${bytes}B` : bytes < 1024*1024 ? `${(bytes/1024).toFixed(0)}KB` : `${(bytes/1024/1024).toFixed(1)}MB`;

  return (
    <div style={{ marginTop: "16px", background: C.bg, borderRadius: "24px", padding: "22px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
        <div style={{ width: "32px", height: "32px", borderRadius: "12px", background: C.navy, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", color: "#fff" }}>📎</div>
        <span style={{ fontSize: "14px", fontWeight: "700", color: C.text }}>Archivos</span>
        <span style={{ fontSize: "11px", color: C.muted }}>máx 2MB</span>
      </div>
      <div ref={dropRef}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); processFiles(e.dataTransfer.files); }}
        onClick={() => fileRef.current?.click()}
        style={{ border: `2px dashed ${dragging ? C.navy : C.line}`, borderRadius: "18px", padding: "28px", textAlign: "center", cursor: "pointer", background: dragging ? C.navy + "08" : "transparent", marginBottom: "14px", transition: "all 0.2s" }}>
        <div style={{ fontSize: "24px", marginBottom: "8px" }}>📂</div>
        <div style={{ fontSize: "13px", fontWeight: "600", color: dragging ? C.navy : C.muted }}>Arrastra archivos aquí o toca para seleccionar</div>
        <div style={{ fontSize: "11px", color: C.muted, marginTop: "4px" }}>Imágenes, PDFs, docs — máx 2MB</div>
        <input ref={fileRef} type="file" multiple style={{ display: "none" }} onChange={e => processFiles(e.target.files)} />
      </div>
      {attachments.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {attachments.map(a => (
            <div key={a.id} style={{ background: C.card, borderRadius: "14px", padding: "12px 14px", display: "flex", gap: "12px", alignItems: "center" }}>
              {a.data ? <img src={a.data} alt={a.name} style={{ width: "40px", height: "40px", borderRadius: "10px", objectFit: "cover", flexShrink: 0 }} /> : <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", flexShrink: 0 }}>📄</div>}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "13px", fontWeight: "600", color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</div>
                <div style={{ fontSize: "11px", color: C.muted }}>{fmt(a.size)} · {a.date}</div>
              </div>
              <button onClick={() => onSave(attachments.filter(x => x.id !== a.id))} style={{ background: "none", border: "none", color: C.muted, fontSize: "18px", cursor: "pointer" }}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Brave Search helper ──────────────────────────────────────────────
const braveSearch = async (query, apiKey) => {
  const res = await fetch(
    `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=6&search_lang=en`,
    { headers: { "Accept": "application/json", "X-Subscription-Token": apiKey } }
  );
  if (!res.ok) throw new Error(`Brave error ${res.status}`);
  const d = await res.json();
  return (d.web?.results || []).map(r => ({ title: r.title, url: r.url, desc: r.description || "" }));
};

// ─── Similar Ideas Modal ──────────────────────────────────────────────
const SimilarIdeasModal = ({ idea, onClose }) => {
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);

  const [braveKey, setBraveKey]   = useState(() => localStorage.getItem("braveKey") || "");
  const [keyInput, setKeyInput]   = useState("");
  const [step,     setStep]       = useState("");

  const saveKey = () => {
    const k = keyInput.trim();
    if (!k) return;
    localStorage.setItem("braveKey", k);
    setBraveKey(k);
  };

  const runSearch = async (key) => {
    setLoading(true);
    try {
      setStep("Buscando en internet...");
      const q1 = `${idea.title} alternatives competitors`;
      const q2 = `${idea.venture} ${idea.type} startup tools software`;
      const [r1, r2] = await Promise.all([braveSearch(q1, key), braveSearch(q2, key)]);
      const allResults = [...r1, ...r2].slice(0, 10);

      const webContext = allResults.map((r, i) =>
        `[${i + 1}] ${r.title}\n    URL: ${r.url}\n    ${r.desc}`
      ).join("\n\n");

      setStep("Claude analizando resultados...");
      const raw = await callClaude(
        `Eres un experto en productos digitales y startups. Se te dan resultados reales de búsqueda web sobre una idea. Analiza qué competidores o soluciones similares existen HOY en el mercado.

Responde SOLO en JSON válido:
{
  "similares": [
    {
      "nombre": "nombre del producto",
      "url": "URL del sitio",
      "descripcion": "qué hace en 1 oración",
      "similitud": "por qué compite con la idea del usuario",
      "pros": ["lo que hacen bien 1", "lo que hacen bien 2"],
      "contras": ["su debilidad 1", "su debilidad 2"],
      "modelo_negocio": "cómo monetizan"
    }
  ],
  "saturacion": "Alta | Media | Baja",
  "diferenciadores_clave": ["cómo diferenciarse concretamente"],
  "version_mejorada": {
    "titulo": "nombre mejorado",
    "descripcion": "pitch de 2 oraciones aprendiendo del mercado real",
    "ventaja_injusta": "por qué Renato con su stack (Claude, Supabase, n8n, contexto México) puede ganar",
    "mejoras": ["mejora aprendida 1", "mejora 2", "mejora 3"]
  }
}
Máximo 4 similares, solo los más relevantes de los resultados.`,
        `MI IDEA:\nTítulo: ${idea.title}\nVenture: ${idea.venture}\nDescripción: ${idea.description || "Sin descripción"}\n\nRESULTADOS REALES DE BÚSQUEDA WEB (hoy):\n\n${webContext}`
      );
      const cleaned = raw.replace(/```json|```/g, "").trim();
      setResult(JSON.parse(cleaned));
    } catch (e) {
      if (e.message?.includes("401") || e.message?.includes("403")) {
        setResult({ errorKey: true });
      } else {
        setResult({ error: true });
      }
    }
    setStep("");
    setLoading(false);
  };

  useEffect(() => { if (braveKey) runSearch(braveKey); }, [braveKey]);

  const satColor = { "Alta": C.rose, "Media": C.brown, "Baja": C.green };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 2000, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.card, borderRadius: "28px 28px 0 0", padding: "28px 24px 52px", width: "100%", maxWidth: "540px", maxHeight: "88vh", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
          <div>
            <div style={{ fontSize: "18px", fontWeight: "800", color: C.text }}>🔍 Mercado existente</div>
            <div style={{ fontSize: "13px", color: C.muted, marginTop: "2px" }}>{idea.title}</div>
          </div>
          <button onClick={onClose} style={{ background: C.bg, border: "none", borderRadius: "100px", padding: "8px 16px", fontSize: "13px", color: C.muted, cursor: "pointer" }}>Cerrar</button>
        </div>
        <div style={{ fontSize: "11px", color: C.muted, marginBottom: "20px" }}>Brave busca en internet hoy · Claude analiza los resultados</div>

        {/* Sin API key — formulario */}
        {!braveKey && !loading && (
          <div style={{ background: C.bg, borderRadius: "22px", padding: "24px" }}>
            <div style={{ fontSize: "14px", fontWeight: "700", color: C.text, marginBottom: "6px" }}>Conecta Brave Search</div>
            <div style={{ fontSize: "13px", color: C.muted, lineHeight: "1.6", marginBottom: "16px" }}>
              Crea tu cuenta gratis en <span style={{ color: C.navy, fontWeight: "700" }}>api.search.brave.com</span> y pega tu API key aquí. 2,000 búsquedas/mes gratis.
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <input value={keyInput} onChange={e => setKeyInput(e.target.value)} onKeyDown={e => e.key === "Enter" && saveKey()}
                placeholder="BSA..."
                style={{ flex: 1, background: C.card, border: `1.5px solid ${C.line}`, borderRadius: "14px", padding: "12px 16px", fontSize: "13px", color: C.text, fontFamily: "inherit" }} />
              <button onClick={saveKey} style={{ background: C.navy, color: "#fff", border: "none", borderRadius: "14px", padding: "12px 20px", fontSize: "13px", fontWeight: "800", cursor: "pointer" }}>
                Guardar
              </button>
            </div>
          </div>
        )}

        {loading && (
          <div style={{ textAlign: "center", padding: "48px 0" }}>
            <Spin size={32} color={C.navy} />
            <div style={{ fontSize: "13px", color: C.muted, marginTop: "16px" }}>{step || "Procesando..."}</div>
          </div>
        )}
        {result?.errorKey && (
          <div style={{ background: "#FEF0F0", borderRadius: "16px", padding: "16px" }}>
            <div style={{ fontSize: "13px", color: C.rose, fontWeight: "700", marginBottom: "6px" }}>API key inválida</div>
            <div style={{ fontSize: "12px", color: C.muted, marginBottom: "12px" }}>Verifica tu key en api.search.brave.com</div>
            <button onClick={() => { localStorage.removeItem("braveKey"); setBraveKey(""); setResult(null); setKeyInput(""); }}
              style={{ background: C.rose, color: "#fff", border: "none", borderRadius: "100px", padding: "8px 16px", fontSize: "12px", fontWeight: "700", cursor: "pointer" }}>
              Cambiar key
            </button>
          </div>
        )}
        {result?.error && <div style={{ color: C.rose, fontSize: "14px", padding: "16px" }}>Error al analizar. Intenta de nuevo.</div>}
        {result && !result.error && (
          <>
            {/* Saturación */}
            {result.saturacion && (
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px", padding: "12px 16px", borderRadius: "16px", background: (satColor[result.saturacion] || C.navy) + "15" }}>
                <span style={{ fontSize: "13px", fontWeight: "700", color: satColor[result.saturacion] || C.navy }}>Saturación del mercado: {result.saturacion}</span>
              </div>
            )}

            {/* Similares reales */}
            {result.similares?.length > 0 && (
              <div style={{ marginBottom: "24px" }}>
                <div style={{ fontSize: "11px", fontWeight: "800", color: C.muted, letterSpacing: "1px", marginBottom: "12px" }}>PRODUCTOS/STARTUPS QUE YA EXISTEN</div>
                {result.similares.map((s, i) => (
                  <div key={i} style={{ background: C.bg, borderRadius: "18px", padding: "16px", marginBottom: "10px" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "6px" }}>
                      <div style={{ fontSize: "15px", fontWeight: "800", color: C.text }}>{s.nombre}</div>
                      {s.url && <span style={{ fontSize: "11px", color: C.navy, fontWeight: "600" }}>{s.url}</span>}
                    </div>
                    {s.modelo_negocio && <div style={{ fontSize: "11px", color: C.purple, fontWeight: "700", marginBottom: "6px" }}>💰 {s.modelo_negocio}</div>}
                    <div style={{ fontSize: "13px", color: C.sub, marginBottom: "10px", lineHeight: "1.6" }}>{s.similitud}</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                      <div>
                        <div style={{ fontSize: "10px", fontWeight: "800", color: C.green, marginBottom: "4px" }}>LO QUE HACEN BIEN</div>
                        {s.pros?.map((p, j) => <div key={j} style={{ fontSize: "12px", color: C.sub, lineHeight: "1.5" }}>✓ {p}</div>)}
                      </div>
                      <div>
                        <div style={{ fontSize: "10px", fontWeight: "800", color: C.rose, marginBottom: "4px" }}>SUS DEBILIDADES</div>
                        {s.contras?.map((c, j) => <div key={j} style={{ fontSize: "12px", color: C.sub, lineHeight: "1.5" }}>✗ {c}</div>)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Diferenciadores */}
            {result.diferenciadores_clave?.length > 0 && (
              <div style={{ background: C.bg, borderRadius: "18px", padding: "16px", marginBottom: "16px" }}>
                <div style={{ fontSize: "11px", fontWeight: "800", color: C.navy, letterSpacing: "1px", marginBottom: "10px" }}>CÓMO DIFERENCIARTE</div>
                {result.diferenciadores_clave.map((d, i) => (
                  <div key={i} style={{ display: "flex", gap: "8px", marginBottom: "6px" }}>
                    <span style={{ color: C.navy, flexShrink: 0 }}>→</span>
                    <span style={{ fontSize: "13px", color: C.sub, lineHeight: "1.6" }}>{d}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Versión mejorada */}
            {result.version_mejorada && (
              <div style={{ background: `linear-gradient(135deg, ${C.navy}, #4A5FBB)`, borderRadius: "22px", padding: "22px" }}>
                <div style={{ fontSize: "11px", fontWeight: "800", color: "rgba(255,255,255,0.5)", letterSpacing: "1px", marginBottom: "10px" }}>✦ VERSIÓN MEJORADA CON LO APRENDIDO</div>
                <div style={{ fontSize: "17px", fontWeight: "800", color: "#fff", marginBottom: "8px" }}>{result.version_mejorada.titulo}</div>
                <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.85)", lineHeight: "1.65", marginBottom: "14px" }}>{result.version_mejorada.descripcion}</div>
                {result.version_mejorada.ventaja_injusta && (
                  <div style={{ background: "rgba(255,255,255,0.12)", borderRadius: "14px", padding: "12px", marginBottom: "12px" }}>
                    <div style={{ fontSize: "10px", fontWeight: "800", color: C.yellow, marginBottom: "4px" }}>TU VENTAJA INJUSTA</div>
                    <div style={{ fontSize: "13px", color: "#fff" }}>{result.version_mejorada.ventaja_injusta}</div>
                  </div>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {result.version_mejorada.mejoras?.map((m, i) => (
                    <div key={i} style={{ display: "flex", gap: "8px" }}>
                      <span style={{ color: C.yellow }}>→</span>
                      <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.85)" }}>{m}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <button onClick={() => { localStorage.removeItem("braveKey"); setBraveKey(""); setResult(null); setKeyInput(""); }}
              style={{ background: "none", border: "none", fontSize: "11px", color: C.muted, cursor: "pointer", marginTop: "16px" }}>
              Cambiar API key de Brave
            </button>
          </>
        )}
      </div>
    </div>
  );
};

// ─── Compare Modal ────────────────────────────────────────────────────
const CompareModal = ({ ideas, onClose }) => {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const compare = async () => {
      const list = ideas.map((i, idx) => `IDEA ${idx + 1}: "${i.title}" (${i.venture}, ${i.type})\n${i.description}`).join("\n\n");
      try {
        const raw = await callClaude(
          SYSTEM + ` Compara estas ideas y determina cuál tiene más potencial. Responde SOLO en JSON: {"ganadora":{"titulo":"...","razon":"..."},"tabla":[{"idea":"...","potencial":0,"esfuerzo":0,"mercado":0,"diferenciacion":0}],"veredicto":"...","siguiente_paso":"..."}. Los scores son del 1-10.`,
          list
        );
        const cleaned = raw.replace(/```json|```/g, "").trim();
        setResult(JSON.parse(cleaned));
      } catch { setResult({ error: true }); }
      setLoading(false);
    };
    compare();
  }, []);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 2000, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.card, borderRadius: "28px 28px 0 0", padding: "28px 24px 52px", width: "100%", maxWidth: "540px", maxHeight: "85vh", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
          <div>
            <div style={{ fontSize: "18px", fontWeight: "800", color: C.text }}>⚖ Comparar ideas</div>
            <div style={{ fontSize: "13px", color: C.muted }}>{ideas.length} ideas seleccionadas</div>
          </div>
          <button onClick={onClose} style={{ background: C.bg, border: "none", borderRadius: "100px", padding: "8px 16px", fontSize: "13px", color: C.muted, cursor: "pointer" }}>Cerrar</button>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "20px" }}>
          {ideas.map(i => { const vm2 = getVM(i.venture); return <span key={i.id} style={{ padding: "6px 14px", borderRadius: "100px", background: vm2.light, color: vm2.color, fontSize: "12px", fontWeight: "700" }}>{i.title}</span>; })}
        </div>
        {loading && <div style={{ textAlign: "center", padding: "48px 0" }}><Spin size={32} color={C.navy} /><div style={{ fontSize: "13px", color: C.muted, marginTop: "16px" }}>Comparando con Claude...</div></div>}
        {result?.error && <div style={{ color: C.rose, fontSize: "14px" }}>Error al comparar. Intenta de nuevo.</div>}
        {result && !result.error && (
          <>
            {result.ganadora && (
              <div style={{ background: `linear-gradient(135deg, ${C.navy}, #4A5FBB)`, borderRadius: "22px", padding: "22px", marginBottom: "20px" }}>
                <div style={{ fontSize: "11px", fontWeight: "800", color: "rgba(255,255,255,0.5)", letterSpacing: "1px", marginBottom: "8px" }}>🏆 GANADORA</div>
                <div style={{ fontSize: "18px", fontWeight: "800", color: "#fff", marginBottom: "8px" }}>{result.ganadora.titulo}</div>
                <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.8)", lineHeight: "1.65" }}>{result.ganadora.razon}</div>
              </div>
            )}
            {result.tabla?.length > 0 && (
              <div style={{ marginBottom: "20px" }}>
                <div style={{ fontSize: "11px", fontWeight: "800", color: C.muted, letterSpacing: "1px", marginBottom: "12px" }}>SCORES (1-10)</div>
                {result.tabla.map((row, i) => (
                  <div key={i} style={{ background: C.bg, borderRadius: "16px", padding: "14px", marginBottom: "8px" }}>
                    <div style={{ fontSize: "13px", fontWeight: "700", color: C.text, marginBottom: "10px" }}>{row.idea}</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                      {[["Potencial", row.potencial, C.navy], ["Esfuerzo", row.esfuerzo, C.orange], ["Mercado", row.mercado, C.green], ["Diferenciación", row.diferenciacion, C.purple]].map(([lbl, val, color]) => (
                        <div key={lbl}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                            <span style={{ fontSize: "11px", color: C.muted }}>{lbl}</span>
                            <span style={{ fontSize: "12px", fontWeight: "800", color }}>{val}/10</span>
                          </div>
                          <div style={{ height: "5px", background: C.line, borderRadius: "3px" }}>
                            <div style={{ height: "100%", width: `${(val / 10) * 100}%`, background: color, borderRadius: "3px" }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {result.veredicto && <div style={{ background: C.bg, borderRadius: "18px", padding: "18px", marginBottom: "12px" }}><div style={{ fontSize: "11px", fontWeight: "800", color: C.muted, letterSpacing: "1px", marginBottom: "8px" }}>VEREDICTO</div><p style={{ fontSize: "14px", color: C.sub, lineHeight: "1.7" }}>{result.veredicto}</p></div>}
            {result.siguiente_paso && <div style={{ background: C.navy, borderRadius: "18px", padding: "18px" }}><div style={{ fontSize: "11px", fontWeight: "800", color: "rgba(255,255,255,0.5)", letterSpacing: "1px", marginBottom: "8px" }}>SIGUIENTE PASO</div><p style={{ fontSize: "14px", color: "#fff", lineHeight: "1.7" }}>{result.siguiente_paso}</p></div>}
          </>
        )}
      </div>
    </div>
  );
};

// ─── Voice Capture ────────────────────────────────────────────────────
const VoiceCapture = ({ onCapture, onClose }) => {
  const [listening,  setListening]  = useState(false);
  const [transcript, setTranscript] = useState("");
  const [parsing,    setParsing]    = useState(false);
  const [error,      setError]      = useState("");
  const recRef = useRef(null);

  const start = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setError("Usa Safari en iOS para captura de voz."); return; }
    const rec = new SR();
    rec.lang = "es-MX"; rec.continuous = false; rec.interimResults = true;
    rec.onstart  = () => setListening(true);
    rec.onresult = e => setTranscript(Array.from(e.results).map(r => r[0].transcript).join(""));
    rec.onerror  = e => setError("Error: " + e.error);
    rec.onend    = () => setListening(false);
    recRef.current = rec; rec.start();
  };

  const handleUse = async () => {
    setParsing(true);
    try {
      const raw = await callClaude(
        `Extrae el título y la descripción de una idea de negocio/tecnología a partir de lo que el usuario dijo por voz. El título debe ser corto (3-6 palabras), la descripción debe ser 1-2 oraciones explicando de qué trata. Responde SOLO en JSON válido: {"title":"...","description":"..."}`,
        transcript
      );
      const cleaned = raw.replace(/```json|```/g, "").trim();
      const parsed  = JSON.parse(cleaned);
      onCapture({ title: parsed.title || transcript, description: parsed.description || "" });
    } catch {
      onCapture({ title: transcript, description: "" });
    }
    setParsing(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 2000, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.card, borderRadius: "28px 28px 0 0", padding: "36px 28px 52px", width: "100%", maxWidth: "480px", textAlign: "center" }}>
        <div style={{ fontSize: "20px", fontWeight: "800", color: C.text, marginBottom: "6px" }}>Captura por voz</div>
        <div style={{ fontSize: "14px", color: C.muted, marginBottom: "32px" }}>Di el nombre de la idea y de qué trata</div>
        <button onClick={listening ? () => recRef.current?.stop() : start}
          style={{ width: "88px", height: "88px", borderRadius: "50%", background: listening ? C.rose : C.navy, border: "none", fontSize: "32px", cursor: "pointer", marginBottom: "20px", boxShadow: listening ? `0 8px 32px ${C.rose}50` : `0 8px 32px ${C.navy}40`, animation: listening ? "pulse 1.4s infinite" : "none" }}>
          🎙
        </button>
        <div style={{ fontSize: "14px", fontWeight: "600", color: listening ? C.rose : C.muted, marginBottom: "20px" }}>{listening ? "Escuchando..." : "Toca para grabar"}</div>
        {transcript && (
          <div style={{ background: C.bg, borderRadius: "18px", padding: "18px", marginBottom: "20px", fontSize: "16px", color: C.text, fontWeight: "600", lineHeight: "1.5" }}>{transcript}</div>
        )}
        {error && <div style={{ color: C.rose, fontSize: "13px", marginBottom: "16px" }}>{error}</div>}
        {transcript && (
          <div style={{ display: "flex", gap: "12px" }}>
            <button onClick={onClose} disabled={parsing} style={{ flex: 1, background: C.bg, color: C.muted, border: "none", borderRadius: "100px", padding: "14px", fontSize: "14px", fontWeight: "600", cursor: "pointer" }}>Cancelar</button>
            <button onClick={handleUse} disabled={parsing}
              style={{ flex: 2, background: C.navy, color: "#fff", border: "none", borderRadius: "100px", padding: "14px", fontSize: "14px", fontWeight: "800", cursor: parsing ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", opacity: parsing ? 0.8 : 1 }}>
              {parsing ? <><Spin size={14} color="#fff" /> Procesando...</> : "Usar esta →"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── View Toggle — macOS style ───────────────────────────────────────
const VIEW_OPTIONS = [
  { id: "cards",  icon: "⊞", label: "Como tarjetas" },
  { id: "list",   icon: "≡", label: "Como lista"    },
  { id: "kanban", icon: "⋮⋮", label: "Como columnas" },
];

const ViewToggle = ({ view, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = VIEW_OPTIONS.find(v => v.id === view);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ height: "46px", padding: "0 16px", borderRadius: "14px", background: C.card, border: `1.5px solid ${open ? C.navy : C.line}`, fontSize: "14px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", color: C.text, fontWeight: "600", fontFamily: "inherit", boxShadow: "0 1px 6px rgba(0,0,0,0.06)", transition: "border 0.15s", whiteSpace: "nowrap" }}>
        <span style={{ fontSize: "16px" }}>{current.icon}</span>
        <span style={{ fontSize: "13px" }}>{current.label}</span>
        <span style={{ fontSize: "10px", color: C.muted, marginLeft: "2px" }}>▾</span>
      </button>

      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, background: "rgba(255,255,255,0.95)", backdropFilter: "blur(20px)", borderRadius: "14px", padding: "6px", boxShadow: "0 8px 32px rgba(0,0,0,0.16)", border: `1px solid ${C.line}`, zIndex: 500, minWidth: "190px" }}>
          {VIEW_OPTIONS.map(opt => (
            <button key={opt.id} onClick={() => { onChange(opt.id); setOpen(false); }}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: "12px", padding: "10px 14px", borderRadius: "10px", border: "none", background: view === opt.id ? C.navy + "12" : "transparent", cursor: "pointer", fontFamily: "inherit", textAlign: "left", transition: "background 0.1s" }}
              onMouseEnter={e => { if (view !== opt.id) e.currentTarget.style.background = C.bg; }}
              onMouseLeave={e => { if (view !== opt.id) e.currentTarget.style.background = "transparent"; }}>
              <span style={{ fontSize: "16px", width: "20px", textAlign: "center" }}>{view === opt.id ? "✓" : ""}</span>
              <span style={{ fontSize: "14px", fontWeight: view === opt.id ? "700" : "500", color: view === opt.id ? C.navy : C.text }}>{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Chat Panel (Desarrollar con Claude) ─────────────────────────────
const ChatPanel = ({ idea, onSaveChat }) => {
  const [msgs,       setMsgs]       = useState(idea.chatHistory || []);
  const [input,      setInput]      = useState("");
  const [loading,    setLoading]    = useState(false);
  const [chatMode,   setChatMode]   = useState("libre");
  const [summary,    setSummary]    = useState(null);
  const [summarizing,setSummarizing]= useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const modeSystem = CHAT_MODES.find(m => m.id === chatMode)?.sys || "";

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", content: input.trim(), ts: new Date().toISOString() };
    const history = [...msgs, userMsg];
    setMsgs(history); setInput(""); setLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1500,
          system: SYSTEM + `\n\nEstás desarrollando esta idea con Renato:\n• Título: ${idea.title}\n• Descripción: ${idea.description}\n• Venture: ${idea.venture}\n• Tipo: ${idea.type}\n• Estado: ${idea.status}` + modeSystem,
          messages: history.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const d = await res.json();
      const reply = d.content?.find(b => b.type === "text")?.text || "Sin respuesta";
      const aiMsg = { role: "assistant", content: reply, ts: new Date().toISOString() };
      const finalHistory = [...history, aiMsg];
      setMsgs(finalHistory);
      onSaveChat(finalHistory);
    } catch { setMsgs(m => [...m, { role: "assistant", content: "Error al conectar con Claude.", ts: new Date().toISOString() }]); }
    setLoading(false);
  };

  const clearChat = () => { setMsgs([]); setSummary(null); onSaveChat([]); };

  const doSummarize = async () => {
    setSummarizing(true);
    try {
      const history = msgs.map(m => `${m.role === "user" ? "Renato" : "Claude"}: ${m.content}`).join("\n\n");
      const raw = await callClaude(
        "Genera un resumen conciso (3-5 puntos clave) de esta conversación sobre una idea. Sin fluff, solo lo más importante discutido.",
        history
      );
      setSummary(raw);
    } catch {}
    setSummarizing(false);
  };

  const SUGGESTIONS = ["¿Por dónde empiezo hoy?", "¿Cómo se monetiza?", "¿Cuáles son los riesgos reales?", "Dame un nombre para esto", "¿Cómo lo construyo con Claude + Supabase?"];

  return (
    <div style={{ marginTop: "16px", background: "#F8F7FF", borderRadius: "24px", padding: "20px", border: `1px solid ${C.purple}20` }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
        <div style={{ width: "32px", height: "32px", borderRadius: "12px", background: C.navy, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", color: "#fff", fontWeight: "800" }}>✦</div>
        <span style={{ fontSize: "14px", fontWeight: "700", color: C.text }}>Desarrollar con Claude</span>
        {msgs.length > 0 && <span style={{ fontSize: "11px", color: C.muted }}>{msgs.length} msgs</span>}
        {msgs.length >= 8 && !summary && (
          <button onClick={doSummarize} disabled={summarizing} style={{ marginLeft: "auto", background: C.purple + "15", border: "none", borderRadius: "100px", padding: "5px 12px", fontSize: "11px", fontWeight: "700", color: C.purple, cursor: "pointer", display: "flex", alignItems: "center", gap: "5px" }}>
            {summarizing ? <Spin size={10} color={C.purple} /> : "⚡"} Resumir
          </button>
        )}
        {msgs.length > 0 && <button onClick={clearChat} style={{ marginLeft: msgs.length < 8 ? "auto" : "0", background: "none", border: "none", fontSize: "11px", color: C.muted, cursor: "pointer", fontWeight: "600" }}>Limpiar</button>}
      </div>

      {/* Mode selector */}
      <div style={{ display: "flex", gap: "6px", overflowX: "auto", marginBottom: "14px", paddingBottom: "2px" }}>
        {CHAT_MODES.map(m => (
          <button key={m.id} onClick={() => setChatMode(m.id)}
            style={{ padding: "6px 14px", borderRadius: "100px", background: chatMode === m.id ? C.navy : C.card, color: chatMode === m.id ? "#fff" : C.muted, border: "none", cursor: "pointer", fontSize: "12px", fontWeight: "700", whiteSpace: "nowrap", transition: "all 0.2s", flexShrink: 0 }}>
            {m.label}
          </button>
        ))}
      </div>

      {/* Auto summary */}
      {summary && (
        <div style={{ background: C.purple + "12", borderRadius: "16px", padding: "14px", marginBottom: "14px", border: `1px solid ${C.purple}25` }}>
          <div style={{ fontSize: "10px", fontWeight: "800", color: C.purple, letterSpacing: "1px", marginBottom: "8px" }}>RESUMEN DE CONVERSACIÓN</div>
          <p style={{ fontSize: "13px", color: C.sub, lineHeight: "1.65", whiteSpace: "pre-wrap" }}>{summary}</p>
          <button onClick={() => setSummary(null)} style={{ background: "none", border: "none", fontSize: "11px", color: C.muted, cursor: "pointer", marginTop: "6px" }}>Ocultar</button>
        </div>
      )}

      {msgs.length === 0 && (
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
          {SUGGESTIONS.map((s, i) => (
            <button key={i} onClick={() => setInput(s)}
              style={{ padding: "8px 14px", borderRadius: "100px", background: C.card, border: `1px solid ${C.line}`, fontSize: "12px", fontWeight: "600", color: C.sub, cursor: "pointer", whiteSpace: "nowrap" }}>
              {s}
            </button>
          ))}
        </div>
      )}

      {msgs.length > 0 && (
        <div style={{ maxHeight: "360px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px", marginBottom: "14px" }}>
          {msgs.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
              <div style={{ maxWidth: "85%", padding: "12px 16px", borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px", background: m.role === "user" ? C.navy : C.card, color: m.role === "user" ? "#fff" : C.text, fontSize: "13px", lineHeight: "1.65", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", whiteSpace: "pre-wrap" }}>
                {m.content}
                {m.ts && <div style={{ fontSize: "10px", opacity: 0.5, marginTop: "4px", textAlign: m.role === "user" ? "right" : "left" }}>{new Date(m.ts).toLocaleDateString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</div>}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: "flex" }}>
              <div style={{ padding: "12px 16px", borderRadius: "18px 18px 18px 4px", background: C.card, display: "flex", gap: "6px", alignItems: "center" }}>
                <Spin size={12} color={C.navy} /><span style={{ fontSize: "12px", color: C.muted }}>Pensando...</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      <div style={{ display: "flex", gap: "8px" }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
          placeholder={chatMode === "libre" ? "Pregunta, brainstormea, desarrolla..." : `Modo ${CHAT_MODES.find(m=>m.id===chatMode)?.label} activo...`}
          style={{ flex: 1, background: C.card, border: `1.5px solid ${C.purple}30`, borderRadius: "14px", padding: "12px 16px", fontSize: "13px", color: C.text, fontFamily: "inherit" }} />
        <button onClick={send} disabled={loading || !input.trim()}
          style={{ width: "44px", height: "44px", borderRadius: "14px", background: input.trim() ? C.navy : C.line, border: "none", cursor: input.trim() ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", color: "#fff", flexShrink: 0, transition: "all 0.2s" }}>
          ↑
        </button>
      </div>
    </div>
  );
};

// ─── Idea Card — Niva faithful ────────────────────────────────────────
const IdeaCard = ({ idea, onExpand, onDebate, onDelete, onCycleStatus, onEditDate, onUpdateChecklist, onLogTime, onPresent, onSaveChat, onSaveTags, onSavePriority, onSaveAttachments, loadingAI, loadingDebate, compareMode, selected, onToggleSelect, allIdeas, onOpen }) => {
  const vm = getVM(idea.venture);
  const sm = SM[idea.status];
  const pm = PRIORITY_META[idea.priority || "media"];
  const [panel, setPanel] = useState(null);
  const [showSimilar, setShowSimilar] = useState(false);
  const totalTime = (idea.timeLogs || []).reduce((s, l) => s + (l.hours || 0), 0);

  const toggle = (p) => {
    if (panel === p) { setPanel(null); return; }
    setPanel(p);
    if (p === "analysis") onExpand(idea);
    if (p === "debate")   onDebate(idea);
  };

  return (
    <div style={{ background: C.card, borderRadius: "24px", overflow: "hidden", boxShadow: selected ? `0 0 0 2px ${C.navy}, 0 12px 36px rgba(0,0,0,0.1)` : "0 2px 16px rgba(0,0,0,0.07)", transition: "transform 0.2s, box-shadow 0.2s" }}
      onMouseEnter={e => { if (!selected) { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 12px 36px rgba(0,0,0,0.1)"; }}}
      onMouseLeave={e => { if (!selected) { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 16px rgba(0,0,0,0.07)"; }}}>

      {showSimilar && <SimilarIdeasModal idea={idea} onClose={() => setShowSimilar(false)} />}

      {/* Top color bar */}
      <div style={{ height: "4px", background: `linear-gradient(90deg, ${vm.color}, ${vm.color}30)` }} />

      <div style={{ padding: "22px 22px 20px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
          <Tag label={idea.venture} color={vm.color} bg={vm.light} />
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {compareMode && (
              <button onClick={() => onToggleSelect(idea.id)}
                style={{ width: "24px", height: "24px", borderRadius: "7px", border: `2px solid ${selected ? C.navy : C.line}`, background: selected ? C.navy : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>
                {selected && <span style={{ color: "#fff", fontSize: "12px", fontWeight: "800" }}>✓</span>}
              </button>
            )}
            <button onClick={() => onPresent(idea)} style={{ background: "none", border: "none", color: C.muted, fontSize: "18px", cursor: "pointer", lineHeight: 1 }} title="Modo presentación">⎙</button>
            <button onClick={() => onDelete(idea.id)} style={{ background: "none", border: "none", color: C.line, fontSize: "22px", cursor: "pointer", lineHeight: 1, transition: "color 0.15s" }}
              onMouseEnter={e => e.target.style.color = C.orange} onMouseLeave={e => e.target.style.color = C.line}>×</button>
          </div>
        </div>

        {/* Title + avatar */}
        <div style={{ display: "flex", gap: "14px", alignItems: "flex-start", marginBottom: "10px" }}>
          <div style={{ flex: 1 }}>
            <div onClick={() => onOpen && onOpen(idea.id)}
              style={{ fontSize: "18px", fontWeight: "800", color: C.text, lineHeight: 1.3, letterSpacing: "-0.2px", marginBottom: "6px", cursor: onOpen ? "pointer" : "default" }}
              onMouseEnter={e => { if (onOpen) e.currentTarget.style.color = vm.color; }}
              onMouseLeave={e => { if (onOpen) e.currentTarget.style.color = C.text; }}>
              {idea.title}
            </div>
            {idea.description && <div style={{ fontSize: "13px", color: C.sub, lineHeight: "1.65" }}>{idea.description}</div>}
          </div>
          <AvatarBox letter={vm.letter} color={vm.color} />
        </div>

        {/* Inline tags */}
        {(idea.tags || []).length > 0 && (
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "10px" }}>
            {(idea.tags || []).map(t => (
              <span key={t} style={{ padding: "3px 10px", borderRadius: "100px", background: tagColor(t) + "18", border: `1px solid ${tagColor(t)}35`, fontSize: "11px", fontWeight: "600", color: tagColor(t) }}>#{t}</span>
            ))}
          </div>
        )}

        {/* Meta row */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px", alignItems: "center" }}>
          <button onClick={() => onCycleStatus(idea)} style={{ padding: "6px 14px", borderRadius: "100px", background: sm.bg, color: sm.color, border: "none", cursor: "pointer", fontSize: "12px", fontWeight: "700" }}>{idea.status}</button>
          <button onClick={() => onSavePriority(idea.id, PRIORITIES[(PRIORITIES.indexOf(idea.priority || "media") + 1) % PRIORITIES.length])}
            style={{ padding: "6px 12px", borderRadius: "100px", background: pm.bg, color: pm.color, border: "none", cursor: "pointer", fontSize: "12px", fontWeight: "700" }} title="Click para cambiar prioridad">
            {pm.icon} {pm.label}
          </button>
          <span style={{ padding: "6px 14px", borderRadius: "100px", background: C.bg, color: C.muted, fontSize: "12px", fontWeight: "600" }}>{idea.type}</span>
          {idea.startDate && <span style={{ padding: "6px 14px", borderRadius: "100px", background: "#E8ECF8", color: C.navy, fontSize: "12px", fontWeight: "700" }}>📅 {fmtDate(idea.startDate)}</span>}
          {totalTime > 0 && <span style={{ padding: "6px 14px", borderRadius: "100px", background: "#FEF0EA", color: C.orange, fontSize: "12px", fontWeight: "700" }}>⏱ {totalTime.toFixed(1)}h</span>}
          <button onClick={() => onEditDate(idea)} style={{ padding: "6px 12px", borderRadius: "100px", background: C.bg, color: C.muted, border: "none", cursor: "pointer", fontSize: "12px" }}>📅</button>
          <span style={{ fontSize: "12px", color: C.muted, marginLeft: "auto" }}>{fmtDate(idea.createdAt)}</span>
        </div>

        {/* ── Botón principal: Desarrollar ── */}
        <button onClick={() => toggle("chat")}
          style={{ width: "100%", padding: "14px", borderRadius: "18px", border: "none", background: panel === "chat" ? "#F0EEF8" : `linear-gradient(135deg, ${C.navy}, #4A5FBB)`, color: panel === "chat" ? C.navy : "#fff", fontSize: "14px", fontWeight: "800", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "10px", boxShadow: panel === "chat" ? "none" : `0 4px 16px ${C.navy}40`, transition: "all 0.2s", letterSpacing: "-0.2px" }}>
          <span style={{ fontSize: "16px" }}>✦</span>
          {panel === "chat" ? "Cerrar chat" : "Desarrollar con Claude"}
        </button>

        {/* ── Botones secundarios ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "4px" }}>
          <button onClick={() => toggle("analysis")}
            style={{ padding: "11px", borderRadius: "14px", border: "none", background: panel === "analysis" ? C.bg : C.navy + "15", color: panel === "analysis" ? C.muted : C.navy, fontSize: "12px", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", transition: "all 0.2s" }}>
            {loadingAI ? <Spin size={12} color={C.navy} /> : "✦"} {panel === "analysis" ? "Cerrar" : "Análisis"}
          </button>
          <button onClick={() => toggle("debate")}
            style={{ padding: "11px", borderRadius: "14px", border: "none", background: panel === "debate" ? "#FFF8F8" : C.rose + "15", color: C.rose, fontSize: "12px", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", transition: "all 0.2s" }}>
            {loadingDebate ? <Spin size={12} color={C.rose} /> : "⚔"} {panel === "debate" ? "Cerrar" : "Abogado"}
          </button>
          <button onClick={() => toggle("checklist")}
            style={{ padding: "11px", borderRadius: "14px", border: `1.5px solid ${C.purple}25`, background: panel === "checklist" ? "#F2EDF9" : "transparent", color: C.purple, fontSize: "12px", fontWeight: "700", cursor: "pointer", transition: "all 0.2s" }}>
            ✓ {idea.checklist?.length > 0 ? `${idea.checklist.filter(s => s.done).length}/${idea.checklist.length}` : "Checklist"}
          </button>
          <button onClick={() => toggle("time")}
            style={{ padding: "11px", borderRadius: "14px", border: `1.5px solid ${C.orange}25`, background: panel === "time" ? "#FEF0EA" : "transparent", color: C.orange, fontSize: "12px", fontWeight: "700", cursor: "pointer", transition: "all 0.2s" }}>
            ⏱ {totalTime > 0 ? `${totalTime.toFixed(1)}h` : "Tiempo"}
          </button>
          <button onClick={() => toggle("tags")}
            style={{ padding: "11px", borderRadius: "14px", border: `1.5px solid ${C.yellow}40`, background: panel === "tags" ? "#FEF9E8" : "transparent", color: C.brown, fontSize: "12px", fontWeight: "700", cursor: "pointer", transition: "all 0.2s" }}>
            🏷 Tags {(idea.tags || []).length > 0 ? `(${idea.tags.length})` : ""}
          </button>
          <button onClick={() => toggle("files")}
            style={{ padding: "11px", borderRadius: "14px", border: `1.5px solid ${C.navy}20`, background: panel === "files" ? "#E8ECF8" : "transparent", color: C.navy, fontSize: "12px", fontWeight: "700", cursor: "pointer", transition: "all 0.2s" }}>
            📎 {(idea.attachments || []).length > 0 ? `${idea.attachments.length} archivo${idea.attachments.length > 1 ? "s" : ""}` : "Archivos"}
          </button>
        </div>

        {/* Similar button */}
        <button onClick={() => setShowSimilar(true)}
          style={{ width: "100%", marginTop: "8px", padding: "10px", borderRadius: "14px", border: `1.5px solid ${C.line}`, background: "transparent", color: C.muted, fontSize: "12px", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
          🔍 Buscar ideas similares y mejorar
        </button>

        {/* Panels */}
        {panel === "chat"      && <ChatPanel idea={idea} onSaveChat={msgs => onSaveChat(idea.id, msgs)} />}
        {panel === "analysis" && !loadingAI  && idea.expansion && <AnalysisPanel raw={idea.expansion} />}
        {panel === "analysis" && loadingAI   && <div style={{ display: "flex", justifyContent: "center", padding: "32px" }}><Spin size={28} color={C.navy} /></div>}
        {panel === "debate"   && !loadingDebate && idea.debate && <DebatePanel raw={idea.debate} />}
        {panel === "debate"   && loadingDebate  && <div style={{ display: "flex", justifyContent: "center", padding: "32px" }}><Spin size={28} color={C.rose} /></div>}
        {panel === "checklist" && <Checklist idea={idea} onUpdate={steps => onUpdateChecklist(idea.id, steps)} />}
        {panel === "time"      && <TimeTracker idea={idea} onLog={logs => onLogTime(idea.id, logs)} />}
        {panel === "tags"      && <TagsPanel idea={idea} onSave={tags => onSaveTags(idea.id, tags)} />}
        {panel === "files"     && <AttachmentsPanel idea={idea} onSave={atts => onSaveAttachments(idea.id, atts)} />}
      </div>
    </div>
  );
};

// ─── Agent Panel ─────────────────────────────────────────────────────
const AgentPanel = ({ ideas, onAddIdea }) => {
  const [insight,  setInsight]  = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const [added,    setAdded]    = useState({});

  const AGENT_URL = "/api/agent";

  const fmtWeek = (iso) => {
    if (!iso) return "";
    const d = new Date(iso + "T12:00:00");
    return d.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });
  };

  const load = async (force = false) => {
    setLoading(true); setError(null);
    try {
      const method = force ? "POST" : "GET";
      const body   = force ? JSON.stringify({ ideas: ideas.slice(0, 25).map(i => ({ title: i.title, description: i.description, venture: i.venture, status: i.status })) }) : undefined;
      const res = await fetch(AGENT_URL, {
        method,
        headers: { "Content-Type": "application/json" },
        ...(body ? { body } : {}),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Error del agente");
      setInsight(d.data || d);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const addIdea = (idea) => {
    onAddIdea({ title: idea.titulo, description: `${idea.descripcion} — ${idea.por_que_ahora}`, venture: idea.venture, type: "Artifact", status: "Idea" });
    setAdded(p => ({ ...p, [idea.titulo]: true }));
  };

  return (
    <div style={{ maxWidth: "780px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "28px" }}>
        <div>
          <div style={{ fontSize: "26px", fontWeight: "800", color: C.text, letterSpacing: "-0.4px" }}>✦ Agente</div>
          <div style={{ fontSize: "13px", color: C.muted, marginTop: "3px" }}>
            {insight?.week_start ? `Semana del ${fmtWeek(insight.week_start)}` : "Análisis semanal con IA + tendencias web"}
          </div>
        </div>
        <button onClick={() => load(true)} disabled={loading}
          style={{ background: C.navy, color: "#fff", border: "none", borderRadius: "14px", padding: "11px 20px", fontSize: "13px", fontWeight: "800", cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "8px", opacity: loading ? 0.7 : 1 }}>
          {loading ? <><Spin size={13} color="#fff" /> Analizando...</> : "↻ Ejecutar ahora"}
        </button>
      </div>

      {error && (
        <div style={{ background: "#FEF0F0", border: `1px solid ${C.rose}30`, borderRadius: "18px", padding: "18px", marginBottom: "20px" }}>
          <div style={{ fontSize: "13px", color: C.rose, fontWeight: "700", marginBottom: "4px" }}>Error al ejecutar el agente</div>
          <div style={{ fontSize: "12px", color: C.muted }}>{error}</div>
          <div style={{ fontSize: "12px", color: C.muted, marginTop: "8px" }}>¿Tienes ANTHROPIC_API_KEY configurada en Vercel?</div>
        </div>
      )}

      {loading && !insight && (
        <div style={{ display: "flex", justifyContent: "center", padding: "80px 0", flexDirection: "column", alignItems: "center", gap: "16px" }}>
          <Spin size={36} color={C.navy} />
          <div style={{ fontSize: "14px", color: C.muted }}>Buscando tendencias + analizando tu portafolio...</div>
        </div>
      )}

      {!insight && !loading && !error && (
        <div style={{ textAlign: "center", padding: "64px 0" }}>
          <div style={{ fontSize: "44px", marginBottom: "14px" }}>✦</div>
          <div style={{ fontSize: "18px", fontWeight: "800", color: C.text, marginBottom: "8px" }}>Sin insights esta semana</div>
          <div style={{ fontSize: "14px", color: C.muted, marginBottom: "24px" }}>Dale a "Ejecutar ahora" para generar el análisis</div>
          <button onClick={() => load(true)}
            style={{ background: C.navy, color: "#fff", border: "none", borderRadius: "100px", padding: "14px 28px", fontSize: "14px", fontWeight: "800", cursor: "pointer" }}>
            Ejecutar agente
          </button>
        </div>
      )}

      {insight && (
        <div className="fade">
          {/* 3 Ideas nuevas */}
          {(insight.ideas || []).length > 0 && (
            <div style={{ marginBottom: "24px" }}>
              <div style={{ fontSize: "11px", fontWeight: "800", letterSpacing: "1px", color: C.muted, marginBottom: "14px" }}>💡 IDEAS NUEVAS SUGERIDAS</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {insight.ideas.map((idea, i) => {
                  const vm2 = getVM(idea.venture);
                  const isAdded = added[idea.titulo];
                  return (
                    <div key={i} style={{ background: C.card, borderRadius: "22px", padding: "20px 22px", border: `1px solid ${C.line}`, display: "flex", gap: "16px", alignItems: "flex-start" }}>
                      <div style={{ width: "38px", height: "38px", borderRadius: "12px", background: vm2.light, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontWeight: "800", color: vm2.color, flexShrink: 0 }}>{vm2.letter}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "5px" }}>
                          <span style={{ fontSize: "15px", fontWeight: "800", color: C.text }}>{idea.titulo}</span>
                          <Tag label={idea.venture} color={vm2.color} bg={vm2.light} />
                        </div>
                        <div style={{ fontSize: "13px", color: C.sub, lineHeight: "1.65", marginBottom: "8px" }}>{idea.descripcion}</div>
                        {idea.por_que_ahora && (
                          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: C.yellow + "25", borderRadius: "100px", padding: "4px 12px" }}>
                            <span style={{ fontSize: "11px", fontWeight: "700", color: C.brown }}>⚡ {idea.por_que_ahora}</span>
                          </div>
                        )}
                      </div>
                      <button onClick={() => addIdea(idea)} disabled={isAdded}
                        style={{ flexShrink: 0, background: isAdded ? C.green + "20" : vm2.color, color: isAdded ? C.green : "#fff", border: "none", borderRadius: "12px", padding: "10px 16px", fontSize: "12px", fontWeight: "800", cursor: isAdded ? "default" : "pointer", whiteSpace: "nowrap", transition: "all 0.2s" }}>
                        {isAdded ? "✓ Agregada" : "+ Al lab"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Grid: sinergia + alerta + prioridad */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
            {insight.sinergia && (
              <div style={{ background: C.card, borderRadius: "22px", padding: "20px", border: `1px solid ${C.line}`, gridColumn: "1 / -1" }}>
                <div style={{ fontSize: "11px", fontWeight: "800", color: C.purple, letterSpacing: "0.8px", marginBottom: "10px" }}>🔗 SINERGIA DETECTADA</div>
                <div style={{ fontSize: "14px", fontWeight: "700", color: C.text, marginBottom: "6px" }}>{insight.sinergia.descripcion}</div>
                {(insight.sinergia.ventures || []).length > 0 && (
                  <div style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
                    {insight.sinergia.ventures.map((v, i) => { const vm2 = getVM(v); return <Tag key={i} label={v} color={vm2.color} bg={vm2.light} />; })}
                  </div>
                )}
                {insight.sinergia.accion && (
                  <div style={{ background: C.purple + "12", borderRadius: "12px", padding: "10px 14px" }}>
                    <span style={{ fontSize: "13px", color: C.purple, fontWeight: "600" }}>→ {insight.sinergia.accion}</span>
                  </div>
                )}
              </div>
            )}

            {insight.prioridad && (
              <div style={{ background: `linear-gradient(135deg, ${C.navy}, #4A5FBB)`, borderRadius: "22px", padding: "20px" }}>
                <div style={{ fontSize: "11px", fontWeight: "800", color: "rgba(255,255,255,0.55)", letterSpacing: "0.8px", marginBottom: "10px" }}>🎯 PRIORIDAD DE LA SEMANA</div>
                <div style={{ fontSize: "15px", fontWeight: "800", color: "#fff", marginBottom: "6px" }}>{insight.prioridad.titulo}</div>
                <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.75)", lineHeight: "1.6", marginBottom: "12px" }}>{insight.prioridad.razon}</div>
                {insight.prioridad.primer_paso && (
                  <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: "12px", padding: "10px 14px" }}>
                    <div style={{ fontSize: "10px", fontWeight: "800", color: "rgba(255,255,255,0.5)", marginBottom: "4px" }}>PRIMER PASO</div>
                    <span style={{ fontSize: "13px", color: "#fff", fontWeight: "600" }}>{insight.prioridad.primer_paso}</span>
                  </div>
                )}
              </div>
            )}

            {insight.alerta && (
              <div style={{ background: C.card, borderRadius: "22px", padding: "20px", border: `1.5px solid ${C.rose}25` }}>
                <div style={{ fontSize: "11px", fontWeight: "800", color: C.rose, letterSpacing: "0.8px", marginBottom: "10px" }}>⚠ ALERTA</div>
                <div style={{ fontSize: "14px", fontWeight: "700", color: C.text, marginBottom: "6px" }}>{insight.alerta.titulo}</div>
                <div style={{ fontSize: "13px", color: C.sub, lineHeight: "1.6" }}>{insight.alerta.descripcion}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Idea Detail View ────────────────────────────────────────────────
const IdeaDetailView = ({ idea, onBack, onSaveChat, onExpand, onDebate, onDelete, onCycleStatus, onEditDate, onUpdateChecklist, onLogTime, onSaveTags, onSavePriority, onSaveAttachments, onPresent, loadingAI, loadingDebate }) => {
  const vm = getVM(idea.venture);
  const sm = SM[idea.status];
  const pm = PRIORITY_META[idea.priority || "media"];
  const [panel, setPanel] = useState("chat");
  const [showSimilar, setShowSimilar] = useState(false);
  const totalTime = (idea.timeLogs || []).reduce((s, l) => s + (l.hours || 0), 0);

  const toggle = (p) => {
    if (panel === p) { setPanel(null); return; }
    setPanel(p);
    if (p === "analysis") onExpand(idea);
    if (p === "debate")   onDebate(idea);
  };

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ maxWidth: "820px", margin: "0 auto", padding: "40px 40px 80px" }}>

        {showSimilar && <SimilarIdeasModal idea={idea} onClose={() => setShowSimilar(false)} />}

        <button onClick={onBack}
          style={{ background: C.bg, border: "none", borderRadius: "100px", padding: "10px 20px", fontSize: "13px", fontWeight: "600", color: C.sub, cursor: "pointer", marginBottom: "32px" }}>
          ← Inicio
        </button>

        {/* Color bar */}
        <div style={{ height: "5px", background: `linear-gradient(90deg, ${vm.color}, ${vm.color}25)`, borderRadius: "3px", marginBottom: "28px" }} />

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", marginBottom: "20px" }}>
          <div style={{ flex: 1 }}>
            <Tag label={idea.venture} color={vm.color} bg={vm.light} />
            <h1 style={{ fontSize: "30px", fontWeight: "800", color: C.text, letterSpacing: "-0.5px", lineHeight: 1.25, margin: "12px 0 10px" }}>{idea.title}</h1>
            {idea.description && <p style={{ fontSize: "15px", color: C.sub, lineHeight: "1.75", maxWidth: "580px" }}>{idea.description}</p>}
          </div>
          <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
            <button onClick={() => onPresent(idea)} style={{ background: C.bg, border: "none", borderRadius: "14px", padding: "10px 14px", fontSize: "16px", cursor: "pointer" }} title="Presentación">⎙</button>
            <button onClick={() => { onDelete(idea.id); onBack(); }} style={{ background: "#FEF0F0", border: "none", borderRadius: "14px", padding: "10px 16px", fontSize: "13px", fontWeight: "700", color: C.rose, cursor: "pointer" }}>Eliminar</button>
          </div>
        </div>

        {/* Inline tags */}
        {(idea.tags || []).length > 0 && (
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "14px" }}>
            {idea.tags.map(t => (
              <span key={t} style={{ padding: "4px 12px", borderRadius: "100px", background: tagColor(t) + "18", border: `1px solid ${tagColor(t)}35`, fontSize: "12px", fontWeight: "600", color: tagColor(t) }}>#{t}</span>
            ))}
          </div>
        )}

        {/* Meta row */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center", marginBottom: "28px" }}>
          <button onClick={() => onCycleStatus(idea)} style={{ padding: "7px 16px", borderRadius: "100px", background: sm.bg, color: sm.color, border: "none", cursor: "pointer", fontSize: "13px", fontWeight: "700" }}>{idea.status}</button>
          <button onClick={() => onSavePriority(idea.id, PRIORITIES[(PRIORITIES.indexOf(idea.priority || "media") + 1) % PRIORITIES.length])}
            style={{ padding: "7px 14px", borderRadius: "100px", background: pm.bg, color: pm.color, border: "none", cursor: "pointer", fontSize: "13px", fontWeight: "700" }}>{pm.icon} {pm.label}</button>
          <span style={{ padding: "7px 16px", borderRadius: "100px", background: C.bg, color: C.muted, fontSize: "13px", fontWeight: "600" }}>{idea.type}</span>
          {idea.startDate && <span style={{ padding: "7px 16px", borderRadius: "100px", background: "#E8ECF8", color: C.navy, fontSize: "13px", fontWeight: "700" }}>📅 {fmtDate(idea.startDate)}</span>}
          {totalTime > 0 && <span style={{ padding: "7px 16px", borderRadius: "100px", background: "#FEF0EA", color: C.orange, fontSize: "13px", fontWeight: "700" }}>⏱ {totalTime.toFixed(1)}h</span>}
          <button onClick={() => onEditDate(idea)} style={{ padding: "7px 12px", borderRadius: "100px", background: C.bg, color: C.muted, border: "none", cursor: "pointer", fontSize: "12px" }}>📅 Fecha</button>
        </div>

        <div style={{ height: "1px", background: C.line, marginBottom: "28px" }} />

        {/* ── 3 main action buttons ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "4px" }}>
          <button onClick={() => toggle("chat")}
            style={{ padding: "16px 10px", borderRadius: "20px", border: "none", background: panel === "chat" ? `linear-gradient(135deg, ${C.navy}, #4A5FBB)` : C.navy + "12", color: panel === "chat" ? "#fff" : C.navy, fontSize: "13px", fontWeight: "800", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", boxShadow: panel === "chat" ? `0 4px 18px ${C.navy}40` : "none", transition: "all 0.2s" }}>
            <span style={{ fontSize: "16px" }}>✦</span> Chat
          </button>
          <button onClick={() => toggle("analysis")}
            style={{ padding: "16px 10px", borderRadius: "20px", border: "none", background: panel === "analysis" ? C.navy + "20" : C.navy + "08", color: C.navy, fontSize: "13px", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", transition: "all 0.2s" }}>
            {loadingAI ? <Spin size={13} color={C.navy} /> : "✦"} Análisis
          </button>
          <button onClick={() => toggle("debate")}
            style={{ padding: "16px 10px", borderRadius: "20px", border: "none", background: panel === "debate" ? C.rose + "20" : C.rose + "10", color: C.rose, fontSize: "13px", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", transition: "all 0.2s" }}>
            {loadingDebate ? <Spin size={13} color={C.rose} /> : "⚔"} Abogado
          </button>
        </div>

        {/* Panel content */}
        {panel === "chat"     && <div style={{ marginTop: "16px", marginBottom: "28px" }}><ChatPanel idea={idea} onSaveChat={msgs => onSaveChat(idea.id, msgs)} /></div>}
        {panel === "analysis" && !loadingAI && idea.expansion && <div style={{ marginBottom: "28px" }}><AnalysisPanel raw={idea.expansion} /></div>}
        {panel === "analysis" && !loadingAI && !idea.expansion && <div style={{ marginTop: "16px", marginBottom: "28px", padding: "32px", textAlign: "center", background: C.bg, borderRadius: "20px" }}><p style={{ color: C.muted, fontSize: "14px" }}>Primero genera el análisis con el botón de arriba ✦</p></div>}
        {panel === "analysis" && loadingAI && <div style={{ display: "flex", justifyContent: "center", padding: "48px" }}><Spin size={32} color={C.navy} /></div>}
        {panel === "debate"   && !loadingDebate && idea.debate && <div style={{ marginBottom: "28px" }}><DebatePanel raw={idea.debate} /></div>}
        {panel === "debate"   && !loadingDebate && !idea.debate && <div style={{ marginTop: "16px", marginBottom: "28px", padding: "32px", textAlign: "center", background: C.bg, borderRadius: "20px" }}><p style={{ color: C.muted, fontSize: "14px" }}>Primero genera el debate con el botón de arriba ⚔</p></div>}
        {panel === "debate"   && loadingDebate && <div style={{ display: "flex", justifyContent: "center", padding: "48px" }}><Spin size={32} color={C.rose} /></div>}

        {/* ── Secondary sections ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px", marginTop: panel ? "0" : "16px" }}>
          {[
            { id: "checklist", icon: "✓", label: "Checklist", color: C.purple, bg: C.purple + "18",
              sub: (idea.checklist?.length > 0) ? `${idea.checklist.filter(s => s.done).length}/${idea.checklist.length} completados` : "Sin tareas",
              content: <Checklist idea={idea} onUpdate={steps => onUpdateChecklist(idea.id, steps)} /> },
            { id: "time", icon: "⏱", label: "Tiempo", color: C.orange, bg: C.orange + "18",
              sub: totalTime > 0 ? `${totalTime.toFixed(1)}h registradas` : "Sin registros",
              content: <TimeTracker idea={idea} onLog={logs => onLogTime(idea.id, logs)} /> },
            { id: "tags", icon: "🏷", label: "Tags", color: C.brown, bg: C.yellow + "30",
              sub: (idea.tags || []).length > 0 ? `${idea.tags.length} etiqueta${idea.tags.length > 1 ? "s" : ""}` : "Sin etiquetas",
              content: <TagsPanel idea={idea} onSave={tags => onSaveTags(idea.id, tags)} /> },
            { id: "files", icon: "📎", label: "Archivos", color: C.navy, bg: C.navy + "15",
              sub: (idea.attachments || []).length > 0 ? `${idea.attachments.length} archivo${idea.attachments.length > 1 ? "s" : ""}` : "Sin archivos",
              content: <AttachmentsPanel idea={idea} onSave={atts => onSaveAttachments(idea.id, atts)} /> },
          ].map(sec => (
            <div key={sec.id} style={{ background: C.card, borderRadius: "20px", overflow: "hidden", border: `1px solid ${panel === sec.id ? sec.color + "40" : C.line}`, transition: "border-color 0.2s" }}>
              <button onClick={() => toggle(sec.id)}
                style={{ width: "100%", padding: "16px 18px", background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "12px", textAlign: "left" }}>
                <div style={{ width: "34px", height: "34px", borderRadius: "11px", background: sec.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px", flexShrink: 0 }}>{sec.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "13px", fontWeight: "700", color: C.text }}>{sec.label}</div>
                  <div style={{ fontSize: "11px", color: C.muted, marginTop: "2px" }}>{sec.sub}</div>
                </div>
                <span style={{ color: C.muted, fontSize: "18px", fontWeight: "300" }}>{panel === sec.id ? "−" : "+"}</span>
              </button>
              {panel === sec.id && <div style={{ padding: "0 18px 18px" }}>{sec.content}</div>}
            </div>
          ))}
        </div>

        <button onClick={() => setShowSimilar(true)}
          style={{ width: "100%", padding: "14px", borderRadius: "18px", border: `1.5px solid ${C.line}`, background: "transparent", color: C.muted, fontSize: "13px", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginTop: "4px" }}>
          🔍 Buscar ideas similares y mejorar
        </button>
      </div>
    </div>
  );
};

// ─── Project Detail View ─────────────────────────────────────────────
const ProjectView = ({ venture, ideas, onBack, onSaveChat, onExpand, onDebate, onDelete, onCycleStatus, onEditDate, onUpdateChecklist, onLogTime, onSaveTags, onSavePriority, onSaveAttachments, onPresent, expandingId, debatingId, onNewIdea }) => {
  const vm  = getVM(venture);
  const all = ideas.filter(i => i.venture === venture);
  const [section,       setSection]       = useState("ideas");
  const [globalAnalysis,setGlobalAnalysis]= useState(null);
  const [analyzingAll,  setAnalyzingAll]  = useState(false);
  const [statusFilter,  setStatusFilter]  = useState("Todos");
  const [showNewIdea,   setShowNewIdea]   = useState(false);

  const totalHours    = all.reduce((s, i) => s + (i.timeLogs || []).reduce((ss, l) => ss + (l.hours || 0), 0), 0);
  const chatsCount    = all.filter(i => (i.chatHistory || []).length > 0).length;
  const analysisCount = all.filter(i => i.expansion).length;
  const doneCount     = all.filter(i => i.status === "Listo").length;

  const analyzeAll = async () => {
    setAnalyzingAll(true);
    const list = all.map(i => {
      let a = {}; try { a = JSON.parse(i.expansion || "{}"); } catch {}
      return `- "${i.title}" [${i.status}]: ${i.description}${a.resumen ? ` → ${a.resumen}` : ""}`;
    }).join("\n");
    try {
      const raw = await callClaude(
        SYSTEM + ` Analiza el portafolio completo de ideas de este proyecto. Responde SOLO en JSON: {"resumen":"...","idea_estrella":{"titulo":"...","razon":"..."},"gaps":"...","siguiente_paso":"...","sinergia":"...","alerta":"..."}`,
        `Proyecto: ${venture}\nIdeas:\n${list}`
      );
      setGlobalAnalysis(JSON.parse(raw.replace(/```json|```/g, "").trim()));
    } catch { setGlobalAnalysis({ error: true }); }
    setAnalyzingAll(false);
  };

  const exportMd = () => {
    let md = `# ${venture}\n\n`;
    md += `**Total ideas:** ${all.length} | **Horas registradas:** ${totalHours.toFixed(1)}h | **Completadas:** ${doneCount}\n\n---\n\n`;
    all.forEach(idea => {
      md += `## ${idea.title}\n\n`;
      md += `**Status:** ${idea.status} | **Tipo:** ${idea.type} | **Prioridad:** ${idea.priority || "media"}\n\n`;
      if (idea.description) md += `${idea.description}\n\n`;
      if ((idea.tags || []).length > 0) md += `**Tags:** ${idea.tags.map(t => `#${t}`).join(" ")}\n\n`;
      let a = {}; try { a = JSON.parse(idea.expansion || "{}"); } catch {}
      if (a.resumen) md += `**Análisis:** ${a.resumen}\n\n`;
      if (a.primera_accion) md += `**Primer paso:** ${a.primera_accion}\n\n`;
      if ((idea.chatHistory || []).length > 0) {
        md += `### Chat (${idea.chatHistory.length} msgs)\n\n`;
        idea.chatHistory.slice(-8).forEach(m => { md += `**${m.role === "user" ? "Renato" : "Claude"}:** ${m.content}\n\n`; });
      }
      md += "---\n\n";
    });
    const blob = new Blob([md], { type: "text/markdown" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `${venture.toLowerCase().replace(/\s+/g, "-")}.md`;
    a.click(); URL.revokeObjectURL(url);
  };

  // Build timeline events
  const timelineEvents = [];
  all.forEach(idea => {
    if (idea.createdAt) timelineEvents.push({ type: "created", ts: idea.createdAt, idea });
    (idea.chatHistory || []).forEach(m => { if (m.ts) timelineEvents.push({ type: "chat", ts: m.ts, idea, msg: m }); });
    if (idea.expansion) timelineEvents.push({ type: "analysis", ts: idea.createdAt, idea });
  });
  timelineEvents.sort((a, b) => b.ts > a.ts ? 1 : -1);

  const SECS = [
    { id: "ideas",    label: "Ideas",    count: all.length },
    { id: "chats",    label: "Chats",    count: all.reduce((s, i) => s + (i.chatHistory || []).length, 0) },
    { id: "analisis", label: "Análisis", count: analysisCount },
    { id: "timeline", label: "Timeline", count: timelineEvents.length },
  ];

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "40px 40px 80px" }}>

        {/* Back */}
        <button onClick={onBack} style={{ background: C.bg, border: "none", borderRadius: "100px", padding: "10px 20px", fontSize: "13px", fontWeight: "600", color: C.sub, cursor: "pointer", marginBottom: "28px" }}>← Proyectos</button>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px" }}>
          <div style={{ width: "56px", height: "56px", borderRadius: "20px", background: vm.light, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", fontWeight: "800", color: vm.color, flexShrink: 0 }}>{vm.letter}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "28px", fontWeight: "800", color: C.text, letterSpacing: "-0.5px" }}>{venture}</div>
            <div style={{ fontSize: "13px", color: C.muted, marginTop: "2px" }}>{all.length} ideas · {totalHours.toFixed(1)}h registradas</div>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button onClick={exportMd} title="Exportar a markdown"
              style={{ background: C.bg, border: "none", borderRadius: "14px", padding: "10px 16px", fontSize: "13px", fontWeight: "700", color: C.sub, cursor: "pointer" }}>
              ↓ Export
            </button>
            <button onClick={analyzeAll} disabled={analyzingAll}
              style={{ background: vm.color + "20", border: `1px solid ${vm.color}40`, borderRadius: "14px", padding: "10px 16px", fontSize: "13px", fontWeight: "700", color: vm.color, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", opacity: analyzingAll ? 0.7 : 1 }}>
              {analyzingAll ? <><Spin size={12} color={vm.color} /> Analizando...</> : "✦ Análisis"}
            </button>
            <button onClick={() => setShowNewIdea(s => !s)}
              style={{ background: showNewIdea ? C.bg : vm.color, border: "none", borderRadius: "14px", padding: "10px 18px", fontSize: "13px", fontWeight: "800", color: showNewIdea ? C.muted : "#fff", cursor: "pointer" }}>
              {showNewIdea ? "Cancelar" : "+ Nueva idea"}
            </button>
          </div>
        </div>

        {/* Global analysis result */}
        {globalAnalysis && !globalAnalysis.error && (
          <div style={{ background: `linear-gradient(135deg, ${vm.color}15, ${vm.color}05)`, border: `1px solid ${vm.color}30`, borderRadius: "22px", padding: "22px", marginBottom: "24px" }}>
            <div style={{ fontSize: "13px", fontWeight: "800", color: vm.color, letterSpacing: "0.5px", marginBottom: "14px" }}>✦ ANÁLISIS GLOBAL DEL PROYECTO</div>
            {globalAnalysis.resumen && <p style={{ fontSize: "14px", color: C.sub, lineHeight: "1.7", marginBottom: "14px" }}>{globalAnalysis.resumen}</p>}
            {globalAnalysis.idea_estrella && (
              <div style={{ background: C.card, borderRadius: "16px", padding: "14px", marginBottom: "10px" }}>
                <div style={{ fontSize: "11px", fontWeight: "800", color: C.yellow, letterSpacing: "0.8px", marginBottom: "5px" }}>🌟 IDEA ESTRELLA</div>
                <div style={{ fontSize: "14px", fontWeight: "700", color: C.text }}>{globalAnalysis.idea_estrella.titulo}</div>
                <div style={{ fontSize: "13px", color: C.sub, marginTop: "4px" }}>{globalAnalysis.idea_estrella.razon}</div>
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              {globalAnalysis.gaps && <div style={{ background: C.card, borderRadius: "14px", padding: "12px" }}><div style={{ fontSize: "10px", fontWeight: "800", color: C.muted, marginBottom: "5px" }}>GAPS</div><p style={{ fontSize: "12px", color: C.sub, lineHeight: "1.6" }}>{globalAnalysis.gaps}</p></div>}
              {globalAnalysis.sinergia && <div style={{ background: C.card, borderRadius: "14px", padding: "12px" }}><div style={{ fontSize: "10px", fontWeight: "800", color: C.green, marginBottom: "5px" }}>SINERGIA</div><p style={{ fontSize: "12px", color: C.sub, lineHeight: "1.6" }}>{globalAnalysis.sinergia}</p></div>}
            </div>
            {globalAnalysis.siguiente_paso && <div style={{ background: C.navy, borderRadius: "14px", padding: "14px", marginTop: "10px" }}><div style={{ fontSize: "10px", fontWeight: "800", color: "rgba(255,255,255,0.5)", marginBottom: "5px" }}>SIGUIENTE PASO</div><p style={{ fontSize: "13px", color: "#fff", lineHeight: "1.65" }}>{globalAnalysis.siguiente_paso}</p></div>}
            {globalAnalysis.alerta && <div style={{ background: C.rose + "15", borderRadius: "14px", padding: "12px", marginTop: "8px" }}><span style={{ fontSize: "12px", color: C.rose }}>⚠ {globalAnalysis.alerta}</span></div>}
          </div>
        )}

        {/* KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "12px", marginBottom: "28px" }}>
          {[
            { label: "Ideas", val: all.length, color: vm.color },
            { label: "Con análisis", val: analysisCount, color: C.navy },
            { label: "Con chats", val: chatsCount, color: C.purple },
            { label: "Completadas", val: doneCount, color: C.green },
          ].map((k, i) => (
            <div key={i} style={{ background: C.card, borderRadius: "18px", padding: "18px", boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}>
              <div style={{ fontSize: "26px", fontWeight: "800", color: k.color, marginBottom: "4px" }}>{k.val}</div>
              <div style={{ fontSize: "11px", fontWeight: "700", color: C.muted }}>{k.label}</div>
            </div>
          ))}
        </div>

        {/* Quick new idea form */}
        {showNewIdea && (
          <div className="fade" style={{ background: C.card, borderRadius: "22px", padding: "22px", marginBottom: "20px", boxShadow: "0 2px 16px rgba(0,0,0,0.08)" }}>
            <div style={{ fontSize: "15px", fontWeight: "800", color: C.text, marginBottom: "16px" }}>Nueva idea en {venture}</div>
            <input id="pv-title" placeholder="Título de la idea..." autoFocus
              style={{ width: "100%", background: C.bg, border: "none", borderRadius: "14px", padding: "14px 16px", fontSize: "15px", fontWeight: "700", color: C.text, marginBottom: "10px", fontFamily: "inherit" }} />
            <textarea id="pv-desc" placeholder="Descripción breve..." rows={2}
              style={{ width: "100%", background: C.bg, border: "none", borderRadius: "14px", padding: "14px 16px", fontSize: "13px", color: C.sub, marginBottom: "14px", resize: "none", lineHeight: "1.6", fontFamily: "inherit" }} />
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
              {TYPES.map(t => {
                const inp = document.getElementById("pv-type-sel");
                return (
                  <button key={t} id={`pv-type-${t}`} onClick={() => { TYPES.forEach(x => { const b = document.getElementById(`pv-type-${x}`); if (b) { b.style.background = x === t ? C.text : C.bg; b.style.color = x === t ? "#fff" : C.muted; } }); }}
                    style={{ padding: "8px 16px", borderRadius: "100px", background: t === "Artifact" ? C.text : C.bg, color: t === "Artifact" ? "#fff" : C.muted, border: "none", cursor: "pointer", fontSize: "12px", fontWeight: "700", transition: "all 0.15s", fontFamily: "inherit" }}>
                    {t}
                  </button>
                );
              })}
            </div>
            <button onClick={() => {
              const title = document.getElementById("pv-title")?.value?.trim();
              const desc  = document.getElementById("pv-desc")?.value?.trim();
              const typeEl = TYPES.map(t => document.getElementById(`pv-type-${t}`)).find(b => b?.style.background === C.text || b?.style.color === "#fff");
              const type = typeEl ? TYPES.find(t => document.getElementById(`pv-type-${t}`) === typeEl) : "Artifact";
              if (!title) return;
              onNewIdea({ title, description: desc || "", venture, type, status: "Idea" });
              document.getElementById("pv-title").value = "";
              document.getElementById("pv-desc").value = "";
              setShowNewIdea(false);
            }}
              style={{ width: "100%", background: vm.color, color: "#fff", border: "none", borderRadius: "100px", padding: "14px", fontSize: "14px", fontWeight: "800", cursor: "pointer" }}>
              Guardar idea ☁
            </button>
          </div>
        )}

        {/* Status filter pills */}
        {section === "ideas" && (
          <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
            {["Todos", ...STATUSES].map(s => {
              const active = statusFilter === s;
              const m = s !== "Todos" ? SM[s] : null;
              return (
                <button key={s} onClick={() => setStatusFilter(s)}
                  style={{ padding: "7px 16px", borderRadius: "100px", background: active ? (m ? m.bg : C.text) : C.card, color: active ? (m ? m.color : "#fff") : C.muted, border: `1.5px solid ${active && m ? m.color + "50" : "transparent"}`, cursor: "pointer", fontSize: "12px", fontWeight: "700", transition: "all 0.2s" }}>
                  {s} {s !== "Todos" && <span style={{ opacity: 0.7 }}>({all.filter(i => i.status === s).length})</span>}
                </button>
              );
            })}
          </div>
        )}

        {/* Section tabs */}
        <div style={{ display: "flex", background: C.card, borderRadius: "16px", padding: "4px", marginBottom: "24px", gap: "4px" }}>
          {SECS.map(s => (
            <button key={s.id} onClick={() => setSection(s.id)}
              style={{ flex: 1, padding: "10px", borderRadius: "12px", border: "none", background: section === s.id ? vm.color : "transparent", color: section === s.id ? "#fff" : C.muted, fontSize: "13px", fontWeight: "700", cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
              {s.label} <span style={{ fontSize: "11px", opacity: 0.75 }}>({s.count})</span>
            </button>
          ))}
        </div>

        {/* ── Ideas section ── */}
        {section === "ideas" && (() => {
          const visible = all.filter(i => statusFilter === "Todos" || i.status === statusFilter);
          return visible.length === 0
            ? <div style={{ background: C.card, borderRadius: "24px", padding: "48px", textAlign: "center" }}>
                <div style={{ fontSize: "36px", marginBottom: "12px" }}>💡</div>
                <div style={{ fontSize: "15px", fontWeight: "700", color: C.text, marginBottom: "6px" }}>Sin ideas {statusFilter !== "Todos" ? `con estado "${statusFilter}"` : "en este proyecto"}</div>
                <button onClick={() => setShowNewIdea(true)} style={{ background: vm.color, color: "#fff", border: "none", borderRadius: "100px", padding: "12px 24px", fontSize: "13px", fontWeight: "700", cursor: "pointer", marginTop: "12px" }}>+ Nueva idea</button>
              </div>
            : <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "14px" }}>
                {visible.map(idea => (
                  <IdeaCard key={idea.id} idea={idea}
                    loadingAI={expandingId === idea.id} loadingDebate={debatingId === idea.id}
                    onExpand={onExpand} onDebate={onDebate} onDelete={onDelete}
                    onCycleStatus={onCycleStatus} onEditDate={onEditDate}
                    onUpdateChecklist={onUpdateChecklist} onLogTime={onLogTime}
                    onSaveChat={onSaveChat} onPresent={onPresent}
                    onSaveTags={onSaveTags} onSavePriority={onSavePriority} onSaveAttachments={onSaveAttachments}
                    compareMode={false} selected={false} onToggleSelect={() => {}} allIdeas={[]} />
                ))}
              </div>;
        })()}

        {/* ── Chats section ── */}
        {section === "chats" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {all.filter(i => (i.chatHistory || []).length > 0).length === 0 ? (
              <div style={{ background: C.card, borderRadius: "24px", padding: "48px", textAlign: "center" }}>
                <div style={{ fontSize: "36px", marginBottom: "12px" }}>💬</div>
                <div style={{ fontSize: "15px", fontWeight: "700", color: C.text, marginBottom: "6px" }}>Sin chats aún</div>
                <div style={{ fontSize: "13px", color: C.muted }}>Abre una idea y usa "Desarrollar con Claude"</div>
              </div>
            ) : all.filter(i => (i.chatHistory || []).length > 0).map(idea => (
              <div key={idea.id} style={{ background: C.card, borderRadius: "24px", padding: "22px", boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px", paddingBottom: "14px", borderBottom: `1px solid ${C.line}` }}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "12px", background: vm.light, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px", fontWeight: "800", color: vm.color }}>{vm.letter}</div>
                  <div>
                    <div style={{ fontSize: "15px", fontWeight: "700", color: C.text }}>{idea.title}</div>
                    <div style={{ fontSize: "11px", color: C.muted }}>{idea.chatHistory.length} mensajes</div>
                  </div>
                  <button onClick={() => { setSection("ideas"); }} style={{ marginLeft: "auto", background: C.bg, border: "none", borderRadius: "100px", padding: "8px 16px", fontSize: "12px", fontWeight: "600", color: C.sub, cursor: "pointer" }}>Ver idea →</button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "400px", overflowY: "auto" }}>
                  {idea.chatHistory.map((m, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                      <div style={{ maxWidth: "80%", padding: "10px 14px", borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px", background: m.role === "user" ? C.navy : C.bg, color: m.role === "user" ? "#fff" : C.text, fontSize: "13px", lineHeight: "1.6", whiteSpace: "pre-wrap" }}>
                        {m.content}
                        {m.ts && <div style={{ fontSize: "10px", opacity: 0.5, marginTop: "3px" }}>{new Date(m.ts).toLocaleDateString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Análisis section ── */}
        {section === "analisis" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {all.filter(i => i.expansion).length === 0 ? (
              <div style={{ background: C.card, borderRadius: "24px", padding: "48px", textAlign: "center" }}>
                <div style={{ fontSize: "36px", marginBottom: "12px" }}>✦</div>
                <div style={{ fontSize: "15px", fontWeight: "700", color: C.text, marginBottom: "6px" }}>Sin análisis aún</div>
                <div style={{ fontSize: "13px", color: C.muted }}>Abre una idea y usa "Análisis rápido"</div>
              </div>
            ) : all.filter(i => i.expansion).map(idea => {
              let a = {};
              try { a = JSON.parse(idea.expansion); } catch {}
              const sm2 = SM[idea.status];
              return (
                <div key={idea.id} style={{ background: C.card, borderRadius: "24px", padding: "22px", boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px", paddingBottom: "14px", borderBottom: `1px solid ${C.line}` }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "16px", fontWeight: "800", color: C.text, marginBottom: "4px" }}>{idea.title}</div>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        <span style={{ padding: "3px 10px", borderRadius: "100px", background: sm2.bg, color: sm2.color, fontSize: "11px", fontWeight: "700" }}>{idea.status}</span>
                        {a.esfuerzo && <span style={{ padding: "3px 10px", borderRadius: "100px", background: EFFORT_C[a.esfuerzo] + "20", color: EFFORT_C[a.esfuerzo], fontSize: "11px", fontWeight: "700" }}>⏱ {a.esfuerzo}</span>}
                        {a.verdict && <span style={{ padding: "3px 10px", borderRadius: "100px", background: C.bg, color: C.sub, fontSize: "11px", fontWeight: "600" }}>{a.verdict}</span>}
                      </div>
                    </div>
                  </div>
                  {a.resumen && <p style={{ fontSize: "14px", color: C.sub, lineHeight: "1.7", marginBottom: "12px" }}>{a.resumen}</p>}
                  {a.primera_accion && (
                    <div style={{ background: C.navy, borderRadius: "14px", padding: "14px 16px" }}>
                      <div style={{ fontSize: "10px", fontWeight: "800", color: "rgba(255,255,255,0.5)", letterSpacing: "1px", marginBottom: "4px" }}>PRIMER PASO</div>
                      <p style={{ fontSize: "13px", color: "#fff", lineHeight: "1.6" }}>{a.primera_accion}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Timeline section ── */}
        {section === "timeline" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
            {timelineEvents.length === 0 ? (
              <div style={{ background: C.card, borderRadius: "24px", padding: "48px", textAlign: "center" }}>
                <div style={{ fontSize: "36px", marginBottom: "12px" }}>📅</div>
                <div style={{ fontSize: "15px", fontWeight: "700", color: C.text, marginBottom: "6px" }}>Sin actividad aún</div>
                <div style={{ fontSize: "13px", color: C.muted }}>La actividad del proyecto aparecerá aquí</div>
              </div>
            ) : timelineEvents.slice(0, 60).map((ev, idx) => {
              const isLast = idx === timelineEvents.length - 1;
              const typeConfig = {
                created:  { icon: "💡", color: vm.color,   label: "Idea creada" },
                chat:     { icon: ev.msg?.role === "user" ? "👤" : "✦", color: C.purple, label: ev.msg?.role === "user" ? "Renato" : "Claude" },
                analysis: { icon: "⚡", color: C.navy,     label: "Análisis generado" },
              };
              const tc = typeConfig[ev.type] || typeConfig.created;
              return (
                <div key={idx} style={{ display: "flex", gap: "14px" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "36px", flexShrink: 0 }}>
                    <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: tc.color + "18", border: `2px solid ${tc.color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", flexShrink: 0 }}>{tc.icon}</div>
                    {!isLast && <div style={{ width: "2px", flex: 1, minHeight: "16px", background: C.line, marginTop: "4px" }} />}
                  </div>
                  <div style={{ paddingBottom: "16px", flex: 1, paddingTop: "4px" }}>
                    <div style={{ fontSize: "11px", color: C.muted, marginBottom: "3px" }}>
                      <span style={{ fontWeight: "700", color: tc.color }}>{tc.label}</span>
                      {" · "}{ev.idea.title}
                      {ev.ts && <span style={{ marginLeft: "6px" }}>{new Date(ev.ts).toLocaleDateString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>}
                    </div>
                    {ev.type === "chat" && ev.msg && (
                      <div style={{ background: C.card, borderRadius: "14px", padding: "10px 14px", fontSize: "13px", color: C.sub, lineHeight: "1.6", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {ev.msg.content}
                      </div>
                    )}
                    {ev.type === "created" && ev.idea.description && (
                      <div style={{ fontSize: "13px", color: C.muted, lineHeight: "1.6" }}>{ev.idea.description}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Login Screen — Niva style ────────────────────────────────────────
const LoginScreen = ({ onAuth }) => {
  const [mode,     setMode]     = useState("login");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const handleEmail = async () => {
    if (!email || !password) { setError("Completa todos los campos"); return; }
    setLoading(true); setError("");
    try {
      const user = mode === "login"
        ? await signInWithEmail(email, password)
        : await signUpWithEmail(email, password);
      if (user) onAuth(user);
      else setError("Revisa tu email para confirmar tu cuenta");
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'DM Sans', system-ui, sans-serif", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 24px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,600;9..40,700;9..40,800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes float { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }
      `}</style>

      {/* Blob bg */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, overflow: "hidden" }}>
        <svg viewBox="0 0 400 800" style={{ width: "100%", height: "100%", position: "absolute" }} preserveAspectRatio="xMidYMid slice">
          <defs>
            <radialGradient id="lg1" cx="70%" cy="30%" r="60%"><stop offset="0%" stopColor="#F47648" stopOpacity="0.5" /><stop offset="100%" stopColor="#F5C757" stopOpacity="0" /></radialGradient>
            <radialGradient id="lg2" cx="20%" cy="70%" r="55%"><stop offset="0%" stopColor="#2A3875" stopOpacity="0.4" /><stop offset="100%" stopColor="#2A3875" stopOpacity="0" /></radialGradient>
            <radialGradient id="lg3" cx="85%" cy="80%" r="40%"><stop offset="0%" stopColor="#F47090" stopOpacity="0.35" /><stop offset="100%" stopColor="#F47090" stopOpacity="0" /></radialGradient>
          </defs>
          <rect width="400" height="800" fill="#F2EFE9" />
          <ellipse cx="280" cy="240" rx="300" ry="300" fill="url(#lg1)" />
          <ellipse cx="80"  cy="560" rx="280" ry="280" fill="url(#lg2)" />
          <ellipse cx="340" cy="640" rx="200" ry="200" fill="url(#lg3)" />
        </svg>
      </div>

      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: "360px" }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ animation: "float 3s ease-in-out infinite", display: "inline-block", marginBottom: "20px" }}>
            <div style={{ width: "72px", height: "72px", borderRadius: "24px", background: C.navy, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 20px 60px ${C.navy}40` }}>
              <span style={{ fontSize: "32px", color: "#fff", fontWeight: "800" }}>✦</span>
            </div>
          </div>
          <div style={{ fontSize: "28px", fontWeight: "800", color: C.text, letterSpacing: "-0.5px", lineHeight: 1.2, marginBottom: "8px" }}>Claude Ideas Lab</div>
          <div style={{ fontSize: "14px", color: C.sub }}>Captura y ejecuta tus ideas con IA</div>
        </div>

        {/* Card */}
        <div style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(20px)", borderRadius: "28px", padding: "28px", boxShadow: "0 8px 40px rgba(0,0,0,0.10)" }}>

          {/* Mode toggle */}
          <div style={{ display: "flex", background: C.bg, borderRadius: "16px", padding: "4px", marginBottom: "24px" }}>
            {[["login", "Iniciar sesión"], ["signup", "Registrarse"]].map(([m, l]) => (
              <button key={m} onClick={() => { setMode(m); setError(""); }}
                style={{ flex: 1, padding: "10px", borderRadius: "12px", border: "none", background: mode === m ? C.navy : "transparent", color: mode === m ? "#fff" : C.muted, fontSize: "13px", fontWeight: "700", cursor: "pointer", transition: "all 0.2s", fontFamily: "inherit" }}>
                {l}
              </button>
            ))}
          </div>

          {/* Email field */}
          <div style={{ marginBottom: "12px" }}>
            <div style={{ fontSize: "11px", fontWeight: "700", color: C.muted, letterSpacing: "0.8px", marginBottom: "7px" }}>EMAIL</div>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="tu@email.com"
              onKeyDown={e => e.key === "Enter" && handleEmail()}
              style={{ width: "100%", background: C.bg, border: `1.5px solid ${error ? C.rose : C.line}`, borderRadius: "14px", padding: "14px 16px", fontSize: "15px", color: C.text, fontFamily: "inherit", transition: "border 0.2s" }}
            />
          </div>

          {/* Password field */}
          <div style={{ marginBottom: "20px" }}>
            <div style={{ fontSize: "11px", fontWeight: "700", color: C.muted, letterSpacing: "0.8px", marginBottom: "7px" }}>CONTRASEÑA</div>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              onKeyDown={e => e.key === "Enter" && handleEmail()}
              style={{ width: "100%", background: C.bg, border: `1.5px solid ${error ? C.rose : C.line}`, borderRadius: "14px", padding: "14px 16px", fontSize: "15px", color: C.text, fontFamily: "inherit", transition: "border 0.2s" }}
            />
          </div>

          {/* Error */}
          {error && (
            <div style={{ background: "#FEF0F0", border: `1px solid ${C.rose}40`, borderRadius: "12px", padding: "12px 14px", marginBottom: "16px", fontSize: "13px", color: C.rose, fontWeight: "600" }}>
              {error}
            </div>
          )}

          {/* Email CTA */}
          <button onClick={handleEmail} disabled={loading}
            style={{ width: "100%", background: loading ? C.muted : C.navy, color: "#fff", border: "none", borderRadius: "16px", padding: "16px", fontSize: "15px", fontWeight: "800", cursor: loading ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: "16px", fontFamily: "inherit", transition: "all 0.2s" }}>
            {loading
              ? <div style={{ width: "18px", height: "18px", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", animation: "spin 0.8s linear infinite" }} />
              : null}
            {loading ? "Entrando..." : mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
          </button>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
            <div style={{ flex: 1, height: "1px", background: C.line }} />
            <span style={{ fontSize: "12px", color: C.muted, fontWeight: "600" }}>O</span>
            <div style={{ flex: 1, height: "1px", background: C.line }} />
          </div>

          {/* Google button */}
          <button onClick={signInWithGoogle}
            style={{ width: "100%", background: "#fff", border: `1.5px solid ${C.line}`, borderRadius: "16px", padding: "14px 24px", fontSize: "14px", fontWeight: "700", color: C.text, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", fontFamily: "inherit" }}>
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuar con Google
          </button>
        </div>

        <div style={{ textAlign: "center", marginTop: "20px", fontSize: "12px", color: C.muted, lineHeight: "1.6" }}>
          Tus ideas se almacenan de forma segura en la nube
        </div>
      </div>
    </div>
  );
};

// ─── Responsive hook ─────────────────────────────────────────────────
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return isMobile;
};

// ─── Main App ─────────────────────────────────────────────────────────
export default function App() {
  const [user,        setUser]        = useState(undefined); // undefined = loading, null = not authed
  const [authLoading, setAuthLoading] = useState(true);
  const [ideas,       setIdeas]       = useState([]);
  const [venture,     setVenture]     = useState("Todos");
  const [statusF,     setStatusF]     = useState("Todos");
  const [search,      setSearch]      = useState("");
  const [tab,         setTab]         = useState("home");
  const [expandingId, setExpandingId] = useState(null);
  const [debatingId,  setDebatingId]  = useState(null);
  const [syncing,     setSyncing]     = useState(false);
  const [syncErr,     setSyncErr]     = useState(null);
  const [editIdea,    setEditIdea]    = useState(null);
  const [presentIdea, setPresentIdea] = useState(null);
  const [showVoice,   setShowVoice]   = useState(false);
  const [connections,    setConnections]    = useState(null);
  const [loadingConn,    setLoadingConn]    = useState(false);
  const [activeProject,  setActiveProject]  = useState(null);
  const [viewMode,       setViewMode]       = useState("cards"); // cards | list | kanban
  const [customVentures, setCustomVentures] = useState(() => { try { return JSON.parse(localStorage.getItem("customVentures") || "[]"); } catch { return []; } });
  const [addingVenture,  setAddingVenture]  = useState(false);
  const [newVentureName, setNewVentureName] = useState("");
  const [compareMode,    setCompareMode]    = useState(false);
  const [selectedIds,    setSelectedIds]    = useState([]);
  const [showCompare,    setShowCompare]    = useState(false);
  const [activeIdeaId,   setActiveIdeaId]   = useState(null);
  const [form, setForm] = useState({ title: "", description: "", venture: "Mercasync", type: "Artifact", status: "Idea" });

  const allVentures = [...DEFAULT_VENTURES, ...customVentures];
  const activeIdea  = activeIdeaId ? ideas.find(i => i.id === activeIdeaId) || null : null;

  const addVenture = () => {
    const name = newVentureName.trim();
    if (!name || allVentures.includes(name)) { setAddingVenture(false); setNewVentureName(""); return; }
    const updated = [...customVentures, name];
    setCustomVentures(updated);
    localStorage.setItem("customVentures", JSON.stringify(updated));
    setAddingVenture(false);
    setNewVentureName("");
  };

  const mapRow = r => ({
    id: r.id, title: r.title, description: r.description,
    venture: r.venture, type: r.type, status: r.status,
    createdAt: r.created_at, expansion: r.expansion || "",
    debate: r.debate || "", startDate: r.start_date || "",
    durationWeeks: r.duration_weeks || 1,
    priority:     r.priority || "media",
    checklist:    (() => { try { return Array.isArray(r.checklist)     ? r.checklist     : JSON.parse(r.checklist     || "[]"); } catch { return []; } })(),
    timeLogs:     (() => { try { return Array.isArray(r.time_logs)     ? r.time_logs     : JSON.parse(r.time_logs     || "[]"); } catch { return []; } })(),
    chatHistory:  (() => { try { return Array.isArray(r.chat_history)  ? r.chat_history  : JSON.parse(r.chat_history  || "[]"); } catch { return []; } })(),
    tags:         (() => { try { return Array.isArray(r.tags)          ? r.tags          : JSON.parse(r.tags          || "[]"); } catch { return []; } })(),
    attachments:  (() => { try { return Array.isArray(r.attachments)   ? r.attachments   : JSON.parse(r.attachments   || "[]"); } catch { return []; } })(),
  });

  // ── Auth init ──────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      setAuthLoading(true);
      await handleAuthCallback();
      const u = await getSession();
      setUser(u || null);
      setAuthLoading(false);
    };
    init();
  }, []);

  const handleAuth = (u) => setUser(u);

  const load = useCallback(async () => {
    setSyncing(true); setSyncErr(null);
    try { const rows = await dbLoad(); setIdeas(rows.map(mapRow)); }
    catch { setSyncErr("Error de conexión"); }
    setSyncing(false);
  }, []);

  useEffect(() => { if (user) load(); }, [load, user]);

  const save = async () => {
    if (!form.title.trim()) return;
    const row = { id: genId(), title: form.title, description: form.description, venture: form.venture, type: form.type, status: form.status, expansion: "", debate: "", user_id: user?.id };
    setIdeas(p => [{ ...row, createdAt: new Date().toISOString(), startDate: "", durationWeeks: 1, checklist: [], timeLogs: [] }, ...p]);
    setForm({ title: "", description: "", venture: "Mercasync", type: "Artifact", status: "Idea" });
    setTab("home");
    try { await dbInsert(row); } catch { setSyncErr("Error guardando"); }
  };

  const del = async (id) => {
    setIdeas(p => p.filter(i => i.id !== id));
    try { await dbDelete(id); } catch {}
  };

  const cycleStatus = async (idea) => {
    const next = STATUSES[(STATUSES.indexOf(idea.status) + 1) % STATUSES.length];
    setIdeas(p => p.map(i => i.id === idea.id ? { ...i, status: next } : i));
    try { await dbUpdate(idea.id, { status: next }); } catch {}
  };

  const saveDate = async (date, weeks) => {
    if (!editIdea) return;
    setIdeas(p => p.map(i => i.id === editIdea.id ? { ...i, startDate: date, durationWeeks: weeks } : i));
    setEditIdea(null);
    try { await dbUpdate(editIdea.id, { start_date: date || null, duration_weeks: weeks }); } catch {}
  };

  const updateChecklist = async (id, steps) => {
    setIdeas(p => p.map(i => i.id === id ? { ...i, checklist: steps } : i));
    try { await dbUpdate(id, { checklist: JSON.stringify(steps) }); } catch {}
  };

  const logTime = async (id, logs) => {
    setIdeas(p => p.map(i => i.id === id ? { ...i, timeLogs: logs } : i));
    try { await dbUpdate(id, { time_logs: JSON.stringify(logs) }); } catch {}
  };

  const saveChat = async (id, msgs) => {
    setIdeas(p => p.map(i => i.id === id ? { ...i, chatHistory: msgs } : i));
    try { await dbUpdate(id, { chat_history: msgs }); } catch {}
  };

  const saveTags = async (id, tags) => {
    setIdeas(p => p.map(i => i.id === id ? { ...i, tags } : i));
    try { await dbUpdate(id, { tags }); } catch {}
  };

  const savePriority = async (id, priority) => {
    setIdeas(p => p.map(i => i.id === id ? { ...i, priority } : i));
    try { await dbUpdate(id, { priority }); } catch {}
  };

  const saveAttachments = async (id, attachments) => {
    setIdeas(p => p.map(i => i.id === id ? { ...i, attachments } : i));
    try { await dbUpdate(id, { attachments }); } catch {}
  };

  const expand = async (idea) => {
    if (idea.expansion) return;
    setExpandingId(idea.id);
    try {
      const raw = await callClaude(
        SYSTEM + ` Responde SOLO en JSON válido sin texto adicional: {"verdict":"🔥 Alta prioridad|⚡ Vale la pena|🤔 Hay que pensarlo|⚠️ Cuidado","resumen":"...","oportunidad":"...","esfuerzo":"< 1 día|1-3 días|1 semana|2 semanas|1 mes+","esfuerzo_detalle":"...","riesgos":["..."],"stack":{"herramientas":["..."],"por_que":"..."},"roadmap":[{"fase":"...","acciones":["..."]}],"primera_accion":"...","pregunta":"..."}`,
        `Idea: ${idea.title}\nDescripción: ${idea.description}\nVenture: ${idea.venture}\nTipo: ${idea.type}`
      );
      const cleaned = raw.replace(/```json|```/g, "").trim();
      setIdeas(p => p.map(i => i.id === idea.id ? { ...i, expansion: cleaned } : i));
      await dbUpdate(idea.id, { expansion: cleaned });
    } catch {}
    setExpandingId(null);
  };

  const debate = async (idea) => {
    if (idea.debate) return;
    setDebatingId(idea.id);
    try {
      const raw = await callClaude(
        SYSTEM + ` Juega abogado del diablo. Responde SOLO en JSON válido: {"veredicto":"...","argumentos":[{"titulo":"...","detalle":"..."},{"titulo":"...","detalle":"..."},{"titulo":"...","detalle":"..."}],"como_rebatirlos":["...","...","..."],"conclusion":"..."}`,
        `Idea: ${idea.title}\nDescripción: ${idea.description}\nVenture: ${idea.venture}`
      );
      const cleaned = raw.replace(/```json|```/g, "").trim();
      setIdeas(p => p.map(i => i.id === idea.id ? { ...i, debate: cleaned } : i));
      await dbUpdate(idea.id, { debate: cleaned });
    } catch {}
    setDebatingId(null);
  };

  const generateConnections = async () => {
    if (ideas.length < 2) return;
    setLoadingConn(true);
    try {
      const list = ideas.map(i => `- "${i.title}" (${i.venture}, ${i.type}): ${i.description}`).join("\n");
      const raw  = await callClaude(
        SYSTEM + ` Analiza las ideas y encuentra conexiones reales. Responde SOLO en JSON: [{"idea1":"...","idea1_venture":"...","idea2":"...","idea2_venture":"...","tipo":"Stack compartido|Mismo mercado|Pueden combinarse|Secuencia lógica|Sinergias de datos","sinergia":"...","accion":"..."}]. Máximo 5 conexiones más relevantes.`,
        `Ideas:\n${list}`
      );
      const cleaned = raw.replace(/```json|```/g, "").trim();
      setConnections(JSON.parse(cleaned));
    } catch { setConnections([]); }
    setLoadingConn(false);
  };

  const filtered = ideas.filter(i =>
    (venture === "Todos" || i.venture === venture) &&
    (statusF === "Todos" || i.status === statusF) &&
    (!search || i.title.toLowerCase().includes(search.toLowerCase()) || i.description.toLowerCase().includes(search.toLowerCase()))
  );

  const isMobile = useIsMobile();

  const counts = STATUSES.reduce((a, s) => { a[s] = ideas.filter(i => i.status === s).length; return a; }, {});

  const NAV = [
    { id: "home",        icon: "⊙", label: "Home"      },
    { id: "projects",    icon: "◈", label: "Proyectos" },
    { id: "agent",       icon: "✦", label: "Agente"    },
    { id: "calendar",    icon: "◫", label: "Calendar"  },
    { id: "connections", icon: "🔗", label: "Links"    },
    { id: "data",        icon: "⌗", label: "Data"      },
  ];

  // ── Auth gate ──────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: "56px", height: "56px", borderRadius: "20px", background: C.navy, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: "26px", color: "#fff" }}>✦</div>
          <div style={{ width: "24px", height: "24px", borderRadius: "50%", border: `3px solid ${C.navy}20`, borderTopColor: C.navy, animation: "spin 0.8s linear infinite", margin: "0 auto" }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (!user) return <LoginScreen onAuth={handleAuth} />;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'DM Sans', system-ui, sans-serif", paddingBottom: isMobile ? "90px" : "0", display: isMobile ? "block" : "flex" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { display: none; }
        input, textarea, select { outline: none; font-family: inherit; }
        input::placeholder, textarea::placeholder { color: #ADADAD; }
        .fade { animation: fadeIn 0.3s ease; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.06); } }
        @keyframes float { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }
        input[type="date"]::-webkit-calendar-picker-indicator { opacity: 0.4; }
        button { font-family: inherit; }
      `}</style>

      {presentIdea && <PresentationMode idea={presentIdea} onClose={() => setPresentIdea(null)} />}
      {showVoice   && <VoiceCapture onCapture={({ title, description }) => { setShowVoice(false); setForm(f => ({ ...f, title, description })); setTab("new"); }} onClose={() => setShowVoice(false)} />}
      {editIdea    && <DateModal idea={editIdea} onSave={saveDate} onClose={() => setEditIdea(null)} />}

      {/* ── Desktop sidebar nav ── */}
      {!isMobile && (
        <div style={{ width: "240px", flexShrink: 0, position: "sticky", top: 0, height: "100vh", background: C.card, borderRight: `1px solid ${C.line}`, display: "flex", flexDirection: "column", padding: "32px 16px 24px" }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "36px", paddingLeft: "8px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "12px", background: C.navy, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", color: "#fff", fontWeight: "800", flexShrink: 0 }}>✦</div>
            <div>
              <div style={{ fontSize: "15px", fontWeight: "800", color: C.text, letterSpacing: "-0.3px" }}>Ideas Lab</div>
              <div style={{ fontSize: "11px", color: syncing ? C.navy : C.green, fontWeight: "700" }}>{syncing ? "Sincronizando..." : "✓ Sincronizado"}</div>
            </div>
          </div>

          {/* Nav items */}
          <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
            {NAV.map(n => {
              const active = tab === n.id;
              return (
                <button key={n.id} onClick={() => setTab(n.id)}
                  style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 14px", borderRadius: "16px", background: active ? C.navy : "transparent", border: "none", cursor: "pointer", transition: "all 0.2s", textAlign: "left" }}>
                  <span style={{ fontSize: "18px", lineHeight: 1 }}>{n.icon}</span>
                  <span style={{ fontSize: "14px", fontWeight: "700", color: active ? "#fff" : C.muted }}>{n.label}</span>
                </button>
              );
            })}

            <div style={{ height: "1px", background: C.line, margin: "12px 0" }} />

            <button onClick={() => setTab(tab === "new" ? "home" : "new")}
              style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 14px", borderRadius: "16px", background: tab === "new" ? C.bg : C.orange, border: "none", cursor: "pointer", transition: "all 0.2s" }}>
              <span style={{ fontSize: "18px", lineHeight: 1 }}>+</span>
              <span style={{ fontSize: "14px", fontWeight: "700", color: tab === "new" ? C.muted : "#fff" }}>{tab === "new" ? "Cancelar" : "Nueva idea"}</span>
            </button>

            <button onClick={() => setShowVoice(true)}
              style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 14px", borderRadius: "16px", background: "transparent", border: "none", cursor: "pointer" }}>
              <span style={{ fontSize: "18px" }}>🎙</span>
              <span style={{ fontSize: "14px", fontWeight: "700", color: C.muted }}>Voz</span>
            </button>
          </div>

          {/* User */}
          <div onClick={signOut} title="Cerrar sesión" style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 14px", borderRadius: "16px", cursor: "pointer", background: C.bg }}>
            <div style={{ width: "34px", height: "34px", borderRadius: "10px", background: user?.user_metadata?.avatar_url ? "transparent" : C.navy, overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {user?.user_metadata?.avatar_url
                ? <img src={user.user_metadata.avatar_url} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <span style={{ fontSize: "14px", color: "#fff", fontWeight: "800" }}>{(user?.email || "U")[0].toUpperCase()}</span>}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "12px", fontWeight: "700", color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.email?.split("@")[0]}</div>
              <div style={{ fontSize: "11px", color: C.muted }}>Cerrar sesión</div>
            </div>
          </div>
        </div>
      )}

      {/* ── Main content ── */}
      <div style={{ flex: 1, minWidth: 0 }}>
      {!activeIdea && (
        <div style={{ maxWidth: isMobile ? "480px" : "1200px", margin: "0 auto", padding: isMobile ? "0 20px" : "0 40px" }}>

          {/* ── Mobile header ── */}
          {isMobile && (
            <div style={{ padding: "56px 0 24px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: "28px", fontWeight: "800", color: C.text, letterSpacing: "-0.5px" }}>Ideas Lab</div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                  {syncing ? <><Spin size={11} color={C.navy} /><span style={{ fontSize: "12px", color: C.navy, fontWeight: "600" }}>Sincronizando...</span></> : <span style={{ fontSize: "12px", color: C.green, fontWeight: "700" }}>✓ Sincronizado</span>}
                </div>
                {syncErr && <div style={{ fontSize: "12px", color: C.rose, marginTop: "3px" }}>{syncErr}</div>}
              </div>
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <button onClick={() => setShowVoice(true)} style={{ width: "44px", height: "44px", borderRadius: "14px", background: C.card, border: "none", fontSize: "18px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 10px rgba(0,0,0,0.07)" }}>🎙</button>
                <button onClick={() => setTab(tab === "new" ? "home" : "new")} style={{ height: "44px", padding: "0 20px", borderRadius: "14px", background: tab === "new" ? C.bg : C.text, color: tab === "new" ? C.muted : "#fff", border: "none", fontSize: "14px", fontWeight: "700", cursor: "pointer" }}>
                  {tab === "new" ? "Cancelar" : "+ Nueva"}
                </button>
                <div title={user?.email} onClick={signOut}
                  style={{ width: "44px", height: "44px", borderRadius: "14px", background: user?.user_metadata?.avatar_url ? "transparent" : C.navy, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0, boxShadow: "0 2px 10px rgba(0,0,0,0.1)" }}>
                  {user?.user_metadata?.avatar_url
                    ? <img src={user.user_metadata.avatar_url} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <span style={{ fontSize: "16px", color: "#fff", fontWeight: "800" }}>{(user?.email || "U")[0].toUpperCase()}</span>}
                </div>
              </div>
            </div>
          )}

          {/* ── Desktop page header ── */}
          {!isMobile && (
            <div style={{ padding: "40px 0 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: "32px", fontWeight: "800", color: C.text, letterSpacing: "-0.5px" }}>
                  {tab === "home" ? "Mis Ideas" : tab === "calendar" ? "Calendario" : tab === "connections" ? "Conexiones" : tab === "agent" ? "Agente" : "Dashboard"}
                </div>
                <div style={{ fontSize: "13px", color: C.muted, marginTop: "4px" }}>{ideas.length} ideas · {user?.email}</div>
              </div>
              {syncErr && <div style={{ fontSize: "12px", color: C.rose }}>{syncErr}</div>}
            </div>
          )}

          {/* ── Blob (mobile only) ── */}
          {tab === "home" && isMobile && <Blob syncing={syncing} total={ideas.length} />}

          {/* ── Status pills ── */}
          {tab === "home" && (
            <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
              {STATUSES.map(s => {
                const m = SM[s];
                const active = statusF === s;
                return (
                  <button key={s} onClick={() => setStatusF(active ? "Todos" : s)}
                    style={{ display: "flex", alignItems: "center", gap: "7px", padding: "8px 16px", borderRadius: "100px", background: active ? m.bg : C.card, border: `1.5px solid ${active ? m.color + "50" : "transparent"}`, cursor: "pointer", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", transition: "all 0.2s" }}>
                    <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: m.color }} />
                    <span style={{ fontSize: "12px", fontWeight: "700", color: active ? m.color : C.muted }}>{s}</span>
                    <span style={{ fontSize: "13px", fontWeight: "800", color: active ? m.color : C.text }}>{counts[s]}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* ── New form ── */}
          {tab === "new" && (
            <div className="fade" style={{ background: C.card, borderRadius: "28px", padding: "28px", marginBottom: "24px", boxShadow: "0 4px 24px rgba(0,0,0,0.08)", maxWidth: isMobile ? "100%" : "600px" }}>
              <div style={{ fontSize: "22px", fontWeight: "800", color: C.text, marginBottom: "20px", letterSpacing: "-0.3px" }}>Nueva idea</div>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Título de la idea..."
                style={{ width: "100%", background: C.bg, border: "none", borderRadius: "16px", padding: "16px 18px", color: C.text, fontSize: "16px", fontWeight: "700", marginBottom: "12px" }} />
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Descripción breve..." rows={3}
                style={{ width: "100%", background: C.bg, border: "none", borderRadius: "16px", padding: "16px 18px", color: C.sub, fontSize: "14px", marginBottom: "20px", resize: "vertical", lineHeight: "1.65" }} />
              {[{ label: "Venture", key: "venture", opts: allVentures }, { label: "Tipo", key: "type", opts: TYPES }, { label: "Estado", key: "status", opts: STATUSES }].map(({ label, key, opts }) => (
                <div key={key} style={{ marginBottom: "16px" }}>
                  <div style={{ fontSize: "11px", fontWeight: "800", color: C.muted, letterSpacing: "0.8px", marginBottom: "8px" }}>{label.toUpperCase()}</div>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {opts.map(o => (
                      <button key={o} onClick={() => setForm(f => ({ ...f, [key]: o }))}
                        style={{ padding: "9px 18px", borderRadius: "100px", background: form[key] === o ? C.text : C.bg, color: form[key] === o ? "#fff" : C.muted, border: "none", cursor: "pointer", fontSize: "13px", fontWeight: "700", transition: "all 0.15s" }}>{o}</button>
                    ))}
                  </div>
                </div>
              ))}
              <button onClick={save} style={{ marginTop: "8px", width: "100%", background: C.navy, color: "#fff", border: "none", borderRadius: "100px", padding: "16px", fontSize: "15px", fontWeight: "800", cursor: "pointer" }}>Guardar en la nube ☁</button>
            </div>
          )}

          {/* ── Search + ViewToggle + Compare ── */}
          {tab === "home" && (
            <div style={{ display: "flex", gap: "10px", marginBottom: "18px", alignItems: "center" }}>
              <div style={{ position: "relative", flex: 1 }}>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar ideas..."
                  style={{ width: "100%", background: C.card, border: "none", borderRadius: "18px", padding: "14px 54px 14px 50px", color: C.text, fontSize: "14px", boxShadow: "0 2px 14px rgba(0,0,0,0.07)" }} />
                <span style={{ position: "absolute", left: "18px", top: "50%", transform: "translateY(-50%)", fontSize: "18px", color: C.muted }}>⌕</span>
                <button onClick={load} style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", width: "38px", height: "38px", borderRadius: "12px", background: C.navy, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {syncing ? <Spin size={14} color="#fff" /> : <span style={{ color: "#fff", fontSize: "16px" }}>↻</span>}
                </button>
              </div>
              <ViewToggle view={viewMode} onChange={setViewMode} />
              <button onClick={() => { setCompareMode(m => !m); setSelectedIds([]); }}
                style={{ height: "46px", padding: "0 16px", borderRadius: "14px", background: compareMode ? C.navy : C.card, border: `1.5px solid ${compareMode ? C.navy : C.line}`, fontSize: "13px", fontWeight: "700", color: compareMode ? "#fff" : C.muted, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
                ⚖ {compareMode ? "Cancelar" : "Comparar"}
              </button>
            </div>
          )}

          {/* ── Venture filters ── */}
          {tab === "home" && (
            <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px", marginBottom: "22px", alignItems: "center" }}>
              {["Todos", ...allVentures].map(v => {
                const vm = getVM(v);
                const active = venture === v;
                return (
                  <button key={v} onClick={() => setVenture(active ? "Todos" : v)}
                    style={{ padding: "8px 18px", borderRadius: "100px", background: active ? (v === "Todos" ? C.text : vm.color) : C.card, color: active ? "#fff" : C.muted, border: "none", cursor: "pointer", fontSize: "13px", fontWeight: "700", whiteSpace: "nowrap", transition: "all 0.2s", boxShadow: active ? `0 4px 14px ${v === "Todos" ? C.text : vm.color}40` : "none", flexShrink: 0 }}>
                    {v}
                  </button>
                );
              })}
              {addingVenture ? (
                <div style={{ display: "flex", gap: "6px", alignItems: "center", flexShrink: 0 }}>
                  <input autoFocus value={newVentureName} onChange={e => setNewVentureName(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") addVenture(); if (e.key === "Escape") { setAddingVenture(false); setNewVentureName(""); } }}
                    placeholder="Nombre..."
                    style={{ width: "120px", background: C.card, border: `1.5px solid ${C.navy}40`, borderRadius: "100px", padding: "7px 14px", fontSize: "13px", fontFamily: "inherit", color: C.text }} />
                  <button onClick={addVenture} style={{ padding: "7px 14px", borderRadius: "100px", background: C.navy, color: "#fff", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: "700" }}>OK</button>
                  <button onClick={() => { setAddingVenture(false); setNewVentureName(""); }} style={{ padding: "7px 12px", borderRadius: "100px", background: C.bg, color: C.muted, border: "none", cursor: "pointer", fontSize: "13px" }}>✕</button>
                </div>
              ) : (
                <button onClick={() => setAddingVenture(true)}
                  style={{ padding: "8px 16px", borderRadius: "100px", background: C.card, color: C.muted, border: `1.5px dashed ${C.line}`, cursor: "pointer", fontSize: "13px", fontWeight: "700", whiteSpace: "nowrap", flexShrink: 0 }}>
                  + Proyecto
                </button>
              )}
            </div>
          )}

          {/* ── Home cards ── */}
          {tab === "home" && (
            !syncing && ideas.length === 0
              ? <OnboardingGuide onNewIdea={() => setTab("new")} onVoice={() => setShowVoice(true)} />
              : filtered.length === 0
              ? <div style={{ textAlign: "center", padding: "64px 0" }}>
                  <div style={{ fontSize: "44px", marginBottom: "14px" }}>💡</div>
                  <div style={{ fontSize: "18px", fontWeight: "800", color: C.text, marginBottom: "6px" }}>{syncing ? "Cargando ideas..." : "Sin ideas aquí"}</div>
                  <div style={{ fontSize: "14px", color: C.muted }}>{syncing ? "" : "Cambia el filtro o crea una nueva"}</div>
                </div>
              : viewMode === "list" ? (
                /* ── Lista ── */
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {filtered.map(idea => {
                    const vm2 = getVM(idea.venture);
                    const sm2 = SM[idea.status];
                    return (
                      <div key={idea.id} style={{ background: C.card, borderRadius: "16px", padding: "14px 18px", display: "flex", alignItems: "center", gap: "14px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", cursor: "default" }}>
                        <div style={{ width: "4px", alignSelf: "stretch", borderRadius: "2px", background: vm2.color, flexShrink: 0 }} />
                        <div style={{ width: "36px", height: "36px", borderRadius: "12px", background: vm2.light, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: "800", color: vm2.color, flexShrink: 0 }}>{vm2.letter}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: "14px", fontWeight: "700", color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{idea.title}</div>
                          {idea.description && <div style={{ fontSize: "12px", color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{idea.description}</div>}
                        </div>
                        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexShrink: 0 }}>
                          <span style={{ padding: "4px 12px", borderRadius: "100px", background: sm2.bg, color: sm2.color, fontSize: "11px", fontWeight: "700" }}>{idea.status}</span>
                          <span style={{ fontSize: "11px", color: C.muted }}>{idea.type}</span>
                          {(idea.chatHistory || []).length > 0 && <span style={{ fontSize: "11px", color: C.purple, fontWeight: "700" }}>💬{idea.chatHistory.length}</span>}
                          <button onClick={() => del(idea.id)} style={{ background: "none", border: "none", color: C.line, fontSize: "18px", cursor: "pointer", lineHeight: 1 }}
                            onMouseEnter={e => e.target.style.color = C.rose} onMouseLeave={e => e.target.style.color = C.line}>×</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : viewMode === "kanban" ? (
                /* ── Kanban ── */
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : `repeat(${STATUSES.length}, 1fr)`, gap: "14px", alignItems: "start" }}>
                  {STATUSES.map(s => {
                    const sm2    = SM[s];
                    const col    = filtered.filter(i => i.status === s);
                    return (
                      <div key={s}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", padding: "0 4px" }}>
                          <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: sm2.color }} />
                          <span style={{ fontSize: "12px", fontWeight: "800", color: sm2.color, letterSpacing: "0.5px" }}>{s.toUpperCase()}</span>
                          <span style={{ fontSize: "12px", color: C.muted, marginLeft: "auto" }}>{col.length}</span>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                          {col.map(idea => {
                            const vm2 = getVM(idea.venture);
                            return (
                              <div key={idea.id} style={{ background: C.card, borderRadius: "18px", padding: "16px", boxShadow: "0 1px 6px rgba(0,0,0,0.06)", borderTop: `3px solid ${vm2.color}` }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                                  <Tag label={idea.venture} color={vm2.color} bg={vm2.light} />
                                  <button onClick={() => del(idea.id)} style={{ background: "none", border: "none", color: C.line, fontSize: "18px", cursor: "pointer", lineHeight: 1 }}
                                    onMouseEnter={e => e.target.style.color = C.rose} onMouseLeave={e => e.target.style.color = C.line}>×</button>
                                </div>
                                <div style={{ fontSize: "13px", fontWeight: "700", color: C.text, lineHeight: 1.4, marginBottom: "6px" }}>{idea.title}</div>
                                {idea.description && <div style={{ fontSize: "12px", color: C.muted, lineHeight: "1.5", marginBottom: "8px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{idea.description}</div>}
                                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                                  <span style={{ fontSize: "11px", color: C.muted }}>{idea.type}</span>
                                  {(idea.chatHistory || []).length > 0 && <span style={{ fontSize: "11px", color: C.purple, fontWeight: "700" }}>💬{idea.chatHistory.length}</span>}
                                  {idea.expansion && <span style={{ fontSize: "11px", color: C.navy, fontWeight: "700" }}>✦</span>}
                                </div>
                              </div>
                            );
                          })}
                          {col.length === 0 && <div style={{ borderRadius: "14px", border: `2px dashed ${C.line}`, padding: "24px", textAlign: "center", fontSize: "12px", color: C.muted }}>Vacío</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* ── Cards (default) ── */
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)", gap: "14px", alignItems: "start" }}>
                  {filtered.map(idea => (
                    <IdeaCard key={idea.id} idea={idea}
                      loadingAI={expandingId === idea.id} loadingDebate={debatingId === idea.id}
                      onExpand={expand} onDebate={debate} onDelete={del}
                      onCycleStatus={cycleStatus} onEditDate={setEditIdea}
                      onUpdateChecklist={updateChecklist} onLogTime={logTime}
                      onSaveChat={saveChat} onPresent={setPresentIdea}
                      onSaveTags={saveTags} onSavePriority={savePriority} onSaveAttachments={saveAttachments}
                      compareMode={compareMode} selected={selectedIds.includes(idea.id)}
                      onToggleSelect={id => setSelectedIds(p => p.includes(id) ? p.filter(x => x !== id) : p.length < 3 ? [...p, id] : p)}
                      allIdeas={ideas} onOpen={id => setActiveIdeaId(id)} />
                  ))}
                </div>
              )
          )}

          {/* ── Other tabs ── */}
          {tab === "calendar"    && <CalView ideas={ideas} onSelectIdea={idea => { setTab("home"); setVenture("Todos"); setStatusF("Todos"); }} />}
          {tab === "connections" && <ConnectionsView ideas={ideas} loading={loadingConn} connections={connections} onGenerate={generateConnections} />}
          {tab === "data"        && <DataTab ideas={ideas} />}
          {tab === "agent"       && (
            <AgentPanel ideas={ideas} onAddIdea={({ title, description, venture: v, type, status }) => {
              const row = { id: genId(), title, description, venture: v, type, status, expansion: "", debate: "", user_id: user?.id };
              setIdeas(p => [{ ...row, createdAt: new Date().toISOString(), startDate: "", durationWeeks: 1, checklist: [], timeLogs: [], chatHistory: [], tags: [], priority: "media", attachments: [] }, ...p]);
              try { dbInsert(row); } catch {}
            }} />
          )}

          {/* ── Proyectos tab ── */}
          {tab === "projects" && !activeProject && (
            <div>
              <div style={{ fontSize: "20px", fontWeight: "800", color: C.text, marginBottom: "4px" }}>Proyectos</div>
              <div style={{ fontSize: "13px", color: C.muted, marginBottom: "24px" }}>Entra a cualquier proyecto para ver todo su historial</div>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3,1fr)", gap: "14px" }}>
                {allVentures.map(v => {
                  const vm2   = getVM(v);
                  const vIdeas = ideas.filter(i => i.venture === v);
                  const msgs   = vIdeas.reduce((s, i) => s + (i.chatHistory || []).length, 0);
                  const hrs    = vIdeas.reduce((s, i) => s + (i.timeLogs || []).reduce((ss, l) => ss + (l.hours || 0), 0), 0);
                  return (
                    <div key={v} onClick={() => setActiveProject(v)}
                      style={{ background: C.card, borderRadius: "22px", padding: "20px", cursor: "pointer", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: `1px solid ${C.line}`, transition: "all 0.2s" }}
                      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 8px 28px ${vm2.color}25`; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.06)"; }}>
                      <div style={{ width: "44px", height: "44px", borderRadius: "14px", background: vm2.light, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", fontWeight: "800", color: vm2.color, marginBottom: "14px" }}>{vm2.letter}</div>
                      <div style={{ fontSize: "16px", fontWeight: "800", color: C.text, marginBottom: "8px" }}>{v}</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <div style={{ fontSize: "12px", color: C.muted }}><span style={{ fontWeight: "700", color: vm2.color }}>{vIdeas.length}</span> ideas</div>
                        <div style={{ fontSize: "12px", color: C.muted }}><span style={{ fontWeight: "700", color: C.purple }}>{msgs}</span> msgs de chat</div>
                        <div style={{ fontSize: "12px", color: C.muted }}><span style={{ fontWeight: "700", color: C.orange }}>{hrs.toFixed(1)}h</span> registradas</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {!isMobile && <div style={{ height: "48px" }} />}
        </div>
      )}
      {activeIdea && (
        <IdeaDetailView
          idea={activeIdea}
          onBack={() => setActiveIdeaId(null)}
          onSaveChat={saveChat}
          onExpand={expand} onDebate={debate} onDelete={del}
          onCycleStatus={cycleStatus} onEditDate={setEditIdea}
          onUpdateChecklist={updateChecklist} onLogTime={logTime}
          onSaveTags={saveTags} onSavePriority={savePriority} onSaveAttachments={saveAttachments}
          onPresent={setPresentIdea}
          loadingAI={expandingId === activeIdea.id} loadingDebate={debatingId === activeIdea.id}
        />
      )}
      </div>

      {/* ── Project detail — full width ── */}
      {tab === "projects" && activeProject && (
        <ProjectView
          venture={activeProject}
          ideas={ideas}
          onBack={() => setActiveProject(null)}
          onSaveChat={saveChat}
          onExpand={expand} onDebate={debate} onDelete={del}
          onCycleStatus={cycleStatus} onEditDate={setEditIdea}
          onUpdateChecklist={updateChecklist} onLogTime={logTime}
          onSaveTags={saveTags} onSavePriority={savePriority} onSaveAttachments={saveAttachments}
          onPresent={setPresentIdea}
          expandingId={expandingId} debatingId={debatingId}
          onNewIdea={({ title, description, venture: v, type, status }) => {
            const row = { id: genId(), title, description, venture: v, type, status, expansion: "", debate: "", user_id: user?.id };
            setIdeas(p => [{ ...row, createdAt: new Date().toISOString(), startDate: "", durationWeeks: 1, checklist: [], timeLogs: [], chatHistory: [], tags: [], priority: "media", attachments: [] }, ...p]);
            try { dbInsert(row); } catch {}
          }}
        />
      )}

      {/* ── Compare modals ── */}
      {showCompare && selectedIds.length >= 2 && (
        <CompareModal ideas={ideas.filter(i => selectedIds.includes(i.id))} onClose={() => setShowCompare(false)} />
      )}

      {/* ── Compare floating bar ── */}
      {compareMode && selectedIds.length >= 2 && !showCompare && (
        <div style={{ position: "fixed", bottom: isMobile ? "90px" : "24px", left: "50%", transform: "translateX(-50%)", zIndex: 900, background: C.navy, borderRadius: "100px", padding: "12px 20px", display: "flex", alignItems: "center", gap: "14px", boxShadow: `0 8px 32px ${C.navy}50` }}>
          <span style={{ fontSize: "13px", fontWeight: "700", color: "#fff" }}>{selectedIds.length} ideas seleccionadas</span>
          <button onClick={() => setShowCompare(true)} style={{ background: "#fff", color: C.navy, border: "none", borderRadius: "100px", padding: "8px 18px", fontSize: "13px", fontWeight: "800", cursor: "pointer" }}>⚖ Comparar</button>
        </div>
      )}

      {/* ── Mobile bottom nav ── */}
      {isMobile && (
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "rgba(255,255,255,0.92)", backdropFilter: "blur(20px)", borderTop: `1px solid ${C.line}`, boxShadow: "0 -4px 30px rgba(0,0,0,0.07)" }}>
        <div style={{ maxWidth: "480px", margin: "0 auto", display: "flex", padding: "10px 20px 20px" }}>
          {NAV.map(n => {
            const active = tab === n.id;
            return (
              <button key={n.id} onClick={() => setTab(n.id)}
                style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "3px", background: "transparent", border: "none", cursor: "pointer", padding: "6px 0", transition: "all 0.2s" }}>
                <div style={{ width: "44px", height: "44px", borderRadius: "14px", background: active ? C.navy : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", transition: "all 0.2s" }}>{n.icon}</div>
                <span style={{ fontSize: "10px", fontWeight: "700", color: active ? C.navy : C.muted, letterSpacing: "0.3px" }}>{n.label}</span>
              </button>
            );
          })}
        </div>
      </div>
      )}
    </div>
  );
}
