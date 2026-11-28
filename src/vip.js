// VIP dell'evento Global Mission: vengono colorati d'oro nel CRM.
// Il riconoscimento è "morbido" (ignora maiuscole, accenti, piccoli refusi e ordine di nome/cognome).
// Per aggiungere o togliere un VIP basta modificare questa lista.
export const VIP_GM = [
  "Diego Milani", "Barbora Smeringova", "Luca Gerardi", "Alice Ravaziol", "Nicola Salvato", "Wando Lanfredi",
  "Bea Risso", "Massimo Sabatino", "Kirolos Nakhnoukh", "Kjiara Stefa", "Claudio Livoti",
  "Francesco Sampirisi", "Gilda Guadagno", "Carlotta Ballistreri", "Matteo Belotti", "Andrea Uboldi",
  "Raffaella Ardito", "Sebastiano Pisana", "Mário Chromjak", "Riccardo Carfagna",
];
export const VIP_GOLD = "#d4a017";
export const VIP_BG = "linear-gradient(135deg,#f5c84225,#d4a01712)";

const norm = s => String(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z\s]/g," ").replace(/\s+/g," ").trim();
const toks = s => norm(s).split(" ").filter(Boolean);
function lev(a,b){ const d=Array.from({length:a.length+1},(_,i)=>[i]); for(let j=1;j<=b.length;j++) d[0][j]=j;
  for(let i=1;i<=a.length;i++) for(let j=1;j<=b.length;j++) d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1)); return d[a.length][b.length]; }
function tokOk(a,b){
  if (a===b) return true;
  const m = Math.min(a.length,b.length);
  if (m>=5 && (a.includes(b)||b.includes(a))) return true;
  if (m>=3 && (a.startsWith(b)||b.startsWith(a))) return true;  // es. Bea / Beatrice
  return lev(a,b) <= (m>=7 ? 2 : m>=4 ? 1 : 0);
}
const VIP_TOK = VIP_GM.map(toks);
function matchIdx(nome, cognome) {
  const M = [...toks(nome), ...toks(cognome)];
  if (!M.length) return -1;
  const need = Math.min(2, M.length);
  let best = -1, bestN = 0;
  VIP_TOK.forEach((V,i)=>{
    const n = M.filter(t => V.some(v => tokOk(t,v))).length;
    if (n>=need && n>bestN) { best=i; bestN=n; }
  });
  return best;
}
export const isVip = m => !!m && matchIdx(m.nome, m.cognome) >= 0;
// quali VIP della lista non sono stati trovati fra le persone date
export function vipMancanti(persone) {
  const trovati = new Set((persone||[]).map(p=>matchIdx(p.nome,p.cognome)).filter(i=>i>=0));
  return VIP_GM.filter((_,i)=>!trovati.has(i));
}
export const vipTrovati = persone => VIP_GM.length - vipMancanti(persone).length;
