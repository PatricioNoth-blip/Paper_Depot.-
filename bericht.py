"""
Wochenbericht: Was hat sich in den letzten 7 Tagen getan, und wie sind deine Käufe seitdem gelaufen?
Die Käufe werden nach dem Score zum Kaufzeitpunkt getrennt. So lässt sich prüfen, ob die
Einschätzung etwas taugt.
"""

from __future__ import annotations

from datetime import datetime, timedelta


def wochenbericht(depot: dict, depot_verlauf: list, quotes: dict, vor_einer_woche: dict,
                  analyse: dict, jetzt: datetime) -> dict:
    """depot_verlauf: [{"t": ms, "w": Gesamtwert, "g": Gewinn}] aufsteigend
    vor_einer_woche: Symbol → Kurs vor 5 Handelstagen
    analyse: Symbol → Kurzanalyse (Score, Urteil, Dip)"""
    grenze = jetzt - timedelta(days=7)
    grenze_ms = grenze.timestamp() * 1000
    namen = {u["symbol"]: u["name"] for u in depot.get("universum", [])}

    # Depotwert: letzter Stand vor einer Woche (oder der erste bekannte) gegen jetzt
    alt = next((p for p in reversed(depot_verlauf) if p["t"] <= grenze_ms), depot_verlauf[0] if depot_verlauf else None)
    neu = depot_verlauf[-1] if depot_verlauf else None
    wert = None
    if alt and neu:
        diff = neu["g"] - alt["g"]                         # Gewinnveränderung: Ein-/Auszahlungen zählen nicht mit
        wert = {"jetzt": neu["w"], "diff": diff, "pct": diff / alt["w"] * 100 if alt["w"] else None,
                "seit": datetime.fromtimestamp(alt["t"] / 1000).isoformat(timespec="minutes")}

    # Positionen: Wochenveränderung
    positionen = []
    for p in depot.get("positionen", []):
        k, v = (quotes.get(p["symbol"]) or {}).get("last"), vor_einer_woche.get(p["symbol"])
        if k and v:
            positionen.append({"symbol": p["symbol"], "name": p["name"], "pct": (k / v - 1) * 100,
                               "eur": p["anteile"] * (k - v)})
    positionen.sort(key=lambda x: -x["pct"])

    # Orders der Woche
    woche = [o for o in depot.get("orders", []) if _zeit(o["zeit"]) >= grenze and o.get("quelle") != "start"]
    orders = {"kaeufe": sum(o["richtung"] == "kaufen" for o in woche),
              "verkaeufe": sum(o["richtung"] == "verkaufen" for o in woche),
              "volumen": sum(o["stueck"] * o["kurs"] for o in woche),
              "automatisch": sum(o.get("quelle") in ("auto-dip", "sparplan", "limit_kauf", "limit_verkauf", "stop", "trailing")
                                 for o in woche)}

    # Wie sind deine Käufe gelaufen? Getrennt nach Score beim Kauf
    kaeufe = []
    for o in depot.get("orders", []):
        k = (quotes.get(o["symbol"]) or {}).get("bid") or (quotes.get(o["symbol"]) or {}).get("last")
        if o["richtung"] != "kaufen" or not k or o.get("quelle") == "start":
            continue
        kaeufe.append({"zeit": o["zeit"], "symbol": o["symbol"], "name": namen.get(o["symbol"], o["symbol"]),
                       "kurs": o["kurs"], "pct": (k / o["kurs"] - 1) * 100,
                       "score": (o.get("analyse") or {}).get("score"), "quelle": o.get("quelle")})
    kaeufe.sort(key=lambda x: x["zeit"], reverse=True)
    def schnitt(liste):
        return {"anzahl": len(liste), "pct": sum(x["pct"] for x in liste) / len(liste) if liste else None}
    mit_score = [x for x in kaeufe if x["score"] is not None]
    vergleich = {"gut": schnitt([x for x in mit_score if x["score"] >= 58]),
                 "schwach": schnitt([x for x in mit_score if x["score"] < 58])}

    signale = [m for m in depot.get("meldungen", []) if _zeit(m["zeit"]) >= grenze and m["art"] in ("chance", "messer")]
    dips = [{"symbol": s, "name": namen.get(s, s), "status": (a.get("dip") or {}).get("status"),
             "score": a.get("score"), "urteil": a.get("urteil")}
            for s, a in analyse.items() if a.get("ok") and (a.get("dip") or {}).get("status") == "chance"]
    return {"von": grenze.date().isoformat(), "bis": jetzt.date().isoformat(), "wert": wert,
            "positionen": positionen, "orders": orders, "kaeufe": kaeufe[:8], "vergleich": vergleich,
            "signale": signale, "dips_jetzt": dips}


def _zeit(text: str) -> datetime:
    t = datetime.fromisoformat(text)
    return t.replace(tzinfo=None) if t.tzinfo is None else t.astimezone().replace(tzinfo=None)
