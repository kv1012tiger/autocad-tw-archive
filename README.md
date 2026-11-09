# 論壇資源島

蘋果爸的 AutoCAD 教學大島群：海上散佈 12 座論壇島與 AI 知識島的 9 座問答島，還有蘋果爸小屋與課程城堡。走進論壇島，每個子版區都是一間主題小屋。

收錄內容僅限管理員自己發表的主題首篇，不包含其他會員的回覆，也不包含「回覆可見」的內容。

- 網站：https://kv1012tiger.github.io/autocad-tw-archive/

## 結構

```
templates/island-home.html   首頁模板（由 AI 知識島 knowledge.html 沿用改寫）
data/boards.json             12 座論壇島的名稱、地貌、居民、航線順序與子版區小屋
data/topics/<id>/            每篇教學的 meta.json、content.html、images/
tools/build.py               由 data/ 與 templates/ 產生 docs/
docs/                        GitHub Pages 發布內容
```

## 新增一篇教學

1. 在 `data/topics/<topic-id>/` 建立 `meta.json` 與 `content.html`，`meta.json` 的 `board` 填 `boards.json` 裡的島嶼 id；要放進子版區小屋時，再加上 `sub`（例如 `f42`）。
2. 執行 `python tools/build.py`。
3. `git commit`、`git push`。
