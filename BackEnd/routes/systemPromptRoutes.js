const express = require('express');
const { body } = require('express-validator');
const systemPromptController = require('../controllers/systemPromptController');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validator');

const router = express.Router();

// 所有路由需要认证
router.use(authenticate);

/**
 * @swagger
 * /api/system-prompts:
 *   post:
 *     summary: 创建系统提示词
 *     description: 创建新的系统提示词，用于配置AI功能
 *     tags: [SystemPrompts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - functionKey
 *               - prompt
 *             properties:
 *               name:
 *                 type: string
 *                 description: 提示词名称
 *               functionKey:
 *                 type: string
 *                 description: 功能标识（唯一，如：text_expansion, script_generation等）
 *               description:
 *                 type: string
 *                 description: 功能描述
 *               prompt:
 *                 type: string
 *                 description: 提示词内容
 *               category:
 *                 type: string
 *                 description: 分类（如：llm, video, image, tts等）
 *               isActive:
 *                 type: boolean
 *                 default: true
 *                 description: 是否启用
 *               metadata:
 *                 type: object
 *                 description: 额外配置信息（JSON对象）
 *     responses:
 *       201:
 *         description: 系统提示词创建成功
 *       400:
 *         description: 请求参数错误
 */
router.post(
    '/',
    [
        body('name')
            .notEmpty()
            .withMessage('name is required'),
        body('functionKey')
            .notEmpty()
            .withMessage('functionKey is required')
            .matches(/^[a-z_]+$/)
            .withMessage('functionKey must contain only lowercase letters and underscores'),
        body('prompt')
            .notEmpty()
            .withMessage('prompt is required'),
    ],
    validate,
    systemPromptController.createSystemPrompt
);

/**
 * @swagger
 * /api/system-prompts:
 *   get:
 *     summary: 获取所有系统提示词
 *     description: 获取所有系统提示词列表，支持按分类和状态筛选
 *     tags: [SystemPrompts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: 分类筛选（可选）
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: 是否启用筛选（可选）
 *     responses:
 *       200:
 *         description: 成功返回提示词列表
 */
router.get('/', systemPromptController.getAllSystemPrompts);

/**
 * @swagger
 * /api/system-prompts/feature-prompts:
 *   get:
 *     summary: 获取功能提示词列表（通过 functionKey）
 *     description: 通过 functionKey 查询功能提示词列表，不需要提供 systemPromptId
 *     tags: [SystemPrompts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: functionKey
 *         required: true
 *         schema:
 *           type: string
 *         description: 系统提示词的功能标识（如：shot_video_generation, character_image_generation, scene_image_generation, script_generation, text_expansion等），必填
 *         example: shot_video_generation
 *       - in: query
 *         name: functionType
 *         schema:
 *           type: string
 *         description: 按功能类型筛选
 *     responses:
 *       200:
 *         description: 成功
 *       400:
 *         description: 参数错误（缺少 functionKey）
 */
router.get('/feature-prompts', systemPromptController.getFeaturePromptsByFunctionKey);

/**
 * @swagger
 * /api/system-prompts/{id}:
 *   get:
 *     summary: 根据ID获取系统提示词
 *     tags: [SystemPrompts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: 成功返回提示词
 *       404:
 *         description: 提示词不存在
 */
router.get('/:id', systemPromptController.getSystemPromptById);

/**
 * @swagger
 * /api/system-prompts/{id}:
 *   put:
 *     summary: 更新系统提示词
 *     tags: [SystemPrompts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *             properties:
 *               name:
 *                 type: string
 *               functionKey:
 *                 type: string
 *               description:
 *                 type: string
 *               prompt:
 *                 type: string
 *               category:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *               metadata:
 *                 type: object
 *     responses:
 *       200:
 *         description: 更新成功
 *       404:
 *         description: 提示词不存在
 */
router.put(
    '/:id',
    [
        body('functionKey')
            .optional()
            .matches(/^[a-z_]+$/)
            .withMessage('functionKey must contain only lowercase letters and underscores'),
    ],
    validate,
    systemPromptController.updateSystemPrompt
);

/**
 * @swagger
 * /api/system-prompts/{id}:
 *   delete:
 *     summary: 删除系统提示词
 *     tags: [SystemPrompts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: 删除成功
 *       404:
 *         description: 提示词不存在
 */
router.delete('/:id', systemPromptController.deleteSystemPrompt);

/**
 * @swagger
 * /api/system-prompts/function/{functionKey}:
 *   get:
 *     summary: 根据功能标识获取系统提示词
 *     tags: [SystemPrompts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: functionKey
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 成功返回提示词
 *       404:
 *         description: 提示词不存在
 */
router.get('/function/:functionKey', systemPromptController.getSystemPromptByFunctionKey);

