# Lokaler Entwicklungsserver für Cardle.
# - kein Cache, damit geänderte JS-Module sofort geladen werden
# - Sprite-Werkstatt (tools/werkstatt.html) kann Sprites und Prompt-Listen direkt nach assets/monster/ speichern
# Aufruf: python tools/serve.py [port]   (nur lokal erreichbar, 127.0.0.1)
import http.server
import json
import os
import re
import sys
import urllib.parse

WURZEL = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SPRITES = os.path.join(WURZEL, 'assets', 'monster')
ERLAUBT = {'.webp', '.png', '.json', '.csv', '.txt'}
MAX_BYTES = 8 * 1024 * 1024


def index_neu():
    """Schreibt assets/monster/index.json aus allen Dateien der Form NNN.webp oder NNN.png."""
    os.makedirs(SPRITES, exist_ok=True)
    dateien = {}
    for name in sorted(os.listdir(SPRITES)):
        m = re.fullmatch(r'(\d{3})\.(webp|png)', name)
        if m:
            stand = int(os.path.getmtime(os.path.join(SPRITES, name)))
            dateien[str(int(m.group(1)))] = f'{name}?v={stand}'
    with open(os.path.join(SPRITES, 'index.json'), 'w', encoding='utf-8') as f:
        json.dump({'version': 1, 'dateien': dateien}, f, indent=1)
    return dateien


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        '.js': 'text/javascript',
        '.mjs': 'text/javascript',
        '.css': 'text/css',
        '.svg': 'image/svg+xml',
        '.webp': 'image/webp',
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=WURZEL, **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def antwort(self, code, daten):
        body = json.dumps(daten).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        # Nur Anfragen von der eigenen Seite zulassen (keine fremden Webseiten)
        herkunft = self.headers.get('Origin')
        if herkunft and urllib.parse.urlparse(herkunft).netloc != self.headers.get('Host'):
            return self.antwort(403, {'fehler': 'fremde Herkunft'})
        url = urllib.parse.urlparse(self.path)
        if url.path == '/__index':
            return self.antwort(200, {'ok': True, 'sprites': len(index_neu())})
        if url.path != '/__speichern':
            return self.antwort(404, {'fehler': 'unbekannt'})
        name = os.path.basename(urllib.parse.parse_qs(url.query).get('datei', [''])[0])
        endung = os.path.splitext(name)[1].lower()
        if not name or endung not in ERLAUBT or name == 'index.json':
            return self.antwort(400, {'fehler': 'Dateiname nicht erlaubt'})
        laenge = int(self.headers.get('Content-Length') or 0)
        if laenge <= 0 or laenge > MAX_BYTES:
            return self.antwort(413, {'fehler': 'Datei leer oder zu groß'})
        daten = self.rfile.read(laenge)
        os.makedirs(SPRITES, exist_ok=True)
        with open(os.path.join(SPRITES, name), 'wb') as f:
            f.write(daten)
        return self.antwort(200, {'ok': True, 'datei': name, 'sprites': len(index_neu())})


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8140
    print(f'Cardle läuft auf http://localhost:{port}  (Werkstatt: /tools/werkstatt.html)')
    http.server.ThreadingHTTPServer(('127.0.0.1', port), Handler).serve_forever()
