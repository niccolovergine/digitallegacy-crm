import { useState, useEffect } from "react";
import { GUIDE as CONTENUTI, GUIDE_TITOLI } from "./onboardingGuide";
import FOTO_URL from "./onboardingFotoUrl";
import { NowTool } from "./Now";

// ── LINK: modificali qui se cambiano ─────────────────────────────
const APP = [
  { id:"wow",  nome:"WOW Learn", emoji:"🎓",
    android:"https://play.google.com/store/apps/details?id=com.app.wowlearn",
    ios:"https://apps.apple.com/it/app/wowlearn-app/id1616151447?l=en-GB" },
  { id:"deep", nome:"DeepSage",  emoji:"🌀",
    android:"https://play.google.com/store/apps/details?id=com.deepsage.mobile&pli=1",
    ios:"https://apps.apple.com/it/app/deepsage/id6754235082?l=en-GB" },
  { id:"sintra", nome:"Sintra", emoji:"🤖", ios:"https://apps.apple.com/app/id6754648008" },
  { id:"click",  nome:"Click",  emoji:"📲", ios:"https://apps.apple.com/app/id6459833241" },
];
// ── SEZIONE NETWORK ──
const THE_MAP = "https://themap.click/signup";
const PROFILI = [
  ["Digital Legacy","https://www.instagram.com/digitalegacy_?igsh=MXByZHZ5aHRvMHZsZg%3D%3D&utm_source=qr"],
  ["Be Official","https://www.instagram.com/wearebeofficial_/"],
  ["Niccolò Vergine","https://www.instagram.com/nicvergine/?utm_source=ig_web_button_share_sheet"],
  ["Stefano Frontino","https://www.instagram.com/frontinostefano?utm_source=ig_web_button_share_sheet&cplk=ZDNlZDc0MzIxNw=="],
  ["Matteo Bianco","https://www.instagram.com/matteobianco_real?utm_source=ig_web_button_share_sheet&xtok=ZDNlZDc0MzIxNw=="],
  ["Giorgio Trabaldo","https://www.instagram.com/giorgiotrabaldo?utm_source=ig_web_button_share_sheet&exln=ZDNlZDc0MzIxNw=="],
  ["Letizia Auddino","https://www.instagram.com/letiziaauddino?igsh=bDdtMG50NmhtaWs5"],
  ["Nicholas Innocenzo","https://www.instagram.com/nick.innocenzo?utm_source=ig_web_button_share_sheet&obrf=ZDNlZDc0MzIxNw=="],
  ["Alessio Zaio","https://www.instagram.com/alessiozaio/profilecard/?igsh=cGd4aWFqc2tleXc5"],
  ["Alex Mauri","https://www.instagram.com/_alexmauri_?utm_source=ig_web_button_share_sheet&vrfl=ZDNlZDc0MzIxNw=="],
  ["Giulia Gullone","https://www.instagram.com/giuliagullone?utm_source=ig_web_button_share_sheet&psln=ZDNlZDc0MzIxNw=="],
  ["Andrea Traina","https://www.instagram.com/andreatraina_?utm_source=ig_web_button_share_sheet&xtok=ZDNlZDc0MzIxNw=="],
  ["Matteo Spera","https://www.instagram.com/matteo.spera_/"],
  ["Lorenzo Riva","https://www.instagram.com/__lorenzoriva__/"],
  ["Lorenzo Bahr","https://www.instagram.com/lorenzo.bahr?utm_source=ig_web_button_share_sheet&dlrf=ZDNlZDc0MzIxNw=="],
];
const DRIVE = [
  ["📗 Drive libri iniziali","https://drive.google.com/drive/folders/147roNTpwCpuVtiaVpsyZd2IGV10Y9Iul"],
  ["📘 Drive libri avanzati","https://drive.google.com/drive/folders/1GwXyQh0vD7wqLJ2nBkJFBtaLxw3pwJjc?usp=sharing"],
];
const NETWORK = [
  { id:"n1", t:"Guarda «THE MAP»", d:"Registrati e guarda la mappa: ti fa vedere dove stai andando.", link:THE_MAP, linkT:"Apri THE MAP →" },
  { id:"n1b", t:"Scarica l'app Click", d:"L'app con i corsi social del team.", app:["click"] },
  { id:"n2", t:"Segui questi profili Instagram", d:"Sono le persone e gli account del team: seguili tutti per restare dentro al progetto.", profili:true },
  { id:"n3", t:"INIZIA IL TUO PRIMO LIBRO", d:"Scegli dal drive dei libri iniziali e parti. Quando li hai finiti passa a quelli avanzati.", drive:true },
];
const WOW_LOGIN = "https://wowpowers.com/it/auth/sign-in";
const VIDEO_INTRO = "https://player.vimeo.com/video/1165486669?h=6511738550";

