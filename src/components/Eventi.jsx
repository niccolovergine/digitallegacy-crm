import { useState, useMemo, useEffect } from "react";

// ── EVENTI ────────────────────────────────────────────────────────
// Per cambiare date o testi: modifica solo qui.
export const EVENTI = [
  { id:"global-mission", nome:"Global Mission", quando:"12 dicembre 2026", emoji:"🌍", colore:"#2563eb", logo:"/eventi/global-mission.png" },
  { id:"salisburgo", nome:"Convention Salisburgo", quando:"3-4 aprile 2027", emoji:"🏔️", colore:"#7c3aed", logo:"/eventi/salisburgo.png" },
];
// fino a questa data (compresa) si vedono banner e festeggiamenti del Global Mission
const CAPIENZA = { "global-mission": 150 }; // posti in sala
const GM_FINE = new Date(2026, 11, 12, 23, 59, 59);
export const globalMissionAttivo = () => new Date() <= GM_FINE;

// Logo: se esiste il file in public/eventi/ lo usa, altrimenti scritta di riserva
export function EventoLogo({ ev, size = 90 }) {
  const [ko, setKo] = useState(false);
  if (!ko) return <img src={ev.logo} alt={ev.nome} onError={()=>setKo(true)} style={{height:size,maxWidth:"100%",objectFit:"contain"}} />;
  return (
    <div style={{display:"inline-flex",flexDirection:"column",alignItems:"center",lineHeight:1.05}}>
      <div style={{fontSize:size*0.5}}>{ev.emoji}</div>
      <div style={{fontWeight:900,fontSize:Math.max(18,size*0.3),letterSpacing:2,textTransform:"uppercase"}}>{ev.nome}</div>
    </div>
  );
}

const card = { background:"var(--bg2)", border:"1px solid var(--border)", borderRadius:18 };

