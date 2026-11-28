import { useState, useEffect } from "react";
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, PieChart, Pie } from "recharts";
import { TeamView } from "./components/Team";
import { ProfiloView } from "./components/Profilo";
import { ListaNomiView } from "./components/ListaNomi";
import XCView from "./components/XC.jsx";
import { EventiView, EventoPopup } from "./components/Eventi";
import { isVip } from "./vip";
import { setLang } from "./i18n";
import { Assistente } from "./components/Assistente";
import { MappaSezione } from "./components/Mappa";
import { OnboardingView } from "./components/Onboarding";

const SB_URL = "https://gyxvhnwzkhjrgpqvakfw.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd5eHZobnd6a2hqcmdwcXZha2Z3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5NTEzOTQsImV4cCI6MjA5OTUyNzM5NH0.aYAzw7j6YcBIWdBsdHq0ibZrjyyK5CZqNAcchfdQt0o";

async function sbFetch(path, opts = {}) {
  let res;
  try {
    res = await fetch(SB_URL + path, {
      ...opts,
      headers: {
        "apikey": SB_KEY,
        "Authorization": "Bearer " + (opts._token || SB_KEY),
        "Content-Type": "application/json",
        "Prefer": "return=representation",
        ...(opts.headers || {}),
      },
    });
  } catch (netErr) {
    // Qui finiscono solo i veri problemi di rete (offline, DNS, ecc.)
    throw new Error("Errore di connessione — controlla la tua rete internet e riprova");
  }
  const text = await res.text();
  if (!res.ok) {
    let e = {};
    try { e = text ? JSON.parse(text) : {}; } catch (_) { e = {}; }
    // Supabase Auth usa "msg", PostgREST usa "message": controlliamo entrambi + varianti
    const msg = e.msg || e.message || e.error_description || e.error || res.statusText || ("Errore " + res.status);
    // Se il token è scaduto, forza logout
    if (msg.toLowerCase().includes("jwt expired") || msg.toLowerCase().includes("invalid jwt") || res.status === 401) {
      // Ricarica SOLO se c'era davvero una sessione salvata da buttare: altrimenti
      // (es. link email scaduto con #access_token nell'URL) si creava un loop di ricaricamenti infinito
      const hadSession = !!localStorage.getItem("becrm_session");
      localStorage.removeItem("becrm_session");
      if (hadSession) window.location.reload();
    }
    throw new Error(msg);
  }
  return text ? JSON.parse(text) : null;
}

const sbSignUp  = (email, pw)      => sbFetch("/auth/v1/signup", { method:"POST", body:JSON.stringify({ email, password:pw }) });
const sbVerifyOtp = (email, token, type) => sbFetch("/auth/v1/verify", { method:"POST", body:JSON.stringify({ email, token, type }) });
const sbResendOtp = (email, type)  => sbFetch("/auth/v1/resend", { method:"POST", body:JSON.stringify({ email, type }) });
const sbSignIn  = (email, pw)      => sbFetch("/auth/v1/token?grant_type=password", { method:"POST", body:JSON.stringify({ email, password:pw }) });
const sbForgotPassword = (email)   => sbFetch("/auth/v1/recover", { method:"POST", body:JSON.stringify({ email }) });
const sbUpdatePasswordWithToken = (accessToken, newPassword) => sbFetch("/auth/v1/user", { method:"PUT", _token:accessToken, body:JSON.stringify({ password:newPassword }) });
const sbSignOut = (tok)            => sbFetch("/auth/v1/logout", { method:"POST", _token:tok });
const sbList    = (tok, uid)       => sbFetch("/rest/v1/prospects?select=*&order=created_at.asc&user_id=eq."+uid, { _token:tok });
const sbInsert  = (tok, row)       => sbFetch("/rest/v1/prospects", { method:"POST", _token:tok, body:JSON.stringify(row) });
const sbUpdate  = (tok, id, row)   => sbFetch("/rest/v1/prospects?id=eq."+id, { method:"PATCH", _token:tok, body:JSON.stringify(row) }).then(rows => {
  if (!rows || rows.length===0) throw new Error("Non hai i permessi per modificare questo prospect — chiedi alla tua upline di renderti Leader");
  return rows;
});
const sbDelete  = (tok, id)        => sbFetch("/rest/v1/prospects?id=eq."+id, { method:"DELETE", _token:tok }).then(rows => {
  if (!rows || rows.length===0) throw new Error("Non hai i permessi per eliminare questo prospect");
  return rows;
});

// Profile helpers
const sbGetProfile      = (tok, uid)        => sbFetch("/rest/v1/profiles?id=eq."+uid+"&select=*", { _token:tok });
const sbGetUser         = (tok)             => sbFetch("/auth/v1/user", { _token:tok });
const sbCreateProfile   = (tok, row)        => sbFetch("/rest/v1/profiles", { method:"POST", _token:tok, body:JSON.stringify(row) });
const sbUpdateProfile   = (tok, uid, row)   => sbFetch("/rest/v1/profiles?id=eq."+uid, { method:"PATCH", _token:tok, body:JSON.stringify(row) });
const sbGetDownline     = (tok)             => sbFetch("/rest/v1/profiles?select=*&positioned_under=not.is.null", { _token:tok });
const sbGetAllProfiles  = (tok)             => sbFetch("/rest/v1/profiles?select=*", { _token:tok });
const sbGetDownlineProspects = (tok, uids)  => sbFetch("/rest/v1/rpc/get_prospects_for_users", { method:"POST", _token:tok, body:JSON.stringify({ p_user_ids: uids }) });
const sbGetProfileByRef = (tok, code)       => sbFetch("/rest/v1/profiles?referral_code=eq."+code+"&select=*", { _token:tok });
const sbLinkDownline    = (tok, uid, uplineId) => sbFetch("/rest/v1/profiles?id=eq."+uid, { method:"PATCH", _token:tok, body:JSON.stringify({ upline_id:uplineId }) });
const sbPositionMember  = (tok, uid, positionedUnder) => sbFetch("/rest/v1/profiles?id=eq."+uid, { method:"PATCH", _token:tok, body:JSON.stringify({ positioned_under:positionedUnder }) });
const sbSetLeader       = (tok, memberId, value)          => sbFetch("/rest/v1/rpc/set_leader", { method:"POST", _token:tok, body:JSON.stringify({ p_member_id:memberId, p_value:value }) });
const sbSetAttivo       = (tok, memberId, value)          => sbFetch("/rest/v1/rpc/set_attivo", { method:"POST", _token:tok, body:JSON.stringify({ p_member_id:memberId, p_value:value }) });
const sbGetPositions    = (tok)             => sbFetch("/rest/v1/team_positions?select=*", { _token:tok });
const sbSetPosition     = (tok, uplineId, memberId, team) => sbFetch("/rest/v1/team_positions", { method:"POST", _token:tok, headers:{"Prefer":"resolution=merge-duplicates"}, body:JSON.stringify({ upline_id:uplineId, member_id:memberId, team }) });
const sbGetClienti      = (tok)             => sbFetch("/rest/v1/rpc/get_clienti_visibili", { method:"POST", _token:tok, body:JSON.stringify({}) });
const sbAddCliente      = (tok, row)        => sbFetch("/rest/v1/rpc/add_cliente", { method:"POST", _token:tok, body:JSON.stringify({ p_positioned_under:row.positionedUnder, p_nome:row.nome, p_cognome:row.cognome||null, p_citta:row.citta||null, p_rinnovo_tipo:"", p_rinnovo_scadenza:null, p_team:row.team||"" }) });
const sbUpdateCliente   = (tok, id, row)    => sbFetch("/rest/v1/rpc/update_cliente", { method:"POST", _token:tok, body:JSON.stringify({ p_cliente_id:id, p_nome:row.nome, p_cognome:row.cognome||null, p_citta:row.citta||null, p_rinnovo_tipo:"", p_rinnovo_scadenza:null, p_attivo:row.attivo!==false, p_team:row.team||"" }) });
const sbDeleteCliente   = (tok, id)         => sbFetch("/rest/v1/rpc/delete_cliente", { method:"POST", _token:tok, body:JSON.stringify({ p_cliente_id:id }) });

// Eventi helpers
const LUDOVICO_ID = "3eeef288-c1f0-409e-bde7-d35cf5694e7d";
const sbListEventi       = (tok)            => sbFetch("/rest/v1/eventi?select=*&order=data.desc", { _token:tok });
const sbInsertEvento     = (tok, row)       => sbFetch("/rest/v1/eventi", { method:"POST", _token:tok, body:JSON.stringify(row) });
const sbDeleteEvento     = (tok, id)        => sbFetch("/rest/v1/eventi?id=eq."+id, { method:"DELETE", _token:tok });
const sbListEventoTicket = (tok)            => sbFetch("/rest/v1/evento_ticket?select=evento,user_id", { _token:tok });
const sbAddEventoTicket  = (tok, ev, uid, by) => sbFetch("/rest/v1/evento_ticket?on_conflict=evento,user_id", { method:"POST", _token:tok, headers:{ "Prefer":"resolution=ignore-duplicates,return=minimal" }, body:JSON.stringify({ evento:ev, user_id:uid, updated_by:by }) });
const sbDelEventoTicket  = (tok, ev, uid)     => sbFetch("/rest/v1/evento_ticket?evento=eq."+ev+"&user_id=eq."+uid, { method:"DELETE", _token:tok, headers:{ "Prefer":"return=minimal" } });
const sbListXcSpill = (tok) => sbFetch("/rest/v1/xc_spillover?select=member_id,leader_id", { _token:tok });
const sbAddXcSpill = (tok, mid, lid) => sbFetch("/rest/v1/xc_spillover?on_conflict=member_id,leader_id", { method:"POST", _token:tok, headers:{ "Prefer":"resolution=ignore-duplicates,return=minimal" }, body:JSON.stringify({ member_id:mid, leader_id:lid }) });
const sbDelXcSpill = (tok, mid, lid) => sbFetch("/rest/v1/xc_spillover?member_id=eq."+mid+"&leader_id=eq."+lid, { method:"DELETE", _token:tok, headers:{ "Prefer":"return=minimal" } });
const sbListXc = (tok) => sbFetch("/rest/v1/xc_membri?select=*", { _token:tok });
const sbSaveXc = (tok, row) => sbFetch("/rest/v1/xc_membri?on_conflict=member_id", { method:"POST", _token:tok, headers:{ "Prefer":"resolution=merge-duplicates,return=minimal" }, body:JSON.stringify(row) });
const sbListEventoPersone = (tok, eventoId) => sbFetch("/rest/v1/evento_persone?select=*"+(eventoId?("&evento_id=eq."+eventoId):""), { _token:tok });
const sbGetMappaAttivi     = (tok)             => sbFetch("/rest/v1/rpc/get_mappa_attivi", { method:"POST", _token:tok, body:JSON.stringify({}) });
const sbGetMappaTicket     = (tok, eventoId)   => sbFetch("/rest/v1/rpc/get_mappa_ticket", { method:"POST", _token:tok, body:JSON.stringify({ p_evento_id:eventoId }) });
const sbGetMappaIscrizioni = (tok, start, end) => sbFetch("/rest/v1/rpc/get_mappa_iscrizioni", { method:"POST", _token:tok, body:JSON.stringify({ p_start:start, p_end:end }) });
const sbGetListaNomiTeam   = (tok, uid)        => sbFetch("/rest/v1/rpc/get_lista_nomi_for_user", { method:"POST", _token:tok, body:JSON.stringify({ p_user_id:uid }) });
const sbInsertEventoPersona = (tok, row)    => sbFetch("/rest/v1/evento_persone", { method:"POST", _token:tok, body:JSON.stringify(row) });
const sbUpdateEventoPersona = (tok, id, row) => sbFetch("/rest/v1/evento_persone?id=eq."+id, { method:"PATCH", _token:tok, body:JSON.stringify(row) });
const sbDeleteEventoPersona = (tok, id)     => sbFetch("/rest/v1/evento_persone?id=eq."+id, { method:"DELETE", _token:tok });
const sbListEventoStatus  = (tok, eventoId) => sbFetch("/rest/v1/evento_membri_status?select=*&evento_id=eq."+eventoId, { _token:tok });
const sbGetPiano = (tok, userId, ciclo) => sbFetch("/rest/v1/piani_rank?select=*&user_id=eq."+userId+"&ciclo=eq."+ciclo, { _token:tok });
const sbSetPiano = (tok, userId, ciclo, rank) => sbFetch("/rest/v1/piani_rank?on_conflict=user_id,ciclo", { method:"POST", _token:tok, headers:{ "Prefer":"resolution=merge-duplicates,return=representation" }, body:JSON.stringify({ user_id:userId, ciclo, rank }) });
const sbUpsertEventoStatus = (tok, row)     => sbFetch("/rest/v1/evento_membri_status?on_conflict=evento_id,user_id", { method:"POST", _token:tok, headers:{ "Prefer":"resolution=merge-duplicates,return=representation" }, body:JSON.stringify(row) });


function toApp(r) {
  return {
    id:r.id, nome:r.nome||"", cognome:r.cognome||"", citta:r.citta||"",
    fonte:r.fonte||"Instagram", fase:r.fase||"INVITO",
    conosciutoAt:r.conosciuto_at||"", followUp:r.follow_up||"",
    note:r.note||"", storico:r.storico||[],
    pacchetto:r.pacchetto||"", bvCustom:r.bv_custom||0,
    telefono:r.telefono||"", instagram:r.instagram||"",
    checklist:r.checklist||{kyc:false,pandadoc:false,click:false},
    interesse:r.interesse||"", statoColore:r.stato_colore||"",
    attivo:r.attivo!==false,
    chatAperta:r.chat_aperta===true,
    ticketEventoId:r.ticket_evento_id||"",
  };
}
function toDB(p, uid) {
  return {
    id:p.id, user_id:uid, nome:p.nome, cognome:p.cognome, citta:p.citta,
    fonte:p.fonte, fase:p.fase, conosciuto_at:p.conosciutoAt,
    follow_up:p.followUp||null, note:p.note, storico:p.storico,
    pacchetto:p.pacchetto||null, bv_custom:p.bvCustom||null,
    telefono:p.telefono||null, instagram:p.instagram||null,
    checklist:p.checklist||{kyc:false,pandadoc:false,click:false},
    interesse:p.interesse||null, stato_colore:p.statoColore||null,
    attivo:p.attivo!==false,
    chat_aperta:!!p.chatAperta,
    ticket_evento_id:p.ticketEventoId||null,
  };
}

const PACCHETTI = [
  { key:"starter",   label:"Starter",   bv:100  },
  { key:"standard",  label:"Standard",  bv:250  },
  { key:"premium",   label:"Premium",   bv:550  },
  { key:"signature", label:"Signature", bv:1025 },
  { key:"altro",     label:"Altro",     bv:0    },
];
function bvOfPacchetto(key, bvCustom) {
  if (key==="altro") return bvCustom||0;
  const p = PACCHETTI.find(x=>x.key===key);
  return p?p.bv:0;
}

const FASI_FUNNEL   = ["INVITO","CONOSCITIVA","FUP1","FUP2","PACK","CLOSING","SUB"];
const FASI_DASH     = ["CONOSCITIVA","FUP1","PACK","CLOSING","SUB"]; // FUP2 unito a FUP1 (è un'unica call)
const FASI_STATS    = ["INVITO","CONOSCITIVA","FUP1","PACK","CLOSING","SUB"];
const FASI_SPECIALI = ["FOLLOW_UP","NON_INT","NON_PIACE"];
const FASI          = [...FASI_FUNNEL, ...FASI_SPECIALI];
const FONTI         = ["Instagram","TikTok","Offline","Referenza","Lista Nomi","Modulo","Ripescaggio"];
const FONTE_ICO     = { Instagram:"", TikTok:"", Offline:"", Referenza:"", "Lista Nomi":"", Modulo:"", Ripescaggio:"" };
const INTERESSE     = ["Alto","Medio","Basso"];
const INTERESSE_CLR = { Alto:"#10b981", Medio:"#f59e0b", Basso:"#ef4444" };

const FASE_CLR = {
  INVITO:"#8b5cf6", CONOSCITIVA:"#7c3aed", FUP1:"#2563eb", FUP2:"#3b82f6", PACK:"var(--a2)",
  CLOSING:"#22d3ee", SUB:"#10b981", FOLLOW_UP:"#f59e0b", NON_INT:"#6b7280", NON_PIACE:"#ec4899",
};
const FASE_LABEL = {
  INVITO:"Invito", CONOSCITIVA:"Conoscitiva", FUP1:"FUP 1", FUP2:"FUP 2", PACK:"Pack",
  CLOSING:"Closing", SUB:"Iscritto", FOLLOW_UP:"Follow Up", NON_INT:"Non Int.", NON_PIACE:"Non mi piace",
};
// Colore riga in lista prospect: campo INDIPENDENTE dalla fase, si sceglie a parte.
// iscritto=verde, sparito=rosso, da risentire più avanti=giallo, iscrizione fissata=blu
const STATO_COLORE_OPTS = ["iscritto","sparito","da_risentire","iscrizione_fissata"];
const STATO_COLORE_MAP = {
  iscritto:"#10b981", sparito:"#ef4444", da_risentire:"#f59e0b", iscrizione_fissata:"#3b82f6",
};
const STATO_COLORE_LABEL = {
  iscritto:"iscritto", sparito:"sparito", da_risentire:"da risentire più avanti", iscrizione_fissata:"iscrizione fissata",
};
const ROW_TINT_LEGENDA = STATO_COLORE_OPTS.map(k=>({ colore:STATO_COLORE_MAP[k], label:STATO_COLORE_LABEL[k] }));

const CICLI = [
  [73,"2026-01-03","2026-01-31"],[74,"2026-01-31","2026-02-28"],[75,"2026-02-28","2026-03-28"],
  [76,"2026-03-28","2026-04-25"],[77,"2026-04-25","2026-05-23"],[78,"2026-05-23","2026-06-20"],
  [79,"2026-06-20","2026-07-18"],[80,"2026-07-18","2026-08-15"],[81,"2026-08-15","2026-09-12"],
  [82,"2026-09-12","2026-10-10"],[83,"2026-10-10","2026-11-07"],[84,"2026-11-07","2026-12-05"],
  [85,"2026-12-05","2027-01-02"],
];
const CICLO_CORRENTE = (() => {
  const t = new Date().toISOString().split("T")[0];
  for (const [c,s,e] of CICLI) if (t>=s && t<e) return c;
  return CICLI[CICLI.length-1][0];
})();
const CICLO_NUMS = CICLI.map(r=>r[0]).sort((a,b)=>b-a);
const CICLO_CORRENTE_DATE = CICLI.find(r=>r[0]===CICLO_CORRENTE) || CICLI[CICLI.length-1];
const CICLO_CORRENTE_INIZIO = CICLO_CORRENTE_DATE[1];
const CICLO_CORRENTE_FINE   = CICLO_CORRENTE_DATE[2];

function cicloOfDate(d) { if (!d) return null; for (const [c,s,e] of CICLI) if (d>=s && d<e) return c; return null; }
function cicloLabel(c) {
  const r = CICLI.find(x=>x[0]===Number(c));
  if (!r) return "Ciclo "+c;
  const fd = s => new Date(s+"T12:00:00").toLocaleDateString("it-IT",{day:"numeric",month:"short"});
  return fd(r[1])+" \u2013 "+fd(r[2]);
}
function cicloEndDateTime(c) {
  const r = CICLI.find(x=>x[0]===Number(c));
  if (!r) return null;
  // La data fine ciclo nel range CICLI è già il sabato di chiusura; l'orario di chiusura è le 06:00
  return new Date(r[2]+"T06:00:00");
}
function dataByCiclo(arr,c) {
  const r = CICLI.find(x=>x[0]===Number(c));
  if (!r) return [];
  return arr.filter(p=>p.conosciutoAt && p.conosciutoAt>=r[1] && p.conosciutoAt<r[2]);
}
function buildStorico(prospect, fase, dateForFase) {
  const storico = [...(prospect.storico||[])];
  const idx = FASI_FUNNEL.indexOf(fase);
  if (idx>=0) {
    for (let i=0;i<=idx;i++) {
      const f = FASI_FUNNEL[i];
      if (!storico.some(s=>s.fase===f))
        storico.push({fase:f, data:f===fase?(dateForFase||prospect.conosciutoAt):prospect.conosciutoAt});
    }
  }
  return storico.sort((a,b)=>FASI_FUNNEL.indexOf(a.fase)-FASI_FUNNEL.indexOf(b.fase));
}
function dateReached(p, fase) {
  const storico = p.storico||[];
  const idx = FASI_FUNNEL.indexOf(fase);
  if (idx<0) return null;
  // Trova, tra le fasi registrate, quella più vicina (>= fase richiesta): così "raggiunto Pack"
  // conta anche chi ha un salto diretto a Closing senza un passaggio Pack esplicito in storico.
  let best=null, bestIdx=Infinity;
  storico.forEach(s=>{
    const si=FASI_FUNNEL.indexOf(s.fase);
    if (si>=idx && si<bestIdx) { bestIdx=si; best=s.data; }
  });
  return best;
}
function reachedInCiclo(p,fase,c) {
  const d = dateReached(p,fase);
  return d ? cicloOfDate(d)===Number(c) : false;
}

function reachedEver(p,fase) {
  return dateReached(p,fase) != null;
}
function highestReached(p) {
  let best=null,bi=-1;
  (p.storico||[]).forEach(s=>{const i=FASI_FUNNEL.indexOf(s.fase);if(i>bi){bi=i;best=s.fase;}});
  return best||"INVITO";
}

const genId = () => Date.now().toString(36)+Math.random().toString(36).slice(2);
const today = () => new Date().toISOString().split("T")[0];
const isOver  = d => d && d < today();
const isToday = d => d === today();
const fmt = d => d ? new Date(d+"T12:00:00").toLocaleDateString("it-IT") : "\u2014";

function teamStats(prospects) {
  const total = prospects.length;
  const sub   = prospects.filter(p=>p.fase==="SUB").length;
  const act   = prospects.filter(p=>["CONOSCITIVA","FUP1","FUP2","PACK","CLOSING"].includes(p.fase)).length;
  const conv  = total>0 ? Math.round(sub/total*100) : 0;
  const bv    = prospects.filter(p=>p.fase==="SUB").reduce((acc,p)=>acc+bvOfPacchetto(p.pacchetto,p.bvCustom),0);
  return { total, sub, act, conv, bv };
}

const TEMI = {
  chiaro: { label:"Chiaro", preview:"linear-gradient(135deg,#6d5efc,#4f46e5)", vars:{"--bg":"#ffffff","--bg2":"#ffffff","--bg3":"#f6f7fb","--bg4":"#eef0fb","--border":"#e9ecf4","--border2":"#d7dcea","--a1":"#6d5efc","--a2":"#4f46e5","--a1-10":"#6d5efc1a","--a1-12":"#6d5efc1f","--a1-13":"#6d5efc21","--a1-18":"#6d5efc2e","--a1-25":"#6d5efc40","--a1-31":"#6d5efc4f","--text":"#0f172a","--muted":"#64748b","--muted2":"#cbd5e1","--sidebar-active":"#eef0fb","--sidebar-border":"#6d5efc33"} },
  scuro: { label:"Scuro", preview:"linear-gradient(135deg,#0b1020,#1d2850)", vars:{"--bg":"#0b1020","--bg2":"#121a30","--bg3":"#172041","--bg4":"#1d2850","--border":"#243055","--border2":"#34416b","--a1":"#8b7dff","--a2":"#7c6cf5","--a1-10":"#8b7dff1a","--a1-12":"#8b7dff1f","--a1-13":"#8b7dff21","--a1-18":"#8b7dff2e","--a1-25":"#8b7dff40","--a1-31":"#8b7dff4f","--text":"#e8ecf8","--muted":"#94a3c4","--muted2":"#475578","--sidebar-active":"#1d2850","--sidebar-border":"#8b7dff33"} },
};

