---
name: ingest-web
description: GitBuzz fallback source plugin for any other web page with chords (chord sites, blogs, lesson PDFs, sheet-music listings). Reads whatever it offers (chords per lyric line, key, tempo) into a sources/<id>/web-<host>.json record, with no lyrics.
---

# Ingest plugin: other web pages

Writes `sources/<id>/web-<short-host>.json`, for example `web-kompas.json` or `web-musicnotes.json`. A song can have several web records. The format is in `docs/ARCHITECTURE.md`.

## What a web page can give

- **Chord sheets** (chords over lyrics): `lines` per section.
- **Sheet-music shops** (Musicnotes, Sheet Music Direct): usually the published **key** and a **metronome mark**. These are good tempo sources.
- **Lessons and PDFs:** sometimes a tempo, the main riff's position, or the progression.
- **Wikipedia and articles:** sometimes the key and the progression type (for example "Andalusian cadence"). Put those in `notes`.

## Fetch, chords only

WebFetch the page with:

> Extract ONLY musical facts, no lyrics: song title, artist, stated key, stated tempo/BPM, capo, and for each section in order (use the page's labels; call unlabeled lyric blocks 'unlabeled block N') the chord symbols as written, one output line per lyric line. Do not include any lyric words or copy any tab notation.

If WebFetch declines the site, don't route around it. Report that the page isn't reachable and suggest the user paste it into the app.

## Record

```json
{
  "plugin": "web",
  "ref": "<page URL>",
  "fetched": "<YYYY-MM-DD>",
  "confidence": "medium",
  "fields": {
    "name": "…", "artist": "…",
    "key": { "tonic": 2, "mode": "minor" },
    "bpm": 146,
    "lines": { "Verse": [["Dm","C","Bb","A"]] },
    "notes": ["The source spells Bb as A#; written here as on the page"]
  }
}
```

- Include only the fields the page actually gives.
- Use `"confidence": "low"` for anonymous or obviously simplified sheets, and `"high"` for publisher sheet music.
- Map section labels as in `ingest-ultimate-guitar`, and keep only the first occurrence of each.
