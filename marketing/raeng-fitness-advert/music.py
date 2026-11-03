"""Music for the RAENG Fitness website advert, synthesised from scratch.

    python3 music.py pulse     -> build/music-pulse.wav
    python3 music.py circuit   -> build/music-circuit.wav
    python3 music.py drive     -> build/music-drive.wav
    python3 music.py all

All three are 120 BPM, so the picture's beats fall on the grid:
  bars start at 1, 3, 5, 7, 9, 11, 13 s; the drop lands on the first close-up
  (3 s), the experience section starts at 7 s, the pull back at 11 s, the credit
  at 13 s and the WNJO logo at 14 s. The two booking clicks (7.75 s, 8.375 s) are
  on 16ths. The output is mastered to about -14 LUFS, -1 dBTP.

  pulse    tech house: four-on-the-floor, rolling off-beat bass, chord stabs
  circuit  glitch electronic: broken beat, FM bass, data blips, stutter edits
  drive    electro-pop: driving octave bass, gated supersaws, bright arp
"""
import os
import subprocess
import sys
import wave
import numpy as np

SR = 48000
DUR = 15.0
N = int(SR * DUR)
BEAT = 0.5          # 120 BPM
S16 = BEAT / 4
BAR = BEAT * 4
HERE = os.path.dirname(os.path.abspath(__file__))
BUILD = os.path.join(HERE, 'build')


def at(sec):
    return int(round(sec * SR))


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def ts(n):
    return np.arange(n) / SR


# ---------------------------------------------------------------- buses ----
class Mix:
    def __init__(self):
        self.bus = {}

    def add(self, name, sig, start, gain=1.0, pan=0.0):
        b = self.bus.setdefault(name, np.zeros((N, 2)))
        if sig.ndim == 1:
            gl, gr = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
            sig = np.stack([sig * gl * 1.414, sig * gr * 1.414], 1)
        i = at(start)
        j = min(N, i + len(sig))
        if i < 0:
            sig, i = sig[-i:], 0
        if j > i:
            b[i:j] += sig[: j - i] * gain

    def get(self, name):
        return self.bus.get(name, np.zeros((N, 2)))


# -------------------------------------------------------------- filters ----
def svf(x, cutoff, q=0.7, mode='lp'):
    """Chamberlin state-variable filter; cutoff may vary per sample."""
    c = np.broadcast_to(np.asarray(cutoff, float), x.shape)
    f = 2 * np.sin(np.pi * np.clip(c, 20, SR / 6) / SR)
    damp = 1 / q
    lo = bp = 0.0
    out = np.empty_like(x)
    xs, fs = x.tolist(), f.tolist()
    for i in range(len(xs)):
        fi = fs[i]
        lo += fi * bp
        hi = xs[i] - lo - damp * bp
        bp += fi * hi
        out[i] = lo if mode == 'lp' else (bp if mode == 'bp' else hi)
    return out


def hp(x, cutoff):
    return x - svf(x, cutoff, .7)


def saw(freq, n, phase=0.0):
    p = (phase + np.cumsum(np.broadcast_to(freq, (n,)) / SR)) % 1.0
    return 2 * p - 1


def square(freq, n, width=.5):
    p = np.cumsum(np.broadcast_to(freq, (n,)) / SR) % 1.0
    return np.where(p < width, 1.0, -1.0)


def expenv(n, decay, attack=.002):
    k = ts(n)
    return np.exp(-k / decay) * np.minimum(1, k / attack)


def gate(n, dur, rel=.03, attack=.004):
    k = ts(n)
    e = np.minimum(1, k / attack)
    return e * np.clip(1 - (k - dur) / rel, 0, 1)


rng = np.random.default_rng(11)


def noise(n):
    return rng.standard_normal(n)


# ----------------------------------------------------------------- drums ---
def kick(punch=1.0, length=.42, low=46):
    n = at(length)
    k = ts(n)
    f = low + 130 * np.exp(-k / .028) * punch
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-k / .16)
    click = hp(noise(n), 3000) * np.exp(-k / .004) * .35
    return np.tanh((body + click) * 1.6)


