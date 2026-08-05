import { useState, useEffect, useMemo } from "react";

// ============ Coordinate contorno Italia (lon,lat) — semplificato ma proporzionato ============
const CONTINENTE = [
  [7.55,44.39],[6.75,44.9],[6.9,45.1],[7.0,45.5],[7.32,45.74],[8.0,45.95],[8.8,46.0],
  [9.87,46.17],[10.45,46.5],[11.12,46.07],[11.35,46.5],[12.2,46.14],[13.2,46.06],
  [13.77,45.65],[13.6,45.4],[12.33,45.44],[12.2,44.4],[12.57,44.06],[13.5,43.6],
  [14.21,42.46],[14.99,42.0],[15.9,41.9],[16.87,41.12],[17.94,40.63],[18.5,40.15],
  [17.9,39.8],[17.24,40.47],[16.6,39.4],[17.13,39.08],[16.5,38.4],[15.9,38.2],
  [15.65,38.11],[15.63,40.08],[14.77,40.68],[14.25,40.85],[13.9,41.0],[13.6,41.2],
  [12.3,41.7],[11.8,42.1],[11.1,42.6],[10.3,43.5],[9.8,44.1],[8.9,44.4],[7.55,44.39],
];
const SICILIA = [
  [15.55,38.19],[15.28,37.9],[15.09,37.5],[15.28,37.07],[14.73,36.93],[13.9,37.0],
  [13.58,37.31],[12.7,37.6],[12.51,38.02],[12.9,38.05],[13.36,38.12],[14.3,38.15],[15.55,38.19],
];
const SARDEGNA = [
  [9.12,39.22],[8.4,39.1],[8.44,39.6],[8.32,40.56],[8.6,40.9],[9.51,40.92],[9.7,40.5],
  [9.66,40.0],[9.5,39.3],[9.12,39.22],
];

// proiezione equirettangolare semplice, calibrata sull'Italia
const LON_MIN = 6.6, LON_MAX = 18.6, LAT_MIN = 36.5, LAT_MAX = 47.2;
const MAPW = 560, MAPH = 720;
const LAT_MID_COS = Math.cos(42 * Math.PI/180);
function project([lon,lat]) {
  const x = (lon - LON_MIN) / (LON_MAX - LON_MIN) * MAPW;
  const y = (LAT_MAX - lat) / (LAT_MAX - LAT_MIN) * MAPH;
  return [x,y];
}
function pathOf(coords) { return coords.map(project).map(([x,y],i)=>(i===0?"M":"L")+x.toFixed(1)+","+y.toFixed(1)).join(" ") + " Z"; }

