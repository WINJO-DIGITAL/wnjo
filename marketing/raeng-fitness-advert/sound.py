"""Sound design for the RAENG Fitness advert, synthesised from scratch.

    python3 sound.py  -> build/sound.wav (15 s, 48 kHz stereo)

Cues follow the picture: a low swell from darkness (0-3 s), soft air on each
close-up cut (3-7 s), a restrained electronic pulse with UI ticks on the two
booking clicks (7-11 s), then a low impact and a warm chord under the credit.
"""
import os
import wave
import numpy as np

SR = 48000
DUR = 15.0
N = int(SR * DUR)
t = np.arange(N) / SR
rng = np.random.default_rng(7)
L = np.zeros(N)
R = np.zeros(N)


def at(sec):
    return int(sec * SR)


def env_adsr(n, a, d, s, r):
    a, d, r = int(a * SR), int(d * SR), int(r * SR)
    hold = max(0, n - a - d - r)
    e = np.concatenate([
        np.linspace(0, 1, a, endpoint=False) ** 2,
        np.linspace(1, s, d, endpoint=False),
        np.full(hold, s),
        np.linspace(s, 0, r) ** 1.5,
    ])
    return e[:n] if len(e) >= n else np.pad(e, (0, n - len(e)))


def onepole(x, cutoff):
    """Time-varying one-pole low-pass; cutoff may be an array (Hz)."""
    cutoff = np.broadcast_to(cutoff, x.shape)
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.empty_like(x)
    z = 0.0
    for i in range(len(x)):
        z = (1 - a[i]) * x[i] + a[i] * z
        y[i] = z
    return y


def add(sig, start, gain=1.0, pan=0.0):
    i = at(start)
    j = min(N, i + len(sig))
    if j <= i:
        return
    gl = gain * np.cos((pan + 1) * np.pi / 4)
    gr = gain * np.sin((pan + 1) * np.pi / 4)
    L[i:j] += sig[: j - i] * gl
    R[i:j] += sig[: j - i] * gr


def whoosh(length, peak, lo=300, hi=5000, gain=.25):
    n = at(length)
    x = rng.standard_normal(n)
    u = np.arange(n) / n
    shape = np.where(u < peak, (u / peak) ** 2, ((1 - u) / (1 - peak)) ** 2.5)
    cut = lo + (hi - lo) * shape
    y = onepole(onepole(x, cut), cut * 1.3)
    return y * shape * gain


def tick(freq=2400, length=.06, gain=.25):
    n = at(length)
    k = np.arange(n) / SR
    return (np.sin(2 * np.pi * freq * k) * .6 + rng.standard_normal(n) * .4) * np.exp(-k * 90) * gain


def pluck(freq, length=.5, bright=.35):
    n = at(length)
    k = np.arange(n) / SR
    y = np.sin(2 * np.pi * freq * k) + bright * np.sin(2 * np.pi * 2 * freq * k) * np.exp(-k * 18)
    return y * np.exp(-k * 7) * np.minimum(1, k * 400)


def pad(freqs, length, attack=.6, release=1.2):
    n = at(length)
    k = np.arange(n) / SR
    y = np.zeros(n)
    for f in freqs:
        for det in (-.12, .0, .12):  # gentle chorus
            y += np.sin(2 * np.pi * f * (1 + det / 100) * k + rng.uniform(0, 6.28))
    y /= len(freqs) * 3
    return y * env_adsr(n, attack, .4, .8, release)


def hz(note):  # MIDI note number -> Hz
    return 440.0 * 2 ** ((note - 69) / 12)


# 0-3 s: swell from darkness -------------------------------------------------
n = at(3.2)
k = np.arange(n) / SR
swell = (np.sin(2 * np.pi * 55 * k) * .55 + np.sin(2 * np.pi * 82.4 * k) * .3 + np.sin(2 * np.pi * 110 * k + np.sin(2 * np.pi * .3 * k)) * .2)
swell *= (k / 3.0) ** 1.6 * np.where(k > 3.0, np.exp(-(k - 3.0) * 30), 1)
noise = onepole(rng.standard_normal(n), 120 + 2600 * (k / 3.2) ** 3) * (k / 3.2) ** 2.2 * .5
add(swell + noise, 0.0, .55)
add(np.sin(2 * np.pi * hz(76) * k) * (k / 3.0) ** 3 * np.where(k > 3.0, 0, 1) * .05, 0.0, 1, -.3)  # faint high air
add(np.sin(2 * np.pi * hz(81) * k) * (k / 3.0) ** 3 * np.where(k > 3.0, 0, 1) * .04, 0.0, 1, .3)