def clap(length=.3):
    n = at(length)
    k = ts(n)
    e = sum(np.exp(-np.clip(k - d, 0, None) / .008) * (k >= d) for d in (0, .011, .022)) + np.exp(-k / .09) * (k >= .03) * .8
    return svf(noise(n), 1300, 1.4, 'bp') * e * 1.6


def snare(length=.35, tone=185):
    n = at(length)
    k = ts(n)
    body = np.sin(2 * np.pi * tone * k) * np.exp(-k / .05)
    sn = hp(noise(n), 1800) * np.exp(-k / .11)
    return body * .7 + sn * .9


def hat(open_=False):
    n = at(.3 if open_ else .05)
    k = ts(n)
    x = hp(hp(noise(n), 7000), 7000)
    return x * np.exp(-k / (.09 if open_ else .014))


def crash(length=1.6):
    n = at(length)
    k = ts(n)
    return hp(noise(n), 4500) * np.exp(-k / .55) * .8


# ---------------------------------------------------------------- synths ---
def bass_note(m, dur, cut=900, env_amt=1800, q=2.5, sub=.6, decay=.09):
    n = at(dur + .03)
    f = hz(m)
    k = ts(n)
    osc = saw(f, n) * .7 + np.sin(2 * np.pi * f * k) * sub
    y = svf(osc, cut + env_amt * np.exp(-k / decay), q)
    return np.tanh(y * 1.5) * gate(n, dur, .025)


def fm_bass(m, dur, index=3.5, ratio=1.0, decay=.12):
    n = at(dur + .02)
    f = hz(m)
    k = ts(n)
    idx = index * np.exp(-k / decay) + .6
    y = np.sin(2 * np.pi * f * k + idx * np.sin(2 * np.pi * f * ratio * k))
    y += np.sin(2 * np.pi * f * k) * .5
    return np.tanh(y * 1.3) * gate(n, dur, .02)


def pluck(m, dur=.25, cut=600, env_amt=5000, decay=.06, wave_='saw', q=1.2):
    n = at(dur + .2)
    f = hz(m)
    k = ts(n)
    osc = saw(f, n) if wave_ == 'saw' else square(f, n)
    osc = osc + (saw(f * 1.006, n, .3) if wave_ == 'saw' else 0) * .6
    y = svf(osc, cut + env_amt * np.exp(-k / decay), q)
    return y * expenv(n, dur * .9 + .05) * .6


def chord_stab(notes, dur=.18, cut=700, env_amt=4200, decay=.05):
    return sum(pluck(m, dur, cut, env_amt, decay) for m in notes) / len(notes) ** .7


def supersaw(notes, dur, cut=3500, voices=5, spread=.012):
    n = at(dur)
    L = np.zeros(n)
    R = np.zeros(n)
    r = np.random.default_rng(int(dur * 1000) + notes[0])
    for m in notes:
        f = hz(m)
        for v in range(voices):
            det = 1 + spread * (v - (voices - 1) / 2) / ((voices - 1) / 2)
            s = saw(f * det, n, r.uniform())
            pan = (v / (voices - 1)) * 2 - 1
            L += s * (1 - pan) * .5
            R += s * (1 + pan) * .5
    y = np.stack([svf(L, cut, .8), svf(R, cut, .8)], 1)
    return y / (len(notes) * voices) * 2.2


def pad(notes, dur, attack=.6, release=1.0, cut=2200):
    n = at(dur)
    k = ts(n)
    e = np.minimum(1, k / attack) * np.clip((dur - k) / release, 0, 1)
    y = supersaw(notes, dur, cut, 5, .008)
    return y * e[:, None]


def bell(m, length=1.6):
    n = at(length)
    k = ts(n)
    f = hz(m)
    y = np.sin(2 * np.pi * f * k + 1.2 * np.exp(-k / .4) * np.sin(2 * np.pi * f * 3.5 * k))
    return y * np.exp(-k / .5) * np.minimum(1, k / .002)


def blip(m, length=.07, crush=6):
    n = at(length)
    k = ts(n)
    y = square(hz(m), n, .3) * np.exp(-k / (length / 3))
    y = np.round(y * crush) / crush                       # bit crush
    hold = 4
    y = np.repeat(y[::hold], hold)[:n]                   # sample-rate reduce
    return y * .5