const PACCHETTI = [
  { id:"standard",  nome:"Standard",  emoji:"🥉", mercati:["forex"],                                  desc:"Forex" },
  { id:"premium",   nome:"Premium",   emoji:"🥈", mercati:["forex","azionario","indici"],             desc:"Forex · Azionario · Indici e Materie prime" },
  { id:"signature", nome:"Signature", emoji:"🥇", mercati:["forex","azionario","indici","crypto"],    desc:"Forex · Azionario · Indici e Materie prime · Crypto" },
];
// wow = titolo da cercare su WOW; guida = guida interna; link = apertura diretta (serve il login WOW)
const MERCATI = {
  forex: { nome:"Forex", emoji:"💵", nota:"La guida Forex completa è in preparazione: intanto segui questi step.", steps:[
    { id:"fx1", t:"Corso base Forex", tipo:"corso", wow:"WES Forex Basic" },
    { id:"fx2", t:"Playlist di Fabrizio", tipo:"playlist", wow:"WES Forex Basics di Fabrizio | da Zero a Trader" },
    { id:"fx3", t:"Apri il tuo conto demo", guida:"mt5", d:"Ti guidiamo passo passo: broker demo, MetaTrader 5 e collegamento." },
    { id:"fx4", t:"Macro-economia e banche centrali", tipo:"percorso", wow:"Forex Macro-Economia e Banche Centrali", link:"https://wowpowers.com/it/catalog/paths/fc0c3aef-cfd8-4c1e-bd26-0f9eb3ede6e9" },
  ]},
  azionario: { nome:"Azionario", emoji:"📈", steps:[
    { id:"az1", t:"Corso base Azionario", tipo:"corso", wow:"WES Stock Basic" },
    { id:"az2", t:"Guida Azionario", guida:"azionario", d:"Conto demo eToro, live con Enrico, playlist e video." },
  ]},
  indici: { nome:"Indici e Materie prime", emoji:"🛢️", steps:[
    { id:"ix1", t:"Prerequisito: WES Forex Basic", d:"Serve aver visto almeno il corso base Forex (lo fai già nel percorso Forex)." },
    { id:"ix2", t:"Guida Indici e Materie prime", guida:"indici", d:"Live trading con Marco d'Andrea, playlist e conto demo." },
  ]},
  crypto: { nome:"Crypto", emoji:"₿", steps:[
    { id:"cr1", t:"Corso base Crypto", tipo:"corso", wow:"WES Crypto Basic" },
    { id:"cr2", t:"Guida Crypto (con SageMaster)", guida:"crypto", d:"Toolbox Crypto, playlist e live con Marco Pomarico." },
  ]},
};
const COMUNI = [
  { id:"c1", t:"Scarica le due app", d:"WOW Learn e DeepSage sono fondamentali: installale sul telefono.", app:true },
  { id:"c2", t:"Guarda il video introduttivo", d:"Un'ora per capire come costruire competenze finanziarie e imprenditoriali nell'era dell'AI.", video:true },
  { id:"c3", t:"Fai l'esercizio NOW", d:"Circa 10 minuti: ti fa capire da quale situazione parti e dove puoi arrivare.", now:true },
  { id:"c4", t:"Contatta la tua Upline", d:"Per impostare insieme SageMaster e ricevere la conferma per accedere ai corsi." },
];
// ─────────────────────────────────────────────────────────────────

const card = { background:"var(--bg2)", border:"1px solid var(--border)", borderRadius:18, padding:"1.2rem 1.3rem" };
const eyebrow = { fontSize:11, fontWeight:800, letterSpacing:1.6, textTransform:"uppercase", color:"var(--a1)" };
const btnP = { display:"inline-flex", alignItems:"center", justifyContent:"center", gap:8, padding:"13px 18px", borderRadius:13, border:"none",
  background:"linear-gradient(135deg,var(--a1),var(--a2))", color:"#fff", fontWeight:800, fontSize:15, cursor:"pointer", textDecoration:"none" };
const btnG = { ...btnP, background:"var(--bg)", color:"var(--a2)", border:"1px solid var(--border)" };

function load(key) { try { return JSON.parse(localStorage.getItem(key) || "{}"); } catch { return {}; } }
function save(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch {} }

