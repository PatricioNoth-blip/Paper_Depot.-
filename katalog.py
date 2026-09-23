"""
Bekannte Aktien zum Suchen und Hinzufügen. Handelbar ist jede Aktie mit ISIN, die an
Tradegate gelistet ist; dieser Katalog sorgt nur dafür, dass die Suche auch ohne Internet
Treffer liefert und Analyse-Kürzel bekannt sind.

    symbol  Kürzel für Analystendaten (Yahoo), meist das Heimatkürzel
    yahoo   Kürzel für Tageskurse in Euro (Xetra)
"""

KATALOG = [
    # USA
    {"symbol": "AAPL",  "name": "Apple",              "isin": "US0378331005", "yahoo": "APC.DE",  "branche": "Technologie"},
    {"symbol": "MSFT",  "name": "Microsoft",          "isin": "US5949181045", "yahoo": "MSF.DE",  "branche": "Software"},
    {"symbol": "AMZN",  "name": "Amazon",             "isin": "US0231351067", "yahoo": "AMZ.DE",  "branche": "Handel, Cloud"},
    {"symbol": "GOOGL", "name": "Alphabet (A)",       "isin": "US02079K3059", "yahoo": "ABEA.DE", "branche": "Internet, Werbung"},
    {"symbol": "META",  "name": "Meta Platforms",     "isin": "US30303M1027", "yahoo": "FB2A.DE", "branche": "Internet, Werbung"},
    {"symbol": "NVDA",  "name": "NVIDIA",             "isin": "US67066G1040", "yahoo": "NVD.DE",  "branche": "Halbleiter"},
    {"symbol": "TSLA",  "name": "Tesla",              "isin": "US88160R1014", "yahoo": "TL0.DE",  "branche": "Autos, Energie"},
    {"symbol": "NFLX",  "name": "Netflix",            "isin": "US64110L1061", "yahoo": "NFC.DE",  "branche": "Streaming"},
    {"symbol": "AVGO",  "name": "Broadcom",           "isin": "US11135F1012", "yahoo": "1YD.DE",  "branche": "Halbleiter"},
    {"symbol": "AMD",   "name": "AMD",                "isin": "US0079031078", "yahoo": "AMD.DE",  "branche": "Halbleiter"},
    {"symbol": "PLTR",  "name": "Palantir",           "isin": "US69608A1088", "yahoo": "PTX.DE",  "branche": "Software"},
    {"symbol": "V",     "name": "Visa",               "isin": "US92826C8394", "yahoo": "3V64.DE", "branche": "Zahlungsverkehr"},
    {"symbol": "JPM",   "name": "JPMorgan Chase",     "isin": "US46625H1005", "yahoo": "CMC.DE",  "branche": "Banken"},
    {"symbol": "BRK-B", "name": "Berkshire Hathaway (B)", "isin": "US0846707026", "yahoo": "BRYN.DE", "branche": "Beteiligungen"},
    {"symbol": "KO",    "name": "Coca-Cola",          "isin": "US1912161007", "yahoo": "CCC3.DE", "branche": "Getränke"},
    {"symbol": "MCD",   "name": "McDonald's",         "isin": "US5801351017", "yahoo": "MDO.DE",  "branche": "Gastronomie"},
    {"symbol": "JNJ",   "name": "Johnson & Johnson",  "isin": "US4781601046", "yahoo": "JNJ.DE",  "branche": "Gesundheit"},
    {"symbol": "WMT",   "name": "Walmart",            "isin": "US9311421039", "yahoo": "WMT.DE",  "branche": "Handel"},
    {"symbol": "NKE",   "name": "Nike",               "isin": "US6541061031", "yahoo": "NKE.DE",  "branche": "Sportartikel"},
    {"symbol": "DIS",   "name": "Walt Disney",        "isin": "US2546871060", "yahoo": "WDP.DE",  "branche": "Medien"},
    {"symbol": "PYPL",  "name": "PayPal",             "isin": "US70450Y1038", "yahoo": "2PP.DE",  "branche": "Zahlungsverkehr"},
    # Deutschland
    {"symbol": "SAP.DE",  "name": "SAP",              "isin": "DE0007164600", "yahoo": "SAP.DE",  "branche": "Software"},
    {"symbol": "SIE.DE",  "name": "Siemens",          "isin": "DE0007236101", "yahoo": "SIE.DE",  "branche": "Industrie"},
    {"symbol": "ALV.DE",  "name": "Allianz",          "isin": "DE0008404005", "yahoo": "ALV.DE",  "branche": "Versicherungen"},
    {"symbol": "DTE.DE",  "name": "Deutsche Telekom", "isin": "DE0005557508", "yahoo": "DTE.DE",  "branche": "Telekommunikation"},
    {"symbol": "MUV2.DE", "name": "Münchener Rück",   "isin": "DE0008430026", "yahoo": "MUV2.DE", "branche": "Versicherungen"},
    {"symbol": "RHM.DE",  "name": "Rheinmetall",      "isin": "DE0007030009", "yahoo": "RHM.DE",  "branche": "Rüstung"},
    {"symbol": "IFX.DE",  "name": "Infineon",         "isin": "DE0006231004", "yahoo": "IFX.DE",  "branche": "Halbleiter"},
    {"symbol": "MBG.DE",  "name": "Mercedes-Benz",    "isin": "DE0007100000", "yahoo": "MBG.DE",  "branche": "Autos"},
    {"symbol": "BMW.DE",  "name": "BMW",              "isin": "DE0005190003", "yahoo": "BMW.DE",  "branche": "Autos"},
    {"symbol": "VOW3.DE", "name": "Volkswagen Vz.",   "isin": "DE0007664039", "yahoo": "VOW3.DE", "branche": "Autos"},
    {"symbol": "BAS.DE",  "name": "BASF",             "isin": "DE000BASF111", "yahoo": "BAS.DE",  "branche": "Chemie"},
    {"symbol": "BAYN.DE", "name": "Bayer",            "isin": "DE000BAY0017", "yahoo": "BAYN.DE", "branche": "Pharma, Agrar"},
    {"symbol": "ADS.DE",  "name": "adidas",           "isin": "DE000A1EWWW0", "yahoo": "ADS.DE",  "branche": "Sportartikel"},
    {"symbol": "DBK.DE",  "name": "Deutsche Bank",    "isin": "DE0005140008", "yahoo": "DBK.DE",  "branche": "Banken"},
    # Europa
    {"symbol": "ASML",    "name": "ASML",             "isin": "NL0010273215", "yahoo": "ASME.DE", "branche": "Halbleiter-Anlagen"},
    {"symbol": "AIR.PA",  "name": "Airbus",           "isin": "NL0000235190", "yahoo": "AIR.DE",  "branche": "Luftfahrt"},
    {"symbol": "MC.PA",   "name": "LVMH",             "isin": "FR0000121014", "yahoo": "MOH.DE",  "branche": "Luxusgüter"},
    {"symbol": "NVO",     "name": "Novo Nordisk",     "isin": "DK0062498333", "yahoo": "NOV.DE",  "branche": "Pharma"},
    {"symbol": "NESN.SW", "name": "Nestlé",           "isin": "CH0038863350", "yahoo": "NESR.DE", "branche": "Lebensmittel"},
]

ISIN_MUSTER = r"^[A-Z]{2}[A-Z0-9]{9}\d$"


def finden(text: str) -> list:
    t = text.strip().lower()
    if not t:
        return KATALOG[:12]
    return [k for k in KATALOG if t in k["name"].lower() or t in k["symbol"].lower() or t in k["isin"].lower()]


def zu_isin(isin: str) -> dict | None:
    return next((k for k in KATALOG if k["isin"] == isin.upper()), None)
