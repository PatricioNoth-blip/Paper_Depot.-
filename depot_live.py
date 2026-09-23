"""
Paperdepot: ein kleiner Broker zum Üben, aufgebaut wie Trade Republic.
Live-Kurse von Tradegate, Cash-Konto, Kauf, Verkauf, Sparpläne und eine
Analyse je Aktie (Indikatoren + Analystenmeinungen → Einschätzung).

    python depot_live.py              # Oberfläche: http://localhost:8765
    python depot_live.py --offen      # zusätzlich vom Handy im selben WLAN erreichbar
    python depot_live.py --demo       # ohne Internet: erfundene Kurse, eigenes Demo-Depot

Braucht nur Python 3.9+, keine zusätzlichen Pakete.

Gehandelt wird zum Briefkurs (Kauf) bzw. Geldkurs (Verkauf), dazu 1 € Gebühr je Order,
nur während der Tradegate-Zeiten Mo–Fr 07:30–22:00 Uhr. Alle Daten liegen neben dieser
Datei: depot.json (Konto, Orders), kurse.csv (Depotverlauf), papiere.csv (Kurse je Papier).

Simulation mit Spielgeld. Es werden keine echten Orders ausgelöst. Keine Anlageberatung.
"""

from __future__ import annotations

import argparse
import csv
import http.cookiejar
import io
import json
import math
import re
import socket
import threading
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, time as uhrzeit
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from zoneinfo import ZoneInfo

import analyse
import demo
import katalog

HIER = Path(__file__).parent
WEB = HIER / "web"
DATEN = [HIER]                                            # --demo: HIER / "demo"
BERLIN = ZoneInfo("Europe/Berlin")
HANDEL_VON, HANDEL_BIS = uhrzeit(7, 30), uhrzeit(22, 0)
BETRAG_MAX = 99_999_999.99
SPARPLAN_TAGE = (1, 2, 15, 16)
SPARPLAN_MIN = 1.0
DEMO = [False]


def pfad(name: str) -> Path:
    return DATEN[0] / name


INFOS = {
    "AMZN": "Amazon betreibt einen der größten Onlinehändler der Welt, dazu die Cloud-Sparte "
            "Amazon Web Services, einen Marktplatz für Drittanbieter, Werbung sowie Abo-Dienste wie Prime.",
    "META": "Meta Platforms betreibt Facebook, Instagram, WhatsApp und Messenger. Der Umsatz stammt "
            "fast vollständig aus Werbung; dazu kommen Investitionen in KI und Virtual Reality.",
    "MSFT": "Microsoft entwickelt Software und Cloud-Dienste: Windows, Microsoft 365, "
            "die Cloud-Plattform Azure, LinkedIn und die Xbox-Sparte.",
}

UNIVERSUM = [
    {"symbol": "AMZN", "name": "Amazon",         "isin": "US0231351067"},
    {"symbol": "META", "name": "Meta Platforms", "isin": "US30303M1027"},
    {"symbol": "MSFT", "name": "Microsoft",      "isin": "US5949181045"},
]
# Startdepot: Kauf am 23.09.2026, 10:20 Uhr, je 1 € Ordergebühr
START = {
    "titel": "Musterdepot", "handelsplatz": "Tradegate", "gebuehr": 1.0,
    "eingezahlt": 10003.0, "cash": 0.0, "realisiert": 0.0, "universum": UNIVERSUM,
    "positionen": [
        {"symbol": "AMZN", "name": "Amazon", "isin": "US0231351067",
         "anteile": 17.829285, "einstand": 224.35, "investiert": 4001.0, "gebuehr": 1.0},
        {"symbol": "META", "name": "Meta Platforms", "isin": "US30303M1027",
         "anteile": 6.144393, "einstand": 651.00, "investiert": 4001.0, "gebuehr": 1.0},
        {"symbol": "MSFT", "name": "Microsoft", "isin": "US5949181045",
         "anteile": 4.551143, "einstand": 439.45, "investiert": 2001.0, "gebuehr": 1.0},
    ],
    "orders": [
        {"zeit": "2026-09-23T10:20:50+02:00", "richtung": "kaufen", "symbol": s,
         "stueck": st, "kurs": k, "gebuehr": 1.0, "betrag": b}
        for s, st, k, b in (("AMZN", 17.829285, 224.35, 4001.0), ("META", 6.144393, 651.00, 4001.0),
                            ("MSFT", 4.551143, 439.45, 2001.0))
    ],
}

SPERRE = threading.Lock()           # Orders, Kursabfrage und Analyse kommen aus verschiedenen Fäden


# --- Hilfsmittel ------------------------------------------------------------
def zahl(text) -> float | None:
    """'1.227,50' → 1227.5"""
    try:
        return float(str(text).strip().replace(".", "").replace(",", "."))
    except ValueError:
        return None


def euro(v: float) -> str:
    return f"{v:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".") + " €"


def endlich(wert) -> float | None:
    """Zahl aus einer Anfrage, oder None bei Text, NaN, Unendlich usw."""
    if isinstance(wert, bool):
        return None
    try:
        v = float(wert)
    except (TypeError, ValueError):
        return None
    return v if math.isfinite(v) else None


def betrag_aus(wunsch: dict) -> float | None:
    """Betrag in Euro. Die Oberfläche schickt ganze Cent ("cent"), sonst "betrag"."""
    if wunsch.get("cent") is not None:
        c = endlich(wunsch.get("cent"))
        return None if c is None else round(c) / 100
    b = endlich(wunsch.get("betrag"))
    return None if b is None else round(b, 2)


def handel_offen(jetzt: datetime | None = None) -> bool:
    if DEMO[0]:
        return True
    jetzt = jetzt or datetime.now(BERLIN)
    return jetzt.weekday() < 5 and HANDEL_VON <= jetzt.time() < HANDEL_BIS


def jetzt_iso() -> str:
    return datetime.now(BERLIN).isoformat(timespec="seconds")


