/* GitBuzz song: Sultans of Swing — Dire Straits
   Chords and structure only. Lyrics stay on the source site (see links). */
GitBuzz.registerSong({
  id: 'sultans',
  name: 'Sultans of Swing',
  artist: 'Dire Straits',
  tonic: 2,
  mode: 'minor',
  bpm: 149,
  tempoNote: '149 bpm and the chord lengths were measured from your recording (the official video version). It plays about an eighth of a semitone sharp, so if you play along with it, tune your guitar up slightly to match. Slow it to 100–110 bpm while you learn.',
  sections: {
    Verse: [['Dm', 4], ['C', 2], ['Bb', 2], ['A', 8]],
    Chorus: [['F', 8], ['C', 8], ['Bb', 8], ['Dm', 8]],
    Interlude: [['Dm', 2], ['C', 2], ['Bb', 2], ['C', 2]]
  },
  links: [
    ['Find on Spotify', 'https://open.spotify.com/search/Dire%20Straits%20Sultans%20of%20Swing'],
    ['Search Ultimate Guitar', 'https://www.ultimate-guitar.com/search.php?search_type=title&value=Sultans%20of%20Swing']
  ],
  missions: [
    ['Home box: D minor at fret 10', 'Loop the Verse with Box 1 only. Listen to how the chords step down: Dm, C, Bb, A. Let your phrases step down with them.'],
    ['The A chord needs a C#', 'With "Follow chord" on, the pink dot over A is C#. It is the one note outside the D minor scale. Hit it on the A, then resolve to D when Dm comes back.'],
    ['Chorus targets', 'In the Chorus, land on the 3rd of each chord: A over F, E over C, D over Bb, F over Dm. Switch labels to Intervals and look for the "3" or "b3".'],
    ['Connect two boxes', 'Try Box 5 at fret 8, just below Box 1. Play one phrase that starts in Box 1 and finishes in Box 5.'],
    ['Add color', 'Try Dm add9 and Bb maj7 from the Color panel, in your strumming and as the last note of a phrase.']
  ],
  guide: {
    targets: [['Dm', 3, 10, 'F'], ['C', 2, 10, 'C'], ['Bb', 2, 12, 'D'], ['A', 4, 10, 'A']],
    special: {
      chordIdx: 3,
      note: 'C#',
      pos: [2, 11],
      text: 'Over the A chord, play C# on the D string at fret 11, between the box frets. When Dm comes back, move one fret up to D (fret 12). That one-fret step, C# to D, is the sound of this song.'
    },
    record: 'Play in the gaps after each sung line, the way Knopfler answers the vocal. Keep phrases short until the long solo at the end.'
  },
  licks: [
    {
      name: 'Walk down with the chords',
      lvl: 1,
      where: 'Verse',
      chords: [['Dm', 4], ['C', 2], ['Bb', 2], ['A', 8]],
      notes: [[5, 13, 1], [5, 10, 1], [4, 13, 1], [4, 10, 1], [3, 12, 2], [3, 10, 2], [1, 12, 4, 'v'], [null, null, 4]],
      tip: 'Each note steps down as the chords step down. G sits in the C chord, F sits in Bb, and A is the root of the A chord.'
    },
    {
      name: 'C# to D',
      lvl: 2,
      where: 'Verse, A → Dm',
      chords: [['A', 8], ['Dm', 4]],
      notes: [[1, 12, 1], [2, 11, 3, 'v'], [null, null, 2], [1, 12, 1], [2, 11, 1], [2, 12, 4, 'h']],
      tip: 'Fret 11 on the D string sits between the box frets, so use your middle finger. Hold the C# over A, then hammer up one fret to D as Dm comes back. This is the sound of the song.'
    },
    {
      name: 'Chorus phrase',
      lvl: 1,
      where: 'Chorus, F → C',
      chords: [['F', 8], ['C', 8]],
      notes: [[4, 10, 2], [4, 13, 2, 'v'], [null, null, 4], [3, 12, 0.5], [3, 10, 0.5], [2, 12, 1], [2, 10, 2, 'v'], [null, null, 4]],
      tip: 'A and C are both in the F chord. Over C, walk down G, F, D and land on C, its root. Each phrase leaves a full bar of rest.'
    },
    {
      name: 'Bend to D',
      lvl: 3,
      where: 'Chorus, Bb → Dm',
      chords: [['Bb', 8], ['Dm', 8]],
      notes: [[3, 12, 1], [3, 10, 3, 'v'], [null, null, 4], [4, 13, 2, 'b'], [5, 10, 2, 'v'], [null, null, 4]],
      tip: 'Bend the B string at fret 13 with your pinky, ring finger helping, until it matches the high e at fret 10. Both are D. Then play that D for real.'
    }
  ]
});
