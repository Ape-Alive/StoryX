const { getPrisma } = require('../utils/prisma');
const logger = require('../utils/logger');
const { NotFoundError, AppError } = require('../utils/errors');
const imageGenerationService = require('./imageGenerationService');
const projectService = require('./projectService');
const aiModelService = require('./aiModelService');
const { decrypt } = require('../utils/encryption');
const fileStorageService = require('./fileStorageService');

class CharacterDrawService {
    /**
     * 批量抽卡（每个角色创建一个任务）
     * @param {Array} characterIds - 角色ID数组
     * @param {string} projectId - 项目ID
     * @param {string} userId - 用户ID
     * @param {Object} options - 配置选项
     * @returns {Promise<Array>} - 任务ID数组
     */
    async startBatchDraw(characterIds, projectId, userId, options = {}) {
        const prisma = getPrisma();

        try {
            // 验证项目属于用户
            const project = await prisma.project.findFirst({
                where: {
                    id: projectId,
                    userId,
                },
            });

            if (!project) {
                throw new NotFoundError('Project not found');
            }

            // 验证角色属于用户
            const characters = await prisma.character.findMany({
                where: {
                    id: { in: characterIds },
                    userId,
                },
            });

            if (characters.length !== characterIds.length) {
                throw new AppError('Some characters not found or do not belong to user', 404);
            }

            // 解析配置
            const {
                drawType = 'image', // 'image' | 'video'
                apiConfig = {}, // 自定义AI API请求参数
                storageMode = 'download_upload', // 'download_upload' | 'buffer_upload'
                featurePromptId = null, // 功能提示词ID
                genreStyle = null, // 题材风格
            } = options;

            if (drawType !== 'image' && drawType !== 'video') {
                throw new AppError('drawType must be "image" or "video"', 400);
            }

            // 获取项目配置（用于获取模型ID和API密钥）
            const projectWithKeys = await projectService.getProjectWithKeys(projectId, userId);

            // 根据 drawType 获取对应的模型ID配置
            let modelId = null;
            let apiKey = null;
            if (drawType === 'image') {
                modelId = projectWithKeys.configImageGen;
                apiKey = projectWithKeys.configImageGenKey;
            } else if (drawType === 'video') {
                modelId = projectWithKeys.configVideoAI;
                apiKey = projectWithKeys.configVideoAIKey;
            }

            if (!modelId || !apiKey) {
                throw new AppError(`Model configuration and API key are required for ${drawType} generation`, 400);
            }

            // 通过模型ID获取模型信息（参考结构化脚本的做法）
            let model;
            try {
                model = await aiModelService.getModelById(modelId);
            } catch (e) {
                // 如果项目配置的模型ID无效，获取第一个可用的模型作为fallback
                logger.warn(`Model ID ${modelId} not found, falling back to first available ${drawType} model`);
                const models = await aiModelService.getModelsByType(drawType);
                if (models.length === 0) {
                    throw new AppError(`No active ${drawType} models found`, 404);
                }
                model = models[0];
                logger.info(`Using fallback model: ${model.name} from ${model.provider.name}`);
            }

            // 验证模型类型是否匹配，不匹配则尝试自动降级到首个同类型模型
            if (model.type !== drawType) {
                logger.warn(`Model type mismatch: expected ${drawType}, got ${model.type}, modelId=${model.id}, name=${model.name}. Trying fallback.`);
                const candidates = await aiModelService.getModelsByType(drawType);
                if (candidates && candidates.length > 0) {
                    model = candidates[0];
                    logger.info(`Using fallback ${drawType} model: ${model.name} (${model.id}) from ${model.provider?.name || 'unknown'}`);
                } else {
                    throw new AppError(`Model type mismatch and no ${drawType} models available`, 400);
                }
            }

            // 解密API密钥，若格式不合法则回退为原始值以便兼容明文配置
            try {
                apiKey = decrypt(apiKey);
            } catch (e) {
                logger.warn(`Decrypt project AI key failed, fallback to raw value: ${e.message}`);
            }

            const modelConfig = {
                modelId: model.id,
                apiKey,
                baseUrl: model.baseUrl,
                providerName: model.provider.name,
                modelName: model.name,
            };

            // 为每个角色创建任务并立即处理
            const taskIds = [];
            for (const characterId of characterIds) {
                const character = characters.find(c => c.id === characterId);
                if (!character) continue;

                // 创建任务
                const task = await prisma.characterDrawTask.create({
                    data: {
                        userId,
                        projectId,
                        characterId,
                        drawType,
                        modelId: model.id,
                        apiConfig: JSON.stringify(apiConfig),
                        storageMode,
                        status: 'pending',
                        progress: 0,
                    },
                });

                taskIds.push({
                    taskId: task.id,
                    characterId: characterId,
                });

                // 立即异步处理任务
                this.processDrawTask(task.id, character, modelConfig, apiConfig, storageMode, featurePromptId, genreStyle).catch(error => {
                    logger.error(`Failed to process draw task ${task.id}:`, error);
                });
            }

            return taskIds;
        } catch (error) {
            if (error instanceof NotFoundError || error instanceof AppError) {
                throw error;
            }
            logger.error('Start batch draw error:', error);
            throw new AppError('Failed to start batch draw', 500);
        }
    }

