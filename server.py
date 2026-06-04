#!/usr/bin/env python3
import http.server, urllib.request, urllib.parse, json, os

SHEET_ID = '1gUt92TXoxWS5popXmM7g_gvJhU3LT2twTs3wp-l1Xss'

class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.startswith('/api/sheets'):
            params = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
            gid = params.get('gid', [''])[0]
            url = f'https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?tqx=out:json&gid={gid}'
            try:
                req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(req, timeout=10) as r:
                    raw = r.read().decode('utf-8')
                # Strip /*O_o*/ prefix, extract JSON
                import re
                m = re.search(r'setResponse\((.*)\)', raw, re.DOTALL)
                data = m.group(1) if m else '{}'
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(data.encode())
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode())
        else:
            super().do_GET()

    def log_message(self, fmt, *args):
        pass  # quiet logs

os.chdir(os.path.dirname(os.path.abspath(__file__)))
http.server.HTTPServer(('', 7788), Handler).serve_forever()
