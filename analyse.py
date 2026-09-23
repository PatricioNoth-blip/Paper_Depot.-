"""
Aktienanalyse für das Paperdepot: technische Indikatoren aus Tageskursen,
Analystenmeinungen und daraus ein Gesamturteil (Score 0–100).

Quellen (ohne API-Schlüssel):
  Tageskurse   Yahoo Finance, Börse Xetra in Euro (z. B. AMZ.DE), ersatzweise
               die eigenen Aufzeichnungen aus papiere.csv
  Analysten    Yahoo Finance: Empfehlungen und Kursziele (US-Symbol, z. B. AMZN)

Ein Score ist eine regelbasierte Zusammenfassung, keine Anlageberatung.
"""

from __future__ import annotations

import http.cookiejar
import json
import math
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone

# Vergleichsmarkt für die relative Stärke: iShares Core MSCI World, Xetra, in Euro
MARKT = "EUNL.DE"

GEWICHT_TECHNIK, GEWICHT_ANALYSTEN = 0.6, 0.4
URTEILE = [(70, "Kaufen", "up"), (58, "Eher kaufen", "up"), (42, "Neutral", "flat"),
           (30, "Eher abwarten", "down"), (0, "Nicht kaufen", "down")]


# --- Daten holen ------------------------------------------------------------
_yahoo = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
_crumb: list = [None]
KOPF = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                      "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"}


def _lesen(url: str, timeout=12) -> str:
    with _yahoo.open(urllib.request.Request(url, headers=KOPF), timeout=timeout) as a:
        return a.read().decode("utf-8", "replace")


def hole_tageskurse(ticker: str) -> list:
    """[(Datum ISO, Schluss, Hoch, Tief), ...] der letzten zwei Jahre."""
    url = (f"https://query1.finance.yahoo.com/v8/finance/chart/{urllib.parse.quote(ticker)}"
           "?range=2y&interval=1d")
    r = json.loads(_lesen(url))["chart"]["result"][0]
    q = r["indicators"]["quote"][0]
    out = []
    for t, k, h, l in zip(r.get("timestamp") or [], q.get("close") or [], q.get("high") or [], q.get("low") or []):
        if k is not None:
            out.append((datetime.fromtimestamp(t, timezone.utc).date().isoformat(),
                        float(k), float(h if h is not None else k), float(l if l is not None else k)))
    return out


def suche(text: str) -> list:
    """Yahoo-Suche nach Name, Kürzel oder ISIN: [{symbol, name, boerse}]"""
    url = ("https://query2.finance.yahoo.com/v1/finance/search?quotesCount=8&newsCount=0&q="
           + urllib.parse.quote(text))
    return [{"symbol": q["symbol"], "name": q.get("longname") or q.get("shortname") or q["symbol"],
             "boerse": q.get("exchange", "")}
            for q in json.loads(_lesen(url)).get("quotes", []) if q.get("quoteType") in ("EQUITY", "ETF")]


def _crumb_holen() -> str:
    """Yahoo verlangt für Analystendaten ein Cookie und einen passenden 'crumb'."""
    if _crumb[0]:
        return _crumb[0]
    try:
        _lesen("https://fc.yahoo.com")
    except Exception:                                   # antwortet mit 404, setzt aber das Cookie
        pass
    _crumb[0] = _lesen("https://query2.finance.yahoo.com/v1/test/getcrumb").strip()
    return _crumb[0]