# --- Kurse von Tradegate ----------------------------------------------------
# Tradegate merkt sich das Papier in der Sitzung, daher ein eigener Cookie-Speicher.
_sitzung = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
SEITE_URL = "https://www.tradegatebsx.com/orderbuch.php?isin={isin}"


def hole_kurs(isin: str) -> dict:
    req = urllib.request.Request(SEITE_URL.format(isin=isin),
                                 headers={"User-Agent": "Mozilla/5.0 (privates Lernprojekt)"})
    with _sitzung.open(req, timeout=10) as a:
        html = a.read().decode("utf-8", "replace")
    per_id = lambda n: (lambda m: zahl(m.group(1)) if m else None)(re.search(rf'id="{n}"[^>]*>\s*([\d.,]+)', html))
    werte = {"last": per_id("last"), "bid": per_id("bid"), "ask": per_id("ask")}
    if werte["last"] is None:                               # Notweg: Beschriftungen im Text suchen
        text = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", html))
        for feld, wort in (("last", "Umsatz"), ("bid", "Geld"), ("ask", "Brief")):
            m = re.search(rf"{wort}\s+([\d.]+,\d+)", text)
            if m:
                werte[feld] = zahl(m.group(1))
    werte["last"] = werte["last"] or werte["bid"]
    return werte


def kurse(universum: list) -> dict:
    """Alle Kurse parallel holen (höchstens 6 gleichzeitig), damit der Takt auch bei vielen Aktien hält."""
    def eins(p):
        try:
            return p["symbol"], hole_kurs(p["isin"])
        except Exception as fehler:                         # Netz weg: nichts erfinden
            return p["symbol"], {"fehler": str(fehler)}
    with ThreadPoolExecutor(max_workers=6) as pool:
        return dict(pool.map(eins, universum))


# --- Analyse je Aktie (läuft automatisch im Hintergrund) --------------------
class Analyse:
    """Hält Tageskurse und Analystendaten je Papier und frischt sie regelmäßig auf."""
    KURSE_ALLE, ANALYSTEN_ALLE = 6 * 3600, 12 * 3600
    tage: dict = {}                 # Symbol → [(Datum, Schluss)]
    analysten: dict = {}            # Symbol → dict
    quelle: dict = {}               # Symbol → Herkunft der Tageskurse
    geholt: dict = {}               # (Symbol, Art) → Zeitpunkt
    fehler: dict = {}
    markt: list = []                # Vergleichsmarkt (MSCI World in Euro) für die relative Stärke

    @classmethod
    def auffrischen(cls, universum: list):
        heute = datetime.now(BERLIN).date()
        if time.time() - cls.geholt.get(("markt", "kurse"), 0) > cls.KURSE_ALLE:
            try:
                cls.markt = demo.tageskurse(analyse.MARKT, heute) if DEMO[0] else analyse.hole_tageskurse(analyse.MARKT)
                cls.geholt[("markt", "kurse")] = time.time()
            except Exception:
                cls.geholt[("markt", "kurse")] = time.time() - cls.KURSE_ALLE + 900
        for p in universum:
            s = p["symbol"]
            if time.time() - cls.geholt.get((s, "kurse"), 0) > cls.KURSE_ALLE:
                try:
                    if DEMO[0]:
                        tage, quelle = demo.tageskurse(s, heute), "Demo-Kurse"
                    else:
                        ticker = p.get("yahoo") or (katalog.zu_isin(p["isin"]) or {}).get("yahoo") or s
                        tage, quelle = analyse.hole_tageskurse(ticker), f"Yahoo Finance ({ticker}, EUR)"
                    cls.tage[s], cls.quelle[s] = tage, quelle
                    cls.fehler.pop((s, "kurse"), None)
                except Exception as f:
                    cls.fehler[(s, "kurse")] = str(f)
                    cls.tage[s], cls.quelle[s] = eigene_tageskurse(s), "eigene Aufzeichnung (papiere.csv)"
                cls.geholt[(s, "kurse")] = time.time() - (cls.KURSE_ALLE - 900 if (s, "kurse") in cls.fehler else 0)
            if time.time() - cls.geholt.get((s, "analysten"), 0) > cls.ANALYSTEN_ALLE:
                try:
                    cls.analysten[s] = demo.analysten(s, heute) if DEMO[0] else analyse.hole_analysten(s)
                    cls.fehler.pop((s, "analysten"), None)
                except Exception as f:
                    cls.fehler[(s, "analysten")] = str(f)
                cls.geholt[(s, "analysten")] = time.time() - (cls.ANALYSTEN_ALLE - 1800 if (s, "analysten") in cls.fehler else 0)

    @classmethod
    def ergebnis(cls, symbol: str, live: float | None) -> dict:
        tage = cls.tage.get(symbol)
        if tage is None:
            return {"ok": False, "text": "Analyse wird geladen …"}
        r = analyse.bewerten(tage, live, cls.analysten.get(symbol), datetime.now(BERLIN).date().isoformat(), cls.markt)
        r["quelle_kurse"] = cls.quelle.get(symbol)
        if (symbol, "analysten") in cls.fehler and symbol not in cls.analysten:
            r["hinweis_analysten"] = "Analystendaten gerade nicht erreichbar."
        return r

    @classmethod
    def schleife(cls, universum_holen):
        while True:
            try:
                cls.auffrischen(universum_holen())
            except Exception:
                pass
            time.sleep(60)


def eigene_tageskurse(symbol: str) -> list:
    """Letzter aufgezeichneter Kurs je Tag aus papiere.csv (Notweg ohne Yahoo)."""
    je_tag = {}
    for z in _csv_zeilen(pfad("papiere.csv")):
        if z.get("symbol") == symbol and z.get("kurs"):
            try:
                je_tag[datetime.fromisoformat(z["zeit"]).date().isoformat()] = float(z["kurs"])
            except ValueError:
                continue
    return sorted(je_tag.items())


