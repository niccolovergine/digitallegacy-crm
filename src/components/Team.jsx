import { useState, useEffect } from "react";

const FASE_CLR = {INVITO:"#8b5cf6",FUP1:"var(--a1)",FUP2:"#3b82f6",PACK:"var(--a2)",CLOSING:"#22d3ee",SUB:"#10b981",FOLLOW_UP:"#f59e0b",NON_INT:"#6b7280"};
const FASE_LABEL = {INVITO:"Invito",FUP1:"FUP 1",FUP2:"FUP 2",PACK:"Pack",CLOSING:"Closing",SUB:"Iscritto",FOLLOW_UP:"Follow Up",NON_INT:"Non Int."};
const PACCHETTI = [{key:"starter",label:"Starter",bv:100},{key:"standard",label:"Standard",bv:250},{key:"premium",label:"Premium",bv:550},{key:"signature",label:"Signature",bv:1025},{key:"altro",label:"Altro",bv:0}];
function bvOfPacchetto(key, bvCustom){
  if(key==="altro") return bvCustom||0;
  const p=PACCHETTI.find(x=>x.key===key);
  return p?p.bv:0;
}

const STATO_COLORE_MAP = { iscritto:"#10b981", sparito:"#ef4444", da_risentire:"#f59e0b", iscrizione_fissata:"#3b82f6" };
const STATO_COLORE_LABEL = { iscritto:"Iscritto", sparito:"Sparito", da_risentire:"Da risentire più avanti", iscrizione_fissata:"Iscrizione fissata" };

const fmt=d=>d?new Date(d+"T12:00:00").toLocaleDateString("it-IT"):"\u2014";

function teamStats(prospects){
  const total=prospects.length;
  const sub=prospects.filter(p=>p.fase==="SUB").length;
  const act=prospects.filter(p=>["FUP1","FUP2","PACK","CLOSING"].includes(p.fase)).length;
  const conv=total>0?Math.round(sub/total*100):0;
  const bv=prospects.filter(p=>p.fase==="SUB").reduce((acc,p)=>acc+bvOfPacchetto(p.pacchetto,p.bvCustom),0);
  return{total,sub,act,conv,bv};
}

