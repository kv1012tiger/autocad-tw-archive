# AutoCAD顧問論壇 備份

這是 [autocad-tw.com](https://www.autocad-tw.com) 論壇管理員自行維護的個人原創文章備份站，
只收錄管理員自己發表的「主題首篇」內容（文字、圖片、影片嵌入、相關連結），
**不包含其他會員的回覆**，因此沒有著作權或個資疑慮；原文本來就是公開、免費瀏覽的內容。

備份目的：論壇架設在國外主機、採付費租用，若主機商或服務到期關閉，原站內容可能全部消失，
此處作為長期保存與離線閱讀用。

## 瀏覽

網站發布於 GitHub Pages：`docs/` 目錄即為發布內容，採看板 → 主題兩層結構：

```
docs/<board-id>/index.html         看板頁（主題列表）
docs/<board-id>/<topic-id>/index.html   主題頁（原創首篇內容）
```

## 新增一篇備份文章

1. 在 `data/topics/<topic-id>/` 建立 `meta.json`（標題、作者、發表時間、原始網址等）與
   `content.html`（內文片段，相對路徑圖片放在同層 `images/`）。
2. 若該文章屬於新看板，於 `data/boards.json` 新增一筆。
3. 執行 `python tools/build.py` 重新產生 `docs/`。
4. `git commit` + `git push`。

## 留言

主題頁使用 [giscus](https://giscus.app) 留言元件，留言實際存放在本 repo 的 GitHub Discussions，
訪客需使用 GitHub 帳號留言，管理員可直接在 GitHub 上回覆。