# --- Depot rechnen ----------------------------------------------------------
def order_fluss(o: dict) -> float:
    """Cash-Bewegung einer Order inkl. Gebühr (Kauf negativ, Verkauf positiv)."""
    if o.get("fluss") is not None:
        return o["fluss"]
    volumen = round(o["stueck"] * o["kurs"], 2)
    gebuehr = o.get("gebuehr", 0)
    return -round(volumen + gebuehr, 2) if o["richtung"] == "kaufen" else round(volumen - gebuehr, 2)


def bewerten(depot: dict, stand: dict) -> dict:
    zeilen, wert_aktien, investiert = [], 0.0, 0.0
    for p in depot["positionen"]:
        q = stand.get(p["symbol"]) or {}
        kurs = q.get("last")
        wert = p["anteile"] * kurs if kurs else None
        gv = (wert - p["investiert"]) if wert is not None else None
        zeilen.append({**p, "kurs": kurs, "wert": wert, "gv": gv,
                       "gvp": gv / p["investiert"] * 100 if gv is not None and p["investiert"] else None})
        wert_aktien += wert or 0.0
        investiert += p["investiert"]
    cash = depot.get("cash", 0.0)
    eingezahlt = depot.get("eingezahlt", investiert + cash)
    gesamt = wert_aktien + cash
    universum = depot.get("universum", UNIVERSUM)
    quotes = {s: {k: (q or {}).get(k) for k in ("last", "bid", "ask")} for s, q in stand.items()}
    return {"zeilen": zeilen, "wert": gesamt, "aktien": wert_aktien, "cash": cash,
            "investiert": investiert, "eingezahlt": eingezahlt,
            "realisiert": depot.get("realisiert", 0.0),
            "gebuehren": sum(o.get("gebuehr", 0) for o in depot.get("orders", [])),
            "gv": gesamt - eingezahlt, "gvp": (gesamt - eingezahlt) / eingezahlt * 100 if eingezahlt else 0.0,
            "zeit": jetzt_iso(), "offen": handel_offen(), "demo": DEMO[0],
            "titel": depot.get("titel", "Musterdepot"), "handelsplatz": depot.get("handelsplatz", "Tradegate"),
            "handel_von": HANDEL_VON.strftime("%H:%M"), "handel_bis": HANDEL_BIS.strftime("%H:%M"),
            "gebuehr": depot.get("gebuehr", 1.0), "universum": universum,
            "orders": [{**o, "fluss": order_fluss(o)} for o in list(reversed(depot.get("orders", [])))[:500]],
            "buchungen": list(reversed(depot.get("buchungen", [])))[:500],
            "quotes": quotes, "sparplaene": depot.get("sparplaene", []), "infos": INFOS,
            "sparplan_tage": list(SPARPLAN_TAGE), "sparplan_min": SPARPLAN_MIN,
            "meldungen": list(reversed(depot.get("meldungen", [])))[:50],
            "benachrichtigen": depot.get("benachrichtigen", True),
            "analyse": {u["symbol"]: kurz(Analyse.ergebnis(u["symbol"], quotes.get(u["symbol"], {}).get("last")))
                        for u in universum}}


def kurz(r: dict) -> dict:
    """Analyse ohne Details, für die regelmäßige Abfrage aller Papiere."""
    if not r.get("ok"):
        return r
    a = r.get("analysten") or {}
    d = r.get("dip") or {}
    return {k: r[k] for k in ("ok", "score", "urteil", "ton", "technik", "analysten_score", "potenzial", "pro", "contra")} \
        | {"empfehlung": [a.get(k, 0) for k in ("stark_kaufen", "kaufen", "halten", "verkaufen", "stark_verkaufen")] if a else None,
           "dip": {k: d.get(k) for k in ("status", "text", "rueckgang", "erfuellt", "warnung")},
           "bis_zahlen": r["kennzahlen"].get("bis_zahlen"), "zahlen": r["kennzahlen"].get("zahlen")}


# --- Benachrichtigungen -----------------------------------------------------
DIP_TITEL = {"chance": "Buy the Dip", "messer": "Fallendes Messer", "beobachten": "Rücksetzer beobachten"}
_kandidat: dict = {}                # Symbol → (Status, Anzahl Abfragen in Folge)


def meldungen_pruefen(depot: dict, zustand: dict) -> list:
    """Neue Meldungen bei Buy-the-Dip-Signalen und nahen Quartalszahlen.
    Ein Signal muss drei Abfragen in Folge bestehen, damit es nicht bei jedem Kurszucken hin und her springt."""
    if not depot.get("benachrichtigen", True):
        return []
    stand, neu = depot.setdefault("signal_stand", {}), []
    namen = {u["symbol"]: u["name"] for u in depot.get("universum", UNIVERSUM)}
    for s, a in (zustand.get("analyse") or {}).items():
        if not a.get("ok"):
            continue
        status = (a.get("dip") or {}).get("status")
        alt, n = _kandidat.get(s, (None, 0))
        _kandidat[s] = (status, n + 1 if alt == status else 1)
        if _kandidat[s][1] >= 3 and stand.get(s) != status:
            stand[s] = status
            if status in ("chance", "messer"):
                d = a["dip"]
                neu.append({"art": status, "symbol": s, "titel": f"{DIP_TITEL[status]}: {namen.get(s, s)}",
                            "text": f"{abs(d['rueckgang']):.1f} % unter dem 20-Tage-Hoch. {d['text'].split(': ', 1)[-1]}".replace(".", ",", 1)
                            + f" Score {a['score']} ({a['urteil']})."})
        bis = a.get("bis_zahlen")
        if bis is not None and 0 <= bis <= 3 and stand.get(s + ":zahlen") != a.get("zahlen"):
            stand[s + ":zahlen"] = a.get("zahlen")
            neu.append({"art": "zahlen", "symbol": s, "titel": f"Quartalszahlen: {namen.get(s, s)}",
                        "text": "Zahlen " + ("heute" if bis == 0 else "morgen" if bis == 1 else f"in {bis} Tagen")
                                + ". Der Kurs kann danach stark schwanken."})
    for m in neu:
        m.update({"id": f"{int(time.time() * 1000)}-{m['symbol']}-{m['art']}", "zeit": jetzt_iso(), "gelesen": False})
    if neu:
        depot["meldungen"] = (depot.get("meldungen", []) + neu)[-100:]
        speichern(depot)
    return neu


