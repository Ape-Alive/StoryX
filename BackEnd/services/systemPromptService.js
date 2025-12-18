const { getPrisma } = require('../utils/prisma');
const logger = require('../utils/logger');
const { NotFoundError, AppError } = require('../utils/errors');

class SystemPromptService {
    /**
     * 创建系统提示词
     * @param {Object} promptData - 提示词数据
     * @returns {Object} - 创建的提示词
     */
    async createSystemPrompt(promptData) {
        try {
            const prisma = getPrisma();
            const {
                name,
                functionKey,
                description,
                prompt,
                category,
                isActive = true,
                metadata,
            } = promptData;

            if (!name || !functionKey || !prompt) {
                throw new AppError('name, functionKey, and prompt are required', 400);
            }

            // 检查functionKey是否已存在
            const existing = await prisma.systemPrompt.findUnique({
                where: { functionKey },
            });

            if (existing) {
                throw new AppError(`System prompt with functionKey "${functionKey}" already exists`, 400);
            }

            const systemPrompt = await prisma.systemPrompt.create({
                data: {
                    name,
                    functionKey,
                    description,
                    prompt,
                    category,
                    isActive,
                    metadata: metadata ? JSON.stringify(metadata) : null,
                },
            });

            logger.info('System prompt created', { functionKey, name });
            return systemPrompt;
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            logger.error('Create system prompt error:', error);
            throw new AppError('Failed to create system prompt', 500);
        }
    }

    /**
     * 更新系统提示词
     * @param {string} id - 提示词ID
     * @param {Object} updateData - 更新数据
     * @returns {Object} - 更新后的提示词
     */
    async updateSystemPrompt(id, updateData) {
        try {
            const prisma = getPrisma();
            const {
                name,
                description,
                prompt,
                category,
                isActive,
                metadata,
            } = updateData;

            // 检查提示词是否存在
            const existing = await prisma.systemPrompt.findUnique({
                where: { id },
            });

            if (!existing) {
                throw new NotFoundError('System prompt not found');
            }

            // 如果更新了functionKey，检查是否冲突
            if (updateData.functionKey && updateData.functionKey !== existing.functionKey) {
                const conflict = await prisma.systemPrompt.findUnique({
                    where: { functionKey: updateData.functionKey },
                });
                if (conflict) {
                    throw new AppError(`System prompt with functionKey "${updateData.functionKey}" already exists`, 400);
                }
            }

            const updatePayload = {};
            if (name !== undefined) updatePayload.name = name;
            if (description !== undefined) updatePayload.description = description;
            if (prompt !== undefined) updatePayload.prompt = prompt;
            if (category !== undefined) updatePayload.category = category;
            if (isActive !== undefined) updatePayload.isActive = isActive;
            if (metadata !== undefined) updatePayload.metadata = metadata ? JSON.stringify(metadata) : null;
            if (updateData.functionKey !== undefined) updatePayload.functionKey = updateData.functionKey;
            if (Object.keys(updatePayload).length > 0) {
                updatePayload.version = existing.version + 1;
            }

            const updated = await prisma.systemPrompt.update({
                where: { id },
                data: updatePayload,
            });

            logger.info('System prompt updated', { id, functionKey: updated.functionKey });
            return updated;
        } catch (error) {
            if (error instanceof NotFoundError || error instanceof AppError) {
                throw error;
            }
            logger.error('Update system prompt error:', error);
            throw new AppError('Failed to update system prompt', 500);
        }
    }

    /**
     * 删除系统提示词
     * @param {string} id - 提示词ID
     */
    async deleteSystemPrompt(id) {
        try {
            const prisma = getPrisma();
            const existing = await prisma.systemPrompt.findUnique({
                where: { id },
            });

            if (!existing) {
                throw new NotFoundError('System prompt not found');
            }

            await prisma.systemPrompt.delete({
                where: { id },
            });

            logger.info('System prompt deleted', { id, functionKey: existing.functionKey });
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            logger.error('Delete system prompt error:', error);
            throw new AppError('Failed to delete system prompt', 500);
        }
    }

    /**
     * 获取所有系统提示词
     * @param {Object} options - 查询选项
     * @returns {Array} - 提示词列表
     */
    async getAllSystemPrompts(options = {}) {
        try {
            const prisma = getPrisma();
            const { category, isActive } = options;

            const where = {};
            if (category !== undefined) where.category = category;
            if (isActive !== undefined) where.isActive = isActive;

            logger.info('Getting system prompts', { options, where });

            // 先检查表是否存在
            try {
                const count = await prisma.systemPrompt.count();
                logger.info('SystemPrompt table exists, count:', count);
            } catch (countError) {
                logger.error('Error counting system prompts:', countError);
                throw countError;
            }

            const prompts = await prisma.systemPrompt.findMany({
                where,
                orderBy: { createdAt: 'desc' },
            });

            logger.info('Found system prompts', { count: prompts.length, prompts: prompts.map(p => ({ id: p.id, name: p.name, functionKey: p.functionKey })) });

            return prompts.map(p => ({
                ...p,
                metadata: p.metadata ? JSON.parse(p.metadata) : null,
            }));
        } catch (error) {
            logger.error('Get all system prompts error:', error);
            throw new AppError(`Failed to get system prompts: ${error.message}`, 500);
        }
    }

