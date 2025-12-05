const { getPrisma } = require('../utils/prisma');
const textProcessingService = require('./textProcessingService');
const logger = require('../utils/logger');
const { NotFoundError, AppError } = require('../utils/errors');
const { encrypt, decrypt } = require('../utils/encryption');

class ProjectService {
    /**
     * Create a new project
     * @param {Object} projectData - Project data
     * @param {string} userId - User ID
     * @returns {Object} - Created project
     */
    async createProject(projectData, userId) {
        try {
            const prisma = getPrisma();
            const {
                title,
                description,
                sourceText,
                configLLM = 'deepseek',
                configLLMKey,
                configVideoAI = 'default',
                configVideoAIKey,
                configTTS = 'default',
                configTTSKey,
                configImageGen = 'default',
                configImageGenKey,
                storageLocation,
            } = projectData;

            // 验证必填字段
            if (!storageLocation) {
                throw new AppError('Storage location is required', 400);
            }

            if (storageLocation !== 'local' && storageLocation !== 'remote') {
                throw new AppError('Storage location must be "local" or "remote"', 400);
            }

            // 验证配置和密钥的对应关系
            // 如果选择了配置服务，对应的密钥必须提供
            const configKeyPairs = [
                { config: configLLM, key: configLLMKey, name: 'configLLM', keyName: 'configLLMKey' },
                { config: configVideoAI, key: configVideoAIKey, name: 'configVideoAI', keyName: 'configVideoAIKey' },
                { config: configTTS, key: configTTSKey, name: 'configTTS', keyName: 'configTTSKey' },
                { config: configImageGen, key: configImageGenKey, name: 'configImageGen', keyName: 'configImageGenKey' },
            ];

            // 检查：如果配置了服务，对应的密钥必须提供
            for (const pair of configKeyPairs) {
                if (pair.config && !pair.key) {
                    throw new AppError(`${pair.keyName} is required when ${pair.name} is configured`, 400);
                }
            }

            // 加密存储密钥
            const encryptedData = {
                userId,
                title,
                description,
                sourceText: sourceText || '',
                configLLM,
                configVideoAI,
                configTTS,
                configImageGen,
                storageLocation,
                status: 'pending',
                progress: 0,
            };

            // 加密密钥字段（如果提供）
            if (configLLMKey) {
                encryptedData.configLLMKey = encrypt(configLLMKey);
            }
            if (configVideoAIKey) {
                encryptedData.configVideoAIKey = encrypt(configVideoAIKey);
            }
            if (configTTSKey) {
                encryptedData.configTTSKey = encrypt(configTTSKey);
            }
            if (configImageGenKey) {
                encryptedData.configImageGenKey = encrypt(configImageGenKey);
            }

            const project = await prisma.project.create({
                data: encryptedData,
            });

            logger.info('Project created', { projectId: project.id, userId });

            // 返回项目时，不返回密钥（安全考虑）
            const { configLLMKey: _, configVideoAIKey: __, configTTSKey: ___, configImageGenKey: ____, ...projectWithoutKeys } = project;
            return projectWithoutKeys;
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            logger.error('Create project error:', error);
            throw new AppError('Failed to create project', 500);
        }
    }

    /**
     * Get project by ID
     * @param {string} projectId - Project ID
     * @param {string} userId - User ID (for authorization)
     * @returns {Object} - Project object
     */
    async getProjectById(projectId, userId) {
        try {
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

            // 移除密钥字段（安全考虑）
            const { configLLMKey, configVideoAIKey, configTTSKey, configImageGenKey, ...projectWithoutKeys } = project;
            return projectWithoutKeys;
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            logger.error('Get project error:', error);
            throw new AppError('Failed to get project', 500);
        }
    }

    /**
     * Get project with decrypted keys (internal use only)
     * @param {string} projectId - Project ID
     * @param {string} userId - User ID
     * @returns {Object} - Project object with decrypted keys
     */
    async getProjectWithKeys(projectId, userId) {
        try {
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

            // 解密密钥
            const decryptedProject = { ...project };
            if (project.configLLMKey) {
                decryptedProject.configLLMKey = decrypt(project.configLLMKey);
            }
            if (project.configVideoAIKey) {
                decryptedProject.configVideoAIKey = decrypt(project.configVideoAIKey);
            }
            if (project.configTTSKey) {
                decryptedProject.configTTSKey = decrypt(project.configTTSKey);
            }
            if (project.configImageGenKey) {
                decryptedProject.configImageGenKey = decrypt(project.configImageGenKey);
            }

            return decryptedProject;
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            logger.error('Get project with keys error:', error);
            throw new AppError('Failed to get project with keys', 500);
        }
    }

