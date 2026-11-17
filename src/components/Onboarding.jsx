import { useState, useEffect } from "react";
import { GUIDE as CONTENUTI, GUIDE_TITOLI } from "./onboardingGuide";
import FOTO_URL from "./onboardingFotoUrl";

// ── LINK: modificali qui se cambiano ─────────────────────────────
const APP = [
  { id:"wow",  nome:"WOW Learn", emoji:"🎓",
    android:"https://play.google.com/store/apps/details?id=com.app.wowlearn",
    ios:"https://apps.apple.com/it/app/wowlearn-app/id1616151447?l=en-GB" },
  { id:"deep", nome:"DeepSage",  emoji:"🌀",
    android:"https://play.google.com/store/apps/details?id=com.deepsage.mobile&pli=1",
    ios:"https://apps.apple.com/it/app/deepsage/id6754235082?l=en-GB" },
];
const VIDEO = [
  { t:"Psicologia, basi e PAC", url:"https://communitypreview.lovable.app/" },
  { t:"Completa l'esercizio per capire da quale situazione parti", url:"https://beclubonboarding-plan.netlify.app/" },
];
const WOW_LOGIN = "https://wowpowers.com/it/auth/sign-in";
const BASE = [
  { id:"azionario", nome:"Azionario", emoji:"📈", corso:"WES Stock Basic" },
  { id:"forex",     nome:"Forex",     emoji:"💵", corso:"WES Forex Basic" },
  { id:"crypto",    nome:"Crypto",    emoji:"₿",  corso:"WES Crypto Basic" },
];
// Guide di approfondimento: il contenuto sta in onboardingGuide.js (guida = id di quel file)
const GUIDE = [
  { id:"azionario", nome:"Azionario", emoji:"📈", titolo:"Guida Stock Market", guida:"azionario" },
  { id:"forex", nome:"Forex", emoji:"💵", titolo:"Guida NXT", guida:null },
  { id:"crypto", nome:"Crypto", emoji:"₿", titolo:"Guida Crypto Market (solo con SGM)", guida:"crypto" },
  { id:"indici", nome:"Indici e Materie prime", emoji:"🛢️", titolo:"Guida Indici e Materie prime", guida:"indici" },
];
// ─────────────────────────────────────────────────────────────────

const card = { background:"var(--bg2)", border:"1px solid var(--border)", borderRadius:18, padding:"1.2rem 1.3rem" };
const eyebrow = { fontSize:11, fontWeight:800, letterSpacing:1.6, textTransform:"uppercase", color:"var(--a1)" };
const btnP = { display:"inline-flex", alignItems:"center", justifyContent:"center", gap:8, padding:"13px 18px", borderRadius:13, border:"none",
  background:"linear-gradient(135deg,var(--a1),var(--a2))", color:"#fff", fontWeight:800, fontSize:15, cursor:"pointer", textDecoration:"none" };
const btnG = { ...btnP, background:"var(--bg)", color:"var(--a2)", border:"1px solid var(--border)" };

function load(key) { try { return JSON.parse(localStorage.getItem(key) || "{}"); } catch { return {}; } }
function save(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch {} }

function Avviso({ titolo, testo }) {
  return (
    <div style={{...card, borderColor:"var(--a1)", background:"var(--bg)", display:"flex", gap:12, alignItems:"flex-start"}}>
      <div style={{fontSize:22}}>⚠️</div>
      <div><div style={{fontWeight:800,color:"var(--text)",marginBottom:2}}>{titolo}</div><div style={{color:"var(--muted)",fontSize:14,lineHeight:1.5}}>{testo}</div></div>
    </div>
  );
}

