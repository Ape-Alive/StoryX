const express = require('express');
const { body, query } = require('express-validator');
const mediaController = require('../controllers/mediaController');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validator');

const router = express.Router();

// 所有路由需要认证
router.use(authenticate);

/**
 * @swagger
 * /api/media/projects/{projectId}/novels/{novelId}/acts:
 *   get:
 *     summary: 获取当前项目下指定小说的所有剧幕（包含场景、镜头等信息）
 *     description: 获取指定小说的所有剧幕，按章节顺序排序，包含场景、镜头等完整信息
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 项目ID
 *       - in: path
 *         name: novelId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 小说ID
 *     responses:
 *       200:
 *         description: 成功返回剧幕列表
 */
router.get('/projects/:projectId/novels/:novelId/acts', mediaController.getNovelActsWithDetails);

/**
 * @swagger
 * /api/media/projects/{projectId}/novels/{novelId}/generate-shots:
 *   post:
 *     summary: 按剧幕依次生成镜头视频
 *     description: 按剧幕顺序依次生成镜头视频，支持并发
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: novelId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               actIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 description: 剧幕ID数组，如果为空则生成所有剧幕下的镜头视频
 *                 example: ["act-uuid-1", "act-uuid-2"]
 *               concurrency:
 *                 type: integer
 *                 default: 3
 *                 description: 并发数
 *               apiConfig:
 *                 type: object
 *                 description: 自定义API参数
 *               allowOverwrite:
 *                 type: boolean
 *                 default: false
 *                 description: 是否允许覆盖已生成的视频
 *               storageMode:
 *                 type: string
 *                 enum: [download_upload, buffer_upload]
 *                 default: download_upload
 *                 description: 存储方式，download_upload=下载到本地再上传到Catbox，buffer_upload=直接下载Buffer然后上传到Catbox
 *               featurePromptId:
 *                 type: string
 *                 format: uuid
 *                 description: 功能提示词ID（FeaturePrompt表的id），用于获取功能提示词
 *                 example: feature-prompt-uuid
 *     responses:
 *       201:
 *         description: 生成任务已启动
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                   description: 总镜头数
 *                 acts:
 *                   type: array
 *                   description: 按剧幕组织的任务列表
 *                   items:
 *                     type: object
 *                     properties:
 *                       actId:
 *                         type: string
 *                         format: uuid
 *                         description: 剧幕ID
 *                       actName:
 *                         type: string
 *                         description: 剧幕名称
 *                       order:
 *                         type: integer
 *                         description: 剧幕顺序
 *                       startChapterOrder:
 *                         type: integer
 *                         description: 起始章节顺序
 *                       taskIds:
 *                         type: array
 *                         items:
 *                           type: string
 *                           format: uuid
 *                         description: 该剧幕下的镜头生成任务ID数组
 */
router.post('/projects/:projectId/novels/:novelId/generate-shots', mediaController.generateShotsByActs);

/**
 * @swagger
 * /api/media/projects/{projectId}/shots/generate:
 *   post:
 *     summary: 生成指定单个镜头视频
 *     description: 根据镜头ID数组生成视频，支持并发和覆盖
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 项目ID
 *       - in: query
 *         name: novelId
 *         required: false
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 小说ID（可选，用于验证镜头是否属于该小说）
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - shotIds
 *             properties:
 *               shotIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 镜头ID数组
 *               concurrency:
 *                 type: integer
 *                 default: 3
 *               apiConfig:
 *                 type: object
 *               allowOverwrite:
 *                 type: boolean
 *                 default: false
 *               keepBoth:
 *                 type: boolean
 *                 default: false
 *                 description: 是否保留两者（生成新版本但不删除旧版本）
 *               storageMode:
 *                 type: string
 *                 enum: [download_upload, buffer_upload]
 *                 default: download_upload
 *                 description: 存储方式，download_upload=下载到本地再上传到Catbox，buffer_upload=直接下载Buffer然后上传到Catbox
 *               featurePromptId:
 *                 type: string
 *                 format: uuid
 *                 description: 功能提示词ID（FeaturePrompt表的id），用于获取功能提示词
 *                 example: "feature-prompt-uuid"
 *               mergeShots:
 *                 type: boolean
 *                 default: false
 *                 description: 是否合并多个镜头为一个视频（自动分组）
 *               maxDuration:
 *                 type: number
 *                 description: 合并模式下的目标时长（秒），mergeShots=true时必填
 *                 example: 10
 *               toleranceSec:
 *                 type: number
 *                 default: 5
 *                 description: 时长容差（秒），合并后的总时长应在 [maxDuration - toleranceSec, maxDuration + toleranceSec] 范围内
 *                 example: 5
 *     responses:
 *       201:
 *         description: 生成任务已启动
 */
