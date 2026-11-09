#!/usr/bin/env python3
"""Generate the island site (docs/) from data/ and templates/."""
import html
import json
import re
import shutil
from pathlib import Path
from string import Template

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
DOCS = ROOT / "docs"
HOME_TEMPLATE = ROOT / "templates" / "island-home.html"
FORUM_MARKER = "/*__FORUM__*/[]"

TOPIC_PAGE = Template("""<!doctype html>
<html lang="zh-Hant-TW">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>$title | $site_name</title>
<meta name="theme-color" content="#053049">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='88'%3E🏝️%3C/text%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700;900&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../../assets/css/style.css">
</head>
<body>
<div class="wrap">
  <header class="topbar">
    <a class="brand" href="../../index.html"><span>🏝️</span>$site_name</a>
    <div class="top-r"><a class="back-pill" href="$island_href">← 回$board_name</a><button class="fs-btn" id="fsBtn" type="button" aria-label="全螢幕"></button></div>
  </header>
  <section class="t-hero" style="--c:$c;--g1:$g1;--g2:$g2">
    <div class="res-band" aria-hidden="true">$residents</div>
    <span class="topic-badge">$board_icon $board_label</span>
    <h1 class="topic-title">$icon $title</h1>
    <p class="topic-tagline">$tagline</p>
    <p class="t-meta">✍ $author · $posted_at</p>
    <div class="tag-row">
$tag_chips
    </div>
  </section>
  <article class="card content">
$content
  </article>
  <nav class="topic-nav">
$nav_prev
$nav_next
  </nav>
  <footer class="site-footer">
    整理自 AutoCAD顧問論壇 · <a href="$source_url" target="_blank" rel="noopener">論壇原文 ↗</a>
  </footer>
</div>
<script>
(function () {
  if (window.parent === window) return;
  document.documentElement.classList.add("in-reader");
  document.addEventListener("click", function (e) {
    var a = e.target.closest(".topic-nav a");
    if (!a) return;
    e.preventDefault();
    if (a.getAttribute("href").indexOf("index.html") === 0 || a.getAttribute("href").indexOf("../../index.html") === 0) {
      window.parent.postMessage("close-reader", location.origin);
    } else {
      location.replace(a.href);
    }
  });
})();
</script>
<script src="../../assets/js/fullscreen.js"></script>
</body>
</html>
""")


def load_json(p: Path):
    return json.loads(p.read_text(encoding="utf-8"))


def residents_html(res) -> str:
    spans = []
    for i, (emoji, kind) in enumerate(res):
        kind = "f" if kind == "f" else "w"
        spans.append(
            f'<span class="rs {kind} b{i}" style="--t:{9 + i * 3}s;--d:-{i * 2.3:.1f}s"><i><b>{emoji}</b></i></span>'
        )
    return "".join(spans)


def nav_link(href: str, label: str) -> str:
    return f'    <a class="btn-ghost" href="{href}">{html.escape(label)}</a>'


def load_topics():
    by_board = {}
    for tdir in sorted((DATA / "topics").iterdir()):
        meta_path = tdir / "meta.json"
        if not meta_path.exists():
            continue
        meta = load_json(meta_path)
        content = (tdir / "content.html").read_text(encoding="utf-8")
        meta["_content"] = content
        meta["_videos"] = len(re.findall(r"<iframe", content))
        meta["_dir"] = tdir
        by_board.setdefault(meta["board"], []).append(meta)
    for topics in by_board.values():
        topics.sort(key=lambda m: m.get("order", 0))
    return by_board


def topic_card(board_id, m):
    return {
        "e": m["icon"],
        "title": m["title"],
        "tagline": m["tagline"],
        "videos": m["_videos"],
        "href": f'{board_id}/{m["id"]}/index.html',
    }


