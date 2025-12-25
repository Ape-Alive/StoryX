const asyncHandler = require('../middleware/asyncHandler');
const ResponseUtil = require('../utils/response');
const mediaService = require('../services/mediaService');

class MediaController {
    /**
     * 1. 获取当前项目下指定小说的所有剧幕（包含场景、镜头等信息）
     * GET /api/media/projects/:projectId/novels/:novelId/acts
     */
    getNovelActsWithDetails = asyncHandler(async (req, res) => {
        const { projectId, novelId } = req.params;
        const userId = req.user.id;

        const acts = await mediaService.getNovelActsWithDetails(projectId, novelId, userId);
        ResponseUtil.success(res, acts, 'Novel acts retrieved successfully');
    });

    /**
     * 2. 按剧幕依次生成镜头视频
     * POST /api/media/projects/:projectId/novels/:novelId/generate-shots
     */
    generateShotsByActs = asyncHandler(async (req, res) => {
        const { projectId, novelId } = req.params;
        const userId = req.user.id;
        const { actIds = [], sceneIds = [], concurrency = 3, apiConfig = {}, allowOverwrite = false, keepBoth = false, storageMode = 'download_upload', featurePromptId, mergeShots = false, maxDuration = null, toleranceSec = 5 } = req.body;

        if (!featurePromptId) {
            return ResponseUtil.error(res, 'featurePromptId is required', 400);
        }

        const result = await mediaService.generateShotsByActs(projectId, novelId, userId, {
            actIds,
            sceneIds,
            concurrency,
            apiConfig,
            allowOverwrite,
            keepBoth,
            storageMode,
            featurePromptId,
            mergeShots,
            maxDuration,
            toleranceSec,
        });

        // 根据返回结果设置消息
        const message = result.total === 0 && result.message
            ? result.message
            : result.total > 0
                ? `Shot generation started successfully. ${result.total} task(s) created.`
                : 'Shot generation started successfully';
        ResponseUtil.success(res, result, message, 201);
    });

    /**
     * 3. 生成指定单个镜头视频
     * POST /api/media/projects/:projectId/shots/generate
     */
    generateShotsByIds = asyncHandler(async (req, res) => {
        const { projectId } = req.params;
        const { novelId } = req.query;
        const userId = req.user.id;
        const { shotIds, concurrency = 3, apiConfig = {}, allowOverwrite = false, keepBoth = false, storageMode = 'download_upload', featurePromptId = null, mergeShots = false, maxDuration = null, toleranceSec = 5 } = req.body;

        if (!shotIds || !Array.isArray(shotIds) || shotIds.length === 0) {
            return ResponseUtil.error(res, 'shotIds is required and must be a non-empty array', 400);
        }

        const result = await mediaService.generateShotsByIds(projectId, shotIds, userId, {
            novelId,
            concurrency,
            apiConfig,
            allowOverwrite,
            keepBoth,
            storageMode,
            featurePromptId,
            mergeShots,
            maxDuration,
            toleranceSec,
        });

        // 根据返回结果设置消息
        const message = result.total === 0 && result.message
            ? result.message
            : result.total > 0
                ? `Shot generation started successfully. ${result.total} task(s) created.`
                : 'Shot generation started successfully';
        ResponseUtil.success(res, result, message, 201);
    });

    /**
     * 4. 新增镜头
     * POST /api/media/projects/:projectId/acts/:actId/shots
     */
    createShot = asyncHandler(async (req, res) => {
        const { projectId, actId } = req.params;
        const userId = req.user.id;
        const { insertPosition = 'after', targetShotId = null, ...shotData } = req.body;

        const shot = await mediaService.createShot(projectId, actId, userId, shotData, {
            insertPosition,
            targetShotId,
        });
        ResponseUtil.success(res, shot, 'Shot created successfully', 201);
    });

    /**
     * 5. 修改镜头
     * PUT /api/media/projects/:projectId/shots/:shotId
     */
    updateShot = asyncHandler(async (req, res) => {
        const { projectId, shotId } = req.params;
        const userId = req.user.id;
        const updateData = req.body;

        const shot = await mediaService.updateShot(projectId, shotId, userId, updateData);
        ResponseUtil.success(res, shot, 'Shot updated successfully');
    });

    /**
     * 6. 删除镜头（支持批量删除）
     * DELETE /api/media/projects/:projectId/shots
     */
    deleteShots = asyncHandler(async (req, res) => {
        const { projectId } = req.params;
        const userId = req.user.id;
        const { shotIds } = req.body;

        if (!shotIds || !Array.isArray(shotIds) || shotIds.length === 0) {
            return ResponseUtil.error(res, 'shotIds is required and must be a non-empty array', 400);
        }

        const result = await mediaService.deleteShots(projectId, shotIds, userId);
        ResponseUtil.success(res, result, 'Shots deleted successfully');
    });

