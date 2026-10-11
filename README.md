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

Chord charts come from Tab4U and public chord sheets. For מכה אפורה, the verse order was corrected to match the recording. The licks are original, not transcriptions of the recorded solos.

## Running it

GitBuzz is one self-contained file, `index.html`. Open it in any modern browser; it needs no build step and no server. Fonts load from Google Fonts, and the page falls back to system fonts when offline.

Your progress (missions, added songs, last song) is saved in your browser's local storage.

## Roadmap ideas

- Measure Money for Nothing's tempo and chord timing from a recording
- A tap-tempo button
- A play-along player for your own audio file: slow-down, section loop, and a fretboard synced to the track
