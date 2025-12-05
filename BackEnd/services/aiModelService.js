const { getPrisma } = require('../utils/prisma');
const logger = require('../utils/logger');
const { NotFoundError, AppError } = require('../utils/errors');

class AIModelService {
  /**
   * Get all active AI providers
   * @returns {Array} - Array of AI providers
   */
  async getProviders() {
    try {
      const prisma = getPrisma();
      const providers = await prisma.aIProvider.findMany({
        where: { isActive: true },
        orderBy: { displayName: 'asc' },
        include: {
          models: {
            where: { isActive: true },
            orderBy: { displayName: 'asc' },
          },
        },
      });

      return providers;
    } catch (error) {
      logger.error('Get providers error:', error);
      throw new AppError('Failed to get providers', 500);
    }
  }

  /**
   * Get all AI models by type
   * @param {string} type - Model type: "llm" | "video" | "image" | "tts"
   * @returns {Array} - Array of AI models
   */
  async getModelsByType(type) {
    try {
      const prisma = getPrisma();

      const validTypes = ['llm', 'video', 'image', 'tts'];
      if (!validTypes.includes(type)) {
        throw new AppError(`Invalid model type. Must be one of: ${validTypes.join(', ')}`, 400);
      }

      const models = await prisma.aIModel.findMany({
        where: {
          type,
          isActive: true,
        },
        include: {
          provider: {
            select: {
              id: true,
              name: true,
              displayName: true,
              logoUrl: true,
            },
          },
        },
        orderBy: [
          { provider: { displayName: 'asc' } },
          { displayName: 'asc' },
        ],
      });

      return models;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Get models by type error:', error);
      throw new AppError('Failed to get models by type', 500);
    }
  }

  /**
   * Get all AI models grouped by type
   * @returns {Object} - Models grouped by type
   */
  async getModelsGroupedByType() {
    try {
      const prisma = getPrisma();

      const models = await prisma.aIModel.findMany({
        where: { isActive: true },
        include: {
          provider: {
            select: {
              id: true,
              name: true,
              displayName: true,
              logoUrl: true,
            },
          },
        },
        orderBy: [
          { type: 'asc' },
          { provider: { displayName: 'asc' } },
          { displayName: 'asc' },
        ],
      });

      // Group by type
      const grouped = {
        llm: [],
        video: [],
        image: [],
        tts: [],
      };

      models.forEach(model => {
        if (grouped[model.type]) {
          grouped[model.type].push(model);
        }
      });

      return grouped;
    } catch (error) {
      logger.error('Get models grouped by type error:', error);
      throw new AppError('Failed to get models grouped by type', 500);
    }
  }

  /**
   * Get model by ID
   * @param {string} modelId - Model ID
   * @returns {Object} - Model object
   */
  async getModelById(modelId) {
    try {
      const prisma = getPrisma();
      const model = await prisma.aIModel.findUnique({
        where: { id: modelId },
        include: {
          provider: true,
        },
      });

      if (!model) {
        throw new NotFoundError('Model not found');
      }

      return model;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Get model by ID error:', error);
      throw new AppError('Failed to get model', 500);
    }
  }

  /**
   * Get configuration options for project creation
   * Returns all active models grouped by type with provider information
   * @returns {Object} - Configuration options
   */
  async getConfigOptions() {
    try {
      const grouped = await this.getModelsGroupedByType();

      // Format for frontend use
      return {
        llm: grouped.llm.map(model => ({
          id: model.id,
          name: model.name,
          displayName: model.displayName,
          description: model.description,
          baseUrl: model.baseUrl,
          provider: {
            id: model.provider.id,
            name: model.provider.name,
            displayName: model.provider.displayName,
            logoUrl: model.provider.logoUrl,
          },
          requiresKey: model.requiresKey,
        })),
        video: grouped.video.map(model => ({
          id: model.id,
          name: model.name,
          displayName: model.displayName,
          description: model.description,
          baseUrl: model.baseUrl,
          provider: {
            id: model.provider.id,
            name: model.provider.name,
            displayName: model.provider.displayName,
            logoUrl: model.provider.logoUrl,
          },
          requiresKey: model.requiresKey,
        })),
        image: grouped.image.map(model => ({
          id: model.id,
          name: model.name,
          displayName: model.displayName,
          description: model.description,
          baseUrl: model.baseUrl,
          provider: {
            id: model.provider.id,
            name: model.provider.name,
            displayName: model.provider.displayName,
            logoUrl: model.provider.logoUrl,
          },
          requiresKey: model.requiresKey,
        })),
        tts: grouped.tts.map(model => ({
          id: model.id,
          name: model.name,
          displayName: model.displayName,
          description: model.description,
          baseUrl: model.baseUrl,
          provider: {
            id: model.provider.id,
            name: model.provider.name,
            displayName: model.provider.displayName,
            logoUrl: model.provider.logoUrl,
          },
          requiresKey: model.requiresKey,
        })),
      };
    } catch (error) {
      logger.error('Get config options error:', error);
      throw new AppError('Failed to get config options', 500);
    }
  }

