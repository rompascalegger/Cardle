#!/usr/bin/env python3
"""
Cardle – agnostische Kampfsimulation
====================================

Eigenständiger Nachbau der Kampf-Engine (js/battle.js) in Python. Die Regeln kommen
ausschließlich aus regeln.json, das Skript kennt keinen Spielcode. Damit lassen sich
Regeln und KI unabhängig vom Spiel prüfen und ändern.

Frage dieser Version: Wie gut ist Auto-Beschwören (die Spiel-KI) im Vergleich zu
taktischem Spiel, und ab welchem Stärkevorteil gewinnt Auto?

Strategien des Spielers (der Gegner spielt immer mit der Spiel-KI):
  auto     – Spiel-KI wie der Auto-Knopf: Beschwören, Ziele und Verschiebung automatisch
  taktisch – sucht je Zug den besten Plan: welche Karten beschwören oder sparen,
             Aufstellung (auch Umstellen), Fokusfeuer; bewertet jeden Plan, indem es
             die Runde auf einer Kopie spielt und ein paar Züge vorausrechnet
  zufall   – beschwört zufällig bezahlbare Karten an zufällige Plätze

Nicht nachgebaut (bewusst): Spezialeffekte (0,3 % der Karten), Rückseite/Nebel,
Ewiger-Turm-Buff. Kosten = Stärke.

Aufruf:
  python cardle_sim.py                       # Standard-Experiment
  python cardle_sim.py --spiele 300 --prozesse 8 --verhaeltnisse 0.6,0.8,1,1.25,1.5,2,3
  python cardle_sim.py --strategien auto,taktisch --tiefe 3 --kandidaten 40
  python cardle_sim.py --regeln andere_regeln.json --ausgabe ergebnis.json
"""
from __future__ import annotations

import argparse
import itertools
import json
import math
import multiprocessing as mp
import os
import random
import sys
import time
from dataclasses import dataclass, field

HIER = os.path.dirname(os.path.abspath(__file__))
ATTR = ["kraft", "schutz", "groesse", "wildheit", "seltsamkeit", "schlagzahl", "teamplatz", "heilung", "kapazitaet"]


# ----------------------------------------------------------------------------- Regeln
class Regeln:
    def __init__(self, daten: dict):
        self.d = daten
        rad = daten["rad"]
        self.N = rad["anzahl"]
        self.richtung = rad["richtung"]
        prim = {int(k): v for k, v in rad["primFaktoren"].items()}
        # Faktortabelle Angreifer a gegen Verteidiger v (wie faktorInfo in elements.js)
        self.faktor = [[1.0] * self.N for _ in range(self.N)]
        for a in range(self.N):
            for v in range(self.N):
                d = ((a - v) * self.richtung) % self.N
                if d == 0:
                    f = 1.0
                elif d == rad["gegenpolAbstand"]:
                    f = rad["gegenpolFaktor"]
                elif d in prim:
                    f = prim[d]
                elif (self.N - d) in prim:
                    f = 1 / prim[self.N - d]
                else:
                    f = 1.0
                self.faktor[a][v] = f
        self.logf = [[math.log(f) for f in zeile] for zeile in self.faktor]
        self.klassen = daten["klassen"]
        self.rollen = daten["rollen"]
        self.rollen_namen = list(self.rollen.keys())
        self.cap = daten["obergrenzen"]
        k = daten["kampf"]
        self.einkommen = k["beschwoerungProZug"]
        self.leben = k["spielerLeben"]
        self.grundplaetze = k["teamGrundplaetze"]
        self.tp_mult = k["teamplatzMultProPunkt"]
        self.tp_min = k["teamplatzMinPlaetze"]
        self.runden_limit = k["rundenLimit"]
        self.ki = daten["ki"]

    @staticmethod
    def laden(pfad: str) -> "Regeln":
        with open(pfad, encoding="utf-8") as f:
            return Regeln(json.load(f))


# ----------------------------------------------------------------------------- Karten
@dataclass
class Karte:
    el: int
    rolle: str
    kl: int
    a: dict

    @property
    def staerke(self) -> int:
        return sum(self.a.values())


def verteile_punkte(R: Regeln, rng: random.Random, summe: int, rolle: str, ohne_deckel=False) -> dict:
    ro = R.rollen[rolle]
    cap = {k: (1295 if ohne_deckel else v) for k, v in R.cap.items()}
    a = {k: 0 for k in ATTR}
    keys = [k for k in ATTR if ro["g"].get(k, 0) > 0]

    def cap_von(k):
        if k == "schlagzahl":
            return min(cap[k], 8 if ohne_deckel else ro.get("schlagMax", cap[k]))
        return cap[k]

    rest = min(summe, sum(cap_von(k) for k in keys))
    mins = ro.get("min", {})
    if rest >= sum(mins.values()):
        for k, v in mins.items():
            a[k] += v
            rest -= v
    while rest > 0:
        frei = [k for k in keys if a[k] < cap_von(k)]
        if not frei:
            break
        gew = [ro["g"][k] for k in frei]
        k = rng.choices(frei, weights=gew)[0]
        a[k] += 1
        rest -= 1
    return a


