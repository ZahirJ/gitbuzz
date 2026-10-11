#!/usr/bin/env python3
"""GitBuzz · analyze-audio.py — the measuring half of the audio ingest plugin.

Measures tempo, tuning, key and a bar-by-bar chord timeline from a recording, and writes an
"audio" source record for sources/<id>/audio.json (docs/ARCHITECTURE.md).

    python3 tools/analyze-audio.py SONG.mp3 --chords "D G A/F# Bm Em A" [--expect-bpm 146]
                                   [--start 12.5] [--bars 16] [--out sources/<id>/audio.json]

--chords      the song's chords from a chord source; the timeline only chooses among these
--expect-bpm  a published tempo; if the measured tempo is ~2/3, 3/2, 1/2 or 2x of it, the
              closer multiple is used (beat trackers often lock onto a dotted or half pulse)
--start       seconds to skip (a free-time intro); the timeline starts at the first beat after it
--out         write the record JSON here; without it, the record is printed

The record holds bpm, tuningCents, key and a 'timeline' (one chord guess per bar plus the bass
note). Turning the timeline into timed sections is a judgement call left to the ingest-audio
skill, which writes fields.sections after reading the timeline.

Needs: ffmpeg on PATH, and pip install librosa numpy.
"""
import argparse
import json
import os
import subprocess
import sys
import tempfile

import numpy as np

NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']
LETTER = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
# Krumhansl–Kessler key profiles
MAJOR = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
MINOR = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])


def pc(name):
    p = LETTER[name[0]]
    if len(name) > 1 and name[1] == '#':
        p += 1
    if len(name) > 1 and name[1] == 'b':
        p -= 1
    return p % 12


def chord_template(sym):
    """Pitch classes, root and bass of a chord symbol (simple qualities are enough here)."""
    main, _, bass = sym.partition('/')
    root_len = 2 if len(main) > 1 and main[1] in '#b' else 1
    root, q = pc(main[:root_len]), main[root_len:]
    minor = q.startswith('m') and not q.startswith('maj')
    iv = [0, 3, 7] if minor else [0, 4, 7]
    if q in ('4', 'sus4', 'sus', '7sus4'):
        iv = [0, 5, 7]
    elif q in ('2', 'sus2'):
        iv = [0, 2, 7]
    elif q.startswith('dim'):
        iv = [0, 3, 6]
    elif q == '5':
        iv = [0, 7]
    if '7' in q and 'maj7' not in q and 'sus' not in q:
        iv = iv + [10]
    if 'maj7' in q:
        iv = iv + [11]
    return {'sym': sym, 'root': root, 'tones': sorted({(root + i) % 12 for i in iv}), 'bass': pc(bass) if bass else root}


