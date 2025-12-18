const axios = require('axios');
const { getPrisma } = require('../utils/prisma');
const logger = require('../utils/logger');
const { AppError, NotFoundError } = require('../utils/errors');
const fs = require('fs').promises;
const path = require('path');
const config = require('../config');
const { decrypt } = require('../utils/encryption');
const systemPromptService = require('./systemPromptService');
const { log } = require('console');

class ImageGenerationService {
    /**
     * 替换提示词模板中的占位符
     * @param {string} template - 提示词模板，包含 {{}} 占位符
     * @param {Object} character - 角色对象
     * @param {string} genreStyle - 题材风格（可选）
     * @returns {string} - 替换后的提示词
     */
    replacePromptPlaceholders(template, character, genreStyle = null) {
        if (!template) return '';

        // 构建替换映射
        const replacements = {
            '{{name}}': character.name || '',
            '{{age}}': character.age || '',
            '{{gender}}': character.gender || '',
            '{{appearance}}': character.appearance || '',
            '{{personality}}': this.formatPersonality(character.personality),
            '{{background}}': character.background || '',
            '{{genre_style}}': genreStyle || '',
            '{{clothingStyle}}': character.clothingStyle || '',
        };

        // 替换所有占位符
        let result = template;
        for (const [placeholder, value] of Object.entries(replacements)) {
            // 使用全局替换，处理多个相同占位符的情况
            result = result.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value);
        }

