"""
Mehrere Depots: jedes hat einen eigenen Ordner mit depot.json, kurse.csv und papiere.csv.

    depots/index.json         {"aktiv": "<id>", "depots": [{"id", "titel", "angelegt", "wert"}]}
    depots/<id>/depot.json    Konto, Positionen, Orders, Aufträge, Alarme …

Ein altes Einzeldepot (depot.json direkt im Programmordner) wird beim ersten Start
als „Hauptdepot“ übernommen.
"""

from __future__ import annotations

import json
import re
import shutil
from datetime import datetime
from pathlib import Path

import katalog

BASIS = [Path(".")]                 # wird beim Start gesetzt (Programmordner bzw. demo/)
DATEIEN = ("depot.json", "kurse.csv", "papiere.csv")


def ordner(depot_id: str) -> Path:
    return BASIS[0] / "depots" / depot_id


def _index_datei() -> Path:
    return BASIS[0] / "depots" / "index.json"


def index() -> dict:
    d = _index_datei()
    return json.loads(d.read_text(encoding="utf-8")) if d.exists() else {"aktiv": None, "depots": []}


def index_speichern(ix: dict):
    _index_datei().parent.mkdir(parents=True, exist_ok=True)
    _index_datei().write_text(json.dumps(ix, indent=1, ensure_ascii=False), encoding="utf-8")


def uebernehmen(titel="Hauptdepot") -> bool:
    """Altes Einzeldepot in den Ordner depots/haupt verschieben. True, wenn es eins gab."""
    alt = BASIS[0] / "depot.json"
    if not alt.exists() or index()["depots"]:
        return False
    ziel = ordner("haupt")
    ziel.mkdir(parents=True, exist_ok=True)
    for name in DATEIEN:
        if (BASIS[0] / name).exists():
            shutil.move(str(BASIS[0] / name), str(ziel / name))
    depot = json.loads((ziel / "depot.json").read_text(encoding="utf-8"))
    index_speichern({"aktiv": "haupt", "depots": [{"id": "haupt", "titel": depot.get("titel") or titel,
                                                   "angelegt": datetime.now().isoformat(timespec="seconds")}]})
    return True


def _neue_id(titel: str) -> str:
    basis = re.sub(r"[^a-z0-9]+", "-", titel.lower().replace("ä", "ae").replace("ö", "oe")
                   .replace("ü", "ue").replace("ß", "ss")).strip("-")[:30] or "depot"
    vorhanden, kandidat, n = {d["id"] for d in index()["depots"]}, basis, 2
    while kandidat in vorhanden or ordner(kandidat).exists():
        kandidat, n = f"{basis}-{n}", n + 1
    return kandidat


