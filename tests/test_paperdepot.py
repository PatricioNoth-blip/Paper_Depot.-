"""Tests für Analyse, Orders, Aufträge, Depots.  Start:  python -m unittest"""

import json
import math
import tempfile
import unittest
from datetime import date, datetime, timedelta
from pathlib import Path

import analyse
import auftraege
import bericht
import demo
import depot_live as d
import depots


def reihe(renditen, start=100.0):
    """Tageskurse (Datum, Schluss, Hoch, Tief) aus täglichen Renditen in %."""
    tage, k, t0 = [], start, date(2024, 1, 1)
    for i, r in enumerate(renditen):
        k *= 1 + r / 100
        tage.append(((t0 + timedelta(days=i)).isoformat(), k, k * 1.005, k * 0.995))
    return tage


class Indikatoren(unittest.TestCase):
    def test_sma_und_rendite(self):
        self.assertEqual(analyse.sma([1, 2, 3, 4], 2), 3.5)
        self.assertIsNone(analyse.sma([1, 2], 3))
        self.assertAlmostEqual(analyse.rendite([100, 110, 121], 2), 21.0)

    def test_rsi_grenzen(self):
        self.assertEqual(analyse.rsi(list(range(1, 40))), 100.0)                 # nur Anstiege
        wechsel = [100 + (1 if i % 2 else -1) for i in range(60)]
        self.assertAlmostEqual(analyse.rsi(wechsel), 50, delta=5)                # auf und ab

    def test_adx_trend_gegen_seitwaerts(self):
        trend = reihe([1.0] * 80)
        seit = reihe([1.0 if i % 2 else -1.0 for i in range(80)])
        a_trend = analyse.adx([t[2] for t in trend], [t[3] for t in trend], [t[1] for t in trend])
        a_seit = analyse.adx([t[2] for t in seit], [t[3] for t in seit], [t[1] for t in seit])
        self.assertGreater(a_trend, 25)
        self.assertLess(a_seit, a_trend)

    def test_bollinger_und_volatilitaet(self):
        self.assertEqual(analyse.bollinger_b([5] * 30), 0.5)
        self.assertIsNotNone(analyse.volatilitaet([100 + math.sin(i) for i in range(40)]))


class Bewertung(unittest.TestCase):
    def test_guenstig_und_teuer(self):
        self.assertGreater(analyse.bewertung({"kgv_erwartet": 10, "peg": 0.8, "fcf_rendite": 7})["score"], 90)
        self.assertLess(analyse.bewertung({"kgv_erwartet": 60, "peg": 4, "fcf_rendite": 0.5})["score"], 10)
        self.assertIsNone(analyse.bewertung({}))

    def test_gesamt_score_im_bereich(self):
        h = date(2026, 9, 23)
        r = analyse.bewerten(demo.tageskurse("AMZN", h), 224.2, demo.analysten("AMZN", h), h.isoformat(),
                             demo.tageskurse(analyse.MARKT, h))
        self.assertTrue(r["ok"])
        self.assertTrue(0 <= r["score"] <= 100)
        self.assertIn(r["urteil"], [u[1] for u in analyse.URTEILE])


class BuyTheDip(unittest.TestCase):
    def test_ruecksetzer_im_aufwaertstrend(self):
        tage = reihe([0.25] * 250 + [-1.2] * 9 + [0.8])
        werte = [t[1] for t in tage]
        dip = analyse.buy_the_dip(werte, {"mittel": 1.8}, None)
        self.assertEqual(dip["status"], "chance")
        self.assertLess(dip["rueckgang"], -5)

    def test_fallendes_messer(self):
        werte = [t[1] for t in reihe([-0.3] * 250 + [-1.5] * 8)]
        self.assertEqual(analyse.buy_the_dip(werte, {"mittel": 2}, None)["status"], "messer")

    def test_kein_ruecksetzer(self):
        werte = [t[1] for t in reihe([0.2] * 260)]
        self.assertIsNone(analyse.buy_the_dip(werte, None, None)["status"])

    def test_backtest(self):
        bt = analyse.backtest(demo.tageskurse("AMZN", date(2026, 9, 23)))
        self.assertEqual(set(bt) >= {"dip", "score", "messer", "immer"}, True)
        self.assertGreater(bt["immer"]["anzahl"], 200)


class Auftraege(unittest.TestCase):
    def test_limit_kauf(self):
        a = {"art": "limit_kauf", "limit": 100}
        self.assertFalse(auftraege.ausgeloest(a, {"bid": 100.5, "ask": 101}))
        self.assertTrue(auftraege.ausgeloest(a, {"bid": 99.5, "ask": 99.9}))

    def test_trailing_zieht_nach(self):
        a = {"art": "trailing", "abstand": 10, "hoechst": 100}
        self.assertFalse(auftraege.ausgeloest(a, {"bid": 120, "ask": 120.1}))
        self.assertEqual(a["hoechst"], 120)
        self.assertEqual(auftraege.stoppkurs(a), 108)
        self.assertTrue(auftraege.ausgeloest(a, {"bid": 107.9, "ask": 108}))

    def test_eingabepruefung(self):
        self.assertIsNotNone(auftraege.pruefe_eingabe("trailing", None, 80, True))
        self.assertIsNotNone(auftraege.pruefe_eingabe("stop", 10, None, False))
        self.assertIsNone(auftraege.pruefe_eingabe("stop", 10, None, True))


