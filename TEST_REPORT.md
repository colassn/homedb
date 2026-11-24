# PersonalOS spatial-r7 驗收報告

日期為 2026-11-24（香港）。所有寫入操作使用獨立瀏覽器儲存或 Firebase demo 模擬器。沒有使用正式帳戶或發送正式通知。

## 環境與方法

Linux Debian 13、Node 24.22.3、Python 3.12、Playwright 1.62.0、Chromium 153.0.8010.0、Playwright WebKit 26.5（Linux WPE），Firebase CLI 14.27.0、axe-core 4.14.1。用本機 HTTP 測試 PWA，互動測試讀取建置後的靜態資源並隔離外部服務。瀏覽器尺寸與軟件引擎不代表小米或 iPad 實機。

## 驗收結果

| 狀態 | 項目 | 實際結果 |
|---|---|---|
| Pass | 建置、語法、原有單元測試 | npm run build 成功，主要變更模組通過 node --check，npm test 共 28/28 |
| Pass | 原有遷移測試 | Python 2/2。原資料 schema 與 Firestore 規則未修改 |
| Pass | Firestore 整合 | 14/14。涵蓋權限、第二用戶取得即時變更、過期配對、舊資料、重連、版本衝突與重試 |
| Pass | 身分驗證 SDK | Auth 模擬器實際匿名登入及登出，核對 currentUser。原站採自動匿名登入，沒有手動電郵登入／登出頁 |
| Pass | Chromium、WebKit 互動回歸 | 四類搜尋連打、焦點、表單連開關 8 次、彈出後焦點在關閉按鈕、拖曳關閉再開保留草稿、設定搜尋、四種品質與重載持久化 |
| Pass | 現金 | 從首頁記兩張千元紙幣，核對 HK$2,000。修訂為三張，核對 HK$3,000。確認作廢後回到零 |
| Pass | 借款與還款 | 新增 HK$125.50，還 HK$25.50 後核對 HK$100.00，最後全數還清至零 |
| Pass | 多筆借款與姓名分組 | 甲兩筆 100 及 50，乙一筆 30。合併顯示 180，指定甲還 5 後餘 175。取消分開顯示後金額及人數仍正確 |
| Pass | 備忘、持久化及搜尋 | 新增、修改標題、重載後核對、確認刪除；全域搜尋回傳現金項目 |
| Pass | 組字與視窗事件模擬 | 備忘輸入欄收到合成 composition 及 VisualViewport 事件後仍保留焦點 |
| Pass | 跨尺寸路由 | Chromium 與 WebKit 各 45 個頁面／尺寸組合。9 條路由涵蓋首頁、現金、SD 卡、備忘與借款、程式庫、設定、時鐘、秒錶、展示；未見水平溢出 |
| Pass | 展示 | 393×852、810×1080、1080×810，兩個引擎在尺寸更新後均無整頁超高。切換展示私隱會遮蔽結餘 |
| Pass | 設定返回與減少動態 | 從私隱設定返回分類清單；系統減少動態觸發輕量模式 |
| Pass | PWA 舊版更新及離線 | 本機 HTTP 安裝原 r5，載入 spatial-r7 更新，確認新快取存在；斷網重新載入並使用 SD 卡搜尋 |
| Pass | 無障礙自動檢查 | Chromium 手機尺寸，首頁、備忘與借款、現金、設定、展示五頁，axe WCAG 2 A/AA、2.1 A/AA 規則未檢出違規 |
| Pass | JavaScript 與 Console | 互動測試兩引擎錄得 0 個未捕獲 JavaScript 錯誤。隔離測試的 Chromium Console 有被攔截外部請求的 ERR_FAILED，WebKit 同一組測試未記錄 Console Error |
| Pass | 程式包 | 增量疊加乾淨原始目錄、核對所有原始碼位元組，再建置比對完整包 dist/ |
| Not Tested | 正式 Firebase、電郵帳戶、正式推送及即時天氣 | 正式服務與真實帳戶未接觸。無電郵登入入口。天氣無資料情況已顯示 |
| Not Tested | 真機獨有行為 | 小米 17 Pro Max、iPad 第七代、Safari 主畫面安裝、系統中文輸入法、實體鍵盤、轉向期間實機鍵盤位置與安全區 |
| Not Tested | 人工無障礙與長期效能 | VoiceOver、TalkBack、全天展示、電池、發熱、真機 GPU、持續 FPS 與高刷新率。未量測實際 Core Web Vitals |
| Not Tested | Lint 與靜態型別 | 原 package.json 沒有 lint 或 typecheck 腳本。已另做 JavaScript 語法檢查 |

五組尺寸為 393×852、852×393、810×1080、1080×810、1440×900。借款人個人檔案及還款專用表單另外以操作流程驗證。沒有對每個歷史功能的每個按鈕做逐項人工驗收。

## 實測效能

單次實驗室對照，兩版採相同 Chromium、393×852、相同空資料備忘頁。同步派送 80 次搜尋 input，另採樣 40 個空閒畫面間隔。

| 指標 | 原版 | spatial-r7 |
|---|---:|---:|
| 80 次輸入後搜尋節點被替換 | 80 次 | 0 次 |
| input 處理時間中位數 | 4.7 ms | 0.1 ms |
| 空閒畫面間隔中位數 | 16.7 ms | 16.7 ms |
| 該頁 DOM 節點 | 184 | 185 |
| app.mjs 原始大小 | 100,134 bytes | 107,527 bytes |

額外的 121 秒展示測試共檢查 121 次，展示根節點及時鐘節點替換次數為零，沒有未捕獲錯誤。空閒畫面間隔不足以證明輸入、轉場或真機可持續達到 60 FPS。

## 動畫及已修復問題

| 操作 | 實作與實測範圍 |
|---|---|
| 導覽與切頁 | 可中斷 260 ms 頁面轉場，220 ms 指示器位移；連續切頁可達正確路由 |
| 搜尋、面板、鍵盤 | 解決輸入時替換節點、初次聚焦金額、重複 cancel 監聽。原生 dialog 的點擊、Escape、拖曳及草稿在 Chromium、WebKit 通過 |
| 借款與資料變動 | 檔案開合位移、更新進度條、280 ms 金額動畫、還款成功狀態；實際借還款前後金額通過 |
| 桌面滑鼠與圖示 | 導覽指標、滑鼠進入圖示位移、按壓 SVG 回饋；未逐幀量度所有效果 |
| 展示及環境光 | 舊款平板自動選擇輕量策略，減少動態優先。桌面模擬通過，未量度真機耗電 |
| 無障礙 | 修正借款同步文字對比、下拉清單名稱、天氣警告容器語意；修復後重跑五頁掃描 |

## 重跑

```sh
npm ci
npm test
npm run build
python3 migration.test.py
npx firebase emulators:exec --only firestore --project demo-personalos "node --test firebase.test.mjs"
npx firebase emulators:exec --config qa/firebase-auth.json --only auth --project demo-personalos "node qa/auth-session.mjs"
python3 -m pip install playwright
python3 -m playwright install chromium webkit
python3 qa/interaction-check.py
python3 qa/spatial-check.py
PLAYWRIGHT_BROWSER=webkit python3 qa/interaction-check.py
PLAYWRIGHT_BROWSER=webkit python3 qa/spatial-check.py
```

截圖包內有五組同尺寸前後對照，分別為桌面首頁、手機首頁、平板橫向展示、設定及借款。採用隔離空帳本，沒有使用者真實財務資料。截圖是本次瀏覽器執行結果。