def klasse_fuer(R: Regeln, staerke: int) -> int:
    kl = 0
    for i, k in enumerate(R.klassen):
        if staerke >= k["min"]:
            kl = i
    return kl


def zufallskarte(R: Regeln, rng: random.Random, ziel_staerke: int) -> Karte:
    """Zufällige Karte (Element, Rolle, Verteilung) mit ungefähr dieser Stärke."""
    rolle = rng.choice(R.rollen_namen)
    el = rng.randrange(R.N)
    kl = klasse_fuer(R, ziel_staerke)
    a = verteile_punkte(R, rng, ziel_staerke, rolle, ohne_deckel=kl >= 8)
    return Karte(el, rolle, kl, a)


def pack_karte(R: Regeln, rng: random.Random) -> Karte:
    """Karte mit Pack-Wahrscheinlichkeiten (Klasse, dann Stärke im Klassenbereich)."""
    u = rng.random()
    kl = 0
    acc = 0.0
    for i in range(len(R.klassen) - 1, -1, -1):
        acc += R.klassen[i]["chance"]
        if u < acc:
            kl = i
            break
    K = R.klassen[kl]
    s = K["min"] + int(-math.log(1 - rng.random()) * K.get("mittelUeber", 20)) if K["max"] is None else rng.randint(K["min"], K["max"])
    rolle = rng.choice(R.rollen_namen)
    return Karte(rng.randrange(R.N), rolle, kl, verteile_punkte(R, rng, s, rolle, ohne_deckel=kl >= 8))


def plaetze_belegt(R, k: Karte):
    return max(R.tp_min, k.a["teamplatz"])


def zufallsteam(R: Regeln, rng: random.Random, gesamt: int, anzahl: int, streuung=0.45) -> list[Karte]:
    """Team mit ungefähr dieser Gesamtstärke aus `anzahl` Karten, nach den Teamplatz-Regeln."""
    karten = []
    rest = gesamt
    frei = R.grundplaetze
    for n in range(anzahl):
        offen = anzahl - n
        s = max(1, round(rest / offen * rng.uniform(1 - streuung, 1 + streuung))) if offen > 1 else max(1, rest)
        k = zufallskarte(R, rng, s)
        # Platz für die übrigen Karten freihalten (je mindestens 1 Teamplatz), überzählige Teamplatz-Punkte → Kraft
        reserve = anzahl - n - 1
        while plaetze_belegt(R, k) > frei + k.a["kapazitaet"] - reserve and k.a["teamplatz"] > 0:
            k.a["teamplatz"] -= 1
            k.a["kraft"] += 1  # Stärke bleibt gleich
        if plaetze_belegt(R, k) > frei + k.a["kapazitaet"]:
            break
        frei += k.a["kapazitaet"] - plaetze_belegt(R, k)
        karten.append(k)
        rest -= k.staerke
        if rest <= 0:
            break
    return karten


# ----------------------------------------------------------------------------- Kampf
class Einheit:
    __slots__ = ("uid", "seite", "el", "elZug", "a", "schaden", "tot", "todZug", "kost", "beschworen", "zielWahl", "verschiebWahl", "rolle")

    def __init__(self, uid, seite, k: Karte):
        self.uid = uid
        self.seite = seite
        self.el = k.el
        self.elZug = k.el
        self.a = dict(k.a)
        self.schaden = 0.0
        self.tot = False
        self.todZug = -1
        self.kost = max(1, sum(k.a.values()))  # Kosten = Stärke (ohne Effekte)
        self.beschworen = -1
        self.zielWahl = None
        self.verschiebWahl = None
        self.rolle = k.rolle

    def kopie(self):
        e = Einheit.__new__(Einheit)
        for s in Einheit.__slots__:
            setattr(e, s, getattr(self, s))
        e.a = dict(self.a)
        return e

    @property
    def staerke(self):
        return sum(self.a.values())


class Seite:
    __slots__ = ("id", "leben", "bank", "einkommen", "hand", "feld", "friedhof", "lebenZug")

    def __init__(self, sid, einheiten, leben, einkommen, bank=0):
        self.id = sid
        self.leben = leben
        self.bank = bank
        self.einkommen = einkommen
        self.hand = einheiten
        self.feld = []
        self.friedhof = []
        self.lebenZug = -1

    def lebend(self):
        return [u for u in self.feld if u is not None and not u.tot]


