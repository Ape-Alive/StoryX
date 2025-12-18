const { getPrisma } = require('../utils/prisma');
const logger = require('../utils/logger');
const { NotFoundError, AppError } = require('../utils/errors');
const llmService = require('./llmService');
const projectService = require('./projectService');
const aiModelService = require('./aiModelService');
const novelService = require('./novelService');
const characterService = require('./characterService');

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
        if (response.data) {
            if (typeof response.data === 'string') {
                return response.data;
            }
            if (response.data.message) {
                return response.data.message;
            }
            if (response.data.error) {
                return typeof response.data.error === 'string'
                    ? response.data.error
                    : JSON.stringify(response.data.error);
            }
        }
        if (response.statusText) {
            return `HTTP ${response.status}: ${response.statusText}`;
        }
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

class ScriptService {
    /**
     * 启动剧本生成任务
     * @param {string} novelId - 小说ID
     * @param {string} projectId - 项目ID
     * @param {string} userId - 用户ID
     * @param {Object} config - 配置参数
     * @returns {Object} - 创建的任务列表
     */
    async startScriptGeneration(novelId, projectId, userId, config) {
        const prisma = getPrisma();

        try {
            // 验证小说属于用户和项目
            const novel = await prisma.novel.findFirst({
                where: {
                    id: novelId,
                    projectId,
                    userId,
                },
                include: {
                    chapters: {
                        orderBy: { order: 'asc' },
                    },
                },
            });

            if (!novel) {
                throw new NotFoundError('Novel not found');
            }

            const {
                selectedChapterIds = [], // 选中的章节ID列表
                taskType = 'by_chapters', // 'by_chapters' | 'by_words'
                chaptersPerTask = 1, // 每N章一个任务（默认1章）
                wordsPerTask = 4000, // 每N字一个任务（默认4000字）
                startChapter = null, // 起始章节（可选）
                endChapter = null, // 结束章节（可选）
            } = config;

            // 获取可用的章节
            let availableChapters = novel.chapters || [];

            // 如果指定了选中的章节ID，优先使用选中的章节
            if (selectedChapterIds.length > 0) {
                availableChapters = availableChapters.filter(
                    ch => selectedChapterIds.includes(ch.id)
                );
            }
            // 如果没有选中章节ID，但指定了章节范围，则按范围过滤
            else if (startChapter !== null && endChapter !== null && startChapter >= 0 && endChapter >= 0) {
                // 注意：章节的 order 通常从 1 开始，但这里使用 >= 和 <= 来匹配
                // 如果 startChapter 和 endChapter 都是 0，则跳过范围过滤（因为章节通常从 1 开始）
                if (startChapter > 0 || endChapter > 0) {
                    availableChapters = availableChapters.filter(
                        ch => ch.order >= startChapter && ch.order <= endChapter
                    );
                }
            }

            if (availableChapters.length === 0) {
                logger.error('No chapters available', {
                    novelId,
                    totalChapters: novel.chapters?.length || 0,
                    selectedChapterIds,
                    startChapter,
                    endChapter,
                });
                throw new AppError('No chapters available for script generation', 400);
            }

            // 根据任务类型分组章节
            const taskGroups = this.groupChaptersIntoTasks(
                availableChapters,
                taskType,
                taskType === 'by_chapters' ? chaptersPerTask : wordsPerTask
            );

            // 获取项目的LLM配置
            const projectWithKeys = await projectService.getProjectWithKeys(projectId, userId);

            if (!projectWithKeys.configLLM || !projectWithKeys.configLLMKey) {
                throw new AppError('LLM configuration is required for script generation', 400);
            }

            // 获取模型信息
            let model;
            try {
                model = await aiModelService.getModelById(projectWithKeys.configLLM);
            } catch (e) {
                // 如果项目配置的模型ID无效，获取第一个LLM模型
                const models = await aiModelService.getModelsByType('llm');
                if (models.length === 0) {
                    throw new AppError('No LLM model available', 400);
                }
                model = models[0];
            }

            // 创建任务
            const tasks = [];
            for (let i = 0; i < taskGroups.length; i++) {
                const group = taskGroups[i];
                const chapterIds = group.map(ch => ch.id);
                const chapterRange = this.formatChapterRange(group);
                const totalWords = group.reduce((sum, ch) => sum + ch.wordCount, 0);

                // 合并章节内容
                const chapterContents = [];
                for (const chapter of group) {
                    const chapterData = await novelService.getChapterContent(chapter.id, userId);
                    chapterContents.push(chapterData);
                }
                const combinedText = chapterContents
                    .map((ch, idx) => `## ${group[idx].title}\n\n${ch.content}`)
                    .join('\n\n');

                // 创建任务记录
                const task = await prisma.scriptTask.create({
                    data: {
                        novelId,
                        projectId,
                        userId,
                        taskType,
                        chapterIds: JSON.stringify(chapterIds),
                        chapterRange,
                        wordCount: totalWords,
                        status: 'pending',
                        progress: 0,
                    },
                });

                tasks.push({
                    taskId: task.id,
                    chapterRange,
                    wordCount: totalWords,
                    status: task.status,
                });

                // 异步处理任务（不等待完成）
                this.processScriptTask(
                    task.id,
                    combinedText,
                    model.id,
                    projectWithKeys.configLLMKey,
                    model.baseUrl,
                    model.provider.name
                ).catch(error => {
                    logger.error(`Script task ${task.id} processing error:`, error);
                    const errorMessage = getErrorMessage(error);
                    prisma.scriptTask.update({
                        where: { id: task.id },
                        data: {
                            status: 'failed',
                            errorMessage: errorMessage,
                        },
                    });
                });
            }

            logger.info('Script generation tasks created', {
                novelId,
                taskCount: tasks.length,
                taskType,
            });

            return {
                tasks,
                totalTasks: tasks.length,
            };
        } catch (error) {
            logger.error('Start script generation error:', error);
            throw error;
        }
    }

    /**
     * 将章节分组为任务
     * @param {Array} chapters - 章节列表
     * @param {string} taskType - 任务类型
     * @param {number} threshold - 阈值（章节数或字数）
     * @returns {Array} - 分组后的章节数组
     */
    groupChaptersIntoTasks(chapters, taskType, threshold) {
        const groups = [];
        let currentGroup = [];
        let currentWordCount = 0;

        for (const chapter of chapters) {
            if (taskType === 'by_chapters') {
                // 按章节数分组
                currentGroup.push(chapter);
                if (currentGroup.length >= threshold) {
                    groups.push([...currentGroup]);
                    currentGroup = [];
                }
            } else {
                // 按字数分组
                if (currentWordCount + chapter.wordCount > threshold && currentGroup.length > 0) {
                    // 当前组已满，开始新组
                    groups.push([...currentGroup]);
                    currentGroup = [chapter];
                    currentWordCount = chapter.wordCount;
                } else {
                    currentGroup.push(chapter);
                    currentWordCount += chapter.wordCount;
                }
            }
        }

        // 添加最后一组
        if (currentGroup.length > 0) {
            groups.push(currentGroup);
        }

        return groups;
    }

    /**
     * 格式化章节范围描述
     * @param {Array} chapters - 章节列表
     * @returns {string} - 章节范围描述
     */
    formatChapterRange(chapters) {
        if (chapters.length === 0) return '';
        if (chapters.length === 1) {
            return `第${chapters[0].order}章`;
        }
        return `第${chapters[0].order}-${chapters[chapters.length - 1].order}章`;
    }

