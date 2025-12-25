const express = require('express');
const { body } = require('express-validator');
const scriptController = require('../controllers/scriptController');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validator');

const router = express.Router();

// 所有路由需要认证
router.use(authenticate);

/**
 * @swagger
 * /api/novels/{novelId}/script/generate:
 *   post:
 *     summary: 启动剧本生成
 *     description: 根据配置的并发策略，将选中的章节分组并启动剧本生成任务
 *     tags: [Scripts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: novelId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 小说ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - projectId
 *             properties:
 *               projectId:
 *                 type: string
 *                 format: uuid
 *                 description: 项目ID（必填）
 *               selectedChapterIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 description: 选中的章节ID列表（可选，如果不提供则使用所有章节或指定范围）
 *               taskType:
 *                 type: string
 *                 enum: [by_chapters, by_words]
 *                 default: by_chapters
 *                 description: 任务类型（按章节数或按字数）
 *               chaptersPerTask:
 *                 type: integer
 *                 default: 1
 *                 minimum: 1
 *                 description: 每N章定义一个并发任务（taskType为by_chapters时有效）
 *               wordsPerTask:
 *                 type: integer
 *                 default: 4000
 *                 minimum: 1
 *                 description: 每N字定义一个并发任务（taskType为by_words时有效）
 *               startChapter:
 *                 type: integer
 *                 description: 起始章节序号（可选，与endChapter一起使用指定范围）
 *               endChapter:
 *                 type: integer
 *                 description: 结束章节序号（可选，与startChapter一起使用指定范围）
 *               taskName:
 *                 type: string
 *                 description: 任务名称（可选，如果不提供则自动生成。自动生成规则：全本为"全本智能结构化"，单章为"第X章结构化"，多章为"第X-Y章结构化"）
 *               skipOverlapping:
 *                 type: boolean
 *                 default: false
 *                 description: 是否跳过重叠的任务组（默认false，允许重叠）
 *     responses:
 *       201:
 *         description: 剧本生成任务已启动
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         batchId:
 *                           type: string
 *                           format: uuid
 *                           description: 批次ID
 *                         jobId:
 *                           type: string
 *                           description: 任务ID，格式：JOB-xxxx
 *                         taskName:
 *                           type: string
 *                           description: 任务名称
 *                         tasks:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               taskId:
 *                                 type: string
 *                                 format: uuid
 *                               chapterRange:
 *                                 type: string
 *                               wordCount:
 *                                 type: integer
 *                               status:
 *                                 type: string
 *                         totalTasks:
 *                           type: integer
 *                         overlappingTasks:
 *                           type: array
 *                           description: 重叠的任务信息（如果有）
 *                           items:
 *                             type: object
 *                         skippedGroups:
 *                           type: integer
 *                           description: 跳过的任务组数量（如果有）
 *       400:
 *         description: 请求参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
    '/:novelId/script/generate',
    [
        body('projectId')
            .notEmpty()
            .withMessage('projectId is required'),
        body('taskType')
            .optional()
            .isIn(['by_chapters', 'by_words'])
            .withMessage('taskType must be "by_chapters" or "by_words"'),
        body('chaptersPerTask')
            .optional()
            .isInt({ min: 1 })
            .withMessage('chaptersPerTask must be a positive integer'),
        body('wordsPerTask')
            .optional()
            .isInt({ min: 1 })
            .withMessage('wordsPerTask must be a positive integer'),
    ],
    validate,
    scriptController.startScriptGeneration
);

/**
 * @swagger
 * /api/novels/{novelId}/script/tasks:
 *   get:
 *     summary: 获取小说的所有剧本生成任务
 *     description: 查询指定小说的所有剧本生成任务及其进度
 *     tags: [Scripts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: novelId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 小说ID
 *     responses:
 *       200:
 *         description: 成功返回任务列表
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
 *                           taskId:
 *                             type: string
 *                             format: uuid
 *                           chapterRange:
 *                             type: string
 *                           wordCount:
 *                             type: integer
 *                           status:
 *                             type: string
 *                             enum: [pending, processing, completed, failed]
 *                           progress:
 *                             type: integer
 *                             minimum: 0
 *                             maximum: 100
 *                           result:
 *                             type: object
 *                             nullable: true
 *                           errorMessage:
 *                             type: string
 *                             nullable: true
 *                           startedAt:
 *                             type: string
 *                             format: date-time
 *                             nullable: true
 *                           completedAt:
 *                             type: string
 *                             format: date-time
 *                             nullable: true
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *       404:
 *         description: 小说不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:novelId/script/tasks', scriptController.getNovelScriptTasks);

/**
 * @swagger
 * /api/script/tasks/{taskId}:
 *   get:
 *     summary: 获取单个任务详情
 *     description: 查询指定剧本生成任务的详细信息，包括结果
 *     tags: [Scripts]
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
 *         description: 成功返回任务详情
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         taskId:
 *                           type: string
 *                           format: uuid
 *                         novelId:
 *                           type: string
 *                           format: uuid
 *                         projectId:
 *                           type: string
 *                           format: uuid
 *                         taskType:
 *                           type: string
 *                         chapterIds:
 *                           type: array
 *                           items:
 *                             type: string
 *                         chapterRange:
 *                           type: string
 *                         wordCount:
 *                           type: integer
 *                         status:
 *                           type: string
 *                         progress:
 *                           type: integer
 *                         result:
 *                           type: object
 *                           nullable: true
 *                         errorMessage:
 *                           type: string
 *                           nullable: true
 *       404:
 *         description: 任务不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/tasks/:taskId', scriptController.getScriptTask);

/**
 * @swagger
 * /api/script/tasks/{taskId}/regenerate:
 *   post:
 *     summary: 重新生成剧本数据结构
 *     description: 根据任务ID、项目ID、小说ID重新生成剧本数据结构
 *     tags: [Scripts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *         description: 任务ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - projectId
 *               - novelId
 *             properties:
 *               projectId:
 *                 type: string
 *                 description: 项目ID
 *               novelId:
 *                 type: string
 *                 description: 小说ID
 *               overwrite:
 *                 type: boolean
 *                 default: true
 *                 description: 是否覆盖原任务的产物（包括关联的Act、Scene、Shot等），默认true。如果为false，则生成新的UUID和关联数据
 *     responses:
 *       201:
 *         description: 重新生成任务已启动
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     taskId:
 *                       type: string
 *                     novelId:
 *                       type: string
 *                     projectId:
 *                       type: string
 *                     taskType:
 *                       type: string
 *                     chapterRange:
 *                       type: string
 *                     wordCount:
 *                       type: integer
 *                     status:
 *                       type: string
 *                     progress:
 *                       type: integer
 *                     createdAt:
 *                       type: string
 *       400:
 *         description: 请求参数错误
 *       404:
 *         description: 任务不存在
 */
