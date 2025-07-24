# Discord RAG Bot - Railway 部署指南

## 📋 前置準備

### 1. Discord Bot 設定
1. 前往 [Discord Developer Portal](https://discord.com/developers/applications)
2. 創建新應用程式並建立 Bot
3. 複製 Bot Token
4. 設定 Bot 權限：
   - Send Messages
   - Use Slash Commands
   - Embed Links
   - Read Message History
   - Add Reactions

### 2. OpenAI API 設定
1. 確保你的 OpenAI API Key 有效
2. 確認向量資料庫 ID：`pmpt_687768773ff08197b43cd4019dea57350c6d0ed08a1126d1`

## 🚀 Railway 部署步驟

### 1. GitHub 準備
```bash
# 初始化 Git 倉庫
git init
git add .
git commit -m "Initial commit: Discord RAG Bot"

# 推送到 GitHub
git remote add origin https://github.com/yourusername/discord-rag-bot.git
git push -u origin main
```

### 2. Railway 設定
1. 前往 [Railway](https://railway.app/)
2. 使用 GitHub 帳號登入
3. 點擊 "New Project"
4. 選擇 "Deploy from GitHub repo"
5. 選擇您的倉庫

### 3. 環境變數設定
在 Railway 專案設定中加入以下環境變數：

```
DISCORD_TOKEN=你的Discord機器人Token
OPENAI_API_KEY=你的OpenAI_API金鑰
NODE_ENV=production
```

### 4. 部署設定
Railway 會自動偵測到 `package.json` 並使用 Node.js 環境。確保你的 `package.json` 中有正確的 `start` 腳本。

## 📁 專案結構
```
discord-rag-bot/
├── index.js          # 主要機器人程式碼
├── package.json      # Node.js 依賴設定
├── .env.example      # 環境變數範例
├── .gitignore        # Git 忽略檔案
└── README.md         # 專案說明
```

## 🔧 功能特色

### 主要功能
- ✅ 只使用向量資料庫中的資料回答問題
- ✅ 自動附上資料來源
- ✅ 支援提及(@bot)和私訊
- ✅ 美觀的 Discord Embed 回應
- ✅ 錯誤處理和狀態提示

### 使用方式
1. **提及機器人**：在頻道中 `@BotName 你的問題`
2. **私訊**：直接傳送訊息給機器人

### 安全性
- 環境變數管理敏感資訊
- 完整的錯誤處理
- 只使用授權的資料來源

## 🐛 故障排除

### 常見問題
1. **機器人沒有回應**
   - 檢查 Discord Token 是否正確
   - 確認機器人有必要權限
   - 查看 Railway 日誌

2. **OpenAI 錯誤**
   - 驗證 API Key 是否有效
   - 檢查向量資料庫 ID
   - 確認 API 配額充足

3. **部署失敗**
   - 檢查 package.json 語法
   - 確認環境變數設定
   - 查看 Railway 建置日誌

### 日誌查看
在 Railway Dashboard 中可以查看即時日誌來診斷問題。

## 📊 監控與維護

### 健康檢查
機器人啟動時會在控制台顯示狀態訊息，可透過 Railway 日誌監控。

### 擴展功能
- 可以加入更多指令
- 支援多個向量資料庫
- 加入使用統計
- 自定義回應格式
