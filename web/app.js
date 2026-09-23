'use strict';
/* ================= Hilfsmittel ================= */
const $ = id => document.getElementById(id);
function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
function knopf(cls, text, onclick, label) { const b = el('button', cls, text); b.type = 'button'; if (onclick) b.onclick = onclick; if (label) b.setAttribute('aria-label', label); return b; }
function knopfTI(cls, text, icon, onclick) { const b = knopf(cls, null, onclick); b.append(el('span', null, text)); if (icon) b.insertAdjacentHTML('beforeend', icon); return b; }
const svgEl = (t, a = {}, p) => { const e = document.createElementNS('http://www.w3.org/2000/svg', t); for (const k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; };
const I = (d, w = 2.4) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + w + '" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>';
const ICON = {
  chev: I('<path d="M9 5l7 7-7 7"/>', 2.6),
  zurueck: I('<path d="M15 5l-7 7 7 7"/>', 2.6),
  zu: I('<path d="M6 6l12 12M18 6 6 18"/>'),
  runter: I('<path d="M6 9l6 6 6-6"/>', 2.6),
  plus: I('<path d="M12 5v14M5 12h14"/>', 2.8),
  haken: I('<path d="M5 12.5l4.5 4.5L19 7.5"/>', 2.6),
  suche: I('<circle cx="11" cy="11" r="7"/><path d="M20.5 20.5l-4.3-4.3"/>', 2.3),
  bank: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.8 2.8 7.4v1.9h18.4V7.4L12 2.8zM5 10.8v6.4h2.6v-6.4H5zm5.7 0v6.4h2.6v-6.4h-2.6zm5.7 0v6.4H19v-6.4h-2.6zM2.8 18.7v2.5h18.4v-2.5H2.8z"/></svg>',
  liste: I('<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>', 2.4),
  runterladen: I('<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>', 2.4),
  wiederholen: I('<path d="M20 11a8 8 0 0 0-14.3-4.9L4 8"/><path d="M4 4v4h4"/><path d="M4 13a8 8 0 0 0 14.3 4.9L20 16"/><path d="M20 20v-4h-4"/>', 2.3),
};
const GELD = new Intl.NumberFormat('de-DE', {style: 'currency', currency: 'EUR'});
const GELD0 = new Intl.NumberFormat('de-DE', {style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0});
const ZAHL0 = new Intl.NumberFormat('de-DE', {maximumFractionDigits: 0});
const ZAHL2 = new Intl.NumberFormat('de-DE', {minimumFractionDigits: 2, maximumFractionDigits: 2});
const ZAHL1 = new Intl.NumberFormat('de-DE', {minimumFractionDigits: 1, maximumFractionDigits: 1});
const STK4 = new Intl.NumberFormat('de-DE', {minimumFractionDigits: 4, maximumFractionDigits: 4});
const STK6 = new Intl.NumberFormat('de-DE', {minimumFractionDigits: 6, maximumFractionDigits: 6});
const geld = v => GELD.format(v || 0);
const geldKurz = v => Math.abs(v - Math.round(v)) < 0.005 ? GELD0.format(v) : GELD.format(v);
const richtung = v => { const r = Math.round((v || 0) * 100) / 100; return r > 0 ? 'up' : r < 0 ? 'down' : 'flat'; };
const dreieck = d => d === 'up' ? '▲' : d === 'down' ? '▼' : '';
const vz = v => { const d = richtung(v); return (d === 'up' ? '+' : d === 'down' ? '−' : '') + geld(Math.abs(v)); };
const vzp = v => { const d = richtung(v); return (d === 'up' ? '+' : d === 'down' ? '−' : '') + ZAHL2.format(Math.abs(v)) + ' %'; };
const vz0 = v => (v > 0.5 ? '+' : v < -0.5 ? '−' : '') + ZAHL0.format(Math.abs(v)) + ' €';
const hol = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const setz = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
const zeitText = t => new Date(t).toLocaleString('de-DE', {day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'}) + ' Uhr';
const datum = d => (d instanceof Date ? d : new Date(d + 'T12:00:00')).toLocaleDateString('de-DE', {day: '2-digit', month: '2-digit', year: 'numeric'});
function ersetzeWennNeu(box, sig, bauen) { if (box.dataset.sig === sig) return; box.dataset.sig = sig; box.textContent = ''; bauen(box); }
function reihe(karte, links, rechts, klasse) {
  const z = el('div', 'zeile'); z.append(el('div', 'k', links), el('div', 'w ' + (klasse || ''), rechts)); karte.append(z); return z;
}
function logo(symbol, groesse) {
  const s = symbol || '?';
  const e = el('div', 'logo' + (groesse ? ' ' + groesse : ''), s.slice(0, 2));
  let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 360;
  e.style.background = 'hsl(' + h + ' 28% 16%)'; e.style.color = 'hsl(' + h + ' 70% 78%)';
  e.setAttribute('aria-hidden', 'true');
  return e;
}
function toast(text, fehler) {
  const t = $('toast'); t.textContent = text; t.className = 'toast zeigen' + (fehler ? ' fehler' : '');
  clearTimeout(toast.timer); toast.timer = setTimeout(() => { t.className = 'toast'; }, 2800);
}
async function post(pfad, koerper) {
  try {
    const a = await fetch(pfad, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(koerper)});
    return await a.json();
  } catch (e) { return {ok: false, text: 'Keine Verbindung zum Depot-Programm. Läuft es noch?'}; }
}
const breitMQ = matchMedia('(min-width: 1280px)');
const istBreit = () => breitMQ.matches;

/* ================= Zustand ================= */
let stand = null;
let seite = 'portfolio';
let letzteTab = ['cash', 'analytics'].includes(hol('pd-tab')) ? hol('pd-tab') : 'portfolio';
let gewaehlt = null;
const RAEUME = [['1T', '1T'], ['1W', '1W'], ['1M', '1M'], ['1J', '1J'], ['MAX', 'Max']];
let raumPf = hol('pd-raum'), raumWp = hol('pd-raum-wp');
if (!RAEUME.some(r => r[0] === raumPf)) raumPf = 'MAX';
if (!RAEUME.some(r => r[0] === raumWp)) raumWp = '1T';
let modus = hol('pd-modus') === 'geld' ? 'geld' : 'pct';
let sortPf = {k: 'wert', ab: true};
let filterUms = 'alle';
let verlaufPf = [], verlaufWp = [], verlaufWpSym = null, verlaufAn = [], verlaufZeit = 0, verlaufNr = 0;
let sparks = {}, sparkZeit = 0;
let hervorheben = null;
const chartSig = {pf: '', wp: '', an: ''};
const FARBEN = ['#f2a24e', '#ffffff', '#64a8ff', '#30d158', '#b48cff', '#ff7b93', '#5ee0d4', '#ffd166'];

const papierVon = s => ((stand && stand.universum) || []).find(p => p.symbol === s) || {symbol: s, name: s || '–', isin: ''};
const zeileVon = s => ((stand && stand.zeilen) || []).find(p => p.symbol === s) || null;
const quote = s => ((stand && stand.quotes) || {})[s] || {};
const kaufKurs = s => { const q = quote(s); return q.ask || q.last || null; };
const verkaufKurs = s => { const q = quote(s); return q.bid || q.last || null; };
const planVon = s => ((stand && stand.sparplaene) || []).find(p => p.symbol === s) || null;
const bereit = () => !!(stand && stand.zeit);

/* ================= Betragsfeld =================
   Eingabe nur mit Ziffern über die normale Tastatur (Zahlenreihe oder Ziffernblock).
   Die letzten zwei Ziffern sind Cent: 1 → 0,01 €, 200000 → 2.000,00 €.
   Intern wird nur mit ganzen Cent gerechnet, formatiert wird nur für die Anzeige. */
let bfNr = 0;
const MAX_ZIFFERN = 10;                                   // bis 99.999.999,99 €
function ausText(t) {                                      // Einfügen: "2.000,00" oder "2000" als Eurobetrag
  t = String(t).trim().replace(/[^\d.,]/g, '');
  const m = /^(.*?)[.,](\d{1,2})$/.exec(t);
  const euro = (m ? m[1] : t).replace(/\D/g, '') || '0';
  const cent = m ? m[2].padEnd(2, '0') : '00';
  return euro + cent;
}
function Betragsfeld(opt) {
  const wrap = el('div', 'bf');
  const anzeige = el('div', 'bf-anzeige'); anzeige.id = 'bfAnzeige' + (++bfNr);
  const zahl = el('span', 'bf-zahl'), caret = el('span', 'bf-caret'), eur = el('span', 'bf-eur', '€');
  anzeige.append(zahl, caret, eur);
  const input = el('input', 'bf-input');
  input.type = 'text'; input.inputMode = 'numeric'; input.autocomplete = 'off'; input.spellcheck = false;
  input.setAttribute('autocorrect', 'off'); input.setAttribute('enterkeyhint', 'next');
  input.setAttribute('aria-label', opt.label || 'Betrag in Euro');
  input.setAttribute('aria-describedby', anzeige.id);
  wrap.append(anzeige, input);
  let ziffern = '';
  const cent = () => (ziffern ? parseInt(ziffern, 10) : 0);
  const ansEnde = () => { const n = input.value.length; if (input.selectionStart !== n || input.selectionEnd !== n) { try { input.setSelectionRange(n, n); } catch (e) {} } };
  function passen() {                                     // nie breiter als der Platz: Schrift schrittweise verkleinern
    anzeige.style.fontSize = '';
    const platz = wrap.clientWidth; if (!platz) return;
    let gr = parseFloat(getComputedStyle(anzeige).fontSize), n = 0;
    while (anzeige.offsetWidth > platz - 6 && gr > 22 && n++ < 24) { gr -= 3; anzeige.style.fontSize = gr + 'px'; }
  }
  function ansicht() {
    zahl.textContent = ZAHL2.format(cent() / 100);
    const n = zahl.textContent.length;
    wrap.dataset.g = n <= 8 ? 's' : n <= 10 ? 'm' : 'l';
    wrap.classList.toggle('leer', cent() === 0);
    passen();
  }
  new ResizeObserver(() => passen()).observe(wrap);
  function wackeln() { wrap.classList.remove('wackeln'); void wrap.offsetWidth; wrap.classList.add('wackeln'); }
  function neu(roh, still) {
    let d = String(roh).replace(/\D/g, '').replace(/^0+/, '');
    const zuLang = d.length > MAX_ZIFFERN;
    if (zuLang) d = d.slice(0, MAX_ZIFFERN);
    const alt = ziffern; ziffern = d;
    if (input.value !== d) input.value = d;
    ansicht();
    if (zuLang) wackeln();
    if (!still && alt !== d && opt.onChange) opt.onChange(cent());
  }
  input.addEventListener('input', e => { if (e.isComposing) return; neu(input.value); ansEnde(); });
  input.addEventListener('compositionend', () => { neu(input.value); ansEnde(); });
  input.addEventListener('paste', e => {
    const t = (e.clipboardData && e.clipboardData.getData('text')) || '';
    e.preventDefault(); neu(ausText(t)); ansEnde();
  });
  ['focus', 'click', 'mouseup', 'select'].forEach(n => input.addEventListener(n, () => requestAnimationFrame(ansEnde)));
  input.addEventListener('keydown', e => {
    if (e.isComposing) return;
    const k = e.key;
    if (k === 'Enter') { e.preventDefault(); if (!e.repeat && opt.onEnter) opt.onEnter(); return; }
    if (k === 'Delete') { e.preventDefault(); neu(''); return; }
    // Ziffernblock bei ausgeschaltetem NumLock: e.code ist NumpadX, e.key eine Pfeiltaste o. Ä.
    const np = /^Numpad([0-9])$/.exec(e.code || '');
    if (np && !/^[0-9]$/.test(k)) { e.preventDefault(); neu(ziffern + np[1]); ansEnde(); return; }
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(k)) { e.preventDefault(); return; }
    if (k.length === 1 && !/[0-9]/.test(k) && !e.ctrlKey && !e.metaKey) e.preventDefault();   // , . € + - usw. werden ignoriert
  });
  neu(opt.cent > 0 ? String(Math.round(opt.cent)) : '', true);
  return {
    el: wrap, input, cent, wackeln,
    setzen(c, still) { neu(c > 0 ? String(Math.round(c)) : '', still); },
    fokus() { input.focus({preventScroll: true}); ansEnde(); },
    fehler(an) { wrap.classList.toggle('fehler', !!an); },
    taste(e) {                                              // Tastendruck, während das Feld nicht fokussiert ist
      if (/^[0-9]$/.test(e.key)) { neu(ziffern + e.key); return true; }
      const np = /^Numpad([0-9])$/.exec(e.code || ''); if (np) { neu(ziffern + np[1]); return true; }
      if (e.key === 'Backspace') { neu(ziffern.slice(0, -1)); return true; }
      if (e.key === 'Delete') { neu(''); return true; }
      return false;
    },
  };
}
function ziffer(e) {
  if (/^[0-9]$/.test(e.key)) return +e.key;
  const np = /^Numpad([0-9])$/.exec(e.code || ''); return np ? +np[1] : null;
}

/* ================= Stapel: Dialog (Sheet) und Order-Maske (Ticket) =================
   Beide zeigen dieselben Bildschirme; ein Bildschirm ist (body, nav) => {update, fokus, feld, enter}. */
class Stapel {
  constructor(art) { this.art = art; this.stapel = []; this.aktiv = null; this.offen = false; this.vorherFokus = null; this.ausstehend = false; this.richtung = 'kaufen'; }
  get modal() { return this.art === 'sheet'; }
  oeffnen(f, fokus = true) { this.stapel = [f]; this.zeigen(fokus); }
  weiter(f) { this.stapel.push(f); this.zeigen(true); }
  zurueck() { if (this.stapel.length > 1) { this.stapel.pop(); this.zeigen(true); } else this.zu(); }
  tiefe() { return this.stapel.length; }
  fokus() {
    const a = this.aktiv; if (!a) return;
    if (a.feld && a.fokus === a.feld.input) { if (a.feld.input.getClientRects().length) a.feld.fokus(); return; }
    if (a.fokus && a.fokus.isConnected && a.fokus.getClientRects().length) a.fokus.focus({preventScroll: true});
  }
  zeigen(fokus) {
    if (!this.stapel.length) return;
    if (!bereit()) { this.ausstehend = true; return; }
    this.ausstehend = false;
    const box = this.modal ? $('sheet') : $('ticketBox');
    if (this.modal && !this.offen) {
      this.vorherFokus = document.activeElement;
      const ov = $('overlay'); ov.hidden = false; void ov.offsetWidth; ov.classList.add('offen');
      document.body.classList.add('gesperrt');
    }
    this.offen = true;
    box.textContent = '';
    const tief = this.stapel.length > 1;
    let zuKnopf = null;
    if (this.modal || tief) {
      const kopf = el('div', 's-kopf');
      const zur = knopf('s-icon', null, () => this.zurueck(), 'Zurück'); zur.innerHTML = ICON.zurueck;
      if (!tief) zur.style.visibility = 'hidden';
      kopf.append(zur);
      if (this.modal) { zuKnopf = knopf('s-icon', null, () => this.zu(), 'Schließen'); zuKnopf.innerHTML = ICON.zu; kopf.append(zuKnopf); box.append(el('div', 'griff')); }
      box.append(kopf);
    }
    const body = el('div', 's-body s-rein'); box.append(body);
    this.aktiv = this.stapel[this.stapel.length - 1](body, this) || {};
    this.aktiv.seit = performance.now();
    if (this.modal) {
      box.classList.toggle('hoch', !!this.aktiv.hoch);
      const h = body.querySelector('h1'); if (h) h.id = 'sheetTitel';
      box.scrollTop = 0;
      if (!this.aktiv.fokus) this.aktiv.fokus = zuKnopf;
    }
    if (fokus) setTimeout(() => { if (this.offen) this.fokus(); }, 40);
  }
  zu() {
    if (!this.modal) { ticketNeu(this.richtung, true); return; }
    if (!this.offen) return;
    const ov = $('overlay');
    ov.classList.remove('offen'); this.offen = false; this.aktiv = null; this.stapel = [];
    document.body.classList.remove('gesperrt');
    setTimeout(() => { if (!this.offen) { ov.hidden = true; $('sheet').textContent = ''; } }, 280);
    const v = this.vorherFokus;
    if (seite === 'wert' && ticketSichtbar()) Ticket.fokus();
    else if (v && v.isConnected && v.focus && v !== document.body) v.focus({preventScroll: true});
  }
}
const Sheet = new Stapel('sheet');
const Ticket = new Stapel('ticket');
const ticketSichtbar = () => seite === 'wert' && istBreit() && !!$('ticketBox').getClientRects().length;
function ticketNeu(richtung, fokus) {
  if (!gewaehlt) return;
  Ticket.richtung = richtung;
  Ticket.oeffnen(screenOrder({richtung, symbol: gewaehlt, cent: 0, alles: false, ticket: true}), fokus && istBreit());
}

function fuss(...kinder) { const f = el('div', 's-fuss'); f.append(...kinder); return f; }
function kopfPapier(symbol) { const k = el('div', 's-papier'); k.append(logo(symbol, 'klein'), el('span', null, papierVon(symbol).name)); return k; }
function option(icon, text, onclick, klein) {
  const b = knopf('option' + (klein ? ' klein' : ''), null, onclick);
  const i = el('span', 'o-icon'); i.innerHTML = icon; b.append(i, el('span', null, text)); return b;
}

/* ---------- Ein- und Auszahlen ---------- */
function screenUeberweisen() {
  return (body, nav) => {
    const ein = option(ICON.plus, 'Geld einzahlen', () => nav.weiter(screenGeld({art: 'einzahlung'})));
    const aus = option(ICON.bank, 'Geld auszahlen', () => nav.weiter(screenGeld({art: 'auszahlung'})));
    body.append(el('h1', 's-titel', 'Überweisung'), el('div', 's-unter', geld(stand.cash) + ' verfügbar'));
    const box = el('div'); box.style.marginTop = '18px'; box.append(ein, aus); body.append(box);
    body.append(el('p', 's-tipp', 'Paperdepot: Ein- und Auszahlungen werden nur simuliert. Es wird kein echtes Geld bewegt.'));
    return {fokus: ein};
  };
}
function screenGeld(o) {
  return (body, nav) => {
    const ein = o.art === 'einzahlung';
    const unter = el('div', 's-unter');
    const feld = Betragsfeld({label: (ein ? 'Einzahlungsbetrag' : 'Auszahlungsbetrag') + ' in Euro', onChange: () => pruefe(), onEnter: () => los()});
    const meldung = el('div', 'meldung'); meldung.setAttribute('aria-live', 'polite');
    const los_ = knopfTI('knopf hell', ein ? 'Einzahlen' : 'Auszahlen', ICON.chev, () => los());
    body.append(el('h1', 's-titel', ein ? 'Geld einzahlen' : 'Geld auszahlen'), unter, feld.el,
      el('div', 'bf-unter', ein ? 'ins Paperdepot' : 'vom Verrechnungskonto'), meldung,
      fuss(el('span', 's-fuss-info', ein ? 'Spielgeld' : 'Simulierte Auszahlung'), los_));
    function pruefe() {
      unter.textContent = geld(stand.cash) + ' verfügbar';
      const c = feld.cent();
      const fehler = !ein && c > Math.round(stand.cash * 100) ? 'Nicht genug Cash: ' + geld(stand.cash) + ' verfügbar.' : '';
      meldung.textContent = fehler; meldung.className = 'meldung' + (fehler ? ' fehler' : '');
      feld.fehler(!!fehler); los_.disabled = !!fehler || c === 0;
      return fehler || (c === 0 ? 'Bitte gib einen Betrag ein.' : '');
    }
    async function los() {
      const f = pruefe();
      if (f) { feld.wackeln(); meldung.textContent = f; meldung.className = 'meldung fehler'; return; }
      if (los_.classList.contains('laedt')) return;
      los_.classList.add('laedt');
      const c = feld.cent();
      const a = await post('/geld', {cent: ein ? c : -c});
      los_.classList.remove('laedt');
      if (!a.ok) { meldung.textContent = a.text || 'Das hat nicht geklappt.'; meldung.className = 'meldung fehler'; return; }
      hervorheben = a.buchung && a.buchung.zeit; setTimeout(() => { hervorheben = null; male(); }, 5000);
      nav.zu();
      toast(GELD.format(c / 100) + (ein ? ' eingezahlt' : ' ausgezahlt'));
      await tick();
    }
    pruefe();
    return {update: pruefe, feld, fokus: feld.input, enter: los, hoch: true};
  };
}
/* ---------- Suche / Watchlist / neue Order ---------- */
function screenSuche(art) {
  return (body, nav) => {
    const titel = {suche: 'Suche', watchlist: 'Watchlist', order: 'Neue Order'}[art];
    const unter = art === 'order' ? 'Welche Aktie möchtest du handeln?' : 'Jede Aktie mit ISIN, die an ' + stand.handelsplatz + ' gehandelt wird';
    const sf = el('div', 'suchfeld'); sf.innerHTML = ICON.suche;
    const input = el('input'); input.type = 'search'; input.placeholder = 'Name, Kürzel oder ISIN'; input.autocomplete = 'off'; input.spellcheck = false;
    input.setAttribute('aria-label', 'Aktie suchen'); sf.append(input);
    const liste = el('div', 'liste');
    let treffer = [], preise = [], nr = 0;
    function oeffnen(s) { nav.zu(); zeigeSeite('wert', s); if (art === 'order' && !istBreit()) setTimeout(handelmenuAuf, 320); }
    async function hinzu(t, knopfEl) {
      knopfEl.classList.add('laedt');
      const a = await post('/watchlist', {aktion: 'hinzu', isin: t.isin, symbol: t.symbol, name: t.name, yahoo: t.yahoo});
      knopfEl.classList.remove('laedt');
      if (!a.ok) { toast(a.text, true); return; }
      toast(a.text); await tick(); oeffnen(a.symbol);
    }
    function reiheBauen(t) {
      const b = knopf('reihe', null, () => t.watchlist ? oeffnen(t.symbol) : hinzu(t, b));
      const m = el('div', 'r-mitte');
      m.append(t.watchlist ? mitZeichen(el('div', 'r-titel', t.name), t.symbol) : el('div', 'r-titel', t.name),
        el('div', 'r-unter', [t.symbol !== t.isin ? t.symbol : '', t.isin, t.branche].filter(Boolean).join(' · ')));
      const r = el('div', 'r-rechts');
      if (t.watchlist) {
        const preis = el('div', 'r-betrag'); preise.push([preis, t.symbol]); r.append(preis);
        const plan = planVon(t.symbol), z = zeileVon(t.symbol);
        r.append(el('div', 'r-unter', [z ? 'im Depot' : 'Watchlist', plan && plan.aktiv !== false ? 'Sparplan' : ''].filter(Boolean).join(' · ')));
      } else { const plus = el('span', 'plus-knopf'); plus.innerHTML = ICON.plus; plus.title = 'Zur Watchlist hinzufügen'; r.append(plus); }
      b.append(logo(t.symbol), m, r);
      return b;
    }
    function malen() {
      liste.textContent = ''; preise = [];
      const eigene = treffer.filter(t => t.watchlist), weitere = treffer.filter(t => !t.watchlist);
      if (eigene.length) { liste.append(el('div', 'such-gruppe', 'Deine Watchlist')); eigene.forEach(t => liste.append(reiheBauen(t))); }
      if (weitere.length) { liste.append(el('div', 'such-gruppe', 'Weitere Aktien · antippen zum Hinzufügen')); weitere.forEach(t => liste.append(reiheBauen(t))); }
      if (!treffer.length) liste.append(el('p', 'leer', 'Nichts gefunden. Gib die ISIN ein (steht auf jeder Börsenseite), dann lässt sich jede an ' + stand.handelsplatz + ' gehandelte Aktie hinzufügen.'));
      preiseMalen();
    }
    async function laden() {
      const q = input.value.trim(), meins = ++nr;
      try {
        const d = await (await fetch('/suche?q=' + encodeURIComponent(q))).json();
        if (meins !== nr) return;
        treffer = art === 'watchlist' && !q ? d.filter(t => t.watchlist) : d; malen();
      } catch (e) {}
    }
    function preiseMalen() { preise.forEach(([e, s]) => { const k = quote(s).last; e.textContent = k ? geld(k) : '–'; }); }
    let uhr; input.addEventListener('input', () => { clearTimeout(uhr); uhr = setTimeout(laden, 180); });
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { const f = liste.querySelector('button'); if (f) { e.preventDefault(); f.click(); } }
      if (e.key === 'ArrowDown') { const f = liste.querySelector('button'); if (f) { e.preventDefault(); f.focus(); } }
    });
    liste.addEventListener('keydown', e => {
      const b = e.target.closest('button'); if (!b) return;
      const alle = [...liste.querySelectorAll('button')], i = alle.indexOf(b);
      if (e.key === 'ArrowDown' && alle[i + 1]) { e.preventDefault(); alle[i + 1].focus(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); (alle[i - 1] || input).focus(); }
    });
    body.append(el('h1', 's-titel', titel), el('div', 's-unter', unter), sf, liste);
    laden();
    return {fokus: input, update: preiseMalen};
  };
}