def hole_analysten(symbol: str) -> dict:
    """Empfehlungen (aktueller Monat) und Kursziele der Analysten."""
    module = "recommendationTrend,financialData,earningsTrend,calendarEvents"
    url = (f"https://query2.finance.yahoo.com/v10/finance/quoteSummary/{urllib.parse.quote(symbol)}"
           f"?modules={module}&crumb={urllib.parse.quote(_crumb_holen())}")
    try:
        r = json.loads(_lesen(url))["quoteSummary"]["result"][0]
    except urllib.error.HTTPError:
        _crumb[0] = None                                # crumb abgelaufen: einmal neu versuchen
        r = json.loads(_lesen(url.split("&crumb=")[0] + "&crumb=" + _crumb_holen()))["quoteSummary"]["result"][0]
    roh = lambda d, k: (d.get(k) or {}).get("raw") if isinstance(d.get(k), dict) else d.get(k)
    trend = next(iter((r.get("recommendationTrend") or {}).get("trend") or []), {})
    fin = r.get("financialData") or {}
    jahr = next((t for t in (r.get("earningsTrend") or {}).get("trend") or [] if t.get("period") == "0y"), {})
    rev, eps = jahr.get("epsRevisions") or {}, jahr.get("epsTrend") or {}
    termine = ((r.get("calendarEvents") or {}).get("earnings") or {}).get("earningsDate") or []
    termin = roh({"x": termine[0]}, "x") if termine else None
    return {"rev_hoch": roh(rev, "upLast30days"), "rev_runter": roh(rev, "downLast30days"),
            "eps_jetzt": roh(eps, "current"), "eps_vor90": roh(eps, "90daysAgo"),
            "zahlen": datetime.fromtimestamp(termin, timezone.utc).date().isoformat() if termin else None,"stark_kaufen": trend.get("strongBuy", 0), "kaufen": trend.get("buy", 0),
            "halten": trend.get("hold", 0), "verkaufen": trend.get("sell", 0),
            "stark_verkaufen": trend.get("strongSell", 0),
            "mittel": roh(fin, "recommendationMean"),          # 1 = stark kaufen … 5 = stark verkaufen
            "anzahl": roh(fin, "numberOfAnalystOpinions"),
            "kursziel": roh(fin, "targetMeanPrice"), "kursziel_hoch": roh(fin, "targetHighPrice"),
            "kursziel_tief": roh(fin, "targetLowPrice"), "kurs": roh(fin, "currentPrice"),
            "waehrung": fin.get("financialCurrency") or "USD", "quelle": "Yahoo Finance",
            "stand": datetime.now(timezone.utc).date().isoformat()}


# --- Indikatoren ------------------------------------------------------------
def sma(werte: list, n: int) -> float | None:
    return sum(werte[-n:]) / n if len(werte) >= n else None


def ema_reihe(werte: list, n: int) -> list:
    if len(werte) < n:
        return []
    k, out = 2 / (n + 1), [sum(werte[:n]) / n]
    for v in werte[n:]:
        out.append(v * k + out[-1] * (1 - k))
    return out


def rsi(werte: list, n=14) -> float | None:
    """Relative Stärke nach Wilder."""
    if len(werte) <= n:
        return None
    diffs = [b - a for a, b in zip(werte, werte[1:])]
    auf = sum(max(d, 0) for d in diffs[:n]) / n
    ab = sum(max(-d, 0) for d in diffs[:n]) / n
    for d in diffs[n:]:
        auf = (auf * (n - 1) + max(d, 0)) / n
        ab = (ab * (n - 1) + max(-d, 0)) / n
    return 100.0 if ab == 0 else 100 - 100 / (1 + auf / ab)


def macd(werte: list) -> dict | None:
    """MACD 12/26/9: Linie, Signal, Histogramm heute und gestern."""
    e12, e26 = ema_reihe(werte, 12), ema_reihe(werte, 26)
    if len(e26) < 10:
        return None
    linie = [a - b for a, b in zip(e12[-len(e26):], e26)]
    signal = ema_reihe(linie, 9)
    if len(signal) < 2:
        return None
    hist = [l - s for l, s in zip(linie[-len(signal):], signal)]
    return {"linie": linie[-1], "signal": signal[-1], "hist": hist[-1], "hist_vorher": hist[-2]}


