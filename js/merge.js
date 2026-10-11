/* GitBuzz · merge.js
   The "superposition" step of the data layer. A song is built from one or more source records,
   each produced by an ingest plugin (tab4u, ultimate-guitar, web, audio, paste, manual).
   For every field the merge takes the best available source, records where each field came
   from (provenance), and lists disagreements (conflicts) instead of hiding them.
   Pure: runs in the browser and in Node (tools/merge-song.js). Record format: docs/ARCHITECTURE.md */
(function (root) {
  'use strict';
  const T = (root.GitBuzz && root.GitBuzz.theory) || (typeof require !== 'undefined' ? require('./theory.js') : null);

  /* Which plugins may supply each field, best first. */
  const PRIORITY = {
    identity: ['manual', 'tab4u', 'ultimate-guitar', 'web', 'paste', 'audio'],   // name, artist, credits
    key:      ['manual', 'ultimate-guitar', 'tab4u', 'web', 'paste'],            // only explicit keys; otherwise guessed from chords
    bpm:      ['manual', 'audio', 'ultimate-guitar', 'web', 'tab4u', 'paste'],
    timed:    ['manual', 'audio'],                                              // timed sections, merged section by section
    lines:    ['tab4u', 'ultimate-guitar', 'paste', 'web', 'manual'],           // chords per lyric line
    teaching: ['manual']                                                        // missions, guide, licks, tempoNote
  };
  const LINK_LABEL = {
    'tab4u': 'Chords and lyrics on Tab4U',
    'ultimate-guitar': 'Chords on Ultimate Guitar',
    'web': 'Chord source'
  };
  const DISPLAY = { 'tab4u': 'Tab4U', 'ultimate-guitar': 'Ultimate Guitar', 'web': 'a web chord sheet', 'paste': 'your pasted page', 'audio': 'the recording', 'manual': 'GitBuzz' };
  const DEFAULT_BPM = 100;

  const rank = (list, plugin) => { const i = list.indexOf(plugin); return i < 0 ? 99 : i; };
  const byPriority = (records, list) => records.filter(r => list.includes(r.plugin)).sort((a, b) => rank(list, a.plugin) - rank(list, b.plugin));
  const has = v => v !== undefined && v !== null && v !== '';

  /** First record (by priority) that has the field. Returns {value, record} or null. */
  function pick(records, list, field) {
    for (const r of byPriority(records, list)) {
      if (r.fields && has(r.fields[field])) return { value: r.fields[field], record: r };
    }
    return null;
  }

  /** Turn chords-per-lyric-line into a practice loop: flatten, use the repeating unit if there is
      one, cap at 16 chords, 4 beats per chord; a one-chord section gets 2 bars. */
  function deriveSection(lines) {
    const seq = lines.flat().filter(Boolean);
    if (!seq.length) return null;
    let loop = seq;
    for (let p = 2; p <= seq.length / 2; p++) {
      if (seq.slice(0, p).join(' ') === seq.slice(p, 2 * p).join(' ')) { loop = seq.slice(0, p); break; }
    }
    if (loop.length > 16) loop = loop.slice(0, 16);
    if (loop.length === 1) return [[loop[0], 8]];
    return loop.map(c => [c, 4]);
  }

  const sameValue = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  /** Merge source records into one song. */
  function mergeRecords(id, records) {
    const provenance = {}, conflicts = [], notes = [];
    const song = { id };
    const label = r => r.plugin + (r.ref ? ' (' + r.ref + ')' : '');

    // identity
    for (const f of ['name', 'artist', 'credits']) {
      const p = pick(records, PRIORITY.identity, f);
      if (!p) continue;
      song[f] = p.value; provenance[f] = p.record.plugin;
      byPriority(records, PRIORITY.identity).forEach(r => {
        if (r !== p.record && r.fields && has(r.fields[f]) && String(r.fields[f]).trim() !== String(p.value).trim())
          conflicts.push({ field: f, chosen: p.record.plugin, value: p.value, other: r.plugin, otherValue: r.fields[f] });
      });
    }

    // chords per lyric line, from the best chord source
    const lineSrc = pick(records, PRIORITY.lines, 'lines');

    // sections: timed (manual > audio) per section, else derived from lines
    const sections = {}, sectionFrom = {};
    const order = [];
    if (lineSrc) Object.keys(lineSrc.value).forEach(k => order.push(k));
    byPriority(records, PRIORITY.timed).forEach(r => Object.keys((r.fields && r.fields.sections) || {}).forEach(k => { if (!order.includes(k)) order.push(k); }));
    for (const name of order) {
      const timed = byPriority(records, PRIORITY.timed).find(r => r.fields.sections && r.fields.sections[name]);
      if (timed) { sections[name] = timed.fields.sections[name]; sectionFrom[name] = timed.plugin; continue; }
      if (lineSrc && lineSrc.value[name]) {
        const d = deriveSection(lineSrc.value[name]);
        if (d) { sections[name] = d; sectionFrom[name] = lineSrc.record.plugin + ':derived'; }
      }
    }
    // Verse first: the app opens on the first section
    // Verse, then Chorus, then the rest in song order: the app opens on the first section
    const keys = Object.keys(sections);
    for (const first of ['Chorus', 'Verse']) if (keys.includes(first)) { keys.splice(keys.indexOf(first), 1); keys.unshift(first); }
    song.sections = {}; keys.forEach(k => { song.sections[k] = sections[k]; });
    provenance.sections = sectionFrom;
    if (!keys.length) notes.push('No chords found in any source.');

    // key: explicit key from a source, otherwise guessed from all chords; the audio estimate is a cross-check
    const explicit = pick(records, PRIORITY.key, 'key');
    const allChords = keys.flatMap(k => song.sections[k].map(c => c[0]));
    const guess = allChords.length ? T.guessKey(allChords) : null;
    if (explicit) { song.tonic = explicit.value.tonic; song.mode = explicit.value.mode; provenance.key = explicit.record.plugin; }
    else if (guess) {
      song.tonic = guess.tonic; song.mode = guess.mode; provenance.key = 'guessed from chords';
      if (!guess.confident) notes.push(`Key is close between ${T.keyName(guess)} and ${T.keyName(guess.runnerUp)}.`);
    }
    const audioKey = records.find(r => r.plugin === 'audio' && r.fields && r.fields.key);
    if (audioKey && has(song.tonic)) {
      const a = audioKey.fields.key;
      const relative = (x, y) => x.mode === 'major' && y.mode !== 'major' && T.mod12(x.tonic + 9) === y.tonic;
      const agrees = (a.tonic === song.tonic && (a.mode === song.mode || a.mode !== 'major' && song.mode !== 'major')) || relative(a, song) || relative(song, a);
      if (!agrees) conflicts.push({ field: 'key', chosen: provenance.key, value: T.keyName(song), other: 'audio', otherValue: T.keyName(a) });
    }

    // tempo
    const bpm = pick(records, PRIORITY.bpm, 'bpm');
    song.bpm = bpm ? bpm.value : DEFAULT_BPM; provenance.bpm = bpm ? bpm.record.plugin : 'default';
    byPriority(records, PRIORITY.bpm).forEach(r => {
      if (bpm && r !== bpm.record && r.fields && has(r.fields.bpm) && Math.abs(r.fields.bpm - bpm.value) / bpm.value > 0.03)
        conflicts.push({ field: 'bpm', chosen: bpm.record.plugin, value: bpm.value, other: r.plugin, otherValue: r.fields.bpm });
    });

    // teaching content and hand-written notes
    for (const f of ['missions', 'guide', 'licks', 'tempoNote']) {
      const p = pick(records, PRIORITY.teaching, f);
      if (p) { song[f] = p.value; provenance[f] = 'manual'; }
    }
    if (!song.tempoNote) song.tempoNote = tempoNote(song, records, bpm, sectionFrom, keys);

    // links: every source page, then each record's own links, then search links if missing
    const links = [];
    const addLink = (l, u) => { if (u && /^https:\/\//.test(u) && !links.some(x => x[1] === u)) links.push([l, u]); };
    byPriority(records, PRIORITY.identity).forEach(r => {
      if (LINK_LABEL[r.plugin] && /^https:\/\//.test(r.ref || '')) {
        const host = r.ref.split('/')[2].replace(/^(www|amp)\./, '');
        const what = r.fields && r.fields.lines ? 'Chord source' : r.fields && has(r.fields.bpm) ? 'Tempo source' : 'Source';
        addLink(r.plugin === 'web' ? what + ': ' + host : LINK_LABEL[r.plugin], r.ref);
      }
      ((r.fields && r.fields.links) || []).forEach(([l, u]) => addLink(l, u));
    });
    const q = encodeURIComponent(((song.artist || '') + ' ' + (song.name || '')).trim());
    if (!links.some(([, u]) => u.includes('spotify.com'))) addLink('Find on Spotify', 'https://open.spotify.com/search/' + q);
    if (!links.some(([, u]) => u.includes('ultimate-guitar.com'))) addLink('Search Ultimate Guitar', 'https://www.ultimate-guitar.com/search.php?search_type=title&value=' + encodeURIComponent(song.name || ''));
    song.links = links;

    song.sources = records.map(r => ({ plugin: r.plugin, ref: r.ref || '', confidence: r.confidence || 'medium', fetched: r.fetched || '' }));
    song.provenance = provenance;
    song.conflicts = conflicts;
    song.notes = notes.concat(...records.map(r => (r.fields && r.fields.notes) || []));
    return song;
  }

  function tempoNote(song, records, bpm, sectionFrom, keys) {
    const parts = [];
    if (!bpm) parts.push(`Tempo not measured yet: ${song.bpm} bpm is a starting guess.`);
    else if (bpm.record.plugin === 'audio') parts.push(`${song.bpm} bpm measured from ${bpm.record.ref || 'a recording'}.`);
    else parts.push(`${song.bpm} bpm from ${DISPLAY[bpm.record.plugin] || bpm.record.plugin}${bpm.record.ref ? ' (' + bpm.record.ref.split('/')[2] + ')' : ''}.`);
    const measured = keys.filter(k => sectionFrom[k] === 'audio');
    const derived = keys.filter(k => /:derived$/.test(sectionFrom[k]));
    if (measured.length) parts.push(`Chord timing for ${measured.join(', ')} was measured from the recording.`);
    if (derived.length) { const src = sectionFrom[derived[0]].replace(':derived', ''); parts.push(`${derived.join(', ')} chords come from ${DISPLAY[src] || src} at 4 beats each.`); }
    const audio = records.find(r => r.plugin === 'audio' && r.fields && has(r.fields.tuningCents));
    if (audio && Math.abs(audio.fields.tuningCents) >= 8) parts.push(`The recording is about ${Math.abs(audio.fields.tuningCents)} cents ${audio.fields.tuningCents > 0 ? 'sharp' : 'flat'}; tune slightly ${audio.fields.tuningCents > 0 ? 'up' : 'down'} to play along.`);
    if (!measured.length && bpm && bpm.record.plugin !== 'audio') parts.push('Add the recording to measure the real timing.');
    return parts.join(' ');
  }

  const api = { PRIORITY, DISPLAY, mergeRecords, deriveSection };
  root.GitBuzz = root.GitBuzz || {};
  root.GitBuzz.merge = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
