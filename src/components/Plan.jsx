import { useState, useEffect, useMemo } from "react";

export const RANK_TARGETS = [
  { key:"executive",              label:"Executive",               mastery:1   },
  { key:"consultant",             label:"Consultant",              mastery:3   },
  { key:"team_leader",            label:"Team Leader",             mastery:5   },
  { key:"advanced_team_leader",   label:"Advanced Team Leader",    mastery:12  },
  { key:"senior_team_leader",     label:"Senior Team Leader",      mastery:20  },
  { key:"executive_team_leader",  label:"Executive Team Leader",   mastery:35  },
  { key:"vice_president",         label:"Vice President",          mastery:75  },
  { key:"senior_vice_president",  label:"Senior Vice President",   mastery:100 },
];

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
  const [statusMastery, setStatusMastery] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const evs = await sbListEventi(auth.token);
        if (!alive) return;
        const mastery = (evs||[]).find(e => (e.nome||"").toUpperCase().includes("MASTERY"));
        const [masteryRows, pianoRows] = await Promise.all([
          mastery ? sbListEventoStatus(auth.token, mastery.id) : Promise.resolve([]),
          sbGetPiano(auth.token, auth.userId, pianoCiclo),
        ]);
        if (!alive) return;
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
    let sinistra=0, destra=0;
    (statusMastery||[]).forEach(r => {
      const leg = getLeg(r.user_id);
      // "persona seduta" = il ticket proprio (se segnato) + ogni ticket extra effettivamente venduto
      const n = (r.ha_ticket ? 1 : 0) + (Number(r.ticket_extra_venduti) || 0);
      if (leg==="sinistra") sinistra += n;
      else if (leg==="destra") destra += n;
    });
    return { sinistra, destra };
  }, [statusMastery, downline, positions]);

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
        <p style={{ color:"var(--muted)", fontSize:13, marginTop:4 }}>Scegli il rank che vuoi raggiungere e vedi in tempo reale quante persone ti mancano sedute a The Mastery.</p>
      </div>

      {loading ? (
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
                    <div style={{ fontSize:10, color:"var(--muted)" }}>Mastery {r.mastery}+{r.mastery}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {!target ? (
            <div style={{ textAlign:"center", padding:"2.4rem", color:"var(--border2)" }}>Scegli un rank qui sopra per vedere il tuo obiettivo</div>
          ) : (
            <>
              <div style={{ background:"linear-gradient(160deg,var(--a2)22,var(--bg2))", border:"2px solid var(--a2)45", borderRadius:18, padding:"1.6rem", maxWidth:460 }}>
                <div style={{ fontSize:10, fontWeight:800, color:"var(--a2)", textTransform:"uppercase", letterSpacing:1.2 }}>Obiettivo</div>
                <div style={{ fontSize:19, fontWeight:900, color:"var(--text)", marginBottom:18 }}>THE MASTERY</div>
                <div style={{ display:"flex", gap:18, justifyContent:"center", flexWrap:"wrap" }}>
                  <LegDonut label="Squadra Sinistra" current={seated.sinistra} target={target.mastery} color="var(--a1)" />
                  <LegDonut label="Squadra Destra"   current={seated.destra}   target={target.mastery} color="var(--a2)" />
                </div>
              </div>

              <p style={{ fontSize:11, color:"var(--border2)", marginTop:14 }}>
                I numeri si aggiornano da soli in base a chi nel tuo team ha il ticket (e quanti extra ha venduto) segnato in Eventi → Team Ticket & Logistica.
              </p>
            </>
          )}
        </>
      )}
    </div>
  );
}
