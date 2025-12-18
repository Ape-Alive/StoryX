const { getPrisma } = require('../utils/prisma');
const logger = require('../utils/logger');
const { NotFoundError, AppError } = require('../utils/errors');

class CharacterService {
    /**
     * Create a new character
     * @param {Object} characterData - Character data
     * @param {string} userId - User ID
     * @returns {Object} - Created character
     */
    async createCharacter(characterData, userId) {
        try {
            const prisma = getPrisma();
            const {
                name,
                description,
                age,
                gender,
                personality,
                appearance,
                style,
                voiceActor,
                voiceTone,
                voiceSample,
                clothingStyle,
                projectId, // 可选：关联的项目ID
                novelId, // 可选：关联的小说ID
            } = characterData;

            // 如果提供了 projectId，验证项目属于该用户
            if (projectId) {
                const project = await prisma.project.findFirst({
                    where: {
                        id: projectId,
                        userId,
                    },
                });
                if (!project) {
                    throw new AppError('Project not found or does not belong to user', 404);
                }
            }

            // 如果提供了 novelId，验证小说属于该用户和项目
            if (novelId) {
                if (!projectId) {
                    throw new AppError('projectId is required when novelId is provided', 400);
                }

                const novel = await prisma.novel.findFirst({
                    where: {
                        id: novelId,
                        userId,
                        projectId,
                    },
                });

                if (!novel) {
                    throw new AppError('Novel not found or does not belong to user/project', 404);
                }
            }

            const character = await prisma.character.create({
                data: {
                    userId,
                    projectId: projectId || null, // 如果未提供，则为 null（用户级别的角色）
                    novelId: novelId || null, // 如果未提供，则为 null
                    name,
                    description,
                    age,
                    gender,
                    personality: personality ? JSON.stringify(personality) : null,
                    appearance,
                    style,
                    voiceActor,
                    voiceTone,
                    voiceSample,
                    clothingStyle,
                    cached: false,
                    usageCount: 0,
                },
            });

            logger.info('Character created', { characterId: character.id, userId, projectId });

            // Parse JSON fields
            if (character.personality) {
                if (typeof character.personality === 'string') {
                    try {
                        character.personality = JSON.parse(character.personality);
                    } catch (e) {
                        // 如果不是有效的 JSON，可能是普通字符串，转换为数组
                        if (character.personality.includes('，') || character.personality.includes(',')) {
                            character.personality = character.personality.split(/[，,]/).map(s => s.trim()).filter(s => s);
                        } else {
                            character.personality = [character.personality];
                        }
                    }
                } else if (!Array.isArray(character.personality)) {
                    character.personality = null;
                }
            }

            return character;
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            logger.error('Create character error:', error);
            throw new AppError('Failed to create character', 500);
        }
    }

    /**
     * Get character by ID
     * @param {string} characterId - Character ID
     * @param {string} userId - User ID
     * @param {string} novelId - Novel ID (optional, for validation)
     * @returns {Object} - Character object
     */
    async getCharacterById(characterId, userId, novelId = null) {
        try {
            const prisma = getPrisma();
            const where = {
                id: characterId,
                userId,
            };

            // 如果提供了 novelId，验证角色属于该小说
            if (novelId) {
                where.novelId = novelId;
            }

            const character = await prisma.character.findFirst({
                where,
                include: {
                    project: {
                        select: {
                            id: true,
                            title: true,
                        },
                    },
                    novel: {
                        select: {
                            id: true,
                            title: true,
                        },
                    },
                },
            });

            if (!character) {
                throw new NotFoundError('Character not found');
            }

            // Parse JSON fields
            if (character.personality) {
                if (typeof character.personality === 'string') {
                    try {
                        character.personality = JSON.parse(character.personality);
                    } catch (e) {
                        // 如果不是有效的 JSON，可能是普通字符串，转换为数组
                        if (character.personality.includes('，') || character.personality.includes(',')) {
                            character.personality = character.personality.split(/[，,]/).map(s => s.trim()).filter(s => s);
                        } else {
                            character.personality = [character.personality];
                        }
                    }
                } else if (!Array.isArray(character.personality)) {
                    character.personality = null;
                }
            } else {
                character.personality = null;
            }
            if (character.shotIds && typeof character.shotIds === 'string') {
                try {
                    character.shotIds = JSON.parse(character.shotIds);
                } catch (e) {
                    character.shotIds = [];
                }
            } else if (!Array.isArray(character.shotIds)) {
                character.shotIds = null;
            }

            return character;
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            logger.error('Get character error:', error);
            throw new AppError('Failed to get character', 500);
        }
    }

