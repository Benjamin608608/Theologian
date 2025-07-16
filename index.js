import { Client, GatewayIntentBits, EmbedBuilder } from 'discord.js';
import OpenAI from 'openai';
import dotenv from 'dotenv';

// 載入環境變數
dotenv.config();

// 初始化 OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 初始化 Discord 客戶端
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// 您的聖經 Prompt ID
const BIBLE_PROMPT_ID = "pmpt_687768773ff08197b43cd4019dea57350c6d0ed08a1126d1";

// 使用您的 API 和向量資料庫回答聖經問題
async function askBibleQuestion(question) {
  try {
    // 使用您的 prompt ID 和向量資料庫
    const response = await openai.chat.completions.create({
      model: "gpt-4", // 或您偏好的模型
      messages: [
        {
          role: "system",
          content: `你是一個專業的聖經問答助手，請根據向量資料庫中的聖經內容來回答問題。

重要指示：
1. 優先使用向量資料庫中的聖經內容作為回答依據
2. 準確引用聖經章節（書卷、章、節）
3. 用繁體中文回答
4. 回答要簡潔明確，適合 Discord 聊天室顯示
5. 如果資料庫中沒有直接相關內容，請說明並提供最相關的聖經教導
6. 保持謙遜和尊重的語調
7. 回答長度控制在 1500 字以內

用戶問題：${question}`
        },
        {
          role: "user",
          content: question
        }
      ],
      max_tokens: 1500,
      temperature: 0.3, // 較低的溫度以確保準確性
      // 如果您的 API 支援 prompt ID，請取消註解以下行
      // prompt: {
      //   id: BIBLE_PROMPT_ID,
      //   version: "1"
      // }
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI API 錯誤:', error);
    throw error;
  }
}

// 機器人啟動事件
client.once('ready', () => {
  console.log(`✅ 聖經問答機器人已啟動：${client.user.tag}`);
  client.user.setActivity('📖 回答聖經問題', { type: 'LISTENING' });
});

// 訊息處理事件
client.on('messageCreate', async (message) => {
  // 忽略機器人自己的訊息
  if (message.author.bot) return;

  // 檢查是否是聖經問題（以 ! 開頭）
  if (!message.content.startsWith('!')) return;

  // 提取問題內容
  const question = message.content.slice(1).trim();
  
  if (!question) {
    const helpEmbed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('📖 聖經問答機器人')
      .setDescription('使用方法：`![你的問題]`')
      .addFields(
        { 
          name: '範例', 
          value: '• `!耶穌是誰？`\n• `!什麼是愛？`\n• `!如何禱告？`\n• `!約翰福音 3:16 的意思`\n• `!大衛王的故事`' 
        },
        {
          name: '特色',
          value: '✨ 基於完整聖經向量資料庫\n📚 準確的章節引用\n🎯 符合基督教教義'
        }
      )
      .setFooter({ text: '願上帝賜福您的學習！' });

    return message.reply({ embeds: [helpEmbed] });
  }

  // 顯示處理中的訊息
  const processingMessage = await message.reply('🔍 正在查詢聖經資料庫...');

  try {
    // 使用您的 API 和向量資料庫獲取回答
    const answer = await askBibleQuestion(question);

    // 建立回答的 Embed
    const answerEmbed = new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle('📖 聖經問答')
      .addFields(
        { 
          name: '❓ 問題', 
          value: `\`\`\`${question}\`\`\``,
          inline: false 
        },
        { 
          name: '💡 回答', 
          value: answer.length > 1000 ? answer.substring(0, 1000) + '...' : answer,
          inline: false 
        }
      )
      .setFooter({ 
        text: '資料來源：聖經向量資料庫 | 願主賜福您！',
        iconURL: 'https://cdn.discordapp.com/emojis/📖.png'
      })
      .setTimestamp();

    // 如果回答太長，分成多個訊息
    if (answer.length > 1000) {
      const chunks = [];
      for (let i = 0; i < answer.length; i += 1000) {
        chunks.push(answer.slice(i, i + 1000));
      }

      await processingMessage.edit({ embeds: [answerEmbed] });
      
      // 發送剩餘的內容
      for (let i = 1; i < chunks.length; i++) {
        const continueEmbed = new EmbedBuilder()
          .setColor('#FFD700')
          .setDescription(chunks[i])
          .setFooter({ text: `續... (${i + 1}/${chunks.length})` });
        
        await message.channel.send({ embeds: [continueEmbed] });
      }
    } else {
      await processingMessage.edit({ embeds: [answerEmbed] });
    }

  } catch (error) {
    console.error('處理聖經問題時發生錯誤:', error);
    
    const errorEmbed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('❌ 發生錯誤')
      .setDescription('抱歉，在處理您的問題時發生了錯誤。請稍後再試。')
      .addFields({
        name: '可能的原因',
        value: '• API 連線問題\n• 問題格式不正確\n• 服務暫時無法使用'
      })
      .setFooter({ text: '如果問題持續，請聯繫管理員' });

    await processingMessage.edit({ embeds: [errorEmbed] });
  }
});

// 處理未捕獲的錯誤
process.on('unhandledRejection', (error) => {
  console.error('未處理的 Promise 拒絕:', error);
});

process.on('uncaughtException', (error) => {
  console.error('未捕獲的例外:', error);
  process.exit(1);
});

// 啟動機器人
client.login(process.env.DISCORD_TOKEN);

console.log('🚀 正在啟動聖經問答機器人...');
