const axios = require('axios');
const logger = require('../utils/logger');
const { AppError } = require('../utils/errors');
const aiModelService = require('./aiModelService');
const systemPromptService = require('./systemPromptService');

/**
 * 安全地提取错误消息，避免循环引用问题
 * @param {Error} error - 错误对象
 * @returns {string} - 错误消息
 */
function getErrorMessage(error) {
    if (!error) return 'Unknown error';

    // 如果是 AppError，直接返回消息
    if (error instanceof AppError) {
        return error.message;
    }

    // 尝试获取 error.message
    if (error.message && typeof error.message === 'string') {
        return error.message;
    }

    // 如果是 axios 错误，尝试从 response 中提取
    if (error.response) {
        const response = error.response;
        let errorDetails = [];

        if (response.status) {
            errorDetails.push(`Status: ${response.status}`);
        }

        if (response.data) {
            if (typeof response.data === 'string') {
                errorDetails.push(`Error: ${response.data}`);
            } else {
                if (response.data.message) {
                    errorDetails.push(`Message: ${response.data.message}`);
                }
                if (response.data.error) {
                    const errorInfo = typeof response.data.error === 'string'
                        ? response.data.error
                        : JSON.stringify(response.data.error);
                    errorDetails.push(`Error: ${errorInfo}`);
                }
                // 如果整个 data 对象有信息，也包含进去
                if (Object.keys(response.data).length > 0) {
                    try {
                        errorDetails.push(`Details: ${JSON.stringify(response.data)}`);
                    } catch (e) {
                        // 忽略序列化错误
                    }
                }
            }
        }

        if (response.statusText) {
            errorDetails.push(`StatusText: ${response.statusText}`);
        }

        return errorDetails.length > 0
            ? errorDetails.join('; ')
            : `HTTP ${response.status || 'Unknown'}: Request failed`;
    }

    // 如果是网络错误
    if (error.code === 'ECONNREFUSED') {
        return 'Connection refused';
    }
    if (error.code === 'ETIMEDOUT') {
        return 'Request timeout';
    }
    if (error.code) {
        return `Error code: ${error.code}`;
    }

    // 最后尝试转换为字符串
    try {
        return String(error);
    } catch (e) {
        return 'Unknown error (unable to extract error message)';
    }
}

class LLMService {
    /**
     * 调用LLM进行文本扩写
     * @param {string} text - 原始文本
     * @param {string} modelId - 模型ID（可选，如果不提供则使用第一个可用模型）
     * @param {string} apiKey - API密钥
     * @param {string} baseUrl - API基础URL
     * @param {string} providerName - 提供商名称（用于选择不同的API调用方式）
     * @param {string} customPrompt - 自定义提示词（可选，如果提供则覆盖系统配置）
     * @returns {string} - 扩写后的文本
     */
    async expandText(text, modelId, apiKey, baseUrl, providerName, customPrompt = null) {
        try {
            // 如果没有指定模型，获取第一个LLM模型
            let model;
            if (modelId) {
                model = await aiModelService.getModelById(modelId);
            } else {
                const models = await aiModelService.getModelsByType('llm');
                if (models.length === 0) {
                    throw new AppError('No LLM model available', 400);
                }
                model = models[0];
            }

            // 如果提供了baseUrl，使用提供的；否则使用模型的baseUrl
            const apiBaseUrl = baseUrl || model.baseUrl || 'https://api.openai.com/v1';
            const finalProviderName = providerName || model.provider.name.toLowerCase();

            logger.info('Calling LLM for text expansion', {
                model: model.name,
                provider: finalProviderName,
                textLength: text.length,
            });

            // 获取系统提示词（如果未提供自定义提示词）
            let systemPrompt = customPrompt;
            if (!systemPrompt) {
                const promptConfig = await systemPromptService.getSystemPromptByFunctionKey('text_expansion');
                if (promptConfig) {
                    systemPrompt = promptConfig.prompt;
                } else {
                    // 使用默认提示词
                    systemPrompt = '你是一个专业的小说扩写助手。请根据用户提供的文本片段，进行合理的扩写，保持原有的风格和情节连贯性。扩写后的文本应该更加丰富详细，但不要改变原有的核心内容。';
                }
            }

            // 根据不同的提供商调用不同的API
            let expandedText;
            switch (finalProviderName.toLowerCase()) {
                case 'deepseek':
                    expandedText = await this.callDeepSeekAPI(text, apiKey, apiBaseUrl, model.name, systemPrompt);
                    break;
                case 'openai':
                    expandedText = await this.callOpenAIAPI(text, apiKey, apiBaseUrl, model.name, systemPrompt);
                    break;
                case 'anthropic':
                case 'claude':
                    expandedText = await this.callAnthropicAPI(text, apiKey, apiBaseUrl, model.name, systemPrompt);
                    break;
                default:
                    // 默认使用OpenAI兼容的API格式
                    expandedText = await this.callOpenAIAPI(text, apiKey, apiBaseUrl, model.name, systemPrompt);
            }

            return expandedText;
        } catch (error) {
            logger.error('LLM expansion error:', error);
            if (error instanceof AppError) {
                throw error;
            }
            const errorMessage = getErrorMessage(error);
            throw new AppError(`Failed to expand text: ${errorMessage}`, 500);
        }
    }

