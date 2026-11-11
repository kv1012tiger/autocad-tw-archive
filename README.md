# 論壇資源島

蘋果爸的 AutoCAD 教學大島群：海上散佈 12 座論壇島與 AI 知識島的 9 座問答島，還有蘋果爸小島與AI課程城堡。走進論壇島，每個子版區都是一間主題小屋。

收錄內容僅限管理員自己發表的主題首篇，不包含其他會員的回覆，也不包含「回覆可見」的內容。

- 網站：https://kv1012tiger.github.io/autocad-tw-island/

## 授權說明

本站與本 repo 的文章、圖片、影片連結及網站內容，著作權屬蘋果爸／AutoCAD顧問論壇所有，採用 [創用 CC 姓名標示-非商業性-禁止改作 4.0 國際（CC BY-NC-ND 4.0）](https://creativecommons.org/licenses/by-nc-nd/4.0/deed.zh-hant) 授權，條款全文見 [LICENSE](LICENSE)。

- ✅ 歡迎閱讀、參考學習、分享連結與轉載，轉載時請標明出處「蘋果爸／AutoCAD顧問論壇」並附上原文連結。
- ❌ 禁止商業用途，例如用於開課、販售教材或放入付費內容。
- ❌ 禁止改作後再散布，例如改寫、重新剪輯後以自己的名義發布。
- 商業合作或其他授權需求，請透過 [AutoCAD顧問論壇](https://www.autocad-tw.com/) 或官方 LINE@ 聯絡蘋果爸。

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
