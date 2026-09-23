"""
Demo-Modus: erfundene, aber reproduzierbare Kurse und Analystendaten, damit die
Oberfläche ohne Internet vorgeführt werden kann (python depot_live.py --demo).
Die Demo-Daten liegen getrennt im Ordner demo/, das echte Depot bleibt unberührt.
"""

from __future__ import annotations

import math
import random
from datetime import date, timedelta

# Verlauf in Abschnitten: (Handelstage, Gesamtveränderung in %), dazu Schlusskurs gestern
PROFILE = {
    # Langer Aufwärtstrend, dann ein kräftiger Rücksetzer, der sich gerade fängt: Buy the Dip
    "AMZN": {"ende": 222.10, "rauschen": 1.2, "seed": 8,
             "abschnitte": [(260, -6), (140, 14), (82, 21), (13, -11), (3, 1.2)]},
    # Steile Rally, inzwischen heiß gelaufen
    "META": {"ende": 648.40, "rauschen": 1.6, "seed": 11,
             "abschnitte": [(260, 10), (160, 6), (60, 14), (19, 9)]},
    # Seit Monaten schwächer, jetzt noch ein Einbruch: fallendes Messer
    "MSFT": {"ende": 441.20, "rauschen": 1.1, "seed": 3,
             "abschnitte": [(260, 18), (140, 4), (85, -8), (14, -8)]},
    # Vergleichsmarkt MSCI World in Euro
    "EUNL.DE": {"ende": 104.80, "rauschen": 0.8, "seed": 1, "abschnitte": [(260, 9), (240, 11)]},
}

ANALYSTEN = {
    "AMZN": {"stark_kaufen": 24, "kaufen": 44, "halten": 5, "verkaufen": 1, "stark_verkaufen": 0,
             "mittel": 1.6, "anzahl": 74, "kursziel": 285.0, "kursziel_hoch": 330.0,
             "kursziel_tief": 215.0, "kurs": 246.5, "rev_hoch": 18, "rev_runter": 3,
             "eps_jetzt": 7.12, "eps_vor90": 6.81, "zahlen_in": 36},
    "META": {"stark_kaufen": 14, "kaufen": 40, "halten": 10, "verkaufen": 2, "stark_verkaufen": 1,
             "mittel": 1.9, "anzahl": 67, "kursziel": 760.0, "kursziel_hoch": 900.0,
             "kursziel_tief": 540.0, "kurs": 720.0, "rev_hoch": 9, "rev_runter": 7,
             "eps_jetzt": 27.4, "eps_vor90": 27.1, "zahlen_in": 34},
    "MSFT": {"stark_kaufen": 12, "kaufen": 38, "halten": 8, "verkaufen": 0, "stark_verkaufen": 0,
             "mittel": 1.8, "anzahl": 58, "kursziel": 560.0, "kursziel_hoch": 650.0,
             "kursziel_tief": 470.0, "kurs": 490.0, "rev_hoch": 4, "rev_runter": 11,
             "eps_jetzt": 14.2, "eps_vor90": 14.6, "zahlen_in": 5},
}


def _zahl(text: str) -> int:
    """Stabile Zahl aus einem Text (Pythons hash() ändert sich bei jedem Start)."""
    return sum((i + 1) * ord(c) * 7919 for i, c in enumerate(text))


def profil(symbol: str) -> dict:
    if symbol in PROFILE:
        return PROFILE[symbol]
    rnd = random.Random(_zahl(symbol))
    return {"ende": round(rnd.uniform(30, 400), 2), "rauschen": rnd.uniform(1.0, 2.0), "seed": _zahl(symbol),
            "abschnitte": [(260, rnd.uniform(-15, 30)), (180, rnd.uniform(-10, 25)), (60, rnd.uniform(-12, 12))]}


def handelstage(bis: date, anzahl: int) -> list:
    tage, d = [], bis
    while len(tage) < anzahl:
        if d.weekday() < 5:
            tage.append(d)
        d -= timedelta(days=1)
    return tage[::-1]