router.post(
    '/projects/:projectId/shots/generate',
    [
        body('shotIds')
            .isArray({ min: 1 })
            .withMessage('shotIds must be a non-empty array'),
        body('mergeShots')
            .optional()
            .isBoolean()
            .withMessage('mergeShots must be a boolean'),
        body('maxDuration')
            .optional()
            .isFloat({ min: 0.1 })
            .withMessage('maxDuration must be a positive number'),
        body('toleranceSec')
            .optional()
            .isFloat({ min: 0 })
            .withMessage('toleranceSec must be a non-negative number'),
    ],
    validate,
    mediaController.generateShotsByIds
);

/**
 * @swagger
 * /api/media/projects/{projectId}/acts/{actId}/shots:
 *   post:
 *     summary: 新增镜头
 *     description: 在指定剧幕中新增镜头，支持向前或向后插入
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 */
router.post('/projects/:projectId/acts/:actId/shots', mediaController.createShot);

/**
 * @swagger
 * /api/media/projects/{projectId}/shots/{shotId}:
 *   put:
 *     summary: 修改镜头
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 */
router.put('/projects/:projectId/shots/:shotId', mediaController.updateShot);

/**
 * @swagger
 * /api/media/projects/{projectId}/shots:
 *   delete:
 *     summary: 删除镜头（支持批量删除）
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 */
router.delete(
    '/projects/:projectId/shots',
    [
        body('shotIds')
            .isArray({ min: 1 })
            .withMessage('shotIds must be a non-empty array'),
    ],
    validate,
    mediaController.deleteShots
);

/**
 * @swagger
 * /api/media/projects/{projectId}/dialogues/generate-audio:
 *   post:
 *     summary: 生成台词音频
 *     description: 批量生成台词音频，支持并发
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - dialogueIds
 *             properties:
 *               dialogueIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 对话ID数组（格式：shotId_index）
 *               concurrency:
 *                 type: integer
 *                 default: 3
 *                 description: 并发数
 *               apiConfig:
 *                 type: object
 *                 description: 自定义API参数
 *               storageMode:
 *                 type: string
 *                 enum: [download_upload, buffer_upload]
 *                 default: download_upload
 *                 description: 存储方式，download_upload=下载到本地再上传到Catbox，buffer_upload=直接下载Buffer然后上传到Catbox
 *               featurePromptId:
 *                 type: string
 *                 format: uuid
 *                 description: 功能提示词ID（FeaturePrompt表的id），用于获取功能提示词
 *                 example: "feature-prompt-uuid"
 *     responses:
 *       201:
 *         description: 生成任务已启动
 */
router.post(
    '/projects/:projectId/dialogues/generate-audio',
    [
        body('dialogueIds')
            .isArray({ min: 1 })
            .withMessage('dialogueIds must be a non-empty array'),
    ],
    validate,
    mediaController.generateDialoguesAudio
);

/**
 * @swagger
 * /api/media/projects/{projectId}/dialogues/{dialogueId}:
 *   put:
 *     summary: 修改台词内容
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 */
router.put('/projects/:projectId/dialogues/:dialogueId', mediaController.updateDialogue);

/**
 * @swagger
 * /api/media/projects/{projectId}/dialogues/{dialogueId}:
 *   delete:
 *     summary: 删除台词内容
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/projects/:projectId/dialogues/:dialogueId', mediaController.deleteDialogue);

/**
 * @swagger
 * /api/media/projects/{projectId}/preview/video:
 *   get:
 *     summary: 预览视频
 *     description: 预览一幕的视频拼接或单个镜头视频
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [act, shot]
 *         description: 预览类型
 *       - in: query
 *         name: actId
 *         schema:
 *           type: string
 *         description: 剧幕ID（type=act时必填）
 *       - in: query
 *         name: shotId
 *         schema:
 *           type: string
 *         description: 镜头ID（type=shot时必填）
 */
