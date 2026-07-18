import { useState, useEffect, useMemo } from "react";

export const RANK_TARGETS = [
  { key:"executive",              label:"Executive",               sqt:0,  mastery:1   },
  { key:"consultant",             label:"Consultant",              sqt:1,  mastery:3   },
  { key:"team_leader",            label:"Team Leader",             sqt:3,  mastery:5   },
  { key:"advanced_team_leader",   label:"Advanced Team Leader",    sqt:8,  mastery:12  },
  { key:"senior_team_leader",     label:"Senior Team Leader",      sqt:10, mastery:20  },
  { key:"executive_team_leader",  label:"Executive Team Leader",   sqt:18, mastery:35  },
  { key:"vice_president",         label:"Vice President",          sqt:40, mastery:75  },
  { key:"senior_vice_president",  label:"Senior Vice President",   sqt:60, mastery:100 },
];

function Bar({ current, target, color }) {
  const pct = target > 0 ? Math.min(100, Math.round((current/target)*100)) : 100;
  return (
    <div style={{ height:8, borderRadius:5, background:"var(--bg4)", overflow:"hidden" }}>
      <div style={{ height:"100%", width:pct+"%", background:color, borderRadius:5, transition:"width .3s" }} />
    </div>
  );
}

function LegBlock({ label, current, target, color }) {
  const mancano = Math.max(0, target - current);
  return (
    <div style={{ background:"var(--bg3)", border:"1px solid var(--border)", borderRadius:12, padding:"14px 16px", flex:1 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:8 }}>
        <span style={{ fontSize:12, fontWeight:800, color }}>{label}</span>
        <span style={{ fontSize:13, fontWeight:900, color:"var(--text)" }}>{current}<span style={{color:"var(--muted)",fontWeight:600}}> / {target}</span></span>
      </div>
      <Bar current={current} target={target} color={color} />
      <div style={{ marginTop:8, fontSize:11, fontWeight:700, color: mancano===0 ? "#10b981" : "var(--muted)" }}>
        {mancano===0 ? " Obiettivo raggiunto" : "Mancano "+mancano+" persone sedute"}
      </div>
    </div>
  );
}