def tageskurse(symbol: str, heute: date) -> list:
    """[(Datum ISO, Schluss, Hoch, Tief), ...] bis gestern."""
    p = profil(symbol)
    rnd = random.Random(p["seed"])
    renditen = []
    for tage, gesamt in p["abschnitte"]:
        drift = math.log(1 + gesamt / 100) / tage
        roh = [rnd.gauss(0, p["rauschen"] / 100) for _ in range(tage)]
        mittel = sum(roh) / tage                                   # Rauschen zentrieren: Abschnitt trifft sein Ziel
        renditen += [drift + r - mittel for r in roh]
    werte, log = [], 0.0
    for r in reversed(renditen):                                   # rückwärts vom Schlusskurs gestern
        werte.append(p["ende"] * math.exp(-log))
        log += r
    werte.reverse()
    tage = handelstage(heute - timedelta(days=1), len(werte))
    out = []
    for d, k in zip(tage, werte):
        spanne = k * p["rauschen"] / 100 * rnd.uniform(0.4, 1.1)   # Tagesspanne um den Schluss
        out.append((d.isoformat(), round(k, 2), round(k + spanne * rnd.random(), 2), round(k - spanne * rnd.random(), 2)))
    return out


def analysten(symbol: str, heute: date) -> dict | None:
    a = ANALYSTEN.get(symbol)
    if a is None:                                                  # erfundene, aber stabile Werte für jede Aktie
        rnd = random.Random(_zahl(symbol) + 1)
        n = rnd.randint(12, 45)
        teile = [rnd.random() * g for g in (1.2, 2.0, 1.4, 0.4, 0.15)]
        zahlen = [round(n * t / sum(teile)) for t in teile]
        kurs = profil(symbol)["ende"]
        ziel = kurs * rnd.uniform(0.95, 1.25)
        a = {"stark_kaufen": zahlen[0], "kaufen": zahlen[1], "halten": zahlen[2], "verkaufen": zahlen[3],
             "stark_verkaufen": zahlen[4], "mittel": None, "anzahl": sum(zahlen), "kursziel": round(ziel, 2),
             "kursziel_hoch": round(ziel * 1.2, 2), "kursziel_tief": round(ziel * 0.75, 2), "kurs": kurs,
             "rev_hoch": rnd.randint(0, 12), "rev_runter": rnd.randint(0, 12), "zahlen_in": rnd.randint(3, 80),
             "waehrung": "EUR"}
    a = dict(a)
    a["zahlen"] = (heute + timedelta(days=a.pop("zahlen_in"))).isoformat()
    return {"waehrung": "USD", **a, "quelle": "Demo-Werte", "stand": heute.isoformat()}


class Kurse:
    """Live-Kurse, die sich bei jedem Abruf ein wenig bewegen."""

    START = {"AMZN": 224.20, "META": 652.80, "MSFT": 438.90}

    def __init__(self):
        self.rnd = random.Random(42)
        self.letzte = dict(self.START)

    def holen(self, universum: list) -> dict:
        out = {}
        for p in universum:
            s = p["symbol"]
            k = self.letzte.get(s) or profil(s)["ende"]
            k = round(k * (1 + self.rnd.gauss(0, 0.0006)), 2)
            self.letzte[s] = k
            out[s] = {"last": k, "bid": round(k * 0.9996, 2), "ask": round(k * 1.0004, 2)}
        return out


def tagesverlauf(universum: list, positionen: list, cash: float, eingezahlt: float, jetzt) -> tuple:
    """Erfundener Kursverlauf seit Handelsbeginn (alle 5 Minuten), damit die 1T-Charts nicht leer sind.
    Gibt Zeilen für papiere.csv und kurse.csv zurück; endet beim Startkurs von Kurse."""
    start = jetzt.replace(hour=7, minute=30, second=0, microsecond=0)
    schritte = max(2, int((jetzt - start).total_seconds() // 300))
    rnd, pfade = random.Random(5), {}
    for p in universum:
        s = p["symbol"]
        a = profil(s)["ende"]
        z = Kurse.START.get(s, a)
        weg, w = [0.0], 0.0
        for _ in range(schritte):
            w += rnd.gauss(0, 0.0012)
            weg.append(w)
        # Brownsche Brücke: beginnt beim Schluss gestern, endet beim Startkurs
        pfade[s] = [a * math.exp(math.log(z / a) * i / schritte + weg[i] - weg[-1] * i / schritte)
                    for i in range(schritte + 1)]
    papiere, depot = [], []
    kauf = jetzt.replace(hour=10, minute=20, second=50)
    for i in range(schritte + 1):
        t = start + timedelta(minutes=5 * i)
        zeit = t.isoformat(timespec="seconds")
        for s, pfad in pfade.items():
            papiere.append([zeit, s, round(pfad[i], 4), round(pfad[i] * 0.9996, 2), round(pfad[i] * 1.0004, 2)])
        if t >= kauf:
            wert = cash + sum(p["anteile"] * pfade[p["symbol"]][i] for p in positionen if p["symbol"] in pfade)
            depot.append([zeit, round(wert, 2), round(wert - eingezahlt, 2)])
    return papiere, depot
