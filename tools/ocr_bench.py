"""OCR bench — best resolution/prompt/params for image-to-text. Loads model once."""
import base64, math, sys, time
import numpy as np
from io import BytesIO
from pathlib import Path
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
from llama_cpp import Llama
from llama_cpp.llama_chat_format import MTMDChatHandler
from scan2text.services.path_service import PathService
from scan2text.services.settings_service import SettingsService

PROMPTS = {
 1: "Analyze this image and extract all text, tables, and layout into clean, structured Markdown. Do not add conversational filler.",
 2: "Extract ALL visible text into Markdown. Reproduce every table as a GitHub Markdown table with correct rows and columns. Preserve numbers exactly. Use headings for titles. No commentary.",
 3: "Transcribe this document faithfully into Markdown. Keep the original language (Indonesian). Preserve tables, lists, layout. Do not translate or summarize.",
 4: "Extract every table and all text into Markdown. Reproduce each table exactly as a GitHub Markdown table with correct rows and columns. Preserve ALL numbers, units, minus signs, decimals, and symbols exactly as printed. Include captions and footnotes. Use # headings for table titles. Keep the original language. No commentary, no omissions.",
 5: "Transcribe the ENTIRE image into Markdown, omitting nothing: include every heading, title, subtitle, prose sentence, caption, footnote, and section divider, plus every table. Render each table as a GitHub Markdown table with correct rows and columns; keep side-by-side tables as SEPARATE tables. Preserve all numbers, plus/minus signs, decimals, and symbols exactly as printed. Keep the original language. No commentary.",
 6: "Text Recognition:",
 7: "Table Recognition:",
 8: "Formula Recognition:",
}

def png(img):
    b = BytesIO(); img.save(b, format="PNG"); return b.getvalue()

def _ink(img):
    g = np.asarray(img.convert("L"), dtype=np.float32) / 255.0
    return g < 0.5

def _h_cut(mask, target, win):
    h, w = mask.shape
    lo, hi = max(1, target - win), min(h - 1, target + win)
    return lo + int(np.argmin(mask[lo:hi].sum(axis=1)))

def _v_cut(mask, target, win):
    h, w = mask.shape
    lo, hi = max(1, target - win), min(w - 1, target + win)
    return lo + int(np.argmin(mask[:, lo:hi].sum(axis=0)))

def tiles(img, cap, tile_w, tile_h=900, h_ov=0.2):
    img = img.convert("RGB"); w, h = img.size
    if w * h > 40_000_000:
        f = math.sqrt(40_000_000 / (w * h)); img = img.resize((int(w*f), int(h*f)), Image.LANCZOS); w, h = img.size
    cols = max(1, round(w / tile_w)) if w > tile_w * 1.4 else 1
    rows = max(1, round(h / tile_h)) if h > tile_h * 1.4 else 1
    if cols == 1 and rows == 1:
        if max(w, h) > cap:
            f = cap / max(w, h); return [img.resize((int(w*f), int(h*f)), Image.LANCZOS)]
        return [img]
    mask = _ink(img)
    xs = [0] + [_v_cut(mask, round((c+1)*w/cols), int(0.15*w/cols)) for c in range(cols-1)] + [w]
    ys = [0] + [_h_cut(mask, round((r+1)*h/rows), int(0.15*h/rows)) for r in range(rows-1)] + [h]
    ov = int(h_ov * (w / cols))
    return [img.crop((max(0, xs[c] - (ov if c else 0)), ys[r], xs[c+1], ys[r+1]))
            for r in range(rows) for c in range(cols)]

def ocr(llm, t, prompt, mt, rp=1.0):
    b64 = base64.b64encode(png(t)).decode()
    t0 = time.time()
    out = llm.create_chat_completion(messages=[{"role":"user","content":[
        {"type":"text","text":prompt},
        {"type":"image_url","image_url":{"url":f"data:image/png;base64,{b64}"}}]}],
        max_tokens=mt, temperature=0.0, repeat_penalty=rp)
    return out["choices"][0]["message"]["content"], time.time()-t0

def main():
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("-i", "--image", default="samples/biaya.jpg")
    ap.add_argument("--cap", default="2048")
    ap.add_argument("--tile-w", type=int, default=1152)
    ap.add_argument("--prompts", type=int, nargs="+", default=[1])
    ap.add_argument("--max-tokens", type=int, default=4096)
    ap.add_argument("--repeat-penalty", type=float, default=1.0)
    ap.add_argument("--h-overlap", type=float, default=0.2)
    ap.add_argument("--out", default="bench_results")
    a = ap.parse_args()

    s = SettingsService().load(); p = PathService()
    h = MTMDChatHandler(clip_model_path=str(p.resolve_model_path(s.mmproj_path or "models/mmproj.gguf")),
                        verbose=False, use_gpu=False)
    llm = Llama(model_path=str(p.resolve_model_path(s.model_path or "models/vlm.gguf")),
                chat_handler=h, n_ctx=s.n_ctx, n_threads=s.n_threads or None,
                n_gpu_layers=0, verbose=False)
    print("model loaded")

    outdir = Path(a.out); outdir.mkdir(exist_ok=True)
    img = Image.open(a.image); name = Path(a.image).stem
    for cap in [int(x) for x in a.cap.split(",")]:
        for pk in a.prompts:
            parts, tot = [], 0.0
            ts = tiles(img, cap, a.tile_w, h_ov=a.h_overlap)
            for i, t in enumerate(ts):
                text, dt = ocr(llm, t, PROMPTS[pk], a.max_tokens, a.repeat_penalty); tot += dt
                print(f"  cap={cap} p={pk} tile{i+1}/{len(ts)} {t.size[0]}x{t.size[1]} {dt:.1f}s {len(text)}ch")
                parts.append(text)
            md = "\n\n---\n\n".join(parts)
            (outdir / f"{name}_cap{cap}_p{pk}.md").write_text(md, encoding="utf-8")
            print(f"==> {name}_cap{cap}_p{pk}.md: {len(md)} chars, {tot:.1f}s")

if __name__ == "__main__":
    main()