/* ---------- Mitteilungen ---------- */
const MELD_ICON = {chance: DIP_ICON('chance'), messer: DIP_ICON('messer'), zahlen: I('<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>', 2.2),
  auftrag: I('<path d="M5 12.5l4.5 4.5L19 7.5"/>', 2.6), auto: DIP_ICON('chance'), alarm: I('<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>', 2.2),
  bericht: I('<rect x="4" y="3" width="16" height="18" rx="3"/><path d="M8 8h8M8 12h8M8 16h5"/>', 2.2)};
function DIP_ICON(k) { return k === 'chance' ? I('<path d="M3 5l6 9 4-4 8 8"/><path d="M13 10l8-6"/><path d="M16 4h5v5"/>', 2.4) : I('<path d="M3 5l6 6 4-4 8 8"/><path d="M21 10v5h-5"/>', 2.6); }
const ungelesen = () => (stand.meldungen || []).filter(m => !m.gelesen).length;
function screenMeldungen() {
  return (body, nav) => {
    const liste = stand.meldungen || [];
    body.append(el('h1', 's-titel', 'Mitteilungen'), el('div', 's-unter', 'Signale, ausgeführte Aufträge, Alarme und Wochenbericht'));
    const box = el('div', 'liste'); box.style.marginTop = '14px';
    liste.forEach(m => {
      const b = knopf('reihe meldung-reihe ' + m.art + (m.gelesen ? '' : ' neu-m'), null, () => {
        if (m.art === 'bericht' || !m.symbol) { nav.weiter(screenBericht()); return; }
        nav.zu(); zeigeSeite('wert', m.symbol);
      });
      const i = el('div', 'logo meld-icon ' + m.art); i.innerHTML = MELD_ICON[m.art] || ICON.plus;
      const t = el('div', 'r-mitte'); t.append(el('div', 'r-titel', m.titel), el('div', 'r-detail', m.text), el('div', 'r-unter', zeitText(m.zeit)));
      b.append(i, t); box.append(b);
    });
    if (!liste.length) box.append(el('p', 'leer', 'Noch keine Mitteilungen. Sobald eine Aktie deiner Watchlist einen Rücksetzer im intakten Trend macht, erscheint sie hier.'));
    body.append(box, el('h3', null, 'Einstellungen'));
    const an = option(ICON.haken, stand.benachrichtigen === false ? 'Mitteilungen einschalten' : 'Mitteilungen ausschalten', async () => {
      await post('/meldungen', {benachrichtigen: stand.benachrichtigen === false}); await tick(); nav.zu();
    }, true);
    body.append(an);
    if ('Notification' in window && Notification.permission !== 'granted') {
      body.append(option(ICON.plus, Notification.permission === 'denied' ? 'Desktop-Mitteilungen im Browser blockiert' : 'Desktop-Mitteilungen erlauben', async () => {
        const r = await Notification.requestPermission(); toast(r === 'granted' ? 'Desktop-Mitteilungen sind an' : 'Nicht erlaubt: Mitteilungen erscheinen nur in der App', r !== 'granted'); nav.zu();
      }, true));
    }
    body.append(el('p', 's-tipp', 'Ein Signal wird gemeldet, wenn es drei Kursabfragen in Folge besteht. Desktop-Mitteilungen funktionieren auf http://localhost; vom Handy über --offen erscheinen sie in der App.'));
    if (ungelesen()) post('/meldungen', {}).then(tick);
    return {};
  };
}
let gemeldet = new Set((hol('pd-gemeldet') || '').split(',').filter(Boolean));
function neueMeldungen() {                                  // Toast und Desktop-Mitteilung für Neues
  const neu = (stand.meldungen || []).filter(m => !m.gelesen && !gemeldet.has(m.id));
  neu.slice(0, 3).forEach(m => {
    toast(m.titel);
    if ('Notification' in window && Notification.permission === 'granted') {
      try { const n = new Notification(m.titel, {body: m.text, tag: m.id, icon: '/icon-192.png'}); n.onclick = () => { window.focus(); if (m.symbol) zeigeSeite('wert', m.symbol); else Sheet.oeffnen(screenBericht()); }; } catch (e) {}
    }
  });
  neu.forEach(m => gemeldet.add(m.id));
  if (neu.length) setz('pd-gemeldet', [...gemeldet].slice(-200).join(','));
  const n = ungelesen();
  ['glockeZahl', 'navMeldZahl'].forEach(id => { const e = $(id); if (e) { e.textContent = n || ''; e.hidden = !n; } });
}

/* ---------- Kaufen: Schnellbeträge (schmale Ansicht) ---------- */
function screenInvestiere(symbol) {
  return (body, nav) => {
    const unter = el('div', 's-unter');
    const raster = el('div', 'schnell');
    const knoepfe = [500, 750, 1000, 2500, 5000].map(eur => {
      const b = knopf(null, GELD0.format(eur), () => nav.weiter(screenOrder({richtung: 'kaufen', symbol, cent: eur * 100})));
      raster.append(b); return [b, eur];
    });
    const mehr = knopf(null, '…', () => nav.weiter(screenOrder({richtung: 'kaufen', symbol, cent: 0})), 'Eigenen Betrag eingeben');
    raster.append(mehr);
    body.append(kopfPapier(symbol), el('h1', 's-titel', 'Investiere'), unter, raster,
      el('p', 's-tipp', 'Oder tippe direkt einen Betrag auf der Tastatur ein – die letzten zwei Ziffern sind Cent.'));
    const update = () => {
      unter.textContent = geld(stand.cash) + ' verfügbar';
      knoepfe.forEach(([b, eur]) => { b.disabled = eur + stand.gebuehr > stand.cash + 1e-9; b.title = b.disabled ? 'Nicht genug Cash' : ''; });
    };
    update();
    const erster = (knoepfe.find(([b]) => !b.disabled) || [mehr])[0];
    return {
      update, fokus: erster,
      tippen: e => { const d = ziffer(e); if (d == null) return false; nav.weiter(screenOrder({richtung: 'kaufen', symbol, cent: d})); return true; },
    };
  };
}

/* ---------- Kaufen / Verkaufen: Betrag (Dialog oder Order-Maske) ---------- */
/* Orderarten: Market sofort, alle anderen als offener Auftrag (siehe auftraege.py) */
const ORDERARTEN = {
  kaufen: [['market', 'Market'], ['limit_kauf', 'Limit']],
  verkaufen: [['market', 'Market'], ['limit_verkauf', 'Take-Profit'], ['stop', 'Stop-Loss'], ['trailing', 'Trailing']],
};
const ART_NAME = {market: 'Market', limit_kauf: 'Limit-Kauf', limit_verkauf: 'Take-Profit', stop: 'Stop-Loss', trailing: 'Trailing-Stop'};
const ART_VORSCHLAG = {limit_kauf: [-2, -5, -10], limit_verkauf: [5, 10, 20], stop: [-5, -10, -15], trailing: [5, 10, 15]};
function zahlAus(t) {                                       // "230,50", "230.5" oder "1.230,50"
  t = String(t || '').trim().replace(/\s|€|%/g, '');
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');   // 1.000 = tausend
  const v = parseFloat(t); return isFinite(v) ? v : null;
}
function artText(ord, k) {                                  // Was passiert bei dieser Orderart?
  const l = ord.limit, f = v => v ? geld(v) : '…';
  return {
    market: 'Wird sofort zum aktuellen ' + (ord.richtung === 'kaufen' ? 'Briefkurs' : 'Geldkurs') + ' ausgeführt, dazu ' + geld(stand.gebuehr) + ' Gebühr.',
    limit_kauf: 'Kauft, sobald der Briefkurs auf ' + f(l) + ' oder darunter fällt. Gilt bis auf Weiteres.',
    limit_verkauf: 'Verkauft, sobald der Geldkurs ' + f(l) + ' oder mehr erreicht (Gewinn sichern).',
    stop: 'Verkauft, sobald der Geldkurs auf ' + f(l) + ' oder darunter fällt (Verlust begrenzen).',
    trailing: 'Der Stopp liegt ' + (l ? ZAHL1.format(l) : '…') + ' % unter dem höchsten Kurs seit heute und zieht mit steigenden Kursen nach' + (l && k ? ' (jetzt ' + geld(k * (1 - l / 100)) + ')' : '') + '.',
  }[ord.art];
}

function screenOrder(ord) {
  return (body, nav) => {
    const kauf = ord.richtung === 'kaufen';
    ord.art = ord.art || 'market';
    const unter = el('div', 's-unter');
    const feld = Betragsfeld({cent: ord.cent, label: (kauf ? 'Kaufbetrag' : 'Verkaufsbetrag') + ' in Euro',
      onChange: c => { ord.cent = c; ord.alles = false; pruefe(); }, onEnter: () => weiter()});
    const anteile = el('div', 'bf-unter');
    const meldung = el('div', 'meldung'); meldung.setAttribute('aria-live', 'polite');
    const info = el('p', 'art-info');
    // Orderart und Limit/Stopp
    const arten = el('div', 'arten'); arten.setAttribute('role', 'group'); arten.setAttribute('aria-label', 'Orderart');
    const preis = el('div', 'preisfeld'), preisLabel = el('label'), preisInput = el('input'), einheit = el('span', 'einheit');
    preisInput.inputMode = 'decimal'; preisInput.autocomplete = 'off'; preisInput.id = 'preis' + (++bfNr); preisLabel.htmlFor = preisInput.id;
    const pz = el('div', 'preis-zeile'); pz.append(preisInput, einheit);
    const vorschlaege = el('div', 'chips links');
    preis.append(preisLabel, pz, vorschlaege);
    preisInput.addEventListener('input', () => { ord.limit = zahlAus(preisInput.value); pruefe(); });
    preisInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); weiter(); } });
    function artMalen() {
      arten.textContent = '';
      ORDERARTEN[ord.richtung].forEach(([a, t]) => {
        const b = knopf('art-chip', t, () => {
          if (ord.art === a) return;
          ord.art = a; ord.limit = null; preisInput.value = ''; artMalen(); pruefe();
          if (a !== 'market') setTimeout(() => preisInput.focus(), 30); else feld.fokus();
        });
        b.setAttribute('aria-pressed', ord.art === a ? 'true' : 'false'); arten.append(b);
      });
      preis.hidden = ord.art === 'market';
      preisLabel.textContent = {limit_kauf: 'Limit (Kauf höchstens zu)', limit_verkauf: 'Verkaufen ab', stop: 'Stopp bei', trailing: 'Abstand zum Höchstkurs'}[ord.art] || '';
      einheit.textContent = ord.art === 'trailing' ? '%' : '€';
      preisInput.placeholder = ord.art === 'trailing' ? 'z. B. 8' : 'z. B. 215,00';
      vorschlaege.textContent = '';
      (ART_VORSCHLAG[ord.art] || []).forEach(v => {
        const c = knopf('chip', (v > 0 && ord.art !== 'trailing' ? '+' : '') + v + ' %', () => {
          const k = kauf ? kaufKurs(ord.symbol) : verkaufKurs(ord.symbol); if (!k) return;
          ord.limit = ord.art === 'trailing' ? v : Math.round(k * (1 + v / 100) * 100) / 100;
          preisInput.value = ord.art === 'trailing' ? String(v) : ZAHL2.format(ord.limit); pruefe();
        });
        vorschlaege.append(c);
      });
    }
    artMalen();
    const weiterK = knopfTI('knopf orange', 'Weiter', ICON.chev, () => weiter());
    const chips = el('div', 'chips'), chipKnoepfe = [];
    if (!kauf) {
      [[25, '25 %'], [50, '50 %'], [100, 'Alles']].forEach(([p, t]) => {
        const c = knopf('chip', t, () => {
          const pos = zeileVon(ord.symbol), k = verkaufKurs(ord.symbol); if (!pos || !k) return;
          feld.setzen(Math.floor(pos.anteile * k * p / 100 * 100 + 1e-6), true);
          ord.cent = feld.cent(); ord.alles = p === 100; pruefe(); feld.fokus();
        });
        c.dataset.p = p; chipKnoepfe.push(c); chips.append(c);
      });
    } else if (ord.ticket) {                                 // Schnellbeträge direkt in der Order-Maske
      [50000, 100000, 250000, 500000].forEach(c => {
        const k = knopf('chip', GELD0.format(c / 100), () => { feld.setzen(c); feld.fokus(); });
        k.dataset.c = c; chipKnoepfe.push(k); chips.append(k);
      });
      const max = knopf('chip', 'Max', () => { feld.setzen(Math.max(0, Math.floor((stand.cash - stand.gebuehr) * 100 + 1e-6))); feld.fokus(); });
      max.dataset.max = '1'; chipKnoepfe.push(max); chips.append(max);
    }
    if (ord.ticket) {
      const seg = el('div', 'segment'); seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'Orderrichtung');
      [['kaufen', 'Kaufen'], ['verkaufen', 'Verkaufen']].forEach(([r, t]) => {
        const b = knopf('seg', t, () => { if (r !== ord.richtung) ticketNeu(r, true); else feld.fokus(); });
        b.setAttribute('aria-pressed', r === ord.richtung ? 'true' : 'false'); seg.append(b);
      });
      body.append(seg, arten, unter, feld.el, anteile, chips, preis, info, meldung, fuss(el('span'), weiterK));
    } else {
      body.append(kopfPapier(ord.symbol), el('h1', 's-titel', kauf ? 'Kaufen' : 'Verkaufen'), arten, unter, feld.el, anteile);
      if (!kauf) body.append(chips);
      body.append(preis, info, meldung, fuss(el('span'), weiterK));
    }

    function pruefe() {
      const k = kauf ? kaufKurs(ord.symbol) : verkaufKurs(ord.symbol);
      const pos = zeileVon(ord.symbol);
      if (ord.alles && pos && k) {                           // "Alles": Betrag folgt dem Kurs
        const c = Math.floor(pos.anteile * k * 100 + 1e-6);
        if (c !== feld.cent()) feld.setzen(c, true);
        ord.cent = c;
      }
      const betrag = ord.cent / 100;
      unter.textContent = kauf ? geld(stand.cash) + ' verfügbar' : pos && k ? geld(pos.anteile * k) + ' in deiner Position' : 'Keine Position';
      const stk = ord.alles && pos ? pos.anteile : k ? betrag / k : 0;
      anteile.textContent = !k ? 'Kein aktueller Kurs' : ord.cent > 0 ? 'Anteile: ' + STK4.format(stk) : (kauf ? 'Briefkurs ' : 'Geldkurs ') + geld(k);
      chipKnoepfe.forEach(c => {
        if (c.dataset.p) c.setAttribute('aria-pressed', ord.alles && c.dataset.p === '100' ? 'true' : 'false');
        if (c.dataset.c) c.disabled = +c.dataset.c / 100 + stand.gebuehr > stand.cash + 1e-9;
        if (c.dataset.max) c.disabled = stand.cash <= stand.gebuehr;
      });
      info.textContent = artText(ord, k);
      let fehler = '', betragFehler = false;
      const auftrag = ord.art !== 'market';
      if (!stand.offen && !auftrag) fehler = 'Handel geschlossen. Market-Orders gehen Mo–Fr ' + stand.handel_von + '–' + stand.handel_bis + ' Uhr. Aufträge (Limit, Stop) kannst du jederzeit anlegen.';
      else if (!k) fehler = 'Für dieses Papier liegt gerade kein Kurs vor.';
      else if (auftrag && ord.limit != null && (ord.art === 'trailing' ? ord.limit < 0.5 || ord.limit > 50 : ord.limit <= 0)) fehler = ord.art === 'trailing' ? 'Abstand zwischen 0,5 und 50 %.' : 'Bitte einen Kurs größer als 0 € angeben.';
      else if (kauf && ord.cent > 0 && betrag + stand.gebuehr > stand.cash + 1e-9) {
        fehler = 'Nicht genug Cash: ' + geld(stand.cash) + ' verfügbar, ' + geld(betrag + stand.gebuehr) + ' nötig (inkl. ' + geld(stand.gebuehr) + ' Gebühr).'; betragFehler = true;
      } else if (!kauf && !pos) fehler = 'Du hältst keine Anteile von ' + papierVon(ord.symbol).name + '.';
      else if (!kauf && !ord.alles && betrag > pos.anteile * k + 0.005) { fehler = 'Deine Position ist nur ' + geld(pos.anteile * k) + ' wert.'; betragFehler = true; }
      else if (!kauf && ord.cent > 0 && betrag <= stand.gebuehr) { fehler = 'Der Verkaufswert muss über der Gebühr von ' + geld(stand.gebuehr) + ' liegen.'; betragFehler = true; }
      meldung.textContent = fehler; meldung.className = 'meldung' + (fehler ? ' fehler' : '');
      feld.fehler(betragFehler);
      weiterK.disabled = !!fehler || ord.cent <= 0 || (auftrag && !ord.limit);
      return fehler || (ord.cent <= 0 ? 'Bitte gib einen Betrag ein.' : auftrag && !ord.limit ? (ord.art === 'trailing' ? 'Bitte einen Abstand in % angeben.' : 'Bitte einen Kurs angeben.') : '');
    }
    function weiter() {
      const f = pruefe();
      if (f) { feld.wackeln(); meldung.textContent = f; meldung.className = 'meldung fehler'; return; }
      nav.weiter(screenPruefen(ord));
    }
    pruefe();
    return {update: pruefe, feld, fokus: feld.input, enter: weiter, hoch: true};
  };
}

