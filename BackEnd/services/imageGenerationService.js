const axios = require('axios');
const { getPrisma } = require('../utils/prisma');
const logger = require('../utils/logger');
const { AppError } = require('../utils/errors');
const fs = require('fs').promises;
const path = require('path');
const config = require('../config');
const { decrypt } = require('../utils/encryption');
const systemPromptService = require('./systemPromptService');

class ImageGenerationService {
    /**
     * 生成角色图片
     * @param {Object} character - 角色对象
     * @param {Object} modelConfig - 模型配置 { modelId, apiKey, baseUrl, providerName }
     * @param {Object} options - 生成选项 { width, height, style, etc. } 或自定义API参数对象
     * @param {string} fileId - 文件ID（可选，如果不提供则使用character.id，格式可以是 "character_xxx" 或 "scene_xxx"）
     * @param {string} systemPrompt - 系统提示词（可选，如果不提供则从系统提示词库获取）
     * @returns {Promise<Object>} - { imageUrl, filePath, metadata }
     */
    async generateCharacterImage(character, modelConfig, options = {}, fileId = null, systemPrompt = null) {
        const { modelId, apiKey, baseUrl, providerName } = modelConfig;

        // 如果 options 包含自定义 API 参数（如 prompt, width, height 等），直接使用
        // 否则使用默认值
        const { width = 1024, height = 1024, style = 'realistic', ...customApiParams } = options;

        try {
            // 如果 apiConfig 中已经包含 prompt，直接使用；否则构建提示词
            let prompt;
            if (customApiParams.prompt) {
                prompt = customApiParams.prompt;
            } else {
                // 获取系统提示词（如果没有提供）
                if (!systemPrompt) {
                    const promptConfig = await systemPromptService.getSystemPromptByFunctionKey('character_image_generation');
                    if (promptConfig && promptConfig.prompt) {
                        systemPrompt = promptConfig.prompt;
                    }
                }

                // 构建提示词
                prompt = this.buildImagePrompt(character, style, systemPrompt);
            }

            // 根据提供商调用不同的API
            let result;
            switch (providerName.toLowerCase()) {
                case 'stability-ai':
                case 'stability':
                    result = await this.callStabilityAI(baseUrl, apiKey, prompt, { width, height, ...customApiParams });
                    break;
                case 'openai':
                    result = await this.callOpenAIDalle(baseUrl, apiKey, prompt, { width, height, ...customApiParams });
                    break;
                case 'midjourney':
                    result = await this.callMidjourney(baseUrl, apiKey, prompt, { width, height, ...customApiParams });
                    break;
                case 'grsai':
                    // 支持 grsai 的自定义 API 参数
                    // 如果 customApiParams 中已经有 prompt，使用它；否则使用构建的 prompt
                    const grsaiPrompt = customApiParams.prompt || prompt;
                    result = await this.callGrsaiImage(baseUrl, apiKey, grsaiPrompt, { width, height, ...customApiParams });
                    break;
                default:
                    throw new AppError(`Unsupported image generation provider: ${providerName}`, 400);
            }

            // 保存文件（使用提供的fileId或character.id）
            const targetFileId = fileId || character.id;
            const savedFile = await this.saveImageFile(result.imageUrl || result.imageData, targetFileId);

            return {
                imageUrl: savedFile.url,
                filePath: savedFile.path,
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
     * @param {Object} modelConfig - 模型配置 { modelId, apiKey, baseUrl, providerName }
     * @param {Object} options - 生成选项 { duration, style, etc. } 或自定义API参数对象
     * @param {string} systemPrompt - 系统提示词（可选，如果不提供则从系统提示词库获取）
     * @returns {Promise<Object>} - { videoUrl, filePath, thumbnailUrl, metadata }
     */
    async generateCharacterVideo(character, modelConfig, options = {}, systemPrompt = null) {
        const { modelId, apiKey, baseUrl, providerName } = modelConfig;

        // 如果 options 包含自定义 API 参数，直接使用
        // 否则使用默认值
        const { duration = 2, style = 'realistic', ...customApiParams } = options;

        try {
            // 如果 apiConfig 中已经包含 prompt，直接使用；否则构建提示词
            let prompt;
            if (customApiParams.prompt) {
                prompt = customApiParams.prompt;
            } else {
                // 获取系统提示词（如果没有提供）
                if (!systemPrompt) {
                    const promptConfig = await systemPromptService.getSystemPromptByFunctionKey('character_video_generation');
                    if (promptConfig && promptConfig.prompt) {
                        systemPrompt = promptConfig.prompt;
                    }
                }

                // 构建提示词
                prompt = this.buildVideoPrompt(character, style, duration, systemPrompt);
            }

            // 根据提供商调用不同的API
            let result;
            switch (providerName.toLowerCase()) {
                case 'openai':
                    result = await this.callOpenAISora(baseUrl, apiKey, prompt, { duration, ...customApiParams });
                    break;
                case 'runway':
                    result = await this.callRunway(baseUrl, apiKey, prompt, { duration, ...customApiParams });
                    break;
                case 'pika':
                    result = await this.callPika(baseUrl, apiKey, prompt, { duration, ...customApiParams });
                    break;
                case 'grsai':
                    // 支持 grsai 的 sora-2 模型
                    // 如果 customApiParams 中已经有 prompt，使用它；否则使用构建的 prompt
                    const grsaiVideoPrompt = customApiParams.prompt || prompt;
                    result = await this.callGrsaiVideo(baseUrl, apiKey, grsaiVideoPrompt, { duration, ...customApiParams });
                    break;
                default:
                    throw new AppError(`Unsupported video generation provider: ${providerName}`, 400);
            }

            // 保存文件
            const savedFile = await this.saveVideoFile(result.videoUrl || result.videoData, character.id);

            // 生成缩略图（从视频第一帧提取）
            const thumbnailUrl = await this.generateThumbnail(savedFile.path);

            return {
                videoUrl: savedFile.url,
                filePath: savedFile.path,
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
     * 调用 Grsai 图片生成 API (sora-image)
     * @param {string} baseUrl - API 基础URL
     * @param {string} apiKey - API密钥
     * @param {string} prompt - 提示词
     * @param {Object} options - 选项，支持自定义API参数
     */
    async callGrsaiImage(baseUrl, apiKey, prompt, options = {}) {
        const {
            width = 1024,
            height = 1024,
            prompt: customPrompt, // 如果 options 中有 prompt，优先使用
            ...customParams // 其他自定义参数（排除 prompt，因为已经在参数中）
        } = options;

        // 构建请求体，合并自定义参数
        // 如果 customParams 中有 prompt，会覆盖传入的 prompt
        const requestBody = {
            prompt: customPrompt || prompt, // 优先使用 options 中的 prompt
            width: width,
            height: height,
            ...customParams, // 允许覆盖或添加其他参数
        };

        const response = await axios.post(
            baseUrl,
            requestBody,
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        // 根据实际 API 响应格式返回
        // 假设返回格式为 { imageUrl: "..." } 或 { data: { url: "..." } }
        if (response.data.imageUrl) {
            return { imageUrl: response.data.imageUrl };
        } else if (response.data.data && response.data.data.url) {
            return { imageUrl: response.data.data.url };
        } else if (response.data.url) {
            return { imageUrl: response.data.url };
        } else {
            throw new AppError('Invalid response format from Grsai API', 500);
        }
    }

    /**
     * 调用 Grsai 视频生成 API (sora-2)
     * @param {string} baseUrl - API 基础URL
     * @param {string} apiKey - API密钥
     * @param {string} prompt - 提示词
     * @param {Object} options - 选项，支持自定义API参数
     */
    async callGrsaiVideo(baseUrl, apiKey, prompt, options = {}) {
        const {
            duration = 2,
            prompt: customPrompt, // 如果 options 中有 prompt，优先使用
            ...customParams // 其他自定义参数（排除 prompt，因为已经在参数中）
        } = options;

        // 构建请求体，合并自定义参数
        // 如果 customParams 中有 prompt，会覆盖传入的 prompt
        const requestBody = {
            prompt: customPrompt || prompt, // 优先使用 options 中的 prompt
            duration: duration,
            ...customParams, // 允许覆盖或添加其他参数
        };

        const response = await axios.post(
            baseUrl,
            requestBody,
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        // 根据实际 API 响应格式返回
        // 假设返回格式为 { videoUrl: "..." } 或 { data: { url: "..." } }
        if (response.data.videoUrl) {
            return { videoUrl: response.data.videoUrl };
        } else if (response.data.data && response.data.data.url) {
            return { videoUrl: response.data.data.url };
        } else if (response.data.url) {
            return { videoUrl: response.data.url };
        } else {
            throw new AppError('Invalid response format from Grsai API', 500);
        }
    }

    /**
     * 调用 OpenAI Sora API
     */
    async callOpenAISora(baseUrl, apiKey, prompt, options) {
        const url = `${baseUrl}/videos/generations`;

        const response = await axios.post(
            url,
            {
                model: 'sora',
                prompt,
                duration: options.duration,
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
     */
    async callRunway(baseUrl, apiKey, prompt, options) {
        // 这里需要根据实际的 Runway API 实现
        throw new AppError('Runway API not implemented yet', 501);
    }

    /**
     * 调用 Pika API（示例）
     */
    async callPika(baseUrl, apiKey, prompt, options) {
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

        const fileIdOnly = fileId.replace(/^(character_|scene_)/, '');
        const url = `/uploads/${urlPrefix}/${fileIdOnly}/${filename}`;
        return { url, path: filePath };
    }

    /**
     * 保存视频文件
     */
    async saveVideoFile(videoUrlOrData, characterId) {
        const uploadDir = path.join(config.rootPath, 'uploads', 'characters', characterId);
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

        const url = `/uploads/characters/${characterId}/${filename}`;
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

