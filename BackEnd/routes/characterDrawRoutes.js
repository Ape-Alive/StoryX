const express = require('express');
const { body } = require('express-validator');
const characterDrawController = require('../controllers/characterDrawController');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validator');

const router = express.Router();

// 所有路由需要认证
router.use(authenticate);

// 调试：打印所有注册的路由
if (process.env.NODE_ENV !== 'production') {
    router.use((req, res, next) => {
        if (req.path.includes('draw')) {
            console.log(`[CharacterDrawRoutes] ${req.method} ${req.path}`);
        }
        next();
    });
}

/**
 * @swagger
 * /api/characters/draw:
 *   post:
 *     summary: 批量抽卡（每个角色创建一个任务）
 *     description: 批量生成角色的人物视频（2s）或图片，每个角色创建一个独立任务。根据drawType自动选择模型（image使用grsai的sora-image，video使用grsai的sora-2）。
 *     tags: [Character Draw]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - characterIds
 *               - projectId
 *             properties:
 *               characterIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 description: 角色ID数组（支持单个或多个）
 *                 example: ["character-uuid-1", "character-uuid-2"]
 *               projectId:
 *                 type: string
 *                 format: uuid
 *                 description: 项目ID
 *                 example: "project-uuid"
 *               drawType:
 *                 type: string
 *                 enum: [image, video]
 *                 default: image
 *                 description: 抽卡类型，image=图片，video=视频（2秒）
 *                 example: "image"
 *               apiConfig:
 *                 type: object
 *                 description: 自定义AI API请求参数对象，用于适配不同AI提供商的请求格式
 *                 example:
 *                   prompt: "自定义提示词"
 *                   width: 1024
 *                   height: 1024
 *                   duration: 2
 *               storageMode:
 *                 type: string
 *                 enum: [download_upload, buffer_upload]
 *                 default: download_upload
 *                 description: 存储方式，download_upload=下载到本地再上传到Catbox，buffer_upload=直接下载Buffer然后上传到Catbox
 *                 example: "download_upload"
 *               featurePromptId:
 *                 type: string
 *                 format: uuid
 *                 description: 功能提示词ID（FeaturePrompt表的id），用于获取功能提示词
 *                 example: "feature-prompt-uuid"
 *               genreStyle:
 *                 type: string
 *                 description: 题材风格（字符串类型），如"古风"、"现代"、"科幻"等
 *                 example: "古风"
 *     responses:
 *       201:
 *         description: 抽卡任务已创建
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
 *                         taskIds:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               taskId:
 *                                 type: string
 *                                 format: uuid
 *                                 description: 任务ID
 *                               characterId:
 *                                 type: string
 *                                 format: uuid
 *                                 description: 角色ID
 *                           description: 任务ID数组（每个角色一个任务，包含taskId和characterId）
 *       400:
 *         description: 请求参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
    '/draw',
    [
        body('characterIds').isArray({ min: 1 }).withMessage('characterIds must be a non-empty array'),
        body('characterIds.*').isUUID().withMessage('Each characterId must be a valid UUID'),
        body('projectId').isUUID().withMessage('projectId must be a valid UUID'),
        body('drawType').optional().isIn(['image', 'video']).withMessage('drawType must be image or video'),
        body('apiConfig').optional().isObject().withMessage('apiConfig must be an object'),
        body('storageMode').optional().isIn(['download_upload', 'buffer_upload']).withMessage('storageMode must be download_upload or buffer_upload'),
        body('featurePromptId').optional().isUUID().withMessage('featurePromptId must be a valid UUID'),
        body('genreStyle').optional().isString().withMessage('genreStyle must be a string'),
    ],
    validate,
    characterDrawController.startBatchDraw
);

/**
 * @swagger
 * /api/characters/draw/tasks/{taskId}:
 *   get:
 *     summary: 查询抽卡进度
 *     description: 根据任务ID查询生成人物视频或图片的进度
 *     tags: [Character Draw]
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
 *                         characterId:
 *                           type: string
 *                           format: uuid
 *                         characterName:
 *                           type: string
 *                         drawType:
 *                           type: string
 *                           enum: [image, video]
 *                         status:
 *                           type: string
 *                           enum: [pending, processing, completed, failed]
 *                         progress:
 *                           type: integer
 *                         result:
 *                           type: object
 *                           nullable: true
 *                           description: 生成结果（JSON对象，包含originalUrl、finalUrl、metadata等）
 *                         errorMessage:
 *                           type: string
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
 *       404:
 *         description: 任务不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/draw/tasks/:taskId', characterDrawController.getDrawTaskProgress);

/**
 * @swagger
 * /api/characters/{characterId}/draw-tasks:
 *   get:
 *     summary: 获取角色的所有抽卡任务
 *     description: 根据角色ID获取该角色的所有抽卡任务列表
 *     tags: [Character Draw]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: characterId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 角色ID
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [image, video]
 *         description: 任务类型过滤（可选）
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
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           drawType:
 *                             type: string
 *                             enum: [image, video]
 *                           status:
 *                             type: string
 *                             enum: [pending, processing, completed, failed]
 *                           progress:
 *                             type: integer
 *                           result:
 *                             type: object
 *                             nullable: true
 *                           errorMessage:
 *                             type: string
 *                             nullable: true
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           completedAt:
 *                             type: string
 *                             format: date-time
 *                             nullable: true
 *       404:
 *         description: 角色不存在
 */
router.get('/:characterId/draw-tasks', characterDrawController.getCharacterDrawTasks);

/**
 * 兼容性路由：将旧的 draw-results 路径重定向到新的 draw-tasks
 * @deprecated 请使用 /api/characters/:characterId/draw-tasks
 */
router.get('/:characterId/draw-results', characterDrawController.getCharacterDrawTasks);

module.exports = router;
