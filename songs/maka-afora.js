/* GitBuzz song: מכה אפורה — מוניקה סקס
   Chords and structure only. Lyrics stay on the source site (see links). */
GitBuzz.registerSong({
  id: 'maka',
  name: 'מכה אפורה',
  artist: 'מוניקה סקס',
  tonic: 2,
  mode: 'major',
  bpm: 136,
  tempoNote: '136 bpm and the verse order (D, G, A/F#, Bm, one bar each) were measured from your recording, the live Galgalatz studio version. Tuning is standard. The chorus order is from Tab4U. Slow it to 90–100 bpm while you learn.',
  sections: {
    Verse: [['D', 4], ['G', 4], ['A/F#', 4], ['Bm', 4]],
    Chorus: [['Em', 4], ['A', 4], ['Bm', 4], ['G', 4], ['Em', 4], ['A', 4], ['D', 4], ['G', 4]],
    Interlude: [['Bm', 4], ['A', 4], ['G', 4], ['A/F#', 4]]
  },
  links: [
    ['Chords on Tab4U', 'https://www.tab4u.com/tabs/songs/1886_%D7%9E%D7%95%D7%A0%D7%99%D7%A7%D7%94_%D7%A1%D7%A7%D7%A1_-_%D7%9E%D7%9B%D7%94_%D7%90%D7%A4%D7%95%D7%A8%D7%94.html'],
    ['Find on Spotify', 'https://open.spotify.com/search/%D7%9E%D7%95%D7%A0%D7%99%D7%A7%D7%94%20%D7%A1%D7%A7%D7%A1%20%D7%9E%D7%9B%D7%94%20%D7%90%D7%A4%D7%95%D7%A8%D7%94'],
    ['Search Ultimate Guitar', 'https://www.ultimate-guitar.com/search.php?search_type=title&value=%D7%9E%D7%9B%D7%94%20%D7%90%D7%A4%D7%95%D7%A8%D7%94']
  ],
  missions: [
    ['Find home: Box 1 at fret 7', 'Play the Verse loop and use only the dots in Box 1. Start each phrase on a D and end on one. Three notes per phrase is plenty at first.'],
    ['Catch the chord change', 'Keep "Follow chord" on. Each time the loop reaches G, land on an amber or red dot. Get it 8 times in a row without looking at the strip.'],
    ['Add the two missing notes', 'Switch to the full scale. The new notes are G and C#. Over the A chord, end a phrase on C#. It is the 3rd of A and sounds the sweetest there.'],
    ['Leave the box', 'Pick Box 2 (fret 10) and repeat your best phrase there. Then play one phrase that starts in Box 1 and ends in Box 2.'],
    ['Color your strumming', 'Strum the Chorus on your own guitar. On each chord, open the Color panel and try the add9 and sus4 versions. Pick the ones you like and keep them.']
  ],
  guide: {
    targets: [['D', 3, 7, 'D'], ['G', 2, 9, 'B'], ['A/F#', 2, 7, 'A'], ['Bm', 2, 9, 'B']],
    special: {
      chordIdx: 2,
      note: 'C#',
      pos: [5, 9],
      text: 'Over A/F#, play C# on the high e string at fret 9 instead of the A. It sits between the two box frets, so your middle finger reaches it. Then move to the B (D string, fret 9) when Bm arrives.'
    },
    record: 'Good places to solo in this song: the intro, the interlude (Bm A G A/F#), the D G D A section at the end, and the short gaps after each sung line.'
  },
  licks: [
    {
      name: 'Falling home',
      lvl: 1,
      where: 'Verse, bars 1–2',
      chords: [['D', 4], ['G', 4]],
      notes: [[5, 10, 1], [5, 7, 1], [4, 10, 0.5], [4, 7, 0.5], [3, 9, 1], [3, 7, 4, 'v']],
      tip: 'Start on the high D and walk down the box to the D on the G string, landing as the G chord arrives. D belongs to both chords, so it sounds settled.'
    },
    {
      name: 'Bend into Bm',
      lvl: 2,
      where: 'Verse, bars 3–4',
      chords: [['A/F#', 4], ['Bm', 4]],
      notes: [[2, 7, 0.5], [2, 9, 0.5], [3, 7, 1], [3, 9, 2, 'b'], [2, 9, 4, 'v']],
      tip: 'Bend with your ring finger, with the middle finger behind it pushing too. Bend E up to F#, the bass note of A/F#, then drop to B when Bm arrives.'
    },
    {
      name: 'The C# move',
      lvl: 3,
      where: 'Verse, bars 3–4',
      chords: [['A/F#', 4], ['Bm', 4]],
      notes: [[4, 10, 1], [5, 7, 0.5], [5, 9, 2.5, 'v'], [5, 7, 1], [4, 10, 0.5], [4, 7, 2.5, 'v']],
      tip: 'C# (high e, fret 9) is the note the box doesn’t have. Hold it over A/F# so you hear it pull, then fall back into the box on Bm and land on F#.'
    },
    {
      name: 'Chorus answer',
      lvl: 1,
      where: 'Chorus, bars 1–2',
      chords: [['Em', 4], ['A', 4]],
      notes: [[3, 7, 0.5], [3, 9, 1.5, 'h'], [2, 9, 2], [2, 7, 4, 'v']],
      tip: 'Pick the D, then hammer onto E without picking again. E belongs to Em, and the A at the end belongs to the A chord. Play it in the gap after a sung line.'
    }
  ]
});
