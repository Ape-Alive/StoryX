const { getPrisma } = require('../utils/prisma');
const logger = require('../utils/logger');
const { NotFoundError, AppError } = require('../utils/errors');
const imageGenerationService = require('./imageGenerationService');
const projectService = require('./projectService');
const aiModelService = require('./aiModelService');
const systemPromptService = require('./systemPromptService');
const { decrypt } = require('../utils/encryption');
const fs = require('fs').promises;
const path = require('path');
const config = require('../config');

class SceneService {
    /**
     * 获取场景列表
     * @param {string} projectId - 项目ID（可选）
     * @param {string} novelId - 小说ID（可选）
     * @param {string} userId - 用户ID
     * @returns {Promise<Array>} - 场景列表
     */
    async getScenes(projectId, novelId, userId) {
        const prisma = getPrisma();

        try {
            const where = { userId };

            if (projectId) {
                where.projectId = projectId;
            }

            if (novelId) {
                where.novelId = novelId;
            }

            const scenes = await prisma.scene.findMany({
                where,
                include: {
                    acts: {
                        include: {
                            act: {
                                select: {
                                    id: true,
                                    actName: true,
                                    order: true,
                                },
                            },
                        },
                        orderBy: {
                            order: 'asc',
                        },
                    },
                    novel: {
                        select: {
                            id: true,
                            title: true,
                        },
                    },
                    project: {
                        select: {
                            id: true,
                            title: true,
                        },
                    },
                },
                orderBy: [
                    { novelId: 'asc' },
                    { order: 'asc' },
                ],
            });

            return scenes.map(scene => ({
                id: scene.id,
                actIds: scene.acts.map(as => as.act.id),
                acts: scene.acts.map(as => ({
                    id: as.act.id,
                    actName: as.act.actName,
                    order: as.act.order,
                    sceneOrder: as.order, // 场景在该 Act 中的顺序
                })),
                novelId: scene.novelId,
                novelTitle: scene.novel?.title,
                projectId: scene.projectId,
                projectTitle: scene.project?.title,
                address: scene.address,
                sceneDescription: scene.sceneDescription,
                sceneImage: scene.sceneImage,
                shotIds: scene.shotIds ? JSON.parse(scene.shotIds) : [],
                order: scene.order,
                createdAt: scene.createdAt,
                updatedAt: scene.updatedAt,
            }));
        } catch (error) {
            logger.error('Get scenes error:', error);
            throw new AppError('Failed to get scenes', 500);
        }
    }

