#!/usr/bin/env node
/* GitBuzz · validate-songs.js
   Checks every song file listed in index.html, without a browser:
     node tools/validate-songs.js
   Exits with code 1 if any song has errors. Warnings do not fail the run. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const listed = [...html.matchAll(/<script src="(songs\/[^"]+\.js)"><\/script>/g)].map(m => m[1]);
const onDisk = fs.readdirSync(path.join(ROOT, 'songs')).filter(f => f.endsWith('.js')).map(f => 'songs/' + f);

const sandbox = { console };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
const load = rel => vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), sandbox, { filename: rel });
load('js/theory.js');
load('js/songs.js');

const errors = [], warnings = [];
const err = (id, msg) => errors.push(`${id}: ${msg}`);
const warn = (id, msg) => warnings.push(`${id}: ${msg}`);

for (const f of onDisk) if (!listed.includes(f)) err(f, 'file exists but is not loaded in index.html');
for (const f of listed) {
  if (!onDisk.includes(f)) { err(f, 'listed in index.html but missing on disk'); continue; }
  try { load(f); } catch (e) { err(f, 'failed to load: ' + e.message); }
}

const T = sandbox.GitBuzz.theory;
const songs = sandbox.GitBuzz.songs;
const N = n => T.SHARP[n];
const same = (a, b) => T.pcOf(a) === T.pcOf(b);   // C# and Db count as the same note

for (const s of songs) {
  const id = s.id;
  if (!/^[a-z0-9-]+$/.test(id)) err(id, 'id must be lowercase ASCII letters, digits or dashes');
  for (const k of ['name', 'artist', 'tempoNote']) if (!s[k]) err(id, `missing ${k}`);
  if (!(Number.isInteger(s.tonic) && s.tonic >= 0 && s.tonic <= 11)) err(id, 'tonic must be an integer 0–11');
  if (!T.MODES.includes(s.mode)) err(id, `mode must be one of ${T.MODES.join(', ')}`);
  if (!(s.bpm >= 40 && s.bpm <= 240)) err(id, 'bpm must be between 40 and 240');

  const secs = s.sections || {};
  if (!Object.keys(secs).length) err(id, 'needs at least one section');
  for (const [name, prog] of Object.entries(secs)) {
    if (!Array.isArray(prog) || !prog.length) { err(id, `section ${name} is empty`); continue; }
    prog.forEach(([c, b], i) => {
      if (!T.parseChord(c)) err(id, `section ${name} chord ${i + 1} "${c}" is not a chord the app can read`);
      if (!(b > 0 && b <= 16)) err(id, `section ${name} chord ${i + 1} "${c}" has bad length ${b}`);
    });
  }

  (s.links || []).forEach(([label, url]) => { if (!/^https:\/\//.test(url)) err(id, `link "${label}" must be https`); });
  if (!(s.links || []).length) warn(id, 'no links (add the chord source)');
  if (s.missions && s.missions.length !== 5) warn(id, `has ${s.missions.length} missions (5 recommended)`);

  if (s.guide) {
    const g = s.guide;
    (g.targets || []).forEach(([c, str, fret, name], i) => {
      const ch = T.parseChord(c);
      const pc = T.pcAt(str, fret);
      if (!same(name, N(pc))) err(id, `guide target ${i + 1}: string ${str} fret ${fret} is ${N(pc)}, not ${name}`);
      if (ch && !ch.tones.includes(pc)) err(id, `guide target ${i + 1}: ${N(pc)} is not a note of ${c}`);
    });
    if (g.special) {
      const verse = secs.Verse || Object.values(secs)[0];
      const chordAt = verse && verse[g.special.chordIdx];
      const [str, fret] = g.special.pos;
      const pc = T.pcAt(str, fret);
      if (!chordAt) err(id, `guide special: chordIdx ${g.special.chordIdx} is outside the first section`);
      else {
        const ch = T.parseChord(chordAt[0]);
        if (ch && !ch.tones.includes(pc)) err(id, `guide special: ${N(pc)} is not a note of ${chordAt[0]}`);
      }
      if (!same(g.special.note, N(pc))) err(id, `guide special: string ${str} fret ${fret} is ${N(pc)}, not ${g.special.note}`);
    }
  }

  (s.licks || []).forEach((L, li) => {
    const tag = `lick "${L.name}"`;
    const chordBeats = L.chords.reduce((a, [, b]) => a + b, 0);
    const noteBeats = L.notes.reduce((a, n) => a + n[2], 0);
    if (Math.abs(chordBeats - noteBeats) > 1e-9) err(id, `${tag}: notes last ${noteBeats} beats but chords last ${chordBeats}`);
    if (![1, 2, 3].includes(L.lvl)) err(id, `${tag}: lvl must be 1, 2 or 3`);
    L.chords.forEach(([c]) => { if (!T.parseChord(c)) err(id, `${tag}: chord "${c}" is not readable`); });
    // Notes that start a chord, or are held 2+ beats, should be chord tones (bends count by their target note).
    let beat = 0;
    L.notes.forEach(([str, fret, d, tech], ni) => {
      if (fret != null) {
        if (!(str >= 0 && str <= 5 && fret >= 0 && fret <= T.FRETS)) err(id, `${tag} note ${ni + 1}: position out of range`);
        let acc = 0, chord = null, startsChord = false;
        for (const [c, b] of L.chords) { if (beat < acc + b - 1e-9) { chord = T.parseChord(c); startsChord = Math.abs(beat - acc) < 1e-9; break; } acc += b; }
        const pc = T.mod12(T.pcAt(str, fret) + (tech === 'b' ? 2 : 0));
        if (chord && (startsChord || d >= 2) && !chord.tones.includes(pc) && pc !== chord.bass) warn(id, `${tag} note ${ni + 1}: ${N(pc)} is held or lands on ${chord.sym} but is not a chord tone`);
      }
      beat += d;
    });
  });
}

const ids = songs.map(s => s.id);
ids.forEach((id, i) => { if (ids.indexOf(id) !== i) err(id, 'duplicate id'); });

/* ---------- source records (sources/<id>/*.json) ---------- */
const PLUGINS = ['tab4u', 'ultimate-guitar', 'web', 'audio', 'paste', 'manual'];
const FORBIDDEN = ['lyrics', 'lyric', 'text', 'sheet', 'words'];   // lyrics never go in the repo
const SRC = path.join(ROOT, 'sources');
const srcIds = fs.existsSync(SRC) ? fs.readdirSync(SRC).filter(d => fs.statSync(path.join(SRC, d)).isDirectory()) : [];
for (const s of songs) if (!srcIds.includes(s.id)) warn(s.id, 'has no sources/' + s.id + '/ folder (song file is not generated)');
for (const id of srcIds) {
  if (!ids.includes(id)) err(id, `sources/${id}/ exists but songs/${id}.js is not loaded (run tools/merge-song.js ${id} and add the script tag)`);
  for (const f of fs.readdirSync(path.join(SRC, id)).filter(f => f.endsWith('.json'))) {
    const tag = `sources/${id}/${f}`;
    let r;
    try { r = JSON.parse(fs.readFileSync(path.join(SRC, id, f), 'utf8')); } catch (e) { err(tag, 'is not valid JSON: ' + e.message); continue; }
    if (!PLUGINS.includes(r.plugin)) err(tag, `plugin must be one of ${PLUGINS.join(', ')}`);
    if (['tab4u', 'ultimate-guitar', 'web'].includes(r.plugin) && !/^https:\/\//.test(r.ref || '')) err(tag, 'ref must be the https URL of the page');
    if (r.confidence && !['high', 'medium', 'low'].includes(r.confidence)) err(tag, 'confidence must be high, medium or low');
    const fl = r.fields || {};
    for (const k of FORBIDDEN) if (k in fl) err(tag, `field "${k}" is not allowed: lyrics are never stored in the repo`);
    if (fl.key && !(Number.isInteger(fl.key.tonic) && T.MODES.includes(fl.key.mode))) err(tag, 'key must be {tonic: 0–11, mode}');
    if ('bpm' in fl && !(fl.bpm >= 40 && fl.bpm <= 240)) err(tag, 'bpm must be between 40 and 240');
    for (const [sec, lines] of Object.entries(fl.lines || {})) {
      if (!Array.isArray(lines)) { err(tag, `lines.${sec} must be an array of lines`); continue; }
      lines.forEach((line, i) => (Array.isArray(line) ? line : [line]).forEach(c => {
        if (typeof c !== 'string' || !T.parseChord(c)) err(tag, `lines.${sec}[${i}] has "${c}", which is not a readable chord (lines hold chord symbols only)`);
      }));
    }
    for (const [sec, prog] of Object.entries(fl.sections || {})) {
      (prog || []).forEach(([c, b], i) => { if (!T.parseChord(c) || !(b > 0)) err(tag, `sections.${sec}[${i}] is not [chord, beats]`); });
    }
  }
}
if (srcIds.length) {
  const r = require('child_process').spawnSync(process.execPath, [path.join(__dirname, 'merge-song.js'), '--check'], { encoding: 'utf8' });
  if (r.status !== 0) err('songs', 'generated song files are out of date with their records:\n' + r.stdout.trim());
}

warnings.forEach(w => console.log('warning  ' + w));
errors.forEach(e => console.log('ERROR    ' + e));
console.log(`\n${songs.length} songs checked: ${errors.length} errors, ${warnings.length} warnings`);
process.exit(errors.length ? 1 : 0);