const FOTO_FILE = Object.keys(FOTO_URL).reduce((m,k)=>{ m[k.replace(/\.[a-z]+$/,"")]=k; return m; },{});
function Foto({ name }) {
  const file = FOTO_FILE[name];
  const [src, setSrc] = useState("/onboarding/" + file);
  if (!file) return null;
  return <img src={src} alt="" loading="lazy" onError={()=>{ if (src !== FOTO_URL[file]) setSrc(FOTO_URL[file]); }}
    style={{width:"100%",maxWidth:560,display:"block",margin:"10px auto",borderRadius:14,border:"1px solid var(--border)"}} />;
}

function WowHow({ titolo, link }) {
  return (
    <div style={{marginTop:8,padding:"10px 12px",borderRadius:12,background:"var(--bg)",border:"1px dashed var(--border)",fontSize:13.5,color:"var(--muted)",lineHeight:1.5}}>
      📺 <b style={{color:"var(--text)"}}>Su WOW</b>: accedi, vai nel catalogo e cerca <b style={{color:"var(--a2)"}}>«{titolo}»</b>.
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:8}}>
        <a href={WOW_LOGIN} target="_blank" rel="noreferrer" style={{...btnG,padding:"8px 12px",fontSize:13}}>1 · Accedi a WOW</a>
        {link && <a href={link} target="_blank" rel="noreferrer" style={{...btnG,padding:"8px 12px",fontSize:13}}>2 · Apri direttamente (dopo il login)</a>}
      </div>
    </div>
  );
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
      {!a4 && <WowHow titolo={a1} link={a2} />}
      {a4 && <button onClick={()=>apri(a4)} style={{...btnP,marginTop:8,padding:"10px 14px",fontSize:14}}>Apri la guida →</button>}
      {a3 && <Foto name={a3} />}
    </div>);
  return null;
}