  // ==================== Provider CRUD ====================

  /**
   * Get all providers (including inactive)
   * @returns {Array} - Array of all providers
   */
  async getAllProviders() {
    try {
      const prisma = getPrisma();
      const providers = await prisma.aIProvider.findMany({
        orderBy: { displayName: 'asc' },
        include: {
          models: {
            orderBy: { displayName: 'asc' },
          },
        },
      });
      return providers;
    } catch (error) {
      logger.error('Get all providers error:', error);
      throw new AppError('Failed to get providers', 500);
    }
  }

  /**
   * Get provider by ID
   * @param {string} providerId - Provider ID
   * @returns {Object} - Provider object
   */
  async getProviderById(providerId) {
    try {
      const prisma = getPrisma();
      const provider = await prisma.aIProvider.findUnique({
        where: { id: providerId },
        include: {
          models: {
            orderBy: { displayName: 'asc' },
          },
        },
      });

      if (!provider) {
        throw new NotFoundError('Provider not found');
      }

      return provider;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Get provider by ID error:', error);
      throw new AppError('Failed to get provider', 500);
    }
  }

  /**
   * Create a new provider
   * @param {Object} providerData - Provider data
   * @returns {Object} - Created provider
   */
  async createProvider(providerData) {
    try {
      const prisma = getPrisma();
      const { name, displayName, description, website, logoUrl, isActive = true } = providerData;

      if (!name || !displayName) {
        throw new AppError('Provider name and displayName are required', 400);
      }

      const provider = await prisma.aIProvider.create({
        data: {
          name,
          displayName,
          description: description || null,
          website: website || null,
          logoUrl: logoUrl || null,
          isActive: isActive !== undefined ? isActive : true,
        },
        include: {
          models: true,
        },
      });

      logger.info(`Provider created: ${provider.displayName} (${provider.id})`);
      return provider;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Create provider error:', error);
      throw new AppError('Failed to create provider', 500);
    }
  }