def bollinger_b(werte: list, n=20, k=2.0) -> float | None:
    """%B: 0 = unteres Band, 1 = oberes Band."""
    if len(werte) < n:
        return None
    m = sum(werte[-n:]) / n
    sd = math.sqrt(sum((v - m) ** 2 for v in werte[-n:]) / n)
    return 0.5 if sd == 0 else (werte[-1] - (m - k * sd)) / (2 * k * sd)


def volatilitaet(werte: list, n=30) -> float | None:
    """Annualisierte Schwankung der letzten n Tage in Prozent."""
    if len(werte) <= n:
        return None
    r = [math.log(b / a) for a, b in zip(werte[-n - 1:], werte[-n:])]
    m = sum(r) / n
    return math.sqrt(sum((x - m) ** 2 for x in r) / (n - 1) * 252) * 100


def rendite(werte: list, tage: int) -> float | None:
    return (werte[-1] / werte[-tage - 1] - 1) * 100 if len(werte) > tage else None


def adx(hoch: list, tief: list, schluss: list, n=14) -> float | None:
    """Average Directional Index nach Wilder: Trendstärke 0–100, unabhängig von der Richtung."""
    if len(schluss) < 2 * n + 1:
        return None
    tr, plus, minus = [], [], []
    for i in range(1, len(schluss)):
        auf, ab = hoch[i] - hoch[i - 1], tief[i - 1] - tief[i]
        plus.append(auf if auf > ab and auf > 0 else 0.0)
        minus.append(ab if ab > auf and ab > 0 else 0.0)
        tr.append(max(hoch[i] - tief[i], abs(hoch[i] - schluss[i - 1]), abs(tief[i] - schluss[i - 1])))
    atr, p, m = sum(tr[:n]), sum(plus[:n]), sum(minus[:n])
    dx = []
    for i in range(n, len(tr)):
        atr, p, m = atr - atr / n + tr[i], p - p / n + plus[i], m - m / n + minus[i]
        pdi, mdi = 100 * p / atr if atr else 0, 100 * m / atr if atr else 0
        dx.append(100 * abs(pdi - mdi) / (pdi + mdi) if pdi + mdi else 0)
    if len(dx) < n:
        return None
    wert = sum(dx[:n]) / n
    for d in dx[n:]:
        wert = (wert * (n - 1) + d) / n
    return wert


def markt_rendite(markt: list, ab_datum: str) -> float | None:
    """Rendite des Vergleichsmarkts seit einem Datum (erster Handelstag ab dann)."""
    start = next((k for d, k, *_ in markt if d >= ab_datum), None)
    return (markt[-1][1] / start - 1) * 100 if start and markt else None


# --- Bewertung --------------------------------------------------------------
def _stufe(wert, grenzen, texte):
    """Wert → Punkte −2 … +2 anhand absteigender Grenzen."""
    for (grenze, punkte), text in zip(grenzen, texte):
        if wert >= grenze:
            return punkte, text
    return grenzen[-1][1], texte[-1]


def _pct(v: float) -> str:
    return f"{'+' if v > 0 else '−' if v < 0 else ''}{abs(v):.1f} %".replace(".", ",")


TREND_IDS, OSZILLATOR_IDS = ("sma200", "sma50", "kreuz", "macd", "mom", "rs"), ("rsi", "boll")


