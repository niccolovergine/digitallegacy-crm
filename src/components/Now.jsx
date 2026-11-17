import { useState, useEffect } from "react";

// NOW — esercizio di analisi finanziaria personale (Digital Legacy).
// I dati restano SOLO nel browser di chi li compila (localStorage): non vengono inviati a nessun server.
const KEY = "dl_now_v1";
const VUOTO = { step:1, nome:"", cognome:"", eta:"", casa:"", lav:"", resp:"", stip:"", extraE:[], fisse:{}, extraF:[], vari:{}, extraV:[], fondo:"", pac:"", second:"" };

const FISSE = [
  ["Affitto / Mutuo","Il canone mensile o la rata del mutuo"],
  ["Bollette","Luce, gas, acqua — media mensile"],
  ["Piano telefonico","Abbonamento telefono / internet"],
  ["Abbonamenti","Netflix, Spotify e altri servizi ricorrenti"],
  ["Assicurazioni","RC auto, casa, vita — quota mensile"],
  ["Palestra","Abbonamento mensile"],
  ["Barbiere / Parrucchiere","Media mensile"],
  ["Crescita personale","Se hai un piano mensile"],
  ["Formazione","Corsi, libri — se hai un piano mensile"],
  ["Debiti / Rate mensili","Totale rate di prestiti o finanziamenti attivi"],
];
const VARIABILI = [
  ["Spesa alimentare","Spesa al supermercato"],
  ["Benzina / Trasporti","Carburante, mezzi pubblici, manutenzione auto"],
  ["Cene, uscite, weekend","Vita sociale e tempo libero"],
  ["Abbigliamento","Vestiti, scarpe, accessori"],
];
const PASSI = ["Intro","Profilo","Entrate","Uscite","Fondo","Analisi"];

