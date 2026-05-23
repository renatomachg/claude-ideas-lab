import { useState, useEffect, useCallback, useRef } from "react";

// ─── Supabase ─────────────────────────────────────────────────────────
const SB_URL  = "https://qeelvcpfayknmfuspltt.supabase.co";
const SB_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlZWx2Y3BmYXlrbm1mdXNwbHR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0OTY2NzYsImV4cCI6MjA5NTA3MjY3Nn0.BW-hAQLrTv5vhNQHCnDNqIW0kUHhIQgHtOeMoOBl-vg";
const USER_KEY = "renato";

const sb = async (method, path, body) => {
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
    method,
    headers: { "Content-Type": "application/json", "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}`, "Prefer": "return=representation" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const t = await res.text();
  return t ? JSON.parse(t) : null;
};

const dbLoad   = ()          => sb("GET",    `ideas?user_key=eq.${USER_KEY}&order=created_at.desc`);
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

const VENTURES = ["Mercasync", "Maker Home", "Holadiseño", "Kyoszen", "Personal", "Inversión"];
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

const EFFORT_C = { "< 1 día": C.green, "1-3 días": C.yellow, "1 semana": C.orange, "2 semanas": C.purple, "1 mes+": C.rose };

const genId   = () => `i_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
const toYMD   = (d) => d.toISOString().slice(0, 10);
const today   = () => new Date();
const fmtDate = (iso) => iso ? new Date(iso + "T12:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "short" }) : "";

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

// ─── Voice Capture ────────────────────────────────────────────────────
const VoiceCapture = ({ onCapture, onClose }) => {
  const [listening,   setListening]   = useState(false);
  const [transcript,  setTranscript]  = useState("");
  const [error,       setError]       = useState("");
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

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 2000, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.card, borderRadius: "28px 28px 0 0", padding: "36px 28px 52px", width: "100%", maxWidth: "480px", textAlign: "center" }}>
        <div style={{ fontSize: "20px", fontWeight: "800", color: C.text, marginBottom: "6px" }}>Captura por voz</div>
        <div style={{ fontSize: "14px", color: C.muted, marginBottom: "32px" }}>Di el título de tu idea</div>
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
            <button onClick={onClose} style={{ flex: 1, background: C.bg, color: C.muted, border: "none", borderRadius: "100px", padding: "14px", fontSize: "14px", fontWeight: "600", cursor: "pointer" }}>Cancelar</button>
            <button onClick={() => onCapture(transcript)} style={{ flex: 2, background: C.navy, color: "#fff", border: "none", borderRadius: "100px", padding: "14px", fontSize: "14px", fontWeight: "800", cursor: "pointer" }}>Usar esta →</button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Idea Card — Niva faithful ────────────────────────────────────────
const IdeaCard = ({ idea, onExpand, onDebate, onDelete, onCycleStatus, onEditDate, onUpdateChecklist, onLogTime, onPresent, loadingAI, loadingDebate }) => {
  const vm = VM[idea.venture] || VM["Personal"];
  const sm = SM[idea.status];
  const [panel, setPanel] = useState(null);
  const totalTime = (idea.timeLogs || []).reduce((s, l) => s + (l.hours || 0), 0);

  const toggle = (p) => {
    if (panel === p) { setPanel(null); return; }
    setPanel(p);
    if (p === "analysis") onExpand(idea);
    if (p === "debate")   onDebate(idea);
  };

  return (
    <div style={{ background: C.card, borderRadius: "24px", overflow: "hidden", boxShadow: "0 2px 16px rgba(0,0,0,0.07)", transition: "transform 0.2s, box-shadow 0.2s" }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 12px 36px rgba(0,0,0,0.1)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)";    e.currentTarget.style.boxShadow = "0 2px 16px rgba(0,0,0,0.07)"; }}>

      {/* Top color bar */}
      <div style={{ height: "4px", background: `linear-gradient(90deg, ${vm.color}, ${vm.color}30)` }} />

      <div style={{ padding: "22px 22px 20px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
          <Tag label={idea.venture} color={vm.color} bg={vm.light} />
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button onClick={() => onPresent(idea)} style={{ background: "none", border: "none", color: C.muted, fontSize: "18px", cursor: "pointer", lineHeight: 1 }} title="Modo presentación">⎙</button>
            <button onClick={() => onDelete(idea.id)} style={{ background: "none", border: "none", color: C.line, fontSize: "22px", cursor: "pointer", lineHeight: 1, transition: "color 0.15s" }}
              onMouseEnter={e => e.target.style.color = C.orange} onMouseLeave={e => e.target.style.color = C.line}>×</button>
          </div>
        </div>

        {/* Title + avatar — Niva style */}
        <div style={{ display: "flex", gap: "14px", alignItems: "flex-start", marginBottom: "14px" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "18px", fontWeight: "800", color: C.text, lineHeight: 1.3, letterSpacing: "-0.2px", marginBottom: "6px" }}>{idea.title}</div>
            {idea.description && <div style={{ fontSize: "13px", color: C.sub, lineHeight: "1.65" }}>{idea.description}</div>}
          </div>
          <AvatarBox letter={vm.letter} color={vm.color} />
        </div>

        {/* Meta row */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px", alignItems: "center" }}>
          <button onClick={() => onCycleStatus(idea)} style={{ padding: "6px 14px", borderRadius: "100px", background: sm.bg, color: sm.color, border: "none", cursor: "pointer", fontSize: "12px", fontWeight: "700" }}>{idea.status}</button>
          <span style={{ padding: "6px 14px", borderRadius: "100px", background: C.bg, color: C.muted, fontSize: "12px", fontWeight: "600" }}>{idea.type}</span>
          {idea.startDate && <span style={{ padding: "6px 14px", borderRadius: "100px", background: "#E8ECF8", color: C.navy, fontSize: "12px", fontWeight: "700" }}>📅 {fmtDate(idea.startDate)}</span>}
          {totalTime > 0 && <span style={{ padding: "6px 14px", borderRadius: "100px", background: "#FEF0EA", color: C.orange, fontSize: "12px", fontWeight: "700" }}>⏱ {totalTime.toFixed(1)}h</span>}
          <button onClick={() => onEditDate(idea)} style={{ padding: "6px 12px", borderRadius: "100px", background: C.bg, color: C.muted, border: "none", cursor: "pointer", fontSize: "12px" }}>📅 Fecha</button>
          <span style={{ fontSize: "12px", color: C.muted, marginLeft: "auto" }}>{fmtDate(idea.createdAt)}</span>
        </div>

        {/* Action buttons — Niva pill style */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "4px" }}>
          <button onClick={() => toggle("analysis")}
            style={{ padding: "13px", borderRadius: "16px", border: "none", background: panel === "analysis" ? C.bg : C.navy, color: panel === "analysis" ? C.muted : "#fff", fontSize: "13px", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "7px", transition: "all 0.2s" }}>
            {loadingAI ? <><Spin size={14} color={panel === "analysis" ? C.navy : "#fff"} /> Analizando</> : panel === "analysis" ? "Cerrar ✦" : "✦ Expandir"}
          </button>
          <button onClick={() => toggle("debate")}
            style={{ padding: "13px", borderRadius: "16px", border: "none", background: panel === "debate" ? "#FFF8F8" : C.rose, color: panel === "debate" ? C.rose : "#fff", fontSize: "13px", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "7px", transition: "all 0.2s" }}>
            {loadingDebate ? <><Spin size={14} color={panel === "debate" ? C.rose : "#fff"} /> Debatiendo</> : panel === "debate" ? "Cerrar ⚔" : "⚔ Debatir"}
          </button>
          <button onClick={() => toggle("checklist")}
            style={{ padding: "13px", borderRadius: "16px", border: `1.5px solid ${C.purple}30`, background: panel === "checklist" ? "#F2EDF9" : "transparent", color: C.purple, fontSize: "13px", fontWeight: "700", cursor: "pointer", transition: "all 0.2s" }}>
            ✓ Checklist {idea.checklist?.length > 0 ? `(${idea.checklist.filter(s => s.done).length}/${idea.checklist.length})` : ""}
          </button>
          <button onClick={() => toggle("time")}
            style={{ padding: "13px", borderRadius: "16px", border: `1.5px solid ${C.orange}30`, background: panel === "time" ? "#FEF0EA" : "transparent", color: C.orange, fontSize: "13px", fontWeight: "700", cursor: "pointer", transition: "all 0.2s" }}>
            ⏱ Tiempo {totalTime > 0 ? `(${totalTime.toFixed(1)}h)` : ""}
          </button>
        </div>

        {/* Panels */}
        {panel === "analysis" && !loadingAI  && idea.expansion && <AnalysisPanel raw={idea.expansion} />}
        {panel === "analysis" && loadingAI   && <div style={{ display: "flex", justifyContent: "center", padding: "32px" }}><Spin size={28} color={C.navy} /></div>}
        {panel === "debate"   && !loadingDebate && idea.debate && <DebatePanel raw={idea.debate} />}
        {panel === "debate"   && loadingDebate  && <div style={{ display: "flex", justifyContent: "center", padding: "32px" }}><Spin size={28} color={C.rose} /></div>}
        {panel === "checklist" && <Checklist idea={idea} onUpdate={steps => onUpdateChecklist(idea.id, steps)} />}
        {panel === "time"      && <TimeTracker idea={idea} onLog={logs => onLogTime(idea.id, logs)} />}
      </div>
    </div>
  );
};

// ─── Main App ─────────────────────────────────────────────────────────
export default function App() {
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
  const [connections, setConnections] = useState(null);
  const [loadingConn, setLoadingConn] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", venture: "Mercasync", type: "Artifact", status: "Idea" });

  const mapRow = r => ({
    id: r.id, title: r.title, description: r.description,
    venture: r.venture, type: r.type, status: r.status,
    createdAt: r.created_at, expansion: r.expansion || "",
    debate: r.debate || "", startDate: r.start_date || "",
    durationWeeks: r.duration_weeks || 1,
    checklist: (() => { try { return JSON.parse(r.checklist || "[]"); } catch { return []; } })(),
    timeLogs:  (() => { try { return JSON.parse(r.time_logs || "[]"); } catch { return []; } })(),
  });

  const load = useCallback(async () => {
    setSyncing(true); setSyncErr(null);
    try { const rows = await dbLoad(); setIdeas(rows.map(mapRow)); }
    catch { setSyncErr("Error de conexión"); }
    setSyncing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form.title.trim()) return;
    const row = { id: genId(), title: form.title, description: form.description, venture: form.venture, type: form.type, status: form.status, expansion: "", debate: "", user_key: USER_KEY };
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

  const counts = STATUSES.reduce((a, s) => { a[s] = ideas.filter(i => i.status === s).length; return a; }, {});

  const NAV = [
    { id: "home",        icon: "⊙", label: "Home"      },
    { id: "calendar",    icon: "◫", label: "Calendar"  },
    { id: "connections", icon: "🔗", label: "Links"    },
    { id: "data",        icon: "⌗", label: "Data"      },
  ];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'DM Sans', system-ui, sans-serif", paddingBottom: "90px" }}>
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
        input[type="date"]::-webkit-calendar-picker-indicator { opacity: 0.4; }
        button { font-family: inherit; }
      `}</style>

      {presentIdea && <PresentationMode idea={presentIdea} onClose={() => setPresentIdea(null)} />}
      {showVoice   && <VoiceCapture onCapture={txt => { setShowVoice(false); setForm(f => ({ ...f, title: txt })); setTab("new"); }} onClose={() => setShowVoice(false)} />}
      {editIdea    && <DateModal idea={editIdea} onSave={saveDate} onClose={() => setEditIdea(null)} />}

      <div style={{ maxWidth: "480px", margin: "0 auto", padding: "0 20px" }}>

        {/* ── Header ── */}
        <div style={{ padding: "56px 0 24px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "28px", fontWeight: "800", color: C.text, letterSpacing: "-0.5px" }}>Ideas Lab</div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
              {syncing ? <><Spin size={11} color={C.navy} /><span style={{ fontSize: "12px", color: C.navy, fontWeight: "600" }}>Sincronizando...</span></> : <span style={{ fontSize: "12px", color: C.green, fontWeight: "700" }}>✓ Sincronizado</span>}
            </div>
            {syncErr && <div style={{ fontSize: "12px", color: C.rose, marginTop: "3px" }}>{syncErr}</div>}
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={() => setShowVoice(true)} style={{ width: "44px", height: "44px", borderRadius: "14px", background: C.card, border: "none", fontSize: "18px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 10px rgba(0,0,0,0.07)" }}>🎙</button>
            <button onClick={() => setTab(tab === "new" ? "home" : "new")} style={{ height: "44px", padding: "0 20px", borderRadius: "14px", background: tab === "new" ? C.bg : C.text, color: tab === "new" ? C.muted : "#fff", border: "none", fontSize: "14px", fontWeight: "700", cursor: "pointer" }}>
              {tab === "new" ? "Cancelar" : "+ Nueva"}
            </button>
          </div>
        </div>

        {/* ── Blob ── */}
        {tab === "home" && <Blob syncing={syncing} total={ideas.length} />}

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
          <div className="fade" style={{ background: C.card, borderRadius: "28px", padding: "28px", marginBottom: "24px", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
            <div style={{ fontSize: "22px", fontWeight: "800", color: C.text, marginBottom: "20px", letterSpacing: "-0.3px" }}>Nueva idea</div>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Título de la idea..."
              style={{ width: "100%", background: C.bg, border: "none", borderRadius: "16px", padding: "16px 18px", color: C.text, fontSize: "16px", fontWeight: "700", marginBottom: "12px" }} />
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Descripción breve..." rows={3}
              style={{ width: "100%", background: C.bg, border: "none", borderRadius: "16px", padding: "16px 18px", color: C.sub, fontSize: "14px", marginBottom: "20px", resize: "vertical", lineHeight: "1.65" }} />
            {[{ label: "Venture", key: "venture", opts: VENTURES }, { label: "Tipo", key: "type", opts: TYPES }, { label: "Estado", key: "status", opts: STATUSES }].map(({ label, key, opts }) => (
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

        {/* ── Search ── */}
        {tab === "home" && (
          <div style={{ position: "relative", marginBottom: "18px" }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar ideas..."
              style={{ width: "100%", background: C.card, border: "none", borderRadius: "18px", padding: "14px 54px 14px 50px", color: C.text, fontSize: "14px", boxShadow: "0 2px 14px rgba(0,0,0,0.07)" }} />
            <span style={{ position: "absolute", left: "18px", top: "50%", transform: "translateY(-50%)", fontSize: "18px", color: C.muted }}>⌕</span>
            <button onClick={load} style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", width: "38px", height: "38px", borderRadius: "12px", background: C.navy, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {syncing ? <Spin size={14} color="#fff" /> : <span style={{ color: "#fff", fontSize: "16px" }}>↻</span>}
            </button>
          </div>
        )}

        {/* ── Venture filters ── */}
        {tab === "home" && (
          <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px", marginBottom: "22px" }}>
            {["Todos", ...VENTURES].map(v => {
              const vm = VM[v];
              const active = venture === v;
              return (
                <button key={v} onClick={() => setVenture(v)}
                  style={{ padding: "8px 18px", borderRadius: "100px", background: active ? (vm ? vm.color : C.text) : C.card, color: active ? "#fff" : C.muted, border: "none", cursor: "pointer", fontSize: "13px", fontWeight: "700", whiteSpace: "nowrap", transition: "all 0.2s", boxShadow: active ? `0 4px 14px ${vm ? vm.color : C.text}40` : "none" }}>
                  {v}
                </button>
              );
            })}
          </div>
        )}

        {/* ── Home cards ── */}
        {tab === "home" && (
          filtered.length === 0
            ? <div style={{ textAlign: "center", padding: "64px 0" }}>
                <div style={{ fontSize: "44px", marginBottom: "14px" }}>💡</div>
                <div style={{ fontSize: "18px", fontWeight: "800", color: C.text, marginBottom: "6px" }}>{syncing ? "Cargando ideas..." : "Sin ideas aquí"}</div>
                <div style={{ fontSize: "14px", color: C.muted }}>{syncing ? "" : "Cambia el filtro o crea una nueva"}</div>
              </div>
            : <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {filtered.map(idea => (
                  <IdeaCard key={idea.id} idea={idea}
                    loadingAI={expandingId === idea.id} loadingDebate={debatingId === idea.id}
                    onExpand={expand} onDebate={debate} onDelete={del}
                    onCycleStatus={cycleStatus} onEditDate={setEditIdea}
                    onUpdateChecklist={updateChecklist} onLogTime={logTime}
                    onPresent={setPresentIdea} />
                ))}
              </div>
        )}

        {/* ── Other tabs ── */}
        {tab === "calendar"    && <CalView ideas={ideas} onSelectIdea={idea => { setTab("home"); setVenture("Todos"); setStatusF("Todos"); }} />}
        {tab === "connections" && <ConnectionsView ideas={ideas} loading={loadingConn} connections={connections} onGenerate={generateConnections} />}
        {tab === "data"        && <DataTab ideas={ideas} />}

      </div>

      {/* ── Bottom nav — Niva style ── */}
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
    </div>
  );
}
