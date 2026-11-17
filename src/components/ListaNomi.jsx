import { useState, useEffect } from "react";

const SB_URL = "https://gyxvhnwzkhjrgpqvakfw.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd5eHZobnd6a2hqcmdwcXZha2Z3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5NTEzOTQsImV4cCI6MjA5OTUyNzM5NH0.aYAzw7j6YcBIWdBsdHq0ibZrjyyK5CZqNAcchfdQt0o";

export async function sbFetch(path, opts = {}) {
  const res = await fetch(SB_URL + path, {
    ...opts,
    headers: {
      "apikey": SB_KEY,
      "Authorization": "Bearer " + (opts._token || SB_KEY),
      "Content-Type": "application/json",
      "Prefer": "return=representation",
      ...(opts.headers || {}),
    },
  });
  const text = await res.text();
  if (!res.ok) { const e = text ? JSON.parse(text) : {}; throw new Error(e.message || res.statusText); }
  return text ? JSON.parse(text) : null;
}

const sbListaNomi = (tok, uid) => sbFetch("/rest/v1/lista_nomi?select=*&user_id=eq."+uid+"&order=created_at.desc", { _token:tok });
export const sbInsertNome = (tok, row) => sbFetch("/rest/v1/lista_nomi", { method:"POST", _token:tok, body:JSON.stringify(row) });
export const sbUpdateNome = (tok, id, row) => sbFetch("/rest/v1/lista_nomi?id=eq."+id, { method:"PATCH", _token:tok, body:JSON.stringify(row) });
export const sbDeleteNome = (tok, id) => sbFetch("/rest/v1/lista_nomi?id=eq."+id, { method:"DELETE", _token:tok });

const TEMPERATURE = ["Caldo", "Tiepido", "Freddo"];
const TEMP_CLR = { Caldo:"#ef4444", Tiepido:"#eab308", Freddo:"#0ea5e9" };

export const genId = () => crypto.randomUUID();
const today = () => new Date().toISOString().split("T")[0];

function Av({ n, c, size=34 }) {
  return (
    <div style={{width:size,height:size,borderRadius:"50%",flexShrink:0,background:"linear-gradient(135deg,var(--a1),var(--a2))",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:900,fontSize:size*0.32,boxShadow:"0 0 10px var(--a1-18)"}}>
      {(n||"?")[0]}{(c||"")[0]}
    </div>
  );
}

