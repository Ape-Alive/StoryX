const { getPrisma } = require('../utils/prisma');
const logger = require('../utils/logger');
const { NotFoundError, AppError } = require('../utils/errors');
const projectService = require('./projectService');
const aiModelService = require('./aiModelService');
const imageGenerationService = require('./imageGenerationService');
const ttsService = require('./ttsService');
const systemPromptService = require('./systemPromptService');
const { decrypt } = require('../utils/encryption');
const fs = require('fs').promises;
const path = require('path');
const config = require('../config');
// const ffmpeg = require('fluent-ffmpeg'); // TODO: Install fluent-ffmpeg for video/audio merging

class MediaService {
    /**
     * 1. 获取当前项目下指定小说的所有剧幕（按章节顺序排序），包含场景、镜头等信息
     * @param {string} projectId - 项目ID
     * @param {string} novelId - 小说ID
     * @param {string} userId - 用户ID
     * @returns {Promise<Array>} - 剧幕列表
     */
    async getNovelActsWithDetails(projectId, novelId, userId) {
        const prisma = getPrisma();
        try {
            // 验证项目属于用户
            const project = await prisma.project.findFirst({
                where: { id: projectId, userId },
            });
            if (!project) {
                throw new NotFoundError('Project not found');
            }

            // 验证小说属于项目和用户
            const novel = await prisma.novel.findFirst({
                where: { id: novelId, projectId, userId },
            });
            if (!novel) {
                throw new NotFoundError('Novel not found');
            }

            // 获取所有剧幕，按章节顺序排序
            const acts = await prisma.act.findMany({
                where: {
                    novelId,
                    projectId,
                    userId,
                },
                include: {
                    scenes: {
                        include: {
                            scene: {
                                include: {
                                    shots: {
                                        orderBy: { order: 'asc' },
                                    },
                                },
                            },
                        },
                        orderBy: { order: 'asc' },
                    },
                    shots: {
                        orderBy: { order: 'asc' },
                    },
                },
                orderBy: [
                    { startChapterOrder: 'asc' },
                    { order: 'asc' },
                    { createdAt: 'asc' },
                ],
            });

            // 格式化返回数据
            return acts.map(act => {
                // 处理场景
                const scenes = act.scenes.map(actScene => {
                    const scene = actScene.scene;
                    return {
                        id: scene.id,
                        address: scene.address,
                        sceneDescription: scene.sceneDescription,
                        sceneImage: scene.sceneImage,
                        order: actScene.order,
                        shots: scene.shots.map(shot => this.formatShot(shot)),
                    };
                });

                // 处理直接关联到Act的镜头（没有场景的镜头）
                const directShots = act.shots
                    .filter(shot => !shot.sceneId)
                    .map(shot => this.formatShot(shot));

                return {
                    id: act.id,
                    scriptTaskId: act.scriptTaskId,
                    novelId: act.novelId,
                    projectId: act.projectId,
                    actName: act.actName,
                    content: act.content,
                    highlight: act.highlight,
                    emotionalCurve: act.emotionalCurve,
                    rhythm: act.rhythm,
                    chapterIds: act.chapterIds ? JSON.parse(act.chapterIds) : [],
                    order: act.order,
                    startChapterOrder: act.startChapterOrder,
                    scenes,
                    directShots, // 直接关联到Act的镜头
                    createdAt: act.createdAt,
                    updatedAt: act.updatedAt,
                };
            });
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            logger.error('Get novel acts with details error:', error);
            throw new AppError('Failed to get novel acts with details', 500);
        }
    }

    /**
     * 安全解析JSON
     */
    safeParseJSON(jsonString, defaultValue = null) {
        if (!jsonString) return defaultValue;
        try {
            return JSON.parse(jsonString);
        } catch (error) {
            logger.warn('Failed to parse JSON:', error.message);
            return defaultValue;
        }
    }

    /**
     * 获取镜头的videoUrl（从videoUrl字段）
     */
    getShotVideoUrl(shot) {
        return shot.videoUrl || null;
    }

    /**
     * 获取镜头的dialogue数组
     */
    getShotDialogue(shot) {
        return this.safeParseJSON(shot.dialogue, []);
    }

    /**
     * 获取镜头的characterIds数组
     * 优先从 characterList 字段读取（对象数组），如果没有则从 characterIds 字段读取（ID数组）
     */
    /**
     * 获取镜头的角色列表（返回完整对象数组，包含 id, name, gender）
     * @param {Object} shot - 镜头对象
     * @returns {Array} - 角色对象数组 [{"id":"...","name":"...","gender":"..."}]
     */
    getShotCharacterIds(shot) {
        // 优先从 characterList 字段读取（新格式）
        if (shot.characterList) {
            const characterList = this.safeParseJSON(shot.characterList, []);
            if (Array.isArray(characterList) && characterList.length > 0) {
                // 返回完整的角色对象数组
                return characterList
                    .filter(char => char && char.id)
                    .map(char => ({
                        id: char.id,
                        name: char.name || 'Unknown',
                        gender: char.gender || null
                    }));
            }
        }

        // 兼容旧格式：从 characterIds 字段读取
        if (shot.characterIds) {
            const parsed = this.safeParseJSON(shot.characterIds, []);
            if (Array.isArray(parsed) && parsed.length > 0) {
                if (typeof parsed[0] === 'object' && parsed[0].id) {
                    // 对象数组格式，返回完整对象
                    return parsed
                        .filter(char => char && char.id)
                        .map(char => ({
                            id: char.id,
                            name: char.name || 'Unknown',
                            gender: char.gender || null
                        }));
                }
                // ID数组格式，返回只有id的对象数组
                return parsed
                    .filter(id => id)
                    .map(id => ({ id, name: 'Unknown', gender: null }));
            }
        }

        return [];
    }

    /**
     * 获取镜头的characterList数组（包含id、name、gender的对象数组）
     */
    getShotCharacterList(shot) {
        if (shot.characterList) {
            return this.safeParseJSON(shot.characterList, []);
        }
        // 如果没有 characterList，使用 getShotCharacterIds 返回的对象数组
        // getShotCharacterIds 现在返回的是包含 id, name, gender 的对象数组
        return this.getShotCharacterIds(shot);
    }

    /**
     * 格式化镜头数据
     */
    formatShot(shot) {
        const metadata = this.safeParseJSON(shot.metadata, {});
        return {
            id: shot.id,
            sceneId: shot.sceneId,
            actId: shot.actId,
            shotId: shot.shotId,
            duration: shot.duration,
            shotType: shot.shotType,
            framing: shot.framing,
            cameraAngle: shot.cameraAngle,
            cameraMovement: shot.cameraMovement,
            characterAction: shot.characterAction,
            action: shot.action,
            expression: shot.expression,
            dialogue: this.getShotDialogue(shot),
            voiceover: shot.voiceover,
            lighting: shot.lighting,
            atmosphere: shot.atmosphere,
            bgm: shot.bgm,
            fx: shot.fx,
            soundEffect: shot.soundEffect,
            isTransition: shot.isTransition,
            characterIds: this.getShotCharacterIds(shot).map(c => c.id),
            characterList: this.getShotCharacterList(shot),
            metadata,
            order: shot.order,
            videoUrl: shot.videoUrl || null,
            videoPath: shot.videoPath || null,
            createdAt: shot.createdAt,
            updatedAt: shot.updatedAt,
        };
    }

    /**
     * 2. 按剧幕依次生成镜头视频（顺序生成，支持并发）
     * @param {string} projectId - 项目ID
     * @param {string} novelId - 小说ID
     * @param {string} userId - 用户ID
     * @param {Object} options - 选项 { actIds = [], concurrency = 3, apiConfig = {}, allowOverwrite = false }
     * @returns {Promise<Object>} - 任务信息，包含按剧幕组织的任务列表
     */
    async generateShotsByActs(projectId, novelId, userId, options = {}) {
        const prisma = getPrisma();
        const { actIds = [], concurrency = 3, apiConfig = {}, allowOverwrite = false, storageMode = 'download_upload', featurePromptId = null } = options;

        try {
            // 验证项目和小说的权限
            const project = await prisma.project.findFirst({
                where: { id: projectId, userId },
            });
            if (!project) {
                throw new NotFoundError('Project not found');
            }

            const novel = await prisma.novel.findFirst({
                where: { id: novelId, projectId, userId },
            });
            if (!novel) {
                throw new NotFoundError('Novel not found');
            }

            // 构建查询条件：如果actIds为空，则查询所有剧幕；否则只查询指定的剧幕
            const actWhere = {
                novelId,
                projectId,
                userId,
                ...(actIds.length > 0 && { id: { in: actIds } }),
            };

            // 获取剧幕，按顺序
            const acts = await prisma.act.findMany({
                where: actWhere,
                include: {
                    scenes: {
                        include: {
                            scene: {
                                include: {
                                    shots: {
                                        orderBy: { order: 'asc' },
                                    },
                                },
                            },
                        },
                        orderBy: { order: 'asc' },
                    },
                    shots: {
                        orderBy: { order: 'asc' },
                    },
                },
                orderBy: [
                    { startChapterOrder: 'asc' },
                    { order: 'asc' },
                ],
            });

            // 收集所有需要生成的镜头，并按剧幕组织
            const shotsByAct = new Map(); // actId -> { act, shots: [] }
            const shotsToGenerate = [];
            // 收集所有角色ID用于批量查询
            const allCharacterIds = new Set();

            for (const act of acts) {
                const actShots = [];

                // 场景中的镜头
                for (const actScene of act.scenes) {
                    for (const shot of actScene.scene.shots) {
                        const hasVideo = this.getShotVideoUrl(shot);
                        if (allowOverwrite || !hasVideo) {
                            const shotData = { shot, act, scene: actScene.scene };
                            shotsToGenerate.push(shotData);
                            actShots.push(shotData);
                            // 收集角色ID
                            const characterList = this.getShotCharacterIds(shot);
                            characterList.forEach(char => allCharacterIds.add(char.id));
                        }
                    }
                }
                // 直接关联到Act的镜头
                for (const shot of act.shots) {
                    const hasVideo = this.getShotVideoUrl(shot);
                    if (allowOverwrite || !hasVideo) {
                        const shotData = { shot, act, scene: null };
                        shotsToGenerate.push(shotData);
                        actShots.push(shotData);
                        // 收集角色ID
                        const characterList = this.getShotCharacterIds(shot);
                        characterList.forEach(char => allCharacterIds.add(char.id));
                    }
                }

                if (actShots.length > 0) {
                    shotsByAct.set(act.id, { act, shots: actShots });
                }
            }

            // 批量查询所有角色（避免N+1查询）
            const charactersMap = new Map();
            if (allCharacterIds.size > 0) {
                const characters = await prisma.character.findMany({
                    where: { id: { in: Array.from(allCharacterIds) } },
                });
                characters.forEach(char => charactersMap.set(char.id, char));
            }

            // 获取项目配置和模型
            const projectWithKeys = await projectService.getProjectWithKeys(projectId, userId);
            let model = null;
            // 尝试获取配置的模型，如果不存在则降级到默认模型
            if (projectWithKeys.configVideoAI) {
                try {
                    model = await aiModelService.getModelById(projectWithKeys.configVideoAI);
                } catch (error) {
                    // 模型不存在，继续使用降级逻辑
                    logger.warn(`Configured video model ${projectWithKeys.configVideoAI} not found, using fallback`);
                }
            }
            // 如果模型不存在或类型不匹配，降级到第一个可用的视频模型
            if (!model || model.type !== 'video') {
                const models = await aiModelService.getModelsByType('video');
                if (models.length === 0) {
                    throw new AppError('No active video models found', 404);
                }
                model = models[0];
            }

            let apiKey = projectWithKeys.configVideoAIKey;
            if (!apiKey) {
                throw new AppError('Video AI API key is required', 400);
            }
            // 解密API密钥，若格式不合法则回退为原始值以便兼容明文配置
            try {
                apiKey = decrypt(apiKey);
            } catch (e) {
                logger.warn(`Decrypt project video AI key failed, fallback to raw value: ${e.message}`);
            }

            // 为每个镜头创建任务
            const taskMap = new Map(); // shotId -> taskId
            const actTaskMap = new Map(); // actId -> [taskId, ...]

            for (const { shot, act } of shotsToGenerate) {
                const task = await prisma.shotVideoTask.create({
                    data: {
                        shotId: shot.id,
                        actId: act.id,
                        projectId,
                        novelId,
                        userId,
                        modelId: model.id,
                        apiConfig: JSON.stringify(apiConfig),
                        status: 'pending',
                    },
                });

                taskMap.set(shot.id, task.id);

                if (!actTaskMap.has(act.id)) {
                    actTaskMap.set(act.id, []);
                }
                actTaskMap.get(act.id).push(task.id);
            }

            // 将镜头分组为批次（批次间并发，批次内顺序）
            const batches = [];
            for (let i = 0; i < shotsToGenerate.length; i += concurrency) {
                batches.push(shotsToGenerate.slice(i, i + concurrency));
            }

            // 异步执行生成任务（不等待完成）
            setImmediate(async () => {
                try {
                    // 批次间并发执行，每个批次内按顺序执行
                    const batchPromises = batches.map(async (batch) => {
                        const batchResults = [];
                        // 批次内按顺序执行
                        for (const { shot, act, scene } of batch) {
                            const taskId = taskMap.get(shot.id);
                            try {
                                // 更新任务状态为processing
                                await prisma.shotVideoTask.update({
                                    where: { id: taskId },
                                    data: { status: 'processing', startedAt: new Date() },
                                });

                                const result = await this.generateSingleShotVideo(
                                    shot, act, scene, model, apiKey, apiConfig, userId, charactersMap, taskId, storageMode, featurePromptId
                                );

                                // 更新任务状态为completed
                                await prisma.shotVideoTask.update({
                                    where: { id: taskId },
                                    data: {
                                        status: 'completed',
                                        progress: 100,
                                        videoUrl: result.videoUrl,
                                        videoPath: result.videoPath,
                                        completedAt: new Date(),
                                    },
                                });

                                batchResults.push({
                                    status: 'fulfilled',
                                    value: result,
                                });
                            } catch (error) {
                                // 更新任务状态为failed
                                await prisma.shotVideoTask.update({
                                    where: { id: taskId },
                                    data: {
                                        status: 'failed',
                                        errorMessage: error.message,
                                        completedAt: new Date(),
                                    },
                                });

                                batchResults.push({
                                    status: 'rejected',
                                    reason: error,
                                });
                            }
                        }
                        return batchResults;
                    });

                    // 等待所有批次完成
                    await Promise.all(batchPromises);
                } catch (error) {
                    logger.error('Background shot generation error:', error);
                }
            });

            // 按剧幕组织返回结果
            const actTasks = [];
            for (const [actId, { act }] of shotsByAct) {
                const taskIds = actTaskMap.get(actId) || [];
                actTasks.push({
                    actId: act.id,
                    actName: act.actName,
                    order: act.order,
                    startChapterOrder: act.startChapterOrder,
                    taskIds,
                });
            }

            // 按顺序排序
            actTasks.sort((a, b) => {
                if (a.startChapterOrder !== b.startChapterOrder) {
                    return a.startChapterOrder - b.startChapterOrder;
                }
                return a.order - b.order;
            });

            return {
                total: shotsToGenerate.length,
                acts: actTasks,
            };
        } catch (error) {
            if (error instanceof NotFoundError || error instanceof AppError) {
                throw error;
            }
            logger.error('Generate shots by acts error:', error);
            throw new AppError('Failed to generate shots by acts', 500);
        }
    }

