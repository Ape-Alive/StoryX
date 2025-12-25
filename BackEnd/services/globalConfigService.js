const { getPrisma } = require('../utils/prisma');
const logger = require('../utils/logger');
const { AppError } = require('../utils/errors');
const { encrypt } = require('../utils/encryption');

class GlobalConfigService {
    /**
     * 获取全局配置（不包含密钥）
     * @returns {Object} - 全局配置对象
     */
    async getGlobalConfig() {
        try {
            const prisma = getPrisma();

            // 获取全局配置（只应该有一条记录）
            let config = await prisma.globalConfig.findFirst({
                orderBy: {
                    createdAt: 'desc',
                },
            });

            // 如果不存在，创建默认配置
            if (!config) {
                config = await prisma.globalConfig.create({
                    data: {},
                });
                logger.info('Default global config created');
            }

            // 返回配置，但不包含密钥字段（安全考虑）
            const { configLLMKey, configVideoAIKey, configTTSKey, configImageGenKey, ...configWithoutKeys } = config;
            return configWithoutKeys;
        } catch (error) {
            logger.error('Get global config error:', error);
            throw new AppError('Failed to get global config', 500);
        }
    }

    /**
     * 更新全局配置
     * @param {Object} configData - 配置数据
     * @returns {Object} - 更新后的配置对象
     */
    async updateGlobalConfig(configData) {
        try {
            const prisma = getPrisma();
            const {
                configLLM,
                configLLMKey,
                configVideoAI,
                configVideoAIKey,
                configTTS,
                configTTSKey,
                configImageGen,
                configImageGenKey,
            } = configData;

            // 验证配置和密钥的对应关系
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

            // 准备更新数据
            const updateData = {};

            // 更新模型配置（如果提供）
            if (configLLM !== undefined) {
                updateData.configLLM = configLLM || null;
            }
            if (configVideoAI !== undefined) {
                updateData.configVideoAI = configVideoAI || null;
            }
            if (configTTS !== undefined) {
                updateData.configTTS = configTTS || null;
            }
            if (configImageGen !== undefined) {
                updateData.configImageGen = configImageGen || null;
            }

            // 加密并更新密钥字段（如果提供）
            if (configLLMKey !== undefined) {
                updateData.configLLMKey = configLLMKey ? encrypt(configLLMKey) : null;
            }
            if (configVideoAIKey !== undefined) {
                updateData.configVideoAIKey = configVideoAIKey ? encrypt(configVideoAIKey) : null;
            }
            if (configTTSKey !== undefined) {
                updateData.configTTSKey = configTTSKey ? encrypt(configTTSKey) : null;
            }
            if (configImageGenKey !== undefined) {
                updateData.configImageGenKey = configImageGenKey ? encrypt(configImageGenKey) : null;
            }

            // 获取或创建全局配置
            let config = await prisma.globalConfig.findFirst({
                orderBy: {
                    createdAt: 'desc',
                },
            });

            if (!config) {
                // 如果不存在，创建新配置
                config = await prisma.globalConfig.create({
                    data: updateData,
                });
                logger.info('Global config created');
            } else {
                // 更新现有配置
                config = await prisma.globalConfig.update({
                    where: { id: config.id },
                    data: updateData,
                });
                logger.info('Global config updated', { configId: config.id });
            }

            // 返回配置，但不包含密钥字段（安全考虑）
            const { configLLMKey: _, configVideoAIKey: __, configTTSKey: ___, configImageGenKey: ____, ...configWithoutKeys } = config;
            return configWithoutKeys;
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            logger.error('Update global config error:', error);
            throw new AppError('Failed to update global config', 500);
        }
    }

    /**
     * 获取全局配置（包含密钥，仅内部使用）
     * @returns {Object} - 全局配置对象（包含密钥）
     */
    async getGlobalConfigWithKeys() {
        try {
            const prisma = getPrisma();

            let config = await prisma.globalConfig.findFirst({
                orderBy: {
                    createdAt: 'desc',
                },
            });

            // 如果不存在，返回null
            if (!config) {
                return null;
            }

            return config;
        } catch (error) {
            logger.error('Get global config with keys error:', error);
            throw new AppError('Failed to get global config with keys', 500);
        }
    }
}

module.exports = new GlobalConfigService();

