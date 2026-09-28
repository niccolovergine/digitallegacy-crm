import { useState, useEffect, useRef, useMemo } from "react";
import { sbFetch } from "./ListaNomi";

const CHECK_RE = /[✅☑✔]/;
const NO_RE = /❌/;
const stripMarks = t => t.replace(/[✅☑✔❌️]/g, "").replace(/\?{2,}/g, "").replace(/\s{2,}/g, " ").trim();

// Legge il testo libero e lo ordina: passati (✅), in attesa (waiting), in forse (???), da chiudere, saltati (❌)
export function parseNote(text) {
  const gruppi = { passato: [], attesa: [], forse: [], daChiudere: [], saltato: [] };
  const altre = [];
  let saltaProssima = false;
  (text || "").split("\n").forEach(raw => {
    const line = raw.trim();
    if (!line) return;
    const low = line.toLowerCase();
    // "Tot:" da solo su una riga: anche la riga dopo è un totale, non una vendita
    if (saltaProssima) { saltaProssima = false; altre.push(line); return; }
    if (/^tot\b[^\d]*$/i.test(line)) { saltaProssima = true; altre.push(line); return; }
    // righe di riepilogo/situazione: non sono singole vendite
    if (/^tot\b/i.test(line) || /^\d+\s*ticket/i.test(line) || /punti mancanti/.test(low) || /\b\d+\s*(sx|dx)\b/i.test(line) || /^[-—_=]{2,}$/.test(line)) { altre.push(line); return; }
    let punti = null;
    let m = line.match(/(\d[\d.]*)\s*(cv|pt|punti)\b/i);
    if (m) punti = parseInt(m[1].replace(/\./g, ""), 10);
    else {
      m = line.match(/\((\d{2,5})\)/);
      if (m) punti = parseInt(m[1], 10);
      else { m = line.match(/^(\d{2,5})(?!\s*tick)\b/i); if (m) punti = parseInt(m[1], 10); }
    }
    const forse = /\?/.test(line) || /\bforse\b/.test(low);
    const attesa = /caricat|waiting|attesa/.test(low); // "caricati" (le vecchie note con "waiting" continuano a funzionare)
    const ok = CHECK_RE.test(line);
    const no = NO_RE.test(line);
    if (punti == null && !(forse || attesa || ok || no)) { altre.push(line); return; } // titoli e righe libere
    const item = { testo: stripMarks(line), punti: punti || 0 };
    if (no) gruppi.saltato.push(item);
    else if (attesa) gruppi.attesa.push(item);
    else if (forse) gruppi.forse.push(item);
    else if (ok) gruppi.passato.push(item);
    else gruppi.daChiudere.push(item);
  });
  const somma = a => a.reduce((s, i) => s + i.punti, 0);
  const totali = {};
  Object.keys(gruppi).forEach(k => { totali[k] = { n: gruppi[k].length, punti: somma(gruppi[k]) }; });
  return { gruppi, altre, totali };
}

const GRUPPI_UI = [
  { key: "passato",    label: "Passati",      sub: "con ✅",         color: "#10b981" },
  { key: "attesa",     label: "Caricati",     sub: "con “caricati”", color: "#3b82f6" },
  { key: "forse",      label: "In forse",     sub: "con ???",        color: "#f59e0b" },
  { key: "daChiudere", label: "Da chiudere",  sub: "senza spunta",   color: "#8b5cf6" },
  { key: "saltato",    label: "Saltati",      sub: "con ❌",         color: "#ef4444" },
];