// ============ Tabella città -> coordinate (lon,lat) — capoluoghi + città principali ============
const CITTA_COORDS = {
  "TORINO":[7.68,45.07],"MILANO":[9.19,45.46],"GENOVA":[8.93,44.41],"VENEZIA":[12.33,45.44],
  "TRIESTE":[13.77,45.65],"BOLOGNA":[11.34,44.49],"FIRENZE":[11.26,43.77],"PERUGIA":[12.39,43.11],
  "ANCONA":[13.5,43.62],"ROMA":[12.5,41.9],"NAPOLI":[14.25,40.85],"BARI":[16.87,41.12],
  "POTENZA":[15.8,40.64],"CATANZARO":[16.6,38.91],"PALERMO":[13.36,38.12],"CAGLIARI":[9.12,39.22],
  "AOSTA":[7.32,45.74],"TRENTO":[11.12,46.07],"BOLZANO":[11.35,46.5],"L'AQUILA":[13.4,42.35],
  "AQUILA":[13.4,42.35],"CAMPOBASSO":[14.66,41.56],
  "BERGAMO":[9.67,45.7],"BRESCIA":[10.21,45.54],"COMO":[9.08,45.81],"CREMONA":[10.02,45.13],
  "MANTOVA":[10.79,45.16],"PAVIA":[9.16,45.18],"VARESE":[8.82,45.82],"LECCO":[9.4,45.85],
  "MONZA":[9.27,45.58],"SONDRIO":[9.87,46.17],"LODI":[9.5,45.31],
  "VERONA":[10.99,45.44],"PADOVA":[11.88,45.41],"VICENZA":[11.55,45.55],"TREVISO":[12.24,45.67],
  "ROVIGO":[11.79,45.07],"BELLUNO":[12.22,46.14],"UDINE":[13.24,46.06],"PORDENONE":[12.66,45.96],
  "GORIZIA":[13.62,45.94],
  "PIACENZA":[9.69,45.05],"PARMA":[10.33,44.8],"REGGIO EMILIA":[10.63,44.7],"MODENA":[10.93,44.65],
  "FERRARA":[11.62,44.84],"RAVENNA":[12.2,44.42],"FORLI":[12.04,44.22],"FORLÌ":[12.04,44.22],
  "RIMINI":[12.57,44.06],
  "LA SPEZIA":[9.83,44.11],"SAVONA":[8.48,44.31],"IMPERIA":[8.03,43.89],
  "LUCCA":[10.5,43.84],"PISA":[10.4,43.72],"LIVORNO":[10.31,43.55],"SIENA":[11.33,43.32],
  "AREZZO":[11.88,43.46],"GROSSETO":[11.11,42.76],"PISTOIA":[10.92,43.93],"PRATO":[11.1,43.88],
  "MASSA":[10.14,44.03],
  "TERNI":[12.65,42.56],"PESARO":[12.91,43.91],"URBINO":[12.63,43.73],"MACERATA":[13.45,43.3],
  "ASCOLI PICENO":[13.58,42.85],
  "LATINA":[12.9,41.47],"FROSINONE":[13.35,41.64],"VITERBO":[12.11,42.42],"RIETI":[12.86,42.4],
  "PESCARA":[14.21,42.46],"CHIETI":[14.17,42.35],"TERAMO":[13.7,42.66],
  "CASERTA":[14.33,41.07],"SALERNO":[14.77,40.68],"AVELLINO":[14.79,40.91],"BENEVENTO":[14.78,41.13],
  "FOGGIA":[15.55,41.46],"TARANTO":[17.24,40.47],"BRINDISI":[17.94,40.63],"LECCE":[18.17,40.35],
  "BARLETTA":[16.28,41.32],"ANDRIA":[16.3,41.23],"TRANI":[16.42,41.27],
  "MATERA":[16.6,40.67],
  "REGGIO CALABRIA":[15.65,38.11],"COSENZA":[16.25,39.3],"CROTONE":[17.13,39.08],
  "VIBO VALENTIA":[16.1,38.68],
  "MESSINA":[15.55,38.19],"CATANIA":[15.09,37.5],"SIRACUSA":[15.28,37.07],"RAGUSA":[14.73,36.93],
  "TRAPANI":[12.51,38.02],"AGRIGENTO":[13.58,37.31],"CALTANISSETTA":[14.06,37.49],"ENNA":[14.28,37.57],
  "SASSARI":[8.56,40.73],"NUORO":[9.33,40.32],"ORISTANO":[8.59,39.9],"OLBIA":[9.51,40.92],
  "CUNEO":[7.55,44.39],"ALESSANDRIA":[8.62,44.91],"ASTI":[8.21,44.9],"NOVARA":[8.62,45.45],
  "VERBANIA":[8.55,45.92],"BIELLA":[8.06,45.57],"VERCELLI":[8.42,45.32],
  "RAVENA":[12.2,44.42],"MILANO CITY":[9.19,45.46],
  "MESTRE":[12.24,45.49],"IVREA":[7.87,45.47],"ALBENGA":[8.21,44.05],"DESENZANO DEL GARDA":[10.53,45.47],
  "UMBERTIDE":[12.34,43.3],"TOLMEZZO":[13.02,46.4],"SANZA":[15.53,40.3],"PACHINO":[15.09,36.72],
  "MANFREDONIA":[15.91,41.63],"FORMIA":[13.6,41.26],"AIROLE":[7.57,43.85],"SERSALE":[16.68,39.02],
  "SANT'AGATA DI MILITELLO":[14.63,38.07],"CASTELLAMMARE DI STABIA":[14.48,40.7],"AFRAGOLA":[14.31,40.92],
  "GIUGLIANO IN CAMPANIA":[14.2,40.93],"POZZUOLI":[14.12,40.82],"TORRE DEL GRECO":[14.37,40.78],
  "GUIDONIA MONTECELIO":[12.72,42.0],"FIUMICINO":[12.23,41.77],"ANZIO":[12.62,41.45],
  "CIVITAVECCHIA":[11.8,42.09],"ALBANO LAZIALE":[12.65,41.73],"MARINO":[12.66,41.77],
  "APRILIA":[12.65,41.59],"VELLETRI":[12.78,41.68],"CASSINO":[13.83,41.49],"GAETA":[13.57,41.22],
  "SABAUDIA":[13.03,41.3],"FONDI":[13.42,41.35],"MINTURNO":[13.75,41.25],
  "BUSTO ARSIZIO":[8.85,45.61],"LEGNANO":[8.91,45.6],"RHO":[9.04,45.53],"SESTO SAN GIOVANNI":[9.24,45.53],
  "CINISELLO BALSAMO":[9.22,45.55],"VIGEVANO":[8.86,45.32],"GALLARATE":[8.79,45.66],
  "CASSANO D'ADDA":[9.52,45.53],"MELEGNANO":[9.32,45.36],"SEREGNO":[9.2,45.65],
  "SALO":[10.52,45.6],"SALÒ":[10.52,45.6],"GARDONE VAL TROMPIA":[10.19,45.68],
  "MERANO":[11.16,46.67],"BRUNICO":[11.94,46.8],"CHIOGGIA":[12.28,45.22],"JESOLO":[12.64,45.53],
  "CONEGLIANO":[12.31,45.89],"BASSANO DEL GRAPPA":[11.73,45.77],"SCHIO":[11.35,45.71],
  "CARPI":[10.88,44.78],"SASSUOLO":[10.78,44.55],"FAENZA":[11.88,44.29],"CESENA":[12.24,44.14],
  "IMOLA":[11.71,44.35],"FIDENZA":[10.06,44.87],"FANO":[13.02,43.84],
  "VITERBO CITY":[12.11,42.42],"TARQUINIA":[11.76,42.25],"ORVIETO":[12.11,42.72],
  "FOLIGNO":[12.7,42.95],"SPOLETO":[12.74,42.73],"ASSISI":[12.62,43.07],
  "AVEZZANO":[13.42,42.03],"SULMONA":[13.93,42.05],"LANCIANO":[14.39,42.23],"VASTO":[14.71,42.11],
  "TERMOLI":[14.99,42.0],"ISERNIA":[14.23,41.6],
  "ACERRA":[14.37,40.94],"NOLA":[14.53,40.92],"SORRENTO":[14.38,40.63],"AMALFI":[14.6,40.63],
  "CAVA DE' TIRRENI":[14.7,40.7],"NOCERA INFERIORE":[14.64,40.74],"BATTIPAGLIA":[14.98,40.61],
  "EBOLI":[15.05,40.62],"SAPRI":[15.63,40.08],"VALLO DELLA LUCANIA":[15.25,40.24],
  "MOLFETTA":[16.6,41.2],"BISCEGLIE":[16.51,41.24],"ALTAMURA":[16.55,40.83],"BITONTO":[16.7,41.11],
  "MARTINA FRANCA":[17.34,40.71],"FASANO":[17.36,40.84],"OSTUNI":[17.58,40.73],"GALLIPOLI":[17.99,40.06],
  "NARDO":[18.03,40.18],"NARDÒ":[18.03,40.18],"CASARANO":[18.17,40.01],
  "MATERA CITY":[16.6,40.67],"POLICORO":[16.67,40.21],
  "VIBO VALENTIA CITY":[16.1,38.68],"LAMEZIA TERME":[16.31,38.96],"ROSSANO":[16.64,39.58],
  "CORIGLIANO CALABRO":[16.52,39.6],"CASTROVILLARI":[16.2,39.81],"CROTONE CITY":[17.13,39.08],
  "GIOIA TAURO":[15.9,38.42],"PALMI":[15.85,38.36],
  "ACIREALE":[15.16,37.6],"GELA":[14.24,37.07],"MARSALA":[12.43,37.8],"MAZARA DEL VALLO":[12.59,37.65],
  "BAGHERIA":[13.5,38.08],"CALTAGIRONE":[14.52,37.24],"MODICA":[14.77,36.85],"VITTORIA":[14.53,36.95],
  "MILAZZO":[15.24,38.22],"BARCELLONA POZZO DI GOTTO":[15.22,38.15],
  "QUARTU SANT'ELENA":[9.22,39.24],"ALGHERO":[8.32,40.56],"CARBONIA":[8.52,39.17],"IGLESIAS":[8.53,39.31],
};
function normCitta(raw) {
  if (!raw) return "";
  let s = raw.trim().toUpperCase();
  s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // via accenti
  s = s.replace(/\s*\([A-Z]{2}\)\s*$/,""); // "Milano (MI)"
  s = s.replace(/\s+[A-Z]{2}$/,""); // "Milano MI"
  s = s.replace(/[.,]/g,"").trim();
  s = s.replace(/\s+/g," ");
  return s;
}
function coordOf(rawCitta) {
  const n = normCitta(rawCitta);
  if (CITTA_COORDS[n]) return CITTA_COORDS[n];
  // prova solo la prima parola (es. "Milano Loreto" -> "Milano")
  const first = n.split(" ")[0];
  if (CITTA_COORDS[first]) return CITTA_COORDS[first];
  return null;
}

