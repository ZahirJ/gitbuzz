/* GitBuzz · notation.js
   Text tab rendering for the guide and licks. Pure functions, depends on theory.js. */
(function (root) {
  'use strict';
  const { STRING_NAMES } = root.GitBuzz.theory;

  /** Tab with one column per note. notes = [[string, fret], …]; heads = optional labels above each column. */
  function miniTab(notes, heads, w = 5) {
    const top = heads ? '   ' + heads.map(h => String(h).padEnd(w)).join('') : null;
    const rows = [5,4,3,2,1,0].map(s => STRING_NAMES[s] + '|' +
      notes.map(([ns, f]) => (ns === s ? ('-' + f).padEnd(w, '-') : '-'.repeat(w))).join('') + '|');
    return (top ? top + '\n' : '') + rows.join('\n');
  }

  const FRAC = { 0.5:'½', 1:'1', 1.5:'1½', 2:'2', 2.5:'2½', 3:'3', 4:'4' };

  /** Tab for a lick: chord names above, techniques on the frets, beat counts below. */
  function lickTab(lick) {
    const starts = []; let acc = 0;
    lick.chords.forEach(([c, b]) => { starts.push([acc, c]); acc += b; });
    const cells = []; let beat = 0, prevF = null;
    lick.notes.forEach(([s, f, d, t]) => {
      const txt = f == null ? '·'
        : (t === 'h' && prevF != null ? 'h' + f : t === 's' && prevF != null ? '/' + f : String(f)) + (t === 'b' ? 'b' : t === 'v' ? '~' : '');
      const ch = starts.find(([a]) => a >= beat - 1e-6 && a < beat + d - 1e-6);
      cells.push({ s, txt, ch: ch ? ch[1] : '', d });
      beat += d; if (f != null) prevF = f;
    });
    const w = Math.max(...cells.map(c => Math.max(c.txt.length, c.ch.length))) + 2;
    const head = '   ' + cells.map(c => c.ch.padEnd(w)).join('');
    const rows = [5,4,3,2,1,0].map(s => STRING_NAMES[s] + '|-' + cells.map(c => (c.s === s ? c.txt : '').padEnd(w, '-')).join('') + '|');
    const beats = '   ' + cells.map(c => ((c.s == null ? '·' : '') + (FRAC[c.d] || String(c.d))).padEnd(w)).join('') + ' ← beats';
    return head + '\n' + rows.join('\n') + '\n' + beats;
  }

  root.GitBuzz.notation = { miniTab, lickTab };
})(typeof window !== 'undefined' ? window : globalThis);
