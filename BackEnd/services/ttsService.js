const axios = require('axios');
const { getPrisma } = require('../utils/prisma');
const logger = require('../utils/logger');
const { AppError, NotFoundError } = require('../utils/errors');
const fs = require('fs').promises;
const path = require('path');
const config = require('../config');
const { decrypt } = require('../utils/encryption');
const fileStorageService = require('./fileStorageService');

class TTSService {
    /**
     * 生成音频（TTS）
     * @param {string} text - 要转换的文本
     * @param {Object} modelConfig - 模型配置 { id, name, provider: { name }, baseUrl }
     * @param {string} apiKey - API密钥
     * @param {Object} options - 选项 { voice, speed, pitch, volume, format }
     * @param {string} fileId - 文件ID（用于保存文件）
     * @returns {Promise<Object>} - { audioUrl, filePath, metadata }
     */
    async generateAudio(text, modelConfig, apiKey, options = {}, fileId = null) {
        if (!text || !text.trim()) {
            throw new AppError('Text is required for TTS', 400);
        }

        const { provider } = modelConfig;
        const providerName = provider?.name || 'unknown';
        const modelName = modelConfig.name;
        const baseUrl = modelConfig.baseUrl;

        const {
            voice = 'alloy', // OpenAI默认voice
            speed = 1.0,
            pitch = 1.0,
            volume = 1.0,
            format = 'mp3',
            ...customApiParams
        } = options;

        try {
            let result;
            switch (providerName.toLowerCase()) {
                case 'openai':
                    result = await this.callOpenAITTS(baseUrl, apiKey, text, modelName, { voice, speed, ...customApiParams });
                    break;
                case 'doubao':
                case 'volcengine':
                    result = await this.callDoubaoTTS(baseUrl, apiKey, text, modelName, { voice, speed, pitch, volume, ...customApiParams });
                    break;
                default:
                    throw new AppError(`Unsupported TTS provider: ${providerName}`, 400);
            }

            // 处理返回的音频：如果是远端URL则直接透传，否则落盘保存
            const targetFileId = fileId || `tts_${Date.now()}`;
            let finalAudioUrl = result.audioUrl;
            let finalFilePath = null;

            if (result.audioUrl && (result.audioUrl.startsWith('http://') || result.audioUrl.startsWith('https://'))) {
                // 远程URL，直接使用
                finalAudioUrl = result.audioUrl;
            } else {
                // 本地数据或base64，保存到磁盘
                const savedFile = await this.saveAudioFile(result.audioUrl || result.audioData, targetFileId, format);
                finalAudioUrl = savedFile.url;
                finalFilePath = savedFile.filePath;
            }

            return {
                audioUrl: finalAudioUrl,
                filePath: finalFilePath,
                metadata: {
                    provider: providerName,
                    model: modelName,
                    voice,
                    speed,
                    format,
                    textLength: text.length,
                    ...result.metadata,
                },
            };
        } catch (error) {
            logger.error('TTS generation error:', error);
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError(`Failed to generate audio: ${error.message}`, 500);
        }
    }

    /**
     * 调用OpenAI TTS API
     */
    async callOpenAITTS(baseUrl, apiKey, text, modelName, options = {}) {
        const { voice = 'alloy', speed = 1.0, ...customParams } = options;
        const url = `${baseUrl}/audio/speech`;

        try {
            const response = await axios.post(
                url,
                {
                    model: modelName || 'tts-1',
                    input: text,
                    voice,
                    speed,
                    ...customParams,
                },
                {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    responseType: 'arraybuffer',
                    timeout: 60000,
                }
            );

            // OpenAI返回的是音频二进制数据
            const audioData = Buffer.from(response.data);
            return {
                audioData,
                metadata: {
                    contentType: response.headers['content-type'] || 'audio/mpeg',
                    size: audioData.length,
                },
            };
        } catch (error) {
            logger.error('OpenAI TTS API error:', error.response?.data || error.message);
            throw new AppError(`OpenAI TTS API error: ${error.response?.data?.error?.message || error.message}`, error.response?.status || 500);
        }
    }

    /**
     * 调用豆包TTS API
     */
    async callDoubaoTTS(baseUrl, apiKey, text, modelName, options = {}) {
        const { voice, speed = 1.0, pitch = 1.0, volume = 1.0, ...customParams } = options;
        const url = `${baseUrl}/tts`;

        try {
            const response = await axios.post(
                url,
                {
                    model: modelName || 'doubao-tts',
                    text,
                    voice: voice || 'BV700_streaming',
                    speed,
                    pitch,
                    volume,
                    ...customParams,
                },
                {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    responseType: 'arraybuffer',
                    timeout: 60000,
                }
            );

            const audioData = Buffer.from(response.data);
            return {
                audioData,
                metadata: {
                    contentType: response.headers['content-type'] || 'audio/mpeg',
                    size: audioData.length,
                },
            };
        } catch (error) {
            logger.error('Doubao TTS API error:', error.response?.data || error.message);
            throw new AppError(`Doubao TTS API error: ${error.response?.data?.error?.message || error.message}`, error.response?.status || 500);
        }
    }

    /**
     * 保存音频文件到本地
     * @param {string|Buffer} audioUrlOrData - 音频URL或Base64数据或Buffer
     * @param {string} fileId - 文件ID
     * @param {string} format - 音频格式（mp3, wav等）
     * @returns {Promise<Object>} - { url, filePath }
     */
    async saveAudioFile(audioUrlOrData, fileId, format = 'mp3') {
        try {
            const storageDir = path.join(config.fileStorage.localPath, 'audio');
            await fs.mkdir(storageDir, { recursive: true });

            const fileName = `audio_${fileId}_${Date.now()}.${format}`;
            const filePath = path.join(storageDir, fileName);

            let buffer;
            if (audioUrlOrData.startsWith('http')) {
                // 下载远程文件
                const response = await axios.get(audioUrlOrData, { responseType: 'arraybuffer' });
                buffer = Buffer.from(response.data);
            } else if (typeof audioUrlOrData === 'string') {
                // Base64数据
                buffer = Buffer.from(audioUrlOrData, 'base64');
            } else {
                // Buffer
                buffer = audioUrlOrData;
            }

            await fs.writeFile(filePath, buffer);

            const url = `/storage/audio/${fileName}`;
            logger.info('Audio file saved', { filePath, url, size: buffer.length });

            return { url, filePath };
        } catch (error) {
            logger.error('Save audio file error:', error);
            throw new AppError(`Failed to save audio file: ${error.message}`, 500);
        }
    }
}

module.exports = new TTSService();

