import { useState } from "react";
import { vipMancanti, VIP_GM, VIP_GOLD, VIP_BG } from "../vip";

// Pillola oro: quanti VIP della lista sono stati riconosciuti fra le persone date (clic = elenco di chi manca)
export default function VipPill({ persone }) {
  const [open, setOpen] = useState(false);
  const man = vipMancanti(persone);
  const tot = VIP_GM.length;
  return (
    <span style={{position:"relative",display:"inline-block"}}>
      <button onClick={()=>setOpen(o=>!o)} style={{background:VIP_BG+",var(--bg2)",border:"1px solid "+VIP_GOLD,borderRadius:99,padding:"5px 12px",fontSize:12.5,fontWeight:800,color:VIP_GOLD,cursor:"pointer",fontFamily:"inherit"}}>
        {"⭐ "}<span>{(tot-man.length)+" VIP Global Mission"}</span>
      </button>
      {open && (
        <div style={{position:"absolute",top:"110%",left:0,zIndex:50,background:"var(--bg2)",border:"1px solid "+VIP_GOLD,borderRadius:12,padding:"10px 14px",minWidth:250,fontSize:12.5,color:"var(--text)",boxShadow:"0 8px 24px #0003"}}>
          <div style={{fontWeight:800,color:VIP_GOLD,marginBottom:4}}>{"Trovati nel CRM: "+(tot-man.length)+" su "+tot}</div>
          {man.length===0 ? null : <div><div style={{color:"var(--muted)",marginBottom:2}}>Non trovati (nome diverso o non ancora nel CRM):</div>{man.map(n=><div key={n}>{"• "+n}</div>)}</div>}
        </div>
      )}
    </span>
  );
}