def write_home(boards, by_board):
    forum = []
    for b in boards:
        metas = by_board.get(b["id"], [])
        subs = [
            {
                "name": s["name"],
                "e": s["icon"],
                "sub": s["tagline"],
                "url": s["url"],
                "locked": bool(s.get("locked")),
                "topics": [topic_card(b["id"], m) for m in metas if m.get("sub") == s["id"]],
            }
            for s in b.get("subs", [])
        ]
        forum.append({
            "id": b["id"],
            "route": b["route"],
            "name": b["name"],
            "e": b["icon"],
            "sub": b["tagline"],
            "guide": b["guide"],
            "forum": b["forum"],
            "url": b["url"],
            "c": b["c"],
            "g": b["g"],
            "dc": b["dc"],
            "res": b["res"],
            "topics": [topic_card(b["id"], m) for m in metas if not m.get("sub")],
            "subs": subs,
            "total": len(metas),
        })
    template = HOME_TEMPLATE.read_text(encoding="utf-8")
    if template.count(FORUM_MARKER) != 1:
        raise SystemExit(f"{FORUM_MARKER} must appear exactly once in {HOME_TEMPLATE}")
    data = json.dumps(forum, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    (DOCS / "index.html").write_text(template.replace(FORUM_MARKER, data), encoding="utf-8", newline="\n")


def write_topics(board, topics, site_name):
    island_href = f'../../index.html#isle-{board["id"]}'
    sub_names = {s["id"]: s["name"] for s in board.get("subs", [])}
    for idx, meta in enumerate(topics):
        label = board["name"]
        if meta.get("sub"):
            label += f'・{sub_names[meta["sub"]]}'
        topic_dir = DOCS / board["id"] / meta["id"]
        topic_dir.mkdir(parents=True, exist_ok=True)

        src_images = meta["_dir"] / "images"
        if src_images.exists() and any(src_images.iterdir()):
            dst_images = topic_dir / "images"
            if dst_images.exists():
                shutil.rmtree(dst_images)
            shutil.copytree(src_images, dst_images)

        back = f'回{board["name"]}'
        if idx > 0:
            prev_meta = topics[idx - 1]
            nav_prev = nav_link(f'../{prev_meta["id"]}/index.html', f'← {prev_meta["title"]}')
        else:
            nav_prev = nav_link(island_href, f"← {back}")
        if idx < len(topics) - 1:
            next_meta = topics[idx + 1]
            nav_next = nav_link(f'../{next_meta["id"]}/index.html', f'{next_meta["title"]} →')
        else:
            nav_next = nav_link("../../index.html", "回大地圖 →")

        page = TOPIC_PAGE.substitute(
            site_name=html.escape(site_name),
            title=html.escape(meta["title"]),
            icon=meta["icon"],
            tagline=html.escape(meta["tagline"]),
            author=html.escape(meta["author"]),
            posted_at=html.escape(meta["posted_at"]),
            tag_chips="\n".join(f'      <span class="tag-chip">{html.escape(t)}</span>' for t in meta.get("tags", [])),
            content=meta["_content"],
            nav_prev=nav_prev,
            nav_next=nav_next,
            source_url=html.escape(meta["source_url"], quote=True),
            island_href=island_href,
            board_name=html.escape(board["name"]),
            board_label=html.escape(label),
            board_icon=board["icon"],
            c=board["c"],
            g1=board["g"][0],
            g2=board["g"][1],
            residents=residents_html(board["res"]),
        )
        (topic_dir / "index.html").write_text(page, encoding="utf-8", newline="\n")


def main():
    config = load_json(ROOT / "site_config.json")
    boards = sorted(load_json(DATA / "boards.json"), key=lambda b: b["route"])
    by_board = load_topics()

    DOCS.mkdir(exist_ok=True)
    (DOCS / ".nojekyll").touch()

    write_home(boards, by_board)
    for board in boards:
        write_topics(board, by_board.get(board["id"], []), config["site_name"])

    print("Build complete ->", DOCS)


if __name__ == "__main__":
    main()
