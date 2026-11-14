"""Checks that every NASA fact the health content relies on appears in the source document, on the page the content cites.
Usage:  python -I scripts/content/verify_quotes.py <folder-made-by-extract_pdfs.py>
Exit code 0 = everything verified.  The claims are in claims.json (folder "nasa" = a NASA PDF in nasa-sources).
Claims in other folders come from NHS England leaflets and a NASA Mars document that were fetched separately; they were read
by hand on 2026-11-14 and are only checked here if you put their extracted text next to the NASA files."""
import json
import re
import sys
from pathlib import Path

TEXT = Path(sys.argv[1])
CLAIMS = json.loads((Path(__file__).parent / "claims.json").read_text(encoding="utf-8"))


def norm(t: str) -> str:
    t = t.replace("’", "'").replace("‘", "'").replace("“", '"').replace("”", '"').replace("–", "-").replace("—", "-").replace(" ", " ")
    t = re.sub(r"-\s+", "-", t)
    return re.sub(r"\s+", " ", t).strip()


def pages(path: Path) -> dict[int, str]:
    parts = re.split(r"\[\[PAGE (\d+)\]\]", path.read_text(encoding="utf-8", errors="replace"))
    return {int(parts[i]): norm(parts[i + 1]) for i in range(1, len(parts), 2)}


ok = bad = skipped = 0
cache: dict[str, dict[int, str]] = {}
for c in CLAIMS:
    path = TEXT / f"{c['file']}.txt"
    if not path.exists():
        skipped += 1
        continue
    cache.setdefault(c["file"], pages(path))
    found = [p for p, t in cache[c["file"]].items() if norm(c["quote"]) in t]
    if not found:
        bad += 1
        print(f"MISSING     {c['file']} p.{c['page']}: {c['quote']!r}")
    elif c["page"] is not None and c["page"] not in found:
        bad += 1
        print(f"WRONG PAGE  {c['file']}: cited p.{c['page']}, found on p.{found}: {c['quote']!r}")
    else:
        ok += 1
print(f"{ok} verified, {bad} problems, {skipped} skipped (source text not present)")
sys.exit(1 if bad else 0)