    /**
     * 处理剧本生成任务
     * @param {string} taskId - 任务ID
     * @param {string} text - 文本内容
     * @param {string} modelId - 模型ID
     * @param {string} apiKey - API密钥
     * @param {string} baseUrl - API基础URL
     * @param {string} providerName - 提供商名称
     */
    async processScriptTask(taskId, text, modelId, apiKey, baseUrl, providerName) {
        const prisma = getPrisma();

        try {
            // 更新任务状态为处理中
            await prisma.scriptTask.update({
                where: { id: taskId },
                data: {
                    status: 'processing',
                    progress: 10,
                    startedAt: new Date(),
                },
            });

            // 调用LLM生成结构化剧本
            const scriptData = await llmService.generateStructuredScript(
                text,
                modelId,
                apiKey,
                baseUrl,
                providerName
            );

            // 更新任务进度
            await prisma.scriptTask.update({
                where: { id: taskId },
                data: {
                    progress: 80,
                },
            });

            // 保存结果
            await prisma.scriptTask.update({
                where: { id: taskId },
                data: {
                    status: 'completed',
                    progress: 100,
                    result: JSON.stringify(scriptData),
                    completedAt: new Date(),
                },
            });

            // 并行处理角色数据（角色处理独立于剧幕处理）
            try {
                await this.processCharactersFromScript(taskId, scriptData);
                logger.info(`Successfully processed characters for task ${taskId}`);
            } catch (charError) {
                // 角色处理失败不影响任务完成状态，只记录日志
                logger.error(`Failed to process characters for task ${taskId}:`, {
                    error: charError.message,
                    stack: charError.stack,
                    scriptDataKeys: Object.keys(scriptData || {}),
                    characterSettingsCount: scriptData?.character_settings?.length || 0,
                });
            }

            // 按 Act 顺序处理：每个 Act 插入成功后，立即处理其 Scene 和 Shot
            // 确保所有 Act 都被处理，不遗漏任何一个
            await this.processActsWithScenesAndShots(taskId, scriptData);

            // 数据一致性检查：验证 Scene 和 Shot 的关联
            try {
                await this.validateDataConsistency(taskId);
            } catch (validationError) {
                // 验证失败不影响任务完成状态，只记录警告
                logger.warn(`Data consistency validation failed for task ${taskId}:`, validationError);
            }

            logger.info(`Script task ${taskId} completed successfully`);
        } catch (error) {
            logger.error(`Script task ${taskId} processing error:`, error);
            const errorMessage = getErrorMessage(error);
            await prisma.scriptTask.update({
                where: { id: taskId },
                data: {
                    status: 'failed',
                    errorMessage: errorMessage,
                    progress: 0,
                },
            });
            throw error;
        }
    }

    /**
     * 验证数据一致性：检查 Scene 和 Shot 的关联是否正确
     * @param {string} taskId - 任务ID
     */
    async validateDataConsistency(taskId) {
        const prisma = getPrisma();

        try {
            // 获取任务关联的所有 Act
            const acts = await prisma.act.findMany({
                where: { scriptTaskId: taskId },
                include: {
                    scenes: true,
                    shots: true,
                },
            });

            let issues = [];

            for (const act of acts) {
                // 检查每个 Scene 的 shotIds 是否与实际 Shot 记录匹配
                for (const scene of act.scenes) {
                    const sceneShotIds = scene.shotIds ? JSON.parse(scene.shotIds) : [];
                    const actualShots = act.shots.filter(shot => shot.sceneId === scene.id);

                    // 检查 shotIds 数组中的 ID 是否都存在
                    for (const shotId of sceneShotIds) {
                        const shotExists = actualShots.some(shot => shot.id === shotId);
                        if (!shotExists) {
                            issues.push(`Scene ${scene.id} references shot ${shotId} that doesn't exist or isn't linked to this scene`);
                        }
                    }

                    // 检查实际 Shot 记录的 sceneId 是否与 Scene 匹配
                    for (const shot of actualShots) {
                        if (!sceneShotIds.includes(shot.id)) {
                            issues.push(`Shot ${shot.id} is linked to scene ${scene.id} but not in scene's shotIds array`);
                        }
                    }
                }

                // 检查是否有 Shot 的 sceneId 指向不存在的 Scene
                for (const shot of act.shots) {
                    if (shot.sceneId) {
                        const sceneExists = act.scenes.some(scene => scene.id === shot.sceneId);
                        if (!sceneExists) {
                            issues.push(`Shot ${shot.id} references scene ${shot.sceneId} that doesn't exist in act ${act.id}`);
                        }
                    }
                }
            }

            if (issues.length > 0) {
                logger.warn(`Data consistency issues found for task ${taskId}:`, issues);
                return { valid: false, issues };
            } else {
                logger.info(`Data consistency validation passed for task ${taskId}`);
                return { valid: true, issues: [] };
            }
        } catch (error) {
            logger.error(`Error validating data consistency for task ${taskId}:`, error);
            throw error;
        }
    }

    /**
     * 获取小说的所有剧本生成任务
     * @param {string} novelId - 小说ID
     * @param {string} userId - 用户ID
     * @returns {Array} - 任务列表
     */
    async getNovelScriptTasks(novelId, userId) {
        try {
            const prisma = getPrisma();

            // 验证小说属于用户
            const novel = await prisma.novel.findFirst({
                where: {
                    id: novelId,
                    userId,
                },
            });

            if (!novel) {
                throw new NotFoundError('Novel not found');
            }

            const tasks = await prisma.scriptTask.findMany({
                where: {
                    novelId,
                    userId,
                },
                orderBy: { createdAt: 'desc' },
            });

            return tasks.map(task => ({
                taskId: task.id,
                chapterRange: task.chapterRange,
                wordCount: task.wordCount,
                status: task.status,
                progress: task.progress,
                result: task.result ? JSON.parse(task.result) : null,
                errorMessage: task.errorMessage,
                startedAt: task.startedAt,
                completedAt: task.completedAt,
                createdAt: task.createdAt,
            }));
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            logger.error('Get novel script tasks error:', error);
            throw new AppError('Failed to get script tasks', 500);
        }
    }

    /**
     * 获取单个任务详情
     * @param {string} taskId - 任务ID
     * @param {string} userId - 用户ID
     * @returns {Object} - 任务详情
     */
    async getScriptTask(taskId, userId) {
        try {
            const prisma = getPrisma();

            const task = await prisma.scriptTask.findFirst({
                where: {
                    id: taskId,
                    userId,
                },
            });

            if (!task) {
                throw new NotFoundError('Script task not found');
            }

            return {
                taskId: task.id,
                novelId: task.novelId,
                projectId: task.projectId,
                taskType: task.taskType,
                chapterIds: JSON.parse(task.chapterIds),
                chapterRange: task.chapterRange,
                wordCount: task.wordCount,
                status: task.status,
                progress: task.progress,
                result: task.result ? JSON.parse(task.result) : null,
                errorMessage: task.errorMessage,
                startedAt: task.startedAt,
                completedAt: task.completedAt,
                createdAt: task.createdAt,
                updatedAt: task.updatedAt,
            };
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            logger.error('Get script task error:', error);
            throw new AppError('Failed to get script task', 500);
        }
    }

