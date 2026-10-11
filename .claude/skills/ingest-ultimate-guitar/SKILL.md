---
name: ingest-ultimate-guitar
description: GitBuzz source plugin for ultimate-guitar.com chord pages. Reads name, artist, stated key and capo, and chords per lyric line (no lyrics) into a sources/<id>/ultimate-guitar.json record. Pro and Official tabs give metadata only.
---

# Ingest plugin: Ultimate Guitar

Writes `sources/<id>/ultimate-guitar.json`. The format is in `docs/ARCHITECTURE.md`.

## Which pages work

| Page type | URL pattern | What you can read |
|---|---|---|
| Chords | `tabs.ultimate-guitar.com/tab/<artist>/<song>-chords-<n>` | Everything below |
| Tab | `…-tabs-<n>` | Name, artist, sections; the tab notes are not copied |
| Pro / Official | `…/pro/…`, `…-official-<n>`, or labelled "Pro" / "Official" | Name and artist only; the content is an interactive paid player |

When several versions exist, prefer the highest-rated **Chords** version, and say which one you used (`ref` is its URL).

If the user wants their **saved UG songs** ("My Tabs"), they need to be signed in. Use the browser with their session to list the saved songs, then ingest each chords page here. Don't ask for their password.

## Fetch, chords only

WebFetch the page with:

> Extract ONLY musical structure, no lyrics. Give: song title, artist, the key if the page states one, capo, tuning, tempo if stated, and for each section in order (use the page's [Verse]/[Chorus]/… labels) the chord symbols as written, one output line per lyric line, chords only. Say which sections contain tab notation but do not copy it. Do not include any lyric words.

If WebFetch returns only page furniture (UG renders the song with JavaScript), try once more with the prompt "Find the song content in the page data (js-store / wiki_tab content), and return only the chord symbols per line and the section labels." If that also fails, write no record and tell the router: the user can paste the page into the app instead.

## Map sections

Map UG labels to the GitBuzz names: Intro, Verse, Pre-Chorus, Chorus, Bridge, Interlude, Solo, Outro. Drop numbers ("Verse 2" → Verse), and keep only the first occurrence of each.

**Capo:** if the page says "Capo N", the chord shapes are N semitones below the sounding pitch. Store the shapes as written, and add a note such as `"Capo 2: chords are shapes; sounding key is 2 semitones higher"`. Set `key` to the **sounding** key only if the page states it.

## Record

```json
{
  "plugin": "ultimate-guitar",
  "ref": "<page URL>",
  "fetched": "<YYYY-MM-DD>",
  "confidence": "medium",
  "fields": {
    "name": "<title>", "artist": "<artist>",
    "key": { "tonic": 7, "mode": "major" },
    "bpm": 120,
    "lines": { "Verse": [["G","D"],["Em","C"]], "Chorus": [["C","G"],["D","Em"]] },
    "hasTab": ["Intro"],
    "notes": ["Version 3 of 7, rated 4.8 (1,200 ratings)"]
  }
}
```

- Leave out `key` and `bpm` unless the page states them.
- Use `"confidence": "high"` only for a highly rated version with many ratings.