/* ---------- Order prüfen und bestätigen ---------- */
function screenPruefen(ord) {
  return (body, nav) => {
    const kauf = ord.richtung === 'kaufen';
    const karte = el('div', 'karte'), w = {};
    [['art', 'Orderart'], ['kurs', kauf ? 'Briefkurs' : 'Geldkurs'], ['stk', 'Anteile (ca.)'], ['vol', 'Ordervolumen'],
     ['geb', 'Ordergebühr'], ['ges', kauf ? 'Belastung gesamt' : 'Gutschrift'], ['danach', 'Cash danach']]
      .forEach(([id, k]) => { w[id] = reihe(karte, k, '').lastChild; });
    const gross = el('div', 'pruef-betrag');
    const meldung = el('div', 'meldung'); meldung.setAttribute('aria-live', 'polite');
    const auftrag = ord.art && ord.art !== 'market';
    const ok = knopfTI('knopf orange breit', auftrag ? ART_NAME[ord.art] + ' anlegen' : (kauf ? 'Kaufen' : 'Verkaufen') + ' bestätigen', ICON.haken, () => los());
    const volumen = ord.alles ? 0 : ord.cent / 100;
    const einschaetzung = pruefAnalyse(ord.symbol, kauf, volumen);
    body.append(kopfPapier(ord.symbol), el('h1', 's-titel', auftrag ? 'Auftrag prüfen' : 'Order prüfen'),
      el('div', 's-unter', (kauf ? 'Kauf' : 'Verkauf') + ' · ' + ART_NAME[ord.art || 'market'] + ' · ' + stand.handelsplatz), gross);
    if (einschaetzung) body.append(einschaetzung);
    body.append(karte,
      el('p', 's-tipp', auftrag ? artText(ord, kauf ? kaufKurs(ord.symbol) : verkaufKurs(ord.symbol)) + ' Ausgeführt wird dann zum aktuellen Kurs; das Programm muss dafür laufen.'
        : 'Ausführung sofort zum aktuellen Kurs; bis zur Bestätigung kann er sich minimal bewegen.'),
      meldung, fuss(ok));
    const seit = performance.now();
    function update() {
      const k = kauf ? kaufKurs(ord.symbol) : verkaufKurs(ord.symbol);
      const pos = zeileVon(ord.symbol);
      const stk = ord.alles && pos ? pos.anteile : k ? ord.cent / 100 / k : 0;
      const vol = ord.alles && pos && k ? pos.anteile * k : ord.cent / 100;
      const geb = stand.gebuehr;
      w.art.textContent = ART_NAME[ord.art || 'market'] + (auftrag ? ' · ' + (ord.art === 'trailing' ? ZAHL1.format(ord.limit) + ' %' : geld(ord.limit)) : '');
      w.kurs.textContent = k ? geld(k) : '–';
      w.stk.textContent = STK6.format(stk);
      w.vol.textContent = geld(vol);
      w.geb.textContent = geld(geb);
      w.ges.textContent = kauf ? '−' + geld(vol + geb) : '+' + geld(vol - geb);
      w.danach.textContent = geld(stand.cash + (kauf ? -(vol + geb) : vol - geb));
      gross.textContent = geld(vol);
      if (auftrag) { w.geb.textContent = geld(geb) + ' bei Ausführung'; w.danach.textContent = 'bei Ausführung'; }
      const sperre = !stand.offen && !auftrag ? 'Handel geschlossen.' : !k ? 'Gerade kein Kurs verfügbar.' : '';
      ok.disabled = !!sperre;
      if (sperre) { meldung.textContent = sperre; meldung.className = 'meldung fehler'; }
    }
    async function los() {
      if (performance.now() - seit < 400 || ok.disabled || ok.classList.contains('laedt')) return;
      ok.classList.add('laedt'); meldung.textContent = '';
      if (auftrag) {
        const r = await post('/auftrag', {art: ord.art, symbol: ord.symbol, cent: ord.cent, alles: !!ord.alles,
          limit: ord.art === 'trailing' ? null : ord.limit, abstand: ord.art === 'trailing' ? ord.limit : null});
        ok.classList.remove('laedt');
        if (!r.ok) { meldung.textContent = r.text; meldung.className = 'meldung fehler'; return; }
        await tick(); nav.oeffnen(screenAuftragFertig(ord, r)); toast(r.text);
        return;
      }
      const a = await post('/order', {richtung: ord.richtung, symbol: ord.symbol, cent: ord.cent, alles: !!ord.alles});
      ok.classList.remove('laedt');
      if (!a.ok) { meldung.textContent = a.text || 'Die Order wurde nicht ausgeführt.'; meldung.className = 'meldung fehler'; return; }
      hervorheben = a.order && a.order.zeit; setTimeout(() => { hervorheben = null; male(); }, 5000);
      await tick(); verlaufZeit = 0; ladeVerlauf();
      nav.oeffnen(screenFertig(ord, a));
      if (ord.ticket) toast((kauf ? 'Kauf' : 'Verkauf') + ' ausgeführt: ' + papierVon(ord.symbol).name);
    }
    update();
    return {update, fokus: ok, enter: los};
  };
}
function screenAuftragFertig(ord, r) {
  return (body, nav) => {
    const box = el('div', 'fertig'), haken = el('div', 'haken');
    haken.innerHTML = '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
    box.append(haken, el('h1', 's-titel', ART_NAME[ord.art] + ' angelegt'), el('div', 's-unter', papierVon(ord.symbol).name));
    const k = ord.richtung === 'kaufen' ? kaufKurs(ord.symbol) : verkaufKurs(ord.symbol);
    const fertig = ord.ticket ? knopfTI('knopf dunkel breit mitte', 'Neue Order', null, () => ticketNeu(ord.richtung, true))
      : knopfTI('knopf hell breit mitte', 'Fertig', null, () => nav.zu());
    body.append(box, el('p', 's-tipp', artText(ord, k) + ' Du bekommst eine Mitteilung, wenn der Auftrag ausgeführt wird. Offene Aufträge stehen auf der Aktienseite.'), fuss(fertig));
    return {fokus: fertig, enter: () => fertig.click()};
  };
}
function screenFertig(ord, a) {
  return (body, nav) => {
    const kauf = ord.richtung === 'kaufen', o = a.order || {};
    const box = el('div', 'fertig'), haken = el('div', 'haken');
    haken.innerHTML = '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
    box.append(haken, el('h1', 's-titel', kauf ? 'Kauf ausgeführt' : 'Verkauf ausgeführt'), el('div', 's-unter', papierVon(ord.symbol).name));
    const karte = el('div', 'karte');
    const fluss = o.fluss != null ? o.fluss : kauf ? -(o.betrag + o.gebuehr) : o.betrag - o.gebuehr;
    reihe(karte, 'Anteile', STK6.format(o.stueck || 0));
    reihe(karte, 'Ausführungskurs', geld(o.kurs));
    reihe(karte, 'Ordervolumen', geld(o.betrag));
    reihe(karte, 'Gebühr', geld(o.gebuehr));
    reihe(karte, kauf ? 'Belastung' : 'Gutschrift', vz(fluss));
    reihe(karte, 'Cash jetzt', geld(a.cash));
    if (o.analyse) reihe(karte, 'Einschätzung zum Zeitpunkt', o.analyse.score + ' · ' + o.analyse.urteil);
    const fertig = ord.ticket
      ? knopfTI('knopf dunkel breit mitte', 'Neue Order', null, () => ticketNeu(ord.richtung, true))
      : knopfTI('knopf hell breit mitte', 'Fertig', null, () => nav.zu());
    body.append(box, karte, el('p', 's-tipp', 'Simulierte Order im Paperdepot. Die Transaktion steht jetzt unter Cash → Transaktionen.'), fuss(fertig));
    return {fokus: fertig, enter: () => fertig.click()};
  };
}

/* ---------- Sparpläne ---------- */
function naechsterTermin(tag) {
  const h = new Date(); let j = h.getFullYear(), m = h.getMonth();
  if (h.getDate() >= tag) { m++; if (m > 11) { m = 0; j++; } }
  return new Date(j, m, tag, 12);
}
function screenSparplan(symbol) {
  return (body, nav) => {
    const plan = planVon(symbol);
    const tage_ = stand.sparplan_tage || [1, 2, 15, 16];
    let tag = plan ? plan.tag : tage_[0];
    const minimum = stand.sparplan_min || 1;
    const feld = Betragsfeld({cent: plan ? Math.round(plan.betrag * 100) : 0, label: 'Sparrate pro Monat in Euro', onChange: () => pruefe(), onEnter: () => speichern()});
    const chips = el('div', 'chips');
    tage_.forEach(t => { const c = knopf('chip', t + '.', () => { tag = t; pruefe(); feld.fokus(); }); c.dataset.t = t; chips.append(c); });
    const info = el('div', 's-info'), status = el('div', 's-info');
    const meldung = el('div', 'meldung'); meldung.setAttribute('aria-live', 'polite');
    const sp = knopfTI('knopf orange', plan ? 'Speichern' : 'Anlegen', ICON.chev, () => speichern());
    const neben = el('div', 's-neben');
    if (plan) {
      const pause = knopf('textknopf', plan.aktiv === false ? 'Fortsetzen' : 'Pausieren', async () => fertig(await post('/sparplan', {aktion: 'pausieren', symbol, aktiv: plan.aktiv === false})));
      let sicher = false, uhr;
      const loeschen = knopf('textknopf rot', 'Löschen', async () => {
        if (!sicher) { sicher = true; loeschen.textContent = 'Wirklich löschen?'; uhr = setTimeout(() => { sicher = false; loeschen.textContent = 'Löschen'; }, 3500); return; }
        clearTimeout(uhr); fertig(await post('/sparplan', {aktion: 'loeschen', symbol}));
      });
      neben.append(pause, loeschen);
    }
    body.append(kopfPapier(symbol), el('h1', 's-titel', plan ? 'Sparplan' : 'Sparplan anlegen'), el('div', 's-unter', 'Monatlich · automatisch zum Briefkurs'),
      feld.el, el('div', 'bf-unter', 'pro Monat · zzgl. ' + geld(stand.gebuehr) + ' Gebühr je Ausführung'),
      el('div', 's-label', 'Ausführung am'), chips, info, status, meldung, fuss(neben, sp));
    function pruefe() {
      chips.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', +c.dataset.t === tag ? 'true' : 'false'));
      if (plan && plan.aktiv === false) info.textContent = 'Pausiert – wird nicht ausgeführt.';
      else if (plan && plan.tag === tag) info.textContent = 'Nächste Ausführung: ' + datum(plan.naechste);
      else info.textContent = (plan ? 'Nächste Ausführung: ' : 'Erste Ausführung: ') + datum(naechsterTermin(tag));
      status.textContent = plan && plan.hinweis ? plan.hinweis : plan && plan.letzte ? 'Zuletzt ausgeführt: ' + zeitText(plan.letzte) : '';
      status.className = 's-info' + (plan && plan.hinweis ? ' fehler' : '');
      const c = feld.cent();
      const f = c > 0 && c < minimum * 100 ? 'Mindestens ' + geld(minimum) + ' je Ausführung.' : '';
      meldung.textContent = f; meldung.className = 'meldung' + (f ? ' fehler' : '');
      feld.fehler(!!f); sp.disabled = !!f || c === 0;
      return f || (c === 0 ? 'Bitte gib eine Sparrate ein.' : '');
    }
    async function speichern() {
      const f = pruefe();
      if (f) { feld.wackeln(); meldung.textContent = f; meldung.className = 'meldung fehler'; return; }
      if (sp.classList.contains('laedt')) return;
      sp.classList.add('laedt');
      const a = await post('/sparplan', {aktion: 'speichern', symbol, cent: feld.cent(), tag});
      sp.classList.remove('laedt');
      fertig(a);
    }
    async function fertig(a) {
      if (!a.ok) { meldung.textContent = a.text || 'Das hat nicht geklappt.'; meldung.className = 'meldung fehler'; return; }
      toast(a.text); await tick();
      if (nav.tiefe() > 1) nav.zurueck(); else nav.zu();
    }
    pruefe();
    return {feld, fokus: feld.input, enter: speichern, hoch: true};
  };
}
function screenSparplaene() {
  return (body, nav) => {
    const plaene = stand.sparplaene || [];
    const summe = plaene.filter(p => p.aktiv !== false).reduce((s, p) => s + p.betrag, 0);
    body.append(el('h1', 's-titel', 'Sparpläne'),
      el('div', 's-unter', plaene.length ? geld(summe) + ' pro Monat · ' + plaene.length + (plaene.length === 1 ? ' Plan' : ' Pläne') : 'Noch keine Sparpläne'));
    const liste = el('div', 'liste'); liste.style.marginTop = '14px';
    plaene.forEach(p => {
      const b = knopf('reihe', null, () => nav.weiter(screenSparplan(p.symbol)));
      const m = el('div', 'r-mitte');
      m.append(el('div', 'r-titel', papierVon(p.symbol).name),
        el('div', 'r-unter', p.aktiv === false ? 'pausiert' : 'am ' + p.tag + '. · nächste ' + datum(p.naechste)));
      const r = el('div', 'r-rechts'); r.append(el('div', 'r-betrag', geld(p.betrag)));
      b.append(logo(p.symbol), m, r); liste.append(b);
    });
    body.append(liste);
    const ohne = (stand.universum || []).filter(u => !plaene.some(p => p.symbol === u.symbol));
    if (ohne.length) {
      body.append(el('h3', null, 'Neuen Sparplan anlegen'));
      const l2 = el('div', 'liste');
      ohne.forEach(u => {
        const b = knopf('reihe', null, () => nav.weiter(screenSparplan(u.symbol)));
        const m = el('div', 'r-mitte'); m.append(el('div', 'r-titel', u.name), el('div', 'r-unter', u.symbol));
        b.append(logo(u.symbol), m); l2.append(b);
      });
      body.append(l2);
    }
    body.append(el('p', 's-tipp', 'Sparpläne werden am Ausführungstag während der Handelszeit ausgeführt, solange das Depot-Programm läuft. War es aus, wird die Ausführung beim nächsten Start einmal nachgeholt.'));
    return {fokus: body.querySelector('.reihe') || undefined};
  };
}

/* ---------- Transaktionen, Profil ---------- */
function screenTransaktionenListe() {
  return (body) => {
    const liste = umsaetze();
    body.append(el('h1', 's-titel', 'Transaktionen'), el('div', 's-unter', liste.length + (liste.length === 1 ? ' Umsatz' : ' Umsätze') + ' · Paperdepot'));
    const box = el('div', 'liste'); box.style.marginTop = '14px';
    liste.forEach(u => box.append(umsatzReihe(u)));
    if (!liste.length) box.append(el('p', 'leer', 'Noch keine Transaktionen.'));
    const exp = el('a', 'option klein'); exp.href = '/export.csv'; exp.setAttribute('download', 'paperdepot-umsaetze.csv');
    const i = el('span', 'o-icon'); i.innerHTML = ICON.runterladen; exp.append(i, el('span', null, 'Als CSV exportieren'));
    exp.style.marginTop = '16px';
    body.append(box, exp);
    return {};
  };
}
function screenProfil() {
  return (body, nav) => {
    const kopf = el('div'); kopf.style.cssText = 'display:flex;align-items:center;gap:16px;margin-top:6px';
    const a = el('div', 'logo gross', (stand.titel || 'P').charAt(0).toUpperCase()); a.style.background = '#3b3b40'; a.style.color = '#0b0b0c';
    const t = el('div'); t.append(el('h1', 's-titel', stand.titel || 'Paperdepot'), el('div', 's-unter', 'Paperdepot · Simulation mit Spielgeld'));
    t.firstChild.style.margin = '0 0 2px'; kopf.append(a, t);
    const karte = el('div', 'karte'); karte.style.marginTop = '22px';
    reihe(karte, 'Handelsplatz', stand.handelsplatz);
    reihe(karte, 'Handelszeiten', 'Mo–Fr ' + stand.handel_von + '–' + stand.handel_bis + ' Uhr');
    reihe(karte, 'Ordergebühr', geld(stand.gebuehr) + ' je Order');
    if (stand.demo) reihe(karte, 'Modus', 'Demo (erfundene Kurse)');
    reihe(karte, 'Letzte Kurse', new Date(stand.zeit).toLocaleTimeString('de-DE') + ' Uhr');
    const optionen = el('div'); optionen.style.marginTop = '14px';
    const exp = el('a', 'option klein'); exp.href = '/export.csv'; exp.setAttribute('download', 'paperdepot-umsaetze.csv');
    const ei = el('span', 'o-icon'); ei.innerHTML = ICON.runterladen; exp.append(ei, el('span', null, 'Umsätze als CSV exportieren'));
    optionen.append(option(ICON.liste, 'Depots wechseln oder anlegen', () => nav.weiter(screenDepots()), true),
      option(ICON.liste, 'Wochenbericht', () => nav.weiter(screenBericht()), true),
      option(ICON.wiederholen, 'Sparpläne', () => nav.weiter(screenSparplaene()), true),
      option(ICON.liste, 'Alle Transaktionen', () => nav.weiter(screenTransaktionenListe()), true), exp);
    body.append(kopf, karte, optionen,
      el('p', 's-tipp', 'Kurse: Tradegate (live) · Tageskurse und Analystenmeinungen: Yahoo Finance, automatisch alle 6 bzw. 12 Stunden. Tastatur: / Suche, K Kaufen, V Verkaufen, S Sparplan, Esc zurück. Keine echten Orders, keine Anlageberatung.'));
    return {};
  };
}