# --- Aktien suchen und zur Watchlist hinzufügen -----------------------------
def suchen(depot: dict, text: str) -> list:
    """Treffer aus Watchlist, Katalog und (online, bei ISIN) der Yahoo-Suche."""
    uni = depot.get("universum", UNIVERSUM)
    in_uni = {u["isin"] for u in uni}
    t = text.strip().lower()
    treffer = [{**u, "watchlist": True} for u in uni
               if not t or t in u["name"].lower() or t in u["symbol"].lower() or t in u["isin"].lower()]
    treffer += [{**k, "watchlist": False} for k in katalog.finden(text) if k["isin"] not in in_uni]
    isin = text.strip().upper()
    if re.match(katalog.ISIN_MUSTER, isin) and not any(x["isin"] == isin for x in treffer):
        eintrag = {"symbol": isin, "name": f"Aktie {isin}", "isin": isin, "watchlist": False, "branche": ""}
        if not DEMO[0]:
            try:
                funde = analyse.suche(isin)
                if funde:
                    xetra = next((f for f in funde if f["symbol"].endswith(".DE")), None)
                    heimat = next((f for f in funde if "." not in f["symbol"]), funde[0])
                    eintrag.update(symbol=heimat["symbol"], name=heimat["name"], yahoo=(xetra or heimat)["symbol"])
            except Exception:
                pass
        treffer.append(eintrag)
    return treffer[:20]


def watchlist_setzen(depot: dict, wunsch: dict) -> dict:
    uni = depot.setdefault("universum", list(UNIVERSUM))
    if wunsch.get("aktion") == "entfernen":
        s = wunsch.get("symbol")
        if any(p["symbol"] == s for p in depot["positionen"]):
            return {"ok": False, "text": "Aktien im Depot bleiben auf der Watchlist. Erst verkaufen."}
        if any(p["symbol"] == s for p in depot.get("sparplaene", [])):
            return {"ok": False, "text": "Für diese Aktie läuft ein Sparplan. Erst den Sparplan löschen."}
        depot["universum"] = [u for u in uni if u["symbol"] != s]
        speichern(depot)
        return {"ok": True, "text": "Von der Watchlist entfernt."}
    isin = str(wunsch.get("isin", "")).strip().upper()
    if not re.match(katalog.ISIN_MUSTER, isin):
        return {"ok": False, "text": "Bitte eine gültige ISIN angeben (z. B. US0378331005)."}
    vorhanden = next((u for u in uni if u["isin"] == isin), None)
    if vorhanden:
        return {"ok": True, "text": f"{vorhanden['name']} ist schon auf der Watchlist.", "symbol": vorhanden["symbol"]}
    k = katalog.zu_isin(isin) or {}
    eintrag = {"symbol": str(k.get("symbol") or wunsch.get("symbol") or isin)[:20],
               "name": str(k.get("name") or wunsch.get("name") or isin)[:60], "isin": isin,
               "yahoo": str(k.get("yahoo") or wunsch.get("yahoo") or "")[:20] or None,
               "branche": k.get("branche", "")}
    if any(u["symbol"] == eintrag["symbol"] for u in uni):
        eintrag["symbol"] = isin
    uni.append(eintrag)
    speichern(depot)
    threading.Thread(target=Analyse.auffrischen, args=([eintrag],), daemon=True).start()
    return {"ok": True, "text": f"{eintrag['name']} zur Watchlist hinzugefügt.", "symbol": eintrag["symbol"]}


# --- Handeln ----------------------------------------------------------------
def speichern(depot: dict):
    pfad("depot.json").write_text(json.dumps(depot, indent=1, ensure_ascii=False), encoding="utf-8")