export function PersonaModal({ persona, onSave, onClose, onDelete, onInvita, isEdit }) {
  const [form, setForm] = useState(persona || { nome:"", cognome:"", note:"", invitato:false });
  const lbl = { fontSize:11, fontWeight:700, color:"var(--muted)", textTransform:"uppercase", letterSpacing:.8, marginBottom:5, display:"block" };

  return (
    <div style={{background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:20,padding:"1.7rem",maxHeight:"90vh",overflowY:"auto",boxShadow:"0 30px 80px -20px #0f172a55"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
        <h2 style={{fontWeight:800,fontSize:18,color:"var(--text)"}}>{isEdit?"Modifica":"Aggiungi alla lista"}</h2>
        <button onClick={onClose} style={{background:"var(--bg3)",color:"var(--muted)",border:"1px solid var(--border)",borderRadius:9,cursor:"pointer",padding:"4px 11px",fontSize:14}}>{"✕"}</button>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
        <div><label style={lbl}>Nome</label><input value={form.nome||""} onChange={e=>setForm(f=>({...f,nome:e.target.value}))} placeholder="Mario" /></div>
        <div><label style={lbl}>Cognome</label><input value={form.cognome||""} onChange={e=>setForm(f=>({...f,cognome:e.target.value}))} placeholder="Rossi" /></div>
        <div style={{gridColumn:"1/-1"}}>
          <label style={lbl}>Temperatura</label>
          <div style={{display:"flex",gap:8}}>
            {TEMPERATURE.map(t=>{
              const active=form.temperatura===t;
              const color=TEMP_CLR[t];
              return(
                <button key={t} onClick={()=>setForm(f=>({...f,temperatura:active?null:t}))}
                  style={{flex:1,padding:"10px",background:active?color+"22":"var(--bg3)",border:"2px solid "+(active?color:"var(--border)"),borderRadius:11,cursor:"pointer",color:active?color:"var(--muted)",fontWeight:700,fontSize:13,fontFamily:"inherit",transition:"all .2s"}}>
                  {t}
                </button>
              );
            })}
          </div>
        </div>
        <div style={{gridColumn:"1/-1"}}><label style={lbl}>Note</label><textarea value={form.note||""} onChange={e=>setForm(f=>({...f,note:e.target.value}))} style={{height:80,resize:"vertical"}} placeholder="Scrivi quello che vuoi..." /></div>
      </div>

      <div style={{display:"flex",gap:9,justifyContent:"flex-end",flexWrap:"wrap",marginTop:8}}>
        {onDelete && <button onClick={onDelete} style={{padding:"10px 15px",background:"#fef2f2",color:"#dc2626",border:"1px solid #fecaca",borderRadius:11,cursor:"pointer",fontWeight:700,fontSize:13}}>Elimina</button>}
        {isEdit && !form.invitato && onInvita && <button onClick={()=>onInvita(form)} style={{padding:"10px 16px",background:"#ecfdf5",color:"#059669",border:"1px solid #a7f3d0",borderRadius:11,cursor:"pointer",fontWeight:700,fontSize:13}}>Aggiungi a prospect</button>}
        {isEdit && form.invitato && onInvita && <span style={{padding:"10px 14px",fontSize:12,color:"#059669",fontWeight:700}}>Aggiunto a prospect</span>}
        <button onClick={onClose} style={{padding:"10px 15px",background:"var(--bg3)",color:"var(--muted)",border:"1px solid var(--border)",borderRadius:11,cursor:"pointer",fontWeight:600,fontSize:13}}>Annulla</button>
        <button onClick={()=>onSave(form)} style={{padding:"10px 22px",background:"linear-gradient(135deg,var(--a1),var(--a2))",color:"#fff",border:"none",borderRadius:11,cursor:"pointer",fontWeight:700,fontSize:13,boxShadow:"0 8px 18px -8px #6d5efcaa"}}>
          {isEdit?"Aggiorna":"Aggiungi"}
        </button>
      </div>
    </div>
  );
}

function useIsMobile() {
  const [m,setM]=useState(typeof window!=="undefined" && window.innerWidth<=768);
  useEffect(()=>{ const f=()=>setM(window.innerWidth<=768); window.addEventListener("resize",f); return ()=>window.removeEventListener("resize",f); },[]);
  return m;
}

export function ListaNomiView({ auth, onInvitaProspect }) {
  const isMobile = useIsMobile();
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [sel, setSel] = useState(null);
  const [search, setSearch] = useState("");
  const [filterTemp, setFilterTemp] = useState("");
  const [toast, setToast] = useState(null);

  function showToast(msg, color="#22d3ee") { setToast({msg,color}); setTimeout(()=>setToast(null),2800); }

  useEffect(() => {
    if (!auth) return;
    sbListaNomi(auth.token, auth.userId).then(rows => {
      setLista(rows||[]);
    }).catch(e=>showToast("Errore: "+e.message,"#ef4444")).finally(()=>setLoading(false));
  }, [auth]);

  async function savPersona(form) {
    if (!form.nome?.trim()) return;
    try {
      if (modal === "add") {
        const row = { id:genId(), user_id:auth.userId, nome:form.nome, cognome:form.cognome||null, note:form.note||null, invitato:false, temperatura:form.temperatura||null };
        await sbInsertNome(auth.token, row);
        setLista(l=>[row,...l]);
        showToast("Aggiunto");
      } else {
        const row = { nome:form.nome, cognome:form.cognome||null, note:form.note||null, temperatura:form.temperatura||null };
        await sbUpdateNome(auth.token, sel.id, row);
        setLista(l=>l.map(x=>x.id===sel.id?{...x,...row}:x));
        showToast("Aggiornato");
      }
    } catch(e) { showToast("Errore: "+e.message,"#ef4444"); }
    setModal(null); setSel(null);
  }

  async function deletPersona() {
    try {
      await sbDeleteNome(auth.token, sel.id);
      setLista(l=>l.filter(x=>x.id!==sel.id));
      showToast("Rimosso","#ef4444");
    } catch(e) { showToast("Errore: "+e.message,"#ef4444"); }
    setModal(null); setSel(null);
  }

  async function invitaPersona(form, rowId) {
    const nomeId = rowId || sel?.id;
    try {
      // Segna come "aggiunto a prospect" nella lista nomi
      await sbUpdateNome(auth.token, nomeId, { invitato:true });
      setLista(l=>l.map(x=>x.id===nomeId?{...x,invitato:true}:x));
      // Copia in prospect
      await onInvitaProspect({
        nome: form.nome,
        cognome: form.cognome||"",
        citta: form.citta||"",
        telefono: form.telefono||"",
        instagram: form.instagram||"",
        note: form.note||"",
        fonte: "Offline",
        fase: "INVITO",
        conosciutoAt: today(),
      });
      showToast((form.nome||"")+" aggiunto ai Prospect");
      setModal(null); setSel(null);
    } catch(e) { showToast("Errore: "+e.message,"#ef4444"); }
  }

  const filtered = lista.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q || (p.nome+" "+(p.cognome||"")+" "+(p.citta||"")).toLowerCase().includes(q);
    const matchTemp = !filterTemp || p.temperatura === filterTemp;
    return matchSearch && matchTemp;
  });

  const ordinata = [...filtered.filter(p=>!p.invitato), ...filtered.filter(p=>p.invitato)];

  return (
    <div className="page-wrap" style={{padding:"2rem 2.2rem",maxWidth:1280,margin:"0 auto"}}>
      {toast && <div style={{position:"fixed",bottom:24,right:24,zIndex:9999,background:toast.color,color:"#fff",padding:"12px 22px",borderRadius:12,fontWeight:700,fontSize:13,boxShadow:"0 8px 30px #00000060"}}>{toast.msg}</div>}

      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1.4rem",flexWrap:"wrap",gap:12}}>
        <div>
          <h1 style={{fontWeight:900,fontSize:26,color:"var(--text)",letterSpacing:-0.8}}>Lista Nomi</h1>
          <p style={{color:"var(--muted)",fontSize:12,marginTop:3}}>La tua lista personale. Aggiungi le persone che conosci, poi spostale nei Prospect</p>
        </div>
        <div style={{display:"flex",gap:10}}>
          <a href="/memory-jogger.pdf" target="_blank" rel="noreferrer"
            style={{padding:"9px 18px",fontSize:13,fontWeight:800,background:"var(--bg4)",color:"var(--text)",border:"1px solid var(--border2)",borderRadius:10,cursor:"pointer",textDecoration:"none",display:"flex",alignItems:"center",gap:6}}>
            Memory Jogger
          </a>
          <button onClick={()=>{setSel(null);setModal("add");}} style={{padding:"9px 18px",fontSize:13,fontWeight:800,background:"linear-gradient(135deg,var(--a1),var(--a2))",color:"#fff",border:"none",borderRadius:10,cursor:"pointer"}}>
            + Aggiungi
          </button>
        </div>
      </div>

      <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap"}}>
        <input placeholder="Cerca..." value={search} onChange={e=>setSearch(e.target.value)} style={{flex:2,minWidth:200}} />
        <select value={filterTemp} onChange={e=>setFilterTemp(e.target.value)} style={{flex:1,minWidth:130}}>
          <option value="">Tutte le temperature</option>
          {TEMPERATURE.map(t=><option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {loading
        ? <div style={{textAlign:"center",padding:"4rem",color:"var(--muted)"}}>Caricamento...</div>
        : lista.length===0
          ? <div style={{textAlign:"center",padding:"4rem",color:"var(--muted)"}}>
              <div style={{fontSize:13,marginBottom:12}}>La tua lista nomi è vuota</div>
              <button onClick={()=>{setSel(null);setModal("add");}} style={{padding:"10px 20px",fontSize:13,fontWeight:700,background:"linear-gradient(135deg,var(--a1),var(--a2))",color:"#fff",border:"none",borderRadius:12,cursor:"pointer"}}>
                Aggiungi il primo
              </button>
            </div>
          : <div className="card-soft" style={{background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:18,overflow:"hidden"}}>
              <div style={{padding:"1rem 1.4rem",borderBottom:"1px solid var(--border)",fontSize:13,fontWeight:700,color:"var(--text)"}}>
                La tua lista <span style={{fontSize:11,color:"var(--muted)",fontWeight:500,marginLeft:8}}>{ordinata.length} persone</span>
              </div>
              {isMobile ? (
                <div style={{padding:"4px 12px 12px"}}>
                  {ordinata.map(p=>(
                    <div key={p.id} onClick={()=>{setSel(p);setModal("edit");}} style={{padding:"14px 4px",borderBottom:"1px solid var(--border)",opacity:p.invitato?0.65:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:11}}>
                        <Av n={p.nome} c={p.cognome} size={40}/>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{color:"var(--text)",fontWeight:800,fontSize:16}}>{p.nome} {p.cognome}</div>
                          {p.note && <div style={{color:"var(--muted)",fontSize:12.5,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.note}</div>}
                        </div>
                        {p.temperatura && <span style={{fontSize:12,fontWeight:700,padding:"4px 11px",borderRadius:99,color:TEMP_CLR[p.temperatura],background:TEMP_CLR[p.temperatura]+"1f"}}>{p.temperatura}</span>}
                      </div>
                      <div style={{marginTop:10}} onClick={e=>e.stopPropagation()}>
                        {p.invitato
                          ? <span style={{fontSize:12,fontWeight:700,color:"#059669",background:"#ecfdf5",borderRadius:99,padding:"5px 12px"}}>Aggiunto a prospect</span>
                          : <button onClick={()=>invitaPersona(p,p.id)} style={{width:"100%",padding:"11px",background:"#ecfdf5",color:"#059669",border:"1px solid #a7f3d0",borderRadius:12,cursor:"pointer",fontWeight:700,fontSize:14}}>Aggiungi a prospect</button>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr style={{background:"var(--bg3)"}}>
                  {["Nome","Temperatura","Note",""].map((h,i)=>(
                    <th key={i} style={{textAlign:"left",color:"var(--muted)",fontWeight:700,fontSize:10.5,textTransform:"uppercase",letterSpacing:.8,padding:"12px 16px"}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>{ordinata.map(p=>(
                  <tr key={p.id} onClick={()=>{setSel(p);setModal("edit");}} style={{borderBottom:"1px solid var(--border)",cursor:"pointer",opacity:p.invitato?0.65:1}} className="hrow">
                    <td style={{padding:"12px 16px"}}><div style={{display:"flex",alignItems:"center",gap:10}}><Av n={p.nome} c={p.cognome}/><span style={{color:"var(--text)",fontWeight:700,fontSize:13.5}}>{p.nome} {p.cognome}</span></div></td>
                    <td style={{padding:"12px 16px"}}>{p.temperatura?<span style={{fontSize:11.5,fontWeight:700,padding:"3px 11px",borderRadius:99,color:TEMP_CLR[p.temperatura],background:TEMP_CLR[p.temperatura]+"1f"}}>{p.temperatura}</span>:<span style={{color:"var(--muted)"}}>{"—"}</span>}</td>
                    <td style={{padding:"12px 16px",color:"var(--muted)",fontSize:12.5,maxWidth:320}}><div style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.note||"—"}</div></td>
                    <td style={{padding:"12px 16px",textAlign:"right"}} onClick={e=>e.stopPropagation()}>
                      {p.invitato
                        ? <span style={{fontSize:11,fontWeight:700,color:"#059669",background:"#ecfdf5",borderRadius:99,padding:"4px 11px"}}>Aggiunto a prospect</span>
                        : <button onClick={()=>invitaPersona(p,p.id)} style={{padding:"6px 13px",background:"#ecfdf5",color:"#059669",border:"1px solid #a7f3d0",borderRadius:99,cursor:"pointer",fontWeight:700,fontSize:12}}>Aggiungi a prospect</button>}
                    </td>
                  </tr>
                ))}</tbody>
              </table>
              )}
            </div>
      }

      {modal && (
        <div onClick={()=>{setModal(null);setSel(null);}} style={{position:"fixed",inset:0,background:"#0f172a66",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16}}>
          <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:520}}>
            <PersonaModal
              persona={sel}
              isEdit={modal==="edit"}
              onSave={savPersona}
              onClose={()=>{setModal(null);setSel(null);}}
              onDelete={modal==="edit"?deletPersona:null}
              onInvita={invitaPersona}
            />
          </div>
        </div>
      )}
    </div>
  );
}