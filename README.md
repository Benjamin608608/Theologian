# 📖 聖經問答 Discord 機器人

一個基於 OpenAI API 和向量資料庫的 Discord 機器人，專門用於回答聖經相關問題。

## ✨ 功能特色

- 🤖 使用 OpenAI API 和完整聖經向量資料庫
- 📚 準確的聖經章節引用
- 🎯 符合基督教教義的回答
- 🌐 支援繁體中文
- ⚡ 快速回應

## 🚀 使用方法

在 Discord 中使用 `!` 開頭來提問：

```
!耶穌是誰？
!什麼是愛？
!如何禱告？
!約翰福音 3:16 的意思
!大衛王的故事
```

## 🛠️ 本地開發設定

### 1. 克隆專案
```bash
git clone https://github.com/yourusername/bible-discord-bot.git
cd bible-discord-bot
```

### 2. 安裝依賴
```bash
npm install
```

### 3. 設定環境變數
複製 `.env.example` 為 `.env` 並填入您的 API 金鑰：

```bash
cp .env.example .env
```

編輯 `.env` 檔案：
```
DISCORD_TOKEN=your_discord_bot_token_here
OPENAI_API_KEY=your_openai_api_key_here
```

### 4. 啟動機器人
```bash
npm start
```

## 🚢 Railway 部署

### 1. 準備 GitHub 儲存庫
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### 2. 在 Railway 部署
1. 前往 [Railway](https://railway.app/)
2. 點擊「New Project」
3. 選擇「Deploy from GitHub repo」
4. 選擇您的儲存庫
5. 設定環境變數：
   - `DISCORD_TOKEN`: 您的 Discord 機器人 Token
   - `OPENAI_API_KEY`: 您的 OpenAI API 金鑰

### 3. 自動部署
Railway 會自動偵測 `package.json` 並執行部署。

## 🔧 獲取 API 金鑰

### Discord Bot Token
1. 前往 [Discord Developer Portal](https://discord.com/developers/applications)
2. 建立新的 Application
3. 在 Bot 部分建立機器人並複製 Token
4. 在 OAuth2 > URL Generator 中選擇 `bot` 和所需權限
5. 使用生成的 URL 邀請機器人到您的伺服器

### OpenAI API Key
1. 前往 [OpenAI Platform](https://platform.openai.com/)
2. 建立帳戶並前往 API Keys 部分
3. 建立新的 API Key

## 📝 所需權限

機器人需要以下 Discord 權限：
- `Send Messages`
- `Read Message History`
- `Use Slash Commands`
- `Embed Links`

## 🐛 故障排除

### 常見問題
1. **機器人無回應**：檢查 Token 是否正確且機器人有適當權限
2. **API 錯誤**：確認 OpenAI API Key 有效且有足夠額度
3. **部署失敗**：檢查環境變數是否正確設定

### 查看日誌
```bash
# 本地開發
npm start

# Railway 部署
在 Railway 控制台查看部署日誌
```

## 🤝 貢獻

歡迎提交 Issue 和 Pull Request！

## 📄 授權

MIT License

## 🙏 致謝

感謝所有為此專案做出貢獻的人，願上帝賜福您的服事！
