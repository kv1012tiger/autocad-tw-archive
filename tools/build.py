#!/usr/bin/env python3
"""Generate the pirate-island archive site (docs/) from data/."""
import json
import re
import shutil
from pathlib import Path
from string import Template

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
DOCS = ROOT / "docs"

PAGE_SHELL = Template("""<!doctype html>
<html lang="zh-Hant-TW">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>$title</title>
<link rel="stylesheet" href="$css_path">
</head>
<body>
<div class="wrap">
$body
</div>
<script src="$js_path"></script>
</body>
</html>
""")

TOPBAR = Template("""
  <div class="topbar">
    <a class="brand" href="$home_href">🦜 $site_name</a>
    $back_pill
  </div>
""")

HOME_BODY = Template("""
$topbar
  <div class="hero">
    <span class="eyebrow">$site_eyebrow</span>
    <h1>$site_name</h1>
    <p>$site_tagline</p>
    <div class="captain">
      <div class="avatar">🧑‍✈️</div>
      <p>$captain_line</p>
    </div>
    <div style="margin-top:22px;">
      <a class="btn btn-primary" href="#map">⚓️ 開始探索</a>
    </div>
  </div>
  <div class="stats">
    <div><b>$board_count</b> 座群島</div>
    <div><b>$topic_count</b> 篇祕笈</div>
    <div><b>$video_count</b> 支教學影片</div>
  </div>
  <div class="map" id="map">
    <div class="map-hint">點一座群島，划船過去看看裡面有什麼 🧭</div>
    <div class="map-grid">
$board_islands
    </div>
  </div>
  <footer class="site-footer">整理自 AutoCAD顧問論壇，由管理員蘋果爸維護更新。</footer>
""")

BOARD_BODY = Template("""
$topbar
  <div class="hero">
    <span class="eyebrow">ISLAND GROUP</span>
    <h1>$board_icon $board_name</h1>
    <p>$board_tagline</p>
  </div>
  <div class="stats">
    <div><b>$topic_count</b> 篇祕笈</div>
    <div><b>$video_count</b> 支教學影片</div>
  </div>
  <div class="map" id="map">
    <div class="map-hint">點一座島，看看蘋果爸留下的祕笈 📜</div>
    <div class="map-grid">
$topic_islands
    </div>
  </div>
  <footer class="site-footer">整理自 AutoCAD顧問論壇，由管理員蘋果爸維護更新。</footer>
""")

TOPIC_BODY = Template("""
$topbar
  <div class="card">
    <span class="topic-badge">ISLAND $order_padded · $board_name</span>
    <h1 class="topic-title">$icon $title</h1>
    <p class="topic-tagline">$tagline</p>
    <div class="tag-row">
$tag_chips
    </div>
  </div>
  <div class="card content">
$content
  </div>
  <div class="topic-nav">
$nav_prev
$nav_next
  </div>
  <footer class="site-footer">
    整理自 AutoCAD顧問論壇 · 🔗 <a href="$source_url" target="_blank" rel="noopener">原文連結</a>
  </footer>
""")


def load_json(p: Path):
    return json.loads(p.read_text(encoding="utf-8"))


def back_pill(href: str, label: str) -> str:
    return f'<a class="back-pill" href="{href}">{label}</a>'


def island_html(href: str, icon: str, name: str, meta: str, num: int = None, soon: bool = False, big: bool = False, critter: str = None) -> str:
    cls = "island"
    if soon:
        cls += " soon"
    if big:
        cls += " big"
    num_html = f'<div class="num">{num:02d}</div>' if num is not None else ""
    critter_html = f'<div class="critter">{critter}</div>' if critter else ""
    tag = "a" if href else "div"
    href_attr = f' href="{href}"' if href else ""
    return (
        f'<{tag} class="{cls}"{href_attr}>'
        f'<div class="shell">{num_html}{icon}</div>'
        f'{critter_html}'
        f'<div class="name">{name}</div>'
        f'<div class="meta">{meta}</div>'
        f'</{tag}>'
    )


