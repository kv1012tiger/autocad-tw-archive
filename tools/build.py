#!/usr/bin/env python3
"""Generate the static archive site (docs/) from data/ into a board -> topic tree."""
import json
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
</body>
</html>
""")

HOME_BODY = Template("""
  <div class="card meta-card">
    <h1>$site_name</h1>
    <div class="meta">$site_tagline</div>
  </div>
  <div class="card">
    <h2>看板</h2>
    <ul class="board-list">
$board_items
    </ul>
  </div>
  <footer class="site-footer">靜態備份網站，由原站管理員維護。</footer>
""")

BOARD_BODY = Template("""
  <div class="breadcrumb"><a href="../index.html">$site_name</a> &gt; $board_name</div>
  <div class="card meta-card">
    <h1>$board_name</h1>
    <div class="meta">$board_breadcrumb</div>
  </div>
  <div class="card">
    <ul class="topic-list">
$topic_items
    </ul>
  </div>
  <footer class="site-footer">靜態備份網站，由原站管理員維護。</footer>
""")

TOPIC_BODY = Template("""
  <div class="breadcrumb"><a href="../../index.html">$site_name</a> &gt; <a href="../index.html">$board_name</a> &gt; $title</div>
  <div class="card meta-card">
    <span class="archive-tag">備份 Archived Copy</span>
    <h1>$title</h1>
    <div class="meta">
      <div>發表者：$author（$author_role）</div>
      <div>發表時間：$posted_at</div>
      $edited_line
      <div>板區：$board_breadcrumb</div>
    </div>
    <a class="source-link" href="$source_url" target="_blank" rel="noopener">原始網址：$source_url</a>
  </div>
  <div class="card">
    <div class="content">
$content
    </div>
  </div>
$comments_block
  <footer class="site-footer">
    此頁為「AutoCAD顧問論壇」主題文章之管理員原創首篇內容備份，不含其他會員回覆。<br>
    原始連結：<a href="$source_url" target="_blank" rel="noopener">$source_url_display</a>
  </footer>
""")

GISCUS_BLOCK = Template("""
  <div class="card comments-card">
    <h2>留言</h2>
    <script src="https://giscus.app/client.js"
      data-repo="$repo"
      data-repo-id="$repo_id"
      data-category="$category"
      data-category-id="$category_id"
      data-mapping="$mapping"
      data-strict="0"
      data-reactions-enabled="1"
      data-emit-metadata="0"
      data-input-position="top"
      data-theme="$theme"
      data-lang="zh-TW"
      crossorigin="anonymous"
      async>
    </script>
  </div>
""")


def load_json(p: Path):
    return json.loads(p.read_text(encoding="utf-8"))


def main():
    config = load_json(ROOT / "site_config.json")
    boards = load_json(DATA / "boards.json")

    DOCS.mkdir(exist_ok=True)
    (DOCS / ".nojekyll").touch()

    topics_by_board = {}
    topic_dirs = sorted((DATA / "topics").iterdir())
    for tdir in topic_dirs:
        meta_path = tdir / "meta.json"
        if not meta_path.exists():
            continue
        meta = load_json(meta_path)
        topics_by_board.setdefault(meta["board"], []).append((tdir, meta))

    # Homepage
    board_items = "\n".join(
        f'      <li><a href="{b["id"]}/index.html">{b["name"]}</a></li>' for b in boards
    )
    home_html = PAGE_SHELL.substitute(
        title=config["site_name"],
        css_path="assets/css/style.css",
        body=HOME_BODY.substitute(
            site_name=config["site_name"],
            site_tagline=config["site_tagline"],
            board_items=board_items,
        ),
    )
    (DOCS / "index.html").write_text(home_html, encoding="utf-8")

    # Board pages + topic pages
    for board in boards:
        board_id = board["id"]
        board_dir = DOCS / board_id
        board_dir.mkdir(exist_ok=True)

        topics = topics_by_board.get(board_id, [])
        topic_items = []
        for tdir, meta in topics:
            topic_items.append(
                f'      <li><a href="{meta["id"]}/index.html">{meta["title"]}'
                f'<span class="topic-date">{meta["posted_at"]}</span></a></li>'
            )

        board_html = PAGE_SHELL.substitute(
            title=f'{board["name"]} | {config["site_name"]}',
            css_path="../assets/css/style.css",
            body=BOARD_BODY.substitute(
                site_name=config["site_name"],
                board_name=board["name"],
                board_breadcrumb=board["breadcrumb"],
                topic_items="\n".join(topic_items) or "      <li>（尚無文章）</li>",
            ),
        )
        (board_dir / "index.html").write_text(board_html, encoding="utf-8")

        for tdir, meta in topics:
            topic_dir = board_dir / meta["id"]
            topic_dir.mkdir(exist_ok=True)

            # copy images
            src_images = tdir / "images"
            if src_images.exists():
                dst_images = topic_dir / "images"
                if dst_images.exists():
                    shutil.rmtree(dst_images)
                shutil.copytree(src_images, dst_images)

            content_html = (tdir / "content.html").read_text(encoding="utf-8")

            edited_line = ""
            if meta.get("edited_at"):
                note = f'（{meta["edited_note"]}）' if meta.get("edited_note") else ""
                edited_line = f'<div>最後編輯：{meta["edited_at"]}{note}</div>'

            comments_block = ""
            if config.get("giscus", {}).get("enabled"):
                g = config["giscus"]
                comments_block = GISCUS_BLOCK.substitute(
                    repo=g["repo"],
                    repo_id=g["repo_id"],
                    category=g["category"],
                    category_id=g["category_id"],
                    mapping=g["mapping"],
                    theme=g["theme"],
                )

            topic_html = PAGE_SHELL.substitute(
                title=f'{meta["title"]} | {config["site_name"]}',
                css_path="../../assets/css/style.css",
                body=TOPIC_BODY.substitute(
                    site_name=config["site_name"],
                    board_name=board["name"],
                    board_breadcrumb=board["breadcrumb"],
                    title=meta["title"],
                    author=meta["author"],
                    author_role=meta["author_role"],
                    posted_at=meta["posted_at"],
                    edited_line=edited_line,
                    source_url=meta["source_url"],
                    source_url_display=meta["source_url"].replace("https://", ""),
                    content=content_html,
                    comments_block=comments_block,
                ),
            )
            (topic_dir / "index.html").write_text(topic_html, encoding="utf-8")

    print("Build complete ->", DOCS)


if __name__ == "__main__":
    main()