# 3.0 s: soft landing on the first close-up
n = at(1.6)
k = np.arange(n) / SR
boom = np.sin(2 * np.pi * (48 + 40 * np.exp(-k * 14)) * k) * np.exp(-k * 3.2)
add(boom, 3.0, .7)
add(whoosh(.55, .82, 200, 4200, .22), 2.5, 1, -.2)

# 3-7 s: air on each cut, a sparse arpeggio underneath (A minor, 120 bpm)
for c, p in ((4.05, .4), (5.0, -.4), (6.0, .4), (6.95, -.2)):
    add(whoosh(.45, .6, 400, 6000, .13), c - .25, 1, p)
arp = [57, 64, 69, 72, 64, 69, 76, 72]
step = .25
for i in range(int((11.0 - 3.0) / step)):
    s = 3.0 + i * step
    note = arp[i % len(arp)]
    g = .085 if s < 7 else .11
    add(pluck(hz(note), .55, .3 if s < 7 else .45), s, g, -.35 if i % 2 else .35)

# 7-11 s: pulse, sub on the beat, quiet hats on the off-beat
for i in range(int((11.0 - 7.0) / .5)):
    s = 7.0 + i * .5
    n = at(.45)
    k = np.arange(n) / SR
    add(np.sin(2 * np.pi * (55 + 30 * np.exp(-k * 40)) * k) * np.exp(-k * 9), s, .32)
    hat = onepole(rng.standard_normal(at(.05)), 9000) - onepole(rng.standard_normal(at(.05)), 2500)
    add(hat * np.exp(-np.arange(at(.05)) / SR * 70), s + .25, .07, .25)
add(pad([hz(45), hz(52), hz(57)], 4.2, .8, 1.0), 7.0, .16)

# booking clicks (match the cursor presses)
add(tick(2600, .05, .22), 7.7, 1, -.1)
add(tick(3100, .05, .22), 8.36, 1, .1)
# desktop -> phone morph, and the pull back
add(whoosh(.9, .55, 250, 5000, .2), 8.7, 1, .3)
add(whoosh(1.2, .5, 150, 3500, .2), 10.85, 1, -.2)

# 11-13 s: brand arrives
add(pad([hz(57), hz(64), hz(69), hz(71)], 2.2, .5, .9), 11.4, .14)
add(tick(1800, .12, .1), 11.95, 1)

# 13.2 s: impact and the credit chord
n = at(2.0)
k = np.arange(n) / SR
add(np.sin(2 * np.pi * (42 + 50 * np.exp(-k * 10)) * k) * np.exp(-k * 2.2), 13.15, .75)
add(whoosh(.5, .85, 200, 3000, .18), 12.7, 1)
add(pad([hz(45), hz(57), hz(64), hz(68), hz(71), hz(76)], 1.85, .25, 1.0), 13.15, .2)
for s, f in ((13.2, 88), (13.45, 83), (13.7, 81)):
    add(pluck(hz(f), .9, .1) * .6, s, .06, 0)
# WINJO: a clean bell
n = at(1.0)
k = np.arange(n) / SR
bell = (np.sin(2 * np.pi * hz(81) * k) + .4 * np.sin(2 * np.pi * hz(81) * 2.76 * k) * np.exp(-k * 6)) * np.exp(-k * 3.2)
add(bell, 14.0, .1)


# Reverb: convolve with a decaying stereo noise tail ------------------------
def reverb(x, seconds=1.8, seed=1):
    r = np.random.default_rng(seed)
    n = at(seconds)
    k = np.arange(n) / SR
    ir = r.standard_normal(n) * np.exp(-k * 3.6)
    ir = onepole(ir, 5000)
    ir /= np.sqrt((ir ** 2).sum())
    size = 1 << int(np.ceil(np.log2(len(x) + n)))
    y = np.fft.irfft(np.fft.rfft(x, size) * np.fft.rfft(ir, size), size)[: len(x)]
    return y


wetL, wetR = reverb(L, seed=1), reverb(R, seed=2)
mixL, mixR = L + wetL * .35, R + wetR * .35

# Fade the tail into the final black, soft-limit, normalise to -1 dBFS.
fade = np.ones(N)
fade[at(14.6):] = np.linspace(1, 0, N - at(14.6)) ** 1.5
fade[: at(.05)] = np.linspace(0, 1, at(.05))
mix = np.stack([mixL, mixR], axis=1) * fade[:, None]
mix = np.tanh(mix * 1.4) / np.tanh(1.4)
mix *= 10 ** (-1 / 20) / np.abs(mix).max()

os.makedirs(os.path.join(os.path.dirname(__file__), 'build'), exist_ok=True)
out = os.path.join(os.path.dirname(__file__), 'build', 'sound.wav')
with wave.open(out, 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix * 32767).astype('<i2').tobytes())
print('Wrote', out)
