import { useState } from "react";

// % che XConnectly paga su ogni livello di profondità (solo affiliate contano come livello)
export const XC_CPA = 220; // $ una tantum per cliente eToro qualificato
export const XC_PERC = { 1:40, 2:20, 3:15, 4:15, 5:10 };

const card = { background:"var(--bg2)", border:"1px solid var(--border)", borderRadius:16 };
const inp  = { padding:"6px 8px", fontSize:12.5, borderRadius:8, minWidth:0 };

export default function XCView({ auth, allProfiles, downline, clienti, rows, onSave, spill, onSpill, leaderIds }) {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("tutti"); // tutti | affiliate | depositanti | controllare | spillover

  const nome = m => (((m.nome||m.email||"")+" "+(m.cognome||"")).trim()) || "—";
  const byId = {};
  (allProfiles||[]).forEach(p => { byId[p.id] = { id:p.id, nome:nome(p), sponsor:p.upline_id||p.positioned_under||null }; });
  (downline||[]).forEach(p => { byId[p.id] = { id:p.id, nome:nome(p), sponsor:p.upline_id||p.positioned_under||null }; });
  (clienti||[]).forEach(c => { byId[c.id] = { id:c.id, nome:nome(c), sponsor:c.positionedUnder||null }; });
  byId[auth.userId] = byId[auth.userId] || { id:auth.userId, nome:"Tu", sponsor:null };

  const parentOf = id => {
    const p = (allProfiles||[]).find(x=>x.id===id) || (downline||[]).find(x=>x.id===id);
    if (p) return p.positioned_under || p.upline_id || null;
    const c = (clienti||[]).find(x=>x.id===id);
    return c ? (c.positionedUnder||null) : null;
  };
  const marked = (mid, lid) => (spill||[]).some(x=>x.member_id===mid && x.leader_id===lid);
  // leader che stanno tra me e la persona (lungo il posizionamento)
  function leadersSotto(id) {
    const out = []; let cur = parentOf(id), g = 0;
    while (cur && cur !== auth.userId && g++ < 60) { if ((leaderIds||new Set()).has(cur)) out.push(cur); cur = parentOf(cur); }
    return out;
  }
  const rowOf = id => (rows||[]).find(r => r.member_id===id) || {};
  const isAff = id => id===auth.userId || !!rowOf(id).affiliate;

  const attivi = [
    ...(downline||[]).filter(m => m.attivo!==false),
    ...(clienti||[]).filter(c => c.attivo!==false),
  ].filter((m,i,a) => m.id!==auth.userId && a.findIndex(x=>x.id===m.id)===i);

  // livello atteso: conto solo gli affiliate tra me e il depositante, lungo la linea di sponsorizzazione
  function livello(id) {
    let cur = byId[id]?.sponsor, steps = 0, between = 0, guard = 0;
    const chain = [];
    while (cur && guard++ < 60) {
      steps++;
      if (cur === auth.userId) return { ok:true, nominale:steps, atteso:1+between, chain };
      const n = byId[cur]; if (!n) break;
      chain.push(n.nome + (isAff(cur) ? " (affiliate)" : ""));
      if (isAff(cur)) between++;
      cur = n.sponsor;
    }
    return { ok:false };
  }

  const list = attivi.map(m => {
    const r = rowOf(m.id);
    const dep = !!(r.etoro || r.broker);
    const lv = livello(m.id);
    const diverso = dep && lv.ok && lv.nominale !== lv.atteso;
    const sotto = leadersSotto(m.id);
    const passato = sotto.length>0 && sotto.every(l=>marked(m.id,l));   // i leader sotto di me l'hanno passato a me
    // "in mano a": il primo leader (dal basso) che non l'ha passato su
    const inMano = sotto.find(l=>!marked(m.id,l)) || null;
    const mioSpill = marked(m.id, auth.userId);
    return { m, r, dep, lv, diverso, sotto, passato, inMano, mioSpill };
  });

  const attiviLista = list.filter(x=>!x.mioSpill);
  const nSpill = list.filter(x=>x.mioSpill).length;
  const nAff  = attiviLista.filter(x=>x.r.affiliate).length;
  const quota = x => (x.lv.ok && x.lv.atteso<=5) ? XC_CPA*XC_PERC[x.lv.atteso]/100 : 0;
  const etDaPagare = attiviLista.filter(x=>x.r.etoro && !x.r.etoro_pagato);
  const etPagati   = attiviLista.filter(x=>x.r.etoro && x.r.etoro_pagato);
  const nEt   = etDaPagare.length;
  const eurDa = etDaPagare.reduce((a,x)=>a+quota(x),0);
  const eurIn = etPagati.reduce((a,x)=>a+quota(x),0);
  const fmt$ = n => "$"+(Math.round(n*100)/100).toLocaleString("it-IT");
  const nBr   = attiviLista.filter(x=>x.r.broker).length;
  const nCtrl = attiviLista.filter(x=>x.diverso).length;

  const ql = q.trim().toLowerCase();
  const shown = (tab==="spillover" ? list.filter(x=>x.mioSpill) : attiviLista).filter(x =>
    (!ql || nome(x.m).toLowerCase().includes(ql) || (x.r.email||"").toLowerCase().includes(ql)) &&
    (tab==="tutti" || tab==="spillover" || (tab==="affiliate" && x.r.affiliate) || (tab==="depositanti" && x.dep) || (tab==="controllare" && x.diverso))
  ).sort((a,b)=> (b.dep-a.dep) || nome(a.m).localeCompare(nome(b.m)));

  // ---------- REPORT (solo eToro: il broker paga sul volume e non si può controllare) ----------
  const perc = l => XC_PERC[l] || 0;
  const usd = n => "$"+(Math.round(n*100)/100).toLocaleString("it-IT");
  const dataIt = d => { if(!d) return "—"; const [y,m,g]=String(d).split("-"); return g&&m&&y ? g+"/"+m+"/"+y : d; };
  function costruisciReport() {
    const righe = attiviLista.filter(x=>x.r.etoro && x.lv.ok).map(x=>{
      const atteso = x.lv.atteso, qAtt = atteso<=5 ? XC_CPA*perc(atteso)/100 : 0;
      const lp = x.r.etoro_livello_pagato ? Number(x.r.etoro_livello_pagato) : null;
      const qPag = lp ? XC_CPA*perc(lp)/100 : null;
      const mancano = (x.r.etoro_pagato && lp && qPag < qAtt) ? qAtt - qPag : 0;
      const sbagliato = !!(x.r.etoro_pagato && lp && lp !== atteso);
      return { nome:nome(x.m), email:x.r.email||"", data:x.r.etoro_data||"", pagato:!!x.r.etoro_pagato, lp, atteso, nominale:x.lv.nominale, qAtt, qPag, mancano, sbagliato,
               mancaLivello: !!(x.r.etoro_pagato && !lp) };
    });
    const gruppi = [1,2,3,4,5,6].map(l=>({ l, righe: righe.filter(r=> (r.atteso<=5?r.atteso:6)===l).sort((a,b)=>String(a.data).localeCompare(String(b.data))) }));
    const pagati = righe.filter(r=>r.pagato), daPagare = righe.filter(r=>!r.pagato), sbagl = righe.filter(r=>r.sbagliato);
    return {
      leader: (byId[auth.userId]?.nome && byId[auth.userId].nome!=="Tu") ? byId[auth.userId].nome : (auth.profile ? nome(auth.profile) : "Leader"),
      oggi: new Date().toLocaleDateString("it-IT"),
      righe, gruppi, pagati, daPagare, sbagl,
      totAtteso: righe.reduce((a,r)=>a+r.qAtt,0),
      totDaPagare: daPagare.reduce((a,r)=>a+r.qAtt,0),
      totPagatoAtteso: pagati.reduce((a,r)=>a+r.qAtt,0),
      totMancano: sbagl.reduce((a,r)=>a+r.mancano,0),
      senzaLivello: righe.filter(r=>r.mancaLivello).length,
      nBroker: attiviLista.filter(x=>x.r.broker).length,
      nSpill: list.filter(x=>x.mioSpill || !x.lv.ok).filter(x=>x.r.etoro).length,
    };
  }
  const esc = t => String(t==null?"":t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  const livTit = l => l<=5 ? "Livello "+l+" · "+perc(l)+"%" : "Oltre il livello 5 · non pagato";
  function testoReport(R) {
    let t = "Verifica pagamenti eToro (CPA) – "+R.leader+" – "+R.oggi+"\n\n";
    t += "Buongiorno, vi scrivo per verificare i pagamenti eToro del mio account. Di seguito i clienti con deposito, il livello a cui dovrebbero essere pagati secondo la struttura (contando solo gli affiliate tra me e il cliente) e, dove già pagati, il livello con cui li ho ricevuti.\n\n";
    R.gruppi.forEach(g=>{ if(!g.righe.length) return;
      t += livTit(g.l).toUpperCase()+" ("+g.righe.length+")\n";
      g.righe.forEach(r=>{
        t += "- "+r.nome+" – "+(r.email||"email mancante")+" – deposito "+dataIt(r.data)+" – ";
        t += r.pagato ? ("PAGATO"+(r.lp?" a livello "+r.lp:" (livello non indicato)")+(r.sbagliato?" – ERRORE: doveva essere livello "+r.atteso+(r.mancano?" (differenza "+usd(r.mancano)+")":""):"")) : "NON ANCORA PAGATO (dovuto: livello "+r.atteso+")";
        t += "\n";
      });
      t += "\n";
    });
    t += "RIEPILOGO: "+R.righe.length+" depositi eToro, "+R.pagati.length+" pagati, "+R.daPagare.length+" non ancora pagati ("+usd(R.totDaPagare)+" dovuti). ";
    if (R.sbagl.length) t += R.sbagl.length+" pagati a un livello diverso da quello corretto (differenza "+usd(R.totMancano)+"). ";
    t += "\n\nVi chiedo di controllare e riallineare i pagamenti. Grazie.";
    return t;
  }
  function htmlReport(R) {
    const css = "body{font-family:Arial,Helvetica,sans-serif;color:#14162e;margin:28px;font-size:12px}h1{font-size:22px;margin:0 0 4px}h2{font-size:15px;margin:22px 0 6px;color:#4f46e5}.sub{color:#555;margin-bottom:14px}.box{display:flex;gap:10px;margin:14px 0}.c{flex:1;border:1px solid #d6d3f0;border-radius:8px;padding:8px 10px}.c b{display:block;font-size:18px}table{width:100%;border-collapse:collapse;margin-bottom:6px}th,td{text-align:left;padding:5px 6px;border-bottom:1px solid #e5e5ef;vertical-align:top}th{font-size:10px;text-transform:uppercase;color:#666}.ok{color:#0b7a55;font-weight:bold}.no{color:#b45309;font-weight:bold}.err{color:#b91c1c;font-weight:bold}.note{color:#555;font-size:11px;margin-top:14px}@media print{body{margin:12mm}}";
    let h = "<!doctype html><html><head><meta charset='utf-8'><title>Report XC – "+esc(R.leader)+"</title><style>"+css+"</style></head><body>";
    h += "<h1>Report XC · pagamenti eToro</h1><div class='sub'>"+esc(R.leader)+" · "+esc(R.oggi)+"</div>";
    h += "<div class='box'><div class='c'>Depositi eToro<b>"+R.righe.length+"</b></div><div class='c'>Già pagati<b>"+R.pagati.length+"</b></div><div class='c'>Non ancora pagati<b>"+R.daPagare.length+"</b>"+esc(usd(R.totDaPagare))+" dovuti</div><div class='c'>Pagati a livello sbagliato<b>"+R.sbagl.length+"</b>"+(R.sbagl.length?esc(usd(R.totMancano))+" di differenza":"")+"</div></div>";
    R.gruppi.forEach(g=>{
      if (g.l===6 && !g.righe.length) return;
      h += "<h2>"+esc(livTit(g.l))+" – "+g.righe.length+(g.righe.length===1?" persona":" persone")+"</h2>";
      if(!g.righe.length){ h += "<div class='sub'>Nessuno a questo livello.</div>"; return; }
      h += "<table><tr><th>Persona</th><th>Email</th><th>Deposito</th><th>Stato</th><th>Pagato a</th><th>Dovuto</th></tr>";
      g.righe.forEach(r=>{
        h += "<tr><td>"+esc(r.nome)+"</td><td>"+esc(r.email||"manca")+"</td><td>"+esc(dataIt(r.data))+"</td><td class='"+(r.pagato?"ok":"no")+"'>"+(r.pagato?"Pagato":"Da pagare")+"</td><td class='"+(r.sbagliato?"err":"")+"'>"+(r.pagato?(r.lp?"L"+r.lp:"non indicato"):"—")+(r.sbagliato&&r.mancano?" (−"+esc(usd(r.mancano))+")":"")+"</td><td>"+(r.atteso<=5?"L"+r.atteso+" · "+esc(usd(r.qAtt)):"—")+"</td></tr>";
      });
      h += "</table>";
    });
    h += "<div class='note'>Livello calcolato contando solo gli affiliate tra te e il cliente, lungo la linea di chi ha iscritto chi. "+(R.senzaLivello?R.senzaLivello+" pagamenti senza livello indicato. ":"")+(R.nSpill?R.nSpill+" depositi eToro esclusi perché spillover. ":"")+(R.nBroker?R.nBroker+" depositi broker non inclusi (pagano sul volume).":"")+"</div></body></html>";
    return h;
  }
  const [copiato, setCopiato] = useState(false);
  function scaricaPdf() {
    const w = window.open("", "_blank");
    if (!w) { window.alert("Il browser ha bloccato la finestra: consenti i popup per questo sito e riprova."); return; }
    w.document.open(); w.document.write(htmlReport(costruisciReport())); w.document.close();
    setTimeout(()=>{ try { w.focus(); w.print(); } catch(e){} }, 400);
  }
  async function copiaEmail() {
    const t = testoReport(costruisciReport());
    try { await navigator.clipboard.writeText(t); }
    catch(e) { const ta=document.createElement("textarea"); ta.value=t; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta); }
    setCopiato(true); setTimeout(()=>setCopiato(false),2500);
  }

  const save = (id, patch) => onSave(id, { ...rowOf(id), ...patch });

  const stat = (l,v,c,sub) => <div style={{...card,padding:"14px 18px",minWidth:150,flex:"1 1 150px"}}><div style={{fontSize:10.5,fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:.8}}>{l}</div><div style={{fontSize:24,fontWeight:900,color:c||"var(--text)",marginTop:2}}>{v}</div>{sub && <div style={{fontSize:11,color:"var(--muted)",marginTop:1}}>{sub}</div>}</div>;

  // bottone on/off grande e chiaro
  const Toggle = ({ on, label, color, onClick }) => (
    <button onClick={onClick} style={{display:"inline-flex",alignItems:"center",gap:7,padding:"8px 14px",borderRadius:99,cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:700,
      border:"1.5px solid "+(on?color:"var(--border2)"),background:on?color+"1f":"var(--bg2)",color:on?color:"var(--muted)"}}>
      <span style={{width:16,height:16,borderRadius:99,border:"2px solid "+(on?color:"var(--border2)"),background:on?color:"transparent",color:"#fff",fontSize:10,lineHeight:"12px",textAlign:"center"}}>{on?"✓":""}</span>{label}
    </button>
  );

  return (
    <div className="page-wrap" style={{padding:"2rem 2.2rem",maxWidth:1100,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}>
        <h1 style={{fontWeight:900,fontSize:26,color:"var(--text)",letterSpacing:-.8}}>XC</h1>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <button onClick={scaricaPdf} style={{padding:"10px 16px",borderRadius:11,border:"none",cursor:"pointer",fontFamily:"inherit",fontWeight:700,fontSize:13,color:"#fff",background:"linear-gradient(135deg,var(--a1),var(--a2))"}}>{"📄 Report PDF"}</button>
          <button onClick={copiaEmail} style={{padding:"10px 16px",borderRadius:11,border:"1px solid var(--border2)",cursor:"pointer",fontFamily:"inherit",fontWeight:700,fontSize:13,color:"var(--text)",background:"var(--bg2)"}}>{copiato?"✓ Copiato":"📋 Copia per email"}</button>
        </div>
      </div>
      <div style={{...card,padding:"12px 16px",margin:"10px 0 16px",fontSize:13,color:"var(--text)",lineHeight:1.55}}>
        <b>Come si usa:</b> per ogni persona premi i bottoni che valgono.<br/>
        <b>Affiliate</b> = guadagna anche lui con XConnectly · <b>eToro</b> = ha depositato su eToro · <b>Broker</b> = ha depositato su un broker · <b>Spillover</b> = non l'ho iscritto io.<br/>
        A destra vedi <b>a che livello ti deve pagare XConnectly</b>: conta solo gli affiliate tra te e lui.
      </div>

      <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:16}}>
        {stat("Affiliate",nAff,"var(--a2)")}
        {stat("eToro da incassare",fmt$(eurDa),"#10b981",nEt+(nEt===1?" persona":" persone"))}
        {stat("eToro già incassato",fmt$(eurIn),"#059669",etPagati.length+(etPagati.length===1?" persona":" persone"))}
        {stat("Da controllare",nCtrl,nCtrl?"#d97706":"var(--muted)","livello diverso dal previsto")}
      </div>

      {nCtrl>0 && (
        <div style={{background:"#f59e0b14",border:"1px solid #f59e0b40",borderRadius:12,padding:"10px 14px",marginBottom:14,fontSize:13,color:"var(--text)"}}>
          {"⚠️ Controlla su XConnectly: "+nCtrl+(nCtrl===1?" persona dovrebbe essere pagata a un livello diverso da quello che sembra.":" persone dovrebbero essere pagate a un livello diverso da quello che sembra.")}
          {" "}<button onClick={()=>setTab("controllare")} style={{background:"none",border:"none",color:"var(--a2)",fontWeight:800,cursor:"pointer",fontFamily:"inherit",fontSize:13,textDecoration:"underline"}}>Mostrami</button>
        </div>
      )}

      <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center",marginBottom:14}}>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Cerca per nome o email..." style={{flex:"1 1 200px",minWidth:180}} />
        <div style={{display:"flex",background:"var(--bg3)",borderRadius:10,padding:4,border:"1px solid var(--border)",flexWrap:"wrap"}}>
          {[["tutti","Tutti"],["affiliate","Affiliate"],["depositanti","Hanno depositato"],["controllare","Da controllare"],["spillover","Spillover ("+nSpill+")"]].map(([k,l])=>(
            <button key={k} onClick={()=>setTab(k)} className="tabbtn"
              style={{background:tab===k?"var(--bg4)":"transparent",color:tab===k?"var(--a2)":"var(--muted)",boxShadow:tab===k?"inset 0 0 0 1px var(--sidebar-border)":"none",fontSize:11.5,padding:"6px 12px"}}>{l}</button>
          ))}
        </div>
      </div>

      {shown.length===0
        ? <div style={{...card,textAlign:"center",padding:"3rem",color:"var(--muted)",fontSize:14}}>Nessuno da mostrare qui</div>
        : <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {shown.map(({m,r,dep,lv,diverso,passato,sotto,inMano,mioSpill})=>(
              <div key={m.id} style={{...card,padding:"14px 16px",background:passato&&!mioSpill?"#facc1522":"var(--bg2)",borderColor:diverso?"#f59e0b66":"var(--border)"}}>
                <div style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap",alignItems:"flex-start"}}>
                  <div style={{minWidth:180}}>
                    <div style={{fontWeight:800,fontSize:15,color:"var(--text)"}}>{nome(m)}</div>
                    <div style={{fontSize:11.5,color:"var(--muted)"}}>{"iscritto da "+(byId[byId[m.id]?.sponsor]?.nome || "una persona fuori dal tuo team")}</div>
                    {!lv.ok && <div style={{fontSize:11.5,fontWeight:700,color:"#ea580c",marginTop:3}}>{"🟠 Probabile spillover"}</div>}
                    {inMano && !mioSpill && <div style={{fontSize:11.5,color:"var(--muted)",marginTop:3}}>{"in mano a "+(byId[inMano]?.nome||"—")}</div>}
                    {passato && !mioSpill && <div style={{fontSize:11.5,fontWeight:700,color:"#b45309",marginTop:3}}>{"🟡 Passato a te da "+sotto.map(l=>byId[l]?.nome||"—").join(", ")}</div>}
                  </div>
                  <div style={{textAlign:"right",minWidth:170}}>
                    {!dep ? <span style={{color:"var(--muted)",fontSize:12}}>Nessun deposito</span>
                     : !lv.ok ? <span style={{fontSize:12.5,fontWeight:700,color:"var(--muted)"}}>Non iscritto da te: non ti paga</span>
                     : <div>
                         <div style={{fontSize:15,fontWeight:900,color:lv.atteso<=5?"var(--text)":"var(--muted)"}}>
                           {lv.atteso<=5 ? "Livello "+lv.atteso+" · "+XC_PERC[lv.atteso]+"%" : "Oltre il livello 5: non paga"}
                         </div>
                         {diverso && <div style={{fontSize:12,fontWeight:700,color:"#b45309",marginTop:3}}>{"⚠️ Sembra livello "+lv.nominale+", ma deve essere pagato livello "+lv.atteso}</div>}
                       </div>}
                  </div>
                </div>

                <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:12}}>
                  <Toggle on={!!r.affiliate} label="Affiliate" color="#6d5efc" onClick={()=>save(m.id,{affiliate:!r.affiliate})} />
                  <Toggle on={!!r.etoro} label="Depositato eToro" color="#10b981" onClick={()=>save(m.id,{etoro:!r.etoro})} />
                  <Toggle on={!!r.broker} label="Depositato broker" color="#3b82f6" onClick={()=>save(m.id,{broker:!r.broker})} />
                  <Toggle on={mioSpill} label="Spillover" color="#ea580c" onClick={()=>{
                    if (mioSpill) onSpill(m.id,false);
                    else if (window.confirm("Sei sicuro che "+nome(m)+" sia spillover? Sparirà dalla tua lista e passerà al leader sopra di te.")) onSpill(m.id,true);
                  }} />
                </div>

                {(r.etoro || r.broker) && (
                  <div style={{display:"flex",gap:14,flexWrap:"wrap",marginTop:12,paddingTop:12,borderTop:"1px dashed var(--border)"}}>
                    <div style={{flex:"1 1 100%",display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                      <span style={{fontSize:12,fontWeight:800,color:r.email?"var(--muted)":"#dc2626"}}>{"📧 Email di registrazione"}</span>
                      <input type="email" defaultValue={r.email||""} placeholder="La mail usata su XConnectly / eToro" onBlur={e=>{ if(e.target.value.trim()!==(r.email||"")) save(m.id,{email:e.target.value.trim()||null}); }}
                        style={{...inp,flex:"1 1 260px",maxWidth:360,borderColor:r.email?undefined:"#dc2626"}} />
                      {!r.email && <span style={{fontSize:11.5,fontWeight:700,color:"#dc2626"}}>{"⚠️ Mettila: ti serve se apri un ticket"}</span>}
                    </div>
                    {r.etoro && (
                      <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                        <span style={{fontSize:12,fontWeight:800,color:"#059669"}}>eToro</span>
                        <input type="date" defaultValue={r.etoro_data||""} onBlur={e=>{ if((e.target.value||"")!==(r.etoro_data||"")) save(m.id,{etoro_data:e.target.value||null}); }} style={{...inp,width:145}} />
                        <Toggle on={!!r.etoro_pagato} label="💰 Già pagato" color="#059669" onClick={()=>save(m.id,{etoro_pagato:!r.etoro_pagato})} />
                        {r.etoro_pagato && (
                          <label style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:12,fontWeight:700,color:"var(--muted)"}}>
                            {"Pagato a livello"}
                            <select value={r.etoro_livello_pagato||""} onChange={e=>save(m.id,{etoro_livello_pagato:e.target.value?Number(e.target.value):null})} style={{...inp,width:90}}>
                              <option value="">—</option>
                              {[1,2,3,4,5].map(n=><option key={n} value={n}>{"L"+n}</option>)}
                            </select>
                          </label>
                        )}
                      </div>
                    )}
                    {r.broker && (
                      <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                        <span style={{fontSize:12,fontWeight:800,color:"#2563eb"}}>Broker</span>
                        <input defaultValue={r.broker_nome||""} placeholder="Quale broker?" onBlur={e=>{ if(e.target.value!==(r.broker_nome||"")) save(m.id,{broker_nome:e.target.value.trim()||null}); }} style={{...inp,width:140}} />
                        <input type="date" defaultValue={r.broker_data||""} onBlur={e=>{ if((e.target.value||"")!==(r.broker_data||"")) save(m.id,{broker_data:e.target.value||null}); }} style={{...inp,width:145}} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>}
    </div>
  );
}
