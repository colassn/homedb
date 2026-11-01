# 資料遷移、備份與還原

網站本機使用 personalos-web-v1；舊 APK SQLite personalos_preview_v1.db 及 SharedPreferences 保持不變。現金資料使用相同 13 種面額順序及港仙整數，SQLite revisions 的 seq、id、revision、position、payload、changed_at 原值完整匯出，不只取最新餘額。

## 方法 A：已有資料檔

```sh
python3 migrate-android.py --db personalos_preview_v1.db --prefs device_layout_v1.xml personalos_drafts_v1.xml console_firebase.xml --output PersonalOS-android-export.json
```

如果 SQLite 有 WAL，請先取得一致備份，不要只複製正在寫入的主 DB。工具只讀原檔並檢查 integrity_check；格式異常停止，不重設。

## 方法 B：ADB 只讀匯出

電腦安裝 Android platform-tools、手機已授權 USB debugging，且原 preview APK 允許 run-as：

```sh
python3 migrate-android.py --adb --output PersonalOS-android-export.json
```

工具先暫停原 App 以取得一致快照，再讀取 DB／WAL 及相關偏好設定，以 SQLite backup API 產生一致 DB；同時保存 .original.zip 原始備份。沒有 pm clear、卸載、改 package 或重簽。若 run-as 不可用，會停止並報錯，不會改權限或清資料。本次未連接用戶手機，ADB 途徑未做真機驗證。

## 匯入網站

在設定選擇「匯入資料」，選 JSON，先檢視筆數及總額，再下載目前備份並確認合併。同 ID／修訂相同內容不重複建立；內容不同或歷史庫存不成立則停止，保留原資料。原有未知欄位保留；本機與原 Android 草稿／偏好設定保存在匯入檔案存檔中，不假裝自動轉成可提交交易。

網頁備份包含正式紀錄、草稿、rawLocal、離線 outbox 及已讀取的雲端快取。備份未載入的雲端範圍不包含在內，不能稱為整個 Firebase 資料庫備份。雲端待送資料與原身份綁定，匯入時留作存檔，不自動冒用舊 UID 重送。

## 限制與復原

- 新網頁每個來源網址有獨立儲存；換網域前先匯出再匯入。
- 網頁不會自動讀取手機 App 沙箱；APK 不用卸載。
- 本機容量由瀏覽器管理，保存失敗會保留草稿並報錯；重要資料保留獨立 JSON 備份。
- 共用快照現行單批上限 700,000 bytes，達限停止送出並提示擴充分頁儲存，不刪除歷史。這是本版明示的容量限制。
- 發生衝突先保留兩份備份，人工核對後以新修訂處理；不可刪除舊 revisions。
- 回復採匯入先前備份合併及重新核對，並不清空現有資料；不提供一鍵破壞式重設。
