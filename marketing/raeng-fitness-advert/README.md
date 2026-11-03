# RAENG Fitness: website showcase advert

A 15-second, 16:9 (1920×1080, 60 fps) portfolio advert for the
[RAENG Fitness website](https://raengfitness.co.uk), designed and developed by WNJO.
The website is the product, so the advert sells the site's design and build, not the gym.

- **Video:** `raeng-fitness-advert.mp4` (H.264 + AAC, web-optimised)
- **Poster frame:** `poster.jpg`

## Sequence

| Time | Beat | What is on screen (all captured from the live site) |
| --- | --- | --- |
| 0–3 s | The reveal | Black. A desktop display emerges from darkness playing the real homepage hero video; slow push in. |
| 3–7 s | Design details | Close-ups: the hero headline in Archivo at 3× (with the video behind it), the *Book a class* and *Explore coaching* buttons with the site's palette (`F5F2EB`, `171717`, `FFFFFF`), the class schedule cards with *Next up*, and the "1% better, every day." photography. |
| 7–11 s | The experience | The real booking page (`/book/group-class`): the cursor picks Wednesday 4 November, then 6:30 pm, and *Your booking* updates. The window then narrows into a phone, which scrolls the real mobile homepage from the hero down to Memberships. |
| 11–15 s | The signature | Pull back to the display and phone together, the RAENG lockup, then "Designed. Developed. Delivered." and the WNJO logo. |

## How it is made

Nothing on a screen is mocked up or redrawn. `capture.cjs` drives a headless
Chromium against raengfitness.co.uk and records:

- the hero `<video>` stepped frame by frame inside the real page (desktop, plus a 3× close-up crop),
- a full-page 2× capture of the desktop homepage,
- the real booking flow (it stops after choosing a date and time; nothing is submitted),
- a real eased scroll of the mobile homepage (393×852, 2×),
- the brand lockup the site serves (`/brand/raeng-lockup-black.png`, shown inverted on black).

`stage.html` is the motion design: the devices, camera moves, close-ups and type,
as a pure function of time (`window.renderAt(seconds)`). `render.cjs` renders it
frame by frame into H.264. The WNJO logo is in `assets/` (`wnjo-logo-source.png` is
the original; the white and brown versions are cut-outs of it with transparency).

## Music

`music.py` synthesises the soundtrack from scratch, so there is nothing to license.
All tracks run at 120 BPM so the edit sits on the beat: the drop lands on the first
close-up (3 s), new sections start at 7 s and 11 s, the two booking clicks fall on
16ths, the credit hits at 13 s and the WNJO logo at 14 s. Each is mastered to
-14 LUFS, -1 dBTP (the loudness most social platforms normalise to).

| Option | Style |
| --- | --- |
| `pulse` (in the main video) | Tech house: four-on-the-floor kick, rolling off-beat bass, chord stabs, square-wave arp. Sleek and confident. |
| `circuit` | Glitch electronic: broken-beat drums, FM bass, bit-crushed data blips, stutter edits on the cuts. The most "techy". |
| `drive` | Electro-pop: driving octave bass, trance-gated supersaw chords, bright arp, big snare. The most upbeat and anthemic. |

`./build.sh` writes all three to `options/` (not committed) and copies the one in
`MUSIC` (default `pulse`) to `raeng-fitness-advert.mp4`.

## Rebuild

Needs Node with Playwright and its Chromium, Python 3 with NumPy, and ffmpeg.

```sh
./build.sh                  # fresh captures, then render
SKIP_CAPTURE=1 ./build.sh   # reuse build/capture
MUSIC=drive SKIP_CAPTURE=1 ./build.sh   # use another track
node render.cjs --stills 3.5,8.4,12.6   # check single frames in build/stills
```

`build/` (captures and intermediate files) is not committed. Rebuild after the site
changes so the advert keeps matching the live site.
