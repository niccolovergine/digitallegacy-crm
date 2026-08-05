import { useState, useEffect, useMemo } from "react";

const SFIDA_START = "2026-08-01";
const SFIDA_END   = "2026-09-06";

function Av({ n, c, color = "var(--a1)", size = 34 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg," + color + "," + color + "99)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: size * 0.32, boxShadow: "0 0 10px " + color + "35" }}>
      {(n || "?")[0]}{(c || "")[0]}
    </div>
  );
}

function Countdown() {
  const [left, setLeft] = useState(computeLeft());
  function computeLeft() {
    const end = new Date(SFIDA_END + "T06:00:00");
    const diff = Math.max(0, end - new Date());
    return {
      giorni: Math.floor(diff / 86400000),
      ore: Math.floor((diff % 86400000) / 3600000),
      min: Math.floor((diff % 3600000) / 60000),
    };
  }
  useEffect(() => {
    const t = setInterval(() => setLeft(computeLeft()), 30000);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{ display: "flex", gap: 18 }}>
      {[["giorni","GIORNI"],["ore","ORE"],["min","MIN"]].map(([k,l]) => (
        <div key={k} style={{ textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: "var(--text)", lineHeight: 1 }}>{left[k]}</div>
          <div style={{ fontSize: 9, color: "var(--muted)", fontWeight: 700, letterSpacing: .6 }}>{l}</div>
        </div>
      ))}
    </div>
  );
}

function Podio({ righe, unita, colore, loading }) {
  if (loading) return <div style={{ padding: "2.5rem", textAlign: "center", color: "var(--border2)", fontSize: 13 }}>Carico classifica...</div>;
  if (!righe || righe.length === 0) return <div style={{ padding: "2.5rem", textAlign: "center", color: "var(--border2)", fontSize: 13 }}>Nessun dato ancora — la sfida è appena iniziata</div>;
  const medaglie = ["\ud83e\udd47","\ud83e\udd48","\ud83e\udd49"];
  return (
    <div>
      {righe.map((r, i) => (
        <div key={r.user_id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 18px", borderBottom: i < righe.length-1 ? "1px solid #0d1b3355" : "none", background: i<3 ? colore+"08" : "transparent" }}>
          <div style={{ width: 30, fontSize: i<3?20:14, fontWeight: 900, color: i<3?colore:"var(--border2)", textAlign: "center" }}>{i<3 ? medaglie[i] : i+1}</div>
          <Av n={r.nome} c={r.cognome} color={colore} size={32} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.nome} {r.cognome||""}</div>
            {r.citta && <div style={{ fontSize: 11, color: "var(--muted)" }}>{r.citta}</div>}
          </div>
          <div style={{ fontSize: 20, fontWeight: 900, color: colore, whiteSpace: "nowrap" }}>{r[unita.key]} <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)" }}>{unita.label}</span></div>
        </div>
      ))}
    </div>
  );
}

