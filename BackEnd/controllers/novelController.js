const novelService = require('../services/novelService');
const ResponseUtil = require('../utils/response');
const asyncHandler = require('../middleware/asyncHandler');
const { AppError } = require('../utils/errors');

class NovelController {
    /**
     * 上传并解析小说
     * POST /api/text/upload
     */
    uploadNovel = asyncHandler(async (req, res) => {
        if (!req.file) {
            throw new AppError('File is required', 400);
        }

        const { projectId } = req.body;
        if (!projectId) {
            throw new AppError('projectId is required', 400);
        }

        const { encoding, customTitle } = req.body;
        const userId = req.user.id;

        const fileData = {
            file: req.file,
            fileName: req.body.fileName || req.file.originalname,
            encoding: encoding || 'UTF-8',
        };

        const result = await novelService.uploadAndParseNovel(
            fileData,
            projectId,
            userId,
            customTitle
        );

        ResponseUtil.success(res, result, 'Novel uploaded and parsed successfully', 201);
    });

    /**
     * 获取小说详情
     * GET /api/novels/:id
     */
    getNovel = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { chapterId } = req.query; // 从查询参数获取 chapterId
        const userId = req.user.id;

        const novel = await novelService.getNovelById(id, userId, chapterId || null);
        ResponseUtil.success(res, novel, 'Novel retrieved successfully');
    });

    /**
     * 上传并解析文本粘贴片段
     * POST /api/text/paste
     */
    uploadTextPaste = asyncHandler(async (req, res) => {
        const { projectId } = req.body;
        if (!projectId) {
            throw new AppError('projectId is required', 400);
        }

        const userId = req.user.id;

        const result = await novelService.uploadAndParseTextPaste(req.body, projectId, userId);
        ResponseUtil.success(res, result, 'Text paste uploaded and parsed successfully', 201);
    });

    /**
     * 获取当前用户的小说列表
     * GET /api/novels?projectId=xxx
     */
    getUserNovels = asyncHandler(async (req, res) => {
        const { projectId } = req.query;
        const userId = req.user.id;

        let novels;
        if (projectId) {
            // 如果提供了 projectId，获取指定项目的小说
            novels = await novelService.getProjectNovels(projectId, userId);
        } else {
            // 否则获取当前用户的所有小说
            novels = await novelService.getUserNovels(userId);
        }

        ResponseUtil.success(res, novels, 'Novels retrieved successfully');
    });

    /**
     * 获取项目的所有小说
     * GET /api/projects/:id/novels
     */
    getProjectNovels = asyncHandler(async (req, res) => {
        const projectId = req.params.id; // 路由参数名是 id，不是 projectId
        const userId = req.user.id;

        const novels = await novelService.getProjectNovels(projectId, userId);
        ResponseUtil.success(res, novels, 'Novels retrieved successfully');
    });

    /**
     * 获取小说的章节列表
     * GET /api/novels/:id/chapters
     */
    getNovelChapters = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const userId = req.user.id;

        const chapters = await novelService.getNovelChapters(id, userId);
        ResponseUtil.success(res, chapters, 'Novel chapters retrieved successfully');
    });

    /**
     * 获取章节内容
     * GET /api/chapters/:id
     */
    getChapterContent = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const userId = req.user.id;

        const chapter = await novelService.getChapterContent(id, userId);
        ResponseUtil.success(res, chapter, 'Chapter content retrieved successfully');
    });

    /**
     * 删除整本小说
     * DELETE /api/novels/:id
     */
    deleteNovel = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const userId = req.user.id;

        await novelService.deleteNovel(id, userId);
        ResponseUtil.success(res, null, 'Novel deleted successfully');
    });
}

module.exports = new NovelController();