function Lettore({ id, apri, indietro, fatto }) {
  useEffect(()=>{ window.scrollTo(0,0); },[id]);
  if (id === "now") return <NowTool onBack={indietro} onDone={fatto} />;
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
  const key = "dl_onboarding2_" + (auth?.userId || "x");
  const [st, setSt] = useState(() => load(key));
  const [pila, setPila] = useState([]);
  const [store, setStore] = useState(null);
  const up = (patch) => { const n = { ...st, ...patch }; setSt(n); save(key, n); };
  const done = st.done || {};
  const toggle = (id) => up({ done: { ...done, [id]: !done[id] } });

  const pk = PACCHETTI.find(x => x.id === st.pacchetto);
  const mercati = pk ? pk.mercati.map(id => ({ id, ...MERCATI[id] })) : [];
  const sez = st.sezione || "servizi";
  const tutti = sez === "network" ? NETWORK : [...COMUNI, ...mercati.flatMap(m => m.steps)];
  const fatti = tutti.filter(x => done[x.id]).length;
  const pct = tutti.length ? Math.round(fatti / tutti.length * 100) : 0;

  if (pila.length) {
    const id = pila[pila.length - 1];
    return <Lettore id={id} apri={x=>setPila([...pila, x])} indietro={()=>setPila(pila.slice(0,-1))} fatto={()=>up({ done: { ...done, c3: true } })} />;
  }

  const Step = ({ x, n }) => {
    const ok = !!done[x.id];
    return (
      <div style={{...card, padding:"1rem 1.1rem", borderColor: ok ? "#10b981" : "var(--border)"}}>
        <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
          <button onClick={()=>toggle(x.id)} aria-label="Fatto" style={{flex:"none",width:30,height:30,borderRadius:99,border:"2px solid "+(ok?"#10b981":"var(--border)"),background:ok?"#10b981":"var(--bg)",color:"#fff",fontWeight:900,cursor:"pointer",fontSize:15}}>{ok ? "✓" : ""}</button>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:800,fontSize:16,color:"var(--text)"}}>{n ? n + ". " : ""}{x.t}</div>
            {x.d && <div style={{color:"var(--muted)",fontSize:14,lineHeight:1.5,marginTop:2}}>{x.d}</div>}

            {x.app && (
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:10,marginTop:10}}>
                {APP.filter(a => Array.isArray(x.app) ? x.app.includes(a.id) : a.id !== "click").map(a => (
                  <div key={a.id} style={{border:"1px solid var(--border)",borderRadius:14,padding:12,textAlign:"center"}}>
                    <div style={{fontSize:28}}>{a.emoji}</div>
                    <div style={{fontWeight:800,color:"var(--text)",margin:"2px 0 8px"}}>{a.nome}</div>
                    <button onClick={()=>setStore(store===a.id?null:a.id)} style={{...btnP,width:"100%",padding:"10px"}}>⬇ Scarica</button>
                    {store===a.id && <div style={{display:"grid",gap:8,marginTop:8}}>
                      {a.android && <a href={a.android} target="_blank" rel="noreferrer" style={btnG}>▶ Google Play</a>}
                      <a href={a.ios} target="_blank" rel="noreferrer" style={btnG}> Apple Store</a></div>}
                  </div>))}
              </div>)}

            {x.video && <div style={{position:"relative",paddingTop:"56.25%",marginTop:10,borderRadius:14,overflow:"hidden",border:"1px solid var(--border)",background:"#000"}}>
              <iframe src={VIDEO_INTRO} title="Video introduttivo" allow="fullscreen; picture-in-picture" allowFullScreen style={{position:"absolute",inset:0,width:"100%",height:"100%",border:0}} /></div>}

            {x.link && x.linkT && <a href={x.link} target="_blank" rel="noreferrer" style={{...btnP,display:"inline-block",textDecoration:"none",marginTop:10}}>{x.linkT}</a>}
            {x.profili && <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",gap:8,marginTop:10}}>
              {PROFILI.map(([n,u])=><a key={n} href={u} target="_blank" rel="noreferrer" style={{...btnG,textAlign:"left",textDecoration:"none"}}>📸 {n}</a>)}</div>}
            {x.drive && <div style={{display:"grid",gap:8,marginTop:10}}>
              {DRIVE.map(([n,u])=><a key={n} href={u} target="_blank" rel="noreferrer" style={{...btnP,textDecoration:"none",textAlign:"center"}}>{n}</a>)}</div>}
            {x.now && <button onClick={()=>setPila(["now"])} style={{...btnP,marginTop:10}}>Apri l'esercizio NOW →</button>}
            {x.guida && <button onClick={()=>setPila([x.guida])} style={{...btnP,marginTop:10}}>Apri la guida →</button>}
            {x.wow && <WowHow titolo={x.wow} link={x.link} />}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="page-wrap" style={{padding:"2rem 2.2rem",maxWidth:860,margin:"0 auto"}}>
      <div style={eyebrow}>Digital Legacy · Be Club</div>
      <h1 style={{fontWeight:900,fontSize:30,letterSpacing:-.8,color:"var(--text)",margin:"4px 0 6px"}}>Onboarding</h1>
      <div style={{color:"var(--muted)",fontSize:15,marginBottom:18}}>Segui gli step in ordine e spunta ogni passo quando l'hai fatto.</div>

      {/* ───── SCELTA SEZIONE ───── */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:22}}>
        {[["servizi","🛠️","Servizi","App, formazione, mercati"],["network","🤝","Network","Mentalità, profili e libri"]].map(([id,em,n,d])=>{
          const on = sez===id;
          return <button key={id} onClick={()=>up({sezione:id})} style={{cursor:"pointer",fontFamily:"inherit",textAlign:"left",padding:"20px 18px",borderRadius:18,border:"3px solid "+(on?"transparent":"var(--border)"),background:on?"linear-gradient(135deg,var(--a1),var(--a2))":"var(--bg2)",color:on?"#fff":"var(--text)",boxShadow:on?"0 8px 22px rgba(0,0,0,.18)":"none"}}>
            <div style={{fontSize:30}}>{em}</div>
            <div style={{fontWeight:900,fontSize:22,margin:"2px 0"}}>{n}</div>
            <div style={{fontSize:13,opacity:on?.9:.7}}>{d}</div>
          </button>;})}
      </div>

      {(sez==="network" || pk) && <>
        <div style={{height:8,borderRadius:99,background:"var(--border)",overflow:"hidden",marginBottom:6}}>
          <div style={{width:pct+"%",height:"100%",background:"linear-gradient(90deg,var(--a1),var(--a2))",transition:"width .4s"}} /></div>
        <div style={{fontSize:12,color:"var(--muted)",marginBottom:22,fontWeight:700}}>{fatti} di {tutti.length} step completati · {pct}%</div>
      </>}

      {sez==="network" ? (<>
        <div style={eyebrow}>Network</div>
        <h2 style={{fontWeight:900,fontSize:23,color:"var(--text)",margin:"2px 0 12px"}}>Mentalità e network</h2>
        <div style={{display:"grid",gap:10}}>{NETWORK.map((x,i)=><Step key={x.id} x={x} n={i+1} />)}</div>
      </>) : (<>
      {/* ───── PARTE 1: per tutti ───── */}
      <div style={eyebrow}>Parte 1 · Per tutti</div>
      <h2 style={{fontWeight:900,fontSize:23,color:"var(--text)",margin:"2px 0 12px"}}>Le basi</h2>
      <div style={{display:"grid",gap:10}}>{COMUNI.map((x,i)=><Step key={x.id} x={x} n={i+1} />)}</div>

      {/* ───── PARTE 2: pacchetto ───── */}
      <div style={{...eyebrow,marginTop:36}}>Parte 2 · Il tuo pacchetto</div>
      {!pk ? (
        <>
          <h2 style={{fontWeight:900,fontSize:23,color:"var(--text)",margin:"2px 0 4px"}}>Che pacchetto hai acquistato?</h2>
          <div style={{color:"var(--muted)",fontSize:14.5,marginBottom:14}}>Scegli il tuo: ti mostriamo solo gli step del tuo percorso.</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))",gap:12}}>
            {PACCHETTI.map(x => (
              <button key={x.id} onClick={()=>up({pacchetto:x.id})} style={{...card,textAlign:"left",cursor:"pointer",fontFamily:"inherit"}}>
                <div style={{fontSize:30}}>{x.emoji}</div>
                <div style={{fontWeight:900,fontSize:20,color:"var(--text)",margin:"2px 0 4px"}}>{x.nome}</div>
                <div style={{color:"var(--muted)",fontSize:14,lineHeight:1.4}}>{x.desc}</div>
                <div style={{color:"var(--a2)",fontWeight:800,fontSize:14,marginTop:10}}>Scegli →</div>
              </button>))}
          </div>
        </>
      ) : (
        <>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap",margin:"2px 0 12px"}}>
            <h2 style={{fontWeight:900,fontSize:23,color:"var(--text)",margin:0}}>{pk.emoji} Percorso {pk.nome}</h2>
            <button onClick={()=>up({pacchetto:null})} style={{...btnG,padding:"8px 12px",fontSize:13}}>Cambia pacchetto</button>
          </div>
          <div style={{color:"var(--muted)",fontSize:14.5,marginBottom:14}}>Il tuo percorso include: <b style={{color:"var(--text)"}}>{pk.desc}</b>.</div>
          <Avvisa />
          {mercati.map(m => (
            <div key={m.id} style={{marginTop:22}}>
              <h3 style={{fontWeight:900,fontSize:20,color:"var(--text)",margin:"0 0 4px"}}>{m.emoji} {m.nome}</h3>
              {m.nota && <div style={{color:"var(--muted)",fontSize:13.5,marginBottom:8}}>{m.nota}</div>}
              <div style={{display:"grid",gap:10,marginTop:8}}>{m.steps.map((x,i)=><Step key={x.id} x={x} n={i+1} />)}</div>
            </div>))}
          {sez!=="network" && fatti === tutti.length && (
            <div style={{...card,textAlign:"center",marginTop:26,borderColor:"#10b981"}}>
              <div style={{fontSize:34}}>🏆</div>
              <div style={{fontWeight:900,fontSize:20,color:"var(--text)"}}>Onboarding completato!</div>
              <div style={{color:"var(--muted)",fontSize:14.5,marginTop:4}}>Hai fatto tutti gli step del percorso {pk.nome}. Parla con la tua upline per i prossimi passi.</div>
            </div>)}
        </>
      )}

      </>)}

      <div style={{textAlign:"center",marginTop:30}}>
        <button onClick={()=>{ if(window.confirm("Ripartire da capo con l'onboarding?")) { const n={}; setSt(n); save(key,n); } }}
          style={{background:"none",border:"none",color:"var(--muted)",fontSize:12.5,cursor:"pointer",textDecoration:"underline"}}>Ricomincia da capo</button>
      </div>
    </div>
  );
}

function Avvisa() {
  return (
    <div style={{...card,borderColor:"var(--a1)",display:"flex",gap:12,alignItems:"flex-start"}}>
      <div style={{fontSize:22}}>💡</div>
      <div style={{color:"var(--muted)",fontSize:14,lineHeight:1.5}}><b style={{color:"var(--text)"}}>Come si usa WOW.</b> Dove vedi «Su WOW cerca…» devi accedere a WOW (app o sito), aprire il catalogo e cercare il titolo scritto. Se hai dubbi o qualcosa non corrisponde, scrivi alla tua upline.</div>
    </div>
  );
}