const LAYERS = {
  attivi:     { label:"Attivi del team",       color:"#3b82f6" },
  ticket:     { label:"Ticket Mastery",        color:"#10b981" },
  iscrizioni: { label:"Iscrizioni ciclo corr.",color:"#ef4444" },
};

function aggregaPerCitta(rows) {
  // rows: [{citta,cnt}] con nomi grezzi dal DB -> raggruppa per città NORMALIZZATA e trova coordinate
  const acc = {}; const nonRiconosciute = [];
  (rows||[]).forEach(r => {
    const coord = coordOf(r.citta);
    if (!coord) { nonRiconosciute.push(r.citta+" ("+r.cnt+")"); return; }
    const key = coord.join(",");
    if (!acc[key]) acc[key] = { coord, citta:r.citta, cnt:0 };
    acc[key].cnt += Number(r.cnt)||0;
  });
  return { punti: Object.values(acc), nonRiconosciute };
}

function ClassificaBox({ titolo, colore, righe, unita }) {
  return (
    <div style={{ background:"var(--bg3)", border:"1px solid var(--border2)", borderRadius:12, padding:"1rem" }}>
      <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:10 }}>
        <span style={{ width:9, height:9, borderRadius:"50%", background:colore, display:"inline-block" }} />
        <div style={{ fontWeight:800, fontSize:12, color:"var(--text)" }}>{titolo}</div>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
        {righe.map((r,i)=>(
          <div key={i} style={{ display:"flex", alignItems:"center", gap:8, fontSize:12 }}>
            <span style={{ width:16, color:"var(--border2)", fontWeight:700 }}>{i+1}</span>
            <span style={{ flex:1, color:"var(--text)", fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{r.citta}</span>
            <span style={{ fontWeight:800, color:colore }}>{r.cnt} <span style={{fontWeight:600,color:"var(--muted)",fontSize:10}}>{unita}</span></span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MappaSezione({ auth, eventi, sbGetMappaAttivi, sbGetMappaTicket, sbGetMappaIscrizioni, sfidaStart, sfidaEnd, showToast }) {
  const [attivi, setAttivi] = useState([]);
  const [ticket, setTicket] = useState([]);
  const [iscrizioni, setIscrizioni] = useState([]);
  const [attivo, setAttivo] = useState({ attivi:true, ticket:true, iscrizioni:true });
  const [loading, setLoading] = useState(true);
  const [ticketEventoId, setTicketEventoId] = useState("");
  const [hover, setHover] = useState(null);

  useEffect(() => {
    if (!eventi || eventi.length===0 || ticketEventoId) return;
    const mastery = eventi.find(e => (e.nome||"").toLowerCase().includes("mastery"));
    setTicketEventoId(mastery ? mastery.id : eventi[0].id);
  }, [eventi]);

  useEffect(() => {
    if (!auth) return;
    setLoading(true);
    Promise.all([
      sbGetMappaAttivi(auth.token).catch(()=>[]),
      ticketEventoId ? sbGetMappaTicket(auth.token, ticketEventoId).catch(()=>[]) : Promise.resolve([]),
      sbGetMappaIscrizioni(auth.token, sfidaStart, sfidaEnd).catch(()=>[]),
    ]).then(([a,t,i]) => { setAttivi(a||[]); setTicket(t||[]); setIscrizioni(i||[]); })
      .catch(e=>showToast && showToast("Errore mappa: "+e.message,"#ef4444"))
      .finally(()=>setLoading(false));
  }, [auth, ticketEventoId]);

  const datiAttivi = useMemo(()=>aggregaPerCitta(attivi), [attivi]);
  const datiTicket = useMemo(()=>aggregaPerCitta(ticket), [ticket]);
  const datiIscrizioni = useMemo(()=>aggregaPerCitta(iscrizioni), [iscrizioni]);

  const maxCnt = Math.max(1, ...datiAttivi.punti.map(p=>p.cnt), ...datiTicket.punti.map(p=>p.cnt), ...datiIscrizioni.punti.map(p=>p.cnt));
  function radiusOf(cnt) { return 5 + Math.sqrt(cnt/maxCnt) * 22; }

  // classifica testuale (più facile da leggere dei soli pallini)
  function top(punti, n=8) { return [...punti].sort((a,b)=>b.cnt-a.cnt).slice(0,n); }
  const topAttivi = top(datiAttivi.punti);
  const topTicket = top(datiTicket.punti);
  const topIscrizioni = top(datiIscrizioni.punti);

  // etichetta solo le città più rilevanti per non affollare la mappa
  const soglieEtichetta = { attivi: [...datiAttivi.punti].sort((a,b)=>b.cnt-a.cnt)[9]?.cnt ?? 0 };

  const nonRiconosciuteTot = [...new Set([...datiAttivi.nonRiconosciute, ...datiTicket.nonRiconosciute, ...datiIscrizioni.nonRiconosciute])];

  return (
    <div style={{ padding: "2rem 2.2rem", maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontWeight: 900, fontSize: 30, color: "var(--text)", letterSpacing: -0.8 }}>🗺️ Mappa del team</h1>
        <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 6 }}>Dove si concentrano attivi, ticket e nuove iscrizioni — a livello di tutta Digital Legacy, aiuta a scegliere le tappe del tour.</p>
      </div>
      <div style={{ background:"var(--bg2)", border:"1px solid var(--border)", borderRadius:16, padding:"1.4rem" }}>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", flexWrap:"wrap", gap:14, marginBottom:16 }}>
        <div>
          <div style={{ fontSize:14, fontWeight:800, color:"var(--text)" }}> Livelli</div>
          <div style={{ fontSize:11, color:"var(--muted)", marginTop:2 }}>Accendi/spegni le caselle per confrontare le zone</div>
        </div>
        <div style={{ display:"flex", gap:14, flexWrap:"wrap", alignItems:"center" }}>
          {Object.entries(LAYERS).map(([k,l])=>(
            <label key={k} style={{ display:"flex", alignItems:"center", gap:6, cursor:"pointer", fontSize:12, fontWeight:700, color: attivo[k]?l.color:"var(--muted)" }}>
              <input type="checkbox" checked={attivo[k]} onChange={e=>setAttivo(a=>({...a,[k]:e.target.checked}))} style={{ width:15, height:15, cursor:"pointer", accentColor:l.color }} />
              <span style={{ width:9, height:9, borderRadius:"50%", background:l.color, display:"inline-block" }} />
              {l.label}
            </label>
          ))}
          {attivo.ticket && eventi && eventi.length>1 && (
            <select value={ticketEventoId} onChange={e=>setTicketEventoId(e.target.value)} style={{ width:"auto", fontSize:11, padding:"5px 9px" }}>
              {eventi.map(ev=><option key={ev.id} value={ev.id}>{ev.nome}</option>)}
            </select>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ padding:"3rem", textAlign:"center", color:"var(--border2)", fontSize:13 }}>Carico la mappa...</div>
      ) : (
        <div style={{ display:"flex", gap:24, flexWrap:"wrap", justifyContent:"center", alignItems:"flex-start" }}>
          <div style={{ position:"relative", flex:"0 0 auto" }}>
            <svg viewBox={"0 0 "+MAPW+" "+MAPH} width={MAPW} height={MAPH} style={{ background:"#050912", borderRadius:12, border:"1px solid var(--border2)", maxWidth:"100%" }}>
              <path d={pathOf(CONTINENTE)} fill="#101a2e" stroke="#22314f" strokeWidth="1.4" />
              <path d={pathOf(SICILIA)} fill="#101a2e" stroke="#22314f" strokeWidth="1.4" />
              <path d={pathOf(SARDEGNA)} fill="#101a2e" stroke="#22314f" strokeWidth="1.4" />
              {attivo.attivi && datiAttivi.punti.map((p,i)=>{
                const [x,y]=project(p.coord);
                const grande = p.cnt >= (soglieEtichetta.attivi||0);
                return (
                  <g key={"a"+i} onMouseEnter={()=>setHover({x,y,label:p.citta+": "+p.cnt+" attivi"})} onMouseLeave={()=>setHover(null)} style={{cursor:"pointer"}}>
                    <circle cx={x} cy={y} r={radiusOf(p.cnt)} fill={LAYERS.attivi.color} fillOpacity="0.4" stroke={LAYERS.attivi.color} strokeWidth="1.6" />
                    {grande && <text x={x+radiusOf(p.cnt)+4} y={y+3} fontSize="10" fontWeight="700" fill="#cfe0ff">{p.citta}</text>}
                  </g>
                );
              })}
              {attivo.ticket && datiTicket.punti.map((p,i)=>{
                const [x,y]=project(p.coord);
                return (
                  <g key={"t"+i} onMouseEnter={()=>setHover({x,y,label:p.citta+": "+p.cnt+" ticket"})} onMouseLeave={()=>setHover(null)} style={{cursor:"pointer"}}>
                    <circle cx={x} cy={y} r={radiusOf(p.cnt)*0.7} fill={LAYERS.ticket.color} fillOpacity="0.55" stroke={LAYERS.ticket.color} strokeWidth="1.6" />
                  </g>
                );
              })}
              {attivo.iscrizioni && datiIscrizioni.punti.map((p,i)=>{
                const [x,y]=project(p.coord);
                return (
                  <g key={"i"+i} onMouseEnter={()=>setHover({x,y,label:p.citta+": "+p.cnt+" iscritti"})} onMouseLeave={()=>setHover(null)} style={{cursor:"pointer"}}>
                    <circle cx={x} cy={y} r={radiusOf(p.cnt)*0.55} fill={LAYERS.iscrizioni.color} fillOpacity="0.7" stroke={LAYERS.iscrizioni.color} strokeWidth="1.6" />
                  </g>
                );
              })}
              {hover && (
                <g>
                  <rect x={hover.x+8} y={hover.y-24} width={hover.label.length*6.6+16} height={24} rx={6} fill="#000000ee" />
                  <text x={hover.x+16} y={hover.y-8} fontSize="12" fill="#fff" fontWeight="700">{hover.label}</text>
                </g>
              )}
            </svg>
            <div style={{ fontSize:10, color:"var(--border2)", marginTop:6, textAlign:"center" }}>Mappa semplificata, non in scala geografica esatta — passa il mouse sui pallini per i dettagli</div>
          </div>

          <div style={{ flex:"1 1 260px", minWidth:240, display:"flex", flexDirection:"column", gap:14 }}>
            {attivo.attivi && topAttivi.length>0 && (
              <ClassificaBox titolo="Città con più attivi" colore={LAYERS.attivi.color} righe={topAttivi} unita="attivi" />
            )}
            {attivo.ticket && topTicket.length>0 && (
              <ClassificaBox titolo="Città con più ticket" colore={LAYERS.ticket.color} righe={topTicket} unita="ticket" />
            )}
            {attivo.iscrizioni && topIscrizioni.length>0 && (
              <ClassificaBox titolo="Città con più iscrizioni" colore={LAYERS.iscrizioni.color} righe={topIscrizioni} unita="iscritti" />
            )}
            {nonRiconosciuteTot.length>0 && (
              <div style={{ background:"var(--bg3)", border:"1px solid var(--border2)", borderRadius:12, padding:"1rem", fontSize:11 }}>
                <div style={{ fontWeight:800, color:"var(--muted)", marginBottom:8, textTransform:"uppercase", letterSpacing:.5 }}>Città non riconosciute ({nonRiconosciuteTot.length})</div>
                <div style={{ color:"var(--border2)", lineHeight:1.7, maxHeight:180, overflowY:"auto" }}>
                  {nonRiconosciuteTot.map((c,i)=><div key={i}>{c}</div>)}
                </div>
                <div style={{ marginTop:8, color:"var(--muted)" }}>Scritte in modo diverso dal solito (refusi, comuni piccoli) — non compaiono sulla mappa.</div>
              </div>
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