def order(depot: dict, letzte: dict, richtung: str, symbol: str,
          betrag: float | None = None, stueck: float | None = None, alles=False,
          quelle: str | None = None) -> dict:
    """Simulierte Market-Order. Kauf zum Briefkurs, Verkauf zum Geldkurs, dazu die Gebühr."""
    if richtung not in ("kaufen", "verkaufen"):
        return {"ok": False, "code": "eingabe", "text": "Unbekannte Orderrichtung."}
    if not handel_offen():
        return {"ok": False, "code": "zeit",
                "text": "Außerhalb der Handelszeit (Mo–Fr 07:30–22:00 Uhr) wird nicht gehandelt."}
    papier = next((u for u in depot.get("universum", UNIVERSUM) if u["symbol"] == symbol), None)
    if not papier:
        return {"ok": False, "code": "eingabe", "text": f"{symbol} steht nicht zur Auswahl."}
    k = letzte.get(symbol) or {}
    kurs = (k.get("ask") if richtung == "kaufen" else k.get("bid")) or k.get("last")
    if not kurs:
        return {"ok": False, "code": "kurs", "text": "Für dieses Papier liegt gerade kein Kurs vor."}

    gebuehr = float(depot.get("gebuehr", 1.0))
    pos = next((p for p in depot["positionen"] if p["symbol"] == symbol), None)

    if richtung == "kaufen":
        betrag = endlich(betrag) or 0.0
        if betrag <= 0:
            return {"ok": False, "code": "eingabe", "text": "Bitte einen Betrag größer als 0 € angeben."}
        if betrag > BETRAG_MAX:
            return {"ok": False, "code": "eingabe", "text": "Dieser Betrag ist zu groß."}
        if betrag + gebuehr > depot.get("cash", 0) + 1e-9:
            return {"ok": False, "code": "cash",
                    "text": f"Zu wenig Guthaben: {euro(depot.get('cash', 0))} verfügbar, "
                            f"{euro(betrag + gebuehr)} nötig (inkl. Gebühr)."}
        anteile = round(betrag / kurs, 6)
        if pos is None:
            pos = {"symbol": symbol, "name": papier["name"], "isin": papier["isin"],
                   "anteile": 0.0, "einstand": kurs, "investiert": 0.0, "gebuehr": 0.0}
            depot["positionen"].append(pos)
        gesamt_alt = pos["anteile"] * pos["einstand"]
        pos["anteile"] = round(pos["anteile"] + anteile, 6)
        pos["einstand"] = round((gesamt_alt + anteile * kurs) / pos["anteile"], 4)
        pos["investiert"] = round(pos["investiert"] + betrag + gebuehr, 2)
        pos["gebuehr"] = round(pos.get("gebuehr", 0) + gebuehr, 2)
        depot["cash"] = round(depot["cash"] - betrag - gebuehr, 2)
        fluss = -round(betrag + gebuehr, 2)
        text = f"Gekauft: {anteile:.6f} Stück {papier['name']} zu {euro(kurs)}, Gebühr {euro(gebuehr)}."
    else:
        if pos is None or pos["anteile"] <= 0:
            return {"ok": False, "code": "eingabe", "text": f"Du hältst keine Anteile von {papier['name']}."}
        stueck, betrag = endlich(stueck), endlich(betrag)
        if alles:
            anteile = pos["anteile"]
        elif stueck and stueck > 0:
            anteile = round(stueck, 6)
        elif betrag and betrag > 0:
            anteile = round(betrag / kurs, 6)
        else:
            return {"ok": False, "code": "eingabe", "text": "Bitte Stückzahl oder Betrag angeben."}
        if anteile > pos["anteile"] + 1e-6:
            return {"ok": False, "code": "bestand",
                    "text": f"Du hältst nur {pos['anteile']:.6f} Stück (zurzeit {euro(pos['anteile'] * kurs)} wert)."}
        anteile = min(anteile, pos["anteile"])
        if anteile * kurs <= gebuehr:
            return {"ok": False, "code": "eingabe",
                    "text": f"Der Verkaufswert muss über der Ordergebühr von {euro(gebuehr)} liegen."}
        erloes = round(anteile * kurs - gebuehr, 2)
        eingesetzt = round(pos["investiert"] * anteile / pos["anteile"], 2)
        depot["realisiert"] = round(depot.get("realisiert", 0) + erloes - eingesetzt, 2)
        pos["anteile"] = round(pos["anteile"] - anteile, 6)
        pos["investiert"] = round(pos["investiert"] - eingesetzt, 2)
        depot["cash"] = round(depot["cash"] + erloes, 2)
        fluss = erloes
        if pos["anteile"] <= 1e-6:
            depot["positionen"] = [p for p in depot["positionen"] if p["symbol"] != symbol]
        text = f"Verkauft: {anteile:.6f} Stück {papier['name']} zu {euro(kurs)}, Erlös {euro(erloes)}."

    eintrag = {"zeit": jetzt_iso(), "richtung": richtung, "symbol": symbol, "stueck": anteile,
               "kurs": kurs, "gebuehr": gebuehr, "betrag": round(anteile * kurs, 2), "fluss": fluss}
    if quelle:
        eintrag["quelle"] = quelle
    a = Analyse.ergebnis(symbol, k.get("last"))                # Einschätzung zum Orderzeitpunkt festhalten
    if a.get("ok"):
        eintrag["analyse"] = {"score": a["score"], "urteil": a["urteil"]}
    depot.setdefault("orders", []).append(eintrag)
    speichern(depot)
    return {"ok": True, "text": text, "order": eintrag, "cash": depot["cash"]}


def geld_buchen(depot: dict, betrag: float | None) -> dict:
    """Ein- (positiv) und Auszahlung (negativ) auf das Verrechnungskonto, nur Spielgeld."""
    betrag = endlich(betrag)
    if not betrag:
        return {"ok": False, "text": "Bitte einen Betrag angeben."}
    betrag = round(betrag, 2)
    if abs(betrag) > BETRAG_MAX:
        return {"ok": False, "text": "Dieser Betrag ist zu groß."}
    if betrag < 0 and depot.get("cash", 0) + betrag < -1e-9:
        return {"ok": False, "text": f"Nur {euro(depot.get('cash', 0))} auf dem Verrechnungskonto."}
    depot["cash"] = round(depot.get("cash", 0) + betrag, 2)
    depot["eingezahlt"] = round(depot.get("eingezahlt", 0) + betrag, 2)
    buchung = {"zeit": jetzt_iso(), "art": "einzahlung" if betrag > 0 else "auszahlung", "betrag": betrag}
    depot.setdefault("buchungen", []).append(buchung)
    speichern(depot)
    return {"ok": True, "text": ("Eingezahlt: " if betrag > 0 else "Ausgezahlt: ") + euro(abs(betrag)) + ".",
            "cash": depot["cash"], "buchung": buchung}


# --- Sparpläne --------------------------------------------------------------
def naechster_termin(tag: int, nach: date) -> date:
    """Erster Ausführungstag nach dem Datum 'nach'."""
    if nach.day < tag:
        return date(nach.year, nach.month, tag)
    j, m = (nach.year + 1, 1) if nach.month == 12 else (nach.year, nach.month + 1)
    return date(j, m, tag)