  /**
   * Update a provider
   * @param {string} providerId - Provider ID
   * @param {Object} providerData - Provider data to update
   * @returns {Object} - Updated provider
   */
  async updateProvider(providerId, providerData) {
    try {
      const prisma = getPrisma();

      // Check if provider exists
      const existingProvider = await prisma.aIProvider.findUnique({
        where: { id: providerId },
      });

      if (!existingProvider) {
        throw new NotFoundError('Provider not found');
      }

      const { name, displayName, description, website, logoUrl, isActive } = providerData;

      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (displayName !== undefined) updateData.displayName = displayName;
      if (description !== undefined) updateData.description = description;
      if (website !== undefined) updateData.website = website;
      if (logoUrl !== undefined) updateData.logoUrl = logoUrl;
      if (isActive !== undefined) updateData.isActive = isActive;

      const provider = await prisma.aIProvider.update({
        where: { id: providerId },
        data: updateData,
        include: {
          models: {
            orderBy: { displayName: 'asc' },
          },
        },
      });

      logger.info(`Provider updated: ${provider.displayName} (${provider.id})`);
      return provider;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof AppError) {
        throw error;
      }
      logger.error('Update provider error:', error);
      throw new AppError('Failed to update provider', 500);
    }
  }

  /**
   * Delete a provider
   * @param {string} providerId - Provider ID
   * @returns {boolean} - Success status
   */
  async deleteProvider(providerId) {
    try {
      const prisma = getPrisma();

      // Check if provider exists
      const provider = await prisma.aIProvider.findUnique({
        where: { id: providerId },
        include: {
          models: true,
        },
      });

      if (!provider) {
        throw new NotFoundError('Provider not found');
      }

      // Check if provider has models
      if (provider.models && provider.models.length > 0) {
        throw new AppError('Cannot delete provider with existing models. Please delete all models first.', 400);
      }

      await prisma.aIProvider.delete({
        where: { id: providerId },
      });

      logger.info(`Provider deleted: ${provider.displayName} (${providerId})`);
      return true;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof AppError) {
        throw error;
      }
      logger.error('Delete provider error:', error);
      throw new AppError('Failed to delete provider', 500);
    }
  }

  // ==================== Model CRUD ====================

  /**
   * Get all models (including inactive)
   * @returns {Array} - Array of all models
   */
  async getAllModels() {
    try {
      const prisma = getPrisma();
      const models = await prisma.aIModel.findMany({
        include: {
          provider: {
            select: {
              id: true,
              name: true,
              displayName: true,
              logoUrl: true,
            },
          },
        },
        orderBy: [
          { provider: { displayName: 'asc' } },
          { displayName: 'asc' },
        ],
      });
      return models;
    } catch (error) {
      logger.error('Get all models error:', error);
      throw new AppError('Failed to get models', 500);
    }
  }

  /**
   * Create a new model
   * @param {Object} modelData - Model data
   * @returns {Object} - Created model
   */
  async createModel(modelData) {
    try {
      const prisma = getPrisma();
      const { providerId, name, displayName, description, type, category, baseUrl, isActive = true, requiresKey = true } = modelData;

      if (!providerId || !name || !displayName || !type) {
        throw new AppError('Provider ID, name, displayName, and type are required', 400);
      }

      const validTypes = ['llm', 'video', 'image', 'tts'];
      if (!validTypes.includes(type)) {
        throw new AppError(`Invalid model type. Must be one of: ${validTypes.join(', ')}`, 400);
      }

      // Check if provider exists
      const provider = await prisma.aIProvider.findUnique({
        where: { id: providerId },
      });

      if (!provider) {
        throw new NotFoundError('Provider not found');
      }

      const model = await prisma.aIModel.create({
        data: {
          providerId,
          name,
          displayName,
          description: description || null,
          type,
          category: category || null,
          baseUrl: baseUrl || null,
          isActive: isActive !== undefined ? isActive : true,
          requiresKey: requiresKey !== undefined ? requiresKey : true,
        },
        include: {
          provider: true,
        },
      });

      logger.info(`Model created: ${model.displayName} (${model.id}) for provider ${provider.displayName}`);
      return model;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof AppError) {
        throw error;
      }
      logger.error('Create model error:', error);
      throw new AppError('Failed to create model', 500);
    }
  }

  /**
   * Update a model
   * @param {string} modelId - Model ID
   * @param {Object} modelData - Model data to update
   * @returns {Object} - Updated model
   */
  async updateModel(modelId, modelData) {
    try {
      const prisma = getPrisma();

      // Check if model exists
      const existingModel = await prisma.aIModel.findUnique({
        where: { id: modelId },
      });

      if (!existingModel) {
        throw new NotFoundError('Model not found');
      }

      const { providerId, name, displayName, description, type, category, baseUrl, isActive, requiresKey } = modelData;

      // Validate type if provided
      if (type) {
        const validTypes = ['llm', 'video', 'image', 'tts'];
        if (!validTypes.includes(type)) {
          throw new AppError(`Invalid model type. Must be one of: ${validTypes.join(', ')}`, 400);
        }
      }

      // Check provider if providerId is being updated
      if (providerId && providerId !== existingModel.providerId) {
        const provider = await prisma.aIProvider.findUnique({
          where: { id: providerId },
        });

        if (!provider) {
          throw new NotFoundError('Provider not found');
        }
      }

      const updateData = {};
      if (providerId !== undefined) updateData.providerId = providerId;
      if (name !== undefined) updateData.name = name;
      if (displayName !== undefined) updateData.displayName = displayName;
      if (description !== undefined) updateData.description = description;
      if (type !== undefined) updateData.type = type;
      if (category !== undefined) updateData.category = category;
      if (baseUrl !== undefined) updateData.baseUrl = baseUrl;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (requiresKey !== undefined) updateData.requiresKey = requiresKey;

      const model = await prisma.aIModel.update({
        where: { id: modelId },
        data: updateData,
        include: {
          provider: true,
        },
      });

      logger.info(`Model updated: ${model.displayName} (${model.id})`);
      return model;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof AppError) {
        throw error;
      }
      logger.error('Update model error:', error);
      throw new AppError('Failed to update model', 500);
    }
  }

  /**
   * Delete a model
   * @param {string} modelId - Model ID
   * @returns {boolean} - Success status
   */
  async deleteModel(modelId) {
    try {
      const prisma = getPrisma();

      // Check if model exists
      const model = await prisma.aIModel.findUnique({
        where: { id: modelId },
      });

      if (!model) {
        throw new NotFoundError('Model not found');
      }

      await prisma.aIModel.delete({
        where: { id: modelId },
      });

      logger.info(`Model deleted: ${model.displayName} (${modelId})`);
      return true;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Delete model error:', error);
      throw new AppError('Failed to delete model', 500);
    }
  }
}

module.exports = new AIModelService();