    /**
     * 生成单个镜头视频
     * @param {string} taskId - 任务ID（可选，如果提供则会在生成过程中更新任务状态）
     */
    async generateSingleShotVideo(shot, act, scene, model, apiKey, apiConfig, userId, charactersMap = null, taskId = null, storageMode = 'download_upload', featurePromptId = null) {
        console.log('seeeeee', shot);

        const prisma = getPrisma();
        try {
            // 生成镜头视频（使用单独的方法，内部会处理提示词构建和功能提示词）
            const result = await this.generateShotVideo(shot, act, scene, model, apiKey, apiConfig, charactersMap, featurePromptId);

            // 上传到Catbox（参考角色视频生成的逻辑）
            const fileStorageService = require('./fileStorageService');
            let finalVideoUrl = result.videoUrl;
            let localVideoPath = result.filePath || null;

            // 根据storageMode选择上传方式
            if (result.videoUrl && (result.videoUrl.startsWith('http://') || result.videoUrl.startsWith('https://'))) {
                // 远程URL，需要先下载再上传
                if (storageMode === 'buffer_upload') {
                    try {
                        // 使用buffer_upload方式上传到Catbox
                        const storageResult = await fileStorageService.downloadBufferAndUpload(
                            result.videoUrl,
                            {
                                filename: `shot_${shot.id}_${Date.now()}.mp4`,
                                mimeType: 'video/mp4',
                            }
                        );
                        finalVideoUrl = storageResult.publicUrl;
                    } catch (err) {
                        logger.warn(`Catbox buffer_upload failed for shot ${shot.id}, fallback to download_upload: ${err.message}`);
                        // 回退到download_upload方式
                        try {
                            const storageResult = await fileStorageService.downloadAndUpload(
                                result.videoUrl,
                                `shots/${shot.id}`,
                                {
                                    filename: `shot_${shot.id}_${Date.now()}.mp4`,
                                    uploadToHosting: true,
                                    hostingProvider: 'catbox',
                                }
                            );
                            finalVideoUrl = storageResult.publicUrl;
                            localVideoPath = storageResult.localPath;
                        } catch (fallbackErr) {
                            logger.error(`Failed to upload shot video to Catbox: ${fallbackErr.message}`);
                            finalVideoUrl = result.videoUrl;
                        }
                    }
                } else {
                    // 使用download_upload方式
                    try {
                        const storageResult = await fileStorageService.downloadAndUpload(
                            result.videoUrl,
                            `shots/${shot.id}`,
                            {
                                filename: `shot_${shot.id}_${Date.now()}.mp4`,
                                uploadToHosting: true,
                                hostingProvider: 'catbox',
                            }
                        );
                        finalVideoUrl = storageResult.publicUrl;
                        localVideoPath = storageResult.localPath;
                    } catch (err) {
                        logger.error(`Failed to upload shot video to Catbox: ${err.message}`);
                        finalVideoUrl = result.videoUrl;
                    }
                }
            } else if (result.filePath) {
                // 本地文件，直接上传到Catbox
                try {
                    finalVideoUrl = await fileStorageService.uploadToCatbox(
                        result.filePath,
                        {
                            filename: `shot_${shot.id}_${Date.now()}.mp4`,
                            mimeType: 'video/mp4',
                        }
                    );
                    localVideoPath = result.filePath;
                } catch (err) {
                    logger.error(`Failed to upload local video to Catbox: ${err.message}`);
                    localVideoPath = result.filePath;
                }
            }

            // 更新镜头记录（使用新的videoUrl和videoPath字段）
            const existingMetadata = this.safeParseJSON(shot.metadata, {});
            await prisma.shot.update({
                where: { id: shot.id },
                data: {
                    videoUrl: finalVideoUrl,
                    videoPath: localVideoPath,
                    metadata: JSON.stringify({
                        ...existingMetadata,
                        videoGeneration: {
                            provider: model.provider.name,
                            model: model.name,
                            generatedAt: new Date().toISOString(),
                        },
                    }),
                },
            });

            return { shotId: shot.id, videoUrl: finalVideoUrl, videoPath: localVideoPath };
        } catch (error) {
            logger.error(`Generate shot video error for shot ${shot.id}:`, error);
            throw error;
        }
    }

    /**
     * 工具函数：安全取值
     * @param {any} obj - 对象
     * @param {string} path - 路径，如 'scene.address' 或 'shot.action'
     * @returns {any} - 值
     */
    getValue(obj, path) {
        return path.split('.').reduce((acc, key) => acc?.[key], obj);
    }