    /**
     * 7. 生成台词音频
     * POST /api/media/projects/:projectId/dialogues/generate-audio
     */
    generateDialoguesAudio = asyncHandler(async (req, res) => {
        const { projectId } = req.params;
        const userId = req.user.id;
        const { dialogueIds, concurrency = 3, apiConfig = {}, storageMode = 'download_upload', featurePromptId = null } = req.body;

        if (!dialogueIds || !Array.isArray(dialogueIds) || dialogueIds.length === 0) {
            return ResponseUtil.error(res, 'dialogueIds is required and must be a non-empty array', 400);
        }

        const result = await mediaService.generateDialoguesAudio(projectId, dialogueIds, userId, {
            concurrency,
            apiConfig,
            storageMode,
            featurePromptId,
        });
        ResponseUtil.success(res, result, 'Dialogue audio generation started successfully', 201);
    });

    /**
     * 8. 修改台词内容
     * PUT /api/media/projects/:projectId/dialogues/:dialogueId
     */
    updateDialogue = asyncHandler(async (req, res) => {
        const { projectId, dialogueId } = req.params;
        const userId = req.user.id;
        const updateData = req.body;

        const dialogue = await mediaService.updateDialogue(projectId, dialogueId, userId, updateData);
        ResponseUtil.success(res, dialogue, 'Dialogue updated successfully');
    });

    /**
     * 9. 删除台词内容
     * DELETE /api/media/projects/:projectId/dialogues/:dialogueId
     */
    deleteDialogue = asyncHandler(async (req, res) => {
        const { projectId, dialogueId } = req.params;
        const userId = req.user.id;

        const result = await mediaService.deleteDialogue(projectId, dialogueId, userId);
        ResponseUtil.success(res, result, 'Dialogue deleted successfully');
    });

    /**
     * 10. 预览视频
     * GET /api/media/projects/:projectId/preview/video
     */
    previewVideo = asyncHandler(async (req, res) => {
        const { projectId } = req.params;
        const userId = req.user.id;
        const { type = 'act', actId = null, shotId = null } = req.query;

        const result = await mediaService.previewVideo(projectId, userId, {
            type,
            actId,
            shotId,
        });
        ResponseUtil.success(res, result, 'Video preview generated successfully');
    });

    /**
     * 11. 预览带台词音频的视频
     * GET /api/media/projects/:projectId/preview/video-with-audio
     */
    previewVideoWithAudio = asyncHandler(async (req, res) => {
        const { projectId } = req.params;
        const userId = req.user.id;
        const { type = 'act', actId = null, shotId = null } = req.query;

        const result = await mediaService.previewVideoWithAudio(projectId, userId, {
            type,
            actId,
            shotId,
        });
        ResponseUtil.success(res, result, 'Video with audio preview generated successfully');
    });

    /**
     * 12. 导出按幕导出视频
     * POST /api/media/projects/:projectId/export/acts
     */
    exportActs = asyncHandler(async (req, res) => {
        const { projectId } = req.params;
        const userId = req.user.id;
        const { actIds, exportType = 'video', outputDir = null } = req.body;

        if (!actIds || !Array.isArray(actIds) || actIds.length === 0) {
            return ResponseUtil.error(res, 'actIds is required and must be a non-empty array', 400);
        }

        const result = await mediaService.exportActs(projectId, actIds, userId, {
            exportType,
            outputDir,
        });
        ResponseUtil.success(res, result, 'Acts exported successfully');
    });

    /**
     * 13. 导出单个视频或音频
     * POST /api/media/projects/:projectId/export/single
     */
    exportSingleMedia = asyncHandler(async (req, res) => {
        const { projectId } = req.params;
        const userId = req.user.id;
        const { type = 'video', url, outputDir = null, fileName = null } = req.body;

        const result = await mediaService.exportSingleMedia(projectId, userId, {
            type,
            url,
            outputDir,
            fileName,
        });
        ResponseUtil.success(res, result, 'Media exported successfully');
    });

    /**
     * 查询镜头视频生成任务进度
     * GET /api/media/tasks/:taskId
     */
    getShotVideoTaskProgress = asyncHandler(async (req, res) => {
        const { taskId } = req.params;
        const userId = req.user.id;

        const progress = await mediaService.getShotVideoTaskProgress(taskId, userId);
        ResponseUtil.success(res, progress, 'Shot video task progress retrieved successfully');
    });

    /**
     * 查询剧幕下的所有镜头视频生成任务
     * GET /api/media/acts/:actId/tasks
     */
    getActShotVideoTasks = asyncHandler(async (req, res) => {
        const { actId } = req.params;
        const { status } = req.query;
        const userId = req.user.id;

        const tasks = await mediaService.getActShotVideoTasks(actId, userId, status || null);
        ResponseUtil.success(res, tasks, 'Act shot video tasks retrieved successfully');
    });

    /**
     * 查询项目/小说下的所有镜头视频生成任务
     * GET /api/media/projects/:projectId/tasks
     */
    getProjectShotVideoTasks = asyncHandler(async (req, res) => {
        const { projectId } = req.params;
        const { novelId, status } = req.query;
        const userId = req.user.id;

        const tasks = await mediaService.getProjectShotVideoTasks(
            projectId,
            novelId || null,
            userId,
            status || null
        );
        ResponseUtil.success(res, tasks, 'Project shot video tasks retrieved successfully');
    });
}

module.exports = new MediaController();