def riser(length, lo=300, hi=7000, curve=2.5):
    n = at(length)
    u = np.linspace(0, 1, n)
    x = svf(noise(n), lo + (hi - lo) * u ** curve, 1.8, 'bp')
    return x * u ** 2 * 1.3


def downer(length=1.2):
    n = at(length)
    u = np.linspace(0, 1, n)
    x = svf(noise(n), 6000 * (1 - u) ** 2 + 200, 1.5, 'bp')
    return x * (1 - u) ** 2


def impact(length=2.2, low=38):
    n = at(length)
    k = ts(n)
    f = low + 90 * np.exp(-k / .06)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-k / .7)
    y += svf(noise(n), 900, .8) * np.exp(-k / .25) * .5
    return np.tanh(y * 1.4)


def tick(freq=2600, length=.05):
    n = at(length)
    k = ts(n)
    return (np.sin(2 * np.pi * freq * k) * .6 + noise(n) * .3) * np.exp(-k / .008)


def whoosh(length, peak=.6, lo=300, hi=5000):
    n = at(length)
    u = np.linspace(0, 1, n)
    shape = np.where(u < peak, (u / peak) ** 2, ((1 - u) / (1 - peak)) ** 2.5)
    return svf(noise(n), lo + (hi - lo) * shape, 1.0) * shape


# ---------------------------------------------------------------- effects --
def reverb(x, seconds=2.0, decay=.5, seed=1, bright=6000):
    out = np.zeros_like(x)
    for ch in range(2):
        r = np.random.default_rng(seed + ch)
        n = at(seconds)
        k = ts(n)
        ir = r.standard_normal(n) * np.exp(-k / decay)
        ir = svf(ir, bright, .7)
        ir[: at(.012)] = 0                                 # pre-delay
        ir /= np.sqrt((ir ** 2).sum())
        size = 1 << int(np.ceil(np.log2(len(x) + n)))
        out[:, ch] = np.fft.irfft(np.fft.rfft(x[:, ch], size) * np.fft.rfft(ir, size), size)[: len(x)]
    return out


def delay(x, time=BEAT * .75, fb=.38, mix=.35, pingpong=True):
    d = at(time)
    y = np.zeros_like(x)
    tap = x.copy()
    g = 1.0
    for i in range(1, 7):
        g *= fb
        tap = np.roll(tap, d, axis=0)
        tap[:d] = 0
        if pingpong:
            tap = tap[:, ::-1]
        y += tap * g / fb ** 0 * (1 if i == 1 else 1)
    return x + y * mix


def sidechain(kicks, depth=.7, release=.18):
    """Gain curve that ducks after each kick time."""
    g = np.ones(N)
    k = ts(at(release * 3))
    curve = 1 - depth * np.exp(-k / (release / 2.5))
    for s in kicks:
        i = at(s)
        j = min(N, i + len(curve))
        if 0 <= i < N:
            g[i:j] = np.minimum(g[i:j], curve[: j - i])
    return g[:, None]


def stutter(x, at_time, length=S16 * 2, slice_=S16 / 2):
    """Repeat a short slice just before a cut (a techy edit)."""
    i, sl = at(at_time - length), at(slice_)
    chunk = x[i: i + sl].copy()
    reps = int(round(length / slice_))
    for r in range(reps):
        a = i + r * sl
        fade = np.linspace(1, .3, sl)[:, None] if r == reps - 1 else 1
        x[a: a + sl] = chunk * fade
    return x


def filt_sweep(x, t0, t1, c0, c1, mode='lp'):
    """Sweep a filter over a time window of a stereo bus (in place)."""
    i, j = at(t0), at(t1)
    seg = x[i:j]
    cut = np.geomspace(c0, c1, j - i)
    for ch in range(2):
        seg[:, ch] = svf(seg[:, ch], cut, .9, mode) if mode != 'hp' else hp(seg[:, ch], cut)
    return x


# --------------------------------------------------------------- SFX bed ---
def sfx(mx):
    mx.add('sfx', tick(2600), 7.75, .35, -.15)          # booking: date
    mx.add('sfx', tick(3200), 8.375, .35, .15)          # booking: time
    mx.add('sfx', whoosh(.9, .55, 250, 5000), 8.65, .22, .3)   # desktop -> phone
    mx.add('sfx', whoosh(1.1, .5, 150, 3500), 10.85, .2, -.2)  # pull back
    for c, p in ((4.0, .4), (5.0, -.4), (6.0, .4)):
        mx.add('sfx', whoosh(.4, .7, 600, 7000), c - .28, .08, p)


