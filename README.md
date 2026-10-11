# GitBuzz

GitBuzz is a single-page web app for learning electric guitar soloing over songs you already know. It is built for players who come from acoustic chords and learn best visually.

## What it does

- **Interactive fretboard.** The board reads like a tab, with the high E string on top. It shows the pentatonic or full scale, split into 5 boxes, and the notes of the chord playing right now. The root is red, other chord notes are amber, and chord notes outside the pentatonic are pink.
- **Backing loop.** Each song has a chord loop with an adjustable tempo, played by a simple built-in synth. You can loop the verse, chorus or interlude.
- **How-to-solo guide.** Seven steps, from learning the box shape to playing along with the record. Each step has a "Show me on the board" button.
- **Licks.** Four original licks per song, with tab and rhythm. Each one plays over its chords while the board lights up the notes in order.
- **Chord color.** For each chord, the add9, sus4, maj7 and 7 notes, and whether each fits the key.
- **Missions.** A checklist of practice goals for each song.
- **Add your own songs.** Paste chords from Ultimate Guitar or Tab4U.

## Songs included

| Song | Artist | Key | Tempo | Timing source |
|---|---|---|---|---|
| מכה אפורה | מוניקה סקס | D major | 136 bpm | Measured from a recording (live, Galgalatz studio) |
| Sultans of Swing | Dire Straits | D minor | 149 bpm | Measured from a recording (official video edit) |
| Money for Nothing | Dire Straits | G minor (Dorian) | 135 bpm | Published lesson sheet, not yet measured |
| זכרון יעקב | אושיק לוי | A minor | 100 bpm | Starting guess, not yet measured |

Chord charts come from Tab4U and public chord sheets. GitBuzz stores chords only. Lyrics stay on Tab4U, and each song links to its Tab4U page. For מכה אפורה, the verse order was corrected to match the recording. The licks are original, not transcriptions of the recorded solos.

## Running it

Open `index.html` in any modern browser. It needs no build step and no server, and it also works when opened straight from disk. Fonts load from Google Fonts, and the page falls back to system fonts when offline.

Your progress (missions, added songs, last song) is saved in your browser's local storage.

## Project structure

```
index.html            page markup; loads the scripts below in order
css/gitbuzz.css       all styles (light and dark themes)
js/theory.js          music theory: chord parsing, keys, scales, pentatonic boxes (pure, no DOM)
js/notation.js        text tabs for the guide and licks (pure)
js/audio.js           Web Audio synth: notes, click, chord stabs, bass, bends/slides/vibrato
js/songs.js           song registry: GitBuzz.registerSong()
songs/*.js            one data file per song: chords, key, tempo, missions, guide notes, licks
js/app.js             UI, state, loop and lick players, the add-a-song form
tools/validate-songs.js   checks every song file (run with node)
tools/bundle.py       builds dist/gitbuzz.html, a single self-contained file
```

The scripts are plain (non-module) scripts that share one `window.GitBuzz` namespace. That keeps the page working when you double-click `index.html`, which ES modules don't allow. Core code never refers to a specific song: everything song-specific lives in `songs/`.

## Adding songs

See [`songs/README.md`](songs/README.md) for the song file format. In short:
1. Add `songs/<slug>.js`.
2. Add one `<script>` line in `index.html` above `<!-- @songs-end -->`.
3. Run `node tools/validate-songs.js`.

With Claude, the `add-tab4u-song` skill does all of this from a Tab4U link.

## Single-file version

`python3 tools/bundle.py` writes `dist/gitbuzz.html`, with every file inlined. It's handy for sending GitBuzz to someone as one file. `dist/` is not committed.

## Roadmap ideas

- Measure Money for Nothing's tempo and chord timing from a recording
- A tap-tempo button
- A play-along player for your own audio file: slow-down, section loop, and a fretboard synced to the track