def signale(werte: list, hoch: list | None = None, tief: list | None = None,
            markt_3m: float | None = None) -> list:
    """Einzelne Indikatoren mit Punkten (−2 … +2), Gewicht und Begründung."""
    kurs, out = werte[-1], []

    s200 = sma(werte, 200)
    if s200:
        abst = (kurs / s200 - 1) * 100
        p, t = _stufe(abst, [(5, 2), (0, 1), (-5, -1), (-math.inf, -2)],
                      ["Kurs klar über dem 200-Tage-Schnitt: intakter Aufwärtstrend",
                       "Kurs knapp über dem 200-Tage-Schnitt",
                       "Kurs knapp unter dem 200-Tage-Schnitt",
                       "Kurs deutlich unter dem 200-Tage-Schnitt: Abwärtstrend"])
        out.append({"id": "sma200", "name": "Trend 200 Tage", "wert": _pct(abst) + " zum SMA 200",
                    "punkte": p, "gewicht": 1.5, "text": t})

    s50 = sma(werte, 50)
    if s50:
        abst = (kurs / s50 - 1) * 100
        p, t = _stufe(abst, [(3, 2), (0, 1), (-3, -1), (-math.inf, -2)],
                      ["Kurzfristig stark: klar über dem 50-Tage-Schnitt",
                       "Kurzfristig leicht über dem 50-Tage-Schnitt",
                       "Kurzfristig leicht unter dem 50-Tage-Schnitt",
                       "Kurzfristig schwach: klar unter dem 50-Tage-Schnitt"])
        out.append({"id": "sma50", "name": "Trend 50 Tage", "wert": _pct(abst) + " zum SMA 50",
                    "punkte": p, "gewicht": 1.0, "text": t})

    if s50 and s200:
        gold = s50 > s200
        out.append({"id": "kreuz", "name": "SMA 50 / 200", "wert": "Golden Cross" if gold else "Death Cross",
                    "punkte": 1 if gold else -1, "gewicht": 1.0,
                    "text": "50-Tage-Linie über der 200-Tage-Linie" if gold
                    else "50-Tage-Linie unter der 200-Tage-Linie"})

    r = rsi(werte)
    if r is not None:
        if r < 30:
            p, t = 2, "Überverkauft: Kurs ist stark gefallen, Gegenbewegung wahrscheinlicher"
        elif r < 40:
            p, t = 1, "Eher günstig: Verkaufsdruck lässt nach"
        elif r <= 60:
            p, t = 0, "Neutraler Bereich"
        elif r <= 70:
            p, t = -1, "Schon gut gelaufen, Luft wird dünner"
        else:
            p, t = -2, "Überkauft: Rücksetzer wahrscheinlicher"
        out.append({"id": "rsi", "name": "RSI 14", "wert": f"{r:.0f}", "punkte": p, "gewicht": 1.0, "text": t})

    m = macd(werte)
    if m:
        steigt = m["hist"] > m["hist_vorher"]
        if m["hist"] > 0:
            p, t = (2, "Momentum positiv und nimmt zu") if steigt else (1, "Momentum positiv, lässt aber nach")
        else:
            p, t = (-1, "Momentum negativ, dreht aber nach oben") if steigt else (-2, "Momentum negativ und fällt weiter")
        out.append({"id": "macd", "name": "MACD 12/26/9",
                    "wert": ("über" if m["hist"] > 0 else "unter") + " Signallinie" + (" ↗" if steigt else " ↘"),
                    "punkte": p, "gewicht": 1.0, "text": t})

    r3 = rendite(werte, 63)
    if r3 is not None:
        p, t = _stufe(r3, [(10, 2), (3, 1), (-3, 0), (-10, -1), (-math.inf, -2)],
                      ["Starkes Plus in den letzten drei Monaten", "Leichtes Plus in drei Monaten",
                       "Seitwärts in den letzten drei Monaten", "Leichtes Minus in drei Monaten",
                       "Deutliches Minus in drei Monaten"])
        out.append({"id": "mom", "name": "Momentum 3 Monate", "wert": _pct(r3), "punkte": p, "gewicht": 1.0, "text": t})

    b = bollinger_b(werte)
    if b is not None:
        if b < 0:
            p, t = 2, "Unter dem unteren Bollinger-Band: ungewöhnlich tief"
        elif b < 0.2:
            p, t = 1, "Nahe am unteren Band: eher günstiger Einstieg"
        elif b <= 0.8:
            p, t = 0, "Innerhalb der üblichen Schwankung"
        elif b <= 1:
            p, t = -1, "Nahe am oberen Band: eher teurer Einstieg"
        else:
            p, t = -2, "Über dem oberen Band: kurzfristig überdehnt"
        out.append({"id": "boll", "name": "Bollinger %B", "wert": f"{b:.2f}".replace(".", ","),
                    "punkte": p, "gewicht": 0.5, "text": t})

    if r3 is not None and markt_3m is not None:
        diff = r3 - markt_3m
        p, t = _stufe(diff, [(5, 2), (1, 1), (-1, 0), (-5, -1), (-math.inf, -2)],
                      ["Deutlich stärker als der Weltmarkt", "Etwas stärker als der Weltmarkt",
                       "Läuft wie der Weltmarkt", "Etwas schwächer als der Weltmarkt",
                       "Deutlich schwächer als der Weltmarkt"])
        out.append({"id": "rs", "name": "Relative Stärke 3 M.", "wert": _pct(diff) + " vs. MSCI World",
                    "punkte": p, "gewicht": 1.0, "text": t})

    a = adx(hoch, tief, werte) if hoch and tief and len(hoch) == len(werte) else None
    if a is not None:                                     # ADX gewichtet: im Trend zählen Trendsignale mehr
        if a >= 25:
            f_trend, f_osz, t = 1.3, 0.6, "Starker Trend: Trendsignale zählen mehr, RSI/Bollinger weniger"
        elif a < 20:
            f_trend, f_osz, t = 0.8, 1.3, "Kein klarer Trend: RSI/Bollinger zählen mehr"
        else:
            f_trend, f_osz, t = 1.0, 1.0, "Mäßiger Trend: normale Gewichtung"
        for s in out:
            s["gewicht"] = round(s["gewicht"] * (f_trend if s["id"] in TREND_IDS else f_osz if s["id"] in OSZILLATOR_IDS else 1), 2)
        out.append({"id": "adx", "name": "ADX 14 (Trendstärke)", "wert": f"{a:.0f}", "punkte": 0,
                    "gewicht": 0, "info": True, "text": t})
    return out