class Kampf:
    def __init__(self, R: Regeln, team0, team1, seed=0, einkommen1=None, bank1=0, leben=None):
        self.R = R
        self.rng = random.Random(seed)
        self.zug = 0
        self.ende = None  # (sieger, grund)
        uid = itertools.count(1)
        lb = leben or R.leben
        self.seiten = [
            Seite(0, [Einheit(next(uid), 0, k) for k in team0], lb, R.einkommen),
            Seite(1, [Einheit(next(uid), 1, k) for k in team1], lb, einkommen1 or R.einkommen, bank1),
        ]

    # --- Kopie für Vorausschau (schnell, ohne deepcopy)
    def kopie(self) -> "Kampf":
        k = Kampf.__new__(Kampf)
        k.R = self.R
        k.rng = random.Random()
        k.rng.setstate(self.rng.getstate())
        k.zug = self.zug
        k.ende = self.ende
        k.seiten = []
        for s in self.seiten:
            n = Seite.__new__(Seite)
            n.id, n.leben, n.bank, n.einkommen, n.lebenZug = s.id, s.leben, s.bank, s.einkommen, s.lebenZug
            n.hand = [u.kopie() for u in s.hand]
            n.feld = [u.kopie() if u is not None else None for u in s.feld]
            n.friedhof = [u.kopie() for u in s.friedhof]
            k.seiten.append(n)
        return k

    # --- Werte
    def werte(self, u: Einheit):
        a = u.a
        return {
            "kraft": a["kraft"], "schutz": a["schutz"], "wild": a["wildheit"], "groesse": a["groesse"],
            "selt": a["seltsamkeit"], "schlag": a["schlagzahl"], "mult": 1 + self.R.tp_mult * a["teamplatz"],
        }

    def max_leben(self, u):
        return u.staerke

    def rest_leben(self, u):
        return self.max_leben(u) - u.schaden

    def schaden_fuer(self, att, ziel, punkte, w=None, el_a=None, el_z=None):
        w = w or self.werte(att)
        f = self.R.faktor[att.elZug if el_a is None else el_a][ziel.elZug if el_z is None else el_z]
        return punkte * f * w["mult"] / (ziel.a["schutz"] + 1), f

    # --- Leben und Tod
    def verliere_leben(self, s):
        seite = self.seiten[s]
        if seite.lebenZug == self.zug:
            return
        seite.lebenZug = self.zug
        seite.leben -= 1

    def stirb(self, u):
        seite = self.seiten[u.seite]
        u.tot = True
        u.todZug = self.zug
        if u in seite.feld:
            seite.feld[seite.feld.index(u)] = None
        seite.friedhof.append(u)

    def pruefe_tod(self, u):
        if not u.tot and self.rest_leben(u) <= 1e-9:
            self.stirb(u)

    # --- Beschwören
    @staticmethod
    def erste_freie(seite, ab=0):
        for i in range(ab, len(seite.feld)):
            if seite.feld[i] is None:
                return i
        return len(seite.feld)

    def platziere(self, seite, u, spalte):
        if spalte is None or spalte < 0:
            spalte = self.erste_freie(seite)
        if spalte < len(seite.feld) and seite.feld[spalte] is not None:
            spalte = self.erste_freie(seite, spalte)
        while len(seite.feld) <= spalte:
            seite.feld.append(None)
        seite.feld[spalte] = u
        return spalte

    def beschwoere(self, s, hand_idx, spalte=None):
        seite = self.seiten[s]
        if hand_idx >= len(seite.hand) or self.ende:
            return False
        u = seite.hand[hand_idx]
        if u.kost > seite.bank:
            return False
        seite.bank -= u.kost
        seite.hand.pop(hand_idx)
        self.platziere(seite, u, spalte)
        u.beschworen = self.zug
        return True

    def tausche(self, s, i, j):
        f = self.seiten[s].feld
        while len(f) <= max(i, j):
            f.append(None)
        f[i], f[j] = f[j], f[i]
        while f and f[-1] is None:
            f.pop()

    # --- KI: Beschwören (Nachbau von kiBeschwoeren)
    def spalten_wert(self, s, u, sp):
        opp_f = self.seiten[1 - s].feld
        opp = opp_f[sp] if sp < len(opp_f) else None
        if opp is None or opp.tot:
            return 0
        wo = self.werte(opp)
        aus = self.R.logf[u.el][opp.el]
        ein = self.R.logf[opp.el][u.el]
        return 1 + aus - ein + (0.6 if wo["wild"] == 0 and wo["schlag"] > 0 else 0)

    def bedrohung(self, feind_werte, u):
        summe = 0.0
        for f, w in feind_werte:
            summe += w["kraft"] * w["mult"] * self.R.faktor[f.el][u.el]
        return summe / (u.a["schutz"] + 1)

    def ki_beschwoeren(self, s):
        seite = self.seiten[s]
        K = self.R.ki
        for n in range(K["maxBeschwoerungenJeZug"]):
            if self.ende:
                break
            kandidaten = [(u, i, u.kost) for i, u in enumerate(seite.hand)]
            leistbar = [x for x in kandidaten if x[2] <= seite.bank]
            if not leistbar:
                break
            feinde = self.seiten[1 - s].lebend()
            feind_werte = [(f, self.werte(f)) for f in feinde]
            feind_werte = [(f, w) for f, w in feind_werte if w["kraft"] > 0 and w["schlag"] > 0]
            eigene_angreifer = any(self.werte(u)["kraft"] > 0 and self.werte(u)["schlag"] > 0 for u in seite.lebend())
            ueberlebt = lambda x: x[0].staerke > self.bedrohung(feind_werte, x[0]) * K["ueberlebensSchwelle"]
            greift_an = lambda x: x[0].a["kraft"] > 0 and x[0].a["schlagzahl"] > 0
            wert = lambda x: x[0].staerke
            wahl = None
            if not feinde and not eigene_angreifer:
                ang = sorted([x for x in leistbar if greift_an(x)], key=lambda x: x[2])
                wahl = ang[0] if ang else None
            if wahl is None:
                sicher = sorted([x for x in leistbar if ueberlebt(x)], key=wert, reverse=True)
                if sicher:
                    wahl = sicher[0]
                    teuerste = max(x[2] for x in kandidaten)
                    if n == 0 and len(seite.lebend()) >= 2 and teuerste > seite.bank and teuerste <= seite.bank + seite.einkommen and wahl[2] < teuerste * K["sparenWennTeuersteUnter"]:
                        break
                else:
                    bald = seite.bank + K["sparenZuegeVoraus"] * seite.einkommen
                    if any(x[2] > seite.bank and x[2] <= bald and ueberlebt(x) for x in kandidaten):
                        break
                    wahl = sorted(leistbar, key=wert, reverse=True)[0]
            opfer = self.seiten[1 - s].feld
            best_sp, best_w = self.erste_freie(seite), -1
            for sp in range(max(len(seite.feld), len(opfer)) + 1):
                if sp < len(seite.feld) and seite.feld[sp] is not None:
                    continue
                w = self.spalten_wert(s, wahl[0], sp)
                if w > best_w:
                    best_w, best_sp = w, sp
            if not self.beschwoere(s, wahl[1], best_sp):
                break

    # --- Zugbeginn
    def zug_beginn(self, gegner_ki=True):
        if self.ende:
            return
        self.zug += 1
        for s in (0, 1):
            for u in self.seiten[s].lebend():
                u.elZug = u.el
        for s in (0, 1):
            self.seiten[s].bank += self.seiten[s].einkommen
        if gegner_ki:
            self.ki_beschwoeren(1)

    # --- Seltsamkeit
    def erreichbar(self, el, budget):
        d = self.R.richtung
        out = [(el, 0)]
        for k in range(1, budget + 1):
            out.append(((el - d * k) % self.R.N, k))
        k = 1
        while 2 * k <= budget:
            out.append(((el + d * k) % self.R.N, 2 * k))
            k += 1
        return out

    def waehle_verschiebung(self, u):
        w = self.werte(u)
        if w["selt"] <= 0:
            return u.el
        feinde = self.seiten[1 - u.seite].lebend()
        if not feinde:
            return u.el
        sp = self.seiten[u.seite].feld.index(u)
        greift = 1 if w["kraft"] > 0 and w["schlag"] > 0 else 0
        best, best_s = u.el, -1e18
        gfeld = self.seiten[1 - u.seite].feld
        for el, kosten in self.erreichbar(u.el, w["selt"]):
            sc = 0.0
            for f in feinde:
                g = 2 if gfeld.index(f) == sp else 1
                wf = self.werte(f)
                sc += g * greift * self.R.logf[el][f.el]
                sc -= g * (1 if wf["kraft"] > 0 and wf["schlag"] > 0 else 0.3) * self.R.logf[f.el][el]
            sc -= kosten * 1e-4
            if sc > best_s + 1e-9:
                best_s, best = sc, el
        return best

    # --- Angriffsplanung (Nachbau)
    def plane_angriff(self, u, spalte, w, bereits):
        D = self.seiten[1 - u.seite]
        lebende = D.lebend()
        if not lebende:
            return ("leer", None)
        gegenueber = D.feld[spalte] if spalte < len(D.feld) and D.feld[spalte] is not None and not D.feld[spalte].tot else None
        frei = [t for t in lebende if t.a["groesse"] <= w["wild"]] if w["wild"] >= 1 else []
        kand = []
        if gegenueber is not None and gegenueber.uid not in bereits:
            kand.append(gegenueber)
        for t in frei:
            if t.uid not in bereits and t not in kand:
                kand.append(t)
        if u.zielWahl is not None:
            for t in kand:
                if t.uid == u.zielWahl:
                    bereits.add(t.uid)
                    return ("frei", [(t, int(w["kraft"]))])
        if not kand:
            return ("kein", None) if gegenueber is not None else ("leere", w["kraft"])
        teile = self.verteile(u, w, kand)
        for t, _ in teile:
            bereits.add(t.uid)
        return ("frei" if w["wild"] >= 1 else "direkt", teile)

    def verteile(self, u, w, kand):
        punkte = int(w["kraft"])
        info = []
        for t in kand:
            dpp, _ = self.schaden_fuer(u, t, 1, w)
            rest = max(0.0, self.rest_leben(t))
            wt = self.werte(t)
            drohung = wt["kraft"] * max(1, wt["schlag"]) * wt["mult"]
            noetig = math.ceil(rest / dpp - 1e-9) if dpp > 0 else math.inf
            info.append({"t": t, "dpp": dpp, "rest": rest, "drohung": drohung, "noetig": noetig})
        max_ziele = max(1, min(w["wild"], punkte, len(kand))) if w["wild"] >= 2 else 1

        def score(x, rest):
            if x["rest"] <= 0:
                return -1
            return 1000 + x["drohung"] - x["noetig"] * 0.1 if x["noetig"] <= rest else rest * x["dpp"]

        gewaehlt = []
        rest = punkte
        while len(gewaehlt) < max_ziele:
            pool = [x for x in info if not any(g[0] is x for g in gewaehlt)]
            if not pool:
                break
            pool.sort(key=lambda x: score(x, rest), reverse=True)
            x = pool[0]
            if gewaehlt and (x["rest"] <= 0 or rest <= 0):
                break
            letzter = len(gewaehlt) == max_ziele - 1
            anteil = 0 if punkte == 0 else (rest if (letzter or x["noetig"] > rest) else max(1, x["noetig"]))
            gewaehlt.append([x, anteil])
            rest -= anteil
            if rest <= 0:
                break
        if rest > 0 and gewaehlt:
            max(gewaehlt, key=lambda g: g[0]["dpp"])[1] += rest
        return [(g[0]["t"], g[1]) for g in gewaehlt]

    def verteidiger_wahl(self, u, D, punkte, w):
        opt = []
        for t in D.lebend():
            s, _ = self.schaden_fuer(u, t, punkte, w)
            r = self.rest_leben(t) - s
            opt.append((t, s, r))
        if not opt:
            return None
        opt.sort(key=lambda o: (-(o[2] > 0), o[1] / max(1, self.rest_leben(o[0]))))
        return opt[0][0]

    def treffe(self, u, z, punkte, w):
        schaden, _ = self.schaden_fuer(u, z, punkte, w)
        z.schaden += schaden
        self.pruefe_tod(z)

    # --- Kampfrunde
    def kampf(self):
        if self.ende:
            return
        vorher = [len(self.seiten[s].lebend()) for s in (0, 1)]
        for s in (0, 1):
            for u in self.seiten[s].lebend():
                wahl = u.verschiebWahl
                if wahl is not None and any(el == wahl for el, _ in self.erreichbar(u.el, self.werte(u)["selt"])):
                    u.elZug = wahl
                else:
                    u.elZug = self.waehle_verschiebung(u)
        for s in (0, 1):
            for u in self.seiten[s].lebend():
                rest = u.a.get("heilung", 0)
                while rest > 0:
                    verletzt = [q for q in self.seiten[s].lebend() if q.schaden > 0.01]
                    if not verletzt:
                        break
                    z = max(verletzt, key=lambda q: q.schaden)
                    menge = min(rest, z.schaden, max(1, math.ceil(rest / 2)))
                    z.schaden -= menge
                    rest -= menge
        versuche = [0, 0]
        erste = 0 if self.zug % 2 == 1 else 1
        reihenfolge = []
        breite = max(len(self.seiten[0].feld), len(self.seiten[1].feld))
        for sp in range(breite):
            for s in (erste, 1 - erste):
                f = self.seiten[s].feld
                u = f[sp] if sp < len(f) else None
                if u is not None and not u.tot:
                    reihenfolge.append(u)
        for u in reihenfolge:
            if u.tot or self.ende:
                continue
            s = u.seite
            D = self.seiten[1 - s]
            w = self.werte(u)
            bereits = set()
            for _ in range(w["schlag"]):
                if u.tot:
                    break
                versuche[s] += 1
                sp = self.seiten[s].feld.index(u)
                typ, teile = self.plane_angriff(u, sp, w, bereits)
                if typ in ("leer", "kein"):
                    continue
                if typ == "leere":
                    t = self.verteidiger_wahl(u, D, teile, w)
                    teile = [(t, teile)] if t is not None else []
                for t, p in teile:
                    if not t.tot:
                        self.treffe(u, t, p, w)
        for s in (0, 1):
            for u in self.seiten[s].lebend():
                self.pruefe_tod(u)
        for s in (0, 1):
            jetzt = len(self.seiten[s].lebend())
            if vorher[s] > 0 and jetzt == 0:
                self.verliere_leben(s)
            elif vorher[s] == 0 and versuche[1 - s] > 0:
                self.verliere_leben(s)
        self.pruefe_ende()

    def gesamt_staerke(self, s):
        seite = self.seiten[s]
        return sum(self.rest_leben(u) for u in seite.lebend()) + sum(u.staerke for u in seite.hand)

    def pruefe_ende(self):
        if self.ende:
            return
        p, g = self.seiten
        leer = lambda s: not s.lebend() and not s.hand
        sieger = None
        if p.leben <= 0 and g.leben <= 0:
            sieger = -1
        elif g.leben <= 0:
            sieger = 0
        elif p.leben <= 0:
            sieger = 1
        elif leer(p) and leer(g):
            sieger = 0 if p.leben > g.leben else 1 if p.leben < g.leben else -1
        elif leer(g):
            sieger = 0
        elif leer(p):
            sieger = 1
        elif self.zug >= self.R.runden_limit:
            a, c = self.gesamt_staerke(0), self.gesamt_staerke(1)
            sieger = (0 if p.leben > g.leben else 1) if p.leben != g.leben else (0 if a > c else 1 if a < c else -1)
        if sieger is not None:
            self.ende = sieger


