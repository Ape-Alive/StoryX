const scriptService = require('../services/scriptService');
const ResponseUtil = require('../utils/response');
const asyncHandler = require('../middleware/asyncHandler');
const { AppError } = require('../utils/errors');

class ScriptController {
    /**
     * 启动剧本生成
     * POST /api/novels/:novelId/script/generate
     */
    startScriptGeneration = asyncHandler(async (req, res) => {
        const { novelId } = req.params;
        const { projectId } = req.body;
        const userId = req.user.id;

        if (!projectId) {
            throw new AppError('projectId is required', 400);
        }

        const config = {
            selectedChapterIds: req.body.selectedChapterIds || [],
            taskType: req.body.taskType || 'by_chapters',
            chaptersPerTask: req.body.chaptersPerTask || 1,
            wordsPerTask: req.body.wordsPerTask || 4000,
            startChapter: req.body.startChapter,
            endChapter: req.body.endChapter,
        };

        const result = await scriptService.startScriptGeneration(
            novelId,
            projectId,
            userId,
            config
        );

        ResponseUtil.success(res, result, 'Script generation started successfully', 201);
    });

    /**
     * 获取小说的所有剧本生成任务
     * GET /api/novels/:novelId/script/tasks
     */
    getNovelScriptTasks = asyncHandler(async (req, res) => {
        const { novelId } = req.params;
        const userId = req.user.id;

        const tasks = await scriptService.getNovelScriptTasks(novelId, userId);
        ResponseUtil.success(res, tasks, 'Script tasks retrieved successfully');
    });

    /**
     * 获取单个任务详情
     * GET /api/script/tasks/:taskId
     */
    getScriptTask = asyncHandler(async (req, res) => {
        const { taskId } = req.params;
        const userId = req.user.id;

        const task = await scriptService.getScriptTask(taskId, userId);
        ResponseUtil.success(res, task, 'Script task retrieved successfully');
    });

    /**
     * 重新生成剧本数据结构
     * POST /api/script/tasks/:taskId/regenerate
     */
    regenerateScript = asyncHandler(async (req, res) => {
        const { taskId } = req.params;
        const { projectId, novelId, overwrite = true } = req.body;
        const userId = req.user.id;

        if (!projectId) {
            throw new AppError('projectId is required', 400);
        }
        if (!novelId) {
            throw new AppError('novelId is required', 400);
        }

        const result = await scriptService.regenerateScript(taskId, projectId, novelId, userId, overwrite);
        ResponseUtil.success(res, result, 'Script regeneration started successfully', 201);
    });

    /**
     * 获取小说的所有剧幕（按章节顺序排序）
     * GET /api/novels/:novelId/acts
     */
    getNovelActs = asyncHandler(async (req, res) => {
        const { novelId } = req.params;
        const userId = req.user.id;

        const acts = await scriptService.getNovelActs(novelId, userId);
        ResponseUtil.success(res, acts, 'Novel acts retrieved successfully');
    });
}

module.exports = new ScriptController();