    /**
     * 模板循环渲染 {{#list}}...{{/list}}
     * @param {string} template - 模板字符串
     * @param {any} data - 数据对象
     * @returns {string} - 渲染后的字符串
     */
    renderEach(template, data) {
        const eachRegex = /{{#(\w+)}}([\s\S]*?){{\/\1}}/g;
        return template.replace(eachRegex, (_, key, block) => {
            const list = data[key];
            if (!Array.isArray(list)) return '';
            return list.map(item => {
                return block.replace(/{{(\w+)}}/g, (_, k) => item[k] ?? '');
            }).join('');
        });
    }

    /**
     * 条件渲染 {{#if condition}}...{{/if}}
     * @param {string} template - 模板字符串
     * @param {any} data - 数据对象
     * @returns {string} - 渲染后的字符串
     */
    renderIf(template, data) {
        const ifRegex = /{{#if ([\w.]+)}}([\s\S]*?){{\/if}}/g;
        return template.replace(ifRegex, (_, path, content) => {
            return this.getValue(data, path) ? content : '';
        });
    }

    /**
     * 普通变量渲染 {{xxx}}
     * @param {string} template - 模板字符串
     * @param {any} data - 数据对象
     * @returns {string} - 渲染后的字符串
     */
    renderVars(template, data) {
        return template.replace(/{{([\w.]+)}}/g, (_, path) => {
            const value = this.getValue(data, path);
            return value !== undefined && value !== null ? String(value) : '';
        });
    }

    /**
     * 构建视频生成提示词（使用系统提示词模板）
     * @param {Object} shot - 镜头对象
     * @param {string} systemPromptTemplate - 系统提示词模板
     * @param {Object} scene - 场景对象（可选）
     * @returns {string} - 渲染后的提示词
     */
    buildVideoPrompt(shot, systemPromptTemplate, scene = null, characterList = null) {
        // 1. 解析角色列表（如果传入了去重的角色列表，则使用它；否则从shot中解析）
        let characters;
        if (characterList && Array.isArray(characterList) && characterList.length > 0) {
            // 使用传入的去重角色列表
            characters = characterList;
        } else {
            // 从shot中解析角色列表
            const shotCharacterList = this.getShotCharacterList(shot);
            characters = shotCharacterList.map((c, i) => ({
                ...c,
                index: i + 1
            }));
        }

        // 2. 构建角色名到索引的映射
        const nameToIndex = {};
        characters.forEach(c => {
            if (c.name) {
                nameToIndex[c.name] = c.index;
            }
        });

        // 3. 处理对话（dialogue），并添加对话约束
        let dialogue = [];
        try {
            const dialogueData = this.getShotDialogue(shot);
            if (Array.isArray(dialogueData)) {
                dialogue = dialogueData.map(d => {
                    const characterIndex = d.name ? (nameToIndex[d.name] || 0) : 0;
                    const speaker = characterIndex > 0 ? `@character${characterIndex}` : (d.name || 'Unknown');
                    const dialogueType = d.type || 'talk'; // 默认是正常对话

                    // 生成对话约束
                    const constraints = this.generateDialogueConstraints(dialogueType, speaker);

                    // 将约束紧贴在对话内容后面（修改say字段，确保约束紧贴对话）
                    const sayWithConstraints = d.say
                        ? `${d.say}\n\n${constraints}`
                        : d.say;

                    return {
                        ...d,
                        say: sayWithConstraints, // 替换say字段，包含约束
                        characterIndex,
                        constraints, // 保留原始约束文本（供其他用途）
                        speaker // 说话者标识
                    };
                });
            }
        } catch (error) {
            logger.warn('Failed to parse dialogue:', error.message);
        }

        // 4. 文本中人物名替换为 @characterX
        const replaceNames = (text) => {
            if (!text || typeof text !== 'string') return '';
            let result = text;
            Object.entries(nameToIndex).forEach(([name, idx]) => {
                // 使用正则表达式进行全局替换，避免部分匹配
                const regex = new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
                result = result.replace(regex, `@character${idx}`);
            });
            return result;
        };

        // 5. 构建模板数据上下文
        const context = {
            scene: scene || {},
            shot: {
                ...shot,
                shotType: shot.shotType || '',
                framing: shot.framing || null,
                cameraMovement: replaceNames(shot.cameraMovement || ''),
                cameraAngle: shot.cameraAngle || 'eye-level',
                duration: shot.duration || 3,
                action: replaceNames(shot.action || shot.characterAction || ''),
                expression: replaceNames(shot.expression || ''),
                lighting: shot.lighting || 'natural lighting',
                atmosphere: shot.atmosphere || 'calm and serious',
                bgm: shot.bgm || 'subtle narrative background music',
                fx: shot.fx || shot.soundEffect || 'none'
            },
            characters,
            dialogue
        };

        // 6. 按顺序渲染模板
        let result = systemPromptTemplate;
        result = this.renderEach(result, context);
        result = this.renderIf(result, context);
        result = this.renderVars(result, context);

        return result.trim();
    }

    /**
     * 生成对话约束（根据对话类型）
     * @param {string} type - 对话类型：'talk'（正常对话）、'voiceover'（画外音）、'soliloquy'（内心独白）
     * @param {string} speaker - 说话者标识，如 '@character1'
     * @returns {string} - 约束文本
     */
    // generateDialogueConstraints(type, speaker) {
    //     const normalizedType = (type || 'talk').toLowerCase();

    //     switch (normalizedType) {

    //         case 'talk':
    //             // 正常对白（嘴动 + 出声，镜头锁定）
    //             return `Dialogue Constraints:
    // - Only ${speaker} speaks in this shot.
    // - All other characters remain completely silent.
    // - The voice clearly originates from ${speaker}.
    // - Visible and natural mouth movement from ${speaker}.
    // - Lip-sync is clear and readable (animation-accurate, not exaggerated).
    // - No other character moves their lips or speaks.
    // - Camera remains locked during the dialogue.
    // - ${speaker}'s face is clearly visible before speaking begins.`;

    //         case 'voiceover':
    //             // 画外音 / 旁白（纯声音）
    //             return `Dialogue Constraints:
    // - This is a voiceover narration.
    // - The voice does not originate from any on-screen character.
    // - No character speaks or moves their lips.
    // - No lip-sync animation is present.
    // - On-screen characters do not react to the voice.
    // - The narration is detached from character performance.`;

    //         case 'soliloquy':
    //             // 内心独白（有声音，无嘴型）
    //             return `Dialogue Constraints:
    // - This is an internal monologue.
    // - The voice represents ${speaker}'s thoughts and is not spoken aloud.
    // - ${speaker}'s mouth remains still (no visible speech).
    // - No other character can hear or react to this voice.
    // - Acting is conveyed through subtle facial expression and eye movement only.
    // - No lip-sync animation is present.`;

    //         default:
    //             return `Dialogue Constraints:
    // - Only ${speaker} speaks in this shot.
    // - All other characters remain completely silent.
    // - The voice clearly originates from ${speaker}.
    // - Visible and natural mouth movement from ${speaker}.
    // - No other character moves their lips or speaks.`;
    //     }
    // }
    generateDialogueConstraints(type, speaker) {
        const normalizedType = (type || 'talk').toLowerCase();

        switch (normalizedType) {

            case 'talk':
                return `Dialogue:
    - ${speaker} speaks.
    - The voice is associated with the on-screen focus character.`;

            case 'soliloquy':
                return `Dialogue:
    - Internal thoughts of ${speaker}.
    - Not spoken aloud.
    - The thoughts belong to the current on-screen focus character.`;

            case 'voiceover':
                return `Dialogue:
    - Voiceover narration.
    - Not associated with any on-screen character.`;

            default:
                return `Dialogue:
    - ${speaker} speaks.`;
        }
    }


    /**
     * 构建合并镜头视频提示词（带功能提示词）
     * 格式：功能提示词 + 场景信息 + shot1系统提示词 + shot2系统提示词 + ...
     * @param {Array<Object>} shots - 镜头对象数组
     * @param {number} targetDuration - 目标时长（秒）
     * @param {string} systemPromptTemplate - 系统提示词模板
     * @param {string} featurePrompt - 功能提示词
     * @param {Object} scene - 场景对象（可选）
     * @param {Object} act - 剧幕对象（可选）
     * @returns {string} - 渲染后的提示词
     */
    buildMergedVideoPromptWithFeaturePrompt(shots, targetDuration, systemPromptTemplate, featurePrompt, scene = null, act = null) {
        if (!shots || shots.length === 0) {
            throw new AppError('Shots array is required and cannot be empty', 400);
        }

        // 使用第一个镜头的场景和剧幕（如果未提供）
        const firstShot = shots[0];
        const finalScene = scene || firstShot.scene || {};
        const finalAct = act || firstShot.act || {};

        // 1. 收集所有镜头的角色，按名字去重合并
        const characterMap = new Map(); // name -> character object
        shots.forEach(shot => {
            const characterList = this.getShotCharacterList(shot);
            characterList.forEach(char => {
                const name = char.name;
                if (name && !characterMap.has(name)) {
                    characterMap.set(name, char);
                }
            });
        });
        // 转换为数组并添加索引
        const mergedCharacterList = Array.from(characterMap.values()).map((c, i) => ({
            ...c,
            index: i + 1
        }));

        // 2. 提取场景信息（从所有镜头中提取，优先使用第一个镜头的场景）
        // 由于合并的镜头应该有相同的 sceneId，所以使用第一个镜头的场景是合理的
        const sceneInfo = [];
        if (finalScene && finalScene.address) {
            sceneInfo.push(`Scene Location: ${finalScene.address}`);
        }
        if (finalScene && finalScene.sceneDescription) {
            sceneInfo.push(`Scene Description: ${finalScene.sceneDescription}`);
        }
        const sceneInfoText = sceneInfo.length > 0 ? sceneInfo.join('\n') + '\n\n' : '';

        // 3. 为每个镜头单独渲染系统提示词（每个镜头使用自己的场景信息，但使用统一的去重角色列表）
        const shotPrompts = [];
        shots.forEach((shot, index) => {
            // 每个镜头使用自己的场景，如果没有则使用合并场景
            const shotScene = shot.scene || finalScene;
            const shotPrompt = this.buildVideoPrompt(shot, systemPromptTemplate, shotScene, mergedCharacterList);
            shotPrompts.push(`--- Shot ${index + 1} ---\n${shotPrompt}`);
        });

        // 4. 组合：功能提示词 + 场景信息（最上面） + 各镜头的系统提示词
        const combinedPrompt = `${featurePrompt}\n\n${sceneInfoText}${shotPrompts.join('\n\n')}`;

        return combinedPrompt.trim();
    }

    /**
     * 构建合并镜头视频提示词（按人物名合并角色数组）
     * @param {Array<Object>} shots - 镜头对象数组
     * @param {number} targetDuration - 目标时长（秒）
     * @param {string} systemPromptTemplate - 系统提示词模板
     * @param {Object} scene - 场景对象（可选，使用第一个镜头的场景）
     * @param {Object} act - 剧幕对象（可选，使用第一个镜头的剧幕）
     * @returns {string} - 渲染后的提示词
     */
    buildMergedVideoPrompt(shots, targetDuration, systemPromptTemplate, scene = null, act = null) {
        if (!shots || shots.length === 0) {
            throw new AppError('Shots array is required and cannot be empty', 400);
        }

        // 使用第一个镜头的场景和剧幕（如果未提供）
        const firstShot = shots[0];
        const finalScene = scene || firstShot.scene;
        const finalAct = act || firstShot.act;

        // 1. 收集所有镜头的角色，按人物名去重合并
        const characterMap = new Map(); // name -> character object
        const characterIndexMap = new Map(); // name -> index (1-based)

        shots.forEach(shot => {
            const characterList = this.getShotCharacterList(shot);
            characterList.forEach(char => {
                const name = char.name;
                if (name && !characterMap.has(name)) {
                    const index = characterMap.size + 1;
                    characterMap.set(name, {
                        ...char,
                        index: index
                    });
                    characterIndexMap.set(name, index);
                }
            });
        });

        // 转换为数组
        const characters = Array.from(characterMap.values());

        // 2. 构建角色名到索引的映射
        const nameToIndex = {};
        characters.forEach(c => {
            if (c.name) {
                nameToIndex[c.name] = c.index;
            }
        });

        // 3. 合并所有镜头的对话
        const allDialogue = [];
        shots.forEach((shot, shotIndex) => {
            try {
                const dialogueData = this.getShotDialogue(shot);
                if (Array.isArray(dialogueData)) {
                    dialogueData.forEach(d => {
                        allDialogue.push({
                            ...d,
                            characterIndex: d.name ? (nameToIndex[d.name] || 0) : 0,
                            shotIndex: shotIndex + 1, // 镜头序号（1-based）
                            shotOrder: shot.order || shot.shotId || shotIndex + 1
                        });
                    });
                }
            } catch (error) {
                logger.warn(`Failed to parse dialogue for shot ${shot.id}:`, error.message);
            }
        });

        // 4. 文本中人物名替换为 @characterX
        const replaceNames = (text) => {
            if (!text || typeof text !== 'string') return '';
            let result = text;
            Object.entries(nameToIndex).forEach(([name, idx]) => {
                // 使用正则表达式进行全局替换，避免部分匹配
                const regex = new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
                result = result.replace(regex, `@character${idx}`);
            });
            return result;
        };

        // 5. 合并所有镜头的描述信息
        const shotDescriptions = shots.map((shot, index) => {
            const shotNum = index + 1;
            const parts = [];

            if (shot.shotType) parts.push(`镜头类型：${shot.shotType}`);
            if (shot.framing) parts.push(`景别：${shot.framing}`);
            if (shot.cameraAngle) parts.push(`机位角度：${shot.cameraAngle}`);
            if (shot.cameraMovement) parts.push(`镜头运动：${replaceNames(shot.cameraMovement || '')}`);
            if (shot.action) parts.push(`人物动作：${replaceNames(shot.action || '')}`);
            if (shot.expression) parts.push(`表情：${replaceNames(shot.expression || '')}`);
            if (shot.lighting) parts.push(`光线：${shot.lighting}`);
            if (shot.atmosphere) parts.push(`氛围：${shot.atmosphere}`);
            if (shot.soundEffect) parts.push(`音效：${shot.soundEffect}`);

            const duration = shot.duration || 3;
            parts.push(`时长：${duration}秒`);

            return `镜头${shotNum}：${parts.join('，')}`;
        });

        // 6. 构建模板数据上下文
        const context = {
            scene: finalScene || {},
            act: finalAct || {},
            shots: shots.map(shot => ({
                ...shot,
                shotType: shot.shotType || '',
                framing: shot.framing || null,
                cameraMovement: replaceNames(shot.cameraMovement || ''),
                cameraAngle: shot.cameraAngle || 'eye-level',
                duration: shot.duration || 3,
                action: replaceNames(shot.action || shot.characterAction || ''),
                expression: replaceNames(shot.expression || ''),
                lighting: shot.lighting || 'natural lighting',
                atmosphere: shot.atmosphere || 'calm and serious',
                bgm: shot.bgm || 'subtle narrative background music',
                fx: shot.fx || shot.soundEffect || 'none'
            })),
            shotDescriptions: shotDescriptions.join('\n'),
            characters,
            dialogue: allDialogue,
            targetDuration: targetDuration,
            totalShots: shots.length
        };

        // 7. 按顺序渲染模板
        let result = systemPromptTemplate;
        result = this.renderEach(result, context);
        result = this.renderIf(result, context);
        result = this.renderVars(result, context);

        return result.trim();
    }

    /**
     * 构建镜头视频提示词（旧方法，保留用于向后兼容）
     * @deprecated 使用 buildVideoPrompt 替代
     */
    buildShotVideoPrompt(shot, act, scene) {
        const parts = [];
        if (scene && scene.sceneDescription) {
            parts.push(`场景：${scene.sceneDescription}`);
        }
        if (shot.characterAction) {
            parts.push(`角色动作：${shot.characterAction}`);
        }
        if (shot.action) {
            parts.push(`人物动作：${shot.action}`);
        }
        if (shot.cameraAngle) {
            parts.push(`机位角度：${shot.cameraAngle}`);
        }
        if (shot.cameraMovement) {
            parts.push(`镜头运动：${shot.cameraMovement}`);
        }
        if (shot.framing) {
            parts.push(`景别：${shot.framing}`);
        }
        if (shot.lighting) {
            parts.push(`光线：${shot.lighting}`);
        }
        if (shot.atmosphere) {
            parts.push(`氛围：${shot.atmosphere}`);
        }
        if (shot.soundEffect) {
            parts.push(`音效：${shot.soundEffect}`);
        }
        return parts.join('，');
    }

    /**
     * 生成镜头视频（独立方法）
     * @param {Object} shot - 镜头对象
     * @param {Object} act - 剧幕对象
     * @param {Object} scene - 场景对象（可选）
     * @param {Object} model - AI模型配置
     * @param {string} apiKey - API密钥
     * @param {Object} apiConfig - 自定义API参数
     * @param {Map} charactersMap - 角色Map（用于快速查找）
     * @returns {Promise<Object>} - { videoUrl, filePath }
     */
    async generateShotVideo(shot, act, scene, model, apiKey, apiConfig, charactersMap = null, featurePromptId = null) {
        const prisma = getPrisma();
        const imageGenerationService = require('./imageGenerationService');

        try {
            // 获取系统提示词模板
            const systemPromptConfig = await systemPromptService.getSystemPromptByFunctionKey('shot_video_generation');
            if (!systemPromptConfig || !systemPromptConfig.prompt) {
                // 如果系统提示词不存在，使用旧方法作为降级方案
                logger.warn('System prompt for shot_video_generation not found, using legacy method');
                const legacyPrompt = this.buildShotVideoPrompt(shot, act, scene);
                return await this._generateVideoWithPrompt(shot, act, scene, model, apiKey, apiConfig, charactersMap, legacyPrompt, featurePromptId);
            }

            // 使用新的 buildVideoPrompt 方法构建提示词
            let systemPromptTemplate = systemPromptConfig.prompt;
            let prompt;
            let referenceVideoUrls = [];

            if (featurePromptId) {
                // 使用功能提示词
                try {
                    const featurePrompt = await systemPromptService.getFeaturePromptById(featurePromptId);

                    if (featurePrompt && featurePrompt.prompt) {
                        // 组合功能提示词和系统提示词模板
                        // 功能提示词在前，系统提示词模板在后
                        const combinedTemplate = `${featurePrompt.prompt}\n\n${systemPromptTemplate}`;

                        // 使用 buildVideoPrompt 渲染模板
                        prompt = this.buildVideoPrompt(shot, combinedTemplate, scene);
                        // 处理参考链接（如果有）
                        if (featurePrompt.referenceLinks) {
                            try {
                                if (Array.isArray(featurePrompt.referenceLinks)) {
                                    referenceVideoUrls = featurePrompt.referenceLinks.filter(url =>
                                        url && (url.endsWith('.mp4') || url.endsWith('.mov') || url.endsWith('.avi'))
                                    );
                                } else if (typeof featurePrompt.referenceLinks === 'string') {
                                    const parsed = JSON.parse(featurePrompt.referenceLinks);
                                    if (Array.isArray(parsed)) {
                                        referenceVideoUrls = parsed.filter(url =>
                                            url && (url.endsWith('.mp4') || url.endsWith('.mov') || url.endsWith('.avi'))
                                        );
                                    }
                                }
                            } catch (e) {
                                logger.warn(`Parse referenceLinks failed: ${e.message}`);
                            }
                        }
                    } else {
                        // 功能提示词不存在或无效，使用系统提示词模板
                        logger.warn(`Feature prompt with id ${featurePromptId} not found or invalid, using system prompt only`);
                        prompt = this.buildVideoPrompt(shot, systemPromptTemplate, scene);
                    }
                } catch (error) {
                    // 如果获取功能提示词失败（如 NotFoundError），记录警告并使用系统提示词模板
                    if (error.name === 'NotFoundError' || error.statusCode === 404) {
                        logger.warn(`Feature prompt with id ${featurePromptId} not found, using system prompt only: ${error.message}`);
                        prompt = this.buildVideoPrompt(shot, systemPromptTemplate, scene);
                    } else {
                        // 其他错误，重新抛出
                        throw error;
                    }
                }
            } else {
                // 只使用系统提示词模板
                prompt = this.buildVideoPrompt(shot, systemPromptTemplate, scene);
            }

            // 获取镜头关联的角色列表（包含 id, name, gender），并获取角色的远程视频URL作为参考
            const characterList = this.getShotCharacterIds(shot);
            const characterVideoUrls = [];

            if (characterList.length > 0) {
                for (const charInfo of characterList) {
                    const { id: characterId, name, gender } = charInfo;
                    let character = null;

                    // 先尝试从 charactersMap 中获取
                    if (charactersMap && charactersMap.has(characterId)) {
                        character = charactersMap.get(characterId);
                    } else {
                        // 如果charactersMap中没有，先通过ID查询数据库
                        character = await prisma.character.findFirst({
                            where: { id: characterId },
                            select: { id: true, name: true, videoUrl: true, gender: true }
                        });

                        // 如果通过ID查询失败，且提供了name和gender，则通过name和gender查询
                        if (!character && name && name !== 'Unknown' && gender) {
                            character = await prisma.character.findFirst({
                                where: {
                                    name: name,
                                    gender: gender,
                                    projectId: shot.projectId || undefined
                                },
                                select: { id: true, name: true, videoUrl: true, gender: true }
                            });

                            if (character) {
                                logger.info(`Character found by name and gender instead of ID: ${characterId} -> ${character.id} (${name})`);
                            }
                        }
                    }

                    // 获取角色的远程视频URL（videoUrl字段）
                    if (character && character.videoUrl) {
                        characterVideoUrls.push(character.videoUrl);
                    }
                }
            }

            // 如果没有角色或角色没有视频URL，且没有功能提示词的参考视频，抛出错误
            if (characterList.length > 0 && characterVideoUrls.length === 0) {
                // 获取需要生成视频的角色信息
                const missingCharacterInfo = [];
                for (const charInfo of characterList) {
                    const { id: characterId, name, gender } = charInfo;
                    let character = null;

                    // 先尝试从 charactersMap 中获取
                    if (charactersMap && charactersMap.has(characterId)) {
                        character = charactersMap.get(characterId);
                    } else {
                        // 如果charactersMap中没有，先通过ID查询数据库
                        try {
                            character = await prisma.character.findFirst({
                                where: { id: characterId },
                                select: { id: true, name: true, videoUrl: true, gender: true }
                            });

                            // 如果通过ID查询失败，且提供了name和gender，则通过name和gender查询
                            if (!character && name && name !== 'Unknown' && gender) {
                                character = await prisma.character.findFirst({
                                    where: {
                                        name: name,
                                        gender: gender,
                                        projectId: shot.projectId || undefined
                                    },
                                    select: { id: true, name: true, videoUrl: true, gender: true }
                                });

                                if (character) {
                                    logger.info(`Character found by name and gender instead of ID: ${characterId} -> ${character.id} (${name})`);
                                }
                            }
                        } catch (err) {
                            logger.warn(`Failed to query character ${characterId}:`, err.message);
                        }
                    }

                    // 即使角色不存在，也添加到列表中，让前端知道是哪个角色缺少视频
                    if (character) {
                        missingCharacterInfo.push({
                            id: character.id,
                            name: character.name || name || 'Unknown',
                            hasVideo: !!character.videoUrl
                        });
                    } else {
                        // 角色不存在或查询失败，仍然添加到列表中
                        missingCharacterInfo.push({
                            id: characterId,
                            name: name || 'Unknown (not found)',
                            hasVideo: false
                        });
                    }
                }

                const errorData = {
                    shotId: shot.id,
                    shotOrder: shot.order || shot.shotId,
                    message: 'Some characters associated with this shot do not have video URLs. Please generate character videos first.',
                    characters: missingCharacterInfo,
                    characterIds: characterList.map(c => c.id),
                    characterVideoUrls: characterVideoUrls,
                    totalCharacters: characterList.length,
                    charactersWithVideo: characterVideoUrls.length,
                    charactersWithoutVideo: characterList.length - characterVideoUrls.length
                };

                const error = new AppError(
                    `Character videos for the shot's characters are not found. Please generate character videos first.`,
                    400
                );
                error.errors = errorData;
                throw error;
            }

            // 构建模型配置
            const modelConfig = {
                modelId: model.id,
                modelName: model.name,
                provider: model.provider,
                baseUrl: model.baseUrl,
                apiKey,
            };

            // 构建视频生成选项
            const videoOptions = {
                duration: shot.duration || 5,
                prompt,
                ...apiConfig,
            };

            // 根据提供商调用不同的视频生成API
            // 注意：characterVideoUrls 和 referenceVideoUrls 分开传递，在 API 内部合并
            const providerName = model.provider?.name || 'unknown';
            let result;

            switch (providerName.toLowerCase()) {
                case 'openai':
                    // OpenAI Sora 使用 referenceImageUrls 参数（虽然名字是Image，但可能支持视频URL）
                    result = await imageGenerationService.callOpenAISora(
                        model.baseUrl,
                        apiKey,
                        prompt,
                        model.name,
                        characterVideoUrls, // 角色视频URL
                        videoOptions,
                        referenceVideoUrls // 功能提示词的参考视频URL
                    );
                    break;
                case 'grsai':
                    // Grsai 使用 urls 参数，支持视频URL
                    result = await imageGenerationService.callGrsaiVideo(
                        model.baseUrl,
                        apiKey,
                        prompt,
                        model.name,
                        [], // 功能提示词的参考视频URL
                        videoOptions,
                        characterVideoUrls // 角色视频URL
                    );
                    break;
                case 'runway':
                    result = await imageGenerationService.callRunway(
                        model.baseUrl,
                        apiKey,
                        prompt,
                        model.name,
                        characterVideoUrls, // 角色视频URL
                        videoOptions,
                        referenceVideoUrls // 功能提示词的参考视频URL
                    );
                    break;
                case 'pika':
                    result = await imageGenerationService.callPika(
                        model.baseUrl,
                        apiKey,
                        prompt,
                        model.name,
                        characterVideoUrls, // 角色视频URL
                        videoOptions,
                        referenceVideoUrls // 功能提示词的参考视频URL
                    );
                    break;
                default:
                    throw new AppError(`Unsupported video generation provider: ${providerName}`, 400);
            }

            // 处理返回的视频：如果是远端URL则直接返回，否则落盘保存
            const targetFileId = `shot_${shot.id}`;
            let videoUrl = result.videoUrl;
            let filePath = null;

            if (videoUrl && /^https?:\/\//i.test(videoUrl)) {
                // 远端URL，直接返回（后续会在generateSingleShotVideo中上传到Catbox）
                filePath = null;
            } else {
                // base64 或本地路径，需要落盘
                const savedFile = await imageGenerationService.saveVideoFile(
                    result.videoUrl || result.videoData,
                    targetFileId
                );
                videoUrl = savedFile.url;
                filePath = savedFile.path;
            }

            return {
                videoUrl,
                filePath,
                metadata: {
                    duration: shot.duration || 5,
                    provider: providerName,
                    model: model.name,
                    referenceVideoUrls,
                },
            };
        } catch (error) {
            logger.error(`Generate shot video error for shot ${shot.id}:`, error);
            throw error;
        }
    }

    /**
     * 生成合并镜头视频（多个镜头合并为一个视频）
     * @param {Array<Object>} shots - 镜头对象数组
     * @param {number} targetDuration - 目标时长（秒）
     * @param {Object} model - AI模型配置
     * @param {string} apiKey - API密钥
     * @param {Object} apiConfig - 自定义API参数
     * @param {string} userId - 用户ID
     * @param {Map} charactersMap - 角色Map（用于快速查找）
     * @param {string} taskId - 任务ID（可选）
     * @param {string} storageMode - 存储模式
     * @param {string} featurePromptId - 功能提示词ID（可选）
     * @returns {Promise<Object>} - { videoUrl, filePath }
     */
    async generateMergedShotVideo(shots, targetDuration, model, apiKey, apiConfig, userId, charactersMap = null, taskId = null, storageMode = 'download_upload', featurePromptId = null) {
        const prisma = getPrisma();
        const imageGenerationService = require('./imageGenerationService');

        try {
            if (!shots || shots.length === 0) {
                throw new AppError('Shots array is required and cannot be empty', 400);
            }

            const firstShot = shots[0];
            const scene = firstShot.scene;
            const act = firstShot.act;

            // 获取系统提示词模板
            const systemPromptConfig = await systemPromptService.getSystemPromptByFunctionKey('shot_video_generation');
            if (!systemPromptConfig || !systemPromptConfig.prompt) {
                throw new AppError('System prompt for shot_video_generation not found', 404);
            }

            // 使用合并提示词构建方法
            let systemPromptTemplate = systemPromptConfig.prompt;
            let prompt;
            let referenceVideoUrls = [];

            if (featurePromptId) {
                // 使用功能提示词
                try {
                    const featurePrompt = await systemPromptService.getFeaturePromptById(featurePromptId);

                    if (featurePrompt && featurePrompt.prompt) {
                        // 为每个镜头单独渲染系统提示词，然后拼接
                        prompt = this.buildMergedVideoPromptWithFeaturePrompt(
                            shots,
                            targetDuration,
                            systemPromptTemplate,
                            featurePrompt.prompt,
                            scene,
                            act
                        );
                        // 处理参考链接（如果有）
                        if (featurePrompt.referenceLinks) {
                            try {
                                if (Array.isArray(featurePrompt.referenceLinks)) {
                                    referenceVideoUrls = featurePrompt.referenceLinks.filter(url =>
                                        url && (url.endsWith('.mp4') || url.endsWith('.mov') || url.endsWith('.avi'))
                                    );
                                } else if (typeof featurePrompt.referenceLinks === 'string') {
                                    const parsed = JSON.parse(featurePrompt.referenceLinks);
                                    if (Array.isArray(parsed)) {
                                        referenceVideoUrls = parsed.filter(url =>
                                            url && (url.endsWith('.mp4') || url.endsWith('.mov') || url.endsWith('.avi'))
                                        );
                                    }
                                }
                            } catch (e) {
                                logger.warn(`Parse referenceLinks failed: ${e.message}`);
                            }
                        }
                    } else {
                        logger.warn(`Feature prompt with id ${featurePromptId} not found or invalid, using system prompt only`);
                        prompt = this.buildMergedVideoPrompt(shots, targetDuration, systemPromptTemplate, scene, act);
                    }
                } catch (error) {
                    if (error.name === 'NotFoundError' || error.statusCode === 404) {
                        logger.warn(`Feature prompt with id ${featurePromptId} not found, using system prompt only: ${error.message}`);
                        prompt = this.buildMergedVideoPrompt(shots, targetDuration, systemPromptTemplate, scene, act);
                    } else {
                        throw error;
                    }
                }
            } else {
                // 只使用系统提示词模板
                prompt = this.buildMergedVideoPrompt(shots, targetDuration, systemPromptTemplate, scene, act);
            }

            // 收集所有镜头的角色视频URL（去重）
            const characterVideoUrls = [];
            const allCharacterIds = new Set();

            shots.forEach(shot => {
                const characterList = this.getShotCharacterIds(shot);
                characterList.forEach(char => allCharacterIds.add(char.id));
            });

            // 获取所有角色的视频URL
            for (const shot of shots) {
                const characterList = this.getShotCharacterIds(shot);
                for (const charInfo of characterList) {
                    const { id: characterId, name, gender } = charInfo;
                    let character = null;

                    // 先尝试从 charactersMap 中获取
                    if (charactersMap && charactersMap.has(characterId)) {
                        character = charactersMap.get(characterId);
                    } else {
                        // 如果charactersMap中没有，先通过ID查询数据库
                        character = await prisma.character.findFirst({
                            where: { id: characterId },
                            select: { id: true, name: true, videoUrl: true, gender: true }
                        });

                        // 如果通过ID查询失败，且提供了name和gender，则通过name和gender查询
                        if (!character && name && name !== 'Unknown' && gender) {
                            character = await prisma.character.findFirst({
                                where: {
                                    name: name,
                                    gender: gender,
                                    projectId: firstShot.projectId || undefined
                                },
                                select: { id: true, name: true, videoUrl: true, gender: true }
                            });

                            if (character) {
                                logger.info(`Character found by name and gender instead of ID: ${characterId} -> ${character.id} (${name})`);
                            }
                        }
                    }

                    // 获取角色的远程视频URL（去重）
                    if (character && character.videoUrl && !characterVideoUrls.includes(character.videoUrl)) {
                        characterVideoUrls.push(character.videoUrl);
                    }
                }
            }

            // 验证角色视频URL（至少有一个镜头有角色时）
            if (allCharacterIds.size > 0 && characterVideoUrls.length === 0) {
                const missingCharacterInfo = [];
                for (const shot of shots) {
                    const characterList = this.getShotCharacterIds(shot);
                    for (const charInfo of characterList) {
                        const { id: characterId, name, gender } = charInfo;
                        let character = null;

                        if (charactersMap && charactersMap.has(characterId)) {
                            character = charactersMap.get(characterId);
                        } else {
                            try {
                                character = await prisma.character.findFirst({
                                    where: { id: characterId },
                                    select: { id: true, name: true, videoUrl: true, gender: true }
                                });

                                if (!character && name && name !== 'Unknown' && gender) {
                                    character = await prisma.character.findFirst({
                                        where: {
                                            name: name,
                                            gender: gender,
                                            projectId: firstShot.projectId || undefined
                                        },
                                        select: { id: true, name: true, videoUrl: true, gender: true }
                                    });
                                }
                            } catch (err) {
                                logger.warn(`Failed to query character ${characterId}:`, err.message);
                            }
                        }

                        if (character) {
                            missingCharacterInfo.push({
                                id: character.id,
                                name: character.name || name || 'Unknown',
                                hasVideo: !!character.videoUrl
                            });
                        } else {
                            missingCharacterInfo.push({
                                id: characterId,
                                name: name || 'Unknown (not found)',
                                hasVideo: false
                            });
                        }
                    }
                }

                const errorData = {
                    shotIds: shots.map(s => s.id),
                    message: 'Some characters associated with these shots do not have video URLs. Please generate character videos first.',
                    characters: missingCharacterInfo,
                    characterIds: Array.from(allCharacterIds),
                    characterVideoUrls: characterVideoUrls,
                    totalCharacters: allCharacterIds.size,
                    charactersWithVideo: characterVideoUrls.length,
                    charactersWithoutVideo: allCharacterIds.size - characterVideoUrls.length
                };

                const error = new AppError(
                    `Character videos for the shots' characters are not found. Please generate character videos first.`,
                    400
                );
                error.errors = errorData;
                throw error;
            }

            // 构建模型配置
            const modelConfig = {
                modelId: model.id,
                modelName: model.name,
                provider: model.provider,
                baseUrl: model.baseUrl,
                apiKey,
            };

            // 构建视频生成选项（使用目标时长）
            const videoOptions = {
                duration: targetDuration,
                prompt,
                ...apiConfig,
            };

            // 根据提供商调用不同的视频生成API
            const providerName = model.provider?.name || 'unknown';
            let result;

            switch (providerName.toLowerCase()) {
                case 'openai':
                    result = await imageGenerationService.callOpenAISora(
                        model.baseUrl,
                        apiKey,
                        prompt,
                        model.name,
                        characterVideoUrls,
                        videoOptions,
                        referenceVideoUrls
                    );
                    break;
                case 'grsai':
                    result = await imageGenerationService.callGrsaiVideo(
                        model.baseUrl,
                        apiKey,
                        prompt,
                        model.name,
                        referenceVideoUrls,
                        videoOptions,
                        characterVideoUrls
                    );
                    console.log(`Merged video prompt: ${prompt}`);
                    break;
                case 'runway':
                    result = await imageGenerationService.callRunway(
                        model.baseUrl,
                        apiKey,
                        prompt,
                        model.name,
                        characterVideoUrls,
                        videoOptions,
                        referenceVideoUrls
                    );
                    break;
                case 'pika':
                    result = await imageGenerationService.callPika(
                        model.baseUrl,
                        apiKey,
                        prompt,
                        model.name,
                        characterVideoUrls,
                        videoOptions,
                        referenceVideoUrls
                    );
                    break;
                default:
                    throw new AppError(`Unsupported video provider: ${providerName}`, 400);
            }

            // 处理生成结果
            let finalVideoUrl = result.videoUrl;
            let localVideoPath = result.filePath;

            // 如果生成的是远程URL，保存到本地
            if (finalVideoUrl && (finalVideoUrl.startsWith('http://') || finalVideoUrl.startsWith('https://'))) {
                // 使用第一个镜头的ID作为文件ID前缀
                const fileId = `merged_${firstShot.id}_${Date.now()}`;
                const savedPath = await imageGenerationService.saveVideoFile(finalVideoUrl, fileId, 'shot');
                if (savedPath && savedPath.path) {
                    localVideoPath = savedPath.path; // 只使用 path 字段，不是整个对象
                }
            }

            // 上传到Catbox
            const fileStorageService = require('./fileStorageService');
            if (localVideoPath) {
                try {
                    // 本地文件直接上传到Catbox
                    finalVideoUrl = await fileStorageService.uploadToCatbox(localVideoPath, {
                        filename: `merged_${firstShot.id}_${Date.now()}.mp4`,
                        mimeType: 'video/mp4',
                    });
                } catch (uploadError) {
                    logger.warn(`Failed to upload merged video to Catbox: ${uploadError.message}`);
                    // 上传失败时保留本地路径
                }
            } else if (finalVideoUrl && (finalVideoUrl.startsWith('http://') || finalVideoUrl.startsWith('https://'))) {
                // 如果是远程URL但没有本地文件，尝试下载后上传
                try {
                    if (storageMode === 'buffer_upload') {
                        finalVideoUrl = await fileStorageService.downloadBufferAndUpload(finalVideoUrl, {
                            filename: `merged_${firstShot.id}_${Date.now()}.mp4`,
                            mimeType: 'video/mp4',
                        });
                    } else {
                        const uploadResult = await fileStorageService.downloadAndUpload(
                            finalVideoUrl,
                            `shots/merged_${firstShot.id}_${Date.now()}`,
                            {
                                filename: `merged_${firstShot.id}_${Date.now()}.mp4`,
                                uploadToHosting: true,
                                hostingProvider: 'catbox',
                            }
                        );
                        finalVideoUrl = uploadResult.publicUrl;
                        if (uploadResult.absolutePath && !localVideoPath) {
                            localVideoPath = uploadResult.absolutePath;
                        }
                    }
                } catch (uploadError) {
                    logger.warn(`Failed to download and upload merged video: ${uploadError.message}`);
                    // 保留原始URL
                }
            }

            return {
                videoUrl: finalVideoUrl,
                videoPath: localVideoPath,
            };
        } catch (error) {
            logger.error(`Generate merged shot video error:`, error);
            throw error;
        }
    }

    /**
     * 生成场景视频（临时方法，后续可扩展）
     */
    async generateSceneVideo(modelConfig, prompt, options, fileId) {
        // 这里可以调用imageGenerationService的通用视频生成方法
        // 暂时抛出错误，提示需要实现
        throw new AppError('Scene video generation not yet implemented. Please ensure shots have associated characters.', 501);
    }

    /**
     * 3. 生成指定单个镜头视频（支持并发，支持覆盖）
     * @param {string} projectId - 项目ID
     * @param {Array<string>} shotIds - 镜头ID数组
     * @param {string} userId - 用户ID
     * @param {Object} options - 选项 { novelId, concurrency = 3, apiConfig = {}, allowOverwrite = false, keepBoth = false }
     * @returns {Promise<Object>} - 生成结果
     */
    async generateShotsByIds(projectId, shotIds, userId, options = {}) {
        const prisma = getPrisma();
        const { novelId = null, concurrency = 3, apiConfig = {}, allowOverwrite = false, keepBoth = false, storageMode = 'download_upload', featurePromptId = null, mergeShots = false, maxDuration = null, toleranceSec = 5 } = options;

        try {
            // 验证项目权限
            const project = await prisma.project.findFirst({
                where: { id: projectId, userId },
            });
            if (!project) {
                throw new NotFoundError('Project not found');
            }

            // 如果提供了novelId，验证小说属于项目和用户
            if (novelId) {
                const novel = await prisma.novel.findFirst({
                    where: { id: novelId, projectId, userId },
                });
                if (!novel) {
                    throw new NotFoundError('Novel not found');
                }
            }

            // 获取镜头
            const shots = await prisma.shot.findMany({
                where: {
                    id: { in: shotIds },
                    projectId,
                    userId,
                    ...(novelId && { novelId }),
                },
                include: {
                    act: true,
                    scene: true,
                },
            });

            if (shots.length !== shotIds.length) {
                const errorMsg = novelId
                    ? 'Some shots not found or do not belong to project/novel'
                    : 'Some shots not found or do not belong to project';
                throw new AppError(errorMsg, 404);
            }

            // 检查是否需要覆盖
            const shotsToGenerate = shots.filter(shot => {
                if (allowOverwrite) return true;
                if (keepBoth) return true; // 保留两者时总是生成新版本
                return !shot.videoUrl;
            });

            // 如果没有需要生成的镜头，返回提示信息
            if (shotsToGenerate.length === 0) {
                const shotsWithVideo = shots.filter(shot => shot.videoUrl).length;
                logger.info(`No shots to generate: ${shots.length} shot(s) found, ${shotsWithVideo} already have video. allowOverwrite=${allowOverwrite}, keepBoth=${keepBoth}`);
                return {
                    total: 0,
                    tasks: [],
                    message: shotsWithVideo === shots.length
                        ? 'All shots already have videos. Set allowOverwrite=true to regenerate.'
                        : 'No shots match the generation criteria.',
                    skipped: shots.length - shotsToGenerate.length,
                    skippedShots: shots.filter(shot => shot.videoUrl).map(shot => ({
                        shotId: shot.id,
                        reason: 'already_has_video',
                        videoUrl: shot.videoUrl
                    }))
                };
            }

            // 如果启用合并模式，进行自动分组
            let shotGroups = [];
            if (mergeShots) {
                if (!maxDuration || maxDuration <= 0) {
                    throw new AppError('maxDuration is required when mergeShots is true', 400);
                }
                if (toleranceSec < 0) {
                    throw new AppError('toleranceSec must be non-negative', 400);
                }

                // 按 order 排序，确保相邻
                const sortedShots = [...shotsToGenerate].sort((a, b) => {
                    const orderA = a.order !== null && a.order !== undefined ? a.order : a.shotId || 0;
                    const orderB = b.order !== null && b.order !== undefined ? b.order : b.shotId || 0;
                    return orderA - orderB;
                });

                // 检查是否相邻（order 连续）
                for (let i = 1; i < sortedShots.length; i++) {
                    const prevOrder = sortedShots[i - 1].order !== null && sortedShots[i - 1].order !== undefined
                        ? sortedShots[i - 1].order
                        : sortedShots[i - 1].shotId || 0;
                    const currOrder = sortedShots[i].order !== null && sortedShots[i].order !== undefined
                        ? sortedShots[i].order
                        : sortedShots[i].shotId || 0;
                    if (currOrder - prevOrder > 1) {
                        logger.warn(`Shots are not adjacent: gap between order ${prevOrder} and ${currOrder}`);
                    }
                }

                // 自动分组
                const minDuration = maxDuration - toleranceSec;
                const maxDurationWithTolerance = maxDuration + toleranceSec;
                let currentGroup = [];
                let currentDuration = 0;
                let currentSceneId = null; // 跟踪当前组的 sceneId

                for (const shot of sortedShots) {
                    const shotDuration = shot.duration || 3; // 默认3秒
                    const shotSceneId = shot.sceneId || shot.scene?.id || null;

                    // 如果单个镜头时长超过上限，单独成组
                    if (shotDuration > maxDurationWithTolerance) {
                        // 如果当前组有内容，先保存
                        if (currentGroup.length > 0) {
                            shotGroups.push({
                                shots: [...currentGroup],
                                targetDuration: currentDuration
                            });
                            currentGroup = [];
                            currentDuration = 0;
                            currentSceneId = null;
                        }
                        // 单个镜头成组
                        shotGroups.push({
                            shots: [shot],
                            targetDuration: shotDuration
                        });
                        continue;
                    }

                    // 检查 sceneId 是否一致：如果当前组不为空且 sceneId 不同，先保存当前组
                    if (currentGroup.length > 0 && currentSceneId !== shotSceneId) {
                        shotGroups.push({
                            shots: [...currentGroup],
                            targetDuration: currentDuration
                        });
                        currentGroup = [];
                        currentDuration = 0;
                        currentSceneId = null;
                    }

                    // 如果加入当前镜头会超过上限，先保存当前组
                    if (currentDuration + shotDuration > maxDurationWithTolerance) {
                        if (currentGroup.length > 0) {
                            shotGroups.push({
                                shots: [...currentGroup],
                                targetDuration: currentDuration
                            });
                            currentGroup = [];
                            currentDuration = 0;
                            currentSceneId = null;
                        }
                    }

                    // 加入当前镜头
                    currentGroup.push(shot);
                    currentDuration += shotDuration;
                    // 设置或更新当前组的 sceneId
                    if (currentSceneId === null) {
                        currentSceneId = shotSceneId;
                    }

                    // 如果已达到或超过最小时长，可以考虑切组（但允许继续添加直到上限）
                    // 这里我们允许继续添加，直到达到上限
                }

                // 保存最后一组
                if (currentGroup.length > 0) {
                    shotGroups.push({
                        shots: [...currentGroup],
                        targetDuration: currentDuration
                    });
                }

                logger.info(`Grouped ${sortedShots.length} shots into ${shotGroups.length} groups for merged video generation`);
            } else {
                // 不合并模式，每个镜头单独成组
                shotGroups = shotsToGenerate.map(shot => ({
                    shots: [shot],
                    targetDuration: shot.duration || 3
                }));
            }

            // 批量查询角色（避免N+1查询）
            const allCharacterIds = new Set();
            shotsToGenerate.forEach(shot => {
                const characterList = this.getShotCharacterIds(shot);
                characterList.forEach(char => allCharacterIds.add(char.id));
            });
            const charactersMap = new Map();
            if (allCharacterIds.size > 0) {
                const characters = await prisma.character.findMany({
                    where: { id: { in: Array.from(allCharacterIds) } },
                });
                characters.forEach(char => charactersMap.set(char.id, char));
            }

            // 获取项目配置和模型
            const projectWithKeys = await projectService.getProjectWithKeys(projectId, userId);
            let model = null;
            // 尝试获取配置的模型，如果不存在则降级到默认模型
            if (projectWithKeys.configVideoAI) {
                try {
                    model = await aiModelService.getModelById(projectWithKeys.configVideoAI);
                } catch (error) {
                    // 模型不存在，继续使用降级逻辑
                    logger.warn(`Configured video model ${projectWithKeys.configVideoAI} not found, using fallback`);
                }
            }
            // 如果模型不存在或类型不匹配，降级到第一个可用的视频模型
            if (!model || model.type !== 'video') {
                const models = await aiModelService.getModelsByType('video');
                if (models.length === 0) {
                    throw new AppError('No active video models found', 404);
                }
                model = models[0];
            }

            let apiKey = projectWithKeys.configVideoAIKey;
            if (!apiKey) {
                throw new AppError('Video AI API key is required', 400);
            }
            // 解密API密钥，若格式不合法则回退为原始值以便兼容明文配置
            try {
                apiKey = decrypt(apiKey);
            } catch (e) {
                logger.warn(`Decrypt project video AI key failed, fallback to raw value: ${e.message}`);
            }

            // 为每个组创建任务
            const taskMap = new Map(); // groupIndex -> taskId
            const tasks = [];
            // 为每个组添加索引，方便后续查找
            shotGroups.forEach((group, index) => {
                group.groupIndex = index;
            });

            for (let i = 0; i < shotGroups.length; i++) {
                const group = shotGroups[i];
                const shotIds = group.shots.map(s => s.id);
                const firstShot = group.shots[0];

                // 创建任务，metadata 中存储合并信息
                const taskMetadata = {
                    ...apiConfig,
                    ...(mergeShots && {
                        mergedShotIds: shotIds,
                        targetDuration: group.targetDuration,
                        groupIndex: i
                    })
                };

                const task = await prisma.shotVideoTask.create({
                    data: {
                        shotId: firstShot.id, // 使用第一个镜头ID作为主镜头ID
                        actId: firstShot.act?.id || null,
                        projectId,
                        novelId: firstShot.novelId || novelId || null,
                        userId,
                        modelId: model.id,
                        apiConfig: JSON.stringify(taskMetadata),
                        status: 'pending',
                    },
                });

                taskMap.set(i, task.id);
                tasks.push({
                    taskId: task.id,
                    shotIds: shotIds,
                    targetDuration: group.targetDuration,
                    ...(mergeShots && { merged: true })
                });
            }

            // 将组分组为批次（批次间并发，批次内顺序）
            const batches = [];
            for (let i = 0; i < shotGroups.length; i += concurrency) {
                batches.push(shotGroups.slice(i, i + concurrency));
            }

            // 异步执行生成任务（不等待完成）
            setImmediate(async () => {
                try {
                    // 批次间并发执行，每个批次内按顺序执行
                    const batchPromises = batches.map(async (batch) => {
                        // 批次内按顺序执行
                        for (let groupIndex = 0; groupIndex < batch.length; groupIndex++) {
                            const group = batch[groupIndex];
                            const taskId = taskMap.get(group.groupIndex);
                            try {
                                // 更新任务状态为processing
                                await prisma.shotVideoTask.update({
                                    where: { id: taskId },
                                    data: { status: 'processing', startedAt: new Date() },
                                });

                                let result;
                                if (mergeShots && group.shots.length > 1) {
                                    // 合并模式：生成合并视频
                                    result = await this.generateMergedShotVideo(
                                        group.shots, group.targetDuration, model, apiKey, apiConfig, userId, charactersMap, taskId, storageMode, featurePromptId
                                    );
                                } else {
                                    // 单镜头模式：生成单个视频
                                    const shot = group.shots[0];
                                    result = await this.generateSingleShotVideo(
                                        shot, shot.act, shot.scene, model, apiKey, apiConfig, userId, charactersMap, taskId, storageMode, featurePromptId
                                    );
                                }

                                // 更新任务状态为completed
                                await prisma.shotVideoTask.update({
                                    where: { id: taskId },
                                    data: {
                                        status: 'completed',
                                        progress: 100,
                                        videoUrl: result.videoUrl,
                                        videoPath: result.videoPath,
                                        completedAt: new Date(),
                                    },
                                });

                                // 如果是合并模式，将视频URL写回所有组内镜头
                                if (mergeShots && group.shots.length > 1 && result.videoUrl) {
                                    await prisma.shot.updateMany({
                                        where: {
                                            id: { in: group.shots.map(s => s.id) }
                                        },
                                        data: {
                                            videoUrl: result.videoUrl,
                                            videoPath: result.videoPath
                                        }
                                    });
                                }
                            } catch (error) {
                                // 更新任务状态为failed
                                await prisma.shotVideoTask.update({
                                    where: { id: taskId },
                                    data: {
                                        status: 'failed',
                                        errorMessage: error.message,
                                        completedAt: new Date(),
                                    },
                                });
                                logger.error(`Generate shot video error for group ${groupIndex}:`, error);
                            }
                        }
                    });

                    // 等待所有批次完成
                    await Promise.all(batchPromises);
                } catch (error) {
                    logger.error('Background shot generation error:', error);
                }
            });

            // 立即返回任务列表
            return {
                total: shotGroups.length, // 返回组的数量
                tasks,
            };
        } catch (error) {
            if (error instanceof NotFoundError || error instanceof AppError) {
                throw error;
            }
            logger.error('Generate shots by ids error:', error);
            throw new AppError('Failed to generate shots by ids', 500);
        }
    }

    /**
     * 4. 新增镜头（向前或向后插入，可增加人物对话）
     * @param {string} projectId - 项目ID
     * @param {string} actId - 剧幕ID
     * @param {string} userId - 用户ID
     * @param {Object} shotData - 镜头数据
     * @param {Object} options - 选项 { insertPosition = 'after', targetShotId = null }
     * @returns {Promise<Object>} - 创建的镜头
     */
    async createShot(projectId, actId, userId, shotData, options = {}) {
        const prisma = getPrisma();
        const { insertPosition = 'after', targetShotId = null } = options;

        try {
            // 验证项目权限
            const project = await prisma.project.findFirst({
                where: { id: projectId, userId },
            });
            if (!project) {
                throw new NotFoundError('Project not found');
            }

            // 验证剧幕
            const act = await prisma.act.findFirst({
                where: { id: actId, projectId, userId },
            });
            if (!act) {
                throw new NotFoundError('Act not found');
            }

            // 确定插入位置
            let order = 0;
            if (targetShotId) {
                const targetShot = await prisma.shot.findFirst({
                    where: { id: targetShotId, actId },
                });
                if (!targetShot) {
                    throw new NotFoundError('Target shot not found');
                }
                order = targetShot.order;
                if (insertPosition === 'after') {
                    // 将目标镜头之后的所有镜头order+1
                    await prisma.shot.updateMany({
                        where: {
                            actId,
                            order: { gt: order },
                        },
                        data: {
                            order: { increment: 1 },
                        },
                    });
                    order += 1;
                } else {
                    // 将目标镜头及之后的所有镜头order+1
                    await prisma.shot.updateMany({
                        where: {
                            actId,
                            order: { gte: order },
                        },
                        data: {
                            order: { increment: 1 },
                        },
                    });
                }
            } else {
                // 插入到最后
                const lastShot = await prisma.shot.findFirst({
                    where: { actId },
                    orderBy: { order: 'desc' },
                });
                order = lastShot ? lastShot.order + 1 : 0;
            }

            // 创建镜头
            const shot = await prisma.shot.create({
                data: {
                    actId,
                    sceneId: shotData.sceneId || null,
                    novelId: act.novelId,
                    projectId,
                    userId,
                    shotId: shotData.shotId || 0,
                    duration: shotData.duration,
                    shotType: shotData.shotType,
                    framing: shotData.framing,
                    cameraAngle: shotData.cameraAngle,
                    cameraMovement: shotData.cameraMovement,
                    characterAction: shotData.characterAction,
                    action: shotData.action,
                    expression: shotData.expression,
                    dialogue: shotData.dialogue ? JSON.stringify(shotData.dialogue) : null,
                    voiceover: shotData.voiceover,
                    lighting: shotData.lighting,
                    atmosphere: shotData.atmosphere,
                    bgm: shotData.bgm,
                    fx: shotData.fx,
                    soundEffect: shotData.soundEffect,
                    isTransition: shotData.isTransition || false,
                    characterList: shotData.characterList ? JSON.stringify(shotData.characterList) : null,
                    characterIds: shotData.characterIds ? JSON.stringify(shotData.characterIds) : (shotData.characterList ? JSON.stringify(shotData.characterList.map(char => char.id).filter(id => id)) : null),
                    metadata: shotData.metadata ? JSON.stringify(shotData.metadata) : null,
                    order,
                },
            });

            return this.formatShot(shot);
        } catch (error) {
            if (error instanceof NotFoundError || error instanceof AppError) {
                throw error;
            }
            logger.error('Create shot error:', error);
            throw new AppError('Failed to create shot', 500);
        }
    }

    /**
     * 5. 修改镜头
     * @param {string} projectId - 项目ID
     * @param {string} shotId - 镜头ID
     * @param {string} userId - 用户ID
     * @param {Object} updateData - 更新数据
     * @returns {Promise<Object>} - 更新后的镜头
     */
    async updateShot(projectId, shotId, userId, updateData) {
        const prisma = getPrisma();
        try {
            // 验证权限
            const shot = await prisma.shot.findFirst({
                where: { id: shotId, projectId, userId },
            });
            if (!shot) {
                throw new NotFoundError('Shot not found');
            }

            // 构建更新数据
            const data = {};
            if (updateData.duration !== undefined) data.duration = updateData.duration;
            if (updateData.shotType !== undefined) data.shotType = updateData.shotType;
            if (updateData.framing !== undefined) data.framing = updateData.framing;
            if (updateData.cameraAngle !== undefined) data.cameraAngle = updateData.cameraAngle;
            if (updateData.cameraMovement !== undefined) data.cameraMovement = updateData.cameraMovement;
            if (updateData.characterAction !== undefined) data.characterAction = updateData.characterAction;
            if (updateData.action !== undefined) data.action = updateData.action;
            if (updateData.expression !== undefined) data.expression = updateData.expression;
            if (updateData.dialogue !== undefined) data.dialogue = JSON.stringify(updateData.dialogue);
            if (updateData.voiceover !== undefined) data.voiceover = updateData.voiceover;
            if (updateData.lighting !== undefined) data.lighting = updateData.lighting;
            if (updateData.atmosphere !== undefined) data.atmosphere = updateData.atmosphere;
            if (updateData.bgm !== undefined) data.bgm = updateData.bgm;
            if (updateData.fx !== undefined) data.fx = updateData.fx;
            if (updateData.soundEffect !== undefined) data.soundEffect = updateData.soundEffect;
            if (updateData.isTransition !== undefined) data.isTransition = updateData.isTransition;
            if (updateData.characterList !== undefined) {
                data.characterList = JSON.stringify(updateData.characterList);
                // 同时更新 characterIds（从 characterList 提取 ID）
                if (Array.isArray(updateData.characterList)) {
                    const ids = updateData.characterList
                        .filter(char => char && char.id)
                        .map(char => char.id);
                    data.characterIds = ids.length > 0 ? JSON.stringify(ids) : null;
                }
            }
            if (updateData.characterIds !== undefined) {
                data.characterIds = JSON.stringify(updateData.characterIds);
            }
            if (updateData.metadata !== undefined) {
                const existingMetadata = shot.metadata ? JSON.parse(shot.metadata) : {};
                data.metadata = JSON.stringify({ ...existingMetadata, ...updateData.metadata });
            }

            const updatedShot = await prisma.shot.update({
                where: { id: shotId },
                data,
            });

            return this.formatShot(updatedShot);
        } catch (error) {
            if (error instanceof NotFoundError || error instanceof AppError) {
                throw error;
            }
            logger.error('Update shot error:', error);
            throw new AppError('Failed to update shot', 500);
        }
    }

    /**
     * 6. 删除镜头（支持批量删除）
     * @param {string} projectId - 项目ID
     * @param {Array<string>} shotIds - 镜头ID数组
     * @param {string} userId - 用户ID
     * @returns {Promise<Object>} - 删除结果
     */
    async deleteShots(projectId, shotIds, userId) {
        const prisma = getPrisma();
        try {
            // 验证权限
            const shots = await prisma.shot.findMany({
                where: {
                    id: { in: shotIds },
                    projectId,
                    userId,
                },
            });

            if (shots.length !== shotIds.length) {
                throw new AppError('Some shots not found or do not belong to project', 404);
            }

            // 删除镜头
            await prisma.shot.deleteMany({
                where: {
                    id: { in: shotIds },
                    projectId,
                    userId,
                },
            });

            return {
                deleted: shotIds.length,
                shotIds,
            };
        } catch (error) {
            if (error instanceof NotFoundError || error instanceof AppError) {
                throw error;
            }
            logger.error('Delete shots error:', error);
            throw new AppError('Failed to delete shots', 500);
        }
    }

    /**
     * 7. 生成台词音频（批量生成，支持并发）
     * @param {string} projectId - 项目ID
     * @param {Array<string>} dialogueIds - 对话ID数组（格式：shotId_index，如 "shot-123_0"）
     * @param {string} userId - 用户ID
     * @param {Object} options - 选项 { concurrency = 3, apiConfig = {} }
     * @returns {Promise<Object>} - 生成结果
     */
    async generateDialoguesAudio(projectId, dialogueIds, userId, options = {}) {
        const prisma = getPrisma();
        const { concurrency = 3, apiConfig = {}, storageMode = 'download_upload', featurePromptId = null } = options;

        try {
            // 验证项目权限
            const project = await prisma.project.findFirst({
                where: { id: projectId, userId },
            });
            if (!project) {
                throw new NotFoundError('Project not found');
            }

            // 解析对话ID，获取所有shotId
            const shotIds = dialogueIds.map(id => id.split('_')[0]);
            const uniqueShotIds = [...new Set(shotIds)];

            // 批量查询镜头（避免N+1查询）
            const shots = await prisma.shot.findMany({
                where: {
                    id: { in: uniqueShotIds },
                    projectId,
                    userId,
                },
            });

            if (shots.length !== uniqueShotIds.length) {
                const foundIds = new Set(shots.map(s => s.id));
                const missingIds = uniqueShotIds.filter(id => !foundIds.has(id));
                throw new NotFoundError(`Shots not found: ${missingIds.join(', ')}`);
            }

            const shotsMap = new Map(shots.map(s => [s.id, s]));

            // 解析对话ID，获取镜头和对话索引
            const dialogues = [];
            const allCharacterIds = new Set();
            for (const dialogueId of dialogueIds) {
                const [shotId, index] = dialogueId.split('_');
                const shot = shotsMap.get(shotId);
                if (!shot) {
                    throw new NotFoundError(`Shot ${shotId} not found`);
                }
                const dialogueArray = this.getShotDialogue(shot);
                const indexNum = parseInt(index);
                if (!dialogueArray[indexNum]) {
                    throw new NotFoundError(`Dialogue at index ${index} not found in shot ${shotId}`);
                }
                dialogues.push({ shot, dialogue: dialogueArray[indexNum], index: indexNum });
                // 收集角色ID
                if (dialogueArray[indexNum].characterId) {
                    allCharacterIds.add(dialogueArray[indexNum].characterId);
                }
            }

            // 批量查询角色（避免N+1查询）
            const charactersMap = new Map();
            if (allCharacterIds.size > 0) {
                const characters = await prisma.character.findMany({
                    where: { id: { in: Array.from(allCharacterIds) } },
                });
                characters.forEach(char => charactersMap.set(char.id, char));
            }

            // 获取项目配置和TTS模型
            const projectWithKeys = await projectService.getProjectWithKeys(projectId, userId);
            let model = null;
            // 尝试获取配置的模型，如果不存在则降级到默认模型
            if (projectWithKeys.configTTS) {
                try {
                    model = await aiModelService.getModelById(projectWithKeys.configTTS);
                } catch (error) {
                    // 模型不存在，继续使用降级逻辑
                    logger.warn(`Configured TTS model ${projectWithKeys.configTTS} not found, using fallback`);
                }
            }
            // 如果模型不存在或类型不匹配，降级到第一个可用的TTS模型
            if (!model || model.type !== 'tts') {
                const models = await aiModelService.getModelsByType('tts');
                if (models.length === 0) {
                    throw new AppError('No active TTS models found', 404);
                }
                model = models[0];
            }

            let apiKey = projectWithKeys.configTTSKey;
            if (!apiKey) {
                throw new AppError('TTS API key is required', 400);
            }
            // 解密API密钥，若格式不合法则回退为原始值以便兼容明文配置
            try {
                apiKey = decrypt(apiKey);
            } catch (e) {
                logger.warn(`Decrypt project TTS key failed, fallback to raw value: ${e.message}`);
            }

            // 并发生成音频
            const results = [];
            for (let i = 0; i < dialogues.length; i += concurrency) {
                const batch = dialogues.slice(i, i + concurrency);
                const batchPromises = batch.map(({ shot, dialogue, index }) =>
                    this.generateSingleDialogueAudio(shot, dialogue, index, model, apiKey, apiConfig, charactersMap, storageMode)
                );
                const batchResults = await Promise.allSettled(batchPromises);
                results.push(...batchResults.map((r, idx) => ({
                    dialogueId: dialogueIds[i + idx],
                    shotId: batch[idx].shot.id,
                    status: r.status,
                    audioUrl: r.status === 'fulfilled' ? r.value.audioUrl : null,
                    error: r.status === 'rejected' ? r.reason.message : null,
                })));
            }

            return {
                total: dialogues.length,
                success: results.filter(r => r.status === 'fulfilled').length,
                failed: results.filter(r => r.status === 'rejected').length,
                results,
            };
        } catch (error) {
            if (error instanceof NotFoundError || error instanceof AppError) {
                throw error;
            }
            logger.error('Generate dialogues audio error:', error);
            throw new AppError('Failed to generate dialogues audio', 500);
        }
    }

    /**
     * 生成单个对话音频
     */
    async generateSingleDialogueAudio(shot, dialogue, index, model, apiKey, apiConfig, charactersMap = null, storageMode = 'download_upload', featurePromptId = null) {
        const prisma = getPrisma();
        try {
            const text = dialogue.text || dialogue.content || '';
            if (!text) {
                throw new AppError('Dialogue text is required', 400);
            }

            // 获取角色信息（如果有）- 优先使用传入的charactersMap
            const characterId = dialogue.characterId || null;
            let voice = 'alloy'; // 默认voice
            if (characterId) {
                let character = null;
                if (charactersMap && charactersMap.has(characterId)) {
                    character = charactersMap.get(characterId);
                } else {
                    character = await prisma.character.findFirst({
                        where: { id: characterId },
                    });
                }
                if (character && character.voiceActor) {
                    voice = character.voiceActor;
                }
            }

            const modelConfig = {
                id: model.id,
                name: model.name,
                provider: model.provider,
                baseUrl: model.baseUrl,
            };

            // 生成音频（支持功能提示词）
            let finalText = text;
            if (featurePromptId) {
                // 使用功能提示词处理文本
                const featurePrompt = await systemPromptService.getFeaturePromptById(featurePromptId);
                if (!featurePrompt) {
                    throw new NotFoundError(`Feature prompt with id ${featurePromptId} not found`);
                }
                // 将功能提示词的prompt作为上下文，结合原始文本
                finalText = `${featurePrompt.prompt}\n\n${text}`;
            }

            const ttsOptions = {
                voice,
                ...apiConfig,
            };

            const result = await ttsService.generateAudio(
                finalText,
                modelConfig,
                apiKey,
                ttsOptions,
                `shot_${shot.id}_dialogue_${index}`
            );

            // 根据storageMode上传到Catbox
            const fileStorageService = require('./fileStorageService');
            let finalAudioUrl = result.audioUrl;

            // 如果生成的音频是远程URL，需要上传到Catbox
            if (result.audioUrl && (result.audioUrl.startsWith('http://') || result.audioUrl.startsWith('https://'))) {
                if (storageMode === 'buffer_upload') {
                    try {
                        const storageResult = await fileStorageService.downloadBufferAndUpload(
                            result.audioUrl,
                            {
                                filename: `shot_${shot.id}_dialogue_${index}_${Date.now()}.mp3`,
                                mimeType: 'audio/mpeg',
                            }
                        );
                        finalAudioUrl = storageResult.publicUrl;
                    } catch (err) {
                        logger.warn(`Catbox buffer_upload failed for dialogue, fallback to download_upload: ${err.message}`);
                        try {
                            const storageResult = await fileStorageService.downloadAndUpload(
                                result.audioUrl,
                                `shots/${shot.id}/audio`,
                                {
                                    filename: `shot_${shot.id}_dialogue_${index}_${Date.now()}.mp3`,
                                    uploadToHosting: true,
                                    hostingProvider: 'catbox',
                                }
                            );
                            finalAudioUrl = storageResult.publicUrl;
                        } catch (fallbackErr) {
                            logger.error(`Failed to upload dialogue audio to Catbox: ${fallbackErr.message}`);
                            finalAudioUrl = result.audioUrl;
                        }
                    }
                } else {
                    // 使用download_upload方式
                    try {
                        const storageResult = await fileStorageService.downloadAndUpload(
                            result.audioUrl,
                            `shots/${shot.id}/audio`,
                            {
                                filename: `shot_${shot.id}_dialogue_${index}_${Date.now()}.mp3`,
                                uploadToHosting: true,
                                hostingProvider: 'catbox',
                            }
                        );
                        finalAudioUrl = storageResult.publicUrl;
                    } catch (err) {
                        logger.error(`Failed to upload dialogue audio to Catbox: ${err.message}`);
                        finalAudioUrl = result.audioUrl;
                    }
                }
            } else if (result.filePath) {
                // 本地文件，直接上传到Catbox
                try {
                    finalAudioUrl = await fileStorageService.uploadToCatbox(
                        result.filePath,
                        {
                            filename: `shot_${shot.id}_dialogue_${index}_${Date.now()}.mp3`,
                            mimeType: 'audio/mpeg',
                        }
                    );
                } catch (err) {
                    logger.error(`Failed to upload local audio to Catbox: ${err.message}`);
                    finalAudioUrl = result.audioUrl;
                }
            }

            // 更新对话中的audioUrl
            const dialogueArray = this.getShotDialogue(shot);
            if (dialogueArray[index]) {
                dialogueArray[index].audioUrl = finalAudioUrl;
                await prisma.shot.update({
                    where: { id: shot.id },
                    data: {
                        dialogue: JSON.stringify(dialogueArray),
                    },
                });
            }

            return { audioUrl: finalAudioUrl };
        } catch (error) {
            logger.error(`Generate dialogue audio error for shot ${shot.id}, index ${index}:`, error);
            throw error;
        }
    }

    /**
     * 8. 修改台词内容
     * @param {string} projectId - 项目ID
     * @param {string} dialogueId - 对话ID（格式：shotId_index）
     * @param {string} userId - 用户ID
     * @param {Object} updateData - 更新数据 { text, characterId, ... }
     * @returns {Promise<Object>} - 更新后的对话
     */
    async updateDialogue(projectId, dialogueId, userId, updateData) {
        const prisma = getPrisma();
        try {
            const [shotId, index] = dialogueId.split('_');
            const shot = await prisma.shot.findFirst({
                where: { id: shotId, projectId, userId },
            });
            if (!shot) {
                throw new NotFoundError('Shot not found');
            }

            const dialogueArray = this.getShotDialogue(shot);
            const indexNum = parseInt(index);
            if (!dialogueArray[indexNum]) {
                throw new NotFoundError('Dialogue not found');
            }

            // 更新对话
            dialogueArray[indexNum] = {
                ...dialogueArray[indexNum],
                ...updateData,
            };

            await prisma.shot.update({
                where: { id: shotId },
                data: {
                    dialogue: JSON.stringify(dialogueArray),
                },
            });

            return dialogueArray[index];
        } catch (error) {
            if (error instanceof NotFoundError || error instanceof AppError) {
                throw error;
            }
            logger.error('Update dialogue error:', error);
            throw new AppError('Failed to update dialogue', 500);
        }
    }

    /**
     * 9. 删除台词内容
     * @param {string} projectId - 项目ID
     * @param {string} dialogueId - 对话ID（格式：shotId_index）
     * @param {string} userId - 用户ID
     * @returns {Promise<Object>} - 删除结果
     */
    async deleteDialogue(projectId, dialogueId, userId) {
        const prisma = getPrisma();
        try {
            const [shotId, index] = dialogueId.split('_');
            const shot = await prisma.shot.findFirst({
                where: { id: shotId, projectId, userId },
            });
            if (!shot) {
                throw new NotFoundError('Shot not found');
            }

            const dialogueArray = this.getShotDialogue(shot);
            const indexNum = parseInt(index);
            if (!dialogueArray[indexNum]) {
                throw new NotFoundError('Dialogue not found');
            }

            // 删除对话
            dialogueArray.splice(indexNum, 1);

            await prisma.shot.update({
                where: { id: shotId },
                data: {
                    dialogue: JSON.stringify(dialogueArray),
                },
            });

            return { deleted: true, dialogueId };
        } catch (error) {
            if (error instanceof NotFoundError || error instanceof AppError) {
                throw error;
            }
            logger.error('Delete dialogue error:', error);
            throw new AppError('Failed to delete dialogue', 500);
        }
    }

    /**
     * 10. 预览视频（一幕的视频拼接或单个镜头视频）
     * @param {string} projectId - 项目ID
     * @param {string} userId - 用户ID
     * @param {Object} options - 选项 { type = 'act', actId = null, shotId = null }
     * @returns {Promise<Object>} - 预览视频信息
     */
    async previewVideo(projectId, userId, options = {}) {
        const prisma = getPrisma();
        const { type = 'act', actId = null, shotId = null } = options;

        try {
            if (type === 'shot' && shotId) {
                // 预览单个镜头视频
                const shot = await prisma.shot.findFirst({
                    where: { id: shotId, projectId, userId },
                });
                if (!shot) {
                    throw new NotFoundError('Shot not found');
                }
                const videoUrl = shot.videoUrl || null;
                if (!videoUrl) {
                    throw new AppError('Shot video not generated yet', 400);
                }
                return {
                    type: 'shot',
                    shotId,
                    videoUrl,
                };
            } else if (type === 'act' && actId) {
                // 预览一幕的视频（按镜头顺序拼接）
                const act = await prisma.act.findFirst({
                    where: { id: actId, projectId, userId },
                    include: {
                        scenes: {
                            include: {
                                scene: {
                                    include: {
                                        shots: {
                                            orderBy: { order: 'asc' },
                                        },
                                    },
                                },
                            },
                            orderBy: { order: 'asc' },
                        },
                        shots: {
                            orderBy: { order: 'asc' },
                        },
                    },
                });
                if (!act) {
                    throw new NotFoundError('Act not found');
                }

                // 收集所有镜头的视频URL
                const videoUrls = [];
                for (const actScene of act.scenes) {
                    for (const shot of actScene.scene.shots) {
                        if (shot.videoUrl) {
                            videoUrls.push(shot.videoUrl);
                        }
                    }
                }
                for (const shot of act.shots) {
                    if (shot.videoUrl) {
                        videoUrls.push(shot.videoUrl);
                    }
                }

                if (videoUrls.length === 0) {
                    throw new AppError('No videos found for this act', 400);
                }

                // 拼接视频（使用ffmpeg）
                const mergedVideoUrl = await this.mergeVideos(videoUrls, `act_${actId}_preview`);

                return {
                    type: 'act',
                    actId,
                    videoUrl: mergedVideoUrl,
                    shotCount: videoUrls.length,
                };
            } else {
                throw new AppError('Invalid preview type or missing ID', 400);
            }
        } catch (error) {
            if (error instanceof NotFoundError || error instanceof AppError) {
                throw error;
            }
            logger.error('Preview video error:', error);
            throw new AppError('Failed to preview video', 500);
        }
    }

    /**
     * 11. 预览带台词音频的视频
     * @param {string} projectId - 项目ID
     * @param {string} userId - 用户ID
     * @param {Object} options - 选项 { type = 'act', actId = null, shotId = null }
     * @returns {Promise<Object>} - 预览视频信息
     */
    async previewVideoWithAudio(projectId, userId, options = {}) {
        const prisma = getPrisma();
        const { type = 'act', actId = null, shotId = null } = options;

        try {
            if (type === 'shot' && shotId) {
                // 预览单个镜头带音频的视频
                const shot = await prisma.shot.findFirst({
                    where: { id: shotId, projectId, userId },
                });
                if (!shot) {
                    throw new NotFoundError('Shot not found');
                }
                const videoUrl = shot.videoUrl || null;
                if (!videoUrl) {
                    throw new AppError('Shot video not generated yet', 400);
                }

                const dialogueArray = shot.dialogue ? JSON.parse(shot.dialogue) : [];
                const audioUrls = dialogueArray
                    .filter(d => d.audioUrl)
                    .map(d => d.audioUrl);

                if (audioUrls.length === 0) {
                    throw new AppError('No audio found for this shot', 400);
                }

                // 合并音频，然后与视频合并
                const mergedAudioUrl = await this.mergeAudios(audioUrls, `shot_${shotId}_audio`);
                const finalVideoUrl = await this.mergeVideoAndAudio(videoUrl, mergedAudioUrl, `shot_${shotId}_preview`);

                return {
                    type: 'shot',
                    shotId,
                    videoUrl: finalVideoUrl,
                };
            } else if (type === 'act' && actId) {
                // 预览一幕的带音频视频
                const act = await prisma.act.findFirst({
                    where: { id: actId, projectId, userId },
                    include: {
                        scenes: {
                            include: {
                                scene: {
                                    include: {
                                        shots: {
                                            orderBy: { order: 'asc' },
                                        },
                                    },
                                },
                            },
                            orderBy: { order: 'asc' },
                        },
                        shots: {
                            orderBy: { order: 'asc' },
                        },
                    },
                });
                if (!act) {
                    throw new NotFoundError('Act not found');
                }

                // 收集视频和音频
                const videoUrls = [];
                const audioUrls = [];
                for (const actScene of act.scenes) {
                    for (const shot of actScene.scene.shots) {
                        if (shot.videoUrl) {
                            videoUrls.push(shot.videoUrl);
                        }
                        const dialogueArray = this.getShotDialogue(shot);
                        for (const dialogue of dialogueArray) {
                            if (dialogue.audioUrl) {
                                audioUrls.push(dialogue.audioUrl);
                            }
                        }
                    }
                }
                for (const shot of act.shots) {
                    if (shot.videoUrl) {
                        videoUrls.push(shot.videoUrl);
                    }
                    const dialogueArray = this.getShotDialogue(shot);
                    for (const dialogue of dialogueArray) {
                        if (dialogue.audioUrl) {
                            audioUrls.push(dialogue.audioUrl);
                        }
                    }
                }

                if (videoUrls.length === 0) {
                    throw new AppError('No videos found for this act', 400);
                }

                // 拼接视频和音频
                const mergedVideoUrl = await this.mergeVideos(videoUrls, `act_${actId}_video`);
                const mergedAudioUrl = audioUrls.length > 0
                    ? await this.mergeAudios(audioUrls, `act_${actId}_audio`)
                    : null;
                const finalVideoUrl = mergedAudioUrl
                    ? await this.mergeVideoAndAudio(mergedVideoUrl, mergedAudioUrl, `act_${actId}_preview`)
                    : mergedVideoUrl;

                return {
                    type: 'act',
                    actId,
                    videoUrl: finalVideoUrl,
                    shotCount: videoUrls.length,
                    audioCount: audioUrls.length,
                };
            } else {
                throw new AppError('Invalid preview type or missing ID', 400);
            }
        } catch (error) {
            if (error instanceof NotFoundError || error instanceof AppError) {
                throw error;
            }
            logger.error('Preview video with audio error:', error);
            throw new AppError('Failed to preview video with audio', 500);
        }
    }

    /**
     * 12. 导出按幕导出视频（可勾选，可选择导出类型，指定目录）
     * @param {string} projectId - 项目ID
     * @param {Array<string>} actIds - 剧幕ID数组
     * @param {string} userId - 用户ID
     * @param {Object} options - 选项 { exportType = 'video', outputDir = null }
     * @returns {Promise<Object>} - 导出结果
     */
    async exportActs(projectId, actIds, userId, options = {}) {
        const prisma = getPrisma();
        const { exportType = 'video', outputDir = null } = options;

        try {
            // 验证项目权限
            const project = await prisma.project.findFirst({
                where: { id: projectId, userId },
            });
            if (!project) {
                throw new NotFoundError('Project not found');
            }

            // 获取剧幕
            const acts = await prisma.act.findMany({
                where: {
                    id: { in: actIds },
                    projectId,
                    userId,
                },
                include: {
                    scenes: {
                        include: {
                            scene: {
                                include: {
                                    shots: {
                                        orderBy: { order: 'asc' },
                                    },
                                },
                            },
                        },
                        orderBy: { order: 'asc' },
                    },
                    shots: {
                        orderBy: { order: 'asc' },
                    },
                },
            });

            if (acts.length !== actIds.length) {
                throw new AppError('Some acts not found', 404);
            }

            // 确定输出目录
            const baseDir = outputDir || path.join(config.fileStorage.localPath, 'exports');
            await fs.mkdir(baseDir, { recursive: true });

            const exportResults = [];
            for (const act of acts) {
                const actDir = path.join(baseDir, act.actName || `act_${act.id}`);
                await fs.mkdir(actDir, { recursive: true });

                // 收集视频和音频
                const videoUrls = [];
                const audioUrls = [];
                for (const actScene of act.scenes) {
                    for (const shot of actScene.scene.shots) {
                        if (shot.videoUrl) videoUrls.push(shot.videoUrl);
                        const dialogueArray = this.getShotDialogue(shot);
                        for (const dialogue of dialogueArray) {
                            if (dialogue.audioUrl) audioUrls.push(dialogue.audioUrl);
                        }
                    }
                }
                for (const shot of act.shots) {
                    if (shot.videoUrl) videoUrls.push(shot.videoUrl);
                    const dialogueArray = this.getShotDialogue(shot);
                    for (const dialogue of dialogueArray) {
                        if (dialogue.audioUrl) audioUrls.push(dialogue.audioUrl);
                    }
                }

                const result = {
                    actId: act.id,
                    actName: act.actName,
                    files: [],
                };

                if (exportType === 'video' || exportType === 'both') {
                    if (videoUrls.length > 0) {
                        const mergedVideo = await this.mergeVideos(videoUrls, `act_${act.id}_video`);
                        const videoPath = path.join(actDir, `${act.actName || act.id}_video.mp4`);
                        await this.downloadFile(mergedVideo, videoPath);
                        result.files.push({ type: 'video', path: videoPath });
                    }
                }

                if (exportType === 'audio' || exportType === 'both') {
                    if (audioUrls.length > 0) {
                        const mergedAudio = await this.mergeAudios(audioUrls, `act_${act.id}_audio`);
                        const audioPath = path.join(actDir, `${act.actName || act.id}_audio.mp3`);
                        await this.downloadFile(mergedAudio, audioPath);
                        result.files.push({ type: 'audio', path: audioPath });
                    }
                }

                exportResults.push(result);
            }

            return {
                outputDir: baseDir,
                acts: exportResults,
            };
        } catch (error) {
            if (error instanceof NotFoundError || error instanceof AppError) {
                throw error;
            }
            logger.error('Export acts error:', error);
            throw new AppError('Failed to export acts', 500);
        }
    }

    /**
     * 13. 导出单个视频或音频到指定目录
     * @param {string} projectId - 项目ID
     * @param {string} userId - 用户ID
     * @param {Object} options - 选项 { type = 'video', url, outputDir = null, fileName = null }
     * @returns {Promise<Object>} - 导出结果
     */
    async exportSingleMedia(projectId, userId, options = {}) {
        const { type = 'video', url, outputDir = null, fileName = null } = options;

        try {
            if (!url) {
                throw new AppError('Media URL is required', 400);
            }

            const baseDir = outputDir || path.join(config.fileStorage.localPath, 'exports');
            await fs.mkdir(baseDir, { recursive: true });

            const ext = type === 'video' ? 'mp4' : 'mp3';
            const finalFileName = fileName || `media_${Date.now()}.${ext}`;
            const filePath = path.join(baseDir, finalFileName);

            await this.downloadFile(url, filePath);

            return {
                type,
                url,
                filePath,
                fileName: finalFileName,
            };
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            logger.error('Export single media error:', error);
            throw new AppError('Failed to export single media', 500);
        }
    }

    // ========== 辅助方法 ==========

    /**
     * 合并多个视频
     */
    async mergeVideos(videoUrls, outputId) {
        // 这里需要使用ffmpeg合并视频
        // 暂时返回第一个视频URL，实际实现需要使用ffmpeg
        logger.warn('Video merging not fully implemented, returning first video');
        return videoUrls[0];
    }

    /**
     * 合并多个音频
     */
    async mergeAudios(audioUrls, outputId) {
        // 这里需要使用ffmpeg合并音频
        // 暂时返回第一个音频URL，实际实现需要使用ffmpeg
        logger.warn('Audio merging not fully implemented, returning first audio');
        return audioUrls[0];
    }

    /**
     * 合并视频和音频
     */
    async mergeVideoAndAudio(videoUrl, audioUrl, outputId) {
        // 这里需要使用ffmpeg合并视频和音频
        // 暂时返回视频URL，实际实现需要使用ffmpeg
        logger.warn('Video and audio merging not fully implemented, returning video URL');
        return videoUrl;
    }

    /**
     * 下载文件
     */
    async downloadFile(url, filePath) {
        const axios = require('axios');
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        await fs.writeFile(filePath, Buffer.from(response.data));
        return filePath;
    }

    /**
     * 查询镜头视频生成任务进度
     * @param {string} taskId - 任务ID
     * @param {string} userId - 用户ID
     * @returns {Promise<Object>} - 任务信息
     */
    async getShotVideoTaskProgress(taskId, userId) {
        const prisma = getPrisma();

        try {
            const task = await prisma.shotVideoTask.findFirst({
                where: {
                    id: taskId,
                    userId,
                },
                include: {
                    shot: {
                        select: {
                            id: true,
                            shotId: true,
                            characterAction: true,
                            cameraAngle: true,
                        },
                    },
                    act: {
                        select: {
                            id: true,
                            actName: true,
                            order: true,
                        },
                    },
                },
            });

            if (!task) {
                throw new NotFoundError('Task not found');
            }

            const metadata = task.metadata ? this.safeParseJSON(task.metadata, {}) : null;

            return {
                taskId: task.id,
                shotId: task.shotId,
                actId: task.actId,
                actName: task.act.actName,
                shotInfo: {
                    shotId: task.shot.shotId,
                    characterAction: task.shot.characterAction,
                    cameraAngle: task.shot.cameraAngle,
                },
                status: task.status,
                progress: task.progress,
                videoUrl: task.videoUrl,
                videoPath: task.videoPath,
                errorMessage: task.errorMessage,
                metadata,
                startedAt: task.startedAt,
                completedAt: task.completedAt,
                createdAt: task.createdAt,
                updatedAt: task.updatedAt,
            };
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            logger.error('Get shot video task progress error:', error);
            throw new AppError('Failed to get shot video task progress', 500);
        }
    }

    /**
     * 查询剧幕下的所有镜头视频生成任务
     * @param {string} actId - 剧幕ID
     * @param {string} userId - 用户ID
     * @param {string} status - 可选，过滤状态 'pending' | 'processing' | 'completed' | 'failed'
     * @returns {Promise<Array>} - 任务列表
     */
    async getActShotVideoTasks(actId, userId, status = null) {
        const prisma = getPrisma();

        try {
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

            const where = {
                actId,
                userId,
                ...(status && { status }),
            };

            const tasks = await prisma.shotVideoTask.findMany({
                where,
                include: {
                    shot: {
                        select: {
                            id: true,
                            shotId: true,
                            order: true,
                            characterAction: true,
                            cameraAngle: true,
                        },
                    },
                },
                orderBy: [
                    { createdAt: 'asc' },
                ],
            });

            return tasks.map(task => {
                const metadata = task.metadata ? this.safeParseJSON(task.metadata, {}) : null;
                return {
                    taskId: task.id,
                    shotId: task.shotId,
                    shotInfo: {
                        shotId: task.shot.shotId,
                        order: task.shot.order,
                        characterAction: task.shot.characterAction,
                        cameraAngle: task.shot.cameraAngle,
                    },
                    status: task.status,
                    progress: task.progress,
                    videoUrl: task.videoUrl,
                    videoPath: task.videoPath,
                    errorMessage: task.errorMessage,
                    metadata,
                    startedAt: task.startedAt,
                    completedAt: task.completedAt,
                    createdAt: task.createdAt,
                    updatedAt: task.updatedAt,
                };
            });
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            logger.error('Get act shot video tasks error:', error);
            throw new AppError('Failed to get act shot video tasks', 500);
        }
    }

    /**
     * 查询项目/小说下的所有镜头视频生成任务
     * @param {string} projectId - 项目ID
     * @param {string} novelId - 小说ID（可选）
     * @param {string} userId - 用户ID
     * @param {string} status - 可选，过滤状态
     * @returns {Promise<Array>} - 任务列表
     */
    async getProjectShotVideoTasks(projectId, novelId, userId, status = null) {
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

            const where = {
                projectId,
                userId,
                ...(novelId && { novelId }),
                ...(status && { status }),
            };

            const tasks = await prisma.shotVideoTask.findMany({
                where,
                include: {
                    shot: {
                        select: {
                            id: true,
                            shotId: true,
                            order: true,
                            characterAction: true,
                        },
                    },
                    act: {
                        select: {
                            id: true,
                            actName: true,
                            order: true,
                        },
                    },
                },
                orderBy: [
                    { act: { startChapterOrder: 'asc' } },
                    { act: { order: 'asc' } },
                    { shot: { order: 'asc' } },
                ],
            });

            return tasks.map(task => {
                const metadata = task.metadata ? this.safeParseJSON(task.metadata, {}) : null;
                return {
                    taskId: task.id,
                    shotId: task.shotId,
                    actId: task.actId,
                    actName: task.act.actName,
                    shotInfo: {
                        shotId: task.shot.shotId,
                        order: task.shot.order,
                        characterAction: task.shot.characterAction,
                    },
                    status: task.status,
                    progress: task.progress,
                    videoUrl: task.videoUrl,
                    videoPath: task.videoPath,
                    errorMessage: task.errorMessage,
                    metadata,
                    startedAt: task.startedAt,
                    completedAt: task.completedAt,
                    createdAt: task.createdAt,
                    updatedAt: task.updatedAt,
                };
            });
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            logger.error('Get project shot video tasks error:', error);
            throw new AppError('Failed to get project shot video tasks', 500);
        }
    }
}

module.exports = new MediaService();

