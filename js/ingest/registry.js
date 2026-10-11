/* GitBuzz · ingest/registry.js
   In-app ingest plugins, the browser side of the data layer's plugin architecture.
   (Claude-side plugins are skills in .claude/skills/ingest-*; both produce the same source record.)

   A plugin is { id, label, matchUrl(url) → bool, detect(text) → 0..1, parse(text) → result }.
   result = { record, sheet, stats }:
     record: a source record (docs/ARCHITECTURE.md) with chords only, ready for GitBuzz.merge.
     sheet:  chords placed over lyric lines for display. It stays in this browser and is never committed.
   Plugins are tried in registration order; the highest detect() score wins, ties go to the earlier one. */
(function (root) {
  'use strict';
  const GB = root.GitBuzz = root.GitBuzz || {};
  const plugins = [];

  function register(p) {
    for (const k of ['id', 'label', 'detect', 'parse']) if (!p[k]) throw new Error('ingest plugin needs ' + k);
    plugins.push(p);
    return p;
  }

  /** Which plugin should handle this pasted text. */
  function choose(text) {
    let best = null, bestScore = -1;
    for (const p of plugins) {
      const sc = p.detect(text);
      if (sc > bestScore) { best = p; bestScore = sc; }
    }
    return best;
  }

  /** Which plugin a URL belongs to (for the "add by URL" hint). Audio files are a Claude-side plugin. */
  function routeUrl(url) {
    const u = String(url || '').trim();
    if (!/^https?:\/\//i.test(u) && !/\.(mp3|m4a|wav|flac|ogg)$/i.test(u)) return null;
    if (/\.(mp3|m4a|wav|flac|ogg)(\?|$)/i.test(u)) return { id: 'audio', label: 'Audio file' };
    for (const p of plugins) if (p.matchUrl && p.matchUrl(u)) return { id: p.id, label: p.label };
    return { id: 'web', label: 'Web page' };
  }

  function parse(text, pluginId) {
    const p = pluginId ? plugins.find(x => x.id === pluginId) : choose(text);
    if (!p) throw new Error('no ingest plugin available');
    const result = p.parse(text);
    result.plugin = p.id; result.pluginLabel = p.label;
    return result;
  }

  GB.ingest = { plugins, register, choose, routeUrl, parse };
})(typeof window !== 'undefined' ? window : globalThis);
