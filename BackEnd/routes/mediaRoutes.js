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
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                             description: 剧幕ID
 *                           scriptTaskId:
 *                             type: string
 *                             format: uuid
 *                             description: 关联的剧本生成任务ID
 *                           novelId:
 *                             type: string
 *                             format: uuid
 *                             description: 小说ID
 *                           projectId:
 *                             type: string
 *                             format: uuid
 *                             description: 项目ID
 *                           actName:
 *                             type: string
 *                             description: 剧幕名称，如 "第一幕"
 *                           content:
 *                             type: string
 *                             nullable: true
 *                             description: 剧幕内容描述
 *                           highlight:
 *                             type: string
 *                             nullable: true
 *                             description: 爽点描述
 *                           emotionalCurve:
 *                             type: string
 *                             nullable: true
 *                             description: 情感曲线描述
 *                           rhythm:
 *                             type: string
 *                             nullable: true
 *                             description: 节奏描述
 *                           chapterIds:
 *                             type: array
 *                             items:
 *                               type: string
 *                               format: uuid
 *                             description: 关联的章节ID列表（数组）
 *                           order:
 *                             type: integer
 *                             description: 剧幕顺序（在任务内的顺序）
 *                           startChapterOrder:
 *                             type: integer
 *                             nullable: true
 *                             description: 起始章节顺序号（用于按章节顺序排序）
 *                           scenes:
 *                             type: array
 *                             description: 场景列表
 *                             items:
 *                               type: object
 *                               properties:
 *                                 id:
 *                                   type: string
 *                                   format: uuid
 *                                   description: 场景ID
 *                                 address:
 *                                   type: string
 *                                   description: 场景地址/地点
 *                                 sceneDescription:
 *                                   type: string
 *                                   nullable: true
 *                                   description: 场景描述
 *                                 sceneImage:
 *                                   type: string
 *                                   format: uri
 *                                   nullable: true
 *                                   description: 场景图片URL
 *                                 order:
 *                                   type: integer
 *                                   description: 场景在剧幕中的顺序
 *                                 shots:
 *                                   type: array
 *                                   description: 场景下的镜头列表
 *                                   items:
 *                                     type: object
 *                                     properties:
 *                                       id:
 *                                         type: string
 *                                         format: uuid
 *                                         description: 镜头ID
 *                                       sceneId:
 *                                         type: string
 *                                         format: uuid
 *                                         nullable: true
 *                                         description: 关联的场景ID
 *                                       actId:
 *                                         type: string
 *                                         format: uuid
 *                                         description: 关联的剧幕ID
 *                                       shotId:
 *                                         type: string
 *                                         description: 镜头编号（格式：SHOT 001）
 *                                       duration:
 *                                         type: number
 *                                         nullable: true
 *                                         description: 镜头时长（秒）
 *                                       shotType:
 *                                         type: string
 *                                         nullable: true
 *                                         description: 镜头类型
 *                                       framing:
 *                                         type: string
 *                                         nullable: true
 *                                         description: 构图方式
 *                                       cameraAngle:
 *                                         type: string
 *                                         nullable: true
 *                                         description: 拍摄角度
 *                                       cameraMovement:
 *                                         type: string
 *                                         nullable: true
 *                                         description: 摄像机运动
 *                                       characterAction:
 *                                         type: string
 *                                         nullable: true
 *                                         description: 角色动作
 *                                       action:
 *                                         type: string
 *                                         nullable: true
 *                                         description: 动作描述
 *                                       expression:
 *                                         type: string
 *                                         nullable: true
 *                                         description: 表情
 *                                       dialogue:
 *                                         type: array
 *                                         description: 对话/台词列表
 *                                         items:
 *                                           type: object
 *                                           properties:
 *                                             characterId:
 *                                               type: string
 *                                               format: uuid
 *                                               nullable: true
 *                                             characterName:
 *                                               type: string
 *                                               nullable: true
 *                                             text:
 *                                               type: string
 *                                             emotion:
 *                                               type: string
 *                                               nullable: true
 *                                             audioUrl:
 *                                               type: string
 *                                               format: uri
 *                                               nullable: true
 *                                       voiceover:
 *                                         type: string
 *                                         nullable: true
 *                                         description: 旁白
 *                                       lighting:
 *                                         type: string
 *                                         nullable: true
 *                                         description: 灯光
 *                                       atmosphere:
 *                                         type: string
 *                                         nullable: true
 *                                         description: 氛围
 *                                       bgm:
 *                                         type: string
 *                                         nullable: true
 *                                         description: 背景音乐
 *                                       fx:
 *                                         type: string
 *                                         nullable: true
 *                                         description: 特效
 *                                       soundEffect:
 *                                         type: string
 *                                         nullable: true
 *                                         description: 音效
 *                                       isTransition:
 *                                         type: boolean
 *                                         description: 是否为转场镜头
 *                                       characterIds:
 *                                         type: array
 *                                         description: 角色ID列表
 *                                         items:
 *                                           type: string
 *                                           format: uuid
 *                                       characterList:
 *                                         type: array
 *                                         description: 角色列表（包含id、name、gender）
 *                                         items:
 *                                           type: object
 *                                           properties:
 *                                             id:
 *                                               type: string
 *                                               format: uuid
 *                                             name:
 *                                               type: string
 *                                             gender:
 *                                               type: string
 *                                               nullable: true
 *                                       metadata:
 *                                         type: object
 *                                         description: 元数据
 *                                         additionalProperties: true
 *                                       order:
 *                                         type: integer
 *                                         description: 镜头顺序
 *                                       videoUrl:
 *                                         type: string
 *                                         format: uri
 *                                         nullable: true
 *                                         description: 视频URL
 *                                       videoPath:
 *                                         type: string
 *                                         nullable: true
 *                                         description: 视频本地路径
 *                                       createdAt:
 *                                         type: string
 *                                         format: date-time
 *                                       updatedAt:
 *                                         type: string
 *                                         format: date-time
 *                           directShots:
 *                             type: array
 *                             description: 直接关联到剧幕的镜头列表（没有场景的镜头）
 *                             items:
 *                               type: object
 *                               description: 镜头对象（结构同scenes[].shots[]中的镜头对象）
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           updatedAt:
 *                             type: string
 *                             format: date-time
 *       404:
 *         description: 项目或小说不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/projects/:projectId/novels/:novelId/acts', mediaController.getNovelActsWithDetails);

