// Traduzione IT → EN del sito, senza servizi esterni.
// Sostituisce i testi dell'interfaccia usando il dizionario in i18nDict.js.
import { DICT } from "./i18nDict";

let lang = "it";
const originale = new WeakMap();   // nodo → testo italiano originale
const scritto = new WeakMap();     // nodo → ultimo testo inglese che abbiamo scritto
const ATTRS = ["placeholder", "title", "aria-label", "alt"];

const MESI = { gennaio:"January", febbraio:"February", marzo:"March", aprile:"April", maggio:"May", giugno:"June", luglio:"July", agosto:"August", settembre:"September", ottobre:"October", novembre:"November", dicembre:"December" };
const GIORNI = { lunedì:"Monday", martedì:"Tuesday", mercoledì:"Wednesday", giovedì:"Thursday", venerdì:"Friday", sabato:"Saturday", domenica:"Sunday" };
const MESI_BREVI = { gen:"Jan", feb:"Feb", mar:"Mar", apr:"Apr", mag:"May", giu:"Jun", lug:"Jul", ago:"Aug", set:"Sep", ott:"Oct", nov:"Nov", dic:"Dec" };

function pattern(s) {
  // date lunghe: "sabato 5 dicembre alle ore 06:00"
  const w = s.split(/(\s+)/).map(p => {
    const l = p.toLowerCase();
    if (GIORNI[l]) return GIORNI[l];
    if (MESI[l]) return MESI[l];
    if (MESI_BREVI[l] && /^\d/.test(s)) return MESI_BREVI[l];
    return p;
  }).join("");
  if (w !== s) return w.replace(/\balle ore\b/, "at");
  let m;
  if ((m = s.match(/^in mano a (.+)$/))) return "held by " + m[1];
  if ((m = s.match(/^🟡 Passato a te da (.+)$/))) return "🟡 Passed on to you by " + m[1];
  if ((m = s.match(/^(\d+) (persona|persone)$/))) return m[1] + (m[1]==="1" ? " person" : " people");
  if ((m = s.match(/^Livello (\d) · (\d+)%$/))) return "Level " + m[1] + " · " + m[2] + "%";
  if ((m = s.match(/^⚠️ Sembra livello (\d), ma deve essere pagato livello (\d)$/))) return "⚠️ Looks like level " + m[1] + ", but must be paid level " + m[2];
  if ((m = s.match(/^⚠️ Controlla su XConnectly: (\d+) persone? dovrebbe(?:ro)? essere pagate? a un livello diverso da quello che sembra\.$/))) return "⚠️ Check on XConnectly: " + m[1] + (m[1]==="1" ? " person" : " people") + " should be paid at a different level than it looks.";
  if ((m = s.match(/^iscritto da (.+)$/))) return "enrolled by " + m[1];
  if ((m = s.match(/^(⚠️ )?Nominale L(\d): deve essere pagato L(\d)$/))) return (m[1]||"") + "Nominal L" + m[2] + ": must be paid L" + m[3];
  if ((m = s.match(/^depositanti? ha(nno)? un livello atteso diverso da quello nominale: controlla su XConnectly che ti paghino al livello giusto\.$/))) return (m[1] ? "depositors have" : "depositor has") + " an expected level different from the nominal one: check on XConnectly that you are paid at the right level.";
  if ((m = s.match(/^(\d+) giorni?$/))) return m[1] + (m[1] === "1" ? " day" : " days");
  if ((m = s.match(/^Giorno (\d+) di (\d+)$/))) return "Day " + m[1] + " of " + m[2];
  if ((m = s.match(/^Ciclo (\d+)(.*)$/))) { const r = (m[2] || "").trim(); return "Cycle " + m[1] + (r ? " " + (DICT[r] ?? r) : ""); }
  if ((m = s.match(/^(\d+) totali nel ciclo$/))) return m[1] + " total in the cycle";
  if ((m = s.match(/^(\d+) di (\d+) visualizzati$/))) return m[1] + " of " + m[2] + " shown";
  if ((m = s.match(/^(\d+) di (\d+) step completati · (\d+)%$/))) return m[1] + " of " + m[2] + " steps completed · " + m[3] + "%";
  const num = x => x.replace(",", ".");
  if ((m = s.match(/^Spendi più di quanto entra: ogni mese sei in negativo di (.+)\. Prima di pensare a investire, il primo passo è tornare in positivo\.$/))) return "You spend more than you earn: every month you are in the red by " + m[1] + ". Before thinking about investing, the first step is getting back into the black.";
  if ((m = s.match(/^Ti resta meno del 10% delle entrate \((.+) al mese\)\. Margine molto stretto: ogni imprevisto ti mette in difficoltà\.$/))) return "You keep less than 10% of your income (" + m[1] + " per month). Very tight margin: any unexpected expense puts you in difficulty.";
  if ((m = s.match(/^Il tuo fondo di emergenza copre (.+) mesi, te ne servirebbero (\d+)\. Mancano (.+): è la prima cosa da costruire\.$/))) return "Your emergency fund covers " + num(m[1]) + " months, you would need " + m[2] + ". You are missing " + m[3] + ": it's the first thing to build.";
  if ((m = s.match(/^Il tuo fondo di emergenza è completo: copre almeno (\d+) mesi di spese\.$/))) return "Your emergency fund is complete: it covers at least " + m[1] + " months of expenses.";
  if ((m = s.match(/^Le rate dei debiti pesano il (\d+)% delle entrate\. Sopra il 20% è un peso importante: valuta come ridurle\.$/))) return "Debt payments weigh " + m[1] + "% of your income. Above 20% is a heavy burden: consider how to reduce them.";
  if ((m = s.match(/^Abbonamenti e telefono valgono (.+) al mese: controlla se li usi davvero tutti\.$/))) return "Subscriptions and phone are worth " + m[1] + " per month: check whether you really use them all.";
  if ((m = s.match(/^(Prudente|Media|Ottimista) (\d+)% — tempo per arrivare$/))) return ({Prudente:"Cautious",Media:"Medium",Ottimista:"Optimistic"})[m[1]] + " " + m[2] + "% — time to reach it";
  if ((m = s.match(/^(Prudente|Media|Ottimista) (\d+)%$/))) return ({Prudente:"Cautious",Media:"Medium",Ottimista:"Optimistic"})[m[1]] + " " + m[2] + "%";
  if ((m = s.match(/^Prospect "(.*)" risulta già presente \(di (.*)\)\. Vuoi aggiungerlo comunque\?$/))) return 'Prospect "' + m[1] + '" is already in the system (belongs to ' + m[2] + "). Do you want to add it anyway?";
  if ((m = s.match(/^Cliente "(.*)" risulta già registrato \(di (.*)\)\. Vuoi aggiungerlo comunque\?$/))) return 'Client "' + m[1] + '" is already registered (belongs to ' + m[2] + "). Do you want to add it anyway?";
  if ((m = s.match(/^(.*) · di (.*)$/))) return m[1] + " · of " + m[2];
  if ((m = s.match(/^di (.+)$/))) return "of " + m[1];
  if (/\d/.test(s) && /\b(anni|anno|mesi|mese|giorni|giorno)\b|\/mese/.test(s)) {
    return s.replace(/(\d),(\d)/g, "$1.$2").replace(/\banni\b/g, "years").replace(/\banno\b/g, "year").replace(/\bmesi\b/g, "months").replace(/\bmese\b/g, "month").replace(/\bgiorni\b/g, "days").replace(/\bgiorno\b/g, "day");
  }
  return undefined;
}

