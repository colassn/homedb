# v0.6.5 資料及同步變更

本輪按已批准完整設計實作。Android package 不變，versionCode 11，原 v0.5 簽署。本機現金不會上傳到 Firebase；只備忘使用同步。

## 升級、備份及還原

SQLite schema 維持 1，沒有 DROP、清表或重建。交易 payload 新增可選 voided，舊 payload 預設 false。作廢／恢復寫入新的 revision，原紀錄全部保留；完整 replay 驗證失敗會 rollback，不會留下半筆記錄。期初交易若是後續交易前置條件，不可作廢；請修訂正確數量。不能靠安裝舊版撤回作廢，因舊版不理解該標記；應用較高 versionCode 的修復版，或使用本版「恢復交易」留下正式修訂。不可卸載或清除資料。

SD 卡增加可選 archived、deleted、backupAt、updated 欄位，保留未知欄位，索引不移動，以免舊編輯草稿指向另一張卡。首次修改前在同一 SharedPreferences 建立 sd_cards_pre065 原 JSON 備份。本機備忘首次寫入前建立 console_memos_v1_pre065 備份；deleted 預設 false。備份失敗則中止操作。刪除採可還原狀態，不會清除實體 SD 卡。

草稿存在獨立 personalos_drafts_v1；現金草稿不入帳。SD／備忘編輯、快捷輸入可恢復；雲端草稿依帳戶與空間分隔。異常還原不可重設原資料。

## Firebase 規則部署

需要在現有 app1-bd629 專案 Firestore Rules 貼上 firebase/firestore.rules 並發布。無需刪除文件或重新配對；兩部手機都應更新本版。未部署前，新操作留在本機 outbox，畫面顯示待同步／權限問題，不能聲稱已同步。

memo 新增 version、operation、deleted。舊文件可首次採用 version=1，createdAt 保持不變；新版文件必須每次 version+1，拒絕舊版客戶端直接覆寫。新 Android 用 transaction 核對版本及原 updatedAt，衝突保留兩份，使用者可另存副本。operation 保證同一操作重試不重複執行；新文件 ID 在本機入列時確定。離線修改先保存 outbox，連線後 transaction；交易不能離線成功不會假報成功。

spaces/{space}/devices/{uid} 只允許本人寫自己的型號、名稱、伺服器回報時間；只有配對成員可讀。每約60秒在功能使用期間回報，顯示最近活動而非聲稱持續在線。解除配對將 members 收回擁有人，原共享備忘仍留在擁有人空間，訪客不能再讀寫。舊一次性邀請不能重用。

裝置身分以現有 Firebase UID 為準；兩部匿名配對手機有獨立 UID。同一電郵身份登入多部手機共用 UID，因此此情況不能分辨成兩張獨立裝置卡；雙機裝置功能建議使用既有匿名配對流程。

## 驗證範圍

原生多尺寸渲染與 UI 操作在 Robolectric；Firestore 權限與跨客戶端更新在 Emulator。不能當成小米13硬件幀率、真機鍵盤或正式雲端延遲測試。正式規則發布後仍須兩部手機實測配對狀態、修改及刪除到達。