# ------------------------------------------------------------- arrangements
AM, F, C, G = (57, 60, 64, 67), (53, 57, 60, 64), (55, 60, 64, 67), (55, 59, 62, 67)
PROG = [(3, 33, AM), (5, 29, F), (7, 36, C), (9, 31, G), (11, 33, AM)]   # bar start, bass root, chord


def bars(t0, t1):
    for s, root, ch in PROG:
        if s >= t0 and s < t1:
            yield s, root, ch


def song_pulse(mx):
    kicks = []
    # Intro: filtered groove and a riser, with a half-beat of air before the drop.
    for b in range(4, 10):                               # beats 2.0 .. 2.75 build
        pass
    for i in range(int(3.0 / S16)):
        s = i * S16
        if s < 2.75:
            mx.add('drums', hat(), s, .16 + .3 * (s / 3), .2 if i % 2 else -.2)
    for i in range(16):                                  # snare roll 2.0 -> 2.75
        s = 2.0 + i * (0.75 / 16)
        mx.add('drums', snare(.12), s, .12 + .45 * (i / 15) ** 2)
    for s in np.arange(1.0, 2.75, BEAT):
        for off in (.25, .375):
            mx.add('bass', bass_note(33, .1, 300, 500), s + off, .5)
    mx.add('fx', riser(2.8, 300, 9000), 0.2, .32)
    mx.add('pad', pad([45, 57, 64, 67], 3.0, 1.6, .2, 1200), 0.0, .5)
    mx.add('drums', crash(), 3.0, .55)
    mx.add('drums', impact(1.2, 44), 3.0, .55)

    # Main groove 3 -> 12.75
    for s in np.arange(3.0, 12.75, BEAT):
        kicks.append(s)
        mx.add('drums', kick(), s, .95)
        mx.add('drums', hat(True), s + BEAT / 2, .28, .25)
        if int(round((s - 3.0) / BEAT)) % 2 == 1:
            mx.add('drums', clap(), s, .55)
            mx.add('verb', clap(), s, .25)
    for i in range(int((12.75 - 3.0) / S16)):
        s = 3.0 + i * S16
        acc = .22 if i % 4 == 2 else .1
        mx.add('drums', hat(), s, acc, -.3 if i % 2 else .3)
    for bs, root, ch in bars(3.0, 13.0):
        end = min(bs + BAR, 12.75)
        for s in np.arange(bs, end, BEAT):
            for off, oc in ((.25, 0), (.375, 12 if int((s - bs) / BEAT) == 3 else 0)):
                mx.add('bass', bass_note(root + oc, .11), s + off, .55)
        for step in (3, 6, 10, 14):
            s = bs + step * S16
            if s < 12.75:
                stab = chord_stab([m + 12 for m in ch])
                mx.add('keys', stab, s, .5, .15)
                mx.add('verb', stab, s, .2)
    # Arp lead from 7 s
    arp = lambda ch: [ch[0] + 12, ch[1] + 12, ch[2] + 12, ch[3] + 12, ch[2] + 24, ch[1] + 12, ch[3] + 12, ch[0] + 24]
    for bs, root, ch in bars(7.0, 13.0):
        seq = arp(ch)
        for i in range(16):
            s = bs + i * S16
            if s < 12.75:
                mx.add('lead', pluck(seq[i % 8], .1, 900, 3500, .04, 'square'), s, .22, .3 if i % 2 else -.3)
    # Fill and lift into the pull back
    for i in range(8):
        mx.add('drums', snare(.1), 10.5 + i * S16 / 1, .1 + .3 * i / 7, .1)
    mx.add('fx', riser(1.0, 500, 8000), 10.0, .25)
    mx.add('drums', crash(), 11.0, .45)
    mx.add('fx', riser(.75, 800, 10000), 12.0, .3)

    # Credit: impact and an open chord; WNJO on 14 s.
    mx.add('drums', impact(), 13.0, .9)
    mx.add('drums', crash(2.0), 13.0, .4)
    mx.add('pad', pad([41, 53, 57, 60, 64, 67], 2.0, .05, 1.3, 2600), 13.0, .7)
    mx.add('bass', bass_note(29, 1.4, 150, 400, 1.0, .9, .3), 13.0, .55)
    for i, s in enumerate((13.25, 13.5, 13.75)):
        mx.add('lead', pluck([72, 76, 79][i], .3, 1200, 3000, .08, 'square'), s, .2, (-.3, 0, .3)[i])
        mx.add('verb', pluck([72, 76, 79][i], .3, 1200, 3000, .08, 'square'), s, .2)
    mx.add('lead', bell(84), 14.0, .22)
    mx.add('verb', bell(84), 14.0, .3)
    return kicks