/**
 * @swagger
 * /api/system-prompts/category/{category}:
 *   get:
 *     summary: 根据分类获取系统提示词
 *     tags: [SystemPrompts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 成功返回提示词列表
 */
router.get('/category/:category', systemPromptController.getSystemPromptsByCategory);

/**
 * @swagger
 * /api/system-prompts/{systemPromptId}/feature-prompts:
 *   post:
 *     summary: 创建功能提示词
 *     tags: [SystemPrompts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: systemPromptId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 关联的系统提示词ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - functionType
 *               - prompt
 *             properties:
 *               name:
 *                 type: string
 *               functionType:
 *                 type: string
 *               referenceWorks:
 *                 type: string
 *                 description: 参考作品名称（可选）
 *               referenceLinks:
 *                 type: array
 *                 nullable: true
 *                 description: 参考链接数组（可选）
 *                 items:
 *                   type: string
 *                   format: uri
 *               prompt:
 *                 type: string
 *     responses:
 *       201:
 *         description: 创建成功
 */
router.post(
    '/:systemPromptId/feature-prompts',
    [
        body('name').notEmpty().withMessage('name is required'),
        body('functionType').notEmpty().withMessage('functionType is required'),
        body('prompt').notEmpty().withMessage('prompt is required'),
        body('referenceLinks')
            .optional({ nullable: true, checkFalsy: true })
            .isArray()
            .withMessage('referenceLinks must be array'),
        body('referenceLinks.*')
            .optional({ nullable: true, checkFalsy: true })
            .isURL()
            .withMessage('referenceLinks must contain valid URLs'),
    ],
    validate,
    systemPromptController.createFeaturePrompt
);

/**
 * @swagger
 * /api/system-prompts/{systemPromptId}/feature-prompts:
 *   get:
 *     summary: 获取功能提示词列表
 *     description: 支持通过 systemPromptId（路径参数，UUID格式）或 functionKey（查询参数）查询。当 systemPromptId 是有效的 UUID 时，优先使用 systemPromptId；如果 systemPromptId 不是有效的 UUID，则使用 functionKey 查询参数
 *     tags: [SystemPrompts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: systemPromptId
 *         required: true
 *         schema:
 *           type: string
 *         description: 系统提示词ID（UUID格式）。如果不是有效的 UUID，则必须提供 functionKey 查询参数
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *       - in: query
 *         name: functionKey
 *         schema:
 *           type: string
 *         description: 系统提示词的功能标识（如：shot_video_generation, character_image_generation, character_image_generation, scene_image_generation, script_generation, text_expansion等）。当 systemPromptId 不是有效的 UUID 时必填
 *         example: shot_video_generation
 *       - in: query
 *         name: functionType
 *         schema:
 *           type: string
 *         description: 按功能类型筛选
 *     responses:
 *       200:
 *         description: 成功
 *       400:
 *         description: 参数错误（systemPromptId 不是有效的 UUID 且缺少 functionKey）
 */
router.get('/:systemPromptId/feature-prompts', systemPromptController.getFeaturePrompts);

/**
 * @swagger
 * /api/system-prompts/feature-prompts/{id}:
 *   get:
 *     summary: 获取单个功能提示词
 *     tags: [SystemPrompts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/feature-prompts/:id', systemPromptController.getFeaturePromptById);

/**
 * @swagger
 * /api/system-prompts/feature-prompts/{id}:
 *   put:
 *     summary: 更新功能提示词
 *     tags: [SystemPrompts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *             properties:
 *               name:
 *                 type: string
 *                 description: 名称（可选）
 *               functionType:
 *                 type: string
 *                 description: 功能类型（可选）
 *               referenceWorks:
 *                 type: string
 *                 description: 参考作品名称（可选）
 *               referenceLinks:
 *                 type: array
 *                 nullable: true
 *                 description: 参考链接数组（可选）
 *                 items:
 *                   type: string
 *                   format: uri
 *               prompt:
 *                 type: string
 *                 description: 提示词内容（可选）
 *     responses:
 *       200:
 *         description: 更新成功
 */
router.put(
    '/feature-prompts/:id',
    [
        body('referenceLinks')
            .optional({ nullable: true, checkFalsy: true })
            .isArray()
            .withMessage('referenceLinks must be array'),
        body('referenceLinks.*')
            .optional({ nullable: true, checkFalsy: true })
            .isURL()
            .withMessage('referenceLinks must contain valid URLs'),
    ],
    validate,
    systemPromptController.updateFeaturePrompt
);

/**
 * @swagger
 * /api/system-prompts/feature-prompts/{id}:
 *   delete:
 *     summary: 删除功能提示词
 *     tags: [SystemPrompts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: 删除成功
 */
router.delete('/feature-prompts/:id', systemPromptController.deleteFeaturePrompt);

module.exports = router;

