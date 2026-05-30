import { useState, useEffect, useRef } from "react";

// localStorage polyfill para window.storage
window.storage = {
  get: (key) => Promise.resolve({ value: localStorage.getItem(key) }),
  set: (key, value) => { localStorage.setItem(key, value); return Promise.resolve(); },
};

// ─── Brand palette ───────────────────────────────────────────────────────────
const C = {
  bg:        "#091320",
  bgGrad:    "#0c1928",
  card:      "#11203a",
  card2:     "#1a2f4e",
  border:    "#22395a",
  borderLt:  "#2d4a70",
  navy:      "#243f60",
  gold:      "#d9b318",
  goldDim:   "#d9b31818",
  goldSoft:  "#e6c843",
  blue:      "#4a8bbd",
  blueDim:   "#326c9618",
  text:      "#eef3fc",
  muted:     "#7090b3",
  faint:     "#48637f",
  green:     "#3fd48c",
  greenDim:  "#3fd48c18",
  red:       "#f87171",
  orange:    "#fb923c",
  shadow:    "0 8px 24px rgba(0,0,0,0.35)",
  shadowSm:  "0 2px 8px rgba(0,0,0,0.25)",
};

const WA = "https://wa.me/5511943215326?text=" +
  encodeURIComponent("Olá! O meu app de acompanhamento com o Dr. Filipe Leão indicou que estou com dificuldades no processo. Gostaria de saber como posso obter suporte. Poderia me ajudar?");

// ─── Utilities ───────────────────────────────────────────────────────────────
function scoreColor(v) { return v >= 80 ? C.green : v >= 60 ? C.gold : C.red; }
function fmtDate(str) {
  if (!str) return "—";
  const d = new Date(str + "T12:00:00");
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "2-digit" });
}
function getDayInfo() {
  const d = new Date().getDay();
  return { isFriday: d === 5, isSaturday: d === 6, isSunday: d === 0, isWeekend: d === 6 || d === 0 };
}
function calcScore(a) {
  const hydration = a.agua === "sim" ? 100 : 0;
  const nutrition = a.plano === "sim" ? 100 : 0;
  const sleepTime  = { "7a9": 100, menos7: 35, mais9: 35 }[a.horasDormir] ?? 50;
  const sleepStart = { ate22: 100, "22meia": 60, apos: 15 }[a.inicioSono]  ?? 50;
  const sleepCont  = a.dormidoDireto === "sim" ? 100 : 35;
  const sleep = Math.round((sleepTime + sleepStart + sleepCont) / 3);
  const m  = { zero: 0, menos3: 40, "3x": 72, mais3: 100 }[a.musculacao] ?? 0;
  const c  = { zero: 0, menos3: 40, "3x": 72, mais3: 100 }[a.aerobico]   ?? 0;
  const im = { leve: 0.8, moderada: 1.0, intensa: 1.15 }[a.intensidade]   ?? 0.9;
  const training = Math.min(100, Math.round(((m + c) / 2) * im));
  return { hydration, nutrition, sleep, training, overall: Math.round((hydration + nutrition + sleep + training) / 4) };
}

