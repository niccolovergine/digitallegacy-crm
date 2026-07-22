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

function Donut({ current, target, color, size=118, stroke=12 }) {
  const pct = target > 0 ? Math.min(100, (current/target)*100) : 100;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * (pct/100);
  return (
    <div style={{ position:"relative", width:size, height:size, flexShrink:0 }}>
      <svg width={size} height={size} style={{ transform:"rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--bg4)" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={c} strokeDashoffset={c-dash} strokeLinecap="round"
          style={{ transition:"stroke-dashoffset .5s ease" }} />
      </svg>
      <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
        <div style={{ fontSize:22, fontWeight:900, color:"var(--text)", lineHeight:1 }}>{current}</div>
        <div style={{ fontSize:11, color:"var(--muted)", fontWeight:700, marginTop:2 }}>/ {target}</div>
      </div>
    </div>
  );
}

function LegDonut({ label, current, target, color }) {
  const mancano = Math.max(0, target - current);
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:9, flex:1, minWidth:140 }}>
      <Donut current={current} target={target} color={color} />
      <div style={{ fontSize:12, fontWeight:800, color }}>{label}</div>
      <div style={{ fontSize:11, fontWeight:700, color: mancano===0 ? "#10b981" : "var(--muted)", textAlign:"center" }}>
        {mancano===0 ? " Obiettivo raggiunto" : "Mancano " + mancano}
      </div>
    </div>
  );
}

