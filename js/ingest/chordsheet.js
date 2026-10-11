/* GitBuzz · ingest/chordsheet.js
   Shared engine for "chords over lyrics" pages (Tab4U, Ultimate Guitar, most chord sites).
   Plugins configure it with their own section labels, start/stop markers and title patterns.

   Pipeline: clean text → classify each line (header / chords / lyric / tab / note / blank)
   → keep only the song body (from the first header or chord line to a stop marker)
   → pair each chord line with the lyric line under it and place the chords on the words
   → group lines into sections; unlabeled blocks are Verse, or Chorus if their words repeat
   → record.fields.lines = chords per lyric line, per section (first occurrence only). */
(function (root) {
  'use strict';
  const T = root.GitBuzz.theory;

  const BASE_LABELS = [
    [/^(pre-?chorus|טרום[- ]פזמון|קדם[- ]פזמון)/i, 'Pre-Chorus'],
    [/^(intro|פתיחה|הקדמה)/i, 'Intro'],
    [/^(verse|בית)/i, 'Verse'],
    [/^(chorus|refrain|פזמון)/i, 'Chorus'],
    [/^(interlude|instrumental|מעבר|קטע נגינה|קטע מעבר)/i, 'Interlude'],
    [/^(bridge|גשר)/i, 'Bridge'],
    [/^(solo|סולו)/i, 'Solo'],
    [/^(outro|ending|coda|סיום|סוף)/i, 'Outro']
  ];
  const IGNORABLE = /^(x\d+|\(x\d+\)|\d+x|\||\|\||-+|\/|–|—|:|n\.?c\.?|%|\*|\.\.\.?|→)$/i;
  const HEBREW = /[֐-׿]/;
  const DIR_MARKS = /[‎‏‪-‮⁦-⁩]/g;

  /** A chord token, or null. Unknown qualities fall back to the plain major/minor chord. */
  function readChord(tok) {
    const t = tok.replace(/^[([]+|[)\],.]+$/g, '');
    if (!t) return null;
    if (T.parseChord(t)) return t;
    const m = /^([A-G][#b]?)(m(?!aj))?([\w#b+°ø()-]*)(\/[A-G][#b]?)?$/.exec(t);
    if (!m) return null;
    const simple = m[1] + (m[2] || '') + (m[4] || '');
    return T.parseChord(simple) ? simple : null;
  }

  /** Chord tokens with their column, or null if the line is not a chord line. */
  function chordLine(line) {
    const toks = [...line.matchAll(/\S+/g)];
    if (!toks.length) return null;
    const chords = [];
    for (const t of toks) {
      if (IGNORABLE.test(t[0])) continue;
      const c = readChord(t[0]);
      if (!c) return null;
      chords.push({ chord: c, col: t.index });
    }
    return chords.length ? chords : null;
  }

  function sectionLabel(line, labels) {
    const s = line.trim().replace(/^[[(]+|[\])]+$/g, '').replace(/[:：]\s*(x\s*\d+)?$/i, '').trim();
    if (!s || s.length > 32) return null;
    for (const [re, name] of labels) {
      if (re.test(s)) {
        const rest = s.replace(re, '').replace(/^[\s\d.:–-]*/, '').replace(/(x\s*\d+|\d+\s*x)$/i, '').trim();
        if (!rest || /^(\d+|[א-ת]'?|ראשון|שני|שלישי|רביעי)$/.test(rest)) return name;
      }
    }
    return null;
  }

  const isTab = line => /^\s*[eEBGDAa]\s*[|:]/.test(line) && /[-–]{3,}/.test(line);

  /** Place chords over the words of a lyric line. RTL lines, or chord lines without column spacing,
      spread the chords evenly over the words; otherwise chords keep their columns. */
  function align(chords, lyric, chordRaw) {
    const positional = !HEBREW.test(lyric) && /\S\s{2,}\S|^\s+\S/.test(chordRaw);
    if (positional) {
      const segs = [];
      const pad = lyric.padEnd(chords[chords.length - 1].col + 1);
      // snap each chord to the start of the word it falls in, so words are never split
      const cols = chords.map(c => { let k = Math.min(c.col, pad.length - 1); while (k > 0 && pad[k - 1] !== ' ' && pad[k] !== ' ') k--; return k; });
      for (let i = 1; i < cols.length; i++) if (cols[i] < cols[i - 1]) cols[i] = cols[i - 1];
      if (cols[0] > 0) segs.push({ chord: '', text: pad.slice(0, cols[0]) });
      chords.forEach((c, i) => {
        const end = i + 1 < chords.length ? cols[i + 1] : pad.length;
        segs.push({ chord: c.chord, text: pad.slice(cols[i], end) });
      });
      return segs;
    }
    const words = lyric.trim().split(/\s+/);
    const n = chords.length;
    return chords.map((c, i) => {
      const a = Math.round(i * words.length / n), b = Math.round((i + 1) * words.length / n);
      return { chord: c.chord, text: words.slice(a, b).join(' ') + (i < n - 1 ? ' ' : '') };
    });
  }

  /** opts: { labels, startAt: [regex], stopAt: [regex], skip: [regex], meta(text) → {name, artist, credits} } */
  function parseSheet(text, opts = {}) {
    const labels = (opts.labels || []).concat(BASE_LABELS);
    const raw = String(text).replace(DIR_MARKS, '').replace(/\r\n?/g, '\n').replace(/\t/g, '    ').replace(/ /g, ' ').split('\n');
    const stop = (opts.stopAt || []);
    const skip = (opts.skip || []);

    // 1. classify
    let lines = raw.map(l => {
      const t = l.replace(/\s+$/, '');
      if (!t.trim()) return { kind: 'blank' };
      if (isTab(t)) return { kind: 'tab', text: t.trim() };
      const lab = sectionLabel(t, labels);
      if (lab) return { kind: 'header', name: lab, text: t.trim() };
      const ch = chordLine(t);
      if (ch) return { kind: 'chords', chords: ch, text: t };
      if (skip.some(re => re.test(t.trim()))) return { kind: 'note', text: t.trim() };
      return { kind: 'lyric', text: t.trim() };
    });

    // 2. keep the song body
    let start = lines.findIndex((l, i) => l.kind === 'header' || l.kind === 'chords' || (l.kind === 'tab' && lines[i + 1] && lines[i + 1].kind === 'tab'));
    if (start < 0 && opts.startAt) {   // no header or chords found: fall back to the site's start marker
      const s = lines.findIndex(l => l.text && opts.startAt.some(re => re.test(l.text)));
      if (s >= 0) start = s + 1;
    }
    if (start < 0) start = 0;
    let end = lines.findIndex((l, i) => i > start && l.text && stop.some(re => re.test(l.text)));
    if (end < 0) end = lines.length;
    const body = lines.slice(start, end);

    // 3. pair chord lines with the lyric line underneath
    const items = [];
    for (let i = 0; i < body.length; i++) {
      const l = body[i];
      if (l.kind === 'chords' && body[i + 1] && body[i + 1].kind === 'lyric') {
        items.push({ kind: 'line', chords: l.chords.map(c => c.chord), segs: align(l.chords, body[i + 1].text, l.text) });
        i++;
      } else if (l.kind === 'chords') items.push({ kind: 'chords', chords: l.chords.map(c => c.chord) });
      else items.push(l);
    }

    // 4. blocks and sections
    const blocks = []; let cur = null;
    for (const it of items) {
      if (it.kind === 'blank') { cur = null; continue; }
      if (it.kind === 'header') { cur = { name: it.name, labeled: true, items: [it] }; blocks.push(cur); continue; }
      if (!cur) { cur = { name: null, labeled: false, items: [] }; blocks.push(cur); }
      cur.items.push(it);
    }
    // A labeled header followed by a blank line still owns the next unlabeled block (Tab4U puts a blank after "פזמון:")
    for (let i = 0; i < blocks.length - 1; i++) {
      const b = blocks[i];
      if (b.labeled && b.items.length === 1 && !blocks[i + 1].labeled) { b.items.push(...blocks[i + 1].items); blocks.splice(i + 1, 1); }
    }
    const firstWords = b => { const it = b.items.find(x => x.kind === 'line' || x.kind === 'lyric'); return it ? (it.kind === 'line' ? it.segs.map(s => s.text).join('') : it.text).replace(/[^\p{L}\p{N}]+/gu, ' ').trim().toLowerCase() : ''; };
    const counts = {};
    blocks.forEach(b => { const k = firstWords(b); if (k) counts[k] = (counts[k] || 0) + 1; });
    let last = null;
    blocks.forEach(b => {
      if (b.labeled) { last = b.name; return; }
      const repeats = counts[firstWords(b)] > 1;
      b.name = repeats ? 'Chorus' : 'Verse';   // unlabeled: Chorus if its words come back, otherwise Verse
      b.inferred = true;
      last = b.name;
    });

    // 5. chords per lyric line, first occurrence of each section only
    const lineMap = {}, seen = new Set();
    blocks.forEach(b => {
      const chordLines = b.items.filter(x => x.kind === 'line' || x.kind === 'chords').map(x => x.chords);
      if (!chordLines.length) return;
      if (seen.has(b.name)) return;
      seen.add(b.name);
      lineMap[b.name] = chordLines;
    });

    // 6. sheet for display (lyrics included; stays in the browser)
    const sheet = [];
    blocks.forEach(b => {
      sheet.push({ kind: 'header', name: b.name, inferred: !!b.inferred });
      b.items.forEach(it => { if (it.kind !== 'header') sheet.push(it); });
    });

    const meta = opts.meta ? opts.meta(raw.join('\n')) : {};
    const allChords = Object.values(lineMap).flat(2);
    const stats = {
      sections: Object.keys(lineMap),
      chordLines: items.filter(x => x.kind === 'line' || x.kind === 'chords').length,
      matchedLines: items.filter(x => x.kind === 'line').length,
      lyricLines: items.filter(x => x.kind === 'lyric').length + items.filter(x => x.kind === 'line').length,
      tabLines: items.filter(x => x.kind === 'tab').length,
      inferred: [...new Set(blocks.filter(b => b.inferred && lineMap[b.name]).map(b => b.name))]
    };
    const fields = { lines: lineMap };
    if (meta.name) fields.name = meta.name;
    if (meta.artist) fields.artist = meta.artist;
    if (meta.credits) fields.credits = meta.credits;
    if (meta.key) fields.key = meta.key;
    return { fields, sheet, stats, chordCount: allChords.length };
  }

  root.GitBuzz.chordsheet = { parseSheet, chordLine, readChord, sectionLabel, align, BASE_LABELS };
})(typeof window !== 'undefined' ? window : globalThis);