export function EventiView({ auth, allProfiles, downline, isNic, ticketRows, isLeader, onToggle }) {
  const [evId, setEvId] = useState("global-mission");
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState("tutti");
  const ev = EVENTI.find(e => e.id === evId);

  // ognuno vede solo sé stesso e chi sta sotto di lui; Nic vede tutti
  const membri = useMemo(() => {
    const me = (allProfiles || []).find(p => p.id === auth?.userId);
    const base = isNic ? (allProfiles || []) : [...(me ? [me] : []), ...(downline || [])];
    const visti = new Set();
    return base
      .filter(p => { if (visti.has(p.id)) return false; visti.add(p.id); return p.attivo !== false && (p.nome || p.cognome); })
      .sort((a, b) => ((a.cognome||"")+(a.nome||"")).localeCompare((b.cognome||"")+(b.nome||"")));
  }, [allProfiles, downline, isNic, auth]);

  const hanno = useMemo(() => new Set((ticketRows || []).filter(r => r.evento === evId).map(r => r.user_id)), [ticketRows, evId]);
  // totale ticket dell'evento (tutti): lo vedono solo i leader
  const totale = (ticketRows || []).filter(r => r.evento === evId).length;
  const cap = CAPIENZA[evId];
  const pct = cap ? Math.min(100, Math.round(totale / cap * 100)) : 0;

  const lista = membri.filter(m => {
    const nome = ((m.nome||"") + " " + (m.cognome||"")).toLowerCase();
    if (q && !nome.includes(q.toLowerCase())) return false;
    if (filtro === "con") return hanno.has(m.id);
    if (filtro === "senza") return !hanno.has(m.id);
    return true;
  });

  return (
    <div className="page-wrap" style={{padding:"2rem 2.2rem",maxWidth:860,margin:"0 auto"}}>
      <div style={{fontSize:12,fontWeight:800,letterSpacing:1.2,textTransform:"uppercase",color:"var(--a2)"}}>Digital Legacy · Be Club</div>
      <h1 style={{fontWeight:900,fontSize:30,letterSpacing:-.8,color:"var(--text)",margin:"4px 0 16px"}}>Eventi</h1>

      {/* scelta evento */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
        {EVENTI.map(e => {
          const on = e.id === evId;
          return (
            <button key={e.id} onClick={()=>{ setEvId(e.id); setQ(""); setFiltro("tutti"); }}
              style={{cursor:"pointer",fontFamily:"inherit",textAlign:"left",padding:"18px 16px",borderRadius:18,border:"3px solid "+(on?"transparent":"var(--border)"),
                background:on?`linear-gradient(135deg,${e.colore},${e.colore}bb)`:"var(--bg2)",color:on?"#fff":"var(--text)",boxShadow:on?"0 8px 22px rgba(0,0,0,.18)":"none"}}>
              <div style={{fontSize:28}}>{e.emoji}</div>
              <div style={{fontWeight:900,fontSize:19,margin:"2px 0"}}>{e.nome}</div>
              <div style={{fontSize:13,opacity:on?.92:.7}}>{e.quando}</div>
            </button>);
        })}
      </div>

      {/* riepilogo: solo leader */}
      {isLeader && (
        <div style={{...card,padding:"18px 20px",marginBottom:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:10,flexWrap:"wrap"}}>
            <div style={{fontWeight:900,fontSize:20,color:"var(--text)"}}>{ev.nome} · {ev.quando}</div>
            <div style={{fontWeight:900,fontSize:26,color:ev.colore}}>{totale}{cap && <span style={{fontSize:16,color:"var(--muted)",fontWeight:700}}> / {cap}</span>}</div>
          </div>
          {cap && <div style={{height:8,borderRadius:99,background:"var(--border)",overflow:"hidden",marginTop:10}}>
            <div style={{width:pct+"%",height:"100%",background:ev.colore,transition:"width .4s"}} /></div>}
        </div>)}
      {!isLeader && <div style={{fontSize:13,color:"var(--muted)",margin:"-4px 0 14px"}}>🔒 Solo i leader possono segnare i ticket. Tu puoi guardare la lista.</div>}

      {/* ricerca + filtri */}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Cerca un nome…" style={{flex:"1 1 200px",padding:"11px 14px",borderRadius:12,border:"1px solid var(--border)",background:"var(--bg2)",color:"var(--text)",fontSize:15}} />
        {[["tutti","Tutti"],["senza","Senza ticket"],["con","Con ticket"]].map(([id,n]) => (
          <button key={id} onClick={()=>setFiltro(id)} style={{padding:"10px 14px",borderRadius:12,border:"1px solid "+(filtro===id?ev.colore:"var(--border)"),background:filtro===id?ev.colore:"var(--bg2)",color:filtro===id?"#fff":"var(--text)",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>{n}</button>))}
      </div>

      {/* lista */}
      <div style={{display:"grid",gap:8}}>
        {lista.map(m => {
          const ok = hanno.has(m.id);
          return (
            <div key={m.id} style={{...card,padding:"12px 14px",display:"flex",alignItems:"center",gap:12,borderColor:ok?"#10b981":"var(--border)"}}>
              <button disabled={!isLeader} onClick={()=>onToggle(evId, m.id, !ok)} aria-label="Ticket acquistato"
                style={{flex:"none",width:32,height:32,borderRadius:10,border:"2px solid "+(ok?"#10b981":"var(--border)"),background:ok?"#10b981":"var(--bg)",color:"#fff",fontWeight:900,fontSize:17,cursor:isLeader?"pointer":"default",opacity:isLeader||ok?1:.6}}>{ok?"✓":""}</button>
              <div style={{flex:1,minWidth:0,fontWeight:700,color:"var(--text)",fontSize:15.5}}>{m.nome} {m.cognome}{m.id===auth?.userId && <span style={{color:"var(--muted)",fontWeight:600}}> (tu)</span>}</div>
              <div style={{fontSize:13,fontWeight:800,color:ok?"#10b981":"var(--muted)"}}>{ok?"Ticket preso 🎟️":"—"}</div>
            </div>);
        })}
        {!lista.length && <div style={{color:"var(--muted)",textAlign:"center",padding:24}}>Nessun nome trovato.</div>}
      </div>
    </div>
  );
}

// ── POPUP ALL'APERTURA DEL CRM ────────────────────────────────────
// ticket preso → festeggiamenti; altrimenti → banner con domanda (solo ❌ per chiudere)
export function EventoPopup({ haTicket }) {
  const gm = EVENTI[0];
  const chiave = "dl_gm_popup_" + (haTicket ? "festa" : "banner");
  const [aperto, setAperto] = useState(() => { try { return !sessionStorage.getItem(chiave); } catch { return true; } });
  const chiudi = () => { setAperto(false); try { sessionStorage.setItem(chiave, "1"); } catch {} };
  useEffect(() => { setAperto(() => { try { return !sessionStorage.getItem(chiave); } catch { return true; } }); }, [haTicket]);
  if (!aperto || !globalMissionAttivo()) return null;

  const confetti = Array.from({ length: 70 }, (_, i) => ({
    left: (i * 37) % 100, delay: (i % 14) * 0.25, dur: 3 + (i % 5) * 0.7,
    c: ["#f59e0b","#2563eb","#10b981","#ec4899","#a855f7","#ef4444"][i % 6], w: 6 + (i % 4) * 3,
  }));

  return (
    <div style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(6,14,38,.82)",display:"flex",alignItems:"center",justifyContent:"center",padding:16,overflow:"hidden"}}>
      <style>{`@keyframes dlfall{0%{transform:translateY(-12vh) rotate(0)}100%{transform:translateY(112vh) rotate(720deg)}}@keyframes dlpop{0%{transform:scale(.8);opacity:0}100%{transform:scale(1);opacity:1}}@keyframes dlbounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}`}</style>
      {haTicket && confetti.map((c,i) => (
        <span key={i} style={{position:"absolute",top:0,left:c.left+"%",width:c.w,height:c.w*1.6,background:c.c,borderRadius:2,animation:`dlfall ${c.dur}s linear ${c.delay}s infinite`,pointerEvents:"none"}} />))}

      <div style={{position:"relative",width:"100%",maxWidth:480,borderRadius:26,padding:"34px 26px 28px",textAlign:"center",color:"#fff",animation:"dlpop .45s ease-out",
        background:"linear-gradient(160deg,#0b1d4a,#1d4ed8)",boxShadow:"0 24px 70px rgba(0,0,0,.5)"}}>
        {!haTicket && <button onClick={chiudi} aria-label="Chiudi" style={{position:"absolute",top:12,right:12,width:38,height:38,borderRadius:99,border:"none",background:"rgba(255,255,255,.18)",color:"#fff",fontSize:20,fontWeight:900,cursor:"pointer"}}>✕</button>}

        <EventoLogo ev={gm} size={110} />
        {haTicket ? (<>
          <div style={{fontSize:44,margin:"14px 0 0",animation:"dlbounce 1.2s ease-in-out infinite"}}>🎉</div>
          <h2 style={{fontWeight:900,fontSize:27,margin:"6px 0 8px",letterSpacing:-.5}}>Congratulazioni!</h2>
          <div style={{fontSize:17,lineHeight:1.45,opacity:.95}}>Hai preso il ticket per il <b>Global Mission Event</b>.<br/>Ci vediamo il 12 dicembre! 🥳</div>
          <button onClick={chiudi} style={{marginTop:22,padding:"13px 26px",borderRadius:14,border:"none",background:"#fff",color:"#0b1d4a",fontWeight:900,fontSize:16,cursor:"pointer",fontFamily:"inherit"}}>Entra nel CRM 🚀</button>
        </>) : (<>
          <div style={{fontWeight:900,fontSize:24,margin:"20px 0 6px",letterSpacing:-.4}}>Hai già preso il ticket?</div>
          <div style={{fontSize:15.5,opacity:.9,lineHeight:1.45}}>Global Mission · 12 dicembre 2026</div>
        </>)}
      </div>
    </div>
  );
}