def sparplan_setzen(depot: dict, wunsch: dict) -> dict:
    """Sparplan anlegen, ändern, pausieren/fortsetzen oder löschen. Ein Plan je Papier."""
    symbol = wunsch.get("symbol", "")
    papier = next((u for u in depot.get("universum", UNIVERSUM) if u["symbol"] == symbol), None)
    if not papier:
        return {"ok": False, "text": f"{symbol} steht nicht zur Auswahl."}
    plaene = depot.setdefault("sparplaene", [])
    plan = next((p for p in plaene if p["symbol"] == symbol), None)
    heute = datetime.now(BERLIN).date()
    aktion = wunsch.get("aktion", "speichern")

    if aktion in ("loeschen", "pausieren") and plan is None:
        return {"ok": False, "text": "Für dieses Papier gibt es keinen Sparplan."}
    if aktion == "loeschen":
        plaene.remove(plan)
        speichern(depot)
        return {"ok": True, "text": f"Sparplan {papier['name']} gelöscht."}
    if aktion == "pausieren":
        plan["aktiv"] = bool(wunsch.get("aktiv"))
        if plan["aktiv"]:                                   # beim Fortsetzen nichts rückwirkend ausführen
            plan["naechste"] = naechster_termin(plan["tag"], heute).isoformat()
        speichern(depot)
        return {"ok": True, "text": f"Sparplan {papier['name']} " + ("fortgesetzt." if plan["aktiv"] else "pausiert.")}

    betrag = betrag_aus(wunsch)
    if betrag is None or betrag < SPARPLAN_MIN:
        return {"ok": False, "text": f"Die Sparrate muss mindestens {euro(SPARPLAN_MIN)} betragen."}
    if betrag > BETRAG_MAX:
        return {"ok": False, "text": "Dieser Betrag ist zu groß."}
    try:
        tag = int(wunsch.get("tag", SPARPLAN_TAGE[0]))
    except (TypeError, ValueError):
        tag = -1
    if tag not in SPARPLAN_TAGE:
        return {"ok": False, "text": "Bitte einen gültigen Ausführungstag wählen."}
    if plan is None:
        plan = {"symbol": symbol, "betrag": betrag, "tag": tag, "aktiv": True,
                "naechste": naechster_termin(tag, heute).isoformat(), "angelegt": jetzt_iso(), "letzte": None}
        plaene.append(plan)
        text = f"Sparplan {papier['name']} über {euro(betrag)} angelegt."
    else:
        if plan.get("tag") != tag:
            plan["naechste"] = naechster_termin(tag, heute).isoformat()
        plan["betrag"], plan["tag"] = betrag, tag
        text = f"Sparplan {papier['name']} gespeichert."
    speichern(depot)
    return {"ok": True, "text": text, "plan": plan}


def sparplaene_ausfuehren(depot: dict, letzte: dict, jetzt: datetime | None = None) -> list:
    """Fällige Sparpläne ausführen (nur zur Handelszeit; ohne Kurs später erneut)."""
    jetzt = jetzt or datetime.now(BERLIN)
    if not handel_offen(jetzt):
        return []
    heute, ergebnisse = jetzt.date(), []
    for plan in depot.get("sparplaene", []):
        if not plan.get("aktiv", True):
            continue
        try:
            faellig = date.fromisoformat(plan["naechste"])
        except (KeyError, TypeError, ValueError):
            faellig = heute
        if faellig > heute:
            continue
        r = order(depot, letzte, "kaufen", plan["symbol"], betrag=plan["betrag"], quelle="sparplan")
        if r["ok"]:
            plan["letzte"] = jetzt.isoformat(timespec="seconds")
            plan.pop("hinweis", None)
        elif r.get("code") in ("cash", "eingabe"):
            plan["hinweis"] = f"{heute:%d.%m.%Y} nicht ausgeführt: {r['text']}"
        else:
            continue
        plan["naechste"] = naechster_termin(plan["tag"], heute).isoformat()
        speichern(depot)
        ergebnisse.append(r)
    return ergebnisse


# --- Verlauf ----------------------------------------------------------------
TAGE_JE_RAUM = {"1W": 7, "1M": 31, "1J": 366}
_csv_cache: dict = {}


def _csv_zeilen(datei: Path) -> list:
    """CSV einlesen, zwischengespeichert, solange sich die Datei nicht ändert."""
    if not datei.exists():
        return []
    st = datei.stat()
    merk = _csv_cache.get(datei)
    if merk and merk[0] == (st.st_mtime_ns, st.st_size):
        return merk[1]
    with datei.open(encoding="utf-8", newline="") as f:
        zeilen = list(csv.DictReader(f))
    _csv_cache[datei] = ((st.st_mtime_ns, st.st_size), zeilen)
    return zeilen


def _ms(zeit: str) -> int:
    return int(datetime.fromisoformat(zeit).timestamp() * 1000)


def zuschneiden(punkte: list, raum: str, grenze=500) -> list:
    """Zeitraum wählen (1T = letzter Tag mit Daten, 1W/1M/1J rückwärts, sonst alles), dann ausdünnen."""
    if punkte and raum == "1T":
        tag = datetime.fromtimestamp(punkte[-1]["t"] / 1000, BERLIN).date()
        start = datetime.combine(tag, uhrzeit(0), BERLIN).timestamp() * 1000
        punkte = [p for p in punkte if p["t"] >= start]
    elif punkte and raum in TAGE_JE_RAUM:
        start = punkte[-1]["t"] - TAGE_JE_RAUM[raum] * 864e5
        punkte = [p for p in punkte if p["t"] >= start]
    if len(punkte) > grenze:
        schritt = len(punkte) / grenze
        punkte = [punkte[int(i * schritt)] for i in range(grenze)] + punkte[-1:]
    return punkte


def verlauf(raum="MAX") -> list:
    """Depotverlauf aus kurse.csv: t (ms), w (Gesamtwert), g (Gewinn), plus der aktuelle Stand."""
    punkte = []
    for z in _csv_zeilen(pfad("kurse.csv")):
        try:
            punkte.append({"t": _ms(z["zeit"]), "w": float(z["wert"]), "g": float(z["gewinn"])})
        except (ValueError, KeyError, TypeError):
            continue
    jetzt = Server.zustand
    if jetzt and (not punkte or punkte[-1]["t"] < _ms(jetzt["zeit"])):
        punkte.append({"t": _ms(jetzt["zeit"]), "w": round(jetzt["wert"], 2), "g": round(jetzt["gv"], 2)})
    return zuschneiden(punkte, raum)