class MitDepot(unittest.TestCase):
    """Orders, Geld, Aufträge, Alarme und Depots mit einem Depot im Temp-Ordner."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        depots.BASIS[0] = Path(self.tmp.name)
        d.DEMO[0] = True                                  # Handel immer offen
        r = depots.anlegen("Test", 1000.0, [{"isin": "US0231351067", "anteile": 2, "einstand": 200}],
                           d.UNIVERSUM, "2026-09-23T10:00:00+02:00")
        self.assertTrue(r["ok"])
        d.AKTIV[0], d.DATEN[0] = r["id"], depots.ordner(r["id"])
        ix = depots.index(); ix["aktiv"] = r["id"]; depots.index_speichern(ix)
        self.depot = d.depot_laden()
        d.Server.depot = self.depot
        self.kurse = {"AMZN": {"last": 210, "bid": 209.9, "ask": 210.1},
                      "META": {"last": 650, "bid": 649.8, "ask": 650.2}}
        d.Server.letzte = self.kurse

    def tearDown(self):
        d.DEMO[0] = False
        self.tmp.cleanup()

    def test_anfangsbestand(self):
        self.assertEqual(self.depot["eingezahlt"], 1400.0)
        self.assertEqual(self.depot["positionen"][0]["investiert"], 400.0)
        self.assertEqual(self.depot["orders"][0]["quelle"], "start")

    def test_kauf_und_verkauf(self):
        r = d.order(self.depot, self.kurse, "kaufen", "META", betrag=500)
        self.assertTrue(r["ok"])
        self.assertAlmostEqual(self.depot["cash"], 499.0)                    # 500 € + 1 € Gebühr
        r = d.order(self.depot, self.kurse, "verkaufen", "META", alles=True)
        self.assertTrue(r["ok"])
        self.assertFalse(any(p["symbol"] == "META" for p in self.depot["positionen"]))
        self.assertLess(self.depot["realisiert"], 0)                         # Spread + 2 Gebühren

    def test_zu_wenig_cash(self):
        r = d.order(self.depot, self.kurse, "kaufen", "META", betrag=5000)
        self.assertEqual(r["code"], "cash")

    def test_auszahlen(self):
        self.assertTrue(d.geld_buchen(self.depot, -300)["ok"])
        self.assertEqual(self.depot["cash"], 700.0)
        self.assertEqual(self.depot["eingezahlt"], 1100.0)
        self.assertFalse(d.geld_buchen(self.depot, -5000)["ok"])

    def test_stop_loss_wird_ausgefuehrt(self):
        r = d.auftrag_setzen(self.depot, self.kurse, {"art": "stop", "symbol": "AMZN", "limit": 215, "alles": True})
        self.assertTrue(r["ok"])
        neu = d.auftraege_ausfuehren(self.depot, self.kurse)                 # Geld 209,90 ≤ 215 → verkaufen
        self.assertEqual(len(neu), 1)
        self.assertFalse(self.depot["auftraege"])
        self.assertFalse(any(p["symbol"] == "AMZN" for p in self.depot["positionen"]))

    def test_limit_kauf_bleibt_offen(self):
        d.auftrag_setzen(self.depot, self.kurse, {"art": "limit_kauf", "symbol": "META", "cent": 20000, "limit": 600})
        self.assertEqual(d.auftraege_ausfuehren(self.depot, self.kurse), [])
        self.assertEqual(len(self.depot["auftraege"]), 1)

    def test_kursalarm_einmalig(self):
        d.alarm_setzen(self.depot, {"art": "ueber", "symbol": "AMZN", "wert": 205})
        self.assertEqual(len(d.alarme_pruefen(self.depot, self.kurse, {})), 1)
        self.assertEqual(self.depot["alarme"], [])

    def test_auto_dip_monatsgrenze(self):
        d.auto_dip_setzen(self.depot, {"aktiv": True, "betrag": 300, "max_monat": 500})
        neu = []
        d.auto_dip_kaufen(self.depot, "META", {"score": 70}, neu)
        d.auto_dip_kaufen(self.depot, "META", {"score": 70}, neu)
        self.assertIn("Automatisch gekauft", neu[0]["titel"])
        self.assertIn("ausgelassen", neu[1]["titel"])

    def test_depots_verwalten(self):
        self.assertFalse(depots.loeschen(d.AKTIV[0])["ok"])                  # geöffnetes Depot bleibt
        r = depots.anlegen("Zweites", 0, [], d.UNIVERSUM, "2026-09-23T10:00:00+02:00")
        self.assertTrue(depots.umbenennen(r["id"], "Neu")["ok"])
        self.assertTrue(depots.loeschen(r["id"])["ok"])
        self.assertFalse(depots.anlegen("X", 0, [{"isin": "kaputt", "anteile": 1, "einstand": 1}], [], "")["ok"])

    def test_wochenbericht(self):
        d.order(self.depot, self.kurse, "kaufen", "META", betrag=100)
        b = bericht.wochenbericht(self.depot, [{"t": 0, "w": 1400, "g": 0}, {"t": 1, "w": 1390, "g": -10}],
                                  self.kurse, {"AMZN": 200}, {}, datetime.now())
        self.assertEqual(b["orders"]["kaeufe"], 1)
        self.assertEqual(b["positionen"][0]["symbol"], "AMZN")


if __name__ == "__main__":
    unittest.main()
