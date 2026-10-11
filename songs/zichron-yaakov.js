/* GitBuzz song: זכרון יעקב — אושיק לוי
   Chords and structure only. Lyrics stay on the source site (see links). */
GitBuzz.registerSong({
  id: 'zichron',
  name: 'זכרון יעקב',
  artist: 'אושיק לוי',
  tonic: 9,
  mode: 'minor',
  bpm: 100,
  tempoNote: 'Tempo not measured yet: 100 bpm is a starting guess. Chords come from Tab4U at 4 beats each. Add the recording to your music folder to measure the real timing.',
  sections: {
    Verse: [
      ['E', 4],
      ['Dm', 4],
      ['F', 4],
      ['Am', 4],
      ['Am', 4],
      ['E', 4],
      ['Dm', 4],
      ['E', 4],
      ['Dm', 4],
      ['F', 4],
      ['Am', 4],
      ['G', 4],
      ['C', 4],
      ['Am', 4],
      ['E', 4],
      ['Dm', 4]
    ],
    Chorus: [['C', 4], ['G', 4], ['Dm', 4], ['C', 4], ['Am', 4], ['G', 4], ['Dm', 4], ['C', 4]],
    Intro: [['Am', 8]]
  },
  links: [
    ['Chords and lyrics on Tab4U', 'https://www.tab4u.com/tabs/songs/6116_%D7%90%D7%95%D7%A9%D7%99%D7%A7_%D7%9C%D7%95%D7%99_-_%D7%96%D7%9B%D7%A8%D7%95%D7%9F_%D7%99%D7%A2%D7%A7%D7%91.html'],
    ['Find on Spotify', 'https://open.spotify.com/search/%D7%90%D7%95%D7%A9%D7%99%D7%A7%20%D7%9C%D7%95%D7%99%20%D7%96%D7%9B%D7%A8%D7%95%D7%9F%20%D7%99%D7%A2%D7%A7%D7%91'],
    ['Search Ultimate Guitar', 'https://www.ultimate-guitar.com/search.php?search_type=title&value=%D7%96%D7%9B%D7%A8%D7%95%D7%9F%20%D7%99%D7%A2%D7%A7%D7%91']
  ],
  missions: [
    ['Home box: A minor at fret 5', 'Loop the Intro (just Am) and play Box 1 at fret 5. Start and end every phrase on an A.'],
    ['The E chord needs a G#', 'Over E, the pink dot is G#. It is not in A minor, and it is what makes this song sound Middle-Eastern and old-world. Hit it on the E, then resolve up one fret to A.'],
    ['Chorus in C', 'The Chorus leans toward C major, which uses the same notes as A minor. Use the same box, but end your phrases on C instead of A.'],
    ['Connect two boxes', 'Play one phrase that starts in Box 1 (fret 5) and ends in Box 2 (fret 8).'],
    ['Add color', 'Try Am add9 and F maj7 from the Color panel, in your strumming and as the last note of a phrase.']
  ],
  guide: {
    targets: [['E', 4, 5, 'E'], ['Dm', 3, 7, 'D'], ['F', 3, 5, 'C'], ['Am', 5, 5, 'A']],
    special: {
      chordIdx: 0,
      note: 'G#',
      pos: [2, 6],
      text: 'Over E, play G# on the D string at fret 6, between the box frets, with your middle finger. Then step up one fret to A (fret 7) when Dm arrives. A is in Dm, so the step resolves.'
    },
    record: 'Solo over the Intro (Am) and in the gaps between sung lines. Keep it simple and singing; this is a ballad.'
  }
});