# ----------------------------------------------------------------------------- Strategien
class Strategie:
    name = "basis"

    def zug(self, k: Kampf):
        raise NotImplementedError


class Auto(Strategie):
    """Wie der Auto-Knopf im Spiel: Spiel-KI beschwört, Ziele und Verschiebung automatisch."""
    name = "auto"

    def zug(self, k):
        k.ki_beschwoeren(0)


class Zufall(Strategie):
    name = "zufall"

    def zug(self, k):
        seite = k.seiten[0]
        while True:
            leistbar = [i for i, u in enumerate(seite.hand) if u.kost <= seite.bank]
            if not leistbar or k.rng.random() < 0.3:
                break
            i = k.rng.choice(leistbar)
            breite = max(len(seite.feld), len(k.seiten[1].feld)) + 1
            frei = [sp for sp in range(breite) if sp >= len(seite.feld) or seite.feld[sp] is None]
            k.beschwoere(0, i, k.rng.choice(frei))


def bewertung(k: Kampf, s=0) -> float:
    """Stellungsbewertung aus Sicht von Seite s."""
    if k.ende is not None:
        return 1e6 if k.ende == s else (-1e6 if k.ende == 1 - s else 0)
    me, du = k.seiten[s], k.seiten[1 - s]

    def wert(seite):
        feld = sum(k.rest_leben(u) * (1 + 0.15 * k.werte(u)["schlag"]) for u in seite.lebend())
        return feld + 0.85 * sum(u.staerke for u in seite.hand) + 0.6 * seite.bank

    return 60.0 * (me.leben - du.leben) + wert(me) - wert(du)


