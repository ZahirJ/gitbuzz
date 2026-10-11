---
name: ingest-tab4u
description: GitBuzz source plugin for tab4u.com song pages. Reads name, artist, credits and chords per lyric line (no lyrics) into a sources/<id>/tab4u.json record.
---

# Ingest plugin: Tab4U

Writes `sources/<id>/tab4u.json`. The format is in `docs/ARCHITECTURE.md`. Usually called by `add-song-by-url`.

## Fetch, chords only

WebFetch the song page (`https://www.tab4u.com/tabs/songs/<num>_<artist>_-_<title>.html`) with:

> Extract ONLY musical structure, no lyrics. Give: song title, artist, author/composer credits, capo or tuning notes if any, and for each section in order (use the page's own section labels, and call unlabeled lyric blocks 'unlabeled block N') the exact sequence of chord symbols as written, one output line per lyric line, chords only. Say which sections have a guitar tab (lines starting e| B| G| D| A| E|) but do not copy the tab. Do not include any lyric words.

If some lyric blocks come back without chords, fetch again with:

> Without quoting any lyrics: how many lyric blocks are there, how many lines in each, which have chord symbols above them, which block's words repeat later in the song, is there a chorus label (פזמון), and is any content locked or premium?

- If the page is locked or has no chords, write no record. Tell the router why.
- Never copy lyric words into the record, a commit, or the chat.

## Map sections

| Tab4U | GitBuzz |
|---|---|
| פתיחה | Intro |
| first unlabeled block, בית | Verse |
| פזמון, **or** an unlabeled block whose words repeat later | Chorus |
| מעבר, קטע נגינה | Interlude |
| גשר | Bridge |
| סולו | Solo |
| סיום, or a final מעבר after the ending | Outro |

- Keep the first occurrence of each section only.
- Note in `notes` any section you named yourself, for example "Tab4U does not label the refrain".
- `D4` means Dsus4; keep it as written. Write sharps and flats as on the page.

## Record

```json
{
  "plugin": "tab4u",
  "ref": "<page URL>",
  "fetched": "<YYYY-MM-DD>",
  "confidence": "high",
  "fields": {
    "name": "<title>", "artist": "<artist>", "credits": "מילים ולחן: <names>",
    "lines": { "Verse": [["E","Dm"],["F","Am"]], "Chorus": [["C","G","Dm","C"]] },
    "hasTab": ["Intro"],
    "notes": ["…"]
  }
}
```

- Use `"confidence": "medium"` when the page is a user edit with no ratings, or the chords look incomplete.
- Tab4U pages rarely state a key or tempo; leave both out, and the merge guesses the key from the chords.
