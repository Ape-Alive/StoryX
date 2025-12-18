const characterDrawService = require('../services/characterDrawService');
const ResponseUtil = require('../utils/response');
const asyncHandler = require('../middleware/asyncHandler');
const { AppError } = require('../utils/errors');

class CharacterDrawController {
    /**
     * 批量抽卡（每个角色创建一个任务）
     * POST /api/characters/draw
     */
    startBatchDraw = asyncHandler(async (req, res) => {
        const { characterIds, projectId, drawType, apiConfig, storageMode, featurePromptId, genreStyle } = req.body;
        const userId = req.user.id;

        if (!characterIds || !Array.isArray(characterIds) || characterIds.length === 0) {
            throw new AppError('characterIds is required and must be a non-empty array', 400);
        }

        if (!projectId) {
            throw new AppError('projectId is required', 400);
        }

        if (drawType && drawType !== 'image' && drawType !== 'video') {
            throw new AppError('drawType must be "image" or "video"', 400);
        }

        if (storageMode && storageMode !== 'download_upload' && storageMode !== 'buffer_upload') {
            throw new AppError('storageMode must be "download_upload" or "buffer_upload"', 400);
        }

        const taskIds = await characterDrawService.startBatchDraw(
            characterIds,
            projectId,
            userId,
            {
                drawType: drawType || 'image',
                apiConfig: apiConfig || {}, // 自定义AI API请求参数
                storageMode: storageMode || 'download_upload', // 存储方式
                featurePromptId: featurePromptId || null, // 功能提示词ID
                genreStyle: genreStyle || null, // 题材风格
            }
        );

        ResponseUtil.success(res, { taskIds }, 'Batch draw started successfully', 201);
    });

    /**
     * 查询抽卡进度
     * GET /api/characters/draw/tasks/:taskId
     */
    getDrawTaskProgress = asyncHandler(async (req, res) => {
        const { taskId } = req.params;
        const userId = req.user.id;

        const progress = await characterDrawService.getDrawTaskProgress(taskId, userId);
        ResponseUtil.success(res, progress, 'Draw task progress retrieved successfully');
    });

    /**
     * 获取角色的所有抽卡任务
     * GET /api/characters/:characterId/draw-tasks
     */
    getCharacterDrawTasks = asyncHandler(async (req, res) => {
        const { characterId } = req.params;
        const { type } = req.query; // 'image' | 'video'
        const userId = req.user.id;

        const tasks = await characterDrawService.getCharacterDrawTasks(
            characterId,
            userId,
            type || null
        );

        ResponseUtil.success(res, tasks, 'Character draw tasks retrieved successfully');
    });
}

module.exports = new CharacterDrawController();