function Conferma({ titolo, voci, onOk, onBack }) {
  const [sel, setSel] = useState({});
  const tutte = voci.every(v => sel[v]);
  return (
    <div onClick={onBack} style={{position:"fixed",inset:0,background:"#0f172a99",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div onClick={e=>e.stopPropagation()} style={{...card, width:"100%", maxWidth:460, padding:"1.5rem"}}>
        <div style={{fontWeight:900,fontSize:20,color:"var(--text)",textAlign:"center"}}>Sei sicuro di voler proseguire?</div>
        <div style={{color:"var(--muted)",fontSize:14,textAlign:"center",margin:"6px 0 16px"}}>{titolo}</div>
        {voci.map(v => (
          <label key={v} style={{display:"flex",gap:12,alignItems:"center",padding:"12px 14px",border:"1px solid "+(sel[v]?"var(--a1)":"var(--border)"),borderRadius:13,marginBottom:8,cursor:"pointer",background:sel[v]?"var(--bg)":"transparent",fontWeight:700,color:"var(--text)",fontSize:14}}>
            <input type="checkbox" checked={!!sel[v]} onChange={e=>setSel({...sel,[v]:e.target.checked})} style={{width:20,height:20,accentColor:"#6d5efc"}} />{v}
          </label>
        ))}
        <div style={{color:"#b45309",fontSize:12.5,margin:"6px 0 14px"}}>⚠ Procedere saltando gli step potrebbe costarti degli errori in futuro.</div>
        <div style={{display:"flex",gap:10}}>
          <button onClick={onBack} style={{...btnG,flex:1}}>← Indietro</button>
          <button disabled={!tutte} onClick={onOk} style={{...btnP,flex:1.4,opacity:tutte?1:.4,cursor:tutte?"pointer":"not-allowed"}}>✓ Sì, sono sicuro</button>
        </div>
      </div>
    </div>
  );
}

const FOTO_FILE = Object.keys(FOTO_URL).reduce((m,k)=>{ m[k.replace(/\.[a-z]+$/,"")]=k; return m; },{});
function Foto({ name }) {
  const file = FOTO_FILE[name];
  const [src, setSrc] = useState("/onboarding/" + file);
  if (!file) return null;
  return <img src={src} alt="" loading="lazy" onError={()=>{ if (src !== FOTO_URL[file]) setSrc(FOTO_URL[file]); }}
    style={{width:"100%",maxWidth:560,display:"block",margin:"10px auto",borderRadius:14,border:"1px solid var(--border)"}} />;
}

function Blocco({ b, apri }) {
  const [k, a1, a2, a3, a4] = b;
  const txt = { color:"var(--text)", fontSize:15, lineHeight:1.6, margin:"6px 0" };
  if (k==="h")  return <h3 style={{fontWeight:900,fontSize:19,color:"var(--text)",margin:"22px 0 6px",letterSpacing:-.3}}>{a1}</h3>;
  if (k==="h3") return <div style={{fontWeight:800,fontSize:15.5,color:"var(--text)",margin:"16px 0 4px"}}>{a1}</div>;
  if (k==="p")  return <p style={txt}>{a1}</p>;
  if (k==="q")  return <div style={{...txt,background:"var(--bg)",border:"1px solid var(--border)",borderLeft:"4px solid var(--a1)",borderRadius:12,padding:"10px 14px",fontWeight:600}}>{a1}</div>;
  if (k==="ul") return <ul style={{...txt,paddingLeft:22}}>{a1.map((x,i)=><li key={i} style={{margin:"4px 0"}}>{x}</li>)}</ul>;
  if (k==="img") return <Foto name={a1} />;
  if (k==="yt") return <div style={{position:"relative",paddingTop:"56.25%",margin:"10px 0",borderRadius:14,overflow:"hidden",border:"1px solid var(--border)"}}>
    <iframe src={"https://www.youtube.com/embed/"+a1+"?rel=0"} title="Video" allowFullScreen style={{position:"absolute",inset:0,width:"100%",height:"100%",border:0}} /></div>;
  if (k==="a")  return <a href={a2} target="_blank" rel="noreferrer" style={{...btnG,margin:"6px 0",textAlign:"left"}}>{a1} →</a>;
  if (k==="g")  return <button onClick={()=>apri(a1)} style={{...btnG,margin:"6px 0",width:"100%",justifyContent:"space-between",boxSizing:"border-box",textAlign:"left"}}>{a2}<span>→</span></button>;
  if (k==="t")  return <div style={{border:"1px solid var(--border)",borderRadius:14,overflow:"hidden",margin:"8px 0"}}>{a1.map((r,i)=>(
      <div key={i} className="otab" style={{display:"grid",gridTemplateColumns:"minmax(110px,32%) 1fr",gap:12,padding:"10px 14px",background:i%2?"var(--bg)":"var(--bg2)",fontSize:14,lineHeight:1.5}}>
        <div style={{fontWeight:800,color:"var(--text)"}}>{r[0]}</div><div style={{color:"var(--muted)"}}>{r[1]}</div></div>))}</div>;
  if (k==="step") return (
    <div style={{...card,padding:"12px 14px",margin:"8px 0"}}>
      <div style={{fontWeight:700,color:"var(--text)",fontSize:15}}>{a1}</div>
      {a2 && <a href={a2} target="_blank" rel="noreferrer" style={{...btnG,marginTop:8,padding:"10px 14px",fontSize:14}}>Apri su WOW →</a>}
      {a4 && <button onClick={()=>apri(a4)} style={{...btnP,marginTop:8,padding:"10px 14px",fontSize:14}}>Apri la guida →</button>}
      {a3 && <Foto name={a3} />}
    </div>);
  return null;
}

function Lettore({ id, apri, indietro }) {
  useEffect(()=>{ window.scrollTo(0,0); },[id]);
  return (
    <div className="page-wrap" style={{padding:"2rem 2.2rem",maxWidth:760,margin:"0 auto"}}>
      <button onClick={indietro} style={{...btnG,padding:"9px 14px",fontSize:14,marginBottom:14}}>← Indietro</button>
      <div style={eyebrow}>Guida</div>
      <h1 style={{fontWeight:900,fontSize:26,letterSpacing:-.6,color:"var(--text)",margin:"4px 0 8px"}}>{GUIDE_TITOLI[id]}</h1>
      {(CONTENUTI[id]||[]).map((b,i)=><Blocco key={id+i} b={b} apri={apri} />)}
      <div style={{marginTop:26}}><button onClick={indietro} style={btnG}>← Indietro</button></div>
    </div>
  );
}

export function OnboardingView({ auth }) {
  const key = "dl_onboarding_" + (auth?.userId || "x");
  const [st, setSt] = useState(() => load(key));
  const [modal, setModal] = useState(null); // "intro" | "base"
  const [store, setStore] = useState(null);  // app per cui scegliere lo store
  const [mercato, setMercato] = useState(st.mercato || "azionario");
  const [pila, setPila] = useState([]); // guide aperte (l'ultima è quella visibile)
  const up = (patch) => { const n = { ...st, ...patch }; setSt(n); save(key, n); };

  const passo = st.fine ? 4 : st.base ? 3 : st.intro ? 2 : 1;
  const pct = Math.round(((passo - 1) / 3) * 100);
  const g = GUIDE.find(x => x.id === mercato) || GUIDE[0];

  if (pila.length) {
    const id = pila[pila.length-1];
    return <Lettore id={id} apri={x=>setPila([...pila,x])} indietro={()=>setPila(pila.slice(0,-1))} />;
  }

  const Bloccato = ({ testo }) => (
    <div style={{...card, textAlign:"center", color:"var(--muted)", padding:"1.6rem"}}>🔒 {testo}</div>
  );

  return (
    <div className="page-wrap" style={{padding:"2rem 2.2rem",maxWidth:900,margin:"0 auto"}}>
      <div style={eyebrow}>Digital Legacy · Be Club</div>
      <h1 style={{fontWeight:900,fontSize:30,letterSpacing:-.8,color:"var(--text)",margin:"4px 0 6px"}}>Onboarding</h1>
      <div style={{color:"var(--muted)",fontSize:15,marginBottom:16}}>Segui ogni sezione in ordine. Ogni passo costruisce le competenze per quello successivo.</div>

      <div style={{height:8,borderRadius:99,background:"var(--border)",overflow:"hidden",marginBottom:6}}>
        <div style={{width:pct+"%",height:"100%",background:"linear-gradient(90deg,var(--a1),var(--a2))",transition:"width .4s"}} />
      </div>
      <div style={{fontSize:12,color:"var(--muted)",marginBottom:26,fontWeight:700}}>{st.fine ? "Percorso completato ✓" : "Passo " + passo + " di 3 · " + pct + "%"}</div>

      {/* ───── 1. INTRODUZIONE ───── */}
      <div style={eyebrow}>Primo passo</div>
      <h2 style={{fontWeight:900,fontSize:24,color:"var(--text)",margin:"2px 0 14px"}}>Introduzione</h2>

      <div style={{display:"grid",gap:12}}>
        <div style={card}>
          <div style={eyebrow}>Step 1</div>
          <div style={{fontWeight:800,fontSize:17,color:"var(--text)",margin:"2px 0 4px"}}>📱 Scarica le App</div>
          <div style={{color:"var(--muted)",fontSize:14,marginBottom:12}}>WOW Learn e DeepSage sono fondamentali. Scaricale prima di procedere.</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:10}}>
            {APP.map(a => (
              <div key={a.id} style={{border:"1px solid var(--border)",borderRadius:14,padding:14,textAlign:"center"}}>
                <div style={{fontSize:34}}>{a.emoji}</div>
                <div style={{fontWeight:800,color:"var(--text)",margin:"4px 0 10px"}}>{a.nome}</div>
                <button onClick={()=>setStore(store===a.id?null:a.id)} style={{...btnP,width:"100%"}}>⬇ Scarica</button>
                {store===a.id && (
                  <div style={{display:"grid",gap:8,marginTop:8}}>
                    <a href={a.android} target="_blank" rel="noreferrer" style={btnG}>▶ Google Play</a>
                    <a href={a.ios} target="_blank" rel="noreferrer" style={btnG}> Apple Store</a>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div style={card}>
          <div style={eyebrow}>Step 2</div>
          <div style={{fontWeight:800,fontSize:17,color:"var(--text)",margin:"2px 0 4px"}}>▶ Guarda i video introduttivi su Click</div>
          <div style={{color:"var(--muted)",fontSize:14,marginBottom:12}}>Accedi ai due video prima di proseguire.</div>
          <div style={{display:"grid",gap:8}}>
            {VIDEO.map(v => (
              <a key={v.url} href={v.url} target="_blank" rel="noreferrer" style={{...btnG,justifyContent:"flex-start",textAlign:"left",textTransform:"uppercase",fontSize:13,letterSpacing:.3}}>▷ {v.t}</a>
            ))}
          </div>
        </div>

        <Avviso titolo="Step 3 · Contatta la tua Upline" testo="Prima di proseguire, contatta la tua Upline per impostare il SageMaster e ricevere la conferma per accedere ai corsi base." />

        <div style={{...card,textAlign:"center",background:"var(--bg)"}}>
          <div style={eyebrow}>Pronto?</div>
          <div style={{fontWeight:900,fontSize:20,color:"var(--text)",margin:"4px 0 6px"}}>Inizia il Percorso Base su WOW</div>
          <div style={{color:"var(--muted)",fontSize:13.5,marginBottom:12}}>Clicca solo dopo aver completato i 3 step sopra.</div>
          {st.intro
            ? <div style={{color:"#059669",fontWeight:800}}>✓ Introduzione completata</div>
            : <button onClick={()=>setModal("intro")} style={btnP}>🚀 Inizia il Percorso Base →</button>}
          <div style={{color:"#b45309",fontSize:12,marginTop:10}}>⚠ Procedere saltando gli step potrebbe costarti degli errori in futuro.</div>
        </div>
      </div>

      {/* ───── 2. PERCORSO BASE ───── */}
      <div style={{...eyebrow,marginTop:40}}>Secondo passo</div>
      <h2 style={{fontWeight:900,fontSize:24,color:"var(--text)",margin:"2px 0 4px"}}>Percorso Base</h2>
      <div style={{color:"var(--muted)",fontSize:14,marginBottom:14}}>Segui i moduli base e intermedi per ogni mercato.</div>
      {!st.intro ? <Bloccato testo="Completa prima l'Introduzione." /> : (
        <div style={{display:"grid",gap:12}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:12}}>
            {BASE.map(b => (
              <div key={b.id} style={card}>
                <div style={{fontSize:26}}>{b.emoji}</div>
                <div style={eyebrow}>Mercato</div>
                <div style={{fontWeight:900,fontSize:19,color:"var(--text)",margin:"2px 0 10px"}}>{b.nome}</div>
                <a href={WOW_LOGIN} target="_blank" rel="noreferrer" style={{...btnG,justifyContent:"space-between",width:"100%",boxSizing:"border-box"}}>{b.corso}<span>→</span></a>
              </div>
            ))}
          </div>
          <Avviso titolo="Contatta la tua Upline" testo="Parla con la tua Upline per capire su quale mercato focalizzarti prima di passare all'approfondimento." />
          <div style={{...card,textAlign:"center",background:"var(--bg)"}}>
            <div style={eyebrow}>Pronto per il prossimo livello?</div>
            <div style={{fontWeight:900,fontSize:20,color:"var(--text)",margin:"4px 0 6px"}}>Inizia il Percorso Avanzato</div>
            <div style={{color:"var(--muted)",fontSize:13.5,marginBottom:12}}>Completa tutti i corsi base e intermedi prima di procedere.</div>
            {st.base
              ? <div style={{color:"#059669",fontWeight:800}}>✓ Percorso base completato</div>
              : <button onClick={()=>setModal("base")} style={btnP}>🎯 Inizia il Percorso Avanzato →</button>}
          </div>
        </div>
      )}

      {/* ───── 3. APPROFONDIMENTO ───── */}
      <div style={{...eyebrow,marginTop:40}}>Terzo passo</div>
      <h2 style={{fontWeight:900,fontSize:24,color:"var(--text)",margin:"2px 0 4px"}}>Approfondimento</h2>
      <div style={{color:"var(--muted)",fontSize:14,marginBottom:14}}>Padroneggia il mercato scelto con strumenti avanzati.</div>
      {!st.base ? <Bloccato testo="Completa prima il Percorso Base." /> : (
        <div style={{display:"grid",gap:12}}>
          <div style={{...card,borderColor:"var(--a1)",display:"flex",gap:12}}>
            <div style={{fontSize:24}}>💡</div>
            <div><div style={{fontWeight:800,color:"var(--text)",marginBottom:2}}>Confrontati con la tua Upline</div>
              <div style={{color:"var(--muted)",fontSize:14,lineHeight:1.5}}>Prima di procedere, confrontati con la tua upline per individuare insieme il percorso più adatto al tuo profilo. La scelta del mercato è un momento chiave del tuo percorso: non affrontarla da solo.</div></div>
          </div>

          <div style={card}>
            <div style={{fontWeight:800,color:"var(--text)",marginBottom:2}}>📖 Guida: capire quale mercato fa più il caso tuo</div>
            <div style={{color:"var(--muted)",fontSize:13.5,marginBottom:10}}>Le linee guida per scegliere su quale dei 3 mercati concentrarti.</div>
            <button onClick={()=>setPila(["scelta"])} style={btnP}>Apri la guida →</button>
          </div>

          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {GUIDE.map(x => (
              <button key={x.id} onClick={()=>{setMercato(x.id);up({mercato:x.id});}}
                style={{padding:"10px 16px",borderRadius:99,border:"1px solid "+(mercato===x.id?"var(--a1)":"var(--border)"),background:mercato===x.id?"var(--a1)":"var(--bg2)",color:mercato===x.id?"#fff":"var(--text)",fontWeight:800,fontSize:14,cursor:"pointer"}}>
                {x.emoji} {x.nome}
              </button>
            ))}
          </div>

          <div style={card}>
            <div style={{fontSize:26}}>{g.emoji}</div>
            <div style={eyebrow}>Approfondimento</div>
            <div style={{fontWeight:900,fontSize:19,color:"var(--text)",margin:"2px 0 10px"}}>{g.nome}</div>
            {g.guida
              ? <button onClick={()=>setPila([g.guida])} style={{...btnG,justifyContent:"space-between",width:"100%",boxSizing:"border-box"}}>{g.titolo}<span>→</span></button>
              : <div style={{...btnG,justifyContent:"space-between",width:"100%",boxSizing:"border-box",cursor:"default",opacity:.7}}>{g.titolo}<span style={{fontSize:12,fontWeight:700}}>in arrivo</span></div>}
          </div>

          <div style={{...card,textAlign:"center",background:"var(--bg)"}}>
            <div style={eyebrow}>Ultimo passo</div>
            <div style={{fontWeight:900,fontSize:20,color:"var(--text)",margin:"4px 0 6px"}}>Completa il percorso Be Club</div>
            <div style={{color:"var(--muted)",fontSize:13.5,marginBottom:12}}>Conferma di aver completato tutti i corsi e le guide del percorso avanzato.</div>
            {st.fine
              ? <div style={{color:"#059669",fontWeight:900,fontSize:18}}>🏆 Be Club completato! Benvenuto nel team.</div>
              : <button onClick={()=>up({fine:true})} style={btnP}>🏆 Ho completato il percorso →</button>}
          </div>
        </div>
      )}

      <div style={{textAlign:"center",marginTop:30}}>
        <button onClick={()=>{ if(window.confirm("Ripartire da capo con l'onboarding?")) { const n={}; setSt(n); save(key,n); } }}
          style={{background:"none",border:"none",color:"var(--muted)",fontSize:12.5,cursor:"pointer",textDecoration:"underline"}}>Ricomincia da capo</button>
      </div>

      {modal==="intro" && <Conferma titolo="Prima di proseguire assicurati di:"
        voci={["Ho scaricato WOW Learn e DeepSage","Ho impostato SGM Forex con la mia Upline","Ho impostato SGM Crypto con la mia Upline"]}
        onBack={()=>setModal(null)} onOk={()=>{up({intro:true});setModal(null);window.open(WOW_LOGIN,"_blank","noopener");}} />}
      {modal==="base" && <Conferma titolo="Prima di proseguire assicurati di:"
        voci={["Ho visto il percorso base e intermedio Azionario","Ho visto il percorso base e intermedio Forex","Ho visto il percorso base e intermedio Crypto"]}
        onBack={()=>setModal(null)} onOk={()=>{up({base:true});setModal(null);}} />}
    </div>
  );
}
