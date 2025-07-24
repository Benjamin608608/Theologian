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
const VECTOR_STORE_ID = 'vs_68807d717dec81918784b11f7b7aad80';

// 獲取文件名稱的函數
async function getFileName(fileId) {
  try {
    const file = await openai.files.retrieve(fileId);
    let fileName = file.filename || `檔案-${fileId.substring(0, 8)}`;
    
    // 移除副檔名
    fileName = fileName.replace(/\.(txt|pdf|docx?|rtf|md)$/i, '');
    
    return fileName;
  } catch (error) {
    console.warn(`無法獲取檔案名稱 ${fileId}:`, error.message);
    return `檔案-${fileId.substring(0, 8)}`;
  }
}

// 處理引用標記並轉換為 Discord 格式的函數
async function processAnnotationsInText(text, annotations) {
  let processedText = text;
  const sourceMap = new Map();
  const usedSources = new Map(); // 追蹤已使用的來源，避免重複
  let citationCounter = 1;
  
  if (annotations && annotations.length > 0) {
    // 先處理所有引用，按照出現順序編號
    for (const annotation of annotations) {
      if (annotation.type === 'file_citation' && annotation.file_citation) {
        const fileId = annotation.file_citation.file_id;
        const fileName = await getFileName(fileId);
        const quote = annotation.file_citation.quote || '';
        
        // 檢查是否已經有這個文件的引用
        let citationIndex;
        if (usedSources.has(fileId)) {
          citationIndex = usedSources.get(fileId);
        } else {
          citationIndex = citationCounter++;
          usedSources.set(fileId, citationIndex);
          sourceMap.set(citationIndex, {
            fileName,
            quote,
            fileId
          });
        }
        
        // 替換原始標記
        const originalText = annotation.text;
        if (originalText) {
          const replacement = `${originalText}[${citationIndex}]`;
          processedText = processedText.replace(originalText, replacement);
        }
      }
    }
    
    // 清理格式問題並改善排版
    processedText = processedText
      // 移除多餘的引用標記格式
      .replace(/【[^】]*】/g, '')
      .replace(/†[^†\s]*†?/g, '')
      // 清理多餘的逗號
      .replace(/,\s*\n/g, '\n')
      .replace(/,\s*$/, '')
      .replace(/\n\s*,/g, '\n')
      // 移除重複的引用編號（如 [1][2][2] -> [1][2]）
      .replace(/(\[\d+\])(\[\d+\])*\1+/g, '$1$2')  // 移除重複的相同編號
      .replace(/(\[\d+\])+/g, (match) => {  // 去除連續重複的引用
        const citations = match.match(/\[\d+\]/g);
        const uniqueCitations = [...new Set(citations)];
        return uniqueCitations.join('');
      })
      // 改善段落結構和格式
      .replace(/(\d+)\.\s*([^：。！？\n]+[：])/g, '\n\n**$1. $2**\n')  // 數字標題加粗並換行
      .replace(/([。！？])\s+(\d+\.)/g, '$1\n\n**$2')  // 在數字點前加換行
      .replace(/([。！？])\s*([A-Za-z][^。！？]*：)/g, '$1\n\n**$2**\n')  // 英文標題
      .replace(/\*\s*([^*\n]+)\s*：\s*\*/g, '**$1：**')  // 修正加粗格式
      // 清理多重空白和換行
      .replace(/[ \t]+/g, ' ')  // 合併空格和制表符
      .replace(/\n{3,}/g, '\n\n')  // 限制最多兩個換行
      .replace(/^\s+|\s+$/g, '')  // 移除開頭和結尾空白
      // 在句號後添加適當換行（如果後面不是數字標題）
      .replace(/([。！？])(?=\s*(?!\*\*\d+\.)[^\n])/g, '$1\n\n')
      .trim();
  }
  
  return { processedText, sourceMap };
}

// 創建來源列表的函數
function createSourceList(sourceMap) {
  if (sourceMap.size === 0) return '';
  
  let sourceList = '\n\n📚 **引用來源：**\n';
  
  // 按照編號順序排列
  const sortedSources = Array.from(sourceMap.entries()).sort((a, b) => a[0] - b[0]);
  
  sortedSources.forEach(([index, source]) => {
    sourceList += `**[${index}]** ${source.fileName}`;
    if (source.quote && source.quote.length > 0) {
      // 顯示引用片段（限制長度）
      const shortQuote = source.quote.length > 120 
        ? source.quote.substring(0, 120) + '...' 
        : source.quote;
      sourceList += `\n    └ *"${shortQuote}"*`;
    }
    sourceList += '\n';
  });
  
  return sourceList;
}

// 解析回答中的引用資訊
async function parseAnnotations(messageContent) {
  const sources = new Set();
  
  // 檢查 annotations（引用標註）
  if (messageContent.annotations && messageContent.annotations.length > 0) {
    for (const annotation of messageContent.annotations) {
      if (annotation.type === 'file_citation' && annotation.file_citation) {
        const fileId = annotation.file_citation.file_id;
        const fileName = await getFileName(fileId);
        sources.add(fileName);
      }
    }
  }
  
  return Array.from(sources);
}

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
3. 回答要準確、簡潔且有幫助
4. 使用繁體中文回答
5. 專注於提供基於資料庫內容的準確資訊
6. 盡可能引用具體的資料片段

格式要求：
- 直接回答問題內容
- 引用相關的資料片段（如果有的話）
- 不需要在回答中手動添加資料來源，系統會自動處理`,
      tools: [{ type: 'file_search' }],
      tool_resources: {
        file_search: {
          vector_store_ids: [VECTOR_STORE_ID]
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
    const responseMessage = threadMessages.data[0];
    
    // 提取文字內容
    let botAnswer = '';
    if (responseMessage.content && responseMessage.content.length > 0) {
      const textContent = responseMessage.content.find(content => content.type === 'text');
      if (textContent) {
        // 處理引用標記並轉換格式
        const { processedText, sourceMap } = await processAnnotationsInText(
          textContent.text.value, 
          textContent.text.annotations
        );
        
        // 組合最終回答
        botAnswer = processedText;
        
        // 添加詳細的來源列表
        const sourceList = createSourceList(sourceMap);
        if (sourceList) {
          botAnswer += sourceList;
        } else {
          // 如果沒有具體引用，顯示資料庫來源
          botAnswer += `\n\n📚 **資料來源：** ${selectedStore.name}`;
        }
      }
    }

    // 如果沒有獲取到回答
    if (!botAnswer) {
      botAnswer = '很抱歉，我在資料庫中找不到相關資訊來回答這個問題。';
    }

    // 清理資源
    try {
      await openai.beta.assistants.del(assistant.id);
    } catch (cleanupError) {
      console.warn('Failed to cleanup assistant:', cleanupError.message);
    }
    
    // 創建 Discord Embed
    const embed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle('📋 查詢結果')
      .setDescription(botAnswer.length > 4000 ? botAnswer.substring(0, 4000) + '...' : botAnswer)
      .setFooter({ 
        text: '資料來源：神學知識庫',
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