    /**
     * 生成场景图（支持单个或批量）
     * @param {string|Array} sceneIds - 场景ID或场景ID数组
     * @param {string} projectId - 项目ID
     * @param {string} userId - 用户ID
     * @param {Object} options - 配置选项
     * @returns {Promise<Object>} - 任务信息（单个）或任务列表（批量）
     */
    async generateSceneImage(sceneIds, projectId, userId, options = {}) {
        const prisma = getPrisma();

        try {
            // 支持单个场景ID或场景ID数组
            const sceneIdArray = Array.isArray(sceneIds) ? sceneIds : [sceneIds];
            const isBatch = Array.isArray(sceneIds);

            if (sceneIdArray.length === 0) {
                throw new AppError('At least one sceneId is required', 400);
            }

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

            // 验证所有场景属于用户和项目
            const scenes = await prisma.scene.findMany({
                where: {
                    id: { in: sceneIdArray },
                    userId,
                    projectId,
                },
            });

            if (scenes.length !== sceneIdArray.length) {
                throw new AppError('Some scenes not found or do not belong to user/project', 404);
            }

            // 解析配置
            const {
                modelId = null, // 如果为null，使用项目配置
                prompt = null, // 自定义提示词（可选）
                config: imageConfig = {}, // 额外配置（如尺寸、风格等）
            } = options;

            // 获取模型配置
            let modelConfig = null;
            const projectWithKeys = await projectService.getProjectWithKeys(projectId, userId);

            if (modelId) {
                // 使用指定的模型
                const model = await aiModelService.getModelById(modelId);
                if (!model) {
                    throw new AppError('Model not found', 404);
                }

                if (model.type !== 'image') {
                    throw new AppError('Model must be an image generation model', 400);
                }

                const apiKey = decrypt(projectWithKeys.configImageGenKey);
                if (!apiKey) {
                    throw new AppError('API key not configured for image generation model', 400);
                }

                modelConfig = {
                    modelId: model.id,
                    apiKey,
                    baseUrl: model.baseUrl,
                    providerName: model.provider.name,
                };
            } else {
                // 使用项目配置
                if (project.configImageGen === 'default') {
                    throw new AppError('Image generation model not configured', 400);
                }

                const model = await aiModelService.getModelById(project.configImageGen);
                if (!model) {
                    throw new AppError('Image generation model not found', 404);
                }

                const apiKey = decrypt(projectWithKeys.configImageGenKey);
                modelConfig = {
                    modelId: model.id,
                    apiKey,
                    baseUrl: model.baseUrl,
                    providerName: model.provider.name,
                };
            }

            // 为每个场景创建生成任务
            const tasks = [];
            for (const scene of scenes) {
                // 构建提示词（如果没有提供自定义提示词，则为每个场景单独构建）
                let imagePrompt = prompt;
                if (!imagePrompt) {
                    imagePrompt = this.buildSceneImagePrompt(scene);
                }

                // 创建场景图生成任务
                const task = await prisma.sceneImageTask.create({
                    data: {
                        sceneId: scene.id,
                        projectId,
                        novelId: scene.novelId,
                        userId,
                        modelId: modelConfig.modelId,
                        prompt: imagePrompt,
                        status: 'pending',
                        progress: 0,
                        metadata: JSON.stringify(imageConfig),
                    },
                });

                // 异步处理任务
                this.processSceneImageTask(task.id, scene, modelConfig, imagePrompt, imageConfig).catch(error => {
                    logger.error(`Failed to process scene image task ${task.id}:`, error);
                });

                tasks.push({
                    taskId: task.id,
                    sceneId: scene.id,
                    status: task.status,
                });
            }

            // 如果是单个场景，返回单个任务信息；如果是批量，返回任务列表
            if (isBatch) {
                return {
                    totalCount: tasks.length,
                    tasks,
                };
            } else {
                return tasks[0];
            }
        } catch (error) {
            if (error instanceof NotFoundError || error instanceof AppError) {
                throw error;
            }
            logger.error('Generate scene image error:', error);
            throw new AppError('Failed to generate scene image', 500);
        }
    }