def anlegen(titel: str, cash: float, positionen: list, universum_basis: list, jetzt: str,
            gebuehr: float = 1.0) -> dict:
    """Neues Depot mit Startguthaben und selbst festgelegten Anfangsbeständen.
    positionen: [{"isin", "anteile", "einstand", optional "name", "symbol", "yahoo"}]
    Anfangsbestände werden ohne Gebühr zum angegebenen Kaufkurs eingebucht."""
    titel = (titel or "").strip()[:40]
    if not titel:
        return {"ok": False, "text": "Bitte einen Namen für das Depot angeben."}
    if cash < 0 or cash > 99_999_999:
        return {"ok": False, "text": "Das Startguthaben muss zwischen 0 und 99.999.999 € liegen."}
    universum = [dict(u) for u in universum_basis]
    pos_liste, orders, investiert = [], [], 0.0
    for p in positionen:
        isin = str(p.get("isin", "")).strip().upper()
        try:
            anteile, einstand = float(p.get("anteile")), float(p.get("einstand"))
        except (TypeError, ValueError):
            return {"ok": False, "text": f"Bitte Stückzahl und Kaufkurs für {isin or 'jede Position'} angeben."}
        if not re.match(katalog.ISIN_MUSTER, isin) or anteile <= 0 or einstand <= 0:
            return {"ok": False, "text": f"Ungültige Position: {isin or '(ohne ISIN)'}."}
        eintrag = next((u for u in universum if u["isin"] == isin), None)
        if eintrag is None:
            k = katalog.zu_isin(isin) or {}
            eintrag = {"symbol": k.get("symbol") or p.get("symbol") or isin, "name": k.get("name") or p.get("name") or isin,
                       "isin": isin, "yahoo": k.get("yahoo") or p.get("yahoo"), "branche": k.get("branche", "")}
            universum.append(eintrag)
        if any(x["symbol"] == eintrag["symbol"] for x in pos_liste):
            return {"ok": False, "text": f"{eintrag['name']} steht doppelt in der Liste."}
        wert = round(anteile * einstand, 2)
        investiert += wert
        pos_liste.append({"symbol": eintrag["symbol"], "name": eintrag["name"], "isin": isin,
                          "anteile": round(anteile, 6), "einstand": round(einstand, 4), "investiert": wert, "gebuehr": 0.0})
        orders.append({"zeit": jetzt, "richtung": "kaufen", "symbol": eintrag["symbol"], "stueck": round(anteile, 6),
                       "kurs": round(einstand, 4), "gebuehr": 0.0, "betrag": wert, "fluss": -wert, "quelle": "start"})
    depot_id = _neue_id(titel)
    depot = {"titel": titel, "handelsplatz": "Tradegate", "gebuehr": gebuehr,
             "eingezahlt": round(cash + investiert, 2), "cash": round(cash, 2), "realisiert": 0.0,
             "universum": universum, "positionen": pos_liste, "orders": orders,
             "buchungen": ([{"zeit": jetzt, "art": "einzahlung", "betrag": round(cash, 2)}] if cash > 0 else [])}
    ordner(depot_id).mkdir(parents=True, exist_ok=True)
    (ordner(depot_id) / "depot.json").write_text(json.dumps(depot, indent=1, ensure_ascii=False), encoding="utf-8")
    ix = index()
    ix["depots"].append({"id": depot_id, "titel": titel, "angelegt": jetzt})
    index_speichern(ix)
    return {"ok": True, "text": f"Depot „{titel}“ angelegt.", "id": depot_id}


def umbenennen(depot_id: str, titel: str) -> dict:
    titel = (titel or "").strip()[:40]
    ix = index()
    eintrag = next((d for d in ix["depots"] if d["id"] == depot_id), None)
    if not eintrag or not titel:
        return {"ok": False, "text": "Depot oder Name fehlt."}
    eintrag["titel"] = titel
    index_speichern(ix)
    datei = ordner(depot_id) / "depot.json"
    depot = json.loads(datei.read_text(encoding="utf-8"))
    depot["titel"] = titel
    datei.write_text(json.dumps(depot, indent=1, ensure_ascii=False), encoding="utf-8")
    return {"ok": True, "text": f"Umbenannt in „{titel}“."}


def loeschen(depot_id: str) -> dict:
    """Löscht ein Depot endgültig. Das aktive und das letzte Depot bleiben."""
    ix = index()
    if depot_id == ix["aktiv"]:
        return {"ok": False, "text": "Das geöffnete Depot kann nicht gelöscht werden. Erst zu einem anderen wechseln."}
    if not any(d["id"] == depot_id for d in ix["depots"]):
        return {"ok": False, "text": "Dieses Depot gibt es nicht."}
    ix["depots"] = [d for d in ix["depots"] if d["id"] != depot_id]
    index_speichern(ix)
    shutil.rmtree(ordner(depot_id), ignore_errors=True)
    return {"ok": True, "text": "Depot gelöscht."}


def wert_merken(depot_id: str, wert: float, gv: float):
    """Letzten Gesamtwert für die Depotliste festhalten (die anderen Depots laufen nicht mit)."""
    ix = index()
    for d in ix["depots"]:
        if d["id"] == depot_id:
            d["wert"], d["gv"] = round(wert, 2), round(gv, 2)
    index_speichern(ix)