    /**
     * Get all characters for a user
     * @param {string} userId - User ID
     * @param {Object} options - Query options { cached, projectId, novelId }
     * @returns {Array} - Array of characters
     */
    async getUserCharacters(userId, options = {}) {
        try {
            const { cached, projectId, novelId } = options;
            const prisma = getPrisma();

            const where = { userId };

            // 处理 cached 参数（过滤空字符串）
            if (cached !== undefined && cached !== null && cached !== '') {
                // 将字符串 'true'/'false' 转换为布尔值
                const cachedValue = cached === 'true' || cached === true;
                where.cached = cachedValue;
            }

            // 处理 projectId 参数（过滤空字符串）
            const hasProjectId = projectId !== undefined && projectId !== null && projectId !== '';
            if (hasProjectId) {
                where.OR = [
                    { projectId: projectId },
                    { projectId: null }, // 全局角色（所有项目共享）
                ];
            }

            // 处理 novelId 参数（过滤空字符串）
            const hasNovelId = novelId !== undefined && novelId !== null && novelId !== '';
            if (hasNovelId) {
                // 如果同时指定了 novelId，需要验证小说属于用户和项目
                if (hasProjectId) {
                    const novel = await prisma.novel.findFirst({
                        where: {
                            id: novelId,
                            userId,
                            projectId,
                        },
                    });

                    if (!novel) {
                        throw new NotFoundError('Novel not found or does not belong to user/project');
                    }
                } else {
                    // 如果没有指定 projectId，只验证小说属于用户
                    const novel = await prisma.novel.findFirst({
                        where: {
                            id: novelId,
                            userId,
                        },
                    });

                    if (!novel) {
                        throw new NotFoundError('Novel not found or does not belong to user');
                    }
                }

                // 添加 novelId 过滤条件
                // 注意：如果同时有 OR 条件和 novelId，需要调整查询逻辑
                if (hasProjectId) {
                    // 如果有 projectId，需要同时满足 OR 条件和 novelId
                    // 重新构建 where 条件
                    where.AND = [
                        {
                            OR: [
                                { projectId: projectId },
                                { projectId: null },
                            ],
                        },
                        { novelId: novelId },
                    ];
                    delete where.OR;
                } else {
                    where.novelId = novelId;
                }
            }

            const characters = await prisma.character.findMany({
                where,
                include: {
                    project: {
                        select: {
                            id: true,
                            title: true,
                        },
                    },
                    novel: {
                        select: {
                            id: true,
                            title: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            });

            // Parse JSON fields
            return characters.map(char => {
                const result = {
                    ...char,
                };

                // 解析 personality（如果是 JSON 字符串）
                if (char.personality) {
                    if (typeof char.personality === 'string') {
                        try {
                            // 尝试解析 JSON
                            result.personality = JSON.parse(char.personality);
                        } catch (e) {
                            // 如果不是有效的 JSON，可能是普通字符串，转换为数组
                            // 例如："热情，商业导向，主动" -> ["热情", "商业导向", "主动"]
                            if (char.personality.includes('，') || char.personality.includes(',')) {
                                result.personality = char.personality.split(/[，,]/).map(s => s.trim()).filter(s => s);
                            } else {
                                // 单个字符串，转换为数组
                                result.personality = [char.personality];
                            }
                        }
                    } else if (Array.isArray(char.personality)) {
                        // 如果已经是数组，直接使用
                        result.personality = char.personality;
                    } else {
                        result.personality = null;
                    }
                } else {
                    result.personality = null;
                }

                // 解析 shotIds（如果是 JSON 字符串）
                if (char.shotIds && typeof char.shotIds === 'string') {
                    try {
                        result.shotIds = JSON.parse(char.shotIds);
                    } catch (e) {
                        result.shotIds = [];
                    }
                } else if (Array.isArray(char.shotIds)) {
                    result.shotIds = char.shotIds;
                } else {
                    result.shotIds = null;
                }

                return result;
            });
        } catch (error) {
            if (error instanceof NotFoundError || error instanceof AppError) {
                throw error;
            }
            logger.error('Get user characters error:', error);
            logger.error('Error details:', {
                message: error.message,
                stack: error.stack,
                userId,
                options,
            });
            throw new AppError(`Failed to get characters: ${error.message}`, 500);
        }
    }

    /**
     * Get all characters for a project
     * @param {string} projectId - Project ID
     * @param {string} userId - User ID (for authorization)
     * @returns {Array} - Array of characters
     */
    async getProjectCharacters(projectId, userId) {
        try {
            // 验证项目属于该用户
            const prisma = getPrisma();
            const project = await prisma.project.findFirst({
                where: {
                    id: projectId,
                    userId,
                },
            });

            if (!project) {
                throw new NotFoundError('Project not found');
            }

            // 获取项目专属角色和全局角色（projectId 为 null）
            const characters = await prisma.character.findMany({
                where: {
                    userId,
                    projectId: projectId, // 只取该项目下的角色（包含 novelId 关联在同项目下）
                },
                include: {
                    project: {
                        select: {
                            id: true,
                            title: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            });

            // Parse JSON fields
            return characters.map(char => this.parseCharacter(char));
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            logger.error('Get project characters error:', error);
            throw new AppError('Failed to get project characters', 500);
        }
    }

    /**
     * 通用的角色解析：personality/shotIds/等字段
     */
    parseCharacter(char) {
        const result = { ...char };

        // 解析 personality（字符串/JSON/数组）
        if (char.personality) {
            if (typeof char.personality === 'string') {
                try {
                    result.personality = JSON.parse(char.personality);
                } catch (e) {
                    if (char.personality.includes('，') || char.personality.includes(',')) {
                        result.personality = char.personality.split(/[，,]/).map(s => s.trim()).filter(s => s);
                    } else {
                        result.personality = [char.personality];
                    }
                }
            } else if (Array.isArray(char.personality)) {
                result.personality = char.personality;
            } else {
                result.personality = null;
            }
        } else {
            result.personality = null;
        }

        // 解析 shotIds
        if (char.shotIds && typeof char.shotIds === 'string') {
            try {
                result.shotIds = JSON.parse(char.shotIds);
            } catch (e) {
                result.shotIds = [];
            }
        } else if (Array.isArray(char.shotIds)) {
            result.shotIds = char.shotIds;
        } else {
            result.shotIds = null;
        }

        return result;
    }

    /**
     * Check if character exists in cache
     * @param {string} name - Character name
     * @param {string} userId - User ID
     * @returns {Object|null} - Character if found, null otherwise
     */
    async findCachedCharacter(name, userId) {
        try {
            const prisma = getPrisma();
            const character = await prisma.character.findFirst({
                where: {
                    userId,
                    name,
                    cached: true,
                },
            });

            if (character && character.personality) {
                if (typeof character.personality === 'string') {
                    try {
                        character.personality = JSON.parse(character.personality);
                    } catch (e) {
                        // 如果不是有效的 JSON，可能是普通字符串，转换为数组
                        if (character.personality.includes('，') || character.personality.includes(',')) {
                            character.personality = character.personality.split(/[，,]/).map(s => s.trim()).filter(s => s);
                        } else {
                            character.personality = [character.personality];
                        }
                    }
                } else if (!Array.isArray(character.personality)) {
                    character.personality = null;
                }
            }

            return character;
        } catch (error) {
            logger.error('Find cached character error:', error);
            return null;
        }
    }

    /**
     * Update character
     * @param {string} characterId - Character ID
     * @param {string} userId - User ID
     * @param {Object} updateData - Data to update
     * @returns {Object} - Updated character
     */
    async updateCharacter(characterId, userId, updateData) {
        try {
            // Verify character belongs to user
            await this.getCharacterById(characterId, userId);

            const prisma = getPrisma();

            // Handle personality array
            const data = { ...updateData };
            if (data.personality && Array.isArray(data.personality)) {
                data.personality = JSON.stringify(data.personality);
            }

            // 如果更新了 projectId，验证项目属于该用户
            if (data.projectId !== undefined) {
                if (data.projectId) {
                    const project = await prisma.project.findFirst({
                        where: {
                            id: data.projectId,
                            userId,
                        },
                    });
                    if (!project) {
                        throw new AppError('Project not found or does not belong to user', 404);
                    }
                }
            }

            // 如果更新了 novelId，验证小说属于该用户和项目
            if (data.novelId !== undefined) {
                if (data.novelId) {
                    // 获取当前角色的 projectId（如果更新数据中没有提供）
                    const currentCharacter = await prisma.character.findUnique({
                        where: { id: characterId },
                        select: { projectId: true },
                    });

                    const targetProjectId = data.projectId || currentCharacter?.projectId;
                    if (!targetProjectId) {
                        throw new AppError('projectId is required when novelId is provided', 400);
                    }

                    const novel = await prisma.novel.findFirst({
                        where: {
                            id: data.novelId,
                            userId,
                            projectId: targetProjectId,
                        },
                    });

                    if (!novel) {
                        throw new AppError('Novel not found or does not belong to user/project', 404);
                    }
                }
            }

            const character = await prisma.character.update({
                where: { id: characterId },
                data,
                include: {
                    project: {
                        select: {
                            id: true,
                            title: true,
                        },
                    },
                    novel: {
                        select: {
                            id: true,
                            title: true,
                        },
                    },
                },
            });

            // Parse JSON fields
            if (character.personality) {
                if (typeof character.personality === 'string') {
                    try {
                        character.personality = JSON.parse(character.personality);
                    } catch (e) {
                        // 如果不是有效的 JSON，可能是普通字符串，转换为数组
                        if (character.personality.includes('，') || character.personality.includes(',')) {
                            character.personality = character.personality.split(/[，,]/).map(s => s.trim()).filter(s => s);
                        } else {
                            character.personality = [character.personality];
                        }
                    }
                } else if (!Array.isArray(character.personality)) {
                    character.personality = null;
                }
            } else {
                character.personality = null;
            }

            // Parse shotIds
            if (character.shotIds && typeof character.shotIds === 'string') {
                try {
                    character.shotIds = JSON.parse(character.shotIds);
                } catch (e) {
                    character.shotIds = [];
                }
            } else if (!Array.isArray(character.shotIds)) {
                character.shotIds = null;
            }

            logger.info('Character updated', { characterId, userId });

            return character;
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            logger.error('Update character error:', error);
            throw error;
        }
    }

    /**
     * Delete character
     * @param {string} characterId - Character ID
     * @param {string} userId - User ID
     * @param {string} novelId - Novel ID (optional, for validation)
     */
    async deleteCharacter(characterId, userId, novelId = null) {
        try {
            // Verify character belongs to user (and novel if provided)
            await this.getCharacterById(characterId, userId, novelId);

            const prisma = getPrisma();
            await prisma.character.delete({
                where: { id: characterId },
            });

            logger.info('Character deleted', { characterId, userId, novelId });
        } catch (error) {
            logger.error('Delete character error:', error);
            throw error;
        }
    }

    /**
     * Mark character as cached
     * @param {string} characterId - Character ID
     * @param {string} imageUrl - Character image URL
     */
    async markAsCached(characterId, imageUrl) {
        try {
            const prisma = getPrisma();
            const character = await prisma.character.findUnique({
                where: { id: characterId },
            });

            if (!character) {
                throw new NotFoundError('Character not found');
            }

            await prisma.character.update({
                where: { id: characterId },
                data: {
                    cached: true,
                    imageUrl,
                    usageCount: { increment: 1 },
                },
            });

            logger.info('Character marked as cached', { characterId });
        } catch (error) {
            logger.error('Mark character as cached error:', error);
            throw error;
        }
    }

    /**
     * 自动合并重复角色
     * 合并同一用户、同一项目下同名的角色，保留最完整的信息，合并 shotIds
     * @param {string} projectId - 项目ID（可选，如果提供则只合并该项目下的角色）
     * @param {string} userId - 用户ID
     * @param {string} novelId - 小说ID（可选，如果提供则只合并该小说下的角色）
     * @returns {Object} - 合并结果统计
     */
    async mergeDuplicateCharacters(projectId, userId, novelId = null) {
        const prisma = getPrisma();

        try {
            // 验证项目属于用户（如果提供了 projectId）
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

            // 验证小说属于用户和项目（如果提供了 novelId）
            if (novelId) {
                if (!projectId) {
                    throw new AppError('projectId is required when novelId is provided', 400);
                }

                const novel = await prisma.novel.findFirst({
                    where: {
                        id: novelId,
                        userId,
                        projectId,
                    },
                });

                if (!novel) {
                    throw new NotFoundError('Novel not found or does not belong to user/project');
                }
            }

            // 构建查询条件
            const where = { userId };
            if (projectId) {
                where.projectId = projectId;
            }
            if (novelId) {
                where.novelId = novelId;
            }

            // 获取所有角色，按名称分组
            const allCharacters = await prisma.character.findMany({
                where,
                orderBy: [
                    { name: 'asc' },
                    { createdAt: 'asc' }, // 保留最早创建的角色作为主角色
                ],
            });

            // 按名称分组
            const charactersByName = {};
            for (const char of allCharacters) {
                if (!charactersByName[char.name]) {
                    charactersByName[char.name] = [];
                }
                charactersByName[char.name].push(char);
            }

            let mergedCount = 0;
            let deletedCount = 0;

            // 处理每个名称的角色组
            for (const [name, characters] of Object.entries(charactersByName)) {
                // 如果该名称只有一个角色，跳过
                if (characters.length <= 1) {
                    continue;
                }

                // 选择最早创建的角色作为主角色（保留）
                const mainCharacter = characters[0];
                const duplicateCharacters = characters.slice(1);

                // 合并 shotIds
                let mergedShotIds = new Set();
                if (mainCharacter.shotIds) {
                    try {
                        const mainShotIds = JSON.parse(mainCharacter.shotIds);
                        if (Array.isArray(mainShotIds)) {
                            mainShotIds.forEach(id => mergedShotIds.add(id));
                        }
                    } catch (e) {
                        logger.warn(`Failed to parse shotIds for character ${mainCharacter.id}:`, e);
                    }
                }

                // 合并其他角色的信息（如果主角色字段为空，则使用其他角色的值）
                const mergedData = {
                    description: mainCharacter.description,
                    age: mainCharacter.age,
                    gender: mainCharacter.gender,
                    personality: mainCharacter.personality,
                    appearance: mainCharacter.appearance,
                    background: mainCharacter.background,
                    style: mainCharacter.style,
                    voiceActor: mainCharacter.voiceActor,
                    voiceTone: mainCharacter.voiceTone,
                    voiceSample: mainCharacter.voiceSample,
                    clothingStyle: mainCharacter.clothingStyle,
                    imageUrl: mainCharacter.imageUrl,
                    modelUrl: mainCharacter.modelUrl,
                };

                // 从重复角色中提取信息，补充主角色的空字段
                for (const dupChar of duplicateCharacters) {
                    // 合并 shotIds
                    if (dupChar.shotIds) {
                        try {
                            const dupShotIds = JSON.parse(dupChar.shotIds);
                            if (Array.isArray(dupShotIds)) {
                                dupShotIds.forEach(id => mergedShotIds.add(id));
                            }
                        } catch (e) {
                            logger.warn(`Failed to parse shotIds for character ${dupChar.id}:`, e);
                        }
                    }

                    // 如果主角色字段为空，使用重复角色的值
                    if (!mergedData.description && dupChar.description) {
                        mergedData.description = dupChar.description;
                    }
                    if (!mergedData.age && dupChar.age) {
                        mergedData.age = dupChar.age;
                    }
                    if (!mergedData.gender && dupChar.gender) {
                        mergedData.gender = dupChar.gender;
                    }
                    if (!mergedData.personality && dupChar.personality) {
                        mergedData.personality = dupChar.personality;
                    }
                    if (!mergedData.appearance && dupChar.appearance) {
                        mergedData.appearance = dupChar.appearance;
                    }
                    if (!mergedData.background && dupChar.background) {
                        mergedData.background = dupChar.background;
                    }
                    if (!mergedData.style && dupChar.style) {
                        mergedData.style = dupChar.style;
                    }
                    if (!mergedData.voiceActor && dupChar.voiceActor) {
                        mergedData.voiceActor = dupChar.voiceActor;
                    }
                    if (!mergedData.voiceTone && dupChar.voiceTone) {
                        mergedData.voiceTone = dupChar.voiceTone;
                    }
                    if (!mergedData.voiceSample && dupChar.voiceSample) {
                        mergedData.voiceSample = dupChar.voiceSample;
                    }
                    if (!mergedData.clothingStyle && dupChar.clothingStyle) {
                        mergedData.clothingStyle = dupChar.clothingStyle;
                    }
                    if (!mergedData.imageUrl && dupChar.imageUrl) {
                        mergedData.imageUrl = dupChar.imageUrl;
                    }
                    if (!mergedData.modelUrl && dupChar.modelUrl) {
                        mergedData.modelUrl = dupChar.modelUrl;
                    }
                }

                // 处理 novelId 和 taskId：如果主角色没有，则从重复角色中获取（取第一个非空的）
                let mergedNovelId = mainCharacter.novelId;
                let mergedTaskId = mainCharacter.taskId;

                if (!mergedNovelId) {
                    const dupWithNovelId = duplicateCharacters.find(ch => ch.novelId);
                    if (dupWithNovelId) {
                        mergedNovelId = dupWithNovelId.novelId;
                    }
                }

                if (!mergedTaskId) {
                    const dupWithTaskId = duplicateCharacters.find(ch => ch.taskId);
                    if (dupWithTaskId) {
                        mergedTaskId = dupWithTaskId.taskId;
                    }
                }

                // 更新主角色
                await prisma.character.update({
                    where: { id: mainCharacter.id },
                    data: {
                        ...mergedData,
                        novelId: mergedNovelId,
                        taskId: mergedTaskId,
                        shotIds: mergedShotIds.size > 0 ? JSON.stringify(Array.from(mergedShotIds)) : null,
                        usageCount: mainCharacter.usageCount + duplicateCharacters.reduce((sum, ch) => sum + ch.usageCount, 0),
                    },
                });

                // 删除重复角色
                const duplicateIds = duplicateCharacters.map(ch => ch.id);
                await prisma.character.deleteMany({
                    where: {
                        id: { in: duplicateIds },
                    },
                });

                mergedCount += duplicateCharacters.length;
                deletedCount += duplicateCharacters.length;

                logger.info(`Merged ${duplicateCharacters.length} duplicate characters into ${mainCharacter.name} (${mainCharacter.id})`);
            }

            return {
                totalProcessed: allCharacters.length,
                mergedCount,
                deletedCount,
                remainingCount: allCharacters.length - deletedCount,
            };
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            logger.error('Merge duplicate characters error:', error);
            throw new AppError('Failed to merge duplicate characters', 500);
        }
    }
}

module.exports = new CharacterService();