        return result;
    }

    /**
     * 格式化 personality 字段（可能是 JSON 数组或字符串）
     * @param {string|Array} personality - 性格特征
     * @returns {string} - 格式化后的字符串
     */
    formatPersonality(personality) {
        if (!personality) return '';
        if (Array.isArray(personality)) {
            return personality.join(', ');
        }
        if (typeof personality === 'string') {
            try {
                const parsed = JSON.parse(personality);
                if (Array.isArray(parsed)) {
                    return parsed.join(', ');
                }
            } catch (e) {
                // 如果不是 JSON，直接返回字符串
            }
            return personality;
        }
        return String(personality);
    }

    /**
     * 构建完整的提示词（功能提示词 + 系统提示词）
     * @param {string} featurePrompt - 功能提示词
     * @param {string} systemPrompt - 系统提示词模板
     * @param {Object} character - 角色对象
     * @param {string} genreStyle - 题材风格（可选）
     * @returns {string} - 完整的提示词
     */
    buildFullPrompt(featurePrompt, systemPrompt, character, genreStyle = null) {
        // 替换系统提示词中的占位符
        const replacedSystemPrompt = this.replacePromptPlaceholders(systemPrompt, character, genreStyle);

        // 拼装：功能提示词 + 换行 + 替换后的系统提示词
        const parts = [];
        if (featurePrompt) {
            parts.push(featurePrompt.trim());
        }
        if (replacedSystemPrompt) {
            parts.push(replacedSystemPrompt.trim());
        }

        return parts.join('\n\n');
    }

    /**
     * 构建提示词和参考图（公共逻辑）
     * @param {Object} options - 选项 { featurePromptId, genreStyle, prompt, style, duration }
     * @param {Object} character - 角色对象
     * @param {string} functionKey - 系统提示词功能键（'character_image_generation' 或 'character_video_generation'）
     * @param {string} systemPrompt - 系统提示词（可选）
     * @param {Function} buildLegacyPrompt - 构建传统提示词的方法（buildImagePrompt 或 buildVideoPrompt）
     * @returns {Promise<Object>} - { prompt, referenceImageUrls }
     */
    async buildPromptAndReferences(options, character, functionKey, systemPrompt, buildLegacyPrompt) {
        const { featurePromptId, genreStyle, prompt: customPrompt, style, duration } = options;
        let referenceImageUrls = [];

        // 如果已经提供了 prompt，直接使用
        if (customPrompt) {
            return { prompt: customPrompt, referenceImageUrls };
        }

        // 如果提供了 featurePromptId，使用新的提示词构建逻辑
        if (featurePromptId) {
            // 获取功能提示词
            const featurePrompt = await systemPromptService.getFeaturePromptById(featurePromptId);
            if (!featurePrompt) {
                throw new NotFoundError(`Feature prompt with id ${featurePromptId} not found`);
            }

            // 获取系统提示词
            if (!systemPrompt) {
                const promptConfig = await systemPromptService.getSystemPromptByFunctionKey(functionKey);
                if (promptConfig && promptConfig.prompt) {
                    systemPrompt = promptConfig.prompt;
                }
            }

            if (!systemPrompt) {
                throw new AppError(`System prompt for ${functionKey} not found`, 404);
            }

            // 构建完整提示词：功能提示词 + 系统提示词（替换占位符后）
            const prompt = this.buildFullPrompt(featurePrompt.prompt, systemPrompt, character, genreStyle);

            // 处理参考图链接
            if (featurePrompt.referenceLinks) {
                try {
                    if (Array.isArray(featurePrompt.referenceLinks)) {
                        referenceImageUrls = featurePrompt.referenceLinks;
                    } else if (typeof featurePrompt.referenceLinks === 'string') {
                        const parsed = JSON.parse(featurePrompt.referenceLinks);
                        if (Array.isArray(parsed)) referenceImageUrls = parsed;
                    }
                } catch (e) {
                    logger.warn(`Parse referenceLinks failed: ${e.message}`);
                }
            }

            return { prompt, referenceImageUrls };
        }

        // 原有的逻辑：获取系统提示词（如果没有提供）
        if (!systemPrompt) {
            const promptConfig = await systemPromptService.getSystemPromptByFunctionKey(functionKey);
            if (promptConfig && promptConfig.prompt) {
                systemPrompt = promptConfig.prompt;
            }
        }

        // 构建传统提示词
        const prompt = buildLegacyPrompt(character, style, duration, systemPrompt);
        return { prompt, referenceImageUrls };
    }

    /**
     * 生成角色图片
     * @param {Object} character - 角色对象
     * @param {Object} modelConfig - 模型配置 { modelId, apiKey, baseUrl, providerName, modelName }
     * @param {Object} options - 生成选项 { width, height, style, featurePromptId, genreStyle, etc. } 或自定义API参数对象
     * @param {string} fileId - 文件ID（可选，如果不提供则使用character.id，格式可以是 "character_xxx" 或 "scene_xxx"）
     * @param {string} systemPrompt - 系统提示词（可选，如果不提供则从系统提示词库获取）
     * @returns {Promise<Object>} - { imageUrl, filePath, metadata }
     */
    async generateCharacterImage(character, modelConfig, options = {}, fileId = null, systemPrompt = null) {
        const { modelId, apiKey, baseUrl, providerName, modelName } = modelConfig;

        // 如果 options 包含自定义 API 参数（如 prompt, width, height 等），直接使用
        // 否则使用默认值
        const { width = 1024, height = 1024, style = 'realistic', ...customApiParams } = options;

        try {
            // 构建提示词和参考图
            const { prompt, referenceImageUrls } = await this.buildPromptAndReferences(
                { ...options, ...customApiParams },
                character,
                'character_image_generation',
                systemPrompt,
                (char, s, d, sp) => this.buildImagePrompt(char, s, sp)
            );

            // 根据提供商调用不同的API
            let result;
            switch (providerName.toLowerCase()) {
                case 'stability-ai':
                case 'stability':
                    result = await this.callStabilityAI(baseUrl, apiKey, prompt, modelName, referenceImageUrls, { width, height, ...customApiParams });
                    break;
                case 'openai':
                    result = await this.callOpenAIDalle(baseUrl, apiKey, prompt, modelName, referenceImageUrls, { width, height, ...customApiParams });
                    break;
                case 'midjourney':
                    result = await this.callMidjourney(baseUrl, apiKey, prompt, modelName, referenceImageUrls, { width, height, ...customApiParams });
                    break;
                case 'grsai':
                    // 支持 grsai 的自定义 API 参数
                    // 如果 customApiParams 中已经有 prompt，使用它；否则使用构建的 prompt
                    const grsaiPrompt = customApiParams.prompt || prompt;
                    result = await this.callGrsaiImage(baseUrl, apiKey, grsaiPrompt, modelName, referenceImageUrls, { width, height, ...customApiParams });
                    break;
                default:
                    throw new AppError(`Unsupported image generation provider: ${providerName}`, 400);
            }

            // 处理返回的图片：如果是远端URL则直接透传，否则落盘保存
            const targetFileId = fileId || character.id;
            let finalImageUrl = result.imageUrl;
            let finalFilePath = null;

            if (finalImageUrl && /^https?:\/\//i.test(finalImageUrl)) {
                // 远端URL，直接返回
                finalFilePath = null;
            } else {
                // base64 或本地路径，需要落盘
                const savedFile = await this.saveImageFile(result.imageUrl || result.imageData, targetFileId);
                finalImageUrl = savedFile.url;
                finalFilePath = savedFile.path;
            }

            return {
                imageUrl: finalImageUrl,
                filePath: finalFilePath,
                metadata: {
                    width,
                    height,
                    style,
                    provider: providerName,
                    model: modelId,
                },
            };
        } catch (error) {
            logger.error('Generate character image error:', error);
            throw new AppError(`Failed to generate character image: ${error.message}`, 500);
        }
    }

    /**
     * 生成角色视频（2秒）
     * @param {Object} character - 角色对象
     * @param {Object} modelConfig - 模型配置 { modelId, apiKey, baseUrl, providerName, modelName }
     * @param {Object} options - 生成选项 { duration, style, featurePromptId, genreStyle, etc. } 或自定义API参数对象
     * @param {string} fileId - 文件ID（可选，如果不提供则使用character.id）
     * @param {string} systemPrompt - 系统提示词（可选，如果不提供则从系统提示词库获取）
     * @returns {Promise<Object>} - { videoUrl, filePath, thumbnailUrl, metadata }
     */
    async generateCharacterVideo(character, modelConfig, options = {}, fileId = null, systemPrompt = null) {
        const { modelId, apiKey, baseUrl, providerName, modelName } = modelConfig;

        // 如果 options 包含自定义 API 参数，直接使用
        // 否则使用默认值
        const { duration = 2, style = 'realistic', ...customApiParams } = options;

        try {
            // 构建提示词和参考图
            const { prompt, referenceImageUrls } = await this.buildPromptAndReferences(
                { ...options, ...customApiParams },
                character,
                'character_video_generation',
                systemPrompt,
                (char, s, d, sp) => this.buildVideoPrompt(char, s, d, sp)
            );
            // 根据提供商调用不同的API
            let result;
            switch (providerName.toLowerCase()) {
                case 'openai':
                    // 对于角色视频生成，referenceImageUrls 作为 characterVideoUrls 传递，referenceVideoUrls 为空
                    result = await this.callOpenAISora(baseUrl, apiKey, prompt, modelName, referenceImageUrls, { duration, ...customApiParams }, []);
                    break;
                case 'runway':
                    result = await this.callRunway(baseUrl, apiKey, prompt, modelName, referenceImageUrls, { duration, ...customApiParams }, []);
                    break;
                case 'pika':
                    result = await this.callPika(baseUrl, apiKey, prompt, modelName, referenceImageUrls, { duration, ...customApiParams }, []);
                    break;
                case 'grsai':
                    // 支持 grsai 的 sora-2 模型
                    // 如果 customApiParams 中已经有 prompt，使用它；否则使用构建的 prompt
                    const grsaiVideoPrompt = customApiParams.prompt || prompt;
                    result = await this.callGrsaiVideo(baseUrl, apiKey, grsaiVideoPrompt, modelName, referenceImageUrls, { duration, ...customApiParams }, []);
                    break;
                default:
                    throw new AppError(`Unsupported video generation provider: ${providerName}`, 400);
            }

            // 处理返回的视频：如果是远端URL则直接透传，否则落盘保存
            const targetFileId = fileId || character.id;
            let finalVideoUrl = result.videoUrl;
            let finalFilePath = null;
            let thumbnailUrl = null;

            if (finalVideoUrl && /^https?:\/\//i.test(finalVideoUrl)) {
                // 远端URL，直接返回
                finalFilePath = null;
                // 对于远端视频，暂时无法生成缩略图
                thumbnailUrl = null;
            } else {
                // base64 或本地路径，需要落盘
                const savedFile = await this.saveVideoFile(result.videoUrl || result.videoData, targetFileId);
                finalVideoUrl = savedFile.url;
                finalFilePath = savedFile.path;
                // 生成缩略图（从视频第一帧提取）
                thumbnailUrl = await this.generateThumbnail(savedFile.path);
            }

            return {
                videoUrl: finalVideoUrl,
                filePath: finalFilePath,
                thumbnailUrl,
                metadata: {
                    duration,
                    style,
                    provider: providerName,
                    model: modelId,
                },
            };
        } catch (error) {
            logger.error('Generate character video error:', error);
            throw new AppError(`Failed to generate character video: ${error.message}`, 500);
        }
    }

    /**
     * 构建图片生成提示词
     * @param {Object} character - 角色对象
     * @param {string} style - 风格
     * @param {string} systemPrompt - 系统提示词模板（可选）
     */
    buildImagePrompt(character, style = 'realistic', systemPrompt = null) {
        // 如果description字段包含完整的提示词（用于场景图生成），直接使用
        if (character.description && character.description.length > 50) {
            // 如果description看起来像是一个完整的提示词（长度较长），直接使用
            return character.description;
        }

        // 构建角色信息对象
        const characterInfo = {
            appearance: character.appearance || '',
            clothingStyle: character.clothingStyle || '',
            age: character.age || '',
            gender: character.gender || '',
            background: character.background || '',
            description: character.description || '',
        };

        // 如果有系统提示词模板，使用模板构建
        if (systemPrompt) {
            // 将角色信息填充到系统提示词中
            // 注意：这里系统提示词是指导如何构建提示词的模板，不是直接使用的
            // 我们仍然需要根据角色信息构建实际的提示词
            // 系统提示词主要用于指导生成风格和质量要求
        }

        const parts = [];

        if (characterInfo.appearance) {
            parts.push(characterInfo.appearance);
        }
        if (characterInfo.clothingStyle) {
            parts.push(`wearing ${characterInfo.clothingStyle}`);
        }
        if (characterInfo.age) {
            parts.push(`age ${characterInfo.age}`);
        }
        if (characterInfo.gender) {
            parts.push(characterInfo.gender);
        }
        if (characterInfo.background) {
            parts.push(`background: ${characterInfo.background}`);
        }
        if (characterInfo.description && !characterInfo.appearance) {
            // 如果没有appearance但有description，使用description
            parts.push(characterInfo.description);
        }

        const basePrompt = parts.join(', ');
        let finalPrompt = `${basePrompt}, ${style} style, high quality, detailed, professional photography`;

        // 如果有系统提示词，在末尾添加系统提示词中的质量要求
        if (systemPrompt) {
            // 从系统提示词中提取关键的质量要求（如果有）
            // 这里简化处理，直接追加系统提示词中的关键描述
            finalPrompt = `${basePrompt}, ${style} style, high quality, detailed, professional photography, ${systemPrompt}`;
        }

        return finalPrompt;
    }

    /**
     * 构建视频生成提示词
     * @param {Object} character - 角色对象
     * @param {string} style - 风格
     * @param {number} duration - 时长（秒）
     * @param {string} systemPrompt - 系统提示词模板（可选）
     */
    buildVideoPrompt(character, style = 'realistic', duration = 2, systemPrompt = null) {
        const imagePrompt = this.buildImagePrompt(character, style, systemPrompt);
        let videoPrompt = `${imagePrompt}, ${duration} seconds, smooth motion, cinematic`;

        // 如果有系统提示词，添加视频特定的要求
        // 注意：系统提示词是指导性的，我们将其作为质量要求的补充
        if (systemPrompt) {
            const videoKeywords = ['smooth motion', 'cinematic', 'motion'];
            const hasVideoKeywords = videoKeywords.some(keyword =>
                systemPrompt.toLowerCase().includes(keyword.toLowerCase())
            );

            if (!hasVideoKeywords) {
                videoPrompt = `${imagePrompt}, ${duration} seconds, smooth motion, cinematic, ${systemPrompt}`;
            } else {
                // 如果系统提示词已经包含视频关键词，直接追加
                videoPrompt = `${imagePrompt}, ${duration} seconds, ${systemPrompt}`;
            }
        }

        return videoPrompt;
    }

    /**
     * 调用 Stability AI API
     */
    async callStabilityAI(baseUrl, apiKey, prompt, options) {
        const url = `${baseUrl}/generation/stable-diffusion-xl-1024-v1-0/text-to-image`;

        const response = await axios.post(
            url,
            {
                text_prompts: [{ text: prompt }],
                cfg_scale: 7,
                height: options.height,
                width: options.width,
                steps: 30,
            },
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                responseType: 'arraybuffer',
            }
        );

        // Stability AI 返回 base64 编码的图片
        const base64Image = Buffer.from(response.data).toString('base64');
        return { imageData: base64Image };
    }

    /**
     * 调用 OpenAI DALL-E API
     */
    async callOpenAIDalle(baseUrl, apiKey, prompt, options) {
        const url = `${baseUrl}/images/generations`;

        const response = await axios.post(
            url,
            {
                model: 'dall-e-3',
                prompt,
                n: 1,
                size: `${options.width}x${options.height}`,
            },
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        return { imageUrl: response.data.data[0].url };
    }

    /**
     * 调用 Midjourney API（示例，实际需要根据具体API调整）
     */
    async callMidjourney(baseUrl, apiKey, prompt, options) {
        // 这里需要根据实际的 Midjourney API 实现
        throw new AppError('Midjourney API not implemented yet', 501);
    }

    /**
     * 调用 Grsai 图片生成 API
     * @param {string} baseUrl - API 基础URL
     * @param {string} apiKey - API密钥
     * @param {string} prompt - 提示词
     * @param {Object} options - 选项，支持自定义API参数
     */
    async callGrsaiImage(baseUrl, apiKey, prompt, modelName, referenceImageUrls, options = {}) {
        const {
            prompt: customPrompt,
            webHook = '-1',
            shutProgress = false,
            maxAttempts = 20, // 20 * 30s = 10分钟
            pollIntervalMs = 30000,
            ...customParams
        } = options;
        const finalPrompt = customPrompt || prompt;
        const isNanoBanana = modelName === 'nano-banana-fast';
        const startUrl = isNanoBanana
            ? `${baseUrl}/v1/draw/nano-banana`
            : `${baseUrl}/v1/draw/completions`;

        const requestBody = {
            model: modelName,
            prompt: finalPrompt,
            webHook,
            shutProgress,
            urls: referenceImageUrls,
            ...customParams,
        };

        const headers = {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        };

        let taskId;
        try {
            const startResp = await axios.post(startUrl, requestBody, { headers });
            const respData = startResp.data;
            // 优先取 code=0 的 data.id，其次尝试直接的 id
            if (respData?.data?.id) {
                taskId = respData.data.id;
            } else if (respData?.id) {
                taskId = respData.id;
            }
            if (!taskId) {
                const payload = JSON.stringify(respData || {});
                throw new AppError(`Grsai image generation failed: no task id returned, resp=${payload}`, 500);
            }
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError(`Grsai image generation start failed: ${error.message}`, 500);
        }

        const resultUrl = `${baseUrl}/v1/draw/result`;
        const pollBody = { id: taskId };
        let attempt = 0;

        while (attempt < maxAttempts) {
            attempt += 1;
            try {
                const pollResp = await axios.post(resultUrl, pollBody, { headers });
                const data = pollResp.data?.data;
                const status = data?.status;
                const progress = data?.progress;

                if (status === 'succeeded' && Array.isArray(data?.results) && data.results.length > 0) {
                    const imageUrl = data.results[0].url;
                    if (!imageUrl) {
                        throw new AppError('Grsai image generation succeeded but no url returned', 500);
                    }
                    return {
                        imageUrl,
                        metadata: {
                            taskId,
                            status,
                            progress,
                            content: data.results[0].content,
                            model: modelName,
                        },
                    };
                }

                if (status === 'failed') {
                    const reason = data?.failure_reason || data?.error || 'unknown reason';
                    throw new AppError(`Grsai image generation failed: ${reason}`, 500);
                }
            } catch (error) {
                if (error instanceof AppError) throw error;
                logger.warn(`Grsai polling attempt ${attempt} failed: ${error.message}`);
            }

            await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
        }

        throw new AppError('Grsai image generation polling timeout', 504);
    }

    /**
     * 调用 Grsai 视频生成 API (sora-2)
     * @param {string} baseUrl - API 基础URL
     * @param {string} apiKey - API密钥
     * @param {string} prompt - 提示词
     * @param {string} modelName - 模型名称（可选）
     * @param {Array} referenceImageUrls - 参考图URL数组（可选）
     * @param {Object} options - 选项，支持自定义API参数
     */
    async callGrsaiVideo(baseUrl, apiKey, prompt, modelName = null, referenceVideoUrls = [], options = {}, characterVideoUrls = []) {
        const {
            duration = 2,
            prompt: customPrompt, // 如果 options 中有 prompt，优先使用
            webHook = '-1',
            shutProgress = false,
            maxAttempts = 20, // 20 * 30s = 10分钟
            pollIntervalMs = 30000,
            ...customParams // 其他自定义参数（全部透传给 Grsai）
        } = options;

        const finalPrompt = customPrompt || prompt;
        const isSora = (modelName || '').toLowerCase() === 'sora-2';
        const isVeo = (modelName || '').toLowerCase() === 'veo3.1-fast';
        const startUrl = isVeo
            ? `${baseUrl}/v1/video/veo`
            : `${baseUrl}/v1/video/sora-video`; // 默认走 sora-video

        // 将角色视频URL转换为包含url和timestamps的对象数组
        // timestamps格式: "start,end"，例如 "0,3" 表示从0秒到3秒
        const characters = characterVideoUrls.map(url => {
            if (typeof url === 'string') {
                // 如果是字符串URL，转换为对象格式
                return {
                    url: url,
                    timestamps: `0,3` // 默认从0秒到3秒
                };
            } else if (typeof url === 'object' && url.url) {
                // 如果已经是对象格式，确保有timestamps字段
                return {
                    url: url.url,
                    timestamps: url.timestamps || `0,3`
                };
            }
            return null;
        }).filter(item => item !== null); // 过滤掉null值
        const requestBody = {
            model: modelName,
            prompt: finalPrompt,
            duration,
            webHook,
            shutProgress,
            characters: characters,
            ...customParams,
        };

        console.log('requestBody1111', requestBody);

        const headers = {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        };

        let taskId;
        try {
            const startResp = await axios.post(startUrl, requestBody, { headers });
            const respData = startResp.data;
            if (respData?.data?.id) {
                taskId = respData.data.id;
            } else if (respData?.id) {
                taskId = respData.id;
            }
            if (!taskId) {
                const payload = JSON.stringify(respData || {});
                throw new AppError(`Grsai video generation failed: no task id returned, resp=${payload}`, 500);
            }
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError(`Grsai video generation start failed: ${error.message}`, 500);
        }

        const resultUrl = `${baseUrl}/v1/draw/result`;
        const pollBody = { id: taskId };
        let attempt = 0;

        while (attempt < maxAttempts) {
            attempt += 1;
            try {
                const pollResp = await axios.post(resultUrl, pollBody, { headers });
                const data = pollResp.data?.data;
                const status = data?.status;
                const progress = data?.progress;

                if (status === 'succeeded' && Array.isArray(data?.results) && data.results.length > 0) {
                    const videoUrl = data.results[0].url;
                    if (!videoUrl) {
                        throw new AppError('Grsai video generation succeeded but no url returned', 500);
                    }
                    return {
                        videoUrl,
                        metadata: {
                            taskId,
                            status,
                            progress,
                            pid: data.results[0].pid,
                            removeWatermark: data.results[0].removeWatermark,
                            model: modelName,
                        },
                    };
                }

                if (status === 'failed') {
                    const reason = data?.failure_reason || data?.error || 'unknown reason';
                    throw new AppError(`Grsai video generation failed: ${reason}`, 500);
                }
            } catch (error) {
                if (error instanceof AppError) throw error;
                logger.warn(`Grsai video polling attempt ${attempt} failed: ${error.message}`);
            }

            await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
        }

        throw new AppError('Grsai video generation polling timeout', 504);
    }

    /**
     * 调用 OpenAI Sora API
     * @param {string} baseUrl - API 基础URL
     * @param {string} apiKey - API密钥
     * @param {string} prompt - 提示词
     * @param {string} modelName - 模型名称（可选）
     * @param {Array} referenceImageUrls - 参考图URL数组（可选）
     * @param {Object} options - 选项，支持自定义API参数
     */
    async callOpenAISora(baseUrl, apiKey, prompt, modelName = null, characterVideoUrls = [], options = {}, referenceVideoUrls = []) {
        const url = `${baseUrl}/videos/generations`;

        // 合并角色视频URL和参考视频URL
        const allReferenceUrls = [...characterVideoUrls, ...referenceVideoUrls];

        const response = await axios.post(
            url,
            {
                model: 'sora',
                prompt,
                duration: options.duration,
                referenceImageUrls: allReferenceUrls, // 虽然名字是Image，但可能支持视频URL
            },
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        return { videoUrl: response.data.data[0].url };
    }

    /**
     * 调用 Runway API（示例）
     * @param {string} baseUrl - API 基础URL
     * @param {string} apiKey - API密钥
     * @param {string} prompt - 提示词
     * @param {string} modelName - 模型名称（可选）
     * @param {Array} referenceImageUrls - 参考图URL数组（可选）
     * @param {Object} options - 选项，支持自定义API参数
     */
    async callRunway(baseUrl, apiKey, prompt, modelName = null, characterVideoUrls = [], options = {}, referenceVideoUrls = []) {
        // 合并角色视频URL和参考视频URL
        const allReferenceUrls = [...characterVideoUrls, ...referenceVideoUrls];
        // 这里需要根据实际的 Runway API 实现
        throw new AppError('Runway API not implemented yet', 501);
    }

    /**
     * 调用 Pika API（示例）
     * @param {string} baseUrl - API 基础URL
     * @param {string} apiKey - API密钥
     * @param {string} prompt - 提示词
     * @param {string} modelName - 模型名称（可选）
     * @param {Array} referenceImageUrls - 参考图URL数组（可选）
     * @param {Object} options - 选项，支持自定义API参数
     */
    async callPika(baseUrl, apiKey, prompt, modelName = null, characterVideoUrls = [], options = {}, referenceVideoUrls = []) {
        // 合并角色视频URL和参考视频URL
        const allReferenceUrls = [...characterVideoUrls, ...referenceVideoUrls];
        // 这里需要根据实际的 Pika API 实现
        throw new AppError('Pika API not implemented yet', 501);
    }

    /**
     * 保存图片文件
     * @param {string} imageUrlOrData - 图片URL或Base64数据
     * @param {string} fileId - 文件ID（可以是角色ID或场景ID，格式如 "character_xxx" 或 "scene_xxx"）
     * @returns {Promise<Object>} - { url, path }
     */
    async saveImageFile(imageUrlOrData, fileId) {
        // 解析文件ID类型（character_xxx 或 scene_xxx）
        let uploadDir;
        let urlPrefix;

        if (fileId.startsWith('scene_')) {
            const sceneId = fileId.replace('scene_', '');
            uploadDir = path.join(config.rootPath, 'uploads', 'scenes', sceneId);
            urlPrefix = 'scenes';
        } else {
            // 默认使用角色目录
            uploadDir = path.join(config.rootPath, 'uploads', 'characters', fileId);
            urlPrefix = 'characters';
        }

        await fs.mkdir(uploadDir, { recursive: true });

        const filename = `image_${Date.now()}.png`;
        const filePath = path.join(uploadDir, filename);

        if (imageUrlOrData.startsWith('http')) {
            // 下载图片
            const response = await axios.get(imageUrlOrData, { responseType: 'arraybuffer' });
            await fs.writeFile(filePath, response.data);
        } else {
            // Base64 数据
            const buffer = Buffer.from(imageUrlOrData, 'base64');
            await fs.writeFile(filePath, buffer);
        }

        const fileIdOnly = fileId.replace(/^(character_|scene_|shot_)/, '');
        const url = `/uploads/${urlPrefix}/${fileIdOnly}/${filename}`;
        return { url, path: filePath };
    }

    /**
     * 保存视频文件
     * @param {string} videoUrlOrData - 视频URL或Base64数据
     * @param {string} fileId - 文件ID（可以是角色ID或场景ID，格式如 "character_xxx" 或 "scene_xxx"）
     * @returns {Promise<Object>} - { url, path }
     */
    async saveVideoFile(videoUrlOrData, fileId) {
        // 解析文件ID类型（character_xxx、scene_xxx 或 shot_xxx）
        let uploadDir;
        let urlPrefix;

        if (fileId.startsWith('scene_')) {
            const sceneId = fileId.replace('scene_', '');
            uploadDir = path.join(config.rootPath, 'uploads', 'scenes', sceneId);
            urlPrefix = 'scenes';
        } else if (fileId.startsWith('shot_')) {
            const shotId = fileId.replace('shot_', '');
            uploadDir = path.join(config.rootPath, 'uploads', 'shots', shotId);
            urlPrefix = 'shots';
        } else {
            // 默认使用角色目录
            const characterId = fileId.replace(/^character_/, '');
            uploadDir = path.join(config.rootPath, 'uploads', 'characters', characterId);
            urlPrefix = 'characters';
        }

        await fs.mkdir(uploadDir, { recursive: true });

        const filename = `video_${Date.now()}.mp4`;
        const filePath = path.join(uploadDir, filename);

        if (videoUrlOrData.startsWith('http')) {
            // 下载视频
            const response = await axios.get(videoUrlOrData, { responseType: 'arraybuffer' });
            await fs.writeFile(filePath, response.data);
        } else {
            // Base64 数据
            const buffer = Buffer.from(videoUrlOrData, 'base64');
            await fs.writeFile(filePath, buffer);
        }

        const fileIdOnly = fileId.replace(/^(character_|scene_|shot_)/, '');
        const url = `/uploads/${urlPrefix}/${fileIdOnly}/${filename}`;
        return { url, path: filePath };
    }

    /**
     * 生成视频缩略图
     */
    async generateThumbnail(videoPath) {
        // 这里需要使用 ffmpeg 或其他工具从视频提取第一帧
        // 暂时返回 null，后续可以集成 ffmpeg
        logger.warn('Thumbnail generation not implemented yet');
        return null;
    }
}

module.exports = new ImageGenerationService();

