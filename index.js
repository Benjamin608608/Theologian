const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const OpenAI = require('openai');

// 初始化 OpenAI 客戶端
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

// 你的向量資料庫 ID
const VECTOR_STORE_ID = 'pmpt_687768773ff08197b43cd4019dea57350c6d0ed08a1126d1';

// 機器人就緒事件
client.once('ready', () => {
  console.log(`✅ Bot is ready! Logged in as ${client.user.tag}`);
});

// 訊息處理
client.on('messageCreate', async (message) => {
  // 忽略機器人自己的訊息
  if (message.author.bot) return;

  // 檢查是否是對機器人的提及或私訊
  const isMentioned = message.mentions.has(client.user);
  const isDM = message.channel.type === 'DM';
  
  if (!isMentioned && !isDM) return;

  // 清理訊息內容（移除提及）
  let question = message.content;
  if (isMentioned) {
    question = question.replace(`<@${client.user.id}>`, '').trim();
  }

  if (!question) {
    await message.reply('請問你想問什麼問題？');
    return;
  }

  try {
    // 顯示正在處理的訊息
    const thinkingMessage = await message.reply('🤔 讓我查找相關資料...');

    // 使用 OpenAI 的 RAG 功能搜索和回答
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // 或使用 'gpt-4'
      messages: [
        {
          role: 'system',
          content: `你是一個專業的助手，只能根據提供的知識庫資料來回答問題。

重要規則：
1. 只使用檢索到的資料來回答問題
2. 如果資料庫中沒有相關資訊，請明確說明「很抱歉，我在資料庫中找不到相關資訊」
3. 必須在回答末尾附上資料來源
4. 回答要準確、簡潔且有幫助
5. 使用繁體中文回答

格式要求：
- 回答問題內容
- 在末尾加上「📚 資料來源：[來源資訊]」`
        },
        {
          role: 'user',
          content: question
        }
      ],
      tools: [
        {
          type: 'file_search',
          file_search: {
            vector_store_ids: [VECTOR_STORE_ID]
          }
        }
      ],
      tool_choice: 'auto',
      max_tokens: 1000,
      temperature: 0.3
    });

    // 獲取回答
    const answer = response.choices[0].message.content;
    
    // 創建 Discord Embed
    const embed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle('📋 查詢結果')
      .setDescription(answer)
      .setFooter({ 
        text: '資料來源：向量資料庫',
        iconURL: client.user.displayAvatarURL()
      })
      .setTimestamp();

    // 編輯原本的"思考中"訊息
    await thinkingMessage.edit({ 
      content: null, 
      embeds: [embed] 
    });

  } catch (error) {
    console.error('Error processing question:', error);
    
    const errorEmbed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setTitle('❌ 處理錯誤')
      .setDescription('很抱歉，處理您的問題時發生錯誤，請稍後再試。')
      .setTimestamp();

    await message.reply({ embeds: [errorEmbed] });
  }
});

// 錯誤處理
client.on('error', (error) => {
  console.error('Discord client error:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
});

// 啟動機器人
client.login(process.env.DISCORD_TOKEN);