/* ================= Umsätze ================= */
const QUELLE_NAME = {start: 'Einbuchung', sparplan: 'Sparplan', 'auto-dip': 'Auto-Dip-Kauf', limit_kauf: 'Limit-Kauf',
  limit_verkauf: 'Take-Profit', stop: 'Stop-Loss', trailing: 'Trailing-Stop'};
function umsaetze() {
  const liste = [];
  (stand.orders || []).forEach(o => {
    const kauf = o.richtung === 'kaufen';
    const fluss = o.fluss != null ? o.fluss : kauf ? -(o.betrag + o.gebuehr) : o.betrag - o.gebuehr;
    const typ = o.quelle === 'sparplan' ? 'sparplan' : kauf ? 'kauf' : 'verkauf';
    liste.push({zeit: o.zeit, symbol: o.symbol, fluss, typ,
      titel: (QUELLE_NAME[o.quelle] || (kauf ? 'Kauf' : 'Verkauf')) + ' ' + o.symbol,
      unter: zeitText(o.zeit),
      detail: STK4.format(o.stueck) + ' × ' + geld(o.kurs) + ' · Gebühr ' + geld(o.gebuehr)
        + (o.analyse ? ' · Score beim Kauf ' + o.analyse.score + ' (' + o.analyse.urteil + ')' : '')});
  });
  (stand.buchungen || []).forEach(b => {
    const ein = b.art === 'einzahlung', ziel = 'Paperdepot';
    liste.push({zeit: b.zeit, art: b.art, typ: ein ? 'einzahlung' : 'auszahlung', fluss: b.betrag, titel: ein ? 'Einzahlung' : 'Auszahlung',
      unter: zeitText(b.zeit) + ' · ' + ziel, ziel});
  });
  return liste.sort((a, b) => Date.parse(b.zeit) - Date.parse(a.zeit));
}
function umsatzIcon(u, groesse) {
  if (u.symbol) return logo(u.symbol, groesse);
  const i = el('div', 'logo neutral' + (groesse ? ' ' + groesse : '')); i.innerHTML = u.typ === 'einzahlung' ? ICON.plus : ICON.bank; return i;
}
function umsatzReihe(u) {
  const d = el('div', 'reihe statisch' + (hervorheben && u.zeit === hervorheben ? ' neu' : ''));
  const m = el('div', 'r-mitte'); m.append(el('div', 'r-titel', u.titel), el('div', 'r-unter', u.unter));
  if (u.detail) m.append(el('div', 'r-detail', u.detail));
  const r = el('div', 'r-rechts'); r.append(el('div', 'r-betrag' + (u.fluss > 0 ? ' up' : ''), vz(u.fluss)));
  d.append(umsatzIcon(u), m, r);
  return d;
}

/* ================= Seiten ================= */
const TAB_NAMEN = {portfolio: 'Portfolio', cash: 'Cash', analytics: 'Analytics'};
function zeigeSeite(s, symbol) {
  if (s === 'wert') {
    if (!symbol) return;
    const neu = symbol !== gewaehlt;
    if (neu) { verlaufWp = []; verlaufWpSym = null; }
    gewaehlt = symbol;
    if (neu || !Ticket.tiefe()) ticketNeu('kaufen', true);
    else setTimeout(() => Ticket.fokus(), 60);
    ladeAnalyse(symbol);
  } else { letzteTab = s; setz('pd-tab', s); }
  const wechsel = seite !== s || s === 'wert';
  seite = s;
  $('seitePortfolio').hidden = s !== 'portfolio';
  $('seiteCash').hidden = s !== 'cash';
  $('seiteAnalytics').hidden = s !== 'analytics';
  $('seiteWert').hidden = s !== 'wert';
  const tabZiel = letzteTab === 'analytics' ? 'cash' : letzteTab;
  document.querySelectorAll('.tab').forEach(b => { if (b.dataset.s === tabZiel) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  document.querySelectorAll('.nav-item[data-s]').forEach(b => { if (b.dataset.s === (s === 'wert' ? letzteTab : s)) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  $('zurueckText').textContent = TAB_NAMEN[letzteTab];
  $('leiste').hidden = s === 'wert';
  $('leisteWp').hidden = s !== 'wert';
  $('railMarkt').hidden = s === 'wert';
  $('railWert').hidden = s !== 'wert';
  if (s !== 'wert') handelmenuZu(false);
  if (wechsel) window.scrollTo(0, 0);
  chartSig.pf = chartSig.wp = chartSig.an = '';
  male();
  ladeVerlauf();
}

function raumLeiste(id, holen, setzen) {
  const box = $(id);
  RAEUME.forEach(([k, t]) => {
    const b = knopf(null, t, () => { setzen(k); chartSig.pf = chartSig.wp = ''; male(); ladeVerlauf(); });
    b.dataset.r = k; box.append(b);
  });
  return () => box.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.r === holen() ? 'true' : 'false'));
}
const raumPfMalen = raumLeiste('pfRaum', () => raumPf, k => { raumPf = k; setz('pd-raum', k); });
const raumWpMalen = raumLeiste('wpRaum', () => raumWp, k => { raumWp = k; setz('pd-raum-wp', k); });

function deltaSetzen(e, delta, prozent, nurProzent) {
  const d = richtung(nurProzent ? prozent : delta);
  e.className = 'delta ' + d; e.textContent = '';
  if (d !== 'flat') e.append(el('span', 'dreieck', dreieck(d)));
  if (nurProzent) { e.append(el('span', null, ZAHL2.format(Math.abs(prozent)) + ' %')); return; }
  e.append(el('span', null, geld(Math.abs(delta))));
  if (prozent != null && isFinite(prozent)) e.append(el('span', 'delta-p', ZAHL2.format(Math.abs(prozent)) + ' %'));
}
function perfText(e, wert, text) {
  const d = richtung(wert); e.className = (e.dataset.basis || '') + ' ' + d; e.textContent = '';
  if (d !== 'flat') e.append(el('span', 'dreieck', dreieck(d)));
  e.append(document.createTextNode(text));
}
function kpi(box, titel, wert, klasse, sub) {
  const k = el('div', 'kpi'); k.append(el('span', 'k-titel', titel), el('span', 'k-wert ' + (klasse || ''), wert));
  if (sub != null) k.append(el('span', 'k-sub', sub));
  box.append(k);
}

/* ---------- Portfolio ---------- */
function positionReihe(z) {
  const b = knopf('reihe', null, () => zeigeSeite('wert', z.symbol));
  const m = el('div', 'r-mitte'); m.append(mitZeichen(el('div', 'r-titel', z.name), z.symbol), el('div', 'r-unter', z.wert != null ? geld(z.wert) : 'kein Kurs'));
  const r = el('div', 'r-rechts');
  if (z.gv != null) {
    const p = el('div'); p.dataset.basis = 'r-perf';
    perfText(p, modus === 'pct' ? z.gvp : z.gv, modus === 'pct' ? ZAHL2.format(Math.abs(z.gvp)) + ' %' : geld(Math.abs(z.gv)));
    r.append(p);
  }
  b.append(logo(z.symbol), m, r);
  return b;
}
function positionZeileTabelle(z, gesamt) {
  const tr = el('tr'); tr.tabIndex = 0; tr.setAttribute('aria-label', z.name + ' öffnen');
  const oeffnen = () => zeigeSeite('wert', z.symbol);
  tr.onclick = oeffnen; tr.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); oeffnen(); } };
  const td = (cls, ...kinder) => { const c = el('td', cls); c.append(...kinder); tr.append(c); return c; };
  const name = el('div', 't-name'); const n = el('div'); n.append(mitZeichen(el('div', 't-titel', z.name), z.symbol), el('div', 't-klein', z.symbol + ' · ' + (z.isin || '')));
  name.append(logo(z.symbol), n); td(null, name);
  td('r opt', STK4.format(z.anteile));
  td('r', z.kurs ? geld(z.kurs) : '–');
  td('r', z.wert != null ? geld(z.wert) : '–');
  const anteil = gesamt && z.wert ? z.wert / gesamt * 100 : 0;
  const g = el('div', 'gewicht'); const bar = el('div', 'bar'); const i = el('i'); i.style.width = Math.min(100, anteil) + '%'; bar.append(i);
  g.append(bar, el('span', null, ZAHL1.format(anteil) + ' %')); td(null, g);
  const rechts = el('div', 't-rechts');
  if (z.gv != null) { const p = el('div'); p.dataset.basis = 't-titel'; perfText(p, z.gvp, ZAHL2.format(Math.abs(z.gvp)) + ' %'); rechts.append(p, el('div', 't-klein', vz(z.gv))); }
  else rechts.append(el('div', 't-klein', '–'));
  td('r', rechts);
  return tr;
}
function malePortfolio() {
  $('pfWert').textContent = geld(stand.aktien);
  const daten = chartDaten('pf');
  let delta = stand.gv, basis = stand.eingezahlt;
  if (raumPf !== 'MAX' && daten.length) { delta = stand.gv - daten[0].v; basis = daten[0].w; }
  deltaSetzen($('pfDelta'), delta, basis ? delta / basis * 100 : null);
  raumPfMalen();
  chartMalen('pf', daten);
  $('kWatchWert').textContent = (stand.universum || []).length;
  const summe = (stand.sparplaene || []).filter(p => p.aktiv !== false).reduce((s, p) => s + p.betrag, 0);
  $('kSparWert').textContent = geldKurz(summe);
  const mb = $('pfModus'); mb.textContent = ''; mb.append(el('span', null, 'Seit Kauf · ' + (modus === 'pct' ? '%' : '€'))); mb.insertAdjacentHTML('beforeend', ICON.runter);
  mb.setAttribute('aria-label', 'Anzeige umschalten: seit Kauf in ' + (modus === 'pct' ? 'Prozent' : 'Euro'));
  const zeilen = (stand.zeilen || []).slice().sort((a, b) => (b.wert || 0) - (a.wert || 0));
  $('pfAnzahl').textContent = zeilen.length + (zeilen.length === 1 ? ' Position' : ' Positionen');
  const dipSig = JSON.stringify((stand.universum || []).map(u => (dipVon(u.symbol) || {}).status));
  ersetzeWennNeu($('pfListe'), modus + dipSig + JSON.stringify(zeilen.map(z => [z.symbol, z.name, z.wert, z.gv])), box => {
    zeilen.forEach(z => box.append(positionReihe(z)));
    if (!zeilen.length) box.append(el('p', 'leer', 'Noch keine Investments. Zahle über „Überweisen“ Geld ein und kaufe über „Suche“ dein erstes Wertpapier.'));
  });
  // Tabelle (breite Ansicht), sortierbar
  const key = sortPf.k, gesamt = stand.aktien || 0;
  const wertVon = z => key === 'gewicht' ? (z.wert || 0) : z[key];
  const sortiert = zeilen.slice().sort((a, b) => key === 'name' ? a.name.localeCompare(b.name, 'de') : ((wertVon(a) ?? -Infinity) - (wertVon(b) ?? -Infinity)));
  if (sortPf.ab) sortiert.reverse();
  document.querySelectorAll('#pfThead th').forEach(th => { if (th.dataset.k === key) th.setAttribute('aria-sort', sortPf.ab ? 'descending' : 'ascending'); else th.removeAttribute('aria-sort'); });
  ersetzeWennNeu($('pfTabelle'), dipSig + JSON.stringify([sortPf, sortiert.map(z => [z.symbol, z.wert, z.gv, z.kurs, z.anteile])]), tb => {
    sortiert.forEach(z => tb.append(positionZeileTabelle(z, gesamt)));
    if (!sortiert.length) { const tr = el('tr', 'statisch'); const td = el('td', 'leer', 'Noch keine Investments.'); td.colSpan = 6; tr.append(td); tb.append(tr); }
  });
}

/* ---------- Cash ---------- */
const FILTER = [['alle', 'Alle'], ['kauf', 'Käufe'], ['verkauf', 'Verkäufe'], ['sparplan', 'Sparpläne'], ['einzahlung', 'Einzahlungen'], ['auszahlung', 'Auszahlungen']];
function maleCash() {
  $('cashWert').textContent = geld(stand.cash);
  const alle = umsaetze();
  const liste = alle.slice(0, 12);
  ersetzeWennNeu($('cashListe'), (hervorheben || '') + JSON.stringify(liste.map(u => [u.zeit, u.fluss, u.titel])), box => {
    liste.forEach(u => box.append(umsatzReihe(u)));
    if (!liste.length) box.append(el('p', 'leer', 'Noch keine Transaktionen. Über „Überweisen“ → „Geld einzahlen“ kommt Spielgeld aufs Konto.'));
  });
  const anzahl = t => t === 'alle' ? alle.length : alle.filter(u => u.typ === t).length;
  ersetzeWennNeu($('umsFilter'), filterUms + JSON.stringify(FILTER.map(([t]) => anzahl(t))), box => {
    FILTER.forEach(([t, name]) => {
      const n = anzahl(t); if (!n && t !== 'alle' && t !== filterUms) return;
      const c = knopf('chip', name, () => { filterUms = t; male(); }); c.append(el('span', 'anz', String(n)));
      c.setAttribute('aria-pressed', t === filterUms ? 'true' : 'false'); box.append(c);
    });
  });
  const gefiltert = filterUms === 'alle' ? alle : alle.filter(u => u.typ === filterUms);
  ersetzeWennNeu($('umsTabelle'), filterUms + (hervorheben || '') + JSON.stringify(gefiltert.map(u => [u.zeit, u.fluss, u.titel])), tb => {
    gefiltert.forEach(u => {
      const tr = el('tr', 'statisch' + (hervorheben && u.zeit === hervorheben ? ' neu' : ''));
      const d = new Date(u.zeit), c1 = el('td', 'datum');
      c1.append(el('div', 't-titel', d.toLocaleDateString('de-DE', {day: '2-digit', month: '2-digit', year: 'numeric'})), el('div', 't-klein', d.toLocaleTimeString('de-DE', {hour: '2-digit', minute: '2-digit'}) + ' Uhr'));
      const n = el('div', 't-name'); const t = el('div'); t.append(el('div', 't-titel', u.titel), el('div', 't-klein', u.symbol ? papierVon(u.symbol).name : u.typ === 'einzahlung' ? 'Paperdepot' : 'Simuliert'));
      n.append(umsatzIcon(u), t);
      const c2 = el('td'); c2.append(n);
      const c3 = el('td', 't-klein umbruch', u.detail || u.ziel || '');
      const c4 = el('td', 'r'); c4.append(el('span', 't-titel' + (u.fluss > 0 ? ' up' : ''), vz(u.fluss)));
      tr.append(c1, c2, c3, c4); tb.append(tr);
    });
    if (!gefiltert.length) { const tr = el('tr', 'statisch'); const td = el('td', 'leer', 'Keine Transaktionen in dieser Auswahl.'); td.colSpan = 4; tr.append(td); tb.append(tr); }
  });
}

