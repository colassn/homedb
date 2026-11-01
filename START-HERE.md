> 本版：A 朱砂編輯，新增展示秒錶及天文台圖示。先閱讀 TEST-REPORT-1.4.2.md，未完成真機與全面視覺驗收。

# PersonalOS Web 1.4.2 — 完整網站交付

2026-10-31（香港時間）。所有交付檔案直接位於 ZIP 根目錄，沒有子資料夾。

這是可操作的 PWA 網站，不是圖片或靜態設計概念。沿用原 Firebase 專案 app1-bd629。沒有變更原 Android APK、原簽署或清除任何手機／雲端資料。

## 開始使用

建議開啟交付訊息的網站連結。若自行放上 HTTPS 靜態主機，只需部署下列根目錄檔案：
index.html、style.css、app.mjs、core.mjs、cloud.bundle.mjs、sw.js、manifest.webmanifest、icon.svg、icon-192.png、icon-512.png、studio.css、studio.mjs、playful.css、lime.css、flagship.css、design-tokens.css、motion-system.mjs、weather-icons.mjs、所有 weather-*.png 與 warning-*.gif，以及所有 .woff2 字體。

所有瀏覽器執行依賴已封裝在 cloud.bundle.mjs；不需要 npm 才能運行。字體已包含 Chiron GoRound TC、Noto Sans TC 與 Outfit 本機檔案及授權，沒有執行時外部字體／圖示 CDN。首次載入及 Firebase／天氣仍需要網絡。

本機查看可執行 `python3 serve.py`，開啟 http://localhost:8080。不要直接用 file:// 開 HTML；ES Modules、Service Worker 及 Firebase 不保證在該模式運行。正式手機安裝與背景通知必須以 HTTPS 開啟。

Chrome 選單提供「安裝應用程式／加入主畫面」時可安裝；本次沒有在小米真機驗證安裝、背景省電及通知延遲。

## 可用功能

- 首頁、香港時間、香港天文台天氣／警告／三日預報、快取時間及失敗狀態。
- 全螢幕版面展示、閒置返回（避開輸入及確認操作）、展示隱私設定。
- 現金雙保管箱：收款、支出、轉移、實物盤點、修訂、作廢、恢復及完整歷史；港仙整數運算，歷史庫存驗證，重複操作保護。
- 本機／雲端備忘：直接輸入、點內容編輯、完成、刪除還原、待送內容及衝突保留。
- SD 卡新增、編輯、封存／取消封存、刪除／還原、搜尋及手動備份狀態。
- 程式庫、搜尋、最近使用、時鐘、秒錶與分段。
- 草稿、本機備份、合併匯入、原始資料匯出、字體／對比／動態／展示設定。
- 不包含系統控制、手機硬件資訊或智能家居控制。

## 尚須由原 Firebase 專案完成的部署

現有備忘程式使用原有集合及配對規則；「現金與 SD 卡共用」新增 webStates 集合，「背景通知」新增 webPush 與通知函式。程式及規則已提供、模擬測試已通過，**正式專案尚未部署及驗證**。本次沒有管理員憑證，不會聲稱已接通所有雲端服務。

請閱讀 FIREBASE-DEPLOY.md。沒有部署新規則時，現金／SD 卡仍保存於本機，畫面會報權限問題而不假報同步成功。背景推送需要原專案 Web Push 公開金鑰；只開通知權限不等於伺服器發送已運作。

## 舊資料遷移

舊版只同步備忘；現金和 SD 卡在手機本機。網站無法自動讀取 Android 私有資料。使用 migrate-android.py 產生完整 JSON，再在網站「設定 → 匯入資料」預覽及合併。原始 SQLite 交易及所有 revisions 均保留。詳見 DATA-MIGRATION.md。

請先匯入舊資料再新增正式現金交易；若已建立另一套期初紀錄，合併可能因庫存歷史矛盾而中止，不會清除資料繞過。

## 重建與測試

需 Node.js 22 或相容版本、Python 3；Firebase 模擬測試另需 Java 17。

```sh
npm ci
npm test
python3 migration.test.py
npm run build
npx firebase emulators:exec --only firestore --project demo-personalos 'node --test firebase.test.mjs'
```

建置會產生 dist，這是建置產物，交付 ZIP 本身沒有該子目錄。Firebase 部署準備腳本亦會在執行時產生 firebase-runtime；所需源碼已平放在 ZIP。

TEST-REPORT.md 記錄實際測試及未驗證限制；DESIGN-SYSTEM.md 對應視覺及互動要求。完整檔案名單與 SHA-256 在 FILES.sha256。

## 本版介面更新

採用 F2 方圓粗字方向、奶油白／深藍夜間配色及鮮色 App 圖示。主頁先展示時間、天氣與未完成備忘；App 圖示先進入完整工具頁。程式庫支援浮動面板／獨立全頁；本機個人化設定、完成復原與自製選單已接入。

今次沒有修改 Firebase 規則、雲端資料模型或現金核心。新增外觀／導覽／置頂設定只儲存於此瀏覽器，不會覆蓋共享資料。尚未完整驗證項目見 TEST-REPORT-1.2.0.md；不能將網站視為所有雙機通知已驗收。

## 1.2.1 手機操作與定位修正
以手機橫直向為主。詳見 CHANGELOG-1.2.1.md；本次沿用資料格式及原 Firebase。
