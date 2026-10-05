"""Ayrı kaynaklardan mobil kullanım için tek HTML üretir. Python 3 yeterlidir."""
from pathlib import Path
import base64
import mimetypes
import re

root = Path(__file__).resolve().parent
html = (root / 'index.html').read_text(encoding='utf-8')
css = (root / 'styles.css').read_text(encoding='utf-8')
js = (root / 'script.js').read_text(encoding='utf-8')
html = html.replace('<link rel="stylesheet" href="styles.css">', '<style>\n' + css + '</style>')
html = html.replace('  <script src="script.js" defer></script>\n', '')
html = html.replace('</body>', '<script>\n' + js + '</script>\n</body>')

def embed(match):
    path = root / match.group(1)
    mime = mimetypes.guess_type(path.name)[0] or 'application/octet-stream'
    return 'src="data:' + mime + ';base64,' + base64.b64encode(path.read_bytes()).decode('ascii') + '"'

html = re.sub(r'src="(assets/[^\"]+)"', embed, html)
output = root / 'sihirli-kartlar-mobil.html'
output.write_text(html, encoding='utf-8')
print(output)
