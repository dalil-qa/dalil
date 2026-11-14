"""Extract text from the NASA PDFs in dalil-planning/nasa-sources into one text file per PDF,
with [[PAGE n]] markers (n = the PDF page number, which is what the content cites).
Usage:  python -I scripts/content/extract_pdfs.py <folder-with-pdfs> <new-empty-output-folder>
Needs:  pip install pymupdf.  Treats the PDFs as untrusted data: it only reads text and writes into the output folder."""
import sys
from pathlib import Path

import pymupdf

src, out = Path(sys.argv[1]), Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=True)
for pdf in sorted(src.glob("*.pdf")):
    doc = pymupdf.open(pdf)
    parts = [f"
[[PAGE {i}]]
" + page.get_text("text") for i, page in enumerate(doc, start=1)]
    (out / (pdf.stem + ".txt")).write_text("".join(parts), encoding="utf-8")
    print(f"{pdf.name}: {len(doc)} pages")
