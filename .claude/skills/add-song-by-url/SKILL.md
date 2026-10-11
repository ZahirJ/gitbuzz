---
name: add-song-by-url
description: Add or enrich a GitBuzz song from a link, an audio file, or a song name. Routes to the right ingest plugin skill (Tab4U, Ultimate Guitar, audio, other web pages), merges all sources, validates, commits and pushes.
---

# Add a song by URL (router)

This is the entry point of GitBuzz's data layer. Read `docs/ARCHITECTURE.md` once per session: it defines source records, the merge rules, and the no-lyrics rule.

## 1. Classify the input

| Input | Plugin skill |
|---|---|
| `tab4u.com/...` | `ingest-tab4u` |
| `ultimate-guitar.com/...` (including `tabs.ultimate-guitar.com`) | `ingest-ultimate-guitar` |
| An audio file (`.mp3 .m4a .wav .flac .ogg`): an attachment, a file in a connected folder, or a path | `ingest-audio` |
| `open.spotify.com/track/...` | No chords there. WebFetch the page for title, artist and duration only, then search Tab4U (Hebrew songs) or UG (others) for a chord source, and suggest an audio file for timing |
| `youtube.com` / `youtu.be` | Same as Spotify. The workspace can't download audio; ask the user to put an audio file in a connected folder |
| Any other `https://` page | `ingest-web` |
| A song name with no link | Hebrew title: search Tab4U (`https://www.tab4u.com/resultsSimple?tab=songs&q=<name>`); otherwise search UG (`https://www.ultimate-guitar.com/search.php?search_type=title&value=<name>`). Then route the chosen result. If several results fit, ask the user which one |

Several inputs at once (a Tab4U link plus an MP3) are normal: run every plugin, then merge once.

## 2. Find or create the song

- Look in `sources/*/` and `songs/*.js` for the same song (compare names and artists ignoring punctuation and case). If it exists, **add a record** to its `sources/<id>/` folder; this is how a song gains timing from audio or a second chord opinion.
- Otherwise choose a new id: lowercase ASCII, a short transliteration (`zichron`, `sultans`). Create `sources/<id>/`.

## 3. Run the plugin(s)

Follow the plugin skill. Each one writes `sources/<id>/<plugin>[-name].json`. A plugin must never write lyrics or a copied note-by-note tab.

## 4. Merge and check

```bash
node tools/merge-song.js <id> --report   # writes songs/<id>.js; prints provenance, conflicts, notes
```

- **New song:** add `<script src="songs/<id>.js"></script>` above `<!-- @songs-end -->` in `index.html`.
- **New song:** add a `sources/<id>/manual.json` with 5 missions (see `songs/README.md`), and a `guide` entry when there's a signature note outside the pentatonic. Re-run the merge.
- Run `node tools/validate-songs.js`. It must report 0 errors.
- Smoke test: load `index.html` with Playwright (Chromium is in `/opt/pw-browsers`; run with `NODE_PATH=$(npm root -g)`). Click the song, and confirm there are no page errors and the key line and sections look right.

## 5. Ship

- Update the "Songs included" table in `README.md`.
- Commit as Claude (`git config user.name Claude`, `git config user.email noreply@anthropic.com`), with the session's attribution lines. Say which sources were added, and that the records hold chords only. Push to `main`.
- If this session published a GitBuzz artifact: `python3 tools/bundle.py --fragment <artifact file>`, then republish the same file.

## 6. Report back

In a few lines:
- what was added or changed
- the key and how it was decided
- each section with its chords, and where they came from
- any conflicts between sources
- what's still a guess (the tempo, unless measured)
- the next useful source (for example, "add a recording to measure the timing")

Mention that the user can paste the song page into the app's **Add a song** box to see chords over the lyrics in their own browser.
