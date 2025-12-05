const aiModelService = require('../services/aiModelService');
const ResponseUtil = require('../utils/response');
const asyncHandler = require('../middleware/asyncHandler');

class AIModelController {
  /**
   * Get all AI providers
   * GET /api/ai-models/providers
   */
  getProviders = asyncHandler(async (req, res) => {
    const providers = await aiModelService.getProviders();
    ResponseUtil.success(res, providers, 'Providers retrieved successfully');
  });

  /**
   * Get models by type
   * GET /api/ai-models/type/:type
   */
  getModelsByType = asyncHandler(async (req, res) => {
    const { type } = req.params;
    const models = await aiModelService.getModelsByType(type);
    ResponseUtil.success(res, models, 'Models retrieved successfully');
  });

  /**
   * Get all models grouped by type
   * GET /api/ai-models/grouped
   */
  getModelsGrouped = asyncHandler(async (req, res) => {
    const grouped = await aiModelService.getModelsGroupedByType();
    ResponseUtil.success(res, grouped, 'Models retrieved successfully');
  });

  /**
   * Get model by ID
   * GET /api/ai-models/:id
   */
  getModel = asyncHandler(async (req, res) => {
    const model = await aiModelService.getModelById(req.params.id);
    ResponseUtil.success(res, model, 'Model retrieved successfully');
  });

  /**
   * Get configuration options for project creation
   * GET /api/ai-models/config-options
   */
  getConfigOptions = asyncHandler(async (req, res) => {
    const options = await aiModelService.getConfigOptions();
    ResponseUtil.success(res, options, 'Config options retrieved successfully');
  });

  // ==================== Provider CRUD ====================

  /**
   * Get all providers (including inactive)
   * GET /api/ai-models/providers/all
   */
  getAllProviders = asyncHandler(async (req, res) => {
    const providers = await aiModelService.getAllProviders();
    ResponseUtil.success(res, providers, 'All providers retrieved successfully');
  });

  /**
   * Get provider by ID
   * GET /api/ai-models/providers/:id
   */
  getProviderById = asyncHandler(async (req, res) => {
    const provider = await aiModelService.getProviderById(req.params.id);
    ResponseUtil.success(res, provider, 'Provider retrieved successfully');
  });

  /**
   * Create a new provider
   * POST /api/ai-models/providers
   */
  createProvider = asyncHandler(async (req, res) => {
    const provider = await aiModelService.createProvider(req.body);
    ResponseUtil.success(res, provider, 'Provider created successfully', 201);
  });

  /**
   * Update a provider
   * PUT /api/ai-models/providers/:id
   */
  updateProvider = asyncHandler(async (req, res) => {
    const provider = await aiModelService.updateProvider(req.params.id, req.body);
    ResponseUtil.success(res, provider, 'Provider updated successfully');
  });

  /**
   * Delete a provider
   * DELETE /api/ai-models/providers/:id
   */
  deleteProvider = asyncHandler(async (req, res) => {
    await aiModelService.deleteProvider(req.params.id);
    ResponseUtil.success(res, null, 'Provider deleted successfully');
  });

  // ==================== Model CRUD ====================

  /**
   * Get all models (including inactive)
   * GET /api/ai-models/all
   */
  getAllModels = asyncHandler(async (req, res) => {
    const models = await aiModelService.getAllModels();
    ResponseUtil.success(res, models, 'All models retrieved successfully');
  });

  /**
   * Create a new model
   * POST /api/ai-models
   */
  createModel = asyncHandler(async (req, res) => {
    const model = await aiModelService.createModel(req.body);
    ResponseUtil.success(res, model, 'Model created successfully', 201);
  });

  /**
   * Update a model
   * PUT /api/ai-models/:id
   */
  updateModel = asyncHandler(async (req, res) => {
    const model = await aiModelService.updateModel(req.params.id, req.body);
    ResponseUtil.success(res, model, 'Model updated successfully');
  });

  /**
   * Delete a model
   * DELETE /api/ai-models/:id
   */
  deleteModel = asyncHandler(async (req, res) => {
    await aiModelService.deleteModel(req.params.id);
    ResponseUtil.success(res, null, 'Model deleted successfully');
  });
}

module.exports = new AIModelController();