    /**
     * 从剧本数据中处理角色：提取角色、关联镜头ID、存储到数据库
     * @param {string} taskId - 任务ID
     * @param {Object} scriptData - 剧本数据
     */
    async processCharactersFromScript(taskId, scriptData) {
        const prisma = getPrisma();

        try {
            // 获取任务信息
            const task = await prisma.scriptTask.findUnique({
                where: { id: taskId },
                select: {
                    novelId: true,
                    projectId: true,
                    userId: true,
                },
            });

            if (!task) {
                throw new AppError('Script task not found', 404);
            }

            const { novelId, projectId, userId } = task;

            // 提取所有镜头ID，建立角色名到镜头ID的映射
            const characterShotMap = {}; // { characterName: [shotIds] }
            // 建立角色ID到角色名的映射
            const characterIdToNameMap = {};
            if (scriptData.character_settings && Array.isArray(scriptData.character_settings)) {
                for (const char of scriptData.character_settings) {
                    if (char.id && char.name) {
                        characterIdToNameMap[char.id] = char.name;
                    }
                }
            }

            if (scriptData.plot_outline && Array.isArray(scriptData.plot_outline)) {
                for (const act of scriptData.plot_outline) {
                    if (act.shots && Array.isArray(act.shots)) {
                        for (const shot of act.shots) {
                            const shotId = shot.id;
                            if (!shotId) continue;

                            // 从 dialogue 中提取角色名
                            if (shot.dialogue && Array.isArray(shot.dialogue)) {
                                for (const dialogue of shot.dialogue) {
                                    const characterName = dialogue.name;
                                    if (characterName) {
                                        if (!characterShotMap[characterName]) {
                                            characterShotMap[characterName] = [];
                                        }
                                        if (!characterShotMap[characterName].includes(shotId)) {
                                            characterShotMap[characterName].push(shotId);
                                        }
                                    }
                                }
                            }

                            // 从 character_ids 中提取角色ID（如果存在）
                            if (shot.character_ids && Array.isArray(shot.character_ids)) {
                                for (const charId of shot.character_ids) {
                                    const characterName = characterIdToNameMap[charId];
                                    if (characterName) {
                                        if (!characterShotMap[characterName]) {
                                            characterShotMap[characterName] = [];
                                        }
                                        if (!characterShotMap[characterName].includes(shotId)) {
                                            characterShotMap[characterName].push(shotId);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // 处理角色设置
            if (!scriptData.character_settings || !Array.isArray(scriptData.character_settings)) {
                logger.warn(`No character_settings found in script data for task ${taskId}`);
                return;
            }

            logger.info(`Processing ${scriptData.character_settings.length} characters for task ${taskId}`);

            for (const charData of scriptData.character_settings) {
                const characterName = charData.name;
                if (!characterName) {
                    logger.warn(`Character data missing name field, skipping:`, charData);
                    continue;
                }

                const shotIds = characterShotMap[characterName] || [];

                try {
                    // 处理 personality 字段：如果是数组或对象，转换为 JSON 字符串；如果是字符串，直接使用
                    let personalityValue = null;
                    if (charData.personality) {
                        if (typeof charData.personality === 'string') {
                            personalityValue = charData.personality;
                        } else if (Array.isArray(charData.personality)) {
                            personalityValue = JSON.stringify(charData.personality);
                        } else if (typeof charData.personality === 'object') {
                            personalityValue = JSON.stringify(charData.personality);
                        } else {
                            personalityValue = String(charData.personality);
                        }
                    }

                    // 构建角色数据
                    const characterData = {
                        name: characterName,
                        age: charData.age ? String(charData.age) : null, // 确保 age 是字符串
                        appearance: charData.appearance || null,
                        gender: charData.gender || null,
                        clothingStyle: charData.clothingStyle || null,
                        personality: personalityValue,
                        background: charData.background || null,
                        description: charData.description ||
                            (charData.background ? `${charData.background}` : null),
                        projectId: projectId,
                        novelId: novelId,
                        taskId: taskId,
                        shotIds: shotIds.length > 0 ? JSON.stringify(shotIds) : null,
                    };

                    // 检查角色是否已存在（同一用户、同一项目、同一小说、同名）
                    // 注意：不包含 taskId，这样不同任务的角色可以自动合并
                    const whereClause = {
                        userId,
                        name: characterName,
                    };

                    if (projectId) {
                        whereClause.projectId = projectId;
                    } else {
                        whereClause.projectId = null;
                    }

                    if (novelId) {
                        whereClause.novelId = novelId;
                    } else {
                        whereClause.novelId = null;
                    }

                    // 不包含 taskId 在查找条件中，允许不同任务的角色合并
                    const existingCharacter = await prisma.character.findFirst({
                        where: whereClause,
                    });

                    // 使用 findFirst 查找现有角色，然后使用 upsert 或 update
                    // 注意：Character 表有 @@unique([userId, name, projectId]) 约束
                    // 我们需要先查找，然后决定是更新还是创建
                    if (existingCharacter) {
                        // 更新现有角色：合并 shotIds（去重）
                        let existingShotIds = [];
                        if (existingCharacter.shotIds) {
                            try {
                                existingShotIds = JSON.parse(existingCharacter.shotIds);
                            } catch (e) {
                                existingShotIds = [];
                            }
                        }
                        const mergedShotIds = [...new Set([...existingShotIds, ...shotIds])];

                        // 仅在有新值时更新可为空的字段，避免新数据为空覆盖旧数据
                        const mergedData = { ...characterData };
                        if (!characterData.appearance) mergedData.appearance = existingCharacter.appearance;
                        if (!characterData.gender) mergedData.gender = existingCharacter.gender;
                        if (!characterData.clothingStyle) mergedData.clothingStyle = existingCharacter.clothingStyle;
                        if (!characterData.background) mergedData.background = existingCharacter.background;
                        if (!characterData.description) mergedData.description = existingCharacter.description;
                        if (!characterData.age) mergedData.age = existingCharacter.age;
                        if (!characterData.personality) mergedData.personality = existingCharacter.personality;

                        // 更新角色信息，包括新的 taskId（如果不同）
                        // 注意：如果 existingCharacter.taskId 不为空且与新 taskId 不同，
                        // 我们保留原有的 taskId，或者可以更新为最新的 taskId
                        // 这里选择更新为最新的 taskId，表示该角色在最新的任务中被使用
                        await prisma.character.update({
                            where: { id: existingCharacter.id },
                            data: {
                                ...mergedData,
                                shotIds: mergedShotIds.length > 0 ? JSON.stringify(mergedShotIds) : null,
                                // taskId 更新为最新的任务ID（表示该角色在最新任务中被使用）
                                taskId: taskId,
                            },
                        });
                        logger.info(`Character merged and updated: ${characterName} (existing taskId: ${existingCharacter.taskId}, new taskId: ${taskId}), merged shotIds: ${mergedShotIds.length}`);
                    } else {
                        // 创建新角色（使用 try-catch 处理可能的并发冲突）
                        try {
                            const newCharacter = await prisma.character.create({
                                data: {
                                    userId,
                                    ...characterData,
                                },
                            });
                            logger.info(`Character created: ${characterName} (${newCharacter.id}) for task ${taskId}, shotIds: ${shotIds.length}`);
                        } catch (createError) {
                            // 如果是唯一约束冲突，说明已存在相同用户、项目、名称的角色
                            // 重新查找（不包含 taskId）并合并更新
                            if (createError.code === 'P2002' || createError.message.includes('Unique constraint')) {
                                // 使用不包含 taskId 的查找条件，找到已存在的角色（可能来自不同任务）
                                const concurrentCharacter = await prisma.character.findFirst({
                                    where: whereClause, // whereClause 不包含 taskId
                                });
                                if (concurrentCharacter) {
                                    // 合并 shotIds
                                    let existingShotIds = [];
                                    if (concurrentCharacter.shotIds) {
                                        try {
                                            existingShotIds = JSON.parse(concurrentCharacter.shotIds);
                                        } catch (e) {
                                            existingShotIds = [];
                                        }
                                    }
                                    const mergedShotIds = [...new Set([...existingShotIds, ...shotIds])];

                                    const mergedData = { ...characterData };
                                    if (!characterData.appearance) mergedData.appearance = concurrentCharacter.appearance;
                                    if (!characterData.gender) mergedData.gender = concurrentCharacter.gender;
                                    if (!characterData.clothingStyle) mergedData.clothingStyle = concurrentCharacter.clothingStyle;
                                    if (!characterData.background) mergedData.background = concurrentCharacter.background;
                                    if (!characterData.description) mergedData.description = concurrentCharacter.description;
                                    if (!characterData.age) mergedData.age = concurrentCharacter.age;
                                    if (!characterData.personality) mergedData.personality = concurrentCharacter.personality;

                                    // 更新角色信息，包括新的 taskId
                                    await prisma.character.update({
                                        where: { id: concurrentCharacter.id },
                                        data: {
                                            ...mergedData,
                                            shotIds: mergedShotIds.length > 0 ? JSON.stringify(mergedShotIds) : null,
                                            // 更新 taskId 为最新的任务ID
                                            taskId: taskId,
                                        },
                                    });
                                    logger.info(`Character merged after unique constraint conflict: ${characterName} (existing taskId: ${concurrentCharacter.taskId}, new taskId: ${taskId}), merged shotIds: ${mergedShotIds.length}`);
                                } else {
                                    // 理论上不应该到这里，因为唯一约束冲突说明角色一定存在
                                    logger.warn(`Unique constraint conflict for character ${characterName} but could not find existing character`);
                                }
                            } else {
                                logger.error(`Failed to create character ${characterName} for task ${taskId}:`, {
                                    error: createError.message,
                                    characterData,
                                    whereClause,
                                });
                                // 继续处理下一个角色，不中断整个流程
                            }
                        }
                    }
                } catch (charError) {
                    logger.error(`Error processing character ${charData.name || 'unknown'} for task ${taskId}:`, {
                        error: charError.message,
                        stack: charError.stack,
                        charData,
                    });
                    // 继续处理下一个角色，不中断整个流程
                }
            }

            logger.info(`Processed characters from script task ${taskId}`);
        } catch (error) {
            logger.error(`Error processing characters from script:`, error);
            throw error;
        }
    }

    /**
     * 重新生成剧本数据结构
     * @param {string} taskId - 任务ID
     * @param {string} projectId - 项目ID
     * @param {string} novelId - 小说ID
     * @param {string} userId - 用户ID
     * @returns {Object} - 生成的任务信息
     */
    /**
     * 重新生成剧本数据结构
     * @param {string} taskId - 原任务ID
     * @param {string} projectId - 项目ID
     * @param {string} novelId - 小说ID
     * @param {string} userId - 用户ID
     * @param {boolean} overwrite - 是否覆盖原任务的产物（默认true）
     * @returns {Promise<Object>} - 新任务信息
     */
    async regenerateScript(taskId, projectId, novelId, userId, overwrite = true) {
        const prisma = getPrisma();

        try {
            // 验证任务存在且属于该用户
            const existingTask = await prisma.scriptTask.findFirst({
                where: {
                    id: taskId,
                    userId,
                    projectId,
                    novelId,
                },
                include: {
                    acts: {
                        select: { id: true },
                    },
                },
            });

            if (!existingTask) {
                throw new NotFoundError('Script task not found');
            }

            // 如果选择覆盖，删除原任务关联的所有产物
            if (overwrite) {
                // 1. 获取所有关联的 Act ID
                const acts = await prisma.act.findMany({
                    where: {
                        scriptTaskId: taskId,
                    },
                    select: { id: true },
                });
                const actIds = acts.map(act => act.id);

                // 2. 获取所有关联的 Scene ID（通过 ActScene 中间表）
                const actScenes = await prisma.actScene.findMany({
                    where: {
                        actId: { in: actIds },
                    },
                    select: { sceneId: true },
                });
                const sceneIds = [...new Set(actScenes.map(as => as.sceneId))];

                // 3. 删除所有关联的 Act（级联删除会同时删除 ActScene、Shot、ShotVideoTask 等）
                await prisma.act.deleteMany({
                    where: {
                        scriptTaskId: taskId,
                    },
                });

                // 4. 删除只关联到该任务的 Scene（如果 Scene 没有其他 Act 关联，则删除）
                if (sceneIds.length > 0) {
                    // 查找所有只关联到被删除 Act 的 Scene
                    const orphanedScenes = await prisma.scene.findMany({
                        where: {
                            id: { in: sceneIds },
                        },
                        include: {
                            acts: {
                                select: { id: true },
                            },
                        },
                    });

                    // 删除没有其他 Act 关联的 Scene
                    const scenesToDelete = orphanedScenes
                        .filter(scene => scene.acts.length === 0)
                        .map(scene => scene.id);

                    if (scenesToDelete.length > 0) {
                        await prisma.scene.deleteMany({
                            where: {
                                id: { in: scenesToDelete },
                            },
                        });
                        logger.info(`Deleted ${scenesToDelete.length} orphaned scenes for task ${taskId}`);
                    }
                }

                // 5. 删除关联的角色（Character 通过 taskId 字段关联）
                const deletedCharacters = await prisma.character.deleteMany({
                    where: {
                        taskId: taskId,
                    },
                });

                logger.info(`Deleted all acts (${actIds.length}), scenes, and characters (${deletedCharacters.count}) for task ${taskId} (overwrite mode)`);
            }

            // 获取任务的章节内容
            const chapterIds = JSON.parse(existingTask.chapterIds);
            const chapterContents = [];

            for (const chapterId of chapterIds) {
                const chapterData = await novelService.getChapterContent(chapterId, userId);
                chapterContents.push(chapterData);
            }

            // 合并章节内容
            const combinedText = chapterContents
                .map((ch, idx) => {
                    const chapter = chapterContents[idx];
                    return `## ${chapter.title}\n\n${chapter.content}`;
                })
                .join('\n\n');

            // 获取项目配置
            const projectWithKeys = await projectService.getProjectWithKeys(projectId, userId);
            if (!projectWithKeys) {
                throw new NotFoundError('Project not found');
            }

            // 获取模型信息
            let model;
            try {
                model = await aiModelService.getModelById(projectWithKeys.configLLM);
            } catch (e) {
                const models = await aiModelService.getModelsByType('llm');
                if (models.length === 0) {
                    throw new AppError('No LLM model available', 400);
                }
                model = models[0];
            }

            const apiKey = projectWithKeys.configLLMKey;
            const baseUrl = model.baseUrl || 'https://api.openai.com/v1';
            const providerName = model.provider.name.toLowerCase();

            // 创建新的任务记录（状态为 pending）
            const newTask = await prisma.scriptTask.create({
                data: {
                    novelId,
                    projectId,
                    userId,
                    taskType: existingTask.taskType,
                    chapterIds: existingTask.chapterIds,
                    chapterRange: existingTask.chapterRange,
                    wordCount: existingTask.wordCount,
                    status: 'pending',
                    progress: 0,
                },
            });

            // 异步处理任务
            this.processScriptTask(
                newTask.id,
                combinedText,
                model.id,
                apiKey,
                baseUrl,
                providerName
            ).catch(error => {
                logger.error(`Regenerated script task ${newTask.id} processing error:`, error);
            });

            return {
                taskId: newTask.id,
                novelId: newTask.novelId,
                projectId: newTask.projectId,
                taskType: newTask.taskType,
                chapterRange: newTask.chapterRange,
                wordCount: newTask.wordCount,
                status: newTask.status,
                progress: newTask.progress,
                overwrite,
                createdAt: newTask.createdAt,
            };
        } catch (error) {
            if (error instanceof NotFoundError || error instanceof AppError) {
                throw error;
            }
            logger.error('Regenerate script error:', error);
            throw new AppError('Failed to regenerate script', 500);
        }
    }

    /**
     * 获取小说的所有剧幕（按章节顺序排序）
     * @param {string} novelId - 小说ID
     * @param {string} userId - 用户ID
     * @returns {Array} - 剧幕列表（按章节顺序排序）
     */
    async getNovelActs(novelId, userId) {
        try {
            const prisma = getPrisma();

            // 验证小说属于用户
            const novel = await prisma.novel.findFirst({
                where: {
                    id: novelId,
                    userId,
                },
            });

            if (!novel) {
                throw new NotFoundError('Novel not found');
            }

            // 获取所有剧幕，按起始章节顺序号排序（如果为null则排在最后）
            const acts = await prisma.act.findMany({
                where: {
                    novelId,
                    userId,
                },
                include: {
                    scenes: {
                        orderBy: { order: 'asc' },
                    },
                },
                orderBy: [
                    { startChapterOrder: 'asc' }, // 首先按起始章节顺序号排序
                    { order: 'asc' }, // 如果 startChapterOrder 相同或为null，则按 order 排序
                    { createdAt: 'asc' }, // 最后按创建时间排序
                ],
            });

            return acts.map(act => ({
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
                scenes: act.scenes.map(scene => ({
                    id: scene.id,
                    actId: scene.actId,
                    address: scene.address,
                    sceneDescription: scene.sceneDescription,
                    sceneImage: scene.sceneImage,
                    order: scene.order,
                })),
                createdAt: act.createdAt,
                updatedAt: act.updatedAt,
            }));
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            logger.error('Get novel acts error:', error);
            throw new AppError('Failed to get novel acts', 500);
        }
    }

    /**
     * 重试机制：执行函数，失败时自动重试
     * @param {Function} fn - 要执行的函数
     * @param {number} maxRetries - 最大重试次数
     * @param {number} delay - 重试延迟（毫秒）
     * @returns {Promise} - 执行结果
     */
    async retryOperation(fn, maxRetries = 3, delay = 1000) {
        let lastError;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error;
                if (attempt < maxRetries) {
                    logger.warn(`Operation failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`, error.message);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    delay *= 2; // 指数退避
                }
            }
        }
        throw lastError;
    }

    /**
     * 按 Act 顺序处理：每个 Act 插入成功后，立即处理其 Scene 和 Shot
     * 确保所有 Act 都被处理，不遗漏任何一个
     * @param {string} taskId - 任务ID
     * @param {Object} scriptData - 剧本数据
     */
    async processActsWithScenesAndShots(taskId, scriptData) {
        const prisma = getPrisma();

        try {
            // 获取任务信息
            const task = await prisma.scriptTask.findUnique({
                where: { id: taskId },
                select: {
                    novelId: true,
                    projectId: true,
                    userId: true,
                    chapterIds: true,
                },
            });

            if (!task) {
                throw new AppError('Script task not found', 404);
            }

            const { novelId, projectId, userId, chapterIds } = task;

            // 计算起始章节顺序号
            let startChapterOrder = null;
            if (chapterIds) {
                try {
                    const chapterIdArray = JSON.parse(chapterIds);
                    if (Array.isArray(chapterIdArray) && chapterIdArray.length > 0) {
                        const chapters = await prisma.chapter.findMany({
                            where: {
                                id: { in: chapterIdArray },
                                novelId,
                            },
                            select: { order: true },
                        });
                        if (chapters.length > 0) {
                            startChapterOrder = Math.min(...chapters.map(ch => ch.order));
                        }
                    }
                } catch (e) {
                    logger.warn(`Failed to parse chapterIds for task ${taskId}:`, e);
                }
            }

            // 处理剧幕（plot_outline）：按 order 排序后并行处理，每个 Act 成功后立即处理其 Scene 和 Shot
            if (!scriptData.plot_outline || !Array.isArray(scriptData.plot_outline)) {
                logger.warn(`No plot_outline found in script data for task ${taskId}`);
                return;
            }

            // 按 order 字段排序（如果存在），确保处理顺序正确
            const sortedPlotOutline = [...scriptData.plot_outline].sort((a, b) => {
                // 如果有 order 字段，按 order 排序
                if (a.order !== undefined && b.order !== undefined) {
                    return a.order - b.order;
                }
                // 如果没有 order 字段，保持原顺序（按数组索引）
                return 0;
            });

            const processedActIds = [];
            const failedActs = [];

            // 并行处理所有 Act（但每个 Act 内部按顺序处理 Scene 和 Shot）
            const actPromises = sortedPlotOutline.map(async (actData, actIndex) => {
                const actId = actData.id || require('uuid').v4();
                // 使用 actData.order 或 actIndex + 1 作为 order
                const actOrder = actData.order !== undefined ? actData.order : actIndex + 1;

                try {
                    // 1. 插入或更新 Act（使用 upsert 避免并发冲突）
                    const act = await this.retryOperation(async () => {
                        // 使用 upsert 操作，避免并发时的唯一约束冲突
                        const act = await prisma.act.upsert({
                            where: {
                                id: actId, // 使用 actId 作为唯一标识
                            },
                            update: {
                                scriptTaskId: taskId,
                                actName: actData.act || `第${actIndex + 1}幕`,
                                content: actData.content || null,
                                highlight: actData.highlight || null,
                                emotionalCurve: actData.emotional_curve || null,
                                rhythm: actData.rhythm || null,
                                chapterIds: chapterIds || null,
                                order: actOrder,
                                startChapterOrder: startChapterOrder,
                                novelId,
                                projectId,
                                userId,
                            },
                            create: {
                                id: actId,
                                scriptTaskId: taskId,
                                novelId,
                                projectId,
                                userId,
                                actName: actData.act || `第${actOrder}幕`,
                                content: actData.content || null,
                                highlight: actData.highlight || null,
                                emotionalCurve: actData.emotional_curve || null,
                                rhythm: actData.rhythm || null,
                                chapterIds: chapterIds || null,
                                order: actOrder,
                                startChapterOrder: startChapterOrder,
                            },
                        });
                        logger.info(`Act upserted: ${act.actName} (${act.id}, order: ${actOrder}) for task ${taskId}`);
                        return act;
                    }, 3, 1000);

                    // 2. Act 成功后，立即处理其 Scene（带重试）
                    try {
                        await this.retryOperation(async () => {
                            await this.processScenesForAct(act, actData, novelId, projectId, userId, taskId);
                        }, 3, 1000);
                        logger.info(`Successfully processed scenes for act ${act.actName} (${act.id})`);
                    } catch (sceneError) {
                        logger.error(`Failed to process scenes for act ${act.actName} (${act.id}) after retries:`, sceneError);
                        // Scene 处理失败不影响继续处理其他 Act，但记录错误
                    }

                    // 3. Scene 处理后，立即处理其 Shot（带重试）
                    try {
                        await this.retryOperation(async () => {
                            await this.processShotsForAct(act, actData, novelId, projectId, userId, taskId);
                        }, 3, 1000);
                        logger.info(`Successfully processed shots for act ${act.actName} (${act.id})`);
                    } catch (shotError) {
                        logger.error(`Failed to process shots for act ${act.actName} (${act.id}) after retries:`, shotError);
                        // Shot 处理失败不影响继续处理其他 Act，但记录错误
                    }

                    // 返回成功结果
                    return { success: true, actId: act.id, actIndex, actOrder, actName: act.actName };

                } catch (actError) {
                    // Act 处理失败，记录错误
                    const errorMsg = `Failed to process act ${actOrder} (${actId}) for task ${taskId} after retries: ${actError.message}`;
                    logger.error(errorMsg, actError);
                    return { success: false, actId, actIndex, actOrder, error: actError.message };
                }
            });

            // 等待所有 Act 处理完成（使用 allSettled 确保即使部分失败也能继续）
            const results = await Promise.allSettled(actPromises);

            // 统计处理结果
            results.forEach((settledResult, index) => {
                if (settledResult.status === 'fulfilled') {
                    const result = settledResult.value;
                    if (result.success) {
                        processedActIds.push(result.actId);
                    } else {
                        failedActs.push({ index: result.actIndex, id: result.actId, order: result.actOrder, error: result.error });
                    }
                } else {
                    // Promise 被拒绝（这种情况不应该发生，因为内部已经处理了错误）
                    const actData = sortedPlotOutline[index];
                    const actId = actData?.id || 'unknown';
                    const actOrder = actData?.order !== undefined ? actData.order : index + 1;
                    failedActs.push({
                        index,
                        id: actId,
                        order: actOrder,
                        error: settledResult.reason?.message || 'Promise rejected'
                    });
                    logger.error(`Act promise rejected for act ${actOrder} (${actId}):`, settledResult.reason);
                }
            });

            // 验证所有 Act 是否都已成功处理
            if (failedActs.length > 0) {
                const errorMsg = `Failed to process ${failedActs.length} out of ${scriptData.plot_outline.length} acts for task ${taskId}. Failed acts: ${JSON.stringify(failedActs)}`;
                logger.error(errorMsg);
                throw new AppError(errorMsg, 500);
            }

            // 验证数据库中确实存在所有剧幕
            const expectedActCount = scriptData.plot_outline.length;
            const actualActCount = await prisma.act.count({
                where: { scriptTaskId: taskId },
            });

            if (actualActCount < expectedActCount) {
                const errorMsg = `Act count mismatch for task ${taskId}: expected ${expectedActCount}, but found ${actualActCount} in database`;
                logger.error(errorMsg);
                throw new AppError(errorMsg, 500);
            }

            logger.info(`Successfully processed all ${processedActIds.length} acts with scenes and shots for task ${taskId}`);
        } catch (error) {
            logger.error(`Error processing acts with scenes and shots for task ${taskId}:`, error);
            throw error;
        }
    }

    /**
     * 处理单个 Act 的场景
     * @param {Object} act - Act 数据库记录
     * @param {Object} actData - Act 数据（来自 scriptData）
     * @param {string} novelId - 小说ID
     * @param {string} projectId - 项目ID
     * @param {string} userId - 用户ID
     * @param {string} taskId - 任务ID
     */
    async processScenesForAct(act, actData, novelId, projectId, userId, taskId) {
        const prisma = getPrisma();

        // 处理场景（scene）：可能是单个对象或数组
        let scenesToProcess = [];
        if (actData.scene) {
            if (Array.isArray(actData.scene)) {
                scenesToProcess = actData.scene;
            } else {
                scenesToProcess = [actData.scene];
            }
        }

        const processedSceneIds = [];

        // 处理每个场景
        for (let sceneIndex = 0; sceneIndex < scenesToProcess.length; sceneIndex++) {
            const sceneData = scenesToProcess[sceneIndex];
            const sceneAddress = sceneData.address;
            // 使用 sceneData.order 或 sceneIndex + 1 作为 order（确保顺序正确）
            const sceneOrder = sceneData.order !== undefined ? sceneData.order : sceneIndex + 1;

            if (!sceneAddress) {
                logger.warn(`Scene ${sceneIndex + 1} has no address, skipping`);
                continue;
            }

            // 查找是否已存在相同地址的场景（在同一小说中）
            // 如果存在，则复用该场景，否则创建新场景
            let scene = await prisma.scene.findFirst({
                where: {
                    novelId: novelId,
                    address: sceneAddress,
                },
                include: {
                    acts: {
                        where: { actId: act.id },
                    },
                },
            });

            // 如果场景不存在，创建新场景（使用 upsert 避免并发冲突）
            if (!scene) {
                const sceneId = sceneData.id || require('uuid').v4();
                try {
                    scene = await prisma.scene.create({
                        data: {
                            id: sceneId,
                            novelId,
                            projectId,
                            userId,
                            address: sceneAddress,
                            sceneDescription: sceneData.sceneDescription || null,
                            sceneImage: sceneData.sceneImage || null,
                            order: sceneOrder, // 使用第一个 Act 中的顺序
                        },
                    });
                    logger.info(`Scene created: ${scene.address} (${scene.id}) for novel ${novelId}`);
                } catch (createError) {
                    // 如果创建失败（可能是并发创建），重新查找
                    if (createError.code === 'P2002' || createError.message.includes('Unique constraint')) {
                        scene = await prisma.scene.findFirst({
                            where: {
                                novelId: novelId,
                                address: sceneAddress,
                            },
                            include: {
                                acts: {
                                    where: { actId: act.id },
                                },
                            },
                        });
                        if (scene) {
                            logger.info(`Scene found after concurrent create attempt: ${scene.address} (${scene.id})`);
                        }
                    } else {
                        throw createError;
                    }
                }
            }

            if (scene) {
                // 场景已存在，更新描述和图片（如果提供了新的）
                if (sceneData.sceneDescription && !scene.sceneDescription) {
                    scene = await prisma.scene.update({
                        where: { id: scene.id },
                        data: {
                            sceneDescription: sceneData.sceneDescription,
                        },
                    });
                }
                if (sceneData.sceneImage && !scene.sceneImage) {
                    scene = await prisma.scene.update({
                        where: { id: scene.id },
                        data: {
                            sceneImage: sceneData.sceneImage,
                        },
                    });
                }
                logger.info(`Scene reused: ${scene.address} (${scene.id}) for act ${act.actName}`);
            }

            // 使用 findFirst + create/update 模式，但添加错误处理以避免并发冲突
            const existingActScene = await prisma.actScene.findFirst({
                where: {
                    actId: act.id,
                    sceneId: scene.id,
                },
            });

            if (!existingActScene) {
                // 创建 Act 和 Scene 的关联（添加错误处理以避免并发冲突）
                try {
                    await prisma.actScene.create({
                        data: {
                            actId: act.id,
                            sceneId: scene.id,
                            order: sceneOrder, // 场景在该 Act 中的顺序
                        },
                    });
                    logger.info(`Act ${act.actName} (${act.id}) linked to scene ${scene.address} (${scene.id})`);
                } catch (createError) {
                    // 如果是唯一约束冲突，说明并发创建了，重新查找并更新
                    if (createError.code === 'P2002' || createError.message.includes('Unique constraint')) {
                        const concurrentActScene = await prisma.actScene.findFirst({
                            where: {
                                actId: act.id,
                                sceneId: scene.id,
                            },
                        });
                        if (concurrentActScene && concurrentActScene.order !== sceneOrder) {
                            await prisma.actScene.update({
                                where: { id: concurrentActScene.id },
                                data: { order: sceneOrder },
                            });
                            logger.info(`ActScene order updated after concurrent create: ${act.actName} -> ${scene.address}`);
                        } else if (concurrentActScene) {
                            logger.info(`ActScene already exists: ${act.actName} -> ${scene.address}`);
                        }
                    } else {
                        throw createError;
                    }
                }
            } else {
                // 更新顺序（如果变化了）
                if (existingActScene.order !== sceneOrder) {
                    await prisma.actScene.update({
                        where: { id: existingActScene.id },
                        data: { order: sceneOrder },
                    });
                    logger.info(`ActScene order updated: ${act.actName} -> ${scene.address}`);
                }
            }

            // 提取关联的镜头ID（用于更新 Scene 的 shotIds）
            // 注意：使用原始的 sceneData.id 进行匹配（因为 shots 中的 scene_id 引用的是原始 ID）
            const shotIds = [];
            if (actData.shots && Array.isArray(actData.shots)) {
                // 使用原始 sceneData.id 进行匹配（如果存在）
                const originalSceneId = sceneData.id;
                for (const shot of actData.shots) {
                    // 匹配 scene_id：优先匹配原始 sceneData.id
                    if (shot.scene_id === originalSceneId) {
                        if (shot.id && !shotIds.includes(shot.id)) {
                            shotIds.push(shot.id);
                        }
                    }
                }
            }

            // 更新 Scene 的 shotIds（合并所有关联 Act 的镜头）
            if (shotIds.length > 0) {
                let existingShotIds = [];
                if (scene.shotIds) {
                    try {
                        existingShotIds = JSON.parse(scene.shotIds);
                    } catch (e) {
                        existingShotIds = [];
                    }
                }
                // 合并并去重
                const mergedShotIds = [...new Set([...existingShotIds, ...shotIds])];
                await prisma.scene.update({
                    where: { id: scene.id },
                    data: {
                        shotIds: JSON.stringify(mergedShotIds),
                    },
                });
            }

            processedSceneIds.push(scene.id);
        }

        logger.info(`Processed ${processedSceneIds.length} scenes for act ${act.actName} (${act.id})`);
    }

    /**
     * 处理单个 Act 的镜头
     * @param {Object} act - Act 数据库记录
     * @param {Object} actData - Act 数据（来自 scriptData）
     * @param {string} novelId - 小说ID
     * @param {string} projectId - 项目ID
     * @param {string} userId - 用户ID
     * @param {string} taskId - 任务ID
     */
    async processShotsForAct(act, actData, novelId, projectId, userId, taskId) {
        const prisma = getPrisma();

        // 处理镜头（shots）
        if (!actData.shots || !Array.isArray(actData.shots)) {
            logger.warn(`No shots found for act ${act.actName} (${act.id}), actData.shots: ${JSON.stringify(actData.shots)}`);
            return;
        }

        logger.info(`Processing ${actData.shots.length} shots for act ${act.actName} (${act.id})`);
        const processedShotIds = [];

        for (let shotIndex = 0; shotIndex < actData.shots.length; shotIndex++) {
            const shotData = actData.shots[shotIndex];
            const shotId = shotData.id || require('uuid').v4();
            // 使用 shotData.shot_id 或 shotIndex + 1 作为 order（确保顺序正确）
            // 注意：shotData.shot_id 是镜头序号，应该优先使用它作为 order
            const shotOrder = shotData.shot_id !== undefined ? shotData.shot_id : shotIndex + 1;

            // 查找关联的场景（通过 scene_id）
            // 注意：shotData.scene_id 是原始场景 ID，需要通过地址匹配找到对应的场景
            let scene = null;
            if (shotData.scene_id) {
                // 首先尝试通过原始 scene_id 查找场景（在同一小说中）
                scene = await prisma.scene.findFirst({
                    where: {
                        id: shotData.scene_id,
                        novelId: novelId, // 确保在同一小说中
                    },
                });

                // 如果找不到，尝试通过地址匹配（作为后备方案）
                if (!scene && actData.scene) {
                    const scenesToCheck = Array.isArray(actData.scene) ? actData.scene : [actData.scene];
                    const matchingSceneData = scenesToCheck.find(s => s.id === shotData.scene_id);
                    if (matchingSceneData && matchingSceneData.address) {
                        // 通过地址匹配场景（在同一小说中）
                        scene = await prisma.scene.findFirst({
                            where: {
                                novelId: novelId,
                                address: matchingSceneData.address,
                            },
                        });
                        if (scene) {
                            logger.info(`Scene matched by address "${matchingSceneData.address}" for shot ${shotId} in act ${act.id}`);
                        }
                    }
                }

                // 验证该场景是否关联到当前 Act
                if (scene) {
                    const actSceneLink = await prisma.actScene.findFirst({
                        where: {
                            actId: act.id,
                            sceneId: scene.id,
                        },
                    });
                    if (!actSceneLink) {
                        logger.warn(`Scene ${scene.id} is not linked to act ${act.id}, but shot ${shotId} references it`);
                    }
                } else {
                    logger.warn(`Scene ${shotData.scene_id} not found for shot ${shotId} in act ${act.id}, sceneId will be null`);
                }
            }

            // 检查镜头是否已存在
            let shot = await prisma.shot.findFirst({
                where: {
                    actId: act.id,
                    OR: [
                        { id: shotId },
                        { shotId: shotData.shot_id || shotIndex + 1 },
                        { order: shotOrder },
                    ],
                },
            });

            // 处理角色列表：支持 character_list（对象数组）和 character_ids（ID数组）
            let characterListValue = null;
            let characterIdsValue = null;

            if (shotData.character_list && Array.isArray(shotData.character_list)) {
                // 直接存储 character_list 对象数组
                characterListValue = JSON.stringify(shotData.character_list);
                // 同时提取 ID 数组存储到 characterIds（向后兼容）
                const ids = shotData.character_list
                    .filter(char => char && char.id)
                    .map(char => char.id);
                if (ids.length > 0) {
                    characterIdsValue = JSON.stringify(ids);
                }
            } else if (shotData.character_ids && Array.isArray(shotData.character_ids)) {
                // 兼容旧格式：直接是 ID 数组
                characterIdsValue = JSON.stringify(shotData.character_ids);
            }

            // 准备镜头数据
            const shotRecordData = {
                shotId: shotData.shot_id || shotIndex + 1,
                duration: shotData.duration || null,
                shotType: shotData.shot_type || null,
                framing: shotData.framing || null,
                cameraAngle: shotData.camera_angle || null,
                cameraMovement: shotData.camera_movement || null,
                characterAction: shotData.character_action || null,
                action: shotData.action || null,
                expression: shotData.expression || null,
                dialogue: shotData.dialogue ? JSON.stringify(shotData.dialogue) : null,
                voiceover: shotData.voiceover || null,
                lighting: shotData.lighting || null,
                atmosphere: shotData.atmosphere || null,
                bgm: shotData.bgm || null,
                fx: shotData.fx || null,
                soundEffect: shotData.sound_effect || shotData.soundEffect || null,
                isTransition: shotData.is_transition || false,
                characterList: characterListValue,
                characterIds: characterIdsValue,
                metadata: shotData.metadata ? JSON.stringify(shotData.metadata) : null,
                order: shotOrder, // 使用 shotOrder 确保顺序正确
            };

            // 使用 upsert 避免并发冲突
            shot = await prisma.shot.upsert({
                where: {
                    id: shotId, // 使用 shotId 作为唯一标识
                },
                update: {
                    ...shotRecordData,
                    sceneId: scene ? scene.id : null,
                    actId: act.id,
                    novelId,
                    projectId,
                    userId,
                },
                create: {
                    id: shotId,
                    sceneId: scene ? scene.id : null,
                    actId: act.id,
                    novelId,
                    projectId,
                    userId,
                    ...shotRecordData,
                },
            });
            logger.info(`Shot upserted: shot_id ${shot.shotId} (${shot.id}, order: ${shotOrder}) for act ${act.actName}`);

            processedShotIds.push(shot.id);
        }

        if (processedShotIds.length === 0) {
            logger.warn(`No shots were processed for act ${act.actName} (${act.id}), expected ${actData.shots.length} shots`);
        } else {
            logger.info(`Successfully processed ${processedShotIds.length} shots for act ${act.actName} (${act.id})`);
        }
    }

    /**
     * 从剧本数据中处理剧幕：提取剧幕、存储到数据库
     * @param {string} taskId - 任务ID
     * @param {Object} scriptData - 剧本数据
     * @deprecated 使用 processActsWithScenesAndShots 替代
     */
    async processActsFromScript(taskId, scriptData) {
        const prisma = getPrisma();

        try {
            // 获取任务信息
            const task = await prisma.scriptTask.findUnique({
                where: { id: taskId },
                select: {
                    novelId: true,
                    projectId: true,
                    userId: true,
                    chapterIds: true,
                },
            });

            if (!task) {
                throw new AppError('Script task not found', 404);
            }

            const { novelId, projectId, userId, chapterIds } = task;

            // 计算起始章节顺序号：从 chapterIds 中获取章节信息，找到最小 order 值
            let startChapterOrder = null;
            if (chapterIds) {
                try {
                    const chapterIdArray = JSON.parse(chapterIds);
                    if (Array.isArray(chapterIdArray) && chapterIdArray.length > 0) {
                        // 查询这些章节的 order 值
                        const chapters = await prisma.chapter.findMany({
                            where: {
                                id: { in: chapterIdArray },
                                novelId,
                            },
                            select: {
                                order: true,
                            },
                        });

                        if (chapters.length > 0) {
                            // 取最小 order 值作为起始章节顺序号
                            startChapterOrder = Math.min(...chapters.map(ch => ch.order));
                        }
                    }
                } catch (e) {
                    logger.warn(`Failed to parse chapterIds for task ${taskId}:`, e);
                }
            }

            // 处理剧幕（plot_outline）
            if (scriptData.plot_outline && Array.isArray(scriptData.plot_outline)) {
                for (let actIndex = 0; actIndex < scriptData.plot_outline.length; actIndex++) {
                    const actData = scriptData.plot_outline[actIndex];
                    const actId = actData.id || require('uuid').v4();

                    // 检查剧幕是否已存在（通过 scriptTaskId 和 order 或 id）
                    // 使用 upsert 操作，避免并发时的唯一约束冲突
                    const act = await prisma.act.upsert({
                        where: {
                            id: actId, // 使用 actId 作为唯一标识
                        },
                        update: {
                            scriptTaskId: taskId,
                            actName: actData.act || `第${actIndex + 1}幕`,
                            content: actData.content || null,
                            highlight: actData.highlight || null,
                            emotionalCurve: actData.emotional_curve || null,
                            rhythm: actData.rhythm || null,
                            chapterIds: chapterIds || null,
                            order: actIndex + 1,
                            startChapterOrder: startChapterOrder, // 更新起始章节顺序号
                            novelId,
                            projectId,
                            userId,
                        },
                        create: {
                            id: actId,
                            scriptTaskId: taskId,
                            novelId,
                            projectId,
                            userId,
                            actName: actData.act || `第${actIndex + 1}幕`,
                            content: actData.content || null,
                            highlight: actData.highlight || null,
                            emotionalCurve: actData.emotional_curve || null,
                            rhythm: actData.rhythm || null,
                            chapterIds: chapterIds || null,
                            order: actIndex + 1,
                            startChapterOrder: startChapterOrder, // 设置起始章节顺序号
                        },
                    });
                    logger.info(`Act upserted: ${act.actName} (${act.id}) for task ${taskId}, startChapterOrder: ${startChapterOrder}`);
                }
            }

            logger.info(`Processed acts from script task ${taskId}`);
        } catch (error) {
            logger.error(`Error processing acts from script:`, error);
            throw error;
        }
    }

    /**
     * 从剧本数据中处理场景：提取场景、存储到数据库
     * 注意：scene 可能是单个对象或数组
     * @param {string} taskId - 任务ID
     * @param {Object} scriptData - 剧本数据
     */
    async processScenesFromScript(taskId, scriptData) {
        const prisma = getPrisma();

        try {
            // 获取任务信息
            const task = await prisma.scriptTask.findUnique({
                where: { id: taskId },
                select: {
                    novelId: true,
                    projectId: true,
                    userId: true,
                },
            });

            if (!task) {
                throw new AppError('Script task not found', 404);
            }

            const { novelId, projectId, userId } = task;

            // 处理剧幕中的场景（plot_outline）
            if (scriptData.plot_outline && Array.isArray(scriptData.plot_outline)) {
                for (let actIndex = 0; actIndex < scriptData.plot_outline.length; actIndex++) {
                    const actData = scriptData.plot_outline[actIndex];
                    const actId = actData.id;

                    if (!actId) {
                        logger.warn(`Act ${actIndex} has no id, skipping scene processing`);
                        continue;
                    }

                    // 查找对应的 Act 记录
                    const act = await prisma.act.findFirst({
                        where: {
                            scriptTaskId: taskId,
                            OR: [
                                { id: actId },
                                { order: actIndex + 1 },
                            ],
                        },
                    });

                    if (!act) {
                        const errorMsg = `Act ${actId} (index: ${actIndex}) not found in database for task ${taskId}, cannot process scenes`;
                        logger.error(errorMsg);
                        // 不抛出错误，但记录警告，允许继续处理其他 Act
                        continue;
                    }

                    // 处理场景（scene）：可能是单个对象或数组
                    let scenesToProcess = [];
                    if (actData.scene) {
                        if (Array.isArray(actData.scene)) {
                            // 如果是数组，直接使用
                            scenesToProcess = actData.scene;
                        } else {
                            // 如果是单个对象，转换为数组
                            scenesToProcess = [actData.scene];
                        }
                    }

                    // 处理每个场景
                    for (let sceneIndex = 0; sceneIndex < scenesToProcess.length; sceneIndex++) {
                        const sceneData = scenesToProcess[sceneIndex];
                        const sceneId = sceneData.id || require('uuid').v4();

                        // 检查场景是否已存在（通过 actId 和 order 或 id）
                        let scene = await prisma.scene.findFirst({
                            where: {
                                actId: act.id,
                                OR: [
                                    { id: sceneId },
                                    { order: sceneIndex + 1 },
                                ],
                            },
                        });

                        // 提取关联的镜头ID（从 shots 数组中，找到 scene_id 匹配的镜头）
                        // 注意：优先使用 sceneData.id（原始ID），如果不存在才使用新生成的 sceneId
                        const shotIds = [];
                        if (actData.shots && Array.isArray(actData.shots)) {
                            // 使用原始 sceneData.id 进行匹配（如果存在）
                            const matchId = sceneData.id || sceneId;
                            for (const shot of actData.shots) {
                                // 匹配 scene_id：优先匹配原始ID，如果不存在则匹配新生成的ID
                                if (shot.scene_id === matchId || shot.scene_id === sceneData.id || shot.scene_id === sceneId) {
                                    if (shot.id && !shotIds.includes(shot.id)) {
                                        shotIds.push(shot.id);
                                    }
                                }
                            }
                        }

                        if (scene) {
                            // 更新现有场景
                            scene = await prisma.scene.update({
                                where: { id: scene.id },
                                data: {
                                    address: sceneData.address || null,
                                    sceneDescription: sceneData.sceneDescription || null,
                                    sceneImage: sceneData.sceneImage || null,
                                    shotIds: shotIds.length > 0 ? JSON.stringify(shotIds) : null,
                                    order: sceneIndex + 1,
                                },
                            });
                            logger.info(`Scene updated: ${scene.address} for act ${act.actName}, shotIds: ${shotIds.length}`);
                        } else {
                            // 创建新场景
                            scene = await prisma.scene.create({
                                data: {
                                    id: sceneId,
                                    actId: act.id,
                                    novelId,
                                    projectId,
                                    userId,
                                    address: sceneData.address || null,
                                    sceneDescription: sceneData.sceneDescription || null,
                                    sceneImage: sceneData.sceneImage || null,
                                    shotIds: shotIds.length > 0 ? JSON.stringify(shotIds) : null,
                                    order: sceneIndex + 1,
                                },
                            });
                            logger.info(`Scene created: ${scene.address} for act ${act.actName}, shotIds: ${shotIds.length}`);
                        }
                    }
                }
            }

            logger.info(`Processed scenes from script task ${taskId}`);
        } catch (error) {
            logger.error(`Error processing scenes from script:`, error);
            throw error;
        }
    }

    /**
     * 从剧本数据中处理镜头：提取镜头、存储到数据库
     * @param {string} taskId - 任务ID
     * @param {Object} scriptData - 剧本数据
     */
    async processShotsFromScript(taskId, scriptData) {
        const prisma = getPrisma();

        try {
            // 获取任务信息
            const task = await prisma.scriptTask.findUnique({
                where: { id: taskId },
                select: {
                    novelId: true,
                    projectId: true,
                    userId: true,
                },
            });

            if (!task) {
                throw new AppError('Script task not found', 404);
            }

            const { novelId, projectId, userId } = task;

            // 处理剧幕中的镜头（plot_outline）
            if (scriptData.plot_outline && Array.isArray(scriptData.plot_outline)) {
                for (let actIndex = 0; actIndex < scriptData.plot_outline.length; actIndex++) {
                    const actData = scriptData.plot_outline[actIndex];
                    const actId = actData.id;

                    if (!actId) {
                        logger.warn(`Act ${actIndex} has no id, skipping shot processing`);
                        continue;
                    }

                    // 查找对应的 Act 记录
                    const act = await prisma.act.findFirst({
                        where: {
                            scriptTaskId: taskId,
                            OR: [
                                { id: actId },
                                { order: actIndex + 1 },
                            ],
                        },
                    });

                    if (!act) {
                        const errorMsg = `Act ${actId} (index: ${actIndex}) not found in database for task ${taskId}, cannot process shots`;
                        logger.error(errorMsg);
                        // 不抛出错误，但记录警告，允许继续处理其他 Act
                        continue;
                    }

                    // 处理镜头（shots）
                    if (actData.shots && Array.isArray(actData.shots)) {
                        for (let shotIndex = 0; shotIndex < actData.shots.length; shotIndex++) {
                            const shotData = actData.shots[shotIndex];
                            const shotId = shotData.id || require('uuid').v4();

                            // 查找关联的场景（通过 scene_id）
                            // 注意：如果 scene_id 不存在或匹配不上，尝试通过其他方式查找
                            let scene = null;
                            if (shotData.scene_id) {
                                // 首先尝试通过 scene_id 精确匹配
                                scene = await prisma.scene.findFirst({
                                    where: {
                                        actId: act.id,
                                        id: shotData.scene_id,
                                    },
                                });

                                // 如果精确匹配失败，尝试通过 address 或其他特征匹配（作为后备方案）
                                // 注意：这只是一个后备方案，理想情况下应该通过 scene_id 匹配
                                if (!scene && shotData.scene_id) {
                                    logger.warn(`Scene ${shotData.scene_id} not found for shot ${shotId}, sceneId will be null`);
                                }
                            }

                            // 检查镜头是否已存在（通过 actId 和 shotId 或 order）
                            let shot = await prisma.shot.findFirst({
                                where: {
                                    actId: act.id,
                                    OR: [
                                        { id: shotId },
                                        { shotId: shotData.shot_id || shotIndex + 1 },
                                    ],
                                },
                            });

                            // 准备镜头数据
                            const shotRecordData = {
                                shotId: shotData.shot_id || shotIndex + 1,
                                duration: shotData.duration || null,
                                shotType: shotData.shot_type || null,
                                framing: shotData.framing || null,
                                cameraAngle: shotData.camera_angle || null,
                                cameraMovement: shotData.camera_movement || null,
                                characterAction: shotData.character_action || null,
                                action: shotData.action || null,
                                expression: shotData.expression || null,
                                dialogue: shotData.dialogue ? JSON.stringify(shotData.dialogue) : null,
                                voiceover: shotData.voiceover || null,
                                lighting: shotData.lighting || null,
                                atmosphere: shotData.atmosphere || null,
                                bgm: shotData.bgm || null,
                                fx: shotData.fx || null,
                                soundEffect: shotData.sound_effect || shotData.soundEffect || null,
                                isTransition: shotData.is_transition || false,
                                characterIds: shotData.character_ids ? JSON.stringify(shotData.character_ids) : null,
                                metadata: shotData.metadata ? JSON.stringify(shotData.metadata) : null,
                                order: shotIndex + 1,
                            };

                            if (shot) {
                                // 更新现有镜头
                                shot = await prisma.shot.update({
                                    where: { id: shot.id },
                                    data: {
                                        ...shotRecordData,
                                        sceneId: scene ? scene.id : null,
                                    },
                                });
                                logger.info(`Shot updated: shot_id ${shot.shotId} for act ${act.actName}`);
                            } else {
                                // 创建新镜头
                                shot = await prisma.shot.create({
                                    data: {
                                        id: shotId,
                                        sceneId: scene ? scene.id : null,
                                        actId: act.id,
                                        novelId,
                                        projectId,
                                        userId,
                                        ...shotRecordData,
                                    },
                                });
                                logger.info(`Shot created: shot_id ${shot.shotId} for act ${act.actName}`);
                            }
                        }
                    }
                }
            }

            logger.info(`Processed shots from script task ${taskId}`);
        } catch (error) {
            logger.error(`Error processing shots from script:`, error);
            throw error;
        }
    }
}

module.exports = new ScriptService();

