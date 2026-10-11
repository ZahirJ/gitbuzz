/* GitBuzz · songs.js
   Song registry. Each file in songs/ calls GitBuzz.registerSong({...}) once.
   Load order in index.html: theory.js → notation.js → audio.js → songs.js → songs/*.js → app.js

   Song shape (see songs/README.md for the full reference):
   {
     id: 'ascii-slug', name, artist, tonic: 0–11, mode: 'major'|'minor'|'dorian', bpm,
     tempoNote: 'where the tempo and timing came from',
     sections: { Verse: [['Am', 4], ['E', 4]], Chorus: [...] },   // first section opens by default
     links: [['label', 'https://…'], …],
     missions: [['title', 'text'], …],                            // optional, 5 recommended
     guide: { targets, special, record },                         // optional, computed if missing
     licks: [ { name, lvl, where, chords, notes, tip } ]           // optional
   } */
(function (root) {
  'use strict';
  const GB = root.GitBuzz = root.GitBuzz || {};
  GB.songs = GB.songs || [];
  GB.registerSong = function (song) {
    if (!song || !song.id) throw new Error('registerSong: song needs an id');
    if (GB.songs.some(s => s.id === song.id)) throw new Error('registerSong: duplicate id ' + song.id);
    GB.songs.push(song);
    return song;
  };
})(typeof window !== 'undefined' ? window : globalThis);