// ─── Atoms ───────────────────────────────────────────────────────────────────
function Ring({ value = 0, size = 80, stroke = 8 }) {
  const r = (size - stroke) / 2, circ = 2 * Math.PI * r;
  const dash = (Math.max(0, Math.min(100, value)) / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", display: "block" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.border} strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={scoreColor(value)} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.8s ease" }} />
    </svg>
  );
}
function YesNo({ value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 12 }}>
      {[["sim","✓ Sim",C.green],["nao","✗ Não",C.red]].map(([v,l,col]) => (
        <button key={v} onClick={() => onChange(v)} style={{
          flex:1, padding:"20px 8px", borderRadius:16,
          background: value===v ? col+"22" : C.card, border:`2px solid ${value===v ? col : C.border}`,
          color: value===v ? col : C.muted, fontSize:17, fontWeight:800, cursor:"pointer",
          fontFamily:"inherit", transition:"all 0.15s",
        }}>{l}</button>
      ))}
    </div>
  );
}
function Opt({ label, sub, sel, onClick, accent }) {
  const ac = accent || C.gold;
  return (
    <button onClick={onClick} style={{
      width:"100%", padding:"15px 18px", borderRadius:14,
      background: sel ? ac+"18" : C.card, border:`2px solid ${sel ? ac : C.border}`,
      cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"space-between",
      textAlign:"left", transition:"all 0.15s", fontFamily:"inherit",
    }}>
      <div>
        <div style={{ color: sel ? ac : C.text, fontSize:15, fontWeight:600 }}>{label}</div>
        {sub && <div style={{ color:C.muted, fontSize:12, marginTop:2 }}>{sub}</div>}
      </div>
      <div style={{ width:20, height:20, borderRadius:"50%", flexShrink:0,
        border:`2px solid ${sel ? ac : C.border}`, background: sel ? ac : "transparent",
        display:"flex", alignItems:"center", justifyContent:"center" }}>
        {sel && <div style={{ width:7, height:7, borderRadius:"50%", background:C.bg }} />}
      </div>
    </button>
  );
}
function TA({ value, onChange, placeholder, minHeight=120 }) {
  return (
    <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{ width:"100%", minHeight, padding:"14px 16px", borderRadius:14,
        background:C.card, border:`2px solid ${C.border}`, color:C.text, fontSize:15,
        fontFamily:"inherit", resize:"none", outline:"none", lineHeight:1.6, boxSizing:"border-box" }}
      onFocus={e => e.target.style.borderColor=C.gold}
      onBlur={e  => e.target.style.borderColor=C.border}
    />
  );
}
function Q({ children }) {
  return <h2 style={{ fontFamily:"'Montserrat',sans-serif", fontSize:20, fontWeight:700, color:C.text, lineHeight:1.4, margin:"0 0 8px" }}>{children}</h2>;
}
function QSub({ children }) {
  return <p style={{ fontSize:14, color:C.muted, margin:"0 0 4px", lineHeight:1.5, fontWeight:400 }}>{children}</p>;
}
function SectionLabel({ children, action }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
      <div style={{ fontSize:12, color:C.muted, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", fontFamily:"'Montserrat',sans-serif" }}>{children}</div>
      {action}
    </div>
  );
}
function Card({ children, style={} }) {
  return <div style={{ background:C.card, borderRadius:22, border:`1px solid ${C.border}`, boxShadow:C.shadowSm, ...style }}>{children}</div>;
}

// ─── Weight Tracker ──────────────────────────────────────────────────────────
const DEFAULT_W = { initial:{weight:"",date:""}, current:{weight:"",date:""}, goal:{weight:"",date:""} };

function WeightTracker({ onTabNav }) {
  const [data, setData]     = useState(DEFAULT_W);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]   = useState(DEFAULT_W);

  useEffect(() => {
    (async () => {
      try {
        const s = await window.storage.get("weight-data");
        if (s?.value) { const d = JSON.parse(s.value); setData(d); setDraft(d); }
        else setEditing(true);
      } catch { setEditing(true); }
    })();
  }, []);

  const save = async () => {
    setData(draft); setEditing(false);
    try {
      await window.storage.set("weight-data", JSON.stringify(draft));
      // Append current weight to history (for the evolution chart)
      const cw = parseFloat(draft.current.weight);
      const cd = draft.current.date;
      if (cw && cd) {
        let hist = [];
        try { const h = await window.storage.get("weight-history"); if (h?.value) hist = JSON.parse(h.value); } catch {}
        // ensure initial point is present
        const iw = parseFloat(draft.initial.weight), id = draft.initial.date;
        if (iw && id && !hist.some(p => p.date === id)) hist.push({ weight: iw, date: id });
        const idx = hist.findIndex(p => p.date === cd);
        if (idx >= 0) hist[idx] = { weight: cw, date: cd };
        else hist.push({ weight: cw, date: cd });
        hist.sort((a,b) => new Date(a.date) - new Date(b.date));
        await window.storage.set("weight-history", JSON.stringify(hist));
      }
    } catch {}
  };
  const setField = (key, field, val) =>
    setDraft(p => ({ ...p, [key]: { ...p[key], [field]: val } }));

  const ini = parseFloat(data.initial.weight)  || 0;
  const cur = parseFloat(data.current.weight)  || 0;
  const goal= parseFloat(data.goal.weight)     || 0;
  const hasData = ini > 0 && cur > 0 && goal > 0 && ini > goal;
  const pct = hasData ? Math.max(0, Math.min(100, Math.round(((ini - cur) / (ini - goal)) * 100))) : 0;
  const lost = hasData ? (ini - cur).toFixed(1) : null;
  const left = hasData ? (cur - goal).toFixed(1) : null;

  return (
    <Card style={{ margin:"0 20px", padding:"22px 20px" }}>
      <SectionLabel action={
        <button onClick={() => { setDraft(data); setEditing(e => !e); }} style={{
          background:"transparent", border:`1px solid ${C.borderLt}`, color:C.muted,
          fontSize:12, fontWeight:600, borderRadius:20, padding:"5px 14px", cursor:"pointer", fontFamily:"inherit"
        }}>{editing ? "Cancelar" : "Editar"}</button>
      }>Sua evolução</SectionLabel>

      {editing ? (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {[["initial","🔵 Peso inicial"],["current","🟡 Peso atual"],["goal","🟢 Meta"]].map(([key,label]) => (
            <div key={key}>
              <div style={{ fontSize:12, color:C.muted, marginBottom:6 }}>{label}</div>
              <div style={{ display:"flex", gap:10 }}>
                <input type="number" step="0.1" value={draft[key].weight}
                  onChange={e => setField(key,"weight",e.target.value)}
                  placeholder="kg" style={{
                    flex:1, padding:"11px 14px", borderRadius:12, background:C.card2,
                    border:`1px solid ${C.border}`, color:C.text, fontSize:15, outline:"none",
                    fontFamily:"inherit" }} />
                <input type="date" value={draft[key].date}
                  onChange={e => setField(key,"date",e.target.value)}
                  style={{ flex:1.4, padding:"11px 14px", borderRadius:12, background:C.card2,
                    border:`1px solid ${C.border}`, color:C.text, fontSize:13, outline:"none",
                    fontFamily:"inherit", colorScheme:"dark" }} />
              </div>
            </div>
          ))}
          <button onClick={save} style={{
            padding:"14px", borderRadius:14, border:"none", background:C.gold,
            color:C.bg, fontSize:15, fontWeight:800, cursor:"pointer", fontFamily:"'Montserrat',sans-serif",
          }}>Salvar</button>
        </div>
      ) : hasData ? (
        <>
          {/* Progress bar */}
          <div style={{ position:"relative", margin:"8px 0 24px" }}>
            <div style={{ height:6, background:C.border, borderRadius:99 }}>
              <div style={{ height:6, width:`${pct}%`, background:`linear-gradient(90deg,${C.blue},${C.gold})`, borderRadius:99, transition:"width 1s ease" }} />
            </div>
            {/* Markers */}
            {[{pct:0,col:C.blue,sz:12},{pct:pct,col:C.gold,sz:16,glow:true},{pct:100,col:C.green,sz:12}].map(({pct:p,col,sz,glow},i) => (
              <div key={i} style={{
                position:"absolute", top:"50%",
                left: p === 0 ? 0 : p === 100 ? "100%" : `${p}%`,
                transform: `translate(${p===0?0:p===100?"-100%":"-50%"},-50%)`,
                width:sz, height:sz, borderRadius:"50%", background:col,
                border:`2.5px solid ${C.bg}`,
                boxShadow: glow ? `0 0 12px ${col}90` : "none",
                transition:"left 1s ease",
              }} />
            ))}
          </div>

          {/* Labels */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:4, marginBottom:20 }}>
            {[
              { label:"Início", w:`${data.initial.weight}kg`, d:data.initial.date, col:C.blue, align:"left" },
              { label:"Atual",  w:`${data.current.weight}kg`, d:data.current.date, col:C.gold, align:"center" },
              { label:"Meta",   w:`${data.goal.weight}kg`,    d:data.goal.date,    col:C.green, align:"right" },
            ].map(({ label, w, d, col, align }) => (
              <div key={label} style={{ textAlign:align }}>
                <div style={{ fontSize:10, color:C.muted, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase" }}>{label}</div>
                <div style={{ fontSize:18, fontWeight:800, color:col, fontFamily:"'Montserrat',sans-serif", lineHeight:1.2 }}>{w}</div>
                <div style={{ fontSize:10, color:C.muted }}>{fmtDate(d)}</div>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div style={{ display:"flex", gap:10 }}>
            <div style={{ flex:1, background:C.greenDim, borderRadius:12, padding:"12px 14px", border:`1px solid ${C.green}30` }}>
              <div style={{ fontSize:11, color:C.green, fontWeight:700 }}>Eliminou</div>
              <div style={{ fontSize:20, fontWeight:800, color:C.green, fontFamily:"'Montserrat',sans-serif" }}>{lost}kg</div>
            </div>
            <div style={{ flex:1, background:C.goldDim, borderRadius:12, padding:"12px 14px", border:`1px solid ${C.gold}30` }}>
              <div style={{ fontSize:11, color:C.gold, fontWeight:700 }}>Falta</div>
              <div style={{ fontSize:20, fontWeight:800, color:C.gold, fontFamily:"'Montserrat',sans-serif" }}>{left}kg</div>
            </div>
            <div style={{ flex:1, background:C.blueDim, borderRadius:12, padding:"12px 14px", border:`1px solid ${C.blue}30` }}>
              <div style={{ fontSize:11, color:C.blue, fontWeight:700 }}>Progresso</div>
              <div style={{ fontSize:20, fontWeight:800, color:C.blue, fontFamily:"'Montserrat',sans-serif" }}>{pct}%</div>
            </div>
          </div>
        </>
      ) : (
        <div style={{ textAlign:"center", padding:"20px 0" }}>
          <div style={{ fontSize:32, marginBottom:10 }}>⚖️</div>
          <div style={{ color:C.muted, fontSize:14, lineHeight:1.6 }}>Registre seu peso inicial, atual e meta para acompanhar sua evolução.</div>
          <button onClick={() => setEditing(true)} style={{
            marginTop:16, padding:"12px 24px", borderRadius:12, border:"none",
            background:C.gold, color:C.bg, fontWeight:800, fontSize:14,
            cursor:"pointer", fontFamily:"'Montserrat',sans-serif"
          }}>Configurar agora</button>
        </div>
      )}
    </Card>
  );
}

// ─── Pílulas do método (content tips) ────────────────────────────────────────
const PILULAS = [
  { t:"Comece sempre pela proteína", d:"Ela é o que sinaliza saciedade ao seu cérebro. Quando a proteína vem primeiro, o resto da refeição fica fácil de controlar." },
  { t:"Metade do prato é proteína", d:"Proteína magra ocupando o centro, vegetais preenchendo o resto. Essa proporção simples é o coração do método." },
  { t:"Cuidado com a dupla que engorda", d:"Carboidrato e gordura juntos na mesma refeição é a combinação que mais trava o emagrecimento. Separe-os." },
  { t:"Vegetais são liberados à vontade", d:"Os vegetais sem amido dão volume e saciedade sem custo. É a fome saciada sem engordar." },
  { t:"O prazer tem lugar reservado", d:"Existe um espaço de flexibilidade no prato: até um quarto dele. Mas só depois que proteína e vegetais estão garantidos." },
  { t:"Não existe deslize que estrague tudo", d:"Existe ajuste de rota. Constância vence perfeição — sempre. O efeito sanfona nasce da culpa, não de uma refeição." },
  { t:"Bateu fome depois do prato?", d:"Coma mais vegetais, nunca mais carboidrato. O volume dos vegetais resolve a fome sem comprometer o resultado." },
  { t:"Beba água antes de comer", d:"Muitas vezes o que parece fome é só sede. Um copo de água antes da refeição muda o jogo." },
  { t:"Durma cedo para emagrecer", d:"Iniciar o sono até a meia-noite potencializa a recuperação. É dormindo que seu corpo processa a transformação." },
  { t:"Músculo é metabolismo", d:"O treino de força preserva massa magra durante o emagrecimento. Mais músculo significa um metabolismo mais ativo." },
  { t:"A balança não conta tudo", d:"Olhe para os hábitos, não só para o número. Proteína, água, sono e treino constroem o resultado que a balança só mostra depois." },
  { t:"Escolha consciente, não restrição", d:"Quer um doce? Ele ocupa o seu espaço de flexibilidade — no lugar do carboidrato, não somado a ele. Você decide com consciência." },
];

function DailyPilula() {
  const idx = Math.floor((Date.now() / 86400000)) % PILULAS.length;
  const p = PILULAS[idx];
  return (
    <div style={{ margin:"0 20px 20px" }}>
      <SectionLabel>Pílula do dia</SectionLabel>
      <div style={{ borderRadius:18, padding:"18px 20px", background:`linear-gradient(135deg,${C.blue}22,${C.card})`,
        border:`1px solid ${C.blue}40`, boxShadow:C.shadowSm }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
          <span style={{ fontSize:18 }}>💡</span>
          <span style={{ fontFamily:"'Montserrat',sans-serif", fontSize:15, fontWeight:700, color:C.text }}>{p.t}</span>
        </div>
        <div style={{ fontSize:14, color:C.muted, lineHeight:1.55 }}>{p.d}</div>
      </div>
    </div>
  );
}

// ─── Progress Tab ─────────────────────────────────────────────────────────────
function WeightChart({ history }) {
  if (!history || history.length < 2) {
    return (
      <Card style={{ padding:"28px 20px", textAlign:"center" }}>
        <div style={{ fontSize:30, marginBottom:10 }}>📉</div>
        <div style={{ color:C.muted, fontSize:14, lineHeight:1.5 }}>
          Registre seu peso ao menos duas vezes para ver sua curva de evolução aqui.
        </div>
      </Card>
    );
  }
  const W = 300, H = 150, pad = 28;
  const weights = history.map(p => p.weight);
  const min = Math.min(...weights), max = Math.max(...weights);
  const range = (max - min) || 1;
  const pts = history.map((p, i) => {
    const x = pad + (i / (history.length - 1)) * (W - pad * 2);
    const y = pad + (1 - (p.weight - min) / range) * (H - pad * 2);
    return { x, y, ...p };
  });
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = `${path} L${pts[pts.length-1].x.toFixed(1)},${H-pad} L${pts[0].x.toFixed(1)},${H-pad} Z`;
  const first = history[0].weight, last = history[history.length-1].weight;
  const elim = (first - last).toFixed(1);

  return (
    <Card style={{ padding:"20px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:6 }}>
        <span style={{ fontFamily:"'Montserrat',sans-serif", fontSize:15, fontWeight:700, color:C.text }}>Curva de evolução</span>
        {elim > 0 && <span style={{ fontSize:13, fontWeight:700, color:C.green }}>−{elim} kg</span>}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width:"100%", height:"auto", display:"block" }}>
        <defs>
          <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.gold} stopOpacity="0.25" />
            <stop offset="100%" stopColor={C.gold} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#wg)" />
        <path d={path} fill="none" stroke={C.gold} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={i===pts.length-1?4:3}
            fill={i===pts.length-1?C.gold:C.card} stroke={C.gold} strokeWidth="2" />
        ))}
      </svg>
      <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
        <span style={{ fontSize:11, color:C.muted }}>{fmtDate(history[0].date)}</span>
        <span style={{ fontSize:11, color:C.muted }}>{fmtDate(history[history.length-1].date)}</span>
      </div>
    </Card>
  );
}

function ScoreHistory({ history }) {
  if (!history || history.length === 0) {
    return (
      <Card style={{ padding:"24px 20px", textAlign:"center" }}>
        <div style={{ color:C.muted, fontSize:14, lineHeight:1.5 }}>Complete check-ins semanais para acompanhar a tendência do seu score.</div>
      </Card>
    );
  }
  const recent = history.slice(-8);
  const max = 100;
  const trend = recent.length >= 2 ? recent[recent.length-1].overall - recent[recent.length-2].overall : 0;
  return (
    <Card style={{ padding:"20px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:16 }}>
        <span style={{ fontFamily:"'Montserrat',sans-serif", fontSize:15, fontWeight:700, color:C.text }}>Histórico de scores</span>
        {trend !== 0 && (
          <span style={{ fontSize:13, fontWeight:700, color: trend>0 ? C.green : C.orange }}>
            {trend>0 ? "↑" : "↓"} {Math.abs(trend)} pts
          </span>
        )}
      </div>
      <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", gap:6, height:100 }}>
        {recent.map((s, i) => (
          <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
            <div style={{ width:"100%", maxWidth:24, height:`${(s.overall/max)*80}px`,
              background:scoreColor(s.overall), borderRadius:6, transition:"height 0.5s" }} />
            <span style={{ fontSize:10, color:C.muted, fontWeight:700 }}>{s.overall}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function Achievements({ weightData, scoreHistory, streak }) {
  const ini = parseFloat(weightData?.initial?.weight) || 0;
  const cur = parseFloat(weightData?.current?.weight) || 0;
  const goal = parseFloat(weightData?.goal?.weight) || 0;
  const elim = ini && cur ? ini - cur : 0;
  const reached = goal && cur && cur <= goal;
  const bestScore = scoreHistory?.length ? Math.max(...scoreHistory.map(s=>s.overall)) : 0;

  const badges = [
    { icon:"⚖️", label:"Primeiro kg eliminado", got: elim >= 1 },
    { icon:"🔥", label:"4 semanas seguidas",     got: streak >= 4 },
    { icon:"💪", label:"Score acima de 80",       got: bestScore >= 80 },
    { icon:"🎯", label:"5 kg eliminados",          got: elim >= 5 },
    { icon:"⭐", label:"8 check-ins feitos",       got: (scoreHistory?.length||0) >= 8 },
    { icon:"🏆", label:"Meta atingida",            got: reached },
  ];

  return (
    <div>
      <SectionLabel>Conquistas</SectionLabel>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
        {badges.map(b => (
          <div key={b.label} style={{
            background: b.got ? C.goldDim : C.card, borderRadius:16, padding:"16px 8px",
            border:`1px solid ${b.got ? C.gold+"50" : C.border}`, textAlign:"center",
            opacity: b.got ? 1 : 0.45,
          }}>
            <div style={{ fontSize:26, marginBottom:6, filter: b.got ? "none" : "grayscale(1)" }}>{b.icon}</div>
            <div style={{ fontSize:10.5, color: b.got ? C.gold : C.muted, fontWeight:600, lineHeight:1.3 }}>{b.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReferralSeal({ count, onChange }) {
  const level = count >= 6 ? { t:"Embaixador do Clube", icon:"👑", col:C.gold }
              : count >= 3 ? { t:"Mentor", icon:"⭐", col:C.blue }
              : count >= 1 ? { t:"Inspirador", icon:"🌱", col:C.green }
              : { t:"Comece a indicar", icon:"🤝", col:C.muted };
  return (
    <div>
      <SectionLabel>Quem você já ajudou</SectionLabel>
      <Card style={{ padding:"22px 20px", textAlign:"center",
        background: count>0 ? `linear-gradient(135deg,${level.col}1e,${C.card})` : C.card,
        border:`1px solid ${count>0 ? level.col+"50" : C.border}` }}>
        <div style={{ fontSize:40, marginBottom:8 }}>{level.icon}</div>
        <div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:18, fontWeight:800, color: count>0 ? level.col : C.muted }}>{level.t}</div>
        <div style={{ fontSize:14, color:C.text, lineHeight:1.5, margin:"10px 0 4px" }}>
          {count > 0
            ? <>Você já ajudou <b style={{ color:level.col }}>{count} {count===1?"pessoa":"pessoas"}</b> a sair do efeito sanfona.</>
            : "Indique amigos para o Clube e acompanhe quantas pessoas você já ajudou a transformar a vida."}
        </div>
        <a href={`https://wa.me/?text=${encodeURIComponent("Estou no Clube Anti Efeito Sanfona e quero te indicar. O método mudou minha relação com o emagrecimento — fala com a equipe do Dr. Filipe Leão: wa.me/5511943215326")}`}
          target="_blank" rel="noopener noreferrer" style={{
          display:"inline-block", marginTop:14, padding:"12px 22px", borderRadius:12,
          background:C.gold, color:C.bg, fontSize:14, fontWeight:700, textDecoration:"none",
          fontFamily:"'Montserrat',sans-serif",
        }}>Indicar um amigo →</a>
        {/* demo control */}
        <div style={{ marginTop:14, display:"flex", alignItems:"center", justifyContent:"center", gap:14 }}>
          <button onClick={()=>onChange(Math.max(0,count-1))} style={{ width:30, height:30, borderRadius:"50%", border:`1px solid ${C.border}`, background:C.card2, color:C.muted, fontSize:16, cursor:"pointer" }}>−</button>
          <span style={{ fontSize:12, color:C.faint }}>demonstração: {count}</span>
          <button onClick={()=>onChange(count+1)} style={{ width:30, height:30, borderRadius:"50%", border:`1px solid ${C.border}`, background:C.card2, color:C.muted, fontSize:16, cursor:"pointer" }}>+</button>
        </div>
      </Card>
    </div>
  );
}

function ShareCard({ weightData }) {
  const [generating, setGenerating] = useState(false);
  const ini = parseFloat(weightData?.initial?.weight) || 0;
  const cur = parseFloat(weightData?.current?.weight) || 0;
  const elim = ini && cur ? (ini - cur).toFixed(1).replace(".", ",") : "0";
  const days = (() => {
    const id = weightData?.initial?.date, cd = weightData?.current?.date;
    if (!id || !cd) return null;
    return Math.max(1, Math.round((new Date(cd) - new Date(id)) / 86400000));
  })();

  const generate = async () => {
    setGenerating(true);
    try {
      const cv = document.createElement("canvas");
      cv.width = 1080; cv.height = 1080;
      const ctx = cv.getContext("2d");
      // bg
      const g = ctx.createLinearGradient(0,0,1080,1080);
      g.addColorStop(0,"#243f60"); g.addColorStop(1,"#0a1520");
      ctx.fillStyle = g; ctx.fillRect(0,0,1080,1080);
      // gold ring
      ctx.strokeStyle = "#d9b318"; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(540,300,130,0,Math.PI*2); ctx.stroke();
      // logo
      await new Promise(res => {
        const img = new Image();
        img.onload = () => {
          ctx.save();
          ctx.beginPath(); ctx.arc(540,300,118,0,Math.PI*2); ctx.clip();
          ctx.drawImage(img,422,182,236,236); ctx.restore(); res();
        };
        img.onerror = res; img.src = LOGO;
      });
      // texts
      ctx.textAlign = "center";
      ctx.fillStyle = "#d9b318"; ctx.font = "bold 34px Montserrat, sans-serif";
      ctx.fillText("ELIMINEI", 540, 540);
      ctx.fillStyle = "#eef3fc"; ctx.font = "bold 180px Montserrat, sans-serif";
      ctx.fillText(`${elim}`, 540, 720);
      ctx.font = "bold 60px Montserrat, sans-serif";
      ctx.fillText("KG", 540, 790);
      if (days) {
        ctx.fillStyle = "#7090b3"; ctx.font = "32px Open Sans, sans-serif";
        ctx.fillText(`em ${days} dias`, 540, 850);
      }
      ctx.fillStyle = "#d9b318"; ctx.font = "bold 28px Montserrat, sans-serif";
      ctx.fillText("CLUBE ANTI EFEITO SANFONA", 540, 960);
      ctx.fillStyle = "#7090b3"; ctx.font = "24px Open Sans, sans-serif";
      ctx.fillText("Método de emagrecimento sustentável", 540, 1000);

      const url = cv.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url; a.download = "minha-conquista-clube.png"; a.click();
    } catch {}
    setGenerating(false);
  };

  const canShare = ini && cur && (ini - cur) > 0;

  return (
    <div>
      <SectionLabel>Compartilhe sua conquista</SectionLabel>
      <Card style={{ overflow:"hidden" }}>
        {/* visual preview */}
        <div style={{ background:`linear-gradient(135deg,${C.navy},${C.bg})`, padding:"28px 20px", textAlign:"center" }}>
          <img src={LOGO} alt="" style={{ width:64, height:64, borderRadius:"50%", marginBottom:14, boxShadow:`0 0 0 2px ${C.gold}40` }} />
          <div style={{ fontSize:12, color:C.gold, fontWeight:700, letterSpacing:"0.12em", fontFamily:"'Montserrat',sans-serif" }}>ELIMINEI</div>
          <div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:56, fontWeight:800, color:C.text, lineHeight:1 }}>
            {canShare ? elim : "—"}<span style={{ fontSize:24 }}> kg</span>
          </div>
          {days && canShare && <div style={{ fontSize:14, color:C.muted, marginTop:4 }}>em {days} dias</div>}
          <div style={{ fontSize:12, color:C.gold, fontWeight:700, marginTop:14, letterSpacing:"0.08em", fontFamily:"'Montserrat',sans-serif" }}>
            CLUBE ANTI EFEITO SANFONA
          </div>
        </div>
        <button onClick={generate} disabled={!canShare||generating} style={{
          width:"100%", padding:"15px", border:"none",
          background: (!canShare||generating) ? C.border : C.gold,
          color: (!canShare||generating) ? C.muted : C.bg,
          fontSize:15, fontWeight:700, cursor:(!canShare||generating)?"not-allowed":"pointer",
          fontFamily:"'Montserrat',sans-serif",
        }}>{!canShare ? "Registre seu peso para gerar" : generating ? "Gerando imagem..." : "📲 Baixar imagem para compartilhar"}</button>
      </Card>
    </div>
  );
}

function ProgressTab() {
  const [wData, setWData]     = useState(null);
  const [wHist, setWHist]     = useState([]);
  const [sHist, setSHist]     = useState([]);
  const [refs, setRefs]       = useState(0);

  useEffect(() => {
    (async () => {
      try { const w = await window.storage.get("weight-data"); if (w?.value) setWData(JSON.parse(w.value)); } catch {}
      try { const h = await window.storage.get("weight-history"); if (h?.value) setWHist(JSON.parse(h.value)); } catch {}
      try { const s = await window.storage.get("score-history"); if (s?.value) setSHist(JSON.parse(s.value)); } catch {}
      try { const r = await window.storage.get("referrals"); if (r?.value) setRefs(parseInt(r.value)||0); } catch {}
    })();
  }, []);

  const setReferrals = async (n) => {
    setRefs(n);
    try { await window.storage.set("referrals", String(n)); } catch {}
  };
  const streak = sHist.length; // simplified: each saved check-in counts

  return (
    <div style={{ overflowY:"auto", height:"100%", paddingBottom:24 }}>
      <div style={{ padding:"30px 24px 20px", background:`linear-gradient(165deg,${C.navy}55,transparent)` }}>
        <div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:26, fontWeight:800, color:C.text, letterSpacing:"-0.01em" }}>Seu progresso</div>
      </div>
      <div style={{ padding:"0 20px", display:"flex", flexDirection:"column", gap:24 }}>
        <WeightChart history={wHist} />
        <ScoreHistory history={sHist} />
        <Achievements weightData={wData} scoreHistory={sHist} streak={streak} />
        <ShareCard weightData={wData} />
        <ReferralSeal count={refs} onChange={setReferrals} />
      </div>
    </div>
  );
}


// ─── Splash Screen ────────────────────────────────────────────────────────────
function SplashScreen({ onEnter }) {
  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column",
      background:`linear-gradient(170deg,${C.navy} 0%,${C.bg} 55%)`,
      position:"relative", overflow:"hidden" }}>

      {/* Decorative ring */}
      <div style={{ position:"absolute", top:-80, right:-80, width:280, height:280,
        borderRadius:"50%", border:`1px solid ${C.gold}15`, pointerEvents:"none" }} />
      <div style={{ position:"absolute", top:-40, right:-40, width:180, height:180,
        borderRadius:"50%", border:`1px solid ${C.gold}20`, pointerEvents:"none" }} />

      {/* Content */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center",
        justifyContent:"center", padding:"40px 32px 20px", textAlign:"center" }}>

        <img src={LOGO} alt="Logo Dr. Filipe Leão" style={{
          width:120, height:120, borderRadius:"50%", marginBottom:28,
          boxShadow:`0 8px 32px ${C.gold}40, 0 0 0 1px ${C.gold}30`
        }} />

        <div style={{ fontSize:11, color:C.gold, fontWeight:700, letterSpacing:"0.2em",
          textTransform:"uppercase", marginBottom:10, fontFamily:"'Montserrat',sans-serif" }}>
          Clube Anti Efeito Sanfona
        </div>
        <div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:28, fontWeight:800,
          color:C.text, lineHeight:1.15, marginBottom:8, letterSpacing:"-0.01em" }}>
          Dr. Filipe Leão
        </div>
        <div style={{ fontSize:15, color:C.muted, fontWeight:500, marginBottom:36, lineHeight:1.5 }}>
          Medicina aplicada ao emagrecimento
        </div>

        <div style={{ width:"100%", display:"flex", flexDirection:"column", gap:12 }}>
          <a href={WA_SUPPORT} target="_blank" rel="noopener noreferrer" style={{
            display:"flex", alignItems:"center", justifyContent:"center", gap:10,
            padding:"17px 20px", borderRadius:16, background:"#25D366",
            color:"#fff", fontSize:15, fontWeight:700, textDecoration:"none",
            fontFamily:"'Montserrat',sans-serif", boxShadow:"0 4px 20px #25D36640",
          }}>
            <span style={{fontSize:18}}>💬</span> Quero participar do Clube
          </a>
          <button onClick={onEnter} style={{
            padding:"16px 20px", borderRadius:16, border:`1px solid ${C.borderLt}`,
            background:"transparent", color:C.muted, fontSize:15, fontWeight:600,
            cursor:"pointer", fontFamily:"inherit", transition:"all 0.2s",
          }}>
            Já sou membro — acessar o app →
          </button>
        </div>
      </div>

      <div style={{ padding:"0 32px 28px", textAlign:"center" }}>
        <div style={{ fontSize:12, color:C.faint, lineHeight:1.6 }}>
          Acompanhamento médico personalizado para resultados duradouros.
        </div>
      </div>
    </div>
  );
}

// ─── Home Tab ────────────────────────────────────────────────────────────────
function HomeTab({ lastScore, onTabNav, onSettings }) {
  const { isFriday, isWeekend, isSaturday } = getDayInfo();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  return (
    <div style={{ overflowY:"auto", height:"100%", paddingBottom:24 }}>
      {/* Header */}
      <div style={{ padding:"30px 24px 22px", background:`linear-gradient(165deg,${C.navy}55,${C.blue}12 45%,transparent)` }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <div style={{ fontSize:14, color:C.muted, fontWeight:500, marginBottom:6 }}>{greeting},</div>
            <div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:26, fontWeight:800, color:C.text, lineHeight:1.15, letterSpacing:"-0.01em" }}>Acompanhe sua evolução</div>
          </div>
          <button onClick={onSettings} style={{
            width:40, height:40, borderRadius:12, background:C.card,
            border:`1px solid ${C.border}`, cursor:"pointer", fontSize:18,
            display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:4,
          }}>⚙️</button>
        </div>
      </div>

      {/* Day alert */}
      {(isFriday || isWeekend) && (
        <div style={{ margin:"0 20px 18px" }}>
          <div style={{ padding:"16px 18px", borderRadius:16,
            background: isFriday ? C.goldDim : C.orange+"15",
            border:`1px solid ${isFriday ? C.gold+"45" : C.orange+"45"}` }}>
            <div style={{ fontSize:14, fontWeight:700, color: isFriday ? C.goldSoft : C.orange, marginBottom:5, fontFamily:"'Montserrat',sans-serif" }}>
              {isFriday ? "📋 É sexta — faça seu check-in" : `⚠️ ${isSaturday?"Sábado":"Domingo"} — zona de risco`}
            </div>
            <div style={{ fontSize:14, color:C.muted, lineHeight:1.5 }}>
              {isFriday
                ? "Registre sua semana agora, antes que o fim de semana sabote tudo."
                : "O fim de semana desfaz em 48h o que foi construído em 5 dias. Mantenha os 4 pilares."}
            </div>
          </div>
        </div>
      )}

      {/* Pílula do dia */}
      <DailyPilula />

      {/* Weight tracker */}
      <div style={{ marginBottom:20 }}>
        <WeightTracker />
      </div>

      {/* Last check-in */}
      <div style={{ margin:"0 20px 20px" }}>
        <SectionLabel>Última semana</SectionLabel>
        {lastScore ? (
          <Card style={{ padding:"18px 20px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:20 }}>
              <div style={{ position:"relative", flexShrink:0 }}>
                <Ring value={lastScore.overall} size={72} stroke={7} />
                <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
                  <span style={{ fontSize:18, fontWeight:800, color:scoreColor(lastScore.overall), fontFamily:"'Montserrat',sans-serif" }}>{lastScore.overall}</span>
                </div>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:700, color:C.text, marginBottom:10 }}>Score da semana</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                  {[["💧",lastScore.hydration],["🥩",lastScore.nutrition],["😴",lastScore.sleep],["🏋️",lastScore.training]].map(([e,v],i) => (
                    <div key={i} style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <span style={{ fontSize:12 }}>{e}</span>
                      <div style={{ flex:1, height:4, background:C.border, borderRadius:99 }}>
                        <div style={{ height:4, width:`${v}%`, background:scoreColor(v), borderRadius:99 }} />
                      </div>
                      <span style={{ fontSize:11, color:scoreColor(v), fontWeight:700, minWidth:24 }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        ) : (
          <Card style={{ padding:"20px", textAlign:"center" }}>
            <div style={{ color:C.muted, fontSize:14, lineHeight:1.6 }}>Nenhum check-in registrado ainda.</div>
            <button onClick={() => onTabNav("checkin")} style={{
              marginTop:12, padding:"10px 20px", borderRadius:12, border:"none",
              background:C.gold, color:C.bg, fontWeight:800, fontSize:13,
              cursor:"pointer", fontFamily:"'Montserrat',sans-serif"
            }}>Fazer check-in</button>
          </Card>
        )}
      </div>

      {/* Quick actions */}
      <div style={{ margin:"0 20px" }}>
        <SectionLabel>Acesso rápido</SectionLabel>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          {[
            { icon:"📋", label:"Check-in semanal", tint:C.gold,  tab:"checkin", sub:"nutricao" },
            { icon:"📸", label:"Analisar prato",   tint:C.blue,  tab:"nutricao", sub:"analise" },
            { icon:"🥗", label:"Sugerir refeição", tint:C.green, tab:"nutricao", sub:"ingredientes" },
            { icon:"🛒", label:"Lista de compras", tint:C.orange,tab:"nutricao", sub:"compras" },
          ].map(({ icon, label, tint, tab, sub }) => (
            <button key={label} onClick={() => onTabNav(tab, sub)} style={{
              padding:"18px 16px", borderRadius:18, background:C.card,
              border:`1px solid ${C.border}`, cursor:"pointer", fontFamily:"inherit",
              textAlign:"left", transition:"all 0.15s", boxShadow:C.shadowSm,
            }}>
              <div style={{ width:42, height:42, borderRadius:12, background:tint+"1e",
                display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, marginBottom:12 }}>{icon}</div>
              <div style={{ color:C.text, fontSize:14, fontWeight:600, lineHeight:1.35 }}>{label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Brand card */}
      <div style={{ marginTop:20 }}>
        <BrandCard />
      </div>
    </div>
  );
}

// ─── Check-in ────────────────────────────────────────────────────────────────
const PILLAR = {
  agua:"💧 Hidratação", plano:"🥩 Alimentação", dificuldade:"🥩 Alimentação",
  apetite:"📊 Sinais do corpo", coco:"📊 Sinais do corpo", papel:"📊 Sinais do corpo",
  inicioSono:"😴 Sono", horasDormir:"😴 Sono", dormidoDireto:"😴 Sono",
  musculacao:"🏋️ Treino", aerobico:"🏋️ Treino", intensidade:"🏋️ Treino",
  suplementos:"💊 Suplementos", medicacoes:"💊 Medicações", ajuda:"💬 Feedback",
};
const ALL_STEPS = ["agua","plano","dificuldade","apetite","coco","papel","inicioSono","horasDormir","dormidoDireto","musculacao","aerobico","intensidade","suplementos","medicacoes","ajuda"];
const SUPLS = ["Whey Protein","Creatina","Glutamina","Ômega 3"];

function stepRequired(id, a) {
  const map = { agua:a.agua, plano:a.plano, apetite:a.apetite, coco:a.coco, papel:a.papel,
    inicioSono:a.inicioSono, horasDormir:a.horasDormir, dormidoDireto:a.dormidoDireto,
    musculacao:a.musculacao, aerobico:a.aerobico, intensidade:a.intensidade };
  return id in map ? map[id] !== null : true;
}

function StepContent({ id, a, set, toggle }) {
  switch (id) {
    case "agua": return (<><Q>Você bateu sua meta de consumo de água essa semana?</Q><YesNo value={a.agua} onChange={v=>set("agua",v)} /></>);
    case "plano": return (<><Q>Você seguiu pelo menos 90% do seu plano alimentar?</Q><YesNo value={a.plano} onChange={v=>set("plano",v)} /></>);
    case "dificuldade": return (<><Q>O que dificultou seguir 100% do plano?</Q><QSub>Opcional.</QSub><TA value={a.dificuldade} onChange={v=>set("dificuldade",v)} placeholder="Descreva livremente..." /></>);
    case "apetite": return (<><Q>Comparado à semana passada, seu apetite:</Q><div style={{display:"flex",flexDirection:"column",gap:10}}>
      <Opt label="📉 Reduziu" sel={a.apetite==="reduziu"} onClick={()=>set("apetite","reduziu")} />
      <Opt label="➡️ Se manteve controlado" sel={a.apetite==="controlado"} onClick={()=>set("apetite","controlado")} />
      <Opt label="📈 Aumentou" sel={a.apetite==="aumentou"} onClick={()=>set("apetite","aumentou")} />
    </div></>);
    case "coco": return (<><Q>Você fez cocô pelo menos 1 vez por dia essa semana?</Q><YesNo value={a.coco} onChange={v=>set("coco",v)} /></>);
    case "papel": return (<><Q>Ao se limpar, o papel higiênico ficou:</Q><div style={{display:"flex",flexDirection:"column",gap:10}}>
      <Opt label="✅ Não ficou sujo" sel={a.papel==="limpo"} onClick={()=>set("papel","limpo")} />
      <Opt label="⚠️ Ficou pouco sujo" sel={a.papel==="pouco"} onClick={()=>set("papel","pouco")} />
      <Opt label="🔴 Ficou muito sujo" sel={a.papel==="muito"} onClick={()=>set("papel","muito")} />
    </div></>);
    case "inicioSono": return (<><Q>Em qual horário você tem iniciado o sono?</Q><div style={{display:"flex",flexDirection:"column",gap:10}}>
      <Opt label="🌙 Até as 22h" sub="Janela ideal de recuperação" sel={a.inicioSono==="ate22"} onClick={()=>set("inicioSono","ate22")} />
      <Opt label="🕙 Entre 22h e meia-noite" sub="Aceitável" sel={a.inicioSono==="22meia"} onClick={()=>set("inicioSono","22meia")} />
      <Opt label="🌅 Após meia-noite" sub="Impacta a recuperação" sel={a.inicioSono==="apos"} onClick={()=>set("inicioSono","apos")} />
    </div></>);
    case "horasDormir": return (<><Q>Quantas horas você tem dormido por noite?</Q><div style={{display:"flex",flexDirection:"column",gap:10}}>
      <Opt label="⚡ Menos de 7h" sub="Abaixo do ideal" sel={a.horasDormir==="menos7"} onClick={()=>set("horasDormir","menos7")} />
      <Opt label="✅ 7 a 9 horas" sub="Faixa ideal" sel={a.horasDormir==="7a9"} onClick={()=>set("horasDormir","7a9")} />
      <Opt label="😴 Mais de 9h" sub="Pode indicar déficit acumulado" sel={a.horasDormir==="mais9"} onClick={()=>set("horasDormir","mais9")} />
    </div></>);
    case "dormidoDireto": return (<><Q>Você tem dormido sem interromper o sono?</Q><YesNo value={a.dormidoDireto} onChange={v=>set("dormidoDireto",v)} /></>);
    case "musculacao": return (<><Q>Quantas sessões de musculação essa semana?</Q><div style={{display:"flex",flexDirection:"column",gap:10}}>
      <Opt label="❌ Nenhuma" sel={a.musculacao==="zero"} onClick={()=>set("musculacao","zero")} />
      <Opt label="⚡ Menos de 3 vezes" sel={a.musculacao==="menos3"} onClick={()=>set("musculacao","menos3")} />
      <Opt label="✅ 3 vezes" sel={a.musculacao==="3x"} onClick={()=>set("musculacao","3x")} />
      <Opt label="🔥 Mais de 3 vezes" sel={a.musculacao==="mais3"} onClick={()=>set("musculacao","mais3")} />
    </div></>);
    case "aerobico": return (<><Q>Quantas sessões de aeróbico essa semana?</Q><div style={{display:"flex",flexDirection:"column",gap:10}}>
      <Opt label="❌ Nenhuma" sel={a.aerobico==="zero"} onClick={()=>set("aerobico","zero")} />
      <Opt label="⚡ Menos de 3 vezes" sel={a.aerobico==="menos3"} onClick={()=>set("aerobico","menos3")} />
      <Opt label="✅ 3 vezes" sel={a.aerobico==="3x"} onClick={()=>set("aerobico","3x")} />
      <Opt label="🔥 Mais de 3 vezes" sel={a.aerobico==="mais3"} onClick={()=>set("aerobico","mais3")} />
    </div></>);
    case "intensidade": return (<><Q>Como foi a intensidade dos treinos?</Q><div style={{display:"flex",flexDirection:"column",gap:10}}>
      <Opt label="😌 Leve" sub="Sem esforço significativo" sel={a.intensidade==="leve"} onClick={()=>set("intensidade","leve")} />
      <Opt label="💪 Moderada" sub="Dentro do planejado" sel={a.intensidade==="moderada"} onClick={()=>set("intensidade","moderada")} />
      <Opt label="🔥 Intensa" sub="Desafiei meus limites" sel={a.intensidade==="intensa"} onClick={()=>set("intensidade","intensa")} />
    </div></>);
    case "suplementos": return (<><Q>Quais suplementos você está tomando?</Q><QSub>Selecione todos que se aplicam.</QSub>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {SUPLS.map(s => { const sel=a.suplementos.includes(s); return (
          <button key={s} onClick={()=>toggle("suplementos",s)} style={{
            padding:"14px 18px", borderRadius:14, cursor:"pointer",
            background: sel ? C.gold+"18" : C.card, border:`2px solid ${sel ? C.gold : C.border}`,
            color: sel ? C.gold : C.text, fontSize:15, fontWeight:600,
            fontFamily:"inherit", textAlign:"left", display:"flex", alignItems:"center", gap:10, transition:"all 0.15s",
          }}><span style={{fontSize:16}}>{sel?"☑":"☐"}</span>{s}</button>
        );})}
        <TA value={a.outrosSupl||""} onChange={v=>set("outrosSupl",v)} placeholder="Outros suplementos..." minHeight={56} />
      </div>
    </>);
    case "medicacoes": return (<><Q>Suas medicações e fórmulas manipuladas atuais.</Q><QSub>Deixe em branco se não houve alterações.</QSub><TA value={a.medicacoes} onChange={v=>set("medicacoes",v)} placeholder="Ex: Ozempic 0,5mg/semana..." minHeight={130} /></>);
    case "ajuda": return (<><Q>Como o Dr. Filipe Leão poderia te ajudar mais?</Q><QSub>Opcional. Vai direto para o médico.</QSub><TA value={a.ajuda} onChange={v=>set("ajuda",v)} placeholder="Compartilhe livremente..." minHeight={130} /></>);
    default: return null;
  }
}

function CheckInTab({ onScoreSaved }) {
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [a, setA]       = useState({ agua:null, plano:null, dificuldade:"", apetite:null, coco:null, papel:null, inicioSono:null, horasDormir:null, dormidoDireto:null, musculacao:null, aerobico:null, intensidade:null, suplementos:[], outrosSupl:"", medicacoes:"", ajuda:"" });
  const set = (k,v) => setA(p=>({...p,[k]:v}));
  const toggle = (k,v) => setA(p=>({...p,[k]:p[k].includes(v)?p[k].filter(x=>x!==v):[...p[k],v]}));
  const total = ALL_STEPS.length, curId = ALL_STEPS[step-1], score = calcScore(a);
  const next = () => { if (step>=total) { setDone(true); onScoreSaved(score); } else setStep(s=>s+1); };
  const back = () => { if (done) setDone(false); else if (step>0) setStep(s=>s-1); };
  const restart = () => { setStep(0); setDone(false); setA({ agua:null, plano:null, dificuldade:"", apetite:null, coco:null, papel:null, inicioSono:null, horasDormir:null, dormidoDireto:null, musculacao:null, aerobico:null, intensidade:null, suplementos:[], outrosSupl:"", medicacoes:"", ajuda:"" }); };

  if (done) {
    const { hydration, nutrition, sleep, training, overall } = score;
    const isGreat=overall>=80, isOk=overall>=60;
    const pillars=[{l:"Hidratação",v:hydration,e:"💧"},{l:"Alimentação",v:nutrition,e:"🥩"},{l:"Sono",v:sleep,e:"😴"},{l:"Treino",v:training,e:"🏋️"}];
    const weakest = pillars.reduce((a,b) => b.v < a.v ? b : a);
    const insightMap = {
      Hidratação: "A hidratação é fundamental para o metabolismo. Tente carregar sempre uma garrafa de água visível — o que está à vista é mais fácil de lembrar.",
      Alimentação: "O plano alimentar é o pilar que mais impacta o resultado. Identifique o momento do dia em que é mais difícil seguir — esse é o ponto a trabalhar.",
      Sono: "O sono está comprometendo sua recuperação e regulação hormonal. Tente antecipar o horário de dormir em 30 minutos esta semana.",
      Treino: "O treino foi o pilar mais fraco esta semana. Mesmo uma sessão curta já faz diferença — comece com o que for possível."
    };

    const yn = v => v === "sim" ? "✅ Sim" : v === "nao" ? "❌ Não" : "—";
    const hoje = new Date().toLocaleDateString("pt-BR", { weekday:"long", day:"2-digit", month:"long", year:"numeric" });
    const buildReport = () => {
      const apoMap = { ate22:"até 22h ✅", "22meia":"entre 22h e meia-noite ⚠️", apos:"após meia-noite ❌" };
      const hMap   = { "7a9":"7 a 9h ✅", menos7:"menos de 7h ❌", mais9:"mais de 9h ⚠️" };
      const treMap = { zero:"❌ Nenhuma", menos3:"⚡ Menos de 3x", "3x":"✅ 3x", mais3:"🔥 Mais de 3x" };
      const intMap = { leve:"😌 Leve", moderada:"💪 Moderada", intensa:"🔥 Intensa" };
      const apMap  = { reduziu:"📉 Reduziu", controlado:"➡️ Controlado", aumentou:"📈 Aumentou" };
      const papMap = { limpo:"✅ Não ficou sujo", pouco:"⚠️ Pouco sujo", muito:"❌ Muito sujo" };
      const supls  = [...(a.suplementos||[]), a.outrosSupl?.trim()].filter(Boolean).join(", ") || "Nenhum informado";

      const lines = [
        `📋 *CHECK-IN SEMANAL*`,
        `📅 ${hoje}`,
        ``,
        `━━━━━━━━━━━━━━━━━━━`,
        `💧 *HIDRATAÇÃO*`,
        `Meta de água batida: ${yn(a.agua)}`,
        ``,
        `🥩 *ALIMENTAÇÃO*`,
        `Plano alimentar ≥90%: ${yn(a.plano)}`,
        a.dificuldade?.trim() ? `Dificuldade relatada: "${a.dificuldade.trim()}"` : `Sem dificuldades relatadas.`,
        `Apetite: ${apMap[a.apetite] || "—"}`,
        ``,
        `📊 *SINAIS DO CORPO*`,
        `Cocô ≥1x/dia: ${yn(a.coco)}`,
        `Papel higiênico: ${papMap[a.papel] || "—"}`,
        ``,
        `😴 *SONO*`,
        `Início do sono: ${apoMap[a.inicioSono] || "—"}`,
        `Horas dormidas: ${hMap[a.horasDormir] || "—"}`,
        `Dormiu direto: ${yn(a.dormidoDireto)}`,
        ``,
        `🏋️ *TREINO*`,
        `Musculação: ${treMap[a.musculacao] || "—"}`,
        `Aeróbico: ${treMap[a.aerobico] || "—"}`,
        `Intensidade: ${intMap[a.intensidade] || "—"}`,
        ``,
        `💊 *SUPLEMENTOS*`,
        supls,
        ``,
        a.medicacoes?.trim() ? `💊 *MEDICAÇÕES*\n${a.medicacoes.trim()}` : ``,
        ``,
        a.ajuda?.trim() ? `💬 *MENSAGEM AO MÉDICO*\n"${a.ajuda.trim()}"` : ``,
        ``,
        `━━━━━━━━━━━━━━━━━━━`,
        `⭐ *SCORE DA SEMANA*`,
        `💧 Hidratação:  ${hydration}/100`,
        `🥩 Alimentação: ${nutrition}/100`,
        `😴 Sono:        ${sleep}/100`,
        `🏋️ Treino:      ${training}/100`,
        ``,
        `📊 *Score geral: ${overall}/100*`,
        ``,
        `_Enviado pelo app Clube Anti Efeito Sanfona_`,
      ].filter(l => l !== undefined);

      return lines.join("\n");
    };

    const sendReport = () => {
      const msg = buildReport();
      const url = `https://wa.me/5511943215326?text=${encodeURIComponent(msg)}`;
      window.open(url, "_blank");
    };

    return (
      <div style={{ padding:"28px 24px", overflowY:"auto", height:"100%", boxSizing:"border-box" }}>
        <div style={{ fontSize:10, color:C.muted, fontWeight:700, letterSpacing:"0.15em", textTransform:"uppercase", marginBottom:24 }}>RESULTADO DA SEMANA</div>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", marginBottom:28 }}>
          <div style={{ position:"relative", marginBottom:14 }}>
            <Ring value={overall} size={140} stroke={11} />
            <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
              <span style={{ fontSize:38, fontWeight:800, color:scoreColor(overall), fontFamily:"'Montserrat',sans-serif" }}>{overall}</span>
              <span style={{ fontSize:11, color:C.muted, fontWeight:600 }}>SCORE</span>
            </div>
          </div>
          <p style={{ color:C.text, fontSize:15, textAlign:"center", lineHeight:1.65, margin:0, maxWidth:270 }}>
            {isGreat ? "Semana impecável. Você está construindo algo real — continue assim."
            : isOk   ? "Boa semana com espaço para evoluir. Veja qual pilar precisa de atenção."
            :           "Essa semana foi difícil. Reconheça o esforço — e vamos conversar."}
          </p>
          {!isGreat && (
            <div style={{ marginTop:16, padding:"14px 16px", borderRadius:14, background:C.blueDim,
              border:`1px solid ${C.blue}40`, maxWidth:300, textAlign:"left" }}>
              <div style={{ fontSize:12, color:C.blue, fontWeight:700, marginBottom:4, fontFamily:"'Montserrat',sans-serif" }}>
                💡 Foco desta semana — {weakest.e} {weakest.l}
              </div>
              <div style={{ fontSize:13, color:C.muted, lineHeight:1.55 }}>{insightMap[weakest.l]}</div>
            </div>
          )}
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:24 }}>
          {pillars.map(p=>(
            <div key={p.l} style={{ background:C.card, borderRadius:18, padding:"20px 12px", border:`1px solid ${C.border}`, display:"flex", flexDirection:"column", alignItems:"center", gap:10 }}>
              <div style={{ position:"relative" }}>
                <Ring value={p.v} size={72} stroke={7} />
                <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}><span style={{fontSize:20}}>{p.e}</span></div>
              </div>
              <div style={{textAlign:"center"}}>
                <div style={{ fontSize:22, fontWeight:800, color:scoreColor(p.v), fontFamily:"'Montserrat',sans-serif" }}>{p.v}</div>
                <div style={{ fontSize:10, color:C.muted, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em" }}>{p.l}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Send report button — always shown */}
        <div style={{ marginBottom:14 }}>
          <button onClick={sendReport} style={{
            width:"100%", padding:"16px", borderRadius:16, border:"none",
            background:"#25D366", color:"#fff", fontSize:15, fontWeight:700,
            cursor:"pointer", fontFamily:"'Montserrat',sans-serif",
            display:"flex", alignItems:"center", justifyContent:"center", gap:10,
            boxShadow:"0 4px 16px #25D36640",
          }}>
            <span style={{fontSize:18}}>📤</span> Enviar relatório à secretária
          </button>
          <p style={{ fontSize:12, color:C.muted, textAlign:"center", marginTop:8, lineHeight:1.5 }}>
            Abre o WhatsApp com o resumo completo do seu check-in para anexar ao seu prontuário.
          </p>
        </div>

        {!isOk && (
          <div style={{marginBottom:14}}>
            <a href={WA} target="_blank" rel="noopener noreferrer" style={{ display:"block", padding:"15px", borderRadius:16, background:C.red+"22", border:`1px solid ${C.red}40`, color:C.red, fontSize:14, fontWeight:700, textAlign:"center", textDecoration:"none", fontFamily:"inherit" }}>
              ⚠️ Solicitar suporte da equipe
            </a>
          </div>
        )}
        <button onClick={restart} style={{ width:"100%", padding:"14px", borderRadius:16, border:`2px solid ${C.border}`, background:"transparent", color:C.muted, fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>↺ Novo check-in</button>
      </div>
    );
  }

  if (step === 0) {
    const { isFriday, isWeekend } = getDayInfo();
    return (
      <div style={{ padding:"36px 24px", height:"100%", boxSizing:"border-box", display:"flex", flexDirection:"column", justifyContent:"space-between" }}>
        <div>
          <div style={{ fontSize:10, letterSpacing:"0.2em", color:C.muted, fontWeight:700, textTransform:"uppercase", marginBottom:36 }}>DR. FILIPE LEÃO</div>
          <div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:40, fontWeight:800, color:C.text, lineHeight:1.1, marginBottom:14 }}>Check-in<br /><span style={{color:C.gold}}>semanal.</span></div>
          <p style={{ color:C.muted, fontSize:15, lineHeight:1.7, margin:"0 0 28px" }}>Menos de 2 minutos para registrar sua semana e acompanhar sua evolução.</p>
          {(isFriday||isWeekend) && (
            <div style={{ padding:"14px 18px", borderRadius:14, background: isFriday ? C.goldDim : C.orange+"15", border:`1px solid ${isFriday ? C.gold+"40" : C.orange+"40"}`, marginBottom:20 }}>
              <div style={{ fontSize:13, fontWeight:800, color: isFriday ? C.gold : C.orange, marginBottom:4 }}>
                {isFriday ? "📋 É sexta — hora do check-in" : "⚠️ Fim de semana — zona de risco"}
              </div>
              <div style={{ fontSize:12, color:C.muted, lineHeight:1.6 }}>
                {isFriday ? "Registre sua semana agora. O fim de semana é onde a maioria sabota as conquistas." : "O fds desfaz em 48h o que foi construído em 5 dias. Mantenha os 4 pilares."}
              </div>
            </div>
          )}
          <div style={{ display:"flex", gap:12 }}>
            {[{e:"🔥",v:"4",l:"semanas seguidas",col:C.gold},{e:"⭐",v:"78",l:"score semana passada",col:C.green}].map(({e,v,l,col})=>(
              <div key={l} style={{ flex:1, background:C.card, borderRadius:18, padding:"18px 14px", border:`1px solid ${C.border}` }}>
                <div style={{fontSize:24,marginBottom:8}}>{e}</div>
                <div style={{ fontSize:24, fontWeight:800, color:col, fontFamily:"'Montserrat',sans-serif" }}>{v}</div>
                <div style={{fontSize:11,color:C.muted,marginTop:4}}>{l}</div>
              </div>
            ))}
          </div>
        </div>
        <button onClick={next} style={{ width:"100%", padding:"18px", borderRadius:18, border:"none", background:C.gold, color:C.bg, fontSize:16, fontWeight:800, cursor:"pointer", fontFamily:"'Montserrat',sans-serif" }}>
          {isFriday ? "Fazer check-in agora →" : "Iniciar check-in →"}
        </button>
      </div>
    );
  }

  const ok = stepRequired(curId, a);
  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%" }}>
      <div style={{ padding:"22px 24px 0", flexShrink:0 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
          <span style={{ fontSize:11, color:C.muted, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase" }}>{PILLAR[curId]}</span>
          <span style={{ fontSize:12, color:C.muted }}>{step}/{total}</span>
        </div>
        <div style={{ height:3, background:C.border, borderRadius:99 }}>
          <div style={{ height:3, width:`${(step/total)*100}%`, background:C.gold, borderRadius:99, transition:"width 0.3s ease" }} />
        </div>
      </div>
      <div style={{ flex:1, padding:"28px 24px 8px", overflowY:"auto", display:"flex", flexDirection:"column", gap:16 }}>
        <StepContent id={curId} a={a} set={set} toggle={toggle} />
      </div>
      <div style={{ padding:"12px 24px 28px", flexShrink:0, display:"flex", flexDirection:"column", gap:10 }}>
        <button onClick={next} disabled={!ok} style={{
          width:"100%", padding:"16px", borderRadius:16, border:"none",
          background: !ok ? C.border : C.gold, color: !ok ? C.muted : C.bg,
          fontSize:16, fontWeight:800, cursor: !ok?"not-allowed":"pointer",
          fontFamily:"'Montserrat',sans-serif", transition:"all 0.15s",
        }}>{step===total ? "Ver meu resultado →" : "Continuar →"}</button>
        <button onClick={back} style={{ background:"transparent", border:"none", color:C.muted, fontSize:14, cursor:"pointer", padding:"8px", fontFamily:"inherit" }}>← Voltar</button>
      </div>
    </div>
  );
}

// ─── AI Systems ───────────────────────────────────────────────────────────────
const PE_SYSTEM = `Você é o assistente nutricional de um médico especialista em emagrecimento. Analise com base nos princípios de otimização proteína-energia.

FUNDAMENTOS:
- Objetivo: maximizar proteína em relação a gordura + carboidratos na refeição
- Centro do prato (≥50%): proteína animal magra — frango, peixe, atum, sardinha, camarão, carne magra, ovos, iogurte grego, cottage
- Restante: vegetais não-amiláceos à vontade — brócolis, folhas, couve-flor, tomate, pepino, abobrinha, aspargo
- Gordura: apenas a presente naturalmente na proteína. Sem gorduras livres adicionadas (manteiga, queijo em quantidade, abacate, nozes, azeite generoso)
- CRÍTICO: nunca combinar alta gordura + alto carboidrato na mesma refeição
- Carboidratos refinados: eliminar durante emagrecimento ativo

Responda SEMPRE em português brasileiro. Direto, prático, motivador. Máximo 220 palavras. Emojis com moderação.`;

const PVQ_SYSTEM = `Você é o assistente nutricional de um médico especialista em emagrecimento. Avalie com base em uma abordagem flexível e sustentável.

ESTRUTURA DO PRATO:
- P — Proteína (≈50%): pilar inegociável. Magra, central, em volume adequado. Frango, peixe, ovos, carne magra, iogurte grego, cottage. Quanto mais magra, melhor.
- V — Vegetais (≈25%): não-amiláceos em quantidade generosa. Se houver fome após comer, a resposta é mais V — nunca mais Q.
- Q — Espaço de escolha consciente (≈25% MÁXIMO): NÃO é refeição livre. É um espaço físico limitado para o que a pessoa quer além de P e V.

REGRAS DO Q:
- Q SÓ EXISTE se P e V já estiverem presentes e adequados. Essa é a regra de ouro.
- Q é espaço, não item. Quer arroz E um doce? Divide o 1/4 entre os dois — não soma.
- Uso diário é permitido e desejável — elimina a necessidade de "chutar o balde".
- Melhores escolhas para Q: carboidratos complexos (arroz, batata, batata-doce, feijão, frutas) — especialmente em dias de treino.
- Escolhas menos inteligentes: ultraprocessados, doces industriais, frituras — ocupam o espaço sem promover saciedade.
- Sem compensação: usou o Q dentro do 1/4 com P e V = está dentro do plano. Não existe "estragar o dia".

HIERARQUIA DE AJUSTE quando estagna: nunca reduza P → nunca reduza V → ajuste o Q primeiro.

FILOSOFIA: sustentabilidade supera perfeição. Não existe deslize — existe dado para ajuste de rota.

Responda SEMPRE em português brasileiro. Empático, direto, encorajador, sem julgamento. Máximo 230 palavras. Emojis com moderação.`;

const MEAL_SYSTEM = `Você é o assistente nutricional de um médico especialista em emagrecimento. O usuário vai listar ingredientes disponíveis. Sugira 1 ou 2 refeições simples e práticas que maximizem os resultados de emagrecimento com esses ingredientes.

Para cada sugestão, informe:
- Nome da refeição
- Ingredientes usados e quantidades aproximadas
- Modo de preparo simplificado (máx 4 passos)
- Por que essa combinação funciona para o emagrecimento

Responda SEMPRE em português brasileiro. Seja prático, específico e motivador. Máximo 280 palavras.`;

const SHOPPING_SYSTEM = `Você é o assistente nutricional de um médico especialista em emagrecimento. Gere uma lista de compras de supermercado para 1 semana, respeitando estes princípios:
- Proteínas magras no centro de cada refeição
- Vegetais não-amiláceos em abundância
- Carboidratos complexos de qualidade para o espaço de flexibilidade
- Sem ultraprocessados, sem gorduras industriais

Organize a lista por categoria (Proteínas / Vegetais / Laticínios / Outros). Seja específico em quantidades quando possível.

Responda SEMPRE em português brasileiro. Formato limpo e organizado. Use emojis por categoria.`;

async function callAI(system, userMsg, imageData = null) {
  let apiKey = "";
  try { const k = await window.storage.get("user-api-key"); apiKey = k?.value || ""; } catch {}

  const fullText = `${system}\n\n———\n\n${userMsg}`;
  const content = imageData
    ? [{ type:"image", source:{ type:"base64", media_type:imageData.mediaType, data:imageData.base64 } }, { type:"text", text:fullText }]
    : fullText;

  const headers = {
    "Content-Type": "application/json",
    "anthropic-version": "2023-06-01",
    "anthropic-dangerous-direct-browser-access": "true",
  };
  if (apiKey) headers["x-api-key"] = apiKey;

  let res;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method:"POST", headers,
      body: JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:1000, messages:[{ role:"user", content }] })
    });
  } catch { throw new Error("Falha de conexão"); }
  let data;
  try { data = await res.json(); } catch { throw new Error("Resposta ilegível"); }
  if (data?.error) throw new Error(data.error.message || "Erro da API");
  if (Array.isArray(data?.content)) {
    const text = data.content.map(b => b?.text || "").join("").trim();
    if (text) return text;
  }
  throw new Error("Resposta vazia");
}

// ─── Demo fallback content ────────────────────────────────────────────────────
const DEMO = {
  plate_pe: `🥩 Proteína — bem feito. A proteína magra está no centro do prato, exatamente como deve ser. É a base que garante saciedade.

🥦 Vegetais — bom volume de vegetais não-amiláceos. Mantenha sempre essa quantidade ou mais.

⚠️ Ajuste principal — reduza a porção de carboidrato pela metade nesta fase. E atenção: carboidrato + gordura na mesma refeição (ex.: arroz + azeite generoso) é a combinação que mais atrapalha o emagrecimento.

✅ Próximo prato — metade de proteína magra, o resto preenchido com vegetais, gordura só a do próprio alimento. A saciedade vem da proteína e do volume, não do carboidrato.`,
  plate_pvq: `🥩 P (Proteína) — presente e central. Esse é o pilar inegociável e ele está garantido aqui.

🥦 V (Vegetais) — bom volume. Se bater fome depois, a resposta é mais vegetal, nunca mais carboidrato.

🍚 Q (espaço de escolha) — o carboidrato está ocupando mais que 1/4 do prato. Lembre: o Q é um espaço, não um item. Se quiser arroz e mais alguma coisa, divida esse 1/4 entre os dois — não some.

✅ Conclusão — está dentro do método, só precisa ajustar a proporção do Q para 25%. Sem culpa: você comeu P e V primeiro, que é o que importa. Na próxima, só encolha um pouco o carboidrato.`,
  meal: `🍽️ Omelete de claras com frango desfiado e legumes

Ingredientes: 4 ovos (ou 3 ovos + 2 claras), 100g de frango já cozido e desfiado, punhado de espinafre, 1 tomate picado, sal e temperos a gosto.

Preparo:
1. Refogue rapidamente o espinafre e o tomate
2. Bata os ovos, junte o frango e os legumes
3. Leve à frigideira antiaderente em fogo médio
4. Dobre ao meio quando firmar

Por que funciona: proteína alta (ovos + frango) no centro, vegetais para volume e saciedade, gordura mínima. Mantém você saciado por horas com baixa carga calórica — ideal para o emagrecimento.`,
  shopping: `🥩 PROTEÍNAS
• Peito de frango — 1,5 kg
• Patinho ou músculo moído magro — 1 kg
• Filé de peixe branco / tilápia — 800 g
• Ovos — 2 dúzias
• Atum em água — 4 latas

🥦 VEGETAIS (não-amiláceos)
• Brócolis, couve-flor — 2 maços
• Folhas variadas (alface, rúcula, espinafre)
• Tomate, pepino, abobrinha
• Cenoura, pimentão

🥛 LATICÍNIOS
• Iogurte grego natural — 1 kg
• Queijo cottage — 500 g

🫒 OUTROS
• Azeite extravirgem (só para finalizar)
• Temperos naturais (alho, cebola, limão)
• Carboidrato de qualidade p/ o espaço de flexibilidade: batata-doce, arroz`,
};

function DemoBanner() {
  return (
    <div style={{ display:"flex", gap:10, alignItems:"flex-start", padding:"12px 14px", borderRadius:12,
      background:C.blueDim, border:`1px solid ${C.blue}40`, marginBottom:14 }}>
      <span style={{ fontSize:16, flexShrink:0 }}>ℹ️</span>
      <span style={{ fontSize:13, color:C.muted, lineHeight:1.5 }}>
        <b style={{ color:C.text, fontWeight:700 }}>Demonstração.</b> A conexão com a IA não está disponível neste ambiente de teste. No app publicado, esta análise será real e personalizada para sua foto/dados.
      </span>
    </div>
  );
}

// ─── Usage limits ─────────────────────────────────────────────────────────────
function todayKey() { return new Date().toISOString().slice(0,10); }
function weekKey() {
  const d = new Date(), y = d.getFullYear();
  const w = Math.ceil(((d - new Date(y,0,1)) / 86400000 + new Date(y,0,1).getDay() + 1) / 7);
  return `${y}-W${String(w).padStart(2,"0")}`;
}
async function getCount(type) {
  const key = type === "shopping" ? `limit-${type}-${weekKey()}` : `limit-${type}-${todayKey()}`;
  try { const s = await window.storage.get(key); return s ? parseInt(s.value)||0 : 0; } catch { return 0; }
}
async function incCount(type) {
  const key = type === "shopping" ? `limit-${type}-${weekKey()}` : `limit-${type}-${todayKey()}`;
  const n = await getCount(type);
  try { await window.storage.set(key, String(n+1)); } catch {}
}

const LIMITS = { plate: 3, meal: 1, shopping: 1 };
const LIMIT_LABELS = { plate: "análises de prato por dia", meal: "sugestão de refeição por dia", shopping: "lista de compras por semana" };

function LimitBar({ type, used }) {
  const max = LIMITS[type];
  const left = Math.max(0, max - used);
  const col = left === 0 ? C.red : left === 1 ? C.orange : C.green;
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px",
      borderRadius:12, background:col+"12", border:`1px solid ${col}30` }}>
      <span style={{ fontSize:13, color:C.muted, fontWeight:500 }}>Limite: {max} {LIMIT_LABELS[type]}</span>
      <span style={{ fontSize:13, fontWeight:700, color:col, fontFamily:"'Montserrat',sans-serif" }}>
        {left === 0 ? "Esgotado" : `${left} restante${left>1?"s":""}`}
      </span>
    </div>
  );
}

const LOGO = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAwwAAAMMCAMAAADJodBJAAAAkFBMVEVHcEzatBfatBfatBfatBfatBfatBfatBfatBfatBfatBfatBcYPl0YPl0YPl0YPl0YPl3atBfatBfatBcYPl3atBcYPl0YPl0YPl0YPl0YPl0YPl0YPl0YPl0YPl0YPl3atBc/VFZubknMqh8hQ1yHfkGijzVVYFA1TlmvmC+9oScrSFpKWlOThjt6dkVhZ01ZDDmiAAAAH3RSTlMAMKDggEBg8BDAINAQ8MBAgFCwkGBwoCDgMNCwcFCQ8TIy3AAAAAlwSFlzAAAywAAAMsABKGRa2wAAIABJREFUeJztXelaHLsOHGBYhrATsgHJsIQsJDnv/3bng2GgbS2W13bbqn/3XMIsuFpSlSTPFAqFQqFQKBQKhUKhUCgqxMb2E+YMTp9/Qv92ivawt719Op/PF4vFu6UnthaLxXw+39ne3tODoZgutrcv5puLhe/5p7FYnM3nSgvFhLB9Oj/3jwE+2FpszneUFIqKsX06P0sYCNxYnCknFJVhb/vifLFVkgZD7C7OL5QSivGxsTMfjwYWJXZUgFKMhO2LzaJJkQTvNi+UEYqi2NjZzFohKyMUU8De6by6eIBhcX66rwdKkQ37O5tV1AdSbJ1dbOhpUCTHxsXZ7jQoYGJXCaFIif2JEmENJYQiCfYmlhpR2D3b0RpCEYHt84pFI39snZ/qaVAEYH9n2rkRgbMLDRAKL2zMmwoJJrbO1YZQCHHaRpXAYXfzVLuZFA7snW62mBxhONtRPihI7O2c1Xdmc0L5oEDRHRNWUD4obJxu1nAyx4HyQfGG7W7qBApn3RsQiifsn4+nHe0uLIz4Vja1Y6Nz7F2U8xMWi8X5eimSKy95+pmn9TLni8WiWNTamqsf1y9O85fM7xabT+tdIl2ujaelY+cp184QWOz0fib6RNb0aHdxNr/IsRRvY3tnvpkzWGi61B92Mj1ldxeb89MC3Q4b2/NsCzneqbrUEfbPMzxatxYjLDHazrOcQ8NDL0hfKTwtLhrzy9veOU+eOb3T6qF57F0kfZDuLua1zN3vn87P0n42FZeaxn5Kd63G/RP7p/OUMWJTe71bxWmyonlrs+ah4pRbnTRbahF7O4lyiHeTWEi0d3qeiPq7c9WW2sLePEny8O58UjMx22n2ne1uavHQDvZTtKRuTYsIa6TZaaDFQyPYjqfC7uaU96zspZhjXSgdpo/t6Ezh3bwBB2rjIv570Fp62oilwu5mO60J8QFiS+kwXUQ2IDW4c2sjsoJQOkwUcVpq9uTo4JjAx7yvux83wqF0mCCiqPAu/dq5p7N/cnLy4ejo6OibAF+Ojo4+nJycXB8fH6R+L/tRuw+UDhNDTK2QkgkHTwz4IDv+HL4cXT7xIl3QiNoFonSYECKokIgJB8fvTz4cfYrlAMSno8uT92lIETPyqnSYCMKpsHUeXyccvz+5jA4Ebnw5Onkfnz/th/fwbqnvUD+C3ebdWJf1+P1JjljA4fDo61UkJTaCB53UhqscwVQ4i4n7H69PLgvTYIhPRyfXMYlT8AK1M+1Zqheh7XgRO1I+Xp8cHY7HgwGOvr4PZkRw+bCpHa2VYieMCsHp0fHJZR08eMXh0Ulo1rQRNvekDd5VYjuoFty6CPpjfnz/9UslBAD48iEsROztBIUHFZaqw36QhBQUFD6+/zBigSDD4eXV54CPFhYe3mklXRP2zgP+hiGVwhSIsEYQIcIGArWSrgcXAc8z/0WKB9dfJ0OENT59eO9dQ2yHeNNaOtSB7YBU13tJ1ueTAk5aHnz5euz5YUOWrG3pUvvxsecvkvsqIAfXHypTjXxxeOkZIELWSy00VxoZ/hmSp/rx8epyWgefwhfPCiJgGERzpTHhnyEtvKL555NqBdQQfPrqxQf/4kFzpdHgnyGd+YiAn6dXL7tx+OHa4yvw727RXGkceBvOPut/mmTCCl588K6ld+fTOD1Nwdtl86BCw0xY4fCDPF/ybvhSD640fP9Ccip8vGqqTqDgUT940+FcC+mC2PAsnMVUOHg/WTvBH1+upD1MvnTQyZ9i2JtnosL1h6md51hcvhd+Nb50ONPgUASe7alSKnw8abxQwHEoTZc86bCrKmt+ePbkSanQU3pk44vQnvakgwaH3PALC8Juyo9fJ95uEQupuuTnO2hwyAuvsCCcWL/uOCi84YusevCjgwaHfPASkWSKxkGflQKGw68icclrE48Gh1zwEZF2Re14n7uTj3hcipq9vVJV9RxyYN8jLMiatHsumil8EmVLPp0wW3q/enL4fP8SCengSvMjFIcnAm3Jy+rRbqW02PPoJpbUzR9POtePWHwQFA/7Hn+Rd9rKmhAeWapkduejlgoOSIoHj2ESWQWnkMAjJguKhWOlggBHAjp4jBnq6r008KicBaMlx1o1CyFwHjzGq7SOToFT8eNHMHSoVPCBQFryyJUu6jhPU4bcc3ZnSEoFXwjoIM+V1I+OgzxFcmdISoUQuOkgV/o0VYqBOEVyyxVKhVC46SAX+zRVCoY4RXIGYKVCDL64lCW5B6epUhj2pCmSsyVPfYVYOIVWcQ/lO02VArAtTZFcrWBKhRQ4crnS0kJaDTh/XEifNI6wcKCNF4ngatIQL+85H+9UTRJiN8fVBHalVEgGZwufNDi808LBA1JF1ZWAXmtnalIcOoQlaXDY1cJBDGm54AgLn1VCSo5PjkpaGhy0cBBCWC44RKQDrZuzwFFJS4PDZvFjNUkIywWHiKTFQjY4Sgeh57DQwsEJobuwy4eFYy0WMsJROgg9B3UcXNiQOfu8kfmxkct26sURv2dJ1jqgqzN4yJqRdvkWF3UWCuArmysJJRAtoxnISmd+pPa4i43y4+MTe+WJsJVVy2gSstKZNTAPvvZ+SMuB15VkDzYto3HsiUQ5vnK+1gypIA5PuL+FrI7WzRkYZDIS+yT5qC5bYXzhCmlZT4260RAbopKL9ZzVWhgBrOkg2vymopINkfzApkjafDEO2AYNWaqkopKBHcl3xqZIJz0exDrAqayyVEkXUA4g4gKnIn1WPXVEsMFB9LdVifUVkqcHm1lqWBgZXHAQNRXoxr0XSLjANbKoiDQ+uOAg0sx14Gcm/aq4B4eKSFWA8xwkjazKBqG9wPQiHWhYqASc5yDpOdMVYxIucIqqWs714PCK/jtJNNbe7TfJsDNj2GsnUl04outoSTbcNxsktjMzuqCCam04ZOpowZBDz2yQcIHxY656P3o14iv995I4Dt2a0QIuMOvXDnScrUp8oRu7JQ+/Ttkg4QIdNnXKuVYwE9KSErFLNgi4wJTO6jlXjA9kHS0ZgOuQDQIu0KWzpkh1g0mVBO0G3bFB0LJNN2991hSpchzSA9KCMrozNgi+Edp1ft/7UZsCaFVJMPHTFRting66NnIaoA04QYbcERvc3wYtI31Uo20iOCR7lQS9Gd2wwc0FumfrWHuRpgNSYxV0pHXCBjcX6G5eNZ0nhQ/U31EgsXbBhgguaLkwNXwhCwe3xNoBG9xcIAd5DrRcmBzowkHZIOEC9U8/a7kwQdDNGW5JsfGFShFcUHdhoiDnQZ1saLuje8+5KIG02nSMZ7IgW5W6ZoNbUaPSRC2dpwyyjHaORrfLhgguaOk8aXyiymhn2rzb6JLucC5oY97UQY6DOtnQ6AYZp5ZGckFlpOmDEpX6ZEMwF1RGagKUqORmQ8ZDORJcS9XIUkk7MBoB1ZvhZENzW4ldKhrJBZWRmsElISr1xgblgoKWWJ1s4K86nhhcn5bigi5SbQvBbGioTSmYC2ovNAaqb8/JhmbMN6fBQDRkKRfaQygbWrGinVwgYqDaCy0ilA1bbdgNLoNBudAVqJ5uFxuaMN9cy5eVC70hkA0NCKwuUVW50B8oNjiOCnfd6yTg+oDKhR5BsCHwwTkV7DtCH0H298qFthHIhklLSi4hiUgDtTWveYSxYdLTDY7tOMqFfkGwwdHPOWFJySEkLfB/pVzoAgQbHEL8WdYDmxGOmEewXLnQCcLYwNzxVzMcurFyoXcQbHDUmZNcpuRYC0PUQse9n5CegLPBobpMskuJvwSb+EjqL3QFgg38Y3SCRbSjeN5G/5FyoTPgbHAk2JMroh3FM+4lKhe6A8EG/vRMrIh2cBs3npULHQJfqOR4lk6qiHbUQLjZplzoEcR8A2++TcqJ5p1nfBGOzrX1CYINvN0woV1KF+wHwWeWlAu9gmBDSHJRIfjyBxdVlQv94hO6M8ORak+kndshE+Oiqu5H6hj4BhlehJmI98YXDDijlQtd4wt6KLbZgzQJ740vGPBc76T309A78D2svMA6gbKBLxhwFUCb87oHzgZeUqq+bOALBlxIuu79JCgoK5otoqt3G9iCAS961GxTUGzYY4voyt0GPstD49pH5YKCtBv4rLvq5TH8Mgz0ravBoFgBZwP/eMV1+jrApnj4yLMunVe8ALcb2CJ6t159le2uwotnNRgUrzhCTxX7hK12toE3SdDiWS9sUwyACqx8EV3ppT68qoq+aRVVFQausFPCPmQr1VdZVRW1C1VUVVi4xs4Jm35Xqa+esu8YKxgO9OJ/hQVcUmKfsxUOgbKZHe62qZCkAEAlJT4Dr69/lSUv6rZ91ZOggEAlJdZ7q65/le1VRQsG7c5ToPjqfb4qM6JZ6xllrhbPCgJolxKbedRlRHPr89CCQYtnBQW0iGZr0qquAmWDGOowaPGsIIEW0azbUFGixCZJqGGuo20KBpfYmWHdhnoSJS5JQiOYOs8KFqgTzTUpbeU/5TKwdhtGWR1hUDiAbZ1kE5BKrDe2tEHfo44wKBw4xMoGdrahDuuNE73QxhFt21Y4gXpv3ketNLgqH1VV1W1TCHCCHB22LaOCRIl9f5iqqgWDQgSsbGCfvOM3c3M39KCDnlowKERAywbv41YSXAcVSlVtz1MIgZUNbCIy9h0mnPaL9aqqw6AQAysb2KfvuF0ZXB8GZj0faMGgkANrUuKM6FG7MjiLAaWptiQpPIDe3MAlI2OaDdxOGyyB02UYCi9g6zK4RGlEs4ETurAk6bOeBIUfsAUBXKI03uYYJmBhSZJuklT4AtVXGUVptBqaq54xhmZTVe/1jDULTF/lMpKRrjDhqmfM/zjO9vf6/rPn43Lz5/b278PD3euX//vh4e/t7c1NBe8tAbBubs56G2eygameMbst46Dn7V2fseHxz+3Db+Zc/H64/fNYwfuMwuFHeJY4620UH5qLVVjPVMZe1R/LX92x4ed/f++Yv8Ab7v7+N+3Aid1+yB2+MW63YsbbMIErp/X8c9kXG+5/fJcRYY272wredTAwI5pp5h6hhuYGLRDrI6/1vOyIDfc//noRYbn89d/EcyXEiOYK1uK93FzWhpnil1m/rV/dsOHPd08m/L6dfNWAJkqclFm6l5sxPrAVAJn7855PyF3zmtLjLVcuY3j4UcHbjgeWKDFpeuEbTLjZbKQPI3d/3o9lB2y48U2Plg+NqKvfviGKEteVUVZeZWRVTNrKPcTw8+W123gOYrj/4RsUlr+boQJuvTFmQ1F5lWMlkrDls9vWWIsr37O/0ii4v/VTjyYvIAEg1htXtpaUV5l8DSnlC+xVfc0gfk2/XAR4/OdNBeJ7uPlx+/fJqp6e2IBZb8y+roI7xRjLA6ueC+yS/PH6Bu7+5H+1onj01Y+egISFm38PA65Mjg1YouT3TM4EJj4h1XOJxu3HwVv43pLGen8bQIU7UC38sV266UVQpJmbydaLOW+M34ZVLkWm24blZTuVY0Ct8HTQLVXtEfstk5PesGZupoYuFRqYwIBUz2Wm2/4Zb6OR4PAjhAp2CkSlWZNjA3KjD+dDl3HeGL8N8Z4LrQD4ab6RuwZE1ptfIVSwuMCkWZNjA7JVjElSigw2MGzEErW8fRhvsGX4qRtO994W2womF/6w7sTEnhhYVwYzbFkiNDCBARlvy28xvOAfeDffp6yy/heUIVlcuHcJURNjA2I2MMJmgdDABAZM3C12ddtP5A1NtnT4GZYhLZe/h5/40f1b/o34If2B1dBML3f+vTFMYEA6QgpeV4UlBHe3k6RDiJy6+rzDMuCnJLhMy7JHNsfs058te1MGExiQ1y65cZs4QdNLloLDwnI5NByFUtS07Dekhmbk1dz9ekxgQKJSyWtJHqn3NbF1AaHVgpX0/JH+o0nZb0gN7fd4TgkmKCH1SrHq+Rm0/DKhrv5QEen5WA9+jyhHWmFSEityYbpf4p4QdOs2thCj7NKwG+YPPpV5r5/ejdoDDA71o1d4mZCohNXQtAmcNTQwgQGxv0vfV8UfpIcf9WfHP9hP4MCgOe8eLzvu/v53g77GhNq9ER+acd5yhgYmMEC/rfj6eddRuvteeUdrSH/qK347ftHrp8e+pr/TKaORXm7aecsYGvboPwUSGArKqi9w5xg184F4nEsxcNyR4vn3IC5i9cR0ymikl5tx3vKFBrpUQfy2j+W/J1GWcfe9znwpqlxYLh/eftM9OOzW2BvGBtj2XSsQeZUebMgWGhgRCxmzG+O2Z+l5eritTkG5CVdUnzH4QKAz5cF+7KNWxn+lP3IgEHl1hNDgFRjKyqov8ChAK9u6GFU6m04yaExBTjmakk2lcEDkVTo0ZOpQ8gsM41xY9UC+RQx3D7c3dRyA/7zeN4LBs9/+DlDhFO3hs6eCKgVyuRUz85anebX+wMB7DQQeKjgBUTLS0qwY7K+AMhFQxWkajgOyU4zWOfOEBq/AUKxb1QLs5HZjdJU9kgsPD8OOEysw0McbzcwmkSohzhvjgOUIDbS1gQSG0n7bK6CSIsDI6UE4Fx7+/bBFIKtFiyP6H+y7msQA+eihgTa9KwoMHg1q4jOTG4FceMAFAPO3PbDvHVdzp2BHQ+eNDg0ZFmV4BYbyftsbQhKlMYNDCBfuvv+h0hnzae+w0nCfbwJ1NDLYQIeG9IsyaPEKBobijRhDhBq5Iz0QA7jwlylzzULA/Znwl68/OIwaGmhbo7LA4Nux+QZgTZWANxcc/bdGB7jkqjtc1K2+cvAKDak3r9KjppUFhjB9dXV2yvct+XLhl0P7vDd+WvSAJ6zv2icEfUJD4s2rXi80bmCIsXNLbxDwfKPu9TeGfCC8A5XYG1D5/DgSGugHNrL0NAI+IWjswBDDhrK1o9/blGyCMiKNeNif2rlXNR1gvx6dyidt16M7MWoMDDFsKOnBeqVzsize0ErlxKaWB9xVnCwhrdy0yJNyawx9m1yVgSGq8a1YquQxpizlqOG4/Rb8g9f3Qkpw9dLBJzSkNN5Iww1RrWoIDFEt0YXmXO495hf+CQlqPAK8FoQxy/dqpcMlPKd0aEinrtJXpEA/o47AINsnR6DMnIv87ckLGcNw9Cx/0OaMFSqtHaCgRDvD6Yw3knD1BoZvMYvpSsy5iEVVn8vZhk16d77v6JHuf6+zmxURlMgUJpm6SuuqMBWrJjA84affeMMA2bcuimsaL31r+A//+r8pZqpiFEfSBZ/QkMp4o3VV2B1bUWB4wo2DDr//PeInIPPWRWxNMgqvxgijfg5pqWA2W95VOBUKQwMteyZSV+kXQGr0mgLDM5irxH//e37q4ifgd07HQVo8e1YvhlYbVvgwyy0rDA4wNNATaGnGGujQA4etR5tjYHD/A+GDMQKNNrrm3LooTN8ePMOTEeQCQ9sj/fCo7yJVJDSQ7z6NukoWJUjkGW+OgcfNf/8eXk7gr4fvt3+shxyupGSrGoUTz96JzlAx8K6fX3FDh63arnNARt7InD5J7yrtZMCapMbAIMI9+qzOxAZZwRDwHB4+1PmxHh50rlTbAns48karPSlKaJJqiFpVdtNwUqCpUpYnoaxgCKlZhowOEJMGb5G8creyld1IaCB9gHfxXKCTMOhjjLQSIw3QVCmHxCpyGIIewUMlIHI+5/6WomxdlgPcoUQ7xPENSnRbEszBxtmVlAqoqpSeDaIhbZ8lFTevBdDwN8QPq/0g6FBV4fAJnliyxo0vockNx/BXj7BdNSnQ/pzUbBCt7xC/6M///t69iajDX5FC+SHoUNU9cDA0kI/v6BKaXlUGg84Y21XTAmvgSPynl9zMI3zJn/9Wh/X1Pwx/R5r+KryUrqmMhp3cdGIfW0KT5TMsRw4q+GpigTX2J2WDJEkSveDjW1L/+t/Sk+HbPSos1MSGzzFn1gu0+wxZVlknRhiwIYOEbJAoSZKXuxlkdK9XuRndGMk6b2+wUqoiNkDjjc5m4lxo0n3ehT9bq+HmB6zzOx0bBEudBC/2w3iPr45Cgm4M8ZuuiA2wJ4Osc8+jyECKtvDXTtZws4DtXUolJwrsNjcX7LIWJ0Oid7z6xdhVP9WwARpv5CM8qpGbtvNgwJm2rjoEIiolYoO7J8nJBajw5CcDeiFvNWw4BEeRTu5j1mSQPYCwLelzBV9LKiBsSJJ1uIcYXFzA+oYKkAHV2aphA1RXyRI6xmog/QtYPk9fVx0AsiFFG4LbYnCcL3wWrQgZMIP+l+CflQBUV+kSOtxqIH8nLJ+rmnCLB2RDguegcwyVfw1c5SxQQK+ArOyuxX2D6ipZQodbDefUr4Tl81UF30lKQDbEtIE+4xH9Kgfgo88fSpV9fWPGbsn0Sw0QZaGSzgyorpIldPjAG1mHQPe5DV11AMiG2L+8s0GPO79YCbvG6w/lJQPWrlJH1x7sXaVL6FCrgez/g07epPtVccC/fFy7j1NW5YaMmT0u5ciAfCeVdHR7lNAXgWQgf2Hj5fML4F8+agjYJasyCTiz4Ws5vJFk+B/z7H4Cb+R3FZISvBqaHEkLbckgQw0oyVtoS4IAf/kY+cS1WJUpnvHbppBzP/yPmZZZgO8kaogoGWAJTQqhYXkSWYRAsba18nkFWDFGlA2OwMDkG86J6dfEfUiaXJfvADZUsSUAltCkRRbWkkGuu4c23oTHPTlANgQnH67AQD7IHSmSce4fsP+YGvb78dlvnA2whCabJ4JaMsi2cGgytOQ+GwA9rMEpsiMwkMmGZGPsA/Yi+dIXmw1VhAZYQpNWQ8j0J5klwTjTYvm8AnigByZKjsBA3rEjWlv/+mxOtR3DAUvlrcJ6gy60x/l1g8ySILPacp8NgIQ9LFFyzLdRD1fhRtY1lYYWd8ZeCWsoo46uDNDITWY2AXmSx+9qpXkbRZIU2WE+UymNdDvxmqBGv0e6rwDAinMZX0kO2Mjt8TR3gYwycEPMZRXfRiaAIjqkMuWLYCpJEm+tX78lY6Y055divrMqdrDCNRkJ8ySSV0CnbdNkeAVI2/3/9vfEV/kCIkmSX4u7jix5O/UGMCNdHXdGw1utKJ/MP0+ifhN08No0Gd5glw3+Og3frkqUuh5XRK/3qhqkyyryPBR7JTGg1UB2UPj6bmRfEuztaNRkeIMti3o/CXkHGY80Xtelrx274X/LZjR8sx8QWV9JDDjw5nGGechZNfXVYW48WomSr2rJr4fBj5IXF1496GF9k1XxNLoO6yDDt2twoOXZDQ/572liQwwPO1HyDA2sropXz35ceD34wxiW0WgoGYPkgLd/JsqTyKY/GGGam2RAYCVKfueM11XRiQDBRhkDv5F/F35BgwRFOj88AVoyyDzJb96NnHEDnGq2FWMIexbBKzSw5TNqW/je6P5rHRlSXN0jQ41kgC0ZVH5z5kUGqgEWZklfK/gW8sN6VHuFBrZ8xmjlxYVft3/eTn0xbbVgQiaHR57ksxeAbPnrM0uCiy08DhrbloSdI1E/0gp3t6YUZWRkWa/nrJEMHnmSz/4kcqt3n1kSrKE9pBq2FkZIJdpZ/4zfsN4IfI/+qJIM8jzJZ38StVUSend9ZEkw2ZEn5NzZxo6RoGebokLBM1olGWCeRPVReJjQZJMe7OroI0uCibw4B2FNBiQwCEXVO3wvhfGvoz6vA1WSAeZJZH+SvFmPTLXAr+glSwKhQdy8yh1u5JcIi+dbIjIZ2VzOzRV1kgHkSeRjHbabUqCK8I6zJKCQSk8alyXBp7useKbv6jeq9ZxLjeokA8yTqIRfbkJTwiosO7rJkkBhKyxPuSwJCQySguGOSdGMVr2c++7qJAPMk0gpSCqukitWgSDVfl/SAGbCIzR4uSwJmlUS5/kX20I+TOZyHtJKyQD6k0iTQCqukmwCP9l697YBy4aWWQ2c4wbyftcKjaX7cW/0QUV/ZBqVkgH2ccuzHByUHgVN7Oa7tw2YOYwoCeF2SoJES3Dh251rdsCobDJ60JWSAfZxU41FUnGV+ksA+7nxGTcbpvEm0pO4viRwVN1J0i9n2W4El4wedJmtNP4A825ky6msc1X+z5veBABhTW9Kxj+ZdUmATO4k6UFg9Q1/PuMprbFR7wlfwXGmTGjZhA+1mA8GlqY3ASAwj7ZAueSGn8ERciZJIgFrmMtlXHZXKxngXgB50o+BWkUG7eeG9yWhMPMkwdnkhFU7sDjv9ZGJuYZ8lW9vRa1kgPuTKBMaubwZgjTtgBh1XcFnLwpzTEfw3GWqAHv1lj1bCiB0DQwLO5/tVi0ZruxTSoqrko4MshcD/GRH9vMLzEzGncEzHppd3Lp6kqTn2iBsvsbVaskATWhKXJUUDZQWBW/D6sh+foF5Yp3KJVcyWBmMq3qWH+thhMlXNAzfW1Vk+CY+0JKigSoZQGtTV/bzCmYbnfMQMCfczpIcW7o9HvGG7ZataKiXDMCEplIdQdFAlgwgxepMWP0GPDTnCWVqYitL4rfJeKU7RpWfrWiolwxAXJWfaAA5j3oTVr9ZZ8DtvDKPe8s942VVrzuoDcJmKxqKMC4IUFylch130UC5DDDD6k1Y/QaOt+unaYHISub5KQbPG1KKFA3D91fHrtVXAHFVfqRtUA3ggEYdzfW8waygHT/MNCZZT2w2MPheL2sUDbkGfComA5jwoVoq3EUD9ScBCVYHm/QgzCrAcQqY5/0f6Q8GZCFG0ZCrPaliMsDOVfGZDmbRUQWfuzjMY+s4BUz9bCY+bGDwTvuNgJSpPancgiZ/wM5VcbZjQZ5f1fUNFIIpljr6qen62RRWWY/Bq3hewShV8nwvNZMBXgpNHWrXTAPV1gRIdFzBpy4P89w6NEW6fjZbK1iPISDpNwqbPJcnGN9DFTf3DAA6Mqh0xzXTQDW8asmwggcZGP/ZOKHsYuIQDd/I5fIMQhtkyPIKEYAdGdS3yw9CU11NWjK8wOOkMtmP8SzlupKCbtI02JVHXK2aDLBooJwGfhCa6neFjUkVfOgx4EEoDFyLAAAgAElEQVQGcGvuK4xlAuw6yTBl1OgPzJLEGJ8txwtEARQNVHsSvz1J/K/6LBm8yECLSYZ1zemqgY0ORud4FnG11CW7YQBFA9VWAZ/xQ1Ai1Lb9g52WDD5koOti498xbd6e1vMrjCQmy7j+0NjLOE8XCFA0kO1JLBnE/6jTksGHDPQpH9bP3P6M4KYfI/PKcGmJoQ1UtBzjBbA9iZpp4Gw3SoOCy/iq+NAjwIMM9CEfVgLMMFz4KTM6MjL00RlZUs7FfYEA7UnUwlTuPitqfRgYf+6yMembFxkYZXX4Y0z5HG5mGXVIehPa3AhbV9PqM0B7kvhghxCoq1V6A5gnnCUDrawO9VJmkCEi/TDeZvKbDu/NBLA2zw2baaA2pnIVNKXHgtTqQwWfeAx4ONA0GYannDEZYrocjOOa2IS+MVupgqyQzPgCTjb1JTNkIP4FtNz6G39ewTzh7HGlldUhh+gsKaouNXyApBM+f2z6Zr06LhTgwFIyKV1BU/UzCCad7ZV8g0fXqogMTJYU1f5maFTp8qQ/3yF5K8ySkC2TlIFGV9CU/wwst+42Jq1hnnDWH6YToBvJD0VmH0YqkyRP+vnfX+x9Zr1GMRgn0qNNV9AUfUALR6+Wm8+kG+25DchATzJEajSGYvt8YB8jht5ubv9S+VyVgQHabv4VNJVYgY3DvVpu5gnn0w+aDG8uGO24xdq6ME/6sVz+evh3e3PjZcLd/Ln9y80e1bUZ4xXQdiPePz36Kf4HPe4CeIbxfORLXNqAfvsZupcv+pAZ7/SP+V9+Pzzc3t7e3NxQweLnzc2P29sHxzKnSqWkZ4D7rMQP+hdQ/dsglHS4PmwF02bg02X6BL39DH3aorMPI6F7fqek1/0whPQa6mf47iooB3EFDbruXkCJSVo/r+Ez6EaeoF+Cn4l3jQ2d6jlPYoeIwpBnjC4FxBU01cVNjYoC+anb+tlnOQZ5vN6yK9qXS9DiAPMkVA2KQYWNGGuIK2hqeRI1/wyMiW7rZ/M48amMgAykFZHCGYB5kmOHpS/uKuaCvIKmLoSmmjHAD2r97D6xdJ/eGxnIkiGFeA/zJPfdQD74XW298AxQQYtPtx93uvWfTSWUF5MkrUnkjyTJxWGe5LwcyAPfM4xJpASooMV5zzOorApsl+l15NNSQkPXAfxz/kia/gkjT3quyNOV0A+17UoCAKOfVEWMLwUQi0nd1s9mycCfB5oMryQiXYY0EwhmiXAPP0Ao7r5XTwVkyaT4eLPUAUpsr/3bVospnycIyEAezUSV6W/wO1OU0H9/VJ4grXBkn1rKRcPX6lGTPdqM8QLzfDvMVwEZyHo2Ub+P4bI98C8pw+/vfybBhG9YFzfxEfHuJMqwBj9YwScdBaaF6xj9FZCB+oFUPQ5mvf/MsIgS+tf3H3U25REAc9Di8z2jN0tqM8Ya5mPVkTe7yUD+RLIJe+MNPw/hBJXQdw///ptAlWAByElU5oPtmKR2ywCLrlcxyXzQuhQfNxnI+jlZk4MRB1Z9sH9ub/8+PLjunH75F0/9fDfTo8EKoCFDXBOrmOSGmSW5FB+aDOt/STbOJUvLzThgmmT3NzfPranP+Lfq1Pv78j9/3NzcTColwgDkJGqtHjbsRnUyAR22VzHJzJJcio/bdKP854Qb6owW1Dpn0rIByEmUj4Zpq+Io0qmYZA3iuB7fbjJQuUrCQ2tkYslXxlQOcMKJ7xtr1aPqC/CDnX2na5gTn05fzE0G6v9PuG7CbJCqubEuA4CcROyYxLRVQnkCY26ddiZZm+PdB8tFBpItKSvWv8gL9wIgJ3loq1JltVMxydoc7y5ySTK8pCukG5zS1jJfZPJFsRdAdxI17IaQgfhJ4Fa/n9D3kRBmuSvoHiLJ8DL2SflfaTe8G/Gs0un9TIjQVsW1dp/KqlU+C9JvFxkoZTVtMmO8Sn03KeQEkJMo8wCSgfpJoKxetvv1MTDLZ4kwQ5NhJfhTymraDe8mieudWc4AsHBV3rdKLe1WZfUbnFuTqJ+uJWLU/584lzGshkxXpFcKcMbFZKASKtC50dX3uYaV4EsmHmkyrJ7PlM2QuP3BLPy7KqHB5CfxjUNtVW0GDubJFbWVuq50o/7fxGTwuFGiNUi1VUgG4gfBAHSXyqqlq4rcK/p+qlVVQP2/qd+7Ue10VUJfC8843BhJLA9Qm+EbaEu6EzkBjptvSc8t9Xs3X6inElqsrQIyED8HbIYelVUrMMj0HpoMz1kWRYb020sNJvdUQoPLrCgygFlO4ufUZoDDkrIqlG5OWnL/d/qeCXNuoqMSOthooH7uwv6FHdoMVmAQdpUyZPgJf2lGMpgldIUX1eaCmAy2lyZ25zq0GazAINwkx1x9e8NkURn0HqOE7qmR2z671IIMO/2hRnsAGfq72tB6hosf3TQZbsuSwYxRHTVy22dXWguIC+0KPmNhWIFB7APQNx38LUsG8xNUe79Ieny2Dy/RmW2rREoGCqGBgXHdfhUmg1lCT3XC3x+hrhuxlnXL/nXd2Qz3oYGBcd2WDBlyZDHmYFI/s9BS180mg9Sp7o4M1qH1SDKYhV039KW3WZ7b5ot1o64C143oObItaCkZehvtsaY9fc4qo63+RydRWchgNnJ306AUakETpQW4M7o3z83KdXxcAPpe26dMpSgZfK7sbQhgdZKQDMRP9W5A2+sYvY4qTYbfpclgqgC9qKvAdaP2iFkXlkjJ0JkBbR1ZP3uYuUX2vjAZ+lRXA/sxKG8OrN7ry4C2N1j4nVTmapA/pcngc09pMzgMI4N2Y6CwZFXPlk9GTvpXmgxmc0gvvav26aWe+WZzkpgMXXVj2KfZU5Nk7sn5VZoMfaqr9umVVQMUGcBViBV8wmJ4tGRVX7eKuwzhvjQZTG2rE+MNbJgUkYHajQGoVcEnLAYr55cNuA3BXIPwh8qhsqXzpro6mduoogD6MURk0NYkCNs08/eq6O6k5T+KDAnXDpsw1dU+jDdpc5Jpp0nJ0FE3ht2UFDBLz1TQv0s26q1gfJ4+jLewTj2CDGBvQEdksE9rwCg9d9Ms1ZuUjwxm72oXxtv7IDIQC4o77tOzmylCxjGZYbclVU/kI4PZZtXF0hjQnCQigzat2rDz/SAxMuDa5YzJvNln1UNoAGQQPfS1adWCfRVn2Bw9lQsxyHijiCn19nB1ibRt1RzbkZKhlz4922L4HSZFkrfbjkIGi5sd9GSE9XATZAB3v/VCBjtJClxEx3Rxj0GGn8VeqRKATr0YMvTawW3LQMHnRnb7+BBZNU+T4+2HhjAyEBchdkoGe7wtvJWHaVylkPajmDB9xPZ7MgAZRJ0WxM90Sgb7CIcrPAFFQ9JPYsOUt5pv1xMPNASRoYvZHjtJipiFCSgasiYvZk9G86EhLxl6GGcASVLM8fR3GvJm8n2FhrBRNyXDG+wkKWpVr7/TkK1T7xl9hQbxHYdKBhx2khRoMbyAWrZNI28/qRX2Wg8NKcnQ4dSnbbdF3nXDtSfhyDySafYfth4alAxRsO222LPJrMjAkdkL6ys0KBliYGuh0SNh3uJq7kmDrkKDkiECiZOkIHE180e0QkPb859KhgjYSU2CBN5bXM3dJWF2crc9/6lkCIc93ZZibp7ZTI8j96CB2cnd9moA+/yKDrqS4RuW0qS4Ndk7T8r+rDa9j7y+xshQMoTiPkOSFNC5mn3dnRkamp7/VDKEwk5oEmUQviZ0/rXA5jtKEf5qhZIhEGCXRaJTwu3IQJH9k5qhoeXFq0qGMID+vGTXh/vmScKLpiPQzeJVJUMY7P68uJ6kIXz1pPx7K8zQ0HAJrWQIAnCK08n9vnpSAenfaDppuIS2z6/6DBL8tHOZlCfS03crMKlvzn/mz8vGgpIhBLaqmlTSYXauYiixB9XgZ7LqqDooGQIA0vqkD0vuogYMBSpaIytsN09SMvgDXNmcuKZkdtNjKKD8m3MWzeZJKcnQyaQbUFVTZ+2e824lmuf+ln7BUaBk8IatqiZvXgNs41Fi151hBbZ6F+4nJYMvgKqaPk3xbMnI/Ym/2VZgo62ruh3DF0BVzTD95Wk1lMjhDX42up8+796kFjfq2apqOuuZeREeJTxhI09qdPozjAy7/ZIhr6q6hl8JXeJsGnpSo+IqIMOOhAz9buEGqmoeZcWvhC5yNg3ZoM1mvaQr6TebJ0N2VXUNvxK6xNk0dIM2i4akZGj/5h6gquY6hn4udImzaRT1bXZkJL25B5DhqoJPmBIFVNU1vFzoIgXtMCi26TRIyWBe8dzpbZ9A8cx4CEFxwqF80VDiBYtDSgbznG92SQawASCLqrqGVyN38aKhyTutwu6BFoWP5shQRlVdw0tdLVE03JR+weK4SkmGpf3LmiIDmNTP3K/mo64WKRqGL9hkBX2clQyzCj5hKpRSVe/XHPOZ8SlSNAyzxCYvwpWSwbQQeiSDLe9kWrT4+GudgngZb6Xbk5r0oAEZRJ0WVM/GRrtkKKSq3ty9HTSfNRkl2pOMUFXg9Yrjo318iS9bRgYw6nbYyvcEelXzJM2r8/YSGnyMtxKrvYwKusVpN5DYpCVDMz3cYANAjiTp/kXKX4cGn56MDG/HhkHOFrVV+/TuEd/1jvFTG8RPnbZKhiKq6s9XayEgNJRYgTp8vQZXiR3ap1f4zCd+qtVb0XNvAHjGj7dMLCA0lNA6h+GxwTnosEG33qZ7iqiqRvB5ec57hIYS8s5QUGtwvgeQ4ZT4ri2diPip8zbJUKBX1Wr1WLPNIzQUqGiH76ZBo+HSPr1CB6GrttVcy+cHuLFjz0t96hEaCiTxQ221QTKEdXD31bYKrvRMnyHAC2/9Q0OBruohGRp03QAZzqPIsNUiGWzrOXmv6j124v1DQ/79LYaOkP3ViuO9fXqFj3xpP8bB9L+ijMvnV/iJrsJYu2hyGzp/I2njZAjr0+upOSnr8vkn/EFbkF5NPXmHUn4TujcyEK1JZ9aPUTs0QHPS5Psxsi6fJ5/8A9dA3ryaPU9qnAzgSU58z7aB0E0/Brj3PK2CeY+OOt8NMx55aMieJxkFTHvNSfbZpboxpGTYsX/hxMkApp7TCpg/0dnOX+Y5E4+85c+Thq/WXHPSF/vsUofcbjqSkmbqrpudJKVV1/Fj/tdOd8TT0NnzpKbJENqN0YsFDZKklNYzqqhisUe8KCN7ntQ0GT7YZ5dSiUBhvIX/XFuuG0iSUlrPj6iieoedMekOpex5UtNkCDWgO7Gg7eOa8rCBBoxn4GMSYuctd57UNBmA53YmJYP4Byv4lKEASVLCs4YLplSjh9R5y50nNU2GUM+tC9ctY5J0b/fBPuOOPMtSeTV3ntQ0GcAENOG5ycnQkNGQL0nCFdXfjHIvdd7y5knG46E5nwGcceI7BiKRWIOdLhnyJUk/0Oc8UFQNCOXVvHlS0w40sBmo2WZgH5BkaMZoAI3byZIkvABwtDyBmQoceacMmiaD2GYAz3t5DJnqeI8tZ6ZKksD24megiir7fghk3UDcNBm+2idXXAmQZGhFW7XN4VRJEqGous+wUF7NOu9mhKecLzQGxDbDHiSDdLzn4yS/GSDfJEqS4EjbUjo6J6uhs867NT3pJlVWoWDautFgd0qkSZKIBgxh1SuroXOKPE3PQANl9R3+Bb9DyCBu3JiinGR3A6VJkvCRNk5RZd8Ujpz7k5rejgFOOPEFQ5uBHu8B5cUU94jZD+EkmTg+0vYg55nIh75L8VYJDIv4EstdSyJCWW1bW7XT8yRPwSBF1cC9KFHKuGdySIbWNuqBpUnUAb9AyEBNNIC7oK8r+KR+sC2GFI3bxEib38kVJUoZH9nDl2mNDGIxCVFW5SnV5wo+qR/sxqEEf3dipM2XZaJEKV9LxvBVSiw6Lolr+9wSl3gu9zEyiJWnqX0t9vM3gVqJj7R99z62okQpm9VgfDGt9el9Dj7fM0ZbBZ7Elwo+qg/sAxf/Z49SVA2ATloE2RwAw3PLv7KsLMD5JnpWMWXVI6eamJxk+2LRyySJciHMEJBYb7m69Vq+xgqISVRNbC9NWoHa1z1xOcn2nqMtBny800NRNYH+NustZ2pQGga4Aptdi0IsJmHKKq3DAjlpWt1Jdo0am4GDjXzPCLfGQDctgkwndRjhWvPcxGIS0rM685CTJtWdZPfDxZ4rlAueiqoJyRqlPDb08BVaU1ZBZxIlJoEOixWI3g1Ybk9pxaSd30dWzygXfsX1D0m21OcQPo3iPf+W47IAnUleYhItJwEhdkLdSbasGlk9o1zwV1RNSPTVHGWDISY1pqyCuw2pvAcXkzyyqglV0FZgiKyeUS7E2wASfTVD2dCymATG3KiKGBeTPOSk9xV8Whns4cq4zBjjQpLFxfhUhIn0ZcPwQdHaNAOon8WH20GeCTdkWAlI3J8c40Kiu9TRTTMWkpcNw4/TmpgEmjE8xSQyrdoFP1jBpxXBFmqiqkRs2DnVbXD4ILWJxMvzzeSsNTFJXD+jnUncPwANGVOpoK3AEPX4w85ruiOEuxcmEkWhNYwnRWNterB+JpoxKDGJlmJBQ8ZEKmg7MEQpJogAmlKOlLgNaZu5jQ+UdQlHeYD6eZ/4SrExtxUuiH8BioyJjDRYgSHqLCE9RGmleYnbkDSZGUa6nON0Y0BcP8NtemtQ7RsT9aDth23M0w/u/EqdwkualFJmM/fD39vazCfwn6n6GRtzewHxL2AFPQkP2goMMcUubCBKzgVRk1LCVzXo3Vr9fGAfWKocRsfcVqAaMkDJPYUu7pSBATy103NBNgSarog2Ghgb858/gZPtXT/TFTQQY6ewYzJhYIDTmVm2GUm8t2SGgPH1pPqllQBcYEVZaFQzxoypoEGZMYEubjvLjwgMsGDI1NYmKaITWRtGN29rlhu4s4fagwTGEwYQV9ATsN2srqSIMwRvFsnV4inx3hK9uJFEtlYygPlnKuVh6meygoapVfW2m938FhEYQK9EviV3kiI6TYL/N/lvrAfQcqOKYWKYgf9H07PdrIwjIjCAJClVDwYGSQNrkuLdYF36zzEqwMgnNf/M1c8e4aR2280ecAsPDCBJStwVYUHiRP+OfweGctVayXBln1Z5+j8EVWiAru+DCj4zB8swjniY20pSyitCMUiK6Hg+Gp8q6x0QI0BsudH+84yRoKDtVvnyJEtXDU8sgPifPb+WXOkTnakZ309rVxuCw0pZbmT/9gqUOQFst68VfGgaVp4fkQfY+k7+p6hIUoodXx3+rtYGe0CXHqkLkf3bPId27B+su2iwBKDwp7mdwpdo4pG0c0cKrEaWlFMQGAOgS48qGcCtVBao7Aq4E1UXDVb5HP7oS76BTATRcu4oNhjBp7WVw8BloA41Nf/sT6KaiwarryH83NiN24UEeYmkFCOwmg+LlO+8AkCXgVr7wlpunCI7qaLBLJ/DH+d2YMh5pZQByar6CDYYv7619m3gMpCFMGu5zRjbDRQNFbcnWc5VeE5sBYYE+r4UEoE1/O0YD4vW1oeJXQbecnvCOfEPYUtTBZ+bgPVcDX6C2oGhYNeCSFIKtRvMh0Vru+jFJQNvuc2Y+ThYNNQ702BmSeHrt6zAUDSfEF1jEsiGprMkOMtAKaTUyqQ3kEUDSLCqnWmwxJjgNMAKDGWUpFeIBNawDND4za1lSWCWgXQZmCm3NaiiAZTe1a4Ss7Kk4DNsBYbSTQsigTWEDaYj2VqWBGYZwksGumiAouynCj46BjPBCE8DzEdz+ds8JAJriMBlOJKtZUlw/Jk60O6SgS4aYHvShwo+OgJLSwpOA6yzOELPv+SKK//Pdx/3zysHuL6KTHXcJQNTNIAUq9KODPMIhW8EMvWcUdqcJQKr93E2HMnWFibBXgz5ecZAMQn0u1bakWEe4mCTwQow46yckywk9mWDkUW21pcEhVVqKkFSMtA5FtwkUKW4amYB4WmA+VQe6dCI7AY/I8Wsy1u7/RkKq9S8mqRkoIsG2JFRpbhqdW+HiiWWrjrWLlIRG7waMwySt9a9jQirVC+GqzFpBTLJAh0ZVW6ZNIXVYLHELJ/HyyZEdoMHG8wevdbWYsB7GahxNXdj0gqUYwfF1Ro7V81HabA5YM6bjbikOjEbTHmhseXbyJAb1YsBxVEc8n9fYeeqVTKE/rXNB6g8vtymT8JF5pv4AkSDWs2ZDLBjlZKDuPVhQ5CRBYhRFZrQ5tEJzonNiQj5CV8u7/7+l/h5KzLfhG1K5u9qbawH2s/UvQww56dA1RxwmUB9JrSZBgTn+kay5WE+v/yD26Qz9gnZYOiqzZXP0H4mhVXH+PMbKDUKdq7WlyeZynyosPoY+lveDlrK+CCyoiVsMONmc+UzXAVADblxG4eFdAIVeH0mtNmYFHogjWexj0s7/HcP6VodRFa0gA3VyAJ5AOZ6yI5VfmPSEKS4CrXZ2m4tMevn4GYDI7749MKZ39fdbarzloYNZmBozn2Gd3ySnpmoF2MFqgSHwaW2Zj3zzx3cUGRoLj4HGnxl3xPRIQkbzF/SmvuMNOlRCb9UWJ0x4iosO2rLk0wVKDQpNijl1buNfGdp6CBrzOC1UrMSam3DKpYlUVKQa0nMEKS4Wn2eZJaaodKh8Vu8Mn/0W0tCBxkb2NTHDAytNW/7ZEliYfUJW8Qvgd1NleVJaSpE47d4dTcR39ttgnmyaDaYgaE9XRVmSVTPKbzmnwOVa8HfUlmeZJIh9LcMf4efS0t9b3cJnsOxbDADQ2urt7EsiXqmy4XVmV98qct3M95s6KSmUTL4nWL6kD7E50qijRkkG8zAUHi9QQkAx80j22chrzzq8t3M8xf4S4ySwe/QcKc03uMSNe1RbDADQ3OGG9KXRGZJYvt5Bcq5g3lSVf1JaRqUhy6DZy8be0p/RQeHx/BMqfnAAPqSyCzJtX3bBmlC150npWk3GGYjnqn1z1vuuMZXDuF1g9mnUmxrbDnIsyS5/bwCaUJDPammuw5NMgQqq8Yz1P9h/vgfc2CjXd9QNliN4M11YiAzbqQKJJzreQOZJ4F8q6Z5tyQDvsPB0TAB8vEfmdxHX8d2L/KiARse+P97+gAzbmTd65slMXkSrMQrmnczm50DyTAcHA1OJ35Qyk/8xbUhbLAmw9sLDPBWBlIR9c2SmDwJarTvK/guXpBkqHH4EI0Yf7khbiqMLxwC2PCb+f+awFdwLNNlST55UkX7k0wyBP6S4a+ISmpuiOgQzYb/8N9Ls8H8Bw1KSXBfUsIsicmTYJSppyUjBRmG28NiexZ+4LVDNBtEs29vbLD23rTnMSCtGB7n1w0yT4LMqucSnxRkGD5F48Uf/EKqwmyw8qo/NwJMK3rAVgwyswnIkpjfBgcjqrEaUpBheHISdBThuVJZNsicawu//01oXwAwGTye5RKQcQZu2ajGakhBhuHhTTHXjweHCbBhubz7nnSxQT5Ak+GC+kwhWRLDLTgmVI3VYCqIQb/iPvo3wHeFHcWyVXQgG5bLX5MYezgGR5Ia1gzLkpg8CbZk1LKC2DTdgn7FkE+phsFQ2zh66tJLYQ1mw/J3/XSA64bJVoywLInJk2BLRi1TDQkc6GGmlU52QQ5uYfctnA3L37UXD+BSBrphNSxLms32KKUWaYGtpIROQIZElpsNJMWPv1bajw2iaQgcf+u2rEH5TJoMvt3bbyA9PHgDUCUltLkpJogMwwdoSnkRsRyiszC/rj3ZT+NIMamXDbB8JpMavxm3IcjuDph41VJCG28zZLIxpeVm/WbIhug0rBwblt/rNR5g+UyWu54zbkNQ0xHLU/CjlbjQxoELOWvDdCbxkmqEDdFFdEE2xI8mZQIsn8l1w+FZElOGwOnPSlxoozku5DAP0/DUM/OQDfFdQo9ek6BRbIiv+PMAjriRe7989iXZIAWqaktoo6QMycmHpyX5yjnIhvjg4zcXHceGKlWlQ1g+kxmN174kG6R1AUvoOhq5oy3oyH/uADy58dGnIBuqXDwGy2ey1vXZKglBmtqwhD6oYreeaUH7Z7lDbTbH/sU/9hcpvnKHhuhqn0RsqDA2gD16dPksva4HB9mSgZTQVeyMMXdA+P/phpEly9A88BsSVOk/JV2orznfveSHf3zH4019dQO8k4EunwNbMdYgrQZYitShrhpv0l9OGu6QyJMTgLa9Wu3dP+iN7NWxAeqqpOwT2oqxBpl+ISV0FeqqISf5JzrD52EmKdE+Y/FGdC48Yg539EaDtIC6Ku0+R5gMK5CFOWzyqEJdjaugh1lW8E0nDoAlkRUPnj0ic9x1XREKdVXSffZbN4yBlGx34a8+quDLMStUX3F0+K+z/dFt+SdBDZ0PSPt5TSuL4VIMWgGNK59nbDUCNdsa1FWzO8m3Bh4m9Pke2HYRXfWyinsYHCoqG2C/6jZ5YD2urqJA6lRIOVKD8RZ6ae0zhn/4jLc82WVD3T2hoOQP3W6eHojhRko+seXzjC2hIdNqCA3mn87zmA3/acZC0S4bKr9RCsjB1VQ50HCjM5no8nnGldBwxqcG4820oPzy2+G/zfr4s32yyu8aBGyoJZRBw43UVePL5xlXQiPqag1jDUbF53ekk26JYWGlHnUpNBA2GyoJZTAw0ANp8eXzjA088PfXEBpMcdzrGZZ4SwwDO1GqffmpzYY6Qhlco0frqgnK5xlXkiCRp4LQYIqrXnpS6i0xDKwmpeq3n1r+WxXXI8JODDqnT1E+z1ixCvau1rB31ciTfKyzDFtiaFiKUvV7sa3+vhr6V2EnBh0Yopq3hyBtDMR4q6AnI/i64xxbYkg8Tmz/qfV+KwgNSGBYeJzUQPjwrYJ2PVOq8TjVebbESF4tX/NHOliJ3fihAQYGOocJ3RCDgCzRkUysgtBgFqfyWi/TlhgCVg1d/6ouM7EbPTT4BIaY2WcbtLpaZWgwFy/KZctcW2IImApN5cYbTJTGFpRgYKB1z5jZZ/mrVBkazP4kcW2ab71ccbIAABTqSURBVEsMAbMmrX/Hr5nYjcxeJDDQsmciXdX/ZSoIDWYJLZUtfwT8myiYxU39t9Faid24AphPYEilq65AVyawJ6OC0GAOf0oDes4tMTiMhtD6S2grsRuVvV6BIZmuugJdmlQZGsy2Y2FAz7olBoUZGiaw/N0IDaOW0D6BIW4pBgStrlYZGqxGONHRLmq5vSB651lhmKFhxOltr8AAveFIkD43Ehoq6FAyQ4PoGZZ7S4zrNYsoWLEwBKURe0i8AkMyw20Nr9AwfoeSFRokFlr2LTEYjLyjpnlKAoagNF6V4xUY0vSrGiCNtymEBsmY8dBTKpYAGHlHPRNkJGL3UiUCnGOgA0NKw20N2nirMjT8NN+jIO8psCUGgREaqu/Ws2zosfIkOMdQNjAwYxNYaBh/GtrqOXamICW2xCC49XqT48PoUBorT/IKDJFr9HB4hYbxp6Gt5gFnopTxYgYOhoY1gTzJLKHHcc2/wvNGBwbkcCYAQz7E7R4/NJjNA85EqcyWGAgjgk0gTzLe7yiN58hKDL+zmQJe7KtgvZ41Wen4wxXaEgNg6F5Ty5NG6U+Cu5KKBwZf+o2/Xs9vBcXwJ4u9xW8WZyfgu5l50givj2xXLR8YOP4hnVCfR/ieLFiTleydUcW2xAAYDecT8N2Mb3WEPm64XXWEwMASEGmFqqCV29oTygX1cltibBjSfe3Xj9vWSPmiAfHb6DZS5BqRZPAKDR/Hd97se3IYYzn/xQyil65+S4ZF3vJFA2zEYLpI0/Zum2BCA7K8r4K1MfZSU/qYF9wSY2P4qK1iBYsDw6+quNOA+G1MYEjcu22CDg1IN1QFzhu4C4E650O5v/Qf+F7yBivC9xHf7yH02+jlLVkDAxsakD7Z6/H/gLaiRN3CVHRLjI1h/JqAuGoUDYVTSkRWpVtI8wYGNjQg/VAV3F5iWW/ULUxlt8RYGMn8DoXR9lX2y/oE/TZmuCBvYGBDA9IQVYG8+s2+awNnQ9ktMRbGzNFCMPw6y4bRa3jG6C6hfB7DGnRowDqiKrgO19ZXcTYMf6C81j/MkyZQNAyfHEUrfkRWZfpH83kMazChAXnx+i5swDOR4ltiTAxNjgkUDcY+/ZIvjFTP9H0M+QMDGxoQh6OGu3z+s98nFPOLb4kxMZTuJ1A0GF9oQQ8aqZ79ns3JsU/HJaxgqeEGUHCdMTjv5bfEmBgowBMoGoxYW67Cwqpn2m8rERjYigWRVyvYGwPWqUM2DH9gjKR9mHjU38ZtGCPl5CSkemb8thKBgS1ZsD0ENdxsBby35V+jSh5jS4yBoc0xgfVJw6+r2O6ES+Qs0rJqjslnDExoQOTVCnxoeA+5pSmNsSXGwJCN9a+ZNOSkUt8X5j37ncQ8YPiIJGoVjPmA/QAWG0bZEmNgkKfVv47bkIJLvd0reLKY8rVUYGAN8HfIj18W+rpYgNtbl7/ekvNRtsQYGBYNo7wBLxi2fpmX/IIcLEbYTL5EjwbdGoV1r9ZgNmBseOtTGmdLzBDDomFiu+nLvCS82JOrntMv0aPh+TYqaNhD2bAWQoYy/0g91MO3sI5NN7e1wuiML/L9IBYD90guGBhYeRerXGowG8BF5G+nroZGuUFwWnMUsrdKlHDdMIuBqZ5zd+iZYIw/rIauYOjtG2K+rUtowJJxsS5JH+t6WxRKkAEZb+Oq54zDnhiY2gWroa8KfGECmGx4zYiAJzcuXt8X0IOrRAEyIFvDZmf0d1HGb3sD47yhCVsdiZLJhteMqLYjtn5fdvd5nchPBixJOmW+iyKNGEMwGRs25lNJooQ2IYG21rGxlpPswaReyYAkSXuM11XMb3sD826wMFVJojTsuLyB/6kOrN/YNCro7M1JWJLEdG6XlFXX4OIUVsBUkigNTtj6v9grNEZHtSELRW4yYEnSBvN+isqqazDyKkbOWhKlVza87s0DXXxjY3287mt7Yyhyt7wjSRJnMZSVVdfg5FUsbathzucZf1YqzboJqT4F87XBvIL34kbmmgFLkpiCtbSsKnlLWEFfRY/St9ce1nWrtL12b3y89r5VF7Mw5CUD1pPEWQylZdU1uIp+C0mU6uhResLPX1VrNq9kmIS2mpcMSE8Sl6CX61a1wdXQ58jPV9HM/Yz7X2/jlRWeuIrfGkRWMiCN27ML5s2MUj2vwFEUS5Qq2ByzxvfXx2/uwxKA9VvrngzIbhg2ScISklLgamg0UfqS8YvzxGur9k19WL+1nxW+N4CMa6aQC6v4J/BI1fMKXA2NJUqfqykbFBMAsgKATZLOSpx5ElwNjSZKtRjRigkAU1W5JAnrAyoJZswHT+Cq0VcVteOLb5I0YvW8AtNJi1pvVSzLUEwAh5iqyiVJ2OxAWXC93Gg9U4++qqgayEWGbE8Stvi6NDiuog2ENWwVU1QP5L4qticJFWyKg8vi0PK+lv5VRcVACwamcXtUi+ENXH2PbY7RskHhBFowcGpN+fE2HJzZsIslcjVc6KOoGljBwOr441oMA3CZHFriq9ugYIEWDJxwOcZ4Gw62xkfrmg96FhQ0sL5tbqnpyH0YJrhECX2fNTUpKWoDtnB7tsGVptUkSTNHooRGMG1SUpDABj33vI/YaGATJXT4qI79q4oKgc0wsKpqTUnSzJUooT0j6r0pUKDFMzdHVleSNHMkSrgGrC17CgSo28Z6WXUlSTNXooS+XS2iFRBo8cw/aitLkmaOHiW8bNAiWgGAFc98wTDCNkk3uB4lvGzQBlaFBcx55h2GOnqSbLB5HR7LqtkrpqgDaPHMOgy19CTZYCt+fCRPnWjFANgyDN5hGH+6jQLXPLJ8h4YzbedWvAIVkhynaoxzLgLbVogXOiopKdZA27Z5YQZtiq4EbMP5cgd7k9Us51aMDZQLAUeqFrBGND6kqgKr4hmokMSrMtVZzyZYfRW3ClVSUlAdSXzxXKeq+gaeyXgRrWxQ4KIqd6lsHesweLD6KuEWqsDaPS7Rg8EWz/Wqqm9grXN0QYCyoXvgoir/YB3rWhIvsGke0VWlAmvXwLnAO8/19api4MsGXBlWu6Fn4J2qvGtVaxuGDT664RKAsqFf4GabI8OYQMGwAl824A662g29guACLyRNomBYgSc1LikpGzoFarY57NvaHYYh2NXcVIhTNnQJnAvsCMMEHIYh+I4SoqVEZ306BM4FdoiYEuirBW+XEFKAWtHdgeACn1lUOejJge1Cp1pvlQ2dAbu1zdWRRDT11AzHByIsE2VDV8AbklxHZ+RrDEPgCHUEvZUNHQHngiOpmIrbZoL33qiBPWVDNyC4wBsMUyue1+ClYqoMUjZ0AoILvGM7veJ5DQfHlQ09g+CCw2CYXvG8hqMSou5nVDZ0gDAuTKNVFYfDiabmuZUNzYPggqPOnJbzbMPhJCobOgXBBYcCWfcyDDccYU/Z0CUCuVDFtecxcEhKVOBTNjSMQC5MVkh6g0NSonaiKRuaBd6P5OTCdIWkN7gkJZIN2tHdJgguuM7JlEYYaDhmWUk26HxDkwjkQs1bVX3gin/Kho4QyIVpdiRhcAmsyoZecIjeUiXgwsRF1SFcAivFho+6M6MpELP/bi5MZheGBKFs0A0yLeFTKBcaEFWHcAisNBv0tuhmgO/NE3Ch8s3z/ghlg+5hbQXBXGjBYLDA3tzAseFr76eoDRC2c5dccH9okg1qRjcAfPRfciwmOPLsRjgbrlVinToIeyHiUEwc/Hpu7oOr4TBtHF4Tf1iXH9ssFyQfHb+9QSXWaYOyF9wHoh3jGcL94SmnUSXW6YKSkSKOQxOI+PgqKk0UH5QLBFxDrswXoKLSJHFC/T1dXQnNc0HyFZDeu5bR08MhJSMpF2ZxbNAyemqgupGca9pbmHiWwM2GM8pzPNDejEnhiCoXnN05zTXnUXCzgXbgr3o/X1MC5TorFwYQsIH04I+1cJgI6HLBaTt3xAUJG2jnUQuHaYAuF5QLJgRsoMxobeqeBC7JcsFtL/TFBQkbGGVNt8hUD9JdmJ0qFwAEbKC/k8+aKlUNau4/9u/eLATfCimxqsZaNWhFVSAj9cgFERuYISdNlaoFnSLtOa5r65YLIjYw7eyaKtUJJkXad8tIU72yLR4SNtBltKZKNYJJkQQyUg/9SBQkXw+zP0rHQavDFf3XEjz6euaCjA10GT37eNT74asLX0ijzXmLp3JBxoZ3zBzsSe/nryZ8pVOkPdemID4l7gQbjoX1S96N1jq6GpBT/9K/crOz/3IIOlXYwuFA50GrAN1/MZvtCOK/cmEmZQNTOMyOP/V+EMfHIVM5i8qFLeXCMyRWDFs46OqMsXH0kfnzSh52Le6QDITApOfLKxVZxwQbFrYFKZJyYQhJIGWNeg0O44ELC4JZ535bMChIHBlm/u0pOGjlMArYsCDKgJULNgRt7rzGqrLSKGDDgkRR7d5qwyCx3xz7Q1RWKg3OWxCmSGq1YZD0NPKq0uxADemiIDdHzoSms9oLFITfHvsk+azdSsXwiW7WlqpIfBnYNyQSK2/AzWZXqrKWAT3D84S56E+5UEmVhijLXG6xW/t1zqEE2MJZmPKqjMRDJCq5Lsk+1ua9zPjEFs6zC9lfsdupNilkapwr19RcKStOuMJZaC7wOrli9VXKIuwu/1jRXCkf+AxJGtxZWVCxhqyMXi744KC6Uh7wGtJsT9RZo6WzGKLeDHecfa8eXHKwzRdPgqosy+3j8oU0kLnRLpF1dnCipUNaMIOdM4+woK6zD4SFgzM4aOmQEpd8sSAOCzrI4wlh4bA8c1iYukAjFY74YkEcFrRc8IewcHDJSrPZsdIhAT6RV4+8QBoWHB6RAoXQcXDKSjrqEA8nFYTegroLoZB/wc6HjQpLMTjkTTbh+otnaGNeMGTdXk/fMdutNFM6RMBNhX1Ru/ETNrVcCIesD/gJ586vWVs0QuCmwmwu/SOpohoH2YyD7JtW28EbAiqIC2dtwIiHOFVyF9KzA02WfCCggriu0xQpCeSPnuXc/X0rHaQQUEHaq60pUjJ4PH0kX7nSQYJPAip4PKZURUoG+QNouRAkptdqwzng9BWeNCT5M0qNtpTYEPYqLYW56bEu4GNwxM+xPWNPrCEtl7tO4VvhBWnji8iDe+pZ0hY+Ah8cPUjP2JFnSK7eYoU/PBLU5ZakWjs40eIB4PCrozP1GdtiwVsr5zzwqKOXy4UoMr/XzQEGPl25q2a/YkGgdyuCIJyuXcHV273CsWZLr7gUlAqz2Z60uf4ZugAjG+R+9FLs8mi29AxZfuRVN6vnnBkeIutTJS0r3a6715aOBFLqzPfrV0E1N+Qdkj50+NhzeBAGBT8JScNCEfg9ncRiRq/hQRoUPKmgYaEMvNQMoc76hIOr7sSlTyfCoOBLBQ0LxeAlK3nQYfb5a0dd3ocie+0ZnlQQ2Z6KRPDyHLzoMLv+0AcfLqXpkTcV1FsoDR9DekUHcVPAwfvmy4ej9xJ3bQVfKqjlXB578qmflz+SUFmatc6HL1fSQiGACjrDMw42vFRWTzq0ygcvJuzNfanA3yOjyAjxhpJXbPqkswfvL9uqHy7fezDB021+hhbOI8KvUeYZZ37PrusPjdhxhx886oQnAdv/q9XCeWRse4z9rP9mnhXe55PJ+w+fvopV1BW2PeW6pwxJd+WNDz9HevV3u/Cs8g7eT1hwvfQpE57hXTXLljEo8kO8/nmAXa/i4RmfTyY4Ov3FNyTMZvv+pYK0YV5RAN660jIgW3rC9dcJZUyfvl57VQnP2PYvFSTbPRUFcRoQ2Jdb84Dn2cEkCPHlg5dw9IK9i5Cv0XkpgKI0QoL7cnkWVPUdHNecMh2FRISn+LoZ9BVqsVAhQkqH0PDwhM9X9amuny5PvGuEFfZ2/GW5pRYL9cKzt/vtDxosCh4cn1xWwojDo5PrgMxohaBKQbx3QTEKfHaYDLF7HtF//8SIUcuITzE8eJKPQioFdRbqR1Al/YR3F3EB//j9yVHxIHF49PXqOKhAWGNvJ/D54dMWrxgLIY7RCmfyNm8KT5QoEiW+HJ1E0uAJpyFC6jO8mh4V48G/f+8Vm0ki/8fjq5PLozye9dETCyKSojechqlHSoVpIaDf8u3vnIYPz/h8/P7k61ESVhwdfTi5Og6UihBsnAcHUKXCxBBDh6R8eMHx8fXJycnR0ZGHP/Hl6Ojo5OTk+jg+HbIQwwQd35kgoujwxIeMf/KPx8+4OgG4Wv0/SdIgAhHZ0dJ3IkRRC+Lo8FRPN/d339uJY0JAf6OiEsTSYflu3tD+n/2LUBV1TQWtFaaNcKH1BVtZE6ZiOI0qE5QKjSCaDsvlYtoBYuMisE9lgC2lQhs4jUwPnrB7FulQj4T9nc34h4G6zS0hYKQXOxKb0yqp909TEGG5XGgPUlvYj5NRXrG1eTGJlClNRHjCpnamtgf/jVgUds/mVR+Q7YuzZB/1XLXURhHcoYng3flOhSFi//Q84Wf0WFCrmB42gts0USwqYsT+6XyRJhV8gee6NcX0EDb0zmFxfrE97hN0e+c8LQ80P+oGp0m0JRNbi/nOCE/S7dN5svpggJA1OoqJInjS0YHdxfl8u0jitL99cb7I9CE0KPSGHOFhja3F5nxnO8uR2ts+nediwTM0KHSJ/eTVg42txWI+P91OkD5tbJ/O52c5SfCMLQ0K/SJwb5Y/dhdPvJjvbG9Ls6iN7e3tnfkTA1LXxiTSzzQppoWdjOkSg3eLNc7mz9h8/Q8JjQKfN6SeguJJbA1bJtcQtqbZhajIgfzlQ8XYitmgpmgRcUPyygRFW+iOD8oEBYONeTf1gzJB4UT03PwU0NSmA0VO7O2cldL2x8BEJ1gVo2G7zQKikWUfitLYv2gsQCymMbKqqBTbrVTU78612UIRjb3T84kTYmprPRRVY7qEUCIoMmAv6bB9Cbw7VyIo8mF7Po2iencxH3kwW9EF9nfqDhF1brFRtIuNKhnxbvNCF7woRsHG6Tz7KKYQuzXtcFL0ir2nRRUjFhK74y9uUigMbO/MzwonTu8Wc6WBolrsbe/MN3OnTruLs/lFnlU0CkVy7D/tdkm82GJ3sTif75RZUqZQZMD2Ey3OF6HEWDwx4GnHjKZDirbwtA1pG+yGGeJlc8zp0w/qH1+hUCgUCoVCoVAoFAqFQqGoEbPZ7H9JtHbTnvKSXAAAAABJRU5ErkJggg==";

// ─── Brand card ───────────────────────────────────────────────────────────────
const WA_SUPPORT = `https://wa.me/5511943215326?text=${encodeURIComponent("Olá! Vi o app do Clube Anti Efeito Sanfona do Dr. Filipe Leão e gostaria de saber como participar e ter acesso ao acompanhamento médico.")}`;

function BrandCard() {
  return (
    <div style={{ margin:"0 20px", borderRadius:22, overflow:"hidden",
      background:`linear-gradient(135deg,${C.navy} 0%,${C.card2} 100%)`,
      border:`1px solid ${C.borderLt}`, boxShadow:C.shadowSm }}>
      <div style={{ padding:"20px 20px 0", display:"flex", alignItems:"center", gap:14 }}>
        <img src={LOGO} alt="Logo" style={{ width:52, height:52, borderRadius:"50%", flexShrink:0 }} />
        <div>
          <div style={{ fontSize:10, color:C.gold, fontWeight:700, letterSpacing:"0.15em",
            textTransform:"uppercase", marginBottom:3, fontFamily:"'Montserrat',sans-serif" }}>
            Clube Anti Efeito Sanfona
          </div>
          <div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:16, fontWeight:700, color:C.text }}>Dr. Filipe Leão</div>
          <div style={{ fontSize:12, color:C.muted }}>Medicina aplicada ao emagrecimento</div>
        </div>
      </div>
      <div style={{ padding:"12px 20px 16px", fontSize:13, color:C.muted, lineHeight:1.5 }}>
        O Clube oferece acompanhamento médico personalizado e acesso direto ao Dr. Filipe Leão. Quer fazer parte?
      </div>
      <a href={WA_SUPPORT} target="_blank" rel="noopener noreferrer" style={{
        display:"flex", alignItems:"center", justifyContent:"center", gap:8,
        padding:"14px 20px", background:"#25D366",
        color:"#fff", fontSize:14, fontWeight:700, textDecoration:"none",
        fontFamily:"'Montserrat',sans-serif",
      }}>
        <span>💬</span> Quero participar do Clube
      </a>
    </div>
  );
}

// ─── Settings drawer ──────────────────────────────────────────────────────────
function SettingsDrawer({ open, onClose }) {
  const [key, setKey]     = useState("");
  const [saved, setSaved] = useState(false);
  const [masked, setMasked] = useState(true);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try { const k = await window.storage.get("user-api-key"); if (k?.value) setKey(k.value); } catch {}
    })();
  }, [open]);

  const save = async () => {
    try { await window.storage.set("user-api-key", key.trim()); setSaved(true); setTimeout(()=>setSaved(false),2000); } catch {}
  };

  const maskKey = v => v ? v.slice(0,8) + "•".repeat(Math.max(0, v.length-12)) + v.slice(-4) : "";

  if (!open) return null;
  return (
    <div style={{ position:"absolute", inset:0, zIndex:100, display:"flex", flexDirection:"column", justifyContent:"flex-end" }}>
      <div onClick={onClose} style={{ flex:1, background:"rgba(0,0,0,0.55)", backdropFilter:"blur(4px)" }} />
      <div style={{ background:C.card, borderRadius:"24px 24px 0 0", padding:"28px 24px 40px",
        border:`1px solid ${C.border}`, borderBottom:"none" }}>
        <div style={{ width:36, height:4, background:C.border, borderRadius:99, margin:"0 auto 24px" }} />
        <div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:18, fontWeight:700,
          color:C.text, marginBottom:6 }}>Configurações</div>
        <p style={{ color:C.muted, fontSize:14, margin:"0 0 20px", lineHeight:1.5 }}>
          Para usar as funcionalidades de IA, insira sua chave de API pessoal da Anthropic. É gratuita para obter em{" "}
          <span style={{ color:C.gold, fontWeight:600 }}>console.anthropic.com</span>
        </p>
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:12, color:C.muted, fontWeight:600, marginBottom:8,
            textTransform:"uppercase", letterSpacing:"0.08em" }}>Sua chave de API (Anthropic)</div>
          <div style={{ position:"relative" }}>
            <input
              type={masked ? "password" : "text"}
              value={key}
              onChange={e => setKey(e.target.value)}
              placeholder="sk-ant-api03-..."
              style={{ width:"100%", padding:"14px 50px 14px 16px", borderRadius:14, boxSizing:"border-box",
                background:C.card2, border:`2px solid ${key ? C.gold : C.border}`,
                color:C.text, fontSize:14, outline:"none", fontFamily:"'Open Sans',sans-serif",
                transition:"border-color 0.2s" }}
              onFocus={e => e.target.style.borderColor=C.gold}
              onBlur={e => e.target.style.borderColor=key?C.gold:C.border}
            />
            <button onClick={() => setMasked(m=>!m)} style={{
              position:"absolute", right:14, top:"50%", transform:"translateY(-50%)",
              background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:16 }}>
              {masked ? "👁" : "🙈"}
            </button>
          </div>
          {key && (
            <div style={{ fontSize:12, color:C.muted, marginTop:6 }}>
              Chave: {maskKey(key)}
            </div>
          )}
        </div>
        <button onClick={save} disabled={!key.trim()} style={{
          width:"100%", padding:"15px", borderRadius:14, border:"none",
          background: saved ? C.green : (!key.trim() ? C.border : C.gold),
          color: saved ? C.bg : (!key.trim() ? C.muted : C.bg),
          fontSize:15, fontWeight:700, cursor:!key.trim()?"not-allowed":"pointer",
          fontFamily:"'Montserrat',sans-serif", transition:"all 0.2s",
        }}>{saved ? "✓ Salvo" : "Salvar chave"}</button>
        <div style={{ marginTop:16, padding:"12px 14px", borderRadius:12,
          background:C.blueDim, border:`1px solid ${C.blue}30` }}>
          <div style={{ fontSize:13, color:C.muted, lineHeight:1.5 }}>
            🔒 Sua chave fica salva apenas no seu dispositivo. Nunca é compartilhada.
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Nutrition Tab ────────────────────────────────────────────────────────────
function NutricaoTab({ initialSub }) {
  const [sub, setSub] = useState(initialSub || "analise");

  useEffect(() => { if (initialSub) setSub(initialSub); }, [initialSub]);

  const SUBS = [
    { id:"analise",      label:"📸 Análise" },
    { id:"ingredientes", label:"🥗 Refeição" },
    { id:"compras",      label:"🛒 Compras" },
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%" }}>
      {/* Sub-nav */}
      <div style={{ padding:"18px 20px 4px", flexShrink:0 }}>
        <div style={{ display:"flex", gap:4, background:C.bg, borderRadius:14, padding:5, border:`1px solid ${C.border}` }}>
          {SUBS.map(s => {
            const active = sub===s.id;
            return (
              <button key={s.id} onClick={()=>setSub(s.id)} style={{
                flex:1, padding:"10px 4px", borderRadius:10, border:"none",
                background: active ? `linear-gradient(135deg,${C.navy},${C.card2})` : "transparent",
                color: active ? C.text : C.muted,
                fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"'Montserrat',sans-serif",
                transition:"all 0.2s", boxShadow: active ? C.shadowSm : "none",
              }}>{s.label}</button>
            );
          })}
        </div>
      </div>
      {/* Content */}
      <div style={{ flex:1, overflow:"hidden" }}>
        {sub==="analise"      && <PlateAnalysis />}
        {sub==="ingredientes" && <MealSuggestion />}
        {sub==="compras"      && <ShoppingList />}
      </div>
    </div>
  );
}

