# Song files

There is one file per song. Each file calls `GitBuzz.registerSong({...})` once and holds only that song's data: chords, key, tempo, missions, guide notes and licks. The app logic lives in `js/`.

Song files hold **chords and structure only**. Lyrics stay on the source site, which the song links to.

## Adding a song

1. Copy an existing file, for example `zichron-yaakov.js`, to `songs/<slug>.js`.
2. Edit the data.
3. In `index.html`, add `<script src="songs/<slug>.js"></script>` above the `<!-- @songs-end -->` marker. Order there sets the order of the song buttons.
4. Run `node tools/validate-songs.js` and fix any errors.

## Fields

| Field | Required | Meaning |
|---|---|---|
| `id` | yes | Unique, lowercase ASCII, such as `zichron`. Missions progress is saved under this id. |
| `name`, `artist` | yes | Shown on the song button. Hebrew is fine. |
| `tonic` | yes | Key note as a pitch class: C=0, C#=1, D=2, Eb=3, E=4, F=5, F#=6, G=7, Ab=8, A=9, Bb=10, B=11. |
| `mode` | yes | `'major'`, `'minor'` or `'dorian'`. Major keys use their relative minor pentatonic boxes. |
| `bpm` | yes | Starting tempo for the loop. |
| `tempoNote` | yes | Where the tempo and chord lengths came from: measured, published, or a guess. |
| `sections` | yes | `{ Verse: [['Am', 4], ['E', 4]], Chorus: [...] }`. Each entry is a chord and its length in beats (4 = one bar). The first section opens by default. |
| `links` | recommended | `[['Chords and lyrics on Tab4U', 'https://…'], …]` |
| `missions` | optional | Five `['title', 'text']` pairs, easy to hard. Generic missions are used if this is missing. |
| `guide` | optional | Song-specific notes for the how-to-solo guide (see below). Computed automatically if missing. |
| `licks` | optional | Original licks (see below). Never transcriptions of recorded solos. |

Positions everywhere use **string 0 = low E … 5 = high e** and fret numbers.

### `guide`

```js
guide: {
  targets: [['E', 4, 5, 'E'], ['Dm', 3, 7, 'D']],   // [chord, string, fret, note]: a chord tone in Box 1 per verse chord
  special: { chordIdx: 0, note: 'G#', pos: [2, 6], text: '…' },  // a chord tone outside the pentatonic; chordIdx indexes the first section
  record: 'Where in the song to solo when playing along.'
}
```

### `licks`

```js
licks: [{
  name: 'Falling home', lvl: 1,           // lvl: 1 easy, 2 medium, 3 harder
  where: 'Verse, bars 1–2',
  chords: [['D', 4], ['G', 4]],            // backing for the lick; total beats must equal the notes' total
  notes: [[5, 10, 1], [3, 7, 4, 'v']],     // [string, fret, beats, technique?]; [null, null, beats] is a rest
  tip: '…'
}]
```

Techniques: `'h'` hammer-on, `'s'` slide from the previous note, `'b'` whole-step bend, `'v'` vibrato.

## Checking

`node tools/validate-songs.js` checks that:
- every song file is loaded in `index.html`, and every loaded file exists
- every chord symbol is one the app can read
- guide and lick fret positions are the notes they claim to be
- guide target notes belong to their chords
- each lick lasts exactly as long as its chords

It warns, without failing, when a held note or a note on a chord change is not a chord tone.
