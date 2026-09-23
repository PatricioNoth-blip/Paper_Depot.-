"""
Offene Aufträge und Kursalarme. Hier steht nur die Prüflogik; ausgeführt wird in depot_live.py.

Aufträge (gelten, bis sie ausgelöst oder gelöscht werden):
  limit_kauf     kaufen, sobald der Briefkurs auf das Limit oder darunter fällt
  limit_verkauf  verkaufen, sobald der Geldkurs das Limit erreicht (Take-Profit)
  stop           verkaufen, sobald der Geldkurs auf den Stopp oder darunter fällt (Stop-Loss)
  trailing       Stop-Loss, der mit dem höchsten Kurs seit Anlage nach oben wandert

Ausgeführt wird dann zum aktuellen Kurs (wie eine Market-Order), nicht exakt zum Limit.
"""

from __future__ import annotations

import time

ARTEN = {"limit_kauf": "Limit-Kauf", "limit_verkauf": "Take-Profit", "stop": "Stop-Loss", "trailing": "Trailing-Stop"}
ALARM_ARTEN = {"ueber": "Kurs über", "unter": "Kurs unter", "einschaetzung": "Einschätzung ändert sich"}


def neue_id(praefix: str) -> str:
    return f"{praefix}-{int(time.time() * 1000)}"


def pruefe_eingabe(art: str, limit, abstand, richtung_ok: bool) -> str | None:
    """Fehlertext oder None."""
    if art not in ARTEN:
        return "Unbekannte Auftragsart."
    if not richtung_ok:
        return "Verkaufsaufträge gehen nur für Aktien im Depot."
    if art == "trailing":
        if not abstand or not 0.5 <= abstand <= 50:
            return "Der Abstand muss zwischen 0,5 und 50 % liegen."
    elif not limit or limit <= 0:
        return "Bitte einen Kurs größer als 0 € angeben."
    return None


def stoppkurs(a: dict) -> float | None:
    """Aktueller Auslösekurs: fest oder beim Trailing-Stop aus dem Höchstkurs."""
    if a["art"] == "trailing":
        return round(a["hoechst"] * (1 - a["abstand"] / 100), 2) if a.get("hoechst") else None
    return a.get("limit")


def ausgeloest(a: dict, q: dict) -> bool:
    """Prüft einen Auftrag gegen den aktuellen Kurs. Beim Trailing-Stop wird dabei der Höchstkurs nachgezogen."""
    geld, brief = q.get("bid") or q.get("last"), q.get("ask") or q.get("last")
    if not geld or not brief:
        return False
    if a["art"] == "limit_kauf":
        return brief <= a["limit"]
    if a["art"] == "limit_verkauf":
        return geld >= a["limit"]
    if a["art"] == "stop":
        return geld <= a["limit"]
    if a["art"] == "trailing":
        a["hoechst"] = max(a.get("hoechst") or geld, geld)
        return geld <= stoppkurs(a)
    return False


def _de(v: float) -> str:
    return f"{v:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


_kandidat: dict = {}                # Alarm-ID → (Urteil, Anzahl Abfragen in Folge)


def alarm_ausgeloest(alarm: dict, q: dict, analyse: dict | None) -> str | None:
    """Text der Meldung, wenn der Alarm auslöst, sonst None."""
    kurs = q.get("last")
    if alarm["art"] == "ueber" and kurs and kurs >= alarm["wert"]:
        return f"Kurs {_de(kurs)} € hat {_de(alarm['wert'])} € erreicht."
    if alarm["art"] == "unter" and kurs and kurs <= alarm["wert"]:
        return f"Kurs {_de(kurs)} € ist auf {_de(alarm['wert'])} € gefallen."
    if alarm["art"] == "einschaetzung" and analyse and analyse.get("ok"):
        urteil = analyse["urteil"]
        alt, n = _kandidat.get(alarm["id"], (None, 0))
        _kandidat[alarm["id"]] = (urteil, n + 1 if alt == urteil else 1)
        if alarm.get("urteil") is None:
            alarm["urteil"] = urteil
        elif urteil != alarm["urteil"] and _kandidat[alarm["id"]][1] >= 3:   # 3 Abfragen stabil
            text = f"Einschätzung jetzt „{urteil}“ (vorher „{alarm['urteil']}“), Score {analyse['score']}."
            alarm["urteil"] = urteil
            return text
    return None