/* ---------- Aktienanalyse (Score, Signale, Analysten) ---------- */
const TON_FARBE = {up: 'var(--up)', down: 'var(--down)', flat: 'var(--ink-2)'};
const EMPF = [['Stark kaufen', '#1fb14c'], ['Kaufen', '#30d158'], ['Halten', '#8e8e93'], ['Verkaufen', '#ff8a80'], ['Stark verk.', '#ff5b50']];
const analyseVon = s => ((stand && stand.analyse) || {})[s] || null;
const analyseDetail = {}, analyseZeit = {};
const pct1 = v => (v > 0.05 ? '+' : v < -0.05 ? '−' : '') + ZAHL1.format(Math.abs(v)) + ' %';
async function ladeAnalyse(s) {
  if (!s) return;
  analyseZeit[s] = Date.now();
  try { analyseDetail[s] = await (await fetch('/analyse?symbol=' + encodeURIComponent(s))).json(); male(); } catch (e) {}
}
function scoreRing(score, ton, klein) {
  const g = klein ? 46 : 118, sw = klein ? 5 : 10, r = (g - sw) / 2, C = 2 * Math.PI * r;
  const box = el('div', 'ring' + (klein ? ' klein' : ''));
  const svg = svgEl('svg', {viewBox: '0 0 ' + g + ' ' + g, width: g, height: g, 'aria-hidden': 'true'}, box);
  svgEl('circle', {cx: g / 2, cy: g / 2, r, fill: 'none', 'stroke-width': sw}, svg).style.stroke = 'var(--karte-3)';
  const fg = svgEl('circle', {cx: g / 2, cy: g / 2, r, fill: 'none', 'stroke-width': sw, 'stroke-linecap': 'round',
    'stroke-dasharray': (score / 100 * C) + ' ' + C, transform: 'rotate(-90 ' + g / 2 + ' ' + g / 2 + ')'}, svg);
  fg.style.stroke = TON_FARBE[ton];
  const z = el('div', 'zahl', String(score)); if (!klein) z.append(el('small', null, 'von 100'));
  box.append(z); box.setAttribute('title', 'Score ' + score + ' von 100');
  return box;
}
const badge = (a, klein) => el('span', 'badge ' + a.ton + (klein ? ' klein' : ''), a.urteil);
function teilScores(a) {
  const t = el('div', 'teil-scores');
  const teil = (name, v) => { const s = el('span', null, name + ' '); s.append(el('b', null, v == null ? '–' : String(v))); t.append(s); };
  teil('Technik', a.technik); teil('Analysten', a.analysten_score);
  if (a.bewertung != null) teil('Bewertung', typeof a.bewertung === 'object' ? a.bewertung.score : a.bewertung);
  if (a.potenzial != null) { const s = el('span', null, 'Kursziel '); s.append(el('b', a.potenzial >= 0 ? 'up' : 'down', pct1(a.potenzial))); t.append(s); }
  return t;
}
function gruendeListe(a, n) {
  const ul = el('ul', 'gruende');
  (a.pro || []).slice(0, n).forEach(t => ul.append(el('li', 'pro', t)));
  (a.contra || []).slice(0, n).forEach(t => ul.append(el('li', 'contra', t)));
  return ul;
}
function meter(p) {
  const m = el('div', 'meter'); m.setAttribute('aria-label', (p > 0 ? '+' : '') + p + ' Punkte');
  for (let i = -2; i <= 2; i++) {
    const an = p === 0 ? i === 0 : p > 0 ? i > 0 && i <= p : i < 0 && i >= p;
    m.append(el('i', an ? 'an ' + (p > 0 ? 'up' : p < 0 ? 'down' : 'flat') : null));
  }
  return m;
}
function empfehlungen(werte) {
  const box = el('div'), summe = werte.reduce((a, b) => a + b, 0) || 1;
  const bar = el('div', 'empf'), leg = el('div', 'empf-leg');
  werte.forEach((v, i) => {
    if (v) { const s = el('i'); s.style.flex = v / summe; s.style.background = EMPF[i][1]; s.title = EMPF[i][0] + ': ' + v; bar.append(s); }
    const l = el('div'); l.append(el('b', null, String(v)), document.createTextNode(EMPF[i][0])); leg.append(l);
  });
  box.style.cssText = 'display:grid;gap:10px'; box.append(bar, leg);
  return box;
}
function kursziel(an) {
  const box = el('div', 'ziel');
  if (!an || !an.kursziel || !an.kurs) return box;
  const lo = Math.min(an.kursziel_tief || an.kurs, an.kurs), hi = Math.max(an.kursziel_hoch || an.kursziel, an.kurs);
  const pos = v => ((v - lo) / ((hi - lo) || 1) * 100) + '%';
  const w = an.waehrung === 'EUR' ? '€' : ' ' + (an.waehrung || 'USD');
  const f = v => ZAHL2.format(v) + w;
  const pot = (an.kursziel / an.kurs - 1) * 100;
  const kopf = el('div', 'zeile'); kopf.style.cssText = 'border:0;padding:0';
  kopf.append(el('div', 'k', 'Kursziel Ø ' + f(an.kursziel)), el('div', 'w ' + (pot >= 0 ? 'up' : 'down'), pct1(pot) + ' Potenzial'));
  const spur = el('div', 'ziel-spur');
  [[an.kurs, 'var(--ink)', 'Kurs heute ' + f(an.kurs)], [an.kursziel, 'var(--akzent-hell)', 'Kursziel Ø ' + f(an.kursziel)]].forEach(([v, farbe, t]) => {
    const i = el('i'); i.style.left = pos(v); i.style.background = farbe; i.title = t; spur.append(i);
  });
  const skala = el('div', 'ziel-skala');
  skala.append(el('span', null, 'tief ' + f(an.kursziel_tief || lo)), (() => { const l = el('span'); l.innerHTML = '<span style="color:var(--ink)">●</span> heute &nbsp;<span style="color:var(--akzent-hell)">●</span> Ø Ziel'; return l; })(), el('span', null, 'hoch ' + f(an.kursziel_hoch || hi)));
  box.append(kopf, spur, skala);
  return box;
}
function kennzahl(box, name, wert, klasse) { const k = el('div', 'kz'); k.append(el('span', null, name), el('b', klasse || '', wert)); box.append(k); }
function bewertungKarte(a) {
  const c = el('div', 'an-karte'), b = a.bewertung;
  const kopf = el('div', 'panel-kopf'); kopf.style.margin = '0';
  kopf.append(el('h3', null, 'Bewertung'), b ? el('span', 'badge klein ' + (b.score >= 58 ? 'up' : b.score < 42 ? 'down' : 'flat'), b.score >= 58 ? 'günstig' : b.score < 42 ? 'teuer' : 'fair') : el('span'));
  c.append(kopf);
  if (!b) { c.append(el('p', 'leer', 'Keine Bewertungsdaten verfügbar. Der Score stützt sich auf Technik und Analysten.')); return c; }
  const liste = el('div');
  b.teile.forEach(x => {
    const z = el('div', 'signal'); const t = el('div', 's-text'); t.append(el('b', 's-wert', x.wert), document.createTextNode(' · ' + x.text));
    z.append(el('div', 's-name', x.name), meter(x.punkte), t); liste.append(z);
  });
  c.append(liste, el('p', 'an-hinweis', 'Bewertungs-Score ' + b.score + ' von 100. Eine teure Aktie kann trotzdem steigen; die Bewertung bremst nur den Gesamt-Score.'));
  return c;
}
function backtestKarte(a) {
  const c = el('div', 'an-karte'), bt = a.backtest;
  const kopf = el('div', 'panel-kopf'); kopf.style.margin = '0';
  kopf.append(el('h3', null, 'Backtest'), el('span', 't-klein', bt ? datum(bt.von) + ' bis ' + datum(bt.bis) : ''));
  c.append(kopf);
  if (!bt) { c.append(el('p', 'leer', 'Für einen Backtest braucht es rund 300 Tageskurse.')); return c; }
  const tab = el('div', 'bt-tabelle');
  tab.append(el('span', 'bt-k', ''), el('span', 'bt-k', 'Signale'), el('span', 'bt-k', 'Ø nach 1 Monat'), el('span', 'bt-k', 'Ø nach 3 Monaten'));
  const zelle = v => el('b', v == null ? '' : v >= 0 ? 'up' : 'down', v == null ? '–' : pct1(v));
  [['Buy the Dip', bt.dip, 'chance'], ['Technik-Score ≥ 70', bt.score, ''], ['Fallendes Messer', bt.messer, 'messer'], ['Jeden Tag kaufen', bt.immer, 'basis']].forEach(([name, x, cls]) => {
    const n = el('span', 'bt-name ' + cls, name);
    tab.append(n, el('span', null, cls === 'basis' ? '–' : String(x.anzahl)), zelle(x.r20), zelle(x.r60));
  });
  const d = bt.dip, fazit = d.r60 == null || !d.n60 ? 'Zu wenige abgeschlossene Signale für ein Fazit.'
    : d.r60 > bt.immer.r60 ? 'Buy-the-Dip-Käufe lagen nach 3 Monaten im Schnitt ' + ZAHL1.format(d.r60 - bt.immer.r60) + ' Prozentpunkte vor einem Kauf an einem beliebigen Tag (' + d.plus60 + ' von ' + d.n60 + ' im Plus).'
    : 'Buy-the-Dip-Käufe lagen nach 3 Monaten im Schnitt ' + ZAHL1.format(bt.immer.r60 - d.r60) + ' Prozentpunkte hinter einem Kauf an einem beliebigen Tag. Bei dieser Aktie hat die Regel nicht geholfen.';
  c.append(tab, el('p', 'dip-text', fazit), el('p', 'an-hinweis', 'Signale aus Kursen allein (Analystenmeinungen von damals sind unbekannt), mindestens 15 Tage Abstand. Grüne Punkte im Kurs-Chart zeigen die Buy-the-Dip-Tage. Wenige Signale: vorsichtig deuten, vergangene Ergebnisse sind keine Garantie.'));
  return c;
}
function zeichneAnalyseChart(box, reihe, marker = []) {
  box.textContent = '';
  const W = box.clientWidth, H = box.clientHeight || 230;
  if (!W || reihe.length < 2) { box.append(el('div', 'platzhalter', 'Noch zu wenig Tageskurse für den Chart.')); return; }
  const m = {t: 10, r: W >= 480 ? 64 : 8, b: 24, l: 4}, iw = W - m.l - m.r, ih = H - m.t - m.b;
  const alle = reihe.flatMap(p => [p.k, p.s50, p.s200]).filter(v => v != null);
  let lo = Math.min(...alle), hi = Math.max(...alle); const pad = (hi - lo) * 0.06; lo -= pad; hi += pad;
  const x = i => m.l + i / (reihe.length - 1) * iw, y = v => m.t + (1 - (v - lo) / (hi - lo)) * ih;
  const svg = svgEl('svg', {viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img', 'aria-label': 'Kurs mit 50- und 200-Tage-Linie'}, box);
  const st = schrittweite((hi - lo) / 4);
  for (let k = Math.ceil(lo / st); k * st <= hi; k++) {
    const yy = y(k * st);
    svgEl('line', {x1: m.l, x2: m.l + iw, y1: yy, y2: yy, 'stroke-width': 1}, svg).style.stroke = '#1a1a1d';
    if (m.r > 10) svgEl('text', {x: W - m.r + 12, y: yy + 4}, svg).textContent = ZAHL0.format(k * st) + ' €';
  }
  for (let k = 0; k < 4; k++) {
    const i = Math.round(k * (reihe.length - 1) / 3);
    const t = svgEl('text', {x: x(i), y: H - 4, 'text-anchor': k === 0 ? 'start' : k === 3 ? 'end' : 'middle'}, svg);
    t.textContent = new Date(reihe[i].d + 'T12:00:00').toLocaleDateString('de-DE', {month: 'short', year: '2-digit'});
  }
  [['s200', '#b48cff', 2, '6 5'], ['s50', '#64a8ff', 2, null], ['k', '#f2a24e', 2.6, null]].forEach(([key, farbe, sw, dash]) => {
    let d = '', an = false;
    reihe.forEach((p, i) => { if (p[key] == null) { an = false; return; } d += (an ? 'L' : 'M') + x(i).toFixed(1) + ',' + y(p[key]).toFixed(1); an = true; });
    if (!d) return;
    const pfad = svgEl('path', {d, fill: 'none', 'stroke-width': sw, 'stroke-linejoin': 'round', 'stroke-linecap': 'round'}, svg);
    pfad.style.stroke = farbe; if (dash) pfad.setAttribute('stroke-dasharray', dash);
  });
  const index = new Map(reihe.map((p, i) => [p.d, i]));
  marker.forEach(d => {
    const i = index.get(d); if (i == null) return;
    const c = svgEl('circle', {cx: x(i), cy: y(reihe[i].k), r: 5.5, 'stroke-width': 2.5}, svg);
    c.style.fill = 'var(--up)'; c.style.stroke = 'var(--karte)';
    const t = svgEl('title', {}, c); t.textContent = 'Buy-the-Dip-Signal ' + datum(d);
  });
}
function maleAnalyseWert(s) {
  const box = $('wpAnalyse'), a = analyseDetail[s], k = analyseVon(s);
  $('wpAnalyseStand').textContent = a && a.ok ? 'Tageskurse: ' + (a.quelle_kurse || '–') + (a.analysten ? ' · Analysten: ' + a.analysten.quelle : '') : '';
  const sig = JSON.stringify([s, a && a.ok && [a.score, a.kennzahlen.stand, a.signale.map(x => x.punkte), Math.round(a.kennzahlen.kurs * 100)], k && k.score, box.clientWidth]);
  ersetzeWennNeu(box, sig, b => {
    if (!a || !a.ok) { b.append(el('p', 'leer', (a && a.text) || (k && k.text) || 'Analyse wird geladen …')); return; }
    const raster = el('div', 'an-raster'); b.append(raster);
    raster.append(dipKarte({...a, symbol: s}));
    // Gesamturteil
    const c1 = el('div', 'an-karte');
    const kopf = el('div', 'urteil-kopf'), rechts = el('div');
    rechts.append(el('div', 't-klein', 'Einschätzung für einen Kauf heute'), badge(a), teilScores(a));
    rechts.firstChild.style.marginBottom = '8px';
    kopf.append(scoreRing(a.score, a.ton), rechts);
    c1.append(kopf, gruendeListe(a, 2),
      el('p', 'an-hinweis', 'Score = 45 % Technik (' + a.signale.filter(x => !x.info).length + ' Indikatoren aus ' + a.kennzahlen.tage + ' Tageskursen, gewichtet nach Trendstärke) + 35 % Analysten (Empfehlung, Kursziel, Gewinnrevisionen) + 20 % Bewertung (KGV, PEG, Free Cashflow). Ab 58 „Eher kaufen“, ab 70 „Kaufen“, unter 42 „Eher abwarten“.'));
    // Analysten
    const c2 = el('div', 'an-karte'), an = a.analysten;
    if (an && k && k.empfehlung) {
      const n = k.empfehlung.reduce((x, y) => x + y, 0);
      const rv = el('div', 'zeile'); rv.style.cssText = 'border:0;padding:0';
      rv.append(el('div', 'k', 'Gewinnschätzungen, 30 Tage'), el('div', 'w', (an.rev_hoch ?? '–') + ' angehoben · ' + (an.rev_runter ?? '–') + ' gesenkt'));
      c2.append(el('h3', null, 'Analysten · ' + n + ' Meinungen'), empfehlungen(k.empfehlung), kursziel(an), rv,
        el('p', 'an-hinweis', 'Quelle: ' + an.quelle + ', Stand ' + datum(an.stand) + '. Kursziel in Handelswährung ' + (an.waehrung || 'USD') + ', das Potenzial gilt auch in Euro.'));
    } else c2.append(el('h3', null, 'Analysten'), el('p', 'leer', a.hinweis_analysten || 'Keine Analystendaten verfügbar. Der Score stützt sich nur auf die Technik.'));
    // Indikatoren
    const c3 = el('div', 'an-karte');
    const ik = el('div', 'panel-kopf'); ik.style.margin = '0'; ik.append(el('h3', null, 'Indikatoren'), el('span', 't-klein', 'Punkte −2 bis +2'));
    const liste = el('div');
    a.signale.forEach(x => {
      const z = el('div', 'signal');
      const t = el('div', 's-text'); t.append(el('b', 's-wert', x.wert), document.createTextNode(' · ' + x.text));
      z.append(el('div', 's-name', x.name), x.info ? el('span', 'info-tag', 'Gewichtung') : meter(x.punkte), t);
      liste.append(z);
    });
    c3.append(ik, liste);
    // Chart und Kennzahlen
    const c4 = el('div', 'an-karte'), kz = a.kennzahlen;
    const c4kopf = [];
    const ck = el('div', 'panel-kopf'); ck.style.margin = '0';
    const leg = el('div', 'legende'); leg.innerHTML = '<span><i style="background:#f2a24e"></i>Kurs</span><span><i style="background:#64a8ff"></i>SMA 50</span><span><i style="background:#b48cff"></i>SMA 200</span>';
    ck.append(el('h3', null, 'Kurs, 1 Jahr'), leg);
    if (kz.zahlen) c4kopf.push(el('p', 'an-hinweis' + (kz.bis_zahlen != null && kz.bis_zahlen <= 7 ? ' warnung' : ''), 'Nächste Quartalszahlen: ' + datum(kz.zahlen) + (kz.bis_zahlen != null ? ' (in ' + kz.bis_zahlen + ' Tagen)' : '')));
    const chart = el('div', 'an-chart');
    const kzBox = el('div', 'kennzahlen');
    const pk = v => v == null ? '–' : pct1(v), rk = v => v == null ? '' : v >= 0 ? 'up' : 'down';
    kennzahl(kzBox, 'Performance 1 Monat', pk(kz.r1m), rk(kz.r1m));
    kennzahl(kzBox, 'Performance 3 Monate', pk(kz.r3m), rk(kz.r3m));
    kennzahl(kzBox, 'Performance 1 Jahr', pk(kz.r1j), rk(kz.r1j));
    kennzahl(kzBox, '52 Wochen Hoch', geld(kz.hoch52));
    kennzahl(kzBox, 'Abstand zum Hoch', pk(kz.vom_hoch), rk(kz.vom_hoch));
    kennzahl(kzBox, 'Volatilität 30 T.', kz.vola == null ? '–' : ZAHL1.format(kz.vola) + ' % p. a.');
    kennzahl(kzBox, 'MSCI World 3 Monate', pk(kz.markt_3m), rk(kz.markt_3m));
    kennzahl(kzBox, 'Gewinnschätzungen', a.revisionen == null ? '–' : a.revisionen > 0.2 ? 'steigen' : a.revisionen < -0.2 ? 'sinken' : 'stabil', a.revisionen == null ? '' : a.revisionen > 0.2 ? 'up' : a.revisionen < -0.2 ? 'down' : '');
    kennzahl(kzBox, '52 Wochen Tief', geld(kz.tief52));
    c4.append(ck, chart, kzBox, ...c4kopf);
    raster.append(c1, c2, c3, c4, bewertungKarte(a), backtestKarte(a));
    requestAnimationFrame(() => zeichneAnalyseChart(chart, a.chart || [], a.backtest ? a.backtest.dip.tage : []));
  });
}
function aktienAnalyseListe(box) {
  const uni = stand.universum || [];
  uni.forEach(u => {
    const a = analyseVon(u.symbol) || {}, q = quote(u.symbol), z = zeileVon(u.symbol);
    const b = knopf('aktie-zeile', null, () => { zeigeSeite('wert', u.symbol); setTimeout(() => $('wpAnalyseBlock').scrollIntoView({behavior: 'smooth', block: 'start'}), 120); });
    const m = el('div', 'r-mitte'); m.append(mitZeichen(el('div', 't-titel', u.name), u.symbol), el('div', 't-klein', (q.last ? geld(q.last) : '–') + (z ? ' · im Depot' : '')));
    b.append(logo(u.symbol), m);
    if (a.ok) {
      const t = el('div'); t.append(badge(a, true));
      const mini = el('div', 'mini nur-gross');
      mini.innerHTML = 'Technik <b>' + (a.technik ?? '–') + '</b> · Analysten <b>' + (a.analysten_score ?? '–') + '</b>' + (a.potenzial != null ? '<br>Kursziel <b>' + pct1(a.potenzial) + '</b>' : '');
      b.append(scoreRing(a.score, a.ton, true), t, mini);
      t.classList.add('nur-gross');
    } else b.append(el('span', 't-klein', a.text || 'lädt …'), el('span'), el('span', 'nur-gross'));
    b.insertAdjacentHTML('beforeend', ICON.chev.replace('<svg', '<svg class="chev"'));
    box.append(b);
  });
}
const DIP = {
  chance: {name: 'Buy the Dip', icon: I('<path d="M3 5l6 9 4-4 8 8"/><path d="M21 12v6h-6" opacity=".35"/><path d="M13 10l8-6"/><path d="M16 4h5v5"/>', 2.4)},
  beobachten: {name: 'Rücksetzer', icon: I('<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>', 2.2)},
  messer: {name: 'Fallendes Messer', icon: I('<path d="M3 5l6 6 4-4 8 8"/><path d="M21 10v5h-5"/>', 2.6)},
};
const dipVon = s => { const a = analyseVon(s); return a && a.ok && a.dip && a.dip.status ? a.dip : null; };
function dipZeichen(s, mitText) {                            // kleines Zeichen neben dem Namen
  const d = dipVon(s); if (!d) return null;
  const z = el('span', 'dip-zeichen ' + d.status + (mitText ? ' text' : ''));
  z.innerHTML = DIP[d.status].icon;
  if (mitText) z.append(el('span', null, DIP[d.status].name + ' · ' + pct1(d.rueckgang)));
  z.title = DIP[d.status].name + ': ' + pct1(d.rueckgang) + ' vom 20-Tage-Hoch. ' + (d.text || '');
  return z;
}
function mitZeichen(titelEl, s) { const z = dipZeichen(s); if (z) titelEl.append(z); return titelEl; }
function dipKarte(a) {
  const c = el('div', 'an-karte voll dip-karte' + (a.dip && a.dip.status ? ' ' + a.dip.status : ''));
  const d = a.dip || {};
  const kopf = el('div', 'panel-kopf'); kopf.style.margin = '0';
  const h = el('h3', null, 'Buy the Dip'); kopf.append(h);
  if (!d.status) {
    kopf.append(el('span', 't-klein', 'kein Rücksetzer'));
    c.append(kopf, el('p', 'an-hinweis', d.rueckgang == null ? 'Zu wenig Daten.' :
      'Kurs ' + pct1(d.rueckgang) + ' vom 20-Tage-Hoch. Als Rücksetzer gilt ab ' + ZAHL1.format(d.schwelle) + ' % (je nach Schwankung der Aktie). Du bekommst eine Mitteilung, sobald es so weit ist.'));
    return c;
  }
  kopf.append(dipZeichen(a.symbol || gewaehlt, true));
  const oben = el('div', 'dip-oben');
  const gross = el('div', 'dip-gross'); gross.append(el('b', 'down', pct1(d.rueckgang)), el('span', null, 'vom 20-Tage-Hoch ' + geld(d.hoch20)));
  oben.append(gross, el('p', 'dip-text', d.text));
  const liste = el('div', 'dip-pruef');
  d.pruef.forEach(p => {
    const z = el('div', 'dip-p ' + (p.ok ? 'ok' : 'nein'));
    const i = el('span', 'dip-i', p.ok ? '✓' : '✕');
    const t = el('div'); t.append(el('b', null, p.name), el('span', null, p.text));
    z.append(i, t); liste.append(z);
  });
  c.append(kopf, oben, liste);
  if (d.zone) c.append(el('p', 'an-hinweis', 'Nachkauf-Zone bis zum 200-Tage-Schnitt: ' + geld(d.zone[1]) + ' bis ' + geld(d.zone[0]) + ' (20-Tage-Tief). Wer gestaffelt kauft, teilt den Betrag auf mehrere Käufe auf.'));
  if (d.warnung) { const w = el('p', 'an-hinweis warnung', d.warnung); c.append(w); }
  return c;
}

function pruefAnalyse(symbol, kauf, volumen) {
  const a = analyseVon(symbol);
  if (!a || !a.ok) return null;
  const box = el('div', 'pruef-analyse'), t = el('div', 't');
  t.innerHTML = (kauf ? 'Analyse zum Kauf: ' : 'Aktuelle Einschätzung: ') + '<b></b> · Technik ' + (a.technik ?? '–') + ', Analysten ' + (a.analysten_score ?? '–');
  t.querySelector('b').textContent = a.urteil;
  const grund = (a.score >= 50 ? a.pro : a.contra) || [];
  if (grund[0]) t.append(el('div', 't-klein', grund[0]));
  if (a.dip && a.dip.status) { const z = dipZeichen(symbol, true); const w = el('div'); w.style.marginTop = '6px'; w.append(z); t.append(w); }
  if (a.bis_zahlen != null && a.bis_zahlen >= 0 && a.bis_zahlen <= 7) {
    const w = el('div', 't-klein', 'Quartalszahlen in ' + a.bis_zahlen + ' Tagen: erhöhte Schwankung möglich.'); w.style.color = 'var(--akzent-hell)'; t.append(w);
  }
  if (kauf && volumen > 0) {                                 // Klumpenrisiko nach dem Kauf
    const z = zeileVon(symbol), anteil = ((z && z.wert) || 0) + volumen, gesamt = (stand.aktien || 0) + volumen;
    if (gesamt && anteil / gesamt > 0.4) {
      const w = el('div', 't-klein', 'Hinweis: ' + papierVon(symbol).name + ' wäre danach ' + ZAHL0.format(anteil / gesamt * 100) + '\u00a0% deiner Wertpapiere (Klumpenrisiko).');
      w.style.color = 'var(--akzent-hell)'; t.append(w);
    }
  }
  box.append(scoreRing(a.score, a.ton, true), t);
  return box;
}

/* ---------- Analytics ---------- */
function maleAnalytics() {
  const g = $('anGewinn'); g.textContent = vz(stand.gv); g.className = 'gross ' + richtung(stand.gv);
  deltaSetzen($('anRendite'), 0, stand.gvp, true);
  const pos = stand.zeilen || [];
  const auto = stand.auto_dip || {};
  $('anAutoText').textContent = auto.aktiv ? 'an · ' + geldKurz(auto.betrag) + ' je Signal' : 'aus';
  ersetzeWennNeu($('anAktien'), JSON.stringify((stand.universum || []).map(u => { const a = analyseVon(u.symbol) || {}; return [u.symbol, a.score, a.technik, a.analysten_score, quote(u.symbol).last, !!zeileVon(u.symbol), a.dip && a.dip.status]; })), aktienAnalyseListe);
  const dips = (stand.universum || []).map(u => [u, dipVon(u.symbol)]).filter(([, d]) => d);
  ersetzeWennNeu($('anDip'), JSON.stringify(dips.map(([u, d]) => [u.symbol, d.status, Math.round(d.rueckgang * 10), d.erfuellt])), box => {
    if (!dips.length) { box.append(el('p', 'leer', 'Gerade kein Rücksetzer bei deinen Watchlist-Aktien. Du bekommst eine Mitteilung, sobald einer auftaucht.')); return; }
    const reihenfolge = {chance: 0, beobachten: 1, messer: 2};
    dips.sort((a, b) => reihenfolge[a[1].status] - reihenfolge[b[1].status]).forEach(([u, d]) => {
      const b = knopf('dip-zeile ' + d.status, null, () => { zeigeSeite('wert', u.symbol); setTimeout(() => $('wpAnalyseBlock').scrollIntoView({behavior: 'smooth', block: 'start'}), 120); });
      const i = el('span', 'dip-gross-icon'); i.innerHTML = DIP[d.status].icon;
      const m = el('div', 'r-mitte'); m.append(el('div', 't-titel', u.name), el('div', 't-klein', d.text));
      const r = el('div', 'r-rechts'); r.append(el('div', 't-titel down', pct1(d.rueckgang)), el('div', 't-klein', d.erfuellt + ' von 4 Kriterien'));
      b.append(i, m, r); box.append(b);
    });
  });
  // Depotwert und Einzahlungen
  const pkt = verlaufAn.filter(p => p.g != null).map(p => ({t: p.t, v: p.w, v2: p.w - p.g}));
  const t = Date.parse(stand.zeit);
  if (!pkt.length || pkt[pkt.length - 1].t < t) pkt.push({t, v: stand.wert, v2: stand.eingezahlt});
  const box = $('anVerlauf'), W = box.clientWidth, z = pkt[pkt.length - 1];
  const sig = [pkt.length, pkt[0].t, z.t, z.v, z.v2, W].join('|');
  if (W && chartSig.an !== sig) {
    chartSig.an = sig;
    zeichneChart(box, pkt, {farbe: '#ffffff', zweite: true, achsen: true, basis: false, fmtY: v => ZAHL0.format(v) + ' €',
      tip: p => [[zeitText(p.t), 'wann'], ['Depotwert ' + geld(p.v), 'wieviel'], ['Eingezahlt ' + geld(p.v2), 'neben'], ['G/V ' + vz(p.v - p.v2), 'neben ' + richtung(p.v - p.v2)]],
      leer: 'Der Verlauf entsteht, sobald während der Handelszeit ein paar Stände aufgezeichnet sind.'});
  }
  // Aufteilung
  const segs = pos.filter(z => z.wert > 0).sort((a, b) => b.wert - a.wert).map((z, i) => ({name: z.name, v: z.wert, farbe: FARBEN[i % FARBEN.length]}));
  if (stand.cash > 0.005) segs.push({name: 'Cash', v: stand.cash, farbe: '#4a4a50'});
  const summe = segs.reduce((s, x) => s + x.v, 0);
  $('anAufteilungInfo').textContent = segs.length + ' Bestandteile';
  ersetzeWennNeu($('anDonut'), JSON.stringify(segs.map(s => [s.name, Math.round(s.v)])), b => donut(b, segs, summe));
  // Gewinn/Verlust je Position
  const gvs = pos.filter(z => z.gv != null).sort((a, b) => b.gv - a.gv);
  const maxAbs = Math.max(1, ...gvs.map(z => Math.abs(z.gv)));
  ersetzeWennNeu($('anBalken'), JSON.stringify(gvs.map(z => [z.symbol, Math.round(z.gv * 100)])), b => {
    if (!gvs.length) { b.append(el('p', 'leer', 'Noch keine Positionen.')); return; }
    gvs.forEach(z => {
      const r = el('div', 'gv-reihe'); const spur = el('div', 'gv-spur'); const i = el('i');
      const breite = Math.abs(z.gv) / maxAbs * 50;
      i.style.width = breite + '%'; i.style.left = (z.gv >= 0 ? 50 : 50 - breite) + '%';
      i.style.background = z.gv >= 0 ? 'var(--up)' : 'var(--down)';
      spur.append(i);
      const v = el('div', 'v'); const a = el('div', richtung(z.gv), vz(z.gv)); a.style.fontWeight = '800';
      v.append(a, el('div', 't-klein', vzp(z.gvp)));
      r.append(el('div', 'n', z.name), spur, v); b.append(r);
    });
  });
}
function donut(box, segs, summe) {
  if (!segs.length || summe <= 0) { box.append(el('p', 'leer', 'Noch nichts investiert.')); return; }
  const R = 74, SW = 22, C = 2 * Math.PI * R;
  const svg = svgEl('svg', {viewBox: '0 0 190 190', width: 190, height: 190, class: 'donut', role: 'img', 'aria-label': 'Aufteilung des Depots'}, box);
  const ringe = [];
  let off = 0;
  segs.forEach(s => {
    const anteil = s.v / summe, len = Math.max(0.5, anteil * C - (segs.length > 1 ? 3 : 0));
    const c = svgEl('circle', {cx: 95, cy: 95, r: R, fill: 'none', 'stroke-width': SW, 'stroke-dasharray': len + ' ' + (C - len), 'stroke-dashoffset': -off, transform: 'rotate(-90 95 95)'}, svg);
    c.style.stroke = s.farbe; ringe.push(c); off += anteil * C;
  });
  const k = svgEl('text', {x: 95, y: 88, 'text-anchor': 'middle', class: 'dk'}, svg); k.textContent = 'Gesamt';
  const w = svgEl('text', {x: 95, y: 110, 'text-anchor': 'middle', class: 'dw'}, svg); w.textContent = GELD0.format(summe);
  const leg = el('div', 'd-leg');
  const hervor = i => {
    ringe.forEach((r, j) => { r.style.opacity = i == null || i === j ? '1' : '.25'; r.setAttribute('stroke-width', i === j ? SW + 4 : SW); });
    k.textContent = i == null ? 'Gesamt' : segs[i].name.slice(0, 16);
    w.textContent = i == null ? GELD0.format(summe) : ZAHL1.format(segs[i].v / summe * 100) + ' %';
  };
  segs.forEach((s, i) => {
    const z = el('div', 'd-zeile'); const dot = el('i'); dot.style.background = s.farbe;
    z.append(dot, el('span', 'n', s.name), el('span', 'p', ZAHL1.format(s.v / summe * 100) + ' %'), el('span', 'e', geld(s.v)));
    z.onmouseenter = () => hervor(i); z.onmouseleave = () => hervor(null);
    ringe[i].addEventListener('mouseenter', () => hervor(i)); ringe[i].addEventListener('mouseleave', () => hervor(null));
    leg.append(z);
  });
  box.append(leg);
}

/* ---------- Wertpapier ---------- */
function maleWert() {
  const s = gewaehlt, papier = papierVon(s), z = zeileVon(s), q = quote(s);
  ersetzeWennNeu($('wpLogo'), s, box => box.append(logo(s, 'gross')));
  $('wpName').textContent = papier.name;
  ersetzeWennNeu($('wpDip'), JSON.stringify([s, dipVon(s)]), box => { const z = dipZeichen(s, true); if (z) box.append(z); });
  const kurs = q.last || (z && z.kurs) || null;
  flacker($('wpKurs'), kurs, s);
  $('wpKurs').textContent = kurs ? geld(kurs) : '–';
  $('wpGeldBrief').textContent = (q.bid || q.ask) ? 'Geld ' + (q.bid ? geld(q.bid) : '–') + ' · Brief ' + (q.ask ? geld(q.ask) : '–') + ' · ' + stand.handelsplatz : stand.handelsplatz;
  const daten = chartDaten('wp');
  if (kurs && daten.length >= 2) deltaSetzen($('wpDelta'), 0, (kurs - daten[0].v) / daten[0].v * 100, true);
  else { $('wpDelta').textContent = ''; }
  raumWpMalen();
  chartMalen('wp', daten);
  $('wpPos').textContent = z && z.wert != null ? geld(z.wert) : '–';
  const perf = $('wpPerf'); perf.dataset.basis = 'k-wert';
  if (z && z.gvp != null) perfText(perf, z.gvp, ZAHL2.format(Math.abs(z.gvp)) + ' %');
  else { perf.className = 'k-wert'; perf.textContent = '–'; }
  const an = analyseVon(s), sw = $('wpScoreWert');
  sw.textContent = an && an.ok ? an.score + ' · ' + an.urteil : '–'; sw.className = 'k-wert ' + (an && an.ok ? an.ton : '');
  maleAnalyseWert(s);
  maleAuftraege(s);
  $('wpInfo').textContent = (stand.infos || {})[s] || (papier.branche ? 'Branche: ' + papier.branche + '.' : 'Für dieses Wertpapier ist keine Beschreibung hinterlegt.');
  $('wpEntfernen').hidden = !!z || !!planVon(s);
  const plan = planVon(s);
  ersetzeWennNeu($('wpStats'), JSON.stringify([s, q, z && [z.anteile, z.einstand, z.investiert, z.gv], plan && [plan.betrag, plan.tag, plan.aktiv], stand.gebuehr]), k => {
    reihe(k, 'Geld / Brief', (q.bid ? geld(q.bid) : '–') + ' / ' + (q.ask ? geld(q.ask) : '–'));
    if (q.bid && q.ask) reihe(k, 'Spread', geld(q.ask - q.bid) + ' (' + ZAHL2.format((q.ask - q.bid) / q.ask * 100) + ' %)');
    reihe(k, 'ISIN', papier.isin || '–');
    reihe(k, 'Symbol', s);
    if (z) {
      reihe(k, 'Anteile', STK6.format(z.anteile));
      reihe(k, 'Kaufkurs Ø', geld(z.einstand));
      reihe(k, 'Investiert (inkl. Gebühren)', geld(z.investiert));
      if (z.gv != null) reihe(k, 'Gewinn / Verlust', vz(z.gv) + ' (' + vzp(z.gvp) + ')', richtung(z.gv));
    }
    reihe(k, 'Sparplan', plan ? geld(plan.betrag) + ' am ' + plan.tag + '.' + (plan.aktiv === false ? ' · pausiert' : '') : 'keiner');
    reihe(k, 'Ordergebühr', geld(stand.gebuehr));
  });
  const liste = umsaetze().filter(u => u.symbol === s);
  ersetzeWennNeu($('wpAktListe'), s + (hervorheben || '') + JSON.stringify(liste.map(u => [u.zeit, u.fluss])), box => {
    liste.forEach(u => box.append(umsatzReihe(u)));
    if (!liste.length) box.append(el('p', 'leer', 'Noch keine Orders für dieses Wertpapier.'));
  });
}

/* ---------- Aufträge und Alarme ---------- */
function auftragBeschreibung(a) {
  const menge = a.art === 'limit_kauf' ? geld(a.betrag) : a.alles ? 'ganze Position' : STK4.format(a.stueck) + ' Stück';
  const kurs = a.art === 'trailing' ? ZAHL1.format(a.abstand) + ' % unter Höchstkurs · Stopp jetzt ' + geld(a.stopp) : geld(a.limit);
  return [ART_NAME[a.art] + ' · ' + kurs, menge + ' · seit ' + zeitText(a.angelegt)];
}
function maleAuftraege(s) {
  const auftr = (stand.auftraege || []).filter(a => a.symbol === s), alarme = (stand.alarme || []).filter(a => a.symbol === s);
  ersetzeWennNeu($('wpAuftraege'), JSON.stringify([s, auftr, alarme]), box => {
    const weg = (pfadName, id, text) => { const b = knopf('s-icon klein-x', null, async () => { const r = await post(pfadName, {aktion: 'loeschen', id}); toast(r.text, !r.ok); tick(); }, text); b.innerHTML = ICON.zu; return b; };
    auftr.forEach(a => {
      const z = el('div', 'reihe statisch auftrag-zeile'), i = el('div', 'logo meld-icon ' + (a.art === 'limit_kauf' ? 'chance' : a.art === 'limit_verkauf' ? 'zahlen' : 'messer'));
      i.innerHTML = a.art === 'limit_kauf' ? ICON.plus : a.art === 'limit_verkauf' ? ICON.haken : DIP_ICON('messer');
      const [t, u] = auftragBeschreibung(a), m = el('div', 'r-mitte'); m.append(el('div', 'r-titel', t), el('div', 'r-unter', u));
      z.append(i, m, weg('/auftrag', a.id, 'Auftrag löschen')); box.append(z);
    });
    alarme.forEach(a => {
      const z = el('div', 'reihe statisch auftrag-zeile'), i = el('div', 'logo meld-icon zahlen'); i.innerHTML = MELD_ICON.alarm;
      const t = a.art === 'einschaetzung' ? 'Alarm: Einschätzung ändert sich' : 'Alarm: Kurs ' + (a.art === 'ueber' ? 'über ' : 'unter ') + geld(a.wert);
      const m = el('div', 'r-mitte'); m.append(el('div', 'r-titel', t), el('div', 'r-unter', a.art === 'einschaetzung' ? 'aktuell „' + (a.urteil || '…') + '“ · bleibt aktiv' : 'meldet sich einmal'));
      z.append(i, m, weg('/alarm', a.id, 'Alarm löschen')); box.append(z);
    });
    if (!auftr.length && !alarme.length) box.append(el('p', 'leer', 'Keine offenen Aufträge. Limit, Stop-Loss, Take-Profit und Trailing-Stop wählst du beim Kaufen oder Verkaufen unter „Orderart“.'));
  });
}
function screenAlarm(symbol) {
  return (body, nav) => {
    const k = quote(symbol).last;
    let art = 'unter';
    const arten = el('div', 'arten');
    const feld = el('div', 'preisfeld'), lab = el('label', null, 'Kurs in €'), input = el('input'), pz = el('div', 'preis-zeile');
    input.inputMode = 'decimal'; input.id = 'alarmKurs'; lab.htmlFor = input.id; pz.append(input, el('span', 'einheit', '€')); feld.append(lab, pz);
    const meldung = el('div', 'meldung');
    function malen() {
      arten.textContent = '';
      [['unter', 'Kurs fällt unter'], ['ueber', 'Kurs steigt über'], ['einschaetzung', 'Einschätzung ändert sich']].forEach(([a, t]) => {
        const b = knopf('art-chip', t, () => { art = a; if (k && a !== 'einschaetzung') input.value = ZAHL2.format(k * (a === 'unter' ? 0.95 : 1.05)); malen(); });
        b.setAttribute('aria-pressed', art === a ? 'true' : 'false'); arten.append(b);
      });
      feld.hidden = art === 'einschaetzung';
    }
    if (k) input.value = ZAHL2.format(k * 0.95);
    malen();
    const los = knopfTI('knopf orange', 'Alarm anlegen', ICON.chev, async () => {
      const r = await post('/alarm', {art, symbol, wert: art === 'einschaetzung' ? null : zahlAus(input.value)});
      if (!r.ok) { meldung.textContent = r.text; meldung.className = 'meldung fehler'; return; }
      toast(r.text); await tick(); nav.zu();
    });
    body.append(kopfPapier(symbol), el('h1', 's-titel', 'Kursalarm'), el('div', 's-unter', k ? 'Aktuell ' + geld(k) : ''), arten, feld,
      el('p', 's-tipp', 'Du bekommst eine Mitteilung (Glocke, in der App und auf Wunsch am Desktop). Kursalarme melden sich einmal, der Alarm zur Einschätzung bleibt aktiv.'),
      meldung, fuss(el('span'), los));
    return {fokus: input, enter: () => los.click()};
  };
}
function screenAutoDip() {
  return (body, nav) => {
    const a = stand.auto_dip || {};
    let aktiv = !!a.aktiv;
    const monat = new Date().toISOString().slice(0, 7), ausgegeben = (a.ausgegeben || {})[monat] || 0;
    const schalter = knopf('schalter', null, () => { aktiv = !aktiv; malen(); });
    const betrag = Betragsfeld({cent: Math.round((a.betrag || 250) * 100), label: 'Betrag je Signal'});
    const grenze = el('input'); grenze.inputMode = 'decimal'; grenze.id = 'autoGrenze'; grenze.value = ZAHL0.format(a.max_monat || 1000);
    const gFeld = el('div', 'preisfeld'), gLab = el('label', null, 'Höchstens pro Monat'), gz = el('div', 'preis-zeile');
    gLab.htmlFor = grenze.id; gz.append(grenze, el('span', 'einheit', '€')); gFeld.append(gLab, gz);
    const meldung = el('div', 'meldung');
    function malen() { schalter.textContent = ''; schalter.append(el('span', null, aktiv ? 'An' : 'Aus')); schalter.setAttribute('aria-pressed', aktiv ? 'true' : 'false'); }
    malen();
    const speichern = knopfTI('knopf orange', 'Speichern', ICON.chev, async () => {
      const r = await post('/auto-dip', {aktiv, cent: betrag.cent(), max_monat: zahlAus(grenze.value)});
      if (!r.ok) { meldung.textContent = r.text; meldung.className = 'meldung fehler'; return; }
      toast(r.text); await tick(); nav.zu();
    });
    const kopf = el('div', 'zeile'); kopf.style.cssText = 'border:0;margin-top:14px'; kopf.append(el('div', 'k', 'Automatisch kaufen'), schalter);
    body.append(el('h1', 's-titel', 'Automatischer Dip-Kauf'), el('div', 's-unter', 'Kauft bei jedem Buy-the-Dip-Signal deiner Watchlist'), kopf,
      betrag.el, el('div', 'bf-unter', 'je Signal, zzgl. ' + geld(stand.gebuehr) + ' Gebühr'), gFeld,
      el('p', 's-tipp', 'Diesen Monat automatisch gekauft: ' + geld(ausgegeben) + '. Gekauft wird nur, wenn ein Signal neu entsteht, genug Cash da ist und die Monatsgrenze nicht überschritten wird. Jeder Kauf erscheint als Mitteilung.'),
      meldung, fuss(el('span'), speichern));
    return {fokus: schalter};
  };
}

/* ---------- Mehrere Depots ---------- */
function screenDepots() {
  return (body, nav) => {
    const liste = stand.depots || [];
    body.append(el('h1', 's-titel', 'Depots'), el('div', 's-unter', liste.length + (liste.length === 1 ? ' Depot' : ' Depots') + ' · antippen zum Wechseln'));
    const box = el('div', 'liste'); box.style.marginTop = '14px';
    liste.forEach(d => {
      const aktiv = d.id === stand.depot_id;
      const b = knopf('reihe depot-reihe' + (aktiv ? ' aktiv' : ''), null, async () => {
        if (aktiv) { nav.zu(); return; }
        const r = await post('/depots', {aktion: 'wechseln', id: d.id}); toast(r.text, !r.ok);
        if (r.ok) { nav.zu(); verlaufPf = []; verlaufAn = []; verlaufZeit = 0; await tick(); zeigeSeite('portfolio'); }
      });
      const l = el('div', 'logo', (d.titel || '?').charAt(0).toUpperCase()); l.style.background = aktiv ? 'var(--akzent)' : 'var(--karte-3)'; l.style.color = '#fff';
      const m = el('div', 'r-mitte'); m.append(el('div', 'r-titel', d.titel), el('div', 'r-unter', aktiv ? 'geöffnet · ' + geld(stand.wert) : d.wert != null ? 'zuletzt ' + geld(d.wert) : 'noch nicht geöffnet'));
      const r = el('div', 'r-rechts');
      const gv = aktiv ? stand.gv : d.gv;
      if (gv != null) r.append(el('div', 'r-betrag ' + richtung(gv), vz(gv)));
      b.append(l, m, r); box.append(b);
      if (!aktiv) {                                           // Löschen mit Nachfrage
        let sicher = false;
        const weg = knopf('textknopf rot depot-weg', 'Löschen', async e => {
          e.stopPropagation();
          if (!sicher) { sicher = true; weg.textContent = 'Wirklich „' + d.titel + '“ löschen?'; return; }
          const x = await post('/depots', {aktion: 'loeschen', id: d.id}); toast(x.text, !x.ok); await tick(); nav.stapel[nav.stapel.length - 1] = screenDepots(); nav.zeigen(false);
        });
        box.append(weg);
      }
    });
    body.append(box);
    const umbenennen = option(ICON.liste, 'Geöffnetes Depot umbenennen', () => nav.weiter(screenDepotName()), true);
    body.append(el('h3', null, 'Verwalten'), option(ICON.plus, 'Neues Depot anlegen', () => nav.weiter(screenDepotNeu()), true), umbenennen,
      el('p', 's-tipp', 'Jedes Depot hat eigenes Cash, eigene Positionen, Watchlist, Sparpläne, Aufträge und Mitteilungen. Kurse und Aufträge laufen nur im geöffneten Depot.'));
    return {};
  };
}
function screenDepotName() {
  return (body, nav) => {
    const f = el('div', 'feld'), l = el('label', null, 'Name'), i = el('input'); i.id = 'depotName'; l.htmlFor = i.id; i.value = stand.titel || ''; i.maxLength = 40; f.append(l, i);
    const meldung = el('div', 'meldung');
    const los = knopfTI('knopf orange', 'Speichern', ICON.chev, async () => {
      const r = await post('/depots', {aktion: 'umbenennen', id: stand.depot_id, titel: i.value});
      if (!r.ok) { meldung.textContent = r.text; meldung.className = 'meldung fehler'; return; }
      toast(r.text); await tick(); nav.zu();
    });
    i.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); los.click(); } });
    body.append(el('h1', 's-titel', 'Depot umbenennen'), f, meldung, fuss(el('span'), los));
    return {fokus: i};
  };
}
function screenDepotNeu() {
  return (body, nav) => {
    const positionen = [];                                   // {isin, name, symbol, yahoo, anteile, einstand}
    const nf = el('div', 'feld'), nl = el('label', null, 'Name'), name = el('input'); name.id = 'neuName'; nl.htmlFor = name.id;
    name.placeholder = 'z. B. Dividenden, Tech, Dip-Jäger'; name.maxLength = 40; nf.append(nl, name);
    const cash = Betragsfeld({cent: 1000000, label: 'Startguthaben in Euro'});
    const posBox = el('div', 'start-positionen');
    const such = el('div', 'suchfeld'); such.innerHTML = ICON.suche;
    const si = el('input'); si.type = 'search'; si.placeholder = 'Aktie für den Anfangsbestand suchen'; si.autocomplete = 'off'; such.append(si);
    const treffer = el('div', 'liste');
    const meldung = el('div', 'meldung'), summe = el('div', 's-info');
    function positionenMalen() {
      posBox.textContent = '';
      positionen.forEach((p, i) => {
        const z = el('div', 'start-pos');
        const kopf = el('div', 'start-kopf'); kopf.append(logo(p.symbol, 'klein'), el('b', null, p.name));
        const weg = knopf('s-icon klein-x', null, () => { positionen.splice(i, 1); positionenMalen(); }, 'Entfernen'); weg.innerHTML = ICON.zu; kopf.append(weg);
        const eingabe = (label, key, platz) => {
          const f = el('label', 'mini-feld'); f.append(el('span', null, label));
          const inp = el('input'); inp.inputMode = 'decimal'; inp.placeholder = platz; inp.value = p[key] != null ? String(p[key]).replace('.', ',') : '';
          inp.addEventListener('input', () => { p[key] = zahlAus(inp.value); rechnen(); }); f.append(inp); return f;
        };
        const reiheE = el('div', 'start-eingaben'); reiheE.append(eingabe('Stück', 'anteile', 'z. B. 10'), eingabe('Kaufkurs in €', 'einstand', 'z. B. 180,50'));
        z.append(kopf, reiheE); posBox.append(z);
      });
      rechnen();
    }
    function rechnen() {
      const inv = positionen.reduce((s_, p) => s_ + (p.anteile || 0) * (p.einstand || 0), 0);
      summe.textContent = positionen.length ? 'Anfangsbestände: ' + geld(inv) + ' · Depot startet mit ' + geld(inv + cash.cent() / 100) : '';
    }
    let nr = 0, uhr;
    si.addEventListener('input', () => { clearTimeout(uhr); uhr = setTimeout(async () => {
      const q = si.value.trim(), meins = ++nr; treffer.textContent = ''; if (!q) return;
      const d = await (await fetch('/suche?q=' + encodeURIComponent(q))).json(); if (meins !== nr) return;
      d.filter(t => !positionen.some(p => p.isin === t.isin)).slice(0, 5).forEach(t => {
        const b = knopf('reihe', null, () => {
          const k = quote(t.symbol).last;
          positionen.push({isin: t.isin, name: t.name, symbol: t.symbol, yahoo: t.yahoo, anteile: null, einstand: k ? Math.round(k * 100) / 100 : null});
          si.value = ''; treffer.textContent = ''; positionenMalen();
          const inputs = posBox.querySelectorAll('input'); if (inputs.length) inputs[inputs.length - 2].focus();
        });
        const m = el('div', 'r-mitte'); m.append(el('div', 'r-titel', t.name), el('div', 'r-unter', t.symbol + ' · ' + t.isin));
        const pl = el('span', 'plus-knopf'); pl.innerHTML = ICON.plus; const r = el('div', 'r-rechts'); r.append(pl);
        b.append(logo(t.symbol), m, r); treffer.append(b);
      });
    }, 180); });
    cash.input.addEventListener('input', rechnen);
    const los = knopfTI('knopf orange', 'Depot anlegen', ICON.chev, async () => {
      const unvollstaendig = positionen.find(p => !p.anteile || !p.einstand);
      if (unvollstaendig) { meldung.textContent = 'Bitte Stück und Kaufkurs für ' + unvollstaendig.name + ' angeben.'; meldung.className = 'meldung fehler'; return; }
      los.classList.add('laedt');
      const r = await post('/depots', {aktion: 'anlegen', titel: name.value, cent: cash.cent(), positionen});
      los.classList.remove('laedt');
      if (!r.ok) { meldung.textContent = r.text; meldung.className = 'meldung fehler'; return; }
      toast(r.text); nav.zu(); verlaufPf = []; verlaufAn = []; verlaufZeit = 0; await tick(); zeigeSeite('portfolio');
    });
    body.append(el('h1', 's-titel', 'Neues Depot'), el('div', 's-unter', 'Startguthaben und Anfangsbestände legst du selbst fest'), nf,
      el('div', 's-label', 'Startguthaben (Cash)'), cash.el,
      el('h3', null, 'Anfangsbestände (optional)'), el('p', 's-tipp', 'Aktien, die du schon „besitzt“: Stückzahl und dein Kaufkurs. Sie werden ohne Gebühr eingebucht; Gewinn und Verlust rechnen ab diesem Kaufkurs.'),
      posBox, such, treffer, summe, meldung, fuss(el('span'), los));
    rechnen();
    return {fokus: name, hoch: true};
  };
}

