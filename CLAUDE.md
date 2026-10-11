# GitBuzz: notes for Claude

GitBuzz is a guitar-soloing practice web app. It runs as plain scripts with no build step, and `index.html` must keep working when opened from disk.

- **Architecture:** read `docs/ARCHITECTURE.md` first. There are three layers:
  1. sources → records (`sources/<id>/*.json`)
  2. merge (`js/merge.js`, `tools/merge-song.js`) → generated `songs/<id>.js`
  3. app (`js/`)
- **Adding or enriching songs:** use the `add-song-by-url` skill. It routes to `ingest-tab4u`, `ingest-ultimate-guitar`, `ingest-audio` or `ingest-web` in `.claude/skills/`.
- **Never** put lyrics or copied note-by-note tabs in the repo, a commit, or the chat; the repo is public. Records hold chords per lyric line only. Lyrics live in the user's browser, via the app's paste import.
- `songs/*.js` are generated. Edit `sources/<id>/manual.json` and re-run `node tools/merge-song.js <id>`.
- Before committing: `node tools/validate-songs.js` must report 0 errors. Smoke-test `index.html` in Playwright (Chromium at `/opt/pw-browsers`, `NODE_PATH=$(npm root -g)`).
- Core files in `js/` never mention a specific song.
- Commit as `Claude <noreply@anthropic.com>`.