def verlauf_papier(symbol: str, raum="MAX") -> list:
    """Kursverlauf eines Papiers. 1T aus den eigenen Aufzeichnungen, längere Räume aus den Tageskursen."""
    je_zeit = {}
    for z in _csv_zeilen(pfad("kurse.csv")):                  # ältere Dateien: eine Spalte je Symbol
        try:
            if z.get(symbol):
                je_zeit[_ms(z["zeit"])] = float(z[symbol])
        except (ValueError, KeyError, TypeError):
            continue
    for z in _csv_zeilen(pfad("papiere.csv")):
        try:
            if z.get("symbol") == symbol and z.get("kurs"):
                je_zeit[_ms(z["zeit"])] = float(z["kurs"])
        except (ValueError, KeyError, TypeError):
            continue
    punkte = [{"t": t, "k": k} for t, k in sorted(je_zeit.items())]
    if raum != "1T":                                          # davor: Tagesschlusskurse
        erster = punkte[0]["t"] if punkte else float("inf")
        tage = [{"t": _ms(t[0] + "T17:30:00+02:00"), "k": t[1]} for t in Analyse.tage.get(symbol, [])]
        punkte = [p for p in tage if p["t"] < erster] + punkte
    live = ((Server.zustand or {}).get("quotes") or {}).get(symbol) or {}
    if live.get("last"):
        t = _ms(Server.zustand["zeit"])
        if not punkte or punkte[-1]["t"] < t:
            punkte.append({"t": t, "k": live["last"]})
    return zuschneiden(punkte, raum)