def revisionen(a: dict | None) -> float | None:
    """−1 … +1: Wurden die Gewinnschätzungen zuletzt angehoben oder gesenkt?"""
    if not a:
        return None
    teile = []
    hoch, runter = a.get("rev_hoch") or 0, a.get("rev_runter") or 0
    if hoch + runter:
        teile.append((hoch - runter) / (hoch + runter))
    if a.get("eps_jetzt") and a.get("eps_vor90"):
        teile.append(max(-1.0, min(1.0, (a["eps_jetzt"] / a["eps_vor90"] - 1) * 100 / 5)))   # ±5 % = voll
    return sum(teile) / len(teile) if teile else None


def analysten_score(a: dict | None) -> tuple:
    """(Score 0–100 oder None, Kurspotenzial in %)"""
    if not a:
        return None, None
    anzahl = sum(a.get(k) or 0 for k in ("stark_kaufen", "kaufen", "halten", "verkaufen", "stark_verkaufen"))
    mittel = a.get("mittel")
    if mittel is None and anzahl:
        mittel = (a["stark_kaufen"] * 1 + a["kaufen"] * 2 + a["halten"] * 3
                  + a["verkaufen"] * 4 + a["stark_verkaufen"] * 5) / anzahl
    if mittel is None:
        return None, None
    potenzial = (a["kursziel"] / a["kurs"] - 1) * 100 if a.get("kursziel") and a.get("kurs") else None
    teile = [((3 - mittel) / 2, 0.45)]                              # 1 → +1, 3 → 0, 5 → −1
    if potenzial is not None:
        teile.append((max(-1.0, min(1.0, potenzial / 25)), 0.30))  # ±25 % Kursziel = volle Punkte
    rev = revisionen(a)
    if rev is not None:
        teile.append((rev, 0.25))
    x = sum(v * g for v, g in teile) / sum(g for _, g in teile)
    return round(50 + 50 * max(-1.0, min(1.0, x))), potenzial