export function SfidaView({ auth, eventi, sbGetSfidaTicket, sbGetSfidaIscrizioni, showToast }) {
  const [ticketEventoId, setTicketEventoId] = useState("");
  const [classificaTicket, setClassificaTicket] = useState([]);
  const [classificaIscrizioni, setClassificaIscrizioni] = useState([]);
  const [loadingT, setLoadingT] = useState(true);
  const [loadingI, setLoadingI] = useState(true);

  useEffect(() => {
    if (!eventi || eventi.length === 0) return;
    if (ticketEventoId) return;
    const mastery = eventi.find(e => (e.nome||"").toLowerCase().includes("mastery"));
    setTicketEventoId(mastery ? mastery.id : eventi[0].id);
  }, [eventi]);

  useEffect(() => {
    if (!auth || !ticketEventoId || !sbGetSfidaTicket) return;
    setLoadingT(true);
    sbGetSfidaTicket(auth.token, ticketEventoId)
      .then(rows => setClassificaTicket(rows || []))
      .catch(e => showToast && showToast("Errore classifica ticket: "+e.message, "#ef4444"))
      .finally(() => setLoadingT(false));
  }, [auth, ticketEventoId]);

  useEffect(() => {
    if (!auth || !sbGetSfidaIscrizioni) return;
    setLoadingI(true);
    sbGetSfidaIscrizioni(auth.token, SFIDA_START, SFIDA_END)
      .then(rows => setClassificaIscrizioni(rows || []))
      .catch(e => showToast && showToast("Errore classifica iscrizioni: "+e.message, "#ef4444"))
      .finally(() => setLoadingI(false));
  }, [auth]);

  const evCorrente = (eventi||[]).find(e => e.id === ticketEventoId);
  const miePosizioneTicket = classificaTicket.findIndex(r => r.user_id === auth.userId);
  const mieePosizioneIscrizioni = classificaIscrizioni.findIndex(r => r.user_id === auth.userId);

  return (
    <div style={{ padding: "2rem 2.2rem", maxWidth: 1180, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 22, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontWeight: 900, fontSize: 30, color: "var(--text)", letterSpacing: -0.8 }}>🏆 La Sfida</h1>
          <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 6 }}>Classifica di tutta Digital Legacy — non solo la tua downline. Vince chi è più in alto entro il 6 settembre, giorno dell'SQT Event.</p>
        </div>
        <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 14, padding: "12px 22px" }}>
          <div style={{ fontSize: 9, color: "var(--a2)", fontWeight: 700, textTransform: "uppercase", letterSpacing: .8, marginBottom: 6, textAlign: "center" }}>Tempo rimasto</div>
          <Countdown />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "1.2rem 1.4rem", borderBottom: "1px solid #11203a" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text)" }}> Top 10 — Ticket venduti</div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>Vendite personali confermate {evCorrente?" — "+evCorrente.nome:""}</div>
              </div>
              {eventi && eventi.length > 1 && (
                <select value={ticketEventoId} onChange={e=>setTicketEventoId(e.target.value)} style={{ width: "auto", fontSize: 11, padding: "5px 9px" }}>
                  {eventi.map(ev => <option key={ev.id} value={ev.id}>{ev.nome}</option>)}
                </select>
              )}
            </div>
          </div>
          <Podio righe={classificaTicket} unita={{key:"ticket_venduti",label:"ticket"}} colore="#f59e0b" loading={loadingT} />
          {mieePosizioneTicket === -1 && !loadingT && (
            <div style={{ padding: "10px 18px", fontSize: 11, color: "var(--muted)", borderTop: "1px solid #0d1b3355", textAlign: "center" }}>Non sei ancora in top 10 — continua a vendere per entrarci</div>
          )}
        </div>

        <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "1.2rem 1.4rem", borderBottom: "1px solid #11203a" }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text)" }}> Top 10 — Punti da iscrizioni</div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>CV dei pacchetti venduti personalmente, dal 1° agosto al 6 settembre</div>
          </div>
          <Podio righe={classificaIscrizioni} unita={{key:"punti",label:"pt"}} colore="#8b5cf6" loading={loadingI} />
          {mieePosizioneIscrizioni === -1 && !loadingI && (
            <div style={{ padding: "10px 18px", fontSize: 11, color: "var(--muted)", borderTop: "1px solid #0d1b3355", textAlign: "center" }}>Non sei ancora in top 10 — continua a iscrivere per entrarci</div>
          )}
        </div>
      </div>

      <div style={{ marginTop: 20, background: "linear-gradient(135deg,#f59e0b10,transparent)", border: "1px solid #f59e0b25", borderRadius: 14, padding: "1.1rem 1.4rem", fontSize: 12, color: "var(--muted)", lineHeight: 1.6 }}>
        🎯 I vincitori vengono annunciati il <b style={{color:"var(--text)"}}>6 settembre</b> all'SQT Event — le zone più rappresentate in classifica aiutano a decidere le tappe del tour di settembre.
      </div>
    </div>
  );
}