def protokollieren(bewertung: dict, stand: dict):
    """Depotwert nach kurse.csv, Kurse je Papier nach papiere.csv."""
    for name, kopf, zeilen in (
            ("kurse.csv", ["zeit", "wert", "gewinn"],
             [[bewertung["zeit"], round(bewertung["wert"], 2), round(bewertung["gv"], 2)]]),
            ("papiere.csv", ["zeit", "symbol", "kurs", "geld", "brief"],
             [[bewertung["zeit"], s, round(k["last"], 4), k.get("bid") or "", k.get("ask") or ""]
              for s, k in stand.items() if (k or {}).get("last")])):
        datei = pfad(name)
        neu = not datei.exists() or datei.stat().st_size == 0
        with datei.open("a", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            if neu:
                w.writerow(kopf)
            w.writerows(zeilen)


def export_csv(depot: dict) -> bytes:
    """Alle Umsätze als CSV (Semikolon, Dezimalkomma), passend für Excel auf Deutsch."""
    z = lambda v, n=2: f"{v:.{n}f}".replace(".", ",")
    zeilen = []
    for o in depot.get("orders", []):
        art = ("Sparplan" if o.get("quelle") == "sparplan" else "Kauf") if o["richtung"] == "kaufen" else "Verkauf"
        zeilen.append([o["zeit"], art, o["symbol"], z(o["stueck"], 6), z(o["kurs"], 4), z(o["gebuehr"]),
                       z(order_fluss(o)), (o.get("analyse") or {}).get("score", "")])
    for b in depot.get("buchungen", []):
        zeilen.append([b["zeit"], "Einzahlung" if b["art"] == "einzahlung" else "Auszahlung",
                       "", "", "", "", z(b["betrag"]), ""])
    zeilen.sort(key=lambda r: r[0])
    puffer = io.StringIO()
    w = csv.writer(puffer, delimiter=";")
    w.writerow(["Zeit", "Art", "Symbol", "Stück", "Kurs", "Gebühr", "Betrag", "Score"])
    w.writerows(zeilen)
    return ("﻿" + puffer.getvalue()).encode("utf-8")


# --- Webserver --------------------------------------------------------------
DATEITYPEN = {".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
              ".js": "text/javascript; charset=utf-8"}


class Server(BaseHTTPRequestHandler):
    zustand: dict = {}
    depot: dict = {}
    letzte: dict = {}                                      # zuletzt geholte Kurse

    def _senden(self, koerper: bytes, typ: str, code=200, extra=None):
        self.send_response(code)
        self.send_header("Content-Type", typ)
        self.send_header("Content-Length", str(len(koerper)))
        self.send_header("Cache-Control", "no-store")
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(koerper)

    def _json(self, daten, code=200):
        self._senden(json.dumps(daten).encode(), "application/json", code)

    def do_GET(self):
        teile = urllib.parse.urlsplit(self.path)
        frage = {k: v[0] for k, v in urllib.parse.parse_qs(teile.query).items()}
        weg = teile.path
        if weg == "/daten":
            self._json(Server.zustand)
        elif weg == "/verlauf":
            raum = frage.get("raum", "MAX").upper()
            self._json(verlauf_papier(frage["symbol"], raum) if frage.get("symbol") else verlauf(raum))
        elif weg == "/suche":
            self._json(suchen(Server.depot, frage.get("q", "")))        # ohne Sperre: Online-Suche kann dauern
        elif weg == "/analyse":
            s = frage.get("symbol", "")
            live = (Server.letzte.get(s) or {}).get("last")
            r = Analyse.ergebnis(s, live)
            if r.get("ok"):
                r["chart"] = analyse.chartreihe(Analyse.tage.get(s, []), live, datetime.now(BERLIN).date().isoformat())
            self._json(r)
        elif weg == "/export.csv":
            with SPERRE:
                inhalt = export_csv(Server.depot)
            self._senden(inhalt, "text/csv; charset=utf-8",
                         extra={"Content-Disposition": 'attachment; filename="paperdepot-umsaetze.csv"'})
        else:
            datei = WEB / ("index.html" if weg == "/" else weg.lstrip("/"))
            if datei.suffix in DATEITYPEN and datei.resolve().parent == WEB.resolve() and datei.exists():
                self._senden(datei.read_bytes(), DATEITYPEN[datei.suffix])
            else:
                self._senden(b"Nicht gefunden", "text/plain", 404)

    def do_POST(self):
        try:
            wunsch = json.loads(self.rfile.read(int(self.headers.get("Content-Length") or 0)).decode("utf-8") or "{}")
            if not isinstance(wunsch, dict):
                raise ValueError
        except (UnicodeDecodeError, ValueError):
            self._json({"ok": False, "text": "Unlesbare Anfrage."}, 400)
            return
        with SPERRE:
            if self.path == "/order":
                antwort = order(Server.depot, Server.letzte, wunsch.get("richtung", "kaufen"),
                                wunsch.get("symbol", ""), betrag=betrag_aus(wunsch),
                                stueck=wunsch.get("stueck"), alles=bool(wunsch.get("alles")))
            elif self.path == "/geld":
                antwort = geld_buchen(Server.depot, betrag_aus(wunsch))
            elif self.path == "/sparplan":
                antwort = sparplan_setzen(Server.depot, wunsch)
            elif self.path == "/watchlist":
                antwort = watchlist_setzen(Server.depot, wunsch)
            elif self.path == "/meldungen":
                if "benachrichtigen" in wunsch:
                    Server.depot["benachrichtigen"] = bool(wunsch["benachrichtigen"])
                for m in Server.depot.get("meldungen", []):
                    m["gelesen"] = True
                speichern(Server.depot)
                antwort = {"ok": True}
            else:
                antwort = {"ok": False, "text": "Unbekannte Anfrage."}
            if antwort.get("ok"):
                Server.zustand = bewerten(Server.depot, Server.letzte)
        self._json(antwort)

    def log_message(self, *args):
        pass


# --- Ablauf -----------------------------------------------------------------
def eigene_ip() -> str:
    """IP-Adresse im lokalen Netz, für den Zugriff vom Handy."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("192.168.1.1", 1))                     # es wird nichts gesendet
        return s.getsockname()[0]
    except OSError:
        return "localhost"
    finally:
        s.close()


def depot_laden() -> dict:
    datei = pfad("depot.json")
    if datei.exists():
        return json.loads(datei.read_text(encoding="utf-8"))
    DATEN[0].mkdir(exist_ok=True)
    depot = json.loads(json.dumps(START))
    if DEMO[0]:                                           # Demo: 1.000 € Guthaben zum Ausprobieren
        depot["cash"], depot["eingezahlt"] = 1000.0, depot["eingezahlt"] + 1000.0
        depot["buchungen"] = [{"zeit": "2026-09-23T10:15:00+02:00", "art": "einzahlung", "betrag": 1000.0}]
    datei.write_text(json.dumps(depot, indent=1, ensure_ascii=False), encoding="utf-8")
    print(f"Depot angelegt: {datei}")
    if DEMO[0]:                                           # Demo: Tagesverlauf bis jetzt vorbelegen
        papiere, verlauf_ = demo.tagesverlauf(depot["universum"], depot["positionen"], depot["cash"],
                                              depot["eingezahlt"], datetime.now(BERLIN))
        for name, kopf, zeilen in (("papiere.csv", ["zeit", "symbol", "kurs", "geld", "brief"], papiere),
                                   ("kurse.csv", ["zeit", "wert", "gewinn"], verlauf_)):
            with pfad(name).open("w", newline="", encoding="utf-8") as f:
                csv.writer(f).writerows([kopf] + zeilen)
    return depot


def main():
    ap = argparse.ArgumentParser(description="Paperdepot – Broker-Simulation mit Aktienanalyse")
    ap.add_argument("--port", type=int, default=8765)
    ap.add_argument("--takt", type=int, default=15, help="Sekunden zwischen zwei Kursabfragen")
    ap.add_argument("--offen", action="store_true", help="auch für andere Geräte im WLAN erreichbar")
    ap.add_argument("--demo", action="store_true", help="erfundene Kurse und Analystendaten, eigenes Demo-Depot")
    args = ap.parse_args()

    if args.demo:
        DEMO[0], DATEN[0] = True, HIER / "demo"
    depot = depot_laden()
    Server.depot = depot
    demokurse = demo.Kurse() if args.demo else None
    if args.demo:
        Analyse.auffrischen(depot.get("universum", UNIVERSUM))
    threading.Thread(target=Analyse.schleife, args=(lambda: depot.get("universum", UNIVERSUM),), daemon=True).start()

    server = ThreadingHTTPServer(("0.0.0.0" if args.offen else "127.0.0.1", args.port), Server)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    print(f"Paperdepot läuft{' (DEMO)' if args.demo else ''}: http://localhost:{args.port}")
    if args.offen:
        print(f"Vom Handy im selben WLAN: http://{eigene_ip()}:{args.port}  (jeder im Netz kann darin handeln)")

    letzte_protokollzeit = 0.0
    try:
        while True:
            beginn = time.time()
            universum = depot.get("universum", UNIVERSUM)
            stand = demokurse.holen(universum) if demokurse else kurse(universum)
            with SPERRE:
                Server.letzte = stand
                sparplaene_ausfuehren(depot, stand)
                b = bewerten(depot, stand)
                if meldungen_pruefen(depot, b):
                    b = bewerten(depot, stand)
                Server.zustand = b
            # Protokoll höchstens alle 30 Sekunden und nur zur Handelszeit
            if b["offen"] and time.time() - letzte_protokollzeit > 30:
                protokollieren(b, stand)
                letzte_protokollzeit = time.time()
            dauer = time.time() - beginn                     # Takt halten: Laufzeit dieses Durchlaufs abziehen
            time.sleep(max(1.0, (args.takt if b["offen"] else max(args.takt, 300)) - dauer))
    except KeyboardInterrupt:
        print("\nBeendet.")


if __name__ == "__main__":
    main()