router.get('/projects/:projectId/preview/video', mediaController.previewVideo);

/**
 * @swagger
 * /api/media/projects/{projectId}/preview/video-with-audio:
 *   get:
 *     summary: 预览带台词音频的视频
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 */
router.get('/projects/:projectId/preview/video-with-audio', mediaController.previewVideoWithAudio);

/**
 * @swagger
 * /api/media/projects/{projectId}/export/acts:
 *   post:
 *     summary: 导出按幕导出视频
 *     description: 导出指定剧幕的视频/音频/视频+音频
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 */
router.post(
    '/projects/:projectId/export/acts',
    [
        body('actIds')
            .isArray({ min: 1 })
            .withMessage('actIds must be a non-empty array'),
        body('exportType')
            .optional()
            .isIn(['video', 'audio', 'both'])
            .withMessage('exportType must be one of: video, audio, both'),
    ],
    validate,
    mediaController.exportActs
);

/**
 * @swagger
 * /api/media/projects/{projectId}/export/single:
 *   post:
 *     summary: 导出单个视频或音频
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 */
router.post(
    '/projects/:projectId/export/single',
    [
        body('url')
            .notEmpty()
            .withMessage('url is required'),
        body('type')
            .optional()
            .isIn(['video', 'audio'])
            .withMessage('type must be one of: video, audio'),
    ],
    validate,
    mediaController.exportSingleMedia
);

/**
 * @swagger
 * /api/media/tasks/{taskId}:
 *   get:
 *     summary: 查询镜头视频生成任务进度
 *     description: 根据任务ID查询单个镜头视频生成任务的进度
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 任务ID
 *     responses:
 *       200:
 *         description: 成功返回任务进度
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 taskId:
 *                   type: string
 *                   format: uuid
 *                 shotId:
 *                   type: string
 *                   format: uuid
 *                 actId:
 *                   type: string
 *                   format: uuid
 *                 actName:
 *                   type: string
 *                 shotInfo:
 *                   type: object
 *                 status:
 *                   type: string
 *                   enum: [pending, processing, completed, failed]
 *                 progress:
 *                   type: integer
 *                   minimum: 0
 *                   maximum: 100
 *                 videoUrl:
 *                   type: string
 *                   nullable: true
 *                 videoPath:
 *                   type: string
 *                   nullable: true
 *                 errorMessage:
 *                   type: string
 *                   nullable: true
 *                 startedAt:
 *                   type: string
 *                   format: date-time
 *                   nullable: true
 *                 completedAt:
 *                   type: string
 *                   format: date-time
 *                   nullable: true
 */
router.get('/tasks/:taskId', mediaController.getShotVideoTaskProgress);

/**
 * @swagger
 * /api/media/acts/{actId}/tasks:
 *   get:
 *     summary: 查询剧幕下的所有镜头视频生成任务
 *     description: 查询指定剧幕下的所有镜头视频生成任务，支持按状态过滤
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: actId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 剧幕ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, processing, completed, failed]
 *         description: 任务状态过滤（可选）
 *     responses:
 *       200:
 *         description: 成功返回任务列表
 */
router.get('/acts/:actId/tasks', mediaController.getActShotVideoTasks);

/**
 * @swagger
 * /api/media/projects/{projectId}/tasks:
 *   get:
 *     summary: 查询项目/小说下的所有镜头视频生成任务
 *     description: 查询指定项目或小说下的所有镜头视频生成任务，支持按状态过滤
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 项目ID
 *       - in: query
 *         name: novelId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 小说ID（可选，如果提供则只查询该小说下的任务）
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, processing, completed, failed]
 *         description: 任务状态过滤（可选）
 *     responses:
 *       200:
 *         description: 成功返回任务列表
 */
router.get('/projects/:projectId/tasks', mediaController.getProjectShotVideoTasks);

module.exports = router;