    /**
     * Get all projects for a user
     * @param {string} userId - User ID
     * @param {Object} options - Query options (page, limit, status)
     * @returns {Object} - Projects and pagination info
     */
    async getUserProjects(userId, options = {}) {
        try {
            const {
                page = 1,
                limit = 10,
                status,
            } = options;

            const prisma = getPrisma();
            const where = { userId };
            if (status) {
                where.status = status;
            }

            const skip = (page - 1) * limit;

            const [projects, total] = await Promise.all([
                prisma.project.findMany({
                    where,
                    orderBy: { createdAt: 'desc' },
                    skip,
                    take: limit,
                }),
                prisma.project.count({ where }),
            ]);

            // 移除所有项目的密钥字段
            const projectsWithoutKeys = projects.map(project => {
                const { configLLMKey, configVideoAIKey, configTTSKey, configImageGenKey, ...projectWithoutKeys } = project;
                return projectWithoutKeys;
            });

            return {
                projects: projectsWithoutKeys,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit),
                },
            };
        } catch (error) {
            logger.error('Get user projects error:', error);
            throw new AppError('Failed to get projects', 500);
        }
    }

    /**
     * Update project
     * @param {string} projectId - Project ID
     * @param {string} userId - User ID
     * @param {Object} updateData - Data to update
     * @returns {Object} - Updated project
     */
    async updateProject(projectId, userId, updateData) {
        try {
            // Verify project belongs to user
            await this.getProjectById(projectId, userId);

            // 验证配置和密钥的对应关系
            // 如果更新了配置服务，对应的密钥必须提供
            const configKeyPairs = [
                { config: updateData.configLLM, key: updateData.configLLMKey, name: 'configLLM', keyName: 'configLLMKey' },
                { config: updateData.configVideoAI, key: updateData.configVideoAIKey, name: 'configVideoAI', keyName: 'configVideoAIKey' },
                { config: updateData.configTTS, key: updateData.configTTSKey, name: 'configTTS', keyName: 'configTTSKey' },
                { config: updateData.configImageGen, key: updateData.configImageGenKey, name: 'configImageGen', keyName: 'configImageGenKey' },
            ];

            // 检查：如果更新了配置服务，对应的密钥必须提供
            for (const pair of configKeyPairs) {
                if (pair.config !== undefined && !pair.key) {
                    throw new AppError(`${pair.keyName} is required when ${pair.name} is configured`, 400);
                }
            }

            const prisma = getPrisma();

            // 处理密钥字段的加密
            const updateDataWithEncryption = { ...updateData };

            if (updateData.configLLMKey) {
                updateDataWithEncryption.configLLMKey = encrypt(updateData.configLLMKey);
            }
            if (updateData.configVideoAIKey) {
                updateDataWithEncryption.configVideoAIKey = encrypt(updateData.configVideoAIKey);
            }
            if (updateData.configTTSKey) {
                updateDataWithEncryption.configTTSKey = encrypt(updateData.configTTSKey);
            }
            if (updateData.configImageGenKey) {
                updateDataWithEncryption.configImageGenKey = encrypt(updateData.configImageGenKey);
            }

            const project = await prisma.project.update({
                where: { id: projectId },
                data: updateDataWithEncryption,
            });

            logger.info('Project updated', { projectId, userId });

            // 移除密钥字段
            const { configLLMKey, configVideoAIKey, configTTSKey, configImageGenKey, ...projectWithoutKeys } = project;
            return projectWithoutKeys;
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            logger.error('Update project error:', error);
            throw error;
        }
    }

    /**
     * Delete project
     * @param {string} projectId - Project ID
     * @param {string} userId - User ID
     */
    async deleteProject(projectId, userId) {
        try {
            // Verify project belongs to user
            await this.getProjectById(projectId, userId);

            const prisma = getPrisma();
            await prisma.project.delete({
                where: { id: projectId },
            });

            logger.info('Project deleted', { projectId, userId });
        } catch (error) {
            logger.error('Delete project error:', error);
            throw error;
        }
    }

    /**
     * Start text processing for a project
     * @param {string} projectId - Project ID
     * @param {string} userId - User ID
     * @returns {Object} - Updated project
     */
    async startTextProcessing(projectId, userId) {
        try {
            const project = await this.getProjectById(projectId, userId);

            if (!project.sourceText) {
                throw new AppError('Source text is required', 400);
            }

            const prisma = getPrisma();
            const updatedProject = await prisma.project.update({
                where: { id: projectId },
                data: {
                    status: 'processing',
                    progress: 10,
                },
            });

            // Process text asynchronously
            this.processTextAsync(projectId, userId, project.sourceText);

            return updatedProject;
        } catch (error) {
            logger.error('Start text processing error:', error);
            throw error;
        }
    }

    /**
     * Process text asynchronously
     * @param {string} projectId - Project ID
     * @param {string} userId - User ID
     * @param {string} text - Source text
     */
    async processTextAsync(projectId, userId, text) {
        try {
            const prisma = getPrisma();
            const project = await prisma.project.findFirst({
                where: { id: projectId, userId },
            });

            if (!project) {
                throw new NotFoundError('Project not found');
            }

            // Process text
            const processedText = await textProcessingService.processText(text);

            // Update project with processed text
            await prisma.project.update({
                where: { id: projectId },
                data: {
                    processedTextLanguage: processedText.language,
                    processedTextScenes: JSON.stringify(processedText.scenes),
                    processedTextCharacters: JSON.stringify(processedText.characters),
                    progress: 30,
                    status: 'reviewing',
                },
            });

            logger.info('Text processing completed', { projectId });
        } catch (error) {
            logger.error('Async text processing error:', error);

            // Update project status to failed
            try {
                const prisma = getPrisma();
                await prisma.project.update({
                    where: { id: projectId },
                    data: { status: 'failed' },
                });
            } catch (updateError) {
                logger.error('Failed to update project status:', updateError);
            }
        }
    }

    /**
     * Update project progress
     * @param {string} projectId - Project ID
     * @param {number} progress - Progress percentage (0-100)
     * @param {string} status - Project status
     */
    async updateProgress(projectId, progress, status) {
        try {
            const prisma = getPrisma();
            const updateData = { progress };
            if (status) {
                updateData.status = status;
            }

            await prisma.project.update({
                where: { id: projectId },
                data: updateData,
            });

            logger.debug('Project progress updated', { projectId, progress, status });
        } catch (error) {
            logger.error('Update progress error:', error);
            throw error;
        }
    }
}

module.exports = new ProjectService();

