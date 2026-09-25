#!/usr/bin/env python3
"""Extract text + inline images from a .docx without Word.

Text is written with paragraph breaks; each inline image becomes a U+0001
placeholder. Images are optionally saved to an output directory and listed in
a manifest whose order matches the order of the placeholders.

Usage:
  python scripts/extract-docx.py <input.docx> <output.txt> [--images <dir>]
"""
import sys
import os
import re
import json
import zipfile

TOKEN = re.compile(
    r"(?P<text><w:t[^>]*>(?P<t>.*?)</w:t>)"
    r"|(?P<tab><w:tab\b[^>]*/>)"
    r"|(?P<br><w:br\b[^>]*/>)"
    r"|(?P<blip><a:blip\b[^>]*r:embed=\"(?P<rid>[^\"]+)\")"
    r"|(?P<vimg><v:imagedata\b[^>]*r:id=\"(?P<rid2>[^\"]+)\")",
    re.S,
)
ENTITY = {"&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'"}


def unescape(s: str) -> str:
    for k, v in ENTITY.items():
        s = s.replace(k, v)
    return s


def main() -> None:
    args = sys.argv[1:]
    if len(args) < 2:
        print(__doc__)
        sys.exit(1)
    docx, out_txt = args[0], args[1]
    img_dir = None
    if "--images" in args:
        img_dir = args[args.index("--images") + 1]

    with zipfile.ZipFile(docx) as z:
        doc = z.read("word/document.xml").decode("utf-8", "ignore")
        rels = ""
        if "word/_rels/document.xml.rels" in z.namelist():
            rels = z.read("word/_rels/document.xml.rels").decode("utf-8", "ignore")
        rid2target = dict(re.findall(r'Id="([^"]+)"[^>]*?Target="([^"]+)"', rels))

        manifest = []
        if img_dir:
            os.makedirs(img_dir, exist_ok=True)

        paragraphs = re.split(r"</w:p>", doc)
        out_lines = []
        for para in paragraphs:
            buf = []
            for m in TOKEN.finditer(para):
                if m.group("text") is not None:
                    buf.append(unescape(m.group("t")))
                elif m.group("tab") is not None:
                    buf.append("\t")
                elif m.group("br") is not None:
                    buf.append("\n")
                else:
                    rid = m.group("rid") or m.group("rid2")
                    target = rid2target.get(rid)
                    idx = len(manifest) + 1
                    saved = ""
                    if target:
                        target = target.replace("\\", "/")
                        media_path = target if target.startswith("word/") else f"word/{target}"
                        media_path = media_path.replace("word/../", "")
                        if media_path in z.namelist() and img_dir:
                            ext = os.path.splitext(media_path)[1] or ".bin"
                            saved = os.path.join(img_dir, f"img{idx:03d}{ext}")
                            with z.open(media_path) as src, open(saved, "wb") as dst:
                                dst.write(src.read())
                    manifest.append({"index": idx, "rId": rid, "target": target, "savedAs": saved})
                    buf.append("\u0001")
            text = "".join(buf).strip()
            if text:
                out_lines.append(text)

        if img_dir:
            with open(os.path.join(img_dir, "manifest.json"), "w", encoding="utf-8") as f:
                json.dump(manifest, f, ensure_ascii=False, indent=2)

    with open(out_txt, "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(out_lines))
    print(f"Extracted {len(out_lines)} paragraphs, {len(manifest)} images -> {out_txt}")


if __name__ == "__main__":
    main()
