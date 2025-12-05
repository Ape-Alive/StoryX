const express = require('express');
const { body, query } = require('express-validator');
const sceneController = require('../controllers/sceneController');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validator');

const router = express.Router();

// 所有路由需要认证
router.use(authenticate);

/**
 * @swagger
 * /api/scenes:
 *   get:
 *     summary: 获取场景列表
 *     description: 根据项目ID、小说ID获取场景列表
 *     tags: [Scenes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 项目ID（可选）
 *       - in: query
 *         name: novelId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 小说ID（可选）
 *     responses:
 *       200:
 *         description: 成功返回场景列表
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
 *                         $ref: '#/components/schemas/Scene'
 */
router.get(
    '/',
    [
        query('projectId').optional().isUUID().withMessage('projectId must be a valid UUID'),
        query('novelId').optional().isUUID().withMessage('novelId must be a valid UUID'),
    ],
    validate,
    sceneController.getScenes
);

/**
 * @swagger
 * /api/scenes/generate-image:
 *   post:
 *     summary: 生成场景图（支持单个或批量）
 *     description: 生成场景图，调用文生图API模型。支持传入单个场景ID或场景ID数组进行批量生成。
 *     tags: [Scenes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sceneIds
 *               - projectId
 *             properties:
 *               sceneIds:
 *                 oneOf:
 *                   - type: string
 *                     format: uuid
 *                     description: 单个场景ID
 *                   - type: array
 *                     items:
 *                       type: string
 *                       format: uuid
 *                     description: 场景ID数组（批量生成）
 *                 example: ["scene-uuid-1", "scene-uuid-2"]
 *               projectId:
 *                 type: string
 *                 format: uuid
 *                 description: 项目ID
 *               modelId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *                 description: 使用的AI模型ID（可选，如果不提供则使用项目配置的模型）
 *               prompt:
 *                 type: string
 *                 nullable: true
 *                 description: 自定义提示词（可选，批量生成时应用于所有场景，如果不提供则根据每个场景描述自动生成）
 *               config:
 *                 type: object
 *                 description: 额外配置选项
 *                 properties:
 *                   width:
 *                     type: integer
 *                     default: 1024
 *                     description: 图片宽度
 *                   height:
 *                     type: integer
 *                     default: 1024
 *                     description: 图片高度
 *                   style:
 *                     type: string
 *                     default: "realistic"
 *                     description: 生成风格
 *     responses:
 *       201:
 *         description: 场景图生成任务已创建
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       oneOf:
 *                         - type: object
 *                           description: 单个场景生成结果
 *                           properties:
 *                             taskId:
 *                               type: string
 *                               format: uuid
 *                               description: 任务ID
 *                             sceneId:
 *                               type: string
 *                               format: uuid
 *                             status:
 *                               type: string
 *                         - type: object
 *                           description: 批量生成结果
 *                           properties:
 *                             totalCount:
 *                               type: integer
 *                               description: 总任务数
 *                             tasks:
 *                               type: array
 *                               items:
 *                                 type: object
 *                                 properties:
 *                                   taskId:
 *                                     type: string
 *                                     format: uuid
 *                                   sceneId:
 *                                     type: string
 *                                     format: uuid
 *                                   status:
 *                                     type: string
 *       400:
 *         description: 请求参数错误
 */
router.post(
    '/generate-image',
    [
        body('sceneIds').custom((value) => {
            if (!value) {
                throw new Error('sceneIds is required');
            }
            if (Array.isArray(value)) {
                if (value.length === 0) {
                    throw new Error('sceneIds array must not be empty');
                }
                // 验证数组中的每个元素都是UUID
                for (const id of value) {
                    if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
                        throw new Error('Each sceneId must be a valid UUID');
                    }
                }
            } else if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
                throw new Error('sceneIds must be a valid UUID or an array of UUIDs');
            }
            return true;
        }),
        body('projectId').isUUID().withMessage('projectId must be a valid UUID'),
        body('modelId').optional().isUUID().withMessage('modelId must be a valid UUID'),
    ],
    validate,
    sceneController.generateSceneImage
);

/**
 * @swagger
 * /api/scenes:
 *   post:
 *     summary: 新增场景
 *     description: 新增场景，并关联相关镜头（需要同步剧幕的变更）
 *     tags: [Scenes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - actId
 *               - address
 *             properties:
 *               actId:
 *                 type: string
 *                 format: uuid
 *                 description: 剧幕ID
 *               novelId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *                 description: 小说ID（可选，如果不提供则使用剧幕关联的小说ID）
 *               projectId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *                 description: 项目ID（可选，如果不提供则使用剧幕关联的项目ID）
 *               address:
 *                 type: string
 *                 description: 场景地址/地点
 *               sceneDescription:
 *                 type: string
 *                 nullable: true
 *                 description: 场景描述
 *               shotIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 关联的镜头ID列表
 *     responses:
 *       201:
 *         description: 场景创建成功
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Scene'
 */
router.post(
    '/',
    [
        body('actId').isUUID().withMessage('actId must be a valid UUID'),
        body('address').notEmpty().withMessage('address is required'),
        body('novelId').optional().isUUID().withMessage('novelId must be a valid UUID'),
        body('projectId').optional().isUUID().withMessage('projectId must be a valid UUID'),
        body('shotIds').optional().isArray().withMessage('shotIds must be an array'),
        body('shotIds.*').optional().isString().withMessage('Each shotId must be a string'),
    ],
    validate,
    sceneController.createScene
);

/**
 * @swagger
 * /api/scenes/{sceneId}:
 *   put:
 *     summary: 修改场景描述
 *     description: 修改场景描述和其他信息
 *     tags: [Scenes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sceneId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 场景ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               address:
 *                 type: string
 *                 description: 场景地址/地点
 *               sceneDescription:
 *                 type: string
 *                 nullable: true
 *                 description: 场景描述
 *               shotIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 关联的镜头ID列表
 *     responses:
 *       200:
 *         description: 场景更新成功
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Scene'
 */
router.put(
    '/:sceneId',
    [
        body('shotIds').optional().isArray().withMessage('shotIds must be an array'),
        body('shotIds.*').optional().isString().withMessage('Each shotId must be a string'),
    ],
    validate,
    sceneController.updateScene
);

/**
 * @swagger
 * /api/scenes/image-tasks/{taskId}:
 *   get:
 *     summary: 查询场景图生成进度
 *     description: 根据场景图的任务ID查询生成进度
 *     tags: [Scenes]
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
 *                         sceneId:
 *                           type: string
 *                           format: uuid
 *                         sceneAddress:
 *                           type: string
 *                         status:
 *                           type: string
 *                           enum: [pending, processing, completed, failed]
 *                         progress:
 *                           type: integer
 *                           description: 进度百分比（0-100）
 *                         imageUrl:
 *                           type: string
 *                           nullable: true
 *                         filePath:
 *                           type: string
 *                           nullable: true
 *                         errorMessage:
 *                           type: string
 *                           nullable: true
 *                         metadata:
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
 */
router.get('/image-tasks/:taskId', sceneController.getSceneImageTaskProgress);

module.exports = router;