class Taktisch(Strategie):
    """
    Sucht je Zug den besten Plan. Kandidaten:
      - welche Karten beschworen werden (Teilmengen der stärksten bezahlbaren Karten, oder sparen)
      - Aufstellung: Spiel-KI-Platzierung oder optimierte Zuordnung aller eigenen Karten zu Spalten (Umstellen erlaubt)
      - Ziele: automatisch oder Fokusfeuer auf den gefährlichsten erreichbaren Gegner
    Jeder Plan wird auf einer Kopie gespielt (diese Runde + `tiefe` weitere Züge mit Spiel-KI auf beiden Seiten)
    und mit `bewertung` verglichen.
    """
    name = "taktisch"

    def __init__(self, tiefe=2, kandidaten=36, breite=6):
        self.tiefe = tiefe
        self.max_kand = kandidaten
        self.breite = breite

    def beschwoer_mengen(self, k):
        seite = k.seiten[0]
        leistbar = [(i, u) for i, u in enumerate(seite.hand) if u.kost <= seite.bank]
        oben = sorted(leistbar, key=lambda x: -x[1].staerke)[: self.breite]
        guenstig = sorted(leistbar, key=lambda x: x[1].kost)[: 3]
        pool = list({i: (i, u) for i, u in oben + guenstig}.values())
        mengen = [()]
        for r in (1, 2, 3):
            for kombi in itertools.combinations(pool, r):
                if sum(u.kost for _, u in kombi) <= seite.bank:
                    mengen.append(tuple(sorted(i for i, _ in kombi)))
        return list(dict.fromkeys(mengen))

    def zuordnen(self, k):
        """Alle eigenen Feldkarten neu auf Spalten verteilen: gierig nach Elementvorteil gegen das Gegenüber."""
        me, du = k.seiten[0], k.seiten[1]
        eigene = me.lebend()
        if not eigene:
            return
        breite = max(len(me.feld), len(du.feld), len(eigene))
        def wert(u, sp):
            opp = du.feld[sp] if sp < len(du.feld) else None
            if opp is None or opp.tot:
                return -0.2 if du.lebend() else 0.0
            aus = k.schaden_fuer(u, opp, k.werte(u)["kraft"])[0] * k.werte(u)["schlag"] / max(1, k.rest_leben(opp))
            ein = k.schaden_fuer(opp, u, k.werte(opp)["kraft"])[0] * k.werte(opp)["schlag"] / max(1, k.rest_leben(u))
            return aus - ein
        frei = set(range(breite))
        neu = [None] * breite
        for u in sorted(eigene, key=lambda u: -u.staerke):
            sp = max(frei, key=lambda c: wert(u, c))
            neu[sp] = u
            frei.discard(sp)
        while neu and neu[-1] is None:
            neu.pop()
        me.feld = neu

    def fokus(self, k):
        du = k.seiten[1].lebend()
        if not du:
            return
        ziel = max(du, key=lambda t: k.werte(t)["kraft"] * max(1, k.werte(t)["schlag"]) / max(1, k.rest_leben(t)))
        for u in k.seiten[0].lebend():
            u.zielWahl = ziel.uid

    def plan_anwenden(self, k, menge, aufstellung, ziele):
        seite = k.seiten[0]
        units = [seite.hand[i] for i in menge]
        for u in units:
            i = seite.hand.index(u)
            if aufstellung == "ki":
                opfer = k.seiten[1].feld
                best_sp, best_w = k.erste_freie(seite), -1
                for sp in range(max(len(seite.feld), len(opfer)) + 1):
                    if sp < len(seite.feld) and seite.feld[sp] is not None:
                        continue
                    w = k.spalten_wert(0, u, sp)
                    if w > best_w:
                        best_w, best_sp = w, sp
                k.beschwoere(0, i, best_sp)
            else:
                k.beschwoere(0, i, None)
        if aufstellung == "optimiert":
            self.zuordnen(k)
        for u in seite.lebend():
            u.zielWahl = None
        if ziele == "fokus":
            self.fokus(k)

    def ausspielen(self, k):
        k.kampf()
        for _ in range(self.tiefe):
            if k.ende is not None:
                break
            k.zug_beginn()
            k.ki_beschwoeren(0)
            k.kampf()
        return bewertung(k, 0)

    def zug(self, k):
        plaene = []
        for menge in self.beschwoer_mengen(k):
            for aufstellung in ("ki", "optimiert"):
                for ziele in ("auto", "fokus"):
                    plaene.append((menge, aufstellung, ziele))
        if len(plaene) > self.max_kand:
            # die größten Mengen zuerst behalten (meist relevant), dazu immer „sparen“
            plaene = [p for p in plaene if not p[0]] + sorted([p for p in plaene if p[0]], key=lambda p: -sum(k.seiten[0].hand[i].staerke for i in p[0]))[: self.max_kand]
        bester, best_w = None, -math.inf
        for plan in plaene:
            kopie = k.kopie()
            self.plan_anwenden(kopie, *plan)
            w = self.ausspielen(kopie)
            if w > best_w:
                best_w, bester = w, plan
        if bester:
            self.plan_anwenden(k, *bester)


