/* GitBuzz · theory.js
   Pure music theory: note names, chord parsing, scales and pentatonic boxes.
   No DOM, no audio, no app state, so it runs in the browser and in Node (tools/validate-songs.js).
   Strings are indexed 0 = low E … 5 = high e. Pitch classes: C=0 … B=11. */
(function (root) {
  'use strict';
  const SHARP = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const MIXED = ['C','C#','D','Eb','E','F','F#','G','G#','A','Bb','B'];
  const IVL = ['R','b2','2','b3','3','4','b5','5','b6','6','b7','7'];
  const SCALES = { major:[0,2,4,5,7,9,11], minor:[0,2,3,5,7,8,10], dorian:[0,2,3,5,7,9,10] };
  const MODES = Object.keys(SCALES);
  const OPEN = [40,45,50,55,59,64];          // MIDI numbers of the open strings, low E … high e
  const STRING_NAMES = ['E','A','D','G','B','e'];
  const FRETS = 15;
  const LETTER = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 };

  const mod12 = n => ((n % 12) + 12) % 12;
  const hz = midi => 440 * Math.pow(2, (midi - 69) / 12);

  /** "F#" → 6, "Bb" → 10 */
  function pcOf(name) {
    const m = /^([A-G])([#b]?)$/.exec(name);
    if (!m) return null;
    return mod12(LETTER[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0));
  }

  /** Parse a chord symbol. Returns {sym, root, iv, minor, tones, bass} or null if unknown. */
  function parseChord(sym) {
    const m = /^([A-G][#b]?)([^/\s]*)(?:\/([A-G][#b]?))?$/.exec(sym);
    if (!m) return null;
    const root = pcOf(m[1]);
    const q = m[2];
    let iv;
    if (/^(maj7|M7|Δ7?)$/.test(q)) iv = [0,4,7,11];
    else if (/^(m7|min7|-7)$/.test(q)) iv = [0,3,7,10];
    else if (/^(m|min|-)$/.test(q)) iv = [0,3,7];
    else if (/^(m9|madd9)$/.test(q)) iv = [0,3,7,2];
    else if (/^m6$/.test(q)) iv = [0,3,7,9];
    else if (/^(7|9|13)$/.test(q)) iv = [0,4,7,10];
    else if (q === '5') iv = [0,7];
    else if (/^(4|sus4|sus|7sus4)$/.test(q)) iv = [0,5,7];
    else if (/^(2|sus2)$/.test(q)) iv = [0,2,7];
    else if (/^(dim|o)$/.test(q)) iv = [0,3,6];
    else if (/^(dim7|o7)$/.test(q)) iv = [0,3,6,9];
    else if (/^(m7b5|ø)$/.test(q)) iv = [0,3,6,10];
    else if (/^(aug|\+)$/.test(q)) iv = [0,4,8];
    else if (q === '6') iv = [0,4,7,9];
    else if (/^(add9|maj9)$/.test(q)) iv = [0,4,7,2];
    else if (q === '') iv = [0,4,7];
    else return null;
    return { sym, root, iv, minor: iv.includes(3), tones: iv.map(i => mod12(root + i)), bass: m[3] ? pcOf(m[3]) : root };
  }

  /** Whether a key is spelled with flats. song = {tonic, mode} */
  function useFlats(song) {
    return song.mode === 'major' ? [5,10,3,8,1,6].includes(song.tonic) : [2,7,0,5,10,3].includes(song.tonic);
  }
  function noteName(pc, song) { return (song && useFlats(song) ? MIXED : SHARP)[mod12(pc)]; }
  function keyName(song) {
    const n = noteName(song.tonic, song);
    return song.mode === 'major' ? n + ' major' : song.mode === 'minor' ? n + ' minor' : n + ' Dorian';
  }

  /** Scale and pentatonic pitch classes for a song's key. Major keys use their relative minor pentatonic. */
  function keyData(song) {
    const full = SCALES[song.mode].map(i => mod12(song.tonic + i));
    const minorRoot = song.mode === 'major' ? mod12(song.tonic + 9) : song.tonic;
    const pent = [0,3,5,7,10].map(i => mod12(minorRoot + i));
    return { full, pent, minorRoot };
  }

  /** Pentatonic box k (1–5): two notes per string, starting on pentatonic degree k on the low E string. */
  function boxCells(song, k) {
    const { pent } = keyData(song);
    const startFret = mod12(pent[k - 1] - 4);
    let pitch = 40 + startFret;
    const cells = [];
    for (let s = 0; s < 6; s++) {
      for (let n = 0; n < 2; n++) {
        if (!(s === 0 && n === 0)) { do { pitch++; } while (!pent.includes(pitch % 12)); }
        cells.push({ s, f: pitch - OPEN[s], midi: pitch });
      }
    }
    const fr = cells.map(c => c.f);
    return { cells, min: Math.min(...fr), max: Math.max(...fr), start: startFret };
  }

  /** Pitch class at a string/fret position. */
  function pcAt(string, fret) { return (OPEN[string] + fret) % 12; }

  const api = { SHARP, MIXED, IVL, SCALES, MODES, OPEN, STRING_NAMES, FRETS, LETTER,
    mod12, hz, pcOf, parseChord, useFlats, noteName, keyName, keyData, boxCells, pcAt };
  root.GitBuzz = root.GitBuzz || {};
  root.GitBuzz.theory = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
