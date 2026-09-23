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
    # Langer Aufwärtstrend, zuletzt kurzer Rücksetzer, der gerade dreht
    "AMZN": {"ende": 222.10, "rauschen": 1.25, "seed": 7,
             "abschnitte": [(260, -8), (120, 16), (100, 14), (14, -7), (5, 2.5)]},
    # Steile Rally, inzwischen heiß gelaufen
    "META": {"ende": 648.40, "rauschen": 1.6, "seed": 11,
             "abschnitte": [(260, 10), (160, 6), (60, 14), (19, 9)]},
    # Seit Monaten schwächer, unter den Durchschnitten
    "MSFT": {"ende": 441.20, "rauschen": 1.1, "seed": 3,
             "abschnitte": [(260, 18), (140, 4), (80, -9), (19, -4)]},
}

ANALYSTEN = {
    "AMZN": {"stark_kaufen": 24, "kaufen": 44, "halten": 5, "verkaufen": 1, "stark_verkaufen": 0,
             "mittel": 1.6, "anzahl": 74, "kursziel": 285.0, "kursziel_hoch": 330.0,
             "kursziel_tief": 215.0, "kurs": 246.5},
    "META": {"stark_kaufen": 14, "kaufen": 40, "halten": 10, "verkaufen": 2, "stark_verkaufen": 1,
             "mittel": 1.9, "anzahl": 67, "kursziel": 760.0, "kursziel_hoch": 900.0,
             "kursziel_tief": 540.0, "kurs": 720.0},
    "MSFT": {"stark_kaufen": 12, "kaufen": 38, "halten": 8, "verkaufen": 0, "stark_verkaufen": 0,
             "mittel": 1.8, "anzahl": 58, "kursziel": 560.0, "kursziel_hoch": 650.0,
             "kursziel_tief": 470.0, "kurs": 490.0},
}


def handelstage(bis: date, anzahl: int) -> list:
    tage, d = [], bis
    while len(tage) < anzahl:
        if d.weekday() < 5:
            tage.append(d)
        d -= timedelta(days=1)
    return tage[::-1]


def tageskurse(symbol: str, heute: date) -> list:
    """[(Datum ISO, Schluss), ...] bis gestern."""
    p = PROFILE.get(symbol) or {"ende": 100.0, "rauschen": 1.3, "seed": len(symbol), "abschnitte": [(500, 10)]}
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
    return [(d.isoformat(), round(k, 2)) for d, k in zip(tage, werte)]


def analysten(symbol: str, heute: date) -> dict | None:
    a = ANALYSTEN.get(symbol)
    return {**a, "waehrung": "USD", "quelle": "Demo-Werte", "stand": heute.isoformat()} if a else None


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
            k = self.letzte.get(s) or PROFILE.get(s, {}).get("ende", 100.0)
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
        a, z = PROFILE.get(s, {}).get("ende", 100.0), Kurse.START.get(s, 100.0)
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