def main():
    config = load_json(ROOT / "site_config.json")
    boards = sorted(load_json(DATA / "boards.json"), key=lambda b: b.get("order", 0))

    DOCS.mkdir(exist_ok=True)
    (DOCS / ".nojekyll").touch()

    topics_by_board = {}
    total_videos = 0
    for tdir in sorted((DATA / "topics").iterdir()):
        meta_path = tdir / "meta.json"
        if not meta_path.exists():
            continue
        meta = load_json(meta_path)
        content = (tdir / "content.html").read_text(encoding="utf-8")
        meta["_video_count"] = len(re.findall(r"<iframe", content))
        total_videos += meta["_video_count"]
        topics_by_board.setdefault(meta["board"], []).append((tdir, meta))

    for board_id, topics in topics_by_board.items():
        topics.sort(key=lambda t: t[1].get("order", 0))

    total_topics = sum(len(v) for v in topics_by_board.values())

    # ---------- Homepage ----------
    board_islands = []
    for b in boards:
        topic_n = len(topics_by_board.get(b["id"], []))
        board_islands.append(
            island_html(f'{b["id"]}/index.html', b["icon"], b["name"], f'{topic_n} 篇祕笈', big=True, critter=b.get("critter"))
        )
    board_islands.append(island_html("", "🔒", "未知群島", "敬請期待", soon=True, big=True))

    home_html = PAGE_SHELL.substitute(
        title=config["site_name"],
        css_path="assets/css/style.css",
        js_path="assets/js/map-path.js",
        body=HOME_BODY.substitute(
            topbar=TOPBAR.substitute(home_href="index.html", site_name=config["site_name"], back_pill=""),
            site_eyebrow=config["site_eyebrow"],
            site_name=config["site_name"],
            site_tagline=config["site_tagline"],
            captain_line=config["captain_line"],
            board_count=len(boards),
            topic_count=total_topics,
            video_count=total_videos,
            board_islands="\n".join(board_islands),
        ),
    )
    (DOCS / "index.html").write_text(home_html, encoding="utf-8")

    # ---------- Board + topic pages ----------
    for board in boards:
        board_id = board["id"]
        board_dir = DOCS / board_id
        board_dir.mkdir(exist_ok=True)
        topics = topics_by_board.get(board_id, [])

        topic_islands = []
        for idx, (tdir, meta) in enumerate(topics, start=1):
            topic_islands.append(
                island_html(
                    f'{meta["id"]}/index.html', meta["icon"], meta["title"],
                    f'{meta["_video_count"]} 支影片', num=idx,
                    critter=meta.get("critter", board.get("critter")),
                )
            )
        topic_islands.append(island_html("", "🔒", "下一座島", "敬請期待", soon=True))

        board_html = PAGE_SHELL.substitute(
            title=f'{board["name"]} | {config["site_name"]}',
            css_path="../assets/css/style.css",
            js_path="../assets/js/map-path.js",
            body=BOARD_BODY.substitute(
                topbar=TOPBAR.substitute(
                    home_href="../index.html", site_name=config["site_name"],
                    back_pill=back_pill("../index.html", "⬅ 回首頁"),
                ),
                board_icon=board["icon"],
                board_name=board["name"],
                board_tagline=board["tagline"],
                topic_count=len(topics),
                video_count=sum(m["_video_count"] for _, m in topics),
                topic_islands="\n".join(topic_islands),
            ),
        )
        (board_dir / "index.html").write_text(board_html, encoding="utf-8")

        for idx, (tdir, meta) in enumerate(topics):
            topic_dir = board_dir / meta["id"]
            topic_dir.mkdir(exist_ok=True)

            src_images = tdir / "images"
            if src_images.exists() and any(src_images.iterdir()):
                dst_images = topic_dir / "images"
                if dst_images.exists():
                    shutil.rmtree(dst_images)
                shutil.copytree(src_images, dst_images)

            content_html = (tdir / "content.html").read_text(encoding="utf-8")
            tag_chips = "\n".join(f'      <span class="tag-chip">{t}</span>' for t in meta.get("tags", []))

            nav_prev = ""
            nav_next = ""
            if idx > 0:
                prev_meta = topics[idx - 1][1]
                nav_prev = f'    <a class="btn-ghost" href="../{prev_meta["id"]}/index.html">⬅ {prev_meta["title"]}</a>'
            else:
                nav_prev = f'    <a class="btn-ghost" href="../index.html">⬅ 回群島地圖</a>'
            if idx < len(topics) - 1:
                next_meta = topics[idx + 1][1]
                nav_next = f'    <a class="btn-ghost" href="../{next_meta["id"]}/index.html">{next_meta["title"]} ➡</a>'
            else:
                nav_next = f'    <a class="btn-ghost" href="../index.html">回群島地圖 ➡</a>'

            topic_html = PAGE_SHELL.substitute(
                title=f'{meta["title"]} | {config["site_name"]}',
                css_path="../../assets/css/style.css",
                js_path="../../assets/js/map-path.js",
                body=TOPIC_BODY.substitute(
                    topbar=TOPBAR.substitute(
                        home_href="../../index.html", site_name=config["site_name"],
                        back_pill=back_pill("../index.html", f'⬅ 回{board["name"]}'),
                    ),
                    order_padded=f"{idx + 1:02d}",
                    board_name=board["name"],
                    icon=meta["icon"],
                    title=meta["title"],
                    tagline=meta["tagline"],
                    tag_chips=tag_chips,
                    content=content_html,
                    nav_prev=nav_prev,
                    nav_next=nav_next,
                    source_url=meta["source_url"],
                ),
            )
            (topic_dir / "index.html").write_text(topic_html, encoding="utf-8")

    print("Build complete ->", DOCS)


if __name__ == "__main__":
    main()