const eur = n => new Intl.NumberFormat("it-IT",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(Math.round(n||0));
const num = v => { const x = parseFloat(String(v ?? "").replace(",",".")); return isFinite(x) && x > 0 ? x : 0; };
const somma = o => Object.values(o).reduce((a,v)=>a+num(v),0);
const sommaL = l => l.reduce((a,x)=>a+num(x.v),0);

function fv(pac, r, anni) {            // capitale accumulato con versamento mensile
  const i = r/12, n = anni*12;
  return i ? pac*((Math.pow(1+i,n)-1)/i) : pac*n;
}
function anniPer(target, pac, r) {      // anni per arrivare a un capitale target
  if (pac <= 0 || target <= 0) return null;
  const i = r/12;
  const n = Math.log(1 + target*i/pac) / Math.log(1+i);
  const a = n/12;
  return isFinite(a) && a <= 60 ? a : null;
}
const txtAnni = a => a == null ? "oltre 60 anni" : a < 1 ? "meno di 1 anno" : (a < 10 ? a.toFixed(1).replace(".",",") : Math.round(a)) + " anni";

function calcola(s) {
  const entrate = num(s.stip) + sommaL(s.extraE);
  const fisse = somma(s.fisse) + sommaL(s.extraF);
  const vari = somma(s.vari) + sommaL(s.extraV);
  const uscite = fisse + vari;
  const cf = entrate - uscite;
  const fonti = (num(s.stip) > 0 ? 1 : 0) + s.extraE.filter(x=>num(x.v)>0).length;
  const rapporto = entrate > 0 ? cf/entrate : 0;
  const q = rapporto < .1 ? .3 : rapporto < .2 ? .4 : rapporto < .3 ? .5 : .6;
  const pacSugg = cf > 0 ? Math.round(cf*q/10)*10 : 0;
  let mesi = 2;
  if (s.lav === "Autonomo / Freelance" || s.lav === "Più attività") mesi += 2;
  if (s.resp === "Sì") mesi += 1;
  if (fonti < 2) mesi += 1;
  mesi = Math.min(6, mesi);
  const fondoTarget = mesi * uscite;
  const fondo = num(s.fondo);
  const debiti = num(s.fisse["Debiti / Rate mensili"]);
  const abbon = num(s.fisse["Abbonamenti"]) + num(s.fisse["Piano telefonico"]);
  return { entrate, fisse, vari, uscite, cf, fonti, pacSugg, mesi, fondoTarget, fondo, debiti, abbon, rapporto };
}

function consigli(s, c) {
  const L = [];
  if (c.entrate === 0) return ["Inserisci almeno una entrata per ottenere i consigli."];
  if (c.cf < 0) L.push({t:"🚨", x:"Spendi più di quanto entra: ogni mese sei in negativo di " + eur(-c.cf) + ". Prima di pensare a investire, il primo passo è tornare in positivo."});
  else if (c.rapporto < .1) L.push({t:"⚠️", x:"Ti resta meno del 10% delle entrate (" + eur(c.cf) + " al mese). Margine molto stretto: ogni imprevisto ti mette in difficoltà."});
  else if (c.rapporto >= .3) L.push({t:"✅", x:"Ottimo margine: ti resta oltre il 30% delle entrate. Hai già una base solida per costruire un piano di accumulo."});
  if (c.fondo < c.fondoTarget) L.push({t:"🛟", x:"Il tuo fondo di emergenza copre " + (c.uscite ? (c.fondo/c.uscite).toFixed(1).replace(".",",") : "0") + " mesi, te ne servirebbero " + c.mesi + ". Mancano " + eur(c.fondoTarget - c.fondo) + ": è la prima cosa da costruire."});
  else L.push({t:"✅", x:"Il tuo fondo di emergenza è completo: copre almeno " + c.mesi + " mesi di spese."});
  if (c.entrate && c.debiti/c.entrate > .2) L.push({t:"⚠️", x:"Le rate dei debiti pesano il " + Math.round(c.debiti/c.entrate*100) + "% delle entrate. Sopra il 20% è un peso importante: valuta come ridurle."});
  if (c.entrate && num(s.vari["Cene, uscite, weekend"])/c.entrate > .15) L.push({t:"💡", x:"Cene, uscite e weekend pesano oltre il 15% delle entrate: è la voce dove è più facile recuperare margine."});
  if (c.abbon > 0 && c.abbon/c.entrate > .05) L.push({t:"💡", x:"Abbonamenti e telefono valgono " + eur(c.abbon) + " al mese: controlla se li usi davvero tutti."});
  if (c.fonti < 2) L.push({t:"🌱", x:"Dipendi da una sola fonte di reddito. Se si ferma, il tuo cash flow va a zero. Costruire una seconda entrata aumenta la tua sicurezza e accelera tutto il resto."});
  return L;
}

const card = { background:"var(--bg2)", border:"1px solid var(--border)", borderRadius:18, padding:"1.1rem 1.2rem" };
const eyebrow = { fontSize:11, fontWeight:800, letterSpacing:1.6, textTransform:"uppercase", color:"var(--a1)" };
const btnP = { display:"inline-flex", alignItems:"center", justifyContent:"center", gap:8, padding:"13px 20px", borderRadius:13, border:"none",
  background:"linear-gradient(135deg,var(--a1),var(--a2))", color:"#fff", fontWeight:800, fontSize:15, cursor:"pointer" };
const btnG = { ...btnP, background:"var(--bg)", color:"var(--a2)", border:"1px solid var(--border)" };
const inp = { width:"100%", boxSizing:"border-box", padding:"12px 14px", borderRadius:12, border:"1px solid var(--border)", background:"var(--bg)", color:"var(--text)", fontSize:16, fontFamily:"inherit" };

function Aiuto({ voci }) {
  return (
    <details style={{...card, padding:"10px 14px", marginBottom:14}}>
      <summary style={{cursor:"pointer",fontWeight:800,color:"var(--a2)",fontSize:14}}>💡 Hai bisogno di aiuto?</summary>
      <div style={{marginTop:8,display:"grid",gap:10}}>
        {voci.map(([q,a],i)=>(
          <div key={i}><div style={{fontWeight:800,color:"var(--text)",fontSize:14}}>{q}</div><div style={{color:"var(--muted)",fontSize:14,lineHeight:1.5}}>{a}</div></div>
        ))}
      </div>
    </details>
  );
}
const Campo = ({ label, hint, children }) => (
  <label style={{display:"block",marginBottom:12}}>
    <div style={{fontWeight:800,color:"var(--text)",fontSize:14,marginBottom:2}}>{label}</div>
    {hint && <div style={{color:"var(--muted)",fontSize:12.5,marginBottom:5}}>{hint}</div>}
    {children}
  </label>
);
function Soldi({ value, onChange }) {
  return <input type="number" inputMode="decimal" min="0" placeholder="€ 0" value={value ?? ""} onChange={e=>onChange(e.target.value)} style={inp} />;
}
function Extra({ lista, onChange, testo }) {
  return (
    <div>
      {lista.map((x,i)=>(
        <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 120px 36px",gap:8,marginBottom:8}}>
          <input placeholder="Nome voce" value={x.n} onChange={e=>onChange(lista.map((y,j)=>j===i?{...y,n:e.target.value}:y))} style={inp} />
          <Soldi value={x.v} onChange={v=>onChange(lista.map((y,j)=>j===i?{...y,v}:y))} />
          <button onClick={()=>onChange(lista.filter((_,j)=>j!==i))} aria-label="Togli" style={{...btnG,padding:0}}>✕</button>
        </div>
      ))}
      <button onClick={()=>onChange([...lista,{n:"",v:""}])} style={{...btnG,padding:"9px 14px",fontSize:14}}>+ {testo}</button>
    </div>
  );
}

function Riga({ k, v, forte }) {
  return <div style={{display:"flex",justifyContent:"space-between",gap:10,padding:"7px 0",borderBottom:"1px dashed var(--border)",fontSize:14.5,fontWeight:forte?900:600,color:forte?"var(--text)":"var(--muted)"}}><span>{k}</span><span style={{color:"var(--text)"}}>{v}</span></div>;
}

export function NowTool({ onBack, onDone }) {
  const [s, setS] = useState(() => { try { return { ...VUOTO, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch { return VUOTO; } });
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} }, [s]);
  useEffect(() => { window.scrollTo(0,0); }, [s.step]);
  const up = patch => setS(p => ({ ...p, ...patch }));
  const c = calcola(s);
  const pac = s.pac !== "" ? num(s.pac) : c.pacSugg;
  const second = num(s.second);
  const vai = n => up({ step:n });
  const puoi = s.step===2 ? (s.nome.trim() && s.eta && s.casa && s.lav && s.resp) : s.step===3 ? c.entrate > 0 : true;

  const spese = c.uscite;
  const arrivo = [["Prudente",.04],["Media",.07],["Ottimista",.10]];
  const copia = () => {
    const t = ["NOW — Analisi finanziaria di " + s.nome + " " + s.cognome, "Entrate: " + eur(c.entrate), "Uscite: " + eur(c.uscite), "Ti restano al mese: " + eur(c.cf),
      "Fondo emergenza: " + eur(c.fondo) + " su " + eur(c.fondoTarget) + " consigliati (" + c.mesi + " mesi)", "Piano di accumulo: " + eur(pac) + " al mese",
      "Spese annue da coprire: " + eur(spese*12)].join("\n");
    try { navigator.clipboard.writeText(t); alert("Riepilogo copiato: incollalo in un messaggio alla tua upline."); } catch {}
  };

  return (
    <div className="page-wrap" style={{padding:"2rem 2.2rem",maxWidth:760,margin:"0 auto"}}>
      <style>{"@media print{.sb,.mobtop,.ass-fab,.noprint{display:none!important}}"}</style>
      <div className="noprint" style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <button onClick={onBack} style={{...btnG,padding:"9px 14px",fontSize:14}}>← Indietro</button>
        <div style={{fontWeight:900,fontSize:22,letterSpacing:-1,color:"var(--a1)"}}>NOW</div>
      </div>

      <div className="noprint" style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:6}}>
        {PASSI.map((p,i)=>(
          <button key={p} onClick={()=>{ if (i+1 < s.step) vai(i+1); }} style={{flex:"1 1 0",minWidth:70,padding:"8px 4px",borderRadius:10,border:"none",fontWeight:800,fontSize:12,cursor:i+1<s.step?"pointer":"default",
            background:i+1===s.step?"var(--a1)":i+1<s.step?"var(--bg)":"var(--border)",color:i+1===s.step?"#fff":i+1<s.step?"var(--a2)":"var(--muted)"}}>{p}</button>
        ))}
      </div>
      <div className="noprint" style={{fontSize:12,color:"var(--muted)",marginBottom:16}}>Se non capisci qualcosa durante l'esercizio, chiedi sempre alla tua upline. · I tuoi dati restano solo su questo dispositivo.</div>

      {s.step===1 && (
        <div style={card}>
          <div style={eyebrow}>Analisi finanziaria personale</div>
          <h1 style={{fontWeight:900,fontSize:27,letterSpacing:-.7,color:"var(--text)",margin:"4px 0 8px"}}>Analizza la tua situazione finanziaria, step by step</h1>
          <p style={{color:"var(--muted)",fontSize:15,lineHeight:1.6}}>In circa 10 minuti scopri quanto entra, quanto esce, quanto puoi mettere da parte ogni mese e dove ti porta davvero.</p>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(110px,1fr))",gap:10,margin:"14px 0"}}>
            {[["👤","Profilo"],["💼","Entrate"],["🧾","Uscite"],["🎯","Analisi"]].map(([e,t])=>(
              <div key={t} style={{...card,textAlign:"center",padding:"12px 6px"}}><div style={{fontSize:26}}>{e}</div><div style={{fontWeight:800,fontSize:14,color:"var(--text)"}}>{t}</div></div>))}
          </div>
          <Aiuto voci={[["Dove finiscono i miei dati?","Restano solo sul tuo dispositivo, nel browser: servono a non farti perdere il lavoro se chiudi la pagina. Nessun dato viene inviato a un server. Puoi cancellarli in qualsiasi momento con “Ricomincia da capo”."]]} />
          <p style={{color:"var(--muted)",fontSize:12.5,lineHeight:1.5}}>Strumento educativo e informativo: non costituisce consulenza finanziaria, legale o fiscale. Per decisioni importanti rivolgiti sempre a un consulente abilitato.</p>
          <button onClick={()=>vai(2)} style={btnP}>{s.nome || s.stip ? "Continua il percorso →" : "Inizia il percorso →"}</button>
          {(s.nome || s.stip) && <button onClick={()=>setS(VUOTO)} style={{...btnG,marginLeft:8}}>Ricomincia da capo</button>}
        </div>
      )}

      {s.step===2 && (
        <div style={card}>
          <div style={eyebrow}>Step 2 di 6</div>
          <h2 style={{fontWeight:900,fontSize:24,color:"var(--text)",margin:"2px 0 4px"}}>Il tuo profilo</h2>
          <p style={{color:"var(--muted)",fontSize:14.5,margin:"0 0 12px"}}>Rispondi con sincerità: questi dati non ti giudicano, servono solo a calibrare i consigli finali.</p>
          <Aiuto voci={[
            ["Perché mi chiedete questi dati?","Servono solo a calibrare i consigli finali — ad esempio quanti mesi di fondo di emergenza ti servono in base alla tua situazione."],
            ["Cosa vuol dire “Più attività”?","Selezionalo se hai più di un'occupazione contemporaneamente: ad esempio sei dipendente e hai anche un'attività secondaria."],
            ["“Persone a carico” cosa include?","Figli, genitori o altri familiari che dipendono economicamente da te, anche solo in parte."]]} />
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:"0 14px"}}>
            <Campo label="Nome"><input value={s.nome} onChange={e=>up({nome:e.target.value})} placeholder="es. Marco" style={inp} /></Campo>
            <Campo label="Cognome"><input value={s.cognome} onChange={e=>up({cognome:e.target.value})} placeholder="es. Rossi" style={inp} /></Campo>
            <Campo label="Età"><select value={s.eta} onChange={e=>up({eta:e.target.value})} style={inp}><option value="">Seleziona…</option>{Array.from({length:63},(_,i)=>18+i).map(x=><option key={x}>{x}</option>)}</select></Campo>
            <Campo label="Situazione abitativa"><select value={s.casa} onChange={e=>up({casa:e.target.value})} style={inp}><option value="">Seleziona…</option>{["Vivo con la famiglia","Vivo con coinquilini","Vivo da solo","Vivo con il partner"].map(x=><option key={x}>{x}</option>)}</select></Campo>
            <Campo label="Situazione lavorativa"><select value={s.lav} onChange={e=>up({lav:e.target.value})} style={inp}><option value="">Seleziona…</option>{["Dipendente","Autonomo / Freelance","Studente","Più attività"].map(x=><option key={x}>{x}</option>)}</select></Campo>
            <Campo label="Hai persone a carico (figli, genitori)?"><select value={s.resp} onChange={e=>up({resp:e.target.value})} style={inp}><option value="">Seleziona…</option>{["No","Sì"].map(x=><option key={x}>{x}</option>)}</select></Campo>
          </div>
        </div>
      )}

      {s.step===3 && (
        <div style={card}>
          <div style={eyebrow}>Step 3 di 6</div>
          <h2 style={{fontWeight:900,fontSize:24,color:"var(--text)",margin:"2px 0 4px"}}>Le tue entrate</h2>
          <p style={{color:"var(--muted)",fontSize:14.5,margin:"0 0 12px"}}>Inserisci solo entrate già realizzate. Se il reddito è variabile, usa la media degli ultimi 3 mesi, non il mese migliore.</p>
          <Aiuto voci={[
            ["Devo inserire il lordo o il netto?","Sempre il netto: quello che arriva davvero sul tuo conto, non l'importo lordo della busta paga."],
            ["Il mio reddito varia ogni mese, cosa scrivo?","Fai la media degli ultimi 3 mesi (es. 1.200€ + 900€ + 1.500€ = media 1.200€) invece di usare il mese migliore o quello peggiore."],
            ["Ho più fonti di reddito, come le inserisco?","Usa “+ Aggiungi altra entrata” per ognuna, dandole un nome (es. “Lavoro secondario”, “Affitto stanza”). Lo strumento le somma da solo."]]} />
          <Campo label="💼 Stipendio netto mensile" hint="Quello che ricevi sul conto, non il lordo. Se è variabile, inserisci la media mensile."><Soldi value={s.stip} onChange={v=>up({stip:v})} /></Campo>
          <Extra lista={s.extraE} onChange={l=>up({extraE:l})} testo="Aggiungi altra entrata" />
          {c.entrate > 0 && c.fonti < 2 && <div style={{...card,marginTop:12,borderColor:"var(--a1)",fontSize:14,color:"var(--muted)"}}>⚠️ Dipendi da una sola fonte di reddito. Se quella fonte si interrompe, il tuo cash flow va a zero. Costruire un secondo flusso può aumentare la tua sicurezza finanziaria.</div>}
          <div style={{marginTop:12}}><Riga k="Totale entrate mensili" v={eur(c.entrate)} forte /></div>
        </div>
      )}

      {s.step===4 && (
        <div style={card}>
          <div style={eyebrow}>Step 4 di 6</div>
          <h2 style={{fontWeight:900,fontSize:24,color:"var(--text)",margin:"2px 0 4px"}}>Le tue uscite</h2>
          <div style={{...card,borderColor:"var(--a1)",fontSize:14,margin:"6px 0 12px"}}>📌 Inserisci tutte le spese nella maniera più precisa possibile. Non dare nulla per scontato: il risultato finale dipende dalla precisione dei dati che inserisci qui.</div>
          <Aiuto voci={[
            ["Non sono sicuro di quanto spendo in una voce, cosa faccio?","Apri l'app della tua banca e guarda l'estratto conto dell'ultimo mese mentre compili: è il modo più veloce per avere numeri reali invece di stime a occhio."],
            ["Cosa metto in “Abbonamenti”?","Netflix, Spotify, Amazon Prime, palestre online o app: tutti i servizi ricorrenti mensili che paghi."],
            ["Ho più debiti o rate, come li inserisco?","Sommali tutti e inserisci il totale mensile in “Debiti / Rate mensili”: non serve dettagliarli uno per uno."],
            ["Perché “Crescita personale” e “Formazione”?","Se hai corsi o abbonamenti formativi ricorrenti, inseriscili qui. Se non ne hai, lascia 0."]]} />
          <div style={{fontWeight:900,color:"var(--text)",margin:"6px 0 8px"}}>Uscite fisse mensili</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))",gap:"0 14px"}}>
            {FISSE.map(([n,h])=><Campo key={n} label={n} hint={h}><Soldi value={s.fisse[n]} onChange={v=>up({fisse:{...s.fisse,[n]:v}})} /></Campo>)}
          </div>
          <Extra lista={s.extraF} onChange={l=>up({extraF:l})} testo="Aggiungi uscita fissa" />
          <div style={{fontWeight:900,color:"var(--text)",margin:"18px 0 8px"}}>Uscite variabili mensili</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))",gap:"0 14px"}}>
            {VARIABILI.map(([n,h])=><Campo key={n} label={n} hint={h}><Soldi value={s.vari[n]} onChange={v=>up({vari:{...s.vari,[n]:v}})} /></Campo>)}
          </div>
          <Extra lista={s.extraV} onChange={l=>up({extraV:l})} testo="Aggiungi uscita variabile" />
          <div style={{marginTop:14}}>
            <Riga k="Uscite fisse" v={eur(c.fisse)} /><Riga k="Uscite variabili" v={eur(c.vari)} />
            <Riga k="Totale uscite mensili" v={eur(c.uscite)} forte /><Riga k="Ti restano ogni mese (entrate − uscite)" v={eur(c.cf)} forte />
          </div>
        </div>
      )}

      {s.step===5 && (
        <div style={card}>
          <div style={eyebrow}>Step 5 di 6</div>
          <h2 style={{fontWeight:900,fontSize:24,color:"var(--text)",margin:"2px 0 4px"}}>Il tuo fondo disponibile</h2>
          <p style={{color:"var(--muted)",fontSize:14.5,margin:"0 0 12px"}}>Conta solo ciò che è liquido e disponibile subito: conto corrente, contanti, conti deposito. Non contare investimenti vincolati.</p>
          <Aiuto voci={[
            ["Cosa conto esattamente come “disponibile”?","Conto corrente, contanti, conti deposito facilmente svincolabili: tutto ciò che potresti usare entro pochi giorni in caso di emergenza."],
            ["Devo contare anche investimenti, azioni o criptovalute?","No. Conta solo la liquidità immediatamente disponibile, non investimenti che richiederebbero tempo per essere smobilizzati o che potrebbero perdere valore se venduti in fretta."],
            ["Non ho niente da parte, cosa scrivo?","Scrivi 0: è semplicemente il tuo punto di partenza. Vedrai comunque il calcolo di quanto ti servirebbe."]]} />
          <Campo label="Quanto hai attualmente da parte?" hint="Tutto ciò che hai liquido e disponibile."><Soldi value={s.fondo} onChange={v=>up({fondo:v})} /></Campo>
        </div>
      )}

      {s.step===6 && (
        <div style={{display:"grid",gap:14}}>
          <div style={card}>
            <div style={eyebrow}>Step 6 di 6</div>
            <h2 style={{fontWeight:900,fontSize:24,color:"var(--text)",margin:"2px 0 4px"}}>Scenario complessivo{s.nome ? " di " + s.nome : ""}</h2>
            <p style={{color:"var(--muted)",fontSize:14.5,margin:"0 0 10px"}}>La fotografia reale della tua situazione, calcolata in automatico. Leggi con calma ogni sezione prima di salvare il PDF.</p>
            <Riga k="Entrate mensili" v={eur(c.entrate)} /><Riga k="Uscite fisse" v={eur(c.fisse)} /><Riga k="Uscite variabili" v={eur(c.vari)} />
            <Riga k="Ti restano ogni mese" v={eur(c.cf)} forte /><Riga k="Liquidità disponibile" v={eur(c.fondo)} />
          </div>

          <div style={card}>
            <div style={eyebrow}>1 · Piano di accumulo</div>
            <h3 style={{fontWeight:900,fontSize:20,color:"var(--text)",margin:"2px 0 6px"}}>Quanto puoi mettere da parte ogni mese</h3>
            <Aiuto voci={[
              ["Perché il Piano di Accumulo suggerito è proprio quella cifra?","Lo strumento calcola una percentuale del tuo margine mensile, crescente in base a quanto risparmi: così l'importo è sostenibile e non mette sotto pressione il tuo bilancio."],
              ["Posso modificare l'importo?","Sì, il campo è modificabile: cambia l'importo per vedere come cambia la simulazione."],
              ["Che rendimento devo scegliere?","Nessuno può sapere quanto renderanno i mercati. Per questo confronti tre ipotesi: prudente (4%), media (7%) e ottimista (10%). Sono simulazioni, non promesse: il risultato reale può essere più alto o più basso."]]} />
            <Campo label="Piano di accumulo mensile (€)" hint={"Suggerito: " + eur(c.pacSugg)}><Soldi value={s.pac !== "" ? s.pac : c.pacSugg || ""} onChange={v=>up({pac:v})} /></Campo>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:14}}>
                <thead><tr style={{textAlign:"right",color:"var(--muted)"}}><th style={{textAlign:"left",padding:"6px 0"}}>Dopo…</th>{arrivo.map(([n,r])=><th key={n} style={{padding:"6px 0"}}>{n} {Math.round(r*100)}%</th>)}</tr></thead>
                <tbody>{[5,10,20].map(a=>(
                  <tr key={a} style={{textAlign:"right",borderTop:"1px solid var(--border)"}}><td style={{textAlign:"left",padding:"8px 0",fontWeight:800,color:"var(--text)"}}>{a} anni</td>
                    {arrivo.map(([n,r])=><td key={n} style={{padding:"8px 0",color:"var(--text)",fontWeight:700}}>{eur(fv(pac,r,a))}</td>)}</tr>))}</tbody>
              </table>
            </div>
            <div style={{color:"var(--muted)",fontSize:12.5,marginTop:6}}>Versati in totale in 10 anni: {eur(pac*120)}. Simulazioni, non promesse.</div>
          </div>

          <div style={card}>
            <div style={eyebrow}>2 · Fondo di emergenza</div>
            <h3 style={{fontWeight:900,fontSize:20,color:"var(--text)",margin:"2px 0 6px"}}>La tua rete di sicurezza</h3>
            <p style={{color:"var(--muted)",fontSize:14,lineHeight:1.5,margin:"0 0 8px"}}>Il fondo consigliato cambia da persona a persona: lavoro autonomo o con più fonti instabili, persone a carico o una sola entrata lo portano da 2-3 a 5-6 mesi di spese.</p>
            <Riga k="Mesi di spese consigliati" v={c.mesi + " mesi"} /><Riga k="Fondo consigliato" v={eur(c.fondoTarget)} />
            <Riga k="Quello che hai" v={eur(c.fondo)} /><Riga k={c.fondo >= c.fondoTarget ? "Sei a posto ✅" : "Ti mancano"} v={c.fondo >= c.fondoTarget ? "—" : eur(c.fondoTarget - c.fondo)} forte />
            <div style={{height:10,borderRadius:99,background:"var(--border)",marginTop:10,overflow:"hidden"}}><div style={{width:Math.min(100, c.fondoTarget ? c.fondo/c.fondoTarget*100 : 0)+"%",height:"100%",background:"linear-gradient(90deg,var(--a1),var(--a2))"}} /></div>
          </div>

          <div style={card}>
            <div style={eyebrow}>3 · Consigli automatici</div>
            <h3 style={{fontWeight:900,fontSize:20,color:"var(--text)",margin:"2px 0 8px"}}>Cosa emerge dai tuoi numeri</h3>
            <div style={{display:"grid",gap:8}}>{consigli(s, c).map((x,i)=>(
              <div key={i} style={{display:"flex",gap:10,fontSize:14.5,lineHeight:1.5,color:"var(--text)"}}><div style={{fontSize:18}}>{x.t || "•"}</div><div>{x.x || x}</div></div>))}</div>
          </div>

          <div style={{...card,borderColor:"var(--a1)"}}>
            <div style={eyebrow}>4 · Il punto di arrivo</div>
            <h3 style={{fontWeight:900,fontSize:20,color:"var(--text)",margin:"2px 0 6px"}}>Il numero che ti permette di smettere di dipendere dallo stipendio</h3>
            <p style={{color:"var(--muted)",fontSize:14,lineHeight:1.5,margin:"0 0 8px"}}>I tuoi soldi investiti dovrebbero darti ogni anno almeno quanto spendi per vivere. Le tue spese annue oggi: <b style={{color:"var(--text)"}}>{eur(spese*12)}</b>. Ecco il capitale che servirebbe con tre ipotesi di rendimento e quanto ci metteresti con il tuo piano di accumulo.</p>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:14}}>
                <thead><tr style={{textAlign:"right",color:"var(--muted)"}}><th style={{textAlign:"left",padding:"6px 0"}}>Ipotesi</th><th>Capitale necessario</th><th>Tempo con il tuo piano ({eur(pac)}/mese)</th></tr></thead>
                <tbody>{arrivo.map(([n,r])=>(
                  <tr key={n} style={{textAlign:"right",borderTop:"1px solid var(--border)"}}><td style={{textAlign:"left",padding:"8px 0",fontWeight:800,color:"var(--text)"}}>{n} {Math.round(r*100)}%</td>
                    <td style={{color:"var(--text)",fontWeight:700}}>{eur(spese*12/r)}</td><td style={{color:"var(--text)",fontWeight:700}}>{txtAnni(anniPer(spese*12/r, pac, r))}</td></tr>))}</tbody>
              </table>
            </div>
            <div style={{...card,background:"var(--bg)",marginTop:14}}>
              <div style={{fontWeight:900,color:"var(--text)",marginBottom:4}}>E se avessi una seconda entrata?</div>
              <div style={{color:"var(--muted)",fontSize:14,marginBottom:8}}>Prova a inserire quanto in più potresti guadagnare ogni mese e metterlo interamente nel piano di accumulo.</div>
              <Campo label="Entrata extra al mese (€)"><Soldi value={s.second} onChange={v=>up({second:v})} /></Campo>
              {second > 0 && (
                <div>
                  <Riga k="Piano di accumulo con la seconda entrata" v={eur(pac + second) + " /mese"} />
                  {arrivo.map(([n,r])=>(
                    <Riga key={n} k={n + " " + Math.round(r*100) + "% — tempo per arrivare"} v={txtAnni(anniPer(spese*12/r, pac+second, r)) + (anniPer(spese*12/r, pac, r) != null && anniPer(spese*12/r, pac+second, r) != null ? " (−" + txtAnni(anniPer(spese*12/r, pac, r) - anniPer(spese*12/r, pac+second, r)) + ")" : "")} />))}
                </div>
              )}
            </div>
            <p style={{color:"var(--muted)",fontSize:12.5,lineHeight:1.5,marginTop:10}}>Simulazioni a scopo educativo: i rendimenti non sono garantiti e il risultato reale può essere diverso. Non è consulenza finanziaria.</p>
          </div>

          <div className="noprint" style={{...card,textAlign:"center"}}>
            <div style={eyebrow}>🎯 Percorso completato</div>
            <div style={{fontWeight:900,fontSize:20,color:"var(--text)",margin:"4px 0 6px"}}>Non lasciarlo qui</div>
            <div style={{color:"var(--muted)",fontSize:14,marginBottom:12}}>Salva la tua analisi completa e mandala alla tua upline: è il prossimo passo per costruire insieme il tuo piano.</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"center"}}>
              <button onClick={()=>window.print()} style={btnP}>📤 Salva PDF</button>
              <button onClick={copia} style={btnG}>📋 Copia riepilogo</button>
              {onDone && <button onClick={()=>{onDone();onBack();}} style={btnG}>✓ Esercizio completato</button>}
            </div>
          </div>
        </div>
      )}

      {s.step>1 && (
        <div className="noprint" style={{display:"flex",gap:10,justifyContent:"space-between",marginTop:16}}>
          <button onClick={()=>vai(s.step-1)} style={btnG}>← Indietro</button>
          {s.step<6 && <button disabled={!puoi} onClick={()=>vai(s.step+1)} style={{...btnP,opacity:puoi?1:.4,cursor:puoi?"pointer":"not-allowed"}}>Continua →</button>}
          {s.step===6 && <button onClick={()=>setS(VUOTO)} style={{...btnG,color:"var(--muted)"}}>Ricomincia da capo</button>}
        </div>
      )}
    </div>
  );
}