export function tr(text) {
  const m = text.match(/^(\s*)([\s\S]*?)(\s*)$/);
  const core = m[2];
  if (!core) return text;
  let r = DICT[core];
  if (r === undefined) r = pattern(core);
  return r === undefined ? text : m[1] + r + m[3];
}

function saltaNodo(n) {
  const p = n.parentElement;
  if (!p) return true;
  const t = p.tagName;
  return t === "SCRIPT" || t === "STYLE" || t === "TEXTAREA" || !!p.closest("[data-no-i18n]");
}

function testo(n) {
  if (saltaNodo(n)) return;
  const v = n.nodeValue;
  if (scritto.get(n) === v) return;               // l'abbiamo scritto noi
  const nuovo = tr(v);
  if (nuovo !== v) { originale.set(n, v); scritto.set(n, nuovo); n.nodeValue = nuovo; }
  else originale.delete(n);
}

function attributi(el) {
  for (const a of ATTRS) {
    if (!el.hasAttribute || !el.hasAttribute(a)) continue;
    const v = el.getAttribute(a), key = "data-it-" + a;
    if (el.getAttribute("data-en-" + a) === v) continue;
    const nuovo = tr(v);
    if (nuovo !== v) { el.setAttribute(key, v); el.setAttribute("data-en-" + a, nuovo); el.setAttribute(a, nuovo); }
  }
}

function traduci(root) {
  if (root.nodeType === 3) { testo(root); return; }
  if (root.nodeType !== 1) return;
  attributi(root);
  root.querySelectorAll && root.querySelectorAll("[placeholder],[title],[aria-label],[alt]").forEach(attributi);
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n; while ((n = w.nextNode())) testo(n);
}

function ripristina() {
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n; while ((n = w.nextNode())) { if (originale.has(n)) { n.nodeValue = originale.get(n); originale.delete(n); scritto.delete(n); } }
  document.body.querySelectorAll("[data-en-placeholder],[data-en-title],[data-en-aria-label],[data-en-alt]").forEach(el => {
    for (const a of ATTRS) if (el.hasAttribute("data-en-" + a)) { el.setAttribute(a, el.getAttribute("data-it-" + a)); el.removeAttribute("data-en-" + a); el.removeAttribute("data-it-" + a); }
  });
}

let obs = null, avviato = false;
function avvia() {
  if (avviato) return; avviato = true;
  obs = new MutationObserver(muts => {
    if (lang !== "en") return;
    for (const m of muts) {
      if (m.type === "characterData") testo(m.target);
      else if (m.type === "attributes") attributi(m.target);
      else m.addedNodes.forEach(traduci);
    }
  });
  obs.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  // anche le finestre di conferma / avviso del browser
  const c = window.confirm.bind(window), a = window.alert.bind(window);
  window.confirm = (s) => c(lang === "en" ? tr(String(s)) : s);
  window.alert = (s) => a(lang === "en" ? tr(String(s)) : s);
}

export function setLang(l) {
  avvia();
  lang = l === "en" ? "en" : "it";
  document.documentElement.setAttribute("lang", lang);
  if (lang === "en") traduci(document.body); else ripristina();
}
export const getLang = () => lang;