export function PlanView({ auth, downline, positions, dlProspects, isLeader,
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
      (rows||[]).forEach(r => {
        const leg = getLeg(r.user_id);
        // "persona seduta" = il ticket proprio (se segnato) + ogni ticket extra effettivamente venduto
        const n = (r.ha_ticket ? 1 : 0) + (Number(r.ticket_extra_venduti) || 0);
        if (leg==="sinistra") sinistra += n;
        else if (leg==="destra") destra += n;
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

  // ---- JARVIS: incrocio geografia + momentum + canali di prospecting ----
  const FASI_TERMINALI = useMemo(() => new Set(["SUB","NON_INT","NON_PIACE"]), []);

  const jarvis = useMemo(() => {
    const downlineAttiva = downline.filter(m => m.attivo !== false);
    if (!dlProspects || downlineAttiva.length === 0) return null;

    const momentumPerMembro = {};
    dlProspects.forEach(p => {
      if (!FASI_TERMINALI.has(p.fase)) momentumPerMembro[p._userId] = (momentumPerMembro[p._userId]||0) + 1;
    });

    const byCity = {};
    downlineAttiva.forEach(m => {
      const citta = (m.citta||"").trim() || "Città non indicata";
      if (!byCity[citta]) byCity[citta] = { citta, membri:[], momentum:0 };
      byCity[citta].membri.push(m);
      byCity[citta].momentum += momentumPerMembro[m.id] || 0;
    });
    const cities = Object.values(byCity).sort((a,b)=> b.momentum-a.momentum || b.membri.length-a.membri.length);

    const fonteCount = {};
    dlProspects.forEach(p => { const f = p.fonte || "Altro"; fonteCount[f] = (fonteCount[f]||0) + 1; });
    const tot = dlProspects.length;
    const canali = Object.entries(fonteCount)
      .map(([fonte,n]) => ({ fonte, n, pct: tot ? Math.round((n/tot)*100) : 0 }))
      .sort((a,b) => b.n - a.n);

    return { cities, canali, totProspect: tot };
  }, [downline, dlProspects, FASI_TERMINALI]);

  const suggerimento = useMemo(() => {
    if (!jarvis || jarvis.cities.length === 0) return null;
    const top = jarvis.cities.find(c => c.citta !== "Città non indicata") || jarvis.cities[0];
    if (!top || top.membri.length === 0) return null;
    let msg = "La tua zona più forte è " + top.citta + " (" + top.membri.length + " attiv" + (top.membri.length===1?"o":"i") + ", " + top.momentum + " prospect in corso). Valuta di organizzare lì il prossimo push o tour.";
    const canaliUsati = jarvis.canali.filter(c => jarvis.totProspect >= 5); // servono almeno un po' di dati
    if (canaliUsati.length > 1) {
      const menoUsato = [...jarvis.canali].sort((a,b)=>a.pct-b.pct)[0];
      if (menoUsato && menoUsato.pct <= 15) {
        msg += " Nel team si usa poco \"" + menoUsato.fonte + "\" (solo " + menoUsato.pct + "% dei contatti) — potrebbe valere la pena spingere di più su questo canale.";
      }
    }
    return msg;
  }, [jarvis]);


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
        !jarvis || jarvis.cities.length === 0 ? (
          <div style={{ background:"var(--bg2)", border:"1px solid var(--border)", borderRadius:16, padding:"2.4rem", textAlign:"center" }}>
            <div style={{ fontSize:16, fontWeight:900, color:"var(--text)", marginBottom:8 }}>Servono più dati</div>
            <p style={{ fontSize:13, color:"var(--muted)", maxWidth:420, margin:"0 auto" }}>
              Appena il tuo team avrà membri con città indicata nel profilo e qualche prospect in corso, qui vedrai l'analisi automatica di dove concentrare gli sforzi.
            </p>
          </div>
        ) : (
          <>
            {suggerimento && (
              <div style={{ background:"var(--a1-10)", border:"1px solid var(--a1-25)", borderRadius:16, padding:"1.4rem", marginBottom:16 }}>
                <div style={{ fontSize:11, fontWeight:800, color:"var(--a2)", textTransform:"uppercase", letterSpacing:.8, marginBottom:8 }}> Suggerimento</div>
                <p style={{ fontSize:14, color:"var(--text)", lineHeight:1.5, fontWeight:600 }}>{suggerimento}</p>
              </div>
            )}

            <div style={{ background:"var(--bg2)", border:"1px solid var(--border)", borderRadius:16, padding:"1.4rem", marginBottom:16 }}>
              <div style={{ fontSize:13, fontWeight:800, color:"var(--text)", marginBottom:14 }}>Zone di forza del team</div>
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse" }}>
                  <thead>
                    <tr style={{ borderBottom:"1px solid #11203a" }}>
                      {["Città","Attivi","Prospect in corso"].map(h=>(
                        <th key={h} style={{ textAlign:"left", color:"var(--muted)", fontWeight:700, fontSize:10, textTransform:"uppercase", padding:"10px 14px" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {jarvis.cities.map((c,i) => (
                      <tr key={c.citta} style={{ borderBottom:"1px solid #0d1b3355", background:i===0?"var(--a1-10)":"transparent" }}>
                        <td style={{ padding:"10px 14px", fontWeight:700, fontSize:13, color:"var(--text)" }}>{c.citta}</td>
                        <td style={{ padding:"10px 14px", fontWeight:800, fontSize:13, color:"var(--a2)" }}>{c.membri.length}</td>
                        <td style={{ padding:"10px 14px", fontWeight:800, fontSize:13, color:"#10b981" }}>{c.momentum}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ background:"var(--bg2)", border:"1px solid var(--border)", borderRadius:16, padding:"1.4rem" }}>
              <div style={{ fontSize:13, fontWeight:800, color:"var(--text)", marginBottom:14 }}>Canali di prospecting usati dal team</div>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {jarvis.canali.map(c => (
                  <div key={c.fonte}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                      <span style={{ fontSize:12, fontWeight:700, color:"var(--text)" }}>{c.fonte}</span>
                      <span style={{ fontSize:12, fontWeight:800, color:"var(--muted)" }}>{c.n} · {c.pct}%</span>
                    </div>
                    <Bar current={c.pct} target={100} color={c.pct<=15?"#f59e0b":"var(--a1)"} />
                  </div>
                ))}
              </div>
            </div>
          </>
        )
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
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(320px,1fr))", gap:18 }}>
                  <div style={{ background:"linear-gradient(160deg,#06b6d422,var(--bg2))", border:"2px solid #06b6d445", borderRadius:18, padding:"1.6rem" }}>
                    <div style={{ fontSize:10, fontWeight:800, color:"#22d3ee", textTransform:"uppercase", letterSpacing:1.2 }}>Primo obiettivo</div>
                    <div style={{ fontSize:19, fontWeight:900, color:"var(--text)", marginBottom:18 }}>SQT EVENT</div>
                    <div style={{ display:"flex", gap:18, justifyContent:"center", flexWrap:"wrap" }}>
                      <LegDonut label="Squadra Sinistra" current={seated.sqt.sinistra} target={target.sqt} color="#22d3ee" />
                      <LegDonut label="Squadra Destra"   current={seated.sqt.destra}   target={target.sqt} color="#0ea5b0" />
                    </div>
                  </div>

                  <div style={{ background:"linear-gradient(160deg,var(--a2)22,var(--bg2))", border:"2px solid var(--a2)45", borderRadius:18, padding:"1.6rem" }}>
                    <div style={{ fontSize:10, fontWeight:800, color:"var(--a2)", textTransform:"uppercase", letterSpacing:1.2 }}>Obiettivo finale</div>
                    <div style={{ fontSize:19, fontWeight:900, color:"var(--text)", marginBottom:18 }}>THE MASTERY</div>
                    <div style={{ display:"flex", gap:18, justifyContent:"center", flexWrap:"wrap" }}>
                      <LegDonut label="Squadra Sinistra" current={seated.mastery.sinistra} target={target.mastery} color="var(--a1)" />
                      <LegDonut label="Squadra Destra"   current={seated.mastery.destra}   target={target.mastery} color="var(--a2)" />
                    </div>
                  </div>
                </div>

                <p style={{ fontSize:11, color:"var(--border2)", marginTop:14 }}>
                  I numeri si aggiornano da soli in base a chi nel tuo team ha il ticket (e quanti extra ha venduto) segnato in Eventi → Team Ticket & Logistica.
                </p>
              </>
            )}
          </>
        )
      )}
    </div>
  );
}