export function PlanView({ auth, downline, positions, isLeader,
  sbListEventi, sbListEventoStatus, sbGetPiano, sbSetPiano, showToast }) {

  const [pianoCiclo] = useState(83); // ciclo obiettivo — il "ciclo d'oro"
  const [pianoRank, setPianoRankState] = useState("");
  const [statusSQT, setStatusSQT] = useState([]);
  const [statusMastery, setStatusMastery] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [subTab, setSubTab] = useState("plan"); // "plan" | "jarvis"

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const evs = await sbListEventi(auth.token);
        if (!alive) return;
        const sqt = (evs||[]).find(e => (e.nome||"").toUpperCase().includes("SQT"));
        const mastery = (evs||[]).find(e => (e.nome||"").toUpperCase().includes("MASTERY"));
        const [sqtRows, masteryRows, pianoRows] = await Promise.all([
          sqt ? sbListEventoStatus(auth.token, sqt.id) : Promise.resolve([]),
          mastery ? sbListEventoStatus(auth.token, mastery.id) : Promise.resolve([]),
          sbGetPiano(auth.token, auth.userId, pianoCiclo),
        ]);
        if (!alive) return;
        setStatusSQT(sqtRows || []);
        setStatusMastery(masteryRows || []);
        setPianoRankState(pianoRows?.[0]?.rank || "");
      } catch (e) { /* silenzioso */ }
      if (alive) setLoading(false);
    })();
    return () => { alive = false; };
  }, [auth.userId, pianoCiclo]);

  function getLeg(memberId) {
    if (memberId === auth.userId) return null;
    const pos = (positions||[]).find(p => p.member_id===memberId && p.upline_id===auth.userId);
    if (pos) return pos.team;
    const member = downline.find(m => m.id===memberId);
    const parent = member && downline.find(m => m.id===member.positioned_under);
    if (parent) return getLeg(parent.id);
    return null;
  }

  const seated = useMemo(() => {
    const count = (rows) => {
      let sinistra=0, destra=0;
      (rows||[]).filter(r=>r.ha_ticket).forEach(r => {
        const leg = getLeg(r.user_id);
        if (leg==="sinistra") sinistra++;
        else if (leg==="destra") destra++;
      });
      return { sinistra, destra };
    };
    return { sqt: count(statusSQT), mastery: count(statusMastery) };
  }, [statusSQT, statusMastery, downline, positions]);

  async function salvaPiano(rankKey) {
    setSaving(true);
    try {
      await sbSetPiano(auth.token, auth.userId, pianoCiclo, rankKey);
      setPianoRankState(rankKey);
      showToast && showToast("Rank obiettivo salvato");
    } catch (e) { showToast && showToast("Errore salvataggio", "#ef4444"); }
    setSaving(false);
  }

  const target = RANK_TARGETS.find(r => r.key === pianoRank);

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize:10, fontWeight:700, color:"var(--a2)", textTransform:"uppercase", letterSpacing:1.4, marginBottom:4 }}>Ciclo {pianoCiclo} · Ciclo d'oro</div>
        <h1 style={{ fontWeight:900, fontSize:30, color:"var(--text)", letterSpacing:-0.5 }}>Plan</h1>
        <p style={{ color:"var(--muted)", fontSize:13, marginTop:4 }}>Scegli il rank che vuoi raggiungere e vedi in tempo reale quante persone ti mancano sedute agli eventi.</p>
      </div>

      {isLeader && (
        <div style={{ display:"flex", gap:6, marginBottom:18, background:"var(--bg3)", padding:4, borderRadius:10, border:"1px solid var(--border)", width:"fit-content" }}>
          {[{id:"plan",label:"Plan"},{id:"jarvis",label:" Jarvis"}].map(t=>(
            <button key={t.id} onClick={()=>setSubTab(t.id)}
              style={{ padding:"7px 16px", borderRadius:8, border:"none", cursor:"pointer", fontSize:12, fontWeight:700, fontFamily:"inherit", background:subTab===t.id?"var(--bg4)":"transparent", color:subTab===t.id?"var(--a2)":"var(--muted)", boxShadow:subTab===t.id?"inset 0 0 0 1px var(--sidebar-border)":"none" }}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      {subTab === "jarvis" && isLeader && (
        <div style={{ background:"var(--bg2)", border:"1px solid var(--border)", borderRadius:16, padding:"2.4rem", textAlign:"center" }}>
          <div style={{ fontSize:40, marginBottom:14 }}></div>
          <div style={{ fontSize:16, fontWeight:900, color:"var(--text)", marginBottom:8 }}>Jarvis è in arrivo</div>
          <p style={{ fontSize:13, color:"var(--muted)", maxWidth:460, margin:"0 auto" }}>
            L'analisi avanzata del team — zone geografiche di forza, momentum per area, effort pianificato e suggerimenti su dove concentrarsi — è la prossima funzionalità in costruzione. Sarà visibile solo a chi è impostato come Leader, esattamente come questa sezione.
          </p>
        </div>
      )}

      {subTab === "plan" && (
        loading ? (
          <div style={{ padding:"3rem", textAlign:"center", color:"var(--border2)" }}>Caricamento…</div>
        ) : (
          <>
            <div style={{ background:"var(--bg2)", border:"1px solid var(--border)", borderRadius:16, padding:"1.4rem", marginBottom:18 }}>
              <div style={{ fontSize:13, fontWeight:800, color:"var(--text)", marginBottom:14 }}>Che rank vuoi raggiungere?</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))", gap:10 }}>
                {RANK_TARGETS.map(r => {
                  const active = pianoRank === r.key;
                  return (
                    <button key={r.key} onClick={()=>salvaPiano(r.key)} disabled={saving}
                      style={{ padding:"12px 14px", borderRadius:11, border:"2px solid "+(active?"var(--a1)":"var(--border2)"), background:active?"var(--a1-18)":"var(--bg3)", cursor:saving?"not-allowed":"pointer", textAlign:"left", transition:"all .2s" }}>
                      <div style={{ fontSize:13, fontWeight:800, color:active?"var(--a2)":"var(--text)", marginBottom:4 }}>{r.label}</div>
                      <div style={{ fontSize:10, color:"var(--muted)" }}>SQT {r.sqt}+{r.sqt} · Mastery {r.mastery}+{r.mastery}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {!target ? (
              <div style={{ textAlign:"center", padding:"2.4rem", color:"var(--border2)" }}>Scegli un rank qui sopra per vedere il tuo obiettivo</div>
            ) : (
              <>
                <div style={{ background:"var(--bg2)", border:"1px solid var(--border)", borderRadius:16, padding:"1.4rem", marginBottom:16 }}>
                  <div style={{ fontSize:13, fontWeight:800, color:"var(--a2)", marginBottom:14 }}>SQT EVENT — persone sedute</div>
                  <div style={{ display:"flex", gap:14, flexWrap:"wrap" }}>
                    <LegBlock label="Squadra Sinistra" current={seated.sqt.sinistra} target={target.sqt} color="var(--a1)" />
                    <LegBlock label="Squadra Destra"   current={seated.sqt.destra}   target={target.sqt} color="#10b981" />
                  </div>
                </div>

                <div style={{ background:"var(--bg2)", border:"1px solid var(--border)", borderRadius:16, padding:"1.4rem" }}>
                  <div style={{ fontSize:13, fontWeight:800, color:"var(--a2)", marginBottom:14 }}>THE MASTERY — persone sedute</div>
                  <div style={{ display:"flex", gap:14, flexWrap:"wrap" }}>
                    <LegBlock label="Squadra Sinistra" current={seated.mastery.sinistra} target={target.mastery} color="var(--a1)" />
                    <LegBlock label="Squadra Destra"   current={seated.mastery.destra}   target={target.mastery} color="#10b981" />
                  </div>
                </div>

                <p style={{ fontSize:11, color:"var(--border2)", marginTop:14 }}>
                  I numeri si aggiornano da soli in base a chi nel tuo team ha il ticket segnato in Eventi → Team Ticket & Logistica.
                </p>
              </>
            )}
          </>
        )
      )}
    </div>
  );
}