#!/usr/bin/env python3
"""Regenerates site/img/qr.svg (the QR code printed on the share image and the PDFs).
Needs the Python package `qrcode` (pip install qrcode). Usage: python3 scripts/make_qr.py [URL]
The SVG holds one 1x1 square per dark module and no quiet zone: site/js/report.js adds the margin."""
import sys, pathlib
import qrcode
from qrcode.constants import ERROR_CORRECT_M

url = sys.argv[1] if len(sys.argv) > 1 else "https://compara29n.vercel.app/"
q = qrcode.QRCode(error_correction=ERROR_CORRECT_M, border=0, box_size=1)
q.add_data(url)
q.make(fit=True)
m = q.get_matrix()
n = len(m)
cells = "".join(f"M{x} {y}h1v1h-1z" for y, row in enumerate(m) for x, v in enumerate(row) if v)
svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {n} {n}" width="{n*8}" height="{n*8}" shape-rendering="crispEdges">'
       f'<rect width="{n}" height="{n}" fill="#fff"/><path fill="#1c1a17" d="{cells}"/></svg>\n')
out = pathlib.Path(__file__).resolve().parent.parent / "site" / "img" / "qr.svg"
out.write_text(svg)
print(f"{url} -> {out} ({n}x{n} modules)")