STRATEGIEN = {"auto": Auto, "taktisch": Taktisch, "zufall": Zufall}


# ----------------------------------------------------------------------------- Spiel
def spiele(R: Regeln, team0, team1, strategie: Strategie, seed: int, einkommen1=None, bank1=0):
    k = Kampf(R, team0, team1, seed=seed, einkommen1=einkommen1, bank1=bank1)
    while k.ende is None:
        k.zug_beginn()
        if k.ende is not None:
            break
        strategie.zug(k)
        k.kampf()
    return k.ende, k.zug


@dataclass
class Auftrag:
    strategie: str
    verhaeltnis: float
    spiel: int
    seed: int
    gegner_staerke: int
    anzahl: int
    tiefe: int
    kandidaten: int


def _arbeite(args):
    regeln_pfad, a = args
    R = Regeln.laden(regeln_pfad)
    rng = random.Random(a.seed)
    gegner = zufallsteam(R, rng, a.gegner_staerke, a.anzahl)
    spieler = zufallsteam(R, rng, round(a.gegner_staerke * a.verhaeltnis), a.anzahl)
    s = Taktisch(a.tiefe, a.kandidaten) if a.strategie == "taktisch" else STRATEGIEN[a.strategie]()
    sieger, zuege = spiele(R, spieler, gegner, s, seed=a.seed + 7)
    return (a.strategie, a.verhaeltnis, sieger, zuege, sum(k.staerke for k in spieler), sum(k.staerke for k in gegner))