/* ---------- Wochenbericht ---------- */
function screenBericht() {
  return (body, nav) => {
    body.append(el('h1', 's-titel', 'Wochenbericht'), el('p', 'leer', 'Wird erstellt …'));
    fetch('/bericht').then(r => r.json()).then(b => {
      body.textContent = '';
      body.append(el('h1', 's-titel', 'Wochenbericht'), el('div', 's-unter', datum(b.von) + ' bis ' + datum(b.bis) + ' · ' + (stand.titel || '')));
      if (b.wert) {
        const g = el('div', 'bericht-gross'); g.append(el('b', richtung(b.wert.diff), vz(b.wert.diff)), el('span', null, (b.wert.pct != null ? vzp(b.wert.pct) + ' · ' : '') + 'Depot jetzt ' + geld(b.wert.jetzt)));
        body.append(g);
      }
      const abschnitt = (titel, kinder) => { body.append(el('h3', null, titel)); const k = el('div', 'karte'); kinder(k); body.append(k); };
      if (b.positionen.length) abschnitt('Deine Positionen diese Woche', k => b.positionen.forEach(p => reihe(k, p.name, vzp(p.pct) + ' · ' + vz(p.eur), richtung(p.pct))));
      abschnitt('Orders', k => {
        reihe(k, 'Käufe / Verkäufe', b.orders.kaeufe + ' / ' + b.orders.verkaeufe);
        reihe(k, 'davon automatisch', String(b.orders.automatisch));
        reihe(k, 'Volumen', geld(b.orders.volumen));
      });
      if (b.kaeufe.length) {
        abschnitt('Wie deine Käufe gelaufen sind', k => b.kaeufe.forEach(x => {
          const z = reihe(k, x.name + ' · ' + datum(x.zeit.slice(0, 10)) + (x.score != null ? ' · Score ' + x.score : ''), vzp(x.pct), richtung(x.pct));
          if (x.quelle && QUELLE_NAME[x.quelle]) z.firstChild.textContent += ' · ' + QUELLE_NAME[x.quelle];
        }));
        const v = b.vergleich;
        if (v.gut.anzahl || v.schwach.anzahl) body.append(el('p', 's-tipp', 'Käufe mit Score ab 58: ' + (v.gut.anzahl ? 'Ø ' + vzp(v.gut.pct) + ' (' + v.gut.anzahl + ')' : 'keine') +
          ' · Käufe darunter: ' + (v.schwach.anzahl ? 'Ø ' + vzp(v.schwach.pct) + ' (' + v.schwach.anzahl + ')' : 'keine') + '. Mit der Zeit zeigt das, ob die Einschätzung bei deinen Käufen etwas taugt.'));
      }
      abschnitt('Signale', k => {
        reihe(k, 'Signale diese Woche', String(b.signale.length));
        if (b.dips_jetzt.length) b.dips_jetzt.forEach(d => reihe(k, 'Jetzt Buy the Dip: ' + d.name, 'Score ' + d.score, 'up'));
        else reihe(k, 'Aktuelle Buy-the-Dip-Chancen', 'keine');
      });
    }).catch(() => { body.append(el('p', 'meldung fehler', 'Bericht konnte nicht geladen werden.')); });
    return {hoch: true};
  };
}

