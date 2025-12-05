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
 *     tags: [Script]
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
 *     tags: [Script]
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
router.get('/novels/:novelId/acts', scriptController.getNovelActs);

module.exports = router;