function PlateAnalysis() {
  const [mode, setMode]       = useState(null);
  const [type, setType]       = useState(null);
  const [image, setImage]     = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);
  const [error, setError]     = useState(null);
  const [used, setUsed]       = useState(0);
  const fileRef = useRef();

  useEffect(() => { getCount("plate").then(setUsed); }, []);

  const handleFile = e => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 1024;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const scale = maxDim / Math.max(width, height);
          width = Math.round(width * scale); height = Math.round(height * scale);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        setImage({ base64:dataUrl.split(",")[1], mediaType:"image/jpeg" });
        setPreview(dataUrl); setResult(null);
      };
      img.onerror = () => { setError("Não foi possível ler a imagem. Tente outra foto."); };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  const analyze = async () => {
    if (!mode||!type||!image) return;
    if (used >= LIMITS.plate) return;
    setLoading(true); setError(null); setResult(null);
    const prompt = type==="buffet"
      ? "Esta é uma foto de um buffet. Analise as opções e me diga exatamente como montar o prato ideal para maximizar o emagrecimento. O que priorizar, o que evitar, em que quantidade."
      : "Esta é uma foto do meu prato já montado. Avalie segundo o protocolo: o que está bem, o que melhorar, qual o ajuste mais importante para a próxima refeição.";
    try {
      const txt = await callAI(mode==="pe" ? PE_SYSTEM : PVQ_SYSTEM, prompt, image);
      setResult({ text:txt, demo:false });
    } catch {
      setResult({ text: mode==="pe" ? DEMO.plate_pe : DEMO.plate_pvq, demo:true });
    } finally {
      await incCount("plate");
      setUsed(await getCount("plate"));
      setLoading(false);
    }
  };

  const reset = () => { setMode(null); setType(null); setImage(null); setPreview(null); setResult(null); setError(null); };
  const mc = mode==="pvq" ? C.blue : C.gold;
  const atLimit = used >= LIMITS.plate;

  if (result) return (
    <div style={{ padding:"20px 20px", overflowY:"auto", height:"100%", boxSizing:"border-box" }}>
      <button onClick={reset} style={{ background:"none", border:"none", color:C.muted, fontSize:14, cursor:"pointer", padding:0, marginBottom:16, fontFamily:"inherit", fontWeight:600 }}>← Nova análise</button>
      <div style={{ display:"inline-block", fontSize:11, color:mc, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:14, background:mc+"18", padding:"5px 12px", borderRadius:99 }}>
        {mode==="pe" ? "🎯 Análise rigorosa" : "🤝 Análise flexível"}
      </div>
      {preview && <img src={preview} alt="" style={{ width:"100%", borderRadius:16, marginBottom:16, objectFit:"cover", maxHeight:200, display:"block" }} />}
      {result.demo && <DemoBanner />}
      <Card style={{ padding:"18px 20px", color:C.text, fontSize:15, lineHeight:1.6, whiteSpace:"pre-wrap", fontWeight:400 }}>{result.text}</Card>
      <button onClick={reset} style={{ width:"100%", marginTop:14, padding:"13px", borderRadius:14, border:`2px solid ${C.border}`, background:"transparent", color:C.muted, fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>↺ Analisar outra foto</button>
    </div>
  );

  return (
    <div style={{ padding:"20px", overflowY:"auto", height:"100%", boxSizing:"border-box", display:"flex", flexDirection:"column", gap:20 }}>
      <div>
        <div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:22, fontWeight:800, color:C.text, marginBottom:4 }}>Análise de Prato</div>
        <p style={{ color:C.muted, fontSize:13, margin:0, lineHeight:1.6 }}>Foto do buffet ou prato pronto. A IA orienta.</p>
      </div>
      <div>
        <SectionLabel>Modo</SectionLabel>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <Opt label="🎯 Rigoroso" sub="Máxima eficiência. Sem concessões." sel={mode==="pe"} onClick={()=>setMode("pe")} />
          <Opt label="🤝 Flexível" sub="Sustentável. Resultados com mais leveza." sel={mode==="pvq"} onClick={()=>setMode("pvq")} accent={C.blue} />
        </div>
      </div>
      <div>
        <SectionLabel>O que analisar?</SectionLabel>
        <div style={{ display:"flex", gap:12 }}>
          {[["buffet","🍽️","Buffet","Me ajude a montar"],["plate","✅","Prato pronto","Avalie o que fiz"]].map(([v,e,l,s])=>(
            <button key={v} onClick={()=>setType(v)} style={{ flex:1, padding:"16px 10px", borderRadius:14, background:type===v ? C.gold+"18" : C.card, border:`2px solid ${type===v ? C.gold : C.border}`, cursor:"pointer", fontFamily:"inherit", textAlign:"center" }}>
              <div style={{fontSize:24,marginBottom:8}}>{e}</div>
              <div style={{ color:type===v ? C.gold : C.text, fontSize:13, fontWeight:700 }}>{l}</div>
              <div style={{color:C.muted,fontSize:11,marginTop:2}}>{s}</div>
            </button>
          ))}
        </div>
      </div>
      <div>
        <SectionLabel>Foto</SectionLabel>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{display:"none"}} />
        {preview ? (
          <div style={{position:"relative"}}>
            <img src={preview} alt="" style={{ width:"100%", borderRadius:14, objectFit:"cover", maxHeight:200, display:"block" }} />
            <button onClick={()=>{setImage(null);setPreview(null);}} style={{ position:"absolute", top:10, right:10, background:"#000c", border:"none", color:"#fff", borderRadius:"50%", width:32, height:32, cursor:"pointer", fontSize:18, display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
          </div>
        ) : (
          <button onClick={()=>fileRef.current?.click()} style={{ width:"100%", padding:"28px 16px", borderRadius:14, background:C.card, border:`2px dashed ${C.border}`, cursor:"pointer", fontFamily:"inherit", color:C.muted, fontSize:14, display:"flex", flexDirection:"column", alignItems:"center", gap:10 }}>
            <span style={{fontSize:34}}>📷</span><span>Tirar foto ou escolher da galeria</span>
          </button>
        )}
      </div>
      {error && <div style={{ color:C.red, fontSize:13, padding:"12px 16px", background:C.red+"15", borderRadius:12 }}>{error}</div>}
      <LimitBar type="plate" used={used} />
      <button onClick={analyze} disabled={!mode||!type||!image||loading||atLimit} style={{
        width:"100%", padding:"16px", borderRadius:16, border:"none",
        background: (!mode||!type||!image||loading||atLimit) ? C.border : (mode==="pvq" ? C.blue : C.gold),
        color: (!mode||!type||!image||loading||atLimit) ? C.muted : C.bg,
        fontSize:16, fontWeight:800, cursor:(!mode||!type||!image||loading||atLimit)?"not-allowed":"pointer",
        fontFamily:"'Montserrat',sans-serif", transition:"all 0.15s",
      }}>{atLimit ? "Limite diário atingido" : loading ? "Analisando..." : "Analisar →"}</button>
    </div>
  );
}

