# Song files (generated)

Each `songs/<id>.js` is **generated** by `tools/merge-song.js` from that song's source records in `sources/<id>/`. Don't edit these files by hand: edit the records, usually `sources/<id>/manual.json`, then run:

```bash
node tools/merge-song.js <id> --report
node tools/validate-songs.js
```

`docs/ARCHITECTURE.md` describes the records, the merge rules and the plugins. To add a song from a link, use the `add-song-by-url` skill.

## What goes in `manual.json`

The manual record holds hand-curated content. It wins over every other source.

| Field | Meaning |
|---|---|
| `missions` | Five `['title', 'text']` pairs, easy to hard |
| `guide` | `{ targets, special, record }` for the how-to-solo guide (below) |
| `licks` | Original licks (below). Never transcriptions of recorded solos |
| `sections` | Hand-simplified loops that should override derived or measured ones, per section |
| `key`, `name`, `artist` | Corrections |
| `tempoNote` | A hand-written timing note. Without one, the merge writes it from the provenance |

Positions use **string 0 = low E … 5 = high e** and fret numbers. Pitch classes: C=0 … B=11.

### `guide`

```js
guide: {
  targets: [['E', 4, 5, 'E'], ['Dm', 3, 7, 'D']],   // [chord, string, fret, note]: a Box 1 chord tone per verse chord
  special: { chordIdx: 0, note: 'G#', pos: [2, 6], text: '…' },  // chord tone outside the pentatonic; chordIdx indexes the first section
  record: 'Where in the song to solo when playing along.'
}
```

### `licks`

```js
licks: [{
  name: 'Falling home', lvl: 1,           // 1 easy, 2 medium, 3 harder
  where: 'Verse, bars 1–2',
  chords: [['D', 4], ['G', 4]],            // backing; total beats must equal the notes' total
  notes: [[5, 10, 1], [3, 7, 4, 'v']],     // [string, fret, beats, technique?]; [null, null, beats] is a rest
  tip: '…'
}]
```

Techniques: `'h'` hammer-on, `'s'` slide from the previous note, `'b'` whole-step bend, `'v'` vibrato.

## What the validator checks

`node tools/validate-songs.js` checks that:
- every song file is loaded in `index.html`
- every chord is readable
- guide and lick positions are the notes they claim
- guide targets belong to their chords
- licks last as long as their chords
- records contain no lyrics
- generated files are up to date with their records