def urteil(score: float) -> tuple:
    return next((t, ton) for grenze, t, ton in URTEILE if score >= grenze)


def buy_the_dip(werte: list, analysten: dict | None, tage_bis_zahlen: int | None) -> dict:
    """Ist der Rücksetzer eine Kaufgelegenheit im intakten Trend oder ein fallendes Messer?"""
    if len(werte) < 60:
        return {"status": None}
    kurs, hoch20 = werte[-1], max(werte[-20:])
    rueckgang = (kurs / hoch20 - 1) * 100
    vola_tag = (volatilitaet(werte) or 25) / math.sqrt(252)
    schwelle = max(5.0, 3.5 * vola_tag)                    # was für diese Aktie ein echter Rücksetzer ist
    if rueckgang > -schwelle:
        return {"status": None, "rueckgang": rueckgang, "schwelle": schwelle}
    s200 = sma(werte, 200)
    s200_vorher = sma(werte[:-20], 200)
    r = rsi(werte)
    mittel = (analysten or {}).get("mittel")
    pruef = [
        {"id": "trend", "name": "Langfristtrend intakt",
         "ok": bool(s200 and (kurs > s200 or (s200_vorher and s200 > s200_vorher))),
         "text": ("zu wenig Daten" if not s200 else "Kurs über dem 200-Tage-Schnitt" if kurs > s200
                  else "Kurs unter dem 200-Tage-Schnitt, der aber noch steigt" if s200_vorher and s200 > s200_vorher
                  else "Kurs unter dem fallenden 200-Tage-Schnitt")},
        {"id": "rsi", "name": "Überverkauft", "ok": r is not None and r < 40,
         "text": f"RSI {r:.0f}" + (" unter 40" if r is not None and r < 40 else ", noch nicht unter 40") if r is not None else "–"},
        {"id": "stabil", "name": "Stabilisiert sich", "ok": kurs > min(werte[-4:-1]) and kurs > werte[-2],
         "text": "Heute im Plus und über dem Tief der letzten Tage" if kurs > werte[-2] else "Fällt weiter"},
        {"id": "analysten", "name": "Analysten positiv", "ok": mittel is not None and mittel <= 2.5,
         "text": f"Ø Empfehlung {mittel:.1f} (1 = stark kaufen)".replace(".", ",") if mittel else "keine Daten"},
    ]
    erfuellt = sum(p["ok"] for p in pruef)
    if not pruef[0]["ok"]:
        status, text = "messer", "Fallendes Messer: Rücksetzer im Abwärtstrend. Lieber abwarten."
    elif erfuellt >= 3:
        status, text = "chance", "Buy the Dip: Rücksetzer im intakten Aufwärtstrend."
    else:
        status, text = "beobachten", "Rücksetzer im Trend, aber noch nicht reif: beobachten."
    warnung = (f"Quartalszahlen in {tage_bis_zahlen} Tagen: erhöhte Schwankung möglich."
               if tage_bis_zahlen is not None and 0 <= tage_bis_zahlen <= 7 else None)
    return {"status": status, "text": text, "rueckgang": rueckgang, "schwelle": schwelle, "hoch20": hoch20,
            "pruef": pruef, "erfuellt": erfuellt, "warnung": warnung,
            "zone": [round(min(werte[-20:]), 2), round(s200, 2)] if s200 and s200 < kurs else None}


def _fortschreiben(tage: list, live: float | None, heute: str) -> list:
    """Tageskurse (Datum, Schluss[, Hoch, Tief]) um den Live-Kurs von heute ergänzen."""
    tage = [t if len(t) >= 4 else (t[0], t[1], t[1], t[1]) for t in tage]
    if live:
        if tage and tage[-1][0] == heute:
            d, _, h, l = tage[-1]
            tage[-1] = (heute, live, max(h, live), min(l, live))
        else:
            tage.append((heute, live, live, live))
    return tage