/* ---------- Rechte Leiste ---------- */
function flacker(e, wert, schluessel) {                    // Preis ändert sich: kurz grün/rot aufleuchten
  const alt = e.dataset.wert, altK = e.dataset.k;
  e.dataset.wert = wert == null ? '' : String(wert); e.dataset.k = schluessel;
  if (alt && altK === schluessel && wert != null && +alt !== wert) {
    e.classList.remove('tick-up', 'tick-down'); void e.offsetWidth; e.classList.add(wert > +alt ? 'tick-up' : 'tick-down');
  }
}
function berlinJetzt() {
  const teile = new Intl.DateTimeFormat('en-GB', {timeZone: 'Europe/Berlin', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false}).formatToParts(new Date());
  const g = t => (teile.find(p => p.type === t) || {}).value;
  return {wt: {Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6}[g('weekday')], min: (+g('hour') % 24) * 60 + +g('minute')};
}
const hm2min = s => { const [h, m] = String(s).split(':').map(Number); return h * 60 + m; };
function dauerText(min) { const h = Math.floor(min / 60), m = min % 60; return (h ? h + ' Std. ' : '') + m + ' Min.'; }
function maleMarktzeit(box) {
  const von = hm2min(stand.handel_von), bis = hm2min(stand.handel_bis), j = berlinJetzt();
  const offen = !!stand.offen;
  let text;
  if (offen) text = 'Schließt in ' + dauerText(Math.max(0, bis - j.min));
  else if (j.wt >= 1 && j.wt <= 5 && j.min < von) text = 'Öffnet heute um ' + stand.handel_von + ' Uhr';
  else if (j.wt === 5 || j.wt === 6) text = 'Öffnet Montag um ' + stand.handel_von + ' Uhr';
  else text = 'Öffnet morgen um ' + stand.handel_von + ' Uhr';
  const anteil = Math.max(0, Math.min(1, (j.min - von) / (bis - von)));
  const sig = [offen, text, Math.round(anteil * 200)].join('|');
  ersetzeWennNeu(box, sig, b => {
    const kopf = el('div', 'zeit-kopf'); const t = el('h3', null, stand.handelsplatz);
    const p = el('span', 'pill'); p.append(el('span', 'led' + (offen ? ' an' : '')), document.createTextNode(offen ? 'Handel offen' : 'Geschlossen'));
    kopf.append(t, p);
    const balken = el('div', 'zeit-balken'); const f = el('i'); f.style.width = (anteil * 100) + '%'; const m = el('b'); m.style.left = (anteil * 100) + '%';
    if (!offen) { f.style.background = 'var(--karte-3)'; m.style.background = 'var(--ink-3)'; }
    balken.append(f, m);
    const skala = el('div', 'zeit-skala'); skala.append(el('span', null, stand.handel_von), el('span', null, 'Mo–Fr'), el('span', null, stand.handel_bis));
    b.append(kopf, balken, skala, el('div', 'zeit-text', text));
  });
}
function sparkline(punkte, jetzt) {
  const w = 56, h = 26;
  const svg = svgEl('svg', {viewBox: '0 0 ' + w + ' ' + h, width: w, height: h, class: 'spark', 'aria-hidden': 'true'});
  const werte = punkte.map(p => p.k); if (jetzt) werte.push(jetzt);
  if (werte.length < 2) return svg;
  const lo = Math.min(...werte), hi = Math.max(...werte), sp = (hi - lo) || 1;
  const d = werte.map((v, i) => (i ? 'L' : 'M') + (i / (werte.length - 1) * w).toFixed(1) + ',' + (2 + (1 - (v - lo) / sp) * (h - 4)).toFixed(1)).join('');
  const p = svgEl('path', {d, fill: 'none', 'stroke-width': 1.8, 'stroke-linejoin': 'round', 'stroke-linecap': 'round'}, svg);
  p.style.stroke = werte[werte.length - 1] >= werte[0] ? 'var(--up)' : 'var(--down)';
  return svg;
}
function maleRail() {
  if (!istBreit()) return;
  $('navTitel').textContent = stand.titel || 'Musterdepot';
  $('navWatchZahl').textContent = (stand.universum || []).length;
  const aktiv = (stand.sparplaene || []).filter(p => p.aktiv !== false);
  $('navSparZahl').textContent = aktiv.length || '';
  if (seite !== 'wert') {
    $('rCashWert').textContent = geld(stand.cash);
    maleMarktzeit($('rZeit'));
    const uni = stand.universum || [];
    ersetzeWennNeu($('rWatch'), JSON.stringify(uni.map(u => [u.symbol, quote(u.symbol).last, (sparks[u.symbol] || []).length, (dipVon(u.symbol) || {}).status])), box => {
      uni.forEach(u => {
        const b = knopf('wl', null, () => zeigeSeite('wert', u.symbol));
        const sp = sparks[u.symbol] || [], k = quote(u.symbol).last;
        const m = el('div'); m.style.minWidth = '0'; m.append(mitZeichen(el('div', 'wl-name', u.name), u.symbol), el('div', 'wl-sym', u.symbol));
        const r = el('div', 'wl-rechts'); r.append(el('div', 'wl-preis', k ? geld(k) : '–'));
        if (sp.length && k) { const pct = (k - sp[0].k) / sp[0].k * 100; const e = el('div'); e.dataset.basis = 'wl-pct'; perfText(e, pct, ZAHL2.format(Math.abs(pct)) + ' %'); r.append(e); }
        b.append(logo(u.symbol), m, sparkline(sp, k), r); box.append(b);
      });
    });
    ersetzeWennNeu($('rSpar'), JSON.stringify((stand.sparplaene || []).map(p => [p.symbol, p.betrag, p.naechste, p.aktiv])), box => {
      const plaene = (stand.sparplaene || []).slice().sort((a, b) => a.naechste < b.naechste ? -1 : 1);
      if (!plaene.length) { box.append(el('p', 'leer', 'Noch keiner. Öffne ein Wertpapier und drücke S.')); return; }
      plaene.forEach(p => {
        const z = el('div', 'sp-zeile'); const m = el('div'); m.append(el('span', null, papierVon(p.symbol).name), el('span', 't-klein', p.aktiv === false ? 'pausiert' : 'nächste ' + new Date(p.naechste + 'T12:00:00').toLocaleDateString('de-DE', {day: '2-digit', month: '2-digit'})));
        z.append(logo(p.symbol, 'klein'), m, el('span', null, geld(p.betrag))); box.append(z);
      });
    });
  } else {
    maleMarktzeit($('rZeit2'));
    const plan = planVon(gewaehlt);
    ersetzeWennNeu($('rPlan'), JSON.stringify([gewaehlt, plan]), box => {
      const kopf = el('div', 'panel-kopf'); kopf.append(el('h3', null, 'Sparplan'));
      const text = plan ? geld(plan.betrag) + ' monatlich am ' + plan.tag + '.' + (plan.aktiv === false ? ' · pausiert' : ' · nächste ' + datum(plan.naechste))
        : 'Regelmäßig investieren – monatlich und automatisch zum Briefkurs.';
      const p = el('p', 'hero-klein', text); p.style.cssText = 'font-size:15px;margin-bottom:14px;line-height:1.5';
      const b = knopfTI('knopf hell breit klein', plan ? 'Sparplan bearbeiten' : 'Sparplan anlegen', ICON.wiederholen, () => Sheet.oeffnen(screenSparplan(gewaehlt)));
      box.append(kopf, p, b);
    });
  }
}

