import { useState, useRef, useEffect } from "react";

// ---- Riconoscimento "a parole chiave": nessun servizio esterno, nessun costo ----
const norm = t => (t||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9\s]/g," ").replace(/\s+/g," ").trim();
const STOP = new Set(["con","che","per","una","uno","the","non","come","ieri","oggi","adesso","molto","bene","male","andato","andata","fatto","fatta","follow","fup","pack","closing","chat","nota","note","aperta","iscritto","iscritta","segnalo","aggiungi","profilo","contatto","conoscitiva","sono","stato","stata","anche","poi","dopo","prima","della","dello","delle","nelle","nella","sul","sulla","visto","sentito","parlato","chiamato","scritto","video","call"]);

export function parseFrase(text) {
  const t = " " + norm(text) + " ";
  const out = { step:null, sit:null, chat:false };
  if (/\bconoscitiv/.test(t)) out.step = "CONOSCITIVA";
  if (/\bpack\b/.test(t)) out.step = "PACK";
  if (/\bclosing\b/.test(t)) out.step = "CLOSING";
  if (/\bfup ?1\b|\bfollow ?up\b|\bfollowup\b|\bprimo follow/.test(t)) out.step = "FUP1";
  if (/\bfup ?2\b|\bfollow ?up ?2\b|\bsecondo follow|\bsecondo fup/.test(t)) out.step = "FUP2";
  if (/\biscritt|\bsi e iscritt|\bha firmato\b/.test(t)) out.sit = "iscritto";
  if (/\bbalzat|\bnon e interessat|\bnon interessat|\bsparit|\bnon vuole\b/.test(t)) out.sit = "balzato";
  if (/\briprender|\brisentir|\bpiu avanti\b|\bpiu in la\b/.test(t)) out.sit = "riprendere";
  if (/\bchat aperta\b|\bho aperto (la )?chat\b|\baperto la chat\b/.test(t)) out.chat = true;
  return out;
}

export function cercaProspect(text, lista) {
  const tokens = [...new Set(norm(text).split(" ").filter(w=>w.length>=3 && !STOP.has(w)))];
  if (!tokens.length) return [];
  const res = [];
  for (const p of lista) {
    const nome = norm(p.nome).split(" ").filter(Boolean);
    const cogn = norm(p.cognome).split(" ").filter(Boolean);
    let score = 0;
    for (const w of tokens) {
      if (nome.includes(w)) score += 2;
      else if (cogn.includes(w)) score += 3; // il cognome e' piu' specifico
    }
    if (score>0) res.push({ p, score: score + (p._userId ? 0 : 0.5) });
  }
  res.sort((a,b)=>b.score-a.score);
  return res.slice(0,6).map(r=>r.p);
}

export function indovinaNome(text) {
  const m = (text||"").match(/\b(?:con|di|a|da|su)\s+([A-Za-zÀ-ÿ']{3,}(?:\s+[A-Za-zÀ-ÿ']{3,})?)/);
  if (!m) return { nome:"", cognome:"" };
  const parts = m[1].trim().split(/\s+/).map(x=>x[0].toUpperCase()+x.slice(1));
  return { nome: parts[0]||"", cognome: parts[1]||"" };
}

const STEP_LABEL = { CONOSCITIVA:"Fatta conoscitiva", FUP1:"Fatto FUP 1", FUP2:"Fatto FUP 2", PACK:"Fatto Pack", CLOSING:"Fatto Closing" };
const SIT_LABEL = { iscritto:"Iscritto", balzato:"Balzato", riprendere:"Riprendere più avanti" };