function applyTema(temaKey) {
  const t = TEMI[temaKey] || TEMI.chiaro;
  const root = document.documentElement;
  root.setAttribute("data-theme", temaKey === "scuro" ? "scuro" : "chiaro");
  Object.entries(t.vars).forEach(([k,v]) => root.style.setProperty(k, v));
  document.body.style.background = t.vars["--bg"];
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
:root{
  --bg:#ffffff; --bg2:#ffffff; --bg3:#f6f7fb; --bg4:#eef0fb;
  --border:#e9ecf4; --border2:#d7dcea;
  --a1:#6d5efc; --a2:#4f46e5;
  --a1-10:#6d5efc1a; --a1-12:#6d5efc1f; --a1-13:#6d5efc21; --a1-18:#6d5efc2e; --a1-25:#6d5efc40; --a1-31:#6d5efc4f;
  --text:#0f172a; --muted:#64748b; --muted2:#cbd5e1; --glow:#6d5efc;
  --sidebar-active:#eef0fb; --sidebar-border:#6d5efc33;
}
*{box-sizing:border-box;margin:0;padding:0}
html,body,#root{height:100%;font-family:'Plus Jakarta Sans',system-ui,sans-serif}
body{background:var(--bg);color:var(--text);overflow:hidden;-webkit-font-smoothing:antialiased;letter-spacing:-.005em}
h1{letter-spacing:-.03em}
button{font-family:inherit}
.stat-wrap h1{display:none}
::-webkit-scrollbar{width:5px;height:5px}
::-webkit-scrollbar-thumb{background:var(--border2);border-radius:99px}
table{border-collapse:collapse}
input,select,textarea{background:var(--bg2);border:1px solid var(--border2);border-radius:12px;padding:9px 13px;color:var(--text);font-size:13px;font-family:'Plus Jakarta Sans',system-ui,sans-serif;outline:none;width:100%;transition:border .2s}
input:focus,select:focus,textarea:focus{border-color:var(--a1);box-shadow:0 0 0 3px var(--a1-13)}
input::placeholder,textarea::placeholder{color:var(--muted)}
select option{background:var(--bg3)}
input[type=date]::-webkit-calendar-picker-indicator{cursor:pointer}
.card-soft{box-shadow:0 1px 2px #0f172a0a,0 8px 24px -12px #0f172a1f}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes popIn{from{transform:scale(.95);opacity:0}to{transform:scale(1);opacity:1}}
@keyframes barIn{from{width:0}to{width:var(--w)}}
@keyframes pulse{0%,100%{box-shadow:0 0 14px #ef444430}50%{box-shadow:0 0 26px #ef444460}}
@keyframes spin{to{transform:rotate(360deg)}}
.kpi:hover{transform:translateY(-3px);transition:transform .25s}
.hrow:hover{background:var(--bg4)}
.pop{animation:popIn .22s cubic-bezier(.34,1.3,.64,1)}
.pulse{animation:pulse 2.5s ease-in-out infinite}
.bar{border-radius:99px;animation:barIn .8s cubic-bezier(.4,0,.2,1) forwards}
.tabbtn{padding:8px 16px;border-radius:8px;border:none;cursor:pointer;font-size:12px;font-weight:700;font-family:'Plus Jakarta Sans',system-ui,sans-serif;transition:all .2s}
.togbtn{width:34px;height:28px;border-radius:7px;border:none;cursor:pointer;font-size:13px;font-weight:900;font-family:'Plus Jakarta Sans',system-ui,sans-serif;transition:all .18s;display:flex;align-items:center;justify-content:center}
.spinner{width:18px;height:18px;border:2px solid var(--border2);border-top-color:var(--a1);border-radius:50%;animation:spin .7s linear infinite;display:inline-block}
@media(max-width:768px){
  body{overflow:auto}
  aside.sb{display:none!important}
  div.mobtop{display:flex!important}
  .kpi-grid{grid-template-columns:repeat(2,1fr)!important;gap:8px!important}
  .page-wrap{padding:1rem!important}
  .tbl-wrap{overflow-x:auto!important;-webkit-overflow-scrolling:touch}
  .modal-overlay{align-items:flex-end!important;padding:0!important}
  .modal-box{border-radius:20px 20px 0 0!important;max-height:92vh!important}
  .filt-row{flex-wrap:wrap!important}
  .filt-row>*{min-width:calc(50% - 4px)!important;flex:1 1 calc(50% - 4px)!important}
  h1.ptitle{font-size:20px!important}
  button.ass-fab{display:flex!important;bottom:20px!important}
  .toast-pos{bottom:84px!important;right:12px!important;left:12px!important;text-align:center}
  input,select,textarea{font-size:16px!important}
  main.mc{height:100dvh!important;padding-top:56px;overflow-x:hidden}
  main.mc div[style*="repeat(5"],main.mc div[style*="repeat(6"],main.mc div[style*="repeat(4"]{grid-template-columns:repeat(2,1fr)!important}
  main.mc div[style*="1.5fr 1fr"],main.mc div[style*="2fr 1fr"]{grid-template-columns:1fr!important}
  h1{font-size:22px!important}
}
div.mobtop{display:none}
.logo-d{display:none}
html[data-theme=scuro] .btn-esci{background:#3b1d24!important;color:#fca5a5!important;border-color:#7f1d1d!important}
html[data-theme=scuro] .logo-d{display:block}
html[data-theme=scuro] .logo-l{display:none}
html[data-theme=scuro] .card-soft{box-shadow:0 1px 2px #0006,0 8px 24px -12px #000a}
.tema-btn{position:fixed;top:14px;right:18px;z-index:1100;width:42px;height:42px;border-radius:99px;border:1px solid var(--border2);background:var(--bg2);color:var(--text);font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px -4px #0003;transition:transform .2s}
.tema-btn:hover{transform:scale(1.08)}
.lang-btn{right:68px}
@media(min-width:769px){.page-wrap{padding-top:3.7rem!important}}
@media(max-width:768px){.tema-btn{top:7px;right:10px;width:42px;height:42px;background:#ffffff1f;border-color:transparent;color:#fff}}
@media(max-width:768px){.lang-btn{right:58px}}
.ass-fab{display:none!important}
`;


function useIsMobile() {
  const [m,setM]=useState(typeof window!=="undefined" && window.innerWidth<=768);
  useEffect(()=>{ const f=()=>setM(window.innerWidth<=768); window.addEventListener("resize",f); return ()=>window.removeEventListener("resize",f); },[]);
  return m;
}

function Av({ n, c, color, size=34 }) {
  return (
    <div style={{width:size,height:size,borderRadius:"50%",flexShrink:0,background:color.startsWith("var(")?color:"linear-gradient(135deg,"+color+","+color+"99)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:900,fontSize:size*0.32,boxShadow:color.startsWith("var(")?"none":"0 0 10px "+color+"35"}}>
      {(n||"?")[0]}{(c||"")[0]}
    </div>
  );
}

//  AUTH SCREEN 
function AuthScreen({ onAuth }) {
  const [mode, setMode]     = useState("login");
  const [email, setEmail]   = useState("");
  const [pass, setPass]     = useState("");
  const [err, setErr]       = useState("");
  const [loading, setLoading] = useState(false);
  const [nome, setNome]       = useState("");
  const [cognome, setCognome] = useState("");
  const [remember, setRemember] = useState(true);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent]   = useState(false);
  const [recoveryToken, setRecoveryToken] = useState(null);
  const [newPass, setNewPass]     = useState("");
  const [newPass2, setNewPass2]   = useState("");
  const [resetOk, setResetOk]     = useState(false);
  const [otpCode, setOtpCode]     = useState("");
  const [otpResent, setOtpResent] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      // Salva ref con timestamp — scade dopo 30 minuti
      localStorage.setItem("pending_ref", ref);
      localStorage.setItem("pending_ref_expires", Date.now() + 10 * 60 * 1000);
      setMode("signup");
    }

    // Se arriviamo da un link "password dimenticata", Supabase mette i dati nell'hash dell'URL
    if (window.location.hash && window.location.hash.includes("type=recovery")) {
      const hashParams = new URLSearchParams(window.location.hash.slice(1));
      const at = hashParams.get("access_token");
      if (at) { setRecoveryToken(at); setMode("reset"); }
      return; // non fare l'auto-restore session in questo caso
    }

    // Se arriviamo dal link "conferma la tua email" (o un altro link Supabase con sessione valida),
    // l'hash contiene comunque un access_token valido: accediamo subito l'utente invece di
    // lasciarlo sulla schermata di login senza nessun feedback (era la causa del giro a vuoto
    // login → password dimenticata → registrati che alcuni utenti segnalavano).
    if (window.location.hash && window.location.hash.includes("access_token")) {
      const hashParams = new URLSearchParams(window.location.hash.slice(1));
      const at = hashParams.get("access_token");
      if (at) {
        (async () => {
          try {
            const user = await sbGetUser(at);
            const userId = user.id;
            let profile = await sbGetProfile(at, userId);
            if (!profile || profile.length === 0) {
              await sbCreateProfile(at, { id:userId, email:user.email });
              profile = await sbGetProfile(at, userId);
            }
            const authData = { token:at, userId, email:user.email, profile:profile?.[0]||null };
            localStorage.setItem("becrm_session", JSON.stringify(authData));
            window.history.replaceState(null, "", window.location.pathname);
            onAuth(authData);
          } catch(e) { /* link scaduto/non valido: puliamo l'indirizzo e mostriamo il normale login */ window.history.replaceState(null, "", window.location.pathname); }
        })();
        return;
      }
    }

    // Auto-restore session — ricarica sempre un profilo fresco dal server,
    // così eventuali modifiche fatte da SQL (leader, tema, upline...) si vedono subito
    const saved = localStorage.getItem("becrm_session");
    if (saved) {
      try {
        const session = JSON.parse(saved);
        if (session.token && session.userId) {
          onAuth({ token:session.token, userId:session.userId, email:session.email, profile:session.profile||null });
          sbGetProfile(session.token, session.userId).then(rows => {
            const fresh = rows?.[0];
            if (fresh) {
              onAuth({ token:session.token, userId:session.userId, email:session.email, profile:fresh });
              const updated = { ...session, profile:fresh };
              localStorage.setItem("becrm_session", JSON.stringify(updated));
            }
          }).catch(()=>{});
        }
      } catch(e) { localStorage.removeItem("becrm_session"); }
    }
  }, []);

  async function submit() {
    if (!email.trim() || !pass.trim()) { setErr("Compila email e password"); return; }
    if (mode === "signup" && (!nome.trim() || !cognome.trim())) { setErr("Compila nome e cognome"); return; }
    setLoading(true); setErr("");
    try {
      if (mode === "signup") {
        const res = await sbSignUp(email, pass);
        if (res && res.access_token) {
          const tok    = res.access_token;
          const userId = res.user.id;
          const pendingRef = localStorage.getItem("pending_ref");
          const pendingExpires = localStorage.getItem("pending_ref_expires");
          let uplineId = null;
          if (pendingRef && pendingExpires && Date.now() < Number(pendingExpires)) {
            const profiles = await sbGetProfileByRef(tok, pendingRef);
            if (profiles && profiles.length > 0) uplineId = profiles[0].id;
          }
          localStorage.removeItem("pending_ref");
          localStorage.removeItem("pending_ref_expires");
          const existing = await sbGetProfile(tok, userId);
          if (!existing || existing.length === 0) {
            await sbCreateProfile(tok, { id:userId, email, nome:nome.trim(), cognome:cognome.trim(), upline_id:uplineId, positioned_under:uplineId });
          } else {
            // Il trigger di Supabase crea già un profilo vuoto alla registrazione: lo aggiorniamo con nome/cognome/sponsor invece di riscontrare un conflitto
            await sbUpdateProfile(tok, userId, { nome:nome.trim(), cognome:cognome.trim(), upline_id:uplineId, positioned_under:uplineId });
          }
          const profile = await sbGetProfile(tok, userId);
          const authData = { token:tok, userId, email, profile:profile?.[0]||null };
          if (remember) localStorage.setItem("becrm_session", JSON.stringify(authData));
          onAuth(authData);
        } else {
          setMode("verify-otp");
        }
      } else {
        const res = await sbSignIn(email, pass);
        if (res && res.access_token) {
          const tok    = res.access_token;
          const userId = res.user.id;
          let profile  = await sbGetProfile(tok, userId);
          if (!profile || profile.length === 0) {
            await sbCreateProfile(tok, { id:userId, email });
            profile = await sbGetProfile(tok, userId);
          }
          const authData = { token:tok, userId, email, profile:profile?.[0]||null };
          if (remember) localStorage.setItem("becrm_session", JSON.stringify(authData));
          onAuth(authData);
        } else {
          setErr("Credenziali non valide");
        }
      }
    } catch(e) { setErr(e.message||"Errore di connessione"); }
    setLoading(false);
  }

  async function verifyOtp() {
    if (!otpCode.trim()) { setErr("Inserisci il codice ricevuto via email"); return; }
    setLoading(true); setErr("");
    try {
      const res = await sbVerifyOtp(email, otpCode.trim(), "signup");
      if (res && res.access_token) {
        const tok    = res.access_token;
        const userId = res.user.id;
        const pendingRef = localStorage.getItem("pending_ref");
        const pendingExpires = localStorage.getItem("pending_ref_expires");
        let uplineId = null;
        if (pendingRef && pendingExpires && Date.now() < Number(pendingExpires)) {
          const profiles = await sbGetProfileByRef(tok, pendingRef);
          if (profiles && profiles.length > 0) uplineId = profiles[0].id;
        }
        localStorage.removeItem("pending_ref");
        localStorage.removeItem("pending_ref_expires");
        let profile = await sbGetProfile(tok, userId);
        if (!profile || profile.length === 0) {
          await sbCreateProfile(tok, { id:userId, email, nome:nome.trim(), cognome:cognome.trim(), upline_id:uplineId, positioned_under:uplineId });
        } else {
          // Il trigger di Supabase crea già un profilo vuoto alla registrazione: lo aggiorniamo con nome/cognome/sponsor
          await sbUpdateProfile(tok, userId, { nome:nome.trim(), cognome:cognome.trim(), upline_id:uplineId, positioned_under:uplineId });
        }
        profile = await sbGetProfile(tok, userId);
        const authData = { token:tok, userId, email, profile:profile?.[0]||null };
        if (remember) localStorage.setItem("becrm_session", JSON.stringify(authData));
        onAuth(authData);
      } else {
        setErr("Codice non valido");
      }
    } catch(e) { setErr(e.message||"Codice non valido o scaduto — prova a rinviarlo"); }
    setLoading(false);
  }

  async function resendOtp() {
    setLoading(true); setErr("");
    try {
      await sbResendOtp(email, "signup");
      setOtpResent(true);
      setTimeout(()=>setOtpResent(false), 5000);
    } catch(e) { setErr(e.message||"Errore nel reinvio"); }
    setLoading(false);
  }

  async function sendForgotEmail() {
    if (!forgotEmail.trim()) { setErr("Inserisci la tua email"); return; }
    setLoading(true); setErr("");
    try {
      await sbForgotPassword(forgotEmail.trim());
      setForgotSent(true);
    } catch(e) { setErr(e.message||"Errore di connessione"); }
    setLoading(false);
  }

  async function submitNewPassword() {
    if (!newPass.trim() || newPass.length < 6) { setErr("La password deve avere almeno 6 caratteri"); return; }
    if (newPass !== newPass2) { setErr("Le due password non coincidono"); return; }
    setLoading(true); setErr("");
    try {
      await sbUpdatePasswordWithToken(recoveryToken, newPass);
      setResetOk(true);
      window.history.replaceState(null, "", window.location.pathname); // pulisce l'hash dall'URL
    } catch(e) { setErr(e.message||"Errore di connessione"); }
    setLoading(false);
  }

  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"var(--bg)",padding:16}}>
      <div className="pop" style={{width:"100%",maxWidth:400,background:"var(--bg2)",border:"1px solid var(--border2)",borderRadius:20,padding:"2.2rem",boxShadow:"0 20px 70px #0f172a55"}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{fontWeight:900,fontSize:20,color:"var(--text)",letterSpacing:-0.5}}>Digital Legacy CRM</div>
        </div>
        <div style={{display:"flex",background:"var(--bg3)",borderRadius:10,padding:4,marginBottom:24,border:"1px solid var(--border)"}}>
          {mode!=="forgot" && mode!=="reset" && mode!=="verify-otp" && ["login","signup"].map(m=>(
            <button key={m} onClick={()=>{setMode(m);setErr("");}} className="tabbtn"
              style={{flex:1,background:mode===m?"var(--bg4)":"transparent",color:mode===m?"var(--a2)":"var(--muted)",boxShadow:mode===m?"inset 0 0 0 1px var(--sidebar-border)":"none"}}>
              {m==="login"?"Accedi":"Registrati"}
            </button>
          ))}
          {mode==="forgot" && <div style={{flex:1,textAlign:"center",padding:"7px 0",fontSize:12,fontWeight:700,color:"var(--a2)"}}>Recupera password</div>}
          {mode==="reset" && <div style={{flex:1,textAlign:"center",padding:"7px 0",fontSize:12,fontWeight:700,color:"var(--a2)"}}>Nuova password</div>}
          {mode==="verify-otp" && <div style={{flex:1,textAlign:"center",padding:"7px 0",fontSize:12,fontWeight:700,color:"var(--a2)"}}>Conferma email</div>}
        </div>

        {mode==="verify-otp" ? (
          <>
            <div style={{fontSize:13,color:"var(--text)",marginBottom:18,lineHeight:1.6,textAlign:"center"}}>
              Ti abbiamo mandato un codice a 6 cifre a <b>{email}</b>.<br/>Controlla anche lo spam, e inseriscilo qui sotto.
            </div>
            <div style={{marginBottom:16}}>
              <label style={{fontSize:11,fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:.8,marginBottom:5,display:"block"}}>Codice</label>
              <input value={otpCode} onChange={e=>setOtpCode(e.target.value.replace(/\D/g,"").slice(0,8))} placeholder="12345678" inputMode="numeric" maxLength={8}
                style={{textAlign:"center",fontSize:20,letterSpacing:6,fontWeight:800}} onKeyDown={e=>e.key==="Enter"&&verifyOtp()} />
            </div>
            {err && <div style={{background:"#ef444415",border:"1px solid #ef444435",borderRadius:9,padding:"9px 13px",fontSize:12,color:"#dc2626",marginBottom:14,lineHeight:1.5}}>{err}</div>}
            <button onClick={verifyOtp} disabled={loading}
              style={{width:"100%",padding:"11px",background:"linear-gradient(135deg,var(--a1),var(--a2))",color:"#fff",border:"none",borderRadius:10,cursor:loading?"not-allowed":"pointer",fontWeight:800,fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",gap:8,opacity:loading?0.7:1}}>
              {loading && <span className="spinner" />}
              Conferma
            </button>
            <div style={{textAlign:"center",marginTop:16,fontSize:11,color:"var(--muted)"}}>
              {otpResent
                ? <span style={{color:"#10b981",fontWeight:700}}>Codice rinviato ✓</span>
                : <span onClick={resendOtp} style={{color:"var(--a2)",cursor:"pointer",fontWeight:700}}>Non hai ricevuto il codice? Rinvia</span>
              }
            </div>
            <div style={{textAlign:"center",marginTop:10,fontSize:11,color:"var(--muted)"}}>
              <span onClick={()=>{setMode("login");setErr("");setOtpCode("");}} style={{color:"var(--muted)",cursor:"pointer"}}> Torna al login</span>
            </div>
          </>
        ) : mode==="reset" ? (
          resetOk ? (
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:13,color:"var(--text)",marginBottom:18,lineHeight:1.6}}>Password aggiornata! Ora puoi accedere con quella nuova.</div>
              <button onClick={()=>{setMode("login");setResetOk(false);setNewPass("");setNewPass2("");}}
                style={{width:"100%",padding:"11px",background:"linear-gradient(135deg,var(--a1),var(--a2))",color:"#fff",border:"none",borderRadius:10,cursor:"pointer",fontWeight:800,fontSize:14}}>
                Vai al login
              </button>
            </div>
          ) : (
            <>
              <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:16}}>
                <div>
                  <label style={{fontSize:11,fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:.8,marginBottom:5,display:"block"}}>Nuova password</label>
                  <input type="password" value={newPass} onChange={e=>setNewPass(e.target.value)} placeholder="••••••••" onKeyDown={e=>e.key==="Enter"&&submitNewPassword()} />
                </div>
                <div>
                  <label style={{fontSize:11,fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:.8,marginBottom:5,display:"block"}}>Ripeti password</label>
                  <input type="password" value={newPass2} onChange={e=>setNewPass2(e.target.value)} placeholder="••••••••" onKeyDown={e=>e.key==="Enter"&&submitNewPassword()} />
                </div>
              </div>
              {err && <div style={{background:"#ef444415",border:"1px solid #ef444435",borderRadius:9,padding:"9px 13px",fontSize:12,color:"#dc2626",marginBottom:14,lineHeight:1.5}}>{err}</div>}
              <button onClick={submitNewPassword} disabled={loading}
                style={{width:"100%",padding:"11px",background:"linear-gradient(135deg,var(--a1),var(--a2))",color:"#fff",border:"none",borderRadius:10,cursor:loading?"not-allowed":"pointer",fontWeight:800,fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",gap:8,opacity:loading?0.7:1}}>
                {loading && <span className="spinner" />}
                Salva nuova password
              </button>
            </>
          )
        ) : mode==="forgot" ? (
          forgotSent ? (
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:13,color:"var(--text)",marginBottom:18,lineHeight:1.6}}>Ti abbiamo mandato una email a <b>{forgotEmail}</b> con il link per reimpostare la password. Controlla anche lo spam.</div>
              <button onClick={()=>{setMode("login");setForgotSent(false);setForgotEmail("");setErr("");}}
                style={{width:"100%",padding:"11px",background:"var(--bg4)",color:"var(--a2)",border:"1px solid var(--border2)",borderRadius:10,cursor:"pointer",fontWeight:800,fontSize:14}}>
                Torna al login
              </button>
            </div>
          ) : (
            <>
              <div style={{marginBottom:16}}>
                <label style={{fontSize:11,fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:.8,marginBottom:5,display:"block"}}>Email</label>
                <input type="email" value={forgotEmail} onChange={e=>setForgotEmail(e.target.value)} placeholder="tua@email.com" onKeyDown={e=>e.key==="Enter"&&sendForgotEmail()} />
              </div>
              {err && <div style={{background:"#ef444415",border:"1px solid #ef444435",borderRadius:9,padding:"9px 13px",fontSize:12,color:"#dc2626",marginBottom:14,lineHeight:1.5}}>{err}</div>}
              <button onClick={sendForgotEmail} disabled={loading}
                style={{width:"100%",padding:"11px",background:"linear-gradient(135deg,var(--a1),var(--a2))",color:"#fff",border:"none",borderRadius:10,cursor:loading?"not-allowed":"pointer",fontWeight:800,fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",gap:8,opacity:loading?0.7:1}}>
                {loading && <span className="spinner" />}
                Invia link di recupero
              </button>
              <div style={{textAlign:"center",marginTop:16,fontSize:11,color:"var(--muted)"}}>
                <span onClick={()=>{setMode("login");setErr("");}} style={{color:"var(--a2)",cursor:"pointer",fontWeight:700}}> Torna al login</span>
              </div>
            </>
          )
        ) : (
        <>
        <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:16}}>
          {mode==="signup" && (
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div>
                <label style={{fontSize:11,fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:.8,marginBottom:5,display:"block"}}>Nome *</label>
                <input value={nome} onChange={e=>setNome(e.target.value)} placeholder="Luigi" />
              </div>
              <div>
                <label style={{fontSize:11,fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:.8,marginBottom:5,display:"block"}}>Cognome *</label>
                <input value={cognome} onChange={e=>setCognome(e.target.value)} placeholder="Rossi" />
              </div>
            </div>
          )}
          <div>
            <label style={{fontSize:11,fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:.8,marginBottom:5,display:"block"}}>Email</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="tua@email.com" onKeyDown={e=>e.key==="Enter"&&submit()} />
          </div>
          <div>
            <label style={{fontSize:11,fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:.8,marginBottom:5,display:"block"}}>Password</label>
            <input type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="••••••••" onKeyDown={e=>e.key==="Enter"&&submit()} />
          </div>
        </div>
        {err && <div style={{background:"#ef444415",border:"1px solid #ef444435",borderRadius:9,padding:"9px 13px",fontSize:12,color:"#dc2626",marginBottom:14,lineHeight:1.5}}>{err}</div>}

        {mode==="login" && (
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
            <div style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}} onClick={()=>setRemember(r=>!r)}>
              <div style={{width:18,height:18,borderRadius:5,border:"1.5px solid "+(remember?"var(--a1)":"var(--border2)"),background:remember?"var(--a1)":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all .2s"}}>
                {remember && <span style={{color:"#fff",fontSize:11,fontWeight:900}}></span>}
              </div>
              <span style={{fontSize:12,color:"var(--muted)",userSelect:"none"}}>Ricordami</span>
            </div>
            <span onClick={()=>{setMode("forgot");setErr("");setForgotEmail(email);}} style={{fontSize:12,color:"var(--a2)",cursor:"pointer",fontWeight:700}}>Password dimenticata?</span>
          </div>
        )}
        <button onClick={submit} disabled={loading}
          style={{width:"100%",padding:"11px",background:"linear-gradient(135deg,var(--a1),var(--a2))",color:"#fff",border:"none",borderRadius:10,cursor:loading?"not-allowed":"pointer",fontWeight:800,fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",gap:8,opacity:loading?0.7:1}}>
          {loading && <span className="spinner" />}
          {mode==="login"?"Accedi":"Crea account"}
        </button>
        {mode==="login" && (
          <div style={{textAlign:"center",marginTop:16,fontSize:11,color:"var(--muted)"}}>
            Non hai un account?{" "}
            <span onClick={()=>{setMode("signup");setErr("");}} style={{color:"var(--a2)",cursor:"pointer",fontWeight:700}}>Registrati</span>
          </div>
        )}
        </>
        )}
      </div>
    </div>
  );
}

//  APP 
export default function App() {
  const [auth, setAuth]           = useState(null);
  const [data, setData]           = useState([]);
  const [view, setView]           = useState("lista");
  const [dashCiclo, setDashCiclo] = useState(CICLO_CORRENTE);
  const [modal, setModal]         = useState(null);
  const [sel, setSel]             = useState(null);
  const [form, setForm]           = useState({});
  const [toast, setToast]         = useState(null);
  const [search, setSearch]       = useState("");
  const [fFase, setFFase]         = useState("");
  const [fFonte, setFFonte]       = useState("");
  const [fCiclo, setFCiclo]       = useState("");
  const [fSituazione, setFSituazione] = useState("processo"); // processo | iscritto | riprendere | balzato | tutti
  const [ready, setReady]         = useState(false);
  const [saving, setSaving]       = useState(false);
  const [downline, setDownline]   = useState([]);
  const [clienti, setClienti]     = useState([]);
  const [eventi, setEventi]       = useState([]);
  const [allProfiles, setAllProfiles] = useState([]);
  const [ticketVendutiCount, setTicketVendutiCount] = useState(0);
  const [ticketRows, setTicketRows] = useState([]);
  const [xcRows, setXcRows] = useState([]);
  const [xcSpill, setXcSpill] = useState([]);
  const sonoLeader = !!(auth && (auth.profile?.is_leader || auth.userId===LUDOVICO_ID));
  const [ticketPronti, setTicketPronti] = useState(false);
  const [dlProspects, setDlProspects] = useState([]);
  const [positions, setPositions] = useState([]);
  const [dashMode, setDashMode]   = useState("personale");
  const [statTab, setStatTab]     = useState("dash");
  const [showAss, setShowAss]     = useState(false);
  const [menuOpen, setMenuOpen]   = useState(false);
  const [sidebarMode, setSidebarMode] = useState("tutti");
  const [scuro, setScuro] = useState(()=>{ try { return localStorage.getItem("dl_tema")==="scuro"; } catch { return false; } });
  const [inglese, setInglese] = useState(()=>{ try { return localStorage.getItem("dl_lang")==="en"; } catch { return false; } });
  useEffect(()=>{
    setLang(inglese ? "en" : "it");
    try { localStorage.setItem("dl_lang", inglese ? "en" : "it"); } catch {}
  },[inglese]);
  const [fAmbito, setFAmbito] = useState("tutti"); // tutti | solo | sinistra | destra
  const [fMembroTeam, setFMembroTeam] = useState(""); // "" | id membro — solo per vista Team

  useEffect(()=>{
    const el=document.createElement("style");
    el.textContent=CSS;
    document.head.appendChild(el);
    return ()=>document.head.removeChild(el);
  },[]);
  useEffect(()=>{
    applyTema(scuro ? "scuro" : "chiaro");
    try { localStorage.setItem("dl_tema", scuro ? "scuro" : "chiaro"); } catch {}
  },[scuro]);

  useEffect(()=>{
    // Tema bloccato su "nero" per tutti — il selettore è stato rimosso dal Profilo
  },[auth?.profile?.tema]);

  useEffect(()=>{
    if (!auth) { setData([]); setReady(true); return; }
    setReady(false);
    sbList(auth.token, auth.userId).then(rows=>{
      const arr=(rows||[]).map(r=>{
        const p=toApp(r);
        if (!p.storico.length) p.storico=buildStorico(p,p.fase,p.conosciutoAt);
        return p;
      });
      setData(arr);
    }).catch(e=>showToast("Errore: "+e.message,"#ef4444")).finally(()=>setReady(true));

    // Load downline ricorsiva + posizioni
    Promise.all([
      sbGetAllProfiles(auth.token),
      sbGetPositions(auth.token).catch(()=>[]),
    ]).then(async ([allProfilesRows, allPositions]) => {
      const all = allProfilesRows || [];
      const pos = allPositions || [];
      setAllProfiles(all);
      setPositions(pos);
      function buildFullDownline(parentId) {
        const result = [];
        function collect(pid) {
          const children = all.filter(p => p.positioned_under === pid);
          children.forEach(child => { result.push(child); collect(child.id); });
        }
        collect(parentId);
        return result;
      }
      const posizionati = buildFullDownline(auth.userId);
      // Aggiungi anche chi ha upline_id = me ma non è ancora posizionato (in attesa)
      const inAttesaIds = new Set(posizionati.map(p=>p.id));
      const inAttesa = all.filter(p => 
        p.upline_id === auth.userId && 
        !p.positioned_under && 
        !inAttesaIds.has(p.id)
      );
      const mine = [...posizionati, ...inAttesa];
      setDownline(mine);
      try {
        const cl = await sbGetClienti(auth.token);
        setClienti((cl||[]).map(r=>({id:r.id,nome:r.nome,cognome:r.cognome||"",citta:r.citta||"",positionedUnder:r.positioned_under,attivo:r.attivo!==false,team:r.team||""})));
      } catch(e) { /* tabella clienti non ancora creata o errore permessi: non bloccare il resto */ }
      try {
        const ev = await sbListEventi(auth.token);
        setEventi((ev||[]).filter(e => !(e.nome||"").toUpperCase().includes("SQT")));
      } catch(e) { /* non bloccare il resto se fallisce */ }
      if (mine.length > 0) {
        const uids = mine.map(p => p.id);
        const dp = await sbGetDownlineProspects(auth.token, uids);
        setDlProspects((dp||[]).map(r=>({...toApp(r), _userId:r.user_id})));
      }
    }).catch(()=>{});
  },[auth]);

  useEffect(()=>{
    if (!auth) { setTicketRows([]); return; }
    sbListEventoTicket(auth.token).then(rows=>setTicketRows(rows||[])).catch(()=>{}).finally(()=>setTicketPronti(true));
  },[auth]);
  useEffect(()=>{
    const myTeamIds = new Set([auth?.userId, ...downline.map(d=>d.id)]);
    setTicketVendutiCount(ticketRows.filter(r => r.evento==="global-mission" && myTeamIds.has(r.user_id)).length);
  },[ticketRows, downline, auth]);
  useEffect(()=>{
    if (!auth || !sonoLeader) { setXcRows([]); return; }
    sbListXc(auth.token).then(r=>setXcRows(r||[])).catch(()=>{});
    sbListXcSpill(auth.token).then(r=>setXcSpill(r||[])).catch(()=>{});
  },[auth, sonoLeader]);
  async function spillXc(memberId, value) {
    const prima = xcSpill;
    setXcSpill(r => value ? [...r.filter(x=>!(x.member_id===memberId&&x.leader_id===auth.userId)), { member_id:memberId, leader_id:auth.userId }] : r.filter(x=>!(x.member_id===memberId&&x.leader_id===auth.userId)));
    try { if (value) await sbAddXcSpill(auth.token, memberId, auth.userId); else await sbDelXcSpill(auth.token, memberId, auth.userId); }
    catch(e) { setXcSpill(prima); showToast("Non salvato: "+e.message,"#ef4444"); }
  }
  async function salvaXc(memberId, row) {
    const prima = xcRows;
    const nuovo = { member_id:memberId, affiliate:!!row.affiliate, etoro:!!row.etoro, etoro_data:row.etoro_data||null, etoro_pagato:!!row.etoro_pagato, etoro_livello_pagato:row.etoro_livello_pagato?Number(row.etoro_livello_pagato):null, email:(row.email||"").trim()||null, broker:!!row.broker, broker_nome:row.broker_nome||null, broker_data:row.broker_data||null, sponsor_xc:row.sponsor_xc||null, controllato:!!row.controllato };
    setXcRows(r=>[...r.filter(x=>x.member_id!==memberId), nuovo]);
    try { await sbSaveXc(auth.token, { ...nuovo, updated_by:auth.userId, updated_at:new Date().toISOString() }); }
    catch(e) { setXcRows(prima); showToast("Non salvato: "+e.message,"#ef4444"); }
  }
  async function toggleTicket(evento, uid, value) {
    const prima = ticketRows;
    setTicketRows(r => value ? [...r.filter(x=>!(x.evento===evento&&x.user_id===uid)), { evento, user_id:uid }] : r.filter(x=>!(x.evento===evento&&x.user_id===uid)));
    try {
      if (value) await sbAddEventoTicket(auth.token, evento, uid, auth.userId);
      else await sbDelEventoTicket(auth.token, evento, uid);
    } catch(e) { setTicketRows(prima); showToast("Non salvato: "+e.message,"#ef4444"); }
  }

  function isMyDownline(profile, myId, allProfiles) {
    if (profile.positioned_under === myId) return true;
    if (!profile.positioned_under) return false;
    const parent = allProfiles.find(p=>p.id===profile.positioned_under);
    if (!parent) return false;
    return isMyDownline(parent, myId, allProfiles);
  }

  function showToast(msg,color="#22d3ee") { setToast({msg,color}); setTimeout(()=>setToast(null),2800); }
  function updateLocalProspect(upd) {
    if (data.find(x=>x.id===upd.id)) {
      setData(d=>d.map(x=>x.id===upd.id?upd:x));
    } else {
      setDlProspects(d=>d.map(x=>x.id===upd.id?{...upd,_userId:x._userId,_ownerName:x._ownerName}:x));
    }
    setSel(upd);
  }

  function getProspectById(id) {
    return data.find(x=>x.id===id) || dlProspects.find(x=>x.id===id);
  }

  function getOwnerToken() { return auth.token; }
  function openAdd()    { setForm({fase:"INVITO",fonte:"Instagram",conosciutoAt:today()}); setModal("add"); }
  function openAddForMember(memberId) { setForm({fase:"INVITO",fonte:"Instagram",conosciutoAt:today(),_userId:memberId}); setModal("add"); }
  function openAddCliente() { setForm({}); setModal("cliente"); }
  function openAddMembro()  { setForm({}); setModal("membro"); }
  function openDetail(p){ setSel(p); setModal("detail"); }
  function closeModal() { setModal(null); setSel(null); setForm({}); }

  async function handleLogout() {
    try { await sbSignOut(auth.token); } catch(e){}
    localStorage.removeItem("becrm_session");
    setAuth(null); setData([]); setReady(true);
    setDlProspects([]); setDownline([]); setPositions([]); setAllProfiles([]); setClienti([]); setEventi([]);
  }

  async function saveForm() {
    if (!form.nome?.trim()) return;
    if (form.fase === "SUB" && !form.pacchetto) { showToast("Seleziona il pacchetto per un iscritto ", "#ef4444"); return; }
    if (modal==="add") {
      const nomeNorm=form.nome.trim().toLowerCase();
      const cognomeNorm=(form.cognome||"").trim().toLowerCase();
      const tuttiIProspect=[...data,...(dlProspects||[])];
      const dup=tuttiIProspect.find(p=>(p.nome||"").trim().toLowerCase()===nomeNorm && (p.cognome||"").trim().toLowerCase()===cognomeNorm);
      if (dup) {
        const isMio=data.some(p=>p.id===dup.id);
        const ownerLabel = isMio ? "te" : (()=>{ const m=downline.find(x=>x.id===dup._userId); return m?(m.nome||m.email)+" "+(m.cognome||""):"qualcun altro"; })();
        const proceed=window.confirm("Prospect \""+form.nome+" "+(form.cognome||"")+"\" risulta già presente (di "+ownerLabel+"). Vuoi aggiungerlo comunque?");
        if (!proceed) return;
      }
    }
    setSaving(true);
    try {
      const conosciutoAt = form.conosciutoAt||today();
      const storico = buildStorico({...form,conosciutoAt},form.fase,conosciutoAt);
      const record  = {...form,conosciutoAt,storico};
      // usa l'owner originale se è un prospect del team, altrimenti auth.userId
      const ownerId = form._userId || auth.userId;
      if (modal==="add") {
        const np={...record,id:genId()};
        await sbInsert(auth.token,toDB(np,ownerId));
        if (ownerId === auth.userId) {
          setData(d=>[...d,np]);
        } else {
          setDlProspects(d=>[...d,{...np,_userId:ownerId}]);
        }
        showToast("Prospect aggiunto ");
      } else {
        await sbUpdate(auth.token,record.id,toDB(record,ownerId));
        // aggiorna in data (personali) o dlProspects (team)
        if (data.find(p=>p.id===record.id)) {
          setData(d=>d.map(p=>p.id===record.id?record:p));
        } else {
          setDlProspects(d=>d.map(p=>p.id===record.id?{...record,_userId:ownerId,_ownerName:p._ownerName}:p));
        }
        showToast("Aggiornato ");
      }
    } catch(e) { showToast("Errore: "+e.message,"#ef4444"); }
    setSaving(false); closeModal();
  }

  async function deleteProp(id) {
    try {
      await sbDelete(auth.token,id);
      setData(d=>d.filter(p=>p.id!==id));
      showToast("Rimosso","#ef4444");
    } catch(e) { showToast("Errore: "+e.message,"#ef4444"); }
    closeModal();
  }

  async function addMembroQuick(membroForm) {
    if (!membroForm.nome?.trim()) { showToast("Inserisci almeno il nome","#ef4444"); return null; }
    if (!membroForm.email?.trim()) { showToast("Inserisci l'email","#ef4444"); return null; }
    setSaving(true);
    const positionedUnder = membroForm._userId || auth.userId;
    const randomPass = Math.random().toString(36).slice(-8) + "A1!";
    try {
      const res = await sbSignUp(membroForm.email.trim(), randomPass);
      if (!res || !res.access_token) {
        showToast("Per usare questa funzione serve disattivare \"Confirm email\" nelle impostazioni Auth di Supabase","#ef4444");
        setSaving(false);
        return null;
      }
      const newTok = res.access_token;
      const newUserId = res.user.id;
      const payload = { nome:membroForm.nome.trim(), cognome:(membroForm.cognome||"").trim(), upline_id:positionedUnder, positioned_under:positionedUnder };
      const existing = await sbGetProfile(newTok, newUserId);
      if (!existing || existing.length === 0) {
        await sbCreateProfile(newTok, { id:newUserId, email:membroForm.email.trim(), ...payload });
      } else {
        await sbUpdateProfile(newTok, newUserId, payload);
      }
      if (membroForm.team) {
        await sbSetPosition(auth.token, positionedUnder, newUserId, membroForm.team);
      }
      setDownline(d=>[...d, { id:newUserId, nome:payload.nome, cognome:payload.cognome, email:membroForm.email.trim(), positioned_under:positionedUnder, attivo:true }]);
      showToast("Membro creato ");
      setSaving(false);
      return { userId:newUserId, password:randomPass };
    } catch(e) {
      showToast("Errore: "+e.message,"#ef4444");
      setSaving(false);
      return null;
    }
  }


  async function saveClienteQuick(clienteForm) {
    if (!clienteForm.nome?.trim()) { showToast("Inserisci almeno il nome","#ef4444"); return; }
    const nomeNorm = clienteForm.nome.trim().toLowerCase();
    const cognomeNorm = (clienteForm.cognome||"").trim().toLowerCase();
    const dup = clienti.find(c => c.nome.trim().toLowerCase()===nomeNorm && (c.cognome||"").trim().toLowerCase()===cognomeNorm);
    if (dup) {
      const ownerLabel = dup.positionedUnder===auth.userId ? "te" : (()=>{ const m=downline.find(x=>x.id===dup.positionedUnder); return m?(m.nome||m.email)+" "+(m.cognome||""):"qualcun altro"; })();
      const proceed = window.confirm("Cliente \""+clienteForm.nome+" "+(clienteForm.cognome||"")+"\" risulta già registrato (di "+ownerLabel+"). Vuoi aggiungerlo comunque?");
      if (!proceed) return;
    }
    setSaving(true);
    const positionedUnder = clienteForm._userId || auth.userId;
    try {
      const res = await sbAddCliente(auth.token, {
        positionedUnder, nome:clienteForm.nome, cognome:clienteForm.cognome||"", citta:clienteForm.citta||"", team:clienteForm.team||"",
      });
      const newId = Array.isArray(res) ? res[0] : res;
      setClienti(c=>[...c,{id:newId,nome:clienteForm.nome,cognome:clienteForm.cognome||"",citta:clienteForm.citta||"",positionedUnder,attivo:true,team:clienteForm.team||""}]);
      showToast("Cliente aggiunto ");
      closeModal();
    } catch(e) { showToast("Errore: "+e.message,"#ef4444"); }
    setSaving(false);
  }

  async function updateClienteQuick(id, fields) {
    const prev = clienti.find(c=>c.id===id);
    if (!prev) return;
    const merged = {...prev, ...fields};
    try {
      await sbUpdateCliente(auth.token, id, merged);
      setClienti(c=>c.map(x=>x.id===id?merged:x));
    } catch(e) { showToast("Errore: "+e.message,"#ef4444"); }
  }

  async function deleteClienteQuick(id) {
    try {
      await sbDeleteCliente(auth.token, id);
      setClienti(c=>c.filter(x=>x.id!==id));
      showToast("Cliente rimosso","#ef4444");
    } catch(e) { showToast("Errore: "+e.message,"#ef4444"); }
  }

  async function invitaProspect(fields) {
    const np = {
      id: genId(),
      nome: fields.nome||"",
      cognome: fields.cognome||"",
      citta: fields.citta||"",
      telefono: fields.telefono||"",
      instagram: fields.instagram||"",
      note: fields.note||"",
      fonte: "Lista Nomi",
      fase: "INVITO",
      conosciutoAt: fields.conosciutoAt||today(),
      followUp: "",
      storico: [],
      pacchetto: "",
      checklist: { kyc:false, pandadoc:false, click:false },
    };
    np.storico = buildStorico(np, "INVITO", np.conosciutoAt);
    try {
      await sbInsert(auth.token, toDB(np, auth.userId));
      setData(d=>[...d, np]);
      showToast((np.nome||"")+" aggiunto ai prospect");
    } catch(e) { showToast("Errore: "+e.message,"#ef4444"); }
  }

  async function advanceFase(p) {
    const i=FASI_FUNNEL.indexOf(p.fase);
    if (i<0||i>=FASI_FUNNEL.length-1) return;
    const next=FASI_FUNNEL[i+1];
    const storico=buildStorico(p,next,today());
    const upd={...p,fase:next,storico};
    const ownerId=p._userId||auth.userId;
    try {
      await sbUpdate(auth.token,p.id,toDB(upd,ownerId));
      if (data.find(x=>x.id===p.id)) setData(d=>d.map(x=>x.id===p.id?upd:x));
      else setDlProspects(d=>d.map(x=>x.id===p.id?{...upd,_userId:ownerId,_ownerName:p._ownerName}:x));
      setSel(upd); showToast("→ "+FASE_LABEL[next]);
    } catch(e) { showToast("Errore: "+e.message,"#ef4444"); }
  }

  async function moveFase(p,fase) {
    const newFase=fase==="RIATTIVA"?highestReached(p):fase;
    const upd={...p,fase:newFase};
    const ownerId=p._userId||auth.userId;
    try {
      await sbUpdate(auth.token,p.id,toDB(upd,ownerId));
      if (data.find(x=>x.id===p.id)) setData(d=>d.map(x=>x.id===p.id?upd:x));
      else setDlProspects(d=>d.map(x=>x.id===p.id?{...upd,_userId:ownerId,_ownerName:p._ownerName}:x));
      setSel(upd);
      showToast(fase==="FOLLOW_UP"?" Follow Up":fase==="NON_INT"?" Non interessato":fase==="NON_PIACE"?" Non mi piace":"↩ Riattivato",
        fase==="FOLLOW_UP"?"#f59e0b":fase==="NON_INT"?"#6b7280":fase==="NON_PIACE"?"#ec4899":"var(--a1)");
    } catch(e) { showToast("Errore: "+e.message,"#ef4444"); }
  }

  async function setStatoColore(id, value) {
    const p=data.find(x=>x.id===id)||dlProspects.find(x=>x.id===id); if (!p) return;
    const ownerId=p._userId||auth.userId;
    const newVal = p.statoColore===value ? "" : value; // click di nuovo = rimuove
    const upd={...p,statoColore:newVal};
    try {
      await sbUpdate(auth.token,id,toDB(upd,ownerId));
      if (data.find(x=>x.id===id)) setData(d=>d.map(x=>x.id===id?upd:x));
      else setDlProspects(d=>d.map(x=>x.id===id?{...upd,_userId:ownerId,_ownerName:x._ownerName}:x));
      setSel(upd);
    } catch(e) { showToast("Errore salvataggio","#ef4444"); }
  }

  async function setChatAperta(id, value) {
    const p=data.find(x=>x.id===id)||dlProspects.find(x=>x.id===id); if (!p) return;
    const ownerId=p._userId||auth.userId;
    const upd={...p,chatAperta:!!value};
    try {
      await sbUpdate(auth.token,id,toDB(upd,ownerId));
      if (data.find(x=>x.id===id)) setData(d=>d.map(x=>x.id===id?upd:x));
      else setDlProspects(d=>d.map(x=>x.id===id?{...upd,_userId:ownerId,_ownerName:x._ownerName}:x));
      if (sel && sel.id===id) setSel(upd);
    } catch(e) { showToast("Errore salvataggio","#ef4444"); }
  }

  // Aggiorna un prospect (mio o del team) con un patch e rinfresca lo stato locale
  async function patchProspect(p, patch, okMsg) {
    const ownerId=p._userId||auth.userId;
    const upd={...p,...patch};
    try {
      await sbUpdate(auth.token,p.id,toDB(upd,ownerId));
      if (data.find(x=>x.id===p.id)) setData(d=>d.map(x=>x.id===p.id?upd:x));
      else setDlProspects(d=>d.map(x=>x.id===p.id?{...upd,_userId:ownerId,_ownerName:x._ownerName}:x));
      if (okMsg) showToast(okMsg);
    } catch(e) { showToast("Errore salvataggio: "+e.message,"#ef4444"); }
  }

  // "Prossimo step": porta il prospect alla fase scelta, senza chiedere date (usa oggi)
  async function setProspectStep(p, fase) {
    await patchProspect(p, stepPatch(p,fase), "\u2192 "+FASE_LABEL[fase]);
  }

  // "Situazione": iscritto / riprendere piu' avanti / balzato / (vuoto = di nuovo in processo)
  async function setSituazione(p, v) {
    const r=sitPatch(p,v);
    await patchProspect(p, r.patch, r.msg);
  }

  // Assistente "Dimmi": applica insieme fase, situazione, chat e nota in un solo salvataggio
  async function applicaAssistente(p, az) {
    let q={...p}; let patch={};
    if (az.step) { const pt=stepPatch(q,az.step); patch={...patch,...pt}; q={...q,...pt}; }
    if (az.sit)  { const pt=sitPatch(q,az.sit).patch; patch={...patch,...pt}; q={...q,...pt}; }
    if (az.chat) patch.chatAperta=true;
    if (az.nota) { const d=new Date(); const dd=String(d.getDate()).padStart(2,"0")+"/"+String(d.getMonth()+1).padStart(2,"0"); patch.note=(p.note?p.note+"\n":"")+dd+": "+az.nota; }
    await patchProspect(p, patch, "Salvato su "+p.nome+" \u2705");
    setShowAss(false);
  }
  function nuovoDaAssistente(nm, testo) {
    setForm({fase:"INVITO",fonte:"Instagram",conosciutoAt:today(),nome:nm.nome,cognome:nm.cognome,note:testo});
    setModal("add"); setShowAss(false);
  }

  async function setTicketEvento(id, eventoId) {
    const p=data.find(x=>x.id===id)||dlProspects.find(x=>x.id===id); if (!p) return;
    const ownerId=p._userId||auth.userId;
    const upd={...p,ticketEventoId:eventoId||""};
    try {
      await sbUpdate(auth.token,id,toDB(upd,ownerId));
      if (data.find(x=>x.id===id)) setData(d=>d.map(x=>x.id===id?upd:x));
      else setDlProspects(d=>d.map(x=>x.id===id?{...upd,_userId:ownerId,_ownerName:x._ownerName}:x));
      setSel(upd);
      showToast(eventoId?"Ticket assegnato ":"Ticket rimosso","#10b981");
    } catch(e) { showToast("Errore salvataggio","#ef4444"); }
  }

  async function updateChecklist(id, checklist) {
    const p=data.find(x=>x.id===id)||dlProspects.find(x=>x.id===id); if (!p) return;
    const ownerId=p._userId||auth.userId;
    const upd={...p,checklist};
    try {
      await sbUpdate(auth.token,id,toDB(upd,ownerId));
      if (data.find(x=>x.id===id)) setData(d=>d.map(x=>x.id===id?upd:x));
      else setDlProspects(d=>d.map(x=>x.id===id?{...upd,_userId:ownerId,_ownerName:x._ownerName}:x));
      setSel(upd);
    } catch(e) { showToast("Errore salvataggio","#ef4444"); }
  }

  async function deleteStorico(id, faseToRemove) {
    const p=data.find(x=>x.id===id)||dlProspects.find(x=>x.id===id); if (!p) return;
    const ownerId=p._userId||auth.userId;
    const newStorico = p.storico.filter(s=>s.fase!==faseToRemove);
    // Calcola la nuova fase (l'ultima rimasta nello storico)
    const FASI_ORDER = ["INVITO","CONOSCITIVA","FUP1","FUP2","PACK","CLOSING","SUB","FOLLOW_UP","NON_INT","NON_PIACE"];
    const lastFase = newStorico.reduce((best, s) => {
      const bi = FASI_ORDER.indexOf(best);
      const si = FASI_ORDER.indexOf(s.fase);
      return si > bi ? s.fase : best;
    }, newStorico[0]?.fase || "INVITO");
    const upd = {...p, storico:newStorico, fase:lastFase};
    try {
      await sbUpdate(auth.token,id,toDB(upd,ownerId));
      if (data.find(x=>x.id===id)) setData(d=>d.map(x=>x.id===id?upd:x));
      else setDlProspects(d=>d.map(x=>x.id===id?{...upd,_userId:ownerId,_ownerName:x._ownerName}:x));
      setSel(upd);
      showToast("Fase rimossa");
    } catch(e) { showToast("Errore","#ef4444"); }
  }

  async function updateStoricoData(id, fase, newData, newFase, newStorico) {
    const p=data.find(x=>x.id===id)||dlProspects.find(x=>x.id===id); if (!p) return;
    const ownerId=p._userId||auth.userId;
    const updStorico = newStorico || p.storico.map(s=>s.fase===fase?{...s,data:newData}:s);
    const updFase = newFase || p.fase;
    const upd = {...p, storico:updStorico, fase:updFase};
    try {
      await sbUpdate(auth.token,id,toDB(upd,ownerId));
      if (data.find(x=>x.id===id)) setData(d=>d.map(x=>x.id===id?upd:x));
      else setDlProspects(d=>d.map(x=>x.id===id?{...upd,_userId:ownerId,_ownerName:x._ownerName}:x));
      setSel(upd);
      showToast("Aggiornato");
    } catch(e) { showToast("Errore","#ef4444"); }
  }

  async function updateProfile(fields) {
    try {
      await sbUpdateProfile(auth.token, auth.userId, fields);
      const newProfile = { ...auth.profile, ...fields };
      setAuth(a => {
        const updated = { ...a, profile: newProfile };
        const saved = localStorage.getItem("becrm_session");
        if (saved) localStorage.setItem("becrm_session", JSON.stringify(updated));
        return updated;
      });
      showToast("Profilo aggiornato ");
      // Se cambia positioned_under ricarica la downline
      if (fields.positioned_under !== undefined) {
        const allProfiles = await sbGetAllProfiles(auth.token);
        const all = allProfiles || [];
        function buildFull(pid) {
          const res = [];
          function collect(id) { all.filter(p=>p.positioned_under===id).forEach(c=>{res.push(c);collect(c.id);}); }
          collect(pid); return res;
        }
        const mine = buildFull(auth.userId);
        setDownline(mine);
      }
    } catch(e) { showToast("Errore: "+e.message,"#ef4444"); }
  }

  async function assignTeam(memberId, team) {
    try {
      // Salva la squadra relativa a me in team_positions
      await sbSetPosition(auth.token, auth.userId, memberId, team);
      const newPositions = positions.filter(x => !(x.upline_id===auth.userId && x.member_id===memberId));
      newPositions.push({ upline_id:auth.userId, member_id:memberId, team });
      setPositions(newPositions);

      // Controlla se ho già un diretto posizionato in quella leg usando lo state locale
      const myDirectsInLeg = downline.filter(m =>
        m.positioned_under === auth.userId &&
        m.id !== memberId &&
        newPositions.some(p => p.upline_id===auth.userId && p.member_id===m.id && p.team===team)
      );

      if (myDirectsInLeg.length === 0) {
        // Slot libero — posiziona automaticamente sotto di me
        await sbPositionMember(auth.token, memberId, auth.userId);
        setDownline(d=>d.map(m=>m.id===memberId?{...m,positioned_under:auth.userId}:m));
        showToast("Posizionato nella leg "+team);
      } else {
        // Slot occupato — va in lista d'attesa
        // Se era già posizionato, rimuovilo dall'albero
        if (downline.find(m=>m.id===memberId)?.positioned_under) {
          await sbPositionMember(auth.token, memberId, null);
          setDownline(d=>d.map(m=>m.id===memberId?{...m,positioned_under:null}:m));
        }
        showToast("Slot occupato — in attesa, selezionalo nell albero per piazzarlo");
      }
    } catch(e) { showToast("Errore: "+e.message,"#ef4444"); }
  }

  async function setLeader(memberId, value) {
    try {
      await sbSetLeader(auth.token, memberId, value);
      setDownline(d => d.map(m => m.id===memberId ? { ...m, is_leader:value } : m));
      showToast(value ? "Impostato come leader" : "Rimosso da leader");
    } catch(e) { showToast("Errore: "+e.message,"#ef4444"); }
  }

  async function setAttivo(memberId, value) {
    try {
      await sbSetAttivo(auth.token, memberId, value);
      setDownline(d => d.map(m => m.id===memberId ? { ...m, attivo:value } : m));
      showToast(value ? "Membro rimesso attivo" : "Membro impostato come inattivo");
    } catch(e) { showToast("Errore: "+e.message,"#ef4444"); }
  }

  async function positionInTree(memberId, targetNodeId, team) {
    try {
      await sbPositionMember(auth.token, memberId, targetNodeId);
      if (team) await sbSetPosition(auth.token, targetNodeId, memberId, team);
      setDownline(d=>d.map(m=>m.id===memberId?{...m,positioned_under:targetNodeId}:m));
      if (team) setPositions(p=>{
        const filtered=p.filter(x=>!(x.member_id===memberId&&x.upline_id===targetNodeId));
        return [...filtered,{upline_id:targetNodeId,member_id:memberId,team}];
      });
      showToast("Posizionato nell albero");
    } catch(e) { showToast("Errore: "+e.message,"#ef4444"); }
  }

  async function addDownlineManually(referralCode, positionedUnder, team) {
    try {
      const profiles = await sbGetProfileByRef(auth.token, referralCode.trim().toLowerCase());
      if (!profiles || profiles.length === 0) { showToast("Nessun account trovato con questo ID ","#ef4444"); return false; }
      const target = profiles[0];
      if (target.id === auth.userId) { showToast("Non puoi aggiungere te stesso ","#ef4444"); return false; }
      if (downline.some(m=>m.id===target.id)) { showToast("Questo membro è già nel tuo team ","#ef4444"); return false; }
      const posUnder = positionedUnder || auth.userId;
      await sbPositionMember(auth.token, target.id, posUnder);
      if (team) await sbSetPosition(auth.token, posUnder, target.id, team);
      const updated = { ...target, positioned_under: posUnder };
      setDownline(d=>[...d, updated]);
      if (team) setPositions(p=>[...p, { upline_id:posUnder, member_id:target.id, team }]);
      showToast((target.nome||target.email)+" aggiunto al team ");
      return true;
    } catch(e) { showToast("Errore: "+e.message,"#ef4444"); return false; }
  }

  function onExport() {
    try {
      const cols = ["nome","cognome","citta","telefono","instagram","fonte","fase","conosciutoAt","followUp","interesse","note"];
      const headerLabels = ["Nome","Cognome","Città","Telefono","Instagram","Fonte","Fase","Conosciuto il","Follow-up","Interesse","Note"];
      const esc = v => {
        const s = v===null||v===undefined ? "" : String(v);
        return /[",\n;]/.test(s) ? '"'+s.replace(/"/g,'""')+'"' : s;
      };
      const rows = [headerLabels.join(";")];
      data.forEach(p => {
        rows.push(cols.map(c => esc(c==="fase" ? (FASE_LABEL[p.fase]||p.fase) : p[c])).join(";"));
      });
      const csv = "\uFEFF" + rows.join("\r\n"); // BOM per apertura corretta in Google Sheets/Excel
      const b=new Blob([csv],{type:"text/csv;charset=utf-8"});
      const u=URL.createObjectURL(b);
      const a=document.createElement("a");
      a.href=u; a.download="prospect_"+today()+".csv";
      document.body.appendChild(a); a.click();
      setTimeout(()=>{document.body.removeChild(a);URL.revokeObjectURL(u);},800);
      showToast("File esportato — importalo in Google Sheets");
    } catch(e) { showToast("Errore export","#ef4444"); }
  }

  // Dati da usare nella dashboard in base alla modalità
  const dashData = dashMode === "team" ? [...data, ...dlProspects] : data;

  const cd    = dataByCiclo(dashData, dashCiclo);
  const cdSub = cd.filter(p=>p.fase==="SUB");
  const cdAct = cd.filter(p=>["CONOSCITIVA","FUP1","FUP2","PACK","CLOSING"].includes(p.fase));
  const cdFU  = dashData.filter(p=>p.fase==="FOLLOW_UP");
  const cdNI  = cd.filter(p=>p.fase==="NON_INT"||p.fase==="NON_PIACE");
  const cdConv= cd.length?Math.round(cdSub.length/cd.length*100):0;
  const totSub  = dashData.filter(p=>p.fase==="SUB").length;
  const totConv = dashData.length?Math.round(totSub/dashData.length*100):0;
  const urgenti = data.filter(p=>(isOver(p.followUp)||isToday(p.followUp))&&p.fase!=="NON_INT"&&p.fase!=="NON_PIACE");
  const funnelCounts=FASI_DASH.map(f=>({f,n:cd.filter(p=>f==="FUP1"?(p.fase==="FUP1"||p.fase==="FUP2"):p.fase===f).length}));
  const funnelMax=Math.max(cd.length,1);

  // Prospect del team con owner name
  function getLegForMe(memberId) {
    const pos = positions.find(p => p.member_id===memberId && p.upline_id===auth.userId);
    if (pos) return pos.team;
    const member = downline.find(m => m.id===memberId);
    const parent = member && downline.find(m => m.id===member.positioned_under);
    if (parent) return getLegForMe(parent.id);
    return null;
  }
  const teamProspects = dlProspects.map(p => {
    const owner = downline.find(m => m.id === p._userId);
    return { ...p, _ownerName: owner ? (owner.nome||owner.email)+" "+(owner.cognome||"") : "", _leg: getLegForMe(p._userId) };
  });

  // filtro per persona/ramo/gamba nella lista Prospect
  const ramoIds = (() => {
    if (!fMembroTeam || fMembroTeam==="__miei") return null;
    const ids=new Set([fMembroTeam]); let fr=[fMembroTeam];
    while(fr.length){ const nx=[]; downline.forEach(m=>{ if(!ids.has(m.id)&&fr.includes(m.positioned_under)){ids.add(m.id);nx.push(m.id);} }); fr=nx; }
    return ids;
  })();
  const legDi = (rootId, uid) => {
    let cur=uid, g=0;
    while(cur && g++<60){ const m=downline.find(x=>x.id===cur); if(!m) return null;
      if(m.positioned_under===rootId){ const ps=positions.find(x=>x.upline_id===rootId&&x.member_id===cur); return ps?ps.team:null; }
      cur=m.positioned_under; }
    return null;
  };
  const matchTeam = p => {
    if (!fMembroTeam || fMembroTeam==="__miei") {
      const mio = !p._userId;
      if (fMembroTeam==="__miei") return fAmbito==="sinistra"||fAmbito==="destra" ? false : mio;
      if (fAmbito==="solo") return mio;
      if (fAmbito==="sinistra"||fAmbito==="destra") return !mio && p._leg===fAmbito;
      return true;
    }
    if (fAmbito==="solo") return p._userId===fMembroTeam;
    if (fAmbito==="sinistra"||fAmbito==="destra") return p._userId!==fMembroTeam && ramoIds.has(p._userId) && legDi(fMembroTeam,p._userId)===fAmbito;
    return ramoIds.has(p._userId);
  };

  // Prospect unificati: prima i miei (piu' recenti in alto), poi quelli del team
  const listaSource = [...data].reverse().concat([...teamProspects].reverse());
  const listaData=listaSource.filter(p=>{
    const q=search.toLowerCase();
    const sit=situazioneOf(p);
    return (!q||(p.nome+" "+p.cognome+" "+(p.citta||"")).toLowerCase().includes(q))
      &&(fSituazione==="tutti"||(fSituazione==="persi"?["futuro_si","riprendere","non_interessato"].includes(sit):sit===(fSituazione==="processo"?"":fSituazione)))
      &&(!fFase||p.fase===fFase)&&(!fFonte||p.fonte===fFonte)
      &&(!fCiclo||cicloOfDate(p.conosciutoAt)===Number(fCiclo))
      &&matchTeam(p);
  });

  if (!auth) return (<>
    <button className="tema-btn" onClick={()=>setInglese(v=>!v)} aria-label={inglese?"Italiano":"English"} title={inglese?"Italiano":"English"} style={{right:18,top:14,background:"var(--bg2)",borderColor:"var(--border2)",color:"var(--text)"}}>{inglese?"🇮🇹":"🇬🇧"}</button>
    <AuthScreen onAuth={setAuth} />
  </>);
  if (!ready) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"var(--bg)",flexDirection:"column",gap:12}}>
      <span className="spinner" style={{width:28,height:28,borderWidth:3}} />
      <span style={{fontSize:13,color:"var(--muted)"}}>Caricamento...</span>
    </div>
  );


  return (
    <div style={{display:"flex",flexDirection:"row",height:"100vh",width:"100vw",overflow:"hidden",background:"var(--bg)"}}>
      {toast && <div className="toast-pos" style={{position:"fixed",bottom:24,right:24,zIndex:9999,background:toast.color,color:"#fff",padding:"12px 22px",borderRadius:12,fontWeight:700,fontSize:13,boxShadow:"0 8px 30px #00000060",animation:"fadeIn .25s ease"}}>{toast.msg}</div>}
      {saving && <div style={{position:"fixed",top:14,right:14,zIndex:9998,background:"var(--bg4)",border:"1px solid var(--border2)",borderRadius:9,padding:"7px 14px",fontSize:12,color:"var(--a2)",display:"flex",alignItems:"center",gap:7}}><span className="spinner" />Salvataggio...</div>}

      <Sidebar view={view} setView={setView} data={data} auth={auth} onLogout={handleLogout} downlineCount={downline.filter(m=>m.attivo!==false).length} sonoLeader={sonoLeader} />
      <button className="ass-fab" onClick={()=>setShowAss(true)} title="Chat" style={{position:"fixed",right:18,bottom:24,zIndex:900,display:"flex",alignItems:"center",gap:8,padding:"13px 20px",borderRadius:99,border:"none",cursor:"pointer",fontWeight:800,fontSize:14,color:"#fff",background:"linear-gradient(135deg,var(--a1),var(--a2))",boxShadow:"0 12px 28px -8px #6d5efcbb"}}>{"\ud83c\udf99\ufe0f"} Chat</button>
      {showAss && <Assistente prospects={[...data,...teamProspects]} onApply={applicaAssistente} onNew={nuovoDaAssistente} onClose={()=>setShowAss(false)} faseLabel={f=>PROSPECT_FASE_LABEL[f]||f} />}


      <main className="mc" style={{flex:1,overflowY:"auto",height:"100vh",paddingBottom:0}}>
        {view==="lista" && <Lista onToggleChat={setChatAperta} onSetStep={setProspectStep} onSetSituazione={setSituazione} onEdit={p=>{setForm({...p});setModal("edit");}} prospects={listaData} total={data.length+teamProspects.length} search={search} setSearch={setSearch} fFase={fFase} setFFase={setFFase} fFonte={fFonte} setFFonte={setFFonte} fCiclo={fCiclo} setFCiclo={setFCiclo} fSituazione={fSituazione} setFSituazione={setFSituazione} fMembroTeam={fMembroTeam} setFMembroTeam={v=>{setFMembroTeam(v);setFAmbito("tutti");}} fAmbito={fAmbito} setFAmbito={setFAmbito} downline={downline} onAdd={openAdd} hasTeam={dlProspects.length>0} />}
        {view==="stats"   && (
          <div className="stat-wrap">
            <div className="page-wrap" style={{padding:"2rem 2.2rem 0",maxWidth:1280,margin:"0 auto"}}>
              <div style={{fontWeight:800,fontSize:26,color:"var(--text)",letterSpacing:-.8,marginBottom:14}}>Statistica</div>
              <div style={{display:"flex",background:"var(--bg3)",borderRadius:12,padding:4,gap:2,maxWidth:460}}>
                {[["dash","Panoramica"],["stats","Funnel e fonti"],["mappa","Mappa"]].map(([k,l])=>(
                  <button key={k} onClick={()=>setStatTab(k)} style={{flex:1,padding:"9px 10px",borderRadius:9,border:"none",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit",background:statTab===k?"var(--bg2)":"transparent",color:statTab===k?"var(--a2)":"var(--muted)",boxShadow:statTab===k?"0 1px 3px #0f172a1a":"none"}}>{l}</button>
                ))}
              </div>
            </div>
            {statTab==="dash" && <Dash cd={cd} cdSub={cdSub} cdAct={cdAct} cdFU={cdFU} cdNI={cdNI} cdConv={cdConv} totSub={totSub} totConv={totConv} totAll={dashData.length} funnelCounts={funnelCounts} funnelMax={funnelMax} urgenti={urgenti} dashCiclo={dashCiclo} setDashCiclo={setDashCiclo} onOpen={openDetail} dashMode={dashMode} setDashMode={setDashMode} hasTeam={dlProspects.length>0} ticketVenduti={ticketVendutiCount} />}
            {statTab==="stats" && <Statistiche data={data} dlProspects={teamProspects} downline={downline} positions={positions} />}
            {statTab==="mappa" && <MappaSezione auth={auth} eventi={eventi} sbGetMappaAttivi={sbGetMappaAttivi} sbGetMappaTicket={sbGetMappaTicket} sbGetMappaIscrizioni={sbGetMappaIscrizioni}
              sfidaStart={CICLO_CORRENTE_INIZIO} sfidaEnd={CICLO_CORRENTE_FINE} showToast={showToast} />}
          </div>
        )}
        {view==="team"    && <TeamView auth={auth} downline={downline} dlProspects={dlProspects} clienti={clienti} onAssignTeam={assignTeam} onAddManual={addDownlineManually} positions={positions} onOpenProspect={openDetail} onPositionInTree={positionInTree} onSetLeader={setLeader} onSetAttivo={setAttivo} onAddCliente={openAddCliente} onAddMembro={openAddMembro} onAddProspectForMember={openAddForMember} onSetChatAperta={setChatAperta} showToast={showToast} onUpdateCliente={updateClienteQuick} onDeleteCliente={deleteClienteQuick} sbGetListaNomiTeam={sbGetListaNomiTeam} LUDOVICO_ID={LUDOVICO_ID} />}
        {view==="nomi"    && <ListaNomiView auth={auth} onInvitaProspect={invitaProspect} />}
        {view==="xc" && sonoLeader && <XCView auth={auth} allProfiles={allProfiles} downline={downline} clienti={clienti} rows={xcRows} onSave={salvaXc} spill={xcSpill} onSpill={spillXc} leaderIds={new Set([LUDOVICO_ID, ...allProfiles.filter(p=>p.is_leader).map(p=>p.id)])} />}
        {view==="eventi"  && <EventiView auth={auth} allProfiles={allProfiles} downline={downline} isNic={auth.userId===LUDOVICO_ID} ticketRows={ticketRows} isLeader={!!auth.profile?.is_leader || auth.userId===LUDOVICO_ID} onToggle={toggleTicket} />}
        {auth && <button className="tema-btn lang-btn" onClick={()=>setInglese(v=>!v)} aria-label={inglese?"Italiano":"English"} title={inglese?"Italiano":"English"}>{inglese?"🇮🇹":"🇬🇧"}</button>}
        {auth && <button className="tema-btn" onClick={()=>setScuro(v=>!v)} aria-label={scuro?"Tema chiaro":"Tema scuro"} title={scuro?"Passa al chiaro":"Passa allo scuro"}>{scuro?"☀️":"🌙"}</button>}
        {auth && ready && ticketPronti && <EventoPopup haTicket={ticketRows.some(r=>r.evento==="global-mission" && r.user_id===auth.userId)} vip={isVip({nome:auth.profile?.nome, cognome:auth.profile?.cognome})} anteprima={auth.userId===LUDOVICO_ID} />}
        {view==="onboarding" && <OnboardingView auth={auth} />}
        {view==="profilo" && <ProfiloView auth={auth} onUpdateProfile={updateProfile} downlineCount={downline.filter(m=>m.attivo!==false).length} showToast={showToast} />}
      </main>

      {/* Mobile bottom nav - shown via CSS on mobile only */}
      <div className="mobtop" style={{position:"fixed",top:0,left:0,right:0,height:56,background:"#0b1d4a",zIndex:800,alignItems:"center",gap:12,padding:"0 14px",boxShadow:"0 4px 14px -6px #0b1d4a99"}}>
        <button onClick={()=>setMenuOpen(true)} aria-label="Menu" style={{width:40,height:40,borderRadius:12,border:"none",background:"#ffffff1f",color:"#fff",fontSize:20,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>{"\u2630"}</button>
        <div style={{color:"#fff",fontWeight:800,fontSize:16,letterSpacing:-.2}}>{({nomi:"Lista Nomi",lista:"Prospect",team:"Team",eventi:"Eventi",xc:"XC",stats:"Statistica",onboarding:"Onboarding",profilo:"Profilo"})[view]||"Digital Legacy"}</div>
      </div>
      {menuOpen && (
        <div onClick={()=>setMenuOpen(false)} style={{position:"fixed",inset:0,background:"#0f172a80",zIndex:1200}}>
          <div onClick={e=>e.stopPropagation()} style={{width:"80%",maxWidth:300,height:"100%",background:"#0b1d4a",padding:"20px 14px",display:"flex",flexDirection:"column",gap:6,boxShadow:"10px 0 40px -10px #000a"}}>
            <div style={{padding:"6px 8px 0",marginBottom:18,textAlign:"center"}}>
              <img src="/logo-digital-legacy-chiaro.png" alt="Digital Legacy" style={{width:"100%",display:"block"}} />
              <div style={{fontSize:11,fontWeight:700,color:"#93a4d6",letterSpacing:1.5,marginTop:2}}>CRM</div>
            </div>
            {[
              {id:"nomi",label:"Lista Nomi",icon:"\ud83d\udcdd"},
              {id:"lista",label:"Prospect",icon:"\ud83c\udfaf",badge:data.length},
              {id:"team",label:"Team",icon:"\ud83d\udc65",badge:downline.filter(m=>m.attivo!==false).length||0},
              {id:"eventi",label:"Eventi",icon:"\ud83c\udf9f\ufe0f"},
              ...(sonoLeader?[{id:"xc",label:"XC",icon:"\ud83d\udcb1"}]:[]),
              {id:"stats",label:"Statistica",icon:"\ud83d\udcca"},
              {id:"onboarding",label:"Onboarding",icon:"\ud83d\ude80"},
              {id:"profilo",label:"Profilo",icon:"\ud83d\udc64"},
            ].map(item=>{
              const active=view===item.id;
              return (
                <button key={item.id} onClick={()=>{setView(item.id);setMenuOpen(false);}}
                  style={{display:"flex",alignItems:"center",gap:12,width:"100%",padding:"14px 14px",background:active?"#ffffff24":"transparent",color:active?"#fff":"#b8c4ea",borderRadius:13,cursor:"pointer",fontSize:16,fontWeight:active?800:600,textAlign:"left",border:"none"}}>
                  <span style={{fontSize:18,width:22,textAlign:"center"}}>{item.icon}</span>{item.label}
                  {item.badge>0 && <span style={{marginLeft:"auto",background:"#ffffff26",color:"#fff",borderRadius:99,padding:"1px 9px",fontSize:12,fontWeight:700}}>{item.badge}</span>}
                </button>
              );
            })}
            <div style={{marginTop:"auto",paddingTop:14,borderTop:"1px solid #ffffff22"}}>
              <div style={{fontSize:11,color:"#93a4d6",marginBottom:8,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{auth?.email}</div>
              <button onClick={handleLogout} style={{width:"100%",padding:"12px",background:"#ffffff14",color:"#fecaca",border:"1px solid #ffffff22",borderRadius:11,cursor:"pointer",fontWeight:700,fontSize:14}}>Esci</button>
            </div>
          </div>
        </div>
      )}

      {modal && (
        <div onClick={closeModal} style={{position:"fixed",inset:0,background:"#0f172a66",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16,animation:"fadeIn .2s"}}>
          <div className={"pop"} onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:520,maxHeight:"90vh",overflowY:"auto",borderRadius:"16px"}}>
            {modal==="detail"
              ? <DetailModal p={sel} onEdit={()=>{setForm({...sel});setModal("edit");}} onAdvance={()=>advanceFase(sel)} onFollowUp={()=>moveFase(sel,"FOLLOW_UP")} onNonInt={()=>moveFase(sel,"NON_INT")} onNonPiace={()=>moveFase(sel,"NON_PIACE")} onRiattiva={()=>moveFase(sel,"RIATTIVA")} onClose={closeModal} onUpdateChecklist={cl=>updateChecklist(sel.id,cl)} onDeleteStorico={fase=>deleteStorico(sel.id,fase)} onUpdateStoricoData={(fase,data,newFase,newStorico)=>updateStoricoData(sel.id,fase,data,newFase,newStorico)} onSetStatoColore={v=>setStatoColore(sel.id,v)} eventi={eventi} onSetTicketEvento={eid=>setTicketEvento(sel.id,eid)} onSetChatAperta={v=>setChatAperta(sel.id,v)} />
              : modal==="cliente"
              ? <ClienteQuickModal form={form} setForm={setForm} onSave={saveClienteQuick} onClose={closeModal} isLeader={!!auth.profile?.is_leader || auth.userId===LUDOVICO_ID} downline={downline} saving={saving} />
              : modal==="membro"
              ? <MembroQuickModal form={form} setForm={setForm} onSave={addMembroQuick} onClose={closeModal} isLeader={!!auth.profile?.is_leader || auth.userId===LUDOVICO_ID} downline={downline} saving={saving} />
              : <FormModal form={form} setForm={setForm} onSave={saveForm} onClose={closeModal} onDelete={modal==="edit"?()=>deleteProp(form.id):null} isEdit={modal==="edit"} isLeader={!!auth.profile?.is_leader || auth.userId===LUDOVICO_ID} downline={downline} />
            }
          </div>
        </div>
      )}
    </div>
  );
}

//  SIDEBAR 
function Sidebar({ view, setView, data, auth, onLogout, downlineCount, sonoLeader }) {
  const navs = [
    { id:"nomi",    icon:"\ud83d\udcdd", label:"Lista Nomi" },
    { id:"lista",   icon:"\ud83c\udfaf", label:"Prospect", badge:data.length },
    { id:"team",    icon:"\ud83d\udc65", label:"Team", badge:downlineCount||0 },
    { id:"eventi",  icon:"\ud83c\udf9f\ufe0f", label:"Eventi" },
    ...(sonoLeader?[{ id:"xc", icon:"\ud83d\udcb1", label:"XC" }]:[]),
    { id:"stats",   icon:"\ud83d\udcca", label:"Statistica" },
    { id:"onboarding", icon:"\ud83d\ude80", label:"Onboarding" },
    { id:"profilo", icon:"\ud83d\udc64", label:"Profilo" },
  ];
  return (
    <aside className="sb" style={{width:236,minWidth:236,background:"var(--bg)",borderRight:"1px solid var(--border)",padding:"1.6rem 1rem",display:"flex",flexDirection:"column",gap:4,height:"100vh",overflowY:"auto"}}>
      <div style={{marginBottom:24,padding:"0 4px",textAlign:"center"}}>
        <img className="logo-l" src="/logo-digital-legacy.png" alt="Digital Legacy" style={{width:"100%"}} />
        <img className="logo-d" src="/logo-digital-legacy-chiaro.png" alt="Digital Legacy" style={{width:"100%"}} />
        <div style={{fontSize:11,fontWeight:700,color:"var(--muted)",letterSpacing:1.5,marginTop:2}}>CRM</div>
      </div>

      {navs.map(item=>{
        const active=view===item.id;
        return (
        <button key={item.id} onClick={()=>setView(item.id)}
          style={{display:"flex",alignItems:"center",gap:11,width:"100%",padding:"11px 13px",background:active?"var(--bg4)":"transparent",color:active?"var(--a2)":"var(--muted)",borderRadius:12,cursor:"pointer",fontSize:13.5,fontWeight:active?700:600,textAlign:"left",border:"none",transition:"all .2s"}}>
          <span style={{fontSize:16,width:20,textAlign:"center"}}>{item.icon}</span>{item.label}
          {item.badge>0 && <span style={{marginLeft:"auto",background:active?"var(--a1)":"var(--bg4)",color:active?"#fff":"var(--a2)",borderRadius:99,padding:"1px 9px",fontSize:11,fontWeight:700}}>{item.badge}</span>}
        </button>
        );
      })}

      <div style={{marginTop:"auto",paddingTop:14,borderTop:"1px solid var(--border)"}}>
        <div style={{fontSize:11,color:"var(--muted)",marginBottom:8,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{auth?.email}</div>
        <button className="btn-esci" onClick={onLogout} style={{width:"100%",padding:"9px 10px",background:"#fef2f2",color:"#dc2626",border:"1px solid #fecaca",borderRadius:10,cursor:"pointer",fontWeight:700,fontSize:12}}>Esci</button>
      </div>
    </aside>
  );
}

//  DASHBOARD 
function CountdownCiclo({ ciclo }) {
  const target = cicloEndDateTime(ciclo);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!target) return null;
  const diff = Math.max(0, target.getTime() - now);
  const giorni = Math.floor(diff / 86400000);
  const ore = Math.floor((diff % 86400000) / 3600000);
  const min = Math.floor((diff % 3600000) / 60000);
  const sec = Math.floor((diff % 60000) / 1000);
  const totMs = 28*86400000;
  const elapsedMs = Math.min(totMs, Math.max(0, totMs - diff));
  const pct = Math.round((elapsedMs/totMs)*100);
  const giornoNum = Math.min(28, Math.floor(elapsedMs/86400000)+1);
  const box = v => String(v).padStart(2,"0");
  return (
    <div style={{background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:14,padding:"18px 22px",marginBottom:16,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:16}}>
      <div style={{flex:1,minWidth:220}}>
        <div style={{fontSize:10,color:"var(--muted)",fontWeight:700,textTransform:"uppercase",letterSpacing:1}}>Chiusura ciclo</div>
        <div style={{fontSize:15,fontWeight:800,color:"var(--text)",marginTop:2}}>
          {target.toLocaleDateString("it-IT",{weekday:"long",day:"numeric",month:"long"})} alle ore {box(target.getHours())}:{box(target.getMinutes())}
        </div>
        <div style={{marginTop:10,height:6,borderRadius:4,background:"var(--bg4)",overflow:"hidden",maxWidth:360}}>
          <div style={{height:"100%",width:pct+"%",background:"linear-gradient(90deg,var(--a2),var(--a1))",borderRadius:4}} />
        </div>
        <div style={{fontSize:11,color:"var(--muted)",marginTop:6}}>Giorno {giornoNum} di 28</div>
      </div>
      <div style={{display:"flex",gap:18}}>
        {[["giorni",giorni],["ore",ore],["min",min],["sec",sec]].map(([label,val])=>(
          <div key={label} style={{textAlign:"center"}}>
            <div style={{fontSize:30,fontWeight:900,color:"var(--text)",lineHeight:1}}>{box(val)}</div>
            <div style={{fontSize:9,color:"var(--muted)",fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginTop:2}}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
function Dash({ cd, cdSub, cdAct, cdFU, cdNI, cdConv, totSub, totConv, totAll, funnelCounts, funnelMax, urgenti, dashCiclo, setDashCiclo, onOpen, dashMode, setDashMode, hasTeam, ticketVenduti }) {
  const cc = v => v>=20?"#10b981":v>=10?"var(--a2)":"#f59e0b";
  const bvCiclo = cdSub.reduce((acc,p)=>acc+bvOfPacchetto(p.pacchetto,p.bvCustom),0);
  const kpis = [
    {label:"In percorso",value:cdAct.length,icon:"",color:"var(--a1)",sub:cd.length+" totali nel ciclo",detail:"FUP1 → Closing"},
    {label:"Conv. ciclo",value:cdConv+"%",icon:"",color:cc(cdConv),sub:cdSub.length+" iscritti / "+cd.length,detail:cdConv>=20?"Ottimo ":cdConv>=10?"Nella media":"Da migliorare"},
    {label:"Iscritti ciclo",value:cdSub.length,icon:"",color:"#10b981",sub:"su "+cd.length+" conosciuti",detail:"questo ciclo"},
    {label:"BV ciclo",value:bvCiclo,icon:"",color:"#f59e0b",sub:"da "+cdSub.length+" iscritti",detail:"Business Volume"},
    {label:"Ticket evento",value:ticketVenduti||0,icon:"",color:"#a855f7",sub:"tu + downline",detail:"Venduti"},
  ];
  return (
    <div className="page-wrap" style={{padding:"2rem 2.2rem",maxWidth:1280,margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",marginBottom:"1.2rem",gap:12,flexWrap:"wrap"}}>
        <div>
          <div style={{fontSize:11,fontWeight:700,color:"var(--a1)",textTransform:"uppercase",letterSpacing:1.4,marginBottom:4}}>Ciclo {dashCiclo}{dashCiclo===CICLO_CORRENTE?" \u00b7 in corso":""}</div>
          <h1 style={{fontWeight:900,fontSize:26,color:"var(--text)",letterSpacing:-0.8,lineHeight:1}}>Dashboard</h1>
          <p style={{color:"var(--muted)",fontSize:12,marginTop:4}}>{cicloLabel(dashCiclo)}</p>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
          {/* Toggle Personale / Team */}
          {hasTeam && (
            <div style={{display:"flex",background:"var(--bg3)",borderRadius:10,padding:4,border:"1px solid var(--border)"}}>
              {["personale","team"].map(m=>(
                <button key={m} onClick={()=>setDashMode(m)} className="tabbtn"
                  style={{background:dashMode===m?"var(--bg4)":"transparent",color:dashMode===m?"var(--a2)":"var(--muted)",boxShadow:dashMode===m?"inset 0 0 0 1px var(--sidebar-border)":"none",fontSize:11,padding:"6px 14px"}}>
                  {m==="personale"?" Personale":" Team"}
                </button>
              ))}
            </div>
          )}
          {/* Selettore ciclo */}
          <div style={{display:"flex",alignItems:"center",gap:6,background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:11,padding:"5px 10px"}}>
            <button onClick={()=>setDashCiclo(c=>Math.max(CICLO_NUMS[CICLO_NUMS.length-1],c-1))} style={{background:"none",border:"none",color:"var(--muted)",fontSize:18,cursor:"pointer",padding:"2px 8px",fontWeight:700}}>‹</button>
            <select value={dashCiclo} onChange={e=>setDashCiclo(Number(e.target.value))} style={{background:"none",border:"none",color:"var(--text)",fontWeight:800,fontSize:12,padding:"2px 4px",width:"auto",cursor:"pointer"}}>
              {CICLO_NUMS.map(c=><option key={c} value={c}>Ciclo {c}</option>)}
            </select>
            <button onClick={()=>setDashCiclo(c=>Math.min(CICLO_NUMS[0],c+1))} style={{background:"none",border:"none",color:"var(--muted)",fontSize:18,cursor:"pointer",padding:"2px 8px",fontWeight:700}}>›</button>
          </div>
        </div>
      </div>
      {dashCiclo===CICLO_CORRENTE && <CountdownCiclo ciclo={dashCiclo} />}
      <div className="kpi-grid" style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12,marginBottom:16}}>
        {kpis.map((k,i)=>(
          <div key={i} className="kpi" style={{background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:14,padding:"18px 20px",position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:"linear-gradient(90deg,"+k.color+","+k.color+"44)",borderRadius:"14px 14px 0 0"}} />
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
              <span style={{fontSize:10,color:"var(--muted)",fontWeight:700,textTransform:"uppercase",letterSpacing:.8}}>{k.label}</span>
              <span style={{fontSize:15,padding:7,borderRadius:9,background:k.color+"18"}}>{k.icon}</span>
            </div>
            <div style={{fontSize:34,fontWeight:900,color:k.color,lineHeight:1,letterSpacing:-1,textShadow:"0 0 24px "+k.color+"35"}}>{k.value}</div>
            <div style={{fontSize:11,color:"var(--muted)",marginTop:6}}>{k.sub}</div>
            <div style={{fontSize:11,color:k.color+"99",marginTop:3,fontWeight:600}}>{k.detail}</div>
          </div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:(urgenti.length>0||cdFU.length>0)?"1.5fr 1fr":"1fr",gap:14}}>
        <div style={{background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:14,padding:"1.4rem"}}>
          <div style={{fontSize:10,fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:1.2,marginBottom:4}}>Funnel — Ciclo {dashCiclo}</div>
          <div style={{fontSize:11,color:"var(--muted)",marginBottom:16}}>{cd.length} prospect conosciuti in questo ciclo</div>
          {cd.length===0
            ?<div style={{textAlign:"center",padding:"2rem",color:"var(--muted)",fontSize:13}}>Nessun prospect in questo ciclo</div>
            :<div style={{display:"flex",flexDirection:"column",gap:12}}>
              {funnelCounts.map(({f,n})=>{
                const pct=Math.round(n/(cd.length||1)*100);
                const w=Math.round((n/funnelMax)*100)+"%";
                return (
                  <div key={f} style={{display:"flex",alignItems:"center",gap:11}}>
                    <span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",borderRadius:6,padding:"3px 9px",fontSize:10,fontWeight:700,color:"#fff",background:FASE_CLR[f],minWidth:68,boxShadow:"0 0 10px "+FASE_CLR[f]+"35"}}>{FASE_LABEL[f]}</span>
                    <div style={{flex:1,height:9,background:"var(--bg4)",borderRadius:99,overflow:"hidden"}}>
                      <div style={{width:w,height:"100%",background:"linear-gradient(90deg,"+FASE_CLR[f]+"88,"+FASE_CLR[f]+")",boxShadow:"0 0 8px "+FASE_CLR[f]+"50",borderRadius:99,transition:"width .6s cubic-bezier(.4,0,.2,1)"}} />
                    </div>
                    <span style={{fontWeight:800,color:"var(--text)",minWidth:16,textAlign:"right",fontSize:13}}>{n}</span>
                    <span style={{color:"var(--muted)",fontSize:11,minWidth:30,textAlign:"right"}}>{pct}%</span>
                  </div>
                );
              })}
            </div>
          }
          <div style={{display:"flex",gap:10,marginTop:16,paddingTop:14,borderTop:"1px dashed var(--border)"}}>
            {[{f:"FOLLOW_UP",n:cdFU.length},{f:"NON_INT",n:cdNI.length},{f:"NON_PIACE",n:cd.filter(p=>p.fase==="NON_PIACE").length}].map(({f,n})=>(
              <div key={f} style={{flex:1,background:FASE_CLR[f]+"12",border:"1px solid "+FASE_CLR[f]+"28",borderRadius:10,padding:"10px 12px",display:"flex",alignItems:"center",gap:8}}>
                <div style={{width:8,height:8,borderRadius:99,background:FASE_CLR[f],flexShrink:0}} />
                <div><div style={{fontWeight:900,fontSize:18,color:FASE_CLR[f]}}>{n}</div><div style={{fontSize:10,color:"var(--muted)",marginTop:1}}>{FASE_LABEL[f]}</div></div>
              </div>
            ))}
          </div>
        </div>
        {(urgenti.length>0||cdFU.length>0)&&(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {cdFU.length>0&&(
              <div style={{background:"var(--bg2)",border:"1px solid #f59e0b28",borderRadius:14,padding:"1.2rem",flex:1}}>
                <div style={{fontSize:10,fontWeight:700,color:"#d97706",textTransform:"uppercase",letterSpacing:1.2,marginBottom:12}}> Da ricontattare</div>
                <div style={{display:"flex",flexDirection:"column",gap:7,maxHeight:170,overflowY:"auto"}}>
                  {cdFU.map(p=>(
                    <div key={p.id} className="hrow" onClick={()=>onOpen(p)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:"#f59e0b09",border:"1px solid #f59e0b1e",borderRadius:9,padding:"8px 11px",cursor:"pointer"}}>
                      <div style={{display:"flex",alignItems:"center",gap:9}}>
                        <Av n={p.nome} c={p.cognome} color={FASE_CLR.FOLLOW_UP} />
                        <span style={{fontWeight:700,color:"var(--text)",fontSize:12}}>{p.nome} {p.cognome}</span>
                      </div>
                      <span style={{fontSize:10,color:"#d97706"}}>{fmt(p.followUp)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {urgenti.length>0&&(
              <div style={{background:"var(--bg2)",border:"1px solid #ef444422",borderRadius:14,padding:"1.2rem",flex:1}}>
                <div style={{fontSize:10,fontWeight:700,color:"#dc2626",textTransform:"uppercase",letterSpacing:1.2,marginBottom:12}}> Follow-up urgenti</div>
                <div style={{display:"flex",flexDirection:"column",gap:7,maxHeight:200,overflowY:"auto"}}>
                  {urgenti.map(p=>(
                    <div key={p.id} className="hrow" onClick={()=>onOpen(p)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:"#ef44440b",border:"1px solid #ef44441e",borderRadius:9,padding:"8px 11px",cursor:"pointer"}}>
                      <div style={{display:"flex",alignItems:"center",gap:9}}>
                        <Av n={p.nome} c={p.cognome} color={FASE_CLR[p.fase]} />
                        <div>
                          <div style={{fontWeight:700,color:"var(--text)",fontSize:12}}>{p.nome} {p.cognome}</div>
                          <div style={{fontSize:10,color:isOver(p.followUp)?"#f87171":"#fbbf24",marginTop:1,fontWeight:600}}>{isOver(p.followUp)?" Scaduto":" Oggi"}</div>
                        </div>
                      </div>
                      <span style={{display:"inline-flex",alignItems:"center",borderRadius:6,padding:"2px 8px",fontSize:10,fontWeight:700,color:"#fff",background:FASE_CLR[p.fase]}}>{FASE_LABEL[p.fase]}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

//  STATISTICHE 
const STATS_START_CICLO = 79; // prima di questo ciclo non si tracciavano ancora le statistiche
function Statistiche({ data, dlProspects, downline, positions }) {
  const hasTeam = (dlProspects||[]).length > 0;
  const [statsMode, setStatsMode] = useState(data.length > 0 ? "personale" : (hasTeam ? "team" : "personale"));
  const [fMembro, setFMembro] = useState(""); // "" tutti | "self" solo tu | id membro specifico
  const [legFilter, setLegFilter] = useState("all"); // all | sinistra | destra
  const [barCiclo,  setBarCiclo]  = useState("ALL");

  const [soloLui, setSoloLui] = useState(false); // con un membro scelto: solo lui, senza il suo team
  const memberRoot = statsMode==="team" && fMembro!=="" && fMembro!=="self" ? fMembro : null;

  // tutti i discendenti di un membro (lui incluso)
  const subtreeIds = rootId => {
    const ids = new Set([rootId]); let frontier=[rootId];
    while (frontier.length) {
      const next=[];
      (downline||[]).forEach(m=>{ if(!ids.has(m.id) && frontier.includes(m.positioned_under)){ ids.add(m.id); next.push(m.id); } });
      frontier=next;
    }
    return ids;
  };
  // gamba (sinistra/destra) di un utente rispetto a un membro specifico
  const legRel = (rootId, uid) => {
    if (uid===rootId) return null;
    const byId = Object.fromEntries((downline||[]).map(m=>[m.id,m]));
    let cur=uid, guard=0;
    while (cur && guard++<60) {
      const m=byId[cur]; if(!m) return null;
      if (m.positioned_under===rootId) { const pos=(positions||[]).find(x=>x.upline_id===rootId&&x.member_id===cur); return pos?pos.team:null; }
      cur=m.positioned_under;
    }
    return null;
  };

  const baseData = statsMode !== "team" ? data
    : fMembro === "" ? [...data, ...(dlProspects||[])]
    : fMembro === "self" ? data
    : (() => {
        const ids = soloLui ? new Set([fMembro]) : subtreeIds(fMembro);
        return (dlProspects||[]).filter(p => ids.has(p._userId)).map(p => ({...p, _legRel: legRel(fMembro,p._userId)}));
      })();

  const activeData = (statsMode==="team" && fMembro==="" && legFilter!=="all")
    ? baseData.filter(p => p._leg === legFilter)
    : (memberRoot && !soloLui && legFilter!=="all")
    ? baseData.filter(p => p._legRel === legFilter)
    : baseData;

  const cicliPresenti=[...new Set(activeData.flatMap(p=>(p.storico||[]).map(s=>cicloOfDate(s.data)).filter(Boolean)))].filter(c=>c>=STATS_START_CICLO).sort((a,b)=>a-b);
  const cicli=cicliPresenti.length?cicliPresenti:[CICLO_CORRENTE];
  const barData=FASI_STATS.map(f=>{const count=barCiclo==="ALL"?activeData.filter(p=>reachedEver(p,f)).length:activeData.filter(p=>reachedInCiclo(p,f,Number(barCiclo))).length;return{fase:FASE_LABEL[f],key:f,count,fill:FASE_CLR[f]};});
  const dropOffs = barData.slice(0,-1).map((b,i)=>{const next=barData[i+1];const rate=b.count>0?Math.round(next.count/b.count*100):0;return{da:b.fase,a:next.fase,rate,fromCount:b.count,color:next.fill};});
  const bottleneck = dropOffs.filter(d=>d.fromCount>=3).sort((a,b)=>a.rate-b.rate)[0]; // solo se c'è un minimo di dati
  const tableRowsAsc=[...cicli].sort((a,b)=>a-b).map(c=>{const r={c};FASI_STATS.forEach(f=>{r[f]=activeData.filter(p=>reachedInCiclo(p,f,c)).length;});r.conv=r.INVITO>0?Math.round(r.SUB/r.INVITO*100):r.FUP1>0?Math.round(r.SUB/r.FUP1*100):0;return r;});
  const tableRows=[...tableRowsAsc].reverse().map((r,i)=>{const prev=tableRowsAsc[tableRowsAsc.length-2-i];return{...r,delta:prev?r.conv-prev.conv:null};});

  // Tempo medio di conversione (Invito → Iscritto)
  const inScope = p => barCiclo==="ALL" ? true : reachedInCiclo(p,"SUB",Number(barCiclo));
  const durate = activeData.filter(p=>reachedEver(p,"SUB")&&inScope(p)).map(p=>{
    const storico=p.storico||[];
    const dInvito=storico.find(s=>s.fase==="INVITO")?.data;
    const dSub=storico.find(s=>s.fase==="SUB")?.data;
    if(!dInvito||!dSub) return null;
    const giorni=Math.round((new Date(dSub)-new Date(dInvito))/86400000);
    return giorni>=0?giorni:null;
  }).filter(g=>g!=null);
  const tempoMedioConversione = durate.length ? Math.round(durate.reduce((a,b)=>a+b,0)/durate.length) : null;

  // stesso criterio del grafico: "ha raggiunto la fase" (tutti i cicli, oppure nel ciclo scelto)
  const reached = (p,f) => barCiclo==="ALL" ? reachedEver(p,f) : reachedInCiclo(p,f,Number(barCiclo));

  // Fonte migliore
  const fontiSet=[...new Set(activeData.map(p=>p.fonte||"Altro"))];
  const fontiStats = fontiSet.map(f=>{
    const arr=activeData.filter(p=>(p.fonte||"Altro")===f);
    const tot=arr.filter(p=>reached(p,"INVITO")).length;
    const sub=arr.filter(p=>reached(p,"SUB")).length;
    return {fonte:f,tot,sub,rate:tot>0?Math.round(sub/tot*100):0};
  }).filter(f=>f.tot>=3).sort((a,b)=>b.rate-a.rate);
  const fonteMigliore=fontiStats[0]||null;

  // Classifica membri (solo in modalità team, tutto il team)
  const showClassifica = statsMode==="team" && fMembro==="" && hasTeam;
  const classificaRows = !showClassifica ? [] : (() => {
    const rows = (downline||[]).map(m=>{
      const own=(dlProspects||[]).filter(p=>p._userId===m.id && (legFilter==="all"||p._leg===legFilter));
      const invito=barCiclo==="ALL"?own.filter(p=>reachedEver(p,"INVITO")).length:own.filter(p=>reachedInCiclo(p,"INVITO",Number(barCiclo))).length;
      const sub=barCiclo==="ALL"?own.filter(p=>reachedEver(p,"SUB")).length:own.filter(p=>reachedInCiclo(p,"SUB",Number(barCiclo))).length;
      return {id:m.id,label:(m.nome||m.email)+" "+(m.cognome||""),invito,sub,rate:invito>0?Math.round(sub/invito*100):0};
    });
    if (legFilter==="all") {
      const invito=barCiclo==="ALL"?data.filter(p=>reachedEver(p,"INVITO")).length:data.filter(p=>reachedInCiclo(p,"INVITO",Number(barCiclo))).length;
      const sub=barCiclo==="ALL"?data.filter(p=>reachedEver(p,"SUB")).length:data.filter(p=>reachedInCiclo(p,"SUB",Number(barCiclo))).length;
      rows.unshift({id:"self",label:"Tu",invito,sub,rate:invito>0?Math.round(sub/invito*100):0});
    }
    return rows.filter(r=>r.invito>=2).sort((a,b)=>b.rate-a.rate||b.invito-a.invito).slice(0,6);
  })();

  // Report per fonte: da dove arrivano i prospect
  const fontiReport = fontiSet.map(f=>{
    const arr=activeData.filter(p=>(p.fonte||"Altro")===f);
    const tot=arr.filter(p=>reached(p,"INVITO")).length;
    const conosc=arr.filter(p=>reached(p,"CONOSCITIVA")).length;
    const sub=arr.filter(p=>reached(p,"SUB")).length;
    return {fonte:f,tot,conosc,sub,rate:tot>0?Math.round(sub/tot*100):0};
  }).filter(r=>r.tot>0).sort((a,b)=>b.tot-a.tot);
  const fontiMax = Math.max(1,...fontiReport.map(r=>r.tot));

  const ts={background:"var(--bg3)",border:"1px solid var(--border2)",borderRadius:8,color:"var(--text)",fontSize:12};
  const tProps={contentStyle:ts,itemStyle:{color:"var(--text)"},labelStyle:{color:"var(--text)",fontWeight:700}};
  if (!activeData.length && !(statsMode==="team")) return <div className="page-wrap" style={{padding:"2rem 2.2rem"}}><h1 style={{fontWeight:900,fontSize:26,color:"var(--text)",marginBottom:8}}>Statistiche</h1><div style={{textAlign:"center",padding:"5rem",color:"var(--muted)"}}><div style={{fontSize:44,marginBottom:12}}></div><p>{hasTeam ? "Nessun dato in questa modalita — prova a switchare su Team" : "Aggiungi prospect per vedere le statistiche"}</p></div></div>;
  return (
    <div className="page-wrap" style={{padding:"2rem 2.2rem",maxWidth:1280,margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",marginBottom:24,gap:12,flexWrap:"wrap"}}>
        <div>
          <h1 style={{fontWeight:900,fontSize:26,color:"var(--text)",letterSpacing:-0.8}}>Statistiche</h1>
          <p style={{color:"var(--muted)",fontSize:12,marginTop:4}}>Dove converti e dove ti perdi persone nel percorso</p>
          {statsMode==="team" && (()=>{
            const ramo = memberRoot ? (()=>{const m=(downline||[]).find(x=>x.id===memberRoot);return m?((m.nome||m.email)+" "+(m.cognome||"")).trim():"";})() : "";
            const gamba = legFilter==="sinistra"?" · gamba sinistra":legFilter==="destra"?" · gamba destra":"";
            const label = (memberRoot ? ramo+(soloLui?" (solo lui)":" e il suo team") : fMembro==="self"?"Solo tu":"Tutto il team")+(fMembro!=="self"&&!(memberRoot&&soloLui)?gamba:"");
            return <div style={{display:"inline-flex",alignItems:"center",gap:8,marginTop:8,background:"var(--a1-10)",border:"1px solid var(--a1-25)",borderRadius:10,padding:"6px 12px",fontSize:12,fontWeight:700,color:"var(--text)"}}>👥 <span>{label}</span>: <span style={{color:"var(--a2)",fontSize:15,fontWeight:900}}>{activeData.length}</span> prospect in totale</div>;
          })()}
        </div>
        {hasTeam && (
          <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
            <div style={{display:"flex",background:"var(--bg3)",borderRadius:10,padding:4,border:"1px solid var(--border)"}}>
              {["personale","team"].map(m=>(
                <button key={m} onClick={()=>setStatsMode(m)} className="tabbtn"
                  style={{background:statsMode===m?"var(--bg4)":"transparent",color:statsMode===m?"var(--a2)":"var(--muted)",boxShadow:statsMode===m?"inset 0 0 0 1px var(--sidebar-border)":"none",fontSize:11,padding:"6px 14px"}}>
                  {m==="personale"?" Personale":" Team"}
                </button>
              ))}
            </div>
            {statsMode==="team" && (
              <select value={fMembro} onChange={e=>setFMembro(e.target.value)} style={{width:"auto",minWidth:170}}>
                <option value="">Tutto il team</option>
                <option value="self">Solo tu</option>
                {(downline||[]).map(m=><option key={m.id} value={m.id}>{m.nome||m.email} {m.cognome||""} — da lui in giù</option>)}
              </select>
            )}
            {memberRoot && (
              <label style={{display:"inline-flex",alignItems:"center",gap:6,cursor:"pointer",fontSize:11,fontWeight:700,color:"var(--muted)"}}>
                <input type="checkbox" checked={soloLui} onChange={e=>setSoloLui(e.target.checked)} style={{width:15,height:15,cursor:"pointer"}} /> Solo lui (senza il suo team)
              </label>
            )}
            {statsMode==="team" && fMembro!=="self" && !(memberRoot&&soloLui) && (
              <div style={{display:"flex",background:"var(--bg3)",borderRadius:10,padding:4,border:"1px solid var(--border)"}}>
                {[["all","Tutti"],["sinistra","Sinistra"],["destra","Destra"]].map(([k,l])=>(
                  <button key={k} onClick={()=>setLegFilter(k)} className="tabbtn"
                    style={{background:legFilter===k?"var(--bg4)":"transparent",color:legFilter===k?"var(--a2)":"var(--muted)",boxShadow:legFilter===k?"inset 0 0 0 1px var(--sidebar-border)":"none",fontSize:11,padding:"6px 14px"}}>
                    {l}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {bottleneck && (
        <div style={{background:"linear-gradient(135deg,#f59e0b12,#f59e0b05)",border:"1px solid #f59e0b30",borderRadius:14,padding:"1rem 1.3rem",marginBottom:16,display:"flex",gap:14,alignItems:"center"}}>
          <div style={{fontSize:24}}>💡</div>
          <div>
            <div style={{fontSize:13,fontWeight:800,color:"#f59e0b"}}>Dove ti perdi più persone</div>
            <div style={{fontSize:13,color:"var(--text)",marginTop:2}}>Tra <b>{bottleneck.da}</b> e <b>{bottleneck.a}</b> passa solo il <b>{bottleneck.rate}%</b> — è il punto del percorso dove converti meno. Se vuoi migliorare i numeri, è lì che vale la pena lavorare per primo (script, follow up, tempi di risposta).</div>
          </div>
        </div>
      )}

      <div style={{background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:14,padding:"1.4rem",marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10}}>
          <div><div style={{fontSize:13,fontWeight:800,color:"var(--text)"}}> Conversione del percorso</div><div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>Quante persone raggiungono ogni fase</div></div>
          <select value={barCiclo} onChange={e=>setBarCiclo(e.target.value)} style={{width:"auto",minWidth:160}}><option value="ALL">Tutti i cicli</option>{[...cicli].sort((a,b)=>b-a).map(c=><option key={c} value={c}>Ciclo {c}</option>)}</select>
        </div>
        <div style={{height:300}}><ResponsiveContainer width="100%" height="100%"><BarChart data={barData} margin={{top:5,right:10,left:-15,bottom:5}}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/><XAxis dataKey="fase" stroke="var(--muted)" fontSize={12}/><YAxis stroke="var(--muted)" fontSize={12} allowDecimals={false}/><Tooltip {...tProps} cursor={{fill:"var(--bg4)60"}}/><Bar dataKey="count" name="Raggiunti" radius={[6,6,0,0]}>{barData.map((e,i)=><Cell key={i} fill={e.fill}/>)}</Bar></BarChart></ResponsiveContainer></div>
        <div style={{display:"flex",gap:8,marginTop:14,flexWrap:"wrap"}}>{dropOffs.map((d,i)=>(<div key={i} style={{flex:"1 1 120px",background:bottleneck&&d.da===bottleneck.da&&d.a===bottleneck.a?"#f59e0b12":"var(--bg3)",border:bottleneck&&d.da===bottleneck.da&&d.a===bottleneck.a?"1px solid #f59e0b40":"1px solid var(--border)",borderRadius:9,padding:"9px 11px"}}><div style={{fontSize:10,color:"var(--muted)",fontWeight:600}}>{d.da} → {d.a}</div><div style={{fontSize:18,fontWeight:900,color:d.color,marginTop:2}}>{d.rate}%</div></div>))}</div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
        <div style={{background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:14,padding:"1.4rem",position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:"linear-gradient(90deg,#3b82f6,#3b82f644)"}}/>
          <div style={{fontSize:11,color:"var(--muted)",fontWeight:700,textTransform:"uppercase",letterSpacing:.6,marginBottom:8}}>Tempo medio di conversione</div>
          {tempoMedioConversione!=null
            ? <><div style={{fontSize:34,fontWeight:900,color:"#3b82f6",lineHeight:1}}>{tempoMedioConversione} <span style={{fontSize:16,fontWeight:700,color:"var(--muted)"}}>giorni</span></div>
              <div style={{fontSize:12,color:"var(--muted)",marginTop:8}}>Da quando conosci il prospect a quando si iscrive, in media ({durate.length} iscritti analizzati)</div></>
            : <div style={{fontSize:13,color:"var(--muted)",marginTop:6}}>Non ci sono ancora abbastanza iscritti con date complete per calcolarlo</div>
          }
        </div>
        <div style={{background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:14,padding:"1.4rem",position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:"linear-gradient(90deg,#10b981,#10b98144)"}}/>
          <div style={{fontSize:11,color:"var(--muted)",fontWeight:700,textTransform:"uppercase",letterSpacing:.6,marginBottom:8}}>Fonte migliore</div>
          {fonteMigliore
            ? <><div style={{fontSize:34,fontWeight:900,color:"#10b981",lineHeight:1}}>{fonteMigliore.fonte}</div>
              <div style={{fontSize:12,color:"var(--muted)",marginTop:8}}>{fonteMigliore.rate}% di conversione su {fonteMigliore.tot} prospect — la fonte dove vale la pena investire di più</div></>
            : <div style={{fontSize:13,color:"var(--muted)",marginTop:6}}>Servono almeno 3 prospect per ogni fonte per confrontarle</div>
          }
        </div>
      </div>

      {fontiReport.length>0 && (
        <div style={{background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:14,overflow:"hidden",marginBottom:16}}>
          <div style={{padding:"1.1rem 1.4rem",borderBottom:"1px solid var(--border)"}}>
            <div style={{fontSize:13,fontWeight:800,color:"var(--text)"}}>Da dove arrivano i prospect</div>
            <div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>{barCiclo==="ALL"?"Su tutti i cicli":"Nel ciclo "+barCiclo} — Lista Nomi, Instagram e le altre fonti — stessi conteggi del grafico ({fontiReport.reduce((a,r)=>a+r.tot,0)} inviti in totale)</div>
          </div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",minWidth:560}}>
              <thead><tr style={{borderBottom:"1px solid var(--border)"}}>{["Fonte","Prospect","Arrivati a Conoscitiva","Iscritti","Conv%"].map(h=>(<th key={h} style={{textAlign:"left",color:"var(--muted)",fontWeight:700,fontSize:10,textTransform:"uppercase",padding:"11px 16px",whiteSpace:"nowrap"}}>{h}</th>))}</tr></thead>
              <tbody>{fontiReport.map(r=>(
                <tr key={r.fonte} style={{borderBottom:"1px solid var(--border)"}}>
                  <td style={{padding:"11px 16px",fontWeight:700,fontSize:13,color:"var(--text)",whiteSpace:"nowrap"}}>{FONTE_ICO[r.fonte]||""} {r.fonte}</td>
                  <td style={{padding:"11px 16px",minWidth:180}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{flex:1,height:8,background:"var(--bg4)",borderRadius:99,overflow:"hidden"}}><div style={{width:Math.round(r.tot/fontiMax*100)+"%",height:"100%",background:"linear-gradient(90deg,var(--a1),var(--a2))",borderRadius:99}}/></div>
                      <span style={{fontWeight:800,fontSize:13,color:"var(--text)",minWidth:24,textAlign:"right"}}>{r.tot}</span>
                    </div>
                  </td>
                  <td style={{padding:"11px 16px",fontWeight:700,fontSize:13,color:"var(--muted)"}}>{r.conosc}</td>
                  <td style={{padding:"11px 16px",fontWeight:800,fontSize:13,color:r.sub>0?"#10b981":"var(--border2)"}}>{r.sub}</td>
                  <td style={{padding:"11px 16px",fontWeight:800,fontSize:13,color:r.rate>=20?"#10b981":r.rate>=10?"var(--a2)":"#f59e0b"}}>{r.rate}%</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}

      {showClassifica && classificaRows.length>0 && (
        <div style={{background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:14,overflow:"hidden",marginBottom:16}}>
          <div style={{padding:"1.1rem 1.4rem",borderBottom:"1px solid var(--border)"}}><div style={{fontSize:13,fontWeight:800,color:"var(--text)"}}> Classifica conversione</div><div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>{barCiclo==="ALL"?"Su tutti i cicli":"Ciclo "+barCiclo} — chi converte meglio nel team (min. 2 invitati)</div></div>
          <div>{classificaRows.map((r,i)=>(
            <div key={r.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 20px",borderBottom:i<classificaRows.length-1?"1px solid var(--border)":"none"}}>
              <div style={{width:24,fontSize:14,fontWeight:900,color:i===0?"#f59e0b":i===1?"#c0c0c0":i===2?"#cd7f32":"var(--border2)"}}>{i<3?["🥇","🥈","🥉"][i]:i+1}</div>
              <div style={{flex:1,fontSize:13,fontWeight:700,color:"var(--text)"}}>{r.label}</div>
              <div style={{fontSize:11,color:"var(--muted)"}}>{r.sub}/{r.invito} iscritti</div>
              <div style={{fontSize:15,fontWeight:900,color:r.rate>=20?"#10b981":r.rate>=10?"var(--a2)":"#f59e0b",minWidth:48,textAlign:"right"}}>{r.rate}%</div>
            </div>
          ))}</div>
        </div>
      )}

      <div style={{background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:14,overflow:"hidden"}}>
        <div style={{padding:"1.1rem 1.4rem",borderBottom:"1px solid var(--border)"}}><div style={{fontSize:13,fontWeight:800,color:"var(--text)"}}> Cicli a confronto</div><div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>Dal ciclo {STATS_START_CICLO} in poi — prima non si tracciava ancora</div></div>
        <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:640}}><thead><tr style={{borderBottom:"1px solid var(--border)"}}><th style={{textAlign:"left",color:"var(--muted)",fontWeight:700,fontSize:10,textTransform:"uppercase",padding:"11px 16px"}}>Ciclo</th>{FASI_STATS.map(f=><th key={f} style={{textAlign:"center",color:FASE_CLR[f],fontWeight:700,fontSize:10,textTransform:"uppercase",padding:"11px 10px"}}>{FASE_LABEL[f]}</th>)}<th style={{textAlign:"center",color:"var(--muted)",fontWeight:700,fontSize:10,textTransform:"uppercase",padding:"11px 16px"}}>Conv%</th></tr></thead><tbody>{tableRows.map(r=>(<tr key={r.c} className="hrow" style={{borderBottom:"1px solid var(--border)"}}><td style={{padding:"11px 16px"}}><span style={{background:r.c===CICLO_CORRENTE?"var(--a1-13)":"var(--border)",color:r.c===CICLO_CORRENTE?"var(--a2)":"var(--muted)",borderRadius:6,padding:"3px 9px",fontSize:11,fontWeight:700}}>C{r.c}</span></td>{FASI_STATS.map(f=><td key={f} style={{textAlign:"center",padding:"11px 10px",fontWeight:700,fontSize:13,color:r[f]>0?"var(--text)":"var(--border2)"}}>{r[f]}</td>)}<td style={{textAlign:"center",padding:"11px 16px",fontWeight:800,fontSize:13,color:r.conv>=20?"#10b981":r.conv>=10?"var(--a2)":"#f59e0b"}}>{r.conv}%{r.delta!=null&&r.delta!==0&&<span style={{marginLeft:6,fontSize:11,color:r.delta>0?"#10b981":"#ef4444"}}>{r.delta>0?"▲":"▼"}{Math.abs(r.delta)}</span>}</td></tr>))}</tbody></table></div>
      </div>
    </div>
  );
}

//  LISTA 
// Calcolo dei cambiamenti (funzioni pure, riusate dalla tabella e dall'assistente vocale)
function stepPatch(p, fase) {
  return { fase, storico: buildStorico(p, fase, today()) };
}
function sitPatch(p, v) {
  if (v==="iscritto") return { patch:{ fase:"SUB", storico:buildStorico(p,"SUB",today()), statoColore:"iscritto" }, msg:"Iscritto \u2705 (per i BV apri la matita e scegli il pacchetto)" };
  if (v==="riprendere") return { patch:{ statoColore:"da_risentire" }, msg:"Da riprendere pi\u00f9 avanti" };
  if (v==="non_interessato") return { patch:{ fase:"NON_INT", storico:buildStorico(p,"NON_INT",today()), statoColore:"" }, msg:"Non interessato" };
  if (v==="futuro_si") return { patch:{ statoColore:"futuro_si" }, msg:"Futuro s\u00ec" };
  let fase=p.fase; let storico=p.storico||[];
  if (fase==="SUB"||FASI_SPECIALI.includes(fase)) {
    storico=storico.filter(x=>x.fase!=="SUB");
    let best="INVITO";
    storico.forEach(x=>{const i=FASI_FUNNEL.indexOf(x.fase); if(i>=0&&i>FASI_FUNNEL.indexOf(best)) best=x.fase;});
    fase=best;
  }
  return { patch:{ statoColore:"", fase, storico }, msg:"Di nuovo in processo" };
}

// Situazione di un prospect (colonna "Situazione"): "" = ancora in processo
function situazioneOf(p) {
  if (p.statoColore==="iscritto" || p.fase==="SUB") return "iscritto";
  if (p.statoColore==="da_risentire" || p.fase==="FOLLOW_UP") return "riprendere";
  if (p.statoColore==="futuro_si") return "futuro_si";
  // vecchi "sparito"/"balzato" -> Non interessato
  if (p.statoColore==="sparito" || p.statoColore==="balzato" || p.fase==="NON_INT" || p.fase==="NON_PIACE") return "non_interessato";
  return "";
}
const SITUAZIONE_OPTS = [
  { v:"iscritto",   label:"Iscritto",             color:"#10b981" },
  { v:"riprendere", label:"Riprendere più avanti", color:"#f59e0b" },
  { v:"non_interessato", label:"Non interessato",   color:"#6b7280" },
  { v:"futuro_si",  label:"Futuro sì",            color:"#ef4444" },
];
const PROSPECT_STEPS = [
  { v:"CONOSCITIVA", label:"Fatta conoscitiva" },
  { v:"FUP1",        label:"Fatto FUP 1" },
  { v:"FUP2",        label:"Fatto FUP 2" },
  { v:"PACK",        label:"Fatto Pack" },
  { v:"CLOSING",     label:"Fatto Closing" },
];
const PROSPECT_FASE_LABEL = { ...FASE_LABEL, INVITO:"Da fissare" };

function Lista({ onToggleChat, onSetStep, onSetSituazione, onEdit, prospects, total, search, setSearch, fFase, setFFase, fFonte, setFFonte, fCiclo, setFCiclo, fSituazione, setFSituazione, fMembroTeam, setFMembroTeam, fAmbito, setFAmbito, downline, onAdd, hasTeam }) {
  const isMobile = useIsMobile();
  const [limit,setLimit] = useState(50);
  useEffect(()=>{ setLimit(50); },[search,fFase,fFonte,fCiclo,fSituazione,fMembroTeam,fAmbito]);
  const shown = prospects.slice(0,limit);
  const mine = shown.filter(p=>!p._userId);
  const team = shown.filter(p=>!!p._userId);
  const th = {textAlign:"left",color:"var(--muted)",fontWeight:700,fontSize:10.5,textTransform:"uppercase",letterSpacing:.8,padding:"13px 14px",whiteSpace:"nowrap",background:"var(--bg3)"};
  const td = {padding:"11px 14px",verticalAlign:"middle"};
  const heads = ["Prospect","Telefono","Ciclo","Fonte","Fase","Chat aperta","Prossimo step","Situazione",""];

  const renderRow = (p) => {
    const c=cicloOfDate(p.conosciutoAt);
    const sit=situazioneOf(p);
    const sitOpt=SITUAZIONE_OPTS.find(o=>o.v===sit);
    const tint=sitOpt?sitOpt.color:null;
    const faseClr=FASE_CLR[p.fase]||"var(--a1)";
    return (
      <tr key={p.id} className="hrow" style={{borderBottom:"1px solid var(--border)",background:tint?tint+"12":"transparent",borderLeft:tint?"3px solid "+tint:"3px solid transparent"}}>
        <td style={td}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <Av n={p.nome} c={p.cognome} color={faseClr}/>
            <div>
              <div style={{color:"var(--text)",fontWeight:700,fontSize:13.5,whiteSpace:"nowrap"}}>{p.nome} {p.cognome}</div>
              {p._userId && <div style={{fontSize:11,color:"var(--a2)",fontWeight:600}}>di {p._ownerName||"—"}</div>}
              {p.citta && <div style={{fontSize:11,color:"var(--muted)"}}>{p.citta}</div>}
            </div>
          </div>
        </td>
        <td style={{...td,fontSize:12.5}}>{p.telefono?<a href={"tel:"+p.telefono} style={{color:"var(--a2)",textDecoration:"none",fontWeight:600,whiteSpace:"nowrap"}}>{p.telefono}</a>:<span style={{color:"var(--muted)"}}>{"—"}</span>}</td>
        <td style={td}>{c?<span style={{background:c===CICLO_CORRENTE?"var(--a1-13)":"var(--bg3)",color:c===CICLO_CORRENTE?"var(--a2)":"var(--muted)",borderRadius:7,padding:"3px 9px",fontSize:11.5,fontWeight:700}}>C{c}</span>:<span style={{color:"var(--muted)"}}>{"—"}</span>}</td>
        <td style={{...td,color:"var(--muted)",fontSize:12.5,whiteSpace:"nowrap"}}>{p.fonte}</td>
        <td style={td}><span style={{display:"inline-flex",alignItems:"center",borderRadius:8,padding:"4px 11px",fontSize:11.5,fontWeight:700,color:"#fff",background:faseClr,whiteSpace:"nowrap"}}>{PROSPECT_FASE_LABEL[p.fase]||p.fase}</span></td>
        <td style={{...td,textAlign:"center"}}>
          <input type="checkbox" checked={!!p.chatAperta} onChange={e=>onToggleChat(p.id,e.target.checked)} title="Chat aperta" style={{width:18,height:18,cursor:"pointer",accentColor:"#6d5efc"}} />
        </td>
        <td style={td}>
          <select value="" onChange={e=>{ if(e.target.value) onSetStep(p,e.target.value); }} style={{width:"auto",minWidth:150,padding:"7px 10px",fontSize:12.5,fontWeight:600}}>
            <option value="">Seleziona...</option>
            {PROSPECT_STEPS.map(st=><option key={st.v} value={st.v}>{st.label}</option>)}
          </select>
        </td>
        <td style={td}>
          <select value={sit} onChange={e=>onSetSituazione(p,e.target.value)}
            style={{width:"auto",minWidth:160,padding:"7px 10px",fontSize:12.5,fontWeight:700,color:sitOpt?sitOpt.color:"var(--text)",background:sitOpt?sitOpt.color+"14":"var(--bg2)",borderColor:sitOpt?sitOpt.color+"66":"var(--border2)"}}>
            <option value="">In processo</option>
            {SITUAZIONE_OPTS.map(o=><option key={o.v} value={o.v}>{o.label}</option>)}
          </select>
        </td>
        <td style={td}><button onClick={()=>onEdit(p)} title="Modifica" style={{background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:9,cursor:"pointer",padding:"6px 9px",fontSize:13}}>{"✏️"}</button></td>
      </tr>
    );
  };

  const renderCard = (p) => {
    const c=cicloOfDate(p.conosciutoAt);
    const sit=situazioneOf(p);
    const sitOpt=SITUAZIONE_OPTS.find(o=>o.v===sit);
    const tint=sitOpt?sitOpt.color:null;
    const faseClr=FASE_CLR[p.fase]||"var(--a1)";
    const pill={display:"inline-flex",alignItems:"center",borderRadius:99,padding:"4px 11px",fontSize:12,fontWeight:700,whiteSpace:"nowrap"};
    return (
      <div key={p.id} style={{border:"1px solid var(--border)",borderLeft:"4px solid "+(tint||faseClr),borderRadius:16,padding:"14px",marginBottom:10,background:tint?tint+"10":"var(--bg2)",boxShadow:"0 1px 2px #0f172a0a"}}>
        <div style={{display:"flex",alignItems:"center",gap:11}}>
          <Av n={p.nome} c={p.cognome} color={faseClr} size={42}/>
          <div style={{flex:1,minWidth:0}}>
            <div style={{color:"var(--text)",fontWeight:800,fontSize:16,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.nome} {p.cognome}</div>
            <div style={{fontSize:12,color:"var(--muted)"}}>{[p.citta, p._userId?("di "+(p._ownerName||"")):""].filter(Boolean).join(" \u00b7 ")}</div>
          </div>
          <button onClick={()=>onEdit(p)} style={{background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:11,cursor:"pointer",padding:"9px 12px",fontSize:15}}>{"\u270f\ufe0f"}</button>
        </div>
        <div style={{display:"flex",flexWrap:"wrap",gap:6,margin:"11px 0"}}>
          <span style={{...pill,color:"#fff",background:faseClr}}>{PROSPECT_FASE_LABEL[p.fase]||p.fase}</span>
          {c && <span style={{...pill,background:"var(--bg4)",color:"var(--a2)"}}>C{c}</span>}
          <span style={{...pill,background:"var(--bg3)",color:"var(--muted)"}}>{p.fonte}</span>
          {p.telefono && <a href={"tel:"+p.telefono} style={{...pill,background:"#10b9811f",color:"#059669",textDecoration:"none"}}>{"\ud83d\udcde"} {p.telefono}</a>}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <select value="" onChange={e=>{ if(e.target.value) onSetStep(p,e.target.value); }} style={{padding:"11px 10px",fontWeight:600}}>
            <option value="">Prossimo step</option>
            {PROSPECT_STEPS.map(st=><option key={st.v} value={st.v}>{st.label}</option>)}
          </select>
          <select value={sit} onChange={e=>onSetSituazione(p,e.target.value)}
            style={{padding:"11px 10px",fontWeight:700,color:sitOpt?sitOpt.color:"var(--text)",background:sitOpt?sitOpt.color+"14":"var(--bg2)",borderColor:sitOpt?sitOpt.color+"66":"var(--border2)"}}>
            <option value="">In processo</option>
            {SITUAZIONE_OPTS.map(o=><option key={o.v} value={o.v}>{o.label}</option>)}
          </select>
        </div>
        <label style={{display:"flex",alignItems:"center",gap:10,marginTop:11,fontSize:14,fontWeight:600,color:"var(--text)",cursor:"pointer"}}>
          <input type="checkbox" checked={!!p.chatAperta} onChange={e=>onToggleChat(p.id,e.target.checked)} style={{width:22,height:22,accentColor:"#6d5efc"}} /> Chat aperta
        </label>
      </div>
    );
  };

  return (
    <div className="page-wrap" style={{padding:"2rem 2.2rem",maxWidth:1400,margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1.4rem",flexWrap:"wrap",gap:12}}>
        <div>
          <h1 style={{fontWeight:800,fontSize:26,color:"var(--text)"}}>Prospect</h1>
          <p style={{color:"var(--muted)",fontSize:12.5,marginTop:3}}>{prospects.length} di {total} visualizzati</p>
        </div>
        <button onClick={onAdd} style={{padding:"10px 20px",fontSize:13.5,fontWeight:700,background:"linear-gradient(135deg,var(--a1),var(--a2))",color:"#fff",border:"none",borderRadius:12,cursor:"pointer",boxShadow:"0 8px 18px -8px #6d5efcaa"}}>+ Aggiungi prospect</button>
      </div>
      <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap"}}>
        <input placeholder="Cerca per nome, cognome o città..." value={search} onChange={e=>setSearch(e.target.value)} style={{flex:2,minWidth:220}} />
        <select value={fSituazione} onChange={e=>setFSituazione(e.target.value)} style={{flex:1,minWidth:150}}>
          <option value="processo">In processo</option>
          <option value="iscritto">Iscritti</option>
          <option value="riprendere">Da riprendere più avanti</option>
          <option value="non_interessato">Non interessati</option>
          <option value="futuro_si">Futuro sì</option>
          <option value="persi">Da recuperare (futuro sì + riprendere + non int.)</option>
          <option value="tutti">Tutti</option>
        </select>
        <select value={fFase} onChange={e=>setFFase(e.target.value)} style={{flex:1,minWidth:130}}>
          <option value="">Tutte le fasi</option>
          {FASI_FUNNEL.map(f=><option key={f} value={f}>{PROSPECT_FASE_LABEL[f]}</option>)}
        </select>
        <select value={fFonte} onChange={e=>setFFonte(e.target.value)} style={{flex:1,minWidth:120}}><option value="">Tutte le fonti</option>{FONTI.map(f=><option key={f}>{f}</option>)}</select>
        <select value={fCiclo} onChange={e=>setFCiclo(e.target.value)} style={{flex:1,minWidth:130}}><option value="">Tutti i cicli</option>{CICLO_NUMS.map(c=><option key={c} value={c}>Ciclo {c}</option>)}</select>
        {hasTeam && <FiltroTeam downline={downline} fMembroTeam={fMembroTeam} setFMembroTeam={setFMembroTeam} fAmbito={fAmbito} setFAmbito={setFAmbito} />}
      </div>
      {prospects.length===0
        ?<div style={{textAlign:"center",padding:"4rem",color:"var(--muted)"}}><p style={{fontSize:14,marginBottom:14}}>Nessun prospect trovato</p><button onClick={onAdd} style={{padding:"10px 20px",fontSize:13,fontWeight:700,background:"linear-gradient(135deg,var(--a1),var(--a2))",color:"#fff",border:"none",borderRadius:12,cursor:"pointer"}}>Aggiungi il primo</button></div>
        :<>
          {isMobile
            ? <div>
                {mine.map(renderCard)}
                {team.length>0 && mine.length>0 && <div style={{margin:"14px 2px 10px",fontSize:11,fontWeight:800,color:"var(--a2)",textTransform:"uppercase",letterSpacing:1}}>Prospect del team</div>}
                {team.map(renderCard)}
              </div>
            : <div className="tbl-wrap card-soft" style={{background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:18,overflow:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",minWidth:1000}}>
                  <thead><tr>{heads.map((h,i)=>(<th key={i} style={th}>{h}</th>))}</tr></thead>
                  <tbody>
                    {mine.map(renderRow)}
                    {team.length>0 && mine.length>0 && (
                      <tr><td colSpan={heads.length} style={{padding:"10px 14px",fontSize:11,fontWeight:800,color:"var(--a2)",textTransform:"uppercase",letterSpacing:1,background:"var(--bg4)"}}>Prospect del team</td></tr>
                    )}
                    {team.map(renderRow)}
                  </tbody>
                </table>
              </div>}
          {prospects.length>limit && (
            <div style={{textAlign:"center",marginTop:14}}>
              <button onClick={()=>setLimit(l=>l+50)} style={{padding:"12px 22px",background:"var(--bg4)",color:"var(--a2)",border:"1px solid var(--border2)",borderRadius:12,cursor:"pointer",fontWeight:700,fontSize:14}}>Mostra altri ({prospects.length-limit} rimanenti)</button>
            </div>
          )}
        </>
      }
    </div>
  );
}

//  FORM MODAL
function FiltroTeam({ downline, fMembroTeam, setFMembroTeam, fAmbito, setFAmbito }) {
  const [q,setQ]=useState(""); const [open,setOpen]=useState(false);
  const nome=m=>((m.nome||m.email||"")+" "+(m.cognome||"")).trim();
  const sel=fMembroTeam&&fMembroTeam!=="__miei"?(downline||[]).find(m=>m.id===fMembroTeam):null;
  const ql=q.trim().toLowerCase();
  const risultati=(downline||[]).filter(m=>!ql||nome(m).toLowerCase().includes(ql)).slice(0,8);
  const ambiti=sel?[["tutti","Lui + il suo team"],["solo","Solo lui"],["sinistra","Sinistra"],["destra","Destra"]]
    :[["tutti","Tutti"],["solo","Solo i miei"],["sinistra","Mio team sinistra"],["destra","Mio team destra"]];
  return (
    <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",flex:"1 1 100%"}}>
      <div style={{position:"relative",flex:"1 1 220px",minWidth:200}}>
        {sel
          ? <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,background:"var(--a1-10)",border:"1px solid var(--a1-25)",borderRadius:10,padding:"9px 12px",fontSize:13,fontWeight:700,color:"var(--text)"}}>
              <span>{"👤 "}{nome(sel)}</span>
              <button onClick={()=>{setFMembroTeam("");setQ("");}} style={{background:"none",border:"none",cursor:"pointer",color:"var(--muted)",fontSize:15,fontWeight:800}}>{"✕"}</button>
            </div>
          : <input value={q} onChange={e=>{setQ(e.target.value);setOpen(true);}} onFocus={()=>setOpen(true)} onBlur={()=>setTimeout(()=>setOpen(false),150)} placeholder="Cerca una persona del team..." />}
        {!sel && open && (
          <div style={{position:"absolute",top:"100%",left:0,right:0,marginTop:4,background:"var(--bg2)",border:"1px solid var(--border2)",borderRadius:10,boxShadow:"0 12px 30px -10px #0f172a55",zIndex:30,maxHeight:260,overflowY:"auto"}}>
            {risultati.length===0
              ? <div style={{padding:"10px 12px",fontSize:12,color:"var(--muted)"}}>Nessuno trovato</div>
              : risultati.map(m=><div key={m.id} onMouseDown={e=>{e.preventDefault();setFMembroTeam(m.id);setQ("");setOpen(false);}} style={{padding:"9px 12px",fontSize:13,cursor:"pointer",color:"var(--text)"}}>{nome(m)}</div>)}
          </div>
        )}
      </div>
      <div style={{display:"flex",background:"var(--bg3)",borderRadius:10,padding:4,border:"1px solid var(--border)",flexWrap:"wrap"}}>
        {ambiti.map(([k,l])=>(
          <button key={k} onClick={()=>setFAmbito(k)} className="tabbtn"
            style={{background:fAmbito===k?"var(--bg4)":"transparent",color:fAmbito===k?"var(--a2)":"var(--muted)",boxShadow:fAmbito===k?"inset 0 0 0 1px var(--sidebar-border)":"none",fontSize:11,padding:"6px 12px"}}>{l}</button>
        ))}
      </div>
    </div>
  );
}

function ClienteQuickModal({ form, setForm, onSave, onClose, isLeader, downline, saving }) {
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const lbl={fontSize:11,fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:.8,marginBottom:5,display:"block"};
  return (
    <div style={{background:"var(--bg2)",border:"1px solid var(--border2)",borderRadius:16,padding:"1.6rem",maxHeight:"90vh",overflowY:"auto",boxShadow:"0 20px 70px #0f172a55"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
        <h2 style={{fontWeight:900,fontSize:17,color:"var(--text)"}}>+ Aggiungi cliente</h2>
        <button onClick={onClose} style={{background:"var(--bg4)",color:"var(--muted)",border:"1px solid var(--border2)",borderRadius:8,cursor:"pointer",padding:"4px 10px",fontSize:14}}></button>
      </div>
      <p style={{fontSize:12,color:"var(--muted)",marginBottom:18}}>Per chi è già cliente/iscritto — niente funnel, solo i dati per tenerlo in conto nei rinnovi.</p>

      {isLeader && (
        <div style={{marginBottom:14}}>
          <label style={lbl}>Di chi è (a chi lo metti sotto)</label>
          <select value={form._userId||""} onChange={e=>set("_userId",e.target.value||null)}>
            <option value="">Tu</option>
            {(downline||[]).map(m=><option key={m.id} value={m.id}>{m.nome||m.email} {m.cognome||""}</option>)}
          </select>
        </div>
      )}
      <div style={{marginBottom:14}}>
        <label style={lbl}>Gamba</label>
        <select value={form.team||""} onChange={e=>set("team",e.target.value)}>
          <option value="">Non assegnata</option>
          <option value="sinistra">Sinistra</option>
          <option value="destra">Destra</option>
        </select>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
        <div>
          <label style={lbl}>Nome *</label>
          <input value={form.nome||""} onChange={e=>set("nome",e.target.value)} placeholder="Nome" />
        </div>
        <div>
          <label style={lbl}>Cognome</label>
          <input value={form.cognome||""} onChange={e=>set("cognome",e.target.value)} placeholder="Cognome" />
        </div>
      </div>
      <div style={{marginBottom:20}}>
        <label style={lbl}>Città</label>
        <input value={form.citta||""} onChange={e=>set("citta",e.target.value)} placeholder="Città" />
      </div>

      <div style={{display:"flex",gap:9,justifyContent:"flex-end"}}>
        <button onClick={onClose} style={{padding:"9px 15px",background:"var(--bg4)",color:"var(--muted)",border:"1px solid var(--border2)",borderRadius:9,cursor:"pointer",fontWeight:600,fontSize:13}}>Annulla</button>
        <button onClick={()=>onSave(form)} disabled={saving} style={{padding:"9px 20px",background:"linear-gradient(135deg,#10b981,#10b981bb)",color:"#fff",border:"none",borderRadius:9,cursor:saving?"not-allowed":"pointer",fontWeight:800,fontSize:13,opacity:saving?0.7:1}}>{saving?"Aggiungo...":"Aggiungi cliente"}</button>
      </div>
    </div>
  );
}

function MembroQuickModal({ form, setForm, onSave, onClose, isLeader, downline, saving }) {
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const lbl={fontSize:11,fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:.8,marginBottom:5,display:"block"};
  const [risultato, setRisultato] = useState(null); // {password} dopo la creazione riuscita
  const [copiato, setCopiato] = useState(false);

  async function submit() {
    const res = await onSave(form);
    if (res) setRisultato(res);
  }

  if (risultato) {
    return (
      <div style={{background:"var(--bg2)",border:"1px solid var(--border2)",borderRadius:16,padding:"1.6rem",maxWidth:440,boxShadow:"0 20px 70px #0f172a55"}}>
        <h2 style={{fontWeight:900,fontSize:17,color:"var(--text)",marginBottom:10}}> Membro creato</h2>
        <p style={{fontSize:12,color:"var(--muted)",marginBottom:16,lineHeight:1.6}}>Manda a <b style={{color:"var(--text)"}}>{form.email}</b> queste credenziali per il primo accesso — potrà cambiare la password quando vuole da "Password dimenticata".</p>
        <div style={{background:"var(--bg3)",border:"1px solid var(--border2)",borderRadius:10,padding:"12px 14px",marginBottom:16}}>
          <div style={{fontSize:10,color:"var(--muted)",fontWeight:700,textTransform:"uppercase",marginBottom:4}}>Email</div>
          <div style={{fontSize:13,color:"var(--text)",fontWeight:700,marginBottom:10}}>{form.email}</div>
          <div style={{fontSize:10,color:"var(--muted)",fontWeight:700,textTransform:"uppercase",marginBottom:4}}>Password temporanea</div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{fontSize:15,color:"#10b981",fontWeight:900,letterSpacing:1,fontFamily:"monospace"}}>{risultato.password}</div>
            <button onClick={()=>{navigator.clipboard.writeText(risultato.password);setCopiato(true);setTimeout(()=>setCopiato(false),2000);}}
              style={{padding:"4px 10px",background:"var(--bg4)",color:"var(--a2)",border:"1px solid var(--border2)",borderRadius:7,cursor:"pointer",fontSize:11,fontWeight:700}}>
              {copiato?"Copiata ✓":"Copia"}
            </button>
          </div>
        </div>
        <button onClick={onClose} style={{width:"100%",padding:"10px",background:"linear-gradient(135deg,var(--a1),var(--a2))",color:"#fff",border:"none",borderRadius:9,cursor:"pointer",fontWeight:800,fontSize:13}}>Fatto</button>
      </div>
    );
  }

  return (
    <div style={{background:"var(--bg2)",border:"1px solid var(--border2)",borderRadius:16,padding:"1.6rem",maxHeight:"90vh",overflowY:"auto",boxShadow:"0 20px 70px #0f172a55"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
        <h2 style={{fontWeight:900,fontSize:17,color:"var(--text)"}}>+ Aggiungi membro</h2>
        <button onClick={onClose} style={{background:"var(--bg4)",color:"var(--muted)",border:"1px solid var(--border2)",borderRadius:8,cursor:"pointer",padding:"4px 10px",fontSize:14}}></button>
      </div>
      <p style={{fontSize:12,color:"var(--muted)",marginBottom:18}}>Crea l'account direttamente — niente link né codici, viene posizionato subito nell'albero.</p>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
        <div>
          <label style={lbl}>Nome *</label>
          <input value={form.nome||""} onChange={e=>set("nome",e.target.value)} placeholder="Nome" />
        </div>
        <div>
          <label style={lbl}>Cognome</label>
          <input value={form.cognome||""} onChange={e=>set("cognome",e.target.value)} placeholder="Cognome" />
        </div>
      </div>
      <div style={{marginBottom:14}}>
        <label style={lbl}>Email *</label>
        <input type="email" value={form.email||""} onChange={e=>set("email",e.target.value)} placeholder="email@esempio.com" />
      </div>
      {isLeader && (
        <div style={{marginBottom:14}}>
          <label style={lbl}>Sotto chi lo metti</label>
          <select value={form._userId||""} onChange={e=>set("_userId",e.target.value||null)}>
            <option value="">Tu</option>
            {(downline||[]).map(m=><option key={m.id} value={m.id}>{m.nome||m.email} {m.cognome||""}</option>)}
          </select>
        </div>
      )}
      <div style={{marginBottom:20}}>
        <label style={lbl}>Gamba</label>
        <select value={form.team||""} onChange={e=>set("team",e.target.value)}>
          <option value="">Non assegnata</option>
          <option value="sinistra">Sinistra</option>
          <option value="destra">Destra</option>
        </select>
      </div>

      <div style={{display:"flex",gap:9,justifyContent:"flex-end"}}>
        <button onClick={onClose} style={{padding:"9px 15px",background:"var(--bg4)",color:"var(--muted)",border:"1px solid var(--border2)",borderRadius:9,cursor:"pointer",fontWeight:600,fontSize:13}}>Annulla</button>
        <button onClick={submit} disabled={saving} style={{padding:"9px 20px",background:"linear-gradient(135deg,#10b981,#10b981bb)",color:"#fff",border:"none",borderRadius:9,cursor:saving?"not-allowed":"pointer",fontWeight:800,fontSize:13,opacity:saving?0.7:1}}>{saving?"Creo...":"Crea membro"}</button>
      </div>
    </div>
  );
}

function FormModal({ form, setForm, onSave, onClose, onDelete, isEdit, isLeader, downline }) {
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const lbl={fontSize:11,fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:.8,marginBottom:5,display:"block"};
  return (
    <div style={{background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:20,padding:"1.7rem",maxHeight:"90vh",overflowY:"auto",boxShadow:"0 30px 80px -20px #0f172a55"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <h2 style={{fontWeight:800,fontSize:18,color:"var(--text)"}}>{isEdit?"Modifica prospect":"Nuovo prospect"}</h2>
        <button onClick={onClose} style={{background:"var(--bg3)",color:"var(--muted)",border:"1px solid var(--border)",borderRadius:9,cursor:"pointer",padding:"4px 11px",fontSize:14}}>{"✕"}</button>
      </div>
      {isLeader && !isEdit && (
        <div style={{marginBottom:14,background:"var(--a1-10)",border:"1px solid var(--a1-25)",borderRadius:12,padding:"10px 12px"}}>
          <label style={lbl}>Questo prospect è di</label>
          <select value={form._userId||""} onChange={e=>set("_userId",e.target.value||null)}>
            <option value="">Tu</option>
            {(downline||[]).map(m=><option key={m.id} value={m.id}>{m.nome||m.email} {m.cognome||""}</option>)}
          </select>
        </div>
      )}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
        <div><label style={lbl}>Nome *</label><input value={form.nome||""} onChange={e=>set("nome",e.target.value)} placeholder="Nome" /></div>
        <div><label style={lbl}>Cognome</label><input value={form.cognome||""} onChange={e=>set("cognome",e.target.value)} placeholder="Cognome" /></div>
        <div><label style={lbl}>Città</label><input value={form.citta||""} onChange={e=>set("citta",e.target.value)} placeholder="es. Milano" /></div>
        <div><label style={lbl}>Telefono</label><input value={form.telefono||""} onChange={e=>set("telefono",e.target.value)} placeholder="+39 333 000 0000" /></div>
        <div style={{gridColumn:"1/-1"}}><label style={lbl}>Fonte</label><select value={form.fonte||"Instagram"} onChange={e=>set("fonte",e.target.value)}>{FONTI.map(f=><option key={f} value={f}>{f}</option>)}</select></div>
        {!isEdit && (
          <div style={{gridColumn:"1/-1"}}>
            <label style={lbl}>Ciclo di conoscenza</label>
            <select value={cicloOfDate(form.conosciutoAt)||CICLO_CORRENTE} onChange={e=>{
              const c=Number(e.target.value);
              if(c===cicloOfDate(today())){ set("conosciutoAt",today()); return; }
              const r=CICLI.find(x=>x[0]===c); if(!r) return;
              const last=new Date(r[2]+"T00:00:00Z"); last.setUTCDate(last.getUTCDate()-1);
              set("conosciutoAt",last.toISOString().split("T")[0]);
            }}>
              {CICLO_NUMS.filter(c=>c<=CICLO_CORRENTE).map(c=><option key={c} value={c}>Ciclo {c}{c===CICLO_CORRENTE?" (in corso)":""}</option>)}
            </select>
          </div>
        )}
        {form.fase==="SUB" && (
          <div style={{gridColumn:"1/-1"}}>
            <label style={lbl}>Pacchetto</label>
            <select value={form.pacchetto||""} onChange={e=>set("pacchetto",e.target.value)}>
              <option value="">Seleziona pacchetto...</option>
              {PACCHETTI.map(p=><option key={p.key} value={p.key}>{p.label}{p.key!=="altro"?" — "+p.bv+" BV":""}</option>)}
            </select>
            {form.pacchetto==="altro" && (
              <div style={{marginTop:8}}>
                <label style={lbl}>BV prodotti</label>
                <input type="number" min="0" step="1" value={form.bvCustom||""} onChange={e=>set("bvCustom",parseInt(e.target.value,10)||0)} placeholder="es. 300" />
              </div>
            )}
            {form.pacchetto && (
              <div style={{marginTop:8,background:"#10b98115",border:"1px solid #10b98130",borderRadius:10,padding:"8px 12px",fontSize:12,color:"#059669",fontWeight:700}}>
                {form.pacchetto==="altro" ? (form.bvCustom||0)+" BV prodotti" : bvOfPacchetto(form.pacchetto)+" BV prodotti"}
              </div>
            )}
          </div>
        )}
      </div>
      <div style={{marginBottom:18}}><label style={lbl}>Note</label><textarea value={form.note||""} onChange={e=>set("note",e.target.value)} style={{height:76,resize:"vertical"}} placeholder="Dove lo hai conosciuto, contesto..." /></div>
      <div style={{display:"flex",gap:9,justifyContent:"flex-end",flexWrap:"wrap"}}>
        {onDelete&&<button onClick={onDelete} style={{padding:"10px 16px",background:"#ef44441a",color:"#dc2626",border:"1px solid #fecaca",borderRadius:11,cursor:"pointer",fontWeight:700,fontSize:13}}>Elimina</button>}
        <button onClick={onClose} style={{padding:"10px 16px",background:"var(--bg3)",color:"var(--muted)",border:"1px solid var(--border)",borderRadius:11,cursor:"pointer",fontWeight:600,fontSize:13}}>Annulla</button>
        <button onClick={onSave} style={{padding:"10px 22px",background:"linear-gradient(135deg,var(--a1),var(--a2))",color:"#fff",border:"none",borderRadius:11,cursor:"pointer",fontWeight:700,fontSize:13,boxShadow:"0 8px 18px -8px #6d5efcaa"}}>{isEdit?"Aggiorna":"Aggiungi"}</button>
      </div>
    </div>
  );
}

//  DETAIL MODAL 
function DetailModal({ p, onEdit, onAdvance, onFollowUp, onNonInt, onNonPiace, onRiattiva, onClose, onUpdateChecklist, onDeleteStorico, onUpdateStoricoData, onSetStatoColore, eventi, onSetTicketEvento, onSetChatAperta }) {
  const [activeTab,setActiveTab]=useState("dettagli");
  const [stepPopup, setStepPopup]=useState(null); // {fase, date}
  const [stepDate, setStepDate]=useState("");
  const clr=FASE_CLR[p.fase];const ci=FASI_FUNNEL.indexOf(p.fase);const isSpeciale=FASI_SPECIALI.includes(p.fase);
  const od=isOver(p.followUp);const dt=isToday(p.followUp);const ciclo=cicloOfDate(p.conosciutoAt);
  const lbl={fontSize:10,fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:.8,marginBottom:4};
  const box={background:"var(--bg3)",borderRadius:10,padding:"11px 13px",border:"1px solid var(--border)"};
  const storico=[...(p.storico||[])].sort((a,b)=>FASI_FUNNEL.indexOf(a.fase)-FASI_FUNNEL.indexOf(b.fase));
  return(
    <div style={{background:"var(--bg2)",border:"1px solid var(--border2)",borderRadius:16,padding:"1.6rem",maxHeight:"90vh",overflowY:"auto",boxShadow:"0 20px 70px #0f172a55"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
        <div style={{display:"flex",alignItems:"center",gap:13}}>
          <Av n={p.nome} c={p.cognome} color={clr} size={50}/>
          <div>
            <h2 style={{fontWeight:900,fontSize:19,color:"var(--text)",letterSpacing:-0.5}}>{p.nome} {p.cognome}</h2>
            <div style={{color:"var(--muted)",fontSize:12,marginTop:2}}>{p.citta||"\u2014"} {"\u00b7"} {FONTE_ICO[p.fonte]} {p.fonte}</div>
            <div style={{display:"flex",gap:6,marginTop:7,flexWrap:"wrap"}}>
              <span style={{display:"inline-flex",alignItems:"center",borderRadius:6,padding:"2px 9px",fontSize:11,fontWeight:700,color:"#fff",background:clr,boxShadow:"0 0 10px "+clr+"45"}}>{FASE_LABEL[p.fase]}</span>
              {ciclo&&<span style={{display:"inline-flex",alignItems:"center",borderRadius:6,padding:"2px 9px",fontSize:11,fontWeight:700,color:"#fff",background:ciclo===CICLO_CORRENTE?"var(--a1)":"var(--border2)"}}>Ciclo {ciclo}</span>}
              {p._ownerName&&<span style={{display:"inline-flex",alignItems:"center",borderRadius:6,padding:"2px 9px",fontSize:11,fontWeight:700,color:"#8b5cf6",background:"#8b5cf618",border:"1px solid #8b5cf630"}}> {p._ownerName.trim()}</span>}
              {p.interesse&&<span style={{display:"inline-flex",alignItems:"center",borderRadius:6,padding:"2px 9px",fontSize:11,fontWeight:700,color:INTERESSE_CLR[p.interesse],background:INTERESSE_CLR[p.interesse]+"18",border:"1px solid "+INTERESSE_CLR[p.interesse]+"30"}}>{p.interesse}</span>}
            </div>
          </div>
        </div>
        <button onClick={onClose} style={{background:"var(--bg4)",color:"var(--muted)",border:"1px solid var(--border2)",borderRadius:8,cursor:"pointer",padding:"4px 10px",fontSize:14}}></button>
      </div>
      <div style={{marginBottom:16}}>
        <div style={{fontSize:10,fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:.8,marginBottom:6}}>Colore riga (a parte dalla fase)</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {STATO_COLORE_OPTS.map(k=>{
            const active=p.statoColore===k;
            const c=STATO_COLORE_MAP[k];
            return (
              <button key={k} onClick={()=>onSetStatoColore(k)}
                style={{padding:"6px 12px",borderRadius:8,border:"1px solid "+(active?c:"var(--border2)"),background:active?c+"22":"var(--bg3)",color:active?c:"var(--muted)",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:6}}>
                <span style={{width:8,height:8,borderRadius:99,background:c,flexShrink:0}} />
                {STATO_COLORE_LABEL[k]}
              </button>
            );
          })}
        </div>
      </div>
      {(
        <>
          {!isSpeciale&&(
            <div style={{display:"flex",alignItems:"center",marginBottom:20,overflowX:"auto",paddingBottom:4}}>
              {FASI_FUNNEL.map((f,i)=>(
                <div key={f} style={{display:"flex",alignItems:"center",flex:i<FASI_FUNNEL.length-1?1:"none",position:"relative"}}>
                  <div onClick={()=>{
                    const existing=p.storico?.find(s=>s.fase===f);
                    setStepDate(existing?.data||today());
                    setStepPopup(f);
                  }}
                    style={{width:38,height:38,borderRadius:"50%",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",background:i<=ci?FASE_CLR[f]:"var(--bg4)",border:"2px solid "+(i===ci?FASE_CLR[f]:i<ci?FASE_CLR[f]+"66":"var(--border2)"),color:i<=ci?"#fff":"var(--muted)",fontSize:7.5,fontWeight:900,boxShadow:i===ci?"0 0 18px "+FASE_CLR[f]+"66":"none",transition:"all .3s",cursor:"pointer"}}>{FASE_LABEL[f]}</div>
                  {i<FASI_FUNNEL.length-1&&<div style={{flex:1,height:3,background:i<ci?FASE_CLR[FASI_FUNNEL[i+1]]+"66":"var(--bg4)",margin:"0 3px",minWidth:4,borderRadius:99}}/>}
                </div>
              ))}
            </div>
          )}
          {stepPopup&&(
            <div onClick={()=>setStepPopup(null)} style={{position:"fixed",inset:0,zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <div onClick={e=>e.stopPropagation()} style={{background:"var(--bg2)",border:"1px solid var(--border2)",borderRadius:14,padding:"1.2rem 1.4rem",minWidth:260,boxShadow:"0 10px 40px #00000080"}}>
                <div style={{fontWeight:800,fontSize:14,color:"var(--text)",marginBottom:12}}>
                  <span style={{color:FASE_CLR[stepPopup]}}>{FASE_LABEL[stepPopup]}</span> — quando?
                </div>
                <input type="date" value={stepDate} onChange={e=>setStepDate(e.target.value)} style={{marginBottom:12}} />
                <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                  <button onClick={()=>setStepPopup(null)} style={{padding:"7px 14px",background:"var(--bg4)",color:"var(--muted)",border:"1px solid var(--border2)",borderRadius:8,cursor:"pointer",fontWeight:600,fontSize:12}}>Annulla</button>
                  {p.storico?.some(s=>s.fase===stepPopup)&&(
                    <button onClick={()=>{onDeleteStorico(stepPopup);setStepPopup(null);}} style={{padding:"7px 14px",background:"#ef444415",color:"#dc2626",border:"1px solid #ef444430",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:12}}>Rimuovi</button>
                  )}
                  <button onClick={()=>{
                    if(!stepDate)return;
                    if(p.storico?.some(s=>s.fase===stepPopup)){
                      onUpdateStoricoData(stepPopup,stepDate);
                    } else {
                      // Aggiungi la fase allo storico e aggiorna la fase se necessaria
                      const FASI_ORDER=["INVITO","CONOSCITIVA","FUP1","FUP2","PACK","CLOSING","SUB"];
                      const currentIdx=FASI_ORDER.indexOf(p.fase);
                      const newIdx=FASI_ORDER.indexOf(stepPopup);
                      const newFase=newIdx>currentIdx?stepPopup:p.fase;
                      const newStorico=[...(p.storico||[]).filter(s=>s.fase!==stepPopup),{fase:stepPopup,data:stepDate}];
                      onUpdateStoricoData(stepPopup,stepDate,newFase,newStorico);
                    }
                    setStepPopup(null);
                  }} style={{padding:"7px 14px",background:"linear-gradient(135deg,var(--a1),var(--a2))",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontWeight:800,fontSize:12}}>Salva</button>
                </div>
              </div>
            </div>
          )}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:9}}>
            {[{l:"Fase ora",v:FASE_LABEL[p.fase],color:clr},{l:"Ciclo conoscenza",v:ciclo?"Ciclo "+ciclo:"\u2014",color:ciclo===CICLO_CORRENTE?"var(--a1)":undefined},{l:"Conosciuto il",v:fmt(p.conosciutoAt)},{l:"Follow-up",v:p.followUp?(od?"Scaduto \u00b7 ":dt?"Oggi \u00b7 ":"")+fmt(p.followUp):"Non impostato",color:od?"#f87171":dt?"#fbbf24":undefined}].map(({l,v,color:col})=>(<div key={l} style={box}><div style={lbl}>{l}</div><div style={{color:col||"var(--text)",fontWeight:700,fontSize:13}}>{v}</div></div>))}
            {p.telefono&&(
              <div style={box}>
                <div style={lbl}> Telefono</div>
                <a href={"tel:"+p.telefono} style={{color:"var(--a2)",fontWeight:700,fontSize:13,textDecoration:"none"}}>{p.telefono}</a>
              </div>
            )}
            {p.instagram&&(
              <div style={box}>
                <div style={lbl}> Instagram</div>
                <a href={"https://instagram.com/"+p.instagram.replace("@","")} target="_blank" rel="noreferrer" style={{color:"#c084fc",fontWeight:700,fontSize:13,textDecoration:"none"}}>{p.instagram.startsWith("@")?p.instagram:"@"+p.instagram}</a>
              </div>
            )}
            {p.fase==="SUB"&&(
              <div style={{...box,gridColumn:"1/-1",background:"#10b98112",border:"1px solid #10b98130"}}>
                <div style={lbl}>Pacchetto</div>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <span style={{color:"#10b981",fontWeight:800,fontSize:13}}>{p.pacchetto?PACCHETTI.find(x=>x.key===p.pacchetto)?.label||"\u2014":"Non impostato"}</span>
                  {p.pacchetto&&<span style={{fontWeight:900,fontSize:16,color:"#10b981"}}> {bvOfPacchetto(p.pacchetto,p.bvCustom)} BV</span>}
                </div>
              </div>
            )}
            <div style={{...box,gridColumn:"1/-1",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
              <div style={lbl}>Chat aperta</div>
              <input type="checkbox" checked={!!p.chatAperta} onChange={e=>onSetChatAperta&&onSetChatAperta(e.target.checked)} style={{width:18,height:18,cursor:"pointer"}} />
            </div>
            {eventi&&eventi.length>0&&(
              <div style={{...box,gridColumn:"1/-1",background:p.ticketEventoId?"#f59e0b12":"var(--bg3)",border:p.ticketEventoId?"1px solid #f59e0b30":"1px solid var(--border2)"}}>
                <div style={lbl}> Ticket evento</div>
                <select value={p.ticketEventoId||""} onChange={e=>onSetTicketEvento(e.target.value||null)} style={{marginTop:6,fontSize:12,padding:"7px 10px"}}>
                  <option value="">Nessun ticket</option>
                  {eventi.map(ev=><option key={ev.id} value={ev.id}>{ev.nome}</option>)}
                </select>
              </div>
            )}
          </div>
          {storico.length>0&&(<div style={{...box,marginBottom:9}}><div style={lbl}> Storico percorso</div><div style={{display:"flex",flexDirection:"column",gap:6,marginTop:8}}>{storico.map((s,i)=>(<div key={i} style={{display:"flex",alignItems:"center",gap:9}}><span style={{width:8,height:8,borderRadius:99,background:FASE_CLR[s.fase],flexShrink:0,boxShadow:"0 0 6px "+FASE_CLR[s.fase]+"70"}}/><span style={{fontSize:12.5,fontWeight:700,color:"var(--text)",minWidth:64}}>{FASE_LABEL[s.fase]}</span><input type="date" defaultValue={s.data} onBlur={e=>{if(e.target.value&&e.target.value!==s.data)onUpdateStoricoData(s.fase,e.target.value);}} style={{fontSize:11,padding:"2px 6px",width:"auto",minWidth:0,background:"var(--bg3)",border:"1px solid var(--border2)",borderRadius:6,color:"var(--muted)",cursor:"pointer"}}/><span style={{fontSize:10,color:"var(--muted)",marginLeft:"auto"}}>Ciclo {cicloOfDate(s.data)||"\u2014"}</span>{storico.length>1&&<button onClick={()=>onDeleteStorico(s.fase)} style={{background:"#ef444415",border:"1px solid #ef444430",borderRadius:6,color:"#dc2626",cursor:"pointer",fontSize:11,fontWeight:800,padding:"2px 7px",marginLeft:4,lineHeight:1}}>x</button>}</div>))}</div></div>)}
          {p.note&&<div style={{...box,marginBottom:9}}><div style={lbl}> Note</div><p style={{color:"var(--text)",lineHeight:1.6,fontSize:13,marginTop:4}}>{p.note}</p></div>}
          {p.fase==="SUB"&&(
            <div style={{...box,marginBottom:9}}>
              <div style={lbl}>Checklist</div>
              <div style={{display:"flex",gap:10,marginTop:8}}>
                {[{key:"kyc",label:"KYC"},{key:"pandadoc",label:"PANDA DOC"},{key:"click",label:"CLICK"}].map(({key,label})=>{
                  const done=p.checklist?.[key]||false;
                  return(
                    <button key={key} onClick={()=>onUpdateChecklist({...p.checklist,[key]:!done})}
                      style={{display:"flex",alignItems:"center",gap:7,padding:"8px 14px",background:done?"#10b98118":"var(--bg3)",border:"1.5px solid "+(done?"#10b981":"var(--border2)"),borderRadius:9,cursor:"pointer",color:done?"#10b981":"var(--muted)",fontWeight:700,fontSize:12,transition:"all .2s"}}>
                      <div style={{width:16,height:16,borderRadius:4,border:"1.5px solid "+(done?"#10b981":"var(--muted)"),background:done?"#10b981":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        {done&&<span style={{color:"#fff",fontSize:10,fontWeight:900,lineHeight:1}}>{"\u2713"}</span>}
                      </div>
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div style={{display:"flex",gap:9,marginTop:16,flexWrap:"wrap"}}>
            {!isSpeciale&&ci<FASI_FUNNEL.length-1&&<button onClick={onAdvance} style={{padding:"9px 16px",background:"linear-gradient(135deg,"+FASE_CLR[FASI_FUNNEL[ci+1]]+","+FASE_CLR[FASI_FUNNEL[ci+1]]+"bb)",color:"#fff",border:"none",borderRadius:9,cursor:"pointer",fontWeight:800,fontSize:12}}>Avanza → {FASE_LABEL[FASI_FUNNEL[ci+1]]}</button>}
            {isSpeciale&&<button onClick={onRiattiva} style={{padding:"9px 16px",background:"linear-gradient(135deg,var(--a1),var(--a2))",color:"#fff",border:"none",borderRadius:9,cursor:"pointer",fontWeight:800,fontSize:12}}>↩ Riattiva nel Funnel</button>}
            <button onClick={onEdit} style={{padding:"9px 16px",background:"var(--bg4)",color:"var(--muted)",border:"1px solid var(--border2)",borderRadius:9,cursor:"pointer",fontWeight:600,fontSize:12}}> Modifica</button>
          </div>
          {!isSpeciale&&(<div style={{borderTop:"1px solid var(--bg4)",marginTop:13,paddingTop:13,display:"flex",gap:9,flexWrap:"wrap"}}><div style={{fontSize:10,color:"var(--muted)",width:"100%",fontWeight:700,textTransform:"uppercase",letterSpacing:.8,marginBottom:2}}>Stato speciale</div>{p.fase!=="FOLLOW_UP"&&<button onClick={onFollowUp} style={{padding:"8px 13px",background:"#f59e0b16",color:"#d97706",border:"1px solid #f59e0b38",borderRadius:9,cursor:"pointer",fontWeight:700,fontSize:12}}> Follow Up caldo</button>}{p.fase!=="NON_INT"&&<button onClick={onNonInt} style={{padding:"8px 13px",background:"#ef444414",color:"#dc2626",border:"1px solid #ef444436",borderRadius:9,cursor:"pointer",fontWeight:700,fontSize:12}}> Non interessato</button>}{p.fase!=="NON_PIACE"&&<button onClick={onNonPiace} style={{padding:"8px 13px",background:"#ec489918",color:"#f472b6",border:"1px solid #ec489938",borderRadius:9,cursor:"pointer",fontWeight:700,fontSize:12}}> Non mi piace</button>}</div>)}
        </>
      )}

    </div>
  );
}