    /**
     * 处理抽卡任务（异步）
     */
    async processDrawTask(taskId, character, modelConfig, apiConfig, storageMode, featurePromptId = null, genreStyle = null) {
        const prisma = getPrisma();

        try {
            // 更新任务状态
            await prisma.characterDrawTask.update({
                where: { id: taskId },
                data: {
                    status: 'processing',
                    progress: 10,
                    startedAt: new Date(),
                },
            });

            // 获取任务信息
            const task = await prisma.characterDrawTask.findUnique({
                where: { id: taskId },
            });

            if (!task) {
                throw new AppError('Task not found', 404);
            }

            const drawType = task.drawType;

            // 调用AI生成
            let generatedData;
            if (drawType === 'image') {
                generatedData = await imageGenerationService.generateCharacterImage(
                    character,
                    modelConfig,
                    {
                        ...apiConfig, // 传递自定义API参数
                        featurePromptId, // 功能提示词ID
                        genreStyle, // 题材风格
                    },
                    `character_${character.id}`
                );
            } else if (drawType === 'video') {
                generatedData = await imageGenerationService.generateCharacterVideo(
                    character,
                    modelConfig,
                    {
                        ...apiConfig, // 传递自定义API参数
                        featurePromptId, // 功能提示词ID
                        genreStyle, // 题材风格
                    },
                    `character_${character.id}` // fileId
                );
            }

            // 更新任务进度
            await prisma.characterDrawTask.update({
                where: { id: taskId },
                data: {
                    progress: 50,
                },
            });

            // 处理文件存储
            const originalUrl = generatedData.imageUrl || generatedData.videoUrl;
            // 校验 URL，避免下载时报 "Invalid URL"
            if (!originalUrl || !/^https?:\/\//i.test(originalUrl)) {
                throw new AppError(`Invalid media url returned from provider: ${originalUrl || 'empty'}`, 500);
            }

            let finalUrl;
            if (storageMode === 'download_upload') {
                // 方式1：下载到本地 → 上传到 Catbox
                const storageResult = await fileStorageService.downloadAndUpload(
                    originalUrl,
                    `characters/${character.id}`,
                    {
                        filename: `${drawType}_${character.id}_${Date.now()}.${drawType === 'image' ? 'png' : 'mp4'}`,
                        uploadToHosting: true,
                        hostingProvider: 'catbox',
                    }
                );
                finalUrl = storageResult.publicUrl;
            } else if (storageMode === 'buffer_upload') {
                // 方式2：直接下载 Buffer → 上传到 Catbox，失败时回退到 download_upload
                try {
                    const storageResult = await fileStorageService.downloadBufferAndUpload(
                        originalUrl,
                        {
                            filename: `${drawType}_${character.id}_${Date.now()}.${drawType === 'image' ? 'png' : 'mp4'}`,
                        }
                    );
                    finalUrl = storageResult.publicUrl;
                } catch (err) {
                    logger.warn(`Buffer upload failed, fallback to download_upload: ${err.message}`);
                    const storageResult = await fileStorageService.downloadAndUpload(
                        originalUrl,
                        `characters/${character.id}`,
                        {
                            filename: `${drawType}_${character.id}_${Date.now()}.${drawType === 'image' ? 'png' : 'mp4'}`,
                            uploadToHosting: true,
                            hostingProvider: 'catbox',
                        }
                    );
                    finalUrl = storageResult.publicUrl;
                }
            } else {
                throw new AppError(`Invalid storage mode: ${storageMode}`, 400);
            }

            // 构建结果对象
            const result = {
                originalUrl: generatedData.imageUrl || generatedData.videoUrl,
                finalUrl: finalUrl,
                metadata: generatedData.metadata || {},
                storageMode: storageMode,
            };

            // 更新任务完成
            await prisma.characterDrawTask.update({
                where: { id: taskId },
                data: {
                    status: 'completed',
                    progress: 100,
                    result: JSON.stringify(result),
                    completedAt: new Date(),
                },
            });

            // 更新角色表
            if (drawType === 'image') {
                await prisma.character.update({
                    where: { id: character.id },
                    data: {
                        imageUrl: finalUrl,
                    },
                });
            } else if (drawType === 'video') {
                await prisma.character.update({
                    where: { id: character.id },
                    data: {
                        videoUrl: finalUrl,
                    },
                });
            }

            logger.info(`Draw task ${taskId} completed successfully`);
        } catch (error) {
            logger.error(`Process draw task ${taskId} error:`, error);
            await prisma.characterDrawTask.update({
                where: { id: taskId },
                data: {
                    status: 'failed',
                    errorMessage: error.message,
                    progress: 0,
                },
            });
        }
    }

