# 天氣圖示來源及資料語意

圖示來源：香港天文台（Hong Kong Observatory）。原圖未更改，用於展示天文台天氣資料及警告。PersonalOS 並非天文台官方產品。

天氣圖示及編號：https://www.weather.gov.hk/textonly/v2/explain/wxicon_e.htm
圖示來源：https://www.weather.gov.hk/images/HKOWxIconOutline/pic50.png （各編號對應各檔案）
警告圖示：https://www.hko.gov.hk/en/wxinfo/dailywx/warnlegend.htm
警告圖檔目錄：https://www.hko.gov.hk/en/wxinfo/dailywx/images/

weather-icons.mjs 保存編號與本機檔案映射；不根據氣溫推測晴雨，不把一般有雨圖示當成暴雨警告。即時資料仍沿用原香港天文台 API。
