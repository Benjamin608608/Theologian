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
    console.log(`🤖 調用 OpenAI Responses API for: ${question.substring(0, 50)}...`);
    
    // 構建完整輸入
    const fullInput = `用戶問題: ${question}

請以專業的聖經問答助手身份用繁體中文回應。這是一個即時對話，請直接回答問題，不要使用書信格式。`;

    let response;
    try {
      console.log(`🔍 使用 Prompt ID: ${BIBLE_PROMPT_ID}`);
      
      // 使用 Responses API 與您的 Prompt ID
      response = await openai.responses.create({
        model: "gpt-4o", // 使用支援 Responses API 的模型
        input: fullInput,
        instructions: `使用 Prompt ID: ${BIBLE_PROMPT_ID} 版本: 1。基於向量資料庫中的聖經內容回答問題。這是即時對話，請直接回答問題，不要使用書信格式、開頭稱呼語、結尾祝福語或署名。像朋友對話一樣自然回應。`,
        max_output_tokens: 1000,
        temperature: 0.4
      });
      
      console.log('✅ Responses API 調用成功');
      
    } catch (responsesError) {
      console.log('🔄 Responses API 失敗，使用備用方法...');
      console.error('Responses API 錯誤:', responsesError.message);
      
      // 備用方法：使用 Chat Completions API
      response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `你是一個專業的聖經問答助手，請根據向量資料庫中的聖經內容來回答問題。

重要指示：
1. 優先使用向量資料庫中的聖經內容作為回答依據
2. 準確引用聖經章節（書卷、章、節）
3. 用繁體中文回答
4. 回答要自然、簡潔，就像一個熟悉聖經的朋友在對話
5. 不要提及「資料庫」或「系統」等技術詞彙
6. 不要使用過於正式的格式，保持對話式語調
7. 如果資料庫中沒有直接相關內容，提供最相關的聖經教導
8. 回答長度適中，避免過於冗長

Prompt 參考 ID: ${BIBLE_PROMPT_ID}
版本: 1`
          },
          {
            role: "user",
            content: fullInput
          }
        ],
        max_tokens: 1000,
        temperature: 0.4
      });
      
      console.log('✅ Chat Completions API 調用成功');
    }

    // 處理不同 API 的回應格式
    let responseContent;
    
    if (response.output_text) {
      // Responses API 格式
      responseContent = response.output_text;
    } else if (response.choices?.[0]?.message?.content) {
      // Chat Completions API 格式
      responseContent = response.choices[0].message.content;
    } else {
      console.log('🔍 未知回應格式:', JSON.stringify(response, null, 2));
      responseContent = null;
    }

    return responseContent;
    
  } catch (error) {
    console.error('OpenAI API 調用失敗:', error);
    throw error;
  }
}

// 機器人啟動事件
client.once('ready', () => {
  console.log(`✅ Theologian 神學家機器人已啟動：${client.user.tag}`);
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
      .setTitle('📖 Theologian 神學家機器人')
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

  try {
    // 使用您的 API 和向量資料庫獲取回答
    const answer = await askBibleQuestion(question);

    // 如果回答太長，分成多個訊息
    if (answer.length > 2000) {
      const chunks = [];
      for (let i = 0; i < answer.length; i += 2000) {
        chunks.push(answer.slice(i, i + 2000));
      }

      // 發送第一個部分
      await message.reply(chunks[0]);
      
      // 發送剩餘的內容
      for (let i = 1; i < chunks.length; i++) {
        await message.channel.send(chunks[i]);
      }
    } else {
      // 直接回覆答案
      await message.reply(answer);
    }

  } catch (error) {
    console.error('處理聖經問題時發生錯誤:', error);
    await message.reply('抱歉，我無法回答這個問題。');
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

console.log('🚀 正在啟動 Theologian 神學家機器人...');
