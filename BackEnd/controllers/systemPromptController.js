const systemPromptService = require('../services/systemPromptService');
const ResponseUtil = require('../utils/response');
const asyncHandler = require('../middleware/asyncHandler');
const { AppError } = require('../utils/errors');

class SystemPromptController {
    /**
     * 创建系统提示词
     * POST /api/system-prompts
     */
    createSystemPrompt = asyncHandler(async (req, res) => {
        const result = await systemPromptService.createSystemPrompt(req.body);
        ResponseUtil.success(res, result, 'System prompt created successfully', 201);
    });

    /**
     * 更新系统提示词
     * PUT /api/system-prompts/:id
     */
    updateSystemPrompt = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const result = await systemPromptService.updateSystemPrompt(id, req.body);
        ResponseUtil.success(res, result, 'System prompt updated successfully');
    });

    /**
     * 删除系统提示词
     * DELETE /api/system-prompts/:id
     */
    deleteSystemPrompt = asyncHandler(async (req, res) => {
        const { id } = req.params;
        await systemPromptService.deleteSystemPrompt(id);
        ResponseUtil.success(res, null, 'System prompt deleted successfully');
    });

    /**
     * 获取所有系统提示词
     * GET /api/system-prompts
     */
    getAllSystemPrompts = asyncHandler(async (req, res) => {
        const { category, isActive } = req.query;
        const options = {};
        // 只有当category不是undefined且不是空字符串时才添加
        if (category !== undefined && category !== '') {
            options.category = category;
        }
        // 只有当isActive不是undefined且不是空字符串时才添加
        if (isActive !== undefined && isActive !== '') {
            options.isActive = isActive === 'true';
        }

        const prompts = await systemPromptService.getAllSystemPrompts(options);
        ResponseUtil.success(res, prompts, 'System prompts retrieved successfully');
    });

    /**
     * 根据ID获取系统提示词
     * GET /api/system-prompts/:id
     */
    getSystemPromptById = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const prompt = await systemPromptService.getSystemPromptById(id);
        ResponseUtil.success(res, prompt, 'System prompt retrieved successfully');
    });

    /**
     * 根据功能标识获取系统提示词
     * GET /api/system-prompts/function/:functionKey
     */
    getSystemPromptByFunctionKey = asyncHandler(async (req, res) => {
        const { functionKey } = req.params;
        const prompt = await systemPromptService.getSystemPromptByFunctionKey(functionKey);

        if (!prompt) {
            throw new AppError('System prompt not found', 404);
        }

        ResponseUtil.success(res, prompt, 'System prompt retrieved successfully');
    });

    /**
     * 根据分类获取系统提示词
     * GET /api/system-prompts/category/:category
     */
    getSystemPromptsByCategory = asyncHandler(async (req, res) => {
        const { category } = req.params;
        const prompts = await systemPromptService.getSystemPromptsByCategory(category);
        ResponseUtil.success(res, prompts, 'System prompts retrieved successfully');
    });

    /**
     * 创建功能提示词
     * POST /api/system-prompts/:systemPromptId/feature-prompts
     */
    createFeaturePrompt = asyncHandler(async (req, res) => {
        const { systemPromptId } = req.params;
        const prompt = await systemPromptService.createFeaturePrompt(systemPromptId, req.body);
        ResponseUtil.success(res, prompt, 'Feature prompt created successfully', 201);
    });

    /**
     * 获取功能提示词列表
     * GET /api/system-prompts/:systemPromptId/feature-prompts
     * 可选 query: functionType, functionKey
     * 当 systemPromptId 和 functionKey 都存在时，优先使用 systemPromptId
     * 如果 systemPromptId 不是有效的 UUID，则使用 functionKey 查询
     */
    getFeaturePrompts = asyncHandler(async (req, res) => {
        const { systemPromptId } = req.params;
        const { functionType, functionKey } = req.query;

        // UUID 格式验证正则表达式
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

        let finalSystemPromptId = null;
        let finalFunctionKey = null;

        // 检查 systemPromptId 是否是有效的 UUID
        if (systemPromptId && uuidRegex.test(systemPromptId)) {
            // 优先使用 systemPromptId（如果它是有效的 UUID）
            finalSystemPromptId = systemPromptId;
        } else if (functionKey) {
            // 如果 systemPromptId 不是有效的 UUID，使用 functionKey
            finalFunctionKey = functionKey;
        } else {
            // 如果 systemPromptId 不是有效的 UUID 且没有提供 functionKey，返回错误
            return ResponseUtil.error(res, 'Either a valid systemPromptId (UUID) or functionKey (query parameter) is required', 400);
        }

        const list = await systemPromptService.getFeaturePrompts({
            systemPromptId: finalSystemPromptId,
            functionKey: finalFunctionKey,
            functionType,
        });
        ResponseUtil.success(res, list, 'Feature prompts retrieved successfully');
    });

    /**
     * 获取功能提示词列表（通过 functionKey，不需要 systemPromptId）
     * GET /api/system-prompts/feature-prompts?functionKey=xxx
     * 可选 query: functionType
     */
    getFeaturePromptsByFunctionKey = asyncHandler(async (req, res) => {
        const { functionKey, functionType } = req.query;

        if (!functionKey) {
            return ResponseUtil.error(res, 'functionKey is required', 400);
        }

        const list = await systemPromptService.getFeaturePrompts({
            functionKey,
            functionType,
        });
        ResponseUtil.success(res, list, 'Feature prompts retrieved successfully');
    });

    /**
     * 获取单个功能提示词
     * GET /api/system-prompts/feature-prompts/:id
     */
    getFeaturePromptById = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const item = await systemPromptService.getFeaturePromptById(id);
        ResponseUtil.success(res, item, 'Feature prompt retrieved successfully');
    });

    /**
     * 更新功能提示词
     * PUT /api/system-prompts/feature-prompts/:id
     */
    updateFeaturePrompt = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const updated = await systemPromptService.updateFeaturePrompt(id, req.body);
        ResponseUtil.success(res, updated, 'Feature prompt updated successfully');
    });

    /**
     * 删除功能提示词
     * DELETE /api/system-prompts/feature-prompts/:id
     */
    deleteFeaturePrompt = asyncHandler(async (req, res) => {
        const { id } = req.params;
        await systemPromptService.deleteFeaturePrompt(id);
        ResponseUtil.success(res, null, 'Feature prompt deleted successfully');
    });
}

module.exports = new SystemPromptController();