function Riepilogo({ parsed }) {
  const [aperto, setAperto] = useState({});
  const { gruppi, totali, altre } = parsed;
  const inBallo = totali.attesa.punti + totali.forse.punti + totali.daChiudere.punti;
  const vuoto = GRUPPI_UI.every(g => totali[g.key].n === 0);
  if (vuoto) return <div style={{ padding: "1.4rem", color: "var(--border2)", fontSize: 12, lineHeight: 1.6 }}>Scrivi le righe come vuoi (es. <b>550cv alexis ✅</b>, <b>250 pol ???</b>): qui sotto le ordino in automatico.</div>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div style={{ background: "#10b98112", border: "1px solid #10b98135", borderRadius: 12, padding: "12px 14px" }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: "#10b981", textTransform: "uppercase", letterSpacing: .8 }}>Punti già passati</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: "#10b981" }}>{totali.passato.punti}</div>
        </div>
        <div style={{ background: "var(--bg3)", border: "1px solid var(--border2)", borderRadius: 12, padding: "12px 14px" }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: .8 }}>Ancora in ballo</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: "var(--text)" }}>{inBallo}</div>
        </div>
      </div>
      {GRUPPI_UI.filter(g => totali[g.key].n > 0).map(g => (
        <div key={g.key} style={{ background: "var(--bg3)", border: "1px solid " + g.color + "35", borderRadius: 12, overflow: "hidden" }}>
          <button onClick={() => setAperto(a => ({ ...a, [g.key]: !a[g.key] }))} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: g.color, flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 13, fontWeight: 800, color: "var(--text)" }}>{g.label} <span style={{ fontSize: 10, fontWeight: 600, color: "var(--muted)" }}>· {g.sub}</span></span>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>{totali[g.key].n} {totali[g.key].n === 1 ? "riga" : "righe"}</span>
            <span style={{ fontSize: 14, fontWeight: 900, color: g.color, minWidth: 54, textAlign: "right" }}>{totali[g.key].punti}</span>
            <span style={{ color: "var(--border2)", fontSize: 12 }}>{aperto[g.key] ? "▾" : "▸"}</span>
          </button>
          {aperto[g.key] && (
            <div style={{ borderTop: "1px solid #11203a", padding: "6px 14px 10px" }}>
              {gruppi[g.key].map((it, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "5px 0", fontSize: 12, borderBottom: i < gruppi[g.key].length - 1 ? "1px solid #0d1b3355" : "none" }}>
                  <span style={{ color: "var(--text)" }}>{it.testo}</span>
                  {it.punti > 0 && <span style={{ color: g.color, fontWeight: 800, whiteSpace: "nowrap" }}>{it.punti}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
      {altre.length > 0 && <div style={{ fontSize: 10, color: "var(--border2)" }}>{altre.length} righe di titolo/situazione non conteggiate</div>}
    </div>
  );
}

const fmtData = iso => iso ? new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "short" }) : "";

export function NoteView({ auth, downline, isLeader, showToast }) {
  const [tab, setTab] = useState("mie");
  const [mie, setMie] = useState([]);
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selId, setSelId] = useState(null);
  const [salvataggio, setSalvataggio] = useState("salvato");
  const [membroSel, setMembroSel] = useState(null);
  const [aperta, setAperta] = useState(null);
  const timer = useRef(null);
  const pending = useRef(null);
  const taRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    const q = sbFetch("/rest/v1/note_smart?select=*&user_id=eq." + auth.userId + "&order=updated_at.desc", { _token: auth.token })
      .then(rows => { setMie(rows || []); if ((rows || []).length) setSelId(rows[0].id); })
      .catch(e => showToast && showToast("Errore note: " + e.message, "#ef4444"));
    const t = isLeader
      ? sbFetch("/rest/v1/note_smart?select=*&user_id=neq." + auth.userId + "&order=updated_at.desc", { _token: auth.token })
          .then(rows => setTeam(rows || [])).catch(() => setTeam([]))
      : Promise.resolve();
    Promise.all([q, t]).finally(() => setLoading(false));
  }, [auth.userId]);

  const nota = mie.find(n => n.id === selId) || null;
  const parsed = useMemo(() => parseNote(nota?.contenuto || ""), [nota?.contenuto]);

  async function salvaPending() {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    const p = pending.current; if (!p) return;
    pending.current = null;
    try {
      await sbFetch("/rest/v1/note_smart?id=eq." + p.id, { method: "PATCH", _token: auth.token, body: JSON.stringify({ titolo: p.titolo, contenuto: p.contenuto, updated_at: new Date().toISOString() }) });
      setSalvataggio("salvato");
    } catch (e) { setSalvataggio("errore"); showToast && showToast("Errore salvataggio: " + e.message, "#ef4444"); }
  }
  function modifica(campi) {
    if (!nota) return;
    const nuova = { ...nota, ...campi };
    setMie(l => l.map(n => n.id === nota.id ? nuova : n));
    pending.current = { id: nota.id, titolo: nuova.titolo || "", contenuto: nuova.contenuto || "" };
    setSalvataggio("salvo…");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(salvaPending, 700);
  }
  async function nuovaNota() {
    await salvaPending();
    try {
      const res = await sbFetch("/rest/v1/note_smart", { method: "POST", _token: auth.token, body: JSON.stringify({ user_id: auth.userId, titolo: "", contenuto: "" }) });
      const r = Array.isArray(res) ? res[0] : res;
      setMie(l => [r, ...l]); setSelId(r.id); setTab("mie");
    } catch (e) { showToast && showToast("Errore: " + e.message, "#ef4444"); }
  }
  async function eliminaNota() {
    if (!nota || !window.confirm("Eliminare questa nota?")) return;
    try {
      await sbFetch("/rest/v1/note_smart?id=eq." + nota.id, { method: "DELETE", _token: auth.token });
      pending.current = null;
      const resto = mie.filter(n => n.id !== nota.id);
      setMie(resto); setSelId(resto[0]?.id || null);
    } catch (e) { showToast && showToast("Errore: " + e.message, "#ef4444"); }
  }
  async function scegli(id) { await salvaPending(); setSelId(id); }
  // aggiunge/toglie un segno a fine della riga dove hai il cursore
  function segnaRiga(marker) {
    const ta = taRef.current; if (!ta || !nota) return;
    const val = ta.value; const pos = ta.selectionStart ?? val.length;
    const start = val.lastIndexOf("\n", pos - 1) + 1;
    let end = val.indexOf("\n", pos); if (end === -1) end = val.length;
    let line = val.slice(start, end).trimEnd();
    line = line.endsWith(marker) ? line.slice(0, -marker.length).trimEnd() : line + " " + marker;
    modifica({ contenuto: val.slice(0, start) + line + val.slice(end) });
    requestAnimationFrame(() => { ta.focus(); const p = start + line.length; ta.setSelectionRange(p, p); });
  }

  const nomeMembro = id => { const m = (downline || []).find(x => x.id === id); return m ? ((m.nome || m.email || "") + " " + (m.cognome || "")).trim() : "Membro"; };
  const perMembro = useMemo(() => {
    const map = {};
    team.forEach(n => { (map[n.user_id] = map[n.user_id] || []).push(n); });
    return Object.entries(map).map(([id, note]) => ({ id, note })).sort((a, b) => new Date(b.note[0].updated_at) - new Date(a.note[0].updated_at));
  }, [team]);
  const membroCorrente = perMembro.find(m => m.id === membroSel) || perMembro[0] || null;

  const tabBtn = (id, label) => (
    <button onClick={() => setTab(id)} style={{ padding: "7px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "inherit", background: tab === id ? "var(--bg4)" : "transparent", color: tab === id ? "var(--a2)" : "var(--muted)", boxShadow: tab === id ? "inset 0 0 0 1px var(--sidebar-border)" : "none" }}>{label}</button>
  );

  return (
    <div style={{ padding: "2rem 2.2rem", maxWidth: 1280, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontWeight: 900, fontSize: 26, color: "var(--text)", letterSpacing: -0.8 }}>Note</h1>
          <p style={{ color: "var(--muted)", fontSize: 12, marginTop: 4 }}>Scrivi veloce come su Apple Note: metti ✅ sui punti passati, ??? su quelli in forse. Io li ordino.</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {isLeader && <div style={{ display: "flex", background: "var(--bg3)", borderRadius: 10, padding: 4, border: "1px solid var(--border)" }}>{tabBtn("mie", "Le mie note")}{tabBtn("team", "Note del team")}</div>}
          {tab === "mie" && <button onClick={nuovaNota} style={{ padding: "9px 18px", background: "linear-gradient(135deg,var(--a1),var(--a2))", color: "#fff", border: "none", borderRadius: 9, cursor: "pointer", fontWeight: 800, fontSize: 13 }}>+ Nuova nota</button>}
        </div>
      </div>

      {loading ? <div style={{ padding: "3rem", textAlign: "center", color: "var(--border2)" }}>Carico…</div> : tab === "mie" ? (
        mie.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--border2)" }}><p style={{ fontSize: 14, marginBottom: 6 }}>Nessuna nota ancora</p><p style={{ fontSize: 12 }}>Clicca "+ Nuova nota" per iniziare.</p></div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "230px 1fr 340px", gap: 16, alignItems: "start" }}>
            <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
              {mie.map(n => (
                <div key={n.id} onClick={() => scegli(n.id)} style={{ padding: "11px 14px", cursor: "pointer", borderBottom: "1px solid #0d1b3355", background: n.id === selId ? "var(--bg4)" : "transparent", borderLeft: n.id === selId ? "3px solid var(--a1)" : "3px solid transparent" }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{n.titolo || (n.contenuto || "").split("\n")[0] || "Nota senza titolo"}</div>
                  <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>{fmtData(n.updated_at)}</div>
                </div>
              ))}
            </div>
            {nota && (
              <>
                <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 14, padding: "1rem 1.2rem" }}>
                  <input value={nota.titolo || ""} onChange={e => modifica({ titolo: e.target.value })} placeholder="Titolo (es. Situa punti settembre)" style={{ fontSize: 16, fontWeight: 800, marginBottom: 10 }} />
                  <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <span style={{ fontSize: 10, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase" }}>Segna la riga:</span>
                    {[["✅", "✅ passato"], ["???", "❓ in forse"], ["(caricati)", "📥 caricati"]].map(([mk, lb]) => (
                      <button key={mk} onClick={() => segnaRiga(mk)} style={{ padding: "5px 11px", background: "var(--bg3)", border: "1px solid var(--border2)", borderRadius: 7, cursor: "pointer", fontSize: 11, fontWeight: 700, color: "var(--text)", fontFamily: "inherit" }}>{lb}</button>
                    ))}
                    <span style={{ marginLeft: "auto", fontSize: 10, color: salvataggio === "errore" ? "#ef4444" : "var(--border2)" }}>{salvataggio === "salvato" ? "Salvato ✓" : salvataggio}</span>
                  </div>
                  <textarea ref={taRef} value={nota.contenuto || ""} onChange={e => modifica({ contenuto: e.target.value })} placeholder={"Scrivi qui, una cosa per riga:\n550cv alexis ✅\n250 pol ???\n100 andrea"} style={{ minHeight: 420, resize: "vertical", fontSize: 14, lineHeight: 1.6, width: "100%" }} />
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                    <button onClick={eliminaNota} style={{ padding: "6px 12px", background: "#ef444415", border: "1px solid #ef444430", borderRadius: 7, color: "#f87171", cursor: "pointer", fontSize: 11, fontWeight: 800 }}>Elimina nota</button>
                  </div>
                </div>
                <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 14, padding: "1rem" }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "var(--a2)", textTransform: "uppercase", letterSpacing: .8, marginBottom: 10 }}>Riepilogo automatico</div>
                  <Riepilogo parsed={parsed} />
                </div>
              </>
            )}
          </div>
        )
      ) : (
        perMembro.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--border2)" }}><p style={{ fontSize: 14 }}>Nessuno del tuo team ha ancora scritto note</p></div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 16, alignItems: "start" }}>
            <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
              {perMembro.map(m => (
                <div key={m.id} onClick={() => { setMembroSel(m.id); setAperta(null); }} style={{ padding: "11px 14px", cursor: "pointer", borderBottom: "1px solid #0d1b3355", background: membroCorrente?.id === m.id ? "var(--bg4)" : "transparent", borderLeft: membroCorrente?.id === m.id ? "3px solid var(--a1)" : "3px solid transparent" }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text)" }}>{nomeMembro(m.id)}</div>
                  <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>{m.note.length} {m.note.length === 1 ? "nota" : "note"} · agg. {fmtData(m.note[0].updated_at)}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {membroCorrente && membroCorrente.note.map(n => {
                const p = parseNote(n.contenuto || "");
                const aperto = aperta === n.id;
                return (
                  <div key={n.id} style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 14, padding: "1rem 1.2rem" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text)" }}>{n.titolo || (n.contenuto || "").split("\n")[0] || "Nota senza titolo"}</div>
                      <div style={{ fontSize: 10, color: "var(--muted)" }}>{fmtData(n.updated_at)} · sola lettura</div>
                    </div>
                    <Riepilogo parsed={p} />
                    <button onClick={() => setAperta(aperto ? null : n.id)} style={{ marginTop: 10, background: "none", border: "none", color: "var(--a2)", cursor: "pointer", fontSize: 11, fontWeight: 700, padding: 0 }}>{aperto ? "Nascondi testo originale ▾" : "Mostra testo originale ▸"}</button>
                    {aperto && <pre style={{ marginTop: 8, whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: 12, color: "var(--muted)", background: "var(--bg3)", borderRadius: 9, padding: "10px 12px", lineHeight: 1.6 }}>{n.contenuto}</pre>}
                  </div>
                );
              })}
            </div>
          </div>
        )
      )}
    </div>
  );
}
