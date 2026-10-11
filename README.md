# GitBuzz

GitBuzz is a single-page web app for learning electric guitar soloing over songs you already know. It is built for players who come from acoustic chords and learn best visually.

## What it does

- **Interactive fretboard.** The board reads like a tab, with the high E string on top. It shows the pentatonic or full scale, split into 5 boxes, and the notes of the chord playing right now. The root is red, other chord notes are amber, and chord notes outside the pentatonic are pink.
- **Backing loop.** Each song has a chord loop with an adjustable tempo, played by a simple built-in synth. You can loop the verse, chorus or interlude.
- **How-to-solo guide.** Seven steps, from learning the box shape to playing along with the record. Each step has a "Show me on the board" button.
- **Licks.** Four original licks per song, with tab and rhythm. Each one plays over its chords while the board lights up the notes in order.
- **Chord color.** For each chord, the add9, sus4, maj7 and 7 notes, and whether each fits the key.
- **Missions.** A checklist of practice goals for each song.
- **Add songs from a link or a pasted page.** Paste a Tab4U or Ultimate Guitar page and GitBuzz finds the name, artist, sections and chords, guesses the key, and places the chords over the lyrics in a **Song sheet** (tap a chord to see it on the board). The lyrics stay in your browser.
- **Where the data comes from.** Each song lists its sources (chord pages, recordings, hand-curated content), what each one supplied, and where they disagree.

## Songs included

| Song | Artist | Key | Tempo | Timing source |
|---|---|---|---|---|
| מכה אפורה | מוניקה סקס | D major | 136 bpm | Measured from a recording (live, Galgalatz studio) |
| Sultans of Swing | Dire Straits | D minor | 149 bpm | Measured from a recording (official video edit) |
| Money for Nothing | Dire Straits | G minor (Dorian) | 135 bpm | Published lesson sheet, not yet measured |
| זכרון יעקב | אושיק לוי | A minor | 100 bpm | Starting guess, not yet measured |
| עירומים | שחר אבן צור | A major | 100 bpm | Starting guess, not yet measured |

Each song is merged from several sources: chord pages, measured recordings and hand-curated teaching content. The repo stores chords only. Lyrics stay on the source sites, or in your own browser if you paste a page. For מכה אפורה, the verse order was corrected to match the recording. The licks are original, not transcriptions of the recorded solos.

## Running it

Open `index.html` in any modern browser. It needs no build step and no server, and it also works when opened straight from disk. Fonts load from Google Fonts, and the page falls back to system fonts when offline.

Your progress (missions, added songs, last song) is saved in your browser's local storage.

## Project structure

GitBuzz has three layers: sources → records → merged songs → app. [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) explains the design.

```
sources/<id>/*.json       one record per source per song: tab4u, ultimate-guitar, web, audio, manual
js/merge.js               superposition: combines records field by field, with provenance and conflicts
tools/merge-song.js       runs the merge → songs/<id>.js (generated; don't edit by hand)
js/ingest/                in-app paste plugins (Tab4U, Ultimate Guitar, generic) + the chord-sheet engine
.claude/skills/           Claude-side plugins: add-song-by-url (router), ingest-tab4u, ingest-ultimate-guitar,
                          ingest-audio, ingest-web
tools/analyze-audio.py    measures tempo, tuning, key and per-bar chords from a recording
js/theory.js              chord parsing, keys, scales, boxes, key guessing (pure)
js/notation.js            text tabs (pure)
js/audio.js               Web Audio synth
js/songs.js               song registry
js/app.js                 UI, state, players, import, song sheet
css/gitbuzz.css           styles
tools/validate-songs.js   checks songs and records (including: no lyrics in the repo)
tools/bundle.py           builds dist/gitbuzz.html, one self-contained file
tools/fixtures/           invented sample pages for testing the paste plugins
```

The scripts are plain (non-module) scripts sharing one `window.GitBuzz` namespace, so `index.html` works when opened straight from disk. Core code never refers to a specific song.

## Adding songs

- **In the app:** paste a song page under **Add a song**. The song is saved in your browser only.
- **For the shared song list:** give Claude a link, an audio file or a song name, and the `add-song-by-url` skill does the rest. It adds a record under `sources/<id>/`, merges, validates and commits.
- **By hand:** write a record (see [`songs/README.md`](songs/README.md)), then run `node tools/merge-song.js <id>` and `node tools/validate-songs.js`.

## Single-file version

`python3 tools/bundle.py` writes `dist/gitbuzz.html`, with every file inlined. It's handy for sending GitBuzz to someone as one file. `dist/` is not committed.

## Roadmap ideas

- Measure Money for Nothing's tempo and chord timing from a recording
- A tap-tempo button
- A play-along player for your own audio file: slow-down, section loop, and a fretboard synced to the track