def to_wav(path):
    """Decode anything ffmpeg can read (YouTube downloads are often M4A named .mp3) to mono 22.05 kHz WAV."""
    tmp = tempfile.NamedTemporaryFile(suffix='.wav', delete=False)
    tmp.close()
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', path, '-ac', '1', '-ar', '22050', tmp.name], check=True)
    return tmp.name


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('audio')
    ap.add_argument('--chords', default='', help='space-separated chord symbols from a chord source')
    ap.add_argument('--expect-bpm', type=float)
    ap.add_argument('--start', type=float, default=0.0)
    ap.add_argument('--bars', type=int, default=0, help='limit the timeline to this many bars (0 = whole song)')
    ap.add_argument('--out')
    a = ap.parse_args()

    import librosa  # imported late so --help works without it

    wav = to_wav(a.audio)
    try:
        y, sr = librosa.load(wav, sr=22050, mono=True)
    finally:
        os.unlink(wav)
    duration = len(y) / sr

    # tempo and beats
    onset = librosa.onset.onset_strength(y=y, sr=sr)
    tempo, beats = librosa.beat.beat_track(onset_envelope=onset, sr=sr)
    bt = librosa.frames_to_time(beats, sr=sr)
    bpm = float(60 / np.median(np.diff(bt)))
    measured_bpm = bpm
    tempo_note = 'beat tracker'
    if a.expect_bpm:
        for mult, label in ((1.5, '3:2'), (2 / 3, '2:3'), (2.0, 'double'), (0.5, 'half')):
            if abs(bpm * mult - a.expect_bpm) / a.expect_bpm < abs(bpm - a.expect_bpm) / a.expect_bpm and abs(bpm * mult - a.expect_bpm) / a.expect_bpm < 0.06:
                bpm, tempo_note = bpm * mult, f'beat tracker read {measured_bpm:.1f}; used the {label} multiple, closer to the published {a.expect_bpm:g}'
                break
    spb = 60 / bpm
    # regular beat grid at the final tempo, anchored on the first tracked beat after --start
    first = next((t for t in bt if t >= a.start), bt[0])
    grid = np.arange(first, duration - spb, spb)

    tuning = float(librosa.estimate_tuning(y=y, sr=sr))  # fraction of a semitone
    yh = librosa.effects.harmonic(y)

    # key from the whole-song chroma
    chroma = librosa.feature.chroma_cqt(y=yh, sr=sr)
    prof = chroma.mean(axis=1)
    best = None
    for t in range(12):
        for mode, ref in (('major', MAJOR), ('minor', MINOR)):
            r = float(np.corrcoef(prof, np.roll(ref, t))[0, 1])
            if best is None or r > best[0]:
                best = (r, t, mode)
    key = {'tonic': best[1], 'mode': best[2]}

    # bar timeline: bass pitch class + best candidate chord per bar
    times = librosa.frames_to_time(np.arange(chroma.shape[1]), sr=sr)
    low = np.abs(librosa.cqt(yh, sr=sr, fmin=librosa.note_to_hz('E1'), n_bins=20, bins_per_octave=12))
    low_t = librosa.frames_to_time(np.arange(low.shape[1]), sr=sr)
    cands = [chord_template(c) for c in a.chords.split()] if a.chords.strip() else []
    timeline = []
    n_bars = int(len(grid) // 4)
    if a.bars:
        n_bars = min(n_bars, a.bars)
    for b in range(n_bars):
        t0, t1 = grid[b * 4], grid[b * 4] + 4 * spb
        m = (times >= t0) & (times < t1)
        c = chroma[:, m].mean(axis=1) if m.any() else np.zeros(12)
        ml = (low_t >= t0) & (low_t < t1)
        lv = low[:, ml].mean(axis=1) if ml.any() else np.zeros(20)
        bass_pc = np.zeros(12)
        for i, v in enumerate(lv):
            bass_pc[(4 + i) % 12] += v  # bin 0 is E1
        bass = int(bass_pc.argmax())
        entry = {'bar': b + 1, 'time': round(float(t0), 2), 'bass': NAMES[bass]}
        if cands:
            scores = []
            for ch in cands:
                tpl = np.zeros(12)
                tpl[ch['tones']] = 1
                s = float(np.dot(c, tpl) / (np.linalg.norm(tpl) * (np.linalg.norm(c) + 1e-9)))
                if ch['bass'] == bass:
                    s += 0.15
                scores.append(s)
            order = np.argsort(scores)[::-1]
            entry['chord'] = cands[order[0]]['sym']
            entry['sure'] = round(scores[order[0]] - scores[order[1]], 3) if len(cands) > 1 else 1.0
        timeline.append(entry)

    record = {
        'plugin': 'audio',
        'ref': os.path.basename(a.audio),
        'fetched': __import__('datetime').date.today().isoformat(),
        'confidence': 'high',
        'fields': {
            'bpm': round(bpm),
            'tuningCents': round(tuning * 100),
            'key': key,
            'timeline': timeline,
            'notes': [f'Tempo: {tempo_note}. Duration {duration:.0f} s. Key estimate {NAMES[key["tonic"]]} {key["mode"]} (profile correlation {best[0]:.2f}).']
        }
    }
    text = json.dumps(record, ensure_ascii=False, indent=2)
    if a.out:
        os.makedirs(os.path.dirname(a.out) or '.', exist_ok=True)
        with open(a.out, 'w', encoding='utf-8') as f:
            f.write(text + '\n')
        print(f'wrote {a.out}', file=sys.stderr)
    else:
        print(text)
    print(f'bpm {bpm:.1f} ({tempo_note}) · tuning {tuning*100:+.0f} cents · key {NAMES[key["tonic"]]} {key["mode"]} · {n_bars} bars', file=sys.stderr)


if __name__ == '__main__':
    main()
