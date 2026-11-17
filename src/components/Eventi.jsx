// Sezione Eventi — versione semplificata.
// Due eventi, entrambi "oscurati" (loading) finché non li apriamo.
// Per sbloccare un evento: metti  aperto:true  qui sotto.
const EVENTI = [
  { id:"global-mission", emoji:"🌍", nome:"Global Mission", sub:"12 dicembre 2026", apre:"Si apre lunedì 23 novembre", aperto:false, colore:"#2563eb" },
  { id:"convention-salisburgo", emoji:"🏔️", nome:"Convention Salisburgo", sub:"Salisburgo", apre:"Prossimamente", aperto:false, colore:"#7c3aed" },
];

export function EventiView() {
  return (
    <div className="page-wrap" style={{padding:"2rem 2.2rem",maxWidth:900,margin:"0 auto"}}>
      <style>{`@keyframes dlshim{0%{transform:translateX(-100%)}100%{transform:translateX(250%)}}@keyframes dlpulse{0%,100%{opacity:.55}50%{opacity:1}}`}</style>
      <div style={{fontSize:12,fontWeight:800,letterSpacing:1.2,textTransform:"uppercase",color:"var(--a2)"}}>Digital Legacy · Be Club</div>
      <h1 style={{fontWeight:900,fontSize:30,letterSpacing:-.8,color:"var(--text)",margin:"4px 0 6px"}}>Eventi</h1>
      <div style={{color:"var(--muted)",fontSize:15,marginBottom:22}}>Ticket e partecipanti ripartono da zero: qui trovi i prossimi due eventi.</div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:16}}>
        {EVENTI.map(e => (
          <div key={e.id} style={{position:"relative",overflow:"hidden",borderRadius:22,border:"1px solid var(--border)",background:"var(--bg2)",minHeight:260}}>
            <div style={{padding:"26px 22px",filter:e.aperto?"none":"blur(5px)",opacity:e.aperto?1:.5,userSelect:"none"}}>
              <div style={{fontSize:44}}>{e.emoji}</div>
              <div style={{fontWeight:900,fontSize:26,color:"var(--text)",margin:"6px 0 2px"}}>{e.nome}</div>
              <div style={{color:"var(--muted)",fontSize:15}}>{e.sub}</div>
              <div style={{display:"grid",gap:8,marginTop:18}}>
                {[70,45,60].map((w,i)=><div key={i} style={{height:12,width:w+"%",borderRadius:99,background:e.colore,opacity:.35}} />)}
              </div>
            </div>
            {!e.aperto && (
              <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8,background:"rgba(11,29,74,.55)",color:"#fff",textAlign:"center",padding:16}}>
                <div style={{fontSize:34}}>🔒</div>
                <div style={{fontWeight:900,fontSize:22,animation:"dlpulse 1.6s ease-in-out infinite"}}>Loading…</div>
                <div style={{width:150,height:6,borderRadius:99,background:"rgba(255,255,255,.25)",overflow:"hidden",position:"relative"}}>
                  <div style={{position:"absolute",top:0,bottom:0,width:"40%",borderRadius:99,background:"#fff",animation:"dlshim 1.4s linear infinite"}} />
                </div>
                <div style={{fontSize:14,fontWeight:700,opacity:.92,marginTop:4}}>{e.apre}</div>
              </div>)}
          </div>))}
      </div>
    </div>
  );
}