    /**
     * 调用DeepSeek API
     */
    async callDeepSeekAPI(text, apiKey, baseUrl, modelName, systemPrompt) {
        const url = `${baseUrl}/chat/completions`;
        try {
            const response = await axios.post(
                url,
                {
                    model: modelName || 'deepseek-chat',
                    messages: [
                        {
                            role: 'system',
                            content: systemPrompt,
                        },
                        {
                            role: 'user',
                            content: `请对以下文本进行扩写，使其更加丰富详细：\n\n${text}`,
                        },
                    ],
                    temperature: 0.7,
                    max_tokens: 64000,
                },
                {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    timeout: 60000, // 60秒超时
                }
            );

            if (response.data && response.data.choices && response.data.choices.length > 0) {
                return response.data.choices[0].message.content.trim();
            }

            throw new AppError('Invalid response from LLM API', 500);
        } catch (error) {
            const errorMessage = getErrorMessage(error);
            throw new AppError(`DeepSeek API error: ${errorMessage}`, 500);
        }
    }

    /**
     * 调用OpenAI API（兼容格式）
     */
    async callOpenAIAPI(text, apiKey, baseUrl, modelName, systemPrompt) {
        const url = `${baseUrl}/chat/completions`;
        const response = await axios.post(
            url,
            {
                model: modelName || 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt,
                    },
                    {
                        role: 'user',
                        content: `请对以下文本进行扩写，使其更加丰富详细：\n\n${text}`,
                    },
                ],
                temperature: 0.7,
                max_tokens: 8000,
            },
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                timeout: 60000,
            }
        );

        if (response.data && response.data.choices && response.data.choices.length > 0) {
            return response.data.choices[0].message.content.trim();
        }

        throw new AppError('Invalid response from LLM API', 500);
    }

    /**
     * 调用Anthropic API
     */
    async callAnthropicAPI(text, apiKey, baseUrl, modelName, systemPrompt) {
        const url = `${baseUrl}/v1/messages`;
        const response = await axios.post(
            url,
            {
                model: modelName || 'claude-3-sonnet-20240229',
                max_tokens: 4000,
                system: systemPrompt,
                messages: [
                    {
                        role: 'user',
                        content: `请对以下文本进行扩写，使其更加丰富详细：\n\n${text}`,
                    },
                ],
            },
            {
                headers: {
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    'Content-Type': 'application/json',
                },
                timeout: 60000,
            }
        );

        if (response.data && response.data.content && response.data.content.length > 0) {
            return response.data.content[0].text.trim();
        }

        throw new AppError('Invalid response from Anthropic API', 500);
    }

    /**
     * 调用LLM生成结构化剧本
     * @param {string} text - 文本内容（章节内容）
     * @param {string} modelId - 模型ID（可选）
     * @param {string} apiKey - API密钥
     * @param {string} baseUrl - API基础URL
     * @param {string} providerName - 提供商名称
     * @returns {Object} - 结构化剧本数据
     */
    async generateStructuredScript(text, modelId, apiKey, baseUrl, providerName) {
        try {
            // 如果没有指定模型，获取第一个LLM模型
            let model;
            if (modelId) {
                model = await aiModelService.getModelById(modelId);
            } else {
                const models = await aiModelService.getModelsByType('llm');
                if (models.length === 0) {
                    throw new AppError('No LLM model available', 400);
                }
                model = models[0];
            }

            // 如果提供了baseUrl，使用提供的；否则使用模型的baseUrl
            const apiBaseUrl = baseUrl || model.baseUrl || 'https://api.openai.com/v1';
            const finalProviderName = providerName || model.provider.name.toLowerCase();

            logger.info('Calling LLM for structured script generation', {
                model: model.name,
                provider: finalProviderName,
                textLength: text.length,
            });

            // 获取系统提示词
            let systemPrompt = null;
            const promptConfig = await systemPromptService.getSystemPromptByFunctionKey('script_generation');
            if (promptConfig) {
                systemPrompt = promptConfig.prompt;
            }
            // 如果没有配置系统提示词，让各API方法使用自己的默认值（systemPrompt 为 null）

            // 根据不同的提供商调用不同的API
            let scriptData;
            switch (finalProviderName.toLowerCase()) {
                case 'deepseek':
                    scriptData = await this.callDeepSeekScriptAPI(text, apiKey, apiBaseUrl, model.name, systemPrompt);
                    break;
                case 'openai':
                    scriptData = await this.callOpenAIScriptAPI(text, apiKey, apiBaseUrl, model.name, systemPrompt);
                    break;
                case 'anthropic':
                case 'claude':
                    scriptData = await this.callAnthropicScriptAPI(text, apiKey, apiBaseUrl, model.name, systemPrompt);
                    break;
                default:
                    // 默认使用OpenAI兼容的API格式
                    scriptData = await this.callOpenAIScriptAPI(text, apiKey, apiBaseUrl, model.name, systemPrompt);
            }

            return scriptData;
        } catch (error) {
            logger.error('LLM script generation error:', error);
            if (error instanceof AppError) {
                throw error;
            }
            const errorMessage = getErrorMessage(error);
            throw new AppError(`Failed to generate structured script: ${errorMessage}`, 500);
        }
    }

    /**
     * 调用DeepSeek API生成结构化剧本
     */
    async callDeepSeekScriptAPI(text, apiKey, baseUrl, modelName, customPrompt = null) {
        const url = `${baseUrl}/chat/completions`;

        // 使用自定义提示词或默认提示词
        const systemPrompt = customPrompt || `你是一个专业的剧本结构化助手。请将提供的小说章节内容转换为结构化的剧本格式。

返回的JSON数据结构必须包含以下字段：
{
  "character_settings": [
    {
      "id": "uuid唯一标识",
      "name": "角色名",
      "age": "角色年龄范围",
      "appearance": "角色外貌",
      "personality": "角色人格特质",
      "background": "人物背景"
    }
  ],
  "plot_outline": [
    {
      "id": "uuid唯一标识",
      "act": "第一幕",
      "scene": [
        {
          "address": "地点A",
          "sceneDescription": "详细的环境描述、氛围设定、时间信息等"
        }
      ],
      "content": "内容",
      "highlight": "爽点",
      "emotional_curve": "情感曲线描述",
      "rhythm": "节奏描述（紧张/舒缓/高潮）",
      "shots": [
        {
          "id": "uuid唯一标识",
          "shot_id": 1,
          "duration": 3,
          "shot_type": "中景",
          "framing": "中景",
          "camera_angle": "平视",
          "camera_movement": "缓慢推进",
          "character_action": "动态动作描述，体现角色间的互动",
          "expression": "表情细节",
          "dialogue": [
            {
              "id": "uuid唯一标识",
              "name": "说话者姓名",
              "say": "具体台词内容",
              "mood": "说话时的情绪状态"
            }
          ],
          "voiceover": "画外音-人物心理独白",
          "lighting": "光线效果",
          "atmosphere": "氛围营造",
          "bgm": "背景音乐",
          "fx": "音效",
          "is_transition": false
        }
      ]
    }
  ]
}

请严格按照JSON格式返回，不要包含任何其他文本。`;

        // 在 try 块外定义变量，以便在 catch 块中使用
        let requestBody = null;
        let finalText = text;

        try {
            // 检查文本长度，如果太长可能需要截断
            const maxTextLength = 100000; // 设置最大文本长度
            if (text.length > maxTextLength) {
                logger.warn('Text too long, truncating', {
                    originalLength: text.length,
                    maxLength: maxTextLength,
                });
                finalText = text.substring(0, maxTextLength) + '...（文本已截断）';
            }

            // DeepSeek API 请求体
            // 注意：DeepSeek API 的 max_tokens 范围是 [1, 8192]
            requestBody = {
                model: modelName || 'deepseek-chat',
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt,
                    },
                    {
                        role: 'user',
                        content: `请将以下小说章节内容转换为结构化的剧本格式。必须返回纯JSON格式，不要包含任何其他文本。\n\n${finalText}`,
                    },
                ],
                temperature: 0.7,
                max_tokens: 64000, // DeepSeek API 最大支持 8192
            };

            // 注意：DeepSeek API 可能不支持 response_format 参数
            // 如果模型支持 JSON 模式，可以尝试添加，但先不添加以避免 400 错误
            // 某些 DeepSeek 模型可能支持，但需要检查文档
            // requestBody.response_format = { type: 'json_object' };

            logger.info('Calling DeepSeek Script API', {
                url,
                model: requestBody.model,
                textLength: finalText.length,
                promptLength: systemPrompt.length,
                totalMessagesLength: requestBody.messages.reduce((sum, msg) => sum + msg.content.length, 0),
                hasApiKey: !!apiKey,
                apiKeyPrefix: apiKey ? apiKey.substring(0, 10) + '...' : 'none',
            });

            const response = await axios.post(
                url,
                requestBody,
                {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    timeout: 120000, // 120秒超时
                }
            );

            if (response.data && response.data.choices && response.data.choices.length > 0) {
                const content = response.data.choices[0].message.content.trim();

                /**
                 * 修复JSON字符串中的常见问题（中文引号、未转义字符等）
                 * @param {string} jsonStr - 原始JSON字符串
                 * @returns {string} - 修复后的JSON字符串
                 */
                const fixJSONString = (jsonStr) => {
                    let fixed = jsonStr;

                    // 步骤1: 提取JSON对象部分（去除可能的markdown代码块标记）
                    const codeBlockMatch = fixed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
                    if (codeBlockMatch) {
                        fixed = codeBlockMatch[1].trim();
                    } else {
                        // 提取第一个 { ... } 块
                        const jsonMatch = fixed.match(/\{[\s\S]*\}/);
                        if (jsonMatch) {
                            fixed = jsonMatch[0];
                        }
                    }

                    // 步骤2: 修复字符串值中的中文引号和未转义字符
                    // 改进的状态机：同时识别标准引号和中文引号作为字符串边界
                    let result = '';
                    let inString = false;
                    let escapeNext = false;
                    let stringQuoteType = null; // 记录当前字符串使用的引号类型: '"', '"', or '"'

                    for (let i = 0; i < fixed.length; i++) {
                        const char = fixed[i];
                        const prevChar = i > 0 ? fixed[i - 1] : '';

                        if (escapeNext) {
                            // 当前字符已被转义，直接添加
                            result += char;
                            escapeNext = false;
                            continue;
                        }

                        if (char === '\\') {
                            // 转义字符
                            result += char;
                            escapeNext = true;
                            continue;
                        }

                        // 检查是否是引号字符（标准引号或中文引号）
                        const isStandardQuote = char === '"';
                        const isChineseLeftQuote = char === '"';
                        const isChineseRightQuote = char === '"';

                        if (isStandardQuote || isChineseLeftQuote || isChineseRightQuote) {
                            if (!inString) {
                                // 字符串开始：统一使用标准引号
                                inString = true;
                                stringQuoteType = isStandardQuote ? '"' : (isChineseLeftQuote ? '"' : '"');
                                result += '"'; // 统一使用标准引号
                                continue;
                            } else {
                                // 检查是否是当前字符串的结束引号
                                if ((isStandardQuote && stringQuoteType === '"') ||
                                    (isChineseRightQuote && (stringQuoteType === '"' || stringQuoteType === '"'))) {
                                    // 字符串结束
                                    inString = false;
                                    stringQuoteType = null;
                                    result += '"'; // 统一使用标准引号
                                    continue;
                                } else {
                                    // 字符串内部的其他引号，需要转义
                                    result += '\\"';
                                    continue;
                                }
                            }
                        }

                        if (inString) {
                            // 在字符串内部
                            if (isChineseLeftQuote || isChineseRightQuote) {
                                // 字符串内部的中文引号，转义为标准引号
                                result += '\\"';
                            } else if (char === '\n' && prevChar !== '\\') {
                                // 未转义的换行符
                                result += '\\n';
                            } else if (char === '\r' && prevChar !== '\\') {
                                // 未转义的回车符
                                result += '\\r';
                            } else if (char === '\t' && prevChar !== '\\') {
                                // 未转义的制表符
                                result += '\\t';
                            } else {
                                result += char;
                            }
                        } else {
                            // 不在字符串内部
                            if (isChineseLeftQuote || isChineseRightQuote) {
                                // 键名边界的中文引号，替换为标准引号
                                result += '"';
                            } else {
                                result += char;
                            }
                        }
                    }

                    // 如果最后还在字符串中，说明引号不匹配，尝试修复
                    if (inString) {
                        result += '"';
                    }

                    return result;
                };

                // 尝试多种方式解析JSON
                let parsedData = null;
                let lastError = null;

                // 策略1: 直接解析
                try {
                    parsedData = JSON.parse(content);
                    return parsedData;
                } catch (e) {
                    lastError = e;
                    logger.warn('Direct JSON parse failed, trying fixJSONString', {
                        error: e.message,
                        contentPreview: content.substring(0, 200)
                    });
                }

                // 策略2: 提取并修复JSON
                try {
                    const fixedContent = fixJSONString(content);
                    parsedData = JSON.parse(fixedContent);
                    logger.info('Successfully parsed JSON after fixing');
                    return parsedData;
                } catch (e) {
                    lastError = e;
                    logger.warn('Fixed JSON parse failed', {
                        error: e.message,
                        fixedContentPreview: fixJSONString(content).substring(0, 200)
                    });
                }

                // 策略3: 更智能的修复（先尝试修复，再全局替换）
                try {
                    let cleanedContent = content;

                    // 提取JSON部分
                    const codeBlockMatch = cleanedContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
                    if (codeBlockMatch) {
                        cleanedContent = codeBlockMatch[1].trim();
                    } else {
                        const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
                        if (jsonMatch) {
                            cleanedContent = jsonMatch[0];
                        }
                    }

                    // 先尝试使用改进的fixJSONString
                    cleanedContent = fixJSONString(cleanedContent);

                    // 如果还是失败，尝试更激进的修复：在键名和值边界替换中文引号
                    // 使用正则表达式匹配键名和值边界的中文引号
                    // 匹配模式: "key": "value" 或 "key": "value"
                    cleanedContent = cleanedContent
                        // 替换键名边界的中文引号
                        .replace(/([{,]\s*)"/g, '$1"')
                        .replace(/"(\s*:)/g, '"$1')
                        // 替换值边界的中文引号（在冒号后）
                        .replace(/(:\s*)"/g, '$1"')
                        .replace(/"(\s*[,}])/g, '"$1')
                        // 替换所有剩余的中文引号（作为最后手段）
                        .replace(/"/g, '"')
                        .replace(/"/g, '"');

                    parsedData = JSON.parse(cleanedContent);
                    logger.info('Successfully parsed JSON after enhanced replacement');
                    return parsedData;
                } catch (e) {
                    lastError = e;
                }

                // 策略4: 尝试提取并修复JSON（使用更智能的引号匹配）
                try {
                    let cleanedContent = content;

                    // 提取JSON部分
                    const codeBlockMatch = cleanedContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
                    if (codeBlockMatch) {
                        cleanedContent = codeBlockMatch[1].trim();
                    } else {
                        const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
                        if (jsonMatch) {
                            cleanedContent = jsonMatch[0];
                        }
                    }

                    // 使用更智能的方法：先识别所有可能的键值对边界
                    // 然后只在边界处替换中文引号，字符串值内部的中文引号转义
                    let result = '';
                    let inString = false;
                    let escapeNext = false;
                    let stringDelimiter = null; // 记录当前字符串的引号类型

                    for (let i = 0; i < cleanedContent.length; i++) {
                        const char = cleanedContent[i];
                        const nextChar = i < cleanedContent.length - 1 ? cleanedContent[i + 1] : '';
                        const prevChar = i > 0 ? cleanedContent[i - 1] : '';

                        if (escapeNext) {
                            result += char;
                            escapeNext = false;
                            continue;
                        }

                        if (char === '\\') {
                            result += char;
                            escapeNext = true;
                            continue;
                        }

                        // 检查引号
                        if (char === '"' || char === '"' || char === '"') {
                            if (!inString) {
                                // 字符串开始：检查上下文判断是否是键名或值
                                inString = true;
                                stringDelimiter = char;
                                result += '"'; // 统一使用标准引号
                            } else {
                                // 检查是否是匹配的结束引号
                                if ((char === '"' && stringDelimiter === '"') ||
                                    (char === '"' && (stringDelimiter === '"' || stringDelimiter === '"')) ||
                                    (char === '"' && (stringDelimiter === '"' || stringDelimiter === '"'))) {
                                    // 字符串结束
                                    inString = false;
                                    stringDelimiter = null;
                                    result += '"';
                                } else {
                                    // 字符串内部的其他引号，转义
                                    result += '\\"';
                                }
                            }
                            continue;
                        }

                        if (inString) {
                            // 字符串内部：转义特殊字符
                            if (char === '\n' && prevChar !== '\\') {
                                result += '\\n';
                            } else if (char === '\r' && prevChar !== '\\') {
                                result += '\\r';
                            } else if (char === '\t' && prevChar !== '\\') {
                                result += '\\t';
                            } else {
                                result += char;
                            }
                        } else {
                            // 字符串外部：替换中文引号为标准引号
                            if (char === '"' || char === '"') {
                                result += '"';
                            } else {
                                result += char;
                            }
                        }
                    }

                    // 如果最后还在字符串中，添加结束引号
                    if (inString) {
                        result += '"';
                    }

                    parsedData = JSON.parse(result);
                    logger.info('Successfully parsed JSON after smart quote matching');
                    return parsedData;
                } catch (e) {
                    lastError = e;
                }

                // 所有策略都失败，记录详细错误信息
                const errorMessage = lastError?.message || 'Unknown JSON parse error';
                const errorPreview = content.substring(0, 1000);

                // 尝试找到错误位置附近的上下文
                let errorContext = errorPreview;
                if (errorMessage.includes('_effect') || errorMessage.includes('sound_effect')) {
                    const effectIndex = content.indexOf('_effect');
                    if (effectIndex >= 0) {
                        errorContext = content.substring(
                            Math.max(0, effectIndex - 150),
                            Math.min(content.length, effectIndex + 300)
                        );
                    }
                }

                logger.error('Failed to parse JSON response from DeepSeek Script API', {
                    error: errorMessage,
                    contentLength: content.length,
                    errorContext: errorContext,
                    errorStack: lastError?.stack?.substring(0, 500)
                });

                throw new AppError(
                    `DeepSeek Script API error: ${errorMessage}. Error context: ${errorContext.substring(0, 400)}...`,
                    500
                );
            }

            throw new AppError('Invalid response from LLM API', 500);
        } catch (error) {
            // 记录详细的错误信息
            const errorDetails = {
                url,
                model: modelName || 'deepseek-chat',
                errorMessage: error.message,
                errorCode: error.code,
                responseStatus: error.response?.status,
                responseStatusText: error.response?.statusText,
                requestModel: requestBody?.model || modelName || 'deepseek-chat',
                requestMessagesCount: requestBody?.messages?.length || 0,
                requestTextLength: finalText?.length || text.length,
                requestPromptLength: systemPrompt?.length || 0,
            };

            // 尝试安全地序列化响应数据
            if (error.response?.data) {
                try {
                    if (typeof error.response.data === 'string') {
                        errorDetails.responseDataString = error.response.data;
                    } else {
                        errorDetails.responseDataString = JSON.stringify(error.response.data);
                    }
                } catch (e) {
                    errorDetails.responseDataString = 'Unable to serialize response data';
                }
            }

            logger.error('DeepSeek Script API error details:', errorDetails);

            const errorMessage = getErrorMessage(error);
            throw new AppError(`DeepSeek Script API error: ${errorMessage}`, 500);
        }
    }

    /**
     * 调用OpenAI API生成结构化剧本（兼容格式）
     */
    async callOpenAIScriptAPI(text, apiKey, baseUrl, modelName, customPrompt = null) {
        // 使用自定义提示词或默认提示词
        const systemPrompt = customPrompt || `你是一个专业的剧本结构化助手。请将提供的小说章节内容转换为结构化的剧本格式。

返回的JSON数据结构必须包含以下字段：
{
  "character_settings": [...],
  "plot_outline": [...]
}

请严格按照JSON格式返回，不要包含任何其他文本。`;

        try {
            const response = await axios.post(
                url,
                {
                    model: modelName || 'gpt-4',
                    messages: [
                        {
                            role: 'system',
                            content: systemPrompt,
                        },
                        {
                            role: 'user',
                            content: `请将以下小说章节内容转换为结构化的剧本格式：\n\n${text}`,
                        },
                    ],
                    temperature: 0.7,
                    max_tokens: 8192, // 注意：不同 API 的 max_tokens 限制可能不同
                    response_format: { type: 'json_object' },
                },
                {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    timeout: 120000,
                }
            );

            if (response.data && response.data.choices && response.data.choices.length > 0) {
                const content = response.data.choices[0].message.content.trim();
                try {
                    return JSON.parse(content);
                } catch (e) {
                    const jsonMatch = content.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        return JSON.parse(jsonMatch[0]);
                    }
                    throw new AppError('Invalid JSON response from LLM', 500);
                }
            }

            throw new AppError('Invalid response from LLM API', 500);
        } catch (error) {
            const errorMessage = getErrorMessage(error);
            throw new AppError(`OpenAI Script API error: ${errorMessage}`, 500);
        }
    }

    /**
     * 调用Anthropic API生成结构化剧本
     */
    async callAnthropicScriptAPI(text, apiKey, baseUrl, modelName, customPrompt = null) {
        // 使用自定义提示词或默认提示词
        const systemPrompt = customPrompt || `你是一个专业的剧本结构化助手。请将提供的小说章节内容转换为结构化的剧本格式。返回的JSON数据结构必须包含character_settings和plot_outline字段。请严格按照JSON格式返回，不要包含任何其他文本。`;

        try {
            const response = await axios.post(
                url,
                {
                    model: modelName || 'claude-3-sonnet-20240229',
                    max_tokens: 8192, // 注意：不同 API 的 max_tokens 限制可能不同
                    system: systemPrompt,
                    messages: [
                        {
                            role: 'user',
                            content: `请将以下小说章节内容转换为结构化的剧本格式：\n\n${text}`,
                        },
                    ],
                },
                {
                    headers: {
                        'x-api-key': apiKey,
                        'anthropic-version': '2023-06-01',
                        'Content-Type': 'application/json',
                    },
                    timeout: 120000,
                }
            );

            if (response.data && response.data.content && response.data.content.length > 0) {
                const content = response.data.content[0].text.trim();
                try {
                    return JSON.parse(content);
                } catch (e) {
                    const jsonMatch = content.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        return JSON.parse(jsonMatch[0]);
                    }
                    throw new AppError('Invalid JSON response from Anthropic API', 500);
                }
            }

            throw new AppError('Invalid response from Anthropic API', 500);
        } catch (error) {
            const errorMessage = getErrorMessage(error);
            throw new AppError(`Anthropic Script API error: ${errorMessage}`, 500);
        }
    }
}

module.exports = new LLMService();

