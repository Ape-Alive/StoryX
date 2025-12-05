const sceneService = require('../services/sceneService');
const ResponseUtil = require('../utils/response');
const asyncHandler = require('../middleware/asyncHandler');
const { AppError } = require('../utils/errors');

class SceneController {
    /**
     * 获取场景列表
     * GET /api/scenes
     */
    getScenes = asyncHandler(async (req, res) => {
        const { projectId, novelId } = req.query;
        const userId = req.user.id;

        const scenes = await sceneService.getScenes(projectId, novelId, userId);
        ResponseUtil.success(res, scenes, 'Scenes retrieved successfully');
    });

    /**
     * 生成场景图（支持单个或批量）
     * POST /api/scenes/generate-image
     */
    generateSceneImage = asyncHandler(async (req, res) => {
        const { sceneIds, projectId, modelId, prompt, config: imageConfig } = req.body;
        const userId = req.user.id;

        if (!sceneIds) {
            throw new AppError('sceneIds is required', 400);
        }

        if (!projectId) {
            throw new AppError('projectId is required', 400);
        }

        // 支持单个场景ID或场景ID数组
        const sceneIdArray = Array.isArray(sceneIds) ? sceneIds : [sceneIds];
        if (sceneIdArray.length === 0) {
            throw new AppError('At least one sceneId is required', 400);
        }

        const result = await sceneService.generateSceneImage(
            sceneIdArray,
            projectId,
            userId,
            {
                modelId: modelId || null,
                prompt: prompt || null,
                config: imageConfig || {},
            }
        );

        ResponseUtil.success(res, result, 'Scene image generation started successfully', 201);
    });

    /**
     * 新增场景
     * POST /api/scenes
     */
    createScene = asyncHandler(async (req, res) => {
        const sceneData = req.body;
        const userId = req.user.id;

        if (!sceneData.actId) {
            throw new AppError('actId is required', 400);
        }

        if (!sceneData.address) {
            throw new AppError('address is required', 400);
        }

        const scene = await sceneService.createScene(sceneData, userId);
        ResponseUtil.success(res, scene, 'Scene created successfully', 201);
    });

    /**
     * 修改场景描述
     * PUT /api/scenes/:sceneId
     */
    updateScene = asyncHandler(async (req, res) => {
        const { sceneId } = req.params;
        const updateData = req.body;
        const userId = req.user.id;

        const scene = await sceneService.updateScene(sceneId, userId, updateData);
        ResponseUtil.success(res, scene, 'Scene updated successfully');
    });

    /**
     * 查询场景图生成进度
     * GET /api/scenes/image-tasks/:taskId
     */
    getSceneImageTaskProgress = asyncHandler(async (req, res) => {
        const { taskId } = req.params;
        const userId = req.user.id;

        const progress = await sceneService.getSceneImageTaskProgress(taskId, userId);
        ResponseUtil.success(res, progress, 'Scene image task progress retrieved successfully');
    });
}

module.exports = new SceneController();

