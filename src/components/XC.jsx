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
      <h1 style={{fontWeight:900,fontSize:26,color:"var(--text)",letterSpacing:-.8}}>XC</h1>
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
                    <div style={{fontSize:11.5,color:"var(--muted)"}}>{"iscritto da "+(byId[byId[m.id]?.sponsor]?.nome || "—")}</div>
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
