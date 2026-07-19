import { useState, useEffect, useMemo } from "react";

function Av({ n, c, color = "var(--a1)", size = 34 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg," + color + "," + color + "99)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: size * 0.32, boxShadow: "0 0 10px " + color + "35" }}>
      {(n || "?")[0]}{(c || "")[0]}
    </div>
  );
}

export function EventiView({ auth, allProfiles, downline, positions, showToast,
  sbListEventi,
  sbListEventoStatus, sbUpsertEventoStatus,
  onTicketCountChange }) {

  const [eventi, setEventi] = useState([]);
  const [eventoAttivo, setEventoAttivo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusMembri, setStatusMembri] = useState([]); // righe evento_membri_status per l'evento attivo

  useEffect(() => {
    if (!auth || !eventoAttivo || !sbListEventoStatus) { setStatusMembri([]); return; }
    sbListEventoStatus(auth.token, eventoAttivo).then(rows => setStatusMembri(rows || []))
      .catch(() => {});
  }, [auth, eventoAttivo]);

  async function aggiornaStatus(memberId, patch) {
    const existing = statusMembri.find(s => s.user_id === memberId) || {};
    const merged = {
      evento_id: eventoAttivo, user_id: memberId,
      ha_ticket: existing.ha_ticket || false,
      ticket_extra: existing.ticket_extra || 0,
      ticket_extra_venduti: existing.ticket_extra_venduti || 0,
      hotel: existing.hotel || false,
      viaggio: existing.viaggio || false,
      ...patch,
    };
    setStatusMembri(sm => {
      const senzaQuesta = sm.filter(s => s.user_id !== memberId);
      return [...senzaQuesta, merged];
    });
    try {
      await sbUpsertEventoStatus(auth.token, merged);
    } catch (e) { showToast("Errore: " + e.message, "#ef4444"); }
  }

  useEffect(() => {
    if (!auth) return;
    sbListEventi(auth.token).then(rows => {
      const list = rows || [];
      setEventi(list);
      if (list.length > 0 && !eventoAttivo) setEventoAttivo(list[0].id);
    }).catch(e => showToast("Errore: " + e.message, "#ef4444")).finally(() => setLoading(false));
  }, [auth]);

  function getLegForMe(memberId) {
    if (memberId === auth.userId) return null;
    const pos = (positions || []).find(p => p.member_id === memberId && p.upline_id === auth.userId);
    if (pos) return pos.team;
    const member = downline.find(m => m.id === memberId);
    const parent = member && downline.find(m => m.id === member.positioned_under);
    if (parent) return getLegForMe(parent.id);
    return null;
  }

  const [fLegEvento, setFLegEvento] = useState(""); // "" | "sinistra" | "destra"

  // Membri del mio team (io + downline) con lo stato ticket/logistica per l'evento attivo
  const membriEvento = useMemo(() => {
    const self = { id: auth.userId, nome: auth.profile?.nome || "Tu", cognome: auth.profile?.cognome || "" };
    const list = [self, ...downline];
    return list.map(m => {
      const s = statusMembri.find(x => x.user_id === m.id) || {};
      return {
        id: m.id, nome: m.nome, cognome: m.cognome, leg: getLegForMe(m.id),
        ha_ticket: s.ha_ticket || false,
        ticket_extra: s.ticket_extra || 0,
        ticket_extra_venduti: s.ticket_extra_venduti || 0,
        hotel: s.hotel || false,
        viaggio: s.viaggio || false,
      };
    });
  }, [auth, downline, positions, statusMembri]);

  const membriFiltrati = useMemo(() =>
    membriEvento.filter(m => !fLegEvento || m.leg === fLegEvento),
    [membriEvento, fLegEvento]
  );

  function statsOf(list) {
    return list.reduce((acc, m) => ({
      conTicket: acc.conTicket + (m.ha_ticket ? 1 : 0),
      hotelOk: acc.hotelOk + (m.hotel ? 1 : 0),
      viaggioOk: acc.viaggioOk + (m.viaggio ? 1 : 0),
      extraTot: acc.extraTot + (Number(m.ticket_extra) || 0),
      extraVenduti: acc.extraVenduti + (Number(m.ticket_extra_venduti) || 0),
      // "persona seduta" = il proprio ticket + ogni ticket extra effettivamente venduto (= una persona in più a sedere)
      sedute: acc.sedute + (m.ha_ticket ? 1 : 0) + (Number(m.ticket_extra_venduti) || 0),
    }), { conTicket: 0, hotelOk: 0, viaggioOk: 0, extraTot: 0, extraVenduti: 0, sedute: 0 });
  }
  const logisticaStats = useMemo(() => statsOf(membriFiltrati), [membriFiltrati]);
  const statsSinistra = useMemo(() => statsOf(membriEvento.filter(m => m.leg === "sinistra")), [membriEvento]);
  const statsDestra = useMemo(() => statsOf(membriEvento.filter(m => m.leg === "destra")), [membriEvento]);

  // notifica App.jsx col totale sedute dell'evento attivo, cosi la Dashboard resta in tempo reale
  useEffect(() => {
    if (onTicketCountChange) onTicketCountChange(logisticaStats.sedute);
  }, [logisticaStats.sedute]);

  const evCorrente = eventi.find(e => e.id === eventoAttivo);

  return (
    <div style={{ padding: "2rem 2.2rem", maxWidth: 1280, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.4rem", gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ fontWeight: 900, fontSize: 26, color: "var(--text)", letterSpacing: -0.8 }}>Eventi</h1>
      </div>

      {eventi.length === 0 && !loading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "var(--border2)" }}>
          Nessun evento disponibile al momento.
        </div>
      ) : (
        <>
          {/* Evento attivo in evidenza */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--a2)", textTransform: "uppercase", letterSpacing: 1.4, marginBottom: 4 }}>Evento in corso</div>
            <h2 style={{ fontWeight: 900, fontSize: 30, color: "var(--text)", letterSpacing: -0.5, lineHeight: 1.1 }}>{evCorrente?.nome}</h2>
          </div>

          {/* Altri eventi (compare solo se ce n'e' piu' di uno) */}
          {eventi.length > 1 && (
            <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
              {eventi.map(ev => (
                <button key={ev.id} onClick={() => setEventoAttivo(ev.id)}
                  style={{ padding: "7px 14px", borderRadius: 9, border: "1px solid " + (eventoAttivo === ev.id ? "var(--a1)" : "var(--border2)"), background: eventoAttivo === ev.id ? "var(--a1-13)" : "var(--bg3)", color: eventoAttivo === ev.id ? "var(--a2)" : "var(--muted)", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                  {ev.nome}
                </button>
              ))}
            </div>
          )}

          {/* Totale persone sedute — numero unico, coerente col resto dell'app */}
          {evCorrente && (
            <div style={{ background: "linear-gradient(135deg,var(--a1-13),var(--bg2))", border: "1px solid var(--a1-25)", borderRadius: 16, padding: "1.4rem 1.6rem", marginBottom: 18, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--a2)", textTransform: "uppercase", letterSpacing: .8, marginBottom: 4 }}>Totale persone sedute (tu + team)</div>
                <div style={{ fontSize: 34, fontWeight: 900, color: "var(--text)", lineHeight: 1 }}>{logisticaStats.sedute}</div>
              </div>
              <div style={{ display: "flex", gap: 22 }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: "var(--a1)" }}>{statsSinistra.sedute}</div>
                  <div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase" }}>Sinistra</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: "#10b981" }}>{statsDestra.sedute}</div>
                  <div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase" }}>Destra</div>
                </div>
              </div>
            </div>
          )}

          {/* Team — Ticket & Logistica */}
          {evCorrente && (
            <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 16, padding: "1.4rem", marginTop: 18 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text)" }}>Team {"\u2014"} Ticket & Logistica</div>
                <div style={{ display: "flex", gap: 6 }}>
                  {["", "sinistra", "destra"].map(f => (
                    <button key={f} onClick={() => setFLegEvento(f)}
                      style={{ padding: "5px 12px", borderRadius: 8, border: fLegEvento === f ? "1px solid #2563eb40" : "1px solid transparent", cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: "inherit", background: fLegEvento === f ? "var(--bg4)" : "var(--bg3)", color: fLegEvento === f ? "var(--a2)" : "var(--muted)" }}>
                      {f === "" ? "Tutti" : f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 10, marginBottom: 16 }}>
                {[
                  { label: "Persone sedute", value: logisticaStats.sedute, color: "var(--a2)" },
                  { label: "Con ticket proprio", value: logisticaStats.conTicket + "/" + membriFiltrati.length, color: "#10b981" },
                  { label: "Hotel ok", value: logisticaStats.hotelOk + "/" + membriFiltrati.length, color: "#8b5cf6" },
                  { label: "Viaggio ok", value: logisticaStats.viaggioOk + "/" + membriFiltrati.length, color: "#8b5cf6" },
                  { label: "Ticket extra tot.", value: logisticaStats.extraTot, color: "#f59e0b" },
                  { label: "Extra venduti", value: logisticaStats.extraVenduti, color: "#10b981" },
                ].map((k, i) => (
                  <div key={i} style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px" }}>
                    <div style={{ fontSize: 9, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: .6, marginBottom: 4 }}>{k.label}</div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: k.color }}>{k.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #11203a" }}>
                      {["Membro", "Squadra", "Ticket proprio", "Ticket extra", "Extra venduti", "Hotel", "Viaggio"].map(h => (
                        <th key={h} style={{ textAlign: "left", color: "var(--muted)", fontWeight: 700, fontSize: 10, textTransform: "uppercase", padding: "10px 14px", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {membriFiltrati.map(m => {
                      const legColor = m.leg === "sinistra" ? "var(--a1)" : m.leg === "destra" ? "#10b981" : "#6b7280";
                      return (
                      <tr key={m.id} style={{ borderBottom: "1px solid #0d1b3355" }}>
                        <td style={{ padding: "10px 14px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                            <Av n={m.nome} c={m.cognome} color={m.id === auth.userId ? "var(--a1)" : "#6b7280"} size={28} />
                            <span style={{ fontWeight: 700, fontSize: 13, color: "var(--text)" }}>{m.id === auth.userId ? "Tu" : (m.nome || "") + " " + (m.cognome || "")}</span>
                          </div>
                        </td>
                        <td style={{ padding: "10px 14px" }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: legColor }}>{m.leg ? m.leg.charAt(0).toUpperCase() + m.leg.slice(1) : "\u2014"}</span>
                        </td>
                        <td style={{ padding: "10px 14px" }}>
                          <input type="checkbox" checked={m.ha_ticket} onChange={e => aggiornaStatus(m.id, { ha_ticket: e.target.checked })} style={{ width: 18, height: 18, cursor: "pointer" }} />
                        </td>
                        <td style={{ padding: "10px 14px" }}>
                          <input type="number" min="0" value={m.ticket_extra} onChange={e => aggiornaStatus(m.id, { ticket_extra: Math.max(0, Number(e.target.value) || 0) })} style={{ width: 64, fontSize: 12, padding: "5px 8px" }} />
                        </td>
                        <td style={{ padding: "10px 14px" }}>
                          <input type="number" min="0" value={m.ticket_extra_venduti} onChange={e => aggiornaStatus(m.id, { ticket_extra_venduti: Math.max(0, Number(e.target.value) || 0) })} style={{ width: 64, fontSize: 12, padding: "5px 8px" }} />
                        </td>
                        <td style={{ padding: "10px 14px" }}>
                          <input type="checkbox" checked={m.hotel} onChange={e => aggiornaStatus(m.id, { hotel: e.target.checked })} style={{ width: 18, height: 18, cursor: "pointer" }} />
                        </td>
                        <td style={{ padding: "10px 14px" }}>
                          <input type="checkbox" checked={m.viaggio} onChange={e => aggiornaStatus(m.id, { viaggio: e.target.checked })} style={{ width: 18, height: 18, cursor: "pointer" }} />
                        </td>
                      </tr>
                    );})}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}