function MealSuggestion() {
  const [mode, setMode]         = useState(null);
  const [ingredients, setIngr]  = useState("");
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState(null);
  const [error, setError]       = useState(null);
  const [used, setUsed]         = useState(0);

  useEffect(() => { getCount("meal").then(setUsed); }, []);
  const atLimit = used >= LIMITS.meal;

  const suggest = async () => {
    if (!ingredients.trim()||!mode||atLimit) return;
    setLoading(true); setError(null); setResult(null);
    const prompt = `Modo: ${mode==="pe"?"rigoroso (maximize razão proteína-energia)":"flexível (método PVQ)"}\n\nIngredientes disponíveis:\n${ingredients}`;
    try { setResult({ text: await callAI(MEAL_SYSTEM, prompt), demo:false }); }
    catch { setResult({ text: DEMO.meal, demo:true }); }
    finally {
      await incCount("meal"); setUsed(await getCount("meal")); setLoading(false);
    }
  };

  if (result) return (
    <div style={{ padding:"20px", overflowY:"auto", height:"100%", boxSizing:"border-box" }}>
      <button onClick={()=>setResult(null)} style={{ background:"none", border:"none", color:C.muted, fontSize:14, cursor:"pointer", padding:0, marginBottom:16, fontFamily:"inherit", fontWeight:600 }}>← Nova sugestão</button>
      <div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:20, fontWeight:700, color:C.text, marginBottom:14, lineHeight:1.4 }}>Sua refeição sugerida</div>
      {result.demo && <DemoBanner />}
      <Card style={{ padding:"18px 20px", color:C.text, fontSize:15, lineHeight:1.6, whiteSpace:"pre-wrap", fontWeight:400 }}>{result.text}</Card>
    </div>
  );

  return (
    <div style={{ padding:"20px", overflowY:"auto", height:"100%", boxSizing:"border-box", display:"flex", flexDirection:"column", gap:20 }}>
      <div>
        <div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:22, fontWeight:800, color:C.text, marginBottom:4 }}>Sugestão de Refeição</div>
        <p style={{ color:C.muted, fontSize:13, margin:0, lineHeight:1.6 }}>Liste o que tem disponível e receba sugestões de refeições que respeitam o seu protocolo.</p>
      </div>
      <div>
        <SectionLabel>Modo</SectionLabel>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={()=>setMode("pe")} style={{ flex:1, padding:"14px 10px", borderRadius:14, background:mode==="pe" ? C.gold+"18" : C.card, border:`2px solid ${mode==="pe" ? C.gold : C.border}`, color:mode==="pe" ? C.gold : C.muted, fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>🎯 Rigoroso</button>
          <button onClick={()=>setMode("pvq")} style={{ flex:1, padding:"14px 10px", borderRadius:14, background:mode==="pvq" ? C.blue+"20" : C.card, border:`2px solid ${mode==="pvq" ? C.blue : C.border}`, color:mode==="pvq" ? C.blue : C.muted, fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>🤝 Flexível</button>
        </div>
      </div>
      <div>
        <SectionLabel>O que você tem em casa?</SectionLabel>
        <TA value={ingredients} onChange={setIngr} placeholder={"Ex:\nOvos, frango, brócolis, azeite, alho, limão, iogurte grego, tomate..."} minHeight={140} />
      </div>
      {error && <div style={{ color:C.red, fontSize:13, padding:"12px 16px", background:C.red+"15", borderRadius:12 }}>{error}</div>}
      <LimitBar type="meal" used={used} />
      <button onClick={suggest} disabled={!ingredients.trim()||!mode||loading||atLimit} style={{
        width:"100%", padding:"16px", borderRadius:16, border:"none",
        background:(!ingredients.trim()||!mode||loading||atLimit) ? C.border : C.gold,
        color:(!ingredients.trim()||!mode||loading||atLimit) ? C.muted : C.bg,
        fontSize:16, fontWeight:800, cursor:(!ingredients.trim()||!mode||loading||atLimit)?"not-allowed":"pointer",
        fontFamily:"'Montserrat',sans-serif", transition:"all 0.15s",
      }}>{atLimit ? "Limite diário atingido" : loading ? "Gerando sugestão..." : "Sugerir refeição →"}</button>
    </div>
  );
}

function ShoppingList() {
  const PROTEINS = ["Frango","Peixe (filé)","Atum (lata)","Ovos","Carne bovina magra","Camarão","Salmão","Sardinha","Iogurte grego","Cottage"];
  const CHIPS    = ["Sem glúten","Sem lactose","Vegetariano","Vegano","Sem frutos do mar","Sem ovos","Sem amendoim","Sem carne vermelha","Diabético","Hipertensão"];

  const [prefs, setPrefs]     = useState({ proteins:[], chips:[], other:"", people:"1" });
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);
  const [error, setError]     = useState(null);
  const [used, setUsed]       = useState(0);

  useEffect(() => { getCount("shopping").then(setUsed); }, []);
  const atLimit = used >= LIMITS.shopping;

  const toggleP = v => setPrefs(p => ({ ...p, proteins: p.proteins.includes(v) ? p.proteins.filter(x=>x!==v) : [...p.proteins,v] }));
  const toggleC = v => setPrefs(p => ({ ...p, chips: p.chips.includes(v) ? p.chips.filter(x=>x!==v) : [...p.chips,v] }));

  const generate = async () => {
    if (atLimit) return;
    setLoading(true); setError(null); setResult(null);
    const allR = [...prefs.chips, ...(prefs.other.trim() ? [prefs.other.trim()] : [])];
    const prompt = `Gere uma lista de compras para ${prefs.people} pessoa(s) para 1 semana completa.
Proteínas preferidas: ${prefs.proteins.length>0 ? prefs.proteins.join(", ") : "variadas"}
${allR.length>0 ? `Restrições: ${allR.join(", ")}` : "Sem restrições alimentares."}
Inclua variedade de vegetais não-amiláceos, proteínas magras e itens para o espaço de flexibilidade consciente.`;
    try { setResult({ text: await callAI(SHOPPING_SYSTEM, prompt), demo:false }); }
    catch { setResult({ text: DEMO.shopping, demo:true }); }
    finally {
      await incCount("shopping"); setUsed(await getCount("shopping")); setLoading(false);
    }
  };

  if (result) return (
    <div style={{ padding:"20px", overflowY:"auto", height:"100%", boxSizing:"border-box" }}>
      <button onClick={()=>setResult(null)} style={{ background:"none", border:"none", color:C.muted, fontSize:14, fontWeight:600, cursor:"pointer", padding:0, marginBottom:16, fontFamily:"inherit" }}>← Nova lista</button>
      <div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:20, fontWeight:700, color:C.text, marginBottom:14, lineHeight:1.4 }}>Lista da semana</div>
      {result.demo && <DemoBanner />}
      <Card style={{ padding:"18px 20px", color:C.text, fontSize:15, lineHeight:1.6, whiteSpace:"pre-wrap", fontWeight:400 }}>{result.text}</Card>
    </div>
  );

  return (
    <div style={{ padding:"20px", overflowY:"auto", height:"100%", boxSizing:"border-box", display:"flex", flexDirection:"column", gap:20 }}>
      <div>
        <div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:22, fontWeight:700, color:C.text, marginBottom:6, lineHeight:1.4 }}>Lista de Compras</div>
        <p style={{ color:C.muted, fontSize:15, margin:0, lineHeight:1.5, fontWeight:400 }}>Lista semanal personalizada que respeita o protocolo do médico.</p>
      </div>
      <div>
        <SectionLabel>Proteínas que você gosta</SectionLabel>
        <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
          {PROTEINS.map(p => { const sel=prefs.proteins.includes(p); return (
            <button key={p} onClick={()=>toggleP(p)} style={{
              padding:"8px 14px", borderRadius:99, border:`1.5px solid ${sel ? C.gold : C.border}`,
              background: sel ? C.goldDim : C.card, color: sel ? C.gold : C.muted,
              fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit", transition:"all 0.15s",
            }}>{p}</button>
          );})}
        </div>
      </div>
      <div>
        <SectionLabel>Para quantas pessoas?</SectionLabel>
        <div style={{ display:"flex", gap:10 }}>
          {["1","2","3","4+"].map(n => (
            <button key={n} onClick={()=>setPrefs(p=>({...p,people:n}))} style={{
              flex:1, padding:"12px 8px", borderRadius:12,
              border:`2px solid ${prefs.people===n ? C.gold : C.border}`,
              background: prefs.people===n ? C.goldDim : C.card,
              color: prefs.people===n ? C.gold : C.muted,
              fontSize:16, fontWeight:700, cursor:"pointer", fontFamily:"'Montserrat',sans-serif",
            }}>{n}</button>
          ))}
        </div>
      </div>
      <div>
        <SectionLabel>Restrições alimentares</SectionLabel>
        <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:12 }}>
          {CHIPS.map(r => { const sel=prefs.chips.includes(r); return (
            <button key={r} onClick={()=>toggleC(r)} style={{
              padding:"8px 14px", borderRadius:99,
              border:`1.5px solid ${sel ? C.red+"80" : C.border}`,
              background: sel ? C.red+"18" : C.card,
              color: sel ? C.red : C.muted,
              fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit", transition:"all 0.15s",
            }}>{sel ? "✕ " : ""}{r}</button>
          );})}
        </div>
        <TA value={prefs.other} onChange={v=>setPrefs(p=>({...p,other:v}))} placeholder="Outras restrições ou observações..." minHeight={60} />
      </div>
      {error && <div style={{ color:C.red, fontSize:14, padding:"12px 16px", background:C.red+"15", borderRadius:12, lineHeight:1.5 }}>{error}</div>}
      <LimitBar type="shopping" used={used} />
      <button onClick={generate} disabled={loading||atLimit} style={{
        width:"100%", padding:"16px", borderRadius:16, border:"none",
        background:(loading||atLimit) ? C.border : C.gold, color:(loading||atLimit) ? C.muted : C.bg,
        fontSize:16, fontWeight:700, cursor:(loading||atLimit)?"not-allowed":"pointer",
        fontFamily:"'Montserrat',sans-serif", transition:"all 0.15s",
      }}>{atLimit ? "Limite semanal atingido" : loading ? "Gerando lista..." : "Gerar lista →"}</button>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab]             = useState("home");
  const [nutSub, setNutSub]       = useState("analise");
  const [lastScore, setLastScore] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [splash, setSplash]       = useState(true); // always show on open

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800&family=Open+Sans:wght@400;500;600&display=swap";
    document.head.appendChild(link);
    document.body.style.cssText = "margin:0;background:#060f1a;font-family:'Open Sans',system-ui,sans-serif;";

    (async () => {
      try {
        const s = await window.storage.get("last-score");
        if (s?.value) setLastScore(JSON.parse(s.value));
      } catch {}
    })();

    // Friday notification
    if ("Notification" in window && Notification.permission==="granted" && new Date().getDay()===5) {
      setTimeout(() => new Notification("📋 Check-in semanal — Dr. Filipe Leão", {
        body:"É sexta! Registre sua semana agora. O fim de semana é onde a maioria perde o que construiu."
      }), 2000);
    }
  }, []);

  const handleScoreSaved = async (score) => {
    setLastScore(score);
    try { await window.storage.set("last-score", JSON.stringify(score)); } catch {}
    // append to score history
    try {
      let hist = [];
      const h = await window.storage.get("score-history");
      if (h?.value) hist = JSON.parse(h.value);
      hist.push({ ...score, date: new Date().toISOString().slice(0,10) });
      if (hist.length > 20) hist = hist.slice(-20);
      await window.storage.set("score-history", JSON.stringify(hist));
    } catch {}
  };

  const navTo = (t, sub) => {
    setTab(t);
    if (sub) setNutSub(sub);
  };

  const TABS = [
    { id:"home",      icon:"🏠", label:"Início" },
    { id:"checkin",   icon:"📋", label:"Check-in" },
    { id:"nutricao",  icon:"🍽️", label:"Nutrição" },
    { id:"progresso", icon:"📈", label:"Progresso" },
  ];

  return (
    <div style={{ minHeight:"100dvh", display:"flex", alignItems:"center", justifyContent:"center",
      background:`radial-gradient(circle at 50% 0%, ${C.navy}30, #050c15 70%)`, padding:"16px", fontFamily:"'Open Sans',system-ui,sans-serif" }}>
      <div style={{
        width:"100%", maxWidth:390, height:"min(820px,calc(100dvh - 32px))",
        background:`linear-gradient(180deg,${C.bgGrad},${C.bg} 30%)`, borderRadius:40, overflow:"hidden",
        boxShadow:`0 50px 120px rgba(0,0,0,0.85), 0 0 0 1px ${C.borderLt}40`,
        display:"flex", flexDirection:"column", position:"relative",
      }}>
        {splash ? (
          <SplashScreen onEnter={() => setSplash(false)} />
        ) : (
          <>
            <SettingsDrawer open={showSettings} onClose={() => setShowSettings(false)} />
            <div style={{ flex:1, overflow:"hidden" }}>
              {tab==="home"      && <HomeTab lastScore={lastScore} onTabNav={navTo} onSettings={() => setShowSettings(true)} />}
              {tab==="checkin"   && <CheckInTab onScoreSaved={handleScoreSaved} />}
              {tab==="nutricao"  && <NutricaoTab initialSub={nutSub} />}
              {tab==="progresso" && <ProgressTab />}
            </div>
            <div style={{ display:"flex", background:`${C.card}f0`, borderTop:`1px solid ${C.border}`, flexShrink:0, padding:"8px 12px 14px", backdropFilter:"blur(10px)" }}>
              {TABS.map(t => {
                const active = tab===t.id;
                return (
                  <button key={t.id} onClick={()=>setTab(t.id)} style={{
                    flex:1, padding:"8px 4px", border:"none", cursor:"pointer",
                    background: active ? C.gold+"14" : "transparent", borderRadius:14,
                    display:"flex", flexDirection:"column", alignItems:"center", gap:4, fontFamily:"inherit",
                    transition:"all 0.2s",
                  }}>
                    <span style={{ fontSize:21, filter: active ? "none" : "grayscale(0.4) opacity(0.7)", transition:"all 0.2s" }}>{t.icon}</span>
                    <span style={{ fontSize:11, fontWeight:700, letterSpacing:"0.02em", color: active ? C.goldSoft : C.muted, fontFamily:"'Montserrat',sans-serif" }}>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