function Av({n,c,color,size=34}){
  return(
    <div style={{width:size,height:size,borderRadius:"50%",flexShrink:0,background:"linear-gradient(135deg,"+color+","+color+"99)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:900,fontSize:size*0.32,boxShadow:"0 0 10px "+color+"35"}}>
      {(n||"?")[0]}{(c||"")[0]}
    </div>
  );
}

export function TeamView({auth,downline,dlProspects,clienti,onAssignTeam,positions,onOpenProspect,onSetLeader,onSetAttivo,onAddCliente,onAddMembro,onUpdateCliente,onDeleteCliente,sbGetListaNomiTeam,LUDOVICO_ID}){
  const isRoot = auth.userId === LUDOVICO_ID;
  const canToggleAttivo = isRoot || !!auth.profile?.is_leader;
  const[selectedMember,setSelectedMember]=useState(null);
  const[teamFilter,setTeamFilter]=useState("all");
  const[copied,setCopied]=useState(false);
  const[memberSearch,setMemberSearch]=useState("");
  const[listaNomiMembro,setListaNomiMembro]=useState([]);
  const[loadingListaNomi,setLoadingListaNomi]=useState(false);

  useEffect(()=>{
    if(!selectedMember||!sbGetListaNomiTeam){setListaNomiMembro([]);return;}
    setLoadingListaNomi(true);
    sbGetListaNomiTeam(auth.token,selectedMember.id)
      .then(rows=>setListaNomiMembro(rows||[]))
      .catch(()=>setListaNomiMembro([]))
      .finally(()=>setLoadingListaNomi(false));
  },[selectedMember]);

  const referralLink=auth?.profile?.referral_code?window.location.origin+"?ref="+auth.profile.referral_code:null;
  function copyLink(){if(!referralLink)return;navigator.clipboard.writeText(referralLink).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2000);});}

  function getTeamForMe(member){
    const pos=positions.find(p=>p.member_id===member.id&&p.upline_id===auth.userId);
    if(pos)return pos.team;
    const parent=downline.find(m=>m.id===member.positioned_under);
    if(parent)return getTeamForMe(parent);
    return null;
  }
  function getTeam(memberId,uplineId){
    const pos=positions.find(p=>p.member_id===memberId&&p.upline_id===uplineId);
    return pos?.team||null;
  }

  const attiviDownline=downline.filter(m=>m.attivo!==false);
  const inattiviDownline=downline.filter(m=>m.attivo===false);
  const sinistra=attiviDownline.filter(m=>getTeamForMe(m)==="sinistra");
  const destra=attiviDownline.filter(m=>getTeamForMe(m)==="destra");
  const noTeam=attiviDownline.filter(m=>!getTeamForMe(m));
  const filteredMembersByTeam=teamFilter==="all"?attiviDownline:teamFilter==="sinistra"?sinistra:teamFilter==="destra"?destra:teamFilter==="inattivi"?inattiviDownline:noTeam;
  const filteredMembers = !memberSearch.trim() ? filteredMembersByTeam : filteredMembersByTeam.filter(m=>{
    const q=memberSearch.trim().toLowerCase();
    return (m.nome||"").toLowerCase().includes(q) || (m.cognome||"").toLowerCase().includes(q) || (m.email||"").toLowerCase().includes(q) || (m.citta||"").toLowerCase().includes(q);
  });
  function getMemberProspects(memberId){return dlProspects.filter(p=>p._userId===memberId);}
  const convColor=v=>v>=20?"#10b981":v>=10?"var(--a2)":"#f59e0b";

  if(selectedMember){
    const mP=getMemberProspects(selectedMember.id);
    const ms=teamStats(mP);
    const teamColor=getTeamForMe(selectedMember)==="sinistra"?"var(--a1)":getTeamForMe(selectedMember)==="destra"?"#10b981":"#6b7280";
    return(
      <div style={{padding:"2rem 2.2rem",maxWidth:1280,margin:"0 auto"}}>
        <button onClick={()=>setSelectedMember(null)} style={{display:"flex",alignItems:"center",gap:8,background:"none",border:"none",color:"var(--a2)",cursor:"pointer",fontSize:13,fontWeight:700,marginBottom:20}}>
          {"\u2190"} Torna al Team
        </button>
        <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:24,flexWrap:"wrap"}}>
          <Av n={selectedMember.nome||selectedMember.email} c={selectedMember.cognome} color={teamColor} size={50}/>
          <div>
            <h2 style={{fontWeight:900,fontSize:22,color:"var(--text)"}}>{selectedMember.nome||selectedMember.email} {selectedMember.cognome||""}</h2>
            {selectedMember.citta&&<div style={{fontSize:12,color:"var(--muted)",marginTop:3}}>{selectedMember.citta}</div>}
            <div style={{display:"flex",gap:12,marginTop:8,flexWrap:"wrap"}}>
              <a href={"mailto:"+selectedMember.email} style={{color:"var(--a2)",fontSize:12,textDecoration:"none"}}>{selectedMember.email}</a>
              {selectedMember.telefono&&<a href={"tel:"+selectedMember.telefono} style={{color:"var(--a2)",fontSize:12,textDecoration:"none"}}>{selectedMember.telefono}</a>}
            </div>
          </div>
          {canToggleAttivo && (
            <label style={{display:"inline-flex",alignItems:"center",gap:6,cursor:"pointer",marginLeft:"auto",background:"var(--bg3)",border:"1px solid var(--border2)",borderRadius:9,padding:"8px 14px"}}>
              <input type="checkbox" checked={selectedMember.attivo!==false} onChange={e=>{onSetAttivo(selectedMember.id,e.target.checked);setSelectedMember(m=>({...m,attivo:e.target.checked}));}} style={{width:16,height:16,cursor:"pointer"}} />
              <span style={{fontSize:12,fontWeight:700,color:selectedMember.attivo===false?"#ef4444":"var(--muted)"}}>{selectedMember.attivo===false?"Inattivo":"Attivo"}</span>
            </label>
          )}
          {isRoot && (
            <label style={{display:"inline-flex",alignItems:"center",gap:6,cursor:"pointer",background:"var(--bg3)",border:"1px solid var(--border2)",borderRadius:9,padding:"8px 14px"}}>
              <input type="checkbox" checked={!!selectedMember.is_leader} onChange={e=>{onSetLeader(selectedMember.id,e.target.checked);setSelectedMember(m=>({...m,is_leader:e.target.checked}));}} style={{width:16,height:16,cursor:"pointer"}} />
              <span style={{fontSize:12,fontWeight:700,color:"var(--a2)"}}>Leader</span>
            </label>
          )}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
          {[{label:"Prospect",value:ms.total,color:"var(--a1)"},{label:"Iscritti",value:ms.sub,color:"#10b981"},{label:"In percorso",value:ms.act,color:"var(--a2)"},{label:"BV prodotti",value:ms.bv,color:"#f59e0b"}].map((k,i)=>(
            <div key={i} style={{background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:14,padding:"16px 18px",position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:"linear-gradient(90deg,"+k.color+","+k.color+"44)",borderRadius:"14px 14px 0 0"}}/>
              <div style={{fontSize:10,color:"var(--muted)",fontWeight:700,textTransform:"uppercase",letterSpacing:.8,marginBottom:8}}>{k.label}</div>
              <div style={{fontSize:28,fontWeight:900,color:k.color}}>{k.value}</div>
            </div>
          ))}
        </div>
        <div style={{background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:14,overflow:"hidden"}}>
          <div style={{padding:"1rem 1.4rem",borderBottom:"1px solid #11203a",fontSize:13,fontWeight:800,color:"var(--text)"}}>Prospect di {selectedMember.nome||selectedMember.email}</div>
          {mP.length===0
            ?<div style={{padding:"3rem",textAlign:"center",color:"var(--border2)"}}>Nessun prospect ancora</div>
            :<div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",minWidth:680}}>
              <thead><tr style={{borderBottom:"1px solid #11203a"}}>{["Nome","Conosciuto","A che punto è","Note","Stato"].map(h=>(<th key={h} style={{textAlign:"left",color:"var(--muted)",fontWeight:700,fontSize:10,textTransform:"uppercase",padding:"11px 16px",whiteSpace:"nowrap"}}>{h}</th>))}</tr></thead>
              <tbody>{mP.map(p=>{
                const stato=STATO_COLORE_MAP[p.statoColore];
                return (
                <tr key={p.id} onClick={()=>onOpenProspect&&onOpenProspect({...p,_ownerName:(selectedMember.nome||selectedMember.email)+" "+(selectedMember.cognome||"")})} style={{borderBottom:"1px solid #0d1b3355",cursor:onOpenProspect?"pointer":"default",background:stato?stato+"12":"transparent",borderLeft:stato?"3px solid "+stato:"3px solid transparent"}} className="hrow">
                  <td style={{padding:"11px 16px"}}><div style={{display:"flex",alignItems:"center",gap:9}}><Av n={p.nome} c={p.cognome} color={FASE_CLR[p.fase]}/><span style={{color:"var(--text)",fontWeight:700,fontSize:13}}>{p.nome} {p.cognome}</span></div></td>
                  <td style={{padding:"11px 16px",color:"var(--muted)",fontSize:12,whiteSpace:"nowrap"}}>{fmt(p.conosciutoAt)}</td>
                  <td style={{padding:"11px 16px"}}><span style={{display:"inline-flex",alignItems:"center",borderRadius:6,padding:"3px 9px",fontSize:11,fontWeight:700,color:"#fff",background:FASE_CLR[p.fase],whiteSpace:"nowrap"}}>{FASE_LABEL[p.fase]}</span></td>
                  <td style={{padding:"11px 16px",color:"var(--muted)",fontSize:12,maxWidth:260,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.note||"\u2014"}</td>
                  <td style={{padding:"11px 16px"}}>{stato?<span style={{display:"inline-flex",alignItems:"center",borderRadius:6,padding:"3px 9px",fontSize:11,fontWeight:800,color:stato,background:stato+"18",border:"1px solid "+stato+"35",whiteSpace:"nowrap"}}>{STATO_COLORE_LABEL[p.statoColore]}</span>:<span style={{color:"var(--border2)",fontSize:11}}>\u2014</span>}</td>
                </tr>
              );})}</tbody>
            </table>
          </div>
          }
        </div>

        <div style={{background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:14,overflow:"hidden",marginTop:20}}>
          <div style={{padding:"1rem 1.4rem",borderBottom:"1px solid #11203a"}}>
            <div style={{fontSize:13,fontWeight:800,color:"var(--text)"}}>Lista nomi di {selectedMember.nome||selectedMember.email}</div>
            <div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>Nomi ancora da invitare, non ancora diventati prospect</div>
          </div>
          {loadingListaNomi
            ? <div style={{padding:"2rem",textAlign:"center",color:"var(--border2)",fontSize:13}}>Carico...</div>
            : listaNomiMembro.length===0
            ? <div style={{padding:"2rem",textAlign:"center",color:"var(--border2)",fontSize:13}}>Nessun nome ancora in lista</div>
            : <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",minWidth:680}}>
                <thead><tr style={{borderBottom:"1px solid #11203a"}}>{["Nome","Città","Telefono","Instagram","Temp.","Note"].map(h=>(<th key={h} style={{textAlign:"left",color:"var(--muted)",fontWeight:700,fontSize:10,textTransform:"uppercase",padding:"11px 16px",whiteSpace:"nowrap"}}>{h}</th>))}</tr></thead>
                <tbody>{listaNomiMembro.map(n=>{
                  const tempColor = n.temperatura==="Caldo"?"#ef4444":n.temperatura==="Tiepido"?"#f59e0b":n.temperatura==="Freddo"?"#3b82f6":null;
                  return (
                  <tr key={n.id} style={{borderBottom:"1px solid #0d1b3355"}}>
                    <td style={{padding:"11px 16px"}}><div style={{display:"flex",alignItems:"center",gap:9}}><Av n={n.nome} c={n.cognome} color="#8b5cf6"/><span style={{color:"var(--text)",fontWeight:700,fontSize:13}}>{n.nome} {n.cognome||""}</span></div></td>
                    <td style={{padding:"11px 16px",color:"var(--muted)",fontSize:12}}>{n.citta||"\u2014"}</td>
                    <td style={{padding:"11px 16px",color:"var(--muted)",fontSize:12}}>{n.telefono||"\u2014"}</td>
                    <td style={{padding:"11px 16px",color:"var(--muted)",fontSize:12}}>{n.instagram||"\u2014"}</td>
                    <td style={{padding:"11px 16px"}}>{tempColor?<span style={{fontSize:11,fontWeight:800,padding:"2px 8px",borderRadius:6,color:tempColor,background:tempColor+"20"}}>{n.temperatura}</span>:<span style={{color:"var(--border2)",fontSize:11}}>\u2014</span>}</td>
                    <td style={{padding:"11px 16px",color:"var(--muted)",fontSize:12,maxWidth:220,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{n.note||"\u2014"}</td>
                  </tr>
                );})}</tbody>
              </table>
            </div>
          }
        </div>
      </div>
    );
  }

  return(
    <div style={{padding:"2rem 2.2rem",maxWidth:1280,margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",marginBottom:"1.5rem",gap:12,flexWrap:"wrap"}}>
        <div>
          <h1 style={{fontWeight:900,fontSize:26,color:"var(--text)",letterSpacing:-0.8,lineHeight:1}}>Team</h1>
          <p style={{color:"var(--muted)",fontSize:12,marginTop:4}}>{downline.length} membri nella tua downline</p>
        </div>
      </div>

      <div style={{background:"var(--bg2)",border:"1px solid #2563eb30",borderRadius:14,padding:"1.2rem 1.4rem",marginBottom:16}}>
        <div style={{fontSize:11,fontWeight:700,color:"var(--a1)",textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>Il tuo link referral</div>
        {referralLink
          ?<div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
            <div style={{flex:1,background:"var(--bg3)",border:"1px solid var(--border2)",borderRadius:9,padding:"9px 13px",fontSize:12,color:"var(--text)",fontFamily:"monospace",minWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{referralLink}</div>
            <button onClick={copyLink} style={{padding:"9px 18px",background:copied?"#10b98120":"linear-gradient(135deg,var(--a1),var(--a2))",color:copied?"#10b981":"#fff",border:copied?"1px solid #10b98140":"none",borderRadius:9,cursor:"pointer",fontWeight:800,fontSize:12,whiteSpace:"nowrap"}}>{copied?"Copiato!":"Copia link"}</button>
          </div>
          :<div style={{fontSize:12,color:"var(--muted)"}}>Caricamento...</div>
        }
        <div style={{fontSize:11,color:"var(--border2)",marginTop:8}}>Chi si registra tramite il tuo link appare automaticamente nel tuo team — oppure usa "Aggiungi membro" qui sotto per crearlo tu direttamente.</div>
      </div>

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap",marginBottom:18}}>
        <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
          <input value={memberSearch} onChange={e=>setMemberSearch(e.target.value)} placeholder="Cerca membro..." style={{width:190,fontSize:12,padding:"7px 11px",background:"var(--bg3)",border:"1px solid var(--border2)",borderRadius:8,color:"var(--text)"}} />
          <div style={{display:"flex",gap:6}}>
            {["all","sinistra","destra","nessuna"].map(f=>(
              <button key={f} onClick={()=>setTeamFilter(f)}
                style={{padding:"6px 13px",borderRadius:8,border:teamFilter===f?"1px solid #2563eb40":"1px solid transparent",cursor:"pointer",fontSize:11,fontWeight:700,fontFamily:"inherit",transition:"all .2s",background:teamFilter===f?"var(--bg4)":"var(--bg3)",color:teamFilter===f?"var(--a2)":"var(--muted)"}}>
                {f==="all"?"Tutti":f==="nessuna"?"Non assegnati":f.charAt(0).toUpperCase()+f.slice(1)}
              </button>
            ))}
            {inattiviDownline.length>0 && (
              <button onClick={()=>setTeamFilter("inattivi")}
                style={{padding:"6px 13px",borderRadius:8,border:teamFilter==="inattivi"?"1px solid #ef444440":"1px solid transparent",cursor:"pointer",fontSize:11,fontWeight:700,fontFamily:"inherit",transition:"all .2s",background:teamFilter==="inattivi"?"#ef444418":"var(--bg3)",color:teamFilter==="inattivi"?"#ef4444":"var(--muted)"}}>
                Inattivi ({inattiviDownline.length})
              </button>
            )}
          </div>
        </div>
        <div style={{display:"flex",gap:10}}>
          {onAddMembro && (
            <button onClick={onAddMembro} style={{padding:"9px 18px",background:"linear-gradient(135deg,var(--a1),var(--a2))",color:"#fff",border:"none",borderRadius:9,cursor:"pointer",fontWeight:800,fontSize:13}}>
              + Aggiungi membro
            </button>
          )}
          {onAddCliente && (
            <button onClick={onAddCliente} style={{padding:"9px 18px",background:"linear-gradient(135deg,#10b981,#10b98199)",color:"#fff",border:"none",borderRadius:9,cursor:"pointer",fontWeight:800,fontSize:13}}>
              + Aggiungi cliente
            </button>
          )}
        </div>
      </div>

      {downline.length===0
        ?<div style={{padding:"3rem",textAlign:"center",color:"var(--border2)"}}><p style={{fontSize:14,marginBottom:8}}>Nessun membro ancora</p><p style={{fontSize:12,color:"var(--border2)"}}>Condividi il tuo link referral o usa "Aggiungi membro"</p></div>
        :filteredMembers.length===0
        ?<div style={{padding:"3rem",textAlign:"center",color:"var(--border2)"}}><p style={{fontSize:14}}>Nessun membro trovato per "{memberSearch}"</p></div>
        :<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(230px,1fr))",gap:14}}>
          {filteredMembers.map(m=>{
            const mP=getMemberProspects(m.id);
            const ms=teamStats(mP);
            const myTeam=getTeamForMe(m);
            const teamColor=myTeam==="sinistra"?"var(--a1)":myTeam==="destra"?"#10b981":"#6b7280";
            const isMyDirect=m.positioned_under===auth.userId;
            const inBallo=mP.filter(p=>["FUP1","FUP2","PACK","CLOSING"].includes(p.fase)).length;
            return (
              <div key={m.id} onClick={()=>setSelectedMember(m)}
                style={{background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:14,padding:"1.1rem",cursor:"pointer",transition:"all .15s",opacity:m.attivo===false?0.55:1}}
                onMouseEnter={e=>e.currentTarget.style.borderColor="var(--a1)"} onMouseLeave={e=>e.currentTarget.style.borderColor="var(--border)"}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                  <Av n={m.nome||m.email} c={m.cognome} color={teamColor} size={38}/>
                  <div style={{minWidth:0,flex:1}}>
                    <div style={{color:"var(--text)",fontWeight:800,fontSize:13,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{m.nome||m.email} {m.cognome||""}</div>
                    {m.citta&&<div style={{color:"var(--muted)",fontSize:11}}>{m.citta}</div>}
                  </div>
                  {m.is_leader&&<span title="Leader" style={{fontSize:9,fontWeight:900,color:"var(--a2)",background:"var(--a1-13)",borderRadius:5,padding:"2px 6px",flexShrink:0}}>LDR</span>}
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                  {isMyDirect
                    ? <select onClick={e=>e.stopPropagation()} value={getTeam(m.id,auth.userId)||""} onChange={e=>onAssignTeam(m.id,e.target.value||null)} style={{width:"auto",minWidth:100,fontSize:10,padding:"4px 8px",color:teamColor,border:"1px solid "+teamColor+"40",background:"var(--bg3)"}}>
                        <option value="">Non assegnato</option>
                        <option value="sinistra">Sinistra</option>
                        <option value="destra">Destra</option>
                      </select>
                    : <span style={{fontSize:10,color:teamColor,fontWeight:700,background:teamColor+"15",borderRadius:5,padding:"3px 8px"}}>{myTeam||"Non assegnato"}</span>
                  }
                  {m.attivo===false && <span style={{fontSize:9,fontWeight:800,color:"#ef4444",background:"#ef444415",borderRadius:5,padding:"3px 7px"}}>Inattivo</span>}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,borderTop:"1px solid var(--border2)",paddingTop:10}}>
                  <div style={{textAlign:"center"}}>
                    <div style={{fontSize:16,fontWeight:900,color:"var(--a2)"}}>{inBallo}</div>
                    <div style={{fontSize:9,color:"var(--muted)",fontWeight:700,textTransform:"uppercase"}}>In ballo</div>
                  </div>
                  <div style={{textAlign:"center"}}>
                    <div style={{fontSize:16,fontWeight:900,color:"#10b981"}}>{ms.sub}</div>
                    <div style={{fontSize:9,color:"var(--muted)",fontWeight:700,textTransform:"uppercase"}}>Iscritti</div>
                  </div>
                  <div style={{textAlign:"center"}}>
                    <div style={{fontSize:16,fontWeight:900,color:convColor(ms.conv)}}>{ms.conv}%</div>
                    <div style={{fontSize:9,color:"var(--muted)",fontWeight:700,textTransform:"uppercase"}}>Conv.</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      }

      {(clienti||[]).length>0 && (()=>{
        const byTeam = teamFilter==="all" ? (clienti||[])
          : teamFilter==="nessuna" ? (clienti||[]).filter(c=>!c.team)
          : (clienti||[]).filter(c=>c.team===teamFilter);
        const filteredClienti = !memberSearch.trim() ? byTeam : byTeam.filter(c=>{
          const q=memberSearch.trim().toLowerCase();
          return (c.nome||"").toLowerCase().includes(q) || (c.cognome||"").toLowerCase().includes(q) || (c.citta||"").toLowerCase().includes(q);
        });
        return (
          <div style={{background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:14,overflow:"hidden",marginTop:24}}>
            <div style={{padding:"1rem 1.4rem",borderBottom:"1px solid #11203a"}}>
              <div style={{fontSize:13,fontWeight:800,color:"var(--text)"}}>Clienti</div>
              <div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>Aggiunti senza account — non toccano prospect e statistiche</div>
            </div>
            {filteredClienti.length===0
              ? <div style={{padding:"2rem",textAlign:"center",color:"var(--border2)",fontSize:13}}>Nessun cliente in questa vista</div>
              : <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",minWidth:560}}>
                <thead><tr style={{borderBottom:"1px solid #11203a"}}>{["Cliente","Di chi è","Gamba","Attivo",""].map(h=>(<th key={h} style={{textAlign:"left",color:"var(--muted)",fontWeight:700,fontSize:10,textTransform:"uppercase",padding:"11px 16px",whiteSpace:"nowrap"}}>{h}</th>))}</tr></thead>
                <tbody>{filteredClienti.map(c=>{
                  const owner=c.positionedUnder===auth.userId?null:downline.find(d=>d.id===c.positionedUnder);
                  const teamColor=c.team==="sinistra"?"var(--a1)":c.team==="destra"?"#10b981":"#6b7280";
                  return (
                    <tr key={c.id} style={{borderBottom:"1px solid #0d1b3355"}}>
                      <td style={{padding:"12px 16px"}}><div style={{display:"flex",alignItems:"center",gap:10}}><Av n={c.nome} c={c.cognome} color="#f59e0b"/><div><div style={{color:"var(--text)",fontWeight:700,fontSize:13}}>{c.nome} {c.cognome||""}</div>{c.citta&&<div style={{color:"var(--muted)",fontSize:11}}>{c.citta}</div>}</div></div></td>
                      <td style={{padding:"12px 16px",fontSize:12,color:"var(--muted)"}}>{owner?(owner.nome||owner.email)+" "+(owner.cognome||""):"Tu"}</td>
                      <td style={{padding:"12px 16px"}}>
                        <select value={c.team||""} onChange={e=>onUpdateCliente(c.id,{team:e.target.value})} style={{width:"auto",minWidth:100,fontSize:11,padding:"5px 9px",color:teamColor,border:"1px solid "+teamColor+"40",background:"var(--bg3)"}}>
                          <option value="">Non assegnata</option>
                          <option value="sinistra">Sinistra</option>
                          <option value="destra">Destra</option>
                        </select>
                      </td>
                      <td style={{padding:"12px 16px"}}>
                        <input type="checkbox" checked={c.attivo!==false} onChange={e=>onUpdateCliente(c.id,{attivo:e.target.checked})} style={{width:16,height:16,cursor:"pointer"}} />
                      </td>
                      <td style={{padding:"12px 16px"}}><button onClick={()=>{if(window.confirm("Rimuovere "+c.nome+"?"))onDeleteCliente(c.id);}} style={{background:"#ef444415",border:"1px solid #ef444430",borderRadius:6,color:"#f87171",cursor:"pointer",fontSize:11,fontWeight:800,padding:"4px 9px"}}>Rimuovi</button></td>
                    </tr>
                  );
                })}</tbody>
              </table>
              </div>
            }
          </div>
        );
      })()}
    </div>
  );
}