    /**
     * 查询抽卡进度
     * @param {string} taskId - 任务ID
     * @param {string} userId - 用户ID
     * @returns {Promise<Object>} - 任务信息
     */
    async getDrawTaskProgress(taskId, userId) {
        const prisma = getPrisma();

        try {
            const task = await prisma.characterDrawTask.findFirst({
                where: {
                    id: taskId,
                    userId,
                },
                include: {
                    character: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            });

            if (!task) {
                throw new NotFoundError('Task not found');
            }

            const result = task.result ? JSON.parse(task.result) : null;

            return {
                taskId: task.id,
                characterId: task.characterId,
                characterName: task.character.name,
                drawType: task.drawType,
                status: task.status,
                progress: task.progress,
                result: result,
                errorMessage: task.errorMessage,
                startedAt: task.startedAt,
                completedAt: task.completedAt,
                createdAt: task.createdAt,
            };
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            logger.error('Get draw task progress error:', error);
            throw new AppError('Failed to get draw task progress', 500);
        }
    }

    /**
     * 获取角色的所有抽卡任务
     * @param {string} characterId - 角色ID
     * @param {string} userId - 用户ID
     * @param {string} drawType - 可选，过滤类型 'image' | 'video'
     * @returns {Promise<Array>} - 任务列表
     */
    async getCharacterDrawTasks(characterId, userId, drawType = null) {
        const prisma = getPrisma();

        try {
            // 验证角色属于用户
            const character = await prisma.character.findFirst({
                where: {
                    id: characterId,
                    userId,
                },
            });

            if (!character) {
                throw new NotFoundError('Character not found');
            }

            const where = {
                characterId,
                userId,
            };

            if (drawType) {
                where.drawType = drawType;
            }

            const tasks = await prisma.characterDrawTask.findMany({
                where,
                orderBy: { createdAt: 'desc' },
            });

            return tasks.map(task => ({
                id: task.id,
                drawType: task.drawType,
                status: task.status,
                progress: task.progress,
                result: task.result ? JSON.parse(task.result) : null,
                errorMessage: task.errorMessage,
                createdAt: task.createdAt,
                completedAt: task.completedAt,
            }));
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            logger.error('Get character draw tasks error:', error);
            throw new AppError('Failed to get character draw tasks', 500);
        }
    }
}

module.exports = new CharacterDrawService();