export function Assistente({ prospects, onApply, onNew, onClose, faseLabel }) {
  const [text, setText] = useState("");
  const [cands, setCands] = useState(null);
  const [sel, setSel] = useState(null);
  const [azioni, setAzioni] = useState({ step:null, sit:null, chat:false });
  const [use, setUse] = useState({ step:true, sit:true, chat:true, nota:true });
  const [ascolto, setAscolto] = useState(false);
  const recRef = useRef(null);
  const SR = typeof window!=="undefined" ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;

  useEffect(()=>()=>{ try{recRef.current&&recRef.current.stop();}catch(e){} },[]);

  function analizza(t) {
    const frase = t ?? text;
    if (!frase.trim()) return;
    const c = cercaProspect(frase, prospects);
    setCands(c); setSel(c[0]||null);
    setAzioni(parseFrase(frase));
    setUse({ step:true, sit:true, chat:true, nota:true });
  }

  function parla() {
    if (!SR) return;
    if (ascolto) { try{recRef.current.stop();}catch(e){} return; }
    const r = new SR();
    r.lang = "it-IT"; r.interimResults = true; r.continuous = false;
    let finale = "";
    r.onresult = e => {
      let tmp = "";
      for (let i=0;i<e.results.length;i++) { const tr=e.results[i][0].transcript; if (e.results[i].isFinal) finale += tr+" "; else tmp += tr; }
      setText((finale+tmp).trim());
    };
    r.onend = () => { setAscolto(false); const f=finale.trim(); if (f) { setText(f); analizza(f); } };
    r.onerror = () => setAscolto(false);
    recRef.current = r; setAscolto(true);
    try { r.start(); } catch(e) { setAscolto(false); }
  }

  const haAzioni = azioni.step || azioni.sit || azioni.chat;
  const lbl = { fontSize:11, fontWeight:700, color:"var(--muted)", textTransform:"uppercase", letterSpacing:.8, marginBottom:6, display:"block" };
  const chk = { width:20, height:20, accentColor:"#6d5efc", flexShrink:0 };
  const rowAz = { display:"flex", alignItems:"center", gap:10, padding:"10px 12px", background:"var(--bg3)", borderRadius:12, fontSize:14, fontWeight:600, color:"var(--text)", cursor:"pointer" };

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"#0f172a66", backdropFilter:"blur(6px)", zIndex:1100, display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
      <div onClick={e=>e.stopPropagation()} style={{ width:"100%", maxWidth:560, maxHeight:"92vh", overflowY:"auto", background:"var(--bg2)", borderRadius:"22px 22px 0 0", padding:"1.3rem 1.2rem 1.6rem", boxShadow:"0 -20px 60px -20px #0f172a55" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
          <div style={{ fontWeight:800, fontSize:18, color:"var(--text)" }}>Chat: dimmi cosa è successo</div>
          <button onClick={onClose} style={{ background:"var(--bg3)", border:"1px solid var(--border)", borderRadius:9, padding:"4px 11px", fontSize:14, cursor:"pointer", color:"var(--muted)" }}>{"✕"}</button>
        </div>
        <textarea value={text} onChange={e=>setText(e.target.value)} rows={3} placeholder={'es. "Ho fatto il follow up con Francesco Rossi, è andato molto bene"'} style={{ resize:"none", marginBottom:10 }} />
        <div style={{ display:"flex", gap:8, marginBottom:14 }}>
          {SR && (
            <button onClick={parla} style={{ flex:1, padding:"13px", borderRadius:13, border:"none", cursor:"pointer", fontWeight:700, fontSize:15, color:"#fff", background: ascolto ? "#ef4444" : "linear-gradient(135deg,var(--a1),var(--a2))" }}>
              {ascolto ? "⏹ Sto ascoltando... tocca per fermare" : "🎙️ Parla"}
            </button>
          )}
          <button onClick={()=>analizza()} style={{ flex:1, padding:"13px", borderRadius:13, border:"1px solid var(--border2)", cursor:"pointer", fontWeight:700, fontSize:15, background:"var(--bg4)", color:"var(--a2)" }}>Analizza</button>
        </div>
        {!SR && <div style={{ fontSize:12, color:"var(--muted)", marginBottom:12 }}>Per dettare usa il microfono della tastiera del telefono, poi premi Analizza.</div>}

        {cands && cands.length===0 && (
          <div style={{ background:"#f59e0b1a", border:"1px solid #fde68a", borderRadius:14, padding:14 }}>
            <div style={{ fontWeight:700, color:"#92400e", marginBottom:8 }}>Non trovo nessun prospect con quel nome.</div>
            <button onClick={()=>onNew(indovinaNome(text), text)} style={{ width:"100%", padding:"12px", borderRadius:12, border:"none", cursor:"pointer", fontWeight:700, fontSize:14, color:"#fff", background:"linear-gradient(135deg,var(--a1),var(--a2))" }}>+ Crea nuovo prospect</button>
          </div>
        )}

        {cands && cands.length>0 && (
          <>
            <label style={lbl}>Chi è?</label>
            <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:14 }}>
              {cands.map(p=>(
                <button key={p.id} onClick={()=>setSel(p)} style={{ textAlign:"left", padding:"11px 13px", borderRadius:13, cursor:"pointer", fontFamily:"inherit", border: sel&&sel.id===p.id ? "2px solid var(--a1)" : "1px solid var(--border2)", background: sel&&sel.id===p.id ? "var(--bg4)" : "var(--bg2)" }}>
                  <div style={{ fontWeight:800, fontSize:15, color:"var(--text)" }}>{p.nome} {p.cognome}</div>
                  <div style={{ fontSize:12, color:"var(--muted)" }}>{[p.citta, faseLabel(p.fase), p._userId?("di "+(p._ownerName||"team")):"mio"].filter(Boolean).join(" · ")}</div>
                </button>
              ))}
              <button onClick={()=>onNew(indovinaNome(text), text)} style={{ padding:"10px", borderRadius:12, border:"1px dashed var(--border2)", background:"transparent", cursor:"pointer", fontWeight:600, fontSize:13, color:"var(--muted)" }}>Non è nessuno di questi: crea nuovo prospect</button>
            </div>

            {sel && (
              <>
                <label style={lbl}>Cosa salvo su {sel.nome}?</label>
                <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:14 }}>
                  {azioni.step && <label style={rowAz}><input type="checkbox" style={chk} checked={use.step} onChange={e=>setUse(u=>({...u,step:e.target.checked}))} /> Fase: {STEP_LABEL[azioni.step]}</label>}
                  {azioni.sit && <label style={rowAz}><input type="checkbox" style={chk} checked={use.sit} onChange={e=>setUse(u=>({...u,sit:e.target.checked}))} /> Situazione: {SIT_LABEL[azioni.sit]}</label>}
                  {azioni.chat && <label style={rowAz}><input type="checkbox" style={chk} checked={use.chat} onChange={e=>setUse(u=>({...u,chat:e.target.checked}))} /> Chat aperta</label>}
                  <label style={rowAz}><input type="checkbox" style={chk} checked={use.nota} onChange={e=>setUse(u=>({...u,nota:e.target.checked}))} /> Aggiungi alle note: «{text.trim().slice(0,80)}{text.trim().length>80?"...":""}»</label>
                </div>
                {!haAzioni && <div style={{ fontSize:12, color:"var(--muted)", marginBottom:10 }}>Non ho riconosciuto un cambio di fase: salvo solo la nota.</div>}
                <button onClick={()=>onApply(sel,{ step:use.step?azioni.step:null, sit:use.sit?azioni.sit:null, chat:use.chat&&azioni.chat, nota:use.nota?text.trim():"" })} style={{ width:"100%", padding:"14px", borderRadius:14, border:"none", cursor:"pointer", fontWeight:800, fontSize:15, color:"#fff", background:"linear-gradient(135deg,#10b981,#059669)" }}>
                  {"✅"} Conferma e salva
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
