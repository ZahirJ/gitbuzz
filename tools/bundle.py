#!/usr/bin/env python3
"""GitBuzz · bundle.py

Inlines css/ and js/ (and every song file) into one self-contained HTML file, so it can be shared
as a single file or published as a claude.ai artifact.

    python3 tools/bundle.py                          # writes dist/gitbuzz.html (full document)
    python3 tools/bundle.py --fragment out.html      # no doctype/html/head/body wrapper, for artifacts
"""
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent


def bundle(fragment: bool) -> str:
    html = (ROOT / 'index.html').read_text(encoding='utf-8')

    def css(m):
        return '<style>\n' + (ROOT / m.group(1)).read_text(encoding='utf-8') + '</style>'

    def js(m):
        code = (ROOT / m.group(1)).read_text(encoding='utf-8')
        return '<script>\n' + code.replace('</script', '<\\/script') + '</script>'

    html = re.sub(r'<link rel="stylesheet" href="((?:css)/[^"]+)">', css, html)
    html = re.sub(r'<script src="((?:js|songs)/[^"]+)"></script>', js, html)
    if fragment:
        head = html[html.index('<title>'):html.index('</head>')].rstrip()
        body = html[html.index('<body>') + len('<body>'):html.rindex('</body>')].strip()
        html = head + '\n' + body + '\n'
    return html


def main(argv):
    fragment = '--fragment' in argv
    args = [a for a in argv if not a.startswith('--')]
    out = pathlib.Path(args[0]) if args else ROOT / 'dist' / 'gitbuzz.html'
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(bundle(fragment), encoding='utf-8')
    print(f'wrote {out} ({out.stat().st_size // 1024} KB)')


if __name__ == '__main__':
    main(sys.argv[1:])