/**
 * @swagger
 * /api/media/projects/{projectId}/novels/{novelId}/generate-shots:
 *   post:
 *     summary: 按剧幕或场景生成镜头视频
 *     description: 按剧幕或场景生成镜头视频，支持合并模式和场景批次处理。sceneIds 优先于 actIds（如果同时传入，使用 sceneIds）
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
 *               sceneIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 description: 场景ID数组，优先于 actIds（如果同时传入，使用 sceneIds）。当传入 sceneIds 时，每个 sceneId 的所有镜头作为一个批次
 *                 example: ["scene-uuid-1", "scene-uuid-2"]
 *               actIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 description: 剧幕ID数组，如果 sceneIds 为空则使用此参数。如果为空则生成所有剧幕下的镜头视频
 *                 example: ["act-uuid-1", "act-uuid-2"]
 *               concurrency:
 *                 type: integer
 *                 default: 3
 *                 description: 并发数（仅在 actIds 模式生效，sceneIds 模式按场景分组批次）
 *               apiConfig:
 *                 type: object
 *                 description: 自定义API参数
 *               allowOverwrite:
 *                 type: boolean
 *                 default: false
 *                 description: 是否允许覆盖已生成的视频
 *               keepBoth:
 *                 type: boolean
 *                 default: false
 *                 description: 是否保留旧版本（生成新版本但不删除旧版本）
 *               storageMode:
 *                 type: string
 *                 enum: [download_upload, buffer_upload]
 *                 default: download_upload
 *                 description: 存储方式，download_upload=下载到本地再上传到Catbox，buffer_upload=直接下载Buffer然后上传到Catbox
 *               featurePromptId:
 *                 type: string
 *                 format: uuid
 *                 required: true
 *                 description: 功能提示词ID（FeaturePrompt表的id），用于获取功能提示词，必填
 *                 example: feature-prompt-uuid
 *               mergeShots:
 *                 type: boolean
 *                 default: false
 *                 description: 是否合并模式（将多个镜头合并生成一个视频）
 *               maxDuration:
 *                 type: number
 *                 description: 合并模式最大时长（秒），mergeShots=true 时必填
 *                 example: 30
 *               toleranceSec:
 *                 type: number
 *                 default: 5
 *                 description: 合并模式时长容差（秒），实际时长范围是 maxDuration - toleranceSec 到 maxDuration + toleranceSec
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
 *                           type: object
 *                           properties:
 *                             taskId:
 *                               type: string
 *                               format: uuid
 *                               description: 任务ID
 *                             shotIds:
 *                               type: array
 *                               items:
 *                                 type: string
 *                                 format: uuid
 *                               description: 该任务关联的镜头ID数组
 *                             shotVideoName:
 *                               type: string
 *                               description: 视频名称（用于前端展示）
 *                         description: 该剧幕下的镜头生成任务列表
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                   description: 任务总数（组的数量）
 *                 tasks:
 *                   type: array
 *                   description: 任务列表
 *                   items:
 *                     type: object
 *                     properties:
 *                       taskId:
 *                         type: string
 *                         format: uuid
 *                         description: 任务ID
 *                       shotIds:
 *                         type: array
 *                         items:
 *                           type: string
 *                           format: uuid
 *                         description: 该任务关联的镜头ID数组
 *                       shotVideoName:
 *                         type: string
 *                         description: 视频名称（用于前端展示）
 *                       targetDuration:
 *                         type: number
 *                         description: 目标时长（秒）
 *                       merged:
 *                         type: boolean
 *                         description: 是否为合并模式（仅合并模式时存在）
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