def song_circuit(mx):
    kicks = []
    r = np.random.default_rng(5)
    scale = [64, 67, 69, 71, 74, 76, 79, 81, 83, 86]      # E minor pentatonic-ish
    # Intro: data blips accelerating into the drop, rising FM tone.
    s = 0.25
    gap = .25
    while s < 2.9:
        mx.add('lead', blip(int(r.choice(scale)) + 12, .06), s, .18 + .2 * s / 3, float(r.uniform(-.7, .7)))
        s += gap
        gap = max(S16 / 2, gap * .9)
    n = at(3.0)
    k = ts(n)
    f = hz(40) * (1 + 3 * (k / 3) ** 3)
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR + 2 * (k / 3) * np.sin(2 * np.pi * np.cumsum(f * 2) / SR))
    mx.add('fx', tone * (k / 3) ** 2, 0, .22)
    mx.add('fx', riser(2.6, 400, 9000, 3), .3, .25)
    mx.add('drums', impact(1.0, 40), 3.0, .7)
    mx.add('drums', crash(1.2), 3.0, .35)

    kick_steps = [0, 3, 6, 10, 11]
    snare_steps = [4, 12]
    ghost_steps = [7, 15]
    for bar_start in np.arange(3.0, 12.99, BAR):
        for st in kick_steps:
            s = bar_start + st * S16
            if s < 12.75:
                kicks.append(s)
                mx.add('drums', kick(1.1, .3, 50), s, .9)
        for st in snare_steps:
            s = bar_start + st * S16
            if s < 12.75:
                mx.add('drums', snare(.3, 200), s, .7)
                mx.add('verb', snare(.3, 200), s, .25)
        for st in ghost_steps:
            s = bar_start + st * S16
            if s < 12.75:
                mx.add('drums', snare(.08, 230), s, .18)
        for i in range(16):
            s = bar_start + i * S16
            if s >= 12.75:
                break
            if r.uniform() < .85:
                mx.add('drums', hat(), s, .2 if i % 2 == 0 else .12, .35)
            if r.uniform() < .12:                         # 32nd rolls
                mx.add('drums', hat(), s + S16 / 2, .12, -.35)
    # FM bass pattern (16th steps)
    bass_pat = [(0, 0, 2), (3, 0, 1), (6, 12, 1), (8, 0, 2), (11, 0, 1), (14, 7, 2)]
    roots = {3: 28, 5: 24, 7: 31, 9: 26, 11: 28}         # E, C, G, D
    for bs, root in roots.items():
        for st, oc, ln in bass_pat:
            s = bs + st * S16
            if s < 12.75:
                mx.add('bass', fm_bass(root + 12 + oc, ln * S16 * .9, 4.5, 2.0 if oc else 1.0), s, .5)
    # Blips through the body; denser from 7 s
    for i in range(int((12.75 - 3.0) / S16)):
        s = 3.0 + i * S16
        p = .22 if s < 7 else .4
        if r.uniform() < p:
            mx.add('lead', blip(int(r.choice(scale)) + 12, .05), s, .16, float(r.uniform(-.8, .8)))
    # Glassy chord pulses on off-beats from 7 s
    chords = {7: (55, 59, 62, 66), 9: (50, 57, 62, 66), 11: (52, 59, 64, 67)}
    for bs, ch in chords.items():
        for i in range(8):
            s = bs + i * BEAT / 2 + BEAT / 4
            if s < 12.75:
                c = chord_stab([m + 12 for m in ch], .12, 1500, 3000, .03)
                mx.add('keys', c, s, .32, .2)
                mx.add('verb', c, s, .14)
    mx.add('fx', riser(1.0, 600, 9000), 10.0, .22)
    mx.add('drums', crash(), 11.0, .35)
    mx.add('fx', riser(.75, 800, 11000, 3), 12.0, .3)
    # Credit
    mx.add('drums', impact(2.2, 36), 13.0, .9)
    mx.add('pad', pad([40, 52, 59, 62, 66, 71], 2.0, .05, 1.4, 3000), 13.0, .6)
    for i, s in enumerate((13.25, 13.5, 13.75)):
        b = blip([83, 86, 88][i], .12, 10)
        mx.add('lead', b, s, .28, (-.4, 0, .4)[i])
        mx.add('verb', b, s, .3)
    mx.add('lead', bell(88), 14.0, .2)
    mx.add('verb', bell(88), 14.0, .3)
    return kicks


