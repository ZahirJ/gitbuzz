---
name: ingest-audio
description: GitBuzz source plugin for recordings (mp3, m4a, wav). Measures tempo, tuning, key and bar-by-bar chord timing with tools/analyze-audio.py, and writes timed sections into a sources/<id>/audio.json record.
---

# Ingest plugin: audio

Writes `sources/<id>/audio.json`. The format is in `docs/ARCHITECTURE.md`. The audio itself is never committed.

## 1. Get the file into the workspace

- **Attachment:** use it from the uploads folder.
- **File on the user's computer (connected folder):** list the folder, then stage the file into the workspace.
- **YouTube or Spotify link:** the workspace can't download them. Ask the user to save an audio file into a connected folder.

Copy the file into the scratchpad before analysis. Never move or edit the user's original.

## 2. Measure

You need the song's chords first: run a chord plugin before this one, or read `sources/<id>/*.json`. Pass every chord the song uses:

```bash
pip install --break-system-packages -q librosa   # if missing; ffmpeg must be on PATH
python3 tools/analyze-audio.py "<file>" --chords "D G A/F# Bm Em A" \
    [--expect-bpm <published bpm>] [--start <seconds of free-time intro>] --out /tmp/<id>-audio.json
```

The script prints a one-line summary and writes a record. It contains:
- `bpm`
- `tuningCents`
- `key` (a profile estimate; a relative major or minor of the real key is common and fine)
- `timeline`: one entry per bar with `chord`, `bass` and `sure` (the margin over the runner-up)

**Tempo check.** If there's a published tempo, pass `--expect-bpm`. Beat trackers often lock onto a 2:3 or 1:2 pulse; the script corrects to the multiple closest to the published value and says so in `notes`.

## 3. Turn the timeline into timed sections

This is a judgement step. Read the timeline next to the chord source's `lines`:
- Find where each section's chord order starts repeating in the timeline. The bass note (`bass`) is the most reliable signal.
- A chord that holds for 2 bars in the timeline is 8 beats. A chord change mid-bar shows up as two chords sharing bars; give each 2 beats.
- Write a section into `fields.sections` **only** when the recording clearly shows it, for example 3 or more matching repeats with `sure` mostly above 0.05. Leave the other sections to the chord source.
- If the recording's order contradicts the chord source (Tab4U says D Bm A G, the audio plays D G A/F# Bm), the audio wins for the loop. Add a note naming both orders.

Then save the record as `sources/<id>/audio.json`:
- Drop `timeline` to keep the record small, or keep its first 32 bars if they're useful evidence.
- `ref` is the file name, including the version (for example "(live, Galgalatz studio)").
- Add notes on the version: live or studio, edit length, anything cut.

## 4. Tell the user

- The tempo, and how it was decided.
- The tuning, if more than about 8 cents off ("tune up slightly to play along").
- Which sections now have measured timing, and which still rely on the chord source.