def wilson(siege, n, z=1.96):
    if n == 0:
        return (0, 0)
    p = siege / n
    d = 1 + z * z / n
    m = (p + z * z / (2 * n)) / d
    h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return (max(0, m - h), min(1, m + h))


def main():
    try:
        sys.stdout.reconfigure(encoding="utf-8")  # Windows-Konsole
    except Exception:
        pass
    ap = argparse.ArgumentParser(description="Cardle – agnostische Kampfsimulation: Auto vs. taktisches Spiel")
    ap.add_argument("--regeln", default=os.path.join(HIER, "regeln.json"))
    ap.add_argument("--spiele", type=int, default=200, help="Spiele je Strategie und Verhältnis")
    ap.add_argument("--verhaeltnisse", default="0.6,0.8,1,1.25,1.5,2,3", help="Stärke Spielerteam / Gegnerteam")
    ap.add_argument("--strategien", default="auto,taktisch,zufall")
    ap.add_argument("--gegnerstaerke", type=int, default=120, help="Gesamtstärke des Gegnerteams")
    ap.add_argument("--anzahl", type=int, default=8, help="Karten je Team")
    ap.add_argument("--tiefe", type=int, default=2, help="Vorausschau der Taktik in Zügen")
    ap.add_argument("--kandidaten", type=int, default=36, help="Pläne je Zug (Taktik)")
    ap.add_argument("--prozesse", type=int, default=max(1, (os.cpu_count() or 2) - 1))
    ap.add_argument("--seed", type=int, default=1)
    ap.add_argument("--ausgabe", default=os.path.join(HIER, "ergebnis.json"))
    args = ap.parse_args()

    verh = [float(x) for x in args.verhaeltnisse.split(",")]
    strats = [s.strip() for s in args.strategien.split(",") if s.strip()]
    for s in strats:
        if s not in STRATEGIEN:
            sys.exit(f"Unbekannte Strategie: {s} (möglich: {', '.join(STRATEGIEN)})")
    # Gleiche Seeds für alle Strategien: dieselben Teams, nur das Spiel unterscheidet sich
    auftraege = []
    for v in verh:
        for n in range(args.spiele):
            seed = args.seed * 1_000_003 + int(v * 1000) * 10_007 + n
            for s in strats:
                auftraege.append(Auftrag(s, v, n, seed, args.gegnerstaerke, args.anzahl, args.tiefe, args.kandidaten))
    t0 = time.time()
    print(f"{len(auftraege)} Spiele, {args.prozesse} Prozesse …", flush=True)
    ergebnisse = []
    with mp.Pool(args.prozesse) as pool:
        for i, r in enumerate(pool.imap_unordered(_arbeite, [(args.regeln, a) for a in auftraege], chunksize=4)):
            ergebnisse.append(r)
            if (i + 1) % max(1, len(auftraege) // 20) == 0:
                print(f"  {i + 1}/{len(auftraege)}  ({time.time() - t0:.0f} s)", flush=True)

    tabelle = {}
    for s, v, sieger, zuege, sp, ge in ergebnisse:
        e = tabelle.setdefault((s, v), {"n": 0, "siege": 0, "remis": 0, "zuege": 0, "staerke_spieler": 0, "staerke_gegner": 0})
        e["n"] += 1
        e["siege"] += sieger == 0
        e["remis"] += sieger == -1
        e["zuege"] += zuege
        e["staerke_spieler"] += sp
        e["staerke_gegner"] += ge

    print()
    print("Gewinnrate des Spielers (Gegner spielt mit der Spiel-KI)")
    print(f"Gegnerteam ≈ {args.gegnerstaerke} Stärke, {args.anzahl} Karten · {args.spiele} Spiele je Feld · 95-%-Intervall in Klammern")
    kopf = "Verhältnis  tatsächlich  " + "  ".join(f"{s:>20}" for s in strats)
    print(kopf)
    print("-" * len(kopf))
    zeilen = []
    for v in verh:
        e0 = tabelle[(strats[0], v)]
        echt = e0["staerke_spieler"] / max(1, e0["staerke_gegner"])
        zellen = []
        zeile = {"verhaeltnis": v, "tatsaechlich": round(echt, 3)}
        for s in strats:
            e = tabelle[(s, v)]
            p = e["siege"] / e["n"]
            lo, hi = wilson(e["siege"], e["n"])
            zellen.append(f"{p * 100:5.1f} % ({lo * 100:3.0f}–{hi * 100:3.0f})")
            zeile[s] = {"gewinnrate": round(p, 4), "ci95": [round(lo, 4), round(hi, 4)], "remis": e["remis"], "zuegeMittel": round(e["zuege"] / e["n"], 1), "n": e["n"]}
        zeilen.append(zeile)
        print(f"{v:>10.2f}  {echt:>11.2f}  " + "  ".join(f"{z:>20}" for z in zellen))

    # Schwelle: kleinstes Verhältnis mit ≥ 50 % / ≥ 80 % Siegen je Strategie
    print()
    schwellen = {}
    for s in strats:
        schwellen[s] = {}
        for ziel in (0.5, 0.8):
            treffer = [z["verhaeltnis"] for z in zeilen if z[s]["gewinnrate"] >= ziel]
            schwellen[s][str(ziel)] = min(treffer) if treffer else None
        print(f"{s:>9}: ≥50 % ab Verhältnis {schwellen[s]['0.5']}, ≥80 % ab {schwellen[s]['0.8']}")
    with open(args.ausgabe, "w", encoding="utf-8") as f:
        json.dump({"parameter": vars(args), "zeilen": zeilen, "schwellen": schwellen, "sekunden": round(time.time() - t0, 1)}, f, ensure_ascii=False, indent=1)
    print(f"\nGespeichert: {args.ausgabe} ({time.time() - t0:.0f} s)")


if __name__ == "__main__":
    mp.freeze_support()
    main()