def song_drive(mx):
    kicks = []
    # Intro: pad swelling open, 16th snare build, riser.
    mx.add('pad', pad([45, 57, 60, 64], 3.0, 2.2, .15, 900), 0.0, .7)
    for i in range(32):
        s = 1.0 + i * S16 * (1 if i < 16 else .5) if i < 16 else 2.0 + (i - 16) * S16 / 2 * 1.5
        if s < 2.9:
            mx.add('drums', snare(.15, 190 + i * 4), s, .08 + .4 * (i / 31) ** 2)
    mx.add('fx', riser(2.6, 300, 10000), .3, .3)
    mx.add('drums', crash(), 3.0, .55)
    mx.add('drums', impact(1.0, 44), 3.0, .5)

    for s in np.arange(3.0, 12.75, BEAT):
        kicks.append(s)
        mx.add('drums', kick(1.0, .4, 48), s, .95)
        if int(round((s - 3.0) / BEAT)) % 2 == 1:
            c = clap()
            sn = snare(.4, 180)
            sn[: len(c)] += c * .5
            mx.add('drums', sn, s, .6)
            mx.add('verb', sn, s, .45)
        mx.add('drums', hat(True), s + BEAT / 2, .2, .3)
        for e in (0, BEAT / 2):
            mx.add('drums', hat(), s + e, .14, -.3)
    progs = [(3, 33, (57, 60, 64, 69)), (5, 29, (57, 60, 65, 69)), (7, 36, (55, 60, 64, 67)),
             (9, 31, (55, 59, 62, 67)), (11, 33, (57, 60, 64, 69))]
    for bs, root, ch in progs:
        for i in range(16):                               # driving octave 8ths/16ths
            s = bs + i * S16
            if s >= 12.75:
                break
            if i % 2 == 0 or s >= 7.0:
                mx.add('bass', bass_note(root + (12 if i % 4 == 2 else 0), S16 * .85, 400, 1500, 1.8, .5, .05), s, .42)
        gate_pat = [1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 1]
        for i, g in enumerate(gate_pat):                 # trance-gated supersaw
            s = bs + i * S16
            if g and s < 12.75:
                mx.add('keys', supersaw([m + 12 for m in ch], S16 * .8, 3800), s, .26)
        if bs >= 7:
            arp = [ch[0] + 24, ch[2] + 12, ch[1] + 24, ch[2] + 24, ch[3] + 12, ch[2] + 24, ch[1] + 24, ch[3] + 24]
            for i in range(16):
                s = bs + i * S16
                if s < 12.75:
                    note = pluck(arp[i % 8], .12, 1200, 6000, .05)
                    mx.add('lead', note, s, .2, .25 if i % 2 else -.25)
                    mx.add('dly', note, s, .12)
    for i in range(8):
        mx.add('drums', snare(.12, 200 + i * 6), 10.5 + i * S16 / 1, .1 + .35 * i / 7)
    mx.add('fx', riser(1.0, 500, 9000), 10.0, .25)
    mx.add('drums', crash(), 11.0, .45)
    mx.add('fx', riser(.75, 800, 11000), 12.0, .3)
    # Credit: resolve to C major
    mx.add('drums', impact(2.2, 40), 13.0, .85)
    mx.add('drums', crash(2.0), 13.0, .4)
    mx.add('keys', pad([48, 60, 64, 67, 71, 74], 2.0, .02, 1.4, 4200), 13.0, .7)
    mx.add('bass', bass_note(24, 1.5, 150, 300, 1.0, .9, .3), 13.0, .5)
    for i, s in enumerate((13.25, 13.5, 13.75)):
        note = pluck([76, 79, 84][i], .3, 1500, 6000, .08)
        mx.add('lead', note, s, .22, (-.3, 0, .3)[i])
        mx.add('dly', note, s, .2)
    mx.add('lead', bell(88), 14.0, .22)
    mx.add('verb', bell(88), 14.0, .3)
    return kicks


