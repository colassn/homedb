# 沿用原 Firebase 的部署方法

專案固定為 app1-bd629，沒有建立替代資料庫。既有 users/{uid}/memos、spaces/{space}/memos、pairInvites 及 devices 路徑保持相容。

## 目前完成與未完成

已寫好 Web SDK 串接、匿名登入、原有兩身份配對、即時備忘監聽、本機 outbox、版本衝突、現金與 SD 卡共用快照及通知訂閱。

本次只對 demo-personalos 模擬器執行權限／跨客戶端測試；沒有登入正式 Firebase Console、沒有改動正式規則、沒有部署 Functions、沒有取得 VAPID 金鑰、沒有測試正式兩機通知。

## 部署新增規則

先在 Console 保存目前 Rules 副本。firestore-original.rules 是交接源碼附帶版本，不是遠端下載的正式規則。

在現有專案 Firestore Rules 對照並部署 firestore.rules；此檔保留原備忘與配對規則，只新增 spaces/{space}/webStates 及 webPush。若遠端規則已另有改動，先合併，不能盲目覆蓋。

亦可在已獲授權的開發電腦執行：

```sh
npx firebase deploy --project app1-bd629 --only firestore:rules
```

若匿名登入或 API 網域限制阻擋新網站，於原專案核對 Authentication 匿名登入及授權網域／API 限制；不要重新建立專案。

## 配對及資料範圍

網站瀏覽器有獨立匿名 UID，並不繼承 Android APK UID。沿用原兩身份配對模型：一個空間最多兩個身份。兩部原 APK 若已佔用空間，不能直接加入第三個網頁身份。保留原空間及備份後，再規劃替換原配對成員；不會自行解除用戶原配對。

新網站一部產生配對碼、另一部在十分鐘內加入。配對不會自動將「個人備忘」搬入「共用備忘」；介面可切換個人／共用。舊空間內容仍保留在原路徑。

現金與 SD 卡共用需在配對後啟用。使用版本 transaction；離線改動標示待確認，恢復連線後核對版本。衝突保留本機與遠端副本，不直接覆蓋。相同交易版本不同內容或同卡片不同內容會停止合併，需先匯出雙方備份並核對，不能當作已完成自動衝突解決。

## 背景通知

1. Firebase Console → 專案設定 → Cloud Messaging → Web Push certificates，取得公開 VAPID key（不是私鑰）。
2. 執行 `node prepare-firebase.mjs`，再 `npm --prefix firebase-runtime install`。
3. Functions 環境設定 PERSONALOS_SITE_URL 為實際網站 HTTPS 網址。可在產生的 firebase-runtime/.env.app1-bd629 設定此非秘密網址。
4. 在具原專案權限的電腦執行 `npx firebase deploy --project app1-bd629 --only functions:personalos-web`。Firebase Functions 可能需要原專案啟用合適計費方案；本次沒有替用戶啟用計費。
5. 網站「設定 → 背景通知設定」輸入 VAPID 公開 key，允許通知。
6. 以兩機測試新增／修改、前景／背景、鎖屏及離線重連。接收端以 tag 減少重複顯示，不保證恰好一次推送。

notifications.cjs 只發私人空間備忘更新摘要，按目前 members 過濾訂閱；已完成／刪除不發新提醒。舊 Android operation 沒有網頁 UID 前綴，無法完全辨認舊端自身提醒。強制停止瀏覽器、系統限制背景或離線期間，不保證即時送達。

## 回復

部署前保留舊 Rules；需要回復時恢復該副本。新 webStates／webPush 文件保留，不刪除。網頁本機資料及待送內容先匯出，禁止清空資料庫作回復手段。舊 APK 不會理解網站現金／SD 卡共用資料，兩者不是自動雙向相容的本機格式。