    /**
     * 处理场景图生成任务（异步）
     */
    async processSceneImageTask(taskId, scene, modelConfig, prompt, config) {
        const prisma = getPrisma();

        try {
            // 更新任务状态
            await prisma.sceneImageTask.update({
                where: { id: taskId },
                data: {
                    status: 'processing',
                    startedAt: new Date(),
                    progress: 10,
                },
            });

            // 使用自定义提示词或构建提示词
            const finalPrompt = prompt || await this.buildSceneImagePrompt(scene);

            // 构建场景描述对象（用于图片生成）
            // 将最终提示词放在description字段，这样buildImagePrompt会优先使用它
            const sceneForImage = {
                appearance: scene.sceneDescription || scene.address,
                description: finalPrompt, // 使用最终构建的提示词
            };

            // 生成图片（使用场景描述）
            // 使用场景ID作为文件ID（格式：scene_xxx）
            const generatedData = await imageGenerationService.generateCharacterImage(
                sceneForImage,
                modelConfig,
                {
                    width: config.width || 1024,
                    height: config.height || 1024,
                    style: config.style || 'realistic',
                    ...config,
                },
                `scene_${scene.id}` // 传递场景ID作为文件ID
            );

            // 更新任务
            await prisma.sceneImageTask.update({
                where: { id: taskId },
                data: {
                    status: 'completed',
                    progress: 100,
                    imageUrl: generatedData.imageUrl,
                    filePath: generatedData.filePath,
                    metadata: JSON.stringify(generatedData.metadata),
                    completedAt: new Date(),
                },
            });

            // 更新场景的sceneImage字段
            await prisma.scene.update({
                where: { id: scene.id },
                data: {
                    sceneImage: generatedData.imageUrl,
                },
            });

            logger.info(`Scene image generated successfully for scene ${scene.id}`);
        } catch (error) {
            logger.error(`Process scene image task ${taskId} error:`, error);
            await prisma.sceneImageTask.update({
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
     * 构建场景图生成提示词
     * @param {Object} scene - 场景对象
     * @param {string} systemPrompt - 系统提示词模板（可选）
     */
    async buildSceneImagePrompt(scene, systemPrompt = null) {
        // 获取系统提示词（如果没有提供）
        if (!systemPrompt) {
            const promptConfig = await systemPromptService.getSystemPromptByFunctionKey('scene_image_generation');
            if (promptConfig && promptConfig.prompt) {
                systemPrompt = promptConfig.prompt;
            }
        }

        const parts = [];

        if (scene.address) {
            parts.push(`Location: ${scene.address}`);
        }

        if (scene.sceneDescription) {
            parts.push(scene.sceneDescription);
        } else if (scene.address) {
            parts.push(`A scene at ${scene.address}`);
        }

        const basePrompt = parts.length > 0 ? parts.join(', ') : 'A cinematic scene';
        let finalPrompt = `${basePrompt}, high quality, detailed, cinematic, professional photography, scene setting, wide angle`;

        // 如果有系统提示词，添加质量要求
        if (systemPrompt) {
            finalPrompt = `${basePrompt}, high quality, detailed, cinematic, professional photography, scene setting, wide angle, ${systemPrompt}`;
        }

        return finalPrompt;
    }

    /**
     * 新增场景
     * @param {Object} sceneData - 场景数据
     * @param {string} userId - 用户ID
     * @returns {Promise<Object>} - 创建的场景
     */
    async createScene(sceneData, userId) {
        const prisma = getPrisma();

        try {
            const {
                actId,
                novelId,
                projectId,
                address,
                sceneDescription,
                shotIds = [], // 关联的镜头ID列表
            } = sceneData;

            // 验证剧幕属于用户
            const act = await prisma.act.findFirst({
                where: {
                    id: actId,
                    userId,
                },
            });

            if (!act) {
                throw new NotFoundError('Act not found');
            }

            // 验证项目属于用户
            if (projectId) {
                const project = await prisma.project.findFirst({
                    where: {
                        id: projectId,
                        userId,
                    },
                });
                if (!project) {
                    throw new NotFoundError('Project not found');
                }
            }

            // 检查是否已存在相同地址的场景（在同一小说中）
            const finalNovelId = novelId || act.novelId;
            const finalProjectId = projectId || act.projectId;

            let scene = await prisma.scene.findFirst({
                where: {
                    novelId: finalNovelId,
                    address: address || '',
                },
            });

            if (!scene) {
                // 创建新场景
                scene = await prisma.scene.create({
                    data: {
                        novelId: finalNovelId,
                        projectId: finalProjectId,
                        userId,
                        address,
                        sceneDescription,
                        shotIds: shotIds.length > 0 ? JSON.stringify(shotIds) : null,
                        order: 0, // Scene 的 order 现在只用于第一个关联的 Act
                    },
                });
                logger.info(`Scene created: ${scene.address} for novel ${finalNovelId}`);
            } else {
                // 更新场景描述和 shotIds（如果提供了新的）
                if (sceneDescription) {
                    scene = await prisma.scene.update({
                        where: { id: scene.id },
                        data: {
                            sceneDescription: sceneDescription,
                        },
                    });
                }
                if (shotIds.length > 0) {
                    let existingShotIds = [];
                    if (scene.shotIds) {
                        try {
                            existingShotIds = JSON.parse(scene.shotIds);
                        } catch (e) {
                            existingShotIds = [];
                        }
                    }
                    const mergedShotIds = [...new Set([...existingShotIds, ...shotIds])];
                    scene = await prisma.scene.update({
                        where: { id: scene.id },
                        data: {
                            shotIds: JSON.stringify(mergedShotIds),
                        },
                    });
                }
                logger.info(`Scene reused: ${scene.address} for act ${act.actName}`);
            }

            // 创建 Act 和 Scene 的关联
            const existingActScene = await prisma.actScene.findFirst({
                where: {
                    actId,
                    sceneId: scene.id,
                },
            });

            if (!existingActScene) {
                // 获取该剧幕下的最大order值
                const maxOrderActScene = await prisma.actScene.findFirst({
                    where: {
                        actId,
                    },
                    orderBy: { order: 'desc' },
                });
                const newOrder = maxOrderActScene ? maxOrderActScene.order + 1 : 1;

                await prisma.actScene.create({
                    data: {
                        actId,
                        sceneId: scene.id,
                        order: newOrder,
                    },
                });
                logger.info(`Act ${act.actName} linked to scene ${scene.address}`);
            }

            return scene;
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            logger.error('Create scene error:', error);
            throw new AppError('Failed to create scene', 500);
        }
    }

    /**
     * 修改场景描述
     * @param {string} sceneId - 场景ID
     * @param {string} userId - 用户ID
     * @param {Object} updateData - 更新数据
     * @returns {Promise<Object>} - 更新后的场景
     */
    async updateScene(sceneId, userId, updateData) {
        const prisma = getPrisma();

        try {
            // 验证场景属于用户
            const scene = await prisma.scene.findFirst({
                where: {
                    id: sceneId,
                    userId,
                },
            });

            if (!scene) {
                throw new NotFoundError('Scene not found');
            }

            const {
                address,
                sceneDescription,
                shotIds,
            } = updateData;

            // 构建更新数据
            const data = {};
            if (address !== undefined) {
                data.address = address;
            }
            if (sceneDescription !== undefined) {
                data.sceneDescription = sceneDescription;
            }
            if (shotIds !== undefined) {
                data.shotIds = Array.isArray(shotIds) && shotIds.length > 0 ? JSON.stringify(shotIds) : null;
            }

            // 更新场景
            const updatedScene = await prisma.scene.update({
                where: { id: sceneId },
                data,
            });

            logger.info(`Scene updated: ${sceneId}`);

            return updatedScene;
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            logger.error('Update scene error:', error);
            throw new AppError('Failed to update scene', 500);
        }
    }

    /**
     * 查询场景图生成进度
     * @param {string} taskId - 任务ID
     * @param {string} userId - 用户ID
     * @returns {Promise<Object>} - 任务进度信息
     */
    async getSceneImageTaskProgress(taskId, userId) {
        const prisma = getPrisma();

        try {
            const task = await prisma.sceneImageTask.findFirst({
                where: {
                    id: taskId,
                    userId,
                },
                include: {
                    scene: {
                        select: {
                            id: true,
                            address: true,
                            sceneDescription: true,
                        },
                    },
                },
            });

            if (!task) {
                throw new NotFoundError('Task not found');
            }

            return {
                taskId: task.id,
                sceneId: task.sceneId,
                sceneAddress: task.scene.address,
                status: task.status,
                progress: task.progress,
                imageUrl: task.imageUrl,
                filePath: task.filePath,
                errorMessage: task.errorMessage,
                metadata: task.metadata ? JSON.parse(task.metadata) : null,
                startedAt: task.startedAt,
                completedAt: task.completedAt,
                createdAt: task.createdAt,
            };
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            logger.error('Get scene image task progress error:', error);
            throw new AppError('Failed to get scene image task progress', 500);
        }
    }
}

module.exports = new SceneService();