def bewerten(tage: list, live: float | None, analysten: dict | None, heute: str | None = None,
             markt: list | None = None) -> dict:
    """Gesamturteil aus Tageskursen, Live-Kurs, Analystendaten und Vergleichsmarkt."""
    heute = heute or datetime.now().date().isoformat()
    tage = _fortschreiben(tage, live, heute)
    werte = [t[1] for t in tage]
    if len(werte) < 2:
        return {"ok": False, "text": "Noch keine Kursdaten für eine Analyse."}
    markt_3m = markt_rendite(markt, tage[-64][0]) if markt and len(tage) > 64 else None
    sig = signale(werte, [t[2] for t in tage], [t[3] for t in tage], markt_3m)
    wertend = [s for s in sig if not s.get("info")]
    gew = sum(s["gewicht"] for s in wertend)
    technik = round(50 + 50 * sum(s["punkte"] * s["gewicht"] for s in wertend) / (2 * gew)) if gew else None
    an_score, potenzial = analysten_score(analysten)
    teile = [(sc, g) for sc, g in ((technik, GEWICHT_TECHNIK), (an_score, GEWICHT_ANALYSTEN)) if sc is not None]
    if not teile:
        return {"ok": False, "text": f"Zu wenig Kursdaten ({len(werte)} Tage) für Indikatoren."}
    score = round(sum(sc * g for sc, g in teile) / sum(g for _, g in teile))
    text, ton = urteil(score)

    zahlen = (analysten or {}).get("zahlen")
    bis_zahlen = (datetime.fromisoformat(zahlen).date() - datetime.fromisoformat(heute).date()).days if zahlen else None
    rev = revisionen(analysten)
    jahr = werte[-252:]
    positiv = sorted((s for s in wertend if s["punkte"] > 0), key=lambda s: -s["punkte"] * s["gewicht"])
    negativ = sorted((s for s in wertend if s["punkte"] < 0), key=lambda s: s["punkte"] * s["gewicht"])
    return {
        "ok": True, "score": score, "urteil": text, "ton": ton,
        "technik": technik, "analysten_score": an_score, "potenzial": potenzial, "revisionen": rev,
        "signale": sig, "analysten": analysten, "dip": buy_the_dip(werte, analysten, bis_zahlen),
        "pro": [s["text"] for s in positiv[:2]], "contra": [s["text"] for s in negativ[:2]],
        "kennzahlen": {
            "kurs": werte[-1], "tage": len(werte), "stand": tage[-1][0],
            "hoch52": max(jahr), "tief52": min(jahr), "vom_hoch": (werte[-1] / max(jahr) - 1) * 100,
            "vola": volatilitaet(werte), "r1m": rendite(werte, 21), "r3m": rendite(werte, 63),
            "r1j": rendite(werte, 252), "rsi": rsi(werte), "markt_3m": markt_3m,
            "sma50": sma(werte, 50), "sma200": sma(werte, 200), "zahlen": zahlen, "bis_zahlen": bis_zahlen},
    }


def chartreihe(tage: list, live: float | None = None, heute: str | None = None, n=260) -> list:
    """Letztes Jahr als {d, k, s50, s200} für den Analyse-Chart."""
    heute = heute or datetime.now().date().isoformat()
    tage = _fortschreiben(tage, live, heute)
    werte = [t[1] for t in tage]
    out = []
    for i in range(max(0, len(tage) - n), len(tage)):
        bis = werte[:i + 1]
        out.append({"d": tage[i][0], "k": round(werte[i], 2),
                    "s50": round(sma(bis, 50), 2) if len(bis) >= 50 else None,
                    "s200": round(sma(bis, 200), 2) if len(bis) >= 200 else None})
    return out
