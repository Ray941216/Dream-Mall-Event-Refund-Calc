# 高雄夢時代活動「回饋現抵」計算機  
Dream-Mall Event Refund Calculator

> 一款用於快速試算「消費滿額送抵用券／現金回饋」最佳拆單（分天）組合的 PWA 小工具。  
> A tiny PWA that helps you split payments across days to maximise coupon / cash-back benefits during Dream-Mall promotions.

---

## ✨ 專案特色 (Features)

- **最佳化拆單演算法**：依照各活動「門檻、回饋額、單日上限」自動計算最省／最高回饋拆法。  
- **即時結果預覽**：輸入金額後立即顯示「每張發票應刷金額、每日回饋總額、剩餘差額」。  
- **PWA 離線支援**：安裝至手機後可離線使用，結帳現場不卡關。  
- **自動版本更新**：Service Worker 監聽並提示新版，點擊即可刷新。  
- **純前端、零依賴**：HTML + Vanilla JS；無需後端，GitHub Pages 靜態即可部署。

> 主要程式：`index.html`, `app.js`, `manifest.json`, `sw.js`，以及 PWA icon 資料夾。

---

## 🔧 快速開始 (Getting Started)

GitHub Pages: [連結](https://ray941216.github.io/Dream-Mall-Event-Refund-Calc/) => 可以使用 iOS Safari 或者電腦端的 Chrome-Base 瀏覽器安裝成 PWA 應用程式

```bash
# 1. 下載或複製專案
git clone https://github.com/Ray941216/Dream-Mall-Event-Refund-Calc.git
cd Dream-Mall-Event-Refund-Calc

# 2. 啟動本地靜態伺服器（任一方式擇一）
npx serve .            # 或
python -m http.server  # 或
npm i -g http-server && http-server .

# 3. 瀏覽器開啟 http://localhost:8080
````

> ❏ **GitHub Pages 部署**
> 將 `main` 分支設為 Pages 來源，網址即 `https://<user>.github.io/Dream-Mall-Event-Refund-Calc/`。

---

## 🖥️ 使用說明 (Usage)

1. 在「活動設定」區輸入每檔活動的：

   * 消費門檻 (threshold)
   * 回饋額 (reward)
   * 每日可用張數上限 (limit／unlimit)
2. 在「消費總額」輸入本次欲結帳金額。
3. 點擊 **計算**，即顯示：

   * `拆單結果`：每張發票金額、分佈到哪一天
   * `回饋總覽`：每日可得回饋與剩餘可刷額度
4. 如需重新計算，可直接修改任何數值，結果即時更新。

---

## 📂 專案結構 (Project Structure)

```
Dream-Mall-Event-Refund-Calc/
├─ icons/            # PWA icon 各尺寸
├─ index.html        # 主畫面與輸入表單
├─ app.js            # 計算邏輯與 UI 互動
├─ manifest.json     # PWA 設定
└─ sw.js             # Service Worker，負責快取與更新
```

---

## 🛠️ 技術棧 (Tech Stack)

| 類別    | 技術                               |
| ----- | -------------------------------- |
| 前端框架  | Vanilla JavaScript               |
| 樣式    | 原生 CSS + CSS Variables           |
| PWA   | Web App Manifest, Service Worker |
| 數學最佳化 | 自行實作拆單演算法（非 DP 版）                |
| 部署    | GitHub Pages / 任意靜態主機            |

---

## 🤝 貢獻指南 (Contributing)

1. Fork → Create Branch → Commit → Pull Request
2. 歡迎提交：

   * 新活動參數模板
   * UX/UI 改進
   * 更高效的演算法實作

---

## 📝 授權 (License)

本專案以 **Apache License 2.0** 發佈。詳見 [`LICENSE`](./LICENSE)。

---

### 參考與鳴謝 (Acknowledgements)

* ChatGPT o4-mini-high, o3, 4o
* 高雄夢時代行銷活動規範
* MDN Web Docs – PWA Guides
* GitHub Pages 靜態部署教學

> 感謝使用！若此工具對您有幫助，歡迎 star 🌟 或提出建議 🤗