    /**
     * 根据ID获取系统提示词
     * @param {string} id - 提示词ID
     * @returns {Object} - 提示词
     */
    async getSystemPromptById(id) {
        try {
            const prisma = getPrisma();
            const prompt = await prisma.systemPrompt.findUnique({
                where: { id },
            });

            if (!prompt) {
                throw new NotFoundError('System prompt not found');
            }

            return {
                ...prompt,
                metadata: prompt.metadata ? JSON.parse(prompt.metadata) : null,
            };
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            logger.error('Get system prompt by ID error:', error);
            throw new AppError('Failed to get system prompt', 500);
        }
    }

    /**
     * 根据功能标识获取系统提示词
     * @param {string} functionKey - 功能标识
     * @returns {Object} - 提示词
     */
    async getSystemPromptByFunctionKey(functionKey) {
        try {
            const prisma = getPrisma();
            const prompt = await prisma.systemPrompt.findUnique({
                where: { functionKey },
            });

            if (!prompt) {
                // 如果找不到，返回null而不是抛出错误，让调用方决定如何处理
                return null;
            }

            if (!prompt.isActive) {
                logger.warn(`System prompt with functionKey "${functionKey}" is not active`);
                return null;
            }

            return {
                ...prompt,
                metadata: prompt.metadata ? JSON.parse(prompt.metadata) : null,
            };
        } catch (error) {
            logger.error('Get system prompt by functionKey error:', error);
            throw new AppError('Failed to get system prompt', 500);
        }
    }

    /**
     * 根据分类获取系统提示词
     * @param {string} category - 分类
     * @returns {Array} - 提示词列表
     */
    async getSystemPromptsByCategory(category) {
        try {
            const prisma = getPrisma();
            const prompts = await prisma.systemPrompt.findMany({
                where: {
                    category,
                    isActive: true,
                },
                orderBy: { createdAt: 'desc' },
            });

            return prompts.map(p => ({
                ...p,
                metadata: p.metadata ? JSON.parse(p.metadata) : null,
            }));
        } catch (error) {
            logger.error('Get system prompts by category error:', error);
            throw new AppError('Failed to get system prompts', 500);
        }
    }

    /**
     * 创建功能提示词
     */
    async createFeaturePrompt(systemPromptId, data) {
        const prisma = getPrisma();
        const { name, functionType, referenceWorks, referenceLinks, prompt } = data;

        if (!name || !functionType || !prompt) {
            throw new AppError('name, functionType, prompt are required', 400);
        }

        const sys = await prisma.systemPrompt.findUnique({ where: { id: systemPromptId } });
        if (!sys) throw new NotFoundError('System prompt not found');

        return prisma.featurePrompt.create({
            data: {
                systemPromptId,
                name,
                functionType,
                referenceWorks: referenceWorks || null,
                // 如果 referenceLinks 是空数组，设置为 null；否则如果是数组则序列化，否则设置为 null
                referenceLinks: Array.isArray(referenceLinks)
                    ? (referenceLinks.length > 0 ? JSON.stringify(referenceLinks) : null)
                    : (referenceLinks || null),
                prompt,
            },
        });
    }

    /**
     * 获取功能提示词列表
     */
    async getFeaturePrompts(filters = {}) {
        const prisma = getPrisma();
        const where = {};
        if (filters.systemPromptId) where.systemPromptId = filters.systemPromptId;
        if (filters.functionType) where.functionType = filters.functionType;

        const list = await prisma.featurePrompt.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        });
        return list.map(fp => ({
            ...fp,
            referenceLinks: fp.referenceLinks ? safeParseArray(fp.referenceLinks) : null,
        }));
    }

    /**
     * 获取单个功能提示词
     */
    async getFeaturePromptById(id) {
        const prisma = getPrisma();
        const item = await prisma.featurePrompt.findUnique({ where: { id } });
        if (!item) throw new NotFoundError('Feature prompt not found');
        return {
            ...item,
            referenceLinks: item.referenceLinks ? safeParseArray(item.referenceLinks) : null,
        };
    }

    /**
     * 更新功能提示词
     */
    async updateFeaturePrompt(id, data) {
        const prisma = getPrisma();
        // 确认存在
        await this.getFeaturePromptById(id);

        const { name, functionType, referenceWorks, referenceLinks, prompt } = data;
        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (functionType !== undefined) updateData.functionType = functionType;
        if (referenceWorks !== undefined) updateData.referenceWorks = referenceWorks || null;
        if (referenceLinks !== undefined) {
            // 如果 referenceLinks 是空数组、null 或 undefined，设置为 null
            if (Array.isArray(referenceLinks) && referenceLinks.length === 0) {
                updateData.referenceLinks = null;
            } else if (Array.isArray(referenceLinks)) {
                updateData.referenceLinks = JSON.stringify(referenceLinks);
            } else {
                updateData.referenceLinks = referenceLinks || null;
            }
        }
        if (prompt !== undefined) updateData.prompt = prompt;

        const updated = await prisma.featurePrompt.update({
            where: { id },
            data: updateData,
        });
        return {
            ...updated,
            referenceLinks: updated.referenceLinks ? safeParseArray(updated.referenceLinks) : null,
        };
    }

    /**
     * 删除功能提示词
     */
    async deleteFeaturePrompt(id) {
        const prisma = getPrisma();
        await this.getFeaturePromptById(id);
        await prisma.featurePrompt.delete({ where: { id } });
    }
}

module.exports = new SystemPromptService();

function safeParseArray(val) {
    try {
        const parsed = JSON.parse(val);
        return Array.isArray(parsed) ? parsed : null;
    } catch (e) {
        return null;
    }
}