/* ================= Chart ================= */
function chartDaten(welcher) {
  const t = Date.parse(stand.zeit);
  if (welcher === 'pf') {
    const p = verlaufPf.filter(x => x.g != null).map(x => ({t: x.t, v: x.g, w: x.w}));
    if (!p.length || p[p.length - 1].t < t) p.push({t, v: stand.gv, w: stand.wert});
    return p;
  }
  const p = (verlaufWpSym === gewaehlt ? verlaufWp : []).map(x => ({t: x.t, v: x.k}));
  const k = quote(gewaehlt).last;
  if (k && (!p.length || p[p.length - 1].t < t)) p.push({t, v: k});
  return p;
}
function chartMalen(welcher, daten) {
  const box = $(welcher === 'pf' ? 'pfChart' : 'wpChart');
  const W = box.clientWidth; if (!W) return;
  const a = daten[0] || {}, z = daten[daten.length - 1] || {};
  const sig = [welcher === 'pf' ? raumPf : raumWp + gewaehlt, daten.length, a.t, z.t, z.v, W, box.clientHeight].join('|');
  if (chartSig[welcher] === sig) return;
  chartSig[welcher] = sig;
  if (welcher === 'pf') zeichneChart(box, daten, {farbe: '#ffffff', achsen: true, fmtY: vz0,
    tip: p => [[zeitText(p.t), 'wann'], [vz(p.v) + ' G/V', 'wieviel ' + richtung(p.v)], ['Gesamtwert ' + geld(p.w), 'neben']],
    leer: 'Der Verlauf entsteht, sobald während der Handelszeit ein paar Stände aufgezeichnet sind.'});
  else zeichneChart(box, daten, {farbe: 'var(--akzent-hell)', achsen: true, fmtY: v => geld(v),
    tip: p => [[zeitText(p.t), 'wann'], [geld(p.v), 'wieviel']],
    leer: 'Der Kursverlauf entsteht, sobald während der Handelszeit ein paar Kurse aufgezeichnet sind.'});
}
function schrittweite(roh) { const e = Math.pow(10, Math.floor(Math.log10(roh))), f = roh / e; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * e; }
function zeichneChart(box, punkte, o) {
  box.textContent = '';
  if (punkte.length < 2) { box.append(el('div', 'platzhalter', o.leer || 'Noch keine Daten.')); return; }
  const W = box.clientWidth, H = box.clientHeight || 240;
  const achsen = !!o.achsen && W >= 560;
  const m = achsen ? {t: 16, r: 82, b: 30, l: 4} : {t: 26, r: 10, b: 14, l: 10};
  const iw = W - m.l - m.r, ih = H - m.t - m.b;
  const alle = punkte.map(p => p.v).concat(o.zweite ? punkte.map(p => p.v2).filter(v => v != null) : []);
  let lo = Math.min(...alle), hi = Math.max(...alle);
  if (hi - lo < 1e-9) { lo -= 1; hi += 1; }
  if (achsen) { const pad = (hi - lo) * 0.08; lo -= pad; hi += pad; }
  const n = punkte.length;
  const x = i => m.l + i / (n - 1) * iw;
  const y = v => m.t + (1 - (v - lo) / (hi - lo)) * ih;
  const svg = svgEl('svg', {viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img', 'aria-label': o.label || 'Verlauf'}, box);
  if (achsen) {
    const st = schrittweite((hi - lo) / 5);
    for (let k = Math.ceil(lo / st); k * st <= hi + 1e-9; k++) {
      const v = k * st, yy = y(v);
      const l = svgEl('line', {x1: m.l, x2: m.l + iw, y1: yy, y2: yy, 'stroke-width': 1}, svg); l.style.stroke = '#1a1a1d';
      const t = svgEl('text', {x: W - m.r + 14, y: yy + 4}, svg); t.textContent = o.fmtY(v);
    }
    const spanne = punkte[n - 1].t - punkte[0].t;
    const fmtX = t => spanne < 1.5 * 864e5 ? new Date(t).toLocaleTimeString('de-DE', {hour: '2-digit', minute: '2-digit'})
      : spanne > 400 * 864e5 ? new Date(t).toLocaleDateString('de-DE', {month: '2-digit', year: '2-digit'})
      : new Date(t).toLocaleDateString('de-DE', {day: '2-digit', month: '2-digit'});
    const striche = [...new Set([0, 1, 2, 3, 4].map(k => Math.round(k * (n - 1) / 4)))];
    for (const i of striche) {
      const k = i === 0 ? 0 : i === n - 1 ? 4 : 2;
      const t = svgEl('text', {x: x(i), y: H - 6, 'text-anchor': k === 0 ? 'start' : k === 4 ? 'end' : 'middle'}, svg); t.textContent = fmtX(punkte[i].t);
    }
  }
  if (o.basis !== false) {
    const y0 = y(punkte[0].v);
    const b = svgEl('line', {x1: m.l, x2: m.l + iw, y1: y0, y2: y0, 'stroke-width': 2.4, 'stroke-dasharray': '0 8', 'stroke-linecap': 'round'}, svg);
    b.style.stroke = '#48484e';
  }
  if (o.zweite) {
    const d2 = punkte.map((p, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ',' + y(p.v2).toFixed(1)).join('');
    const l2 = svgEl('path', {d: d2, fill: 'none', 'stroke-width': 2, 'stroke-dasharray': '6 5', 'stroke-linejoin': 'round'}, svg); l2.style.stroke = '#6d6d74';
  }
  const d = punkte.map((p, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ',' + y(p.v).toFixed(1)).join('');
  if (achsen) {
    const gid = 'v' + Math.random().toString(36).slice(2, 8);
    const g = svgEl('linearGradient', {id: gid, x1: 0, y1: 0, x2: 0, y2: 1}, svgEl('defs', {}, svg));
    const s1 = svgEl('stop', {offset: '0%', 'stop-opacity': .13}, g), s2 = svgEl('stop', {offset: '100%', 'stop-opacity': 0}, g);
    s1.style.stopColor = s2.style.stopColor = o.farbe;
    svgEl('path', {d: d + 'L' + x(n - 1).toFixed(1) + ',' + (m.t + ih) + 'L' + x(0).toFixed(1) + ',' + (m.t + ih) + 'Z', fill: 'url(#' + gid + ')'}, svg);
  }
  const linie = svgEl('path', {d, fill: 'none', 'stroke-width': 2.8, 'stroke-linejoin': 'round', 'stroke-linecap': 'round'}, svg);
  linie.style.stroke = o.farbe;
  const kreuz = svgEl('line', {y1: m.t - 10, y2: m.t + ih, 'stroke-width': 1, visibility: 'hidden'}, svg); kreuz.style.stroke = '#3a3a3f';
  const kugel = svgEl('circle', {r: 6, 'stroke-width': 3, visibility: 'hidden'}, svg); kugel.style.fill = o.farbe; kugel.style.stroke = '#000';
  const feld = svgEl('rect', {x: 0, y: 0, width: W, height: H, fill: 'transparent', tabindex: 0}, svg);
  feld.setAttribute('aria-label', 'Chart erkunden mit Pfeiltasten');
  const tip = el('div', 'tip'); tip.hidden = true; box.append(tip);
  let cur = n - 1;
  const zeige = i => {
    const p = punkte[i];
    kreuz.setAttribute('x1', x(i)); kreuz.setAttribute('x2', x(i)); kreuz.setAttribute('visibility', 'visible');
    kugel.setAttribute('cx', x(i)); kugel.setAttribute('cy', y(p.v)); kugel.setAttribute('visibility', 'visible');
    tip.textContent = '';
    o.tip(p).forEach(([text, cls]) => tip.append(el('div', cls, text)));
    tip.hidden = false;
    const tw = tip.offsetWidth; tip.style.left = Math.max(0, Math.min(W - tw, x(i) - tw / 2)) + 'px'; tip.style.top = (achsen ? -64 : -34) + 'px';
  };
  const weg = () => { kreuz.setAttribute('visibility', 'hidden'); kugel.setAttribute('visibility', 'hidden'); tip.hidden = true; };
  feld.addEventListener('pointermove', e => {
    const r = svg.getBoundingClientRect(); const px = (e.clientX - r.left) * (W / r.width);
    cur = Math.max(0, Math.min(n - 1, Math.round((px - m.l) / iw * (n - 1)))); zeige(cur);
  });
  feld.addEventListener('pointerleave', weg);
  feld.addEventListener('focus', () => zeige(cur));
  feld.addEventListener('blur', weg);
  feld.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') { cur = Math.max(0, cur - 1); zeige(cur); e.preventDefault(); }
    if (e.key === 'ArrowRight') { cur = Math.min(n - 1, cur + 1); zeige(cur); e.preventDefault(); }
  });
}
new ResizeObserver(() => { chartSig.pf = chartSig.wp = chartSig.an = ''; if (bereit()) male(); }).observe(document.querySelector('.app'));

/* ================= Handeln-Menü (schmale Ansicht) ================= */
function handelmenuAuf() {
  if (!bereit() || !gewaehlt || seite !== 'wert' || Sheet.offen || istBreit()) return;
  const hm = $('hm'); hm.hidden = false; void hm.offsetWidth; hm.classList.add('offen');
  $('leisteWp').classList.add('weg'); $('bHandeln').setAttribute('aria-expanded', 'true');
  maleHandelmenu();
  setTimeout(() => { const b = !$('hmKaufen').disabled ? $('hmKaufen') : $('hmZu'); b.focus({preventScroll: true}); }, 60);
}
function handelmenuZu(fokusZurueck = true) {
  const hm = $('hm'); if (!hm.classList.contains('offen')) return;
  hm.classList.remove('offen'); $('leisteWp').classList.remove('weg'); $('bHandeln').setAttribute('aria-expanded', 'false');
  setTimeout(() => { if (!hm.classList.contains('offen')) hm.hidden = true; }, 320);
  if (fokusZurueck) $('bHandeln').focus({preventScroll: true});
}
function maleHandelmenu() {
  if ($('hm').hidden || !bereit()) return;
  const pos = zeileVon(gewaehlt);
  $('hmKaufen').disabled = !stand.offen;
  $('hmVerkaufen').disabled = !stand.offen || !pos;
  $('hmHinweis').textContent = !stand.offen ? 'Handel geschlossen · Mo–Fr ' + stand.handel_von + '–' + stand.handel_bis + ' Uhr'
    : !pos ? 'Verkaufen geht erst mit einer Position.' : '';
}

/* ================= Zeichnen, Laden ================= */
function male() {
  if (!bereit()) return;
  const offen = !!stand.offen;
  $('led').className = 'led' + (offen ? ' an' : '');
  $('ledtext').textContent = (stand.demo ? 'Demo · ' : '') + (offen ? 'Handel offen' : 'Handel geschlossen');
  $('demoBand').hidden = !stand.demo;
  $('avatar').textContent = ((stand.titel || 'P').trim().charAt(0) || 'P').toUpperCase();
  if (seite === 'portfolio') malePortfolio();
  else if (seite === 'cash') maleCash();
  else if (seite === 'analytics') maleAnalytics();
  else if (seite === 'wert') maleWert();
  maleRail();
  if (Sheet.offen && Sheet.aktiv && Sheet.aktiv.update) Sheet.aktiv.update();
  if (Ticket.ausstehend) Ticket.zeigen(seite === 'wert' && !Sheet.offen && istBreit());
  else if (seite === 'wert' && Ticket.aktiv && Ticket.aktiv.update) Ticket.aktiv.update();
  maleHandelmenu();
}
async function ladeVerlauf() {
  if (seite === 'cash') return;
  const nr = ++verlaufNr, sym = gewaehlt, s = seite;
  try {
    if (s === 'analytics') {
      const da = await (await fetch('/verlauf?raum=MAX')).json();
      if (nr !== verlaufNr) return;
      verlaufAn = da;
    } else {
      const r = await fetch(s === 'portfolio' ? '/verlauf?raum=' + raumPf : '/verlauf?symbol=' + encodeURIComponent(sym) + '&raum=' + raumWp);
      const d = await r.json();
      if (nr !== verlaufNr) return;
      if (s === 'portfolio') verlaufPf = d; else { verlaufWp = d; verlaufWpSym = sym; }
    }
    verlaufZeit = Date.now(); chartSig.pf = chartSig.wp = chartSig.an = '';
    male();
  } catch (e) {}
}
async function ladeSparks() {
  if (!bereit()) return;
  sparkZeit = Date.now();
  try {
    const uni = stand.universum || [];
    const antworten = await Promise.all(uni.map(u => fetch('/verlauf?symbol=' + encodeURIComponent(u.symbol) + '&raum=1T').then(r => r.json())));
    uni.forEach((u, i) => { const p = antworten[i]; sparks[u.symbol] = p.length > 60 ? p.filter((_, j) => j % Math.ceil(p.length / 60) === 0 || j === p.length - 1) : p; });
    male();
  } catch (e) {}
}
async function tick() {
  try {
    const r = await fetch('/daten'); stand = await r.json();
  } catch (e) {
    $('ledtext').textContent = 'keine Verbindung'; $('led').className = 'led'; return;
  }
  if (!bereit()) { $('ledtext').textContent = 'lade Kurse …'; return; }
  male();
  neueMeldungen();
  if (Date.now() - verlaufZeit > 30000) ladeVerlauf();
  if (istBreit() && Date.now() - sparkZeit > 60000) ladeSparks();
  if (seite === 'wert' && Date.now() - (analyseZeit[gewaehlt] || 0) > 60000) ladeAnalyse(gewaehlt);
}

/* ================= Bedienung ================= */
const mitStand = fn => () => { if (bereit()) fn(); };
const einzahlenFlow = mitStand(() => { Sheet.oeffnen(screenUeberweisen(), false); Sheet.weiter(screenGeld({art: 'einzahlung'})); });
document.querySelectorAll('.tab, .nav-item[data-s]').forEach(b => b.onclick = () => zeigeSeite(b.dataset.s));
$('bSuche').onclick = $('nSuche').onclick = $('suchknopf').onclick = mitStand(() => Sheet.oeffnen(screenSuche('suche')));
$('bUeberweisen').onclick = $('nUeberweisen').onclick = mitStand(() => Sheet.oeffnen(screenUeberweisen()));
const auszahlenFlow = mitStand(() => { Sheet.oeffnen(screenUeberweisen(), false); Sheet.weiter(screenGeld({art: 'auszahlung'})); });
$('cEinzahlen').onclick = $('rEinzahlen').onclick = einzahlenFlow;
$('cAuszahlen').onclick = $('rAuszahlen').onclick = auszahlenFlow;
$('markeKnopf').onclick = mitStand(() => Sheet.oeffnen(screenDepots()));
$('anBericht').onclick = mitStand(() => Sheet.oeffnen(screenBericht()));
$('anAuto').onclick = mitStand(() => Sheet.oeffnen(screenAutoDip()));
$('wpAlarmNeu').onclick = mitStand(() => Sheet.oeffnen(screenAlarm(gewaehlt)));
$('bSparplan').onclick = mitStand(() => Sheet.oeffnen(screenSparplan(gewaehlt)));
$('bHandeln').onclick = handelmenuAuf;
$('kWatch').onclick = $('navWatch').onclick = $('rWatchAlle').onclick = mitStand(() => Sheet.oeffnen(screenSuche('watchlist')));
$('kSpar').onclick = $('navSpar').onclick = $('rSparAlle').onclick = mitStand(() => Sheet.oeffnen(screenSparplaene()));
$('kOrder').onclick = mitStand(() => Sheet.oeffnen(screenSuche('order')));
$('navProfil').onclick = $('avatar').onclick = mitStand(() => Sheet.oeffnen(screenProfil()));
$('glocke').onclick = $('navMeld').onclick = mitStand(() => Sheet.oeffnen(screenMeldungen()));
$('wpEntfernen').onclick = mitStand(async () => {
  const a = await post('/watchlist', {aktion: 'entfernen', symbol: gewaehlt});
  toast(a.text, !a.ok); if (a.ok) { await tick(); zeigeSeite(letzteTab); }
});
$('kAnalytics').onclick = () => zeigeSeite('analytics');
$('anZurueck').onclick = () => zeigeSeite('cash');
$('alleTransaktionen').onclick = mitStand(() => { if (!istBreit()) Sheet.oeffnen(screenTransaktionenListe()); });
$('pfModus').onclick = () => { modus = modus === 'pct' ? 'geld' : 'pct'; setz('pd-modus', modus); male(); };
document.querySelectorAll('#pfThead th').forEach(th => th.querySelector('button').onclick = () => {
  const k = th.dataset.k; sortPf = sortPf.k === k ? {k, ab: !sortPf.ab} : {k, ab: k !== 'name'}; male();
});
$('zurueck').onclick = () => zeigeSeite(letzteTab);
$('wpScoreKachel').onclick = () => $('wpAnalyseBlock').scrollIntoView({behavior: 'smooth', block: 'start'});
$('ovBack').onclick = () => Sheet.zu();
$('hmBack').onclick = () => handelmenuZu();
$('hmZu').onclick = () => handelmenuZu();
$('hmKaufen').onclick = () => { handelmenuZu(); Sheet.oeffnen(screenInvestiere(gewaehlt)); };
$('hmVerkaufen').onclick = () => { handelmenuZu(); Sheet.oeffnen(screenOrder({richtung: 'verkaufen', symbol: gewaehlt, cent: 0, alles: false})); };
breitMQ.addEventListener('change', () => {
  chartSig.pf = chartSig.wp = chartSig.an = '';
  if (istBreit()) { handelmenuZu(false); ladeSparks(); if (seite === 'wert') setTimeout(() => Ticket.fokus(), 60); }
  male();
});

function fokusFalle(e, box) {
  const f = [...box.querySelectorAll('button:not([disabled]), input:not([disabled]), a[href], [tabindex="0"]')]
    .filter(x => !x.closest('[hidden]') && x.getClientRects().length);
  if (!f.length) return;
  const erst = f[0], letzt = f[f.length - 1], a = document.activeElement;
  if (e.shiftKey && (a === erst || !box.contains(a))) { e.preventDefault(); letzt.focus(); }
  else if (!e.shiftKey && (a === letzt || !box.contains(a))) { e.preventDefault(); erst.focus(); }
}
document.addEventListener('keydown', e => {
  const a = document.activeElement;
  const imBetrag = !!a && !!a.classList && a.classList.contains('bf-input');
  const tippt = !!a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.isContentEditable);
  const hmOffen = $('hm').classList.contains('offen');
  const ohneMod = !e.ctrlKey && !e.metaKey && !e.altKey;
  // Tastenkürzel: auch aus dem Betragsfeld der Order-Maske heraus (dort sind Buchstaben ohnehin gesperrt)
  if (ohneMod && !Sheet.offen && !hmOffen && (!tippt || imBetrag) && !e.repeat) {
    if (e.key === '/') { e.preventDefault(); if (bereit()) Sheet.oeffnen(screenSuche('suche')); return; }
    if (ticketSichtbar()) {
      const k = e.key.toLowerCase();
      if (k === 'k' || k === 'v') { e.preventDefault(); ticketNeu(k === 'k' ? 'kaufen' : 'verkaufen', true); return; }
      if (k === 's') { e.preventDefault(); Sheet.oeffnen(screenSparplan(gewaehlt)); return; }
    }
  }
  if (e.defaultPrevented) return;
  if (e.key === 'Enter' && e.repeat) { e.preventDefault(); return; }
  if (e.key === 'Tab') { const box = Sheet.offen ? $('sheet') : hmOffen ? $('hm') : null; if (box) fokusFalle(e, box); return; }
  if (e.key === 'Escape') {
    if (hmOffen) { e.preventDefault(); handelmenuZu(); }
    else if (Sheet.offen) { e.preventDefault(); Sheet.zurueck(); }
    else if (ticketSichtbar() && Ticket.tiefe() > 1) { e.preventDefault(); Ticket.zurueck(); }
    else if (seite === 'wert') { e.preventDefault(); zeigeSeite(letzteTab); }
    else if (seite === 'analytics' && !istBreit()) { e.preventDefault(); zeigeSeite('cash'); }
    return;
  }
  if (!ohneMod) return;
  const stapel = Sheet.offen ? Sheet : (!hmOffen && ticketSichtbar()) ? Ticket : null;
  if (stapel && stapel.aktiv) {
    const akt = stapel.aktiv;
    if (akt.feld && !tippt && akt.feld.taste(e)) { e.preventDefault(); akt.feld.fokus(); return; }
    if (akt.tippen && !tippt && akt.tippen(e)) { e.preventDefault(); return; }
    const aufKnopf = !!a && (a.tagName === 'BUTTON' || a.tagName === 'A' || a.tagName === 'TR');
    if (e.key === 'Enter' && akt.enter && !tippt && !aufKnopf) { e.preventDefault(); akt.enter(); }
  }
});
document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });

zeigeSeite(letzteTab);
tick();
// Als App installierbar (PWA). Service Worker gehen nur über localhost oder https.
if ('serviceWorker' in navigator && (location.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(location.hostname))) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}
setInterval(tick, 3000);
