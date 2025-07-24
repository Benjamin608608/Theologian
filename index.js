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

// 你的向量資料庫 IDs
const VECTOR_STORE_IDS = [
  'vs_68807d717dec81918784b11f7b7aad80',
  'vs_6875bbd3e120819188d4f563f9ff1f90'
];

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

    // 創建助手來使用向量搜索
    const assistant = await openai.beta.assistants.create({
      model: 'gpt-4o-mini',
      name: 'Theology RAG Assistant',
      instructions: `你是一個專業的神學助手，只能根據提供的知識庫資料來回答問題。

重要規則：
1. 只使用檢索到的資料來回答問題
2. 如果資料庫中沒有相關資訊，請明確說明「很抱歉，我在資料庫中找不到相關資訊來回答這個問題」
3. 必須在回答末尾附上「📚 資料來源：神學知識庫」
4. 回答要準確、簡潔且有幫助
5. 使用繁體中文回答
6. 專注於提供基於資料庫內容的準確資訊

格式要求：
- 直接回答問題內容
- 引用相關的資料片段（如果有的話）
- 在末尾加上「📚 資料來源：神學知識庫」`,
      tools: [{ type: 'file_search' }],
      tool_resources: {
        file_search: {
          vector_store_ids: VECTOR_STORE_IDS
        }
      }
    });

    // 創建對話線程
    const thread = await openai.beta.threads.create();

    // 發送用戶訊息
    await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: question
    });

    // 執行助手
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistant.id
    });

    // 等待完成 - 改良版等待機制
    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    let attempts = 0;
    const maxAttempts = 30; // 最多等待 30 秒

    while (runStatus.status !== 'completed' && runStatus.status !== 'failed' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      attempts++;
      
      // 更新狀態訊息
      if (attempts % 5 === 0) {
        await thinkingMessage.edit('🔍 深度搜索資料庫中...');
      }
    }

    if (runStatus.status === 'failed') {
      throw new Error(`Assistant run failed: ${runStatus.last_error?.message || 'Unknown error'}`);
    }

    if (attempts >= maxAttempts) {
      throw new Error('Request timeout - please try again');
    }

    // 獲取回答
    const threadMessages = await openai.beta.threads.messages.list(thread.id);
    const botAnswer = threadMessages.data[0].content[0].text.value;

    // 清理資源
    try {
      await openai.beta.assistants.del(assistant.id);
    } catch (cleanupError) {
      console.warn('Failed to cleanup assistant:', cleanupError.message);
    }
    
    // 創建 Discord Embed
    const embed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle('📋 神學知識庫查詢結果')
      .setDescription(botAnswer.length > 4000 ? botAnswer.substring(0, 4000) + '...' : botAnswer)
      .setFooter({ 
        text: '資料來源：神學向量資料庫',
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
    
    let errorMessage = '很抱歉，處理您的問題時發生錯誤，請稍後再試。';
    
    if (error.message.includes('timeout')) {
      errorMessage = '查詢時間過長，請嘗試簡化您的問題或稍後再試。';
    } else if (error.message.includes('rate limit')) {
      errorMessage = '目前請求過多，請稍後再試。';
    }
    
    const errorEmbed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setTitle('❌ 處理錯誤')
      .setDescription(errorMessage)
      .setTimestamp();

    try {
      await message.reply({ embeds: [errorEmbed] });
    } catch (replyError) {
      console.error('Failed to send error message:', replyError);
    }
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
