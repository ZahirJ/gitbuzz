/* GitBuzz · ingest/plugins.js
   The in-app source plugins: Tab4U, Ultimate Guitar, and a generic chord sheet fallback.
   Each one only knows its site's quirks (title format, page furniture to skip); the shared
   chordsheet engine does the parsing. To add a site, register another plugin here. */
(function (root) {
  'use strict';
  const GB = root.GitBuzz;
  const { parseSheet } = GB.chordsheet;
  const today = () => new Date().toISOString().slice(0, 10);
  const firstMatch = (text, res) => { for (const re of res) { const m = re.exec(text); if (m) return m; } return null; };
  const record = (plugin, parsed, ref, confidence) => ({
    plugin: 'paste', source: plugin, ref, fetched: today(), confidence, fields: parsed.fields
  });

  GB.ingest.register({
    id: 'tab4u',
    label: 'Tab4U page',
    matchUrl: u => /(^|\.)tab4u\.com\//i.test(u.replace(/^https?:\/\//, '')),
    detect(text) {
      let s = 0;
      if (/tab4u/i.test(text)) s += 0.5;
      if (/אקורדים לשיר/.test(text)) s += 0.4;
      if (/^\s*(פזמון|פתיחה|מעבר|בית)\s*:/m.test(text)) s += 0.3;
      if (/[֐-׿]/.test(text)) s += 0.1;
      return Math.min(1, s);
    },
    parse(text) {
      const parsed = parseSheet(text, {
        startAt: [/^הצג אקורדים$/, /^שנה טון/, /^תווים לשיר זה$/],
        stopAt: [/^דירוג אקורדים/, /^שירים נוספים/, /^תגובות ל/, /^התחבר להגיב/, /^- שירים נוספים/],
        skip: [/^גיטרה (ראשונה|שניה|שנייה|בס)\s*:?/, /^(capo|קאפו)/i, /^כיוון:/],
        meta(t) {
          const m = firstMatch(t, [/אקורדים לשיר\s+(.+?)\s+של\s+(.+?)\s*(?=מחבר|מילים|הידעת|\||$)/m, /^\s*(.{2,40}?)\s+\/\s+(.{2,40}?)\s*$/m]);
          const c = /(?:מחבר ומלחין|מילים ולחן)\s*:\s*([^\n]+?)\s*(הידעת|$)/m.exec(t);
          return { name: m && m[1].trim(), artist: m && m[2].trim(), credits: c ? 'מילים ולחן: ' + c[1].trim() : undefined };
        }
      });
      return { record: record('tab4u', parsed, 'pasted Tab4U page', 'medium'), sheet: parsed.sheet, stats: parsed.stats };
    }
  });

  GB.ingest.register({
    id: 'ultimate-guitar',
    label: 'Ultimate Guitar page',
    matchUrl: u => /(^|\.)ultimate-guitar\.com\//i.test(u.replace(/^https?:\/\//, '')),
    detect(text) {
      let s = 0;
      if (/ultimate-guitar|ultimate guitar/i.test(text)) s += 0.5;
      if (/^\s*\[(verse|chorus|intro|bridge|pre-chorus|outro|solo|interlude)[^\]]*\]\s*$/im.test(text)) s += 0.4;
      if (/\b(Chords|Tab)\s+by\s+/i.test(text)) s += 0.2;
      return Math.min(1, s);
    },
    parse(text) {
      const parsed = parseSheet(text, {
        stopAt: [/^(Last update|Rating|Please, rate this tab|Welcome Offer|X$)/i, /^Report bad tab/i, /^Comments$/i],
        skip: [/^(Tuning|Capo|Key|Author|Difficulty|Strumming)\s*:/i],
        meta(t) {
          const m = firstMatch(t, [/^\s*(.+?)\s+(?:Chords|Tab|Tabs|Ukulele Chords)\s+by\s+(.+?)\s*$/im, /^\s*(.+?)\s+chords\s+&\s+lyrics\s+by\s+(.+?)\s*$/im]);
          const k = /^\s*Key\s*:\s*([A-G][#b]?)(m)?\b/im.exec(t);
          const key = k ? { tonic: GB.theory.pcOf(k[1]), mode: k[2] ? 'minor' : 'major' } : undefined;
          return { name: m && m[1].trim(), artist: m && m[2].trim(), key };
        }
      });
      return { record: record('ultimate-guitar', parsed, 'pasted Ultimate Guitar page', 'medium'), sheet: parsed.sheet, stats: parsed.stats };
    }
  });

  GB.ingest.register({
    id: 'web',
    label: 'Chord sheet',
    matchUrl: () => false,
    detect: () => 0.05,
    parse(text) {
      const parsed = parseSheet(text, {});
      return { record: record('web', parsed, 'pasted chord sheet', 'low'), sheet: parsed.sheet, stats: parsed.stats };
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