router.post('/tasks/:taskId/regenerate', scriptController.regenerateScript);

/**
 * @swagger
 * /api/novels/{novelId}/acts:
 *   get:
 *     summary: 获取小说的所有剧幕（按章节顺序排序）
 *     description: 获取指定小说的所有剧幕，按照章节顺序排序，确保即使异步处理也不会打乱顺序
 *     tags: [Scripts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: novelId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 小说ID
 *     responses:
 *       200:
 *         description: 成功返回剧幕列表（按章节顺序排序）
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Act'
 *       404:
 *         description: 小说不存在
 */
router.get('/:novelId/acts', scriptController.getNovelActs);

/**
 * @swagger
 * /api/novels/{novelId}/script/batches:
 *   get:
 *     summary: 获取小说的所有剧本生成批次
 *     description: 查询指定小说的所有剧本生成批次及其进度
 *     tags: [Scripts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: novelId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 小说ID
 *     responses:
 *       200:
 *         description: 成功返回批次列表
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
 *                           batchId:
 *                             type: string
 *                             format: uuid
 *                           jobId:
 *                             type: string
 *                             description: 任务ID，格式：JOB-xxxx
 *                           taskName:
 *                             type: string
 *                             description: 任务名称
 *                           status:
 *                             type: string
 *                             enum: [pending, processing, completed, failed]
 *                           progress:
 *                             type: integer
 *                             minimum: 0
 *                             maximum: 100
 *                           totalTasks:
 *                             type: integer
 *                           completedTasks:
 *                             type: integer
 *                           failedTasks:
 *                             type: integer
 *                           startedAt:
 *                             type: string
 *                             format: date-time
 *                             nullable: true
 *                           completedAt:
 *                             type: string
 *                             format: date-time
 *                             nullable: true
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *       404:
 *         description: 小说不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:novelId/script/batches', scriptController.getNovelScriptBatches);

/**
 * @swagger
 * /api/script/batches/{batchId}:
 *   get:
 *     summary: 获取单个批次详情
 *     description: 查询指定剧本生成批次的详细信息，包括所有子任务
 *     tags: [Scripts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: batchId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 批次ID
 *     responses:
 *       200:
 *         description: 成功返回批次详情
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         batchId:
 *                           type: string
 *                           format: uuid
 *                         jobId:
 *                           type: string
 *                           description: 任务ID，格式：JOB-xxxx
 *                         taskName:
 *                           type: string
 *                         novelId:
 *                           type: string
 *                           format: uuid
 *                         projectId:
 *                           type: string
 *                           format: uuid
 *                         status:
 *                           type: string
 *                         progress:
 *                           type: integer
 *                         totalTasks:
 *                           type: integer
 *                         completedTasks:
 *                           type: integer
 *                         failedTasks:
 *                           type: integer
 *                         config:
 *                           type: object
 *                           nullable: true
 *                         startedAt:
 *                           type: string
 *                           format: date-time
 *                           nullable: true
 *                         completedAt:
 *                           type: string
 *                           format: date-time
 *                           nullable: true
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
 *                         tasks:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               taskId:
 *                                 type: string
 *                                 format: uuid
 *                               chapterRange:
 *                                 type: string
 *                               wordCount:
 *                                 type: integer
 *                               status:
 *                                 type: string
 *                               progress:
 *                                 type: integer
 *                               errorMessage:
 *                                 type: string
 *                                 nullable: true
 *                               startedAt:
 *                                 type: string
 *                                 format: date-time
 *                                 nullable: true
 *                               completedAt:
 *                                 type: string
 *                                 format: date-time
 *                                 nullable: true
 *                               createdAt:
 *                                 type: string
 *                                 format: date-time
 *                               statistics:
 *                                 type: object
 *                                 nullable: true
 *                                 description: 统计信息（仅当status为completed时返回）
 *                                 properties:
 *                                   actsCount:
 *                                     type: integer
 *                                     description: 剧幕数量
 *                                   scenesCount:
 *                                     type: integer
 *                                     description: 场景数量
 *                                   shotsCount:
 *                                     type: integer
 *                                     description: 镜头数量
 *                                   dialogueCount:
 *                                     type: integer
 *                                     description: 对话数量（台词行数）
 *                                   chapterIds:
 *                                     type: array
 *                                     items:
 *                                       type: string
 *                                       format: uuid
 *                                     description: 章节ID列表
 *                                   scenes:
 *                                     type: array
 *                                     description: 场景列表（包含详细信息，用于展示场景卡片）
 *                                     items:
 *                                       type: object
 *                                       properties:
 *                                         sceneId:
 *                                           type: string
 *                                           format: uuid
 *                                         sceneNumber:
 *                                           type: string
 *                                           description: 场景编号，格式：SCENE 001
 *                                         title:
 *                                           type: string
 *                                           description: 场景标题（场景地址）
 *                                         description:
 *                                           type: string
 *                                           description: 场景描述（镜头描述）
 *                                         sceneImage:
 *                                           type: string
 *                                           format: uri
 *                                           nullable: true
 *                                           description: 场景图片URL
 *                                         duration:
 *                                           type: integer
 *                                           description: 总时长（秒）
 *                                         shotsCount:
 *                                           type: integer
 *                                           description: 镜头数量
 *                                         dialogueCount:
 *                                           type: integer
 *                                           description: 对话数量（台词行数）
 *       404:
 *         description: 批次不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/batches/:batchId', scriptController.getScriptBatch);

module.exports = router;