SONGS = {'pulse': song_pulse, 'circuit': song_circuit, 'drive': song_drive}


# ---------------------------------------------------------------- master ---
def render(name):
    mx = Mix()
    kicks = SONGS[name](mx)
    sfx(mx)
    duck = sidechain(kicks, .65 if name != 'circuit' else .5)
    # Bus balance: drums and risers are built hot, so they are trimmed here.
    drums, fx = mx.get('drums') * .42, mx.get('fx') * .4
    music = (drums + fx
             + (mx.get('bass') * 1.1 + mx.get('keys') + mx.get('pad') + mx.get('lead') * 1.1) * duck)
    music += reverb(mx.get('verb') + mx.get('keys') * .3 + mx.get('lead') * .25, 2.2, .45) * .45
    music += delay(mx.get('dly'), BEAT * .75, .4, 1.0) * duck
    if name == 'pulse':
        filt_sweep(music, 0.0, 2.75, 350, 9000)          # filtered intro opening up
    if name == 'circuit':
        for c in (5.0, 6.0, 9.0, 11.0):
            stutter(music, c)
    # The half-beat of air before the drop, and before the credit.
    for a, b in ((2.75, 3.0), (12.75, 13.0)):
        i, j = at(a), at(b)
        music[i:j] = fx[i:j] + music[i:j] * np.linspace(1, .0, j - i)[:, None] * .15
    music += mx.get('sfx') * .45
    # gentle tail fade into the final black
    fade = np.ones(N)
    fade[at(14.55):] = np.linspace(1, 0, N - at(14.55)) ** 1.4
    fade[: at(.02)] = np.linspace(0, 1, at(.02))
    music *= fade[:, None]

    # Master to -14 LUFS with a look-ahead limiter at -1.2 dBFS.
    out = os.path.join(BUILD, f'music-{name}.wav')
    music /= np.abs(music).max()
    for _ in range(3):
        lufs = loudness(music, out)
        music = limit(music * 10 ** ((-14.0 - lufs) / 20), 10 ** (-1.2 / 20))
    write(out, music)
    print(f'Wrote {out}  {loudness(music, out):.1f} LUFS')


def loudness(x, path):
    write(path, x)
    meas = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', path, '-af', 'ebur128', '-f', 'null', '-'],
                          capture_output=True, text=True).stderr
    return float(meas.rsplit('I:', 1)[1].split('LUFS')[0])


def limit(x, ceiling, look=.004, release=.08):
    """Look-ahead peak limiter: the gain falls ahead of each peak, recovers slowly."""
    la = at(look)
    peak = np.abs(x).max(axis=1)
    need = np.minimum(1.0, ceiling / np.maximum(peak, 1e-9))
    padded = np.concatenate([need, np.ones(la)])
    from numpy.lib.stride_tricks import sliding_window_view
    g = sliding_window_view(padded, la + 1).min(axis=1)[: len(need)]
    a = np.exp(-1 / (release * SR))
    out = np.empty_like(g)
    z = 1.0
    gl = g.tolist()
    for i in range(len(gl)):
        z = gl[i] if gl[i] < z else gl[i] + (z - gl[i]) * a
        out[i] = z
    # smooth the attack so gain changes are not clicks
    k = np.ones(la) / la
    out = np.minimum(out, np.convolve(out, k, mode='same'))
    return np.clip(x * out[:, None], -ceiling, ceiling)


def write(path, x):
    os.makedirs(BUILD, exist_ok=True)
    with wave.open(path, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((np.clip(x, -1, 1) * 32767).astype('<i2').tobytes())


if __name__ == '__main__':
    names = SONGS if (len(sys.argv) < 2 or sys.argv[1] == 'all') else [sys.argv[1]]
    for nm in names:
        render(nm)
